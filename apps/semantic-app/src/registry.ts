/**
 * semantic-app 微应用注册配置
 * 语义底座子应用 - Agent问答 + 指标管理 + 知识维护
 */

export interface MicroAppMenu {
  key: string
  label: string
  icon: string
  path: string
  order: number
}

export interface MicroAppRegistry {
  app: {
    name: string
    version: string
    description: string
  }
  basePath: string
  entry: string
  menu: MicroAppMenu[]
  routes: unknown[]
}

const registry: MicroAppRegistry = {
  app: {
    name: 'semantic-app',
    version: '0.1.0',
    description: '语义底座子应用 - Agent问答 + 指标管理 + 知识维护'
  },
  basePath: '/semantic-app',
  entry: 'http://localhost:8100',
  menu: [
    {
      key: 'semantic-query',
      label: 'Agent问答',
      icon: 'icon-message',
      path: '/semantic-app/query',
      order: 1
    },
    {
      key: 'semantic-metric',
      label: '指标定义',
      icon: 'icon-bookmark',
      path: '/semantic-app/metric',
      order: 2
    },
    {
      key: 'semantic-metadata-map',
      label: '元数据映射',
      icon: 'icon-link',
      path: '/semantic-app/metadata-map',
      order: 3
    },
    {
      key: 'semantic-knowledge',
      label: '业务知识',
      icon: 'icon-mind-mapping',
      path: '/semantic-app/knowledge',
      order: 4
    },
    {
      key: 'semantic-mock-data',
      label: 'Mock数据',
      icon: 'icon-database',
      path: '/semantic-app/mock-data',
      order: 5
    }
  ],
  routes: []
}

export default registry
