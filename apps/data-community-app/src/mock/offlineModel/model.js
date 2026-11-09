/**
 * 模型注册Mock数据服务
 */

// 模型类型定义
const MODEL_TYPES = {
  CLASSIFICATION: 'classification',
  REGRESSION: 'regression',
  CLUSTERING: 'clustering',
  DEEP_LEARNING: 'deep_learning'
}

// 算法框架定义
const FRAMEWORKS = {
  SKLEARN: 'sklearn',
  TENSORFLOW: 'tensorflow',
  PYTORCH: 'pytorch',
  XGBOOST: 'xgboost'
}

// 模型状态定义（仅：上线、归档）
const MODEL_STATUS = {
  ONLINE: 'online',
  ARCHIVED: 'archived'
}

// 模拟模型数据
const mockModels = [
  {
    id: 1,
    name: '信用评分模型',
    code: 'credit_score_model',
    type: MODEL_TYPES.CLASSIFICATION,
    framework: FRAMEWORKS.XGBOOST,
    version: 1,
    versionNumber: 1,
    versions: [1,2],
    description: '基于用户行为数据的信用评分预测模型',
    status: MODEL_STATUS.ONLINE,
    createTime: '2024-01-15 10:30:00',
    creator: '张三',
    trainingDataSize: 50000,
    modelSize: '25.6MB',
    trainingTime: '2小时30分钟',
    hyperparameters: {
      max_depth: 6,
      learning_rate: 0.1,
      n_estimators: 100
    },
    features: ['user_age', 'user_income', 'credit_history', 'employment_status'],
    modelPath: '/models/credit_score_model.pkl',
    lastUpdateTime: '2024-01-15 10:30:00'
  },
  {
    id: 2,
    name: '风险预测模型',
    code: 'risk_prediction_model',
    type: MODEL_TYPES.REGRESSION,
    framework: FRAMEWORKS.SKLEARN,
    version: 1,
    versionNumber: 1,
    versions: [1,2],
    description: '用户违约风险预测模型',
    status: MODEL_STATUS.ONLINE,
    createTime: '2024-01-16 14:20:00',
    creator: '李四',
    trainingDataSize: 35000,
    modelSize: '18.3MB',
    trainingTime: '1小时45分钟',
    hyperparameters: {
      C: 1.0,
      kernel: 'rbf',
      gamma: 'scale'
    },
    features: ['user_age', 'user_income', 'loan_amount', 'credit_score'],
    modelPath: '/models/risk_prediction_model.pkl',
    lastUpdateTime: '2024-01-16 14:20:00'
  },
  {
    id: 3,
    name: '客户分群模型',
    code: 'customer_clustering_model',
    type: MODEL_TYPES.CLUSTERING,
    framework: FRAMEWORKS.SKLEARN,
    version: 1,
    versionNumber: 1,
    versions: [1],
    description: '基于用户行为的客户分群模型',
    status: MODEL_STATUS.ARCHIVED,
    createTime: '2024-01-17 09:15:00',
    creator: '王五',
    trainingDataSize: 80000,
    modelSize: '32.1MB',
    trainingTime: '3小时15分钟',
    hyperparameters: {
      n_clusters: 5,
      max_iter: 300,
      n_init: 10
    },
    features: ['user_age', 'user_income', 'purchase_frequency', 'avg_order_value'],
    modelPath: '/models/customer_clustering_model.pkl',
    lastUpdateTime: '2024-01-17 09:15:00'
  },
  {
    id: 4,
    name: '图像识别模型',
    code: 'image_recognition_model',
    type: MODEL_TYPES.DEEP_LEARNING,
    framework: FRAMEWORKS.TENSORFLOW,
    version: 1,
    versionNumber: 1,
    versions: [1],
    description: '基于深度学习的图像识别模型',
    status: MODEL_STATUS.ARCHIVED,
    createTime: '2024-01-18 16:45:00',
    creator: '赵六',
    trainingDataSize: 120000,
    modelSize: '156.8MB',
    trainingTime: '8小时30分钟',
    hyperparameters: {
      learning_rate: 0.001,
      batch_size: 32,
      epochs: 50,
      dropout_rate: 0.3
    },
    features: ['image_pixels', 'image_channels', 'image_size'],
    modelPath: '/models/image_recognition_model.h5',
    lastUpdateTime: '2024-01-18 16:45:00',
    errorMessage: ''
  },
  {
    id: 5,
    name: '文本分类模型',
    code: 'text_classification_model',
    type: MODEL_TYPES.CLASSIFICATION,
    framework: FRAMEWORKS.PYTORCH,
    version: 1,
    versionNumber: 1,
    versions: [1],
    description: '基于BERT的文本分类模型',
    status: MODEL_STATUS.ONLINE,
    createTime: '2024-01-19 11:30:00',
    creator: '钱七',
    trainingDataSize: 25000,
    modelSize: '89.4MB',
    trainingTime: '5小时20分钟',
    hyperparameters: {
      learning_rate: 2e-5,
      batch_size: 16,
      epochs: 3,
      max_length: 512
    },
    features: ['text_content', 'text_length', 'word_count'],
    modelPath: '/models/text_classification_model.pt',
    lastUpdateTime: '2024-01-19 11:30:00'
  }
]

// 模型统计信息
const modelStats = {
  totalModels: mockModels.length,
  onlineModels: mockModels.filter(m => m.status === MODEL_STATUS.ONLINE).length,
  archivedModels: mockModels.filter(m => m.status === MODEL_STATUS.ARCHIVED).length,
  byType: {
    classification: mockModels.filter(m => m.type === MODEL_TYPES.CLASSIFICATION).length,
    regression: mockModels.filter(m => m.type === MODEL_TYPES.REGRESSION).length,
    clustering: mockModels.filter(m => m.type === MODEL_TYPES.CLUSTERING).length,
    deep_learning: mockModels.filter(m => m.type === MODEL_TYPES.DEEP_LEARNING).length
  },
  byFramework: {
    sklearn: mockModels.filter(m => m.framework === FRAMEWORKS.SKLEARN).length,
    tensorflow: mockModels.filter(m => m.framework === FRAMEWORKS.TENSORFLOW).length,
    pytorch: mockModels.filter(m => m.framework === FRAMEWORKS.PYTORCH).length,
    xgboost: mockModels.filter(m => m.framework === FRAMEWORKS.XGBOOST).length
  }
}

/**
 * 获取模型列表
 */
export function getModels(params = {}) {
  const { name = '', type = '', framework = '', status = '', page = 1, pageSize = 10 } = params
  
  let filteredModels = [...mockModels]
  
  // 按名称筛选
  if (name) {
    filteredModels = filteredModels.filter(m => 
      m.name.toLowerCase().includes(name.toLowerCase()) ||
      m.code.toLowerCase().includes(name.toLowerCase())
    )
  }
  
  // 按类型筛选
  if (type) {
    filteredModels = filteredModels.filter(m => m.type === type)
  }
  
  // 按框架筛选
  if (framework) {
    filteredModels = filteredModels.filter(m => m.framework === framework)
  }
  
  // 按状态筛选
  if (status) {
    filteredModels = filteredModels.filter(m => m.status === status)
  }
  
  // 分页
  const start = (page - 1) * pageSize
  const end = start + pageSize
  const paginatedModels = filteredModels.slice(start, end)
  
  return {
    data: paginatedModels,
    total: filteredModels.length,
    page,
    pageSize
  }
}

/**
 * 获取模型详情
 */
export function getModelDetail(id) {
  return mockModels.find(m => m.id === parseInt(id, 10))
}

/**
 * 创建新模型
 */
export function createModel(modelData) {
  const newModel = {
    id: mockModels.length + 1,
    name: modelData.name,
    code: modelData.code,
    type: modelData.type || MODEL_TYPES.CLASSIFICATION,
    framework: modelData.framework || FRAMEWORKS.SKLEARN,
    versionNumber: 1,
    version: 1,
    versions: [1],
    description: modelData.description || '',
    status: MODEL_STATUS.ONLINE,
    createTime: new Date().toLocaleString('zh-CN'),
    creator: '当前用户',
    trainingDataSize: modelData.trainingDataSize || 0,
    modelSize: modelData.modelFile?.size || '—',
    trainingTime: modelData.trainingTime || '—',
    hyperparameters: modelData.parameters || {},
    // 入参/出参与特征绑定
    inputs: modelData.inputParams || [],
    outputs: modelData.outputParams || [],
    features: (modelData.inputParams || [])
      .filter(i => i.featureId)
      .map(i => i.featureId),
    // UDF 定义与模型文件
    udfDefinition: modelData.udfDefinition || null,
    modelPath: modelData.modelFile?.url || '',
    lastUpdateTime: new Date().toLocaleString('zh-CN')
  }
  mockModels.push(newModel)
  return newModel
}

/**
 * 更新模型
 */
export function updateModel(id, modelData) {
  const index = mockModels.findIndex(m => m.id === parseInt(id, 10))
  if (index !== -1) {
    mockModels[index] = { 
      ...mockModels[index], 
      ...modelData,
      lastUpdateTime: new Date().toLocaleString('zh-CN')
    }
    return mockModels[index]
  }
  return null
}

/**
 * 删除模型
 */
export function deleteModel(id) {
  const index = mockModels.findIndex(m => m.id === parseInt(id, 10))
  if (index !== -1) {
    const deleted = mockModels.splice(index, 1)[0]
    return deleted
  }
  return null
}

/**
 * 获取模型统计信息
 */
export function getModelStats() {
  return modelStats
}

/**
 * 批量导入模型
 */
export function importModels(modelsData) {
  const importedModels = modelsData.map((model, index) => ({
    id: mockModels.length + index + 1,
    ...model,
    createTime: new Date().toLocaleString('zh-CN'),
    creator: '批量导入',
    status: MODEL_STATUS.ONLINE,
    version: 1,
    lastUpdateTime: new Date().toLocaleString('zh-CN')
  }))
  
  mockModels.push(...importedModels)
  return importedModels
}

/**
 * 导出模型数据
 */
export function exportModels(params = {}) {
  const { data } = getModels(params)
  return data.map(model => ({
    模型名称: model.name,
    模型编码: model.code,
    模型类型: model.type,
    版本: model.version,
    描述: model.description,
    状态: model.status,
    创建时间: model.createTime,
    创建人: model.creator,
    训练数据量: model.trainingDataSize,
    模型大小: model.modelSize,
    训练时间: model.trainingTime
  }))
}

/**
 * 获取模型类型列表
 */
export function getModelTypes() {
  return [
    { value: MODEL_TYPES.CLASSIFICATION, label: '分类模型' },
    { value: MODEL_TYPES.REGRESSION, label: '回归模型' },
    { value: MODEL_TYPES.CLUSTERING, label: '聚类模型' },
    { value: MODEL_TYPES.DEEP_LEARNING, label: '深度学习' }
  ]
}

/**
 * 获取算法框架列表
 */
export function getFrameworks() {
  return [
    { value: FRAMEWORKS.SKLEARN, label: 'Scikit-learn' },
    { value: FRAMEWORKS.TENSORFLOW, label: 'TensorFlow' },
    { value: FRAMEWORKS.PYTORCH, label: 'PyTorch' },
    { value: FRAMEWORKS.XGBOOST, label: 'XGBoost' }
  ]
}

/**
 * 获取模型状态列表
 */
export function getModelStatus() {
  return [
    { value: MODEL_STATUS.ONLINE, label: '上线' },
    { value: MODEL_STATUS.ARCHIVED, label: '归档' }
  ]
}

/**
 * 重新训练模型
 */
export function retrainModel(id) {
  const model = mockModels.find(m => m.id === parseInt(id, 10))
  if (model) {
    // 简化：仅更新时间，不变更状态
    model.lastUpdateTime = new Date().toLocaleString('zh-CN')
    return model
  }
  return null
}

export default {
  getModels,
  getModelDetail,
  createModel,
  updateModel,
  deleteModel,
  getModelStats,
  importModels,
  exportModels,
  getModelTypes,
  getFrameworks,
  getModelStatus,
  retrainModel,
  getModelVersions,
  getModelVersionDetail,
  // 平台模型相关（供统一mock入口调用）
  listPlatformModels,
  getPlatformModel,
  downloadPlatformModelFile,
  createModelVersion
}

// 模型平台同步相关 Mock
const platformModels = [
  {
    serviceName: 'credit_score_service',
    name: '信用评分模型服务',
    code: 'credit_score_model',
    version: 'v1.0.0',
    framework: FRAMEWORKS.XGBOOST,
    type: MODEL_TYPES.CLASSIFICATION,
    description: '来自平台的信用评分服务，提供风险评分与标签输出',
    pkFields: ['cert_no', 'flow_id', 'report_id'],
    inputs: [
      { name: 'age', type: 'number', description: '用户年龄' },
      { name: 'income', type: 'number', description: '用户收入' },
      { name: 'credit_history', type: 'number', description: '信用历史分' }
    ],
    outputs: [
      { name: 'score', type: 'number', description: '风险评分' },
      { name: 'label', type: 'number', description: '预测标签' }
    ],
    fileUrl: '/platform/models/credit_score_model_v1.pkl'
  },
  {
    serviceName: 'risk_regression_service',
    name: '风险回归模型服务',
    code: 'risk_prediction_model',
    version: 'v1.0.1',
    framework: FRAMEWORKS.SKLEARN,
    type: MODEL_TYPES.REGRESSION,
    description: '来自平台的风险回归服务，输出连续风险值',
    pkFields: ['cert_no', 'flow_id'],
    inputs: [
      { name: 'age', type: 'number' },
      { name: 'loan_amount', type: 'number' },
      { name: 'credit_score', type: 'number' }
    ],
    outputs: [
      { name: 'risk_value', type: 'number' }
    ],
    fileUrl: '/platform/models/risk_prediction_model_v1.pkl'
  }
  ,
  {
    serviceName: 'customer_segmentation_service',
    name: '客户分群模型服务',
    code: 'customer_clustering_model',
    version: 'v1.0.0',
    framework: FRAMEWORKS.SKLEARN,
    type: MODEL_TYPES.CLUSTERING,
    description: '来自平台的客户分群服务，输出群组标签',
    pkFields: ['cert_no', 'flow_id'],
    inputs: [
      { name: 'purchase_frequency', type: 'number', description: '购买频次' },
      { name: 'avg_order_value', type: 'number', description: '平均订单金额' }
    ],
    outputs: [
      { name: 'cluster_label', type: 'number', description: '分群标签' }
    ],
    fileUrl: '/platform/models/customer_clustering_model_v1.pkl'
  }
  ,
  {
    serviceName: 'ensemble_decision_service',
    name: '集成决策模型服务',
    code: 'ensemble_decision_model',
    version: 'v1.0.0',
    framework: FRAMEWORKS.SKLEARN,
    type: MODEL_TYPES.CLASSIFICATION,
    description: '集成上游模型输出进行最终决策',
    pkFields: ['cert_no', 'flow_id'],
    dependsOn: [
      { serviceName: 'credit_score_service', outputs: ['score'] },
      { serviceName: 'risk_regression_service', outputs: ['risk_value'] }
    ],
    inputs: [
      { name: 'score', type: 'number', description: '信用评分模型输出' },
      { name: 'risk_value', type: 'number', description: '风险回归模型输出' },
      { name: 'age', type: 'number', description: '用户年龄' }
    ],
    outputs: [
      { name: 'final_decision', type: 'number', description: '最终决策标签' }
    ],
    fileUrl: '/platform/models/ensemble_decision_model_v1.pkl'
  }
  ,
  {
    serviceName: 'model_score_service',
    name: '模型分输出服务',
    code: 'model_score_model',
    version: 'v1.0.0',
    framework: FRAMEWORKS.SKLEARN,
    type: MODEL_TYPES.CLASSIFICATION,
    description: '输出统一的模型分（风险评分）',
    pkFields: ['cert_no', 'flow_id'],
    inputs: [
      { name: 'age', type: 'number', description: '用户年龄' },
      { name: 'income', type: 'number', description: '用户收入' }
    ],
    outputs: [
      { name: 'model_score', type: 'number', description: '模型分' }
    ],
    fileUrl: '/platform/models/model_score_model_v1.pkl'
  }
]

export function listPlatformModels() {
  return platformModels.map(p => ({ serviceName: p.serviceName, name: p.name, version: p.version }))
}

export function getPlatformModel(serviceName) {
  const p = platformModels.find(x => x.serviceName === serviceName)
  if (!p) {return null}
  const udfName = `${p.code}_udf`
  const code = `from pyspark.sql.functions import udf\n\ndef ${udfName}(${p.inputs.map(i => i.name).join(', ')}):\n    return 0\n`
  return { ...p, udfDefinition: { udfName, language: 'python', code } }
}

export function downloadPlatformModelFile(serviceName) {
  const p = platformModels.find(x => x.serviceName === serviceName)
  if (!p) {return null}
  return { url: p.fileUrl, size: '25MB', fileName: p.fileUrl.split('/').pop() }
}

export const platformAPI = {
  listPlatformModels,
  getPlatformModel,
  downloadPlatformModelFile
}
export function createModelVersion(id) {
  const model = mockModels.find(m => m.id === parseInt(id, 10))
  if (!model) {return null}
  const next = (model.versionNumber || 1) + 1
  model.versionNumber = next
  model.version = next
  model.versions = Array.isArray(model.versions) ? [...model.versions, next] : [next]
  model.lastUpdateTime = new Date().toLocaleString('zh-CN')
  return model
}

// 版本存储
const modelVersionsStore = new Map()
function snapshotModel(m) {
  return {
    id: m.id,
    name: m.name,
    code: m.code,
    type: m.type,
    framework: m.framework,
    version: m.version,
    description: m.description,
    hyperparameters: m.hyperparameters,
    features: m.features,
    modelPath: m.modelPath,
    lastUpdateTime: m.lastUpdateTime
  }
}
// 初始化版本数据
mockModels.forEach(m => {
  const list = []
  const v1 = { ...snapshotModel(m), version: 1 }
  list.push({ version: 1, detail: v1 })
  if (Array.isArray(m.versions) && m.versions.includes(2)) {
    const v2 = { ...snapshotModel(m), version: 2, description: (m.description || '') + '（v2调整）' }
    if (v2.hyperparameters && typeof v2.hyperparameters === 'object') {
      v2.hyperparameters = { ...v2.hyperparameters, max_depth: (v2.hyperparameters.max_depth || 5) + 1 }
    }
    list.push({ version: 2, detail: v2 })
  }
  modelVersionsStore.set(m.id, list)
})

export function getModelVersions(id) {
  const list = modelVersionsStore.get(parseInt(id, 10)) || []
  return list.map(x => x.version)
}

export function getModelVersionDetail(id, version) {
  const list = modelVersionsStore.get(parseInt(id, 10)) || []
  const item = list.find(x => x.version === parseInt(version, 10))
  return item ? item.detail : null
}
