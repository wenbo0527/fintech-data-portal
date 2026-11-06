/**
 * 统一查询 · 数据库账号管理(管理端) store
 *
 * 面向 DBA 的全库管理能力:
 *   - 账号:重置密码(一次性下发)、修改权限与授权库、锁定 / 解锁、停用、回收
 *   - 访问 Key:跨用户重置密钥、停用 / 启用、吊销
 *   - 审计:所有管理动作写入审计流水
 *
 * 全部为前端 Mock,不发起任何 HTTP 请求;密码明文只作为返回值抛出,不落库。
 */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  ADMIN_OPERATOR,
  generatePassword,
  SEED_ADMIN_AUDITS,
  SEED_ADMIN_EXTRA_KEYS,
  SEED_DB_ACCOUNTS
} from '@/mock/unified-query/db-account-admin'
import { ACCOUNT_OWNER, randomSecretKey, SEED_ACCESS_KEYS } from '@/mock/unified-query/db-account'
import { useUqDbAccountStore } from './db-account'
import type {
  AccessKeyRecord,
  DbAccount,
  DbAccountState,
  DbAdminAuditEntry,
  DbPrivilegeLevel
} from '@/mock/unified-query/types'

function nowStamp(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

function cloneAccount(a: DbAccount): DbAccount {
  return { ...a, databases: [...a.databases] }
}

/** 批量重置的单条结果:ok 为 false 时 reason 说明跳过原因 */
export interface BatchResetResult {
  accountName: string
  ownerName: string
  ok: boolean
  /** 仅 ok 为 true 时有值,明文不落库 */
  password?: string
  reason?: string
}

export const useUqDbAccountAdminStore = defineStore('uqDbAccountAdmin', () => {
  /** 用户自助版 store:用于把用户新开通的账号 / 新建的 Key 同步进管理端 */
  const userStore = useUqDbAccountStore()

  const accounts = ref<DbAccount[]>(SEED_DB_ACCOUNTS.map(cloneAccount))
  const keys = ref<AccessKeyRecord[]>([
    ...SEED_ACCESS_KEYS.map(k => ({ ...k, datasources: [...k.datasources] })),
    ...SEED_ADMIN_EXTRA_KEYS.map(k => ({ ...k, datasources: [...k.datasources] }))
  ])
  const audits = ref<DbAdminAuditEntry[]>(SEED_ADMIN_AUDITS.map(a => ({ ...a })))

  let auditSeq = SEED_ADMIN_AUDITS.length

  /** 全库概览 */
  const stats = computed(() => {
    const total = accounts.value.length
    const abnormal = accounts.value.filter(a => a.state !== 'normal').length
    const activeKeys = keys.value.filter(k => k.status === 'active').length
    const totalCalls = keys.value.reduce((sum, k) => sum + k.callCount, 0)
    return { total, abnormal, activeKeys, totalCalls }
  })

  /** 按用户去重的筛选项 */
  const ownerOptions = computed(() => {
    const seen = new Map<string, string>()
    for (const a of accounts.value) {
      if (!seen.has(a.ownerAccount)) seen.set(a.ownerAccount, a.ownerName)
    }
    return [{ label: '全部用户', value: 'all' }, ...[...seen.entries()].map(([value, label]) => ({ label, value }))]
  })

  const getAccountById = (id: string) => accounts.value.find(a => a.id === id) ?? null
  const getKeyById = (id: string) => keys.value.find(k => k.id === id) ?? null

  /** 写审计流水(置顶) */
  function writeAudit(payload: Omit<DbAdminAuditEntry, 'id' | 'ts' | 'operator'>) {
    auditSeq += 1
    audits.value.unshift({
      id: `AU${String(auditSeq).padStart(4, '0')}`,
      ts: nowStamp(),
      operator: ADMIN_OPERATOR,
      ...payload
    })
  }

  /**
   * 重置账号密码
   *
   * 返回一次性明文密码(仅此次可见);`unlock` 为真时同步解除锁定,
   * 这是 DBA 处理「用户忘记密码 + 账号被锁」的标准动作。
   */
  function resetPassword(id: string, payload: { reason: string; unlock: boolean }): string | null {
    const account = getAccountById(id)
    if (!account) return null
    const password = generatePassword()
    account.passwordUpdatedAt = nowStamp()
    const unlocked = payload.unlock && account.state === 'locked'
    if (unlocked) {
      account.state = 'normal'
      account.remark = undefined
    }
    writeAudit({
      action: '重置密码',
      target: account.accountName,
      targetUser: account.ownerName,
      detail: `${payload.reason}${unlocked ? ';同步解除账号锁定' : ''};新密码一次性下发,系统不保存明文`,
      level: 'info'
    })
    return password
  }

  /**
   * 批量重置密码
   *
   * 逐个生成一次性密码并写审计;已停用账号无法登录,直接跳过并返回原因。
   * 锁定账号允许重置(可同时解锁),因为「忘记密码 + 被锁」是最常见的工单。
   */
  function resetPasswords(
    ids: string[],
    payload: { reason: string; unlock: boolean }
  ): BatchResetResult[] {
    const results: BatchResetResult[] = []
    for (const id of ids) {
      const account = getAccountById(id)
      if (!account) continue
      if (account.state === 'disabled') {
        results.push({
          accountName: account.accountName,
          ownerName: account.ownerName,
          ok: false,
          reason: '账号已停用,需先恢复账号'
        })
        continue
      }
      const password = generatePassword()
      account.passwordUpdatedAt = nowStamp()
      const unlocked = payload.unlock && account.state === 'locked'
      if (unlocked) {
        account.state = 'normal'
        account.remark = undefined
      }
      writeAudit({
        action: '重置密码',
        target: account.accountName,
        targetUser: account.ownerName,
        detail: `批量重置:${payload.reason}${unlocked ? ';同步解除账号锁定' : ''};新密码一次性下发,系统不保存明文`,
        level: 'info'
      })
      results.push({
        accountName: account.accountName,
        ownerName: account.ownerName,
        ok: true,
        password,
        reason: unlocked ? '已同步解锁' : ''
      })
    }
    return results
  }

  /** 修改账号权限:权限级别 + 授权库,可同时延长有效期 */
  function updateAccountGrant(
    id: string,
    payload: { privilege: DbPrivilegeLevel; databases: string[]; expireAt?: string; reason: string }
  ): boolean {
    const account = getAccountById(id)
    if (!account) return false
    const before = `${privilegeText(account.privilege)} · ${account.databases.join('、')}`
    const after = `${privilegeText(payload.privilege)} · ${payload.databases.join('、')}`
    account.privilege = payload.privilege
    account.databases = [...payload.databases]
    if (payload.expireAt) account.expireAt = payload.expireAt
    writeAudit({
      action: '修改权限',
      target: account.accountName,
      targetUser: account.ownerName,
      detail: `${before} → ${after}${payload.expireAt ? `;有效期延长至 ${payload.expireAt}` : ''};${payload.reason}`,
      level: 'warn'
    })
    return true
  }

  /** 锁定 / 解锁 */
  function setAccountState(id: string, state: DbAccountState, remark: string): boolean {
    const account = getAccountById(id)
    if (!account || account.state === state) return false
    account.state = state
    account.remark = state === 'normal' ? undefined : remark
    writeAudit({
      action: state === 'normal' ? '解锁账号' : state === 'locked' ? '锁定账号' : '停用账号',
      target: account.accountName,
      targetUser: account.ownerName,
      detail: remark,
      level: state === 'normal' ? 'info' : 'warn'
    })
    return true
  }

  /** 回收账号:从库内移除,不可恢复 */
  function revokeAccount(id: string, reason: string): boolean {
    const idx = accounts.value.findIndex(a => a.id === id)
    if (idx < 0) return false
    const account = accounts.value[idx]
    accounts.value.splice(idx, 1)
    writeAudit({
      action: '回收账号',
      target: account.accountName,
      targetUser: account.ownerName,
      detail: `${reason};库内账号与残留会话已清理`,
      level: 'danger'
    })
    return true
  }

  /** 管理员重置某个 Key 的 SecretKey,返回新密钥(仅此次可见) */
  function resetKeySecret(id: string): string | null {
    const key = getKeyById(id)
    if (!key) return null
    key.secretKey = randomSecretKey()
    key.status = 'active'
    writeAudit({
      action: '重置密钥',
      target: key.accessKeyId,
      targetUser: key.owner,
      detail: `Key「${key.name}」的 SecretKey 已重置,旧密钥立即失效;新密钥一次性下发`,
      level: 'danger'
    })
    return key.secretKey
  }

  /** 停用 / 启用 Key */
  function toggleKey(id: string): AccessKeyRecord | null {
    const key = getKeyById(id)
    if (!key || key.status === 'expired') return null
    key.status = key.status === 'active' ? 'disabled' : 'active'
    writeAudit({
      action: key.status === 'active' ? '启用密钥' : '停用密钥',
      target: key.accessKeyId,
      targetUser: key.owner,
      detail: `Key「${key.name}」${key.status === 'active' ? '已恢复调用' : '停止调用,已建立连接不受影响'}`,
      level: 'warn'
    })
    return key
  }

  /** 吊销 Key(删除) */
  function revokeKey(id: string): boolean {
    const idx = keys.value.findIndex(k => k.id === id)
    if (idx < 0) return false
    const key = keys.value[idx]
    keys.value.splice(idx, 1)
    writeAudit({
      action: '吊销密钥',
      target: key.accessKeyId,
      targetUser: key.owner,
      detail: `Key「${key.name}」已吊销,SecretKey 立即失效`,
      level: 'danger'
    })
    return true
  }

  /** 当前用户访问的 Key(用于「我的 Key」提示) */
  const myKeyCount = computed(
    () => keys.value.filter(k => k.owner === ACCOUNT_OWNER.name).length
  )

  /**
   * 把用户自助版新开通的账号 / 新建的 Key 同步到管理端
   *
   * 演示环境两个版本共用同一份「真实库」,用户在自助侧开通后
   * 管理员应当能立刻在清单里看到该账号。
   */
  function syncSelfService() {
    for (const grant of userStore.grants) {
      if (grant.status !== 'active') continue
      if (accounts.value.some(a => a.accountName === grant.accountName)) continue
      const stamp = grant.approvedAt ?? grant.appliedAt
      accounts.value.unshift({
        id: `DA${String(accounts.value.length + 1).padStart(4, '0')}`,
        accountName: grant.accountName,
        ownerName: ACCOUNT_OWNER.name,
        ownerAccount: ACCOUNT_OWNER.account,
        department: ACCOUNT_OWNER.department,
        employeeNo: ACCOUNT_OWNER.employeeNo,
        datasource: grant.datasource,
        cluster: grant.cluster,
        databases: [...grant.databases],
        privilege: grant.privilege,
        state: 'normal',
        passwordUpdatedAt: stamp,
        passwordValidDays: 90,
        createdAt: stamp,
        expireAt: grant.expireAt ?? '—',
        lastLoginAt: grant.lastLoginAt ?? null,
        keyCount: 0,
        source: 'self-service'
      })
    }
    for (const key of userStore.keys) {
      if (keys.value.some(k => k.accessKeyId === key.accessKeyId)) continue
      keys.value.unshift({ ...key, datasources: [...key.datasources], owner: ACCOUNT_OWNER.name })
    }
  }

  return {
    accounts,
    keys,
    audits,
    stats,
    ownerOptions,
    myKeyCount,
    getAccountById,
    getKeyById,
    resetPassword,
    resetPasswords,
    updateAccountGrant,
    setAccountState,
    revokeAccount,
    resetKeySecret,
    toggleKey,
    revokeKey,
    syncSelfService,
    writeAudit
  }
})

/** 权限级别文案(store 内使用,避免与 mock 层循环依赖) */
function privilegeText(level: DbPrivilegeLevel): string {
  return level === 'read' ? '只读' : level === 'write' ? '读写' : '管理'
}