# Fintech Data Portal

> **企业级数据门户 Demo · 文博作品集**
>
> 覆盖**数据发现 → 数据管理 → 数据探索 → ChatBI 问数**完整闭环的前端作品集。
> 演示用 mock 数据，无需真实后端。

[![Vue](https://img.shields.io/badge/Vue-3-4FC08D)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6)]()
[![Vite](https://img.shields.io/badge/Vite-5-646CFF)]()
[![Arco Design](https://img.shields.io/badge/Arco-2.55-165DFF)]()
[![pnpm](https://img.shields.io/badge/pnpm-9.15-F69220)]()
[![License](https://img.shields.io/badge/license-MIT-blue)]()

---

## 📌 这是什么

面向金融业务团队的**数据资产一体化门户** Demo，聚焦 4 大场景：

- **数据发现**：语义搜索、标签推荐、血缘关系、使用排行
- **数据管理**：元数据管理、指标统一、权限控制、质量监控
- **数据探索**：统一查询、Jupyter Hub、智慧报表、ChatBI 问数
- **画布编排**：营销策略画布（DAG）、预览线、AB 实验

### 解决的问题

- 🔍 **找数难**：分散在多个系统，找一个指标要问 5 个人
- 📏 **口径乱**：同一指标 5 个定义，"活跃用户"数据打架
- 🚪 **用数门槛高**：业务方自助分析能力弱，依赖数据团队取数
- ♻️ **复用率低**：同样指标被重复计算，资产浪费

---

## ✨ 量化成果

| 指标 | 数值 |
|:---|:---|
| 数据表统一管理 | 3000+ 张 |
| 指标统一口径 | 100+ 个 |
| 变量 / 特征 | 10000+ 个 |
| 同时运行策略 | 30+ 个 |
| 链路吞吐 | 百万级/小时 |
| 配置周期 | 周级 → 小时级 |
| 子应用数 | **12 个** |
| Mock 数据集 | **80+ 模块** |

---

## 🏗️ 技术栈

| 维度 | 选型 |
|:---|:---|
| **前端框架** | Vue 3 + TypeScript + Composition API |
| **构建工具** | Vite 5 |
| **UI 库** | Arco Design 2.55 |
| **状态管理** | Pinia（统一，禁止 Vuex） |
| **路由** | Vue Router 4 |
| **画布** | 自研 DAG 编辑器（基于 AntV X6） |
| **图表** | ECharts 5 |
| **样式** | SCSS + 设计 Token（CSS Variables） |
| **测试** | Vitest（单元） + Playwright（E2E） |
| **包管理** | pnpm 9.15 workspace（monorepo） |
| **后端** | 纯 mock，无真实依赖（Supabase 仅占位） |

---

## 📂 目录结构

```
fintech-data-portal/
├── apps/                       # 子应用（12 个独立 Vue 应用）
│   ├── admin-app/              # 管理后台
│   ├── asset-app/              # 资产管理
│   ├── data-community-app/     # 数字社区门户
│   ├── dex-app/                # 数据探索 / ChatBI
│   ├── dfd-app/                # 数据查找 / 数据地图
│   ├── dmt-app/                # 数据建模 / 血缘
│   ├── horizontal-canvas/      # 横向画布编排
│   ├── mkt-app/                # 营销画布 / 任务调度
│   ├── report-monitor/         # 报表监控
│   ├── risk-app/               # 风险应用
│   └── touch/                  # 全渠道触达
├── packages/                    # 共享包
│   ├── lineage-graph/          # 血缘图组件（dmt 专用）
│   ├── shared-api/             # API 请求封装
│   └── shared-utils/           # 工具函数集合
├── archive/
│   └── legacy-src/             # 已冻结的主应用源码（见 DEPRECATED.md）
├── scripts/                    # 构建/部署/调试脚本
│   ├── _debug-archive/         # 历史调试脚本归档
│   └── _test-archive-legacy/   # 旧测试脚本归档
├── tests/                      # 顶层测试（Vitest 单测 + Playwright E2E）
├── vite-plugins/               # 自定义 Vite 插件
├── public/                     # 公共静态资源
├── docs/                       # 项目文档（详见 docs/README.md）
│   ├── architecture/           # 架构总览、设计文档
│   ├── governance/             # 分支治理
│   ├── guides/                 # 业务模块说明
│   ├── migration/              # 迁移记录（JS/TS）
│   ├── prd/                    # 产品需求
│   ├── reports/                # 完成报告
│   └── archive/                # 历史归档
├── supabase/                   # 数据库迁移（占位）
├── .github/
│   ├── workflows/ci.yml        # 6 阶段质量门流水线
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── ISSUE_TEMPLATE/
└── archive/legacy-src/         # 已冻结的旧主应用
```

---

## 🚀 快速开始

### 前置要求

- Node.js **>= 18**
- pnpm **>= 9.15**（推荐 `npm i -g pnpm@9.15.4`）

### 安装与启动

```bash
# 1. 克隆仓库
git clone https://github.com/wenbo0527/fintech-data-portal.git
cd fintech-data-portal

# 2. 安装依赖
pnpm install --frozen-lockfile

# 3. 启动所有子应用（dev-with-subapps 脚本）
pnpm dev
# 访问 http://localhost:5177（默认） 或子应用各自端口

# 4. 构建产物
pnpm --filter <app-name> build        # 单子应用构建
# 顶层 pnpm build 已禁用（src/ 已冻结，见 archive/legacy-src/DEPRECATED.md）
```

### 常用脚本

| 命令 | 作用 |
|:---|:---|
| `pnpm dev` | 启动所有子应用 dev server |
| `pnpm lint` | ESLint 全仓检查（带 --fix） |
| `pnpm lint:check` | ESLint 检查（不带 --fix） |
| `pnpm lint:apps` | 仅扫描 `apps/*` |
| `pnpm lint:packages` | 仅扫描 `packages/*` |
| `pnpm lint:archive` | 仅扫描 `archive/legacy-src/` |
| `pnpm typecheck` | vue-tsc 类型检查（已重定向至子应用） |
| `pnpm test:unit` | Vitest 单元 + 组件测试 |
| `pnpm test:e2e` | Playwright E2E 测试 |
| `pnpm audit` | pnpm 安全审计 |

### 启动单个子应用

```bash
pnpm --filter dex-app dev
pnpm --filter dfd-app dev
pnpm --filter mkt-app dev
# 详见 apps/*/package.json
```

---

## 🎨 设计原则

本项目遵循 3 层设计原则（详见 [docs/architecture/overview.md](docs/architecture/overview.md) 与原规划文档）：

### 第一层 · 基础（必守）
- **一致性**：统一设计 Token、统一图标文案
- **及时反馈**：所有异步操作有 loading / 成功 / 失败 toast
- **错误预防**：高风险操作二次确认
- **降低认知负荷**：操作列统一为「详情 + 更多∨」
- **贴近现实**：使用金融业务术语（特征、指标、血缘）

### 第二层 · 进阶（逐步落地）
- 自然交互（语义搜索、筛选联动）
- 确定性（操作列封装、视图保存）
- 意义感（批量操作即时呼出、路径最短化）
- 生长性（高级筛选折叠、最近使用）
- 不变与多变（默认主题稳定、支持深色）

### 第三层 · AI 时代（Demo 亮点）
- AI 友好（ChatBI 入口融入搜索）
- 对话式交互（自然语言问数 + 推荐问题）
- 主动式服务（数据质量异常告警）

---

## 🎨 设计 Token 使用

每个子应用 `main.ts` 必须引入共享 Token（按 P1-4 落地后）：

```typescript
import '@app/shared-styles/index.css'  // 引入 CSS Variables
import '@arco-design/web-vue/dist/arco.css'
import './styles/app.css'
```

组件内使用变量，禁止硬编码：

```vue
<style scoped lang="scss">
.feature-table {
  padding: var(--space-4);                    /* 16px */
  background: var(--color-bg-card);          /* #ffffff */
  font-size: var(--font-size-base);          /* 14px */
  border-radius: var(--radius-base);         /* 4px */
}
</style>
```

完整 Token 体系见 `packages/shared-styles/tokens/`（P1-4 待落地）。

---

## � P0-P1 仓库改造记录

仓库经历 P0（治理）+ P1（规范）两阶段 9 次提交改造，全部已推送 `main`：

| 阶段 | 任务 | commit |
|:---|:---|:---|
| P0-1 | 根目录瘦身（57 文件归档 + 6 删除） | `93e63580` |
| P0-2 | 分支归档（8 分支 + 7 tag 兜底） | `aecc763a` |
| P0-3 | 主应用冻结（`src/` → `archive/legacy-src/`） | `21bd9e7d` |
| P0-5 | 备份清理（`.backup-archive/` 3 文件） | `ec4f29c6` |
| P1-1 | ESLint 合并（4 份配置 → 1 份） | `d1b45f4a` |
| P1-5 | JS/TS 双版本清理（部分 + 风险登记） | `774ac453` |
| P1-6 | 文档体系重建（23 文件重组 + 索引） | `aa5206ad` |
| P1-10 | CI/CD 优化（6 阶段质量门） | `be4fb2f9` |

详细改造日志：[docs/README.md](docs/README.md)。

---

## 🤝 贡献指南

### 分支命名

按 [docs/governance/BRANCH_NAMING.md](docs/governance/BRANCH_NAMING.md)：

- `feat/<scope>-<desc>` 新功能
- `fix/<scope>-<desc>` 修复
- `chore/<scope>-<desc>` 杂项
- `docs/<scope>-<desc>` 文档

### 提交规范

遵循 Conventional Commits：

```
<type>(<scope>): <subject>

例：feat(dex-app): 新增 ChatBI 自然语言问数
```

完整 type 列表与 PR 模板见 [.github/PULL_REQUEST_TEMPLATE.md](.github/PULL_REQUEST_TEMPLATE.md)。

### 合并要求

PR 必须通过 CI 6 阶段质量门：

1. ✅ ESLint (`pnpm lint:check --max-warnings 0`)
2. ✅ TypeScript (`vue-tsc -p tsconfig.typecheck.json`)
3. ✅ 单元测试 (`pnpm test:unit`)
4. ✅ E2E 测试 (`pnpm test:e2e`)
5. ✅ jscpd 重复代码检测
6. ✅ 安全审计（仅 main 分支）

---

## � 文档导航

| 路径 | 用途 |
|:---|:---|
| [docs/README.md](docs/README.md) | 文档索引（新人入职 10 分钟路径） |
| [docs/architecture/overview.md](docs/architecture/overview.md) | 项目架构总览 |
| [docs/governance/BRANCH_NAMING.md](docs/governance/BRANCH_NAMING.md) | 分支命名规范 |
| [docs/governance/CLASSIFY_MOCKS_SYNC.md](docs/governance/CLASSIFY_MOCKS_SYNC.md) | dmt-app classify-* mock 同步规约 |
| [docs/migration/JS-TS-MIGRATION.md](docs/migration/JS-TS-MIGRATION.md) | JS/TS 迁移现状 |
| [docs/prd/](docs/prd/) | 产品需求文档（4 模块） |
| [archive/legacy-src/DEPRECATED.md](archive/legacy-src/DEPRECATED.md) | 旧主应用冻结声明 |

---

## ⚠️ 关于 src/

`src/` 主应用已**冻结归档**到 `archive/legacy-src/`（2026-09-08）。线上生产使用 **portal-shell + apps/* 子应用**架构。详见：

- [archive/legacy-src/DEPRECATED.md](archive/legacy-src/DEPRECATED.md)
- 顶层 `package.json` 中 `deprecated` 字段

请勿在 `archive/legacy-src/` 中开发新功能，所有新功能请在对应 `apps/<app-name>/` 子应用中实现。

---

## 📊 子应用矩阵

| 子应用 | 端口 | 核心模块 | 状态 |
|:---|:---|:---|:---|
| `admin-app` | 5181 | 权限/门户/内容 | ✅ |
| `asset-app` | 5182 | 资产管理 / 数据地图 | ✅ |
| `data-community-app` | 5183 | 数字社区入口 | ✅ |
| `dex-app` | 5184 | ChatBI / 探索 / 客户360 | ✅ |
| `dfd-app` | 5185 | 数据查找 / 资产 / 信用 | ✅ |
| `dmt-app` | 5186 | 血缘 / 元数据 / 建模 | ✅ |
| `horizontal-canvas` | 5187 | 横向 DAG 编排 | ✅ |
| `mkt-app` | 5188 | 营销画布 / 任务 | ✅ |
| `report-monitor` | 5189 | 报表监控 | ✅ |
| `risk-app` | 5190 | 风险应用 / 变量中心 | ✅ |
| `touch` | 5191 | 全渠道触达 | ✅ |

> 端口号为约定分配，详见 `scripts/dev-with-subapps.js`。
> 主入口端口：5177（顶层 vite 默认）。

---

## 👤 作者

**文博** · AI+ 数据产品负责人

- GitHub: [@wenbo0527](https://github.com/wenbo0527)
- 知乎: [@wenbo-67-38](https://www.zhihu.com/people/wenbo-67-38)
- Email: wzhai0527@163.com

---

## 📄 许可证

MIT License

---

⭐ 如果这个项目对你的工作有帮助，欢迎 Star！