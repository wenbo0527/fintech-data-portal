<template>
  <svg class="bases" width="100%" height="100%" preserveAspectRatio="none">
    <defs>
      <filter id="labelShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="1" stdDeviation="1.2" flood-color="rgba(0,0,0,0.25)"/>
      </filter>
      <linearGradient id="baseGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="rgba(240, 248, 255, 0.85)" />
        <stop offset="100%" stop-color="rgba(220, 235, 255, 0.6)" />
      </linearGradient>
    </defs>
    <g v-for="b in polygons" :key="b.layerIndex">
      <path v-if="b.pathD" :d="b.pathD" class="base-shape" />
      <polygon v-else :points="pointsAttr(b.points!)" class="base-shape" />
      <text 
        v-if="b.title" 
        :x="b.label.x" 
        :y="b.label.y" 
        class="base-label" 
        text-anchor="start"
        :transform="`rotate(${b.labelRotate || 0}, ${b.label.x}, ${b.label.y})`"
      >
        {{ b.title }}
      </text>
    </g>
  </svg>
</template>
<script setup lang="ts">
type Pt = { x: number; y: number }
type Poly = { layerIndex: number; points?: Pt[]; pathD?: string; title?: string; label: Pt; labelRotate?: number }
const props = defineProps<{ polygons: Poly[] }>()
function pointsAttr(pts: Pt[]) {
  return pts.map(p => `${p.x},${p.y}`).join(' ')
}
</script>
<style scoped>
.bases { position: absolute; inset: 0; pointer-events: none; z-index: 10 }
.base-shape { 
  fill: url(#baseGrad); 
  stroke: rgba(0, 102, 255, 0.25); 
  stroke-width: 2;
  filter: drop-shadow(0 8px 12px rgba(0, 50, 150, 0.1));
}
.base-label { 
  font-size: 15px; 
  font-weight: 800; 
  fill: #1e3a8a;
  letter-spacing: 1px;
  paint-order: stroke fill;
  stroke: rgba(255,255,255,0.9);
  stroke-width: 1;
  filter: url(#labelShadow);
}
</style>
