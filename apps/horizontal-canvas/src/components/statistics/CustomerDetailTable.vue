<template>
  <section class="customer-detail">
    <!-- 面包屑：来源维度 -->
    <div class="customer-detail__head">
      <div class="breadcrumb">
        <span class="breadcrumb__root">客户明细</span>
        <span class="breadcrumb__sep">/</span>
        <span class="breadcrumb__cur">{{ sourceLabel }}</span>
        <span v-if="rangeText" class="breadcrumb__range">{{ rangeText }}</span>
      </div>
      <div class="customer-detail__count">进入人数 <b>{{ summary.personCount }}</b></div>
    </div>

    <!-- 汇总条：五指标 -->
    <div class="summary-bar">
      <div class="summary-item"><span class="label">进入（人数）</span><span class="value">{{ summary.personCount }}</span></div>
      <div class="summary-item"><span class="label">流水总条数</span><span class="value">{{ summary.recordCount }}</span></div>
      <div class="summary-item"><span class="label">已结束</span><span class="value">{{ summary.statusCounts.finished }}</span></div>
      <div class="summary-item"><span class="label">进行中</span><span class="value">{{ summary.statusCounts.running }}</span></div>
      <div class="summary-item"><span class="label">等待中</span><span class="value">{{ summary.statusCounts.waiting }}</span></div>
    </div>

    <!-- 筛选行：状态胶囊 + 客户号检索 -->
    <div class="filter-row">
      <div class="status-pills">
        <button
          v-for="pill in statusPills"
          :key="pill.key"
          type="button"
          class="pill"
          :class="[`pill--${pill.key}`, { 'is-active': status === pill.key }]"
          @click="setStatus(pill.key)"
        >
          {{ pill.label }}<span class="pill__count">{{ pill.count }}</span>
        </button>
      </div>
      <div class="filter-row__right">
        <a-select v-model="sortBy" size="small" style="width: 132px" @change="resetPage">
          <a-option value="enterTime">按进入时间</a-option>
          <a-option value="batch">按批次倒序</a-option>
        </a-select>
        <a-input
          v-model="keyword"
          size="small"
          style="width: 200px"
          placeholder="按客户号检索"
          allow-clear
          @press-enter="applyKeyword"
          @clear="applyKeyword"
        />
        <a-button size="small" @click="applyKeyword">检索</a-button>
      </div>
    </div>

    <!-- 六列固定表格 -->
    <a-table
      :columns="columns"
      :data="summary.list"
      :pagination="false"
      :bordered="false"
      size="small"
      row-key="batchNo"
      :scroll="{ y: 360 }"
    >
      <template #enterTime="{ record }">
        {{ formatTime(showNodeEnterTime ? record.nodeEnterTime : record.enterTime) }}
      </template>
      <template #status="{ record }">
        <a-tag :color="statusColor(record.status)" size="small">{{ statusLabel(record.status) }}</a-tag>
      </template>
      <template #action="{ record }">
        <a-button type="link" size="mini" @click="emit('detail', record)">详情</a-button>
      </template>
      <template #empty>
        <a-empty v-if="keyword && !summary.total" description="未查询到该客户号" :image-style="{ height: '60px' }" />
        <a-empty v-else description="该节点当期无客户进入记录" :image-style="{ height: '60px' }" />
      </template>
    </a-table>

    <div class="table-foot">
      同一客户多次进入按流水逐条展示，共 {{ summary.total }} 条流水 / {{ summary.filteredPersonCount }} 位客户
    </div>

    <div class="pager">
      <a-pagination
        :total="summary.total"
        :current="page"
        :page-size="pageSize"
        :page-size-options="[20, 50, 100]"
        show-total
        @change="onPageChange"
      />
    </div>
  </section>
</template>

<script setup>
/*
用途：客户明细列表（A4）
说明：一行对应一次进入；提供来源维度面包屑、汇总条五指标、三态筛选胶囊（带条数）、客户号检索、六列固定表格与分页。
边界：列表本身不提供改时间入口（继承上游带入的区间）；不修改画布；点击「详情」抛给父级打开 A5。
*/
import { ref, computed, watch } from 'vue'
import { RuntimeStatsMock } from '@/utils/runtimeStatsMock.js'

const props = defineProps({
  /** 画布 ID（任务 ID） */
  canvasId: { type: String, default: '' },
  /** 上游带入的统计区间 { from, to, days } */
  range: { type: Object, default: () => ({ from: '', to: '', days: 7 }) },
  /** 来源维度 { type: 'canvas'|'node'|'branch'|'node-time', label, nodeId, branchKey, from, to, enterFrom, enterTo } */
  sourceDimension: { type: Object, default: () => ({ type: 'canvas', label: '全画布' }) }
})
const emit = defineEmits(['detail'])

const status = ref('all')
const keyword = ref('')
const appliedKeyword = ref('')
const sortBy = ref('enterTime')
const page = ref(1)
const pageSize = 20

/** 生效的查询区间（来源维度可覆盖，如 A2 单日下钻） */
const effectiveRange = computed(() => ({
  from: props.sourceDimension?.from || props.range?.from || '',
  to: props.sourceDimension?.to || props.range?.to || '',
  days: props.range?.days || 7
}))

/** 来源维度文案 */
const sourceLabel = computed(() => props.sourceDimension?.label || '全画布')

/**
 * 是否展示「进入该节点/分支的时刻」（节点 / 分支 / 按进入时间下钻维度）
 * 返回：boolean
 */
const showNodeEnterTime = computed(() => {
  const t = props.sourceDimension?.type
  return t === 'node' || t === 'branch' || t === 'node-time'
})

/** 区间文案 */
const rangeText = computed(() => {
  // 按进入时间下钻（node-time）：展示实际进入时间窗口，而非全局统计区间
  const enterFrom = Number(props.sourceDimension?.enterFrom) || 0
  const enterTo = Number(props.sourceDimension?.enterTo) || 0
  if (props.sourceDimension?.type === 'node-time' && (enterFrom || enterTo)) {
    const from = enterFrom ? formatTime(enterFrom) : '—'
    const to = enterTo ? formatTime(enterTo - 1) : '—'
    return `进入时间 ${from} ~ ${to}`
  }
  const r = effectiveRange.value
  if (!r.from && !r.to) return ''
  return `${r.from || '—'} 至 ${r.to || '—'}`
})

/** 明细数据 */
const summary = computed(() => {
  try {
    return RuntimeStatsMock.getCustomerDetails(String(props.canvasId), {
      from: effectiveRange.value.from,
      to: effectiveRange.value.to,
      days: effectiveRange.value.days,
      status: status.value,
      keyword: appliedKeyword.value,
      nodeId: props.sourceDimension?.nodeId || '',
      branchKey: props.sourceDimension?.branchKey || '',
      enterFrom: props.sourceDimension?.enterFrom || 0,
      enterTo: props.sourceDimension?.enterTo || 0,
      sortBy: sortBy.value,
      page: page.value,
      pageSize
    })
  } catch {
    return { list: [], total: 0, personCount: 0, recordCount: 0, filteredPersonCount: 0, statusCounts: { all: 0, finished: 0, running: 0, waiting: 0 }, page: 1, pageSize: 20, totalPages: 1 }
  }
})

/** 状态筛选胶囊 */
const statusPills = computed(() => {
  const c = summary.value.statusCounts
  return [
    { key: 'all', label: '全部', count: c.all || 0 },
    { key: 'finished', label: '已结束', count: c.finished || 0 },
    { key: 'running', label: '进行中', count: c.running || 0 },
    { key: 'waiting', label: '等待中', count: c.waiting || 0 }
  ]
})

const columns = computed(() => [
  { title: '客户号', dataIndex: 'customerNo', width: 120 },
  { title: showNodeEnterTime.value ? '进入节点时间' : '进入时间', dataIndex: 'enterTime', width: 160, slotName: 'enterTime' },
  { title: '推送批次', dataIndex: 'batchNo', width: 150 },
  { title: '是否结束', dataIndex: 'status', width: 100, slotName: 'status' },
  { title: '当前节点', dataIndex: 'currentNode', width: 140 },
  { title: '操作', dataIndex: 'action', width: 80, slotName: 'action' }
])

/**
 * 格式化时间戳为 YYYY-MM-DD HH:mm:ss
 * 入参：ts(number)
 * 返回：字符串
 */
function formatTime(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

/**
 * 状态中文文案
 * 入参：s(string)
 * 返回：字符串
 */
function statusLabel(s) {
  if (s === 'finished') return '已结束'
  if (s === 'waiting') return '等待中'
  return '进行中'
}

/**
 * 状态标签色
 * 入参：s(string)
 * 返回：Arco color
 */
function statusColor(s) {
  if (s === 'finished') return 'green'
  if (s === 'waiting') return 'orange'
  return 'blue'
}

/**
 * 切换状态筛选
 * 入参：key(string)
 * 返回：void
 */
function setStatus(key) {
  status.value = key
  resetPage()
}

/**
 * 应用客户号检索
 * 返回：void
 */
function applyKeyword() {
  appliedKeyword.value = String(keyword.value || '').trim()
  resetPage()
}

/**
 * 重置到第一页
 * 返回：void
 */
function resetPage() {
  page.value = 1
}

/**
 * 切换分页
 * 入参：pageNo(number)
 * 返回：void
 */
function onPageChange(pageNo) {
  page.value = pageNo
}

watch(() => [props.sourceDimension, props.range?.from, props.range?.to], () => {
  resetPage()
})
</script>

<style scoped>
.customer-detail { background: #fff; border: 1px solid #e5e6eb; border-radius: 8px; padding: 16px }
.customer-detail__head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px }
.breadcrumb { display: flex; align-items: center; gap: 6px; font-size: 13px }
.breadcrumb__root { color: #86909c }
.breadcrumb__sep { color: #c9cdd4 }
.breadcrumb__cur { color: #1d2129; font-weight: 600 }
.breadcrumb__range { margin-left: 8px; font-size: 12px; color: #86909c }
.customer-detail__count { font-size: 13px; color: #4e5969 }
.customer-detail__count b { color: #165dff; font-size: 16px }
.summary-bar { display: flex; gap: 28px; flex-wrap: wrap; background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px 14px; margin-bottom: 12px }
.summary-item { display: flex; flex-direction: column; gap: 2px }
.summary-item .label { font-size: 12px; color: #86909c }
.summary-item .value { font-size: 17px; font-weight: 600; color: #1d2129 }
.filter-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 10px; flex-wrap: wrap }
.status-pills { display: flex; gap: 8px; flex-wrap: wrap }
.pill { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; font-size: 12px; border: 1px solid #e5e6eb; border-radius: 14px; background: #fff; color: #4e5969; cursor: pointer }
.pill__count { color: #86909c; font-size: 11px }
.pill.is-active { border-color: rgb(var(--primary-6)); color: rgb(var(--primary-6)); background: rgb(var(--primary-1)) }
.pill.is-active .pill__count { color: rgb(var(--primary-6)) }
.filter-row__right { display: flex; align-items: center; gap: 8px }
.table-foot { margin-top: 8px; font-size: 12px; color: #86909c; background: #f8fafc; border-radius: 4px; padding: 6px 10px }
.pager { margin-top: 12px; display: flex; justify-content: flex-end }
</style>
