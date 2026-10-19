/**
 * 数据任务服务 · Doris ↔ Hive 双向自助同步 - 任务 Store
 *
 * 仅前端 Mock,与需求文档:
 *   A1 选库 → A2 推导目标端 → A3 提交执行 → B1 执行记录 一一对应。
 * 通知(C)本期不实现,记录中预留字段。
 */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  ALLOWED_DATABASES,
  SEED_SYNC_RECORDS,
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
  SyncDirection,
  SyncRecord,
  SyncStatus,
  SyncTable,
  SyncTarget
} from '@/mock/service/sync-tasks-types'

/* ───────── 任务编号生成 ───────── */

let _seqByDate: Record<string, number> = {}
function nextSyncId(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  const dateKey = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`
  _seqByDate[dateKey] = (_seqByDate[dateKey] ?? 0) + 1
  return `SYNC${dateKey}-${String(_seqByDate[dateKey]).padStart(3, '0')}`
}

function nowStamp(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

/* ───────── 校验规则(对齐需求 R03 / R04 / R05) ───────── */

export interface ValidationResult {
  ok: boolean
  errors: { field: 'db' | 'table' | 'fields' | 'target'; message: string }[]
}

export interface ValidationContext {
  /** 仅允许 personal 库(R03) */
  requirePersonal: boolean
  /** 字段数上限(R05) */
  fieldLimit: number
}

/** 提交流程校验,可复用:行内校验 + 提交时全量校验 */
export function validateSubmission(
  database: AllowDb | null,
  source: SyncTable | null,
  ctx: ValidationContext = { requirePersonal: true, fieldLimit: SYNC_FIELD_LIMIT }
): ValidationResult {
  const errors: ValidationResult['errors'] = []
  if (!database) errors.push({ field: 'db', message: '请选择同步的数据库' })
  else if (ctx.requirePersonal && database.type !== 'personal') {
    errors.push({ field: 'db', message: '仅支持个人账户下的库' })
  }
  if (!source) errors.push({ field: 'table', message: '请选择源表' })
  else {
    if (source.isPartitioned) errors.push({ field: 'table', message: '仅支持非分区表同步' })
    if (source.fieldCount > ctx.fieldLimit) {
      errors.push({ field: 'fields', message: `字段数超出上限(${source.fieldCount}/${ctx.fieldLimit}),请拆表后同步` })
    }
  }
  return { ok: errors.length === 0, errors }
}

/* ───────── Store ───────── */

export const useSyncTaskStore = defineStore('syncTask', () => {
  /** 允许同步的数据库(白名单) */
  const allowedDatabases = ref<AllowDb[]>(ALLOWED_DATABASES)

  /** 全量可同步表(包含过滤前的全量,用于搜索等场景) */
  const allTables = ref<SyncTable[]>(SYNC_TABLES)

  /** 单表字段数上限(可被外部配置覆盖,默认从 mock 同步) */
  const fieldLimit = ref<number>(SYNC_FIELD_LIMIT)

  /** 执行记录列表 */
  const records = ref<SyncRecord[]>(SEED_SYNC_RECORDS.map(r => ({ ...r })))

  /** 列表筛选(记录列表页) */
  const listFilter = ref({
    keyword: '' as string,
    direction: 'all' as 'all' | SyncDirection,
    status: 'all' as 'all' | SyncStatus,
    creator: '' as string
  })

  // ─────────── 派生 ───────────

  /** 记录列表(过滤后) */
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

  /** 统计 */
  const stats = computed(() => {
    const list = records.value
    return {
      total: list.length,
      success: list.filter(r => r.status === 'success').length,
      failed: list.filter(r => r.status === 'failed' || r.status === 'timeout').length,
      running: list.filter(r => r.status === 'running' || r.status === 'pending').length
    }
  })

  /** 全部发起人(供筛选下拉) */
  const creatorOptions = computed(() =>
    Array.from(new Set(records.value.map(r => r.creator)))
  )

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

  /** 根据 id 取记录 */
  function getById(id: string): SyncRecord | null {
    return records.value.find(r => r.id === id) ?? null
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
    return nextSyncId()
  }

  // ─────────── 写操作:A3 / 提交执行 ───────────

  /**
   * 同步"提交即执行一次":pending → running → success / failed
   * 通过 setTimeout 模拟执行,失败概率 30% 用于演示
   */
  function submit(input: CreateSyncTaskInput): SyncRecord {
    const id = nextSyncId()
    const sourceDb = allowedDatabases.value.find(
      d =>
        d.datasource === input.source.datasource &&
        d.cluster === input.source.cluster &&
        d.database === input.source.database
    )
    const record: SyncRecord = {
      id,
      direction: input.direction,
      sourceDatasource: input.source.datasource,
      sourceDatabase: sourceDb ? `${sourceDb.database}.${input.source.tableName}` : `${input.source.database}.${input.source.tableName}`,
      sourceTable: input.source.tableName,
      targetDatasource: input.target.datasource,
      targetDatabase: (input.targetDatabaseOverride && input.targetDatabaseOverride.trim())
        ? input.targetDatabaseOverride.trim()
        : input.target.tmp
          ? `tmp.${input.target.tableName}`
          : `${input.target.database}.${input.target.tableName}`,
      targetTable: input.target.tableName,
      creator: input.creator,
      fieldCount: input.source.fieldCount,
      status: 'pending',
      rowsCopied: 0,
      costMs: 0,
      startedAt: nowStamp(),
      finishedAt: '',
      note: input.note,
      srcTable: input.source,
      targetSnapshot: input.target
    }
    records.value.unshift(record)
    runMock(record.id)
    return record
  }

  /** 模拟执行:pending → running → success/failed */
  function runMock(id: string) {
    const cur = getById(id)
    if (!cur) return
    const delayToRunning = 600
    setTimeout(() => {
      const r = getById(id)
      if (!r) return
      r.status = 'running'
    }, delayToRunning)

    // 失败概率 30%
    const totalCost = 1_200 + Math.floor(Math.random() * 600)
    setTimeout(() => {
      const r = getById(id)
      if (!r) return
      const fail = Math.random() < 0.3
      const cost = totalCost
      if (fail) {
        r.status = 'failed'
        r.finishedAt = nowStamp()
        r.costMs = cost
        r.errorMessage = r.direction === 'doris-to-hive'
          ? '建表失败:目标 Hive 表无写权限,任务终止,源数据未受影响。'
          : '搬运中断:目标 Doris tmp 表 commit 阶段超时,已回滚,源数据未受影响。'
        r.rowsCopied = Math.floor(Math.random() * 5000)
      } else {
        const rows = 5_000 + Math.floor(Math.random() * 200_000)
        r.rowsCopied = rows
        r.costMs = cost * 100
        r.status = 'success'
        r.finishedAt = nowStamp()
      }
    }, totalCost)
  }

  /** 重试:仅失败可重试 */
  function retry(id: string): SyncRecord | null {
    const r = getById(id)
    if (!r || r.status !== 'failed') return null
    r.status = 'pending'
    r.startedAt = nowStamp()
    r.finishedAt = ''
    r.errorMessage = undefined
    r.rowsCopied = 0
    r.costMs = 0
    runMock(r.id)
    return r
  }

  /** 重置筛选 */
  function resetListFilter() {
    listFilter.value.keyword = ''
    listFilter.value.direction = 'all'
    listFilter.value.status = 'all'
    listFilter.value.creator = ''
  }

  return {
    // state
    allowedDatabases,
    allTables,
    fieldLimit,
    records,
    listFilter,
    // computed
    filteredRecords,
    stats,
    creatorOptions,
    // methods
    tablesOf,
    autoTarget,
    autoDirection,
    getById,
    getLatest,
    datasourceLabel,
    previewTaskId,
    submit,
    retry,
    resetListFilter
  }
})
