<template>
  <a-modal
    v-model:visible="visible"
    title="选择数据表"
    :width="800"
    :mask-closable="false"
    @ok="handleConfirm"
    @cancel="handleCancel"
  >
    <div class="table-selector">
      <!-- 搜索和筛选 -->
      <div class="selector-header">
        <div class="search-container">
          <a-input-search
            v-model="searchKeyword"
            placeholder="搜索表名或描述"
            style="width: 300px"
            @search="handleSearch"
          />
        </div>
        <div class="filter-container">
          <a-select
            v-model="selectedType"
            placeholder="表类型"
            style="width: 120px"
            allow-clear
            @change="handleFilter"
          >
            <a-option value="fact">事实表</a-option>
            <a-option value="dimension">维度表</a-option>
            <a-option value="summary">汇总表</a-option>
            <a-option value="temp">临时表</a-option>
          </a-select>
          <a-select
            v-model="selectedOwner"
            placeholder="负责人"
            style="width: 120px"
            allow-clear
            @change="handleFilter"
          >
            <a-option
              v-for="owner in ownerOptions"
              :key="owner"
              :value="owner"
            >
              {{ owner }}
            </a-option>
          </a-select>
        </div>
      </div>

      <!-- 已选择的表 -->
      <div v-if="localSelectedTables.length > 0" class="selected-section">
        <div class="selected-header">
          <span class="selected-title">已选择 ({{ localSelectedTables.length }})</span>
          <a-button type="text" size="small" @click="clearSelection">
            清空选择
          </a-button>
        </div>
        <div class="selected-tables">
          <a-tag
            v-for="table in localSelectedTables"
            :key="table.name"
            closable
            @close="removeFromSelection(table)"
          >
            {{ table.name }}
          </a-tag>
        </div>
      </div>

      <!-- 表格列表 -->
      <div class="table-list">
        <a-table
          :data="filteredTables"
          :columns="tableColumns"
          :pagination="{
            current: currentPage,
            pageSize: pageSize,
            total: filteredTables.length,
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
          <template #type="{ record }">
            <a-tag
              :color="getTypeColor(record.type)"
              size="small"
            >
              {{ getTypeLabel(record.type) }}
            </a-tag>
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
          已选择 {{ localSelectedTables.length }} 个数据表
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

// 数据表类型
interface TableItem {
  name: string
  description: string
  type: string
  owner: string
}

interface Props {
  visible: boolean
  selectedTables: TableItem[]
}

interface Emits {
  (e: 'update:visible', visible: boolean): void
  (e: 'confirm', tables: TableItem[]): void
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
const selectedType = ref('')
const selectedOwner = ref('')
const currentPage = ref(1)
const pageSize = ref(10)
const localSelectedTables = ref<TableItem[]>([])

// 模拟数据表数据
const allTables = ref<TableItem[]>([
  {
    name: 'user_profile',
    description: '用户基础信息表，包含用户的基本属性和注册信息',
    type: 'dimension',
    owner: '张三'
  },
  {
    name: 'order_fact',
    description: '订单事实表，记录所有订单的详细信息和交易数据',
    type: 'fact',
    owner: '李四'
  },
  {
    name: 'product_catalog',
    description: '产品目录表，包含所有产品的基本信息和分类',
    type: 'dimension',
    owner: '王五'
  },
  {
    name: 'sales_summary',
    description: '销售汇总表，按时间和地区汇总的销售数据',
    type: 'summary',
    owner: '张三'
  },
  {
    name: 'customer_behavior',
    description: '客户行为分析表，记录用户在平台上的各种行为数据',
    type: 'fact',
    owner: '李四'
  },
  {
    name: 'inventory_status',
    description: '库存状态表，实时记录各产品的库存情况',
    type: 'fact',
    owner: '王五'
  },
  {
    name: 'region_mapping',
    description: '地区映射表，包含地区编码和名称的对应关系',
    type: 'dimension',
    owner: '张三'
  },
  {
    name: 'temp_analysis',
    description: '临时分析表，用于特定分析任务的临时数据存储',
    type: 'temp',
    owner: '李四'
  }
])

// 负责人选项
const ownerOptions = computed(() => {
  const owners = new Set(allTables.value.map(table => table.owner))
  return Array.from(owners)
})

// 过滤后的表格数据
const filteredTables = computed(() => {
  let filtered = allTables.value

  // 搜索过滤
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    filtered = filtered.filter(table => 
      table.name.toLowerCase().includes(keyword) ||
      table.description.toLowerCase().includes(keyword)
    )
  }

  // 类型过滤
  if (selectedType.value) {
    filtered = filtered.filter(table => table.type === selectedType.value)
  }

  // 负责人过滤
  if (selectedOwner.value) {
    filtered = filtered.filter(table => table.owner === selectedOwner.value)
  }

  return filtered
})

// 选中的行键
const selectedRowKeys = computed(() => {
  return localSelectedTables.value.map(table => table.name)
})

// 表格列定义
const tableColumns = [
  {
    title: '表名',
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
    title: '类型',
    dataIndex: 'type',
    slotName: 'type',
    width: 100
  },
  {
    title: '负责人',
    dataIndex: 'owner',
    width: 100
  },
  {
    title: '操作',
    slotName: 'actions',
    width: 80,
    align: 'center'
  }
]

// 获取类型颜色
const getTypeColor = (type: string) => {
  const colors = {
    fact: 'blue',
    dimension: 'green',
    summary: 'orange',
    temp: 'gray'
  }
  return colors[type as keyof typeof colors] || 'gray'
}

// 获取类型标签
const getTypeLabel = (type: string) => {
  const labels = {
    fact: '事实表',
    dimension: '维度表',
    summary: '汇总表',
    temp: '临时表'
  }
  return labels[type as keyof typeof labels] || type
}

// 判断是否已选择
const isSelected = (table: TableItem) => {
  return localSelectedTables.value.some(selected => selected.name === table.name)
}

// 添加到选择列表
const addToSelection = (table: TableItem) => {
  if (!isSelected(table)) {
    localSelectedTables.value.push(table)
  }
}

// 从选择列表移除
const removeFromSelection = (table: TableItem) => {
  const index = localSelectedTables.value.findIndex(selected => selected.name === table.name)
  if (index > -1) {
    localSelectedTables.value.splice(index, 1)
  }
}

// 清空选择
const clearSelection = () => {
  localSelectedTables.value = []
}

// 行选择处理
const handleRowSelect = (rowKeys: string[], rowKey: string, record: TableItem) => {
  if (rowKeys.includes(rowKey)) {
    addToSelection(record)
  } else {
    removeFromSelection(record)
  }
}

// 全选处理
const handleSelectAll = (checked: boolean, records: TableItem[]) => {
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
  emit('confirm', localSelectedTables.value)
  visible.value = false
}

// 取消选择
const handleCancel = () => {
  visible.value = false
}

// 监听props变化
watch(() => props.selectedTables, (newTables) => {
  localSelectedTables.value = [...newTables]
}, { immediate: true, deep: true })

// 监听弹窗显示状态
watch(() => props.visible, (newVisible) => {
  if (newVisible) {
    // 重置搜索和筛选条件
    searchKeyword.value = ''
    selectedType.value = ''
    selectedOwner.value = ''
    currentPage.value = 1
  }
})
</script>

<style scoped>
.table-selector {
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

.selected-tables {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.table-list {
  :deep(.arco-table) {
    border-radius: 6px;
  }
  
  :deep(.arco-table-th) {
    background: var(--color-bg-2);
    font-weight: 500;
  }
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