<template>
  <div class="stats-dashboard">
    <!-- A1 全局 KPI 指标区 -->
    <section class="dash-section">
      <div class="dash-section__head">
        <span class="dash-section__title">核心指标</span>
        <span v-if="cutoffText" class="dash-section__cutoff">{{ cutoffText }}</span>
      </div>
      <div class="kpi-grid">
        <div v-for="card in kpiCards" :key="card.key" class="kpi-card">
          <div class="kpi-card__head">
            <span class="kpi-card__label">{{ card.label }}</span>
            <a-tooltip :content="card.desc">
              <span class="kpi-card__info" role="img" aria-label="口径说明"><IconInfoCircle /></span>
            </a-tooltip>
          </div>
          <div class="kpi-card__value">{{ card.value }}</div>
          <div class="kpi-card__trend" aria-hidden="true">
            <span
              v-for="(v, i) in card.trend"
              :key="i"
              class="trend-bar"
              :style="{ height: `${trendBarHeight(card.trend, v)}%` }"
            ></span>
          </div>
        </div>
      </div>
    </section>

    <!-- A2 整体流量趋势图 -->
    <section class="dash-section">
      <div class="dash-section__head">
        <span class="dash-section__title">整体流量趋势</span>
        <div class="chart-legend">
          <span class="legend-item"><span class="legend-line legend-line--enter"></span>每日进入总量</span>
          <span class="legend-item"><span class="legend-line legend-line--exit"></span>每日流出总量</span>
          <span v-if="hasRunningBucket" class="legend-running">当日进行中</span>
        </div>
      </div>

      <div class="chart-wrap">
        <svg
          class="trend-chart"
          viewBox="0 0 1000 280"
          preserveAspectRatio="none"
          role="img"
          aria-label="整体流量趋势图"
        >
          <!-- 网格与 Y 轴刻度 -->
          <g class="grid">
            <line v-for="t in yTicks" :key="`g${t.value}`" :x1="PAD_L" :x2="PAD_R" :y1="t.y" :y2="t.y" />
          </g>
          <g class="axis-label">
            <text v-for="t in yTicks" :key="`yt${t.value}`" :x="PAD_L - 8" :y="t.y + 4" text-anchor="end">{{ t.label }}</text>
            <text
              v-for="(d, i) in xTickLabels"
              :key="`xt${d}`"
              :x="d.x"
              :y="CHART_H - 8"
              text-anchor="middle"
            >{{ d.text }}</text>
          </g>
          <!-- 进入总量（浅色） -->
          <polyline class="series series--enter" :points="enterPolyline" />
          <!-- 流出总量（深色） -->
          <polyline class="series series--exit" :points="exitPolyline" />
          <!-- 当日进行中：末段虚线延伸 -->
          <line
            v-if="runningSegment"
            class="series series--enter series--running"
            :x1="runningSegment.x1"
            :y1="runningSegment.y1"
            :x2="runningSegment.x2"
            :y2="runningSegment.y2"
          />
          <!-- 数据点（仅视觉，不接收指针事件） -->
          <g>
            <circle
              v-for="(p, i) in enterPoints"
              :key="`pe${i}`"
              class="point point--enter"
              :cx="p.x"
              :cy="p.y"
              r="3"
            />
            <circle
              v-for="(p, i) in exitPoints"
              :key="`px${i}`"
              class="point point--exit"
              :cx="p.x"
              :cy="p.y"
              r="3"
            />
          </g>
          <!-- 选中日高亮 -->
          <line
            v-if="selectedPoint"
            class="selected-line"
            :x1="selectedPoint.x"
            :y1="PAD_T"
            :x2="selectedPoint.x"
            :y2="CHART_H - PAD_B"
          />
        </svg>

        <!-- 可点击热区层：每日一列，覆盖绘图区，用于 R12-2 单日明细下钻 -->
        <div class="chart-hits">
          <button
            v-for="c in dayColumns"
            :key="c.date"
            type="button"
            class="chart-hit"
            :class="{ 'is-active': selectedDate === c.date }"
            :style="{ left: `${(c.x / CHART_W) * 100}%`, width: `${(c.w / CHART_W) * 100}%` }"
            :aria-label="`查看 ${c.date} 单日明细`"
            @click="selectDate(c.date)"
          ></button>
        </div>
      </div>

      <!-- R12-2 单日明细 -->
      <div v-if="selectedRow" class="day-detail">
        <template v-if="selectedRow.canvasEnter || selectedRow.canvasExit">
          <div class="day-detail__metrics">
            <div class="day-metric"><span class="label">进入总量</span><span class="value">{{ selectedRow.canvasEnter }}</span></div>
            <div class="day-metric"><span class="label">流出总量</span><span class="value">{{ selectedRow.canvasExit }}</span></div>
            <div class="day-metric"><span class="label">结束人次</span><span class="value">{{ selectedRow.canvasEndEnter }}</span></div>
            <div class="day-metric"><span class="label">日均流转时长</span><span class="value">{{ formatDuration(selectedRow.avgDurationMs) }}</span></div>
          </div>
          <a-space size="mini">
            <a-button size="small" type="primary" @click="openDayCustomers">查看客户列表</a-button>
            <a-button size="small" @click="clearSelectedDate">取消选择</a-button>
          </a-space>
        </template>
        <a-alert v-else type="normal">该日无流量</a-alert>
      </div>
    </section>

    <!-- A4 客户明细列表 -->
    <CustomerDetailTable
      :canvas-id="canvasId"
      :range="range"
      :source-dimension="canvasDimension"
      @detail="onRowDetail"
    />
  </div>
</template>

<script setup>
/*
用途：数据统计 TAB 的大盘视图（A1 KPI + A2 整体流量趋势 + A4 客户明细入口）
说明：只呈现全画布汇总口径，不含任何节点维度；所有取数统一走 runtimeStatsMock，保证与节点抽屉数值一致。
边界：不修改画布；点击单日仅做全画布维度的客户明细下钻；A4/A5 内部不再提供改时间入口。
*/
import { ref, computed, watch } from 'vue'
import { RuntimeStatsMock } from '@/utils/runtimeStatsMock.js'
import { toTimeStr, toDateStr } from '@/utils/canvasFlowDataset.js'
import CustomerDetailTable from './CustomerDetailTable.vue'

const props = defineProps({
  /** 画布 ID（任务 ID） */
  canvasId: { type: String, default: '' },
  /** 统计区间 { from, to, days } */
  range: { type: Object, default: () => ({ from: '', to: '', days: 7 }) },
  /** 画布是否已结束（已结束不展示截止时间与进行中标记） */
  finished: { type: Boolean, default: false },
  /** 数据截止时刻（毫秒），运行中画布标注用 */
  cutoffAt: { type: Number, default: 0 }
})
const emit = defineEmits(['open-customers'])

const PAD_L = 48
const PAD_R = 984
const PAD_T = 16
const PAD_B = 28
const CHART_W = 1000
const CHART_H = 280

const selectedDate = ref('')

/** 画布级每日统计 */
const dailyRows = computed(() => {
  try {
    return RuntimeStatsMock.getCanvasDailyStats(String(props.canvasId), {
      from: props.range?.from || '',
      to: props.range?.to || '',
      days: props.range?.days || 7
    }) || []
  } catch { return [] }
})

/** 当日是否仍在进行中（最后一个时间桶为今天且画布未结束） */
const hasRunningBucket = computed(() => {
  if (props.finished) return false
  const rows = dailyRows.value
  if (!rows.length) return false
  return rows[rows.length - 1].date === toDateStr(new Date())
})

/** 运行中画布的「数据截至」标注（R78） */
const cutoffText = computed(() => {
  if (props.finished) return ''
  const t = props.cutoffAt || Date.now()
  return `数据截至 ${toTimeStr(new Date(t))}`
})

/**
 * 构造 KPI 卡数据
 * 返回：[{ key, label, value, desc, trend }]
 */
const kpiCards = computed(() => {
  const rows = dailyRows.value
  const enterTrend = rows.map(r => r.canvasEnter || 0)
  const endTrend = rows.map(r => r.canvasEndEnter || 0)
  const runTrend = rows.map(r => ((r.canvasEnter || 0) > 0 || (r.canvasExit || 0) > 0) ? 1 : 0)
  return [
    {
      key: 'runDays',
      label: '运行天数',
      value: rows.length,
      desc: '按自然日计数，区间内无流量的日期记 0。',
      trend: runTrend
    },
    {
      key: 'enter',
      label: '累计进入人次',
      value: enterTrend.reduce((a, b) => a + b, 0),
      desc: '流入起始节点的总人次；同一用户在同批次内多次进入计 1 人次，跨批次分别计数。',
      trend: enterTrend
    },
    {
      key: 'end',
      label: '策略结束人次',
      value: endTrend.reduce((a, b) => a + b, 0),
      desc: '抵达结束节点、走完全流程的人次。',
      trend: endTrend
    }
  ]
})

/**
 * 趋势条高度：按区间内最大值比例渲染
 * 入参：trend(Array<number>)、v(number)
 * 返回：百分比字符串
 */
function trendBarHeight(trend, v) {
  const max = Math.max(...(trend || []).map(x => Number(x) || 0), 1)
  return Math.max(3, Math.round(((Number(v) || 0) / max) * 100))
}

/** 图表 Y 轴最大值 */
const yMax = computed(() => {
  const max = Math.max(...dailyRows.value.map(r => Math.max(r.canvasEnter || 0, r.canvasExit || 0)), 0)
  if (max <= 0) return 10
  const mag = Math.pow(10, Math.floor(Math.log10(max)))
  return Math.ceil(max / (mag / 2)) * (mag / 2)
})

/** Y 轴刻度 */
const yTicks = computed(() => {
  const max = yMax.value
  const count = 4
  const list = []
  for (let i = 0; i <= count; i++) {
    const value = Math.round((max / count) * i)
    list.push({ value, label: String(value), y: PAD_T + (CHART_H - PAD_T - PAD_B) * (1 - i / count) })
  }
  return list
})

/**
 * 计算某序列的坐标点
 * 入参：key(string)
 * 返回：Array<{ x, y, date, value }>
 */
function buildPoints(key) {
  const rows = dailyRows.value
  const n = rows.length
  const plotW = PAD_R - PAD_L
  const plotH = CHART_H - PAD_T - PAD_B
  return rows.map((r, i) => {
    const x = n <= 1 ? PAD_L : PAD_L + (plotW * i) / (n - 1)
    const v = Number(r[key]) || 0
    const y = PAD_T + plotH * (1 - v / yMax.value)
    return { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100, date: r.date, value: v }
  })
}

const enterPoints = computed(() => buildPoints('canvasEnter'))
const exitPoints = computed(() => buildPoints('canvasExit'))

/** 每日列热区：整列可点击，用于 R12-2 单日明细下钻 */
const dayColumns = computed(() => {
  const pts = enterPoints.value
  const n = pts.length
  if (!n) return []
  const plotW = PAD_R - PAD_L
  const colW = n > 1 ? plotW / (n - 1) : plotW
  return pts.map((p, i) => ({
    date: p.date,
    x: n > 1 ? p.x - colW / 2 : PAD_L,
    w: n > 1 ? colW : plotW
  }))
})

/**
 * 生成折线 polyline 的 points 属性
 * 入参：points(Array)
 * 返回：字符串
 */
function toPolyline(points) {
  return points.map(p => `${p.x},${p.y}`).join(' ')
}
const enterPolyline = computed(() => toPolyline(enterPoints.value))
const exitPolyline = computed(() => toPolyline(exitPoints.value))

/** 末段虚线（当日进行中） */
const runningSegment = computed(() => {
  if (!hasRunningBucket.value) return null
  const pts = enterPoints.value
  if (pts.length < 2) return null
  const a = pts[pts.length - 2]
  const b = pts[pts.length - 1]
  return { x1: a.x, y1: a.y, x2: b.x, y2: b.y }
})

/** X 轴标签 */
const xTickLabels = computed(() => {
  const pts = enterPoints.value
  if (!pts.length) return []
  const idxs = pts.length <= 3 ? pts.map((_, i) => i) : [0, Math.floor((pts.length - 1) / 2), pts.length - 1]
  return idxs.map(i => ({ x: pts[i].x, text: String(pts[i].date).slice(5) }))
})

/** 当前选中的日期行 */
const selectedRow = computed(() => dailyRows.value.find(r => r.date === selectedDate.value) || null)

/** 选中日在图上的竖线位置 */
const selectedPoint = computed(() => enterPoints.value.find(p => p.date === selectedDate.value) || null)

/**
 * 选中某日
 * 入参：date(string)
 * 返回：void
 */
function selectDate(date) {
  selectedDate.value = date === selectedDate.value ? '' : date
}

/**
 * 清除选中日
 * 返回：void
 */
function clearSelectedDate() {
  selectedDate.value = ''
}

/**
 * 格式化时长为中文可读串
 * 入参：ms(number)
 * 返回：如 '2 小时 15 分钟'
 */
function formatDuration(ms) {
  const v = Number(ms) || 0
  if (v <= 0) return '—'
  const min = Math.round(v / 60000)
  if (min < 60) return `${min} 分钟`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} 小时 ${m} 分钟` : `${h} 小时`
}

/** 全画布维度的来源描述（A4 面包屑） */
const canvasDimension = computed(() => ({ type: 'canvas', label: '全画布' }))

/**
 * 从单日明细下钻到 A4 客户明细（带入该日）
 * 返回：void
 */
function openDayCustomers() {
  if (!selectedDate.value) return
  emit('open-customers', { date: selectedDate.value })
}

/**
 * A4 行点击「详情」→ 交给父级打开 A5
 * 入参：row(object)
 * 返回：void
 */
function onRowDetail(row) {
  emit('open-customers', { row })
}

watch(() => [props.range?.from, props.range?.to], () => {
  selectedDate.value = ''
})
</script>

<style scoped>
.stats-dashboard { display: flex; flex-direction: column; gap: 16px; padding: 16px 20px 32px; background: #f7f8fa; min-height: 100%; }
.dash-section { background: #fff; border: 1px solid #e5e6eb; border-radius: 8px; padding: 16px }
.dash-section__head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px }
.dash-section__title { font-size: 14px; font-weight: 600; color: #1d2129 }
.dash-section__cutoff { font-size: 12px; color: #86909c }
.kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px }
.kpi-card { background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 14px }
.kpi-card__head { display: flex; align-items: center; justify-content: space-between }
.kpi-card__label { font-size: 12px; color: #6b7280 }
.kpi-card__info { color: #86909c; cursor: help; display: inline-flex }
.kpi-card__value { font-size: 26px; font-weight: 700; color: #1d2129; margin: 6px 0 10px; line-height: 1.1 }
.kpi-card__trend { display: flex; align-items: flex-end; gap: 2px; height: 28px }
.trend-bar { flex: 1; min-width: 2px; background: rgb(var(--primary-6)); border-radius: 2px 2px 0 0; opacity: .75 }
.chart-legend { display: flex; align-items: center; gap: 14px; font-size: 12px; color: #4e5969 }
.legend-item { display: inline-flex; align-items: center; gap: 6px }
.legend-line { width: 16px; height: 3px; border-radius: 2px; display: inline-block }
.legend-line--enter { background: #94bffb }
.legend-line--exit { background: #165dff }
.legend-running { color: rgb(var(--warning-6)) }
.chart-wrap { position: relative; width: 100%; overflow: hidden }
.trend-chart { width: 100%; height: 280px; display: block }
.chart-hits { position: absolute; left: 0; right: 0; top: 0; bottom: 28px; pointer-events: none }
.chart-hit { position: absolute; top: 0; bottom: 0; padding: 0; margin: 0; border: none; background: transparent; cursor: pointer; pointer-events: auto }
.chart-hit:hover { background: rgba(22, 93, 255, .06) }
.chart-hit.is-active { background: rgba(22, 93, 255, .1); outline: 1px solid rgba(22, 93, 255, .25) }
.grid line { stroke: #f2f3f5; stroke-width: 1 }
.axis-label text { font-size: 11px; fill: #86909c }
.series { fill: none; stroke-width: 2; vector-effect: non-scaling-stroke }
.series--enter { stroke: #94bffb }
.series--exit { stroke: #165dff }
.series--running { stroke-dasharray: 4 4 }
.point { cursor: pointer; vector-effect: non-scaling-stroke; pointer-events: none }
.point-hit { fill: transparent; cursor: pointer }
.point--enter { fill: #94bffb; stroke: #fff; stroke-width: 1 }
.point--exit { fill: #165dff; stroke: #fff; stroke-width: 1 }
.selected-line { stroke: #c9cdd4; stroke-width: 1; stroke-dasharray: 3 3; vector-effect: non-scaling-stroke }
.day-detail { margin-top: 12px; display: flex; align-items: center; justify-content: space-between; gap: 16px; background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px 12px }
.day-detail__metrics { display: flex; gap: 24px; flex-wrap: wrap }
.day-metric { display: flex; flex-direction: column; gap: 2px }
.day-metric .label { font-size: 12px; color: #86909c }
.day-metric .value { font-size: 16px; font-weight: 600; color: #1d2129 }
</style>
