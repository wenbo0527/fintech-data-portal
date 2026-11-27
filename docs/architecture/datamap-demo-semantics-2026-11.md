# 数据地图 Demo · 语义规格（v2 §5.4 交付物）

> 生成时间：2026-11-23。依据：仓库既有 `business-concept-store` / `table-catalog-store`，
> 经 `data/derive.ts` 派生；可执行校验：`pnpm verify:datamap-demo`（T2.5 质检，7 项，当前 6 PASS + 1 WARN）。

## 1. 实体（8 个，全部为仓库既有业务词）

| 实体 ID | 稳定标识 `entity_code`[scale] | 业务名 | 类型 | 域 | 仓库环节 | 注册/管理状态 |
|:--|:--|:--|:--|:--|:--|:--|
| ENT001 | `CUSTOMER` | 客户 | entity | common | 客户域 | approved / active |
| ENT002 | `ACCOUNT` | 账户 | entity | common | 账户域 | approved / active |
| ENT003 | `CREDIT.APPLY` | 授信申请 | event | risk | 授信域 | approved / active |
| ENT004 | `CREDIT.CONTRACT` | 授信合同 | entity | risk | 授信域 | approved / active |
| ENT005 | `DRAW.APPLY` | 支用申请 | event | risk | 支用域 | approved / active |
| ENT006 | `DRAW.ORDER` | 支用单 | entity | risk | 支用域 | approved / active |
| ENT007 | `REPAY.PLAN` | 还款计划 | event | risk | 还款域 | approved / active |
| ENT008 | `POSTLOAN.RECORD` | 贷后记录 | event | risk | 贷后域 | approved / active |

> `entity_code` 是 11179-5 的「名称可变、标识不变」；双状态为 11179-6（注册 / 管理）。
> 仓库没有「借据」实体，本 Demo 用 **ENT006 支用单** 承担该环（见 §4 待确认 A）。

## 2. 关系（8 条，严格二元）

| ID | 源 → 目标 | 名称 | 类型（映射后） | 原始类型 |
|:--|:--|:--|:--|:--|
| REL001 | 客户 → 账户 | 拥有 | associate | association |
| REL002 | 客户 → 授信申请 | 发起 | flow | behavior |
| REL003 | 授信申请 → 授信合同 | 生成 | sequence | derivative |
| REL004 | 客户 → 支用申请 | 发起 | flow | behavior |
| REL005 | 授信合同 → 支用申请 | 支持 | associate | association |
| REL006 | 支用申请 → 支用单 | 生成 | sequence | derivative |
| REL007 | 支用单 → 还款计划 | 生成 | sequence | derivative |
| REL008 | 还款计划 → 贷后记录 | 被监控 | associate | association |

链条读取顺序：客户 → 账户 / 授信申请 → 授信合同 → 支用申请 → 支用单 → 还款计划 → 贷后记录。
存储结构是 8 条独立二元关系，**不是一条链**（11179-32）。

## 3. 隐含业务常识（4 条，写进规则）

| ID | 规则 | 涉及实体 |
|:--|:--|:--|
| IR-1 | 授信必然有对应协议：申请通过后生成授信合同，二者一一对应 | ENT003 / ENT004 |
| IR-2 | 支用必有支用单：每次提款生成一张，脱链即数据质量问题 | ENT005 / ENT006 |
| IR-3 | 客户必有归属账户：一一对应，缺失即客户主数据不全 | ENT001 / ENT002 |
| IR-4 | 还款计划挂在支用单上，不直接挂客户 | ENT006 / ENT007 |

页面位置：实体抽屉「隐含常识」一栏；质检规则 R5 校验条数 ≥3 且引用实体存在。

## 4. 表映射与三档判定

- 归属优先级：仓库既有「实体→数据要素→`relatedResource.table`」（4 张）→ 中文名/标签规则（20 张）→ 未归类（21 张，不硬塞）。
- 三档：`DWS + online` = 推荐（6 张）；`DWD + online` = 明细兜底（7 张）；其余 = 技术维护（32 张，默认折叠）。
- 推荐理由 = 既有 `usageGuide / businessCaliber / description` **+ 自动补「口径已上线 · {freq}粒度 · {layer}层」**，不新编文案。

## 5. 待业务方确认（三方口径，Agent 无法裁定）

| # | 事项 | 现状 | 需确认 |
|:--|:--|:--|:--|
| A | 「借据」实体 | 仓库无该实体，用「支用单」承担（`dwd_loan_drawdown`） | 是否新增「借据」实体并补表（`dwd_loan_detail` 目前只在 unified-query 库树里出现） |
| B | 实体命名与关系方向 | 沿用仓库 ENT001–008 与 REL001–008 | 「授信合同」是否应对齐 SPEC 的「协议」；「被监控」方向是否成立 |
| C | 核心实体表覆盖 | 支用申请（ENT005）0 张表 | 是否有未入目录的表应补录 |
| D | 产品归属 | 45 张表 0 条产品数据 | 提供「表 → 产品（字节/蚂蚁/京东…）」清单，或在表 tags 打 `产品:xxx` |
| E | 风险视角覆盖 | 风险视角仅命中 12/45，主线表多在交易域 | 是否接受「叠加高亮」口径（推荐），或需要新的视角划分 |

## 6. 与 SPEC v2 的对应

| SPEC v2 项 | 落点 |
|:--|:--|
| C-8 数据可辨认 | 实体/关系/理由全部来自既有业务数据；质检 R1/R2 守门，自检 5 条断言 |
| C-9 结构预留 | `entity_code` / 双状态 / `sync_status` / `last_verified_at` / `usage_heat` / `recommend_reason` 已入 `DemoEntity`/`DemoTable`；质检 R7 防删 |
| §2.5 数据生产 | 实体按「业务过程→实体→关系→隐性常识」组织；三档按分层 + 状态 + 理由判定 |
| §3.7 规模化预留 | 排序 `sortBy`（推荐优先/热度/更新时间）、分层筛选、`sync_status` 角标位、owner/复核时间展示位、面包屑「域」层 |
| §5.4 语义规格 | 本文 |