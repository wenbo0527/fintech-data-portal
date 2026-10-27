/**
 * 标签表类型定义
 */

// 基础类型
export type TagTableStatus = 'active' | 'archived'
export type IdentityType = 'mobile' | 'device_id' | 'id_card' | 'card_no'
export type MappingAlgorithm = 'exact' | 'fuzzy' | 'similarity'

/**
 * 连续型判定（R47）
 * 仅数值型标签可查看分位统计，枚举/布尔/文本型不展示
 */
export type ContinuousType = 'continuous' | 'categorical' | 'boolean' | 'text'

/**
 * 标签表实体
 */
export interface TagTable {
  id: string
  name: string
  code: string
  description: string
  status: TagTableStatus
  categories: string[]
  dataSource: string
  dataSourceId: string
  tableName: string
  primaryKey: string
  identityType: IdentityType
  primaryKeyFormat: string
  mappingRules: MappingRule[]
  enableMapping: boolean
  creator: string
  createTime: string
  updater: string
  updateTime: string
  /** 数值单位（元/万元等），由标签元数据决定；缺失时展示「—」 */
  unit?: string
  /** 是否派生标签（R57-1）：派生标签本期不提供分位统计 */
  derived?: boolean
  /** 连续型判定（R47） */
  continuousType?: ContinuousType
  /** 已生成的历史快照日期，用于快照日期下拉 */
  snapshotDates?: string[]
}

/**
 * IDMapping规则
 */
export interface MappingRule {
  id: string
  sourceField: string
  targetField: string
  algorithm: MappingAlgorithm
  threshold?: number
  enabled?: boolean
}

/**
 * 数据源
 */
export interface DataSource {
  id: string
  name: string
  type: string
  host: string
  port: number
  database: string
  username: string
  status: 'active' | 'inactive'
  createTime: string
}

/**
 * 表字段信息
 */
export interface TableField {
  name: string
  type: string
  description: string
  nullable: boolean
  isPrimaryKey: boolean
  isPartitionField: boolean
  defaultValue?: string
}

/**
 * 主键唯一性检查结果
 */
export interface UniquenessCheckResult {
  score: number
  uniqueCount: number
  totalCount: number
  suggestion: string
}

/**
 * 创建标签表DTO
 */
export interface CreateTagTableDTO {
  name: string
  code: string
  description: string
  categories: string[]
  dataSourceId: string
  tableName: string
  primaryKey: string
  identityType: IdentityType
  primaryKeyFormat: string
  mappingRules: MappingRule[]
  enableMapping: boolean
}

/**
 * 更新标签表DTO
 */
export interface UpdateTagTableDTO {
  name?: string
  code?: string
  description?: string
  categories?: string[]
  status?: TagTableStatus
  mappingRules?: MappingRule[]
  enableMapping?: boolean
}

/**
 * 获取标签表列表参数
 */
export interface GetTagTablesParams {
  page?: number
  pageSize?: number
  name?: string
  status?: TagTableStatus
  category?: string
  startDate?: string
  endDate?: string
}

/**
 * 批量创建结果
 */
export interface BatchCreateResult {
  success: TagTable[]
  failed: {
    data: CreateTagTableDTO
    error: string
  }[]
  total: number
  /** 导入场景：跳过的条数 */
  skipped?: number
  /** 导入场景：失败明细 */
  failedItems?: {
    name: string
    reason: string
  }[]
}

/**
 * 批量导入结果（与批量创建区分：success/failed 为数量而非数组）
 */
export interface BatchImportResult {
  /** 导入成功条数 */
  success: number
  /** 跳过条数 */
  skipped: number
  /** 失败条数 */
  failed: number
  /** 失败明细 */
  failedItems: {
    name: string
    reason: string
  }[]
}

/**
 * 标签表预览
 */
export interface TagTablePreview {
  name: string
  code: string
  description: string
  categories: string[]
  dataSource: string
  tableName: string
  primaryKey: string
  identityType: IdentityType
  fieldCount: number
  estimatedRecords: number
}

/**
 * 快速注册步骤数据
 */
export interface QuickRegisterStepData {
  // 步骤1：基础信息
  basic: {
    dataSourceId: string
    tableName: string
    tableType: string
    partitionFields: string[]
    description: string
  }

  // 步骤2：字段校验
  fields: {
    registered: TableField[]
    unregistered: TableField[]
  }

  // 步骤3：批量注册
  registration: {
    selectedFields: string[]
    fieldMappings: FieldMapping[]
  }

  // 步骤4：确认提交
  confirm: {
    preview: TagTablePreview
  }
}

/**
 * 字段映射
 */
export interface FieldMapping {
  sourceField: string
  targetField: string
  fieldType: string
  description: string
  isRegistered: boolean
}

/**
 * 表单验证规则
 */
export interface FormValidationRule {
  field: string
  message: string
  validator?: (value: any) => boolean | Promise<boolean>
}

/**
 * 导入行数据
 */
export interface ImportRow {
  [key: string]: any
  name: string
  code: string
  description?: string
  categories?: string[]
  dataSourceId?: string
  tableName?: string
}

/**
 * 验证结果
 */
export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

/**
 * 验证错误
 */
export interface ValidationError {
  row: number
  field: string
  message: string
}

/**
 * 分页配置
 */
export interface PaginationConfig {
  current: number
  pageSize: number
  total: number
  showTotal?: boolean
  showJumper?: boolean
  showPageSize?: boolean
}

/**
 * 筛选表单
 */
export interface FilterForm {
  name: string
  status: TagTableStatus | ''
  category: string
  dateRange: string[]
}

/**
 * 标签实体（标签管理页使用）
 */
export interface TagItem {
  id: string
  name: string
  /** 数据类型：number / string / date / boolean */
  dataType: string
  /** 标签分类 */
  category: string
  /** 标签类型：static / rule / derived */
  tagType: string
  /** 维度主键 */
  dimensionKey: string
  /** 共享级别 */
  shareLevel: string
  /** 创建人 */
  createUser: string
  createTime: string
  description?: string
  /** IDMapping 状态 */
  mappingStatus?: 'configured' | 'unconfigured' | 'error'
  /** 数值单位（R57-2） */
  unit?: string
  /** 是否派生标签（R57-1） */
  derived?: boolean
  /** 连续型判定（R47） */
  continuousType?: ContinuousType
}

/**
 * 分位档位（R49）：固定五档
 */
export type QuantileKey = 'p10' | 'p25' | 'p50' | 'p75' | 'p90'

/**
 * 单期快照分位统计结果
 */
export interface QuantileSnapshot {
  /** 快照日期 */
  date: string
  /** 快照总人数（去重） */
  totalCount: number
  /** 空值人数 */
  nullCount: number
  /** 有效样本量 = 总人数 − 空值人数（R48） */
  validCount: number
  /** 均值（R51，空值不参与） */
  mean: number
  /** 五档分位值 */
  quantiles: Record<QuantileKey, number>
  /** 最小值 / 最大值（R56，不剔除极值） */
  min: number
  max: number
  /** P99（R56） */
  p99: number
  /** 标签单位（元/万元等），缺失为 '—' */
  unit: string
  /** 标签口径是否在区间内发生变更（E31） */
  caliberChanged?: boolean
}

/**
 * 双日期对比结果（R53）
 */
export interface QuantileCompareResult {
  base: QuantileSnapshot
  compare: QuantileSnapshot
  /** 各档变动量与方向 */
  deltas: Record<QuantileKey, number>
  /** 超阈值档位（R54，默认 20%） */
  exceededKeys: QuantileKey[]
}
