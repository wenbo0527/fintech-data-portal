# Fintech Data Portal

> **企业级数据门户 Demo · 文博作品集**
>
> 覆盖**数据发现 → 数据管理 → 数据探索 → ChatBI 问数**完整闭环的前端作品集。
> 演示用 mock 数据，无需真实后端。

[![Vue](https://img.shields.io/badge/Vue-3-4FC08D)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6)]()
[![Vite](https://img.shields.io/badge/Vite-5-646CFF)]()
[![Arco Design](https://img.shields.io/badge/Arco-2.55-165DFF)]()
[![pnpm](https://img.shields.io/badge/pnpm-9.15-F69220)]()
[![License](https://img.shields.io/badge/license-MIT-blue)]()

---

## 📌 这是什么

面向金融业务团队的**数据资产一体化门户** Demo，聚焦 4 大场景：

- **数据发现**：语义搜索、标签推荐、血缘关系、使用排行
- **数据管理**：元数据管理、指标统一、权限控制、质量监控
- **数据探索**：统一查询、Jupyter Hub、智慧报表、ChatBI 问数
- **画布编排**：营销策略画布（DAG）、预览线、AB 实验

### 解决的问题

- 🔍 **找数难**：分散在多个系统，找一个指标要问 5 个人
- 📏 **口径乱**：同一指标 5 个定义，"活跃用户"数据打架
- 🚪 **用数门槛高**：业务方自助分析能力弱，依赖数据团队取数
- ♻️ **复用率低**：同样指标被重复计算，资产浪费

---

## ✨ 量化成果

| 指标 | 数值 |
|:---|:---|
| 数据表统一管理 | 3000+ 张 |
| 指标统一口径 | 100+ 个 |
| 变量 / 特征 | 10000+ 个 |
| 同时运行策略 | 30+ 个 |
| 链路吞吐 | 百万级/小时 |
| 配置周期 | 周级 → 小时级 |
| 子应用目录 | **14 个**（10 个活跃 + 4 个已摘出 workspace） |
| Mock 数据文件 | **154 个**（`data-community-app` 66，余下分布在其他应用） |

---

## 🏗️ 技术栈

| 维度 | 选型 |
|:---|:---|
| **前端框架** | Vue 3 + TypeScript + Composition API |
| **构建工具** | Vite 5 |
| **UI 库** | Arco Design 2.55 |
| **状态管理** | Pinia 2.1（9 个应用在用，仓库内已无 Vuex） |
| **路由** | Vue Router 4.2 |
| **画布** | 自研 DAG 编辑器（基于 AntV X6 1.35） |
| **图表** | ECharts 5.4 |
| **样式** | SCSS + Arco 主题；设计 Token 仅在 `data-community-app`（`src/styles-dca/tokens.css`）与 `mkt-app`（`styles/subapp-tokens.css`）落地，其余应用直接用 Arco 默认样式 |
| **测试** | Vitest 1.2（单元） + Playwright 1.58（E2E） |
| **包管理** | pnpm 9.15 workspace（`packageManager: pnpm@9.15.4`，node >= 18） |
| **后端** | 纯 mock，无真实依赖（Supabase 仅占位） |

---

## 📂 目录结构

```
fintech-data-portal/
├── apps/                       # 14 个子应用目录（10 活跃 + 4 已摘出 workspace）
│   ├── data-community-app/     # 数据社区门户 · DEC-01 权威 · 5185 · /data-community/
│   ├── mkt-app/                # 营销域（权益/客群/画布/触达/外呼）· DEC-01 权威 · 5177 · /mkt/
│   ├── risk-app/               # 风险域（变量中心/外数/离线模型/特征）· 5176 · /risk/
│   ├── dex-app/                # 数据探索（ChatBI/客户360/分析工作台）· 5180 · /dex/
│   ├── touch/                  # 全渠道触达 · 5181 · /touch/
│   ├── horizontal-canvas/      # 横向画布编排 · 5175 · /horizontal-canvas/
│   ├── portal-app/             # 视觉首页/演示稿 · 3000 · base '/'（未部署、非入口，见下）
│   ├── semantic-app/           # 语义层 · 8100 · /semantic-app/（活跃但未进 dev 编排）
│   ├── report-monitor/         # 报表监控前端 · 5173 默认 · 未部署 prod
│   ├── report-monitor-backend/ # 报表监控后端
│   ├── admin-app/              # ⛔ 已摘出 · 5182 · /admin/（现网仍在提供服务）
│   ├── asset-app/              # ⛔ 已摘出 · 5179 · /asset/（现网仍在提供服务）
│   ├── dfd-app/                # ⛔ 已摘出 · 5181 · /dfd/（能力已并入 data-community-app）
│   └── dmt-app/                # ⛔ 已摘出 · 5181 · /dmt/（能力已并入 data-community-app）
├── packages/                   # 4 个共享包（@app/* 与 @data-community/*）
│   ├── lineage-graph/          # @app/lineage-graph 血缘图组件（4 文件）
│   ├── shared-api/             # @app/shared-api 请求封装（3 文件）
│   ├── shared-utils/           # @app/shared-utils 工具函数集（10 文件，dca 唯一残留跨包依赖）
│   └── semantic-contract/      # @data-community/semantic-contract 语义契约（5 文件）
├── archive/legacy-src/         # 已冻结的旧主应用源码（见 DEPRECATED.md，内含 51.7 万行旧测试）
├── scripts/                    # 编排 / 部署 / 守卫
│   ├── dev-with-subapps.js     # 一键起 6 个活跃应用（端口占用按 -sTCP:LISTEN 回收）
│   ├── deploy.sh · rollback.sh # 原子部署（符号链接切换 + entry chunk 深健康检查）
│   ├── check-base-consistency.sh      # 闸门：vite base ↔ nginx 前缀（CI 使用）
│   ├── verify-dec01-retirement.js     # 闸门：DEC-01 退役活性（--closure / --selftest）
│   ├── verify-entry-registry.js       # 闸门：入口清单一致性（R1–R8 / --probe / --selftest）
│   └── _debug-archive/ · _test-archive-legacy/
├── tests/                      # 顶层测试（Vitest 单测 + Playwright E2E）
├── public/                     # 根级静态资源（旧 src/ 时代遗留；仅 3 个子应用另带自己的 public/）
├── docs/                       # 57 个 md（索引见 docs/README.md）
│   ├── architecture/           # 架构总览 + 本轮治理文档（见下）
│   ├── governance/             # 分支治理、mock 同步规约
│   ├── guides/                 # 业务模块说明
│   ├── migration/              # 迁移记录（JS/TS）
│   ├── prd/                    # 产品需求
│   ├── reports/                # 完成报告
│   └── archive/                # 历史归档
├── vite-plugins/               # 自定义 Vite 插件
├── supabase/                   # 数据库迁移（占位，无真实后端）
└── .github/
    ├── workflows/ci.yml        # 7 个 job（详见「合并要求」）
    ├── PULL_REQUEST_TEMPLATE.md
    └── ISSUE_TEMPLATE/
```

> 冻结应用的「已摘出」指从 `pnpm-workspace.yaml` 的 4 条 negation 移除依赖解析，
> **不等于下线部署**：`/admin /asset /dfd /dmt` 在现网 `:8443` 上仍返回 200。
> `archive/legacy-src/` 里还留着 `src/` 时代的页面，它同时是「陪跑计划」尚未迁完的依赖源，
> 在该域迁到 `risk-app` 之前不能退役。

---

## 🚀 快速开始

### 前置要求

- Node.js **>= 18**
- pnpm **>= 9.15**（推荐 `npm i -g pnpm@9.15.4`）

### 安装与启动

```bash
# 1. 克隆仓库
git clone https://github.com/wenbo0527/fintech-data-portal.git
cd fintech-data-portal

# 2. 安装依赖
pnpm install --frozen-lockfile

# 3. 一键启动 6 个活跃子应用（scripts/dev-with-subapps.js）
pnpm dev
# 数据社区门户 → http://localhost:5185/data-community/
# 营销 → :5177/mkt/   风险 → :5176/risk/   探索 → :5180/dex/
# 触达 → :5181/touch/ 画布 → :5175/horizontal-canvas/
# 脚本会先按 -sTCP:LISTEN 回收这些端口的旧监听进程，并在末尾打印「就绪 N/6」

# 4. 构建产物
pnpm --filter <app-name> build        # 单子应用构建
# 顶层 pnpm build 已禁用（src/ 已冻结，见 archive/legacy-src/DEPRECATED.md）
```

> portal-app（3000）、semantic-app（8100）、report-monitor 不在 `pnpm dev` 编排内，
> 需要单独 `pnpm --filter <app> dev`。

### 常用脚本

| 命令 | 作用 |
|:---|:---|
| `pnpm dev` | 启动 6 个活跃子应用 dev server |
| `pnpm lint` | ESLint 全仓检查（带 --fix） |
| `pnpm lint:check` | ESLint 检查（不带 --fix） |
| `pnpm lint:apps` | 仅扫描 `apps/*` |
| `pnpm lint:packages` | 仅扫描 `packages/*` |
| `pnpm lint:archive` | 仅扫描 `archive/legacy-src/` |
| `pnpm typecheck` | **仅回显「已冻结」并退出 0**；子应用各自 `pnpm --filter <app> typecheck` |
| `pnpm test:unit` | Vitest 单元 + 组件测试 |
| `pnpm test:e2e` | Playwright E2E 测试 |
| `pnpm verify:dec01` | 闸门：DEC-01 退役活性分类（`--closure <app> --json` 取清单） |
| `pnpm verify:dec01:selftest` | 上者的自证（证明它能抓到回归） |
| `pnpm verify:entry-registry` | 闸门：入口清单一致性 R1–R7（加 `--portal-shell <路径> [--probe]` 启用外部字典与现网实测） |
| `pnpm verify:external-data` | 闸门：risk 外数页面与 mock 的口径一致性 |
| `pnpm audit` | npm 安全审计 |

### 启动单个子应用

```bash
pnpm --filter data-community-app dev   # :5185
pnpm --filter mkt-app dev              # :5177
pnpm --filter risk-app dev             # :5176
```

> 已摘出 workspace 的 4 个应用（`admin-app` `asset-app` `dfd-app` `dmt-app`）**不能**用
> `pnpm --filter` 启动——`pnpm-workspace.yaml` 已把它们排除，需要进目录直接 `npx vite`。

---

## 🎨 设计原则

本项目遵循 3 层设计原则（详见 [docs/architecture/overview.md](docs/architecture/overview.md) 与原规划文档）：

### 第一层 · 基础（必守）
- **一致性**：统一设计 Token、统一图标文案
- **及时反馈**：所有异步操作有 loading / 成功 / 失败 toast
- **错误预防**：高风险操作二次确认
- **降低认知负荷**：操作列统一为「详情 + 更多∨」
- **贴近现实**：使用金融业务术语（特征、指标、血缘）

### 第二层 · 进阶（逐步落地）
- 自然交互（语义搜索、筛选联动）
- 确定性（操作列封装、视图保存）
- 意义感（批量操作即时呼出、路径最短化）
- 生长性（高级筛选折叠、最近使用）
- 不变与多变（默认主题稳定、支持深色）

### 第三层 · AI 时代（Demo 亮点）
- AI 友好（ChatBI 入口融入搜索）
- 对话式交互（自然语言问数 + 推荐问题）
- 主动式服务（数据质量异常告警）

---

## 🎨 设计 Token 使用

现状（2026-11-23 实测，勿照抄旧文档）：**没有 `packages/shared-styles` 这个包**，Token 是各应用自带的：

```typescript
// apps/data-community-app/src/main.ts
import '@arco-design/web-vue/es/index.css'
import './styles-dca/tokens.css'          // 本应用自己的 CSS Variables

// apps/mkt-app/src/main.ts
import './styles/subapp-tokens.css'
```

其余应用（risk / dex / touch / horizontal-canvas / semantic）只引 Arco 默认样式，
`pnpm dev` 起来后视觉与 dca 不完全一致属已知状态，不是配置丢失。

组件内使用变量，禁止硬编码（已落地的两个应用适用）。注意两家的命名空间**不同**，不能互相引用：

```vue
<style scoped lang="scss">
/* data-community-app：45 个 --dca-* 变量 */
.feature-table {
  padding: var(--dca-page-padding);
  background: var(--dca-bg-card);
  font-size: var(--dca-font-base);
  border-color: var(--dca-border-default);
}

/* mkt-app：14 个 --subapp-* 变量 */
.coupon-card {
  background: var(--subapp-bg);
  border-color: var(--subapp-border);
}
</style>
```

> 早期文档里的「P1-4 统一 Token 包」从未落地，别再按它写 import 路径；
> 想新增变量请先确认落在哪个命名空间，避免出现第三套。

---

## � P0-P1 仓库改造记录

仓库经历 P0（治理）+ P1（规范）两阶段 9 次提交改造，全部已推送 `main`：

| 阶段 | 任务 | commit |
|:---|:---|:---|
| P0-1 | 根目录瘦身（57 文件归档 + 6 删除） | `93e63580` |
| P0-2 | 分支归档（8 分支 + 7 tag 兜底） | `aecc763a` |
| P0-3 | 主应用冻结（`src/` → `archive/legacy-src/`） | `21bd9e7d` |
| P0-5 | 备份清理（`.backup-archive/` 3 文件） | `ec4f29c6` |
| P1-1 | ESLint 合并（4 份配置 → 1 份） | `d1b45f4a` |
| P1-5 | JS/TS 双版本清理（部分 + 风险登记） | `774ac453` |
| P1-6 | 文档体系重建（23 文件重组 + 索引） | `aa5206ad` |
| P1-10 | CI/CD 优化（当时 6 阶段质量门；现已扩为 7 个 job，见「合并要求」） | `be4fb2f9` |

详细改造日志：[docs/README.md](docs/README.md)。

### 2026-11 架构治理（进行中，台账在仓库内）

| 事项 | 结论 | 依据 |
|:---|:---|:---|
| DEC-01 归属裁定 | 同能以 `data-community-app` / `mkt-app` 为准，且采取「先并入再退役」语义 | `docs/architecture/cleanup-plan-2026-11.md` §10 |
| dca → dfd 解耦 | 跨应用闭包 **66 文件 / 29,888 行 → 0**，仅剩 `shared-utils/copy.ts` 36 行 | `pnpm verify:dec01 --closure data-community-app` |
| 变量 / 特征 / 离线模型 | 归 `risk-app`，dca 侧重复实现已删除 | 同上 §2g |
| 陪跑计划 | **保留不删**，风险域待从冻结树迁入 `risk-app` | `docs/architecture/cleanup-plan-2026-11.md` Q1 |
| 入口与部署口径 | 生产 origin 定为 `https://118.196.79.130:8443`；`portal-app` 定性为视觉首页非入口 | `docs/architecture/deploy-prefix-2026-11.md` |

---

## 🤝 贡献指南

### 分支命名

按 [docs/governance/BRANCH_NAMING.md](docs/governance/BRANCH_NAMING.md)：

- `feat/<scope>-<desc>` 新功能
- `fix/<scope>-<desc>` 修复
- `chore/<scope>-<desc>` 杂项
- `docs/<scope>-<desc>` 文档

### 提交规范

遵循 Conventional Commits：

```
<type>(<scope>): <subject>

例：feat(dex-app): 新增 ChatBI 自然语言问数
```

完整 type 列表与 PR 模板见 [.github/PULL_REQUEST_TEMPLATE.md](.github/PULL_REQUEST_TEMPLATE.md)。

### 合并要求

PR 必须通过 CI 的 7 个 job（`.github/workflows/ci.yml`，触发于 main / develop 及指向它们的 PR）：

1. ✅ Lint · ESLint（`pnpm lint:check -- --max-warnings 0`）
2. ⚠️ Typecheck · `vue-tsc -p tsconfig.typecheck.json` —— **该配置的 `include` 只覆盖 `archive/legacy-src/**` 四条路径，活跃应用 0 行进入类型检查**，绿色不代表子应用类型安全（待修，见 [docs/architecture/cleanup-plan-2026-11.md](docs/architecture/cleanup-plan-2026-11.md)）
3. ✅ Unit + Component Tests（Vitest）
4. ✅ E2E Tests（Playwright）
5. ✅ jscpd 重复代码检测
6. ✅ Security 审计（仅 main）
7. ✅ base consistency（`scripts/check-base-consistency.sh`：vite `base` ↔ nginx 挂载前缀，源自 2026-10-27 HC 白屏事故）

仓库另有两道不进 CI 的闸门，改归属/入口时手动跑：`pnpm verify:dec01`、`pnpm verify:entry-registry`。

---

## � 文档导航

| 路径 | 用途 |
|:---|:---|
| [docs/README.md](docs/README.md) | 文档索引（新人入职 10 分钟路径） |
| [ARCHITECTURE.md](ARCHITECTURE.md) | 架构总览（应用矩阵、入口、部署、闸门） |
| [docs/architecture/overview.md](docs/architecture/overview.md) | 架构说明（2026-09 版，部署一节以 ARCHITECTURE.md 为准） |
| [docs/architecture/deploy-prefix-2026-11.md](docs/architecture/deploy-prefix-2026-11.md) | **部署前缀口径与现网实测**（生产 origin、10 个前缀、portal-app 定性） |
| [docs/architecture/cleanup-plan-2026-11.md](docs/architecture/cleanup-plan-2026-11.md) | 全仓冗余扫描与整洁优化方案（含 §10 DEC-01 归属裁定） |
| [docs/architecture/dec01-migration-checklist-2026-11.md](docs/architecture/dec01-migration-checklist-2026-11.md) | DEC-01 迁移台账（T0–T6 批次与实测数字） |
| [docs/architecture/migration-roadmap-2026-11.md](docs/architecture/migration-roadmap-2026-11.md) | 后续处理路线图 |
| [docs/governance/BRANCH_NAMING.md](docs/governance/BRANCH_NAMING.md) | 分支命名规范 |
| [docs/governance/CLASSIFY_MOCKS_SYNC.md](docs/governance/CLASSIFY_MOCKS_SYNC.md) | dmt-app classify-* mock 同步规约 |
| [docs/migration/JS-TS-MIGRATION.md](docs/migration/JS-TS-MIGRATION.md) | JS/TS 迁移现状 |
| [docs/prd/](docs/prd/) | 产品需求文档（4 模块） |
| [archive/legacy-src/DEPRECATED.md](archive/legacy-src/DEPRECATED.md) | 旧主应用冻结声明 |

---

## ⚠️ 关于 src/

`src/` 主应用已**冻结归档**到 `archive/legacy-src/`（2026-09-08）。线上生产使用 **portal-shell + apps/* 子应用**架构。详见：

- [archive/legacy-src/DEPRECATED.md](archive/legacy-src/DEPRECATED.md)
- 顶层 `package.json` 中 `deprecated` 字段

请勿在 `archive/legacy-src/` 中开发新功能，所有新功能请在对应 `apps/<app-name>/` 子应用中实现。

---

## 📊 子应用矩阵（2026-11-23 实测，非约定值）

端口取自 `package.json --port`（无则取 vite `server.port`），前缀取自各应用 `vite.config.ts` 的 `base`，
现网列是 `https://118.196.79.130:8443/<前缀>/` 的实际响应，规模是 `src/**` 下 vue/ts/js/tsx 计数。

| 子应用 | 前缀 | dev 端口 | workspace | src 文件 / 行 | 近 30 天热度 | 现网 |
|:---|:---|:---|:---|:---|:---|:---|
| `data-community-app` | `/data-community/` | 5185 | ✅ 编排 | 327 / 130,268 | 220（热区） | ✅ 自己的产物 |
| `mkt-app` | `/mkt/` | 5177 | ✅ 编排 | 622 / 222,848 | 33 | ✅ 自己的产物 |
| `risk-app` | `/risk/` | 5176 | ✅ 编排 | 272 / 89,610 | 227（热区） | ✅ 自己的产物 |
| `dex-app` | `/dex/` | 5180 | ✅ 编排 | 144 / 58,712 | 19 | ✅ 自己的产物 |
| `touch` | `/touch/` | 5181 | ✅ 编排 | 48 / 7,519 | — | ✅ 自己的产物 |
| `horizontal-canvas` | `/horizontal-canvas/` | 5175 | ✅ 编排 | 74 / 14,883 | 34 | ✅ 自己的产物 |
| `semantic-app` | `/semantic-app/` | 8100 | ✅ 未编排 | 44 / 5,640 | — | ✅ 自己的产物 |
| `portal-app` | `/` | 3000 | ✅ 未编排 | 19 / 4,739 | 31 | ❌ 未部署（`/portal/` 是 shell 的重复挂载） |
| `report-monitor` | 无 `base` 字段 | 5173 默认 | ✅ 未编排 | 23 / 4,893 | — | ❌ 未部署（该前缀返回的是 shell 首页，200 属兜底） |
| `report-monitor-backend` | — | — | ✅ | 无 `src/`（data/dist） | — | `/report` → 301 |
| `dfd-app` | `/dfd/` | 5181 | ⛔ 已摘出 | 385 / 141,580 | 0 | ✅ 仍在服务（能力已并入 dca） |
| `dmt-app` | `/dmt/` | 5181 | ⛔ 已摘出 | 99 / 27,788 | 0 | ✅ 仍在服务（能力已并入 dca） |
| `admin-app` | `/admin/` | 5182 | ⛔ 已摘出 | 47 / 12,957 | 0 | ✅ 仍在服务（41 文件 / 10,748 行无 dca 对应，其 ARCHIVED.md 的「已合并」说法已被否证） |
| `asset-app` | `/asset/` | 5179 | ⛔ 已摘出 | 20 / 7,139 | 0 | ✅ 仍在服务 |
| portal-shell（外部仓库） | `/home/` | — | — | — | — | ✅ 真入口，86 条 Feature 驱动 iframe |

三点容易误读，写死在这里：

1. **端口不是顺序分配的**，且冻结应用彼此、与 `touch` 之间存在 5181 三处同值——它们已不参与编排，所以日常不冲突。
2. **HTTP 200 ≠ 已部署**：`/report-monitor/`、`/portal/` 都返回 200，但内容是 portal-shell 的 index（nginx 兜底）。判定方式是看 `<title>` 与 `src="/<前缀>/assets/…"`。
3. **摘出 workspace ≠ 下线**：4 个冻结应用在生产上仍可访问，代码退役（T1–T6）与静态目录回收是两次独立动作。

---

## 👤 作者

**文博** · AI+ 数据产品负责人

- GitHub: [@wenbo0527](https://github.com/wenbo0527)
- 知乎: [@wenbo-67-38](https://www.zhihu.com/people/wenbo-67-38)
- Email: wzhai0527@163.com

---

## 📄 许可证

MIT License

---

⭐ 如果这个项目对你的工作有帮助，欢迎 Star！