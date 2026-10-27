import { defineStore } from 'pinia'

export interface DataSourceItem {
  id: string
  name: string
  type: 'mysql' | 'postgresql' | 'oracle' | 'sqlserver' | 'doris'
  host: string
  database: string
  table: string
  username?: string
  password?: string
  description?: string
}

export const useDataSourceStore = defineStore('datasource', {
  state: () => ({
    list: [
      {
        id: 'ds-1001',
        name: 'Doris生产集群',
        type: 'doris',
        host: 'doris-fe.local:8030',
        database: 'cdp_dw',
        table: 'tag_user_daily',
        username: 'cdp_reader',
        description: 'Doris 标签明细与聚合存储'
      },
      {
        id: 'ds-1002',
        name: 'MySQL用户库',
        type: 'mysql',
        host: 'mysql.prod:3306',
        database: 'user_center',
        table: 'user_profile',
        username: 'reader',
        description: '用户画像主表'
      },
      {
        id: 'ds-1003',
        name: 'PostgreSQL行为库',
        type: 'postgresql',
        host: 'pg.behavior:5432',
        database: 'behavior',
        table: 'events',
        username: 'analytics',
        description: '事件行为明细'
      }
    ] as DataSourceItem[],
    loading: false,
    error: null as string | null
  }),
  actions: {
    /**
     * 新增数据源
     * @param item 数据源对象
     */
    add(item: DataSourceItem) { this.list = [{ ...item }, ...this.list] },
    /**
     * 更新数据源
     * @param id 数据源 ID
     * @param patch 待更新字段
     */
    update(id: string, patch: Partial<DataSourceItem>) {
      const idx = this.list.findIndex(x => x.id === id)
      if (idx >= 0) this.list.splice(idx, 1, { ...this.list[idx], ...patch })
    },
    /**
     * 删除数据源
     * @param id 数据源 ID
     */
    remove(id: string) { this.list = this.list.filter(x => x.id !== id) },
    /**
     * 测试数据源连接
     * @param item 数据源对象
     */
    testConnection(item: DataSourceItem) { return Promise.resolve({ success: true }) },
    /**
     * 获取指定数据源下的表列表
     * @param id 数据源 ID
     */
    getTables(id: string) {
      const ds = this.list.find(x => x.id === id)
      if (!ds) return [] as string[]
      switch (ds.type) {
        case 'doris': return ['tag_user_daily', 'tag_user_snapshot', 'tag_user_monthly']
        case 'mysql': return ['user_profile', 'user_ext', 'user_tag']
        case 'postgresql': return ['events', 'events_archive']
        case 'oracle': return ['CDP_TAGS', 'CDP_USERS']
        case 'sqlserver': return ['dbo.Users', 'dbo.Tags']
        default: return [ds.table].filter(Boolean)
      }
    }
  }
})

// 兼容旧引用名
export const useDatasourceStore = useDataSourceStore
export default useDataSourceStore
