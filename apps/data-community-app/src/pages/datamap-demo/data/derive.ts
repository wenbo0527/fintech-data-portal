import { BusinessConceptStore } from '@mock-shared/business-concept-store'
import { TableCatalogStore, type LogicalTable } from '@/mock-dca/shared/table-catalog-store'
import {
  EXTRA_ENTITIES, EXTRA_RELATIONS, EXTRA_TABLES, ENTITY_ALIASES, ENTITY_OVERRIDES,
  PRODUCT_MAPPING as SUPPLEMENT_PRODUCTS, PRODUCT_NOTE
} from './supplement'

export type DemoTier = 'recommended' | 'fallback' | 'tech'
export type DemoRelationType = 'sequence' | 'associate' | 'contain' | 'flow'
export type DemoView = 'all' | 'biz' | 'risk' | 'market' | 'tech'

export interface DemoEntity {
  id: string
  name: string
  kind: 'entity' | 'event'
  domain: 'risk' | 'market' | 'common'
  description: string
  order: number
  /** 仓库实体自带的业务域编码（DOM001 客户域 … DOM006 贷后域），用于「大环节」分组 */
  stageId: string
  /** [scale] 11179-5 稳定标识：名称可变、标识不变 */
  entityCode: string
  /** [scale] 11179-6 注册状态 */
  registryStatus: 'draft' | 'submitted' | 'approved' | 'deprecated'
  /** [scale] 11179-6 管理状态 */
  manageStatus: 'active' | 'under_review' | 'pending_update' | 'retired'
  /** 展示别名（与 SPEC 命名统一用，如 授信合同→协议），不改仓库 code */
  alias?: string
}

export interface DemoRelation {
  id: string
  src: string
  dst: string
  type: DemoRelationType
  label: string
  description: string
}

export interface DemoTable {
  name: string
  cnName: string
  entityId: string | null
  tier: DemoTier
  layer: string
  status: string
  owner: string
  heat: number
  fieldCount: number
  lastUpdated: string
  reason: string
  /** element = 仓库既有「实体→数据要素→表」关联；name = 按名称/标签归类；supplement = 增补层；null = 未归类 */
  linkSource: 'element' | 'name' | 'supplement' | null
  /** 增补表的字段（catalog 外的表才有，catalog 表走 fieldsOfTable 的 CatalogField） */
  fields?: Array<{ name: string, type: string, cn: string, sensitivity: 'public' | 'internal' | 'sensitive' | 'restricted' }>
  /** 仓库既有业务域（交易域/风控域/用户域/营销域/产品域/财务域），用于视角派生 */
  bizDomain: string
  tags: string[]
  /** 更新频率（每日/实时/每小时…），作为「粒度」口径的既有依据 */
  freq: string
  /** [scale] 与数仓同步状态（Demo 全部 synced，stale 时卡片显示「待复核」） */
  syncStatus: 'synced' | 'stale' | 'broken'
  /** [scale] 上次人工复核时间 */
  lastVerifiedAt: string
  /** [scale] 使用热度（Demo 置 0，接埋点后启用排序） */
  usageHeat: number
  /** 推荐理由：粒度 + 口径状态 + 适用场景（由既有字段组合，不编造） */
  recommendReason: string
}

export const VIEW_LABELS: Record<DemoView, string> = {
  all: '全部',
  biz: '业务',
  risk: '风险',
  market: '市场',
  tech: '技术'
}

// 视角由既有 domain / layer / tags 派生，属于叠加标签而非互斥分区：
// 一张表可同时命中多个视角（如 dwd_fraud_alert 既在风控域又是贴源表）
const TECH_TAGS = /贴源|实时|Kafka|HBase|Doris/
const RISK_TAGS = /反欺诈|预警|风控/
const MARKET_TAGS = /营销|埋点|点击/

export function viewHit (t: DemoTable, view: DemoView): boolean {
  if (view === 'all') {return true}
  const tagText = t.tags.join(',')
  if (view === 'biz') {return t.bizDomain === '交易域'}
  if (view === 'risk') {
    return t.bizDomain === '风控域' || RISK_TAGS.test(tagText) || /授信|支用|借据|还款|逾期|贷后/.test(t.cnName)
  }
  if (view === 'market') {return t.bizDomain === '营销域' || MARKET_TAGS.test(tagText)}
  return t.layer === 'ODS' || TECH_TAGS.test(tagText)
}

/**
 * 产品归属：仓库当前没有任何表→产品映射（45 张表 0 条，只有 5 个数据要素标了
 * relatedProduct，其中 4 条是「所有产品」）。两条路都可生效，任选其一：
 *   1) 在这里填「表 → 产品」清单；
 *   2) 给表打以「产品:字节」形式的 tag。
 * 在拿到业务清单前不要在 UI 里编产品名。
 */
export { PRODUCT_MAPPING, PRODUCT_NOTE } from './supplement'

export const PRODUCT_TAG_PREFIX = '产品:'

export function productOf (table: Pick<DemoTable, 'name' | 'tags'>): string[] {
  const mapped = SUPPLEMENT_PRODUCTS[table.name] ?? []
  const tagged = table.tags
    .filter(t => t.startsWith(PRODUCT_TAG_PREFIX))
    .map(t => t.slice(PRODUCT_TAG_PREFIX.length))
  return [...new Set([...mapped, ...tagged])]
}

export function tagCounts (tables: DemoTable[]): Array<{ tag: string, count: number }> {
  const m = new Map<string, number>()
  tables.forEach(t => t.tags.forEach(tag => m.set(tag, (m.get(tag) ?? 0) + 1)))
  return [...m.entries()]
    .filter(([tag]) => !tag.startsWith(PRODUCT_TAG_PREFIX))
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
}

export function productOptions (tables: DemoTable[]): string[] {
  const set = new Set<string>()
  tables.forEach(t => productOf(t).forEach(p => set.add(p)))
  return [...set].sort()
}

/** 多选筛选：产品之间 OR、标签之间 OR，两类之间 AND；都为空视为不过滤 */
export interface TableFilter {
  tags: string[]
  products: string[]
}

export function matchesFilter (t: DemoTable, f: TableFilter): boolean {
  if (f.tags.length && !f.tags.some(tag => t.tags.includes(tag))) {return false}
  if (f.products.length) {
    const ps = productOf(t)
    if (!f.products.some(p => ps.includes(p))) {return false}
  }
  return true
}

const RISK_DOMAINS = new Set(['DOM003', 'DOM004', 'DOM005', 'DOM006', 'DOM008'])

const RELATION_TYPE_MAP: Record<string, DemoRelationType> = {
  derivative: 'sequence',
  trigger: 'sequence',
  association: 'associate',
  config: 'associate',
  dependency: 'contain',
  behavior: 'flow',
  check: 'flow'
}

const NAME_RULES: Array<[RegExp, string, string?]> = [
  [/授信申请|申请增量/, 'ENT003'],
  [/授信合同|合同/, 'ENT004'],
  [/支用申请/, 'ENT005'],
  [/提款|支用|放款|贷款余额/, 'ENT006'],
  [/还款|催回/, 'ENT007'],
  [/贷后|逾期|催收/, 'ENT008'],
  [/账户/, 'ENT002'],
  // 风控域的「用户风险评分」不是客户主数据，按域排除，避免归到客户实体
  [/客户|用户/, 'ENT001', '风控域'],
  [/授信/, 'ENT004']
]

const TAG_RULES: Array<[string, string]> = [
  ['授信', 'ENT004'],
  ['放款', 'ENT006'],
  ['余额', 'ENT006'],
  ['还款', 'ENT007'],
  ['催回', 'ENT007'],
  ['逾期', 'ENT008'],
  ['贷后', 'ENT008'],
  ['客户', 'ENT001'],
  ['客户360', 'ENT001'],
  ['账务', 'ENT002']
]

/** [scale] 11179-5 稳定标识：语义中性、与展示名解耦（改名不改标识） */
const ENTITY_CODES: Record<string, string> = {
  ENT001: 'CUSTOMER',
  ENT002: 'ACCOUNT',
  ENT003: 'CREDIT.APPLY',
  ENT004: 'CREDIT.CONTRACT',
  ENT005: 'DRAW.APPLY',
  ENT006: 'DRAW.ORDER',
  ENT007: 'REPAY.PLAN',
  ENT008: 'POSTLOAN.RECORD'
}

export function deriveEntities (): DemoEntity[] {
  return BusinessConceptStore.getEntities().map((e, i) => ({
    id: e.code,
    name: e.name,
    kind: /申请|记录|计划/.test(e.name) ? 'event' : 'entity',
    domain: RISK_DOMAINS.has(e.domainCode) ? 'risk' : 'common',
    description: e.description,
    order: i + 1,
    stageId: e.domainCode,
    entityCode: ENTITY_CODES[e.code] ?? e.code,
    registryStatus: 'approved',
    manageStatus: 'active',
    alias: ENTITY_ALIASES[e.code]
  })).concat(EXTRA_ENTITIES).sort((a, b) => a.order - b.order)
}

export function deriveRelations (): DemoRelation[] {
  return (BusinessConceptStore.getRelations().map(r => ({
    id: r.code,
    src: r.sourceEntityCode,
    dst: r.targetEntityCode,
    type: RELATION_TYPE_MAP[r.type] ?? 'associate',
    label: r.name,
    description: r.description
  }))).concat(EXTRA_RELATIONS)
}

function elementLinkIndex (): Map<string, string> {
  const idx = new Map<string, string>()
  for (const el of BusinessConceptStore.getElements()) {
    const table = el.relatedResource?.table
    if (table && !idx.has(table)) {idx.set(table, el.relatedEntityCode)}
  }
  return idx
}

function tierOf (t: LogicalTable): DemoTier {
  if (t.status !== 'online') {return 'tech'}
  if (t.layer === 'DWS') {return 'recommended'}
  if (t.layer === 'DWD') {return 'fallback'}
  return 'tech'
}

export function deriveTables (): DemoTable[] {
  const linked = elementLinkIndex()
  const base: DemoTable[] = TableCatalogStore.all().map(t => {
    const byElement = linked.get(t.name)
    const byName = byElement ? undefined : NAME_RULES.find(([re, , skipDomain]) => re.test(t.cnName) && t.domain !== skipDomain)?.[1]
    const byTag = byElement || byName ? undefined : TAG_RULES.find(([tag]) => t.tags.includes(tag))?.[1]
    const entityId = byElement ?? byName ?? byTag ?? null
    return {
      name: t.name,
      cnName: t.cnName,
      entityId,
      tier: tierOf(t),
      layer: t.layer,
      status: t.status,
      owner: t.owner,
      heat: t.heat,
      fieldCount: t.fields.length,
      lastUpdated: t.onTime ?? '',
      reason: t.description,
      linkSource: byElement ? 'element' : (byName || byTag ? 'name' : null),
      bizDomain: t.domain,
      tags: t.tags,
      freq: t.updateFrequency,
      syncStatus: 'synced',
      lastVerifiedAt: t.onTime ?? '',
      usageHeat: 0,
      recommendReason: `${t.usageGuide || t.businessCaliber || t.description}（口径已上线 · ${t.updateFrequency}粒度 · ${t.layer}层）`
    }
  })
  const withOverrides = base.map(t => ENTITY_OVERRIDES[t.name]
    ? { ...t, entityId: ENTITY_OVERRIDES[t.name], linkSource: 'name' as const }
    : t)
  return [...withOverrides, ...EXTRA_TABLES]
}

export function countByView (list: DemoTable[], view: DemoView): number {
  return list.filter(t => viewHit(t, view)).length
}

export function viewCountsOf (entityId: string, tables: DemoTable[] = deriveTables()): Record<DemoView, number> {
  const mine = tables.filter(t => t.entityId === entityId)
  return {
    all: mine.length,
    biz: countByView(mine, 'biz'),
    risk: countByView(mine, 'risk'),
    market: countByView(mine, 'market'),
    tech: countByView(mine, 'tech')
  }
}

export function tablesOfEntity (entityId: string, tables: DemoTable[] = deriveTables()): DemoTable[] {
  const mine = tables.filter(t => t.entityId === entityId)
  const rank: Record<DemoTier, number> = { recommended: 0, fallback: 1, tech: 2 }
  return mine.sort((a, b) => rank[a.tier] - rank[b.tier] || b.heat - a.heat)
}

export function unclassifiedTables (tables: DemoTable[] = deriveTables()): DemoTable[] {
  return tables.filter(t => t.entityId === null)
}

export function fieldsOfTable (name: string) {
  const extra = EXTRA_TABLES.find(x => x.name === name)
  if (extra?.fields) {
    return extra.fields.map(f => ({
      name: f.name,
      cn: f.cn,
      type: f.type,
      sensitivity: f.sensitivity,
      isPk: /_no$|_id$/.test(f.name) && f.name !== 'cust_name'
    }))
  }
  const t = TableCatalogStore.byName(name)
  if (!t) {return []}
  return t.fields.map(f => ({
    name: f.name,
    cn: f.cnName || f.description,
    type: f.type,
    sensitivity: f.sensitivity,
    isPk: Boolean(f.isPrimaryKey)
  }))
}

export function entityName (id: string | null): string {
  if (!id) {return '未归类'}
  return BusinessConceptStore.getEntities().find(e => e.code === id)?.name ?? id
}

export const TIER_LABELS: Record<DemoTier, string> = {
  recommended: '推荐表',
  fallback: '明细兜底',
  tech: '技术维护'
}

export const TIER_COLORS: Record<DemoTier, 'green' | 'arcoblue' | 'gray'> = {
  recommended: 'green',
  fallback: 'arcoblue',
  tech: 'gray'
}

/** 大环节：直接用仓库实体自带的业务域编码分组，六个域各有实体 */
export const STAGE_LABELS: Record<string, string> = {
  DOM001: '客户域',
  DOM002: '账户域',
  DOM003: '授信域',
  DOM004: '支用域',
  DOM005: '还款域',
  DOM006: '贷后域',
  DOM007: '产品域',
  DOM008: '风控域'
}

export interface DemoStage {
  id: string
  name: string
  entityIds: string[]
}

export function deriveStages (): DemoStage[] {
  const map = new Map<string, string[]>()
  deriveEntities().forEach(e => {
    map.set(e.stageId, [...(map.get(e.stageId) ?? []), e.id])
  })
  return [...map.entries()].map(([id, entityIds]) => ({ id, name: STAGE_LABELS[id] ?? id, entityIds }))
}

export function entitiesOfStage (stageId: string): DemoEntity[] {
  return deriveEntities().filter(e => e.stageId === stageId)
}

export function stageIdOf (entityId: string): string | undefined {
  return deriveEntities().find(e => e.id === entityId)?.stageId
}

export type TableSort = 'tier' | 'heat' | 'updated'

/**
 * 排序预留（3.7.1）：默认按「推荐 > 兜底 > 技术」再热度；
 * by='heat' / 'updated' 供规模化后切排序，调用方只传参数、无需改结构。
 */
export function sortTables (list: DemoTable[], by: TableSort): DemoTable[] {
  const rank: Record<DemoTier, number> = { recommended: 0, fallback: 1, tech: 2 }
  const copy = [...list]
  copy.sort((a, b) => {
    if (by === 'heat') {return b.heat - a.heat || rank[a.tier] - rank[b.tier]}
    if (by === 'updated') {return String(b.lastUpdated).localeCompare(String(a.lastUpdated)) || rank[a.tier] - rank[b.tier]}
    return rank[a.tier] - rank[b.tier] || b.heat - a.heat
  })
  return copy
}

export const DOMAIN_LABELS: Record<DemoEntity['domain'], string> = {
  risk: '风险域',
  market: '市场域',
  common: '通用域'
}

/** 隐性业务常识（v2 §2.5 Step 4）：图相对通用目录的价值，写进规则供页面与 T2.5 质检引用 */
export interface ImplicitRule {
  id: string
  text: string
  entityIds: string[]
}

export const IMPLICIT_RULES: ImplicitRule[] = [
  { id: 'IR-1', text: '授信必然有对应协议：授信申请通过后生成授信合同，二者一一对应', entityIds: ['ENT003', 'ENT004'] },
  { id: 'IR-2', text: '支用必有支用单：每次提款生成一张支用单，脱链即数据质量问题', entityIds: ['ENT005', 'ENT006'] },
  { id: 'IR-3', text: '客户必有归属账户：客户与账户一一对应，缺失即客户主数据不全', entityIds: ['ENT001', 'ENT002'] },
  { id: 'IR-4', text: '还款计划挂在支用单上，不直接挂客户', entityIds: ['ENT006', 'ENT007'] }
]
