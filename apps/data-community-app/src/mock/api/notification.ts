// Notification Mock API
// 2026-09 P4 重构：响应式化 + 逐条已读态 + localStorage 持久化，
// 供 table-catalog-store / permission-store 的 notify() 与 MainLayout 铃铛、通知中心页共同消费。

import { ref, computed, watch } from 'vue'

interface NotificationItem {
  id: string
  title: string
  content: string
  category: string
  categoryId?: string
  priority: 'high' | 'medium' | 'low'
  status: 'published' | 'draft' | 'expired' | 'archived'
  publishTime: string
  expireTime: string
  source: string
  createdBy: string
  createdAt: string
  updatedAt: string
  targetUsers: string
  attachments: any[]
  readCount: number
  viewCount: number
  important: boolean
  isTop: boolean
  read: boolean
  category_color?: string
}

interface OperationLog {
  id: string
  operator: string
  operation: string
  action: string
  time: string
  operatedAt: string
  detail: string
}

interface Category {
  id: string
  name: string
  description: string
  color: string
  notificationCount: number
  createTime: string
}

const LS_KEY = 'dca-notification-v1'

const seedNotifications: NotificationItem[] = [
  {
    id: '1',
    title: '系统维护通知',
    content: '本系统将于本周六凌晨2:00-6:00进行例行维护升级，期间服务可能不可用。',
    category: '系统通知',
    categoryId: 'CAT001',
    priority: 'high',
    status: 'published',
    publishTime: '2025-01-15 09:00:00',
    expireTime: '2025-01-20 23:59:59',
    source: '运维团队',
    createdBy: '管理员',
    createdAt: '2025-01-15 08:00:00',
    updatedAt: '2025-01-15 09:00:00',
    targetUsers: '全体用户',
    attachments: [],
    readCount: 1280,
    viewCount: 1280,
    important: true,
    isTop: true,
    read: false
  },
  {
    id: '2',
    title: '数据治理周报',
    content: '本周新增数据资产 12 项，完成质量检核 35 项，指标合格率 96.8%。',
    category: '数据治理',
    categoryId: 'CAT002',
    priority: 'medium',
    status: 'published',
    publishTime: '2025-01-14 18:00:00',
    expireTime: '2025-01-21 23:59:59',
    source: '数据治理团队',
    createdBy: '数据治理员',
    createdAt: '2025-01-14 17:00:00',
    updatedAt: '2025-01-14 18:00:00',
    targetUsers: '数据管理员',
    attachments: [],
    readCount: 86,
    viewCount: 86,
    important: false,
    isTop: false,
    read: true
  },
  {
    id: '3',
    title: '新增指标上架审批通过',
    content: '您提交的指标「客户授信通过率」已通过审批并成功上架。',
    category: '审批通知',
    categoryId: 'CAT003',
    priority: 'low',
    status: 'published',
    publishTime: '2025-01-13 14:30:00',
    expireTime: '2025-02-13 23:59:59',
    source: '审批系统',
    createdBy: '审批系统',
    createdAt: '2025-01-13 14:00:00',
    updatedAt: '2025-01-13 14:30:00',
    targetUsers: '张三',
    attachments: [],
    readCount: 1,
    viewCount: 1,
    important: false,
    isTop: false,
    read: false
  }
]

function loadNotifications(): NotificationItem[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length) return parsed
    }
  } catch { /* corrupt json ignore */ }
  return seedNotifications.map(n => ({ ...n }))
}

const notifications = ref<NotificationItem[]>(loadNotifications())

watch(notifications, (list) => {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(list))
  } catch { /* quota ignore */ }
}, { deep: true })

const operationLogs: OperationLog[] = [
  { id: 'LOG001', operator: '管理员', operation: '创建', action: 'create', time: '2025-01-15 09:00:00', operatedAt: '2025-01-15 09:00:00', detail: '创建通知' },
  { id: 'LOG002', operator: '管理员', operation: '发布', action: 'publish', time: '2025-01-15 09:05:00', operatedAt: '2025-01-15 09:05:00', detail: '发布通知' },
  { id: 'LOG003', operator: '张三', operation: '标记重要', action: 'update', time: '2025-01-15 10:00:00', operatedAt: '2025-01-15 10:00:00', detail: '标记为重要通知' }
]

const categories: Category[] = [
  { id: 'CAT001', name: '系统通知', description: '系统维护、升级等相关通知', color: 'blue', notificationCount: 12, createTime: '2025-01-01 00:00:00' },
  { id: 'CAT002', name: '数据治理', description: '数据治理相关周报与报告', color: 'green', notificationCount: 8, createTime: '2025-01-02 00:00:00' },
  { id: 'CAT003', name: '审批通知', description: '审批流程相关通知', color: 'orange', notificationCount: 25, createTime: '2025-01-03 00:00:00' },
  { id: 'CAT004', name: '安全告警', description: '安全风险与告警通知', color: 'red', notificationCount: 3, createTime: '2025-01-04 00:00:00' }
]

// ── 响应式派生：铃铛未读数 / 分类未读数（MainLayout 与通知中心页共用）──

/** 未读总数（仅统计已发布通知） */
export const notificationUnread$ = computed(
  () => notifications.value.filter(n => n.status === 'published' && !n.read).length
)

/** 按分类的未读数映射：{ CAT001: 2, ... } */
export const notificationUnreadByCategory$ = computed(() => {
  const map: Record<string, number> = {}
  for (const n of notifications.value) {
    if (n.status !== 'published' || n.read) continue
    const key = n.categoryId || n.category
    map[key] = (map[key] || 0) + 1
  }
  return map
})

export const NotificationAPI = {
  async getNotifications(params: any = {}) {
    const { page = 1, pageSize = 10, category, status, keyword } = params
    let list = [...notifications.value]
    if (category) list = list.filter(n => n.categoryId === category || n.category === category)
    if (status) list = list.filter(n => n.status === status)
    if (keyword) list = list.filter(n => n.title.includes(keyword) || n.content.includes(keyword))
    const total = list.length
    const start = (page - 1) * pageSize
    const pageList = list.slice(start, start + pageSize)
    return { success: true, data: { list: pageList, total } }
  },

  async getNotification(id: string) {
    const item = notifications.value.find(n => n.id === id || n.id === String(id))
    return { success: true, data: item || notifications.value[0] }
  },

  async createNotification(data: any) {
    const ts = new Date().toISOString().replace('T', ' ').slice(0, 19)
    const item: NotificationItem = {
      attachments: [], readCount: 0, viewCount: 0, read: false,
      createdAt: ts, updatedAt: ts,
      ...data,
      id: `n${Date.now()}`
    }
    notifications.value.unshift(item)
    return { success: true, data: item }
  },

  async updateNotification(id: string, data: any) {
    const idx = notifications.value.findIndex(n => n.id === id || n.id === String(id))
    if (idx > -1) Object.assign(notifications.value[idx], data, { updatedAt: new Date().toISOString() })
    return { success: true, data: notifications.value[idx] }
  },

  async deleteNotification(id: string) {
    const idx = notifications.value.findIndex(n => n.id === id || n.id === String(id))
    if (idx > -1) notifications.value.splice(idx, 1)
    return { success: true }
  },

  /** 标记单条已读 */
  markRead(id: string) {
    const item = notifications.value.find(n => n.id === id)
    if (item && !item.read) {
      item.read = true
      item.readCount += 1
    }
  },

  /** 全部标记已读（仅已发布） */
  markAllRead() {
    notifications.value.forEach(n => {
      if (n.status === 'published' && !n.read) {
        n.read = true
        n.readCount += 1
      }
    })
  },

  /** 未读总数（同步取值便捷方法） */
  unreadTotal() {
    return notificationUnread$.value
  }
}

export const OperationLogAPI = {
  async getOperationLogs(id: string) {
    return { success: true, data: { list: operationLogs } }
  }
}

export const CategoryAPI = {
  async getCategories() {
    return { success: true, data: categories }
  },

  async createCategory(data: any) {
    const item = { ...data, id: `CAT${String(categories.length + 1).padStart(3, '0')}`, notificationCount: 0, createTime: new Date().toISOString() }
    categories.push(item)
    return { success: true, data: item }
  },

  async updateCategory(id: string, data: any) {
    const idx = categories.findIndex(c => c.id === id)
    if (idx > -1) Object.assign(categories[idx], data)
    return { success: true, data: categories[idx] }
  },

  async deleteCategory(id: string) {
    const idx = categories.findIndex(c => c.id === id)
    if (idx > -1) categories.splice(idx, 1)
    return { success: true }
  }
}

export default { NotificationAPI, OperationLogAPI, CategoryAPI }
