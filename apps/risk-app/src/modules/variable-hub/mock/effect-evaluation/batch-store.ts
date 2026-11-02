/**
 * 变量效果评估 · 跑批任务 store（mock 单例）
 *
 * 文档「跑批定时执行」转译：预置任务与历史实例 + `tick()` 推进进度，
 * 页面用 30s 轮询调用 tick，并在 `document.hidden` 时暂停（组件层负责可见性判断）。
 * 持久化：localStorage `effect.tasks.extra`（新建 / 编辑的任务）、`effect.instances.extra`（手动触发与重跑产生的批次）
 *
 * 实例口径：每个批次的命中数由其「开始时刻生效的阈值快照」扫描得出，
 * 与实例详情的清单/日志同源；阈值后续再改也不回溯历史批次（与评估域脚本版本快照同语义）。
 */

import { formatDateTime, getDataset, toRow, VERDICT_LABELS } from './generator'
import { RULE_FIELD_METAS, effectRuleStore, formatRuleValue } from './rule-store'
import { effectOpinionStore } from './opinion-store'
import { fieldLabel, issueSummary, validateRunOutput, type ContractIssue } from '../task-center/io-contract'
import { UserContext, ROLE_LABELS } from '../risk-feature/permissions'
import type {
  EffectListState,
  EffectTask,
  EffectTaskDetail,
  EffectVerdict,
  ParamHistory,
  RunResult,
  RuleConfig,
  TaskInstance,
  TaskListParams,
  TaskStatus,
  TrialParams,
  TrialResult
} from './types'

const TASK_KEY = 'effect.tasks.extra'
const INSTANCE_KEY = 'effect.instances.extra'

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

/** 预置任务定义：类型、频率文案、下次触发时间、最近结果、输入来源 */
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
  /**
   * 预置的上游引用（打通评估产出的演示样本）
   * upstreamCount 必须与被引用评估任务的 target 数同口径，改评估种子时要一起改
   */
  inputRef?: EffectTask['inputRef']
}[] = [
  { id: 'EFF-TASK-0001', name: '全库每日汰换扫描', type: 'daily_offline_scan', scheduleText: '每日 06:30', nextAt: [1, 6], lastResult: 'success', status: 'pending', owner: '小李', variableCount: 412, enabled: true },
  { id: 'EFF-TASK-0002', name: '外数变量推荐复核', type: 'weekly_online_review', scheduleText: '每周一 08:00', nextAt: [2, 8], lastResult: 'partial', status: 'pending', owner: '王数仓', variableCount: 168, enabled: true },
  { id: 'EFF-TASK-0003', name: '贷中行为效果月报', type: 'monthly_report', scheduleText: '每月 1 日 02:00', nextAt: [4, 2], lastResult: 'success', status: 'pending', owner: '陈数据', variableCount: 236, enabled: true },
  { id: 'EFF-TASK-0004', name: '高成本变量专项试算', type: 'adhoc', scheduleText: '手动触发', nextAt: [0, 0], lastResult: 'failed', status: 'failed', owner: '张策略', variableCount: 74, enabled: false },
  { id: 'EFF-TASK-0005', name: '零调用变量清理扫描', type: 'daily_offline_scan', scheduleText: '每日 07:00', nextAt: [1, 7], lastResult: 'success', status: 'running', owner: '培培', variableCount: 412, enabled: true },
  { id: 'EFF-TASK-0006', name: '征信类变量季度复核', type: 'weekly_online_review', scheduleText: '每周三 09:30', nextAt: [3, 9], lastResult: 'partial', status: 'paused', owner: '刘建模', variableCount: 96, enabled: false },
  { id: 'EFF-TASK-0007', name: '新增准入变量首评', type: 'adhoc', scheduleText: '手动触发', nextAt: [0, 0], lastResult: 'success', status: 'pending', owner: '赵外数', variableCount: 32, enabled: true, inputRef: { upstreamTaskId: 'EVAL-2026-001', upstreamTaskName: '外数准入特征复评', upstreamField: 'quality', upstreamCount: 2 } }
]

/** 实例 id 里的序号（`${taskId}-batch-N`），用于排轮次 */
function seqOf(instanceId: string, taskId: string): number {
  const tail = instanceId.startsWith(`${taskId}-batch-`)
    ? instanceId.slice(`${taskId}-batch-`.length)
    : instanceId.split('-batch-').pop() || ''
  return Number(tail) || 0
}

/** 'YYYY-MM-DD HH:mm:ss' → Date（本地时区，与 formatDateTime 同口径，不用 toISOString） */
function parseTime(text: string): Date {
  if (!text) {
    return new Date()
  }
  const [datePart, timePart = '00:00:00'] = text.split(' ')
  const [y, m, d] = datePart.split('-').map(Number)
  const [hh, mm, ss] = timePart.split(':').map(Number)
  return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, ss || 0)
}

/** 回退变更前的原始值：入参历史只存 string，按字段类型还原 */
function restoreValue(field: string, raw: string): unknown {
  if (field === 'pushEnabled') {
    return raw === 'true'
  }
  return Number(raw)
}

/** 任务的阈值变更历史：用户保存的任务级变更在前，预置派生历史在后 */
function historyOf(task: EffectTask): ParamHistory[] {
  return [...(task.ruleHistory || []), ...seedParamHistory(task, taskRule(task))]
}

/**
 * 任务当前生效的判定规则：任务级配置覆盖全局默认模板
 * 没配过任务级的历史任务继续跟全局，避免一批预置数据忽然改口径
 */
export function taskRule(task: EffectTask): RuleConfig {
  return { ...effectRuleStore.getRule(), ...(task.rule || {}) }
}

/**
 * 批次时刻生效的阈值快照：从当前配置逐条回退该批次之后的变更
 * @returns rule 快照；version 第几版口径（以入参历史变更次数计，初始配置为 v1）
 */
function ruleAt(task: EffectTask, atTime: string, history: ParamHistory[]): { rule: RuleConfig; version: number } {
  const rule = taskRule(task)
  const at = parseTime(atTime).getTime()
  const later = history
    .filter((h) => parseTime(h.createdAt).getTime() > at)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  later.forEach((h) => {
    h.changes.forEach((c) => {
      (rule as any)[c.field] = restoreValue(c.field, c.before)
    })
  })
  /** 该批次之前已生效的变更数 = 总变更 - 之后发生的变更 */
  return { rule, version: Math.max(1, history.length - later.length + 1) }
}

/** 两份规则之间的差异字段（任务级变更记录与「口径已调整」提示共用） */
function changedRuleFields(before: RuleConfig, after: RuleConfig) {
  return RULE_FIELD_METAS.filter((m) => {
    const a = before[m.key]
    const b = after[m.key]
    if (Array.isArray(a) || Array.isArray(b)) {
      return JSON.stringify([...((a as string[]) || [])].sort()) !== JSON.stringify([...((b as string[]) || [])].sort())
    }
    if (m.kind === 'boolean') {
      return Boolean(a) !== Boolean(b)
    }
    return Number(a) !== Number(b)
  })
}

/** 快照与任务当前配置的差异字段数（详情页提示「阈值已调整」用） */
function ruleDiffCount(task: EffectTask, snapshot: RuleConfig): number {
  return changedRuleFields(taskRule(task), snapshot).length
}

/**
 * 本次扫描的变量范围：
 * 引用了上游评估任务的产出就收窄到上游实际覆盖的变量数（打通后「输入决定范围」的真实体现，
 * 不收窄就会出现「上游只评了 12 个变量、下游却产出 412 个名单」的假结论）；
 * 没引用则沿用任务自身的全库口径
 */
function scopeOf(task: EffectTask): number {
  const ref = task.inputRef
  if (ref?.upstreamCount) {
    return Math.max(1, Math.min(task.variableCount, ref.upstreamCount))
  }
  return task.variableCount
}

/**
 * 按阈值快照扫描任务覆盖范围，得到命中分档
 * 抽样命中率按任务覆盖量放大到全库口径，保证列表数字与详情清单同源不冲突
 */
function hitOf(task: EffectTask, rule: RuleConfig) {
  const ds = getDataset()
  const scopeCount = scopeOf(task)
  const scope = ds.samples.slice(0, Math.min(scopeCount, ds.samples.length))
  const enough = scope.filter((s) => s.callCount >= rule.minCalls)
  const excludedByCalls = scope.length - enough.length
  const judged = enough.filter((s) => s.missingRate <= rule.maxMissingRate)
  const excludedByMissing = enough.length - judged.length
  const offline = judged.filter((s) => s.effectIndex < rule.offlineIndexBelow).length
  const online = judged.filter((s) => s.effectIndex > rule.onlineIndexAbove).length
  const scale = scopeCount / Math.max(1, scope.length)
  const round = (n: number) => Math.round(n * scale)
  return {
    scope: scopeCount,
    judged: round(judged.length),
    excludedByCalls: round(excludedByCalls),
    excludedByMissing: round(excludedByMissing),
    offlineCount: round(offline),
    onlineCount: round(online),
    hitCount: round(offline + online)
  }
}

/** 命中清单行（详情与执行记录共用） */
export interface EffectHitRow {
  variableId: string
  name: string
  code: string
  effectIndex: number
  callCount: number
  missingRate: number
  verdict: EffectVerdict
  verdictLabel: string
  /** 判定理由：写明与哪条阈值比较，便于演示口径可追溯 */
  reason: string
}

/** 按快照阈值给抽样变量逐条定结论，汰换 / 推荐各取头部若干条作清单 */
function rowsOf(task: EffectTask, rule: RuleConfig, limit = 20): { offline: EffectHitRow[]; online: EffectHitRow[] } {
  const ds = getDataset()
  const scope = ds.samples.slice(0, Math.min(scopeOf(task), ds.samples.length))
  const judged = scope.filter((s) => s.callCount >= rule.minCalls && s.missingRate <= rule.maxMissingRate)
  const pick = (list: typeof judged, verdict: EffectVerdict): EffectHitRow[] =>
    list
      .slice(0, limit)
      .map((s) => ({
        variableId: s.variableId,
        name: s.name,
        code: s.code,
        effectIndex: s.effectIndex,
        callCount: s.callCount,
        missingRate: s.missingRate,
        verdict,
        verdictLabel: VERDICT_LABELS[verdict],
        reason:
          verdict === 'offline'
            ? `综合效果指数 ${s.effectIndex} 低于汰换线 ${rule.offlineIndexBelow}`
            : `综合效果指数 ${s.effectIndex} 高于推荐线 ${rule.onlineIndexAbove}`
      }))
  const offline = judged.filter((s) => s.effectIndex < rule.offlineIndexBelow).sort((a, b) => a.effectIndex - b.effectIndex)
  const online = judged.filter((s) => s.effectIndex > rule.onlineIndexAbove).sort((a, b) => b.effectIndex - a.effectIndex)
  return { offline: pick(offline, 'offline'), online: pick(online, 'online') }
}

/** 推送对象 id → 名称 */
function pushNamesOf(ids: string[]): string[] {
  const candidates = effectRuleStore.pushCandidates()
  return ids.map((id) => candidates.find((c) => c.id === id)?.name || id)
}

/**
 * 实例执行日志（确定性派生）
 * 时间戳在批次开始/结束区间内均匀铺开，避免出现「日志时间越界」
 */
function instanceLogs(
  task: EffectTask,
  inst: TaskInstance,
  rule: RuleConfig,
  ruleVersion: number,
  counts: ReturnType<typeof hitOf>
): { time: string; level: 'info' | 'warn' | 'error'; message: string }[] {
  const start = parseTime(inst.startedAt)
  const endMs = inst.finishedAt ? parseTime(inst.finishedAt).getTime() : start.getTime() + inst.duration * 1000
  const step = (ratio: number) => fmt(new Date(start.getTime() + (endMs - start.getTime()) * ratio))
  const metas = RULE_FIELD_METAS
  const textOf = (key: string) => formatRuleValue(metas.find((m) => m.key === key)!, (rule as any)[key])
  const logs: { time: string; level: 'info' | 'warn' | 'error'; message: string }[] = [
    { time: inst.startedAt, level: 'info', message: `触发方式：${inst.trigger}，启动「${task.name}」效果扫描` },
    { time: step(0.12), level: 'info', message: `读取效果域样本 ${counts.scope} 个变量，锁定阈值快照 v${ruleVersion}` },
    {
      time: step(0.24),
      level: 'info',
      message: `判定口径：汰换线 效果指数 < ${textOf('offlineIndexBelow')}，推荐线 > ${textOf('onlineIndexAbove')}，最小月调用量 ${textOf('minCalls')}，缺失率上限 ${textOf('maxMissingRate')}`
    },
    {
      time: step(0.46),
      level: 'info',
      message: `剔除不判定变量 ${counts.excludedByCalls + counts.excludedByMissing} 个（调用量不足 ${counts.excludedByCalls}，缺失率超限 ${counts.excludedByMissing}）`
    }
  ]
  if (task.inputRef) {
    /** 血缘留痕：输入来源不记日志，历史批次就无法回看当时用的是哪一份上游产出 */
    logs.splice(1, 0, {
      time: step(0.06),
      level: 'info',
      message: `输入来源：引用评估任务「${task.inputRef.upstreamTaskName || task.inputRef.upstreamTaskId}」的「${fieldLabel(task.inputRef.upstreamField)}」产出，本次只扫上游覆盖到的 ${counts.scope} 个变量`
    })
  }
  if (inst.status === 'failed') {
    logs.push(
      { time: step(0.7), level: 'error', message: '样本表分区未就绪，名单中断，本批次不产出汰换 / 推荐名单' },
      { time: inst.finishedAt || step(1), level: 'error', message: `批次 ${inst.batchNo} 失败，耗时 ${inst.duration}s` }
    )
    return logs
  }
  logs.push({
    time: step(0.72),
    level: 'info',
    message: `判定完成：覆盖 ${counts.judged} 个，命中 ${counts.hitCount} 个（汰换 ${counts.offlineCount} / 推荐 ${counts.onlineCount}）`
  })
  if (inst.status === 'partial') {
    logs.push({ time: step(0.82), level: 'warn', message: `${counts.excludedByMissing} 个变量因上游缺数只出观察结论，建议先对齐产出后再复核名单` })
  }
  /** 契约结果进日志：历史批次能不能回写下游，在这里留下可检索的一句话 */
  if (inst.contractIssues?.length) {
    logs.push({ time: step(0.86), level: 'warn', message: `产出校验未齐备：${issueSummary(inst.contractIssues)}` })
  } else {
    logs.push({ time: step(0.86), level: 'info', message: '产出校验：判定六数与口径快照都已落档，必产字段齐备' })
  }
  logs.push(
    rule.pushEnabled
      ? { time: step(0.92), level: 'info', message: `名单已推送：${pushNamesOf(rule.pushTargets).join('、') || '未配置推送对象'}` }
      : { time: step(0.92), level: 'info', message: '名单自动推送已关闭，本批次仅生成名单不通知协作对象' },
    { time: inst.finishedAt || step(1), level: 'info', message: `批次 ${inst.batchNo} 完成，耗时 ${inst.duration}s` }
  )
  return logs
}

/** 本地新增批次（手动触发 / 重跑），预置批次仍由派生得到不落地 */
function readExtraInstances(): TaskInstance[] {
  try {
    const raw = localStorage.getItem(INSTANCE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeExtraInstances(list: TaskInstance[]) {
  try {
    localStorage.setItem(INSTANCE_KEY, JSON.stringify(list))
  } catch {
    // 演示环境忽略配额异常
  }
}

/** 批次结果 → 实例状态（partial 统一归为部分完成） */
function instanceStatus(result: RunResult): 'success' | 'failed' | 'partial' {
  if (result === 'success') {
    return 'success'
  }
  if (result === 'failed') {
    return 'failed'
  }
  return 'partial'
}

/**
 * 执行后产出校验（契约第三段）：把本轮真实产出比对效果契约
 * 名单为空不算缺（0 命中是合法结论），只有整个字段没落档才判不符；
 * 已失败的批次不比，本来就没产出，报了只是噪声
 */
function runOutputIssues(
  task: EffectTask,
  rule: RuleConfig,
  counts: ReturnType<typeof hitOf>,
  finished: boolean
): ContractIssue[] {
  if (!finished) {
    return []
  }
  const rows = rowsOf(task, rule)
  return validateRunOutput(`effect.${task.type}`, {
    judgedCounts: [counts.scope, counts.judged, counts.excludedByCalls, counts.excludedByMissing, counts.offlineCount, counts.onlineCount],
    ruleSnapshot: rule,
    offlineList: rows.offline,
    onlineList: rows.online
  }).issues
}

/**
 * 按任务派生历史实例（确定性）
 * 每个任务 6-10 条批次，倒序排列，含命中数与耗时
 */
function seedInstances(task: EffectTask): TaskInstance[] {
  const rng = mulberry32(task.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0))
  const count = 6 + Math.floor(rng() * 5)
  const history = historyOf(task)
  const list: TaskInstance[] = []
  for (let i = 0; i < count; i++) {
    const daysAgo = i * (task.type === 'monthly_report' ? 30 : task.type === 'weekly_online_review' ? 7 : 1)
    const start = new Date(2026, 9, 28 - daysAgo, 6, 30 + Math.floor(rng() * 20), 0)
    const duration = 120 + Math.floor(rng() * 900)
    const result: RunResult = i === 0 ? task.lastRunResult : rng() > 0.82 ? (rng() > 0.5 ? 'failed' : 'partial') : 'success'
    const startedAt = fmt(start)
    /** 命中数由该批次生效的阈值快照决定，与实例详情清单、日志同一口径 */
    const snapshot = ruleAt(task, startedAt, history)
    const counts = hitOf(task, snapshot.rule)
    const final: RunResult = result
    const status = instanceStatus(final)
    const offline = final === 'failed' ? 0 : counts.offlineCount
    const online = final === 'failed' ? 0 : counts.onlineCount
    list.push({
      id: `${task.id}-batch-${count - i}`,
      taskId: task.id,
      batchNo: `B${fmt(start).slice(0, 10).replace(/-/g, '')}-${String(count - i).padStart(3, '0')}`,
      startedAt,
      finishedAt: fmt(new Date(start.getTime() + duration * 1000)),
      status,
      statusLabel: STATUS_LABELS[status],
      result: final,
      hitCount: final === 'failed' ? 0 : counts.hitCount,
      offlineCount: offline,
      onlineCount: online,
      duration,
      operator: i === 0 && task.type === 'adhoc' ? task.owner : '调度系统',
      trigger: task.type === 'adhoc' ? '手动触发' : '定时调度',
      /** 历史批次同样过产出校验，执行记录里的契约状态不是只给新批次用的 */
      contractIssues: runOutputIssues(task, snapshot.rule, counts, final !== 'failed')
    })
  }
  return list.sort((a, b) => b.startedAt.localeCompare(a.startedAt))
}

/** 由预置定义构建任务对象（下次触发时间与最近执行摘要在此派生） */
function buildTask(seed: (typeof TASK_SEEDS)[number]): EffectTask {
  const next = new Date(2026, 9, 28 + seed.nextAt[0], seed.nextAt[1], 0, 0)
  const last = new Date(2026, 9, 27, 6, 30, 0)
  /** 引用了上游产出时，实际扫的是上游那批对象，摘要数字跟着收窄 */
  const scope = seed.inputRef?.upstreamCount ?? seed.variableCount
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
        ? `覆盖 ${scope} 个变量，全部产出结论`
        : seed.lastResult === 'partial'
          ? `覆盖 ${scope} 个变量，${Math.max(1, Math.round(scope * 0.08))} 个因上游缺数跳过`
          : '样本表分区未就绪，任务中断',
    owner: seed.owner,
    variableCount: seed.variableCount,
    enabled: seed.enabled,
    /** 预置血缘：让「效果任务引用评估产出」在演示数据里就能看到，不必新建 */
    inputRef: seed.inputRef,
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

/** 写回单个任务的改动：保留其它任务的既有本地改动，预置任务也能被覆盖显示 */
function persistTask(task: EffectTask) {
  const base = readExtraTasks().filter((t) => t.id !== task.id)
  writeExtraTasks([...base, task])
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

/** 新建任务的默认骨架：saveTask 逐层合并时作为最底一层，调用方只传改动项即可 */
function taskDraft(): EffectTask {
  return {
    id: '',
    name: '',
    type: 'adhoc',
    typeLabel: TASK_TYPES.adhoc,
    status: 'pending',
    statusLabel: STATUS_LABELS.pending,
    scheduleText: '手动触发',
    nextTriggerAt: fmt(new Date(Date.now() + 86400000)),
    lastRunAt: '-',
    lastRunResult: 'success',
    lastRunResultLabel: RESULT_LABELS.success,
    lastRunSummary: '新建任务，尚未执行',
    owner: UserContext.get().name,
    variableCount: getDataset().samples.length,
    enabled: true,
    progress: 0
  }
}

/**
 * 按层合并任务字段：后层覆盖前层，undefined 算「没传」不参与覆盖
 * 目的是让 saveTask 支持局部更新，同时保住已保存的任务级 rule / ruleHistory
 */
function mergeTaskParts(parts: (Partial<EffectTask> | null | undefined)[]): EffectTask {
  const out: Record<string, unknown> = {}
  parts.forEach((part) => {
    if (!part) {
      return
    }
    Object.keys(part).forEach((key) => {
      const value = (part as Record<string, unknown>)[key]
      if (value !== undefined) {
        out[key] = value
      }
    })
  })
  /** out 的键全部取自 EffectTask 字段（源头是 taskDraft 与 Partial<EffectTask>），运行时结构一致 */
  return out as unknown as EffectTask
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

  /** 全量任务（统一任务列表聚合层用，不参与筛选与分页） */
  listAll(): EffectTask[] {
    return allTasks()
  },

  /** 单个任务（列表跳转详情用） */
  getTask(taskId: string): EffectTask | null {
    return allTasks().find((t) => t.id === taskId) || null
  },

  /**
   * 执行前预检要的输入侧事实：本次会扫多少变量、其中多少会被阈值剔掉不判定
   * 数字与 hitOf 同一口径算出来，页面不自己拼算法（引用上游后范围会变窄，这里跟着 scopeOf 走）
   */
  preflightScope(taskId: string): { targetCount: number; usableRate?: number } | null {
    const task = this.getTask(taskId)
    if (!task) {
      return null
    }
    const counts = hitOf(task, taskRule(task))
    const excluded = counts.excludedByCalls + counts.excludedByMissing
    return {
      targetCount: counts.scope,
      usableRate: counts.scope ? (counts.scope - excluded) / counts.scope : undefined
    }
  },

  /**
   * 任务详情按 Tab 返回数据：config / instances / params
   * 三个 Tab 的数据分别派生，页面切 Tab 才请求，避免一次拉全量
   */
  taskDetail(taskId: string, tab: string): EffectTaskDetail | null {
    const task = this.getTask(taskId)
    if (!task) return null
    const rule = taskRule(task)
    const ds = getDataset()
    if (tab === 'instances') {
      return { task, tab, instances: this.instancesOf(taskId) }
    }
    if (tab === 'params') {
      return { task, tab, paramHistory: historyOf(task) }
    }
    /** config：任务变量清单 + 规则阈值 + 命中预览 + 推送对象 */
    const scope = ds.samples.slice(0, Math.min(scopeOf(task), 60))
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
    const rule = { ...taskRule(task), ...(params.rule || {}) }
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
   * 逐层合并「新建默认值 → 已有任务 → 本次改动」，调用方不必再回传全部字段，
   * 也不会因为漏传 rule / ruleHistory 把已保存的任务级口径清掉
   */
  saveTask(patch: Partial<EffectTask> & { name: string }): EffectTask {
    const existed = patch.id ? allTasks().find((t) => t.id === patch.id) || null : null
    const merged = mergeTaskParts([taskDraft(), existed, patch])
    if (!merged.id) {
      merged.id = `EFF-TASK-${String(Date.now()).slice(-6)}`
    }
    /** 派生文案跟随原始值刷新：字典缺项时保留原值，避免未知类型显示空白 */
    merged.typeLabel = TASK_TYPES[merged.type] || merged.typeLabel
    merged.statusLabel = STATUS_LABELS[merged.status] || merged.statusLabel
    merged.lastRunResultLabel = RESULT_LABELS[merged.lastRunResult] || merged.lastRunResultLabel
    persistTask(merged)
    return merged
  },

  /**
   * 保存任务级判定配置（阈值 + 推送对象）：只写本任务，不动全局默认模板
   * 有字段变化时追加一条任务级变更历史，详情「入参历史」与批次快照都读它
   */
  saveTaskRule(taskId: string, patch: Partial<RuleConfig>): EffectTask | null {
    const task = this.getTask(taskId)
    if (!task) {
      return null
    }
    const before = taskRule(task)
    const operator = UserContext.get().name
    const updatedAt = fmt(new Date())
    const next: RuleConfig = {
      ...before,
      ...patch,
      pushTargets: [...(patch.pushTargets || before.pushTargets)],
      updatedAt,
      updatedBy: operator
    }
    const changes = changedRuleFields(before, next).map((m) => ({
      field: m.key as string,
      before: String((before as any)[m.key]),
      after: String((next as any)[m.key]),
      beforeText: formatRuleValue(m, (before as any)[m.key]),
      afterText: formatRuleValue(m, (next as any)[m.key])
    }))
    const merged: EffectTask = { ...task, rule: next }
    if (changes.length) {
      const record: ParamHistory = {
        id: `${taskId}-ph-live-${Date.now()}`,
        taskId,
        batchNo: '手动调整',
        createdAt: updatedAt,
        operator,
        changes
      }
      merged.ruleHistory = [record, ...(task.ruleHistory || [])]
    }
    persistTask(merged)
    return merged
  },

  /**
   * 任务当前生效的判定配置：同时给出是否已与全局模板脱钩
   */
  getTaskRule(taskId: string): { rule: RuleConfig; inherited: boolean; history: ParamHistory[] } | null {
    const task = this.getTask(taskId)
    if (!task) {
      return null
    }
    return { rule: taskRule(task), inherited: !task.rule, history: historyOf(task) }
  },

  /** 全局默认模板（新建任务表单的预填值，不随任务级保存而变化） */
  defaultTaskRule(): RuleConfig {
    return effectRuleStore.getRule()
  },

  /**
   * 任务级草稿与已保存配置的差异：表单「N 项未保存」提示用
   * 字段清单与比对规则仍归 rule-store 的元数据，页面不自己比大小
   */
  diffTaskRule(taskId: string | undefined, draft: Partial<RuleConfig>) {
    const task = taskId ? this.getTask(taskId) : null
    const base = task ? taskRule(task) : effectRuleStore.getRule()
    const changed = changedRuleFields(base, { ...base, ...draft })
    return {
      dirty: changed.length > 0,
      changedCount: changed.length,
      changedLabels: changed.map((m) => m.label)
    }
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
      if (done) {
        /** 收口到批次：回写命中数与最近执行结果，避免实例永远停在 running */
        const running = this.instancesOf(t.id).find((i) => i.status === 'running')
        if (running) {
          this.finishRun(running.id, { status: 'success' })
        } else {
          /** 老数据可能只有任务状态没有批次，补登一条，保证“执行成功必有记录” */
          this.runNow(t.id, { trigger: 'manual', status: 'success' })
        }
        return this.getTask(t.id) || t
      }
      const merged: EffectTask = {
        ...t,
        progress,
        status: 'running',
        statusLabel: STATUS_LABELS.running
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

  /** 清空本地任务与批次改动（演示重置） */
  resetLocal() {
    try {
      localStorage.removeItem(TASK_KEY)
      localStorage.removeItem(INSTANCE_KEY)
    } catch {
      // ignore
    }
  },

  // ============ 执行实例（与评估域同口径，供全域执行记录聚合） ============
  /** 一个任务的全部批次：本地手动/重跑批次优先，同 id 去重，按开始时间倒序 */
  instancesOf(taskId: string): TaskInstance[] {
    const task = this.getTask(taskId)
    if (!task) {
      return []
    }
    const stored = readExtraInstances().filter((i) => i.taskId === taskId)
    const ids = new Set(stored.map((i) => i.id))
    return [...stored, ...seedInstances(task).filter((i) => !ids.has(i.id))]
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
  },

  /** 全部效果任务及其批次（执行记录页聚合用） */
  allInstancePairs(): { task: EffectTask; instances: TaskInstance[] }[] {
    return allTasks().map((task) => ({ task, instances: this.instancesOf(task.id) }))
  },

  /** 任务最近一次批次 */
  latestInstanceOf(taskId: string): TaskInstance | null {
    return this.instancesOf(taskId)[0] || null
  },

  /** 按批次 id 取任务（id 内含 taskId，但靠列举避免字串解析出错） */
  findInstance(instanceId: string): { task: EffectTask; instance: TaskInstance } | null {
    const pairs = this.allInstancePairs()
    for (const { task, instances } of pairs) {
      const hit = instances.find((i) => i.id === instanceId)
      if (hit) {
        return { task, instance: hit }
      }
    }
    return null
  },

  /**
   * 批次详情：阈值快照 + 执行日志 + 命中清单
   * 日志与清单都仍由快照现算，不落在 localStorage，避免演示数据与口径漂移
   */
  instanceDetail(instanceId: string): EffectInstanceDetail | null {
    const found = this.findInstance(instanceId)
    return found ? this.instanceDetailFor(found.task, found.instance) : null
  },

  /** 已有任务与批次上下文时直接算详情（聚合层遍历全部批次时避免反复查找） */
  instanceDetailFor(task: EffectTask, instance: TaskInstance): EffectInstanceDetail {
    const history = historyOf(task)
    const snapshot = ruleAt(task, instance.startedAt, history)
    const scanned = hitOf(task, snapshot.rule)
    const running = instance.status === 'running'
    /** 已结束的批次以实例落库的计数为准，与列表行一致 */
    const counts = {
      scope: scopeOf(task),
      judged: running ? 0 : scanned.judged,
      hit: running ? 0 : instance.hitCount,
      offline: running ? 0 : instance.offlineCount,
      online: running ? 0 : instance.onlineCount,
      excludedByCalls: running ? 0 : scanned.excludedByCalls,
      excludedByMissing: running ? 0 : scanned.excludedByMissing
    }
    const rows = running || instance.status === 'failed' ? { offline: [], online: [] } : rowsOf(task, snapshot.rule)
    return {
      task,
      instance,
      rule: snapshot.rule,
      ruleVersion: snapshot.version,
      ruleDiff: ruleDiffCount(task, snapshot.rule),
      logs: instanceLogs(
        task,
        instance,
        snapshot.rule,
        snapshot.version,
        {
          scope: counts.scope,
          judged: counts.judged,
          excludedByCalls: counts.excludedByCalls,
          excludedByMissing: counts.excludedByMissing,
          hitCount: counts.hit,
          offlineCount: counts.offline,
          onlineCount: counts.online
        }
      ),
      counts,
      rows,
      push: {
        enabled: snapshot.rule.pushEnabled,
        targets: snapshot.rule.pushTargets,
        names: pushNamesOf(snapshot.rule.pushTargets)
      }
    }
  },

  /**
   * 启动一次批次：先落一条 running 实例，并把任务置为执行中
   * 同一任务不允许并发跑批（与评估域同规则）
   */
  startRun(taskId: string, opts: { trigger?: 'manual' | 'retry'; operator?: string } = {}): TaskInstance | null {
    const task = this.getTask(taskId)
    if (!task) {
      return null
    }
    const existed = this.instancesOf(taskId)
    if (existed.some((i) => i.status === 'running')) {
      return null
    }
    const seq = existed.reduce((max, i) => Math.max(max, seqOf(i.id, taskId)), 0) + 1
    const startedAt = fmt(new Date())
    const instance: TaskInstance = {
      id: `${taskId}-batch-${seq}`,
      taskId,
      batchNo: `B${startedAt.slice(0, 10).replace(/-/g, '')}-${String(seq).padStart(3, '0')}`,
      startedAt,
      /** 未结束批次结束时间为空串，由聚合层转成 undefined */
      finishedAt: '',
      status: 'running',
      statusLabel: STATUS_LABELS.running,
      result: 'success',
      hitCount: 0,
      offlineCount: 0,
      onlineCount: 0,
      duration: 0,
      operator: opts.operator || UserContext.get().name,
      trigger: opts.trigger === 'retry' ? '失败重跑' : '手动触发'
    }
    writeExtraInstances([instance, ...readExtraInstances()])
    this.saveTask({ ...task, status: 'running', progress: 3 })
    return instance
  },

  /** 结束一次批次：回写计数与耗时，并同步任务最近执行结果 */
  finishRun(
    instanceId: string,
    opts: { status?: 'success' | 'failed' | 'partial' } = {}
  ): TaskInstance | null {
    const found = this.findInstance(instanceId)
    if (!found) {
      return null
    }
    const { task } = found
    const list = readExtraInstances()
    const idx = list.findIndex((i) => i.id === instanceId)
    if (idx < 0) {
      return null
    }
    const instance = list[idx]
    const finishedAt = fmt(new Date())
    const duration = Math.max(1, Math.round((parseTime(finishedAt).getTime() - parseTime(instance.startedAt).getTime()) / 1000))
    const status = opts.status || 'success'
    const snapshot = ruleAt(task, instance.startedAt, historyOf(task))
    const counts = hitOf(task, snapshot.rule)
    /** 产出校验：不符项登记到实例，原本 success 的降级成 partial（与评估域同规则） */
    const contractIssues = runOutputIssues(task, snapshot.rule, counts, status !== 'failed')
    const blockers = contractIssues.filter((i) => i.level === 'blocker').length
    const finalStatus = status === 'success' && blockers ? 'partial' : status
    const next: TaskInstance = {
      ...instance,
      finishedAt,
      duration,
      status: finalStatus as TaskStatus,
      statusLabel: STATUS_LABELS[finalStatus as TaskStatus],
      result: finalStatus,
      hitCount: status === 'failed' ? 0 : counts.hitCount,
      offlineCount: status === 'failed' ? 0 : counts.offlineCount,
      onlineCount: status === 'failed' ? 0 : counts.onlineCount,
      contractIssues
    }
    list[idx] = next
    writeExtraInstances(list)
    const summary =
      status === 'failed'
        ? '样本表分区未就绪，任务中断'
        : finalStatus === 'partial'
          ? `覆盖 ${scopeOf(task)} 个变量，${counts.excludedByMissing} 个因上游缺数只出观察结论`
          : `覆盖 ${scopeOf(task)} 个变量，命中 ${counts.hitCount} 个（汰换 ${counts.offlineCount} / 推荐 ${counts.onlineCount}）`
    this.saveTask({
      ...task,
      status: 'pending',
      progress: 0,
      lastRunAt: instance.startedAt,
      lastRunResult: finalStatus,
      lastRunResultLabel: RESULT_LABELS[finalStatus],
      lastRunSummary: summary
    })
    return next
  },

  /** 一步完成一次批次（列表/详情页「立即执行」与重跑用） */
  runNow(
    taskId: string,
    opts: { trigger?: 'manual' | 'retry'; operator?: string; status?: 'success' | 'failed' | 'partial' } = {}
  ): { instance: TaskInstance | null; task: EffectTask | null } | null {
    const started = this.startRun(taskId, opts)
    if (!started) {
      return null
    }
    const rand = Math.random()
    const status = opts.status || (rand < 0.1 ? 'partial' : 'success')
    const instance = this.finishRun(started.id, { status })
    return { instance, task: this.getTask(taskId) }
  },

  /** 基于已有批次重跑（新起一轮，不覆盖失败记录） */
  retryInstance(instanceId: string, operator = UserContext.get().name): TaskInstance | null {
    const found = this.findInstance(instanceId)
    if (!found || found.instance.status === 'running') {
      return null
    }
    return this.startRun(found.task.id, { trigger: 'retry', operator })
  },
}

export default effectBatchStore

/** 效果批次详情（供全域执行记录页渲染） */
export interface EffectInstanceDetail {
  task: EffectTask
  instance: TaskInstance
  /** 批次开始时刻生效的阈值快照 */
  rule: RuleConfig
  /** 第几版口径（v1 为初始配置） */
  ruleVersion: number
  /** 快照与当前配置的差异字段数，> 0 即「阈值已调整」 */
  ruleDiff: number
  logs: { time: string; level: 'info' | 'warn' | 'error'; message: string }[]
  counts: { scope: number; judged: number; hit: number; offline: number; online: number; excludedByCalls: number; excludedByMissing: number }
  rows: { offline: EffectHitRow[]; online: EffectHitRow[] }
  push: { enabled: boolean; targets: string[]; names: string[] }
}
