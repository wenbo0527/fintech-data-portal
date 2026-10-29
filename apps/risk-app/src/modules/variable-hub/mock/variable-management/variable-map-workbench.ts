export type VariableInsightType = 'note' | 'question' | 'risk' | 'decision' | 'proposal'
export type VariableInsightStatus = 'open' | 'tracking' | 'resolved'
export type VariableActionType = 'review_request' | 'issue' | 'approval' | 'assessment' | 'change_request'
export type VariableActionStatus = 'pending' | 'in_progress' | 'done'
export type VariableEvidenceKind = 'sql' | 'report' | 'meeting' | 'doc' | 'rule'

export interface VariableInsightMock {
  id: string
  variableId: string
  type: VariableInsightType
  status: VariableInsightStatus
  title: string
  content: string
  author: string
  createdAt: string
  tags?: string[]
}

export interface VariableActionMock {
  id: string
  variableId: string
  sourceInsightId?: string
  actionType: VariableActionType
  status: VariableActionStatus
  title: string
  owner: string
  dueAt: string
  progress: number
}

export interface VariableEvidenceMock {
  id: string
  variableId: string
  kind: VariableEvidenceKind
  title: string
  source: string
  summary: string
  createdAt: string
}

export interface VariableWorkbenchSummary {
  variableId: string
  riskLevel: 'high' | 'medium' | 'low'
  openInsightCount: number
  pendingActionCount: number
  resolvedInsightCount: number
  latestFocus: string
}

const insightMocks: VariableInsightMock[] = [
  {
    id: 'insight-001',
    variableId: 'VAR-0001',
    type: 'decision',
    status: 'resolved',
    title: '核验一致性作为准入核心信号保留',
    content: '已确认进入准入评分卡首层规则，后续只允许在阈值层面调优，不再改口径。',
    author: '风控策略组',
    createdAt: '2026-06-24 10:30:00',
    tags: ['准入', '核心特征']
  },
  {
    id: 'insight-002',
    variableId: 'VAR-0001',
    type: 'risk',
    status: 'open',
    title: '外部服务波动会直接影响一致性结果',
    content: '最近两周上游接口超时率抬升，建议补充降级口径并增加告警联动。',
    author: '数据应用团队',
    createdAt: '2026-06-25 16:20:00',
    tags: ['可用性', '外数']
  },
  {
    id: 'insight-003',
    variableId: 'VAR-0002',
    type: 'question',
    status: 'tracking',
    title: '在网时长是否需要做分箱重构',
    content: '当前区间切分偏粗，模型效果提升空间主要集中在 30-180 天区间。',
    author: '模型团队',
    createdAt: '2026-06-25 14:00:00',
    tags: ['分箱', '模型效果']
  },
  {
    id: 'insight-004',
    variableId: 'VAR-0003',
    type: 'proposal',
    status: 'tracking',
    title: '近30日交易次数可衍生交易活跃度分层',
    content: '建议在现有原子特征基础上继续派生轻度、中度、高活跃三个离散层级特征。',
    author: '风险数据团队',
    createdAt: '2026-06-26 09:10:00',
    tags: ['衍生特征', '活跃度']
  },
  {
    id: 'insight-005',
    variableId: 'VAR-0003',
    type: 'risk',
    status: 'open',
    title: '待审核状态下已被多个方案提前引用',
    content: '特征尚未完成审批，但已经出现在 2 个试验方案中，存在口径漂移风险。',
    author: '数据治理组',
    createdAt: '2026-06-26 11:40:00',
    tags: ['审批', '口径风险']
  },
  {
    id: 'insight-006',
    variableId: 'VAR-0004',
    type: 'note',
    status: 'resolved',
    title: '历史征信特征转入归档观察',
    content: '当前特征已停用，但仍保留历史评估记录与模型解释链路。',
    author: '征信团队',
    createdAt: '2026-06-20 15:00:00',
    tags: ['归档']
  }
]

const actionMocks: VariableActionMock[] = [
  {
    id: 'action-001',
    variableId: 'VAR-0001',
    sourceInsightId: 'insight-002',
    actionType: 'change_request',
    status: 'in_progress',
    title: '补充外部核验服务降级方案',
    owner: '数据平台组',
    dueAt: '2026-06-30',
    progress: 60
  },
  {
    id: 'action-002',
    variableId: 'VAR-0002',
    sourceInsightId: 'insight-003',
    actionType: 'assessment',
    status: 'pending',
    title: '在网时长分箱效果复评',
    owner: '模型策略组',
    dueAt: '2026-07-02',
    progress: 15
  },
  {
    id: 'action-003',
    variableId: 'VAR-0003',
    sourceInsightId: 'insight-005',
    actionType: 'approval',
    status: 'pending',
    title: '交易次数特征正式准入审批',
    owner: '资产治理委员会',
    dueAt: '2026-06-29',
    progress: 10
  },
  {
    id: 'action-004',
    variableId: 'VAR-0003',
    sourceInsightId: 'insight-004',
    actionType: 'review_request',
    status: 'in_progress',
    title: '活跃度衍生方案评审',
    owner: '风险数据团队',
    dueAt: '2026-07-01',
    progress: 45
  }
]

const evidenceMocks: VariableEvidenceMock[] = [
  {
    id: 'evidence-001',
    variableId: 'VAR-0001',
    kind: 'report',
    title: '外数核验效果评估报告',
    source: 'risk-app / 评估报告',
    summary: '近 30 天命中率和坏账区分度保持稳定，可继续沿用。',
    createdAt: '2026-06-24 18:00:00'
  },
  {
    id: 'evidence-002',
    variableId: 'VAR-0001',
    kind: 'rule',
    title: '准入规则片段',
    source: '准入规则集 V3',
    summary: '一致性结果为 mismatch 时直接触发高风险兜底规则。',
    createdAt: '2026-06-25 09:20:00'
  },
  {
    id: 'evidence-003',
    variableId: 'VAR-0002',
    kind: 'sql',
    title: '在网时长特征分布 SQL',
    source: 'analysis/mobile_profile.sql',
    summary: '用于抽样检验 30-180 天区间的客群占比和分布漂移。',
    createdAt: '2026-06-25 17:30:00'
  },
  {
    id: 'evidence-004',
    variableId: 'VAR-0003',
    kind: 'meeting',
    title: '特征准入评审纪要',
    source: '特征治理周会',
    summary: '要求补齐审批单、标签和维度口径后再进入正式发布。',
    createdAt: '2026-06-26 10:00:00'
  },
  {
    id: 'evidence-005',
    variableId: 'VAR-0004',
    kind: 'doc',
    title: '历史征信特征归档说明',
    source: 'docs/特征归档说明',
    summary: '保留历史解释链路，不再进入新增模型训练集。',
    createdAt: '2026-06-20 16:00:00'
  }
]

const focusMap: Record<string, string> = {
  'VAR-0001': '服务波动与降级口径',
  'VAR-0002': '分箱重构与效果复评',
  'VAR-0003': '审批补齐与衍生方案评审',
  'VAR-0004': '历史归档与解释复用'
}

export const listVariableEvidence = (variableId: string) =>
  evidenceMocks.filter((item) => item.variableId === variableId)

const INSIGHT_STORAGE_KEY = 'variable.workbench.insight.extra'
const ACTION_STORAGE_KEY = 'variable.workbench.action.extra'

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function readExtraInsights(): VariableInsightMock[] {
  return safeParse<VariableInsightMock[]>(localStorage.getItem(INSIGHT_STORAGE_KEY), [])
}

function writeExtraInsights(list: VariableInsightMock[]) {
  localStorage.setItem(INSIGHT_STORAGE_KEY, JSON.stringify(list))
}

function readExtraActions(): VariableActionMock[] {
  return safeParse<VariableActionMock[]>(localStorage.getItem(ACTION_STORAGE_KEY), [])
}

function writeExtraActions(list: VariableActionMock[]) {
  localStorage.setItem(ACTION_STORAGE_KEY, JSON.stringify(list))
}

function nowFmt() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ')
}

function nextInsightId(): string {
  const all = [...readExtraInsights(), ...insightMocks]
  const nums = all
    .map((i) => String(i.id))
    .filter((id) => id.startsWith('insight-'))
    .map((id) => Number(id.slice(8)))
    .filter((n) => !Number.isNaN(n))
  return `insight-${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, '0')}`
}

function nextActionId(): string {
  const all = [...readExtraActions(), ...actionMocks]
  const nums = all
    .map((i) => String(i.id))
    .filter((id) => id.startsWith('action-'))
    .map((id) => Number(id.slice(7)))
    .filter((n) => !Number.isNaN(n))
  return `action-${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, '0')}`
}

export const listVariableInsights = (variableId: string) =>
  [...readExtraInsights(), ...insightMocks]
    .filter((item) => item.variableId === variableId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

export const listVariableActions = (variableId: string) =>
  [...readExtraActions(), ...actionMocks]
    .filter((item) => item.variableId === variableId)
    .sort((a, b) => b.dueAt.localeCompare(a.dueAt))

export const createVariableInsightMock = (payload: {
  variableId: string
  type: VariableInsightType
  title: string
  content: string
  author?: string
}) => {
  const now = nowFmt()
  const nextInsight: VariableInsightMock = {
    id: nextInsightId(),
    variableId: payload.variableId,
    type: payload.type,
    status: 'open',
    title: payload.title,
    content: payload.content,
    author: payload.author || '当前用户',
    createdAt: now,
    tags: ['地图记录']
  }
  const extra = readExtraInsights()
  writeExtraInsights([nextInsight, ...extra])
  return nextInsight
}

/**
 * 高风险特征直接生成评估任务
 * 接入评估任务中心
 */
export const createVariableEvaluationAction = (payload: {
  variableId: string
  variableName: string
  sourceType: 'internal' | 'credit' | 'external'
  dataSourceName?: string
}) => {
  const now = nowFmt()
  const action: VariableActionMock = {
    id: nextActionId(),
    variableId: payload.variableId,
    actionType: 'assessment',
    status: 'pending',
    title: `高风险节点评估：${payload.variableName}`,
    owner: 'Demo 用户',
    dueAt: now,
    progress: 0
  }
  const extra = readExtraActions()
  writeExtraActions([action, ...extra])
  return action
}

/**
 * 把特征地图的 insight 摘要同步为探索过程审计事件
 * 思路：复用 ExploreStore.addAuditEvent；调用方传入 topicId（如有）即可
 */
export const syncInsightToAudit = (insight: VariableInsightMock, topicId?: string) => {
  // 避免在 workbench 文件中反向依赖 explore-store；通过 window 全局事件传递
  const event = new CustomEvent('dmt:variable-insight-audit', {
    detail: { insight, topicId }
  })
  window.dispatchEvent(event)
}

export const buildVariableWorkbenchSummary = (variableIds: string[]): Record<string, VariableWorkbenchSummary> => {
  return variableIds.reduce<Record<string, VariableWorkbenchSummary>>((acc, variableId) => {
    const insights = listVariableInsights(variableId)
    const actions = listVariableActions(variableId)
    const openInsightCount = insights.filter((item) => item.status !== 'resolved').length
    const resolvedInsightCount = insights.filter((item) => item.status === 'resolved').length
    const pendingActionCount = actions.filter((item) => item.status !== 'done').length
    const highRisk = insights.some((item) => item.type === 'risk' && item.status !== 'resolved')
    const mediumRisk = pendingActionCount > 0 || insights.some((item) => item.type === 'question')
    acc[variableId] = {
      variableId,
      riskLevel: highRisk ? 'high' : (mediumRisk ? 'medium' : 'low'),
      openInsightCount,
      pendingActionCount,
      resolvedInsightCount,
      latestFocus: focusMap[variableId] || '补充上下游关系与评估证据'
    }
    return acc
  }, {})
}

/** 台账视角四数 + 治理焦点列表（聚合口径全部留在 mock 层） */
export interface VariableWorkbenchAggregate {
  /** 特征总数 */
  total: number
  /** 高风险特征数 */
  high: number
  /** 待处理动作数 */
  pending: number
  /** 已形成结论数 */
  resolved: number
  /** 治理焦点：高风险或存在待处理动作，按待处理数降序取前 5 */
  focusItems: VariableWorkbenchSummary[]
}

/**
 * 工作台聚合：把「四张数字卡 + 治理焦点前 5」的计算从页面里下沉到 mock 层
 * 页面与组件只负责渲染，不再自行 filter / reduce / sort / slice
 * @param variableIds 台账在册变量 ID 列表
 * @returns 四数与焦点列表
 */
export const summarizeWorkbench = (variableIds: string[]): VariableWorkbenchAggregate => {
  const summaries = Object.values(buildVariableWorkbenchSummary(variableIds))
  return {
    total: variableIds.length,
    high: summaries.filter((item) => item.riskLevel === 'high').length,
    pending: summaries.reduce((acc, item) => acc + item.pendingActionCount, 0),
    resolved: summaries.reduce((acc, item) => acc + item.resolvedInsightCount, 0),
    focusItems: summaries
      .filter((item) => item.riskLevel === 'high' || item.pendingActionCount > 0)
      .sort((a, b) => b.pendingActionCount - a.pendingActionCount)
      .slice(0, 5)
  }
}
