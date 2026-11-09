/**
 * 角色定义(P0 角色机制 · Step 1)
 *
 * 平台所有角色枚举 + 角色元数据(显示名 / 部门 / 快捷作业 / 默认着陆页)
 */

export type UserRole =
  | 'data_engineer'      // 数据工程师
  | 'data_admin'         // 数据治理者
  | 'risk_analyst'       // 风控分析师
  | 'risk_manager'       // 风控经理
  | 'loan_manager'       // 信贷经理
  | 'operation_lead'     // 运营主管
  | 'marketing_lead'     // 营销经理
  | 'product_manager'    // 产品经理
  | 'finance_lead'       // 财务主管
  | 'admin'              // 系统管理员

/**
 * 工作台快捷作业 key(对应 UnifiedWorkbench shortcuts)
 */
export type WorkbenchShortcut =
  // discovery
  | 'asset-catalog'
  | 'customer360'
  | 'metrics-map'
  | 'lineage'
  // management
  | 'service'
  | 'metadata-modeling'
  | 'data-standard'
  | 'data-permission'
  | 'business-concept'
  | 'asset-tags'
  | 'favorites'
  // exploration
  | 'tag-system'
  | 'event-center'
  | 'audience-system'
  | 'workflows'
  | 'indicator-dashboard'

/**
 * 快捷作业元数据(title/icon/routeKey)
 */
export interface ShortcutMeta {
  key: WorkbenchShortcut
  title: string
  desc: string
  iconName: string  // Arco Icon 名,在 UnifiedWorkbench 中查找
  module: 'discovery' | 'management' | 'exploration'
  routeKey: string  // useCrossNav 的 ROUTE_TABLE key
}

export interface RoleDefinition {
  role: UserRole
  label: string            // 显示名
  department: string
  description: string       // 角色职责
  /** UnifiedWorkbench 显示的快捷作业(有序) */
  shortcuts: WorkbenchShortcut[]
  /** 登录后默认着陆页 */
  defaultLanding: string
  /** 该角色被允许访问的路由 */
  allowedRoutes: string[]  // 路由名(name)
  /** 角色颜色(头像/徽标) */
  color: string
  /** 头像 emoji */
  avatar: string
}

/**
 * 10 个角色元数据
 */
export const ROLE_DEFINITIONS: Record<UserRole, RoleDefinition> = {
  data_engineer: {
    role: 'data_engineer',
    label: '数据工程师',
    department: '数据团队',
    description: '元数据建模 / 标签开发 / 字段打标',
    shortcuts: ['asset-catalog', 'metadata-modeling', 'data-standard', 'business-concept', 'asset-tags', 'favorites'],
    defaultLanding: '/management/metadata/modeling',
    allowedRoutes: ['*'],
    color: '#165dff',
    avatar: '🧑‍💻'
  },
  data_admin: {
    role: 'data_admin',
    label: '数据治理者',
    department: '数据团队',
    description: '数据治理 / 资产上下架 / 标准制定',
    shortcuts: ['asset-catalog', 'metadata-modeling', 'data-standard', 'data-permission', 'business-concept', 'asset-tags', 'service', 'favorites'],
    defaultLanding: '/management/data-standard/standards',
    allowedRoutes: ['*'],
    color: '#722ed1',
    avatar: '👨‍💼'
  },
  risk_analyst: {
    role: 'risk_analyst',
    label: '风控分析师',
    department: '风控团队',
    description: '风险评估 / 欺诈检测 / 逾期监控',
    shortcuts: ['customer360', 'audience-system', 'tag-system', 'metrics-map', 'asset-catalog', 'favorites'],
    defaultLanding: '/exploration/customer360',
    allowedRoutes: ['*'],
    color: '#fa541c',
    avatar: '🛡️'
  },
  risk_manager: {
    role: 'risk_manager',
    label: '风控经理',
    department: '风控团队',
    description: '风控策略 / 团队管理 / 催收',
    shortcuts: ['customer360', 'audience-system', 'tag-system', 'metrics-map', 'indicator-dashboard', 'favorites'],
    defaultLanding: '/exploration/indicator-dashboard',
    allowedRoutes: ['*'],
    color: '#f53f3f',
    avatar: '👨‍✈️'
  },
  loan_manager: {
    role: 'loan_manager',
    label: '信贷经理',
    department: '信贷团队',
    description: '贷款审批 / 授信管理 / API 申请',
    shortcuts: ['asset-catalog', 'service', 'workflows', 'customer360', 'metrics-map', 'favorites'],
    defaultLanding: '/discovery/asset-catalog',
    allowedRoutes: ['*'],
    color: '#13c2c2',
    avatar: '💳'
  },
  operation_lead: {
    role: 'operation_lead',
    label: '运营主管',
    department: '运营团队',
    description: '客群运营 / 圈选 / 标签应用',
    shortcuts: ['audience-system', 'tag-system', 'customer360', 'event-center', 'workflows', 'favorites'],
    defaultLanding: '/exploration/customer-center/audience-system/audience-management',
    allowedRoutes: ['*'],
    color: '#0fc6c2',
    avatar: '👩‍💼'
  },
  marketing_lead: {
    role: 'marketing_lead',
    label: '营销经理',
    department: '营销团队',
    description: '营销圈选 / 活动效果 / 渠道触达',
    shortcuts: ['audience-system', 'tag-system', 'indicator-dashboard', 'customer360', 'event-center', 'favorites'],
    defaultLanding: '/exploration/customer-center/audience-system/audience-management',
    allowedRoutes: ['*'],
    color: '#ff7d00',
    avatar: '📈'
  },
  product_manager: {
    role: 'product_manager',
    label: '产品经理',
    department: '产品团队',
    description: '产品调研 / 用户洞察 / 数据驱动',
    shortcuts: ['customer360', 'audience-system', 'metrics-map', 'business-concept', 'favorites'],
    defaultLanding: '/exploration/customer360',
    allowedRoutes: ['*'],
    color: '#9254de',
    avatar: '📦'
  },
  finance_lead: {
    role: 'finance_lead',
    label: '财务主管',
    department: '财务团队',
    description: '财务结算 / 监管报送 / 计费',
    shortcuts: ['indicator-dashboard', 'metrics-map', 'service', 'data-permission', 'favorites'],
    defaultLanding: '/exploration/indicator-dashboard',
    allowedRoutes: ['*'],
    color: '#00b42a',
    avatar: '💰'
  },
  admin: {
    role: 'admin',
    label: '系统管理员',
    department: 'IT 团队',
    description: '系统配置 / 全权限',
    shortcuts: ['asset-catalog', 'metadata-modeling', 'data-standard', 'business-concept', 'asset-tags', 'service', 'data-permission', 'customer360', 'audience-system', 'tag-system', 'event-center', 'workflows', 'indicator-dashboard', 'favorites'],
    defaultLanding: '/discovery/index',
    allowedRoutes: ['*'],
    color: '#1d2129',
    avatar: '🤖'
  }
}

/**
 * 快捷作业 key → 元数据(注册到 UnifiedWorkbench)
 */
export const SHORTCUT_REGISTRY: Record<WorkbenchShortcut, ShortcutMeta> = {
  // discovery
  'asset-catalog': { key: 'asset-catalog', title: '资产目录', desc: '资产目录台账', iconName: 'IconStorage', module: 'discovery', routeKey: 'discovery:asset-catalog' },
  'customer360': { key: 'customer360', title: '客户 360', desc: '客户全景查询', iconName: 'IconUserGroup', module: 'exploration', routeKey: 'exploration:customer360' },
  'metrics-map': { key: 'metrics-map', title: '指标地图', desc: '业务指标体系', iconName: 'IconBranch', module: 'discovery', routeKey: 'discovery:metrics-map' },
  'lineage': { key: 'lineage', title: '血缘构建', desc: '上下游血缘追踪', iconName: 'IconLink', module: 'discovery', routeKey: 'discovery:lineage' },
  // management
  'service': { key: 'service', title: '数据服务', desc: 'API 与服务管理', iconName: 'IconDesktop', module: 'management', routeKey: 'management:service' },
  'metadata-modeling': { key: 'metadata-modeling', title: '元数据建模', desc: '字段打标 / 血缘', iconName: 'IconCode', module: 'management', routeKey: 'management:metadata-modeling' },
  'data-standard': { key: 'data-standard', title: '数据标准', desc: '业务标准治理', iconName: 'IconCommon', module: 'management', routeKey: 'management:data-standard' },
  'data-permission': { key: 'data-permission', title: '字段权限', desc: '字段级权限配置', iconName: 'IconSafe', module: 'management', routeKey: 'management:data-permission' },
  'business-concept': { key: 'business-concept', title: '业务概念', desc: '业务域 / 实体 / 图谱', iconName: 'IconLink', module: 'management', routeKey: 'management:business-concept' },
  'asset-tags': { key: 'asset-tags', title: '资产标签', desc: '资产标签管理', iconName: 'IconTag', module: 'management', routeKey: 'management:asset-tags' },
  'favorites': { key: 'favorites', title: '我的关注', desc: '收藏的资产/指标/看板', iconName: 'IconStar', module: 'discovery', routeKey: 'discovery:favorites' },
  // exploration
  'tag-system': { key: 'tag-system', title: '标签体系', desc: '标签 / 标签组管理', iconName: 'IconTags', module: 'exploration', routeKey: 'exploration:tag-system' },
  'event-center': { key: 'event-center', title: '事件中心', desc: '事件 / 虚拟事件', iconName: 'IconCalendar', module: 'exploration', routeKey: 'exploration:event-center' },
  'audience-system': { key: 'audience-system', title: '客群中心', desc: '人群圈选与管理', iconName: 'IconUserGroup', module: 'exploration', routeKey: 'exploration:audience-management' },
  'workflows': { key: 'workflows', title: '分析流程', desc: '工作流 / SQL / Python', iconName: 'IconCode', module: 'exploration', routeKey: 'exploration:workflows' },
  'indicator-dashboard': { key: 'indicator-dashboard', title: '指标看板', desc: '可视化看板', iconName: 'IconDashboard', module: 'exploration', routeKey: 'exploration:indicator-dashboard' }
}

/**
 * 工具:判断当前角色是否有权访问某路由
 */
export function canAccessRoute(role: UserRole, routeName: string): boolean {
  const def = ROLE_DEFINITIONS[role]
  if (!def) return false
  if (def.allowedRoutes.includes('*')) return true
  return def.allowedRoutes.includes(routeName)
}

/**
 * 工具:获取角色快捷作业(带元数据)
 */
export function getRoleShortcuts(role: UserRole): ShortcutMeta[] {
  const def = ROLE_DEFINITIONS[role]
  if (!def) return []
  return def.shortcuts
    .map(k => SHORTCUT_REGISTRY[k])
    .filter(Boolean)
}