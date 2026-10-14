/**
 * 语义契约：指标 / 术语 / 部门语境的全部类型与标签常量。
 * 本文件是语义层的类型事实源，各子应用（semantic-app 等）编译期直接引用，不得各自复制。
 */

/** 指标生命周期状态 */
export type MetricStatus = 'draft' | 'pending' | 'published' | 'offline'

/** 指标生命周期状态文案 */
export const statusLabelMap: Record<MetricStatus, string> = {
  draft: '草稿',
  pending: '待审批',
  published: '已发布',
  offline: '已下线'
}

/** 指标变更历史记录 */
export interface MetricChangeRecord {
  time: string           // 变更日期
  operator: string       // 操作人/团队
  action: string         // 动作，如 "口径公式变更"
  description: string    // 变更说明
}

/** 指标口径定义 */
export interface MetricDefinition {
  id: string
  caliberName: string        // 口径名称，如 "M1+口径"
  formula: string            // 计算公式
  sourceSystem: string       // 数据来源系统
  version: string            // 版本号
}

/** 指标表映射 */
export interface MetricTableRef {
  tableId: string
  tableName: string
  tableCnName: string
  role: 'numerator' | 'denominator' | 'dimension'
  fields: string[]           // 字段ID列表
}

/** 外部子系统标识（跨系统指标编码映射的目标应用） */
export type ExternalAppId = 'dfd' | 'data-community' | 'dmt'

/**
 * 外部子系统展示标签（UI 用短名）：
 * dfd → apps/dfd-app（数据工厂）、data-community → apps/data-community-app（数据社区）、
 * dmt → apps/dmt-app（数据地图）
 */
export const externalAppLabelMap: Record<ExternalAppId, string> = {
  dfd: '数据工厂',
  'data-community': '数据社区',
  dmt: '数据地图'
}

/** 外部子系统 Tag 色彩（Arco Tag 预设色，与 externalAppId 一一对应） */
export const externalAppColorMap: Record<ExternalAppId, string> = {
  dfd: 'purple',
  'data-community': 'cyan',
  dmt: 'gold'
}

/**
 * 跨系统指标编码引用：语义底座的标准指标 ↔ 其他子应用 mock 中的同名/同义指标编码。
 * 仅在各系统语义确实一致时建立映射；口径存在差异时用 note 说明，避免误等价。
 */
export interface ExternalMetricRef {
  app: ExternalAppId
  code: string
  name: string
  note?: string
}

/** 指标完整定义 */
export interface Metric {
  id: string
  name: string               // 指标名称
  code: string               // 指标编码
  category: string           // 分类
  maintainedBy: string       // 维护团队
  updatedAt: string          // 最后更新日期
  status: MetricStatus       // 生命周期状态
  aliases: string[]          // 别名/同义词（用于Agent检索）
  definitions: MetricDefinition[] // 口径定义（可多套）
  tables: MetricTableRef[]   // 涉及数据表
  alertThreshold: number     // 预警阈值(%)
  alertEnabled: boolean      // 是否启用预警
  changeHistory?: MetricChangeRecord[] // 变更历史（审计）
  externalRefs?: ExternalMetricRef[]   // 跨系统指标编码映射
}

/** 表映射 */
export interface TableMapping {
  tableId: string
  tableName: string
  tableCnName: string
  role: 'numerator' | 'denominator' | 'dimension'
  fields: FieldMapping[]
}

/** 字段映射 */
export interface FieldMapping {
  fieldId: string
  fieldName: string
  fieldCnName: string
  dataType: string
  description: string
  usedInFormula: string
}

/** 指标详情（含映射展开） */
export interface MetricDetail extends Metric {
  tableMappings: TableMapping[]
}

/** 指标列表项（简化） */
export interface MetricListItem {
  id: string
  name: string
  code: string
  category: string
  maintainedBy: string
  updatedAt: string
  status: MetricStatus
  aliases: string[]
  definitionCount: number
}

/** 业务部门（语境区分维度） */
export type Department = 'marketing' | 'risk' | 'operations' | 'public'

/** 部门展示标签 */
export const departmentLabelMap: Record<Department, string> = {
  marketing: '市场',
  risk: '风险',
  operations: '运营',
  public: '公共'
}

/** 部门 Tag 色彩（Arco Tag 预设色） */
export const departmentColorMap: Record<Department, string> = {
  marketing: 'orange',
  risk: 'red',
  operations: 'green',
  public: 'blue'
}

/** 阶段内的部门语境：同一指标/术语在不同部门视角下的含义与关注点不同 */
export interface StageContext {
  contextId: string
  department: Department
  contextName: string
  /** 语境说明（该部门在此阶段的关注点、术语的典型理解） */
  description: string
  metrics: StageMetric[]
}

/** 语境下的指标引用 */
export interface StageMetric {
  metricId: string
  metricName: string
  metricCode: string
}

/** 业务阶段 */
export interface BusinessStage {
  stageId: string
  stageName: string
  stageCode: 'pre_loan' | 'in_loan' | 'post_loan'
  order: number
  /** 阶段下按业务部门划分的语境 */
  contexts: StageContext[]
}

/** 术语字典条目 */
export interface Term {
  termId: string
  termName: string
  definition: string
  category: '逾期分级' | '风控术语' | '业务术语'
  relatedMetric?: string
}

/** 业务阶段树节点（阶段 → 部门语境 → 指标 三层） */
export interface StageTreeNode {
  key: string
  title: string
  nodeType: 'stage' | 'context' | 'metric'
  stageCode?: string
  /** 语境节点：所属阶段 id */
  stageId?: string
  /** 语境节点 */
  contextId?: string
  department?: Department
  metricId?: string
  children?: StageTreeNode[]
}
