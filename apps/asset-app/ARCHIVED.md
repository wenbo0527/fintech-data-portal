# asset-app · 已归档

> **状态**：本应用代码已停止维护，相关业务能力已合并至 `apps/data-community-app/`。
>
> **归档时间**：2026-09-09
>
> **替代入口**：http://localhost:5185/data-community/

---

## 为什么归档

为统一数据社区平台入口，原 `asset-app`（数据资产域）所承担的**资产目录、资产详情、资产申请**等能力，已并入 `apps/data-community-app/`（数据社区工作台）的资产管理模块。

## 影响范围

- 独立运行入口（http://localhost:5179/asset/）已下线
- `dev-with-subapps.js` 启动列表中已剔除

## 保留原因

- 保留作为资产卡片、资产详情抽屉等 UI 模式的历史参考

## 如需启用

1. 编辑 `scripts/dev-with-subapps.js`，将 `asset-app` 加入 `apps` 列表
2. 执行 `pnpm --filter asset-app install && pnpm --filter asset-app dev`
