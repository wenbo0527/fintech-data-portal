# ARCHITECTURE.md · 数字社区项目

> **版本**: v1.1 · 2026-08-10 拍板 · 2026-11-23 按实测刷新（DEC-01 归属、T4 解耦、入口与部署口径）
> **维护**: data_community_doc（PM WBS L5 收口）
> **关联**: [`docs/architecture/README.md`](docs/architecture/README.md) 技术细节 · [`CONTRIBUTING.md`](CONTRIBUTING.md) 开发流程 · [`docs/architecture/deploy-prefix-2026-11.md`](docs/architecture/deploy-prefix-2026-11.md) 部署口径实测

---

## 1. 项目概览

### 1.1 项目定位

**数字社区门户（data-community-platform）**—— 数字社区研发团队 2 的核心项目，前端展示型数据社区门户。

- **技术栈**: Vue 3.4 + Vite 5.1 + TypeScript 5.3 + Arco Design 2.55 + Pinia 2.1
- **代码量**: `apps/*/src` 共 **56 万行 Vue+TS**（含 JS/TSX 则 73 万行）；加上冻结的 `archive/legacy-src/` 全仓约 111 万行
- **子应用**: 14 个目录 —— **10 个活跃**（data-community / mkt / risk / dex / touch / horizontal-canvas / portal / semantic / report-monitor 前后端，其中 6 个进 `pnpm dev` 编排）+ **4 个已摘出 workspace**（admin / dmt / dfd / asset）
- **归档 ≠ 已合并**: 那 4 个应用自己文件里写的「已合并至 data-community-app」经逐文件核对，**只有 dmt 基本成立**；dfd 是本次 T4 才真正并入（跨应用闭包 66 文件 / 29,888 行 → 0），dex 的 `exploration/` 核心与 admin 的 41 文件 / 10,748 行 **并未合并**。归档也不等于下线：4 者在现网 `:8443` 上仍返回 200
- **部署**: 子应用独立静态部署（8443 生产 + 8444 staging + 8445 ask-xiaoshu），主入口由外部 portal-shell 独立仓库承载

### 1.2 团队结构

| 角色 | 数量 | 职责 |
|:---|:--:|:---|
| **PM**（data_community_pm）| 1 | 派单 · 立项目 · 跨组协调 |
| **arch**（data_community_arch）| 1 | 架构设计 · 跨应用治理 · 技术决策 |
| **dev**（data_community_dev）| 1+ | 子应用开发 · 代码 review |
| **qa**（data_community_qa）| 1 | 测试覆盖 · QA 流程 |
| **doc**（data_community_doc）| 1 | 文档沉淀 · Wiki · lessons |

### 1.3 边界声明

✅ **允许**: 数字社区 6 子应用 + mock 数据 + 业务逻辑
❌ **禁止**: AI 诊断器代码 (`/Users/wenbo/Documents/project/AI产品专家团/`)
❌ **禁止**: 问小数代码 (`/Users/wenbo/Documents/project/ask-xiaoshu/`)

---

## 2. 仓库结构

### 2.1 顶层布局

```
data_community/
├── apps/                        # pnpm workspace 子应用（14 个目录）
│   ├── data-community-app/      # 数据社区合并应用（DEC-01 权威 · 5185）
│   ├── mkt-app/                 # 营销中台（最大，DEC-01 权威 · 5177）
│   ├── risk-app/                # 风控应用（变量/特征/外数/离线模型 · 5176）
│   ├── dex-app/                 # 数据探索（5180）
│   ├── touch/                   # 触达管理（5181）
│   ├── horizontal-canvas/       # 横版画布（5175）
│   ├── portal-app/              # 视觉首页/演示稿（3000 · 2026-11-18 新增 · 非入口）
│   ├── semantic-app/            # 语义应用（8100）
│   ├── report-monitor/          # 报表监控（未部署 prod）
│   ├── report-monitor-backend/  # 报表后端（无 src，data/dist）
│   ├── admin-app/               # ⚠️ 已摘出 workspace（现网仍服务，能力未合并）
│   ├── dmt-app/                 # ⚠️ 已摘出（能力已并入 data-community-app）
│   ├── dfd-app/                 # ⚠️ 已摘出（能力已并入 data-community-app，2026-11 T4）
│   └── asset-app/               # ⚠️ 已摘出
├── packages/                    # 4 个共享包
│   ├── shared-api/              # @app/shared-api 请求封装（dist 未构建，走 src 解析 → D1）
│   ├── shared-utils/            # @app/shared-utils 工具函数（dca 唯一残留跨包依赖：copy.ts 36 行）
│   ├── lineage-graph/           # @app/lineage-graph 血缘图组件
│   └── semantic-contract/       # @data-community/semantic-contract 语义契约
├── archive/
│   └── legacy-src/              # ⚠️ 主应用已冻结（2026-08-10 文博拍板）
│       └── DEPRECATED.md        # 主应用冻结声明（「陪跑计划」仍未迁完，此处不能退役）
├── docs/                        # 57 个 md（架构、治理、迁移、PRD、报告）
├── scripts/                     # 编排 + 部署 + 4 道守卫 + worktree + 监控
├── shared/                      # 共享 Vite 配置
├── public/                      # 静态资源（旧 src/ 时代遗留）
├── tests/                       # 单元 + E2E 测试
├── .github/                     # GH Actions + PR/Issue 模板 + CODEOWNERS
└── pnpm-workspace.yaml          # 'apps/*' + 'packages/*'，再 negation 摘出 4 个冻结应用
```

### 2.2 核心模块（以 mkt-app 为例）

```
apps/mkt-app/src/               # 2026-11-23 实测
├── pages/         388  业务视图（单一棵树，无双份）
├── components/    58   通用组件
├── utils/         79   工具（含 mockRequest）
├── mock/          22   mock 数据源
├── api/           23   API 接口（mock 化）
├── composables/   17   跨页面复用
├── types/         11   TS 类型契约
├── router/        9    路由模块（modules/ 子目录按域拆分）
├── stores/        8    Pinia stores
└── services/      5    业务服务（mock 化）
```

详见 [`docs/architecture/README.md`](docs/architecture/README.md) 详细版。

---

## 3. 部署架构

### 3.1 主入口（portal-shell + iframe）

> portal-shell 为独立外部仓库，不在本仓库内。下表为 2026-11-23 实测（`curl` + 产物 grep），不是约定值。

| 角色 | 实现 | 挂载 | 说明 |
|:--|:--|:--|:--|
| 主入口 | `portal-shell`（Vue 3 + Arco，独立仓库）| `/home/` | 域字典 `src/config/domainDictionary.ts` 共 **86 条 Feature**，`iframeUrl = VITE_PUBLIC_BASE_URL + Feature.url` |
| 活跃子应用 | 静态构建，base = 各自前缀 | `/risk/` `/mkt/` `/data-community/` `/dex/` `/touch/` `/horizontal-canvas/` `/semantic-app/` | 7 个前缀返回各自 index（title 与 `src="/<前缀>/assets/…"` 可自证） |
| 冻结子应用 | 仍在线 | `/admin/` `/dmt/` `/dfd/` `/asset/` | 已从 workspace 摘出但**未下线**，退役需单独的 nginx/静态目录动作 |
| 未部署 | — | `/report-monitor/` `/portal/` | 都返回 200，但内容是 portal-shell 首页（兜底/重复挂载），**200 ≠ 已部署** |

- 生产 origin：**`https://118.196.79.130:8443`**。80 端口会 301 到不带端口的 `https://www.wenbodemo.com`，那个 vhost 只挂了 `/home/`，子应用路径一律 500 —— 证书自签。
- 完整实测矩阵、契约链与运维待办见 [docs/architecture/deploy-prefix-2026-11.md](docs/architecture/deploy-prefix-2026-11.md)。

### 3.2 部署环境

| 环境 | 端口 | URL | 触发 |
|:--|:--|:--|:--|
| **Production** | 8443 | `https://118.196.79.130:8443/` | 手动（main 分支）|
| **Staging** | 8444 | `https://118.196.79.130:8444/` | develop 分支 |
| **ask-xiaoshu** | 8445 | `https://118.196.79.130:8445/` | 独立 |

### 3.3 部署流程（scripts/）

- **deploy.sh**: 主部署脚本（符号链接原子切换 + 安全门 + REMOTE_BASE 独立）
- **rollback.sh**: 回滚脚本（保留前 N 个版本 · 快速回退）
- **STAGING_CONFIRM**: staging 部署确认门（防止误发布）
- **nginx_path**: nginx 路径映射（fix(scripts) TASK-20260810）

详细：见 scripts/deploy.sh 与 scripts/rollback.sh 部署逻辑。

### 3.4 入口清单的四处冗余与一致性闸门

「有哪些域 / 哪个页面在哪个地址 / 跑在哪个端口」这件事目前散在四处，且都自称事实源：

| 清单 | 位置 | 实际状态 |
|:--|:--|:--|
| A. 外部域字典 | `portal-shell/src/config/domainDictionary.ts` | **真入口**，唯一驱动 iframe |
| B. 各应用注册表 | `apps/<app>/src/registry.ts` | 运行时无人消费；端口字段已说谎（dfd 写 5185、dmt 写 5184，实际都是 5181） |
| C. portal-app 域清单 | `apps/portal-app/src/mock/home.ts` | 9 个域键、0 跳转地址，且用的是 DEC-01 已废弃的旧信息架构 → 定性为视觉首页，不计入入口 |
| D. vite `base` + 各 app router | `apps/*/vite.config.ts`、`src/router*` | **路由与前缀的唯一事实源** |

闸门（都能自证有效性，改归属/入口/前缀后必须跑）：

| 命令 | 覆盖 | 说明 |
|:--|:--|:--|
| `pnpm verify:entry-registry` | R1–R7 | D 为基准校验 A/B/C；加 `--portal-shell <路径>` 启用字典逐条与 origin 口径，再加 `--probe` 实测现网 HTTP 码 |
| `pnpm verify:entry-registry:selftest` | 19 条断言 | 含负例（段数不符、前缀不符、纯参数路由、http/缺端口 origin），证明闸门不是永远绿 |
| `bash scripts/check-base-consistency.sh` | vite base ↔ nginx 前缀 | CI job；源自 2026-10-27 HC 白屏事故，例外须显式列出并写理由 |
| `pnpm verify:dec01` | 跨应用耦合活性 | DEC-01 退役闸门，`--closure <app> --json` 取迁移最小集 |

---

## 4. 开发流程

### 4.1 工作流（5 角色 SOP）

1. **PM 派单**（候选 #172 v3.0 范本）→ `task_tool.py create`
2. **接单** → `task_tool.py update --status in_progress`
3. **3 事实计划** → `tmp/<task-id>-plan.md`（30min 内）
4. **实施** → 工作量 + PR + report
5. **done** → `task_tool.py update --status done` + `tmp/<task-id>-report.md` + daily + lessons

### 4.2 分支规约

详见 [`docs/governance/BRANCH_NAMING.md`](docs/governance/BRANCH_NAMING.md)（PR #13 已落地）：

- **标准前缀**: `feat/` / `fix/` / `refactor/` / `docs/` / `chore/` / `hotfix/`
- **命名格式**: `<prefix>/<scope>-<short-desc>`（如 `feat/risk-app-variable-hub-v1`）
- **废弃命名**: `chain/` / `migration/` / `merge/` / `pr-a/b/c/` / `feature/refactor-*`

### 4.3 提交规范

详见 Husky v9 commit-（PR #14 已落地）+ [`docs/governance/BRANCH_NAMING.md`](docs/governance/BRANCH_NAMING.md)：

- **Conventional Commits**: `<type>(<scope>): <subject>`
- **type**: feat / fix / refactor / docs / chore / hotfix / test / build / ci / style / perf / revert
- **scope**: 子应用名或业务模块
- **subject**: 1-100 字符

### 4.4 PR 流程

详见 [`.github/PULL_REQUEST_TEMPLATE.md`](.github/PULL_REQUEST_TEMPLATE.md)（PR #15 已落地）：

1. 创建分支（不直接 push main）
2. commit + push
3. `gh pr create --base main --head <branch>`
4. 等 review（CODEOWNERS 自动分配 reviewer）
5. merge

### 4.5 CI 触发条件（2026-11-23 核对 `.github/workflows/ci.yml`）

- **push 触发**：仅 `main` 与 `develop`（`tags-ignore: archive/*`）
- **pull_request 触发**：同上两个分支
- 因此特性分支（`feat/*` 等）本身不跑 CI，**要等开 PR 才跑**；这也意味着闸门在红的时候（例如 portal-app 曾长期让 base-consistency 失败）是开 PR 才暴露的。
- 早期文档写的「7 个分支类型都触发」与实际配置不符，已按现配置更正。

---

## 5. 监控告警

### 5.1 worktree-monitor

- **功能**: 监控多个 git worktree 的健康状态
- **触发**: 派蒙 cron `8bdfc1dd` 每 1h
- **告警**: worktree 数量异常 / 锁状态 / mtime 滞后

### 5.2 nginx 监控

- **功能**: 监控 nginx 路径映射（8443/8444/8445）
- **触发**: cron（PM 派单）
- **告警**: 服务不可达 / 路径映射错误

### 5.3 8 文件大小监控

- **功能**: 监控 7 agent × 8 文件（AGENTS / SOUL / TOOLS / USER / IDENT / HEARTBEAT / MEMORY / BOOTSTRAP）
- **触发**: 派蒙 cron `e345f601` 每 1h
- **阈值**: 0B=OK / >2KB=⚠️ / >4KB=🔴 / TOOLS.md=920B default template 🔴
- **数据库**: `/Users/wenbo/.openclaw/workspace-agents/paimon/data/file_size_monitor_*.db`

### 5.4 doc self-cron

- **功能**: doc agent 失联检测 + broker 兜底
- **当前版本**: v1.7-D-8（综合活性判定 + 阈值 240min + task board + session status）
- **触发**: openclaw cron `b2497b26` 每 4h

---

## 6. archive/legacy-src/ 主应用冻结（2026-08-10 文博拍板）

### 6.1 决策

2026-08-10 文博拍板 src/ 主应用冻结（PM 推荐方案 A + 4 重证据）。

### 6.2 实施

- ✅ [`archive/legacy-src/DEPRECATED.md`](archive/legacy-src/DEPRECATED.md) 已落地（PR #12 · commit 7e0facef）
- ✅ `package.json` 加 `"deprecated"` 字段（npm 警告但不阻塞）
- ⏳ 17 个孤儿模块处置方案（arch 主导 · TASK-20260810-22D94472）

### 6.3 影响

- ❌ 新功能不在 archive/legacy-src/ 开发（除非获得 C 级拍板）
- ✅ 新功能只能在 apps/* 子应用或 portal-shell 工程开发
- ⚠️ archive/legacy-src/ 仅承担本地开发调试 + qiankun shell 参考 + 历史兼容 fallback

详见 [`archive/legacy-src/DEPRECATED.md`](archive/legacy-src/DEPRECATED.md)。

### 6.4 应用归属与跨应用耦合（DEC-01，2026-11 治理轮）

- **归属规则**：同一能力以 `data-community-app` 与 `mkt-app` 为准，且采用「**先并入再退役**」语义 —— 非权威侧若更完整，必须先把它多出来的实现并进来，不允许直接丢弃。
- **例外**：变量 / 特征 / 离线模型归 `risk-app`（`apps/risk-app/src/modules/variable-hub` 等），dca 侧重复实现已删除；**陪跑计划保留不删**，其实现仍住在冻结树里，须先迁入 `risk-app`，这是冻结树退役的第三道闸门。
- **解耦成果**：`data-community-app → dfd-app` 的跨应用依赖闭包由 **66 文件 / 29,888 行降到 0**，`mkt-app` 本就为 0；现在 dca 仅剩一条跨包边 `packages/shared-utils/src/copy.ts`（36 行，属包解析问题 D1，不是跨应用耦合）。`src/router/index.ts` 的 **130 条 `component:` 记录全部解析到本应用目录**（逐条按 import 路径核过，无一指向 dfd）。
- **闸门读数**：`BLOCKER 0` / `MERGE_FIRST 27 文件 17,914 行` / `BOTH_DEAD 7 文件 4,078 行` / `NO_COUNTERPART 488 文件 154,754 行`。`NO_COUNTERPART` 是「规则没覆盖」而非「可删」，需 T5 逐项另判。
- 台账：[docs/architecture/dec01-migration-checklist-2026-11.md](docs/architecture/dec01-migration-checklist-2026-11.md)、[docs/architecture/cleanup-plan-2026-11.md](docs/architecture/cleanup-plan-2026-11.md)。

---

## 7. 关联文档

### 7.1 PM/arch 沉淀报告

| 文档 | 内容 | 来源 |
|:---|:---|:---|
| [`docs/governance/BRANCH_NAMING.md`](docs/governance/BRANCH_NAMING.md) | 分支命名规约（v1.0）| doc + PM |
| [`docs/governance/BRANCH_CLEANUP.md`](docs/governance/BRANCH_CLEANUP.md) | 分支清理 SOP（v1.0）| doc + PM |
| [`archive/legacy-src/DEPRECATED.md`](archive/legacy-src/DEPRECATED.md) | 主应用冻结声明 | PM + doc |
| [`docs/architecture/deploy-prefix-2026-11.md`](docs/architecture/deploy-prefix-2026-11.md) | 部署前缀口径与现网实测（2026-11-23 定案） | 架构治理轮 |
| [`docs/architecture/cleanup-plan-2026-11.md`](docs/architecture/cleanup-plan-2026-11.md) | 全仓冗余扫描与整洁优化方案（§10 = DEC-01） | 架构治理轮 |
| [`docs/architecture/dec01-migration-checklist-2026-11.md`](docs/architecture/dec01-migration-checklist-2026-11.md) | DEC-01 / T0–T6 迁移台账与批次数字 | 架构治理轮 |
| [`docs/architecture/migration-roadmap-2026-11.md`](docs/architecture/migration-roadmap-2026-11.md) | 后续处理路线图 | 架构治理轮 |
| [`docs/architecture/entry-points-2026-11.dot`](docs/architecture/entry-points-2026-11.dot) · [`boot-flow-2026-11.dot`](docs/architecture/boot-flow-2026-11.dot) · [`dependency-gap-2026-11.dot`](docs/architecture/dependency-gap-2026-11.dot) | 入口 / 启动链路 / 依赖缺口的 graphviz 视图 | 架构治理轮 |

### 7.2 PR 落地清单（WBS L1-L3 14 个 done 任务）

| PR | 任务 | 内容 |
|:--|:--|:--|
| #13 | TASK-A31C1256 | 分支命名规约 + 清理 SOP |
| #14 | TASK-7C06C747 | Husky v9 commit-msg + pre-commit |
| #15 | TASK-B298F6C5 | PR/Issue 模板 + CODEOWNERS |
| #16 | TASK-42BA89C9 | CI 触发分支扩展 |
| chore commit 7e0facef | TASK-EFBCDE05 | archive/legacy-src/DEPRECATED.md |

### 7.3 排期

- **WBS L1-L3**（14 任务 done）：PR 治理 + CI 治理
- **WBS L4**（P1 · 本周内）：TASK-4A79A4B4 Turborepo 调研 · TASK-AEBBCA03 cron v1.7-D-8 升级
- **WBS L5**（P2 · Q4 启动）：本任务（ARCHITECTURE + CONTRIBUTING）+ 17 孤儿模块清理

---

*数字社区研发团队 2 · v1.1 · 2026-08-10 拍板生效（TASK-20260810-607A63EF）· 2026-11-23 按实测刷新应用清单、入口、部署与归属章节*