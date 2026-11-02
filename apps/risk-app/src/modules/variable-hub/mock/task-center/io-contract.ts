/**
 * 任务管理 · 输入输出契约（IO contract）
 *
 * 为什么要这一层：
 * 两域任务的输入输出其实一直是固定格式，只是过去只写在 store 的代码里（效果域是 EffectRow 的字段，
 * 评估域是 metrics 与 pythonOutputs 这两个 any）。格式没被声明出来，就会出现三种静默错误：
 * 脚本改版后输出少字段 → 回写特征档案失败但状态仍显示成功；选错脚本类型 → 照样能保存；
 * 上游分区没就绪 → 只有跑完才知道。所以把格式显式成契约，校验只是契约的副作用。
 *
 * 约束：
 * 1. 本文件只有字典与纯函数，不 import 任何 store（与 task-kinds 同一层规则）；
 * 2. 字段名是跨域唯一口径：评估任务的 output（如 quality/iv）可以成为效果任务的 input，
 *    这就是「和评估功能打通」的落点，两边说的必须是同一个 key；
 * 3. 校验分三段，各自强度固定：保存时 blocker 阻断、执行前 warning 可继续、执行后登记不符项。
 */

/** 契约字段类型（只做存在性与粗粒度类型校验，不做数值区间判定，阈值合法性仍归 rule-store） */
export type ContractFieldType = 'string' | 'number' | 'percent' | 'boolean' | 'list'

/** 字段来源：决定这个字段由谁提供（platform = 平台自己保证，不能要求脚本提供） */
export type ContractSource = 'ledger' | 'sample_table' | 'script_output' | 'platform'

/** 字段落点：产出字段最终去哪，回写特征档案是评估域唯一的跨域出口 */
export type ContractSink = 'profile_writeback' | 'hit_list' | 'report' | 'push'

/** 全局字段字典条目 */
export interface ContractField {
  key: string
  label: string
  type: ContractFieldType
  source: ContractSource
  sink?: ContractSink
  /** 补充说明，直接展示在详情契约表里 */
  desc?: string
}

/** 契约里对字段的引用：required 才算阻断项 */
export interface ContractRef {
  key: string
  required?: boolean
  note?: string
}

/** 一种任务类型的输入输出契约 */
export interface KindContract {
  kind: string
  /** 契约版本，演示态；真实环境要跟口径变更一起升版 */
  version: string
  input: ContractRef[]
  output: ContractRef[]
  /**
   * 是否允许输入来自上游任务的产出（打通两域的关键声明）
   * fromKinds: 允许引用哪些任务类型；fields: 允许引用哪些产出字段
   */
  upstream?: { fromKinds: string[]; fields: string[] }
}

/** 脚本能力声明：脚本自己说需要哪些输入、能产出哪些输出 */
export interface ScriptCapability {
  id: string
  name: string
  type: 'processor' | 'visualizer' | 'combined'
  requires?: string[]
  provides?: string[]
}

/** 校验问题的严重级别：blocker 阻断保存，warning 只提示，record 是执行后登记 */
export type IssueLevel = 'blocker' | 'warning'

export type IssueCode =
  | 'undeclared_contract'
  | 'missing_input_field'
  | 'missing_output_field'
  | 'type_mismatch'
  | 'script_required'
  | 'script_provides_missing'
  | 'script_requires_unmet'
  | 'upstream_not_found'
  | 'upstream_not_finished'
  | 'upstream_field_missing'
  | 'scope_empty'
  | 'data_quality_low'

/** 一条校验问题；anchor 给页面用来定位并高亮到具体配置项 */
export interface ContractIssue {
  code: IssueCode
  level: IssueLevel
  field?: string
  message: string
  anchor?: 'scripts' | 'targets' | 'input' | 'output' | 'upstream' | 'schedule'
}

/** 三段校验的统一返回 */
export interface ContractCheck {
  ok: boolean
  issues: ContractIssue[]
  blockers: ContractIssue[]
  warnings: ContractIssue[]
}

/** 任务列表与详情用的契约状态（列表徽标只认这四档） */
export type ContractState = 'ok' | 'warn' | 'block' | 'undeclared'

export const CONTRACT_STATE_META: Record<ContractState, { label: string; color: string; tip: string }> = {
  ok: { label: '契约齐备', color: 'green', tip: '输入输出字段都能对齐，产出可安全回写' },
  warn: { label: '执行前需确认', color: 'orange', tip: '存在警告级不符项，可继续执行，但结果可能不完整' },
  block: { label: '契约不符', color: 'red', tip: '存在阻断级不符项，配置不完整，不能保存或执行' },
  undeclared: { label: '未登记契约', color: 'gray', tip: '该任务类型还没有输入输出契约，请先在 io-contract 注册' }
}

// ==================== 全局字段字典 ====================

/** 跨域统一的字段名，新增字段只加这里，两域共用同一 key 才能对接 */
const CONTRACT_FIELD_LIST: ContractField[] = [
  { key: 'variableId', label: '变量标识', type: 'string', source: 'ledger', desc: '台账内的唯一编码，两域都用它做关联主键' },
  { key: 'variableName', label: '变量名称', type: 'string', source: 'ledger' },
  { key: 'sourceType', label: '数据来源', type: 'string', source: 'ledger', desc: '内数 / 外数 / 行为，决定可用口径范围' },
  { key: 'updateFrequency', label: '更新频率', type: 'string', source: 'ledger' },
  { key: 'sampleRows', label: '样本数据', type: 'list', source: 'sample_table', desc: '评估所需的样本表或回溯数据' },
  { key: 'callCount', label: '月调用量', type: 'number', source: 'sample_table', desc: '万次，效果域最小调用量阈值的判定输入' },
  { key: 'missingRate', label: '缺失率', type: 'percent', source: 'sample_table', desc: '上游产出质量输入，超限只出观察结论' },
  { key: 'effectIndex', label: '效果指数', type: 'number', source: 'sample_table', desc: '0-100，汰换线 / 推荐线都按它比较' },
  { key: 'platformCount', label: '在用渠道数', type: 'number', source: 'sample_table' },
  { key: 'synthetic', label: '演示合成标记', type: 'boolean', source: 'sample_table', desc: '合成样本不是台账正式资产，名单要单独提示' },
  { key: 'quality', label: '数据质量得分', type: 'number', source: 'script_output', sink: 'profile_writeback', desc: '评估产出，可回写特征档案，也是效果域可引用的上游字段' },
  { key: 'coverage', label: '覆盖率', type: 'percent', source: 'script_output', sink: 'profile_writeback' },
  { key: 'iv', label: 'IV', type: 'number', source: 'script_output', sink: 'profile_writeback' },
  { key: 'ks', label: 'KS', type: 'number', source: 'script_output', sink: 'report' },
  { key: 'psi', label: 'PSI', type: 'number', source: 'script_output', sink: 'report', desc: '常态巡检的稳定性口径' },
  { key: 'passRate', label: '通过率', type: 'percent', source: 'script_output', sink: 'report' },
  { key: 'totalRows', label: '样本行数', type: 'number', source: 'script_output', sink: 'report' },
  { key: 'chartPath', label: '图表产出', type: 'list', source: 'script_output', sink: 'report' },
  { key: 'report', label: '评估报告', type: 'list', source: 'platform', sink: 'report', desc: '报告由执行引擎产出，不是脚本字段，保存时不纳入脚本覆盖校验' },
  { key: 'offlineList', label: '汰换名单', type: 'list', source: 'script_output', sink: 'hit_list', desc: '效果域产出，可推送协作对象' },
  { key: 'onlineList', label: '推荐名单', type: 'list', source: 'script_output', sink: 'hit_list' },
  { key: 'judgedCounts', label: '判定六数', type: 'list', source: 'script_output', sink: 'report', desc: '覆盖 / 判定 / 两类剔除 / 汰换 / 推荐' },
  { key: 'ruleSnapshot', label: '口径快照', type: 'list', source: 'script_output', sink: 'report', desc: '批次生效阈值必须留档，否则历史名单不可复现' }
]

/** 字段字典索引：key → 字段元信息，页面取 label / 类型 / 落点都走它 */
export const CONTRACT_FIELDS: Record<string, ContractField> = CONTRACT_FIELD_LIST.reduce((acc, f) => {
  acc[f.key] = f
  return acc
}, {} as Record<string, ContractField>)

/** 字段中文名，未知 key 原样返回，页面不自己拼字典 */
export function fieldLabel(key: string): string {
  return CONTRACT_FIELDS[key]?.label || key
}

/** 字段来源文案 */
const SOURCE_LABELS: Record<ContractSource, string> = {
  ledger: '特征台账',
  sample_table: '样本 / 效果宽表',
  script_output: '脚本产出',
  platform: '平台产出'
}

export function sourceLabel(source: ContractSource): string {
  return SOURCE_LABELS[source] || source
}

const SINK_LABELS: Record<ContractSink, string> = {
  profile_writeback: '回写特征档案',
  hit_list: '产出名单',
  report: '进报告',
  push: '推送协作对象'
}

export function sinkLabel(sink?: ContractSink): string {
  return sink ? SINK_LABELS[sink] : '—'
}

// ==================== 各任务类型的契约 ====================

/** 效果域共同的输入：跑名单必须有这四个字段，缺失率与调用量还要参与剔除判定 */
const EFFECT_INPUT: ContractRef[] = [
  { key: 'variableId', required: true },
  { key: 'variableName', required: true },
  { key: 'callCount', required: true, note: '最小月调用量阈值依赖' },
  { key: 'missingRate', required: true, note: '缺失率上限阈值依赖' },
  { key: 'effectIndex', required: true, note: '汰换线 / 推荐线依赖' },
  { key: 'platformCount' },
  { key: 'synthetic', note: '为 true 时只出观察结论' }
]

/** 效果域共同的产出：六数与口径快照必须留档，名单按类型必有一个 */
const EFFECT_OUTPUT: ContractRef[] = [
  { key: 'judgedCounts', required: true },
  { key: 'ruleSnapshot', required: true },
  { key: 'offlineList' },
  { key: 'onlineList' }
]

/** 评估域共同的输入 */
const EVALUATION_INPUT: ContractRef[] = [
  { key: 'variableId', required: true },
  { key: 'variableName', required: true },
  { key: 'sourceType', required: true },
  { key: 'updateFrequency' },
  { key: 'sampleRows', required: true, note: '无样本数据时脚本口径无法执行' }
]

/** 上游引用能力：效果任务可以吃下评估任务产出的这几个字段，key 与评估产出完全一致 */
const EVAL_OUTPUT_FIELDS = ['quality', 'coverage', 'iv', 'psi']

export const KIND_CONTRACTS: Record<string, KindContract> = {
  'evaluation.routine': {
    kind: 'evaluation.routine',
    version: 'v1',
    input: EVALUATION_INPUT,
    output: [
      { key: 'quality', required: true },
      { key: 'coverage', required: true },
      { key: 'passRate', required: true },
      { key: 'report', required: true },
      { key: 'iv' },
      { key: 'ks' },
      { key: 'psi' },
      { key: 'chartPath' }
    ]
  },
  'evaluation.access': {
    kind: 'evaluation.access',
    version: 'v1',
    input: EVALUATION_INPUT,
    output: [
      { key: 'quality', required: true },
      { key: 'iv', required: true },
      { key: 'report', required: true },
      { key: 'ks' },
      { key: 'chartPath' }
    ]
  },
  'evaluation.recheck': {
    kind: 'evaluation.recheck',
    version: 'v1',
    input: EVALUATION_INPUT,
    output: [
      { key: 'quality', required: true },
      { key: 'psi', required: true },
      { key: 'report', required: true },
      { key: 'iv' }
    ]
  },
  'evaluation.comparison': {
    kind: 'evaluation.comparison',
    version: 'v1',
    input: EVALUATION_INPUT,
    output: [
      { key: 'iv', required: true },
      { key: 'ks', required: true },
      { key: 'report', required: true }
    ]
  },
  'effect.daily_offline_scan': {
    kind: 'effect.daily_offline_scan',
    version: 'v1',
    input: EFFECT_INPUT,
    output: [{ key: 'offlineList', required: true }, ...EFFECT_OUTPUT],
    upstream: { fromKinds: ['evaluation.routine', 'evaluation.recheck'], fields: EVAL_OUTPUT_FIELDS }
  },
  'effect.weekly_online_review': {
    kind: 'effect.weekly_online_review',
    version: 'v1',
    input: EFFECT_INPUT,
    output: [{ key: 'onlineList', required: true }, ...EFFECT_OUTPUT],
    upstream: { fromKinds: ['evaluation.routine', 'evaluation.access'], fields: EVAL_OUTPUT_FIELDS }
  },
  'effect.monthly_report': {
    kind: 'effect.monthly_report',
    version: 'v1',
    input: EFFECT_INPUT,
    output: [{ key: 'offlineList', required: true }, { key: 'onlineList', required: true }, ...EFFECT_OUTPUT],
    upstream: { fromKinds: ['evaluation.routine'], fields: EVAL_OUTPUT_FIELDS }
  },
  'effect.adhoc': {
    kind: 'effect.adhoc',
    version: 'v1',
    input: EFFECT_INPUT,
    // 试算允许不出正式名单，但判定六数与口径快照必须齐备，否则试跑结论不可信
    output: EFFECT_OUTPUT,
    upstream: { fromKinds: ['evaluation.routine', 'evaluation.access', 'evaluation.recheck'], fields: EVAL_OUTPUT_FIELDS }
  }
}

/** 取契约，未登记返回 null，调用方给「未登记契约」状态而不是崩 */
export function contractOf(kind: string): KindContract | null {
  return KIND_CONTRACTS[kind] || null
}

/** 字段引用列表 → 带字典信息的展开项，详情表格直接用 */
export function expandRefs(refs: ContractRef[]): { ref: ContractRef; field: ContractField | undefined }[] {
  return refs.map((ref) => ({ ref, field: CONTRACT_FIELDS[ref.key] }))
}

function buildCheck(issues: ContractIssue[]): ContractCheck {
  const blockers = issues.filter((i) => i.level === 'blocker')
  const warnings = issues.filter((i) => i.level === 'warning')
  return { ok: blockers.length === 0, issues, blockers, warnings }
}

// ==================== 第一段：保存时静态校验（阻断） ====================

/**
 * 评估任务保存校验：
 * 1. 必须有评估对象；
 * 2. 必须至少一个 processor / combined 脚本（visualizer 不能单独当口径）；
 * 3. 契约里 required 的产出字段，必须被所选脚本的 provides 覆盖 —— 这条就是防「脚本改版静默失效」
 */
export function validateEvaluationOnSave(input: {
  kind: string
  name?: string
  targets?: unknown[]
  scripts?: ScriptCapability[]
  /**
   * 平台内置口径（没挂 Python 脚本）：历史评估任务与新建立的常态性评估同口径，
   * 没脚本就看不了 provides，这时候不能拿「脚本没声明」去判一个内置引擎的任务契约不符
   */
  builtinCaliber?: boolean
}): ContractCheck {
  const issues: ContractIssue[] = []
  const contract = contractOf(input.kind)
  if (!contract) {
    return buildCheck([undeclaredIssue(input.kind)])
  }
  if (!input.name || !String(input.name).trim()) {
    issues.push({ code: 'missing_input_field', level: 'blocker', field: 'name', message: '任务名称未填写', anchor: 'targets' })
  }
  if (!input.targets || input.targets.length === 0) {
    issues.push({ code: 'missing_input_field', level: 'blocker', field: 'variableId', message: '至少选择一个评估对象（输入侧缺 variableId / variableName）', anchor: 'targets' })
  }
  const scripts = input.scripts || []
  const hasCaliber = scripts.some((s) => s.type === 'processor' || s.type === 'combined')
  if (!input.builtinCaliber && !scripts.length) {
    issues.push({ code: 'script_required', level: 'blocker', message: '未选择 Python 脚本，评估口径为空', anchor: 'scripts' })
  } else if (!input.builtinCaliber && !hasCaliber) {
    issues.push({
      code: 'script_required',
      level: 'blocker',
      message: `所选 ${scripts.length} 个脚本都只是图表生成器（visualizer），没有一个数据处理口径`,
      anchor: 'scripts'
    })
  }
  const provided = collectProvided(scripts)
  // 只校验本该由脚本产出的字段：平台产出（报告）不能要求脚本提供
  const needFromScript = input.builtinCaliber ? [] : contract.output
  needFromScript
    .filter((ref) => ref.required && CONTRACT_FIELDS[ref.key]?.source === 'script_output')
    .forEach((ref) => {
      if (!provided.has(ref.key)) {
        issues.push({
          code: 'script_provides_missing',
          level: 'blocker',
          field: ref.key,
          message: `契约要求产出「${fieldLabel(ref.key)}」，但所选脚本都没有声明提供该字段`,
          anchor: 'scripts'
        })
      }
    })
  return buildCheck(issues)
}

/**
 * 效果任务保存校验：
 * 1. 名称与调度必填；
 * 2. 输入若引用上游任务，上游必须存在、契约里声明过该引用、且被引用字段属于上游产出
 */
export function validateEffectOnSave(input: {
  kind: string
  name?: string
  scheduleText?: string
  upstreamTaskId?: string
  upstreamField?: string
  /** 上游任务是否存在（由调用方查 store 后传进来，本层不 import store） */
  upstreamExists?: boolean
  /** 上游任务的 kind，用于比对契约允许的 fromKinds */
  upstreamKind?: string
}): ContractCheck {
  const issues: ContractIssue[] = []
  const contract = contractOf(input.kind)
  if (!contract) {
    return buildCheck([undeclaredIssue(input.kind)])
  }
  if (!input.name || !String(input.name).trim()) {
    issues.push({ code: 'missing_input_field', level: 'blocker', field: 'name', message: '任务名称未填写', anchor: 'targets' })
  }
  if (!input.scheduleText || !String(input.scheduleText).trim()) {
    issues.push({ code: 'missing_input_field', level: 'blocker', field: 'scheduleText', message: '调度方式未填写', anchor: 'schedule' })
  }
  if (input.upstreamTaskId) {
    issues.push(...checkUpstreamRef(contract, input.upstreamTaskId, input.upstreamField, input.upstreamExists, input.upstreamKind))
  }
  return buildCheck(issues)
}

function checkUpstreamRef(
  contract: KindContract,
  taskId: string,
  field: string | undefined,
  exists: boolean | undefined,
  upstreamKind: string | undefined
): ContractIssue[] {
  const issues: ContractIssue[] = []
  if (!contract.upstream) {
    issues.push({
      code: 'upstream_field_missing',
      level: 'blocker',
      field: taskId,
      message: `${contract.kind} 不支持引用上游任务产出，请在契约里声明 upstream`,
      anchor: 'upstream'
    })
    return issues
  }
  if (exists === false) {
    issues.push({ code: 'upstream_not_found', level: 'blocker', field: taskId, message: `引用的上游任务 ${taskId} 不存在`, anchor: 'upstream' })
    return issues
  }
  if (upstreamKind && !contract.upstream.fromKinds.includes(upstreamKind)) {
    issues.push({
      code: 'upstream_field_missing',
      level: 'blocker',
      field: taskId,
      message: `上游任务类型不在本契约允许的范围内（只允许：${contract.upstream.fromKinds.join(' / ')}）`,
      anchor: 'upstream'
    })
  }
  if (field && !contract.upstream.fields.includes(field)) {
    issues.push({
      code: 'upstream_field_missing',
      level: 'blocker',
      field,
      message: `被引用的产出字段「${fieldLabel(field)}」不在可引用清单里`,
      anchor: 'upstream'
    })
  }
  return issues
}

/** 合并所选脚本的 provides（多脚本并集，这是评估域允许组合口径的原因） */
function collectProvided(scripts: ScriptCapability[]): Set<string> {
  const set = new Set<string>()
  scripts.forEach((s) => (s.provides || []).forEach((k) => set.add(k)))
  return set
}

function undeclaredIssue(kind: string): ContractIssue {
  return {
    code: 'undeclared_contract',
    level: 'blocker',
    message: `任务类型 ${kind} 尚未登记输入输出契约，不能保存`,
    anchor: 'input'
  }
}

// ==================== 第二段：执行前预检（警告可继续） ====================

/**
 * 执行前预检：只看「这次跑得出不出东西」，不看配置对不对（那是第一段的事）
 * @param sampleUsableRate 可用样本比例（0-1），效果域用剔除口径提前算
 */
export function preflight(input: {
  kind: string
  targetCount: number
  sampleUsableRate?: number
  upstreamFinished?: boolean
  upstreamTaskName?: string
}): ContractCheck {
  const issues: ContractIssue[] = []
  const contract = contractOf(input.kind)
  if (!contract) {
    return buildCheck([undeclaredIssue(input.kind)])
  }
  if (!input.targetCount) {
    issues.push({
      code: 'scope_empty',
      level: 'warning',
      field: 'variableId',
      message: '本次输入为空（没有命中的变量或对象），执行只会留下一条空批次',
      anchor: 'targets'
    })
  }
  if (typeof input.sampleUsableRate === 'number' && input.sampleUsableRate < 0.7) {
    issues.push({
      code: 'data_quality_low',
      level: 'warning',
      field: 'missingRate',
      message: `约 ${Math.round((1 - input.sampleUsableRate) * 100)}% 的变量会因调用量不足或缺失率超限被剔除，结论覆盖面有限`,
      anchor: 'input'
    })
  }
  if (input.upstreamFinished === false) {
    issues.push({
      code: 'upstream_not_finished',
      level: 'warning',
      field: input.upstreamTaskName,
      message: `上游任务「${input.upstreamTaskName || '—'}」还没有成功执行过，引用到的产出字段可能取不到值`,
      anchor: 'upstream'
    })
  }
  return buildCheck(issues)
}

// ==================== 第三段：执行后产出校验（登记） ====================

/**
 * 产出校验：拿实际产出的对象（评估的 metrics / pythonOutputs，效果的 counts / 名单）比对契约
 * 缺 required 字段返回 blocker，页面据此把实例标成 partial，而不是静默成功
 */
export function validateRunOutput(kind: string, produced: Record<string, unknown>): ContractCheck {
  const contract = contractOf(kind)
  if (!contract) {
    return buildCheck([undeclaredIssue(kind)])
  }
  const issues: ContractIssue[] = []
  contract.output.forEach((ref) => {
    const present = produced[ref.key] !== undefined && produced[ref.key] !== null
    if (!present) {
      if (ref.required) {
        issues.push({
          code: 'missing_output_field',
          level: 'blocker',
          field: ref.key,
          message: `契约要求的必产字段「${fieldLabel(ref.key)}」本次没有产出，下游回写 / 名单会缺项`,
          anchor: 'output'
        })
      }
      return
    }
    const expect = CONTRACT_FIELDS[ref.key]?.type
    if (expect === 'list' && !Array.isArray(produced[ref.key]) && typeof produced[ref.key] === 'number') {
      issues.push({ code: 'type_mismatch', level: 'warning', field: ref.key, message: `「${fieldLabel(ref.key)}」应为清单，本次是单个数值`, anchor: 'output' })
    }
  })
  return buildCheck(issues)
}

/** 状态归并：blocker → block，warning → warn，无契约 → undeclared，否则 ok */
export function contractState(check: ContractCheck, declared = true): ContractState {
  if (!declared) {
    return 'undeclared'
  }
  if (check.blockers.length) {
    return 'block'
  }
  if (check.warnings.length) {
    return 'warn'
  }
  return 'ok'
}

/** 徽标 tooltip 用的摘要，最多列两条，避免气泡过长 */
export function issueSummary(issues: ContractIssue[]): string {
  if (!issues.length) {
    return ''
  }
  const head = issues.slice(0, 2).map((i) => i.message).join('；')
  return issues.length > 2 ? `${head}；另有 ${issues.length - 2} 项` : head
}

/** 契约表格里展示一行的完整文案：来源 + 落点 */
export function fieldSourceText(key: string): string {
  const f = CONTRACT_FIELDS[key]
  if (!f) {
    return '未登记字段'
  }
  return sinkLabel(f.sink) === '—' ? sourceLabel(f.source) : `${sourceLabel(f.source)} → ${sinkLabel(f.sink)}`
}

/**
 * 脚本声明表单用的字段候选：
 * 脚本需要的输入只来自台账与样本表，脚本能产出的只有 script_output
 */
export function contractFieldOptions(scope: 'input' | 'output'): { label: string; value: string }[] {
  return CONTRACT_FIELD_LIST
    .filter((f) => (scope === 'input' ? f.source === 'ledger' || f.source === 'sample_table' : f.source === 'script_output'))
    .map((f) => ({ label: `${f.label}（${f.key}）`, value: f.key }))
}

/** 本任务可引用的上游产出字段（新建效果任务时的输入源选项） */
export function upstreamFieldOptions(kind: string): { label: string; value: string }[] {
  return (contractOf(kind)?.upstream?.fields || []).map((key) => ({ label: `${fieldLabel(key)}（${key}）`, value: key }))
}

/** 本任务允许引用哪些任务类型的产出 */
export function upstreamKindOptions(kind: string): string[] {
  return contractOf(kind)?.upstream?.fromKinds || []
}

/** 列表契约筛选下拉：只列四档状态，文案统一取 META */
export function contractStateOptions(): { label: string; value: ContractState }[] {
  return (Object.keys(CONTRACT_STATE_META) as ContractState[]).map((state) => ({
    label: CONTRACT_STATE_META[state].label,
    value: state
  }))
}
