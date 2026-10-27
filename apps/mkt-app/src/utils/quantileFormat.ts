/**
 * 分位统计数值格式化工具（需求模块 E）
 * 规则：
 *   - R57-2 数值按标签原始单位展示，保留两位小数；单位缺失时展示「—」
 *   - 人数类指标使用千分位整数
 *   - 占比保留一位小数
 */

/** 数值保留小数位（R57-2） */
const VALUE_DIGITS = 2
/** 占比保留小数位 */
const RATE_DIGITS = 1

/**
 * 格式化分位/均值等数值
 * @param value 数值
 * @param unit 标签单位，'—' 或空值表示单位元数据缺失
 * @returns 带千分位与两位小数的字符串
 */
export function formatQuantileValue(value: number, unit?: string): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  const text = value.toLocaleString('zh-CN', {
    minimumFractionDigits: VALUE_DIGITS,
    maximumFractionDigits: VALUE_DIGITS
  })
  if (!unit || unit === '—') return text
  return `${text} ${unit}`
}

/**
 * 格式化人数（千分位整数）
 * @param value 人数
 * @returns 千分位字符串；非法值返回 '—'
 */
export function formatCount(value: number): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return Math.round(value).toLocaleString('zh-CN')
}

/**
 * 格式化占比
 * @param value 占比数值（0~1）
 * @param digits 小数位，默认一位
 * @returns 百分比字符串
 */
export function formatRate(value: number, digits = RATE_DIGITS): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return `${(value * 100).toFixed(digits)}%`
}

/**
 * 格式化变动量（带正负号）
 * @param value 变动量
 * @param unit 标签单位
 * @returns 带符号的字符串
 */
export function formatDelta(value: number, unit?: string): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  const abs = Math.abs(value)
  const text = abs.toLocaleString('zh-CN', {
    minimumFractionDigits: VALUE_DIGITS,
    maximumFractionDigits: VALUE_DIGITS
  })
  if (!unit || unit === '—') return `${sign}${text}`
  return `${sign}${text} ${unit}`
}

/**
 * 格式化人数变动量（带正负号）
 * @param value 变动量
 * @returns 带符号的千分位字符串
 */
export function formatCountDelta(value: number): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  return `${sign}${Math.abs(Math.round(value)).toLocaleString('zh-CN')}`
}

/**
 * 计算相对变动比例
 * @param base 基期值
 * @param delta 变动量
 * @returns 相对变动比例（0.1 表示 10%）；基期为 0 时返回 NaN
 */
export function relativeChange(base: number, delta: number): number {
  if (!base || Number.isNaN(base) || Number.isNaN(delta)) return NaN
  return delta / base
}
