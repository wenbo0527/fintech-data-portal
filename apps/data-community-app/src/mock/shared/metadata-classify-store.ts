/**
 * dmt-app 元数据 Store
 * 补充 getTables / getTableByName 等方法（修复 /dmt/metadata/modeling 报错）
 * 数据源：主仓库共享的 classify-modules（dmt + dfd 共用）
 */
import { classifyAllTables } from './classify-modules'

export interface MetadataField {
  name: string
  type: string
  description: string
}

export interface MetadataTable {
  name: string
  type: string
  category: string
  domain: string
  updateFrequency: string
  owner: string
  description: string
  fields: MetadataField[]
  createTime?: string
  lastUpdateTime?: string
  storageSize?: string
  collectionOwner?: string
  relationType?: string
  relationField?: string
  relationDescription?: string
  processingLogic?: string
  sql?: string
  versions?: any[]
}

export const MetadataStore = {
  state: () => ({}),
  actions: {},

  /**
   * 列出所有表（dmt 建模页等使用）
   */
  getTables(): MetadataTable[] {
    return classifyAllTables.map(t => ({
      name: t.table_name,
      type: t.schema.startsWith('hive') ? 'HIVE 表' : '业务表',
      category: '业务表',
      domain: t.system_name,
      updateFrequency: '每日更新',
      owner: t.owner,
      description: t.table_comment,
      fields: t.fields.map(f => ({
        name: f.field_name,
        type: 'string',
        description: f.field_comment
      })),
      createTime: t.updated_at,
      lastUpdateTime: t.updated_at
    }))
  },

  /**
   * 按名称查找
   */
  getTableByName(name: string): MetadataTable | undefined {
    return this.getTables().find((t: MetadataTable) => t.name === name)
  }
}

export default MetadataStore
