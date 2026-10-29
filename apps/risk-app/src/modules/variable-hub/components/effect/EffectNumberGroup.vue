<template>
  <div class="effect-numbers">
    <div
      v-for="num in numbers"
      :key="num.key"
      class="num-card"
      role="button"
      tabindex="0"
      @click="pick(num)"
      @keydown.enter="pick(num)"
    >
      <div class="num-label">{{ num.label }}</div>
      <div class="num-value">
        <span class="num-main">{{ num.value.toLocaleString('zh-Hans-CN') }}</span>
        <span class="num-unit">{{ num.unit }}</span>
      </div>
      <div class="num-delta">{{ num.deltaLabel }}</div>
    </div>
  </div>
</template>

<script setup>
/**
 * 指标概览数字卡组（特征综述 + 效果三数）
 * 点击不做跳转，只把 { anchor, tab, route, key } 抛给页面：
 * 效果类数字由页面写 URL query 并滚动到页内推荐表锚点，带 route 的卡直接跳页。
 */
defineProps({
  /** 指标卡数据：store 下发或页面拼装 */
  numbers: { type: Array, default: () => [] }
})

const emit = defineEmits(['select'])

/**
 * 卡片点击
 * @param {object} num 单个数字卡数据
 */
function pick(num) {
  emit('select', { anchor: num.anchor, tab: num.tab, key: num.key, route: num.route })
}
</script>

<style scoped>
.effect-numbers {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}
.num-card {
  /* 统一卡片视觉基线：固定最小高度、同圆角、同悬浮反馈 */
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 100px;
  padding: 12px 16px;
  border: 1px solid var(--color-border-2);
  border-radius: 4px;
  background: var(--color-bg-2);
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
}
.num-card:hover,
.num-card:focus-visible {
  border-color: rgb(var(--primary-6));
  box-shadow: 0 4px 12px rgba(15, 35, 95, 0.08);
  transform: translateY(-1px);
  outline: none;
}
.num-label {
  font-size: 12px;
  color: var(--color-text-3);
}
.num-value {
  margin-top: 4px;
  display: flex;
  align-items: baseline;
  gap: 4px;
}
.num-main {
  font-size: 24px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.num-unit {
  font-size: 12px;
  color: var(--color-text-3);
}
.num-delta {
  margin-top: 4px;
  font-size: 12px;
  color: var(--color-text-3);
}
@media (max-width: 1200px) {
  .effect-numbers {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
