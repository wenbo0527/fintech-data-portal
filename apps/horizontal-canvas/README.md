# 横版画布独立项目

## 概述
- 基于 Vue3 + Vite + Arco + AntV X6 实现的横版任务流画布与任务列表
- 支持独立运行与 iframe 嵌入宿主两种模式

## 快速开始
- 安装依赖：`npm install`
- 启动：`npm run dev`（默认端口 5175）
- 访问：
  - 列表：`http://localhost:5175/horizontal-canvas/tasks`
  - 画布：`http://localhost:5175/horizontal-canvas/editor?mode=edit&id=xxx&version=1`

## 主要功能
- 画布：节点添加/配置、端口布局、历史撤销重做、边插入与右键菜单、调试/统计面板、最小地图
- 列表：搜索与状态过滤、统计摘要、编辑/查看/新建/删除/发布

## 目录结构
- `src/main.ts`：入口与 Arco 图标注册
- `src/router.ts`：`/tasks` 列表与 `/editor` 画布路由
- `src/pages/tasks/TasksList.vue`：任务列表页
- `src/App.vue`：画布页面
- 组件与组合函数：位于 `src/components/*` 与 `src/composables/*`

## 集成（iframe 可选）
- 消息协议：
  - 列表：`query-tasks/query-stats/create-task/delete-task/publish-task/unpublish-task`
  - 画布：`init/ready/save`
- 宿主在 iframe 的 `load` 事件发送 `init`/任务数据；子应用“保存”后通过 `postMessage` 回传

## 注意
- 不同模式的数据源：独立模式使用 `src/utils/taskStorage.js`；嵌入模式通过 `postMessage` 由宿主提供
