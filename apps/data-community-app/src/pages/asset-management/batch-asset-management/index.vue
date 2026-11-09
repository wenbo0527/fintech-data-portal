<template>
  <div class="batch-asset-management">
    <div class="page-header">
      <h2>资产批量管理</h2>
      <a-space>
        <a-button @click="showImportModal = true">
          <template #icon>
            <IconUpload />
          </template>
          批量导入
        </a-button>
        <a-button type="primary" @click="showBatchModal = true">
          <template #icon>
            <IconSettings />
          </template>
          批量操作
        </a-button>
      </a-space>
    </div>

    <!-- 操作统计 -->
    <div class="stats-section">
      <a-row :gutter="16">
        <a-col :span="6">
          <a-card>
            <a-statistic title="总资产数" :value="stats.total" />
          </a-card>
        </a-col>
        <a-col :span="6">
          <a-card>
            <a-statistic title="表资产" :value="stats.tables" />
          </a-card>
        </a-col>
        <a-col :span="6">
          <a-card>
            <a-statistic title="指标资产" :value="stats.metrics" />
          </a-card>
        </a-col>
        <a-col :span="6">
          <a-card>
            <a-statistic title="外数资产" :value="stats.external" />
          </a-card>
        </a-col>
      </a-row>
    </div>

    <!-- 搜索和筛选 -->
    <div class="search-section">
      <a-row :gutter="16">
        <a-col :span="8">
          <a-input-search
            v-model="searchKeyword"
            placeholder="搜索资产名称、描述"
            @search="handleSearch"
          />
        </a-col>
        <a-col :span="4">
          <a-select
            v-model="selectedType"
            placeholder="资产类型"
            allow-clear
            @change="handleSearch"
          >
            <a-option value="table">表</a-option>
            <a-option value="metric">指标</a-option>
            <a-option value="external">外数</a-option>
          </a-select>
        </a-col>
        <a-col :span="4">
          <a-select
            v-model="selectedStatus"
            placeholder="状态"
            allow-clear
            @change="handleSearch"
          >
            <a-option value="active">活跃</a-option>
            <a-option value="inactive">非活跃</a-option>
            <a-option value="archived">已归档</a-option>
          </a-select>
        </a-col>
        <a-col :span="4">
          <a-select
            v-model="selectedOwner"
            placeholder="负责人"
            allow-clear
            @change="handleSearch"
          >
            <a-option value="张三">张三</a-option>
            <a-option value="李四">李四</a-option>
            <a-option value="王五">王五</a-option>
          </a-select>
        </a-col>
        <a-col :span="4">
          <a-button type="outline" @click="resetFilters">重置</a-button>
        </a-col>
      </a-row>
    </div>

    <!-- 批量操作工具栏 -->
    <div class="batch-toolbar" v-if="selectedRowKeys.length > 0">
      <a-space>
        <span>已选择 {{ selectedRowKeys.length }} 项</span>
        <a-button size="small" @click="batchUpdateStatus('active')">
          批量启用
        </a-button>
        <a-button size="small" @click="batchUpdateStatus('inactive')">
          批量停用
        </a-button>
        <a-button size="small" @click="batchUpdateOwner">
          批量分配负责人
        </a-button>
        <a-button size="small" status="danger" @click="batchDelete">
          批量删除
        </a-button>
        <a-button size="small" @click="exportSelected">
          导出选中
        </a-button>
      </a-space>
    </div>

    <!-- 表格 -->
    <a-table
      :columns="columns"
      :data="tableData"
      :loading="loading"
      :pagination="pagination"
      :row-selection="rowSelection"
      @page-change="handlePageChange"
      @page-size-change="handlePageSizeChange"
    >
      <template #assetType="{ record }">
        <a-tag
          :color="getTypeColor(record.assetType)"
        >
          {{ getTypeText(record.assetType) }}
        </a-tag>
      </template>
      
      <template #status="{ record }">
        <a-tag
          :color="getStatusColor(record.status)"
        >
          {{ getStatusText(record.status) }}
        </a-tag>
      </template>
      
      <template #actions="{ record }">
        <a-space>
          <a-button type="text" size="small" @click="viewAsset(record)">
            查看
          </a-button>
          <a-button type="text" size="small" @click="editAsset(record)">
            编辑
          </a-button>
        </a-space>
      </template>
    </a-table>

    <!-- 批量导入模态框 -->
    <a-modal
      v-model:visible="showImportModal"
      title="批量数据导入"
      width="700px"
      @ok="handleImport"
      @cancel="resetImportForm"
    >
      <a-form :model="importConfig" layout="vertical">
        <a-form-item label="数据类型">
          <a-select v-model="importConfig.dataType" placeholder="选择数据类型" @change="handleDataTypeChange">
            <a-option value="behavior">行为特征</a-option>
            <a-option value="credit">征信特征</a-option>
          </a-select>
        </a-form-item>
        
        <a-form-item label="导入模式">
          <a-radio-group v-model="importConfig.mode">
            <a-radio value="append">新增上传</a-radio>
            <a-radio value="overwrite">覆盖上传</a-radio>
          </a-radio-group>
          <div style="font-size: 12px; color: var(--subapp-text-tertiary); margin-top: 4px;">
            新增上传：在现有数据基础上添加新数据<br />
            覆盖上传：完全替换现有数据
          </div>
        </a-form-item>
        
        <a-form-item label="上传Excel文件">
          <a-upload
            ref="uploadRef"
            :file-list="fileList"
            :auto-upload="false"
            accept=".xlsx,.xls"
            :limit="1"
            @change="handleFileChange"
            @before-upload="beforeUpload"
          >
            <template #upload-button>
              <div class="upload-area">
                <IconUpload style="font-size: 24px; color: #c9cdd4; margin-bottom: 8px;" />
                <div>点击上传Excel文件</div>
                <div style="font-size: 12px; color: var(--subapp-text-tertiary); margin-top: 4px;">
                  仅支持 .xlsx, .xls 格式，文件大小不超过10MB
                </div>
              </div>
            </template>
          </a-upload>
        </a-form-item>
        
        <a-form-item v-if="importConfig.dataType">
          <a-space>
            <a-button type="outline" @click="downloadTemplate">
              <template #icon>
                <IconInfoCircle />
              </template>
              下载{{ getDataTypeText(importConfig.dataType) }}模板
            </a-button>
            <a-button type="text" @click="handlePreviewData" :disabled="!fileList.length">
              预览数据
            </a-button>
          </a-space>
        </a-form-item>
        
        <!-- 数据预览 -->
        <a-form-item v-if="previewVisible" label="数据预览">
          <div class="preview-container">
            <div class="preview-header">
              <span>预览前5行数据</span>
              <a-tag color="blue">共 {{ previewData.total }} 行</a-tag>
            </div>
            <a-table
              :columns="previewColumns"
              :data="previewData.rows"
              :pagination="false"
              size="small"
              :scroll="{ x: 800 }"
            />
          </div>
        </a-form-item>
        
        <!-- 导入配置 -->
        <a-form-item v-if="importConfig.dataType" label="导入配置">
          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item label="数据起始行" size="small">
                <a-input-number v-model="importConfig.startRow" :min="1" :max="100" />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="批次大小" size="small">
                <a-input-number v-model="importConfig.batchSize" :min="100" :max="10000" />
              </a-form-item>
            </a-col>
          </a-row>
          <a-checkbox v-model="importConfig.skipErrors">跳过错误行继续导入</a-checkbox>
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 批量操作模态框 -->
    <a-modal
      v-model:visible="showBatchModal"
      title="批量操作配置"
      width="500px"
      @ok="handleBatchOperation"
      @cancel="resetBatchForm"
    >
      <a-form :model="batchOperation" layout="vertical">
        <a-form-item label="操作类型">
          <a-select v-model="batchOperation.type" placeholder="选择操作类型">
            <a-option value="updateStatus">更新状态</a-option>
            <a-option value="updateOwner">更新负责人</a-option>
            <a-option value="updateCategory">更新分类</a-option>
            <a-option value="addTags">添加标签</a-option>
          </a-select>
        </a-form-item>
        
        <a-form-item label="目标值" v-if="batchOperation.type">
          <a-input v-model="batchOperation.value" placeholder="请输入目标值" />
        </a-form-item>
        
        <a-form-item label="应用范围">
          <a-radio-group v-model="batchOperation.scope">
            <a-radio value="selected">仅选中项</a-radio>
            <a-radio value="filtered">当前筛选结果</a-radio>
            <a-radio value="all">全部资产</a-radio>
          </a-radio-group>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { Message } from '@arco-design/web-vue'
import { IconPlus, IconUpload, IconSettings, IconInfoCircle } from '@arco-design/web-vue/es/icon'

// 响应式数据
const loading = ref(false)
const searchKeyword = ref('')
const selectedType = ref('')
const selectedStatus = ref('')
const selectedOwner = ref('')
const showImportModal = ref(false)
const showBatchModal = ref(false)
const selectedRowKeys = ref<any[]>([])
const fileList = ref<any[]>([])
const uploadRef = ref()
const previewVisible = ref(false)
const previewColumns = ref<any[]>([])
const previewData = ref<{ total: number; rows: any[] }>({ total: 0, rows: [] })

// 导入配置
const importConfig = reactive({
  dataType: '', // behavior | credit
  mode: 'append', // append | overwrite
  startRow: 2, // 数据起始行
  batchSize: 1000, // 批次大小
  skipErrors: true // 跳过错误行
})

// 统计数据
const stats = reactive({
  total: 156,
  tables: 89,
  metrics: 45,
  external: 22
})

// 批量操作配置
const batchOperation = reactive({
  type: '',
  value: '',
  scope: 'selected'
})

// 表格列配置
const columns = [
  {
    title: '资产名称',
    dataIndex: 'name',
    width: 200
  },
  {
    title: '资产类型',
    dataIndex: 'assetType',
    slotName: 'assetType',
    width: 100
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
    width: 100
  },
  {
    title: '业务分类',
    dataIndex: 'category',
    width: 120
  },
  {
    title: '状态',
    dataIndex: 'status',
    slotName: 'status',
    width: 100
  },
  {
    title: '更新时间',
    dataIndex: 'updateTime',
    width: 160
  },
  {
    title: '操作',
    slotName: 'actions',
    width: 120,
    fixed: 'right'
  }
]

// 表格数据
const tableData = ref<any[]>([
  {
    id: 1,
    name: 'user_profile',
    assetType: 'table',
    description: '用户基础信息表',
    owner: '张三',
    category: '用户数据',
    status: 'active',
    updateTime: '2024-01-15 10:30:00'
  },
  {
    id: 2,
    name: '用户活跃度',
    assetType: 'metric',
    description: '统计用户活跃程度的指标',
    owner: '李四',
    category: '业务指标',
    status: 'active',
    updateTime: '2024-01-15 11:45:00'
  },
  {
    id: 3,
    name: '央行征信数据',
    assetType: 'external',
    description: '个人和企业征信数据源',
    owner: '王五',
    category: '外部数据',
    status: 'active',
    updateTime: '2024-01-14 16:20:00'
  }
])

// 分页配置
const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 3,
  showTotal: true,
  showPageSize: true
})

// 行选择配置
const rowSelection = reactive({
  type: 'checkbox',
  showCheckedAll: true,
  onlyCurrent: false
})

// 方法
const handleSearch = () => {
  loading.value = true
  setTimeout(() => {
    loading.value = false
  }, 500)
}

const resetFilters = () => {
  searchKeyword.value = ''
  selectedType.value = ''
  selectedStatus.value = ''
  selectedOwner.value = ''
  handleSearch()
}

const handlePageChange = (page: number) => {
  pagination.current = page
}

const handlePageSizeChange = (pageSize: number) => {
  pagination.pageSize = pageSize
  pagination.current = 1
}

const getTypeColor = (type: string) => {
  const colorMap: { [key: string]: string } = {
    table: 'blue',
    metric: 'green',
    external: 'orange'
  }
  return colorMap[type] || 'gray'
}

const getTypeText = (type: string) => {
  const textMap: { [key: string]: string } = {
    table: '表',
    metric: '指标',
    external: '外数'
  }
  return textMap[type] || '未知'
}

const getStatusColor = (status: string) => {
  const colorMap: { [key: string]: string } = {
    active: 'green',
    inactive: 'orange',
    archived: 'red'
  }
  return colorMap[status] || 'gray'
}

const getStatusText = (status: string) => {
  const textMap: { [key: string]: string } = {
    active: '活跃',
    inactive: '非活跃',
    archived: '已归档'
  }
  return textMap[status] || '未知'
}

const viewAsset = (record: any) => {

}

const editAsset = (record: any) => {

}

const batchUpdateStatus = (status: string) => {

  Message.success(`批量${status === 'active' ? '启用' : '停用'}成功`)
}

const batchUpdateOwner = () => {

}

const batchDelete = () => {

  Message.success('批量删除成功')
}

const exportSelected = () => {

  Message.success('导出成功')
}

const handleFileChange = (fileList: any) => {

  previewVisible.value = false
}

const beforeUpload = (file: File) => {
  const isExcel = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
                  file.type === 'application/vnd.ms-excel'
  const isLt10M = file.size / 1024 / 1024 < 10
  
  if (!isExcel) {
    Message.error('只能上传Excel文件！')
    return false
  }
  if (!isLt10M) {
    Message.error('文件大小不能超过10MB！')
    return false
  }
  return true
}

const handleDataTypeChange = () => {
  previewVisible.value = false
  previewData.value = { total: 0, rows: [] }
}

const getDataTypeText = (type: string) => {
  const textMap: Record<string, string> = {
    behavior: '行为特征',
    credit: '征信特征'
  }
  return textMap[type] || ''
}

const handlePreviewData = () => {
  if (!fileList.value.length) {
    Message.warning('请先上传文件')
    return
  }
  
  // 模拟数据预览
  if (importConfig.dataType === 'behavior') {
    previewColumns.value = [
      { title: '用户ID', dataIndex: 'userId', width: 100 },
      { title: '行为类型', dataIndex: 'behaviorType', width: 120 },
      { title: '行为时间', dataIndex: 'behaviorTime', width: 160 },
      { title: '行为值', dataIndex: 'behaviorValue', width: 100 },
      { title: '渠道', dataIndex: 'channel', width: 100 }
    ]
    previewData.value = {
      total: 1250,
      rows: [
        { userId: 'U001', behaviorType: '登录', behaviorTime: '2024-01-15 09:30:00', behaviorValue: '1', channel: 'APP' },
        { userId: 'U002', behaviorType: '购买', behaviorTime: '2024-01-15 10:15:00', behaviorValue: '299.00', channel: 'WEB' },
        { userId: 'U003', behaviorType: '浏览', behaviorTime: '2024-01-15 11:20:00', behaviorValue: '5', channel: 'APP' },
        { userId: 'U004', behaviorType: '分享', behaviorTime: '2024-01-15 12:05:00', behaviorValue: '1', channel: 'WEB' },
        { userId: 'U005', behaviorType: '收藏', behaviorTime: '2024-01-15 13:45:00', behaviorValue: '3', channel: 'APP' }
      ]
    }
  } else if (importConfig.dataType === 'credit') {
    previewColumns.value = [
      { title: '客户ID', dataIndex: 'customerId', width: 100 },
      { title: '征信分数', dataIndex: 'creditScore', width: 100 },
      { title: '逾期次数', dataIndex: 'overdueCount', width: 100 },
      { title: '负债率', dataIndex: 'debtRatio', width: 100 },
      { title: '更新时间', dataIndex: 'updateTime', width: 160 }
    ]
    previewData.value = {
      total: 856,
      rows: [
        { customerId: 'C001', creditScore: '750', overdueCount: '0', debtRatio: '0.35', updateTime: '2024-01-15' },
        { customerId: 'C002', creditScore: '680', overdueCount: '1', debtRatio: '0.42', updateTime: '2024-01-15' },
        { customerId: 'C003', creditScore: '720', overdueCount: '0', debtRatio: '0.28', updateTime: '2024-01-15' },
        { customerId: 'C004', creditScore: '650', overdueCount: '2', debtRatio: '0.55', updateTime: '2024-01-15' },
        { customerId: 'C005', creditScore: '780', overdueCount: '0', debtRatio: '0.20', updateTime: '2024-01-15' }
      ]
    }
  }
  
  previewVisible.value = true
  Message.success('数据预览加载成功')
}

const downloadTemplate = () => {
  if (!importConfig.dataType) {
    Message.warning('请先选择数据类型')
    return
  }
  
  const templateMap: Record<string, string> = {
    behavior: '行为特征导入模板.xlsx',
    credit: '征信特征导入模板.xlsx'
  }

  Message.success(`${getDataTypeText(importConfig.dataType)}模板下载成功`)
}

const handleImport = () => {
  if (!importConfig.dataType) {
    Message.error('请选择数据类型')
    return
  }
  
  if (!fileList.value.length) {
    Message.error('请上传Excel文件')
    return
  }
  
  loading.value = true
  
  // 模拟导入过程
  setTimeout(() => {
    loading.value = false
    const modeText = importConfig.mode === 'append' ? '新增' : '覆盖'
    Message.success(`${getDataTypeText(importConfig.dataType)}${modeText}导入成功！共处理 ${previewData.value.total} 条数据`)
    showImportModal.value = false
    resetImportForm()
  }, 2000)
}

const resetImportForm = () => {
  fileList.value = []
  previewVisible.value = false
  previewData.value = { total: 0, rows: [] }
  Object.assign(importConfig, {
    dataType: '',
    mode: 'append',
    startRow: 2,
    batchSize: 1000,
    skipErrors: true
  })
}

const handleBatchOperation = () => {

  Message.success('批量操作成功')
  showBatchModal.value = false
  resetBatchForm()
}

const resetBatchForm = () => {
  Object.assign(batchOperation, {
    type: '',
    value: '',
    scope: 'selected'
  })
}

onMounted(() => {
  // 初始化数据
})
</script>

<style scoped>
.batch-asset-management {
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

.stats-section {
  margin-bottom: 20px;
}

.search-section {
  margin-bottom: 20px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 6px;
}

.batch-toolbar {
  margin-bottom: 16px;
  padding: 12px 16px;
  background: #e8f4ff;
  border: 1px solid #bedaff;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.upload-area {
  width: 100%;
  height: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 2px dashed #c9cdd4;
  border-radius: 6px;
  background: #f7f8fa;
  cursor: pointer;
  transition: all 0.3s;
}

.upload-area:hover {
  border-color: var(--subapp-primary);
  background: #f2f6ff;
}

.preview-container {
  border: 1px solid var(--subapp-border);
  border-radius: 6px;
  overflow: hidden;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f7f8fa;
  border-bottom: 1px solid var(--subapp-border);
  font-weight: 500;
}
</style>