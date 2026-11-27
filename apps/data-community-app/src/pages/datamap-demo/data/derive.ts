import { BusinessConceptStore } from '@mock-shared/business-concept-store'
import { TableCatalogStore, type LogicalTable } from '@/mock-dca/shared/table-catalog-store'

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
  /** element = 仓库既有「实体→数据要素→表」关联；name = 按中文名/标签归类；null = 未归类 */
  linkSource: 'element' | 'name' | null
  /** 仓库既有业务域（交易域/风控域/用户域/营销域/产品域/财务域），用于视角派生 */
  bizDomain: string
  tags: string[]
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
  if (view === 'risk') {return t.bizDomain === '风控域' || RISK_TAGS.test(tagText)}
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
export const PRODUCT_MAPPING: Record<string, string[]> = {}

export const PRODUCT_TAG_PREFIX = '产品:'

export function productOf (table: Pick<DemoTable, 'name' | 'tags'>): string[] {
  const mapped = PRODUCT_MAPPING[table.name] ?? []
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

export function deriveEntities (): DemoEntity[] {
  return BusinessConceptStore.getEntities().map((e, i) => ({
    id: e.code,
    name: e.name,
    kind: /申请|记录|计划/.test(e.name) ? 'event' : 'entity',
    domain: RISK_DOMAINS.has(e.domainCode) ? 'risk' : 'common',
    description: e.description,
    order: i + 1,
    stageId: e.domainCode
  }))
}

export function deriveRelations (): DemoRelation[] {
  return BusinessConceptStore.getRelations().map(r => ({
    id: r.code,
    src: r.sourceEntityCode,
    dst: r.targetEntityCode,
    type: RELATION_TYPE_MAP[r.type] ?? 'associate',
    label: r.name,
    description: r.description
  }))
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
  return TableCatalogStore.all().map(t => {
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
      tags: t.tags
    }
  })
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
