/**
 * 数据任务服务 · Doris ↔ Hive 双向同步的类型定义
 * 与 store / 视图层共用,集中导出以避免页面级散写
 */
export type DataSource = 'doris' | 'hive'

export type SyncDirection = 'doris-to-hive' | 'hive-to-doris'
export type SyncStatus = 'pending' | 'running' | 'success' | 'failed' | 'timeout'

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
}

/** 推导的目标端(A2) */
export interface SyncTarget {
  datasource: DataSource
  cluster: string
  database: string
  tableName: string
  /** 反向(Hive→Doris)目标表以 tmp 方式落地 */
  tmp: boolean
}

/** 一条同步任务的执行记录(B1) */
export interface SyncRecord {
  /** 任务编号 */
  id: string
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
  status: SyncStatus
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
}

/** 创建任务的表单形态(任务创建页提交时合并入库) */
export interface CreateSyncTaskInput {
  source: SyncTable
  target: SyncTarget
  direction: SyncDirection
  /** 目标库由用户二次确认(本系统已推导一个默认值,用户可微调;本期 UI 默认采用推导值) */
  targetDatabaseOverride?: string
  /** 备注 */
  note?: string
  creator: string
}
