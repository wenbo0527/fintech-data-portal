/**
 * 贷中行为特征 11 状态机色板
 * 来源：风险数据一体化一期·贷中行为特征自动化上下线 文档（v2.0 模板版）· 状态机章节
 *
 * 11 正常状态 + 4 异常状态（共 15 态，严格对齐文档 D.4 色板）
 * 阶段 S4 · 完整 15 状态 × 操作类型对应关系
 */

export type MidloanStatus =
  // 正常状态（文档 v2.1 严格顺序）
  | 'requirement_proposal'    // 需求提出
  | 'registered'              // 已注册
  | 'developing_oa'           // 开发中（OA单）
  | 'dw_online'               // 数仓已上线
  | 'business_acceptance'     // 待业务验证
  | 'business_verified'       // 业务已验证
  | 'admin_confirmed'         // 管理员已确认
  | 'oa_production_reviewing' // OA 投产单审批中（新增：OA 审批闸门）
  | 'param_preparing'         // 参数准备
  | 'syncing_internal'        // 内数注册中
  | 'syncing_variable'        // 特征中心注册中
  | 'online'                  // 已上线
  | 'offline'                 // 已下线
  | 'archived'                // 已归档（通用入口 · 需求提出/已注册阶段可发起）
  // 4 异常状态
  | 'internal_sync_failed'    // 内数注册失败
  | 'variable_sync_failed'    // 特征中心注册失败
  | 'dw_online_failed'        // 数仓上线失败
  | 'offline_failed'          // 下线接收失败

export interface MidloanStatusMeta {
  label: string
  color: string
  /** 业务说明 */
  description: string
  /** 数据形态（文档 v2.1 §四：离线分析/在线接口） */
  dataForm?: 'offline_analysis' | 'online_interface'
}

export const MIDLOAN_STATUS_MAP: Record<MidloanStatus, MidloanStatusMeta> = {
  requirement_proposal:     { label: '需求提出',         color: 'gray',         description: '业务直接发起需求，等待管理员审核补充标准化附件', dataForm: 'offline_analysis' },
  registered:               { label: '已注册',          color: 'blue',         description: '特征已注册，等待提开发OA单', dataForm: 'offline_analysis' },
  developing_oa:            { label: '开发中（OA单）',  color: 'purple',       description: '已提开发OA单，数仓开发中', dataForm: 'offline_analysis' },
  dw_online:                { label: '数仓已上线',      color: 'cyan-dark',    description: '数仓任务已上线，等待业务验证', dataForm: 'offline_analysis' },
  business_acceptance:      { label: '待业务验证',      color: 'gold',         description: '数仓已上线，业务验证人需在台账内确认（不走OA单）', dataForm: 'offline_analysis' },
  business_verified:        { label: '业务已验证',      color: 'gold-light',   description: '业务验证通过，等待管理员确认（台账内操作）', dataForm: 'offline_analysis' },
  admin_confirmed:          { label: '管理员已确认',     color: 'green-light',  description: '管理员确认通过，可提投产单进入OA审批', dataForm: 'offline_analysis' },
  oa_production_reviewing:  { label: 'OA 投产审批中',   color: 'arcoblue',     description: 'OA 投产单已提交，等待审批人通过（审批通过后进入参数准备）', dataForm: 'online_interface' },
  param_preparing:          { label: '参数准备',         color: 'cyan',         description: 'OA 审批通过后系统自动参数映射+有效性验证', dataForm: 'online_interface' },
  syncing_internal:         { label: '内数注册中',      color: 'cyan',         description: 'OA单已提给内数，等待返回接口信息', dataForm: 'online_interface' },
  syncing_variable:         { label: '特征中心注册中',  color: 'cyan',         description: 'OA单已提给特征中心，等待确认上线', dataForm: 'online_interface' },
  online:                   { label: '已上线',          color: 'green',        description: '特征中心已确认上线，特征投产中', dataForm: 'online_interface' },
  offline:                  { label: '已下线',          color: 'darkgray',     description: '特征中心已下线，归档保留', dataForm: 'online_interface' },
  archived:                { label: '已归档',          color: 'gray',         description: '特征已归档（需求阶段 / 已注册阶段可发起），从主列表移除，可在「已归档」筛选中查看', dataForm: 'offline_analysis' },
  // 异常
  internal_sync_failed:     { label: '内数注册失败',     color: 'red',          description: '内数API注册/变更返回失败，可点击「重新同步」', dataForm: 'online_interface' },
  variable_sync_failed:     { label: '特征中心注册失败', color: 'red',          description: '特征中心注册返回失败，可点击「重新同步」', dataForm: 'online_interface' },
  dw_online_failed:         { label: '数仓上线失败',     color: 'red',          description: '数仓任务执行失败，可点击「重新触发数仓任务」', dataForm: 'offline_analysis' },
  offline_failed:           { label: '下线接收失败',     color: 'red',          description: '特征中心批次同步失败，可手动触发批次重试', dataForm: 'online_interface' }
}

/** 状态机正常流转顺序（时间轴展示用 · 文档 v2.1 严格顺序） */
export const MIDLOAN_STATUS_ORDER: MidloanStatus[] = [
  'requirement_proposal',     // 阶段1·注册
  'registered',
  'developing_oa',            // 阶段2·开发
  'dw_online',
  'business_acceptance',      // 阶段3·验证
  'business_verified',
  'admin_confirmed',
  'oa_production_reviewing',  // OA 投产审批闸门（阶段4·上线）
  'param_preparing',
  'syncing_internal',
  'syncing_variable',
  'online',
  'offline'                   // 阶段5·汰换
]

/** 5 阶段折叠展示定义（文档 v2.1 K1） */
export interface MidloanPhase {
  key: string
  label: string
  milestone: string
  /** 数据形态标签（文档 v2.1 K1 R07：离线分析/在线接口） */
  dataForm: 'offline_analysis' | 'online_interface'
  statuses: MidloanStatus[]
}

export const MIDLOAN_PHASES: MidloanPhase[] = [
  { key: 'register',   label: '阶段1·注册', milestone: '注册完成',     dataForm: 'offline_analysis', statuses: ['requirement_proposal', 'registered'] },
  { key: 'develop',   label: '阶段2·开发', milestone: '分析可用',     dataForm: 'offline_analysis', statuses: ['developing_oa', 'dw_online'] },
  { key: 'verify',    label: '阶段3·验证', milestone: '上线就绪',     dataForm: 'offline_analysis', statuses: ['business_acceptance', 'business_verified', 'admin_confirmed'] },
  { key: 'online',    label: '阶段4·上线', milestone: '生产策略可用', dataForm: 'online_interface',  statuses: ['oa_production_reviewing', 'param_preparing', 'syncing_internal', 'syncing_variable', 'online'] },
  { key: 'retire',    label: '阶段5·汰换', milestone: '特征退役',     dataForm: 'online_interface',  statuses: ['offline'] }
]

/** 阶段展示范围（详情页 tab 拆分控制） */
export type LifecycleScope = 'offline_analysis' | 'online_interface' | 'all'

/** 离线分析阶段子集（阶段 1-3） */
export const OFFLINE_ANALYSIS_PHASES: MidloanPhase[] = MIDLOAN_PHASES.filter(p => p.dataForm === 'offline_analysis')

/** API 调用阶段子集（阶段 4-5） */
export const API_CALL_PHASES: MidloanPhase[] = MIDLOAN_PHASES.filter(p => p.dataForm === 'online_interface')

/**
 * 根据 scope 获取阶段列表
 */
export const getPhasesByScope = (scope: LifecycleScope): MidloanPhase[] => {
  switch (scope) {
    case 'offline_analysis': return OFFLINE_ANALYSIS_PHASES
    case 'online_interface': return API_CALL_PHASES
    default: return MIDLOAN_PHASES
  }
}

/**
 * 根据 scope 获取状态机正常流转顺序（时间轴展示）
 */
export const getStatusOrderByScope = (scope: LifecycleScope): MidloanStatus[] => {
  const phases = getPhasesByScope(scope)
  return phases.flatMap(p => p.statuses)
}

/**
 * 根据 scope 判断当前状态是否在 scope 范围外（可用于显示"已完成/未进入"提示）
 */
export const isStatusOutsideScope = (status: string, scope: LifecycleScope): 'before' | 'after' | 'inside' => {
  const cat = getStatusCategory(status)
  if (scope === 'all') return 'inside'
  if (scope === 'offline_analysis') {
    if (cat === 'offline_analysis') return 'inside'
    if (cat === 'online_interface') return 'after'
    return 'inside'
  }
  if (scope === 'online_interface') {
    if (cat === 'online_interface') return 'inside'
    if (cat === 'offline_analysis') return 'before'
    return 'inside'
  }
  return 'inside'
}

/** 异常状态列表 */
export const MIDLOAN_FAILED_STATUSES: MidloanStatus[] = [
  'internal_sync_failed',
  'variable_sync_failed',
  'dw_online_failed',
  'offline_failed'
]

/**
 * ============ 离线分析状态 / API调用状态 二分定义（文档 v2.1 §四）============
 *
 * 以「管理员已确认」为分界：
 * - 离线分析状态（阶段1-3：注册/开发/验证）：特征数据在数仓/Hbase离线表中
 * - API调用状态（阶段4-5：上线/汰换）：特征数据通过API接口供生产策略实时调用
 */

/** 离线分析状态列表（阶段1-3，含异常态 dw_online_failed） */
export const OFFLINE_ANALYSIS_STATUSES: MidloanStatus[] = [
  'requirement_proposal',
  'registered',
  'developing_oa',
  'dw_online',
  'business_acceptance',
  'business_verified',
  'admin_confirmed',
  'dw_online_failed'
]

/** API调用状态列表（阶段4-5，含异常态） */
export const API_CALL_STATUSES: MidloanStatus[] = [
  'oa_production_reviewing',
  'param_preparing',
  'syncing_internal',
  'syncing_variable',
  'online',
  'offline',
  'internal_sync_failed',
  'variable_sync_failed',
  'offline_failed'
]

/** 取状态元数据 */
export const midloanStatusMeta = (status?: string): MidloanStatusMeta => {
  return (MIDLOAN_STATUS_MAP as any)[status || ''] || { label: status || '', color: 'gray', description: '' }
}

export const midloanStatusLabel = (status?: string) => midloanStatusMeta(status).label
export const midloanStatusColor = (status?: string) => midloanStatusMeta(status).color
export const midloanStatusDataForm = (status?: string) => midloanStatusMeta(status).dataForm

/** 离线分析状态筛选选项 */
export const OFFLINE_ANALYSIS_FILTER_OPTIONS = OFFLINE_ANALYSIS_STATUSES.map(s => ({
  value: s,
  label: midloanStatusLabel(s)
}))

/** API调用状态筛选选项 */
export const API_CALL_FILTER_OPTIONS = API_CALL_STATUSES.map(s => ({
  value: s,
  label: midloanStatusLabel(s)
}))

/**
 * 判断状态属于离线分析还是API调用
 */
export const getStatusCategory = (status: string): 'offline_analysis' | 'online_interface' | 'unknown' => {
  if (OFFLINE_ANALYSIS_STATUSES.includes(status as MidloanStatus)) return 'offline_analysis'
  if (API_CALL_STATUSES.includes(status as MidloanStatus)) return 'online_interface'
  return 'unknown'
}

/**
 * 获取离线分析状态列显示值
 * - 离线分析阶段：显示当前状态
 * - API调用阶段：显示「已完成」（离线分析已结束）
 */
export const getOfflineAnalysisDisplay = (status: string): string => {
  const cat = getStatusCategory(status)
  if (cat === 'offline_analysis') return midloanStatusLabel(status)
  if (cat === 'online_interface') return '已完成'
  return '—'
}

/**
 * 获取API调用状态列显示值
 * - API调用阶段：显示当前状态
 * - 离线分析阶段：显示「未进入」
 */
export const getApiCallDisplay = (status: string): string => {
  const cat = getStatusCategory(status)
  if (cat === 'online_interface') return midloanStatusLabel(status)
  if (cat === 'offline_analysis') return '未进入'
  return '—'
}

/**
 * 根据状态获取所属阶段（文档 v2.1 K1 R08：阶段+状态双字段展示）
 */
export const getPhaseByStatus = (status: string): MidloanPhase | undefined => {
  return MIDLOAN_PHASES.find(p => p.statuses.includes(status as MidloanStatus))
}

/**
 * 阶段筛选选项（文档 v2.1 K1 R09：列表页新增「阶段」下拉筛选）
 */
export const MIDLOAN_PHASE_FILTER_OPTIONS = MIDLOAN_PHASES.map(p => ({
  value: p.key,
  label: p.label
}))

/**
 * 判断给定状态是否为可重试异常状态（用于详情页红色 Alert）
 */
export const isRetryableFailedStatus = (status: string): boolean => {
  return MIDLOAN_FAILED_STATUSES.includes(status as MidloanStatus)
}

/**
 * 给定当前状态，返回可执行的"操作按钮"
 * 文档 §四 状态流转表
 *
 * 设计原则：
 * 1. 每个状态都有明确的"主流程操作"
 * 2. 演示快捷按钮（DemoConsole）只用于演示场景
 * 3. 异常态重试用 retry_xxx 命名空间（retry_sync / retry_dw / retry_offline_batch）
 * 4. 补充数据底表操作（supplement_table）独立于状态机
 *
 * ⚠️ 【编辑保护 / DO NOT EDIT】
 * 本区域为贷中行为特征状态机核心配置，禁止随意修改。
 * - 任何状态/操作调整必须先更新《风险数据一体化一期·贷中行为特征自动化上下线 文档（v2.0 模板版）》
 * - 状态枚举必须与 MidloanStatus 一一对应，新增/删除请走评审流程
 * - 操作 key 命名空间（submit_/verify_/retry_/simulate_/request_/manual_）不可变更，否则会破坏前后端协议
 * - 如确需修改，请联系 @风险数据一体化 负责人并同步更新本注释
 */
export interface AllowedAction {
  key: string
  label: string
  type?: 'primary' | 'warning' | 'danger'
  /** demo: 仅演示快捷按钮（vs main: 主流程, error: 异常重试, admin: 管理员专用） */
  category?: 'main' | 'demo' | 'error' | 'admin'
}

export const allowedActionsByStatus = (status: string, _data?: any, role?: string): AllowedAction[] => {
  // 角色过滤：community_admin 仅查看，不展示任何操作按钮
  if (role === 'community_admin') return []

  const isAdmin = role === 'risk_data_admin'
  const isMember = role === 'risk_data_member' || !role

  let result: AllowedAction[] = []

  switch (status) {
    // ============ 主流程操作 ============
    case 'requirement_proposal':
      // 需求提出：管理员在注册特征抽屉内补充/确认字段后提交，进入「已注册」状态
      result = [
        { key: 'submit_requirement', label: '注册特征', type: 'primary', category: 'main' },
        { key: 'archive_variable', label: '特征归档', type: 'warning', category: 'admin' }
      ]
      break

    case 'registered':
      result = [
        { key: 'submit_dev_oa', label: '提开发OA单', type: 'primary', category: 'main' },
        { key: 'archive_variable', label: '特征归档', type: 'warning', category: 'admin' }
      ]
      break

    case 'business_acceptance':
      // 待业务验证：业务验证人在台账内点「验证通过」（不走OA单，台账内操作）
      result = [{ key: 'business_verify_pass', label: '业务验证通过', type: 'primary', category: 'main' }]
      break

    case 'business_verified':
      // 业务已验证：管理员在台账内点「确认通过」（不走OA单，台账内操作）
      result = [{ key: 'admin_confirm_pass', label: '管理员确认通过', type: 'primary', category: 'main' }]
      break

    case 'admin_confirmed':
      // 管理员已确认：管理员点「提投产单」→进入 OA 审批闸门
      result = [{ key: 'submit_production_order', label: '提投产单', type: 'primary', category: 'main' }]
      break

    case 'oa_production_reviewing':
      // OA 投产审批中：审批通过后进入参数准备
      result = isAdmin
        ? [
            { key: 'oa_production_approve', label: '审批通过（Demo）', type: 'primary', category: 'main' },
            { key: 'oa_production_reject', label: '驳回（Demo）', type: 'warning', category: 'main' }
          ]
        : []
      break

    // ============ 演示快捷按钮 ============
    case 'developing_oa':
      // 开发中（OA单）：演示模拟数仓回调（成功/失败）
      result = [
        { key: 'simulate_dw_success', label: '模拟数仓成功', category: 'demo' },
        { key: 'simulate_dw_success_dw', label: '模拟数仓成功（DW回调）', category: 'demo' },
        { key: 'simulate_dw_failed', label: '模拟数仓失败', category: 'demo' }
      ]
      break

    // ============ 异常重试操作 ============
    case 'internal_sync_failed':
      result = isAdmin || isMember
        ? [{ key: 'retry_sync', label: '重新同步', type: 'warning', category: 'error' }]
        : []
      break

    case 'variable_sync_failed':
      result = isAdmin || isMember
        ? [{ key: 'retry_sync', label: '重新同步', type: 'warning', category: 'error' }]
        : []
      break

    case 'dw_online_failed':
      // 数仓任务重试：仅管理员
      result = isAdmin ? [{ key: 'retry_dw', label: '重新触发数仓任务', type: 'warning', category: 'error' }] : []
      break

    case 'offline_failed':
      // 下线批次重试：仅管理员
      result = isAdmin ? [{ key: 'manual_batch_retry', label: '手动触发批次重试', type: 'warning', category: 'error' }] : []
      break

    // ============ 中间态（OA 审批中/同步中/参数准备） ============
    case 'oa_production_reviewing':
    case 'param_preparing':
    case 'syncing_internal':
    case 'syncing_variable':
      // OA 审批中/参数准备/同步中：等待系统自动完成，暂无用户操作
      result = []
      break

    // ============ 终态 ============
    case 'offline':
      // 已下线：终态，无操作
      result = []
      break

    default:
      result = []
      break
  }

  // ============ 管理员状态修正（文档 v2.1 §四）============
  // 仅 risk_data_admin 可见，仅可修正状态（非跨系统状态）显示
  // 不可修正的跨系统状态：syncing_internal / syncing_variable / online / offline
  if (isAdmin) {
    const correctableStatuses = [
      'requirement_proposal', 'registered', 'developing_oa', 'dw_online',
      'business_acceptance', 'business_verified', 'admin_confirmed',
      'oa_production_reviewing',
      'dw_online_failed', 'internal_sync_failed', 'variable_sync_failed', 'offline_failed'
    ]
    if (correctableStatuses.includes(status)) {
      result.push({ key: 'correct_status', label: '状态修正', type: 'warning', category: 'admin' })
    }
  }

  return result
}

/**
 * 当前状态下应该显示的演示快捷按钮（用于 DemoConsole 区域）
 */
export const demoActionsByStatus = (status: string, role?: string): AllowedAction[] => {
  return allowedActionsByStatus(status, undefined, role).filter(a => a.category === 'demo')
}

/**
 * 当前状态下的主流程操作（用于"动态操作"区域）
 */
export const mainActionsByStatus = (status: string, role?: string): AllowedAction[] => {
  return allowedActionsByStatus(status, undefined, role).filter(a => a.category === 'main' || a.category === 'error' || a.category === 'admin')
}

/**
 * ============ 编辑保护规则（用户反馈）============
 * 特征上线后，核心信息不可编辑（否则会影响实际上线调用）
 *
 * 文档依据：贷中行为特征自动化上下线 v2.0 §三 G.上线调用阶段
 *
 * 字段分类：
 * - core：核心字段（特征英文名/中文名/字段类型/加工逻辑/默认值/接口号等）
 *        上线后会影响特征中心实际调用，必须锁定
 * - supplementary：补充字段（数据底表名/数仓任务ID/OA单号/验收人等）
 *        自 developing_oa（离线开发中）起的离线阶段可补充/修改
 * - meta：元数据（描述/标签/可见性等）
 *        任何阶段都可编辑
 * - tag：治理标签字段（黑/白/灰名单类型）
 *        任何阶段都可编辑，含已上线/已下线/已归档——名单标签只影响业务侧使用口径，
 *        不改变特征加工逻辑与投产调用，因此全生命周期开放修改
 *
 * 注意：编辑「入口」对所有状态开放（见 canEdit），锁定发生在「字段级」。
 */
export type FieldCategory = 'core' | 'supplementary' | 'meta' | 'tag'

export interface FieldEditPolicy {
  /** 字段名（驼峰命名）*/
  field: string
  /** 中文标签 */
  label: string
  /** 字段类别 */
  category: FieldCategory
}

/** 字段编辑策略清单（用于编辑表单）*/
export const VARIABLE_FIELD_POLICIES: FieldEditPolicy[] = [
  // 核心字段（影响实际调用）
  { field: 'featureEnName', label: '特征英文名', category: 'core' },
  { field: 'featureCnName', label: '特征中文名', category: 'core' },
  { field: 'fieldType', label: '字段类型', category: 'core' },
  { field: 'processingLogic', label: '加工逻辑', category: 'core' },
  { field: 'defaultValue', label: '默认值', category: 'core' },
  { field: 'apiNo', label: '接口号', category: 'core' },
  { field: 'name', label: '特征名称', category: 'core' },
  { field: 'code', label: '特征代码', category: 'core' },
  { field: 'variableType', label: '特征类型', category: 'core' },
  { field: 'definition', label: '特征定义', category: 'core' },
  { field: 'l1Category', label: '一级分类', category: 'core' },
  { field: 'l2Category', label: '二级分类', category: 'core' },
  { field: 'sourceTableAfter', label: '标准化后源表', category: 'core' },
  { field: 'sourceTableBefore', label: '变更前源表', category: 'core' },
  // 补充字段（OA/数仓相关）
  { field: 'dataTableName', label: '数据底表名', category: 'supplementary' },
  { field: 'dwTaskId', label: '数仓任务ID', category: 'supplementary' },
  { field: 'devOaOrderId', label: 'OA开发单号', category: 'supplementary' },
  { field: 'verifyOaOrderId', label: 'OA验收单号（v2.0历史）', category: 'supplementary' },
  { field: 'acceptor', label: '验收人', category: 'supplementary' },
  // 元数据（描述/标签）
  { field: 'businessScene', label: '业务场景', category: 'meta' },
  { field: 'domainTags', label: '业务域标签', category: 'meta' },
  { field: 'variableTypeTags', label: '特征类型标签', category: 'meta' },
  { field: 'description', label: '描述', category: 'meta' },
  { field: 'visibility', label: '可见性', category: 'meta' },
  { field: 'remark', label: '备注', category: 'meta' },
  // 治理标签（黑/白/灰名单）：全生命周期可改
  { field: 'listType', label: '名单类型（黑/白/灰）', category: 'tag' }
]

/** 任意状态都可修改的治理标签字段（含已上线 / 已下线 / 已归档）*/
export const TAG_EDITABLE_FIELDS: string[] = VARIABLE_FIELD_POLICIES.filter(
  p => p.category === 'tag'
).map(p => p.field)

/** 离线阶段可补充协作信息的状态（含离线开发中 developing_oa，可修改验收人）*/
const SUPPLEMENTARY_EDITABLE_STATUSES = [
  'developing_oa', 'dw_online', 'dw_online_failed',
  'business_acceptance', 'business_verified', 'admin_confirmed'
]

/**
 * 给定状态，判断某个字段是否可编辑
 * @param status 特征当前状态
 * @param field 字段名
 * @returns true 可编辑；false 锁定
 */
export const canEditField = (status: string, field: string): boolean => {
  // 治理标签（黑/白/灰名单）：任何状态都可修改，先于投产锁定判断
  if (TAG_EDITABLE_FIELDS.includes(field)) return true

  // 已上线 / 已下线 / 已归档：除治理标签外的字段锁定
  if (status === 'online' || status === 'offline' || status === 'archived') return false

  // 元数据：所有状态可编辑
  const policy = VARIABLE_FIELD_POLICIES.find(p => p.field === field)
  if (!policy || policy.category === 'meta') return true

  // 补充字段（含验收人）：离线开发中起的开发/数仓/验证阶段可编辑
  if (policy.category === 'supplementary') {
    return SUPPLEMENTARY_EDITABLE_STATUSES.includes(status)
  }

  // 核心字段：需求提出/已注册阶段可编辑
  return ['registered', 'requirement_proposal'].includes(status)
}

/**
 * 获取状态下所有可编辑字段
 */
export const getEditableFields = (status: string): FieldEditPolicy[] => {
  return VARIABLE_FIELD_POLICIES.filter(p => canEditField(status, p.field))
}

/**
 * 获取状态下所有锁定字段
 */
export const getLockedFields = (status: string): FieldEditPolicy[] => {
  return VARIABLE_FIELD_POLICIES.filter(p => !canEditField(status, p.field))
}

/**
 * 判断当前状态下，整个特征是否允许编辑入口
 * （用于编辑按钮的 disabled 控制）
 *
 * 用户反馈：所有变量都要开放编辑功能——已上线 / 已下线 / 已归档同样进入编辑抽屉，
 * 只是抽屉内按字段级策略（canEditField）灰显锁定：
 * 治理标签（黑/白/灰名单）与元数据始终可改，核心字段投产后锁定。
 */
export const canEdit = (_status: string): boolean => true

/**
 * 编辑保护说明（用于 UI 提示）
 */
export const getEditLockReason = (status: string): string => {
  switch (status) {
    case 'online':
      return '已上线：投产调用字段（英文名/类型/加工逻辑/默认值等）已锁定；名单标签（黑/白/灰）与描述类元数据仍可修改'
    case 'offline':
      return '已下线：核心与数仓补充字段已锁定；可调整名单标签（黑/白/灰）与描述类元数据'
    case 'archived':
      return '已归档：主流程字段已锁定；仅名单标签（黑/白/灰）与描述类元数据可维护'
    case 'param_preparing':
    case 'syncing_internal':
    case 'syncing_variable':
      return '流程进行中：处于参数准备/同步状态，流程字段暂不开放，可维护名单标签与描述类元数据'
    case 'internal_sync_failed':
    case 'variable_sync_failed':
    case 'dw_online_failed':
    case 'offline_failed':
      return '异常态：请先处理异常（重试），流程字段暂不开放，可维护名单标签与描述类元数据'
    case 'requirement_proposal':
      return '需求提出：业务发起需求阶段，核心字段可编辑'
    case 'developing_oa':
      return '离线开发中：可补充数据底表、OA单号等运维字段，并修改验收人；名单标签随时可改'
    case 'dw_online':
      return '数仓已上线：仅可补充数据底表、OA单号等运维字段与名单标签'
    case 'business_acceptance':
      return '待业务验证：核心字段已锁定，可修改验收人等协作字段与名单标签'
    case 'business_verified':
      return '业务已验证：核心字段已锁定，可修改验收人等协作字段与名单标签'
    case 'admin_confirmed':
      return '管理员已确认：核心字段已锁定，可修改验收人等协作字段与名单标签'
    case 'oa_production_reviewing':
      return 'OA 投产审批中：流程字段暂不开放，可维护名单标签与描述类元数据'
    case 'registered':
      return '已注册：所有字段均可编辑'
    default:
      return '可编辑：核心字段按状态锁定，名单标签（黑/白/灰）与描述类元数据始终可改'
  }
}

/**
 * ============ 台账视角的操作 × 状态 映射（用户反馈）============
 *
 * 与 allowedActionsByStatus 的区别：
 * - allowedActionsByStatus：详情页"动态操作"区域显示（主流程操作）
 * - tableActionsByStatus：列表页每行的"操作"列显示（台账快捷操作）
 *
 * 台账操作通常包括：
 * - view_detail：查看详情（始终显示）
 * - edit：编辑（受保护）
 * - supplement_table：补充数据底表
 * - external_archive：外数档案
 * - line_usage：血缘/使用
 * - evaluation：评估
 * - retry：重试（异常态）
 *
 * 文档 §K1 明确：下线是被动接收（特征中心发起），台账无主动下线按钮。
 *
 * @param status 特征状态
 * @param record 特征数据（含 sourceType、isExternal 等）
 * @param role 当前角色（用于权限过滤）
 */
export type TableActionKey =
  | 'view_detail'           // 详情
  | 'edit'                  // 编辑
  | 'supplement_table'      // 补充数据底表
  | 'external_archive'      // 外数档案
  | 'retry'                 // 重试（异常态）
  | 'submit_online'         // 提交上线（非 midloan 行为品类·草稿/pending 状态）
  | 'correct_status'        // 状态修正（管理员专属）
  | 'archive_variable'      // 特征归档（管理员专属 · 仅需求提出/已注册）

export interface TableAction {
  key: TableActionKey
  label: string
  type?: 'primary' | 'warning' | 'danger'
}

/**
 * 台账操作结果：分为「顶层快捷」+「主流程操作」
 * - topActions：直接显示在操作列（详情/编辑/外数档案/重试/补充底表）
 * - mainActions：通过「更多操作」dropdown 触发抽屉（submit_dev_oa/business_verify_pass/admin_confirm_pass/submit_production_order 等）
 *
 * 用户反馈：动态操作下沉到列表页（详情页已经看得到的不重复；列表页能快速触发）
 */
export interface TableActionsResult {
  topActions: TableAction[]
  mainActions: AllowedAction[]
}

export const tableActionsByStatus = (
  status: string,
  record?: any,
  role?: string
): TableActionsResult => {
  const isAdmin = role === 'risk_data_admin'
  const isExternal = record?.sourceType === 'external' && !!record?.sourceRefs?.externalArchiveId
  const hasDataTable = !!record?.dataTableName
  const isMidloanBehavior = record?.category === 'midloan_behavior' || !!record?.midloanStatus

  // 顶层快捷按钮
  const topActions: TableAction[] = [{ key: 'view_detail', label: '详情' }]

  // 提交上线（非 midloan 行为品类的草稿/pending 状态）：直接发起审批申请
  // midloan 行为品类走 11 状态机的 submit_requirement 主流程按钮，不需要这枚
  if (!isMidloanBehavior && (status === 'draft' || status === 'pending')) {
    topActions.push({ key: 'submit_online', label: '提交上线', type: 'primary' })
  }

  // 编辑：所有状态都开放入口（用户反馈：所有变量都要开放编辑功能）
  // 具体字段是否可改由 canEditField 在抽屉内逐个灰显：投产后核心字段锁定，名单标签/元数据始终可改
  if (canEdit(status)) {
    topActions.push({ key: 'edit', label: '编辑', type: 'primary' })
  }

  // 补充数据底表
  const needSupplement = ['developing_oa', 'dw_online', 'dw_online_failed', 'business_acceptance', 'business_verified', 'admin_confirmed'].includes(status) && !hasDataTable
  if (needSupplement) {
    topActions.push({ key: 'supplement_table', label: '补充数据底表', type: 'warning' })
  }

  // 外数档案
  if (isExternal) {
    topActions.push({ key: 'external_archive', label: '外数档案' })
  }

  // 重试：异常态
  const retryable = ['internal_sync_failed', 'variable_sync_failed', 'dw_online_failed', 'offline_failed'].includes(status)
  if (retryable) {
    if (status === 'dw_online_failed' || status === 'offline_failed') {
      if (isAdmin) {
        topActions.push({ key: 'retry', label: '重试', type: 'danger' })
      }
    } else {
      topActions.push({ key: 'retry', label: '重新同步', type: 'danger' })
    }
  }

  // 主流程操作：从 allowedActionsByStatus 合并（排除 demo 演示按钮）
  const allMain = allowedActionsByStatus(status, record, role)
  // 去重：topActions 中已暴露过的快捷按钮不在「更多操作」中重复出现
  const topActionKeys = new Set<string>(topActions.map(a => a.key))
  const retryKeyMap: Record<string, string> = {
    retry_sync: 'retry',
    retry_dw: 'retry',
    manual_batch_retry: 'retry'
  }

  // 状态修正（管理员专属）：在更多操作区独立展示「状态修正」入口（admin category）
  // 列表页：作为独立可见的快捷按钮；管理员可一键打开状态修正抽屉
  const correctAction = allMain.find(a => a.category === 'admin' && a.key === 'correct_status')
  if (correctAction && isAdmin && !topActionKeys.has('correct_status')) {
    topActions.push({ key: 'correct_status', label: '状态修正', type: 'warning' })
  }

  // 特征归档（管理员专属 · 仅需求提出 / 已注册阶段）：在顶层 topActions 暴露
  const archiveAction = allMain.find(a => a.key === 'archive_variable')
  if (archiveAction && isAdmin && !topActionKeys.has('archive_variable')) {
    topActions.push({ key: 'archive_variable', label: '特征归档', type: 'warning' })
  }

  const mainActions = allMain.filter(a => {
    if (a.category === 'demo') return false
    if (a.category === 'admin' && a.key === 'correct_status') return false // 已上提到 topActions
    if (topActionKeys.has(a.key)) return false
    // retry_sync / retry_dw / manual_batch_retry 与 topActions.retry 重叠，隐藏
    if (retryKeyMap[a.key] && topActionKeys.has(retryKeyMap[a.key])) return false
    return true
  })

  return { topActions, mainActions }
}

/**
 * 给定状态和操作 key，返回是否应该显示该操作（仅顶层按钮）
 */
export const shouldShowTableAction = (
  status: string,
  actionKey: TableActionKey,
  record?: any,
  role?: string
): boolean => {
  const { topActions } = tableActionsByStatus(status, record, role)
  return topActions.some(a => a.key === actionKey)
}