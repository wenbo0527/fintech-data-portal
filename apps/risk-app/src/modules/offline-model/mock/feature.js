/**
 * 特征中心Mock数据服务
 */

// 特征类型定义
const FEATURE_TYPES = {
  NUMERICAL: 'numerical',
  CATEGORICAL: 'categorical',
  TEXT: 'text',
  TIME: 'time'
}

// 特征状态定义
const FEATURE_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  DRAFT: 'draft',
  PENDING: 'pending',
  EXPIRED: 'expired'
}

// 模拟特征数据
const mockFeatures = [
  {
    id: 1,
    name: '用户年龄',
    code: 'user_age',
    type: FEATURE_TYPES.NUMERICAL,
    description: '用户的年龄信息',
    majorCategory: 'credit',
    level1: 'credit_report',
    level2: 'query_count',
    status: FEATURE_STATUS.ACTIVE,
    createTime: '2024-01-15 10:30:00',
    creator: '张三',
    dataSource: '用户注册信息',
    updateFrequency: '每日',
    dataQuality: 95.2,
    missingRate: 0.8,
    uniqueValueCount: 1200,
    modelType: 'daily',
    defaultValue: '0',
    // 关联变量中心特征编码（为空表示尚未在变量中心注册）
    midloanFeatureId: ''
  },
  {
    id: 2,
    name: '用户性别',
    code: 'user_gender',
    type: FEATURE_TYPES.CATEGORICAL,
    description: '用户的性别信息',
    majorCategory: 'credit',
    level1: 'credit_report',
    level2: 'overdue_count',
    status: FEATURE_STATUS.ACTIVE,
    createTime: '2024-01-16 14:20:00',
    creator: '李四',
    dataSource: '用户注册信息',
    updateFrequency: '一次性',
    dataQuality: 99.1,
    missingRate: 0.2,
    uniqueValueCount: 3,
    modelType: 'other',
    defaultValue: '未知'
  },
  {
    id: 3,
    name: '用户收入',
    code: 'user_income',
    type: FEATURE_TYPES.NUMERICAL,
    description: '用户的月收入信息',
    majorCategory: 'credit',
    level1: 'credit_history',
    level2: 'loan_times',
    status: FEATURE_STATUS.PENDING,
    createTime: '2024-01-17 09:15:00',
    creator: '王五',
    dataSource: '用户调查问卷',
    updateFrequency: '每月',
    dataQuality: 87.5,
    missingRate: 15.3,
    uniqueValueCount: 850,
    modelType: 'monthly',
    defaultValue: '-1',
    // 已关联到变量中心特征 MIDLOAN-FEAT-0001（近30日大额交易次数）
    midloanFeatureId: 'MIDLOAN-FEAT-0001'
  },
  {
    id: 4,
    name: '用户职业',
    code: 'user_occupation',
    type: FEATURE_TYPES.CATEGORICAL,
    description: '用户的职业类别',
    majorCategory: 'behavior',
    level1: 'activity',
    level2: 'session_count',
    status: FEATURE_STATUS.ACTIVE,
    createTime: '2024-01-18 16:45:00',
    creator: '赵六',
    dataSource: '用户注册信息',
    updateFrequency: '按需',
    dataQuality: 92.8,
    missingRate: 5.2,
    uniqueValueCount: 25,
    modelType: 'other',
    defaultValue: 'N/A'
  },
  {
    id: 5,
    name: '用户评论内容',
    code: 'user_review_text',
    type: FEATURE_TYPES.TEXT,
    description: '用户的产品评论内容',
    majorCategory: 'behavior',
    level1: 'transaction_behavior',
    level2: 'frequency',
    status: FEATURE_STATUS.DRAFT,
    createTime: '2024-01-19 11:30:00',
    creator: '钱七',
    dataSource: '用户评论系统',
    updateFrequency: '实时',
    dataQuality: 88.9,
    missingRate: 25.6,
    uniqueValueCount: 15000,
    modelType: 'daily',
    defaultValue: ''
  }
  ,
  {
    id: 6,
    name: '模型分',
    code: 'score',
    type: FEATURE_TYPES.NUMERICAL,
    description: '模型输出风险评分（模型分）',
    status: FEATURE_STATUS.ACTIVE,
    createTime: '2024-02-01 09:00:00',
    creator: '系统',
    dataSource: '平台模型输出',
    updateFrequency: '按需',
    dataQuality: 99.0,
    missingRate: 0.0,
    uniqueValueCount: 10000,
    level1: 'model_outputs',
    level2: 'credit_score_service',
    modelType: 'other',
    defaultValue: '0.0'
  }
  ,
  {
    id: 7,
    name: '征信查询次数',
    code: 'credit_query_count',
    type: FEATURE_TYPES.NUMERICAL,
    description: '征信报告中的近半年征信查询次数',
    status: FEATURE_STATUS.ACTIVE,
    createTime: '2024-02-10 10:00:00',
    creator: '风控',
    dataSource: '征信报告',
    updateFrequency: '月度',
    dataQuality: 96.5,
    missingRate: 1.2,
    uniqueValueCount: 300,
    majorCategory: 'credit',
    level1: 'credit_report',
    level2: 'query_count',
    modelType: 'monthly',
    defaultValue: '0'
  }
  ,
  {
    id: 8,
    name: '征信逾期次数',
    code: 'credit_overdue_count',
    type: FEATURE_TYPES.NUMERICAL,
    description: '征信报告中的历史逾期次数',
    status: FEATURE_STATUS.ACTIVE,
    createTime: '2024-02-11 10:00:00',
    creator: '风控',
    dataSource: '征信报告',
    updateFrequency: '月度',
    dataQuality: 93.2,
    missingRate: 2.8,
    uniqueValueCount: 200,
    majorCategory: 'credit',
    level1: 'credit_report',
    level2: 'overdue_count',
    modelType: 'monthly',
    defaultValue: '0'
  }
  ,
  {
    id: 9,
    name: '贷款次数',
    code: 'loan_times',
    type: FEATURE_TYPES.NUMERICAL,
    description: '信贷记录中的贷款次数',
    status: FEATURE_STATUS.ACTIVE,
    createTime: '2024-02-12 11:00:00',
    creator: '风控',
    dataSource: '信贷记录',
    updateFrequency: '月度',
    dataQuality: 95.1,
    missingRate: 1.1,
    uniqueValueCount: 150,
    majorCategory: 'credit',
    level1: 'credit_history',
    level2: 'loan_times',
    modelType: 'monthly',
    defaultValue: '0'
  }
  ,
  {
    id: 10,
    name: '还款比率',
    code: 'repay_ratio',
    type: FEATURE_TYPES.NUMERICAL,
    description: '信贷记录中的还款比率',
    status: FEATURE_STATUS.ACTIVE,
    createTime: '2024-02-12 11:10:00',
    creator: '风控',
    dataSource: '信贷记录',
    updateFrequency: '月度',
    dataQuality: 94.3,
    missingRate: 1.5,
    uniqueValueCount: 120,
    majorCategory: 'credit',
    level1: 'credit_history',
    level2: 'repay_ratio',
    modelType: 'monthly',
    defaultValue: '0.0'
  }
  ,
  {
    id: 11,
    name: '平均交易额',
    code: 'avg_amount',
    type: FEATURE_TYPES.NUMERICAL,
    description: '用户近三个月的平均交易金额',
    status: FEATURE_STATUS.ACTIVE,
    createTime: '2024-02-13 09:30:00',
    creator: '数据',
    dataSource: '交易行为',
    updateFrequency: '日度',
    dataQuality: 97.8,
    missingRate: 0.5,
    uniqueValueCount: 5000,
    majorCategory: 'behavior',
    level1: 'transaction_behavior',
    level2: 'avg_amount',
    modelType: 'daily',
    defaultValue: '0.0'
  }
  ,
  {
    id: 12,
    name: '交易频次',
    code: 'frequency',
    type: FEATURE_TYPES.NUMERICAL,
    description: '用户近一周的交易次数',
    status: FEATURE_STATUS.ACTIVE,
    createTime: '2024-02-13 10:00:00',
    creator: '数据',
    dataSource: '交易行为',
    updateFrequency: '日度',
    dataQuality: 98.2,
    missingRate: 0.3,
    uniqueValueCount: 800,
    majorCategory: 'behavior',
    level1: 'transaction_behavior',
    level2: 'frequency',
    modelType: 'daily',
    defaultValue: '0'
  }
  ,
  {
    id: 13,
    name: '登录天数',
    code: 'login_days',
    type: FEATURE_TYPES.NUMERICAL,
    description: '用户近一月登录天数',
    status: FEATURE_STATUS.ACTIVE,
    createTime: '2024-02-14 08:20:00',
    creator: '产品',
    dataSource: '活跃度',
    updateFrequency: '日度',
    dataQuality: 96.9,
    missingRate: 0.7,
    uniqueValueCount: 31,
    majorCategory: 'behavior',
    level1: 'activity',
    level2: 'login_days',
    modelType: 'daily',
    defaultValue: '0'
  }
  ,
  {
    id: 14,
    name: '会话次数',
    code: 'session_count',
    type: FEATURE_TYPES.NUMERICAL,
    description: '近一周会话次数',
    status: FEATURE_STATUS.ACTIVE,
    createTime: '2024-02-14 09:00:00',
    creator: '产品',
    dataSource: '活跃度',
    updateFrequency: '日度',
    dataQuality: 97.3,
    missingRate: 0.6,
    uniqueValueCount: 500,
    majorCategory: 'behavior',
    level1: 'activity',
    level2: 'session_count',
    modelType: 'daily',
    defaultValue: '0'
  }
]

// 特征统计信息
const featureStats = {
  totalFeatures: mockFeatures.length,
  activeFeatures: mockFeatures.filter(f => f.status === FEATURE_STATUS.ACTIVE).length,
  pendingFeatures: mockFeatures.filter(f => f.status === FEATURE_STATUS.PENDING).length,
  expiredFeatures: mockFeatures.filter(f => f.status === FEATURE_STATUS.EXPIRED).length,
  byType: {
    numerical: mockFeatures.filter(f => f.type === FEATURE_TYPES.NUMERICAL).length,
    categorical: mockFeatures.filter(f => f.type === FEATURE_TYPES.CATEGORICAL).length,
    text: mockFeatures.filter(f => f.type === FEATURE_TYPES.TEXT).length,
    time: mockFeatures.filter(f => f.type === FEATURE_TYPES.TIME).length
  },
  byModelType: {
    daily: mockFeatures.filter(f => f.modelType === 'daily').length,
    monthly: mockFeatures.filter(f => f.modelType === 'monthly').length,
    other: mockFeatures.filter(f => f.modelType === 'other').length
  }
}

/**
 * 获取特征列表
 */
export function getFeatures(params = {}) {
  const { name = '', type = '', status = '', majorCategory = '', level1 = '', level2 = '', page = 1, pageSize = 10 } = params
  
  let filteredFeatures = [...mockFeatures]
  
  // 按名称筛选
  if (name) {
    filteredFeatures = filteredFeatures.filter(f => 
      f.name.toLowerCase().includes(name.toLowerCase()) ||
      f.code.toLowerCase().includes(name.toLowerCase())
    )
  }
  
  // 按类型筛选
  if (type) {
    filteredFeatures = filteredFeatures.filter(f => f.type === type)
  }
  // 按业务大类筛选
  if (majorCategory) {
    filteredFeatures = filteredFeatures.filter(f => f.majorCategory === majorCategory)
  }
  // 按一级分类筛选
  if (level1) {
    filteredFeatures = filteredFeatures.filter(f => f.level1 === level1)
  }
  // 按二级分类筛选
  if (level2) {
    filteredFeatures = filteredFeatures.filter(f => f.level2 === level2)
  }
  
  // 按状态筛选
  if (status) {
    if (status === 'inactive') {
      filteredFeatures = filteredFeatures.filter(f => f.status !== 'active')
    } else {
      filteredFeatures = filteredFeatures.filter(f => f.status === status)
    }
  }
  
  // 分页
  const start = (page - 1) * pageSize
  const end = start + pageSize
  const paginatedFeatures = filteredFeatures.slice(start, end)
  
  return {
    data: paginatedFeatures,
    total: filteredFeatures.length,
    page,
    pageSize
  }
}

/**
 * 获取特征详情
 */
export function getFeatureDetail(id) {
  return mockFeatures.find(f => f.id === parseInt(id))
}

/**
 * 步骤四『映射到特征中心』下拉框模糊搜索（模块B P1）
 * @param {string} keyword - 搜索关键词（按名称 / 描述模糊匹配，不区分大小写）
 * @param {number} page - 页码，默认 1
 * @param {number} pageSize - 每页条数，默认 50
 * 行为约定：
 *   - keyword 为空时返回全量列表（按 pageSize 截取）
 *   - 不区分大小写
 *   - 匹配字段：name、description、code
 *   - 返回空数组时下拉框展示『无匹配特征』
 */
export function searchFeatures(keyword = '', page = 1, pageSize = 50) {
  const kw = (keyword || '').trim().toLowerCase()
  let list = [...mockFeatures]
  if (kw) {
    list = list.filter(f =>
      (f.name || '').toLowerCase().includes(kw) ||
      (f.code || '').toLowerCase().includes(kw) ||
      (f.description || '').toLowerCase().includes(kw)
    )
  }
  const start = (page - 1) * pageSize
  const end = start + pageSize
  return {
    data: list.slice(start, end),
    total: list.length,
    page,
    pageSize,
    keyword
  }
}

/**
 * 默认值转化配置
 */
const defaultValueTransformConfig = {
  'N/A': null,
  'NULL': null,
  '': null,
  '未知': null,
  '未填写': null,
  '缺省': null
}

/**
 * 应用默认值转化
 */
const transformDefaultValue = (value) => {
  if (value in defaultValueTransformConfig) {
    return defaultValueTransformConfig[value]
  }
  return value
}

/**
 * 创建新特征
 */
export function createFeature(featureData) {
  const newFeature = {
    id: mockFeatures.length + 1,
    ...featureData,
    createTime: new Date().toLocaleString('zh-CN'),
    creator: featureData.creator || '当前用户',
    status: FEATURE_STATUS.DRAFT,
    modelType: featureData.updateFrequency && featureData.updateFrequency.includes('日') ? 'daily' : 
               featureData.updateFrequency && featureData.updateFrequency.includes('月') ? 'monthly' : 'other',
    defaultValue: transformDefaultValue(featureData.defaultValue || '')
  }
  mockFeatures.push(newFeature)
  return newFeature
}

/**
 * 更新特征
 */
export function updateFeature(id, featureData) {
  const index = mockFeatures.findIndex(f => f.id === parseInt(id))
  if (index !== -1) {
    mockFeatures[index] = { 
      ...mockFeatures[index], 
      ...featureData,
      defaultValue: transformDefaultValue(featureData.defaultValue || mockFeatures[index].defaultValue || '')
    }
    return mockFeatures[index]
  }
  return null
}

/**
 * 删除特征
 */
export function deleteFeature(id) {
  const index = mockFeatures.findIndex(f => f.id === parseInt(id))
  if (index !== -1) {
    const deleted = mockFeatures.splice(index, 1)[0]
    return deleted
  }
  return null
}

/**
 * 获取特征统计信息
 */
export function getFeatureStats() {
  return featureStats
}

/**
 * 批量导入特征
 */
export function importFeatures(featuresData) {
  const importedFeatures = featuresData.map((feature, index) => ({
    id: mockFeatures.length + index + 1,
    ...feature,
    createTime: new Date().toLocaleString('zh-CN'),
    creator: '批量导入',
    status: FEATURE_STATUS.DRAFT
  }))
  
  mockFeatures.push(...importedFeatures)
  return importedFeatures
}

/**
 * 导出特征数据
 */
export function exportFeatures(params = {}) {
  const { data } = getFeatures(params)
  return data.map(feature => ({
    特征名称: feature.name,
    特征编码: feature.code,
    特征类型: feature.type,
    描述: feature.description,
    状态: feature.status,
    创建时间: feature.createTime,
    创建人: feature.creator,
    数据源: feature.dataSource,
    更新频率: feature.updateFrequency,
    数据质量: feature.dataQuality,
    缺失率: feature.missingRate,
    唯一值数量: feature.uniqueValueCount
  }))
}

/**
 * 获取特征类型列表
 */
export function getFeatureTypes() {
  return [
    { value: FEATURE_TYPES.NUMERICAL, label: '数值型' },
    { value: FEATURE_TYPES.CATEGORICAL, label: '分类型' },
    { value: FEATURE_TYPES.TEXT, label: '文本型' },
    { value: FEATURE_TYPES.TIME, label: '时间型' }
  ]
}

/**
 * 获取特征状态列表
 */
export function getFeatureStatus() {
  return [
    { value: FEATURE_STATUS.ACTIVE, label: '有效' },
    { value: FEATURE_STATUS.INACTIVE, label: '无效' },
    { value: FEATURE_STATUS.DRAFT, label: '草稿' },
    { value: FEATURE_STATUS.PENDING, label: '待审核' },
    { value: FEATURE_STATUS.EXPIRED, label: '已过期' }
  ]
}

/**
 * 获取特征列表按模型类型（先过滤再分页，避免分页后过滤丢数据）
 */
export function getFeaturesByModelType(modelType, params = {}) {
  const { name = '', type = '', status = '', majorCategory = '', level1 = '', level2 = '', page = 1, pageSize = 10 } = params

  let filteredFeatures = [...mockFeatures]

  // 按名称筛选
  if (name) {
    filteredFeatures = filteredFeatures.filter(f =>
      f.name.toLowerCase().includes(name.toLowerCase()) ||
      f.code.toLowerCase().includes(name.toLowerCase())
    )
  }
  // 按类型筛选
  if (type) {
    filteredFeatures = filteredFeatures.filter(f => f.type === type)
  }
  // 按业务大类筛选
  if (majorCategory) {
    filteredFeatures = filteredFeatures.filter(f => f.majorCategory === majorCategory)
  }
  // 按一级分类筛选
  if (level1) {
    filteredFeatures = filteredFeatures.filter(f => f.level1 === level1)
  }
  // 按二级分类筛选
  if (level2) {
    filteredFeatures = filteredFeatures.filter(f => f.level2 === level2)
  }
  // 按状态筛选
  if (status) {
    if (status === 'inactive') {
      filteredFeatures = filteredFeatures.filter(f => f.status !== 'active')
    } else {
      filteredFeatures = filteredFeatures.filter(f => f.status === status)
    }
  }

  // 先按模型类型过滤
  filteredFeatures = filteredFeatures.filter(f => f.modelType === modelType)

  // 再分页
  const start = (page - 1) * pageSize
  const end = start + pageSize
  const paginatedFeatures = filteredFeatures.slice(start, end)

  return {
    data: paginatedFeatures,
    total: filteredFeatures.length,
    page,
    pageSize
  }
}

/**
 * 获取模型类型列表
 */
export function getModelTypes() {
  return [
    { value: 'daily', label: '日模型' },
    { value: 'monthly', label: '月模型' },
    { value: 'other', label: '其他模型' }
  ];
}

export default {
  getFeatures,
  getFeatureDetail,
  createFeature,
  updateFeature,
  deleteFeature,
  getFeatureStats,
  importFeatures,
  exportFeatures,
  getFeatureTypes,
  getFeatureStatus,
  getModelTypes,
  getFeaturesByModelType,
  searchFeatures,
  listTables,
  getTableColumns,
  getTableMeta,
  setTableMeta,
  getRegisteredFields,
  getUnregisteredFields,
  batchRegisterFields,
  listDatabases,
  listTablesByDb
}

const mockTables = [
  {
    name: 'user_profile',
    type: 'snapshot',
    primaryKey: 'user_id',
    partitionFields: ['update_time'],
    description: '用户画像快照表',
    columns: [
      { name: 'user_id', type: 'string' },
      { name: 'cert_no', type: 'string' },
      { name: 'flow_id', type: 'string' },
      { name: 'report_id', type: 'string' },
      { name: 'age', type: 'int' },
      { name: 'gender', type: 'string' },
      { name: 'income', type: 'double' },
      { name: 'credit_history', type: 'int' },
      { name: 'credit_score', type: 'double' },
      { name: 'score', type: 'double' },
      { name: 'risk_value', type: 'double' },
      { name: 'purchase_frequency', type: 'int' },
      { name: 'avg_order_value', type: 'double' },
      { name: 'update_time', type: 'timestamp' }
    ],
    registered: ['age', 'gender'],
    registeredDetails: [
      {
        name: 'age',
        type: 'int',
        level1: 'credit_report',
        level2: 'query_count',
        cnName: '年龄',
        onlineTime: '2024-01-15',
        dataType: 'int',
        defaultValue: '0',
        businessLogic: '取用户基础信息年龄',
        sqlLogic: "SELECT age FROM user_profile WHERE user_id = '${user_id}' AND dt = '${dt}';",
        processingLogic: '取用户基础信息年龄',
        batch: '20240115',
        remark: '基础属性'
      },
      {
        name: 'gender',
        type: 'string',
        level1: 'credit_report',
        level2: 'overdue_count',
        cnName: '性别',
        onlineTime: '2024-01-15',
        dataType: 'string',
        defaultValue: '',
        businessLogic: '取用户基础信息性别',
        sqlLogic: "SELECT gender FROM user_profile WHERE user_id = '${user_id}' AND dt = '${dt}';",
        processingLogic: '取用户基础信息性别',
        batch: '20240115',
        remark: ''
      }
      ,
      {
        name: 'score',
        type: 'double',
        level1: 'model_outputs',
        level2: 'credit_score_service',
        cnName: '信用评分输出',
        onlineTime: '2024-02-01',
        dataType: 'double',
        defaultValue: '0.0',
        businessLogic: '来自信用评分模型服务的风险评分输出沉淀',
        sqlLogic: "INSERT OVERWRITE TABLE dwd_credit_score\nSELECT user_id, score, NOW() AS etl_time\nFROM   credit_score_service_output\nWHERE  dt = '${dt}';",
        processingLogic: '来自信用评分模型服务的风险评分输出沉淀',
        batch: '20240201',
        remark: '模型输出沉淀'
      },
      {
        name: 'risk_value',
        type: 'double',
        level1: 'model_outputs',
        level2: 'risk_regression_service',
        cnName: '风险值输出',
        onlineTime: '2024-02-01',
        dataType: 'double',
        defaultValue: '0.0',
        businessLogic: '来自风险回归模型服务的连续风险值输出沉淀',
        sqlLogic: "INSERT OVERWRITE TABLE dwd_risk_value\nSELECT user_id, risk_value, NOW() AS etl_time\nFROM   risk_regression_service_output\nWHERE  dt = '${dt}';",
        processingLogic: '来自风险回归模型服务的连续风险值输出沉淀',
        batch: '20240201',
        remark: '模型输出沉淀'
      }
    ]
  },
  {
    name: 'transactions',
    type: 'stream',
    primaryKey: 'tx_id',
    partitionFields: [],
    description: '交易流水表',
    columns: [
      { name: 'tx_id', type: 'string' },
      { name: 'user_id', type: 'string' },
      { name: 'loan_amount', type: 'double' },
      { name: 'amount', type: 'double' },
      { name: 'channel', type: 'string' },
      { name: 'tx_time', type: 'timestamp' }
    ],
    registered: ['amount', 'channel']
  },
  {
    name: 'user_status_hist',
    type: 'slow_change',
    primaryKey: 'user_id',
    partitionFields: ['start_date'],
    description: '用户状态拉链表',
    columns: [
      { name: 'user_id', type: 'string' },
      { name: 'status', type: 'string' },
      { name: 'start_date', type: 'date' },
      { name: 'end_date', type: 'date' }
    ],
    registered: ['status']
  }
]

export function listTables() {
  return mockTables.map(t => ({ name: t.name, type: t.type, description: t.description }))
}

export function getTableColumns(tableName) {
  const t = mockTables.find(x => x.name === tableName)
  return t ? t.columns : []
}

export function getTableMeta(tableName) {
  const t = mockTables.find(x => x.name === tableName)
  if (!t) return null
  return { name: t.name, type: t.type, primaryKey: t.primaryKey, description: t.description, partitionFields: t.partitionFields || [] }
}

export function setTableMeta(tableName, meta) {
  const t = mockTables.find(x => x.name === tableName)
  if (!t) return null
  t.type = meta.type || t.type
  t.primaryKey = meta.primaryKey || t.primaryKey
  t.description = meta.description || t.description
  t.partitionFields = Array.isArray(meta.partitionFields) ? meta.partitionFields : (t.partitionFields || [])
  return { name: t.name, type: t.type, primaryKey: t.primaryKey, description: t.description, partitionFields: t.partitionFields }
}

export function getRegisteredFields(tableName) {
  const t = mockTables.find(x => x.name === tableName)
  if (!t) return []
  if (t.registeredDetails && t.registeredDetails.length) {
    return t.registeredDetails
  }
  return t.registered.map(name => {
    const c = t.columns.find(col => col.name === name) || { name, type: '' }
    return c
  })
}

export function getUnregisteredFields(tableName) {
  const t = mockTables.find(x => x.name === tableName)
  if (!t) return []
  const set = new Set(t.registered || [])
  return t.columns.filter(c => !set.has(c.name))
}

export function batchRegisterFields(tableName, fields) {
  const t = mockTables.find(x => x.name === tableName)
  if (!t) return []
  const names = fields.map(f => (typeof f === 'string' ? f : f.name)).filter(Boolean)
  const set = new Set(t.registered || [])
  names.forEach(n => set.add(n))
  t.registered = Array.from(set)
  // 保存注册详情（增强字段信息）
  const details = fields.map(f => {
    if (typeof f === 'string') {
      const c = t.columns.find(col => col.name === f) || { name: f, type: '' }
      return { ...c, code: c.name, level1: '', level2: '', cnName: f, onlineTime: '', dataType: c.type || '', defaultValue: '', businessLogic: '', sqlLogic: '', processingLogic: '', batch: '', remark: '', sourceType: '', sourceRefId: '', lineage: null }
    }
    const c = t.columns.find(col => col.name === f.name) || { name: f.name, type: f.type || '' }
    return {
      name: c.name,
      type: c.type,
      code: f.code || c.name,
      level1: f.level1 || '',
      level2: f.level2 || '',
      cnName: f.cnName || c.name,
      onlineTime: f.onlineTime || '',
      dataType: f.dataType || c.type || '',
      defaultValue: transformDefaultValue(f.defaultValue || ''),
      businessLogic: f.businessLogic || '',
      sqlLogic: f.sqlLogic || '',
      processingLogic: f.processingLogic || f.businessLogic || f.sqlLogic || '',
      batch: f.batch || '',
      remark: f.remark || '',
      sourceType: f.sourceType || '',
      sourceRefId: f.sourceRefId || '',
      lineage: f.lineage || null
    }
  })
  t.registeredDetails = Array.isArray(t.registeredDetails) ? [...t.registeredDetails, ...details] : details
  return getRegisteredFields(tableName)
}

// 数据源库与表
const databasesBySource = {
  doris: ['risk_dw', 'risk_ods'],
  hive: ['risk_dm', 'risk_raw']
}
const tablesByDb = {
  risk_dw: ['user_profile', 'transactions'],
  risk_ods: ['user_status_hist'],
  risk_dm: ['user_profile'],
  risk_raw: ['transactions']
}

export function listDatabases(sourceType) {
  const list = databasesBySource[sourceType] || []
  return list.map(name => ({ name }))
}

export function listTablesByDb(sourceType, dbName) {
  const list = tablesByDb[dbName] || []
  return list.map(name => ({ name }))
}
