/**
 * 权限模型 · D.2 权限矩阵
 * 来源：贷中行为特征自动化上下线 文档 附录 D.2
 *
 * 3 个角色（页面操作）：
 *   - risk_data_member:  风险数据成员（业务人员，如小李）
 *   - risk_data_admin:   风险数据管理员（如管理员）
 *   - community_admin:   数字社区管理员（如王数仓的社区团队）
 *
 * 2 个系统角色（API 交互，不涉及页面操作权限）：
 *   - variable_center_system
 *   - internal_number_system
 */

// ============ 角色枚举 ============
export const USER_ROLES = {
  RISK_DATA_MEMBER: 'risk_data_member',
  RISK_DATA_ADMIN: 'risk_data_admin',
  COMMUNITY_ADMIN: 'community_admin'
}

export const SYSTEM_ROLES = {
  VARIABLE_CENTER: 'variable_center_system',
  INTERNAL_NUMBER: 'internal_number_system'
}

export const ROLE_LABELS = {
  risk_data_member: '风险数据成员',
  risk_data_admin: '风险数据管理员',
  community_admin: '数字社区管理员',
  variable_center_system: '特征中心系统',
  internal_number_system: '内数系统'
}

// ============ 权限项 ============
export const PERMISSIONS = {
  CREATE_DERIVATION: 'create_derivation',          // 创建衍生需求
  REGISTER_FEATURE: 'register_feature',           // 注册特征
  ENABLE_FEATURE: 'enable_feature',               // 启用特征（发起上线）
  RETRY_SYNC: 'retry_sync',                       // 重新同步
  RETRY_OFFLINE_BATCH: 'retry_offline_batch',      // 手动触发下线批次重试
  VIEW_SYNC_LOG: 'view_sync_log',                 // 查看同步日志
  VIEW_OFFLINE_RECORD: 'view_offline_record',      // 查看下线记录
  DISCONNECT_DATA: 'disconnect_data',              // 断开数据
  DEV_EDIT_COLLABORATION: 'dev_edit_collaboration',// 编辑协作信息
  DRAFT_SAVE: 'draft_save',                       // 保存草稿
  EXPORT_LIST: 'export_list',                      // 导出列表
  REVIEW_REQUIREMENT: 'review_requirement',        // 审核需求提出
  BUSINESS_ACCEPTANCE: 'business_acceptance',       // 待业务验证
  VIEW_ALL_VARIABLES: 'view_all_variables',         // 查看全量特征
  DUPLICATE_CHECK: 'duplicate_check',              // 重复备案校验
  PARAM_MAPPING: 'param_mapping',                  // 参数映射
  PARAM_VALIDATION: 'param_validation',              // 参数有效性验证
  CORRECT_STATUS: 'correct_status',                  // v2.1 管理员状态修正
  MARK_EFFECT: 'mark_effect',                        // 变量效果评估：人工标记
  COMMENT_EFFECT: 'comment_effect',                  // 变量效果评估：发表意见
  RUN_EFFECT_TASK: 'run_effect_task'                 // 变量效果评估：触发跑批/试跑
}

// ============ 角色 × 权限 矩阵（D.2）============
const ROLE_MATRIX = {
  // 风险数据成员：业务人员（创建/注册/启用/查看自己日志）
  // 2026-08-10 新增：业务验收、全量特征查看、重复备案校验
  [USER_ROLES.RISK_DATA_MEMBER]: new Set([
    PERMISSIONS.CREATE_DERIVATION,
    PERMISSIONS.REGISTER_FEATURE,
    PERMISSIONS.ENABLE_FEATURE,
    PERMISSIONS.VIEW_SYNC_LOG,
    PERMISSIONS.VIEW_OFFLINE_RECORD,
    PERMISSIONS.DRAFT_SAVE,
    PERMISSIONS.EXPORT_LIST,
    PERMISSIONS.BUSINESS_ACCEPTANCE,
    PERMISSIONS.VIEW_ALL_VARIABLES,
    PERMISSIONS.DUPLICATE_CHECK,
    PERMISSIONS.MARK_EFFECT,
    PERMISSIONS.COMMENT_EFFECT
  ]),
  // 风险数据管理员：超管（全部能力 + 重新同步 + 手动触发下线重试）
  // 2026-08-10 新增全部新权限：需求审核、业务验收、全量特征、重复备案、参数映射/验证
  [USER_ROLES.RISK_DATA_ADMIN]: new Set([
    PERMISSIONS.CREATE_DERIVATION,
    PERMISSIONS.REGISTER_FEATURE,
    PERMISSIONS.ENABLE_FEATURE,
    PERMISSIONS.RETRY_SYNC,
    PERMISSIONS.RETRY_OFFLINE_BATCH,
    PERMISSIONS.VIEW_SYNC_LOG,
    PERMISSIONS.VIEW_OFFLINE_RECORD,
    PERMISSIONS.DEV_EDIT_COLLABORATION,
    PERMISSIONS.DRAFT_SAVE,
    PERMISSIONS.EXPORT_LIST,
    PERMISSIONS.REVIEW_REQUIREMENT,
    PERMISSIONS.BUSINESS_ACCEPTANCE,
    PERMISSIONS.VIEW_ALL_VARIABLES,
    PERMISSIONS.DUPLICATE_CHECK,
    PERMISSIONS.PARAM_MAPPING,
    PERMISSIONS.PARAM_VALIDATION,
    PERMISSIONS.CORRECT_STATUS,
    PERMISSIONS.MARK_EFFECT,
    PERMISSIONS.COMMENT_EFFECT,
    PERMISSIONS.RUN_EFFECT_TASK
  ]),
  // 数字社区管理员：仅查看 + 断开数据
  // 2026-08-10 新增：全量特征开放查看
  [USER_ROLES.COMMUNITY_ADMIN]: new Set([
    PERMISSIONS.VIEW_SYNC_LOG,
    PERMISSIONS.VIEW_OFFLINE_RECORD,
    PERMISSIONS.DISCONNECT_DATA,
    PERMISSIONS.VIEW_ALL_VARIABLES,
    PERMISSIONS.COMMENT_EFFECT
  ])
}

// ============ 当前用户（demo 切换）============
let _currentUser = {
  userId: 'xiao_li',
  name: '小李',
  role: USER_ROLES.RISK_DATA_MEMBER
}

export const UserContext = {
  get() {
    return { ..._currentUser }
  },
  set(user: any) {
    _currentUser = { ..._currentUser, ...user }
  },
  /** 切换角色（演示用） */
  switchRole(role: string) {
    if (ROLE_MATRIX[role]) {
      _currentUser = { ..._currentUser, role }
    }
  },
  /** 是否有某权限 */
  has(permission: string) {
    const set = ROLE_MATRIX[_currentUser.role]
    return set ? set.has(permission) : false
  },
  /** 是否有任一权限 */
  hasAny(...permissions: string[]) {
    return permissions.some(p => this.has(p))
  },
  /** 列出所有权限 */
  list() {
    return Array.from(ROLE_MATRIX[_currentUser.role] || [])
  }
}

export default UserContext