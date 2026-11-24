import { dataSources } from '@/modules/variable-hub/mock/variable-management/data-sources'
import { variableAssets } from '@/modules/variable-hub/mock/variable-management/variables'
import { VariableDraftStore } from '@/modules/variable-hub/mock/variable-management/variable-draft-store'
import { EvaluationTaskStore } from '@/modules/variable-hub/mock/evaluation/evaluation-task-store'
import { VariableStatusStore } from '@/modules/variable-hub/mock/variable-management/variable-status-store'

/**
 * 合并"评估任务中心 → 外数评估"已生成的报告 ID
 * 在评估任务执行后，external 报告会回写到对应特征的 sourceRefs.externalEvaluationId
 * 特征档案页的"关联分析报告"会自动展示新增的外数评估报告
 */
function withExternalBinding(item: any) {
  if (!item) return item
  const binding = EvaluationTaskStore.getExternalBinding() || {}
  const boundId = binding[String(item.id)]
  if (boundId == null) return item
  const sourceRefs = { ...(item.sourceRefs || {}) }
  // 评估任务生成的 ID 优先级高于静态 mock
  sourceRefs.externalEvaluationId = boundId
  return { ...item, sourceRefs }
}

/**
 * 合并"状态覆盖"和"评估指标覆盖"
 * 1. 启用/停用 / 提交上线 → 状态覆盖
 * 2. 评估任务/治理抽屉 → quality / missingRate / passRate / iv / ks 覆盖
 */
function withStatusAndEvaluation(item: any) {
  if (!item) return item
  const id = String(item.id)
  const statusOverride = VariableStatusStore.getStatus(id)
  const evalOverride = VariableStatusStore.getEvaluation(id)
  let next = item
  if (statusOverride) {
    next = { ...next, status: statusOverride.status }
  }
  if (evalOverride) {
    const lastEvaluatedAt = evalOverride.updatedAt
    next = {
      ...next,
      quality: evalOverride.quality ?? next.quality,
      missingRate: evalOverride.missingRate ?? next.missingRate,
      passRate: evalOverride.passRate ?? next.passRate,
      iv: evalOverride.iv ?? next.iv,
      ks: evalOverride.ks ?? next.ks,
      lastEvaluatedAt,
      lastEvaluationSource: evalOverride.source,
      lastEvaluationTaskId: evalOverride.taskId
    }
  }
  return next
}

export const getVariableList = async (params: any = {}) => {
  const page = Number(params.page || 1)
  const pageSize = Number(params.pageSize || 10)
  const keyword = (params.keyword || '').toString().trim().toLowerCase()
  const type = params.type || ''
  const status = params.status || ''
  const dataSource = params.dataSource || ''

  let list = [...VariableDraftStore.list(), ...variableAssets]
    .map(withExternalBinding)
    .map(withStatusAndEvaluation)
    // 需求提出阶段的记录归属「需求列表」Tab，不再混入特征字典
    .filter((v: any) => v.midloanStatus !== 'requirement_proposal' && v.status !== 'requirement_proposal')
  if (keyword) {
    list = list.filter((v: any) =>
      String(v.name || '').toLowerCase().includes(keyword) ||
      String(v.code || '').toLowerCase().includes(keyword) ||
      String(v.description || '').toLowerCase().includes(keyword)
    )
  }
  if (type && type !== 'all') {
    list = list.filter((v: any) => v.type === type)
  }
  if (status && status !== 'all') {
    list = list.filter((v: any) => v.status === status)
  }
  if (dataSource && dataSource !== 'all') {
    list = list.filter((v: any) => v.dataSource === dataSource)
  }

  const total = list.length
  const start = (page - 1) * pageSize
  const end = start + pageSize
  const paged = list.slice(start, end)

  return {
    code: 200,
    data: {
      list: paged,
      total
    }
  }
}

export const getVariableDetail = async (id: string | number) => {
  const item = [...VariableDraftStore.list(), ...variableAssets].map(withExternalBinding).map(withStatusAndEvaluation).find((v: any) => String(v.id) === String(id))
  if (!item) {
    return { code: 404, message: '特征不存在', data: null }
  }
  return { code: 200, data: item }
}

export const incrementalImportVariables = async (records: any[]) => {
  const count = Array.isArray(records) ? records.length : 0
  return { code: 200, data: { count } }
}

export const getDataSources = async () => {
  return { code: 200, data: dataSources }
}

export default { getVariableList, getVariableDetail, incrementalImportVariables, getDataSources }
