

<template>
  <div class="metrics-map">
    <div class="page-header">
      <h2>指标地图（融合视图）</h2>
    </div>

    <!-- 搜索筛选区域 -->
    <div class="search-section">
      <a-row :gutter="16" justify="end">
        <a-col :span="6">
          <a-input
            v-model="searchKeyword"
            placeholder="搜索指标名称"
            allow-clear
            @press-enter="handleSearch"
          >
            <template #prefix>
              <icon-search />
            </template>
          </a-input>
        </a-col>
        <a-col :span="3">
          <a-button type="primary" @click="handleSearch">
            <template #icon><icon-search /></template>
            搜索
          </a-button>
        </a-col>
        <a-col :span="3">
          <a-button @click="showMissingTicket({ assetType: 'metric', pageSource: '指标地图' })">
            <template #icon><icon-plus /></template>缺失工单
          </a-button>
        </a-col>
      </a-row>
    </div>

    <a-row :gutter="24">
      <!-- 左侧导航树 -->
      <a-col :span="6">
        <a-card title="指标树" :bordered="false">
          <a-tree
            v-model:selected-keys="selectedKeys"
            :data="treeData"
            :show-line="true"
            @select="onTreeSelect"
          />
        </a-card>
      </a-col>
      
      <!-- 右侧内容区 -->
      <a-col :span="18">
        <a-card :bordered="false">

        <a-table
          :data="tableData"
          :pagination="pagination"
          @page-change="onPageChange"
          @table-render="handleTableRender"
          :scroll="{ x: 1200 }"
        >
          <template #columns>
            <a-table-column title="指标名称" data-index="name" :width="200">
              <template #cell="{ record }">
                <span class="metric-name" @click="showDetail(record)">{{ record.name }}</span>
              </template>
            </a-table-column>
            <a-table-column v-for="column in dynamicColumns" :key="column.dataIndex" 
              :title="column.title" :data-index="column.dataIndex" :width="column.width">
              <template #cell="{ record }" v-if="column.dataIndex === 'businessDefinition'">
                <a-tooltip>
                  <template #content>
                    <div class="metrics-rich-tooltip" v-html="record.businessDefinition"></div>
                  </template>
                  <div class="metrics-rich-ellipsis">
                    {{ getPlainText(record.businessDefinition) }}
                  </div>
                </a-tooltip>
              </template>
              <template #cell="{ record }" v-else-if="column.dataIndex === 'type'">
                {{ getTypeLabel(record.type) }}
              </template>
              <template #cell="{ record }" v-else-if="column.dataIndex === 'regulatoryCategory'">
                {{ getCategoryDisplay(record) }}
              </template>
              <template #cell="{ record }" v-else-if="column.dataIndex === 'reportName'">
                {{ getSceneDisplay(record) }}
              </template>
            </a-table-column>

          </template>
        </a-table>
        </a-card>
      </a-col>
    </a-row>

    <!-- 缺失工单弹窗 -->
    <MissingTicketModal
      v-model:visible="showMissingTicketModal"
      :context="ticketContext"
      @confirm="handleMissingTicketConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import request from '@/dfd-api/request'
import * as XLSX from 'xlsx'
import type { TreeNodeData } from '@arco-design/web-vue'
import type { RequestOption, UploadRequest, FileItem } from '@arco-design/web-vue/es/upload/interfaces'
// 强制使用 TS 版指标 mock，避免误用旧版 JS
import metricsMock from '@/mock/metrics.ts'
import { IconUpload, IconDownload, IconPlus } from '@arco-design/web-vue/es/icon'
import IncrementalImportModal from '@/components/modals/IncrementalImportModal.vue'
import BatchImportModal from '@/components/modals/BatchImportModal.vue'
import BusinessProcessFlow from '@/components/BusinessProcessFlow.vue'
import { METRIC_TYPE_LABELS, REGULATORY_CATEGORY_LABELS, MetricType, type MetricItem } from '@/types/metrics'
import { useRouter } from 'vue-router'
import MissingTicketModal from '@/pages/search/MissingTicketModal.vue'
import { useMissingTicket } from '@/composables/useMissingTicket'

const { showMissingTicketModal, ticketContext, showMissingTicket, handleMissingTicketConfirm } = useMissingTicket()

interface ApiResponse<T> {
  data: {
    list: T[]
    total: number
  }
}

interface SearchForm {
  name: string
  regulatoryCategory: string
  reportName: string
}

const searchForm = ref<SearchForm>({
  name: '',
  regulatoryCategory: '',
  reportName: ''
})

// 计算属性已简化，移除了重复的监管分类筛选条件

// 计算属性 - 动态表格列
const dynamicColumns = computed(() => {
  return [
    { title: '类型', dataIndex: 'type', width: 100 },
    { title: '指标域', dataIndex: 'regulatoryCategory', width: 150 },
    { title: '归属场景', dataIndex: 'reportName', width: 180 },
    { title: '业务定义', dataIndex: 'businessDefinition', width: 300 },
    { title: '更新频率', dataIndex: 'statisticalPeriod', width: 120 },
    { title: '业务负责人', dataIndex: 'businessOwner', width: 120 },
    { title: '技术负责人', dataIndex: 'technicalOwner', width: 120 }
  ]
})

// 路由
const router = useRouter()

// 添加缺失的响应式特征
const searchKeyword = ref('')
const selectedRegulatoryCategory = ref('')
const selectedReportName = ref('')
const selectedKeys = ref<(string | number)[]>([])
const showCreateModal = ref(false)

const pagination = ref({
  total: 0,
  current: 1,
  pageSize: 10
})

const tableData = ref<MetricItem[]>([])
const incrementalModalVisible = ref(false)
const batchModalVisible = ref(false)
const incrementalFileCount = ref(0)
const batchFileCount = ref(0)

const showIncrementalModal = () => {
  incrementalModalVisible.value = true
}

const showBatchModal = () => {
  batchModalVisible.value = true
}

// 计算属性 - 动态树形数据结构
const treeData = computed(() => {
  const domainScenesMap: Record<string, string[]> = {
    '资本监管': ['资本充足率报告', '杠杆率监管报告'],
    '流动性监管': ['流动性风险监管报告', '净稳定资金比例报告'],
    '信贷风险监管': ['信贷资产质量报告', '大额风险暴露报告']
  }
  return Object.entries(domainScenesMap).map(([domain, scenes]) => ({
    title: domain,
    key: `domain:${domain}`,
    children: scenes.map(scene => ({
      title: scene,
      key: `scene:${domain}:${scene}`
    }))
  }))
})

// 处理树节点选择
const handleTabChange = (key: string | number) => {
  // 标签页切换处理逻辑
}

const onTreeSelect = (selectedKeys: (string | number)[], data: { selected?: boolean, selectedNodes: TreeNodeData[], node?: TreeNodeData, e?: Event }) => {
  handleTreeSelect(selectedKeys, data)
}

const handleTreeSelect = (selectedKeys: (string | number)[], data: { selected?: boolean, selectedNodes: TreeNodeData[], node?: TreeNodeData, e?: Event }) => {
  if (selectedKeys.length === 0) {
    // 清空所有筛选条件
    searchForm.value.regulatoryCategory = ''
    searchForm.value.reportName = ''
    selectedRegulatoryCategory.value = ''
    selectedReportName.value = ''
    handleSearch()
    return
  }
  
  const selectedKey = String(selectedKeys[0])
  
  // 指标树：域为一级，场景为二级
  if (selectedKey.startsWith('domain:')) {
    const domain = selectedKey.split(':')[1] || ''
    searchForm.value.regulatoryCategory = domain
    searchForm.value.reportName = ''
    selectedRegulatoryCategory.value = domain
    selectedReportName.value = ''
  } else if (selectedKey.startsWith('scene:')) {
    const parts = selectedKey.split(':')
    const domain = parts[1] || ''
    const scene = parts[2] || ''
    searchForm.value.regulatoryCategory = domain
    searchForm.value.reportName = scene
    selectedRegulatoryCategory.value = domain
    selectedReportName.value = scene
  } else {
    // 其他情况：清空所有筛选
    searchForm.value.regulatoryCategory = ''
    searchForm.value.reportName = ''
    selectedRegulatoryCategory.value = ''
    selectedReportName.value = ''
  }
  
  handleSearch()
}

// 下载模板
const downloadTemplate = (type: string) => {
  const link = document.createElement('a')
  link.href = `/templates/metrics-${type}-template.xlsx`
  link.download = `指标${type === 'incremental' ? '增量' : '批量'}导入模板.xlsx`
  link.click()
}

// 处理文件变化
const handleFileChange = (type: string, event: any) => {
  const file = event.file
  if (file) {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const firstSheetName = workbook.SheetNames?.[0]
        if (!firstSheetName) {

          return
        }
        const firstSheet = workbook.Sheets[firstSheetName]
        if (!firstSheet) {

          return
        }
        const jsonData = XLSX.utils.sheet_to_json(firstSheet)
        
        if (type === 'incremental') {
          incrementalFileCount.value = jsonData.length
        } else {
          batchFileCount.value = jsonData.length
        }
      } catch (error) {

      }
    }
    reader.readAsArrayBuffer(file)
  }
}

// 确认增量上传
const confirmIncrementalUpload = () => {
  incrementalFileCount.value = 0
  incrementalModalVisible.value = false
}

// 确认批量上传
const confirmBatchUpload = () => {
  batchFileCount.value = 0
  batchModalVisible.value = false
}

// 批量上传
const handleBatchUpload = async (option: { fileItem: FileItem }): Promise<UploadRequest> => {
  const formData = new FormData()
  const fileBlob = option.fileItem?.file
  if (!fileBlob) {

    return { abort: () => {} }
  }
  formData.append('file', fileBlob as Blob)
  
  try {
    const res = await request.post<{success: boolean, count: number}>('/api/metrics/batch-import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    
    if (res.data?.success) {
      batchFileCount.value = res.data?.count ?? 0
      fetchMetrics()
    }
  } catch (error) {

  }
  
  return {
    abort: () => {}
  }
}

// 增量上传
const handleIncrementalUpload = async (option: { fileItem: FileItem }): Promise<UploadRequest> => {
  const formData = new FormData()
  const fileBlob = option.fileItem?.file
  if (!fileBlob) {

    return { abort: () => {} }
  }
  formData.append('file', fileBlob as Blob)
  
  try {
    const res = await request.post<{success: boolean, count: number}>('/api/metrics/incremental-import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    
    if (res.data?.success) {
      incrementalFileCount.value = res.data?.count ?? 0
      fetchMetrics()
    }
  } catch (error) {

  }
  
  return {
    abort: () => {}
  }
}

// 获取指标列表
const fetchMetrics = async () => {
  try {
    // 直接使用 mock 数据
    const queryParams = { 
      ...searchForm.value, 
      page: pagination.value.current + '', 
      pageSize: pagination.value.pageSize + ''
    }
    const firstMock = Array.isArray(metricsMock) ? (metricsMock[0] as any) : undefined
    if (firstMock && typeof firstMock.response === 'function') {
      const mockList = firstMock.response({ query: queryParams })
      if (mockList && mockList.data) {
        tableData.value = mockList.data.list || []
        pagination.value.total = mockList.data.total || 0
      } else {
        tableData.value = []
        pagination.value.total = 0
      }
    } else {

      tableData.value = []
      pagination.value.total = 0
    }
  } catch (error) {

    tableData.value = []
    pagination.value.total = 0
  }
}

// 指标类型切换处理
// 已移除指标类型切换，融合视图不再使用 tabs

// 搜索处理
const handleSearch = () => {
  // 同步搜索表单数据（融合视图）
  searchForm.value.name = searchKeyword.value
  searchForm.value.regulatoryCategory = selectedRegulatoryCategory.value
  searchForm.value.reportName = selectedReportName.value
  
  pagination.value.current = 1
  fetchMetrics()
}

// 类型标签安全获取，避免 undefined 作为索引类型
const getTypeLabel = (t?: string) => {
  if (!t) {return ''}
  return METRIC_TYPE_LABELS[t as keyof typeof METRIC_TYPE_LABELS] ?? t
}

// 指标域显示（监管使用枚举标签映射，业务使用业务域/分类）
const getCategoryDisplay = (record: MetricItem) => {
  if (record.type === MetricType.REGULATORY) {
    const key = record.regulatoryCategory as keyof typeof REGULATORY_CATEGORY_LABELS
    return (key && REGULATORY_CATEGORY_LABELS[key]) || (record.regulatoryCategory as any) || ''
  }
  return record.businessDomain || record.category || ''
}

// 归属场景显示（优先 reportName，其次 reportInfo）
const getSceneDisplay = (record: MetricItem) => {
  return record.reportName || record.reportInfo || ''
}

const getPlainText = (html?: string) => {
  if (!html) {return ''}
  const div = document.createElement('div')
  div.innerHTML = html
  const text = div.textContent || div.innerText || ''
  return text.trim()
}



// 分页处理
const onPageChange = (current: number) => {
  pagination.value.current = current
  fetchMetrics()
}

// 显示详情 - 跳转到详情页面
const showDetail = (record: any) => {
  router.push({
    name: 'MetricsMapDetail',
    params: { id: record.id }
  })
}





// 表格渲染完成处理
const handleTableRender = () => {
  // 表格渲染完成后的处理逻辑
}

onMounted(() => {
  fetchMetrics();
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

.tree-card {
  height: calc(100vh - 200px);
  overflow-y: auto;
}

.metrics-table {
  background: white;
  border-radius: 6px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.metric-name {
  font-weight: 500;
  color: var(--subapp-info);
  cursor: pointer;
}

.metric-name:hover {
  text-decoration: underline;
}

.metrics-rich-ellipsis {
  max-width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.metrics-rich-tooltip {
  max-width: 480px;
  max-height: 300px;
  overflow: auto;
  padding: 8px;
}

.favorite-btn {
  border: none;
  background: none;
  padding: 4px;
}

.favorite-btn:hover {
  background-color: #f5f5f5;
}

.metric-type-tabs {
  .arco-tabs {
    .arco-tabs-nav {
      margin-bottom: 0;
    }
  }
}


</style>
