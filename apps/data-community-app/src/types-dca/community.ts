/**
 * 社区资源管理系统 - 数据类型定义
 */

// 社区资源分类枚举
export enum ResourceCategory {
  POLICY = 'policy',           // 政策制度
  CASES = 'cases',            // 实践案例
  GUIDE = 'guide',            // 操作指南
  NEWS = 'news'               // 社区动态
}

// 通知类型枚举
export enum NotificationType {
  ANNOUNCEMENT = 'announcement',  // 公告通知
  ACTIVITY = 'activity',         // 活动资讯
  UPDATE = 'update',             // 更新日志
  POLICY_NOTICE = 'policy_notice', // 政策通知
  DATA_SERVICE = 'data_service',  // 数据服务
  GENERAL = 'general',            // 普通通知
  PRODUCT_NEWS = 'product_news',  // 产品消息
  TENCENT_CLOUD_DYNAMIC = 'tencent_cloud_dynamic', // 腾讯云动态
  PERSONNEL_DYNAMIC = 'personnel_dynamic' // 人事动态
}

// 数据资产选项
export const DATA_ASSET_OPTIONS = [
  { label: '用户行为表 (ods_user_action)', value: 'table_users' },
  { label: '订单明细表 (dwd_order_detail)', value: 'table_orders' },
  { label: '用户画像 API', value: 'api_user_profile' },
  { label: '销售实时大屏', value: 'dashboard_sales' },
  { label: '用户流失预测模型', value: 'model_churn' }
]

// 文档状态枚举
export enum DocumentStatus {
  DRAFT = 'draft',      // 草稿
  PUBLISHED = 'published', // 已发布
  ARCHIVED = 'archived'    // 已归档
}

// 用户角色枚举
export enum UserRole {
  ADMIN = 'admin',           // 系统管理员
  CONTENT_EDITOR = 'content_editor', // 内容编辑员
  USER = 'user'              // 普通用户
}

// 用户组接口
export interface UserGroup {
  id: string
  name: string
  notificationTypes: NotificationType[] // 适用通知类型
  creatorId: string
  creatorName: string
  memberCount: number
  members: string[] // 用户 ID 列表
  remark: string
  createdAt: string
  updatedAt: string
}

// 基础实体接口
export interface BaseEntity {
  id: string
  createdAt: string
  updatedAt: string
  createdBy: string
  updatedBy?: string
}

// 社区资源分类接口
export interface ResourceCategoryModel extends BaseEntity {
  name: string
  code: ResourceCategory
  description: string
  parentId?: string
  sortOrder: number
  isActive: boolean
  icon?: string
}

// 树节点接口
export interface TreeNode extends BaseEntity {
  title: string
  key: string
  parentId?: string
  categoryId: string
  sortOrder: number
  isLeaf: boolean
  count?: number
  icon?: string
  children?: TreeNode[]
}

// 文档接口
export interface Document extends BaseEntity {
  title: string
  description: string
  content?: string
  fileName?: string
  fileUrl?: string
  fileSize?: string
  mimeType?: string
  categoryId: string
  treeNodeId?: string
  author: string
  publishTime?: string
  status: DocumentStatus
  views: number
  downloads: number
  tags?: string[]
  metadata?: Record<string, any>
}

// 通知接口
export interface Notification extends BaseEntity {
  title: string
  content: string
  summary?: string
  categoryId: string
  type: NotificationType
  status: DocumentStatus
  publishTime?: string
  expireTime?: string
  author: string
  views: number
  isSticky: boolean
  attachments?: NotificationAttachment[]
  targetAudience?: string[]
  tags?: string[]
  dataAssets?: string[]
  serviceType?: string
  targetTable?: string
}

// 通知附件接口
export interface NotificationAttachment extends BaseEntity {
  notificationId: string
  fileName: string
  fileUrl: string
  fileSize: string
  mimeType: string
  description?: string
}

// 用户接口
export interface User extends BaseEntity {
  username: string
  email: string
  displayName: string
  avatar?: string
  role: UserRole
  isActive: boolean
  lastLoginAt?: string
}

// 操作日志接口
export interface OperationLog extends BaseEntity {
  userId: string
  action: string
  resourceType: string
  resourceId: string
  details?: Record<string, any>
  ipAddress?: string
  userAgent?: string
}

// API 响应接口
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  code?: string
  timestamp: string
}

// 分页参数接口
export interface PaginationParams {
  page: number
  pageSize: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// 分页响应接口
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// 查询参数接口
export interface QueryParams extends PaginationParams {
  keyword?: string
  categoryId?: string
  status?: DocumentStatus
  startDate?: string
  endDate?: string
  tags?: string[]
}

// 树形数据查询参数
export interface TreeQueryParams {
  categoryId?: string
  parentId?: string
  includeCount?: boolean
}

// 统计数据接口
export interface CategoryStats {
  categoryId: string
  categoryName: string
  documentCount: number
  notificationCount: number
  totalViews: number
  recentUpdates: number
}

// 首页统计接口
export interface HomeStats {
  totalDocuments: number
  totalNotifications: number
  totalViews: number
  categoryStats: CategoryStats[]
  recentDocuments: Document[]
  recentNotifications: Notification[]
}