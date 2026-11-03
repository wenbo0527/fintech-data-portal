#!/usr/bin/env node
/**
 * 外数管理（apps/risk-app/src/modules/external-data）数据一致性守卫
 *
 * 背景：该模块曾长期存在「同一个产品四处不同名、同一状态三套标签、随机值决定业务语义」的问题，
 * 人工评审很难发现，故把统一方案确立的几条硬约束固化为脚本，可接 CI。
 *
 * 用法：
 *   node scripts/verify-external-data-consistency.js          # 人读输出，失败退出码 1
 *   node scripts/verify-external-data-consistency.js --json    # CI/工具消费
 *
 * 校验项：
 *   G1 档案种子的两轴口径：合作机构必须命中四档（百行/朴道/钱塘/其他）且与前缀登记一致，
 *      供应商必须命中 SUPPLIER_OPTIONS；档案上不得再出现已下线的 channel 字段
 *   G2 同一 productCode 在档案/映射/外发任务/供应商产品四处必须可解析到同一产品
 *   G3 全模块（mock/composables/api/pages/components/stores）不得用 Math.random 决定业务语义字段
 *   G4 不得对 Arco Tag 传 status prop（Tag 只有 color，写了等于没写）
 *   G5 状态标签色必须是 Arco 合法预设色名
 *   G6 档案主数据唯一写入点只有一处；派生只读位不得作为存储字段回归
 *   G7 模板可见文案不得出现「征信机构」（R08/R09 已统一为「合作机构」），脚本与注释不在扫描范围
 *   G8 budget 模块的机构名单不得自写一套全称（与 R09 主数据比对，只警告不阻断）
 *   G9 单一事实源不得回归多份：碰撞字典 / 透传占位符 / 稳定散列 / 映射的产品元信息
 *   G10 两轴 ↔ 签约主体闭环：budget 主体归属表必须全覆盖、可正反向往返，合同种子的两轴
 *      与「主体反解结果」一致，档案两轴组合必须能派生出已登记主体（否则合同落不到定价/结算键）
 */

const fs = require('fs')
const path = require('path')

const APP = path.resolve(__dirname, '..', 'apps', 'risk-app', 'src', 'modules', 'external-data')
const ROOT = path.resolve(__dirname, '..')

/** Arco Tag 的合法预设色名（@arco-design/web-vue/es/tag/interface.d.ts 的 TAG_COLORS） */
const TAG_COLORS = ['red', 'orangered', 'orange', 'gold', 'lime', 'green', 'cyan', 'blue',
  'arcoblue', 'purple', 'pinkpurple', 'magenta', 'gray']

const fail = []
const warn = []
const ok = []

function read (rel) {
  return fs.readFileSync(path.join(APP, rel), 'utf8')
}

/** 去掉块注释与行注释，避免注释里的示例/说明被当成真实代码 */
function stripComments (src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/([^:])\/\/.*$/gm, '$1')
}

function walkFiles (dir, re) {
  const out = []
  if (!fs.existsSync(dir)) return out
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...walkFiles(p, re))
    else if (re.test(e.name)) out.push(p)
  }
  return out
}

function walkVue (dir) {
  return walkFiles(dir, /\.vue$/)
}

/* ------------------------------------------------------------------ 解析 */

/** 从 mock/creditAgencies.ts 取机构主数据：[{ code, name }] */
function parseAgencies () {
  const src = stripComments(read('mock/creditAgencies.ts'))
  const rows = [...src.matchAll(/agencyCode:\s*'([^']+)',\s*\n\s*agencyName:\s*'([^']+)'/g)]
  return rows.map((m) => ({ code: m[1], name: m[2] }))
}

/** 从 archiveProducts.ts 取种子数组里的两轴字段（按对象块扫描）；channel 只用于探测残留 */
function parseSeeds () {
  const src = stripComments(read('mock/archiveProducts.ts'))
  const body = src.slice(src.indexOf('const seedArchiveProducts'))
  const seeds = []
  for (const chunk of body.split(/\n\s*\{\n/).slice(1)) {
    const id = (chunk.match(/id:\s*'([^']+)'/) || [])[1]
    const cooperationOrg = (chunk.match(/cooperationOrg:\s*'([^']*)'/) || [])[1]
    const supplier = (chunk.match(/(?:^|[\s,{])supplier:\s*'([^']*)'/) || [])[1]
    const channel = (chunk.match(/(?:^|[\s,{])channel:\s*'([^']*)'/) || [])[1]
    const status = (chunk.match(/status:\s*'([^']+)'/) || [])[1]
    const externalDataType = (chunk.match(/externalDataType:\s*'([^']*)'/) || [])[1]
    if (id) seeds.push({ id, cooperationOrg, supplier, channel, status, externalDataType })
    if (seeds.length >= 40) break
  }
  return seeds
}

/** 从 orgDictionaries.ts 取「产品前缀 → 合作机构四档」登记表（该表是文件内私有 const，不能走 parseArrayLiteral） */
function parseOrgPrefixMap () {
  const src = stripComments(read('mock/orgDictionaries.ts'))
  const body = src.slice(src.indexOf('COOPERATION_ORG_BY_PREFIX'))
  return [...body.matchAll(/re:\s*\/\^([A-Z]+)\[_-\]\/i,\s*org:\s*'([^']+)'/g)]
    .map((m) => ({ prefix: m[1], org: m[2] }))
}

function parseArrayLiteral (rel, exportName) {
  const src = stripComments(read(rel))
  // 同 objectLiteralBlock：跳过类型标注里的 []，只认赋值号后的数组字面量
  const m = new RegExp(`export const ${exportName}[^=]*=\\s*\\[`).exec(src)
  if (!m) return null
  const begin = m.index + m[0].length - 1
  const end = src.indexOf(']', begin)
  if (end < 0) return null
  return [...src.slice(begin, end).matchAll(/'([^']+)'/g)].map((row) => row[1])
}

/**
 * 取 `export const NAME ... = { ... }` 的字面量块。
 * 注意不能直接找第一个 `{`：类型标注 Record<X, { label: string; color: string }> 里也有花括号，
 * 会把块截断在类型参数上，故先定位赋值号后的那个 `{`，再做花括号配平。
 */
function objectLiteralBlock (src, name) {
  const decl = new RegExp(`export const ${name}[^=]*=\\s*\\{`)
  const m = decl.exec(src)
  if (!m) return null
  const begin = m.index + m[0].length - 1
  let depth = 0
  for (let i = begin; i < src.length; i++) {
    if (src[i] === '{') depth++
    else if (src[i] === '}') { depth--; if (depth === 0) return src.slice(begin, i + 1) }
  }
  return null
}

/** meta 字典：{ KEY: { label: 'x', color: 'y' } } */
function parseStatusMeta (rel, exportName) {
  const block = objectLiteralBlock(stripComments(read(rel)), exportName)
  if (!block) return null
  return [...block.matchAll(/(\w+):\s*\{\s*label:\s*'[^']*',\s*color:\s*'([^']+)'/g)]
    .map((m) => ({ key: m[1], color: m[2] }))
}

/* ------------------------------------------------------------------ G1 两轴口径 */
function checkOrgs () {
  const agencies = parseAgencies()
  const seeds = parseSeeds()
  const orgOptions = parseArrayLiteral('mock/orgDictionaries.ts', 'COOPERATION_ORG_OPTIONS')
  const suppliers = parseArrayLiteral('mock/orgDictionaries.ts', 'SUPPLIER_OPTIONS')
  const prefixMap = parseOrgPrefixMap()
  if (!seeds.length || !orgOptions || !suppliers || !prefixMap.length) {
    fail.push('G1 解析失败：档案种子 / 合作机构四档 / 供应商枚举 / 前缀登记表至少有一项没读到')
    return
  }
  // 渠道轴已于 2026-11-03 整轴删除，残留一个字段就是口径回归
  const staleChannel = seeds.filter((s) => s.channel !== undefined)
  if (staleChannel.length) {
    fail.push(`G1 档案种子仍残留已下线的 channel 字段：${staleChannel.map((s) => s.id).join(', ')}`)
  }
  const badOrg = seeds.filter((s) => !orgOptions.includes(s.cooperationOrg))
  const badSup = seeds.filter((s) => !suppliers.includes(s.supplier))
  if (badOrg.length) fail.push(`G1 合作机构不在四档枚举（${orgOptions.join('/')}）中：${badOrg.map((s) => `${s.id}="${s.cooperationOrg}"`).join(', ')}`)
  if (badSup.length) fail.push(`G1 供应商不在 SUPPLIER_OPTIONS 中：${badSup.map((s) => `${s.id}="${s.supplier}"`).join(', ')}`)
  // 前缀登记表是迁移规则的唯一事实源：种子必须与它一致，否则是手改数据没改字典
  const unregistered = []
  const mismatched = []
  for (const s of seeds) {
    const expected = prefixMap.find((p) => s.id.toUpperCase().startsWith(`${p.prefix}_`))
    if (!expected) {unregistered.push(s.id)} else if (expected.org !== s.cooperationOrg) {mismatched.push(`${s.id}="${s.cooperationOrg}"（前缀应记「${expected.org}」）`)}
  }
  if (mismatched.length) fail.push(`G1 合作机构与前缀登记表不一致：${mismatched.join(', ')}`)
  if (unregistered.length) warn.push(`G1 产品前缀未登记（合作机构依赖人工填）：${unregistered.join(', ')}`)
  // 十二家征信机构主数据依旧存在（回溯文件的出数主体），只是不再充当档案下拉候选池
  if (agencies.length && agencies.length < 12) fail.push(`G1 征信机构主数据只有 ${agencies.length} 家，回溯链路要求十二家`)
  if (!badOrg.length && !badSup.length && !mismatched.length && !staleChannel.length) {
    ok.push(`G1 两轴口径一致（${seeds.length} 条档案 × 合作机构 ${orgOptions.length} 档 × 供应商 ${suppliers.length} 个，channel 已无残留）`)
  }
}

/* ------------------------------------------------------------------ G2 productCode 同源 */
function checkProductCodeLinks () {
  const seeds = parseSeeds()
  const archiveIds = new Set(seeds.map((s) => s.id))
  const sources = [
    { file: 'mock/interfaceFieldMapping.ts', re: /productCode:\s*'([A-Z0-9_]+)'/g },
    { file: 'mock/outboundTasks.ts', re: /productCode:\s*'([A-Z0-9_]+)'/g },
    { file: 'mock/supplierProducts.ts', re: /productCode:\s*'([A-Z0-9_]+)'/g },
    // 回溯向导的产品用 productCode 接档案（空串代表未建档，正则不匹配，天然跳过）
    { file: 'mock/backtrackProducts.ts', re: /productCode:\s*'([A-Z0-9_]+)'/g },
  ]
  const broken = []
  for (const s of sources) {
    const codes = [...new Set([...stripComments(read(s.file)).matchAll(s.re)].map((m) => m[1]))]
    const miss = codes.filter((c) => !archiveIds.has(c))
    if (miss.length) broken.push(`${s.file}: ${miss.join(', ')}`)
  }
  if (broken.length) warn.push(`G2 以下 productCode 在档案主数据中不存在（需建档或加豁免）：\n     ${broken.join('\n     ')}`)
  else ok.push(`G2 productCode 四处同源（档案 ${archiveIds.size} 条，映射/外发/供应商/回溯清单全部可解析）`)

  // 映射是「产品级默认落库映射」，只有有落库环节的产品才该有映射
  const persisted = new Set(seeds.filter((s) => /回溯|离线批量/.test(s.externalDataType || '')).map((s) => s.id))
  const mappingCodes = [...new Set([...stripComments(read('mock/interfaceFieldMapping.ts')).matchAll(/productCode:\s*'([A-Z0-9_]+)'/g)].map((m) => m[1]))]
  const odd = mappingCodes.filter((c) => archiveIds.has(c) && !persisted.has(c))
  if (odd.length) warn.push(`G2 映射种子对应的档案不是落库型产品（默认映射无落点）：${odd.join(', ')}`)
}

/* ------------------------------------------------------------------ G3 随机值 */
/** 全模块扫描：业务语义字段（校验结论、文件大小、版本号）一律不得由 Math.random 决定 */
const RANDOM_DIRS = ['mock', 'composables', 'api', 'pages', 'components', 'stores']
function checkNoRandom () {
  const hits = []
  for (const d of RANDOM_DIRS) {
    for (const f of walkFiles(path.join(APP, d), /\.(ts|vue)$/)) {
      const src = stripComments(fs.readFileSync(f, 'utf8'))
      if (/Math\.random/.test(src)) hits.push(path.relative(APP, f))
    }
  }
  if (hits.length) fail.push(`G3 仍在用 Math.random 现算业务值（改用 mock/stableHash 稳定散列）：${hits.join(', ')}`)
  else ok.push('G3 全模块无 Math.random（种子与展示派生均确定性可复现）')
}

/* ------------------------------------------------------------------ G4/G5 标签属性与色 */
function checkTagProps () {
  const files = walkVue(APP)
  const badTag = []
  const badBtnStatus = []
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8')
    for (const m of src.matchAll(/<a-tag\b[^>]*?\s(status|:status)=/g)) {
      badTag.push(`${path.relative(ROOT, f)}:${src.slice(0, m.index).split('\n').length}`)
    }
    // Button 只有 normal/warning/danger，success 是无效值
    for (const m of src.matchAll(/<a-button\b[\s\S]{0,200}?\s:status="([^"]*)"/g)) {
      if (/success/.test(m[1])) badBtnStatus.push(path.relative(ROOT, f))
    }
  }
  if (badTag.length) fail.push(`G4 Arco Tag 无 status prop，以下位置需改为 :color：${badTag.join(', ')}`)
  else ok.push('G4 全模块无 <a-tag :status>（状态色真正生效）')
  if (badBtnStatus.length) fail.push(`G4 Button status 传入非法值 success：${[...new Set(badBtnStatus)].join(', ')}`)

  const metas = [
    { file: 'mock/archiveProducts.ts', name: 'ARCHIVE_STATUS_META' },
    { file: 'mock/archiveProducts.ts', name: 'PROGRESS_STATUS_META' },
    { file: 'mock/evaluationReports.ts', name: 'EVALUATION_STATUS_META' },
  ]
  for (const m of metas) {
    const rows = parseStatusMeta(m.file, m.name)
    if (!rows || !rows.length) { fail.push(`G5 读取 ${m.name} 失败`); continue }
    const bad = rows.filter((r) => !TAG_COLORS.includes(r.color))
    if (bad.length) fail.push(`G5 ${m.name} 非法 Tag 色名：${bad.map((b) => `${b.key}="${b.color}"`).join(', ')}`)
  }
  if (fail.every((f) => !f.startsWith('G5'))) ok.push(`G5 状态标签色全部为合法 Arco 预设色（${metas.length} 份字典）`)
}

/* ------------------------------------------------------------------ G6 单一写入点 */
function checkSingleWriter () {
  const callers = []
  const rootDir = path.resolve(APP, '..')
  const scan = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue
      const p = path.join(dir, e.name)
      if (e.isDirectory()) { scan(p); continue }
      if (!/\.(ts|vue)$/.test(e.name)) continue
      const src = stripComments(fs.readFileSync(p, 'utf8'))
      if (/upsertArchiveProduct\s*\(/.test(src) && !p.includes('mock/archiveProducts.ts')) callers.push(path.relative(ROOT, p))
    }
  }
  scan(rootDir)
  const allowed = ['apps/risk-app/src/modules/external-data/api/archiveProduct.ts']
  const extra = callers.filter((c) => !allowed.some((a) => c.endsWith(a)))
  if (extra.length) fail.push(`G6 档案主数据出现第二处写入点：${extra.join(', ')}`)
  else ok.push('G6 档案主数据唯一写入点为 api/archiveProduct.ts')

  const src = stripComments(read('mock/archiveProducts.ts'))
  const seedBlock = src.slice(src.indexOf('const seedArchiveProducts'), src.indexOf('ARCHIVE_PRODUCTS_KEY'))
  const leaked = ['hasInterfaces', 'hasBottomTable', 'isBlankCard:', 'bottomTable', 'dbTable']
    .filter((k) => src.includes(k))
    // mappingConfigured 已改为派生只读位（owner 在映射模块），种子区不得再出现该存储字段
    .concat(['mappingConfigured:'].filter((k) => seedBlock.includes(k)))
  if (leaked.length) fail.push(`G6 派生只读位又变成存储字段：${leaked.join(', ')}`)
  else ok.push('G6 派生位未回归存储字段（hasInterfaces/hasBottomTable/bottomTable/dbTable/mappingConfigured）')
}

/* ------------------------------------------------------------------ G7 术语 */
function checkTerminology () {
  const hits = []
  for (const f of walkVue(APP)) {
    const raw = fs.readFileSync(f, 'utf8')
    // 只扫模板区，并剔掉 HTML 注释：之前对全文跑「>…<」正则，脚本里 ReturnType<typeof X> 这类
    // 尖括号会跨过几百行圈中后面的注释，注释里提一嘴「持牌征信机构」就误报为用户可见文案。
    const tplStart = raw.indexOf('<template>')
    const tplEnd = raw.lastIndexOf('</template>')
    if (tplStart < 0 || tplEnd < 0 || tplEnd < tplStart) continue
    const src = raw.slice(tplStart, tplEnd).replace(/<!--[\s\S]*?-->/g, '')
    // 只看用户可见文案：模板里的属性值与文本节点
    for (const m of src.matchAll(/(?:title|label|placeholder|content)="[^"]*征信机构[^"]*"|>\s*[^<]*征信机构[^<]*</g)) {
      hits.push(`${path.relative(ROOT, f)}:${raw.slice(0, tplStart + m.index).split('\n').length}`)
    }
  }
  const extra = [
    { file: path.resolve(ROOT, 'apps/risk-app/src/layout/MainLayout.vue'), why: '菜单文案' },
    { file: path.resolve(ROOT, 'apps/risk-app/src/registry.ts'), why: '路由标题' },
    { file: path.resolve(ROOT, 'apps/risk-app/src/router.ts'), why: '路由标题' },
  ]
  for (const e of extra) {
    if (!fs.existsSync(e.file)) continue
    const src = fs.readFileSync(e.file, 'utf8')
    src.split('\n').forEach((line, i) => {
      if (line.includes('征信机构') && !line.includes('//')) hits.push(`${path.relative(ROOT, e.file)}:${i + 1}`)
    })
  }
  if (hits.length) fail.push(`G7 文案仍出现「征信机构」（R08/R09 统一为合作机构）：${hits.join(', ')}`)
  else ok.push('G7 用户可见文案已统一为「合作机构」')
}

/* ------------------------------------------------------------------ G8 budget 侧机构口径 */
function checkBudgetOrgAlignment () {
  const file = path.resolve(ROOT, 'apps/risk-app/src/modules/budget/api/supplierDictionary.ts')
  if (!fs.existsSync(file)) { warn.push('G8 未找到 budget/supplierDictionary.ts，跳过机构口径比对'); return }
  const names = [...new Set([...stripComments(fs.readFileSync(file, 'utf8'))
    .matchAll(/supplierName:\s*'([^')]+)'/g)].map((m) => m[1]))]
  const orgNames = parseAgencies().map((a) => a.name)
  const drifted = names.filter((n) => !orgNames.includes(n))
  if (drifted.length) {
    warn.push(`G8 budget 侧机构名不在 R09 主数据中（待归一到合作机构全称）：${drifted.join(', ')}`)
  } else {
    ok.push(`G8 budget 机构名与 R09 主数据一致（${names.length} 家）`)
  }
}

/* ------------------------------------------------------------------ G9 单一事实源 */
/**
 * 统一方案确立的几条「只允许一份」硬约束，防止改着改着又开第二份：
 *   1. 字段名→标准字段的碰撞字典（在 interfaceFieldMapping.AUTO_MATCH_DICT）；
 *   2. 非标准化透传占位符字面量（在 stdFieldLibrary.NON_STD_FIELD）；
 *   3. 稳定散列实现（在 mock/stableHash.ts，FNV-1a 魔数可识别）；
 *   4. 映射种子不再重复维护档案的产品名/供应商/落库表（由 archiveMappingMeta 派生）。
 */
function checkSingleSources () {
  const files = walkFiles(APP, /\.(ts|vue)$/)
  const srcs = files.map((f) => ({ rel: path.relative(APP, f), src: stripComments(fs.readFileSync(f, 'utf8')) }))
  const find = (rel) => (srcs.find((s) => s.rel === rel) || { src: '' }).src
  const offenders = (re, allow) => srcs.filter((s) => re.test(s.src) && !allow.includes(s.rel)).map((s) => s.rel)
  const bad = []

  const dictBad = offenders(/_DICT\w*:\s*Record<\s*string,\s*string\s*>\s*=\s*\{[^}]*id_md5/s, ['mock/interfaceFieldMapping.ts'])
  if (dictBad.length) bad.push(`碰撞字典又开了一份：${dictBad.join(', ')}`)
  if (/collisionDict/.test(find('mock/backtrackProducts.ts')) || srcs.some((s) => /\bcollisionDict\b/.test(s.src))) {
    bad.push('collisionDict 复活（已由 interfaceFieldMapping.autoMatchStdField 统一）')
  }

  const phBad = offenders(/'__non_standard__'/, ['mock/stdFieldLibrary.ts'])
  if (phBad.length) bad.push(`透传占位符又写了字面量：${phBad.join(', ')}`)
  const hashBad = offenders(/2166136261/, ['mock/stableHash.ts'])
  if (hashBad.length) bad.push(`稳定散列实现又写了一份：${hashBad.join(', ')}`)

  const seedBlock = /const seeds:[\s\S]*?\n\]/.exec(find('mock/interfaceFieldMapping.ts'))
  if (seedBlock && /\n\s*(productName|supplier|targetTable):/.test(seedBlock[0])) {
    bad.push('映射种子又抄了产品名/供应商/落库表（应由 archiveMappingMeta 从档案派生）')
  }

  if (bad.length) fail.push(`G9 单一事实源被破坏：${bad.join('；')}`)
  else ok.push('G9 碰撞字典/透传占位符/稳定散列/产品元信息均只有一份')
}

/* ------------------------------------------------------------------ G10 两轴 ↔ 签约主体闭环 */
const BUDGET = path.resolve(ROOT, 'apps/risk-app/src/modules/budget')
function readBudget (rel) {
  return fs.readFileSync(path.join(BUDGET, rel), 'utf8')
}

/** budget 主体名单（SUP-ID / 短名 / 工商全称），与 suppliersMock 同源 */
function parseSupplierSubjects () {
  const src = stripComments(readBudget('api/supplierDictionary.ts'))
  const body = src.slice(src.indexOf('const suppliersMock'))
  return [...body.matchAll(/id:\s*'(SUP-\d+)',\s*supplierCode:\s*'([^']*)',\s*supplierName:\s*'([^']*)'/g)]
    .map((m) => ({ id: m[1], code: m[2], name: m[3] }))
}

/** 主体归属表：SUP-ID → 两轴（2026-11-03 两轴整合的唯一映射，文件内私有 const） */
function parseAxesMap () {
  const src = stripComments(readBudget('api/supplierDictionary.ts'))
  let body = src.slice(src.indexOf('const ORG_AXES_BY_SUP_ID'))
  const end = body.indexOf('\n}')
  if (end > 0) body = body.slice(0, end)
  const map = {}
  for (const m of body.matchAll(/'(SUP-\d+)':\s*\{\s*cooperationOrg:\s*'([^']*)',\s*supplier:\s*'([^']*)'/g)) {
    map[m[1]] = { cooperationOrg: m[2], supplier: m[3] }
  }
  return map
}

/** 合同种子的 supplier / cooperationOrg / dataSupplier 三元组 */
function parseContractSeeds () {
  const src = stripComments(readBudget('api/contract.ts'))
  const body = src.slice(src.indexOf('const MOCK_CONTRACTS'))
  const rows = []
  for (const chunk of body.split(/\n\s*\{\n/).slice(1)) {
    const id = (chunk.match(/id:\s*'([^']+)'/) || [])[1]
    const supplier = (chunk.match(/(?:^|[\s,{])supplier:\s*'([^']*)'/) || [])[1]
    const cooperationOrg = (chunk.match(/cooperationOrg:\s*'([^']*)'/) || [])[1]
    const dataSupplier = (chunk.match(/dataSupplier:\s*'([^']*)'/) || [])[1]
    if (id && supplier !== undefined) rows.push({ id, supplier, cooperationOrg, dataSupplier })
    if (rows.length >= 40) break
  }
  return rows
}

/**
 * 在脚本里镜像 supplierDictionary 的派生逻辑（axesOfSubject / subjectOfAxes），
 * 用来验证「映射表 ↔ 合同种子 ↔ 档案两轴」三者自洽 —— 只查文案查不出派生函数的互逆性。
 */
function makeSubjectApi (subjects, axesMap, orgOptions, orgAlias) {
  const resolveId = (key) => {
    if (!key) return key
    if (subjects.some((s) => s.id === key)) return key
    const exact = subjects.find((s) => s.code === key || s.name === key)
    if (exact) return exact.id
    const byPrefix = subjects.find((s) => s.code.length >= 2 && key.startsWith(s.code))
    return byPrefix ? byPrefix.id : key
  }
  const normalizeOrg = (name) => {
    const raw = String(name || '').trim()
    if (!raw) return ''
    if (orgOptions.includes(raw)) return raw
    return orgAlias[raw] || '其他'
  }
  const axesOfSubject = (subject) => {
    const raw = String(subject || '').trim()
    if (!raw) return { cooperationOrg: '', supplier: '' }
    const hit = axesMap[resolveId(raw)]
    if (hit) return { cooperationOrg: hit.cooperationOrg, supplier: hit.supplier }
    return { cooperationOrg: normalizeOrg(raw) || '其他', supplier: raw }
  }
  const subjectOfAxes = (cooperationOrg, supplier) => {
    const org = String(cooperationOrg || '').trim()
    const sup = String(supplier || '').trim()
    if (!org) return ''
    const hit = subjects.find((s) => axesMap[s.id]
      && (org !== '其他' ? axesMap[s.id].cooperationOrg === org : (sup !== '' && axesMap[s.id].supplier === sup)))
    return hit ? hit.name : ''
  }
  return { axesOfSubject, subjectOfAxes }
}

function checkSubjectAxesClosure () {
  const subjects = parseSupplierSubjects()
  const axesMap = parseAxesMap()
  const contracts = parseContractSeeds()
  const orgOptions = parseArrayLiteral('mock/orgDictionaries.ts', 'COOPERATION_ORG_OPTIONS')
  const supplierOptions = parseArrayLiteral('mock/orgDictionaries.ts', 'SUPPLIER_OPTIONS')
  if (!subjects.length || !Object.keys(axesMap).length || !orgOptions || !supplierOptions) {
    fail.push('G10 解析失败：budget 主体名单 / 两轴归属表 / 合作机构四档至少有一项没读到')
    return
  }
  const aliasSrc = stripComments(read('mock/orgDictionaries.ts'))
  const aliasBlock = aliasSrc.slice(aliasSrc.indexOf('COOPERATION_ORG_ALIAS'), aliasSrc.indexOf('export function normalizeCooperationOrg'))
  const orgAlias = {}
  for (const m of aliasBlock.matchAll(/([\u4e00-\u9fa5A-Za-z]+):\s*'([^']+)'/g)) orgAlias[m[1]] = m[2]
  const api = makeSubjectApi(subjects, axesMap, orgOptions, orgAlias)
  const bad = []

  // 1. 归属表覆盖：主体名单加人必须同步补两轴，否则新主体在合同页派生不出档位
  const missing = subjects.filter((s) => !axesMap[s.id]).map((s) => s.id)
  if (missing.length) bad.push(`主体未配两轴归属：${missing.join(', ')}`)
  const orphan = Object.keys(axesMap).filter((id) => !subjects.some((s) => s.id === id))
  if (orphan.length) bad.push(`归属表存在名单外的主体：${orphan.join(', ')}`)
  // 2. 四档闭集：归属表的合作机构不得自写第五档
  const badOrg = Object.entries(axesMap).filter(([, v]) => !orgOptions.includes(v.cooperationOrg))
    .map(([k, v]) => `${k}="${v.cooperationOrg}"`)
  if (badOrg.length) bad.push(`归属表合作机构不在四档中：${badOrg.join(', ')}`)
  // 3. 往返自洽：主体 → 两轴 → 主体必须回到同一家（派生歧义会让定价挂到别的主体上）
  const licensed = orgOptions.filter((o) => o !== '其他')
  for (const o of licensed) {
    const owners = subjects.filter((s) => axesMap[s.id]?.cooperationOrg === o)
    if (owners.length !== 1) bad.push(`持牌档「${o}」对应 ${owners.length} 家主体，派生结果不确定`)
  }
  const drifted = []
  for (const s of subjects) {
    const axes = axesMap[s.id]
    if (!axes) continue
    if (api.axesOfSubject(s.name).supplier !== axes.supplier) drifted.push(`${s.id} 全称反解两轴不一致`)
    if (api.subjectOfAxes(axes.cooperationOrg, axes.supplier) !== s.name) drifted.push(`${s.id} 两轴派生不回本体（${axes.cooperationOrg}/${axes.supplier} → ${api.subjectOfAxes(axes.cooperationOrg, axes.supplier) || '∅'}）`)
  }
  if (drifted.length) bad.push(`映射表往返不自洽：${drifted.join('；')}`)
  // 4. 合同种子的两轴必须等于「按主体反解」的结果，否则编辑态一进一出就把口径改写了
  const stale = contracts.filter((c) => {
    const axes = api.axesOfSubject(c.supplier)
    return c.cooperationOrg !== axes.cooperationOrg || (c.dataSupplier || '') !== axes.supplier
  }).map((c) => `${c.id}(${c.supplier}) 记为「${c.cooperationOrg}/${c.dataSupplier}」，反解应为「${api.axesOfSubject(c.supplier).cooperationOrg}/${api.axesOfSubject(c.supplier).supplier || '—'}」`)
  if (stale.length) bad.push(`合同种子两轴与主体反解不一致：${stale.join('；')}`)
  // 5. 合同页不得再退回「十二家全称当合作机构下拉」
  for (const vue of ['pages/ContractCreate.vue', 'pages/ContractDetail.vue']) {
    const src = fs.readFileSync(path.join(BUDGET, vue), 'utf8')
    if (/partnerOrgNames/.test(src)) bad.push(`${vue} 又用主体全称列表填合作机构下拉`)
  }
  if (bad.length) fail.push(`G10 两轴↔签约主体闭环被破坏：\n     ${bad.join('\n     ')}`)

  // 6. 档案两轴组合应能派生出主体（派生不出＝合同选了它却挂不上定价/结算键）
  const combos = [...new Set(parseSeeds().map((s) => `${s.cooperationOrg}/${s.supplier}`))]
  const deadEnd = combos.filter((c) => { const [org, sup] = c.split('/'); return !api.subjectOfAxes(org, sup) })
  if (deadEnd.length) {
    warn.push(`G10 档案两轴组合派生不出签约主体（合同页需人工补选主体）：${deadEnd.join(', ')}`)
  }
  // 7. 归属表里的主体本名不在供应商快捷项中，合同页只能靠 allow-create 手输
  const notInOptions = [...new Set(Object.values(axesMap).map((v) => v.supplier))]
    .filter((sup) => sup && !supplierOptions.includes(sup))
  if (notInOptions.length) {
    warn.push(`G10 主体本名未进 SUPPLIER_OPTIONS（合同/档案供应商轴需手输）：${notInOptions.join(', ')}`)
  }
  if (!bad.length) {
    ok.push(`G10 两轴↔签约主体闭环自洽（${subjects.length} 家主体全覆盖、往返一致，${contracts.length} 条合同种子两轴与反解相符，档案 ${combos.length} 个两轴组合均可派生主体）`)
  }
}

/* ------------------------------------------------------------------ 输出 */
function main () {
  const jsonMode = process.argv.includes('--json')
  checkOrgs()
  checkProductCodeLinks()
  checkNoRandom()
  checkTagProps()
  checkSingleWriter()
  checkTerminology()
  checkBudgetOrgAlignment()
  checkSingleSources()
  checkSubjectAxesClosure()

  if (jsonMode) {
    console.log(JSON.stringify({ fail, warn, ok }, null, 2))
  } else {
    console.log('🔍 外数管理数据一致性守卫\n')
    ok.forEach((m) => console.log(`  ✅ ${m}`))
    warn.forEach((m) => console.log(`  ⚠️  ${m}`))
    fail.forEach((m) => console.log(`  ❌ ${m}`))
    console.log(`\n通过 ${ok.length} 项，警告 ${warn.length} 项，失败 ${fail.length} 项`)
  }
  process.exit(fail.length ? 1 : 0)
}

main()
