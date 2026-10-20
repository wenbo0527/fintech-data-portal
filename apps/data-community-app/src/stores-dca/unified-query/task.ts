/**
 * 统一查询 · 定时任务 store(F22 / F23 / F29-F33 / F34 / F36)
 *
 * 概览指标由任务列表实时派生,列表状态变化看板同步(§7.1 状态一致性)。
 * F30-F33 操作直接更新 list 中对应 record 的 status,
 * F31 重跑用 setTimeout 模拟执行延迟,F34 历史记录写入 history 数组。
 */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { SEED_TASK_HISTORY, SEED_TASKS } from '@/mock/unified-query/tasks'
import type { AdvancedConfig, DataSourceKey, DqcConfig, Dependency, NotifyConfig, ScheduleConfig, TaskExecHistory, TaskRecord, TaskStatus } from '@/mock/unified-query/types'

let taskSeq = SEED_TASKS.length
let histSeq = SEED_TASK_HISTORY.length

function nextTaskId(): string {
  taskSeq += 1
  return `T${2000 + taskSeq}`
}

function nextHistId(): string {
  histSeq += 1
  return `H${String(histSeq).padStart(3, '0')}`
}

function now(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

const DEFAULT_NOTIFY: NotifyConfig = {
  notifyOnSuccess: false,
  notifyOnFailed: true,
  successChannel: 'dingtalk',
  failedChannel: 'dingtalk',
  timeoutMinutes: 0,
  maxConsecutiveFailures: 3
}

const DEFAULT_ADVANCED: AdvancedConfig = {
  retryCount: 3,
  retryInterval: 5,
  skipBacklog: false
}

export const useUqTaskStore = defineStore('uqTask', () => {
  const list = ref<TaskRecord[]>(SEED_TASKS.map(t => ({ ...t })))
  const history = ref<TaskExecHistory[]>(SEED_TASK_HISTORY.map(h => ({ ...h })))
  /** 状态筛选关键字(F23),all 表示不过滤 */
  const statusFilter = ref<TaskStatus | 'all'>('all')
  const keyword = ref('')

  const filtered = computed(() => {
    const kw = keyword.value.trim().toLowerCase()
    return list.value.filter(t => {
      if (statusFilter.value !== 'all' && t.status !== statusFilter.value) return false
      if (kw && !t.name.toLowerCase().includes(kw) && !t.scriptName.toLowerCase().includes(kw)) return false
      return true
    })
  })

  /** 概览看板指标(F22),由列表实时派生保证状态一致性 */
  const stats = computed(() => {
    const count = (s: TaskStatus) => list.value.filter(t => t.status === s).length
    const total = list.value.length
    const success = count('success')
    const rate = total ? Math.round((success / total) * 100) : 0
    return {
      total,
      success,
      failed: count('failed'),
      running: count('running'),
      disabled: count('disabled'),
      successRate: rate
    }
  })

  const getById = (id: string) => list.value.find(t => t.id === id) ?? null

  /** F34:按任务 ID 查执行历史(最近 5 条) */
  function getHistory(taskId: string): TaskExecHistory[] {
    return history.value
      .filter(h => h.taskId === taskId)
      .sort((a, b) => b.runAt.localeCompare(a.runAt))
      .slice(0, 5)
  }

  /** 快速创建定时任务(从 SQL 编辑器发起),默认 disabled 状态 */
  function add(payload: {
    name: string
    datasource: DataSourceKey
    scriptName: string
    schedule: string
  }): TaskRecord {
    const record: TaskRecord = {
      id: nextTaskId(),
      name: payload.name,
      datasource: payload.datasource,
      status: 'disabled',
      schedule: payload.schedule,
      cronExpression: '0 0 2 * * ?',
      lastRun: null,
      nextRun: null,
      scriptName: payload.scriptName,
      notify: { ...DEFAULT_NOTIFY },
      advanced: { ...DEFAULT_ADVANCED }
    }
    list.value.unshift(record)
    return record
  }

  /** F25:创建完整定时任务(含通知/高级设置/调度配置/依赖/DQC),状态为已启用 */
  function createTask(payload: {
    name: string
    datasource: DataSourceKey
    scriptName: string
    schedule: string
    cronExpression: string
    notify?: Partial<NotifyConfig>
    advanced?: Partial<AdvancedConfig>
    scheduleConfig?: ScheduleConfig
    dependencies?: Dependency[]
    dqc?: DqcConfig
    sql?: string
    resourceGroup?: string
    priority?: 'high' | 'medium' | 'low'
  }): TaskRecord {
    const record: TaskRecord = {
      id: nextTaskId(),
      name: payload.name,
      datasource: payload.datasource,
      status: 'success',
      schedule: payload.schedule,
      cronExpression: payload.cronExpression,
      lastRun: now(),
      nextRun: payload.schedule.includes('每天')
        ? '2026-09-04 ' + (payload.schedule.match(/\d{2}:\d{2}/)?.[0] ?? '02:00') + ':00'
        : null,
      scriptName: payload.scriptName,
      notify: { ...DEFAULT_NOTIFY, ...payload.notify },
      advanced: { ...DEFAULT_ADVANCED, ...payload.advanced },
      scheduleConfig: payload.scheduleConfig,
      dependencies: payload.dependencies,
      dqc: payload.dqc,
      sql: payload.sql,
      resourceGroup: payload.resourceGroup,
      priority: payload.priority
    }
    list.value.unshift(record)
    history.value.unshift({
      id: nextHistId(),
      taskId: record.id,
      runAt: now(),
      status: 'success',
      duration: '1.2s',
      rowCount: Math.floor(50 + Math.random() * 200)
    })
    return record
  }

  /** F29/F33:启用已停用任务 */
  function enable(id: string) {
    const t = getById(id)
    if (t && t.status === 'disabled') {
      t.status = 'success'
      t.nextRun = '2026-09-04 ' + (t.schedule.match(/\d{2}:\d{2}/)?.[0] ?? '02:00') + ':00'
    }
  }

  /** F30:停用任务 */
  function disable(id: string) {
    const t = getById(id)
    if (t && (t.status === 'success' || t.status === 'failed')) {
      t.status = 'disabled'
      t.nextRun = null
    }
  }

  /** F32:停止运行中任务,回到已启用 */
  function stop(id: string) {
    const t = getById(id)
    if (t && t.status === 'running') {
      t.status = 'success'
      t.lastRun = now()
    }
  }

  /** F31:重跑任务 → 运行中 → 1-2s 后变成功/失败 */
  function rerun(id: string): Promise<TaskStatus> {
    const t = getById(id)
    if (!t) return Promise.resolve('failed')
    t.status = 'running'
    return new Promise(resolve => {
      setTimeout(() => {
        // 80% 概率成功
        const ok = Math.random() > 0.2
        t.status = ok ? 'success' : 'failed'
        t.lastRun = now()
        history.value.unshift({
          id: nextHistId(),
          taskId: id,
          runAt: now(),
          status: t.status,
          duration: `${(0.8 + Math.random() * 1.2).toFixed(1)}s`,
          rowCount: ok ? Math.floor(50 + Math.random() * 200) : 0,
          errorMsg: ok ? undefined : '执行超时,请检查数据量与 SQL 效率'
        })
        resolve(t.status)
      }, 1000 + Math.random() * 1000)
    })
  }

  /** F25:更新任务配置(支持所有可编辑字段,与 task-create 页面保持一致) */
  function updateConfig(
    id: string,
    patch: Partial<
      Pick<
        TaskRecord,
        | 'name'
        | 'schedule'
        | 'cronExpression'
        | 'notify'
        | 'advanced'
        | 'scheduleConfig'
        | 'dependencies'
        | 'dqc'
        | 'sql'
        | 'resourceGroup'
        | 'priority'
      >
    > & { datasource?: DataSourceKey; scriptName?: string }
  ) {
    const t = getById(id)
    if (t) Object.assign(t, patch)
  }

  return {
    list,
    history,
    filtered,
    stats,
    statusFilter,
    keyword,
    getById,
    getHistory,
    add,
    createTask,
    enable,
    disable,
    stop,
    rerun,
    updateConfig
  }
})
