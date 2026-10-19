/**
 * Copilot mock 引擎(P1)
 *
 * 四个动作,均返回 Promise(用 setTimeout 模拟 600~900ms 延迟,贴近真实 LLM 体验):
 *   - nl2sql(prompt, ctx)    自然语言 → 候选 SQL
 *   - explainSql(sql, ctx)   解释 SQL 含义
 *   - optimizeSql(sql, ctx)  给出优化建议 / 重写
 *   - auditSql(sql, ctx)     合规校验(返回 Issue 列表)
 *
 * 算法定位:基于词典 + 模板的本地实现,符合「项目仅用于前端展示,无后端」约束。
 * 真实接入 LLM 时,把四个函数替换为异步 HTTP/MCP 调用即可。
 */
import type { CopilotFieldEntry, CopilotMetaContext } from './metadata-context'
import { resolveForAction } from './metadata-context'
import type {
  CopilotAction,
  CopilotIssue,
  CopilotMessage,
  IssueLevel,
  Nl2sqlCandidate
} from './types'

/* ── 工具:从一个 SQL 里识别表名与字段名(对 `database.ts` 已注册的表) ── */
const KNOWN_TABLES_FROM_DB = new Set<string>([
  'dwd_loan_daily',
  'dwd_repay_daily',
  'ads_user_summary'
])

/** 取 SQL 中出现的表名,候选集为 scope.tables(路由后的子集)+ database.ts 已注册 */
function extractTables(sql: string, ctx: CopilotMetaContext, scopeTables?: string[]): string[] {
  const allNames = new Set<string>([
    ...(scopeTables ?? ctx.tables.map(t => t.name)),
    ...KNOWN_TABLES_FROM_DB
  ])
  const out = new Set<string>()
  const re = /\b(?:from|join)\s+([`"']?)(\w+)\1/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(sql)) !== null) {
    const tbl = m[2]
    if (allNames.has(tbl)) out.add(tbl)
  }
  return [...out]
}

/** 取 SQL 中出现的字段名,候选集为 ctx.tables 中所有字段(scope 已限定) */
function extractFields(sql: string, ctx: CopilotMetaContext): string[] {
  // 收集所有表里的字段名集合
  const fieldSet = new Set<string>()
  ctx.tables.forEach(t => t.fields.forEach(f => fieldSet.add(f.name)))
  // 收集 SELECT 后字段:简单按逗号分
  const selectMatch = sql.match(/\bselect\s+([\s\S]+?)\s+from\b/i)
  if (!selectMatch) return []
  const cols = selectMatch[1].split(',').map(s => s.trim().replace(/^\w+\./, ''))
  const hits: string[] = []
  cols.forEach(c => {
    // 跳过 * 与函数
    const name = c.match(/^([A-Za-z_]\w*)/)?.[1]
    if (name && fieldSet.has(name)) hits.push(name)
  })
  return hits
}

/* ═════════════════════════════════════════════════════
 * 路由上下文(供 UI 显示「本轮用了哪些知识源」)
 * ═════════════════════════════════════════════════════ */
export interface RouteSnapshot {
  action: CopilotAction
  sources: string[]
  /** prompt 命中的业务词 */
  matchedWords: string[]
  /** 命中的标准代码 */
  matchedStandards: string[]
}

const lastRoutes: RouteSnapshot[] = []
export function getLastRoutes(): RouteSnapshot[] {
  return [...lastRoutes]
}
export function clearLastRoutes() {
  lastRoutes.length = 0
}

function recordRoute(action: CopilotAction, prompt: string, ctx: CopilotMetaContext) {
  const scope = resolveForAction(action, prompt, ctx)
  lastRoutes.push({
    action,
    sources: scope.sources,
    matchedWords: scope.words,
    matchedStandards: scope.standards
  })
  if (lastRoutes.length > 30) lastRoutes.shift()
  return scope
}

function delay(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

/* ═════════════════════════════════════════════════════
 * 1) NL→SQL
 * ═════════════════════════════════════════════════════ */

/** 中文分词简化版:取 2~6 字短语,与同义词表匹配 */
function matchPhrases(
  text: string,
  ctx: CopilotMetaContext,
  scope: ReturnType<typeof resolveForAction>
): Array<{ phrase: string; en: string; abbr?: string }> {
  const lower = text.toLowerCase()
  const out: Array<{ phrase: string; en: string; abbr?: string }> = []
  for (const w of ctx.words) {
    if (lower.includes(w.chineseName)) out.push({ phrase: w.chineseName, en: w.englishName, abbr: w.abbreviation })
    if (w.synonyms) {
      w.synonyms.split(',').forEach(s => {
        const syn = s.trim()
        if (syn && lower.includes(syn)) out.push({ phrase: syn, en: w.englishName, abbr: w.abbreviation })
      })
    }
  }
  // 表中文名匹配(只在 scope.tables 内,体现「路由后子集」)
  for (const t of scope.tables) {
    if (text.includes(t.cnName)) out.push({ phrase: t.cnName, en: t.name, abbr: undefined })
  }
  return out
}

/** 找一张与意图最相关的表(优先领域匹配 > 中文名命中 > 默认 dim_user) */
function pickTable(intent: { phrases: ReturnType<typeof matchPhrases>; hintTable?: string }, ctx: CopilotMetaContext) {
  if (intent.hintTable) {
    const exact = ctx.tables.find(t => t.name === intent.hintTable)
    if (exact) return exact
  }
  for (const p of intent.phrases) {
    if (!p.abbr) continue
    const hit = ctx.tables.find(t => t.name.toLowerCase().includes(p.en.toLowerCase()))
    if (hit) return hit
  }
  return ctx.tables.find(t => t.name === 'dim_user') ?? ctx.tables[0]
}

/** 抽取自然语言中的时间窗(近 N 天 / N 个月) */
function extractTimeWindow(text: string): { whereClause: string; matched: string } | null {
  const m1 = text.match(/近\s*(\d+)\s*天/)
  if (m1) return { whereClause: `dt >= date_sub(now(), ${m1[1]})`, matched: m1[0] }
  const m2 = text.match(/最近\s*(\d+)\s*月/)
  if (m2) return { whereClause: `dt >= date_sub(now(), ${parseInt(m2[1]) * 30})`, matched: m2[0] }
  const m3 = text.match(/(\d{4})[-\/年](\d{1,2})/)
  if (m3) return { whereClause: `dt between '${m3[1]}-${m3[2].padStart(2, '0')}-01' and '${m3[1]}-${m3[2].padStart(2, '0')}-31'`, matched: `${m3[1]}-${m3[2]}` }
  return null
}

/** 检测聚合意图 */
function detectAggregate(text: string): { agg: 'sum' | 'count' | 'avg' | null; metric?: string } {
  if (/总数|多少|数量|count/i.test(text)) return { agg: 'count' }
  if (/合计|总金额|总额|sum/i.test(text)) return { agg: 'sum' }
  if (/平均|均值|avg/i.test(text)) return { agg: 'avg' }
  return { agg: null }
}

export async function nl2sql(
  prompt: string,
  ctx: CopilotMetaContext,
  opts?: { hintTable?: string }
): Promise<{ candidates: Nl2sqlCandidate[]; warnings: string[] }> {
  await delay(700)
  const scope = recordRoute('nl2sql', prompt, ctx)

  const text = prompt.trim()
  const phrases = matchPhrases(text, ctx, scope)
  const table = pickTable({ phrases, hintTable: opts?.hintTable }, ctx)
  if (!table) {
    return { candidates: [], warnings: ['未识别到任何已上线表,请检查 prompt 中是否包含表名或业务对象'] }
  }

  const tw = extractTimeWindow(text)
  const agg = detectAggregate(text)

  // 选字段:聚合时取 1 个数值字段 + user_id
  const numericField = table.fields.find(f => /amount|balance|score|cnt|amt|amt_|amt$|rate/i.test(f.name))
  const groupByField = table.fields.find(f => /city|product|gender|channel|org|stat_date/i.test(f.name))

  const conditions: string[] = []
  if (tw) conditions.push(tw.whereClause)
  // 涉敏字段硬编码示例(身份证)
  if (/身份证|idcard|id_card/i.test(text)) {
    conditions.push("id_type = '101'")
  }
  if (/男性|男\b/.test(text)) {
    conditions.push("gender = '1'")
  }

  const whereClause = conditions.length ? `\nWHERE  ${conditions.join('\n   AND ')}` : ''
  const lim = /\b明细|逐条|每条/.test(text) ? '' : '\nLIMIT  100'

  /* 候选 1:聚合查询 */
  let sql1 = ''
  if (agg.agg) {
    const metricCol = numericField?.name ?? table.fields[0]?.name ?? '*'
    const select = `${agg.agg.toUpperCase()}(${metricCol}) AS metric_value`
    const group = groupByField ? `\nGROUP BY ${groupByField.name}` : ''
    sql1 = `SELECT ${select}\nFROM   ${table.name}${whereClause}${group}${lim};`
  } else {
    /* 候选 2:明细列表 */
    const cols = table.fields.slice(0, 6).map(f => f.name).join(', ')
    sql1 = `SELECT ${cols}\nFROM   ${table.name}${whereClause}\nORDER BY stat_date DESC${lim};`
  }

  // 候选 2:TopN 排序版本
  let sql2 = ''
  if (numericField && agg.agg !== 'count') {
    sql2 = `SELECT ${numericField.name}, user_id\nFROM   ${table.name}${whereClause}\nORDER BY ${numericField.name} DESC\nLIMIT  10;`
  } else {
    sql2 = `SELECT user_id, COUNT(*) AS cnt\nFROM   ${table.name}${whereClause}\nGROUP BY user_id\nORDER BY cnt DESC\nLIMIT  20;`
  }

  // 候选 3:汇总 + 同比
  let sql3 = ''
  if (numericField) {
    sql3 = `SELECT\n   '${tw?.matched ?? '近 30 天'}' AS period,\n   SUM(${numericField.name}) AS amt_total,\n   COUNT(DISTINCT user_id) AS user_cnt\nFROM   ${table.name}${whereClause};`
  } else {
    sql3 = sql2
  }

  // 涉及到的字段
  const fieldsUsed = new Set<string>()
  ;[sql1, sql2, sql3].forEach(s => extractFields(s, ctx).forEach(f => fieldsUsed.add(f)))

  // 涉及到的标准
  const standards = new Set<string>()
  table.fields.forEach(f => {
    if (fieldsUsed.has(f.name) && f.standard) standards.add(f.standard.code)
  })

  const warnings: string[] = []
  if (!agg.agg && tw == null) warnings.push('未识别到时间窗与聚合意图,已按「明细列表」生成,可继续追问「按天汇总」')
  if (table.fields.some(f => /id_card|mobile|身份证|手机号/.test(f.name) && fieldsUsed.has(f.name))) {
    warnings.push('SQL 涉敏字段,执行前请确认已申请相应权限')
  }
  if (!table.fields.some(f => /codice/i.test(f.name)) && conditions.some(c => /gender|id_type/.test(c))) {
    warnings.push('枚举值(性别/证件类型)未严格按标准码值校验,请人工复核')
  }

  return {
    candidates: [
      { sql: sql1, tables: [table.name], fields: [...fieldsUsed], standards: [...standards], warnings },
      { sql: sql2, tables: [table.name], fields: [...fieldsUsed], standards: [...standards], warnings },
      { sql: sql3, tables: [table.name], fields: [...fieldsUsed], standards: [...standards], warnings }
    ],
    warnings
  }
}

/* ═════════════════════════════════════════════════════
 * 2) 解释 SQL
 * ═════════════════════════════════════════════════════ */
export async function explainSql(sql: string, ctx: CopilotMetaContext): Promise<{ summary: string; bullets: string[] }> {
  await delay(600)
  const scope = recordRoute('explain', sql, ctx)
  const tables = extractTables(sql, ctx, scope.tables.map((t: CopilotTableEntry) => t.name))
  const fields = extractFields(sql, ctx)
  const bullets: string[] = []

  if (!tables.length) {
    return { summary: '未能识别到任何已上线表,可能 SQL 引用了未上线表或别名为引号包裹。', bullets: ['请确认 SQL 中的表名拼写', '如需引用未上线表,请先在「数据管理」提交上线'] }
  }

  const summaries = tables.map((name: string) => {
    const t = ctx.tables.find(x => x.name === name)
    if (!t) return `${name}:跨数据源或不在可见范围`
    return `【${t.cnName} / ${t.layer} / ${t.storage}】${t.businessCaliber || t.description || '未提供业务口径'}`
  })

  bullets.push(...summaries)
  if (fields.length) {
    const hints: string[] = []
    fields.forEach(fn => {
      for (const t of tables) {
        const tab = ctx.tables.find(x => x.name === t)
        const f = tab?.fields.find(x => x.name === fn)
        if (f) {
          const stdHint = f.standard ? ` · 合标:${f.standard.code} ${f.standard.cnName}` : ' · 未合标'
          const sensHint = ['sensitive', 'restricted'].includes(f.sensitivity) ? ' · ⚠️涉敏' : ''
          hints.push(`${fn}(${t}) → ${f.description || f.cnName || fn}${stdHint}${sensHint}`)
          break
        }
      }
    })
    bullets.push(...hints.slice(0, 8))
  }

  return {
    summary: `本 SQL 涉及 ${tables.length} 张已上线表${fields.length ? `与 ${fields.length} 个字段` : ''},主要做${/count|sum|avg/i.test(sql) ? '聚合统计' : /where/i.test(sql) ? '条件筛选' : '明细查询'}。`,
    bullets
  }
}

/* ═════════════════════════════════════════════════════
 * 3) 优化 SQL
 * ═════════════════════════════════════════════════════ */
export async function optimizeSql(sql: string, ctx: CopilotMetaContext): Promise<{ suggestions: string[]; rewrite?: string }> {
  await delay(700)
  const scope = recordRoute('optimize', sql, ctx)
  const suggestions: string[] = []
  const lower = sql.toLowerCase()

  if (/select\s+\*\s+from/i.test(lower)) suggestions.push('避免 SELECT *:仅取必要字段,可减少网络与解析开销;推荐指定字段名清单。')
  if (!/\blimit\b/i.test(lower)) suggestions.push('缺少 LIMIT:线上查询建议加 LIMIT,避免一次性拉取过多数据。')
  if (/\bcount\(\*\)\b/i.test(lower) && !/\bgroup\s+by\b/i.test(lower)) suggestions.push('单 COUNT(*) 全表扫描代价高,如需按维度拆分请加 GROUP BY。')

  const tables = extractTables(sql, ctx)
  tables.forEach(tn => {
    const tab = ctx.tables.find(x => x.name === tn)
    if (!tab) return
    if (tab.services.some(s => s.kind === 'API')) {
      const api = tab.services.find(s => s.kind === 'API')!
      suggestions.push(`已有 API「${api.name}」(${api.endpoint}) 可消费,建议改走 API 而非直查底层表。`)
    }
    if (tab.fields.some(f => /id_card|mobile/.test(f.name) && /\bid_card\b|\bmobile\b/.test(lower))) {
      suggestions.push('涉敏字段:id_card / mobile 命中,请确认已申请敏感字段访问权限。')
    }
  })

  if (/where\s+\w+\s*=\s*'\d{15,18}'/i.test(lower)) suggestions.push('硬编码身份证号示例,建议改用占位符或参数化查询。')

  // 给出重写:加 LIMIT + 字段裁剪
  let rewriteOut: string | undefined
  if (/select\s+\*\s+from/i.test(lower) || !/\blimit\b/i.test(lower)) {
    const t = tables[0]
    const tab = ctx.tables.find(x => x.name === t)
    if (tab) {
      const cols = tab.fields.slice(0, 5).map(f => f.name).join(', ')
      rewriteOut = `SELECT ${cols}\nFROM   ${t}\nWHERE  1 = 1\nLIMIT  100;`
    }
  }

  if (!suggestions.length) suggestions.push('SQL 已较优,未发现明显可优化点。')
  return { suggestions, rewrite: rewriteOut }
}

/* ═════════════════════════════════════════════════════
 * 4) 合规校验
 * ═════════════════════════════════════════════════════ */
export async function auditSql(sql: string, ctx: CopilotMetaContext): Promise<CopilotIssue[]> {
  await delay(400)
  const scope = recordRoute('audit', sql, ctx)
  const issues: CopilotIssue[] = []
  const tables = extractTables(sql, ctx, scope.tables.map((t: CopilotTableEntry) => t.name))
  const fields = extractFields(sql, ctx)

  for (const tn of tables) {
    const tab = ctx.tables.find(x => x.name === tn)
    if (!tab) continue

    // API 替代建议
    tab.services.filter(s => s.kind === 'API').forEach(api => {
      issues.push({
        level: 'info',
        category: 'api',
        table: tn,
        message: `表「${tn}」已有 API「${api.name}」可消费:${api.endpoint}`,
        suggestion: api.name
      })
    })

    // 字段逐条
    for (const f of tab.fields) {
      if (!fields.includes(f.name)) continue
      // 涉敏
      if (f.sensitivity === 'restricted') {
        issues.push({
          level: 'error',
          category: 'sensitivity',
          table: tn,
          field: f.name,
          message: `字段 ${tn}.${f.name} 属高敏(restricted),需走权限审批并加脱敏规则。`,
          suggestion: '联系数据负责人申请权限'
        })
      } else if (f.sensitivity === 'sensitive') {
        issues.push({
          level: 'warn',
          category: 'sensitivity',
          table: tn,
          field: f.name,
          message: `字段 ${tn}.${f.name} 属敏感(sensitive),导出需配置脱敏策略。`,
          suggestion: '参考「权限管理 → 字段脱敏」'
        })
      }
      // 合标
      if (!f.standard) {
        issues.push({
          level: 'info',
          category: 'compliance',
          table: tn,
          field: f.name,
          message: `字段 ${tn}.${f.name} 暂未挂接数据标准,命名/口径建议走标准注册流程。`,
          suggestion: '「数据管理 → 数据标准 → 字段映射」'
        })
      }
      // 枚举硬编码
      if (f.enumValues) {
        issues.push({
          level: 'info',
          category: 'naming',
          table: tn,
          field: f.name,
          message: `字段 ${tn}.${f.name} 是枚举(挂标准代码 ${f.standard?.stdCodeNo ?? ''}),WHERE 中取值请从码值清单选择:${f.enumValues.slice(0, 4).map(v => v.value).join('/')} 等。`
        })
      }
    }
  }

  return issues
}

/* ── 便捷:把 Issue 按等级聚合展示 ── */
export function summarizeIssues(issues: CopilotIssue[]): Record<IssueLevel, number> {
  return issues.reduce(
    (acc, i) => {
      acc[i.level] = (acc[i.level] ?? 0) + 1
      return acc
    },
    { info: 0, warn: 0, error: 0 } as Record<IssueLevel, number>
  )
}

/** 给 SqlEditor 暴露的轻量同步审计(不延迟) */
export function auditSqlSync(sql: string, ctx: CopilotMetaContext): CopilotIssue[] {
  const issues: CopilotIssue[] = []
  const scope = resolveForAction('audit', sql, ctx)
  const tables = extractTables(sql, ctx, scope.tables.map((t: CopilotTableEntry) => t.name))
  const fields = extractFields(sql, ctx)
  for (const tn of tables) {
    const tab = ctx.tables.find(x => x.name === tn)
    if (!tab) continue
    if (tab.services.some(s => s.kind === 'API')) {
      const api = tab.services.find(s => s.kind === 'API')!
      issues.push({
        level: 'info',
        category: 'api',
        table: tn,
        message: `表「${tn}」已有 API「${api.name}」可消费:${api.endpoint}`,
        suggestion: api.name
      })
    }
    for (const f of tab.fields) {
      if (!fields.includes(f.name)) continue
      if (f.sensitivity === 'restricted') {
        issues.push({
          level: 'error',
          category: 'sensitivity',
          table: tn,
          field: f.name,
          message: `字段 ${tn}.${f.name} 属高敏(restricted),需走权限审批并加脱敏规则。`,
          suggestion: '联系数据负责人申请权限'
        })
      } else if (f.sensitivity === 'sensitive') {
        issues.push({
          level: 'warn',
          category: 'sensitivity',
          table: tn,
          field: f.name,
          message: `字段 ${tn}.${f.name} 属敏感(sensitive),导出需配置脱敏策略。`,
          suggestion: '参考「权限管理 → 字段脱敏」'
        })
      }
      if (!f.standard) {
        issues.push({
          level: 'info',
          category: 'compliance',
          table: tn,
          field: f.name,
          message: `字段 ${tn}.${f.name} 暂未挂接数据标准,命名/口径建议走标准注册流程。`,
          suggestion: '「数据管理 → 数据标准 → 字段映射」'
        })
      }
    }
  }
  return issues
}

/** 把 Copilot 入口提供给 UI 工厂 */
export function newCopilotMessageId(): string {
  return `CM${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`
}

/** 用 SqlEditor 字段反查字段条目(供 Monaco 字段提示文档用) */
export function findFieldEntry(ctx: CopilotMetaContext, tableName: string, fieldName: string): CopilotFieldEntry | undefined {
  return ctx.tables.find(t => t.name === tableName)?.fields.find(f => f.name === fieldName)
}

// 导出占位避免 lint 报错
export type { CopilotMessage }