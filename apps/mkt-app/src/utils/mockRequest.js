/**
 * 模拟 HTTP 请求拦截器（mock）
 * 用途：纯前端 demo，根据 URL 前缀路由到本地 mock 处理函数；不发起真实 HTTP 请求。
 * 路由覆盖：
 *   - /api/data-models       → handleDataModelsAPI       (mock/data-models)
 *   - /api/alert-rules       → handleAlertRulesAPI       (mock/alert-rules)
 *   - /api/variables         → handleVariablesAPI        (内联 mock)
 *   - /api/variable-map      → handleVariableMapAPI      (内联 mock)
 *   - /api/v1/*              → handleV1TagAndDatasourceAPI (内联 __v1TagTables)
 * 行为：所有请求模拟 300ms 延迟；返回统一 { code: 200, message: 'success', data } 结构。
 * 边界：与真 axios 不兼容；项目内禁止使用真实 HTTP 客户端。
 */

import { mockDataModels } from '@/mock/data-models'
import { mockAlertRules } from '@/mock/alert-rules'
import { mockCdpTags } from '@/mock/cdp-tags'

/**
 * 模拟延迟
 * @param {number} ms 延迟毫秒数
 * @returns {Promise}
 */
function delay(ms = 300) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 模拟 HTTP 请求
 * @param {Object} config 请求配置
 * @param {string} config.url 请求 URL
 * @param {string} config.method 请求方法
 * @param {Object} config.params 查询参数
 * @param {Object} config.data 请求数据
 * @returns {Promise} 请求结果
 */
export default async function request(config) {
  const { url, method = 'GET', params = {}, data = {} } = config
  
  // 模拟网络延迟
  await delay()
  
  try {
    let res
    // 根据 URL 路径匹配对应的 mock 数据
    if (url.includes('/api/data-models')) {
      res = handleDataModelsAPI(url, method, params, data)
    } else if (url.includes('/api/alert-rules')) {
      res = handleAlertRulesAPI(url, method, params, data)
    } else if (url.includes('/api/variables')) {
      res = handleVariablesAPI(url, method, params, data)
    } else if (url.includes('/api/variable-map')) {
      res = handleVariableMapAPI(url, method, params, data)
    } else if (url.includes('/api/v1/')) {
      res = handleV1TagAndDatasourceAPI(url, method, params, data)
    } else {
      // 默认返回成功响应
      res = { code: 200, message: 'success', data: null }
    }
    // 统一补齐 success 字段（各 handler 只返回 code/message/data）
    return { success: res.code === 200, ...res }
  } catch (error) {
    // 模拟错误响应
    return Promise.reject({
      success: false,
      code: 500,
      message: error.message || '请求失败',
      data: null
    })
  }
}

/**
 * 处理数据模型相关 API
 * @param {string} url 请求 URL
 * @param {string} method 请求方法
 * @param {Object} params 查询参数
 * @param {Object} data 请求数据
 * @returns {Object} 响应数据
 */
function handleDataModelsAPI(url, method, params, data) {
  const upperMethod = method.toUpperCase()
  
  // 获取列表
  if (url === '/api/data-models' && upperMethod === 'GET') {
    const { page = 1, pageSize = 10, name, scenario, status } = params
    let list = [...mockDataModels]
    
    // 过滤
    if (name) {
      list = list.filter(item => item.name.includes(name))
    }
    if (scenario) {
      list = list.filter(item => item.scenario === scenario)
    }
    if (status) {
      list = list.filter(item => item.status === status)
    }
    
    // 分页
    const total = list.length
    const start = (page - 1) * pageSize
    const end = start + pageSize
    const records = list.slice(start, end)
    
    return {
      code: 200,
      message: 'success',
      data: {
        records,
        total,
        page: parseInt(page, 10),
        pageSize: parseInt(pageSize, 10)
      }
    }
  }
  
  // 获取详情
  if (url.match(/\/api\/data-models\/\d+$/) && upperMethod === 'GET') {
    const id = parseInt(url.split('/', 10).pop(), 10)
    const model = mockDataModels.find(item => item.id === id)
    
    if (!model) {
      throw new Error('数据模型不存在')
    }
    
    return {
      code: 200,
      message: 'success',
      data: model
    }
  }
  
  // 创建
  if (url === '/api/data-models' && upperMethod === 'POST') {
    const newModel = {
      id: Date.now(),
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    mockDataModels.push(newModel)
    
    return {
      code: 200,
      message: '创建成功',
      data: newModel
    }
  }
  
  // 更新
  if (url.match(/\/api\/data-models\/\d+$/) && upperMethod === 'PUT') {
    const id = parseInt(url.split('/', 10).pop(), 10)
    const index = mockDataModels.findIndex(item => item.id === id)
    
    if (index === -1) {
      throw new Error('数据模型不存在')
    }
    
    mockDataModels[index] = {
      ...mockDataModels[index],
      ...data,
      updatedAt: new Date().toISOString()
    }
    
    return {
      code: 200,
      message: '更新成功',
      data: mockDataModels[index]
    }
  }
  
  // 删除
  if (url.match(/\/api\/data-models\/\d+$/) && upperMethod === 'DELETE') {
    const id = parseInt(url.split('/', 10).pop(), 10)
    const index = mockDataModels.findIndex(item => item.id === id)
    
    if (index === -1) {
      throw new Error('数据模型不存在')
    }
    
    mockDataModels.splice(index, 1)
    
    return {
      code: 200,
      message: '删除成功',
      data: null
    }
  }
  
  // 执行模型
  if (url.match(/\/api\/data-models\/\d+\/execute$/) && upperMethod === 'POST') {
    const id = parseInt(url.split('/', 10)[3], 10)
    const model = mockDataModels.find(item => item.id === id)
    
    if (!model) {
      throw new Error('数据模型不存在')
    }
    
    // 模拟执行结果
    const result = {
      executionId: Date.now(),
      modelId: id,
      status: 'success',
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 2000).toISOString(),
      result: {
        rows: 100,
        columns: ['id', 'name', 'value'],
        data: [
          { id: 1, name: '示例数据1', value: 100 },
          { id: 2, name: '示例数据2', value: 200 }
        ]
      }
    }
    
    return {
      code: 200,
      message: '执行成功',
      data: result
    }
  }
  
  // 获取执行历史
  if (url.match(/\/api\/data-models\/\d+\/executions$/) && upperMethod === 'GET') {
    const id = parseInt(url.split('/', 10)[3], 10)
    
    // 模拟执行历史
    const executions = [
      {
        id: 1,
        modelId: id,
        status: 'success',
        startTime: '2024-01-15 10:30:00',
        endTime: '2024-01-15 10:30:05',
        duration: 5000,
        resultRows: 150
      },
      {
        id: 2,
        modelId: id,
        status: 'failed',
        startTime: '2024-01-14 15:20:00',
        endTime: '2024-01-14 15:20:03',
        duration: 3000,
        error: 'SQL语法错误'
      }
    ]
    
    return {
      code: 200,
      message: 'success',
      data: executions
    }
  }
  
  throw new Error('API 接口不存在')
}

/**
 * 处理 /api/v1 数据源与标签相关 API（供标签表注册使用）
 */
function handleV1TagAndDatasourceAPI(url, method, params, data) {
  const upperMethod = method.toUpperCase()
  // 简易数据源与字段库（与前端本地 DataSourceStore 保持风格一致）
  const __v1DataSources = [
    { id: 'ds-1001', type: 'doris', host: 'doris-fe.local:8030', database: 'cdp_dw' },
    { id: 'ds-1002', type: 'mysql', host: 'mysql.prod:3306', database: 'user_center' },
    { id: 'ds-1003', type: 'postgresql', host: 'pg.behavior:5432', database: 'behavior' }
  ]
  // 标签表内存数据
  if (!handleV1TagAndDatasourceAPI.__v1TagTables) {
    handleV1TagAndDatasourceAPI.__v1TagTables = [
      {
        id: 'tt_001',
        name: '用户日颗粒标签表',
        code: 'tag_user_daily',
        description: '用户日颗粒标签明细',
        tableName: 'tag_user_daily',
        tableDesc: '用户日颗粒标签明细',
        categories: ['基础信息'],
        dataSource: 'Doris 生产集群',
        dataSourceId: 'ds-1001',
        recordCount: 120000,
        status: 'active',
        mappingStatus: 'configured',
        identityType: 'mobile',
        primaryKey: 'mobile',
        primaryKeyFormat: 'raw',
        mappingRules: [],
        enableMapping: true,
        creator: 'admin',
        createTime: '2024-11-01 10:00:00',
        updater: 'admin',
        updateTime: '2025-01-10 09:00:00'
      },
      {
        id: 'tt_002',
        name: '用户画像主表',
        code: 'user_profile',
        description: '用户画像主表',
        tableName: 'user_profile',
        tableDesc: '用户画像主表',
        categories: ['资产信息'],
        dataSource: 'MySQL 用户库',
        dataSourceId: 'ds-1002',
        recordCount: 56000,
        status: 'active',
        mappingStatus: 'partial',
        identityType: 'mobile',
        primaryKey: 'mobile',
        primaryKeyFormat: 'raw',
        mappingRules: [],
        enableMapping: true,
        creator: 'admin',
        createTime: '2024-10-21 09:00:00',
        updater: 'admin',
        updateTime: '2025-01-08 12:00:00'
      }
    ]
    // 标签实体（标签管理页消费）：与标签表结构不同，按 TagItem 字段组织
    // 数据来源：@/mock/cdp-tags（与标签详情、连续型标签分位统计共用同一份元数据）
    handleV1TagAndDatasourceAPI.__v1Tags = mockCdpTags
  }
  const __v1TagTables = handleV1TagAndDatasourceAPI.__v1TagTables
  const __v1Tags = handleV1TagAndDatasourceAPI.__v1Tags
  const __tableFields = {
    // doris
    'ds-1001/tag_user_daily': [
      { name: 'user_id', type: 'string' },
      { name: 'mobile', type: 'string' },
      { name: 'email', type: 'string' },
      { name: 'device_id', type: 'string' },
      { name: 'gender', type: 'string' },
      { name: 'age', type: 'number' },
      { name: 'city', type: 'string' },
      { name: 'tag_code', type: 'string' },
      { name: 'tag_value', type: 'string' },
      { name: 'stat_date', type: 'date' }
    ],
    'ds-1001/tag_user_snapshot': [
      { name: 'user_id', type: 'string' },
      { name: 'mobile', type: 'string' },
      { name: 'union_id', type: 'string' },
      { name: 'open_id', type: 'string' },
      { name: 'update_time', type: 'date' }
    ],
    'ds-1001/tag_user_monthly': [
      { name: 'user_id', type: 'string' },
      { name: 'card_no', type: 'string' },
      { name: 'month', type: 'string' },
      { name: 'amount', type: 'number' }
    ],
    // mysql
    'ds-1002/user_profile': [
      { name: 'id', type: 'string' },
      { name: 'mobile', type: 'string' },
      { name: 'email', type: 'string' },
      { name: 'name', type: 'string' },
      { name: 'birthday', type: 'date' },
      { name: 'city', type: 'string' },
      { name: 'register_time', type: 'date' }
    ],
    'ds-1002/user_ext': [
      { name: 'id', type: 'string' },
      { name: 'device_id', type: 'string' },
      { name: 'open_id', type: 'string' },
      { name: 'union_id', type: 'string' },
      { name: 'last_login', type: 'date' }
    ],
    'ds-1002/user_tag': [
      { name: 'id', type: 'string' },
      { name: 'tag_code', type: 'string' },
      { name: 'tag_value', type: 'string' },
      { name: 'update_time', type: 'date' }
    ],
    // postgresql
    'ds-1003/events': [
      { name: 'event_id', type: 'string' },
      { name: 'user_id', type: 'string' },
      { name: 'device_id', type: 'string' },
      { name: 'event_name', type: 'string' },
      { name: 'event_time', type: 'date' },
      { name: 'properties', type: 'string' }
    ],
    'ds-1003/events_archive': [
      { name: 'event_id', type: 'string' },
      { name: 'user_id', type: 'string' },
      { name: 'event_name', type: 'string' },
      { name: 'event_date', type: 'date' }
    ]
  }

  // GET /api/v1/data-sources
  if (url === '/api/v1/data-sources' && upperMethod === 'GET') {
    return { code: 200, message: 'success', data: __v1DataSources }
  }
  // GET /api/v1/tag-tables
  if (url === '/api/v1/tag-tables' && upperMethod === 'GET') {
    const page = parseInt(params?.current || params?.page || 1, 10)
    const pageSize = parseInt(params?.pageSize || 10, 10)
    let list = [...__v1TagTables]
    // 简易筛选
    if (params?.search) {
      const s = String(params.search).toLowerCase()
      list = list.filter(t => (t.tableName || '').toLowerCase().includes(s) || (t.tableDesc || '').toLowerCase().includes(s))
    }
    const total = list.length
    const start = (page - 1) * pageSize
    const end = start + pageSize
    const pageList = list.slice(start, end)
    return {
      code: 200,
      message: 'success',
      data: {
        data: pageList,
        total,
        current: page,
        pageSize,
        pages: Math.ceil(total / pageSize)
      }
    }
  }
  // GET /api/v1/tags（标签实体列表，标签管理页消费）
  if (url === '/api/v1/tags' && upperMethod === 'GET') {
    let list = [...__v1Tags]
    // 支持 search / searchText 两种关键字参数
    const keyword = params?.searchText || params?.search
    if (keyword) {
      const s = String(keyword).toLowerCase()
      list = list.filter(t => (t.name || '').toLowerCase().includes(s) || (t.id || '').toLowerCase().includes(s))
    }
    if (params?.category) {
      list = list.filter(t => t.category === params.category)
    }
    if (params?.tagType) {
      list = list.filter(t => t.tagType === params.tagType)
    }
    return {
      code: 200,
      message: 'success',
      data: {
        data: list,
        total: list.length,
        current: 1,
        pageSize: list.length,
        pages: 1
      }
    }
  }
  // POST /api/v1/tags
  if (url === '/api/v1/tags' && upperMethod === 'POST') {
    const id = data?.id || `tag_${Date.now()}`
    const newItem = {
      ...data,
      id,
      createTime: data?.createTime || new Date().toISOString().replace('T', ' ').substring(0, 19)
    }
    __v1Tags.unshift(newItem)
    handleV1TagAndDatasourceAPI.__v1Tags = __v1Tags
    return { code: 200, message: 'created', data: newItem }
  }
  // GET /api/v1/tags/:id
  if (url.match(/\/api\/v1\/tags\/[^/]+$/) && upperMethod === 'GET') {
    const id = url.split('/').pop()
    const tag = __v1Tags.find(t => t.id === id)
    if (!tag) { return { code: 404, message: 'not_found', data: null } }
    return { code: 200, message: 'success', data: tag }
  }
  // PUT /api/v1/tags/:id
  if (url.match(/\/api\/v1\/tags\/[^/]+$/) && upperMethod === 'PUT') {
    const id = url.split('/').pop()
    const idx = __v1Tags.findIndex(t => t.id === id)
    if (idx === -1) { return { code: 404, message: 'not_found', data: null } }
    __v1Tags[idx] = { ...__v1Tags[idx], ...data, id }
    handleV1TagAndDatasourceAPI.__v1Tags = __v1Tags
    return { code: 200, message: 'updated', data: __v1Tags[idx] }
  }
  // DELETE /api/v1/tags/:id
  if (url.match(/\/api\/v1\/tags\/[^/]+$/) && upperMethod === 'DELETE') {
    const id = url.split('/').pop()
    const before = __v1Tags.length
    const next = __v1Tags.filter(t => t.id !== id)
    handleV1TagAndDatasourceAPI.__v1Tags = next
    const success = next.length < before
    return { code: success ? 200 : 404, message: success ? 'deleted' : 'not_found', data: null }
  }
  // POST /api/v1/tag-tables
  if (url === '/api/v1/tag-tables' && upperMethod === 'POST') {
    const id = `tt_${Date.now()}`
    const newItem = {
      id,
      tableName: data?.basic?.tableAlias || data?.tableName || `table_${id}`,
      tableDesc: data?.basic?.description || '',
      dataSource: data?.dataSource || '',
      recordCount: 0,
      status: 'active',
      mappingStatus: (data?.mappingRules || []).length ? 'configured' : 'none',
      identityType: (data?.mappingRules || [])[0]?.identityType || '',
      primaryKey: (data?.primaryKeys || [])[0] || '',
      createTime: new Date().toISOString().replace('T', ' ').substring(0, 19),
      updateTime: new Date().toISOString().replace('T', ' ').substring(0, 19)
    }
    __v1TagTables.unshift(newItem)
    return { code: 200, message: 'created', data: newItem }
  }
  // POST /api/v1/tag-tables/import
  if (url === '/api/v1/tag-tables/import' && upperMethod === 'POST') {
    const rows = Array.isArray(data) ? data : []
    const failedItems = []
    let skipped = 0
    rows.forEach((row) => {
      if (!row?.name) {
        skipped += 1
        failedItems.push({ name: row?.name || '(空)', reason: '标签名称不能为空' })
      }
    })
    const failed = failedItems.length
    return {
      code: 200,
      message: 'success',
      data: {
        success: rows.length - failed,
        skipped,
        failed,
        failedItems
      }
    }
  }
  // GET /api/v1/tag-tables/stats（须在 :id 详情之前判断，否则会被通配路由吃掉）
  if (url === '/api/v1/tag-tables/stats' && upperMethod === 'GET') {
    const total = __v1TagTables.length
    const active = __v1TagTables.filter(t => t.status === 'active').length
    return {
      code: 200,
      message: 'success',
      data: {
        total,
        active,
        archived: total - active,
        trend: { total: 6.2, active: 4.8, archived: -1.5 }
      }
    }
  }
  // GET /api/v1/tag-tables/:id/lineage
  if (url.match(/\/api\/v1\/tag-tables\/[^/]+\/lineage$/) && upperMethod === 'GET') {
    const id = url.split('/')[4]
    const table = __v1TagTables.find(t => t.id === id) || __v1TagTables[0]
    return {
      code: 200,
      message: 'success',
      data: {
        tagName: table?.tableName || '标签',
        relatedAudiences: [
          { audienceName: '高净值客群', memberCount: 12800, lastUpdateTime: '2025-01-10 09:00:00' },
          { audienceName: '近期活跃客群', memberCount: 45200, lastUpdateTime: '2025-01-09 18:30:00' }
        ],
        relatedTables: [
          { tableName: table?.tableName || 'tag_user_daily', lastSyncTime: '2025-01-10 09:00:00' }
        ]
      }
    }
  }
  // GET /api/v1/tag-tables/:id
  if (url.match(/\/api\/v1\/tag-tables\/[^/]+$/) && upperMethod === 'GET') {
    const id = url.split('/').pop()
    const table = __v1TagTables.find(t => t.id === id)
    if (!table) { return { code: 404, message: 'not_found', data: null }}
    return { code: 200, message: 'success', data: table }
  }
  // PUT /api/v1/tag-tables/:id
  if (url.match(/\/api\/v1\/tag-tables\/[^/]+$/) && upperMethod === 'PUT') {
    const id = url.split('/').pop()
    const idx = __v1TagTables.findIndex(t => t.id === id)
    if (idx === -1) {return { code: 404, message: 'not_found', data: null }}
    __v1TagTables[idx] = { ...__v1TagTables[idx], ...data, updateTime: new Date().toISOString().replace('T', ' ').substring(0, 19) }
    return { code: 200, message: 'updated', data: __v1TagTables[idx] }
  }
  // DELETE /api/v1/tag-tables/:id
  if (url.match(/\/api\/v1\/tag-tables\/[^/]+$/) && upperMethod === 'DELETE') {
    const id = url.split('/').pop()
    const before = __v1TagTables.length
    const next = __v1TagTables.filter(t => t.id !== id)
    handleV1TagAndDatasourceAPI.__v1TagTables = next
    const success = next.length < before
    return { code: success ? 200 : 404, message: success ? 'deleted' : 'not_found', data: null }
  }
  // GET /api/v1/data-sources/:id/tables
  if (url.match(/\/api\/v1\/data-sources\/[^/]+\/tables$/) && upperMethod === 'GET') {
    const id = url.split('/')[4]
    switch (id) {
      case 'ds-1001': return { code: 200, message: 'success', data: ['tag_user_daily','tag_user_snapshot','tag_user_monthly'] }
      case 'ds-1002': return { code: 200, message: 'success', data: ['user_profile','user_ext','user_tag'] }
      case 'ds-1003': return { code: 200, message: 'success', data: ['events','events_archive'] }
      default: return { code: 200, message: 'success', data: [] }
    }
  }
  // GET /api/v1/data-sources/:id/tables/:table/fields
  if (url.match(/\/api\/v1\/data-sources\/[^/]+\/tables\/[^/]+\/fields$/) && upperMethod === 'GET') {
    const parts = url.split('/')
    const id = parts[4]
    const table = parts[6]
    const key = `${id}/${table}`
    const fields = __tableFields[key] || []
    return { code: 200, message: 'success', data: fields }
  }
  // POST /api/v1/tag-tables/check-uniqueness
  if (url === '/api/v1/tag-tables/check-uniqueness' && upperMethod === 'POST') {
    const { dataSourceId, tableName, fields = [] } = data || {}
    const key = `${dataSourceId}/${tableName}`
    const sampleLen = (__tableFields[key] || []).length || 10
    // 简单评分：身份证/手机号优先得分高
    const f = String(fields[0] || '').toLowerCase()
    let score = 70
    if (/id_card|idcard/.test(f)) {score = 98}
    else if (/mobile|phone|msisdn/.test(f)) {score = 95}
    else if (/device_id|imei|idfa/.test(f)) {score = 90}
    else if (/email/.test(f)) {score = 85}
    else {score = 75}
    return { code: 200, message: 'success', data: { score, sampleSize: sampleLen, field: fields[0] || '' } }
  }
  // 默认
  return { code: 404, message: 'not_found', data: null }
}

/**
 * 处理预警规则相关 API
 * @param {string} url 请求 URL
 * @param {string} method 请求方法
 * @param {Object} params 查询参数
 * @param {Object} data 请求数据
 * @returns {Object} 响应数据
 */
function handleAlertRulesAPI(url, method, params, data) {
  const upperMethod = method.toUpperCase()

  // 列表
  if (url === '/api/alert-rules' && upperMethod === 'GET') {
    const { page = 1, pageSize = 20, search, type, enabled } = params
    let list = [...mockAlertRules]

    if (search) {
      const s = String(search).toLowerCase()
      list = list.filter(r => r.name.toLowerCase().includes(s) || (r.description || '').toLowerCase().includes(s))
    }
    if (type) {
      list = list.filter(r => r.type === type)
    }
    if (enabled !== undefined) {
      const v = enabled === 'true' || enabled === true
      list = list.filter(r => r.enabled === v)
    }

    const total = list.length
    const start = (page - 1) * pageSize
    const end = start + pageSize
    const records = list.slice(start, end)

    return {
      code: 200,
      message: 'success',
      data: { records, total, page: parseInt(page, 10), pageSize: parseInt(pageSize, 10) }
    }
  }

  // 详情
  if (url.match(/\/api\/alert-rules\/\d+$/) && upperMethod === 'GET') {
    const id = parseInt(url.split('/', 10).pop(), 10)
    const rule = mockAlertRules.find(item => item.id === id)
    if (!rule) {throw new Error('预警规则不存在')}
    return { code: 200, message: 'success', data: rule }
  }

  // 创建
  if (url === '/api/alert-rules' && upperMethod === 'POST') {
    const newRule = {
      id: Date.now(),
      enabled: true,
      triggerCount: 0,
      lastTriggerTime: null,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      ...data
    }
    mockAlertRules.push(newRule)
    return { code: 200, message: '创建成功', data: newRule }
  }

  // 更新
  if (url.match(/\/api\/alert-rules\/\d+$/) && upperMethod === 'PUT') {
    const id = parseInt(url.split('/', 10).pop(), 10)
    const index = mockAlertRules.findIndex(item => item.id === id)
    if (index === -1) {throw new Error('预警规则不存在')}
    mockAlertRules[index] = { ...mockAlertRules[index], ...data }
    return { code: 200, message: '更新成功', data: mockAlertRules[index] }
  }

  // 删除
  if (url.match(/\/api\/alert-rules\/\d+$/) && upperMethod === 'DELETE') {
    const id = parseInt(url.split('/', 10).pop(), 10)
    const index = mockAlertRules.findIndex(item => item.id === id)
    if (index === -1) {throw new Error('预警规则不存在')}
    mockAlertRules.splice(index, 1)
    return { code: 200, message: '删除成功', data: null }
  }

  // 启用/禁用
  if (url.match(/\/api\/alert-rules\/\d+\/toggle$/) && upperMethod === 'PUT') {
    const id = parseInt(url.split('/', 10)[3], 10)
    const rule = mockAlertRules.find(item => item.id === id)
    if (!rule) {throw new Error('预警规则不存在')}
    rule.enabled = !rule.enabled
    return { code: 200, message: rule.enabled ? '已启用' : '已禁用', data: rule }
  }

  throw new Error('API 接口不存在')
}

/**
 * 处理特征管理相关 API
 */
// 特征管理内存数据
let __variablesMemory = null
const __variableTypes = ['numerical', 'categorical', 'text', 'datetime', 'boolean']
const __variableStatuses = ['draft', 'pending', 'active', 'inactive', 'expired']
const __dataSources = [
  { id: 'ds_001', name: '用户基础信息表' },
  { id: 'ds_002', name: '订单数据表' },
  { id: 'ds_003', name: '行为日志表' },
  { id: 'ds_004', name: '风控数据表' }
]

function initVariablesMemory() {
  if (Array.isArray(__variablesMemory)) {return}
  const list = []
  for (let i = 1; i <= 50; i++) {
    const type = __variableTypes[Math.floor(Math.random() * __variableTypes.length)]
    const status = __variableStatuses[Math.floor(Math.random() * __variableStatuses.length)]
    const ds = __dataSources[Math.floor(Math.random() * __dataSources.length)]
    list.push({
      id: `var_${String(i).padStart(3, '0')}`,
      name: `特征${i}`,
      code: `var_code_${i}`,
      type,
      status,
      dataSource: ds.id,
      dataSourceName: ds.name,
      dataQuality: Math.floor(80 + Math.random() * 20),
      missingRate: Math.floor(Math.random() * 5),
      creator: `用户${i}`,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      description: `这是特征${i}的描述信息`
    })
  }
  __variablesMemory = list
}

function handleVariablesAPI(url, method, params, data) {
  const upperMethod = method.toUpperCase()
  initVariablesMemory()

  // 列表
  if (url === '/api/variables' && upperMethod === 'GET') {
    const { page = 1, pageSize = 20, keyword = '', type = '', status = '' } = params
    let list = [...__variablesMemory]

    if (keyword) {
      const k = String(keyword).toLowerCase()
      list = list.filter(v =>
        String(v.name).toLowerCase().includes(k) ||
        String(v.code).toLowerCase().includes(k) ||
        String(v.description).toLowerCase().includes(k)
      )
    }
    if (type) {
      list = list.filter(v => v.type === type)
    }
    if (status) {
      list = list.filter(v => v.status === status)
    }

    const total = list.length
    const start = (page - 1) * pageSize
    const end = start + pageSize
    const pageList = list.slice(start, end)

    return {
      code: 200,
      message: 'success',
      data: { list: pageList, total, page: parseInt(page, 10), pageSize: parseInt(pageSize, 10) }
    }
  }

  // 创建
  if (url === '/api/variables' && upperMethod === 'POST') {
    const ds = __dataSources.find(s => s.id === data.dataSource) || __dataSources[0]
    const newItem = {
      id: `var_${Date.now()}`,
      name: data.name,
      code: data.code,
      type: data.type || __variableTypes[0],
      status: data.status || 'draft',
      dataSource: ds.id,
      dataSourceName: ds.name,
      dataQuality: Number(data.dataQuality ?? 90),
      missingRate: Number(data.missingRate ?? 0),
      usageCount: Number(data.usageCount ?? 0),
      sourceField: data.sourceField || '',
      updateFrequency: data.updateFrequency || '',
      uniqueValueCount: Number(data.uniqueValueCount ?? 0),
      definition: data.definition || '',
      creator: data.creator || '系统',
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      description: data.description || ''
    }
    __variablesMemory.unshift(newItem)
    return { code: 200, message: '特征创建成功', data: newItem }
  }

  // 批量导入
  if (url === '/api/variables/batch-import' && upperMethod === 'POST') {
    const records = Array.isArray(data.records) ? data.records : []
    let count = 0
    records.forEach(r => {
      const ds = __dataSources.find(s => s.id === r.dataSource) || __dataSources[0]
      const item = {
        id: `var_${Date.now()}_${Math.floor(Math.random()*10000)}`,
        name: r.name,
        code: r.code,
        type: r.type || __variableTypes[0],
        status: r.status || 'draft',
        dataSource: ds.id,
        dataSourceName: ds.name,
        dataQuality: Number(r.dataQuality ?? 90),
        missingRate: Number(r.missingRate ?? 0),
        usageCount: Number(r.usageCount ?? 0),
        sourceField: r.sourceField || '',
        updateFrequency: r.updateFrequency || '',
        uniqueValueCount: Number(r.uniqueValueCount ?? 0),
        definition: r.definition || '',
        creator: r.creator || '系统',
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        description: r.description || ''
      }
      __variablesMemory.unshift(item)
      count++
    })
    return { code: 200, message: 'success', data: { success: true, count } }
  }

  // 增量导入
  if (url === '/api/variables/incremental-import' && upperMethod === 'POST') {
    const records = Array.isArray(data.records) ? data.records : []
    let count = 0
    records.forEach(r => {
      const idx = __variablesMemory.findIndex(v => v.code === r.code)
      if (idx !== -1) {
        const ds = __dataSources.find(s => s.id === r.dataSource) || __dataSources[0]
        __variablesMemory[idx] = {
          ...__variablesMemory[idx],
          ...r,
          dataSource: ds.id,
          dataSourceName: ds.name,
          updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
        }
      } else {
        const ds = __dataSources.find(s => s.id === r.dataSource) || __dataSources[0]
        const item = {
          id: `var_${Date.now()}_${Math.floor(Math.random()*10000)}`,
          name: r.name,
          code: r.code,
          type: r.type || __variableTypes[0],
          status: r.status || 'draft',
          dataSource: ds.id,
          dataSourceName: ds.name,
          dataQuality: Number(r.dataQuality ?? 90),
          missingRate: Number(r.missingRate ?? 0),
          usageCount: Number(r.usageCount ?? 0),
          sourceField: r.sourceField || '',
          updateFrequency: r.updateFrequency || '',
          uniqueValueCount: Number(r.uniqueValueCount ?? 0),
          definition: r.definition || '',
          creator: r.creator || '系统',
          createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
          description: r.description || ''
        }
        __variablesMemory.unshift(item)
      }
      count++
    })
    return { code: 200, message: 'success', data: { success: true, count } }
  }

  // 详情
  if (url.match(/\/api\/variables\/[^/]+$/) && upperMethod === 'GET') {
    const id = url.split('/').pop()
    const variable = __variablesMemory.find(v => v.id === id)
    if (!variable) {
      return { code: 404, message: '未找到特征', data: null }
    }
    return { code: 200, message: 'success', data: variable }
  }

  // 更新
  if (url.match(/\/api\/variables\/[^/]+$/) && upperMethod === 'PUT') {
    const id = url.split('/').pop()
    const idx = __variablesMemory.findIndex(v => v.id === id)
    if (idx === -1) {
      return { code: 404, message: '未找到特征', data: null }
    }
    const ds = __dataSources.find(s => s.id === data.dataSource) || __dataSources[0]
    __variablesMemory[idx] = {
      ...__variablesMemory[idx],
      ...data,
      dataSource: ds.id,
      dataSourceName: ds.name,
      updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
    }
    return { code: 200, message: '特征更新成功', data: __variablesMemory[idx] }
  }

  // 删除
  if (url.match(/\/api\/variables\/[^/]+$/) && upperMethod === 'DELETE') {
    const id = url.split('/').pop()
    const beforeLen = __variablesMemory.length
    __variablesMemory = __variablesMemory.filter(v => v.id !== id)
    const success = __variablesMemory.length < beforeLen
    return { code: success ? 200 : 404, message: success ? '特征删除成功' : '未找到特征', data: null }
  }

  // 更新状态
  if (url.match(/\/api\/variables\/[^/]+\/status$/) && upperMethod === 'PATCH') {
    const parts = url.split('/')
    const id = parts[3]
    const idx = __variablesMemory.findIndex(v => v.id === id)
    if (idx === -1) {
      return { code: 404, message: '未找到特征', data: null }
    }
    __variablesMemory[idx].status = data.status
    __variablesMemory[idx].updatedAt = new Date().toISOString().replace('T', ' ').substring(0, 19)
    return { code: 200, message: '状态更新成功', data: __variablesMemory[idx] }
  }

  // 数据源列表
  if (url === '/api/data-sources' && upperMethod === 'GET') {
    return { code: 200, message: 'success', data: __dataSources }
  }

  throw new Error('API 接口不存在')
}

/**
 * 处理特征地图相关 API
 */
function handleVariableMapAPI(url, method, params, data) {
  const upperMethod = method.toUpperCase()

  // 图谱
  if (url === '/api/variable-map/graph' && upperMethod === 'GET') {
    initVariablesMemory()
    const nodes = (__variablesMemory || []).map((v, idx) => ({
      id: v.id,
      label: v.name,
      name: v.name,
      type: v.type,
      status: v.status,
      description: v.description || '',
      quality: Number(v.dataQuality ?? 0),
      usageCount: Number(v.usageCount ?? 0),
      x: 80 * ((idx % 6) + 1),
      y: 70 * (Math.floor(idx / 6) + 1)
    }))
    const edges = []
    for (let i = 1; i < nodes.length; i++) {
      edges.push({ id: `e${nodes[i-1].id}_${nodes[i].id}`, source: nodes[i-1].id, target: nodes[i].id, type: 'dependency', strength: 0.6 })
    }
    return { code: 200, message: 'success', data: { nodes, edges } }
  }

  // 血缘
  if (url.match(/\/api\/variable-map\/lineage\/[^/]+$/) && upperMethod === 'GET') {
    const id = url.split('/').pop()
    const current = { id, name: `特征${id}`, type: 'numerical', status: 'active' }
    return { code: 200, message: 'success', data: { upstream: [], downstream: [], current } }
  }

  // 路径分析
  if (url === '/api/variable-map/path-analysis' && upperMethod === 'GET') {
    return { code: 200, message: 'success', data: { paths: [], total: 0 } }
  }

  // 影响分析
  if (url.match(/\/api\/variable-map\/impact-analysis\/[^/]+$/) && upperMethod === 'GET') {
    return { code: 200, message: 'success', data: { affectedVariables: [], affectedReports: [], affectedDashboards: [], riskLevel: 'low', totalImpact: 0 } }
  }

  // 关系类型
  if (url === '/api/variable-map/relation-types' && upperMethod === 'GET') {
    return { code: 200, message: 'success', data: ['dependency', 'derivation', 'aggregation'] }
  }

  // 依赖关系
  if (url.match(/\/api\/variable-map\/dependencies\/[^/]+$/) && upperMethod === 'GET') {
    return { code: 200, message: 'success', data: [] }
  }

  throw new Error('API 接口不存在')
}

// 为兼容 axios 风格的调用，提供 request.get/post/put/delete/patch 方法
request.get = (url, options = {}) => {
  const { params = {}, headers = {} } = options
  return request({ url, method: 'GET', params, headers })
}
request.post = (url, data = {}, options = {}) => {
  const { params = {}, headers = {} } = options
  return request({ url, method: 'POST', params, data, headers })
}
request.put = (url, data = {}, options = {}) => {
  const { params = {}, headers = {} } = options
  return request({ url, method: 'PUT', params, data, headers })
}
request.delete = (url, options = {}) => {
  const { params = {}, headers = {} } = options
  return request({ url, method: 'DELETE', params, headers })
}
request.patch = (url, data = {}, options = {}) => {
  const { params = {}, headers = {} } = options
  return request({ url, method: 'PATCH', params, data, headers })
}
