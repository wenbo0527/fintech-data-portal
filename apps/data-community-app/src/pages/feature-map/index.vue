<template>
  <div class="metrics-map">
    <div class="page-header">
      <h2>特征地图</h2>
    </div>

    <!-- 搜索筛选区域 -->
    <div class="search-section">
      <a-row :gutter="16" justify="end">
        <a-col :span="6">
          <a-input
            v-model="featureFilter.name"
            placeholder="搜索特征名称"
            allow-clear
            @press-enter="fetchFeatureRows"
          >
            <template #prefix>
              <icon-search />
            </template>
          </a-input>
        </a-col>
        <a-col :span="3">
          <a-button type="primary" @click="fetchFeatureRows">
            <template #icon><icon-search /></template>
            搜索
          </a-button>
        </a-col>
      </a-row>
    </div>

    <a-row :gutter="24">
      <!-- 左侧导航树 -->
      <a-col :span="6">
        <a-card title="特征树" :bordered="false">
          <a-tree
            :data="categoryTree"
            :field-names="{ key: 'key', title: 'title', children: 'children' }"
            :show-line="true"
            @select="onCategorySelect"
          />
        </a-card>
      </a-col>
      
      <!-- 右侧内容区 -->
      <a-col :span="18">
        <a-card :bordered="false">
          <a-table
            :data="displayFeatureRows"
            :columns="featureColumns"
            :loading="featureLoading"
            :pagination="featurePagination"
            @page-change="handleFeaturePageChange"
            row-key="id"
          >
            <template #nameCell="{ record }">
              <span class="metric-name" @click="openVariableDetail(record)">{{ record.name }}</span>
            </template>
            <template #majorCategoryCell="{ record }">
              {{ getMajorCategoryLabel(record.majorCategory) }}
            </template>
            <template #level1Cell="{ record }">
              {{ level1Label(record.level1) }}
            </template>
          </a-table>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Graph } from '@antv/x6'
import { Message } from '@arco-design/web-vue'
import { useVariableStore } from '@/store/modules/variable'
import { featureAPI } from '@/api-dca/offlineModel'
import { IconSearch } from '@arco-design/web-vue/es/icon'

const router = useRouter()
const variableStore = useVariableStore()

// 图形容器
const graphContainer = ref(null)
const graph = ref(null)

// 控制参数
const centerVariable = ref('')
const depth = ref(2)
const displayMode = ref('all')
const selectedTypes = ref([])
const selectedRelations = ref(['dependency', 'derivation', 'reference', 'association'])

// 选项数据
const variableOptions = computed(() => {
  const nodes = (variableStore.variableGraph && Array.isArray(variableStore.variableGraph.nodes))
    ? variableStore.variableGraph.nodes
    : []
  return nodes.map(node => ({ id: node.id, name: (node.name || node.label), type: node.type }))
})

// 选中节点
const selectedNode = ref(null)

// 路径分析
const pathAnalysisVisible = ref(false)
const pathAnalysisForm = reactive({
  sourceId: '',
  targetId: '',
  maxDepth: 5
})
const pathAnalysisResult = ref(null)

// 血缘追踪
const lineageVisible = ref(false)
const lineageData = computed(() => variableStore.variableLineage)

// 类型映射
const typeMap = {
  numerical: { label: '数值型', color: '#52c41a' },
  categorical: { label: '分类型', color: 'var(--subapp-info)' },
  text: { label: '文本型', color: '#fa8c16' },
  datetime: { label: '时间型', color: 'var(--subapp-info)' },
  boolean: { label: '布尔型', color: 'var(--subapp-info)' }
}

// 特征列表（征信/行为）
const featureLoading = ref(false)
const featureRows = ref([])
const featureFilter = reactive({ name: '', majorCategory: '', level1: '', level2: '' })
const featurePagination = reactive({ current: 1, pageSize: 10, total: 0, showTotal: true, showJumper: true, showPageSize: true })
const featureColumns = [
  { title: '特征名称', dataIndex: 'name', width: 180, slotName: 'nameCell' },
  { title: '特征编码', dataIndex: 'code', width: 160 },
  { title: '业务类型', dataIndex: 'majorCategory', slotName: 'majorCategoryCell', width: 140 },
  { title: '一级分类', dataIndex: 'level1', slotName: 'level1Cell', width: 140 },
  { title: '二级分类', dataIndex: 'level2', width: 140 },
  { title: '描述', dataIndex: 'description' }
]
const getMajorCategoryLabel = (mc) => ({ credit: '征信特征', behavior: '行为特征' }[mc] || mc || '—')
const level1Label = (l1) => ({
  credit_report: '征信报告',
  credit_history: '信贷记录',
  transaction_behavior: '交易行为',
  activity: '活跃度',
  model_outputs: '模型输出'
}[l1] || l1 || '—')
const categoryTree = computed(() => ([
  {
    key: 'credit', title: '征信特征', children: [
      { key: 'credit_report', title: '征信报告' },
      { key: 'credit_history', title: '信贷记录' }
    ]
  },
  {
    key: 'behavior', title: '行为特征', children: [
      { key: 'transaction_behavior', title: '交易行为' },
      { key: 'activity', title: '活跃度' }
    ]
  }
]))
const sampleRows = [
  { id: 701, name: '征信查询次数', code: 'credit_query_count', description: '征信报告近半年查询次数', majorCategory: 'credit', level1: 'credit_report', level2: 'query_count' },
  { id: 702, name: '征信逾期次数', code: 'credit_overdue_count', description: '征信报告历史逾期次数', majorCategory: 'credit', level1: 'credit_report', level2: 'overdue_count' },
  { id: 703, name: '贷款次数', code: 'loan_times', description: '信贷记录贷款次数', majorCategory: 'credit', level1: 'credit_history', level2: 'loan_times' },
  { id: 704, name: '还款比率', code: 'repay_ratio', description: '信贷记录还款比率', majorCategory: 'credit', level1: 'credit_history', level2: 'repay_ratio' },
  { id: 711, name: '平均交易额', code: 'avg_amount', description: '近三个月平均交易额', majorCategory: 'behavior', level1: 'transaction_behavior', level2: 'avg_amount' },
  { id: 712, name: '交易频次', code: 'frequency', description: '近一周交易次数', majorCategory: 'behavior', level1: 'transaction_behavior', level2: 'frequency' },
  { id: 713, name: '登录天数', code: 'login_days', description: '近一月登录天数', majorCategory: 'behavior', level1: 'activity', level2: 'login_days' },
  { id: 714, name: '会话次数', code: 'session_count', description: '近一周会话次数', majorCategory: 'behavior', level1: 'activity', level2: 'session_count' }
]
const displayFeatureRows = computed(() => {
  const rows = featureRows.value || []
  const filtered = rows.filter(r => r.majorCategory === 'credit' || r.majorCategory === 'behavior')
  const result = filtered.length ? filtered : (rows.length ? rows : sampleRows)
  debugInfo.value = `展示：${result.length}条`
  return result
})
const onCategorySelect = async (keys) => {
  const key = Array.isArray(keys) ? keys[0] : keys
  featureFilter.level1 = ''
  featureFilter.majorCategory = ''
  if (key === 'credit' || key === 'behavior') {
    featureFilter.majorCategory = key
  } else if (key) {
    featureFilter.level1 = key
    featureFilter.majorCategory = ['credit_report', 'credit_history'].includes(key) ? 'credit' : 'behavior'
  }
  featurePagination.current = 1
  await fetchFeatureRows()
}
const fetchFeatureRows = async () => {
  featureLoading.value = true
  try {
    const res = await featureAPI.getFeatures({
      name: featureFilter.name,
      majorCategory: featureFilter.majorCategory,
      level1: featureFilter.level1,
      level2: featureFilter.level2,
      page: featurePagination.current,
      pageSize: featurePagination.pageSize
    })
    const data = Array.isArray(res.data) ? res.data : (res.data?.data || [])
    featureRows.value = (data && data.length) ? data : sampleRows
    featurePagination.total = res.data?.total ?? featureRows.value.length
    debugInfo.value = `加载成功：${featureRows.value.length}条`


  } catch (e) {
    featureRows.value = sampleRows
    featurePagination.total = sampleRows.length
    debugInfo.value = '接口异常，已使用样例数据'

  } finally {
    featureLoading.value = false
  }
}
const handleFeaturePageChange = async (page) => {
  featurePagination.current = page
  await fetchFeatureRows()
}
const debugInfo = ref('初始化中')

// 获取类型标签
const getTypeLabel = (type) => typeMap[type]?.label || type

// 节点详情数据
const nodeDetailData = ref([])
const openVariableDetail = (record) => {
  const q = {
    name: record.name || '',
    code: record.code || '',
    type: 'numerical',
    status: 'draft',
    dataSourceName: getMajorCategoryLabel(record.majorCategory),
    description: record.description || ''
  }
  router.push({ name: 'VariableMapDetail', params: { id: record.code, mode: 'view' }, query: q })
}

// 初始化图形
const initGraph = () => {
  if (!graphContainer.value) {return}

  graph.value = new Graph({
    container: graphContainer.value,
    width: graphContainer.value.offsetWidth,
    height: 600,
    background: {
      color: '#f5f5f5'
    },
    grid: {
      size: 10,
      visible: true
    },
    panning: {
      enabled: true,
      modifiers: 'shift'
    },
    mousewheel: {
      enabled: true,
      modifiers: ['ctrl', 'meta']
    },
    connecting: {
      router: {
        name: 'manhattan',
        args: {
          padding: 20
        }
      },
      connector: {
        name: 'rounded',
        args: {
          radius: 8
        }
      },
      anchor: 'center',
      connectionPoint: 'anchor',
      allowBlank: false,
      snap: {
        radius: 20
      }
    },
    highlighting: {
      magnetAdsorbed: {
        name: 'stroke',
        args: {
          attrs: {
            fill: '#5F95FF',
            stroke: '#5F95FF'
          }
        }
      }
    }
  })

  // 绑定事件
  graph.value.on('node:click', ({ node }) => {
    handleNodeClick(node)
  })

  graph.value.on('blank:click', () => {
    selectedNode.value = null
  })
}

// 获取特征选项 - 现在通过computed自动获取
const fetchVariableOptions = async () => {
  // 特征选项已通过computed属性从store获取

}

// 渲染图形数据
const renderGraph = async () => {
  if (!graph.value) {return}

  // 清空现有数据
  graph.value.clearCells()

  try {
    // 从store获取图形数据
    const graphData = variableStore.variableGraph
    
    if (!graphData || !graphData.nodes || !graphData.edges) {

      return
    }

    // 过滤数据
    let filteredNodes = graphData.nodes
    let filteredEdges = graphData.edges

    // 根据中心特征过滤
    if (centerVariable.value) {
      const centerId = centerVariable.value
      const relatedNodeIds = new Set([centerId])
      
      // 根据深度获取相关节点
      for (let i = 0; i < depth.value; i++) {
        filteredEdges.forEach(edge => {
          if (relatedNodeIds.has(edge.source)) {
            relatedNodeIds.add(edge.target)
          }
          if (relatedNodeIds.has(edge.target)) {
            relatedNodeIds.add(edge.source)
          }
        })
      }
      
      filteredNodes = filteredNodes.filter(node => relatedNodeIds.has(node.id))
      filteredEdges = filteredEdges.filter(edge => 
        relatedNodeIds.has(edge.source) && relatedNodeIds.has(edge.target)
      )
    }

    // 根据显示模式过滤
    if (displayMode.value === 'upstream' && centerVariable.value) {
      const upstreamIds = new Set()
      filteredEdges.forEach(edge => {
        if (edge.target === centerVariable.value) {
          upstreamIds.add(edge.source)
        }
      })
      filteredNodes = filteredNodes.filter(node => 
        node.id === centerVariable.value || upstreamIds.has(node.id)
      )
    } else if (displayMode.value === 'downstream' && centerVariable.value) {
      const downstreamIds = new Set()
      filteredEdges.forEach(edge => {
        if (edge.source === centerVariable.value) {
          downstreamIds.add(edge.target)
        }
      })
      filteredNodes = filteredNodes.filter(node => 
        node.id === centerVariable.value || downstreamIds.has(node.id)
      )
    }

    // 根据类型筛选
    if (selectedTypes.value.length > 0) {
      filteredNodes = filteredNodes.filter(node => selectedTypes.value.includes(node.type))
    }

    // 根据关系类型筛选
    if (selectedRelations.value.length > 0) {
      filteredEdges = filteredEdges.filter(edge => selectedRelations.value.includes(edge.type))
    }

    // 创建节点
    const nodePositions = calculateNodePositions(filteredNodes, centerVariable.value)
    filteredNodes.forEach((node, index) => {
      const position = nodePositions[index] || { x: 100 + index * 150, y: 100 + index * 80 }
      const nodeData = {
        id: node.id,
        x: position.x,
        y: position.y,
        width: 120,
        height: 60,
        shape: 'rect',
        attrs: {
          body: {
            fill: typeMap[node.type]?.color || '#52c41a',
            stroke: '#000',
            strokeWidth: 1,
            rx: 8,
            ry: 8
          },
          label: {
            text: (node.name || node.label || node.id),
            fill: '#fff',
            fontSize: 12,
            fontWeight: 'bold',
            textAnchor: 'middle',
            textVerticalAnchor: 'middle'
          }
        },
        data: node
      }
      graph.value.addNode(nodeData)
    })

    // 创建边
    filteredEdges.forEach(edge => {
      const edgeData = {
        source: edge.source,
        target: edge.target,
        shape: 'edge',
        attrs: {
          line: {
            stroke: getRelationColor(edge.type),
            strokeWidth: Math.max(1, ((typeof edge.strength === 'number' ? edge.strength : 0.5) * 3)),
            targetMarker: {
              name: 'classic',
              size: 8
            }
          }
        },
        labels: [{
          attrs: {
            text: {
              text: getRelationLabel(edge.type),
              fontSize: 10,
              fill: '#666'
            }
          }
        }],
        data: edge
      }
      graph.value.addEdge(edgeData)
    })

    // 自动布局
    graph.value.centerContent()

  } catch (error) {

    Message.error('渲染图形失败')
  }
}

// 计算节点位置
const calculateNodePositions = (nodes, centerId) => {
  const positions = []
  const centerIndex = nodes.findIndex(node => node.id === centerId)
  
  if (centerIndex === -1) {
    // 没有中心节点，使用网格布局
    return nodes.map((node, index) => ({
      x: 100 + (index % 4) * 200,
      y: 100 + Math.floor(index / 4) * 150
    }))
  }

  // 中心节点在中心位置
  const centerX = 400
  const centerY = 300
  positions[centerIndex] = { x: centerX, y: centerY }

  // 其他节点围绕中心节点分布
  let angle = 0
  const radius = 200
  nodes.forEach((node, index) => {
    if (index !== centerIndex) {
      positions[index] = {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius
      }
      angle += (2 * Math.PI) / (nodes.length - 1)
    }
  })

  return positions
}

// 获取关系颜色
const getRelationColor = (type) => {
  const colorMap = {
    dependency: '#52c41a',
    derivation: 'var(--subapp-info)',
    reference: '#fa8c16',
    association: 'var(--subapp-info)'
  }
  return colorMap[type] || '#666'
}

// 获取关系标签
const getRelationLabel = (type) => {
  const labelMap = {
    dependency: '依赖',
    derivation: '衍生',
    reference: '引用',
    association: '关联'
  }
  return labelMap[type] || type
}

// 处理节点点击：跳转特征详情（只读视图）
const handleNodeClick = (node) => {
  const d = node.getData()
  if (d && d.id) {
    router.push({ name: 'VariableMapDetail', params: { id: d.id, mode: 'view' } })
  }
}

// 处理中心特征变化
const handleCenterVariableChange = () => {
  renderGraph()
}

// 处理深度变化
const handleDepthChange = () => {
  renderGraph()
}

// 处理显示模式变化
const handleDisplayModeChange = () => {
  renderGraph()
}

// 处理类型筛选变化
const handleTypeFilterChange = () => {
  renderGraph()
}

// 处理关系筛选变化
const handleRelationFilterChange = () => {
  renderGraph()
}

// 重置布局
const handleResetLayout = () => {
  if (graph.value) {
    graph.value.centerContent()
  }
}

// 导出图片
const handleExportImage = () => {
  if (graph.value) {
    graph.value.toPNG((dataUri) => {
      const link = document.createElement('a')
      link.download = 'variable-map.png'
      link.href = dataUri
      link.click()
    })
  }
}

// 路径分析
const handleAnalyzePath = () => {
  pathAnalysisVisible.value = true
  pathAnalysisResult.value = null
}

// 执行路径分析
const handleExecutePathAnalysis = async () => {
  if (!pathAnalysisForm.sourceId || !pathAnalysisForm.targetId) {
    Message.warning('请选择起始特征和目标特征')
    return
  }

  try {
    // Mock路径分析结果
    const sourceNode = variableOptions.value.find(v => v.id === pathAnalysisForm.sourceId) || { id: (pathAnalysisForm.sourceId || 'source'), name: '起始特征', type: 'numerical' }
    const targetNode = variableOptions.value.find(v => v.id === pathAnalysisForm.targetId) || { id: (pathAnalysisForm.targetId || 'target'), name: '目标特征', type: 'numerical' }
    
    pathAnalysisResult.value = {
      length: 2,
      nodes: [
        sourceNode,
        { id: 'var_005', name: '用户等级', type: 'categorical' },
        targetNode
      ]
    }

    Message.success('路径分析完成')
  } catch (error) {

    Message.error('路径分析失败')
  }
}

// 显示血缘追踪
const handleShowLineage = () => {
  if (!centerVariable.value) {
    Message.warning('请先选择一个中心特征')
    return
  }
  
  fetchLineageData(centerVariable.value)
  lineageVisible.value = true
}

// 获取血缘数据
const fetchLineageData = async (variableId) => {
  try {
    await variableStore.fetchVariableLineage(variableId)
  } catch (error) {

    Message.error('获取血缘数据失败')
  }
}

// 关闭详情面板
const handleCloseDetail = () => {
  selectedNode.value = null
}

// 查看特征详情
const handleViewVariableDetail = () => {
  if (selectedNode.value) {
    router.push({ name: 'VariableMapDetail', params: { id: selectedNode.value.id, mode: 'view' } })
  }
}

// 置为中心节点
const handleCenterOnNode = () => {
  if (selectedNode.value) {
    centerVariable.value = selectedNode.value.id
    renderGraph()
  }
}

// 显示节点血缘
const handleShowNodeLineage = () => {
  if (selectedNode.value) {
    fetchLineageData(selectedNode.value.id)
    lineageVisible.value = true
  }
}

// 初始化
onMounted(async () => {
  // 预置样例数据，避免初始空白
  featureRows.value = sampleRows
  featurePagination.total = sampleRows.length
  debugInfo.value = `预置样例：${sampleRows.length}条`
  await fetchFeatureRows()
})

// 清理
onUnmounted(() => {
  if (graph.value) {
    graph.value.dispose()
  }
})
</script>

<style scoped>
.metrics-map {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.search-section {
  margin-bottom: 20px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 6px;
}

.metric-name {
  font-weight: 500;
  color: var(--subapp-info);
  cursor: pointer;
}

.metric-name:hover {
  text-decoration: underline;
}
</style>
