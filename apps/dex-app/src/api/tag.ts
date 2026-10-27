/**
 * 标签表 API（Mock）
 * 说明：dex-app 无 HTTP 拦截器基础设施，此处以内联 mock 数据实现，
 *      行为与 mkt-app 的 mockRequest 保持一致（success/code/message/data 结构）。
 */
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
export interface ApiResponse<T> {
  success: boolean
  code: number
  message: string
  data: T
  timestamp: number
}

// 分页响应格式
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  current: number
  pageSize: number
  pages: number
}

/**
 * 构造统一响应
 */
function ok<T>(data: T): ApiResponse<T> {
  return { success: true, code: 200, message: 'success', data, timestamp: Date.now() }
}

/**
 * 构造失败响应
 */
function fail<T>(message: string, code = 404): ApiResponse<T> {
  return { success: false, code, message, data: null as unknown as T, timestamp: Date.now() }
}

// ── Mock 数据 ──────────────────────────────────────────────
const mockDataSources: DataSource[] = [
  { id: 'ds-1001', name: 'Doris 数仓', type: 'doris', host: 'doris-fe.local:8030', port: 8030, database: 'cdp_dw', username: 'readonly', status: 'active', createTime: '2024-09-01 10:00:00' },
  { id: 'ds-1002', name: 'MySQL 用户中心', type: 'mysql', host: 'mysql.prod:3306', port: 3306, database: 'user_center', username: 'readonly', status: 'active', createTime: '2024-08-12 09:00:00' },
  { id: 'ds-1003', name: 'PostgreSQL 行为库', type: 'postgresql', host: 'pg.behavior:5432', port: 5432, database: 'behavior', username: 'readonly', status: 'inactive', createTime: '2024-07-20 14:00:00' }
]

const mockTagTables: TagTable[] = [
  {
    id: 'tt_001', name: '用户日颗粒标签', code: 'tag_user_daily', description: '用户日颗粒标签明细',
    status: 'active', categories: ['基础信息'], dataSource: 'Doris 数仓', dataSourceId: 'ds-1001',
    tableName: 'tag_user_daily', primaryKey: 'mobile', identityType: 'mobile', primaryKeyFormat: 'raw',
    mappingRules: [], enableMapping: true, creator: 'admin', createTime: '2024-11-01 10:00:00',
    updater: 'admin', updateTime: '2025-01-10 09:00:00', unit: '元', derived: false, continuousType: 'continuous',
    snapshotDates: ['2025-01-08', '2025-01-09', '2025-01-10']
  },
  {
    id: 'tt_002', name: '用户画像主表', code: 'user_profile', description: '用户画像主表',
    status: 'active', categories: ['资产信息'], dataSource: 'MySQL 用户中心', dataSourceId: 'ds-1002',
    tableName: 'user_profile', primaryKey: 'mobile', identityType: 'mobile', primaryKeyFormat: 'raw',
    mappingRules: [], enableMapping: true, creator: 'admin', createTime: '2024-10-21 09:00:00',
    updater: 'admin', updateTime: '2025-01-08 12:00:00', unit: '—', derived: true, continuousType: 'categorical',
    snapshotDates: ['2025-01-08', '2025-01-10']
  }
]

const mockTags: TagItem[] = [
  {
    id: 'tag_001', name: '用户活跃度标签', dataType: 'number', category: 'behavior', tagType: 'dynamic',
    dimensionKey: 'user_id', shareLevel: 'public', createUser: 'admin', createTime: '2024-11-01 10:00:00',
    description: '近 30 天活跃次数', mappingStatus: 'configured', unit: '次', derived: false, continuousType: 'continuous'
  },
  {
    id: 'tag_002', name: '会员资产等级', dataType: 'string', category: 'business', tagType: 'static',
    dimensionKey: 'user_id', shareLevel: 'private', createUser: 'admin', createTime: '2024-10-21 09:00:00',
    description: '按 AUM 划分的会员等级', mappingStatus: 'unconfigured', unit: '', derived: true, continuousType: 'categorical'
  },
  {
    id: 'tag_003', name: '近 90 天消费金额', dataType: 'number', category: 'business', tagType: 'computed',
    dimensionKey: 'user_id', shareLevel: 'public', createUser: 'zhangsan', createTime: '2024-09-12 14:30:00',
    description: '滚动窗口聚合的 GMV 标签', mappingStatus: 'configured', unit: '元', derived: false, continuousType: 'continuous'
  }
]

const mockTableFields: Record<string, TableField[]> = {
  'ds-1001/tag_user_daily': [
    { name: 'user_id', type: 'string', description: '用户唯一标识', nullable: false, isPrimaryKey: false, isPartitionField: false },
    { name: 'mobile', type: 'string', description: '手机号', nullable: false, isPrimaryKey: true, isPartitionField: false },
    { name: 'age', type: 'int', description: '年龄', nullable: true, isPrimaryKey: false, isPartitionField: false }
  ],
  'ds-1002/user_profile': [
    { name: 'user_id', type: 'string', description: '用户唯一标识', nullable: false, isPrimaryKey: false, isPartitionField: false },
    { name: 'mobile', type: 'string', description: '手机号', nullable: false, isPrimaryKey: true, isPartitionField: false },
    { name: 'aum', type: 'decimal', description: '资产规模', nullable: true, isPrimaryKey: false, isPartitionField: false }
  ]
}

const mockDataSourceTables: Record<string, string[]> = {
  'ds-1001': ['tag_user_daily', 'tag_user_snapshot', 'tag_user_monthly'],
  'ds-1002': ['user_profile', 'user_ext', 'user_tag'],
  'ds-1003': ['events', 'events_archive']
}

/**
 * 标签表管理API
 */
export const tagAPI = {
  /**
   * 获取标签表列表
   */
  getTagTables: async (params?: GetTagTablesParams): Promise<ApiResponse<PaginatedResponse<TagTable>>> => {
    const current = params?.page ?? 1
    const pageSize = params?.pageSize ?? 10
    let list = [...mockTagTables]
    if (params?.name) {
      list = list.filter(t => t.name.includes(params.name as string))
    }
    if (params?.status) {
      list = list.filter(t => t.status === params.status)
    }
    const start = (current - 1) * pageSize
    return ok({
      data: list.slice(start, start + pageSize),
      total: list.length,
      current,
      pageSize,
      pages: Math.ceil(list.length / pageSize)
    })
  },

  /**
   * 获取标签表详情
   */
  getTagTableDetail: async (id: string): Promise<ApiResponse<TagTable>> => {
    const table = mockTagTables.find(t => t.id === id)
    return table ? ok(table) : fail('标签表不存在')
  },

  /**
   * 创建标签表
   */
  createTagTable: async (data: Partial<CreateTagTableDTO>): Promise<ApiResponse<TagTable>> => {
    const id = `tt_${Date.now()}`
    const created: TagTable = {
      id,
      name: data.name ?? `标签_${id}`,
      code: data.code ?? `tag_${id}`,
      description: data.description ?? '',
      status: 'active',
      categories: data.categories ?? [],
      dataSource: '',
      dataSourceId: data.dataSourceId ?? '',
      tableName: data.tableName ?? `tag_${id}`,
      primaryKey: data.primaryKey ?? 'mobile',
      identityType: data.identityType ?? 'mobile',
      primaryKeyFormat: data.primaryKeyFormat ?? 'raw',
      mappingRules: data.mappingRules ?? [],
      enableMapping: data.enableMapping ?? false,
      creator: 'admin',
      createTime: new Date().toISOString().replace('T', ' ').substring(0, 19),
      updater: 'admin',
      updateTime: new Date().toISOString().replace('T', ' ').substring(0, 19)
    }
    mockTagTables.unshift(created)
    return ok(created)
  },

  /**
   * 更新标签表
   */
  updateTagTable: async (id: string, data: Partial<UpdateTagTableDTO>): Promise<ApiResponse<TagTable>> => {
    const idx = mockTagTables.findIndex(t => t.id === id)
    if (idx === -1) return fail('标签表不存在')
    mockTagTables[idx] = {
      ...mockTagTables[idx],
      ...data,
      updateTime: new Date().toISOString().replace('T', ' ').substring(0, 19)
    }
    return ok(mockTagTables[idx])
  },

  /**
   * 删除标签表
   */
  deleteTagTable: async (id: string): Promise<ApiResponse<void>> => {
    const idx = mockTagTables.findIndex(t => t.id === id)
    if (idx === -1) return fail('标签表不存在')
    mockTagTables.splice(idx, 1)
    return ok(undefined as unknown as void)
  },

  /**
   * 批量创建标签表
   */
  batchCreateTagTables: async (rows: CreateTagTableDTO[]): Promise<ApiResponse<BatchCreateResult>> => {
    const success: TagTable[] = []
    const failed: BatchCreateResult['failed'] = []
    for (const row of rows) {
      const res = await tagAPI.createTagTable(row)
      if (res.success) success.push(res.data)
      else failed.push({ data: row, error: res.message })
    }
    return ok({ success, failed, total: rows.length })
  },

  /**
   * 检查主键唯一性
   */
  checkPrimaryKeyUniqueness: async (
    dataSourceId: string,
    tableName: string,
    fields: string[]
  ): Promise<ApiResponse<UniquenessCheckResult>> => {
    const key = `${dataSourceId}/${tableName}`
    const sampleLen = (mockTableFields[key] || []).length || 10
    const f = String(fields[0] || '').toLowerCase()
    let score = 70
    if (/id_card|idcard/.test(f)) score = 98
    else if (/mobile|phone|msisdn/.test(f)) score = 95
    else if (/device_id|imei|idfa/.test(f)) score = 90
    else if (/email/.test(f)) score = 85
    else score = 75
    return ok({
      score,
      uniqueCount: sampleLen * 9,
      totalCount: sampleLen * 10,
      suggestion: score >= 90 ? '可作为主键' : '建议更换字段'
    })
  },

  /**
   * 归档/激活标签表
   */
  archiveTagTable: async (id: string, archived: boolean): Promise<ApiResponse<TagTable>> => {
    const idx = mockTagTables.findIndex(t => t.id === id)
    if (idx === -1) return fail('标签表不存在')
    mockTagTables[idx] = { ...mockTagTables[idx], status: archived ? 'archived' : 'active' }
    return ok(mockTagTables[idx])
  },

  /**
   * 获取标签表统计信息
   */
  getTagTableStats: async (): Promise<ApiResponse<{
    total: number
    active: number
    archived: number
    trend: { total: number; active: number; archived: number }
  }>> => {
    const total = mockTagTables.length
    const active = mockTagTables.filter(t => t.status === 'active').length
    return ok({
      total,
      active,
      archived: total - active,
      trend: { total: 6.2, active: 4.8, archived: -1.5 }
    })
  },

  /**
   * 批量导入标签
   */
  batchImportTags: async (rows: CreateTagTableDTO[]): Promise<ApiResponse<BatchImportResult>> => {
    const failedItems: BatchImportResult['failedItems'] = []
    rows.forEach(row => {
      if (!row?.name) failedItems.push({ name: row?.name || '(空)', reason: '标签名称不能为空' })
    })
    const failed = failedItems.length
    return ok({
      success: rows.length - failed,
      skipped: failed,
      failed,
      failedItems
    })
  }
}

/**
 * 标签分类API
 */
export const categoryAPI = {
  /**
   * 获取标签分类列表
   */
  getCategories: async (): Promise<ApiResponse<string[]>> => {
    return ok(['基础信息', '资产信息', '行为信息', '营销属性'])
  },

  /**
   * 创建标签分类
   */
  createCategory: async (name: string): Promise<ApiResponse<string>> => {
    return ok(name)
  }
}

/**
 * IDMapping规则API
 */
export const mappingAPI = {
  getMappingRules: async (tagTableId: string): Promise<ApiResponse<any[]>> => ok([]),
  createMappingRule: async (tagTableId: string, data: any): Promise<ApiResponse<any>> => ok(data),
  updateMappingRule: async (tagTableId: string, ruleId: string, data: any): Promise<ApiResponse<any>> => ok(data),
  deleteMappingRule: async (tagTableId: string, ruleId: string): Promise<ApiResponse<void>> => ok(undefined as unknown as void)
}

/**
 * 数据源API
 */
export const datasourceAPI = {
  /**
   * 获取数据源列表
   */
  getDataSources: async (): Promise<ApiResponse<DataSource[]>> => ok([...mockDataSources]),

  /**
   * 获取数据表列表
   */
  getTables: async (dataSourceId: string): Promise<ApiResponse<string[]>> => {
    return ok(mockDataSourceTables[dataSourceId] || [])
  },

  /**
   * 获取表字段信息
   */
  getTableFields: async (dataSourceId: string, tableName: string): Promise<ApiResponse<TableField[]>> => {
    return ok(mockTableFields[`${dataSourceId}/${tableName}`] || [])
  },

  /**
   * 获取表字段信息（FormRegisterDrawer 使用）
   */
  getFields: async (dataSourceId: string, tableName: string): Promise<ApiResponse<TableField[]>> => {
    return ok(mockTableFields[`${dataSourceId}/${tableName}`] || [])
  }
}

/**
 * 标签实体 API（标签管理页消费，结构为 TagItem 而非标签表）
 */
export const tagItemAPI = {
  /**
   * 获取标签实体列表
   */
  getTags: async (params?: { searchText?: string; category?: string; tagType?: string }): Promise<ApiResponse<PaginatedResponse<TagItem>>> => {
    let list = [...mockTags]
    const keyword = params?.searchText
    if (keyword) {
      const s = String(keyword).toLowerCase()
      list = list.filter(t => t.name.toLowerCase().includes(s) || t.id.toLowerCase().includes(s))
    }
    if (params?.category) list = list.filter(t => t.category === params.category)
    if (params?.tagType) list = list.filter(t => t.tagType === params.tagType)
    return ok({
      data: list,
      total: list.length,
      current: 1,
      pageSize: list.length,
      pages: 1
    })
  },

  /**
   * 获取标签实体详情
   */
  getTagItem: async (id: string): Promise<ApiResponse<TagItem>> => {
    const tag = mockTags.find(t => t.id === id)
    return tag ? ok(tag) : fail('标签不存在')
  },

  /**
   * 创建标签实体
   */
  createTagItem: async (data: Partial<TagItem>): Promise<ApiResponse<TagItem>> => {
    const created: TagItem = {
      id: data.id ?? `tag_${Date.now()}`,
      name: data.name ?? '',
      dataType: data.dataType ?? 'string',
      category: data.category ?? 'basic',
      tagType: data.tagType ?? 'static',
      dimensionKey: data.dimensionKey ?? '',
      shareLevel: data.shareLevel ?? 'public',
      createUser: data.createUser ?? '当前用户',
      createTime: data.createTime ?? new Date().toISOString().replace('T', ' ').substring(0, 19),
      description: data.description,
      mappingStatus: data.mappingStatus ?? 'unconfigured',
      unit: data.unit,
      derived: data.derived ?? false,
      continuousType: data.continuousType
    }
    mockTags.unshift(created)
    return ok(created)
  },

  /**
   * 更新标签实体
   */
  updateTagItem: async (id: string, data: Partial<TagItem>): Promise<ApiResponse<TagItem>> => {
    const idx = mockTags.findIndex(t => t.id === id)
    if (idx === -1) return fail('标签不存在')
    mockTags[idx] = { ...mockTags[idx], ...data, id }
    return ok(mockTags[idx])
  },

  /**
   * 删除标签实体
   */
  deleteTagItem: async (id: string): Promise<ApiResponse<void>> => {
    const idx = mockTags.findIndex(t => t.id === id)
    if (idx === -1) return fail('标签不存在')
    mockTags.splice(idx, 1)
    return ok(undefined as unknown as void)
  }
}

/**
 * 标签列表查询（返回标签实体结构）
 */
export const listTags = async (params?: { searchText?: string; category?: string; tagType?: string }): Promise<{ list: TagItem[]; total: number }> => {
  const res = await tagItemAPI.getTags(params)
  return { list: res.data.data, total: res.data.total }
}

/**
 * 获取单个标签
 */
export const getTag = async (id: string): Promise<TagItem> => {
  const res = await tagItemAPI.getTagItem(id)
  return res.data
}

/**
 * 创建标签
 */
export const createTag = async (data: Partial<TagItem>): Promise<TagItem> => {
  const res = await tagItemAPI.createTagItem(data)
  return res.data
}

/**
 * 更新标签
 */
export const updateTag = async (id: string, data: Partial<TagItem>): Promise<boolean> => {
  const res = await tagItemAPI.updateTagItem(id, data)
  return !!res.success
}

/**
 * 批量删除标签
 */
export const deleteTags = async (ids: string[]): Promise<boolean> => {
  const results = await Promise.all(ids.map(id => tagItemAPI.deleteTagItem(id)))
  return results.every(r => !!r.success)
}

/**
 * 拉取表结构
 */
export const fetchTableSchema = async (dataSourceId: string, tableName: string): Promise<TableField[]> => {
  const res = await datasourceAPI.getTableFields(dataSourceId, tableName)
  return res.data
}

/**
 * 校验主键唯一性
 */
export const validatePrimaryKey = async (
  dataSourceId: string,
  tableName: string,
  fields: string[]
): Promise<UniquenessCheckResult> => {
  const res = await tagAPI.checkPrimaryKeyUniqueness(dataSourceId, tableName, fields)
  return res.data
}

/**
 * 注册标签表
 */
export const registerTagTable = async (data: CreateTagTableDTO): Promise<TagTable> => {
  const res = await tagAPI.createTagTable(data)
  return res.data
}

/**
 * 获取标签血缘
 */
export const getTagLineage = async (id: string): Promise<any> => {
  const res = await tagAPI.getTagTableDetail(id)
  const table = res.data
  if (!table) return { nodes: [], edges: [] }
  return {
    tagName: table.name,
    relatedAudiences: [
      { audienceName: '高净值客群', memberCount: 12800, lastUpdateTime: '2025-01-10 09:00:00' },
      { audienceName: '近期活跃客群', memberCount: 45200, lastUpdateTime: '2025-01-09 18:30:00' }
    ],
    relatedTables: [
      { tableName: table.tableName, lastSyncTime: '2025-01-10 09:00:00' }
    ]
  }
}

/**
 * 获取标签详情（含可选血缘）
 */
export const getTagDetail = async (id: string, options?: { withLineage?: boolean }): Promise<{ data: any }> => {
  const res = await tagAPI.getTagTableDetail(id)
  const detail: any = { ...(res?.data || {}) }
  if (options?.withLineage) {
    detail.lineage = await getTagLineage(id)
  }
  return { data: detail }
}

export default { tagAPI, categoryAPI, mappingAPI, datasourceAPI }
