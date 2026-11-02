/**
 * 任务管理 · 统一任务聚合层（TaskRecord）
 *
 * 为什么要有这一层：评估域与效果域各自有一套任务模型、状态字典与操作接口，
 * 合并成一个「任务管理」列表后，页面不能再去分别读两个 store，
 * 否则筛选、分页、统计口径会在两处漂移。这里把两域映射成同一种行数据，
 * 页面只认 TaskRecord 与 kind，域差异全部留在本文件与 task-kinds 注册表里。
 *
 * 约束：
 * 1. 只做映射、筛选、分页与操作分派，不产生任何新的事实（数字一律来自域内 store）；
 * 2. 类型 / 状态 / 域文案与操作能力全部查 task-kinds，不在此处重复硬编码；
 * 3. 两域 ID 前缀不同（EVAL-TASK-* / EFF-TASK-*），合并后仍然唯一，故直接用原始 ID；
 * 4. 契约状态在这里算（只查 io-contract 的纯函数 + 域内 store 的配置），列表页不自己拼校验规则。
 */
import EvaluationTaskStore, {
  type EvaluationTaskMock,
  type EvaluationRunInstance
} from '../evaluation/evaluation-task-store'
import { effectBatchStore } from '../effect-evaluation/batch-store'
import type { EffectTask } from '../effect-evaluation/types'
import {
  CONTRACT_STATE_META,
  contractOf,
  contractState,
  fieldLabel,
  issueSummary,
  preflight as preflightContract,
  validateEffectOnSave,
  validateEvaluationOnSave,
  type ContractCheck,
  type ContractIssue,
  type ContractState
} from './io-contract'
import {
  EFFECT_STATUS_MAP,
  EVALUATION_STATUS_MAP,
  RUN_RESULT_MAP,
  frequencyLabel,
  kindOf,
  resolveKind,
  unifiedStatusColor,
  unifiedStatusLabel,
  type TaskDomain,
  type TaskKindDescriptor,
  type UnifiedTaskStatus
} from './task-kinds'

/** 列表与详情共用的契约视图：状态、不符项、血缘一次算好 */
export interface TaskContractView {
  state: ContractState
  stateLabel: string
  stateColor: string
  tip: string
  issues: ContractIssue[]
  /** 徽标 tooltip 用的摘要 */
  summary: string
  /** 该 kind 是否登记了契约（没登记给灰标而不是红标） */
  declared: boolean
  /** 效果任务引用上游评估产出时的血缘信息，列表与详情都直接展示 */
  upstream?: { taskId: string; taskName: string; field: string; fieldLabel: string; upstreamCount?: number }
}

/** 统一任务行：两域任务映射后的公共视图 */
export interface TaskRecord {
  id: string
  domain: TaskDomain
  /** `${domain}.${typeValue}`，见 task-kinds */
  kind: string
  kindLabel: string
  kindDesc: string
  domainLabel: string
  tagColor: string
  name: string
  owner: string
  /** 调度描述：评估取频率 + 执行时间，效果取任务自带文案 */
  scheduleText: string
  nextTriggerAt: string
  status: UnifiedTaskStatus
  statusLabel: string
  statusColor: string
  /** 0-100，评估域无进度概念时给 0 */
  progress: number
  lastRunAt: string
  lastRunResult: string
  lastRunResultLabel: string
  lastRunResultColor: string
  lastRunSummary: string
  /** 覆盖对象文案：评估「N 个特征」/ 效果「N 个变量」 */
  scopeText: string
  updatedAt: string
  /** 该类型可用的操作开关（直接取自 task-kinds 注册项，列表只按开关渲染） */
  actions: TaskKindDescriptor['actions']
  /** 详情载体：drawer = 页内抽屉，route = 独立路由页 */
  detailMode: 'drawer' | 'route'
  detailPath: string
  editPath: string
  enabled: boolean
  running: boolean
  /** 输入输出契约状态（列表徽标与契约筛选都读它） */
  contract: TaskContractView
  /** 域内原始对象，操作与详情侧按需取用 */
  raw: EvaluationTaskMock | EffectTask
}

/** 列表入参：全部可写进 URL，页面不做任何 filter */
export interface TaskListParams {
  keyword?: string
  domain?: string
  kind?: string
  status?: string
  /** 契约状态筛选（?ct=）：ok / warn / block / undeclared */
  contractState?: string
  /** 统计卡预设筛选 */
  preset?: string
  page?: number
  pageSize?: number
}

export interface TaskListResult {
  total: number
  rows: TaskRecord[]
  stats: Record<string, number>
  page: number
  pageSize: number
  state: 'none' | 'empty_filter' | 'empty_data'
}

/** 时间文案 → 可比较数值：兼容 'YYYY-MM-DDTHH:mm:ss' 与 'YYYY-MM-DD HH:mm' */
function timeValue(text?: string): number {
  if (!text || text === '-' || text === '—') {
    return 0
  }
  const t = Date.parse(text.replace(' ', 'T'))
  return Number.isNaN(t) ? 0 : t
}

/** 统一状态 → 标签色 */
function statusColorOf(status: UnifiedTaskStatus): string {
  return unifiedStatusColor(status)
}

/** 最近执行结果 → 标签色（三档终态，其余给灰） */
function resultColorOf(result: string): string {
  return { success: 'green', partial: 'orange', failed: 'red' }[result] || 'gray'
}

/** 评估任务的统一状态：停用的常态性评估归入「已停用」，其余按状态表映射 */
function evaluationStatus(task: EvaluationTaskMock): UnifiedTaskStatus {
  const routine = task.routineConfig
  if (task.taskType === 'routine' && routine && !routine.enabled) {
    return 'paused'
  }
  return EVALUATION_STATUS_MAP[task.status] || 'pending'
}

/** 评估域调度文案：常态性评估看频率与执行时间，其余类型没有时间轴 */
function evaluationSchedule(task: EvaluationTaskMock): string {
  const routine = task.routineConfig
  if (task.taskType !== 'routine' || !routine) {
    return '一次性执行'
  }
  return `${frequencyLabel(routine.frequency)} ${routine.scheduleTime}`
}

/**
 * 评估域最近一轮：结果档与摘要都在这里算成成品，行数据不再拼三元
 * 执行中的轮次不当作「最近结果」，避免列表上出现“执行完成”文案配 running 状态
 */
function evaluationRun(task: EvaluationTaskMock) {
  const latest: EvaluationRunInstance | undefined = EvaluationTaskStore.latestRunOf(task.id)
  const result = latest && latest.status !== 'running' ? latest.status : ''
  return {
    lastRunAt: latest?.startedAt || task.finishedAt || '—',
    lastRunResult: result,
    lastRunResultLabel: result ? unifiedStatusLabel(RUN_RESULT_MAP[result] || 'success') : '未执行',
    lastRunResultColor: resultColorOf(result),
    lastRunSummary: latest
      ? `第 ${latest.seq} 轮 · ${latest.targetSuccess}/${latest.targetTotal} 个特征成功`
      : task.resultSummary || '尚未执行'
  }
}

/** 校验结果 → 列表契约视图：状态、颜色、tooltip 全部取 io-contract 的 META，页面不自己拼 */
function buildContractView(kind: string, check: ContractCheck): TaskContractView {
  const declared = !!contractOf(kind)
  const state = contractState(check, declared)
  const meta = CONTRACT_STATE_META[state]
  return {
    state,
    stateLabel: meta.label,
    stateColor: meta.color,
    tip: meta.tip,
    issues: check.issues,
    summary: issueSummary(check.issues),
    declared
  }
}

/**
 * 评估任务的契约状态：拿任务配的脚本声明去比对 kind 契约的必产字段
 * 没挂脚本的当作平台内置口径（builtinCaliber），不拿「脚本没声明」去判历史任务契约不符
 */
function evaluationContract(task: EvaluationTaskMock, kind: string): TaskContractView {
  const scripts = (task.pythonScripts || []).map((s) => ({
    id: s.id,
    name: s.name,
    type: s.type,
    requires: s.requires,
    provides: s.provides
  }))
  const check = validateEvaluationOnSave({
    kind,
    name: task.name,
    targets: task.targets,
    scripts,
    builtinCaliber: scripts.length === 0
  })
  return buildContractView(kind, check)
}

/**
 * 效果任务的契约状态：除了基础配置，还要验上游引用是否成立
 * 上游存在性与类型都要回查评估域 store，所以这一段只能待在聚合层，不能下沉到契约层
 */
function effectContract(task: EffectTask, kind: string): TaskContractView {
  const ref = task.inputRef
  const upstream = ref ? EvaluationTaskStore.getTaskById(ref.upstreamTaskId) : undefined
  const check = validateEffectOnSave({
    kind,
    name: task.name,
    scheduleText: task.scheduleText,
    upstreamTaskId: ref?.upstreamTaskId,
    upstreamField: ref?.upstreamField,
    upstreamExists: ref ? !!upstream : undefined,
    upstreamKind: upstream ? `evaluation.${upstream.taskType}` : undefined
  })
  const view = buildContractView(kind, check)
  if (ref) {
    view.upstream = {
      taskId: ref.upstreamTaskId,
      taskName: ref.upstreamTaskName || upstream?.name || ref.upstreamTaskId,
      field: ref.upstreamField,
      fieldLabel: fieldLabel(ref.upstreamField),
      upstreamCount: ref.upstreamCount ?? upstream?.targets?.length
    }
  }
  return view
}

/** 评估任务 → 统一行 */
function fromEvaluation(task: EvaluationTaskMock): TaskRecord {
  const kind = resolveKind('evaluation', task.taskType)
  const status = evaluationStatus(task)
  const routine = task.routineConfig
  return {
    id: task.id,
    domain: 'evaluation',
    kind: kind.kind,
    kindLabel: kind.label,
    kindDesc: kind.desc,
    domainLabel: kind.domainLabel,
    tagColor: kind.tagColor,
    name: task.name,
    owner: task.owner,
    scheduleText: evaluationSchedule(task),
    nextTriggerAt: routine?.nextRunAt || '—',
    status,
    statusLabel: unifiedStatusLabel(status),
    statusColor: statusColorOf(status),
    progress: 0,
    ...evaluationRun(task),
    scopeText: `${task.targets?.length || 0} 个特征`,
    updatedAt: task.updatedAt,
    actions: kind.actions,
    detailMode: kind.detail.mode,
    detailPath: kind.detail.path ? kind.detail.path(task.id) : '',
    editPath: kind.editPath ? kind.editPath(task.id) : '',
    enabled: status !== 'paused',
    running: status === 'running',
    contract: evaluationContract(task, kind.kind),
    raw: task
  }
}

/** 效果任务的覆盖对象：引用了上游产出就按收窄后的范围说，避免列表与批次数字对不上 */
function effectScope(task: EffectTask): string {
  const scope = task.inputRef?.upstreamCount
  return scope ? `${scope} 个变量` : `${task.variableCount} 个变量`
}

/** 效果任务 → 统一行 */
function fromEffect(task: EffectTask): TaskRecord {
  const kind = resolveKind('effect', task.type)
  const status: UnifiedTaskStatus = EFFECT_STATUS_MAP[task.status] || 'pending'
  return {
    id: task.id,
    domain: 'effect',
    kind: kind.kind,
    kindLabel: kind.label,
    kindDesc: kind.desc,
    domainLabel: kind.domainLabel,
    tagColor: kind.tagColor,
    name: task.name,
    owner: task.owner,
    scheduleText: task.scheduleText,
    nextTriggerAt: task.scheduleText === '手动触发' ? '—' : task.nextTriggerAt,
    status,
    statusLabel: unifiedStatusLabel(status),
    statusColor: statusColorOf(status),
    progress: task.progress,
    lastRunAt: task.lastRunAt,
    lastRunResult: task.lastRunResult,
    lastRunResultLabel: task.lastRunResultLabel,
    lastRunResultColor: resultColorOf(task.lastRunResult),
    lastRunSummary: task.lastRunSummary,
    scopeText: effectScope(task),
    updatedAt: task.lastRunAt && task.lastRunAt !== '-' ? task.lastRunAt : task.nextTriggerAt,
    actions: kind.actions,
    detailMode: kind.detail.mode,
    detailPath: kind.detail.path ? kind.detail.path(task.id) : '',
    editPath: '',
    enabled: task.enabled,
    running: status === 'running',
    contract: effectContract(task, kind.kind),
    raw: task
  }
}

/** 两域全量任务（未筛选、未分页），统计与列表共用同一份 */
function allRecords(): TaskRecord[] {
  return [
    ...EvaluationTaskStore.listTasks().map(fromEvaluation),
    ...effectBatchStore.listAll().map(fromEffect)
  ]
}

/** 统计卡预设 → 判定函数 */
const PRESETS: Record<string, (r: TaskRecord) => boolean> = {
  running: (r) => r.status === 'running',
  pending: (r) => r.status === 'pending' || r.status === 'scheduled',
  failed: (r) => r.status === 'failed' || r.lastRunResult === 'failed',
  paused: (r) => r.status === 'paused'
}

/** 列表状态机：错误态沿用效果域演示开关，避免两域各存一份 */
function listState(total: number, hasFilter: boolean): TaskListResult['state'] {
  if (total > 0) {
    return 'none'
  }
  return hasFilter ? 'empty_filter' : 'empty_data'
}

/**
 * 评估域执行：常态性评估走 runRoutineTask（自己登记一轮实例），
 * 其余类型沿用面板旧行为：先置 running 再算完成，保证状态机不断链
 */
function runEvaluation(task: EvaluationTaskMock): { ok: boolean; message: string } {
  const finished =
    task.taskType === 'routine'
      ? EvaluationTaskStore.runRoutineTask(task.id)
      : (EvaluationTaskStore.startTask(task.id), EvaluationTaskStore.runTask(task.id))
  if (!finished) {
    return { ok: false, message: '任务不存在' }
  }
  return {
    ok: true,
    message: `「${finished.name}」执行完成，产出 ${finished.reports.length} 份报告并登记一条执行记录`
  }
}

/** 效果域执行：一步完成一个批次，失败当量由 batch-store 给 */
function runEffect(record: TaskRecord): { ok: boolean; message: string } {
  const started = effectBatchStore.runNow(record.id, { trigger: 'manual' })
  if (!started) {
    return { ok: false, message: '该任务已有批次在执行中，请等本轮跑完再试' }
  }
  const instance = started.instance
  return {
    ok: true,
    message: `已触发「${record.name}」（批次 ${instance?.batchNo || '-'}），命中 ${instance?.hitCount ?? 0} 个变量`
  }
}

/**
 * 配置层已知的阻断项在预检里转成 warning：保存时已经拦过一次，执行段不替用户做决定，
 * 但「配置不齐照样能跑、产出注定缺项」必须在点执行的时候说出口
 */
function contractHints(view: TaskContractView): ContractIssue[] {
  return view.issues.filter((i) => i.level === 'blocker').map((i) => ({ ...i, level: 'warning' as const }))
}

/** 预检结果与配置提示合并，统一交给页面弹框 */
function mergeCheck(base: ContractCheck, extra: ContractIssue[]): ContractCheck {
  const issues = [...extra, ...base.issues]
  return {
    ok: issues.every((i) => i.level !== 'blocker'),
    issues,
    blockers: issues.filter((i) => i.level === 'blocker'),
    warnings: issues.filter((i) => i.level === 'warning')
  }
}

export const taskRecordStore = {
  /** 统一任务列表：筛选、排序、分页全在这里完成 */
  list(p: TaskListParams = {}): TaskListResult {
    const rows0 = allRecords()
    /** 四个数字固定为全库口径，不随筛选变化，保证卡片数字稳定 */
    const stats = {
      total: rows0.length,
      running: rows0.filter(PRESETS.running).length,
      pending: rows0.filter(PRESETS.pending).length,
      failed: rows0.filter(PRESETS.failed).length,
      paused: rows0.filter(PRESETS.paused).length,
      /** 契约不符档：列表上的「需处理」计数，与 ?ct=block 筛出来的条数同源 */
      contractBlock: rows0.filter((r) => r.contract.state === 'block').length,
      contractWarn: rows0.filter((r) => r.contract.state === 'warn').length
    }

    const keyword = (p.keyword || '').trim().toLowerCase()
    const matcher = p.preset && p.preset !== 'all' ? PRESETS[p.preset] : undefined
    const hasFilter = !!(
      keyword ||
      p.domain ||
      p.kind ||
      p.status ||
      p.contractState ||
      (p.preset && p.preset !== 'all')
    )

    const rows = rows0
      .filter((r) => (matcher ? matcher(r) : true))
      .filter((r) => (p.domain ? r.domain === p.domain : true))
      .filter((r) => (p.kind ? r.kind === p.kind : true))
      .filter((r) => (p.status ? r.status === p.status : true))
      .filter((r) =>
        p.contractState && p.contractState !== 'all' ? r.contract.state === p.contractState : true
      )
      .filter((r) =>
        keyword
          ? r.name.toLowerCase().includes(keyword) ||
            r.id.toLowerCase().includes(keyword) ||
            r.owner.toLowerCase().includes(keyword)
          : true
      )
      .sort((a, b) => timeValue(b.updatedAt) - timeValue(a.updatedAt))

    const total = rows.length
    const pageSize = Math.min(50, Math.max(5, Number(p.pageSize || 10)))
    const page = Math.min(Math.max(1, Number(p.page || 1)), Math.max(1, Math.ceil(total / pageSize) || 1))

    return {
      total,
      rows: rows.slice((page - 1) * pageSize, page * pageSize),
      stats,
      page,
      pageSize,
      state: listState(total, hasFilter)
    }
  },

  /** 单行读取（详情侧栏、抽屉按需取用） */
  get(id: string): TaskRecord | null {
    return allRecords().find((r) => r.id === id) || null
  },

  /**
   * 执行前预检（契约第二段）：看「这次跑得出不出东西」，再把配置层的契约阻断项当提醒带出来
   * 返回的全是 warning，由页面弹确认框让用户选择是否继续，聚合层不替用户做决定
   */
  preflight(id: string): ContractCheck | null {
    const record = this.get(id)
    if (!record) {
      return null
    }
    const hints = contractHints(record.contract)
    if (record.domain === 'effect') {
      const task = record.raw as EffectTask
      const scope = effectBatchStore.preflightScope(task.id)
      const ref = task.inputRef
      const upstreamOk = ref
        ? EvaluationTaskStore.listRunsByTask(ref.upstreamTaskId).some((r) => r.status === 'success')
        : undefined
      return mergeCheck(
        preflightContract({
          kind: record.kind,
          targetCount: scope?.targetCount ?? 0,
          sampleUsableRate: scope?.usableRate,
          upstreamFinished: upstreamOk,
          upstreamTaskName: ref?.upstreamTaskName
        }),
        hints
      )
    }
    const task = record.raw as EvaluationTaskMock
    return mergeCheck(
      preflightContract({ kind: record.kind, targetCount: task.targets?.length || 0 }),
      hints
    )
  },

  /**
   * 立即执行：按域分派到各自 store，页面不自己改任务状态
   * 两域同规则：同一任务已有批次在执行中则不允许再起一轮，避免并发跑批
   */
  run(id: string): { ok: boolean; message: string } {
    const record = this.get(id)
    if (!record) {
      return { ok: false, message: '任务不存在' }
    }
    if (!kindOf(record.kind).actions.run) {
      return { ok: false, message: '该任务类型不支持手动执行' }
    }
    return record.domain === 'evaluation' ? runEvaluation(record.raw as EvaluationTaskMock) : runEffect(record)
  },

  /**
   * 启用 / 停用：评估域只动调度开关，效果域同时把状态置为已暂停
   */
  toggle(id: string): { ok: boolean; message: string } {
    const record = this.get(id)
    if (!record) {
      return { ok: false, message: '任务不存在' }
    }
    if (record.domain === 'evaluation') {
      const task = record.raw as EvaluationTaskMock
      if (!task.routineConfig) {
        return { ok: false, message: '一次性评估任务没有调度开关' }
      }
      const enabled = !task.routineConfig.enabled
      EvaluationTaskStore.updateRoutineSchedule(task.id, { enabled })
      return { ok: true, message: enabled ? `已启用「${task.name}」的周期调度` : `已停用「${task.name}」的周期调度` }
    }
    const task = record.raw as EffectTask
    const enabled = !task.enabled
    effectBatchStore.saveTask({ id: task.id, name: task.name, enabled, status: enabled ? 'pending' : 'paused' })
    return { ok: true, message: enabled ? `已启用「${task.name}」` : `已停用「${task.name}」，不再定时触发` }
  },

  /** 任务级判定配置入口是否可用（效果域任务才有） */
  canEditCaliber(id: string): boolean {
    const record = this.get(id)
    return !!record && record.actions.caliber
  }
}

export default taskRecordStore
