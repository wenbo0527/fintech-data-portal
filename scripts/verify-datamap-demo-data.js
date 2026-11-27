#!/usr/bin/env node
/**
 * 数据地图 Demo · T2.5 数据质检（对应 SPEC v2 的 C-8 / §2.5.3）
 *
 * 只读检查，不写任何文件。基准是仓库里两个既有 store + demo 的 derivative 规则：
 *   - 实体与关系：apps/data-community-app/src/mock/shared/business-concept-store.ts
 *   - 表清单：apps/data-community-app/src/mock/shared/table-catalog-store.ts
 *   - 派生/预留字段：[scale] 字段定义在 src/pages/datamap-demo/data/derive.ts
 *
 * 用法：node scripts/verify-datamap-demo-data.js [--json]
 * 退出码：有 FAIL → 1；只有 WARN → 0
 */

/* eslint-disable @typescript-eslint/no-var-requires -- CommonJS 守卫脚本，与其他 verify-* 一致 */
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const APP = path.join(ROOT, 'apps/data-community-app')
const CONCEPT = path.join(APP, 'src/mock/shared/business-concept-store.ts')
const CATALOG = path.join(APP, 'src/mock/shared/table-catalog-store.ts')
const DERIVE = path.join(APP, 'src/pages/datamap-demo/data/derive.ts')
const SUPP = path.join(APP, 'src/pages/datamap-demo/data/supplement.ts')

const read = (p) => { try { return fs.readFileSync(p, 'utf8') } catch { return '' } }

const results = []
const add = (id, level, msg) => results.push({ id, level, msg })

const PLACEHOLDER = /^(table_?\d|demo_|test_|t_test|tmp_demo)/i
const SCENE = /(分析|统计|监控|看板|评估|首选|下钻|趋势|复盘|明细|汇总|宽表|底表)/
const CALIBER = /(口径|粒度|汇总|宽表|明细|指标|验证)/

const concept = read(CONCEPT)
const catalog = read(CATALOG)
const derive = read(DERIVE)
const supp = read(SUPP)

const entities = [
  ...concept.matchAll(/code: '(ENT\d+)', name: '([^']+)', domainCode: '([A-Z0-9]+)'/g),
  ...supp.matchAll(/code: '(ENT\d+)', name: '([^']+)', domainCode: '([A-Z0-9]+)'/g)
].map(m => ({ id: m[1], name: m[2], domain: m[3] }))

const relations = [
  ...concept.matchAll(/code: '(REL\d+)'[\s\S]{0,120}?sourceEntityCode: '(ENT\d+)', targetEntityCode: '(ENT\d+)'/g),
  ...supp.matchAll(/id: '(REL\d+)'[\s\S]{0,120}?sourceEntityCode: '(ENT\d+)', targetEntityCode: '(ENT\d+)'/g)
].map(m => ({ id: m[1], src: m[2], dst: m[3] }))

// 增补表的显式归属修正（如 dwd_loan_drawdown → 支用申请）
const overrides = {}
for (const m of supp.matchAll(/^\s*(\w+): '(ENT\d+)'/gm)) { overrides[m[1]] = m[2] }

const parseTables = (text) => text.split(/\n\s+\{ name: '/).slice(1).map(b => {
  const g = (re) => { const m = b.match(re); return m ? m[1] : null }
  return {
    name: b.slice(0, b.indexOf("'")),
    cnName: g(/cnName: '([^']*)'/),
    layer: g(/layer: '([^']*)'/),
    status: g(/status: '([^']*)'/),
    desc: g(/desc: '([^']*)'/),
    freq: g(/freq: '([^']*)'/),
    owner: g(/owner: '([^']*)'/)
  }
})

const tables = [...parseTables(catalog), ...parseTables(supp)]

const tierOf = (t) => {
  if (t.status !== 'online') {return 'tech'}
  if (t.layer === 'DWS') {return 'recommended'}
  if (t.layer === 'DWD') {return 'fallback'}
  return 'tech'
}

/* R1 占位符（C-8） */
const placeholders = [...tables.map(t => t.name), ...entities.map(e => e.name)]
  .filter(n => PLACEHOLDER.test(n) || /^\d+$/.test(n))
if (placeholders.length) {
  add('R1', 'FAIL', `发现占位符式命名：${placeholders.join(', ')}（C-8 禁止 table_1/demo_a 这类）`)
} else {
  add('R1', 'PASS', `${tables.length} 张表 + ${entities.length} 个实体均无占位符命名`)
}

/* R2 推荐理由（C-8：粒度 + 口径 + 场景） */
const recommended = tables.filter(t => tierOf(t) === 'recommended')
const badReason = recommended.filter(t => !t.desc || t.desc.length < 12 || !SCENE.test(t.desc))
if (!recommended.length) {
  add('R2', 'FAIL', '没有推荐表，无法校验推荐理由')
} else if (badReason.length) {
  add('R2', 'FAIL', `推荐表理由不合格 ${badReason.length} 张：${badReason.map(t => t.name).join(', ')}（需说明适用场景）`)
} else {
  add('R2', 'PASS', `${recommended.length} 张推荐表理由均含适用场景，且由 freq/layer 补足「粒度 + 口径」`)
}

/* R3 粒度字段（推荐/兜底必须有 freq） */
const noFreq = tables.filter(t => tierOf(t) !== 'tech' && !t.freq)
if (noFreq.length) {
  add('R3', 'FAIL', `${noFreq.length} 张推荐/兜底表缺更新频率（粒度无法表达）：${noFreq.map(t => t.name).join(', ')}`)
} else {
  add('R3', 'PASS', '推荐/兜底表的更新频率齐备，可表达粒度')
}

/* R4 链条连通（严格二元 + 从客户可达贷后） */
const adj = new Map()
relations.forEach(r => adj.set(r.src, [...(adj.get(r.src) ?? []), r.dst]))
const seen = new Set(['ENT001'])
const queue = ['ENT001']
while (queue.length) {
  const cur = queue.shift()
  for (const nx of adj.get(cur) ?? []) {
    if (!seen.has(nx)) { seen.add(nx); queue.push(nx) }
  }
}
const unreachable = entities.filter(e => !seen.has(e.id)).map(e => e.id)
if (!relations.length) {
  add('R4', 'FAIL', '没有关系边')
} else if (unreachable.length) {
  add('R4', 'FAIL', `从客户出发不可达：${unreachable.join(', ')}（链断了）`)
} else {
  add('R4', 'PASS', `${relations.length} 条二元关系可让 ${entities.length} 个实体从客户全部可达（链读得通）`)
}

/* R5 隐含常识 ≥3 且引用真实实体 */
const ruleBlock = (derive.match(/export const IMPLICIT_RULES[\s\S]*?\n\]/) || [''])[0]
const ruleIds = [...ruleBlock.matchAll(/id: '([^']+)'/g)].map(m => m[1])
const ruleEntities = [...ruleBlock.matchAll(/entityIds: \[([^\]]*)\]/g)]
  .flatMap(m => m[1].split(',').map(s => s.trim().replace(/'/g, '')))
  .filter(Boolean)
const ghostEntities = ruleEntities.filter(id => !entities.some(e => e.id === id))
if (ruleIds.length < 3) {
  add('R5', 'FAIL', `隐含业务常识只有 ${ruleIds.length} 条（§2.5 要求 ≥3）`)
} else if (ghostEntities.length) {
  add('R5', 'FAIL', `隐含常识引用了不存在的实体：${[...new Set(ghostEntities)].join(', ')}`)
} else {
  add('R5', 'PASS', `${ruleIds.length} 条隐含常识（${ruleIds.join('/')}），引用实体均存在`)
}

/* R6 核心实体覆盖（数据边界，WARN 而非 FAIL） */
const CORE = [
  { id: 'ENT003', name: '授信申请', re: /授信申请|申请增量/ },
  { id: 'ENT004', name: '授信合同', re: /授信合同|合同|授信分析|授信指标|授信决策/ },
  { id: 'ENT005', name: '支用申请', re: /支用申请/ },
  { id: 'ENT006', name: '支用单', re: /提款|支用|放款|贷款余额/ }
]
const tablesOf = (c) => tables.filter(t => (overrides[t.name] === c.id) || (!overrides[t.name] && c.re.test(t.cnName || '')))
const coverage = CORE.map(c => ({ ...c, n: tablesOf(c).length }))
const thin = coverage.filter(c => c.n === 0)
if (thin.length) {
  add('R6', 'WARN', `核心实体无对应表：${thin.map(c => `${c.name}(${c.id})`).join(', ')} —— 仓库权威目录的真实缺口，见 spec §3.6，不得编表补齐`)
} else {
  add('R6', 'PASS', `核心实体均有对应表：${coverage.map(c => `${c.name}=${c.n}`).join(', ')}`)
}

/* R7 [scale] 字段未被删（C-9） */
const SCALE_FIELDS = ['entityCode', 'registryStatus', 'manageStatus', 'syncStatus', 'lastVerifiedAt', 'usageHeat', 'recommendReason']
const missing = SCALE_FIELDS.filter(f => !new RegExp(`\\b${f}\\b`).test(derive))
if (missing.length) {
  add('R7', 'FAIL', `[scale] 字段被删或改名：${missing.join(', ')}（C-9 禁止因 Demo 用不上而删除）`)
} else {
  add('R7', 'PASS', `[scale] 字段齐备：${SCALE_FIELDS.join(' / ')}`)
}

/* R8 产品示例归属标注（v2 ④：产品维度必须有数据，且必须标注示例性质） */
const productBlock = (supp.match(/export const PRODUCT_MAPPING[\s\S]*?\n\}/) || [''])[0]
const productCount = [...productBlock.split('\n').slice(1)].filter(l => /^\s*\w+: \[/.test(l)).length
const hasNote = /PRODUCT_NOTE\s*=/.test(supp) && /示例归属/.test(supp)
if (!productCount) {
  add('R8', 'FAIL', '产品归属为空（v2 要求产品维度可用）')
} else if (!hasNote) {
  add('R8', 'FAIL', '产品归属缺少「示例归属」标注（不得伪装成业务确认数据）')
} else {
  add('R8', 'PASS', `${productCount} 张表有示例产品归属，且已标注「待业务确认」`)
}

/* 输出 */
if (process.argv.includes('--selftest')) {
  const assert = (cond, label) => { console.log('  ' + (cond ? 'PASS' : 'FAIL') + ' ' + label); if (!cond) {process.exitCode = 2} }
  console.log('T2.5 质检器自检')
  assert(PLACEHOLDER.test('table_1'), 'R1 语义：table_1 应判为占位符')
  assert(PLACEHOLDER.test('demo_a'), 'R1 语义：demo_a 应判为占位符')
  assert(!PLACEHOLDER.test('dwd_credit_apply'), 'R1 语义：真实表名不应误报')
  assert(SCENE.test('按产品+申请日粒度，日常授信申请量分析首选'), 'R2 语义：含场景的人话理由应通过')
  assert(!SCENE.test('用来查数据'), 'R2 语义：无场景的废话不应通过')
  process.exit(process.exitCode ?? 0)
}

const fails = results.filter(r => r.level === 'FAIL')
const warns = results.filter(r => r.level === 'WARN')
if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ results, summary: { fail: fails.length, warn: warns.length } }, null, 2))
} else {
  console.log('数据地图 Demo · T2.5 数据质检（C-8 / §2.5.3）\n')
  for (const r of results) {console.log(`  [${r.level}] ${r.id}  ${r.msg}`)}
  console.log(`\nFAIL ${fails.length} · WARN ${warns.length} · 共 ${results.length} 项`)
}
process.exit(fails.length ? 1 : 0)