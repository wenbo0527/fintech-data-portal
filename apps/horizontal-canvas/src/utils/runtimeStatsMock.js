import { TaskStorage } from './taskStorage.js'
import {
  buildFlowDataset,
  aggregateNodeDaily,
  aggregateNodeByEnterTime,
  buildEnterTimeBuckets,
  aggregateCanvasDaily,
  aggregateBranchDaily,
  aggregateBranchFlow,
  buildDateList,
  buildDateListFromTo,
  countDaysBetween,
  getBranchDefs,
  buildCustomerDetailList,
  buildCustomerFlow,
  buildBatchOverview,
  searchCustomers,
  normalizeDays,
  toDateStr
} from './canvasFlowDataset.js'

/**
 * 运行态统计 mock（节点级/分支级/画布级/客户级）
 * 说明：纯前端 mock，无后端；数据由 canvasFlowDataset 统一生成，各视图口径自洽。
 * 边界：不持久化、不调用网络；同一 (taskId, 天数, 统计日) 结果稳定可复现。
 */

/** 数据集缓存：key = taskId|days|统计日，避免重复生成 */
const datasetCache = new Map()

/** 兜底画布：任务不存在时使用，保证统计面板仍有数据 */
const FALLBACK_CANVAS = {
  nodes: [
    { id: 'start', type: 'start', config: { nodeName: '开始' } },
    { id: 'end', type: 'end', config: { nodeName: '结束' } }
  ],
  connections: [
    { source: 'start', target: 'end', sourcePort: 'out-0', targetPort: 'in' }
  ]
}

/**
 * 读取任务画布快照
 * 入参：taskId(any)
 * 返回：{ nodes, connections }
 */
function getCanvasData(taskId) {
  try {
    const task = TaskStorage.getTaskById(taskId)
    const data = task?.canvasData
    if (data && Array.isArray(data.nodes) && data.nodes.length) return data
  } catch {}
  return FALLBACK_CANVAS
}

/**
 * 解析统计区间为「天数 + 日期序列」
 * 入参：options(object) —— { days, from, to, now }
 * 返回：{ days:number, dateList:Array<string> }
 * 说明：自定义闭区间优先；区间非法时回退为「近 N 天」
 */
function resolveRange(options = {}) {
  const now = options.now instanceof Date ? options.now : new Date()
  const from = options.from || ''
  const to = options.to || ''
  if (from && to) {
    const dateList = buildDateListFromTo(from, to, 90)
    if (dateList.length) {
      return { days: countDaysBetween(dateList[0], dateList[dateList.length - 1]), dateList, now, from, to }
    }
  }
  const days = normalizeDays(options.days)
  return { days, dateList: buildDateList(days, now), now, from: '', to: '' }
}

/**
 * 获取（带缓存的）画布流水数据集
 * 入参：taskId(any)、options(object)
 *      - days：统计天数，默认 7；上限 90
 *      - from / to：自定义闭区间（YYYY-MM-DD）
 *      - now：参考时间（Date）
 * 返回：dataset(object)
 */
export function getFlowDataset(taskId, options = {}) {
  const { days, now, from, to } = resolveRange(options)
  const key = `${String(taskId)}|${from || days}|${to || ''}|${toDateStr(now)}`
  if (datasetCache.has(key)) return datasetCache.get(key)
  const dataset = buildFlowDataset({
    taskId: String(taskId),
    canvasData: getCanvasData(taskId),
    days,
    from,
    to,
    now
  })
  datasetCache.set(key, dataset)
  return dataset
}

/**
 * 清空数据集缓存（画布结构变更后调用）
 */
export function clearFlowDatasetCache() {
  datasetCache.clear()
}

/**
 * 解析节点的分支定义
 * 入参：dataset(object)、nodeId(any)
 * 返回：[{ key, label }]
 */
function resolveBranchDefs(dataset, nodeId) {
  const node = (dataset.nodes || []).find(n => String(n.id) === String(nodeId))
  return node ? getBranchDefs(node) : []
}

export const RuntimeStatsMock = {
  /**
   * 节点每日进入/离开统计
   * 入参：taskId(any)、nodeId(any)、options(object) —— { days, from, to }
   * 返回：[{ date, enter, exit }]
   */
  getNodeDailyStats(taskId, nodeId, options = {}) {
    try {
      const { days, dateList, now, from, to } = resolveRange(options)
      const dataset = getFlowDataset(taskId, { days, from, to, now })
      const map = aggregateNodeDaily(dataset, dateList)
      return map.get(String(nodeId)) || dateList.map(date => ({ date, enter: 0, exit: 0 }))
    } catch { return [] }
  },

  /**
   * 节点按「进入时刻」分桶统计（支持按日/按小时查看，不只有总计）
   * 入参：taskId(any)、nodeId(any)、options(object) —— { days, from, to, granularity, anchorDate }
   *      - granularity：'day'（默认，按区间内每天）| 'hour'（按 anchorDate 当天逐小时）
   *      - anchorDate：按小时时的锚定日期（YYYY-MM-DD），缺省取区间最后一天
   * 返回：[{ key, label, start, end, enter, exit, customers }]
   *      - enter：该时间桶内进入该节点的流水数
   *      - exit：该时间桶内离开该节点的流水数（按离开时刻归桶）
   *      - customers：该时间桶内进入该节点的去重客户数
   */
  getNodeEnterTimeStats(taskId, nodeId, options = {}) {
    try {
      const { days, dateList, now, from, to } = resolveRange(options)
      const dataset = getFlowDataset(taskId, { days, from, to, now })
      const granularity = options.granularity === 'hour' ? 'hour' : 'day'
      const buckets = buildEnterTimeBuckets(dateList, granularity, options.anchorDate || '')
      return aggregateNodeByEnterTime(dataset, nodeId, buckets)
    } catch { return [] }
  },

  /** 用户在画布中的路径：优先返回 mock 流水中的真实路径 */
  getUserPath(taskId, userId) {
    try {
      const key = String(userId || '')
      if (key) {
        const dataset = getFlowDataset(taskId, { days: 7 })
        const matched = (dataset.customers || []).find(
          c => String(c.customerNo) === key || String(c.phoneMasked || '').includes(key)
        )
        if (matched) {
          const batches = (dataset.batches || [])
            .filter(b => String(b.customerNo) === matched.customerNo)
            .sort((a, b) => b.enterTime - a.enterTime)
          const lastBatch = batches[0]
          if (lastBatch) {
            const records = (dataset.records || [])
              .filter(r => r.batchNo === lastBatch.batchNo)
              .sort((a, b) => a.enterTime - b.enterTime)
            if (records.length) return records.map(r => String(r.nodeId))
          }
        }
      }
      // 兜底：无匹配客户时按确定性哈希在图上推一条路径
      const nodes = getCanvasData(taskId).nodes || []
      const conns = getCanvasData(taskId).connections || []
      if (!nodes.length) return []
      const start = nodes.find(n => n.type === 'start') || nodes[0]
      const adj = new Map()
      conns.forEach(e => {
        const s = e.source
        const t = e.target
        if (!adj.has(s)) adj.set(s, [])
        adj.get(s).push(t)
      })
      const path = [start.id]
      let curr = start.id
      for (let k = 0; k < 10; k++) {
        const nexts = adj.get(curr) || []
        if (!nexts.length) break
        const pick = (key && key.length) ? (key.charCodeAt(0) + k) % nexts.length : 0
        const nxt = nexts[pick]
        path.push(nxt)
        curr = nxt
      }
      return path
    } catch { return [] }
  },

  /**
   * 按分支拆分的每日出人数（用于分流/AB节点）
   * 入参：taskId(any)、nodeId(any)、branches(array)、options(object) —— { days, from, to }
   * 返回：[{ date, branchExits }]
   */
  getNodeDailyBranchStats(taskId, nodeId, branches = [], options = {}) {
    try {
      const { days, dateList, now, from, to } = resolveRange(options)
      const dataset = getFlowDataset(taskId, { days, from, to, now })
      // 分支定义以节点配置为准；调用方传入的分支仅用于兜底命名
      let defs = resolveBranchDefs(dataset, nodeId)
      if (!defs.length && Array.isArray(branches) && branches.length) {
        defs = branches.map((b, i) => ({
          key: String(b?.id ?? `branch_${i + 1}`),
          label: b?.label || b?.name || `分支${i + 1}`
        }))
      }
      if (!defs.length) return []
      const daily = aggregateBranchDaily(dataset, nodeId, defs, dateList)
      return dateList.map((date, i) => {
        const branchExits = {}
        defs.forEach(d => {
          const list = daily.get(String(d.key)) || []
          branchExits[String(d.key)] = Number(list[i]?.outflow) || 0
        })
        return { date, branchExits }
      })
    } catch { return [] }
  },

  /**
   * 分支汇总（流入/流出/占比），供 A3 分支表使用
   * 入参：taskId(any)、nodeId(any)、options(object) —— { days, from, to }
   * 返回：[{ key, label, port, inflow, outflow, ratio }]
   */
  getBranchSummary(taskId, nodeId, options = {}) {
    try {
      const { days, dateList, now, from, to } = resolveRange(options)
      const dataset = getFlowDataset(taskId, { days, from, to, now })
      const defs = resolveBranchDefs(dataset, nodeId)
      if (!defs.length) return []
      const map = aggregateBranchFlow(dataset, nodeId, defs, dateList)
      return Array.from(map.values())
    } catch { return [] }
  },

  /**
   * 画布级每日统计（进入画布/流出画布/进入结束）
   * 入参：taskId(any)、options(object) —— { days, from, to }
   * 返回：[{ date, canvasEnter, canvasExit, canvasEndEnter }]
   */
  getCanvasDailyStats(taskId, options = {}) {
    try {
      const { days, dateList, now, from, to } = resolveRange(options)
      const dataset = getFlowDataset(taskId, { days, from, to, now })
      return aggregateCanvasDaily(dataset, dateList)
    } catch { return [] }
  },

  /**
   * 客户明细列表（A4）
   * 入参：taskId(any)、options(object) —— { days, status, keyword, nodeId, branchKey, from, to, sortBy, page, pageSize }
   * 返回：{ list, total, personCount, recordCount, statusCounts, page, pageSize, totalPages }
   */
  getCustomerDetails(taskId, options = {}) {
    try {
      const { days, now, from, to } = resolveRange(options)
      const dataset = getFlowDataset(taskId, { days, from, to, now })
      return buildCustomerDetailList(dataset, { ...options, from, to })
    } catch {
      return { list: [], total: 0, personCount: 0, recordCount: 0, filteredPersonCount: 0, statusCounts: { all: 0, finished: 0, running: 0, waiting: 0 }, page: 1, pageSize: 20, totalPages: 1 }
    }
  },

  /**
   * 单客户多批次流水详情（A5）
   * 入参：taskId(any)、customerNo(any)、options(object) —— { days, from, to, maxBatches, maxRecords }
   * 返回：{ customer, batches, truncated, totalBatches, totalRecords, limitHint }
   */
  getCustomerFlow(taskId, customerNo, options = {}) {
    try {
      const { days, now, from, to } = resolveRange(options)
      const dataset = getFlowDataset(taskId, { days, from, to, now })
      return buildCustomerFlow(dataset, customerNo, { ...options, from, to })
    } catch { return { customer: null, batches: [], truncated: false, totalBatches: 0, totalRecords: 0, limitHint: '' } }
  },

  /**
   * 批次概览（A5 批次列表）
   * 入参：taskId(any)、options(object) —— { days, from, to }
   * 返回：Array
   */
  getBatchOverview(taskId, options = {}) {
    try {
      const { days, now, from, to } = resolveRange(options)
      const dataset = getFlowDataset(taskId, { days, from, to, now })
      return buildBatchOverview(dataset)
    } catch { return [] }
  },

  /**
   * 客户检索（B1 定向检索）
   * 入参：taskId(any)、keyword(any)、options(object) —— { days, from, to, limit }
   * 返回：Array
   */
  searchCustomers(taskId, keyword, options = {}) {
    try {
      const { days, now, from, to } = resolveRange(options)
      const dataset = getFlowDataset(taskId, { days, from, to, now })
      return searchCustomers(dataset, keyword, options)
    } catch { return [] }
  }
}
/*
用途：运行态统计 mock（节点级/分支级/画布级/客户级）
说明：从原 taskStorage.js 拆分；数据统一由 canvasFlowDataset 生成，保证节点/画布/分支/客户各视图口径一致。
边界：不调用后端；不持久化；天数上限 90 天；任务不存在时使用兜底画布。
*/
