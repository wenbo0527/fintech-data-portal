/**
 * 统一查询 · 数据库账号管理 Mock
 *
 * 覆盖两类自助申请:
 *   1. 数据源权限 — 按用户开通 Doris / Hive 只读账号(库级授权;读写 / 管理权限仅由 DBA 管理端授予)
 *   2. 访问 Key  — 供 Python / R 客户端连接时使用的 AccessKeyId + SecretKey
 *
 * 全部为前端 Mock,不发起任何 HTTP 请求。
 * 审批流演示:提交后进入审批中,约 2 秒自动通过(见 store)。
 */
import type {
  AccessKeyRecord,
  AccessKeyStatus,
  DataSourceKey,
  DbAccountGrant,
  DbAccountStatus,
  DbPrivilegeLevel
} from './types'

/** 当前申请人(演示用户,与平台其它模块 Mock 口径一致) */
export const ACCOUNT_OWNER = {
  name: '张三',
  account: 'zhangsan',
  department: '风险管理部',
  employeeNo: 'U1024'
}

/** 各数据源可授权的集群与库 */
export const GRANT_SCOPE_OPTIONS: Record<DataSourceKey, {
  cluster: string
  databases: { label: string; value: string }[]
}> = {
  doris: {
    cluster: 'internal',
    databases: [
      { label: 'ADM(应用数据层)', value: 'ADM' },
      { label: 'DWD(明细数据层)', value: 'DWD' },
      { label: 'ODS(原始数据层)', value: 'ODS' }
    ]
  },
  hive: {
    cluster: 'Inceptor',
    databases: [
      { label: 'default(默认库)', value: 'default' },
      { label: 'risk_dw(风险数仓)', value: 'risk_dw' },
      { label: 'credit_dw(信贷数仓)', value: 'credit_dw' }
    ]
  }
}

/** 账号申请状态展示口径 */
export const DB_ACCOUNT_STATUS_META: Record<DbAccountStatus, { text: string; tag: string; dot: string }> = {
  active: { text: '已开通', tag: 'green', dot: '#00b42a' },
  applying: { text: '审批中', tag: 'orange', dot: '#ff7d10' },
  rejected: { text: '已驳回', tag: 'red', dot: '#f53f3f' },
  revoked: { text: '已释放', tag: 'gray', dot: '#c9cdd4' }
}

/** 权限级别展示口径 */
export const PRIVILEGE_META: Record<DbPrivilegeLevel, { text: string; tag: string }> = {
  read: { text: '只读', tag: 'arcoblue' },
  write: { text: '读写', tag: 'orangered' },
  admin: { text: '管理', tag: 'purple' }
}

/** 访问 Key 状态展示口径 */
export const ACCESS_KEY_STATUS_META: Record<AccessKeyStatus, { text: string; tag: string }> = {
  active: { text: '启用', tag: 'green' },
  disabled: { text: '已停用', tag: 'gray' },
  expired: { text: '已过期', tag: 'red' }
}

/** Key 有效期选项(天) */
export const KEY_EXPIRE_OPTIONS = [
  { label: '30 天(临时分析)', value: 30 },
  { label: '90 天(默认)', value: 90 },
  { label: '180 天', value: 180 },
  { label: '365 天', value: 365 }
]

/**
 * 续期后的到期日:从「原到期日」与「今天」中较晚者起算,
 * 避免已过期 Key 续期后仍早于今天。返回 YYYY-MM-DD。
 */
export function extendExpireAt(expireAt: string, days: number): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const base = new Date(`${expireAt}T00:00:00`)
  const from = base.getTime() > today.getTime() ? base : today
  from.setDate(from.getDate() + days)
  return `${from.getFullYear()}-${pad(from.getMonth() + 1)}-${pad(from.getDate())}`
}

/** 用途选项(申请表单下拉,可自由输入) */
export const ACCOUNT_PURPOSE_OPTIONS = [
  '日常取数与报表核对',
  '模型训练样本拉取',
  '特征加工落表',
  '数据质量核查',
  '临时排查'
]

/** 客户端连接地址(演示环境) */
export const CONNECTION_ENDPOINT: Record<DataSourceKey, { host: string; port: number; note: string }> = {
  doris: { host: 'doris-gateway.data-platform.internal', port: 9030, note: 'MySQL 协议' },
  hive: { host: 'hive-gateway.data-platform.internal', port: 10000, note: 'HiveServer2' }
}

/** 账号权限种子数据(覆盖已开通 / 审批中 / 已释放 / 已驳回) */
export const SEED_DB_ACCOUNT_GRANTS: DbAccountGrant[] = [
  {
    id: 'DB20260301-001',
    datasource: 'doris',
    accountName: 'dq_zhangsan_dr',
    cluster: 'internal',
    databases: ['ADM'],
    privilege: 'read',
    status: 'active',
    appliedAt: '2026-03-01 09:20:00',
    approvedAt: '2026-03-01 11:05:00',
    approver: '王工(DBA)',
    purpose: '日常取数与报表核对',
    lastLoginAt: '2026-11-05 09:12:00',
    history: [
      { ts: '2026-03-01 09:20:00', action: '提交账号开通申请', actor: '张三', to: 'applying' },
      { ts: '2026-03-01 10:12:00', action: '直属主管审批通过', actor: '李敏(主管)', comment: '用途明确,同意开通只读权限' },
      { ts: '2026-03-01 11:05:00', action: 'DBA 开通账号并授权 ADM 库', actor: '王工(DBA)', from: 'applying', to: 'active', comment: '账号 dq_zhangsan_dr 已生效,长期有效' }
    ]
  },
  {
    id: 'DB20261106-002',
    datasource: 'hive',
    accountName: 'dq_zhangsan_hc',
    cluster: 'Inceptor',
    databases: ['default', 'risk_dw'],
    privilege: 'read',
    status: 'applying',
    appliedAt: '2026-11-06 10:24:00',
    purpose: '特征加工前取数核对',
    history: [
      { ts: '2026-11-06 10:24:00', action: '提交账号开通申请', actor: '张三', to: 'applying' },
      { ts: '2026-11-06 10:25:00', action: '进入 DBA 审批队列', actor: '权限平台', comment: '待 DBA 确认 default、risk_dw 库只读授权' }
    ]
  },
  {
    id: 'DB20260510-003',
    datasource: 'hive',
    accountName: 'dq_zhangsan_hc_old',
    cluster: 'Inceptor',
    databases: ['default'],
    privilege: 'read',
    status: 'revoked',
    appliedAt: '2026-05-10 14:02:00',
    approvedAt: '2026-05-10 16:30:00',
    approver: '王工(DBA)',
    purpose: '临时排查',
    lastLoginAt: '2026-08-08 17:41:00',
    history: [
      { ts: '2026-05-10 14:02:00', action: '提交账号开通申请', actor: '张三', to: 'applying' },
      { ts: '2026-05-10 16:30:00', action: 'DBA 开通账号并授权 default 库', actor: '王工(DBA)', from: 'applying', to: 'active' },
      { ts: '2026-08-10 00:00:00', action: '临时排查结束,释放账号', actor: '张三', from: 'active', to: 'revoked', comment: '账号已回收,如需使用请重新申请' }
    ]
  },
  {
    id: 'DB20261021-004',
    datasource: 'hive',
    accountName: 'dq_zhangsan_hc_tmp',
    cluster: 'Inceptor',
    databases: ['default', 'risk_dw'],
    privilege: 'read',
    status: 'rejected',
    appliedAt: '2026-10-21 15:40:00',
    purpose: '数据同步落表',
    rejectReason: '用途说明过于笼统,请补充具体取数场景与库表范围后重新提交',
    approver: '王工(DBA)',
    history: [
      { ts: '2026-10-21 15:40:00', action: '提交账号开通申请', actor: '张三', to: 'applying' },
      { ts: '2026-10-22 09:15:00', action: 'DBA 驳回申请', actor: '王工(DBA)', from: 'applying', to: 'rejected', comment: '用途说明不充分,请补充取数场景后重新提交' }
    ]
  }
]

/** 访问 Key 种子数据(覆盖启用 / 停用两种状态) */
export const SEED_ACCESS_KEYS: AccessKeyRecord[] = [
  {
    id: 'AK20260912-001',
    name: '风控建模-特征查询',
    accessKeyId: 'DCAK3F8A2C71D9E4B65',
    secretKey: 'dcs_9f3c71ba2e5d48c6a0b7f8421d95e3cc',
    datasources: ['doris'],
    status: 'active',
    createdAt: '2026-09-12 10:30:00',
    expireAt: '2026-12-11',
    lastUsedAt: '2026-11-06 09:41:00',
    callCount: 1286,
    purpose: '模型训练样本拉取',
    owner: '张三'
  },
  {
    id: 'AK20260601-002',
    name: '周报取数',
    accessKeyId: 'DCAK7B1E5A90C2F834',
    secretKey: 'dcs_4a8e02c7b96d51f3e7c40a18b6d2f9a5',
    datasources: ['doris', 'hive'],
    status: 'active',
    createdAt: '2026-06-01 09:00:00',
    expireAt: '2027-06-01',
    lastUsedAt: '2026-10-28 16:20:00',
    callCount: 342,
    purpose: '周报指标核算',
    owner: '张三'
  },
  {
    id: 'AK20260815-003',
    name: '临时分析-已停用',
    accessKeyId: 'DCAK9C4D2F66B1A7E308',
    secretKey: 'dcs_2b6d90f4c1a83e75b0d9528ce4a17f36',
    datasources: ['hive'],
    status: 'disabled',
    createdAt: '2026-08-15 14:20:00',
    expireAt: '2026-11-13',
    lastUsedAt: '2026-09-20 11:05:00',
    callCount: 57,
    purpose: '临时数据核查',
    owner: '张三'
  }
]

/** 生成 AccessKeyId:DCAK + 16 位十六进制 */
export function randomAccessKeyId(): string {
  const chars = '0123456789ABCDEF'
  let out = ''
  for (let i = 0; i < 16; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return `DCAK${out}`
}

/** 生成 SecretKey:dcs_ + 32 位小写十六进制 */
export function randomSecretKey(): string {
  const chars = '0123456789abcdef'
  let out = ''
  for (let i = 0; i < 32; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return `dcs_${out}`
}

/**
 * 生成 Python 连接示例
 *
 * secret 统一用占位符,避免代码片段把明文密钥带进日志 / 截图。
 */
export function buildPythonSnippet(record: AccessKeyRecord): string {
  const useDoris = record.datasources.includes('doris')
  const useHive = record.datasources.includes('hive')
  const lines: string[] = []
  if (useDoris) lines.push('import pymysql                      # Doris:MySQL 协议')
  if (useHive) lines.push('from pyhive import hive             # Hive:HiveServer2')
  lines.push('')
  lines.push(`ACCESS_KEY = "${record.accessKeyId}"`)
  lines.push('SECRET_KEY = "<SecretKey>"          # 创建 Key 时返回的密钥')
  if (useDoris) {
    const d = CONNECTION_ENDPOINT.doris
    lines.push('')
    lines.push('# ── Doris ──')
    lines.push('doris_conn = pymysql.connect(')
    lines.push(`    host="${d.host}", port=${d.port},`)
    lines.push('    user=ACCESS_KEY, password=SECRET_KEY,')
    lines.push('    database="ADM", charset="utf8mb4",')
    lines.push(')')
  }
  if (useHive) {
    const h = CONNECTION_ENDPOINT.hive
    lines.push('')
    lines.push('# ── Hive ──')
    lines.push('hive_conn = hive.connect(')
    lines.push(`    host="${h.host}", port=${h.port},`)
    lines.push('    username=ACCESS_KEY, password=SECRET_KEY,')
    lines.push('    auth="CUSTOM",')
    lines.push(')')
  }
  return lines.join('\n')
}

/** 生成 R 连接示例(RMariaDB 连 Doris / odbc 连 Hive) */
export function buildRSnippet(record: AccessKeyRecord): string {
  const useDoris = record.datasources.includes('doris')
  const useHive = record.datasources.includes('hive')
  const lines: string[] = ['library(DBI)']
  if (useDoris) lines.push('library(RMariaDB)                   # Doris:MySQL 协议')
  if (useHive) lines.push('library(odbc)                       # Hive:HiveServer2 ODBC')
  lines.push('')
  lines.push(`ACCESS_KEY <- "${record.accessKeyId}"`)
  lines.push('SECRET_KEY <- "<SecretKey>"         # 创建 Key 时返回的密钥')
  if (useDoris) {
    const d = CONNECTION_ENDPOINT.doris
    lines.push('')
    lines.push('# ── Doris ──')
    lines.push('doris <- dbConnect(')
    lines.push('  MariaDB(),')
    lines.push(`  host = "${d.host}", port = ${d.port},`)
    lines.push('  user = ACCESS_KEY, password = SECRET_KEY,')
    lines.push('  dbname = "ADM"')
    lines.push(')')
  }
  if (useHive) {
    const h = CONNECTION_ENDPOINT.hive
    lines.push('')
    lines.push('# ── Hive ──')
    lines.push('hive <- dbConnect(')
    lines.push('  odbc(),')
    lines.push('  Driver = "Hive",')
    lines.push(`  Host = "${h.host}", Port = ${h.port},`)
    lines.push('  UID = ACCESS_KEY, PWD = SECRET_KEY')
    lines.push(')')
  }
  return lines.join('\n')
}