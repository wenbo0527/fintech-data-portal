#!/usr/bin/env node
//===============================================================================
// 子应用 mock 数据 ↔ 外部源（归档/共享包等）同步通用脚本
//
// 适用场景:
//   子应用因为 vite fs.allow 不允许跨目录读取，需要在子应用内保留源目录的副本。
//   当源目录（归档、共享包等）更新后,副本可能漂移。
//   本脚本对比 source 与 target 目录中以 prefix 开头的同名文件，并按 mode 动作。
//
// 参数(全部必填):
//   --source=<dir>      源目录(source of truth)
//   --target=<dir>      目标目录(子应用副本所在)
//   --prefix=<name>     文件名前缀,如 classify-
//   --source-ext=<.ts>  源文件扩展名(默认 .ts)
//   --target-ext=<.ts>  目标文件扩展名(默认与 source-ext 一致)
//   --ignore=<re>       跳过文件名匹配正则(可多次指定,只要匹配就跳过)
//   --label=<text>      日志里的标签,默认 `${prefix} mock`（如 'classify-* mock'）
//
// 模式(第一个位置参数):
//   sync    - 默认;缺失/不一致时覆盖副本
//   check   - 仅校验,不一致时 exit 1(用于 CI 门禁)
//   prune   - 删除目标中已不存在于源的副本(慎用)
//
// 用法:
//   # dmt-app 的 classify-* 副本同步
//   node scripts/sync-app-mocks.mjs sync \
//     --source=archive/legacy-src/mock/shared \
//     --target=apps/dmt-app/src/mock/shared \
//     --prefix=classify-
//
//   # CI 校验模式
//   node scripts/sync-app-mocks.mjs check \
//     --source=archive/legacy-src/mock/shared \
//     --target=apps/dmt-app/src/mock/shared \
//     --prefix=classify-
//
// 退出码:
//   0 = 一致 / 同步成功
//   1 = check 模式发现差异 / 参数错误 / 读写异常
//===============================================================================

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')

const COLOR = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
}

function log(level, msg) {
  const prefix = {
    info: `${COLOR.cyan}ℹ${COLOR.reset}`,
    ok: `${COLOR.green}✓${COLOR.reset}`,
    warn: `${COLOR.yellow}⚠${COLOR.reset}`,
    err: `${COLOR.red}✗${COLOR.reset}`,
  }[level] || '·'
  console.log(`${prefix} ${msg}`)
}

// -------------------- 参数解析 --------------------
function parseArgs(argv) {
  const positional = []
  const flags = {}
  const aliases = {}

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith('--')) {
      const eq = a.indexOf('=')
      if (eq !== -1) {
        flags[a.slice(2, eq)] = a.slice(eq + 1)
      } else {
        const key = a.slice(2)
        const next = argv[i + 1]
        if (next && !next.startsWith('--')) {
          flags[key] = next
          i++
        } else {
          flags[key] = true
        }
      }
    } else {
      positional.push(a)
    }
  }

  return { mode: positional[0] || 'sync', flags }
}

// 收集可重复的 --ignore=<regex>
function collectIgnores(rawArgs) {
  const ignores = []
  for (const a of rawArgs) {
    const m = /^--ignore=(.+)$/.exec(a)
    if (m) {
      ignores.push(new RegExp(m[1]))
    }
  }
  return ignores
}

// -------------------- 文件操作 --------------------
async function listFiles(dir, prefix, ext) {
  let entries = []
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch (err) {
    if (err.code === 'ENOENT') {
      return []
    }
    throw err
  }
  return entries
    .filter(e => e.isFile() && e.name.startsWith(prefix) && e.name.endsWith(ext))
    .map(e => e.name)
    .sort()
}

async function readText(file) {
  return fs.readFile(file, 'utf8')
}

function normalize(s) {
  return s.replace(/\r\n/g, '\n')
}

async function copyFile(src, dest) {
  await fs.mkdir(path.dirname(dest), { recursive: true })
  await fs.copyFile(src, dest)
}

function toAbs(p) {
  return path.isAbsolute(p) ? p : path.resolve(ROOT, p)
}

// -------------------- 主流程 --------------------
async function run({ mode, source, target, prefix, sourceExt, targetExt, ignores, label }) {
  const sourceDir = toAbs(source)
  const targetDir = toAbs(target)
  const skip = (name) => ignores.some(re => re.test(name))

  const [sourceFiles, targetFiles] = await Promise.all([
    listFiles(sourceDir, prefix, sourceExt),
    listFiles(targetDir, prefix, targetExt),
  ])

  const sFiltered = sourceFiles.filter(n => !skip(n))
  const tFiltered = targetFiles.filter(n => !skip(n))
  const sSet = new Set(sFiltered)
  const tSet = new Set(tFiltered)

  const onlyInSource = sFiltered.filter(n => !tSet.has(n))
  const onlyInTarget = tFiltered.filter(n => !sSet.has(n))
  const inBoth = sFiltered.filter(n => tSet.has(n))

  const tag = label || `${prefix}* (${path.basename(sourceDir)} → ${path.basename(targetDir)})`
  log('info', `[${tag}] 源文件: ${sourceFiles.length}, 目标文件: ${targetFiles.length}` + (ignores.length ? `, 忽略 ${ignores.length} 条规则` : ''))
  console.log()

  if (onlyInSource.length > 0) {
    log('warn', `源新增,目标缺失: ${onlyInSource.join(', ')}`)
  }
  if (onlyInTarget.length > 0) {
    log('warn', `源已移除,目标仍存在: ${onlyInTarget.join(', ')}`)
  }

  const diffs = []
  for (const name of inBoth) {
    const [a, b] = await Promise.all([
      readText(path.join(sourceDir, name)),
      readText(path.join(targetDir, name)),
    ])
    if (normalize(a) !== normalize(b)) {
      diffs.push(name)
    }
  }
  if (diffs.length > 0) {
    log('warn', `内容不一致: ${diffs.join(', ')}`)
  }

  if (onlyInSource.length === 0 && onlyInTarget.length === 0 && diffs.length === 0) {
    log('ok', '源与目标内容完全一致,无需同步')
    return 0
  }

  if (mode === 'check') {
    log('err', `check 模式:发现差异,请运行 \`node scripts/sync-app-mocks.mjs sync ...\``)
    return 1
  }

  if (mode === 'sync') {
    const toWrite = new Set([...onlyInSource, ...diffs])
    let writeCount = 0
    for (const name of toWrite) {
      const src = path.join(sourceDir, name)
      const dest = path.join(targetDir, name)
      await copyFile(src, dest)
      writeCount++
      log('ok', `已同步: ${name}`)
    }
    if (writeCount === 0) {
      log('ok', '没有需要写入的文件')
    }

    if (onlyInTarget.length > 0) {
      log(
        'warn',
        `以下文件在源已移除,但目标仍保留: ${onlyInTarget.join(', ')}` +
        `\n    如确认无用,可显式执行 \`node scripts/sync-app-mocks.mjs prune ...\``,
      )
    }
    return 0
  }

  if (mode === 'prune') {
    let removeCount = 0
    for (const name of onlyInTarget) {
      await fs.unlink(path.join(targetDir, name))
      removeCount++
      log('ok', `已删除: ${name}`)
    }
    if (removeCount === 0) {
      log('ok', '没有需要清理的文件')
    }
    return 0
  }

  log('err', `未知 mode: ${mode}`)
  return 1
}

// -------------------- 入口 --------------------
function help() {
  console.log(`用法: node scripts/sync-app-mocks.mjs <sync|check|prune> --source=<dir> --target=<dir> --prefix=<prefix> [选项]

参数:
  --source=<dir>      源目录(source of truth)
  --target=<dir>      目标目录(子应用副本)
  --prefix=<name>     文件名前缀,如 classify-
  --source-ext=<ext>  源扩展名,默认 .ts
  --target-ext=<ext>  目标扩展名,默认 = source-ext
  --ignore=<regex>    跳过文件名匹配(可重复)
  --label=<text>      日志标签(可选)

模式:
  sync    缺失/不一致时覆盖副本(默认)
  check   仅校验,exit 1 表示有差异
  prune   删除目标中已不存在于源的副本
`)
}

(async () => {
  const raw = process.argv.slice(2)
  if (raw.includes('--help') || raw.includes('-h')) {
    help()
    process.exit(0)
  }

  const { mode, flags } = parseArgs(raw)
  const ignores = collectIgnores(raw)

  // 参数校验
  const required = ['source', 'target', 'prefix']
  const missing = required.filter((k) => {
    return !flags[k]
  })
  if (missing.length > 0) {
    log('err', `缺少必填参数: ${missing.map((k) => {
      return '--' + k
    }).join(', ')}`)
    help()
    process.exit(1)
  }

  const sourceExt = flags['source-ext'] || '.ts'
  const targetExt = flags['target-ext'] || sourceExt

  try {
    const exitCode = await run({
      mode,
      source: flags.source,
      target: flags.target,
      prefix: flags.prefix,
      sourceExt,
      targetExt,
      ignores,
      label: flags.label,
    })
    process.exit(exitCode)
  } catch (err) {
    log('err', err.stack || err.message)
    process.exit(1)
  }
})()
