/**
 * ============================================================
 * classify-change-store —— 字段分级变更申请单（先审后发）
 * ============================================================
 * 与 permission-store 的关系（刻意合并，不另起一套）：
 *   · 状态词汇/配色直接复用 permission-store 的 PermStatus + PERM_STATUS_LABEL/COLOR；
 *   · 审批流枚举复用 PermFlow（本模块只用到 approval / approval_dba 两档）；
 *   · 审批 UI 复用「表权限审批台」的第三个 Tab，本文件只负责状态机；
 *   · 通知走同款 NotificationAPI（category=审批通知 / CAT003），铃铛与通知中心零改造生效。
 *
 * 分级驱动审批流（与 SENSITIVITY_POLICY 同构，但分级词汇是 L1–L4，不做跨体系映射）：
 *   L1 / L2 → approval       治理员单审，通过即写入分级数据（上线生效）
 *   L3 / L4 → approval_dba   治理员通过 → 管理员复核队列 → 复核通过才落地
 *   驳回 / 撤回一律不落地，diff 只留在单上留痕。
 *
 * 依赖方向：本文件 → classify-store（落地）；classify-store 不回依赖本文件。
 * ============================================================
 */
import { ref, computed } from 'vue'
import {
  type PermFlow,
  type PermStatus,
  PERM_STATUS_LABEL,
  PERM_STATUS_COLOR
} from './permission-store'
import { CLASSIFY_DIMS } from './classify-constants'
import { ClassifyStore } from './classify-store'
import { NotificationAPI } from '../api/notification'
import type { ClassifyField, SensitivityLevel } from './classify-types'
import type { ClassifyAuth } from './classify-permission'

export type ClassifyChangeKind = 'single' | 'batch'

/** 单个字段的变更前后快照（只装变更到的维度，未变更的维度不进单，避免噪音） */
export interface ClassifyFieldDiff {
  field_name: string
  field_comment: string
  from: Partial<ClassifyField>
  to: Partial<ClassifyField>
}

export interface ClassifyChangeHistoryItem {
  ts: string
  actor: string
  action: string
  from: PermStatus
  to: PermStatus
  comment?: string
}

export interface ClassifyChangeApply {
  id: string
  systemId: string
  systemName: string
  schema: string
  tableName: string
  tableCnName: string
  applicant: string
  applicantDept: string
  kind: ClassifyChangeKind
  diffs: ClassifyFieldDiff[]
  /** 变更后命中的最高敏感级别，决定走单审还是双审 */
  maxLevelAfter: SensitivityLevel
  flow: PermFlow
  policyNote: string
  reason: string
  status: PermStatus
  approver?: string
  approvalComment?: string
  dbaConfirmer?: string
  dbaComment?: string
  createdAt: string
  updatedAt: string
  /** 生效时间：审批通过并写入分级数据的时刻 */
  effectiveAt?: string
  history: ClassifyChangeHistoryItem[]
}

/** 分级 → 审批流策略（查表挡板） */
export const CLASSIFY_LEVEL_POLICY: Record<SensitivityLevel, { flow: PermFlow; label: string; desc: string }> = {
  L1: { flow: 'approval', label: '治理员单审', desc: '公开数据分级变更，治理员审批通过后立即生效。' },
  L2: { flow: 'approval', label: '治理员单审', desc: '内部数据分级变更，治理员审批通过后立即生效。' },
  L3: { flow: 'approval_dba', label: '治理员 + 管理员复核', desc: '秘密数据，需二级复核后方可上线。' },
  L4: { flow: 'approval_dba', label: '治理员 + 管理员复核', desc: '机密数据，需二级复核后方可上线。' }
}

/** 级别高低比较（L4 最高），未定级按最低处理 */
function levelRank(lv: SensitivityLevel | ''): number {
  return lv === '' ? 0 : Number(lv.slice(1))
}

/** 取变更后命中的最高级别：决定整单的审批严格度 */
export function maxLevelOfDiffs(diffs: ClassifyFieldDiff[]): SensitivityLevel {
  let top: SensitivityLevel | '' = ''
  for (const d of diffs) {
    const lv = d.to.sensitivity_level
    if (lv && levelRank(lv) > levelRank(top)) top = lv
  }
  // 全是「降为待分级」这类无级别变更时，按 L2 走单审即可
  return top === '' ? 'L2' : top
}

/**
 * 由「编辑前字段 + 编辑后字段」算 diff。
 * 无实际变更返回 null，页面据此拦截提交（避免产生空单）。
 */
export function buildFieldDiff(before: ClassifyField, after: ClassifyField): ClassifyFieldDiff | null {
  const from: Partial<ClassifyField> = {}
  const to: Partial<ClassifyField> = {}
  for (const dim of CLASSIFY_DIMS) {
    const k = dim.key
    if (before[k] !== after[k]) {
      from[k] = before[k] as never
      to[k] = after[k] as never
    }
  }
  if (!Object.keys(to).length) return null
  return { field_name: before.field_name, field_comment: before.field_comment, from, to }
}

/** 批量建议值 → diff（批量上传分级分类走这条路径） */
export function buildBatchDiffs(
  systemId: string,
  schema: string,
  tableName: string,
  suggestions: Array<Partial<ClassifyField> & { field_name: string }>
): ClassifyFieldDiff[] {
  const table = ClassifyStore.tableOf(systemId, schema, tableName)
  if (!table) return []
  const diffs: ClassifyFieldDiff[] = []
  for (const s of suggestions) {
    const before = table.fields.find(f => f.field_name === s.field_name)
    if (!before) continue
    const d = buildFieldDiff(before, { ...before, ...s } as ClassifyField)
    if (d) diffs.push(d)
  }
  return diffs
}

function nowStr(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ')
}

function notify(title: string, content: string, priority: 'high' | 'medium' | 'low' = 'medium') {
  NotificationAPI.createNotification({
    title, content, category: '审批通知', categoryId: 'CAT003',
    priority, status: 'published', publishTime: nowStr(), expireTime: '2099-12-31 23:59:59',
    source: '分级变更审批引擎', createdBy: '系统', targetUsers: '全体用户', important: false, isTop: false
  }).catch(() => { /* noop */ })
}

function pushHistory(c: ClassifyChangeApply, actor: string, action: string, from: PermStatus, to: PermStatus, comment?: string) {
  c.history.unshift({ ts: nowStr(), actor, action, from, to, comment })
}

// ---------------- 种子 ----------------
function buildSeedChanges(): ClassifyChangeApply[] {
  const mk = (
    id: string, systemId: string, schema: string, tableName: string,
    fieldNames: string[], level: SensitivityLevel, opts: {
      applicant: string; dept: string; reason: string; status: PermStatus; created: string;
      approver?: string; comment?: string; dba?: string; kind?: ClassifyChangeKind
    }
  ): ClassifyChangeApply => {
    const sys = ClassifyStore.systemById(systemId)
    const table = sys?.tables.find(t => t.schema === schema && t.table_name === tableName)
    const to = (f?: { field_name: string; field_comment: string }) => ({
      field_name: f?.field_name ?? '',
      field_comment: f?.field_comment ?? '',
      from: { sensitivity_level: '' as const } as Partial<ClassifyField>,
      // 种子只演示「补全定级」这一类最常见的变更，单维度 diff 足够审批人判断
      to: { sensitivity_level: level } as Partial<ClassifyField>
    })
    const diffs = fieldNames.map(n => to(table?.fields.find(f => f.field_name === n)))
    const { flow } = CLASSIFY_LEVEL_POLICY[level]
    const c: ClassifyChangeApply = {
      id,
      systemId,
      systemName: sys?.name ?? systemId,
      schema,
      tableName,
      tableCnName: table?.table_comment ?? tableName,
      applicant: opts.applicant,
      applicantDept: opts.dept,
      kind: opts.kind ?? 'single',
      diffs,
      maxLevelAfter: level,
      flow,
      policyNote: `${level} · ${CLASSIFY_LEVEL_POLICY[level].label}：${CLASSIFY_LEVEL_POLICY[level].desc}`,
      reason: opts.reason,
      status: opts.status,
      approver: opts.approver,
      approvalComment: opts.comment,
      dbaConfirmer: opts.dba,
      createdAt: opts.created,
      updatedAt: opts.created,
      effectiveAt: opts.status === 'approved' ? opts.created : undefined,
      history: [{ ts: opts.created, actor: opts.applicant, action: '提交变更', from: 'draft', to: 'pending' }]
    }
    if (opts.status === 'dba_confirming') {
      c.history.unshift({ ts: opts.created, actor: opts.approver || '张治理', action: '治理员通过，转管理员复核', from: 'pending', to: 'dba_confirming', comment: opts.comment })
    }
    if (opts.status === 'rejected') {
      c.history.unshift({ ts: opts.created, actor: opts.approver || '张治理', action: '审批驳回', from: 'pending', to: 'rejected', comment: opts.comment })
    }
    return c
  }

  return [
    mk('CG-001', 'SYS-003', 'coll_db', 't_visit_record', ['visit_time'], 'L2', {
      applicant: '王十二', dept: '催收运营组', status: 'pending', created: '2026-11-18 09:20:00',
      reason: '外访时间仅作业留痕，建议按 L1/L2 定级后恢复该表覆盖率统计'
    }),
    mk('CG-002', 'SYS-004', 'cs_db', 't_call_recording', ['rec_duration'], 'L3', {
      applicant: '马十八', dept: '客服中心', status: 'dba_confirming', created: '2026-11-17 15:40:00',
      approver: '张治理', comment: '录音时长可反推通话内容，同意按 L3', dba: 'DBA-刘工',
      reason: '质检需要按录音时长做工作量分析，涉及客户通话数据，按规范申请定级'
    }),
    mk('CG-003', 'SYS-001', 'hive_dw', 'dwd_order_info', ['device_id'], 'L4', {
      applicant: '李四', dept: '数据团队', status: 'rejected', created: '2026-11-15 11:05:00',
      approver: '张治理', comment: '设备号属终端标识，请按客户信息目录重新定级并补全四级目录',
      reason: '设备号拟按机密数据定级，用于反作弊关联'
    })
  ]
}

// ---------------- 状态 ----------------
const LS_KEY = 'dca-classify-change-v1'

function load(): ClassifyChangeApply[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length) return parsed as ClassifyChangeApply[]
    }
  } catch { /* 脏数据回落种子 */ }
  return buildSeedChanges()
}

const changes = ref<ClassifyChangeApply[]>(load())

function persist() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(changes.value))
  } catch { /* 配额忽略 */ }
}

let seq = changes.value.reduce((m, c) => {
  const n = Number(c.id.replace(/\D/g, ''))
  return Number.isFinite(n) ? Math.max(m, n) : m
}, 0)

function nextId(): string {
  seq += 1
  return 'CG-' + String(seq).padStart(3, '0')
}

/** 审批通过 → 落地分级数据（先审后发的唯一出口） */
function effectuate(c: ClassifyChangeApply, actor: string) {
  c.status = 'approved'
  c.effectiveAt = nowStr()
  c.updatedAt = nowStr()
  ClassifyStore.applyApprovedChange({
    systemId: c.systemId,
    schema: c.schema,
    tableName: c.tableName,
    diffs: c.diffs,
    actor
  })
}

export const ClassifyChangeStore = {
  all(): ClassifyChangeApply[] { return changes.value },
  byId(id: string): ClassifyChangeApply | undefined { return changes.value.find(x => x.id === id) },

  /** 治理员待办：pending（单审 + 双审第一级） */
  pendingForAdmin(): ClassifyChangeApply[] {
    return changes.value.filter(x => x.status === 'pending')
  },
  /** 管理员复核待办：双审第二级 */
  pendingForDba(): ClassifyChangeApply[] {
    return changes.value.filter(x => x.status === 'dba_confirming')
  },
  /** 我发起的变更 */
  myApplies(actor: string): ClassifyChangeApply[] {
    return changes.value.filter(x => x.applicant === actor)
  },
  /** 审批台 Tab 角标 + 身份待办：只读身份也可见在途单数量（只用于展示，不给审批权） */
  countFor(_auth: ClassifyAuth): number {
    return ClassifyChangeStore.pendingForAdmin().length + ClassifyChangeStore.pendingForDba().length
  },

  /** 某表在途变更单（tables / table-detail 打「审批中」标用） */
  pendingOfTable(schema: string, tableName: string): ClassifyChangeApply[] {
    return changes.value.filter(
      x => x.schema === schema && x.tableName === tableName && (x.status === 'pending' || x.status === 'dba_confirming')
    )
  },

  /** 某表最近一次被驳回的变更单（用于「变更被驳回」提示） */
  latestRejected(schema: string, tableName: string): ClassifyChangeApply | undefined {
    return changes.value
      .filter(x => x.schema === schema && x.tableName === tableName && x.status === 'rejected')
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]
  },

  /** 某字段是否在在途单里（详情页字段行「审批中」标） */
  isFieldInFlight(schema: string, tableName: string, fieldName: string): boolean {
    return ClassifyChangeStore.pendingOfTable(schema, tableName).some(c => c.diffs.some(d => d.field_name === fieldName))
  },

  /** 提交变更单：L1/L2 直接进治理员待审，L3/L4 同（复核环节在通过后才产生） */
  submit(input: {
    systemId: string; schema: string; tableName: string;
    diffs: ClassifyFieldDiff[]; reason: string; applicant: string; applicantDept?: string; kind?: ClassifyChangeKind
  }): ClassifyChangeApply {
    if (!input.diffs.length) throw new Error('没有检测到字段变更，无需提交审批')
    const sys = ClassifyStore.systemById(input.systemId)
    const table = sys?.tables.find(t => t.schema === input.schema && t.table_name === input.tableName)
    const maxLevelAfter = maxLevelOfDiffs(input.diffs)
    const { flow, label, desc } = CLASSIFY_LEVEL_POLICY[maxLevelAfter]
    const c: ClassifyChangeApply = {
      id: nextId(),
      systemId: input.systemId,
      systemName: sys?.name ?? input.systemId,
      schema: input.schema,
      tableName: input.tableName,
      tableCnName: table?.table_comment ?? input.tableName,
      applicant: input.applicant,
      applicantDept: input.applicantDept || '未填写',
      kind: input.kind ?? 'single',
      diffs: input.diffs,
      maxLevelAfter,
      flow,
      policyNote: `${maxLevelAfter} · ${label}：${desc}`,
      reason: input.reason,
      status: 'pending',
      createdAt: nowStr(),
      updatedAt: nowStr(),
      history: [{ ts: nowStr(), actor: input.applicant, action: '提交变更', from: 'draft', to: 'pending' }]
    }
    changes.value.unshift(c)
    notify(
      '新的分级变更待审批',
      `${c.applicant} 提交「${c.tableCnName}（${c.schema}.${c.tableName}）」${c.diffs.length} 个字段的分级变更 ${c.id}，定级至 ${c.maxLevelAfter}，请${flow === 'approval_dba' ? '审批并转管理员复核' : '审批'}。`,
      maxLevelAfter === 'L4' ? 'high' : 'medium'
    )
    persist()
    return c
  },

  /** 治理员审批通过：双审档转复核队列（不落地），单审档直接落地生效 */
  approve(id: string, comment?: string, actor = '张治理'): ClassifyChangeApply {
    const c = changes.value.find(x => x.id === id)
    if (!c) throw new Error(`未找到变更单: ${id}`)
    if (c.status !== 'pending') throw new Error(`变更单 ${id} 当前状态为 ${c.status}，不可审批`)
    const from = c.status
    c.approver = actor
    c.approvalComment = comment
    if (c.flow === 'approval_dba') {
      c.status = 'dba_confirming'
      c.updatedAt = nowStr()
      pushHistory(c, actor, '治理员通过，转管理员复核', from, 'dba_confirming', comment)
      notify('分级变更待复核', `高敏感定级变更 ${c.id}（${c.tableCnName}，${c.maxLevelAfter}）已通过治理员审批，等待管理员二次复核。`, 'high')
    } else {
      effectuate(c, actor)
      pushHistory(c, actor, '审批通过并生效', from, 'approved', comment)
      notify('分级变更已生效', `表「${c.tableCnName}」${c.diffs.length} 个字段的分级变更已通过（${actor}），分级结果已上线。`, 'low')
    }
    persist()
    return c
  },

  /** 管理员二次复核通过 → 落地生效 */
  dbaConfirm(id: string, comment?: string, actor = 'DBA-刘工'): ClassifyChangeApply {
    const c = changes.value.find(x => x.id === id)
    if (!c) throw new Error(`未找到变更单: ${id}`)
    if (c.status !== 'dba_confirming') throw new Error(`变更单 ${id} 不在复核队列`)
    const from = c.status
    c.dbaConfirmer = actor
    c.dbaComment = comment
    effectuate(c, actor)
    pushHistory(c, actor, '复核通过并生效', from, 'approved', comment)
    notify('分级变更已上线', `表「${c.tableCnName}」的 ${c.diffs.length} 字段定级变更已通过二级复核并写入分级目录（${actor}）。`, 'high')
    persist()
    return c
  },

  /** 管理员否决（终态，不落地） */
  dbaReject(id: string, comment: string, actor = 'DBA-刘工'): ClassifyChangeApply {
    const c = changes.value.find(x => x.id === id)
    if (!c) throw new Error(`未找到变更单: ${id}`)
    if (c.status !== 'dba_confirming') throw new Error(`变更单 ${id} 不在复核队列`)
    const from = c.status
    c.status = 'rejected'
    c.dbaConfirmer = actor
    c.dbaComment = comment
    c.updatedAt = nowStr()
    pushHistory(c, actor, '复核否决', from, 'rejected', comment)
    notify('分级变更被否决', `您提交的变更单 ${c.id}（${c.tableCnName}）未通过管理员复核：${comment}`, 'medium')
    persist()
    return c
  },

  /** 治理员驳回（不落地，diff 仅留痕） */
  reject(id: string, comment: string, actor = '张治理'): ClassifyChangeApply {
    const c = changes.value.find(x => x.id === id)
    if (!c) throw new Error(`未找到变更单: ${id}`)
    if (c.status !== 'pending') throw new Error(`变更单 ${id} 当前状态为 ${c.status}，不可驳回`)
    const from = c.status
    c.status = 'rejected'
    c.approver = actor
    c.approvalComment = comment
    c.updatedAt = nowStr()
    pushHistory(c, actor, '审批驳回', from, 'rejected', comment)
    notify('分级变更被驳回', `您提交的变更单 ${c.id}（${c.tableCnName}）被驳回：${comment}`, 'medium')
    persist()
    return c
  },

  /** 批量通过（治理员队列口径，双审档自动转复核） */
  batchApprove(ids: string[], actor = '张治理'): { ok: number; failed: number } {
    let ok = 0
    let failed = 0
    for (const id of ids) {
      try { ClassifyChangeStore.approve(id, '批量审批通过', actor); ok += 1 } catch { failed += 1 }
    }
    return { ok, failed }
  },

  /** 撤回（仅在途单可撤回为草稿，供发起人自己操作） */
  withdraw(id: string, actor: string): ClassifyChangeApply {
    const c = changes.value.find(x => x.id === id)
    if (!c) throw new Error(`未找到变更单: ${id}`)
    if (c.status !== 'pending') throw new Error('仅待审批的变更单可撤回')
    const from = c.status
    c.status = 'draft'
    c.updatedAt = nowStr()
    pushHistory(c, actor, '撤回变更', from, 'draft')
    persist()
    return c
  },

  /** 重置演示数据 */
  reset() {
    try { localStorage.removeItem(LS_KEY) } catch { /* ignore */ }
    changes.value = buildSeedChanges()
    persist()
  }
}

/** 与权限申请单共用一套状态文案/配色，页面不再自造 */
export const CLASSIFY_CHANGE_STATUS_LABEL = PERM_STATUS_LABEL
export const CLASSIFY_CHANGE_STATUS_COLOR = PERM_STATUS_COLOR

/**
 * 分级域的「当前环节」措辞：状态机与配色仍复用权限域，但在途两个环节的
 * 中文口径要按分级场景说（权限域把 approval_dba 叫「DBA确认中」，
 * 分级域的二级环节是「管理员复核」，两者混用会让审批流列和环节列自相矛盾）。
 */
export const CLASSIFY_STAGE_LABEL: Record<PermStatus, string> = {
  ...PERM_STATUS_LABEL,
  pending: '治理员审批中',
  dba_confirming: '管理员复核中'
}

/** 派生响应式只读列表（页面 watch 用） */
export const classifyChanges$ = computed(() => changes.value)
