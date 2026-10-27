<template>
  <aside class="node-drawer" role="complementary" aria-label="节点统计抽屉">
    <div class="node-drawer__head">
      <div class="head-left">
        <span class="node-name">{{ node?.name || '节点' }}</span>
        <a-tag size="small" color="arcoblue">{{ nodeTypeLabel(node?.type) }}</a-tag>
      </div>
      <a-button type="text" size="mini" @click="emit('close')" aria-label="关闭抽屉">
        <template #icon><IconClose /></template>
      </a-button>
    </div>

    <!-- 双 TAB：统计 / 配置（R13-2：同一时刻只存在一个抽屉） -->
    <div class="node-drawer__tabs" role="tablist" aria-label="节点信息切换">
      <button
        type="button"
        role="tab"
        class="drawer-tab"
        :class="{ 'is-active': activeTab === 'stats' }"
        :aria-selected="activeTab === 'stats'"
        @click="activeTab = 'stats'"
      >统计</button>
      <button
        type="button"
        role="tab"
        class="drawer-tab"
        :class="{ 'is-active': activeTab === 'config' }"
        :aria-selected="activeTab === 'config'"
        @click="activeTab = 'config'"
      >配置</button>
    </div>

    <div class="node-drawer__body">
      <!-- 配置 TAB：复用新建节点时的配置表单，保持字段与选项一致 -->
      <template v-if="activeTab === 'config'">
        <NodeConfigFormView :node="node" />
      </template>

      <!-- 统计 TAB -->
      <template v-else>
        <!-- 分流类节点：分支明细表（R13） -->
        <template v-if="isSplitNode">
          <div class="tip-bar">未配置权重，按均分口径统计</div>
          <a-table
            :columns="branchColumns"
            :data="branchTable"
            :pagination="false"
            :bordered="false"
            size="small"
            row-key="key"
          >
            <template #ratio="{ record }">
              <div class="ratio-cell">
                <span class="ratio-text">{{ formatRatio(record.ratio) }}</span>
                <span class="ratio-bar"><span class="ratio-bar__fill" :style="{ width: `${Math.round((record.ratio || 0) * 100)}%` }"></span></span>
              </div>
            </template>
            <template #action="{ record }">
              <a-button type="link" size="mini" @click="openBranchCustomers(record)">查看客户</a-button>
            </template>
          </a-table>
          <div class="branch-total">
            合计：流出 {{ branchOutflowTotal }} 人次 · 流入 {{ branchInflowTotal }} 人次
            <span class="branch-total__note">分支为流出量的拆分，各分支之和等于该节点当期流出总量</span>
          </div>
        </template>

        <!-- 普通节点：流量指标 + 趋势小图（R13-3） -->
        <template v-else>
          <div class="metrics-bar">
            <div class="metric"><span class="label">进入人次</span><span class="value">{{ totalEnter }}</span></div>
            <div class="metric"><span class="label">流出人次</span><span class="value">{{ totalExit }}</span></div>
            <div class="metric"><span class="label">流出率</span><span class="value">{{ formatRatio(exitRate) }}</span></div>
          </div>

          <div class="block-title">节点趋势</div>
          <div class="chart-legend">
            <span class="legend-item"><span class="legend-dot" style="background:#94bffb"></span>进入</span>
            <span class="legend-item"><span class="legend-dot" style="background:#165dff"></span>流出</span>
          </div>
          <div class="sparkline" aria-label="节点每日进出趋势">
            <div v-for="(r, i) in dailyRows" :key="i" class="bar-group">
              <div class="bar bar--enter" :style="{ height: barHeight(r.enter, yMax) }"></div>
              <div class="bar bar--exit" :style="{ height: barHeight(r.exit, yMax) }"></div>
            </div>
          </div>
          <div class="sparkline-axis">
            <span v-if="dailyRows.length">{{ dailyRows[0].date }}</span>
            <span v-if="dailyRows.length">{{ dailyRows[dailyRows.length - 1].date }}</span>
          </div>
        </template>

        <!-- 按进入时间查看：支持按日/按小时下钻，不只有总计 -->
        <div class="block-title">按进入时间查看</div>
        <div class="granularity-bar">
          <a-radio-group v-model="granularity" type="button" size="mini" @change="resetEnterAnchor">
            <a-radio value="day">按日</a-radio>
            <a-radio value="hour">按小时</a-radio>
          </a-radio-group>
          <a-select
            v-if="granularity === 'hour'"
            v-model="anchorDate"
            size="mini"
            style="width: 130px"
            @change="resetEnterAnchor"
          >
            <a-option v-for="d in anchorDateOptions" :key="d" :value="d">{{ d }}</a-option>
          </a-select>
        </div>
        <a-table
          :columns="enterTimeColumns"
          :data="enterTimeRows"
          :pagination="false"
          :bordered="false"
          size="small"
          row-key="key"
        >
          <template #action="{ record }">
            <a-button type="link" size="mini" :disabled="!record.enter" @click="openEnterTimeCustomers(record)">查看客户</a-button>
          </template>
          <template #empty>
            <a-empty description="该时间段暂无进入记录" :image-style="{ height: '60px' }" />
          </template>
        </a-table>
        <div class="enter-time-note">
          按「进入本节点的时刻」分桶统计，可按日或按小时查看并下钻到对应客户
        </div>
      </template>

      <div class="drawer-foot">
        <a-button size="small" type="primary" @click="openNodeCustomers">查看客户列表</a-button>
        <span v-if="cutoffText" class="drawer-cutoff">{{ cutoffText }}</span>
      </div>
    </div>
  </aside>
</template>

<script setup>
/*
用途：节点统计抽屉（A3 形态，画布结构 TAB 内点击节点唤出）
说明：抽屉内提供「统计 / 配置」双 TAB；统计 TAB 给分流分支表或流量指标与趋势小图，并附「按进入时间查看」分桶下钻；
      配置 TAB 只读回显节点原配置。两种形态都提供客户列表下钻。
边界：只读，不写入画布配置；同一时刻只存在一个抽屉（由页面控制）。
*/
import { computed, ref, watch } from 'vue'
import { RuntimeStatsMock } from '@/utils/runtimeStatsMock.js'
import { toTimeStr } from '@/utils/canvasFlowDataset.js'
import NodeConfigFormView from './NodeConfigFormView.vue'

const props = defineProps({
  /** 画布 ID（任务 ID） */
  canvasId: { type: String, default: '' },
  /** 聚焦节点 { id, name, type, config } */
  node: { type: Object, default: null },
  /** 统计区间 { from, to, days } */
  range: { type: Object, default: () => ({ from: '', to: '', days: 7 }) },
  /** 画布是否已结束 */
  finished: { type: Boolean, default: false },
  /** 数据截止时刻（毫秒） */
  cutoffAt: { type: Number, default: 0 }
})
const emit = defineEmits(['close', 'open-customers'])

/** 当前 TAB：stats（统计）| config（配置） */
const activeTab = ref('stats')

/** 是否分流类节点（R15：AB 测试 / 条件判断 / 事件分流） */
const isSplitNode = computed(() => {
  const t = props.node?.type
  return t === 'crowd-split' || t === 'audience-split' || t === 'ab-test' || t === 'event-split' || t === 'condition'
})

/** 节点每日进出 */
const dailyRows = computed(() => {
  if (!props.node?.id) return []
  try {
    return RuntimeStatsMock.getNodeDailyStats(String(props.canvasId), String(props.node.id), {
      from: props.range?.from || '',
      to: props.range?.to || '',
      days: props.range?.days || 7
    }) || []
  } catch { return [] }
})

const totalEnter = computed(() => dailyRows.value.reduce((s, r) => s + (r.enter || 0), 0))
const totalExit = computed(() => dailyRows.value.reduce((s, r) => s + (r.exit || 0), 0))
const exitRate = computed(() => (totalEnter.value > 0 ? totalExit.value / totalEnter.value : 0))

/** 分支汇总（R13：分支名称 / 流入人数 / 流出人数 / 占比） */
const branchTable = computed(() => {
  if (!props.node?.id) return []
  try {
    const list = RuntimeStatsMock.getBranchSummary(String(props.canvasId), String(props.node.id), {
      from: props.range?.from || '',
      to: props.range?.to || '',
      days: props.range?.days || 7
    }) || []
    return list.map(b => ({
      key: b.key,
      label: b.label,
      port: b.port,
      inflow: Number(b.inflow) || 0,
      outflow: Number(b.outflow) || 0,
      ratio: Number(b.ratio) || 0
    }))
  } catch { return [] }
})

const branchOutflowTotal = computed(() => branchTable.value.reduce((s, b) => s + b.outflow, 0))
const branchInflowTotal = computed(() => branchTable.value.reduce((s, b) => s + b.inflow, 0))

const branchColumns = [
  { title: '分支名称', dataIndex: 'label' },
  { title: '流入人数', dataIndex: 'inflow', width: 88 },
  { title: '流出人数', dataIndex: 'outflow', width: 88 },
  { title: '占比', dataIndex: 'ratio', slotName: 'ratio' },
  { title: '操作', dataIndex: 'action', width: 92, slotName: 'action' }
]

/** 趋势小图 Y 轴上限 */
const yMax = computed(() => Math.max(...dailyRows.value.map(r => Math.max(r.enter || 0, r.exit || 0)), 1))

/** 进入时间分桶粒度：day（按日）| hour（按小时） */
const granularity = ref('day')

/** 按小时时的锚定日期（YYYY-MM-DD），默认取统计区间最后一天 */
const anchorDate = ref('')

/** 按小时粒度可选的日期（统计区间内每一天） */
const anchorDateOptions = computed(() => {
  const from = props.range?.from || ''
  const to = props.range?.to || ''
  if (!from || !to) return []
  const list = []
  const start = new Date(`${from}T00:00:00`)
  const end = new Date(`${to}T00:00:00`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return []
  const cursor = new Date(start)
  while (cursor <= end && list.length < 90) {
    const p = (n) => String(n).padStart(2, '0')
    list.push(`${cursor.getFullYear()}-${p(cursor.getMonth() + 1)}-${p(cursor.getDate())}`)
    cursor.setDate(cursor.getDate() + 1)
  }
  return list
})

/** 按进入时刻分桶的统计行 */
const enterTimeRows = computed(() => {
  if (!props.node?.id) return []
  try {
    const list = RuntimeStatsMock.getNodeEnterTimeStats(String(props.canvasId), String(props.node.id), {
      from: props.range?.from || '',
      to: props.range?.to || '',
      days: props.range?.days || 7,
      granularity: granularity.value,
      anchorDate: anchorDate.value
    }) || []
    return list.map(b => ({
      key: b.key,
      label: b.label,
      start: b.start,
      end: b.end,
      enter: Number(b.enter) || 0,
      exit: Number(b.exit) || 0,
      customers: Number(b.customers) || 0
    }))
  } catch { return [] }
})

const enterTimeColumns = [
  { title: '进入时间', dataIndex: 'label', width: 96 },
  { title: '进入人次', dataIndex: 'enter', width: 82 },
  { title: '流出人次', dataIndex: 'exit', width: 82 },
  { title: '客户数', dataIndex: 'customers', width: 76 },
  { title: '操作', dataIndex: 'action', width: 92, slotName: 'action' }
]

/**
 * 切换粒度或锚定日期后重置下钻锚点
 * 返回：void
 */
function resetEnterAnchor() {
  // 粒度切换时按小时默认锚定统计区间最后一天
  if (granularity.value === 'hour' && !anchorDateOptions.value.includes(anchorDate.value)) {
    anchorDate.value = anchorDateOptions.value[anchorDateOptions.value.length - 1] || ''
  }
}

// 区间变化时重置锚定日期
watch(() => [props.range?.from, props.range?.to], () => {
  anchorDate.value = anchorDateOptions.value[anchorDateOptions.value.length - 1] || ''
}, { immediate: true })

/**
 * 计算柱高百分比
 * 入参：v(number)、max(number)
 * 返回：百分比字符串
 */
function barHeight(v, max) {
  return `${Math.round(((Number(v) || 0) / (max || 1)) * 100)}%`
}

/**
 * 格式化占比
 * 入参：ratio(number)
 * 返回：百分比字符串
 */
function formatRatio(ratio) {
  const v = Number(ratio) || 0
  return `${(v * 100).toFixed(1)}%`
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
    'benefit': '权益下发', 'manual-call': '人工外呼', condition: '条件判断'
  }
  return map[t] || t || '节点'
}

/** 运行中画布的截止时间标注（R78） */
const cutoffText = computed(() => {
  if (props.finished) return ''
  return `数据截至 ${toTimeStr(new Date(props.cutoffAt || Date.now()))}`
})

/**
 * 下钻到该节点维度的客户明细
 * 返回：void
 */
function openNodeCustomers() {
  if (!props.node?.id) return
  emit('open-customers', {
    type: 'node',
    label: props.node.name || '节点',
    nodeId: String(props.node.id),
    branchKey: ''
  })
}

/**
 * 下钻到该分支维度的客户明细（R13-1）
 * 入参：record(object)
 * 返回：void
 */
function openBranchCustomers(record) {
  if (!props.node?.id) return
  emit('open-customers', {
    type: 'branch',
    label: `${props.node.name || '节点'} · ${record.label}`,
    nodeId: String(props.node.id),
    branchKey: String(record.port || record.key)
  })
}

/**
 * 下钻到指定进入时间桶的客户明细
 * 入参：record(object) —— 分桶行 { label, start, end }
 * 返回：void
 */
function openEnterTimeCustomers(record) {
  if (!props.node?.id) return
  emit('open-customers', {
    type: 'node-time',
    label: `${props.node.name || '节点'} · ${record.label}`,
    nodeId: String(props.node.id),
    branchKey: '',
    enterFrom: record.start,
    enterTo: record.end
  })
}
</script>

<style scoped>
.node-drawer { width: 600px; flex: 0 0 600px; height: 100%; background: #fff; border-left: 1px solid #e5e6eb; display: flex; flex-direction: column; box-shadow: -4px 0 16px rgba(0, 0, 0, .06) }
.node-drawer__head { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; border-bottom: 1px solid #e5e6eb }
.head-left { display: flex; align-items: center; gap: 8px }
.node-name { font-size: 15px; font-weight: 600; color: #1d2129 }
.node-drawer__tabs { display: flex; gap: 4px; padding: 8px 16px 0; border-bottom: 1px solid #e5e6eb }
.drawer-tab { padding: 7px 16px; font-size: 13px; color: #4e5969; background: transparent; border: none; border-bottom: 2px solid transparent; cursor: pointer }
.drawer-tab:hover { color: #165dff }
.drawer-tab.is-active { color: #165dff; font-weight: 600; border-bottom-color: #165dff }
.node-drawer__body { flex: 1; overflow: auto; padding: 14px 16px; display: flex; flex-direction: column; gap: 12px }
.tip-bar { background: #f7f8fa; border: 1px solid #e5e6eb; border-radius: 4px; padding: 8px 10px; font-size: 12px; color: #86909c }
.metrics-bar { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px }
.metric { display: flex; flex-direction: column; gap: 3px; background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px }
.metric .label { font-size: 12px; color: #86909c }
.metric .value { font-size: 19px; font-weight: 700; color: #1d2129 }
.block-title { font-size: 13px; font-weight: 600; color: #1d2129 }
.granularity-bar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap }
.chart-legend { display: flex; gap: 14px; align-items: center; font-size: 12px; color: #4e5969 }
.legend-item { display: inline-flex; align-items: center; gap: 6px }
.legend-dot { width: 10px; height: 10px; border-radius: 2px; display: inline-block }
.sparkline { display: flex; align-items: flex-end; gap: 4px; height: 90px; padding: 6px 0; border-bottom: 1px solid #f2f3f5 }
.bar-group { display: flex; gap: 2px; flex: 1; height: 100%; align-items: flex-end }
.bar { flex: 1; border-radius: 2px 2px 0 0; min-height: 1px }
.bar--enter { background: #94bffb }
.bar--exit { background: #165dff }
.sparkline-axis { display: flex; justify-content: space-between; font-size: 11px; color: #86909c }
.ratio-cell { display: flex; flex-direction: column; gap: 3px }
.ratio-text { font-size: 12px; color: #4e5969 }
.ratio-bar { display: block; height: 4px; border-radius: 2px; background: #e5e7eb; overflow: hidden }
.ratio-bar__fill { display: block; height: 100%; background: #165dff }
.branch-total { font-size: 12px; color: #4e5969; text-align: right; display: flex; flex-direction: column; gap: 2px }
.branch-total__note { color: #86909c; font-size: 11px }
.enter-time-note { font-size: 11px; color: #86909c }
.drawer-foot { margin-top: auto; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-top: 10px; border-top: 1px solid #f2f3f5 }
.drawer-cutoff { font-size: 12px; color: #86909c }
</style>
