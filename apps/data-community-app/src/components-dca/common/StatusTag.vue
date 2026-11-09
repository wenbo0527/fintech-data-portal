<template>
  <a-tag :color="meta.color">
    <slot>{{ meta.label }}</slot>
  </a-tag>
</template>

<script setup>
import { computed } from 'vue'
import { getStatusMeta } from '@/utils-dca/status-dictionary'

const props = defineProps({
  status: { type: String, required: true },
  dictKey: { type: String, required: false } // 放宽为可选：getStatusMeta 对缺失 dictKey 兜底为 {label: status, color: 'gray'}
})

const meta = computed(() => getStatusMeta(props.dictKey || '', props.status))
</script>
