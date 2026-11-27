# 数据地图新版 Demo · 本地集成说明

> 只读演示，与现状数据地图**并存不合并**。全部代码在本目录，既有文件只改过 1 处：
> `src/router/index.ts` 增加一条 `discovery/data-map-v2` 路由记录。

## 入口与启动

```bash
pnpm --filter data-community-app dev      # 或根目录 pnpm dev（6 应用编排含本应用）
# 打开 http://localhost:5185/data-community/discovery/data-map-v2
```

页内三个页签（条件渲染，不另加路由；支持 `?tab=old|graph|compare` 直达）：

> 入口：旧版「数据发现门户首页」（`/discovery/overview`）横幅搜索框下方新增 **★ 主体关联** 卡片，
> 点击直达本页关系图页签（`?tab=graph`）。旧版其余内容零改动。

1. **① 现状对照** —— 不复制痛点页。展示权威目录真实统计（45 张在册 / 上线数 / 存量口径 752 / 平均质量分），
   并直达三个现状页：数据发现门户首页、全局搜索、表详情示例。
2. **② 关系图下钻** —— **两级下钻**：环节层（6 个业务域，按实体自带 `domainCode` 聚合，`N 实体 · M 张表`）
   → 点环节进入该域的实体层 → 点实体开抽屉看表/字段；顶部「环节/实体」可随时切换视图，面包屑回退。
   只读 X6 图，支持**纵向/横向布局切换**；
   顶部**视角**（全部 / 业务 / 风险 / 市场 / 技术）与**标签 / 产品筛选**都是叠加高亮：不删节点，未命中淡化，
   节点第二行显示 `本视角 2/6` 或 `筛后 3/6`；抽屉里按条件分组，未命中表收进折叠区。
   节点双行显示（名称 / 实体或事件 · 表数），边按关系类型着色。点实体开抽屉看「分层分布 + 直连实体 +
   推荐表 → 明细兜底 → 技术维护（折叠）」，点表卡片看字段（含分级），并可跳到旧版 7-Tab 表详情。
   点面包屑「授信支用链」返回并复位视图；点节点高亮直连、其余变淡。
3. **③ 结果对照** —— 步骤数/耗时为**待盲测填入的变量**（页内可直接改数），不是已实测结论；
   下方「结构事实」来自同一份权威目录。
4. **④ 关系维护** —— 关系可增删、可重置、可导出 JSON；并把实体自带 `coreRelations`
   与现有关系求差集，得到 **10 条可一键补齐的候选**（不编关系，只补「已声明但未建边」的）。
   改动存 localStorage，刷新保留；关系图边数与结果对照的计数会同步变化。

## 数据从哪来（零新增 mock）

`data/derive.ts` 只读两个既有 store，不复制任何表名/字段：

- 实体与关系：`@mock-shared/business-concept-store`（ENT001–ENT008、REL001–REL008，关系已是带类型二元边）。
- 表与字段：`@/mock-dca/shared/table-catalog-store`（45 张 `LogicalTable`，字段含中文名与敏感度）。
- 三档标签派生规则：`DWS+online` = 推荐（6 张）；`DWD+online` = 明细兜底（7 张）；其余 = 技术维护（32 张，默认折叠）。
- 推荐理由取既有 `description`，不新编文案。
- 视角由 `bizDomain + layer + tags` 派生（同一张表可命中多个视角）：
  业务=交易域；风险=风控域或 反欺诈/预警/风控 标签；市场=营销域或 营销/埋点/点击；技术=ODS 或 贴源/实时/Kafka/HBase/Doris。
- **产品维度目前无数据**：45 张表 0 条产品归属（只有 5 个数据要素标了 relatedProduct，4 条是「所有产品」）。
  `derive.ts` 已留 `PRODUCT_MAPPING` 空表 + `productOf()` 接口，等业务给「表→产品」清单后填入即可，UI 不编产品名。
- 表→实体归属：优先用仓库既有「实体→数据要素→`relatedResource.table`」关联（4 张），
  其余按中文名/标签规则归类（20 张），**命中不了的 21 张如实标未归类**，不硬塞。
  风控域的「用户风险评分」按域排除，避免误归客户实体。
- 关系维护（`data/relation-store.ts`）：以仓库 8 条为基线，本地增删改存 localStorage；
  「候选」= 实体自带 `coreRelations` 与现有关系的差集（当前 10 条），一键补齐即可，不编关系。
  正式维护页 `management/business-concept/relation-graph` 目前**未接线**（新增只弹提示、
  删除无 handler、store 无 relation CRUD），本页的新增/删除/重置逻辑可直接搬过去。
- **产品筛选两条路径（任选其一即可生效，UI 不用改）**：
  ① 在 `derive.ts` 的 `PRODUCT_MAPPING` 填「表名 → 产品数组」（如 `dwd_credit_apply: ['字节']`）；
  ② 给表打形如 `产品:字节` 的 tag。
  `productOf()` 取两者并集；当前两处都为空，故产品下拉显示「产品（待接入）」并禁用 —— **不编产品名**。
- **标签筛选**：多选，选项取自 45 张表的真实 `tags`（65 个，带计数），产品之间 OR、标签之间 OR、
  两类之间 AND；另有**分层筛选**（DWS/DWD/…）与**排序**（推荐优先 / 热度 / 更新时间）。
  筛选与视角叠加生效，命中 0 的节点淡化到 0.28 但不隐藏。
- **v2 预留字段**（C-9）：实体 `entityCode/registryStatus/manageStatus`，表 `syncStatus/lastVerifiedAt/usageHeat/recommendReason`。
  卡片与抽屉已用上：维护人、上次复核、同步状态角标、口径（粒度+口径+场景）、实体稳定标识、隐含业务常识。
- 数据质检：`pnpm verify:datamap-demo`（7 项，当前 6 PASS + 1 WARN=支用申请无表，属仓库真实缺口）；
  语义规格见 [docs/architecture/datamap-demo-semantics-2026-11.md](../../../../../docs/architecture/datamap-demo-semantics-2026-11.md)。

**换真实数据**：改上述两个 store 即可，本目录不需要动；派生规则集中在 `derive.ts` 顶部常量。

## 已知缺口（如实展示，不编数据补齐）

- `ENT005 支用申请` 在权威目录中**没有对应物理表**，抽屉显示「暂无在册表」。
  「借据」一环由仓库既有实体 `ENT006 支用单` 承担（`dwd_loan_drawdown` 等）。
- 关系是 8 条（仓库现值），不是外部 SPEC 建议的 9 条；不新编边。
- 严格 `heat≥80` 的推荐表只有 3 张，达不到「核心实体各 3–5 张」，故分布要求改为
  「每实体至少 1 张推荐或兜底；核心实体展示全部在册表并标档」。

## 只读与隔离约束

- X6 1.35.1：`interacting` 七项全关（节点/边/折点/箭头不可动），`connecting`、`selecting` 关闭；
  保留节点点击用于下钻。布局用既有 `@dagrejs/dagre` 手算 + `fromJSON`，**未引入 `@antv/layout`**。
- 抽屉 `:mask="false"` + `popup-container=".dm-graphview"`，容器 `pointer-events: none`、面板 `auto`，
  否则遮罩会挡住面包屑与画布（实测踩过的坑）。
- X6 会把容器尺寸写成内联样式，`autoResize` 感知不到父级 padding 变化；
  故开/关抽屉时按无 padding 的 `.dm-graph-host` 显式 `resize` + `zoomToFit`。
- 不改 `MainLayout` 菜单、不改 23 处 `data-map-table` 深链、不改任何既有组件与全局样式。
  新版入口只靠 URL 与页内互链；旧版页面零改动。

## 复用的现成件

`AssetCard`（表卡片，三色）、`PageContainer` / `PageHeader`（页壳）、`a-statistic`（对照数字）、
`LineageGraph` 的只读配置与 dagre 写法、`customer360/RelationshipGraph` 的内置节点写法。
**没有**新写 Vue 节点组件（用 X6 内置 `rect` + attrs）。

## 验证

Playwright 实测 49 项全过（环节层 6 域 / 6 边、实体层 8 节点 / 8 边、环节→实体下钻、拖动后 transform 不变、面包屑往返、
高亮变淡、空态、三页签、视角切换与抽屉分组、关系维护增删改与持久化、无 console error / pageerror）。
门禁：`pnpm lint:check`、`pnpm --filter data-community-app build`、`pnpm verify:entry-registry`、
`bash scripts/check-base-consistency.sh`。
