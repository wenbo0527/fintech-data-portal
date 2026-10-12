/**
 * Midloan 11 状态机类型定义 · 文档 v2.1
 * 阶段 1 + T3 完善
 *
 * 11 正常状态 + 4 异常状态（共 15 态，严格对齐文档 v2.1 D.4 色板）
 * 数据形态分界：管理员已确认（含）之前为离线分析，之后为在线接口
 */

export type MidloanStatus =
  // 11 正常状态（文档 v2.0 严格顺序）
  | 'requirement_proposal'    // 需求提出
  | 'registered'              // 已注册
  | 'developing_oa'           // 数仓开发中
  | 'dw_online'               // 数仓开发完成
  | 'business_acceptance'     // 业务验收
  | 'business_verified'       // 业务已验证
  | 'admin_confirmed'         // 管理员已确认
  | 'param_preparing'         // 参数准备
  | 'syncing_internal'        // 内数同步中
  | 'syncing_variable'        // 特征中心同步中
  | 'online'                  // 已上线
  | 'offline'                 // 已下线
  // 4 异常状态
  | 'internal_sync_failed'    // 内数同步失败
  | 'variable_sync_failed'    // 特征中心同步失败
  | 'dw_online_failed'        // 数仓开发失败
  | 'offline_failed'          // 下线接收失败

export interface MidloanStatusMeta {
  label: string
  color: string
  description: string
}

export const MIDLOAN_STATUS_LABELS: Record<MidloanStatus, string> = {
  requirement_proposal: '需求提出',
  registered: '已提交',
  developing_oa: '开发中（OA单）',
  dw_online: '数仓已上线',
  business_acceptance: '待业务验证',
  business_verified: '业务已验证',
  admin_confirmed: '管理员已确认',
  param_preparing: '参数准备',
  syncing_internal: '内数注册中',
  syncing_variable: '特征中心注册中',
  online: '已上线',
  offline: '已下线',
  internal_sync_failed: '内数注册失败',
  variable_sync_failed: '特征中心注册失败',
  dw_online_failed: '数仓上线失败',
  offline_failed: '下线接收失败'
}

export const MIDLOAN_STATUS_COLORS: Record<MidloanStatus, string> = {
  requirement_proposal: 'gray',
  registered: 'blue',
  developing_oa: 'purple',
  dw_online: 'cyan-dark',
  business_acceptance: 'gold',
  business_verified: 'gold-light',
  admin_confirmed: 'green-light',
  param_preparing: 'cyan',
  syncing_internal: 'cyan',
  syncing_variable: 'cyan',
  online: 'green',
  offline: 'darkgray',
  internal_sync_failed: 'red',
  variable_sync_failed: 'red',
  dw_online_failed: 'red',
  offline_failed: 'red'
}

/**
 * 数据形态（文档 v2.1 §四 状态机/生命周期）
 * 以「管理员已确认」为分界，之前（含）为离线分析状态，之后为在线接口状态
 */
export type DataFormType = 'offline_analysis' | 'online_interface'

export const MIDLOAN_STATUS_DATA_FORM: Record<MidloanStatus, DataFormType> = {
  requirement_proposal: 'offline_analysis',
  registered: 'offline_analysis',
  developing_oa: 'offline_analysis',
  dw_online: 'offline_analysis',
  business_acceptance: 'offline_analysis',
  business_verified: 'offline_analysis',
  admin_confirmed: 'offline_analysis',
  param_preparing: 'online_interface',
  syncing_internal: 'online_interface',
  syncing_variable: 'online_interface',
  online: 'online_interface',
  offline: 'online_interface',
  internal_sync_failed: 'online_interface',
  variable_sync_failed: 'online_interface',
  dw_online_failed: 'offline_analysis',
  offline_failed: 'online_interface'
}

export const DATA_FORM_LABELS: Record<DataFormType, string> = {
  offline_analysis: '离线分析',
  online_interface: '在线接口'
}

/** 11 状态机正常流转顺序（时间轴展示用） */
export const MIDLOAN_STATUS_ORDER: MidloanStatus[] = [
  'requirement_proposal',
  'registered',
  'developing_oa',
  'dw_online',
  'business_acceptance',
  'business_verified',
  'admin_confirmed',
  'param_preparing',
  'syncing_internal',
  'syncing_variable',
  'online',
  'offline'
]

/** 文档 D.3 状态时间戳字段映射 */
export const STATUS_TIMESTAMP_MAP: Record<MidloanStatus, string> = {
  requirement_proposal: 'requirementProposalAt',
  registered: 'registeredAt',
  developing_oa: 'developingOaAt',
  dw_online: 'dwOnlineAt',
  business_acceptance: 'businessAcceptanceAt',
  business_verified: 'businessVerifiedAt',
  admin_confirmed: 'adminConfirmedAt',
  param_preparing: 'paramPreparingAt',
  syncing_internal: 'syncingInternalAt',
  syncing_variable: 'syncingVariableAt',
  online: 'onlineAt',
  offline: 'offlineTime',
  internal_sync_failed: 'syncFailedAt',
  variable_sync_failed: 'syncFailedAt',
  dw_online_failed: 'syncFailedAt',
  offline_failed: 'syncFailedAt'
}