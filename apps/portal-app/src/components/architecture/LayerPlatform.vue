<template>
  <div class="platform">
    <img :src="src" alt="" />
  </div>
</template>
<script setup lang="ts">
import type { Layer } from '../../data/architecture/layers'
const props = defineProps<{ layer: Layer }>()
const src = `/assets/2_5d/layers/layer-1-light.svg`
</script>
<style scoped>
.platform { position: absolute; width: 100%; height: 33.333% }
.platform:nth-child(1) { top: 0 }
.platform:nth-child(2) { top: 33.333% }
.platform:nth-child(3) { top: 66.666% }
.platform img { width: 100%; height: 100%; object-fit: contain }
</style>
