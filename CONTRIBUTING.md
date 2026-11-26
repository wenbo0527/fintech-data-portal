# CONTRIBUTING.md · 数字社区项目开发指南

> **版本**: v1.1 · 2026-08-10 拍板 · 2026-11-23 按仓库实际状态更正（钩子、端口、部署命令、覆盖率口径、失效链接）
> **维护**: data_community_doc（PM WBS L5 收口）
> **读者**: 数字社区研发团队 2 全体 + 新人 onboarding

---

## 1. 如何开始

### 1.1 环境要求

| 工具 | 版本 | 备注 |
|:---|:---|:---|
| **Node.js** | >= 18.0.0 | 项目 `engines.node >= 18.0.0` |
| **pnpm** | 9.15.4 | `packageManager` 字段锁定；`npm i -g pnpm@9.15.4` |
| **Git** | >= 2.30 | worktree 支持 |

### 1.2 Clone + Install

```bash
# 1. Clone 仓库
git clone git@github.com:wenbo0527/fintech-data-portal.git
cd fintech-data-portal

# 2. 安装依赖
pnpm install

# 3. 验证安装
pnpm --version  # 应输出 9.15.4
node --version  # 应 >= 18
```

> ⚠️ 更正：**本仓库没有任何 git 钩子**。没有 `.husky/`，`package.json` 里没有 husky /
> lint-staged / simple-git-hooks 依赖，`core.hooksPath` 未设置，`.git/hooks` 里除 `.sample`
> 外为空。旧文档写的「pnpm install 自动激活 Husky」「commit-msg 自动校验」不成立 ——
> 提交规范与 lint 目前**全靠自觉 + CI**，见 §3.2、§5.3。

### 1.3 Dev 启动

```bash
# 一键启动 6 个活跃子应用（scripts/dev-with-subapps.js 的固定集合）
pnpm run dev

# 启动指定子应用
pnpm --filter mkt-app dev              # :5177
pnpm --filter data-community-app dev   # :5185
```

打开 **`http://localhost:5185/data-community/`**（数据社区门户，功能最全的入口）。
其余端口：horizontal-canvas 5175 · risk 5176 · mkt 5177 · dex 5180 · touch 5181。

> 更正：`localhost:3000` 是 `portal-app`（一个 0 跳转的视觉首页，**不是** portal-shell）。
> portal-shell 是独立外部仓库，不在本仓库内，需单独 clone 后 `npm run dev`；
> 它的 dev 没有 `.env.development`，会退回源码里的兜底常量直接 iframe 现网（`fix/registry-point-to-merged-apps`
> 分支上是 `https://118.196.79.130:8443`，main 上仍是 `http://118.196.79.130`），
> 因此本地起 shell ≠ 联调本地子应用。

---

## 2. 工作流（5 角色 SOP）

### 2.1 任务看板

所有任务注册、更新、查询都通过 `task_tool.py`：

```bash
TASK_TOOL=/Users/wenbo/Documents/05_AgentOutput/agent_work/Tony/task_tool.py

# 查看我的任务
python3 $TASK_TOOL list --assignee data_community_doc

# 创建任务（仅 PM 角色）
python3 $TASK_TOOL create \
  --title "..." \
  --type SOP|PRD|研究|代码|支持|其他 \
  --assignee data_community_doc \
  --created-by 派蒙 \
  --priority P0|P1|P2|P3 \
  --deadline YYYY-MM-DD

# 更新任务
python3 $TASK_TOOL update --id TASK-xxx --status pending|in_progress|done|blocked|closed

# 接单 5min 内必回执
python3 $TASK_TOOL update --id TASK-xxx --updater <your-name> --status in_progress
```

### 2.2 派单 SOP（PM 5 角色内）

- ✅ PM 派单 doc/arch/dev/qa（5 角色内）
- ❌ PM 不擅自改其他 agent 任务
- ❌ PM 不擅自 close C 级任务（候选 #130/#132 备案）

### 2.3 任务 6 字段标准

- **id**: TASK-YYYYMMDD-XXXXXXXX（8 位 hex）
- **title**: 简短描述
- **type**: SOP / PRD / 研究 / 代码 / 支持 / 其他
- **assignee**: 5 角色之一
- **priority**: P0 / P1 / P2 / P3
- **deadline**: YYYY-MM-DD（v1.0 升级后可选）

### 2.4 Execute-Verify-Report（v1.8 SOP）

1. **接单** 5min 内 → `task_tool.py update --status in_progress`
2. **3 事实计划** 30min 内 → `tmp/<task-id>-plan.md`（任务理解 + 实施步骤 + 风险点）
3. **每小时** → 任务板进度更新
4. **done 前** → tmp/ 报告 + daily + lessons/

---

## 3. 代码规范

### 3.1 技术栈

| 领域 | 技术 | 版本 |
|:---|:---|:---|
| 前端框架 | Vue 3 | 3.4.x |
| 构建工具 | Vite | 5.x |
| 类型 | TypeScript | 5.x |
| UI 库 | Arco Design | 2.55.x |
| 状态 | Pinia | 2.x |
| 路由 | Vue Router | 4.x |
| 图表 | ECharts | 5.x |
| 画布 | @antv/x6 | 1.35.x |

### 3.2 Conventional Commits（必填）

```bash
# 格式
<type>(<scope>): <subject>

# 示例
feat(risk-app): 新增变量中心 V1
fix(mkt-lockfile): 同步 lockfile 至 2026-08-03
docs: 添加 ARCHITECTURE.md
chore(deps): 升级 Husky 到 v9
```

12 个支持的 type：feat / fix / refactor / docs / chore / hotfix / test / build / ci / style / perf / revert

> ⚠️ **没有任何自动校验**：无 husky、无 git 钩子、CI 里也没有 commit-lint job（7 个 job 见 §5.3）。
> 写错格式的 commit 不会被拦下，历史里因此混着 `feat(scripts+docs):` 这类复合 scope。靠 review 兜。

### 3.3 分支命名规约（必填）

```bash
# 格式
<prefix>/<scope>-<short-desc>

# 示例
feat/risk-app-variable-hub-v1
fix/mkt-lockfile-sync-2026-08-03
docs/branch-conventions
chore/bump-vite-5.4
```

6 个标准前缀：feat / fix / refactor / docs / chore / hotfix

详见 [`docs/governance/BRANCH_NAMING.md`](docs/governance/BRANCH_NAMING.md)（旧链接 `docs/BRANCH_NAMING.md` 已不存在）。

### 3.4 TypeScript 严格模式

```typescript
// ✅ 推荐
interface RiskVariable {
  id: string;
  name: string;
  formula: string;
}

// ❌ 避免
const config: any = { ... };
```

### 3.5 ESLint 与格式化

- 配置文件：**`.eslintrc.json`**（根，P1-1 已把 4 份合并为 1 份）+ `.eslintignore`
- 忽略名单要点：4 个归档应用（`apps/{asset,dfd,admin,dmt}-app/`）**整体不 lint**；
  冻结树 `archive/legacy-src/` 仍在扫描范围（所以有专门的 `pnpm lint:archive`）；
  `*.config.ts`（含各 app 的 vite 配置）、`public/`、根级 `src/mock/` 也被忽略
- 检查：`pnpm lint:check`（不带 --fix）；修：`pnpm lint`（带 `--fix`）
- 分域扫描：`pnpm lint:apps` / `pnpm lint:packages` / `pnpm lint:archive`
- ⚠️ 没有 hook 会替你跑，提交前自己跑一次；从被忽略的应用拷文件进权威应用时，
  它会带进一批此前不受约束的报错（本轮 T4 每批都清到 0 error，可参考其做法）

### 3.6 归属与入口约束（2026-11 治理后新增，改这几类文件前必读）

- **同一能力以 `data-community-app` / `mkt-app` 为准**（DEC-01），且语义是「先并入再退役」：
  非权威侧若更完整，必须先并入，不允许直接丢弃。变量 / 特征 / 离线模型归 `risk-app`；
  「陪跑计划」保留，实现仍待从 `archive/legacy-src/` 迁入 `risk-app`。
- **vite alias 必须与文件同批迁移**：先删 alias 会构建失败。dca 的 alias 表还服务于
  被它编译的**其他应用源码**（含 CSS `@import`），只看 dca 自己的 import 会误判成死别名。
- 改入口 / 前缀 / 端口 / 域字典后必须跑：`pnpm verify:entry-registry`（R1–R7）、
  `pnpm verify:dec01`、`bash scripts/check-base-consistency.sh`；三者都带 selftest 或控制探针。

---

## 4. 测试

### 4.1 测试类型

| 类型 | 命令 | 用途 |
|:---|:---|:---|
| **Unit** | `pnpm test:unit` | Vitest 单元测试 |
| **E2E** | `pnpm test:e2e` | Playwright E2E 测试 |
| **Performance** | `pnpm test:performance` | 性能基准 |
| **Responsive** | `pnpm test:responsive` | 响应式测试 |
| **Mock 纯净度** | `node apps/mkt-app/scripts/check-mock-purity.mjs` | 守护真实 API 调用 |

### 4.2 测试规范与真实覆盖

规范要求：新功能必带单元测试、关键路径必带 E2E、修 bug 必带回归测试。

现状必须一起看，否则「覆盖率 ≥ 80%」会被误读：

- `tests/` 有 50 个 spec 文件，而 `apps/*/src` + `packages/*/src` 共 **2,154 个源文件**。
- 仓库里最近的 `coverage/coverage-final.json` 生成于 **2026-08-02**，只覆盖 **17 个文件 / 3,546 条语句**，
  在这份极小分母上是 89.3% —— **对全仓的分母不到 1%**。它未被 git 跟踪，也不能代表今天的状态。
- `vitest.config.ts` 把 `@` 和 `~` 都指向根级 `./src`，而 **`src/` 已不存在**（2026-09 冻结时移到
  `archive/legacy-src/`）。因此任何 `import '@/...'` 的单测都解析到空气目录 —— 要么测的是 mock，
  要么根本跑不到断言。改测试前先把别名指到具体子应用。
- E2E 用例里仍有 `https://118.196.79.130:8443` 与 `/home/discovery/*` 这类旧入口硬编码，
  对应 DEC-01 之前的信息架构，跑通与否不代表本地代码状态。

结论：**别把「80%」当成已达标**，它是目标值；真实门槛目前是 CI 的 lint + unit + e2e 能否跑过。

---

## 5. 部署

### 5.1 部署环境

| 环境 | 端口 | URL | 触发 |
|:--|:--|:--|:--|
| **Production** | 8443 | `https://118.196.79.130:8443/` | 手动（main 分支）|
| **Staging** | 8444 | `https://118.196.79.130:8444/` | develop 分支 |

### 5.2 部署流程（按 `scripts/deploy.sh` 实际签名）

```bash
# 用法：scripts/deploy.sh <nginx_path> [<app_dir>] [--staging]
#   nginx_path = 线上挂载前缀；app_dir 默认取 "${nginx_path}-app"
bash scripts/deploy.sh data-community            # apps/data-community-app → /var/www/html/data-community
bash scripts/deploy.sh risk risk-app             # 显式指定目录名
bash scripts/deploy.sh mkt                       # 生产（8443）

# Staging（8444，独立目录 /var/www/staging，必须显式确认）
STAGING_CONFIRM=yes bash scripts/deploy.sh mkt --staging

# 回滚：不带哈希只列可用版本，带哈希才切符号链接
bash scripts/rollback.sh mkt                    # 列出 mkt 的历史版本
bash scripts/rollback.sh mkt abc1234            # 回滚到 abc1234
```

脚本做的事：进 `apps/<app_dir>` 构建 → 若远程是真实目录先迁成 legacy → rsync 到
`<nginx_path>-<git短哈希>` 版本目录（不带 `--delete`）→ 修权限 → 切换前健康检查 →
`ln -sfn` 原子切链接 → 切换后健康检查，失败即回滚 → 只保留最近 5 个版本。

> 健康检查是**深校验**：不光看 index 的 HTTP 200，还要抓出 entry chunk 的实际请求 URL，
> 要求 200 且 `content-type` 含 javascript —— 因为 SPA 兜底会让任何路径都返回 200（HTML），
> 2026-10-27 的 HC 白屏事故就是这么漏掉的。前置条件是 `root@118.196.79.130` 免密 ssh。

### 5.3 部署清单

- [ ] CI 7 个 job 通过：lint / typecheck / unit / e2e / jscpd / security / base-consistency
      —— 但 **typecheck 目前是假绿**：`tsconfig.typecheck.json` 的 `include` 只覆盖
      `archive/legacy-src/**`，活跃应用 0 行进入检查，别把它当类型质量门用
- [ ] 本地跑过 `pnpm lint:check`（没有 hook 会替你跑）
- [ ] 改过归属/入口/前缀/端口则跑 `pnpm verify:dec01` 与 `pnpm verify:entry-registry`
- [ ] 顶层 `pnpm build` 已禁用（src/ 冻结），构建按应用走 `pnpm --filter <app> build`
- [ ] PR 已 review + approve（CODEOWNERS 自动分配）并 merge 到 main
- [ ] 回滚方案明确（`scripts/rollback.sh <app>`，保留 5 版本）
- [ ] 部署前后各一次健康检查通过（含 entry chunk content-type）

---

## 6. 常见问题

### 6.1 工作区选择

| 场景 | 工作区 |
|:---|:---|
| 数据社区子应用开发 | `data_community_doc/`（本工作区）|
| AI 诊断器 | `AI产品专家团/`（独立项目）|
| 问小数 | `ask-xiaoshu/`（独立项目）|

❌ 禁止跨项目文档（除非引用）。

### 6.2 任务卡住怎么办

1. **检查 tmp/**：是否有最近的 plan.md / report.md
2. **检查任务板**：是否 in_progress 状态
3. **检查 cron**：self-cron / 派蒙 broker relay
4. **回执 PM**：5min 内回执 · 30min 内 3 事实
5. **升级**：失联 2h → 飞书 DM 派蒙

### 6.3 失联怎么办

1. **检测**：派蒙 broker relay v28 (06:00) 触发
2. **回执**：5min 内 sessions_send 派蒙 main
3. **恢复闭环**：3 件套（daily + lessons + sessions_send）
4. **复盘**：lessons/les_YYYY-MM-DD_NNN.md 沉淀教训

### 6.4 PR review 阻塞

1. **检查 CODEOWNERS**：自动分配的 reviewer
2. **@ mention**：PM/arch 紧急升级
4. **撤 PR 重建**：commit rebase 后重新提

### 6.5 部署失败

1. **检查 nginx 路径**：`nginx_path` 与 `app_dir` 映射（TASK-20260810 修复）
2. **回滚**：`./rollback.sh`
3. **检查 CI**：`.github/workflows/ci.yml` 触发分支
4. **看监控**：worktree-monitor + nginx 监控

---

## 7. 关联文档

### 7.1 项目级文档

- [`ARCHITECTURE.md`](ARCHITECTURE.md) — 架构总览（v1.1，2026-11-23 实测刷新）
- [`README.md`](README.md) — 项目说明（含实测子应用矩阵）
- [`docs/architecture/deploy-prefix-2026-11.md`](docs/architecture/deploy-prefix-2026-11.md) — 部署前缀口径与现网实测
- [`docs/architecture/cleanup-plan-2026-11.md`](docs/architecture/cleanup-plan-2026-11.md) — 冗余扫描与整洁优化方案（§10 = DEC-01）
- [`docs/architecture/dec01-migration-checklist-2026-11.md`](docs/architecture/dec01-migration-checklist-2026-11.md) — T0–T6 迁移台账
- [`docs/architecture/overview.md`](docs/architecture/overview.md) — 架构详细版（2026-09 版，部署一节以 ARCHITECTURE.md 为准）
- [`docs/governance/BRANCH_NAMING.md`](docs/governance/BRANCH_NAMING.md) · [`docs/governance/BRANCH_CLEANUP.md`](docs/governance/BRANCH_CLEANUP.md) · [`docs/governance/BRANCH_RETIREMENT_PLAN.md`](docs/governance/BRANCH_RETIREMENT_PLAN.md) — 分支命名 / 清理 / 退役
- [`archive/legacy-src/DEPRECATED.md`](archive/legacy-src/DEPRECATED.md) — 主应用冻结声明

> 旧版本这里列的 `docs/ARCHITECTURE.md`、`docs/BRANCH_NAMING.md`、`docs/BRANCH_CLEANUP.md`、
> `src/DEPRECATED.md` 四个路径**都已不存在**（P1-6 文档重组后搬迁过），链接已在上面修正。

### 7.2 GitHub 配置

- [`.github/PULL_REQUEST_TEMPLATE.md`](.github/PULL_REQUEST_TEMPLATE.md) — PR 模板
- [`.github/ISSUE_TEMPLATE/`](.github/ISSUE_TEMPLATE/) — Issue 模板
- [`CODEOWNERS`](CODEOWNERS) — 仓库 owner 配置
- [`.github/workflows/ci.yml`](.github/workflows/ci.yml) — CI 配置

### 7.3 团队规范

- **AGENTS.md**（各 agent workspace）— 角色定制 + 行为契约
- **派蒙 SOP**: cron + broker relay + 派单

---

*数字社区研发团队 2 · v1.1 · 2026-08-10 拍板生效（TASK-20260810-607A63EF）· 2026-11-23 按仓库实际状态更正*