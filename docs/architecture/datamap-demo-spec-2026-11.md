# 数据地图新版 Demo · 按实际项目改写后的施工规格（2026-11-23）

> 本文件是外部 SPEC《数据地图 Demo 实施规格》的**本地化改写版**。原 SPEC 不假设项目形态，
> 本版把每一条都落到 `apps/data-community-app`（下称 dca）的既有实现上。
> **总原则：零新增 npm 依赖、零新增 mock 数据、不改任何既有组件；只新写必要的薄壳。**
> 原 SPEC 的宪法层 C-1…C-7 全部保留，下文逐条给出本仓库的落点与冲突处置。

---

## 0. 相对原 SPEC 的 12 处替换（先看这张表）

| # | 原 SPEC 要求 | 本仓库实际 | 改写后 |
|:--|:--|:--|:--|
| 1 | 分支判断（A 原地 / B 补依赖 / C 独立子应用） | Vue3+Vite+Arco+X6 **全部已在用** | **分支 A**，且连 B 的补依赖都不需要 |
| 2 | 新增 `@antv/x6@2.x` + `@antv/layout` | 已装 **X6 1.35.1**、`x6-vue-shape 3.0.2`、`@dagrejs/dagre 1.1.8`（根 node_modules） | **不装任何包**；布局照抄 `LineageGraph` 的 dagre 手算，不用 `@antv/layout` |
| 3 | 目录 `src/views/datamap-demo/` | dca 约定是 `src/pages/` | `src/pages/datamap-demo/` |
| 4 | 主题变量 `--primary-6` | dca 用 `--dca-*`（45 个），`--dca-brand-primary: #165dff` 与 SPEC 同值 | 直接用 `--dca-*`，不引入第二套变量 |
| 5 | 4 个 JSON：`entities/relations/tables/fields` | 两个 store 已含全部真实数据 | **不建 JSON**，改 1 个派生模块 `data/derive.ts` 读既有 store |
| 6 | 8 实体 `E_CUSTOMER…E_OVERDUE`（含借据/逾期表现） | `business-concept-store` 已有 **8 实体 ENT001–ENT008**（客户/账户/授信申请/授信合同/支用申请/支用单/还款计划/贷后记录） | 用 `ENT00x` 作 `entity_id`；**「借据」在权威表目录中无对应表**，见 §3.4 缺口处置 |
| 7 | 9 条二元关系需自行编写 | `BusinessRelation` 已是**带类型的二元边**，实测 **8 条**（REL001–REL008，7 种 type + cardinality） | 直接派生这 8 条，不新编；与 SPEC 建议的 9 条差 1，见 §3.6 |
| 8 | `TableCard.vue` 新写 | `components-dca/common/AssetCard.vue`（349 行）props 完全覆盖，`themeColor` 恰好支持 `green/arcoblue/gray` | **直接用 AssetCard**，不新写卡片 |
| 9 | `EntityCard.vue`（X6 Vue 节点） | `LineageNode.vue` 是血缘专用（上下游标签/展开按钮/跳转），改它违反 C-5 | 用 **X6 内置 `rect` + attrs**（照 `customer360/RelationshipGraph.vue:305` 写法），**不注册 Vue 节点、不新写组件** |
| 10 | `RelationGraph.vue` 新写 | 已有 3 个 X6 图组件可抄骨架 | 新写 **~120 行薄容器**，只读配置抄 `LineageGraph`，节点构造抄 `RelationshipGraph` |
| 11 | `OldExperience.vue` 复刻「说明留空」痛点页 | 现有 `pages/discovery/search/index.vue`（1,305 行）已是真实搜索页，45 张表都有说明 | **不复制痛点页**，改为「对照说明 + 直达现有搜索页」，避免演示失真（见 §7 待定 B） |
| 12 | 3 页用路由串联 | dca 路由在 `router/index.ts`，且 `data-map-table` 被 **23 处深链**调用 | **只加 1 条路由**，3 段用页内条件渲染；不动菜单、不动那 23 处 |

---

## 1. 勘察结果（原 SPEC 第 1 章，逐项实测）

| 项 | 结果 | 证据 |
|:--|:--|:--|
| 目标应用 | dca（数据地图现居地） | `router/index.ts:70` `discovery/data-map/table/:tableName` |
| 框架 | Vue 3.4 + Vite 5 + TS | `apps/data-community-app/package.json` |
| Arco | `^2.55.0`，**完整引入** | `src/main.ts:13` `app.use(ArcoVue)` + `:14` 图标 |
| X6 | **1.35.1**（1.x，不是 2.x） | 根 `node_modules/@antv/x6/package.json` |
| X6 既有用法 | 3 处：血缘图 540 行、客户360 关系图 678 行、业务概念关系图 458 行 | `pages/lineage/components/LineageGraph.vue`、`pages/customer360/components/RelationshipGraph.vue`、`pages/management/business-concept/BusinessRelationGraph.vue` |
| 布局 | `@dagrejs/dagre` 1.1.8，手算坐标 + `fromJSON` | `LineageGraph.vue:327-345`、`:419` |
| 只读配置先例 | `interacting: { nodeMovable:false, edgeMovable:false }` | `LineageGraph.vue:397` |
| 状态 | Pinia 2.1 已装（C-1 例外允许复用；Demo 用 `ref` 即可） | `main.ts:12` |
| 路由 | 单文件 `src/router/index.ts`；`discovery/data-map-v2` 未被占用 | 现有 discovery 子路由 20+ 条 |
| 目录/别名 | `src/pages/`、`src/mock/`、`@/…`、`@/mock-dca`、`@mock-shared` | `vite.config.ts` alias 表 |
| 主题 | `--dca-brand-primary: #165dff` | `src/styles-dca/tokens.css:39` |
| 包管理 | pnpm 9.15.4，`.npmrc` 有 `shamefully-hoist=true` | 根 |
| 真实数据 | **有**：45 张表 + 8 实体 + 类型化关系 | 见 §3 |

**判定：分支 A（原地集成），零新增依赖。**

---

## 2. 复用清单（全部已存在，逐项给出处）

| 需求 | 复用件 | 位置 | 说明 |
|:--|:--|:--|:--|
| 推荐表卡片（三色） | `AssetCard.vue` | `components-dca/common/AssetCard.vue`（349 行） | props：`title / type / typeColor / description / metaLines / tags / themeColor / count`；`themeColor` 支持 `green / arcoblue / gray` = SPEC 三色；`emit('click')` 已有 |
| 页面骨架 | `PageContainer.vue`(40) / `PageBanner.vue`(195) / `PageHeader.vue` | `components-dca/common/` | 不新写布局壳 |
| 状态/分层标签 | `StatusTag.vue`(17) 或 AssetCard 自带 `a-tag` | `components-dca/common/StatusTag.vue` | 需要字典色时传 `dictKey` |
| 图容器只读配置 | `LineageGraph.vue:390-400` | 同左 | `connecting` 全关 + `selecting:false` + `interacting` 两键；本版按 C-2 补齐 7 键 |
| dagre 布局 | `LineageGraph.vue:327-345` | 同左 | `new dagre.graphlib.Graph()` → `dagre.layout(g)` → 坐标写回 → `fromJSON` |
| 节点构造（免 Vue 节点） | `RelationshipGraph.vue:305-345` | `pages/customer360/components/` | 内置 `shape:'circle'/'rect'` + `attrs.label`，`node.getData()` 取业务数据 |
| 节点点击 → 抽屉 | `LineageGraph.vue:403-410` | 同左 | `graph.on('node:click')` → `drawerVisible=true`；含「点展开按钮不触发抽屉」的 `closest()` 防抖写法 |
| 生命周期销毁 | `LineageGraph.vue:357 / :444` | 同左 | `graph.dispose()` |
| 大数字对照 | `a-statistic` | 已在 6 个页面使用（`pages/metrics-center/dashboard.vue` 等） | Arco 完整引入，直接用 |
| 表/字段口径派生 | `derivePublicInfo(t)` / `deriveFieldDetail(t, field)` | `mock/shared/table-catalog-store.ts:180 / :243` | 现成函数，含 PII 判定与四级目录，不重写 |
| 统计数字 | `TableCatalogStore.stats()` | 同文件 `:729` | `total / online / avgQuality / byLayer / declaredTotal(752)` |

**明确不复用（附理由，避免后人误合）**

- `customer360/RelationshipGraph.vue` **不能直接 import**：它的 `interacting: { nodeMovable: true }`（`:262`）允许拖动节点，违反 C-2 只读铁律；改它又违反 C-5。→ 只抄它的节点构造写法。
- `LineageNode.vue`（370 行）不作实体卡片：含上下游标签、左右展开按钮、点击跳表详情，语义是血缘不是业务实体；改它违反 C-5。
- `BusinessRelationGraph.vue`（458 行）是**可编辑**的业务概念建模页（无 `interacting` 限制、带新增关系表单），与 Demo 的只读定位相反。

---

## 3. 数据派生（零新增 mock，对应原 SPEC 第 2 章）

唯一新增文件：`src/pages/datamap-demo/data/derive.ts`（预计 ~90 行），**只读不写**两个既有 store。

### 3.1 entities ← `BusinessConceptStore`
`mock/shared/business-concept-store.ts` 的 8 个实体：
`ENT001 客户 / ENT002 账户 / ENT003 授信申请 / ENT004 授信合同 / ENT005 支用申请 / ENT006 支用单 / ENT007 还款计划 / ENT008 贷后记录`。
映射：`entity_id = code`、`entity_name = name`、`description = description`、`domain` 由 `domainCode`（DOM003 授信域 / DOM004 支用域 / DOM005 还款域）映射到 SPEC 的 `risk|market|common`。
`entity_type`：仓库无此字段 → 按 `name` 含「申请/记录/计划」判 `event`，其余 `entity`（规则写进代码注释，可审计）。

### 3.2 relations ← `BusinessRelation[]`
已是严格二元 + 类型：`{ code, name, sourceEntityCode, targetEntityCode, type, description, cardinality }`，
type 枚举 7 值（association/behavior/derivative/dependency/trigger/config/check）。
映射到 SPEC 4 值：`derivative|trigger → sequence`、`association|config → associate`、`dependency → contain`、`behavior|check → flow`。
**不新编边**；`label = name`（如「生成」「发起」），`description` 原样。

实测 **8 条**，已串成完整一条链：
`REL001 客户→账户(拥有)`、`REL002 客户→授信申请(发起)`、`REL003 授信申请→授信合同(生成)`、
`REL004 客户→支用申请(发起)`、`REL005 授信合同→支用申请(支持)`、`REL006 支用申请→支用单(生成)`、
`REL007 支用单→还款计划(生成)`、`REL008 还款计划→贷后记录(被监控)`。

### 3.3 tables ← `TableCatalogStore.all()`（45 张）
实测分层：**ODS 15 / DWD 10 / DWS 8 / ADS 8 / DIM 4**；DWS 中 online **6** 张，DWD 中 online **7** 张。

三档标签映射（SPEC 3 档 → 仓库 5 层）：

| SPEC 档 | 规则（可审计） | 实测张数 | 颜色 |
|:--|:--|:--|:--|
| 推荐表 | `layer==='DWS' && status==='online'` | **6** | `green` |
| 明细兜底 | `layer==='DWD' && status==='online'` | **7** | `arcoblue` |
| 技术维护（默认折叠） | `ODS / ADS / DIM`，以及非 online 的 DWS/DWD | 其余 | `gray` |

- `is_recommended` = 上表第一行规则，**不手填**。
- `recommend_reason` = **取既有 `description`**（45 张全有）。注意：`businessCaliber / usageGuide` 只有 **2 张**表填了，不能当通用理由源。
- `owner / field_count / last_updated` ← `owner / fields.length / onTime`，全部现成。
- `table_layer` 保留仓库 5 层原值，另给 `tier` 字段表达三档，**不改既有枚举**。

### 3.4 fields ← `LogicalTable.fields`
`CatalogField` 已含 `[名, 类型, 中文, 敏感度]`；字段详情直接用 `deriveFieldDetail()`（含 PII 判定、四级业务目录），不重写。

### 3.5 表 ↔ 实体归属（**部分已有，其余派生**）
更正：仓库**已有**一条「实体 → 数据要素 → 物理表」的关联链 ——
`BusinessConceptStore.getEntityRelatedTables()` 与 `DataElement.relatedResource.table`
（`business-concept-store.ts:187`），实测覆盖 **4 张表**（dwd_credit_apply / dwd_credit_contract /
dws_credit_analysis / dws_repayment_plan）。`derive.ts` **优先用它**，不重写。

其余表按 `cnName / tags / domain` 的关键词规则归类（实测 **20 张**），规则集中在 `derive.ts` 顶部：

```
cnName 含「授信申请/申请增量」 → ENT003     cnName 含「授信合同/合同」 → ENT004
cnName 含「支用申请」          → ENT005     cnName 含「提款/支用/放款/贷款余额」 → ENT006
cnName 含「还款/催回」         → ENT007     cnName 含「贷后/逾期/催收」 → ENT008
cnName 含「账户」              → ENT002     cnName 含「客户/用户」→ ENT001（风控域除外）
兜底：cnName 含「授信」→ ENT004；tags 含 授信/放款/余额/还款/催回/逾期/贷后/客户/账务 → 对应实体
```

「风控域除外」是实测加的：`dws_risk_score`（用户风险评分汇总表）若按「用户」归到客户实体是错的。
命中不了的 **21 张标 `entityId: null`（未归类）**，不硬塞、不编表名（C-3）。
每张表的卡片 meta 会标注归属来源（`要素关联` / `按名称/标签归类`），不假装精确映射。

### 3.6 必须如实告知的三个缺口
1. **「借据」无表**：权威目录 45 张里没有借据明细表（`dwd_loan_detail / dwd_loan_daily` 只出现在 `mock/unified-query/database.ts` 与 `components-dca/unified-query/DetailDrawer.vue` 的库树里，不在 catalog）。`dws_loan_bal_daily`（贷款余额日汇总）是 **offline**。→ 用仓库实体 **ENT006 支用单** 承担该环，或在该实体抽屉里显示「暂无在册表」。**不得为凑数新增表名。**
2. **核心实体凑不到 SPEC 要求的「各 3–5 张推荐表」**：严格 `DWS+online+heat≥80` 只有 **3 张**（`dws_risk_score` 95、`dws_metric_credit_rt` 88、`dws_repayment_plan` 82）。放宽到 `DWS+online` 是 6 张，仍不够 3 个核心实体各 3–5 张。→ 建议把 SPEC 的分布要求改为「**每实体至少 1 张推荐或 DWD 兜底；核心实体展示全部在册表并标注档位**」，而不是编表。
3. **关系是 8 条不是 9 条**：SPEC 建议 9 条边，仓库 `BusinessRelation` 实测 8 条（§3.2 已列全）。这 8 条已覆盖客户→授信→支用→还款→贷后整链，缺的是 SPEC 里的「授信→客户」「借据→协议」两条反向/旁支。→ **用 8 条**，不新编；若演示需要第 9 条，须由你指定业务含义后再加。

### 3.7 层次：视角（已实现）与产品（无数据，留接口）

**视角**：按「叠加高亮 + 抽屉分组」实现，不是互斥分区。四类由既有字段派生（`derive.ts` 的 `viewHit`）：

| 视角 | 规则（全部来自既有字段） | 实测命中 |
|:--|:--|:--|
| 业务 | `domain === '交易域'` | 12 张 |
| 风险 | `domain === '风控域'` 或 tags 含 反欺诈/预警/风控 | 12 张 |
| 市场 | `domain === '营销域'` 或 tags 含 营销/埋点/点击 | 6 张 |
| 技术 | `layer === 'ODS'` 或 tags 含 贴源/实时/Kafka/HBase/Doris | 20 张 |

同一张表可命中多个视角（`dwd_fraud_alert` 属风控域又是贴源表）。**为什么不互斥**：只按 风险/市场/技术 三分，45 张里 **17 张一个都不命中**，其中包含 `dwd_credit_apply / dwd_credit_contract / dws_repayment_plan` 等授信支用链主角 —— 互斥过滤会让图空掉，故选「叠加高亮 + 补业务视角」，节点第二行显示 `本视角 N/M 张`，未命中的淡化 0.28 但不隐藏，抽屉里未命中表收进「其他视角」折叠。

**产品**：仓库**没有**表→产品数据 —— 45 张表 0 条；仅 5 个数据要素标了 `relatedProduct`（4 条「所有产品」+ 1 条「产品A/C」）。故不实现产品维度、不编产品名，只在 `derive.ts` 留 `PRODUCT_MAPPING = {}` 与 `productOf()` 接口；拿到「表→产品」清单后填表即可，UI 无需改动。

**筛选（第五轮补）**：顶部「标签」「产品」两个多选，语义为 **产品之间 OR、标签之间 OR、两类之间 AND**，与视角叠加；命中 0 的节点淡化 0.28 不隐藏，节点第二行写 `筛后 3/6`；抽屉按条件分组，未命中表进折叠区。

- 标签选项取自 45 张表真实 `tags`（65 个，带计数），零新增数据。
- 产品走两条路，取并集，UI 不用改：① `PRODUCT_MAPPING` 填「表 → 产品」；② 给表打 `产品:字节` 形式 tag。
  当前两处为空 → 下拉显示「产品（待接入）」并禁用；**不使用 字节/蚂蚁/京东 等名字虚构归属**。
  已用单测验证 tag 路径：`productOf({ tags: ['产品:字节','产品:蚂蚁'] })` → `['字节','蚂蚁']`。

---

## 4. 目录、路由与隔离（C-5 落点）

```
apps/data-community-app/src/pages/datamap-demo/
├── index.vue                 # 薄壳：a-tabs / 条件渲染切 3 段（~60 行）
├── GraphView.vue             # 图 + 抽屉 + 面包屑（~180 行，抽屉内容用 AssetCard）
├── CompareResult.vue         # a-statistic 左右对照（~70 行，数字来自 stats() + 实测变量）
├── OldExperience.vue         # 对照说明 + 直达现有搜索页（~40 行，不复制 1,305 行）
├── components/RelationGraph.vue  # ~120 行薄容器（只读 + dagre + 内置 rect 节点）
├── data/derive.ts            # ~90 行派生（只读两个 store）
└── README.md                 # 《本地集成说明》：入口、启动、如何换真实数据
```

- **新增代码合计约 560 行，全部在新目录**；既有文件只动 **1 处**：`router/index.ts` 加 1 条记录
  `path: 'discovery/data-map-v2', name: 'data-map-v2'`（`data-map` 这个 name 未被占用，无冲突）。
- **不动**：`MainLayout` 菜单、`roles.ts` / `SHORTCUT_REGISTRY` / `useCrossNav` 等派生注册表、
  23 处 `data-map-table` 深链、任何既有组件、`.env`、vite 配置、全局样式变量。
- 入口方式：URL 直达 `/data-community/discovery/data-map-v2`；新旧互链用页内 `router-link`
  （新版页里放「看现状搜索页」，旧版**不加**任何指向新版的链接 → 旧版零改动）。
- 若要在菜单里露出新版，那是改 `MainLayout`（公共组件），**超出 C-5，需单独批准**。

---

## 5. 任务清单（改写版 T1–T8，每步标注复用什么）

| T | 动作 | 复用 | 新增 | 自检 |
|:--|:--|:--|:--|:--|
| T1 | 环境确认（**不装包**） | 根 node_modules 的 X6/dagre | 0 | `pnpm --filter data-community-app dev` 起得来；空画布 `new Graph()` 无报错 |
| T2 | `data/derive.ts` | `TableCatalogStore` + `BusinessConceptStore` + `deriveFieldDetail` | ~90 行 | 派生出 8 实体 / 8 关系 / 45 表；三档计数 = 6/7/其余；未归类表可见 |
| T3 | 旧体验对照段 | 现有 `discovery/search` 页 | ~40 行 | 能从新版一键跳到现状搜索页，看到 45 张表与真实说明 |
| T4 | `RelationGraph.vue` | `LineageGraph` 只读配置 + dagre；`RelationshipGraph` 内置节点写法 | ~120 行 | 8 节点渲染；**拖不动**；Ctrl/⌘+滚轮缩放；`node:click` 打印 entityId |
| T5 | 抽屉下钻 | `AssetCard` + `a-drawer` + `deriveFieldDetail` | ~180 行（GraphView） | 图→实体→推荐表→字段→面包屑返回全通 |
| T6 | 高亮联动 | 自写 ~15 行（既有图组件无此实现） | 含在 T4/T5 | 点「授信合同」，直连节点保持亮度，其余 `opacity:0.25` |
| T7 | 结果对照 | `a-statistic` + `TableCatalogStore.stats()` | ~70 行 | 左右两栏、数字绑定变量（不写死） |
| T8 | 串联收尾 | `PageContainer` / `--dca-*` | ~60 行 + 1 条路由 | 三段走通；`pnpm lint:check`、`pnpm --filter data-community-app build`、`pnpm verify:entry-registry` 全过 |

每完成一个 T 打一次 commit（分支 `feat/datamap-demo`）。

---

## 6. 验收（复用现成闸门，不新增测试框架）

- [ ] `pnpm --filter data-community-app dev` 无报错，`/data-community/discovery/data-map-v2` 可达
- [ ] 图 8 节点 / 8 边，**节点不可拖动、不可连线**（C-2）
- [ ] 图→实体→推荐表→字段→返回 全链路通；高亮联动生效
- [ ] 数据全部派生自两个 store，**无编造表名**；未归类/缺口如实显示
- [ ] `git diff --stat` 确认既有文件只多 1 条路由记录（C-5）
- [ ] `pnpm lint:check` 0 error；`pnpm --filter data-community-app build` 退出 0
- [ ] `pnpm verify:entry-registry` 的 R6 能命中新路由（新路由被既有闸门覆盖，无需新写校验）
- [ ] `bash scripts/check-base-consistency.sh` 退出 0
- [ ] 浏览器实测（ golden path + 只读边界：尝试拖节点、尝试连线、缩放后返回）

---

## 7. 仍需你定的 3 件事

**A. 「借据」这一环怎么处理？**
① 用仓库既有实体 **ENT006 支用单** 替代（推荐，零新增、语义相符）；
② 保留 SPEC 的「借据」名，但抽屉里如实显示「暂无在册表」；
③ 把 `dwd_loan_detail / dwd_loan_daily` 从 unified-query 的库树 mock 引进 catalog（**会新增数据，违背本次「不引入新的」原则**，不推荐）。

**B. 旧体验页怎么做？**
① **对照说明 + 直达现有搜索页**（推荐：零复制、不失真，45 张表都有真实说明）；
② 按原 SPEC 复刻「说明列留空 + 请自行判断」的痛点页（需新写 ~80 行，且与现状不符，演示时可能被指夸大）。

**C. 要不要给 dca 的 `package.json` 补 3 条依赖声明？**
`@antv/x6`、`@antv/x6-vue-shape`、`@dagrejs/dagre` 现在**未在 dca 声明**，靠根 `shamefully-hoist` 命中（与已登记的 `xlsx/dayjs` 同类问题）。
① 补声明、版本沿用根上的 `1.35.1 / 3.0.2 / 1.1.8`，**不执行 install**（推荐，消除隐性依赖）；
② 完全不动 `package.json`（最严格的「不引入新的」，但保留 hoist 风险）。

---

## 8. 已知风险（开工前必须知道）

1. **工作区不干净**：dca 当前有 30+ 个未提交文件属并发批次（自助 DBA / 分级分类），且 `router/index.ts` 正是双方都会改的文件。C-5 要求干净起步 → 需先等并发批次落地，或从已推送的 tip 切 `feat/datamap-demo`。
2. **X6 是 1.x**：原 SPEC 3.2 的 7 个 `interacting` 键在 1.35 均有效，但 `graph.layout()` 等 2.x API 不存在；一律按 `LineageGraph` 的 1.x 写法（dagre 手算 + `fromJSON`）。
3. **依赖未声明**（见 §7 C）：换机器/关 hoist 就会解析失败。
4. **新版与既有「业务概念关系图」功能相邻**：`management/business-concept/relation-graph` 已有一个可编辑的实体关系图。新版的差异必须写进 README：**面向取数的只读一条链下钻（图→实体→推荐表→字段）+ 新旧对照**，不是第二个建模视图。
5. **DEC-01 归属**：数据地图属 dca 权威范围，本 Demo 落在 dca 合规；不得把代码放进 dfd/asset 等已摘出应用。

---

## 9. 实施记录（2026-11-23，T1–T8 已完成）

提交序列：`cfd4294f`(T1 依赖声明) → `d84d03ae`(T2 派生) → `5e581d64`(lint) → `aa1f48c2`(T4 图)
→ `4a1a956f`(T5/T6 抽屉+高亮) → `654ed39b`(T3 对照) → `10ea2365`(T7 结果) → `2d3355e1`(T8 串联+路由+README)。
既有文件改动仅 `router/index.ts` +6 行与 `package.json`/`pnpm-lock.yaml` 的依赖声明。

**实测（Playwright，20 项全过）**：8 节点 / 8 边；对节点做真实拖拽后 `transform` 不变（只读生效）；
图→实体→推荐表→字段→面包屑返回全链路；高亮时 5 个非直连节点变淡；ENT005 空态；三页签；
无 console error / pageerror。`vite build` 通过、eslint 0 error、两道既有闸门无新增失败。

**实测抓出并修掉的两个真缺陷**（写进 README 防复发）：
1. Arco 抽屉默认遮罩罩住整页，SPEC 要求的「点面包屑返回」点不到 → 改 `mask=false` +
   `popup-container` 挂组件内 + 容器 `pointer-events:none` / 面板 `auto`。
2. X6 把容器尺寸写成内联样式，`autoResize` 感知不到父级 padding 变化；且图内容高于容器时
   底部节点点不到 → 去掉 autoResize，按无 padding 宿主 div 显式 `resize` + `zoomToFit`，
   开/关抽屉让出右侧 452px 后重新适配。

**派生实测数**：8 实体 / 8 关系 / 45 表；三档 6 推荐 / 7 兜底 / 32 技术；
归属来源 4 要素关联 + 20 名称/标签 + 21 未归类。

**第二轮（展示优化 + 视角分层）**：提交 `6eab3d51`（布局切换/节点双行/边着色/抽屉分层与直连实体/对照页重做）
与本轮视角实现。视角为叠加高亮（风险 12 / 市场 6 / 技术 20 / 业务 12，可重叠），
抽屉按视角分组并把未命中表折叠；产品维度按 §3.7 只留空接口。
Playwright 扩到 **26 项**且全过（新增：视角切换改标签、贷后记录命中 3/3、未命中淡化不隐藏、
抽屉视角分组、切回全部恢复口径）。

**第三轮（关系维护）**：新增 `data/relation-store.ts`（localStorage 基线 + CRUD）与 ④ 关系维护页；
候选 = 实体 `coreRelations` 与现有 8 条的差集（实测 **10 条**），一键补齐后图从 8 条边变 9 条、刷新保持。
同时发现正式维护页 `management/business-concept/relation-graph` 未接线（`handleCreateSubmit` 只 `Message.success`、
删除按钮无 handler、store 无 relation CRUD），已在页面与 README 如实标注。Playwright 现为 **33 项**全过。

**第四轮（大环节下钻）**：把 8 个实体按仓库自带的 `domainCode` 聚成 6 个环节（客户域/账户域/授信域/支用域/还款域/贷后域），
环节层显示 `N 实体 · M 张表`、跨域边按关系聚合（同一域对多条关系合并为 `N 条关系`）；
点环节下钻到该域实体，面包屑「授信支用链」回退；顶部新增「环节/实体」视图切换，实体视图保留全链 8 节点。
`RelationGraph` 重构为通用 nodes/edges 渲染器（视角淡化与高亮由传入的 `inView` 控制）。
Playwright 现为 **38 项**全过（新增：环节层 6 域/6 边、点环节得 2 实体、面包屑出现并回退、实体视图 8 节点）。

**第五轮（标签/产品筛选）**：顶部加「标签」「产品」两个多选，语义见 §3.7 的「筛选」段；标签选项取自
真实 65 个 tags（带计数），产品因无数据而禁用并显示「产品（待接入）」。多选筛选与视角叠加，
节点显示 `筛后 k/N`，命中 0 淡化不隐藏；抽屉未命中表进折叠区，卡片 meta 增加「标签 / 产品」行。
Playwright 扩到 **42 项**全过（新增：产品下拉禁用、标签筛授信得 3 张且授信域显示 `筛后 3/6`、
总计提示 `筛后命中 3 / 45`、清除筛选恢复）。
