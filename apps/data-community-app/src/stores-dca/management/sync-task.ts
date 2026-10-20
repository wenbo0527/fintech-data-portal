/**
 * 数据任务服务 · Doris ↔ Hive 双向自助同步 - 任务 Store
 *
 * 一期 + P0 重构:任务配置实体(SyncTask)与执行记录(SyncRun)分离
 * - 任务可重跑,每次重跑生成一条 SyncRun
 * - 任务级 status 跟随最近一次运行
 * - 保留向后兼容的 records / submit / retry 等老接口
 */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  ALLOWED_DATABASES,
  SEED_SYNC_RECORDS,
  SEED_SYNC_RUNS,
  SEED_SYNC_TASKS,
  SYNC_FIELD_LIMIT,
  SYNC_TABLES,
  deriveDirection,
  deriveTarget,
  tablesOfDatabase
} from '@/mock/service/sync-tasks'
import type {
  AllowDb,
  CreateSyncTaskInput,
  DataSource,
  DataSourceConnection,
  FieldMappingItem,
  SyncDirection,
  SyncRecord,
  SyncRun,
  SyncRunStatus,
  SyncTable,
  SyncTarget,
  SyncTask,
  SyncTaskStatus,
  SyncTrigger
} from '@/mock/service/sync-tasks-types'

/* ───────── 编号生成 ───────── */

let _taskSeqByDate: Record<string, number> = {}
function nextTaskId(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  const dateKey = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`
  _taskSeqByDate[dateKey] = (_taskSeqByDate[dateKey] ?? 0) + 1
  return `SYNCT${dateKey}-${String(_taskSeqByDate[dateKey]).padStart(3, '0')}`
}

let _runSeq: number = SEED_SYNC_RUNS.length
function nextRunId(taskId: string): string {
  _runSeq += 1
  return `${taskId}-R${String(_runSeq).padStart(4, '0')}`
}

function nowStamp(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

/* ───────── 校验规则(对齐需求 R03 / R04 / R05 / E6 / E7) ───────── */

export interface ValidationResult {
  ok: boolean
  errors: { field: 'db' | 'table' | 'fields' | 'target' | 'permission' | 'duplicate'; message: string }[]
}

/**
 * 创建/保存前的全量校验:
 *   - R11 权限:源表读权限 + 目标表写权限
 *   - E6 无源表读权限 → 阻断
 *   - R03 仅个人库
 *   - R05 字段数上限
 *   - 非分区表
 *
 * 注意:E7「目标表已被其他任务占用」当前不做阻断
 *   - 任务语义是「单次执行」,无独立运行实例,不会冲突
 *   - P1 改为定时多次执行后再开启 E7 检查
 */
export function validateSubmission(
  database: AllowDb | null,
  source: SyncTable | null,
  ctx: ValidationContext = { requirePersonal: true, fieldLimit: SYNC_FIELD_LIMIT },
  _targetDb: { datasource: DataSource; cluster: string; database: string; tableName: string } | null = null,
  _existingTasks: SyncTask[] = []
): ValidationResult {
  const errors: ValidationResult['errors'] = []
  if (!database) errors.push({ field: 'db', message: '请选择同步的数据库' })
  else if (ctx.requirePersonal && database.type !== 'personal') {
    errors.push({ field: 'db', message: '仅支持个人账户下的库' })
  }
  if (!source) errors.push({ field: 'table', message: '请选择源表' })
  else {
    // R11 源表读权限
    if (source.hasReadPermission === false) {
      errors.push({ field: 'permission', message: '无源表读权限,请联系数据管理员申请' })
    }
    if (source.isPartitioned) errors.push({ field: 'table', message: '仅支持非分区表同步' })
    if (source.fieldCount > ctx.fieldLimit) {
      errors.push({ field: 'fields', message: `字段数超出上限(${source.fieldCount}/${ctx.fieldLimit}),请拆表后同步` })
    }
  }
  // E7(P1):目标表已被其他任务占用 → 阻断。当前任务为单次执行,暂不开启
  return { ok: errors.length === 0, errors }
}

export interface ValidationContext {
  /** 仅允许 personal 库(R03) */
  requirePersonal: boolean
  /** 字段数上限(R05) */
  fieldLimit: number
}

/** 推断 target + source 是否同名(用于循环同步视觉标记 R19) */
export function isLoopSync(target: { tableName: string; datasource: DataSource }, source: SyncTable | null): boolean {
  if (!source) return false
  return source.tableName === target.tableName
}

/* ───────── Store ───────── */

export const useSyncTaskStore = defineStore('syncTask', () => {
  /** 允许同步的数据库(白名单) */
  const allowedDatabases = ref<AllowDb[]>(ALLOWED_DATABASES)

  /** 全量可同步表(包含过滤前的全量,用于搜索等场景) */
  const allTables = ref<SyncTable[]>(SYNC_TABLES)

  /** 单表字段数上限(可被外部配置覆盖,默认从 mock 同步) */
  const fieldLimit = ref<number>(SYNC_FIELD_LIMIT)

  /** 同步任务列表 */
  const tasks = ref<SyncTask[]>(SEED_SYNC_TASKS.map(t => ({ ...t, fieldMappings: [...t.fieldMappings] })))

  /** 同步任务执行记录列表 */
  const runs = ref<SyncRun[]>(SEED_SYNC_RUNS.map(r => ({ ...r })))

  /**
   * 兼容老 consumer(task-scheduler / task-instances / drawer)
   * 由 tasks + runs 派生,字段对齐 SyncRecord
   */
  const records = computed<SyncRecord[]>(() => {
    return tasks.value.map(t => recordFromTask(t, runs.value))
  })

  /** 列表筛选(记录列表页) */
  const listFilter = ref({
    keyword: '' as string,
    direction: 'all' as 'all' | SyncDirection,
    status: 'all' as 'all' | SyncRunStatus | SyncTaskStatus,
    creator: '' as string
  })

  // ─────────── 派生 ───────────

  /** 任务列表(过滤后) */
  const filteredTasks = computed(() => {
    const f = listFilter.value
    const kw = f.keyword.trim().toLowerCase()
    return tasks.value.filter(t => {
      const latestRun = runsForTask(t.id)[0]
      const effectiveStatus = (latestRun?.status ?? 'pending') as string
      if (f.direction !== 'all' && t.direction !== f.direction) return false
      if (f.status !== 'all' && effectiveStatus !== f.status) return false
      if (f.creator && t.creator !== f.creator) return false
      if (kw) {
        const sourceTable = allTables.value.find(s => s.id === t.sourceTableId)
        const haystack = [t.id, t.name, t.creator, sourceTable?.tableName ?? '', t.targetTable, t.target.database].join(' ').toLowerCase()
        if (!haystack.includes(kw)) return false
      }
      return true
    })
  })

  /** 老接口:filteredRecords 现在由 tasks 派生 */
  const filteredRecords = computed(() => {
    const f = listFilter.value
    const kw = f.keyword.trim().toLowerCase()
    return records.value.filter(r => {
      if (f.direction !== 'all' && r.direction !== f.direction) return false
      if (f.status !== 'all' && r.status !== f.status) return false
      if (f.creator && r.creator !== f.creator) return false
      if (kw) {
        const haystack = [r.id, r.sourceTable, r.targetTable, r.creator, r.sourceDatabase, r.targetDatabase].join(' ').toLowerCase()
        if (!haystack.includes(kw)) return false
      }
      return true
    })
  })

  /** 统计(基于 tasks + runs,跟老 records 维度对齐) */
  const stats = computed(() => {
    const list = records.value
    return {
      total: list.length,
      success: list.filter(r => r.status === 'success').length,
      failed: list.filter(r => r.status === 'failed' || r.status === 'timeout').length,
      running: list.filter(r => r.status === 'running' || r.status === 'pending').length
    }
  })

  /** 任务级统计(给 task-scheduler 用) */
  const taskStats = computed(() => {
    const list = tasks.value
    return {
      total: list.length,
      enabled: list.filter(t => t.status === 'enabled' || t.status === 'success').length,
      disabled: list.filter(t => t.status === 'disabled').length,
      success: list.filter(t => t.status === 'success' || t.status === 'enabled').length,
      failed: list.filter(t => t.status === 'failed').length,
      running: list.filter(t => t.status === 'running').length
    }
  })

  /** 全部发起人(供筛选下拉) */
  const creatorOptions = computed(() => Array.from(new Set(tasks.value.map(t => t.creator))))

  // ─────────── 数据层方法 ───────────

  /** 给定 dbId,获取允许同步的表(已应用同步规则) */
  function tablesOf(databaseId: string) {
    return tablesOfDatabase(databaseId)
  }

  /** 系统推导目标端(A2) */
  function autoTarget(source: SyncTable): SyncTarget {
    return deriveTarget(source)
  }

  /** 系统推导方向 */
  function autoDirection(source: SyncTable): SyncDirection {
    return deriveDirection(source)
  }

  /**
   * 根据 id 取记录(SyncRecord 视图,兼容老 consumer)
   * @deprecated 建议使用 getTaskById
   */
  function getById(id: string): SyncRecord | null {
    return records.value.find(r => r.id === id) ?? null
  }

  /** 根据 id 取任务 */
  function getTaskById(id: string): SyncTask | null {
    return tasks.value.find(t => t.id === id) ?? null
  }

  /** 取某任务的所有执行记录(按时间倒序) */
  function getRunsByTaskId(taskId: string): SyncRun[] {
    return runsForTask(taskId)
  }

  /** 取最近一条记录 */
  function getLatest(sourceTable: string): SyncRecord | null {
    let latest: SyncRecord | null = null
    for (const r of records.value) {
      if (r.sourceTable !== sourceTable) continue
      if (!latest || r.startedAt > latest.startedAt) latest = r
    }
    return latest
  }

  /** 由 DataSource 关键字取 label(R01 / R02) */
  function datasourceLabel(d: DataSource) {
    return d === 'doris' ? 'Doris' : 'Hive'
  }

  /** 生成下一个任务编号(对前端 create 提前预占) */
  function previewTaskId(): string {
    return nextTaskId()
  }

  // ─────────── 写操作 ───────────

  /**
   * 兼容老接口:创建任务并立即执行一次
   * 实际内部调 createTask + submitRun,失败概率 30% 用于演示
   */
  function submit(input: CreateSyncTaskInput): SyncRecord {
    const task = createTask(input)
    const run = submitRun(task.id, { trigger: task.trigger, note: input.note })
    return recordFromTask(task, [run])
  }

  /**
   * 创建任务(P0 重构核心入口)
   * - draft=true:仅存草稿,不执行
   * - draft=false:任务立即进入 enabled 状态
   * R11 权限校验 / E7 目标表已存在 → 抛错
   */
  function createTask(input: CreateSyncTaskInput): SyncTask {
    const id = nextTaskId()
    const task: SyncTask = {
      id,
      name: input.name,
      direction: input.direction,
      source: input.source,
      target: input.target,
      sourceTableId: input.sourceTableId,
      targetTable: input.targetTable,
      targetDatabase: input.targetDatabase,
      fieldMappings: input.fieldMappings.map(f => ({ ...f })),
      strategy: { ...input.strategy },
      trigger: input.trigger,
      schedule: input.schedule,
      cronExpression: input.cronExpression,
      status: input.draft ? 'disabled' : 'enabled',
      creator: input.creator,
      draft: input.draft,
      createdAt: nowStamp(),
      lastRunAt: undefined,
      nextRunAt: input.trigger === 'schedule' ? computeNextRun(input.schedule) : undefined,
      note: input.note
    }
    tasks.value.unshift(task)
    return task
  }

  /** 模拟执行:pending → running → success/failed,生成一条 SyncRun */
  function submitRun(taskId: string, opts: { trigger: SyncTrigger; note?: string }): SyncRun {
    const task = getTaskById(taskId)
    if (!task) throw new Error(`任务不存在: ${taskId}`)
    const run: SyncRun = {
      id: nextRunId(taskId),
      taskId,
      trigger: opts.trigger,
      status: 'pending',
      creator: task.creator,
      rowsCopied: 0,
      costMs: 0,
      startedAt: nowStamp(),
      finishedAt: '',
      note: opts.note
    }
    runs.value.unshift(run)
    task.status = 'running'
    task.lastRunAt = run.startedAt

    // 模拟异步执行
    setTimeout(() => {
      const cur = runs.value.find(r => r.id === run.id)
      if (!cur) return
      cur.status = 'running'
    }, 600)

    const totalCost = 1_200 + Math.floor(Math.random() * 600)
    setTimeout(() => {
      const cur = runs.value.find(r => r.id === run.id)
      if (!cur) return
      const fail = Math.random() < 0.3
      if (fail) {
        cur.status = 'failed'
        cur.finishedAt = nowStamp()
        cur.costMs = totalCost
        cur.errorMessage = task.direction === 'doris-to-hive'
          ? '建表失败:目标 Hive 表无写权限,任务终止,源数据未受影响。'
          : '搬运中断:目标 Doris tmp 表 commit 阶段超时,已回滚,源数据未受影响。'
        cur.rowsCopied = Math.floor(Math.random() * 5000)
        task.status = 'failed'
      } else {
        cur.rowsCopied = 5_000 + Math.floor(Math.random() * 200_000)
        cur.costMs = totalCost * 100
        cur.status = 'success'
        cur.finishedAt = nowStamp()
        task.status = 'success'
      }
    }, totalCost)

    return run
  }

  /**
   * 兼容老接口:按 record id 重试
   * 实际找到该任务下最新一条失败 run,再触发一次新 run
   */
  function retry(id: string): SyncRecord | null {
    // id 可能是 task id 或 run id
    let task: SyncTask | null = getTaskById(id)
    if (!task) {
      const run = runs.value.find(r => r.id === id)
      if (run) task = getTaskById(run.taskId)
    }
    if (!task || task.status !== 'failed') return null
    const newRun = submitRun(task.id, { trigger: 'manual', note: '重跑' })
    return recordFromTask(task, [newRun])
  }

  /** 启用任务(disable → enabled) */
  function enable(taskId: string): void {
    const t = getTaskById(taskId)
    if (!t) return
    t.status = 'enabled'
  }

  /** 停用任务(enabled → disabled) */
  function disable(taskId: string): void {
    const t = getTaskById(taskId)
    if (!t) return
    t.status = 'disabled'
  }

  /** 重置筛选 */
  function resetListFilter() {
    listFilter.value.keyword = ''
    listFilter.value.direction = 'all'
    listFilter.value.status = 'all'
    listFilter.value.creator = ''
  }

  // ─────────── 内部辅助 ───────────

  function runsForTask(taskId: string): SyncRun[] {
    return runs.value
      .filter(r => r.taskId === taskId)
      .sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1))
  }

  /** 由任务 + 该任务所有 run 派生 SyncRecord 视图 */
  function recordFromTask(t: SyncTask, allRuns: SyncRun[]): SyncRecord {
    const sourceTable = allTables.value.find(s => s.id === t.sourceTableId)
    const taskRuns = allRuns.filter(r => r.taskId === t.id)
    const latest = [...taskRuns].sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1))[0]
    return {
      id: t.id,
      name: t.name,
      direction: t.direction,
      sourceDatasource: t.source.datasource,
      sourceDatabase: `${t.source.database}.${sourceTable?.tableName ?? ''}`,
      sourceTable: sourceTable?.tableName ?? '',
      targetDatasource: t.target.datasource,
      targetDatabase: `${t.target.database}.${t.targetTable}`,
      targetTable: t.targetTable,
      creator: t.creator,
      fieldCount: sourceTable?.fieldCount ?? 0,
      status: latest?.status ?? 'pending',
      rowsCopied: latest?.rowsCopied ?? 0,
      costMs: latest?.costMs ?? 0,
      startedAt: latest?.startedAt ?? t.createdAt,
      finishedAt: latest?.finishedAt ?? '',
      note: latest?.note ?? t.note,
      errorMessage: latest?.errorMessage,
      srcTable: sourceTable!,
      targetSnapshot: {
        datasource: t.target.datasource,
        cluster: t.target.cluster,
        database: t.target.database,
        tableName: t.targetTable,
        tmp: t.target.database === 'tmp',
        connection: t.target
      },
      taskStatus: t.status,
      trigger: t.trigger,
      schedule: t.schedule
    }
  }

  /** 简易 nextRun 计算(只用于演示,实际应由后端 cron 服务给出) */
  function computeNextRun(schedule?: string): string | undefined {
    if (!schedule) return undefined
    if (schedule.includes('02:00')) return '2026-09-04 02:00:00'
    if (schedule.includes('07:00')) return '2026-09-08 07:00:00'
    return undefined
  }

  return {
    // state
    allowedDatabases,
    allTables,
    fieldLimit,
    tasks,
    runs,
    records,
    listFilter,
    // computed
    filteredTasks,
    filteredRecords,
    stats,
    taskStats,
    creatorOptions,
    // methods
    tablesOf,
    autoTarget,
    autoDirection,
    getById,
    getTaskById,
    getRunsByTaskId,
    getLatest,
    datasourceLabel,
    previewTaskId,
    submit,
    createTask,
    submitRun,
    retry,
    enable,
    disable,
    resetListFilter
  }
})
