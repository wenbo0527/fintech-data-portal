# DEC-01(a) 归位执行清单 · data-community-platform

> 生成：2026-11-05 · 依据：DEC-01「同一功能以 `data-community-app` 与 `mkt-app` 为准」+ 语义 **(a) 以两者为归集目标，非权威方更完整的部分须先并入再退役**
> 状态：**清单，未执行任何代码改动。** 计算脚本 `authority-coverage.mjs` / `dec01-a-plan.mjs`（会话临时目录）
> 判定方法：按**域**指定唯一权威（不用 dca∪mkt 并集，避免拿另一 app 的死副本裁决），段边界后缀匹配容忍父目录改名，md5 判同、行数判方向

## 1. 域 → 权威映射

| 域 | 权威 app | 退役方 |
|---|---|---|
| 客群 / 标签 / 事件中心（`exploration/customer-center/*`） | **mkt-app**（`pages/customer/*`） | dex-app |
| 数据探索其余（ChatBI / 统一查询 / 工作流 / 客户360） | **data-community-app** | dex-app |
| 数据发现（data-map / lineage / metrics-map / credit / asset-catalog / unified-metrics / indicator-dashboard） | **data-community-app** | dfd-app |
| 数据管理（metadata / classify / asset-management / service / user-groups / data-standard） | **data-community-app** | dmt-app |
| 资产域 | **data-community-app** | asset-app |
| 门户 / 内容 / 通知 / 权限 | **data-community-app** | admin-app |

## 2. 分类总量（696 个非权威 src 文件）

**T0 闸门已实现**（`scripts/verify-dec01-retirement.js`，`pnpm verify:dec01`），下表是它按「权威副本是否从真实入口可达」重新判定后的结果 —— 与 §2 早先只做存在性比对的差别在于：**新增了两类「权威副本其实是死副本/被 alias 遮蔽」的阻塞项**。

| 桶 | 文件 / 行 | 处置 |
|---|---|---|
| **BLOCKER_SOURCE_LIVE** 源侧在跑、权威副本不可达 | **12** / 3,757 | **禁止退役**，须先在权威侧接线或迁入（T0b） |
| **MERGE_FIRST** 权威可达但本方更完整 | **17** / 10,630 | 按 (a) 先并入再退役（T3） |
| **BOTH_DEAD** 两边都不可达 | **10** / 2,967 | 两份死副本，可作纯清理（dfd 的 5 项须再确认是否经 dca alias 被他处使用） |
| RETIREABLE 逐字节相同且权威可达 | 35 / 16,259 | 直接删（T1） |
| RETIREABLE_AUTH_LARGER 权威更完整且可达 | 91 / 41,875 | 校验后删（T2） |
| NO_COUNTERPART 权威侧无对应 | 531 / 173,449 | 不属「同一功能」，须另判（T4/T5） |

存在性比对（闸门上线前）为：直接退役 38 / 可退役 102 / 需并入 25（缺口约 4,923 行）/ 未覆盖 531。闸门把其中 **8 个「需并入」与 14 个「可退役」重新归入阻塞或双死类** —— 这正是它存在的理由：按存在性批量操作会把权威侧的空壳当成可交付实现。

## 2b. T0 抓到的 12 个阻塞项（必须最先处理）

```
dfd  mock/data-map.ts (1066)   → dca 同名仅 303 行且不可达
dfd  pages/external/index.vue (570)  → dca pages/discovery/external/index.vue (83) 不可达
dfd  pages/asset-management/index.vue (407) → dca …/listing-management/asset-management/index.vue (581) 不可达
dfd  pages/variable-dict/index.vue (318) / feature-dict/index.vue (303) / indicator-dict/index.vue (182) → dca 对应物均不可达
dfd  mock/shared/classify-constants.ts (38) → dca 同名 (34) 不可达
dfd  api 侧若干 …（--json 取全量）
dmt  mock/data-map.ts (302) / metadata-bus.ts (328) / listing-store.ts (128) → dca 对应物不可达
dex  customer-center/audience-system/index.vue (76) → mkt 同名文件存在但**未被路由**（死副本）
dex  api/dataModels.ts (39) → dca mock/api/dataModels.ts (22) 不可达
```

**两条交叉印证**（说明闸门不是误报）：

- `dca: pages/management/asset-management/listing-management/asset-management/index.vue`（581 行）被闸门判为不可达 —— 与死码扫描独立得出的「该文件是被同名扁平文件遮蔽的死页面」结论一致。
- `dca: pages/discovery/external/index.vue`（83 行）被判不可达 —— 同样与「目录形态被 `discovery/external.vue`（9,670 B）遮蔽」的独立发现一致。

**`dex: audience-system/index.vue` 是 DEC-01(a) 的第一个真实工作项**：dex 侧被路由在用，mkt 侧有同名 76 行文件却**不在 mkt 路由表里**。按 (a) 必须先把它接进 `mkt: router/modules/customer.ts` 并验证可达，才能退役 dex 那份；否则两边同时不可达。同理 `dex: …/datasource/index.vue` 属 `NO_COUNTERPART`（mkt 根本没有），迁移前不属「同一功能」。

## 2c. 闸门的一处假阳性已修正（重要）

初版闸门**不展开各 app 的 vite alias 表**，把 `@/mock-dca/data-map`（→ `src/mock/data-map.ts`，被 dca 的 23 处活页面引用）当作不存在的模块，因此把 dca 侧明明在用的副本判为「不可达」。已修复：`loadAliases()` 现解析数组式 + 对象式 alias 与 `const NAME = path.resolve(...)` 中间变量，按最长前缀优先；`--debug-aliases <app>` 可核对（dca 解析出 67 条）。

**修正后分类从「12 阻塞」变为「5 阻塞」**，且 dmt 的三个 mock 全部脱离阻塞桶：

| dmt 文件 | 修正前 | 修正后 | 权威（dca）对应物 |
|---|---|---|---|
| `mock/listing-store.ts` (127) | BLOCKER | **RETIREABLE**（逐字节相同） | `mock/listing-store.ts` 127 行，可达 |
| `mock/data-map.ts` (302) | BLOCKER | **RETIREABLE_AUTH_LARGER** | `mock/data-map.ts` 303 行，可达 |
| `mock/metadata-bus.ts` (328) | BLOCKER | **MERGE_FIRST**（差 6 行） | `mock/metadata-bus.ts` 322 行，可达 |

自检同步加了回归用例：`dmt-app/mock/listing-store.ts` 必须判为 RETIREABLE —— 若将来有人再改动解析逻辑导致 alias 失效，`--selftest` 会立刻 FAIL（退出码 2）。

剩余 5 个阻塞项**全部是 dfd 的页面**，且根因是同一件事：dca 的 `@/pages`、`@/router` 等 alias 把 specifier 指向 dfd，使 dca 本地同名副本被遮蔽而不可达（实测 `@/router` → `apps/dfd-app/src/router.ts`，`@/pages/index.vue` → `apps/dfd-app/src/pages/index.vue`）。**这 5 项不能靠零散接线解决，必须由 S5 解环统一处理** —— 它们是「以 dca 为准」尚未落地的直接证据。

其余口径同步更新：MERGE_FIRST 22 文件 / 12,318 行；BOTH_DEAD 5 / 2,237；RETIREABLE 37 / 16,588；RETIREABLE_AUTH_LARGER 95 / 42,489；NO_COUNTERPART 531 / 173,459。

分 app：

| app | 直接退役 | 可退役 | 需并入 | 未覆盖 |
|---|--:|--:|--:|--:|
| dex-app (145) | 15 / 9,432 | 38 / 22,022 | 6 / 4,894 | 86 / 22,574 |
| dfd-app (385) | 2 / 411 | 15 / 4,177 | 12 / 5,752 | 356 / 131,625（**其中真正被 dca 依赖的只有 68 文件 / 29,533 行，见 §2d**） |
| dmt-app (99) | 18 / 6,289 | 40 / 14,993 | 5 / 2,047 | 36 / 4,558 |
| admin-app (47) | 0 | 4 / 1,440 | 2 / 816 | **41 / 10,748** |
| asset-app (20) | 3 / 604 | 5 / 2,611 | 0 | 12 / 3,944 |

## 3. T3 需并入清单（25 个文件，全部列明）

> **注（闸门上线后）**：这 25 个中存在性口径的「本方更大」文件，闸门按可达性重判后为 **17 个 MERGE_FIRST + 8 个落入阻塞或双死桶**。下表仍全部保留，因为落入阻塞桶的那些（如 `dfd: pages/external/index.vue` 570 vs dca 83）不仅要并入，还要先解决「权威副本不可达」——并入目标本身是死文件。**先读 §2b 再读本节。**

按缺口行数降序。**方向 = 把「源」的缺失能力并入「权威」，再删源。**

### dex-app → 权威
| 源文件 | 源行数 | 权威文件 | 权威行数 | 缺口 |
|---|--:|---|--:|--:|
| `pages/exploration/customer-center/audience-system/audience-create.vue` | 1,216 | `mkt: pages/customer/audience-system/audience-create.vue` | 561 | **655** |
| `pages/exploration/index.vue` | 645 | `dca: pages/exploration/index.vue` | 133 | **512** |
| `mock/customer360.ts` | 1,366 | `dca: mock/customer360.ts` | 1,247 | 119 |
| `api/dataModels.ts` | 39 | `dca: mock/api/dataModels.ts` | 22 | 17 |
| `pages/customer360/components/HistorySliceQuery.vue` | 1,149 | 同名 | 1,137 | 12 |
| `pages/customer360/components/CreditReportList.vue` | 479 | 同名 | 478 | 1 |

### dfd-app → dca
| 源文件 | 源行数 | 权威文件 | 权威行数 | 缺口 |
|---|--:|---|--:|--:|
| `mock/data-map.ts` | 1,066 | `mock/data-map.ts` | 303 | **763** |
| `pages/external/index.vue` | 570 | `pages/discovery/external/index.vue` | 83 | **487** |
| `pages/favorites/index.vue` | 329 | `pages/discovery/favorites/index.vue` | 147 | 182 |
| `mock/shared/metadata-store.ts` | 1,189 | `mock/shared/metadata-store.ts` | 1,014 | 175 |
| `views/customer360/components/RepaymentDrawer.vue` | 692 | `pages/customer360/components/RepaymentDrawer.vue` | 528 | 164 |
| `mock/shared/asset-tags.ts` | 217 | `mock/shared/asset-tags.ts` | 64 | 153 |
| `pages/variable-dict/index.vue` | 318 | `pages/discovery/variable-dict/index.vue` | 180 | 138 |
| `pages/feature-dict/index.vue` | 303 | `pages/discovery/feature-dict/index.vue` | 185 | 118 |
| `api/notification.ts` | 346 | `mock/api/notification.ts` | 269 | 77 |
| `components/common/StatusTag.vue` | 18 | `components-dca/common/StatusTag.vue` | 7 | 11 |
| `views/customer360/components/DisbursementDrawer.vue` | 666 | `pages/customer360/components/DisbursementDrawer.vue` | 662 | 4 |
| `mock/shared/classify-constants.ts` | 38 | `mock/shared/classify-constants.ts` | 34 | 4 |

### dmt-app → dca
| 源文件 | 源行数 | 权威文件 | 权威行数 | 缺口 |
|---|--:|---|--:|--:|
| `pages/service/index.vue` | 1,056 | `pages/management/service/index.vue` | 474 | **582** |
| `pages/user-groups/index.vue` | 345 | `pages/management/user-groups/index.vue` | 188 | 157 |
| `mock/shared/business-concept-store.ts` | 298 | 同名 | 210 | 88 |
| `pages/data-models/index.vue` | 20 | `pages/management/data-models/index.vue` | 13 | 7 |
| `mock/metadata-bus.ts` | 328 | 同名 | 322 | 6 |

### admin-app → dca
| 源文件 | 源行数 | 权威文件 | 权威行数 | 缺口 |
|---|--:|---|--:|--:|
| `pages/notifications/index.vue` | 795 | `pages/management/notifications/index.vue` | 318 | **477** |
| `components/common/StatusTag.vue` | 21 | `components-dca/common/StatusTag.vue` | 7 | 14 |

> 缺口 <20 行的 9 个文件多半是格式化或单行差异，可先 `diff` 定性再决定是否算「需并入」。

## 4. ⚠ 两条必须先解决的存活校验（否则会静默丢功能）

实测「dex 侧被路由、mkt 侧同名文件未被路由」只有 2 例，但两者都必须先处理再谈退役：

| 文件 | 状况 | 处置 |
|---|---|---|
| `dex: pages/exploration/customer-center/audience-system/index.vue` | dex 路由在用（`dex/src/router.ts`），mkt 有同名 76 行文件但 **mkt 路由表里没有** → mkt 那份是死副本 | **先把它并入 10 个「双边都路由」的收敛组**：在 mkt `router/modules/customer.ts` 补路由并验证可达，才能退役 dex 侧 |
| `dex: pages/exploration/customer-center/datasource/index.vue` | dex 在用，**mkt 完全没有对应物** | 不属「同一功能」，DEC-01 不适用；须先迁入 mkt（或明确放弃） |

推广为通用闸门：**对 T2/T3 的每个退役文件，必须断言「权威侧对应文件存在且被路由或被静态引用」**。这条断言目前 CI 里没有，建议作为本清单的第一个可实现产物（一个 `verify` 脚本），先建闸门再批量退役，避免把「权威」的空壳当成可交付实现。

## 4b. T0b 执行日志

**2026-11-05 · 阻塞项 12 → 11**

`dex: pages/exploration/customer-center/audience-system/index.vue`（76 行，权威副本 = `mkt: pages/customer/audience-system/index.vue`）

查证结论（与闸门给出的「权威不可达」不同方向，实际无需给权威接线）：

- 两份副本只差 **1 行**（URL 前缀），**没有功能内容需要并入**；
- mkt 侧 `marketing.ts:165-170` 把该路径注册为**纯 redirect → AudienceManagement**，是刻意选择，不需要卡片页；
- dex 侧原页面**本身是坏的**：`v-if="$route.name === 'audience-system'"` 与路由 name `'AudienceSystem'` 大小写不匹配 → 卡片块从不渲染，整页空白；且卡片按钮与另外三处活引用（`customer-center/index.vue:17`、`audience-create.vue:9`、`audience-detail.vue:1494` 按 name 跳转）全部指向 **dex 里不存在路由的 `audience-management`**（文件存在 478 行，却漏注册）。

已执行（对齐 mkt 的权威行为，并顺手修掉三处落空引用）：

| 改动 | 内容 |
|---|---|
| `dex/src/router.ts:47-62` | `AudienceSystem` 记录由 `component: index.vue` 改为 `redirect: { name: 'AudienceManagement' }`；新增 `AudienceManagement` 记录指向已存在但从未被路由的 `audience-management.vue` |
| 删除 | `dex/src/pages/exploration/customer-center/audience-system/index.vue`（空白卡片页副本退役） |

验证：`pnpm --filter dex-app build` = **exit 0 / 4,545 模块 / 8.02s**；dev server 运行期探针 —— `router.ts` 编译产物含 `redirect: { name: "AudienceManagement" }` 与 `AudienceManagement` 记录，`audience-management.vue` 返回 200 `text/javascript`，已删的 `index.vue` 回落 200 `text/html`（SPA 兜底，证明文件确实不在磁盘）；`pnpm exec eslint` 对该文件的 2 条问题（`no-duplicate-imports` 1 error + `no-console` 1 warning）**在 HEAD 版本同样存在**，非本次引入。

遗留：`mkt: pages/customer/audience-system/index.vue`（76 行）现在两边都不可达 → 归入 S6 的 mkt 内部死码清理，不在本闸门管辖范围（闸门只审计非权威 app）。

**第二项（原计划：dmt 的三个 mock）实际结论：不需要 T0b 工作 —— 它们是闸门假阳性**，详见 §2c。dca 侧对应物经 `@/mock-dca/*` 被 23 处活页面引用，初版闸门不认识该 alias 才误判「权威不可达」。修正后三项分别落入 RETIREABLE / AUTH_LARGER / MERGE_FIRST，归 T1/T2/T3（其中 `metadata-bus` 差 6 行需先并入）。

## 4c. 待办重排（据 §2c 修正）

| 原以为 | 现在 |
|---|---|
| T0b 需清 12 项 | 实为 **5 项，且全部是 dfd 页面**，根因同一个 |
| dmt 三个 mock 属阻塞 | 降级为常规 T1/T2/T3 项 |
| 阻塞多 = 权威侧缺接线 | 真因是 **dca 的 alias 把 `@/pages`、`@/router` 等指向 dfd**，接线不解决，只有 S5 迁入才解决 |

剩余 5 个阻塞项：`dfd pages/external/index.vue` 570、`dfd pages/asset-management/index.vue` 407、`dfd pages/variable-dict/index.vue` 318、`dfd pages/feature-dict/index.vue` 303、`dfd pages/indicator-dict/index.vue` 182 —— 全部并入 S5。

## 5. 切片与顺序

| 切片 | 内容 | 依赖 | 验证信号 | 回滚 |
|---|---|---|---|---|
| **T0 建闸门** ✅ **已完成 2026-11-05** | `scripts/verify-dec01-retirement.js` + `pnpm verify:dec01` / `pnpm verify:dec01:selftest`。断言：待退役文件 X 的权威对应 Y 必须从权威应用真实入口可达（`index.html` script src + `src/main.*` 起 BFS；**不把 registry.ts 当根**，因其运行期无人消费——正是 risk-app 陪跑踩过的坑） | 无 | `--selftest` 3/3 PASS（两个已知反例被抓到、逐字节相同副本不误报） | 新脚本 + package.json 两行；删除即回滚 |
| **T0b 解阻塞** | §2b 的 12 个 BLOCKER_SOURCE_LIVE：先在权威侧接线（补路由/改引用）或先迁入再退役 | T0 | `pnpm verify:dec01` 退出码由 1 转 0 | 逐项 commit |
| **T1 直接退役** | 38 个逐字节相同文件（dmt 18 / dex 15 / asset 3 / dfd 2） | T0 通过 | `pnpm --filter data-community-app build`（基线 exit 0 / 5,373 模块）与 `pnpm --filter mkt-app build`；受影响 app 的页面 smoke | 按 app 分 commit |
| **T2 校验后退役** | 102 个「权威更完整」文件 | T0 | T0 全绿 + 两个权威 app 构建通过 | 按域分 commit |
| **T3 并入后退役** | §3 的 25 个文件，缺口约 4,923 行 | T0；**dfd 的 12 个还依赖 S5 解环** | 逐文件：并集功能可用 + 权威 app 构建通过 + 人工点验 | 每文件一 commit，可逐个 revert |
| **T4 dfd 迁入** | **68 文件 / 29,533 行**（入口 25 文件 9,768 行 + 2-3 跳展开），不是 dfd 全量 131,625 行 —— 按 alias 闭包重算，见 §2d | cleanup-plan §7 的 S5 | dca 的 vite/src 中 `dfd-app` 字样为空；dca 构建通过；13 处 `import('@/dfd-pages/*')` 全部改为 dca 本地路径 | 按 alias 组分批（`@/components` → `@/api/*` → `@/mock/*` → `@/pages`） |
| **T5 另判未覆盖** | admin 41 文件 / 10,748 行、dex 86 / 22,574、dmt 36 / 4,558、asset 12 / 3,944 | 产品决定 | 每项标为「迁入 dca」或「确认放弃」 | — |
| **T6 app 退役** | dex/dfd/dmt/asset/admin 的目录摘除 + `pnpm-workspace.yaml` 与 registry 同步 | T1–T5 全部完成 | 全库构建矩阵通过；`check-base-consistency.sh` 通过 | 保留 tag，逐 app 删 |

**关键顺序约束**：T4 必须先于任何 dfd 删除动作 —— dca 通过 vite alias 直接引用 dfd 源码（实测运行期解析到 `@fs/…/apps/dfd-app/src/pages/…`），所以「以 dca 为准」对 dfd 只能通过迁入实现，删除等于删 dca 自己的页面。

## 6. 与其他文档的关系

- 本清单不改变 cleanup-plan 的 §2.1 仓库卫生层与 §6 的 D1–D7 必修项（D1 包解析、D5 质量门仍是前置）。
- DEC-01(a) 使 cleanup-plan §7 的 **S5 由「高风险可选优化」变为「法定前置」**，并让 S6（app 内死码）与 T4 合并为同一条迁移线。
- risk-app 陪跑计划（D4）不受 DEC-01 管辖：该功能不在 dca/mkt 的任何一侧，权威是 risk-app，冻结树那份仍是承重代码。

## 7. 仍需你输入的三项

1. **T5 的 220 个文件**（admin 41 / dex 86 / dmt 36 / asset 12 等，合计 531 文件 / 173,449 行）逐项「迁入 vs 放弃」，其中 admin 的门户/内容/通知/权限与 dmt 的 `data-standard`（dca 侧只有空目录 `pages/management/data-standard/{words,audit}`）是最大两块。
2. **T3 中 4 个大缺口文件**（`audience-create` 655、`mock/data-map` 763、`pages/service/index` 582、`pages/external/index` 487）是否确认按 (a) 并入 —— 这几处是真正的功能取舍，合并后可能出现两套交互逻辑需要统一。
3. **T0 闸门脚本是否要我现在实现**（新增一个 `scripts/verify-*.js`，不改任何现有代码）。

产物：本文件 [dec01-migration-checklist-2026-11.md](file:///Users/mac/nis_mock/data_comunity/data_comunity/docs/architecture/dec01-migration-checklist-2026-11.md) · 上位文档 [cleanup-plan-2026-11.md](file:///Users/mac/nis_mock/data_comunity/data_comunity/docs/architecture/cleanup-plan-2026-11.md)

## 2d. dca 的 alias 遮蔽面实测（2026-11-05）

dca 的 vite alias 有 **67 条**，其中指向 `apps/dfd-app/src` 的一族会**遮蔽 dca 自己的同名目录**。按引用点实测：

| alias | 指向 | dca 内引用点 | 判定 |
|---|---|--:|---|
| `@/router` | dfd/router | **0** | **死 alias**。地雷：一旦有人写 `import router from '@/router'`，拿到的是 dfd 的 `createRouter` 实例（不是 dca 挂载的那个），导航会静默失效 |
| `@/constants`、`@/styles`、`@/modules` | dfd | **0** | 死 alias，可直接删 |
| `@/composables` | **重复声明两次**：`:48` → dca 自身、`:117` → dfd | 18（走 :48） | `:117` 是不可达配置，删 |
| `@/pages` | dfd/pages | 11 | 11 处全部是**同一个组件** `dfd:pages/search/MissingTicketModal.vue`(338 行) |
| `@/types`、`@/utils`、`@/config` | dfd | 7 / 16 / 1 | 活跃耦合 |
| `@/stores`、`@/store` | dfd | 见注 | dca 自身只有 `stores-dca`（38 点里绝大多数是 `@/stores-dca/*`，属本地） |
| `@/mock`、`@/api`、`@/components` | 混：通用条目指自身，21/13/1 条精确条目指 dfd | — | 遮蔽主要来自精确条目 |

**跨 app 载荷重算**（dca 的 `@/` 引用共 385 点）：341 点解析到 dca 自身，**44 点跨到 dfd/shared-utils**，落在 **25 个入口文件 / 9,768 行**；沿 dfd 内部 import 做传递闭包（0 跳 20、1 跳 18、2 跳 13、3 跳 13、4 跳 4 文件）收敛为 **68 文件 / 29,533 行**。

结论修正：S5 的实际工作量是「迁入 68 个文件」，而非「搬空 dfd 的 385 个文件」。dfd 其余 ~288 文件只被它自己的入口引用，而那个入口无人运行 —— 它们是 T5「另判」里的主体，不是解环成本。

闭包内最大的几个文件（迁入时的主要风险点）：`dfd:components/BusinessProcessFlow.vue` 2,220 行、`dfd:pages/metrics-map/detail.vue` 1,313、`dfd:components/business-process/BusinessProcessDrawer.vue` 1,300、`dfd:pages/unified-metrics/index.vue` 1,223、`dfd:mock/shared/metadata-store.ts` 1,188、`dfd:utils/request.js` 872。

## 2e. (a) 的失败与教训：alias 不能先于文件删除

按「dca 自身 src 内零引用」判定 `@/router`、`@/constants`、`@/styles`、`@/modules` 为死 alias 并删除 —— **dca 构建立即失败**（`error during build: [vite:css] ENOENT …/src/styles/enhanced-toolbar-styles.css`，引用方是 `dfd:pages/lineage/components/LineageGraph.vue` 的 CSS `@import`）。

根因：dca 编译 dfd 源文件时，**那些文件里的 `@/…` 也用 dca 的 alias 表解析**。实测四条全部在用：

| alias | 真实引用方（在 dca 编译的 dfd 源里） |
|---|---|
| `@/styles` | `dfd:pages/lineage/components/LineageGraph.vue`（CSS `@import`，891 行样式表） |
| `@/constants` | `dfd:components/common/StatusTag.vue`、`dfd:components/community/NotificationDetailContent.vue` |
| `@/router` | `dfd:pages/credit/detail.vue`、`dfd:pages/data-map/TableDetailPage.vue`、`CollectionDetail.vue`、`external/detail.vue` |
| `@/modules` | `dfd:store/modules/contract.ts`、`dfd:store/modules/external-data.ts` |

已恢复四条，**只有 `:117` 那条与 `@/composables` 重复的声明确实可删**（`:48` 在前，同前缀永不命中，Vite 数组式按序首命中）。恢复后构建回到基线：exit 0 / 5,373 模块。

方法论修正：判定 alias 是否可删，引用面必须是「dca 自身 src + dca 所编译的全部 target 源文件」，且**要包含 CSS `@import`/`@use` 边**（原闭包只跟 JS import，已补）。alias 的删除只能发生在文件迁移完成之后，顺序不可颠倒。

## 2f. (c) T4 首批执行记录

`--closure data-community-app` 现可直接产出 manifest（`--json`），并新增 `--debug-aliases`。跨 app 依赖实测：**mkt-app 闭包为 0**（完全自持），耦合只在 dca→dfd：**66 文件 / 29,888 行**（入口 22 → 现 21 个 d0 文件 / 9,414 行）+ shared-utils 1 文件。

**批次 1（已完成）**：叶子组件 `dfd:pages/search/MissingTicketModal.vue`（338 行，只依赖 vue + arco，被 dca 11 处直接引用）

- 复制到 `apps/data-community-app/src/components-dca/common/MissingTicketModal.vue`
- dca 内 11 处 import 改指 `@/components-dca/common/MissingTicketModal.vue`（该 alias 在 `:40`，先于 `:55` 的 `@/components`，前缀不被抢，**零 vite 配置变更**）
- 验证：dca 构建 exit 0 / **5,376 模块**（基线 5,373）；`@/pages/search/MissingTicketModal` 残留 0；d0 入口 22 → 21

诚实记录：闭包总数暂仍为 66 —— dfd 那份组件仍被 `dfd:pages/metrics-map/index.vue`（本身是 dca 的 d0 入口）引用，故它以 d1 深度留在闭包内，要等 metrics-map 批次迁移后才真正脱离。这正是分批迁移应有的形态：**先摘掉直接引用，文件随最后一个引用方离开。**

后续批次规模（按 d0 行数降序）：`pages/metrics-map/detail.vue` 1,314、`pages/unified-metrics/index.vue` 1,224、`pages/feature-map/index.vue` 704、`api/community.ts` 627、`pages/metrics-map/index.vue` 552、`pages/credit/index.vue` 545、`pages/lineage/components/LineageGraph.vue` 543（连带 891 行 CSS）、`mock/metrics.ts` 543 …；闭包里最大的单个拉入项是 `dfd:components/BusinessProcessFlow.vue` 2,221 行。

**闭包算不到的一类耦合**：localStorage 键共享。dca 与 dfd 的 store 都写 localStorage（如 `table-catalog-store`），跨 app 的数据依赖不表现为 import 边，迁入后需按 key 做一次数据流核对。

## 2g. 阴影死副本清理（2026-11-06）· 阻塞项归零

dca 的 `pages/discovery/{external,variable-dict,feature-dict,indicator-dict}/index.vue` 四份目录形态副本已删除。删除前逐项确认：目录内只有 `index.vue`；router 指向的是**扁平文件** `discovery/<x>.vue`；全库唯一引用是 `tests/components/all-pages-render.spec.ts`（该测试的 `@` 别名本就无法解析），已改为引用扁平文件以保留原意。

**这一步让 BLOCKER_SOURCE_LIVE 由 4 降为 0** —— T0b 目标达成。同时暴露了闸门的一处路径匹配局限：

- 这 4 个 dfd 页面在 dca 的权威实现是**扁平文件**（`pages/discovery/<x>.vue`），而闸门按「段边界后缀」匹配不到目录↔扁平的对应关系，故删除死副本后它们被判为 `NO_COUNTERPART` 而非「有权威实现」。这是**保守方向**的误判（会要求另判，不会误删），已在自检输出中说明。
- 自检样本同步更新为 4 条：`RETIREABLE`（alias 回归）、`MERGE_FIRST`（并入语义）、`NO_COUNTERPART`（阴影形态诚实性）、以及一条反向用例。因当前全库阻塞项为 0，`BLOCKER_SOURCE_LIVE` 分支**无现成正例**，脚本已在输出中显式提示：一旦重新出现阻塞项，必须把它加回 `EXPECTED`，否则该分支相当于未覆盖。

当前分类：BLOCKER 0 / MERGE_FIRST 25 文件 15,642 行 / BOTH_DEAD 7 / RETIREABLE 53 / AUTH_LARGER 109 / NO_COUNTERPART 501 文件 158,890 行。
