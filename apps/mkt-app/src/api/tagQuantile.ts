/**
 * 连续型标签分位统计 API（需求模块 E · CDP 域）
 *
 * 说明：本项目为纯前端展示，数据全部来自本地 mock（见 @/mock/tag-snapshot）。
 * 依据 MOCK_STANDARD.md「D. 内联 API 函数」，复杂业务查询统一封装在此文件，
 * 视图层不直接依赖 mock 数据结构。
 *
 * 接口契约（对齐需求接口表）：
 *   - getQuantileTagMeta()          标签类型与快照可用性查询（P0）
 *   - fetchTagQuantileSnapshot()     标签分位统计查询（P0）
 *   - fetchTagQuantileCompare()      标签快照分位对比查询（P1）
 */

import type { ContinuousType, QuantileCompareResult, QuantileKey, QuantileSnapshot } from '@/types/tag'
import {
  buildQuantileSnapshot,
  findQuantileDataset,
  QUANTILE_POINTS
} from '@/mock/tag-snapshot'
import { findCdpTag } from '@/mock/cdp-tags'

/** 错误码：所选日期无标签快照数据（E29） */
export const QUANTILE_ERROR_NO_SNAPSHOT = 'NO_SNAPSHOT'
/** 错误码：分位计算失败（E30） */
export const QUANTILE_ERROR_LOAD_FAILED = 'LOAD_FAILED'
/** 错误码：标签不支持分位统计（R47 非连续型 / R57-1 派生标签） */
export const QUANTILE_ERROR_NOT_SUPPORTED = 'NOT_SUPPORTED'

/**
 * 分位统计接口异常
 */
export class QuantileApiError extends Error {
  /** 错误码 */
  code: string

  /**
   * 构造异常
   * @param code 错误码
   * @param message 错误提示文案
   */
  constructor(code: string, message: string) {
    super(message)
    this.name = 'QuantileApiError'
    this.code = code
  }
}

/**
 * 标签分位统计元信息
 */
export interface QuantileTagMeta {
  /** 标签 ID */
  id: string
  /** 标签名称 */
  name: string
  /** 连续型判定（R47） */
  continuousType: ContinuousType
  /** 是否派生标签（R57-1） */
  derived: boolean
  /** 数值单位（R57-2），缺失为 '—' */
  unit: string
  /** 各档分位相对变动阈值（R57-3，默认 0.2） */
  thresholdPct: number
  /** 可选快照日期（仅已生成快照的日期） */
  snapshotDates: string[]
  /** 是否支持分位统计 */
  supported: boolean
  /** 不支持时的说明文案 */
  unsupportedReason?: string
}

/** 已触发「首次加载失败」的快照（E30），重试后放行 */
const failedOnceKeys = new Set<string>()

/**
 * 模拟接口延迟
 * @param ms 延迟毫秒数
 * @returns Promise
 */
function delay(ms = 300): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 查询标签分位统计元信息与快照可用性（P0）
 * @param tagId 标签 ID
 * @returns 标签元信息；标签不存在时返回 null
 */
export async function getQuantileTagMeta(tagId: string): Promise<QuantileTagMeta | null> {
  await delay(150)
  const tag = findCdpTag(tagId)
  if (!tag) return null
  const dataset = findQuantileDataset(tagId)
  const continuousType = tag.continuousType || 'categorical'
  let unsupportedReason = ''
  if (continuousType !== 'continuous') {
    unsupportedReason = '该标签为非连续型标签，不支持分位统计'
  } else if (tag.derived) {
    unsupportedReason = '派生标签暂不支持分位统计'
  }
  return {
    id: tag.id,
    name: tag.name,
    continuousType,
    derived: !!tag.derived,
    unit: tag.unit ? tag.unit : '—',
    thresholdPct: dataset?.thresholdPct ?? 0.2,
    snapshotDates: dataset?.snapshotDates || [],
    supported: !unsupportedReason,
    unsupportedReason: unsupportedReason || undefined
  }
}

/**
 * 查询单期快照分位统计结果（P0）
 * @param tagId 标签 ID
 * @param date 快照日期
 * @returns 分位统计结果
 * @throws QuantileApiError 标签无快照数据（E29）或加载失败（E30）
 */
export async function fetchTagQuantileSnapshot(tagId: string, date: string): Promise<QuantileSnapshot> {
  await delay(300)
  const dataset = findQuantileDataset(tagId)
  if (!dataset) {
    throw new QuantileApiError(QUANTILE_ERROR_NO_SNAPSHOT, '该日期无标签快照数据')
  }
  const config = dataset.snapshots.find(item => item.date === date)
  if (!config || config.missing) {
    // E29：所选日期无该标签快照，其他日期仍可选，不报错
    throw new QuantileApiError(QUANTILE_ERROR_NO_SNAPSHOT, '该日期无标签快照数据')
  }
  const failKey = `${tagId}#${date}`
  if (config.failFirstLoad && !failedOnceKeys.has(failKey)) {
    failedOnceKeys.add(failKey)
    // E30：分位计算失败，前端提示「加载失败，点击重试」
    throw new QuantileApiError(QUANTILE_ERROR_LOAD_FAILED, '加载失败，点击重试')
  }
  return buildQuantileSnapshot(tagId, config)
}

/**
 * 查询双日期分位对比结果（P1）
 * @param tagId 标签 ID
 * @param baseDate 基期快照日期
 * @param compareDate 对比期快照日期
 * @returns 对比结果（含各档变动量与超阈值档位）
 */
export async function fetchTagQuantileCompare(
  tagId: string,
  baseDate: string,
  compareDate: string
): Promise<QuantileCompareResult> {
  const [base, compare] = await Promise.all([
    fetchTagQuantileSnapshot(tagId, baseDate),
    fetchTagQuantileSnapshot(tagId, compareDate)
  ])
  const deltas = {} as Record<QuantileKey, number>
  const exceededKeys: QuantileKey[] = []
  const threshold = findQuantileDataset(tagId)?.thresholdPct ?? 0.2
  QUANTILE_POINTS.forEach(point => {
    const baseValue = base.quantiles[point.key]
    const compareValue = compare.quantiles[point.key]
    const delta = compareValue - baseValue
    deltas[point.key] = delta
    // R54 / R57-3：相对变动比例超阈值则高亮，仅影响高亮不影响数值
    if (baseValue && Math.abs(delta / baseValue) > threshold) {
      exceededKeys.push(point.key)
    }
  })
  return { base, compare, deltas, exceededKeys }
}
