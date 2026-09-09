import { createRouter, createWebHistory } from 'vue-router'
// removed unused App.vue to avoid importing old horizontal modules

const TasksList = () => import('./pages/tasks/TasksList.vue')
const MarketingTasks = () => import('./pages/marketing/tasks/index.vue')
const MarketingHorizontal = () => import('./pages/marketing/tasks/horizontal/index.vue')

// alert 模块已清理：通知规则相关页面在 refactor 中移除（cleanup/horizontal-canvas-dedup 分支）

// DocRef: 架构文档「关键代码片段/路由定义」
export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/marketing/tasks' },
    { path: '/tasks', name: 'tasks-list', component: TasksList },
    { path: '/editor', name: 'editor', component: MarketingHorizontal },
    { path: '/marketing/tasks', name: 'marketing-tasks', component: MarketingTasks },
    {
      // 画布编辑页（支持 iframe 嵌入模式：允许无 id 直入，由页面内自动新建任务后跳转）
      path: '/marketing/tasks/horizontal',
      name: 'marketing-horizontal',
      component: MarketingHorizontal
      // 移除原来的 beforeEnter 重定向守卫：
      //   - 独立模式：用户在任务列表点"新建任务"会带上 ?mode=edit&id=xxx 进入
      //   - iframe 嵌入模式（来自 mkt-app 等宿主）：不带 id 时，由页面内 createTask 后 replace 自身
      //   - 若仍然没有 id（异常情况），保留原页面内的 router.replace('/marketing/tasks') 兜底
    }
    // alert 路由块已在 refactor 中移除（cleanup/horizontal-canvas-dedup 分支）
  ]
})
