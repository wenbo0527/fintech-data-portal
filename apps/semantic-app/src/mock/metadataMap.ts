import type { MetadataMapping, MappingTreeNode } from '@/types/metadataMap'
import { mockMetrics, mockMetricDetail } from './metric'

/** 元数据映射数据（从指标定义派生，保持单一数据源） */
export function getMetadataMappings(): MetadataMapping[] {
  return mockMetrics.map(m => {
    const detail = mockMetricDetail(m.id)
    return {
      metricId: detail.id,
      metricName: detail.name,
      metricCode: detail.code,
      maintainedBy: detail.maintainedBy,
      definitionCount: detail.definitions.length,
      tables: detail.tableMappings
    }
  })
}

/** 构建映射树数据（用于 a-tree 组件） */
export function buildMappingTree(mappings: MetadataMapping[]): MappingTreeNode[] {
  return mappings.map(m => ({
    key: `metric:${m.metricId}`,
    title: `${m.metricName} (${m.metricCode})`,
    nodeType: 'metric',
    data: {
      metricId: m.metricId,
      metricName: m.metricName,
      metricCode: m.metricCode,
      maintainedBy: m.maintainedBy,
      definitionCount: m.definitionCount
    },
    children: m.tables.map(t => ({
      key: `table:${m.metricId}:${t.tableId}`,
      title: `${t.tableCnName} (${t.tableName})`,
      nodeType: 'table',
      role: t.role,
      data: {
        tableId: t.tableId,
        tableName: t.tableName,
        tableCnName: t.tableCnName,
        role: t.role
      },
      children: t.fields.map(f => ({
        key: `field:${m.metricId}:${t.tableId}:${f.fieldId}`,
        title: `${f.fieldCnName} (${f.fieldName})`,
        nodeType: 'field',
        data: {
          fieldId: f.fieldId,
          fieldName: f.fieldName,
          fieldCnName: f.fieldCnName,
          dataType: f.dataType,
          description: f.description,
          usedInFormula: f.usedInFormula
        }
      }))
    }))
  }))
}

/** 根据表名查找关联的指标（跨指标关联） */
export function findMetricsByTable(tableName: string, mappings: MetadataMapping[]): string[] {
  return mappings
    .filter(m => m.tables.some(t => t.tableName === tableName))
    .map(m => `${m.metricName} (${m.metricCode})`)
}
