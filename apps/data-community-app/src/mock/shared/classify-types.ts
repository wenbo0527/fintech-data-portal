/**
 * 数据分级分类 - 共享类型定义
 * dmt-app + dfd-app 共用
 */

/** 敏感级别 */
export type SensitivityLevel = 'L1' | 'L2' | 'L3' | 'L4'

/**
 * 字段上的敏感级别取值：在 4 级之外额外允许空串。
 * 空串 = 该字段「待分级」（尚未定级），是「待分级表数」的唯一判定依据，
 * 由 ClassifyStore 据此派生 coverage，不再依赖表上硬编码的百分比。
 */
export type ClassifyLevelValue = SensitivityLevel | ''

/** 分级（业务分级） */
export type Grade = '一般' | '重要' | '关键'

/** 业务属于 */
export type BusinessBelonging = '零售' | '对公' | '风控' | '运营' | '财务'

/** 单个字段的分级分类信息（字段粒度） */
export interface ClassifyField {
  field_name: string
  field_comment: string
  /** 空串表示待分级（未定级），与 sensitivity_level 一同置空 */
  business_belonging: BusinessBelonging | ''
  grade: Grade | ''
  /** 空串表示待分级（未定级） */
  sensitivity_level: ClassifyLevelValue
  category_l1: string
  category_l2: string
  category_l3: string
  category_l4: string
  updated_at?: string
}

/** 表元信息（表粒度） */
export interface ClassifyTable {
  schema: string
  table_name: string
  table_comment: string
  owner: string
  fields: ClassifyField[]
  /**
   * 分级覆盖率 0-100。
   * 种子数据不再填写该字段：唯一事实源是字段本身，
   * 由 ClassifyStore 按「已定级字段数 / 总字段数」派生（见 ClassifyTableView.coverage）。
   */
  coverage?: number
  updated_at: string
}

/** 数据源（系统） */
export interface ClassifySystem {
  id: string
  name: string
  description: string
  icon: string
  tableCount: number
  fieldCount: number
  distribution: { L1: number; L2: number; L3: number; L4: number }
  tables: ClassifyTable[]
}

/** 矩阵表条目（规范定义） */
export interface ClassifyMatrixItem {
  id: string
  category_l1: string
  category_l2: string
  category_l3: string
  category_l4: string
  sensitivity_level: SensitivityLevel
  /** 使用该分类的字段数（mock） */
  usage_count: number
  description?: string
}

/** API 接口定义 */
export interface ClassifyApiDoc {
  id: string
  name: string
  method: 'GET' | 'POST'
  path: string
  summary: string
  request_params: { name: string; type: string; required: boolean; description: string }[]
  response_params: { name: string; type: string; description: string }[]
  request_example: string
  response_example: string
  error_codes?: { code: string; message: string }[]
}
