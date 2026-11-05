# 整改路线 · data-community-platform

> 生成：2026-11-05 · 方法：`architecture-visualization:evolution-planner`
> 证据基线：分支 `feat/metrics-center-and-module-updates`，merge-base `75353fd3`，工作树含 risk-app 10 处未提交改动
> 阅读顺序：先读「约束」→「缺口地图」→ 各 Phase 的验收信号；回滚条件是每个阶段的停止开关，不是附录

## 0. 约束（Constraint）

- C1 主入口 `portal-shell` 是库外独立仓库，本仓库无法直接改其 iframe key 映射，只能通过 base/端口契约间接影响。证据：`ARCHITECTURE.md:18`
- C2 本项目为纯前端展示型，数据以浏览器内 mock 为准，无真实后端。证据：`docs/architecture/overview.md:5`、`apps/mkt-app/src/mock/MOCK_STANDARD.md`
- C3 唯一真后端 `apps/report-monitor-backend`（Express, `PORT||3001`）与前端硬耦合：`apps/report-monitor/src/services/api.ts:3`
- C4 无 ADR 目录；架构决策散落于 `ARCHITECTURE.md` / `DEPRECATED.md` / `docs/governance/**`，因此本文件充当过渡性决策记录。

## 1. 维护活跃度事实（用于决定谁值得投入整改）

| app | 近 90 天提交 | 末次提交 | 本分支改动文件 | src 内测试 |
|---|--:|--:|--:|--:|
| risk-app | 43 | 2026-11-05 | 142 | 0 |
| data-community-app | 30 | 2026-10-23 | 149 | 0 |
| mkt-app | 13 | 2026-10-27 | 46 | 9 |
| horizontal-canvas | 8 | 2026-11-05 | 50 | 0 |
| dex-app | 4 | 2026-10-27 | 22 | 2 |
| touch | 3 | 2026-10-19 | — | 0 |
| semantic-app | 1（全生命周期） | 2026-10-14 | 50 | 0 |
| report-monitor / -backend | 2 / 2 | 2026-09-09 | — | 0 |
| dfd-app（标称归档） | 13 | 2026-10-19 | 14 | 2 |
| admin / asset / dmt | 归档后 0 | 2026-09-09 | ≤6 | 0 |

判定：**核心 = risk-app + data-community-app + mkt-app + horizontal-canvas**（4 个，非 3 个；horizontal-canvas 为 HEAD 提交所在且被 mkt-app 运行时嵌入）。低频 = dex-app + touch。停摆 = report-monitor 两条线 + semantic-app（单次提交且 50 文件未收口）。

## 2. 缺口地图（Gap Map）

| Gap 类型 | 现状证据 | 目标 | 复杂度 | 阻塞后续？ |
|---|---|---|---|---|
| 入口壳 gap | `index.html:11` 仍加载 `archive/legacy-src/main.js`；`vite.config.js:96` 把 `@` 指向冻结树；root 端口 5177 撞 `mkt-app:5177`；`dev:main` 是 `echo+exit 0` | 库内不存在「主入口」，文档与工具同步承认外部 portal-shell 为唯一入口 | 低 | 否 |
| Registry gap | 11 份 `apps/*/src/registry.ts` 各自自述 basePath+entry；6 份 `import type ... from '@/shared/registry/types'` 指向不存在的路径（靠 `import type` 擦除存活）；dfd entry 5185 撞 dca 5185，dmt entry 5184 vs vite 5181 撞 touch | 单一 `packages/app-registry` 常量表，供 dev/health/deploy/文档共同消费 | 中 | **是** |
| 依赖环 gap | dca → `apps/dfd-app/src` 约 50 个 alias + 13 处 `import('@/dfd-pages/...')`；dfd → `../data-community-app/src/components-dca|composables`（`dfd-app/vite.config.ts:43-45`，`dfd-app/src/pages/asset-catalog/index.vue:146`）；而 dfd 被 `!apps/dfd-app` 排除在 workspace 外 | dfd 侧被复用代码物理迁入 dca，单向依赖，归档 app 可摘 | 高 | **是** |
| 冻结树 gap | `apps/dmt-app/vite.config.ts:12` `@shared → archive/legacy-src/mock/shared`，8+ 处字面 import | 冻结树无任何反向依赖后才能退役 | 中 | 是（仅阻塞 legacy 退役） |
| 质量门 gap | `tsconfig.typecheck.json:8-11` include 全是 `archive/legacy-src/**`；`vitest.config.js:31`/`vitest.config.ts:16` include 全是 `src/**`（目录已不存在 → 实际发现 0 用例）；CODEOWNERS 认领 4 个归档 app、无 data-community-app | 质量门覆盖 4 个核心 app；冻结树只保留 lint 归档 | 中 | 否 |
| 文档一致性 gap | 子应用数三套说法（README 12 / overview 11 / ARCHITECTURE 8）；README `:300-315` 端口表 5181-5191 与实测 11 项中仅 1 项相符；`架构治理路线图` 主线 F 目标 `apps/main-shell` 从未创建 | 单一来源 = app-registry，文档表格改为生成物 | 低 | 否 |
| 冗余 gap | 见第 3 节 | 核心 app 去重 + 归档 app 摘除 | 中-高 | 否 |

## 3. 冗余量化（jscpd 复算 + md5 聚类）

`jscpd-all/jscpd-report.json`：532 clones / 11,227 dup 行。按归属拆解后，**只有约 3,082 行落在活跃 app 之间**，其余是冻结树内部（232 对 / 6,899 行）与 182 对指向已清理的 `*.vue.js` 产物。即：仓库 5.7% 重复率的大头在死代码里，真实待办比数字小。

已复核的最大单项：`apps/mkt-app/src/pages/tasks/`（121 文件 / 54,504 行）vs `src/pages/marketing/tasks/`（120 文件 / 54,318 行）—— 115 个同名文件逐字节相同、5 个有差异，且两条路由同时注册在线。

其余按 md5 字节相同聚类的重复：`excelUtils.ts`（dfd=mkt=legacy 三副本）、`formatUtils.ts`（dca-dex 一组、dfd-legacy 一组）、`workflowStorage.ts`（dex=mkt=legacy）、`taskStorage.js`、store `tagManagement.ts`（dex=dfd=mkt 三副本）、`tagCenter.ts`、`datasource.ts`，以及 asset/dmt/dca 三处相同的 `tag-management/*.vue`。

Mock 漂移是比副本更危险的一类：`data-map.ts` 6 份（44 B ~ 37,983 B）、`metadata-store.ts` 5 份（362 B ~ 62,288 B）、`customer360.ts` 4 份、`standard-store.ts` 4 份。`scripts/sync-app-mocks.mjs` 只是这个副本模式的止痛药，且未接入任何 CI workflow，最后修改 2026-09-09；`docs/governance/CLASSIFY_MOCKS_SYNC.md:68` 已写「dmt 已不再需要」。

## 4. 迁移切片

### P0 事实校准（约 0.5 天 · 风险：低 · 不依赖任何前置）

**进度（2026-11-05）**：`scripts/dev-with-subapps.js` 编排集合已修正为实测活跃集合——新增 mkt-app(5177) 与 dex-app(5180)，共 6 项；移除 `mainApp(5173)` 一步（`dev:main` 是 `echo + exit 0` 空操作，且预释放 5173 会 SIGKILL 本地运行中的 report-monitor 而脚本从不重启它）；归档 app 端口注释按各 vite.config 更正（dfd 5185 与 dca 相同、dmt 5181 与 touch 相同）。校验方式：`node --check` 通过；6/6 编排端口与各自 `vite.config.ts` 的 `port` 一致且 `dev` 脚本存在；非注释行已无 `5173/dev:main/mainApp`。**未执行完整 `pnpm dev` 实跑**，因为该脚本会 SIGKILL 当前已在运行的 6 台 dev server（5175/5176/5177/5180/5181/5185）。

运行时实测（作为本阶段事实基线）：6 台 dev server 全部 `/base/` → 200 `text/html` 且 `/src/main.ts` → 200 `text/javascript`，本地无「entry 被吞成 HTML」形态；同时确认 dev server 对不存在的模块路径返回 **200 + text/html**（SPA 兜底），因此任何健康检查必须校验 content-type，单看 HTTP 200 无效。

其余未项：README 端口表重写、ARCHITECTURE 活跃度口径改为「4 核心 + 2 低频 + 3 停摆」、移除路线图中未创建的 `apps/main-shell` 目标、根 `.env` 退役（其 8001-8005 端口与 `VITE_QIANKUN_MODE` 均无效，且无 app 配置 `envDir` 指向根目录，核心应用启动时不加载它）。

交付：根入口与冻结树解绑（删除/改名 `index.html`、`vite.config.js`、`vite-plugins/`，或明确标注仅供 `lint:archive` 使用）；README 端口表按实测重写（risk 5176 / hc 5175 / mkt 5177 / dex 5180 / touch 5181 / dca 5185 / semantic 8100 / backend 3001 / report-monitor 未设）；ARCHITECTURE 活跃度口径改为「4 核心 + 2 低频 + 3 停摆」；移除路线图中不存在的 `apps/main-shell` 目标。
验收信号：`grep -rn "legacy-src/main.js" index.html` 为空；README 每行端口与 `apps/*/vite.config.ts` 逐项一致；无文档再宣称 main-shell 为计划项。
回滚条件：单个 commit，revert 即可。

### P1 统一 app-registry（1–2 天 · 风险：低 · 价值最高）

交付 [target]：`packages/app-registry` 导出 `MicroAppRegistry` 类型 + `APPS: {key, basePath, devPort, deployed, owner}`；11 份 `src/registry.ts` 改为从此消费，消灭 `@/shared/registry/types` 断链；`dev-with-subapps.js`、`health-check.js`、`check-base-consistency.sh`、deploy 侧全部读同一张表。
依赖：无。是 P2/P4 的前置。
验收信号：`grep -rn "@/shared/registry/types"` 归零；`pnpm dev` 启动集合 == registry 中 `deployed:true` 集合（当前 dev 脚本漏起 mkt/dex、health-check 漏检 dca、`start-all.js` 端口 8001-8005 且 spawn 不存在的脚本应一并退役）；端口冲突表为空（当前 dfd 5185 vs dca 5185、dmt 5181 vs touch 5181）。
回滚条件：registry 包只增不改业务代码，按 app 逐个切换，任一 app 构建失败则回退该 app 的引用。

### P2 解开 dca ⇄ dfd 环（3–5 天 · 风险：高 · 必须先于任何删除动作）

交付：把 dca 消费的 dfd 侧 `pages/components/api/mock/utils/types/store/constants/composables/config/styles/router/modules` 物理迁入 dca（dca 已存在 `components-dca`、`*-dca` 命名，说明迁入是既定意图的未完成态）；随后删除 `dfd-app/vite.config.ts:43-45` 的反向 alias。
切片做法：按 alias 分组迁移，每组迁移后立刻删除对应 alias 行并跑 `pnpm --filter data-community-app build`。建议顺序：`@/components`(57 文件引用) → `@/api/*`(13) → `@/mock/*`(21) → `@/pages`+`@/dfd-pages`(路由层 13 处) → 其余。
验收信号：`grep -n "dfd-app" apps/data-community-app/vite.config.ts` 为空；`grep -rn "dfd-app" apps/data-community-app/src` 为空；dca 构建通过；dca 页面路由可直达原 dfd 页面。
回滚点：迁移前打 tag `pre-dca-dfd-uncouple`；每组 alias 一个 commit。
风险控制：`@/composables` 在 dca vite `:117` 与自身 `:48` 双重定义（后者被遮蔽），迁移时若优先级判断错误会造成静默行为漂移——迁移该组时必须逐文件核对解析结果。

### P3 质量门转向（2 天 · 风险：中 · 依赖 P1，建议在 P2 之后）

交付：`tsconfig.typecheck.json` include 从 `archive/legacy-src/**` 换为 `apps/{risk-app,data-community-app,mkt-app,horizontal-canvas}/src/**`；`vitest.config.js`/`vitest.config.ts` 的 `src/**` 改 `apps/*/src/**`（两个配置并存本身要先收敛成一个）；CODEOWNERS 增补 data-community-app 与 semantic-app、摘除 4 个归档 app；`.eslintignore` 与 P4 结果对齐。
注意：npm 脚本 `typecheck` 仍是 `echo && exit 0` 哨兵，CI 走的是 `vue-tsc -p tsconfig.typecheck.json`；改 include 后 npm 脚本与 CI 语义将重新一致，这是预期的行为变更而非回归。
验收信号：CI typecheck 步骤输出中出现核心 app 的文件路径；`vitest --run` 报告发现用例数 > 0。
预期与策略：**首轮必红**（risk-app 43 次提交 0 测试、dca 149 文件 0 测试）。按 app 分次开启，每个 app 单独 commit，避免一次性红灯导致门禁被整体关闭。

### P4 归档 app 与冗余处置（3–5 天 · 风险：分级 · 严格依赖 P2 完成）

按风险从低到高：

1. 安全（零依赖，可立即做）：本地垃圾 `dist/` 66 MB、`apps/mkt-app.zip` 7.3 MB、`apps/horizontal-canvas.zip` 22.6 MB（两者是 app 的字面副本）；15 个 33 B 空壳 `.vue`（dex/dmt/mkt）；根 `views/` 孤儿目录 2 个被跟踪文件；被跟踪的 `test-results/.last-run.json`、`playwright-report/`、`reports/diff/index.html`、`tsconfig.tsbuildinfo`；`shared/vite.config.base.ts`（全仓 0 引用）。
2. 安全：`apps/asset-app`（20 文件 / 7,139 行；无 router、无任何入向引用、84% 内容已在 dca）。
3. 需核对后安全：`apps/dmt-app`（99 文件 / 27,788 行；16 个文件与 dca 逐字节相同、0 入向引用；剩 5 个独有页面需确认，且其 `@shared` 依赖冻结树——删除 app 即解除该依赖，方向正确）。
4. 需功能核对：`apps/admin-app`（47 文件 / 12,957 行；30 个 vue 中 0 个与 dca 字节相同、14 个在 dca 无对应，属「同名不同内容」漂移，需人工比对内容/新闻/权限三块）。
5. **不可删**：`apps/dfd-app`（185 vue / 143 个在 dca 无对应），P2 未完成前删除即破坏 dca 构建。
6. 核心 app 内去重（最大单项收益）：合并 mkt-app 双树。**分叉原因已于 2026-11-05 逐行核实：不是业务分叉**——5 个差异文件共 10 行 diff，其中 1 处是目录深度导致的相对 import 层级（`../../utils/taskStorage.js` vs `../../../utils/`，目标同一文件），4 处是同一行 `Object.hasOwn(x,k)`（`pages/tasks/`）vs `x.hasOwnProperty(k)`（`pages/marketing/tasks/`）的单向现代化清洗，两棵树最后同属批量提交 `f593bd905`（2026-04-23）。语义差异 0。做法：保留 `pages/tasks/`（registry 声明入口 `mkt-tasks → /mkt/tasks`，且清洗已落在该侧），把 `router/modules/tasks.ts:15-18` 的 `marketing/tasks` 记录改为 redirect 以保 URL 兼容，删除 `pages/marketing/tasks/`（120 文件 / 54,318 行）与死文件 `pages/tasks/TasksList.vue`（0 引用）。删除前置校验已完成：全 mkt-app 内对该目录的引用只有两条路由记录本身，无相对路径依赖。
   同时修复核实中发现的真实缺陷：`marketing/tasks` 这一 path+name(`MarketingTasks`)+component 组合在 `router.ts:41-42` 被注册了两次（`tasks.ts:15-18` 与 `marketing.ts:140-143`），属重复命名路由。
7. Mock 单一来源：以 dfd/dca 现存副本为准收敛，删除 `archive/legacy-src/mock/**` 中与 app 副本字节相同的约 30 个文件；`data-map.ts`/`metadata-store.ts`/`customer360.ts`/`standard-store.ts` 四个漂移簇需人工指定权威版本（漂移意味着指标口径可能已在不同 app 间不一致，属正确性风险，不只是体积问题）。
8. 依赖清单：摘 `dayjs`+`lodash-es`（risk-app 全 0 引用）、`@arco-design/color`+`lucide-vue-next`（report-monitor）、`chokidar`+`fs-extra`（backend）、`@app/shared-api`（admin-app）。**保留** 根 `@vueup/vue-quill`——mkt-app 在用却未声明，靠 hoist 存活，属幽灵依赖需补声明而非删除。
9. 声明补齐（配合 P1）：mkt-app → `@app/shared-api`、dfd → `@app/shared-utils` 均为未声明 import；dca 对 `@data-community/semantic-contract` 用 try/catch 动态 import 回落 `[]`（`metadata-context.ts:270`），是静默降级，应改为显式依赖。

### P5 冻结树退役（独立评估 · 依赖 P4 第 3 项完成）

`archive/legacy-src/` 约 50 MB / 85 万行，比全部活跃 app 之和更大。当前仍被两处引用：`index.html`（P0 处理）、dmt-app `@shared`（P4 处理）。两条解除后可进入退役评估；在此之前任何「清理 legacy」的动作都会破坏构建。

## 5. 排序依据

P0 与 P1 可并行启动且互不依赖。P2 是唯一的高风险长任务，但它是 P4 全部删除动作和 P5 的硬前置，所以先做。P3 排在 P2 之后，因为类型检查一旦覆盖 dca 就会撞上未解开的 alias 断链。冗余处置一律排在解环之后——顺序颠倒会造成「为通过门禁而删代码」的误删。

## 6. 假设与待验证（Assumption / Open）

- A1 report-monitor 是否仍属计划内产品；其无 base、无 prod 部署且自 2026-09-09 停摆，若确认停摆则 C3 后端耦合不再需要整改。
- A2 horizontal-canvas 与 mkt-app 的 postMessage 契约：mkt 侧持续 `postMessage` init（`apps/mkt-app/src/pages/canvas/index.vue:95-107`），但 hc 侧未发现 `message` 监听器——需确认该通道是否已废弃，若废弃应连同 `src/pages/canvas/` iframe 宿主逻辑一起收口。
- A3 semantic-app 50 个文件在本分支未收口且全生命周期只有 1 次提交，属「新引入但未接入」状态；是否纳入 P1 registry 的 `deployed` 集合需产品确认。
- A4 dex-app `src/pages/exploration/`（50 文件 / 30,944 行）被生产入口 `build-router.ts` 有意排除（只发 customer360），仅 dev 路由可达——需确认它是刻意保留的展示层还是可裁剪。
- A5 dfd 死页面统计（14 个）以 dfd 本地为语料，因 dca 反向 alias 可能低估存活数，删除前需跨 app 复跑。
