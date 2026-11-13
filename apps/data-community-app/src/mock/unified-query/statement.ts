/**
 * 语句分类与导出模式判定
 *
 * 导出口径(产品规则):
 *   DDL 类(含 SHOW CREATE / DESC / EXPLAIN 等结构查询),或结果行数低于
 *   QUICK_EXPORT_ROW_LIMIT 时,默认走前端「快速导出」;其余走后端导出任务。
 *   用户始终可以在导出弹窗里改为后端导出。
 */
import type { StatementKind } from './types'

/** 快速导出的行数上限:低于该值直接由浏览器生成文件 */
export const QUICK_EXPORT_ROW_LIMIT = 1000

/** 纯 DDL 关键字 */
const DDL_KEYWORDS = new Set([
  'CREATE', 'ALTER', 'DROP', 'TRUNCATE', 'RENAME', 'COMMENT', 'GRANT', 'REVOKE'
])

/** 结构查询关键字:结果天然只有少量行 */
const METADATA_KEYWORDS = new Set(['SHOW', 'DESC', 'DESCRIBE', 'EXPLAIN'])

/** 剥掉前置空白、行注释与块注释,避免注释干扰首关键字判断 */
function stripLeadingNoise(sql: string): string {
  let rest = sql
  for (;;) {
    const next = rest
      .replace(/^\s+/, '')
      .replace(/^--[^\n]*(?:\n|$)/, '')
      .replace(/^\/\*[\s\S]*?\*\//, '')
    if (next === rest) return rest
    rest = next
  }
}

/** 取语句首关键字(大写) */
function firstKeyword(sql: string): string {
  const cleaned = stripLeadingNoise(sql)
  return (cleaned.match(/^([a-z]+)/i)?.[1] ?? '').toUpperCase()
}

/** 按首关键字判定语句类别 */
export function detectStatementKind(sql: string): StatementKind {
  const kw = firstKeyword(sql)
  if (DDL_KEYWORDS.has(kw)) return 'ddl'
  if (METADATA_KEYWORDS.has(kw)) return 'metadata'
  if (kw === 'SELECT' || kw === 'WITH') return 'query'
  return 'unknown'
}

/** 语句类别展示名 */
export const STATEMENT_KIND_LABEL: Record<StatementKind, string> = {
  ddl: 'DDL 语句',
  metadata: '结构查询',
  query: '查询语句',
  unknown: '未知语句'
}

/** 快速导出适用性:DDL / 结构查询,或行数低于阈值 */
export function isQuickExportEligible(kind: StatementKind, rowCount: number): boolean {
  if (kind === 'ddl' || kind === 'metadata') return true
  return rowCount > 0 && rowCount < QUICK_EXPORT_ROW_LIMIT
}

/** 命中快速导出的原因,未命中返回 null */
export function quickExportReason(kind: StatementKind, rowCount: number): string | null {
  if (kind === 'ddl') return '检测到 DDL 语句,结果集较小'
  if (kind === 'metadata') return '检测到结构查询(SHOW / DESC / EXPLAIN),结果集较小'
  if (rowCount > 0 && rowCount < QUICK_EXPORT_ROW_LIMIT) {
    return `结果仅 ${rowCount} 行,低于 ${QUICK_EXPORT_ROW_LIMIT} 行阈值`
  }
  return null
}