<template>
  <div class="expanded-effect">
    <!-- 使用深度：可切换渠道（详情页），量级与占比跟着渠道走 -->
    <div class="block">
      <div class="block-title">
        使用深度
        <span v-if="data.months && data.months.length" class="month-range">
          （观察月：{{ data.months.length > 1 ? `${data.months[0]} ~ ${data.months[data.months.length - 1]}` : data.months[0] }}）
        </span>
      </div>

      <!-- 渠道切换：选项来自 store 下发的 platformUsage，组件不自行拼渠道名 -->
      <div v-if="platformSwitch && data.platformUsage.length" class="platform-switch">
        <span class="switch-label">使用渠道</span>
        <a-radio-group
          :model-value="data.selectedPlatform || 'all'"
          type="button"
          size="mini"
          @change="onSwitch"
        >
          <a-radio value="all">全部渠道</a-radio>
          <a-radio v-for="row in data.platformUsage" :key="row.platform" :value="row.platform">{{ row.platform }}</a-radio>
        </a-radio-group>
        <span class="switch-hint">当前范围：{{ data.scope.platform }}</span>
      </div>

      <div class="usage-grid">
        <div class="usage-item">
          <span class="usage-label">月调用量</span>
          <span class="usage-value">{{ data.scope.callsText }}</span>
        </div>
        <div class="usage-item">
          <span class="usage-label">授信环节</span>
          <span class="usage-value">
            {{ data.scope.grantText }}
            <em class="ratio">占比 {{ data.scope.grantRatioText }}</em>
          </span>
        </div>
        <div class="usage-item">
          <span class="usage-label">支用环节</span>
          <span class="usage-value">
            {{ data.scope.loanText }}
            <em class="ratio">占比 {{ data.scope.loanRatioText }}</em>
          </span>
        </div>
        <div class="usage-item">
          <span class="usage-label">贷中环节</span>
          <span class="usage-value">{{ data.scope.midloanText }}</span>
        </div>
        <div class="usage-item">
          <span class="usage-label">在网策略渠道</span>
          <span class="usage-value">{{ data.usage.platformCount }} 个</span>
        </div>
        <div class="usage-item">
          <span class="usage-label">缺失率</span>
          <span class="usage-value">
            {{ data.usage.missingRateText }}
            <span class="judge" :class="`judge-${judgeClass(data.usage.missingJudge)}`">
              {{ data.usage.missingJudge }}
            </span>
          </span>
        </div>
        <div class="usage-item">
          <span class="usage-label">最近数据更新</span>
          <span class="usage-value">{{ data.usage.lastUpdateAt }}</span>
        </div>
      </div>
      <div v-if="data.usage.scenes.length" class="scene-row">
        <span class="scene-tip">使用场景：</span>
        <a-tag v-for="scene in data.usage.scenes" :key="scene.name" size="small" class="scene-tag">
          {{ scene.name }} · {{ scene.calls }} 万次
        </a-tag>
      </div>

      <!-- 分渠道使用：授信 / 支用量级与占比，一期只用数据表格，不上图表 -->
      <div v-if="data.platformUsage" class="platform-block">
        <div class="block-sub-title">分渠道使用（万次，占比分母为该渠道月调用量）</div>
        <table class="metric-table">
          <thead>
            <tr>
              <th>渠道</th>
              <th>月调用量</th>
              <th>授信量级</th>
              <th>授信占比</th>
              <th>支用量级</th>
              <th>支用占比</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in data.platformUsage"
              :key="row.platform"
              :class="{ 'selected-row': row.platform === data.selectedPlatform }"
            >
              <td class="col-name">{{ row.platform }}</td>
              <td class="col-num">{{ row.callsText }}</td>
              <td class="col-num">{{ row.grantText }}</td>
              <td class="col-num">{{ row.grantRatioText }}</td>
              <td class="col-num">{{ row.loanText }}</td>
              <td class="col-num">{{ row.loanRatioText }}</td>
            </tr>
            <!-- 合计行由 store 下发，组件不做相加 -->
            <tr class="total-row">
              <td class="col-name">{{ data.platformUsageTotal.platform }}</td>
              <td class="col-num">{{ data.platformUsageTotal.callsText }}</td>
              <td class="col-num">{{ data.platformUsageTotal.grantText }}</td>
              <td class="col-num">{{ data.platformUsageTotal.grantRatioText }}</td>
              <td class="col-num">{{ data.platformUsageTotal.loanText }}</td>
              <td class="col-num">{{ data.platformUsageTotal.loanRatioText }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 口径提示：文案由 effectStore.expandRow() 生成，前端不做条件判断 -->
    <div class="block">
      <div class="block-title">口径与提示</div>
      <ul class="note-list">
        <li v-for="(note, idx) in data.notes" :key="idx">{{ note }}</li>
      </ul>
    </div>
  </div>
</template>

<script setup>
/**
 * 推荐列表行内展开内容
 * 数据全部来自父组件传入的 EffectExpanded（effectStore.expandRow 按需返回），
 * 本组件只做展示与单位格式化，不产出任何汇总数。
 */

defineProps({
  /** effectStore.expandRow() 返回值 */
  data: { type: Object, required: true },
  /** 是否展示渠道切换器：详情页开启，列表行内展开保持紧凑不展示 */
  platformSwitch: { type: Boolean, default: false }
})

const emit = defineEmits(['change-platform'])

/**
 * 渠道切换：全部渠道返回 undefined，由父组件交给 store 回落合计口径
 * @param {string} value radio 值（all / 渠道名）
 */
function onSwitch(value) {
  emit('change-platform', value === 'all' ? undefined : value)
}

/**
 * 判断文案 → class 名（颜色仅作辅助，主判断仍是「好/差/持平」文字）
 * @param {string} judge 判断文案
 * @returns {string} class 后缀
 */
function judgeClass(judge) {
  if (judge === '好') return 'good'
  if (judge === '差') return 'bad'
  return 'flat'
}
</script>

<style scoped>
.expanded-effect {
  padding: 4px 12px 12px;
  background: var(--color-fill-1);
}
.block {
  margin-top: 12px;
}
.block-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-2);
  margin-bottom: 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--color-neutral-3);
}
.month-range {
  font-size: 12px;
  font-weight: normal;
  color: var(--color-text-3);
  margin-left: 8px;
}
.metric-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  background: var(--color-bg-2);
}
.metric-table th,
.metric-table td {
  border: 1px solid var(--color-neutral-3);
  padding: 5px 8px;
  text-align: left;
}
.metric-table th {
  font-weight: 500;
  color: var(--color-text-3);
  background: var(--color-fill-2);
}
.col-name {
  width: 140px;
}
.col-num {
  font-variant-numeric: tabular-nums;
}
.muted {
  color: var(--color-text-3);
}
.judge {
  font-size: 12px;
  font-weight: 600;
}
.judge-good {
  color: rgb(var(--green-6));
}
.judge-bad {
  color: rgb(var(--red-6));
}
.judge-flat {
  color: var(--color-text-3);
}
.usage-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(180px, 1fr));
  gap: 6px 16px;
}
.usage-item {
  display: flex;
  gap: 8px;
  font-size: 12px;
}
.usage-label {
  color: var(--color-text-3);
  flex-shrink: 0;
}
.usage-value {
  font-variant-numeric: tabular-nums;
}
.scene-row {
  margin-top: 8px;
  font-size: 12px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}
.scene-tip {
  color: var(--color-text-3);
}
.platform-block {
  margin-top: 10px;
}
.block-sub-title {
  font-size: 12px;
  color: var(--color-text-3);
  margin-bottom: 6px;
}
.platform-state {
  font-size: 11px;
  color: var(--color-text-3);
  margin-left: 6px;
}
.total-row td {
  font-weight: 600;
  background: var(--color-fill-2);
}
.platform-switch {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}
.switch-label {
  font-size: 12px;
  color: var(--color-text-3);
}
.switch-hint {
  font-size: 12px;
  color: var(--color-text-3);
}
.ratio {
  font-style: normal;
  font-size: 11px;
  color: var(--color-text-3);
  margin-left: 4px;
}
.selected-row td {
  background: var(--color-primary-light-1);
}
.note-list {
  margin: 0;
  padding-left: 18px;
  font-size: 12px;
  color: var(--color-text-2);
  line-height: 1.7;
}
</style>
