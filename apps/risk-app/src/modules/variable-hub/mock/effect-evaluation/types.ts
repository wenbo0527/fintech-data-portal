/**
 * 变量效果评估 · mock 数据域类型定义
 *
 * 来源：`.trae/documents/变量效果评估 · 前端交互方案（仅前端）.md`
 * 落位：`.trae/documents/2026-10-28-方案评估-变量效果评估落位风险要素-v1.0.md` §5
 *
 * 注意：本目录是「效果域」自持样本（412 条），与特征台账 `variableAssets`（26 条正式资产）
 * 是两个口径；台账数据不在此处修改，效果域只引用台账的真实 ID。
 */

/** 效果结论：offline = 汰换（原「该退」）/ online = 推荐（原「该用」）/ neutral = 观察 */
export type EffectVerdict = 'offline' | 'online' | 'neutral'

/** 判断列文案：文档要求用文字编码，不用颜色单独编码 */
export type JudgeLabel = '好' | '差' | '持平'

/** 指标方向：低更好（逾期类）/ 高更好（增益类） */
export type MetricDirection = 'lower_better' | 'higher_better'

/** 6 标签效果指数矩阵的键 */
export type MetricKey =
  | 'MOB3_DPD30'
  | 'MOB3_DPD60'
  | 'MOB6_DPD30'
  | 'FDP7_DPD7'
  | 'FDP7_DPD15'
  | 'FDP7_DPD30'

/** 变量来源类型（与台账 VariableSourceType 对齐） */
export type EffectSourceType = 'external' | 'internal' | 'credit'

/**
 * 展示侧变量类型：外数 / 行为变量 / 征信变量
 * 取代列表原「来源」筛选口径（站内数据归为行为变量），底层 sourceType 字段不动
 */
export type EffectVariableType = 'external' | 'behavior' | 'credit'

/** 价格枚举：免费 / 低 / 中 / 高（展示与排序口径，底层单价仅用于派生） */
export type EffectPriceLevel = 'free' | 'low' | 'medium' | 'high'

/** 更新频率（与台账 updateFrequency 取值对齐） */
export type EffectFrequency = '实时' | '日' | '隔日' | '周' | '月'

/** 策略平台零调用双态：no_call = 已接入无调用；no_binding = 无变量接入（平台指蚂蚁/京东/美团等策略使用方） */
export type PlatformCallState = 'active' | 'no_call' | 'no_binding'

/** 跑批任务状态 */
export type TaskStatus = 'running' | 'success' | 'failed' | 'partial' | 'paused' | 'pending'

/** 最近执行结果三色口径 */
export type RunResult = 'success' | 'failed' | 'partial'

/** 标记类型 */
export type MarkType = 'offline' | 'online' | 'keep_observing' | 'wrong_data'

/** 单期指标历史点：用于近 4 个月结果列，判断值在生成器内算好 */
export interface MetricHistoryPoint {
  /** 指标值（逾期率为 0-1 小数，增益为倍数） */
  value: number
  /** 相对全库均值的判断 */
  judge: JudgeLabel
}

/** 单个指标单元格（值 + 有效样本 + 全库均值 + 判断） */
export interface MetricCell {
  key: MetricKey
  label: string
  /** 指标值（逾期率为 0-1 小数，增益为倍数） */
  value: number
  /** 有效样本数（分子口径） */
  validSamples: number
  /** 全库均值（对比基准） */
  benchmark: number
  /** 相对基准的判断 */
  judge: JudgeLabel
  direction: MetricDirection
  /** 展示单位 */
  unit: 'percent' | 'multiple'
  /** 近 4 个月历史点（末点等于当期 value），只用于展示侧趋势列 */
  history: MetricHistoryPoint[]
}

/** 指标口径元数据：问号 tooltip 的唯一来源 */
export interface MetricMeta {
  key: MetricKey
  label: string
  /** 口径说明文案 */
  description: string
  numerator: string
  denominator: string
  /** 统计区间 */
  period: string
  /** 统计粒度 */
  granularity: string
  direction: MetricDirection
  benchmark: string
}

/** 单个 Y 标签单月结果：文案与判断均由 mock 层算好，组件只做渲染 */
export interface YMonthResult {
  /** 月份标签（YYYY-MM） */
  label: string
  /** 指标值展示文案（百分比 / 倍数） */
  text: string
  /** 相对上月的环比文案（首月为空串） */
  deltaText: string
  judge: JudgeLabel
}

/** 推荐列表行（总览页与详情页共用） */
export interface EffectRow {
  variableId: string
  name: string
  code: string
  sourceType: EffectSourceType
  sourceTypeLabel: string
  /** 展示侧变量类型：外数 / 行为变量 / 征信变量（替代来源口径） */
  variableType: EffectVariableType
  variableTypeLabel: string
  l1Category: string
  l1CategoryLabel: string
  updateFrequency: EffectFrequency
  /** 使用该变量策略的平台数 */
  platformCount: number
  platforms: string[]
  /** 月调用量（万次） */
  callCount: number
  /** 调用客户数 */
  callCustomerCount: number
  /** 价格：单价（元/次），0 表示内部数据无单价 */
  priceValue: number
  /** 价格枚举（免费 / 低 / 中 / 高），由单价区间派生，列表展示与排序用它 */
  priceLevel: EffectPriceLevel
  /** 价格枚举展示文案 */
  priceLevelLabel: string
  /** 授信环节调用量（万次） */
  grantCalls: number
  /** 授信占比（0-1，筛选与排序用；展示用 grantRatioText） */
  grantRatio: number
  /** 授信占比展示文案（授信调用量 / 月调用量） */
  grantRatioText: string
  /** 支用环节调用量（万次） */
  loanCalls: number
  /** 支用占比（0-1，筛选与排序用；展示用 loanRatioText） */
  loanRatio: number
  /** 支用占比展示文案（支用调用量 / 月调用量） */
  loanRatioText: string
  /** 当前 Y 标签键与展示名 */
  yKey: MetricKey
  yLabel: string
  /** 当前 Y 标签下该变量的 lift（倍数，> 1.00 优于全库均值） */
  lift: number
  liftText: string
  /** 全库同标签 lift 均值（参照线，同标签下各行相同） */
  liftMean: number
  liftMeanText: string
  /** 选中 Y 标签的当期值（用于「所选 Y 标签当期值」排序） */
  yValue: number
  /** 选中 Y 标签的近 4 个月结果（由旧到新） */
  yMonths: YMonthResult[]
  /** 综合效果指数（0-100，越高越好） */
  effectIndex: number
  /** 上期综合效果指数 */
  prevEffectIndex: number
  /** 近 6 期效果指数趋势 */
  trend: number[]
  verdict: EffectVerdict
  verdictLabel: string
  /** 缺失率（质量口径并入使用列） */
  missingRate: number
  /** 缺失率展示文案：由 mock 层统一格式化，组件不做百分比换算 */
  missingRateText: string
  likes: number
  comments: number
  /** 是否已被人工标记 */
  marked: boolean
  markType?: MarkType
  /** true = 演示合成样本；false = 台账正式资产 */
  synthetic: boolean
}

/** 使用深度明细 */
export interface UsageDetail {
  /** 授信环节调用量（万次） */
  grantCalls: number
  /** 支用环节调用量（万次） */
  loanCalls: number
  /** 贷中环节调用量（万次） */
  midloanCalls: number
  /** 使用场景清单 */
  scenes: { name: string; calls: number }[]
  missingRate: number
  /** 缺失率展示文案：mock 层格式化，展开明细组件不做换算 */
  missingRateText: string
  /** 缺失率判断 */
  missingJudge: JudgeLabel
  /** 最近一次数据更新时间 */
  lastUpdateAt: string
  /** 在网策略平台数 */
  platformCount: number
}

/** 行内展开明细 */
export interface EffectExpanded {
  variableId: string
  metrics: MetricCell[]
  usage: UsageDetail
  /** 分平台使用深度：授信 / 支用量级与占比（按平台拆分，一期只用数据不用图表） */
  platformUsage: PlatformUsageRow[]
  /** 分平台合计行（store 算好，组件不做相加） */
  platformUsageTotal: PlatformUsageRow
  /** 当前选中平台（null = 全部平台）；详情页切换器用它高亮与汇总 */
  selectedPlatform: string | null
  /** 当前汇总范围行：全部平台时为合计行，选中平台时为其平台行 */
  scope: PlatformUsageRow
  /** 口径与提示说明（store 直接返回文案，前端不拼接判断） */
  notes: string[]
  /** 观察月列表（YYYY-MM，由旧到新），用于展示当前数据口径的月份范围 */
  months: string[]
}

/** 分平台使用深度行：量级统一万次，占比分母为该平台月调用量 */
export interface PlatformUsageRow {
  /** 平台名称（合计行为「合计」） */
  platform: string
  /** 平台调用状态文案（正常调用 / 已接入未调用） */
  stateText: string
  calls: number
  callsText: string
  grantCalls: number
  grantText: string
  grantRatioText: string
  loanCalls: number
  loanText: string
  loanRatioText: string
  midloanCalls: number
  midloanText: string
}

/** 详情页效果 Tab 数据 */
export interface VariableEffectDetail {
  variableId: string
  metrics: MetricCell[]
  usage: UsageDetail
  trend: number[]
  /** 趋势区间标签（近 6 期） */
  trendLabels: string[]
  verdict: EffectVerdict
  verdictLabel: string
  /** 结论依据说明（store 生成文案） */
  verdictReason: string
  /** 效果指数环比变化（百分点） */
  indexDelta: number
  marks: MarkRecord[]
  /** 是否为兜底渲染的合成档案 */
  fallbackProfile: boolean
}

/**
 * 详情页 · 标签效果单元格：某标签在某个观察月的指标值、对照值与 lift
 */
export interface LabelEffectMonthCell {
  /** 观察月（YYYY-MM） */
  month: string
  /** 该变量在观察月的指标值 */
  value: number
  valueText: string
  /** 对照基线值（全库同期均值 / 所选平台同期均值） */
  baselineValue: number
  baselineText: string
  /** 该变量在该标签上的 lift（倍数） */
  lift: number
  liftText: string
  /** 对照样本集合内该标签的 lift 均值（参照线） */
  liftMean: number
  liftMeanText: string
  /** 相对 1.00 基准的判断（好 / 差 / 持平） */
  judge: JudgeLabel
}

/**
 * 标签效果行：一个 Y 标签类型 + 各观察月的结果（cells 与 selectedMonths 一一对应）
 * 行内 lift / liftMean / mom / judge 均取最新选中月，用于排序与结论；
 * lift 统一为「越大越好」：越低越好的指标取对照值÷变量值，越高越好的指标取变量值÷对照值
 */
export interface LabelEffectRow {
  yKey: MetricKey
  /** Y 标签类型（如 MOB3 DPD30） */
  yLabel: string
  /** 各观察月的结果（由旧到新，与 selectedMonths 对齐） */
  cells: LabelEffectMonthCell[]
  /** 最新选中月的 lift（倍数） */
  lift: number
  liftText: string
  /** 最新选中月对照样本的 lift 均值（参照线） */
  liftMean: number
  liftMeanText: string
  /** 最新选中月相对上一自然月的 lift 差（无上月时为 null） */
  mom: number | null
  momText: string
  /** 环比方向（用于颜色 / 箭头） */
  momDir: 'up' | 'down' | 'flat' | 'none'
  /** 最新选中月的判断（好 / 差 / 持平） */
  judge: JudgeLabel
  /** 与 1.00 基准的差值文案 */
  diffText: string
  /** 有效样本数（分子口径） */
  validSamples: number
}

/** 详情页 · 标签效果：按平台 + 多观察月，Y 标签逐行（6 行） */
export interface LabelEffectResult {
  variableId: string
  /** 当前平台（空字符串 = 全部平台） */
  platform: string
  /** 平台展示文案：全部平台 / 具体平台名 */
  platformText: string
  /** 最新选中月（YYYY-MM）：结论、lift 均值列与环比列的口径 */
  month: string
  /** 生效的观察月（由旧到新，最多 6 个） */
  selectedMonths: string[]
  /** 观察月最多可选个数（组件用于限制选择与提示文案） */
  monthLimit: number
  /** 月份选项（由新到旧） */
  months: { label: string; value: string }[]
  /** 平台选项：全部平台 + 该变量绑定平台（label 已带调用量） */
  platformOptions: { label: string; value: string }[]
  /** 对照基准文案：全库同期均值 / 平台同期均值 */
  baselineLabel: string
  rows: LabelEffectRow[]
  /** 一句话结论（基于最新选中月） */
  summaryText: string
  /** 空态标识：所选平台该变量无调用 */
  empty: boolean
  emptyText: string
}

/** 详情页标签效果入参：平台（单选）与观察月（多选） */
export interface LabelEffectParams {
  /** 平台（渠道）：不传 = 全部平台；非本变量绑定的平台回落到全部平台 */
  platform?: string
  /** 观察月多选（YYYY-MM，最多 6 个）；不传 / 空数组 = 最新月 */
  months?: string[]
}

/** 列表页 · 整体标签效果行：当前样本集合在某月的整体指标与 lift */
export interface OverallLabelEffectRow {
  yKey: MetricKey
  yLabel: string
  /** 整体指标值（样本按调用量加权平均） */
  value: number
  valueText: string
  /** 全库同期同标签加权均值（对照基线） */
  baselineValue: number
  baselineText: string
  /** lift：基线 ÷ 整体值（越低越好）；越高越好指标反向 */
  lift: number
  liftText: string
  /** 全库同期同标签 lift 均值（参照线） */
  liftMean: number
  liftMeanText: string
  /** 相对上月的 lift 差（无上月历史时为 null） */
  mom: number | null
  momText: string
  /** 环比方向（用于颜色 / 箭头） */
  momDir: 'up' | 'down' | 'flat' | 'none'
  judge: JudgeLabel
  /** 与 1.00 基准的差值文案 */
  diffText: string
}

/** 列表页 · 整体标签效果（按平台 + 单月快照） */
export interface OverallLabelEffectResult {
  /** 当前平台（空字符串 = 全部平台） */
  platform: string
  /** 平台展示文案：全部平台 / 具体平台名 */
  platformText: string
  /** 当前观察月（YYYY-MM） */
  month: string
  /** 月份选项（由新到旧） */
  months: { label: string; value: string }[]
  /** 对照基准文案：全库同期均值 / 全库近 N 个月均值 */
  baselineLabel: string
  /** 参与统计的样本变量数 */
  sampleCount: number
  /** 样本覆盖调用量文案（万次） */
  callsText: string
  rows: OverallLabelEffectRow[]
  /** 一句话结论 */
  summaryText: string
  /** 无样本时的空态标识 */
  empty: boolean
}

/** 整体标签效果入参：平台与样本类筛选，不含结果类筛选（避免循环依赖） */
export interface OverallLabelEffectParams {
  /** 平台（渠道）：不传 = 全部平台 */
  platform?: string
  /** 变量类型：外数 / 行为变量 / 征信变量 */
  variableType?: string
  /** 搜索词（变量名 / Code / ID） */
  keyword?: string
  /** 最小月调用量（万次） */
  minCalls?: number
  /** 观察月（YYYY-MM），非法值回落到最新月 */
  month?: string
}

/**
 * 合成变量的最小档案兜底（评估文档 §9-Q3 方案 A）
 * 台账里没有的 `VAR-EFF-xxxx` 也允许进详情页，基础信息用本结构渲染。
 */
export interface EffectProfile {
  variableId: string
  name: string
  code: string
  type: string
  status: string
  statusLabel: string
  sourceType: EffectSourceType
  sourceTypeLabel: string
  category: string
  l1CategoryLabel: string
  updateFrequency: EffectFrequency
  dataSource: string
  dataSourceName: string
  dataTableName: string
  quality: number
  /** 缺失率（百分比数值，与台账口径一致，如 3.2 表示 3.2%） */
  missingRate: number
  creator: string
  developer: string
  adminManager: string
  createdAt: string
  updatedAt: string
  description: string
  /** 档案来源标记，页面据此显示「演示合成档案」提示 */
  profileSource: 'ledger' | 'effect_synthetic'
}

/** 总览区数据（组件禁止二次聚合，全部由 store 返回） */
export interface EffectOverview {
  /** 统计区间 */
  periodLabel: string
  periodStart: string
  periodEnd: string
  /** 跑批执行信息 */
  lastRunAt: string
  nextRunAt: string
  runProgress: { done: number; total: number; status: TaskStatus }
  /** 效果视角四数（含环比） */
  numbers: {
    key: 'coverage' | 'offline' | 'online' | 'calls'
    label: string
    value: number
    /** 环比变化（绝对值或百分比，由 store 决定语义） */
    delta: number
    deltaLabel: string
    unit: string
    /** 点击跳转的页内锚点 + tab 参数 */
    anchor: string
    tab: string
  }[]
  /** 策略平台调用分布（platform = 使用变量策略的业务平台，如蚂蚁 / 京东 / 美团） */
  platformDistribution: {
    platform: string
    calls: number
    /** 占比 0-1 */
    ratio: number
    boundCount: number
    state: PlatformCallState
    /** 双态文案，前端不做判断 */
    stateText: string
  }[]
  /** 零调用策略平台列表 */
  zeroCallPlatforms: { platform: string; state: PlatformCallState; stateText: string }[]
  /** 覆盖范围说明（评估文档 §9-Q2，避免误读为真实资产数） */
  coverageNote: string
}

/** 推荐列表入参 */
export interface EffectListParams {
  /** offline / online / neutral / all */
  tab?: string
  keyword?: string
  platform?: string
  /** 变量类型：外数 / 行为变量 / 征信变量（替代来源筛选） */
  variableType?: string
  /** Y 标签键（MetricKey），缺省取 MOB3_DPD30 */
  y?: string
  /** 时间区间：逗号分隔的月份列表（YYYY-MM），缺省近 4 个月 */
  months?: string
  /** 兼容保留：一级分类 / 更新频率已从展示侧移除，不再参与筛选 */
  l1Category?: string
  updateFrequency?: string
  sourceType?: string
  /** 最小月调用量（万次） */
  minCalls?: number
  /** 授信量级下限（万次） */
  minGrantCalls?: number
  /** 支用量级下限（万次） */
  minLoanCalls?: number
  /** 授信占比下限（%，0-100） */
  minGrantRatio?: number
  /** 支用占比下限（%，0-100） */
  minLoanRatio?: number
  /** 当前 Y 标签 lift 下限（倍数） */
  minLift?: number
  /** 相对 lift 均值的筛选：above = 优于均值，below = 低于均值 */
  liftVsMean?: string
  /** 排序字段：逗号分隔的多字段（主排序,次排序,...），缺省 effectIndex */
  sortBy?: string
  /** 排序方向：逗号分隔（desc,asc,...），与 sortBy 一一对应，缺省 desc */
  sortOrder?: string
  page?: number
  pageSize?: number
  /** top = 默认 Top20，all = 展开全部 */
  mode?: 'top' | 'all'
}

/** 推荐列表返回 */
export interface EffectListResult {
  total: number
  page: number
  pageSize: number
  rows: EffectRow[]
  /** Top20 模式下的全量条数（用于「展开全部 N 个」文案） */
  fullCount: number
  /** 演示态错误/空态标识，无异常时为 'none' */
  state: EffectListState
}

/**
 * 列表状态枚举（文档「错误空态 6 类」的 mock 转译）
 * 由 store 判定并返回，组件只按枚举渲染文案
 */
export type EffectListState =
  | 'none'
  | 'loading'
  | 'empty_filter'
  | 'empty_data'
  | 'error_network'
  | 'error_server'

/** 人工标记记录 */
export interface MarkRecord {
  id: string
  variableId: string
  variableName: string
  type: MarkType
  typeLabel: string
  reason: string
  operator: string
  operatorRole: string
  createdAt: string
}

/** 意见评论 */
export interface Opinion {
  id: string
  variableId: string
  author: string
  role: string
  roleLabel: string
  text: string
  createdAt: string
  likes: number
  /** 当前用户是否点过赞（支持改票） */
  voted: boolean
}

/** 规则阈值配置 */
export interface RuleConfig {
  /** 效果指数低于该值 → 建议汰换 */
  offlineIndexBelow: number
  /** 效果指数高于该值 → 推荐使用 */
  onlineIndexAbove: number
  /** 最小调用量（低于视为无有效样本，不判定） */
  minCalls: number
  /** 缺失率上限 */
  maxMissingRate: number
  /** MOB3 DPD30 高于该值视为差 */
  dpd30WorseThan: number
  /** 是否推送 */
  pushEnabled: boolean
  /** 推送对象 */
  pushTargets: string[]
  updatedAt: string
  updatedBy: string
}

/** 效果跑批任务 */
export interface EffectTask {
  id: string
  name: string
  /** daily_offline_scan / weekly_online_review / monthly_report / adhoc */
  type: string
  typeLabel: string
  status: TaskStatus
  statusLabel: string
  /** cron 文案 */
  scheduleText: string
  nextTriggerAt: string
  lastRunAt: string
  lastRunResult: RunResult
  lastRunResultLabel: string
  /** 最近执行结果文案（三色对应的文字说明） */
  lastRunSummary: string
  owner: string
  variableCount: number
  enabled: boolean
  /** 进度百分比（轮询推进） */
  progress: number
}

/** 任务实例（批次） */
export interface TaskInstance {
  id: string
  taskId: string
  batchNo: string
  startedAt: string
  finishedAt: string
  status: TaskStatus
  statusLabel: string
  result: RunResult
  /** 命中变量数 */
  hitCount: number
  offlineCount: number
  onlineCount: number
  /** 耗时（秒） */
  duration: number
  operator: string
  /** 触发方式 */
  trigger: string
}

/** 入参历史 */
export interface ParamHistory {
  id: string
  taskId: string
  batchNo: string
  createdAt: string
  operator: string
  /** before/after 为原始值；展示用文案由 mock 层格式化（百分号、开关、原值）后放在 *Text */
  changes: { field: string; before: string; after: string; beforeText: string; afterText: string }[]
}

/** 任务详情（按 tab 返回对应数据） */
export interface EffectTaskDetail {
  task: EffectTask
  tab: string
  /** tab=config */
  variables?: {
    variableId: string
    name: string
    code: string
    verdict: EffectVerdict
    /** 结论文案由 store 下发，页面不维护字典 */
    verdictLabel: string
    callCount: number
    /** true = 演示合成样本 */
    synthetic: boolean
  }[]
  rule?: RuleConfig
  /** 命中预览：全部数字由 store 算好（含剔除合计），组件只做展示 */
  hitPreview?: {
    hitCount: number
    sampleRows: EffectRow[]
    offlineHit: number
    onlineHit: number
    excludedByCalls: number
    excludedByMissing: number
    excludedTotal: number
  }
  pushTargets?: { candidates: { id: string; name: string }[]; chosen: string[] }
  /** tab=instances */
  instances?: TaskInstance[]
  /** tab=params */
  paramHistory?: ParamHistory[]
}

/** 任务列表入参 */
export interface TaskListParams {
  keyword?: string
  type?: string
  status?: string
  /** 四数字卡口径：all / running / failed / disabled，与 stats 同源判定 */
  preset?: string
  page?: number
  pageSize?: number
}

/** 试跑入参 */
export interface TrialParams {
  /** 抽样比例（%） */
  sampleRatio: number
  /** 抽样上限个数 */
  sampleLimit: number
  rule?: Partial<RuleConfig>
}

/** 试跑结果（不写入正式实例） */
export interface TrialResult {
  taskId: string
  /** 抽样命中数 */
  sampledCount: number
  offlineCount: number
  onlineCount: number
  rows: EffectRow[]
  /** 提示文案：试跑不落正式批次 */
  notice: string
}
