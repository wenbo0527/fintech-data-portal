/**
 * 应用日志 · 本地留存 + Mock 上报
 *
 * 项目无后端服务（.env.development / .env.production 均 VITE_USE_MOCK=true），
 * 原实现里的两处网络调用（POST /api/append-log、GET /api/health）在线上必然 404；
 * health 检查失败会让 logServerReady 恒为 false —— 整条远程上报分支实际是死代码。
 * 现改为：本地日志仍写 localStorage，上报走 mock 日志服务端（内存 sink），
 * 15s 健康检查节流与「首次调用不上报」的时序语义保持不变。
 */
import { appendLog, healthCheck } from './mock/logServer'

export function log(event: string, data?: any) {
  try {
    const entry = { t: new Date().toISOString(), event, data }
    const arr = JSON.parse(localStorage.getItem('appLogs') || '[]')
    arr.unshift(entry)
    arr.splice(0, 1000)
    localStorage.setItem('appLogs', JSON.stringify(arr))
    console.info('[LOG]', event, data)
  } catch {}
  try {
    const entry = { t: new Date().toISOString(), event, data }
    if (shouldSendRemote()) {
      appendLog(entry).catch(() => { /* swallow */ })
    }
  } catch {}
}

let lastHealthCheck = 0
let logServerReady = false
function shouldSendRemote() {
  const now = Date.now()
  if (now - lastHealthCheck > 15000) {
    lastHealthCheck = now
    try {
      healthCheck()
        .then(res => { logServerReady = res.ok })
        .catch(() => { logServerReady = false })
    } catch { logServerReady = false }
  }
  return logServerReady
}
