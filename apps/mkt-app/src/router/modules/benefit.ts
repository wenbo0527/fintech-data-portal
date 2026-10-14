/**
 * 权益中心路由模块
 * 全部使用绝对路径（扁平结构），避免嵌套父路由导致的渲染问题
 */
import type { RouteRecordRaw } from 'vue-router'

export const benefitRoutes: RouteRecordRaw[] = [
  {
    path: '/benefit',
    name: 'BenefitIndex',
    redirect: '/benefit/template'
  },
  {
    path: '/benefit/template',
    name: 'BenefitTemplate',
    component: () => import('@/pages/coupon/template/index.vue'),
    meta: { title: '券模板管理' }
  },
  {
    path: '/benefit/template/create',
    name: 'BenefitTemplateCreate',
    component: () => import('@/pages/coupon/template/create.vue'),
    meta: { title: '新建券模板' }
  },
  {
    path: '/benefit/template/detail',
    name: 'BenefitTemplateDetail',
    component: () => import('@/pages/coupon/template/detail.vue'),
    meta: { title: '券模板详情' }
  },
  {
    path: '/benefit/management',
    name: 'BenefitManagement',
    component: () => import('@/pages/coupon/management/index.vue'),
    meta: { title: '券管理' }
  },
  {
    // 券管理页组件内没有 router-view，详情必须作为同级路由注册，否则点击"详情"原地不动
    path: '/benefit/management/detail',
    name: 'BenefitManagementDetail',
    component: () => import('@/pages/coupon/management/detail.vue'),
    meta: { title: '券详情', activeMenu: '/benefit/management' }
  },
  {
    path: '/benefit/package',
    name: 'BenefitPackage',
    component: () => import('@/pages/coupon/package/index.vue'),
    meta: { title: '券包管理' }
  },
  {
    path: '/benefit/inventory',
    name: 'BenefitInventory',
    component: () => import('@/pages/coupon/inventory/index.vue'),
    meta: { title: '券库存管理' }
  },
  {
    path: '/benefit/statistics',
    name: 'BenefitStatistics',
    component: () => import('@/pages/coupon/statistics/index.vue'),
    meta: { title: '权益统计' }
  },
  {
    path: '/benefit/logs',
    name: 'BenefitLogs',
    component: () => import('@/pages/coupon/record/index.vue'),
    meta: { title: '权益日志' }
  }
]