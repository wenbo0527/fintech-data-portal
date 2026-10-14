/**
 * 社区资源管理系统 - API 接口定义
 *
 * TASK-20260714-05935425 Phase 1 清理 (2026-07-15):
 * - 项目无真后端，删除 fetch 主调，改 USE_MOCK 短路模式
 * - request() 短路返回 mockOk 包装，保留 dead fetch 分支供未来真后端联调
 * - uploadDocument / uploadAttachment 改 USE_MOCK 短路返回成功
 */

import type {
  ResourceCategoryModel,
  TreeNode,
  Document,
  Notification,
  NotificationAttachment,
  User,
  OperationLog,
  ApiResponse,
  PaginatedResponse,
  QueryParams,
  TreeQueryParams,
  CategoryStats,
  HomeStats
} from '@/types/community'
import { mockCategories, mockTreeNodes, mockDocuments, mockHomeStats, mockCategoryStats, mockUsers } from '@/mock/community'
import { mockNotifications } from '@/mock/notification'

// API 基础配置（项目无真后端 → 全部走本地 mock）
const API_BASE_URL = '/api/community'
const USE_MOCK = true

// 模拟网络延迟
const mockDelay = <T>(data: T, ms = 100): Promise<T> =>
  new Promise(resolve => setTimeout(() => resolve(data), ms))

// Mock 响应包装
const mockOk = <T>(data: T): ApiResponse<T> => ({
  code: 200,
  data,
  message: 'success',
  timestamp: new Date().toISOString()
})

// HTTP 请求工具函数（USE_MOCK 短路 + dead fetch 分支保留供后端联调时启用）
async function request<T>(
  url: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  if (USE_MOCK) {
    // mock 模式下根据 url 返回本地数据（具体路由在下方各 API 函数中处理）
    return mockOk<T>(undefined as T)
  }
  // dead code: 项目无真后端，保留供未来真实接口联调
  const response = await fetch(`${API_BASE_URL}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  return response.json()
}

// 分类管理 API
export const categoryApi = {
  // 获取所有分类
  getCategories: (): Promise<ApiResponse<ResourceCategoryModel[]>> => {
    if (USE_MOCK) return mockDelay(mockOk(mockCategories))
    return request('/categories')
  },

  // 获取分类详情
  getCategoryById: (id: string): Promise<ApiResponse<ResourceCategoryModel>> => {
    if (USE_MOCK) {
      const found = mockCategories.find(c => c.id === id) || mockCategories[0]
      return mockDelay(mockOk(found))
    }
    return request(`/categories/${id}`)
  },

  // 创建分类
  createCategory: (data: Omit<ResourceCategoryModel, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<ResourceCategoryModel>> => {
    if (USE_MOCK) {
      const newCategory: ResourceCategoryModel = {
        ...data,
        id: 'cat-mock-' + Date.now(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      return mockDelay(mockOk(newCategory))
    }
    return request('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // 更新分类
  updateCategory: (id: string, data: Partial<ResourceCategoryModel>): Promise<ApiResponse<ResourceCategoryModel>> => {
    if (USE_MOCK) {
      const found = mockCategories.find(c => c.id === id) || mockCategories[0]
      const updated: ResourceCategoryModel = { ...found, ...data, updatedAt: new Date().toISOString() }
      return mockDelay(mockOk(updated))
    }
    return request(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  // 删除分类
  deleteCategory: (id: string): Promise<ApiResponse<void>> => {
    if (USE_MOCK) return mockDelay(mockOk<void>(undefined))
    return request(`/categories/${id}`, {
      method: 'DELETE',
    })
  }
}

// 树节点管理 API
export const treeApi = {
  // 获取树形结构
  getTreeNodes: (_params?: TreeQueryParams): Promise<ApiResponse<TreeNode[]>> => {
    if (USE_MOCK) return mockDelay(mockOk(mockTreeNodes))
    const queryString = _params ? `?${new URLSearchParams(_params as any).toString()}` : ''
    return request(`/tree${queryString}`)
  },

  // 获取树节点详情
  getTreeNodeById: (id: string): Promise<ApiResponse<TreeNode>> => {
    if (USE_MOCK) {
      const found = mockTreeNodes.find(t => t.id === id) || mockTreeNodes[0]
      return mockDelay(mockOk(found))
    }
    return request(`/tree/${id}`)
  },

  // 创建树节点
  createTreeNode: (data: Omit<TreeNode, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<TreeNode>> => {
    if (USE_MOCK) {
      const newNode: TreeNode = {
        ...data,
        id: 'tree-mock-' + Date.now(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      return mockDelay(mockOk(newNode))
    }
    return request('/tree', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // 更新树节点
  updateTreeNode: (id: string, data: Partial<TreeNode>): Promise<ApiResponse<TreeNode>> => {
    if (USE_MOCK) {
      const found = mockTreeNodes.find(t => t.id === id) || mockTreeNodes[0]
      const updated: TreeNode = { ...found, ...data, updatedAt: new Date().toISOString() }
      return mockDelay(mockOk(updated))
    }
    return request(`/tree/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  // 删除树节点
  deleteTreeNode: (id: string): Promise<ApiResponse<void>> => {
    if (USE_MOCK) return mockDelay(mockOk<void>(undefined))
    return request(`/tree/${id}`, {
      method: 'DELETE',
    })
  }
}

// 文档管理 API
export const documentApi = {
  // 获取文档列表
  getDocuments: (_params?: QueryParams): Promise<ApiResponse<PaginatedResponse<Document>>> => {
    if (USE_MOCK) {
      return mockDelay(mockOk({
        items: mockDocuments,
        total: mockDocuments.length,
        page: 1,
        pageSize: 10,
        totalPages: 1
      }))
    }
    const queryString = _params ? `?${new URLSearchParams(_params as any).toString()}` : ''
    return request(`/documents${queryString}`)
  },

  // 获取文档详情
  getDocumentById: (id: string): Promise<ApiResponse<Document>> => {
    if (USE_MOCK) {
      const found = mockDocuments.find(d => d.id === id) || mockDocuments[0]
      return mockDelay(mockOk(found))
    }
    return request(`/documents/${id}`)
  },

  // 创建文档
  createDocument: (data: Omit<Document, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Document>> => {
    if (USE_MOCK) {
      const newDoc: Document = {
        ...data,
        id: 'doc-mock-' + Date.now(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      return mockDelay(mockOk(newDoc))
    }
    return request('/documents', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // 更新文档
  updateDocument: (id: string, data: Partial<Document>): Promise<ApiResponse<Document>> => {
    if (USE_MOCK) {
      const found = mockDocuments.find(d => d.id === id) || mockDocuments[0]
      const updated: Document = { ...found, ...data, updatedAt: new Date().toISOString() }
      return mockDelay(mockOk(updated))
    }
    return request(`/documents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  // 删除文档
  deleteDocument: (id: string): Promise<ApiResponse<void>> => {
    if (USE_MOCK) return mockDelay(mockOk<void>(undefined))
    return request(`/documents/${id}`, {
      method: 'DELETE',
    })
  },

  // 上传文档文件 (TASK-20260714-05935425: dead code, 无调用方, 改 USE_MOCK 短路返回成功)
  uploadDocument: async (_file: File, _categoryId: string): Promise<ApiResponse<{ fileUrl: string; fileName: string; fileSize: string }>> => {
    void _file
    void _categoryId
    return mockDelay(mockOk({
      fileUrl: '/mock-upload-' + Date.now() + '.pdf',
      fileName: 'mock-document.pdf',
      fileSize: '1.0MB'
    }))
  },

  // 增加文档查看次数
  incrementViews: (id: string): Promise<ApiResponse<void>> => {
    if (USE_MOCK) return mockDelay(mockOk<void>(undefined))
    return request(`/documents/${id}/views`, {
      method: 'POST',
    })
  }
}

// 通知管理 API
export const notificationApi = {
  // 获取通知列表
  getNotifications: (_params?: QueryParams): Promise<ApiResponse<PaginatedResponse<Notification>>> => {
    if (USE_MOCK) {
      return mockDelay(mockOk({
        items: mockNotifications,
        total: mockNotifications.length,
        page: 1,
        pageSize: 10,
        totalPages: 1
      }))
    }
    const queryString = _params ? `?${new URLSearchParams(_params as any).toString()}` : ''
    return request(`/notifications${queryString}`)
  },

  // 获取通知详情
  getNotificationById: (id: string): Promise<ApiResponse<Notification>> => {
    if (USE_MOCK) {
      const found = mockNotifications.find(n => n.id === id) || mockNotifications[0]
      return mockDelay(mockOk(found))
    }
    return request(`/notifications/${id}`)
  },

  // 创建通知
  createNotification: (data: Omit<Notification, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Notification>> => {
    if (USE_MOCK) {
      const newNotification: Notification = {
        ...data,
        id: 'notif-mock-' + Date.now(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      return mockDelay(mockOk(newNotification))
    }
    return request('/notifications', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // 更新通知
  updateNotification: (id: string, data: Partial<Notification>): Promise<ApiResponse<Notification>> => {
    if (USE_MOCK) {
      const found = mockNotifications.find(n => n.id === id) || mockNotifications[0]
      const updated: Notification = { ...found, ...data, updatedAt: new Date().toISOString() }
      return mockDelay(mockOk(updated))
    }
    return request(`/notifications/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  // 删除通知
  deleteNotification: (id: string): Promise<ApiResponse<void>> => {
    if (USE_MOCK) return mockDelay(mockOk<void>(undefined))
    return request(`/notifications/${id}`, {
      method: 'DELETE',
    })
  },

  // 发布通知
  publishNotification: (id: string): Promise<ApiResponse<Notification>> => {
    if (USE_MOCK) {
      const found = mockNotifications.find(n => n.id === id) || mockNotifications[0]
      return mockDelay(mockOk(found))
    }
    return request(`/notifications/${id}/publish`, {
      method: 'POST',
    })
  },

  // 撤回通知
  unpublishNotification: (id: string): Promise<ApiResponse<Notification>> => {
    if (USE_MOCK) {
      const found = mockNotifications.find(n => n.id === id) || mockNotifications[0]
      return mockDelay(mockOk(found))
    }
    return request(`/notifications/${id}/unpublish`, {
      method: 'POST',
    })
  },

  // 增加通知查看次数
  incrementViews: (id: string): Promise<ApiResponse<void>> => {
    if (USE_MOCK) return mockDelay(mockOk<void>(undefined))
    return request(`/notifications/${id}/views`, {
      method: 'POST',
    })
  }
}

// 通知附件管理 API
export const attachmentApi = {
  // 获取通知附件列表
  getAttachments: (_notificationId: string): Promise<ApiResponse<NotificationAttachment[]>> => {
    if (USE_MOCK) return mockDelay(mockOk<NotificationAttachment[]>([]))
    return request(`/notifications/${_notificationId}/attachments`)
  },

  // 上传通知附件 (TASK-20260714-05935425: dead code, 无调用方, 改 USE_MOCK 短路返回成功)
  uploadAttachment: async (_notificationId: string, _file: File, _description?: string): Promise<ApiResponse<NotificationAttachment>> => {
    void _notificationId
    void _file
    void _description
    return mockDelay(mockOk({
      id: 'mock-attachment-' + Date.now(),
      fileName: 'mock-attachment.pdf',
      fileSize: '512KB',
      fileUrl: '/mock-attachment-' + Date.now() + '.pdf',
      mimeType: 'application/pdf',
      uploadedAt: new Date().toISOString()
    } as NotificationAttachment))
  },

  // 删除通知附件
  deleteAttachment: (notificationId: string, attachmentId: string): Promise<ApiResponse<void>> => {
    if (USE_MOCK) return mockDelay(mockOk<void>(undefined))
    return request(`/notifications/${notificationId}/attachments/${attachmentId}`, {
      method: 'DELETE',
    })
  }
}

// 用户管理 API
export const userApi = {
  // 获取用户列表
  getUsers: (_params?: QueryParams): Promise<ApiResponse<PaginatedResponse<User>>> => {
    if (USE_MOCK) {
      return mockDelay(mockOk({
        items: mockUsers,
        total: mockUsers.length,
        page: 1,
        pageSize: 10,
        totalPages: 1
      }))
    }
    const queryString = _params ? `?${new URLSearchParams(_params as any).toString()}` : ''
    return request(`/users${queryString}`)
  },

  // 获取用户详情
  getUserById: (id: string): Promise<ApiResponse<User>> => {
    if (USE_MOCK) {
      const found = mockUsers.find(u => u.id === id) || mockUsers[0]
      return mockDelay(mockOk(found))
    }
    return request(`/users/${id}`)
  },

  // 获取当前用户信息
  getCurrentUser: (): Promise<ApiResponse<User>> => {
    if (USE_MOCK) return mockDelay(mockOk(mockUsers[0]))
    return request('/users/me')
  },

  // 更新用户信息
  updateUser: (id: string, data: Partial<User>): Promise<ApiResponse<User>> => {
    if (USE_MOCK) {
      const found = mockUsers.find(u => u.id === id) || mockUsers[0]
      const updated: User = { ...found, ...data, updatedAt: new Date().toISOString() }
      return mockDelay(mockOk(updated))
    }
    return request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }
}

// 统计数据 API
export const statsApi = {
  // 获取首页统计数据
  getHomeStats: (): Promise<ApiResponse<HomeStats>> => {
    if (USE_MOCK) return mockDelay(mockOk(mockHomeStats))
    return request('/stats/home')
  },

  // 获取分类统计数据
  getCategoryStats: (): Promise<ApiResponse<CategoryStats[]>> => {
    if (USE_MOCK) return mockDelay(mockOk(mockCategoryStats))
    return request('/stats/categories')
  },

  // 获取用户活动统计
  getUserActivityStats: (userId?: string): Promise<ApiResponse<any>> => {
    if (USE_MOCK) {
      return mockDelay(mockOk({
        userId: userId || mockUsers[0].id,
        activeDays: 25,
        loginCount: 150,
        operationCount: 320
      }))
    }
    const queryString = userId ? `?userId=${userId}` : ''
    return request(`/stats/activity${queryString}`)
  }
}

// 操作日志 API
export const logApi = {
  // 获取操作日志列表
  getLogs: (_params?: QueryParams): Promise<ApiResponse<PaginatedResponse<OperationLog>>> => {
    if (USE_MOCK) {
      return mockDelay(mockOk({
        items: [],
        total: 0,
        page: 1,
        pageSize: 10,
        totalPages: 0
      }))
    }
    const queryString = _params ? `?${new URLSearchParams(_params as any).toString()}` : ''
    return request(`/logs${queryString}`)
  },

  // 记录操作日志
  createLog: (_data: Omit<OperationLog, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<OperationLog>> => {
    if (USE_MOCK) {
      const newLog: OperationLog = {
        ..._data,
        id: 'log-mock-' + Date.now(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      return mockDelay(mockOk(newLog))
    }
    return request('/logs', {
      method: 'POST',
      body: JSON.stringify(_data),
    })
  }
}

// 搜索 API
export const searchApi = {
  // 全文搜索 —— 覆盖数据资源（表）、数据资产（指标）、业务要素（域/实体/要素）
  search: (keyword: string, _params?: Partial<QueryParams>): Promise<ApiResponse<{
    tables: any[]
    concepts: { domains: any[]; entities: any[]; elements: any[] }
    metrics: any[]
    external: any[]
    total: number
  }>> => {
    if (USE_MOCK) {
      // 延迟导入避免循环依赖
      return Promise.all([
        import('@/mock/shared/metadata-store'),
        import('@/mock/shared/business-concept-store'),
        import('@/mock/metrics'),
        import('@/mock/external-resources')
      ]).then(([{ MetadataStore }, { BusinessConceptStore }, { metrics }, { externalResources }]) => {
        const lowerKeyword = keyword.toLowerCase()

        // 1. 搜索物理表（数据资源）
        const allTables = MetadataStore.getTables()
        let matchedTables = allTables.filter(t =>
          t.name.toLowerCase().includes(lowerKeyword) ||
          (t.description && t.description.toLowerCase().includes(lowerKeyword)) ||
          (t.domain && t.domain.toLowerCase().includes(lowerKeyword)) ||
          (t.tags && t.tags.some((tag: string) => tag.toLowerCase().includes(lowerKeyword)))
        )

        // sourceType 筛选：区分 HIVE 数据仓库表 vs 业务系统源表
        const sourceType = (_params as any)?.sourceType
        if (sourceType) {
          matchedTables = matchedTables.filter(t => t.sourceType === sourceType)
        }

        // 2. 搜索业务概念（业务要素：域/实体/要素）
        const matchedDomains = BusinessConceptStore.getDomains().filter(d =>
          d.name.includes(keyword) || d.description.includes(keyword)
        )
        const matchedEntities = BusinessConceptStore.getEntities().filter(e =>
          e.name.includes(keyword) || e.description.includes(keyword)
        )
        const matchedElements = BusinessConceptStore.getElements().filter(e =>
          e.name.includes(keyword)
        )

        // 3. 搜索指标（数据资产）
        const matchedMetrics = metrics.filter(m =>
          m.name.toLowerCase().includes(lowerKeyword) ||
          (m.businessDefinition && m.businessDefinition.toLowerCase().includes(lowerKeyword)) ||
          (m.category && m.category.toLowerCase().includes(lowerKeyword)) ||
          (m.businessDomain && m.businessDomain.toLowerCase().includes(lowerKeyword))
        )

        // 4. 关联查询：通过命中的概念反查物理表
        let relatedTableNames = new Set<string>()
        matchedEntities.forEach(e => {
          BusinessConceptStore.getEntityRelatedTables(e.code).forEach(t => relatedTableNames.add(t.name))
        })
        matchedElements.forEach(e => {
          if (e.relatedResource?.table) relatedTableNames.add(e.relatedResource.table)
        })
        const allTablesMap = new Map(allTables.map(t => [t.name, t]))
        const finalTables = [...matchedTables]
        relatedTableNames.forEach(tableName => {
          if (!finalTables.find(ft => ft.name === tableName)) {
            const table = allTablesMap.get(tableName)
            if (table) finalTables.push(table)
          }
        })

        // 5. 搜索外部数据(三方数据源)
        const matchedExternal = externalResources.filter(e =>
          e.dataName.toLowerCase().includes(lowerKeyword) ||
          e.supplier.toLowerCase().includes(lowerKeyword) ||
          e.interfaceId.toLowerCase().includes(lowerKeyword) ||
          e.dataType.toLowerCase().includes(lowerKeyword)
        )

        return mockDelay(mockOk({
          tables: finalTables,
          concepts: {
            domains: matchedDomains,
            entities: matchedEntities,
            elements: matchedElements
          },
          metrics: matchedMetrics,
          external: matchedExternal,
          total: finalTables.length + matchedDomains.length + matchedEntities.length + matchedElements.length + matchedMetrics.length + matchedExternal.length
        }))
      })
    }
    const queryParams = { keyword, ..._params }
    const queryString = `?${new URLSearchParams(queryParams as any).toString()}`
    return request(`/search${queryString}`)
  },

  // 搜索建议
  getSuggestions: (keyword: string): Promise<ApiResponse<string[]>> => {
    if (USE_MOCK) {
      // mock 模式：从 mockCategories + mockDocuments 提取建议
      const lowerKeyword = keyword.toLowerCase()
      const suggestions = [
        ...mockCategories.map(c => c.name),
        ...mockDocuments.map(d => d.title)
      ].filter(s => s.toLowerCase().includes(lowerKeyword)).slice(0, 10)
      return mockDelay(mockOk(suggestions))
    }
    return request(`/search/suggestions?keyword=${encodeURIComponent(keyword)}`)
  }
}

// 导出所有 API
export default {
  category: categoryApi,
  tree: treeApi,
  document: documentApi,
  notification: notificationApi,
  attachment: attachmentApi,
  user: userApi,
  stats: statsApi,
  log: logApi,
  search: searchApi
}
