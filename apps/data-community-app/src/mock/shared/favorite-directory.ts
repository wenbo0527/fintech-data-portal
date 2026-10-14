/**
 * 收藏 Directory —— DCA 端副本
 *
 * 用户的资产收藏 / 关注 / 订阅
 * 跨模块(发现/管理/探索)共享,支持:
 *   - 收藏类型:表 / 字段 / 指标 / 标签 / 人群 / 看板 / 服务
 *   - 分组(个人/团队)
 *   - 标签
 *   - 备注
 *   - 通知订阅(数据更新通知)
 *
 * TODO: 候选 B HTTP API 替换
 *   - 来源:`apps/dfd-app/src/mock/shared/favorite-directory.ts`(2026-08-11 之前)
 *   - 现状:DCA 端副本(同步维护,数据 100% 等价,仅 6 行 resourcePath DCA 路由差异)
 *   - 长期:把 `FavoriteStore.mutator` + `FAVORITES` 数据源替换为 HTTP API(/api/favorites),
 *     跨包 mock 依赖彻底解耦(候选 B v1.1)
 *
 * 任务:TASK-20260811-CFC1B6FD · 候选 #172 v3.0 C 级 · 2026-08-12 dev 修复
 */

import type { MockMethod } from 'vite-plugin-mock'

export type FavoriteResourceType =
  | 'table'        // 表
  | 'field'        // 字段
  | 'metric'       // 指标
  | 'tag'          // 标签
  | 'audience'     // 人群
  | 'dashboard'    // 看板
  | 'service'      // 服务
  | 'api'          // API
  | 'report'       // 报表
  | 'variable'     // 变量
  | 'feature'      // 特征

export type FavoriteGroup = 'personal' | 'team' | 'shared'

export type FavoriteNotification =
  | 'none'                 // 不通知
  | 'on_change'            // 数据变更时通知
  | 'daily'                // 每日汇总
  | 'weekly'               // 每周汇总

export interface FavoriteItem {
  id: string
  userId: string                // 收藏人
  userName: string
  resourceType: FavoriteResourceType
  resourceId: string            // 资源 ID
  resourceName: string          // 显示名
  resourcePath?: string         // 路由路径
  description?: string
  group: FavoriteGroup
  tags: string[]                // 自定义标签
  notification: FavoriteNotification
  createTime: string
  /** 访问次数 */
  visitCount: number
  /** 最后访问时间 */
  lastVisitTime: string
}

/**
 * 收藏 mock 数据(覆盖 7 种用户 × 8 种资源类型)
 */
export const FAVORITES: FavoriteItem[] = [
  // 王运营(用户运营) — 高频使用客户数据
  { id: 'fav_001', userId: 'user-yunying', userName: '王运营', resourceType: 'table', resourceId: 'dim_user', resourceName: '客户主表', resourcePath: '/discovery/asset-catalog', group: 'team', tags: ['日常使用', '核心'], notification: 'on_change', createTime: '2025-06-15 10:30', visitCount: 145, lastVisitTime: '今天 14:20' },
  { id: 'fav_002', userId: 'user-yunying', userName: '王运营', resourceType: 'audience', resourceId: 'aud_001', resourceName: '高价值活跃用户', resourcePath: '/exploration/customer-center/audience-system/audience-management', group: 'team', tags: ['营销', '活跃'], notification: 'on_change', createTime: '2025-06-20 14:00', visitCount: 89, lastVisitTime: '昨天 16:00' },
  { id: 'fav_003', userId: 'user-yunying', userName: '王运营', resourceType: 'dashboard', resourceId: 'ceo_dashboard', resourceName: 'CEO 经营看板', resourcePath: '/exploration/indicator-dashboard', group: 'personal', tags: ['看板'], notification: 'weekly', createTime: '2025-05-30 09:00', visitCount: 23, lastVisitTime: '3 天前' },
  { id: 'fav_004', userId: 'user-yunying', userName: '王运营', resourceType: 'tag', resourceId: 'tag_026', resourceName: '高价值潜力用户', resourcePath: '/exploration/customer-center/tag-system', group: 'personal', tags: ['标签', '潜力'], notification: 'none', createTime: '2025-07-01 10:00', visitCount: 12, lastVisitTime: '2 天前' },

  // 营销经理(yingxiao)
  { id: 'fav_005', userId: 'user-yingxiao', userName: '营销经理', resourceType: 'metric', resourceId: 'DAU', resourceName: 'DAU 日活', resourcePath: '/discovery/metrics-map', group: 'team', tags: ['核心指标'], notification: 'on_change', createTime: '2025-06-10 14:00', visitCount: 234, lastVisitTime: '今天 15:30' },
  { id: 'fav_006', userId: 'user-yingxiao', userName: '营销经理', resourceType: 'audience', resourceId: 'aud_005', resourceName: '高客单价潜力用户', resourcePath: '/exploration/customer-center/audience-system/audience-management', group: 'team', tags: ['营销', '高价值'], notification: 'daily', createTime: '2025-06-15 11:00', visitCount: 56, lastVisitTime: '今天 09:00' },
  { id: 'fav_007', userId: 'user-yingxiao', userName: '营销经理', resourceType: 'audience', resourceId: 'aud_007', resourceName: '贷款潜力用户', resourcePath: '/exploration/customer-center/audience-system/audience-management', group: 'team', tags: ['贷款', '潜力'], notification: 'daily', createTime: '2025-06-20 14:00', visitCount: 78, lastVisitTime: '昨天 14:00' },

  // 风控值班
  { id: 'fav_008', userId: 'user-fengkong', userName: '风控值班', resourceType: 'audience', resourceId: 'aud_009', resourceName: '严重逾期催收名单', resourcePath: '/exploration/customer-center/audience-system/audience-management', group: 'team', tags: ['催收', '高风险'], notification: 'on_change', createTime: '2025-06-01 09:00', visitCount: 456, lastVisitTime: '今天 08:00' },
  { id: 'fav_009', userId: 'user-fengkong', userName: '风控值班', resourceType: 'table', resourceId: 'dws_risk_score', resourceName: '风险评分表', resourcePath: '/discovery/asset-catalog', group: 'team', tags: ['风险', '核心'], notification: 'on_change', createTime: '2025-06-15 10:00', visitCount: 167, lastVisitTime: '今天 10:00' },
  { id: 'fav_010', userId: 'user-fengkong', userName: '风控值班', resourceType: 'metric', resourceId: 'credit_score', resourceName: '信用评分', resourcePath: '/discovery/metrics-map', group: 'team', tags: ['风险指标'], notification: 'daily', createTime: '2025-06-10 14:00', visitCount: 123, lastVisitTime: '今天 11:00' },

  // 信贷经理
  { id: 'fav_011', userId: 'user-xindai', userName: '信贷经理', resourceType: 'table', resourceId: 'fact_loan_apply', resourceName: '贷款申请表', resourcePath: '/discovery/asset-catalog', group: 'team', tags: ['核心', '信贷'], notification: 'on_change', createTime: '2025-06-20 14:00', visitCount: 312, lastVisitTime: '今天 16:30' },
  { id: 'fav_012', userId: 'user-xindai', userName: '信贷经理', resourceType: 'api', resourceId: 'api_credit_query', resourceName: '客户授信查询 API', resourcePath: '/management/service', group: 'team', tags: ['API', '核心'], notification: 'on_change', createTime: '2025-06-25 14:00', visitCount: 89, lastVisitTime: '今天 09:30' },
  { id: 'fav_013', userId: 'user-xindai', userName: '信贷经理', resourceType: 'service', resourceId: 'credit_query', resourceName: '客户授信查询服务', resourcePath: '/management/service', group: 'team', tags: ['服务'], notification: 'daily', createTime: '2025-06-20 14:00', visitCount: 56, lastVisitTime: '昨天 17:00' },

  // 张三(数据团队)
  { id: 'fav_014', userId: 'user-zhangsan', userName: '张三', resourceType: 'dashboard', resourceId: 'data_overview', resourceName: '数据资产总览', resourcePath: '/exploration/indicator-dashboard', group: 'team', tags: ['总览'], notification: 'daily', createTime: '2025-05-30 09:00', visitCount: 234, lastVisitTime: '今天 09:00' },
  { id: 'fav_015', userId: 'user-zhangsan', userName: '张三', resourceType: 'field', resourceId: 'dim_user.id_card_no', resourceName: '身份证号字段', resourcePath: '/discovery/asset-catalog', group: 'team', tags: ['L3', 'PII'], notification: 'on_change', createTime: '2025-06-15 11:00', visitCount: 56, lastVisitTime: '昨天 14:00' },

  // 赵六(行为数据)
  { id: 'fav_016', userId: 'user-zhaosi', userName: '赵六', resourceType: 'table', resourceId: 'fact_user_event', resourceName: '用户行为事件', resourcePath: '/discovery/asset-catalog', group: 'team', tags: ['行为', '核心'], notification: 'on_change', createTime: '2025-06-25 11:00', visitCount: 189, lastVisitTime: '今天 14:00' },

  // 王五(用户价值)
  { id: 'fav_017', userId: 'user-wangwu', userName: '王五', resourceType: 'table', resourceId: 'dws_user_value', resourceName: '用户价值宽表', resourcePath: '/discovery/asset-catalog', group: 'team', tags: ['价值', 'DWS'], notification: 'on_change', createTime: '2025-06-15 10:00', visitCount: 134, lastVisitTime: '今天 13:00' },

  // 财务主管
  { id: 'fav_018', userId: 'user-caiwu', userName: '财务主管', resourceType: 'report', resourceId: 'monthly_settlement', resourceName: '月度结算报表', resourcePath: '/exploration/indicator-dashboard', group: 'team', tags: ['财务', '定期'], notification: 'weekly', createTime: '2025-06-01 09:00', visitCount: 45, lastVisitTime: '上周' },

  // 产品经理
  { id: 'fav_019', userId: 'user-chanpin', userName: '产品经理', resourceType: 'audience', resourceId: 'aud_017', resourceName: '高学历已婚用户', resourcePath: '/exploration/customer-center/audience-system/audience-management', group: 'personal', tags: ['产品调研'], notification: 'none', createTime: '2025-06-15 11:20', visitCount: 23, lastVisitTime: '5 天前' },

  // 共享收藏(全公司)
  { id: 'fav_020', userId: 'system', userName: '系统', resourceType: 'dashboard', resourceId: 'company_overview', resourceName: '公司经营总览', resourcePath: '/exploration/indicator-dashboard', group: 'shared', tags: ['官方', '必读'], notification: 'weekly', createTime: '2025-01-01 00:00', visitCount: 5678, lastVisitTime: '今天 16:00' }
]

/**
 * 收藏 Store
 */
export const FavoriteStore = {
  list(): FavoriteItem[] {
    return FAVORITES
  },

  /** 按用户查 */
  byUser(userId: string): FavoriteItem[] {
    return FAVORITES.filter(f => f.userId === userId)
  },

  /** 按资源类型 */
  byResourceType(type: FavoriteResourceType): FavoriteItem[] {
    return FAVORITES.filter(f => f.resourceType === type)
  },

  /** 按分组 */
  byGroup(group: FavoriteGroup): FavoriteItem[] {
    return FAVORITES.filter(f => f.group === group)
  },

  /** 按用户 + 分组 */
  byUserGroup(userId: string, group: FavoriteGroup): FavoriteItem[] {
    return FAVORITES.filter(f => f.userId === userId && f.group === group)
  },

  /** 按标签 */
  byTag(tag: string): FavoriteItem[] {
    return FAVORITES.filter(f => f.tags.includes(tag))
  },

  /** 按资源(反查哪些用户收藏了) */
  byResource(type: FavoriteResourceType, resourceId: string): FavoriteItem[] {
    return FAVORITES.filter(f => f.resourceType === type && f.resourceId === resourceId)
  },

  /** 单个查 */
  byId(id: string): FavoriteItem | undefined {
    return FAVORITES.find(f => f.id === id)
  },

  /** 是否已收藏 */
  isFavorited(userId: string, type: FavoriteResourceType, resourceId: string): boolean {
    return FAVORITES.some(f =>
      f.userId === userId && f.resourceType === type && f.resourceId === resourceId
    )
  },

  /** 添加 */
  add(input: Omit<FavoriteItem, 'id' | 'createTime' | 'visitCount'>): FavoriteItem {
    const newItem: FavoriteItem = {
      ...input,
      id: `fav_${Date.now()}`,
      createTime: new Date().toISOString(),
      visitCount: 0,
      lastVisitTime: ''
    }
    FAVORITES.push(newItem)
    return newItem
  },

  /** 取消 */
  remove(id: string): boolean {
    const idx = FAVORITES.findIndex(f => f.id === id)
    if (idx >= 0) {
      FAVORITES.splice(idx, 1)
      return true
    }
    return false
  },

  /** 切换(已收藏则取消,否则添加) */
  toggle(input: Omit<FavoriteItem, 'id' | 'createTime' | 'visitCount' | 'lastVisitTime'>): { item: FavoriteItem; added: boolean } | null {
    const existed = this.isFavorited(input.userId, input.resourceType, input.resourceId)
    if (existed) {
      const target = FAVORITES.find(f =>
        f.userId === input.userId && f.resourceType === input.resourceType && f.resourceId === input.resourceId
      )
      if (target) {
        this.remove(target.id)
        return { item: target, added: false }
      }
    }
    const item = this.add({
      ...input,
      visitCount: 0,
      lastVisitTime: ''
    })
    return { item, added: true }
  },

  /** 记录访问 */
  visit(id: string): void {
    const f = FAVORITES.find(f => f.id === id)
    if (f) {
      f.visitCount++
      f.lastVisitTime = new Date().toLocaleString('zh-CN')
    }
  },

  /** 统计 */
  stats(userId?: string) {
    const list: FavoriteItem[] = userId ? this.byUser(userId) : FAVORITES
    return {
      total: list.length,
      byGroup: {
        personal: list.filter(f => f.group === 'personal').length,
        team: list.filter(f => f.group === 'team').length,
        shared: list.filter(f => f.group === 'shared').length
      },
      byResourceType: {
        table: list.filter(f => f.resourceType === 'table').length,
        field: list.filter(f => f.resourceType === 'field').length,
        metric: list.filter(f => f.resourceType === 'metric').length,
        audience: list.filter(f => f.resourceType === 'audience').length,
        dashboard: list.filter(f => f.resourceType === 'dashboard').length,
        service: list.filter(f => f.resourceType === 'service').length,
        api: list.filter(f => f.resourceType === 'api').length,
        report: list.filter(f => f.resourceType === 'report').length,
        tag: list.filter(f => f.resourceType === 'tag').length
      },
      topFavorites: list
        .sort((a: FavoriteItem, b: FavoriteItem) => b.visitCount - a.visitCount)
        .slice(0, 5)
        .map(f => ({ id: f.id, name: f.resourceName, visitCount: f.visitCount }))
    }
  }
}

/**
 * HTTP Mock 端点
 */
export const favoriteMocks: MockMethod[] = [
  {
    url: '/api/favorites/list',
    method: 'get',
    response: ({ query }: { query: { userId?: string; group?: string; resourceType?: string; tag?: string } }) => {
      let result = FAVORITES
      if (query.userId) result = result.filter(f => f.userId === query.userId)
      if (query.group) result = result.filter(f => f.group === query.group)
      if (query.resourceType) result = result.filter(f => f.resourceType === query.resourceType)
      if (query.tag) result = result.filter(f => f.tags.includes(query.tag!))
      return { code: 0, data: result, total: result.length }
    }
  },
  {
    url: '/api/favorites/stats',
    method: 'get',
    response: ({ query }: { query: { userId?: string } }) => {
      return { code: 0, data: FavoriteStore.stats(query.userId) }
    }
  },
  {
    url: '/api/favorites/check',
    method: 'get',
    response: ({ query }: { query: { userId?: string; resourceType?: string; resourceId?: string } }) => {
      const exists = FavoriteStore.isFavorited(
        query.userId || '',
        (query.resourceType || 'table') as any,
        query.resourceId || ''
      )
      return { code: 0, data: { favorited: exists } }
    }
  },
  {
    url: '/api/favorites/toggle',
    method: 'post',
    response: ({ body }: { body: any }) => {
      const result = FavoriteStore.toggle(body)
      return { code: 0, data: result, message: result?.added ? '已收藏' : '已取消' }
    }
  }
]