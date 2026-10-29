<template>
  <div class="status-bar">
    <div class="bar-left">
      <div class="bar-item">
        <span class="bar-label">数据区间</span>
        <span class="bar-value">{{ overview.periodLabel }}</span>
      </div>
      <div class="bar-item">
        <span class="bar-label">执行日期</span>
        <span class="bar-value">{{ overview.lastRunAt }}</span>
      </div>
      <div class="bar-item">
        <span class="bar-label">下次执行</span>
        <span class="bar-value">{{ overview.nextRunAt }}</span>
      </div>
      <div class="bar-item">
        <span class="bar-label">跑批进度</span>
        <span class="bar-value">
          {{ overview.runProgress.done }} / {{ overview.runProgress.total }}
          <a-tag size="small" class="run-tag">{{ runStatusText }}</a-tag>
        </span>
      </div>
    </div>
    <div class="bar-right">
      <slot name="extra" />
    </div>
  </div>

  <!-- 覆盖口径说明：避免 412 被误读为台账资产总数 -->
  <a-alert type="info" class="coverage-note">{{ overview.coverageNote }}</a-alert>
</template>

<script setup>
/**
 * 效果总览状态条
 * 只渲染 effectStore.overview() 已给出的字段，跑批状态文案由枚举映射，组件不做任何计算。
 */
import { computed } from 'vue'

const props = defineProps({
  /** effectStore.overview() 返回值 */
  overview: { type: Object, required: true }
})

/** 跑批状态文案映射（TaskStatus → 中文） */
const RUN_STATUS_TEXTS = {
  running: '执行中',
  success: '已完成',
  failed: '失败',
  partial: '部分成功',
  paused: '已暂停',
  pending: '待执行'
}

const runStatusText = computed(
  () => RUN_STATUS_TEXTS[props.overview.runProgress.status] || props.overview.runProgress.status
)
</script>

<style scoped>
.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 16px;
  padding: 8px 12px;
  background: var(--color-fill-1);
  border-radius: 4px;
}
.bar-left {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 24px;
}
.bar-item {
  display: flex;
  gap: 6px;
  font-size: 12px;
}
.bar-label {
  color: var(--color-text-3);
}
.bar-value {
  font-variant-numeric: tabular-nums;
}
.run-tag {
  margin-left: 4px;
}
.coverage-note {
  margin-top: 8px;
  font-size: 12px;
}
</style>
