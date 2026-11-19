/**
 * 统一查询 · 导出分隔符
 *
 * 仅开放三种口径（保持下拉短平快）：
 * - CSV：逗号 `,`，扩展名 csv；
 * - TSV：制表符 `\t`，扩展名 tsv；
 * - 自定义：1-3 个字符的任意分隔串，扩展名统一落到 txt。
 * 导出时按分隔符做转义（值内含分隔符 / 双引号 / 换行则整体加双引号，内部双引号翻倍）。
 */

export type DelimiterExt = 'csv' | 'tsv' | 'txt'

export interface DelimiterOption {
  /** 选择值；`custom` 是保留值代表自定义输入 */
  value: string
  /** 展示名 */
  label: string
  /** 落盘文件扩展名 */
  ext: DelimiterExt
  /** 下拉里的样式化示例 */
  preview: string
}

/** 分隔符预设：CSV / TSV / 自定义（自定义最长 3 个字符） */
export const DELIMITER_OPTIONS: DelimiterOption[] = [
  { value: ',', label: 'CSV（逗号 ,）', ext: 'csv', preview: 'name,age,city' },
  { value: '\t', label: 'TSV（制表符 Tab）', ext: 'tsv', preview: 'name\\tage\\tcity' },
  { value: 'custom', label: '自定义…', ext: 'txt', preview: '1-3 字符任意分隔串' }
]

/** UI 状态：选择值 + 自定义输入 */
export interface DelimiterSelection {
  /** DELIMITER_OPTIONS.value 之一 */
  selected: string
  /** 自定义输入内容（仅 selected === 'custom' 时生效） */
  custom: string
}

export const DEFAULT_DELIMITER_SELECTION: DelimiterSelection = { selected: ',', custom: '' }

const CUSTOM_VALUE = 'custom'
/** 自定义分隔符最大长度：3 个字符（含代理对按 1 计，用 Array.from 保证 emoji 也只算 1） */
export const MAX_CUSTOM_DELIMITER_LEN = 3

/** 解析出真正的分隔串：自定义时取 custom，为空则回落逗号 */
export function resolveDelimiter(sel: DelimiterSelection | string | undefined): string {
  if (!sel) return ','
  if (typeof sel === 'string') return sel === CUSTOM_VALUE ? ',' : sel
  if (sel.selected !== CUSTOM_VALUE) return sel.selected
  return sel.custom || ','
}

/** 根据选择推导扩展名：自定义永远 txt */
export function extOfDelimiter(sel: DelimiterSelection | string | undefined): DelimiterExt {
  if (!sel) return 'csv'
  if (typeof sel === 'string') {
    if (sel === CUSTOM_VALUE) return 'txt'
    return DELIMITER_OPTIONS.find(o => o.value === sel)?.ext || 'csv'
  }
  if (sel.selected === CUSTOM_VALUE) return 'txt'
  return DELIMITER_OPTIONS.find(o => o.value === sel.selected)?.ext || 'csv'
}

/** 展示用文本：把制表符/回车等控制字符转成可读符号 */
export function prettyDelimiter(d: string): string {
  if (d === '\t') return 'Tab'
  if (d === '\n') return 'LF'
  if (d === '\r') return 'CR'
  return d
}

/** 校验自定义分隔符；返回错误消息，null 代表合法 */
export function validateCustomDelimiter(v: string): string | null {
  const s = v ?? ''
  if (!s.length) return '请填写自定义分隔符'
  if (Array.from(s).length > MAX_CUSTOM_DELIMITER_LEN) return `自定义分隔符最长 ${MAX_CUSTOM_DELIMITER_LEN} 个字符`
  if (/[\n\r]/.test(s)) return '自定义分隔符不能包含换行'
  return null
}

/**
 * 按分隔符生成导出文本（UTF-8 BOM 前置，Excel 友好）
 *
 * 转义策略：值中包含分隔串、双引号或换行时整体加双引号；内部双引号翻倍。
 * 分隔串长度可为 1-3，逐个字符判断包含关系。
 */
export function buildDelimitedText(
  cols: Array<{ title: string; dataIndex: string }>,
  data: Array<Record<string, string | number>>,
  delimiter: string
): string {
  const delim = delimiter || ','
  const needQuote = (s: string) =>
    s.includes('"') || s.includes('\n') || s.includes('\r') || (delim.length === 1 ? s.includes(delim) : delim.split('').some(ch => s.includes(ch)))
  const esc = (raw: string) => {
    const s = String(raw ?? '')
    return needQuote(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const header = cols.map(c => esc(c.title)).join(delim)
  const lines = data.map(r => cols.map(c => esc(r[c.dataIndex] ?? '')).join(delim))
  return '\uFEFF' + [header, ...lines].join('\n')
}
