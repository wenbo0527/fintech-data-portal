<template>
  <div class="box-plot">
    <svg
      class="box-plot__svg"
      :viewBox="`0 0 ${WIDTH} ${totalHeight}`"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      :aria-label="ariaLabel"
    >
      <!-- 对比态：同分位位置虚线对齐（截图 11） -->
      <g v-if="guides.length">
        <line
          v-for="(guide, gi) in guides"
          :key="`guide-${gi}`"
          class="box-plot__guide"
          :x1="guide.x"
          :y1="guide.y1"
          :x2="guide.x"
          :y2="guide.y2"
        />
      </g>

      <g v-for="row in rows" :key="row.key">
        <!-- 全距（最小值 → 最大值） -->
        <line
          class="box-plot__range"
          :x1="row.minX"
          :y1="row.axisY"
          :x2="row.maxX"
          :y2="row.axisY"
          :stroke="row.color"
        />
        <!-- 须线 P10 → P90 -->
        <line
          class="box-plot__whisker"
          :x1="row.p10X"
          :y1="row.axisY"
          :x2="row.p90X"
          :y2="row.axisY"
          :stroke="row.color"
        />
        <line
          class="box-plot__cap"
          :x1="row.p10X"
          :y1="row.axisY - 11"
          :x2="row.p10X"
          :y2="row.axisY + 11"
          :stroke="row.color"
        />
        <line
          class="box-plot__cap"
          :x1="row.p90X"
          :y1="row.axisY - 11"
          :x2="row.p90X"
          :y2="row.axisY + 11"
          :stroke="row.color"
        />
        <!-- 箱体 P25 → P75 -->
        <rect
          class="box-plot__box"
          :x="row.p25X"
          :y="row.boxTop"
          :width="row.boxWidth"
          :height="row.boxHeight"
          :stroke="row.color"
        />
        <!-- 中位数 P50 -->
        <line
          class="box-plot__median"
          :x1="row.p50X"
          :y1="row.boxTop"
          :x2="row.p50X"
          :y2="row.boxTop + row.boxHeight"
        />

        <!-- 极值标注（须线外） -->
        <text class="box-plot__extreme" :x="row.minX" :y="row.axisY - 26" :text-anchor="row.minAnchor">
          最小 {{ row.minText }}
        </text>
        <text class="box-plot__extreme" :x="row.maxX" :y="row.axisY - 26" :text-anchor="row.maxAnchor">
          最大 {{ row.maxText }}
        </text>

        <!-- 箱体下方五个分位值 -->
        <g v-for="point in row.labels" :key="point.key">
          <line
            class="box-plot__tick"
            :x1="point.x"
            :y1="row.boxTop + row.boxHeight"
            :x2="point.x"
            :y2="point.tickBottom"
          />
          <text class="box-plot__quantile-label" :x="point.x" :y="point.textY" text-anchor="middle">
            {{ point.label }} {{ point.text }}
          </text>
        </g>

        <!-- 行标题（对比态日期标识） -->
        <text class="box-plot__row-label" :x="8" :y="row.axisY - 26">{{ row.label }}</text>
      </g>
    </svg>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { QUANTILE_POINTS } from '@/mock/tag-snapshot'
import { formatQuantileValue } from '@/utils/quantileFormat'

/**
 * 箱线图单期数据
 * @typedef {Object} BoxSeries
 * @property {string} key 唯一标识
 * @property {string} label 行标题（对比态为快照日期）
 * @property {string} color 主题色
 * @property {Record<string, number>} quantiles 五档分位值
 * @property {number} min 最小值
 * @property {number} max 最大值
 * @property {string} unit 单位，'—' 表示单位元数据缺失
 */

const props = defineProps({
  /** 各期数据：单期 1 条，对比态 2 条 */
  series: { type: Array, default: () => [] },
  /** 图标颜色 */
  color: { type: String, default: '#165dff' }
})

/** SVG 视图宽度 */
const WIDTH = 1000
/** 单行高度 */
const ROW_HEIGHT = 150
/** 绘图区左右留白 */
const PADDING_X = 70

/**
 * 计算某一行的几何信息
 * @param {BoxSeries} item 单期数据
 * @param {number} index 行序号
 * @param {number} scaleMin 值域下限
 * @param {number} scaleSpan 值域跨度
 * @returns 该行的绘制几何
 */
function buildRow(item, index, scaleMin, scaleSpan) {
  const axisY = index * ROW_HEIGHT + 62
  const boxHeight = 34
  const boxTop = axisY - boxHeight / 2
  const toX = (value) => PADDING_X + ((value - scaleMin) / scaleSpan) * (WIDTH - PADDING_X * 2)
  const minX = toX(item.min)
  const maxX = toX(item.max)
  const labels = QUANTILE_POINTS.map((point, pointIndex) => {
    const value = item.quantiles[point.key]
    const x = toX(value)
    // 交错排布，避免相邻分位标签重叠
    const stagger = pointIndex % 2 === 0
    return {
      key: point.key,
      label: point.label,
      x,
      text: formatQuantileValue(value, item.unit),
      tickBottom: boxTop + boxHeight + (stagger ? 14 : 28),
      textY: boxTop + boxHeight + (stagger ? 30 : 46)
    }
  })
  return {
    key: item.key,
    label: item.label,
    color: item.color || props.color,
    axisY,
    boxTop,
    boxHeight,
    minX,
    maxX,
    p10X: toX(item.quantiles.p10),
    p25X: toX(item.quantiles.p25),
    p50X: toX(item.quantiles.p50),
    p75X: toX(item.quantiles.p75),
    p90X: toX(item.quantiles.p90),
    boxWidth: Math.max(1, toX(item.quantiles.p75) - toX(item.quantiles.p25)),
    minText: formatQuantileValue(item.min, item.unit),
    maxText: formatQuantileValue(item.max, item.unit),
    minAnchor: minX < PADDING_X + 60 ? 'start' : 'middle',
    maxAnchor: maxX > WIDTH - PADDING_X - 60 ? 'end' : 'middle',
    labels
  }
}

/** 值域（两期共用同一刻度，保证同分位位置可比） */
const domain = computed(() => {
  const values = props.series.flatMap(item => [item.min, item.max, ...QUANTILE_POINTS.map(p => item.quantiles[p.key])])
  const valid = values.filter(v => typeof v === 'number' && !Number.isNaN(v))
  if (!valid.length) return { min: 0, span: 1 }
  const min = Math.min(...valid)
  const max = Math.max(...valid)
  const span = max - min
  // 取值完全集中（E28）时给一个最小跨度，避免除零
  return { min: min - (span || Math.abs(min) || 1) * 0.08, span: span || Math.abs(min) || 1 }
})

/** 各行几何 */
const rows = computed(() =>
  props.series.map((item, index) => buildRow(item, index, domain.value.min, domain.value.span))
)

/** 对比态虚线参考：基期各分位位置 */
const guides = computed(() => {
  if (props.series.length < 2) return []
  const base = props.series[0]
  const scaleMin = domain.value.min
  const scaleSpan = domain.value.span
  const toX = (value) => PADDING_X + ((value - scaleMin) / scaleSpan) * (WIDTH - PADDING_X * 2)
  return QUANTILE_POINTS.map(point => ({
    x: toX(base.quantiles[point.key]),
    y1: 12,
    y2: props.series.length * ROW_HEIGHT - 8
  }))
})

/** SVG 总高度 */
const totalHeight = computed(() => props.series.length * ROW_HEIGHT + 30)

/** 无障碍描述 */
const ariaLabel = computed(() =>
  props.series.map(item => `${item.label} 分位分布`).join('；') || '分位分布图'
)
</script>

<style scoped>
.box-plot {
  width: 100%;
}
.box-plot__svg {
  width: 100%;
  height: auto;
  display: block;
}
.box-plot__range {
  stroke-width: 1;
  opacity: 0.35;
}
.box-plot__whisker {
  stroke-width: 2;
}
.box-plot__cap {
  stroke-width: 2;
}
.box-plot__box {
  fill: rgba(22, 93, 255, 0.14);
  stroke-width: 1.5;
}
.box-plot__median {
  stroke: #165dff;
  stroke-width: 2.5;
}
.box-plot__guide {
  stroke: #c9cdd4;
  stroke-width: 1;
  stroke-dasharray: 4 4;
}
.box-plot__tick {
  stroke: #c9cdd4;
  stroke-width: 1;
}
.box-plot__quantile-label {
  font-size: 11px;
  fill: #4e5969;
}
.box-plot__extreme {
  font-size: 11px;
  fill: #86909c;
}
.box-plot__row-label {
  font-size: 12px;
  fill: #1d2129;
  font-weight: 500;
}
</style>
