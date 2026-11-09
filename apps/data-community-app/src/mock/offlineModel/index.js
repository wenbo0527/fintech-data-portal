/**
 * 离线模型模块统一Mock数据管理
 */

import featureMock from './feature'
import modelMock from './model'
import backtrackMock from './backtrack'
import taskMock from './task'

// 统一的API响应格式
function createResponse(data, success = true, message = '') {
  return {
    success,
    message,
    data,
    timestamp: new Date().toISOString()
  }
}

// 统一的错误响应
function createErrorResponse(message, code = 500) {
  return {
    success: false,
    message,
    code,
    timestamp: new Date().toISOString()
  }
}

// 模拟延迟
function simulateDelay(min = 300, max = 1000) {
  return new Promise(resolve => {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min
    setTimeout(resolve, delay)
  })
}

/**
 * 特征中心相关API
 */
export const featureAPI = {
  // 获取特征列表
  async getFeatures(params) {
    await simulateDelay()
    try {
      const result = featureMock.getFeatures(params)
      return createResponse(result)
    } catch (error) {
      return createErrorResponse('获取特征列表失败: ' + error.message)
    }
  },

  // 获取特征详情
  async getFeatureDetail(id) {
    await simulateDelay()
    try {
      const result = featureMock.getFeatureDetail(id)
      if (!result) {
        return createErrorResponse('特征不存在', 404)
      }
      return createResponse(result)
    } catch (error) {
      return createErrorResponse('获取特征详情失败: ' + error.message)
    }
  },

  // 创建特征
  async createFeature(featureData) {
    await simulateDelay(500, 1500)
    try {
      const result = featureMock.createFeature(featureData)
      return createResponse(result, true, '特征创建成功')
    } catch (error) {
      return createErrorResponse('创建特征失败: ' + error.message)
    }
  },

  // 更新特征
  async updateFeature(id, featureData) {
    await simulateDelay(500, 1500)
    try {
      const result = featureMock.updateFeature(id, featureData)
      if (!result) {
        return createErrorResponse('特征不存在', 404)
      }
      return createResponse(result, true, '特征更新成功')
    } catch (error) {
      return createErrorResponse('更新特征失败: ' + error.message)
    }
  },

  // 删除特征
  async deleteFeature(id) {
    await simulateDelay(300, 800)
    try {
      const result = featureMock.deleteFeature(id)
      if (!result) {
        return createErrorResponse('特征不存在', 404)
      }
      return createResponse(null, true, '特征删除成功')
    } catch (error) {
      return createErrorResponse('删除特征失败: ' + error.message)
    }
  },
  // 归档特征
  async archiveFeature(id) {
    await simulateDelay(300, 800)
    try {
      const result = featureMock.updateFeature(id, { status: 'inactive' })
      if (!result) {
        return createErrorResponse('特征不存在', 404)
      }
      return createResponse(result, true, '特征已归档')
    } catch (error) {
      return createErrorResponse('归档失败: ' + error.message)
    }
  },

  // 获取特征统计信息
  async getFeatureStats() {
    await simulateDelay()
    try {
      const result = featureMock.getFeatureStats()
      return createResponse(result)
    } catch (error) {
      return createErrorResponse('获取特征统计失败: ' + error.message)
    }
  },

  // 批量导入特征
  async importFeatures(featuresData) {
    await simulateDelay(1000, 2000)
    try {
      const result = featureMock.importFeatures(featuresData)
      return createResponse(result, true, `成功导入 ${result.length} 个特征`)
    } catch (error) {
      return createErrorResponse('批量导入失败: ' + error.message)
    }
  },

  // 导出特征数据
  async exportFeatures(params) {
    await simulateDelay(800, 1500)
    try {
      const result = featureMock.exportFeatures(params)
      return createResponse(result, true, '特征数据导出成功')
    } catch (error) {
      return createErrorResponse('导出特征数据失败: ' + error.message)
    }
  },

  // 获取特征类型列表
  async getFeatureTypes() {
    await simulateDelay()
    try {
      const result = featureMock.getFeatureTypes()
      return createResponse(result)
    } catch (error) {
      return createErrorResponse('获取特征类型列表失败: ' + error.message)
    }
  },

  // 获取特征状态列表
  async getFeatureStatus() {
    await simulateDelay()
    try {
      const result = featureMock.getFeatureStatus()
      return createResponse(result)
    } catch (error) {
      return createErrorResponse('获取特征状态列表失败: ' + error.message)
    }
  },
  // 列出数据表
  async listTables() {
    await simulateDelay()
    try {
      const result = featureMock.listTables()
      return createResponse(result)
    } catch (error) {
      return createErrorResponse('获取数据表列表失败: ' + error.message)
    }
  },
  // 获取数据表列信息
  async getTableColumns(tableName) {
    await simulateDelay()
    try {
      const result = featureMock.getTableColumns(tableName)
      return createResponse(result)
    } catch (error) {
      return createErrorResponse('获取数据表字段失败: ' + error.message)
    }
  },
  // 获取数据表元信息
  async getTableMeta(tableName) {
    await simulateDelay()
    try {
      const result = featureMock.getTableMeta(tableName)
      if (!result) {return createErrorResponse('数据表不存在', 404)}
      return createResponse(result)
    } catch (error) {
      return createErrorResponse('获取数据表元信息失败: ' + error.message)
    }
  },
  // 设置数据表元信息
  async setTableMeta(tableName, meta) {
    await simulateDelay(500, 1200)
    try {
      const result = featureMock.setTableMeta(tableName, meta)
      if (!result) {return createErrorResponse('数据表不存在', 404)}
      return createResponse(result, true, '数据表元信息已更新')
    } catch (error) {
      return createErrorResponse('设置数据表元信息失败: ' + error.message)
    }
  },
  // 获取已注册字段
  async getRegisteredFields(tableName) {
    await simulateDelay()
    try {
      const result = featureMock.getRegisteredFields(tableName)
      return createResponse(result)
    } catch (error) {
      return createErrorResponse('获取已注册字段失败: ' + error.message)
    }
  },
  // 获取未注册字段
  async getUnregisteredFields(tableName) {
    await simulateDelay()
    try {
      const result = featureMock.getUnregisteredFields(tableName)
      return createResponse(result)
    } catch (error) {
      return createErrorResponse('获取未注册字段失败: ' + error.message)
    }
  },
  // 批量注册字段
  async batchRegisterFields(tableName, fields) {
    await simulateDelay(500, 1500)
    try {
      const result = featureMock.batchRegisterFields(tableName, fields)
      return createResponse(result, true, '字段批量注册成功')
    } catch (error) {
      return createErrorResponse('批量注册字段失败: ' + error.message)
    }
  },
  async listDatabases(sourceType) {
    await simulateDelay()
    try {
      const result = featureMock.listDatabases(sourceType)
      return createResponse(result)
    } catch (error) {
      return createErrorResponse('获取数据库列表失败: ' + error.message)
    }
  },
  async listTablesByDb(sourceType, dbName) {
    await simulateDelay()
    try {
      const result = featureMock.listTablesByDb(sourceType, dbName)
      return createResponse(result)
    } catch (error) {
      return createErrorResponse('获取库下表失败: ' + error.message)
    }
  }
}

/**
 * 模型注册相关API
 */
export const modelAPI = {
  // 获取模型列表
  async getModels(params) {
    await simulateDelay()
    try {
      const result = modelMock.getModels(params)
      return createResponse(result)
    } catch (error) {
      return createErrorResponse('获取模型列表失败: ' + error.message)
    }
  },

  // 获取模型详情
  async getModelDetail(id) {
    await simulateDelay()
    try {
      const result = modelMock.getModelDetail(id)
      if (!result) {
        return createErrorResponse('模型不存在', 404)
      }
      return createResponse(result)
    } catch (error) {
      return createErrorResponse('获取模型详情失败: ' + error.message)
    }
  },

  // 创建模型
  async createModel(modelData) {
    await simulateDelay(500, 1500)
    try {
      const result = modelMock.createModel(modelData)
      return createResponse(result, true, '模型创建成功')
    } catch (error) {
      return createErrorResponse('创建模型失败: ' + error.message)
    }
  },

  // 更新模型
  async updateModel(id, modelData) {
    await simulateDelay(500, 1500)
    try {
      const result = modelMock.updateModel(id, modelData)
      if (!result) {
        return createErrorResponse('模型不存在', 404)
      }
      return createResponse(result, true, '模型更新成功')
    } catch (error) {
      return createErrorResponse('更新模型失败: ' + error.message)
    }
  },

  // 删除模型
  async deleteModel(id) {
    await simulateDelay(300, 800)
    try {
      const result = modelMock.deleteModel(id)
      if (!result) {
        return createErrorResponse('模型不存在', 404)
      }
      return createResponse(null, true, '模型删除成功')
    } catch (error) {
      return createErrorResponse('删除模型失败: ' + error.message)
    }
  },
  // 归档模型
  async archiveModel(id) {
    await simulateDelay(300, 800)
    try {
      const result = modelMock.updateModel(id, { status: 'archived' })
      if (!result) {
        return createErrorResponse('模型不存在', 404)
      }
      return createResponse(result, true, '模型已归档')
    } catch (error) {
      return createErrorResponse('归档失败: ' + error.message)
    }
  },

  // 获取模型统计信息
  async getModelStats() {
    await simulateDelay()
    try {
      const result = modelMock.getModelStats()
      return createResponse(result)
    } catch (error) {
      return createErrorResponse('获取模型统计失败: ' + error.message)
    }
  },

  // 批量导入模型
  async importModels(modelsData) {
    await simulateDelay(1000, 2000)
    try {
      const result = modelMock.importModels(modelsData)
      return createResponse(result, true, `成功导入 ${result.length} 个模型`)
    } catch (error) {
      return createErrorResponse('批量导入失败: ' + error.message)
    }
  },

  // 导出模型数据
  async exportModels(params) {
    await simulateDelay(800, 1500)
    try {
      const result = modelMock.exportModels(params)
      return createResponse(result, true, '模型数据导出成功')
    } catch (error) {
      return createErrorResponse('导出模型数据失败: ' + error.message)
    }
  },

  // 获取模型类型列表
  async getModelTypes() {
    await simulateDelay()
    try {
      const result = modelMock.getModelTypes()
      return createResponse(result)
    } catch (error) {
      return createErrorResponse('获取模型类型列表失败: ' + error.message)
    }
  },

  // 获取算法框架列表
  async getFrameworks() {
    await simulateDelay()
    try {
      const result = modelMock.getFrameworks()
      return createResponse(result)
    } catch (error) {
      return createErrorResponse('获取算法框架列表失败: ' + error.message)
    }
  },

  // 获取模型状态列表
  async getModelStatus() {
    await simulateDelay()
    try {
      const result = modelMock.getModelStatus()
      return createResponse(result)
    } catch (error) {
      return createErrorResponse('获取模型状态列表失败: ' + error.message)
    }
  },

  // 重新训练模型
  async retrainModel(id) {
    await simulateDelay(2000, 4000)
    try {
      const result = modelMock.retrainModel(id)
      if (!result) {
        return createErrorResponse('模型不存在', 404)
      }
      return createResponse(result, true, '模型重新训练已启动')
    } catch (error) {
      return createErrorResponse('重新训练模型失败: ' + error.message)
    }
  }
  ,
  async getModelVersions(id) {
    await simulateDelay()
    try {
      const result = modelMock.getModelVersions(id)
      return createResponse(result)
    } catch (error) {
      return createErrorResponse('获取模型版本列表失败: ' + error.message)
    }
  },
  async getModelVersionDetail(id, version) {
    await simulateDelay()
    try {
      const result = modelMock.getModelVersionDetail(id, version)
      if (!result) {return createErrorResponse('版本不存在', 404)}
      return createResponse(result)
    } catch (error) {
      return createErrorResponse('获取模型版本详情失败: ' + error.message)
    }
  },
  async listPlatformModels() {
    await simulateDelay()
    try {
      const result = modelMock.listPlatformModels()
      return createResponse(result)
    } catch (error) {
      return createErrorResponse('获取平台模型列表失败: ' + error.message)
    }
  },
  async getPlatformModel(serviceName) {
    await simulateDelay()
    try {
      const result = modelMock.getPlatformModel(serviceName)
      if (!result) {return createErrorResponse('平台模型不存在', 404)}
      return createResponse(result)
    } catch (error) {
      return createErrorResponse('获取平台模型详情失败: ' + error.message)
    }
  },
  async downloadPlatformModelFile(serviceName) {
    await simulateDelay(500, 1200)
    try {
      const result = modelMock.downloadPlatformModelFile(serviceName)
      if (!result) {return createErrorResponse('模型文件不存在', 404)}
      return createResponse(result, true, '模型文件拉取成功')
    } catch (error) {
      return createErrorResponse('拉取模型文件失败: ' + error.message)
    }
  }
}

// 统一的API导出
export default {
  feature: featureAPI,
  model: modelAPI,
  backtrack: backtrackMock,
  task: taskMock,
  
  // 工具方法
  createResponse,
  createErrorResponse,
  simulateDelay
}
