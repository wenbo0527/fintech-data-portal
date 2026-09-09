/**
 * mkt-app 路由入口
 * 模块化路由配置
 * v1.2.9 修复：删除冗余 global.ts 路由 (marketing.ts 已含 /marketing/global/rules)
 */
import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { qiankunWindow } from 'vite-plugin-qiankun/dist/helper'

// 路由模块
import { benefitRoutes } from './router/modules/benefit'
import { marketingRoutes } from './router/modules/marketing'
import { reachRoutes } from './router/modules/reach'
import { customerRoutes } from './router/modules/customer'
import { callRoutes } from './router/modules/call'
import { canvasRoutes } from './router/modules/canvas'
import { alertRoutes } from './router/modules/alert'
import { tasksRoutes } from './router/modules/tasks'

const routerBase = qiankunWindow.__POWERED_BY_QIANKUN__ ? (qiankunWindow.ROUTER_BASE || '/mkt/') : '/mkt/'

console.log('[MKT] routerBase:', routerBase)

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('./layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        name: 'MktIndex',
        component: () => import('./pages/index.vue'),
        meta: { title: '营销域' }
      },
      ...benefitRoutes,
      ...reachRoutes,
      ...customerRoutes,
      ...callRoutes,
      ...canvasRoutes,
      ...alertRoutes,
      ...tasksRoutes,
      ...marketingRoutes,
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(routerBase),
  routes
})

/**
 * 路由守卫 - 容错处理
 *
 * 处理一些历史/重复的 URL 形式,避免白页:
 * 1. /customer/customer/... → 重定向到 /customer/...(去重双 customer)
 *
 * 移除旧的"以 '/' 开头 → 去前导 '/' "容错（v1.2.10 修复）：
 *   原逻辑在 hash mode + base='/mkt/' 下会把 '/canvas' 改成 'canvas' 后 next({path:'canvas'}),
 *   vue-router 4 在 hash 模式下又会把它规范化为 '/canvas',再次进入守卫 → 无限重定向。
 *   现在 vue-router 4 + hash mode + 相对子路由 (path: 'canvas') 已能正确解析,无需手动去前导 '/'。
 */
router.beforeEach((to, from, next) => {
  let path = to.path

  // 容错 1: 去重双 customer
  // 例: customer/customer/virtual-events → customer/virtual-events
  if (path.startsWith('customer/customer/')) {
    path = path.replace(/^customer\/customer/, 'customer')
  }

  if (path !== to.path) {
    next({ path, replace: true })
    return
  }

  next()
})

export default router
