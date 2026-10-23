/**
 * standard-store —— 数据标准 mock store
 *
 * 依据:《需求文档：数据管理-数据标准(评审简化版)》
 *   - 四类资产:数据标准 / 数据域 / 标准代码(代码集) / 标准单词
 *     其中「标准单词」页面已下线,数据仍保留 —— 供 Copilot 业务词匹配消费
 *   - 页面只读(V3),维护统一走全量上传(U1-U4),覆盖式写入(replaceAll)
 *   - 引用关系只在数据标准侧维护(所属数据域 / 关联代码集编号),
 *     数据域与代码集不存储、不维护引用清单,一律由数据标准反向派生:
 *       数据域的引用标准清单  ← 数据标准「所属数据域」
 *       代码集的引用标准清单  ← 数据标准「关联代码集编号」
 *     因此上传数据域/标准代码不会改变引用清单(R10/R16),
 *     而上传数据标准会立即反映到两侧清单上。
 *
 * 字段口径(以需求文档为准):
 *   R01 数据标准:标准编号/所属数据域/标准名称(中)/标准名称(英)/标准定义(业务含义,富文本)/
 *                 数据类型/长度·精度/是否必填/值域·取值规则/关联代码集编号/数据分类/数据分级/
 *                 涉及个人信息/责任部门/标准状态/版本/生效日期/依据·引用标准/备注
 *   R08 数据域  :数据域代码/数据域名称/覆盖范围名称/建议主责部门
 *   R13 代码集  :代码集编号/代码集名称/适用标准编号/是否有效/备注(代码值明细在详情页)
 *   R25 标准单词:单词中文名称/单词英文名称/单词英文缩写/同义词/是否为分类词/备注
 *
 * 唯一键:
 *   数据标准 → 标准编号(R07);数据域 → 数据域代码(R12);
 *   标准代码 → 代码集编号 + 代码值 联合键,存储为一码一行(R24);标准单词 → 英文缩写(R29)
 *
 * 上线后:把各 Store 的 mutator 替换为 HTTP 调用即可,业务方不感知。
 */
import { ref } from 'vue'

/* ══════════════════════ 类型定义 ══════════════════════ */

/** 标准状态(需求文档未细化审批流,只保留三态;变更审批流程属后续迭代) */
export type StandardStatus = 'draft' | 'effective' | 'obsolete'

/** 数据标准(R01) */
export interface Standard {
  /** 标准编号(唯一键 R07);同时保留 code 别名,供血缘/Copilot 侧复用 */
  code: string
  /** 标准编号(与 code 同值,列表展示用) */
  standardNo: string
  /** 标准名称(中文);name 为 cnName 的别名 */
  cnName: string
  /** 标准名称(中文)别名 */
  name: string
  /** 标准名称(英文) */
  enName: string
  /** 所属数据域(数据域代码) */
  domain: string
  /** 标准定义(业务含义),富文本 HTML */
  definition: string
  /** 数据类型:字符型/数值型/日期型/代码型/布尔型 */
  dataType: string
  /** 长度/精度,如 "12" / "18,2" */
  lengthPrecision: string
  /** 是否必填 */
  required: boolean
  /** 值域/取值规则 */
  valueRange: string
  /** 关联代码集编号;无关联时为 "-" */
  codeSetNo: string
  /** 数据分类 */
  dataCategory: string
  /** 数据分级:核心/重要/一般/公开 */
  dataLevel: string
  /** 涉及个人信息 */
  personalInfo: boolean
  /** 责任部门 */
  ownerDept: string
  /** 标准状态 */
  status: StandardStatus
  /** 版本 */
  version: string
  /** 生效日期 */
  effectiveDate: string
  /** 依据/引用标准 */
  basis: string
  /** 备注 */
  remark: string
  /** 最近更新时间(V2 默认排序依据) */
  updateTime: string
}

/** 数据域(R08) */
export interface StandardDomain {
  /** 数据域代码(唯一键 R12) */
  code: string
  /** 数据域名称 */
  name: string
  /** 覆盖范围名称 */
  coverage: string
  /** 建议主责部门 */
  ownerDept: string
  /** 最近更新时间(V2 默认排序依据) */
  updateTime: string
}

/** 代码值明细(R18) */
export interface CodeItem {
  /** 代码值 */
  value: string
  /** 代码名称 */
  name: string
  /** 代码说明 */
  description: string
  /** 是否有效(代码值层,与代码集层独立,R17-1) */
  valid: boolean
}

/** 标准代码存储行(R23/R24):一码一行,代码集编号 + 代码值为联合唯一键 */
export interface StdCodeRow {
  /** 代码集编号 */
  codeSetNo: string
  /** 代码集名称 */
  codeSetName: string
  /** 适用标准编号 */
  applicableStandards: string
  /** 代码值 */
  codeValue: string
  /** 代码名称 */
  codeName: string
  /** 代码说明 */
  codeDescription: string
  /** 是否有效(代码集层) */
  setValid: boolean
  /** 是否有效(代码值层) */
  valueValid: boolean
  /** 备注 */
  remark: string
  /** 最近更新时间(V2 默认排序依据) */
  updateTime: string
}

/** 代码集(列表/详情页展示口径 R13/R17):由 StdCodeRow 按代码集编号合并去重而来 */
export interface CodeSetSummary {
  /** 代码集编号 */
  code: string
  /** 代码集名称 */
  name: string
  /** 适用标准编号 */
  applicableStandards: string
  /** 是否有效(代码集层) */
  valid: boolean
  /** 备注 */
  remark: string
  /** 最近更新时间 */
  updateTime: string
  /** 代码值明细(默认按代码值字符序升序,R18) */
  items: CodeItem[]
}

/** 标准单词(R25) */
export interface StandardWord {
  /** 单词中文名称 */
  chineseName: string
  /** 单词英文名称 */
  englishName: string
  /** 单词英文缩写(唯一键 R29) */
  abbreviation: string
  /** 同义词(逗号分隔) */
  synonyms: string
  /** 是否为分类词 */
  isClassWord: boolean
  /** 备注 */
  remark: string
  /** 最近更新时间(V2 默认排序依据) */
  updateTime: string
}

/* ══════════════════════ 派生常量 ══════════════════════ */

/** 标准状态枚举 */
export const STANDARD_STATUS_LIST: StandardStatus[] = ['draft', 'effective', 'obsolete']
/** 标准状态中文名 */
export const STANDARD_STATUS_LABEL: Record<StandardStatus, string> = {
  draft: '草稿',
  effective: '生效',
  obsolete: '已废止'
}
/** 标准状态标签色 */
export const STANDARD_STATUS_COLOR: Record<StandardStatus, string> = {
  draft: 'orange',
  effective: 'green',
  obsolete: 'gray'
}
/** 数据分级枚举(由 mock 数据派生,避免与实际数据脱节) */
export const DATA_LEVEL_LIST = ['核心', '重要', '一般', '公开'] as const
/** 数据分类枚举(由 mock 数据派生) */
export const DATA_CATEGORY_LIST = ['客户信息', '账户信息', '交易信息', '风险信息', '公共信息'] as const

/**
 * 全角字符归一化为半角(R19:代码值搜索前先做半角归一)。
 *
 * @param input 原始输入
 * @returns 归一化后的字符串
 */
export function normalizeHalfWidth(input: string): string {
  return String(input ?? '').replace(/[\uFF01-\uFF5E]/g, ch =>
    String.fromCharCode(ch.charCodeAt(0) - 0xfee0)
  ).replace(/\u3000/g, ' ')
}

/**
 * 代码值字符序升序比较(R18:数字型代码值同样按字符串处理,1、10、2 依次排列)。
 *
 * @param a 左值
 * @param b 右值
 * @returns -1 / 0 / 1
 */
export function compareCodeValue(a: string, b: string): number {
  const x = String(a ?? '')
  const y = String(b ?? '')
  if (x === y) {return 0}
  return x < y ? -1 : 1
}

/* ══════════════════════ 初始数据 ══════════════════════ */

/**
 * 初始数据域(R08)。
 * 故意不收录 LOAN_CLASS_DOMAIN —— 用于演示 R04「关联对象不存在 → 置灰不可点」。
 */
const INITIAL_DOMAINS: StandardDomain[] = [
  {
    code: 'CUST_DOMAIN', name: '客户域',
    coverage: '客户主数据、客户信息类表字段',
    ownerDept: '零售银行部', updateTime: '2026-10-11 09:20:00'
  },
  {
    code: 'AMT_DOMAIN', name: '金额域',
    coverage: '账户余额、交易金额、还款金额类字段',
    ownerDept: '财务会计部', updateTime: '2026-10-13 08:40:00'
  },
  {
    code: 'CODE_DOMAIN', name: '代码域',
    coverage: '枚举型、代码型字段',
    ownerDept: '数据管理部', updateTime: '2026-10-08 10:20:00'
  },
  {
    code: 'DATE_DOMAIN', name: '日期域',
    coverage: '业务日期、时点类字段',
    ownerDept: '数据管理部', updateTime: '2026-09-15 09:10:00'
  },
  {
    code: 'ID_DOMAIN', name: '标识域',
    coverage: '主键、唯一标识类字段',
    ownerDept: '数据架构部', updateTime: '2026-09-20 10:15:00'
  },
  {
    code: 'RATE_DOMAIN', name: '利率域',
    coverage: '利率、费率、比例类字段',
    ownerDept: '风险管理部', updateTime: '2026-10-02 11:30:00'
  },
  {
    code: 'CARD_DOMAIN', name: '卡号域',
    coverage: '卡片、账号类标识字段',
    ownerDept: '零售银行部', updateTime: '2026-08-30 15:20:00'
  },
  {
    code: 'LOAN_DOMAIN', name: '贷款域',
    coverage: '借据、还款计划类字段',
    ownerDept: '授信审批部', updateTime: '2026-10-06 14:05:00'
  }
]

/**
 * 初始数据标准(R01)。
 * STD-010 的所属数据域 LOAN_CLASS_DOMAIN 不存在 → 演示 R04 置灰;
 * STD-011 的关联代码集编号 CODE_IMG_TYPE 不存在 → 演示 R04 置灰。
 */
const INITIAL_STANDARDS: Standard[] = [
  {
    code: 'STD-001', standardNo: 'STD-001', cnName: '客户编号', name: '客户编号',
    enName: 'Customer Identification Number', domain: 'CUST_DOMAIN',
    definition:
      '<p>标识客户在本行唯一性的编号，客户信息建立时分配，全行共享。</p><ul><li>全行唯一，不随业务变更</li><li>格式为 12 位数字，左侧允许补 0</li></ul>',
    dataType: '字符型', lengthPrecision: '12', required: true,
    valueRange: '^[0-9]{12}$', codeSetNo: '-',
    dataCategory: '客户信息', dataLevel: '核心', personalInfo: true, ownerDept: '零售银行部',
    status: 'effective', version: 'V1.0', effectiveDate: '2025-01-01',
    basis: '《核心系统数据字典 V3.2》', remark: '客户信息主键',
    updateTime: '2026-10-11 09:20:00'
  },
  {
    code: 'STD-002', standardNo: 'STD-002', cnName: '证件类型', name: '证件类型',
    enName: 'Identity Document Type', domain: 'CODE_DOMAIN',
    definition:
      '<p>客户身份证明文件的种类划分，遵循人民银行个人客户身份识别证件编码。</p><p>境内个人统一使用「居民身份证」，对公客户使用「营业执照」。</p>',
    dataType: '代码型', lengthPrecision: '3', required: true,
    valueRange: '枚举：CODE_ID_TYPE 码值', codeSetNo: 'CODE_ID_TYPE',
    dataCategory: '客户信息', dataLevel: '重要', personalInfo: true, ownerDept: '合规与法律部',
    status: 'effective', version: 'V1.2', effectiveDate: '2025-02-01',
    basis: 'JR/T 0166-2020《金融数据 个人金融信息保护》', remark: '证件类型码值以代码集为准',
    updateTime: '2026-10-09 14:05:00'
  },
  {
    code: 'STD-003', standardNo: 'STD-003', cnName: '性别代码', name: '性别代码',
    enName: 'Gender Code', domain: 'CODE_DOMAIN',
    definition:
      '<p>客户性别的统计分类，执行国家标准性别代码。</p><ul><li>取值为单字符枚举</li><li>未采集到时取「未知」，不得随意置空</li></ul>',
    dataType: '代码型', lengthPrecision: '1', required: false,
    valueRange: '枚举：CODE_GENDER 码值', codeSetNo: 'CODE_GENDER',
    dataCategory: '客户信息', dataLevel: '一般', personalInfo: true, ownerDept: '零售银行部',
    status: 'effective', version: 'V1.0', effectiveDate: '2025-03-01',
    basis: 'GB/T 2261.1-2003《个人基本信息分类与代码》', remark: '',
    updateTime: '2026-10-08 10:30:00'
  },
  {
    code: 'STD-004', standardNo: 'STD-004', cnName: '币种代码', name: '币种代码',
    enName: 'Currency Code', domain: 'CODE_DOMAIN',
    definition:
      '<p>账户余额所属币种类型的三位字母代码。</p><p>本外币账户余额汇总时须先按币种分组，不得直接相加。</p>',
    dataType: '代码型', lengthPrecision: '3', required: true,
    valueRange: '枚举：CODE_CURRENCY 码值', codeSetNo: 'CODE_CURRENCY',
    dataCategory: '账户信息', dataLevel: '一般', personalInfo: false, ownerDept: '运营管理部',
    status: 'effective', version: 'V1.1', effectiveDate: '2025-04-01',
    basis: 'ISO 4217:2015《货币及资金代码》', remark: '',
    updateTime: '2026-10-12 16:40:00'
  },
  {
    code: 'STD-005', standardNo: 'STD-005', cnName: '存款余额', name: '存款余额',
    enName: 'Deposit Balance', domain: 'AMT_DOMAIN',
    definition:
      '<p>查询时点账户的实际可用金额，以币种为单位，保留 2 位小数。</p><ul><li>含活期、通知、保证金等子账户余额</li><li>不允许为负</li></ul>',
    dataType: '数值型', lengthPrecision: '18,2', required: true,
    valueRange: 'balance >= 0', codeSetNo: '-',
    dataCategory: '账户信息', dataLevel: '重要', personalInfo: false, ownerDept: '财务会计部',
    status: 'effective', version: 'V2.0', effectiveDate: '2025-05-01',
    basis: '《核心系统数据字典 V3.2》', remark: '币种由币种代码约束',
    updateTime: '2026-09-28 11:15:00'
  },
  {
    code: 'STD-006', standardNo: 'STD-006', cnName: '贷款利率', name: '贷款利率',
    enName: 'Loan Interest Rate', domain: 'RATE_DOMAIN',
    definition:
      '<p>贷款合同约定的年化利率，保留 4 位小数。</p><p>区间为 0（不含）至 24%（含），按「年化单利」口径存储。</p>',
    dataType: '数值型', lengthPrecision: '9,4', required: true,
    valueRange: '0 < rate <= 0.24', codeSetNo: '-',
    dataCategory: '风险信息', dataLevel: '重要', personalInfo: false, ownerDept: '风险管理部',
    status: 'effective', version: 'V1.0', effectiveDate: '2025-06-01',
    basis: '《贷款管理办法》', remark: '',
    updateTime: '2026-10-10 09:45:00'
  },
  {
    code: 'STD-007', standardNo: 'STD-007', cnName: '客户状态', name: '客户状态',
    enName: 'Customer Status', domain: 'CODE_DOMAIN',
    definition:
      '<p>客户生命周期状态，取值为正常、睡眠、注销、黑名单四类。</p><p>黑名单状态由合规与法律部统一维护。</p>',
    dataType: '代码型', lengthPrecision: '2', required: false,
    valueRange: '枚举：CODE_CUST_STATUS 码值', codeSetNo: 'CODE_CUST_STATUS',
    dataCategory: '客户信息', dataLevel: '一般', personalInfo: false, ownerDept: '客服与渠道管理部',
    status: 'draft', version: 'V0.9', effectiveDate: '-',
    basis: '《客户信息管理办法》', remark: '待评审后转生效',
    updateTime: '2026-08-04 15:00:00'
  },
  {
    code: 'STD-008', standardNo: 'STD-008', cnName: '支付渠道', name: '支付渠道',
    enName: 'Payment Channel', domain: 'CODE_DOMAIN',
    definition:
      '<p>交易发生时的受理渠道。</p><p>代码值按字符序排列（1、10、2），新增渠道需同步扩充代码集。</p>',
    dataType: '代码型', lengthPrecision: '2', required: false,
    valueRange: '枚举：CODE_PAY_CHANNEL 码值', codeSetNo: 'CODE_PAY_CHANNEL',
    dataCategory: '交易信息', dataLevel: '一般', personalInfo: false, ownerDept: '运营管理部',
    status: 'effective', version: 'V1.0', effectiveDate: '2025-07-01',
    basis: '《支付渠道管理办法》', remark: '',
    updateTime: '2026-10-05 13:20:00'
  },
  {
    code: 'STD-009', standardNo: 'STD-009', cnName: '开户日期', name: '开户日期',
    enName: 'Account Opening Date', domain: 'DATE_DOMAIN',
    definition:
      '<p>客户首次在本行建立业务关系的日期，格式为 YYYYMMDD。</p><p>时点信息另设时间戳字段，不复用本字段。</p>',
    dataType: '日期型', lengthPrecision: '8', required: false,
    valueRange: '^[12][0-9]{3}(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])$', codeSetNo: '-',
    dataCategory: '客户信息', dataLevel: '一般', personalInfo: false, ownerDept: '运营管理部',
    status: 'effective', version: 'V1.0', effectiveDate: '2025-08-01',
    basis: '《核心系统数据字典 V3.2》', remark: '',
    updateTime: '2026-09-15 09:10:00'
  },
  {
    code: 'STD-010', standardNo: 'STD-010', cnName: '贷款风险分类（五级）', name: '贷款风险分类（五级）',
    enName: 'Loan Five-Level Classification', domain: 'LOAN_CLASS_DOMAIN',
    definition:
      '<p>贷款风险等级分类：正常、关注、次级、可疑、损失。</p><p>本标准已于新版口径中废止，改用「贷款五级分类代码」。</p>',
    dataType: '代码型', lengthPrecision: '1', required: true,
    valueRange: '枚举：CODE_LOAN_FIVE 码值', codeSetNo: 'CODE_LOAN_FIVE',
    dataCategory: '风险信息', dataLevel: '核心', personalInfo: false, ownerDept: '风险管理部',
    status: 'obsolete', version: 'V1.0', effectiveDate: '2024-01-01',
    basis: '《贷款风险分类指引》(银监发〔2007〕17 号)', remark: '所属数据域 LOAN_CLASS_DOMAIN 已下线',
    updateTime: '2026-07-20 14:00:00'
  },
  {
    code: 'STD-011', standardNo: 'STD-011', cnName: '影像件编号', name: '影像件编号',
    enName: 'Image Document Number', domain: 'CUST_DOMAIN',
    definition:
      '<p>客户影像件（身份证件影像、合同影像）的唯一编号。</p><p>编号与影像存储服务一一对应，失效后不得复用。</p>',
    dataType: '字符型', lengthPrecision: '32', required: true,
    valueRange: '^[A-Za-z0-9]{32}$', codeSetNo: 'CODE_IMG_TYPE',
    dataCategory: '客户信息', dataLevel: '一般', personalInfo: true, ownerDept: '运营管理部',
    status: 'draft', version: 'V0.8', effectiveDate: '-',
    basis: '《客户影像件管理规范》', remark: '关联代码集 CODE_IMG_TYPE 尚未发布',
    updateTime: '2026-08-18 10:30:00'
  }
]

/**
 * 初始标准代码行(R23/R24):一码一行。
 * CODE_LOAN_FIVE 的代码集层是否有效为「否」,但其下码值全部有效 → 演示 R17-1 两层独立、不级联。
 */
const INITIAL_CODE_ROWS: StdCodeRow[] = [
  // ── CODE_GENDER(性别代码) ──
  { codeSetNo: 'CODE_GENDER', codeSetName: '性别代码', applicableStandards: 'STD-003', codeValue: '0', codeName: '未知', codeDescription: '无法或不宜采集时使用', setValid: true, valueValid: true, remark: '按国家标准执行', updateTime: '2026-10-08 10:30:00' },
  { codeSetNo: 'CODE_GENDER', codeSetName: '性别代码', applicableStandards: 'STD-003', codeValue: '1', codeName: '男', codeDescription: '', setValid: true, valueValid: true, remark: '', updateTime: '2026-10-08 10:30:00' },
  { codeSetNo: 'CODE_GENDER', codeSetName: '性别代码', applicableStandards: 'STD-003', codeValue: '2', codeName: '女', codeDescription: '', setValid: true, valueValid: true, remark: '', updateTime: '2026-10-08 10:30:00' },
  { codeSetNo: 'CODE_GENDER', codeSetName: '性别代码', applicableStandards: 'STD-003', codeValue: '9', codeName: '未说明', codeDescription: 'GB/T 2261.1 保留值', setValid: true, valueValid: false, remark: '', updateTime: '2026-10-08 10:30:00' },
  // ── CODE_ID_TYPE(证件类型代码) ──
  { codeSetNo: 'CODE_ID_TYPE', codeSetName: '证件类型代码', applicableStandards: 'STD-002', codeValue: '101', codeName: '居民身份证', codeDescription: '境内个人首选', setValid: true, valueValid: true, remark: '', updateTime: '2026-10-09 14:05:00' },
  { codeSetNo: 'CODE_ID_TYPE', codeSetName: '证件类型代码', applicableStandards: 'STD-002', codeValue: '102', codeName: '临时居民身份证', codeDescription: '', setValid: true, valueValid: true, remark: '', updateTime: '2026-10-09 14:05:00' },
  { codeSetNo: 'CODE_ID_TYPE', codeSetName: '证件类型代码', applicableStandards: 'STD-002', codeValue: '105', codeName: '护照', codeDescription: '境外人士适用', setValid: true, valueValid: true, remark: '', updateTime: '2026-10-09 14:05:00' },
  { codeSetNo: 'CODE_ID_TYPE', codeSetName: '证件类型代码', applicableStandards: 'STD-002', codeValue: '201', codeName: '营业执照', codeDescription: '对公客户', setValid: true, valueValid: true, remark: '', updateTime: '2026-10-09 14:05:00' },
  // ── CODE_CURRENCY(币种代码) ──
  { codeSetNo: 'CODE_CURRENCY', codeSetName: '币种代码', applicableStandards: 'STD-004', codeValue: 'CNY', codeName: '人民币', codeDescription: '本位币', setValid: true, valueValid: true, remark: '', updateTime: '2026-10-12 16:40:00' },
  { codeSetNo: 'CODE_CURRENCY', codeSetName: '币种代码', applicableStandards: 'STD-004', codeValue: 'USD', codeName: '美元', codeDescription: '', setValid: true, valueValid: true, remark: '', updateTime: '2026-10-12 16:40:00' },
  { codeSetNo: 'CODE_CURRENCY', codeSetName: '币种代码', applicableStandards: 'STD-004', codeValue: 'EUR', codeName: '欧元', codeDescription: '', setValid: true, valueValid: true, remark: '', updateTime: '2026-10-12 16:40:00' },
  { codeSetNo: 'CODE_CURRENCY', codeSetName: '币种代码', applicableStandards: 'STD-004', codeValue: 'JPY', codeName: '日元', codeDescription: '小数位为 0，入账需特殊处理', setValid: true, valueValid: true, remark: '', updateTime: '2026-10-12 16:40:00' },
  { codeSetNo: 'CODE_CURRENCY', codeSetName: '币种代码', applicableStandards: 'STD-004', codeValue: 'HKD', codeName: '港元', codeDescription: '', setValid: true, valueValid: true, remark: '', updateTime: '2026-10-12 16:40:00' },
  // ── CODE_CUST_STATUS(客户状态代码) ──
  { codeSetNo: 'CODE_CUST_STATUS', codeSetName: '客户状态代码', applicableStandards: 'STD-007', codeValue: '01', codeName: '正常', codeDescription: '', setValid: true, valueValid: true, remark: '', updateTime: '2026-08-04 15:00:00' },
  { codeSetNo: 'CODE_CUST_STATUS', codeSetName: '客户状态代码', applicableStandards: 'STD-007', codeValue: '02', codeName: '睡眠', codeDescription: '两年无主动交易', setValid: true, valueValid: true, remark: '', updateTime: '2026-08-04 15:00:00' },
  { codeSetNo: 'CODE_CUST_STATUS', codeSetName: '客户状态代码', applicableStandards: 'STD-007', codeValue: '03', codeName: '注销', codeDescription: '', setValid: true, valueValid: true, remark: '', updateTime: '2026-08-04 15:00:00' },
  { codeSetNo: 'CODE_CUST_STATUS', codeSetName: '客户状态代码', applicableStandards: 'STD-007', codeValue: '04', codeName: '黑名单', codeDescription: '合规与法律部维护', setValid: true, valueValid: false, remark: '', updateTime: '2026-08-04 15:00:00' },
  // ── CODE_PAY_CHANNEL(支付渠道代码):代码值 1、10、2 用于演示字符序(R18) ──
  { codeSetNo: 'CODE_PAY_CHANNEL', codeSetName: '支付渠道代码', applicableStandards: 'STD-008', codeValue: '1', codeName: '柜面', codeDescription: '', setValid: true, valueValid: true, remark: '', updateTime: '2026-10-05 13:20:00' },
  { codeSetNo: 'CODE_PAY_CHANNEL', codeSetName: '支付渠道代码', applicableStandards: 'STD-008', codeValue: '10', codeName: '手机银行', codeDescription: '', setValid: true, valueValid: true, remark: '', updateTime: '2026-10-05 13:20:00' },
  { codeSetNo: 'CODE_PAY_CHANNEL', codeSetName: '支付渠道代码', applicableStandards: 'STD-008', codeValue: '2', codeName: '网上银行', codeDescription: '', setValid: true, valueValid: true, remark: '', updateTime: '2026-10-05 13:20:00' },
  // ── CODE_LOAN_FIVE(贷款五级分类代码):代码集层无效,码值层全部有效(R17-1) ──
  { codeSetNo: 'CODE_LOAN_FIVE', codeSetName: '贷款五级分类代码', applicableStandards: 'STD-010', codeValue: '1', codeName: '正常', codeDescription: '', setValid: false, valueValid: true, remark: '代码集已废止,码值仍保留展示', updateTime: '2026-07-20 14:00:00' },
  { codeSetNo: 'CODE_LOAN_FIVE', codeSetName: '贷款五级分类代码', applicableStandards: 'STD-010', codeValue: '2', codeName: '关注', codeDescription: '', setValid: false, valueValid: true, remark: '', updateTime: '2026-07-20 14:00:00' },
  { codeSetNo: 'CODE_LOAN_FIVE', codeSetName: '贷款五级分类代码', applicableStandards: 'STD-010', codeValue: '3', codeName: '次级', codeDescription: '', setValid: false, valueValid: true, remark: '', updateTime: '2026-07-20 14:00:00' },
  { codeSetNo: 'CODE_LOAN_FIVE', codeSetName: '贷款五级分类代码', applicableStandards: 'STD-010', codeValue: '4', codeName: '可疑', codeDescription: '', setValid: false, valueValid: true, remark: '', updateTime: '2026-07-20 14:00:00' },
  { codeSetNo: 'CODE_LOAN_FIVE', codeSetName: '贷款五级分类代码', applicableStandards: 'STD-010', codeValue: '5', codeName: '损失', codeDescription: '', setValid: false, valueValid: true, remark: '', updateTime: '2026-07-20 14:00:00' }
]

/** 初始标准单词(R25) */
const INITIAL_WORDS: StandardWord[] = [
  {
    chineseName: '客户', englishName: 'Customer', abbreviation: 'CUST',
    synonyms: '用户, 消费者', isClassWord: false,
    remark: '零售与对公客户统称，对公客户另用 CORP', updateTime: '2026-09-10 10:00:00'
  },
  {
    chineseName: '账户', englishName: 'Account', abbreviation: 'ACCT',
    synonyms: '户头', isClassWord: false,
    remark: '与「账号」区分：ACCT 指账户实体，ACCT_NO 指编号字段', updateTime: '2026-09-11 11:00:00'
  },
  {
    chineseName: '代码', englishName: 'Code', abbreviation: 'CD',
    synonyms: '编号, 编码', isClassWord: true,
    remark: '分类词，枚举型字段命名后缀，如 GENDER_CD', updateTime: '2026-09-12 14:00:00'
  },
  {
    chineseName: '日期', englishName: 'Date', abbreviation: 'DT',
    synonyms: '时间', isClassWord: true,
    remark: '分类词，统一 DATE 全称、DT 缩写，8 位口径引用 DATE_DOMAIN 域', updateTime: '2026-09-13 16:00:00'
  },
  {
    chineseName: '余额', englishName: 'Balance', abbreviation: 'BAL',
    synonyms: '结存', isClassWord: false,
    remark: '金额类词素，搭配 AMT_DOMAIN 域使用', updateTime: '2026-09-28 11:15:00'
  },
  {
    chineseName: '标识', englishName: 'Identification', abbreviation: 'ID',
    synonyms: '编号, 主键', isClassWord: false,
    remark: '主键/唯一标识类字段前缀，如 ID_DOC_TYPE', updateTime: '2026-10-09 14:05:00'
  },
  {
    chineseName: '金额', englishName: 'Amount', abbreviation: 'AMT',
    synonyms: '数额', isClassWord: false,
    remark: '总长度 18、小数 2，口径引用 AMT_DOMAIN 域', updateTime: '2026-10-13 08:40:00'
  },
  {
    chineseName: '状态', englishName: 'Status', abbreviation: 'STS',
    synonyms: '状况', isClassWord: true,
    remark: '分类词，枚举状态字段后缀，码值须挂标准代码', updateTime: '2026-08-04 15:00:00'
  }
]

/* ══════════════════════ 全局响应式状态 ══════════════════════ */
// 用模块级 ref 模拟后端状态,组件订阅即实时刷新
const _standards = ref<Standard[]>(INITIAL_STANDARDS.map(s => ({ ...s })))
const _domains = ref<StandardDomain[]>(INITIAL_DOMAINS.map(d => ({ ...d })))
const _codeRows = ref<StdCodeRow[]>(INITIAL_CODE_ROWS.map(r => ({ ...r })))
const _words = ref<StandardWord[]>(INITIAL_WORDS.map(w => ({ ...w })))

/* ══════════════════════ 对外 API ══════════════════════ */

/** 数据标准仓库 */
export const StandardStore = {
  /** 获取所有标准 */
  getStandards(): Standard[] {
    return _standards.value
  },
  /** 按标准编号查找 */
  findByCode(code: string): Standard | undefined {
    return _standards.value.find(s => s.code === code || s.standardNo === code)
  },
  /** U2 全量覆盖:上传校验通过后整体替换,未出现在文件中的旧记录不再保留 */
  replaceAllStandards(list: Standard[]) {
    _standards.value = list
  }
}

/** 数据域仓库 */
export const DomainStore = {
  /** 获取所有数据域 */
  getDomains(): StandardDomain[] {
    return _domains.value
  },
  /** 按数据域代码查找 */
  findByCode(code: string): StandardDomain | undefined {
    return _domains.value.find(d => d.code === code)
  },
  /** R04:跳转到达态判断 —— 目标是否存在 */
  exists(code: string): boolean {
    return _domains.value.some(d => d.code === code)
  },
  /**
   * R10:引用该数据域的标准清单,由数据标准侧「所属数据域」字段自动派生,
   * 不随数据域上传变动。
   */
  referencedStandards(code: string): Array<{ standardNo: string; cnName: string }> {
    return _standards.value
      .filter(s => s.domain === code)
      .map(s => ({ standardNo: s.standardNo || s.code, cnName: s.cnName || s.name }))
  },
  /** U2 全量覆盖 */
  replaceAll(list: StandardDomain[]) {
    _domains.value = list
  }
}

/** 标准代码(代码集)仓库 */
export const StdCodeStore = {
  /** 获取全部存储行(一码一行,R24) */
  getRows(): StdCodeRow[] {
    return _codeRows.value
  },
  /**
   * 获取代码集清单(R13):按代码集编号合并去重,一个代码集只占一行,
   * 代码集层字段以首行为准,代码值按字符序升序(R18)。
   */
  getCodes(): CodeSetSummary[] {
    const groups = new Map<string, CodeSetSummary>()
    for (const row of _codeRows.value) {
      let group = groups.get(row.codeSetNo)
      if (!group) {
        group = {
          code: row.codeSetNo,
          name: row.codeSetName,
          applicableStandards: row.applicableStandards,
          valid: row.setValid,
          remark: row.remark,
          updateTime: row.updateTime,
          items: []
        }
        groups.set(row.codeSetNo, group)
      }
      group.items.push({
        value: row.codeValue,
        name: row.codeName,
        description: row.codeDescription,
        valid: row.valueValid
      })
    }
    return Array.from(groups.values()).map(g => ({
      ...g,
      items: [...g.items].sort((a, b) => compareCodeValue(a.value, b.value))
    }))
  },
  /** 按代码集编号查找(代码集层口径) */
  findByCode(code: string): CodeSetSummary | undefined {
    return StdCodeStore.getCodes().find(c => c.code === code)
  },
  /** R04:跳转到达态判断 —— 目标代码集是否存在 */
  exists(code: string): boolean {
    return _codeRows.value.some(r => r.codeSetNo === code)
  },
  /**
   * R16:引用该代码集的标准清单,由数据标准侧「关联代码集编号」字段自动派生,
   * 不随标准代码上传变动。
   */
  referencedStandards(code: string): Array<{ standardNo: string; cnName: string }> {
    return _standards.value
      .filter(s => s.codeSetNo === code)
      .map(s => ({ standardNo: s.standardNo || s.code, cnName: s.cnName || s.name }))
  },
  /** U2 全量覆盖 */
  replaceAll(list: StdCodeRow[]) {
    _codeRows.value = list
  }
}

/** 标准单词仓库 */
export const WordStore = {
  /** 获取所有标准单词 */
  getWords(): StandardWord[] {
    return _words.value
  },
  /** 按英文缩写查找 */
  findByAbbreviation(abbr: string): StandardWord | undefined {
    return _words.value.find(w => w.abbreviation === abbr)
  },
  /** U2 全量覆盖 */
  replaceAll(list: StandardWord[]) {
    _words.value = list
  }
}
