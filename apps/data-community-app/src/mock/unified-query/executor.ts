/**
 * SQL 执行 Mock 引擎(设计文档 §7.3 的增强版)
 *
 * 与文档的差异:文档给的是裸 Promise,但 F06「终止运行」需要中断句柄,
 * 因此这里返回 job 对象 —— run() 出结果,cancel() 让 run() 以 aborted 收敛。
 *
 * 仍然遵守 §7.1 四原则:统一入口 / 模拟延迟 / 数据联动 / 状态一致性。
 */
import { collectTableNames, DATASOURCE_LABEL, getTableColumns } from './database'
import { abortedLogs, errorLogs, successLogs } from './logs'
import { getResultByTable } from './queryResults'
import { detectStatementKind } from './statement'
import type { DataSourceKey, QueryResult, ResultColumn, StatementKind } from './types'

const KNOWN_TABLES = collectTableNames()

/** 模拟执行耗时:0.8s - 2.0s(设计文档 §7.1) */
function mockDelay(): number {
  return 800 + Math.random() * 1200
}

/** 从 SQL 里识别主表名,用于取对应的 Mock 结果集 */
export function extractTableName(sql: string): string | null {
  const hit = KNOWN_TABLES.find(t => new RegExp(`\\b${t}\\b`, 'i').test(sql))
  return hit ?? null
}

/** 分段执行(F05):按分号切分,忽略空段与注释段 */
export function splitStatements(sql: string): string[] {
  return sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !/^--/.test(s.split('\n').filter(l => l.trim())[0] ?? ''))
}

/** 轻量格式化(F07):关键字大写 + 主要子句换行 */
export function formatSQL(sql: string): string {
  const majors = ['SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'JOIN', 'UNION ALL', 'UNION']
  let out = sql.replace(/\s+/g, ' ').trim()
  majors.forEach(kw => {
    const re = new RegExp(`\\s+${kw.replace(/\s+/g, '\\s+')}\\s+`, 'gi')
    out = out.replace(re, `\n${kw} `)
  })
  out = out.replace(/,\s*/g, ',\n       ')
  return out.replace(/\n\s*\n/g, '\n').trim()
}

/** 语法轻校验(F04 前置):只挡住明显不完整的语句,不做真解析 */
export function checkSyntax(sql: string): string | null {
  const s = sql.trim()
  if (!s) return 'SQL 语句为空,请输入查询内容'
  // DDL / 结构查询的目标对象校验下沉到 buildStructurePayload
  if (isStructureStatement(s)) return null
  if (!/\bselect\b/i.test(s) && !/\b(with)\b/i.test(s)) return '语句中缺少 SELECT,当前仅支持查询、DDL 与结构查询语句'
  if (!/\bfrom\b/i.test(s)) return '语句中缺少 FROM,请指定数据来源表'
  const table = extractTableName(s)
  if (!table) {
    const m = s.match(/\bfrom\s+([`"'\w.]+)/i)
    return `表 ${m?.[1] ?? '未知'} 不存在,请检查数据源与表名`
  }
  return null
}

/** F12:SELECT * 规则检查,返回警告文案(不阻断执行) */
export function checkSelectStar(sql: string): string | null {
  if (/\bselect\s+\*\s+from\b/i.test(sql.trim())) {
    return '检测到 SELECT *,全字段查询可能影响性能,建议按需指定字段名'
  }
  return null
}

/* ─────────── DDL / 结构查询(结果集天然很小) ─────────── */

/** 是否为 DDL 或结构查询语句 */
function isStructureStatement(sql: string): boolean {
  const kind = detectStatementKind(sql)
  return kind === 'ddl' || kind === 'metadata'
}

/** DDL 操作类型展示串,如 CREATE TABLE / DROP TABLE */
function ddlAction(sql: string): string {
  const m = sql.trim().match(/^([a-z]+)\s+([a-z]+)/i)
  return m ? `${m[1]} ${m[2]}`.toUpperCase() : 'DDL'
}

/** DDL 的操作对象表名 */
function extractDdlTarget(sql: string): string | null {
  const m = sql.match(
    /^\s*(?:CREATE\s+(?:OR\s+REPLACE\s+)?(?:EXTERNAL\s+)?(?:TABLE|VIEW|INDEX)|ALTER\s+TABLE|DROP\s+(?:TABLE|VIEW|INDEX)|TRUNCATE\s+TABLE|RENAME\s+TABLE|COMMENT\s+ON\s+(?:TABLE|COLUMN))\s+(?:IF\s+(?:NOT\s+)?EXISTS\s+)?[`"']?(?:\w+\.)?[`"']?(\w+)/i
  )
  return m?.[1] ?? null
}

/** SHOW CREATE / DESC 的目标表名 */
function extractStructureTarget(sql: string): string | null {
  const m = sql.match(
    /^\s*(?:SHOW\s+CREATE\s+(?:TABLE|VIEW)|DESC(?:RIBE)?(?:\s+TABLE)?)\s+[`"']?(?:\w+\.)?[`"']?(\w+)/i
  )
  return m?.[1] ?? null
}

/** 由字段元数据反向生成建表语句,供 SHOW CREATE TABLE 演示 */
function buildCreateTableDDL(table: string): string {
  const cols = getTableColumns(table)
  const body = cols.map(c => `  \`${c.name}\` ${c.type} COMMENT '${c.comment}'`).join(',\n')
  const key = cols[0]?.name ?? 'id'
  return `CREATE TABLE \`${table}\` (\n${body}\n) ENGINE=OLAP\nDUPLICATE KEY(\`${key}\`)\nDISTRIBUTED BY HASH(\`${key}\`) BUCKETS 8\nPROPERTIES ("replication_num" = "3");`
}

interface StructurePayload {
  columns: ResultColumn[]
  rows: Record<string, string | number>[]
}

/**
 * 构造 DDL / 结构查询的结果集
 * @returns 结果集,或直接返回错误文案
 */
function buildStructurePayload(sql: string, kind: StatementKind): StructurePayload | string {
  if (kind === 'ddl') {
    return {
      columns: [
        { title: '操作类型', dataIndex: 'action' },
        { title: '操作对象', dataIndex: 'target' },
        { title: '执行结果', dataIndex: 'result' }
      ],
      rows: [{ action: ddlAction(sql), target: extractDdlTarget(sql) ?? '—', result: '执行成功' }]
    }
  }

  const s = sql.trim()

  if (/^show\s+tables/i.test(s)) {
    return {
      columns: [{ title: 'Table', dataIndex: 'table' }],
      rows: KNOWN_TABLES.map(t => ({ table: t }))
    }
  }

  const table = extractStructureTarget(s) ?? extractTableName(s)

  if (/^explain\b/i.test(s)) {
    if (!table) return 'EXPLAIN 未识别到目标表,请检查数据源与表名'
    return {
      columns: [
        { title: 'Stage', dataIndex: 'stage', numeric: true },
        { title: 'Operator', dataIndex: 'operator' },
        { title: 'Table', dataIndex: 'table' },
        { title: '预估行数', dataIndex: 'rows', numeric: true }
      ],
      rows: [
        { stage: 0, operator: 'OlapScanNode', table, rows: 12480 },
        { stage: 1, operator: 'HashAggregateNode', table, rows: 3216 },
        { stage: 2, operator: 'ResultSink', table: '—', rows: 1 }
      ]
    }
  }

  if (!table) return '语句未指定目标表,请补充表名后重试'
  const cols = getTableColumns(table)
  if (!cols.length) return `表 ${table} 不存在,请检查数据源与表名`

  if (/^desc(ribe)?\b/i.test(s)) {
    return {
      columns: [
        { title: '字段名', dataIndex: 'field' },
        { title: '类型', dataIndex: 'type' },
        { title: '注释', dataIndex: 'comment' }
      ],
      rows: cols.map(c => ({ field: c.name, type: c.type, comment: c.comment }))
    }
  }

  return {
    columns: [
      { title: 'Table', dataIndex: 'table' },
      { title: 'Create Table', dataIndex: 'ddl' }
    ],
    rows: [{ table, ddl: buildCreateTableDDL(table) }]
  }
}

export interface QueryJob {
  /** 执行并返回结果;被 cancel() 时以 status = 'aborted' 收敛 */
  run(): Promise<QueryResult>
  /** 终止运行(F06) */
  cancel(): void
  readonly table: string | null
}

export function createQueryJob(sql: string, datasource: DataSourceKey): QueryJob {
  const table = extractTableName(sql)
  const dsName = DATASOURCE_LABEL[datasource]
  let cancelled = false
  let timer: ReturnType<typeof setTimeout> | null = null
  let wake: (() => void) | null = null

  const sleep = (ms: number) =>
    new Promise<void>(resolve => {
      wake = resolve
      timer = setTimeout(resolve, ms)
    })

  return {
    get table() {
      return table
    },
    cancel() {
      cancelled = true
      if (timer) clearTimeout(timer)
      wake?.()
    },
    async run(): Promise<QueryResult> {
      const startedAt = Date.now()

      const syntaxError = checkSyntax(sql)
      if (syntaxError) {
        await sleep(400)
        return {
          columns: [],
          rows: [],
          duration: '0.40s',
          rowCount: 0,
          logs: errorLogs(syntaxError, dsName),
          status: 'error'
        }
      }

      await sleep(mockDelay())

      if (cancelled) {
        return {
          columns: [],
          rows: [],
          duration: `${((Date.now() - startedAt) / 1000).toFixed(2)}s`,
          rowCount: 0,
          logs: abortedLogs(dsName),
          status: 'aborted'
        }
      }

      // DDL / 结构查询:不走结果集 Mock,直接回执小结果
      const kind = detectStatementKind(sql)
      if (kind === 'ddl' || kind === 'metadata') {
        const duration = `${((Date.now() - startedAt) / 1000).toFixed(2)}s`
        const payload = buildStructurePayload(sql, kind)
        if (typeof payload === 'string') {
          return {
            columns: [],
            rows: [],
            duration,
            rowCount: 0,
            logs: errorLogs(payload, dsName),
            status: 'error'
          }
        }
        const target = extractStructureTarget(sql) ?? extractDdlTarget(sql) ?? (kind === 'metadata' ? 'SHOW' : 'DDL')
        return {
          columns: payload.columns,
          rows: payload.rows,
          duration,
          rowCount: payload.rows.length,
          logs: successLogs(duration, payload.rows.length, dsName, target),
          status: 'success'
        }
      }

      const set = getResultByTable(table!)
      const cols = set.columns
      // 字段元数据参与列顺序校准,保证与导航树一致(状态一致性)
      const meta = getTableColumns(table!)
      if (meta.length && cols[0]?.dataIndex !== meta[0].name) {
        cols.forEach(c => {
          const hit = meta.find(m => m.name === c.dataIndex)
          if (hit) c.title = hit.comment || c.title
        })
      }

      const duration = `${((Date.now() - startedAt) / 1000).toFixed(2)}s`
      return {
        columns: cols,
        rows: set.rows,
        duration,
        rowCount: set.rows.length,
        logs: successLogs(duration, set.rows.length, dsName, table!),
        status: 'success'
      }
    }
  }
}

/** 兼容设计文档 §7.3 签名的一次性执行 */
export function mockExecuteSQL(sql: string, datasource: DataSourceKey): Promise<QueryResult> {
  return createQueryJob(sql, datasource).run()
}
