/**
 * 数据任务服务 · Doris ↔ Hive 双向同步的类型定义
 * 与 store / 视图层共用,集中导出以避免页面级散写
 *
 * 模型对齐需求文档:
 *   - R10 源端 / 目标端连接分别配置;方向在表单选择
 *   - R11 权限校验(源表读权限 / 目标表写权限)
 *   - R12 触发方式(manual / schedule),模型预留 dependency / external
 *   - R13 可见性按表权限过滤
 *   - E6 无源表读权限 → 阻断
 *   - E7 目标表已存在且非本任务创建 → 阻断
 */
export type DataSource = 'doris' | 'hive'

export type SyncDirection = 'doris-to-hive' | 'hive-to-doris'

/** 任务级状态 */
export type SyncTaskStatus = 'enabled' | 'disabled' | 'running' | 'failed' | 'success'

/** 单次运行状态 */
export type SyncRunStatus = 'pending' | 'running' | 'success' | 'failed' | 'timeout'

/** 触发方式(R12:手动 + 定时;模型预留 dependency / external) */
export type SyncTrigger = 'manual' | 'schedule' | 'dependency' | 'external'

/** 同步策略 R12 / §B3 */
export type SyncMode = 'full' | 'incremental'
export type SyncWriteMode = 'overwrite' | 'append'
export type SyncDataCheck = 'none' | 'count' | 'sample'

/** 数据源连接(R10:源端类型/连接、目标端类型/连接) */
export interface DataSourceConnection {
  datasource: DataSource
  cluster: string
  database: string
}

/** 字段映射项(需求 B2 ③ 字段映射) */
export interface FieldMappingItem {
  /** 源字段名 */
  source: string
  /** 目标字段名,空表示丢弃该字段 */
  target: string
  /** 是否选中 */
  enabled: boolean
}

/** 允许同步的数据库 */
export interface AllowDb {
  /** 唯一 id:datasource-cluster-database */
  id: string
  datasource: DataSource
  cluster: string
  database: string
  /** 账户归属(展示用) */
  owner: string
  /** personal / team,业务规则 R03 仅允许 personal */
  type: 'personal' | 'team'
}

/** 源表/字段元数据(供给源表选择器 A1 使用) */
export interface SyncTable {
  id: string
  datasource: DataSource
  cluster: string
  database: string
  tableName: string
  comment: string
  isPartitioned: boolean
  fieldCount: number
  fields: { name: string; type: string }[]
  /** 当前用户是否拥有读权限(E6 / R11)。Mock:大部分表 true,小部分 false 演示阻断 */
  hasReadPermission?: boolean
}

/** 推导的目标端(A2) */
export interface SyncTarget {
  datasource: DataSource
  cluster: string
  database: string
  tableName: string
  /** 反向(Hive→Doris)目标表以 tmp 方式落地 */
  tmp: boolean
  /** 目标端连接(可被用户在表单中改写) */
  connection: DataSourceConnection
}

/** 同步任务的执行记录(任务下的一次执行快照) */
export interface SyncRun {
  /** 运行编号 */
  id: string
  /** 所属任务编号 */
  taskId: string
  /** 触发方式 */
  trigger: SyncTrigger
  /** 运行状态 */
  status: SyncRunStatus
  /** 发起人(displayName) */
  creator: string
  /** 搬运行数 */
  rowsCopied: number
  /** 耗时 ms */
  costMs: number
  /** 开始时间 YYYY-MM-DD HH:mm:ss */
  startedAt: string
  /** 结束时间 */
  finishedAt: string
  /** 失败原因 */
  errorMessage?: string
  /** 备注 */
  note?: string
}

/**
 * 同步任务(独立于执行记录的「配置实体」,可被多次执行)
 * - createSyncTask 写入该结构
 * - submitSyncRun / retry 写入 SyncRun
 */
export interface SyncTask {
  /** 任务编号 */
  id: string
  /** 任务名 */
  name: string
  direction: SyncDirection
  /** 源端连接(R10) */
  source: DataSourceConnection
  /** 目标端连接(R10) */
  target: DataSourceConnection
  /** 源表 ID */
  sourceTableId: string
  /** 目标表名(用户可改;默认同名) */
  targetTable: string
  /** 目标表所在数据库(可改;默认 peer default) */
  targetDatabase: string
  /** 字段映射(需求 B2 ③) */
  fieldMappings: FieldMappingItem[]
  /** 同步策略(需求 B2 ④) */
  strategy: {
    mode: SyncMode
    writeMode: SyncWriteMode
    dataCheck: SyncDataCheck
  }
  /** 触发方式(需求 B2 ⑤ / R12) */
  trigger: SyncTrigger
  /** 调度频率(触发方式 = schedule 时必填) */
  schedule?: string
  cronExpression?: string
  /** 任务级状态 */
  status: SyncTaskStatus
  /** 发起人 */
  creator: string
  /** 是否已存草稿 */
  draft: boolean
  /** 创建时间 */
  createdAt: string
  /** 最近一次运行时间 */
  lastRunAt?: string
  /** 下一次预计运行时间 */
  nextRunAt?: string
  /** 备注 */
  note?: string
}

/**
 * 一条同步任务的执行记录视图(任务卡片里的「最近一次执行」摘要)
 * 保持向后兼容,内部由 SyncTask + 最近一条 SyncRun 派生
 */
export interface SyncRecord {
  /** 同步任务编号(原 = 执行编号,现在 = 任务编号) */
  id: string
  /** 任务名 */
  name: string
  direction: SyncDirection
  /** 源端 datasource(如 doris) */
  sourceDatasource: DataSource
  /** 源端定位 `<database>.<table>`,如 risk.risk_sample_policy_a */
  sourceDatabase: string
  sourceTable: string
  /** 目标端 */
  targetDatasource: DataSource
  targetDatabase: string
  targetTable: string
  /** 发起人(展示) */
  creator: string
  fieldCount: number
  status: SyncRunStatus
  rowsCopied: number
  costMs: number
  startedAt: string
  finishedAt: string
  note?: string
  errorMessage?: string
  /** 关联源表(用于详情) */
  srcTable: SyncTable
  /** 关联目标端(用于详情) */
  targetSnapshot: SyncTarget
  /** 任务级状态 */
  taskStatus: SyncTaskStatus
  /** 触发方式 */
  trigger: SyncTrigger
  /** 调度频率 */
  schedule?: string
}

/** 创建任务的表单形态(任务创建页提交时合并入库) */
export interface CreateSyncTaskInput {
  name: string
  source: DataSourceConnection
  target: DataSourceConnection
  sourceTableId: string
  targetTable: string
  targetDatabase: string
  direction: SyncDirection
  fieldMappings: FieldMappingItem[]
  strategy: SyncTask['strategy']
  trigger: SyncTrigger
  schedule?: string
  cronExpression?: string
  note?: string
  draft: boolean
  creator: string
}
