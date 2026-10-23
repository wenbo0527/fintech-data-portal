/**
 * 统一日志封装
 * 用途：替代散落的 console.log/warn/error；dev/prod 切换；统一前缀；可选上报。
 * 入参：所有方法都接受 (message, ...args)
 * 行为：
 *   - debug: dev 模式输出；prod 静默
 *   - info:  始终输出
 *   - warn:  始终输出 + warn 级别
 *   - error: 始终输出 + error 级别（不影响业务）
 *   - create(scope): 返回带作用域前缀的子 logger
 * 配置：
 *   - setSilent(true) 关闭所有输出
 *   - setSink(fn) 替换底层输出（默认 console）
 *   - setReporter(fn) 上报错误到外部（默认走 console）
 * 边界：仅日志；不抛错、不阻塞；不持久化（持久化由 tracker 负责）。
 */

import { ref } from 'vue'

let _silent = false
let _sink = console
let _reporter = null

// 调试面板日志缓冲：保留最近若干条输出，供底部调试面板展示
const _buffer = []
const MAX_BUFFER = 200
// 响应式版本号：每次写入日志自增，UI 读取它建立依赖从而自动刷新
export const logVersion = ref(0)

export function setSilent(v) { _silent = !!v }
export function setSink(s) { _sink = s || console }
export function setReporter(fn) { _reporter = typeof fn === 'function' ? fn : null }

/**
 * 读取最近的日志输出
 * @param {number} [limit=200] 最多返回条数
 * @returns {Array<{level:string, message:string, ts:number}>} 日志列表（按时间正序）
 */
export function getRecentLogs(limit = MAX_BUFFER) {
  return _buffer.slice(-limit)
}

function _isDev() {
  try { return (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV) !== false }
  catch { return true }
}

function _out(level, message, args) {
  if (_silent) return
  const sink = _sink || console
  try {
    const m = `[${level}] ${message}`
    // 写入调试面板缓冲（与 sink 输出解耦，sink 异常不影响缓冲）
    try {
      _buffer.push({ level, message: m, ts: Date.now() })
      if (_buffer.length > MAX_BUFFER) _buffer.splice(0, _buffer.length - MAX_BUFFER)
      logVersion.value++
    } catch {}
    if (level === 'error' && sink.error) sink.error(m, ...args)
    else if (level === 'warn' && sink.warn) sink.warn(m, ...args)
    else if (sink.log) sink.log(m, ...args)
  } catch {}
}

function _report(level, message, args) {
  if (!_reporter) return
  try { _reporter({ level, message, args, ts: Date.now() }) } catch {}
}

export const logger = {
  debug(message, ...args) {
    if (!_isDev()) return
    _out('debug', message, args)
  },
  info(message, ...args) { _out('info', message, args) },
  warn(message, ...args) {
    _out('warn', message, args)
    _report('warn', message, args)
  },
  error(message, ...args) {
    _out('error', message, args)
    _report('error', message, args)
  },
  /**
   * 创建带作用域前缀的子 logger
   * 子 logger 的输出形如：[error] [Horizontal:saveTask] xxx
   */
  create(scope) {
    const tag = String(scope || 'app')
    return {
      debug: (m, ...a) => logger.debug(`[${tag}] ${m}`, ...a),
      info:  (m, ...a) => logger.info(`[${tag}] ${m}`, ...a),
      warn:  (m, ...a) => logger.warn(`[${tag}] ${m}`, ...a),
      error: (m, ...a) => logger.error(`[${tag}] ${m}`, ...a)
    }
  }
}
/*
用途：统一日志封装
说明：替代 console.*；按级别输出；可静默/可替换 sink/可上报；create(scope) 返回子 logger。
边界：仅日志；不持久化（tracker 负责）；不影响业务。
*/