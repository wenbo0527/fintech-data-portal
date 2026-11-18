const pad = (n: number) => String(n).padStart(2, '0')

/** 按 pattern 格式化日期 */
export function format(date: string | Date | number, pattern = 'YYYY-MM-DD HH:mm'): string {
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  return pattern
    .replace('YYYY', String(d.getFullYear()))
    .replace('MM', pad(d.getMonth() + 1))
    .replace('DD', pad(d.getDate()))
    .replace('HH', pad(d.getHours()))
    .replace('mm', pad(d.getMinutes()))
    .replace('ss', pad(d.getSeconds()))
}

export function formatDateTime(date: string | Date | number, pattern = 'YYYY-MM-DD HH:mm:ss'): string {
  return format(date, pattern)
}

/** 相对时间：今天 HH:mm / 昨天 HH:mm / MM-DD HH:mm */
export function smartFormat(date: string | Date | number): string {
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  const now = new Date()
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  if (sameDay) return `今天 ${pad(d.getHours())}:${pad(d.getMinutes())}`

  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const isYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate()
  if (isYesterday) return `昨天 ${pad(d.getHours())}:${pad(d.getMinutes())}`

  return format(d, 'MM-DD HH:mm')
}

export default { format, formatDateTime, smartFormat }