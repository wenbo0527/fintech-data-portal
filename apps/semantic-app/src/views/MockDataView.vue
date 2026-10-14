<template>
  <div class="mock-data-view">
    <div class="page-header">
      <h2 class="semantic-page-title">Mock数据管理</h2>
      <span class="page-subtitle">验证Agent查询结果的可信度</span>
    </div>
    <div class="semantic-card">
      <MockDataPanel />
    </div>
    <div class="semantic-card verify-hint">
      <icon-check-circle class="hint-icon" />
      <span class="hint-text">
        此页面的统计值与Agent问答返回的值保持一致，用于验证Demo数据可信度。
        例如：Agent查询"上个月首逾率"返回的值应与上方统计卡片中的首逾率一致。
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import MockDataPanel from '@/components/MockDataPanel.vue'
</script>

<style scoped lang="scss">
.mock-data-view {
  padding: 20px;
  height: 100%;
  overflow-y: auto;
}

.page-header {
  margin-bottom: 16px;

  .page-subtitle {
    font-size: 13px;
    color: var(--color-text-secondary);
  }
}

.verify-hint {
  display: flex;
  align-items: center;
  gap: 8px;

  .hint-icon {
    font-size: 18px;
    color: var(--color-success);
    flex-shrink: 0;
  }

  .hint-text {
    font-size: 13px;
    color: var(--color-text-secondary);
    line-height: 1.6;
  }
}
</style>
