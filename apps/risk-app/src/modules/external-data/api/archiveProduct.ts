/**
 * 外数档案 · 产品主数据 API
 *
 * 分层约定与 api/interfaceFieldMapping.ts 一致：VITE_USE_MOCK=true 时短路到本地 mock，
 * 否则走 http。页面/Store 不直接 import mock，只经由本层，保证「唯一写入点」可审计。
 *
 * 需求文档对应：A3 档案新建与编辑（R20-R23）、R129 状态由业务事件写入。
 */
import http from '../../../api/http'
import {
  loadArchiveProducts,
  getArchiveProduct,
  upsertArchiveProduct,
  resetArchiveProducts,
  deriveTechProfileStatus,
  type ArchiveProduct,
  type ArchiveStatus,
} from '../mock/archiveProducts'

const useMock = import.meta.env.VITE_USE_MOCK === 'true'

export type { ArchiveProduct, ArchiveStatus }

/** 档案产品清单 */
export async function listArchiveProducts(): Promise<ArchiveProduct[]> {
  if (useMock) return loadArchiveProducts()
  const res: any = await http.get('/external-data/archive/products')
  const payload = res?.data ?? res
  return Array.isArray(payload) ? payload : payload?.list || []
}

/** 单个档案产品 */
export async function fetchArchiveProduct(id: string): Promise<ArchiveProduct | undefined> {
  if (useMock) return getArchiveProduct(id)
  const res: any = await http.get(`/external-data/archive/products/${encodeURIComponent(id)}`)
  return res?.data ?? res
}

/**
 * 新建或更新档案
 * 状态字段不随普通编辑提交：R129 规定六大业务状态由业务事件写入，人工只改档案内容。
 * 需要变更状态时走 transitionArchiveStatus。
 */
export async function saveArchiveProduct(
  payload: Partial<ArchiveProduct> & { id: string },
  reason = '人工编辑档案'
): Promise<ArchiveProduct> {
  if (useMock) {
    const { status: _ignored, ...rest } = payload as any
    return upsertArchiveProduct(rest, reason)
  }
  const res: any = await http.post('/external-data/archive/products', payload)
  return res?.data ?? res
}

/**
 * 状态流转（业务事件入口）
 * @param to 目标状态
 * @param reason 变更原因，写入 statusHistory 留痕，供 F 模块状态变更历史使用
 */
export async function transitionArchiveStatus(
  id: string,
  to: ArchiveStatus,
  reason: string
): Promise<ArchiveProduct> {
  if (useMock) return upsertArchiveProduct({ id, status: to }, reason)
  const res: any = await http.post(`/external-data/archive/products/${encodeURIComponent(id)}/status`, { to, reason })
  return res?.data ?? res
}

/** 演示复位：清除人工副本 */
export async function resetArchiveProductOverlay(): Promise<void> {
  if (useMock) {
    resetArchiveProducts()
    return
  }
  await http.delete('/external-data/archive/products/overlay')
}

/** 技术档案齐备度校验（R123：离线/回溯型未配齐接口与映射则应停留在待完善技术档案） */
export async function checkTechProfileComplete(p: ArchiveProduct): Promise<ArchiveStatus | undefined> {
  return deriveTechProfileStatus(p)
}
