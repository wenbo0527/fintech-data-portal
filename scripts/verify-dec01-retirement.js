#!/usr/bin/env node
/**
 * DEC-01 退役存活闸门（T0）
 *
 * 背景：DEC-01 裁定「同一功能以 apps/data-community-app 与 apps/mkt-app 为准」，语义 (a) 为
 * 「两者是归集目标」。但「权威侧存在同名文件」并不等于「权威侧那份是活的实现」——
 * 本仓库实测存在两类反例：权威侧有同名文件却既未被路由也未被引用（死副本），
 * 以及权威侧根本没有对应物（不属「同一功能」）。若照文件存在性批量退役，会静默丢功能。
 *
 * 本脚本在退役动作之前强制一条断言：
 *   待退役文件 X 的权威对应文件 Y，必须从权威应用的真实入口可达（被路由或被静态/动态引用）。
 *
 * 用法：
 *   node scripts/verify-dec01-retirement.js              # 人读输出，有阻塞项退出码 1
 *   node scripts/verify-dec01-retirement.js --json        # CI/工具消费
 *   node scripts/verify-dec01-retirement.js --selftest    # 用已知反例验证闸门本身有效
 *   node scripts/verify-dec01-retirement.js --app dex-app # 只看某个目标 app
 *   node scripts/verify-dec01-retirement.js --debug-aliases <app>   # 核对 alias 解析结果
 *   node scripts/verify-dec01-retirement.js --closure [entryApp]    # 跨 app 依赖闭包（T4 迁移载荷）
 *   node scripts/verify-dec01-retirement.js --closure data-community-app --json   # 出文件清单
 *
 * 分类：
 *   RETIREABLE            Y 存在且可达，且 X 与 Y 逐字节相同 → 可直接退役
 *   RETIREABLE_AUTH_LARGER Y 存在且可达，权威侧行数 ≥ 本方   → 可退役
 *   MERGE_FIRST           Y 存在且可达，但本方行数 > 权威     → 先并入再退役
 *   BLOCKER_SOURCE_LIVE   Y 存在但不可达，而 X 在其自身 app 内可达 → 禁止退役（须先在权威侧接线）
 *   BOTH_DEAD             X 与 Y 都不可达 → 两份死副本，退役不改变任何可达行为（仍需人工确认无字符串引用）
 *   NO_COUNTERPART        权威侧无对应物                     → DEC-01 不适用，须另判
 *
 * 判定边界（2026-11-05 修正）：
 *   可达性**会**展开各 app vite.config.ts 的 alias 表（数组式 + 对象式 + const 中间变量），
 *   按最长前缀优先。此前不展开 alias 时，`@/mock-dca/data-map` 这类真实存在的引用被当成不可达，
 *   产出了 6 个假阻塞项（dmt 的三个 mock 即在其中）。用 `--debug-aliases <app>` 可核对解析结果。
 *   注意 alias 会跨 app：dca 的 `@/pages`、`@/components`、`@/api/*`、`@/mock/*` 乃至 `@/router`
 *   在运行时实际指向 apps/dfd-app/src —— 因此 dca 本地同名副本可能确实不可达（被遮蔽），
 *   这类 BLOCKER 是真实缺陷信号（同一机制曾导致 dca 搜索恒为空），须由 S5 解环解决。
 */

/* eslint-disable @typescript-eslint/no-var-requires -- CommonJS 脚本，与同目录 verify-* 守卫保持一致 */
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const ROOT = path.resolve(__dirname, '..')
const APPS = path.join(ROOT, 'apps')
const SKIP_DIRS = new Set(['node_modules', 'dist', 'coverage', 'test-results', '.vite', 'public'])
const CODE_EXT = /\.(vue|ts|tsx|js|jsx|mjs|cjs)$/

/** 域 → 唯一权威。不用并集：mkt 存在大量同名死副本，用它裁决发现域会误判。 */
const RULES = [
  { app: 'dex-app', subtree: 'pages/exploration/customer-center', auth: 'mkt-app' },
  { app: 'dex-app', exclude: 'pages/exploration/customer-center', auth: 'data-community-app' },
  { app: 'dfd-app', auth: 'data-community-app' },
  { app: 'dmt-app', auth: 'data-community-app' },
  { app: 'asset-app', auth: 'data-community-app' },
  { app: 'admin-app', auth: 'data-community-app' }
]

function readIfExists (p) {
  try { return fs.readFileSync(p, 'utf8') } catch { return '' }
}

function walkCodeFiles (dir, base = dir, out = []) {
  if (!fs.existsSync(dir)) {return out}
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) {continue}
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {walkCodeFiles(full, base, out)}
    else if (CODE_EXT.test(entry.name)) {
      const text = fs.readFileSync(full, 'utf8')
      out.push({
        abs: full,
        rel: path.relative(base, full).split(path.sep).join('/'),
        lines: text.split('\n').length,
        md5: crypto.createHash('md5').update(text).digest('hex'),
        text
      })
    }
  }
  return out
}

/** 抽取一个文件里所有可能被解析为模块的路径字面量 */
function extractSpecifiers (text) {
  const specs = []
  const patterns = [
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,        // 动态 import（路由 component 常用）
    /\bfrom\s+['"]([^'"]+)['"]/g,                     // 静态 import / export from
    /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /\bcomponent:\s*['"]([^'"]+)['"]/g,               // registry 字符串路由（本脚本不以此为根，见下）
    /@(?:import|use)\s+['"]([^'"]+)['"]/g             // CSS/SCSS @import —— 曾有别名因只查 JS 边而被误判为死 alias
  ]
  for (const re of patterns) {
    let m
    while ((m = re.exec(text)) !== null) {specs.push(m[1])}
  }
  return specs
}

const RESOLVE_TRY = ['', '.ts', '.tsx', '.vue', '.js', '.jsx', '.mjs', '.css', '.scss', '/index.ts', '/index.vue', '/index.js']

function tryFile (abs) {
  for (const ext of RESOLVE_TRY) {
    const cand = abs + ext
    if (fs.existsSync(cand) && fs.statSync(cand).isFile()) {return cand}
  }
  return null
}

/** 求值 path.resolve(...) 的参数串：支持 __dirname、已解析的 const 名、引号段 */
function evalPathResolve (argsText, appDir, consts) {
  const parts = []
  const re = /__dirname|'([^']*)'|"([^"]*)"|([A-Za-z_$][\w$]*)/g
  let m
  while ((m = re.exec(argsText)) !== null) {
    if (m[1] !== undefined || m[2] !== undefined) {parts.push(m[1] !== undefined ? m[1] : m[2]); continue}
    if (m[0] === '__dirname') {parts.push(appDir); continue}
    if (consts[m[3]]) {parts.push(consts[m[3]]); continue}
    return null // 未知标识符
  }
  if (!parts.length) {return null}
  const first = parts[0]
  const base = path.isAbsolute(first) ? first : path.resolve(appDir, first)
  const rest = parts.slice(1).filter(Boolean)
  return rest.length ? path.resolve(base, ...rest) : base
}

/**
 * 解析 app 的 vite alias 表。两种写法都要支持：
 *   数组式（dca 有 68 条）：{ find: '@/mock-dca', replacement: path.resolve(__dirname, 'src/mock') }
 *   对象式（其余 app）：    '@': path.resolve(__dirname, 'src')
 * 并展开 const NAME = path.resolve(...) 这类中间变量（ROOT / DFD / SHARED_UTILS_SRC）。
 * 不认 alias 会把 `@/mock-dca/data-map`（实际存在且被活页面引用）误判为不可达 —— 本脚本曾据此产出假阻塞项。
 */
function loadAliases (app) {
  const appDir = path.join(APPS, app)
  const cfg = readIfExists(path.join(appDir, 'vite.config.ts')) || readIfExists(path.join(appDir, 'vite.config.js'))
  const consts = {}
  for (const m of cfg.matchAll(/const\s+([A-Za-z_$][\w$]*)\s*=\s*path\.resolve\(([^)]*)\)/g)) {
    const v = evalPathResolve(m[2], appDir, consts)
    if (v) {consts[m[1]] = v}
  }
  const list = []
  for (const m of cfg.matchAll(/\{\s*find:\s*'([^']+)'\s*,\s*replacement:\s*path\.resolve\(([^)]*)\)\s*\}/g)) {
    const dir = evalPathResolve(m[2], appDir, consts)
    if (dir) {list.push({ find: m[1], dir })}
  }
  for (const m of cfg.matchAll(/'([^']+)'\s*:\s*path\.resolve\(([^)]*)\)/g)) {
    if (m[1] === 'find' || m[1] === 'replacement') {continue}
    const dir = evalPathResolve(m[2], appDir, consts)
    if (dir) {list.push({ find: m[1], dir })}
  }
  list.sort((a, b) => b.find.length - a.find.length) // Vite 数组式按序首命中，等价于最长前缀优先
  return list
}

function resolveWithAliases (spec, fileDir, appDir, aliases) {
  for (const a of aliases) {
    if (spec === a.find || spec.startsWith(`${a.find}/`)) {
      const rel = spec.slice(a.find.length).replace(/^\//, '')
      return tryFile(path.resolve(a.dir, rel)) // alias 命中但目标不存在（如 @/shared → 已删的 repo/src）→ 不回落，避免误判为可达
    }
  }
  if (spec.startsWith('./') || spec.startsWith('../')) {return tryFile(path.resolve(fileDir, spec))}
  if (spec.startsWith('src/')) {return tryFile(path.resolve(appDir, spec))}
  return null
}

/**
 * 从权威应用的真实入口做可达性遍历。
 * 根只取 index.html 的 script src + src/main.* —— **不把 registry.ts 当根**：
 * registry 在本仓库运行期无人消费（实测 addRoute / import.meta.glob 均 0 命中），
 * 以它为根会把「只在 registry 里声明」的文件误判为活实现，正是 risk-app 陪跑踩过的坑。
 */
function reachability (app) {
  const appDir = path.join(APPS, app)
  const srcDir = path.join(appDir, 'src')
  const files = walkCodeFiles(srcDir)
  const byAbs = new Map(files.map(f => [f.abs, f]))
  const roots = []
  const html = readIfExists(path.join(appDir, 'index.html'))
  const mHtml = html.match(/<script\s+[^>]*src=["']([^"']+)["']/i)
  if (mHtml) {
    const p = mHtml[1].startsWith('/') ? path.join(appDir, mHtml[1]) : path.resolve(srcDir, mHtml[1])
    if (fs.existsSync(p)) {roots.push(p)}
  }
  for (const cand of ['main.ts', 'main.js', 'main.tsx']) {
    const p = path.join(srcDir, cand)
    if (fs.existsSync(p)) { roots.push(p); break }
  }
  const seen = new Set()
  const queue = [...roots]
  const aliases = loadAliases(app)
  while (queue.length) {
    const cur = queue.shift()
    if (seen.has(cur)) {continue}
    seen.add(cur)
    const file = byAbs.get(cur)
    if (!file) {continue}
    for (const spec of extractSpecifiers(file.text)) {
      const resolved = resolveWithAliases(spec, path.dirname(cur), appDir, aliases)
      if (resolved && byAbs.has(resolved) && !seen.has(resolved)) {queue.push(resolved)}
    }
  }
  return { files, reachable: seen, roots }
}

/** 段边界后缀索引，容忍父目录改名（dex 的 exploration/customer-center ↔ mkt 的 customer） */
function suffixIndex (files) {
  const idx = new Map()
  for (const f of files) {
    const parts = f.rel.split('/')
    for (let i = 0; i < parts.length; i++) {
      const suf = parts.slice(i).join('/')
      if (suf.split('/').length < 2 && i === parts.length - 1) {continue} // 裸文件名易误配
      if (!idx.has(suf)) {idx.set(suf, f)}
    }
  }
  return idx
}

function findCounterpart (idx, rel) {
  const parts = rel.split('/')
  for (let i = 0; i < parts.length; i++) {
    const suf = parts.slice(i).join('/')
    if (suf.split('/').length < 2 && i === parts.length - 1) {break}
    const hit = idx.get(suf)
    if (hit) {return hit}
  }
  return null
}

function classify (rule, cache) {
  const srcDir = path.join(APPS, rule.app, 'src')
  let files = walkCodeFiles(srcDir)
  if (rule.subtree) {files = files.filter(f => f.rel.startsWith(rule.subtree + '/'))}
  if (rule.exclude) {files = files.filter(f => !f.rel.startsWith(rule.exclude + '/'))}
  const reachOf = (app) => {
    if (!cache.has(app)) {
      const r = reachability(app)
      cache.set(app, { ...r, idx: suffixIndex(r.files) })
    }
    return cache.get(app)
  }
  const auth = reachOf(rule.auth)
  const own = reachOf(rule.app)
  const rows = []
  for (const f of files) {
    const y = findCounterpart(auth.idx, f.rel)
    const base = { src: f, auth: y, app: rule.app, authority: rule.auth, srcLive: own.reachable.has(f.abs) }
    if (!y) { rows.push({ ...base, cat: 'NO_COUNTERPART' }); continue }
    const authLive = auth.reachable.has(y.abs)
    if (!authLive && !base.srcLive) {rows.push({ ...base, cat: 'BOTH_DEAD' })}
    else if (!authLive) {rows.push({ ...base, cat: 'BLOCKER_SOURCE_LIVE' })}
    else if (y.md5 === f.md5) {rows.push({ ...base, cat: 'RETIREABLE' })}
    else if (y.lines >= f.lines) {rows.push({ ...base, cat: 'RETIREABLE_AUTH_LARGER' })}
    else {rows.push({ ...base, cat: 'MERGE_FIRST' })}
  }
  return rows
}

/**
 * 计算 entryApp 经由 alias 实际依赖的 targetApp / shared-utils 文件闭包。
 * 用途：T4（dfd 迁入）的载荷清单必须能随代码演进重复生成，而不是每次手算。
 * 边界：只跟 import / @import 边；localStorage 键共享那类数据耦合跟不到，故结果是下界。
 */
function closureOf (entryApp, target) {
  // target: { name, dir }。按目录归属判定 —— 把 shared-utils 无条件算进每个 target 会让
  // 同一个包被重复计入所有 app 的闭包（实测每个 app 都多出同一个 36 行文件）。
  const entryAliases = loadAliases(entryApp)
  const entryAppDir = path.join(APPS, entryApp)
  const belongs = p => p === target.dir || p.startsWith(target.dir + path.sep)

  const entrySet = new Set()
  for (const f of walkCodeFiles(path.join(entryAppDir, 'src'))) {
    for (const spec of extractSpecifiers(f.text)) {
      const r = resolveWithAliases(spec, path.dirname(f.abs), entryAppDir, entryAliases)
      if (r && belongs(r)) {entrySet.add(r)}
    }
  }

  const seen = new Set()
  const depth = new Map()
  const queue = [...entrySet]
  for (const e of queue) {depth.set(e, 0)}
  while (queue.length) {
    const cur = queue.shift()
    if (seen.has(cur)) {continue}
    seen.add(cur)
    const ownerDir = appDirOf(cur)
    if (!ownerDir || !belongs(cur)) {continue} // 只在 target 内部展开（shared-utils 不再深挖）
    for (const spec of extractSpecifiers(readIfExists(cur))) {
      const r = resolveWithAliases(spec, path.dirname(cur), ownerDir, loadAliases(appNameOf(cur)))
      if (r && belongs(r) && !seen.has(r)) { depth.set(r, (depth.get(cur) || 0) + 1); queue.push(r) }
    }
  }
  return { entries: [...entrySet], closure: [...seen], depth }
}

// 从一个绝对路径反推它属于 apps/ 下的哪个 app
function appNameOf (absPath) {
  const rel = path.relative(ROOT, absPath)
  const parts = rel.split(path.sep)
  return parts[0] === 'apps' ? parts[1] : null
}
function appDirOf (absPath) {
  const name = appNameOf(absPath)
  return name ? path.join(APPS, name) : null
}

function run ({ onlyApp } = {}) {
  const cache = new Map()
  const rows = []
  for (const rule of RULES) {
    if (onlyApp && rule.app !== onlyApp) {continue}
    rows.push(...classify(rule, cache))
  }
  const order = ['BLOCKER_SOURCE_LIVE', 'MERGE_FIRST', 'BOTH_DEAD', 'RETIREABLE', 'RETIREABLE_AUTH_LARGER', 'NO_COUNTERPART']
  const groups = {}
  for (const r of rows) {(groups[r.cat] = groups[r.cat] || []).push(r)}
  const sumLines = a => a.reduce((s, x) => s + x.src.lines, 0)
  return { rows, groups, order, sumLines, reach: cache }
}

/**
 * 闸门自身的验收。三类用例缺一不可：
 *   正例（须被抓到）、无对应物、以及反向用例（权威可达的重复文件不得被误判）。
 * 历史用例 dex:audience-system/index.vue 已在 T0b 退役，改用现存反例。
 */
const EXPECTED = [
  // 迁移期回归：dca 本地副本经 @/mock-dca 被活页面引用，alias 失效会立刻变 BLOCKER
  { app: 'dmt-app', rel: 'mock/listing-store.ts', cat: 'RETIREABLE' },
  // 合并语义：权威可达但本方更大，必须走「先并入再退役」
  { app: 'dmt-app', rel: 'mock/metadata-bus.ts', cat: 'MERGE_FIRST' },
  // 阴影形态的诚实性：dca 的 discovery/<x>/index.vue 死副本已于 2026-11-06 删除，
  // 其扁平文件 discovery/<x>.vue 才是权威实现；按路径匹配 dfd 页应落 NO_COUNTERPART
  { app: 'dfd-app', rel: 'pages/external/index.vue', cat: 'NO_COUNTERPART' },
  // 反向用例：权威可达的逐字节相同副本不得被判为阻塞/双死
  { app: 'dex-app', rel: 'pages/exploration/customer-center/datasource/index.vue', cat: 'NO_COUNTERPART' }
];

function selftest () {
  const { groups } = run()
  const all = Object.values(groups).flat()
  let failed = 0
  for (const e of EXPECTED) {
    const hit = all.find(x => x.app === e.app && x.src.rel === e.rel)
    const ok = hit && hit.cat === e.cat
    console.log(`  ${ok ? 'PASS' : 'FAIL'} ${e.app}/${e.rel} → 期望 ${e.cat}，实际 ${hit ? hit.cat : '未扫到'}`)
    if (!ok) {failed++}
  }
  console.log('  说明：全库当前 BLOCKER_SOURCE_LIVE 为 0，故该分支无现成正例；一旦重新出现阻塞项，' +
    '应把它加回 EXPECTED 作为正例，否则该分支相当于未被覆盖')
  // 反向自检：不应把权威侧可达的重复文件误报为阻塞或双死
  const falseBlock = [...(groups.BLOCKER_SOURCE_LIVE || []), ...(groups.BOTH_DEAD || [])].filter(x => x.src.rel.includes('audience-detail.vue'))
  console.log(`  ${falseBlock.length === 0 ? 'PASS' : 'FAIL'} audience-detail.vue（权威可达的逐字节相同副本）未被误判为阻塞`)
  if (falseBlock.length) {failed++}
  return failed === 0
}

function main () {
  const argv = process.argv.slice(2)
  const clIdx = argv.indexOf('--closure')
  if (clIdx >= 0) {
    const entry = argv[clIdx + 1] && !argv[clIdx + 1].startsWith('-') ? argv[clIdx + 1] : 'data-community-app'
    const others = fs.readdirSync(APPS)
      .filter(d => d !== entry && fs.statSync(path.join(APPS, d)).isDirectory())
      .map(name => ({ name, dir: path.join(APPS, name) }))
      .concat([{ name: 'shared-utils', dir: path.join(ROOT, 'packages', 'shared-utils') }])
    const lines = p => readIfExists(p).split('\n').length
    const hist = depth => {
      const m = new Map()
      for (const d of depth.values()) {m.set(d, (m.get(d) || 0) + 1)}
      return [...m.entries()].sort((a, b) => a[0] - b[0]).map(([d, n]) => `d${d}:${n}`).join(' ')
    }
    const out = []
    for (const t of others) {
      const { entries, closure, depth } = closureOf(entry, t)
      if (!closure.length) {continue}
      out.push({
        target: t.name,
        entryFiles: entries.length,
        entryLines: entries.reduce((s, x) => s + lines(x), 0),
        closureFiles: closure.length,
        closureLines: closure.reduce((s, x) => s + lines(x), 0),
        depthHistogram: hist(depth),
        files: argv.includes('--json') ? closure.map(f => ({ path: path.relative(ROOT, f).split(path.sep).join('/'), lines: lines(f), depth: depth.get(f) })) : undefined
      })
    }
    if (argv.includes('--json')) { console.log(JSON.stringify({ entryApp: entry, dependents: out }, null, 2)); return }
    console.log(`${entry} 的跨 app 依赖闭包（跟 import 与 CSS @import 边；跟不到 localStorage 键耦合，故为下界）\n`)
    let tf = 0, tl = 0
    for (const r of out.sort((a, b) => b.closureLines - a.closureLines)) {
      tf += r.closureFiles; tl += r.closureLines
      console.log(`### ${r.target}: 入口 ${r.entryFiles} 文件 / ${r.entryLines} 行 → 闭包 ${r.closureFiles} 文件 / ${r.closureLines} 行`)
      console.log(`     ${r.depthHistogram}  （d0 = 被 ${entry} 直接引用）`)
    }
    console.log(`\n合计：${tf} 文件 / ${tl} 行 —— 迁走 ${entry} 的跨 app 耦合所需搬运的最小集`)
    console.log('提示：清单用 --closure <app> --json 取；alias 表须与文件同批迁移，先删 alias 会构建失败')
    return
  }
  const dbgIdx = argv.indexOf('--debug-aliases')
  if (dbgIdx >= 0) {
    const app = argv[dbgIdx + 1] || 'data-community-app'
    const aliases = loadAliases(app)
    console.log(`${app}: 解析出 ${aliases.length} 条 alias（最长前缀优先）`)
    for (const a of aliases.slice(0, 8)) {
      console.log(`  ${a.find} → ${a.dir.replace(`${ROOT}/`, '')}`)
    }
    const probes = ['@/mock-dca/listing-store', '@/mock-dca/data-map', '@/mock-dca/metadata-bus', '@/pages/index.vue', '@/router']
    console.log('  探针:')
    for (const p of probes) {
      const hit = resolveWithAliases(p, path.join(APPS, app, 'src'), path.join(APPS, app), aliases)
      console.log(`    ${p} → ${hit ? hit.replace(`${ROOT}/`, '') : 'null'}`)
    }
    return
  }
  if (argv.includes('--selftest')) {
    console.log('DEC-01 闸门自检：用两个已知反例验证脚本能否抓到问题')
    const ok = selftest()
    console.log(ok ? '自检通过：闸门对已知反例有效' : '自检失败：闸门本身不可信，禁止据此批量退役')
    process.exit(ok ? 0 : 2)
  }
  const onlyAppIdx = argv.indexOf('--app')
  const onlyApp = onlyAppIdx >= 0 ? argv[onlyAppIdx + 1] : null
  const { groups, order, sumLines } = run({ onlyApp })

  if (argv.includes('--json')) {
    const out = {}
    for (const cat of order) {
      out[cat] = (groups[cat] || []).map(r => ({
        app: r.app, authority: r.authority, file: r.src.rel, lines: r.src.lines,
        counterpart: r.auth ? r.auth.rel : null, counterpartLines: r.auth ? r.auth.lines : null
      }))
    }
    console.log(JSON.stringify(out, null, 2))
    process.exit((groups.BLOCKER_SOURCE_LIVE || []).length ? 1 : 0)
  }

  console.log('DEC-01 退役存活闸门\n')
  for (const cat of order) {
    const list = groups[cat] || []
    console.log(`### ${cat}  ${list.length} 文件 / ${sumLines(list)} 行`)
    if (cat === 'BLOCKER_SOURCE_LIVE' || cat === 'MERGE_FIRST' || cat === 'BOTH_DEAD') {
      for (const r of list.sort((a, b) => b.src.lines - a.src.lines).slice(0, 25)) {
        const gap = r.auth ? `  权威 ${r.auth.lines} 行 @ ${r.auth.rel}` : ''
        console.log(`      ${r.app}/${r.src.rel}  (${r.src.lines} 行)${gap}`)
      }
      if (list.length > 25) {console.log(`      …另 ${list.length - 25} 个，用 --json 取全量`)}
    }
    console.log()
  }
  const blockers = (groups.BLOCKER_SOURCE_LIVE || []).length
  const bothDead = (groups.BOTH_DEAD || []).length
  console.log(blockers
    ? `结论：${blockers} 个文件的源侧在跑、权威副本不可达 → 禁止退役，须先在权威侧接线或迁入。`
    : '结论：无「源侧在跑而权威不可达」的阻塞项。')
  console.log(`      MERGE_FIRST 仍须按 DEC-01(a) 先并入再退役；BOTH_DEAD ${bothDead} 项为两份死副本，可作纯清理。`)
  process.exit(blockers ? 1 : 0)
}

main()
