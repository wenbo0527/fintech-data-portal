/**
 * 外数回溯产品与出参字段 · Mock 数据源
 * 需求文档《外数文件落库》B2（R28-R39）
 *
 * 数据来源说明：
 *   1. 已收录产品沿用 BacktrackPersist.vue 既有 productOptions（百行-多头借贷汇总 V4 / 朴道-历史逾期明细 /
 *      钱塘-授信评分回溯）及接口号（BH1023 / PD2048 / QT3015），保持改造前后口径一致；
 *   2. 每个产品的出参字段列表取自原 sourceFieldCatalog，字段说明一并保留；
 *   3. 与 external-data/mock/supplierProducts.ts 的 externalDataFieldsMap 区分：
 *      后者是「在线调用外数底表字段字典」，本文件是「回溯落库场景的产品与 CSV 出参字段字典」；
 *   4. R28/R30/R31：未收录产品为固定选项，字段说明统一显示「—」，标准库字段用输入框人工填写。
 */

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

/** 外数出参字段 → 标准库字段的自动碰撞字典（R33） */
export const collisionDict: Record<string, string> = {
  phone_md5: 'phone_md5',
  inst_cnt_1m: 'std_apply_inst_cnt_1m',
  loan_cnt_1m: 'std_loan_cnt_1m',
  loan_cnt_3m: 'std_loan_cnt_3m',
  loan_cnt_12m: 'std_loan_cnt_12m',
  max_overdue_amt: 'std_overdue_amt_max',
  overdue_cnt_24m: 'std_overdue_cnt_24m',
  overdue_days_max: 'std_overdue_days_max',
  credit_score: 'std_credit_score',
  risk_band: 'std_risk_level_code',
  credit_query_cnt_6m: 'std_credit_query_cnt_6m',
  card_cnt: 'std_card_cnt',
  account_open_months: 'std_account_open_months',
  limit_amt_total: 'std_limit_amt_total',
}

/** 按名称查询产品 */
export async function getBacktrackProduct(name: string): Promise<BacktrackProduct | undefined> {
  return backtrackProductsMock.find((p) => p.name === name)
}

/** 按机构查询产品（R29 已收录产品随机构联动） */
export async function listBacktrackProducts(agencyCode?: string): Promise<BacktrackProduct[]> {
  if (!agencyCode) return [...backtrackProductsMock]
  return backtrackProductsMock.filter((p) => p.agencyCode === agencyCode || !p.registered)
}
