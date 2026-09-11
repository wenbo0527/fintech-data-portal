/**
 * 统一查询模块 - 共享类型
 *
 * 本模块全部为前端 Mock,不发起任何 HTTP 请求。
 * 类型定义集中在 mock 层,供 stores / components / views 复用。
 */

/** 数据源标识:Doris 用 DR、Hive 用 HC(设计文档 F19) */
export type DataSourceKey = 'doris' | 'hive'

export type NodeKind = 'datasource' | 'cluster' | 'database' | 'table'

/** 数据库导航树节点(F01,Mock 静态结构) */
export interface DbTreeNode {
  key: string
  title: string
  kind: NodeKind
  /** 仅 table 节点有,用于关联字段元数据与查询结果 */
  tableName?: string
  /** 表中文名,如「放款明细表」 */
  comment?: string
  children?: DbTreeNode[]
}

/** 字段元数据 */
export interface TableColumn {
  name: string
  type: string
  comment: string
}

/** 查询结果列定义 */
export interface ResultColumn {
  title: string
  dataIndex: string
  /** 数值列右对齐并参与数值排序 */
  numeric?: boolean
  width?: number
}

/** 一次查询的完整返回(设计文档 §7.3) */
export interface QueryResult {
  columns: ResultColumn[]
  rows: Record<string, string | number>[]
  /** 耗时展示串,如 "0.32s" */
  duration: string
  rowCount: number
  logs: LogEntry[]
  status: ExecStatus
}

/** 执行状态:空闲 / 执行中 / 成功 / 失败 / 已终止 */
export type ExecStatus = 'idle' | 'running' | 'success' | 'error' | 'aborted'

export type LogLevel = 'info' | 'warn' | 'error'

/** 单条执行日志(F09 / F35) */
export interface LogEntry {
  time: string
  level: LogLevel
  /** 日志正文,失败时为错误原因 */
  message: string
}

/** 脚本所属目录:共享脚本 / 我的脚本 */
export type ScriptScope = 'shared' | 'mine'

/** 脚本目录(F13 支持文件夹嵌套) */
export interface ScriptFolder {
  key: string
  title: string
  children?: ScriptFolder[]
}

/** 脚本记录(F13-F20) */
export interface ScriptRecord {
  id: string
  name: string
  datasource: DataSourceKey
  scope: ScriptScope
  /** 所属目录 key,null 表示挂在根目录下 */
  folderKey: string | null
  sql: string
  owner: string
  updatedAt: string
}

/** 定时任务状态(F36 鉅色映射依赖此枚举) */
export type TaskStatus = 'success' | 'failed' | 'running' | 'disabled'

/** 通知通道(F27) */
export type NotifyChannel = 'dingtalk' | 'email' | 'feishu' | 'webhook' | 'sms' | 'wechat'

/** 通知告警配置(F27) */
export interface NotifyConfig {
  notifyOnSuccess: boolean
  notifyOnFailed: boolean
  successChannel: NotifyChannel
  failedChannel: NotifyChannel
  /** 超时通知阈值(分钟),0 表示不启用 */
  timeoutMinutes: number
  /** 连续失败升级阈值(次),0 表示不启用 */
  maxConsecutiveFailures: number
}

/** 高级设置(F28) */
export interface AdvancedConfig {
  /** 重试次数 */
  retryCount: number
  /** 重试间隔(分钟) */
  retryInterval: number
  /** 跳过堆积任务 */
  skipBacklog: boolean
}

/** 任务优先级(参考 DataWorks 调度优先级) */
export type TaskPriority = 'high' | 'medium' | 'low'

/** 资源组(参考 DataWorks / DataLeap 资源组分配) */
export interface ResourceGroup {
  id: string
  name: string
  /** 可用并发数 */
  maxConcurrency: number
  /** 资源类型 */
  type: 'default' | 'dedicated'
  desc: string
}

/** 调度频率类型 */
export type ScheduleType = 'daily' | 'weekly' | 'monthly'

/** 调度详细配置（支持每日/每周/每月） */
export interface ScheduleConfig {
  type: ScheduleType
  /** 每日：执行时间 HH:mm */
  dailyTime?: string
  /** 每周：星期几 1-7（1=周一，7=周日） */
  weeklyDay?: number
  /** 每周：执行时间 HH:mm */
  weeklyTime?: string
  /** 每月：日期 1-31 */
  monthlyDay?: number
  /** 每月：执行时间 HH:mm */
  monthlyTime?: string
}

/** 依赖来源 */
export type DependencySource = 'upstream' | 'self' | 'schedule'

/** 依赖类别:表级依赖(数据表就绪) / 任务级依赖(上游任务完成) */
export type DependencyCategory = 'table' | 'task'

/** 依赖类型 */
export type DependencyType = 'table' | 'script' | 'task'

/** 依赖项 */
export interface Dependency {
  id: string
  name: string
  source: DependencySource
  type: DependencyType
  /** 依赖类别:表级 / 任务级 */
  category: DependencyCategory
  detail?: string
}

/** DQC 规则类型 */
export type DqcRuleType = 'not_null' | 'unique' | 'range' | 'referential' | 'custom'

/** DQC 规则 */
export interface DqcRule {
  id: string
  name: string
  type: DqcRuleType
  sql: string
  /** 阈值表达式，如 ">= 0.95" 或 "< 100" */
  threshold?: string
  /** 不通过时的动作：block=阻断任务 / warn=告警不阻断 */
  action: 'block' | 'warn'
}

/** DQC 配置 */
export interface DqcConfig {
  enabled: boolean
  rules: DqcRule[]
}

/** 定时任务记录(F23) */
export interface TaskRecord {
  id: string
  name: string
  datasource: DataSourceKey
  status: TaskStatus
  /** 频率展示串,如「每天 02:00」 */
  schedule: string
  /** Cron 表达式(F26) */
  cronExpression: string
  lastRun: string | null
  nextRun: string | null
  /** 关联脚本名,体现跨模块数据联动 */
  scriptName: string
  /** 通知告警配置(F27) */
  notify: NotifyConfig
  /** 高级设置(F28) */
  advanced: AdvancedConfig
  /** 调度详细配置 */
  scheduleConfig?: ScheduleConfig
  /** 依赖列表 */
  dependencies?: Dependency[]
  /** DQC 配置 */
  dqc?: DqcConfig
  /** 任务 SQL（INSERT/CREATE TABLE 语句） */
  sql?: string
  /** 资源组 ID */
  resourceGroup?: string
  /** 任务优先级 */
  priority?: TaskPriority
}

/** 任务执行历史记录(F34) */
export interface TaskExecHistory {
  id: string
  taskId: string
  /** 执行时间 */
  runAt: string
  /** 执行状态 */
  status: TaskStatus
  /** 耗时(秒) */
  duration: string
  /** 返回行数 */
  rowCount: number
  /** 错误信息(失败时) */
  errorMsg?: string
}

/** 导出方式:保存到平台 / 下载到本地 */
export type ExportMethod = 'platform' | 'local'

/** 导出任务状态:排队中 / 导出中 / 成功 / 失败 / 已过期 */
export type ExportStatus = 'queued' | 'exporting' | 'success' | 'failed' | 'expired'

/** 导出任务记录(我的导出列表页) */
export interface ExportTask {
  /** 任务编号,如 EXP20260910-001 */
  id: string
  /** 文件名(不含扩展名) */
  fileName: string
  /** 文件扩展名,当前固定 csv */
  fileExt: 'csv'
  /** 数据源展示名:Doris / Hive / Spark */
  datasource: string
  status: ExportStatus
  /** 进度 0-100 */
  progress: number
  /** 文件大小展示串,如 "156.3 MB",进行中/失败为 "—" */
  fileSize: string
  /** 创建时间 */
  createdAt: string
  method: ExportMethod
  /** 返回行数 */
  rowCount: number
  /** 结果集快照,用于「下载到本地」时重新生成 CSV */
  data?: { columns: ResultColumn[]; rows: Record<string, string | number>[] }
}

/** SQL 执行历史记录(F21) */
export interface QueryHistory {
  id: string
  /** 脚本名(如果是已保存脚本) */
  scriptName: string | null
  /** 执行的 SQL 摘要(前 80 字符) */
  sqlSnippet: string
  /** 数据源 */
  datasource: DataSourceKey
  /** 执行状态 */
  status: ExecStatus
  /** 执行时间 */
  runAt: string
  /** 耗时 */
  duration: string
  /** 返回行数 */
  rowCount: number
}
