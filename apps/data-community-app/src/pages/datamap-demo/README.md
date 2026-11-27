# 数据地图新版 Demo · 本地集成说明

> 只读演示，与现状数据地图**并存不合并**。全部代码在本目录，既有文件只改过 1 处：
> `src/router/index.ts` 增加一条 `discovery/data-map-v2` 路由记录。

## 入口与启动

```bash
pnpm --filter data-community-app dev      # 或根目录 pnpm dev（6 应用编排含本应用）
# 打开 http://localhost:5185/data-community/discovery/data-map-v2
```

页内三个页签（条件渲染，不另加路由）：

1. **① 现状对照** —— 不复制痛点页。展示权威目录真实统计（45 张在册 / 上线数 / 存量口径 752 / 平均质量分），
   并直达三个现状页：数据发现门户首页、全局搜索、表详情示例。
2. **② 关系图下钻** —— 8 个业务实体 + 8 条关系的只读 X6 图，支持**纵向/横向布局切换**；
   节点双行显示（名称 / 实体或事件 · 表数），边按关系类型着色。点实体开抽屉看「分层分布 + 直连实体 +
   推荐表 → 明细兜底 → 技术维护（折叠）」，点表卡片看字段（含分级），并可跳到旧版 7-Tab 表详情。
   点面包屑「授信支用链」返回并复位视图；点节点高亮直连、其余变淡。
3. **③ 结果对照** —— 步骤数/耗时为**待盲测填入的变量**（页内可直接改数），不是已实测结论；
   下方「结构事实」来自同一份权威目录。

## 数据从哪来（零新增 mock）

`data/derive.ts` 只读两个既有 store，不复制任何表名/字段：

- 实体与关系：`@mock-shared/business-concept-store`（ENT001–ENT008、REL001–REL008，关系已是带类型二元边）。
- 表与字段：`@/mock-dca/shared/table-catalog-store`（45 张 `LogicalTable`，字段含中文名与敏感度）。
- 三档标签派生规则：`DWS+online` = 推荐（6 张）；`DWD+online` = 明细兜底（7 张）；其余 = 技术维护（32 张，默认折叠）。
- 推荐理由取既有 `description`，不新编文案。
- 表→实体归属：优先用仓库既有「实体→数据要素→`relatedResource.table`」关联（4 张），
  其余按中文名/标签规则归类（20 张），**命中不了的 21 张如实标未归类**，不硬塞。
  风控域的「用户风险评分」按域排除，避免误归客户实体。

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

Playwright 实测 20 项全过（8 节点 / 8 边、拖动后 transform 不变、下钻全链路、面包屑返回、
高亮变淡、空态、三页签、无 console error / pageerror）。截图见会话记录。
门禁：`pnpm lint:check`、`pnpm --filter data-community-app build`、`pnpm verify:entry-registry`、
`bash scripts/check-base-consistency.sh`。
