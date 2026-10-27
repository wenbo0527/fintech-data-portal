<template>
  <div class="flow-panel">
    <!-- 顶部：返回 + 客户卡 -->
    <div class="flow-panel__head">
      <a-button size="small" @click="emit('back')">
        <template #icon><IconLeft /></template>
        {{ backText }}
      </a-button>
      <div class="flow-panel__title">单客户流水详情</div>
    </div>

    <a-empty v-if="!flow.customer" description="未查询到该客户在画布内的流转记录" />

    <template v-else>
      <!-- 客户卡 -->
      <div class="customer-card">
        <div class="customer-card__main">
          <div class="cc-row">
            <span class="cc-label">客户号</span>
            <span class="cc-value cc-value--strong">{{ flow.customer.customerNo }}</span>
            <span class="cc-label">脱敏手机号</span>
            <span class="cc-value">{{ flow.customer.phoneMasked || '—' }}</span>
          </div>
          <div class="cc-row">
            <span class="cc-label">所属人群包</span>
            <span class="cc-value">{{ flow.customer.audienceName || '—' }}</span>
            <span class="cc-label">量级</span>
            <span class="cc-value">{{ formatCount(flow.customer.audienceSize) }}</span>
          </div>
          <div class="cc-row">
            <span class="cc-label">首次进入</span>
            <span class="cc-value">{{ formatTime(flow.customer.firstEnterTime) }}</span>
            <span class="cc-label">统计区间</span>
            <span class="cc-value">{{ rangeText }}</span>
          </div>
        </div>
        <div class="customer-card__metrics">
          <div class="cc-metric"><span class="label">进入批次</span><span class="value">{{ flow.batches.length }}</span></div>
          <div class="cc-metric"><span class="label">流转记录</span><span class="value">{{ flow.batches.reduce((s, b) => s + (b.records?.length || 0), 0) }}</span></div>
          <div class="cc-metric"><span class="label">经过节点</span><span class="value">{{ nodeCount }}</span></div>
        </div>
      </div>

      <a-alert v-if="flow.limitHint" type="warning" style="margin-bottom: 12px">
        {{ flow.limitHint }}，其余可通过检索结果查看
      </a-alert>

      <div class="flow-panel__body">
        <!-- 左侧：按批次分组的流转流水 -->
        <div class="flow-panel__left">
          <div class="panel-title">流转流水</div>
          <div v-for="batch in flow.batches" :key="batch.batchNo" class="batch-group">
            <div class="batch-group__head">
              <span class="batch-no">{{ batch.batchNo }}</span>
              <span class="batch-time">{{ formatTime(batch.enterTime) }} ~ {{ formatTime(batch.endTime) }}</span>
              <span class="batch-count">{{ batch.records.length }} 条</span>
              <a-tag :color="statusColor(batch.status)" size="small">{{ statusLabel(batch.status) }}</a-tag>
              <span class="batch-duration">耗时 {{ formatDuration(batch.duration) }}</span>
            </div>
            <div class="batch-group__body">
              <div v-for="(r, i) in batch.records" :key="`${batch.batchNo}-${i}`" class="flow-row">
                <span class="flow-row__seq">{{ i + 1 }}</span>
                <span class="flow-row__name">{{ r.nodeName }}</span>
                <a-tag size="small" class="flow-row__type">{{ nodeTypeLabel(r.nodeType) }}</a-tag>
                <span class="flow-row__time">{{ formatTime(r.enterTime) }}</span>
                <span class="flow-row__result">{{ r.result }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧：批次概览 / 路径缩略 / 客户字段 -->
        <div class="flow-panel__right">
          <div class="side-block">
            <div class="panel-title">批次概览</div>
            <div v-for="batch in flow.batches" :key="`ov-${batch.batchNo}`" class="overview-row" @click="activeBatchNo = batch.batchNo">
              <div class="overview-row__line1">
                <span class="ov-no">{{ batch.batchNo }}</span>
                <a-tag :color="statusColor(batch.status)" size="small">{{ statusLabel(batch.status) }}</a-tag>
              </div>
              <div class="overview-row__line2">{{ formatTime(batch.enterTime) }}</div>
              <div class="overview-row__line3">{{ batch.pathSummary || '—' }}</div>
            </div>
          </div>

          <div class="side-block">
            <div class="panel-title">当前批次路径缩略</div>
            <div v-if="!activeBatch" class="empty-hint">暂无选中批次</div>
            <div v-else class="path-mini">
              <div
                v-for="(r, i) in activeBatch.records"
                :key="`pm-${i}`"
                class="path-mini__node"
              >
                <div class="path-mini__block">{{ r.nodeName }}</div>
                <div class="path-mini__time">{{ formatTime(r.enterTime).slice(11, 19) }}</div>
              </div>
            </div>
          </div>

          <div class="side-block">
            <div class="panel-title">客户与结果</div>
            <div class="field-table">
              <div class="field-row"><span class="f-label">客户号</span><span class="f-value">{{ flow.customer.customerNo }}</span></div>
              <div class="field-row"><span class="f-label">手机号</span><span class="f-value">{{ flow.customer.phoneMasked || '—' }}</span></div>
              <div class="field-row"><span class="f-label">人群包</span><span class="f-value">{{ flow.customer.audienceName || '—' }}</span></div>
              <div class="field-row"><span class="f-label">人群量级</span><span class="f-value">{{ formatCount(flow.customer.audienceSize) }}</span></div>
              <div class="field-row"><span class="f-label">进入批次</span><span class="f-value">{{ flow.totalBatches }}</span></div>
              <div class="field-row"><span class="f-label">流转记录</span><span class="f-value">{{ flow.totalRecords }}</span></div>
              <div class="field-row"><span class="f-label">最终结果</span><span class="f-value">{{ flow.customer.lastStatus ? statusLabel(toStatus(flow.customer.lastStatus)) : '—' }}</span></div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
/*
用途：单客户流水详情（A5，与 B1 检索共用同一页面）
说明：顶部客户卡 + 左侧按批次分组的流转流水 + 右侧批次概览、路径缩略与客户字段表；批次倒序、批内时间正序。
边界：只读，不触发任何画布配置变更；返回文案与落点随来源（A4 下钻 / B1 检索）变化。
*/
import { ref, computed, watch } from 'vue'
import { RuntimeStatsMock } from '@/utils/runtimeStatsMock.js'

const props = defineProps({
  /** 画布 ID（任务 ID） */
  canvasId: { type: String, default: '' },
  /** 客户号 */
  customerNo: { type: String, default: '' },
  /** 统计区间 { from, to, days } */
  range: { type: Object, default: () => ({ from: '', to: '', days: 7 }) },
  /** 来源：'detail'（A4 下钻） | 'search'（B1 检索） */
  source: { type: String, default: 'detail' }
})
const emit = defineEmits(['back'])

const activeBatchNo = ref('')

/** 返回文案随来源变化（R73） */
const backText = computed(() => (props.source === 'search' ? '返回检索结果' : '返回客户列表'))

/** 区间文案 */
const rangeText = computed(() => {
  const r = props.range || {}
  if (!r.from && !r.to) return '近 7 天'
  return `${r.from || '—'} 至 ${r.to || '—'}`
})

/** 客户流水数据 */
const flow = computed(() => {
  try {
    return RuntimeStatsMock.getCustomerFlow(String(props.canvasId), String(props.customerNo || ''), {
      from: props.range?.from || '',
      to: props.range?.to || '',
      days: props.range?.days || 7
    })
  } catch {
    return { customer: null, batches: [], truncated: false, totalBatches: 0, totalRecords: 0, limitHint: '' }
  }
})

/** 当前选中批次（默认第一个，即最新批次） */
const activeBatch = computed(() => {
  const list = flow.value.batches || []
  if (!list.length) return null
  return list.find(b => b.batchNo === activeBatchNo.value) || list[0]
})

/** 经过节点数（去重） */
const nodeCount = computed(() => {
  const set = new Set()
  ;(flow.value.batches || []).forEach(b => (b.records || []).forEach(r => set.add(r.nodeId)))
  return set.size
})

/**
 * 格式化时间戳
 * 入参：ts(number)
 * 返回：'YYYY-MM-DD HH:mm:ss'；无效返回 '—'
 */
function formatTime(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

/**
 * 格式化时长
 * 入参：ms(number)
 * 返回：中文可读串
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

/**
 * 格式化大数字
 * 入参：n(number)
 * 返回：千分位字符串
 */
function formatCount(n) {
  const v = Number(n) || 0
  return v.toLocaleString('zh-CN')
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
 * 批次原始状态 → 三态
 * 入参：s(string)
 * 返回：'finished' | 'running' | 'waiting'
 */
function toStatus(s) {
  if (s === 'finished') return 'finished'
  if (s === 'waiting') return 'waiting'
  return 'running'
}

/**
 * 节点类型中文名
 * 入参：t(string)
 * 返回：字符串
 */
function nodeTypeLabel(t) {
  const map = {
    start: '开始', end: '结束', 'crowd-split': '人群分流', 'audience-split': '人群分流',
    'ab-test': 'AB实验', 'event-split': '事件分流', sms: '短信', wait: '等待延时',
    'ai-call': 'AI外呼', 'app-push': 'APP推送', 'wechat-push': '微信推送',
    'benefit-push': '权益下发', 'manual-call': '人工外呼', condition: '条件判断'
  }
  return map[t] || t || '节点'
}

watch(() => props.customerNo, () => {
  activeBatchNo.value = ''
})
</script>

<style scoped>
.flow-panel { display: flex; flex-direction: column; gap: 12px; padding: 16px 20px 24px; background: #f7f8fa; min-height: 100%; }
.flow-panel__head { display: flex; align-items: center; gap: 12px }
.flow-panel__title { font-size: 15px; font-weight: 600; color: #1d2129 }
.customer-card { display: flex; align-items: center; justify-content: space-between; gap: 24px; background: #fff; border: 1px solid #e5e6eb; border-radius: 8px; padding: 14px 16px; flex-wrap: wrap }
.customer-card__main { display: flex; flex-direction: column; gap: 6px }
.cc-row { display: flex; align-items: center; gap: 8px; font-size: 12px }
.cc-label { color: #86909c }
.cc-value { color: #4e5969 }
.cc-value--strong { font-size: 15px; font-weight: 700; color: #1d2129 }
.customer-card__metrics { display: flex; gap: 28px }
.cc-metric { display: flex; flex-direction: column; gap: 2px; align-items: flex-end }
.cc-metric .label { font-size: 12px; color: #86909c }
.cc-metric .value { font-size: 20px; font-weight: 700; color: #165dff }
.flow-panel__body { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 16px; align-items: start }
.flow-panel__left, .flow-panel__right { display: flex; flex-direction: column; gap: 12px }
.panel-title { font-size: 13px; font-weight: 600; color: #1d2129; margin-bottom: 8px }
.batch-group { background: #fff; border: 1px solid #e5e6eb; border-radius: 8px; margin-bottom: 12px; overflow: hidden }
.batch-group__head { display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: #f8fafc; border-bottom: 1px solid #e5e6eb; font-size: 12px; color: #4e5969; flex-wrap: wrap }
.batch-no { font-weight: 600; color: #1d2129 }
.batch-duration { color: #86909c }
.batch-group__body { padding: 4px 0 }
.flow-row { display: grid; grid-template-columns: 28px 140px 92px 160px minmax(0, 1fr); align-items: center; gap: 8px; padding: 7px 14px; font-size: 12px; border-bottom: 1px dashed #f2f3f5 }
.flow-row:last-child { border-bottom: none }
.flow-row__seq { color: #c9cdd4 }
.flow-row__name { color: #1d2129; font-weight: 500 }
.flow-row__time { color: #86909c }
.flow-row__result { color: #4e5969 }
.side-block { background: #fff; border: 1px solid #e5e6eb; border-radius: 8px; padding: 12px 14px }
.overview-row { padding: 8px 0; border-bottom: 1px dashed #f2f3f5; cursor: pointer }
.overview-row:last-child { border-bottom: none }
.overview-row__line1 { display: flex; align-items: center; justify-content: space-between; gap: 8px }
.overview-row__line2 { font-size: 11px; color: #86909c; margin-top: 2px }
.overview-row__line3 { font-size: 11px; color: #4e5969; margin-top: 2px; word-break: break-all }
.ov-no { font-size: 12px; font-weight: 600; color: #1d2129 }
.path-mini { display: flex; align-items: center; gap: 6px; overflow-x: auto; padding-bottom: 4px }
.path-mini__node { display: flex; flex-direction: column; align-items: center; gap: 2px; flex: 0 0 auto }
.path-mini__block { background: #e8f3ff; border: 1px solid rgb(var(--primary-5)); color: rgb(var(--primary-7)); border-radius: 4px; padding: 4px 8px; font-size: 12px; white-space: nowrap }
.path-mini__time { font-size: 10px; color: #86909c }
.field-table { display: flex; flex-direction: column; gap: 6px }
.field-row { display: flex; justify-content: space-between; font-size: 12px; gap: 12px }
.f-label { color: #86909c }
.f-value { color: #1d2129; text-align: right; word-break: break-all }
.empty-hint { font-size: 12px; color: #86909c }
</style>
