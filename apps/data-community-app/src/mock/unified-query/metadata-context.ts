/**
 * Copilot 元数据聚合层(P1)
 *
 * 把"数据发现(已上线表)"与"数据标准(Standard/Domain/StdCode/Word)"聚合成一份只读上下文,
 * 供右侧 CopilotPanel 与 Monaco 字段补全共用。
 *
 * 设计要点:
 *  - 严格读取 `TableCatalogStore.discoverable()`,不暴露未上线表
 *  - 字段级 `standard` / `enumValues` 通过 `resolveFieldStandard()` 两级解析
 *    (血缘打标优先,字段名规则兜底),详见下方说明
 *  - 全量一次性构建,内存中保存 ref(响应式);CopilotPanel 只需读不需要触发更新
 */
import { TableCatalogStore, type LogicalTable, type Sensitivity } from '@/mock/shared/table-catalog-store'
import { StandardStore, DomainStore, StdCodeStore, WordStore } from '@/mock/shared/standard-store'
import { FieldLinkStore } from '@/mock/shared/lineage'
import { DATABASE_TREE, getTableColumns } from './database'
import type { DataSourceKey, DbTreeNode } from './types'

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
  /**
   * 表来源:
   *  - `catalog`:数据资产目录(table-catalog-store),带标准挂接/服务暴露等治理元数据
   *  - `editor` :编辑器数据源树(database.ts),是查询引擎真正能执行的表
   */
  origin: 'catalog' | 'editor'
}

/* ═════════════════════════════════════════════════════
 * 字段 → 数据标准 的关联解析
 *
 * 背景(mock 数据现状):
 *  - `FieldLinkStore`(血缘模块)用的标准编号格式是 `STD_001`,
 *    而 `StandardStore` 的编号是 `STD-001`,两者直接比较永远不命中,
 *    导致 Copilot 侧所有字段都拿不到 standard / enumValues。
 *  - 因此这里做两级解析:① 先按 FieldLink 关联并归一化编号;
 *    ② 未命中时按字段名规则回退(规则表是 Copilot 侧的 mock 事实源)。
 * ═════════════════════════════════════════════════════ */

/** 归一化标准编号:STD_001 → STD-001 */
function normalizeStandardCode(code: string): string {
  return code.replace(/_/g, '-').toUpperCase()
}

/**
 * 字段名 → 标准编号 的回退规则(按顺序匹配,先命中先算)。
 * 仅覆盖已上线表目录中真实存在的字段名,避免过度联想。
 */
const FIELD_STANDARD_RULES: Array<{ test: RegExp; code: string }> = [
  { test: /^(id_type|doc_type|cred_type)$/, code: 'STD-002' },
  { test: /^(gender|sex)$/, code: 'STD-003' },
  { test: /^(currency|curr_code|ccy)$/, code: 'STD-004' },
  { test: /^(deposit_balance|balance|total_dep_amt)$/, code: 'STD-005' },
  { test: /(amount|_amt|amt_)$/, code: 'STD-006' },
  { test: /^(risk_level|risk_tier|loan_risk_grade)$/, code: 'STD-007' },
  { test: /^(open_date|open_dt|account_open_date)$/, code: 'STD-008' },
  { test: /^(cust_status|customer_status|user_status)$/, code: 'STD-009' },
  { test: /^(zip_code|postcode|post_code)$/, code: 'STD-010' },
  { test: /^(user_id|cust_no|cust_id|customer_id)$/, code: 'STD-001' }
]

/**
 * 解析某个字段挂接的数据标准。
 *
 * @param tableName 表名
 * @param fieldName 字段名
 * @param standards 标准清单(StandardStore 口径)
 * @returns 命中的标准;未挂接时返回 undefined
 */
function resolveFieldStandard(
  tableName: string,
  fieldName: string,
  standards: ReturnType<typeof StandardStore.getStandards>
) {
  // ① 血缘模块的字段打标(需归一化编号格式)
  const link = FieldLinkStore.byField(tableName, fieldName)
  if (link?.standardCode) {
    const target = normalizeStandardCode(link.standardCode)
    const hit = standards.find(s => normalizeStandardCode(s.code) === target)
    if (hit) {return hit}
  }
  // ② 字段名规则回退
  for (const rule of FIELD_STANDARD_RULES) {
    if (rule.test.test(fieldName)) {
      const hit = standards.find(s => s.code === rule.code)
      if (hit) {return hit}
    }
  }
  return undefined
}

/* ═════════════════════════════════════════════════════
 * 编辑器数据源树(database.ts)→ Copilot 表条目
 *
 * 背景(mock 数据现状):
 *  - 数据资产目录(`table-catalog-store`)与查询引擎的数据源树(`database.ts`)
 *    是两套独立的 mock 表体系,表名几乎不重叠。
 *  - 只把目录表喂给 Copilot 会导致:生成的 SQL 落在引擎执行不了的表上、
 *    解释时提示「不在可见范围」、合规检查恒为 0 条。
 *  - 因此这里把数据源树的表也并入知识底座(标记 `origin: 'editor'`),
 *    并按字段名规则补齐敏感度与标准挂接,使四类动作都能落到真实表上。
 * ═════════════════════════════════════════════════════ */

/** 敏感度推断规则(编辑器表没有 sensitivity 字段,按字段名语义推断) */
const EDITOR_SENSITIVITY_RULES: Array<{ test: RegExp; level: Sensitivity }> = [
  { test: /^(id_card|id_no|bank_card|card_no)$/, level: 'restricted' },
  { test: /^(mobile|phone|cust_name|real_name|manager_name|email)$/, level: 'sensitive' }
]

/**
 * 按字段名推断敏感度,未命中规则时按 internal 处理。
 *
 * @param fieldName 字段名
 */
function inferSensitivity(fieldName: string): Sensitivity {
  for (const rule of EDITOR_SENSITIVITY_RULES) {
    if (rule.test.test(fieldName)) {return rule.level}
  }
  return 'internal'
}

/** 按表名前缀推断所属分层 */
function inferLayer(tableName: string): string {
  if (tableName.startsWith('dwd_')) {return 'DWD'}
  if (tableName.startsWith('dws_')) {return 'DWS'}
  if (tableName.startsWith('ads_')) {return 'ADS'}
  if (tableName.startsWith('dim_')) {return 'DIM'}
  return 'ODS'
}

/**
 * 遍历数据库导航树,收集全部可执行的表。
 *
 * @param nodes 导航树节点
 * @param datasource 当前数据源(由 datasource 节点带入)
 */
function collectEditorTables(
  nodes: DbTreeNode[] = DATABASE_TREE,
  datasource: DataSourceKey = 'doris'
): Array<{ tableName: string; comment: string; datasource: DataSourceKey }> {
  const out: Array<{ tableName: string; comment: string; datasource: DataSourceKey }> = []
  nodes.forEach(n => {
    if (n.kind === 'datasource') {
      out.push(...collectEditorTables(n.children ?? [], n.key as DataSourceKey))
      return
    }
    if (n.kind === 'table' && n.tableName) {
      out.push({ tableName: n.tableName, comment: n.comment ?? '', datasource })
      return
    }
    out.push(...collectEditorTables(n.children ?? [], datasource))
  })
  return out
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
    enName: string
    domain: string
    dataType: string
    valueRange: string
    codeSetNo?: string
  }
  /** 代码型字段挂载的枚举码值(可选) */
  enumValues?: Array<{ value: string; meaning: string }>
}

/** 聚合上下文 */
export interface CopilotMetaContext {
  /** 知识底座的表(目录已上线表 + 编辑器可执行表) */
  tables: CopilotTableEntry[]
  /** 当前选中的表(左侧 dbTree 点选后) */
  selectedTableName: string | null
  /** 数据标准家族 */
  standards: Array<{
    code: string
    standardNo: string
    cnName: string
    enName: string
    domain: string
    dataType: string
    valueRange: string
    codeSetNo?: string
  }>
  domains: Array<{ code: string; name: string; coverage: string; ownerDept: string }>
  codes: Array<{ code: string; name: string; items: Array<{ value: string; meaning: string }> }>
  words: Array<{ chineseName: string; englishName: string; abbreviation: string; synonyms: string }>
  /** 上下文摘要(用于顶部展示) */
  summary: {
    /** 知识底座表总数 */
    tableCount: number
    /** 其中数据资产目录的已上线表数 */
    catalogTableCount: number
    /** 其中编辑器数据源树的可执行表数 */
    editorTableCount: number
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
  if (!contractTerms.length) {return base}
  const seen = new Set(base.words.map(w => w.chineseName + '|' + w.englishName))
  const merged = [...base.words]
  contractTerms.forEach(t => {
    if (!t.chineseName) {return}
    const k = t.chineseName + '|' + t.englishName
    if (seen.has(k)) {return}
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

/**
 * 把字段挂接的数据标准与码值清单写入字段条目。
 *
 * @param entry 待写入的字段条目
 * @param tableName 表名
 * @param fieldName 字段名
 * @param standards 标准清单
 * @param codes 码值清单
 */
function attachStandard(
  entry: CopilotFieldEntry,
  tableName: string,
  fieldName: string,
  standards: ReturnType<typeof StandardStore.getStandards>,
  codes: ReturnType<typeof StdCodeStore.getCodes>
) {
  const std = resolveFieldStandard(tableName, fieldName, standards)
  if (!std) {return}
  entry.standard = {
    code: std.code,
    cnName: std.cnName || std.name,
    enName: std.enName || '',
    domain: std.domain || '',
    dataType: std.dataType,
    valueRange: std.valueRange,
    codeSetNo: std.codeSetNo
  }
  // 代码型字段:挂码值清单
  if (std.codeSetNo && std.codeSetNo !== '-') {
    const code = codes.find(c => c.code === std.codeSetNo)
    if (code) {entry.enumValues = code.items.map(i => ({ value: i.value, meaning: i.name }))}
  }
}

/**
 * 构建 Copilot 知识上下文。
 *
 * 知识底座 = 数据资产目录已上线表 + 编辑器数据源树可执行表:
 *  - 目录表提供业务口径/服务暴露/标准挂接等治理元数据
 *  - 数据源树表是查询引擎真正能执行的表,否则 Copilot 生成的 SQL 落不到实处
 *
 * @param datasource 可选:按数据源过滤(仅对目录表生效,数据源树表恒可见)
 */
export function buildMetadataContext(datasource?: DataSourceKey): CopilotMetaContext {
  const standards = StandardStore.getStandards()
  const domains = DomainStore.getDomains()
  const codes = StdCodeStore.getCodes()
  const words = WordStore.getWords()

  const onlineTables = TableCatalogStore.discoverable()

  const catalogTables: CopilotTableEntry[] = onlineTables.map((t: LogicalTable) => ({
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
    origin: 'catalog',
    fields: t.fields.map(f => {
      const entry: CopilotFieldEntry = {
        name: f.name,
        cnName: f.cnName,
        type: f.type,
        description: f.description,
        sensitivity: f.sensitivity,
        isPrimaryKey: f.isPrimaryKey
      }
      // 关联数据标准(含码值清单)
      attachStandard(entry, t.name, f.name, standards, codes)
      return entry
    })
  }))

  // 编辑器数据源树的可执行表(与目录表重名时以目录表为准,目录表元数据更全)
  const catalogNames = new Set(catalogTables.map(t => t.name))
  const editorTables: CopilotTableEntry[] = collectEditorTables()
    .filter(e => !catalogNames.has(e.tableName))
    .map(e => ({
      name: e.tableName,
      cnName: e.comment || e.tableName,
      layer: inferLayer(e.tableName),
      storage: e.datasource === 'hive' ? 'Hive' : 'Doris',
      domain: '',
      owner: '',
      description: e.comment || e.tableName,
      upstream: [],
      downstream: [],
      services: [],
      origin: 'editor',
      fields: getTableColumns(e.tableName).map(c => {
        const entry: CopilotFieldEntry = {
          name: c.name,
          cnName: c.comment,
          type: c.type,
          description: c.comment,
          sensitivity: inferSensitivity(c.name)
        }
        attachStandard(entry, e.tableName, c.name, standards, codes)
        return entry
      })
    }))

  // 数据源过滤:Hive/Doris 都展示,storage 字段保留供 UI 区分
  const filteredCatalog = datasource
    ? catalogTables.filter(t => String(t.storage).toLowerCase() === datasource)
    : catalogTables
  const tables = [...filteredCatalog, ...editorTables]

  return {
    tables,
    selectedTableName: null,
    standards: standards.map(s => ({
      code: s.code,
      standardNo: s.standardNo || s.code,
      cnName: s.cnName || s.name,
      enName: s.enName || '',
      domain: s.domain || '',
      dataType: s.dataType,
      valueRange: s.valueRange,
      codeSetNo: s.codeSetNo
    })),
    domains: domains.map(d => ({
      code: d.code,
      name: d.name,
      coverage: d.coverage,
      ownerDept: d.ownerDept
    })),
    codes: codes.map(c => ({ code: c.code, name: c.name, items: c.items.map(i => ({ value: i.value, meaning: i.name })) })),
    words: words.map(w => ({
      chineseName: w.chineseName,
      englishName: w.englishName,
      abbreviation: w.abbreviation,
      synonyms: w.synonyms
    })),
    summary: {
      tableCount: tables.length,
      catalogTableCount: filteredCatalog.length,
      editorTableCount: editorTables.length,
      fieldCount: tables.reduce((acc, t) => acc + t.fields.length, 0),
      standardCount: standards.length,
      codeCount: codes.length,
      wordCount: words.length
    }
  }
}