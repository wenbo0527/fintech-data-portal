import request from './request'

export type DataSourceType = 'Doris' | 'Hive' | 'Oracle'
export type AssetType = '指标' | 'API' | '特征' | '表'

export interface ConnectionConfig {
  host?: string
  port?: number
  username?: string
  password?: string
  database?: string
  schema?: string
}

export interface BasicMetadata {
  name: string
  description?: string
  domain?: string
  tags?: string[]
  owner?: string
}

export interface AssociationInfo {
  relatedTables?: string[]
  relatedApis?: string[]
  relatedMetrics?: string[]
  relatedVariables?: string[]
}

export interface LineageInfo {
  upstream?: string[]
  downstream?: string[]
  notes?: string
}

export interface BusinessMetadata {
  businessDefinition?: string
  scenario?: string
  updateFrequency?: string
  confidentiality?: '高' | '中' | '低'
}

export interface MetadataTaskPayload {
  taskName: string
  dataSourceType: DataSourceType
  assetType: AssetType
  connection?: ConnectionConfig
  basic?: BasicMetadata
  association?: AssociationInfo
  lineage?: LineageInfo
  business?: BusinessMetadata
}

export interface MetadataTask extends MetadataTaskPayload {
  id: string | number
  status?: 'pending' | 'running' | 'success' | 'failed'
  createdAt?: string
}

export async function createMetadataTask(payload: MetadataTaskPayload): Promise<MetadataTask> {
  const res = await request.post('/metadata/tasks', payload)
  return (res as any)?.data || res
}

export async function getMetadataTasks(params?: Record<string, any>): Promise<{ list: MetadataTask[]; total: number }> {
  const res = await request.get('/metadata/tasks', { params })
  return (res as any)?.data || res
}

export async function getMetadataTaskDetail(id: string | number): Promise<MetadataTask> {
  const res = await request.get(`/metadata/tasks/${id}`)
  return (res as any)?.data || res
}

