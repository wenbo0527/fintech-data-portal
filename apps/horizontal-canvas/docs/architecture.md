# 横版画布架构说明

> 版本记录
> - 2025-11-27：更新为最新服务化架构，替换 CanvasController/EventService；增加 GraphService/LayoutService/useCanvasState/useNodeInsertion/DebugHelpers 描述；统一术语与示例代码；移除预览线。

## 技术栈与约定
- 前端：Vue 3（Composition API）+ Vite
- 图形引擎：AntV X6（横向布局规则）
- 路由：`src/router.ts`
- 别名：`@` → `/src`（`apps/horizontal-canvas/vite.config.ts:8`）
- 端口：`5175`（开发基址 `http://localhost:5175/horizontal-canvas/`）

## 模块划分
- 页面（完整罗列）
  - 根页：`apps/horizontal-canvas/src/pages/Root.vue`
  - 任务列表：`apps/horizontal-canvas/src/pages/tasks/TasksList.vue`
  - 营销任务入口页：`apps/horizontal-canvas/src/pages/marketing/tasks/index.vue`
  - 横版任务画布页：`apps/horizontal-canvas/src/pages/marketing/tasks/horizontal/index.vue`
  - 横版节点视图：`apps/horizontal-canvas/src/pages/marketing/tasks/horizontal/HorizontalNode.vue`
- 组件
  - 工具栏：`apps/horizontal-canvas/src/components/toolbar/CanvasToolbar.vue`
  - 历史面板：`apps/horizontal-canvas/src/components/history/CanvasHistoryPanel.vue`
  - 调试面板：`apps/horizontal-canvas/src/components/debug/CanvasDebugPanel.vue`
  - 统计面板：`apps/horizontal-canvas/src/components/statistics/CanvasStatisticsPanel.vue`
  - 配置抽屉：`apps/horizontal-canvas/src/components/task/TaskFlowConfigDrawers.vue` 及各节点抽屉
  - 节点类型选择器：`apps/horizontal-canvas/src/components/canvas/NodeTypeSelector.vue`
  - 连线右键菜单：`apps/horizontal-canvas/src/components/canvas/ConnectionContextMenu.vue`
- 服务与工具
  - 图服务：`apps/horizontal-canvas/src/pages/marketing/tasks/horizontal/graph/GraphService.ts`
  - 布局服务：`apps/horizontal-canvas/src/pages/marketing/tasks/horizontal/layout/LayoutService.ts`
  - 状态服务：`apps/horizontal-canvas/src/pages/marketing/tasks/horizontal/state/useCanvasState.ts`
  - 节点插入：`apps/horizontal-canvas/src/pages/marketing/tasks/horizontal/composables/useNodeInsertion.ts`
  - 调试辅助：`apps/horizontal-canvas/src/pages/marketing/tasks/horizontal/debug/DebugHelpers.ts`
  - 节点服务：`apps/horizontal-canvas/src/pages/marketing/tasks/horizontal/node/NodeService.ts`
  - 持久化服务：`apps/horizontal-canvas/src/pages/marketing/tasks/horizontal/persistence/PersistenceService.ts`
  - 事件服务：`apps/horizontal-canvas/src/pages/marketing/tasks/horizontal/services/EventService.js`
  - 画布控制器：`apps/horizontal-canvas/src/pages/marketing/tasks/horizontal/services/CanvasController.js`
  - 端口工厂：`apps/horizontal-canvas/src/pages/marketing/tasks/horizontal/utils/portConfigFactoryHorizontal.js`
  - 样式常量：`apps/horizontal-canvas/src/pages/marketing/tasks/horizontal/styles/nodeStyles.js`
  - 数据存储/Mock：`apps/horizontal-canvas/src/utils/taskStorage.js`
  - （已移除）预览线系统：不再引入
  - 历史：`apps/horizontal-canvas/src/composables/canvas/useCanvasHistory.js`
  - 快速布局引擎：`apps/horizontal-canvas/src/pages/marketing/tasks/horizontal/utils/quickLayout.js`
  - 性能监控：`apps/horizontal-canvas/src/pages/marketing/tasks/horizontal/utils/performanceMonitor.js`
  - 端口验证组合式：`apps/horizontal-canvas/src/pages/marketing/tasks/horizontal/composables/usePortValidation.js`
  - 抽屉组合式：`apps/horizontal-canvas/src/composables/canvas/useConfigDrawers.js`

## 组件关系（Mermaid）
```mermaid
graph LR
  Router --> Root
  Root --> TasksList
  Root --> MarketingTasksIndex
  MarketingTasksIndex --> HorizontalIndex

  HorizontalIndex --> Toolbar
  HorizontalIndex --> HistoryPanel
  HorizontalIndex --> StatisticsPanel
  HorizontalIndex --> DebugPanel
  HorizontalIndex --> NodeTypeSelector
  HorizontalIndex --> TaskDrawers
  HorizontalIndex --> ConnectionMenu

  HorizontalIndex --> GraphService
  GraphService --> X6Graph
  GraphService --> MiniMap
  GraphService --> Selection
  GraphService --> Keyboard
  GraphService --> History
  HorizontalIndex --> LayoutService
  HorizontalIndex --> CanvasState
  HorizontalIndex --> NodeInsertion
  HorizontalIndex --> NodeService
  HorizontalIndex --> PersistenceService
  HorizontalIndex --> ConfigDrawers
  HorizontalIndex --> CanvasController
  CanvasController --> EventService
  X6Graph --> HorizontalNode

```

## 数据流与状态管理
- 画布事件：X6 触发 → 页面监听与服务方法处理（`GraphService`/`LayoutService`/`useCanvasState`） → 状态更新与 UI 联动。
- 节点点击：
  - 编辑模式：打开抽屉（`openConfigDrawer`）。
  - 查看模式统计：设置统计面板焦点并保持抽屉可打开（已取消互斥）。
- 统计数据：`RuntimeStatsMock` 提供：
  - `getNodeDailyStats(taskId, nodeId)`：节点每日进入/出。
  - `getCanvasDailyStats(taskId)`：画布每日聚合进入/结束。
  - `getNodeDailyBranchStats(taskId, nodeId, branches)`：分支每日出人数。

## 部署架构与依赖
- 本地开发：
  - `npm run dev`（端口 `5175`，访问 `http://localhost:5175/horizontal-canvas/`）
  - 别名 `@` 指向 `/src`
- 主要依赖：
  - `@antv/x6`、`@antv/x6-vue-shape`
  - `@arco-design/web-vue`
  - `vue`、`vite`

## 路由关系
- 定义位置：`apps/horizontal-canvas/src/router.ts`
- 典型映射：
  - `'/marketing/tasks'` → `apps/horizontal-canvas/src/pages/marketing/tasks/index.vue`
  - `'/marketing/tasks/horizontal'` → `apps/horizontal-canvas/src/pages/marketing/tasks/horizontal/index.vue`
  - `'/tasks'` → `apps/horizontal-canvas/src/pages/tasks/TasksList.vue`

## 重要代码参考
- 查看模式删除屏蔽：右键菜单删除、端口菜单删除、快捷键删除统一屏蔽（`horizontal/index.vue`）。
- 统计面板停靠与自适应：`useCanvasState.updateStatisticsPanelTop/updateDebugDockBounds` 与 `setupPanelResizeListeners/setupPanelWatchers`。
- 分支统计：`CanvasStatisticsPanel.vue` 提供路径构建与高亮触发，按分支列展示。
- 插件管理：`GraphService.useHistory/useKeyboard/useSelection/toggleMinimap`；快捷键：`GraphService.bindDefaultShortcuts`；选择门控：`GraphService.configureSelectionRubberbandGate`。
- 布局：`LayoutService.applyQuickLayout/applyStructuredLayout` 与 `cleanupEdgeVertices`。

## 关键代码片段

### 路由定义
`apps/horizontal-canvas/src/router.ts`
```ts
import { createRouter, createWebHistory } from 'vue-router'

const TasksList = () => import('./pages/tasks/TasksList.vue')
const MarketingTasks = () => import('./pages/marketing/tasks/index.vue')
const MarketingHorizontal = () => import('./pages/marketing/tasks/horizontal/index.vue')

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/marketing/tasks' },
    { path: '/tasks', name: 'tasks-list', component: TasksList },
    { path: '/editor', name: 'editor', component: MarketingHorizontal },
    { path: '/marketing/tasks', name: 'marketing-tasks', component: MarketingTasks },
    { path: '/marketing/tasks/horizontal', name: 'marketing-horizontal', component: MarketingHorizontal }
  ]
})
```

### 图初始化与插件注册
`apps/horizontal-canvas/src/pages/marketing/tasks/horizontal/graph/GraphService.ts`
```ts
export function createGraph(container: HTMLElement, options: any = {}) { /* 背景/网格/滚轮/高亮等默认配置 */ }
export function useHistory(graph: any, options: any = {}) { /* 注册 History */ }
export function useKeyboard(graph: any, options: any = {}) { /* 注册 Keyboard */ }
export function useSelection(graph: any, options: any = {}) { /* 注册 Selection */ }
export function toggleMinimap(graph: any, container: HTMLElement | null, visible: boolean) { /* 小地图显隐 */ }
export function bindDefaultShortcuts(graph: any, handlers: any) { /* 撤销/重做/缩放/删除/适配/快速布局 */ }
export function configureSelectionRubberbandGate(selectionPlugin: any, graph: any) { /* Ctrl/Meta 橡皮框门控 */ }
```

### 节点插入流程（收尾）
`apps/horizontal-canvas/src/pages/marketing/tasks/horizontal/composables/useNodeInsertion.ts`
```ts
export function insertNodeAndFinalize(graph, nodeType, pendingPoint, pendingInsertionEdge, getNodeLabel, createVueShapeNode, finalize?) {
  // 插入节点、修正端口、历史入栈与持久化回调
}
```

### 统计面板停靠与尺寸更新
`apps/horizontal-canvas/src/pages/marketing/tasks/horizontal/state/useCanvasState.ts`
```ts
function setupPanelResizeListeners(/* ... */) { /* 绑定 window.resize 并返回 detach */ }
function setupPanelWatchers(/* ... */) { /* 侦听显隐与宽度联动更新 */ }
```

### 历史栈监听与撤销重做
`apps/horizontal-canvas/src/composables/canvas/useCanvasHistory.js`
```js
export function useCanvasHistory(graph) { /* 提供历史栈/监听/跳转 */ }
```

### 调试辅助：保留入口与常用方法
`apps/horizontal-canvas/src/pages/marketing/tasks/horizontal/debug/DebugHelpers.ts`
```js
// testQuickLayout/testConnectionRules/runTestDebugFunction/runSimpleDebugNode 等入口
```

### 端口工厂：绝对定位右侧输出端口
`apps/horizontal-canvas/src/pages/marketing/tasks/horizontal/utils/portConfigFactoryHorizontal.js:54–66`
```js
ids.forEach((id, idx) => {
  const n = Math.max(1, ids.length)
  const contentH = end - start
  let yRel
  if (evenDistribution && contentH > 0) {
    const step = contentH / n
    yRel = start + (idx + 0.5) * step
  } else {
    yRel = start + idx * NODE_DIMENSIONS.ROW_HEIGHT + Math.floor(NODE_DIMENSIONS.ROW_HEIGHT / 2)
  }
  const args = { x: NODE_DIMENSIONS.WIDTH, y: yRel }
  items.push({ id, group: 'out', args, attrs: { circle: { 'data-port': id, 'data-port-group': 'out', 'port': id, 'port-group': 'out', class: 'x6-port-body' } }, markup: [{ tagName: 'circle', selector: 'circle' }] })
})
```

### 节点统一更新：尺寸、端口映射与数据写回
`apps/horizontal-canvas/src/pages/marketing/tasks/horizontal/index.vue:2167–2251`
```js
async function updateNodeFromConfigUnified(node, nodeType, config) {
  try {
    const pos = node.getPosition?.() || { x: 0, y: 0 }
    const label = config?.nodeName || getNodeLabel(nodeType) || nodeType
    const spec = createVueShapeNode({
      id: node.id,
      x: pos.x,
      y: pos.y,
      label,
      data: { type: nodeType, nodeType: nodeType, config, isConfigured: true }
    })
    node.resize(spec.width, spec.height)
    const existingPorts = node.getPorts ? node.getPorts() : []
    const existingIds = new Set((existingPorts || []).map(p => p.id))
    const specIds = new Set((spec.ports.items || []).map(p => p.id))
    if (node.setProp) node.setProp('ports/groups', spec.ports.groups)
    ;(existingPorts || []).forEach(p => {
      if (!specIds.has(p.id)) {
        try {
          const isOut = p.group === 'out'
          const edges = graph?.getConnectedEdges?.(node) || []
          const outgoing = edges.filter(e => {
            try { return e.getSourceCellId?.() === node.id && e.getSourcePortId?.() === p.id } catch { return false }
          })
          let targetNewPortId = null
          if (isOut) {
            const match = /^out-(\d+)$/.exec(p.id)
            const newOutIds = Array.from(specIds).filter(id => /^out-\d+$/.test(String(id))).sort((a,b)=>{
              return Number(a.split('-')[1]) - Number(b.split('-')[1])
            })
            if (match) {
              const num = Number(match[1])
              const clamped = Math.max(0, Math.min(num, newOutIds.length - 1))
              targetNewPortId = newOutIds[clamped] || newOutIds[0] || null
            } else {
              targetNewPortId = newOutIds[0] || null
            }
          } else {
            targetNewPortId = specIds.has('in') ? 'in' : null
          }
          if (targetNewPortId) {
            outgoing.forEach(e => { try { e.setSource({ cell: node.id, port: targetNewPortId }) } catch {} })
          }
          node.removePort?.(p.id)
        } catch {}
      }
    })
    if (spec.ports.items && spec.ports.items.length) {
      spec.ports.items.forEach(it => {
        if (existingIds.has(it.id)) {
          try {
            node.setPortProp?.(it.id, 'group', it.group)
            if (it.args != null) node.setPortProp?.(it.id, 'args', it.args)
            if (it.attrs?.circle) {
              const c = it.attrs.circle
              if (c['data-port'] != null) node.setPortProp?.(it.id, 'attrs/circle/data-port', c['data-port'])
              if (c['data-port-group'] != null) node.setPortProp?.(it.id, 'attrs/circle/data-port-group', c['data-port-group'])
              if (c['data-port-type'] != null) node.setPortProp?.(it.id, 'attrs/circle/data-port-type', c['data-port-type'])
            }
          } catch {}
        } else {
          node.addPort && node.addPort(it)
        }
      })
    }
    if (node.setProp) {
      if (node.setData) { node.setData(spec.data) }
      node.prop('data', spec.data)
      node.prop('nodeType', spec.data.nodeType)
      node.prop('headerTitle', spec.data.headerTitle)
      node.prop('displayLines', spec.data.displayLines)
      node.trigger('change:data', { current: spec.data, previous: node.getData?.() })
    }
  } catch (e) {}
}
```

### 本地任务存储：创建与更新
`apps/horizontal-canvas/src/utils/taskStorage.js:23–38`
```js
updateTask(id, data) {
  const list = this.getAllTasks()
  const idx = list.findIndex(t => String(t.id) === String(id))
  if (idx >= 0) {
    const merged = { ...list[idx], ...data, id: list[idx].id, canvasData: migrateCanvasData(data.canvasData || list[idx].canvasData) }
    list[idx] = merged
    localStorage.setItem(KEY, JSON.stringify(list))
    return merged
  }
  const created = { id: String(id), ...data, canvasData: migrateCanvasData(data.canvasData) }
  list.push(created)
  localStorage.setItem(KEY, JSON.stringify(list))
  return created
},
createTask(task) { const t = { id: String(Date.now()), ...task }; this.saveTask(t); return t }
```

### 统计面板：从节点构建路径高亮
`apps/horizontal-canvas/src/components/statistics/CanvasStatisticsPanel.vue:175–179`
```js
function highlightFromNode(id) {
  const path = buildPathFromNode(id)
  emit('path-highlight', { canvasId: props.canvasId, path })
}
```
### 快速布局引擎集成
`apps/horizontal-canvas/src/pages/marketing/tasks/horizontal/layout/LayoutService.ts`
```ts
export async function applyQuickLayout(graph: GraphLike, options: any = {}) {
  const instance = options.quickLayout || new HorizontalQuickLayout({})
  const result = await instance.executeHierarchyTreeLayout(graph, {/* 省略参数 */})
  cleanupEdgeVertices(graph)
}
```

### 性能监控测量闭包
`apps/horizontal-canvas/src/pages/marketing/tasks/horizontal/utils/performanceMonitor.js`
```js
const endMeasure = performanceMonitor.measure('updateNodeFromConfig')
// ... 执行更新逻辑
endMeasure()
```
### 端口验证（使能与结果）
`apps/horizontal-canvas/src/pages/marketing/tasks/horizontal/utils/portConfigFactoryHorizontal.js`
```js
const portConfig = createHorizontalPortConfig(outCount, {
  includeIn: true,
  includeOut: true,
  outIds,
  contentStart, contentEnd,
  contentLines,
  evenDistribution: true,
  enableValidation: true // 使能位置与ID校验
})
// 校验结果附加在 portConfig._validation
```

## Utils 目录说明
- `quickLayout.js`：提供横向层次布局引擎（executeHierarchyTreeLayout），由 `LayoutService.applyQuickLayout` 统一调用。
- `performanceMonitor.js`：性能测量与统计工具，开发/测试环境默认开启，支持同步/异步与装饰器式测量。
- `portConfigFactoryHorizontal.js`：生成左进右出端口配置，支持行中点或均匀分布定位，并附加端口位置与ID校验。
