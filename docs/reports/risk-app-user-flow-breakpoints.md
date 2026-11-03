# risk-app 用户流程串联与核心断点清单

> 目的：按用户实际使用流程把 risk-app 现状串联起来，标出流程中的断点（nav 死链 / 跨域孤岛 / 闭环缺失），供进一步分析取舍。
> 方式：静态代码走查（路由表、菜单、页面跳转、mock 数据层引用关系），未做运行时验证。
> 范围：外数管理（modules/external-data）、风险要素/任务/执行（modules/variable-hub）、导航层（router.ts / registry.ts / layout/MainLayout.vue）。
> 日期：2026-11-03
> **状态更新（同日）**：已按确认范围「P0+P1+P2 导航与闭环层」补齐，菜单口径为「不新增一级菜单，只补任务详情入口」。逐条落地位置见 **第五章 补齐记录**；C1（两套评估体系底层合并）与 C4（开放准入评估 creatable）按范围明确不做。
> **同日第二次更新**：导航接通后暴露出跨域 id 对不齐的数据层缺口（台账无外数资产、评估覆盖只 1 条、外数报告深链指向不存在的 id），已在 **第六章** 处理；这不代表 C1 已合并，只是把现有两套数据之间的锚点接对了。

---

## 〇、先看结论：一条主干，两处断裂

业务上预期的完整主干是：

```
外数接入 ──> 准入/日常评估 ──> 特征台账 ──> 常态性评估 ──> 效果运营 ──> 下架/推荐
 (档案/落库)  (一次性判定)     (资产登记)   (周期巡检)     (名单/标记)    (反馈回资产)
```

现状串联结果：

- **中段闭环质量很高**：台账 → 评估任务 → 执行实例 → 回写档案 → 效果任务引用上游 → 名单产出，这一段契约、血缘、快照机制齐全（见附录 A 已验证连通项）。
- **前段（外数 → 台账/任务）完全断裂**：外数管理是与风险要素域并行的孤岛，零双向导航、执行体系独立。
- **尾段（分析反馈 → 任务/资产）没有回路**：人工标记、点赞评论只影响展示层，不回流任何任务或资产状态。

补齐后的现状：前段与尾段的**导航层断点已接上**（外数落库 ↔ 台账登记、评估/效果任务 ↔ 外数与效果分析、标记 → 复评引导），数据层的 **id 锚点也已对齐**（台账外数资产 ↔ 档案 productCode ↔ 外数报告，见第六章）；但前段的**两套评估体系仍是两个事实源（C1）与准入评估的生产者（C4）依旧缺失**——主干能走通了，只是外数评估与任务域评估依旧各算各的账。

---

## 一、三条主流程串联图（⚠ 为断点位置）

> 下图为走查当时（补齐前）的状态；补齐后逐条结论见第五章。

### 流程 1：外数接入到上台账

```
合作机构管理 ─> 外数档案 ─> 外数评估中心(创建报告) ─> 服务场景入口 ─> 回溯落库申请 ─> 服务任务列表 ─> 生命周期总览
     ✅            ✅        ⚠C1(与任务域独立)         ⚠A2(页面无入口)    ⚠C3(无出台账出口)     ✅              ⚠D1
                                     ⚠A1(提交后跳转路由不存在)
```

用户做完任何一步后，**都无法走向 /tasks、/runs、/variable-management**（⚠C2），只能靠左侧菜单重新找。

### 流程 2：常态性评估周期闭环（质量最好的一段）

```
脚本管理(建脚本) ─> 新建常态性评估(选脚本+选特征) ─> 任务列表 ─> 执行(run) ─> 执行记录详情 ─> 逐特征报告/契约校验 ─> 回写特征档案
      ✅                    ⚠C5(特征选择器无来源指引)        ✅         ✅            ✅                    ✅              ✅
```

断点集中在：特征选择器候选虽含外数特征，且现在已能通过台账 `sourceRefs` 反查外数档案与报告（见第六章），但**两套评估体系的数据仍未合并**（⚠C1）；新建页无来源指引（⚠C5）；台账详情看到的"分析报告"是写死的假条目，不是评估 run 的真实报告（⚠A4）。

### 流程 3：效果运营闭环

```
引用上游评估任务(契约过滤) ─> 建效果任务(判定配置) ─> 执行批次 ─> 名单+推送 ─> 效果分析(标记/评论/点赞) ─> 反馈回流
            ✅                        ✅                ✅        ⚠C8(仅mock)         ✅                        ✗ 无回路(⚠C6/C7)
```

---

## 二、核心断点清单（按严重度分级）

### P0 硬断点：点了没反应 / 跳到不存在的路由

#### A1. 外数评估提交后被"吞掉"，且残留两个死路由　〔已补齐〕
- `modules/external-data/pages/CreateEvaluation.vue:781`：createTask 成功后 `router.push('/variable-hub/external-data/evaluation/progress')` —— **该路由在 router.ts / registry.ts 中均不存在**，提交后落入空白。
- 同文件 `:299`：`router.push('/variable-hub/external-data/evaluation/list')` —— 同样不存在（真实列表页是 `/variable-hub/external-data/evaluation`，无 `/list` 后缀）。
- 对照：`Evaluation.vue:122` 新建后是正确跳 `evaluation/${newItem.id}` 详情页。两条代码路径并存，说明 CreateEvaluation 向导是旧实现残留，未与 Evaluation.vue 的入口统一。
- **影响**：用户从"新建评估"向导提交后不知道任务在哪、成功没有。

#### A2. 外数模块存在声明但无任何入口的死路由　〔已补齐〕
- `/variable-hub/external-data/online-call-application`（`OnlineCallApplication.vue`，近 600 行完整页面）：不在菜单（MainLayout）、不在 registry.ts 导航；唯一入口是 `ServiceScene.vue:115` 的按钮。URL 深链收藏、菜单检索都到不了。

#### A3. 决策审计页是完全的孤儿　〔已补齐〕
- `/explore/audit`（`explore/audit/index.vue`）：菜单无、registry 无、全代码库无任何 `router.push` 指向它。而数据层 `explore-store.ts` 的 `addAuditEvent` 一直在写入审计事件——**数据有人写、没人看**。
- 次级：`/explore/compare`（实验对比）无菜单/面包屑，仅从探索课题页内按钮可达（topics/index.vue:451、detail.vue:8）。

#### A4. 台账详情的"分析报告"是写死的假数据，看不到评估域真实报告　〔已补齐〕
- `modules/variable-hub/pages/variable-management/detail.vue:1388-1404`：`analysisReports` 恒为一条 `id: 'var-eval-001'`、`source: 'dmt-app'` 的写死条目，内容取台账自身字段拼出。
- 评估域真实报告挂在 run 上（`evaluation-task-store.ts` finishRun 的 `reports.push`），只能在 `/runs/:id` 详情弹窗看；**台账作为资产视角看不到名下特征历次评估报告**，两处也没有链接互通。

### P1 结构性断点：域间断裂（影响主干串联）

#### C1. 外数评估中心与任务管理是两套并行、互不可见的评估体系　〔本次未处理：范围外，属数据层合并；仅锚点对齐见第六章〕
- 外数评估：`Evaluation.vue / CreateEvaluation.vue / EvaluationDetail.vue` + `mock/evaluationReports.ts`，样本靠**手动上传文件**，报告有独立的草稿/发布/归档/删除状态机。
- 任务域评估：`/tasks` + `evaluation-task-store` + Python 脚本口径 + `/runs` 执行实例。
- 两者间原本无导航、无数据引用（`grep evaluationReports` 仅命中外数模块自身）。第六章后，`evaluation-task-store.ts:5` 开始单向 `import { createEvaluationReport }` 向外数库落报告，但两套报告实体、状态机与口径仍然是独立的，**引用通了不等于体系合并**。
- **影响**：同一个外数特征，"接入时的一次性评估"与"上线后的周期评估"在系统里是两个不相干的事实源，用户无法形成"这个数评估过几次、结论分别是什么"的完整档案。

#### C2. 外数 ↔ 风险要素/任务域零双向导航（全量 grep 验证）　〔导航层已补齐，数据层同 C1 未处理〕
- `modules/external-data` 所有 `router.push` 目标均在外部：`/discovery/lineage`（跨到主应用 dfd）、`/budget/monitor`、`/variable-hub/external-data/*`。
- `modules/variable-hub` 无任何 `router.push / router-link / href` 指向外数页面。
- 唯一例外：`Archive.vue:439`、`ArchiveDetail.vue:565` 跳 `/discovery/lineage` —— 该路由**不属于 risk-app**（risk-app 路由表中不存在），iframe/独立运行模式下必然 404，只有 portal-shell 整站路由下才可能成立，但代码里没有环境判断。

#### C3. 落库完成后没有"进入台账"的出口　〔已补齐〕
- `BacktrackPersist.vue` / `TaskList.vue` / `useBacktrackPersist.ts` 全文无台账 / 特征注册相关出口；落库成功的表（hiveTables/storageClusters）与 `variable-management` 的特征资产之间没有登记动作或引导。
- 外数档案 `ArchiveDetail.vue` 的发布流程（published）同样与台账上架无衔接。
- **影响**："新外数 → 准入判定 → 落库 → 成为特征资产"这条接入主干在"落库→台账"处断开，台账里的外数特征从哪来在系统内不可追溯。

#### C4. 准入/复评/对比评估类型"有定义、无生产者"　〔本次未处理：范围外，需产品口径先定〕
- `task-kinds.ts:135` 注释：*"一次性评估沿用旧入口，见 createPath 缺省"*；`CreateTaskDialog.vue` 头注释：*"不可新建的类型（准入/复评/对比）由别的流程产生，故不出现在这里"*。
- 但全代码库不存在任何"别的流程"创建这三类任务的路径；旧入口 `/evaluation/tasks/create` 已 redirect 到常态性评估页。**注册表里这三类 kind 只能从种子数据出现，永远不新增**。
- 与之呼应：脚本场景已内置 `external_access`（外数准入判定器，evaluation-task-store.ts:568，含覆盖率/IV/缺失率三道闸门），但对应任务类型 `creatable !== true` —— **口径 ready、任务类型未开放**。

#### C5. 两处"选择输入"都没有来源指引　〔已补齐〕
- 评估新建页 `VariableSelector.vue`：候选来自静态 `mock/variable-management/variables.ts` 的 `variableAssets`（26 条种子）+ 草稿；新建页提示"从探索课题/批量选择"，但没有"去探索课题""去台账注册特征""去外数落库"的出口链接。
- 效果任务 `upstreamTaskId` 下拉：若 `EvaluationTaskStore.listTasks()` 里没有已结束实例，可选项为空且无引导（契约过滤把入口卡死在无上游任务的新用户面前）。

### P2 闭环缺失：流程有去无回

#### C6. 效果分析入口不可发现　〔已补齐（按口径：不加菜单，只补任务详情入口）〕
- 效果分析视图（`EffectVariableTable` + 标记/评论/点赞）只嵌在 `/variable-hub` 总览的一张卡片里；无一级菜单、无独立路由（workbench/index.vue:36 注释明确"不新增路由与菜单"）。
- 效果任务详情四个 Tab（config/instances/rule/params）中无"效果分析"入口；分析结果与任务详情也无互链。用户从任务视角看不到"这个任务产出的名单被市场反馈得怎么样"。

#### C7. 人工标记 / 评论 / 点赞无回流回路　〔已补齐导航层引导，数据回流仍为展示层〕
- `MarkDialog` → `effectOpinionStore.markVariables` 落库后，唯一消费点是 `effect-store.ts:1180`（推荐排序展示）；评论、点赞只进 EffectCard/CommentBlock 展示。
- 没有"按标记批量建评估任务""bad case 推回评估域复检""建议汰换触发下架申请"任何一条回路 —— **效果运营是条单行道**。

#### C8. 名单推送终点停留在 mock 文案　〔已补齐回看入口，推送本身仍为 mock〕
- `batch-store.ts:339/999-1002`：推送对象 `pushNamesOf(rule.pushTargets)` 只写进执行日志和实例快照，规则候选来自 `effectRuleStore.pushCandidates()`（静态字典）。无真实协作团队/通知系统的出口模拟，也无法回看"推送后对方做了什么"。

### P3 观察项（可能是有意设计，列入分析备选）

| # | 现象 | 证据 |
|---|---|---|
| D1 | 生命周期总览 4 张导航卡只覆盖预算/档案/评估/服务场景，不含任务管理侧任何页面（已顺手补齐：导航卡扩到 6 张，加特征台账 + 任务管理） | Lifecycle.vue:19-37 |
| D2 | 样本表准备的产出（样本表）未被任何流程消费：外数评估靠上传文件、评估任务靠选特征；sampleTable 字段只在 ArchiveDetail/OnlineCallApplication 展示 | CreateEvaluation.vue:36 |
| D3 | `evaluation/edit/:id` 路由存在但无 redirect 兼容旧 `/evaluation/tasks/edit/:id` 之外的入口差异，编辑与新建共用一页需确认回填逻辑 | router.ts:125 |
| D4 | 执行重跑权限 `RUN_EFFECT_TASK` 仅效果域校验，评估域重跑未见等价权限闸门 | run-record/index.vue:273 |
| D5 | MainLayout 菜单与 registry.ts 两份菜单配置需人工同步（已知约定，漂移风险仍在） | router.ts:33 注释 |

---

## 五、补齐记录（2026-11-03，范围：P0+P1+P2 导航与闭环层）

验证方式：`cd apps/risk-app && npx vite build` 通过；新增跳转目标逐条与 `router.ts` 路由表比对（含 `/variable-hub#recommend` 的锚点元素 `id="recommend"` 确实存在）；ESLint 未报新增类别问题（新增行命中项均为与周围既有代码同源的 `curly` 风格，单独改写反而破坏整段一致性，故不动）。

| 断点 | 状态 | 落地位置 | 做了什么 |
|---|---|---|---|
| A1 | 已修 | `external-data/pages/CreateEvaluation.vue` | 提交改走 `api/evaluation` 的 `createEvaluationReport`（原先调 `api/task` 的 `createTask`，且在 mock 模式下读 `response.data.id` 会直接 TypeError），成功后跳真实详情页；返回按钮 `/evaluation/list` → `/evaluation` |
| A2 | 已修 | `layout/MainLayout.vue` + `registry.ts` | 外数服务管理组补菜单项「线上调用服务申请」与高亮分支；registry 补 `risk-external-data-online-call` |
| A3 | 已修 | 同上 | 探索过程组补「决策审计」入口；`/explore/audit`、`/explore/compare`（高亮归属探索课题）补高亮分支；registry 补 `risk-factor-audit` |
| A4 | 已修 | `variable-management/detail.vue` 的 `buildAnalysisReports()` | 改为按特征 ID 反查 `EvaluationTaskStore.listRuns()` 中成功/部分成功实例的 `producedReports`：外数报告直链详情页（`buildRiskAppUrl`），任务域报告内联本次执行 / 覆盖率 / 质量得分；原写死条目改名「特征质量指标摘要（台账派生）」并做去重。顺带修 7 处缺 `variable-hub` 段的深链（detail.vue 3、index.vue 1、evaluation-task-store.ts 种子 3） |
| C2 | 已修（导航层） | `external-data/pages/Lifecycle.vue`、`workbench/index.vue`、`EvaluationDetail.vue`、`ArchiveDetail.vue` | 生命周期导航卡 4 → 6（+特征台账、+任务管理）；工作台入口卡加「外数管理」并自适应 span；外数评估详情加「发起周期评估」→ `/tasks/evaluation/create`；档案详情加「登记为特征」「发起周期评估」 |
| C3 | 已修 | `BacktrackPersist.vue` 落库完成弹窗 + `variable-management/index.vue` 接收端 | 「登记为特征」→ `/variable-management?action=register_from_external&table=<hive 表名>`；台账端直接打开注册抽屉并提示来源选「外数」，用完即 `router.replace` 清 query |
| C5 | 已修 | `evaluation/tasks/create.vue`、`effect-tasks/create.vue` | 评估对象提示条加 `#action` 三个出口（去台账注册特征 / 去外数落库取数 / 去探索课题）；效果任务在上游候选为空时给 warning 提示条 +「去新建常态性评估」，并把引用模式置灰 |
| C6 | 已修 | `effect-tasks/detail.vue`、`workbench/index.vue` | 详情页头部加「效果分析」→ `/variable-hub#recommend`；总览「变量效果评估」卡 `#extra` 加「相关效果任务」→ `/tasks?tab=tasks&dm=effect`。按既定口径**未新增**一级菜单与独立路由 |
| C7 | 已修（引导层） | `components/effect/MarkDialog.vue` | 标记成功后 `Modal.confirm` 引导「去建复评任务」→ `/tasks/evaluation/create`；标记数据本身仍只服务展示排序，真正的口径回流取决于 C1 结论 |
| C8 | 已修（回看入口） | `run-record/detail.vue` | 名单推送卡 `#extra` 加「去效果分析回看」→ `/variable-hub#recommend`；推送仍是 mock 留痕，未接通知系统 |
| C1 / C4 | 本次不做 | — | 按确认范围排除：C1 要先定产品口径（两套评估体系是否合并、以谁为主），C4 依赖该结论决定是否给准入/复评/对比开放 `creatable` |

### 补齐后仍存在的风险（不在本次范围）

- `Archive.vue:439` / `ArchiveDetail.vue:565` 跳 `/discovery/lineage` 仍是跨应用路由，risk-app 独立运行或 iframe 模式下必然 404，本次没补环境判断。
- 外数评估与任务域评估仍是两个事实源：导航通了，但同一个外数特征「评估过几次」依然要在两处各看一遍。
- C7 只是把人引到建任务页，标记结果不会自动带进任务入参；评论/点赞仍无任何下游消费。
- D2 ~ D5 原样保留。

---

## 六、数据层 mock 补齐（2026-11-03，范围：台账补 2 条外数资产 + 评估覆盖扩到 6 条）

导航通了之后暴露的是另一类断点：**跨域引用的 id 对不齐**，点进去是空态或 404。三套 id 宇宙（台账 `MIDLOAN-FEAT-*`、评估种子 `VAR-000X`、外数档案 `productCode`）原本各说各话，具体缺口与处理：

| 缺口 | 现象 | 处理 | 落地位置 |
|---|---|---|---|
| 台账无外数资产 | `variableAssets` 26 条全是 `sourceType: 'internal'`，「外数落库 → 上台账」主干在台账端没有落点 | 尾部追加 `VAR-0001`（三要素核验一致性）/ `VAR-0002`（手机在网时长）/ `VAR-0004`（近 24 期逾期等级，`offline`）三条外数·征信资产，各带 `sourceRefs` 三锚点（档案 productCode + 外数报告 id + 接口号） | `variable-management/variables.ts` |
| 评估覆盖面只有 1 条台账特征 | 台账 25 条 `MIDLOAN-FEAT-*` 从未被任何评估任务引用，A4 改成真实反查后，绝大多数台账详情的「分析报告」只剩 1 条派生摘要 | 常态性任务 `EVAL-2026-004` 的 `targets` 由 1 条扩到 6 条（`MIDLOAN-FEAT-0001/0018/0019/0022/0023`），`sourceIds`/`sourceNames`/`resultSummary` 同步；`buildRunInstance` 按 `task.targets` 派生 `producedReports`，扩 targets 即自动扩真实产出，无需再造假数据 | `evaluation/evaluation-task-store.ts` |
| 外数报告深链指向不存在的 id | 评估种子写 `url: /evaluation/11`、`/12`，而外数报告库生成的是 `1001+i`，`getEvaluationReportDetail` 返回 null，详情页报「获取报告详情失败」 | 补 3 条 `completed` 报告 `9001` 身份有效性核验 / `9002` 手机号风险评估 / `9003` 百行征信查询（字段全确定性，不引 `Math.random`），种子 url 与台账 `sourceRefs.externalEvaluationId` 统一指过去 | `external-data/mock/evaluationReports.ts` |
| 运行时新建的外数报告也是坏链 | `generateReportsForTask` 用 `nextExternalReportId()` 从 101 起自造 id，外数库根本不存在这些记录 | 改为调外数库 `createEvaluationReport()` 真实落一条、用返回 id 写 binding；删掉自造计数器 | `evaluation/evaluation-task-store.ts` |
| 台账深链前缀丢失 | 台账详情页拼外数报告路径时不带 `/risk/` base，独立运行正常、主应用内 404 | 新增 `externalReportPath(r)`：mock 上已带 `/risk/` 前缀的直接沿用，否则回退补全；去重条件加 `url endsWith /evaluation/${id}` | `variable-management/detail.vue` |
| 征信资产锚点变哑引用 | 台账详情拼报告列表时条件写死 `sourceType === 'external'`，而 `VAR-0004` 是 `credit` 但同样带 `externalEvaluationId` 锚点 | 条件改为只看 `sourceRefs.externalEvaluationId` 是否存在（两类资产的评估报告都落在外数评估中心） | `variable-management/detail.vue` |

### 运行时实测复现的真 bug：`/external-data/archive` 整页空列表

用户实测反馈该页看不到外数，排查后确认不是数据缺失而是 **mock 开关定义被删**：

- `api/evaluation.ts` 早前重构剔掉 `generateMockProducts()`（`Math.random` 现造 20 个产品）那段时，**连带删掉了紧跟着的 `const useMock = import.meta.env.VITE_USE_MOCK === 'true'`**，但下面 8 个函数仍在读 `useMock`。
- 后果：每个入口调用即 `ReferenceError: useMock is not defined` → store 的 `try/catch` 把异常吞成 `store.error` 文案 → `products` 永远是 `[]` → 档案列表空；同一文件还撑着外数评估中心列表、发布/归档/删除/新建全链路。
- **为何两道门都没有拦住**：`vite build` 不做类型检查；`eslint` 对 `.ts` 未启用 `no-undef`；risk-app 自己的 `package.json` 只有 `dev/build/preview`，**没有 `typecheck` 脚本**（根目录 `pnpm typecheck` 直接 echo 退 0）。这类模块级标识符缺失只能在运行时暴露。
- 已补回定义并在文件头注释里留下成因；同时全量扫描 `apps/risk-app/src/**/api/*.ts`，确认只剩这一个文件缺 `useMock`。
- 浏览器复验（dev 5176）：`/external-data/archive` 共 21 条、`/external-data/evaluation` 共 35 条（= 32 自动生成 + 本轮补的 9001/9002/9003）、档案详情页正常渲染，控制台 **零 error / 零 ReferenceError**。

> 建议后续：给 risk-app 补一个 `vue-tsc --noEmit` 的 `typecheck` 脚本，比人工记忆“改动后跑一下”可靠；本轮未加，因为会带出一批存量类型错误。

**验证**：`npx vite build` 通过（11.16s）。跨 mock 一致性脚本核对四项全部为真——台账 29 条（`VAR-0003` + 25 条 `MIDLOAN-FEAT-*` + 新增 3 条）无重复；评估 `targets` ⊆ 台账 id；全景工作台引用的 `VAR-*` ⊆ 台账 id；台账 `sourceRefs.externalEvaluationId` 与任务外链报告号 ⊆ 外数库可用 id。三锚点亦逐条回查外数档案：`BH_ID_VALIDATION`↔`IF-0006`↔`9001`、`BH_PHONE_RISK`↔`IF-0007`↔`9002`、`BH_CREDIT_QUERY`↔`IF-0013`↔`9003`（档案 `productCode`/`interfaceNo` 与报告 `productName` 三者同源）。

**为什么新资产放数组尾部**：`effect-evaluation/generator.ts` 取 `variableAssets.slice(0, 26)` 作效果域种子，放头部会整体位移、412 条效果样本全部重排。追加在 27–29 位可保持既有数值不动。

**代价**：3 条新台账资产不进效果域样本，其详情页 EffectCard 走 `a-empty` 兜底（`effectStore.variableEffect` 返回 null）——这是明知且可接受的，比让效果指标与台账 `effectMetrics` 两处数字打架好。另：台账侧命名沿用既有种子（如「外数-三要素核验一致性」），与档案产品名（「身份有效性核验」）不完全一致，跨域关系靠 `sourceRefs` 锚点而非名称匹配维系。

**副作用（正向）**：`VariableSelector.vue` 候选直接铺 `variableAssets`，台账补到 29 条后，新建评估页的特征选择器也自然能选到这 3 条外数/征信资产（含 `sourceType: 'credit'`）。

---

## 七、口径收敛：外数档案删掉「渠道」轴，改为两轴（2026-11-03）

用户口径：「合作机构应该只有 百行 / 朴道 / 钱塘 / 其他，供应商应该是 学信网 / 字节 / 京东 / 海纳 之类」。原档案是三轴（合作机构 / 渠道 channel / 供应商），而渠道与供应商回答的是同一个问题「这批数从谁来」，并列导致一个事实要填两格、列表与导出都要多维护一维。现整轴删除 `channel`，迁移规则（逐条确认）：渠道值非空则**覆盖**原供应商；非四档的出数方（学信网 / 上数金科）合作机构记「其他」、本名转供应商；原供应商恒普 / 海纳 / 内部 不删，留在候选池。

| 改动 | 内容 | 落地位置 |
|---|---|---|
| 字典两轴化 | `COOPERATION_ORG_OPTIONS` 四档简称 + `SUPPLIER_OPTIONS` 八个；删 `CHANNEL_OPTIONS`；全称→简称别名表配 `normalizeCooperationOrg`（未命中落「其他」）；`COOPERATION_ORG_BY_PREFIX` 前缀登记表作为迁移的唯一事实源 | `external-data/mock/orgDictionaries.ts` |
| 档案 schema 与种子 | 类型删 `channel: string`；21 条迁移为 `XUEXIN_*`→其他/学信网（7）、`PD_*`→朴道/字节（覆盖原「内部」，7）、`BH_*`→百行/京东（覆盖原「海纳」，6）、`SHGJ_*`→其他/上数金科（1） | `external-data/mock/archiveProducts.ts` |
| 列表页 | 去「渠道」列与筛选项、CSV 表头去渠道；供应商拆两份——筛选取存量派生值（避免选到空结果）、新建表单取字典全集且 `allow-create` | `external-data/pages/Archive.vue` |
| 详情页 | 头部描述列表与编辑表单去渠道；「外数调用样本情况分析」的**分组轴由渠道改为供应商**（候选 = 全部供应商 + 同合作机构下存量供应商），相关标识符整体改名（`evalSelectedSuppliers` / `activeSuppliers` 等） | `external-data/pages/ArchiveDetail.vue` |
| 合同侧悬挂引用 | 选外数的 label 原拼「供应商/渠道」、关键字搜索命中数组含 `it.channel`、`billingMode` 默认值靠 `p?.channel === '文件批量'` 判定、表头解析新建产品时写入 `channel: '在线查询'` —— 全部去掉，`billingMode` 统一默认「查询计费」并由用户改选 | `budget/pages/ContractCreate.vue`、`ContractDetail.vue` |
| 结算核销死控件 | 「对接渠道」筛选项候选直接复用 `supplierOptions`（与左边「合作机构」一模一样），且 `form.channelId` 无任何消费点 —— 整条剔除 | `budget/pages/settlement/WriteoffPanel.vue` |
| 守卫脚本 | G1 重写为两轴校验：合作机构命中四档、供应商命中 `SUPPLIER_OPTIONS`、种子与前缀登记表一致、**残留 `channel` 字段即失败**；十二家征信机构主数据仍要求存在（回溯出数主体），只是不再充当档案下拉候选池 | `scripts/verify-external-data-consistency.js` |
| 本地副本 | 人工编辑副本换键 `v2`→`v3`：旧副本存的是旧轴字段，叠加会造成「代码改了界面不变」且无法自动纠正 | `external-data/mock/archiveProducts.ts` |

### 遗留（本次未做，需先定产品口径）

- ✅ **合同页「合作机构」与档案两轴没打通** —— 已于同日整合，见下方 [7.1 合同域两轴整合](#71-合同域两轴整合2026-11-03-同日追加)。
- ✅ **钱塘四档下 0 条档案** —— 已建档 `QT_*` 三条（ED-022/023/024），G2 警告消除。
- **G8 警告**：budget `SUP-001` 名为「学信网」不在十二家全称主数据中 —— 新口径下它本就不是持牌征信机构，应降级为供应商（用户 2026-11-03 明确「主体与 SUP-ID 不动」，故保留为 warning，等真实接 API 时再收）。
- `apps/dfd-app/src/mock/external-data-v1.ts` 等仍带 `channelId`，属另一个应用的独立 mock，本次未动。

### 7.1 合同域两轴整合（2026-11-03 同日追加）

用户选定三项口径：**① 合同域拆成两轴与档案对齐**（表单改为「合作机构（四档）+ 供应商」两个输入，签约主体由两轴派生）；**② 十二家签约主体与 SUP-ID 一律不动**，只补一张归属表（签报 `partnerOrgs`、定价档案、结算/核销/用量都按 SUP-ID 取值，改键会牵动整条预算链）；**③ 存量警告只勾「建档钱塘 3 条」**。

| 改动 | 内容 | 落地位置 |
|---|---|---|
| 唯一映射表 | `ORG_AXES_BY_SUP_ID`（12 条）：持牌三家 `SUP-002/003/004` 的合作机构落 百行/朴道/钱塘 且**供应商轴留空**（它们是合规通道，`BH_*` 的实际供数方是京东、`PD_*` 是字节）；其余九家 合作机构=其他、主体本名即供应商。配 `axesOfSubject()`（主体→两轴，认不出兜底为 其他 + 本名转供应商）与 `subjectOfAxes()`（两轴→主体，派生不出返回空串，绝不臆造 SUP-ID）；两轴候选复用档案侧 `COOPERATION_ORG_OPTIONS` / `SUPPLIER_OPTIONS`，budget 不再自写枚举 | `budget/api/supplierDictionary.ts` |
| 新建合同 | 三列并排：合作机构（四档 select）/ 供应商（`allow-create`）/ 签约主体（**只读派生**）；两轴任一变化即重派生主体并清掉跨机构的框架合同、补充合同与已勾外数；派生不出时出黄色告警且 `supplier` 校验拦截（不允许空主体进签报额度与定价链路）；勾选外数反向回填两轴（跨机构只填合作机构并提示）；表头解析新建档案时写入两轴 | `budget/pages/ContractCreate.vue` |
| 合同详情 | 编辑态同步两轴；存量合同按 `axesOfSubject(contract.supplier)` **反解**两轴，保存时两轴与派生主体一起写回；加载期间用 `initializing` 标志跳过 watcher —— 种子里的「同盾科技」「中诚信」不在十二家名单，派生为空，不加标志会把原有主体抹掉 | `budget/pages/ContractDetail.vue` |
| 数据面 | `ContractItem` 补 `cooperationOrg?` / `dataSupplier?`（store 同名接口同步），7 条种子按映射表口径回填两轴（百行/朴道/钱塘 三条持牌 + 同盾科技、中诚信 记 其他+本名） | `budget/api/contract.ts`、`budget/stores/contract.ts` |
| 钱塘建档 | `QT_CREDIT_RISK_SCORE`（ED-022 / IF-0022 / 评分 89）、`QT_FRAUD_BLACKLIST`（ED-023 / IF-0023 / 92）、`QT_ENTERPRISE_TAX_INVOICE`（ED-024 / IF-0024 / 85，在线批量 + 落库表 `dwd_qt_enterprise_tax_invoice_detail`）；供应商轴记「其他」——持牌机构自营出数，实际供数厂商业务侧尚未登记；档案总数 21→24，与 C004 钱塘框架协议的 `productCount=3` 对齐 | `external-data/mock/archiveProducts.ts` |
| 守卫 G10 | 新增「两轴 ↔ 签约主体闭环」：主体名单必须全覆盖、归属表合作机构必须在四档内、每个持牌档恰好一家主体、12 家往返自洽（主体→两轴→主体回到本体）、7 条合同种子的两轴必须等于按主体反解的结果、合同页不得再退回 `partnerOrgNames` 填下拉；另出两类警告 —— 档案两轴组合派生不出主体、主体本名未进 `SUPPLIER_OPTIONS`（需手输） | `scripts/verify-external-data-consistency.js` |

**派生不出主体时怎么显示**：新建页只读框留空 + 黄色告警（此时根本没有存量主体）；详情页 `derivedSubject = subjectOfAxes(...) || form.supplier` —— 回显存量主体并告警说明「仍按原主体记录」，避免编辑老合同时报出「主体丢了」的错觉。两轴组合筛出 0 条档案时，候选区提示旁给一条「点此清空供应商轴」的出口，但不自动抹掉人工填的供应商（万一是有意保留的写法）。

**已知摩擦（不在本次范围）**：其他八家主体（`SUP-006…012`）档案为 0 条，合同选它们筛出 0 条外数是**诚实的空**，需业务侧建档才有内容；`SUPPLIER_OPTIONS` 只收了档案里常用的八个厂商，主体本名（厦门信息集团、中银保信等七个）要靠 `allow-create` 手输，G10 已把这条挂成常驻警告。

**验证**：`npx vite build` 通过（12.92s）；守卫 10 通过 / 2 警告 / 0 失败（G1 档案 24 条、G2 四处同源不再警告、G8 学信网 + G10 供应商枚举为仅剩警告），并对 G10 做过破坏性自检（改坏 `SUP-004` 归属与 C001 两轴后确实报 4 类失败，恢复后复绿）；`eslint` 在新增行 0 命中；浏览器实测 dev 5176 —— 新建页合作机构恰好四项、供应商八项可 create、百行→百行征信有限公司 / 其他+学信网→学信网 / 钱塘→钱塘征信有限公司 / 其他+恒普→空主体 + 黄色告警、外数候选 BH 6 条→切朴道自动清勾并换成 PD 7 条、C001 编辑回填 百行/空/百行征信有限公司 且 transfer 筛出 6 条 BH、C006 存量主体未被抹空且回显告警、0 条档案时的清空链接点击后恢复 3 条钱塘档案、档案列表 24 条含钱塘三条（合作机构 钱塘 / 供应商 其他）、合同列表 7 条无「渠道」列且筛选分组正常、全程控制台 error 与 warning 各 0 条。截图仍不可用（`NATIVE_BROWSER_VIEWPORT_UNAVAILABLE`），取证靠 a11y 快照与 DOM 读取。

**覆盖关系**：本决策**覆盖需求文档 R09**（合作机构用十二家工商全称、全文不用「征信机构」表述）；`CreditAgency` 页与十二家主数据保留；variable-hub 效果侧的「渠道」（`generator.ts` 的 `PLATFORMS` 二十四家）是另一套维度，本次不涉及；外数回溯/通知侧的 `channel` 是**通知渠道**（`notify.ts`、`backtrackPersist.ts`），与档案业务字段同名不同义，未动。

**验证**：`npx vite build` 通过（11.57s）；守卫脚本 8 通过 / 2 警告 / 0 失败；`eslint` 在本次新增行上 0 命中（剩 86 个存量报错全在既有行，均为 `curly`/`no-console`/`eqeqeq`）；浏览器实测 dev 5176 —— 列表共 21 条、表头 11 列无「渠道」、合作机构只出现 其他(8)/朴道(7)/百行(6)、供应商为 学信网(7)/字节(7)/京东(6)/上数金科(1)、新建弹窗合作机构四项且不可 create / 供应商八项可 create、详情页头部无渠道、效果评估候选为 `全部供应商 / 学信网 / 上数金科`、合同页 21 条外数 meta 只剩供应商（无 `—` 残留）、三页控制台零 error。**截图未能产出**（native browser view 隐藏，`NATIVE_BROWSER_VIEWPORT_UNAVAILABLE`），取证靠 a11y 快照与 DOM 读取。

---

## 附录 A：已验证连通项（避免误判）

走查确认以下环节现状是通的，串联时应视为已解决：

1. **效果任务引用上游评估任务**：`effect-tasks/create.vue:197-226` 按契约 `fromKinds` 过滤候选、覆盖数取最近已结束实例口径、选后自动预填引用字段 —— 契约驱动的血缘是真实生效的。
2. **评估完成回写特征档案**：`evaluation-task-store.ts:1295/1465` finishRun → `VariableStatusStore.setEvaluation(quality/missingRate/passRate)` —— 台账能拿到最新评估指标。
3. **脚本引用面与删除保护**：`ScriptsPanel.vue:214-292` 展示被哪些任务引用、被引用时拦截删除。
4. **执行记录详情的扇出导航**：`run-record/detail.vue` 逐特征结果 → 特征详情；报告 → 弹窗（含口径脚本快照链接回 `/tasks/scripts/:id`）；名单行 → 特征详情；契约不齐备提示 + "去任务配置核对"。
5. **runs ↔ tasks 双向互跳**：runs 列表/详情回任务（含 `?taskId=` 定位），任务页/任务详情去 `/runs`。
6. **效果名单推送留痕**：推送开关/对象写入批次快照与执行日志，实例详情可见。
7. **台账详情内嵌效果卡**：`detail.vue:396` 引入 EffectCard，标记评论数与推荐列表同源（opinion-store 单源）。
8. **旧路由兼容**：`/evaluation/*`、`/effect-tasks/*` 全量 redirect，外部链接不失效。

## 附录 B：复现与验证命令

以下 grep 可复核本文结论（均在 `apps/risk-app/src` 下执行）：

```bash
# A1 死路由：progress / list 在路由表中不存在
grep -rn "evaluation/progress\|evaluation/list" . ; grep -n "evaluation/list\|evaluation/progress" router.ts registry.ts

# C2 零双向导航：外数模块跳出的目标全清单
grep -rn "router\.push" modules/external-data --include="*.vue" | grep -v "variable-hub/external-data\|RiskExternalData"

# A3 决策审计无入口
grep -rn "explore/audit" . --include="*.vue" | grep -v pages/explore/audit

# C3 落库与台账无衔接
grep -rn "台账\|variable-management\|特征注册" modules/external-data/pages/BacktrackPersist.vue modules/external-data/composables/useBacktrackPersist.ts

# C7 标记的唯一消费点
grep -rn "listMarks" modules/variable-hub --include="*.vue" --include="*.ts" | grep -v opinion-store
```

## 附录 C：建议的分析顺序（仅提示，非方案）

1. 先定性 C1/C2/C3（外数孤岛）：这是产品口径问题——外数评估到底要不要并入 /tasks + /runs 统一体系？结论直接决定 A1、C4、D2 的处理方式。
2. 再看 C4 + external_access 脚本：若准入评估并入任务域，注册表开放 creatable 即可复用现成口径，改动小、收益大。
3. A1-A4 属于低风险快速修复（补路由/删死代码/补菜单项/接真实报告），可在口径明确前先行处理。**→ 已于本次完成。**
4. C6/C7 反馈回路属于二期增强，优先级取决于效果运营是否要给业务方真实使用。**→ 本次只落了导航/引导层（入口互跳 + 建复评任务引导），数据回流仍未做。**
