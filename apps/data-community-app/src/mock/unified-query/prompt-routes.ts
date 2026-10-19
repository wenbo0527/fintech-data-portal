/**
 * Copilot 路由表(P2 优化 · 唯一可配置入口)
 *
 * 目的:把"动作 → 知识源 → 模板"集中维护,让 PM/数据治理同学可读、可改、可发版,
 *      不必动 TS 代码。后续接 LLM 时,这套配置就是 system prompt 拼装的事实源。
 *
 * 设计:
 *  - 每个动作(nl2sql / explain / audit / optimize)都描述:
 *      · 标题(role)
 *      · 触发关键词(intentKeywords)
 *      · 路由到的知识源(knowledgeSources)
 *      · 模板(首期先预留字段,后续接 LLM 时填 system prompt)
 *
 *  - 路由函数 `routeAction(action, prompt, ctx)` 返回:
 *      { knowledge: ResolvedScope; systemPromptTemplate: string; }
 *    copilot.ts 用 knowledge 子集做实际计算;模板供未来 LLM 调用使用。
 */
import type { CopilotMetaContext, CopilotTableEntry } from './metadata-context'
import type { CopilotAction } from './types'

/** 知识源标识(用于日志/UI 展示) */
export type KnowledgeSource =
  | 'table'
  | 'field'
  | 'standard'
  | 'domain'
  | 'code'
  | 'word'
  | 'business-caliber'

/** 路由结果:被动作挑拣过的知识子集 */
export interface ResolvedScope {
  /** 命中的表(全量或筛选) */
  tables: CopilotTableEntry[]
  /** 命中的字段名清单(从 tables 展开) */
  fields: string[]
  /** 命中的数据标准 code 清单 */
  standards: string[]
  /** 命中的码值 code 清单 */
  codes: string[]
  /** 命中的业务词说明 */
  words: string[]
  /** 实际触发的知识源(便于 UI 展示) */
  sources: KnowledgeSource[]
}

/** 路由条目定义 */
export interface PromptRoute {
  action: CopilotAction
  /** 中文标题 */
  title: string
  /** 触发关键词(用于日志与 UI 展示) */
  intentKeywords: string[]
  /** 该动作允许使用的知识源 */
  knowledgeSources: KnowledgeSource[]
  /** system prompt 模板(MVP 阶段留空,接 LLM 时填充) */
  systemPromptTemplate: string
  /** 描述 */
  description: string
}

/* ═════════════════════════════════════════════════════
 * 路由表(集中维护)
 * ═════════════════════════════════════════════════════ */

/** Prompt 路由表:动作 → 知识源 → 模板 */
export const PROMPT_ROUTES: Record<CopilotAction, PromptRoute> = {
  nl2sql: {
    action: 'nl2sql',
    title: '生成 SQL',
    intentKeywords: ['生成', '写', '查', '近 N 天', '汇总', 'TOP', '聚合'],
    knowledgeSources: ['table', 'field', 'word', 'code', 'business-caliber'],
    systemPromptTemplate:
      '你是 SQL 生成助手。请仅基于【已上线表清单】与【标准码值】产出可执行的 SQL,不要编造表/字段。表与字段:\n{tables_json}\n码值:\n{codes_json}',
    description: '自然语言 → SQL,只消费表/字段/词/码值/业务口径,不读标准细节(避免 prompt 臃肿)'
  },
  explain: {
    action: 'explain',
    title: '解释 SQL',
    intentKeywords: ['解释', '说明', '含义'],
    knowledgeSources: ['table', 'business-caliber'],
    systemPromptTemplate:
      '你是 SQL 解释助手。请基于【业务口径】把 SQL 翻译成业务语言,引用表的业务定义与字段含义。',
    description: '解释 SQL 含义,主要靠业务口径(businessCaliber / usageGuide),不读标准码值'
  },
  optimize: {
    action: 'optimize',
    title: '优化 SQL',
    intentKeywords: ['优化', '改写', '性能', '建议'],
    knowledgeSources: ['table'],
    systemPromptTemplate:
      '你是 SQL 优化助手。基于【表的服务暴露】与【表所属分层】给出性能/工程化建议。',
    description: '优化建议,只关心表的服务暴露和分层,不读码值'
  },
  audit: {
    action: 'audit',
    title: '合规检查',
    intentKeywords: ['合规', '检查', '标准'],
    knowledgeSources: ['field', 'standard', 'domain', 'code'],
    systemPromptTemplate:
      '你是数据合规审计助手。基于【字段→数据标准映射】【码值】【域】给出合标/敏感/枚举三方面建议。',
    description: '合规检查需要读字段、对应标准、对应码值——这是唯一允许读全量知识源的动作'
  }
}

/** 路由顺序(给 UI 兜底排序用) */
export const ROUTE_ORDER: CopilotAction[] = ['nl2sql', 'explain', 'optimize', 'audit']

/* ═════════════════════════════════════════════════════
 * 路由实现:routeAction()
 * ═════════════════════════════════════════════════════ */

/**
 * 给定动作 + 上下文,返回该动作需要的知识子集。
 *
 * 算法:
 *  1. 严格按路由表的 knowledgeSources 过滤,不读未授权源
 *  2. 触发 intentKeywords 与 prompt 的简易包含匹配,作为"是否命中"标记(供 UI 提示)
 *  3. 字段/标准/码值从 ctx 派生
 */
export function routeAction(
  action: CopilotAction,
  prompt: string,
  ctx: CopilotMetaContext
): ResolvedScope {
  const route = PROMPT_ROUTES[action]
  const sources = route.knowledgeSources
  const lower = (prompt || '').toLowerCase()

  const tables = sources.includes('table')
    ? ctx.tables
    : []

  // 字段:仅在需要 field 知识源时展开
  const fields: string[] = []
  if (sources.includes('field')) {
    tables.forEach(t => t.fields.forEach(f => fields.push(f.name)))
  } else if (sources.includes('table') && (action === 'nl2sql' || action === 'optimize')) {
    // nl2sql/optimize 也要带字段索引,以便提示文档与 audit
    tables.forEach(t => t.fields.slice(0, 8).forEach(f => fields.push(f.name)))
  }

  // 标准:action === audit 时全量;其它动作只在 prompt 显式提到标准编号时返回
  const standards: string[] = []
  if (sources.includes('standard') && action === 'audit') {
    ctx.standards.forEach(s => standards.push(s.code))
  } else if (sources.includes('standard') && lower) {
    ctx.standards.forEach(s => {
      if (lower.includes(s.code.toLowerCase()) || lower.includes(s.cnName)) standards.push(s.code)
    })
  }

  // 码值:仅 audit 返回
  const codes: string[] = []
  if (sources.includes('code') && action === 'audit') {
    ctx.codes.forEach(c => codes.push(c.code))
  }

  // 业务词:全动作可用,但只在前 prompt 命中时携带
  const words: string[] = []
  if (sources.includes('word')) {
    ctx.words.forEach(w => {
      if (
        lower.includes(w.chineseName) ||
        (w.synonyms && w.synonyms.split(',').some(s => lower.includes(s.trim()))) ||
        lower.includes(w.englishName.toLowerCase()) ||
        lower.includes(w.abbreviation.toLowerCase())
      ) {
        words.push(`${w.chineseName}/${w.englishName}/${w.abbreviation}`)
      }
    })
  }

  return {
    tables,
    fields,
    standards,
    codes,
    words,
    sources
  }
}

/**
 * 取动作的 system prompt 模板,填充上下文子集(目前 mock 引擎不走 prompt,
 * 这里只用于 UI 展示与未来 LLM 调用)
 */
export function renderSystemPrompt(
  action: CopilotAction,
  prompt: string,
  ctx: CopilotMetaContext
): string {
  const route = PROMPT_ROUTES[action]
  const scope = routeAction(action, prompt, ctx)
  return route.systemPromptTemplate
    .replace('{tables_json}', JSON.stringify(scope.tables.map(t => ({ name: t.name, cnName: t.cnName, fields: t.fields.map(f => f.name) })), null, 0))
    .replace('{codes_json}', JSON.stringify(scope.codes, null, 0))
}

/**
 * UI 提示用:把当前路由决策渲染成一行简短文字,例如
 *   "动作:生成 SQL · 知识源:表/字段/词/码值 · 命中:客户/Customer/CUST"
 */
export function describeRoute(action: CopilotAction, prompt: string, ctx: CopilotMetaContext): string {
  const route = PROMPT_ROUTES[action]
  const scope = routeAction(action, prompt, ctx)
  const src = route.knowledgeSources.map(s => {
    return ({ table: '表', field: '字段', standard: '标准', domain: '域', code: '码值', word: '业务词', 'business-caliber': '业务口径' } as const)[s]
  }).join(' / ')
  const hit = scope.words.length ? ` · 命中:${scope.words.slice(0, 2).join(', ')}` : ''
  return `动作:${route.title} · 知识源:${src}${hit}`
}