import request from '@/utils/mockRequest'
import type {
  TagTable,
  TagItem,
  CreateTagTableDTO,
  UpdateTagTableDTO,
  GetTagTablesParams,
  TableField,
  DataSource,
  UniquenessCheckResult,
  BatchCreateResult,
  BatchImportResult
} from '@/types/tag'

// 类型再导出：便于其它模块直接 `import type { TagTable } from '@/api/tag'`
export type {
  TagTable,
  TagItem,
  CreateTagTableDTO,
  UpdateTagTableDTO,
  GetTagTablesParams,
  TableField,
  DataSource,
  UniquenessCheckResult,
  BatchCreateResult,
  BatchImportResult
} from '@/types/tag'

// 统一响应格式
interface ApiResponse<T> {
  success: boolean
  code: number
  message: string
  data: T
  timestamp: number
}

// 分页响应格式
interface PaginatedResponse<T> {
  data: T[]
  total: number
  current: number
  pageSize: number
  pages: number
}

/**
 * 标签表管理API
 */
export const tagAPI = {
  /**
   * 获取标签表列表
   */
  getTagTables: (params?: GetTagTablesParams): Promise<ApiResponse<PaginatedResponse<TagTable>>> => {
    return request.get('/api/v1/tag-tables', { params })
  },

  /**
   * 创建标签表
   */
  createTagTable: (data: CreateTagTableDTO): Promise<ApiResponse<TagTable>> => {
    return request.post('/api/v1/tag-tables', data)
  },

  /**
   * 更新标签表
   */
  updateTagTable: (id: string, data: UpdateTagTableDTO): Promise<ApiResponse<TagTable>> => {
    return request.put(`/api/v1/tag-tables/${id}`, data)
  },

  /**
   * 删除标签表
   */
  deleteTagTable: (id: string): Promise<ApiResponse<void>> => {
    return request.delete(`/api/v1/tag-tables/${id}`)
  },

  /**
   * 批量创建标签表
   */
  batchCreateTagTables: (data: CreateTagTableDTO[]): Promise<ApiResponse<BatchCreateResult>> => {
    return request.post('/api/v1/tag-tables/batch', data)
  },

  /**
   * 获取数据源列表
   */
  getDataSources: (): Promise<ApiResponse<DataSource[]>> => {
    return request.get('/api/v1/data-sources')
  },

  /**
   * 获取数据表列表
   */
  getTables: (dataSourceId: string): Promise<ApiResponse<string[]>> => {
    return request.get(`/api/v1/data-sources/${dataSourceId}/tables`)
  },

  /**
   * 获取表字段信息
   */
  getTableFields: (dataSourceId: string, tableName: string): Promise<ApiResponse<TableField[]>> => {
    return request.get(`/api/v1/data-sources/${dataSourceId}/tables/${tableName}/fields`)
  },

  /**
   * 检查主键唯一性
   */
  checkPrimaryKeyUniqueness: (dataSourceId: string, tableName: string, fields: string[]): Promise<ApiResponse<UniquenessCheckResult>> => {
    return request.post('/api/v1/tag-tables/check-uniqueness', {
      dataSourceId,
      tableName,
      fields
    })
  },

  /**
   * 获取标签表详情
   */
  getTagTableDetail: (id: string): Promise<ApiResponse<TagTable>> => {
    return request.get(`/api/v1/tag-tables/${id}`)
  },

  /**
   * 归档/激活标签表
   */
  archiveTagTable: (id: string, archived: boolean): Promise<ApiResponse<TagTable>> => {
    return request.put(`/api/v1/tag-tables/${id}/archive`, { archived })
  },

  /**
   * 获取标签表统计信息
   */
  getTagTableStats: (): Promise<ApiResponse<{
    total: number
    active: number
    archived: number
    trend: {
      total: number
      active: number
      archived: number
    }
  }>> => {
    return request.get('/api/v1/tag-tables/stats')
  },

  /**
   * 批量导入标签
   */
  batchImportTags: (data: CreateTagTableDTO[]): Promise<ApiResponse<BatchImportResult>> => {
    return request.post('/api/v1/tag-tables/import', data)
  }
}

/**
 * 标签分类API
 */
export const categoryAPI = {
  /**
   * 获取标签分类列表
   */
  getCategories: (): Promise<ApiResponse<string[]>> => {
    return request.get('/api/v1/tag-categories')
  },

  /**
   * 创建标签分类
   */
  createCategory: (name: string): Promise<ApiResponse<string>> => {
    return request.post('/api/v1/tag-categories', { name })
  }
}

/**
 * IDMapping规则API
 */
export const mappingAPI = {
  /**
   * 获取IDMapping规则列表
   */
  getMappingRules: (tagTableId: string): Promise<ApiResponse<any[]>> => {
    return request.get(`/api/v1/tag-tables/${tagTableId}/mapping-rules`)
  },

  /**
   * 创建IDMapping规则
   */
  createMappingRule: (tagTableId: string, data: any): Promise<ApiResponse<any>> => {
    return request.post(`/api/v1/tag-tables/${tagTableId}/mapping-rules`, data)
  },

  /**
   * 更新IDMapping规则
   */
  updateMappingRule: (tagTableId: string, ruleId: string, data: any): Promise<ApiResponse<any>> => {
    return request.put(`/api/v1/tag-tables/${tagTableId}/mapping-rules/${ruleId}`, data)
  },

  /**
   * 删除IDMapping规则
   */
  deleteMappingRule: (tagTableId: string, ruleId: string): Promise<ApiResponse<void>> => {
    return request.delete(`/api/v1/tag-tables/${tagTableId}/mapping-rules/${ruleId}`)
  }
}

/**
 * 数据源API
 */
export const datasourceAPI = {
  /**
   * 获取数据源列表
   */
  getDataSources: (): Promise<ApiResponse<DataSource[]>> => {
    return request.get('/api/v1/data-sources')
  },

  /**
   * 获取数据表列表
   */
  getTables: (dataSourceId: string): Promise<ApiResponse<string[]>> => {
    return request.get(`/api/v1/data-sources/${dataSourceId}/tables`)
  },
  /**
   * 获取表字段信息
   */
  getTableFields: (dataSourceId: string, tableName: string): Promise<ApiResponse<TableField[]>> => {
    return request.get(`/api/v1/data-sources/${dataSourceId}/tables/${tableName}/fields`)
  }
}

/**
 * 标签实体 API（标签管理页消费，结构为 TagItem 而非标签表）
 */
export const tagItemAPI = {
  /**
   * 获取标签实体列表
   */
  getTags: (params?: { searchText?: string; category?: string; tagType?: string }): Promise<ApiResponse<PaginatedResponse<TagItem>>> => {
    return request.get('/api/v1/tags', { params })
  },

  /**
   * 获取标签实体详情
   */
  getTagItem: (id: string): Promise<ApiResponse<TagItem>> => {
    return request.get(`/api/v1/tags/${id}`)
  },

  /**
   * 创建标签实体
   */
  createTagItem: (data: Partial<TagItem>): Promise<ApiResponse<TagItem>> => {
    return request.post('/api/v1/tags', data)
  },

  /**
   * 更新标签实体
   */
  updateTagItem: (id: string, data: Partial<TagItem>): Promise<ApiResponse<TagItem>> => {
    return request.put(`/api/v1/tags/${id}`, data)
  },

  /**
   * 删除标签实体
   */
  deleteTagItem: (id: string): Promise<ApiResponse<void>> => {
    return request.delete(`/api/v1/tags/${id}`)
  }
}

/**
 * 获取标签实体列表
 * @param params 查询参数（关键字、分类、标签类型）
 */
export const listTags = async (params?: { searchText?: string; category?: string; tagType?: string }): Promise<{ list: TagItem[]; total: number }> => {
  const res = await tagItemAPI.getTags(params)
  return { list: res.data.data, total: res.data.total }
}

/**
 * 获取单个标签实体
 * @param id 标签 ID
 */
export const getTag = async (id: string): Promise<TagItem> => {
  const res = await tagItemAPI.getTagItem(id)
  return res.data
}

/**
 * 创建标签实体
 * @param data 标签字段
 */
export const createTag = async (data: Partial<TagItem>): Promise<TagItem> => {
  const res = await tagItemAPI.createTagItem(data)
  return res.data
}

/**
 * 更新标签实体
 * @param id 标签 ID
 * @param data 待更新字段
 */
export const updateTag = async (id: string, data: Partial<TagItem>): Promise<boolean> => {
  const res = await tagItemAPI.updateTagItem(id, data)
  return !!res.success
}

/**
 * 批量删除标签实体
 * @param ids 标签 ID 列表
 */
export const deleteTags = async (ids: string[]): Promise<boolean> => {
  const results = await Promise.all(ids.map((id) => tagItemAPI.deleteTagItem(id)))
  return results.every((r) => !!r.success)
}

export const fetchTableSchema = async (dataSourceId: string, tableName: string): Promise<TableField[]> => {
  const res = await datasourceAPI.getTableFields(dataSourceId, tableName)
  return res.data
}

export const validatePrimaryKey = async (
  dataSourceId: string,
  tableName: string,
  fields: string[]
): Promise<UniquenessCheckResult> => {
  const res = await tagAPI.checkPrimaryKeyUniqueness(dataSourceId, tableName, fields)
  return res.data
}

export const registerTagTable = async (data: CreateTagTableDTO): Promise<TagTable> => {
  const res = await tagAPI.createTagTable(data)
  return res.data
}

export const getTagLineage = async (id: string): Promise<any> => {
  try {
    const res = await request.get(`/api/v1/tag-tables/${id}/lineage`)
    return res.data
  } catch {
    return { nodes: [], edges: [] }
  }
}

/**
 * 获取标签详情（含可选血缘）
 * @param id 标签表 ID
 * @param options.withLineage 是否附带血缘数据
 * @returns { data: 标签详情 & { lineage } } 统一返回 { data } 结构
 */
export const getTagDetail = async (id: string, options?: { withLineage?: boolean }): Promise<{ data: any }> => {
  const res = await tagAPI.getTagTableDetail(id)
  const detail: any = { ...(res?.data || {}) }
  if (options?.withLineage) {
    detail.lineage = await getTagLineage(id)
  }
  return { data: detail }
}
