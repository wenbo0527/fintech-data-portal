/**
 * [重构方案 P3 · 服务暴露] 消费侧派生层
 *
 * 唯一事实源仍是 table-catalog-store 的 `table.services[]`（管理侧"配入口"）。
 * 本文件只做两件事，均为纯前端挡板：
 *   1. flattenServices()：把所有未删除表的服务形态打平成带来源表信息的行，
 *      供 api-market（消费侧市场）与 management/service（运维度量视角）同源读取；
 *   2. opsOf()/apiDocOf()：由服务 id 的确定性哈希派生"运行指标/调用文档"
 *      （QPS、成功率、SQL、curl、参数表），同一服务任何时候刷新值不变，
 *      看起来像后端返回，实际零网络请求。
 */
import {
  TableCatalogStore,
  type ServiceExposure,
  type ServiceKind,
  type Sensitivity
} from './table-catalog-store'

// ---------------- 1. 打平视图 ----------------

/** 一条服务形态 + 其来源表的展示字段（打平行） */
export interface ServiceRow extends ServiceExposure {
  tableId: string
  tableName: string
  tableCnName: string
  domain: string
  sourceSystem: string
  storage: string
  tableOwner: string
  tableSensitivity: Sensitivity
  tableStatus: string
}

/** 打平所有（未删除）表的服务形态；可按形态过滤。放在 computed 里即获得响应式 */
export function flattenServices(kind?: ServiceKind): ServiceRow[] {
  const rows: ServiceRow[] = []
  for (const t of TableCatalogStore.all()) {
    for (const s of t.services) {
      if (kind && s.kind !== kind) continue
      rows.push({
        ...s,
        tableId: t.tableId,
        tableName: t.name,
        tableCnName: t.cnName,
        domain: t.domain,
        sourceSystem: t.sourceSystem,
        storage: t.storage,
        tableOwner: t.owner,
        tableSensitivity: t.sensitivity,
        tableStatus: t.status
      })
    }
  }
  return rows
}

// ---------------- 2. 确定性运行指标（挡板） ----------------

export interface ServiceOps {
  method: 'GET' | 'POST'
  qps: number
  /** 今日调用量 */
  dailyCalls: string
  successRate: number
  latency: number
  qpsLimit: number
  topCallers: Array<{ system: string; qps: number; dailyCalls: string }>
}

const CALLER_POOL = [
  '营销系统', '风控决策', '客户中心', '财务系统', '贷后管理',
  'APP 网关', 'BI 看板', '审计平台', '运营工具', '客服系统'
]

/** FNV-1a 简单字符串哈希：同输入恒同输出 */
function hash(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}

/** 由服务 id 派生稳定的"运行指标"。已下线服务指标归零 */
export function opsOf(svc: Pick<ServiceExposure, 'id' | 'name' | 'status'>): ServiceOps {
  if (svc.status !== 'online') {
    return { method: 'GET', qps: 0, dailyCalls: '0', successRate: 0, latency: 0, qpsLimit: 1000, topCallers: [] }
  }
  const h = hash(svc.id + svc.name)
  const method: 'GET' | 'POST' = h % 3 === 0 ? 'POST' : 'GET'
  const qps = 500 + (h % 8500)
  const callerCount = 2 + (h % 3)
  const topCallers = Array.from({ length: callerCount }, (_, i) => {
    const ch = hash(svc.id + '-caller-' + i)
    return {
      system: CALLER_POOL[(ch + i * 3) % CALLER_POOL.length],
      qps: Math.max(50, Math.round(qps / (i + 1.6))),
      dailyCalls: Math.round(qps / (i + 1.6) * 86400 / 10000) + '万'
    }
  })
  return {
    method,
    qps,
    dailyCalls: Math.round(qps * 86400 / 10000) + '万',
    successRate: Math.round((99 + ((h % 95) / 100)) * 100) / 100, // 99.00 ~ 99.94
    latency: 20 + (h % 120),
    qpsLimit: Math.ceil(qps / 1000) * 1500,
    topCallers
  }
}

// ---------------- 3. 调用文档生成（消费侧"给文档"） ----------------

export interface ApiParamDoc {
  name: string
  type: string
  operator: string
  required: boolean
  example: string
  description: string
}

export interface ApiDoc {
  sql: string
  requestParams: ApiParamDoc[]
  responseParams: ApiParamDoc[]
  curlBody: Record<string, unknown>
}

const TYPE_EXAMPLE: Record<string, string> = {
  string: 'demo-001', int: '1', bigint: '10001', double: '98.5', decimal: '1000.00',
  date: '2026-09-01', datetime: '2026-09-01 10:00:00', boolean: 'true'
}

/**
 * 由来源表的字段元数据生成"查询 API"调用文档（纯前端模板拼装）。
 * 找不到来源表时返回一份通用兜底文档。
 */
export function apiDocOf(row: ServiceRow): ApiDoc {
  const t = TableCatalogStore.byName(row.tableName)
  const fields = (t?.fields ?? []).slice(0, 6)
  const pick = (types: string[]) =>
    fields.filter(f => types.includes(f.type.toLowerCase()))
  // 请求参数：取 id / code / no / date 类字段，兜底取前两个字段
  const reqFields = pick(['string', 'bigint', 'date', 'datetime'])
    .filter(f => /id|code|no|date|month/i.test(f.name))
    .slice(0, 3)
  const finalReq = reqFields.length ? reqFields : fields.slice(0, 2)
  const requestParams: ApiParamDoc[] = finalReq.map(f => ({
    name: f.name,
    type: f.type,
    operator: /date|time/i.test(f.name) ? 'between' : '=',
    required: /id|code|no/i.test(f.name),
    example: TYPE_EXAMPLE[f.type.toLowerCase()] || 'demo',
    description: f.description
  }))
  const responseParams: ApiParamDoc[] = fields.map(f => ({
    name: f.name,
    type: f.type,
    operator: '',
    required: false,
    example: TYPE_EXAMPLE[f.type.toLowerCase()] || 'demo',
    description: f.description
  }))
  const where = finalReq.map(f => `  AND ${f.name} = \${${f.name}}`).join('\n')
  const sql = `SELECT ${fields.map(f => f.name).join(', ') || '*'}\nFROM ${row.tableName}\nWHERE 1 = 1\n${where || '  -- 无必填过滤条件'}\nLIMIT \${pageSize} OFFSET \${(pageNum - 1) * pageSize}`
  const curlBody: Record<string, unknown> = {}
  for (const p of requestParams) curlBody[p.name] = p.example
  curlBody.pageNum = 1
  curlBody.pageSize = 10
  return { sql, requestParams, responseParams, curlBody }
}
