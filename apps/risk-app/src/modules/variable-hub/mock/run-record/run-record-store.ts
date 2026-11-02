/**
 * 执行记录聚合 store（mock，只读视图 + 重跑分发）
 *
 * 定位：把「特征评估」与「效果运营」两个域的跑批实例收敛成同一份执行记录，
 * 两个域各自的 store 仍是事实源，本层只做：
 * 1. 模型对齐（RunRecord）：状态、触发方式、耗时、口径快照、结果摘要统一口径；
 * 2. 全域查询：列表 / 详情 / 按任务轮次 / 概览统计；
 * 3. 重跑分发：按域调用各自的 startRun / finishRun，页面无需知道实例来自哪里。
 *
 * 口径快照语义在两个域一致：
 * - 评估域锁定「Python 脚本版本」，脚本库后续升级不回溯历史实例；
 * - 效果域锁定「阈值规则版本」，规则后续调整不回溯历史批次。
 */

import {
  EvaluationTaskStore,
  triggerLabel,
  runStatusLabel,
  runStatusColor,
  formatDuration,
  type EvaluationRunInstance,
  type EvaluationTaskReport,
  type EvaluationTaskType,
  type RunInstanceStatus,
  type RunLogEntry,
  type RunTargetResult,
  type RunTrigger
} from '../evaluation/evaluation-task-store'
import {
  effectBatchStore,
  type EffectHitRow,
  type EffectInstanceDetail
} from '../effect-evaluation/batch-store'
import { RULE_FIELD_METAS, effectRuleStore, formatRuleValue } from '../effect-evaluation/rule-store'
import type { ContractIssue } from '../task-center/io-contract'

/** 执行记录所属业务域 */
export type RunDomain = 'evaluation' | 'effect'

export const RUN_DOMAIN_LABELS: Record<RunDomain, string> = {
  evaluation: '特征评估',
  effect: '效果运营'
}

/** 评估任务类型文案（与任务中心筛选下拉一致） */
const EVALUATION_TYPE_LABELS: Record<EvaluationTaskType, string> = {
  access: '准入评估',
  recheck: '复评任务',
  comparison: '对比评估',
  routine: '常态性评估'
}

/** 口径快照里的一行：评估域=一个脚本，效果域=一条阈值 */
export interface RunCaliberItem {
  /** 评估域脚本 id，可跳脚本详情 */
  id?: string
  label: string
  /** 该实例锁定的版本号 */
  version?: number
  /** 效果域展示当时的阈值取值 */
  valueText?: string
  /** 口径是否已落后于当前配置 */
  stale?: boolean
  staleText?: string
}

export interface RunCaliber {
  kind: 'python' | 'rule'
  /** 顶部一句话口径版本，如「Python 脚本 2 个 · 锁定 v3」 */
  versionText: string
  items: RunCaliberItem[]
  /** 列表列使用的紧凑摘要 */
  summary: string
  /** 快照内任一条目已落后于当前配置 */
  stale: boolean
}

/** 域专属明细：详情页第四区按 kind 分支渲染 */
export type RunPayload =
  | {
    kind: 'evaluation'
    targetTotal: number
    targetSuccess: number
    targetFailed: number
    targets: RunTargetResult[]
    reports: EvaluationTaskReport[]
  }
  | {
    kind: 'effect'
    /** 批次号 */
    batchNo: string
    scope: number
    judged: number
    hit: number
    offline: number
    online: number
    excludedByCalls: number
    excludedByMissing: number
    rows: { offline: EffectHitRow[]; online: EffectHitRow[] }
    push: { enabled: boolean; names: string[] }
    ruleVersion: number
    ruleDiff: number
  }

/** 统一执行记录 */
export interface RunRecord {
  id: string
  domain: RunDomain
  domainLabel: string
  taskId: string
  taskName: string
  taskTypeLabel: string
  /** 该任务下第 N 次执行 */
  seq: number
  trigger: RunTrigger
  triggeredBy: string
  status: RunInstanceStatus
  startedAt: string
  finishedAt?: string
  durationMs?: number
  caliber: RunCaliber
  /** 结果指标卡（两域标签与数量不同，由本层给全） */
  metrics: { label: string; value: string }[]
  /** 列表行结果列文案 */
  resultText: string
  errorMessage?: string
  /**
   * 执行后产出校验的不符项（契约第三段），原样来自域内实例
   * 非空表示本轮必产字段没齐（原本 success 已降级 partial）；undefined = 该实例执行时还没这套校验
   */
  contractIssues?: ContractIssue[]
  logs: RunLogEntry[]
  payload: RunPayload
}

/** 执行记录查询条件 */
export interface RunRecordFilter {
  domain?: RunDomain | ''
  taskId?: string
  status?: RunInstanceStatus | ''
  trigger?: RunTrigger | ''
  keyword?: string
}

/** 效果域触发文案 → 统一触发方式 */
function toTrigger(text: string): RunTrigger {
  if (text === '手动触发') {
    return 'manual'
  }
  if (text === '失败重跑') {
    return 'retry'
  }
  return 'schedule'
}

/** 效果域批次状态 → 统一实例状态 */
function toRunStatus(status: string): RunInstanceStatus {
  if (status === 'running' || status === 'success' || status === 'partial' || status === 'failed') {
    return status
  }
  return 'skipped'
}

const percent = (v?: number): string => (typeof v === 'number' ? `${(v * 100).toFixed(1)}%` : '—')

/** 从实例 id 取轮次（两域 id 均以 `-batch-N` / `-N` 结尾，解析失败给 0） */
function seqOf(id: string, taskId: string): number {
  const tail = id.startsWith(`${taskId}-batch-`) ? id.slice(`${taskId}-batch-`.length) : id.split('-').pop() || ''
  return Number(tail) || 0
}

/** 列表关键词命中的文本域（包含效果域批次号） */
function keywordHay(record: RunRecord): string {
  const batchNo = record.payload.kind === 'effect' ? record.payload.batchNo : ''
  return `${record.id} ${record.taskId} ${record.taskName} ${record.triggeredBy} ${batchNo}`.toLowerCase()
}

/** 评估域实例 → 统一记录 */
function fromEvaluation(run: EvaluationRunInstance): RunRecord {
  const items = run.scripts.map<RunCaliberItem>((snap) => {
    const live = EvaluationTaskStore.getPythonScriptById(snap.id)
    const stale = !!live && live.currentVersion > snap.version
    return {
      id: snap.id,
      label: snap.name,
      version: snap.version,
      stale,
      staleText: stale ? `脚本已升级至 v${live?.currentVersion}` : ''
    }
  })
  const stale = items.some((i) => i.stale)
  const metrics: { label: string; value: string }[] = [
    { label: '评估对象', value: `${run.targetSuccess}/${run.targetTotal}` },
    { label: '产出报告', value: `${run.producedReports.length} 份` }
  ]
  if (run.metrics) {
    metrics.push(
      { label: '覆盖率', value: percent(run.metrics.coverage) },
      { label: '通过率', value: percent(run.metrics.passRate) },
      { label: '质量得分', value: typeof run.metrics.quality === 'number' ? String(run.metrics.quality) : '—' }
    )
    if (typeof run.metrics.iv === 'number') {
      metrics.push({ label: 'IV', value: run.metrics.iv.toFixed(3) })
    }
    if (typeof run.metrics.ks === 'number') {
      metrics.push({ label: 'KS', value: run.metrics.ks.toFixed(3) })
    }
  }
  const resultText = run.status === 'running'
    ? '执行中'
    : run.status === 'failed'
      ? '执行失败，未产出报告'
      : `${run.targetSuccess}/${run.targetTotal} 个特征完成评估，产出 ${run.producedReports.length} 份报告`
  return {
    id: run.id,
    domain: 'evaluation',
    domainLabel: RUN_DOMAIN_LABELS.evaluation,
    taskId: run.taskId,
    taskName: run.taskName,
    taskTypeLabel: EVALUATION_TYPE_LABELS[run.taskType] || '评估任务',
    seq: run.seq,
    trigger: run.trigger,
    triggeredBy: run.triggeredBy,
    status: run.status,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
    durationMs: run.durationMs,
    caliber: {
      kind: 'python',
      versionText: `Python 脚本口径 ${items.length} 个${stale ? '（已落后当前版本）' : ''}`,
      items,
      summary: items.length ? `${items[0].label} v${items[0].version}${items.length > 1 ? ` 等 ${items.length} 个` : ''}` : '未绑定脚本',
      stale
    },
    metrics,
    resultText,
    errorMessage: run.errorMessage,
    contractIssues: run.contractIssues,
    logs: run.logs,
    payload: {
      kind: 'evaluation',
      targetTotal: run.targetTotal,
      targetSuccess: run.targetSuccess,
      targetFailed: run.targetFailed,
      targets: run.targetResults,
      reports: run.producedReports
    }
  }
}

/** 效果域批次 → 统一记录 */
function fromEffect(detail: EffectInstanceDetail): RunRecord {
  const { task, instance, rule, ruleVersion, ruleDiff } = detail
  const numberMetas = RULE_FIELD_METAS.filter((m) => m.kind !== 'array')
  const items = numberMetas.map<RunCaliberItem>((meta) => ({
    label: meta.label,
    valueText: formatRuleValue(meta, (rule as any)[meta.key]),
    stale: ruleDiff > 0 && formatRuleValue(meta, (rule as any)[meta.key]) !== formatRuleValue(meta, (effectRuleStore.getRule() as any)[meta.key]),
    staleText: ''
  }))
  const status = toRunStatus(instance.status)
  const metrics: { label: string; value: string }[] = [
    { label: '覆盖变量', value: String(detail.counts.scope) },
    { label: '完成判定', value: String(detail.counts.judged) },
    { label: '命中名单', value: String(instance.hitCount) },
    { label: '建议汰换', value: String(instance.offlineCount) },
    { label: '推荐使用', value: String(instance.onlineCount) },
    { label: '剔除不判定', value: String(detail.counts.excludedByCalls + detail.counts.excludedByMissing) }
  ]
  const resultText = status === 'running'
    ? '执行中'
    : status === 'failed'
      ? '样本表分区未就绪，未产出名单'
      : `命中 ${instance.hitCount} 个（汰换 ${instance.offlineCount} / 推荐 ${instance.onlineCount}）`
  return {
    id: instance.id,
    domain: 'effect',
    domainLabel: RUN_DOMAIN_LABELS.effect,
    taskId: task.id,
    taskName: task.name,
    taskTypeLabel: task.typeLabel,
    seq: seqOf(instance.id, task.id),
    trigger: toTrigger(instance.trigger),
    triggeredBy: instance.operator,
    status,
    startedAt: instance.startedAt,
    finishedAt: instance.finishedAt || undefined,
    durationMs: instance.duration * 1000,
    caliber: {
      kind: 'rule',
      versionText: `阈值口径 v${ruleVersion}${ruleDiff > 0 ? '（与当前配置有差异）' : ''}`,
      items,
      summary: `阈值 v${ruleVersion} · 汰换 < ${rule.offlineIndexBelow} / 推荐 > ${rule.onlineIndexAbove}`,
      stale: ruleDiff > 0
    },
    metrics,
    resultText,
    errorMessage: status === 'failed' ? '样本表分区未就绪，任务中断' : undefined,
    contractIssues: instance.contractIssues,
    logs: detail.logs,
    payload: {
      kind: 'effect',
      batchNo: instance.batchNo,
      scope: detail.counts.scope,
      judged: detail.counts.judged,
      hit: instance.hitCount,
      offline: instance.offlineCount,
      online: instance.onlineCount,
      excludedByCalls: detail.counts.excludedByCalls,
      excludedByMissing: detail.counts.excludedByMissing,
      rows: detail.rows,
      push: { enabled: detail.push.enabled, names: detail.push.names },
      ruleVersion,
      ruleDiff
    }
  }
}

export const RunRecordStore = {
  /** 标签与颜色沿用评估域口径，两域共用 */
  statusLabel: runStatusLabel,
  statusColor: runStatusColor,
  triggerLabel,
  formatDuration,

  /** 全域执行记录：两域合并 → 过滤 → 开始时间倒序 */
  list(filter: RunRecordFilter = {}): RunRecord[] {
    const records: RunRecord[] = [
      ...EvaluationTaskStore.listRuns().map(fromEvaluation),
      ...effectBatchStore.allInstancePairs().flatMap(({ task, instances }) =>
        instances.map((instance) => fromEffect(effectBatchStore.instanceDetailFor(task, instance)))
      )
    ]
    const keyword = (filter.keyword || '').trim().toLowerCase()
    return records
      .filter((r) => {
        if (filter.domain && r.domain !== filter.domain) {
          return false
        }
        if (filter.taskId && r.taskId !== filter.taskId) {
          return false
        }
        if (filter.status && r.status !== filter.status) {
          return false
        }
        if (filter.trigger && r.trigger !== filter.trigger) {
          return false
        }
        if (keyword) {
          if (!keywordHay(r).includes(keyword)) {
            return false
          }
        }
        return true
      })
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
  },

  getById(id: string): RunRecord | undefined {
    return RunRecordStore.list().find((r) => r.id === id)
  },

  listByTask(domain: RunDomain, taskId: string): RunRecord[] {
    return RunRecordStore.list({ domain, taskId })
  },

  latestOf(domain: RunDomain, taskId: string): RunRecord | undefined {
    return RunRecordStore.listByTask(domain, taskId)[0]
  },

  /** 顶部四数字卡：全域口径，成功率只算已结束实例 */
  summary(): {
    total: number
    running: number
    success: number
    partial: number
    failed: number
    today: number
    successRate: number
    byDomain: Record<RunDomain, number>
  } {
    const all = RunRecordStore.list()
    const today = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const todayText = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`
    const finished = all.filter((r) => r.status !== 'running')
    const success = finished.filter((r) => r.status === 'success').length
    return {
      total: all.length,
      running: all.filter((r) => r.status === 'running').length,
      success,
      partial: finished.filter((r) => r.status === 'partial').length,
      failed: finished.filter((r) => r.status === 'failed').length,
      today: all.filter((r) => r.startedAt.startsWith(todayText)).length,
      successRate: finished.length ? Number((success / finished.length).toFixed(4)) : 0,
      byDomain: {
        evaluation: all.filter((r) => r.domain === 'evaluation').length,
        effect: all.filter((r) => r.domain === 'effect').length
      }
    }
  },

  /** 任务下拉数据源：两域任务合并，选项里带域标签避免同名任务混选 */
  taskOptions(): { value: string; label: string; domain: RunDomain }[] {
    const evaluation = EvaluationTaskStore.listTasks().map((t) => ({
      value: t.id,
      label: `${RUN_DOMAIN_LABELS.evaluation} · ${t.name}`,
      domain: 'evaluation' as RunDomain
    }))
    const effect = effectBatchStore
      .listTasks({ pageSize: 50 })
      .rows.map((t) => ({
        value: t.id,
        label: `${RUN_DOMAIN_LABELS.effect} · ${t.name}`,
        domain: 'effect' as RunDomain
      }))
    return [...evaluation, ...effect]
  },

  /**
   * 发起重跑：按域分发到各自的启动方法
   * @returns 新建的 running 记录，任务已有执行中实例时返回 null
   */
  rerunStart(recordId: string, triggeredBy = 'Demo 用户'): RunRecord | null {
    const origin = RunRecordStore.getById(recordId)
    if (!origin || origin.status === 'running') {
      return null
    }
    if (origin.domain === 'evaluation') {
      const started = EvaluationTaskStore.retryRun(recordId, triggeredBy)
      return started ? fromEvaluation(started) : null
    }
    const started = effectBatchStore.retryInstance(recordId, triggeredBy)
    const task = started ? effectBatchStore.getTask(started.taskId) : null
    return started && task ? fromEffect(effectBatchStore.instanceDetailFor(task, started)) : null
  },

  /** 结束重跑：评估域回写报告与档案，效果域回写名单计数与任务摘要 */
  rerunFinish(recordId: string, status: 'success' | 'partial' | 'failed' = 'success'): RunRecord | null {
    const record = RunRecordStore.getById(recordId)
    if (!record) {
      return null
    }
    if (record.domain === 'evaluation') {
      const finished = EvaluationTaskStore.finishRun(recordId, { status })
      return finished ? fromEvaluation(finished) : null
    }
    const finished = effectBatchStore.finishRun(recordId, { status })
    const task = finished ? effectBatchStore.getTask(finished.taskId) : null
    return finished && task ? fromEffect(effectBatchStore.instanceDetailFor(task, finished)) : null
  }
}

export default RunRecordStore
