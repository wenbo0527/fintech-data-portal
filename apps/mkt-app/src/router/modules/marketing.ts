/**
 * 营销中心路由模块
 * 路由前缀: /marketing
 */
import type { RouteRecordRaw } from 'vue-router'

export const marketingRoutes: RouteRecordRaw[] = [
  {
    path: 'marketing',
    name: 'Marketing',
    component: () => import('@/pages/marketing/index.vue'),
    meta: { title: '营销中心' },
    children: [
      {
        path: 'dashboard',
        name: 'CouponDashboard',
        component: () => import('@/pages/coupon/index.vue'),
        meta: { title: '权益首页' }
      },
      {
        path: 'benefit/template',
        name: 'Template',
        component: () => import('@/pages/coupon/template/index.vue'),
        meta: { title: '模板管理' }
      },
      {
        path: 'benefit/template/create',
        name: 'TemplateCreate',
        component: () => import('@/pages/coupon/template/create.vue'),
        meta: { title: '新建券模板' }
      },
      {
        path: 'benefit/management',
        name: 'Management',
        component: () => import('@/pages/coupon/management/index.vue'),
        meta: { title: '券管理' }
      },
      // P0-路由-#3: 券管理页组件内无 router-view，子页必须注册为同级路由才能渲染
      {
        path: 'benefit/management/detail',
        name: 'ManagementDetail',
        component: () => import('@/pages/coupon/management/detail.vue'),
        meta: { title: '券详情', activeMenu: '/marketing/benefit/management' }
      },
      {
        path: 'benefit/management/batch-create',
        name: 'ManagementBatchCreate',
        component: () => import('@/pages/coupon/management/batch-create.vue'),
        meta: { title: '批量创建券库存', activeMenu: '/marketing/benefit/management' }
      },
      {
        path: 'benefit/management/edit/:id',
        name: 'ManagementEdit',
        component: () => import('@/pages/coupon/management/batch-create.vue'),
        meta: { title: '编辑券', activeMenu: '/marketing/benefit/management' }
      },
      {
        path: 'benefit/management/approval',
        name: 'ManagementApproval',
        component: () => import('@/pages/coupon/management/approval.vue'),
        meta: { title: '券审批管理', activeMenu: '/marketing/benefit/management' }
      },
      {
        // P0-路由-#3 补 5 子路由 - template/detail 已存在 detail.vue, 注册 sibling 路由
        path: 'benefit/template/detail/:id',
        name: 'TemplateDetail',
        component: () => import('@/pages/coupon/template/detail.vue'),
        meta: { title: '模板详情', activeMenu: '/marketing/benefit/template' }
      },
      {
        // P0-路由-#3 补 5 子路由 - statistics/inventory/approval 复用已有 inventory/approval.vue
        path: 'statistics/inventory/approval',
        name: 'InventoryApproval',
        component: () => import('@/pages/coupon/inventory/approval.vue'),
        meta: { title: '库存审批管理', activeMenu: '/marketing/statistics/inventory' }
      },
      {
        path: 'benefit/package',
        name: 'Package',
        component: () => import('@/pages/coupon/package/index.vue'),
        meta: { title: '券包管理' }
        // v1.2.8 P0-PKG-A: 3 children(create/detail/edit) 已删
        // 业务改为 3 弹窗模式（见 pages/coupon/package/index.vue）
        // 原 3 个空壳文件 (P0-侧边-#2 派单方案 A 留的) 已删
        // 5/26 教训链: 死链源清零
      },
      {
        path: 'statistics/logs',
        name: 'CouponLogs',
        component: () => import('@/pages/coupon/record/index.vue'),
        meta: { title: '权益日志' }
      },
      {
        path: 'statistics/inventory',
        name: 'Inventory',
        component: () => import('@/pages/coupon/inventory/index.vue'),
        meta: { title: '库存查询' }
      },
      {
        // [回退-001 恢复] S403 库存预警配置页
        // git restore marketing.ts 6/2 baseline 后被误删 (S403 是 6/2 之后 untracked 加的)
        // 12:08 恢复 派蒙/PM intent: D2 回退 但 S403 必须保留
        // 路径与 arch S402 设计一致: 仍 sibling 不嵌在 inventory (inventory/index.vue 无 <router-view>)
        path: 'statistics/inventory/alert-config',
        name: 'InventoryAlertConfig',
        component: () => import('@/pages/coupon/inventory/alert-config/index.vue'),
        meta: { title: '库存预警配置', activeMenu: '/marketing/statistics/inventory' }
      },
      {
        path: 'alert',
        name: 'Alert',
        redirect: '/marketing/alert/management',
        meta: { title: '预警中心' }
      },
      {
        path: 'alert/management',
        name: 'AlertMgmt',
        component: () => import('@/pages/marketing/alert/management/index.vue'),
        meta: { title: '预警管理' }
      },
      {
        path: 'alert/rules',
        name: 'AlertRules',
        component: () => import('@/pages/marketing/alert/rules/index.vue'),
        meta: { title: '预警规则' }
      },
      {
        path: 'alert/rules/create',
        name: 'AlertRulesCreate',
        component: () => import('@/pages/marketing/alert/rules/create.vue'),
        meta: { title: '创建预警规则' }
      },
      {
        path: 'alert/history',
        name: 'AlertHistory',
        component: () => import('@/pages/marketing/alert/history/index.vue'),
        meta: { title: '预警历史' }
      },
      {
        path: 'tasks',
        name: 'MarketingTasks',
        component: () => import('@/pages/marketing/tasks/index.vue'),
        meta: { title: '营销任务' }
      },
      {
        path: 'tasks/horizontal',
        name: 'HorizontalCanvas',
        component: () => import('@/pages/canvas/index.vue'),
        meta: { title: '横向画布' }
      },
      // exploration 探索域路由（放在 marketing 父级下，统一 /marketing/... 前缀）
      {
        path: 'exploration',
        name: 'Exploration',
        meta: { title: '探索域' },
        redirect: { name: 'AudienceManagement' }
      },
      {
        path: 'exploration/customer-center',
        name: 'ExplorationCustomerCenter',
        meta: { title: '客户中心' },
        redirect: { name: 'AudienceManagement' }
      },
      {
        path: 'exploration/customer-center/audience-system',
        name: 'ExplorationAudienceSystem',
        meta: { title: '人群系统' },
        redirect: { name: 'AudienceManagement' }
      },
      {
        path: 'exploration/customer-center/audience-system/audience-management',
        name: 'AudienceManagement',
        component: () => import('@/pages/customer/audience-system/audience-management.vue'),
        meta: { title: '人群管理' }
      },
      {
        path: 'exploration/customer-center/audience-system/audience-create',
        name: 'AudienceCreate',
        component: () => import('@/pages/customer/audience-system/audience-create.vue'),
        meta: { title: '创建人群' }
      },
      {
        path: 'exploration/customer-center/audience-system/audience-detail',
        name: 'AudienceDetail',
        component: () => import('@/pages/customer/audience-system/audience-detail.vue'),
        meta: { title: '人群详情' }
      }
    ]
  },
  {
    path: 'marketing/global',
    name: 'GlobalManagement',
    redirect: { name: 'GlobalRules' },
    meta: { title: '全局管理' },
    children: [
      {
        path: 'rules',
        name: 'GlobalRules',
        component: () => import('@/pages/global/rules/index.vue'),
        meta: { title: '规则配置' }
      }
    ]
  }]
