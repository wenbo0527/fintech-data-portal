<template>
  <div class="metrics-dashboard-page">
    <!-- 页头 -->
    <div class="dashboard-header">
      <div>
        <h2>{{ board.config.title }}</h2>
        <p class="header-sub">{{ board.config.subtitle }}</p>
      </div>
      <a-space>
        <a-tag color="arcoblue" size="large">{{ board.config.audience }}</a-tag>
        <a-button size="small" @click="router.push({ name: 'metrics-center' })">
          <template #icon><IconApps /></template>
          指标管理
        </a-button>
        <a-button size="small" @click="router.push({ name: 'metrics-center-map' })">
          <template #icon><IconLocation /></template>
          指标地图
        </a-button>
      </a-space>
    </div>

    <!-- 核心指标卡片（由指标中心解析后渲染） -->
    <a-row :gutter="16" class="summary-row">
      <a-col :span="6" v-for="card in board.kpis" :key="card.key">
        <a-card class="summary-card" :class="cardClass(card)">
          <template #title>
            <div class="card-title">
              <span>{{ card.title }}</span>
              <metric-ref-popover :card="card" @detail="goDetail" />
            </div>
          </template>
          <template #extra>
            <a-tag v-if="stateOf(card) === 'missing'" color="orangered" size="small">未注册</a-tag>
            <a-tag v-else-if="stateOf(card) === 'draft'" color="orange" size="small">草稿不可用</a-tag>
            <a-tag v-else-if="stateOf(card) === 'archived'" color="gray" size="small">口径已归档</a-tag>
            <a-link v-else-if="isOutdated(card)" size="small" @click="goDetail(card.primary!.metric!.id, card, true)">
              口径已更新
            </a-link>
          </template>
          <a-statistic
            :value="(displayValue(card) as unknown) as number"
            :suffix="displayUnit(card)"
            :value-style="statisticStyle(card)"
          >
            <template #extra>
              <div v-if="card.primary?.values && stateOf(card) === 'ok'" class="trend-badge" :class="card.primary.values.trend >= 0 ? 'up' : 'down'">
                <IconArrowRise v-if="card.primary.values.trend >= 0" />
                <IconArrowFall v-else />
                {{ Math.abs(card.primary.values.trend) }}%
              </div>
              <span v-else class="ref-code">{{ card.primary?.code }}</span>
            </template>
          </a-statistic>
          <div class="statistic-foot">
            <template v-if="stateOf(card) === 'missing'">
              <span class="foot-warn">看板引用编码 {{ card.primary?.code }}，指标中心未注册</span>
              <a-link size="small" @click="goRegister(card)">去注册</a-link>
            </template>
            <template v-else>
              <span>{{ card.primary?.metric?.businessOwner || '-' }} · {{ card.primary?.metric?.code }}</span>
              <span v-if="isOutdated(card)" class="foot-warn">
                v{{ card.primary?.pinnedVersion }} → v{{ card.primary?.metric?.currentVersion }}
              </span>
            </template>
          </div>
          <!-- 环比 / 同比（R16：与上期、去年同期对比） -->
          <div v-if="stateOf(card) === 'ok' && hasCompare(card)" class="compare-row">
            <span v-if="card.primary?.values?.mom !== undefined">
              环比 <em :class="pctClass(card.primary!.values!.mom)">{{ pctText(card.primary!.values!.mom) }}</em>
            </span>
            <span v-if="card.primary?.values?.yoy !== undefined">
              同比 <em :class="pctClass(card.primary!.values!.yoy)">{{ pctText(card.primary!.values!.yoy) }}</em>
            </span>
          </div>
        </a-card>
      </a-col>
    </a-row>

    <!-- 图表区域 -->
    <a-row :gutter="16" style="margin-top: 16px">
      <a-col :span="12" v-for="card in board.charts.filter(c => c.chartType !== 'bar')" :key="card.key">
        <a-card class="chart-card" :class="{ 'ref-disabled': stateOf(card) !== 'ok' }">
          <template #title>
            <div class="card-title">
              <span>{{ card.title }}</span>
              <metric-ref-popover :card="card" @detail="goDetail" />
              <a-tag v-if="isOutdated(card)" color="orange" size="small">口径已更新</a-tag>
            </div>
          </template>
          <div :ref="el => setChartEl(card.key, el)" style="height: 300px"></div>
        </a-card>
      </a-col>
    </a-row>

    <a-row :gutter="16" style="margin-top: 16px">
      <a-col :span="24" v-for="card in board.charts.filter(c => c.chartType === 'bar')" :key="card.key">
        <a-card class="chart-card" :class="{ 'ref-disabled': stateOf(card) !== 'ok' }">
          <template #title>
            <div class="card-title">
              <span>{{ card.title }}</span>
              <metric-ref-popover :card="card" @detail="goDetail" />
              <a-tag v-if="outdatedCount(card)" color="orange" size="small">{{ outdatedCount(card) }} 项口径已更新</a-tag>
            </div>
          </template>
          <div :ref="el => setChartEl(card.key, el)" style="height: 280px"></div>
          <div class="ref-list">
            <span v-for="metricRef in card.refs" :key="metricRef.code" class="ref-item" :class="{ outdated: metricRef.outdated }">
              <a-link size="small" @click="metricRef.metric && goDetail(metricRef.metric.id, card)">{{ metricRef.metric?.name || metricRef.code }}</a-link>
              <span class="ref-code">{{ metricRef.code }}</span>
              <span v-if="metricRef.outdated" class="foot-warn">v{{ metricRef.pinnedVersion }} → v{{ metricRef.metric?.currentVersion }}</span>
            </span>
          </div>
        </a-card>
      </a-col>
    </a-row>

    <!-- 数据来源说明 -->
    <a-alert type="info" style="margin-top: 16px" :show-icon="true">
      <template #title>数据来源说明</template>
      本看板共 {{ totalCards }} 张卡片，引用指标中心 {{ distinctCodes.length }} 个指标编码，口径与取值均来自指标定义；
      <template v-if="issueRefs.length">
        其中 {{ issueRefs.length }} 处引用异常（未注册 / 草稿 / 已归档），
      </template>
      <template v-if="outdatedRefs.length">
        {{ outdatedRefs.length }} 处口径已升版（{{ outdatedRefs.map(r => `${r.metric?.name} v${r.pinnedVersion}→v${r.metric?.currentVersion}`).join('、') }}），请确认是否更新看板锁定版本。
      </template>
      <template v-else-if="!issueRefs.length">
        全部引用与当前启用版本一致。
      </template>
    </a-alert>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import { MetricsCenterStore } from '@/mock-dca/metrics-center/store'
import type { ResolvedCard, ResolvedRef } from '@/mock-dca/metrics-center/types'
import MetricRefPopover from '@dca-components/metrics/MetricRefPopover.vue'

const router = useRouter()

/** 看板内容全部来自指标中心：卡片配置只保存编码，口径与取值按编码解析 */
const board = computed(() => MetricsCenterStore.getBoards()[0])

const allCards = computed(() => [...board.value.kpis, ...board.value.charts])
const allRefs = computed(() => allCards.value.flatMap(c => c.refs))
const totalCards = computed(() => allCards.value.length)
const distinctCodes = computed(() => [...new Set(allRefs.value.map(r => r.code))])
const issueRefs = computed(() => allRefs.value.filter(r => r.status !== 'ok'))
const outdatedRefs = computed(() => allRefs.value.filter(r => r.outdated))

function stateOf(card: ResolvedCard) {
  return card.primary?.status || 'missing'
}
function isOutdated(card: ResolvedCard) {
  return !!card.primary?.outdated
}
function outdatedCount(card: ResolvedCard) {
  return card.refs.filter(r => r.outdated).length
}
function cardClass(card: ResolvedCard) {
  return {
    'ref-disabled': stateOf(card) !== 'ok',
    'ref-outdated': isOutdated(card),
  }
}
function displayValue(card: ResolvedCard) {
  const points = card.primary?.values?.points
  if (stateOf(card) !== 'ok' || !points?.length) return '--'
  return points[points.length - 1].value.toLocaleString('zh-CN')
}
function displayUnit(card: ResolvedCard) {
  return stateOf(card) === 'ok' ? card.primary?.values?.unit || '' : ''
}
function statisticStyle(card: ResolvedCard) {
  if (stateOf(card) !== 'ok') return { color: '#c9cdd4' }
  const trend = card.primary?.values?.trend ?? 0
  return { color: trend >= 0 ? '#00b42a' : '#f53f3f' }
}

/** 环比/同比展示（R16） */
function hasCompare(card: ResolvedCard) {
  const v = card.primary?.values
  return v?.mom !== undefined || v?.yoy !== undefined
}
function pctText(v: number) {
  return `${v >= 0 ? '+' : '-'}${Math.abs(v)}%`
}
function pctClass(v: number | undefined) {
  if (v === undefined) return ''
  return v >= 0 ? 'pct-up' : 'pct-down'
}

function goDetail(id: string, card: ResolvedCard, focusVersion = false) {
  router.push({
    name: 'metrics-center-detail',
    params: { id },
    query: { from: 'dashboard', board: board.value.config.id, card: card.key, ...(focusVersion ? { tab: 'versions' } : {}) },
  })
}
function goRegister(card: ResolvedCard) {
  router.push({ name: 'metrics-center-create', query: { code: card.primary?.code, from: 'dashboard' } })
}

// ==================== 图表渲染 ====================
const chartEls = new Map<string, HTMLElement>()
const charts = new Map<string, echarts.ECharts>()

function setChartEl(key: string, el: unknown) {
  if (el instanceof HTMLElement) chartEls.set(key, el)
  else chartEls.delete(key)
}

function latestValue(ref: ResolvedRef) {
  const points = ref.values?.points
  return points?.length ? points[points.length - 1].value : 0
}

function buildOption(card: ResolvedCard): echarts.EChartsCoreOption | null {
  const primary = card.primary
  if (!primary || primary.status !== 'ok') return null

  if (card.chartType === 'line' && primary.values) {
    return {
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: primary.values.points.map(p => p.period) },
      yAxis: { type: 'value', name: primary.values.unit, scale: true },
      series: [{
        name: primary.metric?.name || card.title,
        type: 'line',
        data: primary.values.points.map(p => p.value),
        smooth: true,
        areaStyle: { opacity: 0.1 },
        itemStyle: { color: '#165dff' },
      }],
      grid: { left: '10%', right: '5%', bottom: '10%' },
    }
  }

  if (card.chartType === 'pie' && primary.values?.breakdown) {
    return {
      tooltip: { trigger: 'item', formatter: '{b}: {c}%' },
      legend: { bottom: 0 },
      series: [{
        type: 'pie',
        radius: ['40%', '70%'],
        data: primary.values.breakdown.map(d => ({ name: d.name, value: d.value })),
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { formatter: '{b}\n{d}%' },
      }],
      color: ['#00b42a', '#ff7d00', '#f53f3f', '#722ed1', '#86909c'],
    }
  }

  if (card.chartType === 'bar') {
    return {
      tooltip: { trigger: 'axis' },
      legend: { data: ['实际值', '监管要求'] },
      xAxis: { type: 'category', data: card.refs.map(r => r.metric?.name || r.code) },
      yAxis: { type: 'value' },
      series: [
        { name: '实际值', type: 'bar', data: card.refs.map(latestValue), itemStyle: { color: '#165dff' } },
        { name: '监管要求', type: 'bar', data: card.refs.map(r => r.values?.threshold ?? 0), itemStyle: { color: '#e5e6eb' } },
      ],
      grid: { left: '8%', right: '5%', bottom: '15%' },
    }
  }

  return null
}

function renderCharts() {
  for (const card of board.value.charts) {
    const el = chartEls.get(card.key)
    if (!el) continue
    let instance = charts.get(card.key)
    if (!instance) {
      instance = echarts.init(el)
      charts.set(card.key, instance)
    }
    const option = buildOption(card)
    instance.clear()
    if (option) instance.setOption(option)
  }
}

function handleResize() {
  charts.forEach(chart => chart.resize())
}

watch(board, () => nextTick(renderCharts), { deep: true })

onMounted(() => {
  nextTick(() => {
    renderCharts()
    window.addEventListener('resize', handleResize)
  })
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  charts.forEach(chart => chart.dispose())
  charts.clear()
  chartEls.clear()
})
</script>

<style lang="scss" scoped>
.metrics-dashboard-page {
  padding: 24px;

  .dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 20px;

    h2 { margin: 0 0 4px; font-size: 20px; }
    .header-sub { color: #86909c; font-size: 13px; margin: 0; }
  }

  .card-title {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .summary-card {
    .trend-badge {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      font-size: 12px;
      padding: 2px 6px;
      border-radius: 4px;

      &.up { color: #00b42a; background: #e8ffea; }
      &.down { color: #f53f3f; background: #ffece8; }
    }

    .statistic-foot {
      margin-top: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: #86909c;
    }

    .compare-row {
      margin-top: 6px;
      display: flex;
      gap: 16px;
      font-size: 12px;
      color: #86909c;

      em {
        font-style: normal;
        font-weight: 600;

        &.pct-up { color: #00b42a; }
        &.pct-down { color: #f53f3f; }
      }
    }
  }

  .ref-outdated {
    border-color: #ffcf8b;
  }

  .ref-disabled {
    :deep(.arco-statistic-content) { color: #c9cdd4; }
  }

  .foot-warn { color: #ff7d00; font-size: 12px; }
  .ref-code { color: #c9cdd4; font-size: 12px; }

  .ref-list {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    padding-top: 8px;
    border-top: 1px dashed #e5e6eb;

    .ref-item {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;

      &.outdated .ref-code { color: #ff7d00; }
    }
  }

  .chart-card {
    :deep(.arco-card-body) {
      padding: 12px 16px;
    }
  }
}
</style>
