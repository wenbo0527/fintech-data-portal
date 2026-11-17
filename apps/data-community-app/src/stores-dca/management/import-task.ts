/**
 * 数据任务服务 · 数据导入任务 Store(任意分隔符文件 → Hive / Doris)
 *
 * 设计对齐同步任务 store:
 *   - 任务配置实体(ImportTask)与执行记录(ImportRun)分离
 *   - 单次语义:保存即执行一次(createTask + submitRun),失败可重跑
 *   - 由 tasks + runs 派生 records(ImportRecord 视图)供统一列表 / 实例 / 详情消费
 *   - store 之间不相互 import,目标库表元数据直接取自 mock 层
 */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  SEED_IMPORT_RUNS,
  SEED_IMPORT_TASKS,
  deriveTaskStatus,
  recordFromImportTask,
  targetDatabasesOf,
  targetTablesOf
} from '@/mock/service/import-tasks'
import type { DataSource } from '@/mock/service/sync-tasks-types'
import type {
  CreateImportTaskInput,
  ImportRecord,
  ImportRun,
  ImportRunStatus,
  ImportTask
} from '@/mock/service/import-tasks-types'

/* ───────── 编号生成 ───────── */

let _taskSeqByDate: Record<string, number> = {}
function nextTaskId(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  const dateKey = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`
  _taskSeqByDate[dateKey] = (_taskSeqByDate[dateKey] ?? 0) + 1
  return `IMPOT${dateKey}-${String(_taskSeqByDate[dateKey]).padStart(3, '0')}`
}

let _runSeq = SEED_IMPORT_RUNS.length
function nextRunId(taskId: string): string {
  _runSeq += 1
  return `${taskId}-R${String(_runSeq).padStart(4, '0')}`
}

function nowStamp(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

/* ───────── Store ───────── */

export const useImportTaskStore = defineStore('importTask', () => {
  /** 任务配置实体 */
  const tasks = ref<ImportTask[]>(
    SEED_IMPORT_TASKS.map(t => ({ ...t, columns: t.columns.map(c => ({ ...c })) }))
  )

  /** 执行记录 */
  const runs = ref<ImportRun[]>(SEED_IMPORT_RUNS.map(r => ({ ...r })))

  /** 派生视图:任务 + 最近一次 run */
  const records = computed<ImportRecord[]>(() =>
    tasks.value.map(t => recordFromImportTask(t, runs.value))
  )

  /** 列表筛选 */
  const listFilter = ref({
    keyword: '' as string,
    datasource: 'all' as 'all' | DataSource,
    status: 'all' as 'all' | ImportRunStatus
  })

  // ─────────── 派生 ───────────

  /** 元数据:目标库列表(按数据源) */
  const allowedDatabases = computed(() => targetDatabasesOf('doris').concat(targetDatabasesOf('hive')))

  /** 元数据:全部已有目标表(用于「写入已有表」) */
  const allTables = computed(() => {
    const out: ReturnType<typeof targetTablesOf> = []
    for (const ds of ['doris', 'hive'] as DataSource[]) {
      for (const db of targetDatabasesOf(ds)) {
        out.push(...targetTablesOf(ds, db.cluster, db.database))
      }
    }
    return out
  })

  /** 过滤后的任务列表 */
  const filteredTasks = computed(() => {
    const f = listFilter.value
    const kw = f.keyword.trim().toLowerCase()
    return tasks.value.filter(t => {
      if (f.datasource !== 'all' && t.targetDatasource !== f.datasource) return false
      const latest = runsForTask(t.id)[0]
      const eff = (latest?.status ?? 'pending') as string
      if (f.status !== 'all' && eff !== f.status) return false
      if (kw) {
        const hay = [t.id, t.name, t.creator, t.fileName, t.targetDatabase, t.targetTable]
          .join(' ')
          .toLowerCase()
        if (!hay.includes(kw)) return false
      }
      return true
    })
  })

  /** 过滤后的记录视图 */
  const filteredRecords = computed(() => {
    const f = listFilter.value
    const kw = f.keyword.trim().toLowerCase()
    return records.value.filter(r => {
      if (f.datasource !== 'all' && r.targetDatasource !== f.datasource) return false
      if (f.status !== 'all' && r.runStatus !== f.status) return false
      if (kw) {
        const hay = [r.id, r.name, r.creator, r.fileName, r.targetDatabase, r.targetTable]
          .join(' ')
          .toLowerCase()
        if (!hay.includes(kw)) return false
      }
      return true
    })
  })

  /** 统计(基于 records 执行状态) */
  const stats = computed(() => {
    const list = records.value
    return {
      total: list.length,
      success: list.filter(r => r.runStatus === 'success').length,
      failed: list.filter(r => r.runStatus === 'failed').length,
      running: list.filter(r => r.runStatus === 'running' || r.runStatus === 'pending').length
    }
  })

  // ─────────── 数据层方法 ───────────

  /** 按 id 取记录视图 */
  function getById(id: string): ImportRecord | null {
    return records.value.find(r => r.id === id) ?? null
  }

  /** 按 id 取任务实体 */
  function getTaskById(id: string): ImportTask | null {
    return tasks.value.find(t => t.id === id) ?? null
  }

  /** 某任务的全部运行(倒序) */
  function getRunsByTaskId(taskId: string): ImportRun[] {
    return runsForTask(taskId)
  }

  /** 数据源展示名 */
  function datasourceLabel(d: DataSource): string {
    return d === 'doris' ? 'Doris' : 'Hive'
  }

  // ─────────── 写操作 ───────────

  /** 创建任务实体(不执行) */
  function createTask(input: CreateImportTaskInput): ImportTask {
    const id = nextTaskId()
    const task: ImportTask = {
      id,
      name: input.name,
      targetDatasource: input.targetDatasource,
      targetCluster: input.targetCluster,
      targetDatabase: input.targetDatabase,
      tableMode: input.tableMode,
      targetTable: input.targetTable,
      fileName: input.fileName,
      fileSize: input.fileSize,
      delimiter: input.delimiter,
      delimiterLabel: input.delimiterLabel,
      encoding: input.encoding,
      hasHeader: input.hasHeader,
      columns: input.columns.map(c => ({ ...c })),
      writeMode: input.writeMode,
      skipErrorRows: input.skipErrorRows,
      status: input.draft ? 'disabled' : 'enabled',
      creator: input.creator,
      draft: input.draft,
      createdAt: nowStamp(),
      lastRunAt: undefined,
      note: input.note
    }
    tasks.value.unshift(task)
    return task
  }

  /**
   * 模拟执行一次导入:pending → running → success / failed
   * 单次语义下约 25% 概率失败,用于演示重跑
   */
  function submitRun(taskId: string, opts: { note?: string } = {}): ImportRun {
    const task = getTaskById(taskId)
    if (!task) throw new Error(`任务不存在: ${taskId}`)
    const run: ImportRun = {
      id: nextRunId(taskId),
      taskId,
      status: 'pending',
      creator: task.creator,
      rowsRead: 0,
      rowsWritten: 0,
      rowsRejected: 0,
      costMs: 0,
      startedAt: nowStamp(),
      finishedAt: '',
      note: opts.note
    }
    runs.value.unshift(run)
    task.status = 'running'
    task.lastRunAt = run.startedAt

    setTimeout(() => {
      const cur = runs.value.find(r => r.id === run.id)
      if (cur) cur.status = 'running'
    }, 600)

    const totalCost = 1_400 + Math.floor(Math.random() * 800)
    setTimeout(() => {
      const cur = runs.value.find(r => r.id === run.id)
      if (!cur) return
      const fail = Math.random() < 0.25
      const rowsRead = 20_000 + Math.floor(Math.random() * 300_000)
      cur.rowsRead = rowsRead
      cur.costMs = totalCost * 12
      cur.finishedAt = nowStamp()
      if (fail) {
        cur.status = 'failed'
        cur.rowsWritten = 0
        cur.rowsRejected = task.skipErrorRows ? 0 : rowsRead
        cur.errorMessage = task.tableMode === 'new'
          ? `建表失败:目标 ${datasourceLabel(task.targetDatasource)} 表 ${task.targetDatabase}.${task.targetTable} 无建表权限,任务终止。`
          : '字段类型不匹配:存在无法转换的列,已阻断写入。请核对分隔符/编码与字段类型后重跑。'
        task.status = 'failed'
      } else {
        cur.status = 'success'
        const rejected = task.skipErrorRows ? Math.floor(rowsRead * 0.0006) : 0
        cur.rowsRejected = rejected
        cur.rowsWritten = rowsRead - rejected
        task.status = 'success'
      }
    }, totalCost)

    return run
  }

  /**
   * 兼容保存并启用:创建 + 立即执行一次
   * draft=true 时仅存草稿不执行
   */
  function submit(input: CreateImportTaskInput): ImportRecord {
    const task = createTask(input)
    if (input.draft) return recordFromImportTask(task, runs.value)
    const run = submitRun(task.id, { note: input.note })
    return recordFromImportTask(task, [run, ...runs.value])
  }

  /** 重跑:找到失败任务再触发一次运行(id 可能是 task id 或 run id) */
  function retry(id: string): ImportRecord | null {
    let task = getTaskById(id)
    if (!task) {
      const run = runs.value.find(r => r.id === id)
      if (run) task = getTaskById(run.taskId)
    }
    if (!task || task.status !== 'failed') return null
    const newRun = submitRun(task.id, { note: '重跑' })
    return recordFromImportTask(task, [newRun, ...runs.value])
  }

  /** 停用 */
  function disable(taskId: string): void {
    const t = getTaskById(taskId)
    if (t) t.status = 'disabled'
  }

  /** 重置筛选 */
  function resetListFilter() {
    listFilter.value.keyword = ''
    listFilter.value.datasource = 'all'
    listFilter.value.status = 'all'
  }

  // ─────────── 内部 ───────────

  function runsForTask(taskId: string): ImportRun[] {
    return runs.value
      .filter(r => r.taskId === taskId)
      .sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1))
  }

  // 触发 deriveTaskStatus 的 tree-shake 保留引用(与 mock 一致,避免未使用告警)
  void deriveTaskStatus

  return {
    // state
    tasks,
    runs,
    listFilter,
    // computed
    records,
    allowedDatabases,
    allTables,
    filteredTasks,
    filteredRecords,
    stats,
    // methods
    getById,
    getTaskById,
    getRunsByTaskId,
    datasourceLabel,
    createTask,
    submitRun,
    submit,
    retry,
    disable,
    resetListFilter
  }
})
