<template>
  <g>
    <defs>
      <linearGradient id="busGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="rgba(59, 130, 246, 0.2)"/>
        <stop offset="50%" stop-color="rgba(59, 130, 246, 0.8)"/>
        <stop offset="100%" stop-color="rgba(59, 130, 246, 0.2)"/>
      </linearGradient>
      <marker id="arrowEnd" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
        <path d="M 0 0 L 10 5 L 0 10 L 2 5 z" fill="#3B82F6"/>
      </marker>
    </defs>
    <path 
      v-for="bl in busLines" 
      :key="bl.id" 
      :d="pathDAnchor(bl.a, bl.b)" 
      stroke="url(#busGrad)" 
      fill="none" 
      :style="{ strokeWidth: 'var(--bus-stroke)', strokeDasharray: `10, 5` }"
      class="bus-line"
      marker-end="url(#arrowEnd)"
    />
    <path 
      v-for="el in edgeLines" 
      :key="el.id" 
      :d="pathDAnchor(el.a, el.b)" 
      :stroke="el.color || '#60A5FA'" 
      fill="none" 
      :style="{ strokeWidth: 'var(--edge-stroke)', opacity: 0.6 }"
      class="edge-line"
    />
  </g>
</template>

<script setup lang="ts">
type BusLine = { id: string; a: { x: number; y: number }; b: { x: number; y: number } }
type EdgeLine = { id: string; a: { x: number; y: number }; b: { x: number; y: number }; type: 'in' | 'out'; color?: string }
type Props = { nodesPx: Record<string,{x:number;y:number}>; activeNodeId: string|null; busLines?: BusLine[]; edgeLines?: EdgeLine[] }
const props = defineProps<Props>()

function pathDAnchor(a: { x: number; y: number }, b: { x: number; y: number }) {
  return `M ${a.x} ${a.y} L ${b.x} ${b.y}`
}
</script>

<style scoped>
.bus-line {
  opacity: 0.8;
  animation: flow 3s linear infinite;
}
.edge-line {
  opacity: 1;
  animation: flow 1s linear infinite;
}

@keyframes flow {
  to {
    stroke-dashoffset: -24;
  }
}
</style>
