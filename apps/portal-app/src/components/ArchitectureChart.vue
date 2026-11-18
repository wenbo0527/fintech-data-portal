<template>
  <div class="architecture-container">
    <div class="toolbar">
      <a-space size="mini"></a-space>
    </div>
    <Canvas2_5D :layers="layers" :nodes="nodes" :opts="mergedOpts" />
  </div>
</template>

<script setup lang="ts">
import Canvas2_5D from './architecture/Canvas2_5D.vue'
import { layers } from '../data/architecture/layers'
import { nodes } from '../data/architecture/nodes'
import { watch, ref, computed } from 'vue'
const props = defineProps<{ opts?: { hideNodes?: boolean; coord?: boolean; hideBg?: boolean } }>()
const mergedOpts = computed(() => ({ ...(props.opts || {}) }))
watch(() => props.opts, (v: { hideNodes?: boolean; coord?: boolean } | undefined) => {
  console.log('[ArchitectureChart] opts', v)
}, { deep: true })
</script>

<style scoped>
.architecture-container {
  position: relative;
  width: 100%;
  min-height: 420px;
  overflow: visible;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  background-color: var(--color-bg-1);
  border-radius: 8px;
}
.toolbar {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 40;
}
</style>
