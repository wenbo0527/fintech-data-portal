<template>
  <svg v-if="visible && activeRect" class="mask" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <mask id="hole">
        <rect x="0" y="0" width="100%" height="100%" fill="white"/>
        <rect :x="activeRect.x" :y="activeRect.y" :width="activeRect.width" :height="activeRect.height" rx="8" ry="8" fill="black"/>
      </mask>
    </defs>
    <rect x="0" y="0" width="100%" height="100%" fill="rgba(0,0,0,0.6)" mask="url(#hole)"/>
  </svg>
</template>
<script setup lang="ts">
const props = defineProps<{ activeRect: { x:number; y:number; width:number; height:number }|null; visible: boolean }>()
</script>
<style scoped>
.mask { position: absolute; inset: 0; z-index: 60; pointer-events: none }
</style>
