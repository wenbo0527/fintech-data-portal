<template>
  <a-page-header
    class="dmt-page-header"
    :title="title"
    :subtitle="subtitle"
    :show-back="showBack"
    :breadcrumb="breadcrumb"
  >
    <!-- 支持传入副标题节点（富文本、标签等），优先于 subtitle 字符串 -->
    <template v-if="$slots.subtitle" #subtitle>
      <slot name="subtitle" />
    </template>
    <template #extra>
      <a-space :size="8" wrap>
        <slot name="extra" />
      </a-space>
    </template>
  </a-page-header>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  showBack: { type: Boolean, default: false },
  breadcrumb: { type: Array, default: () => [] }
})
</script>

<style scoped>
.dmt-page-header {
  padding: 0 0 16px 0;
  border-bottom: 1px solid var(--color-border-2);
  margin-bottom: 16px;
}
</style>
