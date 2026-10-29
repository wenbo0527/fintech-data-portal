/**
 * 变量效果评估 · 跑批任务 store（mock 单例）
 *
 * 文档「跑批定时执行」转译：预置任务与历史实例 + `tick()` 推进进度，
 * 页面用 30s 轮询调用 tick，并在 `document.hidden` 时暂停（组件层负责可见性判断）。
 * 持久化：localStorage `effect.tasks.extra`（新建 / 编辑的任务）
 */

import { formatDateTime, getDataset, toRow, VERDICT_LABELS } from './generator'
import { RULE_FIELD_METAS, effectRuleStore, formatRuleValue } from './rule-store'
import { effectOpinionStore } from './opinion-store'
import { UserContext, ROLE_LABELS } from '../risk-feature/permissions'
import type {
  EffectListState,
  EffectTask,
  EffectTaskDetail,
  EffectVerdict,
  ParamHistory,
  RunResult,
  TaskInstance,
  TaskListParams,
  TaskStatus,
  TrialParams,
  TrialResult
} from './types'

const TASK_KEY = 'effect.tasks.extra'

/** 演示态异常开关（与 effect-store 同口径，供错误空态演示） */
let demoError: 'none' | 'error_network' | 'error_server' = 'none'

/** 四数字卡预设筛选：判定条件与 stats 完全一致，点击卡片后条数必等于卡片数字 */
const PRESET_MATCHERS: Record<string, (t: EffectTask) => boolean> = {
  running: (t) => t.status === 'running',
  failed: (t) => t.lastRunResult === 'failed',
  disabled: (t) => !t.enabled
}

/** 任务类型字典 */
const TASK_TYPES: Record<string, string> = {
  daily_offline_scan: '每日汰换扫描',
  weekly_online_review: '每周推荐复核',
  monthly_report: '月度效果报告',
  adhoc: '临时试算'
}

/** 状态字典 */
const STATUS_LABELS: Record<TaskStatus, string> = {
  running: '执行中',
  success: '成功',
  failed: '失败',
  partial: '部分成功',
  paused: '已暂停',
  pending: '待触发'
}

const RESULT_LABELS: Record<RunResult, string> = {
  success: '成功',
  failed: '失败',
  partial: '部分成功'
}

/** 确定性随机（与生成器同款，用于实例批次派生） */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 时间格式化：复用生成器的本地时区出口，全效果域时间口径一致 */
const fmt = formatDateTime

/** 预置任务定义：类型、频率文案、下次触发时间、最近结果 */
const TASK_SEEDS: {
  id: string
  name: string
  type: string
  scheduleText: string
  nextAt: [number, number]
  lastResult: RunResult
  status: TaskStatus
  owner: string
  variableCount: number
  enabled: boolean
}[] = [
  { id: 'EFF-TASK-0001', name: '全库每日汰换扫描', type: 'daily_offline_scan', scheduleText: '每日 06:30', nextAt: [1, 6], lastResult: 'success', status: 'pending', owner: '小李', variableCount: 412, enabled: true },
  { id: 'EFF-TASK-0002', name: '外数变量推荐复核', type: 'weekly_online_review', scheduleText: '每周一 08:00', nextAt: [2, 8], lastResult: 'partial', status: 'pending', owner: '王数仓', variableCount: 168, enabled: true },
  { id: 'EFF-TASK-0003', name: '贷中行为效果月报', type: 'monthly_report', scheduleText: '每月 1 日 02:00', nextAt: [4, 2], lastResult: 'success', status: 'pending', owner: '陈数据', variableCount: 236, enabled: true },
  { id: 'EFF-TASK-0004', name: '高成本变量专项试算', type: 'adhoc', scheduleText: '手动触发', nextAt: [0, 0], lastResult: 'failed', status: 'failed', owner: '张策略', variableCount: 74, enabled: false },
  { id: 'EFF-TASK-0005', name: '零调用变量清理扫描', type: 'daily_offline_scan', scheduleText: '每日 07:00', nextAt: [1, 7], lastResult: 'success', status: 'running', owner: '培培', variableCount: 412, enabled: true },
  { id: 'EFF-TASK-0006', name: '征信类变量季度复核', type: 'weekly_online_review', scheduleText: '每周三 09:30', nextAt: [3, 9], lastResult: 'partial', status: 'paused', owner: '刘建模', variableCount: 96, enabled: false },
  { id: 'EFF-TASK-0007', name: '新增准入变量首评', type: 'adhoc', scheduleText: '手动触发', nextAt: [0, 0], lastResult: 'success', status: 'pending', owner: '赵外数', variableCount: 32, enabled: true }
]

/**
 * 按任务派生历史实例（确定性）
 * 每个任务 6-10 条批次，倒序排列，含命中数与耗时
 */
function seedInstances(task: EffectTask): TaskInstance[] {
  const rng = mulberry32(task.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0))
  const count = 6 + Math.floor(rng() * 5)
  const list: TaskInstance[] = []
  for (let i = 0; i < count; i++) {
    const daysAgo = i * (task.type === 'monthly_report' ? 30 : task.type === 'weekly_online_review' ? 7 : 1)
    const start = new Date(2026, 9, 28 - daysAgo, 6, 30 + Math.floor(rng() * 20), 0)
    const duration = 120 + Math.floor(rng() * 900)
    const result: RunResult = i === 0 ? task.lastRunResult : rng() > 0.82 ? (rng() > 0.5 ? 'failed' : 'partial') : 'success'
    const hit = Math.round(task.variableCount * (0.12 + rng() * 0.26))
    const offline = Math.round(hit * (0.3 + rng() * 0.3))
    list.push({
      id: `${task.id}-batch-${count - i}`,
      taskId: task.id,
      batchNo: `B${fmt(start).slice(0, 10).replace(/-/g, '')}-${String(count - i).padStart(3, '0')}`,
      startedAt: fmt(start),
      finishedAt: fmt(new Date(start.getTime() + duration * 1000)),
      status: result === 'success' ? 'success' : result === 'failed' ? 'failed' : 'partial',
      statusLabel: STATUS_LABELS[result === 'success' ? 'success' : result === 'failed' ? 'failed' : 'partial'],
      result,
      hitCount: hit,
      offlineCount: offline,
      onlineCount: hit - offline,
      duration,
      operator: i === 0 && task.type === 'adhoc' ? task.owner : '调度系统',
      trigger: task.type === 'adhoc' ? '手动触发' : '定时调度'
    })
  }
  return list.sort((a, b) => b.startedAt.localeCompare(a.startedAt))
}

/** 由预置定义构建任务对象（下次触发时间与最近执行摘要在此派生） */
function buildTask(seed: (typeof TASK_SEEDS)[number]): EffectTask {
  const next = new Date(2026, 9, 28 + seed.nextAt[0], seed.nextAt[1], 0, 0)
  const last = new Date(2026, 9, 27, 6, 30, 0)
  return {
    id: seed.id,
    name: seed.name,
    type: seed.type,
    typeLabel: TASK_TYPES[seed.type],
    status: seed.status,
    statusLabel: STATUS_LABELS[seed.status],
    scheduleText: seed.scheduleText,
    nextTriggerAt: fmt(next),
    lastRunAt: fmt(last),
    lastRunResult: seed.lastResult,
    lastRunResultLabel: RESULT_LABELS[seed.lastResult],
    lastRunSummary:
      seed.lastResult === 'success'
        ? `覆盖 ${seed.variableCount} 个变量，全部产出结论`
        : seed.lastResult === 'partial'
          ? `覆盖 ${seed.variableCount} 个变量，${Math.round(seed.variableCount * 0.08)} 个因上游缺数跳过`
          : '样本表分区未就绪，任务中断',
    owner: seed.owner,
    variableCount: seed.variableCount,
    enabled: seed.enabled,
    progress: seed.status === 'running' ? 46 : 0
  }
}

/** 本地新增 / 编辑后的任务覆盖 */
function readExtraTasks(): EffectTask[] {
  try {
    const raw = localStorage.getItem(TASK_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/** 写回本地任务（新建与编辑都落这里，预置任务不覆盖） */
function writeExtraTasks(list: EffectTask[]) {
  try {
    localStorage.setItem(TASK_KEY, JSON.stringify(list))
  } catch {
    // 演示环境忽略配额异常
  }
}

/** 入参历史：从实例批次派生字段变更记录（确定性） */
/**
 * 单个阈值字段的「变更前取值」派生：保证与当前值不相等，避免演示里出现 1 → 1 的无意义变更
 * @param key 阈值字段名
 * @param current 当前配置值
 * @param rng 确定性随机源
 * @returns 变更前的原始值（数值 / 布尔），由 formatRuleValue 统一格式化
 */
function prevRuleValue(key: string, current: unknown, rng: () => number): unknown {
  if (key === 'pushEnabled') return !current
  const cur = Number(current)
  if (key === 'maxMissingRate') {
    /** 缺失率上限是 0~1 的小数，按百分点偏移，保证 0.01 粒度可辨 */
    const delta = rng() > 0.5 ? 0.03 : -0.04
    return Math.min(0.95, Math.max(0.01, Math.round((cur + delta) * 100) / 100))
  }
  /** 指数与调用量类字段：给一个稳定幅度的偏移 */
  const delta = key === 'minCalls' ? (rng() > 0.5 ? 3 : -1) : rng() > 0.5 ? 8 : -6
  return Math.max(0, cur + delta)
}

function seedParamHistory(task: EffectTask, rule: ReturnType<typeof effectRuleStore.getRule>): ParamHistory[] {
  const rng = mulberry32(task.id.split('').reduce((a, c) => a + c.charCodeAt(0), 7))
  const count = 3 + Math.floor(rng() * 3)
  const fields = ['offlineIndexBelow', 'onlineIndexAbove', 'minCalls', 'maxMissingRate', 'pushEnabled']
  const list: ParamHistory[] = []
  for (let i = 0; i < count; i++) {
    const daysAgo = i * 9 + 2
    const f = fields[Math.floor(rng() * fields.length)]
    const meta = RULE_FIELD_METAS.find((m) => m.key === f)!
    const cur = (rule as any)[f]
    const before = prevRuleValue(f, cur, rng)
    list.push({
      id: `${task.id}-ph-${count - i}`,
      taskId: task.id,
      batchNo: `B${fmt(new Date(2026, 9, 28 - daysAgo)).slice(0, 10).replace(/-/g, '')}-001`,
      createdAt: fmt(new Date(2026, 9, 28 - daysAgo, 10, 15, 0)),
      operator: rng() > 0.5 ? task.owner : '王数仓',
      /** before / after 保留原始值供排序与比对，展示一律用 mock 层格式化好的文本 */
      changes: [
        {
          field: f,
          before: String(before),
          after: String(cur),
          beforeText: formatRuleValue(meta, before),
          afterText: formatRuleValue(meta, cur)
        }
      ]
    })
  }
  return list
}

/** 合并预置与本地任务，本地编辑优先覆盖同 ID */
function allTasks(): EffectTask[] {
  const base = TASK_SEEDS.map(buildTask)
  const extra = readExtraTasks()
  const map = new Map(base.map((t) => [t.id, t]))
  extra.forEach((t) => map.set(t.id, { ...map.get(t.id as string), ...t } as EffectTask))
  return Array.from(map.values())
}

export const effectBatchStore = {
  /** 状态字典（列表筛选下拉数据源） */
  statusLabels: STATUS_LABELS,
  /** 类型字典（列表筛选下拉数据源） */
  typeLabels: TASK_TYPES,

  /**
   * 打开 / 关闭演示态异常（错误空态演示用）
   */
  setDemoError(kind: 'none' | 'error_network' | 'error_server') {
    demoError = kind
  },

  /**
   * 任务列表：关键词 / 类型 / 状态 / 四数卡预设 / 分页全部在本方法内完成
   * 返回的 state 枚举供页面直接渲染六类空态，组件不做判定
   */
  listTasks(p: TaskListParams = {}): {
    total: number
    rows: EffectTask[]
    stats: Record<string, number>
    page: number
    pageSize: number
    state: EffectListState
  } {
    const keyword = (p.keyword || '').trim().toLowerCase()
    const rows0 = allTasks()
    /** 四个数字固定为全库口径，不随筛选变化，保证卡片数字稳定 */
    const stats = {
      total: rows0.length,
      running: rows0.filter((t) => PRESET_MATCHERS.running(t)).length,
      failed: rows0.filter((t) => PRESET_MATCHERS.failed(t)).length,
      paused: rows0.filter((t) => PRESET_MATCHERS.disabled(t)).length
    }

    if (demoError !== 'none') {
      return { total: 0, rows: [], stats, page: 1, pageSize: Number(p.pageSize || 10), state: demoError }
    }

    const hasFilter = !!(keyword || p.type || p.status || (p.preset && p.preset !== 'all'))
    const matcher = p.preset && p.preset !== 'all' ? PRESET_MATCHERS[p.preset] : undefined

    const rows = rows0
      .filter((t) => (matcher ? matcher(t) : true))
      .filter((t) => (p.type ? t.type === p.type : true))
      .filter((t) => (p.status ? t.status === p.status : true))
      .filter((t) => (keyword ? t.name.toLowerCase().includes(keyword) || t.id.toLowerCase().includes(keyword) : true))
      .sort((a, b) => a.nextTriggerAt.localeCompare(b.nextTriggerAt))

    const total = rows.length
    const pageSize = Math.min(50, Math.max(5, Number(p.pageSize || 10)))
    const page = Math.min(
      Math.max(1, Number(p.page || 1)),
      Math.max(1, Math.ceil(total / pageSize) || 1)
    )

    let state: EffectListState = 'none'
    if (total === 0) state = hasFilter ? 'empty_filter' : 'empty_data'

    return {
      total,
      rows: rows.slice((page - 1) * pageSize, page * pageSize),
      stats,
      page,
      pageSize,
      state
    }
  },

  /** 单个任务（列表跳转详情用） */
  getTask(taskId: string): EffectTask | null {
    return allTasks().find((t) => t.id === taskId) || null
  },

  /**
   * 任务详情按 Tab 返回数据：config / instances / params
   * 三个 Tab 的数据分别派生，页面切 Tab 才请求，避免一次拉全量
   */
  taskDetail(taskId: string, tab: string): EffectTaskDetail | null {
    const task = this.getTask(taskId)
    if (!task) return null
    const rule = effectRuleStore.getRule()
    const ds = getDataset()
    if (tab === 'instances') return { task, tab, instances: seedInstances(task) }
    if (tab === 'params') return { task, tab, paramHistory: seedParamHistory(task, rule) }
    /** config：任务变量清单 + 规则阈值 + 命中预览 + 推送对象 */
    const scope = ds.samples.slice(0, Math.min(task.variableCount, 60))
    const marked = effectOpinionStore.markedIds()
    return {
      task,
      tab: 'config',
      variables: scope.map((s) => {
        const verdict = (marked.get(s.variableId) === 'offline' ? 'offline' : s.verdict) as EffectVerdict
        return {
          variableId: s.variableId,
          name: s.name,
          code: s.code,
          verdict,
          verdictLabel: VERDICT_LABELS[verdict],
          callCount: s.callCount,
          synthetic: s.synthetic
        }
      }),
      rule,
      hitPreview: effectRuleStore.previewHit(rule),
      pushTargets: { candidates: effectRuleStore.pushCandidates(), chosen: rule.pushTargets }
    }
  },

  /**
   * 试跑：只按抽样比例取样本，结果不写入正式实例
   * 阈值取传入 patch 与当前规则的合并值，等价于「先 dry-run 预览再提交」
   */
  trialRun(taskId: string, params: TrialParams): TrialResult | null {
    const task = this.getTask(taskId)
    if (!task) return null
    const rule = { ...effectRuleStore.getRule(), ...(params.rule || {}) }
    const ds = getDataset()
    const ratio = Math.min(100, Math.max(1, Number(params.sampleRatio || 10)))
    const limit = Math.min(200, Math.max(5, Number(params.sampleLimit || 50)))
    const take = Math.min(limit, Math.max(1, Math.round((ds.samples.length * ratio) / 100)))
    const marked = effectOpinionStore.markedIds()
    const rows = ds.samples
      .slice(0, take)
      .filter((s) => s.callCount >= rule.minCalls && s.missingRate <= rule.maxMissingRate)
      .map((s) => {
        const row = toRow(s)
        return { ...row, likes: effectOpinionStore.likesOf(s.variableId), comments: effectOpinionStore.commentsOf(s.variableId), marked: marked.has(s.variableId), markType: marked.get(s.variableId) }
      })
    const offlineCount = rows.filter((r) => r.effectIndex < rule.offlineIndexBelow).length
    const onlineCount = rows.filter((r) => r.effectIndex > rule.onlineIndexAbove).length
    return {
      taskId,
      sampledCount: rows.length,
      offlineCount,
      onlineCount,
      rows: rows.slice(0, 20),
      notice: `抽样 ${ratio}%（上限 ${limit} 个）试跑完成，命中 ${offlineCount + onlineCount} 个；试跑结果不写入正式批次，不影响 ${VERDICT_LABELS.offline} / ${VERDICT_LABELS.online} 名单。`
    }
  },

  /**
   * 新建 / 编辑任务：写入 localStorage，返回保存后的任务
   */
  saveTask(patch: Partial<EffectTask> & { name: string }): EffectTask {
    const next: EffectTask = {
      id: patch.id || `EFF-TASK-${String(Date.now()).slice(-6)}`,
      name: patch.name,
      type: patch.type || 'adhoc',
      typeLabel: TASK_TYPES[patch.type || 'adhoc'] || '临时试算',
      status: patch.status || 'pending',
      statusLabel: STATUS_LABELS[patch.status || 'pending'],
      scheduleText: patch.scheduleText || '手动触发',
      nextTriggerAt: patch.nextTriggerAt || fmt(new Date(Date.now() + 86400000)),
      lastRunAt: patch.lastRunAt || '-',
      lastRunResult: patch.lastRunResult || 'success',
      lastRunResultLabel: RESULT_LABELS[patch.lastRunResult || 'success'],
      lastRunSummary: patch.lastRunSummary || '新建任务，尚未执行',
      owner: patch.owner || UserContext.get().name,
      variableCount: patch.variableCount || getDataset().samples.length,
      enabled: patch.enabled !== false,
      progress: patch.progress || 0
    }
    const base = readExtraTasks()
    /** 预置任务与新建任务的修改统一写 extra，按同 ID 覆盖显示 */
    writeExtraTasks([...base.filter((t) => t.id !== next.id), next])
    return next
  },

  /**
   * 轮询推进：执行中的任务进度 +8~18，满 100 转成功
   * 组件层需保证 document.hidden 时不调用本方法
   * @returns 推进后的全量任务（未变化的预置任务不落本地存储）
   */
  tick(): EffectTask[] {
    const rows = allTasks()
    const changed: EffectTask[] = []
    const result = rows.map((t) => {
      if (t.status !== 'running') return t
      const progress = Math.min(100, t.progress + 8 + Math.floor(Math.random() * 11))
      const done = progress >= 100
      const merged: EffectTask = {
        ...t,
        progress,
        status: done ? 'success' : 'running',
        statusLabel: STATUS_LABELS[done ? 'success' : 'running'],
        lastRunResult: done ? 'success' : t.lastRunResult,
        lastRunResultLabel: RESULT_LABELS[done ? 'success' : t.lastRunResult],
        lastRunSummary: done ? `覆盖 ${t.variableCount} 个变量，全部产出结论` : t.lastRunSummary
      }
      changed.push(merged)
      return merged
    })
    if (changed.length) {
      const base = readExtraTasks().filter((t) => !changed.some((c) => c.id === t.id))
      writeExtraTasks([...base, ...changed])
    }
    return result
  },

  /** 清空本地任务改动（演示重置） */
  resetLocal() {
    try {
      localStorage.removeItem(TASK_KEY)
    } catch {
      // ignore
    }
  }
}

export default effectBatchStore
