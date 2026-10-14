<template>
  <div class="quality-dashboard">
    <!-- 页头 -->
    <div class="dash-header">
      <div>
        <h2 class="dash-title">数据质量看板</h2>
        <p class="dash-sub">
          资产目录「已上线」表的质量评分总览；评分来自质量引擎按规则维度换算后回填的
          <code>table-catalog-store</code>（演示挡板，非真实扫描）
        </p>
      </div>
      <div class="dash-actions">
        <a-tag color="arcoblue">数据源：{{ onlineTables.length }} 张已上线表</a-tag>
        <a-button @click="goInstances">
          <template #icon><IconDashboard /></template>
          质量校验任务
        </a-button>
      </div>
    </div>

    <!-- ① 顶部统计卡 -->
    <a-row :gutter="16" class="stat-row">
      <a-col v-for="s in statCards" :key="s.key" :span="6">
        <a-card class="stat-card" :class="`stat-${s.key}`" :bordered="false">
          <div class="stat-label">{{ s.label }}</div>
          <div class="stat-value">
            {{ s.value }}<span class="stat-unit">{{ s.unit }}</span>
          </div>
          <div class="stat-foot">{{ s.foot }}</div>
        </a-card>
      </a-col>
    </a-row>

    <!-- ② 评分分布 + ③ 五维雷达 -->
    <a-row :gutter="16" class="chart-row">
      <a-col :span="12">
        <a-card class="chart-card">
          <template #title>质量评分分布</template>
          <template #extra><span class="chart-hint">按加权总分区间统计表数量</span></template>
          <div :ref="el => setChartEl('scoreDist', el)" class="chart-box"></div>
        </a-card>
      </a-col>
      <a-col :span="12">
        <a-card class="chart-card">
          <template #title>五维平均得分</template>
          <template #extra><span class="chart-hint">完整性 / 准确性 / 一致性 / 及时性 / 唯一性</span></template>
          <div :ref="el => setChartEl('dimRadar', el)" class="chart-box"></div>
        </a-card>
      </a-col>
    </a-row>

    <!-- ④ 业务域均分 + ⑥ 权重配置 -->
    <a-row :gutter="16" class="chart-row">
      <a-col :span="15">
        <a-card class="chart-card">
          <template #title>各业务域平均质量分</template>
          <template #extra><span class="chart-hint">治理责任按业务域归口</span></template>
          <div :ref="el => setChartEl('domainBar', el)" class="chart-box"></div>
        </a-card>
      </a-col>
      <a-col :span="9">
        <a-card class="chart-card weight-card">
          <template #title>评分权重配置</template>
          <template #extra>
            <a-tag color="gray" size="small">只读</a-tag>
          </template>
          <div v-for="d in dimWeightList" :key="d.key" class="weight-row">
            <span class="weight-name">{{ d.label }}</span>
            <a-progress
              :percent="d.percent"
              :color="d.color"
              :show-text="false"
              class="weight-bar"
            />
            <span class="weight-val">{{ Math.round(d.percent * 100) }}%</span>
            <span class="weight-avg">均分 {{ avgDims[d.key] }}</span>
          </div>
          <a-alert type="info" class="weight-tip">
            <template #title>演示为固定权重挡板</template>
            权重写死在 <code>table-catalog-store.ts</code> 的 <code>QUALITY_WEIGHTS</code>，
            总分 = Σ(维度分 × 权重)，暂不支持按业务域自定义权重。
          </a-alert>
        </a-card>
      </a-col>
    </a-row>

    <!-- ⑤ 低分表 Top 10 -->
    <a-card class="chart-card low-card">
      <template #title>
        <span>低分表 Top {{ lowTables.length || 10 }}</span>
        <a-tag v-if="governCount" color="red" size="small">{{ governCount }} 张表需治理（&lt; 60 分）</a-tag>
        <a-tag v-else color="green" size="small">暂无 60 分以下的表</a-tag>
      </template>
      <template #extra><span class="chart-hint">点击行可跳转数据地图该表的质量 Tab（自动高亮最短板维度）</span></template>
      <a-table
        :columns="lowColumns"
        :data="lowTables"
        :pagination="false"
        :bordered="{ wrapper: true, cell: true }"
        row-key="name"
        size="small"
        @row-click="goTableQuality"
      >
        <template #tableName="{ record }">
          <a-link @click.stop="goTableQuality(record)">
            <div class="t-name">{{ record.cnName }}</div>
            <div class="t-eng">{{ record.name }}</div>
          </a-link>
        </template>
        <template #score="{ record }">
          <a-tag :color="scoreColor(record.qualityScore)" size="small">{{ record.qualityScore }}</a-tag>
        </template>
        <template #worst="{ record }">
          <a-tag :color="dimColorOf(record.worstDim)" size="small">
            {{ dimLabelOf(record.worstDim) }} {{ record.quality[record.worstDim] }}
          </a-tag>
        </template>
        <template #dimDetail="{ record }">
          <div class="dim-mini">
            <span v-for="k in DIM_KEYS" :key="k" class="mini-chip" :class="{ worst: k === record.worstDim }">
              {{ QUALITY_DIM_LABELS[k].slice(0, 3) }} {{ record.quality[k] }}
            </span>
          </div>
        </template>
        <template #empty>
          <a-empty description="已上线表均有质量评分，暂无低分表" />
        </template>
      </a-table>
    </a-card>

    <!-- 数据来源说明 -->
    <a-alert type="info" class="source-alert" :show-icon="true">
      <template #title>数据来源与闭环说明</template>
      ① 本页数据直接读资产目录唯一事实源 <code>TableCatalogStore</code>（localStorage 持久化 + 种子兜底），不额外走 mock API；
      ② 评分链路：数据质量任务（五维规则）→ 实例校验结果（预置样例指标）→ 实例详情页「回填表目录」→
      <code>setQuality()</code> 写入五维与加权总分 → 本页与数据地图表详情同步刷新；
      ③ 未参与过校验回填的表使用种子基线评分，仅为演示口径。
    </a-alert>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import { IconDashboard } from '@arco-design/web-vue/es/icon'
import {
  TableCatalogStore,
  QUALITY_DIM_LABELS,
  QUALITY_WEIGHTS,
  computeQualityScore,
  type QualityDims
} from '@/mock-dca/shared/table-catalog-store'

type DimKey = keyof QualityDims

const router = useRouter()

const DIM_KEYS = Object.keys(QUALITY_DIM_LABELS) as DimKey[]

/** 维度配色与任务列表保持一致的语义（红/橙代表低分维度） */
const DIM_COLORS: Record<DimKey, string> = {
  completeness: 'arcoblue',
  accuracy: 'purple',
  consistency: 'cyan',
  timeliness: 'orange',
  uniqueness: 'green'
}

const DIM_HEX: Record<DimKey, string> = {
  completeness: '#165dff',
  accuracy: '#722ed1',
  consistency: '#0fc6c2',
  timeliness: '#ff7d00',
  uniqueness: '#00b42a'
}

// ---------------- 数据源：已上线表 ----------------
const onlineTables = computed(() => TableCatalogStore.discoverable())

/** 模板安全取值：表格 slot 里 record 是 any，避免直接索引枚举表 */
const dimColorOf = (dim: unknown) => DIM_COLORS[dim as DimKey] || 'gray'
const dimLabelOf = (dim: unknown) => QUALITY_DIM_LABELS[dim as DimKey] || String(dim ?? '')

const avgDims = computed(() => {
  const acc = {} as QualityDims
  const list = onlineTables.value
  DIM_KEYS.forEach(k => {
    const sum = list.reduce((a, t) => a + (t.quality?.[k] ?? 0), 0)
    acc[k] = list.length ? Math.round(sum / list.length) : 0
  })
  return acc
})

/** 加权总分（与目录字段一致，重算保证口径统一） */
const scoreOf = (t: { quality: QualityDims }) => {
  const score = computeQualityScore(t.quality)
  return Number.isFinite(score) ? score : 0
}

const worstDimOf = (t: { quality: QualityDims }): DimKey =>
  DIM_KEYS.reduce((worst, k) => ((t.quality?.[k] ?? 0) < (t.quality?.[worst] ?? 0) ? k : worst), DIM_KEYS[0])

const governTables = computed(() =>
  onlineTables.value.map(t => ({ ...t, score: scoreOf(t) })).filter(t => t.score < 60)
)

const highCount = computed(() => onlineTables.value.filter(t => scoreOf(t) >= 90).length)

const statCards = computed(() => {
  const total = onlineTables.value.length
  const avg = total
    ? Math.round(onlineTables.value.reduce((a, t) => a + scoreOf(t), 0) / total)
    : 0
  return [
    { key: 'monitored', label: '监控表数', value: total, unit: ' 张', foot: '资产目录已上线（online）范围' },
    { key: 'avg', label: '平均质量分', value: avg, unit: ' 分', foot: '五维加权，权重见右侧配置卡' },
    {
      key: 'excellent',
      label: '优质表占比（≥90）',
      value: total ? Math.round((highCount.value / total) * 100) : 0,
      unit: ' %',
      foot: `${highCount.value} / ${total} 张达到优质线`
    },
    {
      key: 'govern',
      label: '需治理表（<60）',
      value: governTables.value.length,
      unit: ' 张',
      foot: governTables.value.length ? '优先安排质量任务校验回填' : '暂无低于 60 分的表'
    }
  ]
})

// ---------------- 图表 ----------------
const scoreBuckets = computed(() => {
  const ranges: Array<[string, number, number, string]> = [
    ['0-60', 0, 59, '#f53f3f'],
    ['60-70', 60, 69, '#ff7d00'],
    ['70-80', 70, 79, '#fadc19'],
    ['80-90', 80, 89, '#00b42a'],
    ['90-100', 90, 100, '#165dff']
  ]
  return ranges.map(([label, min, max, color]) => ({
    label,
    color,
    value: onlineTables.value.filter(t => {
      const s = scoreOf(t)
      return s >= min && s <= max
    }).length
  }))
})

const domainStats = computed(() => {
  const map = new Map<string, { sum: number; count: number }>()
  onlineTables.value.forEach(t => {
    const key = t.domain || '未分类'
    const cur = map.get(key) || { sum: 0, count: 0 }
    cur.sum += scoreOf(t)
    cur.count += 1
    map.set(key, cur)
  })
  return [...map.entries()]
    .map(([domain, v]) => ({ domain, avg: Math.round(v.sum / v.count), count: v.count }))
    .sort((a, b) => b.avg - a.avg)
})

const lowTables = computed(() =>
  [...onlineTables.value]
    .sort((a, b) => scoreOf(a) - scoreOf(b))
    .slice(0, 10)
    .map(t => ({ ...t, worstDim: worstDimOf(t) }))
)

const governCount = computed(() => governTables.value.length)

const dimWeightList = computed(() =>
  DIM_KEYS.map(k => ({
    key: k,
    label: QUALITY_DIM_LABELS[k],
    percent: QUALITY_WEIGHTS[k],
    color: DIM_HEX[k]
  }))
)

const lowColumns = [
  { title: '表名（中 / 英）', slotName: 'tableName', width: 240 },
  { title: '业务域', dataIndex: 'domain', width: 100 },
  { title: '分层', dataIndex: 'layer', width: 80 },
  { title: '质量分', slotName: 'score', width: 90 },
  { title: '最短板维度', slotName: 'worst', width: 140 },
  { title: '五维明细', slotName: 'dimDetail', width: 320 },
  { title: '负责人', dataIndex: 'owner', width: 90 }
]

const scoreColor = (score: number) => (score >= 90 ? 'green' : score >= 80 ? 'blue' : score >= 60 ? 'orange' : 'red')

const chartEls = new Map<string, HTMLElement>()
const charts = new Map<string, echarts.ECharts>()

function setChartEl(key: string, el: unknown) {
  if (el instanceof HTMLElement) chartEls.set(key, el)
  else chartEls.delete(key)
}

function buildOption(key: string): echarts.EChartsCoreOption | null {
  if (key === 'scoreDist') {
    const buckets = scoreBuckets.value
    return {
      tooltip: { trigger: 'axis', formatter: (p: any) => `${p[0].name} 分：${p[0].value} 张表` },
      xAxis: { type: 'category', data: buckets.map(b => b.label) },
      yAxis: { type: 'value', minInterval: 1, name: '表数量' },
      series: [
        {
          type: 'bar',
          barWidth: '46%',
          data: buckets.map(b => ({ value: b.value, itemStyle: { color: b.color, borderRadius: [4, 4, 0, 0] } })),
          label: { show: true, position: 'top' }
        }
      ],
      grid: { left: '10%', right: '5%', bottom: '10%' }
    }
  }

  if (key === 'dimRadar') {
    return {
      tooltip: { trigger: 'item' },
      radar: {
        indicator: DIM_KEYS.map(k => ({ name: QUALITY_DIM_LABELS[k], max: 100 })),
        radius: '65%',
        splitNumber: 4,
        axisName: { color: '#4e5969', fontSize: 12 }
      },
      series: [
        {
          type: 'radar',
          data: [
            {
              name: '全量表五维平均分',
              value: DIM_KEYS.map(k => avgDims.value[k]),
              areaStyle: { opacity: 0.18 },
              lineStyle: { color: '#165dff' },
              itemStyle: { color: '#165dff' },
              label: { show: true, fontSize: 11 }
            },
            {
              name: '优质基线（90）',
              value: DIM_KEYS.map(() => 90),
              lineStyle: { color: '#86909c', type: 'dashed' },
              itemStyle: { color: '#86909c' },
              areaStyle: { opacity: 0 }
            }
          ]
        }
      ],
      legend: { bottom: 0, itemWidth: 12, itemHeight: 8 }
    }
  }

  if (key === 'domainBar') {
    const list = [...domainStats.value].reverse()
    return {
      tooltip: { trigger: 'axis', formatter: (p: any) => `${p[0].name}：均分 ${p[0].value}（${domainStats.value.find(d => d.domain === p[0].name)?.count ?? 0} 张表）` },
      xAxis: { type: 'value', min: 60, max: 100, name: '平均质量分' },
      yAxis: { type: 'category', data: list.map(d => d.domain), axisLabel: { fontSize: 12 } },
      series: [
        {
          type: 'bar',
          barWidth: '55%',
          data: list.map(d => ({
            value: d.avg,
            itemStyle: { color: d.avg >= 95 ? '#00b42a' : d.avg >= 90 ? '#165dff' : '#ff7d00', borderRadius: [0, 4, 4, 0] }
          })),
          label: { show: true, position: 'right', formatter: '{c}' }
        }
      ],
      grid: { left: '16%', right: '10%', bottom: '8%', top: '6%' }
    }
  }

  return null
}

function renderCharts() {
  for (const key of ['scoreDist', 'dimRadar', 'domainBar']) {
    const el = chartEls.get(key)
    if (!el) continue
    let instance = charts.get(key)
    if (!instance) {
      instance = echarts.init(el)
      charts.set(key, instance)
    }
    const option = buildOption(key)
    instance.clear()
    if (option) instance.setOption(option)
  }
}

function handleResize() {
  charts.forEach(chart => chart.resize())
}

// ---------------- 交互 ----------------
const goInstances = () => router.push('/management/data-quality/tasks')

/** 跳转数据地图表详情质量 Tab，并高亮最短板维度 */
function goTableQuality(record: any) {
  if (!record?.name) return
  const dim = record.worstDim || worstDimOf(record)
  router.push(`/discovery/data-map/table/${encodeURIComponent(record.name)}?tab=quality&dim=${dim}`)
}

watch(onlineTables, () => nextTick(renderCharts), { deep: true })

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
.quality-dashboard {
  padding: 20px;

  code {
    padding: 0 4px;
    font-size: 12px;
    color: #1d2129;
    background: #f2f3f5;
    border-radius: 3px;
  }

  .dash-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 18px;
    padding-bottom: 14px;
    border-bottom: 1px solid #e5e6eb;

    .dash-title {
      margin: 0 0 6px;
      font-size: 20px;
      font-weight: 600;
      color: #1d2129;
    }

    .dash-sub {
      margin: 0;
      font-size: 13px;
      color: #86909c;
    }

    .dash-actions {
      display: flex;
      flex-shrink: 0;
      gap: 10px;
      align-items: center;
    }
  }

  .stat-row {
    margin-bottom: 16px;
  }

  .stat-card {
    border-radius: 8px;

    .stat-label {
      font-size: 13px;
      color: #86909c;
    }

    .stat-value {
      margin: 6px 0 4px;
      font-size: 26px;
      font-weight: 600;
      color: #1d2129;

      .stat-unit {
        font-size: 13px;
        font-weight: 400;
        color: #86909c;
      }
    }

    .stat-foot {
      font-size: 12px;
      color: #c9cdd4;
    }

    &.stat-avg .stat-value {
      color: #165dff;
    }

    &.stat-excellent .stat-value {
      color: #00b42a;
    }

    &.stat-govern .stat-value {
      color: #f53f3f;
    }
  }

  .chart-row {
    margin-bottom: 16px;
  }

  .chart-card {
    border-radius: 8px;

    .chart-box {
      height: 300px;
    }

    .chart-hint {
      font-size: 12px;
      color: #86909c;
    }
  }

  .weight-card {
    .weight-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;

      .weight-name {
        flex-shrink: 0;
        width: 56px;
        font-size: 13px;
        color: #4e5969;
      }

      .weight-bar {
        flex: 1;
      }

      .weight-val {
        width: 38px;
        font-size: 13px;
        font-weight: 600;
        color: #1d2129;
        text-align: right;
      }

      .weight-avg {
        width: 74px;
        font-size: 12px;
        color: #86909c;
        text-align: right;
      }
    }

    .weight-tip {
      margin-top: 14px;
      font-size: 12px;
    }
  }

  .low-card {
    margin-bottom: 16px;

    :deep(.arco-table-tr) {
      cursor: pointer;
    }

    .t-name {
      font-size: 13px;
      color: #1d2129;
    }

    .t-eng {
      font-family: Menlo, Consolas, monospace;
      font-size: 12px;
      color: #86909c;
    }

    .dim-mini {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;

      .mini-chip {
        padding: 1px 6px;
        font-size: 12px;
        color: #4e5969;
        background: #f2f3f5;
        border-radius: 3px;

        &.worst {
          color: #fff;
          background: #f53f3f;
        }
      }
    }
  }

  .source-alert {
    font-size: 12px;
    line-height: 1.9;
  }
}
</style>
