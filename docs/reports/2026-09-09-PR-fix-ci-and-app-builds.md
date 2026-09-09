# 🔧 PR 描述 · fix/ci-lockfile-and-app-builds

> **目标**：修复 GitHub Actions 持续报错 + 12 个独立应用 build 全绿 + dmt-app classify-* mock 直读归档
> **分支**：`fix/ci-lockfile-and-app-builds`
> **推送远端**：`origin/fix/ci-lockfile-and-app-builds`
> **PR URL**：https://github.com/wenbo0527/fintech-data-portal/pull/new/fix/ci-lockfile-and-app-builds
> **Commits**：3 个，按主题拆分

---

## 1. 变更摘要

| Commit | 类型 | 文件数 | 摘要 |
|---|---|---:|---|
| `59984b5e` | fix(ci+apps) | 12 | 同步 pnpm lockfile + 12 个独立应用 build 全绿 |
| `b62fda56` | feat(dmt) | 4 | classify-* mock 直读归档，删除冗余副本 |
| `d967d45b` | feat(scripts+docs) | 5 | 通用 sync-app-mocks 工具 + 规约文档 |
| **合计** | — | **21** | — |

## 2. 背景

### 2.1 CI 持续报错根因

GitHub Actions 工作流（[.github/workflows/ci.yml](../../.github/workflows/ci.yml)）6 个阶段统一使用 `pnpm install --frozen-lockfile`：

- `packages/shared-utils/package.json` 新增 `@arco-design/web-vue` / `file-saver` / `xlsx` 三个 `peerDependencies`
- `pnpm-lock.yaml` 未同步刷新
- 结果：`ERR_PNPM_OUTDATED_LOCKFILE`，lint/typecheck/unit/e2e/jscpd/security 全部卡在 install 阶段

### 2.2 实际部署链路更糟

- `scripts/deploy.sh` 走本地 `npm run build`，与 CI 解耦
- 但 7 个子应用存在**构建期**缺失（vite alias 错误、import 路径指向已冻结的 archive、缺失 composable 等）
- 这些问题**不会**让 CI 红（CI 没 build 阶段），只会让线上部署静默失败

## 3. 修复详情

### 3.1 `fix(ci+apps)` — Commit 1

12 文件 / +253 / -35

| 应用 | 修复 |
|---|---|
| admin-app | `app-permission/index.vue`：`stores/user.js` → `stores/user`（实际是 .ts） |
| asset-app | 新增 `qiankun-entry.ts`（index.html 引用但文件不存在） |
| data-community-app | vite.config 补 `@/api/*` / `@/utils/*` alias |
| dfd-app | 新增 `composables/useMissingTicket.ts`（两处页面在用） |
| dmt-app | vite alias `@shared` 指到子应用自有 mock（后续 commit 2 改指归档） |
| mkt-app | archive 跨目录 import → 本地副本 `styles/subapp-tokens.css` |
| report-monitor | CreationWizard 类型补全 / VisualSelector 图标替换 / Alerts store action 重写 |
| report-monitor-backend | monitor.ts MonitorRun 补 createdAt / scheduler.ts runCheck → runMonitor |
| pnpm-lock.yaml | 重新生成 |

### 3.2 `feat(dmt)` — Commit 2

4 文件 / +16 / -160

- `apps/dmt-app/vite.config.ts`：`@shared` alias 直指 `archive/legacy-src/mock/shared/`，`server.fs.allow` 允许该目录
- 删除 `apps/dmt-app/src/mock/shared/{classify-matrix,classify-types,classify-constants}.ts`（3 个副本）
- **收益**：归档是唯一真相源，副本漂移问题彻底消失；CI 不再需要 classify-* mock 一致性检查

### 3.3 `feat(scripts+docs)` — Commit 3

5 文件 / +380

- 新增 `scripts/sync-app-mocks.mjs`：参数化通用同步工具（sync/check/prune 三模式）
- 新增 `docs/governance/CLASSIFY_MOCKS_SYNC.md`：dmt 拓扑文档 + 通用工具复用指南
- `package.json` 注册 `sync:app-mocks`
- `README.md` / `docs/README.md` 索引新增条目

## 4. 验证

### 4.1 本机 build（已跑过）

| 应用 | 类型 | 修复前 | 修复后 |
|---|---|---|---|
| admin-app | vite | ❌ | ✅ |
| asset-app | vite | ❌ | ✅ |
| data-community-app | vite | ❌ | ✅ |
| dex-app | vite | ✅ | ✅ |
| dfd-app | vite | ❌ | ✅ |
| dmt-app | vite | ❌ | ✅ |
| horizontal-canvas | vite | ✅ | ✅ |
| mkt-app | vite | ❌ | ✅ |
| report-monitor | vite+vue-tsc | ❌ | ✅ |
| report-monitor-backend | tsc | ❌ | ✅ |
| risk-app | vite | ✅ | ✅ |
| touch | vite | ✅ | ✅ |

### 4.2 通用工具

- `node scripts/sync-app-mocks.mjs --help` ✅（参数说明完整）
- sync/check/prune 三模式均已实测（缺失/多余/内容差异三种 case）

## 5. CI 影响

- ✅ **lint**：本次新增 `sync:app-mocks` 等 npm script；新文件 `scripts/sync-app-mocks.mjs` 通过 ESM 解析
- ✅ **typecheck**：未改动 `tsconfig.typecheck.json`，保持原样
- ✅ **unit / e2e**：未改动
- ✅ **security**：未改动依赖

## 6. 部署影响

- `scripts/deploy.sh mkt`（默认入口）此前从干净环境部署必失败（rollup ENOENT on subapp-tokens.css），本次修复后通过
- `scripts/deploy.sh dfd` 此前失败（useMissingTicket 缺失），本次修复后通过
- `scripts/deploy.sh admin/asset/dmt/dca` 同上
- `risk/dex/touch/horizontal-canvas` 不受影响

## 7. 后续建议（不在本 PR）

- 在 [ci.yml](../../.github/workflows/ci.yml) 增加 `build` job（在 unit 阶段后跑各子应用 vite build），把构建期错误挡在 PR 阶段
- 评估 `packages/shared-utils` 的 `peerDependenciesMeta` 是否能完全声明为 optional（避免 lockfile 频繁漂移）

## 8. Checklist

- [x] 12 个独立应用 `pnpm run build` 通过
- [x] 工作区干净（除 IDE 临时目录）
- [x] 3 个 commit 语义清晰、独立可回滚
- [x] 文档同步更新（CLASSIFY_MOCKS_SYNC.md + README 索引）
- [x] 通用工具 `sync-app-mocks.mjs` 三模式验证通过
- [ ] 合并前在 GitHub 上确认 CI 6 阶段全绿
- [ ] 合并后观察一次完整部署周期
