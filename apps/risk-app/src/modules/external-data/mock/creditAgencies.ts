/**
 * 征信机构管理 · Mock 数据源
 * 需求文档《外数文件落库》模块一 A1/A2（R01-R10）
 *
 * 数据来源说明：
 *   1. 机构主体（agencyCode / agencyName / 联系人）派生自
 *      modules/budget/api/supplierDictionary.ts 的 suppliersMock（SUP-002 百行、SUP-003 朴道、
 *      SUP-004 钱塘、SUP-005 上海数据集团、SUP-006 厦门信息集团、SUP-012 人行征信中心）；
 *   2. SFTP 连接参数、路径管理策略为文档 R04/R07 新增字段，无历史来源，按业务约定构造；
 *   3. 文档 4.1「仅纳入持牌机构及已完成备案的企业征信机构」→ 机构类型只保留个人征信 / 企业征信两类。
 *
 * 本文件充当「内存数据库」，供 api/creditAgency.ts 在 VITE_USE_MOCK=true 时短路调用。
 */

/** 机构类型（R02） */
export type AgencyType = '个人征信' | '企业征信'

/** 机构状态（R06：停用后业务场景不可选，仅置灰） */
export type AgencyStatus = '启用' | '停用'

/** 路径管理策略（R07：钱塘等机构定期自动清理历史路径文件） */
export type PathStrategy = 'fixed' | 'auto_clean'

/** SFTP 连接配置（R04：IP、端口、用户名、密码、目录路径均为必填） */
export interface AgencySftpConfig {
  host: string
  port: number
  username: string
  password: string
  /** SFTP 目录路径，末尾自动补 '/'（R14） */
  directory: string
}

/** 征信机构主数据 */
export interface CreditAgency {
  id: string
  /** 机构编码（R01 唯一，R08 创建后锁定不可改） */
  agencyCode: string
  agencyName: string
  agencyType: AgencyType
  /** 牌照 / 备案编号（R03 资质信息登记） */
  licenseNo: string
  status: AgencyStatus
  pathStrategy: PathStrategy
  /** 路径策略说明，前端在选择机构时展示提醒文案（R15） */
  pathStrategyDesc: string
  sftp: AgencySftpConfig
  contactPerson: string
  contactPhone: string
  remark: string
  createdAt: string
  updatedAt: string
  createdBy: string
  updatedBy: string
}

const now = '2026-10-20 09:00:00'

/** 征信机构初始枚举（6 家：5 启用 + 1 停用，用于验证 R06 停用约束） */
const creditAgenciesMock: CreditAgency[] = [
  {
    id: 'AG-001',
    agencyCode: 'BH',
    agencyName: '百行征信有限公司',
    agencyType: '个人征信',
    licenseNo: 'JC证-JXKP-2023-0001',
    status: '启用',
    pathStrategy: 'fixed',
    pathStrategyDesc: '返回文件固定保存在 download 目录，历史文件不会自动清理',
    sftp: { host: '10.21.8.31', port: 22, username: 'bh_sftp', password: '****', directory: '/sftp/external_retro/baihang/download/' },
    contactPerson: '张明',
    contactPhone: '021-98765432',
    remark: '多头借贷类回溯数据主要来源',
    createdAt: now,
    updatedAt: now,
    createdBy: 'admin',
    updatedBy: 'admin',
  },
  {
    id: 'AG-002',
    agencyCode: 'PD',
    agencyName: '朴道征信有限公司',
    agencyType: '个人征信',
    licenseNo: 'JC证-JXKP-2022-0037',
    status: '启用',
    pathStrategy: 'fixed',
    pathStrategyDesc: '返回文件固定保存在 download 目录，历史文件不会自动清理',
    sftp: { host: '10.21.8.42', port: 22, username: 'pd_sftp', password: '****', directory: '/sftp/external_retro/pudao/download/' },
    contactPerson: '李慧',
    contactPhone: '0755-11223344',
    remark: '逾期明细类回溯数据来源',
    createdAt: now,
    updatedAt: now,
    createdBy: 'admin',
    updatedBy: 'admin',
  },
  {
    id: 'AG-003',
    agencyCode: 'QT',
    agencyName: '钱塘征信有限公司',
    agencyType: '个人征信',
    licenseNo: 'JC证-JXKP-2021-0089',
    status: '启用',
    pathStrategy: 'auto_clean',
    pathStrategyDesc: '会定期自动清理历史路径文件，请及时处理最新返回文件',
    sftp: { host: '10.21.8.57', port: 22, username: 'qt_sftp', password: '****', directory: '/sftp/external_retro/qiantang/download/' },
    contactPerson: '王强',
    contactPhone: '0571-55667788',
    remark: '授信评分回溯数据来源；解密密钥随机生成，需线下向渠道对接方获取',
    createdAt: now,
    updatedAt: now,
    createdBy: 'admin',
    updatedBy: 'admin',
  },
  {
    id: 'AG-004',
    agencyCode: 'PBC',
    agencyName: '中国人民银行征信中心',
    agencyType: '个人征信',
    licenseNo: '央行征信中心（国家级）',
    status: '启用',
    pathStrategy: 'fixed',
    pathStrategyDesc: '返回文件固定保存在 download 目录，历史文件不会自动清理',
    sftp: { host: '10.21.8.61', port: 22, username: 'pbcc_sftp', password: '****', directory: '/sftp/external_retro/pbcc/download/' },
    contactPerson: '刘敏',
    contactPhone: '010-62345678',
    remark: '公共基础征信信息来源',
    createdAt: now,
    updatedAt: now,
    createdBy: 'admin',
    updatedBy: 'admin',
  },
  {
    id: 'AG-005',
    agencyCode: 'SHGJ',
    agencyName: '上海数据集团金融科技有限公司',
    agencyType: '企业征信',
    licenseNo: '沪ICP备备案-2020-1145',
    status: '启用',
    pathStrategy: 'fixed',
    pathStrategyDesc: '返回文件固定保存在 download 目录，历史文件不会自动清理',
    sftp: { host: '10.21.8.73', port: 22, username: 'shgj_sftp', password: '****', directory: '/sftp/external_retro/shgj/download/' },
    contactPerson: '陈昊',
    contactPhone: '021-55667788',
    remark: '企业类外数数据来源',
    createdAt: now,
    updatedAt: now,
    createdBy: 'admin',
    updatedBy: 'admin',
  },
  {
    id: 'AG-006',
    agencyCode: 'XMXX',
    agencyName: '厦门信息集团大数据运营有限公司',
    agencyType: '企业征信',
    licenseNo: '厦ICP备备案-2019-0822',
    status: '停用',
    pathStrategy: 'auto_clean',
    pathStrategyDesc: '会定期自动清理历史路径文件，请及时处理最新返回文件',
    sftp: { host: '10.21.8.88', port: 22, username: 'xmxx_sftp', password: '****', directory: '/sftp/external_retro/xmxx/download/' },
    contactPerson: '赵磊',
    contactPhone: '0592-22334455',
    remark: '合作到期已停用；已有落库记录保留机构信息快照（R10）',
    createdAt: now,
    updatedAt: '2026-09-30 16:20:00',
    createdBy: 'admin',
    updatedBy: 'admin',
  },
]

/** 查询征信机构列表（支持机构名称/类型/状态过滤） */
export async function listCreditAgencies(params?: { keyword?: string; agencyType?: string; status?: string }) {
  const keyword = params?.keyword?.trim()
  return creditAgenciesMock.filter((a) => {
    if (keyword && !a.agencyName.includes(keyword) && !a.agencyCode.includes(keyword)) return false
    if (params?.agencyType && a.agencyType !== params.agencyType) return false
    if (params?.status && a.status !== params.status) return false
    return true
  })
}

/** 查询单个机构 */
export async function getCreditAgency(id: string) {
  return creditAgenciesMock.find((a) => a.id === id)
}

/** 新增机构（R01 编码唯一校验 / R05 需先通过连接测试） */
export async function createCreditAgency(payload: Partial<CreditAgency>) {
  if (creditAgenciesMock.some((a) => a.agencyCode === payload.agencyCode)) {
    throw new Error(`机构编码 ${payload.agencyCode} 已存在，请更换（R01 机构编码唯一）`)
  }
  const item: CreditAgency = {
    id: `AG-${String(creditAgenciesMock.length + 1).padStart(3, '0')}`,
    agencyCode: payload.agencyCode || '',
    agencyName: payload.agencyName || '',
    agencyType: payload.agencyType || '个人征信',
    licenseNo: payload.licenseNo || '',
    status: payload.status || '启用',
    pathStrategy: payload.pathStrategy || 'fixed',
    pathStrategyDesc: payload.pathStrategy === 'auto_clean' ? '会定期自动清理历史路径文件，请及时处理最新返回文件' : '返回文件固定保存在 download 目录，历史文件不会自动清理',
    sftp: payload.sftp || { host: '', port: 22, username: '', password: '', directory: '' },
    contactPerson: payload.contactPerson || '',
    contactPhone: payload.contactPhone || '',
    remark: payload.remark || '',
    createdAt: now,
    updatedAt: now,
    createdBy: 'admin',
    updatedBy: 'admin',
  }
  creditAgenciesMock.unshift(item)
  return item
}

/** 编辑机构（R08 机构编码不可修改；R10 不影响历史落库记录） */
export async function updateCreditAgency(id: string, payload: Partial<CreditAgency>) {
  const idx = creditAgenciesMock.findIndex((a) => a.id === id)
  if (idx < 0) throw new Error('机构不存在')
  const prev = creditAgenciesMock[idx]
  // R08：机构编码创建后锁定，忽略外部传入的编码变更
  const next: CreditAgency = { ...prev, ...payload, agencyCode: prev.agencyCode, updatedAt: now, updatedBy: 'admin' }
  creditAgenciesMock.splice(idx, 1, next)
  return next
}

/**
 * SFTP 连接测试（R05 / R09 保存前必须通过）
 * mock 实现：按主机名规则模拟三类失败场景，便于演示 E1 异常提示
 */
export async function testAgencySftpConnection(payload: Partial<AgencySftpConfig>) {
  const host = (payload.host || '').trim()
  const port = payload.port || 22
  const directory = (payload.directory || '').trim()
  if (!host) throw new Error('SFTP 连接测试失败：IP 不能为空（E3 必填字段缺失）')
  if (!payload.username) throw new Error('SFTP 连接测试失败：用户名不能为空（E3 必填字段缺失）')
  if (!payload.password) throw new Error('SFTP 连接测试失败：密码 / 密钥不能为空（E3 必填字段缺失）')
  if (!directory) throw new Error('SFTP 连接测试失败：目录路径不能为空（E3 必填字段缺失）')
  // 演示用：10.21.8.99 模拟认证失败，10.21.8.98 模拟超时，其余正常
  if (host.endsWith('.99')) throw new Error('SFTP 连接测试失败：认证失败，请检查用户名与密码（E1）')
  if (host.endsWith('.98')) throw new Error('SFTP 连接测试失败：连接超时（>30s），请检查网络与端口（E1）')
  if (port < 1 || port > 65535) throw new Error('SFTP 连接测试失败：端口号非法（E1）')
  return { success: true, message: `连接成功：${host}:${port}，目录 ${directory} 可读写` }
}

/** 获取可用（启用）机构列表（R11 仅显示启用机构） */
export async function getEnabledAgencies() {
  return creditAgenciesMock.filter((a) => a.status === '启用')
}

/** 获取全部机构（含停用，供征信机构管理列表展示） */
export async function getAllAgencies() {
  return [...creditAgenciesMock]
}
