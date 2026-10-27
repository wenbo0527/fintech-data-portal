/**
 * 客群中心路由模块
 * 路由前缀: /customer
 */
import type { RouteRecordRaw } from 'vue-router'

export const customerRoutes: RouteRecordRaw[] = [
  {
    path: 'customer',
    name: 'Customer',
    component: () => import('@/pages/customer/index.vue'),
    meta: { title: '客群中心' }
  },
  {
    // 标签系统为布局路由：index.vue 承载入口卡片，子页面通过 <router-view> 渲染
    path: 'customer/tag-system',
    name: 'TagSystem',
    component: () => import('@/pages/customer/tag-system/index.vue'),
    meta: { title: '标签系统' },
    children: [
      {
        path: 'table-management',
        name: 'TagSystemTableManagement',
        component: () => import('@/pages/customer/tag-system/table-management.vue'),
        meta: { title: '标签表管理' }
      },
      {
        path: 'tag-management',
        name: 'TagSystemTagManagement',
        component: () => import('@/pages/customer/tag-system/tag-management.vue'),
        meta: { title: '标签管理' }
      },
      {
        path: 'attribute-management',
        name: 'TagSystemAttributeManagement',
        component: () => import('@/pages/customer/tag-system/attribute-management.vue'),
        meta: { title: '属性管理' }
      },
      {
        path: 'table-registration',
        name: 'TagSystemTableRegistration',
        component: () => import('@/pages/customer/tag-system/table-registration.vue'),
        meta: { title: '标签表注册' }
      },
      {
        path: 'tag-detail/:id?',
        name: 'TagSystemTagDetail',
        component: () => import('@/pages/customer/tag-system/tag-detail.vue'),
        meta: { title: '标签详情' }
      },
      {
        path: 'tag-center',
        name: 'TagSystemTagCenter',
        component: () => import('@/pages/customer/tag-system/tag-center.vue'),
        meta: { title: '标签中心' }
      }
    ]
  },
  {
    path: 'customer/tag-management',
    name: 'TagManagement',
    component: () => import('@/pages/customer/tag-system/tag-management.vue'),
    meta: { title: '标签管理' }
  },
  {
    path: 'customer/tag-create',
    name: 'TagCreate',
    component: () => import('@/pages/customer/tag-system/tag-create.vue'),
    meta: { title: '创建标签' }
  },
  {
    path: 'customer/attribute-management',
    name: 'AttributeManagement',
    component: () => import('@/pages/customer/tag-system/attribute-management.vue'),
    meta: { title: '属性管理' }
  },
  {
    path: 'customer/event-center',
    name: 'EventCenter',
    component: () => import('@/pages/customer/event-center/index.vue'),
    meta: { title: '事件首页' }
  },
  {
    path: 'customer/event-management',
    name: 'EventManagement',
    component: () => import('@/pages/customer/event-center/event-management.vue'),
    meta: { title: '事件管理' }
  },
  {
    path: 'customer/virtual-events',
    name: 'VirtualEvents',
    component: () => import('@/pages/customer/event-center/virtual-events.vue'),
    meta: { title: '虚拟事件' }
  },
  // P1#2 虚拟事件组合创建 - 2026-08-02 (补 commit 7cb2cadb 漏注册的路由)
  {
    path: 'customer/virtual-event-combine',
    name: 'VirtualEventCombine',
    component: () => import('@/pages/customer/event-center/virtual-event-combine.vue'),
    meta: { title: '虚拟事件组合' }
  },
  {
    path: 'customer/sample-stats',
    name: 'SampleStats',
    component: () => import('@/pages/customer/event-center/sample-stats.vue'),
    meta: { title: '样本统计' }
  },
  // TASK-20260715-BF00A0E1 (文博 14:19 拍板 · 方案 A' · 修正版)
  // 修 mkt-app event-create 路由空白 + convention 一致性整改
  // 历史引用 bug: event-management.vue L259/L263 用 /exploration/customer-center/event-center/event-create (从主项目复制没改)
  // 文博确认: 按 PM 倾向 + 项目尽量方式统一 (mkt convention 全部 customer/<page> 相对路径)
  // URL 变更诚实告知:
  //   旧 URL: /mkt/#/exploration/customer-center/event-center/event-create (文博给的, 历史引用 bug)
  //   新 URL: /mkt/#/customer/event-create (符合 mkt convention)
  {
    path: 'customer/event-create',
    name: 'EventCreate',
    component: () => import('@/pages/customer/event-center/event-create.vue'),
    meta: { title: '事件新建' }
  },
  {
    path: 'customer/kafka-datasource',
    name: 'KafkaDatasource',
    component: () => import('@/pages/customer/event-center/kafka-datasource.vue'),
    meta: { title: 'Kafka数据源' }
  },
  {
    path: 'customer/tag-table',
    name: 'TagTable',
    component: () => import('@/pages/customer/tag-system/table-management.vue'),
    meta: { title: '标签表管理' }
  },
  {
    path: 'customer/list',
    name: 'CustomerList',
    component: () => import('@/pages/customer/index.vue'),
    meta: { title: '客群列表' }
  },
  {
    path: 'customer/selector',
    name: 'CustomerSelector',
    component: () => import('@/pages/customer/index.vue'),
    meta: { title: '客群圈选' }
  },
  {
    path: 'customer/portrait',
    name: 'CustomerPortrait',
    component: () => import('@/pages/customer/index.vue'),
    meta: { title: '客户画像' }
  },
  {
    path: 'customer/idmap',
    name: 'CustomerIdmap',
    component: () => import('@/pages/customer/index.vue'),
    meta: { title: 'ID映射' }
  },
  {
    path: 'customer/delete-approval',
    name: 'CustomerDeleteApproval',
    component: () => import('@/pages/customer/index.vue'),
    meta: { title: '删除审批' }
  },
  {
    path: 'customer/lifecycle/rules',
    name: 'CustomerLifecycleRules',
    component: () => import('@/pages/customer/index.vue'),
    meta: { title: '生命周期规则' }
  },
  {
    path: 'customer/lifecycle/analysis',
    name: 'CustomerLifecycleAnalysis',
    component: () => import('@/pages/customer/index.vue'),
    meta: { title: '生命周期分析' }
  },
  {
    path: 'customer/lifecycle/monitor',
    name: 'CustomerLifecycleMonitor',
    component: () => import('@/pages/customer/index.vue'),
    meta: { title: '生命周期监控' }
  }
]
