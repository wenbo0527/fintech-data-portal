import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { qiankunWindow } from 'vite-plugin-qiankun/dist/helper'

const routerBase = qiankunWindow.__POWERED_BY_QIANKUN__ ? (qiankunWindow.ROUTER_BASE || '/dex/') : '/dex/'

console.log('[DEX] routerBase:', routerBase)

/**
 * 探索域路由配置 - PRD定义版本
 * 仅包含：客户360全景能力、指标看板、统一分析工作台
 */
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'DexIndex',
    component: () => import('./pages/index.vue'),
    meta: { title: '数据探索域' }
  },
  // 客户360 - PRD: 客户360全景能力
  {
    path: '/customer360',
    name: 'Customer360',
    component: () => import('./pages/customer360/index.vue'),
    meta: { title: '客户360' }
  },
  {
    // 短路径：/customer360/:userId → 详情页
    path: '/customer360/:userId(\\d+)',
    name: 'Customer360DetailShort',
    component: () => import('./pages/customer360/detail.vue'),
    meta: { title: '客户详情' }
  },
  {
    path: '/customer360/detail/:userId?',
    name: 'Customer360Detail',
    component: () => import('./pages/customer360/detail.vue'),
    meta: { title: '客户详情' }
  },

  {
    path: '/exploration/customer-center',
    name: 'CustomerCenter',
    component: () => import('./pages/exploration/customer-center/index.vue'),
    meta: { title: '客群中心' }
  },
  {
    path: '/exploration/customer-center/audience-system',
    name: 'AudienceSystem',
    component: () => import('./pages/exploration/customer-center/audience-system/index.vue'),
    meta: { title: '人群圈选' }
  },
  {
    path: '/exploration/customer-center/audience-system/audience-create',
    name: 'AudienceCreate',
    component: () => import('./pages/exploration/customer-center/audience-system/audience-create.vue'),
    meta: { title: '创建人群' }
  },
  {
    path: '/exploration/customer-center/audience-system/audience-detail',
    name: 'AudienceDetail',
    component: () => import('./pages/exploration/customer-center/audience-system/audience-detail.vue'),
    meta: { title: '人群详情' }
  },
  {
    // 标签系统为布局路由：index.vue 承载入口卡片，子页面通过 <router-view> 渲染
    path: '/exploration/customer-center/tag-system',
    name: 'TagSystem',
    component: () => import('./pages/exploration/customer-center/tag-system/index.vue'),
    meta: { title: '标签系统' },
    children: [
      {
        path: 'table-management',
        name: 'TagSystemTableManagement',
        component: () => import('./pages/exploration/customer-center/tag-system/table-management.vue'),
        meta: { title: '标签表管理' }
      },
      {
        path: 'tag-management',
        name: 'TagSystemTagManagement',
        component: () => import('./pages/exploration/customer-center/tag-system/tag-management.vue'),
        meta: { title: '标签管理' }
      },
      {
        path: 'attribute-management',
        name: 'TagSystemAttributeManagement',
        component: () => import('./pages/exploration/customer-center/tag-system/attribute-management.vue'),
        meta: { title: '属性管理' }
      },
      {
        path: 'table-registration',
        name: 'TagSystemTableRegistration',
        component: () => import('./pages/exploration/customer-center/tag-system/table-registration.vue'),
        meta: { title: '标签表注册' }
      },
      {
        path: 'tag-detail/:id?',
        name: 'TagSystemTagDetail',
        component: () => import('./pages/exploration/customer-center/tag-system/tag-detail.vue'),
        meta: { title: '标签详情' }
      },
      {
        path: 'tag-center',
        name: 'TagSystemTagCenter',
        component: () => import('./pages/exploration/customer-center/tag-system/tag-center.vue'),
        meta: { title: '标签中心' }
      },
      {
        path: 'tag-create',
        name: 'TagSystemTagCreate',
        component: () => import('./pages/exploration/customer-center/tag-system/tag-create.vue'),
        meta: { title: '创建标签' }
      }
    ]
  },
  {
    path: '/exploration/customer-center/datasource',
    name: 'CustomerDatasource',
    component: () => import('./pages/exploration/customer-center/datasource/index.vue'),
    meta: { title: '数据源' }
  },
  // 探索分析 - 外部数据评估
  {
    path: '/exploration/external-data-evaluation',
    name: 'ExternalDataEvaluation',
    component: () => import('./pages/exploration/ExternalDataEvaluationList.vue'),
    meta: { title: '外部数据评估' }
  },
  {
    path: '/exploration/external-data-evaluation/create',
    name: 'ExternalDataEvaluationCreate',
    component: () => import('./pages/exploration/CreateExternalDataEvaluationPage.vue'),
    meta: { title: '创建评估' }
  },
  {
    path: '/exploration/external-data-evaluation/edit/:id',
    name: 'ExternalDataEvaluationEdit',
    component: () => import('./pages/exploration/ExternalDataEvaluationEdit.vue'),
    meta: { title: '编辑评估' }
  },
  {
    path: '/exploration/external-data-evaluation/detail/:id',
    name: 'ExternalDataEvaluationDetail',
    component: () => import('./pages/exploration/ExternalDataEvaluationDetail.vue'),
    meta: { title: '评估详情' }
  },
  // 探索分析 - 工作流
  {
    path: '/exploration/workflows',
    name: 'Workflows',
    component: () => import('./pages/exploration/workflows/index.vue'),
    meta: { title: '工作流管理' }
  },
  {
    path: '/exploration/workflows/create',
    name: 'WorkflowCreate',
    component: () => import('./pages/exploration/workflows/WorkflowCreate.vue'),
    meta: { title: '创建工作流' }
  },
  {
    path: '/exploration/workflows/editor/:id?',
    name: 'WorkflowEditor',
    component: () => import('./pages/exploration/workflows/WorkflowEditor.vue'),
    meta: { title: '工作流编辑器' }
  },
  {
    path: '/exploration/workflows/config',
    name: 'DataSourceConfig',
    component: () => import('./pages/exploration/workflows/DataSourceConfig.vue'),
    meta: { title: '数据源配置' }
  },
  // 探索分析 - 外部数据分析
  {
    path: '/exploration/external-data-analysis',
    name: 'ExternalDataAnalysis',
    component: () => import('./pages/exploration/external-data-analysis/index.vue'),
    meta: { title: '外部数据分析' }
  },
  {
    path: '/exploration/external-data-monitor',
    name: 'ExternalDataMonitor',
    component: () => import('./pages/exploration/external-data-monitor.vue'),
    meta: { title: '外部数据监控' }
  },
  // 分析工作台 - PRD: 统一分析工作台
  {
    path: '/analytics-workbench',
    name: 'AnalyticsWorkbench',
    component: () => import('./pages/index.vue'),
    meta: { title: '分析工作台' }
  }
]

const router = createRouter({
  history: createWebHistory(routerBase),
  routes
})

export default router
