/**
 * ============================================================
 * classify-permission —— 数据分级模块的「数据权限档位」查表
 * ============================================================
 * 设计约束（2026-11 需求：不同用户看到不同的数据权限）：
 *  1. 判定依据只有平台角色 roleStore.currentRole（右上角角色切换器，
 *     localStorage 持久化），不引入 owner / 业务属于等新维度，避免与
 *     permission-store 的表级授权体系重复建设；
 *  2. 不做整页路由门禁（classify 路由不加 meta.allowedRoles）：业务角色
 *     仍然要能进来「看」已分级结果，只是看不到治理职责指标、不能编辑；
 *  3. 三档能力 = 可见 schema 白名单 + 可编辑 + 可见「待分级表数」。
 *
 * 职责划分（演示口径，写在这里防止后续随手放宽）：
 *   governance  数据治理者 / 系统管理员 —— 全量可见、可编辑、可审批
 *   developer   数据工程师 —— 只维护数仓层 hive_dw（业务系统表归治理员）
 *   consumer    其余 7 个业务角色 —— 只看业务系统表；"待分级"属治理职责
 *               指标，故对其隐藏统计卡与「未完成」筛选项，编辑入口
 *               置灰并引导走已有的表权限申请闭环
 * ============================================================
 */
import type { UserRole } from '../../types-dca/roles'

/** 数仓层 schema（数据工程师负责补全定级） */
export const DEVELOPER_SCHEMAS = ['hive_dw']
/** 业务系统 schema（治理员维护，业务角色可消费） */
export const CONSUMER_SCHEMAS = ['crm_db', 'core_db', 'coll_db', 'cs_db', 'risk_db']

export type ClassifyAuthTier = 'governance' | 'developer' | 'consumer'

export interface ClassifyAuth {
  tier: ClassifyAuthTier
  /** 档位显示名，页面身份条直接用 */
  label: string
  /** 可见 schema 白名单；'all' = 不限 */
  schemas: 'all' | string[]
  /** 是否可发起分级变更（编辑 + 批量上传） */
  canEdit: boolean
  /** 是否可在审批台处理分级单 */
  canApprove: boolean
  /** 是否展示「待分级表数」统计卡与「未完成」筛选项 */
  seePendingStats: boolean
  /** 身份条说明文案 */
  desc: string
}

const GOVERNANCE: ClassifyAuth = {
  tier: 'governance',
  label: '分级治理员',
  schemas: 'all',
  canEdit: true,
  canApprove: true,
  seePendingStats: true,
  desc: '可见全部数据源与字段分级明细，可发起分级变更并在审批台终审。'
}

const DEVELOPER: ClassifyAuth = {
  tier: 'developer',
  label: '数仓开发',
  schemas: DEVELOPER_SCHEMAS,
  canEdit: true,
  canApprove: false,
  seePendingStats: true,
  desc: '仅可见数仓层（hive_dw），可补全本层字段定级；变更仍需治理员审批。'
}

const CONSUMER: ClassifyAuth = {
  tier: 'consumer',
  label: '只读消费',
  schemas: CONSUMER_SCHEMAS,
  canEdit: false,
  canApprove: false,
  seePendingStats: false,
  desc: '仅可见业务系统表的分级结果用于消费；如需修订分级口径，请申请对应权限。'
}

/** 10 个平台角色逐一列全，不留默认分支（新增角色时 TS 会强制补条目） */
export const CLASSIFY_AUTH_BY_ROLE: Record<UserRole, ClassifyAuth> = {
  data_admin: GOVERNANCE,
  admin: GOVERNANCE,
  data_engineer: DEVELOPER,
  risk_analyst: CONSUMER,
  risk_manager: CONSUMER,
  loan_manager: CONSUMER,
  operation_lead: CONSUMER,
  marketing_lead: CONSUMER,
  product_manager: CONSUMER,
  finance_lead: CONSUMER
}

/** 取当前角色的分级模块数据权限（未知角色按只读消费兜底） */
export function resolveClassifyAuth(role: UserRole | string): ClassifyAuth {
  return CLASSIFY_AUTH_BY_ROLE[role as UserRole] ?? CONSUMER
}

/** 表是否落在该档位的可见范围内 */
export function isSchemaVisible(schema: string, auth: ClassifyAuth): boolean {
  return auth.schemas === 'all' || auth.schemas.includes(schema)
}

/** 身份条上的可见范围描述 */
export function scopeText(auth: ClassifyAuth): string {
  if (auth.schemas === 'all') return '全部 schema'
  if (auth.schemas === DEVELOPER_SCHEMAS) return 'hive_dw（数仓层）'
  return '业务系统表'
}

/** 表级授权申请页（无编辑权时的引导出口，复用已有功能） */
export const PERM_APPLY_PATH = '/management/permission/data-permission/apply'
/** 表权限审批台（分级变更审批复用同一台，见其「分级变更审批」Tab） */
export const PERM_APPROVAL_PATH = '/management/permission/data-permission/approval'
