/**
 * 数据任务服务(一期) · 统一执行实例视图 Store
 *
 * 文档 §模块 D:同步与调度的执行记录合并为同一份列表。
 *
 * 来自两个数据源:
 *   - 调度任务:useUqTaskStore().history(TaskExecHistory[])
 *   - 同步任务:useSyncTaskStore().records(SyncRecord[])
 *
 * 由于 store 之间不直接相互 import,这里做一个轻量 adapter 把两份数据
 * 投影成同一种 TaskInstance 形状。主表用统一列展示,类型专属字段塞到
 * extra(扩展信息)里。
 *
 * 兼容:
 *   - 类型筛选(全部 / 同步 / 调度)(R02)
 *   - 状态筛选(全部 / 排队 / 运行中 / 成功 / 失败 / 已取消)
 *   - 时间范围筛选(E12 默认近 30 天,可扩展)
 */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useSyncTaskStore } from '@/stores-dca/management/sync-task'
import { useUqTaskStore } from '@/stores-dca/unified-query/task'

export type TaskInstanceTrigger = 'manual' | 'cron' | 'dependency' | 'external'

export type TaskInstanceStatus = 'queued' | 'running' | 'success' | 'failed' | 'cancelled'

/** 类型 R25:文档要求两端语义统一,本 store 派生所有上报字段 */
export interface TaskInstance {
  /** 实例 ID,跨任务唯一 */
  id: string
  /** 任务 ID(调度任务或同步任务在其自有 store 里的 id) */
  taskId: string
  /** 任务名 */
  taskName: string
  /** 类型(同步/调度) */
  taskType: 'sync' | 'schedule'
  /** 触发方式 */
  trigger: TaskInstanceTrigger
  /** 实例状态 */
  status: TaskInstanceStatus
  /** 发起人(displayName) */
  creator: string
  /** 开始时间 YYYY-MM-DD HH:mm:ss */
  startedAt: string
  /** 结束时间(运行中则为空) */
  finishedAt: string
  /** 耗时 ms */
  costMs: number
  /** 失败原因(failure reason,仅失败时有) */
  errorMessage?: string
  /** 类型专属的扩展信息(R27) */
  extra?: {
    /** 同步实例 */
    sourceTable?: string
    targetTable?: string
    rowsCopied?: number
    direction?: string
    /** 调度实例 */
    durationLabel?: string
    rowCount?: number
  }
}

export interface TaskInstanceFilter {
  keyword: string
  type: 'all' | 'sync' | 'schedule'
  status: 'all' | TaskInstanceStatus
  trigger: 'all' | TaskInstanceTrigger
  /** 时间范围(E12 默认近 30 天) */
  days: number
}

const DEFAULT_FILTER: TaskInstanceFilter = {
  keyword: '',
  type: 'all',
  status: 'all',
  trigger: 'all',
  days: 30
}

/** 状态文本+R27 颜色配置 */
export const INSTANCE_STATUS_META: Record<TaskInstanceStatus, { text: string; color: string }> = {
  queued: { text: '排队', color: 'gray' },
  running: { text: '运行中', color: 'arcoblue' },
  success: { text: '成功', color: 'green' },
  failed: { text: '失败', color: 'red' },
  cancelled: { text: '已取消', color: 'orange' }
}

export const INSTANCE_TRIGGER_META: Record<TaskInstanceTrigger, { text: string; color: string }> = {
  manual: { text: '手动', color: 'arcoblue' },
  cron: { text: '定时', color: 'purple' },
  dependency: { text: '依赖上游', color: 'cyan' },
  external: { text: '外部调用', color: 'magenta' }
}

/** 把字符串时长(label,如 '1.2s' / '0.8s')解析为毫秒;解析失败返回 0 */
function parseCostMs(label: string | undefined): number {
  if (!label) return 0
  const m = label.match(/^([\d.]+)\s*(ms|s|m)$/)
  if (!m) return 0
  const v = parseFloat(m[1])
  switch (m[2]) {
    case 'ms':
      return v
    case 's':
      return v * 1000
    case 'm':
      return v * 60_000
    default:
      return 0
  }
}

/** 把 schedule 字段值映射到 trigger:本期调度全部默认为 cron,手动/外部 是后续 */
function scheduleToTrigger(schedule: string): TaskInstanceTrigger {
  if (!schedule) return 'manual'
  if (/每天|每周|每月|\d{1,2}:\d{2}/.test(schedule)) return 'cron'
  return 'manual'
}

export const useTaskInstanceStore = defineStore('taskInstance', () => {
  const filter = ref<TaskInstanceFilter>({ ...DEFAULT_FILTER })

  /** 全量(派生):从两个 source store 中拼出统一实例列表 */
  const all = computed<TaskInstance[]>(() => {
    const syncStore = useSyncTaskStore()
    const uqStore = useUqTaskStore()

    const out: TaskInstance[] = []

    // 同步实例
    for (const r of syncStore.records) {
      const direction = r.direction === 'doris-to-hive' ? 'Doris → Hive' : 'Hive → Doris'
      out.push({
        id: r.id,
        taskId: r.id,
        taskName: `同步·${r.sourceTable}`,
        taskType: 'sync',
        trigger: 'manual',
        status: r.status === 'timeout' ? 'failed' : (r.status as TaskInstanceStatus),
        creator: r.creator,
        startedAt: r.startedAt,
        finishedAt: r.finishedAt,
        costMs: r.costMs,
        errorMessage: r.errorMessage,
        extra: {
          sourceTable: r.sourceDatabase,
          targetTable: r.targetDatabase,
          rowsCopied: r.rowsCopied,
          direction
        }
      })
    }

    // 调度实例(Timer 最近 30 天内,F34)
    for (const h of uqStore.history) {
      const t = uqStore.list.find(x => x.id === h.taskId)
      out.push({
        id: h.id,
        taskId: h.taskId,
        taskName: t?.name ?? h.taskId,
        taskType: 'schedule',
        trigger: scheduleToTrigger(t?.schedule ?? ''),
        status: h.status === 'success' ? 'success' : h.status === 'failed' ? 'failed' : (h.status as TaskInstanceStatus),
        creator: '王运营',
        startedAt: h.runAt,
        finishedAt: h.runAt,
        costMs: parseCostMs(h.duration),
        errorMessage: h.errorMsg,
        extra: {
          durationLabel: h.duration,
          rowCount: h.rowCount
        }
      })
    }
    return out
  })

  const filtered = computed(() => {
    const f = filter.value
    const kw = f.keyword.trim().toLowerCase()
    const nowMs = Date.now()
    const daysMs = (f.days || 365) * 86400_000
    return all.value.filter(i => {
      if (f.type !== 'all' && i.taskType !== f.type) return false
      if (f.status !== 'all' && i.status !== f.status) return false
      if (f.trigger !== 'all' && i.trigger !== f.trigger) return false
      if (kw) {
        const hay = [i.id, i.taskName, i.creator, i.extra?.sourceTable, i.extra?.targetTable, i.errorMessage ?? '']
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!hay.includes(kw)) return false
      }
      // 时间范围
      const startMs = Date.parse(i.startedAt.replace(' ', 'T'))
      if (!Number.isNaN(startMs) && nowMs - startMs > daysMs) return false
      return true
    })
  })

  /** 概览统计 */
  const stats = computed(() => {
    const list = filtered.value
    return {
      total: list.length,
      success: list.filter(i => i.status === 'success').length,
      failed: list.filter(i => i.status === 'failed').length,
      running: list.filter(i => i.status === 'running').length
    }
  })

  function resetFilter() {
    filter.value = { ...DEFAULT_FILTER }
  }

  return {
    filter,
    all,
    filtered,
    stats,
    resetFilter
  }
})
