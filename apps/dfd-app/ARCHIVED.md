# dfd-app · 已归档

> **状态**：本应用代码已停止维护，相关业务能力已合并至 `apps/data-community-app/`。
>
> **归档时间**：2026-09-09
>
> **替代入口**：http://localhost:5185/data-community/

---

## 为什么归档

为统一数据社区平台入口，原 `dfd-app`（数据开发域）所承担的**任务流编排、ETL 调度、外部数据源接入、预算管理**等能力，已并入 `apps/data-community-app/`（数据社区工作台）。

## 影响范围

- 独立运行入口（http://localhost:5181/dfd/）已下线
- `dev-with-subapps.js` 启动列表中已剔除

## 保留原因

- 工作流画布（基于 `@antv/x6`）、Monaco 编辑器集成等实现细节仍可作为技术参考
- 复用组件 `@dca-components` / `@composables` 仍由 `data-community-app` 引用

## 如需启用

1. 编辑 `scripts/dev-with-subapps.js`，将 `dfd-app` 加入 `apps` 列表
2. 编辑 `pnpm-workspace.yaml`，确保 `apps/dfd-app` 在工作空间白名单
3. 执行 `pnpm --filter dfd-app install && pnpm --filter dfd-app dev`
