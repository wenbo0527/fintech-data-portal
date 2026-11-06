<!-- 核心业务流程组件主容器 -->
<template>
  <div class="business-process-flow">

    <!-- 步骤导航区域 -->
    <a-card class="steps-card" :bordered="false">
      <template #title>
        <div class="steps-header">
          <div class="steps-title-group">
            <h3 class="steps-title">业务流程</h3>
          </div>
          <div class="steps-actions">
            <div class="steps-filters">
              <div class="filter-group">
                <span class="filter-label">业务产品</span>
                <a-cascader 
                  v-model="cascaderValue" 
                  :options="cascaderOptions"
                  size="small"
                  :style="{width:'200px'}"
                  placeholder="请选择业务类型和产品类型"
                  @change="onCascaderChange"
                  expand-trigger="hover"
                  :show-search="true"
                />
              </div>
            </div>
            <div class="steps-stats">
              <span class="step-count">共 {{ currentProcessSteps.length }} 个步骤</span>
              <a-button type="primary" size="small" @click="openEditModal">
                <template #icon><IconEdit /></template>
                编辑流程
              </a-button>
            </div>
          </div>
        </div>
      </template>
      
      <div class="enhanced-steps">
        <div 
          v-for="(step, index) in currentProcessSteps" 
          :key="index"
          :class="['step-item', { 'active': activeStep === index, 'completed': index < activeStep }]"
          @click="selectStep(index)"
        >
          <div class="step-indicator">
            <div class="step-number">{{ index + 1 }}</div>
            <div v-if="index < currentProcessSteps.length - 1" class="step-connector"></div>
          </div>
          <div class="step-content">
            <h4 class="step-title">{{ step.name }}</h4>
          </div>
        </div>
      </div>
      
      <!-- 当前步骤信息概览 -->
      <div class="current-step-overview">
        <div class="step-overview">
          <div class="step-indicator">
            <div class="step-circle">{{ activeStep + 1 }}</div>
            <div class="step-total">/ {{ currentProcessSteps.length }}</div>
          </div>
          <div class="step-content">
            <h2 class="step-name">{{ currentProcessSteps[activeStep]?.name }}</h2>
            <p class="step-description">{{ currentProcessSteps[activeStep]?.description }}</p>
            <div class="step-stats">
              <span class="stat-item">
                <IconFile class="stat-icon" />
                {{ currentTables.length }} 个数据表
              </span>
              <span class="stat-item">
                <IconBarChart class="stat-icon" />
                {{ currentMetrics.length }} 个指标
              </span>
            </div>
          </div>
        </div>
      </div>
    </a-card>
      
    <!-- 主要内容区域 -->
    <div class="main-content">

      <!-- 数据展示区域 - 使用Tab布局 -->
      <a-card class="data-content-card" :bordered="false">
        <template #extra>
          <div class="tab-extra-actions">
            <a-button type="text" size="small" @click="activeTab === 'tables' ? editTableBinding() : editMetricBinding()">
              <template #icon><IconEdit /></template>
              编辑绑定
            </a-button>
            <a-select 
               v-model="currentViewMode"
               size="small"
               :style="{width:'100px'}"
             >
              <a-option value="grid">网格</a-option>
              <a-option value="list">列表</a-option>
            </a-select>
          </div>
        </template>
        
        <a-tabs 
          v-model:active-key="activeTab" 
          type="line" 
          size="large"
          class="data-tabs"
        >
          <!-- 核心底表Tab -->
          <a-tab-pane key="tables" title="核心底表">
            <template #title>
              <div class="tab-title">
                <IconFile class="tab-icon" />
                <span>核心底表</span>
              </div>
            </template>
            
            <div class="tab-content">
              
              <div class="tables-container">
                <!-- 有数据表时显示 -->
                <div v-if="currentTables.length > 0">
                  <!-- 网格视图 -->
                  <div v-if="tableViewMode === 'grid'" class="tables-grid-view">
                    <div 
                      v-for="table in currentTables" 
                      :key="table.name"
                      class="table-card"
                      @click="showTableDetail(table)"
                    >
                      <div class="table-header">
                        <h5 class="table-name">{{ table.name }}</h5>
                        <a-tag v-if="table.type" size="small" color="green">{{ table.type }}</a-tag>
                      </div>
                      <p class="table-desc">{{ table.description }}</p>
                      <div class="table-footer">
                        <span class="table-owner">
                          <IconUser class="owner-icon" />
                          {{ table.owner || '未指定' }}
                        </span>
                        <a-button type="text" size="mini">
                          <template #icon><IconEye /></template>
                        </a-button>
                      </div>
                    </div>
                  </div>
                  
                  <!-- 列表视图 -->
                  <div v-else class="tables-list-view">
                    <a-table 
                      :data="currentTables" 
                      :columns="optimizedTableColumns"
                      :pagination="true"
                      :page-size="10"
                      size="small"
                      @row-click="showTableDetail"
                      :loading="tableLoading"
                    />
                  </div>
                </div>
                
                <!-- 无数据表时的空状态 -->
                <div v-else class="empty-tables-state">
                  <div class="empty-content">
                    <IconFile class="empty-icon" />
                    <h4 class="empty-title">当前步骤暂无关联数据表</h4>
                    <p class="empty-description">该业务步骤尚未配置相关的数据表，您可以通过编辑流程来添加数据表关联。</p>
                    <a-button type="primary" @click="openEditModal">
                      <template #icon><IconEdit /></template>
                      配置数据表
                    </a-button>
                  </div>
                </div>
              </div>
            </div>
          </a-tab-pane>

          <!-- 业务指标Tab -->
          <a-tab-pane key="metrics" title="业务指标">
            <template #title>
              <div class="tab-title">
                <IconBarChart class="tab-icon" />
                <span>业务指标</span>
              </div>
            </template>
            
            <div class="tab-content">
              
              <div class="metrics-container">
                <!-- 有指标时显示 -->
                <div v-if="currentMetrics.length > 0">
                  <!-- 网格视图 -->
                  <div v-if="metricViewMode === 'grid'" class="metrics-grid-view">
                    <div 
                      v-for="metric in currentMetrics" 
                      :key="metric.name"
                      class="metric-card"
                      @click="showMetricDetail(metric)"
                    >
                      <div class="metric-header">
                        <h5 class="metric-name">{{ metric.name }}</h5>
                        <a-tag v-if="metric.unit" size="small" color="blue">{{ metric.unit }}</a-tag>
                      </div>
                      <p class="metric-desc">{{ metric.description }}</p>
                      <div class="metric-footer">
                        <span class="metric-owner">
                          <IconUser class="owner-icon" />
                          {{ metric.owner || '未指定' }}
                        </span>
                        <a-button type="text" size="mini">
                          <template #icon><IconEye /></template>
                        </a-button>
                      </div>
                    </div>
                  </div>
                  
                  <!-- 列表视图 -->
                  <div v-else class="metrics-list-view">
                    <a-table 
                      :data="currentMetrics" 
                      :columns="optimizedMetricColumns"
                      :pagination="true"
                      :page-size="8"
                      size="small"
                      @row-click="showMetricDetail"
                    />
                  </div>
                </div>
                
                <!-- 无指标时的空状态 -->
                <div v-else class="empty-metrics-state">
                  <div class="empty-content">
                    <IconBarChart class="empty-icon" />
                    <h4 class="empty-title">当前步骤暂无关联指标</h4>
                    <p class="empty-description">该业务步骤尚未配置相关的业务指标，您可以通过编辑流程来添加指标关联。</p>
                    <a-button type="primary" @click="openEditModal">
                      <template #icon><IconEdit /></template>
                      配置指标
                    </a-button>
                  </div>
                </div>
              </div>
            </div>
          </a-tab-pane>
        </a-tabs>
      </a-card>
    </div>

    <!-- 弹窗逻辑已移除，现在直接使用抽屉的两阶段界面 -->

    <!-- 业务流程编辑抽屉 -->
    <BusinessProcessDrawer
      v-model:visible="editDrawerVisible"
      :mode="currentEditProcess ? 'edit' : 'create'"
      :process-id="currentEditProcess?.id?.toString()"
      @save="saveBusinessProcess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, h, unref } from 'vue'
import { useRouter } from 'vue-router'
import { 
  IconInfoCircle,
  IconFile,
  IconBarChart,
  IconEdit,
  IconCheck,
  IconClose,
  IconEye,
  IconUser,
  IconPlus,
  IconDelete,
  IconClockCircle
} from '@arco-design/web-vue/es/icon'
import { Message } from '@arco-design/web-vue';
import { processSteps, tableColumns } from '@/mock/businessProcessData'
import BusinessProcessDrawer from '@/components-dca/business-process/BusinessProcessDrawer.vue'
import { domainTree, buildCascaderOptions, findDomainNameById, findScenarioNameById } from '@/mock/businessModuleData'

interface TableField {
  name: string
  type: string
  description: string
}

interface TableMetric {
  name: string
  description: string
  formula?: string
  unit?: string
  owner?: string
}

interface TableItem {
  name: string
  description: string
  type: string
  fields?: TableField[]
  metrics?: TableMetric[]
}

interface ProcessStep {
  name: string
  description: string
  icon?: string
  tables: TableItem[]
}

const router = useRouter()
const emit = defineEmits<{
  (e: 'show-table-detail', table: TableItem): void
}>()

const activeStep = ref<number>(0)
const businessType = ref<string>(domainTree[0]?.id || '')
const productType = ref<string>(domainTree[0]?.children?.[0]?.id || '')
const cascaderValue = ref<string[]>([businessType.value, productType.value])

const cascaderOptions = ref(buildCascaderOptions(domainTree))

// 视图模式和加载状态
const tableViewMode = ref<string>('grid')
const metricViewMode = ref<string>('grid')
const tableLoading = ref<boolean>(false)

// Tab切换状态
const activeTab = ref<string>('tables')

// 搜索和分页状态
const tableSearchText = ref<string>('')
const metricSearchText = ref<string>('')
const currentPage = ref<number>(1)
const metricCurrentPage = ref<number>(1)

// 编辑状态
const isEditing = ref(false)
const selectedTables = ref<TableItem[]>([])

// 编辑抽屉状态
const editDrawerVisible = ref(false)
const currentEditProcess = ref<{id: number, name: string, description: string, businessType: string, productType: string, stepCount: number, creator: string, updateTime: string} | null>(null)

// 保留原有的模态框宽度计算（虽然不再使用弹窗，但可能其他地方需要）
const modalWidth = computed(() => {
  if (typeof window !== 'undefined') {
    return Math.min(800, window.innerWidth * 0.9)
  }
  return 800
})

// 流程列表数据
const processList = ref([
  {
    id: 1,
    name: '个人信贷业务流程',
    description: '个人信贷业务的完整流程，包含申请、审核、放款等环节',
    businessType: 'self',
    productType: 'personal',
    stepCount: 6,
    creator: '张三',
    updateTime: '2024-01-15 14:30'
  },
  {
    id: 2,
    name: '企业贷款业务流程',
    description: '企业贷款业务流程，涵盖企业资质审核、风险评估等步骤',
    businessType: 'self',
    productType: 'business',
    stepCount: 8,
    creator: '李四',
    updateTime: '2024-01-12 09:15'
  },
  {
    id: 3,
    name: '贷超平台流程',
    description: '贷超平台业务流程，包含渠道对接、订单分发等环节',
    businessType: 'supermarket',
    productType: 'general',
    stepCount: 5,
    creator: '王五',
    updateTime: '2024-01-10 16:45'
  }
])

// 根据业务类型获取对应的流程步骤
const currentProcessSteps = computed(() => {
  // 这里可以根据业务类型和产品类型返回不同的步骤
  // 目前使用默认的processSteps，后续可以扩展
  return processSteps
})

// 当前步骤的数据表
const currentTables = computed(() => {
  if (activeStep.value >= 0 && activeStep.value < currentProcessSteps.value.length) {
    return currentProcessSteps.value[activeStep.value].tables
  }
  return []
})



// 确保组件挂载后高亮第一个步骤
onMounted(() => {






  selectStep(0);
})

// 优化的表格列定义
const optimizedTableColumns = [
  { 
    title: '表名', 
    dataIndex: 'name',
    width: 180,
    ellipsis: true,
    tooltip: true,
    render: ({ record }: { record: any }) => {
      return h('div', { class: 'table-name-cell' }, [
        h('span', { class: 'table-name' }, record.name),
        h('span', { class: 'table-type' }, record.type)
      ])
    }
  },
  { 
    title: '描述', 
    dataIndex: 'description',
    ellipsis: true,
    tooltip: true
  },
  { 
    title: '负责人', 
    dataIndex: 'owner',
    width: 100,
    render: ({ record }: { record: { owner?: string } }) => {
      return h('span', { class: 'owner-name' }, record.owner || '未指定')
    }
  }
]

// 字段列定义
const fieldColumns = [
  { title: '字段名', dataIndex: 'name' },
  { title: '使用说明', dataIndex: 'usage', render: ({ record }: { record: { usage?: string } }) => (
    record.usage || '暂无说明'
  )},
  { title: '描述', dataIndex: 'description' },
  { title: '管理员', dataIndex: 'owner', render: ({ record }: { record: { owner?: string } }) => (
    record.owner || '未指定'
  )}
]

// 级联选择器变化处理
const onCascaderChange = (value: string[]) => {
  if (value && value.length === 2) {
    businessType.value = value[0]
    productType.value = value[1]
    Message.info(`已切换到${getBusinessTypeName(value[0])} - ${getProductTypeName(value[1])}`)
  }
}

// 业务类型变更处理
const onBusinessTypeChange = (value: string) => {
  Message.info(`已切换到${getBusinessTypeName(value)}`)
}

// 产品类型变更处理
const onProductTypeChange = (value: string) => {
  Message.info(`已切换到${getProductTypeName(value)}`)
}

// 获取业务类型名称
const getBusinessTypeName = (type: string) => findDomainNameById(type) || '未知'

// 获取产品类型名称
const getProductTypeName = (type: string) => findScenarioNameById(type) || '未知'

// 当前步骤的业务指标
const currentMetrics = computed(() => {
  if (activeStep.value < 0 || activeStep.value >= currentProcessSteps.value.length) {return []}
  const metrics = currentProcessSteps.value[activeStep.value].tables.flatMap(table => {
    return table.metrics || []
  });
  return metrics;
})

// 当前视图模式计算属性（支持双向绑定）
const currentViewMode = computed({
  get: () => {
    // 使用unref确保在正确的渲染上下文中访问响应式数据
    const currentTab = unref(activeTab)
    const tableMode = unref(tableViewMode)
    const metricMode = unref(metricViewMode)
    return currentTab === 'tables' ? tableMode : metricMode
  },
  set: (value: string) => {
    const currentTab = unref(activeTab)
    if (currentTab === 'tables') {
      tableViewMode.value = value
    } else {
      metricViewMode.value = value
    }
  }
})

// 获取步骤的指标数量
const getStepMetricsCount = (step: ProcessStep) => {
  return step.tables.reduce((count, table) => {
    return count + (table.metrics?.length || 0)
  }, 0)
}

// 搜索处理函数
const handleTableSearch = (value: string) => {
  tableSearchText.value = value
  currentPage.value = 1 // 重置到第一页
}

const handleMetricSearch = (value: string) => {
  metricSearchText.value = value
  metricCurrentPage.value = 1 // 重置到第一页
}

// 优化的指标列定义
const optimizedMetricColumns = [
  {
    title: '指标名称',
    dataIndex: 'name',
    key: 'name',
    width: 180,
    render: ({ record }: { record: any }) => {
      return h('div', { class: 'metric-name-cell' }, [
        h('div', { class: 'metric-name' }, record.name),
        h('span', { class: 'metric-unit' }, record.unit ? `(${record.unit})` : '')
      ])
    }
  },
  {
    title: '计算公式',
    dataIndex: 'formula',
    key: 'formula',
    ellipsis: true,
    tooltip: true,
    render: ({ record }: { record: { formula?: string } }) => {
      return h('code', { class: 'formula-code' }, record.formula)
    }
  },
  {
    title: '负责人',
    dataIndex: 'owner',
    key: 'owner',
    width: 100,
    render: ({ record }: { record: { owner?: string } }) => {
      return h('span', { class: 'owner-name' }, record.owner)
    }
  }
]

const metricColumns = [
  { title: '指标名称', dataIndex: 'name' },
  { title: '负责人', dataIndex: 'owner', render: ({ record }: { record: { owner?: string } }) => (
    `<span>${record.owner || '未指定'}</span>`
  )},
  { title: '业务口径', dataIndex: 'description' }
]

const showMetricDetail = (metric: any) => {

}

const getStepTooltipContent = (stepIndex: number) => {
  const step = processSteps[stepIndex]
  return `管理员: ${step.owner || '未指定'}`
}

// 选择步骤
/**
 * 选择业务流程步骤
 * @param {number} index - 要切换到的步骤索引
 */
const selectStep = (index: number) => {
  if (index < 0 || index >= currentProcessSteps.value.length) {return;}
  if (index === activeStep.value) {return;} // 避免重复点击同一索引
  
  console.groupCollapsed(`[业务流程] 切换到步骤: ${index + 1}. ${currentProcessSteps.value[index].name} (索引: ${index})`)
  
  // 更新activeStep为点击的索引
  activeStep.value = index;
  
  // 重置搜索和分页状态
  tableSearchText.value = ''
  metricSearchText.value = ''
  currentPage.value = 1
  metricCurrentPage.value = 1
  
  // 重置编辑状态
  isEditing.value = false;
  selectedTables.value = [];




}

// 显示表详情
/**
 * 显示数据表详情
 * @param {TableItem} record - 点击的数据表对象
 */
const showTableDetail = (record: TableItem) => {
  if(isEditing.value) {return}


  console.log('点击时间:', new Date().toLocaleString())

  router.push({
    name: 'TableDetail',
    params: { 
      tableName: record.name,
      tableData: encodeURIComponent(JSON.stringify(record))
    }
  })
}

const startEditing = () => {
  isEditing.value = true
}

const cancelEditing = () => {
  isEditing.value = false
}

const saveChanges = () => {
  isEditing.value = false

}

// 编辑数据表绑定
const editTableBinding = () => {

  Message.info('编辑数据表绑定功能')
}

// 编辑指标绑定
const editMetricBinding = () => {

  Message.info('编辑指标绑定功能')
}

// 视图模式变更处理
const handleViewModeChange = (value: string) => {

  // 通过currentViewMode计算属性的setter自动处理
}

// 直接打开编辑抽屉（第一阶段：流程选择）
const openEditModal = () => {
  // 直接打开抽屉的第一阶段，不传入具体的流程ID
  currentEditProcess.value = null
  editDrawerVisible.value = true
}

// 新增流程（已废弃，由抽屉内部处理）
const createNewProcess = () => {
  currentEditProcess.value = null
  editDrawerVisible.value = true
}

// 编辑流程（已废弃，由抽屉内部处理）
const editProcess = (process: any) => {
  // 不再直接编辑具体流程，而是打开流程选择界面
  currentEditProcess.value = null
  editDrawerVisible.value = true
}

// 删除流程功能已移至 ProcessSelectionView 组件内部处理

// 获取业务类型文本
const getBusinessTypeText = (type: string) => {
  const typeMap: Record<string, string> = {
    'self': '自营',
    'supermarket': '贷超',
    'assist': '助贷'
  }
  return typeMap[type] || type
}

// 获取产品类型文本
const getProductTypeText = (type: string) => {
  const typeMap: Record<string, string> = {
    'general': '通用',
    'personal': '个人贷',
    'business': '企业贷',
    'mortgage': '房贷',
    'car': '车贷'
  }
  return typeMap[type] || type
}

// 保存业务流程
const saveBusinessProcess = (data: any) => {

  if (currentEditProcess.value) {
    // 编辑模式
    const index = processList.value.findIndex(p => p.id === currentEditProcess.value!.id)
    if (index > -1) {
      processList.value[index] = { ...processList.value[index], ...data }
      Message.success('业务流程更新成功')
    }
  } else {
    // 新增模式
    const newProcess = {
      id: Date.now(),
      ...data,
      creator: '当前用户',
      updateTime: new Date().toLocaleString('zh-CN')
    }
    processList.value.push(newProcess)
    Message.success('业务流程创建成功')
  }
  
  editDrawerVisible.value = false
  currentEditProcess.value = null
}
</script>

<style scoped>
/* 主容器样式 */
.business-process-flow {
  padding: 20px;
  width: 100%;
  box-sizing: border-box;
  background: var(--color-bg-1);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 流程卡片样式 */
.flow-card {
  margin-bottom: 24px;
  transition: all 0.3s var(--arco-curve-ease-in-out);
  border-radius: var(--border-radius-large);
  background: linear-gradient(135deg, var(--color-bg-2) 0%, var(--color-bg-1) 100%);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid var(--color-border-1);
  overflow: hidden;

  &:hover {
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
    transform: translateY(-2px);
  }
}

/* 当前步骤信息样式 */
.current-step-info {
  margin-bottom: 32px;
  padding: 24px;
  background: linear-gradient(135deg, var(--color-primary-light-1) 0%, var(--color-primary-light-2) 100%);
  border-radius: var(--border-radius-medium);
  border: 1px solid var(--color-primary-light-3);
}

.step-overview {
  display: flex;
  align-items: center;
  gap: 24px;
}

.step-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.step-circle {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--color-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 700;
  box-shadow: 0 4px 12px rgba(var(--arcoblue-6), 0.3);
}

.step-total {
  font-size: 18px;
  color: var(--color-text-2);
  font-weight: 500;
}

.step-content {
  flex: 1;
}

.step-name {
  font-size: 28px;
  font-weight: 700;
  color: var(--color-text-1);
  margin: 0 0 8px 0;
  line-height: 1.2;
}

.step-description {
  font-size: 16px;
  color: var(--color-text-2);
  margin: 0 0 16px 0;
  line-height: 1.5;
}

.step-stats {
  display: flex;
  gap: 24px;
  align-items: center;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: var(--border-radius-small);
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-1);
  border: 1px solid var(--color-border-2);
}

.stat-icon {
  font-size: 16px;
  color: var(--color-primary);
}

/* 步骤导航样式 */
.steps-navigation {
  margin-top: 24px;
}

.nav-step-number {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--color-fill-2);
  color: var(--color-text-2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.3s;
}

/* 数据卡片标题样式 */
.data-card-title {
  h3 {
    font-size: 20px;
    font-weight: 600;
    color: var(--color-text-1);
    margin: 0 0 4px 0;
    line-height: 1.3;
  }
  
  .data-subtitle {
    font-size: 14px;
    color: var(--color-text-3);
    margin: 0;
    line-height: 1.4;
  }
}

/* 卡片标题样式 */
.card-title {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 8px 0;
  
  .title-section {
    flex: 1;
    
    .title-text {
      font-size: 28px;
      font-weight: 700;
      color: var(--color-text-1);
      margin: 0 0 8px 0;
      background: linear-gradient(135deg, var(--color-primary-6), var(--color-primary-4));
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      line-height: 1.2;
    }
    
    .title-subtitle {
      font-size: 14px;
      color: var(--color-text-3);
      margin: 0;
      line-height: 1.5;
      font-weight: 400;
    }
    
    .business-config {
      display: flex;
      gap: 20px;
      margin-top: 16px;
      align-items: center;
      flex-wrap: wrap;
      
      .config-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background: rgba(255, 255, 255, 0.8);
        border-radius: var(--border-radius-small);
        border: 1px solid var(--color-border-2);
        transition: all 0.3s ease;
        
        &:hover {
          background: rgba(255, 255, 255, 0.95);
          border-color: var(--color-primary-3);
          box-shadow: 0 2px 8px rgba(var(--primary-6-rgb), 0.15);
        }
        
        .config-label {
          font-size: 14px;
          font-weight: 500;
          color: var(--color-text-2);
          margin: 0;
          white-space: nowrap;
        }
      }
    }
    }
  }
  
  .info-icon {
    font-size: 20px;
    color: var(--color-text-3);
    transition: all 0.2s ease;
    cursor: help;
    padding: 8px;
    border-radius: var(--border-radius-medium);
    
    &:hover {
      color: var(--color-primary-6);
      background: var(--color-primary-light-1);
      transform: scale(1.1);
    }
  }


/* 流程容器样式 */
.process-container {
  padding: 32px 24px;
  background: var(--color-bg-1);
  border-radius: var(--border-radius-medium);
  margin: 16px 0;
}

/* 步骤组件样式 */
.process-steps {
  margin-bottom: 32px;
  
  :deep(.arco-steps-item) {
    cursor: pointer;
    transition: all 0.3s var(--arco-curve-ease-in-out);
    padding: 16px;
    border-radius: var(--border-radius-large);
    margin: 0 8px;
    position: relative;
    
    &:hover {
      background: var(--color-primary-light-1);
      transform: translateY(-2px);
      box-shadow: 0 4px 16px rgba(var(--primary-6-rgb), 0.15);
    }
    
    &:active {
      transform: translateY(0);
    }
  }
  
  :deep(.arco-steps-item-title) {
    font-size: 16px;
    font-weight: 600;
    color: var(--color-text-1);
    margin-bottom: 8px;
    transition: color 0.2s ease;
  }
  
  :deep(.arco-steps-item-description) {
    color: var(--color-text-2);
    font-size: 13px;
    line-height: 1.6;
    max-width: 200px;
    word-break: break-word;
    transition: color 0.2s ease;
  }
  
  :deep(.arco-steps-item-active) {
    background: linear-gradient(135deg, var(--color-primary-light-1), var(--color-primary-light-2));
    border: 2px solid var(--color-primary-6);
    box-shadow: 0 0 0 4px rgba(var(--primary-6-rgb), 0.1);
    
    .arco-steps-item-title {
      color: var(--color-primary-6);
      font-weight: 700;
    }
    
    .arco-steps-item-description {
      color: var(--color-text-1);
      font-weight: 500;
    }
  }
  
  :deep(.arco-steps-item:hover) {
    .arco-steps-item-title {
      color: var(--color-primary-6);
    }
    
    .arco-steps-item-description {
      color: var(--color-primary-5);
    }
  }
}

/* 步骤数字样式 */
.step-number {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--color-primary-6);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
  transition: all 0.2s ease;
}

/* 进度指示器样式 */
.progress-indicator {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 24px;
  padding: 16px;
  background: var(--color-bg-2);
  border-radius: var(--border-radius-medium);
  border: 1px solid var(--color-border-2);
  
  .progress-bar {
    flex: 1;
    height: 8px;
    background: var(--color-fill-2);
    border-radius: 4px;
    overflow: hidden;
    position: relative;
    
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--color-primary-6), var(--color-primary-4));
      border-radius: 4px;
      transition: width 0.5s var(--arco-curve-ease-in-out);
      position: relative;
      
      &::after {
        content: '';
        position: absolute;
        top: 0;
        right: 0;
        width: 20px;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3));
        animation: shimmer 2s infinite;
      }
    }
  }
  
  .progress-text {
    font-size: 14px;
    font-weight: 600;
    color: var(--color-text-1);
    white-space: nowrap;
    padding: 4px 12px;
    background: var(--color-primary-light-1);
    border-radius: var(--border-radius-small);
    border: 1px solid var(--color-primary-3);
  }
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

/* 步骤卡片样式 */
.steps-card {
  transition: all 0.3s var(--arco-curve-ease-in-out);
  border-radius: 12px;
  background: linear-gradient(135deg, #ffffff 0%, #f9fafc 100%);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  border: 1px solid var(--color-border-2);
  overflow: hidden;
  
  &:hover {
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
    transform: translateY(-2px);
  }
}

/* 步骤区域样式 */
.steps-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 4px 0;
}

.steps-title-group {
  display: flex;
  align-items: center;
  flex: 1;
}

.steps-title {
  margin: 0;
  color: var(--color-text-1);
  font-size: 18px;
  font-weight: 600;
  white-space: nowrap;
}

.steps-actions {
  display: flex;
  align-items: center;
  gap: 24px;
}

.steps-filters {
  display: flex;
  align-items: center;
  gap: 16px;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-label {
  color: var(--color-text-2);
  font-size: 13px;
  white-space: nowrap;
  font-weight: 500;
}

.steps-stats {
  display: flex;
  align-items: center;
  gap: 12px;
}

.step-count {
  color: var(--color-text-3);
  font-size: 13px;
  white-space: nowrap;
}

/* 步骤卡片 */
.steps-card {
  margin-bottom: 24px;
  border-radius: 8px;
  box-shadow: 0 2px 8px var(--color-shadow-light);
  background: var(--color-bg-1);
  border: 1px solid var(--color-border-1);
}

.steps-card :deep(.arco-card-header) {
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border-2);
  background: var(--color-bg-2);
}

.steps-card :deep(.arco-card-body) {
  padding: 20px;
  background: var(--color-bg-1);
}

/* 增强的步骤样式 */
.enhanced-steps {
  display: flex;
  gap: 0;
  padding: 12px 16px;
  background: var(--color-bg-2);
  border-radius: 8px;
  flex-wrap: nowrap;
  justify-content: space-between;
  overflow-x: hidden;
  border: 1px solid var(--color-border-1);
}

.step-item {
  position: relative;
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 120px;
  max-width: 160px;
  padding: 8px 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 6px;
  background: transparent;
  border: 1px solid transparent;
}

.step-item:hover {
  background: var(--color-fill-2);
  border: 1px solid var(--color-border-2);
}

.step-item.active {
  background: var(--color-primary-light-1);
  border: 1px solid var(--color-primary-4);
  box-shadow: 0 2px 4px var(--color-primary-light-3);
}

.step-item.completed {
  background: var(--color-success-light-1);
  border: 1px solid var(--color-success-4);
  box-shadow: 0 1px 3px var(--color-success-light-3);
}

.step-indicator {
  position: relative;
  display: flex;
  align-items: center;
  margin-right: 8px;
  z-index: 2;
}

.step-number {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--color-bg-3);
  color: var(--color-text-1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid var(--color-border-3);
  transition: all 0.2s ease;
}

.step-item.active .step-number {
  background: var(--color-primary-6);
  color: white;
  border-color: var(--color-primary-6);
}

.step-item.completed .step-number {
  background: var(--color-success-6);
  color: white;
  border-color: var(--color-success-6);
}

.step-connector {
  position: absolute;
  top: 50%;
  left: 34px;
  width: calc(100% - 34px);
  height: 2px;
  background: var(--color-border-3);
  transform: translateY(-50%);
  z-index: 1;
}

.step-item.completed .step-connector {
  background: var(--color-success-5);
}

.step-content {
  flex: 1;
  min-width: 0;
}

.step-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-1);
  margin: 0;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}

/* 当前步骤概览样式 */
.current-step-overview {
  margin-top: 20px;
  padding: 20px;
  background: var(--color-bg-1);
  border-radius: 8px;
  border: 1px solid var(--color-border-2);
  box-shadow: 0 1px 4px var(--color-shadow-light);
}

.step-overview {
  display: flex;
  align-items: center;
  gap: 16px;
}

.step-overview .step-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.step-circle {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--color-primary-6);
  color: var(--color-white);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 600;
  box-shadow: 0 2px 6px var(--color-primary-light-4);
}

.step-total {
  font-size: 16px;
  color: var(--color-text-2);
  font-weight: 500;
}

.step-overview .step-content {
  flex: 1;
}

.step-name {
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text-1);
  margin: 0 0 8px 0;
}

.step-description {
  font-size: 14px;
  color: var(--color-text-2);
  margin: 0 0 12px 0;
  line-height: 1.5;
}

.step-stats {
  display: flex;
  gap: 24px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: var(--color-text-2);
}

.stat-icon {
  font-size: 16px;
  color: var(--color-primary-6);
}

.step-item.active .step-title {
  color: var(--color-primary-6);
  font-weight: 600;
}

.step-item.completed .step-title {
  color: var(--color-success-6);
  font-weight: 600;
}

.step-meta {
  display: flex;
  gap: 16px;
  margin-top: 12px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--color-text-2);
  background: var(--color-fill-2);
  padding: 6px 12px;
  border-radius: 16px;
  font-weight: 500;
  border: 1px solid var(--color-border-2);
}

.step-item.active .meta-item {
  background: rgba(var(--arcoblue-6), 0.1);
  border-color: rgba(var(--arcoblue-6), 0.2);
  color: var(--color-primary-6);
}

.meta-icon {
  font-size: 14px;
  color: var(--color-primary-6);
}

/* 步骤信息卡片 */
.step-info-card {
  background: linear-gradient(135deg, #f6f9fc 0%, #ffffff 100%);
  border-radius: 12px;
  margin-bottom: 24px;
  border-left: 4px solid var(--color-primary-6);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

/* 内容布局 */
.content-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-top: 24px;
}

/* 数据区域 */
.data-section {
  background: var(--color-bg-1);
  border-radius: 12px;
  border: 1px solid var(--color-border-2);
  overflow: hidden;
  transition: all 0.3s ease;
}

.data-section:hover {
  border-color: var(--color-primary-3);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

/* 区域标题 */
.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  color: var(--color-text-1);
  font-size: 16px;
  font-weight: 600;
}

.title-icon {
  font-size: 16px;
  color: var(--color-primary-6);
}

.count-badge {
  margin-left: 8px;
}

/* 表格容器 */
.table-container {
  padding: 0;
}

/* 指标容器 */
.metrics-container {
  padding: 0;
}

/* 指标网格视图 */
.metrics-grid-view {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  padding: 20px;
}

.metric-card {
  padding: 16px;
  background: var(--color-bg-1);
  border-radius: 8px;
  border: 1px solid var(--color-border-2);
  transition: all 0.2s ease;
  cursor: pointer;
}

.metric-card:hover {
  background: var(--color-primary-light-1);
  border-color: var(--color-primary-3);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.metric-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.metric-name {
  font-weight: 600;
  color: var(--color-text-1);
  margin: 0;
  font-size: 14px;
}

.metric-desc {
  color: var(--color-text-2);
  font-size: 13px;
  line-height: 1.5;
  margin: 0 0 12px 0;
}

.metric-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.metric-owner {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--color-text-3);
  font-size: 12px;
}

.owner-icon {
  font-size: 12px;
}

/* 指标列表视图 */
.metrics-list-view {
  padding: 0;
}



/* 步骤信息样式 */
.step-info {
  padding: 24px 0;
  
  .step-header {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 16px;
    
    .step-badge {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--color-primary-6), var(--color-primary-4));
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 18px;
      box-shadow: 0 4px 12px rgba(var(--primary-6-rgb), 0.3);
    }
    
    .step-details {
      flex: 1;
      
      .step-title {
        margin: 0 0 4px 0;
        font-size: 24px;
        font-weight: 700;
        color: var(--color-text-1);
        line-height: 1.2;
      }
      
      .step-description {
        margin: 0;
        color: var(--color-text-2);
        font-size: 14px;
        line-height: 1.5;
      }
    }
  }
  
  .step-meta {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }
}

/* Tab标题样式 */
.tab-title {
  display: flex;
  align-items: center;
  gap: 8px;
  
  .tab-icon {
    font-size: 16px;
  }
}

/* 区域样式 */
.table-section,
.metrics-section {
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 20px;
    padding: 16px;
    background: var(--color-bg-1);
    border-radius: var(--border-radius-medium);
    border: 1px solid var(--color-border-2);
    
    .section-title {
      h4 {
        margin: 0 0 4px 0;
        font-size: 18px;
        font-weight: 600;
        color: var(--color-text-1);
      }
      
      .section-subtitle {
        margin: 0;
        font-size: 13px;
        color: var(--color-text-3);
      }
    }
    
    .table-actions {
      display: flex;
      gap: 8px;
      align-items: center;
      flex-wrap: wrap;
    }
  }
}

/* 搜索和操作区域 */
.search-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border-2);
  background: var(--color-bg-1);
}

.search-input {
  width: 240px;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

/* 表格样式优化 */
:deep(.arco-table) {
  border: none;
  border-radius: var(--border-radius-medium);
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  
  .arco-table-thead {
    background: var(--color-bg-1);
    
    .arco-table-th {
      background: var(--color-bg-1);
      border-bottom: 2px solid var(--color-border-2);
      
      .arco-table-cell {
        font-weight: 600;
        color: var(--color-text-1);
        font-size: 14px;
      }
    }
  }
  
  .arco-table-tbody {
    .arco-table-tr {
      transition: all 0.2s ease;
      cursor: pointer;
      
      &:hover {
        background: var(--color-primary-light-1) !important;
        transform: scale(1.01);
        box-shadow: 0 2px 8px rgba(var(--primary-6-rgb), 0.1);
      }
      
      .arco-table-td {
        border-bottom: 1px solid var(--color-border-1);
        
        .arco-table-cell {
          padding: 12px 16px;
          font-size: 13px;
          line-height: 1.5;
        }
      }
    }
  }
}

/* 表格单元格样式 */
:deep(.table-name-cell) {
  .table-name {
    font-weight: 600;
    color: var(--color-text-1);
    display: block;
    margin-bottom: 2px;
  }
  
  .table-type {
    font-size: 11px;
    color: var(--color-text-3);
    background: var(--color-fill-2);
    padding: 2px 6px;
    border-radius: var(--border-radius-small);
  }
}

:deep(.metric-name-cell) {
  .metric-name {
    font-weight: 600;
    color: var(--color-text-1);
  }
}

:deep(.owner-cell) {
  .owner-name {
    color: var(--color-text-2);
    font-size: 13px;
  }
}

:deep(.action-cell) {
  .view-action {
    color: var(--color-primary-6);
    font-size: 12px;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: var(--border-radius-small);
    transition: all 0.2s ease;
    
    &:hover {
      background: var(--color-primary-light-1);
      color: var(--color-primary-5);
    }
  }
}

:deep(.formula-code) {
  background: var(--color-fill-2);
  padding: 2px 6px;
  border-radius: var(--border-radius-small);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 11px;
  color: var(--color-text-1);
  border: 1px solid var(--color-border-2);
}

/* 行悬停样式 */
:deep(.table-row-hover:hover),
:deep(.metric-row-hover:hover) {
  background: var(--color-primary-light-1) !important;
  cursor: pointer;
}

/* 桌面端优化样式 */
.business-process-container {
  width: 100%;
}

/* 表格内容优化 */
:deep(.arco-table-tbody-td) {
  vertical-align: top;
}

/* 卡片间距优化 */
.content-grid > .data-card {
  min-height: 400px;
}

/* 指标项悬停效果增强 */
.metric-item:hover .metric-name {
  color: var(--color-primary-6);
}

/* 指标操作区域样式 */
.metrics-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 数据表操作区域样式 */
.tables-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 数据表网格视图样式 */
.tables-grid-view {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
  padding: 16px 0;
}

.table-card {
  background: var(--color-bg-2);
  border: 1px solid var(--color-border-2);
  border-radius: var(--border-radius-medium);
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: var(--color-primary-light-4);
    box-shadow: 0 4px 12px rgba(var(--arcoblue-6), 0.15);
    transform: translateY(-2px);
  }
}

.table-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.table-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-1);
  margin: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.table-desc {
  font-size: 12px;
  color: var(--color-text-3);
  line-height: 1.4;
  margin: 0 0 12px 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.table-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.table-owner {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--color-text-2);
}

.tables-list-view {
  padding: 16px 0;
}

/* 当前步骤信息概览样式 */
.current-step-info {
  margin-bottom: 16px;
  background: linear-gradient(135deg, #f7f8fa 0%, #ffffff 100%);
  border: 1px solid var(--color-border-1);
}

.step-overview {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 8px 0;
}

.step-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.step-circle {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-primary-6) 0%, var(--color-primary-5) 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(var(--arcoblue-6), 0.3);
}

.step-total {
  font-size: 16px;
  color: var(--color-text-2);
  font-weight: 500;
}

.step-content {
  flex: 1;
}

.step-name {
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text-1);
  margin: 0 0 8px 0;
  line-height: 1.3;
}

.step-description {
  font-size: 14px;
  color: var(--color-text-2);
  margin: 0 0 12px 0;
  line-height: 1.5;
}

.step-stats {
  display: flex;
  gap: 24px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--color-text-2);
  background: var(--color-fill-2);
  padding: 4px 12px;
  border-radius: 12px;
}

.stat-icon {
  font-size: 14px;
  color: var(--color-primary-6);
}

/* Tab布局样式 */
.data-content-card {
  background: white;
  border: 1px solid var(--color-border-1);
}

.tab-extra-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.data-tabs {
  :deep(.arco-tabs-nav) {
    margin-bottom: 0;
    border-bottom: 1px solid var(--color-border-2);
    background: var(--color-fill-1);
    padding: 0 24px;
  }
  
  :deep(.arco-tabs-tab) {
    padding: 16px 0;
    margin-right: 32px;
    font-weight: 500;
  }
  
  :deep(.arco-tabs-content) {
    padding: 0;
  }
}

.tab-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tab-icon {
  font-size: 16px;
}

.tab-badge {
  :deep(.arco-badge-number) {
    background: var(--color-primary-6);
    font-size: 11px;
    min-width: 18px;
    height: 18px;
    line-height: 18px;
  }
}

.tab-content {
  padding: 24px;
}

.content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--color-border-2);
}

.content-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 空状态样式 */
.empty-tables-state,
.empty-metrics-state {
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafafa;
  border-radius: 8px;
  border: 2px dashed var(--subapp-border);
  margin-top: 16px;
}

.empty-content {
  text-align: center;
  padding: 40px 20px;
}

.empty-icon {
  font-size: 48px;
  color: #c9cdd4;
  margin-bottom: 16px;
}

.empty-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--subapp-text-secondary);
  margin: 0 0 8px 0;
}

.empty-description {
  font-size: 14px;
  color: var(--subapp-text-tertiary);
  margin: 0 0 24px 0;
  line-height: 1.5;
  max-width: 300px;
}

/* 搜索框样式优化 */
.search-input :deep(.arco-input) {
  border-radius: 8px;
}

/* 按钮样式优化 */
.action-buttons .arco-btn {
  border-radius: 8px;
  font-weight: 500;
}

/* 头部区域 */
.header-section {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px 0;
  margin-bottom: 24px;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}

.title-area {
  display: flex;
  align-items: center;
}

.main-title {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* 流程列表弹窗样式 */
.process-list-modal {
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--color-border-2);
  }

  .header-actions {
    display: flex;
    gap: 12px;
  }

  .process-list {
    max-height: 500px;
    overflow-y: auto;
  }

  .process-item {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 16px;
    margin-bottom: 12px;
    background: var(--color-fill-1);
    border: 1px solid var(--color-border-2);
    border-radius: 8px;
    transition: all 0.3s ease;

    &:hover {
      background: var(--color-fill-2);
      border-color: var(--color-primary-light-4);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
  }

  .process-info {
    flex: 1;
    margin-right: 16px;
  }

  .process-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .process-name {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--color-text-1);
  }

  .process-tags {
    display: flex;
    gap: 8px;
  }

  .process-description {
    margin: 0 0 12px 0;
    font-size: 14px;
    color: var(--color-text-2);
    line-height: 1.5;
  }

  .process-meta {
    display: flex;
    gap: 16px;
  }

  .meta-item {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: var(--color-text-3);
  }

  .meta-icon {
    font-size: 14px;
  }

  .process-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex-shrink: 0;
  }
}

</style>
