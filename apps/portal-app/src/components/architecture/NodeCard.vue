<template>
  <a-popover position="top" trigger="hover">
    <template #content>
      <div class="content">
        <div class="title">{{ node.name }}</div>
        <div class="brief">{{ node.brief }}</div>
        <div v-if="node.details.metrics" class="metrics">
          <a-tag v-for="m in node.details.metrics" :key="m.label">{{ m.label }}：{{ m.value }}</a-tag>
        </div>
      </div>
    </template>
     <div 
       class="card" 
      :class="[{ 'is-active': active, 'is-hovered': hovered }, animClass]"
      :style="style" 
      role="button" 
      tabindex="0" 
      @mouseenter="$emit('mouseenter')" 
      @mouseleave="$emit('mouseleave')" 
      @click="$emit('click')"
    >
      <div class="node-body">
        <div class="icon-box">
          <img class="icon-img" :src="node.style?.icon || defaultIcon" alt="" />
        </div>
        <div class="name-label">{{ node.name }}</div>
      </div>
    </div>

  </a-popover>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import type { Node } from '../../data/architecture/nodes'
const props = defineProps<{ node: Node; positionPx: {x:number;y:number}; active: boolean; hovered: boolean; size?: number }>()
// const defaultIcon = new URL('../../assets/logo.svg', import.meta.url).href // Removed giant logo fallback
const cardSize = computed(() => props.size || 240)
const style = computed(() => ({
  transform: `translate(${props.positionPx.x - cardSize.value/2}px, ${props.positionPx.y - cardSize.value/2}px)`, // Centered
  width: `${cardSize.value}px`,
  height: `${cardSize.value}px`,
  zIndex: props.active ? 30 : 20,
  opacity: props.node.style?.opacity ?? 1
}))
const animClass = computed(() => {
  const a = props.node.style?.animate
  return a === 'pulse' ? 'anim-pulse' : ''
})
</script>

<style scoped>
.card { 
  position: absolute; 
  /* width/height set by style */
  display: flex; 
  align-items: center; 
  justify-content: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  outline: none;
}

.node-body {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
 
 .icon-box {
   position: absolute;
   left: 50%;
   top: 50%;
   transform: translate(-50%, -65%); /* Lift icon so feet land on anchor */
   width: 100%;
   height: 100%;
   display: flex;
   align-items: center;
   justify-content: center;
 }
 .icon-img {
  width: 100%;
  height: 100%;
   object-fit: contain;
   filter: drop-shadow(0 10px 10px rgba(0,0,0,0.15)); /* Add shadow to ground */
 }

 .fallback-shape {
   width: 120px;
   height: 120px;
   border-radius: 50%;
   opacity: 0.8;
   box-shadow: 0 4px 12px rgba(0,0,0,0.2);
 }

.name-label { 
  position: absolute; 
  bottom: 0px; 
  left: 50%;
  transform: translateX(-50%) skewX(-10deg); /* 2.5D text effect */
  white-space: nowrap;
  font-size: 16px;
  font-weight: bold;
  color: #333;
  text-shadow: 0 1px 2px rgba(255,255,255,0.8);
  pointer-events: none;
  font-family: "PingFang SC", sans-serif;
}
.label.with-icon {
  /* optional: adjust if needed when icon is present */
}

/* Animations */
.anim-pulse .node-body {
  animation: pulse 3s infinite ease-in-out;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); filter: brightness(1); }
  50% { transform: scale(1.02); filter: brightness(1.2); }
}

.content { display: grid; gap: 8px; max-width: 240px; padding: 4px; }
.title { font-weight: 600 }
.brief { color: var(--color-text-2) }
.metrics { display: flex; gap: 6px; flex-wrap: wrap }
</style>
