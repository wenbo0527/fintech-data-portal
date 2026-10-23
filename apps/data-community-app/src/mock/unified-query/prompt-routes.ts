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
    knowledgeSources: ['table', 'field', 'business-caliber'],
    systemPromptTemplate:
      '你是 SQL 解释助手。请基于【业务口径】把 SQL 翻译成业务语言,引用表的业务定义与字段含义。涉及表与字段:\n{tables_json}',
    description: '解释 SQL 含义,主要靠业务口径(businessCaliber / usageGuide),不读标准码值'
  },
  optimize: {
    action: 'optimize',
    title: '优化 SQL',
    intentKeywords: ['优化', '改写', '性能', '建议'],
    knowledgeSources: ['table', 'field'],
    systemPromptTemplate:
      '你是 SQL 优化助手。基于【表的服务暴露】与【表所属分层】给出性能/工程化建议。涉及表:\n{tables_json}',
    description: '优化建议,只关心表的服务暴露和分层,不读码值'
  },
  audit: {
    action: 'audit',
    title: '合规检查',
    intentKeywords: ['合规', '检查', '标准'],
    // audit 需要读取表元数据(服务暴露/字段属性),故必须包含 table 源;
    // 字段与表一一对应,不带 table 会导致 fields 展开为空、审计形同虚设
    knowledgeSources: ['table', 'field', 'standard', 'domain', 'code'],
    systemPromptTemplate:
      '你是数据合规审计助手。基于【字段→数据标准映射】【码值】【域】给出合标/敏感/枚举三方面建议。\n涉及表与字段:\n{tables_json}\n码值:\n{codes_json}',
    description: '合规检查需要读表、字段、对应标准、对应码值——这是唯一允许读全量知识源的动作'
  }
}

/** 路由顺序(给 UI 兜底排序用) */
export const ROUTE_ORDER: CopilotAction[] = ['nl2sql', 'explain', 'optimize', 'audit']

/* ═════════════════════════════════════════════════════
 * 路由实现:routeAction()
 * ═════════════════════════════════════════════════════ */

/**
 * 按 prompt 的"强相关信号"裁剪候选表集合。
 *
 * 强信号只有两种:prompt 中直接出现英文表名,或出现中文表名。
 * 未命中任何强信号时返回全量表 —— 自然语言提问(如"近 7 天放款额汇总")
 * 本就无法定位到具体表,此时裁剪会误伤,故保留全量作为候选池。
 */
function cropTables(prompt: string, ctx: CopilotMetaContext): CopilotTableEntry[] {
  const raw = prompt || ''
  const hit = ctx.tables.filter(t => {
    // 英文表名按词边界匹配,避免 dwd_user 命中 dwd_user_detail
    const nameRe = new RegExp(`\\b${t.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
    if (nameRe.test(raw)) {return true}
    // 中文表名按子串匹配
    return !!t.cnName && raw.includes(t.cnName)
  })
  return hit.length ? hit : ctx.tables
}

/**
 * 给定动作 + 上下文,返回该动作需要的知识子集。
 *
 * 算法:
 *  1. 严格按路由表的 knowledgeSources 过滤,不读未授权源
 *  2. 表集合按 prompt 强相关信号裁剪(见 cropTables),字段随之收敛
 *  3. 触发 intentKeywords 与 prompt 的简易包含匹配,作为"是否命中"标记(供 UI 提示)
 *  4. 字段/标准/码值从 ctx 派生
 */
export function routeAction(
  action: CopilotAction,
  prompt: string,
  ctx: CopilotMetaContext
): ResolvedScope {
  const route = PROMPT_ROUTES[action]
  const sources = route.knowledgeSources
  const lower = (prompt || '').toLowerCase()

  // 表:先按 prompt 相关性裁剪,再决定是否整体开放
  const tables = sources.includes('table') ? cropTables(prompt, ctx) : []

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
      if (lower.includes(s.code.toLowerCase()) || lower.includes(s.cnName)) {standards.push(s.code)}
    })
  }

  // 码值:audit 全量;其它动作只带 scope 内表字段实际挂载的标准码值
  const codes: string[] = []
  if (sources.includes('code')) {
    if (action === 'audit') {
      ctx.codes.forEach(c => codes.push(c.code))
    } else {
      const used = new Set<string>()
      tables.forEach(t => t.fields.forEach(f => {
        if (f.standard?.codeSetNo) {used.add(f.standard.codeSetNo)}
      }))
      ctx.codes.forEach(c => {
        if (used.has(c.code)) {codes.push(c.code)}
      })
    }
  }

  // 业务词:全动作可用,但只在前 prompt 命中时携带
  // 注意:englishName / abbreviation 可能为空串(如语义契约术语只有中文名),
  // 必须先判空再 includes,否则 '' 恒被包含 → 造成「所有词都命中」的假阳性。
  const words: string[] = []
  if (sources.includes('word')) {
    ctx.words.forEach(w => {
      const haystacks = [w.chineseName, w.englishName, w.abbreviation]
        .map(s => (s || '').trim().toLowerCase())
        .filter(Boolean)
      const synonyms = (w.synonyms || '')
        .split(',')
        .map(s => s.trim().toLowerCase())
        .filter(Boolean)
      const hit = haystacks.some(h => lower.includes(h)) || synonyms.some(s => lower.includes(s))
      if (hit) {
        words.push([w.chineseName, w.englishName, w.abbreviation].filter(Boolean).join('/'))
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
 * 渲染动作的 system prompt:把路由裁剪出的知识子集填进模板。
 *
 * 说明:P0 阶段 mock 引擎本身不发起 LLM 请求,但同一份 scope 既是模板填充源,
 * 也是各动作实际计算时的裁剪依据 —— 保证"路由表"与"生成逻辑"共用一套事实源。
 *
 * @param action 动作
 * @param prompt 用户输入(SQL 类动作传 SQL 文本)
 * @param ctx 知识上下文
 * @param scope 可选:已解析的知识子集,传入可避免重复路由
 */
export function renderSystemPrompt(
  action: CopilotAction,
  prompt: string,
  ctx: CopilotMetaContext,
  scope?: ResolvedScope
): string {
  const route = PROMPT_ROUTES[action]
  const s = scope ?? routeAction(action, prompt, ctx)

  const tablesJson = s.tables.map(t => ({
    name: t.name,
    cnName: t.cnName,
    layer: t.layer,
    storage: t.storage,
    caliber: t.businessCaliber ? t.businessCaliber.slice(0, 80) : '',
    fields: t.fields.map(f => f.name)
  }))

  const codesJson = s.codes
    .map(code => ctx.codes.find(c => c.code === code))
    .filter(Boolean)
    .map(c => ({ code: c!.code, name: c!.name, items: c!.items.map(i => `${i.value}=${i.meaning}`) }))

  return route.systemPromptTemplate
    .replace('{tables_json}', JSON.stringify(tablesJson, null, 0))
    .replace('{codes_json}', JSON.stringify(codesJson, null, 0))
}

/**
 * UI 提示用:把当前路由决策渲染成一行简短文字,例如
 *   "动作:生成 SQL · 知识源:表/字段/词/码值 · 命中:客户/Customer/CUST"
 */
export function describeRoute(
  action: CopilotAction,
  prompt: string,
  ctx: CopilotMetaContext,
  scope?: ResolvedScope
): string {
  const route = PROMPT_ROUTES[action]
  const s = scope ?? routeAction(action, prompt, ctx)
  const src = route.knowledgeSources.map(s2 => {
    return ({ table: '表', field: '字段', standard: '标准', domain: '域', code: '码值', word: '业务词', 'business-caliber': '业务口径' } as const)[s2]
  }).join(' / ')
  const hit = s.words.length ? ` · 命中:${s.words.slice(0, 2).join(', ')}` : ''
  return `动作:${route.title} · 知识源:${src}${hit}`
}