# admin-app · 已归档

> **状态**：本应用代码已停止维护，相关业务能力已合并至 `apps/data-community-app/`。
>
> **归档时间**：2026-09-09
>
> **替代入口**：http://localhost:5185/data-community/

---

## 为什么归档

为统一数据社区平台入口，原 `admin-app`（通用管理域）所承担的**用户管理、角色权限、系统配置**等能力，已并入 `apps/data-community-app/`（数据社区工作台）的通用管理模块。

## 影响范围

- 独立运行入口（http://localhost:5182/admin/）已下线
- `dev-with-subapps.js` 启动列表中已剔除

## 保留原因

- 保留作为后续权限/角色模块二次开发的历史参考

## 如需启用

1. 编辑 `scripts/dev-with-subapps.js`，将 `admin-app` 加入 `apps` 列表
2. 执行 `pnpm --filter admin-app install && pnpm --filter admin-app dev`
