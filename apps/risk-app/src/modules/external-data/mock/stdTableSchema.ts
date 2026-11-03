/**
 * 落库标准底表字段清单 · Mock 数据源
 *
 * 定位：外数落库目标表（dw_ods.ods_ext_{机构}_retro_std，见 mock/hiveTables.ts）的**列级元数据**，
 *      comment 即建表 DDL 上的字段注释，是「标准字段说明」的唯一事实源。
 *
 * 为什么单独建文件：
 *   1. hiveTables.ts 只有表级信息（columnCount），没有列级 comment，无法支撑「选中标准字段后带出说明」；
 *   2. 标准字段说明原先散落在 stdFieldLibrary.ts 手写，容易与底表 DDL 漂移；
 *      现由本文件承载，stdFieldLibrary.ts 只做派生，保证回溯落库页与本模块口径一致。
 */

/** 落库标准底表列 */
export interface StdTableColumn {
  /** 底表列名（= 标准落库字段名） */
  column: string
  /** 底表字段注释（DDL comment） */
  comment: string
  /** 列类型，仅用于说明展示，映射本身不做类型转化 */
  type: string
  /** 字段分组，用于下拉分组展示 */
  group: string
  /** 是否强制绑定列（主体标识与分区日期） */
  required: boolean
}

/** 落库标准底表（机构表结构一致，此处以通用标准表命名） */
export const STD_TARGET_TABLE = 'dw_ods.ods_ext_retro_std'

/** 非标准化字段落库列名：撞不上标准列的接口字段原样透传到该列 */
export const EXTRA_PARAM_COLUMN = 'extraParam'

/** 落库标准底表全部列 */
export const stdTableColumnsMock: StdTableColumn[] = [
  { column: 'id_md5', comment: '加密MD5字段（主体唯一标识，SM4 加密）', type: 'STRING', group: '主键标识', required: true },
  { column: 'review_date', comment: '回溯日期（按天分区写入 datax）', type: 'STRING', group: '主键标识', required: true },
  { column: 'phone_md5', comment: '加密手机号字段（手机号 MD5 密文）', type: 'STRING', group: '主键标识', required: true },
  { column: 'std_loan_cnt_1m', comment: '近1月贷款审批次数', type: 'INT', group: '借贷行为', required: false },
  { column: 'std_loan_cnt_3m', comment: '近3月贷款审批次数', type: 'INT', group: '借贷行为', required: false },
  { column: 'std_loan_cnt_12m', comment: '近12月贷款审批次数', type: 'INT', group: '借贷行为', required: false },
  { column: 'std_overdue_amt_max', comment: '最大逾期金额', type: 'DECIMAL', group: '逾期表现', required: false },
  { column: 'std_overdue_cnt_24m', comment: '近24月逾期次数', type: 'INT', group: '逾期表现', required: false },
  { column: 'std_apply_inst_cnt_1m', comment: '近1月申请机构数', type: 'INT', group: '借贷行为', required: false },
  { column: 'std_credit_score', comment: '授信评分', type: 'INT', group: '信用评分', required: false },
  { column: 'std_risk_level_code', comment: '风险分层档位', type: 'STRING', group: '信用评分', required: false },
  { column: 'std_credit_query_cnt_6m', comment: '近6月征信查询次数', type: 'INT', group: '征信查询', required: false },
  { column: 'std_loan_amount_sum_12m', comment: '近12月放款金额合计', type: 'DECIMAL', group: '借贷行为', required: false },
  { column: 'std_overdue_days_max', comment: '最大逾期天数', type: 'INT', group: '逾期表现', required: false },
  { column: 'std_account_open_months', comment: '账户开户时长（月）', type: 'INT', group: '账户属性', required: false },
  { column: 'std_card_cnt', comment: '名下银行卡数量', type: 'INT', group: '账户属性', required: false },
  { column: 'std_guarantee_cnt_12m', comment: '近12月担保笔数', type: 'INT', group: '借贷行为', required: false },
  { column: 'std_reject_cnt_12m', comment: '近12月拒绝次数', type: 'INT', group: '借贷行为', required: false },
  { column: 'std_inquiry_org_cnt_3m', comment: '近3月查询机构数', type: 'INT', group: '征信查询', required: false },
  { column: 'std_credit_card_overdue_cnt_6m', comment: '近6月信用卡逾期次数', type: 'INT', group: '逾期表现', required: false },
  { column: 'std_limit_amt_total', comment: '授信额度合计', type: 'DECIMAL', group: '账户属性', required: false },
  { column: 'std_risk_score_v3', comment: '风险评分V3（内部模型）', type: 'INT', group: '信用评分', required: false },
  { column: 'std_multiloan_idx', comment: '多头借贷指数', type: 'DOUBLE', group: '信用评分', required: false },
]

/** 底表列全集 */
export function getStdTableColumns(): StdTableColumn[] {
  return stdTableColumnsMock
}

/** 底表列名列表 */
export function getStdTableColumnNames(): string[] {
  return stdTableColumnsMock.map((c) => c.column)
}

/** 是否为落库底表已有列 */
export function isStdTableColumn(column: string): boolean {
  return stdTableColumnsMock.some((c) => c.column === column)
}

/**
 * 取底表字段注释
 * 未命中底表列时返回横杠「—」，与回溯落库页对未收录字段的展示口径一致
 */
export function getStdTableColumnComment(column: string): string {
  return stdTableColumnsMock.find((c) => c.column === column)?.comment || '—'
}
