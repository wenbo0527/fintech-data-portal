/**
 * 外数档案 · 产品主数据（单一事实源）
 *
 * 【为什么需要这个文件】
 * 改造前产品清单由 api/evaluation.ts 的 generateMockProducts() 用 Math.random() 现算，
 * status / evaluationScore / monitorStatus 每次刷新都会跳变，档案状态本质上不可信，
 * 任何跨模块一致性校验都无从建立。本文件把产品清单改为**确定性种子 + localStorage 副本**：
 *   1. seedArchiveProducts 写死全部业务取值，同一次数据变更后结果稳定；
 *   2. 编辑/新建写入 localStorage，副本优先于种子（与 variable-hub
 *      evaluation-task-store「localStorage 副本优先于内置种子」同一约定）；
 *   3. 全模块唯一写入点是 upsertArchiveProduct，其他页面一律只读。
 *
 * 【字段所有权（谁写谁读）】
 * 本文件 owner：产品标识、三轴机构、外数类型、六大业务状态、接口号、落库表名、负责人。
 * 只读消费方：外数档案列表/详情、回溯落库向导产品下拉、评估中心、预算合同创建与对账。
 * 落库结果/物理表 → 归文件落库模块；效果指标 → 归评估任务；合同核销 → 归预算模块。
 *
 * 【机构口径】（2026-11-03 两轴口径，字典与迁移规则见 mock/orgDictionaries.ts 文件头）
 * cooperationOrg 合作机构 = 这批数据合规流通所依托的持牌征信机构，闭集四档：百行 / 朴道 / 钱塘 / 其他；
 * supplier 供应商 = 实际供数或代理接入的厂商（学信网 / 字节 / 京东 / 上数金科 / 恒普 / 海纳 / 内部）。
 * 原第三轴 channel（渠道＝业务场景方）已整轴删除：渠道值并入供应商并覆盖原供应商值，
 * 不属于四档的出数方（学信网、上数金科）合作机构记「其他」、本名转为供应商。
 */
import { externalDataFieldsMap } from './supplierProducts'
import { isMappingConfigured } from './mappingConfiguredFlags'

/** 档案六大业务状态 + 「全部」聚合标签 */
export type ArchiveStatus =
  | 'importing'
  | 'pending_tech_profile'
  | 'online'
  | 'pending_evaluation'
  | 'archived'

/**
 * 状态展示名与标签色 —— 列表徽标、详情头部、生命周期计数共用同一份，
 * 改造前三处各写了一份 statusLabel，导致详情页「待完善技术档案」显示为「—」。
 *
 * color 必须是 Arco Tag 的合法预设色名（见 @arco-design/web-vue TagProps.color：
 * red/orangered/orange/gold/lime/green/cyan/blue/arcoblue/purple/pinkpurple/magenta/gray）。
 * 改造前各页面写的是 `<a-tag :status="...">`，而 Tag 根本没有 status 这个 prop，
 * 属性被当成无效 DOM attribute 丢弃，所以状态色一直没生效。
 */
export const ARCHIVE_STATUS_META: Record<ArchiveStatus, { label: string; color: string }> = {
  importing: { label: '引入中', color: 'orangered' },
  pending_tech_profile: { label: '待完善技术档案', color: 'orange' },
  online: { label: '已上线', color: 'green' },
  pending_evaluation: { label: '待评估', color: 'blue' },
  archived: { label: '已归档', color: 'gray' },
}

/** 通用小状态（待处理 / 进行中 / 已完成）→ 展示名 + Tag 色，生命周期阶段与待办任务共用 */
export const PROGRESS_STATUS_META: Record<string, { label: string; color: string }> = {
  pending: { label: '待处理', color: 'gray' },
  in_progress: { label: '进行中', color: 'orange' },
  active: { label: '进行中', color: 'orange' },
  completed: { label: '已完成', color: 'green' },
}
export const progressStatusMeta = (s?: string) => PROGRESS_STATUS_META[String(s || '')]

/** 快速过滤条与状态下拉共用的六项（含「全部」聚合） */
export const ARCHIVE_STATUS_OPTIONS: { value: ArchiveStatus | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'importing', label: ARCHIVE_STATUS_META.importing.label },
  { value: 'pending_tech_profile', label: ARCHIVE_STATUS_META.pending_tech_profile.label },
  { value: 'online', label: ARCHIVE_STATUS_META.online.label },
  { value: 'pending_evaluation', label: ARCHIVE_STATUS_META.pending_evaluation.label },
  { value: 'archived', label: ARCHIVE_STATUS_META.archived.label },
]

/**
 * 接口状态 —— 与档案六大业务状态是**两个独立字段**（需求文档 R37 / R131），不得混用或联动覆盖。
 * 典型不一致场景：接口已接通但技术档案未配齐 → interfaceStatus='online' 而 status='pending_tech_profile'。
 */
export const INTERFACE_STATUSES = ['importing', 'online', 'offline'] as const
export type InterfaceStatus = (typeof INTERFACE_STATUSES)[number]
export const INTERFACE_STATUS_LABEL: Record<InterfaceStatus, string> = {
  importing: '接入中',
  online: '已上线',
  offline: '已下线',
}

/** 产品分类展示名（种子内存枚举码，详情页按此取中文） */
export const PRODUCT_CATEGORY_LABEL: Record<string, string> = {
  DATA: '数据类',
  SPECIAL: '特殊类',
}

/** 接口技术档案（需求文档 B 模块 R31-R36） */
export interface TechProfile {
  requestMethod: string
  apiUrl: string
  timeoutSec: number
  qpsLimit: number
  updateFrequency: string
  dataSource: string
  cacheTimeSec?: number
  description: string
  /** 离线/回溯型专属：跑批任务名 */
  offlineTaskName?: string
}

/**
 * 按产品自身属性确定技术档案展示值
 * 改造前这些值写死在 ArchiveDetail.vue 的 loadDetail 里（所有产品一组常量），
 * 现收拢到主数据侧按外数类型派生，保证同一个产品在列表/详情/向导看到同一值。
 */
export function techProfileOf(p: Pick<ArchiveProduct, 'externalDataType' | 'interfaceNo' | 'name'>): TechProfile {
  const persisted = isPersistedType(p.externalDataType)
  return {
    requestMethod: 'POST',
    apiUrl: persisted ? '/api/external/batch/submit' : '/api/external/call',
    timeoutSec: persisted ? 300 : 30,
    qpsLimit: persisted ? 20 : 100,
    updateFrequency: persisted ? 'T+1' : '实时',
    dataSource: persisted ? '文件批量回流' : '外部 API',
    cacheTimeSec: persisted ? undefined : 60,
    description: persisted
      ? `${p.name} 按批次文件回流，落库后供模型与策略使用`
      : `${p.name} 支持高并发实时查询，结果缓存 1 小时`,
    offlineTaskName: persisted ? `T+1 离线回溯跑批任务-${p.interfaceNo || p.name}` : undefined,
  }
}

/**
 * 接口入参 / 出参字段定义
 * 需求文档 R53：落库字段映射的候选源就是「产品出参」，两者必须是同一份数据，
 * 所以入参/出参归属到产品主数据，而不是各页面各自写一份常量。
 */
export interface InterfaceParam {
  name: string
  type: string
  required?: boolean
  description?: string
  /** 是否主体要素（id_no / mobile 等，落库时强制绑定标准列） */
  isElement?: boolean
}

/** 接口调用主体要素字段名（与落库向导的强制绑定列同口径） */
const ELEMENT_FIELDS = ['id_no', 'id_card', 'mobile', 'phone', 'name', 'request_id']

function paramFromDict(f: { name: string; type: string; comment: string; required: boolean }): InterfaceParam {
  return { name: f.name, type: String(f.type).toLowerCase(), required: f.required, description: f.comment, isElement: ELEMENT_FIELDS.includes(f.name) }
}

/**
 * 取产品出参：档案上人工维护过的优先，没维护过则回到接口字段字典
 * （supplierProducts.externalDataFieldsMap）派生，保证任何时刻都有确定值。
 */
export function resolveOutputParams(p?: Pick<ArchiveProduct, 'id' | 'outputParams'> | null): InterfaceParam[] {
  if (!p) {return []}
  if (Array.isArray(p.outputParams) && p.outputParams.length) {return p.outputParams}
  return (externalDataFieldsMap[p.id] || []).map(paramFromDict)
}

/**
 * 取产品入参：同上，未人工维护时取接口字段字典中的主体要素列作为必填入参
 * （这些字段确实是核验类接口调用时必须提交的标识要素）。
 */
export function resolveInputParams(p?: Pick<ArchiveProduct, 'id' | 'inputParams'> | null): InterfaceParam[] {
  if (!p) {return []}
  if (Array.isArray(p.inputParams) && p.inputParams.length) {return p.inputParams}
  return (externalDataFieldsMap[p.id] || []).filter((f) => ELEMENT_FIELDS.includes(f.name)).map(paramFromDict)
}

/** 外数类型三值（需求文档 R22：离线批量调用、在线批量调用、外数离线回溯申请；在线实时调用为存量补充档） */
export const EXTERNAL_DATA_TYPES = ['在线实时调用', '在线批量调用', '离线批量调用', '外数离线回溯申请'] as const
export type ExternalDataType = (typeof EXTERNAL_DATA_TYPES)[number]

/**
 * 是否为「批量/回溯」型 —— 需求文档 D1：只有这类产品才有落库环节，
 * 也只有这类产品才可能进入「待完善技术档案」。在线实时调用无落库概念。
 */
export function isPersistedType(t?: ExternalDataType | string): boolean {
  return t === '离线批量调用' || t === '外数离线回溯申请' || t === '在线批量调用'
}

/** 计费方式（供预算/对账沿用，取值集合不随改造变化） */
export const BILLING_MODES = ['per_call', 'per_field', 'package'] as const

/** 状态变更留痕条目 */
export interface StatusChangeEntry {
  from?: ArchiveStatus
  to: ArchiveStatus
  /** 触发原因：业务事件名或人工操作说明 */
  reason: string
  at: string
  by: string
}

/**
 * 外数档案产品 —— 保留改造前已被跨模块依赖的字段名
 * （budget/pages/ContractCreate 读 interfaceNo/name/supplier 并 push，
 *  budget/pages/ReconcilePanel 读 code/id/name/supplier），新增档案域字段向后兼容。
 */
export interface ArchiveProduct {
  /** 业务唯一主键 = productCode，全模块统一关联锚点 */
  id: string
  productCode: string
  /** 档案编号 ED-xxx，预算对账据此判断是否来自外数档案 */
  code: string
  name: string
  /** 合作机构＝持牌征信机构，闭集四档：百行 / 朴道 / 钱塘 / 其他（口径见 mock/orgDictionaries.ts） */
  cooperationOrg: string
  /** 供应商＝实际供数或代理接入的厂商（原「渠道」轴的场景方已并入此字段） */
  supplier: string
  /** 六大业务状态 */
  status: ArchiveStatus
  /** 接口状态（独立字段，见 INTERFACE_STATUSES 说明） */
  interfaceStatus: InterfaceStatus
  /** 接入时间 */
  createdAt: string
  /** 实际上线时间（已上线后写入） */
  onlineTime?: string
  usageScene: string
  /** 档案描述（编辑弹窗必填项，属于产品主数据，不再只存页面内存） */
  description?: string
  billingMode: string
  unitPrice?: number
  billingCycle: string
  currency: string
  effectiveDate: string
  expireDate: string
  tags: string[]
  evaluationScore?: number
  monitorStatus: string
  /** 接口编号（非必填，先签协议后引入时为空 → 界面显示「待补充」） */
  interfaceNo?: string
  interfaceName?: string
  /**
   * 落库目标表 —— 唯一权威字段。
   * 改造前这里是 bottomTable / dbTable / tableName 三个同值字段，
   * 谁想写就得三处一起写，属于典型的「一个字段多个 owner」，现已合一
   * （命名与 mock/interfaceFieldMapping.ts 的 targetTable 对齐）。
   */
  targetTable?: string
  /** 调用样本表（与元数据模块同源，不落库表混用） */
  sampleTable?: string
  /**
   * 是否已配置落库字段映射 —— **派生只读位**，owner 是落库字段映射模块。
   * 改造前它是 21 条种子里各存一份的存储字段，于是出现「列表说已配置、打开页签却是空表」
   * 与「页签存着映射、列表说未配置」两类矛盾；现统一由 loadArchiveProducts
   * 从 mock/mappingConfiguredFlags.ts 回填，本文件不再存、也不接受外部写入。
   */
  readonly mappingConfigured?: boolean
  externalDataType?: ExternalDataType
  productCategory?: string
  /** 档案负责人 / 数据管理人（两个独立字段，不得混用） */
  archiveOwner?: string
  dataManager?: string
  sourceSystem?: string
  /** 迁移批次号与迁移标记（需求文档 A2 存量迁移） */
  migrationBatch?: string
  migrated: boolean
  /**
   * 状态变更留痕（需求文档 R129：状态由业务事件写入，必须可追溯）
   * 由 upsertArchiveProduct 在 status 发生变化时自动追加，调用方不得直接改写。
   */
  statusHistory?: StatusChangeEntry[]
  frameworkAgreements: any[]
  totalSupplementAmount: number
  /** 人工维护的接口入参 / 出参（编辑弹窗保存后以档案为准）；未维护时由接口字段字典派生 */
  inputParams?: InterfaceParam[]
  outputParams?: InterfaceParam[]
  updatedAt?: string
  updatedBy?: string
}

/* --------------------------------------------------------------------------
 * 派生只读位
 * 改造前这些都是单独存储的布尔副本（hasInterfaces / hasBottomTable / isBlankCard），
 * 与主字段没有强约束，很容易出现「改了落库表但标记还是 false」。
 * 现统一由主字段现算，不再提供写入入口。
 * -------------------------------------------------------------------------- */

/** 是否已登记接口（接口编号或接口名至少有一个） */
export const hasInterfaceConfigured = (p?: Pick<ArchiveProduct, 'interfaceNo' | 'interfaceName'> | null): boolean =>
  Boolean(p && (p.interfaceNo || p.interfaceName))

/** 是否已配置落库目标表 */
export const hasTargetTable = (p?: Pick<ArchiveProduct, 'targetTable'> | null): boolean => Boolean(p?.targetTable)

/** 空白卡片（需求文档 R07：先签协议后引入）＝ 既无接口编号也无落库表 */
export const isBlankCardProduct = (p?: Pick<ArchiveProduct, 'interfaceNo' | 'targetTable'> | null): boolean =>
  !p?.interfaceNo && !p?.targetTable

/**
 * 确定性种子：21 个产品，业务取值全部写死。
 * 状态分布覆盖六大状态各至少一条，保证列表快速过滤与状态下拉均可验证。
 * 「待完善技术档案」严格只给 离线/回溯 且尚未配置落库映射的产品（与 R123 一致，
 * mappingConfigured 由映射模块登记后派生，种子不再写该字段）。
 */
const seedArchiveProducts: ArchiveProduct[] = [
  // ── 引入中：先签协议后引入，接口号与落库表名待补充（需求文档 R07 空白卡片）──
  {
    id: 'XUEXIN_ID_VERIFY', productCode: 'XUEXIN_ID_VERIFY', code: 'ED-001', name: '学籍身份核验',
    cooperationOrg: '其他', supplier: '学信网', status: 'importing',
    interfaceStatus: 'importing',
    createdAt: '2026-10-12T09:30:00.000Z', usageScene: '贷前评分', billingMode: 'per_call',
    billingCycle: 'month', currency: 'CNY', effectiveDate: '2026-11-01T00:00:00.000Z', expireDate: '2027-10-31T00:00:00.000Z',
    tags: ['外数', '风控', '引入中待补充'], monitorStatus: '—',
    externalDataType: '在线实时调用', productCategory: 'DATA',
    migrated: false,
    archiveOwner: '待补充', dataManager: '待补充', frameworkAgreements: [], totalSupplementAmount: 0,
  },
  {
    id: 'XUEXIN_DEGREE_VERIFY', productCode: 'XUEXIN_DEGREE_VERIFY', code: 'ED-002', name: '学历认证查询',
    cooperationOrg: '其他', supplier: '学信网', status: 'importing',
    interfaceStatus: 'importing',
    createdAt: '2026-10-18T14:00:00.000Z', usageScene: '贷前评分', billingMode: 'per_call',
    billingCycle: 'month', currency: 'CNY', effectiveDate: '2026-11-01T00:00:00.000Z', expireDate: '2027-10-31T00:00:00.000Z',
    tags: ['外数', '风控'], monitorStatus: '—', interfaceName: '学历认证实时查询接口',
    externalDataType: '在线批量调用', productCategory: 'DATA',
    migrated: false,
    interfaceNo: 'IF-0002',
    archiveOwner: '王芳', dataManager: '待补充', frameworkAgreements: [], totalSupplementAmount: 0,
  },
  // ── 待完善技术档案：离线/回溯型且未配置落库字段映射 ──
  {
    id: 'XUEXIN_BATCH_DEGREE', productCode: 'XUEXIN_BATCH_DEGREE', code: 'ED-015', name: '学历批量认证',
    cooperationOrg: '其他', supplier: '学信网', status: 'pending_tech_profile',
    interfaceStatus: 'online',
    createdAt: '2026-08-05T10:00:00.000Z', usageScene: '贷前评分', billingMode: 'per_call', unitPrice: 2,
    billingCycle: 'month', currency: 'CNY', effectiveDate: '2026-08-01T00:00:00.000Z', expireDate: '2027-07-31T00:00:00.000Z',
    tags: ['外数', '风控', '批量'], monitorStatus: '—', interfaceNo: 'IF-0015', evaluationScore: 71,
    externalDataType: '离线批量调用', productCategory: 'DATA',
    migrated: false,
    sampleTable: 'ods_ext_batch_sample', archiveOwner: '陈静', dataManager: '陈静',
    frameworkAgreements: [], totalSupplementAmount: 0,
  },
  {
    id: 'PD_DEVICE_RISK', productCode: 'PD_DEVICE_RISK', code: 'ED-019', name: '设备风险识别',
    cooperationOrg: '朴道', supplier: '字节', status: 'pending_tech_profile',
    interfaceStatus: 'online',
    createdAt: '2026-07-20T10:00:00.000Z', usageScene: '贷中监控', billingMode: 'package',
    billingCycle: 'month', currency: 'CNY', effectiveDate: '2026-07-01T00:00:00.000Z', expireDate: '2027-06-30T00:00:00.000Z',
    tags: ['外数', '特殊'], monitorStatus: '—', interfaceNo: 'IF-0019', evaluationScore: 88,
    externalDataType: '外数离线回溯申请', productCategory: 'SPECIAL',
    migrated: false,
    sampleTable: 'ods_ext_device_sample', archiveOwner: '待补充', dataManager: '待补充',
    frameworkAgreements: [], totalSupplementAmount: 0,
  },
  // ── 待评估：已引入接口但无落库表 ──
  {
    id: 'PD_TRAFFIC_ANALYSIS', productCode: 'PD_TRAFFIC_ANALYSIS', code: 'ED-017', name: '流量行为分析',
    cooperationOrg: '朴道', supplier: '字节', status: 'pending_evaluation',
    interfaceStatus: 'importing',
    createdAt: '2026-09-02T11:00:00.000Z', usageScene: '贷中监控', billingMode: 'per_call', unitPrice: 5,
    billingCycle: 'month', currency: 'CNY', effectiveDate: '2026-09-01T00:00:00.000Z', expireDate: '2027-08-31T00:00:00.000Z',
    tags: ['外数', '风控'], monitorStatus: '—', interfaceNo: 'IF-0017',
    externalDataType: '在线批量调用', productCategory: 'DATA',
    migrated: false,
    archiveOwner: '刘洋', dataManager: '刘洋', frameworkAgreements: [], totalSupplementAmount: 0,
  },
  {
    id: 'XUEXIN_SPECIAL_AUDIT', productCode: 'XUEXIN_SPECIAL_AUDIT', code: 'ED-020', name: '特殊教育审核',
    cooperationOrg: '其他', supplier: '学信网', status: 'pending_evaluation',
    interfaceStatus: 'importing',
    createdAt: '2026-06-15T09:00:00.000Z', usageScene: '贷前评分', billingMode: 'package',
    billingCycle: 'month', currency: 'CNY', effectiveDate: '2026-06-01T00:00:00.000Z', expireDate: '2027-05-31T00:00:00.000Z',
    tags: ['外数', '特殊'], monitorStatus: '—', interfaceNo: 'IF-0020',
    externalDataType: '在线实时调用', productCategory: 'SPECIAL',
    migrated: false,
    archiveOwner: '王芳', dataManager: '赵磊', frameworkAgreements: [], totalSupplementAmount: 0,
  },
  // ── 已归档：合作到期下线 ──
  {
    id: 'PD_DEVICE_CLUSTER', productCode: 'PD_DEVICE_CLUSTER', code: 'ED-018', name: '设备聚类分析',
    cooperationOrg: '朴道', supplier: '字节', status: 'archived',
    interfaceStatus: 'offline',
    createdAt: '2025-11-08T09:00:00.000Z', onlineTime: '2025-12-01T09:00:00.000Z', usageScene: '贷中监控',
    billingMode: 'per_call', unitPrice: 6, billingCycle: 'month', currency: 'CNY',
    effectiveDate: '2025-11-01T00:00:00.000Z', expireDate: '2026-10-31T00:00:00.000Z',
    tags: ['外数', '风控', '已下线'], monitorStatus: '异常', interfaceNo: 'IF-0018', evaluationScore: 64,
    externalDataType: '离线批量调用', productCategory: 'DATA',
    migrated: true, migrationBatch: 'MIG-2026-06',
    targetTable: 'dwd_pd_device_cluster_detail',
    sampleTable: 'ods_ext_device_sample', archiveOwner: '刘洋', dataManager: '刘洋',
    frameworkAgreements: [], totalSupplementAmount: 0,
  },
  // ── 已上线：接口与落库配置齐备 ──
  {
    id: 'XUEXIN_STATUS_CHECK', productCode: 'XUEXIN_STATUS_CHECK', code: 'ED-003', name: '在学状态核验',
    cooperationOrg: '其他', supplier: '学信网', status: 'online',
    interfaceStatus: 'online',
    createdAt: '2026-03-10T09:00:00.000Z', onlineTime: '2026-04-01T09:00:00.000Z', usageScene: '贷前评分',
    billingMode: 'per_call', unitPrice: 3, billingCycle: 'month', currency: 'CNY',
    effectiveDate: '2026-03-01T00:00:00.000Z', expireDate: '2027-02-28T00:00:00.000Z',
    tags: ['外数', '风控'], monitorStatus: '正常', interfaceNo: 'IF-0003', evaluationScore: 82,
    externalDataType: '在线实时调用', productCategory: 'DATA',
    migrated: true, migrationBatch: 'MIG-2026-06',
    targetTable: 'dwd_xuexin_status_check_detail',
    archiveOwner: '王芳', dataManager: '赵磊', frameworkAgreements: [], totalSupplementAmount: 0,
  },
  {
    id: 'XUEXIN_ENROLL_VERIFY', productCode: 'XUEXIN_ENROLL_VERIFY', code: 'ED-004', name: '入学信息核验',
    cooperationOrg: '其他', supplier: '学信网', status: 'online',
    interfaceStatus: 'online',
    createdAt: '2026-02-18T09:00:00.000Z', onlineTime: '2026-03-05T09:00:00.000Z', usageScene: '贷前评分',
    billingMode: 'per_call', unitPrice: 4, billingCycle: 'month', currency: 'CNY',
    effectiveDate: '2026-02-01T00:00:00.000Z', expireDate: '2027-01-31T00:00:00.000Z',
    tags: ['外数', '风控'], monitorStatus: '正常', interfaceNo: 'IF-0004', evaluationScore: 79,
    externalDataType: '在线批量调用', productCategory: 'DATA',
    migrated: true, migrationBatch: 'MIG-2026-06',
    targetTable: 'dwd_xuexin_enroll_verify_detail',
    archiveOwner: '王芳', dataManager: '赵磊', frameworkAgreements: [], totalSupplementAmount: 0,
  },
  {
    id: 'BH_CREDIT_SCORE', productCode: 'BH_CREDIT_SCORE', code: 'ED-005', name: '百行信用评分',
    cooperationOrg: '百行', supplier: '京东', status: 'online',
    interfaceStatus: 'online',
    createdAt: '2026-01-09T09:00:00.000Z', onlineTime: '2026-02-01T09:00:00.000Z', usageScene: '贷前评分',
    billingMode: 'per_call', unitPrice: 8, billingCycle: 'month', currency: 'CNY',
    effectiveDate: '2026-01-01T00:00:00.000Z', expireDate: '2026-12-31T00:00:00.000Z',
    tags: ['外数', '风控', '核心'], monitorStatus: '正常', interfaceNo: 'IF-0005', evaluationScore: 91,
    externalDataType: '在线批量调用', productCategory: 'DATA',
    migrated: true, migrationBatch: 'MIG-2026-05',
    targetTable: 'dwd_bh_credit_score_detail',
    archiveOwner: '陈静', dataManager: '刘洋', frameworkAgreements: [], totalSupplementAmount: 0,
  },
  {
    id: 'BH_ID_VALIDATION', productCode: 'BH_ID_VALIDATION', code: 'ED-006', name: '身份有效性核验',
    cooperationOrg: '百行', supplier: '京东', status: 'online',
    interfaceStatus: 'online',
    createdAt: '2026-01-22T09:00:00.000Z', onlineTime: '2026-02-10T09:00:00.000Z', usageScene: '贷中监控',
    billingMode: 'per_call', unitPrice: 1, billingCycle: 'month', currency: 'CNY',
    effectiveDate: '2026-01-01T00:00:00.000Z', expireDate: '2026-12-31T00:00:00.000Z',
    tags: ['外数', '风控'], monitorStatus: '正常', interfaceNo: 'IF-0006', evaluationScore: 85,
    externalDataType: '在线实时调用', productCategory: 'DATA',
    migrated: true, migrationBatch: 'MIG-2026-05',
    targetTable: 'dwd_bh_id_validation_detail',
    archiveOwner: '陈静', dataManager: '刘洋', frameworkAgreements: [], totalSupplementAmount: 0,
  },
  {
    id: 'BH_PHONE_RISK', productCode: 'BH_PHONE_RISK', code: 'ED-007', name: '手机号风险评估',
    cooperationOrg: '百行', supplier: '京东', status: 'online',
    interfaceStatus: 'online',
    createdAt: '2026-04-14T09:00:00.000Z', onlineTime: '2026-05-06T09:00:00.000Z', usageScene: '贷前评分',
    billingMode: 'per_call', unitPrice: 2, billingCycle: 'month', currency: 'CNY',
    effectiveDate: '2026-04-01T00:00:00.000Z', expireDate: '2027-03-31T00:00:00.000Z',
    tags: ['外数', '风控'], monitorStatus: '正常', interfaceNo: 'IF-0007', evaluationScore: 76,
    externalDataType: '在线实时调用', productCategory: 'DATA',
    migrated: false,
    targetTable: 'dwd_bh_phone_risk_detail',
    archiveOwner: '刘洋', dataManager: '陈静', frameworkAgreements: [], totalSupplementAmount: 0,
  },
  {
    id: 'BH_BLACKLIST_CHECK', productCode: 'BH_BLACKLIST_CHECK', code: 'ED-008', name: '黑名单查询',
    cooperationOrg: '百行', supplier: '京东', status: 'online',
    interfaceStatus: 'online',
    createdAt: '2026-02-26T09:00:00.000Z', onlineTime: '2026-03-12T09:00:00.000Z', usageScene: '贷中监控',
    billingMode: 'per_call', unitPrice: 1, billingCycle: 'month', currency: 'CNY',
    effectiveDate: '2026-02-01T00:00:00.000Z', expireDate: '2027-01-31T00:00:00.000Z',
    tags: ['外数', '风控'], monitorStatus: '异常', interfaceNo: 'IF-0008', evaluationScore: 88,
    externalDataType: '外数离线回溯申请', productCategory: 'DATA',
    migrated: false,
    targetTable: 'dwd_bh_blacklist_check_detail',
    sampleTable: 'ods_ext_blacklist_sample', archiveOwner: '刘洋', dataManager: '陈静',
    frameworkAgreements: [], totalSupplementAmount: 0,
  },
  {
    id: 'PD_LOCATION_RISK', productCode: 'PD_LOCATION_RISK', code: 'ED-009', name: '位置风险评估',
    cooperationOrg: '朴道', supplier: '字节', status: 'online',
    interfaceStatus: 'online',
    createdAt: '2026-03-25T09:00:00.000Z', onlineTime: '2026-04-15T09:00:00.000Z', usageScene: '贷中监控',
    billingMode: 'per_call', unitPrice: 7, billingCycle: 'month', currency: 'CNY',
    effectiveDate: '2026-03-01T00:00:00.000Z', expireDate: '2027-02-28T00:00:00.000Z',
    tags: ['外数', '风控'], monitorStatus: '正常', interfaceNo: 'IF-0009', evaluationScore: 73,
    externalDataType: '外数离线回溯申请', productCategory: 'DATA',
    migrated: false,
    targetTable: 'dwd_pd_location_risk_detail',
    sampleTable: 'ods_ext_location_sample', archiveOwner: '待补充', dataManager: '赵磊',
    frameworkAgreements: [], totalSupplementAmount: 0,
  },
  {
    id: 'PD_DEVICE_FINGERPRINT', productCode: 'PD_DEVICE_FINGERPRINT', code: 'ED-010', name: '设备指纹分析',
    cooperationOrg: '朴道', supplier: '字节', status: 'online',
    interfaceStatus: 'online',
    createdAt: '2026-05-11T09:00:00.000Z', onlineTime: '2026-06-01T09:00:00.000Z', usageScene: '贷前评分',
    billingMode: 'per_call', unitPrice: 5, billingCycle: 'month', currency: 'CNY',
    effectiveDate: '2026-05-01T00:00:00.000Z', expireDate: '2027-04-30T00:00:00.000Z',
    tags: ['外数', '风控'], monitorStatus: '正常', interfaceNo: 'IF-0010', evaluationScore: 90,
    externalDataType: '在线实时调用', productCategory: 'DATA',
    migrated: false,
    targetTable: 'dwd_pd_device_fingerprint_detail',
    archiveOwner: '陈静', dataManager: '待补充', frameworkAgreements: [], totalSupplementAmount: 0,
  },
  {
    id: 'PD_IP_RISK', productCode: 'PD_IP_RISK', code: 'ED-011', name: 'IP风险识别',
    cooperationOrg: '朴道', supplier: '字节', status: 'online',
    interfaceStatus: 'online',
    createdAt: '2026-06-08T09:00:00.000Z', onlineTime: '2026-06-26T09:00:00.000Z', usageScene: '贷中监控',
    billingMode: 'per_call', unitPrice: 3, billingCycle: 'month', currency: 'CNY',
    effectiveDate: '2026-06-01T00:00:00.000Z', expireDate: '2027-05-31T00:00:00.000Z',
    tags: ['外数', '风控'], monitorStatus: '正常', interfaceNo: 'IF-0011', evaluationScore: 68,
    externalDataType: '在线实时调用', productCategory: 'DATA',
    migrated: false,
    targetTable: 'dwd_pd_ip_risk_detail',
    sampleTable: 'ods_ext_ip_sample', archiveOwner: '刘洋', dataManager: '刘洋',
    frameworkAgreements: [], totalSupplementAmount: 0,
  },
  {
    id: 'PD_BEHAVIOR_RISK', productCode: 'PD_BEHAVIOR_RISK', code: 'ED-012', name: '行为风险分析',
    cooperationOrg: '朴道', supplier: '字节', status: 'online',
    interfaceStatus: 'online',
    createdAt: '2026-07-03T09:00:00.000Z', onlineTime: '2026-07-28T09:00:00.000Z', usageScene: '贷中监控',
    billingMode: 'per_call', unitPrice: 9, billingCycle: 'month', currency: 'CNY',
    effectiveDate: '2026-07-01T00:00:00.000Z', expireDate: '2027-06-30T00:00:00.000Z',
    tags: ['外数', '风控'], monitorStatus: '正常', interfaceNo: 'IF-0012', evaluationScore: 84,
    externalDataType: '在线批量调用', productCategory: 'DATA',
    migrated: false,
    targetTable: 'dwd_pd_behavior_risk_detail',
    archiveOwner: '陈静', dataManager: '赵磊', frameworkAgreements: [], totalSupplementAmount: 0,
  },
  {
    id: 'BH_CREDIT_QUERY', productCode: 'BH_CREDIT_QUERY', code: 'ED-013', name: '百行征信查询',
    cooperationOrg: '百行', supplier: '京东', status: 'online',
    interfaceStatus: 'online',
    createdAt: '2026-04-28T09:00:00.000Z', onlineTime: '2026-05-20T09:00:00.000Z', usageScene: '贷前评分',
    billingMode: 'per_call', unitPrice: 10, billingCycle: 'month', currency: 'CNY',
    effectiveDate: '2026-04-01T00:00:00.000Z', expireDate: '2027-03-31T00:00:00.000Z',
    tags: ['外数', '风控', '核心'], monitorStatus: '正常', interfaceNo: 'IF-0013', evaluationScore: 93,
    externalDataType: '外数离线回溯申请', productCategory: 'DATA',
    migrated: true, migrationBatch: 'MIG-2026-05',
    targetTable: 'dwd_bh_credit_query_detail',
    sampleTable: 'ods_ext_batch_sample', archiveOwner: '王芳', dataManager: '刘洋',
    frameworkAgreements: [], totalSupplementAmount: 0,
  },
  {
    id: 'BH_MULTI_QUERY', productCode: 'BH_MULTI_QUERY', code: 'ED-014', name: '多维征信查询',
    cooperationOrg: '百行', supplier: '京东', status: 'online',
    interfaceStatus: 'online',
    createdAt: '2026-05-30T09:00:00.000Z', onlineTime: '2026-06-18T09:00:00.000Z', usageScene: '贷前评分',
    billingMode: 'per_call', unitPrice: 6, billingCycle: 'month', currency: 'CNY',
    effectiveDate: '2026-05-01T00:00:00.000Z', expireDate: '2027-04-30T00:00:00.000Z',
    tags: ['外数', '风控'], monitorStatus: '正常', interfaceNo: 'IF-0014', evaluationScore: 81,
    externalDataType: '外数离线回溯申请', productCategory: 'DATA',
    migrated: false,
    targetTable: 'dwd_bh_multi_query_detail',
    sampleTable: 'ods_ext_batch_sample', archiveOwner: '王芳', dataManager: '刘洋',
    frameworkAgreements: [], totalSupplementAmount: 0,
  },
  {
    id: 'XUEXIN_BATCH_STATUS', productCode: 'XUEXIN_BATCH_STATUS', code: 'ED-016', name: '在学状态批量核验',
    cooperationOrg: '其他', supplier: '学信网', status: 'online',
    interfaceStatus: 'online',
    createdAt: '2026-08-20T09:00:00.000Z', onlineTime: '2026-09-10T09:00:00.000Z', usageScene: '贷中监控',
    billingMode: 'per_call', unitPrice: 2, billingCycle: 'month', currency: 'CNY',
    effectiveDate: '2026-08-01T00:00:00.000Z', expireDate: '2027-07-31T00:00:00.000Z',
    tags: ['外数', '风控', '批量'], monitorStatus: '正常', interfaceNo: 'IF-0016', evaluationScore: 74,
    externalDataType: '离线批量调用', productCategory: 'DATA',
    migrated: false,
    targetTable: 'dwd_xuexin_batch_status_detail',
    sampleTable: 'ods_ext_batch_sample', archiveOwner: '赵磊', dataManager: '赵磊',
    frameworkAgreements: [], totalSupplementAmount: 0,
  },
  // 上数金科（SHGJ）：按 R09 直接登记为合作机构本体，与回溯落库「上海数据集团-工商司法信息回溯」对应
  {
    id: 'SHGJ_ENTERPRISE_JUDICIAL', productCode: 'SHGJ_ENTERPRISE_JUDICIAL', code: 'ED-021', name: '工商司法信息回溯',
    cooperationOrg: '其他', supplier: '上数金科', status: 'online',
    interfaceStatus: 'online',
    createdAt: '2026-09-25T09:00:00.000Z', onlineTime: '2026-10-15T09:00:00.000Z', usageScene: '贷前评分',
    billingMode: 'per_call', unitPrice: 4, billingCycle: 'month', currency: 'CNY',
    effectiveDate: '2026-09-01T00:00:00.000Z', expireDate: '2027-08-31T00:00:00.000Z',
    tags: ['外数', '风控', '回溯'], monitorStatus: '正常', interfaceNo: 'IF-0021', evaluationScore: 87,
    externalDataType: '外数离线回溯申请', productCategory: 'DATA',
    migrated: false,
    // 回溯型产品的落库目标表＝mock/hiveTables.ts 登记的机构标准表（向导只能从该表清单里选）
    targetTable: 'dw_ods.ods_ext_shgj_retro_std',
    // 回溯返回文件的列即本档案出参（与回溯向导共用同一份字段口径，不再各维护一份）
    inputParams: [
      { name: 'request_id', type: 'string', required: true, description: '请求ID', isElement: true },
      { name: 'company_name', type: 'string', required: true, description: '企业名称', isElement: true },
    ],
    outputParams: [
      { name: 'id_md5', type: 'string', required: true, description: '主体标识（MD5加密）' },
      { name: 'enterprise_risk_score', type: 'int', required: false, description: '企业风险评分' },
      { name: 'legal_case_cnt', type: 'int', required: false, description: '涉诉案件数' },
      { name: 'tax_arrear_flag', type: 'string', required: false, description: '欠税标识' },
      { name: 'review_data', type: 'string', required: true, description: '回溯日期' },
    ],
    sampleTable: 'ods_ext_shgj_sample', archiveOwner: '陈静', dataManager: '陈静',
    frameworkAgreements: [], totalSupplementAmount: 0,
  },
  // 钱塘征信三条（2026-11-03 建档）：此前 QT_* 只存在于 supplierProducts 与定价档案，档案侧一条没有，
  // 导致合作机构四档里的「钱塘」是空头档位（一致性守卫 G2 长期警告）。
  // 条数与 budget 侧 C004「钱塘征信框架协议」的 productCount=3 对齐，产品名与 supplierProducts 同源。
  // 供应商轴记「其他」：这三条是持牌机构自营出数，实际供数厂商业务侧尚未登记，
  // 不得拿钱塘自己冒充供应商（持牌方是合规通道，不是供数厂商，口径见 orgDictionaries 文件头）。
  {
    id: 'QT_CREDIT_RISK_SCORE', productCode: 'QT_CREDIT_RISK_SCORE', code: 'ED-022', name: '钱塘个人信用风险评分',
    cooperationOrg: '钱塘', supplier: '其他', status: 'online',
    interfaceStatus: 'online',
    createdAt: '2026-10-08T09:00:00.000Z', onlineTime: '2026-10-28T09:00:00.000Z', usageScene: '贷前评分',
    billingMode: 'per_call', unitPrice: 7, billingCycle: 'month', currency: 'CNY',
    effectiveDate: '2026-10-01T00:00:00.000Z', expireDate: '2027-09-30T00:00:00.000Z',
    tags: ['外数', '风控', '评分'], monitorStatus: '正常', interfaceNo: 'IF-0022', evaluationScore: 89,
    externalDataType: '在线实时调用', productCategory: 'DATA',
    migrated: false, archiveOwner: '陈静', dataManager: '刘洋',
    frameworkAgreements: [], totalSupplementAmount: 0,
  },
  {
    id: 'QT_FRAUD_BLACKLIST', productCode: 'QT_FRAUD_BLACKLIST', code: 'ED-023', name: '钱塘反欺诈黑名单核验',
    cooperationOrg: '钱塘', supplier: '其他', status: 'online',
    interfaceStatus: 'online',
    createdAt: '2026-10-08T09:30:00.000Z', onlineTime: '2026-10-28T09:00:00.000Z', usageScene: '贷前反欺诈',
    billingMode: 'per_call', unitPrice: 5, billingCycle: 'month', currency: 'CNY',
    effectiveDate: '2026-10-01T00:00:00.000Z', expireDate: '2027-09-30T00:00:00.000Z',
    tags: ['外数', '反欺诈', '黑名单'], monitorStatus: '正常', interfaceNo: 'IF-0023', evaluationScore: 92,
    externalDataType: '在线实时调用', productCategory: 'DATA',
    migrated: false, archiveOwner: '陈静', dataManager: '刘洋',
    frameworkAgreements: [], totalSupplementAmount: 0,
  },
  {
    id: 'QT_ENTERPRISE_TAX_INVOICE', productCode: 'QT_ENTERPRISE_TAX_INVOICE', code: 'ED-024', name: '企业税务发票画像',
    cooperationOrg: '钱塘', supplier: '其他', status: 'online',
    interfaceStatus: 'online',
    createdAt: '2026-10-15T09:00:00.000Z', onlineTime: '2026-11-05T09:00:00.000Z', usageScene: '贷前企业准入',
    billingMode: 'per_call', unitPrice: 12, billingCycle: 'month', currency: 'CNY',
    effectiveDate: '2026-10-20T00:00:00.000Z', expireDate: '2027-10-19T00:00:00.000Z',
    tags: ['外数', '企业', '税务'], monitorStatus: '正常', interfaceNo: 'IF-0024', evaluationScore: 85,
    externalDataType: '在线批量调用', productCategory: 'DATA',
    migrated: false,
    targetTable: 'dwd_qt_enterprise_tax_invoice_detail',
    sampleTable: 'ods_ext_qt_sample', archiveOwner: '陈静', dataManager: '刘洋',
    frameworkAgreements: [], totalSupplementAmount: 0,
  },
]

/** localStorage 键：档案产品的人工编辑/新建副本 */
// v2→v3：2026-11-03 档案做了两轴改造（删 channel 字段、合作机构改四档简称、原渠道值并入供应商），
// 旧副本存的是旧轴字段，直接过滤掉会造成「代码改了界面不变」且无法自动纠正，故换键丢弃旧副本。
const ARCHIVE_PRODUCTS_KEY = 'externalData.archive.products.v3'

/**
 * 人工副本只存**字段补丁**（改了什么存什么），不存整条快照：
 * 若存全量，后续调整种子时旧副本会整条盖住新种子值，造成“代码改了界面不变”。
 */
type ProductPatch = Partial<ArchiveProduct> & { id: string }

function safeParse(raw: string | null): any {
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function readOverlay(): Record<string, ProductPatch> {
  const data = safeParse(localStorage.getItem(ARCHIVE_PRODUCTS_KEY))
  if (data && typeof data === 'object' && !Array.isArray(data)) return data as Record<string, ProductPatch>
  // 兼容早期版本存为数组的副本
  if (Array.isArray(data)) {
    const map: Record<string, ProductPatch> = {}
    data.forEach((p: any) => { if (p && p.id) map[String(p.id)] = p })
    return map
  }
  return {}
}

function writeOverlay(map: Record<string, ProductPatch>) {
  localStorage.setItem(ARCHIVE_PRODUCTS_KEY, JSON.stringify(map))
}

/**
 * 全量产品 = 种子 + 人工补丁叠加，并回填派生只读位 mappingConfigured
 * 同 id 只覆盖副本中出现过的字段（保留种子其余字段），新建产品追加在列表末尾，
 * 种子原有顺序不变，保证列表可复现。
 */
function withDerivedFlags(p: ArchiveProduct): ArchiveProduct {
  // 映射是否已配置只问映射模块的登记处，人工副本里即使存着旧值也以登记结果为准
  return { ...p, mappingConfigured: isMappingConfigured(String(p.id)) }
}

export function loadArchiveProducts(): ArchiveProduct[] {
  const overlay = readOverlay()
  const keys = Object.keys(overlay)
  if (!keys.length) return seedArchiveProducts.map((p) => withDerivedFlags(p))
  const seedIds = new Set(seedArchiveProducts.map((p) => String(p.id)))
  const merged = seedArchiveProducts.map((seed) => {
    const patch = overlay[String(seed.id)]
    return withDerivedFlags(patch ? ({ ...seed, ...patch } as ArchiveProduct) : { ...seed })
  })
  const created = keys.filter((k) => !seedIds.has(k)).map((k) => withDerivedFlags(overlay[k] as ArchiveProduct))
  return [...merged, ...created]
}

/** 按业务主键取单个产品 */
export function getArchiveProduct(id: string): ArchiveProduct | undefined {
  return loadArchiveProducts().find((p) => String(p.id) === String(id))
}

/**
 * 新建时的字段默认值
 * 单独成函数是为了不把十几个兜底分支堆在主写入流程里（可维护性，也避开 eslint complexity）；
 * 这些默认值只在「真正新建」时补齐，编辑路径不走这里。
 */
function createdDefaults(
  payload: Partial<ArchiveProduct> & { id: string },
  seqNo: number,
  stamp: string
): Partial<ArchiveProduct> {
  return {
    productCode: payload.productCode || payload.id,
    code: payload.code || `ED-${String(seqNo).padStart(3, '0')}`,
    tags: payload.tags || ['外数', '风控'],
    billingCycle: payload.billingCycle || 'month',
    currency: payload.currency || 'CNY',
    effectiveDate: payload.effectiveDate || stamp,
    expireDate: payload.expireDate || new Date(Date.now() + 365 * 86400000).toISOString(),
    monitorStatus: payload.monitorStatus || '—',
    migrated: payload.migrated ?? false,
    frameworkAgreements: payload.frameworkAgreements || [],
    totalSupplementAmount: payload.totalSupplementAmount || 0,
    createdAt: payload.createdAt || stamp,
  }
}

/**
 * 唯一写入点：新建或按 id 覆盖更新
 * 编辑时仅合并传入字段，updatedAt/updatedBy 由本函数统一打点。
 * status 发生变化时自动追加 statusHistory 留痕，避免各处页面自己拼变更记录。
 * mappingConfigured 是派生只读位（owner 在映射模块），调用方传入的一律丢弃，避免回归双写。
 */
export function upsertArchiveProduct(
  payload: Partial<ArchiveProduct> & { id: string },
  reason = '人工编辑档案'
): ArchiveProduct {
  const input: Partial<ArchiveProduct> & { id: string } = { ...payload }
  // mappingConfigured 是 readonly 派生位，delete 作用于 { ...payload } 副本（runtime 无碍），
  // 这里仅在编译期把该键放宽为可写，避免 TS2704。
  delete (input as { mappingConfigured?: boolean }).mappingConfigured
  const all = loadArchiveProducts()
  const idx = all.findIndex((p) => String(p.id) === String(input.id))
  const stamp = new Date().toISOString()
  const overlay = readOverlay()
  if (idx >= 0) {
    const prev = all[idx]
    const next: ArchiveProduct = { ...prev, ...input, updatedAt: stamp, updatedBy: 'admin' }
    if (input.status && input.status !== prev.status) {
      next.statusHistory = [...(prev.statusHistory || []), { from: prev.status, to: input.status, reason, at: stamp, by: 'admin' }]
    }
    // 只累加本次改过的字段，不写回全量
    overlay[String(prev.id)] = { ...overlay[String(prev.id)], ...input, updatedAt: stamp, updatedBy: 'admin' }
    if (next.statusHistory) overlay[String(prev.id)] = { ...overlay[String(prev.id)], statusHistory: next.statusHistory }
    writeOverlay(overlay)
    return withDerivedFlags(next)
  }
  const seed = seedArchiveProducts.find((p) => String(p.id) === String(input.id))
  const initStatus: ArchiveStatus = input.status || 'importing'
  const created: ArchiveProduct = {
    ...(seed ?? ({} as ArchiveProduct)),
    ...input,
    ...createdDefaults(input, all.length + 1, stamp),
    id: input.id,
    status: initStatus,
    updatedAt: stamp,
    updatedBy: 'admin',
    statusHistory: [{ to: initStatus, reason: '档案新建', at: stamp, by: 'admin' }],
  }
  overlay[String(created.id)] = created
  writeOverlay(overlay)
  return withDerivedFlags(created)
}

/** 清除人工副本，回到内置种子（供演示重置与测试用例复位使用） */
export function resetArchiveProducts() {
  localStorage.removeItem(ARCHIVE_PRODUCTS_KEY)
}

/**
 * 由业务事件推导「应处于的状态」——需求文档 R129 要求六大状态由事件写入、不开放人工任意改。
 * 本函数只负责「技术档案是否齐备」这一段可静态判定的规则，
 * 引入中→待评估→已上线等跨模块事件（评估结论、上线审批）后续接同一入口扩展。
 * @returns 若产品当前状态与技术档案齐备度矛盾，返回应切换的状态；否则返回 undefined
 */
export function deriveTechProfileStatus(p: ArchiveProduct): ArchiveStatus | undefined {
  // 非批量/回溯型没有落库环节，不参与「待完善技术档案」判定
  if (!isPersistedType(p.externalDataType)) return undefined
  const complete = Boolean(p.interfaceNo) && Boolean(p.mappingConfigured) && Boolean(p.targetTable)
  if (p.status === 'pending_tech_profile' && complete) return 'online'
  if (p.status === 'online' && !complete) return 'pending_tech_profile'
  return undefined
}
