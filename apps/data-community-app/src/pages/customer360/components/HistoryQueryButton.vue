<template>
  <div class="history-query-button">
    <!-- 明细查询按钮 -->
    <a-button
      type="primary"
      @click="openQueryDrawer"
      :loading="loading"
      class="query-button"
    >
      <template #icon><IconHistory /></template>
      自定义查询
    </a-button>

    <!-- 自定义查询抽屉 -->
    <a-drawer
      v-model:visible="drawerVisible"
      title="自定义查询"
      width="80%"
      :footer="false"
      placement="right"
      class="query-drawer"
      unmount-on-close
    >
      <a-tabs
        v-model:active-key="drawerTabKey"
        type="line"
        size="large"
        class="drawer-tabs"
      >
        <!-- Tab 1: 数据模型查询（复用现有 HistorySliceQuery） -->
        <a-tab-pane key="model-query" title="数据模型查询">
          <div class="tab-pane-content">
            <div class="tab-pane-header">
              <IconHistory class="header-icon" />
              <span class="header-title">历史查询记录</span>
              <a-tag color="arcoblue" size="small">复用现有 · 老用户无感知升级</a-tag>
            </div>
            <HistorySliceQuery :user-info="props.userInfo" />
          </div>
        </a-tab-pane>

        <!-- Tab 2: 自定义查询（v3.3 新能力 · 字段级权限可见） -->
        <a-tab-pane key="custom-query" title="自定义查询">
          <div class="tab-pane-content">
            <div class="tab-pane-header">
              <IconStorage class="header-icon" />
              <span class="header-title">自定义查询</span>
              <a-tag color="purple" size="small">v3.3 新能力 · 受字段级权限控制</a-tag>
            </div>
            <CustomQueryPanel
              :user-info="props.userInfo"
              :session-id="sessionId"
              @audit-copy="handleAuditCopy"
            />
          </div>
        </a-tab-pane>
      </a-tabs>
    </a-drawer>



    <!-- 查询结果弹窗 -->
    <a-modal
      v-model:visible="resultModalVisible"
      :title="`查询结果 - ${currentQueryRecord?.name}`"
      width="90%"
      :footer="false"
      class="result-modal"
    >
      <div class="result-content" v-if="currentQueryRecord">
        <!-- 结果统计 -->
        <div class="result-header">
          <div class="result-info">
            <a-statistic title="总记录数" :value="queryResultData.length" />
            <a-statistic title="查询时间" :value="(formatTime(currentQueryRecord.createTime) as unknown) as number" />
            <a-statistic title="数据模型" :value="(getModelTypeName(currentQueryRecord.modelType) as unknown) as number" />
          </div>

        </div>
        
        <!-- 结果表格 -->
        <a-table
          :data="queryResultData"
          :loading="resultLoading"
          :pagination="resultPagination"
          :scroll="{ x: 'max-content' }"
          size="small"
        >
          <template #columns>
            <a-table-column 
              v-for="column in resultColumns" 
              :key="column.dataIndex"
              :title="column.title"
              :data-index="column.dataIndex"
              :width="column.width"
            >
              <template #cell="{ record }">
                <span :title="record[column.dataIndex]">
                  {{ formatCellValue(record[column.dataIndex]) }}
                </span>
              </template>
            </a-table-column>
          </template>
        </a-table>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { Message } from '@arco-design/web-vue'
import {
  IconHistory,
  IconStorage
} from '@arco-design/web-vue/es/icon'
import { getDataModelsList } from '@/api/dataModels'
import HistorySliceQuery from './HistorySliceQuery.vue'
import CustomQueryPanel from './CustomQueryPanel.vue'

function hashStr(str: string) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash = hash & hash
  }
  return Math.abs(hash)
}

// Props
const props = defineProps({
  userId: {
    type: String,
    default: ''
  },
  userInfo: {
    type: Object,
    default: () => ({})
  }
})

// 响应式数据
const loading = ref(false)
const drawerVisible = ref(false)
const drawerTabKey = ref<string>('custom-query')
const sessionId = ref(`S-${Date.now()}-${hashStr('session' + Date.now()).toString(36).padStart(6, '0').slice(0, 6)}`)
const resultModalVisible = ref(false)
const resultLoading = ref(false)

// 复制审计：记录最近 50 条
const auditLogs = ref<{
  auditLogId: string
  userId: string
  customerId: string
  fieldList: string[]
  sessionId: string
  timestamp: number
}[]>([])

const handleAuditCopy = (payload: any) => {
  auditLogs.value.unshift({
    ...payload,
    timestamp: Date.now()
  })
  if (auditLogs.value.length > 50) {
    auditLogs.value = auditLogs.value.slice(0, 50)
  }
  // 真实场景：调用 /api/dex/customer360/custom-query/copy 上报
  console.debug('[v3.3] audit-copy:', payload)
}

// 查询结果相关
const currentQueryRecord = ref<Record<string, any> | null>(null)
const queryResultData = ref<Record<string, any>[]>([])
const resultColumns = ref<Record<string, any>[]>([])





// 分页配置
const resultPagination = {
  pageSize: 20,
  showTotal: true,
  showPageSize: true
}

// 数据模型配置
const modelConfigs = {
  customer_basic: {
    name: '客户基础信息',
    columns: [
      { title: '客户号', dataIndex: 'customerId', width: 120 },
      { title: '姓名', dataIndex: 'name', width: 100 },
      { title: '手机号', dataIndex: 'phone', width: 120 },
      { title: '身份证号', dataIndex: 'idCard', width: 180 },
      { title: '年龄', dataIndex: 'age', width: 80 },
      { title: '性别', dataIndex: 'gender', width: 80 },
      { title: '户籍', dataIndex: 'residence', width: 150 },
      { title: '更新时间', dataIndex: 'updateTime', width: 160 }
    ],
    fields: [
      { label: '客户号', value: 'customerId' },
      { label: '姓名', value: 'name' },
      { label: '手机号', value: 'phone' },
      { label: '年龄', value: 'age' },
      { label: '性别', value: 'gender' }
    ]
  },
  product_info: {
    name: '产品信息',
    columns: [
      { title: '产品编号', dataIndex: 'productId', width: 120 },
      { title: '产品名称', dataIndex: 'productName', width: 150 },
      { title: '产品类型', dataIndex: 'productType', width: 100 },
      { title: '余额', dataIndex: 'balance', width: 120 },
      { title: '状态', dataIndex: 'status', width: 100 },
      { title: '开户时间', dataIndex: 'openTime', width: 160 },
      { title: '更新时间', dataIndex: 'updateTime', width: 160 }
    ],
    fields: [
      { label: '产品编号', value: 'productId' },
      { label: '产品名称', value: 'productName' },
      { label: '产品类型', value: 'productType' },
      { label: '余额', value: 'balance' },
      { label: '状态', value: 'status' }
    ]
  },
  credit_record: {
    name: '授信记录',
    columns: [
      { title: '授信编号', dataIndex: 'creditId', width: 120 },
      { title: '授信日期', dataIndex: 'creditDate', width: 120 },
      { title: '渠道', dataIndex: 'channel', width: 100 },
      { title: '结果', dataIndex: 'result', width: 100 },
      { title: '初始额度', dataIndex: 'initialLimit', width: 120 },
      { title: '当前额度', dataIndex: 'currentLimit', width: 120 },
      { title: '风险等级', dataIndex: 'riskLevel', width: 100 }
    ],
    fields: [
      { label: '授信编号', value: 'creditId' },
      { label: '渠道', value: 'channel' },
      { label: '结果', value: 'result' },
      { label: '风险等级', value: 'riskLevel' }
    ]
  },
  loan_record: {
    name: '用信记录',
    columns: [
      { title: '用信编号', dataIndex: 'loanId', width: 120 },
      { title: '用信日期', dataIndex: 'loanDate', width: 120 },
      { title: '产品名称', dataIndex: 'productName', width: 150 },
      { title: '金额', dataIndex: 'amount', width: 120 },
      { title: '余额', dataIndex: 'balance', width: 120 },
      { title: '状态', dataIndex: 'status', width: 100 },
      { title: '分期数', dataIndex: 'installments', width: 100 }
    ],
    fields: [
      { label: '用信编号', value: 'loanId' },
      { label: '产品名称', value: 'productName' },
      { label: '金额', value: 'amount' },
      { label: '状态', value: 'status' }
    ]
  },
  collection_record: {
    name: '催收记录',
    columns: [
      { title: '催收编号', dataIndex: 'collectionId', width: 120 },
      { title: '催收时间', dataIndex: 'collectionTime', width: 160 },
      { title: '催收方式', dataIndex: 'collectionType', width: 100 },
      { title: '催收结果', dataIndex: 'result', width: 100 },
      { title: '催收人员', dataIndex: 'collector', width: 100 },
      { title: '逾期金额', dataIndex: 'overdueAmount', width: 120 },
      { title: '逾期天数', dataIndex: 'overdueDays', width: 100 }
    ],
    fields: [
      { label: '催收编号', value: 'collectionId' },
      { label: '催收方式', value: 'collectionType' },
      { label: '催收结果', value: 'result' },
      { label: '催收人员', value: 'collector' }
    ]
  },
  marketing_record: {
    name: '营销记录',
    columns: [
      { title: '记录编号', dataIndex: 'recordId', width: 120 },
      { title: '营销时间', dataIndex: 'marketingTime', width: 160 },
      { title: '营销类型', dataIndex: 'marketingType', width: 100 },
      { title: '营销内容', dataIndex: 'content', width: 200 },
      { title: '营销结果', dataIndex: 'result', width: 100 },
      { title: '执行人员', dataIndex: 'operator', width: 100 }
    ],
    fields: [
      { label: '记录编号', value: 'recordId' },
      { label: '营销类型', value: 'marketingType' },
      { label: '营销结果', value: 'result' },
      { label: '执行人员', value: 'operator' }
    ]
  }
}

// 计算属性（暂无）

// 方法
const openQueryDrawer = () => {
  drawerVisible.value = true
}









type ModelType = keyof typeof modelConfigs

const viewQueryResult = async (record: Record<string, any>) => {
  currentQueryRecord.value = record
  resultModalVisible.value = true
  resultLoading.value = true
  
  try {
    // 模拟加载查询结果
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const config = modelConfigs[record.modelType as ModelType]
    resultColumns.value = config.columns
    queryResultData.value = generateMockResultData(record.modelType as ModelType, record.resultCount)
  } catch (error) {
    Message.error('加载查询结果失败')
  } finally {
    resultLoading.value = false
  }
}

const generateMockResultData = (modelType: ModelType, count: number) => {
  const data: Record<string, any>[] = []
  const config = modelConfigs[modelType]
  
  for (let i = 0; i < count; i++) {
    const record: Record<string, any> = {}
    config.columns.forEach((column: Record<string, any>) => {
      record[column.dataIndex] = generateMockValue(column.dataIndex, i)
    })
    data.push(record)
  }
  
  return data
}

const generateMockValue = (field: string, index: number) => {
  const h = (suffix: string) => hashStr(field + index + suffix)
  const mockValues: Record<string, any> = {
    customerId: `C${String(index + 1).padStart(6, '0')}`,
    name: `客户${index + 1}`,
    phone: `138${String(h('phone') % 100000000).padStart(8, '0')}`,
    idCard: `${h('idCard1') % 900000 + 100000}${h('idCard2') % 90 + 10}0101${h('idCard3') % 9000 + 1000}`,
    age: h('age') % 50 + 20,
    gender: h('gender') % 2 === 0 ? '男' : '女',
    residence: ['北京市', '上海市', '广州市', '深圳市', '杭州市'][h('residence') % 5],
    productId: `P${String(index + 1).padStart(6, '0')}`,
    productName: ['储蓄卡', '信用卡', '理财产品', '贷款产品'][h('productName') % 4],
    productType: ['自营', '助贷'][h('productType') % 2],
    balance: (h('balance') / 2147483647 * 100000).toFixed(2),
    status: ['正常', '冻结', '注销'][h('status') % 3],
    creditId: `CR${String(index + 1).padStart(6, '0')}`,
    creditDate: new Date(Date.now() - h('creditDate') / 2147483647 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    channel: ['线上', '线下', '电话'][h('channel') % 3],
    result: ['通过', '拒绝', '待审核'][h('result') % 3],
    initialLimit: (h('initialLimit') / 2147483647 * 50000).toFixed(2),
    currentLimit: (h('currentLimit') / 2147483647 * 50000).toFixed(2),
    riskLevel: ['低', '中', '高'][h('riskLevel') % 3],
    loanId: `LN${String(index + 1).padStart(6, '0')}`,
    loanDate: new Date(Date.now() - h('loanDate') / 2147483647 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    amount: (h('amount') / 2147483647 * 100000).toFixed(2),
    installments: h('installments') % 36 + 1,
    collectionId: `CL${String(index + 1).padStart(6, '0')}`,
    collectionTime: new Date(Date.now() - h('collectionTime') / 2147483647 * 30 * 24 * 60 * 60 * 1000).toISOString(),
    collectionType: ['电话', '短信', '上门'][h('collectionType') % 3],
    collector: `催收员${index + 1}`,
    overdueAmount: (h('overdueAmount') / 2147483647 * 10000).toFixed(2),
    overdueDays: h('overdueDays') % 90 + 1,
    recordId: `MR${String(index + 1).padStart(6, '0')}`,
    marketingTime: new Date(Date.now() - h('marketingTime') / 2147483647 * 30 * 24 * 60 * 60 * 1000).toISOString(),
    marketingType: ['短信', '电话', '邮件'][h('marketingType') % 3],
    content: `营销内容${index + 1}`,
    operator: `营销员${index + 1}`,
    openTime: new Date(Date.now() - h('openTime') / 2147483647 * 365 * 24 * 60 * 60 * 1000).toISOString(),
    updateTime: new Date().toISOString()
  }
  
  return mockValues[field] || `值${index + 1}`
}









// 工具方法
const getModelTypeName = (modelType: ModelType) => {
  const model = modelConfigs[modelType]
  return model?.name || modelType
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    completed: 'green',
    running: 'blue',
    failed: 'red'
  }
  return colors[status] || 'gray'
}

const getStatusText = (status: string) => {
  const texts: Record<string, string> = {
    completed: '已完成',
    running: '执行中',
    failed: '失败'
  }
  return texts[status] || '未知'
}

const formatTime = (timeStr: string) => {
  if (!timeStr) {return '-'}
  const date = new Date(timeStr)
  return date.toLocaleString('zh-CN')
}



const formatCellValue = (value: any) => {
  if (value === null || value === undefined) {
    return '-'
  }
  if (typeof value === 'string' && value.length > 30) {
    return value.substring(0, 30) + '...'
  }
  return value
}



// 生命周期
onMounted(() => {
  // 组件初始化
})
</script>

<style scoped>
.history-query-button {
  width: 100%;
}

.query-button {
  width: 100%;
  height: 40px;
  font-size: 14px;
}

.query-drawer {
  :deep(.arco-drawer-body) {
    padding: 0;
  }
}

.drawer-content {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.drawer-tabs {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.drawer-tabs :deep(.arco-tabs-content-holder) {
  flex: 1;
  overflow-y: auto;
  padding: 0 24px 24px;
}

.tab-pane-content {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.tab-pane-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 12px;
  flex-shrink: 0;
}

.header-icon {
  font-size: 16px;
  color: var(--subapp-info);
}

.header-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--subapp-text-primary);
}



.new-query-form {
  width: 100%;
}



.result-modal {
  :deep(.arco-modal-body) {
    padding: 16px;
  }
}

.result-content {
  width: 100%;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 16px;
  background-color: #f7f8fa;
  border-radius: 6px;
}

.result-info {
  display: flex;
  gap: 32px;
}

.result-actions {
  display: flex;
  gap: 8px;
}

:deep(.arco-table-th) {
  background-color: #f7f8fa;
  font-weight: 600;
}

:deep(.arco-table-tbody .arco-table-tr) {
  cursor: pointer;
}

:deep(.arco-table-tbody .arco-table-tr:hover .arco-table-td) {
  background-color: #f7f8fa;
}

:deep(.arco-statistic-title) {
  font-size: 12px;
  color: var(--subapp-text-tertiary);
}

:deep(.arco-statistic-content) {
  font-size: 16px;
  font-weight: 600;
}
</style>