/**
 * ============================================================
 * 逻辑表唯一事实源（P0 数据底座 · 重构方案 v1.0 阶段0）
 * ============================================================
 * 定位：数据发现 + 数据管理所有"表"相关页面（统一搜索、表详情、
 *      未上线池、上线审核、生命周期、服务暴露、质量看板）的唯一 mock 数据源。
 *
 * 归一约定（替代此前并存的 shelf-store / listing-store / data-map 表状态语义）：
 *  1. 状态机：未上线(offline) → 审核中(reviewing) → 已上线(online) → 已下线(retired) → 已删除(deleted)
 *  2. 分级：公开(public) / 内部(internal) / 敏感(sensitive) / 高敏(restricted)
 *  3. 资产/资源：assetType = 'asset'(数据资产: DWD/DWS/ADS/DIM) | 'resource'(数据资源: ODS/业务系统表)
 *  4. 质量评分：五维分值预置 + 固定权重(30/30/20/10/10)一行加权求和（挡板，不做真实扫描）
 *  5. 上线检查项 / 权限自动赋权 / 变更通知 均为挡板实现（见重构方案第〇章）
 *
 * 持久化：localStorage('dca-table-catalog-v2')，沿用 metadata-bus 已验证范式。
 * ============================================================
 */
import { ref } from 'vue'
import { NotificationAPI } from '../api/notification'

// ---------------- 类型定义 ----------------

export type TableStatus = 'offline' | 'reviewing' | 'online' | 'retired' | 'deleted'
export type Sensitivity = 'public' | 'internal' | 'sensitive' | 'restricted'
export type Layer = 'ODS' | 'DWD' | 'DWS' | 'ADS' | 'DIM'
export type AssetType = 'asset' | 'resource'
export type StorageType = 'Hive' | 'Doris' | 'Oracle' | 'MySQL' | 'Kafka' | 'HBase'
export type ServiceKind = 'API' | 'script' | 'direct' | 'stream'

export interface CatalogField {
  name: string
  cnName?: string          // 字段中文名（PRD E2/B 要求）
  type: string
  description: string
  sensitivity: Sensitivity
  isPrimaryKey?: boolean   // 是否主键（PRD E2/B 要求）
}

export interface QualityDims {
  completeness: number // 完整性 0-100（权重30）
  accuracy: number     // 准确性 0-100（权重30）
  consistency: number  // 一致性 0-100（权重20）
  timeliness: number   // 及时性 0-100（权重10）
  uniqueness: number   // 唯一性 0-100（权重10）
}

export interface ServiceExposure {
  id: string
  kind: ServiceKind
  name: string
  endpoint: string
  status: 'online' | 'offline'
  updatedAt: string
  createdAt: string         // 创建时间（PRD E6 要求）
}

export interface ReviewCheck {
  key: string
  name: string
  hard: boolean          // 硬性(不通过即拦截) / 软性(仅提示)
  passed: boolean
  message: string
}

export interface TableHistoryRecord {
  ts: string
  action: string   // 提交上线 | 审核通过 | 审核驳回 | 下线 | 恢复上线 | 删除 | 元数据更新 | 服务变更
  actor: string
  comment?: string
}

export interface ChangeLogItem {
  ts: string
  type: '上线' | '下线' | '审核驳回' | '服务变更' | '结构变更' | '质量变更' | '元数据变更'
  desc: string
  actor: string
  oldValue?: string        // 变更前值（PRD E7 要求）
  newValue?: string        // 变更后值（PRD E7 要求）
}

export interface LogicalTable {
  tableId: string
  name: string
  cnName: string
  assetType: AssetType
  layer: Layer
  storage: StorageType
  sourceSystem: string       // 所属业务系统/集群
  domain: string             // 业务域
  updateFrequency: string
  owner: string
  description: string
  businessCaliber?: string   // 业务口径（PRD E1 要求）
  devCaliber?: string        // 开发口径（PRD E1 要求）
  usageGuide?: string         // 使用说明（PRD E1 要求）
  recordCount: number
  heat: number               // 搜索热度（挡板排序用）
  tags: string[]
  fields: CatalogField[]
  upstream: string[]         // 上游表名（血缘，表间引用）
  downstream: string[]       // 下游表名
  quality: QualityDims
  qualityScore: number       // 由 quality 加权得出
  sensitivity: Sensitivity   // 表级 = 字段最高分级（挡板）
  services: ServiceExposure[]
  permissionConfigured: boolean  // ④权限配置检查项依据
  status: TableStatus
  onTime?: string
  offTime?: string
  reviewInfo?: {
    submittedBy: string
    submittedAt: string
    checks: ReviewCheck[]
    rejectReason?: string
  }
  changeLog: ChangeLogItem[]
  history: TableHistoryRecord[]
}

export const STATUS_LABELS: Record<TableStatus, string> = {
  offline: '未上线', reviewing: '审核中', online: '已上线', retired: '已下线', deleted: '已删除'
}
export const STATUS_COLORS: Record<TableStatus, string> = {
  offline: 'gray', reviewing: 'orange', online: 'green', retired: 'red', deleted: 'gray'
}
export const SENSITIVITY_LABELS: Record<Sensitivity, string> = {
  public: '公开', internal: '内部', sensitive: '敏感', restricted: '高敏'
}
export const SENSITIVITY_COLORS: Record<Sensitivity, string> = {
  public: 'green', internal: 'blue', sensitive: 'orange', restricted: 'red'
}
export const SERVICE_KIND_LABELS: Record<ServiceKind, string> = {
  API: 'API 接口', script: '离线脚本', direct: '库表直连', stream: '流式订阅'
}

// 五维权重（可配置评分模型 · 卖点演示用，一行加权）
export const QUALITY_WEIGHTS: QualityDims = {
  completeness: 0.3, accuracy: 0.3, consistency: 0.2, timeliness: 0.1, uniqueness: 0.1
}
export const QUALITY_DIM_LABELS: Record<keyof QualityDims, string> = {
  completeness: '完整性', accuracy: '准确性', consistency: '一致性', timeliness: '及时性', uniqueness: '唯一性'
}

export function computeQualityScore(dims: QualityDims): number {
  return Math.round(
    dims.completeness * QUALITY_WEIGHTS.completeness +
    dims.accuracy * QUALITY_WEIGHTS.accuracy +
    dims.consistency * QUALITY_WEIGHTS.consistency +
    dims.timeliness * QUALITY_WEIGHTS.timeliness +
    dims.uniqueness * QUALITY_WEIGHTS.uniqueness
  )
}

// ---------------- 详情页派生纯函数（确定性计算，不落持久化 schema） ----------------

/** 详情页顶部公共信息：集群类型 / 资产库 / Doris表名 / 发布人 */
export interface TablePublicInfo {
  clusterType: string
  assetDatabase: string
  dorisTable: string
  publisher: string
}

const CLUSTER_TYPE_LABELS: Record<StorageType, string> = {
  Hive: 'Hive 计算集群',
  Doris: 'Doris 分析集群',
  Oracle: 'Oracle 业务库集群',
  MySQL: 'MySQL 业务库集群',
  Kafka: 'Kafka 消息集群',
  HBase: 'HBase 存储集群'
}

/**
 * 派生公共信息（挡板规则）：
 *  - 集群类型：按存储引擎映射
 *  - 资产库：按分层确定性命名（DIM → dim_dw）
 *  - Doris表名：上线后同步至分析库 risk_db.<表名>
 *  - 发布人：已上线/已下线取负责人，未发布给 '—'
 */
export function derivePublicInfo(t: LogicalTable): TablePublicInfo {
  const published = t.status === 'online' || t.status === 'retired'
  return {
    clusterType: CLUSTER_TYPE_LABELS[t.storage] || String(t.storage),
    assetDatabase: `${t.layer.toLowerCase()}_dw`,
    dorisTable: published ? `risk_db.${t.name}` : '—',
    publisher: published ? (t.owner || '—') : '—'
  }
}

/** 字段明细行：业务术语 / 是否个人敏感信息 / 一~四级业务目录 */
export interface FieldDetailInfo {
  businessTerm: string
  isPersonalSensitive: boolean
  catL1: string
  catL2: string
  catL3: string
  catL4: string
}

/** 个人信息（PII）名称模式：命中即视为"个人敏感信息=是" */
const PII_PATTERNS: RegExp[] = [
  /mobile|phone|(^|_)tel/, // 手机号/电话
  /id_card|id_no|identity|passport/, // 证件号
  /email|(^|_)mail/, // 邮箱
  /address/, // 住址
  /username|user_name|(^|_)name$/, // 姓名
  /(^|_)gender$|(^|_)sex$/, // 性别
  /birthday|birth_?date/, // 出生日期
  /device_id|umid|imei/ // 设备指纹
]

/** 主题域（二级目录）：按业务域路由 */
const DOMAIN_SUBJECT: Record<string, string> = {
  用户域: '客户主体',
  交易域: '信贷主体',
  风控域: '风控主体',
  运营域: '运营主体'
}

/** 字段类别（三/四级目录 + 业务术语）：按字段名模式命中，先匹配先得 */
const FIELD_CATEGORY: Array<{ test: RegExp; l3: string; l4: string; term: string }> = [
  { test: /id_card|id_no|identity|passport/, l3: '身份标识', l4: '证件信息', term: '身份证件号码' },
  { test: /mobile|phone|(^|_)tel/, l3: '联系信息', l4: '电话号码', term: '联系手机号' },
  { test: /email|(^|_)mail/, l3: '联系信息', l4: '邮箱地址', term: '电子邮箱' },
  { test: /address/, l3: '联系信息', l4: '住址信息', term: '联系住址' },
  { test: /username|user_name|(^|_)name$/, l3: '基本属性', l4: '姓名信息', term: '用户姓名' },
  { test: /(^|_)gender$|(^|_)sex$/, l3: '基本属性', l4: '性别信息', term: '性别' },
  { test: /birthday|birth_?date/, l3: '基本属性', l4: '出生信息', term: '出生日期' },
  { test: /city|province|region/, l3: '基本属性', l4: '属地信息', term: '归属地区' },
  { test: /device_id|umid|imei/, l3: '设备环境', l4: '设备标识', term: '设备指纹' },
  { test: /amount|balance|quota/, l3: '账户资金', l4: '金额信息', term: '资金金额' },
  { test: /_id$|^id$|rowkey|_no$/, l3: '标识信息', l4: '唯一标识', term: '业务唯一标识' },
  { test: /time|date/, l3: '时间信息', l4: '时点信息', term: '业务发生时间' },
  { test: /score|rate|level/, l3: '度量指标', l4: '评分比率', term: '量化评估结果' },
  { test: /status|flag|result|_type$/, l3: '状态标识', l4: '状态标记', term: '业务状态标记' }
]

/**
 * 派生字段明细（确定性挡板规则）：
 *  - 一级目录=业务域，二级目录=主题域，三/四级=字段类别（按名称模式归类）
 *  - 业务术语取类别词典，未命中回退中文名/描述
 */
export function deriveFieldDetail(t: LogicalTable, field: CatalogField): FieldDetailInfo {
  const name = field.name.toLowerCase()
  const cat = FIELD_CATEGORY.find(c => c.test.test(name))
  return {
    businessTerm: cat ? cat.term : (field.cnName || field.description || '—'),
    isPersonalSensitive: PII_PATTERNS.some(p => p.test(name)),
    catL1: t.domain || '未分类',
    catL2: DOMAIN_SUBJECT[t.domain] || '通用主体',
    catL3: cat ? cat.l3 : '业务属性',
    catL4: cat ? cat.l4 : (field.cnName || '通用属性')
  }
}

const SENSITIVITY_ORDER: Sensitivity[] = ['public', 'internal', 'sensitive', 'restricted']

function nowStr(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ')
}

// ---------------- 种子数据 ----------------

// FieldSeed: [字段名, 类型, 描述/中文名, 分级, 中文名(可选), 是否主键(可选)]
type FieldSeed = [string, string, string, Sensitivity, string?, boolean?]

interface TableSeed {
  name: string; cnName: string; layer: Layer; storage: StorageType
  sourceSystem: string; domain: string; freq: string; owner: string
  desc: string; rows: number; heat: number; tags: string[]
  fields: FieldSeed[]
  up?: string[]; down?: string[]
  dims: QualityDims
  services?: Array<[ServiceKind, string, string, 'online' | 'offline']>
  perm?: boolean
  status: TableStatus
  onTime?: string; offTime?: string
  rejectReason?: string
  bizCaliber?: string; devCaliber?: string; usage?: string  // 业务口径/开发口径/使用说明
}

const PK_PATTERNS = [/^id$/, /_id$/, /_no$/, /^rowkey$/]
function isLikelyPK(name: string): boolean {
  return PK_PATTERNS.some(p => p.test(name))
}

const f = (s: FieldSeed): CatalogField => ({
  name: s[0],
  cnName: s[4] || s[2],
  type: s[1],
  description: s[2],
  sensitivity: s[3],
  isPrimaryKey: s[5] ?? isLikelyPK(s[0])
})

const SEEDS: TableSeed[] = [
  // ========== 已上线 · 数据资产（DWD/DWS/ADS/DIM） ==========
  { name: 'dim_user', cnName: '用户维度表', layer: 'DIM', storage: 'Hive', sourceSystem: '数据中台-DIM', domain: '用户域', freq: '每日', owner: '张三',
    desc: '用户主数据统一视图，汇聚注册、实名、授信信息，是客户360与风控评分的基础维表。', rows: 1250000, heat: 98, tags: ['用户', '维度表', '核心数据'],
    bizCaliber: '客户主数据统一视图，一个客户一条记录，覆盖注册、实名、授信全生命周期，是客户360画像和风控评分的基础维表。',
    devCaliber: 'T+1 从 ods_customer_base 贴源表清洗合并，按 user_id 去重，敏感字段按分级策略脱敏后入库，每日凌晨 02:00 完成更新。',
    usage: '① 直接关联 user_id 使用；② 高敏字段(id_card)需走权限审批后可见；③ 推荐通过 API 接口或 Doris 直连消费。',
    fields: [['user_id', 'string', '用户唯一标识', 'internal'], ['username', 'string', '用户名', 'internal'], ['mobile', 'string', '手机号', 'sensitive'], ['id_card', 'string', '身份证号', 'restricted'], ['gender', 'string', '性别', 'internal'], ['city', 'string', '归属城市', 'public'], ['register_time', 'timestamp', '注册时间', 'internal'], ['realname_flag', 'int', '是否实名', 'internal']],
    up: ['ods_customer_base'], down: ['dws_risk_score', 'dwd_credit_apply', 'ads_customer_overview'],
    dims: { completeness: 98, accuracy: 96, consistency: 95, timeliness: 92, uniqueness: 99 },
    services: [['API', '用户基础信息查询API', '/api/v1/user/base', 'online'], ['direct', '风控实验室直连', 'doris://risk_db/dim_user', 'online']], perm: true, status: 'online', onTime: '2024-03-12 10:00:00' },
  { name: 'dwd_credit_apply', cnName: '授信申请明细表', layer: 'DWD', storage: 'Hive', sourceSystem: '数据中台-DWD', domain: '交易域', freq: '每日', owner: '李四',
    desc: '授信申请全量明细，记录申请、审批、额度全过程，是信贷分析的核心明细表。', rows: 860000, heat: 92, tags: ['授信', '明细'],
    fields: [['apply_id', 'string', '申请编号', 'internal'], ['user_id', 'string', '用户ID', 'internal'], ['apply_amount', 'decimal', '申请金额', 'sensitive'], ['approve_amount', 'decimal', '核准额度', 'sensitive'], ['apply_status', 'string', '申请状态', 'internal'], ['apply_time', 'timestamp', '申请时间', 'internal'], ['risk_level', 'string', '风险等级', 'internal']],
    up: ['dim_user', 'ods_loan_apply_inc'], down: ['dws_credit_analysis', 'dws_risk_score'],
    dims: { completeness: 95, accuracy: 94, consistency: 92, timeliness: 90, uniqueness: 97 },
    services: [['API', '授信进度查询API', '/api/v1/credit/apply', 'online']], perm: true, status: 'online', onTime: '2024-04-02 09:30:00' },
  { name: 'dwd_credit_contract', cnName: '授信合同明细表', layer: 'DWD', storage: 'Hive', sourceSystem: '数据中台-DWD', domain: '交易域', freq: '每日', owner: '李四',
    desc: '授信合同签署与生效明细，关联申请与用信，支撑合同口径统计。', rows: 520000, heat: 71, tags: ['合同', '明细'],
    fields: [['contract_id', 'string', '合同编号', 'internal'], ['apply_id', 'string', '申请编号', 'internal'], ['user_id', 'string', '用户ID', 'internal'], ['contract_amount', 'decimal', '合同金额', 'sensitive'], ['sign_time', 'timestamp', '签署时间', 'internal'], ['contract_status', 'string', '合同状态', 'internal']],
    up: ['dwd_credit_apply'], down: ['dwd_loan_drawdown', 'dws_repayment_plan'],
    dims: { completeness: 93, accuracy: 92, consistency: 90, timeliness: 88, uniqueness: 96 }, perm: true, status: 'online', onTime: '2024-04-15 14:00:00' },
  { name: 'dwd_loan_drawdown', cnName: '提款支用明细表', layer: 'DWD', storage: 'Hive', sourceSystem: '数据中台-DWD', domain: '交易域', freq: '每日', owner: '王五',
    desc: '用户提款支用流水明细，是用信余额与放款分析的事实来源。', rows: 1350000, heat: 85, tags: ['放款', '明细'],
    fields: [['drawdown_id', 'string', '提款编号', 'internal'], ['contract_id', 'string', '合同编号', 'internal'], ['user_id', 'string', '用户ID', 'internal'], ['draw_amount', 'decimal', '提款金额', 'sensitive'], ['draw_time', 'timestamp', '提款时间', 'internal'], ['loan_term', 'int', '借款期限', 'internal']],
    up: ['dwd_credit_contract'], down: ['dws_repayment_plan', 'dws_post_loan_monitor'],
    dims: { completeness: 96, accuracy: 95, consistency: 93, timeliness: 94, uniqueness: 98 },
    services: [['API', '放款记录查询API', '/api/v1/loan/drawdown', 'online'], ['stream', '放款事件流订阅', 'kafka://topic_drawdown_event', 'online']], perm: true, status: 'online', onTime: '2024-05-01 10:00:00' },
  { name: 'dwd_user_register', cnName: '用户注册明细表', layer: 'DWD', storage: 'Hive', sourceSystem: '数据中台-DWD', domain: '用户域', freq: '每日', owner: '张三',
    desc: '全渠道注册行为明细，含渠道来源与设备指纹。', rows: 2100000, heat: 66, tags: ['注册', '行为'],
    fields: [['register_id', 'string', '注册流水号', 'internal'], ['user_id', 'string', '用户ID', 'internal'], ['channel', 'string', '注册渠道', 'public'], ['device_id', 'string', '设备指纹', 'sensitive'], ['register_time', 'timestamp', '注册时间', 'internal']],
    up: ['ods_customer_base'], down: ['dim_user'],
    dims: { completeness: 94, accuracy: 93, consistency: 91, timeliness: 95, uniqueness: 96 }, perm: true, status: 'online', onTime: '2024-03-20 11:00:00' },
  { name: 'dwd_realname_auth', cnName: '实名认证明细表', layer: 'DWD', storage: 'Hive', sourceSystem: '数据中台-DWD', domain: '用户域', freq: '每日', owner: '张三',
    desc: '实名认证过程与结果明细，含影像件与活体检测结果。', rows: 1180000, heat: 61, tags: ['实名', '合规'],
    fields: [['auth_id', 'string', '认证流水号', 'internal'], ['user_id', 'string', '用户ID', 'internal'], ['id_card', 'string', '身份证号', 'restricted'], ['auth_result', 'string', '认证结果', 'internal'], ['auth_time', 'timestamp', '认证时间', 'internal']],
    up: ['ods_customer_base'], down: ['dim_user'],
    dims: { completeness: 97, accuracy: 96, consistency: 95, timeliness: 90, uniqueness: 99 }, perm: true, status: 'online', onTime: '2024-03-22 09:00:00' },
  { name: 'dwd_fraud_alert', cnName: '反欺诈预警明细表', layer: 'DWD', storage: 'Hive', sourceSystem: '数据中台-DWD', domain: '风控域', freq: '实时', owner: '赵六',
    desc: '交易与行为反欺诈命中明细，供案件调查与模型迭代。', rows: 430000, heat: 78, tags: ['反欺诈', '实时'],
    fields: [['alert_id', 'string', '预警编号', 'internal'], ['user_id', 'string', '用户ID', 'internal'], ['rule_code', 'string', '命中规则', 'internal'], ['risk_score', 'decimal', '欺诈概率', 'sensitive'], ['alert_time', 'timestamp', '预警时间', 'internal']],
    up: ['ods_account_balance'], down: ['dws_risk_score', 'ads_risk_report_daily'],
    dims: { completeness: 92, accuracy: 90, consistency: 88, timeliness: 97, uniqueness: 95 },
    services: [['stream', '欺诈预警事件流', 'kafka://topic_fraud_alert', 'online']], perm: true, status: 'online', onTime: '2024-06-10 15:00:00' },
  { name: 'dws_risk_score', cnName: '用户风险评分汇总表', layer: 'DWS', storage: 'Hive', sourceSystem: '数据中台-DWS', domain: '风控域', freq: '每日', owner: '赵六',
    desc: '用户维度风险评分汇总，整合申请分、行为分、设备分，是风控决策核心宽表。', rows: 1250000, heat: 95, tags: ['风控', '评分', '宽表'],
    bizCaliber: '用户维度风险评分汇总，一个用户一条最新评分记录，整合申请评分、行为评分、设备评分三维度，是风控决策引擎的核心输入。',
    devCaliber: '每日凌晨 03:00 由 dwd_credit_apply + dwd_fraud_alert 聚合计算，评分模型版本 v3，按 user_id 去重后覆盖写入。',
    usage: '① 风控引擎调用 risk_tier 判断通过/拒绝；② BI 看板取 score_value 做客群分层；③ 严禁直接修改评分值，变更走模型迭代流程。',
    fields: [['user_id', 'string', '用户ID', 'internal'], ['score_type', 'string', '评分类型', 'internal'], ['score_value', 'decimal', '评分值', 'sensitive'], ['risk_tier', 'string', '风险档位', 'internal'], ['stat_date', 'string', '统计日期', 'public']],
    up: ['dim_user', 'dwd_credit_apply', 'dwd_fraud_alert'], down: ['ads_risk_report_daily', 'ads_churn_warning'],
    dims: { completeness: 96, accuracy: 95, consistency: 94, timeliness: 93, uniqueness: 97 },
    services: [['API', '风险评分查询API', '/api/v1/risk/score', 'online'], ['script', '月度评分批量导出', 'shell://etl/export_risk_score.sh', 'offline']], perm: true, status: 'online', onTime: '2024-04-01 08:00:00' },
  { name: 'dws_credit_analysis', cnName: '授信分析汇总表', layer: 'DWS', storage: 'Doris', sourceSystem: '数据中台-DWS', domain: '交易域', freq: '每日', owner: '李四',
    desc: '授信通过率、额度使用率等指标的多维汇总，服务于经营看板。', rows: 380000, heat: 74, tags: ['授信', '分析'],
    fields: [['stat_date', 'string', '统计日期', 'public'], ['product_code', 'string', '产品编码', 'internal'], ['apply_cnt', 'bigint', '申请量', 'internal'], ['pass_rate', 'decimal', '通过率', 'internal'], ['avg_amount', 'decimal', '件均额度', 'sensitive']],
    up: ['dwd_credit_apply'], down: ['ads_customer_overview'],
    dims: { completeness: 91, accuracy: 92, consistency: 90, timeliness: 89, uniqueness: 94 }, perm: true, status: 'online', onTime: '2024-07-01 10:00:00' },
  { name: 'dws_repayment_plan', cnName: '还款计划汇总表', layer: 'DWS', storage: 'Hive', sourceSystem: '数据中台-DWS', domain: '交易域', freq: '每日', owner: '王五',
    desc: '应还/实还计划明细汇总，逾期与回款分析的基础。', rows: 3600000, heat: 82, tags: ['还款', '汇总'],
    fields: [['plan_id', 'string', '计划编号', 'internal'], ['user_id', 'string', '用户ID', 'internal'], ['term_no', 'int', '期次', 'internal'], ['due_amount', 'decimal', '应还金额', 'sensitive'], ['repay_amount', 'decimal', '实还金额', 'sensitive'], ['overdue_days', 'int', '逾期天数', 'internal']],
    up: ['dwd_credit_contract', 'dwd_loan_drawdown'], down: ['dws_post_loan_monitor', 'ads_collect_case'],
    dims: { completeness: 97, accuracy: 96, consistency: 95, timeliness: 95, uniqueness: 98 }, perm: true, status: 'online', onTime: '2024-05-06 10:00:00' },
  { name: 'dws_post_loan_monitor', cnName: '贷后监控汇总表', layer: 'DWS', storage: 'Hive', sourceSystem: '数据中台-DWS', domain: '风控域', freq: '每日', owner: '赵六',
    desc: '贷后风险信号监控宽表：额度、逾期、行为异动多口径。', rows: 980000, heat: 69, tags: ['贷后', '监控'],
    fields: [['user_id', 'string', '用户ID', 'internal'], ['stat_date', 'string', '统计日期', 'public'], ['balance', 'decimal', '在贷余额', 'sensitive'], ['overdue_flag', 'int', '逾期标志', 'internal'], ['risk_signal', 'string', '风险信号', 'internal']],
    up: ['dwd_loan_drawdown', 'dws_repayment_plan'], down: ['ads_collect_case'],
    dims: { completeness: 93, accuracy: 92, consistency: 91, timeliness: 92, uniqueness: 95 }, perm: true, status: 'online', onTime: '2024-08-01 10:00:00' },
  { name: 'ads_customer_overview', cnName: '客户全景应用表', layer: 'ADS', storage: 'Doris', sourceSystem: '数据中台-ADS', domain: '用户域', freq: '每日', owner: '孙七',
    desc: '客户360应用层宽表，直接支撑客户全景页。', rows: 1250000, heat: 90, tags: ['客户360', '应用'],
    fields: [['user_id', 'string', '用户ID', 'internal'], ['cust_name', 'string', '客户姓名', 'sensitive'], ['cust_tier', 'string', '客户层级', 'internal'], ['total_credit', 'decimal', '总授信额度', 'sensitive'], ['last_active_time', 'timestamp', '最近活跃', 'internal']],
    up: ['dim_user', 'dws_credit_analysis'], down: [],
    dims: { completeness: 95, accuracy: 94, consistency: 93, timeliness: 94, uniqueness: 96 },
    services: [['API', '客户全景档案API', '/api/v1/customer/overview', 'online'], ['direct', '客服系统直连', 'doris://cs_db/ads_customer_overview', 'online']], perm: true, status: 'online', onTime: '2024-09-01 10:00:00' },
  { name: 'ads_risk_report_daily', cnName: '风险日报应用表', layer: 'ADS', storage: 'Doris', sourceSystem: '数据中台-ADS', domain: '风控域', freq: '每日', owner: '孙七',
    desc: '风控日报应用表，按产品/渠道维度的风险指标快照。', rows: 62000, heat: 58, tags: ['日报', '风控'],
    fields: [['report_date', 'string', '报告日期', 'public'], ['product_code', 'string', '产品编码', 'internal'], ['new_overdue_rate', 'decimal', '新增逾期率', 'internal'], ['fraud_hit_cnt', 'bigint', '欺诈命中数', 'internal']],
    up: ['dws_risk_score', 'dwd_fraud_alert'], down: [],
    dims: { completeness: 90, accuracy: 91, consistency: 89, timeliness: 93, uniqueness: 95 }, perm: true, status: 'online', onTime: '2024-09-15 10:00:00' },
  { name: 'ads_collect_case', cnName: '催收案件应用表', layer: 'ADS', storage: 'Doris', sourceSystem: '数据中台-ADS', domain: '风控域', freq: '每日', owner: '周八',
    desc: '催收案件分池应用表，支撑催收系统案件领取与绩效。', rows: 210000, heat: 64, tags: ['催收', '案件'],
    fields: [['case_id', 'string', '案件编号', 'internal'], ['user_id', 'string', '用户ID', 'internal'], ['overdue_amt', 'decimal', '逾期金额', 'sensitive'], ['pool_level', 'string', '分池等级', 'internal'], ['collector_id', 'string', '催收员', 'internal']],
    up: ['dws_repayment_plan', 'dws_post_loan_monitor'], down: [],
    dims: { completeness: 94, accuracy: 93, consistency: 92, timeliness: 96, uniqueness: 97 },
    services: [['direct', '催收系统直连', 'doris://coll_db/ads_collect_case', 'online']], perm: true, status: 'online', onTime: '2024-10-08 10:00:00' },
  { name: 'dwd_marketing_touch', cnName: '营销触达明细表', layer: 'DWD', storage: 'Hive', sourceSystem: '数据中台-DWD', domain: '营销域', freq: '每日', owner: '吴九',
    desc: '短信/外呼/推送多渠道触达明细，营销效果分析输入。', rows: 5800000, heat: 55, tags: ['营销', '触达'],
    fields: [['touch_id', 'string', '触达流水号', 'internal'], ['user_id', 'string', '用户ID', 'internal'], ['channel', 'string', '触达渠道', 'public'], ['template_code', 'string', '模板编码', 'internal'], ['touch_time', 'timestamp', '触达时间', 'internal']],
    up: ['ods_customer_base'], down: ['dws_marketing_effect'],
    dims: { completeness: 89, accuracy: 90, consistency: 88, timeliness: 92, uniqueness: 93 }, perm: true, status: 'online', onTime: '2024-11-01 10:00:00' },
  { name: 'dws_marketing_effect', cnName: '营销效果汇总表', layer: 'DWS', storage: 'Hive', sourceSystem: '数据中台-DWS', domain: '营销域', freq: '每日', owner: '吴九',
    desc: '活动维度转化率、ROI 汇总，营销复盘核心表。', rows: 96000, heat: 49, tags: ['营销', '效果'],
    fields: [['activity_id', 'string', '活动ID', 'internal'], ['stat_date', 'string', '统计日期', 'public'], ['touch_cnt', 'bigint', '触达人数', 'internal'], ['convert_cnt', 'bigint', '转化人数', 'internal'], ['roi', 'decimal', '投入产出比', 'internal']],
    up: ['dwd_marketing_touch'], down: [],
    dims: { completeness: 88, accuracy: 87, consistency: 86, timeliness: 85, uniqueness: 92 }, perm: true, status: 'online', onTime: '2024-11-20 10:00:00' },
  { name: 'dim_product', cnName: '产品维度表', layer: 'DIM', storage: 'Hive', sourceSystem: '数据中台-DIM', domain: '产品域', freq: '每周', owner: '张三',
    desc: '信贷产品主数据：编码、利率区间、期限、上下架状态。', rows: 1200, heat: 45, tags: ['产品', '维度'],
    fields: [['product_code', 'string', '产品编码', 'public'], ['product_name', 'string', '产品名称', 'public'], ['rate_range', 'string', '利率区间', 'internal'], ['term_range', 'string', '期限区间', 'internal'], ['online_flag', 'int', '在售标志', 'public']],
    up: [], down: ['dws_credit_analysis', 'ads_risk_report_daily'],
    dims: { completeness: 99, accuracy: 98, consistency: 97, timeliness: 80, uniqueness: 100 }, perm: true, status: 'online', onTime: '2024-02-10 10:00:00' },
  { name: 'dim_org', cnName: '机构维度表', layer: 'DIM', storage: 'Hive', sourceSystem: '数据中台-DIM', domain: '产品域', freq: '每周', owner: '张三',
    desc: '分支/团队/人员组织架构维度表。', rows: 3400, heat: 32, tags: ['机构', '维度'],
    fields: [['org_id', 'string', '机构编码', 'public'], ['org_name', 'string', '机构名称', 'public'], ['org_level', 'int', '机构层级', 'internal'], ['parent_org_id', 'string', '上级机构', 'internal']],
    up: [], down: ['ads_collect_case'],
    dims: { completeness: 97, accuracy: 96, consistency: 95, timeliness: 78, uniqueness: 99 }, perm: true, status: 'online', onTime: '2024-02-10 10:05:00' },

  // ========== 已上线 · 数据资源（ODS / 业务系统表） ==========
  { name: 'ods_loan_apply_inc', cnName: '授信申请增量表', layer: 'ODS', storage: 'Hive', sourceSystem: 'core_db(核心交易系统)', domain: '交易域', freq: '每小时', owner: '陈十',
    desc: '核心系统授信申请贴源增量同步表，DWD 层统一来源。', rows: 900000, heat: 70, tags: ['贴源', '增量'],
    fields: [['apply_id', 'string', '申请编号', 'internal'], ['cust_no', 'string', '客户号', 'internal'], ['apply_amount', 'decimal', '申请金额', 'sensitive'], ['apply_status', 'string', '状态', 'internal'], ['inc_time', 'timestamp', '同步时间', 'internal']],
    up: [], down: ['dwd_credit_apply'],
    dims: { completeness: 95, accuracy: 94, consistency: 96, timeliness: 97, uniqueness: 92 }, perm: true, status: 'online', onTime: '2024-03-01 08:00:00' },
  { name: 'ods_customer_base', cnName: '客户基础贴源表', layer: 'ODS', storage: 'Oracle', sourceSystem: 'core_db(核心交易系统)', domain: '用户域', freq: '每日', owner: '陈十',
    desc: '核心系统客户主档贴源表，保留源系统字段口径。', rows: 1300000, heat: 76, tags: ['贴源', '客户'],
    fields: [['cust_no', 'string', '客户号', 'internal'], ['cust_name', 'string', '客户姓名', 'sensitive'], ['id_type', 'string', '证件类型', 'internal'], ['id_no', 'string', '证件号码', 'restricted'], ['mobile', 'string', '手机号', 'sensitive'], ['open_date', 'string', '开户日期', 'internal']],
    up: [], down: ['dim_user', 'dwd_user_register'],
    dims: { completeness: 96, accuracy: 95, consistency: 94, timeliness: 90, uniqueness: 95 }, perm: true, status: 'online', onTime: '2024-02-20 08:00:00' },
  { name: 'ods_account_balance', cnName: '账户余额贴源表', layer: 'ODS', storage: 'Oracle', sourceSystem: 'core_db(核心交易系统)', domain: '交易域', freq: '每日', owner: '陈十',
    desc: '核心账务系统账户余额快照贴源表。', rows: 2200000, heat: 57, tags: ['贴源', '账务'],
    fields: [['account_no', 'string', '账号', 'sensitive'], ['cust_no', 'string', '客户号', 'internal'], ['balance', 'decimal', '余额', 'sensitive'], ['snapshot_date', 'string', '快照日期', 'public']],
    up: [], down: ['dwd_fraud_alert'],
    dims: { completeness: 94, accuracy: 93, consistency: 95, timeliness: 91, uniqueness: 93 }, perm: true, status: 'online', onTime: '2024-02-25 08:00:00' },
  { name: 't_order_trade', cnName: '交易订单表', layer: 'ODS', storage: 'MySQL', sourceSystem: 'trade_db(营销活动平台)', domain: '营销域', freq: '实时', owner: '刘一',
    desc: '营销活动平台交易订单业务表（源系统直连视图）。', rows: 4500000, heat: 63, tags: ['订单', '业务表'],
    fields: [['order_no', 'string', '订单号', 'internal'], ['user_no', 'string', '用户编号', 'internal'], ['order_amount', 'decimal', '订单金额', 'sensitive'], ['order_status', 'string', '订单状态', 'internal'], ['create_time', 'timestamp', '创建时间', 'internal']],
    up: [], down: ['ods_account_balance'],
    dims: { completeness: 91, accuracy: 90, consistency: 92, timeliness: 96, uniqueness: 94 }, perm: true, status: 'online', onTime: '2024-06-01 08:00:00' },
  { name: 't_repay_plan', cnName: '还款计划表', layer: 'ODS', storage: 'MySQL', sourceSystem: 'core_db(核心交易系统)', domain: '交易域', freq: '每日', owner: '刘一',
    desc: '核心系统还款计划业务表，DWS 还款汇总的贴源。', rows: 8900000, heat: 60, tags: ['还款', '业务表'],
    fields: [['plan_no', 'string', '计划编号', 'internal'], ['loan_no', 'string', '借据号', 'internal'], ['term_no', 'int', '期次', 'internal'], ['due_amt', 'decimal', '应还金额', 'sensitive'], ['due_date', 'string', '应还日期', 'internal']],
    up: [], down: ['dws_repayment_plan'],
    dims: { completeness: 95, accuracy: 94, consistency: 93, timeliness: 92, uniqueness: 96 }, perm: true, status: 'online', onTime: '2024-05-20 08:00:00' },
  { name: 't_risk_hit_rule', cnName: '风控命中规则表', layer: 'ODS', storage: 'MySQL', sourceSystem: 'risk_db(风控决策引擎)', domain: '风控域', freq: '实时', owner: '刘一',
    desc: '风控决策引擎规则命中流水业务表。', rows: 3200000, heat: 54, tags: ['风控', '规则'],
    fields: [['hit_id', 'string', '命中流水号', 'internal'], ['decision_id', 'string', '决策流水号', 'internal'], ['rule_code', 'string', '规则编码', 'internal'], ['hit_level', 'string', '命中等级', 'internal']],
    up: [], down: ['dwd_fraud_alert'],
    dims: { completeness: 92, accuracy: 91, consistency: 90, timeliness: 97, uniqueness: 93 }, perm: true, status: 'online', onTime: '2024-07-11 08:00:00' },
  { name: 't_customer_contact', cnName: '客户联系方式表', layer: 'ODS', storage: 'Oracle', sourceSystem: 'crm_db(用户中心)', domain: '用户域', freq: '每日', owner: '刘一',
    desc: 'CRM 客户联系联系方式业务表。', rows: 3100000, heat: 47, tags: ['联系', '业务表'],
    fields: [['contact_id', 'string', '联系记录号', 'internal'], ['cust_no', 'string', '客户号', 'internal'], ['phone', 'string', '电话', 'sensitive'], ['address', 'string', '通讯地址', 'sensitive'], ['relation', 'string', '与本人关系', 'internal']],
    up: [], down: ['ods_customer_base'],
    dims: { completeness: 90, accuracy: 92, consistency: 88, timeliness: 85, uniqueness: 91 }, perm: true, status: 'online', onTime: '2024-04-18 08:00:00' },
  { name: 't_loan_overdue', cnName: '逾期记录表', layer: 'ODS', storage: 'MySQL', sourceSystem: 'core_db(核心交易系统)', domain: '风控域', freq: '每日', owner: '刘一',
    desc: '核心系统逾期台账业务表。', rows: 680000, heat: 52, tags: ['逾期', '业务表'],
    fields: [['overdue_id', 'string', '逾期记录号', 'internal'], ['loan_no', 'string', '借据号', 'internal'], ['overdue_days', 'int', '逾期天数', 'internal'], ['overdue_amt', 'decimal', '逾期金额', 'sensitive']],
    up: [], down: ['ads_collect_case'],
    dims: { completeness: 96, accuracy: 95, consistency: 94, timeliness: 93, uniqueness: 97 }, perm: true, status: 'online', onTime: '2024-08-14 08:00:00' },
  { name: 'kafka_trade_flow', cnName: '交易流水主题', layer: 'ODS', storage: 'Kafka', sourceSystem: 'trade_stream(实时接入)', domain: '营销域', freq: '实时', owner: '陈十',
    desc: '实时交易流水 Kafka 主题贴源，CDC 流式接入。', rows: 12000000, heat: 58, tags: ['实时', '流'],
    fields: [['flow_id', 'string', '流水号', 'internal'], ['txn_amount', 'decimal', '交易金额', 'sensitive'], ['txn_time', 'string', '交易时间', 'internal'], ['merchant_no', 'string', '商户号', 'internal']],
    up: [], down: ['dwd_fraud_alert'],
    dims: { completeness: 93, accuracy: 92, consistency: 90, timeliness: 99, uniqueness: 92 }, perm: true, status: 'online', onTime: '2024-09-22 08:00:00' },
  { name: 'ods_cs_ticket', cnName: '客服工单贴源表', layer: 'ODS', storage: 'MySQL', sourceSystem: 'cs_db(数据分析平台)', domain: '产品域', freq: '每日', owner: '陈十',
    desc: '客服系统工单贴源同步表。', rows: 450000, heat: 41, tags: ['客服', '工单'],
    fields: [['ticket_id', 'string', '工单号', 'internal'], ['cust_no', 'string', '客户号', 'internal'], ['ticket_type', 'string', '工单类型', 'internal'], ['content', 'string', '工单内容', 'sensitive'], ['create_time', 'timestamp', '创建时间', 'internal']],
    up: [], down: ['dwd_marketing_touch'],
    dims: { completeness: 89, accuracy: 88, consistency: 87, timeliness: 90, uniqueness: 92 }, perm: true, status: 'online', onTime: '2024-10-30 08:00:00' },

  // ========== 未上线（演示：补元数据→检查→提交审核） ==========
  { name: 'dwd_cust_tag_change', cnName: '客户标签变更表', layer: 'DWD', storage: 'Hive', sourceSystem: '数据中台-DWD', domain: '用户域', freq: '每日', owner: '张三',
    desc: '', heat: 40, rows: 350000, tags: [],  // 检查①不过：无描述
    fields: [['user_id', 'string', '用户ID', 'internal'], ['tag_code', 'string', '', 'internal'], ['change_type', 'string', '变更类型', 'internal'], ['change_time', 'timestamp', '变更时间', 'internal']],  // tag_code 缺注释 → 检查①不过
    up: [], down: [],
    dims: { completeness: 85, accuracy: 88, consistency: 86, timeliness: 84, uniqueness: 90 }, perm: false, status: 'offline' },
  { name: 'dws_loan_bal_daily', cnName: '贷款余额日汇总表', layer: 'DWS', storage: 'Hive', sourceSystem: '数据中台-DWS', domain: '交易域', freq: '每日', owner: '王五',
    desc: '全量借据余额按日汇总，供经营分析与财务对账。', rows: 1400000, heat: 44, tags: ['余额', '汇总'],
    fields: [['stat_date', 'string', '统计日期', 'public'], ['product_code', 'string', '产品编码', 'internal'], ['bal_amt', 'decimal', '余额', 'sensitive'], ['loan_cnt', 'bigint', '借据数', 'internal']],
    up: [], down: [],  // 检查②不过：无血缘
    dims: { completeness: 92, accuracy: 93, consistency: 91, timeliness: 90, uniqueness: 95 }, perm: true, status: 'offline' },
  { name: 'ods_marketing_click', cnName: '营销点击日志表', layer: 'ODS', storage: 'Hive', sourceSystem: 'log_stream(日志数据)', domain: '营销域', freq: '每日', owner: '吴九',
    desc: '营销页面点击埋点日志贴源表。', rows: 9800000, heat: 38, tags: ['埋点', '日志'],
    fields: [['log_id', 'string', '日志ID', 'internal'], ['user_id', 'string', '用户ID', 'internal'], ['page_code', 'string', '页面编码', 'public'], ['click_time', 'string', '点击时间', 'internal']],
    up: [], down: ['dwd_marketing_touch'],
    dims: { completeness: 52, accuracy: 55, consistency: 60, timeliness: 70, uniqueness: 65 }, perm: true, status: 'offline' },  // 检查③不过：质量基线
  { name: 'ads_vip_profile', cnName: 'VIP客户画像表', layer: 'ADS', storage: 'Doris', sourceSystem: '数据中台-ADS', domain: '用户域', freq: '每日', owner: '孙七',
    desc: '高净值客户画像应用表，含资产、风险、偏好标签。', rows: 86000, heat: 51, tags: ['VIP', '画像'],
    fields: [['user_id', 'string', '用户ID', 'internal'], ['vip_level', 'string', 'VIP等级', 'internal'], ['total_asset', 'decimal', '总资产', 'restricted'], ['pref_channel', 'string', '偏好渠道', 'public']],
    up: ['dim_user'], down: [],
    dims: { completeness: 93, accuracy: 92, consistency: 91, timeliness: 92, uniqueness: 95 }, perm: false, status: 'offline' },  // 硬性全过，④软性提示
  { name: 'dim_city', cnName: '地区维度表', layer: 'DIM', storage: 'Hive', sourceSystem: '数据中台-DIM', domain: '产品域', freq: '每月', owner: '张三',
    desc: '行政区划维度表：省市编码、经济区划归并。', rows: 3200, heat: 30, tags: ['地区', '维度'],
    fields: [['city_code', 'string', '城市编码', 'public'], ['city_name', 'string', '城市名称', 'public'], ['province_code', 'string', '省份编码', 'public'], ['经济区', 'string', '经济区划', 'public']],
    up: [], down: ['dim_user'],
    dims: { completeness: 98, accuracy: 97, consistency: 98, timeliness: 75, uniqueness: 100 }, perm: true, status: 'offline' },  // 可直接走完全流程
  { name: 't_customer_invoice', cnName: '发票信息表', layer: 'ODS', storage: 'MySQL', sourceSystem: 'finance_db(财务核算系统)', domain: '财务域', freq: '每日', owner: '刘一',
    desc: '财务系统客户发票信息业务表。', rows: 260000, heat: 28, tags: ['发票', '业务表'],
    fields: [['invoice_id', 'string', '发票号', 'internal'], ['cust_no', 'string', '客户号', 'internal'], ['invoice_title', 'string', '发票抬头', 'sensitive'], ['tax_no', 'string', '税号', 'restricted']],
    up: [], down: ['ods_customer_base'],
    dims: { completeness: 95, accuracy: 96, consistency: 94, timeliness: 88, uniqueness: 97 }, perm: true, status: 'offline' },

  // ========== 审核中（演示管理者审核台） ==========
  { name: 'dwd_repay_detail', cnName: '还款流水明细表', layer: 'DWD', storage: 'Hive', sourceSystem: '数据中台-DWD', domain: '交易域', freq: '每日', owner: '王五',
    desc: '每笔还款入账明细，关联计划与实还。', rows: 7200000, heat: 62, tags: ['还款', '明细'],
    fields: [['repay_id', 'string', '还款流水号', 'internal'], ['plan_no', 'string', '计划编号', 'internal'], ['repay_amt', 'decimal', '还款金额', 'sensitive'], ['repay_time', 'timestamp', '还款时间', 'internal']],
    up: ['t_repay_plan'], down: ['dws_repayment_plan'],
    dims: { completeness: 95, accuracy: 94, consistency: 93, timeliness: 94, uniqueness: 96 }, perm: true, status: 'reviewing', onTime: undefined },
  { name: 'dws_collect_repay', cnName: '催回效果汇总表', layer: 'DWS', storage: 'Doris', sourceSystem: '数据中台-DWS', domain: '风控域', freq: '每日', owner: '周八',
    desc: '催收行动后回款效果汇总，分池分策略口径。', rows: 150000, heat: 46, tags: ['催回', '汇总'],
    fields: [['stat_date', 'string', '统计日期', 'public'], ['pool_level', 'string', '分池等级', 'internal'], ['collect_amt', 'decimal', '催回金额', 'sensitive'], ['case_cnt', 'bigint', '案件数', 'internal']],
    up: ['ads_collect_case', 'dws_repayment_plan'], down: [],
    dims: { completeness: 91, accuracy: 90, consistency: 89, timeliness: 92, uniqueness: 93 }, perm: true, status: 'reviewing' },
  { name: 'ads_churn_warning', cnName: '流失预警应用表', layer: 'ADS', storage: 'Doris', sourceSystem: '数据中台-ADS', domain: '产品域', freq: '每日', owner: '孙七',
    desc: '存量客户流失概率预警应用表，支撑挽留营销圈客。', rows: 420000, heat: 56, tags: ['流失', '预警'],
    fields: [['user_id', 'string', '用户ID', 'internal'], ['churn_prob', 'decimal', '流失概率', 'sensitive'], ['churn_tier', 'string', '流失等级', 'internal'], ['stat_date', 'string', '统计日期', 'public']],
    up: ['dws_risk_score'], down: [],
    dims: { completeness: 90, accuracy: 91, consistency: 89, timeliness: 93, uniqueness: 92 }, perm: false, status: 'reviewing' },  // 软性不过，审核台可见提示

  // ========== 已下线（演示：引用检查/恢复） ==========
  { name: 'dwd_old_risk_model_v1', cnName: '旧版风险模型评分表', layer: 'DWD', storage: 'Hive', sourceSystem: '数据中台-DWD', domain: '风控域', freq: '每日', owner: '赵六',
    desc: '已废弃的一代模型评分明细，被 dws_risk_score v3 口径替代。', rows: 1100000, heat: 12, tags: ['废弃', '风控'],
    fields: [['user_id', 'string', '用户ID', 'internal'], ['model_ver', 'string', '模型版本', 'internal'], ['score_v1', 'decimal', '一代评分', 'sensitive']],
    up: ['ods_account_balance'], down: ['dws_risk_score'],  // 有下游在线引用 → 下线拦截演示素材
    dims: { completeness: 70, accuracy: 68, consistency: 65, timeliness: 40, uniqueness: 80 }, perm: true, status: 'retired', offTime: '2025-06-30 18:00:00' },
  { name: 'ods_bank_flow_old', cnName: '旧银行流水贴源表', layer: 'ODS', storage: 'Oracle', sourceSystem: 'core_db(核心交易系统)', domain: '财务域', freq: '每日', owner: '陈十',
    desc: '旧核心系统银行流水贴源表，系统迁移后停用。', rows: 15000000, heat: 8, tags: ['贴源', '停用'],
    fields: [['flow_no', 'string', '流水号', 'internal'], ['acct_no', 'string', '账号', 'sensitive'], ['txn_amt', 'decimal', '交易金额', 'sensitive']],
    up: [], down: [],
    dims: { completeness: 75, accuracy: 72, consistency: 70, timeliness: 30, uniqueness: 85 }, perm: true, status: 'retired', offTime: '2025-03-15 18:00:00' },

  // ========== 数据要素底层（2026-09 要素层联动 · 业界标准映射） ==========
  // 指标 → Doris(OLAP 宽表) | 特征/变量 → HBase(rowkey 在线点查) | 实时事件 → Kafka(流订阅)
  // 供指标字典/特征字典/变量字典页展示「存储引擎 + 底层表」并跳转表详情
  { name: 'dws_metric_credit_rt', cnName: '授信指标实时宽表', layer: 'DWS', storage: 'Doris', sourceSystem: '数据中台-DWS', domain: '交易域', freq: '实时', owner: '李四',
    desc: '授信业务核心指标实时宽表（Doris 明细聚合模型），指标字典的指标取数与看板底表。', rows: 8600000, heat: 88, tags: ['指标', '实时', 'Doris'],
    fields: [['metric_code', 'string', '指标编码', 'public'], ['metric_name', 'string', '指标名称', 'public'], ['dim_date', 'string', '统计日期', 'public'], ['dim_org', 'string', '机构维度', 'internal'], ['apply_cnt', 'bigint', '授信申请笔数', 'internal'], ['pass_rate', 'decimal', '授信通过率', 'internal'], ['credit_amt', 'decimal', '授信额度合计(元)', 'sensitive']],
    up: ['dwd_credit_apply', 'dwd_credit_contract'], down: ['ads_metric_dashboard'],
    dims: { completeness: 95, accuracy: 94, consistency: 92, timeliness: 96, uniqueness: 97 }, perm: true, status: 'online', onTime: '2025-08-01 10:00:00',
    services: [['API', '授信指标查询API', '/api/v1/metric/credit/query', 'online'], ['direct', 'Doris 指标库直连(MySQL协议)', 'doris://dw_real.metric_credit_rt', 'online']] },
  { name: 'ads_metric_dashboard', cnName: '运营指标看板表', layer: 'ADS', storage: 'Doris', sourceSystem: '数据中台-ADS', domain: '产品域', freq: '每小时', owner: '孙七',
    desc: '面向看板消费的运营指标结果表（Doris 聚合模型），支撑指标字典趋势图快速取数。', rows: 520000, heat: 74, tags: ['指标', '看板', 'Doris'],
    fields: [['metric_code', 'string', '指标编码', 'public'], ['stat_hour', 'string', '统计小时', 'public'], ['channel', 'string', '渠道维度', 'internal'], ['metric_value', 'decimal', '指标值', 'internal'], ['compare_rate', 'decimal', '环比变化率', 'internal']],
    up: ['dws_metric_credit_rt'], down: [],
    dims: { completeness: 93, accuracy: 92, consistency: 94, timeliness: 90, uniqueness: 96 }, perm: true, status: 'online', onTime: '2025-08-05 14:00:00',
    services: [['API', '运营指标看板API', '/api/v1/dashboard/metrics', 'online']] },
  { name: 'ads_feature_user_rt', cnName: '客户实时特征表', layer: 'ADS', storage: 'HBase', sourceSystem: 'feature_store(特征平台)', domain: '风控域', freq: '实时', owner: '赵六',
    desc: '风控模型客户维度实时特征（HBase 宽表，rowkey=user_id，risk/behav 两个列族），特征字典在线点查底表。', rows: 3600000, heat: 91, tags: ['特征', '实时', 'HBase', '特征存储'],
    fields: [['user_id', 'string', '用户ID(rowkey)', 'internal'], ['risk:credit_score_rt', 'double', '实时信用评分', 'sensitive'], ['risk:over10d_cnt_90d', 'int', '近90天逾期10天+次数', 'sensitive'], ['behav:login_cnt_7d', 'int', '近7天登录次数', 'internal'], ['behav:apply_cnt_30d', 'int', '近30天申请次数', 'internal'], ['behav:last_active_time', 'string', '最近活跃时间', 'internal']],
    up: ['dws_risk_score', 'dwd_user_register'], down: [],
    dims: { completeness: 92, accuracy: 95, consistency: 90, timeliness: 98, uniqueness: 99 }, perm: true, status: 'online', onTime: '2025-09-01 09:30:00',
    services: [['API', '客户特征点查API', '/api/v1/feature/user/{user_id}', 'online']] },
  { name: 'ads_feature_device_rt', cnName: '设备实时特征表', layer: 'ADS', storage: 'HBase', sourceSystem: 'feature_store(特征平台)', domain: '风控域', freq: '实时', owner: '赵六',
    desc: '反欺诈设备维度实时特征（HBase，rowkey=device_id），变量字典设备类变量的取数底表。', rows: 5100000, heat: 79, tags: ['特征', '设备', 'HBase', '反欺诈'],
    fields: [['device_id', 'string', '设备ID(rowkey)', 'internal'], ['risk:risk_label', 'string', '设备风险标签', 'sensitive'], ['risk:is_emulator', 'int', '是否模拟器', 'internal'], ['risk:is_root', 'int', '是否Root/越狱', 'internal'], ['risk:txn_cnt_1h', 'int', '近1小时交易笔数', 'internal'], ['base:ip_city', 'string', 'IP归属城市', 'internal']],
    up: ['t_risk_hit_rule'], down: [],
    dims: { completeness: 88, accuracy: 93, consistency: 91, timeliness: 97, uniqueness: 98 }, perm: true, status: 'online', onTime: '2025-09-03 11:00:00',
    services: [['API', '设备特征查询API', '/api/v1/feature/device/{device_id}', 'online'], ['stream', '设备特征更新事件流', 'kafka://topic_device_feature_update', 'online']] },
  { name: 'kafka_credit_decision_flow', cnName: '授信决策实时事件流', layer: 'ODS', storage: 'Kafka', sourceSystem: 'risk_stream(实时接入)', domain: '交易域', freq: '实时', owner: '刘一',
    desc: '风控决策引擎输出的授信审批实时事件流（标准 Kafka 源主题），下游指标宽表与特征更新的事件源头。', rows: 22000000, heat: 85, tags: ['实时', '事件流', 'Kafka', '授信'],
    fields: [['event_id', 'string', '事件ID', 'internal'], ['apply_no', 'string', '授信申请编号', 'internal'], ['decision_result', 'string', '审批决策结果', 'internal'], ['score', 'double', '决策评分', 'sensitive'], ['hit_rules', 'string', '命中规则列表', 'internal'], ['event_time', 'string', '事件时间', 'public']],
    up: ['t_risk_hit_rule'], down: ['dws_metric_credit_rt', 'ads_feature_user_rt'],
    dims: { completeness: 90, accuracy: 92, consistency: 88, timeliness: 99, uniqueness: 95 }, perm: true, status: 'online', onTime: '2025-09-10 08:00:00',
    services: [['stream', '授信决策事件订阅', 'kafka://topic_credit_decision', 'online']] },
  { name: 'kafka_user_behavior_flow', cnName: '用户行为实时事件流', layer: 'ODS', storage: 'Kafka', sourceSystem: 'log_stream(日志数据)', domain: '营销域', freq: '实时', owner: '吴九',
    desc: 'APP 埋点用户行为实时事件流，行为类特征变量的候选源，当前未上线（演示未上线池 Kafka 主题）。', rows: 98000000, heat: 61, tags: ['实时', '埋点', 'Kafka', '行为'],
    fields: [['event_id', 'string', '事件ID', 'internal'], ['user_id', 'string', '用户ID', 'internal'], ['event_type', 'string', '事件类型', 'public'], ['page_code', 'string', '页面编码', 'internal'], ['device_id', 'string', '设备ID', 'internal'], ['event_time', 'string', '事件时间', 'public']],
    up: ['ods_marketing_click'], down: [],
    dims: { completeness: 82, accuracy: 85, consistency: 80, timeliness: 98, uniqueness: 88 }, perm: false, status: 'offline' }
]

// ---------------- 种子展开 ----------------

function expandSeed(s: TableSeed, idx: number): LogicalTable {
  const fields = s.fields.map(f)
  const score = computeQualityScore(s.dims)
  const sensitivity = fields.reduce<Sensitivity>((acc, x) =>
    SENSITIVITY_ORDER.indexOf(x.sensitivity) > SENSITIVITY_ORDER.indexOf(acc) ? x.sensitivity : acc, 'public')
  const table: LogicalTable = {
    tableId: `T${String(idx + 1).padStart(4, '0')}`,
    name: s.name,
    cnName: s.cnName,
    assetType: s.layer === 'ODS' ? 'resource' : 'asset',
    layer: s.layer,
    storage: s.storage,
    sourceSystem: s.sourceSystem,
    domain: s.domain,
    updateFrequency: s.freq,
    owner: s.owner,
    description: s.desc,
    businessCaliber: s.bizCaliber,
    devCaliber: s.devCaliber,
    usageGuide: s.usage,
    recordCount: s.rows,
    heat: s.heat,
    tags: s.tags,
    fields,
    upstream: s.up || [],
    downstream: s.down || [],
    quality: s.dims,
    qualityScore: score,
    sensitivity,
    services: (s.services || []).map((x, i) => ({
      id: `${s.name}-svc-${i + 1}`, kind: x[0], name: x[1], endpoint: x[2], status: x[3],
      createdAt: s.onTime || '2025-01-01 00:00:00',
      updatedAt: s.onTime || '2025-01-01 00:00:00'
    })),
    permissionConfigured: s.perm !== false,
    status: s.status,
    onTime: s.onTime,
    offTime: s.offTime,
    changeLog: [],
    history: []
  }
  if (s.onTime) {
    table.changeLog.push({ ts: s.onTime, type: '上线', desc: '表正式上线，进入数据发现可见范围', actor: table.owner })
    table.history.push({ ts: s.onTime, action: '审核通过', actor: '数据管理员' })
  }
  if (s.offTime) {
    table.changeLog.push({ ts: s.offTime, type: '下线', desc: '表已下线，对消费侧不可见', actor: '数据管理员' })
    table.history.push({ ts: s.offTime, action: '下线', actor: '数据管理员' })
  }
  // 质量变更记录（带 oldValue/newValue，演示 E7 对比能力）
  if (s.onTime && score > 0) {
    table.changeLog.push({
      ts: s.onTime, type: '质量变更', desc: `质量评分初始化为 ${score} 分`,
      actor: '质量引擎', oldValue: '—', newValue: `${score} 分`
    })
  }
  // 服务变更记录（带 oldValue/newValue）
  if (s.services && s.services.length > 0 && s.onTime) {
    const svcNames = s.services.map(x => x[1]).join('、')
    table.changeLog.push({
      ts: s.onTime, type: '服务变更', desc: `新增服务暴露：${svcNames}`,
      actor: table.owner, oldValue: '无', newValue: svcNames
    })
  }
  if (s.status === 'reviewing') {
    table.reviewInfo = {
      submittedBy: table.owner,
      submittedAt: '2026-09-14 10:20:00',
      checks: runChecks(table)
    }
    table.history.push({ ts: table.reviewInfo.submittedAt, action: '提交上线', actor: table.owner })
  }
  return table
}

// ---------------- 检查项（挡板） ----------------

export const REVIEW_CHECK_DEFS = [
  { key: 'meta_complete', name: '元数据完整性', hard: true },
  { key: 'lineage_traceable', name: '血缘可追溯', hard: true },
  { key: 'quality_baseline', name: '质量基线 (评分≥60)', hard: true },
  { key: 'permission_configured', name: '权限策略配置', hard: false },
  { key: 'sensitivity_tagged', name: '字段分级标签', hard: false }
]

/** 对表执行 5 项上线检查（纯前端一行判断级别的挡板） */
export function runChecks(t: LogicalTable): ReviewCheck[] {
  const noCommentFields = t.fields.filter(x => !x.description).map(x => x.name)
  const metaOk = !!t.description && !!t.owner && noCommentFields.length === 0
  const lineageOk = t.upstream.length > 0 || t.downstream.length > 0
  const qualityOk = t.qualityScore >= 60
  const permOk = t.permissionConfigured
  const sensOk = noCommentFields.length === 0 && t.fields.length > 0
  return [
    { key: 'meta_complete', name: '元数据完整性', hard: true, passed: metaOk, message: metaOk ? '描述、负责人、字段注释均已补全' : `缺失：${!t.description ? '表描述' : ''}${noCommentFields.length ? ` 字段注释(${noCommentFields.join('、')})` : ''}`.trim() },
    { key: 'lineage_traceable', name: '血缘可追溯', hard: true, passed: lineageOk, message: lineageOk ? `上游 ${t.upstream.length} / 下游 ${t.downstream.length} 已登记` : '未登记任何上下游血缘，无法评估影响面' },
    { key: 'quality_baseline', name: '质量基线', hard: true, passed: qualityOk, message: `综合质量评分 ${t.qualityScore} 分${qualityOk ? '，达到 60 分基线' : '，未达 60 分基线，请先配置质量规则并治理'}` },
    { key: 'permission_configured', name: '权限策略配置', hard: false, passed: permOk, message: permOk ? '已配置默认可见范围与授权策略' : '未配置权限策略，上线后默认仅负责人可见' },
    { key: 'sensitivity_tagged', name: '字段分级标签', hard: false, passed: sensOk, message: sensOk ? '全部字段已标注分级' : '存在未标注分级的字段，建议补齐后再上线' }
  ]
}

export function hardChecksPassed(checks: ReviewCheck[]): boolean {
  return checks.filter(c => c.hard).every(c => c.passed)
}

// ---------------- Store ----------------

// v2（2026-09 要素层联动）：新增 HBase/Doris/Kafka 底层表种子后升级 key 重建，
//   避免旧 v1 缓存遮蔽新表；v1 残留一次性清除
const LS_KEY = 'dca-table-catalog-v3'
try { localStorage.removeItem('dca-table-…v2') } catch { /* ignore */ }

function buildSeedTables(): LogicalTable[] {
  return SEEDS.map(expandSeed)
}

function loadInitial(): LogicalTable[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as LogicalTable[]
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch { /* ignore */ }
  return buildSeedTables()
}

const tables = ref<LogicalTable[]>(loadInitial())

function persist() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(tables.value))
  } catch { /* quota ignore */ }
}

/** 状态变更 → 生成站内通知（挡板文案） */
function notify(title: string, content: string, priority: 'high' | 'medium' | 'low' = 'medium') {
  const ts = nowStr()
  NotificationAPI.createNotification({
    title, content, category: '审批通知', categoryId: 'CAT003',
    priority, status: 'published', publishTime: ts, expireTime: '2099-12-31 23:59:59',
    source: '表生命周期引擎', createdBy: '系统', targetUsers: '全体用户', important: false, isTop: false
  }).catch(() => { /* noop */ })
}

export interface OfflineRefs {
  downstreamTables: Array<{ name: string; cnName: string; status: TableStatus }>
  onlineServices: ServiceExposure[]
}

export const TableCatalogStore = {
  // ---- 响应式表数据（只读 ref，外部组件可直接 watch） ----
  get tables() { return tables },

  // ---- 查询 ----
  all(): LogicalTable[] {
    return tables.value.filter(t => t.status !== 'deleted')
  },
  /** 发现域可见（已上线；审核中仅元数据可见） */
  discoverable(): LogicalTable[] {
    return tables.value.filter(t => t.status === 'online')
  },
  byName(name: string): LogicalTable | undefined {
    return tables.value.find(t => t.name === name && t.status !== 'deleted')
  },
  byId(id: string): LogicalTable | undefined {
    return tables.value.find(t => t.tableId === id)
  },
  byStatus(...st: TableStatus[]): LogicalTable[] {
    return tables.value.filter(t => st.includes(t.status))
  },
  stats() {
    const g = (s: TableStatus) => tables.value.filter(t => t.status === s).length
    return {
      total: tables.value.filter(t => t.status !== 'deleted').length,
      declaredTotal: 752, // 文档存量口径：752 张存量表默认已上线（Demo 只精编其中一部分）
      online: g('online'), offline: g('offline'), reviewing: g('reviewing'),
      retired: g('retired'),
      avgQuality: Math.round(tables.value.filter(t => t.status === 'online').reduce((a, t) => a + t.qualityScore, 0) / Math.max(1, g('online'))),
      byLayer: (['ODS', 'DWD', 'DWS', 'ADS', 'DIM'] as Layer[]).map(l => ({ layer: l, count: tables.value.filter(t => t.layer === l && t.status !== 'deleted').length }))
    }
  },

  // ---- 检索（统一搜索底座） ----
  search(keyword: string, scope: 'all' | 'asset' | 'resource' = 'all'): LogicalTable[] {
    const kw = keyword.toLowerCase()
    const visible = tables.value.filter(t => t.status === 'online' || t.status === 'reviewing')
    return visible.filter(t => {
      if (scope === 'asset' && t.assetType !== 'asset') return false
      if (scope === 'resource' && t.assetType !== 'resource') return false
      return !kw ||
        t.name.toLowerCase().includes(kw) ||
        t.cnName.toLowerCase().includes(kw) ||
        t.description.toLowerCase().includes(kw) ||
        t.domain.toLowerCase().includes(kw) ||
        t.owner.includes(keyword) ||
        t.tags.some(x => x.toLowerCase().includes(kw))
    }).sort((a, b) => b.heat - a.heat)
  },
  searchFields(keyword: string): Array<{ table: LogicalTable; field: CatalogField }> {
    const kw = keyword.toLowerCase()
    const hits: Array<{ table: LogicalTable; field: CatalogField }> = []
    for (const t of tables.value) {
      if (t.status === 'deleted' || t.status === 'retired') continue
      for (const fd of t.fields) {
        if (fd.name.toLowerCase().includes(kw) || fd.description.includes(keyword)) {
          hits.push({ table: t, field: fd })
        }
      }
      if (hits.length > 30) return hits
    }
    return hits
  },
  /** 消费角色可见性（挡板：高敏表未授权则只露元数据） */
  accessibleFor(t: LogicalTable, role: string): boolean {
    if (role === 'admin' || role === 'data_admin') return true
    if (t.sensitivity === 'restricted') return t.owner === '当前用户' // 演示：高敏默认未授权
    return true
  },

  // ---- 生命周期动作 ----
  updateMeta(tableId: string, patch: Partial<LogicalTable>, actor = '数据工程师'): { ok: boolean; message: string } {
    const t = tables.value.find(x => x.tableId === tableId)
    if (!t) return { ok: false, message: '表不存在' }
    if (t.status === 'online') return { ok: false, message: '已上线的表请走变更流程，不支持直接编辑' }
    Object.assign(t, patch)
    t.history.unshift({ ts: nowStr(), action: '元数据更新', actor })
    t.changeLog.unshift({ ts: nowStr(), type: '元数据变更', desc: '补全/修正表级与字段级元数据', actor })
    persist()
    return { ok: true, message: '元数据已保存' }
  },

  /** 提交上线申请：执行 5 项检查，硬性不过则拦截 */
  submitForReview(tableId: string, actor = '数据工程师'): { ok: boolean; checks: ReviewCheck[]; message: string } {
    const t = tables.value.find(x => x.tableId === tableId)
    if (!t) return { ok: false, checks: [], message: '表不存在' }
    if (t.status !== 'offline') return { ok: false, checks: [], message: `当前状态为「${STATUS_LABELS[t.status]}」，不可提交上线申请` }
    const checks = runChecks(t)
    t.reviewInfo = { submittedBy: actor, submittedAt: nowStr(), checks }
    if (!hardChecksPassed(checks)) {
      const failed = checks.filter(c => c.hard && !c.passed).map(c => c.name).join('、')
      persist()
      return { ok: false, checks, message: `上线检查未通过：${failed}（硬性检查项）` }
    }
    t.status = 'reviewing'
    t.history.unshift({ ts: nowStr(), action: '提交上线', actor })
    persist()
    return { ok: true, checks, message: '已提交，等待数据管理员审核' }
  },

  approve(tableId: string, actor = '数据管理员'): { ok: boolean; message: string } {
    const t = tables.value.find(x => x.tableId === tableId)
    if (!t || t.status !== 'reviewing') return { ok: false, message: '表不在审核中' }
    t.status = 'online'
    t.onTime = nowStr()
    t.reviewInfo = undefined
    t.history.unshift({ ts: t.onTime, action: '审核通过', actor })
    t.changeLog.unshift({ ts: t.onTime, type: '上线', desc: '上线审核通过，表进入发现可见范围', actor })
    notify(`表「${t.name}」上线审核已通过`, `您提交的表「${t.name}（${t.cnName}）」已通过上线审核，现可在统一搜索中检索到。`, 'low')
    persist()
    return { ok: true, message: `「${t.name}」已上线` }
  },

  reject(tableId: string, reason: string, actor = '数据管理员'): { ok: boolean; message: string } {
    const t = tables.value.find(x => x.tableId === tableId)
    if (!t || t.status !== 'reviewing') return { ok: false, message: '表不在审核中' }
    t.status = 'offline'
    if (t.reviewInfo) t.reviewInfo.rejectReason = reason
    t.history.unshift({ ts: nowStr(), action: '审核驳回', actor, comment: reason })
    notify(`表「${t.name}」上线审核被驳回`, `驳回原因：${reason}。请完善后重新提交上线申请。`, 'high')
    persist()
    return { ok: true, message: `已驳回，原因同步给负责人 ${t.owner}` }
  },

  /** 批量审核通过（审核检查项已在提交时完成） */
  batchApprove(tableIds: string[], actor = '数据管理员'): { success: number; failed: number } {
    let success = 0, failed = 0
    for (const id of tableIds) {
      const r = this.approve(id, actor)
      r.ok ? success++ : failed++
    }
    if (success > 0) notify('批量上线审核完成', `本次批量审核通过 ${success} 张表${failed ? `，${failed} 张失败` : ''}。`, 'low')
    return { success, failed }
  },

  /** 下线引用检查（纯前端 store 扫描） */
  checkOfflineRefs(tableId: string): OfflineRefs | null {
    const t = tables.value.find(x => x.tableId === tableId)
    if (!t) return null
    const downstreamTables = t.downstream
      .map(n => tables.value.find(x => x.name === n))
      .filter((x): x is LogicalTable => !!x && x.status !== 'deleted' && x.status !== 'retired')
      .map(x => ({ name: x.name, cnName: x.cnName, status: x.status }))
    const onlineServices = t.services.filter(s => s.status === 'online')
    return { downstreamTables, onlineServices }
  },

  /**
   * 下线：存在下游引用/在线服务且未 force → 拦截并返回引用清单；
   * force 或无引用 → 置 retired，服务联动下线。
   */
  offline(tableId: string, force = false, actor = '数据管理员'): { ok: boolean; refs: OfflineRefs | null; message: string } {
    const t = tables.value.find(x => x.tableId === tableId)
    if (!t) return { ok: false, refs: null, message: '表不存在' }
    if (t.status !== 'online') return { ok: false, refs: null, message: `当前状态为「${STATUS_LABELS[t.status]}」，不可下线` }
    const refs = this.checkOfflineRefs(tableId)!
    if (!force && (refs.downstreamTables.length > 0 || refs.onlineServices.length > 0)) {
      return { ok: false, refs, message: '存在下游依赖或在线服务，需确认后强制下线' }
    }
    t.status = 'retired'
    t.offTime = nowStr()
    for (const s of t.services) {
      if (s.status === 'online') { s.status = 'offline'; s.updatedAt = t.offTime }
    }
    t.history.unshift({ ts: t.offTime, action: '下线', actor, comment: force && (refs.downstreamTables.length || refs.onlineServices.length) ? '强制下线（含引用）' : undefined })
    t.changeLog.unshift({ ts: t.offTime, type: '下线', desc: '表已下线，不再出现在统一搜索', actor })
    notify(`表「${t.name}」已下线`, `表「${t.name}（${t.cnName}）」已被下线${refs.downstreamTables.length ? `，其 ${refs.downstreamTables.length} 个下游引用需自行迁移` : ''}。`, 'high')
    persist()
    return { ok: true, refs, message: `「${t.name}」已下线` }
  },

  /** 恢复上线：retired → online */
  restore(tableId: string, actor = '数据管理员'): { ok: boolean; message: string } {
    const t = tables.value.find(x => x.tableId === tableId)
    if (!t || t.status !== 'retired') return { ok: false, message: '仅已下线的表可恢复' }
    t.status = 'online'
    t.offTime = undefined
    t.history.unshift({ ts: nowStr(), action: '恢复上线', actor })
    t.changeLog.unshift({ ts: nowStr(), type: '上线', desc: '已下线表恢复上线', actor })
    notify(`表「${t.name}」恢复上线`, `表「${t.name}（${t.cnName}）」已恢复上线，重新进入发现可见范围。`, 'medium')
    persist()
    return { ok: true, message: `「${t.name}」已恢复上线` }
  },

  /** 删除：retired → deleted（逻辑删除，退出所有列表） */
  remove(tableId: string, actor = '数据管理员'): { ok: boolean; message: string } {
    const t = tables.value.find(x => x.tableId === tableId)
    if (!t) return { ok: false, message: '表不存在' }
    if (t.status !== 'retired') return { ok: false, message: '请先下线再删除' }
    t.status = 'deleted'
    t.history.unshift({ ts: nowStr(), action: '删除', actor })
    persist()
    return { ok: true, message: `「${t.name}」已删除（保留审计记录）` }
  },

  // ---- 服务暴露（P3 服务 Tab 使用） ----
  addService(tableId: string, svc: Omit<ServiceExposure, 'id' | 'updatedAt' | 'createdAt'>, actor = '数据管理员'): { ok: boolean; message: string } {
    const t = tables.value.find(x => x.tableId === tableId)
    if (!t) return { ok: false, message: '表不存在' }
    if (t.status !== 'online') return { ok: false, message: '仅已上线的表可配置服务暴露' }
    const ts = nowStr()
    t.services.push({ ...svc, id: `svc-${Date.now().toString(36)}`, createdAt: ts, updatedAt: ts })
    t.history.unshift({ ts: nowStr(), action: '服务变更', actor, comment: `新增${SERVICE_KIND_LABELS[svc.kind]}「${svc.name}」` })
    t.changeLog.unshift({ ts: nowStr(), type: '服务变更', desc: `新增${SERVICE_KIND_LABELS[svc.kind]}：${svc.name}`, actor })
    persist()
    return { ok: true, message: '服务已添加' }
  },

  updateService(tableId: string, serviceId: string, patch: Partial<ServiceExposure>, actor = '数据管理员'): { ok: boolean; message: string } {
    const t = tables.value.find(x => x.tableId === tableId)
    const svc = t?.services.find(s => s.id === serviceId)
    if (!t || !svc) return { ok: false, message: '服务不存在' }
    Object.assign(svc, patch, { updatedAt: nowStr() })
    t.changeLog.unshift({ ts: nowStr(), type: '服务变更', desc: `更新${SERVICE_KIND_LABELS[svc.kind]}：${svc.name}`, actor })
    persist()
    return { ok: true, message: '服务已更新' }
  },

  removeService(tableId: string, serviceId: string, actor = '数据管理员'): { ok: boolean; message: string } {
    const t = tables.value.find(x => x.tableId === tableId)
    if (!t) return { ok: false, message: '表不存在' }
    const idx = t.services.findIndex(s => s.id === serviceId)
    if (idx < 0) return { ok: false, message: '服务不存在' }
    const [svc] = t.services.splice(idx, 1)
    t.history.unshift({ ts: nowStr(), action: '服务变更', actor, comment: `移除${SERVICE_KIND_LABELS[svc.kind]}「${svc.name}」` })
    t.changeLog.unshift({ ts: nowStr(), type: '服务变更', desc: `移除${SERVICE_KIND_LABELS[svc.kind]}：${svc.name}`, actor })
    persist()
    return { ok: true, message: '服务已移除' }
  },

  /**
   * 采集登记（metadata-bus 产物入口）：自动发现的表写入目录，初始态=未上线。
   * 产物刻意不带字段/血缘/质量分，提交上线时会被检查②③硬拦，走"完善元数据→再提交"演示流。
   */
  registerCollected(input: {
    name: string
    cnName?: string
    storage: StorageType
    layer?: Layer
    assetType?: AssetType
    sourceSystem?: string
    domain?: string
    owner?: string
    description?: string
  }): { ok: boolean; message: string; tableId: string } {
    const exist = tables.value.find(t => t.name === input.name && t.status !== 'deleted')
    if (exist) return { ok: false, message: `表「${input.name}」已存在，跳过重复登记`, tableId: exist.tableId }
    const ts = nowStr()
    const tableId = `T-${Date.now().toString(36)}`
    const t: LogicalTable = {
      tableId,
      name: input.name,
      cnName: input.cnName || input.name,
      assetType: input.assetType || 'resource',
      layer: input.layer || 'ODS',
      storage: input.storage,
      sourceSystem: input.sourceSystem || String(input.storage),
      domain: input.domain || '未分类',
      updateFrequency: '日更',
      owner: input.owner || '数据工程组',
      description: input.description || '采集任务自动登记（待完善元数据）',
      recordCount: 0,
      heat: 0,
      tags: ['自动发现'],
      fields: [],
      upstream: [],
      downstream: [],
      quality: { completeness: 0, accuracy: 0, consistency: 0, timeliness: 0, uniqueness: 0 },
      qualityScore: 0,
      sensitivity: 'internal',
      services: [],
      permissionConfigured: false,
      status: 'offline',
      changeLog: [{ ts, type: '元数据变更', desc: '采集任务自动登记，进入未上线池', actor: '元数据采集' }],
      history: [{ ts, action: '元数据更新', actor: '元数据采集', comment: '采集登记' }]
    }
    tables.value.unshift(t)
    persist()
    return { ok: true, message: `采集登记完成：「${input.name}」已进入未上线池`, tableId }
  },

  /** 质量分回填（P2 质量看板用）：写入五维 + 加权总分，挡板 */
  setQuality(tableName: string, dims: QualityDims, actor = '质量引擎') {
    const t = tables.value.find(x => x.name === tableName)
    if (!t) return false
    t.quality = { ...dims }
    t.qualityScore = computeQualityScore(dims)
    t.changeLog.unshift({ ts: nowStr(), type: '质量变更', desc: `质量评分更新为 ${t.qualityScore}`, actor })
    persist()
    return true
  },

  /** 演示前重置：清空本地持久化，回到种子数据 */
  resetTableCatalog() {
    try { localStorage.removeItem(LS_KEY) } catch { /* noop */ }
    tables.value = buildSeedTables()
    persist()
  },
}