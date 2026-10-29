<template>
  <div class="overall-effect">
    <!-- 头部：平台标识 + 样本覆盖 + 观察月选择（平台跟随上方筛选，不在这里改） -->
    <div class="oe-head">
      <span class="oe-title">整体标签效果</span>
      <a-tag size="small" class="oe-tag">{{ data.platformText }}</a-tag>
      <span class="oe-follow">跟随上方平台筛选</span>
      <span class="oe-meta">{{ data.month }} · {{ data.sampleCount }} 个变量 / 调用 {{ data.callsText }}</span>
      <div class="oe-month">
        <span class="oe-label">观察月</span>
        <a-select
          :model-value="data.month"
          :options="data.months"
          size="small"
          class="oe-select"
          @change="onChangeMonth"
        />
      </div>
    </div>

    <!-- 结论一句：最高 / 最低 lift 与优于对照的标签数，由 store 拼接 -->
    <div class="oe-summary">{{ data.summaryText }}</div>

    <a-empty v-if="data.empty" :image="false" description="当前平台与筛选下没有可用变量" />

    <table v-else class="oe-table">
      <thead>
        <tr>
          <th>Y 标签类型</th>
          <th>整体指标值</th>
          <th>{{ data.baselineLabel }}</th>
          <th>lift</th>
          <th>lift 均值</th>
          <th>环比上月</th>
          <th>判断</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in data.rows" :key="row.yKey">
          <td class="col-name">{{ row.yLabel }}</td>
          <td class="col-num">{{ row.valueText }}</td>
          <td class="col-num muted">{{ row.baselineText }}</td>
          <td class="col-num strong" :class="judgeClass(row.judge)">{{ row.liftText }}</td>
          <td class="col-num muted">{{ row.liftMeanText }}</td>
          <td class="col-mom" :class="momClass(row.momDir)">
            <icon-arrow-up v-if="row.momDir === 'up'" />
            <icon-arrow-down v-else-if="row.momDir === 'down'" />
            {{ row.momText }}
          </td>
          <td>
            <span :class="judgeClass(row.judge)">{{ row.judge }}</span>
            <span class="oe-diff">{{ row.diffText }}</span>
          </td>
        </tr>
      </tbody>
    </table>

    <div class="oe-note">
      口径：整体指标值 = 当前平台 / 筛选下变量的指标值按调用量加权平均；lift = 对照值 ÷ 整体值（越低越好的指标，越高越好反向），1.00 为基准，大于 1.00 优于对照；全部平台时对照取全库近 4 个月均值（当月与近期水平比），选定平台时对照取全库同期均值（平台与全库比）；环比 = 本月 lift − 上月 lift；lift 均值取全库同标签 lift 的算术平均，仅作参照。
    </div>
  </div>
</template>

<script setup>
/**
 * 变量效果列表 · 整体标签效果（按平台 + 单月快照）
 *
 * 数据全部来自 effectStore.overallLabelEffect：组件只渲染 6 行结果，
 * 加权均值、lift、环比、判断与文案均由 store 计算。
 * 平台由列表筛选条控制（同一个概念），组件只负责切换观察月。
 */
const props = defineProps({
  /** effectStore.overallLabelEffect() 返回值 */
  data: { type: Object, required: true }
})

const emit = defineEmits(['change-month'])

/**
 * 切换观察月：交给列表组件写 URL（om 参数）
 * @param {string} month YYYY-MM
 */
function onChangeMonth(month) {
  if (!month || month === props.data.month) return
  emit('change-month', month)
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
 * 环比方向 → class（升绿降红，持平灰）
 * @param {string} dir up / down / flat / none
 */
function momClass(dir) {
  if (dir === 'up') return 'good'
  if (dir === 'down') return 'bad'
  return 'flat'
}
</script>

<style scoped>
.overall-effect {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  margin-bottom: 10px;
  background: var(--color-bg-2);
  border: 1px solid var(--color-neutral-3);
  border-radius: 6px;
  /* 窄屏下 7 列可能超出，容器内横向滚动，不挤压列表布局 */
  overflow-x: auto;
}
.oe-head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.oe-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-1);
}
.oe-tag {
  font-weight: 500;
}
.oe-follow {
  font-size: 11px;
  color: var(--color-text-3);
}
.oe-meta {
  font-size: 12px;
  color: var(--color-text-3);
}
.oe-month {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
}
.oe-label {
  font-size: 12px;
  color: var(--color-text-3);
}
/* Arco Select 根节点不继承 scoped 属性，宽度必须穿透设置 */
.oe-month :deep(.oe-select) {
  width: 116px;
}
.oe-summary {
  font-size: 12px;
  color: var(--color-text-2);
  background: var(--color-fill-1);
  border-radius: 4px;
  padding: 8px 10px;
}
.oe-table {
  width: 100%;
  min-width: 780px;
  border-collapse: collapse;
  font-size: 12px;
  background: var(--color-bg-2);
}
.oe-table th,
.oe-table td {
  border: 1px solid var(--color-neutral-3);
  padding: 6px 10px;
  text-align: left;
}
.oe-table th {
  font-weight: 500;
  color: var(--color-text-3);
  background: var(--color-fill-2);
}
.col-name {
  width: 180px;
  color: var(--color-text-1);
}
.col-num {
  width: 125px;
  font-variant-numeric: tabular-nums;
}
.col-mom {
  width: 100px;
  font-variant-numeric: tabular-nums;
}
.strong {
  font-weight: 600;
}
.muted {
  color: var(--color-text-3);
}
.oe-diff {
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
.oe-note {
  font-size: 11px;
  line-height: 1.6;
  color: var(--color-text-3);
}
</style>
