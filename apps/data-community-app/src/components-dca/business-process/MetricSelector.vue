<template>
  <a-modal
    v-model:visible="visible"
    title="选择指标"
    :width="800"
    :mask-closable="false"
    @ok="handleConfirm"
    @cancel="handleCancel"
  >
    <div class="metric-selector">
      <!-- 搜索和筛选 -->
      <div class="selector-header">
        <div class="search-container">
          <a-input-search
            v-model="searchKeyword"
            placeholder="搜索指标名称或描述"
            style="width: 300px"
            @search="handleSearch"
          />
        </div>
        <div class="filter-container">
          <a-select
            v-model="selectedCategory"
            placeholder="指标分类"
            style="width: 120px"
            allow-clear
            @change="handleFilter"
          >
            <a-option value="business">业务指标</a-option>
            <a-option value="technical">技术指标</a-option>
            <a-option value="financial">财务指标</a-option>
            <a-option value="operational">运营指标</a-option>
          </a-select>
          <a-select
            v-model="selectedLevel"
            placeholder="指标级别"
            style="width: 120px"
            allow-clear
            @change="handleFilter"
          >
            <a-option value="core">核心指标</a-option>
            <a-option value="important">重要指标</a-option>
            <a-option value="general">一般指标</a-option>
          </a-select>
        </div>
      </div>

      <!-- 已选择的指标 -->
      <div v-if="localSelectedMetrics.length > 0" class="selected-section">
        <div class="selected-header">
          <span class="selected-title">已选择 ({{ localSelectedMetrics.length }})</span>
          <a-button type="text" size="small" @click="clearSelection">
            清空选择
          </a-button>
        </div>
        <div class="selected-metrics">
          <a-tag
            v-for="metric in localSelectedMetrics"
            :key="metric.name"
            closable
            @close="removeFromSelection(metric)"
          >
            {{ metric.name }}
          </a-tag>
        </div>
      </div>

      <!-- 指标列表 -->
      <div class="metric-list">
        <a-table
          :data="filteredMetrics"
          :columns="metricColumns"
          :pagination="{
            current: currentPage,
            pageSize: pageSize,
            total: filteredMetrics.length,
            showTotal: true,
            showPageSize: true
          }"
          :loading="loading"
          row-key="name"
          :row-selection="{
            type: 'checkbox',
            selectedRowKeys: selectedRowKeys,
            onSelect: handleRowSelect,
            onSelectAll: handleSelectAll
          }"
          @page-change="handlePageChange"
          @page-size-change="handlePageSizeChange"
        >
          <template #category="{ record }">
            <a-tag
              :color="getCategoryColor(record.category)"
              size="small"
            >
              {{ getCategoryLabel(record.category) }}
            </a-tag>
          </template>
          
          <template #level="{ record }">
            <a-tag
              :color="getLevelColor(record.level)"
              size="small"
            >
              {{ getLevelLabel(record.level) }}
            </a-tag>
          </template>
          
          <template #unit="{ record }">
            <span class="metric-unit">{{ record.unit || '-' }}</span>
          </template>
          
          <template #actions="{ record }">
            <a-button
              v-if="!isSelected(record)"
              type="text"
              size="small"
              @click="addToSelection(record)"
            >
              选择
            </a-button>
            <a-button
              v-else
              type="text"
              size="small"
              status="danger"
              @click="removeFromSelection(record)"
            >
              移除
            </a-button>
          </template>
        </a-table>
      </div>
    </div>

    <template #footer>
      <div class="modal-footer">
        <div class="footer-info">
          已选择 {{ localSelectedMetrics.length }} 个指标
        </div>
        <div class="footer-actions">
          <a-button @click="handleCancel">取消</a-button>
          <a-button type="primary" @click="handleConfirm">
            确认选择
          </a-button>
        </div>
      </div>
    </template>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Message } from '@arco-design/web-vue'

// 指标类型
interface MetricItem {
  name: string
  description: string
  category: string
  level: string
  unit?: string
  formula?: string
}

interface Props {
  visible: boolean
  selectedMetrics: MetricItem[]
}

interface Emits {
  (e: 'update:visible', visible: boolean): void
  (e: 'confirm', metrics: MetricItem[]): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 响应式数据
const visible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const loading = ref(false)
const searchKeyword = ref('')
const selectedCategory = ref('')
const selectedLevel = ref('')
const currentPage = ref(1)
const pageSize = ref(10)
const localSelectedMetrics = ref<MetricItem[]>([])

// 模拟指标数据
const allMetrics = ref<MetricItem[]>([
  {
    name: '日活跃用户数',
    description: '每日活跃用户的数量，衡量产品的日常使用情况',
    category: 'business',
    level: 'core',
    unit: '人',
    formula: 'COUNT(DISTINCT user_id) WHERE last_active_date = CURRENT_DATE'
  },
  {
    name: '月活跃用户数',
    description: '每月活跃用户的数量，衡量产品的月度使用情况',
    category: 'business',
    level: 'core',
    unit: '人',
    formula: 'COUNT(DISTINCT user_id) WHERE last_active_date >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)'
  },
  {
    name: '用户留存率',
    description: '用户在特定时间段内继续使用产品的比例',
    category: 'business',
    level: 'core',
    unit: '%',
    formula: '(retained_users / total_users) * 100'
  },
  {
    name: '平均订单金额',
    description: '所有订单的平均金额，反映客户的消费水平',
    category: 'financial',
    level: 'important',
    unit: '元',
    formula: 'AVG(order_amount)'
  },
  {
    name: '转化率',
    description: '从访问到购买的转化比例，衡量销售效果',
    category: 'business',
    level: 'core',
    unit: '%',
    formula: '(conversions / visits) * 100'
  },
  {
    name: '页面加载时间',
    description: '页面完全加载所需的平均时间',
    category: 'technical',
    level: 'important',
    unit: '秒',
    formula: 'AVG(page_load_time)'
  },
  {
    name: '系统可用性',
    description: '系统正常运行时间的百分比',
    category: 'technical',
    level: 'core',
    unit: '%',
    formula: '(uptime / total_time) * 100'
  },
  {
    name: '客户获取成本',
    description: '获得一个新客户所需的平均成本',
    category: 'financial',
    level: 'important',
    unit: '元',
    formula: 'total_marketing_cost / new_customers'
  },
  {
    name: '客户满意度',
    description: '客户对产品或服务的满意程度评分',
    category: 'operational',
    level: 'important',
    unit: '分',
    formula: 'AVG(satisfaction_score)'
  },
  {
    name: '库存周转率',
    description: '库存在特定时间内的周转次数',
    category: 'operational',
    level: 'general',
    unit: '次',
    formula: 'cost_of_goods_sold / average_inventory'
  }
])

// 过滤后的指标数据
const filteredMetrics = computed(() => {
  let filtered = allMetrics.value

  // 搜索过滤
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    filtered = filtered.filter(metric => 
      metric.name.toLowerCase().includes(keyword) ||
      metric.description.toLowerCase().includes(keyword)
    )
  }

  // 分类过滤
  if (selectedCategory.value) {
    filtered = filtered.filter(metric => metric.category === selectedCategory.value)
  }

  // 级别过滤
  if (selectedLevel.value) {
    filtered = filtered.filter(metric => metric.level === selectedLevel.value)
  }

  return filtered
})

// 选中的行键
const selectedRowKeys = computed(() => {
  return localSelectedMetrics.value.map(metric => metric.name)
})

// 表格列定义
const metricColumns = [
  {
    title: '指标名称',
    dataIndex: 'name',
    width: 150,
    ellipsis: true
  },
  {
    title: '描述',
    dataIndex: 'description',
    ellipsis: true
  },
  {
    title: '分类',
    dataIndex: 'category',
    slotName: 'category',
    width: 100
  },
  {
    title: '级别',
    dataIndex: 'level',
    slotName: 'level',
    width: 100
  },
  {
    title: '单位',
    dataIndex: 'unit',
    slotName: 'unit',
    width: 80
  },
  {
    title: '操作',
    slotName: 'actions',
    width: 80,
    align: 'center'
  }
]

// 获取分类颜色
const getCategoryColor = (category: string) => {
  const colors = {
    business: 'blue',
    technical: 'green',
    financial: 'orange',
    operational: 'purple'
  }
  return colors[category as keyof typeof colors] || 'gray'
}

// 获取分类标签
const getCategoryLabel = (category: string) => {
  const labels = {
    business: '业务指标',
    technical: '技术指标',
    financial: '财务指标',
    operational: '运营指标'
  }
  return labels[category as keyof typeof labels] || category
}

// 获取级别颜色
const getLevelColor = (level: string) => {
  const colors = {
    core: 'red',
    important: 'orange',
    general: 'gray'
  }
  return colors[level as keyof typeof colors] || 'gray'
}

// 获取级别标签
const getLevelLabel = (level: string) => {
  const labels = {
    core: '核心指标',
    important: '重要指标',
    general: '一般指标'
  }
  return labels[level as keyof typeof labels] || level
}

// 判断是否已选择
const isSelected = (metric: MetricItem) => {
  return localSelectedMetrics.value.some(selected => selected.name === metric.name)
}

// 添加到选择列表
const addToSelection = (metric: MetricItem) => {
  if (!isSelected(metric)) {
    localSelectedMetrics.value.push(metric)
  }
}

// 从选择列表移除
const removeFromSelection = (metric: MetricItem) => {
  const index = localSelectedMetrics.value.findIndex(selected => selected.name === metric.name)
  if (index > -1) {
    localSelectedMetrics.value.splice(index, 1)
  }
}

// 清空选择
const clearSelection = () => {
  localSelectedMetrics.value = []
}

// 行选择处理
const handleRowSelect = (rowKeys: string[], rowKey: string, record: MetricItem) => {
  if (rowKeys.includes(rowKey)) {
    addToSelection(record)
  } else {
    removeFromSelection(record)
  }
}

// 全选处理
const handleSelectAll = (checked: boolean, records: MetricItem[]) => {
  if (checked) {
    records.forEach(record => addToSelection(record))
  } else {
    records.forEach(record => removeFromSelection(record))
  }
}

// 搜索处理
const handleSearch = () => {
  currentPage.value = 1
}

// 筛选处理
const handleFilter = () => {
  currentPage.value = 1
}

// 分页处理
const handlePageChange = (page: number) => {
  currentPage.value = page
}

const handlePageSizeChange = (size: number) => {
  pageSize.value = size
  currentPage.value = 1
}

// 确认选择
const handleConfirm = () => {
  emit('confirm', localSelectedMetrics.value)
  visible.value = false
}

// 取消选择
const handleCancel = () => {
  visible.value = false
}

// 监听props变化
watch(() => props.selectedMetrics, (newMetrics) => {
  localSelectedMetrics.value = [...newMetrics]
}, { immediate: true, deep: true })

// 监听弹窗显示状态
watch(() => props.visible, (newVisible) => {
  if (newVisible) {
    // 重置搜索和筛选条件
    searchKeyword.value = ''
    selectedCategory.value = ''
    selectedLevel.value = ''
    currentPage.value = 1
  }
})
</script>

<style scoped>
.metric-selector {
  max-height: 600px;
}

.selector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--color-border-2);
}

.search-container {
  flex: 1;
}

.filter-container {
  display: flex;
  gap: 12px;
}

.selected-section {
  margin-bottom: 16px;
  padding: 16px;
  background: var(--color-bg-2);
  border-radius: 6px;
  border: 1px solid var(--color-border-3);
}

.selected-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.selected-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-1);
}

.selected-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.metric-list {
  :deep(.arco-table) {
    border-radius: 6px;
  }
  
  :deep(.arco-table-th) {
    background: var(--color-bg-2);
    font-weight: 500;
  }
}

.metric-unit {
  font-size: 12px;
  color: var(--color-text-3);
}

.modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.footer-info {
  font-size: 14px;
  color: var(--color-text-2);
}

.footer-actions {
  display: flex;
  gap: 12px;
}
</style>