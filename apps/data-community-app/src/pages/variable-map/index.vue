<template>
  <div class="variable-map-page">
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">特征地图</h2>
        <span class="page-subtitle">Variable Map · 数据要素发现</span>
      </div>
      <div class="header-actions">
        <a-button @click="handleRefresh">
          <template #icon><IconRefresh /></template>
          刷新
        </a-button>
      </div>
    </div>

    <!-- 搜索筛选 -->
    <div class="search-section">
      <a-row :gutter="12">
        <a-col :span="6">
          <a-input v-model="searchName" placeholder="搜索特征名称" allow-clear @press-enter="fetchGraphData">
            <template #prefix><icon-search /></template>
          </a-input>
        </a-col>
        <a-col :span="4">
          <a-select v-model="searchType" placeholder="特征类型" allow-clear style="width: 100%">
            <a-option value="numerical">数值型</a-option>
            <a-option value="categorical">分类型</a-option>
            <a-option value="text">文本型</a-option>
            <a-option value="datetime">时间型</a-option>
            <a-option value="boolean">布尔型</a-option>
          </a-select>
        </a-col>
        <a-col :span="3">
          <a-button type="primary" @click="fetchGraphData">
            <template #icon><icon-search /></template>
            搜索
          </a-button>
        </a-col>
      </a-row>
    </div>

    <!-- 图谱可视化区 -->
    <div class="graph-section">
      <div class="graph-header">
        <span class="graph-title">特征关系图谱</span>
        <span class="graph-stats">{{ graphData.nodes.length }} 节点 / {{ graphData.edges.length }} 关系</span>
      </div>
      <div class="graph-container" ref="graphContainer">
        <div v-if="loading" class="graph-loading">
          <a-spin size="large" />
          <span>加载图谱数据...</span>
        </div>
        <div v-else-if="graphData.nodes.length === 0" class="graph-empty">
          <icon-info-circle :size="48" />
          <span>暂无数据</span>
        </div>
        <div v-else class="graph-canvas" id="variable-graph-canvas">
          <svg :width="svgWidth" :height="svgHeight" class="graph-svg">
            <!-- 边 -->
            <g class="edges">
              <line
                v-for="edge in graphData.edges"
                :key="edge.id"
                :x1="getNodeX(edge.source)"
                :y1="getNodeY(edge.source)"
                :x2="getNodeX(edge.target)"
                :y2="getNodeY(edge.target)"
                :stroke="getEdgeColor(edge.type)"
                stroke-width="1.5"
                stroke-opacity="0.6"
              />
            </g>
            <!-- 节点 -->
            <g class="nodes">
              <g
                v-for="node in graphData.nodes"
                :key="node.id"
                :transform="`translate(${getNodeX(node.id)}, ${getNodeY(node.id)})`"
                class="node-group"
                @click="handleNodeClick(node)"
              >
                <circle r="28" :fill="getNodeColor(node.type)" :opacity="0.9" />
                <circle r="28" fill="transparent" class="node-hover-area" />
                <text text-anchor="middle" dy="4" fill="#fff" font-size="11" font-weight="500">
                  {{ truncateLabel(node.label, 4) }}
                </text>
                <title>{{ node.label }} ({{ node.type }})</title>
              </g>
            </g>
          </svg>
          <div class="graph-legend">
            <span v-for="t in typeList" :key="t.value" class="legend-item">
              <span class="legend-dot" :style="{ background: t.color }"></span>
              {{ t.label }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 节点详情 -->
    <a-drawer
      v-model:visible="drawerVisible"
      :title="selectedNode?.label || '特征详情'"
      width="420"
      :footer-style="{ textAlign: 'right' }"
    >
      <template #footer>
        <a-button @click="drawerVisible = false">关闭</a-button>
      </template>
      <div v-if="selectedNode" class="node-detail">
        <a-descriptions :column="1" bordered size="small">
          <a-descriptions-item label="特征名称">{{ selectedNode.label }}</a-descriptions-item>
          <a-descriptions-item label="特征类型">
            <a-tag :color="getNodeColor(selectedNode.type)">{{ selectedNode.type }}</a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="状态">
            <a-tag :color="selectedNode.status === 'active' ? 'green' : 'gray'">
              {{ selectedNode.status === 'active' ? '活跃' : '已废弃' }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="质量评分">
            <a-rate :model-value="Math.round(selectedNode.quality / 20)" readonly allow-half />
            {{ selectedNode.quality?.toFixed(1) }}
          </a-descriptions-item>
          <a-descriptions-item label="引用次数">{{ selectedNode.usageCount }} 次</a-descriptions-item>
          <a-descriptions-item label="创建者">{{ selectedNode.creator }}</a-descriptions-item>
          <a-descriptions-item label="创建时间">{{ selectedNode.createTime }}</a-descriptions-item>
          <a-descriptions-item label="更新时间">{{ selectedNode.updateTime }}</a-descriptions-item>
          <a-descriptions-item label="描述">{{ selectedNode.description || '无' }}</a-descriptions-item>
        </a-descriptions>

        <div class="detail-section">
          <h4>关联关系</h4>
          <a-table
            :columns="relationColumns"
            :data="getNodeRelations(selectedNode.id)"
            :pagination="false"
            size="small"
          >
            <template #type="{ record }">
              <a-tag :color="getEdgeColor(record.type)">{{ record.type }}</a-tag>
            </template>
          </a-table>
        </div>

        <div class="detail-section">
          <h4>血缘分析</h4>
          <a-button type="outline" size="small" @click="showLineage(selectedNode.id)">
            查看上下游血缘
          </a-button>
        </div>
      </div>
    </a-drawer>

    <!-- 血缘弹窗 -->
    <a-modal v-model:visible="lineageVisible" title="特征血缘分析" width="700px" :footer="null">
      <a-spin v-if="lineageLoading" />
      <div v-else class="lineage-content">
        <div class="lineage-section">
          <h4>上游来源</h4>
          <a-table :data="lineageData.upstream" :pagination="false" size="small">
            <a-table-column title="名称" data-index="name" />
            <a-table-column title="类型" data-index="type" />
            <a-table-column title="转换规则" data-index="transformation" />
          </a-table>
        </div>
        <div class="lineage-section">
          <h4>当前特征</h4>
          <a-descriptions v-if="lineageData.current" :column="2" size="small" bordered>
            <a-descriptions-item label="名称">{{ lineageData.current.name }}</a-descriptions-item>
            <a-descriptions-item label="类型">{{ lineageData.current.type }}</a-descriptions-item>
          </a-descriptions>
        </div>
        <div class="lineage-section">
          <h4>下游去向</h4>
          <a-table :data="lineageData.downstream" :pagination="false" size="small">
            <a-table-column title="名称" data-index="name" />
            <a-table-column title="类型" data-index="type" />
            <a-table-column title="影响范围" data-index="impact" />
          </a-table>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { Message } from '@arco-design/web-vue'
import { IconSearch, IconRefresh } from '@arco-design/web-vue/es/icon'
import { getVariableGraph, getVariableLineage } from '@/api/variable-map'

const searchName = ref('')
const searchType = ref('')
const loading = ref(false)
const drawerVisible = ref(false)
const lineageVisible = ref(false)
const lineageLoading = ref(false)
const selectedNode = ref(null)

const svgWidth = ref(800)
const svgHeight = ref(500)

const graphData = ref({ nodes: [], edges: [] })

const typeList = [
  { value: 'numerical', label: '数值型', color: '#165dff' },
  { value: 'categorical', label: '分类型', color: '#722ed1' },
  { value: 'text', label: '文本型', color: '#52c41a' },
  { value: 'datetime', label: '时间型', color: '#fa8c16' },
  { value: 'boolean', label: '布尔型', color: '#eb2f96' },
]

const relationColumns = [
  { title: '目标特征', dataIndex: 'targetLabel' },
  { title: '关系类型', slotName: 'type' },
]

const nodePositions = reactive({})

function getNodeColor(type) {
  return typeList.find(t => t.value === type)?.color || '#999'
}

function getEdgeColor(type) {
  const colorMap = {
    depends_on: '#165dff',
    derives_from: '#52c41a',
    references: '#fa8c16',
    transforms_to: '#722ed1',
  }
  return colorMap[type] || '#999'
}

function truncateLabel(label, maxLen) {
  return label.length > maxLen ? label.slice(0, maxLen) + '..' : label
}

function getNodeX(nodeId) {
  return nodePositions[nodeId]?.x || 400
}
function getNodeY(nodeId) {
  return nodePositions[nodeId]?.y || 250
}

function assignPositions(nodes) {
  const count = nodes.length
  const cols = Math.ceil(Math.sqrt(count))
  const padding = 60
  const colW = (svgWidth.value - padding * 2) / cols
  const rowH = 90
  nodes.forEach((node, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    nodePositions[node.id] = {
      x: padding + col * colW + colW / 2,
      y: padding + row * rowH + 40,
    }
  })
}

async function fetchGraphData() {
  loading.value = true
  try {
    const res = await getVariableGraph({ name: searchName.value, type: searchType.value })
    if (res?.data) {
      graphData.value = res.data
    } else if (res?.nodes) {
      graphData.value = res
    } else {
      graphData.value = res || { nodes: [], edges: [] }
    }
    assignPositions(graphData.value.nodes || [])
  } catch (e) {

    Message.error('加载特征图谱失败')
    graphData.value = { nodes: [], edges: [] }
  } finally {
    loading.value = false
  }
}

function handleNodeClick(node) {
  selectedNode.value = node
  drawerVisible.value = true
}

function getNodeRelations(nodeId) {
  const relations = []
  const edgeMap = {}
  graphData.value.edges.forEach(edge => {
    if (edge.source === nodeId && !edgeMap[edge.target]) {
      edgeMap[edge.target] = true
      const target = graphData.value.nodes.find(n => n.id === edge.target)
      relations.push({ targetLabel: target?.label || edge.target, type: edge.type })
    }
    if (edge.target === nodeId && !edgeMap[edge.source]) {
      edgeMap[edge.source] = true
      const source = graphData.value.nodes.find(n => n.id === edge.source)
      relations.push({ targetLabel: source?.label || edge.source, type: edge.type })
    }
  })
  return relations
}

const lineageData = ref({ upstream: [], downstream: [], current: null })

async function showLineage(variableId) {
  lineageVisible.value = true
  lineageLoading.value = true
  try {
    const res = await getVariableLineage(variableId)
    lineageData.value = res?.data || res || { upstream: [], downstream: [], current: null }
  } catch (e) {

    lineageData.value = { upstream: [], downstream: [], current: null }
  } finally {
    lineageLoading.value = false
  }
}

function handleRefresh() {
  fetchGraphData()
  Message.success('已刷新')
}

onMounted(() => {
  const container = document.getElementById('variable-graph-canvas')
  if (container) {
    svgWidth.value = container.offsetWidth || 800
    svgHeight.value = Math.max(400, graphData.value.nodes.length * 15)
  }
  fetchGraphData()
})
</script>

<style scoped>
.variable-map-page {
  padding: 20px 24px;
  min-height: 100vh;
  background: var(--color-bg-1, #f7f8fa);
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 20px;
}

.page-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-text-1, #1f2329);
  margin: 0 0 4px 0;
}

.page-subtitle {
  font-size: 13px;
  color: var(--color-text-3, #999);
}

.search-section {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  border: 1px solid #e5e8eb;
}

.graph-section {
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e5e8eb;
  overflow: hidden;
}

.graph-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #e5e8eb;
  background: #fafafa;
}

.graph-title {
  font-size: 14px;
  font-weight: 600;
  color: #1f2329;
}

.graph-stats {
  font-size: 12px;
  color: #999;
}

.graph-container {
  position: relative;
  min-height: 400px;
}

.graph-loading,
.graph-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 400px;
  color: #999;
  font-size: 14px;
}

.graph-canvas {
  position: relative;
  width: 100%;
  overflow-x: auto;
}

.graph-svg {
  display: block;
  min-width: 800px;
}

.node-group {
  cursor: pointer;
  transition: transform 0.15s;
}

.node-group:hover {
  transform: scale(1.15);
}

.node-hover-area {
  cursor: pointer;
}

.graph-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 10px 16px;
  border-top: 1px solid #e5e8eb;
  background: #fafafa;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: #666;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.node-detail {
  padding: 4px 0;
}

.detail-section {
  margin-top: 20px;
}

.detail-section h4 {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 10px 0;
  color: #1f2329;
}

.lineage-content {
  max-height: 500px;
  overflow-y: auto;
}

.lineage-section {
  margin-bottom: 16px;
}

.lineage-section h4 {
  font-size: 13px;
  font-weight: 600;
  color: #1f2329;
  margin: 0 0 8px 0;
  padding-bottom: 6px;
  border-bottom: 1px solid #e5e8eb;
}
</style>
