/**
 * Copilot 元数据聚合层(P1)
 *
 * 把"数据发现(已上线表)"与"数据标准(Standard/Domain/StdCode/Word)"聚合成一份只读上下文,
 * 供右侧 CopilotPanel 与 Monaco 字段补全共用。
 *
 * 设计要点:
 *  - 严格读取 `TableCatalogStore.discoverable()`,不暴露未上线表
 *  - 字段级 `standard` / `enumValues` 通过 `FieldLinkStore.byField()` 关联
 *  - 全量一次性构建,内存中保存 ref(响应式);CopilotPanel 只需读不需要触发更新
 */
import { TableCatalogStore, type LogicalTable } from '@/mock/shared/table-catalog-store'
import { StandardStore, DomainStore, StdCodeStore, WordStore } from '@/mock/shared/standard-store'
import { FieldLinkStore } from '@/mock/shared/lineage'
import type { DataSourceKey } from './types'

/** Copilot 可消费的表条目 */
export interface CopilotTableEntry {
  name: string
  cnName: string
  layer: string
  storage: string
  domain: string
  owner: string
  description: string
  businessCaliber?: string
  devCaliber?: string
  usageGuide?: string
  fields: CopilotFieldEntry[]
  upstream: string[]
  downstream: string[]
  services: Array<{ kind: string; name: string; endpoint: string }>
}

/** Copilot 可消费的字段条目(含数据标准与码值) */
export interface CopilotFieldEntry {
  name: string
  cnName?: string
  type: string
  description: string
  sensitivity: string
  isPrimaryKey?: boolean
  /** 命中的数据标准(可选) */
  standard?: {
    code: string
    cnName: string
    enAbbr: string
    domain: string
    dataType: string
    valueRange: string
    stdCodeNo?: string
  }
  /** 代码型字段挂载的枚举码值(可选) */
  enumValues?: Array<{ value: string; meaning: string }>
}

/** 聚合上下文 */
export interface CopilotMetaContext {
  /** 当前数据源过滤后的已上线表 */
  tables: CopilotTableEntry[]
  /** 当前选中的表(左侧 dbTree 点选后) */
  selectedTableName: string | null
  /** 数据标准家族 */
  standards: Array<{
    code: string
    standardNo: string
    cnName: string
    enAbbr: string
    domain: string
    dataType: string
    valueRange: string
    stdCodeNo?: string
  }>
  domains: Array<{ code: string; businessDataType: string; logicalDataType: string; length: number; precision: number }>
  codes: Array<{ code: string; name: string; items: Array<{ value: string; meaning: string }> }>
  words: Array<{ chineseName: string; englishName: string; abbreviation: string; synonyms: string }>
  /** 上下文摘要(用于顶部展示) */
  summary: {
    tableCount: number
    fieldCount: number
    standardCount: number
    codeCount: number
    wordCount: number
  }
}

/** 表名列表(纯字符串数组,供 Monaco 字段补全复用) */
export function collectTableNames(ctx: CopilotMetaContext): string[] {
  return ctx.tables.map(t => t.name)
}

/** 取表字段(含合标/码值) */
export function getTableFields(ctx: CopilotMetaContext, tableName: string): CopilotFieldEntry[] {
  return ctx.tables.find(t => t.name === tableName)?.fields ?? []
}

/* ═════════════════════════════════════════════════════
 * 路由层便捷方法(转发到 prompt-routes.ts)
 * ═════════════════════════════════════════════════════ */
import { routeAction } from './prompt-routes'
import type { CopilotAction } from './types'
import type { ResolvedScope } from './prompt-routes'

export { routeAction, renderSystemPrompt, describeRoute, PROMPT_ROUTES, ROUTE_ORDER } from './prompt-routes'
export type { ResolvedScope, PromptRoute, KnowledgeSource } from './prompt-routes'

/** 给定动作返回知识子集,语义同 routeAction,提供给 UI 组件直接调用 */
export function resolveForAction(
  action: CopilotAction,
  prompt: string,
  ctx: CopilotMetaContext
): ResolvedScope {
  return routeAction(action, prompt, ctx)
}

/* ═════════════════════════════════════════════════════
 * 跨子应用语义契约:软接入(失败时静默回退)
 * ═════════════════════════════════════════════════════ */
/**
 * 软接入 `@data-community/semantic-contract` 的术语字典。
 * 若 vite alias / 依赖未配置,返回空数组 —— 调用方安全合并即可。
 * 打通方法:在 apps/data-community-app/vite.config.ts 的 alias 数组里追加:
 *   { find: '@data-community/semantic-contract/data/knowledge',
 *     replacement: path.resolve(ROOT, 'packages/semantic-contract/src/data/knowledge.ts') }
 * 并补 package.json 的 dependencies。
 */
export async function loadSemanticContractTerms(): Promise<Array<{ chineseName: string; englishName: string; abbreviation: string; synonyms: string }>> {
  try {
    // 动态 import 失败会被外层 catch 兜底;vite alias 未配置时返回 undefined
    const mod = await import(/* @vite-ignore */ '@data-community/semantic-contract/data/knowledge')
    const terms = (mod?.mockTerms ?? []) as Array<{ termName?: string; termNameEn?: string; abbreviation?: string; synonyms?: string }>
    return terms.map(t => ({
      chineseName: t.termName ?? '',
      englishName: t.termNameEn ?? '',
      abbreviation: t.abbreviation ?? '',
      synonyms: t.synonyms ?? ''
    }))
  } catch {
    return []
  }
}

/** 把语义契约的术语合并到 Copilot 上下文中(同名不覆盖 data-standard 已有) */
export function mergeWordsFromContract(
  base: CopilotMetaContext,
  contractTerms: Awaited<ReturnType<typeof loadSemanticContractTerms>>
): CopilotMetaContext {
  if (!contractTerms.length) return base
  const seen = new Set(base.words.map(w => w.chineseName + '|' + w.englishName))
  const merged = [...base.words]
  contractTerms.forEach(t => {
    if (!t.chineseName) return
    const k = t.chineseName + '|' + t.englishName
    if (seen.has(k)) return
    seen.add(k)
    merged.push({
      chineseName: t.chineseName,
      englishName: t.englishName,
      abbreviation: t.abbreviation,
      synonyms: t.synonyms
    })
  })
  return {
    ...base,
    words: merged,
    summary: { ...base.summary, wordCount: merged.length }
  }
}

/** 构建上下文(已过滤为 online) */
export function buildMetadataContext(datasource?: DataSourceKey): CopilotMetaContext {
  const standards = StandardStore.getStandards()
  const domains = DomainStore.getDomains()
  const codes = StdCodeStore.getCodes()
  const words = WordStore.getWords()

  const onlineTables = TableCatalogStore.discoverable()

  const tables: CopilotTableEntry[] = onlineTables.map((t: LogicalTable) => ({
    name: t.name,
    cnName: t.cnName,
    layer: t.layer,
    storage: t.storage,
    domain: t.domain,
    owner: t.owner,
    description: t.description || t.businessCaliber || '',
    businessCaliber: t.businessCaliber,
    devCaliber: t.devCaliber,
    usageGuide: t.usageGuide,
    upstream: t.upstream,
    downstream: t.downstream,
    services: t.services.map(s => ({ kind: s.kind, name: s.name, endpoint: s.endpoint })),
    fields: t.fields.map(f => {
      const entry: CopilotFieldEntry = {
        name: f.name,
        cnName: f.cnName,
        type: f.type,
        description: f.description,
        sensitivity: f.sensitivity,
        isPrimaryKey: f.isPrimaryKey
      }
      // 关联数据标准
      const link = FieldLinkStore.byField(t.name, f.name)
      if (link?.standardCode) {
        const std = standards.find(s => s.code === link.standardCode)
        if (std) {
          entry.standard = {
            code: std.code,
            cnName: std.cnName || std.name,
            enAbbr: std.enAbbr || '',
            domain: std.domain || '',
            dataType: std.dataType,
            valueRange: std.valueRange,
            stdCodeNo: std.stdCodeNo
          }
          // 代码型字段:挂码值清单
          if (std.stdCodeNo && std.stdCodeNo !== '-') {
            const code = codes.find(c => c.code === std.stdCodeNo)
            if (code) entry.enumValues = code.items.map(i => ({ value: i.value, meaning: i.meaning }))
          }
        }
      }
      return entry
    })
  }))

  // 数据源过滤:Hive/Doris 都展示,storage 字段保留供 UI 区分
  const filtered = datasource ? tables.filter(t => String(t.storage).toLowerCase() === datasource) : tables

  return {
    tables: filtered,
    selectedTableName: null,
    standards: standards.map(s => ({
      code: s.code,
      standardNo: s.standardNo || s.code,
      cnName: s.cnName || s.name,
      enAbbr: s.enAbbr || '',
      domain: s.domain || '',
      dataType: s.dataType,
      valueRange: s.valueRange,
      stdCodeNo: s.stdCodeNo
    })),
    domains: domains.map(d => ({
      code: d.code,
      businessDataType: d.businessDataType,
      logicalDataType: d.logicalDataType,
      length: d.length,
      precision: d.precision
    })),
    codes: codes.map(c => ({ code: c.code, name: c.name, items: c.items.map(i => ({ value: i.value, meaning: i.meaning })) })),
    words: words.map(w => ({
      chineseName: w.chineseName,
      englishName: w.englishName,
      abbreviation: w.abbreviation,
      synonyms: w.synonyms
    })),
    summary: {
      tableCount: filtered.length,
      fieldCount: filtered.reduce((acc, t) => acc + t.fields.length, 0),
      standardCount: standards.length,
      codeCount: codes.length,
      wordCount: words.length
    }
  }
}