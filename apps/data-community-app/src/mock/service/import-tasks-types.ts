/**
 * 数据任务服务 · 数据导入任务(任意分隔符文件 → Hive / Doris)的类型定义
 *
 * 需求:
 *   - 新建任务弹窗新增「数据导入任务」类型
 *   - 支持任意分隔符的文本文件(CSV / TSV / 分号 / 竖线 / 自定义)
 *   - 目标数据源:Hive 或 Doris
 *   - 写入方式:写入已有表(文件列 → 表列字段映射)或新建表(从文件表头自动解析列结构)
 *   - 执行方式:单次,保存即执行一次(pending → running → success / failed),失败可重跑
 *
 * 复用同步任务的 DataSource / 目标库表白名单,避免二次维护元数据。
 */
import type { DataSource } from './sync-tasks-types'

/** 目标表模式:写入已有表 / 新建表 */
export type ImportTableMode = 'existing' | 'new'

/** 写入方式:覆盖 / 追加 */
export type ImportWriteMode = 'overwrite' | 'append'

/** 任务级状态 */
export type ImportTaskStatus = 'enabled' | 'disabled' | 'running' | 'success' | 'failed'

/** 单次运行状态 */
export type ImportRunStatus = 'pending' | 'running' | 'success' | 'failed'

/** 文件编码 */
export type ImportEncoding = 'utf-8' | 'gbk' | 'gb2312' | 'latin1'

/**
 * 分隔符预设:label 展示名,value 实际字符(custom 时由用户输入覆盖)
 * tab 用 '\t',在 UI 上以「Tab 制表符」展示
 */
export interface DelimiterPreset {
  label: string
  value: string
  /** 是否允许用户自定义输入 */
  custom?: boolean
}

/** 导入文件的列(解析得到;新建表即最终列结构,已有表用于映射) */
export interface ImportColumn {
  /** 文件中的列序号(0-based) */
  index: number
  /** 列名(取表头,无表头则为 col_N) */
  name: string
  /** 数据类型(新建表用于建表;推断自样例数据,可手改) */
  type: string
  /** 写入已有表时映射到的目标表列名;新建表模式下等于 name */
  targetColumn: string
  /** 是否参与导入(false = 丢弃该列) */
  enabled: boolean
  /** 样例值(取该列首个非空数据值,用于展示) */
  sample: string
}

/** 前端解析文件得到的预览结果 */
export interface ImportPreview {
  /** 列定义 */
  columns: ImportColumn[]
  /** 样例数据行(截断展示) */
  sampleRows: string[][]
  /** 数据总行数(不含表头) */
  totalRows: number
  /** 表头是否被识别(hasHeader 时等于列名来源) */
  headerApplied: boolean
}

/** 导入任务的一次执行记录 */
export interface ImportRun {
  /** 运行编号 */
  id: string
  /** 所属任务编号 */
  taskId: string
  /** 运行状态 */
  status: ImportRunStatus
  /** 发起人(displayName) */
  creator: string
  /** 读取行数 */
  rowsRead: number
  /** 成功写入行数 */
  rowsWritten: number
  /** 拒绝(跳过)行数 */
  rowsRejected: number
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

/** 数据导入任务(配置实体) */
export interface ImportTask {
  /** 任务编号 */
  id: string
  /** 任务名 */
  name: string
  /** 目标数据源:hive / doris */
  targetDatasource: DataSource
  /** 目标集群 */
  targetCluster: string
  /** 目标库 */
  targetDatabase: string
  /** 目标表模式:已有表 / 新建表 */
  tableMode: ImportTableMode
  /** 目标表名 */
  targetTable: string
  /** 源文件名 */
  fileName: string
  /** 文件大小(字节) */
  fileSize: number
  /** 分隔符实际字符 */
  delimiter: string
  /** 分隔符展示名 */
  delimiterLabel: string
  /** 文件编码 */
  encoding: ImportEncoding
  /** 是否含表头 */
  hasHeader: boolean
  /** 列定义 / 映射 */
  columns: ImportColumn[]
  /** 写入方式 */
  writeMode: ImportWriteMode
  /** 是否跳过错误行 */
  skipErrorRows: boolean
  /** 任务级状态 */
  status: ImportTaskStatus
  /** 发起人 */
  creator: string
  /** 是否草稿 */
  draft: boolean
  /** 创建时间 */
  createdAt: string
  /** 最近一次运行时间 */
  lastRunAt?: string
  /** 备注 */
  note?: string
}

/**
 * 导入任务的执行视图(任务 + 最近一次 run 派生)
 * 供统一任务列表 / 实例列表 / 详情抽屉消费,字段对齐 SyncRecord 风格
 */
export interface ImportRecord extends ImportTask {
  /** 最近一次 run 状态(执行状态语义) */
  runStatus: ImportRunStatus
  /** 最近一次 run 编号 */
  latestRunId?: string
  rowsRead: number
  rowsWritten: number
  rowsRejected: number
  costMs: number
  startedAt: string
  finishedAt: string
  errorMessage?: string
}

/** 创建任务表单入参 */
export interface CreateImportTaskInput {
  name: string
  targetDatasource: DataSource
  targetCluster: string
  targetDatabase: string
  tableMode: ImportTableMode
  targetTable: string
  fileName: string
  fileSize: number
  delimiter: string
  delimiterLabel: string
  encoding: ImportEncoding
  hasHeader: boolean
  columns: ImportColumn[]
  writeMode: ImportWriteMode
  skipErrorRows: boolean
  note?: string
  draft: boolean
  creator: string
}

/** 运行编号展示前缀 */
export const IMPORT_ID_PREFIX = 'IMPOT'
