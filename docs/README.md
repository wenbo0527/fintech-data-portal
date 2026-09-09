# Fintech Data Portal · 文档索引

> 本目录集中管理项目所有设计、架构、治理、迁移与历史档案。
> 与 P0（仓库治理）和 P1（规范落地）配套执行。

## 📂 目录结构

| 目录 | 用途 | 进入路径 |
|------|------|---------|
| **architecture/** | 架构总览、技术设计 | 读架构从这里开始 |
| **governance/** | 分支治理、归档策略 | 贡献代码前必读 |
| **guides/** | 业务模块功能说明 | 看具体业务怎么实现 |
| **migration/** | 技术栈迁移记录与待办 | 跟进 JS/TS 迁移进度 |
| **prd/** | 产品需求文档 | 4 个核心模块 PRD |
| **reports/** | 项目阶段性报告 | 历史完成报告 12 份 |
| **archive/** | 过期/历史档案 | 不再维护，仅留档 |

## 🚀 快速导航

### 新人入职（10 分钟了解项目）

1. [architecture/overview.md](architecture/overview.md) — 项目架构总览
2. [architecture/README.md](architecture/README.md) — 架构治理说明
3. [governance/BRANCH_NAMING.md](governance/BRANCH_NAMING.md) — 分支命名规范
4. [prd/_default.md](prd/_default.md) — PRD 模板
5. [migration/JS-TS-MIGRATION.md](migration/JS-TS-MIGRATION.md) — 当前迁移进展

### 贡献代码

- 提交规范 / 分支流程：[governance/BRANCH_CLEANUP.md](governance/BRANCH_CLEANUP.md)
- 归档历史分支：[governance/BRANCH_RETIREMENT_PLAN.md](governance/BRANCH_RETIREMENT_PLAN.md)
- 详细设计参考：[architecture/设计/](architecture/设计/)

### 跟进迁移

- [migration/JS-TS-MIGRATION.md](migration/JS-TS-MIGRATION.md) — JS/TS 双版本清单 + P2 拆分任务

## 📋 P0-P1 改造进度

| 阶段 | 任务 | 状态 | commit |
|------|------|------|--------|
| P0-1 | 根目录瘦身 | ✅ | `93e63580` |
| P0-2 | 分支归档 | ✅ | `aecc763a` |
| P0-3 | 主应用冻结（src/ → archive/legacy-src/） | ✅ | `21bd9e7d` |
| P0-5 | 备份清理 | ✅ | `ec4f29c6` |
| P1-1 | ESLint 合并 | ✅ | `d1b45f4a` |
| P1-5 | JS/TS 双版本清理（部分 + 风险登记） | ✅ | `774ac453` |
| P1-6 | 文档体系重建 | ✅ | （本次提交） |
| P1-8 | README 重写（3.3K → 11K） | ✅ | `b6eb7990` |
| P1-9 | 测试文件清理 + 子应用测试目录 | ✅ | `5cc90914` |
| P1-10 | CI/CD 优化（6 阶段质量门） | ✅ | `be4fb2f9` |
| P2-1 | 质量基线报告（持续运营起点） | ✅ | （本次） |

## 🗂 各目录文件清单

### architecture/
```
overview.md                          # 原 ARCHITECTURE.md
README.md                            # 架构治理说明（从 架构治理/README.md 移入）
架构治理路线图.md                     # 治理路径规划
项目精简架构图.md                     # 精简架构图
详情页信息清单.md                     # 详情页字段清单
设计/
  2026-06-24-技术设计-变量全生命周期（变量中心）-v1.0.md
```

### governance/
```
BRANCH_CLEANUP.md                    # 分支清理策略
BRANCH_NAMING.md                     # 分支命名规范
BRANCH_RETIREMENT_PLAN.md            # 已执行归档记录（2026-09-08）
CLASSIFY_MOCKS_SYNC.md               # dmt-app classify-* mock 同步规约
```

### guides/
```
数据标准与元数据管理功能说明.md       # 数据标准业务说明
```

### migration/
```
JS-TS-MIGRATION.md                   # JS/TS 双版本清单 + P2 任务
```

### prd/
```
_default.md
asset-listing.md
metadata-collection.md
metadata-management.md
```

### reports/（12 份完成报告，不展开
```

### archive/
```
canvas/                              # 9 份画布系统历史报告
legacy-docs/                         # discovery 模块还原报告
legacy-root/                         # P0-1 临时归档（与 archive/legacy-docs  并列）
  data_community_pm-tmp/             # PM 临时草稿
  test-*.md                           # 早期测试方案
  数据地图-新增指标注册需求.md
  方案需求表格.md
  测试修改方案.md
  需求文档.md
```

### key-project-docs/（历史日志，待清理）
```
技术方案/
  实时控制台日志.log                  
  画布布局系统运行日志_2025-01-16.log
```

## 🔗 外部关联

- 仓库根 [`README.md`](../README.md) — 项目总入口
- 设计原则与规范源 [.trae/documents/产品设计/数字社区项目整理规划.md](../.trae/documents/产品设计/数字社区项目整理规划.md)
- 冻结的旧主应用 [archive/legacy-src/DEPRECATED.md](archive/legacy-src/DEPRECATED.md)

---

**最近更新**：2026-09-08（P1-6 文档体系重建）