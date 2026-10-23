/**
 * 落库标准字段库 · Mock 数据源
 * 需求文档《外数文件落库》B2（R30-R40）
 *
 * 数据来源说明：
 *   1. 标准字段名沿用 BacktrackPersist.vue 既有 stdFieldOptions（id_md5 / review_date / std_* 系列），
 *      保持与历史页面口径一致，避免改造后落库列名漂移；
 *   2. 字段说明（comment）为本次新增，文档 R30 要求：命中标准字段时展示说明，
 *      未收录外数产品（R31）字段说明统一显示横杠「—」；
 *   3. 与 external-data/mock/supplierProducts.ts 的 externalDataFieldsMap 区分：
 *      前者是「外数底表出参字段字典」，本文件是「落库标准库字段字典」，两者不可混用。
 */

export interface StdField {
  /** 标准库字段名（R40 写入标准表的列名） */
  field: string
  /** 字段说明（R30 命中标准字段时展示） */
  comment: string
  /** 字段分组，仅用于列表分组展示 */
  group: string
  /** 是否为强制绑定字段（R32：IDMD5、review date） */
  required: boolean
}

/** 落库标准字段库全集 */
export const stdFieldLibraryMock: StdField[] = [
  { field: 'id_md5', comment: '加密MD5字段（主体唯一标识，SM4 加密）', group: '主键标识', required: true },
  { field: 'review_date', comment: '回溯日期（按天分区写入 datax）', group: '主键标识', required: true },
  { field: 'std_loan_cnt_1m', comment: '近1月贷款审批次数', group: '借贷行为', required: false },
  { field: 'std_loan_cnt_3m', comment: '近3月贷款审批次数', group: '借贷行为', required: false },
  { field: 'std_loan_cnt_12m', comment: '近12月贷款审批次数', group: '借贷行为', required: false },
  { field: 'std_overdue_amt_max', comment: '最大逾期金额', group: '逾期表现', required: false },
  { field: 'std_overdue_cnt_24m', comment: '近24月逾期次数', group: '逾期表现', required: false },
  { field: 'std_apply_inst_cnt_1m', comment: '近1月申请机构数', group: '借贷行为', required: false },
  { field: 'std_credit_score', comment: '授信评分', group: '信用评分', required: false },
  { field: 'std_risk_level_code', comment: '风险分层档位', group: '信用评分', required: false },
  { field: 'std_credit_query_cnt_6m', comment: '近6月征信查询次数', group: '征信查询', required: false },
  { field: 'std_loan_amount_sum_12m', comment: '近12月放款金额合计', group: '借贷行为', required: false },
  { field: 'std_overdue_days_max', comment: '最大逾期天数', group: '逾期表现', required: false },
  { field: 'std_account_open_months', comment: '账户开户时长（月）', group: '账户属性', required: false },
  { field: 'std_card_cnt', comment: '名下银行卡数量', group: '账户属性', required: false },
  { field: 'std_guarantee_cnt_12m', comment: '近12月担保笔数', group: '借贷行为', required: false },
  { field: 'std_reject_cnt_12m', comment: '近12月拒绝次数', group: '借贷行为', required: false },
  { field: 'std_inquiry_org_cnt_3m', comment: '近3月查询机构数', group: '征信查询', required: false },
  { field: 'std_credit_card_overdue_cnt_6m', comment: '近6月信用卡逾期次数', group: '逾期表现', required: false },
  { field: 'std_limit_amt_total', comment: '授信额度合计', group: '账户属性', required: false },
  { field: 'std_risk_score_v3', comment: '风险评分V3（内部模型）', group: '信用评分', required: false },
  { field: 'std_multiloan_idx', comment: '多头借贷指数', group: '信用评分', required: false },
]

/** 强制绑定字段（R32）：IDMD5 与 review date，均需从 CSV 表头中选择 */
export const REQUIRED_STD_FIELDS = ['id_md5', 'review_date']

/** 非标准化字段占位值（R34/R38）：选中后原样透传，序列化写入 extraParam 列 */
export const NON_STD_FIELD = '__non_standard__'

/** 非标准化字段落库列名（R38 文档字段名为 extraParam） */
export const EXTRA_PARAM_COLUMN = 'extraParam'

/** 标准库字段下拉选项（仅字段名） */
export function getStdFieldNames(): string[] {
  return stdFieldLibraryMock.map((f) => f.field)
}

/** 按字段名查询标准字段说明，未命中返回横杠「—」 */
export function getStdFieldComment(field: string): string {
  return stdFieldLibraryMock.find((f) => f.field === field)?.comment || '—'
}
