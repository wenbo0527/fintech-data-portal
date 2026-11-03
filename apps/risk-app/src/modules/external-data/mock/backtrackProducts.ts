/**
 * 外数回溯产品与出参字段 · Mock 数据源
 * 需求文档《外数文件落库》B2（R28-R39）
 *
 * 数据来源说明：
 *   1. 已收录产品沿用 BacktrackPersist.vue 既有 productOptions（百行-多头借贷汇总 V4 / 朴道-历史逾期明细 /
 *      钱塘-授信评分回溯）及接口号（BH1023 / PD2048 / QT3015），保持改造前后口径一致；
 *   2. 每个产品的出参字段列表取自原 sourceFieldCatalog，字段说明一并保留；
 *   3. **产品一律带 productCode**（与档案主键 id 同一口径）：回溯/离线型的档案产品由
 *      listBacktrackProducts 直接从 archiveProducts 主数据派生（字段名与说明取档案出参）；
 *      静态条目只给已建档的填 productCode，其余为 ''（这类场景产品尚未建档，
 *      没有产品级默认映射可继承，只能走自动碰撞 + 人工匹配）；
 *   4. 与 external-data/mock/supplierProducts.ts 的 externalDataFieldsMap 区分：
 *      后者是「在线调用外数底表字段字典」，本文件是「回溯落库场景的产品与 CSV 出参字段字典」；
 *   5. R28/R30/R31：未收录产品为固定选项，字段说明统一显示「—」，标准库字段用输入框人工填写；
 *   6. 字段名→标准库字段的碰撞字典不在本文件维护（单一事实源在 interfaceFieldMapping.AUTO_MATCH_DICT）。
 */
import { creditAgenciesMock } from './creditAgencies'
import { loadArchiveProducts, resolveOutputParams, type ArchiveProduct } from './archiveProducts'

/** 有落库环节、可进回溯向导的档案数据类型（在线实时调用无落库概念，不进列表） */
const PERSIST_DATA_TYPES = ['外数离线回溯申请', '离线批量调用']

/** 外数产品出参字段 */
export interface ProductSourceField {
  /** CSV 表头字段名 */
  name: string
  /** 字段说明（未收录产品统一为「—」） */
  comment: string
}

/** 回溯场景外数产品 */
export interface BacktrackProduct {
  /** 产品名称 */
  name: string
  /** 接口号 */
  interfaceId: string
  /** 归属机构编码 */
  agencyCode: string
  /**
   * 关联的档案产品编码（与档案主键 id / productCode 同一口径）
   * 非空才能继承档案的产品级默认映射；空串表示该产品尚未建档
   */
  productCode: string
  /** 是否已收录（R28：已收录拉底表字段，未收录走固定选项） */
  registered: boolean
  /** 出参字段清单 */
  fields: ProductSourceField[]
}

/** 未收录产品固定选项名（R30） */
export const CUSTOM_PRODUCT = '未收录外数产品'

/** 回溯产品清单 */
export const backtrackProductsMock: BacktrackProduct[] = [
  {
    name: '百行-多头借贷汇总 V4',
    interfaceId: 'BH1023',
    agencyCode: 'BH',
    // 档案侧只有信用评分/查询类百行产品，与「多头借贷汇总」不同口径，不强行关联
    productCode: '',
    registered: true,
    fields: [
      { name: 'id_md5', comment: '主体标识（MD5加密）' },
      { name: 'phone_md5', comment: '手机号标识（MD5加密）' },
      { name: 'inst_cnt_1m', comment: '近1月申请机构数' },
      { name: 'loan_cnt_1m', comment: '近1月贷款审批次数' },
      { name: 'loan_cnt_3m', comment: '近3月贷款审批次数' },
      { name: 'loan_cnt_12m', comment: '近12月贷款审批次数' },
      { name: 'max_overdue_amt', comment: '最大逾期金额' },
      { name: 'risk_band', comment: '风险分层档位' },
      { name: 'review_data', comment: '回溯日期' },
    ],
  },
  {
    name: '朴道-历史逾期明细',
    interfaceId: 'PD2048',
    agencyCode: 'PD',
    // 朴道档案产品均为设备/位置/行为风控类，无逐期明细回溯产品
    productCode: '',
    registered: true,
    fields: [
      { name: 'id_md5', comment: '主体标识（MD5加密）' },
      { name: 'phone_md5', comment: '手机号标识（MD5加密）' },
      { name: 'overdue_cnt_24m', comment: '近24月逾期次数' },
      { name: 'max_overdue_amt', comment: '最大逾期金额' },
      { name: 'review_data', comment: '回溯日期' },
    ],
  },
  {
    name: '钱塘-授信评分回溯',
    interfaceId: 'QT3015',
    agencyCode: 'QT',
    // 钱塘三个产品（QT_CREDIT_RISK_SCORE 等）只在供应商产品清单里，尚未建档（一致性守卫 G2 已跟踪）
    productCode: '',
    registered: true,
    fields: [
      { name: 'id_md5', comment: '主体标识（MD5加密）' },
      { name: 'phone_md5', comment: '手机号标识（MD5加密）' },
      { name: 'credit_score', comment: '授信评分' },
      { name: 'risk_band', comment: '风险分层档位' },
      { name: 'review_data', comment: '回溯日期' },
    ],
  },
  {
    name: '人行征信-公共基础信息回溯',
    interfaceId: 'PBC1001',
    agencyCode: 'PBC',
    productCode: '',
    registered: true,
    fields: [
      { name: 'id_md5', comment: '主体标识（MD5加密）' },
      { name: 'phone_md5', comment: '手机号标识（MD5加密）' },
      { name: 'credit_query_cnt_6m', comment: '近6月征信查询次数' },
      { name: 'card_cnt', comment: '名下银行卡数量' },
      { name: 'account_open_months', comment: '账户开户时长（月）' },
      { name: 'review_data', comment: '回溯日期' },
    ],
  },
  {
    name: '上海数据集团-工商司法信息回溯',
    interfaceId: 'SHGJ2006',
    agencyCode: 'SHGJ',
    /** 已建档：档案 ED-021「工商司法信息回溯」，向导可直接继承其产品级默认映射 */
    productCode: 'SHGJ_ENTERPRISE_JUDICIAL',
    registered: true,
    fields: [
      { name: 'id_md5', comment: '主体标识（MD5加密）' },
      { name: 'enterprise_risk_score', comment: '企业风险评分' },
      { name: 'legal_case_cnt', comment: '涉诉案件数' },
      { name: 'tax_arrear_flag', comment: '欠税标识' },
      { name: 'review_data', comment: '回溯日期' },
    ],
  },
  {
    name: CUSTOM_PRODUCT,
    interfaceId: '',
    agencyCode: '',
    productCode: '',
    registered: false,
    fields: [
      { name: 'q_id', comment: '—' },
      { name: 'id_md5', comment: '—' },
      { name: 'review_data', comment: '—' },
      { name: 'loan_cnt_12m', comment: '—' },
      { name: 'max_overdue_amt', comment: '—' },
      { name: 'ext_score_v2', comment: '—' },
      { name: 'ext_tag_list', comment: '—' },
    ],
  },
]

/** 机构编码 → 合作机构全称（档案上的 cooperationOrg 就是这个字符串） */
function agencyCodeOfName(agencyName: string): string {
  return creditAgenciesMock.find((a) => a.agencyName === agencyName)?.agencyCode || ''
}

/** 全量清单＝静态场景条目 + 档案派生条目（按 productCode 去重，已建档的不重复出现） */
function allBacktrackProducts(): BacktrackProduct[] {
  const linked = new Set(backtrackProductsMock.map((p) => p.productCode).filter(Boolean))
  const derived: BacktrackProduct[] = loadArchiveProducts()
    .filter((p: ArchiveProduct) => PERSIST_DATA_TYPES.includes(String(p.externalDataType || '')) && !linked.has(String(p.id)))
    .map((p: ArchiveProduct) => ({
      name: p.name,
      interfaceId: p.interfaceNo || '',
      agencyCode: agencyCodeOfName(p.cooperationOrg),
      productCode: String(p.id),
      registered: true,
      fields: resolveOutputParams(p).map((f) => ({ name: f.name, comment: f.description || '—' })),
    }))
  return [...backtrackProductsMock, ...derived]
}

/** 按名称查询产品 */
export async function getBacktrackProduct(name: string): Promise<BacktrackProduct | undefined> {
  return allBacktrackProducts().find((p) => p.name === name)
}

/** 按产品编码查询产品（映射继承与回写靠这个键，不再靠名称） */
export async function getBacktrackProductByCode(productCode: string): Promise<BacktrackProduct | undefined> {
  if (!productCode) {return undefined}
  return allBacktrackProducts().find((p) => p.productCode === productCode)
}

/** 按机构查询产品（R29 已收录产品随机构联动，未收录选项恒在列表里） */
export async function listBacktrackProducts(agencyCode?: string): Promise<BacktrackProduct[]> {
  const all = allBacktrackProducts()
  if (!agencyCode) {return all}
  return all.filter((p) => p.agencyCode === agencyCode || !p.registered)
}
