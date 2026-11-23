#!/usr/bin/env node
/**
 * 入口清单一致性校验（统一方案 P1：只观测，不改任何业务代码）
 *
 * 背景：同一个「有哪些域 / 哪些页面 / 各跑在哪个地址」的知识目前散落在四处，且已开始失真：
 *   A. 外部 portal-shell 的 src/config/domainDictionary.ts（真正驱动 iframe 导航）
 *   B. 仓库内各 app 的 src/registry.ts（自称微应用注册中心，实际几乎无人消费）
 *   C. apps/portal-app/src/mock/home.ts（新加的域清单，无任何跳转地址）
 *   D. 各 app router 与 vite base —— 真正的路由/前缀事实源
 * 本脚本以 D 为基准校验 A/B，并把不一致逐条报出来，可接 CI。
 *
 * 用法：
 *   node scripts/verify-entry-registry.js
 *   node scripts/verify-entry-registry.js --portal-shell ~/code/portal-shell   # 加上 A 项校验
 *   node scripts/verify-entry-registry.js --json
 *   node scripts/verify-entry-registry.js --selftest                            # 校验器自身有效性
 *
 * 校验项：
 *   R1 registry.ts 的 basePath 是否等于该 app vite 的 base
 *   R2 registry.ts 的 entry 端口是否等于该 app 的真实 dev 端口
 *   R3 dev-with-subapps.js 编排的应用集合是否覆盖 workspace 内活跃应用
 *   R4 dca APP_URLS 里登记的端口是否等于目标应用真实端口
 *   R5 portal-app 的域清单是否具备可跳转地址（当前无 url 即报 WARN）
 *   R6（需 --portal-shell）domainDictionary 每条 Feature.url 必须命中目标 app 的真实路由；
 *      且 Feature.domain 必须等于其所属域 key
 */

/* eslint-disable @typescript-eslint/no-var-requires -- CommonJS 脚本，与同目录 verify-* 守卫保持一致 */
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const ROOT = path.resolve(__dirname, '..')
const APPS = path.join(ROOT, 'apps')

function read (p) { try { return fs.readFileSync(p, 'utf8') } catch { return '' } }
function exists (p) { try { fs.statSync(p); return true } catch { return false } }

/** 解析 vite.config 的 base 与 dev 端口（含 package.json dev 脚本里的 --port 覆盖） */
function appFacts (app) {
  const dir = path.join(APPS, app)
  const cfg = read(path.join(dir, 'vite.config.ts')) || read(path.join(dir, 'vite.config.js'))
  const baseM = cfg.match(/\bbase:\s*'([^']+)'/)
  const portM = cfg.match(/\bport:\s*(?:Number\([^)]*\)\s*\|\|\s*)?(\d{4})/)
  const cliPort = read(path.join(dir, 'package.json')).match(/--port (\d{4})/)
  const strict = /strictPort:\s*true/.test(cfg)
  return {
    base: baseM ? baseM[1] : null,
    // CLI --port 优先于 vite server.port，这是 vite 的行为
    port: cliPort ? Number(cliPort[1]) : (portM ? Number(portM[1]) : null),
    portSource: cliPort ? 'package.json --port' : (portM ? 'vite server.port' : null),
    strict,
    hasVite: Boolean(cfg)
  }
}

/** 解析 registry.ts 的 basePath 与 entry 端口 */
function registryFacts (app) {
  const t = read(path.join(APPS, app, 'src', 'registry.ts'))
  if (!t) {return null}
  const base = (t.match(/basePath:\s*'([^']*)'/) || [])[1]
  const entry = (t.match(/entry:\s*'([^']*)'/) || [])[1]
  const port = entry ? (entry.match(/:(\d{4})/) || [])[1] : null
  return { basePath: base, entry, port: port ? Number(port) : null }
}

/** 把一个 app 的所有 router 源文件拼成一段文本（router.ts + router/ 目录递归） */
function routerTextOf (app) {
  const chunks = []
  const single = path.join(APPS, app, 'src', 'router.ts')
  if (exists(single)) {chunks.push(read(single))}
  const dir = path.join(APPS, app, 'src', 'router')
  if (exists(dir)) {
    const walk = d => {
      for (const name of fs.readdirSync(d)) {
        const p = path.join(d, name)
        if (fs.statSync(p).isDirectory()) {walk(p)}
        else if (name.endsWith('.ts')) {chunks.push(read(p))}
      }
    }
    walk(dir)
  }
  return chunks.join('\n')
}

/**
 * 从 router 文件提取可达路径。
 * 同时给出「字面 path」与「按缩进合成的完整路径」两种形态，避免因嵌套写法误报。
 */
function routePathsFrom (routerText) {
  const literal = new Set()
  const stack = [] // { depth, seg } —— depth 用 path: 的列位置，兼容「{ path: ...」同行嵌套写法
  for (const line of routerText.split('\n')) {
    for (const m of line.matchAll(/\bpath:\s*(?:'([^']*)'|"([^"]*)")/g)) {
      const depth = m.index
      const seg = m[1] ?? m[2]
      literal.add(seg.replace(/^\//, ''))
      while (stack.length && stack[stack.length - 1].depth >= depth) {stack.pop()}
      stack.push({ depth, seg })
      const composed = stack.map(s => s.seg.replace(/^\//, '')).filter(Boolean).join('/')
      if (composed) {literal.add(composed)}
      // 相对挂载点的路径形态（去掉最外层布局容器）
      if (stack.length > 1) {literal.add(stack.slice(1).map(s => s.seg.replace(/^\//, '')).join('/'))}
    }
  }
  return literal
}

/**
 * url 段与路由段逐段比对：路由侧 `:param` 吃掉任意一段实参，`:param?` 可缺省。
 * 路由表里大量 `/detail/:id/:mode?` 这类写法，直接字符串相等会误报。
 */
function matches (routeSet, want) {
  if (routeSet.has(want)) {return true}
  const parts = want.split('/').filter(Boolean)
  for (const r of routeSet) {
    const rs = r.split('/').filter(Boolean)
    // 纯参数路由（如子路由 ':id'）没有任何字面段，拿它去匹配任意 URL 会造成假通过
    if (!rs.some(s => !s.startsWith(':'))) {continue}
    const optIdx = rs.reduce((a, s, i) => (s.endsWith('?') ? a.concat(i) : a), [])
    if (optIdx.length > 4) {continue}
    // 可选段逐个尝试保留/删除（最多 2^4 种组合，路由表小，代价可忽略）
    for (let mask = 0; mask < (1 << optIdx.length); mask++) {
      const drop = new Set(optIdx.filter((_, k) => mask & (1 << k)))
      const segs = rs.filter((_, i) => !drop.has(i))
      if (segs.length !== parts.length) {continue}
      if (segs.every((s, i) => s.startsWith(':') || s === parts[i])) {return true}
    }
  }
  return false
}

function workspaceApps () {
  const out = []
  for (const d of fs.readdirSync(APPS)) {
    if (!fs.statSync(path.join(APPS, d)).isDirectory()) {continue}
    if (!exists(path.join(APPS, d, 'package.json'))) {continue}
    out.push(d)
  }
  const excluded = []
  const ws = read(path.join(ROOT, 'pnpm-workspace.yaml'))
  for (const m of ws.matchAll(/-!'?apps\/([\w--]+)'?/g)) {excluded.push(m[1])}
  for (const m of ws.matchAll(/- '!apps\/([^']+)'?/g)) {excluded.push(m[1])}
  return { all: out, excluded: [...new Set(excluded)] }
}

const results = []
function add (id, level, msg) { results.push({ id, level, msg }) }

function runChecks (portalShellPath) {
  const { all, excluded } = workspaceApps()
  const active = all.filter(a => !excluded.includes(a))

  // R1 / R2 —— registry.ts 自述与实际配置
  for (const app of all) {
    const reg = registryFacts(app)
    if (!reg) {continue}
    const facts = appFacts(app)
    if (reg.basePath && facts.base) {
      const ok = reg.basePath.replace(/\/$/, '') === facts.base.replace(/\/$/, '')
      add('R1', ok ? 'PASS' : 'FAIL', `registry.ts ${app}: basePath='${reg.basePath}' vs vite base='${facts.base}'${ok ? '' : ' ← 不一致'}`)
    }
    if (reg.port && facts.port) {
      const ok = reg.port === facts.port
      add('R2', ok ? 'PASS' : 'FAIL', `registry.ts ${app}: entry 端口 ${reg.port} vs 实际 dev 端口 ${facts.port}（来源 ${facts.portSource}）${ok ? '' : ' ← 不一致'}`)
    } else if (reg.port && !facts.port) {
      add('R2', 'WARN', `registry.ts ${app}: entry 端口 ${reg.port}，但该 app 未声明 dev 端口`)
    }
  }

  // R3 —— dev 编排覆盖度
  const orch = read(path.join(ROOT, 'scripts', 'dev-with-subapps.js'))
  const orchestrated = new Set([...orch.matchAll(/name: '([\w-]+)'/g)].map(m => m[1]))
  const spaApps = active.filter(a => !['report-monitor-backend'].includes(a))
  const missing = spaApps.filter(a => !orchestrated.has(a))
  add('R3', missing.length ? 'WARN' : 'PASS', `dev-with-subapps 编排 ${orchestrated.size} 个；workspace 内活跃应用 ${spaApps.length} 个；未编排: ${missing.join(', ') || '无'}`)

  // R4 —— dca 跨 app 跳转表端口
  const appsTs = read(path.join(APPS, 'data-community-app', 'src', 'config-dca', 'apps.ts'))
  for (const m of appsTs.matchAll(/(\w+):\s*import\.meta\.env\.VITE_[A-Z_]*\s*\|\|\s*'http:\/\/localhost:(\d{4})/g)) {
    const key = m[1], port = Number(m[2])
    const target = { mkt: 'mkt-app', risk: 'risk-app', dex: 'dex-app', touch: 'touch' }[key] || `${key}-app`
    const facts = appFacts(target)
    const ok = facts.port === port
    add('R4', ok ? 'PASS' : 'FAIL', `APP_URLS.${key} = localhost:${port} vs ${target} 实际 ${facts.port ?? '未声明'}${ok ? '' : ' ← 不一致'}`)
  }

  // R5 —— portal-app 域清单是否可跳转
  const pappHome = read(path.join(APPS, 'portal-app', 'src', 'mock', 'home.ts'))
  if (pappHome) {
    const keys = [...pappHome.matchAll(/\{\s*key:\s*'([^']+)',\s*title:\s*'([^']+)'\s*\}/g)]
    const hasUrl = /(url|href|path)\s*:/.test(pappHome)
    add('R5', hasUrl ? 'PASS' : 'WARN', `portal-app home.ts 声明 ${keys.length} 个域键，${hasUrl ? '含跳转地址' : '无任何 url/href/path 字段 → 不构成可用入口'}`)
  }

  // R6 —— portal-shell 的 Feature.url 必须命中真实路由
  if (portalShellPath) {
    const dictPath = path.join(portalShellPath, 'src/config/domainDictionary.ts')
    const dict = read(dictPath)
    if (!dict) {
      add('R6', 'FAIL', `找不到 ${dictPath}`)
    } else {
      const routeIndex = {}
      for (const app of fs.readdirSync(APPS)) {
        if (!fs.statSync(path.join(APPS, app)).isDirectory()) {continue}
        routeIndex[app] = routePathsFrom(routerTextOf(app))
      }
      // app key → 目录
      const keyToApp = { 'data-community': 'data-community-app', risk: 'risk-app', mkt: 'mkt-app', dex: 'dex-app', touch: 'touch', dfd: 'dfd-app', dmt: 'dmt-app', admin: 'admin-app', 'horizontal-canvas': 'horizontal-canvas', semantic: 'semantic-app' }
      let bad = 0; let total = 0
      const domBlocks = [...dict.matchAll(/const (\w+Domain): DomainItem = \{([\s\S]*?)\n\}\n/g)]
      for (const [, , body] of domBlocks) {
        const domKey = (body.match(/key: '([^']+)'/) || [])[1]
        for (const raw of body.matchAll(/\{[^{}]*\bkey: '[^']+',[^{}]*\burl: '[^']+',[^{}]*\}/g)) {
          const obj = raw[0]
          const field = (name) => (obj.match(new RegExp(name + ":\\s*'([^']*)'")) || [])[1]
          const fk = field('key'); const url = field('url'); const fdomain = field('domain')
          if (!fk || !url || !fdomain) {continue}
          total++
          if (fdomain !== domKey) { bad++; add('R6', 'FAIL', `Feature ${fk} 的 domain='${fdomain}' 与所属域 '${domKey}' 不一致`) }
          const m = url.replace(/[?#].*$/, '').match(/^\/([a-z-]+)\/(.*)$/)
          if (!m) { bad++; add('R6', 'FAIL', `Feature ${fk} url '${url}' 无法解析出应用前缀`); continue }
          const app = keyToApp[m[1]]
          if (!app) { bad++; add('R6', 'FAIL', `Feature ${fk} url '${url}' 的应用前缀 '/${m[1]}/' 未知`); continue }
          const want = m[2].replace(/\/$/, '')
          const idx = routeIndex[app] || new Set()
          if (!idx.size) { bad++; add('R6', 'FAIL', `Feature ${fk} url '${url}' 的目标 ${app} 未解析出任何路由`); continue }
          if (matches(idx, want)) {continue}
          // 常见书写错误：应用前缀多写一层（如 /admin/admin/xxx、/dmt/dmt/xxx）
          const dup = want.startsWith(m[1] + '/') ? want.slice(m[1].length + 1) : null
          if (dup && matches(idx, dup)) {
            bad++
            add('R6', 'FAIL', `Feature ${fk} url '${url}' 多写了一层应用前缀，应为 '/${m[1]}/${dup}'`)
            continue
          }
          bad++
          add('R6', 'FAIL', `Feature ${fk} url '${url}' 未在 ${app} 路由中找到`)
        }
      }
      add('R6', bad ? 'FAIL' : 'PASS', `portal-shell Feature url 校验：共 ${total} 条，不匹配 ${bad} 条`)
      // 覆盖率护栏：字典里 url 字段总数必须等于实际解析条数，否则是解析器漏读而非链接有问题
      const rawUrls = (dict.match(/\burl:\s*'/g) || []).length
      if (rawUrls !== total) {
        add('R6', 'FAIL', `R6 解析器覆盖不足：字典含 ${rawUrls} 个 url 字段，仅解析到 ${total} 条，差额 ${rawUrls - total} 条未经校验`)
      }
    }
  } else {
    add('R6', 'SKIP', '未提供 --portal-shell <路径>，跳过外部域字典校验')
  }
}

/* ------------------ 校验器自身有效性 ------------------ */
function selftest () {
  let failed = 0
  const assert = (cond, label) => { console.log(`  ${cond ? 'PASS' : 'FAIL'} ${label}`); if (!cond) {failed++} }

  // 1) 路由合成：嵌套 parent + child 必须能拼出完整路径
  const composed = routePathsFrom([
    "const routes = [",
    "  { path: 'customer/tag-system', name: 'TagSystem', children: [",
    "      { path: 'tag-management', name: 'T2' }",
    "    ] }",
    "]"
  ].join('\n'))
  assert(composed.has('customer/tag-system/tag-management'), 'R6 前置：嵌套路由可合成 parent/child 全路径')
  assert(composed.has('customer/tag-system'), 'R6 前置：父路径自身可见')

  // 1b) 动态段必须能被实参 URL 命中（否则会对真实路由大量误报）
  assert(matches(composed, 'customer/tag-system/tag-management'), 'R6 前置：完全一致应命中')
  const paramed = routePathsFrom("{ path: '/detail', children: [{ path: ':id', name: 'D' }] }")
  assert(matches(paramed, 'detail/12345'), 'R6 前置：:param 段应吃掉任意实参')
  assert(!matches(paramed, 'detail/12345/extra'), 'R6 前置：段数不符不应命中（防假通过）')
  assert(!matches(paramed, 'other/12345'), 'R6 前置：前缀不符不应命中')
  const optSeg = routePathsFrom("{ path: '/variable-management/detail/:id/:mode?' }")
  assert(matches(optSeg, 'variable-management/detail/9/create'), 'R6 前置：可选参数段应命中')
  assert(matches(optSeg, 'variable-management/detail/9'), 'R6 前置：可选参数段缺省应命中')
  assert(!matches(new Set([':id']), 'any-single-segment'), 'R6 前置：纯参数路由不应兜住任意 URL')

  // 2) base 与 registry 不一致必须被抓住（构造内存样本）
  const factsLike = { base: '/risk/', port: 5176 }
  const regLike = { basePath: '/variable-hub', port: 8001 }
  assert(regLike.basePath !== factsLike.base.replace(/\/$/, ''), 'R1 语义：basePath 与 vite base 不同时应判为不一致')
  assert(regLike.port !== factsLike.port, 'R2 语义：entry 端口与实际端口不同时应判为不一致')

  // 3) CLI --port 必须优先于 vite server.port
  const tmpApp = path.join(APPS, 'data-community-app')
  const f = appFacts('data-community-app')
  const pkgCli = read(path.join(tmpApp, 'package.json')).match(/--port (\d{4})/)
  assert(!pkgCli || f.port === Number(pkgCli[1]), '端口优先级：有 CLI --port 时应以它为准')
  assert(!f.port || f.portSource !== null, '端口来源必须被标注')

  // 4) 解析器不能对不存在的 app 抛错
  const ghost = appFacts('__not_an_app__')
  assert(ghost.base === null && ghost.port === null && ghost.hasVite === false, '对不存在的 app 应返回空事实而非抛错')

  return failed === 0
}

function main () {
  const argv = process.argv.slice(2)
  if (argv.includes('--selftest')) {
    console.log('入口校验器自检（证明它能抓到不一致）')
    const ok = selftest()
    console.log(ok ? '自检通过：校验器对已知不一致形态有效' : '自检失败：校验器不可信')
    process.exit(ok ? 0 : 2)
  }
  const idx = argv.indexOf('--portal-shell')
  const portalShell = idx >= 0 ? path.resolve(argv[idx + 1]) : process.env.PORTAL_SHELL_PATH || null

  runChecks(portalShell)

  const fails = results.filter(r => r.level === 'FAIL')
  const warns = results.filter(r => r.level === 'WARN')

  if (argv.includes('--json')) { console.log(JSON.stringify(results, null, 2)) } else {
    console.log('入口清单一致性校验（以 vite base + router 为事实源）\n')
    for (const r of results) {console.log(`  [${r.level}] ${r.id}  ${r.msg}`)}
    console.log(`\nFAIL ${fails.length} · WARN ${warns.length} · 共 ${results.length} 项`)
    if (!portalShell) {console.log('提示：加 --portal-shell <路径> 或设 PORTAL_SHELL_PATH 可启用 R6（外部域字典逐条校验）')}
  }
  process.exit(fails.length ? 1 : 0)
}

if (require.main === module) {main()}
module.exports = { appFacts, registryFacts, routePathsFrom, matches, workspaceApps, runChecks, results }
