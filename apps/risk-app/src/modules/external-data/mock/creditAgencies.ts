/**
 * 合作机构主数据 · Mock 数据源
 * 需求文档《外数文件落库》模块一 A1/A2（R01-R10）+ 《外数档案》R09（机构术语与名单口径）
 *
 * 术语口径（R09）：对外统一称「合作机构」，全文不再使用「征信机构」表述；
 * 本模块的**代码标识符**（CreditAgency / creditAgencies.ts / 路由 path）为历史命名，保留不改，
 * 以免影响已接的 56 处引用；用户可见文案已全部改为「合作机构」。
 *
 * 数据来源说明：
 *   1. 机构名单以 R09 列出的十二家工商登记全称为准（本文件是唯一事实源），
 *      档案的「合作机构」下拉、回溯落库的机构选项都仍从本文件取，不得另写一份常量；
 *   2. SFTP 连接参数、路径管理策略为文档 R04/R07 新增字段，无历史来源，按业务约定构造；
 *   3. 业务上不区分个人征信 / 企业征信，机构主数据不再维护「机构类型」维度（字段已整体下线）。
 *
 * 本文件充当「内存数据库」，供 api/creditAgency.ts 在 VITE_USE_MOCK=true 时短路调用。
 */

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

/** 合作机构主数据 */
export interface CreditAgency {
  id: string
  /** 机构编码（R01 唯一，R08 创建后锁定不可改） */
  agencyCode: string
  agencyName: string
  /** 社会统一征信编号（R03 资质信息登记，字段名沿用 licenseNo） */
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

/** 合作机构初始枚举（R09 十二家：10 启用 + 2 停用，用于验证 R06 停用约束） */
export const creditAgenciesMock: CreditAgency[] = [
  {
    id: 'AG-001',
    agencyCode: 'BH',
    agencyName: '百行征信有限公司',
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
    /**
     * 上海数据集团金融科技有限公司（上数金科）在 R09 口径下就是「合作机构」本体，
     * 档案直接落在 cooperationOrg（旧版本错放在 partnerOrg、并将征信档位记「其他」，已修正）。
     */
    agencyCode: 'SHGJ',
    agencyName: '上海数据集团金融科技有限公司',
    licenseNo: '沪ICP备备案-2020-1145',
    status: '启用',
    pathStrategy: 'fixed',
    pathStrategyDesc: '返回文件固定保存在 download 目录，历史文件不会自动清理',
    sftp: { host: '10.21.8.73', port: 22, username: 'shgj_sftp', password: '****', directory: '/sftp/external_retro/shgj/download/' },
    contactPerson: '陈昊',
    contactPhone: '021-55667788',
    remark: '上数金科外数数据来源',
    createdAt: now,
    updatedAt: now,
    createdBy: 'admin',
    updatedBy: 'admin',
  },
  {
    id: 'AG-006',
    agencyCode: 'XMXX',
    agencyName: '厦门信息集团大数据运营有限公司',
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
  {
    id: 'AG-007',
    agencyCode: 'ZGBX',
    agencyName: '中国银行保险信息技术管理有限公司',
    licenseNo: '银保信-JXKP-2021-0006',
    status: '启用',
    pathStrategy: 'fixed',
    pathStrategyDesc: '返回文件固定保存在 download 目录，历史文件不会自动清理',
    sftp: { host: '10.21.8.91', port: 22, username: 'zgbx_sftp', password: '****', directory: '/sftp/external_retro/zgbx/download/' },
    contactPerson: '吴静',
    contactPhone: '010-88990011',
    remark: '银保行业共享平台数据来源',
    createdAt: now,
    updatedAt: now,
    createdBy: 'admin',
    updatedBy: 'admin',
  },
  {
    id: 'AG-008',
    agencyCode: 'RQN',
    agencyName: '北京融七牛信息技术有限公司',
    licenseNo: '京ICP备备案-2018-3311',
    status: '启用',
    pathStrategy: 'auto_clean',
    pathStrategyDesc: '会定期自动清理历史路径文件，请及时处理最新返回文件',
    sftp: { host: '10.21.8.92', port: 22, username: 'rqn_sftp', password: '****', directory: '/sftp/external_retro/rqn/download/' },
    contactPerson: '孙倩',
    contactPhone: '010-77889900',
    remark: '多头与行为类特征数据',
    createdAt: now,
    updatedAt: now,
    createdBy: 'admin',
    updatedBy: 'admin',
  },
  {
    id: 'AG-009',
    agencyCode: 'SHLX',
    agencyName: '上海理想信息（集团）有限公司',
    licenseNo: '沪ICP备备案-2017-2208',
    status: '启用',
    pathStrategy: 'fixed',
    pathStrategyDesc: '返回文件固定保存在 download 目录，历史文件不会自动清理',
    sftp: { host: '10.21.8.93', port: 22, username: 'shlx_sftp', password: '****', directory: '/sftp/external_retro/shlx/download/' },
    contactPerson: '郑爱丽',
    contactPhone: '021-66778899',
    remark: '运营商与位置类数据',
    createdAt: now,
    updatedAt: now,
    createdBy: 'admin',
    updatedBy: 'admin',
  },
  {
    id: 'AG-010',
    agencyCode: 'BJYD',
    agencyName: '北京移动系统集成有限公司',
    licenseNo: '京ICP备备案-2019-4507',
    status: '停用',
    pathStrategy: 'auto_clean',
    pathStrategyDesc: '会定期自动清理历史路径文件，请及时处理最新返回文件',
    sftp: { host: '10.21.8.94', port: 22, username: 'bjyd_sftp', password: '****', directory: '/sftp/external_retro/bjyd/download/' },
    contactPerson: '冯洋',
    contactPhone: '010-55667788',
    remark: '在网时长核验合作已到期',
    createdAt: now,
    updatedAt: '2026-08-31 10:00:00',
    createdBy: 'admin',
    updatedBy: 'admin',
  },
  {
    id: 'AG-011',
    agencyCode: 'YLJZ',
    agencyName: '原力金智（北京）科技有限公司',
    licenseNo: '京ICP备备案-2022-6120',
    status: '启用',
    pathStrategy: 'fixed',
    pathStrategyDesc: '返回文件固定保存在 download 目录，历史文件不会自动清理',
    sftp: { host: '10.21.8.95', port: 22, username: 'yljz_sftp', password: '****', directory: '/sftp/external_retro/yljz/download/' },
    contactPerson: '许岚',
    contactPhone: '010-44556677',
    remark: '模型分与风险评级类数据',
    createdAt: now,
    updatedAt: now,
    createdBy: 'admin',
    updatedBy: 'admin',
  },
  {
    id: 'AG-012',
    /**
     * R09：学信网为网站名，运营主体为教育部学生服务与素质发展中心；
     * 枚举展示沿用网站名，运营主体在备注标明。agencyCode 取 XUEXIN，与产品编码前缀 XUEXIN_ 对齐。
     */
    agencyCode: 'XUEXIN',
    agencyName: '中国高等教育学生信息网（学信网）',
    licenseNo: '教服中心-2016-0001',
    status: '启用',
    pathStrategy: 'fixed',
    pathStrategyDesc: '返回文件固定保存在 download 目录，历史文件不会自动清理',
    sftp: { host: '10.21.8.96', port: 22, username: 'xuexin_sftp', password: '****', directory: '/sftp/external_retro/xuexin/download/' },
    contactPerson: '苗雨',
    contactPhone: '010-62515053',
    remark: '运营主体：教育部学生服务与素质发展中心；学籍/学历核验数据唯一来源',
    createdAt: now,
    updatedAt: now,
    createdBy: 'admin',
    updatedBy: 'admin',
  },
]

/** 查询合作机构列表（支持机构名称/状态过滤） */
export async function listCreditAgencies(params?: { keyword?: string; status?: string }) {
  const keyword = params?.keyword?.trim()
  return creditAgenciesMock.filter((a) => {
    if (keyword && !a.agencyName.includes(keyword) && !a.agencyCode.includes(keyword)) return false
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

/** 获取全部机构（含停用，供合作机构管理列表展示） */
export async function getAllAgencies() {
  return [...creditAgenciesMock]
}
