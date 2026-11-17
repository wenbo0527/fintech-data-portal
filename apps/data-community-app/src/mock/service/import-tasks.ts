/**
 * 数据任务服务 · 数据导入任务(任意分隔符文件 → Hive / Doris) - Mock 数据 + 前端解析工具
 *
 * - 目标库表白名单复用同步任务(ALLOWED_DATABASES / SYNC_TABLES),避免二次维护元数据
 * - 提供纯函数解析器:按分隔符切分文本、推断列类型、生成预览
 * - 种子任务演示:写入已有表 / 新建表 两种模式,成功 / 失败 两种状态
 */
import { ALLOWED_DATABASES, SYNC_TABLES } from './sync-tasks'
import type { DataSource } from './sync-tasks-types'
import type {
  DelimiterPreset,
  ImportColumn,
  ImportPreview,
  ImportRecord,
  ImportRun,
  ImportRunStatus,
  ImportTask,
  ImportTaskStatus
} from './import-tasks-types'

/* ------------------------------------------------------------------ */
/* ① 分隔符预设 / 编码                                                  */
/* ------------------------------------------------------------------ */

/** 常用分隔符预设;custom 用哨兵值 '__custom__',由用户输入任意字符覆盖 */
export const DELIMITER_PRESETS: DelimiterPreset[] = [
  { label: '逗号 ,', value: ',' },
  { label: 'Tab 制表符', value: '\t' },
  { label: '分号 ;', value: ';' },
  { label: '竖线 |', value: '|' },
  { label: '自定义', value: '__custom__', custom: true }
]

/** 自定义分隔符哨兵值 */
export const CUSTOM_DELIMITER = '__custom__'

/** 编码下拉 */
export const ENCODING_OPTIONS: { label: string; value: ImportTask['encoding'] }[] = [
  { label: 'UTF-8', value: 'utf-8' },
  { label: 'GBK', value: 'gbk' },
  { label: 'GB2312', value: 'gb2312' },
  { label: 'Latin-1', value: 'latin1' }
]

/** 分隔符字符 → 展示名 */
export function delimiterLabelOf(value: string): string {
  if (value === ',') return '逗号 ,'
  if (value === '\t') return 'Tab 制表符'
  if (value === ';') return '分号 ;'
  if (value === '|') return '竖线 |'
  if (!value) return '逗号 ,'
  return `自定义 ${value}`
}

/* ------------------------------------------------------------------ */
/* ② 前端解析器(纯函数)                                               */
/* ------------------------------------------------------------------ */

/** 按分隔符切分一行,支持双引号包裹字段(引号内分隔符不切分,`""` 转义) */
export function splitLine(line: string, delimiter: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        cur += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === delimiter) {
      out.push(cur)
      cur = ''
    } else {
      cur += ch
    }
  }
  out.push(cur)
  return out.map(s => s.trim())
}

const RE_INT = /^-?\d+$/
const RE_FLOAT = /^-?\d+\.\d+([eE][+-]?\d+)?$/
const RE_DATE = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/

/** 由一列的样例值推断类型 */
export function inferColumnType(values: string[]): string {
  const nonEmpty = values.filter(v => v !== '' && v != null)
  if (!nonEmpty.length) return 'string'
  if (nonEmpty.every(v => RE_INT.test(v))) {
    return nonEmpty.some(v => v.replace('-', '').length > 9) ? 'bigint' : 'int'
  }
  if (nonEmpty.every(v => RE_INT.test(v) || RE_FLOAT.test(v))) return 'double'
  if (nonEmpty.every(v => RE_DATE.test(v))) return 'date'
  const asUpper = nonEmpty.map(v => v.toUpperCase())
  if (asUpper.every(v => ['TRUE', 'FALSE', '0', '1'].includes(v))) return 'boolean'
  return 'string'
}

/**
 * 解析分隔符文本 → 预览(列定义 + 样例行 + 总行数)
 * @param text 文件文本内容
 * @param delimiter 分隔符字符
 * @param hasHeader 首行是否为表头
 * @param maxPreview 预览行数上限
 */
export function parseDelimitedText(
  text: string,
  delimiter: string,
  hasHeader: boolean,
  maxPreview = 20
): ImportPreview {
  const delim = delimiter || ','
  const lines = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter(l => l.trim().length > 0)

  if (!lines.length) {
    return { columns: [], sampleRows: [], totalRows: 0, headerApplied: false }
  }

  const grid = lines.map(l => splitLine(l, delim))
  const colCount = grid.reduce((m, r) => Math.max(m, r.length), 0)

  let columns: ImportColumn[]
  let dataRows: string[][]
  if (hasHeader) {
    const header = grid[0]
    dataRows = grid.slice(1)
    columns = Array.from({ length: colCount }, (_, i) => ({
      index: i,
      name: (header[i] ?? '').trim() || `col_${i + 1}`,
      type: 'string',
      targetColumn: (header[i] ?? '').trim() || `col_${i + 1}`,
      enabled: true,
      sample: ''
    }))
  } else {
    dataRows = grid
    columns = Array.from({ length: colCount }, (_, i) => ({
      index: i,
      name: `col_${i + 1}`,
      type: 'string',
      targetColumn: `col_${i + 1}`,
      enabled: true,
      sample: ''
    }))
  }

  // 推断类型 + 取样例值(用前 50 数据行样本)
  const sampleSource = dataRows.slice(0, 50)
  for (const col of columns) {
    const values = sampleSource.map(r => r[col.index] ?? '')
    col.type = inferColumnType(values)
    col.sample = values.find(v => v !== '') ?? ''
  }

  return {
    columns,
    sampleRows: dataRows.slice(0, maxPreview),
    totalRows: dataRows.length,
    headerApplied: hasHeader
  }
}

/** 文件字节数 → 可读串 */
export function formatFileSize(bytes: number): string {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let v = bytes
  let u = 0
  while (v >= 1024 && u < units.length - 1) {
    v /= 1024
    u++
  }
  return `${u === 0 ? v : v.toFixed(1)} ${units[u]}`
}

/* ------------------------------------------------------------------ */
/* ③ 目标库表元数据(复用同步任务白名单)                                */
/* ------------------------------------------------------------------ */

/** 某数据源下可选的目标库 */
export function targetDatabasesOf(datasource: DataSource) {
  return ALLOWED_DATABASES.filter(d => d.datasource === datasource)
}

/** 某 数据源/集群/库 下已存在的目标表(供「写入已有表」选择) */
export function targetTablesOf(datasource: DataSource, cluster: string, database: string) {
  return SYNC_TABLES.filter(
    t => t.datasource === datasource && t.cluster === cluster && t.database === database
  )
}

/** 取某张已有表的列(名 + 类型),供字段映射下拉 */
export function tableColumnsOf(tableId: string): { name: string; type: string }[] {
  return SYNC_TABLES.find(t => t.id === tableId)?.fields ?? []
}

/* ------------------------------------------------------------------ */
/* ④ 时间/编号辅助                                                      */
/* ------------------------------------------------------------------ */

function nowOffsetDays(daysAgo: number, hour = 10, min = 5): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(hour)}:${p(min)}:00`
}

/** 构造一组演示列(新建表模式:列名/类型来自文件) */
function cols(spec: [name: string, type: string, sample: string][]): ImportColumn[] {
  return spec.map(([name, type, sample], i) => ({
    index: i,
    name,
    type,
    targetColumn: name,
    enabled: true,
    sample
  }))
}

/* ------------------------------------------------------------------ */
/* ⑤ 种子任务 + 运行记录                                                */
/* ------------------------------------------------------------------ */

type SeedSpec = {
  id: string
  name: string
  task: Omit<
    ImportTask,
    'id' | 'name' | 'status' | 'createdAt' | 'lastRunAt' | 'creator' | 'draft'
  > & { creator: string; taskStatus?: ImportTaskStatus; draft?: boolean; createdAt: string }
  runs: {
    status: ImportRunStatus
    rowsRead: number
    rowsWritten: number
    rowsRejected?: number
    costMs: number
    startedAt: string
    finishedAt: string
    errorMessage?: string
    note?: string
  }[]
}

const SEED_SPECS: SeedSpec[] = [
  {
    id: 'IMPOT20261102-001',
    name: '导入·customer_loan_2026Q3.csv',
    task: {
      targetDatasource: 'doris',
      targetCluster: 'internal',
      targetDatabase: 'ADM',
      tableMode: 'existing',
      targetTable: 'dwd_loan_daily',
      fileName: 'customer_loan_2026Q3.csv',
      fileSize: 8_342_771,
      delimiter: ',',
      delimiterLabel: '逗号 ,',
      encoding: 'utf-8',
      hasHeader: true,
      columns: cols([
        ['col_01', 'string', 'C100238'],
        ['col_02', 'double', '158000.00'],
        ['col_03', 'date', '2026-07-01'],
        ['col_04', 'int', '12'],
        ['col_05', 'string', 'RISK-A'],
        ['col_06', 'double', '0.0835']
      ]),
      writeMode: 'append',
      skipErrorRows: true,
      creator: '王运营',
      createdAt: nowOffsetDays(6, 9, 12)
    },
    runs: [
      {
        status: 'success',
        rowsRead: 128_540,
        rowsWritten: 128_536,
        rowsRejected: 4,
        costMs: 42_300,
        startedAt: nowOffsetDays(6, 9, 15),
        finishedAt: nowOffsetDays(6, 9, 16)
      }
    ]
  },
  {
    id: 'IMPOT20261103-002',
    name: '导入·risk_blacklist.tsv',
    task: {
      targetDatasource: 'hive',
      targetCluster: 'inceptor',
      targetDatabase: 'risk',
      tableMode: 'new',
      targetTable: 'risk_blacklist_import',
      fileName: 'risk_blacklist.tsv',
      fileSize: 1_204_992,
      delimiter: '\t',
      delimiterLabel: 'Tab 制表符',
      encoding: 'utf-8',
      hasHeader: true,
      columns: cols([
        ['cert_no', 'string', '3301**********1234'],
        ['reason', 'string', '欺诈'],
        ['level', 'int', '3'],
        ['effective_date', 'date', '2026-06-30'],
        ['source', 'string', '外部采购']
      ]),
      writeMode: 'overwrite',
      skipErrorRows: false,
      creator: '陈策略',
      createdAt: nowOffsetDays(3, 14, 20)
    },
    runs: [
      {
        status: 'success',
        rowsRead: 24_180,
        rowsWritten: 24_180,
        costMs: 18_900,
        startedAt: nowOffsetDays(3, 14, 22),
        finishedAt: nowOffsetDays(3, 14, 23)
      }
    ]
  },
  {
    id: 'IMPOT20261104-003',
    name: '导入·vendor_txn_pipe.txt',
    task: {
      targetDatasource: 'doris',
      targetCluster: 'internal',
      targetDatabase: 'risk',
      tableMode: 'existing',
      targetTable: 'risk_score_d',
      fileName: 'vendor_txn_pipe.txt',
      fileSize: 45_120_660,
      delimiter: '|',
      delimiterLabel: '竖线 |',
      encoding: 'gbk',
      hasHeader: false,
      columns: cols([
        ['col_1', 'bigint', '90001'],
        ['col_2', 'double', '2300.50'],
        ['col_3', 'string', '杭州'],
        ['col_4', 'date', '2026-09-15'],
        ['col_5', 'string', '成功'],
        ['col_6', 'double', '0.912']
      ]),
      writeMode: 'append',
      skipErrorRows: true,
      creator: '张分析',
      createdAt: nowOffsetDays(1, 8, 30)
    },
    runs: [
      {
        status: 'failed',
        rowsRead: 512_880,
        rowsWritten: 0,
        rowsRejected: 512_880,
        costMs: 9_600,
        startedAt: nowOffsetDays(1, 8, 32),
        finishedAt: nowOffsetDays(1, 8, 33),
        errorMessage:
          '类型不匹配:第 3 列「string」无法写入目标列 risk_score_d.col_03(int)。请核对分隔符与字段类型后重跑。',
        note: '供应商交易流水导入'
      }
    ]
  }
]

/** 由 spec 生成 ImportTask 列表 */
export const SEED_IMPORT_TASKS: ImportTask[] = SEED_SPECS.map(spec => {
  const latest = spec.runs[0]
  return {
    id: spec.id,
    name: spec.name,
    targetDatasource: spec.task.targetDatasource,
    targetCluster: spec.task.targetCluster,
    targetDatabase: spec.task.targetDatabase,
    tableMode: spec.task.tableMode,
    targetTable: spec.task.targetTable,
    fileName: spec.task.fileName,
    fileSize: spec.task.fileSize,
    delimiter: spec.task.delimiter,
    delimiterLabel: spec.task.delimiterLabel,
    encoding: spec.task.encoding,
    hasHeader: spec.task.hasHeader,
    columns: spec.task.columns.map(c => ({ ...c })),
    writeMode: spec.task.writeMode,
    skipErrorRows: spec.task.skipErrorRows,
    status: spec.task.taskStatus ?? (latest ? deriveTaskStatus(latest.status) : 'enabled'),
    creator: spec.task.creator,
    draft: spec.task.draft ?? false,
    createdAt: spec.task.createdAt,
    lastRunAt: latest?.startedAt,
    note: latest?.note
  }
})

/** 由 spec 生成 ImportRun 列表 */
export const SEED_IMPORT_RUNS: ImportRun[] = SEED_SPECS.flatMap(spec =>
  spec.runs.map((r, rIdx) => ({
    id: `${spec.id}-R${String(rIdx + 1).padStart(3, '0')}`,
    taskId: spec.id,
    status: r.status,
    creator: spec.task.creator,
    rowsRead: r.rowsRead,
    rowsWritten: r.rowsWritten,
    rowsRejected: r.rowsRejected ?? 0,
    costMs: r.costMs,
    startedAt: r.startedAt,
    finishedAt: r.finishedAt,
    errorMessage: r.errorMessage,
    note: r.note
  }))
)

/** ImportRunStatus → ImportTaskStatus */
export function deriveTaskStatus(run: ImportRunStatus): ImportTaskStatus {
  if (run === 'running' || run === 'pending') return 'running'
  if (run === 'failed') return 'failed'
  return 'success'
}

/** 由任务 + 该任务全部 run 派生 ImportRecord 视图 */
export function recordFromImportTask(t: ImportTask, allRuns: ImportRun[]): ImportRecord {
  const taskRuns = allRuns
    .filter(r => r.taskId === t.id)
    .sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1))
  const latest = taskRuns[0]
  return {
    ...t,
    columns: t.columns.map(c => ({ ...c })),
    runStatus: latest?.status ?? 'pending',
    latestRunId: latest?.id,
    rowsRead: latest?.rowsRead ?? 0,
    rowsWritten: latest?.rowsWritten ?? 0,
    rowsRejected: latest?.rowsRejected ?? 0,
    costMs: latest?.costMs ?? 0,
    startedAt: latest?.startedAt ?? t.createdAt,
    finishedAt: latest?.finishedAt ?? '',
    errorMessage: latest?.errorMessage
  }
}

/** 种子运行记录(导出供 store 初始化) */
export const SEED_IMPORT_RECORDS: ImportRecord[] = SEED_IMPORT_TASKS.map(t =>
  recordFromImportTask(t, SEED_IMPORT_RUNS)
)

/** 运行状态元信息(状态标签) */
export const IMPORT_RUN_STATUS_META: Record<ImportRunStatus, { text: string; color: string }> = {
  pending: { text: '待执行', color: 'gray' },
  running: { text: '执行中', color: 'arcoblue' },
  success: { text: '成功', color: 'green' },
  failed: { text: '失败', color: 'red' }
}
