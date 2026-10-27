import { getNodeLabel } from './nodeTypes.js'

/**
 * 画布运行态流水数据集（mock 唯一事实来源）
 * 说明：以「客户进入事件」为最小单位生成客户/批次/流水三层数据，
 *      节点每日进出、画布每日进出、分支拆分与客户明细全部由流水反算，保证各视图口径自洽。
 * 边界：纯前端伪数据，不调用网络、不持久化；同一 (taskId, 天数, 日期) 结果稳定可复现。
 */

/** 允许统计的最大回溯天数（对齐需求 D 模块的近 90 天预设） */
const MAX_DAYS = 90

/** 每日进入事件数量区间 */
const DAILY_ENTER_MIN = 24
const DAILY_ENTER_MAX = 68

/** 客户池容量：小于每日进入量，保证存在同客户跨批次重复进入 */
const CUSTOMER_POOL_SIZE = 150

/** 单批次最大流水条数（对齐 E38 的 200 条上限） */
const MAX_RECORDS_PER_BATCH = 12

/** 人群包 mock（名称 + 量级），用于 R19「所属人群包及量级」 */
const AUDIENCE_PACKAGES = [
  { id: 'pkg_high', name: '高活跃客群包', size: 128400 },
  { id: 'pkg_mid', name: '中活跃客群包', size: 56200 },
  { id: 'pkg_silent', name: '沉默客群包', size: 12800 },
  { id: 'pkg_benefit', name: '权益敏感人群包', size: 34600 }
]

/**
 * 字符串哈希（FNV-1a 变体）
 * 入参：str(any)
 * 返回：32 位无符号整数，作为确定性随机种子
 */
function hashString(str) {
  let h = 2166136261
  const s = String(str ?? '')
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h >>> 0
}

/**
 * 线性同余伪随机数发生器
 * 入参：seed(number)
 * 返回：() => number，产出 [0,1) 区间稳定序列
 */
function createRandom(seed) {
  let x = (seed >>> 0) || 1
  return function next() {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0
    return x / 4294967296
  }
}

/**
 * 数值裁剪为整数
 * 入参：value(any)、min(number)、max(number)
 * 返回：落在 [min,max] 内的整数
 */
function clampInt(value, min, max) {
  const n = Math.round(Number(value) || 0)
  if (n < min) return min
  if (n > max) return max
  return n
}

/**
 * 左侧补零
 * 入参：value(any)、len(number)
 * 返回：补零后的字符串
 */
function pad(value, len) {
  return String(value).padStart(len, '0')
}

/**
 * Date → YYYY-MM-DD
 * 入参：date(Date)
 * 返回：日期字符串
 */
export function toDateStr(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1, 2)}-${pad(date.getDate(), 2)}`
}

/**
 * Date → HH:mm:ss
 * 入参：date(Date)
 * 返回：时间字符串
 */
export function toTimeStr(date) {
  return `${pad(date.getHours(), 2)}:${pad(date.getMinutes(), 2)}:${pad(date.getSeconds(), 2)}`
}

/**
 * 解析 YYYY-MM-DD 为 Date
 * 入参：str(string)
 * 返回：Date；格式非法返回 null
 */
export function parseDateStr(str) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(str || '').trim())
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return Number.isNaN(d.getTime()) ? null : d
}

/**
 * 归一化统计天数
 * 入参：days(any)
 * 返回：1 ~ MAX_DAYS 的整数，默认 7
 */
export function normalizeDays(days) {
  const n = Number(days)
  if (!Number.isFinite(n) || n <= 0) return 7
  return clampInt(n, 1, MAX_DAYS)
}

/**
 * 生成升序日期序列
 * 入参：days(number)、now(Date)
 * 返回：日期字符串数组
 */
export function buildDateList(days, now) {
  const n = normalizeDays(days)
  const base = now instanceof Date ? now : new Date()
  const list = []
  for (let i = n - 1; i >= 0; i--) {
    list.push(toDateStr(new Date(base.getFullYear(), base.getMonth(), base.getDate() - i)))
  }
  return list
}

/**
 * 生成自定义闭区间的升序日期序列
 * 入参：from(string YYYY-MM-DD)、to(string YYYY-MM-DD)、maxDays(number)
 * 返回：日期字符串数组；起止非法或倒置返回空数组；超出 maxDays 时截断
 */
export function buildDateListFromTo(from, to, maxDays = MAX_DAYS) {
  const start = parseDateStr(from)
  const end = parseDateStr(to)
  if (!start || !end || end < start) return []
  const limit = Math.max(1, Number(maxDays) || MAX_DAYS)
  const list = []
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  while (cursor <= end && list.length < limit) {
    list.push(toDateStr(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return list
}

/**
 * 计算闭区间天数
 * 入参：from(string)、to(string)
 * 返回：天数（>=1）；起止非法返回 1
 */
export function countDaysBetween(from, to) {
  const start = parseDateStr(from)
  const end = parseDateStr(to)
  if (!start || !end || end < start) return 1
  return Math.floor((end.getTime() - start.getTime()) / 86400000) + 1
}

/**
 * 提取分流/AB/事件分流节点的分支定义
 * 入参：node(object)
 * 返回：[{ key, label }]，顺序与出边顺序一一对应
 */
export function getBranchDefs(node) {
  const cfg = (node && node.config) || {}
  const type = node && node.type
  if (type === 'crowd-split' || type === 'audience-split') {
    const layers = Array.isArray(cfg.crowdLayers) ? cfg.crowdLayers
      : (Array.isArray(cfg.branches) ? cfg.branches : [])
    const items = layers.map((l, i) => ({
      key: l?.id || `layer_${i + 1}`,
      label: l?.crowdName || l?.name || `分群${i + 1}`
    }))
    const unmatch = cfg.unmatchBranch
    if (unmatch) items.push({ key: unmatch.id || 'unmatch', label: unmatch.crowdName || unmatch.name || '其他' })
    else if (items.length) items.push({ key: 'unmatch', label: '其他' })
    return items
  }
  if (type === 'ab-test') {
    const branches = Array.isArray(cfg.branches) ? cfg.branches
      : (Array.isArray(cfg.variants) ? cfg.variants : (Array.isArray(cfg.versions) ? cfg.versions : []))
    return branches.map((b, i) => ({
      key: b?.id || `branch_${i + 1}`,
      label: b?.name || b?.label || `变体${String.fromCharCode(65 + i)}`
    }))
  }
  if (type === 'event-split') {
    const branches = Array.isArray(cfg.branches) ? cfg.branches : []
    return branches.map((b, i) => ({
      key: b?.id || b?.key || `branch_${i + 1}`,
      label: b?.name || b?.label || (b?.type === 'miss' ? '否' : '是')
    }))
  }
  return []
}

/**
 * 读取节点展示名
 * 入参：node(object)
 * 返回：节点名称
 */
function getNodeName(node) {
  return node?.config?.nodeName || getNodeLabel(node?.type) || '节点'
}

/**
 * 构建画布邻接表（按端口序号排序，保证第 N 个出边对应 out-N）
 * 入参：connections(array)
 * 返回：Map<sourceId, [{ target, port }]>
 */
function buildAdjacency(connections) {
  const adj = new Map()
  ;(connections || []).forEach(c => {
    const source = String(c?.source ?? '')
    const target = String(c?.target ?? '')
    if (!source || !target) return
    const port = c?.sourcePort || 'out-0'
    if (!adj.has(source)) adj.set(source, [])
    adj.get(source).push({ target, port })
  })
  adj.forEach(list => {
    list.sort((a, b) => {
      const na = Number(String(a.port).replace(/\D/g, ''))
      const nb = Number(String(b.port).replace(/\D/g, ''))
      return (Number.isFinite(na) ? na : 0) - (Number.isFinite(nb) ? nb : 0)
    })
  })
  return adj
}

/**
 * 依据节点类型选择出边下标
 * 入参：node(object)、outs(array)、rand(function)
 * 返回：出边下标；无出边时返回 -1
 */
function pickOutIndex(node, outs, rand) {
  if (!outs.length) return -1
  const type = node?.type
  const cfg = (node && node.config) || {}
  if (type === 'ab-test') {
    const branches = Array.isArray(cfg.branches) ? cfg.branches
      : (Array.isArray(cfg.variants) ? cfg.variants : (Array.isArray(cfg.versions) ? cfg.versions : []))
    const weights = branches.map(b => {
      const v = b?.percentage != null ? Number(b.percentage) : (b?.ratio != null ? Number(b.ratio) : 0)
      return Number.isFinite(v) && v > 0 ? v : 0
    })
    const total = weights.reduce((a, b) => a + b, 0)
    if (total > 0) {
      let r = rand() * total
      for (let i = 0; i < weights.length; i++) {
        r -= weights[i]
        if (r <= 0) return Math.min(i, outs.length - 1)
      }
    }
    return Math.min(Math.floor(rand() * outs.length), outs.length - 1)
  }
  if (type === 'crowd-split' || type === 'audience-split') {
    const layers = Array.isArray(cfg.crowdLayers) ? cfg.crowdLayers
      : (Array.isArray(cfg.branches) ? cfg.branches : [])
    if (layers.length) {
      // 分层圈选为「命中即归属」，层级越靠前命中越多，兜底「其他」占比最低
      const weights = layers.map((_, i) => Math.max(1, layers.length - i))
      const fallback = 1
      const total = weights.reduce((a, b) => a + b, 0) + fallback
      let r = rand() * total
      for (let i = 0; i < weights.length; i++) {
        r -= weights[i]
        if (r <= 0) return Math.min(i, outs.length - 1)
      }
      return Math.min(weights.length, outs.length - 1)
    }
    return Math.min(Math.floor(rand() * outs.length), outs.length - 1)
  }
  if (type === 'event-split') {
    const branches = Array.isArray(cfg.branches) ? cfg.branches : []
    const hitIdx = branches.findIndex(b => b && b.type !== 'miss')
    const missIdx = branches.findIndex(b => b && b.type === 'miss')
    if (rand() < 0.62 && hitIdx >= 0) return Math.min(hitIdx, outs.length - 1)
    if (missIdx >= 0) return Math.min(missIdx, outs.length - 1)
    return Math.min(Math.floor(rand() * outs.length), outs.length - 1)
  }
  return Math.min(Math.floor(rand() * outs.length), outs.length - 1)
}

/**
 * 生成单条流水的节点路径
 * 入参：startNode(object)、nodesMap(Map)、adj(Map)、rand(function)、enterTime(Date)、now(Date)
 * 返回：{ records: Array, status: string, exitReason: string, endTime: number|null }
 */
function buildFlowPath(startNode, nodesMap, adj, rand, enterTime, now) {
  const records = []
  const cutoff = now instanceof Date ? now.getTime() : Infinity
  let current = startNode
  let cursor = new Date(enterTime.getTime())
  let status = 'running'
  let exitReason = 'running'
  let endTime = null
  let guard = 0
  // 上一跳的来源节点与来源端口，写入下一条 record，用于分支「流入」反查
  let prevNodeId = null
  let prevPort = null

  while (current && guard < 16) {
    guard += 1
    const record = {
      nodeId: String(current.id),
      nodeName: getNodeName(current),
      nodeType: current.type,
      enterTime: cursor.getTime(),
      exitTime: null,
      exitReason: null,
      branchPort: null,
      branchLabel: null,
      prevNodeId,
      prevPort
    }
    records.push(record)

    if (current.type === 'end') {
      cursor = new Date(cursor.getTime() + 30000)
      if (cursor.getTime() > cutoff) {
        // 尚未抵达结束节点 → 进行中
        record.exitReason = 'running'
        status = 'running'
        exitReason = 'running'
        break
      }
      record.exitTime = cursor.getTime()
      record.exitReason = 'end'
      status = 'finished'
      exitReason = 'end'
      endTime = cursor.getTime()
      break
    }

    const outs = adj.get(String(current.id)) || []
    if (!outs.length) {
      record.exitReason = 'running'
      status = 'running'
      exitReason = 'running'
      break
    }

    const outIdx = pickOutIndex(current, outs, rand)
    const out = outs[outIdx < 0 ? 0 : outIdx]
    record.branchPort = out.port
    const defs = getBranchDefs(current)
    if (defs[outIdx]) record.branchLabel = defs[outIdx].label

    // 流转耗时：普通节点 30 秒 ~ 12 分钟；等待类节点停留更久
    const isWaitLike = current.type === 'wait' || current.type === 'event-split'
    const step = isWaitLike
      ? 5 * 60000 + Math.floor(rand() * 55 * 60000)
      : 30000 + Math.floor(rand() * 11 * 60000)
    cursor = new Date(cursor.getTime() + step)

    // 等待类节点有一定概率停留在原地（等待中）
    if (isWaitLike && rand() < 0.22) {
      record.exitTime = cursor.getTime()
      record.exitReason = 'waiting'
      status = 'waiting'
      exitReason = 'waiting'
      endTime = cursor.getTime()
      break
    }

    // 事件分流未命中事件、走超时分支：视为超时掉队
    if (current.type === 'event-split') {
      const def = defs[outIdx]
      const isMiss = def && (current.config?.branches || []).some(
        b => b?.type === 'miss' && (b?.id === def.key || b?.key === def.key)
      )
      if (isMiss) {
        record.exitTime = cursor.getTime()
        record.exitReason = 'timeout'
        status = 'timeout'
        exitReason = 'timeout'
        endTime = cursor.getTime()
        break
      }
    }

    // 流转时间已超出当前时刻 → 该条流水仍在进行中
    if (cursor.getTime() > cutoff) {
      record.exitReason = 'running'
      status = 'running'
      exitReason = 'running'
      break
    }

    record.exitTime = cursor.getTime()
    record.exitReason = 'flow'
    const nextNode = nodesMap.get(String(out.target))
    if (!nextNode) {
      status = 'running'
      exitReason = 'running'
      break
    }
    // 下一跳的来源节点为当前节点，来源端口为当前走出的端口
    prevNodeId = String(current.id)
    prevPort = out.port
    current = nextNode
  }

  return { records, status, exitReason, endTime }
}

/**
 * 生成客户号
 * 入参：index(number)
 * 返回：形如 C0018862 的客户号
 */
function buildCustomerNo(index) {
  return `C${pad(1000000 + index, 7)}`
}

/**
 * 生成脱敏手机号
 * 入参：index(number)、deactivated(boolean)
 * 返回：形如 138****3821 的字符串；已注销/脱敏返回 '—'
 */
function buildMaskedPhone(index, deactivated) {
  if (deactivated) return '—'
  const prefix = 130 + (index % 10)
  const tail = pad(1000 + ((index * 91) % 9000), 4)
  return `${prefix}****${tail}`
}

/**
 * 构建流水数据集
 * 入参：options(object)
 *      - taskId：任务 ID
 *      - canvasData：画布快照 { nodes, connections }
 *      - days：统计天数
 *      - from / to：自定义闭区间（YYYY-MM-DD），同时给定时按区间生成
 *      - now：参考时间（Date）
 * 返回：{ customers, batches, records, nodes, connections, range, cutoff }
 */
export function buildFlowDataset(options = {}) {
  const taskId = String(options.taskId ?? '')
  const canvasData = options.canvasData || {}
  const days = normalizeDays(options.days)
  const now = options.now instanceof Date ? options.now : new Date()
  const nodes = Array.isArray(canvasData.nodes) ? canvasData.nodes : []
  const connections = Array.isArray(canvasData.connections) ? canvasData.connections : []
  // 自定义闭区间优先：仅在起止都给出且顺序合法时生效，否则退化为「近 N 天」
  const dateList = (options.from && options.to)
    ? buildDateListFromTo(options.from, options.to, MAX_DAYS)
    : buildDateList(days, now)
  const todayStr = toDateStr(now)

  const empty = {
    customers: [], batches: [], records: [], nodes, connections,
    range: { from: '', to: '' }, cutoff: null
  }
  if (!nodes.length) return empty

  const nodesMap = new Map(nodes.map(n => [String(n.id), n]))
  const startNode = nodes.find(n => n.type === 'start') || nodes[0]
  const adj = buildAdjacency(connections)

  // 客户池：固定容量、跨天复用 → 天然产生「同一客户多批次多次进入」
  const poolRand = createRandom(hashString(`pool:${taskId}`))
  const customerPool = []
  for (let i = 0; i < CUSTOMER_POOL_SIZE; i++) {
    const pkg = AUDIENCE_PACKAGES[Math.floor(poolRand() * AUDIENCE_PACKAGES.length)]
    const deactivated = poolRand() < 0.06
    customerPool.push({
      customerNo: buildCustomerNo(i),
      phoneMasked: buildMaskedPhone(i, deactivated),
      deactivated,
      audienceId: pkg.id,
      audienceName: pkg.name,
      audienceSize: pkg.size
    })
  }

  const records = []
  const batches = []
  const customers = new Map()
  let batchSeq = 0

  for (let d = 0; d < dateList.length; d++) {
    const dateStr = dateList[d]
    const day = parseDateStr(dateStr) || now
    const dayRand = createRandom(hashString(`day:${taskId}:${dateStr}`))
    const enterCount = DAILY_ENTER_MIN + Math.floor(dayRand() * (DAILY_ENTER_MAX - DAILY_ENTER_MIN + 1))

    for (let i = 0; i < enterCount; i++) {
      const customer = customerPool[Math.floor(dayRand() * customerPool.length)]
      const rand = createRandom(hashString(`flow:${taskId}:${dateStr}:${i}:${customer.customerNo}`))
      // 进入时刻：当天 00:00 ~ 23:59 均匀分布；仅「今天」截断到当前时刻
      const maxMinute = dateStr === todayStr ? now.getHours() * 60 + now.getMinutes() : 24 * 60
      const minute = Math.floor(rand() * Math.max(1, maxMinute))
      const enterTime = new Date(day.getTime() + minute * 60000 + Math.floor(rand() * 60000))

      const { records: flowRecords, status, exitReason, endTime } = buildFlowPath(startNode, nodesMap, adj, rand, enterTime, now)
      if (!flowRecords.length) continue

      batchSeq += 1
      const batchNo = `B${dateStr.replace(/-/g, '')}-${pad(batchSeq % 1000, 3)}`
      const pathSummary = flowRecords.map(r => r.nodeName).join(' · ')

      flowRecords.forEach((r, idx) => {
        records.push({
          id: `${batchNo}-${pad(idx, 2)}`,
          customerNo: customer.customerNo,
          batchNo,
          nodeId: r.nodeId,
          nodeName: r.nodeName,
          nodeType: r.nodeType,
          enterTime: r.enterTime,
          exitTime: r.exitTime,
          exitReason: r.exitReason,
          branchPort: r.branchPort,
          branchLabel: r.branchLabel,
          prevNodeId: r.prevNodeId,
          prevPort: r.prevPort,
          audienceId: customer.audienceId,
          audienceName: customer.audienceName,
          audienceSize: customer.audienceSize
        })
      })

      batches.push({
        batchNo,
        customerNo: customer.customerNo,
        enterTime: enterTime.getTime(),
        endTime: endTime != null ? endTime : null,
        recordCount: flowRecords.length,
        status,
        exitReason,
        pathSummary,
        audienceId: customer.audienceId,
        audienceName: customer.audienceName,
        audienceSize: customer.audienceSize
      })

      const exist = customers.get(customer.customerNo)
      if (!exist) {
        customers.set(customer.customerNo, {
          ...customer,
          firstEnterTime: enterTime.getTime(),
          batchCount: 1,
          recordCount: flowRecords.length,
          lastStatus: status
        })
      } else {
        exist.batchCount += 1
        exist.recordCount += flowRecords.length
        exist.lastStatus = status
        if (enterTime.getTime() < exist.firstEnterTime) exist.firstEnterTime = enterTime.getTime()
      }
    }
  }

  const from = dateList[0] || ''
  const to = dateList[dateList.length - 1] || ''
  return {
    customers: Array.from(customers.values()),
    batches,
    records,
    nodes,
    connections,
    range: { from, to },
    cutoff: now.getTime()
  }
}

/**
 * 按日期聚合节点每日进出
 * 入参：dataset(object)、dateList(array<string>)
 * 返回：Map<nodeId, Array<{ date, enter, exit }>>
 */
export function aggregateNodeDaily(dataset, dateList) {
  const result = new Map()
  ;(dataset.nodes || []).forEach(n => {
    result.set(String(n.id), (dateList || []).map(d => ({ date: d, enter: 0, exit: 0 })))
  })
  const indexMap = new Map()
  ;(dateList || []).forEach((d, i) => indexMap.set(d, i))

  ;(dataset.records || []).forEach(r => {
    const list = result.get(String(r.nodeId))
    if (!list) return
    const enterIdx = indexMap.get(toDateStr(new Date(r.enterTime)))
    if (enterIdx != null) list[enterIdx].enter += 1
    if (r.exitTime) {
      const exitIdx = indexMap.get(toDateStr(new Date(r.exitTime)))
      if (exitIdx != null) list[exitIdx].exit += 1
    }
  })
  return result
}

/**
 * 在有序时间桶中定位时刻所属的桶
 * 入参：buckets(Array<{ start, end }>)、ts(number)
 * 返回：桶下标；不属于任何桶返回 -1
 * 边界：要求桶按 start 升序且互不重叠，区间为左闭右开 [start, end)
 */
function findBucketIndex(buckets, ts) {
  let lo = 0
  let hi = buckets.length - 1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (ts < buckets[mid].start) hi = mid - 1
    else if (ts >= buckets[mid].end) lo = mid + 1
    else return mid
  }
  return -1
}

/**
 * 按进入时刻分桶聚合节点流量
 * 口径：进入按流水进入该节点的时刻（enterTime）归桶；流出按同一条流水离开该节点的时刻（exitTime）归桶；
 *      客户数为该桶进入流水的去重客户数。同一批次在同一节点至多一条流水，故去重后即为人数。
 * 入参：dataset(object)、nodeId(any)、buckets(Array<{ key, label, start, end }>)
 *      - start / end 为毫秒时间戳，桶区间左闭右开
 * 返回：Array<{ key, label, start, end, enter, exit, customers }>
 */
export function aggregateNodeByEnterTime(dataset, nodeId, buckets = []) {
  const list = (buckets || []).map(b => ({ ...b, enter: 0, exit: 0, customers: 0 }))
  if (!list.length) return list
  const customerSets = list.map(() => new Set())

  ;(dataset.records || []).forEach(r => {
    if (String(r.nodeId) !== String(nodeId)) return
    const enterIdx = findBucketIndex(list, r.enterTime)
    if (enterIdx >= 0) {
      list[enterIdx].enter += 1
      if (r.customerNo) customerSets[enterIdx].add(r.customerNo)
    }
    if (r.exitTime) {
      const exitIdx = findBucketIndex(list, r.exitTime)
      if (exitIdx >= 0) list[exitIdx].exit += 1
    }
  })

  list.forEach((b, i) => { b.customers = customerSets[i].size })
  return list
}

/**
 * 构建「进入时刻」时间桶
 * 入参：dateList(Array<string>)、granularity('day'|'hour')、anchorDate(string)
 *      - granularity='day'：按区间内每一天分桶
 *      - granularity='hour'：按 anchorDate（缺省取区间最后一天，即统计日）的 24 个小时分桶
 * 返回：[{ key, label, start, end }]，按 start 升序；start / end 为毫秒时间戳，区间左闭右开
 */
export function buildEnterTimeBuckets(dateList = [], granularity = 'day', anchorDate = '') {
  const days = Array.isArray(dateList) ? dateList : []
  if (granularity === 'hour') {
    const day = anchorDate || days[days.length - 1] || ''
    const base = parseDateStr(day)
    if (!base) return []
    const list = []
    for (let h = 0; h < 24; h++) {
      const start = new Date(base.getFullYear(), base.getMonth(), base.getDate(), h).getTime()
      const end = new Date(base.getFullYear(), base.getMonth(), base.getDate(), h + 1).getTime()
      list.push({ key: `${day}#${pad(h, 2)}`, label: `${pad(h, 2)}:00`, start, end })
    }
    return list
  }
  return days.map((d, i) => {
    const base = parseDateStr(d)
    if (!base) return { key: d, label: d, start: 0, end: 0 }
    const next = parseDateStr(days[i + 1]) || new Date(base.getFullYear(), base.getMonth(), base.getDate() + 1)
    return { key: d, label: d, start: base.getTime(), end: next.getTime() }
  })
}

/**
 * 聚合画布每日进出
 * 口径：canvasEnter = 当日进入画布的流水数；canvasExit = 当日流出画布（已结束/超时掉队）的流水数；
 *      canvasEndEnter = 当日抵达结束节点的流水数；avgDurationMs = 当日结束批次的平均流转时长。
 * 入参：dataset(object)、dateList(array<string>)
 * 返回：Array<{ date, canvasEnter, canvasExit, canvasEndEnter, avgDurationMs }>
 */
export function aggregateCanvasDaily(dataset, dateList) {
  const indexMap = new Map()
  ;(dateList || []).forEach((d, i) => indexMap.set(d, i))
  const res = (dateList || []).map(d => ({ date: d, canvasEnter: 0, canvasExit: 0, canvasEndEnter: 0, avgDurationMs: 0 }))
  const durationAcc = new Map()

  // 进入画布与抵达结束节点：以流水条数计
  ;(dataset.records || []).forEach(r => {
    const enterIdx = indexMap.get(toDateStr(new Date(r.enterTime)))
    if (enterIdx == null) return
    if (r.nodeType === 'start') res[enterIdx].canvasEnter += 1
    if (r.nodeType === 'end') res[enterIdx].canvasEndEnter += 1
  })

  // 流出画布：以批次结束时间计（等待中与进行中的批次不算流出）
  ;(dataset.batches || []).forEach(b => {
    if (b.endTime == null) return
    if (b.status !== 'finished' && b.status !== 'timeout') return
    const exitIdx = indexMap.get(toDateStr(new Date(b.endTime)))
    if (exitIdx == null) return
    res[exitIdx].canvasExit += 1
    const acc = durationAcc.get(exitIdx) || { total: 0, count: 0 }
    acc.total += Math.max(0, b.endTime - b.enterTime)
    acc.count += 1
    durationAcc.set(exitIdx, acc)
  })

  durationAcc.forEach((acc, idx) => {
    if (res[idx] && acc.count) res[idx].avgDurationMs = Math.round(acc.total / acc.count)
  })
  return res
}

/**
 * 解析节点各分支对应的实际出边端口
 * 入参：dataset(object)、nodeId(string)、branchDefs(array)
 * 返回：Array<string>，第 i 项对应 branchDefs[i] 的端口（无出边时回退为 out-i）
 */
export function resolveBranchPorts(dataset, nodeId, branchDefs) {
  const ports = (dataset.connections || [])
    .filter(c => String(c?.source) === String(nodeId))
    .map(c => c?.sourcePort || 'out-0')
  const sorted = ports.slice().sort((a, b) => {
    const na = Number(String(a).replace(/\D/g, ''))
    const nb = Number(String(b).replace(/\D/g, ''))
    return (Number.isFinite(na) ? na : 0) - (Number.isFinite(nb) ? nb : 0)
  })
  return (branchDefs || []).map((_, i) => sorted[i] || `out-${i}`)
}

/**
 * 聚合分支每日流入/流出
 * 入参：dataset(object)、nodeId(string)、branchDefs(array)、dateList(array<string>)
 * 返回：Map<branchKey, Array<{ date, inflow, outflow }>>
 */
export function aggregateBranchDaily(dataset, nodeId, branchDefs, dateList) {
  const map = new Map()
  ;(branchDefs || []).forEach((b) => {
    map.set(String(b.key), (dateList || []).map(d => ({ date: d, inflow: 0, outflow: 0 })))
  })
  if (!map.size) return map

  const indexMap = new Map()
  ;(dateList || []).forEach((d, i) => indexMap.set(d, i))
  const resolvedPorts = resolveBranchPorts(dataset, nodeId, branchDefs)
  const byPort = new Map()
  ;(branchDefs || []).forEach((b, i) => byPort.set(String(resolvedPorts[i]), String(b.key)))

  // 流出：源节点沿该端口离开的流水条数
  ;(dataset.records || []).forEach(r => {
    if (String(r.nodeId) !== String(nodeId)) return
    if (!r.branchPort) return
    const key = byPort.get(String(r.branchPort))
    const list = key != null ? map.get(key) : null
    if (!list) return
    const idx = indexMap.get(toDateStr(new Date(r.enterTime)))
    if (idx != null) list[idx].outflow += 1
  })

  // 流入：目标节点上标注了该来源端口的进入流水条数
  ;(dataset.records || []).forEach(r => {
    if (!r.prevPort || !r.prevNodeId) return
    if (String(r.prevNodeId) !== String(nodeId)) return
    const key = byPort.get(String(r.prevPort))
    const list = key != null ? map.get(key) : null
    if (!list) return
    const idx = indexMap.get(toDateStr(new Date(r.enterTime)))
    if (idx != null) list[idx].inflow += 1
  })
  return map
}

/**
 * 聚合节点分支拆分（流入/流出/占比）
 * 入参：dataset(object)、nodeId(string)、branchDefs(array)、dateList(array<string>)
 * 返回：Map<branchKey, { key, label, port, inflow, outflow, ratio }>
 */
export function aggregateBranchFlow(dataset, nodeId, branchDefs, dateList) {
  const map = new Map()
  const resolvedPorts = resolveBranchPorts(dataset, nodeId, branchDefs)
  ;(branchDefs || []).forEach((b, i) => {
    map.set(String(b.key), {
      key: String(b.key),
      label: b.label,
      port: String(resolvedPorts[i]),
      inflow: 0,
      outflow: 0,
      ratio: 0
    })
  })
  if (!map.size) return map

  const from = (dateList || [])[0] || ''
  const to = (dateList || [])[(dateList || []).length - 1] || ''
  const inRange = (ts) => {
    const d = toDateStr(new Date(ts))
    if (from && d < from) return false
    if (to && d > to) return false
    return true
  }

  const byPort = new Map()
  map.forEach(v => byPort.set(v.port, v))

  // 流出：源节点沿该端口离开的流水条数
  ;(dataset.records || []).forEach(r => {
    if (String(r.nodeId) !== String(nodeId)) return
    if (!r.branchPort || !inRange(r.enterTime)) return
    const item = byPort.get(String(r.branchPort))
    if (item) item.outflow += 1
  })

  // 流入：目标节点上标注了该来源端口的进入流水条数
  ;(dataset.records || []).forEach(r => {
    if (!r.prevPort || !r.prevNodeId) return
    if (String(r.prevNodeId) !== String(nodeId)) return
    if (!inRange(r.enterTime)) return
    const item = byPort.get(String(r.prevPort))
    if (item) item.inflow += 1
  })

  let totalOut = 0
  map.forEach(v => { totalOut += v.outflow })
  map.forEach(v => {
    v.ratio = totalOut > 0 ? Number((v.outflow / totalOut).toFixed(4)) : 0
  })
  return map
}

/**
 * 客户明细状态映射
 * 入参：batchStatus(string)
 * 返回：'finished' | 'running' | 'waiting'
 */
export function toFlowStatus(batchStatus) {
  if (batchStatus === 'finished') return 'finished'
  if (batchStatus === 'waiting') return 'waiting'
  return 'running'
}

/**
 * 解析批次内流水的当前节点与结果摘要
 * 入参：records(array) —— 同一批次的流水记录（按时间正序）
 * 返回：{ currentNode, currentNodeId, currentNodeType, resultSummary, duration }
 */
function summarizeBatchRecords(records) {
  const list = Array.isArray(records) ? records.slice().sort((a, b) => a.enterTime - b.enterTime) : []
  const last = list[list.length - 1] || null
  const first = list[0] || null
  const duration = last && first ? Math.max(0, (last.exitTime || last.enterTime) - first.enterTime) : 0
  let resultSummary = '流转中'
  if (last) {
    if (last.nodeType === 'end') resultSummary = '已结束'
    else if (last.exitReason === 'waiting') resultSummary = '等待事件回落'
    else if (last.exitReason === 'timeout') resultSummary = '未命中事件，超时掉队'
    else if (last.branchLabel) resultSummary = `命中分支：${last.branchLabel}`
    else if (last.exitReason === 'flow') resultSummary = `流转至：${last.nodeName}`
    else resultSummary = '流转中'
  }
  return {
    currentNode: last ? last.nodeName : '—',
    currentNodeId: last ? String(last.nodeId) : '',
    currentNodeType: last ? last.nodeType : '',
    resultSummary,
    duration
  }
}

/**
 * 构建客户明细列表（A4）
 * 口径：一行对应一次进入；同一客户多批次多次进入时按流水逐条展示，不做合并。
 * 入参：dataset(object)、options(object)
 *      - status：'finished' | 'running' | 'waiting' | 'all'，默认 'all'
 *      - keyword：客户号精确检索
 *      - nodeId：限定节点（该节点上的流水）
 *      - branchKey：限定分支（该分支上的流水）
 *      - from / to：日期区间（YYYY-MM-DD）
 *      - enterFrom / enterTo：进入时刻精确窗口（毫秒时间戳，左闭右开），用于「按进入时间查看」下钻
 *      - sortBy：'enterTime'（默认，进入时间倒序） | 'batch'（批次倒序）
 *      - page：页码，从 1 开始
 *      - pageSize：每页条数，默认 20
 * 返回：{ list, total, personCount, recordCount, statusCounts, page, pageSize, totalPages }
 */
export function buildCustomerDetailList(dataset, options = {}) {
  const opts = options || {}
  const from = opts.from || ''
  const to = opts.to || ''
  const status = opts.status && opts.status !== 'all' ? opts.status : ''
  const keyword = opts.keyword ? String(opts.keyword).trim() : ''
  const nodeId = opts.nodeId ? String(opts.nodeId) : ''
  const branchKey = opts.branchKey ? String(opts.branchKey) : ''
  const enterFrom = Number(opts.enterFrom) || 0
  const enterTo = Number(opts.enterTo) || 0
  const hasWindow = !!(enterFrom || enterTo)
  const pageSize = Math.max(1, Number(opts.pageSize) || 20)
  const page = Math.max(1, Number(opts.page) || 1)

  const records = dataset.records || []
  const batches = dataset.batches || []

  // 批次 → 流水记录索引
  const recordsByBatch = new Map()
  records.forEach(r => {
    if (!recordsByBatch.has(r.batchNo)) recordsByBatch.set(r.batchNo, [])
    recordsByBatch.get(r.batchNo).push(r)
  })

  const inRange = (ts) => {
    const d = toDateStr(new Date(ts))
    if (from && d < from) return false
    if (to && d > to) return false
    return true
  }

  // 命中节点/分支的批次集合（无时间窗口时沿用原口径）
  const hitBatches = new Set()
  // 命中节点/分支且进入时刻落在时间窗口内的批次集合（仅时间窗口下钻时生效）
  const windowBatches = new Set()
  // 命中节点/分支在各批次上的进入时刻（节点维度展示用，与节点统计分桶口径一致）
  const nodeEnterTimeMap = new Map()
  if (nodeId || branchKey) {
    records.forEach(r => {
      if (nodeId && String(r.nodeId) !== nodeId) return
      if (branchKey && String(r.branchLabel) !== branchKey && String(r.branchPort) !== branchKey) return
      hitBatches.add(r.batchNo)
      const prev = nodeEnterTimeMap.get(r.batchNo)
      if (prev == null || r.enterTime < prev) nodeEnterTimeMap.set(r.batchNo, r.enterTime)
      // 时间窗口按「命中节点上的进入时刻」判定，与节点统计分桶口径一致
      if (hasWindow) {
        if (enterFrom && r.enterTime < enterFrom) return
        if (enterTo && r.enterTime >= enterTo) return
        windowBatches.add(r.batchNo)
      }
    })
  }

  let rows = batches.filter(b => {
    if (!inRange(b.enterTime)) return false
    if (keyword && String(b.customerNo) !== keyword) return false
    if (hasWindow) {
      // 节点维度按节点进入时刻命中；画布维度按批次进入时刻命中
      if (nodeId || branchKey) {
        if (!windowBatches.has(b.batchNo)) return false
      } else {
        if (enterFrom && b.enterTime < enterFrom) return false
        if (enterTo && b.enterTime >= enterTo) return false
      }
      return true
    }
    if (hitBatches.size && !hitBatches.has(b.batchNo)) return false
    return true
  })

  const statusCounts = { all: 0, finished: 0, running: 0, waiting: 0 }
  rows.forEach(b => {
    const st = toFlowStatus(b.status)
    statusCounts.all += 1
    statusCounts[st] += 1
  })

  // R60：汇总条口径 —— 人数按客户去重，流水总条数按进入流水逐条计（两者差额即重复进入量）
  const scopePersonCount = new Set(rows.map(r => r.customerNo)).size
  const scopeRecordCount = rows.length

  if (status) rows = rows.filter(b => toFlowStatus(b.status) === status)

  const sortBy = opts.sortBy === 'batch' ? 'batch' : 'enterTime'
  // 节点/分支维度按「进入该节点/分支的时刻」排序，与展示列一致
  const sortTs = (b) => (nodeEnterTimeMap.has(b.batchNo) ? nodeEnterTimeMap.get(b.batchNo) : b.enterTime)
  rows.sort((a, b) => {
    if (sortBy === 'batch') return String(b.batchNo).localeCompare(String(a.batchNo)) || (sortTs(b) - sortTs(a))
    return sortTs(b) - sortTs(a)
  })

  const total = rows.length
  const filteredPersonCount = new Set(rows.map(r => r.customerNo)).size
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const start = (page - 1) * pageSize
  const pageRows = rows.slice(start, start + pageSize)

  const list = pageRows.map(b => {
    const batchRecords = recordsByBatch.get(b.batchNo) || []
    const summary = summarizeBatchRecords(batchRecords)
    return {
      batchNo: b.batchNo,
      customerNo: b.customerNo,
      enterTime: b.enterTime,
      // 节点/分支维度下展示「进入该节点/分支的时刻」，与节点统计分桶口径一致
      nodeEnterTime: nodeEnterTimeMap.get(b.batchNo) || b.enterTime,
      endTime: b.endTime,
      status: toFlowStatus(b.status),
      exitReason: b.exitReason,
      recordCount: b.recordCount,
      pathSummary: b.pathSummary,
      audienceId: b.audienceId,
      audienceName: b.audienceName,
      audienceSize: b.audienceSize,
      currentNode: summary.currentNode,
      currentNodeId: summary.currentNodeId,
      currentNodeType: summary.currentNodeType,
      resultSummary: summary.resultSummary,
      duration: summary.duration
    }
  })

  return {
    list,
    total,
    // 汇总条为「维度口径」聚合，不随状态胶囊筛选而改变（R60）
    personCount: scopePersonCount,
    recordCount: scopeRecordCount,
    // 当前筛选下的人数（用于分页/说明行口径）
    filteredPersonCount,
    statusCounts,
    page,
    pageSize,
    totalPages
  }
}

/**
 * 构建单客户多批次流水详情（A5）
 * 口径：批次倒序、批内按时间正序；不合并、不折叠；超过上限时截断并提示。
 * 入参：dataset(object)、customerNo(string)、options(object)
 *      - maxBatches：批次上限，默认 10
 *      - maxRecords：流水条数上限，默认 200
 *      - from / to：日期闭区间（YYYY-MM-DD），继承上游统计区间
 * 返回：{ customer, batches, truncated, totalBatches, totalRecords, limitHint }
 */
export function buildCustomerFlow(dataset, customerNo, options = {}) {
  const opts = options || {}
  const maxBatches = Math.max(1, Number(opts.maxBatches) || 10)
  const maxRecords = Math.max(1, Number(opts.maxRecords) || 200)
  const from = opts.from || ''
  const to = opts.to || ''
  const no = String(customerNo || '')

  const customer = (dataset.customers || []).find(c => String(c.customerNo) === no) || null
  const inRange = (ts) => {
    if (!from && !to) return true
    const d = toDateStr(new Date(ts))
    if (from && d < from) return false
    if (to && d > to) return false
    return true
  }
  const batches = (dataset.batches || [])
    .filter(b => String(b.customerNo) === no && inRange(b.enterTime))
    .sort((a, b) => b.enterTime - a.enterTime)

  const recordsByBatch = new Map()
  ;(dataset.records || []).forEach(r => {
    if (!recordsByBatch.has(r.batchNo)) recordsByBatch.set(r.batchNo, [])
    recordsByBatch.get(r.batchNo).push(r)
  })

  const totalBatches = batches.length
  const totalRecords = batches.reduce((sum, b) => sum + (b.recordCount || 0), 0)

  const view = []
  let usedRecords = 0
  let truncated = false
  for (let i = 0; i < batches.length; i++) {
    if (view.length >= maxBatches) { truncated = true; break }
    const b = batches[i]
    const list = (recordsByBatch.get(b.batchNo) || [])
      .slice()
      .sort((a, r) => a.enterTime - r.enterTime)
      .map(r => ({
        nodeId: String(r.nodeId),
        nodeName: r.nodeName,
        nodeType: r.nodeType,
        enterTime: r.enterTime,
        exitTime: r.exitTime,
        exitReason: r.exitReason,
        branchPort: r.branchPort,
        branchLabel: r.branchLabel,
        result: r.exitReason === 'end' ? '已结束'
          : r.exitReason === 'timeout' ? '未命中事件，超时掉队'
          : r.exitReason === 'waiting' ? '等待事件回落'
          : r.branchLabel ? `命中分支：${r.branchLabel}`
          : r.exitReason === 'flow' ? '已下发并流转' : '流转中'
      }))
    const remain = maxRecords - usedRecords
    if (list.length > remain) {
      view.push({ ...b, records: list.slice(0, remain) })
      usedRecords += remain
      truncated = true
      break
    }
    usedRecords += list.length
    const summary = summarizeBatchRecords(recordsByBatch.get(b.batchNo) || [])
    view.push({
      batchNo: b.batchNo,
      enterTime: b.enterTime,
      endTime: b.endTime,
      recordCount: b.recordCount,
      status: toFlowStatus(b.status),
      exitReason: b.exitReason,
      pathSummary: b.pathSummary,
      audienceName: b.audienceName,
      audienceSize: b.audienceSize,
      currentNode: summary.currentNode,
      resultSummary: summary.resultSummary,
      duration: summary.duration,
      records: list
    })
  }

  return {
    customer,
    batches: view,
    truncated,
    totalBatches,
    totalRecords,
    limitHint: truncated ? `仅展示最近 ${maxRecords} 条` : ''
  }
}

/**
 * 客户检索（B1 定向检索）
 * 入参：dataset(object)、keyword(string)、options(object)
 * 返回：Array<{ customerNo, phoneMasked, audienceName, audienceSize, batchCount, firstEnterTime, lastStatus }>
 */
export function searchCustomers(dataset, keyword, options = {}) {
  const opts = options || {}
  const kw = String(keyword || '').trim()
  if (!kw) return []
  const limit = Math.max(1, Number(opts.limit) || 50)
  return (dataset.customers || [])
    .filter(c => String(c.customerNo).includes(kw) || String(c.phoneMasked || '').includes(kw))
    .slice(0, limit)
}

/**
 * 构建批次分组视图（A5 批次概览）
 * 入参：dataset(object)
 * 返回：Array<{ batchNo, enterTime, endTime, recordCount, pathSummary, status, audienceName, audienceSize }>
 */
export function buildBatchOverview(dataset) {
  return (dataset.batches || [])
    .slice()
    .sort((a, b) => b.enterTime - a.enterTime)
    .map(b => ({
      batchNo: b.batchNo,
      customerNo: b.customerNo,
      enterTime: b.enterTime,
      endTime: b.endTime,
      recordCount: b.recordCount,
      pathSummary: b.pathSummary,
      status: toFlowStatus(b.status),
      exitReason: b.exitReason,
      audienceName: b.audienceName,
      audienceSize: b.audienceSize
    }))
}

export const FLOW_MOCK_CONSTANTS = {
  MAX_DAYS, DAILY_ENTER_MIN, DAILY_ENTER_MAX, CUSTOMER_POOL_SIZE,
  MAX_RECORDS_PER_BATCH, AUDIENCE_PACKAGES
}

/*
用途：画布运行态流水数据集生成与聚合
说明：客户/批次/流水三层数据由同一批「进入事件」派生；节点与画布的每日指标、分支拆分、客户明细均从流水反算，保证口径一致。
边界：纯前端 mock，不调用网络、不写存储；时间窗口上限 90 天；画布无节点时返回空数据集。
*/
