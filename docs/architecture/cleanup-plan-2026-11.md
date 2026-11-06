# 整洁优化方案 · data-community-platform

> 生成：2026-11-05 · 方法：`architecture-visualization:evolution-planner` + `flow-visualizer`，四路并行扫描（核心 app 死码 / 冻结树+scripts+配置 / 质量债+低频 app / 结构一致性与仓库卫生）
> **本文件只做方案，未改动任何代码。** 基线分支 `feat/metrics-center-and-module-updates`
> 证据标注约定：`[实测]` = 本文作者在会话中用命令直接验证；`[扫描]` = 四路扫描报告结论，关键项已抽样复核，未逐项复算

## 0. 基线数字

| 指标 | 值 |
|---|---|
| git 跟踪文件 / 源码行 | 3,980 文件 `[实测]` / 1,169,408 行 `[实测]` |
| 其中 `archive/legacy-src` | 1,220 文件 / 458,324 行（**占全库 39%**）`[实测]` |
| 其中 `apps/` | 2,185 文件 / 690,332 行 `[实测]` |
| 已跟踪但被 `.gitignore` 忽略 | **362 文件 / 6.4 MB** `[实测]` |
| dca 生产构建 | 5,373 模块 / 17.9s / exit 0 `[实测]` |

结论：**清理的主战场不是代码风格，而是「版本库里的历史包袱」+「mkt-app 内部的大面积死码」+「跨 app 契约不统一」三类。**

## 1. 分级标记

| 级别 | 含义 | 总量 |
|---|---|---|
| **[A] 安全清理** | 零引用已验证，删除不改变任何可达行为 | 约 **1,180 文件 / 19 MB（跟踪）+ 185 MB（仅磁盘）** `[扫描+实测]`；app 内源码 **146 文件 / 33,625 行** `[扫描]` |
| **[B] 需核对** | 引用链可疑（别名解析、localStorage 键、barrel 注册、被陈旧测试引用） | app 内 **137 文件 / 27,424 行** `[扫描]` |
| **[C] 禁止删除** | 已被证实为构建期或运行期承重 | dfd-app 全树、archive 的 4 个 CI 子树 + 6 个 classify 文件、`assets/2_5d`（引用未修好前） |
| **[D] 必修缺陷** | 不是冗余，是 bug，须先于清理处理 | 7 项（见 §6） |

## 2. [A] 安全清理清单

### 2.1 仓库卫生层（成本最低、可立即做）

| 项 | 证据 | 动作 |
|---|---|---|
| `.trae/` **309 个跟踪文件 / 4.7 MB** | `.gitignore:62` 已忽略它，`git ls-files` 仍返回 309 `[实测]`；内容为 342 个 AI 生成的 md（PRD/架构/评估）+ `rules/project_rules.md` `[扫描]` | `git rm --cached`；**但其中约 20 篇在 `docs/` 无对应**（budget/customer360/离线模型等），需先择地归档；`project_rules.md` 迁到实际使用的 agent 配置位 |
| `.screenshots/.tmp/` 10 个 png | 由 `apps/report-monitor-backend/src/services/explorer.ts` 的 playwright 生成 `[实测]` | `git rm --cached -r` |
| `.env`（根） | `.gitignore:70` 命中且仍跟踪 `[实测]`；13 个变量在 `apps/`+`packages/` **零消费者**，且无任何 app 设 `envDir` → 核心应用启动时根本不加载 `[扫描+实测]` | `git rm --cached`，改写 `.env.example`；无密钥形态值，**不需轮换** |
| `.vercel/project.json` | `.gitignore:67` 命中且仍跟踪 `[实测]`；含 projectId/orgId，非凭据但暴露部署目标 | `git rm --cached` |
| `tsconfig.tsbuildinfo` **619 KB** | `.gitignore:33` 命中且仍跟踪 `[实测]`，mtime 2026-08-01（早于归档冻结） | `git rm --cached` |
| 2 个转换产物被当源码保存 | `git ls-files` 命中 `apps/dex-app/src/pages/customer360/index.vue?vue&type=script&setup=true&lang.ts` 与 `apps/dmt-app/.../user-groups/…` `[实测]` | 直接删 |
| `playwright-report/index.html`、`test-results/.last-run.json`、`reports/diff/index.html`、`jscpd-all`、`jscpd-risk`、`python-reports/*.py` | 均为「忽略规则已覆盖但仍跟踪」`[实测]`；`python-reports` 无对应 Python 流程 | `git rm --cached` |
| `dist/` 66 MB、`apps/mkt-app.zip` 7.6 MB、`apps/horizontal-canvas.zip` 22.6 MB、`coverage/` 1 MB、`archive/legacy-src/tests/marketing/canvas/node_modules/` 34 MB | **全部未被 git 跟踪** `[实测]` | `git clean` 级本地清理，不进历史，零风险 |
| 根 `views/` 2 个孤儿 `.vue`、`shared/vite.config.base.ts`、`test/` 单数目录 1 文件 | 全库零引用 `[实测]`；`test/` 未被 vitest/playwright 任何配置纳入 `[实测]` | 删 |
| `.DS_Store` 8 处 | **0 跟踪** `[实测]` | 仅本地删，勿 `git rm` |

### 2.2 冻结树层（最大行数削减）

`archive/legacy-src` 的入向引用只有 5 类（`index.html:11`、`vite.config.js:96`、三个 tsconfig、`package.json:14,17` 的 lint 脚本、`apps/dmt-app/vite.config.ts:12` 的 `@shared`）`[扫描]`。解除后的分级：

- **[A]** `archive/legacy-src/tests/` —— **1,834 文件 / 517,331 行 / 37 MB**，零入向引用（其中仅 199 个被 git 跟踪）`[扫描]`。**全库最大单笔行数削减。**
- **[A]** `components/ utils/ modules/ views/ composables/ types/ core/ config/ stores/ styles/ services/ validators/ managers/ constants/ examples/ integrations/ data/ assets/` —— 各子树零入向引用 `[扫描]`
- **[C]** `pages/risk/**`、`router/**`、`store/modules/model-offline.js`、`api/offlineModel/**` —— 被 `tsconfig.typecheck.json:8-11` 纳入且 CI 在跑（`ci.yml:63`）`[实测 CI 无构建步骤 + 扫描]`。只能在 §6-D5「质量门转向」时一并摘除。
- **[C]** `mock/shared/classify-*.ts`（6 文件 / 561 行）—— `dmt-app` 的 `@shared` 指向它；且 dca 已有行数完全相同的本地副本 → **dmt 处置后即可删**。
- **[B]** `main.js/App.vue/qiankun-entry.ts/shims` —— 仅根 `index.html` 可达，而 `dev:main` 是 no-op → 实质不可达，但删除属 §2.4 根入口收口的一部分。

### 2.3 scripts/ 与根配置层

scripts 20 文件里 **4 个在用、3 个陈旧且误导、13 个完全死** `[扫描]`：

- **[A] 死脚本 13 个**：`kill-all.js`（端口 8001-8005 全是幻影 + 无 `-sTCP:LISTEN` + 无条件打印成功）、`check-ports.js`、`start-all.js`（spawn 6 个不存在的 `dev:*` 脚本）、`demo-api-test.js`、`mock-api-server.js`、`generate-diff-report.cjs`、`team2-worktree-init.sh`、`worktree-monitor.sh`（含他人绝对路径与个人飞书 ID）、`verify/file-count-check.sh`、`verify/line-count-check.sh`。**建议先归档 `nginx-mock-api.conf`**（它是前真实后端拓扑的唯一成文记录）。
- **[D] 陈旧且误导 3 个**：`migration-check.js`（调用 no-op `typecheck`/`build` 与缺失的 `src/`，**会报告成功**）、`performance-test.js`（`npm run build` 是 no-op，基准测的是 2026-08 的旧 dist）、`health-check.js`（7 个端口里 3 个错，漏检 dca）。
- **[A] 死配置**：`vitest.config.js`（与 `.ts` 并存的重复配置）、`tsconfig.paths.json`（无人 extends）、`tsconfig.node.json`（include 指向不存在的 `vite.config.ts`）、`.eslintrc.json` 中指向不存在目录的两条 `ignorePatterns`、`browserslistrc`（只服务 no-op 的根 legacy 构建）。
- **[B]** 根 `index.html` + `vite.config.js` + `vite-plugins/`：作为「库内假主入口」应整体收口（与 `ARCHITECTURE.md` 承认外部 portal-shell 为唯一入口一致）。

### 2.4 app 内部死码层 `[扫描]`（关键项我已抽样复核）

| app | [A] 安全删 | 已复核的重点项 |
|---|---|---|
| **mkt-app** | **新增 448 文件 / 55,136 行**（另 233 文件 / 106,869 行是已定性的双树重复） | `src/utils/layout/**` 33 文件 / 16,898 行 —— 我实测 mkt 内引用数 = **0** `[实测]`；`components/common/*`（BaseModal 等）17 文件 —— 我实测其 barrel 的引用数 = 0 且无模板使用 `<BaseModal>`，故全局注册不生效 `[实测]` |
| **risk-app** | 29 文件 / 2,046 行 | `src/pages/external-data-{evaluation,service,lifecycle}/` 旧树、`modules/variable-hub/{components/risk-feature,components/effect}` 孤儿、3 个空 barrel、3 个空目录 |
| **data-community-app** | 11 文件 / 1,219 行 + 4 个 mock 文件 382 行 | 5 个「目录形态被同名扁平文件遮蔽」的死页面（`discovery/{external,feature-dict,indicator-dict,variable-dict}/index.vue`、`listing-management/asset-management/index.vue` 581 行） |
| **horizontal-canvas** | 1 文件 / 61 行 | `composables/canvas/useGraphInstance.js`（与存活的 `composables/useGraphInstance.js` 是同名的旧 fork） |
| **dex-app** | 27 文件 ≈ 6.5k 行 | `build-entry.ts + build-router.ts + build-index.html` 三件套（见 §6-D3，我已验证）；`exploration/workflows/**` 等零引用簇 |
| **report-monitor** | 4 文件 | `src/router/index.ts`（被同目录 `src/router.ts` 遮蔽，Vite/TS 文件优先）、`VisualSelector.vue` 537 行零引用 |
| **asset-app** | 2 文件（页面本身 import 8 条不存在路径） | 整 app 是**无法构建的抽取碎片** → 归档集里最强的整体删除候选 |
| **dmt / admin / dfd** | 5 / 1 / ≥7 | dfd 仅可删「repo 内零命中 + import 目标缺失」子集（其 117 个 dfd 内零命中文件多为经 dca 别名消费的） |

### 2.5 依赖声明层 `[扫描]`

- **28 个库在 17 份清单间版本范围不一致**，含跨大版本：`@antv/x6` **1 / 2 / 3 三个主版本并存**（根 / horizontal-canvas / dfd）、`pinia` 2 vs 3（report-monitor）、`vue-tsc` 1 vs 2（semantic-app）、`date-fns` 3 vs 4、`marked` 11 vs 17。
- **26 个「未声明却被 import」的包**分布在 8 个 app，靠 `.npmrc` 的 `shamefully-hoist=true` 兜住；其中 `admin-app`/`dex-app` 甚至 import 了自己没声明的 `vite-plugin-qiankun`。
- **`pnpm.overrides.typescript = "5.3.3"`** 使 hc/risk/touch 声明的 `^5.5.0` 成为**假文档**（实际解析 5.3.3）。
- **11 份清单缺 `private: true`**，且 `packages/{lineage-graph,shared-api,shared-utils}` 带 `prepublishOnly` → 一次误操作的 `pnpm -r publish` 会把内部 `@app/*` 推到公网。
- **`@playwright/test` 位于根 `dependencies`**（测试工具进了运行时依赖图）。
- `packages/shared-utils` 的 **8 个 subpath exports 中 7 个零消费者**；`shared-api` 的 `./types` 零消费者。
- `apps/touch/package.json` 的 name 是 `touch-app` ≠ 目录名 → `pnpm --filter touch` 失败，而 `check-base-consistency.sh` 是按**目录名**推导 base 的。

## 3. [B] 需核对清单（不满足条件不得删）

1. **risk-app 与 dca 的 mock 导出符号**：risk 有 **84 个**、dca 有 **45 个**从未被 import 的导出名。但两 app 的 store 是 **localStorage 支撑**的，名字可由持久化键回流读取 → 须先冻结键 schema 再裁剪。**这是符号级修剪，不是文件删除。**
2. **mkt-app 的 layout/canvas 栈存在 4 份平行 fork**（`utils/layout`、`composables/layout`、`pages/tasks/**`、`pages/marketing/tasks/**`），彼此内容相近但不同 —— 逐份 diff 后才知道哪份是权威。
3. **跨 app 同名的巧合命中**（BaseForm/BaseModal/ConditionConfig 在 dfd/dex/touch 各有独立副本），删除前须按别名图逐个确认归属。
4. **被陈旧测试强行「续命」的文件**：`tests/router/risk-app.spec.ts:55,61` 动态 import 两个已死的路由文件；`tests/components/all-pages-render.spec.ts:226` import 一个死页面。根 `vitest.config.ts` 的 `@` 与 include 都指向不存在的 `./src` → 这些引用今天无法解析，**清理该配置应与这 4 个测试文件同批处理**。
5. **`.eslintrc.json:29` 的 `ignorePatterns: ["archive/"]`** 使 `lint:archive`/`lint:migrate`（package.json:14,17）**静默空跑** `[实测]` → 修正前不要按「lint 已覆盖」下结论。
6. **risk-app `entry.ts`（68 行 qiankun 生命周期）** 与 `registry.ts` 的 53 条字符串路由记录：属「第二真源」，删或接需一并决策（见 §7-Q1）。

## 4. 质量债（不是删除项，但属整洁方案）

| 指标 | 实测/扫描值 | 说明 |
|---|---|---|
| mkt-app `console.*` | **4,475** `[实测]` | 其中约 95% 随死树一起消失，剩余仅 4 个文件 ≥10 → **用规则而非批量改** |
| 全库 `: any` | risk 482 / mkt 393 / dfd 390 / dca 324 …，archive 1,646 `[扫描]` | `.eslintrc.json` 把 `no-explicit-any`、`no-unused-vars`、`ban-ts-comment`、`vue/no-unused-components` 等全局 `off` |
| `@ts-*` 抑制 | archive **105** `[实测]` | 冻结树内 |
| `eslint-disable` | 全库源码仅 19 处，无文件 ≥5 `[扫描]` | 说明规则是被「整体关掉」而非「逐点豁免」——治理方向是重开规则，不是删豁免 |
| 超大文件 | 44 个 >1,500 行，18 个 >2,000，4 个 >3,000 `[扫描]` | 首位 `horizontal-canvas/.../horizontal/index.vue` 3,450 行；`risk .../variable-management/index.vue` 2,907 行（script 1,809） |
| `v-html` | 21 处，`eval/new Function` 0 处 `[扫描]` | 最集中在 `dca/src/pages/metrics-center/detail.vue`（4 处）与 `discovery/search/index.vue:163`（搜索高亮拼 HTML）→ demo 项目仍属 XSS 形态债 |
| 设计 token | 71 个 CSS 自定义属性 **0 同名异值冲突** `[扫描]` | 真正的风险是 `mkt-app/src/styles/subapp-tokens.css` 与 `archive/legacy-src/styles/subapp-tokens.css` **靠人工同步的字节级副本**（文件头自陈「修改时请同步两边」），以及 `--subapp-*` / `--dca-*` 两套并行命名空间 |

## 5. 结构与契约统一（整洁方案的骨架）

目标约定（迁移成本最低，因 11/12 个 app 已满足大半）：
`api · components · composables · constants · layouts · mock · pages · router/ · stores · styles · types · utils` + `main.ts · Root.vue · registry.ts`。

| 冲突 | 现状证据 | 统一动作 |
|---|---|---|
| 目录命名三套拼法 | `store`/`stores`/`stores-dca`；`layout`/`layouts`（risk 唯一单数）；`views`/`pages`（semantic 只有 views，dfd 的 `views/` 24 文件零引用）；`-dca` 后缀**只有一个 app 用，且自己还不一致**（dca 同时有 `components` 与 `components-dca`）`[扫描]` | R1–R8 重命名；其中 dca 去 `-dca` 涉及 **155 处引用 / 93 文件 + 7 条 vite alias + dfd 侧 1 条跨 app alias** → **[BREAKING]** |
| 端口三重占用 | `5181` 被 touch(vite)、dfd(`--port`)`[实测]`、dmt(vite) 同时声明，均 `strictPort` `[扫描]`；`5185` 被 dca 与 dfd(vite) 双占 | 先解冲突再谈 registry |
| `--port` CLI 覆盖 vite 配置 | 7 个 app 的 `package.json dev` 带 `--port`，导致 `server.port` 不是唯一真源 `[扫描]` | 移除 CLI `--port` |
| registry 端口 ≠ 实际端口 | dfd `registry.ts:14` 写 5185 但实跑 5181；dmt 写 5184 而 **5184 在全库任何配置里都不存在** `[扫描]` | 修正或以 registry 为唯一真源生成其余处 |
| history 模式分裂 | **mkt 是唯一 `createWebHashHistory`** `[实测]`，其余 history；而 dca 用整页跳转向 `http://localhost:5177/mkt/`（路径式 URL 交给 hash 路由 → 落 `#/`）`[实测]` | 统一 `createWebHistory(import.meta.env.BASE_URL)` |
| touch 路由无 base | [router.ts:238](file:///Users/mac/nis_mock/data_comunity/data_comunity/apps/touch/src/router.ts#L238) `createWebHistory()` **不带 base**，而 vite `base:'/touch/'`；守卫 `:245` 又 `return { path: '/touch' }`（在带 base 下是另一个 URL）`[实测]` | 必修 D2；`check-base-consistency.sh` 只 grep vite base，**抓不到这类 bug** → 扩展它 |
| 路由名重复 | mkt 除已知 `MarketingTasks` 外还有 **5 组 Alert* 重名**（`alert.ts` 与 `marketing.ts` 各注册一次）`[扫描]`；risk 16 组、dex 4 组是**死 fork** 非运行期冲突 `[扫描]` | 删除重复记录或改 redirect |
| registry 类型断链 | 6 个 app `import type … from '@/shared/registry/types'` 指向不存在路径，唯一真身在 `archive/legacy-src/shared/registry/types.ts` `[扫描]`；三份 `MicroAppRegistry` 形状互异（dca/semantic/risk 各一套，risk 甚至 `registry: any`） | 建 `@app/registry-contract`，与 §7-Q2 的 app-registry 合并落地 |

## 6. [D] 必修缺陷（先于清理，且多数是「假绿」）

| # | 缺陷 | 证据 | 级别 |
|---|---|---|---|
| D1 | **CI 不构建 workspace 包**，而 `shared-api`/`shared-utils` 只经 `dist` 解析且 **dist 未入库** → 干净检出/CI 无法解析；本地能跑全靠 dca 的 alias 绕过 | `ci.yml` 只有 `pnpm install`，`grep build` = 0 `[实测]`；两包 `main` 指向 `./dist/*` `[扫描]` | 阻塞质量门转向 |
| D2 | touch 路由无 base（见 §5） | `[实测]` | 生产深链风险 |
| D3 | **dex 的「生产入口」三件套是死码且已损坏**：`build-entry.ts:5` import 不存在的 `./App.vue`；`vite.config.ts:22-32` 的 `rollupOptions` **只有 output.manualChunks，没有 input** → 真实构建入口是 `index.html → main.ts → router.ts` | `[实测]` | 见 §8 更正 |
| D4 | **risk-app 的陪跑计划是一次未完成的迁移，不是死码，不得删除**（2026-11-05 经用户确认修正原判定）：`MainLayout.vue:79-81` 菜单、`:173-175` 高亮分支、`modules/variable-hub/components/GovernanceActionDrawer.vue:39` 的 live 按钮都指向 `/accompany/*`，而 `router.ts` 无对应记录（`git log -S accompany -- router.ts` 仅命中 `be0a88a91` 新增的一行注释）。功能的完整实现仍在冻结树：`archive/legacy-src/router/index.js:138-152` 有真实路由、`router/constants.js:142-144` 定义 `/risk/accompany*`，`:268` 注释自陈「accompany 已迁移至 risk-app」——**迁移未完成**。缺的部分：4 个 step 组件被搬成骨架（legacy 134/242/501/546 行 → risk-app 17/30/21/21 行）、`types/steps.ts`/`utils/calculations.ts`/`components/steps/SuccessStep.vue` 未搬、路由未接 | `[实测]` | 功能补全项，非清理项 |
| D5 | **质量门全在检查死代码**：CI `vue-tsc` 的 include 只有 `archive/legacy-src/**` `[实测]`；`.eslintrc.json` 忽略 `archive/` 又让 `lint:archive` 空跑 `[实测]`；`vitest.config.ts` 的 `@` 指向不存在的 `./src` → 我实跑 `pnpm test:component` = **9/9 全红**；npm 脚本 `typecheck`/`dev:main`/`build`/`preview` 是 4 个 `echo && exit 0` | `[实测]` | 假绿总根源 |
| D6 | dca 的 `@/composables` 在 `vite.config.ts` **被声明两次**（:48 自家、:117 dfd），Vite 数组按序匹配 → 后者是不可达配置 `[扫描]` | 同文件注释自陈别名遮蔽曾导致「搜索恒为空」 | 高危配置债 |
| D7 | `apps/dfd-app/src/utils/supabase.ts` + `api/canvasStatistics.ts` 构成**不可达但真实存在**的 BaaS 客户端（含假凭据回落），dfd 的 `package.json:19` 仍声明 `@supabase/supabase-js ^2.39.0` | `[实测]` | 与 `overview.md:44` 的反 BaaS 教条冲突 |

## 7. 执行顺序（切片 / 验证信号 / 回滚）

| 切片 | 内容 | 依赖 | 验证信号 | 回滚 |
|---|---|---|---|---|
| **S1 版本库卫生** | `git rm --cached` 那 362 个僵尸 + 删 `?vue&` 产物 + 本地 `git clean` | 无 | `git ls-files -ci --exclude-standard` = 0 行 | 单 commit revert |
| **S2 修缺陷 D1/D5** | 两包改 `main/exports` → `./src/*.ts`（与 lineage-graph/semantic-contract 一致）；tsconfig.typecheck 的 include 换成 4 个核心 app；vitest 收敛为一份且 `@` 指向真实位置；`.eslintrc` 摘掉 `archive/` 与两个不存在目录 | S1 | CI 三项（lint/typecheck/test）输出中**出现核心 app 路径**；`test:component` 由 9/9 红转为可解释状态 | 按 app 分次开启，每 app 独立 commit |
| **S3 收口假主入口** | 根 `index.html`/`vite.config.js`/`vite-plugins/`/`browserslistrc` 处置；13 个死脚本 + 3 个误导脚本移除（`nginx-mock-api.conf` 先归档） | 无 | `pnpm` 脚本表里无 no-op；`scripts/` 内不再有任何幻影端口（8001-8005）或他人绝对路径 | 逐项 commit |
| **S4 契约统一** | 建 `@app/registry-contract` + 唯一 app-registry；解端口冲突；mkt 转 history 或 dca 改 hash URL；touch 补 base；清 mkt 6 组重名路由 | S3 | `check-base-consistency.sh` 扩展后同时断言 vite base、router base、registry entry 端口；`grep "@/shared/registry/types"` 归零 | 按 app 逐个切换 |
| **S5 解 dca ⇄ dfd 环** | 按别名分组把 dfd 侧代码物理迁入 dca，删反向 alias | S4 | dca 的 vite/src 中 `dfd-app` 字样为空；`pnpm --filter data-community-app build` 仍 exit 0（当前基线：5,373 模块 `[实测]`） | 迁移前打 tag；每组 alias 一 commit |
| **S6 app 内死码** | 先 mkt `utils/layout`+`composables/layout`+死页面树（≈50 文件 / 20k 行起），再 risk/dca/hc/dex/rm 的 [A] 项 | S5（dca 相关项需先解环） | 每批：build 通过 + 该 app 路由 smoke + `console.*` 计数下降 | 按簇 revert |
| **S7 冻结树退役** | 先 `archive/legacy-src/tests/`（517k 行），再其余 [A] 子树；`mock/shared/classify-*` 随 dmt 处置 | S2,S5 **+ 陪跑计划移植完成（D4）** | `grep -rn "legacy-src"` 仅剩文档；`tsconfig.json` include 缩小 | 逐子树 commit |

> **S7 的退役前置闸门共三个**（任一未解除即不可删冻结树）：① 根 `index.html`/`vite.config.js` 的入口指向；② `dmt-app` 的 `@shared → mock/shared/classify-*`；③ **陪跑计划的完整实现仍只存在于冻结树**（D4）——只要它没有在 risk-app 里补齐并接线路由，冻结树的 `pages/management/accompany/*`、`components/steps/*`、`utils/calculations.ts`、`types/steps.ts`、`router/*` 就仍是承重代码。
| **S8 结构重命名** | dca 去 `-dca`（155 处 / 93 文件 / 7 alias / 1 跨 app alias）、`layout`→`layouts`、`views`→`pages`、`store`→`stores` | S5,S6 | `pnpm --filter data-community-app build` + `check-base-consistency.sh` | **[BREAKING]**，放最后 |

排序原则：先让「假绿」变真（S2），否则清理动作没有可信的回归信号；一切删除排在解环（S5）之后，避免「为了让门禁变绿而删掉承重代码」。

## 8. 本次扫描中的更正（诚实记录）

| 我先前说过 | 更正后 |
|---|---|
| 「dex-app 的 `exploration/`（30.9k 行）被生产入口有意排除，只发 customer360」 | **错。** 生产构建根本没有自定义 `input`，入口是 `main.ts → router.ts`（28 条路由全发）；`build-entry/build-router/build-index` 三者无人引用且 `build-entry.ts` import 了不存在的 `App.vue` `[实测]` |
| 「dca 有 LIVE 文件 import 了不存在的组件，构建会失败」 | **错。** [BusinessCoreDetails.vue:283-284](file:///Users/mac/nis_mock/data_comunity/data_comunity/apps/data-community-app/src/pages/customer360/components/BusinessCoreDetails.vue#L283) 是注释，模板侧也在 `<!-- -->` 内；实测 dca 构建 **exit 0 / 5,373 模块** `[实测]` |
| 「全库无 supabase 代码，`supabase/` 目录可径直删」 | **不完整。** dfd 内有 2 个不可达文件 + 1 条真实依赖声明 `[实测]`，删除判定须连带它们 |
| 「`pnpm test:unit` 实际发现 0 个用例」 | 更准确：spec **被发现**，但因 `@` 别名指向不存在的 `./src` 而 **9/9 整文件加载失败** `[实测]` |
| 「`archive/` 里被跟踪的产物很多」 | 被跟踪的运行时产物其实只有 **3 个**；`dist/`、两个 `.zip`、`coverage/` **都未被 git 跟踪** `[实测]` |
| `tests/archived`、`scripts/_debug-archive`、`scripts/_test-archive-legacy` 作为现存冗余列出 | 它们是**本分支上被删除的目录**（提交 `a51b564f`），当前不存在 `[扫描]` |
| 建议「用 `node scripts/kill-all.js` 停止服务」 | **错。** 该脚本端口全是幻影且无条件报成功；正确命令是 `pkill -f dev-with-subapps.js` `[实测]` |

## 9. 待你决策的开放项

- **Q1（已定 2026-11-05）** 陪跑计划**保留，不删**。工程侧定性为「未完成的迁移」而非「坏菜单」；补全动作见 D4 与 §7 的 S7 闸门。仍待确认：**当前「正常运行」是在哪个环境/URL**（8443 上的旧主应用构建？本地冻结树 dev？），这决定移植的紧迫性与验收基线。
- **Q2** mkt-app 转 `createWebHistory` 会改变全部 `/mkt/#/…` 深链；还是改 dca 的跨 app 跳转 URL？
- **Q3** `@antv/x6` 三个主版本（1 / 2 / 3）统一到哪个？这决定 catalog 能否落地。
- **Q4** dca 去 `-dca` 后缀是全计划中最机械也最 [BREAKING] 的一步，是否值得做？
- **Q5** `.trae/` 中约 20 篇 `docs/` 无对应的文档：归档进 `docs/`，还是视为 AI 会话产物整体丢弃？
- **Q6** `archive/legacy-src/tests/`（517k 行）删除后，`tsconfig.json` 的 include 是否同步收窄以减小 IDE 索引？
- **Q7** 低频/停摆 app（report-monitor 双线、semantic-app、touch、dex）是否维持现状？`report-monitor` 的 `index.html` 标题仍是 `My Trae Project`，且它同时存在 `router.ts` 与 `router/index.ts` 两份路由。

## 10. 归属裁定 DEC-01（2026-11-05 由用户下达）

**规则：同一功能以 `apps/data-community-app` 与 `apps/mkt-app` 为准。** 其余 app（dex/dfd/dmt/asset/admin）与冻结树中的同名实现一律为非权威副本。

判定方法：对每个目标 app 的 `src` 文件，按「段边界后缀」在权威源 `src` 全量中找同构对应物（可容忍父目录改名，如 dex `exploration/customer-center/tag-system/*` ↔ mkt `customer/tag-system/*`），再按 md5 区分逐字节相同与已分叉。脚本 `authority-coverage.mjs`。

| 目标 app | 对 dca 有对应 | 对 mkt 有对应 | 规则未覆盖 |
|---|---|---|---|
| dex-app (145) | 35（12 同 / 23 分叉） | 64（14 同 / 50 分叉） | 51 文件 / 18,627 行（并集口径） |
| dfd-app (385) | **29（2 同 / 27 分叉）** | 153（39 同 / 114 分叉） | 见下方警告 |
| dmt-app (99) | **63（18 同 / 45 分叉）** | 12 | 36 文件 / 4,558 行 |
| asset-app (20) | 8（3 同 / 5 分叉） | 1 | 12 文件 / 3,944 行 |
| admin-app (47) | **6（0 同 / 6 分叉）** | 15 | **41 文件 / 10,748 行** |

### DEC-01 能决定什么

- **dmt-app**：63/99 文件在 dca 已有对应 → 它是唯一「真正被吸收」的归档 app。动作 = 逐分叉文件以 dca 为准收敛，然后整体退役（其 `@shared` 依赖随之解除）。
- **dex 的客群/标签域**：对 mkt 覆盖 64 文件 → 该域归 mkt，dex 侧副本退役；dex 的 `exploration/` 其余部分需按域另判。

### DEC-01 不能决定什么（不得据此删除）

1. **dfd-app。** dca 通过 vite alias 直接引用 dfd 源码（已实测运行期解析到 `@fs/…/apps/dfd-app/src/pages/…`），所以「以 dca 为准」对 dfd 只能靠迁入实现。**真实载荷（2026-11-05 按 alias 闭包重算）= 68 文件 / 29,533 行**，不是 dfd 的全量 131,625 行：dca 的 `@/` 形式引用共 385 点，其中仅 44 点跨到 dfd/shared-utils，落到 **25 个入口文件（9,768 行）**，沿 dfd 内部 import 展开到 3 跳后收敛为 68 文件。其余约 288 个 dfd 文件与 dca 无关（只被 dfd 自己的入口引用，而那个入口无人运行）。这把 §7 的 S5 从「解环优化」升级为 DEC-01 的法定前置，但**成本比原估低一个数量级**。
2. **admin-app 的 10,748 行**（`permission` 9 / `content` 5 / `notifications` 3 / `portal` 1 等）。这些功能在 dca 里没有对应物，属「唯一实现」而非「重复实现」；其 ARCHIVED.md 的「已合并至 data-community-app」对这 41 个文件不成立。需另判：迁入 dca，或确认产品放弃。
3. **dmt-app 的 4,558 行**，其中 `data-standard/`（7 文件）在 dca 有 `pages/management/data-standard/{words,audit}` **空目录**——壳已建、内容未搬，属迁移未完成，不是可删冗余。
4. **asset-app 的 3,944 行**：该 app 自身有 20 处指向不存在路径的 import（无法构建），未覆盖部分只能「产品放弃」或「在 dca 重做」。
5. **两处「非权威方反而更完整」**：dex `audience-system/audience-create.vue` 1,216 行 vs mkt 同名 561 行；dex `customer-center/index.vue` 645 行 vs dca `exploration/index.vue` 4 行。**需确认 DEC-01 的语义是「以 dca/mkt 为归集目标」还是「无条件保留 dca/mkt 的现有内容」**——前者要求把差异并入 dca/mkt，后者会直接丢失约 1,300 行已实现功能。
6. **对 mkt 的覆盖数不可用于裁决发现/管理域**：mkt 存在大量同名但零引用的死副本（`components/common/*` 的 barrel 引用数实测为 0、`utils/layout/**` 33 文件引用数实测为 0）。权威必须**按域指定**，不能按文件存在性自动推定：营销域/客群标签域 → mkt；发现域/管理域/门户域 → dca。

### DEC-01 语义已定为 (a)

**2026-11-05 追加**：语义取 (a) —— dca/mkt 为**归集目标**，非权威方更完整的部分须先并入再退役（不做无条件取舍）。可执行的逐文件分类与切片见 [dec01-migration-checklist-2026-11.md](dec01-migration-checklist-2026-11.md)：696 个非权威 src 文件分为 直接退役 38 / 权威更完整可退役 102 / **需先并入再退役 25（缺口约 4,923 行）** / 规则未覆盖 531。其中 dfd 与 dca 的耦合面按 alias 闭包重算为 **68 文件 / 29,533 行**（原按「无同构对应」估的 131,625 行是 dfd 全量，不是载荷）。

关联产物：[整改路线图](file:///Users/mac/nis_mock/data_comunity/data_comunity/docs/architecture/migration-roadmap-2026-11.md) · [依赖缺口图](file:///Users/mac/nis_mock/data_comunity/data_comunity/docs/architecture/dependency-gap-2026-11.dot) · [启动链路图](file:///Users/mac/nis_mock/data_comunity/data_comunity/docs/architecture/boot-flow-2026-11.dot)
