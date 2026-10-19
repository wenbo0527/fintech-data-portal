# ARCHITECTURE.md · 数字社区项目

> **版本**: v1.0 · 2026-08-10 拍板 · 任务 TASK-20260810-607A63EF 落地
> **维护**: data_community_doc（PM WBS L5 收口）
> **关联**: [`docs/architecture/README.md`](docs/architecture/README.md) 技术细节 · [`CONTRIBUTING.md`](CONTRIBUTING.md) 开发流程

---

## 1. 项目概览

### 1.1 项目定位

**数字社区门户（data-community-platform）**—— 数字社区研发团队 2 的核心项目，前端展示型数据社区门户。

- **技术栈**: Vue 3.4 + Vite 5 + TypeScript + Arco Design 2.55
- **代码量**: ~41 万行（Vue + TS）
- **子应用**: 8 个活跃子应用（mkt/dex/risk/touch/horizontal-canvas/report-monitor/data-community-app/semantic-app）+ 4 个已归档（admin/dmt/dfd/asset，已合并至 data-community-app）
- **部署**: 子应用独立部署（8443 + 8444 staging + 8445 ask-xiaoshu），主入口由外部 portal-shell 独立仓库承载

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
├── apps/                        # pnpm workspace 子应用
│   ├── mkt-app/                 # 营销中台（最大）
│   ├── dex-app/                 # 数据探索
│   ├── risk-app/                # 风控应用
│   ├── touch/                   # 触达管理
│   ├── horizontal-canvas/       # 横版画布
│   ├── report-monitor/          # 报表监控
│   ├── report-monitor-backend/  # 报表后端
│   ├── data-community-app/       # 数据社区合并应用
│   ├── semantic-app/            # 语义应用
│   ├── admin-app/               # ⚠️ 已归档（ARCHIVED 2026-09-09）
│   ├── dmt-app/                 # ⚠️ 已归档
│   ├── dfd-app/                 # ⚠️ 已归档
│   └── asset-app/               # ⚠️ 已归档
├── packages/
│   ├── shared-api/              # 共享 axios 封装
│   ├── shared-utils/            # 共享工具函数
│   ├── lineage-graph/           # 血缘图组件
│   └── semantic-contract/       # 语义契约
├── archive/
│   └── legacy-src/              # ⚠️ 主应用已冻结（2026-08-10 文博拍板）
│       └── DEPRECATED.md        # 主应用冻结声明
├── docs/                        # 项目文档（含架构文档详细版）
├── scripts/                     # 部署 + worktree + 监控脚本
├── shared/                      # 共享 Vite 配置
├── public/                      # 静态资源
├── tests/                       # 单元 + E2E 测试
├── .github/                     # GH Actions + PR/Issue 模板 + CODEOWNERS
└── pnpm-workspace.yaml          # pnpm monorepo 配置
```

### 2.2 核心模块（以 mkt-app 为例）

```
apps/mkt-app/src/
├── pages/         437  业务视图
├── components/    58   通用组件
├── api/           27   API 接口（mock 化）
├── services/      5    业务服务（mock 化）
├── composables/   17   跨页面复用
├── stores/        8    Pinia stores
├── utils/         83   工具（含 mockRequest）
├── mock/          20   mock 数据源
├── types/         9    TS 类型契约
└── router/        9    路由模块
```

详见 [`docs/architecture/README.md`](docs/architecture/README.md) 详细版。

---

## 3. 部署架构

### 3.1 主入口（portal-shell + iframe 沙箱）

> portal-shell 为独立外部仓库，不在本仓库内。

| 角色 | 实现 | 路径 |
|:--|:--|:--|
| 主入口 | `portal-shell`（Vue 3 + Arco，独立仓库）| `/var/www/html/portal-shell/` |
| 子应用 | 8 个活跃独立静态构建 | `/var/www/html/{risk,mkt,dex,touch,horizontal-canvas,report-monitor,...}/` |
| 加载方式 | iframe 嵌入 | `https://118.196.79.130:8443/${key}/` |

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

### 4.5 CI 触发分支

详见 [`.github/workflows/ci.yml`](.github/workflows/ci.yml)（PR #16 待 merge）：

- push 触发: main + develop + feat/** + fix/** + refactor/** + docs/** + chore/**
- pull_request 触发: 同 7 个新分支类型

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

---

## 7. 关联文档

### 7.1 PM/arch 沉淀报告

| 文档 | 内容 | 来源 |
|:---|:---|:---|
| [`docs/governance/BRANCH_NAMING.md`](docs/governance/BRANCH_NAMING.md) | 分支命名规约（v1.0）| doc + PM |
| [`docs/governance/BRANCH_CLEANUP.md`](docs/governance/BRANCH_CLEANUP.md) | 分支清理 SOP（v1.0）| doc + PM |
| [`archive/legacy-src/DEPRECATED.md`](archive/legacy-src/DEPRECATED.md) | 主应用冻结声明 | PM + doc |

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

*数字社区研发团队 2 · v1.0 · 2026-08-10 拍板生效 · TASK-20260810-607A63EF 落地*