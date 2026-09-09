# dmt-app · 已归档

> **状态**：本应用代码已停止维护，相关业务能力已合并至 `apps/data-community-app/`。
>
> **归档时间**：2026-09-09
>
> **替代入口**：http://localhost:5185/data-community/

---

## 为什么归档

为统一数据社区平台入口、降低多子应用维护成本，原 `dmt-app`（数据管理域）所承担的**特征管理、指标管理、数据建模、血缘关系**等业务能力，已全部并入 `apps/data-community-app/`（数据社区工作台）。

## 影响范围

- 独立运行入口（http://localhost:5184/dmt/）已下线
- `dev-with-subapps.js` 启动列表中已剔除
- 共享包 `@app/lineage-graph` 仍由 `data-community-app` 复用

## 保留原因

- 仍可能作为血缘图组件的历史参考实现被复用
- 保留代码以便回溯设计决策与差异对比

## 如需启用

1. 编辑 `scripts/dev-with-subapps.js`，将 `dmt-app` 加入 `apps` 列表
2. 编辑 `pnpm-workspace.yaml`，确保 `apps/dmt-app` 在工作空间白名单
3. 执行 `pnpm --filter dmt-app install && pnpm --filter dmt-app dev`
