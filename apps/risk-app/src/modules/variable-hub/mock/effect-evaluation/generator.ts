/**
 * 变量效果评估 · 样本生成器（确定性可复现）
 *
 * 设计要点（评估文档 §5.2）：
 *   1. 效果域自持 412 条样本 = 26 条台账真实 ID + 386 条合成 `VAR-EFF-xxxx`；
 *      台账 `variableAssets` 保持 26 条不动，本文件绝不回写台账。
 *   2. 随机性用固定种子的 mulberry32，禁止裸 Math.random —— 保证评审截图两次刷新一致。
 *   3. 一致性约束全部由构造保证：
 *      - 汰换(63) + 推荐(118) ≤ 412（按排名切分，天然不重叠）
 *      - 策略平台调用分布合计 = 总调用量(6,842 万次)（最大余数法精确分配）
      - 零调用平台数与 platformDistribution 中 calls=0 的项一致（状态由数据反推）
 *      - 环比 = 本期 − 上期（两期同期派生）
 */

import { variableAssets } from '../variable-management/variables'
import type {
  EffectFrequency,
  EffectPriceLevel,
  EffectRow,
  EffectSourceType,
  EffectVariableType,
  EffectVerdict,
  JudgeLabel,
  MetricCell,
  MetricDirection,
  MetricHistoryPoint,
  MetricKey,
  PlatformCallState,
  UsageDetail
} from './types'

/** 固定种子：日期数字，改这里即可整体换一批演示数据 */
const SEED = 20261028

/** 效果域样本总量（演示口径 412） */
export const EFFECT_SAMPLE_TOTAL = 412
/** 建议汰换（原「该退」）本期数量 */
const OFFLINE_COUNT = 63
/** 推荐使用（原「该用」）本期数量 */
const ONLINE_COUNT = 118
/** 上期汰换数量（决定环比 ↑23） */
const PREV_OFFLINE_COUNT = 40
/** 上期推荐数量（决定环比 ↑22） */
const PREV_ONLINE_COUNT = 96
/** 月总调用量（万次），按最大余数法精确分配到每个变量 */
const TOTAL_CALLS = 6842

/**
 * 策略平台（= 渠道）注册表
 * 「平台」口径与 budget / external-data 模块一致：指**引用了该变量策略的外部业务平台**
 * （蚂蚁、京东、美团…），不是本方内部系统（决策引擎 / 中台属于内部消费方，不在本表表达）。
 * 渠道与平台是同一个概念，枚举共 24 个，覆盖头部互金 / 消费金融 / 场景方；
 * forceNoCall：只在样本上留绑定关系、不产生调用，用于演示「有绑定无调用」；
 * neverBind：不参与绑定，用于演示「无变量绑定」态。weight 用于调用量的最大余数分配。
 */
const PLATFORMS: { name: string; weight: number; forceNoCall?: boolean; neverBind?: boolean }[] = [
  { name: '蚂蚁', weight: 30 },
  { name: '京东', weight: 24 },
  { name: '美团', weight: 18 },
  { name: '字节', weight: 12 },
  { name: '度小满', weight: 8 },
  { name: '奇富科技', weight: 7 },
  { name: '乐信', weight: 6 },
  { name: '马上消费', weight: 5 },
  { name: '招联', weight: 5 },
  { name: '中银消费', weight: 4 },
  { name: '兴业消费', weight: 4 },
  { name: '中原消费', weight: 3 },
  { name: '平安普惠', weight: 3 },
  { name: '小米消金', weight: 3 },
  { name: '滴滴金融', weight: 3 },
  { name: '快手', weight: 2 },
  { name: '携程金融', weight: 2 },
  { name: '华为钱包', weight: 2 },
  { name: 'OPPO 金融', weight: 2 },
  { name: 'vivo 金融', weight: 2 },
  { name: '众安保险', weight: 2 },
  { name: '微众银行', weight: 2, forceNoCall: true },
  { name: '唯品会金融', weight: 1, forceNoCall: true },
  { name: '国美金融', weight: 1, neverBind: true }
]

/** 可绑定平台（排除 neverBind），用于每个变量的接入抽样 */
const BINDABLE_PLATFORMS = PLATFORMS.filter((p) => !p.neverBind)

/** 头部平台个数：高质量变量优先被头部平台接入，用于演示平台间效果差异 */
const TOP_PLATFORM_COUNT = 5

/**
 * 按权重无放回抽 count 个平台（渠道）
 * 独立传入 rng：平台接入抽样不消耗主造数序列，避免改变其余字段的历史结果
 * quality 高的变量给头部平台加权（好变量先被头部渠道采纳），长尾平台相对偏低
 * @param rng 该样本专用的随机源
 * @param count 接入平台个数
 * @param quality 变量质量 0-100
 */
function pickPlatforms(rng: () => number, count: number, quality: number): typeof PLATFORMS {
  const pool = BINDABLE_PLATFORMS.map((p, i) => ({ ...p, rank: i }))
  const weightOf = (p: { weight: number; rank: number }) => {
    if (p.rank >= TOP_PLATFORM_COUNT) return p.weight
    if (quality >= 70) return p.weight * 1.9
    if (quality < 50) return p.weight * 0.5
    return p.weight
  }
  const picked: typeof PLATFORMS = []
  for (let i = 0; i < count && pool.length; i++) {
    const total = pool.reduce((a, p) => a + weightOf(p), 0)
    let hit = rng() * total
    let idx = pool.length - 1
    for (let k = 0; k < pool.length; k++) {
      hit -= weightOf(pool[k])
      if (hit <= 0) {
        idx = k
        break
      }
    }
    const [chosen] = pool.splice(idx, 1)
    picked.push(chosen)
  }
  return picked
}

/** 一级分类中文映射（台账 l1Category 只有三类，合成样本扩展到外数/征信口径） */
export const L1_LABELS: Record<string, string> = {
  credit_grant: '授信申请',
  repayment: '还款表现',
  collection: '催收响应',
  external_behavior: '外数行为',
  credit_bureau: '征信记录',
  device_risk: '设备风险'
}

/** 来源类型中文映射 */
export const SOURCE_LABELS: Record<EffectSourceType, string> = {
  internal: '站内数据',
  external: '外部数据',
  credit: '征信数据'
}

/**
 * 展示侧变量类型：外数 / 行为变量 / 征信变量
 * 列表与筛选统一走这套口径，站内数据归为「行为变量」
 */
export const VARIABLE_TYPE_LABELS: Record<EffectVariableType, string> = {
  external: '外数',
  behavior: '行为变量',
  credit: '征信变量'
}

/** 底层来源类型 → 展示变量类型：只为统一展示口径，不改台账字段 */
export const SOURCE_TO_VARIABLE_TYPE: Record<EffectSourceType, EffectVariableType> = {
  external: 'external',
  internal: 'behavior',
  credit: 'credit'
}

/**
 * 近 12 个已完成自然月标签（含本期区间所在月）
 * 与 buildEffectDataset 的 anchor（2026-10-28）对齐，末月即本期跑批区间
 * 列表与详情页可选的时间区间（3 / 4 / 6 / 12 个月）都从这份历史里截取
 */
export const HISTORY_MONTHS: string[] = (() => {
  const base = new Date(2026, 9, 28)
  const labels: string[] = []
  for (let i = 12; i >= 1; i--) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1)
    labels.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return labels
})()

/** 默认时间区间（月数）：保持一期口径近 4 个月，用户可切 3 / 6 / 12 */
export const DEFAULT_RANGE = 4

/** 时间区间选项：值 = 月数，由 store 下发给列表与详情页，组件不硬编码 */
export const RANGE_OPTIONS: { label: string; value: number }[] = [
  { label: '近 3 个月', value: 3 },
  { label: '近 4 个月', value: 4 },
  { label: '近 6 个月', value: 6 },
  { label: '近 12 个月', value: 12 }
]

/** 价格枚举中文文案：列表展示与排序口径共用 */
export const PRICE_LEVEL_LABELS: Record<EffectPriceLevel, string> = {
  free: '免费',
  low: '低',
  medium: '中',
  high: '高'
}

/** 价格枚举权重：仅用于排序（免费 < 低 < 中 < 高） */
export const PRICE_LEVEL_RANK: Record<EffectPriceLevel, number> = {
  free: 0,
  low: 1,
  medium: 2,
  high: 3
}

/**
 * 单价（元/次）→ 价格枚举
 * 0 视为免费；其余按区间分低 / 中 / 高，保证枚举与底层单价始终同源
 * @param {number} priceValue 单价（元/次）
 * @returns {EffectPriceLevel}
 */
export function priceLevelOf(priceValue: number): EffectPriceLevel {
  const v = Number(priceValue) || 0
  if (v <= 0) return 'free'
  if (v < 0.01) return 'low'
  if (v < 0.03) return 'medium'
  return 'high'
}

/** 效果结论中文映射：offline = 汰换（原「该退」），online = 推荐（原「该用」） */
export const VERDICT_LABELS: Record<EffectVerdict, string> = {
  offline: '汰换',
  online: '推荐',
  neutral: '观察'
}

/** 6 标签效果指数键与展示名、方向、单位 */
export const METRIC_DEFS: {
  key: MetricKey
  label: string
  direction: MetricDirection
  unit: 'percent' | 'multiple'
  /** 基准值（全库均值锚点） */
  base: number
  /** 基准浮动幅度 */
  spread: number
}[] = [
  { key: 'MOB3_DPD30', label: 'MOB3 DPD30', direction: 'lower_better', unit: 'percent', base: 0.052, spread: 0.03 },
  { key: 'MOB3_DPD60', label: 'MOB3 DPD60', direction: 'lower_better', unit: 'percent', base: 0.038, spread: 0.022 },
  { key: 'MOB6_DPD30', label: 'MOB6 DPD30', direction: 'lower_better', unit: 'percent', base: 0.061, spread: 0.028 },
  { key: 'FDP7_DPD7', label: 'FDP7 DPD7', direction: 'lower_better', unit: 'percent', base: 0.024, spread: 0.014 },
  { key: 'FDP7_DPD15', label: 'FDP7 DPD15', direction: 'lower_better', unit: 'percent', base: 0.016, spread: 0.01 },
  { key: 'FDP7_DPD30', label: 'FDP7 DPD30', direction: 'higher_better', unit: 'multiple', base: 1.42, spread: 0.5 }
]

/** 合成样本名称语料池 */
const NAME_PREFIX = ['近7日', '近30日', '近90日', '近180日', '历史', '首借', '复借', '夜间', '跨端', '同设备', '关联', '结清后']
const NAME_OBJECT = [
  '申请次数', '放款金额', '逾期天数', '查询次数', '改密次数', '绑卡数', '还款金额', '进件渠道数',
  '设备更换次数', '定位城市数', '联系人重合度', '交易笔数', '授信使用率', '提前还款次数', '催收触达次数'
]
const NAME_SUFFIX = ['', '均值', '最大值', '波动率', '占比', '环比变化', '标准差', '累计值']
const L1_POOL = ['credit_grant', 'repayment', 'collection', 'external_behavior', 'credit_bureau', 'device_risk']
const SOURCE_POOL: EffectSourceType[] = ['internal', 'external', 'credit']
const FREQ_POOL: EffectFrequency[] = ['实时', '日', '隔日', '周', '月']
const PEOPLE = ['培培', '王数仓', '李风控', '张策略', '陈数据', '刘建模', '赵外数']
const DATA_SOURCES: Record<EffectSourceType, { key: string; name: string }> = {
  internal: { key: 'hbase', name: 'Hbase 行为元数据表' },
  external: { key: 'external_api', name: '外部数据源 API 网关' },
  credit: { key: 'credit_bureau', name: '征信报送明细库' }
}

/**
 * mulberry32 伪随机数生成器
 * 固定种子 → 同一 SEED 下每次调用序列完全一致，保证演示数据可复现
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 区间取数 */
const between = (rng: () => number, min: number, max: number) => min + rng() * (max - min)
/** 区间取整数 */
const intBetween = (rng: () => number, min: number, max: number) => Math.floor(between(rng, min, max + 1))
/** 保留两位小数 */
const round2 = (n: number) => Math.round(n * 100) / 100
/** 保留四位小数（百分比指标口径） */
const round4 = (n: number) => Math.round(n * 10000) / 10000

/** 相对基准值判断好/差/持平（±5% 内算持平） */
function judgeOf(value: number, benchmark: number, direction: MetricDirection): JudgeLabel {
  const tol = benchmark * 0.05
  if (Math.abs(value - benchmark) <= tol) return '持平'
  const better = direction === 'lower_better' ? value < benchmark : value > benchmark
  return better ? '好' : '差'
}

/** 单条效果域样本的内部结构 */
interface EffectSample
  extends Omit<
    EffectRow,
    | 'likes'
    | 'comments'
    | 'missingRateText'
    | 'priceLevel'
    | 'priceLevelLabel'
    | 'grantCalls'
    | 'grantRatioText'
    | 'loanCalls'
    | 'loanRatioText'
    | 'yKey'
    | 'yLabel'
    | 'yValue'
    | 'yMonths'
  > {
  /** 综合排序分（越低越差，用于汰换排名切分） */
  score: number
  /** 上期排序分（用于上期结论切分，得到环比） */
  prevScore: number
  /** 策略平台绑定明细：active=false 表示已接入该平台但零调用；calls/grant/loan/midloan 均为该平台的量（万次） */
  links: { platform: string; active: boolean; calls: number; grantCalls: number; loanCalls: number; midloanCalls: number }[]
  /** 6 标签指标明细 */
  metricCells: MetricCell[]
  /** 使用深度明细 */
  usage: UsageDetail
  /** 档案字段（合成样本兜底渲染用） */
  dataSource: string
  dataSourceName: string
  dataTableName: string
  quality: number
  description: string
  creator: string
  developer: string
  adminManager: string
  createdAt: string
  updatedAt: string
  status: string
  type: string
}

/**
 * 时间格式化（效果域统一出口）：按本地时区输出 `YYYY-MM-DD HH:mm:ss`
 * 不用 toISOString，否则东八区时间会整体偏 8 小时，调度文案与时间戳对不上
 */
export function formatDateTime(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

/** 时间格式化：效果域内部统一走 formatDateTime */
function fmt(d: Date): string {
  return formatDateTime(d)
}

/**
 * 生成一条样本的效果指数矩阵
 * 逾期类指标围绕 base 浮动，效果越差（score 越低）逾期越高，保证指标与结论方向一致
 */
function buildMetrics(rng: () => number, quality: number): { cells: MetricCell[]; score: number } {
  /** quality 0-100，越高越好；换算成 0-1 的劣势因子 */
  const bad = (100 - quality) / 100
  let score = 0
  const cells: MetricCell[] = METRIC_DEFS.map((def) => {
    let value: number
    if (def.direction === 'lower_better') {
      value = def.base * (0.6 + bad * 1.6) + between(rng, -def.spread, def.spread) * 0.4
      value = Math.max(0.001, round2(value * 10000) / 10000)
    } else {
      value = def.base * (1.5 - bad * 1.1) + between(rng, -def.spread, def.spread) * 0.3
      value = Math.max(0.05, round2(value))
    }
    const benchmark = def.unit === 'percent'
      ? round2(def.base * 10000) / 10000
      : round2(def.base)
    const validSamples = intBetween(rng, 4200, 168000)
    score += judgeOf(value, benchmark, def.direction) === '好' ? 1 : judgeOf(value, benchmark, def.direction) === '差' ? -1 : 0

    /**
     * 近 12 个月历史：以当期值为末点向前游走
     * 波动幅度受 spread 约束，并夹在本指标合理区间内，避免长区间漂移出常识值
     * 判断值在这里算好，组件不再做比较
     */
    const history: MetricHistoryPoint[] = []
    const floor = def.unit === 'percent' ? Math.max(0.0005, def.base * 0.25) : Math.max(0.2, def.base * 0.4)
    const ceil = def.unit === 'percent' ? Math.min(0.35, def.base * 2.4) : def.base * 2.6
    let cursor = value
    for (let i = 0; i < HISTORY_MONTHS.length - 1; i++) {
      const drift = between(rng, -def.spread, def.spread) * (def.unit === 'percent' ? 0.6 : 0.35)
      const raw = cursor + drift
      cursor = def.unit === 'percent'
        ? Math.min(ceil, Math.max(floor, round4(raw)))
        : Math.min(ceil, Math.max(floor, round2(raw)))
      history.unshift({ value: cursor, judge: judgeOf(cursor, benchmark, def.direction) })
    }
    history.push({ value, judge: judgeOf(value, benchmark, def.direction) })

    return {
      key: def.key,
      label: def.label,
      value,
      validSamples,
      benchmark,
      judge: judgeOf(value, benchmark, def.direction),
      direction: def.direction,
      unit: def.unit,
      history
    }
  })
  return { cells, score }
}

/**
 * 最大余数法：把 total 按权重精确分配为整数数组（合计严格等于 total）
 * 用于「平台调用分布合计 = 总调用量」这一一致性约束
 */
function apportion(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0)
  if (sum <= 0) return weights.map(() => 0)
  const raw = weights.map((w) => (w / sum) * total)
  const floors = raw.map((v) => Math.floor(v))
  let rest = total - floors.reduce((a, b) => a + b, 0)
  const order = raw
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i)
  for (let k = 0; k < order.length && rest > 0; k++, rest--) floors[order[k].i] += 1
  return floors
}

/** 把台账 26 条真实资产映射成效果域样本的种子字段 */
function seedFromLedger(asset: any) {
  const quality = typeof asset.quality === 'number' ? asset.quality : 80
  return {
    variableId: String(asset.id),
    name: asset.name || String(asset.id),
    code: asset.code || '-',
    sourceType: (asset.sourceType || 'internal') as EffectSourceType,
    l1Category: asset.l1Category || 'credit_grant',
    updateFrequency: (asset.updateFrequency || '日') as EffectFrequency,
    /** 单价沿用台账口径（元/次）；台账 costMetrics 作兜底，仍为 0 则归为免费 */
    priceValue: Number(asset.pricePerCall ?? asset.costMetrics?.pricePerCall ?? 0) || 0,
    missingRate: typeof asset.missingRate === 'number' ? asset.missingRate : 0.02,
    quality,
    synthetic: false,
    dataSource: asset.dataSource || 'hbase',
    dataSourceName: asset.dataSourceName || 'Hbase 行为元数据表',
    dataTableName: asset.dataTableName || `ads_${String(asset.code || 'var').toLowerCase()}`,
    description: asset.description || `${asset.name}（台账正式资产参与效果域派生）`,
    creator: asset.creator || '数据应用团队',
    developer: asset.developer || '王数仓',
    adminManager: asset.adminManager || '培培',
    createdAt: asset.createdAt || fmt(new Date(Date.now() - 120 * 86400000)),
    updatedAt: asset.updatedAt || fmt(new Date()),
    status: asset.status || 'online',
    type: asset.type || 'numerical'
  }
}

/** 生成一条合成样本的种子字段 */
function seedSynthetic(rng: () => number, idx: number) {
  const sourceType = SOURCE_POOL[intBetween(rng, 0, SOURCE_POOL.length - 1)]
  const l1Category = L1_POOL[intBetween(rng, 0, L1_POOL.length - 1)]
  const name = `${NAME_PREFIX[intBetween(rng, 0, NAME_PREFIX.length - 1)]}${NAME_OBJECT[intBetween(rng, 0, NAME_OBJECT.length - 1)]}${NAME_SUFFIX[intBetween(rng, 0, NAME_SUFFIX.length - 1)]}`
  const src = DATA_SOURCES[sourceType]
  const seq = String(idx).padStart(4, '0')
  return {
    variableId: `VAR-EFF-${seq}`,
    name,
    code: `EFF_${l1Category.slice(0, 4).toUpperCase()}_${seq}`,
    sourceType,
    l1Category,
    updateFrequency: FREQ_POOL[intBetween(rng, 0, FREQ_POOL.length - 1)],
    /**
     * 价格口径同台账：站内行为数据免费（0），外数 / 征信按元/次造价
     * 区间取 0.002~0.04，使低 / 中 / 高三档样本量接近 2:5:3，避免高档一边倒
     */
    priceValue: sourceType === 'internal' ? 0 : round4(between(rng, 0.002, 0.04)),
    missingRate: round2(between(rng, 0.001, 0.28) * 100) / 100,
    quality: intBetween(rng, 42, 97),
    synthetic: true,
    dataSource: src.key,
    dataSourceName: src.name,
    dataTableName: `${src.key}_${l1Category}_${seq}`,
    description: `${name}，贷中风险效果评估样本（演示合成，非台账正式资产）。`,
    creator: PEOPLE[intBetween(rng, 0, PEOPLE.length - 1)],
    developer: PEOPLE[intBetween(rng, 0, PEOPLE.length - 1)],
    adminManager: PEOPLE[intBetween(rng, 0, PEOPLE.length - 1)],
    createdAt: fmt(new Date(Date.now() - intBetween(rng, 30, 720) * 86400000)),
    updatedAt: fmt(new Date(Date.now() - intBetween(rng, 0, 20) * 86400000)),
    status: rng() > 0.12 ? 'online' : 'offline',
    type: rng() > 0.5 ? 'numerical' : 'categorical'
  }
}

/** 数据集内部结构 */
interface EffectDataset {
  samples: EffectSample[]
  byId: Map<string, EffectSample>
  /** 策略平台分布（含双态文案） */
  platforms: { platform: string; calls: number; ratio: number; boundCount: number; state: PlatformCallState; stateText: string }[]
  totalCalls: number
  offlineCount: number
  onlineCount: number
  prevOfflineCount: number
  prevOnlineCount: number
  periodStart: string
  periodEnd: string
  lastRunAt: string
  nextRunAt: string
}

/**
 * 构建效果域数据集（模块级只构建一次，由 effect-store 持有）
 * @returns 派生完成的全量样本与聚合结果
 */
export function buildEffectDataset(): EffectDataset {
  const rng = mulberry32(SEED)
  const seeds = [
    ...variableAssets.slice(0, 26).map(seedFromLedger),
    ...Array.from({ length: EFFECT_SAMPLE_TOTAL - 26 }, (_, i) => seedSynthetic(rng, i + 27))
  ]

  /** 统计区间：上一个自然月整月 */
  const anchor = new Date(2026, 9, 28)
  const periodEnd = new Date(anchor.getFullYear(), anchor.getMonth(), 0)
  const periodStart = new Date(periodEnd.getFullYear(), periodEnd.getMonth(), 1)

  const samples: EffectSample[] = seeds.map((seed, seedIndex) => {
    const { cells, score } = buildMetrics(rng, seed.quality)
    const prevScore = round2(score + between(rng, -2, 2))

    /**
     * 策略平台（渠道）接入：每个变量接入 1~5 个平台，权重高的平台更容易被接入
     * 约 8% 样本零接入（用于演示「无平台绑定」态）
     * 抽样用样本级独立随机源，不消耗主造数序列，保证指标与指数口径不被平台改造影响
     */
    const linkRng = mulberry32((SEED + 7919 + seedIndex * 104729) >>> 0)
    const bindCount = linkRng() < 0.08 ? 0 : intBetween(linkRng, 1, 5)
    const links = pickPlatforms(linkRng, bindCount, seed.quality).map((p) => ({
      platform: p.name,
      active: !p.forceNoCall && linkRng() > 0.12,
      calls: 0,
      grantCalls: 0,
      loanCalls: 0,
      midloanCalls: 0
    }))

    const effectIndex = intBetween(rng, 22, 94)
    const prevEffectIndex = Math.min(96, Math.max(18, effectIndex + intBetween(rng, -11, 11)))
    /** 近 6 期趋势：末点等于本期指数，前面各点围绕其游走 */
    const trend: number[] = []
    for (let i = 0; i < 5; i++) trend.push(Math.max(12, Math.min(97, prevEffectIndex + intBetween(rng, -8, 8))))
    trend.push(effectIndex)

    const grantCalls = round2(between(rng, 0, 1))
    const loanCalls = round2(between(rng, 0, 1))
    const usage: UsageDetail = {
      grantCalls: 0,
      loanCalls: 0,
      midloanCalls: 0,
      scenes: [
        { name: '准入决策', calls: 0 },
        { name: '额度审批', calls: 0 },
        { name: '贷中预警', calls: 0 }
      ],
      missingRate: seed.missingRate,
      missingRateText: formatMissingRate(seed.missingRate),
      missingJudge: seed.missingRate < 0.03 ? '好' : seed.missingRate > 0.12 ? '差' : '持平',
      lastUpdateAt: seed.updatedAt,
      platformCount: links.length
    }
    /** 场景权重，稍后按样本调用量换算 */
    ;(usage as any).__w = [grantCalls + 0.2, loanCalls + 0.2, round2(between(rng, 0, 1)) + 0.2]

    return {
      ...seed,
      /** 展示用中文标签由 mock 层统一映射，组件列直接取 label 字段 */
      sourceTypeLabel: SOURCE_LABELS[seed.sourceType],
      /** 展示侧变量类型：外数 / 行为变量 / 征信变量 */
      variableType: SOURCE_TO_VARIABLE_TYPE[seed.sourceType],
      variableTypeLabel: VARIABLE_TYPE_LABELS[SOURCE_TO_VARIABLE_TYPE[seed.sourceType]],
      /** 价格枚举由单价派生，列表只展示枚举，不在前端换算单价 */
      priceLevel: priceLevelOf(seed.priceValue),
      priceLevelLabel: PRICE_LEVEL_LABELS[priceLevelOf(seed.priceValue)],
      l1CategoryLabel: L1_LABELS[seed.l1Category] || seed.l1Category,
      platformCount: links.length,
      platforms: links.map((l) => l.platform),
      callCount: 0,
      callCustomerCount: 0,
      effectIndex,
      prevEffectIndex,
      trend,
      verdict: 'neutral' as EffectVerdict,
      verdictLabel: VERDICT_LABELS.neutral,
      /** 赞数 / 评论数不在生成器造数，统一由 opinion-store 单源提供 */
      marked: false,
      score,
      prevScore,
      links,
      metricCells: cells,
      usage
    }
  })

  /** 结论按排名切分：本期汰换 = 分数最低 63 个，推荐 = 分数最高 118 个（区间不重叠） */
  const asc = [...samples].sort((a, b) => a.score - b.score || a.variableId.localeCompare(b.variableId))
  const desc = [...samples].sort((a, b) => b.score - a.score || a.variableId.localeCompare(b.variableId))
  asc.slice(0, OFFLINE_COUNT).forEach((s) => { s.verdict = 'offline'; s.verdictLabel = VERDICT_LABELS.offline })
  desc.slice(0, ONLINE_COUNT).forEach((s) => { s.verdict = 'online'; s.verdictLabel = VERDICT_LABELS.online })

  /** 上期结论同法切分，环比 = 本期 − 上期（40/96 → ↑23/↑22） */
  const ascPrev = [...samples].sort((a, b) => a.prevScore - b.prevScore || a.variableId.localeCompare(b.variableId))
  const descPrev = [...samples].sort((a, b) => b.prevScore - a.prevScore || a.variableId.localeCompare(b.variableId))
  const prevOffline = new Set(ascPrev.slice(0, PREV_OFFLINE_COUNT).map((s) => s.variableId))
  const prevOnline = new Set(descPrev.slice(0, PREV_ONLINE_COUNT).map((s) => s.variableId))

  /** 调用量分配：仅「有活跃平台」的样本参与，最大余数法保证合计 = TOTAL_CALLS */
  const callable = samples.filter((s) => s.links.some((l) => l.active))
  const weights = callable.map((s) => 1 + s.effectIndex / 40 + s.platformCount * 0.6)
  const allocated = apportion(TOTAL_CALLS, weights)
  callable.forEach((s, i) => {
    s.callCount = allocated[i]
    const activeLinks = s.links.filter((l) => l.active)
    const perLink = apportion(s.callCount, activeLinks.map((l) => PLATFORMS.find((p) => p.name === l.platform)!.weight))
    activeLinks.forEach((l, j) => { l.calls = perLink[j] })
    /** 调用客户数与调用量正相关，按每万次调用 0.6-2.1 万客户派生 */
    s.callCustomerCount = Math.round(s.callCount * between(rng, 0.6, 2.1) * 100) / 100
    const w = (s.usage as any).__w as number[]
    const parts = apportion(s.callCount, w)
    s.usage.grantCalls = parts[0]
    s.usage.loanCalls = parts[1]
    s.usage.midloanCalls = parts[2]
    s.usage.scenes.forEach((sc, k) => { sc.calls = parts[k] })
    delete (s.usage as any).__w

    /**
     * 环节量按平台调用量占比二次分摊：分平台授信 / 支用 / 贷中合计恒等于该变量环节总量
     * 零调用平台天然分到 0，保证「已接入未调用」与占比破折号一致
     */
    const grantByLink = apportion(s.usage.grantCalls, s.links.map((l) => l.calls || 0))
    const loanByLink = apportion(s.usage.loanCalls, s.links.map((l) => l.calls || 0))
    const midloanByLink = apportion(s.usage.midloanCalls, s.links.map((l) => l.calls || 0))
    s.links.forEach((l, i) => {
      l.grantCalls = grantByLink[i]
      l.loanCalls = loanByLink[i]
      l.midloanCalls = midloanByLink[i]
    })
  })

  /** 策略平台分布：调用量合计天然等于 TOTAL_CALLS；状态由数据反推 */
  const platformRows = PLATFORMS.map((p) => {
    const bound = samples.filter((s) => s.links.some((l) => l.platform === p.name))
    const calls = bound.reduce((a, s) => a + s.links.filter((l) => l.platform === p.name).reduce((x, l) => x + l.calls, 0), 0)
    let state: PlatformCallState = 'active'
    let stateText = '正常调用'
    if (bound.length === 0) {
      state = 'no_binding'
      stateText = '暂无变量接入'
    } else if (calls === 0) {
      state = 'no_call'
      stateText = '已接入、本区间零调用'
    }
    return { platform: p.name, calls, ratio: TOTAL_CALLS ? round2(calls / TOTAL_CALLS) : 0, boundCount: bound.length, state, stateText }
  })

  return {
    samples,
    byId: new Map(samples.map((s) => [s.variableId, s])),
    platforms: platformRows,
    totalCalls: platformRows.reduce((a, b) => a + b.calls, 0),
    offlineCount: samples.filter((s) => s.verdict === 'offline').length,
    onlineCount: samples.filter((s) => s.verdict === 'online').length,
    prevOfflineCount: prevOffline.size,
    prevOnlineCount: prevOnline.size,
    periodStart: fmt(periodStart).slice(0, 10),
    periodEnd: fmt(periodEnd).slice(0, 10),
    lastRunAt: fmt(new Date(2026, 9, 28, 6, 30, 0)),
    nextRunAt: fmt(new Date(2026, 9, 29, 6, 30, 0))
  }
}

/** 模块级单例：四个 store 共用同一份派生结果，避免重复构建 412 条样本 */
let _dataset: EffectDataset | null = null

/**
 * 取效果域数据集（首次调用时构建，之后复用）
 * 因生成器为固定种子，同一构建结果在页面刷新前后完全一致
 */
export function getDataset(): EffectDataset {
  if (!_dataset) _dataset = buildEffectDataset()
  return _dataset
}

/** 内部样本独有字段（不允许泄漏给组件） */
const PRIVATE_KEYS = [
  'score', 'prevScore', 'links', 'metricCells', 'usage', 'dataSource', 'dataSourceName',
  'dataTableName', 'quality', 'description', 'creator', 'developer', 'adminManager',
  'createdAt', 'updatedAt', 'status', 'type'
] as const

/** 缺失率百分比文案：全模块唯一格式化出口，保证列表/展开/试跑三处口径一致 */
export function formatMissingRate(rate: number): string {
  return `${((Number(rate) || 0) * 100).toFixed(1)}%`
}

/**
 * 指标值展示文案（Y 标签近 4 个月结果列专用）
 * 百分比指标输出 2 位小数百分比，增益倍数输出 2 位小数，组件不再做换算
 */
export function formatMetricValue(unit: 'percent' | 'multiple', value: number): string {
  return unit === 'percent' ? `${(Number(value) * 100).toFixed(2)}%` : Number(value).toFixed(2)
}

/** 把内部样本裁剪成列表行：只保留展示字段，档案与口径字段由 profile/expandRow 单独提供 */
export function toRow(s: EffectSample): EffectRow {
  const clone: Record<string, any> = { ...s }
  PRIVATE_KEYS.forEach((k) => delete clone[k])
  clone.missingRateText = formatMissingRate(s.missingRate)
  return clone as EffectRow
}

export type { EffectSample }
