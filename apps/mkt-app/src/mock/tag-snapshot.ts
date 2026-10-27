/**
 * CDP 连续型标签分位统计 mock 数据（需求模块 E）
 *
 * 口径说明（与需求 R47-R57-3 对齐）：
 *   - 有效样本 = 当期快照去重人数 − 空值人数（R48）；分位与均值同分母（R51）
 *   - 不抽样，按升序排列，P10 表示有 10% 有效样本低于该值（R50）
 *   - 极值不剔除，如实计入，同时标注最大值、最小值与 P99（R56）
 *   - 空值不计入分位与均值，单独标注人数与占比（R55）
 *
 * mock 实现方式：
 *   以「对数正态分布 + 固定随机种子」生成升序样本，再按线性插值法取分位，
 *   保证同一份 mock 在多次加载下结果稳定，且「图表数值 = 表格数值」（R52）。
 */

import type { QuantileKey, QuantileSnapshot } from '@/types/tag'
import { findCdpTag } from '@/mock/cdp-tags'

/** 抽样规模：mock 以固定规模升序样本近似全量有效样本 */
const SAMPLE_SIZE = 2000

/** 样本量偏小阈值（E26）：有效样本低于该值时提示「样本量偏小，分位结果仅供参考」 */
export const SMALL_SAMPLE_THRESHOLD = 1000

/** 分位档位定义（R49） */
export const QUANTILE_POINTS: Array<{ key: QuantileKey; label: string; p: number }> = [
  { key: 'p10', label: 'P10', p: 0.1 },
  { key: 'p25', label: 'P25', p: 0.25 },
  { key: 'p50', label: 'P50', p: 0.5 },
  { key: 'p75', label: 'P75', p: 0.75 },
  { key: 'p90', label: 'P90', p: 0.9 }
]

/**
 * 单期快照的分布配置
 */
export interface QuantileSnapshotConfig {
  /** 快照日期 */
  date: string
  /** 快照总人数（去重） */
  totalCount: number
  /** 空值人数 */
  nullCount: number
  /** 对数正态分布位置参数：value = exp(mu + shift + sigma * z) */
  mu: number
  /** 对数正态分布尺度参数，越大离散度越高 */
  sigma: number
  /** 整体平移（模拟跨期漂移） */
  shift?: number
  /** 截断下界 */
  minClamp?: number
  /** 截断上界 */
  maxClamp?: number
  /** 该期标签口径发生变更（E31） */
  caliberChanged?: boolean
  /** 首次加载失败（E30），用于演示「加载失败，点击重试」 */
  failFirstLoad?: boolean
  /** 该日期无标签快照数据（E29） */
  missing?: boolean
}

/**
 * 标签的分位统计数据集
 */
export interface QuantileTagDataset {
  /** 标签 ID */
  tagId: string
  /** 各档分位值的相对变动阈值（R57-3，默认 20%，按标签可配） */
  thresholdPct: number
  /** 快照日期下拉可选项（仅允许选择已生成快照的日期） */
  snapshotDates: string[]
  /** 各期快照配置 */
  snapshots: QuantileSnapshotConfig[]
}

/**
 * 各标签的分位统计数据集
 * 覆盖场景：
 *   - tag_001：2026-07-01 快照数据已清理（E29）、2026-08-01 样本量偏小（E26）、
 *              2026-09-01 标签口径变更（E31）、2026-10-01 常规
 *   - tag_003：2026-08-01 首次加载失败（E30）、2026-09-01 常规（10 万人快照 / 5000 空值）、
 *              2026-10-01 全为空值（E27）
 *   - tag_004：2026-08-01 取值高度集中（E28）、2026-09-01 常规；单位元数据缺失（E33）
 */
export const mockQuantileDatasets: QuantileTagDataset[] = [
  {
    tagId: 'tag_001',
    thresholdPct: 0.2,
    snapshotDates: ['2026-07-01', '2026-08-01', '2026-09-01', '2026-10-01'],
    snapshots: [
      { date: '2026-07-01', totalCount: 84000, nullCount: 4200, mu: 1.81, sigma: 0.94, missing: true },
      { date: '2026-08-01', totalCount: 900, nullCount: 12, mu: 1.79, sigma: 0.9 },
      { date: '2026-09-01', totalCount: 86000, nullCount: 4300, mu: 1.7, sigma: 1.05, caliberChanged: true },
      { date: '2026-10-01', totalCount: 91000, nullCount: 4550, mu: 1.85, sigma: 0.92 }
    ]
  },
  {
    tagId: 'tag_003',
    thresholdPct: 0.2,
    snapshotDates: ['2026-08-01', '2026-09-01', '2026-10-01'],
    snapshots: [
      { date: '2026-08-01', totalCount: 98000, nullCount: 4900, mu: 7.45, sigma: 1.05, failFirstLoad: true },
      { date: '2026-09-01', totalCount: 100000, nullCount: 5000, mu: 7.4955, sigma: 0.8 },
      { date: '2026-10-01', totalCount: 102000, nullCount: 102000, mu: 7.5, sigma: 1 }
    ]
  },
  {
    tagId: 'tag_004',
    thresholdPct: 0.25,
    snapshotDates: ['2026-08-01', '2026-09-01'],
    snapshots: [
      {
        date: '2026-08-01',
        totalCount: 52000,
        nullCount: 2600,
        mu: 13.428,
        sigma: 0.02,
        minClamp: 680000,
        maxClamp: 680000
      },
      { date: '2026-09-01', totalCount: 54000, nullCount: 2700, mu: 13.428, sigma: 0.85 }
    ]
  }
]

/**
 * 计算字符串哈希（用作确定性随机种子）
 * @param text 任意字符串
 * @returns 32 位无符号整数种子
 */
function hashSeed(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * 创建确定性伪随机数生成器（mulberry32）
 * @param seed 随机种子
 * @returns 返回 [0,1) 随机数的函数
 */
function createRandom(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * 生成标准正态随机数（Box-Muller 变换）
 * @param rand 随机数生成器
 * @returns 标准正态分布样本
 */
function normalSample(rand: () => number): number {
  let u = 0
  let v = 0
  while (u === 0) u = rand()
  while (v === 0) v = rand()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

/**
 * 按分布配置生成升序样本（R50：不抽样口径的 mock 近似实现）
 * @param tagId 标签 ID（参与随机种子，保证同标签同日期结果稳定）
 * @param config 快照分布配置
 * @returns 升序排列的样本数组
 */
export function buildSortedSample(tagId: string, config: QuantileSnapshotConfig): number[] {
  const rand = createRandom(hashSeed(`${tagId}#${config.date}`))
  const shift = config.shift || 0
  const values: number[] = []
  for (let i = 0; i < SAMPLE_SIZE; i++) {
    let value = Math.exp(config.mu + shift + config.sigma * normalSample(rand))
    if (typeof config.minClamp === 'number') value = Math.max(config.minClamp, value)
    if (typeof config.maxClamp === 'number') value = Math.min(config.maxClamp, value)
    values.push(value)
  }
  return values.sort((a, b) => a - b)
}

/**
 * 取升序数组的分位值（线性插值，与 R50「升序排列 + 百分位低于该值」一致）
 * @param sorted 升序样本数组
 * @param p 分位点，取值 0~1
 * @returns 分位值；样本为空时返回 NaN
 */
export function quantileOfSorted(sorted: number[], p: number): number {
  if (!sorted.length) return NaN
  const idx = (sorted.length - 1) * p
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  if (lo === hi) return sorted[lo]
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo)
}

/**
 * 计算升序数组的均值（空值不参与，与分位同分母）
 * @param sorted 升序样本数组
 * @returns 均值；样本为空时返回 NaN
 */
export function meanOfSorted(sorted: number[]): number {
  if (!sorted.length) return NaN
  let sum = 0
  for (const v of sorted) sum += v
  return sum / sorted.length
}

/**
 * 依据快照配置计算单期分位统计结果
 * @param tagId 标签 ID
 * @param config 快照分布配置
 * @returns 分位统计结果（有效样本为 0 时分位值为 NaN，由视图层按 E27 处理）
 */
export function buildQuantileSnapshot(tagId: string, config: QuantileSnapshotConfig): QuantileSnapshot {
  const tag = findCdpTag(tagId)
  const validCount = Math.max(0, config.totalCount - config.nullCount)
  const unit = tag?.unit ? tag.unit : '—'
  const base = {
    date: config.date,
    totalCount: config.totalCount,
    nullCount: config.nullCount,
    validCount,
    unit,
    caliberChanged: !!config.caliberChanged
  }
  if (validCount === 0) {
    // E27：全为空值时不计算分位
    return {
      ...base,
      mean: NaN,
      quantiles: { p10: NaN, p25: NaN, p50: NaN, p75: NaN, p90: NaN },
      min: NaN,
      max: NaN,
      p99: NaN
    }
  }
  const sorted = buildSortedSample(tagId, config)
  const quantiles = {} as Record<QuantileKey, number>
  QUANTILE_POINTS.forEach(point => {
    quantiles[point.key] = quantileOfSorted(sorted, point.p)
  })
  return {
    ...base,
    mean: meanOfSorted(sorted),
    quantiles,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    p99: quantileOfSorted(sorted, 0.99)
  }
}

/**
 * 查找标签的分位统计数据集
 * @param tagId 标签 ID
 * @returns 数据集；该标签无分位数据时返回 undefined
 */
export function findQuantileDataset(tagId: string): QuantileTagDataset | undefined {
  if (!tagId) return undefined
  return mockQuantileDatasets.find(item => item.tagId === tagId)
}
