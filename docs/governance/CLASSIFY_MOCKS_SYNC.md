# classify-* mock 数据规约（dmt-app）

> **维护**: 数据社区研发团队 2
> **状态**: ✅ 已落最终形态（dmt-app 直接读归档，无副本）

---

## 1. 背景

`apps/dmt-app/src/pages/metadata/classify-*` 系列页面（数据安全分级矩阵、分级任务、表级/字段级分级等）通过 `@shared/classify-*` 别名读取 mock 数据。

历史上有过 6 个 classify-* 文件在 `apps/dmt-app/src/mock/shared/` 下作为**手工副本**存在：

| 归档 (source of truth) | dmt-app 历史副本 |
|---|---|
| `archive/legacy-src/mock/shared/classify-modules.ts` | `apps/dmt-app/src/mock/shared/classify-modules.ts` |
| `archive/legacy-src/mock/shared/classify-matrix.ts` | `apps/dmt-app/src/mock/shared/classify-matrix.ts` |
| `archive/legacy-src/mock/shared/classify-constants.ts` | `apps/dmt-app/src/mock/shared/classify-constants.ts` |
| `archive/legacy-src/mock/shared/classify-types.ts` | `apps/dmt-app/src/mock/shared/classify-types.ts` |
| `archive/legacy-src/mock/shared/classify-api-docs.ts` | `apps/dmt-app/src/mock/shared/classify-api-docs.ts` |
| `archive/legacy-src/mock/shared/classify-edit-history.ts` | `apps/dmt-app/src/mock/shared/classify-edit-history.ts` |

副本依赖是历史的权宜之计（vite `server.fs.allow` 默认拒绝跨目录读取）。副本容易与归档漂移，**副本漂移不会导致 vite build 失败**（构建默默跑旧数据），靠人工或脚本校验才发现。

## 2. 当前架构

[apps/dmt-app/vite.config.ts](../../apps/dmt-app/vite.config.ts) 把：

- `resolve.alias['@shared']` 直接指到 `archive/legacy-src/mock/shared/`
- `server.fs.allow` 显式允许该归档目录

构建时 vite 直接读归档源文件，dmt-app 下的副本**已全部删除**。归档是唯一真相源，不再有同步概念。

## 3. 操作 SOP

### 3.1 归档修改了 classify-* 文件

```bash
# 1) 编辑 archive/legacy-src/mock/shared/classify-*.ts
# 2) 验证 dmt-app build 通过（直接读归档，构建自然过）
pnpm --filter dmt-app run build
# 3) 仅提交归档侧变更即可
```

### 3.2 归档删除了 classify-* 文件

```bash
# 1) 删除 archive/legacy-src/mock/shared/classify-*.ts
# 2) 同时删除 dmt-app 页面中对该模块的 import（若还有引用会 vite 报错）
rg "@shared/<被删除模块名>" apps/dmt-app/src
# 3) 验证 build
pnpm --filter dmt-app run build
```

### 3.3 排查构建失败

dmt-app build 报 `Could not load .../classify-xxx` 之类：

```bash
# 确认归档文件存在
ls archive/legacy-src/mock/shared/classify-*.ts
# 确认 vite alias 与 fs.allow 配置正确
cat apps/dmt-app/vite.config.ts
```

## 4. 通用同步工具（其它子应用复用）

[sync-app-mocks.mjs](../../scripts/sync-app-mocks.mjs) 是参数化通用脚本，适用于**仍需要副本**的子应用场景（dmt 已不再需要）。它支持：

- 任意 `<source> <target> <prefix>` 三元组
- 三种模式：`sync` / `check` / `prune`
- `--ignore=<regex>` 跳过规则
- `--source-ext` / `--target-ext` 异构扩展名
- 相对路径默认以仓库根为基准

```bash
# 用法示例：把归档的某组文件同步到某子应用副本
node scripts/sync-app-mocks.mjs sync \
  --source=archive/legacy-src/<源子目录> \
  --target=apps/<子应用>/src/<目标子目录> \
  --prefix=<前缀>

# 校验模式（CI 门禁）
node scripts/sync-app-mocks.mjs check \
  --source=... --target=... --prefix=...
```

如果你的子应用必须保留副本（fs.allow 受限等原因），请按以下步骤接入：

1. 在根 `package.json` 注册 `sync:app-mocks:<app>` 三件套（sync / check / prune）
2. 在子应用 `package.json` 注册 `prebuild` 调 sync
3. 在 [.github/workflows/ci.yml](../../.github/workflows/ci.yml) lint 阶段后追加 check 步骤

**强烈建议**：先评估能否像 dmt-app 这样直接把别名指到源目录，根除副本同步问题。
