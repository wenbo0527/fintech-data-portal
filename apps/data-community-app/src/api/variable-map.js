import request from '@/utils/request'

/**
 * 获取特征关系图
 * @param {Object} params - 查询参数
 * @returns {Promise}
 */
export function getVariableGraph(params) {
  return request({
    url: '/api/variable-map/graph',
    method: 'get',
    params
  })
}

/**
 * 获取特征血缘信息
 * @param {string} variableId - 特征ID
 * @returns {Promise}
 */
export function getVariableLineage(variableId) {
  return request({
    url: `/api/variable-map/lineage/${variableId}`,
    method: 'get'
  })
}

/**
 * 路径分析
 * @param {Object} data - 路径分析参数
 * @returns {Promise}
 */
export function analyzePath(data) {
  return request({
    url: '/api/variable-map/path-analysis',
    method: 'get',
    params: data
  })
}

/**
 * 获取特征关系类型
 * @returns {Promise}
 */
export function getRelationTypes() {
  return request({
    url: '/api/variable-map/relation-types',
    method: 'get'
  })
}

/**
 * 获取特征依赖关系
 * @param {string} variableId - 特征ID
 * @param {Object} params - 查询参数
 * @returns {Promise}
 */
export function getVariableDependencies(variableId, params) {
  return request({
    url: `/api/variable-map/dependencies/${variableId}`,
    method: 'get',
    params
  })
}

/**
 * 获取特征影响分析
 * @param {string} variableId - 特征ID
 * @returns {Promise}
 */
export function getVariableImpact(variableId) {
  return request({
    url: `/api/variable-map/impact-analysis/${variableId}`,
    method: 'get'
  })
}

// 兼容 Store 引用的命名
export function getPathAnalysis(params) {
  return analyzePath(params)
}

export function getImpactAnalysis(variableId) {
  return getVariableImpact(variableId)
}
