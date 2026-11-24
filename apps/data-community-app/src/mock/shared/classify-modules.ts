/**
 * F2/F4/F5 系统 + 表 + 字段 Mock 数据集
 * 5 数据源 + 20 张表 + ~100 字段
 * dmt-app（管理）+ dfd-app（消费）双侧共用
 *
 * 注意：本文件只提供「种子」，且刻意保留若干 sensitivity_level 为空串的字段 = 真实待分级。
 * 需要运行时可写 + 派生覆盖率的数据请读 classify-store.ts（ClassifyStore）。
 */
import type { ClassifySystem, ClassifyTable, ClassifyField, ClassifyLevelValue, Grade, BusinessBelonging } from './classify-types'

/**
 * 工具：批量生成字段（同模板 + 自增序号）
 * level 传空串 = 该字段待分级（用于让「待分级表数」由数据推导，而非硬编码百分比）
 */
function genFields(
  schema: string,
  table: string,
  specs: Array<{
    name: string; comment: string; belonging: BusinessBelonging | '';
    grade: Grade | ''; level: ClassifyLevelValue;
    l1: string; l2: string; l3: string; l4: string
  }>
): ClassifyField[] {
  return specs.map((s, idx) => ({
    field_name: s.name,
    field_comment: s.comment,
    business_belonging: s.belonging,
    grade: s.grade,
    sensitivity_level: s.level,
    category_l1: s.l1,
    category_l2: s.l2,
    category_l3: s.l3,
    category_l4: s.l4,
    updated_at: '2026-07-03'
  }))
}

// ================ HIVE 数仓 ================
const hiveTables: ClassifyTable[] = [
  {
    schema: 'hive_dw', table_name: 'dwd_user_info', table_comment: '用户信息明细表',
    owner: '张三', updated_at: '2026-07-03',
    fields: genFields('hive_dw', 'dwd_user_info', [
      { name: 'user_id', comment: '用户ID', belonging: '零售', grade: '一般', level: 'L2', l1: '客户信息', l2: '基础属性', l3: '用户标识', l4: '用户ID' },
      { name: 'mobile', comment: '手机号', belonging: '零售', grade: '重要', level: 'L3', l1: '客户信息', l2: '个人PII', l3: '联系方式', l4: '手机号' },
      { name: 'id_card', comment: '身份证号', belonging: '零售', grade: '关键', level: 'L4', l1: '客户信息', l2: '个人PII', l3: '身份信息', l4: '身份证号' },
      { name: 'email', comment: '邮箱', belonging: '零售', grade: '重要', level: 'L3', l1: '客户信息', l2: '个人PII', l3: '联系方式', l4: '邮箱' },
      { name: 'register_time', comment: '注册时间', belonging: '零售', grade: '一般', level: 'L1', l1: '客户信息', l2: '基础属性', l3: '账户信息', l4: '注册时间' }
    ])
  },
  {
    schema: 'hive_dw', table_name: 'dws_risk_score', table_comment: '风控评分汇总表',
    owner: '李四', updated_at: '2026-07-02',
    fields: genFields('hive_dw', 'dws_risk_score', [
      { name: 'user_id', comment: '用户ID', belonging: '风控', grade: '一般', level: 'L2', l1: '客户信息', l2: '基础属性', l3: '用户标识', l4: '用户ID' },
      { name: 'credit_score', comment: '信用评分', belonging: '风控', grade: '重要', level: 'L3', l1: '风控', l2: '模型输入', l3: '评分特征', l4: '信用评分' },
      { name: 'fraud_score', comment: '欺诈评分', belonging: '风控', grade: '重要', level: 'L3', l1: '风控', l2: '模型输入', l3: '评分特征', l4: '欺诈评分' },
      { name: 'credit_limit', comment: '授信额度', belonging: '风控', grade: '关键', level: 'L4', l1: '风控', l2: '模型输出', l3: '决策结果', l4: '授信额度' }
    ])
  },
  {
    schema: 'hive_dw', table_name: 'dwd_order_info', table_comment: '订单明细表',
    owner: '王五', updated_at: '2026-06-29',
    fields: genFields('hive_dw', 'dwd_order_info', [
      { name: 'order_id', comment: '订单号', belonging: '零售', grade: '一般', level: 'L2', l1: '业务交易', l2: '订单', l3: '订单信息', l4: '订单号' },
      { name: 'user_id', comment: '用户ID', belonging: '零售', grade: '一般', level: 'L2', l1: '客户信息', l2: '基础属性', l3: '用户标识', l4: '用户ID' },
      { name: 'pay_amount', comment: '支付金额', belonging: '财务', grade: '重要', level: 'L3', l1: '业务交易', l2: '订单', l3: '支付信息', l4: '支付金额' },
      { name: 'bank_card_no', comment: '银行卡号', belonging: '财务', grade: '关键', level: 'L4', l1: '业务交易', l2: '订单', l3: '支付信息', l4: '银行卡号' },
      { name: 'refund_amount', comment: '退款金额', belonging: '', grade: '', level: '', l1: '', l2: '', l3: '', l4: '' },
      { name: 'device_id', comment: '下单设备号', belonging: '', grade: '', level: '', l1: '', l2: '', l3: '', l4: '' }
    ])
  },
  {
    schema: 'hive_dw', table_name: 'dws_user_tag', table_comment: '用户标签汇总表',
    owner: '赵六', updated_at: '2026-07-01',
    fields: genFields('hive_dw', 'dws_user_tag', [
      { name: 'user_id', comment: '用户ID', belonging: '运营', grade: '一般', level: 'L2', l1: '客户信息', l2: '基础属性', l3: '用户标识', l4: '用户ID' },
      { name: 'pref_marketing', comment: '营销偏好', belonging: '运营', grade: '一般', level: 'L2', l1: '运营', l2: '营销触达', l3: '客户标签', l4: '营销偏好' },
      { name: 'rfm_level', comment: 'RFM分层', belonging: '运营', grade: '一般', level: 'L2', l1: '运营', l2: '营销触达', l3: '客户标签', l4: 'RFM分层' },
      { name: 'age_range', comment: '年龄段', belonging: '运营', grade: '一般', level: 'L2', l1: '运营', l2: '客户标签', l3: '人口属性', l4: '年龄段' },
      { name: 'churn_score', comment: '流失概率评分', belonging: '', grade: '', level: '', l1: '', l2: '', l3: '', l4: '' }
    ])
  }
]

// ================ 核心系统 ================
const coreTables: ClassifyTable[] = [
  {
    schema: 'crm_db', table_name: 't_user_info', table_comment: '用户主表',
    owner: '钱七', updated_at: '2026-07-03',
    fields: genFields('crm_db', 't_user_info', [
      { name: 'user_id', comment: '用户ID', belonging: '零售', grade: '一般', level: 'L2', l1: '客户信息', l2: '基础属性', l3: '用户标识', l4: '用户ID' },
      { name: 'mobile', comment: '手机号', belonging: '零售', grade: '重要', level: 'L3', l1: '客户信息', l2: '个人PII', l3: '联系方式', l4: '手机号' },
      { name: 'id_card', comment: '身份证号', belonging: '零售', grade: '关键', level: 'L4', l1: '客户信息', l2: '个人PII', l3: '身份信息', l4: '身份证号' },
      { name: 'email', comment: '邮箱', belonging: '零售', grade: '重要', level: 'L3', l1: '客户信息', l2: '个人PII', l3: '联系方式', l4: '邮箱' },
      { name: 'address', comment: '家庭住址', belonging: '零售', grade: '重要', level: 'L3', l1: '客户信息', l2: '个人PII', l3: '联系方式', l4: '家庭住址' }
    ])
  },
  {
    schema: 'crm_db', table_name: 't_account', table_comment: '账户表',
    owner: '孙八', updated_at: '2026-07-02',
    fields: genFields('crm_db', 't_account', [
      { name: 'account_no', comment: '账户号', belonging: '财务', grade: '关键', level: 'L4', l1: '财务', l2: '账户', l3: '账户信息', l4: '账户号' },
      { name: 'balance', comment: '账户余额', belonging: '财务', grade: '关键', level: 'L4', l1: '财务', l2: '账户', l3: '余额信息', l4: '账户余额' },
      { name: 'available', comment: '可用余额', belonging: '财务', grade: '关键', level: 'L4', l1: '财务', l2: '账户', l3: '余额信息', l4: '可用余额' },
      { name: 'open_date', comment: '开户日期', belonging: '财务', grade: '一般', level: 'L1', l1: '财务', l2: '账户', l3: '账户信息', l4: '开户日期' }
    ])
  },
  {
    schema: 'core_db', table_name: 't_loan_apply', table_comment: '贷款申请表',
    owner: '周九', updated_at: '2026-06-30',
    fields: genFields('core_db', 't_loan_apply', [
      { name: 'apply_id', comment: '申请编号', belonging: '零售', grade: '一般', level: 'L2', l1: '业务交易', l2: '订单', l3: '订单信息', l4: '订单号' },
      { name: 'user_id', comment: '用户ID', belonging: '零售', grade: '一般', level: 'L2', l1: '客户信息', l2: '基础属性', l3: '用户标识', l4: '用户ID' },
      { name: 'apply_amount', comment: '申请金额', belonging: '财务', grade: '重要', level: 'L3', l1: '业务交易', l2: '订单', l3: '支付信息', l4: '支付金额' },
      { name: 'id_card', comment: '身份证号', belonging: '零售', grade: '关键', level: 'L4', l1: '客户信息', l2: '个人PII', l3: '身份信息', l4: '身份证号' },
      { name: 'guarantee_type', comment: '担保方式', belonging: '', grade: '', level: '', l1: '', l2: '', l3: '', l4: '' }
    ])
  },
  {
    schema: 'core_db', table_name: 't_repay_plan', table_comment: '还款计划表',
    owner: '吴十', updated_at: '2026-07-01',
    fields: genFields('core_db', 't_repay_plan', [
      { name: 'plan_id', comment: '计划ID', belonging: '财务', grade: '一般', level: 'L1', l1: '业务交易', l2: '订单', l3: '订单信息', l4: '订单号' },
      { name: 'period', comment: '期次', belonging: '财务', grade: '一般', level: 'L1', l1: '财务', l2: '账单', l3: '账单信息', l4: '账单周期' },
      { name: 'repay_amount', comment: '应还金额', belonging: '财务', grade: '重要', level: 'L3', l1: '财务', l2: '账单', l3: '账单信息', l4: '账单金额' }
    ])
  }
]

// ================ 催收系统 ================
const collectionTables: ClassifyTable[] = [
  {
    schema: 'coll_db', table_name: 't_case', table_comment: '催收案件表',
    owner: '郑十一', updated_at: '2026-07-02',
    fields: genFields('coll_db', 't_case', [
      { name: 'case_id', comment: '案件ID', belonging: '风控', grade: '一般', level: 'L2', l1: '业务交易', l2: '订单', l3: '订单信息', l4: '订单号' },
      { name: 'user_id', comment: '用户ID', belonging: '零售', grade: '一般', level: 'L2', l1: '客户信息', l2: '基础属性', l3: '用户标识', l4: '用户ID' },
      { name: 'overdue_amount', comment: '逾期金额', belonging: '财务', grade: '重要', level: 'L3', l1: '财务', l2: '账单', l3: '账单信息', l4: '账单金额' },
      { name: 'mobile', comment: '手机号', belonging: '零售', grade: '重要', level: 'L3', l1: '客户信息', l2: '个人PII', l3: '联系方式', l4: '手机号' }
    ])
  },
  {
    schema: 'coll_db', table_name: 't_action_log', table_comment: '催收行动日志',
    owner: '王十二', updated_at: '2026-07-03',
    fields: genFields('coll_db', 't_action_log', [
      { name: 'action_id', comment: '行动ID', belonging: '风控', grade: '一般', level: 'L1', l1: '业务交易', l2: '订单', l3: '交易明细', l4: '交易时间' },
      { name: 'action_type', comment: '行动类型', belonging: '风控', grade: '一般', level: 'L1', l1: '业务交易', l2: '订单', l3: '交易明细', l4: '交易状态' }
    ])
  },
  {
    schema: 'coll_db', table_name: 't_visit_record', table_comment: '外访记录表',
    owner: '陈十三', updated_at: '2026-06-25',
    fields: genFields('coll_db', 't_visit_record', [
      { name: 'record_id', comment: '记录ID', belonging: '风控', grade: '一般', level: 'L1', l1: '业务交易', l2: '订单', l3: '交易明细', l4: '交易时间' },
      { name: 'visit_address', comment: '外访地址', belonging: '零售', grade: '重要', level: 'L3', l1: '客户信息', l2: '个人PII', l3: '联系方式', l4: '家庭住址' },
      { name: 'visit_time', comment: '外访时间', belonging: '', grade: '', level: '', l1: '', l2: '', l3: '', l4: '' },
      { name: 'visit_result', comment: '外访结果', belonging: '', grade: '', level: '', l1: '', l2: '', l3: '', l4: '' }
    ])
  },
  {
    schema: 'coll_db', table_name: 't_outbound_call', table_comment: '外呼通话记录',
    owner: '杨十四', updated_at: '2026-07-01',
    fields: genFields('coll_db', 't_outbound_call', [
      { name: 'call_id', comment: '通话ID', belonging: '风控', grade: '一般', level: 'L1', l1: '业务交易', l2: '订单', l3: '交易明细', l4: '交易时间' },
      { name: 'called_mobile', comment: '被叫号码', belonging: '零售', grade: '重要', level: 'L3', l1: '客户信息', l2: '个人PII', l3: '联系方式', l4: '手机号' }
    ])
  }
]

// ================ 客服系统 ================
const serviceTables: ClassifyTable[] = [
  {
    schema: 'cs_db', table_name: 't_ticket', table_comment: '工单主表',
    owner: '黄十五', updated_at: '2026-07-03',
    fields: genFields('cs_db', 't_ticket', [
      { name: 'ticket_id', comment: '工单号', belonging: '运营', grade: '一般', level: 'L1', l1: '业务交易', l2: '订单', l3: '交易明细', l4: '交易时间' },
      { name: 'user_id', comment: '用户ID', belonging: '零售', grade: '一般', level: 'L2', l1: '客户信息', l2: '基础属性', l3: '用户标识', l4: '用户ID' },
      { name: 'mobile', comment: '手机号', belonging: '零售', grade: '重要', level: 'L3', l1: '客户信息', l2: '个人PII', l3: '联系方式', l4: '手机号' }
    ])
  },
  {
    schema: 'cs_db', table_name: 't_satisfaction', table_comment: '满意度评价',
    owner: '刘十六', updated_at: '2026-07-02',
    fields: genFields('cs_db', 't_satisfaction', [
      { name: 'eval_id', comment: '评价ID', belonging: '运营', grade: '一般', level: 'L1', l1: '业务交易', l2: '订单', l3: '交易明细', l4: '交易时间' },
      { name: 'score', comment: '评分', belonging: '运营', grade: '一般', level: 'L1', l1: '运营', l2: '客户标签', l3: '人口属性', l4: '年龄段' }
    ])
  },
  {
    schema: 'cs_db', table_name: 't_agent', table_comment: '坐席信息表',
    owner: '徐十七', updated_at: '2026-06-30',
    fields: genFields('cs_db', 't_agent', [
      { name: 'agent_id', comment: '坐席ID', belonging: '运营', grade: '一般', level: 'L1', l1: '客户信息', l2: '基础属性', l3: '用户标识', l4: '用户ID' },
      { name: 'agent_name', comment: '坐席姓名', belonging: '运营', grade: '一般', level: 'L1', l1: '客户信息', l2: '基础属性', l3: '用户标识', l4: '客户编号' }
    ])
  },
  {
    schema: 'cs_db', table_name: 't_call_recording', table_comment: '通话录音',
    owner: '马十八', updated_at: '2026-06-28',
    fields: genFields('cs_db', 't_call_recording', [
      { name: 'rec_id', comment: '录音ID', belonging: '运营', grade: '一般', level: 'L1', l1: '业务交易', l2: '订单', l3: '交易明细', l4: '交易时间' },
      { name: 'user_mobile', comment: '用户手机', belonging: '零售', grade: '重要', level: 'L3', l1: '客户信息', l2: '个人PII', l3: '联系方式', l4: '手机号' },
      { name: 'rec_duration', comment: '录音时长(秒)', belonging: '', grade: '', level: '', l1: '', l2: '', l3: '', l4: '' }
    ])
  }
]

// ================ 风险决策引擎 ================
const riskTables: ClassifyTable[] = [
  {
    schema: 'risk_db', table_name: 't_decision', table_comment: '决策结果表',
    owner: '胡十九', updated_at: '2026-07-03',
    fields: genFields('risk_db', 't_decision', [
      { name: 'decision_id', comment: '决策ID', belonging: '风控', grade: '一般', level: 'L2', l1: '风控', l2: '模型输出', l3: '决策结果', l4: '授信额度' },
      { name: 'user_id', comment: '用户ID', belonging: '零售', grade: '一般', level: 'L2', l1: '客户信息', l2: '基础属性', l3: '用户标识', l4: '用户ID' },
      { name: 'credit_score', comment: '信用评分', belonging: '风控', grade: '重要', level: 'L3', l1: '风控', l2: '模型输入', l3: '评分特征', l4: '信用评分' },
      { name: 'credit_limit', comment: '授信额度', belonging: '风控', grade: '关键', level: 'L4', l1: '风控', l2: '模型输出', l3: '决策结果', l4: '授信额度' },
      { name: 'interest_rate', comment: '利率', belonging: '风控', grade: '重要', level: 'L3', l1: '风控', l2: '模型输出', l3: '决策结果', l4: '利率' }
    ])
  },
  {
    schema: 'risk_db', table_name: 't_rule_hit', table_comment: '规则命中日志',
    owner: '朱二十', updated_at: '2026-07-02',
    fields: genFields('risk_db', 't_rule_hit', [
      { name: 'hit_id', comment: '命中ID', belonging: '风控', grade: '一般', level: 'L1', l1: '业务交易', l2: '订单', l3: '交易明细', l4: '交易时间' },
      { name: 'rule_id', comment: '规则ID', belonging: '风控', grade: '一般', level: 'L1', l1: '风控', l2: '模型输入', l3: '评分特征', l4: '信用评分' }
    ])
  },
  {
    schema: 'risk_db', table_name: 't_feature', table_comment: '特征表',
    owner: '秦廿一', updated_at: '2026-07-01',
    fields: genFields('risk_db', 't_feature', [
      { name: 'feature_id', comment: '特征ID', belonging: '风控', grade: '一般', level: 'L1', l1: '风控', l2: '模型输入', l3: '评分特征', l4: '信用评分' },
      { name: 'feature_name', comment: '特征名', belonging: '风控', grade: '一般', level: 'L1', l1: '风控', l2: '模型输入', l3: '评分特征', l4: '欺诈评分' }
    ])
  },
  {
    schema: 'risk_db', table_name: 't_strategy', table_comment: '策略配置表',
    owner: '尤廿二', updated_at: '2026-06-30',
    fields: genFields('risk_db', 't_strategy', [
      { name: 'strategy_id', comment: '策略ID', belonging: '风控', grade: '一般', level: 'L1', l1: '风控', l2: '模型输出', l3: '决策结果', l4: '授信额度' },
      { name: 'strategy_name', comment: '策略名', belonging: '风控', grade: '一般', level: 'L1', l1: '风控', l2: '模型输出', l3: '决策结果', l4: '利率' }
    ])
  }
]

/** 5 个数据源 */
export const classifySystemsData: ClassifySystem[] = [
  {
    id: 'SYS-001', name: 'HIVE 数仓', description: '数据仓库底表，含 ODS/DWD/DWS/ADS 全域数据',
    icon: 'icon-storage', tableCount: 4, fieldCount: 17,
    distribution: { L1: 4, L2: 5, L3: 5, L4: 3 },
    tables: hiveTables
  },
  {
    id: 'SYS-002', name: '核心系统', description: '业务核心交易系统，含用户、账户、贷款等核心表',
    icon: 'icon-robot', tableCount: 4, fieldCount: 17,
    distribution: { L1: 3, L2: 5, L3: 4, L4: 5 },
    tables: coreTables
  },
  {
    id: 'SYS-003', name: '催收系统', description: '贷后催收业务系统，含案件、外访、外呼等',
    icon: 'icon-notification', tableCount: 4, fieldCount: 10,
    distribution: { L1: 5, L2: 2, L3: 3, L4: 0 },
    tables: collectionTables
  },
  {
    id: 'SYS-004', name: '客服系统', description: '客户服务系统，含工单、满意度、坐席等',
    icon: 'icon-service', tableCount: 4, fieldCount: 9,
    distribution: { L1: 6, L2: 1, L3: 2, L4: 0 },
    tables: serviceTables
  },
  {
    id: 'SYS-005', name: '风险决策引擎', description: '风控决策系统，含决策、规则、特征、策略',
    icon: 'icon-safe', tableCount: 4, fieldCount: 11,
    distribution: { L1: 5, L2: 2, L3: 2, L4: 2 },
    tables: riskTables
  }
]

/** 扁平表列表（按 system 分组） */
export const classifyAllTables: Array<ClassifyTable & { system_id: string; system_name: string }> = classifySystemsData.flatMap(sys =>
  sys.tables.map(t => ({ ...t, system_id: sys.id, system_name: sys.name }))
)

/**
 * 派生分级覆盖率：已定级字段数 / 总字段数。
 * 种子不再写 coverage，避免「硬编码百分比 vs 字段实况」两套口径漂移。
 */
export function deriveCoverage(t: ClassifyTable): number {
  if (!t.fields.length) return 0
  const classified = t.fields.filter(f => f.sensitivity_level !== '').length
  return Math.round((classified / t.fields.length) * 100)
}

/** 统计卡数据（入口页顶部；运行时可写的口径请走 ClassifyStore.statsFor） */
export const classifyStats = (() => {
  const coverages = classifyAllTables.map(deriveCoverage)
  return {
    totalTables: classifyAllTables.length,
    classifiedTables: coverages.filter(c => c === 100).length,
    pendingTables: coverages.filter(c => c < 100).length,
    coverageRate: Math.round(
      (coverages.reduce((s, c) => s + c, 0) / classifyAllTables.length) * 10
    ) / 10
  }
})()
