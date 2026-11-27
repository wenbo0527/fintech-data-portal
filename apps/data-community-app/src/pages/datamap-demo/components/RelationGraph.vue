<template>
  <div ref="container" class="dm-graph" />
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { Graph } from '@antv/x6'
import dagre from '@dagrejs/dagre'
import { viewCountsOf, type DemoEntity, type DemoRelation, type DemoTable, type DemoView } from '../data/derive'

const props = defineProps<{
  entities: DemoEntity[]
  relations: DemoRelation[]
  tables: DemoTable[]
  rankdir?: 'TB' | 'LR'
  view?: DemoView
}>()

const emit = defineEmits<{ (e: 'node-click', entityId: string): void }>()

const container = ref<HTMLElement>()
const graph = ref<Graph | null>(null)

const NODE_W = 190
const NODE_H = 64

const EDGE_COLORS: Record<string, string> = {
  sequence: '#165dff',
  associate: '#86909c',
  contain: '#722ed1',
  flow: '#ff7d00'
}

function countOf (id: string) {
  return props.tables.filter(t => t.entityId === id).length
}

function buildData () {
  const view = props.view ?? 'all'
  const nodes = props.entities.map(e => {
    const n = countOf(e.id)
    const event = e.kind === 'event'
    const hit = view === 'all' ? null : viewCountsOf(e.id, props.tables)[view]
    const second = hit === null
      ? `${event ? '事件' : '实体'} · ${n} 张表`
      : `${event ? '事件' : '实体'} · 本视角 ${hit}/${n} 张`
    return {
      id: e.id,
      shape: 'rect',
      width: NODE_W,
      height: NODE_H,
      attrs: {
        body: {
          fill: event ? '#fff7e8' : '#f2f7ff',
          stroke: event ? '#ff7d00' : '#165dff',
          strokeWidth: 1.6,
          rx: 10,
          ry: 10
        },
        label: {
          text: `${e.name}\n${second}`,
          fill: '#1d2129',
          fontSize: 13,
          fontWeight: 500,
          lineHeight: 18
        }
      },
      data: { entityId: e.id }
    }
  })
  const edges = props.relations.map(r => ({
    id: r.id,
    source: r.src,
    target: r.dst,
    attrs: {
      line: {
        stroke: EDGE_COLORS[r.type] ?? '#c9cdd4',
        strokeWidth: 1.4,
        strokeOpacity: 0.75,
        targetMarker: { name: 'block', size: 7 }
      }
    },
    labels: [{ attrs: { label: { text: r.label, fill: '#4e5969', fontSize: 13 } } }]
  }))
  return { nodes, edges }
}

function layout () {
  const data = buildData()
  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir: props.rankdir ?? 'TB', nodesep: 32, ranksep: 76 })
  g.setDefaultEdgeLabel(() => ({}))
  data.nodes.forEach(n => g.setNode(n.id, { width: NODE_W, height: NODE_H }))
  data.edges.forEach(e => g.setEdge(e.source, e.target))
  dagre.layout(g)
  data.nodes.forEach(n => {
    const pos = g.node(n.id)
    Object.assign(n, { x: pos.x, y: pos.y })
  })
  return data
}

function inView (entityId: string) {
  if (!props.view || props.view === 'all') {return true}
  return viewCountsOf(entityId, props.tables)[props.view] > 0
}

function highlight (entityId: string | null) {
  const g = graph.value
  if (!g) {return}
  const keep = new Set<string>()
  if (entityId) {
    keep.add(entityId)
    props.relations.forEach(r => {
      if (r.src === entityId) {keep.add(r.dst)}
      if (r.dst === entityId) {keep.add(r.src)}
    })
  }
  g.getNodes().forEach(n => {
    const visible = inView(n.id)
    const focused = !entityId || keep.has(n.id)
    const op = !visible ? 0.28 : (focused ? 1 : 0.3)
    n.attr('body/opacity', op)
    n.attr('label/opacity', op)
  })
  g.getEdges().forEach(e => {
    const bothInView = inView(e.getSourceCellId()) && inView(e.getTargetCellId())
    const focused = !entityId || (keep.has(e.getSourceCellId()) && keep.has(e.getTargetCellId()))
    e.attr('line/opacity', !bothInView ? 0.12 : (focused ? 1 : 0.2))
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
    const id = node.getData()?.entityId as string
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

watch(() => [props.entities, props.relations, props.tables, props.rankdir, props.view], render, { deep: true })

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
