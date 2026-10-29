<template>
  <div v-if="effect" class="label-effect">
    <!-- 筛选条：观察月多选（渠道已由父组件统一管理） -->
    <div class="le-toolbar">
      <div class="le-field">
        <span class="le-label">观察月</span>
        <a-select
          :model-value="effect.selectedMonths"
          :options="effect.months"
          size="small"
          class="le-select-months"
          multiple
          :max-tag-count="2"
          :placeholder="`最多选 ${effect.monthLimit} 个月`"
          @change="onMonthsChange"
        />
      </div>
      <span class="le-scope">对照 {{ effect.baselineLabel }}</span>
    </div>

    <!-- 结论一句：基于最新选中月，由 store 拼接 -->
    <div class="le-summary">{{ effect.summaryText }}</div>

    <!-- 渠道已接入但零调用：不造假 0 值行 -->
    <a-empty v-if="effect.empty" :image="false" :description="effect.emptyText" />

    <!-- 标签效果表：行 = Y 标签，列 = 每个选中月（上 lift / 下 指标值 ÷ 对照值） -->
    <div v-else class="le-scroll">
      <table class="le-table">
        <thead>
          <tr>
            <th class="col-name">Y 标签类型</th>
            <th v-for="m in effect.selectedMonths" :key="m" class="col-month">
              {{ m }}<span v-if="m === effect.month" class="th-now">本期</span>
            </th>
            <th class="col-samples">有效样本</th>
            <th class="col-num">lift 均值</th>
            <th class="col-mom">环比上月</th>
            <th class="col-judge">判断</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in effect.rows" :key="row.yKey">
            <td class="col-name">{{ row.yLabel }}</td>
            <td v-for="cell in row.cells" :key="cell.month" class="col-month">
              <div class="m-lift" :class="judgeClass(cell.judge)">{{ cell.liftText }}</div>
              <div class="m-sub">{{ cell.valueText }} / {{ cell.baselineText }}</div>
            </td>
            <td class="col-samples muted">{{ row.validSamples.toLocaleString('zh-Hans-CN') }}</td>
            <td class="col-num muted">{{ row.liftMeanText }}</td>
            <td class="col-mom" :class="momClass(row.momDir)">
              <icon-arrow-up v-if="row.momDir === 'up'" />
              <icon-arrow-down v-else-if="row.momDir === 'down'" />
              {{ row.momText }}
            </td>
            <td class="col-judge">
              <span :class="judgeClass(row.judge)">{{ row.judge }}</span>
              <span class="le-diff">{{ row.diffText }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="le-note">
      口径：每月单元格上为 lift、下为「指标值 / 对照值」，对照值取「{{ effect.baselineLabel }}」同标签指标均值；
      lift = 对照值 ÷ 指标值（越低越好的标签；越高越好的标签反向取指标值 ÷ 对照值），1.00 为基准；
      lift 均值 / 环比 / 判断取最新选中月，环比 = 最新月 lift − 上一自然月 lift；lift 均值取对照样本同标签
      lift 的算术平均，仅作参照。选渠道时指标值仍取该变量整体值，对照换成该渠道同期均值，用于衡量变量相对
      该渠道整体水平的区分能力。
    </div>
  </div>
</template>

<script setup>
/**
 * 特征详情页 · 标签效果
 *
 * 数据全部来自 effectStore.labelEffect：
 * 组件只负责渲染渠道（单选）/ 观察月（多选）筛选条与「标签 × 月份」表格，数值、文案、判断均由 store 下发。
 * 渠道与观察月由父组件持有（写入 URL ?platform= / ?om= 可深链），本组件只抛 change 事件。
 * 一期刻意不用图表（底层数据波动大），统一用数据表格表达。
 */
import { computed } from 'vue'
import { effectStore } from '@/modules/variable-hub/mock/effect-evaluation/effect-store'

const props = defineProps({
  /** 特征 ID：台账 ID 或效果域合成 ID（VAR-EFF-xxxx） */
  variableId: { type: String, required: true },
  /** 渠道（空 = 全部渠道），与 ?platform= 同源 */
  platform: { type: String, default: '' },
  /** 观察月多选（空数组 = 最新月），与 ?om= 同源 */
  months: { type: Array, default: () => [] }
})

const emit = defineEmits(['change'])

const effect = computed(() =>
  effectStore.labelEffect(String(props.variableId), {
    platform: props.platform || undefined,
    months: props.months.map(String)
  })
)

/**
 * 切换观察月（多选）：超过上限时只保留最近几个月；
 * 只选最新月或清空时回落到默认（最新月），不写 URL 参数
 * @param {string[]} values 选中的月份（选择顺序）
 */
function onMonthsChange(values) {
  const list = Array.isArray(values) ? values.map(String) : []
  const limit = effect.value?.monthLimit || list.length || 1
  const kept = list.slice(-limit)
  const latest = effect.value?.months?.[0]?.value
  if (!kept.length || (kept.length === 1 && kept[0] === latest)) {
    emit('change', { months: [] })
    return
  }
  emit('change', { months: kept })
}

/**
 * 判断文案 → class（颜色仅辅助，主判断仍是文字）
 * @param {string} judge 好 / 差 / 持平
 */
function judgeClass(judge) {
  if (judge === '好') return 'good'
  if (judge === '差') return 'bad'
  return 'flat'
}

/**
 * 环比方向 → class：lift 越大越好，因此上升为好、下降为差
 * @param {string} dir up / down / flat / none
 */
function momClass(dir) {
  if (dir === 'up') return 'good'
  if (dir === 'down') return 'bad'
  return 'flat'
}
</script>

<style scoped>
.label-effect {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.le-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 16px;
}
.le-field {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 0 0 auto;
}
.le-label {
  font-size: 12px;
  color: var(--color-text-3);
  white-space: nowrap;
}
.le-select-months {
  width: 300px;
}
.le-scope {
  margin-left: auto;
  font-size: 12px;
  color: var(--color-text-3);
  white-space: nowrap;
}
.le-summary {
  font-size: 12px;
  color: var(--color-text-2);
  background: var(--color-fill-1);
  border-radius: 4px;
  padding: 8px 10px;
}
.le-scroll {
  overflow-x: auto;
}
.le-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  background: var(--color-bg-2);
}
.le-table th,
.le-table td {
  border: 1px solid var(--color-neutral-3);
  padding: 6px 10px;
  text-align: left;
  white-space: nowrap;
}
.le-table th {
  font-weight: 500;
  color: var(--color-text-3);
  background: var(--color-fill-2);
}
.th-now {
  margin-left: 4px;
  font-size: 10px;
  color: rgb(var(--arcoblue-6));
}
.col-name {
  width: 180px;
  color: var(--color-text-1);
}
.col-month {
  min-width: 128px;
  vertical-align: top;
}
.col-samples {
  width: 100px;
  font-variant-numeric: tabular-nums;
}
.m-lift {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.m-sub {
  font-size: 11px;
  color: var(--color-text-3);
  font-variant-numeric: tabular-nums;
}
.col-num {
  width: 100px;
  font-variant-numeric: tabular-nums;
}
.col-mom {
  width: 96px;
  font-variant-numeric: tabular-nums;
}
.col-mom :deep(.arco-icon) {
  font-size: 12px;
  margin-right: 2px;
}
.col-judge {
  width: 200px;
}
.muted {
  color: var(--color-text-3);
}
.le-diff {
  font-size: 11px;
  color: var(--color-text-3);
  margin-left: 6px;
}
.good {
  color: rgb(var(--green-6));
}
.bad {
  color: rgb(var(--red-6));
}
.flat {
  color: var(--color-text-3);
}
.le-note {
  font-size: 11px;
  line-height: 1.6;
  color: var(--color-text-3);
}
</style>
