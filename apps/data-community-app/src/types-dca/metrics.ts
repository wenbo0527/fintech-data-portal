// 指标类型枚举
export enum MetricType {
  BUSINESS_CORE = 'business_core', // 业务核心指标
  REGULATORY = 'regulatory' // 监管指标
}

// 监管报表大类枚举
export enum RegulatoryCategory {
  CBIRC_BANKING = 'cbirc_banking', // 银保监会-银监报表
  PBOC_CENTRALIZED = 'pboc_centralized', // 人行-大集中报表
  PBOC_FINANCIAL_BASE = 'pboc_financial_base', // 人行-金融基础数据
  PBOC_INTEREST_RATE = 'pboc_interest_rate' // 人行-利率报备检测分析
}

// 监管报表大类标签映射
export const RegulatoryCategories = {
  [RegulatoryCategory.CBIRC_BANKING]: '银保监会-银监报表',
  [RegulatoryCategory.PBOC_CENTRALIZED]: '人行-大集中报表',
  [RegulatoryCategory.PBOC_FINANCIAL_BASE]: '人行-金融基础数据',
  [RegulatoryCategory.PBOC_INTEREST_RATE]: '人行-利率报备检测分析'
}

// 兼容性导出
export const REGULATORY_CATEGORY_LABELS = RegulatoryCategories

// 指标类型标签映射
export const MetricTypeLabels = {
  [MetricType.BUSINESS_CORE]: '业务',
  [MetricType.REGULATORY]: '监管'
}

// 兼容性导出
export const METRIC_TYPE_LABELS = MetricTypeLabels

interface MetricVersion {
  date: string
  description: string
}

// 报表名称绑定配置
export interface ReportBinding {
  id: string
  regulatoryCategory: RegulatoryCategory
  reportName: string
  metricCategories: string[] // 绑定的指标分类列表
}

// 批量注册数据结构
export interface BatchRegistrationItem {
  rowIndex: number // Excel行号
  type: MetricType
  name: string
  code: string
  category: string
  businessDomain?: string
  businessDefinition: string
  useCase?: string
  statisticalPeriod: string
  sourceTable: string
  processingLogic: string
  fieldDescription?: string
  reportInfo?: string
  storageLocation: string
  queryCode: string
  businessOwner?: string
  technicalOwner?: string
  regulatoryCategory?: RegulatoryCategory // 监管指标专用
  reportName?: string // 监管指标专用
  errors?: string[] // 验证错误信息
}

export interface MetricItem {
  id?: string
  type: MetricType // 新增：指标类型
  name: string
  code: string
  category: string
  businessDomain?: string // 监管指标可选
  businessDefinition: string
  useCase?: string // 监管指标可选
  statisticalPeriod: string
  sourceTable: string
  processingLogic: string
  fieldDescription?: string
  reportInfo?: string
  storageLocation: string
  queryCode: string
  versions: MetricVersion[]
  isFavorite?: boolean
  owner?: string // 保持兼容性
  businessOwner?: string // 业务负责人（监管指标必填）
  technicalOwner?: string // 技术负责人
  regulatoryCategory?: RegulatoryCategory // 监管指标专用：监管报表大类
  reportName?: string // 监管指标专用：报表名称
}