import { getMetadataMappings, buildMappingTree, findMetricsByTable } from '@/mock/metadataMap'
import { mockDelay } from '@/utils/mockDelay'
import type { MetadataMapping, MappingTreeNode } from '@/types/metadataMap'

export function getMetadataMap(): Promise<MetadataMapping[]> {
  return mockDelay(getMetadataMappings())
}

export function getMappingTree(): Promise<MappingTreeNode[]> {
  const mappings = getMetadataMappings()
  return mockDelay(buildMappingTree(mappings))
}

export function getRelatedMetrics(tableName: string): Promise<string[]> {
  const mappings = getMetadataMappings()
  return mockDelay(findMetricsByTable(tableName, mappings))
}
