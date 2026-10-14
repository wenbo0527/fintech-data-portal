import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

// 与 mkt-app / dex-app 等子应用一致：显式指定路由 base
const qiankunWin = window as any
const routerBase = qiankunWin.__POWERED_BY_QIANKUN__
  ? (qiankunWin.ROUTER_BASE || '/semantic-app/')
  : '/semantic-app/'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('../layouts/AppLayout.vue'),
    children: [
      {
        path: '',
        redirect: { name: 'semantic-query' }
      },
      {
        path: 'query',
        name: 'semantic-query',
        component: () => import('../views/MetricQueryView.vue'),
        meta: { title: 'Agent问答' }
      },
      {
        path: 'metric',
        name: 'semantic-metric',
        component: () => import('../views/MetricManageView.vue'),
        meta: { title: '指标定义管理' }
      },
      {
        path: 'metadata-map',
        name: 'semantic-metadata-map',
        component: () => import('../views/MetadataMapView.vue'),
        meta: { title: '元数据映射维护' }
      },
      {
        path: 'knowledge',
        name: 'semantic-knowledge',
        component: () => import('../views/KnowledgeMaintainView.vue'),
        meta: { title: '业务知识维护' }
      },
      {
        path: 'mock-data',
        name: 'semantic-mock-data',
        component: () => import('../views/MockDataView.vue'),
        meta: { title: 'Mock数据管理' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(routerBase),
  routes
})

export default router
