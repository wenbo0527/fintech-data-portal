import http from '../../../api/http'
import {
  listEvaluationReports,
  getEvaluationReportDetail as mockGetDetail,
  createEvaluationReport as mockCreate,
  updateEvaluationReport as mockUpdate,
  publishEvaluationReport as mockPublish,
  archiveEvaluationReport as mockArchive,
  deleteEvaluationReport as mockDelete,
} from '../mock/evaluationReports'
import { loadArchiveProducts } from '../mock/archiveProducts'

// 沿用 api/task.ts 的 useMock 模式：本模块所有读写的 mock / 真接口分流靠这个开关。
// 之前重构剔掉 Math.random 造数据那段时连同这一行一起删了，导致下面八个函数报 ReferenceError：useMock is not defined，
// 表现是外数档案列表与外数评估中心列表全部空数据（store 的 try/catch 把异常吞成了 error 文案）。
const useMock = import.meta.env.VITE_USE_MOCK === 'true'


export async function getEvaluationReports(params: any) {
  // VITE_USE_MOCK=true：走本地 mock 数据源，避免 risk-app 未启用 vite-plugin-mock / proxy 时 404
  if (useMock) return listEvaluationReports(params)

  const res: any = await http.get('/external-data-evaluation/list', { params })
  // 适配 Mock 返回结构 { code: 200, data: { list: [], total: 0 } }
  // 同时也兼容直接返回 { list: [], total: 0 } 的情况
  const payload = res?.data || res
  return { 
    list: payload?.list || [], 
    total: Number(payload?.total || 0) 
  }
}

export async function getEvaluationReportDetail(id: string | number) {
  if (useMock) {
    const detail = mockGetDetail(id)
    if (!detail) throw new Error('评估报告不存在')
    return detail
  }
  const res: any = await http.get(`/external-data-evaluation/detail/${id}`)
  return res?.data || res
}

export async function createEvaluationReport(payload: any) {
  if (useMock) return mockCreate(payload)
  const res: any = await http.post('/external-data-evaluation/create', payload)
  return res?.data || res
}

export async function updateEvaluationReport(id: string | number, payload: any) {
  if (useMock) {
    const updated = mockUpdate(id, payload)
    if (!updated) throw new Error('评估报告不存在')
    return { id, ...payload, lastModified: updated.updatedAt }
  }
  const res: any = await http.put(`/external-data-evaluation/update/${id}`, payload)
  return res?.data || res
}

export async function publishReport(id: string | number, payload?: any) {
  if (useMock) {
    const published = mockPublish(id)
    if (!published) throw new Error('评估报告不存在')
    return { id, ...payload, status: '已发布', progress: 100, publishTime: published.updatedAt }
  }
  const res: any = await http.put(`/external-data-evaluation/${id}/publish`, payload)
  return res?.data || res
}

export async function archiveReport(id: string | number) {
  if (useMock) {
    const archived = mockArchive(id)
    if (!archived) throw new Error('评估报告不存在')
    return { id, status: 'archived' }
  }
  const res: any = await http.put(`/external-data-evaluation/${id}/archive`)
  return res?.data || res
}

export async function deleteReport(id: string | number) {
  if (useMock) {
    if (!mockDelete(id)) throw new Error('评估报告不存在')
    return { id, deleted: true }
  }
  const res: any = await http.delete(`/external-data-evaluation/delete/${id}`)
  return res?.data || res
}

/**
 * 产品主数据读取入口
 * 93BB782D 修复 (2026-06-24) 原实现用 Math.random() 现算 status/evaluationScore/monitorStatus，
 * 每次刷新档案状态跳变、不可信；改为 mock/archiveProducts.ts 的确定性种子 + localStorage 副本。
 * 保留 { code, data } 结构以兼容 Store 既有处理逻辑。
 */
export async function getRegisteredProducts() {
  if (useMock) {
    return { code: 200, message: 'success', data: loadArchiveProducts() }
  }
  return await http.get('/external-data-evaluation/products')
}
