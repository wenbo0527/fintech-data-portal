/**
 * standard-store —— 数据标准 mock store
 *
 * 2026-08-06 补全:之前引用此文件但实际不存在,导致 standards.vue 启动报 import 错。
 * 现以最小可用实现 + 状态机(draft → pending → published → deprecated)重构。
 *
 * 状态机说明:
 *   draft(草稿) ── submit ──> pending(待审批)
 *   pending(待审批) ── approve ──> published(已发布)
 *   pending(待审批) ── reject ──> draft(打回)
 *   published(已发布) ── deprecate ──> deprecated(已弃用)
 *   deprecated(已弃用) ── restore ──> draft(恢复编辑)
 *
 * 2026-10-13:按行内数据标准口径扩展展示字段
 *   标准编号/主题/一级分类/二级分类/归口管理部门/中文名称/英文全称/英文简称/
 *   词素分析/业务定义/域/数据类型/业务数据类型/长度/精度/是否代码/
 *   标准代码编号/标准代码中文名称/标准来源/标准依据
 *   lineage.ts EnhancedFieldInfo 的 standard 视图由 cnName/enFullName/bizDefinition 映射得到。
 *
 * 2026-10-13(评审对齐):
 *   1. 补 updateTime,支撑「列表默认按最近更新时间倒序」(V1)。
 *   2. 「域」字段统一存标准域编号(如 AMT_18_2),与 DomainStore 编码一致,
 *      使 R03/R04 跳转与 R10 引用清单可自动成立;故意保留 1 个不存在的域编号
 *      (CODE_LOAN_FIVE)与 1 个不存在的标准代码编号,用于演示「目标不存在 → 置灰」。
 *   3. 新增 DomainStore / StdCodeStore / WordStore:原先散落在三个页面里的内联 mock
 *      上收为唯一数据源,页面只读展示,写操作统一走全量上传(replaceAll = 覆盖式更新 U2)。
 *
 * 上线后:把下列 mutator 替换为 HTTP 调用即可,业务方不感知。
 */
import { ref, computed } from 'vue'

export type StandardStatus = 'draft' | 'pending' | 'published' | 'deprecated'

export interface AppliedField {
  fullPath: string
  sample: string
  compliant: boolean
}

export interface Standard {
  code: string
  name: string
  category: string
  dataType: string
  length: number
  scale?: number
  owner: string
  complianceRate: number
  definition: string
  valueRange: string
  example: string
  tags?: string[]
  status: StandardStatus
  history: Array<{ ts: string; actor: string; action: string; from: StandardStatus; to: StandardStatus }>
  appliedFields?: AppliedField[]

  // ==== 2026-10-13 数据标准展示口径(与 lineage.ts 视图字段对齐) ====
  /** 标准编号 */
  standardNo?: string
  /** 主题 */
  theme?: string
  /** 一级分类 */
  categoryL1?: string
  /** 二级分类 */
  categoryL2?: string
  /** 归口管理部门 */
  manageDept?: string
  /** 中文名称 */
  cnName?: string
  /** 英文全称 */
  enFullName?: string
  /** 英文简称 */
  enAbbr?: string
  /** 词素分析 */
  morpheme?: string
  /** 业务定义 */
  bizDefinition?: string
  /** 域 */
  domain?: string
  /** 业务数据类型 */
  bizDataType?: string
  /** 精度 */
  precision?: string
  /** 是否代码 */
  isCode?: boolean
  /** 标准代码编号 */
  stdCodeNo?: string
  /** 标准代码中文名称 */
  stdCodeName?: string
  /** 标准来源 */
  stdSource?: string
  /** 标准依据 */
  stdBasis?: string
  /** 最近更新时间(列表默认排序依据 V1) */
  updateTime: string
}

/** 标准域(PRD R08):域编号为唯一键 */
export interface StandardDomain {
  /** 域(编号,如 AMT_18_2) */
  code: string
  /** 域中文名称 */
  name: string
  /** 业务数据类型 */
  businessDataType: string
  /** 逻辑数据类型 */
  logicalDataType: string
  /** 长度 */
  length: number
  /** 精度 */
  precision: number
  /** 是否代码 */
  isCode: boolean
  /** 标准代码编号 */
  stdCodeNo: string
  /** 标准代码中文名称 */
  stdCodeName: string
  /** 域描述 */
  description: string
  /** 最近更新时间 */
  updateTime: string
}

/** 标准代码的单个码值(PRD R16) */
export interface StdCodeItem {
  /** 码值 */
  value: string
  /** 码意 */
  meaning: string
  /** 其他(补充说明) */
  extra?: string
}

/** 标准代码(PRD R13):标准代码为唯一键 */
export interface StandardCodeEntry {
  /** 标准代码 */
  code: string
  /** 代码名称 */
  name: string
  /** 主题 */
  subject: string
  /** 来源:国标 / 行标 / ISO / 行内标准(R15) */
  source: string
  /** 码值枚举 */
  items: StdCodeItem[]
  /** 最近更新时间 */
  updateTime: string
}

/** 标准单词(PRD R20):英文缩写为唯一键 R22 */
export interface StandardWord {
  /** 单词中文名称 */
  chineseName: string
  /** 单词英文名称 */
  englishName: string
  /** 单词英文缩写 */
  abbreviation: string
  /** 同义词(逗号分隔) */
  synonyms: string
  /** 是否为分类词 */
  isClassWord: boolean
  /** 备注 */
  remark: string
  /** 最近更新时间 */
  updateTime: string
}

// ───────────────────────────── 初始数据 ─────────────────────────────
// 2026-10-13: 按"标准编号/主题/一级分类/二级分类/归口管理部门/中文名称/英文全称/
// 英文简称/词素分析/业务定义/域/数据类型/业务数据类型/长度/精度/是否代码/
// 标准代码编号/标准代码中文名称/标准来源/标准依据"口径重写。
// 其中 STD_ID_TYPE / STD_GENDER / STD_CURRENCY 与"标准代码管理"页(codes)编码对应。
const INITIAL: Standard[] = [
  {
    code: 'STD-001', standardNo: 'STD-001',
    name: '客户编号', cnName: '客户编号',
    theme: '客户', categoryL1: '客户信息', categoryL2: '基本信息',
    manageDept: '零售银行部',
    enFullName: 'Customer Identification Number', enAbbr: 'CUST_NO',
    morpheme: 'cust(客户) + no(编号)',
    definition: '标识客户在本行唯一性的编号,客户信息建立时分配,全行共享',
    bizDefinition: '标识客户在本行唯一性的编号,客户信息建立时分配,全行共享',
    domain: 'ID_32', dataType: 'VARCHAR2', bizDataType: '字符型',
    length: 32, precision: '-', scale: undefined,
    isCode: false, stdCodeNo: '-', stdCodeName: '-',
    updateTime: '2026-10-11 09:20:00',
    stdSource: '行内标准', stdBasis: '《核心系统数据字典 V3.2》',
    category: '客户信息', valueRange: '^[0-9]{12}$', example: '620000000001',
    owner: '王运营', complianceRate: 98, tags: ['行内标准', '核心'],
    status: 'published',
    history: [
      { ts: '2025-01-15 10:00', actor: '王运营', action: '创建标准', from: 'draft', to: 'draft' },
      { ts: '2025-01-16 09:15', actor: '张治理', action: '审批通过', from: 'pending', to: 'published' }
    ],
    appliedFields: [
      { fullPath: 'dwd_customer.cust_no', sample: '620000000001', compliant: true }
    ]
  },
  {
    code: 'STD-002', standardNo: 'STD-002',
    name: '证件类型', cnName: '证件类型',
    theme: '客户', categoryL1: '客户信息', categoryL2: '身份信息',
    manageDept: '合规与法律部',
    enFullName: 'Identity Document Type', enAbbr: 'ID_DOC_TYPE',
    morpheme: 'id(身份) + doc(证件) + type(类型)',
    definition: '客户身份证明文件的种类划分,遵循人民银行个人客户身份识别证件编码',
    bizDefinition: '客户身份证明文件的种类划分,遵循人民银行个人客户身份识别证件编码',
    domain: 'CODE_ID_TYPE', dataType: 'CHAR', bizDataType: '代码型',
    length: 3, precision: '-', scale: undefined,
    isCode: true, stdCodeNo: 'STD_ID_TYPE', stdCodeName: '证件类型代码',
    updateTime: '2026-10-09 14:05:00',
    stdSource: '行业标准', stdBasis: 'JR/T 0166-2020《金融数据 个人金融信息保护》',
    category: '客户信息', valueRange: '枚举:STD_ID_TYPE 码值', example: '101',
    owner: '李合规', complianceRate: 95, tags: ['行标', '代码'],
    status: 'published',
    history: [
      { ts: '2025-02-01 09:00', actor: '李合规', action: '创建并发布', from: 'draft', to: 'published' }
    ],
    appliedFields: [
      { fullPath: 'dwd_user.id_type', sample: '101', compliant: true }
    ]
  },
  {
    code: 'STD-003', standardNo: 'STD-003',
    name: '性别代码', cnName: '性别代码',
    theme: '客户', categoryL1: '客户信息', categoryL2: '基本信息',
    manageDept: '零售银行部',
    enFullName: 'Gender Code', enAbbr: 'GENDER_CD',
    morpheme: 'gender(性别) + code(代码)',
    definition: '客户性别的统计分类,执行国家标准性别代码',
    bizDefinition: '客户性别的统计分类,执行国家标准性别代码',
    domain: 'CODE_GENDER', dataType: 'CHAR', bizDataType: '代码型',
    length: 1, precision: '-', scale: undefined,
    isCode: true, stdCodeNo: 'STD_GENDER', stdCodeName: '性别代码',
    updateTime: '2026-10-08 10:30:00',
    stdSource: '国家标准', stdBasis: 'GB/T 2261.1-2003《个人基本信息分类与代码》',
    category: '客户信息', valueRange: '枚举:STD_GENDER 码值', example: '1',
    owner: '王运营', complianceRate: 99, tags: ['国标', '代码'],
    status: 'published',
    history: [
      { ts: '2025-02-10 11:00', actor: '王运营', action: '创建并发布', from: 'draft', to: 'published' }
    ],
    appliedFields: [
      { fullPath: 'dwd_user.gender', sample: '1', compliant: true }
    ]
  },
  {
    code: 'STD-004', standardNo: 'STD-004',
    name: '货币代码', cnName: '货币代码',
    theme: '账户', categoryL1: '账户信息', categoryL2: '属性信息',
    manageDept: '运营管理部',
    enFullName: 'Currency Code', enAbbr: 'CUR_CODE',
    morpheme: 'currency(货币) + code(代码)',
    definition: '账户余额所属币种类型的三位字母代码',
    bizDefinition: '账户余额所属币种类型的三位字母代码',
    domain: 'CODE_CURRENCY', dataType: 'CHAR', bizDataType: '代码型',
    length: 3, precision: '-', scale: undefined,
    isCode: true, stdCodeNo: 'STD_CURRENCY', stdCodeName: '币种代码',
    updateTime: '2026-10-12 16:40:00',
    stdSource: '国际标准', stdBasis: 'ISO 4217:2015《货币及资金代码》',
    category: '账户信息', valueRange: '枚举:STD_CURRENCY 码值', example: 'CNY',
    owner: '钱运营', complianceRate: 97, tags: ['ISO', '代码'],
    status: 'published',
    history: [
      { ts: '2025-03-05 14:00', actor: '钱运营', action: '创建并发布', from: 'draft', to: 'published' }
    ],
    appliedFields: [
      { fullPath: 'dwd_account.curr_code', sample: 'CNY', compliant: true }
    ]
  },
  {
    code: 'STD-005', standardNo: 'STD-005',
    name: '存款余额', cnName: '存款余额',
    theme: '账户', categoryL1: '账户信息', categoryL2: '余额信息',
    manageDept: '财务会计部',
    enFullName: 'Deposit Balance', enAbbr: 'DEPOSIT_BAL',
    morpheme: 'deposit(存款) + balance(余额)',
    definition: '查询时点账户的实际可用金额,以币种为单位,保留 2 位小数',
    bizDefinition: '查询时点账户的实际可用金额,以币种为单位,保留 2 位小数',
    domain: 'AMT_18_2', dataType: 'NUMBER', bizDataType: '数值型',
    length: 18, precision: '2', scale: 2,
    isCode: false, stdCodeNo: '-', stdCodeName: '-',
    updateTime: '2026-09-28 11:15:00',
    stdSource: '行内标准', stdBasis: '《核心系统数据字典 V3.2》',
    category: '账户信息', valueRange: 'balance >= 0', example: '50000.00',
    owner: '孙会计', complianceRate: 92, tags: ['金额', '核心'],
    status: 'published',
    history: [
      { ts: '2025-03-10 14:00', actor: '孙会计', action: '创建', from: 'draft', to: 'draft' },
      { ts: '2025-03-11 10:20', actor: '张治理', action: '审批通过', from: 'pending', to: 'published' }
    ],
    appliedFields: [
      { fullPath: 'dwd_account.deposit_balance', sample: '50000.00', compliant: true },
      { fullPath: 'dws_customer.total_dep_amt', sample: '50000', compliant: false }
    ]
  },
  {
    code: 'STD-006', standardNo: 'STD-006',
    name: '贷款金额', cnName: '贷款金额',
    theme: '贷款', categoryL1: '授信信息', categoryL2: '合同信息',
    manageDept: '授信审批部',
    enFullName: 'Loan Amount', enAbbr: 'LOAN_AMT',
    morpheme: 'loan(贷款) + amount(金额)',
    definition: '借款合同中约定的本金金额,人民币元,保留 2 位小数',
    bizDefinition: '借款合同中约定的本金金额,人民币元,保留 2 位小数',
    domain: 'AMT_18_2', dataType: 'NUMBER', bizDataType: '数值型',
    length: 18, precision: '2', scale: 2,
    isCode: false, stdCodeNo: '-', stdCodeName: '-',
    updateTime: '2026-10-13 08:50:00',
    stdSource: '行内标准', stdBasis: '《信贷管理系统数据标准 V1.4》',
    category: '授信信息', valueRange: '0 < amount <= 10000000', example: '500000.00',
    owner: '张风控', complianceRate: 88, tags: ['金融', '核心'],
    status: 'published',
    history: [
      { ts: '2025-04-01 14:00', actor: '张风控', action: '创建并发布', from: 'draft', to: 'published' }
    ],
    appliedFields: [
      { fullPath: 'dwd_loan.principal', sample: '500000.00', compliant: true }
    ]
  },
  {
    code: 'STD-007', standardNo: 'STD-007',
    name: '贷款风险分类(五级)', cnName: '贷款风险分类(五级)',
    theme: '贷款', categoryL1: '资产质量', categoryL2: '风险分类',
    manageDept: '风险管理部',
    enFullName: 'Loan Five-Level Classification', enAbbr: 'LOAN_FIVE_CLS',
    morpheme: 'loan(贷款) + five-level(五级) + classification(分类)',
    definition: '贷款风险等级分类:正常、关注、次级、可疑、损失',
    bizDefinition: '贷款风险等级分类:正常、关注、次级、可疑、损失',
    domain: 'CODE_LOAN_FIVE', dataType: 'CHAR', bizDataType: '代码型',
    length: 1, precision: '-', scale: undefined,
    isCode: true, stdCodeNo: 'STD_LOAN_FIVE', stdCodeName: '贷款风险分类代码',
    updateTime: '2026-08-05 17:30:00',
    stdSource: '行业标准', stdBasis: '《贷款风险分类指引》(银监发〔2007〕17 号)',
    category: '资产质量', valueRange: '枚举:STD_LOAN_FIVE 码值', example: '1',
    owner: '张风控', complianceRate: 72, tags: ['风控', '代码'],
    status: 'pending',
    history: [
      { ts: '2025-04-20 11:00', actor: '张风控', action: '创建', from: 'draft', to: 'draft' },
      { ts: '2026-08-05 17:30', actor: '张风控', action: '提交审批', from: 'draft', to: 'pending' }
    ],
    appliedFields: []
  },
  {
    code: 'STD-008', standardNo: 'STD-008',
    name: '开户日期', cnName: '开户日期',
    theme: '客户', categoryL1: '客户信息', categoryL2: '开户信息',
    manageDept: '运营管理部',
    enFullName: 'Account Opening Date', enAbbr: 'OPEN_DATE',
    morpheme: 'open(开立) + date(日期)',
    definition: '客户首次在本行建立业务关系的日期,格式 YYYYMMDD',
    bizDefinition: '客户首次在本行建立业务关系的日期,格式 YYYYMMDD',
    domain: 'DATE_8', dataType: 'DATE', bizDataType: '日期型',
    length: 8, precision: '-', scale: undefined,
    isCode: false, stdCodeNo: '-', stdCodeName: '-',
    updateTime: '2026-09-15 09:10:00',
    stdSource: '行内标准', stdBasis: '《核心系统数据字典 V3.2》',
    category: '客户信息', valueRange: '^[12][0-9]{3}(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])$', example: '20200815',
    owner: '钱运营', complianceRate: 94, tags: ['日期'],
    status: 'published',
    history: [
      { ts: '2025-05-12 09:30', actor: '钱运营', action: '创建并发布', from: 'draft', to: 'published' }
    ],
    appliedFields: []
  },
  {
    code: 'STD-009', standardNo: 'STD-009',
    name: '客户状态', cnName: '客户状态',
    theme: '客户', categoryL1: '客户信息', categoryL2: '基本信息',
    manageDept: '客服与渠道管理部',
    enFullName: 'Customer Status', enAbbr: 'CUST_STATUS',
    morpheme: 'cust(客户) + status(状态)',
    definition: '客户生命周期状态:正常/睡眠/注销/黑名单',
    bizDefinition: '客户生命周期状态:正常/睡眠/注销/黑名单',
    domain: 'CODE_CUST_STATUS', dataType: 'VARCHAR2', bizDataType: '代码型',
    length: 2, precision: '-', scale: undefined,
    isCode: true, stdCodeNo: 'STD_CUST_STATUS', stdCodeName: '客户状态代码',
    updateTime: '2026-08-04 15:00:00',
    stdSource: '行内标准', stdBasis: '《客户信息管理办法》',
    category: '客户信息', valueRange: '枚举:STD_CUST_STATUS 码值', example: '01',
    owner: '王运营', complianceRate: 95, tags: ['枚举', '代码'],
    status: 'draft',
    history: [
      { ts: '2026-08-04 15:00', actor: '王运营', action: '创建草稿', from: 'draft', to: 'draft' }
    ],
    appliedFields: []
  },
  {
    code: 'STD-010', standardNo: 'STD-010',
    name: '邮政编码', cnName: '邮政编码',
    theme: '公共', categoryL1: '地址信息', categoryL2: '通讯方式',
    manageDept: '零售银行部',
    enFullName: 'Postal Code', enAbbr: 'POSTAL_CD',
    morpheme: 'postal(邮政) + code(编号)',
    definition: '客户通讯地址的邮政编码,6 位数字',
    bizDefinition: '客户通讯地址的邮政编码,6 位数字',
    domain: 'CHAR_6', dataType: 'CHAR', bizDataType: '字符型',
    length: 6, precision: '-', scale: undefined,
    isCode: false, stdCodeNo: '-', stdCodeName: '-',
    updateTime: '2026-07-20 14:00:00',
    stdSource: '国家标准', stdBasis: 'GB/T 10114-2003《县以下行政区划代码编制规则》',
    category: '地址信息', valueRange: '^[1-9]\\d{5}$', example: '100000',
    owner: '王运营', complianceRate: 60, tags: [],
    status: 'deprecated',
    history: [
      { ts: '2024-06-01 10:00', actor: '王运营', action: '创建并发布', from: 'draft', to: 'published' },
      { ts: '2026-07-20 14:00', actor: '张治理', action: '弃用标准', from: 'published', to: 'deprecated' }
    ],
    appliedFields: []
  }
]

// ───────────────────────────── 全局响应式状态 ─────────────────────────────
// 用模块级 ref 模拟后端状态,组件订阅即实时刷新
const _standards = ref<Standard[]>(INITIAL.map(s => ({ ...s, history: [...s.history] })))

function nowStr() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function transition(code: string, to: StandardStatus, action: string, actor = '当前用户') {
  const s = _standards.value.find(x => x.code === code)
  if (!s) throw new Error(`未找到标准: ${code}`)
  const from = s.status
  s.status = to
  s.history.unshift({ ts: nowStr(), actor, action, from, to })
  return s
}

// ───────────────────────────── 对外 API ─────────────────────────────
export const StandardStore = {
  /** 获取所有标准(返回副本,避免外部直接修改) */
  getStandards(): Standard[] {
    return _standards.value
  },

  /** 按 code 查找 */
  findByCode(code: string): Standard | undefined {
    return _standards.value.find(s => s.code === code)
  },

  /** 草稿 → 提交审批 */
  submitForReview(code: string, actor?: string) {
    return transition(code, 'pending', '提交审批', actor)
  },

  /** 待审批 → 审批通过 → 已发布 */
  approve(code: string, actor?: string) {
    return transition(code, 'published', '审批通过', actor || '治理者')
  },

  /** 待审批 → 打回草稿 */
  reject(code: string, reason?: string, actor?: string) {
    return transition(code, 'draft', `打回草稿${reason ? `(${reason})` : ''}`, actor || '治理者')
  },

  /** 已发布 → 弃用 */
  deprecate(code: string, actor?: string) {
    return transition(code, 'deprecated', '弃用标准', actor || '治理者')
  },

  /** 弃用 → 恢复为草稿 */
  restoreFromDeprecated(code: string, actor?: string) {
    return transition(code, 'draft', '恢复编辑', actor)
  },

  /** 新建草稿 */
  createDraft(input: Omit<Standard, 'status' | 'history'>, actor?: string) {
    const newOne: Standard = {
      ...input,
      status: 'draft',
      history: [{ ts: nowStr(), actor: actor || '当前用户', action: '创建草稿', from: 'draft', to: 'draft' }],
      appliedFields: []
    }
    _standards.value.unshift(newOne)
    return newOne
  },

  /** U2 全量覆盖:上传校验通过后整体替换,未出现在文件中的旧记录不再保留 */
  replaceAllStandards(list: Standard[]) {
    _standards.value = list
  }
}

/** 派生常量(可在模板里直接用) */
export const STANDARD_STATUS_LIST: StandardStatus[] = ['draft', 'pending', 'published', 'deprecated']
export const STANDARD_STATUS_LABEL: Record<StandardStatus, string> = {
  draft: '草稿',
  pending: '待审批',
  published: '已发布',
  deprecated: '已弃用'
}
export const STANDARD_STATUS_COLOR: Record<StandardStatus, string> = {
  draft: 'orange',
  pending: 'arcoblue',
  published: 'green',
  deprecated: 'gray'
}

// ───────────────────────── 标准域 ─────────────────────────
// 域编号即 PRD R12 的唯一键;数据标准侧「域」字段引用这里的 code。
// 注:CODE_LOAN_FIVE 故意不在清单内,用于演示 R04「关联对象不存在 → 置灰不可点」。
const INITIAL_DOMAINS: StandardDomain[] = [
  {
    code: 'ID_32', name: '客户标识域', businessDataType: '标识符', logicalDataType: 'VARCHAR2',
    length: 32, precision: 0, isCode: false, stdCodeNo: '', stdCodeName: '',
    description: '客户在本行的唯一标识编号长度口径,统一 32 位变长字符,左补零不加空格',
    updateTime: '2026-10-11 09:00:00'
  },
  {
    code: 'ID_20', name: '账户标识域', businessDataType: '标识符', logicalDataType: 'VARCHAR2',
    length: 20, precision: 0, isCode: false, stdCodeNo: '', stdCodeName: '',
    description: '账号、卡号等账户类标识统一 20 位变长字符',
    updateTime: '2026-09-20 10:15:00'
  },
  {
    code: 'AMT_18_2', name: '金额域', businessDataType: '金额', logicalDataType: 'NUMBER',
    length: 18, precision: 2, isCode: false, stdCodeNo: '', stdCodeName: '',
    description: '通用金额口径:总长 18 位、小数 2 位,币种由货币代码约束',
    updateTime: '2026-10-13 08:40:00'
  },
  {
    code: 'NUM_10', name: '数量域', businessDataType: '数量', logicalDataType: 'NUMBER',
    length: 10, precision: 0, isCode: false, stdCodeNo: '', stdCodeName: '',
    description: '份额、笔数、次数等非金额类数值口径',
    updateTime: '2026-08-30 15:20:00'
  },
  {
    code: 'DATE_8', name: '日期域', businessDataType: '日期', logicalDataType: 'DATE',
    length: 8, precision: 0, isCode: false, stdCodeNo: '', stdCodeName: '',
    description: '业务日期统一 8 位 YYYYMMDD,时点信息另设时间戳域',
    updateTime: '2026-09-15 09:00:00'
  },
  {
    code: 'CHAR_6', name: '行政区划域', businessDataType: '代码', logicalDataType: 'CHAR',
    length: 6, precision: 0, isCode: false, stdCodeNo: '', stdCodeName: '',
    description: '邮政编码、行政区划等 6 位定长字符编码',
    updateTime: '2026-07-20 13:50:00'
  },
  {
    code: 'CODE_GENDER', name: '性别代码域', businessDataType: '代码', logicalDataType: 'CHAR',
    length: 1, precision: 0, isCode: true, stdCodeNo: 'STD_GENDER', stdCodeName: '性别代码',
    description: '1 位枚举代码,码值引用 STD_GENDER',
    updateTime: '2026-10-08 10:20:00'
  },
  {
    code: 'CODE_ID_TYPE', name: '证件类型代码域', businessDataType: '代码', logicalDataType: 'CHAR',
    length: 3, precision: 0, isCode: true, stdCodeNo: 'STD_ID_TYPE', stdCodeName: '证件类型代码',
    description: '3 位枚举代码,码值引用 STD_ID_TYPE',
    updateTime: '2026-10-09 14:00:00'
  },
  {
    code: 'CODE_CURRENCY', name: '币种代码域', businessDataType: '代码', logicalDataType: 'CHAR',
    length: 3, precision: 0, isCode: true, stdCodeNo: 'STD_CURRENCY', stdCodeName: '币种代码',
    description: '3 位字母代码,码值引用 STD_CURRENCY(ISO 4217)',
    updateTime: '2026-10-12 16:30:00'
  },
  {
    code: 'CODE_CUST_STATUS', name: '客户状态代码域', businessDataType: '代码', logicalDataType: 'VARCHAR2',
    length: 2, precision: 0, isCode: true, stdCodeNo: 'STD_CUST_STATUS', stdCodeName: '客户状态代码',
    description: '2 位枚举代码,码值引用 STD_CUST_STATUS',
    updateTime: '2026-08-04 14:50:00'
  }
]

// ───────────────────────── 标准代码 ─────────────────────────
// code 即 PRD R19 的唯一键;STD_LOAN_FIVE 故意缺失,用于演示标准页代码编号置灰。
const INITIAL_CODES: StandardCodeEntry[] = [
  {
    code: 'STD_GENDER', name: '性别代码', subject: '公共', source: '国标',
    updateTime: '2026-10-08 10:30:00',
    items: [
      { value: '0', meaning: '未知', extra: '无法或不宜采集时使用' },
      { value: '1', meaning: '男' },
      { value: '2', meaning: '女' },
      { value: '9', meaning: '未说明', extra: 'GB/T 2261.1 保留值' }
    ]
  },
  {
    code: 'STD_ID_TYPE', name: '证件类型代码', subject: '客户', source: '行标',
    updateTime: '2026-10-09 14:05:00',
    items: [
      { value: '101', meaning: '居民身份证', extra: '境内个人首选' },
      { value: '102', meaning: '临时居民身份证' },
      { value: '105', meaning: '护照', extra: '境外人士适用' },
      { value: '201', meaning: '营业执照', extra: '对公客户' }
    ]
  },
  {
    code: 'STD_CURRENCY', name: '币种代码', subject: '账户', source: 'ISO',
    updateTime: '2026-10-12 16:40:00',
    items: [
      { value: 'CNY', meaning: '人民币', extra: '本位币' },
      { value: 'USD', meaning: '美元' },
      { value: 'EUR', meaning: '欧元' },
      { value: 'HKD', meaning: '港元' },
      { value: 'JPY', meaning: '日元', extra: '小数位为 0,入账需特殊处理' }
    ]
  },
  {
    code: 'STD_CUST_STATUS', name: '客户状态代码', subject: '客户', source: '行内标准',
    updateTime: '2026-08-04 15:00:00',
    items: [
      { value: '01', meaning: '正常' },
      { value: '02', meaning: '睡眠', extra: '两年无主动交易' },
      { value: '03', meaning: '注销' },
      { value: '04', meaning: '黑名单', extra: '合规与法律部维护' }
    ]
  },
  {
    code: 'STD_ACCT_STATUS', name: '账户状态代码', subject: '账户', source: '行内标准',
    updateTime: '2026-09-28 11:15:00',
    items: [
      { value: 'A', meaning: '正常' },
      { value: 'F', meaning: '冻结', extra: '司法冻结须登记依据文号' },
      { value: 'C', meaning: '销户' }
    ]
  }
]

// ───────────────────────── 标准单词 ─────────────────────────
const INITIAL_WORDS: StandardWord[] = [
  {
    chineseName: '客户', englishName: 'Customer', abbreviation: 'CUST',
    synonyms: '用户, 消费者', isClassWord: false,
    remark: '零售与对公客户统称,对公客户另用 CORP', updateTime: '2026-09-10 10:00:00'
  },
  {
    chineseName: '账户', englishName: 'Account', abbreviation: 'ACCT',
    synonyms: '户头', isClassWord: false,
    remark: '与「账号」区分:ACCT 指账户实体,ACCT_NO 指编号字段', updateTime: '2026-09-11 11:00:00'
  },
  {
    chineseName: '代码', englishName: 'Code', abbreviation: 'CD',
    synonyms: '编号, 编码', isClassWord: true,
    remark: '分类词,枚举型字段命名后缀,如 GENDER_CD', updateTime: '2026-09-12 14:00:00'
  },
  {
    chineseName: '日期', englishName: 'Date', abbreviation: 'DT',
    synonyms: '时间', isClassWord: true,
    remark: '分类词,统一 DATE 全称、DT 缩写,8 位口径引用 DATE_8 域', updateTime: '2026-09-13 16:00:00'
  },
  {
    chineseName: '余额', englishName: 'Balance', abbreviation: 'BAL',
    synonyms: '结存', isClassWord: false,
    remark: '金额类词素,搭配 AMT_18_2 域使用', updateTime: '2026-09-28 11:15:00'
  },
  {
    chineseName: '标识', englishName: 'Identification', abbreviation: 'ID',
    synonyms: '编号, 主键', isClassWord: false,
    remark: '主键/唯一标识类字段前缀,如 ID_DOC_TYPE', updateTime: '2026-10-09 14:05:00'
  },
  {
    chineseName: '金额', englishName: 'Amount', abbreviation: 'AMT',
    synonyms: '数额', isClassWord: false,
    remark: '总长度 18、小数 2,口径引用 AMT_18_2 域', updateTime: '2026-10-13 08:50:00'
  },
  {
    chineseName: '状态', englishName: 'Status', abbreviation: 'STS',
    synonyms: '状况', isClassWord: true,
    remark: '分类词,枚举状态字段后缀,码值须挂标准代码', updateTime: '2026-08-04 15:00:00'
  }
]

const _domains = ref<StandardDomain[]>(INITIAL_DOMAINS.map(d => ({ ...d })))
const _codes = ref<StandardCodeEntry[]>(INITIAL_CODES.map(c => ({ ...c, items: [...c.items] })))
const _words = ref<StandardWord[]>(INITIAL_WORDS.map(w => ({ ...w })))

export const DomainStore = {
  getDomains(): StandardDomain[] {
    return _domains.value
  },
  findByCode(code: string): StandardDomain | undefined {
    return _domains.value.find(d => d.code === code)
  },
  /** R04:跳转到达态判断 */
  exists(code: string): boolean {
    return _domains.value.some(d => d.code === code)
  },
  /** R10:引用该域的标准清单,由数据标准侧「域」字段自动派生,不随标准域上传变动 */
  referencedStandards(code: string): Array<{ standardNo: string; cnName: string }> {
    return _standards.value
      .filter(s => s.domain === code)
      .map(s => ({ standardNo: s.standardNo || s.code, cnName: s.cnName || s.name }))
  },
  replaceAll(list: StandardDomain[]) {
    _domains.value = list
  }
}

export const StdCodeStore = {
  getCodes(): StandardCodeEntry[] {
    return _codes.value
  },
  findByCode(code: string): StandardCodeEntry | undefined {
    return _codes.value.find(c => c.code === code)
  },
  exists(code: string): boolean {
    return _codes.value.some(c => c.code === code)
  },
  /** R17:引用该标准代码的标准清单,由数据标准侧「标准代码编号」字段自动派生 */
  referencedStandards(code: string): Array<{ standardNo: string; cnName: string }> {
    return _standards.value
      .filter(s => s.isCode && s.stdCodeNo === code)
      .map(s => ({ standardNo: s.standardNo || s.code, cnName: s.cnName || s.name }))
  },
  replaceAll(list: StandardCodeEntry[]) {
    _codes.value = list
  }
}

export const WordStore = {
  getWords(): StandardWord[] {
    return _words.value
  },
  replaceAll(list: StandardWord[]) {
    _words.value = list
  }
}