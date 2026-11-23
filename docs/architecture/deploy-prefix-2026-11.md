# 部署前缀契约与入口口径（2026-11-23 实测定案）

> 结论先行：**生产 origin = `https://118.196.79.130:8443`，shell 挂在 `/home/`，子应用挂在各自 vite `base` 前缀。**
> 域名 `www.wenbodemo.com` 的 443 只挂了 `/home/`，子应用路径一律 500 —— 它是 nginx 侧待办，不是可用口径。
> 校验：`pnpm verify:entry-registry`（R7 静态锁死 origin）；`node scripts/verify-entry-registry.js --portal-shell <路径> --probe`（R8 实测 HTTP 码）。

## 1. 实测矩阵（2026-11-23，`curl` 直连，证书自签故 `-k`）

| 请求 | 结果 |
|:--|:--|
| `:8443/{home,risk,mkt,dex,touch,data-community,admin,dmt,dfd,asset}/` | **10/10 → 200**，index 内资源前缀与 vite `base` 严格一致（`/risk/assets/…`、`/data-community/assets/…`） |
| `:8443/portal/` | 200，但与 `/home/` **同一份文件**（sha 同为 `0a051e8cc14888dd7ad43cc767a7cb39b77d61e3`，资源仍指 `/home/assets`）→ 现网没有 portal-app，只有 shell 多挂了一个 location |
| `:80/*` | **301 → `https://www.wenbodemo.com/…`（不带端口）** |
| `https://www.wenbodemo.com/home/` | 200 |
| `https://www.wenbodemo.com/{risk,mkt,dmt,admin,dex,data-community,portal}/` | **500** |
| `https://www.wenbodemo.com:8443/risk/` | 200（域名 + 8443 可用） |
| 证书 | 自签（`SSL certificate problem: self signed certificate`），`scripts/deploy.sh` 全程 `curl -sk`，团队已知并接受告警 |

## 2. 契约链（四处必须同值，改一处就要跑守卫）

| 环节 | 位置 | 值 |
|:--|:--|:--|
| vite base | `apps/<app>/vite.config.ts` | `/<prefix>/` |
| nginx location + 静态目录 | `scripts/deploy.sh:12` `REMOTE_BASE=/var/www/html/${NGINX_PATH}` | `/<prefix>/` ↔ `/var/www/html/<prefix>` |
| 部署自检 URL | `scripts/deploy.sh:77` | `https://118.196.79.130:8443/<prefix>/` |
| 外部入口字典 | `portal-shell/src/config/domainDictionary.ts` 的 `Feature.url` | `/<prefix>/<route>`，由 `VITE_PUBLIC_BASE_URL + url` 拼成 iframe src |

`scripts/verify-entry-registry.js` 的 R1（base ↔ registry）、R6（url ↔ 真实路由，逐条）、R7（origin 口径）、R8（实测）就是这条链的闸门。

## 3. 已修复的漂移（一次重新部署就会全线白屏）

- 现网正在跑的 shell 产物（`/home/assets/main.eyqO39CS.js`，49,669 字节）里硬编码的是 `https://118.196.79.130:8443/${key}${path}` —— **现网口径本来就是对的**（未能确认该产物出自哪个 commit，但常量取值是确定的）。
- portal-shell 仓库 `main` 的 `.env.production` 却写着 `VITE_PUBLIC_BASE_URL=http://118.196.79.130`，`src/components/layout/SubAppPage.vue` 的兜底常量同值；其 `README.md:64` 的部署表又写的是 `:8443`。三处自相矛盾，其中两处会在下次构建时生效。
- 后果：按仓库值重建部署 → iframe 走 `http://118.196.79.130/<app>/` → 301 → `https://www.wenbodemo.com/<app>/` → **500**，10 个域全部白屏。
- 处置：portal-shell 分支 `fix/registry-point-to-merged-apps` 提交 `f909002` 把两处统一为 `https://118.196.79.130:8443`；本仓库提交 `e6bfe4be` 加 R7 静态锁死 + R8 可选实测。

## 4. portal-app 定性（2026-11-23 裁定）

`apps/portal-app`（单 commit `1560caa3`，2026-11-18，`base:'/'`、`port:3000`）**定性为视觉首页/演示稿，不纳入入口清单**：

- `src/pages/Home.vue` 2,826 行中 `window.open / location.href / router.push / iframe` 命中数 **0**，结构上无法承担导航。
- 全仓库除守卫脚本外 **0 处引用**：不在 `scripts/dev-with-subapps.js` 编排、不在 `deploy.sh` 的 nginx_path 约定、无对应线上前缀。
- 其 `src/mock/home.ts` 的 9 个域键（discovery/exploration/management/dataClassify/marketing/touch/system）是 **DEC-01 已废弃的旧信息架构**；portal-shell 字典是 risk/mkt/dex/dmt/admin/dfd/data-community/home。
- 其 2.5D 架构画布与 shell 既有 `src/components/layout/ArchitectureMap.vue`（494 行）功能重叠。

守卫 R5 已按此反转：**无跳转地址 = PASS**（符合定性）；一旦 portal-app 出现跳转地址则 WARN，提示它与定性冲突、需先定夺是否取代 portal-shell 的聚合职责。若将来要升级为门户，前置条件是改为消费 portal-shell 的同一份域字典，而不是维护第三份清单。

## 5. 运维待办（不在这两个仓库内，需 nginx 侧处理）

1. `www.wenbodemo.com:443` 的子应用路径 500：该 vhost 缺 `/{app}/` location 与 root 映射；`:80` 的 301 目标应带端口或补全 location，否则任何手输域名的用户都会白屏。
2. 自签证书 → 换可信证书才能去掉浏览器告警，届时可考虑把口径迁到域名 443。
3. `/portal/` 与 `/home/` 同物，属冗余 location；确认无外链后回收。
4. 已冻结应用 `dfd / dmt / asset` 在现网仍返回 200 —— **代码退役与下线部署是两件事**，DEC-01 的 T6 需要单独一次下线动作，不能默认「不构建了就没了」。

## 6. 与既有文档的关系

`ARCHITECTURE.md:105` 与 `CONTRIBUTING.md:198` 的 8443 口径**本来就是对的**，缺的是执行层的防回归；本文补实测证据与闸门指向。ARCHITECTURE.md 3.1 的「8 个活跃子应用」清单已过时（实测线上有 10 个前缀，其中 3 个属冻结应用），以本文为准。
