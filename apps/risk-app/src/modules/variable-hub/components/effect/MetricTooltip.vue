<template>
  <a-popover trigger="hover" position="top" :content-style="contentStyle">
    <a-link class="metric-q" @click.prevent>{{ label }}</a-link>
    <template #content>
      <div class="metric-meta">
        <div class="meta-title">{{ meta?.label || label }}</div>
        <p class="meta-desc">{{ meta?.description }}</p>
        <div class="meta-row"><span>分子</span><b>{{ meta?.numerator }}</b></div>
        <div class="meta-row"><span>分母</span><b>{{ meta?.denominator }}</b></div>
        <div class="meta-row"><span>统计区间</span><b>{{ meta?.period }}</b></div>
        <div class="meta-row"><span>统计粒度</span><b>{{ meta?.granularity }}</b></div>
        <div class="meta-row"><span>方向</span><b>{{ directionText }}</b></div>
        <div class="meta-row"><span>基准</span><b>{{ meta?.benchmark }}</b></div>
      </div>
    </template>
  </a-popover>
</template>

<script setup>
/**
 * 指标口径问号：文案唯一来源是 effectStore.metricMeta()
 * 组件不内置任何口径说明，避免多处维护导致口径漂移
 */
import { computed } from 'vue'
import { effectStore } from '@/modules/variable-hub/mock/effect-evaluation/effect-store'

const props = defineProps({
  /** 指标键，见 types.ts MetricKey */
  metricKey: { type: String, required: true },
  /** 无口径数据时的兜底展示名 */
  fallbackLabel: { type: String, default: '' }
})

const meta = computed(() => effectStore.metricMeta(props.metricKey))
const label = computed(() => meta.value?.label || props.fallbackLabel || props.metricKey)
const directionText = computed(() => (meta.value?.direction === 'lower_better' ? '越低越好' : '越高越好'))
const contentStyle = { maxWidth: '320px' }
</script>

<style scoped>
.metric-q {
  font-size: 12px;
  color: var(--color-text-3);
  text-decoration: none;
  cursor: help;
}
.metric-meta {
  font-size: 12px;
  line-height: 1.6;
}
.meta-title {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 4px;
}
.meta-desc {
  color: var(--color-text-3);
  margin: 0 0 6px;
}
.meta-row {
  display: flex;
  gap: 6px;
}
.meta-row span {
  color: var(--color-text-3);
  flex-shrink: 0;
}
</style>
