/**
 * ============================================================
 * dca 统一搜索实现（P0 · 重构方案阶段 0-3）
 * ============================================================
 * 此前该模块被 vite alias 遮蔽指向 dfd 空 stub，导致搜索恒为空。
 * 现已改指本文件：表侧结果唯一读 TableCatalogStore（发现域=已上线，
 * 审核中表一并返回并带 status，由页面置灰）；
 * 指标/业务概念/外数属专题过渡层，沿用各自 mock 源。
 * 返回形状与 dfd search 页 performSearch 消费契约对齐。
 * ============================================================
 */
import { TableCatalogStore, type LogicalTable } from '@/mock-dca/shared/table-catalog-store'
import { BusinessConceptStore } from '@/mock-dca/shared/business-concept-store'
import { mockMetrics } from '@/mock-dca/listing-store'
import { externalResources } from '@/mock/external-resources'

const mockDelay = <T>(data: T, ms = 120): Promise<T> =>
  new Promise(resolve => setTimeout(() => resolve(data), ms))

export interface SearchFilters {
  assetType?: 'asset' | 'resource'   // 数据资产 / 数据资源
  domain?: string
  storage?: string
  sensitivity?: string
}

/** LogicalTable → 搜索页卡片形状（附加字段供 P1 改造消费） */
function toCard(t: LogicalTable) {
  return {
    tableId: t.tableId,
    name: t.name,
    cnName: t.cnName,
    description: t.description,
    owner: t.owner,
    updateTime: t.onTime || '',
    domain: t.domain,
    tags: t.tags,
    heat: t.heat,
    qualityScore: t.qualityScore,
    assetType: t.assetType,
    layer: t.layer,
    storage: t.storage,
    sourceSystem: t.sourceSystem,
    sourceType: t.storage.toLowerCase(),
    dbType: t.storage,
    sensitivity: t.sensitivity,
    status: t.status // online | reviewing（页面按状态置灰）
  }
}

export const searchApi = {
  async search(keyword: string, filters: SearchFilters = {}) {
    const kw = (keyword || '').trim()
    const lower = kw.toLowerCase()

    // 1. 表（唯一事实源：已上线 + 审核中）
    let tables = TableCatalogStore.search(kw)
    if (filters.assetType) tables = tables.filter(t => t.assetType === filters.assetType)
    if (filters.domain) tables = tables.filter(t => t.domain === filters.domain)
    if (filters.storage) tables = tables.filter(t => t.storage === filters.storage)
    if (filters.sensitivity) tables = tables.filter(t => t.sensitivity === filters.sensitivity)

    // 2. 字段级检索（P1 字段 Tab 使用；随响应附带返回）
    const fields = kw ? TableCatalogStore.searchFields(kw).map(h => ({
      tableName: h.table.name,
      tableCnName: h.table.cnName,
      tableId: h.table.tableId,
      name: h.field.name,
      cnName: h.field.cnName || h.field.description,
      type: h.field.type,
      description: h.field.description,
      sensitivity: h.field.sensitivity,
      isPrimaryKey: h.field.isPrimaryKey || false,
      domain: h.table.domain
    })) : []

    // 3. 业务概念（域/实体/要素）—— 过渡期保留
    const matchedDomains = BusinessConceptStore.getDomains().filter(d =>
      d.name.includes(kw) || d.description.includes(kw))
    const matchedEntities = BusinessConceptStore.getEntities().filter(e =>
      e.name.includes(kw) || e.description.includes(kw))
    const matchedElements = BusinessConceptStore.getElements().filter(e =>
      e.name.includes(kw))

    // 4. 指标 —— 过渡期保留
    const matchedMetrics = lower ? mockMetrics.filter(m =>
      m.metricName.toLowerCase().includes(lower) ||
      m.metricCode.toLowerCase().includes(lower) ||
      m.category.toLowerCase().includes(lower) ||
      m.description.toLowerCase().includes(lower)
    ) : mockMetrics

    // 5. 外部数据 —— 过渡期保留（不改数据源，仅接通搜索形状）
    const matchedExternal = lower ? externalResources.filter(e =>
      e.dataName.toLowerCase().includes(lower) ||
      e.supplier.toLowerCase().includes(lower) ||
      e.interfaceId.toLowerCase().includes(lower) ||
      e.dataType.includes(kw)
    ) : externalResources

    const tablesOut = tables.map(toCard)
    const metricsOut = matchedMetrics.map(m => ({ ...m, name: m.metricName, id: m.metricCode }))

    return mockDelay({
      data: {
        tables: tablesOut,
        fields,
        metrics: metricsOut,
        tags: [],
        concepts: { domains: matchedDomains, entities: matchedEntities, elements: matchedElements },
        external: matchedExternal,
        dashboards: [],
        total: tablesOut.length + fields.length + metricsOut.length + matchedDomains.length +
          matchedEntities.length + matchedElements.length + matchedExternal.length
      }
    })
  }
}
