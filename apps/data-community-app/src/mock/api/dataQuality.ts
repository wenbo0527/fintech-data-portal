/**
 * 数据质量管理 Mock API
 * 模块：校验任务管理 / 任务实例与日志
 *
 * 改进：支持添加多条校验规则（每条规则独立选字段、独立校验类型）
 * P2：规则打五维质量标签（完整性/准确性/一致性/及时性/唯一性），
 *     检查结果为写死的预置样例（挡板，不做真实扫描），支持评分回流资产目录。
 */
import {
  TableCatalogStore,
  QUALITY_DIM_LABELS,
  QUALITY_WEIGHTS,
  computeQualityScore,
  type QualityDims
} from '../shared/table-catalog-store'

// ==================== 质量维度（五维标签） ====================

export type QualityDimension = 'completeness' | 'accuracy' | 'consistency' | 'timeliness' | 'uniqueness'

/** 五维顺序（列表/看板统一按此顺序展示） */
export const QUALITY_DIMENSIONS: QualityDimension[] = [
  'completeness', 'accuracy', 'consistency', 'timeliness', 'uniqueness'
]

export const QUALITY_DIM_COLORS: Record<QualityDimension, string> = {
  completeness: 'arcoblue',
  accuracy: 'purple',
  consistency: 'cyan',
  timeliness: 'orange',
  uniqueness: 'green'
}

/** 与资产目录五维保持同一套语义（唯一事实源在 table-catalog-store） */
export { QUALITY_DIM_LABELS, QUALITY_WEIGHTS, computeQualityScore }
export type { QualityDims }

/** 校验类型 → 默认维度（历史规则未打标时兜底为一致性） */
export const RULE_TYPE_DEFAULT_DIM: Record<'count' | 'sum', QualityDimension> = {
  count: 'consistency',
  sum: 'accuracy'
}

// ==================== 类型定义 ====================

export interface DataSource {
  id: string
  name: string
  type: string
  status: string
}

export interface QualityRule {
  id: string
  name: string
  type: 'count' | 'sum'
  /** P2 新增：规则所属质量维度（五维标签） */
  dimension: QualityDimension
  sourceField: string | null
  targetField: string | null
}

export interface QualityTask {
  id: string
  name: string
  creator: string
  status: 'active' | 'inactive'
  rules: QualityRule[]
  scheduleType: 'daily' | 'weekly'
  scheduleTime: string
  scheduleDay: string | null
  source: {
    datasourceId: string
    datasourceName: string
    database: string
    table: string
    partition: string
    isPartitioned: boolean
  }
  target: {
    datasourceId: string
    datasourceName: string
    database: string
    table: string
    partition: string
    isPartitioned: boolean
  }
  timeout: number
  description: string
  lastRunStatus: 'consistent' | 'inconsistent' | 'failed' | null
  lastRunTime: string | null
  createdAt: string
  updatedAt: string
}

/** 预置样例指标（挡板文案，如「缺失率 2.3%」「命中 15,000 行」） */
export interface RuleMetric {
  label: string
  value: string
}

export interface RuleResult {
  ruleId: string
  ruleName: string
  type: 'count' | 'sum'
  /** P2：规则所属质量维度 */
  dimension: QualityDimension
  sourceValue: number
  targetValue: number
  diffValue: number
  isConsistent: boolean
  /** P2：该规则的单维得分（用于换算五维分回填资产目录） */
  dimensionScore: number
  /** P2：阈值（得分低于该值视为超阈值） */
  threshold: number
  /** P2：预置样例指标列表 */
  metrics: RuleMetric[]
}

export interface QualityInstance {
  id: string
  taskId: string
  taskName: string
  status: 'consistent' | 'inconsistent' | 'failed'
  results: RuleResult[]
  duration: number
  runTime: string
  finishTime: string
  log: string
  /** P2：目标端表名（评分回流资产目录的定位键） */
  targetTable: string
  /** P2：源端表名 */
  sourceTable: string
}

// ==================== 预置样例结果（挡板：写死，不做真实扫描） ====================

interface DimSample {
  /** 规则通过（两端一致）时展示的预置指标 */
  pass: { score: number; metrics: RuleMetric[] }
  /** 规则超阈值（不一致）时展示的预置指标 */
  breach: { score: number; metrics: RuleMetric[] }
}

const DIM_SAMPLES: Record<QualityDimension, DimSample> = {
  completeness: {
    pass: {
      score: 98,
      metrics: [
        { label: '缺失率', value: '0.4%' },
        { label: '命中行数', value: '2,608 行' },
        { label: '扫描总行数', value: '652,180 行' },
        { label: '阈值', value: '≤ 1%' }
      ]
    },
    breach: {
      score: 82,
      metrics: [
        { label: '缺失率', value: '2.3%' },
        { label: '命中行数', value: '15,000 行' },
        { label: '扫描总行数', value: '652,180 行' },
        { label: '阈值', value: '≤ 1%' }
      ]
    }
  },
  accuracy: {
    pass: {
      score: 96,
      metrics: [
        { label: '格式异常率', value: '0.6%' },
        { label: '命中行数', value: '3,910 行' },
        { label: '金额偏差', value: '0.02%' },
        { label: '阈值', value: '≤ 1%' }
      ]
    },
    breach: {
      score: 78,
      metrics: [
        { label: '格式异常率', value: '1.9%' },
        { label: '命中行数', value: '12,470 行' },
        { label: '金额偏差', value: '0.34%' },
        { label: '阈值', value: '≤ 1%' }
      ]
    }
  },
  consistency: {
    pass: {
      score: 97,
      metrics: [
        { label: '两端差异率', value: '0.00%' },
        { label: '命中行数', value: '0 行' },
        { label: '比对行数', value: '652,180 行' },
        { label: '阈值', value: '= 0 差异' }
      ]
    },
    breach: {
      score: 74,
      metrics: [
        { label: '两端差异率', value: '0.86%' },
        { label: '命中行数', value: '5,608 行' },
        { label: '比对行数', value: '652,180 行' },
        { label: '阈值', value: '= 0 差异' }
      ]
    }
  },
  timeliness: {
    pass: {
      score: 95,
      metrics: [
        { label: '平均延迟', value: '6 分钟' },
        { label: 'SLA 达成率', value: '99.8%' },
        { label: '超时分区', value: '0 个' },
        { label: '阈值', value: '≤ 30 分钟' }
      ]
    },
    breach: {
      score: 71,
      metrics: [
        { label: '平均延迟', value: '48 分钟' },
        { label: 'SLA 达成率', value: '91.4%' },
        { label: '超时分区', value: '3 个' },
        { label: '阈值', value: '≤ 30 分钟' }
      ]
    }
  },
  uniqueness: {
    pass: {
      score: 99,
      metrics: [
        { label: '重复率', value: '0.02%' },
        { label: '命中行数', value: '128 行' },
        { label: '主键组合', value: '2 组' },
        { label: '阈值', value: '≤ 0.5%' }
      ]
    },
    breach: {
      score: 76,
      metrics: [
        { label: '重复率', value: '1.4%' },
        { label: '命中行数', value: '9,132 行' },
        { label: '主键组合', value: '5 组' },
        { label: '阈值', value: '≤ 0.5%' }
      ]
    }
  }
}

/** 维度无规则覆盖时的兜底分（演示：按目录基线给分） */
const DIM_UNCOVERED_BASELINE = 88
/** 执行失败时的扣分 */
const FAILED_PENALTY = 25

/** 模拟异步耗时 600~1000ms */
function mockDelay(min = 600, max = 1000): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, Math.round(min + Math.random() * (max - min))))
}

function dimOf(rule: Pick<QualityRule, 'type' | 'dimension'>): QualityDimension {
  return rule.dimension || RULE_TYPE_DEFAULT_DIM[rule.type] || 'consistency'
}

/** 模板安全取值：任意规则对象（表格 slot 里是 any）→ 质量维度 */
export function dimOfRule(rule: any): QualityDimension {
  const type: 'count' | 'sum' = rule?.type === 'sum' ? 'sum' : 'count'
  const dim = rule?.dimension
  return (QUALITY_DIMENSIONS as string[]).includes(dim) ? dim : RULE_TYPE_DEFAULT_DIM[type]
}

/** 模板安全取值：任意维度 key → 中文名 */
export function dimLabel(dim: any): string {
  return QUALITY_DIM_LABELS[dim as QualityDimension] || String(dim ?? '')
}

/** 模板安全取值：任意维度 key → a-tag 配色 */
export function dimColor(dim: any): string {
  return QUALITY_DIM_COLORS[dim as QualityDimension] || 'gray'
}

/** 归一化前端提交的规则：补齐维度标签，未选维度时按校验类型兜底 */
function normalizeRules(rawRules: any[], taskId: string): QualityRule[] {
  return (rawRules || []).map((r: any, i: number) => {
    const type: 'count' | 'sum' = r.type === 'sum' ? 'sum' : 'count'
    const dimension: QualityDimension =
      (QUALITY_DIMENSIONS as string[]).includes(r.dimension) ? r.dimension : RULE_TYPE_DEFAULT_DIM[type]
    return {
      id: r.id || `r_${taskId}_${i + 1}`,
      name: r.name,
      type,
      dimension,
      sourceField: r.sourceField || null,
      targetField: r.targetField || null
    }
  })
}

// ==================== 静态数据 ====================

const dataSources: DataSource[] = [
  { id: 'ds_hive', name: 'Hive', type: 'hive', status: 'connected' },
  { id: 'ds_oracle', name: 'Oracle', type: 'oracle', status: 'connected' },
  { id: 'ds_doris', name: 'Doris', type: 'doris', status: 'connected' }
]

const databases: Record<string, string[]> = {
  ds_hive: ['odds_db', 'default', 'ods', 'dim', 'dwd', 'dws', 'ads'],
  ds_oracle: ['ORCL', 'RISK_DB', 'TRADE_DB'],
  ds_doris: ['doris_db', 'cdp_dw', 'report_db']
}

const tables: Record<string, string[]> = {
  'ds_hive/odds_db': ['table_a', 'user_info', 'transaction_log', 'risk_score'],
  'ds_hive/default': ['test_table', 'tmp_data'],
  'ds_hive/ods': ['ods_user', 'ods_order', 'ods_event', 'ods_customer_base', 'ods_loan_apply_inc'],
  'ds_hive/dim': ['dim_user', 'dim_product', 'dim_org', 'dim_city'],
  'ds_hive/dwd': [
    'dwd_user_detail', 'dwd_order_detail', 'dwd_credit_apply', 'dwd_credit_contract',
    'dwd_loan_drawdown', 'dwd_user_register', 'dwd_repay_detail', 'dwd_fraud_alert'
  ],
  'ds_hive/dws': ['dws_user_summary', 'dws_trade_summary', 'dws_risk_score', 'dws_repayment_plan', 'dws_post_loan_monitor'],
  'ds_hive/ads': ['ads_user_profile', 'ads_risk_report'],
  'ds_oracle/ORCL': ['table_a', 'cust_info', 'account_balance'],
  'ds_oracle/RISK_DB': ['risk_event', 'risk_rule', 'risk_result'],
  'ds_oracle/TRADE_DB': ['trade_record', 'trade_summary', 'trade_detail'],
  'ds_doris/doris_db': [
    'table_a', 'user_tag', 'order_stats', 'risk_summary',
    'ads_customer_overview', 'ads_risk_report_daily', 'ads_collect_case', 'dws_credit_analysis'
  ],
  'ds_doris/cdp_dw': ['tag_user_daily', 'user_profile', 'tag_user_monthly'],
  'ds_doris/report_db': ['daily_report', 'monthly_report', 'kpi_summary']
}

const fields: Record<string, Array<{ name: string; type: string; comment: string; isNumeric?: boolean }>> = {}
Object.keys(tables).forEach(key => {
  const [dsId, db] = key.split('/')
  tables[key].forEach(table => {
    const fKey = `${dsId}/${db}/${table}`
    fields[fKey] = [
      { name: 'id', type: 'bigint', comment: '主键ID' },
      { name: 'user_id', type: 'string', comment: '用户ID' },
      { name: 'mobile', type: 'string', comment: '手机号' },
      { name: 'id_card', type: 'string', comment: '身份证号' },
      { name: 'name', type: 'string', comment: '姓名' },
      { name: 'age', type: 'int', comment: '年龄' },
      { name: 'gender', type: 'string', comment: '性别' },
      { name: 'city', type: 'string', comment: '城市' },
      { name: 'amount', type: 'decimal(18,2)', comment: '金额', isNumeric: true },
      { name: 'balance', type: 'decimal(18,2)', comment: '余额', isNumeric: true },
      { name: 'score', type: 'double', comment: '评分', isNumeric: true },
      { name: 'create_time', type: 'timestamp', comment: '创建时间' },
      { name: 'update_time', type: 'timestamp', comment: '更新时间' },
      { name: 'dt', type: 'string', comment: '分区日期' }
    ]
  })
})

// ==================== 初始任务数据 ====================

let taskIdCounter = 1
const tasks: QualityTask[] = [
  {
    id: 'qt_001',
    name: 'Hive-Doris用户表条数校验',
    creator: '张伟',
    status: 'active',
    rules: [
      { id: 'r_001_1', name: '用户表条数校验', type: 'count', dimension: 'consistency', sourceField: 'id', targetField: 'id' },
      { id: 'r_001_2', name: '手机号完整性校验', type: 'count', dimension: 'completeness', sourceField: 'mobile', targetField: 'mobile' }
    ],
    scheduleType: 'daily',
    scheduleTime: '22:00',
    scheduleDay: null,
    source: { datasourceId: 'ds_hive', datasourceName: 'Hive', database: 'odds_db', table: 'table_a', partition: '${dt}', isPartitioned: true },
    target: { datasourceId: 'ds_doris', datasourceName: 'Doris', database: 'doris_db', table: 'table_a', partition: '${dt}', isPartitioned: true },
    timeout: 300,
    description: '校验Hive与Doris用户表数据条数一致性',
    lastRunStatus: 'consistent',
    lastRunTime: '2026-08-10 22:00:15',
    createdAt: '2026-07-15 10:00:00',
    updatedAt: '2026-08-10 22:00:15'
  },
  {
    id: 'qt_002',
    name: 'Oracle-Doris交易金额校验',
    creator: '李娜',
    status: 'active',
    rules: [
      { id: 'r_002_1', name: '交易条数校验', type: 'count', dimension: 'consistency', sourceField: 'id', targetField: 'id' },
      { id: 'r_002_2', name: '交易金额汇总校验', type: 'sum', dimension: 'accuracy', sourceField: 'amount', targetField: 'amount' },
      { id: 'r_002_3', name: '余额汇总校验', type: 'sum', dimension: 'accuracy', sourceField: 'balance', targetField: 'amount' }
    ],
    scheduleType: 'daily',
    scheduleTime: '23:30',
    scheduleDay: null,
    source: { datasourceId: 'ds_oracle', datasourceName: 'Oracle', database: 'TRADE_DB', table: 'trade_record', partition: '', isPartitioned: false },
    target: { datasourceId: 'ds_doris', datasourceName: 'Doris', database: 'doris_db', table: 'order_stats', partition: '', isPartitioned: false },
    timeout: 300,
    description: '校验Oracle交易表与Doris订单统计表条数及金额一致性',
    lastRunStatus: 'inconsistent',
    lastRunTime: '2026-08-10 23:30:22',
    createdAt: '2026-07-20 14:30:00',
    updatedAt: '2026-08-10 23:30:22'
  },
  {
    id: 'qt_003',
    name: 'Hive-Oracle风控评分校验',
    creator: '王强',
    status: 'inactive',
    rules: [
      { id: 'r_003_1', name: '风控条数校验', type: 'count', dimension: 'consistency', sourceField: 'id', targetField: 'id' },
      { id: 'r_003_2', name: '评分汇总校验', type: 'sum', dimension: 'accuracy', sourceField: 'score', targetField: 'score' }
    ],
    scheduleType: 'weekly',
    scheduleTime: '02:00',
    scheduleDay: '周一',
    source: { datasourceId: 'ds_hive', datasourceName: 'Hive', database: 'dws', table: 'dws_user_summary', partition: '${dt}', isPartitioned: true },
    target: { datasourceId: 'ds_oracle', datasourceName: 'Oracle', database: 'RISK_DB', table: 'risk_event', partition: '', isPartitioned: false },
    timeout: 600,
    description: '按周校验Hive用户汇总表与Oracle风控事件表条数及评分',
    lastRunStatus: 'failed',
    lastRunTime: '2026-08-04 02:00:05',
    createdAt: '2026-06-10 09:00:00',
    updatedAt: '2026-08-04 02:00:05'
  },
  {
    id: 'qt_004',
    name: 'Hive-Doris标签表校验',
    creator: '刘洋',
    status: 'active',
    rules: [
      { id: 'r_004_1', name: '标签表条数校验', type: 'count', dimension: 'consistency', sourceField: 'user_id', targetField: 'user_id' },
      { id: 'r_004_2', name: '用户ID唯一性校验', type: 'count', dimension: 'uniqueness', sourceField: 'user_id', targetField: 'user_id' }
    ],
    scheduleType: 'daily',
    scheduleTime: '01:00',
    scheduleDay: null,
    source: { datasourceId: 'ds_hive', datasourceName: 'Hive', database: 'ads', table: 'ads_user_profile', partition: '${dt}', isPartitioned: true },
    target: { datasourceId: 'ds_doris', datasourceName: 'Doris', database: 'cdp_dw', table: 'tag_user_daily', partition: '${dt}', isPartitioned: true },
    timeout: 300,
    description: '校验Hive ADS层用户画像与Doris标签表条数',
    lastRunStatus: 'consistent',
    lastRunTime: '2026-08-10 01:00:12',
    createdAt: '2026-08-01 16:00:00',
    updatedAt: '2026-08-10 01:00:12'
  },
  {
    id: 'qt_005',
    name: 'Oracle-Doris余额校验',
    creator: '陈静',
    status: 'active',
    rules: [
      { id: 'r_005_1', name: '账户条数校验', type: 'count', dimension: 'consistency', sourceField: 'id', targetField: 'id' },
      { id: 'r_005_2', name: '余额汇总校验', type: 'sum', dimension: 'accuracy', sourceField: 'balance', targetField: 'amount' },
      { id: 'r_005_3', name: '账户余额更新及时性校验', type: 'count', dimension: 'timeliness', sourceField: 'update_time', targetField: 'update_time' }
    ],
    scheduleType: 'weekly',
    scheduleTime: '03:00',
    scheduleDay: '周三',
    source: { datasourceId: 'ds_oracle', datasourceName: 'Oracle', database: 'ORCL', table: 'account_balance', partition: '', isPartitioned: false },
    target: { datasourceId: 'ds_doris', datasourceName: 'Doris', database: 'doris_db', table: 'risk_summary', partition: '', isPartitioned: false },
    timeout: 300,
    description: '按周校验Oracle账户余额与Doris风险汇总金额',
    lastRunStatus: 'inconsistent',
    lastRunTime: '2026-08-07 03:00:18',
    createdAt: '2026-07-01 11:00:00',
    updatedAt: '2026-08-07 03:00:18'
  },
  {
    id: 'qt_006',
    name: '信贷分析模型五维质量校验',
    creator: '赵敏',
    status: 'active',
    rules: [
      { id: 'r_006_1', name: '证件号完整性校验', type: 'count', dimension: 'completeness', sourceField: 'id_card', targetField: 'id_card' },
      { id: 'r_006_2', name: '授信金额汇总校验', type: 'sum', dimension: 'accuracy', sourceField: 'amount', targetField: 'amount' },
      { id: 'r_006_3', name: '申请条数一致性校验', type: 'count', dimension: 'consistency', sourceField: 'id', targetField: 'id' },
      { id: 'r_006_4', name: '分区产出及时性校验', type: 'count', dimension: 'timeliness', sourceField: 'dt', targetField: 'dt' },
      { id: 'r_006_5', name: '申请主键唯一性校验', type: 'count', dimension: 'uniqueness', sourceField: 'user_id', targetField: 'user_id' }
    ],
    scheduleType: 'daily',
    scheduleTime: '05:30',
    scheduleDay: null,
    source: { datasourceId: 'ds_hive', datasourceName: 'Hive', database: 'dwd', table: 'dwd_credit_apply', partition: '${dt}', isPartitioned: true },
    target: { datasourceId: 'ds_doris', datasourceName: 'Doris', database: 'doris_db', table: 'dws_credit_analysis', partition: '${dt}', isPartitioned: true },
    timeout: 600,
    description: '覆盖五维质量标签的演示任务，校验结果可回流资产目录',
    lastRunStatus: 'consistent',
    lastRunTime: '2026-08-11 05:30:11',
    createdAt: '2026-08-05 10:20:00',
    updatedAt: '2026-08-11 05:30:11'
  },
  {
    id: 'qt_007',
    name: '风控评分模型质量校验',
    creator: '孙浩',
    status: 'active',
    rules: [
      { id: 'r_007_1', name: '客户手机号完整性校验', type: 'count', dimension: 'completeness', sourceField: 'mobile', targetField: 'mobile' },
      { id: 'r_007_2', name: '评分汇总准确性校验', type: 'sum', dimension: 'accuracy', sourceField: 'score', targetField: 'score' },
      { id: 'r_007_3', name: '风险事件条数一致性校验', type: 'count', dimension: 'consistency', sourceField: 'id', targetField: 'id' }
    ],
    scheduleType: 'daily',
    scheduleTime: '06:00',
    scheduleDay: null,
    source: { datasourceId: 'ds_oracle', datasourceName: 'Oracle', database: 'RISK_DB', table: 'risk_event', partition: '', isPartitioned: false },
    target: { datasourceId: 'ds_hive', datasourceName: 'Hive', database: 'dws', table: 'dws_risk_score', partition: '${dt}', isPartitioned: true },
    timeout: 600,
    description: '校验Oracle风控事件与Hive评分宽表，演示低分回流与治理',
    lastRunStatus: 'inconsistent',
    lastRunTime: '2026-08-11 06:00:26',
    createdAt: '2026-08-06 15:40:00',
    updatedAt: '2026-08-11 06:00:26'
  }
]
taskIdCounter = 8

// ==================== 实例生成 ====================

const instances: QualityInstance[] = []

/**
 * 生成规则校验结果（挡板）：
 * 两端值仍随机，但指标文案与得分取自按维度写死的预置样例，保证演示稳定。
 */
function generateRuleResults(
  rules: QualityRule[]
): RuleResult[] {
  return rules.map(rule => {
    const dimension = dimOf(rule)
    const sourceValue = Math.floor(900 + Math.random() * 200)
    const isInconsistent = Math.random() < 0.3
    const targetValue = isInconsistent ? sourceValue - Math.floor(1 + Math.random() * 10) : sourceValue
    const diffValue = Math.abs(sourceValue - targetValue)
    const isConsistent = diffValue === 0
    const sample = DIM_SAMPLES[dimension][isConsistent ? 'pass' : 'breach']
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      type: rule.type,
      dimension,
      sourceValue,
      targetValue,
      diffValue,
      isConsistent,
      dimensionScore: sample.score,
      threshold: 90,
      metrics: sample.metrics.map(m => ({ ...m }))
    }
  })
}

/** 执行失败时的占位结果（同样带维度，得分按失败扣分） */
function generateFailedResults(rules: QualityRule[]): RuleResult[] {
  return rules.map(rule => {
    const dimension = dimOf(rule)
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      type: rule.type,
      dimension,
      sourceValue: 0,
      targetValue: 0,
      diffValue: 0,
      isConsistent: false,
      dimensionScore: Math.max(40, DIM_SAMPLES[dimension].breach.score - FAILED_PENALTY),
      threshold: 90,
      metrics: [{ label: '执行状态', value: '查询超时，未产出指标' }]
    }
  })
}

/**
 * 由实例结果换算五维分（写死换算：同一维度取该维度规则的最低分，未覆盖维度用基线兜底）
 */
function dimsFromInstance(inst: QualityInstance): QualityDims {
  const dims = {} as QualityDims
  QUALITY_DIMENSIONS.forEach(dim => {
    const matched = inst.results.filter(r => dimOf(r) === dim)
    if (!matched.length) {
      dims[dim] = inst.status === 'failed'
        ? Math.max(40, DIM_UNCOVERED_BASELINE - FAILED_PENALTY)
        : DIM_UNCOVERED_BASELINE
      return
    }
    let score = Math.min(...matched.map(r => r.dimensionScore || DIM_SAMPLES[dim].pass.score))
    if (inst.status === 'failed') score = Math.max(40, score - FAILED_PENALTY)
    dims[dim] = score
  })
  return dims
}

function generateInstanceLog(
  task: QualityTask,
  results: RuleResult[],
  status: 'consistent' | 'inconsistent' | 'failed',
  runTime: string
): string {
  const lines = [
    `[${runTime}] INFO  开始执行校验任务: ${task.name}`,
    `[${runTime}] INFO  源端: ${task.source.datasourceName} ${task.source.database}.${task.source.table}`,
    `[${runTime}] INFO  目标端: ${task.target.datasourceName} ${task.target.database}.${task.target.table}`,
    `[${runTime}] INFO  校验规则数: ${task.rules.length}`,
  ]
  if (task.source.partition) lines.push(`[${runTime}] INFO  源端分区条件: ${task.source.partition}`)
  if (task.target.partition) lines.push(`[${runTime}] INFO  目标端分区条件: ${task.target.partition}`)
  lines.push(`[${runTime}] INFO  源端数据源连接成功`)
  lines.push(`[${runTime}] INFO  目标端数据源连接成功`)

  if (status === 'failed') {
    lines.push(`[${runTime}] ERROR 数据源查询超时`)
    lines.push(`[${runTime}] ERROR 校验结果: 执行失败`)
    lines.push(`[${runTime}] ERROR 错误信息: Query timed out after 300s`)
    lines.push(`[${runTime}] INFO  任务执行完成，耗时 300s`)
    return lines.join('\n')
  }

  results.forEach((r, i) => {
    const fieldInfo = r.type === 'sum' ? `(${r.ruleId})` : ''
    lines.push(`[${runTime}] INFO  规则${i + 1}: ${r.ruleName} [${r.type === 'count' ? 'count' : 'sum'}|${QUALITY_DIM_LABELS[r.dimension]}]${fieldInfo}`)
    lines.push(`[${runTime}] INFO    源端值: ${r.sourceValue}`)
    lines.push(`[${runTime}] INFO    目标端值: ${r.targetValue}`)
    lines.push(`[${runTime}] INFO    差异值: ${r.diffValue}`)
    if (r.metrics && r.metrics.length) {
      lines.push(`[${runTime}] INFO    样例指标: ${r.metrics.map(m => `${m.label} ${m.value}`).join('，')}`)
    }
    if (r.isConsistent) {
      lines.push(`[${runTime}] INFO    结果: 一致（${QUALITY_DIM_LABELS[r.dimension]}得分 ${r.dimensionScore}）`)
    } else {
      lines.push(`[${runTime}] WARN    结果: 不一致（${QUALITY_DIM_LABELS[r.dimension]}得分 ${r.dimensionScore}）`)
    }
  })

  const allConsistent = results.every(r => r.isConsistent)
  if (allConsistent) {
    lines.push(`[${runTime}] INFO  校验结果: 全部一致`)
  } else {
    lines.push(`[${runTime}] WARN  校验结果: 存在不一致规则，已推送告警到数字社区`)
  }
  lines.push(`[${runTime}] INFO  任务执行完成，耗时 ${Math.floor(1 + Math.random() * 30)}s`)
  return lines.join('\n')
}

function ensureInstances(): void {
  if (instances.length > 0) return
  tasks.forEach(task => {
    if (task.status !== 'active') return
    const instanceCount = task.scheduleType === 'daily' ? 7 : 4
    for (let i = 0; i < instanceCount; i++) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      const timeStr = `${dateStr} ${task.scheduleTime}:00`

      let results: RuleResult[]
      let status: 'consistent' | 'inconsistent' | 'failed'

      if (i === 0 && task.lastRunStatus) {
        status = task.lastRunStatus
      } else if (i === 1) {
        status = 'inconsistent'
      } else {
        const rand = Math.random()
        status = rand < 0.5 ? 'consistent' : rand < 0.8 ? 'inconsistent' : 'failed'
      }

      if (status === 'failed') {
        results = generateFailedResults(task.rules)
      } else {
        results = generateRuleResults(task.rules)
        if (status === 'consistent') {
          results = results.map(r => {
            const pass = DIM_SAMPLES[r.dimension].pass
            return {
              ...r,
              targetValue: r.sourceValue,
              diffValue: 0,
              isConsistent: true,
              dimensionScore: pass.score,
              metrics: pass.metrics.map(m => ({ ...m }))
            }
          })
        }
      }

      instances.push({
        id: `qi_${task.id}_${String(i).padStart(3, '0')}`,
        taskId: task.id,
        taskName: task.name,
        status,
        results,
        duration: Math.floor(1 + Math.random() * 30),
        runTime: timeStr,
        finishTime: `${dateStr} ${task.scheduleTime}:${String(Math.floor(10 + Math.random() * 49)).padStart(2, '0')}`,
        log: generateInstanceLog(task, results, status, timeStr),
        sourceTable: task.source.table,
        targetTable: task.target.table
      })
    }
  })
}

// ==================== API 导出 ====================

let ruleIdCounter = 1

export const DataQualityAPI = {
  async getDataSources() {
    return { success: true, data: dataSources }
  },

  async getDatabases(datasourceId: string) {
    return { success: true, data: databases[datasourceId] || [] }
  },

  async getTables(datasourceId: string, database: string) {
    const key = `${datasourceId}/${database}`
    const list = (tables[key] || []).map(name => ({ name, database, datasourceId }))
    return { success: true, data: list }
  },

  async getTableFields(datasourceId: string, database: string, table: string) {
    const key = `${datasourceId}/${database}/${table}`
    return { success: true, data: fields[key] || [] }
  },

  async getTasks(params: any = {}) {
    const { page = 1, pageSize = 10, name = '', status = '', checkMethod = '', dimension = '' } = params
    let list = [...tasks]
    if (name) {
      const n = String(name).toLowerCase()
      list = list.filter(t => t.name.toLowerCase().includes(n))
    }
    if (status) list = list.filter(t => t.status === status)
    if (checkMethod) list = list.filter(t => t.rules.some(r => r.type === checkMethod))
    if (dimension) list = list.filter(t => t.rules.some(r => dimOf(r) === dimension))
    const total = list.length
    const start = (page - 1) * pageSize
    return { success: true, data: { list: list.slice(start, start + pageSize), total, page, pageSize } }
  },

  async getTaskDetail(id: string) {
    const task = tasks.find(t => t.id === id)
    if (!task) return { success: false, message: '任务不存在' }
    return { success: true, data: task }
  },

  async createTask(payload: any) {
    if (payload.source.datasourceId === payload.target.datasourceId) {
      return { success: false, message: '源端和目标端必须来自不同数据源' }
    }
    if (!payload.rules || payload.rules.length === 0) {
      return { success: false, message: '至少需要添加一条校验规则' }
    }
    const id = `qt_${String(taskIdCounter++).padStart(3, '0')}`
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19)
    const dsMap: Record<string, string> = {}
    dataSources.forEach(d => { dsMap[d.id] = d.name })
    const newTask: QualityTask = {
      id,
      name: payload.name,
      creator: payload.creator || '当前用户',
      status: 'active',
      rules: normalizeRules(payload.rules, id),
      scheduleType: payload.scheduleType,
      scheduleTime: payload.scheduleTime,
      scheduleDay: payload.scheduleDay || null,
      source: { ...payload.source, datasourceName: dsMap[payload.source.datasourceId] || payload.source.datasourceId },
      target: { ...payload.target, datasourceName: dsMap[payload.target.datasourceId] || payload.target.datasourceId },
      timeout: payload.timeout || 300,
      description: payload.description || '',
      lastRunStatus: null,
      lastRunTime: null,
      createdAt: now,
      updatedAt: now
    }
    tasks.unshift(newTask)
    return { success: true, data: newTask, message: '任务创建成功' }
  },

  async updateTask(id: string, payload: any) {
    const idx = tasks.findIndex(t => t.id === id)
    if (idx === -1) return { success: false, message: '任务不存在' }
    if (payload.source.datasourceId === payload.target.datasourceId) {
      return { success: false, message: '源端和目标端必须来自不同数据源' }
    }
    if (!payload.rules || payload.rules.length === 0) {
      return { success: false, message: '至少需要添加一条校验规则' }
    }
    const dsMap: Record<string, string> = {}
    dataSources.forEach(d => { dsMap[d.id] = d.name })
    tasks[idx] = {
      ...tasks[idx],
      ...payload,
      rules: normalizeRules(payload.rules, id),
      source: { ...payload.source, datasourceName: dsMap[payload.source.datasourceId] || tasks[idx].source.datasourceName },
      target: { ...payload.target, datasourceName: dsMap[payload.target.datasourceId] || tasks[idx].target.datasourceName },
      updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
    }
    return { success: true, data: tasks[idx], message: '任务更新成功' }
  },

  async deleteTask(id: string) {
    const idx = tasks.findIndex(t => t.id === id)
    if (idx === -1) return { success: false, message: '任务不存在' }
    tasks.splice(idx, 1)
    for (let i = instances.length - 1; i >= 0; i--) {
      if (instances[i].taskId === id) instances.splice(i, 1)
    }
    return { success: true, message: '任务删除成功' }
  },

  async toggleTask(id: string) {
    const task = tasks.find(t => t.id === id)
    if (!task) return { success: false, message: '任务不存在' }
    task.status = task.status === 'active' ? 'inactive' : 'active'
    task.updatedAt = new Date().toISOString().replace('T', ' ').substring(0, 19)
    return { success: true, data: task, message: task.status === 'active' ? '任务已启用' : '任务已停用' }
  },

  async triggerTask(id: string) {
    ensureInstances()
    const task = tasks.find(t => t.id === id)
    if (!task) return { success: false, message: '任务不存在' }
    // 挡板：模拟异步执行耗时 600~1000ms
    await mockDelay()
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19)
    const results = generateRuleResults(task.rules)
    const allConsistent = results.every(r => r.isConsistent)
    const status: 'consistent' | 'inconsistent' = allConsistent ? 'consistent' : 'inconsistent'
    const instance: QualityInstance = {
      id: `qi_${task.id}_${Date.now()}`,
      taskId: task.id,
      taskName: task.name,
      status,
      results,
      duration: Math.floor(1 + Math.random() * 30),
      runTime: now,
      finishTime: now,
      log: generateInstanceLog(task, results, status, now),
      sourceTable: task.source.table,
      targetTable: task.target.table
    }
    instances.unshift(instance)
    task.lastRunStatus = status
    task.lastRunTime = now
    return {
      success: true,
      data: instance,
      message: `任务执行完成（模拟扫描，耗时 ${instance.duration}s），已生成校验实例`
    }
  },

  async getInstances(params: any = {}) {
    ensureInstances()
    const { page = 1, pageSize = 10, taskId = '', status = '' } = params
    let list = [...instances]
    if (taskId) list = list.filter(i => i.taskId === taskId)
    if (status) list = list.filter(i => i.status === status)
    list.sort((a, b) => new Date(b.runTime).getTime() - new Date(a.runTime).getTime())
    const total = list.length
    const start = (page - 1) * pageSize
    return { success: true, data: { list: list.slice(start, start + pageSize), total, page, pageSize } }
  },

  async getInstanceDetail(id: string) {
    ensureInstances()
    const instance = instances.find(i => i.id === id)
    if (!instance) return { success: false, message: '实例不存在' }
    return { success: true, data: instance }
  },

  /** 预览：把某个校验实例的结果换算成资产目录五维分（写死换算，挡板） */
  async getQualityDims(instanceId: string) {
    ensureInstances()
    const instance = instances.find(i => i.id === instanceId)
    if (!instance) return { success: false, message: '实例不存在' }
    const task = tasks.find(t => t.id === instance.taskId)
    const tableName = task?.target.table || instance.targetTable
    const dims = dimsFromInstance(instance)
    return {
      success: true,
      data: {
        instanceId,
        taskId: instance.taskId,
        taskName: instance.taskName,
        tableName,
        dims,
        score: computeQualityScore(dims),
        weights: { ...QUALITY_WEIGHTS }
      }
    }
  },

  /**
   * 回填表目录：把实例的五维评分写入资产目录（TableCatalogStore.setQuality），
   * 演示「质量评分回流资产目录」闭环。
   */
  async backfillCatalogQuality(instanceId: string) {
    ensureInstances()
    await mockDelay()
    const instance = instances.find(i => i.id === instanceId)
    if (!instance) return { success: false, message: '实例不存在' }
    if (instance.status === 'failed') {
      return { success: false, message: '该实例执行失败，未产出可信评分，请重跑任务后再回填' }
    }
    const task = tasks.find(t => t.id === instance.taskId)
    const tableName = task?.target.table || instance.targetTable
    if (!tableName) return { success: false, message: '实例缺少目标表信息，无法定位资产' }
    const dims = dimsFromInstance(instance)
    const ok = TableCatalogStore.setQuality(tableName, dims, `质量引擎 / ${instance.taskName}`)
    if (!ok) {
      return {
        success: false,
        message: `资产目录中未找到表「${tableName}」，该表未纳管，无法回流评分`
      }
    }
    const score = computeQualityScore(dims)
    return {
      success: true,
      data: { tableName, dims, score },
      message: `已将 ${tableName} 的质量评分（${score} 分）回流至资产目录`
    }
  },
}

export default DataQualityAPI

// ===== 解构导出 =====

function unwrap<T = any>(res: any): T {
  if (res && res.success === false) {
    const err: any = new Error(res.message || '操作失败')
    err.payload = res
    throw err
  }
  return res?.data as T
}

export function getDataSources() { return DataQualityAPI.getDataSources().then(unwrap) }
export function getDatabases(datasourceId: string) { return DataQualityAPI.getDatabases(datasourceId).then(unwrap) }
export function getTables(datasourceId: string, database: string) { return DataQualityAPI.getTables(datasourceId, database).then(unwrap) }
export function getTableFields(datasourceId: string, database: string, table: string) { return DataQualityAPI.getTableFields(datasourceId, database, table).then(unwrap) }
export function getQualityTasks(params: any = {}) { return DataQualityAPI.getTasks(params).then(unwrap) }
export function getQualityTaskDetail(id: string) { return DataQualityAPI.getTaskDetail(id).then(unwrap) }
export function createQualityTask(payload: any) { return DataQualityAPI.createTask(payload).then(unwrap) }
export function updateQualityTask(id: string, payload: any) { return DataQualityAPI.updateTask(id, payload).then(unwrap) }
export function deleteQualityTask(id: string) { return DataQualityAPI.deleteTask(id).then(unwrap) }
export function toggleQualityTask(id: string) { return DataQualityAPI.toggleTask(id).then(unwrap) }
export function triggerTask(id: string) { return DataQualityAPI.triggerTask(id).then(unwrap) }
export function getTaskInstances(params: any = {}) { return DataQualityAPI.getInstances(params).then(unwrap) }
export function getInstanceDetail(id: string) { return DataQualityAPI.getInstanceDetail(id).then(unwrap) }
export function getQualityDims(instanceId: string) { return DataQualityAPI.getQualityDims(instanceId).then(unwrap) }
export function backfillCatalogQuality(instanceId: string) { return DataQualityAPI.backfillCatalogQuality(instanceId).then(unwrap) }
