<template>
  <div class="statistics" role="region" aria-label="统计面板">
    <div class="header">
      <span class="title">统计</span>
      <a-space>
        <a-input
          v-model="searchUserId"
          placeholder="搜索用户ID"
          allow-clear
          size="small"
          style="width: 200px"
          @press-enter="onSearchUser"
          aria-label="搜索用户ID"
        />
        <a-range-picker
          v-model="enterDateRange"
          size="small"
          style="width: 220px"
          :placeholder="['开始日期','结束日期']"
          value-format="YYYY-MM-DD"
          aria-label="时间范围"
        />
        <a-button size="mini" @click="onSearchUser">搜索</a-button>
        <a-button size="mini" @click="$emit('close')">关闭</a-button>
      </a-space>
    </div>

    <div class="layer layer-core">
      <div class="kpi-grid">
        <div class="kpi-item" aria-label="运行天数">
          <div class="kpi-label">运行天数</div>
          <div class="kpi-value">{{ canvasRunDays }}</div>
        </div>
        <div class="kpi-item" aria-label="累计进入人次">
          <div class="kpi-label">累计进入人次</div>
          <div class="kpi-value">{{ canvasEnterTotal }}</div>
        </div>
        <div class="kpi-item" aria-label="策略结束">
          <div class="kpi-label">策略结束</div>
          <div class="kpi-value">{{ canvasEndEnterTotal }}</div>
        </div>
      </div>
    </div>

    

    <div class="layer layer-detail" v-if="focusNode">
      <div class="section-header">节点详情</div>
      <div class="metrics-bar">
        <div class="metric"><span class="label">节点ID</span><span class="value">{{ focusNode.id }}</span></div>
        <div class="metric"><span class="label">类型</span><span class="value">{{ focusNode.type }}</span></div>
        <div class="metric"><span class="label">入度</span><span class="value">{{ focusNode.inDegree }}</span></div>
        <div class="metric"><span class="label">出度</span><span class="value">{{ focusNode.outDegree }}</span></div>
        <div class="metric"><span class="label">进入节点人次</span><span class="value">{{ totalEnter }}</span></div>
        <div class="metric"><span class="label">出节点人次</span><span class="value">{{ totalExit }}</span></div>
      </div>

      <a-tabs v-model:active-key="activeTab">
        <a-tab-pane key="overview" title="趋势">
          <div class="chart-legend">
            <span class="legend-item"><span class="legend-dot" :style="{ backgroundColor: barEnterColor }"></span>进入</span>
            <span class="legend-item"><span class="legend-dot" :style="{ backgroundColor: barExitColor }"></span>出</span>
          </div>
          <div class="sparkline" aria-label="趋势">
            <div v-for="(r,i) in filteredDailyStats" :key="i" class="bar-group">
              <div class="bar bar-enter" :style="{ height: enterBarHeight(r), backgroundColor: barEnterColor }" />
              <div class="bar bar-exit" :style="{ height: exitBarHeight(r), backgroundColor: barExitColor }" />
            </div>
          </div>
          <div class="sparkline-axis">
            <div class="y-axis">
              <span class="y-label">人数</span>
              <div class="y-ticks">
                <span v-for="t in yTicks" :key="t">{{ t }}</span>
              </div>
            </div>
            <div class="x-axis">
              <div class="x-ticks">
                <span v-for="d in xTickLabels" :key="d">{{ d }}</span>
              </div>
            </div>
          </div>
        </a-tab-pane>
        <a-tab-pane key="detail" title="明细">
          <a-table :columns="detailColumns" :data="nodeDailyRows" :pagination="false" size="small" :bordered="false" />
        </a-tab-pane>
        <a-tab-pane key="branches" title="分支">
          <a-table :columns="branchTableColumns" :data="branchTable" :pagination="false" size="small" :bordered="false" />
        </a-tab-pane>
      </a-tabs>
    </div>
  </div>
</template>

<script setup>
/*
用途：统计面板（KPI/趋势/明细/分支）
说明：从 Graph 实例读取节点与边数据，支持节点选择与路径高亮事件；查询用户路径时优先后端/Mock 数据。
边界：不修改图结构；高亮路径通过事件交由页面处理；防止空图/空焦点异常。
*/
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { RuntimeStatsMock } from '@/utils/taskStorage.js'
const props = defineProps({ canvasId: { type: [String, Number], default: 'default-canvas' }, graph: { type: Object, default: null }, focusNodeId: { type: String, default: '' } })
const emit = defineEmits(['close','node-select','path-highlight'])

const searchUserId = ref('')
const nodes = ref([])
const edges = ref([])
const selectedNodeId = ref('')
const enterDateRange = ref([])
const activeTab = ref('overview')

const nodeStats = computed(() => {
  const stats = []
  const inMap = new Map()
  const outMap = new Map()
  edges.value.forEach(e => {
    try {
      const s = e.getSourceCellId?.() || e.source?.cell
      const t = e.getTargetCellId?.() || e.target?.cell
      if (s) outMap.set(s, (outMap.get(s) || 0) + 1)
      if (t) inMap.set(t, (inMap.get(t) || 0) + 1)
    } catch {}
  })
  nodes.value.forEach(n => {
    try {
      const d = n.getData?.() || {}
      stats.push({ id: n.id, label: d.nodeName || d.headerTitle || d.type || n.id, type: d.type || d.nodeType || 'node', inDegree: inMap.get(n.id) || 0, outDegree: outMap.get(n.id) || 0 })
    } catch {
      stats.push({ id: n.id, label: n.id, type: 'node', inDegree: inMap.get(n.id) || 0, outDegree: outMap.get(n.id) || 0 })
    }
  })
  return stats
})

function refreshFromGraph() {
  if (!props.graph) return
  try {
    nodes.value = props.graph.getNodes?.() || []
    edges.value = props.graph.getEdges?.() || []
  } catch {}
}

function emitNodeSelect(id) { emit('node-select', [id]) }

function buildPathFromNode(startId) {
  // 简单 BFS 构建从选中节点到所有叶子的一条路径（用于高亮）
  const adj = new Map()
  edges.value.forEach(e => {
    try {
      const s = e.getSourceCellId?.() || e.source?.cell
      const t = e.getTargetCellId?.() || e.target?.cell
      if (!adj.has(s)) adj.set(s, [])
      adj.get(s).push(t)
    } catch {}
  })
  const visited = new Set()
  const queue = [[startId]]
  while (queue.length) {
    const path = queue.shift()
    const last = path[path.length - 1]
    const next = adj.get(last) || []
    if (next.length === 0) {
      return path.map(id => ({ nodeId: id }))
    }
    for (const nb of next) {
      if (!visited.has(nb)) { visited.add(nb); queue.push([...path, nb]) }
    }
  }
  return [{ nodeId: startId }]
}

// DocRef: 架构文档「关键代码片段/统计面板：从节点构建路径高亮」
function highlightFromNode(id) {
  const path = buildPathFromNode(id)
  emit('path-highlight', { canvasId: props.canvasId, path })
}

function onSearchUser() {
  const path = RuntimeStatsMock.getUserPath(String(props.canvasId), String(searchUserId.value || ''))
  if (Array.isArray(path) && path.length) {
    emit('path-highlight', { canvasId: props.canvasId, path: path.map(id => ({ nodeId: id })) })
    return
  }
  const start = nodes.value.find(n => {
    try { const d = n.getData?.() || {}; return d.type === 'start' || d.nodeType === 'start' } catch { return false }
  })
  const startId = start ? start.id : (nodes.value[0]?.id)
  if (startId) highlightFromNode(startId)
}

onMounted(refreshFromGraph)
watch(() => props.graph, refreshFromGraph)
function handleStatsFocus(e) { try { const id = String(e?.detail?.id || ''); selectedNodeId.value = id } catch {} }
onMounted(() => { try { window.addEventListener('stats:focus', handleStatsFocus) } catch {} })
onUnmounted(() => { try { window.removeEventListener('stats:focus', handleStatsFocus) } catch {} })

const unbinders = []
function bindGraphEvents() {
  if (!props.graph) return
  const g = props.graph
  const h = () => refreshFromGraph()
  ;['node:added','node:removed','edge:added','edge:removed','cell:changed','graph:changed'].forEach(ev => {
    try { g.on && g.on(ev, h); unbinders.push(() => { try { g.off && g.off(ev, h) } catch {} }) } catch {}
  })
  const sel = ({ selected }) => { try { const ids = (selected || []).map(c => c.id); selectedNodeId.value = String(ids[0] || '') } catch {} }
  try { g.on && g.on('selection:changed', sel); unbinders.push(() => { try { g.off && g.off('selection:changed', sel) } catch {} }) } catch {}
  const click = ({ node }) => { try { selectedNodeId.value = String(node?.id || '') } catch {} }
  try { g.on && g.on('node:click', click); unbinders.push(() => { try { g.off && g.off('node:click', click) } catch {} }) } catch {}
}
onMounted(() => { refreshFromGraph(); bindGraphEvents() })
watch(() => props.graph, () => { try { unbinders.forEach(f => f()); unbinders.length = 0 } catch {}; refreshFromGraph(); bindGraphEvents() })
onUnmounted(() => { try { unbinders.forEach(f => f()) } catch {} })

const tableData = computed(() => {
  const fid = String(props.focusNodeId || selectedNodeId.value || '')
  if (fid) return nodeStats.value.filter(n => String(n.id) === fid)
  return nodeStats.value
})

// 画布级指标（运行天数、进入画布人数、进入结束人数）
function getStartNodes() { return nodes.value.filter(n => { try { const d = n.getData?.() || {}; return d.type === 'start' || d.nodeType === 'start' } catch { return false } }) }
function getEndNodes() { return nodes.value.filter(n => { try { const d = n.getData?.() || {}; return d.type === 'end' || d.nodeType === 'end' } catch { return false } }) }
const canvasRunDays = computed(() => {
  const ds = RuntimeStatsMock.getCanvasDailyStats(String(props.canvasId)) || []
  const [fromStr, toStr] = enterDateRange.value || []
  const filtered = ds.filter(r => {
    const d = new Date(r.date)
    const from = fromStr ? new Date(fromStr) : null
    const to = toStr ? new Date(toStr) : null
    if (from && d < from) return false
    if (to && d > to) return false
    return true
  })
  return filtered.length
})
const canvasEnterTotal = computed(() => {
  const ds = RuntimeStatsMock.getCanvasDailyStats(String(props.canvasId)) || []
  const [fromStr, toStr] = enterDateRange.value || []
  return ds.reduce((sum, r) => {
    const d = new Date(r.date)
    const from = fromStr ? new Date(fromStr) : null
    const to = toStr ? new Date(toStr) : null
    if (from && d < from) return sum
    if (to && d > to) return sum
    return sum + (r.canvasEnter || 0)
  }, 0)
})
const canvasEndEnterTotal = computed(() => {
  const ds = RuntimeStatsMock.getCanvasDailyStats(String(props.canvasId)) || []
  const [fromStr, toStr] = enterDateRange.value || []
  return ds.reduce((sum, r) => {
    const d = new Date(r.date)
    const from = fromStr ? new Date(fromStr) : null
    const to = toStr ? new Date(toStr) : null
    if (from && d < from) return sum
    if (to && d > to) return sum
    return sum + (r.canvasEndEnter || 0)
  }, 0)
})

const focusNode = computed(() => {
  const fid = String(props.focusNodeId || selectedNodeId.value || '')
  return nodeStats.value.find(n => String(n.id) === fid) || null
})

// 分流/AB 节点自动定位到「分支」页签
const isSplitNode = computed(() => {
  const fid = String(props.focusNodeId || selectedNodeId.value || '')
  const node = nodes.value.find(n => String(n.id) === fid)
  if (!node) return false
  try {
    const d = node.getData?.() || {}
    const t = d.type || d.nodeType
    return t === 'crowd-split' || t === 'audience-split' || t === 'event-split' || t === 'ab-test'
  } catch { return false }
})
watch(isSplitNode, v => { activeTab.value = v ? 'branches' : 'detail' })

function seededRand(seed) {
  let x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

function buildDailyStats(node) {
  const days = 7
  const list = []
  const baseIn = node?.inDegree || 0
  const baseOut = node?.outDegree || 0
  for (let i = 0; i < days; i++) {
    const date = new Date(Date.now() - i * 24 * 3600 * 1000)
    const ds = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
    const s = seededRand(i + (node?.id?.length || 1))
    const factor = 20 + Math.floor(s * 30)
    const enter = Math.max(0, baseIn * factor)
    const exit = Math.max(0, baseOut * factor)
    list.push({ date: ds, enter, exit })
  }
  return list.reverse()
}

const dailyStats = computed(() => {
  if (focusNode.value) {
    const mock = RuntimeStatsMock.getNodeDailyStats(String(props.canvasId), focusNode.value.id)
    if (Array.isArray(mock) && mock.length) return mock
    return buildDailyStats(focusNode.value)
  }
  return []
})

const filteredDailyStats = computed(() => {
  const [fromStr, toStr] = enterDateRange.value || []
  const from = fromStr ? new Date(fromStr) : null
  const to = toStr ? new Date(toStr) : null
  return dailyStats.value.filter(r => {
    const d = new Date(r.date)
    if (from && d < from) return false
    if (to && d > to) return false
    return true
  })
})

const barEnterColor = '#3b82f6'
const barExitColor = '#f59e0b'
const yMax = computed(() => Math.max(...filteredDailyStats.value.map(x => Math.max(x.enter || 0, x.exit || 0)), 1))
function enterBarHeight(r) { return `${Math.round(((r.enter || 0) / yMax.value) * 100)}%` }
function exitBarHeight(r) { return `${Math.round(((r.exit || 0) / yMax.value) * 100)}%` }
const yTicks = computed(() => {
  const max = Math.round(yMax.value)
  if (max <= 1) return [0, 1]
  return [0, max]
})
const xTickLabels = computed(() => {
  const list = filteredDailyStats.value
  if (!list.length) return []
  const mid = Math.floor(list.length / 2)
  return [list[0].date, list[mid].date, list[list.length - 1].date]
})

const totalEnter = computed(() => filteredDailyStats.value.reduce((s, r) => s + (r.enter || 0), 0))
const totalExit = computed(() => filteredDailyStats.value.reduce((s, r) => s + (r.exit || 0), 0))

function getBranchesForNode(node) {
  try {
    const d = node?.data || node?.getData?.() || {}
    const t = d.type || d.nodeType
    if (t === 'ab-test' && Array.isArray(d.config?.branches)) {
      return d.config.branches.map((b, i) => ({ id: b.id || `branch_${i+1}`, label: b.label || b.name || `分支${i+1}`, percentage: typeof b.percentage === 'number' ? b.percentage : null }))
    }
    // 分流节点：优先使用人群分层 + 未匹配分支名称（与节点展示保持一致）
    if (t === 'crowd-split' || t === 'audience-split' || t === 'event-split') {
      const layers = Array.isArray(d.config?.crowdLayers) ? d.config.crowdLayers : []
      const unmatch = d.config?.unmatchBranch
      const named = [
        ...layers.map((l, i) => ({ id: l.id || `layer_${i + 1}`, label: l.crowdName || l.name || `分群${i + 1}`, percentage: typeof l.percentage === 'number' ? l.percentage : null })),
        ...(unmatch ? [{ id: unmatch.id || 'unmatch', label: unmatch.crowdName || unmatch.name || '其他', percentage: typeof unmatch.percentage === 'number' ? unmatch.percentage : null }] : [])
      ]
      if (named.length) return named
    }
    const outs = edges.value.filter(e => {
      try { const s = e.getSourceCellId?.() || e.source?.cell; return String(s) === String(node?.id) } catch { return false }
    })
    const groups = new Map()
    outs.forEach(e => { try { const sp = e.getSource?.()?.port || e.source?.port || 'out'; groups.set(sp, (groups.get(sp) || 0) + 1) } catch {} })
    const arr = Array.from(groups.keys())
    if (arr.length) return arr.map((p, i) => ({ id: String(p), label: `分支${i+1}` }))
    const n = (d.displayLines && Array.isArray(d.displayLines)) ? d.displayLines.length : (nodeStats.value.find(n => String(n.id) === String(node?.id))?.outDegree || 1)
    return Array.from({ length: Math.max(1, n) }).map((_, i) => ({ id: `out-${i}`, label: `分支${i+1}` }))
  } catch { return [] }
}

const branchTable = computed(() => {
  const fid = String(props.focusNodeId || selectedNodeId.value || '')
  if (!fid) return []
  const node = nodes.value.find(n => String(n.id) === fid)
  if (!node) return []
  const branches = getBranchesForNode(node)
  if (!branches.length) return []
  // 使用mock的分支每日统计，取最后一天作为“当前出人数”
  const brDaily = RuntimeStatsMock.getNodeDailyBranchStats(String(props.canvasId), String(node.id), branches) || []
  const last = brDaily.length ? brDaily[brDaily.length - 1] : null
  if (!last || !last.branchExits) return []
  return branches.map(b => ({ label: b.label, exit: Number(last.branchExits[String(b.id)]) || 0 }))
})

// 将分支出人数按日期并入到节点日表
const branchColumns = computed(() => {
  const fid = String(props.focusNodeId || selectedNodeId.value || '')
  if (!fid) return []
  const node = nodes.value.find(n => String(n.id) === fid)
  if (!node) return []
  const branches = getBranchesForNode(node)
  return branches.map(b => ({ key: `branch_${String(b.id).replace(/[^\w]/g,'_')}`, title: b.label }))
})

// 明细表列定义（基础列 + 各分支列）
const detailColumns = computed(() => [
  { title: '日期', dataIndex: 'date' },
  { title: '进入', dataIndex: 'enter' },
  { title: '出', dataIndex: 'exit' },
  ...branchColumns.value.map(bc => ({ title: bc.title, dataIndex: bc.key }))
])

// 分支表列定义
const branchTableColumns = [
  { title: '分支', dataIndex: 'label' },
  { title: '出人数', dataIndex: 'exit' }
]
const nodeDailyRows = computed(() => {
  const fid = String(props.focusNodeId || selectedNodeId.value || '')
  if (!fid) return filteredDailyStats.value
  const node = nodes.value.find(n => String(n.id) === fid)
  if (!node) return filteredDailyStats.value
  const branches = getBranchesForNode(node)
  if (!branches.length) return filteredDailyStats.value
  const brDaily = RuntimeStatsMock.getNodeDailyBranchStats(String(props.canvasId), String(node.id), branches) || []
  const mapByDate = new Map(brDaily.map(r => [r.date, r]))
  return filteredDailyStats.value.map(r => {
    const row = { ...r }
    const bd = mapByDate.get(r.date)
    branches.forEach(b => {
      const key = `branch_${String(b.id).replace(/[^\w]/g,'_')}`
      row[key] = bd && bd.branchExits ? Number(bd.branchExits[String(b.id)]) || 0 : 0
    })
    return row
  })
})
</script>

<style scoped>
.statistics { height: 100%; background: #fff; border-left: 1px solid #e5e6eb; display: flex; flex-direction: column }
.header { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; border-bottom: 1px solid #e5e6eb }
.title { font-size: 14px; font-weight: 600; color: #111827 }
.layer { padding: 10px 12px }
.layer-core { padding-top: 12px }
.kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px }
.kpi-item { background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px; transition: transform .2s ease }
.kpi-item:hover { transform: translateY(-1px) }
.kpi-label { font-size: 12px; color: #6b7280 }
.kpi-value { font-size: 18px; font-weight: 700; color: #111827 }
.section-header { font-size: 13px; font-weight: 600; color: #111827; margin-bottom: 8px }
.table-wrap { overflow: auto; max-height: 40vh }
.metrics-bar { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; align-items: center; margin: 8px 0 12px }
.metric { display: flex; gap: 6px; align-items: center; font-size: 12px; color: #334155; background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 6px; padding: 6px 8px }
.metric .label { color: #6b7280 }
.metric .value { font-weight: 600; color: #111827 }
.chart-legend { display: flex; gap: 12px; align-items: center; margin-bottom: 6px }
.legend-item { display: inline-flex; gap: 6px; align-items: center; font-size: 12px; color: #374151 }
.legend-dot { width: 10px; height: 10px; border-radius: 2px; display: inline-block }
.sparkline { display: flex; align-items: flex-end; gap: 6px; height: 60px; margin-bottom: 6px }
.bar-group { display: flex; gap: 2px; width: 100%; }
.bar { width: 50%; border-radius: 3px; transition: height .2s ease }
.sparkline-axis { display: grid; grid-template-columns: 60px 1fr; align-items: center; gap: 8px; margin-bottom: 8px }
.y-axis { display: flex; flex-direction: column; gap: 4px; align-items: flex-start }
.y-label { font-size: 12px; color: #6b7280 }
.y-ticks { display: flex; flex-direction: column; gap: 4px; font-size: 11px; color: #6b7280 }
.x-axis { overflow: hidden }
.x-ticks { display: flex; justify-content: space-between; font-size: 11px; color: #6b7280 }
.branch-section { margin-top: 10px }
</style>
