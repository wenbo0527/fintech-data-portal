/**
 * 日志服务端 · Mock 数据源
 *
 * 项目无后端服务（.env.development / .env.production 均 VITE_USE_MOCK=true），
 * 原实现里的两处网络调用（POST /api/append-log、GET /api/health）在线上必然 404；
 * health 检查失败会让 logServerReady 恒为 false —— 整条远程上报分支实际是死代码。
 * 这里用内存 sink 模拟服务端行为：
 *   - healthCheck：模拟 GET  /api/health     → 恒就绪
 *   - appendLog  ：模拟 POST /api/append-log → 追加到内存 sink（上限 1000 条，与 localStorage 一致）
 *
 * 与 modules 各模块的 mock 目录同一范式：纯内存数据源，不发任何网络请求。
 */

/** 单条日志条目（结构与 logger.ts 的 entry 一致） */
export interface LogEntry {
  t: string
  event: string
  data?: unknown
}

/** 健康检查响应（对齐原网络调用的 res.ok 语义） */
export interface HealthResponse {
  ok: boolean
}

/** 上报响应（对齐原网络调用的 res.ok 语义） */
export interface AppendResponse {
  ok: boolean
  /** 当前 sink 内日志条数 */
  count: number
}

/** 内存 sink 上限（与 logger.ts localStorage 的 1000 条上限一致） */
const MAX_ENTRIES = 1000

/** 内存 sink：模块级，页面生命周期内持续累积 */
const sink: LogEntry[] = []

/**
 * 健康检查（模拟 GET /api/health）
 * 异步返回以保持原实现的时序语义：首次调用时 ready 尚未翻转，本次不上报。
 */
export function healthCheck(): Promise<HealthResponse> {
  return Promise.resolve({ ok: true })
}

/**
 * 追加日志（模拟 POST /api/append-log）
 */
export function appendLog(entry: LogEntry): Promise<AppendResponse> {
  sink.unshift(entry)
  if (sink.length > MAX_ENTRIES) sink.splice(MAX_ENTRIES)
  return Promise.resolve({ ok: true, count: sink.length })
}
