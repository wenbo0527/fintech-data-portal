/**
 * 变量效果评估 · 总览与明细 store（mock 单例）
 *
 * 项目铁律落地：本文件是效果域唯一的「计算层」。
 * 组件禁止再写 filter / reduce / sort / slice 产出汇总数，所有数字、文案、状态枚举都从这里出。
 */

import { variableAssets } from '../variable-management/variables'
import {
  getDataset,
  toRow,
  formatMissingRate,
  formatMetricValue,
  L1_LABELS,
  SOURCE_LABELS,
  VARIABLE_TYPE_LABELS,
  PRICE_LEVEL_RANK,
  VERDICT_LABELS,
  METRIC_DEFS,
  HISTORY_MONTHS,
  DEFAULT_RANGE,
  RANGE_OPTIONS,
  EFFECT_SAMPLE_TOTAL
} from './generator'
import type { EffectSample } from './generator'
import { effectOpinionStore } from './opinion-store'
import type {
  EffectExpanded,
  EffectListParams,
  EffectListResult,
  EffectListState,
  EffectOverview,
  EffectProfile,
  EffectRow,
  LabelEffectMonthCell,
  LabelEffectParams,
  LabelEffectResult,
  LabelEffectRow,
  MetricCell,
  MetricDirection,
  MetricKey,
  MetricMeta,
  OverallLabelEffectParams,
  OverallLabelEffectResult,
  OverallLabelEffectRow,
  PlatformUsageRow,
  VariableEffectDetail,
  YMonthResult
} from './types'

/** 可触发的演示态异常（文档「错误空态 6 类」的 mock 开关） */
let demoError: 'none' | 'error_network' | 'error_server' = 'none'

/** 指标口径元数据：问号 tooltip 的唯一文案来源 */
const METRIC_METAS: Record<MetricKey, MetricMeta> = {
  MOB3_DPD30: {
    key: 'MOB3_DPD30',
    label: 'MOB3 DPD30',
    description: '放款后第 1-3 个账期内，观察窗末仍逾期 30 天以上的客户占比。',
    numerator: 'MOB3 观察窗末 DPD30+ 客户数',
    denominator: 'MOB3 到期有效客户数',
    period: '上一自然月账单区间',
    granularity: '借据（AOV）粒度，客户去重',
    direction: 'lower_better',
    benchmark: '全库同期均值'
  },
  MOB3_DPD60: {
    key: 'MOB3_DPD60',
    label: 'MOB3 DPD60',
    description: '放款后第 1-3 个账期内，观察窗末仍逾期 60 天以上的客户占比。',
    numerator: 'MOB3 观察窗末 DPD60+ 客户数',
    denominator: 'MOB3 到期有效客户数',
    period: '上一自然月账单区间',
    granularity: '借据粒度，客户去重',
    direction: 'lower_better',
    benchmark: '全库同期均值'
  },
  MOB6_DPD30: {
    key: 'MOB6_DPD30',
    label: 'MOB6 DPD30',
    description: '放款后第 1-6 个账期内，观察窗末仍逾期 30 天以上的客户占比，用于长周期复核。',
    numerator: 'MOB6 观察窗末 DPD30+ 客户数',
    denominator: 'MOB6 到期有效客户数',
    period: '半年前批次滚动口径',
    granularity: '借据粒度，客户去重',
    direction: 'lower_better',
    benchmark: '全库同期均值'
  },
  FDP7_DPD7: {
    key: 'FDP7_DPD7',
    label: 'FDP7 DPD7',
    description: '首逾（First Delinquency）后 7 天内即发生 7+ 天逾期的比例，反应早期风险。',
    numerator: '首逾 7 天内 DPD7+ 借据数',
    denominator: '首期到期有效借据数',
    period: '上一自然月首期到期批次',
    granularity: '借据粒度',
    direction: 'lower_better',
    benchmark: '全库同期均值'
  },
  FDP7_DPD15: {
    key: 'FDP7_DPD15',
    label: 'FDP7 DPD15',
    description: '首逾后 7 天观察窗内发生 15+ 天逾期的比例，用于区分短期与持续逾期。',
    numerator: '首逾 7 天内 DPD15+ 借据数',
    denominator: '首期到期有效借据数',
    period: '上一自然月首期到期批次',
    granularity: '借据粒度',
    direction: 'lower_better',
    benchmark: '全库同期均值'
  },
  FDP7_DPD30: {
    key: 'FDP7_DPD30',
    label: 'FDP7 DPD30 提升度',
    description: '该变量头尾分箱的 DPD30+ 逾期率提升倍数，越大代表区分能力越强。',
    numerator: '最差分箱 DPD30+ 逾期率',
    denominator: '全量 DPD30+ 逾期率',
    period: '上一自然月首期到期批次',
    granularity: '分箱粒度',
    direction: 'higher_better',
    benchmark: '1.0（无区分度）'
  }
}

/** 默认 Y 标签：未指定时用第一个指标（MOB3 DPD30） */
const DEFAULT_Y_KEY: MetricKey = METRIC_DEFS[0].key

/** 排序字段白名单：组件传入非法值时回落到默认，避免排序口径失控 */
const SORTABLE: Record<string, (a: EffectRow, b: EffectRow) => number> = {
  effectIndex: (a, b) => a.effectIndex - b.effectIndex,
  callCount: (a, b) => a.callCount - b.callCount,
  callCustomerCount: (a, b) => a.callCustomerCount - b.callCustomerCount,
  missingRate: (a, b) => a.missingRate - b.missingRate,
  likes: (a, b) => a.likes - b.likes,
  name: (a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'),
  /** 渠道排序：按使用该变量的渠道（平台）个数 */
  platformCount: (a, b) => a.platformCount - b.platformCount,
  /** 价格枚举（免费 / 低 / 中 / 高）：按枚举权重比较，而非底层单价 */
  priceLevel: (a, b) => PRICE_LEVEL_RANK[a.priceLevel] - PRICE_LEVEL_RANK[b.priceLevel],
  /** 授信 / 支用量级（万次）与占比 */
  grantCalls: (a, b) => a.grantCalls - b.grantCalls,
  loanCalls: (a, b) => a.loanCalls - b.loanCalls,
  grantRatio: (a, b) => a.grantRatio - b.grantRatio,
  loanRatio: (a, b) => a.loanRatio - b.loanRatio,
  /** 当前 Y 标签的 lift；lift 均值在同一标签下恒定，故与 lift 同序 */
  lift: (a, b) => a.lift - b.lift,
  liftMean: (a, b) => a.lift - b.lift,
  /** 当前选中 Y 标签的当期值 */
  yValue: (a, b) => a.yValue - b.yValue
}

/** 环节占比文案：分母为 0（零调用变量）时输出破折号 */
function ratioTextOf(part: number, total: number): string {
  if (!total) return '—'
  return `${((part / total) * 100).toFixed(1)}%`
}

/** 单月环比文案：百分比指标用百分点差，增益指标用倍数差 */
function deltaTextOf(unit: 'percent' | 'multiple', prev: number, cur: number): string {
  const d = unit === 'percent' ? (cur - prev) * 100 : cur - prev
  if (Math.abs(d) < 0.005) return '持平'
  return `${d > 0 ? '+' : ''}${d.toFixed(2)}`
}

/**
 * 月份归一：将逗号分隔的月份字符串解析为月份数组
 * 非法值 / 缺省回落到近 4 个月
 */
function resolveMonths(raw?: string): string[] {
  if (raw) {
    const list = raw.split(',').map((s) => s.trim()).filter(Boolean)
    if (list.length) return list
  }
  return defaultMonths()
}

/** 全部可选月份（HISTORY_MONTHS 共 12 个月） */
function allMonths(): string[] {
  return [...HISTORY_MONTHS]
}

/** 默认月份：近 4 个月 */
function defaultMonths(): string[] {
  return HISTORY_MONTHS.slice(-DEFAULT_RANGE)
}

/**
 * 把一个 Y 标签指标单元格拆成时间区间内的结果列（由旧到新，末月即本期)
 * @param cell 指标单元格（history 为近 12 个月)
 * @param months 选中的月份列表
 */
function buildYMonths(cell: MetricCell, months: string[]): YMonthResult[] {
  // 根据月份找到对应的 history 索引，过滤掉无效月份
  const validPairs = months
    .map((m) => {
      const idx = HISTORY_MONTHS.indexOf(m)
      return idx >= 0 ? { month: m, point: cell.history[idx] } : null
    })
    .filter(Boolean) as { month: string; point: any }[]

  return validPairs.map((pair, i) => ({
    label: pair.month,
    text: formatMetricValue(cell.unit, pair.point.value),
    deltaText: i === 0 ? '' : deltaTextOf(cell.unit, validPairs[i - 1].point.value, pair.point.value),
    judge: pair.point.judge
  }))
}

/**
 * 单指标 lift：统一为「越大越好」
 * 基准取全库同标签的指标均值（而非固定锚点，保证全库 lift 均值贴近 1.00）
 * 越低越好取「均值 ÷ 变量值」，越高越好取「变量值 ÷ 均值」
 * @param cell 指标单元格
 * @param valueMean 全库该标签的指标均值
 */
function liftOf(cell: MetricCell, valueMean: number): number {
  if (!valueMean) return 0
  if (cell.direction === 'higher_better') return cell.value / valueMean
  return cell.value ? valueMean / cell.value : 0
}

/**
 * 按「指标值 + 基线」算 lift（月度快照用，方向口径与 liftOf 完全一致）
 * @param direction 指标方向
 * @param value 指标值
 * @param baseline 基线值（全库同期加权均值）
 */
function liftOfValue(direction: MetricDirection, value: number, baseline: number): number {
  if (!value || !baseline) return 0
  return direction === 'higher_better' ? value / baseline : baseline / value
}

/** 某个月的样本权重：平台筛选时取该平台调用量，否则取全量月调用量 */
function weightOfSample(s: EffectSample, platform?: string): number {
  if (!platform) return s.callCount || 0
  return s.links.reduce((a, l) => a + (l.platform === platform ? l.calls : 0), 0)
}

/**
 * 某月样本集合的加权指标值：Σ(指标 × 权重) / Σ权重
 * 权重为 0 的样本（零调用 / 未在该平台调用）不参与，避免把无调用变量计入整体
 */
function weightedValuesOf(samples: EffectSample[], month: string, platform?: string): Record<string, number> {
  const idx = HISTORY_MONTHS.indexOf(month)
  const num: Record<string, number> = {}
  const den: Record<string, number> = {}
  if (idx < 0) return num
  samples.forEach((s) => {
    const w = weightOfSample(s, platform)
    if (!w) return
    s.metricCells.forEach((c) => {
      const point = c.history[idx]
      if (!point) return
      num[c.key] = (num[c.key] || 0) + point.value * w
      den[c.key] = (den[c.key] || 0) + w
    })
  })
  const out: Record<string, number> = {}
  Object.keys(num).forEach((k) => {
    out[k] = den[k] ? num[k] / den[k] : 0
  })
  return out
}

/** 某月的全库参照基线：各标签加权均值 + lift 均值（同一月份下所有行共用） */
interface MonthBaseline {
  baselineValue: Record<string, number>
  liftMean: Record<string, number>
}

const monthBaselineCache = new Map<string, MonthBaseline>()

/**
 * 计算某月的全库同标签基线（首次访问缓存）
 * 基线 = 全库所有样本按调用量加权的指标均值；lift 均值 = 全库各样本 lift 的算术平均
 * @param month 月份（HISTORY_MONTHS 枚举值）
 */
function monthBaselineOf(month: string): MonthBaseline {
  const cached = monthBaselineCache.get(month)
  if (cached) return cached
  const idx = HISTORY_MONTHS.indexOf(month)
  const samples = getDataset().samples
  const num: Record<string, number> = {}
  const den: Record<string, number> = {}
  const counts: Record<string, number> = {}
  samples.forEach((s) => {
    const w = s.callCount || 0
    if (!w) return
    s.metricCells.forEach((c) => {
      const point = idx >= 0 ? c.history[idx] : undefined
      if (!point) return
      num[c.key] = (num[c.key] || 0) + point.value * w
      den[c.key] = (den[c.key] || 0) + w
    })
  })
  const baselineValue: Record<string, number> = {}
  Object.keys(num).forEach((k) => {
    baselineValue[k] = den[k] ? num[k] / den[k] : 0
  })
  const liftSums: Record<string, number> = {}
  samples.forEach((s) => {
    s.metricCells.forEach((c) => {
      const point = idx >= 0 ? c.history[idx] : undefined
      if (!point) return
      liftSums[c.key] = (liftSums[c.key] || 0) + liftOfValue(c.direction, point.value, baselineValue[c.key] || 0)
      counts[c.key] = (counts[c.key] || 0) + 1
    })
  })
  const liftMean: Record<string, number> = {}
  Object.keys(liftSums).forEach((k) => {
    liftMean[k] = counts[k] ? Number((liftSums[k] / counts[k]).toFixed(2)) : 1
  })
  const result = { baselineValue, liftMean }
  monthBaselineCache.set(month, result)
  return result
}

/** 详情页标签效果最多同时对比的月份数（> 6 列后表格会溢出） */
const MAX_LABEL_MONTHS = 6

/** 时间基准窗口（月）：全部平台口径下以近 4 个月全库均值为对照 */
const TIME_BASELINE_WINDOW = DEFAULT_RANGE

const timeBaselineCache = new Map<string, MonthBaseline>()

/**
 * 时间基准：观察月及之前共 N 个月的全库加权均值（合并加权，等价于窗口内总体均值）
 * 全部平台口径下样本集合就是全库，用「全库同期均值」作对照会恒等于 1.00，
 * 因此改用时间基准，让整体标签效果反映「当月 vs 近 N 个月水平」。
 * @param month 观察月（HISTORY_MONTHS 枚举值）
 * @param windowSize 窗口月数
 */
function timeBaselineOf(month: string, windowSize: number): MonthBaseline {
  const cacheKey = `${month}|${windowSize}`
  const cached = timeBaselineCache.get(cacheKey)
  if (cached) return cached
  const end = HISTORY_MONTHS.indexOf(month)
  const start = end >= 0 ? Math.max(0, end - windowSize + 1) : 0
  const idxList = HISTORY_MONTHS.map((_, i) => i).slice(start, end + 1)
  const samples = getDataset().samples
  const num: Record<string, number> = {}
  const den: Record<string, number> = {}
  const counts: Record<string, number> = {}
  const liftSums: Record<string, number> = {}
  samples.forEach((s) => {
    const w = s.callCount || 0
    if (!w) return
    s.metricCells.forEach((c) => {
      idxList.forEach((i) => {
        const point = c.history[i]
        if (!point) return
        num[c.key] = (num[c.key] || 0) + point.value * w
        den[c.key] = (den[c.key] || 0) + w
      })
    })
  })
  const baselineValue: Record<string, number> = {}
  Object.keys(num).forEach((k) => {
    baselineValue[k] = den[k] ? num[k] / den[k] : 0
  })
  /** lift 均值：全库各变量用「当期值 ÷ 时间基准」算 lift 再平均（与行内 lift 同口径） */
  const curIdx = end >= 0 ? end : HISTORY_MONTHS.length - 1
  samples.forEach((s) => {
    s.metricCells.forEach((c) => {
      const point = c.history[curIdx]
      if (!point) return
      liftSums[c.key] = (liftSums[c.key] || 0) + liftOfValue(c.direction, point.value, baselineValue[c.key] || 0)
      counts[c.key] = (counts[c.key] || 0) + 1
    })
  })
  const liftMean: Record<string, number> = {}
  Object.keys(liftSums).forEach((k) => {
    liftMean[k] = counts[k] ? Number((liftSums[k] / counts[k]).toFixed(2)) : 1
  })
  const result = { baselineValue, liftMean }
  timeBaselineCache.set(cacheKey, result)
  return result
}

/** lift 参照基线：全库同标签的指标均值 + lift 均值 */
interface LiftBaseline {
  valueMean: Record<string, number>
  liftMean: Record<string, number>
}

let liftBaselineCache: LiftBaseline | null = null

/**
 * 全库 lift 参照基线（数据集固定，首次访问时算一次）
 * 先求各标签的指标均值，再以该均值为基准求全库 lift 平均，保证参照线为 1.00
 */
function liftBaseline(): LiftBaseline {
  if (liftBaselineCache) return liftBaselineCache
  const samples = getDataset().samples
  const valueSums: Record<string, number> = {}
  const counts: Record<string, number> = {}
  samples.forEach((s) => {
    s.metricCells.forEach((c) => {
      valueSums[c.key] = (valueSums[c.key] || 0) + c.value
      counts[c.key] = (counts[c.key] || 0) + 1
    })
  })
  const valueMean: Record<string, number> = {}
  Object.keys(valueSums).forEach((k) => {
    valueMean[k] = counts[k] ? valueSums[k] / counts[k] : 0
  })
  const liftSums: Record<string, number> = {}
  samples.forEach((s) => {
    s.metricCells.forEach((c) => {
      liftSums[c.key] = (liftSums[c.key] || 0) + liftOf(c, valueMean[c.key])
    })
  })
  const liftMean: Record<string, number> = {}
  Object.keys(liftSums).forEach((k) => {
    liftMean[k] = counts[k] ? Number((liftSums[k] / counts[k]).toFixed(2)) : 1
  })
  liftBaselineCache = { valueMean, liftMean }
  return liftBaselineCache
}

/** 详情页对照基线缓存：key = `${month}|${platform || '*'}` */
const meanBaselineCache = new Map<string, LiftBaseline>()

/**
 * 详情页标签效果的对照基线（算术均值口径，与 liftBaseline 完全一致）
 * - 全部平台 + 最新月：直接复用 liftBaseline，保证同一变量在列表页与本页的 lift 完全相同
 * - 选定平台：只看该平台有调用的样本；指定月份：取各样本该月的历史值
 * 样本间取算术平均（不按调用量加权）：详情页是「单变量值 vs 均值」的单点对照，
 * 加权会引入调用量权重，与行的单点口径不同源
 * @param month 观察月（HISTORY_MONTHS 枚举值）
 * @param platform 平台名；不传 = 全部平台
 */
function meanBaselineOf(month: string, platform?: string): LiftBaseline {
  const isLatest = month === HISTORY_MONTHS[HISTORY_MONTHS.length - 1]
  if (!platform && isLatest) return liftBaseline()
  const cacheKey = `${month}|${platform || '*'}`
  const cached = meanBaselineCache.get(cacheKey)
  if (cached) return cached
  const idx = HISTORY_MONTHS.indexOf(month)
  const samples = platform
    ? getDataset().samples.filter((s) => s.links.some((l) => l.platform === platform && l.calls > 0))
    : getDataset().samples
  const valueSums: Record<string, number> = {}
  const counts: Record<string, number> = {}
  samples.forEach((s) => {
    s.metricCells.forEach((c) => {
      const point = idx >= 0 ? c.history[idx] : undefined
      if (!point) return
      valueSums[c.key] = (valueSums[c.key] || 0) + point.value
      counts[c.key] = (counts[c.key] || 0) + 1
    })
  })
  const valueMean: Record<string, number> = {}
  Object.keys(valueSums).forEach((k) => {
    valueMean[k] = counts[k] ? valueSums[k] / counts[k] : 0
  })
  const liftSums: Record<string, number> = {}
  samples.forEach((s) => {
    s.metricCells.forEach((c) => {
      const point = idx >= 0 ? c.history[idx] : undefined
      if (!point) return
      liftSums[c.key] = (liftSums[c.key] || 0) + liftOfValue(c.direction, point.value, valueMean[c.key] || 0)
    })
  })
  const liftMean: Record<string, number> = {}
  Object.keys(liftSums).forEach((k) => {
    liftMean[k] = counts[k] ? Number((liftSums[k] / counts[k]).toFixed(2)) : 1
  })
  const result = { valueMean, liftMean }
  meanBaselineCache.set(cacheKey, result)
  return result
}

/**
 * 分平台使用深度行：量级统一补「万次」，占比分母为该平台月调用量
 * 零调用平台的占比给破折号，避免出现 0.0% 造成误读
 */
function platformUsageRowOf(
  platform: string,
  stateText: string,
  calls: number,
  grantCalls: number,
  loanCalls: number,
  midloanCalls: number
): PlatformUsageRow {
  return {
    platform,
    stateText,
    calls,
    callsText: `${calls} 万次`,
    grantCalls,
    grantText: `${grantCalls} 万次`,
    grantRatioText: ratioTextOf(grantCalls, calls),
    loanCalls,
    loanText: `${loanCalls} 万次`,
    loanRatioText: ratioTextOf(loanCalls, calls),
    midloanCalls,
    midloanText: `${midloanCalls} 万次`
  }
}

export const effectStore = {
  /**
   * 打开 / 关闭演示态异常（供错误空态演示，正常运行时保持 none）
   */
  setDemoError(kind: 'none' | 'error_network' | 'error_server') {
    demoError = kind
  },

  /** 当前演示态异常 */
  getDemoError() {
    return demoError
  },

  /**
   * 总览区数据：区间 / 执行信息 / 效果四数与环比 / 策略平台分布 / 覆盖说明
   * 所有聚合在本函数内完成，组件只做渲染
   */
  overview(): EffectOverview {
    const ds = getDataset()
    const coverage = EFFECT_SAMPLE_TOTAL
    const ledgerCount = ds.samples.filter((s) => !s.synthetic).length
    const syntheticCount = coverage - ledgerCount
    const markedCount = effectOpinionStore.markedIds().size

    return {
      periodLabel: `${ds.periodStart} ~ ${ds.periodEnd}`,
      periodStart: ds.periodStart,
      periodEnd: ds.periodEnd,
      lastRunAt: ds.lastRunAt,
      nextRunAt: ds.nextRunAt,
      runProgress: {
        done: coverage,
        total: coverage,
        status: 'success'
      },
      numbers: [
        {
          key: 'coverage',
          label: '效果域覆盖变量',
          value: coverage,
          delta: ledgerCount,
          deltaLabel: `台账正式资产 ${ledgerCount} 个`,
          unit: '个',
          anchor: 'recommend',
          tab: 'all'
        },
        {
          key: 'offline',
          label: '建议汰换',
          value: ds.offlineCount,
          delta: ds.offlineCount - ds.prevOfflineCount,
          deltaLabel: `较上期 +${ds.offlineCount - ds.prevOfflineCount}`,
          unit: '个',
          anchor: 'recommend',
          tab: 'offline'
        },
        {
          key: 'online',
          label: '推荐使用',
          value: ds.onlineCount,
          delta: ds.onlineCount - ds.prevOnlineCount,
          deltaLabel: `较上期 +${ds.onlineCount - ds.prevOnlineCount}`,
          unit: '个',
          anchor: 'recommend',
          tab: 'online'
        },
        {
          key: 'calls',
          label: '月调用量',
          value: ds.totalCalls,
          delta: markedCount,
          deltaLabel: `已人工标记 ${markedCount} 个`,
          unit: '万次',
          anchor: 'recommend',
          tab: 'all'
        }
      ],
      platformDistribution: ds.platforms.map((p) => ({ ...p })),
      zeroCallPlatforms: ds.platforms
        .filter((p) => p.state !== 'active')
        .map((p) => ({ platform: p.platform, state: p.state, stateText: p.stateText })),
      coverageNote: `效果域样本 ${coverage} 个（含 ${syntheticCount} 条演示合成），台账正式资产 ${ledgerCount} 个；412 为效果域口径，不代表台账资产总数。`
    }
  },

  /**
   * 筛选项字典：策略平台 / 变量类型 / Y 标签 / 时间区间 / 可排序字段（组件不硬编码枚举）
   * 一级分类与更新频率已从展示侧移除，不再下发
   */
  filterOptions() {
    const ds = getDataset()
    return {
      platforms: ds.platforms.map((p) => ({ label: p.platform, value: p.platform, count: p.boundCount })),
      /** 变量类型：外数 / 行为变量 / 征信变量（替代原「来源」筛选） */
      variableTypes: (Object.keys(VARIABLE_TYPE_LABELS) as (keyof typeof VARIABLE_TYPE_LABELS)[]).map((k) => ({
        label: VARIABLE_TYPE_LABELS[k],
        value: k,
        count: ds.samples.filter((s) => s.variableType === k).length
      })),
      /** Y 标签：表格上方单选，切换只影响结果列 */
      yLabels: METRIC_DEFS.map((d) => ({ label: d.label, value: d.key, unit: d.unit })),
      /** 时间区间选项：列表与详情页共用同一字典，默认近 4 个月 */
      ranges: RANGE_OPTIONS.map((o) => ({ ...o })),
      defaultRange: DEFAULT_RANGE,
      sortKeys: [
        { label: '综合效果指数', value: 'effectIndex' },
        { label: '变量名', value: 'name' },
        { label: '渠道数', value: 'platformCount' },
        { label: '价格', value: 'priceLevel' },
        { label: '授信量级', value: 'grantCalls' },
        { label: '支用量级', value: 'loanCalls' },
        { label: '授信量级占比', value: 'grantRatio' },
        { label: '支用量级占比', value: 'loanRatio' },
        { label: 'Y 标签 lift', value: 'lift' },
        { label: 'Y 标签 lift 均值', value: 'liftMean' },
        { label: 'Y 标签当期值', value: 'yValue' }
      ],
      /** lift 与均值关系筛选选项：均值列在同标签下恒定，用「相对均值」表达筛选口径 */
      liftCompare: [
        { label: '优于 lift 均值', value: 'above' },
        { label: '低于 lift 均值', value: 'below' }
      ],
      verdicts: [
        { label: '全部', value: 'all' },
        { label: '汰换', value: 'offline' },
        { label: '推荐', value: 'online' },
        { label: '观察', value: 'neutral' }
      ]
    }
  },

  /**
   * 时间区间内的月份标签（与行内 yMonths 一一对应）
   * @param raw 逗号分隔的月份字符串，缺省回落近 4 个月
   */
  monthsOf(raw?: string): string[] {
    return resolveMonths(raw)
  },

  /** 全部可选月份（HISTORY_MONTHS 共 12 个月） */
  allMonths(): string[] {
    return allMonths()
  },

  /** 默认月份：近 4 个月 */
  defaultMonths(): string[] {
    return defaultMonths()
  },

  /** 时间区间选项（列表与详情页共用，组件不硬编码） */
  rangeOptions(): { label: string; value: number }[] {
    return RANGE_OPTIONS.map((o) => ({ ...o }))
  },

  /**
   * 推荐列表：tab / 筛选（含量级·占比·lift 下限）/ Y 标签 / 时间区间 / 排序 / 分页全部在本方法内完成
   * @param p 列表入参（由 URL query 直译而来）
   */
  listRows(p: EffectListParams = {}): EffectListResult {
    const ds = getDataset()
    const tab = p.tab || 'all'
    const keyword = (p.keyword || '').trim().toLowerCase()
    const minCalls = Number(p.minCalls || 0)
    /** 量级下限（万次）与占比下限（% → 0-1） */
    const minGrantCalls = Number(p.minGrantCalls || 0)
    const minLoanCalls = Number(p.minLoanCalls || 0)
    const minGrantRatio = Number(p.minGrantRatio || 0) / 100
    const minLoanRatio = Number(p.minLoanRatio || 0) / 100
    const minLift = Number(p.minLift || 0)
    const liftVsMean = p.liftVsMean === 'above' || p.liftVsMean === 'below' ? p.liftVsMean : ''
    const mode = p.mode === 'all' ? 'all' : 'top'
    const page = Math.max(1, Number(p.page || 1))
    const pageSize = mode === 'top' ? 20 : Math.min(100, Math.max(10, Number(p.pageSize || 50)))

    /** 选中 Y 标签：非法值回落到默认指标，保证列头与数据永远一致 */
    const yKey: MetricKey = p.y && METRIC_DEFS.some((d) => d.key === p.y) ? (p.y as MetricKey) : DEFAULT_Y_KEY
    const yDef = METRIC_DEFS.find((d) => d.key === yKey) || METRIC_DEFS[0]
    /** 时间区间：UI 可选，只影响结果列宽度，不参与筛选 */
    const months = resolveMonths(p.months)
    const baseline = liftBaseline()
    const yLiftMean = baseline.liftMean[yKey] ?? 1

    const hasFilter = !!(
      keyword ||
      p.platform ||
      p.variableType ||
      minCalls > 0 ||
      minGrantCalls > 0 ||
      minLoanCalls > 0 ||
      minGrantRatio > 0 ||
      minLoanRatio > 0 ||
      minLift > 0 ||
      liftVsMean
    )

    /** 演示态异常优先返回：组件按 state 渲染错误态 */
    if (demoError !== 'none') {
      return { total: 0, page, pageSize, rows: [], fullCount: 0, state: demoError as EffectListState }
    }

    const marked = effectOpinionStore.markedIds()
    const rows: EffectRow[] = ds.samples
      .filter((s) => (tab === 'all' ? true : s.verdict === tab))
      .filter((s) => (p.platform ? s.platforms.includes(p.platform) : true))
      .filter((s) => (p.variableType ? s.variableType === p.variableType : true))
      .filter((s) => (minCalls > 0 ? s.callCount >= minCalls : true))
      .filter((s) =>
        keyword
          ? s.name.toLowerCase().includes(keyword) ||
            s.code.toLowerCase().includes(keyword) ||
            s.variableId.toLowerCase().includes(keyword)
          : true
      )
      .map((s) => {
        const row = toRow(s)
        /** 选中 Y 标签的当期值与时间区间结果：判断与文案均在 mock 层算好 */
        const yCell = s.metricCells.find((c) => c.key === yKey) || s.metricCells[0]
        const grantCalls = s.usage.grantCalls
        const loanCalls = s.usage.loanCalls
        const grantRatio = s.callCount ? grantCalls / s.callCount : 0
        const loanRatio = s.callCount ? loanCalls / s.callCount : 0
        /** 当前标签的 lift：与详情页同一套基线，保证列表与详情口径一致 */
        const lift = Number(liftOf(yCell, baseline.valueMean[yKey] || 0).toFixed(2))
        return {
          ...row,
          /** 环节占比与量级由 store 算好，价格直接给枚举文案（免费 / 低 / 中 / 高） */
          priceLevel: s.priceLevel,
          priceLevelLabel: s.priceLevelLabel,
          grantCalls,
          loanCalls,
          grantRatio,
          loanRatio,
          grantRatioText: ratioTextOf(grantCalls, s.callCount),
          loanRatioText: ratioTextOf(loanCalls, s.callCount),
          yKey,
          yLabel: yDef.label,
          lift,
          liftText: `${lift.toFixed(2)} 倍`,
          liftMean: yLiftMean,
          liftMeanText: `${yLiftMean.toFixed(2)} 倍`,
          yValue: yCell.value,
          yMonths: buildYMonths(yCell, months),
          /** 赞数与评论数来自 opinion-store，保证列表与详情明细口径一致 */
          likes: effectOpinionStore.likesOf(s.variableId),
          comments: effectOpinionStore.commentsOf(s.variableId),
          marked: marked.has(s.variableId),
          markType: marked.get(s.variableId)
        }
      })
      /** 行级数值筛选：量级（万次）/ 占比 / lift 及其与均值的比较 */
      .filter((r) => (minGrantCalls > 0 ? r.grantCalls >= minGrantCalls : true))
      .filter((r) => (minLoanCalls > 0 ? r.loanCalls >= minLoanCalls : true))
      .filter((r) => (minGrantRatio > 0 ? r.grantRatio >= minGrantRatio : true))
      .filter((r) => (minLoanRatio > 0 ? r.loanRatio >= minLoanRatio : true))
      .filter((r) => (minLift > 0 ? r.lift >= minLift : true))
      .filter((r) => {
        if (!liftVsMean) return true
        return liftVsMean === 'above' ? r.lift > r.liftMean : r.lift < r.liftMean
      })

    // 多字段排序：sortBy 和 sortOrder 都是逗号分隔的字符串
    const sortFields = (p.sortBy || 'effectIndex').split(',').map((s) => s.trim()).filter(Boolean)
    const sortOrders = (p.sortOrder || 'desc').split(',').map((s) => s.trim())
    
    rows.sort((a, b) => {
      for (let i = 0; i < sortFields.length; i++) {
        const field = sortFields[i]
        const fn = SORTABLE[field] || SORTABLE.effectIndex
        const order = sortOrders[i] === 'asc' ? 1 : -1
        const cmp = fn(a, b) * order
        if (cmp !== 0) return cmp
      }
      return a.variableId.localeCompare(b.variableId)
    })

    const total = rows.length
    const sliced = mode === 'top' ? rows.slice(0, 20) : rows.slice((page - 1) * pageSize, page * pageSize)

    let state: EffectListState = 'none'
    if (total === 0) state = hasFilter ? 'empty_filter' : 'empty_data'

    return { total, page: Math.min(page, Math.max(1, Math.ceil(total / pageSize) || 1)), pageSize, rows: sliced, fullCount: total, state }
  },

  /**
   * 行内展开明细：6 标签效果指数 + 使用深度 + 分平台用量 + 口径提示
   * @param variableId 特征 ID
   * @param platform 选中的策略平台（不传 / 非法值 = 全部平台汇总）
   */
  expandRow(variableId: string, platform?: string, months?: string[]): EffectExpanded | null {
    const ds = getDataset()
    const s = ds.byId.get(variableId)
    if (!s) return null
    /** 观察月：非法值回落到最新月（末月即本期） */
    const latestMonth = HISTORY_MONTHS[HISTORY_MONTHS.length - 1]
    const picked = Array.isArray(months)
      ? months.map(String).filter((m) => HISTORY_MONTHS.includes(m))
      : []
    const selectedMonths = picked.length ? picked : [latestMonth]
    const monthRangeText = selectedMonths.length > 1
      ? `${selectedMonths[0]} ~ ${selectedMonths[selectedMonths.length - 1]}（${selectedMonths.length} 个月）`
      : selectedMonths[0]
    const notes = [
      s.platformCount === 0
        ? '该变量尚未被任何策略渠道（蚂蚁 / 京东 / 美团等）使用，效果结论仅供参考。'
        : `该变量被 ${s.platformCount} 个策略渠道使用，当前观察月 ${monthRangeText}，调用量与占比按此口径统计。`,
      s.missingRate > 0.12 ? `缺失率 ${formatMissingRate(s.missingRate)}，高于 12% 阈值，建议先对齐上游产出再定结论。` : `缺失率 ${formatMissingRate(s.missingRate)}，在可接受区间内。`,
      s.synthetic ? '演示合成样本，非台账正式资产，档案信息见详情页兜底渲染。' : '台账正式资产，效果结论可回写特征档案。'
    ]
    /**
     * 分渠道使用深度：只列绑定过的渠道，按渠道调用量降序
     * 量级与占比均由 store 算好，组件只渲染，不自行相加或除
     * 有数据的渠道都视为正常调用，不区分调用状态
     */
    const platformUsage = [...s.links]
      .sort((a, b) => b.calls - a.calls || a.platform.localeCompare(b.platform))
      .map((l) =>
        platformUsageRowOf(
          l.platform,
          '',
          l.calls,
          l.grantCalls,
          l.loanCalls,
          l.midloanCalls
        )
      )
    const activePlatforms = s.links.filter((l) => l.calls > 0).length
    const platformUsageTotal = platformUsageRowOf(
      '合计',
      `${activePlatforms} 个渠道有数据`,
      s.callCount,
      s.usage.grantCalls,
      s.usage.loanCalls,
      s.usage.midloanCalls
    )
    /** 切换渠道：只接受该变量真实绑定的渠道，非法值回落全部渠道 */
    const selectedPlatform = platform && s.links.some((l) => l.platform === platform) ? platform : null
    const scope = selectedPlatform
      ? platformUsage.find((r) => r.platform === selectedPlatform) || platformUsageTotal
      : platformUsageTotal
    return {
      variableId,
      metrics: s.metricCells.map((m) => ({ ...m })),
      usage: { ...s.usage },
      platformUsage,
      platformUsageTotal,
      selectedPlatform,
      scope,
      notes,
      months: selectedMonths
    }
  },

  /** 指标口径元数据（问号 tooltip 文案的唯一来源） */
  metricMeta(key: string): MetricMeta | null {
    return METRIC_METAS[key as MetricKey] || null
  },

  /** 全部指标的口径列表 */
  metricMetaList(): MetricMeta[] {
    return METRIC_DEFS.map((d) => METRIC_METAS[d.key])
  },

  /**
   * 详情页 · 标签效果：按渠道（单选）+ 观察月（多选）逐行给出该变量 6 个标签的结果
   * 每个选中月一格：指标值 / 对照值 / lift；行的 lift 均值 / 环比 / 判断统一取最新选中月
   * lift 统一为「越大越好」（1.00 为基准），所有数值与文案在本方法内算好，组件只渲染
   * 渠道只接受该变量真实绑定的渠道；观察月最多 MAX_LABEL_MONTHS 个，非法值 / 空选回落最新月
   * @param variableId 特征 ID（台账或合成 ID 均可）
   * @param p 渠道与观察月多选
   */
  labelEffect(variableId: string, p: LabelEffectParams = {}): LabelEffectResult | null {
    const s = getDataset().byId.get(variableId)
    if (!s) return null
    /** 渠道：非法 / 未绑定一律回落全部渠道，避免拿不存在的口径算 lift */
    const platform = p.platform && s.links.some((l) => l.platform === p.platform) ? p.platform : ''
    const platformText = platform || '全部渠道'
    const latestMonth = HISTORY_MONTHS[HISTORY_MONTHS.length - 1]
    /** 观察月多选：去重 → 按历史顺序（由旧到新）→ 超过上限时保留最近的几个 */
    const picked = Array.isArray(p.months)
      ? p.months.map(String).filter((m) => HISTORY_MONTHS.includes(m))
      : []
    const selectedMonths = Array.from(new Set(picked.length ? picked : [latestMonth]))
      .sort((a, b) => HISTORY_MONTHS.indexOf(a) - HISTORY_MONTHS.indexOf(b))
      .slice(-MAX_LABEL_MONTHS)
    /** 最新选中月：结论、lift 均值列、环比列与判断列的口径 */
    const month = selectedMonths[selectedMonths.length - 1]
    const idx = HISTORY_MONTHS.indexOf(month)
    const prevMonth = idx > 0 ? HISTORY_MONTHS[idx - 1] : ''
    const months = [...HISTORY_MONTHS].reverse().map((m) => ({ label: m, value: m }))
    /** 渠道选项：全部渠道 + 该变量绑定渠道，label 直接带调用量 */
    const platformOptions = [
      { label: `全部渠道 · 调用 ${s.callCount || 0} 万次`, value: '' },
      ...s.links.map((l) => ({
        label: `${l.platform} · 调用 ${l.calls} 万次`,
        value: l.platform
      }))
    ]
    const baselineLabel = platform ? `${platform} 同期均值` : '全库同期均值'

    /** 零调用渠道：没有可对照的调用行为，直接给空态 */
    const platformCalls = platform
      ? s.links.reduce((a, l) => a + (l.platform === platform ? l.calls : 0), 0)
      : 0
    if (platform && !platformCalls) {
      return {
        variableId,
        platform,
        platformText,
        month,
        selectedMonths,
        monthLimit: MAX_LABEL_MONTHS,
        months,
        platformOptions,
        baselineLabel,
        rows: [],
        summaryText: `${platformText} · ${selectedMonths.join(' / ')}：该变量在该渠道暂无调用数据，没有可评估的标签指标。`,
        empty: true,
        emptyText: `该变量在 ${platform} 暂无调用数据，切换到其他渠道或选「全部渠道」查看。`
      }
    }

    const prevBase = prevMonth ? meanBaselineOf(prevMonth, platform || undefined) : null
    const prevIdx = prevMonth ? HISTORY_MONTHS.indexOf(prevMonth) : -1
    /** 行按最新选中月 lift 降序：一眼看到区分能力最强的标签（与列表页整体标签效果同序） */
    const rows: LabelEffectRow[] = s.metricCells
      .map((cell) => {
        const def = METRIC_DEFS.find((d) => d.key === cell.key) || METRIC_DEFS[0]
        /** 每月一格：对照基线按月取（平台口径下换成该平台同期均值） */
        const cells: LabelEffectMonthCell[] = selectedMonths.map((m) => {
          const i = HISTORY_MONTHS.indexOf(m)
          const monthBase = meanBaselineOf(m, platform || undefined)
          const point = i >= 0 ? cell.history[i] : undefined
          const value = point ? point.value : cell.value
          const baselineValue = monthBase.valueMean[cell.key] || 0
          const lift = Number(liftOfValue(cell.direction, value, baselineValue).toFixed(2))
          const liftMean = monthBase.liftMean[cell.key] ?? 1
          const diff = lift - 1
          return {
            month: m,
            value,
            valueText: formatMetricValue(def.unit, value),
            baselineValue,
            baselineText: baselineValue ? formatMetricValue(def.unit, baselineValue) : '—',
            lift,
            liftText: lift ? `${lift.toFixed(2)} 倍` : '—',
            liftMean,
            liftMeanText: `${liftMean.toFixed(2)} 倍`,
            judge: !lift ? '持平' : Math.abs(diff) < 0.01 ? '持平' : diff > 0 ? '好' : '差'
          } as LabelEffectMonthCell
        })
        /** 行级指标全部取最新选中月 */
        const last = cells[cells.length - 1]
        const lift = last.lift
        const liftMean = last.liftMean
        const prevPoint = prevBase && prevIdx >= 0 ? cell.history[prevIdx] : undefined
        const prevLift = prevBase && prevPoint
          ? liftOfValue(cell.direction, prevPoint.value, prevBase.valueMean[cell.key] || 0)
          : 0
        const mom = prevLift ? Number((lift - prevLift).toFixed(2)) : null
        const momDir = mom === null ? 'none' : Math.abs(mom) < 0.01 ? 'flat' : mom > 0 ? 'up' : 'down'
        /** 判断以 1.00 为基准（lift 均值仅作参照列，避免参照线大于 1 造成误读） */
        const diff = lift - 1
        const judge = last.judge
        return {
          yKey: cell.key,
          yLabel: def.label,
          cells,
          lift,
          liftText: last.liftText,
          liftMean,
          liftMeanText: last.liftMeanText,
          mom,
          momText: mom === null ? '—' : Math.abs(mom) < 0.01 ? '持平' : `${mom > 0 ? '+' : ''}${mom.toFixed(2)}`,
          momDir,
          judge,
          diffText: !lift
            ? '本期无有效数据'
            : judge === '持平'
              ? `与${baselineLabel}持平`
              : `${diff > 0 ? '高于' : '低于'}${baselineLabel} ${Math.abs(diff).toFixed(2)} 倍`,
          validSamples: cell.validSamples
        } as LabelEffectRow
      })
      .sort((a, b) => b.lift - a.lift)
    const best = rows[0]
    const worst = rows[rows.length - 1]
    /** 优于基准（1.00）的标签数：用于一句话结论，避免「最高但仍是差」的歧义 */
    const betterCount = rows.filter((r) => r.judge === '好').length
    const betterText = betterCount === 0
      ? '全部未达'
      : betterCount === rows.length ? '全部优于' : `${betterCount} 个优于`
    const scopeText = selectedMonths.length > 1
      ? `${selectedMonths[0]} ~ ${month}（${selectedMonths.length} 个月）`
      : month
    return {
      variableId,
      platform,
      platformText,
      month,
      selectedMonths,
      monthLimit: MAX_LABEL_MONTHS,
      months,
      platformOptions,
      baselineLabel,
      rows,
      summaryText: `${platformText} · ${scopeText}：最新月 ${rows.length} 个标签中 ${best.yLabel} lift 最高（${best.liftText}），${worst.yLabel} 最低（${worst.liftText}）；${betterText}${baselineLabel}（lift > 1.00 为优）。`,
      empty: false,
      emptyText: ''
    }
  },

  /**
   * 列表页 · 整体标签效果：指定平台（渠道）+ 单个观察月的 6 个标签整体口径
   * 样本集合跟随平台的筛选（平台 / 变量类型 / 搜索 / 最小调用量），
   * 不含 lift / 占比 / 量级阈值这类结果类筛选，避免「用 lift 筛样本又算 lift」的循环。
   * @param p 平台与月份入参
   */
  overallLabelEffect(p: OverallLabelEffectParams = {}): OverallLabelEffectResult {
    const ds = getDataset()
    const platform = p.platform || ''
    const platformText = platform || '全部平台'
    /** 观察月：非法值回落到最新月（末月即本期） */
    const month = p.month && HISTORY_MONTHS.includes(String(p.month))
      ? String(p.month)
      : HISTORY_MONTHS[HISTORY_MONTHS.length - 1]
    const idx = HISTORY_MONTHS.indexOf(month)
    const prevMonth = idx > 0 ? HISTORY_MONTHS[idx - 1] : ''
    const months = [...HISTORY_MONTHS].reverse().map((m) => ({ label: m, value: m }))

    const keyword = (p.keyword || '').trim().toLowerCase()
    const minCalls = Number(p.minCalls || 0)
    const scoped = ds.samples
      .filter((s) => (platform ? s.links.some((l) => l.platform === platform) : true))
      .filter((s) => (p.variableType ? s.variableType === p.variableType : true))
      .filter((s) => (minCalls > 0 ? s.callCount >= minCalls : true))
      .filter((s) =>
        keyword
          ? s.name.toLowerCase().includes(keyword) ||
            s.code.toLowerCase().includes(keyword) ||
            s.variableId.toLowerCase().includes(keyword)
          : true
      )
    const sampleCount = scoped.length
    const calls = scoped.reduce((a, s) => a + weightOfSample(s, platform || undefined), 0)
    /**
     * 对照口径：选平台 = 「全库同期均值」（平台差异）；全部平台 = 「全库近 N 个月均值」（时间水平）
     * 全部平台时样本集合就是全库，用同期均值作对照会恒等于 1.00，没有信息量
     */
    const useTimeBaseline = !platform
    const baselineLabel = useTimeBaseline ? `全库近 ${TIME_BASELINE_WINDOW} 个月均值` : '全库同期均值'

    /** 空样本：直接给空态，不造假 0 值行 */
    if (!sampleCount) {
      return {
        platform,
        platformText,
        month,
        months,
        baselineLabel,
        sampleCount: 0,
        callsText: '0 万次',
        rows: [],
        summaryText: `${platformText} 下没有符合当前筛选条件的变量，试试切换平台或放宽筛选。`,
        empty: true
      }
    }

    /** 有绑定但零调用（已接入未调用）：没有可加权的指标值，同样给空态 */
    if (!calls) {
      return {
        platform,
        platformText,
        month,
        months,
        baselineLabel,
        sampleCount,
        callsText: '0 万次',
        rows: [],
        summaryText: `${platformText} 已接入 ${sampleCount} 个变量，但 ${month} 无调用，暂无整体标签效果。`,
        empty: true
      }
    }

    const base = useTimeBaseline ? timeBaselineOf(month, TIME_BASELINE_WINDOW) : monthBaselineOf(month)
    const cur = weightedValuesOf(scoped, month, platform || undefined)
    const prevBase = prevMonth
      ? useTimeBaseline
        ? timeBaselineOf(prevMonth, TIME_BASELINE_WINDOW)
        : monthBaselineOf(prevMonth)
      : null
    const prevValues = prevMonth ? weightedValuesOf(scoped, prevMonth, platform || undefined) : {}

    /** 行按 lift 降序：与详情页标签效果同一排序口径 */
    const rows: OverallLabelEffectRow[] = scoped.length
      ? METRIC_DEFS.map((def) => {
          const value = cur[def.key] || 0
          const baselineValue = base.baselineValue[def.key] || 0
          const lift = Number(liftOfValue(def.direction, value, baselineValue).toFixed(2))
          const liftMean = base.liftMean[def.key] ?? 1
          const prevLift = prevBase
            ? liftOfValue(def.direction, prevValues[def.key] || 0, prevBase.baselineValue[def.key] || 0)
            : 0
          const mom = prevMonth && prevLift ? Number((lift - prevLift).toFixed(2)) : null
          const momDir = mom === null ? 'none' : Math.abs(mom) < 0.01 ? 'flat' : mom > 0 ? 'up' : 'down'
          const diff = lift - 1
          const judge = !lift ? '持平' : Math.abs(diff) < 0.01 ? '持平' : diff > 0 ? '好' : '差'
          return {
            yKey: def.key,
            yLabel: def.label,
            value,
            valueText: value ? formatMetricValue(def.unit, value) : '—',
            baselineValue,
            baselineText: baselineValue ? formatMetricValue(def.unit, baselineValue) : '—',
            lift,
            liftText: lift ? `${lift.toFixed(2)} 倍` : '—',
            liftMean,
            liftMeanText: `${liftMean.toFixed(2)} 倍`,
            mom,
            momText: mom === null ? '—' : Math.abs(mom) < 0.01 ? '持平' : `${mom > 0 ? '+' : ''}${mom.toFixed(2)}`,
            momDir,
            judge,
            diffText: !lift
              ? '本期无有效调用'
              : judge === '持平'
                ? `与${baselineLabel}持平`
                : `${diff > 0 ? '高于' : '低于'}${baselineLabel} ${Math.abs(diff).toFixed(2)} 倍`
          } as OverallLabelEffectRow
        }).sort((a, b) => b.lift - a.lift)
      : []

    const best = rows[0]
    const worst = rows[rows.length - 1]
    const betterCount = rows.filter((r) => r.judge === '好').length
    const betterText = betterCount === 0
      ? '全部未达'
      : betterCount === rows.length ? '全部优于' : `${betterCount} 个优于`

    return {
      platform,
      platformText,
      month,
      months,
      baselineLabel,
      sampleCount,
      callsText: `${Math.round(calls)} 万次`,
      rows,
      summaryText: best
        ? `${platformText} · ${month}：${rows.length} 个标签中 ${best.yLabel} lift 最高（${best.liftText}），${worst.yLabel} 最低（${worst.liftText}）；${betterText}${baselineLabel}（lift > 1.00 为优）。`
        : `${platformText} · ${month}：暂无可用标签数据。`,
      empty: false
    }
  },

  /**
   * 详情页效果 Tab 数据
   * 合成 ID 同样返回完整效果数据（档案走 profile() 兜底，见评估文档 §9-Q3 方案 A）
   */
  variableEffect(variableId: string): VariableEffectDetail | null {
    const ds = getDataset()
    const s = ds.byId.get(variableId)
    if (!s) return null
    const ledger = variableAssets.find((v) => String(v.id) === String(variableId))
    const delta = s.effectIndex - s.prevEffectIndex
    const reasons: Record<string, string> = {
      offline: `综合效果指数 ${s.effectIndex}，位于效果域末 ${ds.offlineCount} 位；6 标签中有 ${s.metricCells.filter((m) => m.judge === '差').length} 项劣于全库均值。`,
      online: `综合效果指数 ${s.effectIndex}，位于效果域首 ${ds.onlineCount} 位；6 标签中有 ${s.metricCells.filter((m) => m.judge === '好').length} 项优于全库均值。`,
      neutral: `综合效果指数 ${s.effectIndex}，未进入本期汰换 / 推荐名单，建议按 ${s.updateFrequency} 频率继续观察。`
    }
    return {
      variableId,
      metrics: s.metricCells.map((m: MetricCell) => ({ ...m })),
      usage: { ...s.usage },
      trend: [...s.trend],
      trendLabels: lastSixMonths(),
      verdict: s.verdict,
      verdictLabel: VERDICT_LABELS[s.verdict],
      verdictReason: reasons[s.verdict],
      indexDelta: delta,
      marks: effectOpinionStore.listMarks(variableId),
      /** 台账里没有的变量，详情页基础信息为兜底档案 */
      fallbackProfile: !ledger
    }
  },

  /**
   * 变量档案：台账 ID 返回台账真实字段；合成 ID 返回效果域最小档案（兜底渲染）
   */
  profile(variableId: string): EffectProfile | null {
    const ds = getDataset()
    const s = ds.byId.get(variableId)
    const ledger = variableAssets.find((v) => String(v.id) === String(variableId))
    if (ledger) {
      return {
        variableId: String(ledger.id),
        name: ledger.name,
        code: ledger.code,
        type: ledger.type,
        status: String(ledger.status || ''),
        statusLabel: ledger.midloanStatus ? '贷中特征流程中' : '台账在册',
        sourceType: (ledger.sourceType || 'internal') as EffectProfile['sourceType'],
        sourceTypeLabel: SOURCE_LABELS[(ledger.sourceType || 'internal') as keyof typeof SOURCE_LABELS],
        category: ledger.category || '',
        l1CategoryLabel: L1_LABELS[ledger.l1Category || ''] || ledger.l1Category || '-',
        updateFrequency: (ledger.updateFrequency || '日') as EffectProfile['updateFrequency'],
        dataSource: ledger.dataSource || '',
        dataSourceName: ledger.dataSourceName || '',
        dataTableName: ledger.dataTableName || '-',
        quality: typeof ledger.quality === 'number' ? ledger.quality : 0,
        missingRate: typeof ledger.missingRate === 'number' ? ledger.missingRate : 0,
        creator: ledger.creator || '-',
        developer: ledger.developer || '-',
        adminManager: ledger.adminManager || '-',
        createdAt: ledger.createdAt || '',
        updatedAt: ledger.updatedAt || '',
        description: ledger.description || '',
        profileSource: 'ledger'
      }
    }
    if (!s) return null
    return {
      variableId: s.variableId,
      name: s.name,
      code: s.code,
      type: s.type,
      status: s.status,
      statusLabel: s.status === 'online' ? '在网（效果域）' : '已下线（效果域）',
      sourceType: s.sourceType,
      sourceTypeLabel: SOURCE_LABELS[s.sourceType],
      category: s.l1Category,
      l1CategoryLabel: L1_LABELS[s.l1Category] || s.l1Category,
      updateFrequency: s.updateFrequency,
      dataSource: s.dataSource,
      dataSourceName: s.dataSourceName,
      dataTableName: s.dataTableName,
      quality: s.quality,
      // 台账口径的 missingRate 是百分比数值（如 3.2 表示 3.2%），此处把效果域的 0-1 小数换算成同口径，
      // 保证合成档案与台账档案在详情页基础信息区渲染一致
      missingRate: Math.round(s.missingRate * 1000) / 10,
      creator: s.creator,
      developer: s.developer,
      adminManager: s.adminManager,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      description: s.description,
      profileSource: 'effect_synthetic'
    }
  },

  /** 效果域是否存在该变量（合成 ID 判定用） */
  hasVariable(variableId: string): boolean {
    return getDataset().byId.has(variableId)
  },

  /** 变量总数（覆盖范围说明用） */
  total() {
    return EFFECT_SAMPLE_TOTAL
  }
}

/**
 * 近 6 期标签：以执行日为锚点向前推 6 个自然月
 * 仅用于趋势图横轴文案，不参与任何数值计算
 */
function lastSixMonths(): string[] {
  const labels: string[] = []
  const base = new Date(2026, 9, 1)
  for (let i = 5; i >= 0; i--) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1)
    labels.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return labels
}

export default effectStore
