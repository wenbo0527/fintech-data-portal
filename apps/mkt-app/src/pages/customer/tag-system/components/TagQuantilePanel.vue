<template>
  <div class="quantile-panel">
    <!-- R47 非连续型 / R57-1 派生标签：不提供分位统计视图 -->
    <div v-if="meta && !meta.supported" class="quantile-unsupported">
      <icon-info-circle />
      <span>{{ meta.unsupportedReason }}</span>
    </div>

    <template v-else>
      <!-- 顶部：标签名 + 快照日期下拉 + 对比入口（E1） -->
      <div class="quantile-toolbar">
        <div class="toolbar-left">
          <span class="toolbar-tag">{{ meta?.name }}</span>
          <span class="toolbar-unit">单位：{{ meta?.unit }}</span>
          <span class="toolbar-threshold">分位变动阈值：{{ thresholdText }}</span>
        </div>
        <div class="toolbar-right">
          <template v-if="!compareMode">
            <span class="date-dot" :style="{ background: COLOR_BASE }" />
            <a-select v-model="baseDate" class="date-select" size="small" @change="handleBaseDateChange">
              <a-option v-for="date in meta?.snapshotDates || []" :key="date" :value="date">{{ date }}</a-option>
            </a-select>
            <a-button size="small" :disabled="!meta?.snapshotDates?.length" @click="enterCompare">对比</a-button>
          </template>
          <template v-else>
            <span class="date-dot" :style="{ background: COLOR_BASE }" />
            <a-select v-model="baseDate" class="date-select" size="small" @change="handleBaseDateChange">
              <a-option v-for="date in baseOptions" :key="date" :value="date">{{ date }}</a-option>
            </a-select>
            <span class="date-dot" :style="{ background: COLOR_COMPARE }" />
            <a-select v-model="compareDate" class="date-select" size="small" @change="handleCompareDateChange">
              <a-option v-for="date in compareOptions" :key="date" :value="date">{{ date }}</a-option>
            </a-select>
            <a-button size="small" @click="exitCompare">退出对比</a-button>
          </template>
        </div>
      </div>

      <!-- E31 标签口径变更 -->
      <a-alert v-if="caliberChanged" type="warning" class="quantile-alert">
        该区间内标签口径发生变更，对比结果仅供参考
      </a-alert>
      <!-- E26 样本量偏小 -->
      <a-alert v-if="smallSample" type="warning" class="quantile-alert">
        样本量偏小，分位结果仅供参考
      </a-alert>
      <!-- E28 取值高度集中 -->
      <a-alert v-if="concentrated" type="info" class="quantile-alert">
        取值高度集中，分布区间被压缩
      </a-alert>

      <!-- 加载中 -->
      <div v-if="loading" class="quantile-loading">
        <a-spin :loading="true" />
      </div>

      <!-- E30 加载失败，可重试 -->
      <div v-else-if="errorState === 'LOAD_FAILED'" class="quantile-empty">
        <icon-exclamation-circle class="quantile-empty__icon" />
        <div class="quantile-empty__title">加载失败，点击重试</div>
        <a-button size="small" type="primary" @click="reload">重试</a-button>
      </div>

      <!-- E29 所选日期无标签快照 -->
      <div v-else-if="errorState === 'NO_SNAPSHOT'" class="quantile-empty">
        <icon-info-circle class="quantile-empty__icon" />
        <div class="quantile-empty__title">该日期无标签快照数据</div>
        <div class="quantile-empty__desc">其他快照日期仍可选</div>
      </div>

      <!-- E27 全为空值 -->
      <div v-else-if="emptySnapshot" class="quantile-empty">
        <icon-file class="quantile-empty__icon" />
        <div class="quantile-empty__title">该标签当期无有效值</div>
        <div class="quantile-empty__desc">
          空值人数 {{ formatCount(currentNullCount) }} 人，占快照总人数 {{ currentNullRateText }}
          <span v-if="compareMode">（{{ emptySnapshot.date }}）</span>
        </div>
      </div>

      <!-- 正常视图 -->
      <template v-else>
        <!-- 箱线图（R52：图表与表格数值一致） -->
        <div class="quantile-chart">
          <QuantileBoxPlot :series="boxSeries" />
        </div>

        <!-- 单日期明细表 -->
        <table v-if="!compareMode" class="quantile-table">
          <thead>
            <tr>
              <th class="col-item">统计项</th>
              <th class="col-value">数值</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in singleRows" :key="row.label">
              <td class="col-item">{{ row.label }}</td>
              <td class="col-value">{{ row.value }}</td>
            </tr>
          </tbody>
        </table>

        <!-- 双日期对比表（R53 / R54） -->
        <table v-else class="quantile-table quantile-table--compare">
          <thead>
            <tr>
              <th class="col-item">统计项</th>
              <th class="col-value">
                <span class="date-dot date-dot--inline" :style="{ background: COLOR_BASE }" />{{ compareResult?.base.date }}
              </th>
              <th class="col-value">
                <span class="date-dot date-dot--inline" :style="{ background: COLOR_COMPARE }" />{{ compareResult?.compare.date }}
              </th>
              <th class="col-delta">变动量</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in compareRows"
              :key="row.label"
              :class="{ 'is-exceeded': row.exceeded }"
            >
              <td class="col-item">{{ row.label }}</td>
              <td class="col-value">{{ row.baseValue }}</td>
              <td class="col-value">{{ row.compareValue }}</td>
              <td class="col-delta" :class="row.deltaClass">{{ row.delta }}</td>
            </tr>
          </tbody>
        </table>
      </template>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import {
  IconExclamationCircle,
  IconFile,
  IconInfoCircle
} from '@arco-design/web-vue/es/icon'
import QuantileBoxPlot from './QuantileBoxPlot.vue'
import {
  fetchTagQuantileCompare,
  fetchTagQuantileSnapshot,
  getQuantileTagMeta,
  QUANTILE_ERROR_LOAD_FAILED,
  QUANTILE_ERROR_NO_SNAPSHOT
} from '@/api/tagQuantile'
import { QUANTILE_POINTS, SMALL_SAMPLE_THRESHOLD } from '@/mock/tag-snapshot'
import {
  formatCount,
  formatCountDelta,
  formatDelta,
  formatQuantileValue,
  formatRate
} from '@/utils/quantileFormat'

/** 基期主题色 */
const COLOR_BASE = '#165dff'
/** 对比期主题色 */
const COLOR_COMPARE = '#ff7d00'

const props = defineProps({
  /** 标签 ID */
  tagId: { type: String, default: '' }
})

/** 标签元信息 */
const meta = ref(null)
/** 当前单期快照结果 */
const snapshot = ref(null)
/** 当前对比结果 */
const compareResult = ref(null)
/** 是否处于对比模式 */
const compareMode = ref(false)
/** 基期快照日期 */
const baseDate = ref('')
/** 对比期快照日期 */
const compareDate = ref('')
/** 加载中 */
const loading = ref(false)
/** 错误态：'' | 'LOAD_FAILED' | 'NO_SNAPSHOT' */
const errorState = ref('')

/** 阈值文案（R57-3） */
const thresholdText = computed(() => {
  const pct = meta.value?.thresholdPct ?? 0.2
  return `${(pct * 100).toFixed(0)}%`
})

/** 基期可选日期（排除对比期已选日期） */
const baseOptions = computed(() =>
  (meta.value?.snapshotDates || []).filter(date => date !== compareDate.value)
)

/** 对比期可选日期（排除基期已选日期） */
const compareOptions = computed(() =>
  (meta.value?.snapshotDates || []).filter(date => date !== baseDate.value)
)

/** 当前视图中有效样本为 0 的快照（E27），对比态取两期中无有效值的一期 */
const emptySnapshot = computed(() => {
  if (compareMode.value) {
    if (!compareResult.value) return null
    if (compareResult.value.base.validCount === 0) return compareResult.value.base
    if (compareResult.value.compare.validCount === 0) return compareResult.value.compare
    return null
  }
  if (snapshot.value && snapshot.value.validCount === 0) return snapshot.value
  return null
})

/** 当前视图的空值人数 */
const currentNullCount = computed(() => {
  if (emptySnapshot.value) return emptySnapshot.value.nullCount
  if (compareMode.value) return compareResult.value?.base?.nullCount ?? 0
  return snapshot.value?.nullCount ?? 0
})

/** 当前视图的空值占比文案 */
const currentNullRateText = computed(() => {
  const target = emptySnapshot.value || (compareMode.value ? compareResult.value?.base : snapshot.value)
  const total = target?.totalCount ?? 0
  if (!total) return '—'
  return formatRate((target?.nullCount ?? 0) / total)
})

/** 标签口径是否在对比区间内发生变更（E31） */
const caliberChanged = computed(() => {
  if (!compareMode.value) return false
  return !!(compareResult.value?.base?.caliberChanged || compareResult.value?.compare?.caliberChanged)
})

/** 样本量是否偏小（E26）：仅在有有效样本时判定，全空值（E27）走空态提示 */
const smallSample = computed(() => {
  if (compareMode.value) {
    if (!compareResult.value) return false
    const base = compareResult.value.base?.validCount ?? 0
    const compare = compareResult.value.compare?.validCount ?? 0
    const minCount = Math.min(base, compare)
    return minCount > 0 && minCount < SMALL_SAMPLE_THRESHOLD
  }
  if (!snapshot.value) return false
  const validCount = snapshot.value.validCount ?? 0
  return validCount > 0 && validCount < SMALL_SAMPLE_THRESHOLD
})

/** 取值是否高度集中（E28） */
const concentrated = computed(() => {
  const target = compareMode.value ? compareResult.value?.base : snapshot.value
  if (!target) return false
  const { p25, p75 } = target.quantiles
  if (typeof p25 !== 'number' || typeof p75 !== 'number') return false
  const range = Math.abs(target.max - target.min)
  if (!range) return true
  return (p75 - p25) / range < 0.02
})

/** 箱线图数据 */
const boxSeries = computed(() => {
  if (compareMode.value) {
    if (!compareResult.value) return []
    return [
      {
        key: 'base',
        label: compareResult.value.base.date,
        color: COLOR_BASE,
        quantiles: compareResult.value.base.quantiles,
        min: compareResult.value.base.min,
        max: compareResult.value.base.max,
        unit: compareResult.value.base.unit
      },
      {
        key: 'compare',
        label: compareResult.value.compare.date,
        color: COLOR_COMPARE,
        quantiles: compareResult.value.compare.quantiles,
        min: compareResult.value.compare.min,
        max: compareResult.value.compare.max,
        unit: compareResult.value.compare.unit
      }
    ]
  }
  if (!snapshot.value) return []
  return [
    {
      key: 'single',
      label: snapshot.value.date,
      color: COLOR_BASE,
      quantiles: snapshot.value.quantiles,
      min: snapshot.value.min,
      max: snapshot.value.max,
      unit: snapshot.value.unit
    }
  ]
})

/** 单日期明细表行（R49 / R52） */
const singleRows = computed(() => {
  const s = snapshot.value
  if (!s) return []
  const u = s.unit
  const nullRate = s.totalCount ? s.nullCount / s.totalCount : 0
  return [
    ...QUANTILE_POINTS.map(point => ({
      label: point.label,
      value: formatQuantileValue(s.quantiles[point.key], u)
    })),
    { label: '均值', value: formatQuantileValue(s.mean, u) },
    { label: '有效样本量', value: `${formatCount(s.validCount)} 人` },
    { label: '空值人数及占比', value: `${formatCount(s.nullCount)} 人 / ${formatRate(nullRate)}` },
    { label: '最大值', value: formatQuantileValue(s.max, u) },
    { label: '最小值', value: formatQuantileValue(s.min, u) },
    { label: 'P99', value: formatQuantileValue(s.p99, u) }
  ]
})

/** 双日期对比表行（R53 / R54） */
const compareRows = computed(() => {
  const result = compareResult.value
  if (!result) return []
  const base = result.base
  const compare = result.compare
  const u = base.unit
  const exceeded = result.exceededKeys || []
  const baseNullRate = base.totalCount ? base.nullCount / base.totalCount : 0
  const compareNullRate = compare.totalCount ? compare.nullCount / compare.totalCount : 0

  /**
   * 构造一行对比数据
   * @param {string} label 统计项名称
   * @param {number} baseValue 基期数值
   * @param {number} compareValue 对比期数值
   * @returns 对比行数据
   */
  const buildRow = (label, baseValue, compareValue) => {
    const delta = compareValue - baseValue
    return {
      label,
      baseValue: formatQuantileValue(baseValue, u),
      compareValue: formatQuantileValue(compareValue, u),
      delta: formatDelta(delta, u),
      deltaClass: delta > 0 ? 'delta-up' : delta < 0 ? 'delta-down' : '',
      exceeded: false
    }
  }

  const rows = QUANTILE_POINTS.map(point => {
    const baseValue = base.quantiles[point.key]
    const compareValue = compare.quantiles[point.key]
    const row = buildRow(point.label, baseValue, compareValue)
    // R54 / R57-3：超阈值档位高亮，仅影响高亮不影响数值
    row.exceeded = exceeded.includes(point.key)
    return row
  })

  rows.push(buildRow('均值', base.mean, compare.mean))
  rows.push({
    label: '有效样本量',
    baseValue: `${formatCount(base.validCount)} 人`,
    compareValue: `${formatCount(compare.validCount)} 人`,
    delta: formatCountDelta(compare.validCount - base.validCount),
    deltaClass:
      compare.validCount > base.validCount ? 'delta-up' : compare.validCount < base.validCount ? 'delta-down' : '',
    exceeded: false
  })
  rows.push({
    label: '空值人数及占比',
    baseValue: `${formatCount(base.nullCount)} 人 / ${formatRate(baseNullRate)}`,
    compareValue: `${formatCount(compare.nullCount)} 人 / ${formatRate(compareNullRate)}`,
    delta: formatCountDelta(compare.nullCount - base.nullCount),
    deltaClass:
      compare.nullCount > base.nullCount ? 'delta-up' : compare.nullCount < base.nullCount ? 'delta-down' : '',
    exceeded: false
  })
  rows.push(buildRow('最大值', base.max, compare.max))
  rows.push(buildRow('最小值', base.min, compare.min))
  rows.push(buildRow('P99', base.p99, compare.p99))
  return rows
})

/**
 * 加载单期快照分位统计
 * @param {string} date 快照日期
 * @returns Promise
 */
async function loadSingle(date) {
  loading.value = true
  errorState.value = ''
  try {
    snapshot.value = await fetchTagQuantileSnapshot(props.tagId, date)
  } catch (error) {
    snapshot.value = null
    errorState.value = error?.code || QUANTILE_ERROR_LOAD_FAILED
  } finally {
    loading.value = false
  }
}

/**
 * 加载双日期对比分位统计
 * @param {string} base 基期日期
 * @param {string} compare 对比期日期
 * @returns Promise
 */
async function loadCompare(base, compare) {
  loading.value = true
  errorState.value = ''
  try {
    compareResult.value = await fetchTagQuantileCompare(props.tagId, base, compare)
  } catch (error) {
    compareResult.value = null
    errorState.value = error?.code || QUANTILE_ERROR_LOAD_FAILED
  } finally {
    loading.value = false
  }
}

/**
 * 加载标签元信息并初始化默认日期
 * @returns Promise
 */
async function loadMeta() {
  meta.value = await getQuantileTagMeta(props.tagId)
  const dates = meta.value?.snapshotDates || []
  if (!dates.length) return
  baseDate.value = dates[dates.length - 1]
  compareDate.value = dates.length > 1 ? dates[dates.length - 2] : dates[0]
  await loadSingle(baseDate.value)
}

/**
 * 重试加载（E30）
 * @returns Promise
 */
function reload() {
  if (compareMode.value) return loadCompare(baseDate.value, compareDate.value)
  return loadSingle(baseDate.value)
}

/**
 * 进入对比模式（E1）
 * @returns Promise
 */
function enterCompare() {
  const dates = meta.value?.snapshotDates || []
  if (dates.length < 2) return
  compareMode.value = true
  if (!dates.includes(compareDate.value) || compareDate.value === baseDate.value) {
    compareDate.value = dates.filter(date => date !== baseDate.value).pop()
  }
  return loadCompare(baseDate.value, compareDate.value)
}

/**
 * 退出对比模式，回到单日期态
 * @returns Promise
 */
function exitCompare() {
  compareMode.value = false
  compareResult.value = null
  return loadSingle(baseDate.value)
}

/**
 * 基期日期变更
 * @returns Promise
 */
function handleBaseDateChange() {
  if (compareMode.value) return loadCompare(baseDate.value, compareDate.value)
  return loadSingle(baseDate.value)
}

/**
 * 对比期日期变更
 * @returns Promise
 */
function handleCompareDateChange() {
  return loadCompare(baseDate.value, compareDate.value)
}

watch(
  () => props.tagId,
  () => {
    compareMode.value = false
    snapshot.value = null
    compareResult.value = null
    loadMeta()
  }
)

onMounted(loadMeta)
</script>

<style scoped>
.quantile-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 4px 0 8px;
}
.quantile-unsupported {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px;
  border-radius: 8px;
  background: var(--subapp-bg-secondary, #f7f8fa);
  color: var(--subapp-text-tertiary, #86909c);
  font-size: 14px;
}
.quantile-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}
.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
  color: var(--subapp-text-tertiary, #86909c);
}
.toolbar-tag {
  font-size: 15px;
  font-weight: 600;
  color: var(--subapp-text-primary, #1d2129);
}
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.date-select {
  width: 140px;
}
.date-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
  flex: none;
}
.date-dot--inline {
  margin-right: 6px;
  vertical-align: middle;
}
.quantile-alert {
  margin-bottom: 4px;
}
.quantile-loading {
  padding: 40px 0;
  text-align: center;
}
.quantile-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 48px 16px;
  border-radius: 8px;
  background: var(--subapp-bg-secondary, #f7f8fa);
}
.quantile-empty__icon {
  font-size: 40px;
  color: #c9cdd4;
}
.quantile-empty__title {
  font-size: 15px;
  color: var(--subapp-text-secondary, #4e5969);
}
.quantile-empty__desc {
  font-size: 13px;
  color: var(--subapp-text-tertiary, #86909c);
}
.quantile-chart {
  padding: 8px 4px 0;
  border: 1px solid var(--subapp-border, #e5e6eb);
  border-radius: 8px;
  background: #fff;
}
.quantile-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  border: 1px solid var(--subapp-border, #e5e6eb);
  border-radius: 8px;
  overflow: hidden;
}
.quantile-table th,
.quantile-table td {
  padding: 8px 12px;
  border-bottom: 1px solid var(--subapp-border, #e5e6eb);
  text-align: left;
}
.quantile-table th {
  background: #f7f8fa;
  color: var(--subapp-text-secondary, #4e5969);
  font-weight: 500;
}
.quantile-table tbody tr:last-child td {
  border-bottom: none;
}
.col-item {
  width: 180px;
  color: var(--subapp-text-secondary, #4e5969);
}
.col-value {
  width: 30%;
}
.col-delta {
  width: 24%;
  text-align: right !important;
}
.quantile-table--compare .col-value {
  width: 22%;
}
.delta-up {
  color: #f53f3f;
}
.delta-down {
  color: #00b42a;
}
.is-exceeded {
  background: #fff7e8;
}
</style>
