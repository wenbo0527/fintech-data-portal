<template>
  <div ref="container" class="dm-graph" />
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { Graph } from '@antv/x6'
import dagre from '@dagrejs/dagre'
import type { DemoRelationType } from '../data/derive'

export interface GraphNode {
  id: string
  title: string
  sub: string
  kind: 'stage' | 'entity' | 'event'
  /** false = 当前视角未命中，淡化但保留 */
  inView: boolean
}

export interface GraphEdge {
  id: string
  source: string
  target: string
  label: string
  type: DemoRelationType
}

const props = defineProps<{
  nodes: GraphNode[]
  edges: GraphEdge[]
  rankdir?: 'TB' | 'LR'
}>()

const emit = defineEmits<{ (e: 'node-click', id: string): void }>()

const container = ref<HTMLElement>()
const graph = ref<Graph | null>(null)

const EDGE_COLORS: Record<string, string> = {
  sequence: '#165dff',
  associate: '#86909c',
  contain: '#722ed1',
  flow: '#ff7d00'
}

const NODE_STYLE: Record<GraphNode['kind'], { w: number, h: number, fill: string, stroke: string }> = {
  stage: { w: 214, h: 68, fill: '#f7f8fa', stroke: '#4e5969' },
  entity: { w: 190, h: 64, fill: '#f2f7ff', stroke: '#165dff' },
  event: { w: 190, h: 64, fill: '#fff7e8', stroke: '#ff7d00' }
}

function buildData () {
  const nodes = props.nodes.map(n => {
    const style = NODE_STYLE[n.kind]
    return {
      id: n.id,
      shape: 'rect',
      width: style.w,
      height: style.h,
      attrs: {
        body: { fill: style.fill, stroke: style.stroke, strokeWidth: 1.6, rx: 10, ry: 10 },
        label: {
          text: `${n.title}\n${n.sub}`,
          fill: '#1d2129',
          fontSize: n.kind === 'stage' ? 14 : 13,
          fontWeight: n.kind === 'stage' ? 600 : 500,
          lineHeight: 18
        }
      },
      data: { inView: n.inView }
    }
  })
  const edges = props.edges.map(e => ({
    id: e.id,
    source: e.source,
    target: e.target,
    attrs: {
      line: {
        stroke: EDGE_COLORS[e.type] ?? '#c9cdd4',
        strokeWidth: 1.4,
        strokeOpacity: 0.75,
        targetMarker: { name: 'block', size: 7 }
      }
    },
    labels: [{ attrs: { label: { text: e.label, fill: '#4e5969', fontSize: 13 } } }]
  }))
  return { nodes, edges }
}

function layout () {
  const data = buildData()
  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir: props.rankdir ?? 'TB', nodesep: 32, ranksep: 76 })
  g.setDefaultEdgeLabel(() => ({}))
  data.nodes.forEach(n => g.setNode(n.id, { width: n.width, height: n.height }))
  data.edges.forEach(e => g.setEdge(e.source, e.target))
  dagre.layout(g)
  data.nodes.forEach(n => {
    const pos = g.node(n.id)
    Object.assign(n, { x: pos.x, y: pos.y })
  })
  return data
}

function highlight (activeId: string | null) {
  const g = graph.value
  if (!g) {return}
  const keep = new Set<string>()
  if (activeId) {
    keep.add(activeId)
    props.edges.forEach(e => {
      if (e.source === activeId) {keep.add(e.target)}
      if (e.target === activeId) {keep.add(e.source)}
    })
  }
  g.getNodes().forEach(n => {
    const visible = n.getData()?.inView !== false
    const focused = !activeId || keep.has(n.id)
    const op = !visible ? 0.28 : (focused ? 1 : 0.3)
    n.attr('body/opacity', op)
    n.attr('label/opacity', op)
  })
  g.getEdges().forEach(e => {
    const sourceIn = g.getCellById(e.getSourceCellId())?.getData()?.inView !== false
    const targetIn = g.getCellById(e.getTargetCellId())?.getData()?.inView !== false
    const focused = !activeId || (keep.has(e.getSourceCellId()) && keep.has(e.getTargetCellId()))
    e.attr('line/opacity', !(sourceIn && targetIn) ? 0.12 : (focused ? 1 : 0.2))
  })
}

function initGraph () {
  if (!container.value) {return}
  graph.value = new Graph({
    container: container.value,
    panning: true,
    mousewheel: { enabled: true, modifiers: ['ctrl', 'meta'] },
    grid: { visible: false },
    connecting: { enabled: false },
    selecting: { enabled: false },
    interacting: {
      nodeMovable: false,
      edgeMovable: false,
      edgeLabelMovable: false,
      arrowheadMovable: false,
      vertexMovable: false,
      vertexAddable: false,
      vertexDeletable: false
    }
  })
  graph.value.on('node:click', ({ node }) => {
    const id = String(node.id)
    highlight(id)
    emit('node-click', id)
  })
  graph.value.on('blank:click', () => {
    highlight(null)
    emit('node-click', '')
  })
}

function render () {
  if (!graph.value) {return}
  graph.value.fromJSON(layout())
  fit()
  highlight(null)
}

function reset () {
  highlight(null)
  fit()
}

// X6 会把容器尺寸写成内联样式，autoResize 监听不到父级 padding 变化，
// 所以每次适配前按无 padding 的宿主 div 显式 resize
function fit () {
  const host = container.value?.parentElement
  if (host && graph.value) {
    graph.value.resize(host.clientWidth, host.clientHeight)
  }
  graph.value?.zoomToFit({ padding: 24, maxScale: 1 })
  graph.value?.centerContent()
}

defineExpose({ reset, fit })

watch(() => [props.nodes, props.edges, props.rankdir], render, { deep: true })

onMounted(() => {
  initGraph()
  render()
  window.addEventListener('resize', fit)
})

onUnmounted(() => {
  window.removeEventListener('resize', fit)
  graph.value?.dispose()
  graph.value = null
})
</script>

<style scoped>
.dm-graph {
  width: 100%;
  height: 100%;
  min-height: 620px;
  background: var(--dca-bg-page, #f7f8fa);
  border-radius: 8px;
}
</style>