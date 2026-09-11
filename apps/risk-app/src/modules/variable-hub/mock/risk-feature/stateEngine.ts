/**
 * 风险特征 11 状态机 mock 引擎
 * 来源：风险数据一体化一期 文档 §四 状态流转表
 *
 * INT-01~INT-11 全部用 mock 接口模拟，包含：
 * - 提 OA 单（开发/验收/投产）
 * - 数仓任务回调
 * - 内数 API 注册/变更
 * - 特征中心注册/确认
 * - 失败重试
 * - 特征中心下线批次
 *
 * 状态机严格对齐文档 v2.1 D.4 色板（11 正常 + 4 异常 = 15 态）：
 *   需求提出 → 已注册 → 开发中(OA单) → 数仓已上线 → 待业务验证 → 业务已验证 → 管理员已确认 →
 *   参数准备 → 内数注册中 → 特征中心注册中 → 已上线 → 已下线
 * 数据形态分界：管理员已确认（含）之前为离线分析，之后为在线接口
 */

import { midloanStatusMeta } from '@/modules/variable-hub/constants/midloanStatusMap'
import { variableAssets } from '@/modules/variable-hub/mock/variable-management/variables'
import { DemoFlags } from '@/modules/variable-hub/mock/risk-feature/demoFlags'

// ============ 同步日志（全局）============
interface SyncLog {
  id: string                          // SYNC-YYYYMMDD-NNNNNN
  featureId: string
  featureName: string
  type: 'oa_dev' | 'oa_verify' | 'oa_production' | 'oa_production_internal' | 'oa_production_variable'
       | 'dw_callback' | 'internal_sync' | 'variable_sync' | 'offline_batch'
  direction: 'call' | 'callback' | 'batch'
  status: 'success' | 'failed' | 'pending'
  request?: any
  response?: any
  reason?: string                     // 失败原因
  startedAt: string
  finishedAt?: string
  retryCount: number
  operator?: string
}

// ============ 状态变更记录（按特征）============
interface StatusChangeLog {
  id: string                          // CHG-YYYYMMDD-NNNNNN
  featureId: string
  featureName: string
  fromStatus: string
  toStatus: string
  trigger: string                     // 触发条件/动作
  operator: string                    // 操作人（人或系统）
  operatorRole: string                // 角色
  operatedAt: string                  // 操作时间
  reason?: any                     // 备注（如驳回原因）
}

let statusChangeLogs: StatusChangeLog[] = []

function chgId() {
  const d = new Date()
  const ymd = d.toISOString().slice(0, 10).replace(/-/g, '')
  const count = (statusChangeLogs as any[]).filter((l: any) => l.id.startsWith(`CHG-${ymd}-`)).length
  return `CHG-${ymd}-${String(count + 1).padStart(6, '0')}`
}

export const StatusChangeStore = {
  list(filter: any = {}): any[] {
    let list: any[] = [...statusChangeLogs]
    list = list.reverse()
    if (filter.featureId) list = list.filter((l: any) => l.featureId === filter.featureId)
    return list
  },
  push(log: StatusChangeLog) {
    statusChangeLogs.push(log)
    return log
  },
  clear() {
    statusChangeLogs = []
  }
}

let syncLogs: SyncLog[] = []

function logId() {
  const d = new Date()
  const ymd = d.toISOString().slice(0, 10).replace(/-/g, '')
  const count = (syncLogs as any[]).filter((l: any) => l.id.startsWith(`SYNC-${ymd}-`)).length
  return `SYNC-${ymd}-${String(count + 1).padStart(6, '0')}`
}

function nowStr() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ')
}

/**
 * 文档 D.3 状态时间戳字段映射
 * 每个状态切换时同时记录对应的时间戳
 */
const STATUS_TIMESTAMP_MAP: Record<string, string> = {
  requirement_proposal: 'requirementProposalAt',
  registered: 'registeredAt',
  developing_oa: 'developingOaAt',
  dw_online: 'dwOnlineAt',
  business_acceptance: 'businessAcceptanceAt',
  business_verified: 'businessVerifiedAt',
  admin_confirmed: 'adminConfirmedAt',
  oa_production_reviewing: 'oaProductionReviewingAt',
  param_preparing: 'paramPreparingAt',
  syncing_internal: 'syncingInternalAt',
  syncing_variable: 'syncingVariableAt',
  online: 'onlineAt',
  offline: 'offlineTime',  // 已存在
  archived: 'archivedAt'
}

/** 在状态变更时同时记录时间戳 */
function setStatusTimestamp(v: any, status: string) {
  const field = STATUS_TIMESTAMP_MAP[status]
  if (field) {
    v[field] = nowStr()
  }
}

/**
 * G2 R05: 内数同步失败后自动重试策略
 * - 最多 3 次
 * - 每次间隔 5 秒
 * - 重试后仍未成功 → 停留在 internal_sync_failed 等用户手动重试
 */
const autoRetryTimers: Record<string, any> = {}
function scheduleAutoRetry(featureId: string, currentRetryCount: number, retryFn: (id: string, auto?: boolean) => any) {
  // 已达最大重试次数（3次），停止自动重试
  if (currentRetryCount >= 3) {
    recordStatusChange(featureId, '', 'internal_sync_failed', 'internal_sync_failed', 'G2 R05 超过最大重试次数', '内数系统', 'internal_number_system', `已重试 ${currentRetryCount} 次，需用户手动重试`)
    return
  }
  // 清理已有定时器
  if (autoRetryTimers[featureId]) {
    clearTimeout(autoRetryTimers[featureId])
  }
  // 5 秒后自动重试
  autoRetryTimers[featureId] = setTimeout(() => {
    delete autoRetryTimers[featureId]
    const v = variableAssets.find(x => x.id === featureId)
    if (!v) return
    // 仅当仍处于失败状态时重试
    if (v.midloanStatus === 'internal_sync_failed') {
      retryFn(featureId, true)  // autoTriggered = true
    }
  }, 5000)
}

// ============ 同步日志 API ============
export const SyncLogStore = {
  list(filter: any = {}): any[] {
    let list: any[] = [...syncLogs]
    list = list.reverse()
    if (filter.featureId) list = list.filter((l: any) => l.featureId === filter.featureId)
    if (filter.type) list = list.filter((l: any) => l.type === filter.type)
    if (filter.status) list = list.filter((l: any) => l.status === filter.status)
    return list
  },
  push(log: SyncLog) {
    syncLogs.push(log)
    return log
  },
  clear() {
    syncLogs = []
  }
}

// ============ 下线记录 ============
interface OfflineRecord {
  batchId: string
  featureId: string
  featureName: string
  offlineAt: string
  reason: string
  status: 'success' | 'failed'
  detail?: string
}
let offlineRecords: OfflineRecord[] = [
  {
    batchId: 'BATCH-20260730-001',
    featureId: 'MIDLOAN-FEAT-0007',
    featureName: '旧版近30日大额交易',
    offlineAt: '2026-07-30 02:00:00',
    reason: '模型 V3 升级，汰换 V2 衍生特征',
    status: 'success'
  },
  {
    batchId: 'BATCH-20260802-002',
    featureId: 'MIDLOAN-FEAT-0008',
    featureName: '近90日多头借贷查询次数',
    offlineAt: '2026-08-02 02:00:00',
    reason: '数据源服务下线',
    status: 'success'
  },
  // ============ 补齐：失败的批次记录（K2 E1）============
  {
    batchId: 'BATCH-20260805-003',
    featureId: 'MIDLOAN-FEAT-0016',
    featureName: '近7日银行卡号变更次数',
    offlineAt: '2026-08-05 02:00:00',
    reason: '特征中心批量接口返回 503',
    status: 'failed',
    detail: '批量接口响应超时，3 条特征中 1 条未确认（feature_id=MIDLOAN-FEAT-0016）'
  }
]

export const OfflineRecordStore = {
  list() {
    return [...offlineRecords].reverse() as any[]
  },
  push(rec: OfflineRecord) {
    offlineRecords.push(rec)
    return rec
  },
  /** 批次结果统计（K2 R03） */
  batchSummary() {
    const success = (offlineRecords as any[]).filter((r: any) => r.status === 'success').length
    const failed = (offlineRecords as any[]).filter((r: any) => r.status === 'failed').length
    return { total: offlineRecords.length, success, failed }
  }
}

/** 记录状态变更（D.3 / B2 R11） */
export function recordStatusChange(featureId: string, featureName: string, fromStatus?: string, toStatus?: string, trigger?: string, operator?: string, operatorRole?: string, reason?: any) {
  StatusChangeStore.push({
    id: chgId(),
    featureId,
    featureName,
    fromStatus: fromStatus || '',
    toStatus: toStatus || '',
    trigger: trigger || '',
    operator: operator || '小李',
    operatorRole: operatorRole || 'risk_data_member',
    operatedAt: nowStr(),
    reason
  })
}

// ============ 11 状态机 mock 联动动作 ============

/** A0：需求提出 → 已注册（管理员审核补充标准化附件后进入注册） */
export function submitRequirement(featureId: string, payload?: { remark?: string; standardizedAttachment?: boolean }): { ok: boolean; reason?: string } {
  const v = variableAssets.find(x => x.id === featureId)
  if (!v) return { ok: false, reason: '特征不存在' }
  if (v.midloanStatus !== 'requirement_proposal') {
    return { ok: false, reason: `当前状态（${midloanStatusMeta(v.midloanStatus).label}）不允许审核注册` }
  }
  // 需求7：重复备案前置校验
  const dupCheck = checkDuplicate(featureId)
  if (dupCheck.isDuplicate) {
    return { ok: false, reason: `重复备案校验未通过：${dupCheck.reason}` }
  }
  // 需求3：流程不做回退，管理员审核后直接进入注册
  const fromStatus = v.midloanStatus
  v.midloanStatus = 'registered'
  setStatusTimestamp(v, 'registered')
  // 需求8：注册前完成参数映射
  v.paramMappingStatus = 'completed'
  v.paramMappingVerifiedAt = nowStr()
  recordStatusChange(featureId, v.name, fromStatus, 'registered', 'A0 管理员审核通过', '管理员', 'risk_data_admin', payload?.remark || '管理员审核通过，补充标准化附件后进入注册')
  return { ok: true }
}

/** 需求7：重复备案前置校验 - 新增特征做前置重复校验 */
export function checkDuplicate(featureId: string): { ok: boolean; isDuplicate: boolean; duplicateWith?: string; reason?: string } {
  const v = variableAssets.find(x => x.id === featureId)
  if (!v) return { ok: false, isDuplicate: false, reason: '特征不存在' }
  // 模拟：在存量数据中查找同名或同编码的特征
  const duplicate = variableAssets.find(x =>
    x.id !== featureId &&
    (x.name === v.name || x.code === v.code)
  )
  const now = nowStr()
  if (duplicate) {
    v.duplicateCheckStatus = 'failed'
    v.duplicateCheckedAt = now
    recordStatusChange(featureId, v.name, '', '', '需求7 重复备案校验', '系统', 'internal_number_system', `与已有特征 ${duplicate.id}(${duplicate.name}) 重复`)
    return { ok: true, isDuplicate: true, duplicateWith: duplicate.id, reason: `与已有特征 ${duplicate.name} 重复` }
  }
  v.duplicateCheckStatus = 'passed'
  v.duplicateCheckedAt = now
  recordStatusChange(featureId, v.name, '', '', '需求7 重复备案校验通过', '系统', 'internal_number_system', '无重复，校验通过')
  return { ok: true, isDuplicate: false }
}

/** 需求8：参数有效性验证 - 上线前做参数有效性验证 */
export function validateParams(featureId: string): { ok: boolean; passed: boolean; reason?: string } {
  const v = variableAssets.find(x => x.id === featureId)
  if (!v) return { ok: false, passed: false, reason: '特征不存在' }
  const now = nowStr()
  // 模拟：检查参数映射是否完成、数据底表是否补充、接口号是否分配
  if (!v.paramMappingStatus || v.paramMappingStatus !== 'completed') {
    v.paramValidationStatus = 'failed'
    v.paramValidatedAt = now
    recordStatusChange(featureId, v.name, '', '', '需求8 参数有效性验证失败', '系统', 'internal_number_system', '参数映射未完成')
    return { ok: true, passed: false, reason: '参数映射未完成，请先完成参数映射' }
  }
  if (!v.dataTableName) {
    v.paramValidationStatus = 'failed'
    v.paramValidatedAt = now
    recordStatusChange(featureId, v.name, '', '', '需求8 参数有效性验证失败', '系统', 'internal_number_system', '数据底表未补充')
    return { ok: true, passed: false, reason: '数据底表未补充' }
  }
  v.paramValidationStatus = 'passed'
  v.paramValidatedAt = now
  recordStatusChange(featureId, v.name, '', '', '需求8 参数有效性验证通过', '系统', 'internal_number_system', '参数映射已完成，数据底表已补充，验证通过')
  return { ok: true, passed: true }
}

/** C1：提 OA 开发单 */
export function submitDevOA(
  featureId: string,
  payload?: {
    oaOrderId?: string
    remark?: string
    requirementHandler?: string
    requirementName?: string
    requirementDescription?: string
    attachments?: Array<{ name?: string; uid?: string; url?: string; size?: number }>
  }
): { ok: boolean; oaId?: string; reason?: string } {
  const v = variableAssets.find(x => x.id === featureId)
  if (!v) return { ok: false, reason: '特征不存在' }
  if (v.midloanStatus !== 'registered') {
    return { ok: false, reason: `当前状态（${midloanStatusMeta(v.midloanStatus).label}）不允许提开发单` }
  }
  if (DemoFlags.isOADown()) {
    SyncLogStore.push({
      id: logId(),
      featureId,
      featureName: v.name,
      type: 'oa_dev',
      direction: 'call',
      status: 'failed',
      reason: 'OA系统响应超时（演示开关触发）',
      startedAt: nowStr(),
      finishedAt: nowStr(),
      retryCount: 0
    })
    return { ok: false, reason: 'OA系统响应超时（演示开关触发）' }
  }
  // 优先使用用户填写的 OA 单号，否则自动生成
  const oaId = payload?.oaOrderId || `OA-DEV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 9000 + 1000)}`
  const fromStatus = v.midloanStatus
  v.midloanStatus = 'developing_oa'
  setStatusTimestamp(v, 'developing_oa')
  v.devOaOrderId = oaId
  // 需求6：OA回调同步OA单链接
  v.oaDocLink = `https://oa.example.com/doc/${oaId}`
  // 记录需求处理人（写入 developer 字段）
  if (payload?.requirementHandler) {
    v.developer = payload.requirementHandler
  }
  // 构建变更说明
  const reqName = payload?.requirementName ? `需求名称：${payload.requirementName}；` : ''
  const reqHandler = payload?.requirementHandler ? `处理人：${payload.requirementHandler}；` : ''
  const attachmentCount = payload?.attachments?.length ? `附件${payload.attachments.length}个；` : ''
  const devRemark = payload?.remark ? `（备注：${payload.remark}）` : ''
  const detail = `${reqName}${reqHandler}${attachmentCount}OA单号：${oaId}${devRemark}`
  recordStatusChange(featureId, v.name, fromStatus, 'developing_oa', 'C1 提开发OA单', '小李', 'risk_data_member', detail)
  SyncLogStore.push({
    id: logId(),
    featureId,
    featureName: v.name,
    type: 'oa_dev',
    direction: 'call',
    status: 'success',
    request: {
      featureId,
      receiver: '数仓团队',
      requirementHandler: payload?.requirementHandler,
      requirementName: payload?.requirementName,
      requirementDescription: payload?.requirementDescription,
      attachments: payload?.attachments
    },
    response: { oaId, receiver: 'dw_team' },
    startedAt: nowStr(),
    finishedAt: nowStr(),
    retryCount: 0,
    operator: '小李'
  })
  return { ok: true, oaId }
}

/** D1：模拟数仓回调（成功/失败） */
export function dwCallback(featureId: string, success = true, taskId = ''): { ok: boolean; reason?: string } {
  const v = variableAssets.find(x => x.id === featureId)
  if (!v) return { ok: false, reason: '特征不存在' }
  if (v.midloanStatus !== 'developing_oa') {
    return { ok: false, reason: `当前状态（${midloanStatusMeta(v.midloanStatus).label}）不接受数仓回调` }
  }
  // 演示开关：数仓故障
  if (!success || DemoFlags.isDwDown()) {
    const fromStatus = v.midloanStatus
    v.midloanStatus = 'dw_online_failed'
    recordStatusChange(featureId, v.name, fromStatus, 'dw_online_failed', 'D1 数仓任务回调失败', '数仓任务调度系统', 'dw_system', success ? '数仓任务执行失败（演示开关触发）' : 'Hive 表创建异常')
    SyncLogStore.push({
      id: logId(),
      featureId,
      featureName: v.name,
      type: 'dw_callback',
      direction: 'callback',
      status: 'failed',
      reason: success ? '数仓任务执行失败（演示开关触发）' : '数仓任务执行失败：Hive 表创建异常',
      startedAt: nowStr(),
      finishedAt: nowStr(),
      retryCount: 0
    })
    return { ok: false, reason: '数仓任务执行失败' }
  }
  const now = nowStr()
  const fromStatus = v.midloanStatus
  v.midloanStatus = 'dw_online'
  setStatusTimestamp(v, 'dw_online')
  v.dwTaskId = taskId || `DW-TASK-${Math.floor(Math.random() * 900000 + 100000)}`
  v.dwOnlineTime = now
  recordStatusChange(featureId, v.name, fromStatus, 'dw_online', 'D1 数仓任务回调成功', '数仓任务调度系统', 'dw_system', `任务ID：${v.dwTaskId}`)
  // D1 R07: 数仓回调成功后自动推进至「业务验收」（2026-08-10 会议调整）
  v.midloanStatus = 'business_acceptance'
  setStatusTimestamp(v, 'business_acceptance')
  recordStatusChange(featureId, v.name, 'dw_online', 'business_acceptance', 'D1 R07 自动推进', '数仓任务调度系统', 'dw_system', '数仓已就绪，自动进入待业务验证')
  SyncLogStore.push({
    id: logId(),
    featureId,
    featureName: v.name,
    type: 'dw_callback',
    direction: 'callback',
    status: 'success',
    request: { taskId: v.dwTaskId },
    response: { status: 'success', dataTableName: v.dataTableName || 'ads_midloan_' + featureId.split('-').pop() },
    startedAt: now,
    finishedAt: now,
    retryCount: 0
  })
  return { ok: true }
}

/** E0：业务验证通过（台账内操作，不走OA单·文档 v2.1 E0 R01） */
export function businessVerifyPass(featureId: string, operator = '小李', remark?: string): { ok: boolean; reason?: string } {
  const v = variableAssets.find(x => x.id === featureId)
  if (!v) return { ok: false, reason: '特征不存在' }
  if (v.midloanStatus !== 'business_acceptance') {
    return { ok: false, reason: `当前状态（${midloanStatusMeta(v.midloanStatus).label}）不允许业务验证` }
  }
  const fromStatus = v.midloanStatus
  v.midloanStatus = 'business_verified'
  setStatusTimestamp(v, 'business_verified')
  v.acceptor = operator
  const verifyRemark = remark ? `（验证说明：${remark}）` : ''
  recordStatusChange(featureId, v.name, fromStatus, 'business_verified', 'E0 业务验证通过', operator, 'risk_data_member', `业务验证人在台账内确认通过（不走OA单）${verifyRemark}`)
  return { ok: true }
}

/** E1：管理员确认通过（台账内操作，不走OA单·文档 v2.1 E1 R03） */
export function adminConfirmPass(featureId: string, operator = '培培', remark?: string): { ok: boolean; reason?: string } {
  const v = variableAssets.find(x => x.id === featureId)
  if (!v) return { ok: false, reason: '特征不存在' }
  if (v.midloanStatus !== 'business_verified') {
    return { ok: false, reason: `当前状态（${midloanStatusMeta(v.midloanStatus).label}）不允许管理员确认` }
  }
  const fromStatus = v.midloanStatus
  v.midloanStatus = 'admin_confirmed'
  setStatusTimestamp(v, 'admin_confirmed')
  const confirmRemark = remark ? `（确认说明：${remark}）` : ''
  recordStatusChange(featureId, v.name, fromStatus, 'admin_confirmed', 'E1 管理员确认通过', operator, 'risk_data_admin', `管理员在台账内确认通过（不走OA单），可提投产单${confirmRemark}`)
  return { ok: true }
}

/** F0：提投产单 → 进入 OA 审批闸门（等待审批人通过）（文档 v2.1 F0） */
export function submitProductionOrder(featureId: string, payload?: { remark?: string }): { ok: boolean; reason?: string; oaId?: string } {
  const v = variableAssets.find(x => x.id === featureId)
  if (!v) return { ok: false, reason: '特征不存在' }
  if (v.midloanStatus !== 'admin_confirmed') {
    return { ok: false, reason: `当前状态（${midloanStatusMeta(v.midloanStatus).label}）不允许提投产单` }
  }
  if (DemoFlags.isOADown()) {
    return { ok: false, reason: 'OA系统响应超时，请稍后重试（演示开关触发）' }
  }
  const now = nowStr()
  const oaId = `OA-PROD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 9000 + 1000)}`
  const fromStatus = v.midloanStatus

  // 阶段1：提投产单 → 进入 OA 审批闸门
  v.midloanStatus = 'oa_production_reviewing'
  setStatusTimestamp(v, 'oa_production_reviewing')
  v.onlineOaOrderId = oaId
  v.oaDocLink = `https://oa.example.com/doc/${oaId}`
  const prodRemark = payload?.remark ? `（备注：${payload.remark}）` : ''
  recordStatusChange(featureId, v.name, fromStatus, 'oa_production_reviewing', 'F0 提投产单·进入OA审批', '培培', 'risk_data_admin', `投产单号：${oaId}，等待OA审批人通过${prodRemark}`)

  SyncLogStore.push({
    id: logId(),
    featureId,
    featureName: v.name,
    type: 'oa_production',
    direction: 'call',
    status: 'success',
    request: { featureId, oaType: '投产单', receiver: 'OA系统' },
    response: { oaId, status: 'pending' },
    startedAt: now,
    finishedAt: now,
    retryCount: 0,
    operator: '培培'
  })
  return { ok: true, oaId }
}

/** F0.1：OA 审批通过 → 参数准备 → 内数注册中（文档 v2.1 F0.1） */
export function oaProductionApprove(featureId: string, payload?: { operator?: string; remark?: string }): { ok: boolean; reason?: string } {
  const v = variableAssets.find(x => x.id === featureId)
  if (!v) return { ok: false, reason: '特征不存在' }
  if (v.midloanStatus !== 'oa_production_reviewing') {
    return { ok: false, reason: `当前状态（${midloanStatusMeta(v.midloanStatus).label}）不允许审批` }
  }
  const operator = payload?.operator || '培培'
  const fromStatus = v.midloanStatus

  // 阶段1：OA 审批通过 → 参数准备
  v.midloanStatus = 'param_preparing'
  setStatusTimestamp(v, 'param_preparing')
  const approveRemark = payload?.remark ? `（审批意见：${payload.remark}）` : ''
  recordStatusChange(featureId, v.name, fromStatus, 'param_preparing', 'F0.1 OA审批通过·进入参数准备', operator, 'risk_data_admin', `OA审批通过，系统自动参数映射+有效性验证${approveRemark}`)

  // 阶段2：系统自动参数映射+有效性验证
  const paramCheck = validateParams(featureId)
  if (!paramCheck.passed) {
    // 参数验证失败：回退到 admin_confirmed（让管理员修正后再提）
    v.midloanStatus = 'admin_confirmed'
    setStatusTimestamp(v, 'admin_confirmed')
    recordStatusChange(featureId, v.name, 'param_preparing', 'admin_confirmed', 'F0.1 参数验证失败·回退', '系统', 'system', `参数验证失败：${paramCheck.reason}`)
    return { ok: false, reason: `参数验证失败，请检查映射：${paramCheck.reason}` }
  }

  // 阶段3：验证通过 → 内数注册中
  v.midloanStatus = 'syncing_internal'
  setStatusTimestamp(v, 'syncing_internal')
  recordStatusChange(featureId, v.name, 'param_preparing', 'syncing_internal', 'F0.1 参数验证通过·进入内数注册', '系统', 'system', '参数映射+验证通过，OA单已提给内数团队')

  // 立即触发内数同步
  setTimeout(() => internalSync(featureId, true), 0)
  return { ok: true }
}

/** F0.2：OA 审批驳回 → 回退到 admin_confirmed（文档 v2.1 F0.2） */
export function oaProductionReject(featureId: string, payload?: { operator?: string; remark?: string; reason?: string }): { ok: boolean; reason?: string } {
  const v = variableAssets.find(x => x.id === featureId)
  if (!v) return { ok: false, reason: '特征不存在' }
  if (v.midloanStatus !== 'oa_production_reviewing') {
    return { ok: false, reason: `当前状态（${midloanStatusMeta(v.midloanStatus).label}）不允许驳回` }
  }
  const operator = payload?.operator || '培培'
  const fromStatus = v.midloanStatus
  const fallbackReason = payload?.remark || 'OA审批驳回'

  v.midloanStatus = 'admin_confirmed'
  setStatusTimestamp(v, 'admin_confirmed')
  // payload.reason 为驳回类别，payload.remark 为详细说明
  const category = payload?.reason
  const detail = payload?.remark
  const categoryText = category ? `${category}` : ''
  const detailText = detail ? `，详细说明：${detail}` : ''
  recordStatusChange(featureId, v.name, fromStatus, 'admin_confirmed', 'F0.2 OA审批驳回·回退', operator, 'risk_data_admin', `驳回原因：${categoryText}${detailText || (fallbackReason && fallbackReason !== 'OA审批驳回' ? `（${fallbackReason}）` : '')}`)
  return { ok: true }
}

/** G1：内数同步 */
export function internalSync(featureId: string, autoTriggered = false): { ok: boolean; reason?: string; apiNo?: string } {
  const v = variableAssets.find(x => x.id === featureId)
  if (!v) return { ok: false, reason: '特征不存在' }
  const now = nowStr()
  // 触发失败条件：数据底表名称为空 或 演示开关
  if (!v.dataTableName) {
    const fromStatus = v.midloanStatus
    v.midloanStatus = 'internal_sync_failed'
    v.syncFailedReason = `数据底表名称为空，内数API（INT-01）找不到对应表（feature_id=${featureId}）`
    v.syncFailedAt = now
    v.syncRetryCount = (v.syncRetryCount || 0) + 1
    recordStatusChange(featureId, v.name, fromStatus, 'internal_sync_failed', 'G1 内数同步失败', '内数系统', 'internal_number_system', v.syncFailedReason)
    SyncLogStore.push({
      id: logId(),
      featureId,
      featureName: v.name,
      type: 'internal_sync',
      direction: 'call',
      status: 'failed',
      request: { featureId, dataTableName: v.dataTableName, apiName: v.apiName || '' },
      response: { errorCode: 'INT-01-404', errorMsg: 'table not found' },
      reason: v.syncFailedReason,
      startedAt: now,
      finishedAt: now,
      retryCount: v.syncRetryCount
    })
    // G2 R05: 自动重试（最多 3 次，每次间隔 5 秒）
    scheduleAutoRetry(featureId, v.syncRetryCount, internalSync)
    return { ok: false, reason: v.syncFailedReason }
  }
  // 演示开关：内数故障
  if (DemoFlags.isInternalDown()) {
    const fromStatus = v.midloanStatus
    v.midloanStatus = 'internal_sync_failed'
    v.syncFailedReason = '内数API返回错误（演示开关触发）'
    v.syncFailedAt = now
    v.syncRetryCount = (v.syncRetryCount || 0) + 1
    recordStatusChange(featureId, v.name, fromStatus, 'internal_sync_failed', 'G1 内数同步失败', '内数系统', 'internal_number_system', v.syncFailedReason)
    SyncLogStore.push({
      id: logId(),
      featureId,
      featureName: v.name,
      type: 'internal_sync',
      direction: 'call',
      status: 'failed',
      reason: v.syncFailedReason,
      startedAt: now,
      finishedAt: now,
      retryCount: v.syncRetryCount
    })
    // G2 R05: 自动重试
    scheduleAutoRetry(featureId, v.syncRetryCount, internalSync)
    return { ok: false, reason: v.syncFailedReason }
  }
  // 成功
  const fromStatus = v.midloanStatus
  v.midloanStatus = 'syncing_internal'
  setStatusTimestamp(v, 'syncing_internal')
  const apiNo = v.apiNo || `MIDLOAN-API-${Math.floor(Math.random() * 9000 + 1000)}`
  v.apiNo = apiNo
  v.apiName = v.apiName || `midloan_query_${apiNo.split('-').pop()}`
  recordStatusChange(featureId, v.name, fromStatus, 'syncing_internal', 'G1 内数同步成功', '内数系统', 'internal_number_system', `API号：${apiNo}`)
  SyncLogStore.push({
    id: logId(),
    featureId,
    featureName: v.name,
    type: 'oa_production_internal',
    direction: 'call',
    status: 'success',
    request: { featureId, oaReceiver: '内数团队' },
    response: { apiNo, apiName: v.apiName },
    startedAt: now,
    finishedAt: now,
    retryCount: 0
  })
  // 模拟内数回调后立即进入「特征中心同步中」
  setTimeout(() => variableSync(featureId), 100)
  return { ok: true, apiNo }
}

/** H1：特征中心同步成功 → 已上线 */
export function variableSync(featureId: string, forceFail = false): { ok: boolean; reason?: string } {
  const v = variableAssets.find(x => x.id === featureId)
  if (!v) return { ok: false, reason: '特征不存在' }
  const now = nowStr()
  if (forceFail || DemoFlags.isVariableDown()) {
    const fromStatus = v.midloanStatus
    v.midloanStatus = 'variable_sync_failed'
    v.syncFailedReason = '特征中心返回失败：特征已存在 / 字段冲突'
    v.syncFailedAt = now
    v.syncRetryCount = (v.syncRetryCount || 0) + 1
    recordStatusChange(featureId, v.name, fromStatus, 'variable_sync_failed', 'H1 特征中心同步失败', '特征中心系统', 'variable_center_system', v.syncFailedReason)
    SyncLogStore.push({
      id: logId(),
      featureId,
      featureName: v.name,
      type: 'variable_sync',
      direction: 'call',
      status: 'failed',
      reason: v.syncFailedReason,
      startedAt: now,
      finishedAt: now,
      retryCount: v.syncRetryCount
    })
    return { ok: false, reason: v.syncFailedReason }
  }
  // 成功 → 已上线（文档 H1 R05：特征中心确认上线 → 已上线）
  const fromStatus = v.midloanStatus
  v.midloanStatus = 'online'
  setStatusTimestamp(v, 'online')
  v.onlineTime = now
  v.referenceStatus = '已引用'
  v.referenceDetail = `已正式投产到特征中心，关联决策引擎：风控V3、风控V4`
  recordStatusChange(featureId, v.name, fromStatus, 'online', 'H1 特征中心确认上线', '特征中心系统', 'variable_center_system', `上线时间：${now} 接口号：VC-API-002`)
  SyncLogStore.push({
    id: logId(),
    featureId,
    featureName: v.name,
    type: 'oa_production_variable',
    direction: 'call',
    status: 'success',
    request: { featureId, apiNo: v.apiNo },
    response: { status: '已上线', onlineTime: now },
    startedAt: now,
    finishedAt: now,
    retryCount: 0
  })
  return { ok: true }
}

/** K1：特征中心发起下线（台账被动接收，文档 K1 R01） */
export function receiveOffline(featureId: string, reason = '特征中心下线', payload?: { offlineDate?: string; remark?: string }): { ok: boolean; reason?: string } {
  const v = variableAssets.find(x => x.id === featureId)
  if (!v) return { ok: false, reason: '特征不存在' }
  // 文档 v2.1 L1 R07：下线边界处理——内数注册中/特征中心注册中状态忽略下线回调并记录日志告警
  if (v.midloanStatus === 'syncing_internal' || v.midloanStatus === 'syncing_variable') {
    SyncLogStore.push({
      id: logId(),
      featureId,
      featureName: v.name,
      type: 'offline_batch',
      direction: 'callback',
      status: 'failed',
      reason: `下线回调被忽略：当前状态为「${midloanStatusMeta(v.midloanStatus).label}」，等待上线完成后再处理下线`,
      startedAt: nowStr(),
      finishedAt: nowStr(),
      retryCount: 0,
      operator: 'variable_center_system'
    })
    console.warn(`[stateEngine] 下线回调被忽略：特征 ${featureId} 当前状态为 ${v.midloanStatus}，等待上线完成后再处理下线`)
    return { ok: false, reason: `当前状态为「${midloanStatusMeta(v.midloanStatus).label}」，等待上线完成后再处理下线` }
  }
  if (v.midloanStatus !== 'online') {
    return { ok: false, reason: `当前状态（${midloanStatusMeta(v.midloanStatus).label}）不是「已上线」，不接受下线` }
  }
  const now = nowStr()
  const fromStatus = v.midloanStatus
  v.midloanStatus = 'offline'
  setStatusTimestamp(v, 'offline')
  v.offlineTime = payload?.offlineDate ? new Date(payload.offlineDate).toISOString().slice(0, 19).replace('T', ' ') : now
  v.offlineReason = reason + (payload?.remark ? `（${payload.remark}）` : '')
  v.referenceStatus = '已断开'
  v.referenceDetail = '特征中心已断开引用，等待数字社区团队断开 hbase/hive'
  // 需求6：全流程节点信息归档留存
  v.archiveStatus = 'archived'
  recordStatusChange(featureId, v.name, fromStatus, 'offline', 'K1 特征中心发起下线', '特征中心系统', 'variable_center_system', v.offlineReason)
  OfflineRecordStore.push({
    batchId: `BATCH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 900 + 100)}`,
    featureId,
    featureName: v.name,
    offlineAt: v.offlineTime,
    reason: v.offlineReason,
    status: 'success'
  })
  SyncLogStore.push({
    id: logId(),
    featureId,
    featureName: v.name,
    type: 'offline_batch',
    direction: 'callback',
    status: 'success',
    reason: v.offlineReason,
    startedAt: now,
    finishedAt: now,
    retryCount: 0,
    operator: 'variable_center_system'
  })
  return { ok: true }
}

/** 重试同步（手动） */
export function retrySync(featureId: string, operator = '小李'): { ok: boolean; reason?: string } {
  const v = variableAssets.find(x => x.id === featureId)
  if (!v) return { ok: false, reason: '特征不存在' }
  const now = nowStr()
  if (v.midloanStatus === 'internal_sync_failed') {
    // 模拟：补全数据底表后可成功
    v.dataTableName = v.dataTableName || `ads_midloan_${featureId.split('-').pop()}`
    SyncLogStore.push({
      id: logId(),
      featureId,
      featureName: v.name,
      type: 'internal_sync',
      direction: 'call',
      status: 'pending',
      reason: `操作人 ${operator} 发起手动重试`,
      startedAt: now,
      finishedAt: now,
      retryCount: v.syncRetryCount || 0,
      operator
    })
    return internalSync(featureId)
  }
  if (v.midloanStatus === 'variable_sync_failed') {
    SyncLogStore.push({
      id: logId(),
      featureId,
      featureName: v.name,
      type: 'variable_sync',
      direction: 'call',
      status: 'pending',
      reason: `操作人 ${operator} 发起手动重试`,
      startedAt: now,
      finishedAt: now,
      retryCount: v.syncRetryCount || 0,
      operator
    })
    return variableSync(featureId)
  }
  if (v.midloanStatus === 'dw_online_failed') {
    SyncLogStore.push({
      id: logId(),
      featureId,
      featureName: v.name,
      type: 'dw_callback',
      direction: 'callback',
      status: 'pending',
      reason: `操作人 ${operator} 重新触发数仓任务`,
      startedAt: now,
      finishedAt: now,
      retryCount: v.syncRetryCount || 0,
      operator
    })
    return dwCallback(featureId, true)
  }
  if (v.midloanStatus === 'offline_failed') {
    const fromStatus = v.midloanStatus
    v.midloanStatus = 'offline'
    v.offlineTime = now
    recordStatusChange(featureId, v.name, fromStatus, 'offline', 'K1 手动触发批次重试', operator, 'risk_data_admin', '手动重试成功')
    // 追加一条新的成功批次记录，与详情页「下线批次」展示数据一致
    OfflineRecordStore.push({
      batchId: `BATCH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 900 + 100)}`,
      featureId,
      featureName: v.name,
      offlineAt: now,
      reason: `操作人 ${operator} 手动触发批次重试`,
      status: 'success',
      detail: '重试后特征中心确认下线成功'
    })
    SyncLogStore.push({
      id: logId(),
      featureId,
      featureName: v.name,
      type: 'offline_batch',
      direction: 'callback',
      status: 'success',
      reason: `操作人 ${operator} 手动触发批次重试`,
      startedAt: now,
      finishedAt: now,
      retryCount: 0,
      operator
    })
    return { ok: true }
  }
  return { ok: false, reason: '当前状态不可重试' }
}

/**
 * B1 R10：补充数据底表（同时回填详情页「HIVE 表与字段」+「技术关联信息」）
 * payload 兼容两种写法：
 * - 字符串：仅补充数据底表名（历史调用 / 批量演示）
 * - 对象：数据底表 + HIVE 库表字段 + 分区 + 更新频率 + 数据源 / 接口号 / 响应字段
 */
export interface SupplementDataTablePayload {
  /** 数据底表名称 = 标准化后 HIVE 表，格式「库.表」（库名可省），内数 API 注册必填 */
  tableName: string
  remark?: string
  /** 技术关联：数据源名称 */
  dataSourceName?: string
  /** HIVE 表与字段（标准化后表名不在此登记，恒等于上方数据底表名称）*/
  hive?: {
    /** 标准化前原始上游「库.表.字段」合并登记，库名可省 */
    sourceRef?: string
    isPartitioned?: boolean
    partitionFields?: string[]
    updateFrequency?: string
  }
}

const clean = (s?: string) => (s || '').trim()

/** 把「库.表」拆成 [库, 表]；无「.」时库名留空 */
function splitQualified(raw?: string): [string, string] {
  const s = clean(raw)
  if (!s || !s.includes('.')) return ['', s]
  return [s.split('.')[0], s.split(/\.(.+)/)[1]]
}

/**
 * 把合并登记的「库.表.字段」从右往左拆成 [库, 表, 字段]
 * 约定：段数 ≥3 → 前部为库名；2 段 → 库名省略（表.字段）；1 段 → 只有表名、字段留空
 */
function splitSourceRef(raw?: string): [string, string, string] {
  const parts = clean(raw)
    .split('.')
    .map((x) => x.trim())
    .filter(Boolean)
  if (parts.length === 0) return ['', '', '']
  if (parts.length === 1) return ['', parts[0], '']
  if (parts.length === 2) return ['', parts[0], parts[1]]
  return [parts.slice(0, -2).join('.'), parts[parts.length - 2], parts[parts.length - 1]]
}

export function supplementDataTable(
  featureId: string,
  payload: string | SupplementDataTablePayload
): { ok: boolean; reason?: string } {
  const v: any = variableAssets.find(x => x.id === featureId)
  if (!v) return { ok: false, reason: '特征不存在' }

  const p: SupplementDataTablePayload =
    typeof payload === 'string' ? { tableName: payload } : payload || { tableName: '' }

  if (!clean(p.tableName)) {
    return { ok: false, reason: '数据底表名称不能为空' }
  }
  v.dataTableName = clean(p.tableName)
  if (p.remark !== undefined) v.dataTableRemark = clean(p.remark)
  v.syncFailedReason = ''

  // ============ 技术关联信息 ============
  // 接口号 / 响应字段不在此登记：接口号由阶段4 内数同步生成，响应字段属外数品类
  if (clean(p.dataSourceName)) v.dataSourceName = clean(p.dataSourceName)

  // ============ HIVE 表与字段 ============
  const h = p.hive
  if (h) {
    // 标准化后 HIVE 表 = 数据底表名称（单一事实源），按「库.表」拆库名供 API 注册使用
    const [dbName, stdTable] = splitQualified(v.dataTableName)
    // 标准化前：原始上游「库.表.字段」合并登记，落库时拆回三段
    const [srcDb, srcTable, srcField] = splitSourceRef(h.sourceRef)

    const partitionFields = (h.partitionFields || []).map(clean).filter(Boolean)
    const isPartitioned = h.isPartitioned !== false && partitionFields.length > 0

    v.hiveInfo = {
      ...(v.hiveInfo || {}),
      sourceDbName: srcDb,
      sourceTableName: srcTable,
      sourceFieldName: srcField,
      databaseName: dbName,
      tableName: stdTable,
      isPartitioned,
      partitionFields: isPartitioned ? partitionFields : [],
      updateFrequency: clean(h.updateFrequency)
    }
    if (clean(h.updateFrequency)) v.updateFrequency = clean(h.updateFrequency)
  }

  v.updatedAt = nowStr()
  return { ok: true }
}

/**
 * 编辑特征（与「注册特征」同口径的 B1 基础信息回写）
 * 用于列表页 / 详情页的编辑入口，写回 mock 资产（纯前端展示，不发请求）
 */
export function updateFeatureBasicInfo(
  featureId: string,
  payload: Record<string, any>
): { ok: boolean; reason?: string } {
  const v: any = variableAssets.find(x => x.id === featureId)
  if (!v) return { ok: false, reason: '特征不存在' }
  const curStatus = v.midloanStatus || v.status || ''
  const now = nowStr()
  // 英文名 → code，中文名 → name / featureCnName（与台账列表展示口径一致）
  if (clean(payload.name)) v.code = clean(payload.name)
  if (clean(payload.featureCnName)) {
    v.featureCnName = clean(payload.featureCnName)
    v.name = clean(payload.featureCnName)
  }
  const directMap: Record<string, string> = {
    fieldType: 'fieldType',
    defaultValue: 'defaultValue',
    featureGranularity: 'featureGranularity',
    l1Category: 'l1Category',
    l2Category: 'l2Category',
    dataFreshness: 'dataFreshness',
    sourceTableAfter: 'sourceTableAfter',
    sourceTableBefore: 'sourceTableBefore',
    sourceField: 'sourceField',
    dataTableName: 'dataTableName',
    dwTaskId: 'dwTaskId',
    acceptor: 'acceptor',
    developer: 'developer',
    description: 'description'
  }
  Object.entries(directMap).forEach(([formKey, field]) => {
    if (payload[formKey] !== undefined) (v as any)[field] = payload[formKey]
  })
  // 业务逻辑同时是列表/详情的口径说明（processingLogic 用于详情页技术口径展示）
  if (payload.businessLogic !== undefined) {
    v.businessLogic = payload.businessLogic
    v.description = payload.description || payload.businessLogic
  }
  if (payload.codeLogic !== undefined) {
    v.codeLogic = payload.codeLogic
    v.processingLogic = payload.codeLogic
  }
  v.profile = {
    ...(v.profile || {}),
    productScope: payload.productScope ?? v.profile?.productScope,
    listType: payload.listType ?? v.profile?.listType,
    batch: payload.batch ?? v.profile?.batch,
    acceptor: payload.acceptor ?? v.profile?.acceptor,
    developer: payload.developer ?? v.profile?.developer,
    remark: payload.remark ?? v.profile?.remark,
    excelAttachment: payload.excelAttachment ?? v.profile?.excelAttachment
  }
  // 名单标签（黑/白/灰）同步到顶层：台账列表列与筛选直接读 v.listType，未登记按「空」
  v.listType = v.profile.listType || 'none'
  v.updatedAt = now
  v.status = v.status || curStatus
  return { ok: true }
}

/**
 * 特征归档（文档 v2.1 §六 特征归档）
 * - 仅在 requirement_proposal / registered 阶段可发起
 * - midloan_behavior 品类：midloanStatus 置为 'archived'
 * - 非 midloan 品类：status 置为 'archived'
 * - 归档后写入 archiveStatus / archivedAt / archivedReason
 */
export function archiveVariable(featureId: string, payload?: { reason?: string; operator?: string }): { ok: boolean; reason?: string } {
  const v: any = variableAssets.find(x => x.id === featureId)
  if (!v) return { ok: false, reason: '特征不存在' }
  const curStatus = v.midloanStatus || v.status
  // 仅允许需求提出 / 已注册 阶段发起归档
  if (!['requirement_proposal', 'registered'].includes(curStatus)) {
    return { ok: false, reason: `当前状态（${midloanStatusMeta(curStatus).label || curStatus}）不允许归档，仅「需求提出」「已注册」阶段可发起` }
  }
  // 归档原因必填
  if (!payload?.reason || !payload.reason.trim()) {
    return { ok: false, reason: '归档原因必填' }
  }
  const now = nowStr()
  const operator = payload?.operator || '培培'
  const fromStatus = curStatus
  // midloan 品类更新 midloanStatus，其他品类更新 status
  if (v.category === 'midloan_behavior' || v.midloanStatus) {
    v.midloanStatus = 'archived'
    setStatusTimestamp(v, 'archived')
  } else {
    v.status = 'archived'
  }
  // 归档元数据
  v.archiveStatus = 'archived'
  v.archivedAt = now
  v.archivedReason = payload.reason.trim()
  v.archivedBy = operator
  // 写入审计日志
  recordStatusChange(
    featureId,
    v.name,
    fromStatus,
    'archived',
    '归档',
    operator,
    'risk_data_admin',
    `归档原因：${payload.reason.trim()}`
  )
  // 同步日志
  SyncLogStore.push({
    id: logId(),
    featureId,
    featureName: v.name,
    type: 'internal_sync',
    direction: 'call',
    status: 'success',
    reason: `特征已归档：${payload.reason.trim()}`,
    startedAt: now,
    finishedAt: now,
    retryCount: 0,
    operator
  })
  return { ok: true }
}

/** 演示用：把单个特征重置回 registered 初始状态 */
export function resetFeature(featureId: string): { ok: boolean } {
  const v = variableAssets.find(x => x.id === featureId)
  if (!v) return { ok: false }
  const fromStatus = v.midloanStatus
  v.midloanStatus = 'requirement_proposal'
  setStatusTimestamp(v, 'requirement_proposal')
  v.syncFailedReason = ''
  v.syncFailedAt = ''
  v.syncRetryCount = 0
  v.devOaOrderId = ''
  v.verifyOaOrderId = ''
  v.apiNo = ''
  v.apiName = ''
  v.onlineTime = ''
  recordStatusChange(featureId, v.name, fromStatus, 'requirement_proposal', 'Demo 重置', '小李', 'risk_data_member', '重置到「需求提出」')
  return { ok: true }
}

/**
 * ============ Mock 数据补充：完整状态历史初始化（用户反馈）============
 *
 * 给定一个特征，根据其当前 midloanStatus 自动生成从「需求提出」开始的
 * 完整状态变更历史 + 同步日志 + 下线批次。
 *
 * 业务规则：
 * - 从 requirement_proposal 开始，按 11 状态机顺序生成
 * - 异常状态从失败点向前推演
 * - 同一特征只初始化一次（避免重复）
 */
const MOCK_HISTORY_INITIALIZED = new Set<string>()

/** 状态机：每个状态的模拟进入时间偏移（分钟）*/
const STATUS_TIMELINE_OFFSET: Record<string, number> = {
  requirement_proposal: -30,  // 比 registered 早 30 分钟
  registered: 0,        // 0 分钟（基线）
  developing_oa: 30,    // +30 分钟
  dw_online: 120,       // +1.5 小时
  business_acceptance: 130,  // dw_online 后 10 分钟（自动推进）
  business_verified: 200,     // +70 分钟（业务验证通过）
  admin_confirmed: 240,       // +40 分钟（管理员确认通过）
  param_preparing: 245,       // +5 分钟（提投产单+参数准备）
  syncing_internal: 250,      // +5 分钟（内数注册中）
  syncing_variable: 360,      // +1.9 小时
  online: 480,          // +2 小时
  offline: 1440         // +1 天
}

/** 状态变更对应的角色 + 触发方式 + 备注 */
const STATUS_CHANGE_META: Record<string, { trigger: string; operator: string; operatorRole: string; reason: string }> = {
  requirement_proposal: {
    trigger: '业务发起需求',
    operator: '业务方',
    operatorRole: 'risk_data_member',
    reason: '业务直接在台账发起需求'
  },
  registered: {
    trigger: '管理员审核+注册',
    operator: '培培',
    operatorRole: 'risk_data_admin',
    reason: '管理员审核通过，补充标准化附件，特征已注册'
  },
  developing_oa: {
    trigger: '提交开发OA单',
    operator: '小李',
    operatorRole: 'risk_data_member',
    reason: 'OA单号：OA-2026-MID-0042'
  },
  dw_online: {
    trigger: '数仓任务回调',
    operator: '数仓系统',
    operatorRole: 'dw_system',
    reason: '数仓任务 ID：DW-MID-2026-0039 执行成功'
  },
  business_acceptance: {
    trigger: '自动推进至待业务验证',
    operator: '数仓系统',
    operatorRole: 'dw_system',
    reason: '数仓已上线，自动推进至待业务验证'
  },
  business_verified: {
    trigger: '业务验证通过',
    operator: '小李',
    operatorRole: 'risk_data_member',
    reason: '业务验证人在台账内确认通过（不走OA单）'
  },
  admin_confirmed: {
    trigger: '管理员确认通过',
    operator: '培培',
    operatorRole: 'risk_data_admin',
    reason: '管理员在台账内确认通过（不走OA单），可提投产单'
  },
  param_preparing: {
    trigger: '提投产单·OA审批通过',
    operator: '培培',
    operatorRole: 'risk_data_admin',
    reason: '系统自动参数映射+有效性验证'
  },
  syncing_internal: {
    trigger: '参数验证通过·进入内数注册',
    operator: '系统',
    operatorRole: 'system',
    reason: '参数映射+验证通过，OA单已提给内数团队'
  },
  syncing_variable: {
    trigger: '内数API回调成功',
    operator: '内数系统',
    operatorRole: 'internal_number_system',
    reason: '内数同步接口号：INTERNAL-API-001'
  },
  online: {
    trigger: '特征中心确认',
    operator: '特征中心',
    operatorRole: 'variable_center_system',
    reason: '特征中心接口号：VC-API-002'
  },
  offline: {
    trigger: '接收下线',
    operator: '特征中心',
    operatorRole: 'variable_center_system',
    reason: '下线原因：业务调整'
  }
}

/** 异常状态对应的原因 */
const FAILED_REASON_MAP: Record<string, string> = {
  internal_sync_failed: '内数API注册接口返回 timeout，请稍后重试',
  variable_sync_failed: '特征中心接口返回 503 服务暂时不可用',
  dw_online_failed: '数仓任务执行超时（> 30 分钟），疑似任务阻塞',
  offline_failed: '特征中心批次同步接口返回 500，已记录待人工处理'
}

/**
 * 给定基础时间，返回「当前时间 - offset 分钟」的时间字符串
 */
function offsetTime(baseISO: string, offsetMin: number): string {
  const d = new Date(baseISO)
  d.setMinutes(d.getMinutes() - offsetMin)
  return d.toISOString().slice(0, 19).replace('T', ' ')
}

/**
 * 初始化某个特征的完整状态历史（如果还没初始化过）
 */
export function initMockStatusHistory(featureId: string): void {
  if (MOCK_HISTORY_INITIALIZED.has(featureId)) return

  const v = variableAssets.find(x => x.id === featureId)
  if (!v || !v.midloanStatus) return

  const currentStatus = v.midloanStatus

  // 找到当前状态在状态机顺序中的下标
  const STATUS_ORDER = [
    'requirement_proposal', 'registered', 'developing_oa', 'dw_online', 'business_acceptance',
    'business_verified', 'admin_confirmed', 'param_preparing', 'syncing_internal', 'syncing_variable', 'online', 'offline'
  ]
  const currentIdx = STATUS_ORDER.indexOf(currentStatus)
  const isFailed = currentStatus.endsWith('_failed')

  // 异常状态映射到正常状态
  const failedToNormal: Record<string, number> = {
    internal_sync_failed: 8,    // syncing_internal
    variable_sync_failed: 9,    // syncing_variable
    dw_online_failed: 3,        // dw_online
    offline_failed: 11          // offline
  }
  const targetIdx = isFailed
    ? failedToNormal[currentStatus]
    : currentIdx
  if (targetIdx < 0) return

  // 基础时间：当前时间
  const baseTime = new Date().toISOString()

  // 从 requirement_proposal 开始到 targetIdx 生成变更记录
  let prevStatus = 'requirement_proposal'
  for (let i = 0; i <= targetIdx; i++) {
    const status = STATUS_ORDER[i]
    const meta = STATUS_CHANGE_META[status]
    const offset = STATUS_TIMELINE_OFFSET[status] || (i * 60)
    const operatedAt = offsetTime(baseTime, offset)

    // 触发特征数据上的 timestamp 字段（如果有）
    if (v) {
      const tsKey = STATUS_TIMESTAMP_MAP[status]
      if (tsKey) (v as any)[tsKey] = operatedAt
    }

    // 入变更记录（除首个状态外）
    if (i > 0) {
      const fromStatus = prevStatus
      recordStatusChange(
        featureId,
        v.name,
        fromStatus,
        status,
        meta.trigger,
        meta.operator,
        meta.operatorRole,
        meta.reason
      )
    }
    prevStatus = status
  }

  // 异常态：额外生成「失败」状态记录
  if (isFailed) {
    const failMeta: any = {
      trigger: '自动流转失败',
      operator: '系统',
      operatorRole: 'variable_center_system',
      reason: FAILED_REASON_MAP[currentStatus] || '未知失败原因'
    }
    recordStatusChange(
      featureId,
      v.name,
      STATUS_ORDER[targetIdx],
      currentStatus,
      failMeta.trigger,
      failMeta.operator,
      failMeta.operatorRole,
      failMeta.reason
    )
    // 设置失败字段
    v.syncFailedReason = failMeta.reason
    v.syncFailedAt = offsetTime(baseTime, STATUS_TIMELINE_OFFSET[STATUS_ORDER[targetIdx]] + 5)
    v.syncRetryCount = Math.floor(Math.random() * 3) + 1
  }

  // 补充：内数 + 特征中心同步日志（如果当前到 syncing_internal 或之后）
  if (targetIdx >= 8) {
    pushMockSyncLog(featureId, v.name, 'internal_sync', 'callback', 'success', STATUS_TIMELINE_OFFSET['syncing_internal'], baseTime, '内数API返回成功，接口号：INTERNAL-API-001')
  }
  if (targetIdx >= 9) {
    pushMockSyncLog(featureId, v.name, 'variable_sync', 'callback', 'success', STATUS_TIMELINE_OFFSET['syncing_variable'], baseTime, '特征中心注册成功，接口号：VC-API-002')
  }

  // 补充：下线批次（如果当前是 offline / offline_failed）
  if (currentStatus === 'offline' || currentStatus === 'offline_failed') {
    pushMockOfflineBatch(featureId, v.name, currentStatus === 'offline_failed' ? 'failed' : 'success', STATUS_TIMELINE_OFFSET['offline'], baseTime, currentStatus === 'offline_failed' ? '特征中心批次同步失败' : '业务调整下线')
  }

  MOCK_HISTORY_INITIALIZED.add(featureId)
}

/**
 * 添加一条 mock 同步日志
 */
function pushMockSyncLog(featureId: string, featureName: string, type: string, direction: string, status: string, offsetMin: number, baseTime: string, reason?: string) {
  syncLogs.push({
    id: logId(),
    featureId,
    featureName,
    type: type as any,
    direction: direction as any,
    status: status as any,
    startedAt: offsetTime(baseTime, offsetMin),
    finishedAt: offsetTime(baseTime, offsetMin - 1),
    retryCount: 0,
    reason: status === 'failed' ? reason : undefined
  })
}

/**
 * 添加一条 mock 下线批次
 */
function pushMockOfflineBatch(featureId: string, featureName: string, status: string, offsetMin: number, baseTime: string, reason: string) {
  offlineRecords.push({
    batchId: `BATCH-${Date.now().toString().slice(-6)}`,
    featureId,
    featureName,
    offlineAt: offsetTime(baseTime, offsetMin),
    reason,
    status: status as any,
    detail: status === 'failed' ? '特征中心接口返回 500，请联系管理员' : '特征中心确认下线成功'
  })
}

/** 一次性批量初始化所有特征的 mock 历史 */
export function initAllMockHistories(): void {
  variableAssets.forEach(v => {
    if (v.category === 'midloan_behavior' && v.midloanStatus) {
      initMockStatusHistory(v.id)
    }
  })
}

/**
 * 重试数仓任务（文档 v2.1 异常状态处理表）
 * 重试超3次触发人工介入提醒，管理员可通过状态修正回退至「已注册」重新提开发单
 */
export function retryDwTask(featureId: string, operator = '培培'): { ok: boolean; reason?: string; needManualIntervention?: boolean } {
  const v = variableAssets.find(x => x.id === featureId)
  if (!v) return { ok: false, reason: '特征不存在' }
  if (v.midloanStatus !== 'dw_online_failed') {
    return { ok: false, reason: `当前状态（${midloanStatusMeta(v.midloanStatus).label}）不是「数仓上线失败」` }
  }
  // 递增重试计数
  const retryCount = (v.syncRetryCount || 0) + 1
  v.syncRetryCount = retryCount
  // 超过3次触发人工介入提醒
  if (retryCount > 3) {
    recordStatusChange(featureId, v.name, 'dw_online_failed', 'dw_online_failed',
      `数仓任务重试超3次（已重试${retryCount}次），触发人工介入提醒`, operator, 'risk_data_admin',
      `管理员可通过状态修正功能回退至「已注册」重新提开发单`)
    SyncLogStore.push({
      id: logId(),
      featureId,
      featureName: v.name,
      type: 'dw_callback',
      direction: 'call',
      status: 'failed',
      reason: `数仓任务重试超3次（已重试${retryCount}次），需人工介入`,
      startedAt: nowStr(),
      finishedAt: nowStr(),
      retryCount,
      operator
    })
    return { ok: false, reason: `数仓任务重试超3次（已重试${retryCount}次），需人工介入。管理员可通过状态修正功能回退至「已注册」重新提开发单`, needManualIntervention: true }
  }
  // 重试调用数仓回调（复用原OA单）
  const result = dwCallback(featureId, true)
  if (result.ok) {
    v.syncRetryCount = 0 // 成功后重置计数
  }
  return result
}

/**
 * 管理员状态修正功能（文档 v2.1 §四 管理员状态修正功能）
 * - 仅允许在相邻状态间修正
 * - 跨系统状态（内数注册中/特征中心注册中/已上线/已下线）不可修正
 * - 修正操作必须记录原因，且触发告警通知管理员确认
 */
const ADJACENT_STATUS_MAP: Record<string, string[]> = {
  // 正向→逆向修正（误操作回退）
  registered: ['requirement_proposal'],
  developing_oa: ['registered'],
  dw_online: ['developing_oa'],
  business_acceptance: ['dw_online'],
  business_verified: ['business_acceptance'],
  admin_confirmed: ['business_verified'],
  // 异常态→正常态修正
  dw_online_failed: ['developing_oa', 'registered'],  // 数仓失败可修正回开发中或已注册
  internal_sync_failed: ['param_preparing'],
  variable_sync_failed: ['syncing_internal'],
  offline_failed: ['online']
}

// 不可修正的状态（跨系统状态，对端系统状态无法同步回退）
const NON_CORRECTABLE_STATUSES = ['syncing_internal', 'syncing_variable', 'online', 'offline']

export function correctStatus(featureId: string, targetStatus: string, reason: string, operator = '培培'): { ok: boolean; reason?: string } {
  const v = variableAssets.find(x => x.id === featureId)
  if (!v) return { ok: false, reason: '特征不存在' }
  const currentStatus = v.midloanStatus || ''
  // 校验：不可修正的状态
  if (NON_CORRECTABLE_STATUSES.includes(currentStatus)) {
    return { ok: false, reason: `当前状态「${midloanStatusMeta(currentStatus).label}」为跨系统状态，不可修正（对端系统状态无法同步回退）` }
  }
  // 校验：目标状态必须在相邻状态列表中
  const allowedTargets = ADJACENT_STATUS_MAP[currentStatus] || []
  if (!allowedTargets.includes(targetStatus)) {
    return { ok: false, reason: `不允许从「${midloanStatusMeta(currentStatus).label}」修正至「${midloanStatusMeta(targetStatus).label}」，仅允许相邻状态间修正` }
  }
  // 校验：原因必填
  if (!reason || !reason.trim()) {
    return { ok: false, reason: '修正原因必填' }
  }
  // 执行修正
  const fromStatus = currentStatus
  v.midloanStatus = targetStatus
  setStatusTimestamp(v, targetStatus)
  // 重置重试计数
  v.syncRetryCount = 0
  // 记录状态变更（含修正原因）
  recordStatusChange(featureId, v.name, fromStatus, targetStatus,
    `管理员状态修正：${midloanStatusMeta(fromStatus).label} → ${midloanStatusMeta(targetStatus).label}`,
    operator, 'risk_data_admin', `修正原因：${reason}（已触发告警通知管理员确认）`)
  // 同步日志
  SyncLogStore.push({
    id: logId(),
    featureId,
    featureName: v.name,
    type: 'internal_sync',
    direction: 'call',
    status: 'success',
    reason: `管理员状态修正：${midloanStatusMeta(fromStatus).label} → ${midloanStatusMeta(targetStatus).label}，原因：${reason}`,
    startedAt: nowStr(),
    finishedAt: nowStr(),
    retryCount: 0,
    operator
  })
  console.warn(`[stateEngine] 管理员状态修正：特征 ${featureId} 从 ${fromStatus} 修正至 ${targetStatus}，原因：${reason}，已触发告警`)
  return { ok: true }
}

export const MidloanStateEngine = {
  submitRequirement,
  submitDevOA,
  dwCallback,
  businessVerifyPass,
  adminConfirmPass,
  submitProductionOrder,
  oaProductionApprove,
  oaProductionReject,
  internalSync,
  variableSync,
  receiveOffline,
  retrySync,
  retryDwTask,
  /** 管理员状态修正功能（文档 v2.1 §四） */
  correctStatus,
  /** B1 R10 补充数据底表（含 HIVE 表与字段 / 技术关联信息） */
  supplementDataTable,
  /** 编辑特征基础信息（与注册表单同口径回写 mock 资产） */
  updateFeatureBasicInfo,
  /** 重置单个特征到初始状态 */
  resetFeature,
  /** 初始化 mock 完整状态历史 */
  initMockStatusHistory,
  /** 需求7：重复备案前置校验 */
  checkDuplicate,
  /** 需求8：参数有效性验证 */
  validateParams,
  /** 特征归档（仅需求提出 / 已注册阶段） */
  archiveVariable,
  /** 聚合：根据 action key 调用对应函数 */
  handleAction(featureId: string, key: string, payload?: any): any {
    switch (key) {
      case 'submit_requirement': return submitRequirement(featureId, payload)
      case 'submit_dev_oa': return submitDevOA(featureId, payload)
      case 'simulate_dw_success':
      case 'simulate_dw_success_dw': return dwCallback(featureId, true)
      case 'simulate_dw_failed': return dwCallback(featureId, false)
      case 'business_verify_pass': return businessVerifyPass(featureId, payload?.operator || '小李', payload?.remark)
      case 'admin_confirm_pass': return adminConfirmPass(featureId, payload?.operator || '培培', payload?.remark)
      case 'submit_production_order': return submitProductionOrder(featureId, payload)
      case 'oa_production_approve': return oaProductionApprove(featureId, payload)
      case 'oa_production_reject': return oaProductionReject(featureId, payload)
      case 'retry_sync': return retrySync(featureId)
      case 'retry_dw': return retryDwTask(featureId, payload?.operator || '培培')
      case 'manual_batch_retry': return retrySync(featureId)
      case 'correct_status': return correctStatus(featureId, payload?.targetStatus, payload?.remark, payload?.operator || '培培')
      case 'retry_sync_supplement_table':
        // 抽屉：先补充数据底表，再触发内数同步
        if (!payload?.tableName || !payload.tableName.trim()) {
          return { ok: false, reason: '请填写数据底表名称' }
        }
        const suppRes = supplementDataTable(featureId, { ...payload, tableName: payload.tableName.trim() })
        if (!suppRes.ok) return suppRes
        return retrySync(featureId)
      case 'check_duplicate': return checkDuplicate(featureId)
      case 'validate_params': return validateParams(featureId)
      case 'simulate_supplement_table':
        return supplementDataTable(featureId, 'ads_midloan_demo_table')
      case 'archive_variable':
        return archiveVariable(featureId, payload)
      default: return { ok: false, reason: `未知动作：${key}` }
    }
  },

  /**
   * ============ 批量执行（用户反馈）============
   *
   * 业务规则：
   * - 每条记录独立执行（一条失败不影响其他）
   * - 仅允许部分 action key（白名单）
   * - 校验每条记录的状态匹配（不符合的记录跳过）
   *
   * 文档 K1 明确：下线是被动接收，不允许主动批量申请下线，故移除 request_offline
   */
  batchExecute(featureIds: string[], actionKey: string, payload?: any) {
    // 白名单：仅允许主流程操作 + 重试类
    const allowedKeys = [
      'submit_requirement',
      'submit_dev_oa',
      'business_verify_pass',
      'admin_confirm_pass',
      'submit_production_order',
      'retry_sync',
      'retry_dw',
      'manual_batch_retry'
    ]
    if (!allowedKeys.includes(actionKey)) {
      return {
        ok: false,
        reason: `批量提交不支持该动作：${actionKey}`,
        total: featureIds.length,
        succeeded: 0,
        failed: 0,
        results: []
      }
    }

    const results: Array<{
      featureId: string
      ok: boolean
      reason?: string
      result?: any
    }> = []

    let succeeded = 0
    let failed = 0

    for (const fid of featureIds) {
      const r = this.handleAction(fid, actionKey, payload)
      const ok = !!(r && r.ok)
      if (ok) {
        succeeded++
      } else {
        failed++
      }
      results.push({
        featureId: fid,
        ok,
        reason: r?.reason,
        result: r
      })
    }

    return {
      ok: failed === 0,
      total: featureIds.length,
      succeeded,
      failed,
      results,
      reason: failed > 0 ? `${failed} 条失败` : undefined
    }
  }
}

export default MidloanStateEngine