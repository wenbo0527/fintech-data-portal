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

/** ─────────── Copilot 相关类型(P1) ─────────── */

/** Copilot 动作 */
export type CopilotAction = 'nl2sql' | 'explain' | 'optimize' | 'audit'

/** 合规提示级别 */
export type IssueLevel = 'info' | 'warn' | 'error'

/** 单条合规提示 */
export interface CopilotIssue {
  level: IssueLevel
  category: 'sensitivity' | 'compliance' | 'naming' | 'performance' | 'api' | 'unknown'
  message: string
  /** 涉及的字段或表 */
  field?: string
  table?: string
  /** 推荐的标准编号或 API 名称 */
  suggestion?: string
}

/** NL→SQL 候选 */
export interface Nl2sqlCandidate {
  sql: string
  /** 涉及到的表 */
  tables: string[]
  /** 涉及到的字段 */
  fields: string[]
  /** 涉及到的数据标准编号 */
  standards: string[]
  /** 风险提示 */
  warnings: string[]
}

/** Copilot 单轮对话 */
export interface CopilotMessage {
  id: string
  role: 'user' | 'assistant'
  action?: CopilotAction
  /** 用户原文或助手标题 */
  text: string
  /** 助手产出 */
  payload?:
    | { kind: 'candidates'; candidates: Nl2sqlCandidate[] }
    | { kind: 'explain'; summary: string; bullets: string[] }
    | { kind: 'optimize'; suggestions: string[]; rewrite?: string }
    | { kind: 'audit'; issues: CopilotIssue[] }
  ts: string
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

/** ─────────── 数据库账号管理(DBA 自助服务) ─────────── */

/** 数据库账号申请状态:已开通 / 审批中 / 已驳回 / 已过期 / 已释放 */
export type DbAccountStatus = 'active' | 'applying' | 'rejected' | 'expired' | 'revoked'

/** 账号权限级别:只读 / 读写 / 管理 */
export type DbPrivilegeLevel = 'read' | 'write' | 'admin'

/** 访问 Key 状态:启用 / 停用 / 已过期 */
export type AccessKeyStatus = 'active' | 'disabled' | 'expired'

/** 账号申请流转记录(详情抽屉时间线) */
export interface DbAccountHistory {
  ts: string
  action: string
  actor: string
  from?: DbAccountStatus
  to?: DbAccountStatus
  comment?: string
}

/** 数据库账号权限记录:一个用户在一个数据源上的一份授权 */
export interface DbAccountGrant {
  /** 申请单号,如 DB20261106-001 */
  id: string
  datasource: DataSourceKey
  /** 数据库账号名,如 dq_zhangsan_dr */
  accountName: string
  /** 集群 / 实例,如 internal / Inceptor */
  cluster: string
  /** 授权库列表 */
  databases: string[]
  privilege: DbPrivilegeLevel
  status: DbAccountStatus
  /** 有效期(月) */
  validMonths: number
  appliedAt: string
  approvedAt?: string
  /** 到期时间,审批中为空 */
  expireAt?: string
  approver?: string
  purpose: string
  /** 驳回原因 */
  rejectReason?: string
  /** 最近一次登录时间 */
  lastLoginAt?: string
  history: DbAccountHistory[]
}

/** 访问 Key 记录:用于 Python / R 客户端连接的凭证 */
export interface AccessKeyRecord {
  /** 记录编号,如 AK20260912-001 */
  id: string
  /** 用户自定义名称,如「风控建模-特征查询」 */
  name: string
  accessKeyId: string
  /** 完整 SecretKey,仅在创建 / 重置时明文展示 */
  secretKey: string
  /** 授权数据源 */
  datasources: DataSourceKey[]
  status: AccessKeyStatus
  createdAt: string
  expireAt: string
  lastUsedAt: string | null
  /** 累计调用次数 */
  callCount: number
  purpose: string
  owner: string
}

/** ─────────── 数据库账号管理(DBA 管理端) ─────────── */

/** 账号物理状态:正常 / 锁定(可解锁)/ 停用(待回收) */
export type DbAccountState = 'normal' | 'locked' | 'disabled'

/** 账号来源:用户自助申请 / 管理端手工创建 */
export type DbAccountSource = 'self-service' | 'admin'

/**
 * 数据库账号(管理端主体)
 *
 * 与 DbAccountGrant 的区别:grant 是「申请单」,account 是库里真实存在的账号,
 * 管理端以账号为主体做密码重置、权限调整、锁定与回收。
 * 密码本身不落库,只记录最近重置时间与有效期策略。
 */
export interface DbAccount {
  id: string
  /** 数据库账号名,如 dq_zhangsan_dr */
  accountName: string
  /** 所属用户 */
  ownerName: string
  ownerAccount: string
  department: string
  employeeNo: string
  datasource: DataSourceKey
  cluster: string
  databases: string[]
  privilege: DbPrivilegeLevel
  state: DbAccountState
  /** 密码最近重置时间 */
  passwordUpdatedAt: string
  /** 密码有效期(天),超出即强制重置 */
  passwordValidDays: number
  createdAt: string
  expireAt: string
  lastLoginAt: string | null
  /** 关联访问 Key 数量 */
  keyCount: number
  source: DbAccountSource
  /** 备注(锁定 / 停用原因等) */
  remark?: string
}

/** 管理端操作审计记录 */
export interface DbAdminAuditEntry {
  id: string
  ts: string
  /** 操作类型:重置密码 / 修改权限 / 锁定账号 / 回收账号 ... */
  action: string
  /** 影响对象(账号名 / AccessKeyId) */
  target: string
  /** 影响对象所属用户 */
  targetUser: string
  operator: string
  detail: string
  level: 'info' | 'warn' | 'danger'
}
