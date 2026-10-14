/**
 * ============================================================
 * permission-store —— 表级权限申请/审批 store（P2 权限重建）
 * ============================================================
 * 重构方案 v1.0 阶段2·第2条：
 *  1. 申请对象以「表」为主（tableId + scope），字段级授权降级为高级选项；
 *  2. 分级驱动四级审批流（查表挡板，非真实 ACL 计算）：
 *     public     公开 → 提交即直接放行（秒批）
 *     internal   内部 → 业务域成员自动授权（提交后短延时置为已通过 + 绿色提示条）
 *     sensitive  敏感 → 数据管理员审批
 *     restricted 高敏 → 数据管理员审批 + DBA 确认队列（二级待办）
 *  3. 表实体、分级枚举统一读 table-catalog-store（唯一事实源）。
 *
 * 持久化：localStorage('dca-permission-v1')，沿用 table-catalog-store 范式。
 * ============================================================
 */
import { ref, computed } from 'vue'
import {
  TableCatalogStore,
  SENSITIVITY_LABELS,
  type Sensitivity,
  type LogicalTable
} from './table-catalog-store'
import { NotificationAPI } from '../api/notification'

// ---------------- 类型 ----------------
export type PermStatus = 'draft' | 'pending' | 'dba_confirming' | 'approved' | 'rejected' | 'expired'
export type PermScope = 'read' | 'write'
export type PermPurpose = 'data-analysis' | 'risk-control' | 'marketing' | 'report' | 'other'
export type PermFlow = 'auto' | 'domain_auto' | 'approval' | 'approval_dba'

/** 分级 → 审批流策略（查表挡板） */
export const SENSITIVITY_POLICY: Record<Sensitivity, { flow: PermFlow; label: string; desc: string }> = {
  public: { flow: 'auto', label: '直接放行', desc: '公开数据，提交即自动通过，无需审批。' },
  internal: { flow: 'domain_auto', label: '域内自动授权', desc: '内部数据，按业务域成员关系自动开通（约 1 秒），开通结果将通知申请人。' },
  sensitive: { flow: 'approval', label: '管理员审批', desc: '敏感数据，需数据管理员人工审批后生效。' },
  restricted: { flow: 'approval_dba', label: '管理员审批 + DBA 确认', desc: '高敏数据，管理员通过后进入 DBA 确认队列，双重确认后方可使用。' }
}

export interface PermissionApply {
  id: string
  applicant: string
  applicantDept: string
  /** 表名（table-catalog-store 主键语义） */
  tableName: string
  tableCnName: string
  /** 申请时的表分级快照（决定审批流） */
  sensitivity: Sensitivity
  /** 高级选项：仅申请部分字段；空数组 = 全表 */
  fieldNames: string[]
  reason: string
  purpose: PermPurpose
  scope: PermScope
  validMonths: number
  /** 审批流标识（由分级策略得出） */
  flow: PermFlow
  policyNote: string
  approver?: string
  approvalComment?: string
  dbaConfirmer?: string
  dbaComment?: string
  status: PermStatus
  createdAt: string
  updatedAt: string
  approvedAt?: string
  history: Array<{ ts: string; actor: string; action: string; from: PermStatus; to: PermStatus; comment?: string }>
}

/** 授权台账视图（由 approved 申请单派生，供"权限管理"页使用） */
export interface PermGrant {
  applyId: string
  tableName: string
  tableCnName: string
  sensitivity: Sensitivity
  grantee: string
  granteeDept: string
  scope: PermScope
  fieldNames: string[]
  grantedAt: string
  validUntil: string
  via: string
}

function nowStr(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ')
}

function notify(title: string, content: string, priority: 'high' | 'medium' | 'low' = 'medium') {
  NotificationAPI.createNotification({
    title, content, category: '审批通知', categoryId: 'CAT003',
    priority, status: 'published', publishTime: nowStr(), expireTime: '2099-12-31 23:59:59',
    source: '权限审批引擎', createdBy: '系统', targetUsers: '全体用户', important: false, isTop: false
  }).catch(() => { /* noop */ })
}

/** 依据表分级得出申请单初始状态与策略说明 */
function resolveFlow(s: Sensitivity): { flow: PermFlow; policyNote: string } {
  const p = SENSITIVITY_POLICY[s]
  return { flow: p.flow, policyNote: `${SENSITIVITY_LABELS[s]} · ${p.label}：${p.desc}` }
}

// ---------------- 种子数据 ----------------
function seedApply(
  id: string, applicant: string, dept: string, tableName: string,
  opts: { fieldNames?: string[]; reason: string; purpose: PermPurpose; scope?: PermScope; months?: number; status: PermStatus; created: string; approver?: string; comment?: string; dba?: string }
): PermissionApply {
  const t = TableCatalogStore.byName(tableName)
  const sensitivity: Sensitivity = t ? t.sensitivity : 'internal'
  const { flow, policyNote } = resolveFlow(sensitivity)
  const base: PermissionApply = {
    id, applicant, applicantDept: dept,
    tableName, tableCnName: t?.cnName ?? tableName,
    sensitivity, fieldNames: opts.fieldNames ?? [],
    reason: opts.reason, purpose: opts.purpose, scope: opts.scope ?? 'read',
    validMonths: opts.months ?? 6, flow, policyNote,
    approver: opts.approver, approvalComment: opts.comment, dbaConfirmer: opts.dba,
    status: opts.status,
    createdAt: opts.created, updatedAt: opts.created,
    approvedAt: opts.status === 'approved' ? opts.created : undefined,
    history: [{ ts: opts.created, actor: applicant, action: '提交申请', from: 'draft', to: 'pending' }]
  }
  if (opts.status === 'approved') {
    base.history.unshift({ ts: opts.created, actor: opts.approver || '系统', action: '审批通过', from: 'pending', to: 'approved', comment: opts.comment })
  }
  if (opts.status === 'dba_confirming') {
    base.history.unshift({ ts: opts.created, actor: opts.approver || '张治理', action: '管理员通过，转 DBA 确认', from: 'pending', to: 'dba_confirming' })
  }
  if (opts.status === 'rejected') {
    base.history.unshift({ ts: opts.created, actor: opts.approver || '张治理', action: '审批拒绝', from: 'pending', to: 'rejected', comment: opts.comment })
  }
  return base
}

function buildSeedApplies(): PermissionApply[] {
  return [
    seedApply('PA-001', '王运营', '数据运营组', 'dws_risk_score', {
      reason: '月活用户贷款转化率分析需要引用风险评分', purpose: 'data-analysis', months: 6,
      status: 'pending', created: '2026-09-10 10:30:00'
    }),
    seedApply('PA-002', '张风控', '风控建模组', 'dim_user', {
      fieldNames: ['id_card', 'mobile'], reason: '反欺诈模型训练需要证件与联系方式', purpose: 'risk-control', months: 12,
      status: 'dba_confirming', created: '2026-09-12 09:15:00', approver: '张治理', comment: '模型场景成立，注意脱敏'
    }),
    seedApply('PA-003', '陈营销', '营销组', 'dwd_credit_apply', {
      reason: '客群分层运营需要授信申请口径', purpose: 'marketing', months: 3,
      status: 'approved', created: '2026-09-02 11:00:00', approver: '张治理', comment: '同意，仅限营销圈选使用'
    }),
    seedApply('PA-004', '李产品', '产品组', 'dim_city', {
      reason: '城市维度做报表地域下钻', purpose: 'report', months: 12,
      status: 'approved', created: '2026-08-28 14:20:00', approver: '系统', comment: '公开数据自动放行'
    }),
    seedApply('PA-005', '王运营', '数据运营组', 'dwd_realname_auth', {
      fieldNames: ['user_id'], reason: '实名漏斗分析', purpose: 'data-analysis', months: 6,
      status: 'approved', created: '2026-09-05 16:40:00', approver: '系统', comment: '业务域内自动授权开通'
    }),
    seedApply('PA-006', '赵数据', '数据科学组', 'dwd_loan_drawdown', {
      reason: '用信余额预测特征工程', purpose: 'risk-control', months: 1,
      status: 'rejected', created: '2026-08-20 09:00:00', approver: '张治理', comment: '请改申请 dws 汇总层，明细含高敏金额'
    }),
    seedApply('PA-007', '孙市场', '市场部', 'dwd_user_register', {
      reason: '渠道注册效果复盘', purpose: 'marketing', months: 3,
      status: 'expired', created: '2026-03-01 10:00:00', approver: '系统'
    })
  ]
}

// ---------------- 状态 ----------------
const LS_KEY = 'dca-permission-v1'

function load(): PermissionApply[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as PermissionApply[]
      if (Array.isArray(parsed) && parsed.length) return parsed
    }
  } catch { /* ignore */ }
  return buildSeedApplies()
}

const applies = ref<PermissionApply[]>(load())

function persist() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(applies.value))
  } catch { /* quota ignore */ }
}

let seq = applies.value.reduce((m, a) => {
  const n = Number(a.id.replace(/\D/g, ''))
  return Number.isFinite(n) ? Math.max(m, n) : m
}, 0)

function nextId(): string {
  seq += 1
  return 'PA-' + String(seq).padStart(3, '0')
}

function pushHistory(a: PermissionApply, actor: string, action: string, from: PermStatus, to: PermStatus, comment?: string) {
  a.history.unshift({ ts: nowStr(), actor, action, from, to, comment })
}

/** internal 档：提交后短延时自动开通（模拟域成员自动赋权） */
function scheduleDomainAuto(id: string) {
  setTimeout(() => {
    const a = applies.value.find(x => x.id === id)
    if (!a || a.status !== 'pending' || a.flow !== 'domain_auto') return
    const from = a.status
    a.status = 'approved'
    a.approver = '系统'
    a.approvalComment = '业务域内自动授权开通'
    a.approvedAt = nowStr()
    a.updatedAt = nowStr()
    pushHistory(a, '系统', '自动授权开通', from, 'approved', a.approvalComment)
    persist()
    notify('权限已自动开通', `您申请的表「${a.tableCnName}（${a.tableName}）」为内部数据，已按业务域策略自动授权（${SENSITIVITY_LABELS[a.sensitivity]}）。`, 'low')
  }, 1200)
}

// ---------------- 对外 API ----------------
export const PermissionStore = {
  all(): PermissionApply[] { return applies.value },
  byId(id: string): PermissionApply | undefined { return applies.value.find(x => x.id === id) },

  /** 我的申请（申请人视角） */
  myApplies(actor: string): PermissionApply[] {
    return applies.value.filter(x => x.applicant === actor)
  },
  /** 管理员待办：sensitive/restricted 的 pending */
  pendingForAdmin(): PermissionApply[] {
    return applies.value.filter(x => x.status === 'pending' && (x.flow === 'approval' || x.flow === 'approval_dba'))
  },
  /** DBA 待办：高敏二级确认队列 */
  pendingForDba(): PermissionApply[] {
    return applies.value.filter(x => x.status === 'dba_confirming')
  },
  /** 管理视角全量 */
  manageList(): PermissionApply[] {
    return applies.value.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  },

  /** 待办角标计数：按当前角色出真实待办 */
  todoCount(role: string): number {
    if (role === 'dba') return this.pendingForDba().length
    if (role === 'admin' || role === 'data_admin') return this.pendingForAdmin().length + this.pendingForDba().length
    return 0
  },

  /**
   * 提交申请：立即按分级策略定初始态。
   * 返回的 apply.status 可能已是 approved（public），internal 为 pending + 延时自动开通。
   */
  submit(input: {
    tableName: string; applicant: string; applicantDept?: string;
    fieldNames?: string[]; reason: string; purpose: PermPurpose; scope?: PermScope; validMonths?: number
  }): PermissionApply {
    const t = TableCatalogStore.byName(input.tableName)
    const sensitivity: Sensitivity = t ? t.sensitivity : 'internal'
    const { flow, policyNote } = resolveFlow(sensitivity)
    const a: PermissionApply = {
      id: nextId(),
      applicant: input.applicant,
      applicantDept: input.applicantDept || '未填写',
      tableName: input.tableName,
      tableCnName: t?.cnName ?? input.tableName,
      sensitivity,
      fieldNames: input.fieldNames ?? [],
      reason: input.reason,
      purpose: input.purpose,
      scope: input.scope ?? 'read',
      validMonths: input.validMonths ?? 6,
      flow, policyNote,
      status: 'pending',
      createdAt: nowStr(), updatedAt: nowStr(),
      history: [{ ts: nowStr(), actor: input.applicant, action: '提交申请', from: 'draft', to: 'pending' }]
    }
    applies.value.unshift(a)
    if (flow === 'auto') {
      a.status = 'approved'
      a.approver = '系统'
      a.approvalComment = '公开数据直接放行'
      a.approvedAt = nowStr()
      pushHistory(a, '系统', '自动放行', 'pending', 'approved', a.approvalComment)
      notify('权限申请已自动通过', `您申请的表「${a.tableCnName}（${a.tableName}）」为公开数据，已直接放行。`, 'low')
    } else if (flow === 'domain_auto') {
      pushHistory(a, '系统', '进入域内自动开通流程', 'pending', 'pending', SENSITIVITY_POLICY.internal.label)
      scheduleDomainAuto(a.id)
    } else {
      notify('新的权限申请待审批', `${a.applicant} 申请「${a.tableCnName}（${a.tableName}）」${SENSITIVITY_LABELS[sensitivity]}数据 ${a.scope === 'read' ? '只读' : '读写'} 权限，请${flow === 'approval_dba' ? '审批并转 DBA 确认' : '审批'}。`, sensitivity === 'restricted' ? 'high' : 'medium')
    }
    persist()
    return a
  },

  /** 管理员审批通过：高敏档自动转入 DBA 确认队列 */
  approve(id: string, comment?: string, actor = '张治理'): PermissionApply {
    const a = applies.value.find(x => x.id === id)
    if (!a) throw new Error(`未找到申请: ${id}`)
    if (a.status !== 'pending') throw new Error(`申请 ${id} 当前状态为 ${a.status}，不可审批`)
    const from = a.status
    a.approver = actor
    a.approvalComment = comment
    if (a.flow === 'approval_dba') {
      a.status = 'dba_confirming'
      pushHistory(a, actor, '管理员通过，转 DBA 确认', from, 'dba_confirming', comment)
      notify('DBA 确认待办', `高敏表「${a.tableCnName}（${a.tableName}）」申请 ${id} 已通过管理员审批，等待 DBA 二次确认。`, 'high')
    } else {
      a.status = 'approved'
      a.approvedAt = nowStr()
      pushHistory(a, actor, '审批通过', from, 'approved', comment)
      notify('权限申请已通过', `您申请的表「${a.tableCnName}（${a.tableName}）」权限已通过（${actor}）。`, 'low')
    }
    a.updatedAt = nowStr()
    persist()
    return a
  },

  /** 批量审批（管理员队列，含高敏自动分流 DBA） */
  batchApprove(ids: string[], actor = '张治理'): { ok: number; failed: number } {
    let ok = 0; let failed = 0
    for (const id of ids) {
      try { this.approve(id, '批量审批通过', actor); ok += 1 } catch { failed += 1 }
    }
    return { ok, failed }
  },

  /** DBA 二次确认通过 */
  dbaConfirm(id: string, comment?: string, actor = 'DBA-刘工'): PermissionApply {
    const a = applies.value.find(x => x.id === id)
    if (!a) throw new Error(`未找到申请: ${id}`)
    if (a.status !== 'dba_confirming') throw new Error(`申请 ${id} 不在 DBA 确认队列`)
    const from = a.status
    a.status = 'approved'
    a.dbaConfirmer = actor
    a.dbaComment = comment
    a.approvedAt = nowStr()
    a.updatedAt = nowStr()
    pushHistory(a, actor, 'DBA 确认通过', from, 'approved', comment)
    notify('高敏权限已开通', `表「${a.tableCnName}（${a.tableName}）」的高敏权限申请已通过 DBA 确认，可对 ${a.applicant} 生效。`, 'high')
    persist()
    return a
  },

  /** DBA 否决（终态拒绝） */
  dbaReject(id: string, comment: string, actor = 'DBA-刘工'): PermissionApply {
    const a = applies.value.find(x => x.id === id)
    if (!a) throw new Error(`未找到申请: ${id}`)
    if (a.status !== 'dba_confirming') throw new Error(`申请 ${id} 不在 DBA 确认队列`)
    const from = a.status
    a.status = 'rejected'
    a.dbaConfirmer = actor
    a.dbaComment = comment
    a.updatedAt = nowStr()
    pushHistory(a, actor, 'DBA 否决', from, 'rejected', comment)
    notify('高敏权限申请被否决', `您申请的高敏表「${a.tableCnName}（${a.tableName}）」未通过 DBA 确认：${comment}`, 'medium')
    persist()
    return a
  },

  reject(id: string, comment?: string, actor = '张治理'): PermissionApply {
    const a = applies.value.find(x => x.id === id)
    if (!a) throw new Error(`未找到申请: ${id}`)
    if (a.status !== 'pending') throw new Error(`申请 ${id} 当前状态为 ${a.status}，不可拒绝`)
    const from = a.status
    a.status = 'rejected'
    a.approver = actor
    a.approvalComment = comment
    a.updatedAt = nowStr()
    pushHistory(a, actor, '审批拒绝', from, 'rejected', comment)
    notify('权限申请被拒绝', `您申请的表「${a.tableCnName}（${a.tableName}）」权限被拒绝：${comment || '无备注'}`, 'medium')
    persist()
    return a
  },

  /** 到期（演示：管理页手动触发） */
  expire(id: string): PermissionApply {
    const a = applies.value.find(x => x.id === id)
    if (!a) throw new Error(`未找到申请: ${id}`)
    if (a.status !== 'approved') throw new Error(`仅已通过的申请可到期回收`)
    const from = a.status
    a.status = 'expired'
    a.updatedAt = nowStr()
    pushHistory(a, 'system', '权限到期回收', from, 'expired')
    persist()
    return a
  },

  /** 撤回（仅 pending 可撤回为草稿） */
  withdraw(id: string, actor: string): PermissionApply {
    const a = applies.value.find(x => x.id === id)
    if (!a) throw new Error(`未找到申请: ${id}`)
    if (a.status !== 'pending') throw new Error('仅待审批的申请可撤回')
    const from = a.status
    a.status = 'draft'
    a.updatedAt = nowStr()
    pushHistory(a, actor, '撤回申请', from, 'draft')
    persist()
    return a
  },

  /** 重新提交（草稿） */
  resubmit(id: string, actor: string): PermissionApply {
    const a = applies.value.find(x => x.id === id)
    if (!a) throw new Error(`未找到申请: ${id}`)
    if (a.status !== 'draft') throw new Error('仅草稿可重新提交')
    const from = a.status
    a.status = 'pending'
    a.updatedAt = nowStr()
    pushHistory(a, actor, '重新提交', from, 'pending')
    if (a.flow === 'domain_auto') scheduleDomainAuto(a.id)
    if (a.flow === 'auto') { a.status = 'approved'; a.approvedAt = nowStr(); pushHistory(a, '系统', '自动放行', 'pending', 'approved') }
    persist()
    return a
  },

  /** 授权台账（派生视图） */
  grants(): PermGrant[] {
    return applies.value
      .filter(x => x.status === 'approved')
      .map(x => ({
        applyId: x.id,
        tableName: x.tableName,
        tableCnName: x.tableCnName,
        sensitivity: x.sensitivity,
        grantee: x.applicant,
        granteeDept: x.applicantDept,
        scope: x.scope,
        fieldNames: x.fieldNames,
        grantedAt: x.approvedAt || x.updatedAt,
        validUntil: validUntilOf(x.approvedAt || x.updatedAt, x.validMonths),
        via: x.flow === 'auto' ? '公开放行' : x.flow === 'domain_auto' ? '域内自动' : x.flow === 'approval_dba' ? '管理员+DBA' : '管理员审批'
      }))
  },

  /** 某人对某表是否已有有效授权（详情页样例数据门禁用） */
  isGranted(tableName: string, actor: string): boolean {
    return applies.value.some(x => x.tableName === tableName && x.applicant === actor && x.status === 'approved')
  },

  /** 按表统计授权人数（管理页概览） */
  grantCountByTable(): Array<{ tableName: string; tableCnName: string; sensitivity: Sensitivity; grantees: number }> {
    const map = new Map<string, { tableName: string; tableCnName: string; sensitivity: Sensitivity; grantees: Set<string> }>()
    for (const g of this.grants()) {
      if (!map.has(g.tableName)) map.set(g.tableName, { tableName: g.tableName, tableCnName: g.tableCnName, sensitivity: g.sensitivity, grantees: new Set() })
      map.get(g.tableName)!.grantees.add(g.grantee)
    }
    return [...map.values()].map(v => ({ tableName: v.tableName, tableCnName: v.tableCnName, sensitivity: v.sensitivity, grantees: v.grantees.size }))
  },

  /** 重置演示数据 */
  reset() {
    try { localStorage.removeItem(LS_KEY) } catch { /* ignore */ }
    applies.value = buildSeedApplies()
    persist()
  }
}

function validUntilOf(grantedAt: string, months: number): string {
  const d = new Date(grantedAt.replace(' ', 'T'))
  if (Number.isNaN(d.getTime())) return '长期'
  d.setMonth(d.getMonth() + (months || 6))
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} 23:59:59`
}

// ---------------- 派生常量 ----------------
export const PERM_STATUS_LABEL: Record<PermStatus, string> = {
  draft: '草稿', pending: '待审批', dba_confirming: 'DBA确认中',
  approved: '已通过', rejected: '已拒绝', expired: '已过期'
}
export const PERM_STATUS_COLOR: Record<PermStatus, string> = {
  draft: 'gray', pending: 'arcoblue', dba_confirming: 'purple',
  approved: 'green', rejected: 'red', expired: 'orange'
}
export const PERM_PURPOSE_LABEL: Record<PermPurpose, string> = {
  'data-analysis': '数据分析', 'risk-control': '风控建模', marketing: '营销', report: '报表', other: '其他'
}
export const PERM_SCOPE_LABEL: Record<PermScope, string> = { read: '只读', write: '读写' }
export const PERM_FLOW_LABEL: Record<PermFlow, string> = {
  auto: '直接放行', domain_auto: '域内自动授权', approval: '管理员审批', approval_dba: '管理员+DBA双审'
}

/** 派生响应式只读列表（页面 watch 用） */
export const permissionApplies$ = computed(() => applies.value)

export type { LogicalTable }
