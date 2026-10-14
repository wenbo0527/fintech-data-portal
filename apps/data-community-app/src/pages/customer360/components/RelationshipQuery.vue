<template>
  <div class="relationship-query">
    <!-- 查询控制面板 -->
    <div class="query-panel">
      <div class="panel-header">
        <h4>关系查询</h4>
        <div class="query-actions">
          <a-button type="primary" @click="executeQuery" :loading="loading">
            <template #icon><IconSearch /></template>
            查询关系
          </a-button>
          <a-button @click="resetQuery">
            <template #icon><IconRefresh /></template>
            重置
          </a-button>

        </div>
      </div>
      
      <div class="query-form">
        <a-row :gutter="16">
          <a-col :span="6">
            <a-form-item label="关系类型">
              <a-select 
                v-model="queryParams.relationshipType" 
                placeholder="选择关系类型"
                multiple
                allow-clear
              >
                <a-option value="family">家庭关系</a-option>
                <a-option value="guarantee">担保关系</a-option>
                <a-option value="co_loan">共同借贷</a-option>
                <a-option value="emergency">紧急联系人</a-option>
                <a-option value="business">商业关系</a-option>
                <a-option value="social">社交关系</a-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="查询深度">
              <a-select v-model="queryParams.depth" placeholder="选择查询深度">
                <a-option :value="1">一度关系</a-option>
                <a-option :value="2">二度关系</a-option>
                <a-option :value="3">三度关系</a-option>
                <a-option :value="4">四度关系</a-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="关系强度">
              <a-select v-model="queryParams.strengthFilter" placeholder="筛选关系强度">
                <a-option value="all">全部</a-option>
                <a-option value="strong">强关系</a-option>
                <a-option value="medium">中等关系</a-option>
                <a-option value="weak">弱关系</a-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="风险等级">
              <a-select v-model="queryParams.riskFilter" placeholder="筛选风险等级">
                <a-option value="all">全部</a-option>
                <a-option value="high">高风险</a-option>
                <a-option value="medium">中风险</a-option>
                <a-option value="low">低风险</a-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
      </div>
    </div>

    <!-- 关系统计概览 -->
    <div class="relationship-stats" v-if="relationshipStats">
      <a-row :gutter="16">
        <a-col :span="6">
          <div class="stat-card">
            <div class="stat-value">{{ relationshipStats.totalNodes }}</div>
            <div class="stat-label">关系节点</div>
          </div>
        </a-col>
        <a-col :span="6">
          <div class="stat-card">
            <div class="stat-value">{{ relationshipStats.totalEdges }}</div>
            <div class="stat-label">关系连接</div>
          </div>
        </a-col>
        <a-col :span="6">
          <div class="stat-card">
            <div class="stat-value">{{ relationshipStats.riskNodes }}</div>
            <div class="stat-label">风险节点</div>
          </div>
        </a-col>
        <a-col :span="6">
          <div class="stat-card">
            <div class="stat-value">{{ relationshipStats.maxDepth }}</div>
            <div class="stat-label">最大深度</div>
          </div>
        </a-col>
      </a-row>
    </div>

    <!-- 关系图谱可视化 -->
    <div class="relationship-visualization">
      <div class="viz-header">
        <h5>关系图谱</h5>
        <div class="viz-controls">
          <a-button-group>
            <a-button 
              :type="viewMode === 'graph' ? 'primary' : 'secondary'"
              @click="viewMode = 'graph'"
            >
              <template #icon><IconExpand /></template>
              图谱视图
            </a-button>
            <a-button 
              :type="viewMode === 'tree' ? 'primary' : 'secondary'"
              @click="viewMode = 'tree'"
            >
              <template #icon><IconBranch /></template>
              树形视图
            </a-button>
            <a-button 
              :type="viewMode === 'table' ? 'primary' : 'secondary'"
              @click="viewMode = 'table'"
            >
              <template #icon><IconList /></template>
              表格视图
            </a-button>
          </a-button-group>
          
          <a-button @click="fitToScreen">
            <template #icon><IconFullscreen /></template>
            适应屏幕
          </a-button>
        </div>
      </div>
      
      <!-- 图谱容器 -->
      <div class="graph-container" v-show="viewMode === 'graph'">
        <RelationshipGraph
          :data="graphData"
          :width="800"
          :height="500"
          @node-click="handleNodeClick"
          @edge-click="handleEdgeClick"
          @node-details="handleNodeDetails"
          @risk-analysis="handleRiskAnalysis"
        />
        <div class="graph-legend">
          <div class="legend-item" v-for="type in relationshipTypes" :key="type.key">
            <div class="legend-color" :style="{ backgroundColor: type.color }"></div>
            <span class="legend-label">{{ type.label }}</span>
          </div>
        </div>
      </div>
      
      <!-- 树形视图 -->
      <div class="tree-container" v-show="viewMode === 'tree'">
        <a-tree 
          :data="treeData" 
          :show-line="true"
          :default-expand-all="false"
          :virtual-list-props="{ height: 400 }"
        >
          <template #title="nodeData">
            <div class="tree-node">
              <div class="node-info">
                <span class="node-name">{{ nodeData.name }}</span>
                <a-tag 
                  :color="getRelationshipColor(nodeData.relationship)"
                  size="small"
                >
                  {{ getRelationshipLabel(nodeData.relationship) }}
                </a-tag>
              </div>
              <div class="node-meta">
                <span class="node-strength">强度: {{ nodeData.strength }}</span>
                <a-tag 
                  :color="getRiskColor(nodeData.risk)"
                  size="small"
                >
                  {{ nodeData.risk }}
                </a-tag>
              </div>
            </div>
          </template>
        </a-tree>
      </div>
      
      <!-- 表格视图 -->
      <div class="table-container" v-show="viewMode === 'table'">
        <a-table 
          :data="tableData"
          :columns="tableColumns"
          :pagination="tablePagination"
          :loading="loading"
          row-key="id"
        >
          <template #relationship="{ record }">
            <a-tag :color="getRelationshipColor(record.relationship)">
              {{ getRelationshipLabel(record.relationship) }}
            </a-tag>
          </template>
          
          <template #strength="{ record }">
            <div class="strength-indicator">
              <a-progress 
                :percent="record.strengthPercent" 
                :color="getStrengthColor(record.strength)"
                size="small"
                :show-text="false"
              />
              <span class="strength-text">{{ record.strength }}</span>
            </div>
          </template>
          
          <template #risk="{ record }">
            <a-tag :color="getRiskColor(record.risk)">
              {{ record.risk }}
            </a-tag>
          </template>
          
          <template #actions="{ record }">
            <a-button type="text" @click="viewNodeDetails(record)">
              查看详情
            </a-button>
            <a-button type="text" @click="analyzeRiskPath(record)">
              风险分析
            </a-button>
          </template>
        </a-table>
      </div>
    </div>

    <!-- 关系路径分析 -->
    <div class="path-analysis" v-if="selectedPath">
      <div class="analysis-header">
        <h5>关系路径分析</h5>
        <a-button @click="selectedPath = null">
          <template #icon><IconClose /></template>
          关闭
        </a-button>
      </div>
      
      <div class="path-content">
        <div class="path-visualization">
          <div class="path-steps">
            <div 
              v-for="(step, index) in selectedPath.steps" 
              :key="index"
              class="path-step"
            >
              <div class="step-node">
                <div class="node-avatar">
                  <IconUser />
                </div>
                <div class="node-info">
                  <div class="node-name">{{ step.name }}</div>
                  <div class="node-id">{{ step.id }}</div>
                </div>
              </div>
              
              <div v-if="index < selectedPath.steps.length - 1" class="step-arrow">
                <IconArrowRight />
                <div class="relationship-info">
                  <span class="relationship-type">{{ step.relationshipType }}</span>
                  <span class="relationship-strength">强度: {{ step.strength }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="path-analysis-details">
          <a-descriptions :column="2" bordered>
            <a-descriptions-item label="路径长度">{{ selectedPath.length }}</a-descriptions-item>
            <a-descriptions-item label="总体风险">{{ selectedPath.totalRisk }}</a-descriptions-item>
            <a-descriptions-item label="平均强度">{{ selectedPath.averageStrength }}</a-descriptions-item>
            <a-descriptions-item label="关键节点">{{ selectedPath.keyNodes }}</a-descriptions-item>
          </a-descriptions>
        </div>
      </div>
    </div>

    <!-- 节点详情弹窗 -->
    <a-modal 
      v-model:visible="nodeDetailVisible"
      title="节点详情"
      width="800px"
      :footer="false"
    >
      <div v-if="selectedNode" class="node-details">
        <a-descriptions :column="2" bordered>
          <a-descriptions-item label="姓名">{{ selectedNode.name }}</a-descriptions-item>
          <a-descriptions-item label="身份证号">{{ selectedNode.idCard }}</a-descriptions-item>
          <a-descriptions-item label="手机号">{{ selectedNode.phone }}</a-descriptions-item>
          <a-descriptions-item label="关系类型">{{ getRelationshipLabel(selectedNode.relationship) }}</a-descriptions-item>
          <a-descriptions-item label="关系强度">{{ selectedNode.strength }}</a-descriptions-item>
          <a-descriptions-item label="风险等级">{{ selectedNode.risk }}</a-descriptions-item>
          <a-descriptions-item label="最后更新">{{ formatDate(selectedNode.lastUpdate) }}</a-descriptions-item>
          <a-descriptions-item label="数据来源">{{ selectedNode.dataSource }}</a-descriptions-item>
        </a-descriptions>
        
        <div class="node-additional-info">
          <h6>关联信息</h6>
          <a-table 
            :data="selectedNode.relatedInfo"
            :columns="relatedInfoColumns"
            :pagination="false"
            size="small"
          />
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { Message } from '@arco-design/web-vue'
import RelationshipGraph from './RelationshipGraph.vue'
import {
  IconSearch,
  IconRefresh,
  IconExpand,
  IconBranch,
  IconList,
  IconFullscreen,
  IconClose,
  IconArrowRight,
  IconUser
} from '@arco-design/web-vue/es/icon'

interface Props {
  productKey?: string
  userInfo?: any
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  productKey: ''
})

// 响应式数据
const loading = ref(false)
const viewMode = ref<'graph' | 'tree' | 'table'>('graph')
const graphRef = ref<HTMLElement>()
const nodeDetailVisible = ref(false)
const selectedNode = ref<any>(null)
const selectedPath = ref<any>(null)

// 查询参数
const queryParams = ref({
  relationshipType: ['family', 'guarantee'],
  depth: 2,
  strengthFilter: 'all',
  riskFilter: 'all'
})

// 关系类型定义
const relationshipTypes = [
  { key: 'family', label: '家庭关系', color: 'var(--subapp-info)' },
  { key: 'guarantee', label: '担保关系', color: '#52c41a' },
  { key: 'co_loan', label: '共同借贷', color: '#faad14' },
  { key: 'emergency', label: '紧急联系人', color: '#722ed1' },
  { key: 'business', label: '商业关系', color: 'var(--subapp-info)' },
  { key: 'social', label: '社交关系', color: '#eb2f96' }
]

// 模拟关系数据
interface RelationshipNode {
  id: string
  name: string
  idCard: string
  phone: string
  relationship: string
  strength: number
  risk: string
  x: number
  y: number
  isCenter?: boolean
  depth?: number
}

const relationshipData = ref<{ nodes: RelationshipNode[]; edges: any[] }>({
  nodes: [
    {
      id: 'center',
      name: '张三',
      idCard: '110101199001011234',
      phone: '13800138000',
      relationship: 'self',
      strength: 1.0,
      risk: 'medium',
      x: 400,
      y: 300,
      isCenter: true
    },
    {
      id: 'node1',
      name: '李四',
      idCard: '110101199002021234',
      phone: '13800138001',
      relationship: 'family',
      strength: 0.9,
      risk: 'low',
      x: 200,
      y: 200
    },
    {
      id: 'node2',
      name: '王五',
      idCard: '110101199003031234',
      phone: '13800138002',
      relationship: 'guarantee',
      strength: 0.8,
      risk: 'high',
      x: 600,
      y: 200
    },
    {
      id: 'node3',
      name: '赵六',
      idCard: '110101199004041234',
      phone: '13800138003',
      relationship: 'co_loan',
      strength: 0.7,
      risk: 'medium',
      x: 300,
      y: 450
    }
  ],
  edges: [
    {
      id: 'edge1',
      source: 'center',
      target: 'node1',
      relationship: 'family',
      strength: 0.9,
      label: '配偶'
    },
    {
      id: 'edge2',
      source: 'center',
      target: 'node2',
      relationship: 'guarantee',
      strength: 0.8,
      label: '担保人'
    },
    {
      id: 'edge3',
      source: 'center',
      target: 'node3',
      relationship: 'co_loan',
      strength: 0.7,
      label: '共同借款人'
    }
  ]
})

// 计算属性
const hasRelationshipData = computed(() => {
  return relationshipData.value.nodes.length > 1
})

// 图谱数据
const graphData = computed(() => {
  return {
    nodes: relationshipData.value.nodes,
    edges: relationshipData.value.edges
  }
})

const relationshipStats = computed(() => {
  if (!hasRelationshipData.value) {return null}
  
  const nodes = relationshipData.value.nodes
  const edges = relationshipData.value.edges
  
  return {
    totalNodes: nodes.length,
    totalEdges: edges.length,
    riskNodes: nodes.filter(node => node.risk === 'high').length,
    maxDepth: Math.max(...nodes.map(node => node.depth || 1))
  }
})

const treeData = computed(() => {
  // 将图数据转换为树形结构
  const centerNode = relationshipData.value.nodes.find(node => node.isCenter)
  if (!centerNode) {return []}
  
  const buildTree = (nodeId: string, visited = new Set()): any => {
    if (visited.has(nodeId)) {return null}
    visited.add(nodeId)
    
    const node = relationshipData.value.nodes.find(n => n.id === nodeId)
    if (!node) {return null}
    
    const children = relationshipData.value.edges
      .filter(edge => edge.source === nodeId)
      .map(edge => buildTree(edge.target, visited))
      .filter(child => child !== null)
    
    return {
      key: node.id,
      title: node.name,
      name: node.name,
      relationship: node.relationship,
      strength: node.strength,
      risk: node.risk,
      children: children.length > 0 ? children : undefined
    }
  }
  
  return [buildTree(centerNode.id)].filter(node => node !== null)
})

const tableData = computed(() => {
  return relationshipData.value.nodes
    .filter(node => !node.isCenter)
    .map(node => ({
      ...node,
      strengthPercent: Math.round(node.strength * 100)
    }))
})

const tableColumns = [
  { title: '姓名', dataIndex: 'name', width: 120 },
  { title: '身份证号', dataIndex: 'idCard', width: 180 },
  { title: '手机号', dataIndex: 'phone', width: 130 },
  { title: '关系类型', slotName: 'relationship', width: 120 },
  { title: '关系强度', slotName: 'strength', width: 150 },
  { title: '风险等级', slotName: 'risk', width: 100 },
  { title: '操作', slotName: 'actions', width: 150 }
]

const relatedInfoColumns = [
  { title: '信息类型', dataIndex: 'type', width: 120 },
  { title: '内容', dataIndex: 'content', width: 200 },
  { title: '更新时间', dataIndex: 'updateTime', width: 150 }
]

const tablePagination = {
  current: 1,
  pageSize: 10,
  total: 0,
  showTotal: true,
  showPageSize: true
}

// 更新分页 total
watch(tableData, (newData) => {
  tablePagination.total = newData.length
}, { immediate: true })

// 图谱事件处理
const handleNodeClick = (node: any) => {
  Message.info(`点击了节点: ${node.name}`)
}

const handleEdgeClick = (edge: any) => {
  Message.info(`点击了关系: ${getRelationshipLabel(edge.relationship)}`)
}

const handleNodeDetails = (node: any) => {
  viewNodeDetails(node)
}

const handleRiskAnalysis = (node: any) => {
  analyzeRiskPath(node)
}

// 方法
const executeQuery = async () => {
  loading.value = true
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 这里应该调用实际的API
    // const result = await relationshipAPI.query(queryParams.value)
    // relationshipData.value = result
    
    Message.success('关系查询完成')
    
    // 如果是图谱视图，重新渲染图谱
    if (viewMode.value === 'graph') {
      await nextTick()
      renderGraph()
    }
  } catch (error) {
    Message.error('查询失败，请重试')
  } finally {
    loading.value = false
  }
}

const resetQuery = () => {
  queryParams.value = {
    relationshipType: ['family', 'guarantee'],
    depth: 2,
    strengthFilter: 'all',
    riskFilter: 'all'
  }
  
  // 清空结果
  relationshipData.value = {
    nodes: [],
    edges: []
  }
}



const renderGraph = () => {
  if (!graphRef.value || !hasRelationshipData.value) {return}
  
  // 这里应该使用实际的图形库（如D3.js、AntV G6等）来渲染关系图谱
  // 由于篇幅限制，这里只是一个占位符
}

const fitToScreen = () => {
  // 适应屏幕大小
  if (viewMode.value === 'graph') {
    renderGraph()
  }
}

const viewNodeDetails = (node: any) => {
  selectedNode.value = {
    ...node,
    lastUpdate: new Date(),
    dataSource: '内部系统',
    relatedInfo: [
      { type: '贷款记录', content: '3笔', updateTime: '2024-01-15' },
      { type: '信用评分', content: '750', updateTime: '2024-01-10' },
      { type: '资产信息', content: '房产1套', updateTime: '2024-01-05' }
    ]
  }
  nodeDetailVisible.value = true
}

const analyzeRiskPath = (node: any) => {
  selectedPath.value = {
    steps: [
      {
        id: 'center',
        name: '张三',
        relationshipType: '起点',
        strength: 1.0
      },
      {
        id: node.id,
        name: node.name,
        relationshipType: getRelationshipLabel(node.relationship),
        strength: node.strength
      }
    ],
    length: 1,
    totalRisk: node.risk,
    averageStrength: node.strength,
    keyNodes: node.name
  }
}

const getRelationshipLabel = (type: string) => {
  const typeMap: Record<string, string> = {
    family: '家庭关系',
    guarantee: '担保关系',
    co_loan: '共同借贷',
    emergency: '紧急联系人',
    business: '商业关系',
    social: '社交关系',
    self: '本人'
  }
  return typeMap[type] || type
}

const getRelationshipColor = (type: string) => {
  const colorMap: Record<string, string> = {
    family: 'blue',
    guarantee: 'green',
    co_loan: 'orange',
    emergency: 'purple',
    business: 'cyan',
    social: 'magenta',
    self: 'gray'
  }
  return colorMap[type] || 'default'
}

const getRiskColor = (risk: string) => {
  const colorMap: Record<string, string> = {
    high: 'red',
    medium: 'orange',
    low: 'green'
  }
  return colorMap[risk] || 'default'
}

const getStrengthColor = (strength: number) => {
  if (strength >= 0.8) {return '#52c41a'}
  if (strength >= 0.5) {return '#faad14'}
  return 'var(--subapp-danger)'
}

const formatDate = (date: Date) => {
  return date.toLocaleDateString('zh-CN')
}

// 生命周期
onMounted(() => {
  // 初始化时执行一次查询
  executeQuery()
})

// 监听视图模式变化
watch(viewMode, (newMode) => {
  if (newMode === 'graph') {
    nextTick(() => {
      renderGraph()
    })
  }
})
</script>

<style scoped>
.relationship-query {
  padding: 16px;
  background: #fff;
  border-radius: 6px;
}

/* 查询面板 */
.query-panel {
  margin-bottom: 24px;
  padding: 16px;
  background: #fafafa;
  border-radius: 6px;
  border: 1px solid #e8e8e8;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.panel-header h4 {
  margin: 0;
  color: var(--subapp-text-primary);
  font-size: 16px;
  font-weight: 600;
}

.query-actions {
  display: flex;
  gap: 8px;
}

.query-form {
  margin-top: 16px;
}

/* 统计概览 */
.relationship-stats {
  margin-bottom: 24px;
}

.stat-card {
  text-align: center;
  padding: 16px;
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  transition: all 0.3s ease;
}

.stat-card:hover {
  border-color: var(--subapp-info);
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.1);
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: var(--subapp-info);
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: var(--subapp-text-tertiary);
}

/* 可视化容器 */
.relationship-visualization {
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  overflow: hidden;
}

.viz-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #fafafa;
  border-bottom: 1px solid #e8e8e8;
}

.viz-header h5 {
  margin: 0;
  color: var(--subapp-text-primary);
  font-size: 14px;
  font-weight: 600;
}

.viz-controls {
  display: flex;
  gap: 8px;
  align-items: center;
}

/* 图谱视图 */
.graph-container {
  position: relative;
  height: 500px;
  background: #fff;
}

.graph-canvas {
  width: 100%;
  height: 100%;
  border: 1px dashed #d9d9d9;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--subapp-text-tertiary);
  font-size: 14px;
}

.graph-canvas::before {
  content: '关系图谱将在此处显示';
}

.graph-legend {
  position: absolute;
  top: 16px;
  right: 16px;
  background: rgba(255, 255, 255, 0.9);
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #e8e8e8;
}

.legend-item {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.legend-item:last-child {
  margin-bottom: 0;
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 2px;
  margin-right: 8px;
}

.legend-label {
  font-size: 12px;
  color: var(--subapp-text-secondary);
}

/* 树形视图 */
.tree-container {
  padding: 16px;
  max-height: 500px;
  overflow-y: auto;
}

.tree-node {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.node-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.node-name {
  font-weight: 500;
  color: var(--subapp-text-primary);
}

.node-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--subapp-text-tertiary);
}

.node-strength {
  font-size: 12px;
}

/* 表格视图 */
.table-container {
  padding: 16px;
}

.strength-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.strength-text {
  font-size: 12px;
  color: var(--subapp-text-secondary);
  min-width: 30px;
}

/* 路径分析 */
.path-analysis {
  margin-top: 24px;
  padding: 16px;
  background: #fafafa;
  border-radius: 6px;
  border: 1px solid #e8e8e8;
}

.analysis-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.analysis-header h5 {
  margin: 0;
  color: var(--subapp-text-primary);
  font-size: 14px;
  font-weight: 600;
}

.path-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.path-visualization {
  background: #fff;
  padding: 16px;
  border-radius: 6px;
  border: 1px solid #e8e8e8;
}

.path-steps {
  display: flex;
  align-items: center;
  gap: 16px;
  overflow-x: auto;
  padding: 8px 0;
}

.path-step {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
}

.step-node {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f0f0f0;
  border-radius: 6px;
  border: 1px solid #d9d9d9;
}

.node-avatar {
  width: 32px;
  height: 32px;
  background: var(--subapp-info);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 16px;
}

.node-info {
  display: flex;
  flex-direction: column;
}

.node-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--subapp-text-primary);
}

.node-id {
  font-size: 12px;
  color: var(--subapp-text-tertiary);
}

.step-arrow {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: var(--subapp-text-tertiary);
}

.relationship-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 12px;
}

.relationship-type {
  color: var(--subapp-text-primary);
  font-weight: 500;
}

.relationship-strength {
  color: var(--subapp-text-tertiary);
}

.path-analysis-details {
  background: #fff;
  padding: 16px;
  border-radius: 6px;
  border: 1px solid #e8e8e8;
}

/* 节点详情 */
.node-details {
  padding: 16px 0;
}

.node-additional-info {
  margin-top: 24px;
}

.node-additional-info h6 {
  margin: 0 0 12px 0;
  color: var(--subapp-text-primary);
  font-size: 14px;
  font-weight: 600;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .query-form .arco-col {
    margin-bottom: 16px;
  }
  
  .panel-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .query-actions {
    width: 100%;
    justify-content: flex-end;
  }
  
  .viz-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .viz-controls {
    width: 100%;
    justify-content: space-between;
  }
  
  .path-steps {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .step-arrow {
    transform: rotate(90deg);
  }
}
</style>