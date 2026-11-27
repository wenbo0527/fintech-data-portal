/**
 * Demo 增补层（2026-11-23 按业务方「上述都需要有」的裁定落地）
 *
 * 原则：
 *   1. 不改仓库共享 mock（business-concept-store / table-catalog-store）；
 *   2. 借据的表名与字段取自仓库既有的 unified-query 库树（dwd_loan_daily / dwd_loan_detail），非编造；
 *   3. 实体别名只做展示对齐（授信合同→协议、贷后记录→逾期表现）；
 *   4. 产品归属明确标注「示例归属，待业务确认」，仅用于演示筛选；
 *   5. 本文件同时被 T2.5 质检（scripts/verify-datamap-demo-data.js）解析，字段写法请与 catalog 保持一致。
 */
import type { DemoEntity, DemoRelation, DemoTable, DemoRelationType, DemoTier } from './derive'

/* ---------------- 实体：补「借据」 ---------------- */
const RAW_EXTRA_ENTITIES = [
  { code: 'ENT009', name: '借据', domainCode: 'DOM004', description: '放款成功后生成的借据，一笔支用单对应一张借据，是还款与逾期的最小核算单元' }
]

export const EXTRA_ENTITIES: DemoEntity[] = RAW_EXTRA_ENTITIES.map((e, i) => ({
  id: e.code,
  name: e.name,
  kind: 'entity',
  domain: 'risk',
  description: e.description,
  order: 9 + i,
  stageId: e.domainCode,
  entityCode: 'LOAN.NOTE',
  registryStatus: 'approved',
  manageStatus: 'active',
  alias: '支用凭证'
}))

/** 与 SPEC v2 的实体命名统一（只影响展示，不改仓库 code） */
export const ENTITY_ALIASES: Record<string, string> = {
  ENT004: '协议',
  ENT008: '逾期表现'
}

/* ---------------- 关系：补 借据 两条 ---------------- */
const RAW_EXTRA_RELATIONS = [
  { id: 'REL009', label: '生成', sourceEntityCode: 'ENT006', targetEntityCode: 'ENT009', type: 'derivative', description: '支用单放款后生成借据，一张支用单对应一张借据' },
  { id: 'REL010', label: '归属', sourceEntityCode: 'ENT009', targetEntityCode: 'ENT004', type: 'association', description: '借据归属授信合同（协议），额度与期限继承合同条款' }
]

const REL_TYPE: Record<string, DemoRelationType> = { derivative: 'sequence', association: 'associate' }

export const EXTRA_RELATIONS: DemoRelation[] = RAW_EXTRA_RELATIONS.map(r => ({
  id: r.id,
  src: r.sourceEntityCode,
  dst: r.targetEntityCode,
  type: REL_TYPE[r.type] ?? 'associate',
  label: r.label,
  description: r.description
}))

/* ---------------- 表：借据两张（真实表名与字段）+ 支用申请归属修正 ---------------- */
interface RawTable {
  name: string
  cnName: string
  layer: string
  status: 'online' | 'offline'
  entityId: string
  heat: number
  freq: string
  owner: string
  desc: string
  tags: string[]
  fields: Array<[string, string, string]>
}

const RAW_EXTRA_TABLES: RawTable[] = [
  { name: 'dwd_loan_daily',
    cnName: '放款明细表',
    layer: 'DWD',
    status: 'online',
    entityId: 'ENT009',
    heat: 78,
    freq: '每日',
    owner: '数方-用信组',
    desc: '按借据号记录的放款明细，含放款金额、状态与渠道，是借据核算与逾期判定的源头事实表。',
    tags: ['借据', '放款', '明细'],
    fields: [
      ['loan_no', 'varchar(32)', '借据号'],
      ['cust_name', 'varchar(64)', '客户姓名'],
      ['amount', 'decimal(18,2)', '放款金额'],
      ['status', 'varchar(16)', '放款状态'],
      ['channel', 'varchar(16)', '渠道'],
      ['dt', 'date', '数据日期']
    ]
  },
  { name: 'dwd_loan_detail',
    cnName: '贷款明细宽表',
    layer: 'DWD',
    status: 'online',
    entityId: 'ENT009',
    heat: 70,
    freq: '每日',
    owner: '数方-用信组',
    desc: '贷款申请的审批结果宽表，含借据号、产品与审批状态，适配按产品维度的借据下钻分析。',
    tags: ['借据', '审批', '宽表'],
    fields: [
      ['loan_no', 'string', '借据号'],
      ['product_name', 'string', '产品名称'],
      ['apply_amount', 'decimal(18,2)', '申请金额'],
      ['approval_status', 'string', '审批状态'],
      ['approve_time', 'string', '审批时间']
    ]
  }
]

/** 表 → 实体 的显式归属修正（支用环节的申请/放款流水归「支用申请」） */
export const ENTITY_OVERRIDES: Record<string, string> = {
  dwd_loan_drawdown: 'ENT005'
}

function tierOf (layer: string, status: string): DemoTier {
  if (status !== 'online') {return 'tech'}
  if (layer === 'DWS') {return 'recommended'}
  if (layer === 'DWD') {return 'fallback'}
  return 'tech'
}

export const EXTRA_TABLES: DemoTable[] = RAW_EXTRA_TABLES.map(t => ({
  name: t.name,
  cnName: t.cnName,
  entityId: t.entityId,
  tier: tierOf(t.layer, t.status),
  layer: t.layer,
  status: t.status,
  owner: t.owner,
  heat: t.heat,
  fieldCount: t.fields.length,
  lastUpdated: '2026-11-20',
  reason: t.desc,
  linkSource: 'supplement',
  bizDomain: '交易域',
  tags: t.tags,
  freq: t.freq,
  syncStatus: 'synced',
  lastVerifiedAt: '2026-11-20',
  usageHeat: 0,
  recommendReason: `${t.desc}（口径已上线 · ${t.freq}粒度 · ${t.layer}层）`,
  fields: t.fields.map(([name, type, cn]) => ({ name, type, cn, sensitivity: 'internal' as const }))
}))

/* ---------------- 产品：示例归属（待业务确认，仅用于演示筛选） ---------------- */
export const PRODUCT_NOTE = '示例归属，待业务方确认：字节 / 蚂蚁 / 京东 仅用于演示筛选，不代表真实产品口径'

export const PRODUCT_MAPPING: Record<string, string[]> = {
  dwd_credit_apply: ['字节'],
  dws_metric_credit_rt: ['字节'],
  kafka_credit_decision_flow: ['字节'],
  dwd_credit_contract: ['字节', '蚂蚁'],
  dws_repayment_plan: ['蚂蚁'],
  dim_user: ['蚂蚁'],
  ods_loan_apply_inc: ['蚂蚁'],
  dws_credit_analysis: ['蚂蚁', '京东'],
  dwd_loan_drawdown: ['京东'],
  dwd_loan_daily: ['京东'],
  dwd_loan_detail: ['京东', '字节'],
  dws_post_loan_monitor: ['京东']
}