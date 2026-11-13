/**
 * 数据库账号管理 · 展示与复制工具
 *
 * 供页面壳、权限面板、访问 Key 面板共用;全部为纯前端演示逻辑。
 */
import { Message } from '@arco-design/web-vue'
import { DATASOURCE_LABEL } from '@/mock/unified-query/database'
import type { DbAccountGrant, DbAccountStatus, DataSourceKey } from '@/mock/unified-query/types'

export const dsLabel = (ds: DataSourceKey) => DATASOURCE_LABEL[ds]

/** 授权范围展示:集群 · 库1、库2 */
export function scopeText(grant: DbAccountGrant | null): string {
  if (!grant) return '—'
  return `${grant.cluster} · ${grant.databases.join('、')}`
}

/** 剩余天数;已过期返回负数(按自然日计算,避免当天取整多出 1 天) */
export function daysLeft(date: string): number {
  const target = new Date(`${date}T00:00:00`).getTime()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((target - today.getTime()) / 86400000)
}

/** SecretKey 掩码:dcs_•••••••• + 末 4 位 */
export function maskSecret(secret: string): string {
  return `dcs_${'•'.repeat(8)}${secret.slice(-4)}`
}

/** `2026-03-01 09:20:00` → 日期部分,用于两行展示避免折行 */
export function dateOf(datetime: string | undefined): string {
  if (!datetime) return '—'
  return datetime.split(' ')[0]
}

/** `2026-03-01 09:20:00` → 时间部分 */
export function timeOf(datetime: string | undefined): string {
  if (!datetime) return ''
  return datetime.split(' ')[1] ?? ''
}

/** 已驳回 / 已释放 / 未开通 可重新申请 */
export function canApply(grant: DbAccountGrant | null): boolean {
  return !grant || ['rejected', 'revoked'].includes(grant.status)
}

/** 概览卡片色调 */
export function toneOf(status: DbAccountStatus): string {
  if (status === 'active') return 'ok'
  if (status === 'applying') return 'warn'
  if (status === 'rejected') return 'danger'
  return 'muted'
}

/** 复制文本:优先 Clipboard API,不可用时回退 textarea */
export async function copyText(text: string, label: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
    } else {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    Message.success(`${label}已复制`)
  } catch {
    Message.error('复制失败,请手动选择复制')
  }
}