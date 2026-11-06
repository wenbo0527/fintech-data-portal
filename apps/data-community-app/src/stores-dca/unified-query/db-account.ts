/**
 * 统一查询 · 数据库账号管理 store
 *
 * 管理两类自助申请:
 *   1. 数据源权限(Doris / Hive)— 提交后进入审批中,约 2 秒模拟审批通过
 *   2. 访问 Key(Python / R)— 创建 / 重置时返回一次性明文 SecretKey
 *
 * 全部为前端 Mock,不发起任何 HTTP 请求。
 */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  ACCOUNT_OWNER,
  GRANT_SCOPE_OPTIONS,
  randomAccessKeyId,
  randomSecretKey,
  SEED_ACCESS_KEYS,
  SEED_DB_ACCOUNT_GRANTS
} from '@/mock/unified-query/db-account'
import type {
  AccessKeyRecord,
  ClientLanguage,
  DataSourceKey,
  DbAccountGrant,
  DbPrivilegeLevel
} from '@/mock/unified-query/types'

/** 审批模拟耗时(ms):让「审批中」态可被肉眼观察到 */
const APPROVAL_DELAY = 2000

const seqByDate: Record<string, number> = {}

function pad(n: number, len = 3): string {
  return String(n).padStart(len, '0')
}

function nextId(prefix: 'DB' | 'AK', dateKey: string): string {
  const key = `${prefix}${dateKey}`
  seqByDate[key] = (seqByDate[key] ?? 0) + 1
  return `${prefix}${dateKey}-${pad(seqByDate[key])}`
}

function nowParts(): { stamp: string; dateKey: string } {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  const dateKey = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`
  const stamp = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
  return { stamp, dateKey }
}

/** 当前时间 + n 个月,返回 YYYY-MM-DD */
function addMonths(months: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() + months)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** 当前时间 + n 天,返回 YYYY-MM-DD */
function addDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** 按用户 + 数据源生成账号名:zhangsan → dq_zhangsan_dr / dq_zhangsan_hc */
function buildAccountName(datasource: DataSourceKey): string {
  return `dq_${ACCOUNT_OWNER.account}_${datasource === 'doris' ? 'dr' : 'hc'}`
}

export const useUqDbAccountStore = defineStore('uqDbAccount', () => {
  /** 账号权限申请记录(按申请时间倒序) */
  const grants = ref<DbAccountGrant[]>(
    SEED_DB_ACCOUNT_GRANTS.map(g => ({ ...g, databases: [...g.databases], history: g.history.map(h => ({ ...h })) }))
  )
  /** 访问 Key 列表 */
  const keys = ref<AccessKeyRecord[]>(
    SEED_ACCESS_KEYS.map(k => ({ ...k, datasources: [...k.datasources] }))
  )

  /** 某个数据源的最新一份申请(即当前状态口径) */
  function latestGrant(datasource: DataSourceKey): DbAccountGrant | null {
    return grants.value
      .filter(g => g.datasource === datasource)
      .sort((a, b) => b.appliedAt.localeCompare(a.appliedAt))[0] ?? null
  }

  const dorisGrant = computed(() => latestGrant('doris'))
  const hiveGrant = computed(() => latestGrant('hive'))

  /** 已开通或审批中的权限(访问 Key 的可选数据源) */
  const availableDatasources = computed<DataSourceKey[]>(() =>
    (['doris', 'hive'] as DataSourceKey[]).filter(ds => {
      const g = latestGrant(ds)
      return g?.status === 'active' || g?.status === 'applying'
    })
  )

  const stats = computed(() => {
    const activeGrants = grants.value.filter(g => g.status === 'active').length
    const activeKeys = keys.value.filter(k => k.status === 'active').length
    const pending = grants.value.filter(g => g.status === 'applying').length
    const callCount = keys.value.reduce((sum, k) => sum + k.callCount, 0)
    return { activeGrants, activeKeys, pending, callCount }
  })

  const getGrantById = (id: string) => grants.value.find(g => g.id === id) ?? null
  const getKeyById = (id: string) => keys.value.find(k => k.id === id) ?? null

  /** 审批通过:写入开通信息 + 流转记录 */
  function approve(grant: DbAccountGrant, validMonths: number, action: string) {
    const { stamp } = nowParts()
    grant.status = 'active'
    grant.approvedAt = stamp
    grant.approver = '王工(DBA)'
    grant.expireAt = addMonths(validMonths)
    grant.history.push({
      ts: stamp,
      action,
      actor: '王工(DBA)',
      from: 'applying',
      to: 'active',
      comment: `账号 ${grant.accountName} 已生效,有效期至 ${grant.expireAt}`
    })
  }

  /** 模拟审批推进:applying → active */
  function simulateApproval(grant: DbAccountGrant, validMonths: number, action: string) {
    setTimeout(() => {
      // 期间被释放则不再回写
      if (grant.status !== 'applying') return
      approve(grant, validMonths, action)
    }, APPROVAL_DELAY)
  }

  /** 提交数据源权限申请,返回新建记录 */
  function applyGrant(payload: {
    datasource: DataSourceKey
    databases: string[]
    privilege: DbPrivilegeLevel
    validMonths: number
    purpose: string
  }): DbAccountGrant {
    const { stamp, dateKey } = nowParts()
    const cluster = GRANT_SCOPE_OPTIONS[payload.datasource].cluster
    const previous = latestGrant(payload.datasource)
    const record: DbAccountGrant = {
      id: nextId('DB', dateKey),
      datasource: payload.datasource,
      accountName: previous?.accountName ?? buildAccountName(payload.datasource),
      cluster,
      databases: [...payload.databases],
      privilege: payload.privilege,
      status: 'applying',
      validMonths: payload.validMonths,
      appliedAt: stamp,
      purpose: payload.purpose,
      history: [
        { ts: stamp, action: '提交账号开通申请', actor: ACCOUNT_OWNER.name, to: 'applying' },
        {
          ts: stamp,
          action: '进入 DBA 审批队列',
          actor: '权限平台',
          comment: `${payload.privilege === 'read' ? '只读' : '读写'}权限 · ${payload.databases.join('、')} 库`
        }
      ]
    }
    grants.value.unshift(record)
    simulateApproval(record, payload.validMonths, 'DBA 审批通过并完成授权')
    return record
  }

  /** 续期:重新走一次审批,通过后从当前时间起算有效期 */
  function extendGrant(id: string, validMonths: number): DbAccountGrant | null {
    const grant = getGrantById(id)
    if (!grant) return null
    const { stamp } = nowParts()
    grant.status = 'applying'
    grant.validMonths = validMonths
    grant.history.push({
      ts: stamp,
      action: `提交续期申请(${validMonths} 个月)`,
      actor: ACCOUNT_OWNER.name,
      from: 'active',
      to: 'applying'
    })
    simulateApproval(grant, validMonths, 'DBA 续期审批通过')
    return grant
  }

  /** 释放账号:立即失效,不可恢复(演示态) */
  function revokeGrant(id: string): boolean {
    const grant = getGrantById(id)
    if (!grant) return false
    const { stamp } = nowParts()
    const from = grant.status
    grant.status = 'revoked'
    grant.history.push({
      ts: stamp,
      action: '释放数据库账号',
      actor: ACCOUNT_OWNER.name,
      from,
      to: 'revoked',
      comment: '授权立即失效,如需再次使用请重新申请'
    })
    return true
  }

  /** 新建访问 Key,返回含明文 SecretKey 的记录(仅此次可见) */
  function createKey(payload: {
    name: string
    language: ClientLanguage
    datasources: DataSourceKey[]
    expireDays: number
    purpose: string
  }): AccessKeyRecord {
    const { stamp, dateKey } = nowParts()
    const record: AccessKeyRecord = {
      id: nextId('AK', dateKey),
      name: payload.name,
      accessKeyId: randomAccessKeyId(),
      secretKey: randomSecretKey(),
      language: payload.language,
      datasources: [...payload.datasources],
      status: 'active',
      createdAt: stamp,
      expireAt: addDays(payload.expireDays),
      lastUsedAt: null,
      callCount: 0,
      purpose: payload.purpose,
      owner: ACCOUNT_OWNER.name
    }
    keys.value.unshift(record)
    return record
  }

  /** 停用 / 启用切换 */
  function toggleKey(id: string): AccessKeyRecord | null {
    const key = getKeyById(id)
    if (!key || key.status === 'expired') return null
    key.status = key.status === 'active' ? 'disabled' : 'active'
    return key
  }

  /** 重置 SecretKey,返回新密钥(仅此次可见) */
  function resetSecret(id: string): string | null {
    const key = getKeyById(id)
    if (!key) return null
    key.secretKey = randomSecretKey()
    key.status = 'active'
    return key.secretKey
  }

  /** 删除访问 Key */
  function deleteKey(id: string): boolean {
    const idx = keys.value.findIndex(k => k.id === id)
    if (idx < 0) return false
    keys.value.splice(idx, 1)
    return true
  }

  return {
    grants,
    keys,
    dorisGrant,
    hiveGrant,
    availableDatasources,
    stats,
    latestGrant,
    getGrantById,
    getKeyById,
    applyGrant,
    extendGrant,
    revokeGrant,
    createKey,
    toggleKey,
    resetSecret,
    deleteKey
  }
})