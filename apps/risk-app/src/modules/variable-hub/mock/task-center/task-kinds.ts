/**
 * 任务管理 · 任务类型注册表（task kind）
 *
 * 存在意义：评估域与效果域的任务类型此前各自散在两个面板里硬编码字典，
 * 合并成一张任务列表后，「类型 → 展示文案 / 详情载体 / 可用操作 / 创建入口」必须只有一个事实源，
 * 所以新增一种任务类型只在这里加一条注册项，列表与新建入口不用改。
 *
 * 约束：
 * 1. 本文件只做元数据与字典，不 import 任何 store（避免与聚合层互相引用）；
 * 2. kind = `${domain}.${域内原始类型值}`，与各自 store 的 type / taskType 字段一一对应；
 * 3. 统一状态只在这里定义，聚合层负责把两域原始状态映射进来。
 */

/** 任务所属业务域，与执行记录的 RunDomain 同口径 */
export type TaskDomain = 'evaluation' | 'effect'

/** 两域任务状态归一后的统一状态 */
export type UnifiedTaskStatus =
  | 'pending'
  | 'scheduled'
  | 'running'
  | 'success'
  | 'partial'
  | 'failed'
  | 'paused'

/** 任务详情载体：评估走页面内抽屉（历史沿用），效果走独立路由页 */
export interface TaskDetailTarget {
  mode: 'route' | 'drawer'
  /** mode=route 时给出跳转路径生成器 */
  path?: (id: string) => string
}

/** 一种任务类型的完整注册信息 */
export interface TaskKindDescriptor {
  /** 全局唯一：`${domain}.${typeValue}` */
  kind: string
  domain: TaskDomain
  domainLabel: string
  /** 域内原始类型值（EvaluationTaskMock.taskType / EffectTask.type） */
  typeValue: string
  /** 类型中文名（列表标签与新建卡片标题共用） */
  label: string
  /** 新建类型卡片上的说明文案 */
  desc: string
  /** 卡片图标文字（与工作台卡片同风格，不引图标库） */
  iconText: string
  /** 卡片主题色 */
  accent: string
  /** 列表类型标签颜色 */
  tagColor: string
  /** 是否支持从「新建任务」入口创建 */
  creatable: boolean
  /** 新建路径（creatable 必填） */
  createPath?: string
  /** 编辑路径（不支持编辑则省略） */
  editPath?: (id: string) => string
  detail: TaskDetailTarget
  /** 列表操作列与详情页按钮的能力开关 */
  actions: {
    /** 立即执行 */
    run: boolean
    /** 启用 / 停用 */
    toggle: boolean
    /** 判定配置（效果域任务级阈值与推送；评估域的判定口径在所选 Python 脚本里） */
    caliber: boolean
    remove: boolean
  }
}

/** 业务域展示名（与 run-record 聚合层保持一致） */
export const TASK_DOMAIN_LABELS: Record<TaskDomain, string> = {
  evaluation: '特征评估',
  effect: '效果运营'
}

/** 统一状态字典：文案 + 标签色，页面不得自行拼状态文字 */
export const UNIFIED_STATUS_META: Record<UnifiedTaskStatus, { label: string; color: string }> = {
  pending: { label: '待执行', color: 'gold' },
  scheduled: { label: '已调度', color: 'cyan' },
  running: { label: '执行中', color: 'arcoblue' },
  success: { label: '执行成功', color: 'green' },
  partial: { label: '部分成功', color: 'orange' },
  failed: { label: '执行失败', color: 'red' },
  paused: { label: '已停用', color: 'gray' }
}

/** 评估域原始状态 → 统一状态 */
export const EVALUATION_STATUS_MAP: Record<string, UnifiedTaskStatus> = {
  pending: 'pending',
  running: 'running',
  completed: 'success',
  failed: 'failed',
  scheduled: 'scheduled'
}

/** 效果域原始状态 → 统一状态（同名字段直接透传，保留映射表便于后续扩展） */
export const EFFECT_STATUS_MAP: Record<string, UnifiedTaskStatus> = {
  pending: 'pending',
  running: 'running',
  success: 'success',
  partial: 'partial',
  failed: 'failed',
  paused: 'paused'
}

/** 最近一次执行结果 → 统一状态（只取终态三档） */
export const RUN_RESULT_MAP: Record<string, UnifiedTaskStatus> = {
  success: 'success',
  partial: 'partial',
  failed: 'failed'
}

/** 评估域调度频率字典（列表「调度」列与详情抽屉共用） */
export const SCHEDULE_FREQUENCY_LABELS: Record<string, string> = {
  daily: '每日',
  weekly: '每周',
  monthly: '每月',
  manual: '手动'
}

/** 调度频率 → 文案，未知值原样返回，不让页面自己兜字典 */
export function frequencyLabel(value?: string): string {
  return SCHEDULE_FREQUENCY_LABELS[value || ''] || value || '—'
}

const EVALUATION_DETAIL: TaskDetailTarget = { mode: 'drawer' }
const EFFECT_DETAIL: TaskDetailTarget = {
  mode: 'route',
  path: (id) => `/tasks/effect/${id}`
}

/**
 * 全部任务类型注册表。
 * 评估域当前只有「常态性评估」开放新建（一次性评估沿用旧入口，见 createPath 缺省）；
 * 效果域四类都开放，且都带任务级判定配置。
 */
export const TASK_KINDS: TaskKindDescriptor[] = [
  {
    kind: 'evaluation.routine',
    domain: 'evaluation',
    domainLabel: TASK_DOMAIN_LABELS.evaluation,
    typeValue: 'routine',
    label: '常态性评估',
    desc: '按调度周期对特征跑 Python 口径，逐轮留下执行实例与报告',
    iconText: '常',
    accent: '#165dff',
    tagColor: 'arcoblue',
    creatable: true,
    createPath: '/tasks/evaluation/create',
    editPath: (id) => `/tasks/evaluation/edit/${id}`,
    detail: EVALUATION_DETAIL,
    actions: { run: true, toggle: true, caliber: false, remove: false }
  },
  {
    kind: 'evaluation.access',
    domain: 'evaluation',
    domainLabel: TASK_DOMAIN_LABELS.evaluation,
    typeValue: 'access',
    label: '准入评估',
    desc: '新特征准入前的一次性口径评估',
    iconText: '准',
    accent: '#00b42a',
    tagColor: 'green',
    creatable: false,
    detail: EVALUATION_DETAIL,
    actions: { run: true, toggle: false, caliber: false, remove: false }
  },
  {
    kind: 'evaluation.recheck',
    domain: 'evaluation',
    domainLabel: TASK_DOMAIN_LABELS.evaluation,
    typeValue: 'recheck',
    label: '复评任务',
    desc: '对已上线特征做周期性复核',
    iconText: '复',
    accent: '#ff7d00',
    tagColor: 'orange',
    creatable: false,
    detail: EVALUATION_DETAIL,
    actions: { run: true, toggle: false, caliber: false, remove: false }
  },
  {
    kind: 'evaluation.comparison',
    domain: 'evaluation',
    domainLabel: TASK_DOMAIN_LABELS.evaluation,
    typeValue: 'comparison',
    label: '对比评估',
    desc: '多个特征或口径横向对比',
    iconText: '比',
    accent: '#722ed1',
    tagColor: 'purple',
    creatable: false,
    detail: EVALUATION_DETAIL,
    actions: { run: true, toggle: false, caliber: false, remove: false }
  },
  {
    kind: 'effect.daily_offline_scan',
    domain: 'effect',
    domainLabel: TASK_DOMAIN_LABELS.effect,
    typeValue: 'daily_offline_scan',
    label: '每日汰换扫描',
    desc: '按任务阈值扫出建议汰换名单，可推送协作对象',
    iconText: '汰',
    accent: '#f53f3f',
    tagColor: 'red',
    creatable: true,
    createPath: '/tasks/effect/create?type=daily_offline_scan',
    detail: EFFECT_DETAIL,
    actions: { run: true, toggle: true, caliber: true, remove: false }
  },
  {
    kind: 'effect.weekly_online_review',
    domain: 'effect',
    domainLabel: TASK_DOMAIN_LABELS.effect,
    typeValue: 'weekly_online_review',
    label: '每周推荐复核',
    desc: '复核推荐名单，确认继续可用的变量',
    iconText: '荐',
    accent: '#00b42a',
    tagColor: 'green',
    creatable: true,
    createPath: '/tasks/effect/create?type=weekly_online_review',
    detail: EFFECT_DETAIL,
    actions: { run: true, toggle: true, caliber: true, remove: false }
  },
  {
    kind: 'effect.monthly_report',
    domain: 'effect',
    domainLabel: TASK_DOMAIN_LABELS.effect,
    typeValue: 'monthly_report',
    label: '月度效果报告',
    desc: '按月汇总效果指数分布与名单变化，形成报告口径',
    iconText: '报',
    accent: '#722ed1',
    tagColor: 'purple',
    creatable: true,
    createPath: '/tasks/effect/create?type=monthly_report',
    detail: EFFECT_DETAIL,
    actions: { run: true, toggle: true, caliber: true, remove: false }
  },
  {
    kind: 'effect.adhoc',
    domain: 'effect',
    domainLabel: TASK_DOMAIN_LABELS.effect,
    typeValue: 'adhoc',
    label: '临时试算',
    desc: '手动触发一次抽样试算，验证阈值松紧再定周期任务',
    iconText: '试',
    accent: '#ff7d00',
    tagColor: 'orange',
    creatable: true,
    createPath: '/tasks/effect/create?type=adhoc',
    detail: EFFECT_DETAIL,
    actions: { run: true, toggle: true, caliber: true, remove: false }
  }
]

/** kind → 描述符 */
const KIND_INDEX: Record<string, TaskKindDescriptor> = TASK_KINDS.reduce((acc, item) => {
  acc[item.kind] = item
  return acc
}, {} as Record<string, TaskKindDescriptor>)

/** 未注册类型的兜底描述符：保证列表不会因为新类型崩掉，同时把问题暴露出来 */
const FALLBACK: TaskKindDescriptor = {
  kind: 'unknown',
  domain: 'effect',
  domainLabel: '未归类',
  typeValue: 'unknown',
  label: '未知类型',
  desc: '该任务类型尚未登记，请按口径补充注册',
  iconText: '?',
  accent: '#86909c',
  tagColor: 'gray',
  creatable: false,
  detail: { mode: 'drawer' },
  actions: { run: false, toggle: false, caliber: false, remove: false }
}

/** 按 kind 取描述符 */
export function kindOf(kind: string): TaskKindDescriptor {
  return KIND_INDEX[kind] || { ...FALLBACK, kind }
}

/** 按「域 + 原始类型值」取描述符，取不到时按域给通用项 */
export function resolveKind(domain: TaskDomain, typeValue: string): TaskKindDescriptor {
  const exact = KIND_INDEX[`${domain}.${typeValue}`]
  if (exact) {
    return exact
  }
  return {
    ...FALLBACK,
    kind: `${domain}.${typeValue}`,
    domain,
    domainLabel: TASK_DOMAIN_LABELS[domain],
    typeValue,
    label: typeValue || '未知类型',
    detail: domain === 'effect' ? EFFECT_DETAIL : EVALUATION_DETAIL
  }
}

/** 新建入口可选的类型（按域分组渲染） */
export function creatableKinds(): TaskKindDescriptor[] {
  return TASK_KINDS.filter((k) => k.creatable)
}

/** 列表筛选用的类型下拉：只列真实存在的 kind 也可以用全量注册表 */
export function kindOptions(): { label: string; value: string }[] {
  return TASK_KINDS.map((k) => ({ label: `${k.domainLabel} · ${k.label}`, value: k.kind }))
}

/** 域下拉 */
export function domainOptions(): { label: string; value: TaskDomain }[] {
  return (Object.keys(TASK_DOMAIN_LABELS) as TaskDomain[]).map((d) => ({
    label: TASK_DOMAIN_LABELS[d],
    value: d
  }))
}

/** 统一状态 → 文案 */
export function unifiedStatusLabel(status: UnifiedTaskStatus): string {
  return UNIFIED_STATUS_META[status]?.label || status
}

/** 统一状态 → 标签色 */
export function unifiedStatusColor(status: UnifiedTaskStatus): string {
  return UNIFIED_STATUS_META[status]?.color || 'gray'
}
