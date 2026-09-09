const { spawn, execSync } = require('child_process')
const http = require('http')
const fs = require('fs')
const path = require('path')

function getPidsByPort(port) {
  try {
    const out = execSync(`lsof -ti tcp:${port}`, { stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim()
    if (!out) return []
    return out.split('\n').filter(Boolean)
  } catch {
    return []
  }
}

async function killByPort(name, port, timeoutMs = 10000) {
  const pids = getPidsByPort(port)
  if (!pids.length) return true
  console.warn(`[${name}] 发现端口占用(${port})，准备关闭进程: ${pids.join(', ')}`)
  for (const pid of pids) {
    try {
      process.kill(Number(pid), 'SIGKILL')
    } catch {}
  }
  const start = Date.now()
  return new Promise((resolve) => {
    const check = () => {
      const left = getPidsByPort(port)
      if (!left.length) {
        console.log(`[${name}] 端口(${port})已释放`)
        resolve(true)
      } else if (Date.now() - start > timeoutMs) {
        console.error(`[${name}] 端口(${port})释放超时，仍存在进程: ${left.join(', ')}`)
        resolve(false)
      } else {
        setTimeout(check, 300)
      }
    }
    check()
  })
}

function waitForPort(name, url, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    const start = Date.now()
    console.log(`[${name}] 正在等待端口就绪: ${url}...`)
    
    const tryOnce = () => {
      const req = http.get(url, (res) => {
        const { statusCode } = res
        res.resume()
        if (statusCode === 200 || statusCode === 301 || statusCode === 302) {
          console.log(`[${name}] 端口已就绪!`)
          resolve(true)
        } else {
          if (Date.now() - start > timeoutMs) {
            console.error(`[${name}] 等待超时(状态码: ${statusCode}): ${url}`)
            reject(new Error('timeout'))
          } else {
            setTimeout(tryOnce, 1000)
          }
        }
      })
      
      req.on('error', (err) => {
        if (Date.now() - start > timeoutMs) {
          console.error(`[${name}] 等待超时: ${url}`)
          reject(new Error('timeout'))
        } else {
          setTimeout(tryOnce, 1000)
        }
      })
    }
    tryOnce()
  })
}

function runDev(name, cwd, script = 'dev', extraEnv = {}) {
  // 检查 node_modules 是否存在
  if (!fs.existsSync(path.join(cwd, 'node_modules'))) {
    console.error(`[${name}] 错误: 未发现 node_modules，请先在 ${cwd} 目录下运行 npm install`)
    return null
  }

  console.log(`[${name}] 正在启动... (目录: ${cwd}, 脚本: ${script})`)
  const p = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', script], { 
    cwd, 
    stdio: 'inherit', 
    env: { ...process.env, FORCE_COLOR: 'true', ...extraEnv } 
  })
  
  p.on('error', (err) => {
    console.error(`[${name}] 启动失败:`, err)
  })
  
  p.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`[${name}] 已退出，退出码: ${code}`)
    }
  })
  
  return p
}

async function main() {
  const root = process.cwd()
  // 已归档子应用（ARCHIVED 2026-09-09），能力已并入 data-community-app：
  //   - admin-app（原 5182）
  //   - asset-app（原 5179）
  //   - dfd-app  （原 5181）
  //   - dmt-app  （原 5184）
  // 如需重新启用，对应端口请见各应用 ARCHIVED.md。
  const apps = [
    { name: 'horizontal-canvas', cwd: `${root}/apps/horizontal-canvas`, url: 'http://127.0.0.1:5175/', port: 5175 },
    { name: 'risk-app', cwd: `${root}/apps/risk-app`, url: 'http://127.0.0.1:5176/', port: 5176 },
    { name: 'touch', cwd: `${root}/apps/touch`, url: 'http://127.0.0.1:5181/', port: 5181 },
    { name: 'data-community-app', cwd: `${root}/apps/data-community-app`, url: 'http://127.0.0.1:5185/', port: 5185 }
  ]
  const mainApp = { name: 'main-app', cwd: root, url: 'http://127.0.0.1:5173/', port: 5173 }
  
  console.log('--- 启动子应用流程开始 ---')
  // 预释放端口，确保使用默认地址。设置环境变量 SKIP_KILL=1 可跳过该步骤
  if (process.env.SKIP_KILL !== '1') {
    for (const a of [...apps, mainApp]) {
      await killByPort(a.name, a.port)
    }
  } else {
    console.log('跳过端口预释放 (SKIP_KILL=1)')
  }

  const children = apps.map(a => runDev(a.name, a.cwd, 'dev', a.env)).filter(Boolean)
  
  if (children.length < apps.length) {
    console.error('--- 部分子应用无法启动，请检查上方 node_modules 提示 ---')
  }

  try {
    // 即使子应用没启动，我们也尝试等待（会超时）或者直接启动主应用
    await Promise.all(apps.map(a => waitForPort(a.name, a.url).catch(() => {
      console.warn(`[${a.name}] 端口等待失败，跳过...`)
      return false
    })))
    
    console.log('--- 流程继续，正在启动主应用 ---')
    const mainP = runDev('main-app', root, 'dev:main')
    if (mainP) children.push(mainP)
  } catch (err) {
    console.error('--- 启动流程异常 ---', err)
  }
  
  const exitAll = () => {
    console.log('\n正在关闭所有进程...')
    children.forEach(p => {
      if (p && p.kill) {
        try { p.kill() } catch (e) {}
      }
    })
  }
  
  process.on('SIGINT', () => { exitAll(); process.exit(0) })
  process.on('SIGTERM', () => { exitAll(); process.exit(0) })
}

main().catch(err => {
  console.error('全局错误:', err)
  process.exit(1)
})
