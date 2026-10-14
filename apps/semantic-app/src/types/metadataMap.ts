/** 元数据映射（指标→表→字段层级树数据） */
export interface MetadataMapping {
  metricId: string
  metricName: string
  metricCode: string
  maintainedBy: string
  definitionCount: number
  tables: TableMapping[]
}

/** 表映射（复用 types/metric.ts 的 TableMapping） */
export type { TableMapping, FieldMapping } from './metric'

/** 映射树节点（用于 a-tree 渲染） */
export interface MappingTreeNode {
  key: string
  title: string
  nodeType: 'metric' | 'table' | 'field'
  role?: 'numerator' | 'denominator' | 'dimension'
  data?: Record<string, unknown>
  children?: MappingTreeNode[]
}

/** 映射详情面板数据 */
export interface MappingDetail {
  nodeType: 'metric' | 'table' | 'field'
  title: string
  fields: { label: string; value: string }[]
  relatedMetrics?: string[]
  childMappings?: MappingDetail[]
}
