/**
 * 离线模型模块API接口
 */

import mockAPI from '@/modules/offline-model/mock'

// 特征中心相关API
export const featureAPI = {
  // 获取特征列表
  getFeatures: (params) => mockAPI.feature.getFeatures(params),
  
  // 获取特征详情
  getFeatureDetail: (id) => mockAPI.feature.getFeatureDetail(id),
  
  // 创建特征
  createFeature: (data) => mockAPI.feature.createFeature(data),
  
  // 更新特征
  updateFeature: (id, data) => mockAPI.feature.updateFeature(id, data),
  
  // 删除特征
  deleteFeature: (id) => mockAPI.feature.deleteFeature(id),
  // 归档特征
  archiveFeature: (id) => mockAPI.feature.archiveFeature(id),
  
  // 获取特征统计信息
  getFeatureStats: () => mockAPI.feature.getFeatureStats(),
  
  // 批量导入特征
  importFeatures: (data) => mockAPI.feature.importFeatures(data),
  
  // 导出特征数据
  exportFeatures: (params) => mockAPI.feature.exportFeatures(params),
  
  // 获取特征类型列表
  getFeatureTypes: () => mockAPI.feature.getFeatureTypes(),
  
  // 获取特征状态列表
  getFeatureStatus: () => mockAPI.feature.getFeatureStatus(),
  
  // 获取模型类型列表
  getModelTypes: () => mockAPI.feature.getModelTypes(),
  
  // 获取特征列表按模型类型
  getFeaturesByModelType: (modelType, params) => mockAPI.feature.getFeaturesByModelType(modelType, params)
  ,
  listTables: () => mockAPI.feature.listTables(),
  getTableColumns: (tableName) => mockAPI.feature.getTableColumns(tableName),
  getTableMeta: (tableName) => mockAPI.feature.getTableMeta(tableName),
  setTableMeta: (tableName, meta) => mockAPI.feature.setTableMeta(tableName, meta),
  getRegisteredFields: (tableName) => mockAPI.feature.getRegisteredFields(tableName),
  getUnregisteredFields: (tableName) => mockAPI.feature.getUnregisteredFields(tableName),
  batchRegisterFields: (tableName, fields) => mockAPI.feature.batchRegisterFields(tableName, fields)
  ,
  listDatabases: (sourceType) => mockAPI.feature.listDatabases(sourceType),
  listTablesByDb: (sourceType, dbName) => mockAPI.feature.listTablesByDb(sourceType, dbName)
}

// 模型注册相关API
export const modelAPI = {
  // 获取模型列表
  getModels: (params) => mockAPI.model.getModels(params),
  
  // 获取模型详情
  getModelDetail: (id) => mockAPI.model.getModelDetail(id),
  
  // 创建模型
  createModel: (data) => mockAPI.model.createModel(data),
  
  // 更新模型
  updateModel: (id, data) => mockAPI.model.updateModel(id, data),
  
  // 删除模型
  deleteModel: (id) => mockAPI.model.deleteModel(id),
  // 归档模型
  archiveModel: (id) => mockAPI.model.archiveModel(id),
  // 历史版本
  getModelVersions: (id) => mockAPI.model.getModelVersions(id),
  getModelVersionDetail: (id, version) => mockAPI.model.getModelVersionDetail(id, version),
  
  // 获取模型统计信息
  getModelStats: () => mockAPI.model.getModelStats(),
  
  // 批量导入模型
  importModels: (data) => mockAPI.model.importModels(data),
  
  // 导出模型数据
  exportModels: (params) => mockAPI.model.exportModels(params),
  
  // 获取模型类型列表
  getModelTypes: () => mockAPI.model.getModelTypes(),
  
  // 获取算法框架列表
  getFrameworks: () => mockAPI.model.getFrameworks(),
  
  // 获取模型状态列表
  getModelStatus: () => mockAPI.model.getModelStatus(),
  
  // 重新训练模型
  retrainModel: (id) => mockAPI.model.retrainModel(id)
  ,
  listPlatformModels: () => mockAPI.model.listPlatformModels(),
  getPlatformModel: (serviceName) => mockAPI.model.getPlatformModel(serviceName),
  downloadPlatformModelFile: (serviceName) => mockAPI.model.downloadPlatformModelFile(serviceName)
  ,
  createModelVersion: (id) => mockAPI.model.createModelVersion(id)
}

// 模型回溯相关API（待实现）
export const backtrackAPI = {
  // 获取回溯列表
  getBacktracks: (params) => {
    const result = mockAPI.backtrack.getBacktracks(params)
    return Promise.resolve(mockAPI.createResponse(result))
  },
  
  // 创建回溯任务
  createBacktrack: (data) => {
    const result = mockAPI.backtrack.createBacktrack(data)
    return Promise.resolve(mockAPI.createResponse({ id: result.id }))
  },
  
  // 获取回溯详情
  getBacktrackDetail: (id) => {
    const result = mockAPI.backtrack.getBacktrackDetail(id)
    return Promise.resolve(mockAPI.createResponse(result))
  },
  
  // 停止回溯任务
  stopBacktrack: (id) => {
    const result = mockAPI.backtrack.updateBacktrackProgress(id, { status: 'stopped' })
    return Promise.resolve(mockAPI.createResponse(result))
  },

  logOperation: (data) => {
    const result = mockAPI.backtrack.logOperation(data)
    return Promise.resolve(mockAPI.createResponse(result))
  },

  getOperationLogs: (backtrackId) => {
    const result = mockAPI.backtrack.getOperationLogs(backtrackId)
    return Promise.resolve(mockAPI.createResponse(result))
  },

  // 回溯配置相关枚举（场景标签 / 渠道 / 必填字段 / 关联方式）
  getSceneTags: () => mockAPI.backtrack.SCENE_TAGS,
  getLandingChannels: () => mockAPI.backtrack.LANDING_CHANNELS,
  getRequiredFieldDefs: () => mockAPI.backtrack.REQUIRED_FIELD_DEFS,
  getAssociationMethods: () => mockAPI.backtrack.ASSOCIATION_METHODS
}

// 任务管理相关API（待实现）
export const taskAPI = {
  // 获取任务列表
  getTasks: (params) => {
    const result = mockAPI.task.getTasks(params)
    return Promise.resolve(mockAPI.createResponse(result))
  },
  
  // 创建任务
  createTask: (data) => {
    console.log('创建任务:', data)
    return Promise.resolve(mockAPI.createResponse({ id: 1 }))
  },
  
  // 获取任务详情
  getTaskDetail: (id) => {
    const result = mockAPI.task.getTaskDetail(id)
    return Promise.resolve(mockAPI.createResponse(result))
  },
  
  // 暂停任务
  pauseTask: (id) => {
    console.log('暂停任务:', id)
    return Promise.resolve(mockAPI.createResponse(null))
  },
  
  // 继续任务
  resumeTask: (id) => {
    console.log('继续任务:', id)
    return Promise.resolve(mockAPI.createResponse(null))
  },
  
  // 停止任务
  stopTask: (id) => {
    console.log('停止任务:', id)
    return Promise.resolve(mockAPI.createResponse(null))
  },
  
  // 删除任务
  deleteTask: (id) => {
    console.log('删除任务:', id)
    return Promise.resolve(mockAPI.createResponse(null))
  },
  // 重试子任务
  retrySubtask: (taskId, subtaskId) => {
    const result = mockAPI.task.retrySubtask(taskId, subtaskId)
    return Promise.resolve(mockAPI.createResponse(result))
  }
}

// 模型评估相关API（待实现）
export const evaluationAPI = {
  // 获取评估列表
  getEvaluations: (params) => {
    console.log('获取评估列表:', params)
    return Promise.resolve(mockAPI.createResponse([]))
  },
  
  // 创建评估
  createEvaluation: (data) => {
    console.log('创建评估:', data)
    return Promise.resolve(mockAPI.createResponse({ id: 1 }))
  },
  
  // 获取评估详情
  getEvaluationDetail: (id) => {
    console.log('获取评估详情:', id)
    return Promise.resolve(mockAPI.createResponse({}))
  },
  
  // 获取评估报告
  getEvaluationReport: (id) => {
    console.log('获取评估报告:', id)
    return Promise.resolve(mockAPI.createResponse({}))
  },
  
  // 导出评估报告
  exportEvaluationReport: (id) => {
    console.log('导出评估报告:', id)
    return Promise.resolve(mockAPI.createResponse(null))
  }
}

export default {
  feature: featureAPI,
  model: modelAPI,
  backtrack: backtrackAPI,
  task: taskAPI,
  evaluation: evaluationAPI
}
