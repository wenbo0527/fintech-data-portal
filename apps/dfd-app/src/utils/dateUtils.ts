import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'

// 配置dayjs
dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

/**
 * 日期工具类
 * 提供统一的日期格式化和处理功能
 */
export class DateUtils {
  /**
   * 格式化日期
   */
  static formatDate(date: string | Date, format = 'YYYY-MM-DD'): string {
    if (!date) return ''
    return dayjs(date).format(format)
  }

  /**
   * 格式化日期时间
   */
  static formatDateTime(date: string | Date | null | undefined, format = 'YYYY-MM-DD HH:mm:ss'): string {
    if (!date) return ''
    return dayjs(date).format(format)
  }

  /**
   * 格式化时间
   */
  static formatTime(date: string | Date, format = 'HH:mm:ss'): string {
    if (!date) return ''
    return dayjs(date).format(format)
  }

  /**
   * 获取相对时间
   */
  static getRelativeTime(date: string | Date): string {
    if (!date) return ''
    return dayjs(date).fromNow()
  }

  /**
   * 计算时间差（天数）
   */
  static getDaysDiff(startDate: string | Date, endDate: string | Date): number {
    if (!startDate || !endDate) return 0
    return dayjs(endDate).diff(dayjs(startDate), 'day')
  }

  /**
   * 计算时间差（小时）
   */
  static getHoursDiff(startDate: string | Date, endDate: string | Date): number {
    if (!startDate || !endDate) return 0
    return dayjs(endDate).diff(dayjs(startDate), 'hour')
  }

  /**
   * 计算时间差（分钟）
   */
  static getMinutesDiff(startDate: string | Date, endDate: string | Date): number {
    if (!startDate || !endDate) return 0
    return dayjs(endDate).diff(dayjs(startDate), 'minute')
  }

  /**
   * 判断是否为今天
   */
  static isToday(date: string | Date): boolean {
    if (!date) return false
    return dayjs(date).isSame(dayjs(), 'day')
  }

  /**
   * 判断是否为昨天
   */
  static isYesterday(date: string | Date): boolean {
    if (!date) return false
    return dayjs(date).isSame(dayjs().subtract(1, 'day'), 'day')
  }

  /**
   * 判断是否为本周
   */
  static isThisWeek(date: string | Date): boolean {
    if (!date) return false
    return dayjs(date).isSame(dayjs(), 'week')
  }

  /**
   * 判断是否为本月
   */
  static isThisMonth(date: string | Date): boolean {
    if (!date) return false
    return dayjs(date).isSame(dayjs(), 'month')
  }

  /**
   * 判断是否为本年
   */
  static isThisYear(date: string | Date): boolean {
    if (!date) return false
    return dayjs(date).isSame(dayjs(), 'year')
  }

  /**
   * 获取日期范围
   */
  static getDateRange(startDate: string | Date, endDate: string | Date): string {
    if (!startDate || !endDate) return ''
    const start = dayjs(startDate).format('YYYY-MM-DD')
    const end = dayjs(endDate).format('YYYY-MM-DD')
    return `${start} 至 ${end}`
  }

  /**
   * 获取月份的第一天
   */
  static getMonthStart(date: string | Date = new Date()): string {
    return dayjs(date).startOf('month').format('YYYY-MM-DD')
  }

  /**
   * 获取月份的最后一天
   */
  static getMonthEnd(date: string | Date = new Date()): string {
    return dayjs(date).endOf('month').format('YYYY-MM-DD')
  }

  /**
   * 获取年份的第一天
   */
  static getYearStart(date: string | Date = new Date()): string {
    return dayjs(date).startOf('year').format('YYYY-MM-DD')
  }

  /**
   * 获取年份的最后一天
   */
  static getYearEnd(date: string | Date = new Date()): string {
    return dayjs(date).endOf('year').format('YYYY-MM-DD')
  }

  /**
   * 添加时间
   */
  static addTime(date: string | Date, amount: number, unit: 'day' | 'month' | 'year' | 'hour' | 'minute' = 'day'): string {
    return dayjs(date).add(amount, unit).format('YYYY-MM-DD HH:mm:ss')
  }

  /**
   * 减少时间
   */
  static subtractTime(date: string | Date, amount: number, unit: 'day' | 'month' | 'year' | 'hour' | 'minute' = 'day'): string {
    return dayjs(date).subtract(amount, unit).format('YYYY-MM-DD HH:mm:ss')
  }

  /**
   * 验证日期格式
   */
  static isValidDate(date: string | Date): boolean {
    return dayjs(date).isValid()
  }

  /**
   * 获取时间戳
   */
  static getTimestamp(date: string | Date = new Date()): number {
    return dayjs(date).valueOf()
  }

  /**
   * 从时间戳创建日期
   */
  static fromTimestamp(timestamp: number, format = 'YYYY-MM-DD HH:mm:ss'): string {
    return dayjs(timestamp).format(format)
  }

  /**
   * 智能格式化日期
   * 根据时间距离现在的长短选择合适的显示格式
   */
  static smartFormat(date: string | Date | null | undefined): string {
    if (!date) return ''
    
    const now = dayjs()
    const target = dayjs(date)
    const diffMinutes = now.diff(target, 'minute')
    const diffHours = now.diff(target, 'hour')
    const diffDays = now.diff(target, 'day')
    
    if (diffMinutes < 1) {
      return '刚刚'
    } else if (diffMinutes < 60) {
      return `${diffMinutes}分钟前`
    } else if (diffHours < 24) {
      return `${diffHours}小时前`
    } else if (diffDays < 7) {
      return `${diffDays}天前`
    } else if (target.isSame(now, 'year')) {
      return target.format('MM-DD HH:mm')
    } else {
      return target.format('YYYY-MM-DD')
    }
  }
}

export default DateUtils

// 独立导出函数，兼容解构导入 { formatDateTime } 用法
export function formatDateTime(date: string | Date | null | undefined, format = 'YYYY-MM-DD HH:mm:ss'): string {
  return DateUtils.formatDateTime(date, format)
}

export function formatDate(date: string | Date, format = 'YYYY-MM-DD'): string {
  return DateUtils.formatDate(date, format)
}

export function formatTime(date: string | Date, format = 'HH:mm:ss'): string {
  return DateUtils.formatTime(date, format)
}

export function getRelativeTime(date: string | Date): string {
  return DateUtils.getRelativeTime(date)
}

export function smartFormat(date: string | Date): string {
  return DateUtils.smartFormat(date)
}