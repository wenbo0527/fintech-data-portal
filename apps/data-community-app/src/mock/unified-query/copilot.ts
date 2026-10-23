/**
 * Copilot mock 引擎(P1)
 *
 * 四个动作,均返回 Promise(用 setTimeout 模拟 600~900ms 延迟,贴近真实 LLM 体验):
 *   - nl2sql(prompt, ctx)    自然语言 → 候选 SQL
 *   - explainSql(sql, ctx)   解释 SQL 含义
 *   - optimizeSql(sql, ctx)  给出优化建议 / 重写
 *   - auditSql(sql, ctx)     合规校验(返回 Issue 列表)
 *
 * 核心约定(与 prompt-routes.ts 共用一套事实源):
 *  - 每个动作先走 `prepareAction()` → 得到 `scope`(路由裁剪后的知识子集)
 *    与 `systemPrompt`(用同一 scope 渲染出的提示词);
 *  - 后续所有计算(选表、抽字段、抽码值)一律基于 scope,不再直接读全量 ctx;
 *  - `systemPrompt` 通过 RouteSnapshot 暴露给 UI,接 LLM 时即为实际下发内容。
 *
 * 算法定位:基于词典 + 模板的本地实现,符合「项目仅用于前端展示,无后端」约束。
 * 真实接入 LLM 时,把四个函数替换为异步 HTTP/MCP 调用即可。
 */
import type { CopilotFieldEntry, CopilotMetaContext, CopilotTableEntry } from './metadata-context'
import { describeRoute, renderSystemPrompt, resolveForAction } from './metadata-context'
import type { ResolvedScope } from './prompt-routes'
import type {
  CopilotAction,
  CopilotIssue,
  CopilotMessage,
  IssueLevel,
  Nl2sqlCandidate
} from './types'

/**
 * 取 SQL 中出现的表名。
 *
 * 候选集 = scope.tables(路由后的子集)+ ctx 全量表名(兜底):
 * ctx 里同时包含数据资产目录表与编辑器数据源树表,SQL 里引用任一体系都能识别。
 *
 * @param sql SQL 文本
 * @param ctx 知识上下文(用于兜底取全量表名)
 * @param scopeTables 路由裁剪后的表名清单
 */
function extractTables(sql: string, ctx: CopilotMetaContext, scopeTables?: string[]): string[] {
  const allNames = new Set<string>([
    ...(scopeTables ?? ctx.tables.map(t => t.name)),
    ...ctx.tables.map(t => t.name)
  ])
  const out = new Set<string>()
  const re = /\b(?:from|join)\s+([`"']?)(\w+)\1/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(sql)) !== null) {
    const tbl = m[2]
    if (allNames.has(tbl)) {out.add(tbl)}
  }
  return [...out]
}

/**
 * 取 SQL 中出现的字段名,候选集限定为 scope 内表的字段
 *
 * @param sql SQL 文本
 * @param scopeTables 路由裁剪后的表条目
 */
function extractFields(sql: string, scopeTables: CopilotTableEntry[]): string[] {
  // 收集 scope 内所有表里的字段名集合
  const fieldSet = new Set<string>()
  scopeTables.forEach(t => t.fields.forEach(f => fieldSet.add(f.name)))
  // 收集 SELECT 后字段:简单按逗号分
  const selectMatch = sql.match(/\bselect\s+([\s\S]+?)\s+from\b/i)
  if (!selectMatch) {return []}
  const cols = selectMatch[1].split(',').map(s => s.trim().replace(/^\w+\./, ''))
  const hits: string[] = []
  cols.forEach(c => {
    // 跳过 * 与函数
    const name = c.match(/^([A-Za-z_]\w*)/)?.[1]
    if (name && fieldSet.has(name)) {hits.push(name)}
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
  /** 本轮裁剪后参与计算的表 */
  tables: string[]
  /** 一行路由描述(动作 + 知识源 + 命中) */
  description: string
  /** 用同一 scope 渲染出的 system prompt(接 LLM 时即为实际下发内容) */
  systemPrompt: string
}

const lastRoutes: RouteSnapshot[] = []
export function getLastRoutes(): RouteSnapshot[] {
  return [...lastRoutes]
}
export function clearLastRoutes() {
  lastRoutes.length = 0
}

/** 动作执行上下文:路由裁剪结果 + 渲染出的 system prompt */
export interface ActionContext {
  /** 路由裁剪后的知识子集(选表/抽字段/取码值都以此为准) */
  scope: ResolvedScope
  /** 用 scope 渲染出的 system prompt */
  systemPrompt: string
}

/**
 * 动作前置:解析路由 → 得到 scope + system prompt,并记录路由快照。
 *
 * 这是「知识路由参与生成」的入口:后续逻辑不再直接读全量 ctx,
 * 而是读这里裁剪出来的 scope。
 *
 * @param action 动作
 * @param prompt 用户输入(SQL 类动作传 SQL 文本)
 * @param ctx 知识上下文
 * @param record 是否记录路由快照(实时审计等高频场景传 false)
 * @param withPrompt 是否渲染 system prompt(高频同步场景传 false,避免无谓开销)
 */
function prepareAction(
  action: CopilotAction,
  prompt: string,
  ctx: CopilotMetaContext,
  record = true,
  withPrompt = true
): ActionContext {
  const scope = resolveForAction(action, prompt, ctx)
  const systemPrompt = withPrompt ? renderSystemPrompt(action, prompt, ctx, scope) : ''
  if (record) {
    lastRoutes.push({
      action,
      sources: scope.sources,
      matchedWords: scope.words,
      matchedStandards: scope.standards,
      tables: scope.tables.map(t => t.name),
      description: describeRoute(action, prompt, ctx, scope),
      systemPrompt
    })
    if (lastRoutes.length > 30) {lastRoutes.shift()}
  }
  return { scope, systemPrompt }
}

function delay(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

/* ═════════════════════════════════════════════════════
 * 1) NL→SQL
 * ═════════════════════════════════════════════════════ */

/**
 * 中文分词简化版:取 2~6 字短语,与同义词表匹配。
 *
 * 注意:业务词的 englishName / abbreviation 可能为空串(语义契约术语只有中文名),
 * 必须先判空再 includes,否则 '' 恒被包含 → 匹配到一堆并不相关的词。
 */
function matchPhrases(
  text: string,
  ctx: CopilotMetaContext,
  scope: ResolvedScope
): Array<{ phrase: string; en: string; abbr?: string }> {
  const lower = text.toLowerCase()
  const out: Array<{ phrase: string; en: string; abbr?: string }> = []
  for (const w of ctx.words) {
    const cn = (w.chineseName || '').trim().toLowerCase()
    const en = (w.englishName || '').trim().toLowerCase()
    const abbr = (w.abbreviation || '').trim().toLowerCase()
    if (cn && lower.includes(cn)) {out.push({ phrase: w.chineseName, en: w.englishName, abbr: w.abbreviation })}
    if (en && lower.includes(en)) {out.push({ phrase: w.englishName, en: w.englishName, abbr: w.abbreviation })}
    if (abbr && lower.includes(abbr)) {out.push({ phrase: w.abbreviation, en: w.englishName, abbr: w.abbreviation })
    ;}(w.synonyms || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .forEach(syn => {
        if (lower.includes(syn.toLowerCase())) {
          out.push({ phrase: syn, en: w.englishName, abbr: w.abbreviation })
        }
      })
  }
  // 表中文名匹配(只在 scope.tables 内,体现「路由后子集」)
  for (const t of scope.tables) {
    if (t.cnName && text.includes(t.cnName)) {out.push({ phrase: t.cnName, en: t.name, abbr: undefined })}
  }
  return out
}

/**
 * 找一张与意图最相关的表(优先 prompt 直呼表名 > hintTable > 业务词命中 > 默认 dim_user)。
 * 候选集限定为路由裁剪后的 scope.tables,不再在全量 ctx.tables 里挑。
 */
function pickTable(
  intent: { phrases: ReturnType<typeof matchPhrases>; hintTable?: string; prompt?: string },
  scope: ResolvedScope
): CopilotTableEntry | undefined {
  const candidates = scope.tables
  if (!candidates.length) {return undefined}
  // ① prompt 里直接出现表名(按词边界匹配,避免 dwd_user 命中 dwd_user_detail)
  const raw = intent.prompt || ''
  if (raw) {
    const byName = candidates.find(t =>
      new RegExp(`\\b${t.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(raw)
    )
    if (byName) {return byName}
  }
  if (intent.hintTable) {
    const exact = candidates.find(t => t.name === intent.hintTable)
    if (exact) {return exact}
  }
  for (const p of intent.phrases) {
    if (!p.abbr) {continue}
    const hit = candidates.find(t => t.name.toLowerCase().includes(p.en.toLowerCase()))
    if (hit) {return hit}
  }
  return candidates.find(t => t.name === 'dim_user') ?? candidates[0]
}

/** 抽取自然语言中的时间窗(近 N 天 / N 个月) */
function extractTimeWindow(text: string): { whereClause: string; matched: string } | null {
  const m1 = text.match(/近\s*(\d+)\s*天/)
  if (m1) {return { whereClause: `dt >= date_sub(now(), ${m1[1]})`, matched: m1[0] }}
  const m2 = text.match(/最近\s*(\d+)\s*月/)
  if (m2) {return { whereClause: `dt >= date_sub(now(), ${parseInt(m2[1]) * 30})`, matched: m2[0] }}
  const m3 = text.match(/(\d{4})[-\/年](\d{1,2})/)
  if (m3) {return { whereClause: `dt between '${m3[1]}-${m3[2].padStart(2, '0')}-01' and '${m3[1]}-${m3[2].padStart(2, '0')}-31'`, matched: `${m3[1]}-${m3[2]}` }}
  return null
}

/** 检测聚合意图 */
function detectAggregate(text: string): { agg: 'sum' | 'count' | 'avg' | null; metric?: string } {
  if (/总数|多少|数量|count/i.test(text)) {return { agg: 'count' }}
  if (/合计|总金额|总额|汇总|统计|sum/i.test(text)) {return { agg: 'sum' }}
  if (/平均|均值|avg/i.test(text)) {return { agg: 'avg' }}
  return { agg: null }
}

/**
 * 从 scope 的码值清单中取枚举值。
 *
 * 优先取 scope 允许的标准码值(路由已裁剪),未命中时回退到 ctx 全量码值,
 * 保证生成的条件值来自真实码值清单而非硬编码。
 *
 * @param scope 路由裁剪结果
 * @param ctx 知识上下文
 * @param stdCodeNo 标准码编号,如 STD_ID_TYPE
 * @param meaning 码值含义关键字,如 身份证
 * @param fallback 兜底值
 */
function resolveEnumValue(
  scope: ResolvedScope,
  ctx: CopilotMetaContext,
  stdCodeNo: string,
  meaning: string,
  fallback: string
): string {
  const allowed = new Set(scope.codes)
  const code = ctx.codes.find(c => c.code === stdCodeNo && allowed.has(c.code))
    ?? ctx.codes.find(c => c.code === stdCodeNo)
  if (!code) {return fallback}
  const hit = code.items.find(i => i.meaning.includes(meaning))
  return hit?.value ?? fallback
}

/**
 * 在表字段里找时间列(dt / stat_date / *_dt / *_date)。
 *
 * 生成 SQL 时不能写死 `dt`,否则落到没有分区字段的表上会直接报字段不存在。
 *
 * @param table 表条目
 */
function pickTimeColumn(table: CopilotTableEntry): string | undefined {
  return table.fields.find(f => /^(dt|stat_date|date|.*_dt|.*_date)$/i.test(f.name))?.name
}

/**
 * 在表字段里找主键/标识列(user_id / cust_no / *_id / *_no)。
 *
 * 聚合与去重都需要一个稳定的标识列,写死 user_id 会让不含该字段的表生成非法 SQL。
 *
 * @param table 表条目
 */
function pickIdColumn(table: CopilotTableEntry): string | undefined {
  return (
    table.fields.find(f => f.isPrimaryKey)?.name ??
    table.fields.find(f => /^(user_id|cust_no|id)$/i.test(f.name))?.name ??
    table.fields.find(f => /(_id|_no)$/i.test(f.name))?.name
  )
}

/**
 * 数值型字段类型白名单(用于判断字段能否参与 SUM/AVG 等聚合)。
 *
 * 需兼容 `decimal(18,2)` 这类带精度声明的写法(编辑器数据源树的列类型就是这种形式)。
 */
const NUMERIC_TYPES = /^(decimal|numeric|int|integer|bigint|smallint|tinyint|double|float|number|long)\s*(\(\s*\d+(,\s*\d+)?\s*\))?$/i

/**
 * 在表字段里找可用于聚合的数值列。
 *
 * 只按字段名正则匹配会把 `score_type`(string)误判成数值列,生成 `SUM(score_type)` 这种非法 SQL,
 * 因此必须在名称匹配之后再校验字段类型。
 *
 * @param table 表条目
 */
function pickNumericField(table: CopilotTableEntry): string | undefined {
  const named = table.fields.find(
    f => NUMERIC_TYPES.test(f.type) && /amount|balance|score|cnt|amt|_amt|rate|value|price|fee/i.test(f.name)
  )
  if (named) {return named.name}
  // 没有命中名称规则时,退化为取第一个数值列
  return table.fields.find(f => NUMERIC_TYPES.test(f.type))?.name
}

export async function nl2sql(
  prompt: string,
  ctx: CopilotMetaContext,
  opts?: { hintTable?: string }
): Promise<{ candidates: Nl2sqlCandidate[]; warnings: string[] }> {
  await delay(700)
  const { scope } = prepareAction('nl2sql', prompt, ctx)

  const text = prompt.trim()
  const phrases = matchPhrases(text, ctx, scope)
  const table = pickTable({ phrases, hintTable: opts?.hintTable, prompt: text }, scope)
  if (!table) {
    return { candidates: [], warnings: ['未识别到任何已上线表,请检查 prompt 中是否包含表名或业务对象'] }
  }

  const tw = extractTimeWindow(text)
  const agg = detectAggregate(text)

  // 选字段:全部从表的真实字段里挑,避免生成引用不存在列的 SQL
  const numericFieldName = pickNumericField(table)
  const numericField = numericFieldName ? table.fields.find(f => f.name === numericFieldName) : undefined
  const groupByField = table.fields.find(f => /city|product|gender|channel|org|stat_date/i.test(f.name))
  const timeColumn = pickTimeColumn(table)
  const idColumn = pickIdColumn(table)

  const conditions: string[] = []
  // 时间窗条件:只有表里存在时间列时才加,否则生成的 SQL 会因字段不存在而报错
  if (tw && timeColumn) {conditions.push(tw.whereClause.replace(/\bdt\b/g, timeColumn))}
  // 涉敏字段硬编码示例(身份证):取值从码值清单取,不再写死
  if (/身份证|idcard|id_card/i.test(text)) {
    conditions.push(`id_type = '${resolveEnumValue(scope, ctx, 'STD_ID_TYPE', '身份证', '101')}'`)
  }
  if (/男性|男\b/.test(text)) {
    conditions.push(`gender = '${resolveEnumValue(scope, ctx, 'STD_GENDER', '男', '1')}'`)
  }

  const whereClause = conditions.length ? `\nWHERE  ${conditions.join('\n   AND ')}` : ''
  const lim = /\b明细|逐条|每条/.test(text) ? '' : '\nLIMIT  100'

  /* 候选 1:聚合查询 */
  let sql1 = ''
  if (agg.agg) {
    // 表里没有数值列时不能对字符串列做 SUM/AVG,降级为 COUNT(*)
    const canAgg = numericField || agg.agg === 'count'
    const metricCol = numericField?.name ?? '*'
    const select = canAgg
      ? `${agg.agg.toUpperCase()}(${metricCol}) AS metric_value`
      : 'COUNT(*) AS metric_value'
    const group = groupByField ? `\nGROUP BY ${groupByField.name}` : ''
    sql1 = `SELECT ${select}\nFROM   ${table.name}${whereClause}${group}${lim};`
  } else {
    /* 候选 2:明细列表 */
    const cols = table.fields.slice(0, 6).map(f => f.name).join(', ')
    // 排序列同样取自真实字段,没有时间列时退化为按主键排序
    const orderCol = timeColumn ?? idColumn
    const order = orderCol ? `\nORDER BY ${orderCol} DESC` : ''
    sql1 = `SELECT ${cols}\nFROM   ${table.name}${whereClause}${order}${lim};`
  }

  // 候选 2:TopN 排序版本
  let sql2 = ''
  if (numericField && idColumn && agg.agg !== 'count') {
    sql2 = `SELECT ${numericField.name}, ${idColumn}\nFROM   ${table.name}${whereClause}\nORDER BY ${numericField.name} DESC\nLIMIT  10;`
  } else if (idColumn) {
    sql2 = `SELECT ${idColumn}, COUNT(*) AS cnt\nFROM   ${table.name}${whereClause}\nGROUP BY ${idColumn}\nORDER BY cnt DESC\nLIMIT  20;`
  } else {
    sql2 = `SELECT COUNT(*) AS cnt\nFROM   ${table.name}${whereClause}${lim};`
  }

  // 候选 3:汇总 + 同比
  let sql3 = ''
  if (numericField) {
    const cntCol = idColumn ? `COUNT(DISTINCT ${idColumn})` : 'COUNT(*)'
    sql3 = `SELECT\n   '${tw?.matched ?? '近 30 天'}' AS period,\n   SUM(${numericField.name}) AS metric_total,\n   ${cntCol} AS user_cnt\nFROM   ${table.name}${whereClause};`
  } else {
    sql3 = sql2
  }

  // 涉及到的字段(限定在 scope 内表的字段集合中)
  const fieldsUsed = new Set<string>()
  ;[sql1, sql2, sql3].forEach(s => extractFields(s, scope.tables).forEach(f => fieldsUsed.add(f)))

  // 涉及到的标准
  const standards = new Set<string>()
  table.fields.forEach(f => {
    if (fieldsUsed.has(f.name) && f.standard) {standards.add(f.standard.code)}
  })

  const warnings: string[] = []
  if (!agg.agg && tw == null) {warnings.push('未识别到时间窗与聚合意图,已按「明细列表」生成,可继续追问「按天汇总」')}
  if (tw && !timeColumn) {warnings.push(`表「${table.name}」未识别到日期分区字段,已省略时间过滤条件`)}
  if (table.fields.some(f => /id_card|mobile/.test(f.name) && fieldsUsed.has(f.name))) {
    warnings.push('SQL 涉敏字段,执行前请确认已申请相应权限')
  }
  if (conditions.some(c => /gender|id_type/.test(c))) {
    // 校验枚举条件对应的字段是否真的挂了标准码值
    const enumFields = table.fields.filter(f => /id_type|gender/.test(f.name) && f.enumValues?.length)
    if (!enumFields.length) {
      warnings.push('枚举值(性别/证件类型)未严格按标准码值校验,请人工复核')
    }
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
  const { scope } = prepareAction('explain', sql, ctx)
  const tables = extractTables(sql, ctx, scope.tables.map((t: CopilotTableEntry) => t.name))
  const fields = extractFields(sql, scope.tables)
  const bullets: string[] = []

  if (!tables.length) {
    return { summary: '未能识别到任何可查表,可能 SQL 引用了不存在的表或表名被引号包裹。', bullets: ['请确认 SQL 中的表名拼写', '如需引用尚未上线的表,请先在「数据管理」提交上线'] }
  }

  const summaries = tables.map((name: string) => {
    const t = ctx.tables.find(x => x.name === name)
    if (!t) {return `${name}:跨数据源或不在可见范围`}
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
    summary: `本 SQL 涉及 ${tables.length} 张可查表${fields.length ? `与 ${fields.length} 个字段` : ''},主要做${/count|sum|avg/i.test(sql) ? '聚合统计' : /where/i.test(sql) ? '条件筛选' : '明细查询'}。`,
    bullets
  }
}

/* ═════════════════════════════════════════════════════
 * 3) 优化 SQL
 * ═════════════════════════════════════════════════════ */
export async function optimizeSql(sql: string, ctx: CopilotMetaContext): Promise<{ suggestions: string[]; rewrite?: string }> {
  await delay(700)
  const { scope } = prepareAction('optimize', sql, ctx)
  const suggestions: string[] = []
  const lower = sql.toLowerCase()

  if (/select\s+\*\s+from/i.test(lower)) {suggestions.push('避免 SELECT *:仅取必要字段,可减少网络与解析开销;推荐指定字段名清单。')}
  if (!/\blimit\b/i.test(lower)) {suggestions.push('缺少 LIMIT:线上查询建议加 LIMIT,避免一次性拉取过多数据。')}
  if (/\bcount\(\*\)\b/i.test(lower) && !/\bgroup\s+by\b/i.test(lower)) {suggestions.push('单 COUNT(*) 全表扫描代价高,如需按维度拆分请加 GROUP BY。')}

  // 表清单限定在路由裁剪后的 scope 内
  const tables = extractTables(sql, ctx, scope.tables.map((t: CopilotTableEntry) => t.name))
  tables.forEach(tn => {
    const tab = ctx.tables.find(x => x.name === tn)
    if (!tab) {return}
    if (tab.services.some(s => s.kind === 'API')) {
      const api = tab.services.find(s => s.kind === 'API')!
      suggestions.push(`已有 API「${api.name}」(${api.endpoint}) 可消费,建议改走 API 而非直查底层表。`)
    }
    if (tab.fields.some(f => /id_card|mobile/.test(f.name) && /\bid_card\b|\bmobile\b/.test(lower))) {
      suggestions.push('涉敏字段:id_card / mobile 命中,请确认已申请敏感字段访问权限。')
    }
  })

  if (/where\s+\w+\s*=\s*'\d{15,18}'/i.test(lower)) {suggestions.push('硬编码身份证号示例,建议改用占位符或参数化查询。')}

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

  if (!suggestions.length) {suggestions.push('SQL 已较优,未发现明显可优化点。')}
  return { suggestions, rewrite: rewriteOut }
}

/* ═════════════════════════════════════════════════════
 * 4) 合规校验
 * ═════════════════════════════════════════════════════ */

/**
 * 合规校验核心实现(同步)。
 *
 * 异步的 auditSql 与编辑器实时使用的 auditSqlSync 共用这一份逻辑,
 * 避免两条实现长期漂移。
 *
 * @param sql SQL 文本
 * @param ctx 知识上下文
 * @param scope 路由裁剪后的知识子集
 */
function collectAuditIssues(sql: string, ctx: CopilotMetaContext, scope: ResolvedScope): CopilotIssue[] {
  const issues: CopilotIssue[] = []
  const tables = extractTables(sql, ctx, scope.tables.map((t: CopilotTableEntry) => t.name))
  const fields = extractFields(sql, scope.tables)

  for (const tn of tables) {
    const tab = ctx.tables.find(x => x.name === tn)
    if (!tab) {continue}

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
      if (!fields.includes(f.name)) {continue}
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
          message: `字段 ${tn}.${f.name} 是枚举(挂标准代码 ${f.standard?.codeSetNo ?? ''}),WHERE 中取值请从码值清单选择:${f.enumValues.slice(0, 4).map(v => v.value).join('/')} 等。`
        })
      }
    }
  }

  return issues
}

/** 合规校验(对话用,带 400ms 模拟延迟,会记录路由快照) */
export async function auditSql(sql: string, ctx: CopilotMetaContext): Promise<CopilotIssue[]> {
  await delay(400)
  const { scope } = prepareAction('audit', sql, ctx)
  return collectAuditIssues(sql, ctx, scope)
}

/**
 * 给 SqlEditor 暴露的轻量同步审计(不延迟、不记录路由快照)。
 * 与 auditSql 共用 collectAuditIssues,保证判定口径一致。
 */
export function auditSqlSync(sql: string, ctx: CopilotMetaContext): CopilotIssue[] {
  // 实时场景:不记录路由快照、不渲染 system prompt(每次按键都会调用)
  const { scope } = prepareAction('audit', sql, ctx, false, false)
  return collectAuditIssues(sql, ctx, scope)
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
