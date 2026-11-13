/**
 * 统一查询 · 数据库账号管理(管理端) Mock
 *
 * 面向 DBA / 数据管理员的版本:
 *   1. 全库账号清单  — 跨用户查看、重置密码、调整权限、锁定 / 回收
 *   2. 全库访问 Key  — 跨用户重置密钥、停用、吊销
 *   3. 操作审计      — 所有管理动作留痕
 *
 * 与用户自助版共用类型,但数据主体是「库内真实账号」而非「申请单」。
 * 密码不落库:记录只保留最近重置时间 + 有效期策略,重置时一次性下发。
 */
import type {
  AccessKeyRecord,
  DbAccount,
  DbAccountState,
  DbAdminAuditEntry,
  DbPrivilegeLevel
} from './types'

/** 管理端操作人(演示环境统一 DBA 账号) */
export const ADMIN_OPERATOR = '王工(DBA)'

/** 默认密码有效期(天):超期后登录强制改密 */
export const PASSWORD_POLICY_DAYS = 90

/** 密码剩余天数 ≤ 该值时标记为「即将过期」 */
export const PASSWORD_WARN_DAYS = 30

/** 账号物理状态展示口径 */
export const DB_ACCOUNT_STATE_META: Record<DbAccountState, { text: string; tag: string; dot: string; tone: string }> = {
  normal: { text: '正常', tag: 'green', dot: '#00b42a', tone: 'ok' },
  locked: { text: '已锁定', tag: 'orange', dot: '#ff7d10', tone: 'warn' },
  disabled: { text: '已停用', tag: 'gray', dot: '#c9cdd4', tone: 'muted' }
}

/** 权限变更说明的快捷文案 */
export const PRIVILEGE_CHANGE_REASONS = [
  '业务需要扩大取数范围',
  '按最小权限原则回收多余库',
  '读写权限降级为只读',
  '项目结项,权限回收'
]

/** 重置密码原因 */
export const RESET_PASSWORD_REASONS = [
  '用户忘记密码,电话核实身份后重置',
  '密码超期未修改,强制重置',
  '疑似泄露,立即重置并通知用户',
  '新账号首次发放初始密码'
]

/** 全库数据库账号种子(覆盖多用户 / 多数据源 / 多种异常状态) */
export const SEED_DB_ACCOUNTS: DbAccount[] = [
  {
    id: 'DA0001',
    accountName: 'dq_zhangsan_dr',
    ownerName: '张三',
    ownerAccount: 'zhangsan',
    department: '风险管理部',
    employeeNo: 'U1024',
    datasource: 'doris',
    cluster: 'internal',
    databases: ['ADM'],
    privilege: 'read',
    state: 'normal',
    passwordUpdatedAt: '2026-09-02 10:15:00',
    passwordValidDays: 90,
    createdAt: '2026-03-01 11:05:00',
    lastLoginAt: '2026-11-05 09:12:00',
    keyCount: 2,
    source: 'self-service'
  },
  {
    id: 'DA0002',
    accountName: 'dq_lisi_dr',
    ownerName: '李四',
    ownerAccount: 'lisi',
    department: '信贷审批部',
    employeeNo: 'U2031',
    datasource: 'doris',
    cluster: 'internal',
    databases: ['DWD', 'ODS'],
    privilege: 'write',
    state: 'normal',
    passwordUpdatedAt: '2026-06-15 14:20:00',
    passwordValidDays: 90,
    createdAt: '2026-01-18 09:40:00',
    lastLoginAt: '2026-11-06 08:40:00',
    keyCount: 1,
    source: 'self-service'
  },
  {
    id: 'DA0003',
    accountName: 'dq_lisi_hc',
    ownerName: '李四',
    ownerAccount: 'lisi',
    department: '信贷审批部',
    employeeNo: 'U2031',
    datasource: 'hive',
    cluster: 'Inceptor',
    databases: ['credit_dw'],
    privilege: 'read',
    state: 'locked',
    passwordUpdatedAt: '2026-08-01 16:50:00',
    passwordValidDays: 90,
    createdAt: '2026-01-18 09:42:00',
    lastLoginAt: '2026-09-28 17:22:00',
    keyCount: 0,
    source: 'self-service',
    remark: '连续 5 次密码错误触发自动锁定'
  },
  {
    id: 'DA0004',
    accountName: 'dq_wangwu_hc',
    ownerName: '王五',
    ownerAccount: 'wangwu',
    department: '数据管理部',
    employeeNo: 'U3012',
    datasource: 'hive',
    cluster: 'Inceptor',
    databases: ['risk_dw', 'credit_dw'],
    privilege: 'admin',
    state: 'normal',
    passwordUpdatedAt: '2026-10-08 09:05:00',
    passwordValidDays: 90,
    createdAt: '2025-11-20 10:30:00',
    lastLoginAt: '2026-11-06 09:03:00',
    keyCount: 1,
    source: 'admin'
  },
  {
    id: 'DA0005',
    accountName: 'dq_zhaoliu_dr',
    ownerName: '赵六',
    ownerAccount: 'zhaoliu',
    department: '市场营销部',
    employeeNo: 'U4022',
    datasource: 'doris',
    cluster: 'internal',
    databases: ['ADM'],
    privilege: 'read',
    state: 'normal',
    passwordUpdatedAt: '2026-04-12 11:30:00',
    passwordValidDays: 90,
    createdAt: '2026-02-08 15:12:00',
    lastLoginAt: '2026-10-31 16:18:00',
    keyCount: 1,
    source: 'self-service'
  },
  {
    id: 'DA0006',
    accountName: 'dq_sunqi_hc',
    ownerName: '孙七',
    ownerAccount: 'sunqi',
    department: '风险管理部',
    employeeNo: 'U4108',
    datasource: 'hive',
    cluster: 'Inceptor',
    databases: ['default'],
    privilege: 'read',
    state: 'disabled',
    passwordUpdatedAt: '2026-09-20 10:00:00',
    passwordValidDays: 90,
    createdAt: '2026-04-11 14:00:00',
    lastLoginAt: '2026-10-12 11:05:00',
    keyCount: 0,
    source: 'self-service',
    remark: '人员转岗至数据治理组,账号待回收'
  },
  {
    id: 'DA0007',
    accountName: 'dq_zhouba_dr',
    ownerName: '周八',
    ownerAccount: 'zhouba',
    department: '数据管理部',
    employeeNo: 'U1188',
    datasource: 'doris',
    cluster: 'internal',
    databases: ['ADM', 'DWD', 'ODS'],
    privilege: 'admin',
    state: 'normal',
    passwordUpdatedAt: '2026-11-01 09:30:00',
    passwordValidDays: 90,
    createdAt: '2025-06-01 09:00:00',
    lastLoginAt: '2026-11-06 09:55:00',
    keyCount: 0,
    source: 'admin'
  },
  {
    id: 'DA0008',
    accountName: 'dq_zhouba_hc',
    ownerName: '周八',
    ownerAccount: 'zhouba',
    department: '数据管理部',
    employeeNo: 'U1188',
    datasource: 'hive',
    cluster: 'Inceptor',
    databases: ['default', 'risk_dw', 'credit_dw'],
    privilege: 'admin',
    state: 'normal',
    passwordUpdatedAt: '2026-11-01 09:32:00',
    passwordValidDays: 90,
    createdAt: '2025-06-01 09:05:00',
    lastLoginAt: '2026-11-05 20:12:00',
    keyCount: 1,
    source: 'admin'
  }
]

/** 其它用户的访问 Key(张三的 Key 复用用户端种子,见 store) */
export const SEED_ADMIN_EXTRA_KEYS: AccessKeyRecord[] = [
  {
    id: 'AK20260705-004',
    name: '信贷风控报表',
    accessKeyId: 'DCAK5E2B8D14A7C903',
    secretKey: 'dcs_71c4e0a95b2d38f6ca17e5b90d4f2a86',
    datasources: ['doris'],
    status: 'active',
    createdAt: '2026-07-05 10:00:00',
    expireAt: '2027-01-05',
    lastUsedAt: '2026-11-04 10:12:00',
    callCount: 892,
    purpose: '信贷风控日报指标拉取',
    owner: '李四'
  },
  {
    id: 'AK20260820-005',
    name: '数据质量巡检',
    accessKeyId: 'DCAK2A9F6C30E8B571',
    secretKey: 'dcs_08b3f5d19a6c47e2d8f01b7c4e59a3d2',
    datasources: ['hive'],
    status: 'active',
    createdAt: '2026-08-20 09:15:00',
    expireAt: '2027-02-20',
    lastUsedAt: '2026-11-06 08:30:00',
    callCount: 2104,
    purpose: '每日数据质量巡检脚本',
    owner: '王五'
  },
  {
    id: 'AK20260930-006',
    name: '营销标签加工',
    accessKeyId: 'DCAK8D3E57B2F0C946',
    secretKey: 'dcs_5e9a2c7b10d84f63a7b0e29d51c8f4a7',
    datasources: ['doris'],
    status: 'disabled',
    createdAt: '2026-09-30 14:40:00',
    expireAt: '2026-12-30',
    lastUsedAt: '2026-10-22 14:40:00',
    callCount: 128,
    purpose: '营销标签离线加工',
    owner: '赵六'
  }
]

/** 管理操作审计种子(倒序:最新在前) */
export const SEED_ADMIN_AUDITS: DbAdminAuditEntry[] = [
  {
    id: 'AU0006',
    ts: '2026-11-06 09:58:00',
    action: '重置密码',
    target: 'dq_zhangsan_dr',
    targetUser: '张三',
    operator: ADMIN_OPERATOR,
    detail: '用户忘记密码,电话核实身份后重置;已通过企业微信下发一次性密码',
    level: 'info'
  },
  {
    id: 'AU0005',
    ts: '2026-11-05 17:20:00',
    action: '修改权限',
    target: 'dq_wangwu_hc',
    targetUser: '王五',
    operator: ADMIN_OPERATOR,
    detail: '只读 → 读写;授权库新增 credit_dw',
    level: 'warn'
  },
  {
    id: 'AU0004',
    ts: '2026-11-04 15:10:00',
    action: '锁定账号',
    target: 'dq_lisi_hc',
    targetUser: '李四',
    operator: ADMIN_OPERATOR,
    detail: '连续 5 次密码错误触发自动锁定,DBA 确认后保持锁定待用户申诉',
    level: 'warn'
  },
  {
    id: 'AU0003',
    ts: '2026-11-03 11:30:00',
    action: '停用账号',
    target: 'dq_sunqi_hc',
    targetUser: '孙七',
    operator: ADMIN_OPERATOR,
    detail: '人员转岗至数据治理组,账号停用待回收',
    level: 'warn'
  },
  {
    id: 'AU0002',
    ts: '2026-11-02 16:45:00',
    action: '重置密钥',
    target: 'DCAK7B1E5A90C2F834',
    targetUser: '张三',
    operator: ADMIN_OPERATOR,
    detail: '用户申诉密钥可能泄露,旧 SecretKey 立即失效并下发新密钥',
    level: 'danger'
  },
  {
    id: 'AU0001',
    ts: '2026-10-30 10:05:00',
    action: '回收账号',
    target: 'dq_zhangsan_hc_old',
    targetUser: '张三',
    operator: ADMIN_OPERATOR,
    detail: '申请人已结束临时排查,释放后库内账号与残留会话已清理',
    level: 'danger'
  }
]

/** 密码状态:正常 / 即将过期(≤30 天)/ 已过期 */
export type PasswordState = 'ok' | 'expiring' | 'expired'

/** 距离密码过期还有多少天;已过期为负数 */
export function passwordDaysLeft(account: DbAccount): number {
  const base = new Date(`${account.passwordUpdatedAt.replace(' ', 'T')}`).getTime()
  const deadline = base + account.passwordValidDays * 86400000
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((deadline - today.getTime()) / 86400000)
}

/** 密码状态判定 */
export function passwordState(account: DbAccount): PasswordState {
  const left = passwordDaysLeft(account)
  if (left < 0) return 'expired'
  if (left <= PASSWORD_WARN_DAYS) return 'expiring'
  return 'ok'
}

const PWD_SETS = [
  'abcdefghijkmnpqrstuvwxyz',
  'ABCDEFGHJKLMNPQRSTUVWXYZ',
  '23456789',
  '!@#%^*_-+='
]

/**
 * 生成符合复杂度要求的一次性密码
 *
 * 至少包含大写 / 小写 / 数字 / 符号各一位,长度默认 16。
 * 明文只在重置弹窗展示一次,不写入任何 mock 数据。
 */
export function generatePassword(length = 16): string {
  const all = PWD_SETS.join('')
  const chars = PWD_SETS.map(set => set[Math.floor(Math.random() * set.length)])
  while (chars.length < length) chars.push(all[Math.floor(Math.random() * all.length)])
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = chars[i]
    chars[i] = chars[j]
    chars[j] = tmp
  }
  return chars.join('')
}

/** 权限级别展示口径的兜底(避免模板里直接索引 Record 触发 TS7053) */
export function privilegeLabel(level: DbPrivilegeLevel): string {
  return level === 'read' ? '只读' : level === 'write' ? '读写' : '管理'
}