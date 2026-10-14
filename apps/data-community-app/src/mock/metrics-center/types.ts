/**
 * 指标中心 - 类型定义
 * 对应需求文档：指标中心 v3.0
 */

/** 指标类型 */
export type MetricType = 'business' | 'regulatory'

/** 指标域 */
export type MetricDomain = 'business' | 'regulatory'

/** 指标状态（含"审核中"，对齐需求状态机：草稿→审核中→启用→归档） */
export type MetricStatus = 'active' | 'pending' | 'archived' | 'draft'

/** 版本状态 */
export type VersionStatus = 'active' | 'pending' | 'archived' | 'draft'

/** 计算时效 */
export type CalculationFrequency = 'realtime' | 'T+1' | 'T+2' | 'weekly' | 'monthly'

/** 报表位置（历史字段：手填 name+url；新挂载一律走 MetricReportMount 引用报表库） */
export interface ReportLocation {
  name: string
  url: string
}

/** 来源类型（结构化字段 · R12） */
export type MetricSourceType = 'result_table' | 'model_calc' | 'sql_fetch' | 'third_party'

/** 统计粒度（AG-05，值域受控） */
export type MetricGranularity = 'customer' | 'account' | 'loan_order' | 'channel' | 'product' | 'day' | 'week' | 'month'



/**
 * Agent 语义契约（仅保留 AG-01 同义词）
 * 同义词参与搜索/相似问匹配，必须结构化；AG-02~08 语义内容统一由 agentDoc（Markdown）维护
 */
export interface MetricAgentMeta {
  /** AG-01 同义词/别名：让 Agent 听懂口语（"首逾率"→FPD30），检索与匹配的程序化依据 */
  synonyms: string[]
}

/** 指标→报表挂载（关联关系，维护入口仅在指标侧 R14/红线7） */
export interface MetricReportMount {
  /** 从报表库选择的报表 ID（非手填 URL） */
  reportId: string
  /** 使用角色/面向的使用方 */
  role: string
  /** 打开报表所需参数说明 */
  params: string
  /** AG-11 场景路由提示词：什么场景去哪个报表 */
  scenarioRoutingPrompt: string
  /** 可见范围 */
  visibility: 'all' | 'domain' | 'specific'
}

/** 完整度评分（自动生成：系统按字段填充率算） */
export interface CompletenessScore {
  /** 人读信息维护完整度 0-100 */
  metaScore: number
  /** Agent 字段完整度 0-100 */
  agentScore: number
  /** 人读信息缺口字段中文名 */
  metaMissing: string[]
  /** Agent 字段缺口清单 */
  agentMissing: string[]
}

/** 报表类型（R22） */
export type ReportType = 'fixed' | 'branch_board' | 'dashboard'

/** 报表状态 */
export type ReportStatus = 'active' | 'offline'

/**
 * 报表实体（报表库，模块 B）
 * 报表以「名称 + 跳转路径」唯一标识；跳转路径人机同源（R27），其余 Agent 语义（参数、维度、权限等）统一在 agentDoc 维护
 */
export interface ReportItem {
  id: string
  name: string
  type: ReportType
  owner: string
  updateFrequency: CalculationFrequency
  status: ReportStatus
  /** 访问入口（人机共用：人点击直达、Agent 打开报表同用此路径） */
  accessEntry: string
  /** Agent 说明文档（Markdown）：调用参数、可筛维度、权限约束、回答行为等全部 Agent 语义在此维护 */
  agentDoc?: string
  updatedAt: string
}

/** 血缘节点类型（R18 钻取链路：指标→结果表→上游表→上游字段） */
export type LineageNodeType = 'metric' | 'result_table' | 'upstream_table' | 'field' | 'downstream'

/** 血缘节点 */
export interface LineageNode {
  id: string
  label: string
  type: LineageNodeType
  /** 所属表 */
  table?: string
  /** 字段详情（点字段看详情，R18/E-验收） */
  detail?: {
    expression: string
    businessDefinition: string
    /** 敏感等级（R20 元数据传播） */
    sensitivity: string
    /** 质量规则（R20） */
    qualityRules: string[]
  }
}

/** 血缘边 */
export interface LineageEdge {
  from: string
  to: string
}

/** 指标血缘图 */
export interface MetricLineageGraph {
  nodes: LineageNode[]
  edges: LineageEdge[]
}

/** 指标版本 */
export interface MetricVersion {
  version: number
  status: VersionStatus
  description: string
  createdAt: string
  createdBy: string
  /** 版本内容快照 */
  snapshot: MetricVersionSnapshot
}

/** 版本内容快照（版本历史中存储的内容） */
export interface MetricVersionSnapshot {
  businessDefinition: string
  useCase: string
  calculationFrequency: CalculationFrequency
  technicalDefinition: string
  technicalUsageNotes: string
  reportLocations: ReportLocation[]
  resultTable: string
  queryCode: string
  versionDescription: string
}

/** 指标完整数据结构 */
export interface MetricItem {
  /** 指标ID */
  id: string
  /** 指标名称 */
  name: string
  /** 指标编码 */
  code: string
  /** 指标类型 */
  type: MetricType
  /** 指标域 */
  domain: string
  /** 归属场景（二级分类） */
  scenario: string
  /** 业务负责人 */
  businessOwner: string
  /** 技术负责人 */
  technicalOwner: string
  /** 业务口径 */
  businessDefinition: string
  /** 使用场景 */
  useCase: string
  /** 计算时效 */
  calculationFrequency: CalculationFrequency
  /** 技术口径 */
  technicalDefinition: string
  /** 技术口径使用说明 */
  technicalUsageNotes: string
  /** 报表位置列表 */
  reportLocations: ReportLocation[]
  /** 结果表 */
  resultTable: string
  /** 查询代码 */
  queryCode: string
  /** 指标整体状态 */
  status: MetricStatus
  /** 来源类型（结构化字段 · 必填） */
  sourceType?: MetricSourceType
  /** 统计粒度（AG-05 · 必填） */
  granularity?: MetricGranularity
  /** Agent 语义契约（仅同义词，结构化保留） */
  agentMeta?: MetricAgentMeta
  /** Agent 说明文档（Markdown）：AG-02~08 语义内容（口径约束/枚举映射/维度/场景等）统一在此维护 */
  agentDoc?: string
  /** 报表挂载（从报表库选择，替代手填 reportLocations） */
  reportMounts?: MetricReportMount[]
  /** 当前审核意见（状态=审核中/驳回提示用） */
  reviewNote?: string
  /** 当前版本号 */
  currentVersion: number
  /** 版本历史 */
  versions: MetricVersion[]
  /** 创建时间 */
  createdAt: string
  /** 更新时间 */
  updatedAt: string
  /** 创建人 */
  createdBy: string
  /** 是否已收藏 */
  isFavorite: boolean
  /** 是否已订阅 */
  isSubscribed: boolean
  /** 排序权重（指标地图顺序） */
  sortOrder: number
}

/** 指标树节点 */
export interface MetricTreeNode {
  key: string
  title: string
  domain?: string
  scenario?: string
  /** 指标类型筛选节点（type-* 节点） */
  metricType?: string
  /** 指标状态筛选节点（status-* 节点） */
  metricStatus?: string
  children?: MetricTreeNode[]
}

/** 人员 */
export interface Person {
  id: string
  name: string
  department: string
}

/** 治理筛选项（R03）：完整度分档 */
export type CompletenessFilter = '' | 'complete' | 'partial' | 'missing'

/** 治理筛选项（R03）：挂载状态 */
export type MountStatusFilter = '' | 'mounted' | 'unmounted'

/** 指标列表查询参数 */
export interface MetricQueryParams {
  keyword?: string
  type?: MetricType | ''
  domain?: string | ''
  scenario?: string | ''
  status?: MetricStatus[]
  /** 按挂载报表状态筛选 */
  mountStatus?: MountStatusFilter
  /** 按维护完整度筛选 */
  metaCompleteness?: CompletenessFilter
  /** 按 Agent 字段完整度筛选 */
  agentCompleteness?: CompletenessFilter
  page: number
  pageSize: number
  sortField?: string
  sortOrder?: 'asc' | 'desc'
}

/** 指标列表查询结果 */
export interface MetricQueryResult {
  list: MetricItem[]
  total: number
  page: number
  pageSize: number
}

/** 相似性检测结果 */
export interface SimilarityResult {
  metric: MetricItem
  matchedFields: string[]
  similarity: number
}

/** 批量导入校验结果行 */
export interface BatchValidationRow {
  rowIndex: number
  valid: boolean
  errors: string[]
  data: Record<string, string>
}

/** 批量导入校验结果 */
export interface BatchValidationResult {
  totalRows: number
  validRows: number
  invalidRows: number
  rows: BatchValidationRow[]
}

/** 指标取值时间点 */
export interface MetricValuePoint {
  /** 统计周期，如 2026-03 */
  period: string
  value: number
}

/** 指标取值（Mock：模拟从结果表查得的数据，跟随当前启用版本） */
export interface MetricValueSeries {
  /** 取值对应的口径版本 */
  version: number
  unit: string
  /** 较上期变化百分比 */
  trend: number
  /** 环比（较上一统计周期） */
  mom?: number
  /** 同比（较去年同期） */
  yoy?: number
  /** 趋势序列 */
  points: MetricValuePoint[]
  /** 维度拆分（饼图） */
  breakdown?: { name: string; value: number }[]
  /** 监管阈值 */
  threshold?: number
}

/** 看板卡片图表类型 */
export type DashboardChartType = 'kpi' | 'line' | 'pie' | 'bar'

/**
 * 看板卡片配置：只保存「引用哪个指标」，不保存口径与数值
 * 口径、取值一律由 MetricsCenterStore 按 metricCode 解析
 */
export interface DashboardCardConfig {
  key: string
  title: string
  chartType: DashboardChartType
  /** 单指标引用 */
  metricCode?: string
  /** 组合图（如监管达标对比）引用多个指标编码 */
  metricCodes?: string[]
  /** 看板设计时锁定的口径版本（key=指标编码），与当前版本不一致时提示「口径已更新」 */
  pinnedVersions?: Record<string, number>
  /** 引用的编码在指标中心查不到时给出的注册入口 */
  registerHint?: string
}

/** 分支看板配置 */
export interface DashboardBoardConfig {
  id: string
  title: string
  subtitle: string
  /** 面向的使用方 */
  audience: string
  kpis: DashboardCardConfig[]
  charts: DashboardCardConfig[]
}

/** 单个指标引用在看板上的解析结果 */
export interface ResolvedRef {
  code: string
  metric?: MetricItem
  values?: MetricValueSeries
  /** 引用状态：正常 / 未注册 / 草稿 / 已归档 */
  status: 'ok' | 'missing' | 'draft' | 'archived'
  /** 看板锁定版本与指标当前版本不一致 */
  outdated: boolean
  /** 看板锁定的版本 */
  pinnedVersion?: number
}

/** 卡片解析结果 */
export interface ResolvedCard extends DashboardCardConfig {
  refs: ResolvedRef[]
  /** 主引用（单指标卡片即 refs[0]） */
  primary?: ResolvedRef
}

/** 看板解析结果 */
export interface ResolvedBoard {
  config: DashboardBoardConfig
  kpis: ResolvedCard[]
  charts: ResolvedCard[]
}

/** 指标的消费方（详情页反向依赖） */
export interface MetricConsumer {
  boardId: string
  boardTitle: string
  cardKey: string
  cardTitle: string
  pinnedVersion: number
  currentVersion: number
}
