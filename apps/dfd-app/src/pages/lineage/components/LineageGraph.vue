<template>
  <div class="lineage-graph-container" ref="graphContainer">
    <div class="floating-toolbar">
      <div class="toolbar-group action-controls">
        <button class="toolbar-btn" @click="zoomIn">
          <IconZoomIn class="toolbar-icon" />
          <span class="toolbar-text">放大</span>
        </button>
        <button class="toolbar-btn" @click="zoomOut">
          <IconZoomOut class="toolbar-icon" />
          <span class="toolbar-text">缩小</span>
        </button>
        <button class="toolbar-btn" @click="fitView">
          <IconExpand class="toolbar-icon" />
          <span class="toolbar-text">自适应</span>
        </button>
        <div class="toolbar-divider"></div>
        <button class="toolbar-btn" @click="refreshGraph">
          <IconRefresh class="toolbar-icon" />
          <span class="toolbar-text">刷新</span>
        </button>
        <button class="toolbar-btn" @click="toggleFullscreen">
          <IconFullscreen class="toolbar-icon" />
          <span class="toolbar-text">{{ isFullscreen ? '退出全屏' : '全屏' }}</span>
        </button>
      </div>
    </div>
    <div class="canvas-container" ref="canvasContainer"></div>

    <a-drawer
      v-model:visible="drawerVisible"
      title="资产详情"
      :width="500"
      :footer="false"
      :popup-container="popupContainer"
    >
      <div v-if="selectedNodeData" class="drawer-content">
        <div class="drawer-header-actions">
           <a-button type="primary" size="small" @click="jumpToDetail">
             <template #icon><IconLaunch /></template>
             查看资产详情
           </a-button>
        </div>

        <a-descriptions :column="1" bordered>
          <a-descriptions-item label="资产名称">
            {{ selectedNodeData.label }}
          </a-descriptions-item>
          <a-descriptions-item label="中文名称">
            {{ selectedNodeData.chineseName || selectedNodeData.label }}
          </a-descriptions-item>
          <a-descriptions-item label="资产描述">
            <span v-if="selectedNodeData.description" class="description-text">
              {{ selectedNodeData.description }}
            </span>
            <span v-else class="no-data-text">暂无描述</span>
          </a-descriptions-item>
          <a-descriptions-item label="负责人">
            {{ selectedNodeData.owner }}
          </a-descriptions-item>
          <a-descriptions-item label="加工逻辑">
            <span v-if="selectedNodeData.transformationLogic" class="transformation-text">
              {{ selectedNodeData.transformationLogic }}
            </span>
            <span v-else class="no-data-text">暂无加工逻辑</span>
          </a-descriptions-item>
        </a-descriptions>
      </div>
    </a-drawer>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed, provide } from 'vue'
import { useRouter } from 'vue-router'
import { Graph } from '@antv/x6'
import { register } from '@antv/x6-vue-shape'
import dagre from '@dagrejs/dagre'
import LineageNode from './LineageNode.vue'
import { IconRefresh, IconFullscreen, IconLaunch, IconZoomIn, IconZoomOut, IconExpand } from '@arco-design/web-vue/es/icon'
import { Message } from '@arco-design/web-vue'
import {
  toGraphData,
  dataLineageConfig,
  createNodeData as createMockNodeData,
  getDbName,
  getOwner
} from '../../../mock/shared/lineage-data'

const props = defineProps({
  tableName: {
    type: String,
    required: true
  },
  layers: {
    type: Number,
    default: 1
  },
  dataTypes: {
    type: Array,
    default: () => []
  },
  onlyFailed: {
    type: Boolean,
    default: false
  }
})

const canvasContainer = ref(null)
const graphContainer = ref(null)
const graph = ref(null)
const drawerVisible = ref(false)
const selectedNodeData = ref(null)
const popupContainer = computed(() => canvasContainer.value)
const graphData = ref({ nodes: [], edges: [] })
const isFullscreen = ref(false)

// 注册自定义节点
register({
  shape: 'lineage-node',
  width: 240,
  height: 120,
  component: LineageNode,
})

// 端口配置（复用）
const portConfig = {
  groups: {
    left: {
      position: 'left',
      attrs: { circle: { r: 4, magnet: false, stroke: 'transparent', fill: 'transparent' } }
    },
    right: {
      position: 'right',
      attrs: { circle: { r: 4, magnet: false, stroke: 'transparent', fill: 'transparent' } }
    }
  },
  items: [
    { id: 'left', group: 'left' },
    { id: 'right', group: 'right' }
  ]
}

const edgeAttrs = { line: { stroke: '#A2B1C3', strokeWidth: 2, targetMarker: 'classic' } }

// 将 toGraphData 的边格式转换为 X6 格式
const convertEdges = (edges) => {
  return edges.map(e => ({
    id: e.id,
    source: { cell: e.source, port: e.sourcePort || 'right' },
    target: { cell: e.target, port: e.targetPort || 'left' },
    attrs: edgeAttrs,
    data: e.data
  }))
}

// 根据血缘配置查找上下游表，生成新节点（替代 Math.random 随机生成）
const generateNodes = (sourceId, direction) => {
  const sourceNode = graphData.value.nodes.find(n => n.id === sourceId)
  if (!sourceNode) return { nodes: [], edges: [] }

  const tableName = sourceNode.data.label
  const newNodes = []
  const newEdges = []

  // 从 dataLineageConfig 查找上下游表
  const relatedTables = dataLineageConfig
    .filter(l => direction === 'upstream' ? l.targetTable === tableName : l.sourceTable === tableName)
    .map(l => direction === 'upstream' ? l.sourceTable : l.targetTable)

  relatedTables.forEach(tbl => {
    const nodeId = `${direction}-${tbl}`
    // 已存在则跳过
    if (graphData.value.nodes.some(n => n.id === nodeId || (n.data && n.data.label === tbl))) return

    const lineage = direction === 'upstream'
      ? dataLineageConfig.find(l => l.sourceTable === tbl && l.targetTable === tableName)
      : dataLineageConfig.find(l => l.sourceTable === tableName && l.targetTable === tbl)

    const nodeData = createMockNodeData(
      nodeId, tbl, direction,
      getDbName(tbl), getOwner(tbl), 'Table',
      lineage ? {
        transformationLogic: lineage.transformationLogic,
        dependencies: lineage.dependencies,
        updateFrequency: lineage.updateFrequency
      } : undefined
    )

    // 应用 onlyFailed 筛选
    if (props.onlyFailed) nodeData.taskStatus = 'failed'

    newNodes.push({
      id: nodeId,
      shape: 'lineage-node',
      data: nodeData,
      ports: JSON.parse(JSON.stringify(portConfig))
    })

    if (direction === 'upstream') {
      newEdges.push({
        source: { cell: nodeId, port: 'right' },
        target: { cell: sourceId, port: 'left' },
        attrs: edgeAttrs,
        data: lineage ? {
          relationFields: lineage.relationFields,
          transformationLogic: lineage.transformationLogic
        } : undefined
      })
    } else {
      newEdges.push({
        source: { cell: sourceId, port: 'right' },
        target: { cell: nodeId, port: 'left' },
        attrs: edgeAttrs,
        data: lineage ? {
          relationFields: lineage.relationFields,
          transformationLogic: lineage.transformationLogic
        } : undefined
      })
    }
  })

  return { nodes: newNodes, edges: newEdges }
}

// 展开节点逻辑
const expandNode = (nodeId, direction) => {
  const node = graphData.value.nodes.find(n => n.id === nodeId)
  if (!node) return

  // 如果已展开，不再处理
  if (direction === 'left' && node.data.upstreamExpanded) return
  if (direction === 'right' && node.data.downstreamExpanded) return

  const dirType = direction === 'left' ? 'upstream' : 'downstream'
  const { nodes: newNodes, edges: newEdges } = generateNodes(nodeId, dirType)

  graphData.value.nodes.push(...newNodes)
  graphData.value.edges.push(...newEdges)

  if (direction === 'left') {
    node.data.upstreamExpanded = true
  } else {
    node.data.downstreamExpanded = true
  }

  render()
}

// 自动展开所有未展开节点一层（用于 layers prop）
const autoExpandAll = () => {
  const nodesSnapshot = [...graphData.value.nodes]
  nodesSnapshot.forEach(node => {
    if (!node.data.upstreamExpanded) {
      const { nodes: newNodes, edges: newEdges } = generateNodes(node.id, 'upstream')
      graphData.value.nodes.push(...newNodes)
      graphData.value.edges.push(...newEdges)
      node.data.upstreamExpanded = true
    }
    if (!node.data.downstreamExpanded) {
      const { nodes: newNodes, edges: newEdges } = generateNodes(node.id, 'downstream')
      graphData.value.nodes.push(...newNodes)
      graphData.value.edges.push(...newEdges)
      node.data.downstreamExpanded = true
    }
  })
}

// 提供给子组件
provide('expandNode', expandNode)

const router = useRouter()

// 跳转到详情页
const navigateToDetail = (nodeData) => {
  if (!nodeData) return
  const { dataType, label, id } = nodeData
  switch (dataType) {
    case 'Table':
      // 表详情为路径参数式路由（dca / dfd 两应用内均为此形式）
      router.push(`/discovery/data-map/table/${encodeURIComponent(label)}`)
      break
    case 'Metric':
      router.push({
        path: `/management/asset-management/listing-management/metric-management/${id || label}/detail`
      })
      break
    case 'Variable':
      router.push({
        path: '/discovery/variable-dict',
        query: { variable: label }
      })
      break
    default:
      Message.info(`暂无 ${label} 的详情页面`)
  }
}

provide('navigateToDetail', navigateToDetail)

// 初始化数据（使用结构化 mock 数据，替代 Math.random）
const initData = () => {
  const raw = toGraphData(dataLineageConfig, props.tableName, true, true)

  // 应用 onlyFailed 筛选
  if (props.onlyFailed) {
    raw.nodes.forEach(n => { n.data.taskStatus = 'failed' })
  }

  // 应用 dataTypes 筛选（保留主节点）
  if (props.dataTypes && props.dataTypes.length > 0) {
    raw.nodes = raw.nodes.filter(n =>
      n.id === `main-${props.tableName}` || props.dataTypes.includes(n.data.dataType)
    )
  }

  graphData.value = {
    nodes: raw.nodes,
    edges: convertEdges(raw.edges)
  }

  // 根据 layers prop 自动展开更多层级
  for (let layer = 1; layer < props.layers; layer++) {
    autoExpandAll()
  }
}

// 自动布局
const layout = () => {
  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir: 'LR', nodesep: 50, ranksep: 80 })
  g.setDefaultEdgeLabel(() => ({}))

  const { nodes, edges } = graphData.value

  nodes.forEach((node) => {
    g.setNode(node.id, { width: 240, height: 120 })
  })

  edges.forEach((edge) => {
    const sourceId = typeof edge.source === 'object' ? edge.source.cell : edge.source
    const targetId = typeof edge.target === 'object' ? edge.target.cell : edge.target
    g.setEdge(sourceId, targetId)
  })

  dagre.layout(g)

  nodes.forEach((node) => {
    const pos = g.node(node.id)
    node.x = pos.x
    node.y = pos.y
  })

  return { nodes, edges }
}

const initGraph = () => {
  if (graph.value) {
    graph.value.dispose()
  }

  graph.value = new Graph({
    container: canvasContainer.value,
    grid: true,
    mousewheel: {
      enabled: false
    },
    connecting: {
      enabled: false,
      allowNode: false,
      allowPort: false,
      allowEdge: false,
      allowMulti: false,
      allowLoop: false,
      router: 'manhattan',
      connector: {
        name: 'rounded',
        args: {
          radius: 8,
        },
      },
      anchor: 'center',
      connectionPoint: 'boundary',
      allowBlank: false,
      snap: {
        radius: 20,
      },
    },
    panning: {
      enabled: true,
      modifiers: null,
    },
    selecting: {
      enabled: false
    },
    background: {
      color: '#f5f7fa',
    },
    interacting: {
      nodeMovable: false,
      edgeMovable: false
    }
  })

  graph.value.on('node:click', ({ e, node }) => {
    // 避免点击展开按钮时触发抽屉
    if (e.target && e.target.closest && e.target.closest('.expand-btn')) {
      return
    }
    selectedNodeData.value = node.getData()
    drawerVisible.value = true
  })
}

const render = () => {
  if (!graph.value) return
  if (graphData.value.nodes.length === 0) {
    initData()
  }
  const layoutData = layout()
  graph.value.fromJSON(layoutData)
  graph.value.centerContent()
}

// 监听筛选条件变化（统一 watcher，删除了重复的第二个）
watch(() => [props.tableName, props.layers, props.dataTypes, props.onlyFailed], () => {
  if (graph.value) {
    initData()
    render()
  }
})

// 全屏事件处理函数（命名引用，便于正确移除监听器）
const handleFullscreenChange = () => {
  isFullscreen.value = !!document.fullscreenElement && document.fullscreenElement === graphContainer.value
}

onMounted(() => {
  initGraph()
  render()
  document.addEventListener('fullscreenchange', handleFullscreenChange)
})

onUnmounted(() => {
  if (graph.value) {
    graph.value.dispose()
  }
  document.removeEventListener('fullscreenchange', handleFullscreenChange)
})

const refreshGraph = () => {
  graphData.value = { nodes: [], edges: [] }
  initData()
  render()
}

const toggleFullscreen = async () => {
  const el = graphContainer.value
  if (!el) return
  if (!document.fullscreenElement || !isFullscreen.value) {
    if (el.requestFullscreen) {
      await el.requestFullscreen()
    }
  } else {
    await document.exitFullscreen()
  }
}

const zoomIn = () => {
  graph.value?.zoom(0.2)
}

const zoomOut = () => {
  graph.value?.zoom(-0.2)
}

const fitView = () => {
  graph.value?.zoomToFit({ padding: 40 })
  graph.value?.centerContent()
}

const jumpToDetail = () => {
  if (selectedNodeData.value) {
    navigateToDetail(selectedNodeData.value)
  }
}
</script>

<style scoped>
.lineage-graph-container {
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  flex-direction: column;
}

.canvas-container {
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

.floating-toolbar {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 8px;
  background: transparent;
}

.drawer-content {
  padding: 0 4px;
}

.drawer-header-actions {
  margin-bottom: 20px;
  display: flex;
  justify-content: flex-end;
}

.transformation-text {
  word-break: break-all;
  line-height: 1.6;
}

.description-text {
  word-break: break-all;
  line-height: 1.6;
  color: var(--subapp-text-secondary, #4E5969);
}

.no-data-text {
  color: var(--subapp-text-tertiary, #86909C);
}
</style>
<style>
@import '@/styles/enhanced-toolbar-styles.css';
</style>
