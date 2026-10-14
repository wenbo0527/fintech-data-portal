<template>
  <div class="business-core-details">
    <div class="details-header">
      <h4>业务核心明细</h4>
      <div class="header-actions">
        <a-button size="small" @click="refreshData">
          <template #icon><IconRefresh /></template>
          刷新
        </a-button>
      </div>
    </div>
    
    <div v-if="loading" class="loading-state">
      <a-spin size="large" />
      <p>加载业务明细数据...</p>
    </div>
    
    <div v-else class="details-content">
      <!-- BP-1: 业务核心明细 sticky header（上下文不丢） -->
      <div class="business-sticky-header">
        <div class="bsh-row">
          <IconBookmark class="bsh-icon" />
          <span class="bsh-label">当前查看</span>
          <a-tag color="arcoblue" size="small">
            {{ currentCreditProduct?.productName || '未选择产品' }}
          </a-tag>
          <a-tag v-if="currentCreditProduct?.creditProductId" color="gray" size="small">
            {{ currentCreditProduct.creditProductId }}
          </a-tag>
        </div>
        <div class="bsh-meta">
          <span>客户: <strong>{{ props.userInfo?.name || '-' }}</strong></span>
          <a-divider direction="vertical" />
          <span>授信额度: <strong>¥{{ formatAmount(currentCreditProduct?.amount) }}</strong></span>
          <a-divider direction="vertical" />
          <span>在贷余额: <strong class="text-green-600">¥{{ formatAmount(currentCreditProduct?.balance) }}</strong></span>
        </div>
      </div>

      <!-- 授信列表 -->
      <div class="detail-section">
        <div class="section-header">
          <div class="header-left">
            <IconIdcard class="section-icon" />
            <span class="section-title">授信列表</span>
            <a-badge :count="creditsList.length" class="section-badge" />
          </div>
          <div class="header-right">
            <a-tag color="green" size="small">
              <template #icon><span class="live-dot"></span></template>
              实时
            </a-tag>
          </div>
        </div>
        
        <div class="table-container">
          <a-table 
            :columns="creditColumns"
            :data="creditsList"
            :pagination="creditPagination"
            :loading="loading"
            size="small"
            @page-change="handleCreditPageChange"
          >
            <template #extra>
              <a-button size="small" @click="copyCreditData">
                <template #icon><IconCopy /></template>
                复制
              </a-button>
            </template>
            <template #reportStatus="{ record }">
              <a-tag :color="getCreditStatusColor(record.reportStatus)">
                {{ record.reportStatus }}
              </a-tag>
            </template>
            
            <template #creditScore="{ record }">
              <span>{{ record.creditScore || '-' }}</span>
            </template>
            
            <template #actions="{ record }">
              <a-button size="mini" type="text" @click="viewCreditDetail(record)">
                查看详情
              </a-button>
            </template>
          </a-table>
        </div>
      </div>
      
      <!-- 调额记录 -->
      <div class="detail-section">
        <div class="section-header">
          <IconSwap class="section-icon" />
          <span class="section-title">调额记录</span>
          <a-badge :count="adjustmentsList.length" class="section-badge" />
        </div>

        <div class="table-container">
          <a-table
            :columns="adjustmentColumns"
            :data="adjustmentsList"
            :pagination="adjustmentPagination"
            :loading="loading"
            size="small"
            @page-change="handleAdjustmentPageChange"
          >
            <template #type="{ record }">
              <a-tag :color="getAdjustmentTypeColor(record.type)">
                {{ record.type }}
              </a-tag>
            </template>

            <template #before="{ record }">
              <span class="amount-text">{{ formatAmount(record.before) }}</span>
            </template>

            <template #after="{ record }">
              <span class="amount-text">{{ formatAmount(record.after) }}</span>
            </template>

            <template #reason="{ record }">
              <span>{{ record.reason || '-' }}</span>
            </template>

            <template #actions="{ record }">
              <a-button size="mini" type="text" @click="viewAdjustmentDetail(record)">
                查看详情
              </a-button>
            </template>
          </a-table>
        </div>
      </div>

      <!-- 用信列表（按「授信申请ID → 用信产品」二级分组 · PRD §F-003） -->
      <div class="detail-section">
        <LoanProductsGroupedList
          :loans="loansList"
          :loan-products="loanProductsList"
          :credit-applications="creditApplicationsList"
          :products="productsList"
          @view-loan="viewLoanDetail"
          @view-disbursement="handleViewDisbursementDetails"
          @view-repayment="handleViewRepaymentDetails"
          @view-initial-plan="handleViewInitialRepaymentPlan"
          @view-tags="handleViewLoanTags"
        />
      </div>

      <!-- 删除支持流程 -->
      <div class="detail-section">
        <div class="section-header">
          <IconWechatpay class="section-icon" />
          <span class="section-title">删除支持流程</span>
          <a-badge :count="paymentsList.length" class="section-badge" />
        </div>
        
        <div class="table-container">
          <a-table 
            :columns="paymentColumns"
            :data="paymentsList"
            :pagination="paymentPagination"
            :loading="loading"
            size="small"
            @page-change="handlePaymentPageChange"
          >
            <template #status="{ record }">
              <a-tag :color="getPaymentStatusColor(record.status)">
                {{ record.status }}
              </a-tag>
            </template>
            
            <template #amount="{ record }">
              <span class="amount-text">{{ formatAmount(record.amount) }}</span>
            </template>
            
            <template #actions="{ record }">
              <a-button size="mini" type="text" @click="viewPaymentDetail(record)">
                查看详情
              </a-button>
            </template>
          </a-table>
        </div>
      </div>
    </div>
    <!-- 授信详情抽屉 -->
    <CreditDetailDrawer
      v-model:visible="creditDetailVisible"
      :credit-data="currentCreditData"
    />

    <!-- 用信详情抽屉 -->
    <LoanDetailDrawer
      v-model:visible="loanDetailVisible"
      :loan-data="currentLoanData"
      @view-disbursement-details="viewDisbursementDetails"
      @view-repayment-details="viewRepaymentDetails"
    />

    <!-- 放款记录抽屉 -->
    <DisbursementDrawer
      :visible="disbursementVisible"
      :loanRecord="currentLoanData"
      @close="disbursementVisible = false"
    />

    <!-- 还款记录抽屉 -->
    <RepaymentDrawer
      :visible="repaymentVisible"
      :loanRecord="currentLoanData"
      @close="repaymentVisible = false"
    />

    <!-- 还款明细抽屉 -->
    <!-- <RepaymentDetailDrawer
      v-model:visible="repaymentDetailVisible"
      :loan-data="currentLoanData"
    /> -->

    <!-- 放款明细抽屉 -->
    <!-- <DisbursementDetailDrawer
      v-model:visible="disbursementDetailVisible"
      :loan-data="currentLoanData"
    /> -->

    <!-- 用信标签抽屉 -->
    <a-drawer
      v-model:visible="loanTagsVisible"
      title="用信标签"
      width="520px"
      :footer="false"
    >
      <div v-if="currentLoanData" class="loan-tags-content">
        <a-descriptions :column="1" bordered size="large">
          <a-descriptions-item label="用信编号">{{ currentLoanData.loanNo || '-' }}</a-descriptions-item>
          <a-descriptions-item label="产品名称">{{ currentLoanData.productName || '-' }}</a-descriptions-item>
          <a-descriptions-item label="用信日期">{{ currentLoanData.loanDate || '-' }}</a-descriptions-item>
          <a-descriptions-item label="用信金额">¥{{ formatAmount(currentLoanData.amount) }}</a-descriptions-item>
          <a-descriptions-item label="关联标签">
            <div class="tag-list">
              <a-tag
                v-for="tag in getLoanTags(currentLoanData)"
                :key="tag"
                color="arcoblue"
                size="medium"
              >
                {{ tag }}
              </a-tag>
              <span v-if="getLoanTags(currentLoanData).length === 0" class="text-gray-500">暂无标签</span>
            </div>
          </a-descriptions-item>
        </a-descriptions>
      </div>
    </a-drawer>

    <!-- 初始还款计划抽屉 -->
    <InitialRepaymentPlanDrawer
      :visible="initialPlanVisible"
      :loan-record="currentLoanData"
      @close="initialPlanVisible = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, h } from 'vue'
import {
  IconIdcard,
  IconUser,
  IconSwap,
  IconMore,
  IconRefresh,
  IconCopy,
  IconWechatpay,
  IconBookmark
} from '@arco-design/web-vue/es/icon'
import { Message } from '@arco-design/web-vue'
import CreditDetailDrawer from './CreditDetailDrawer.vue'
import LoanDetailDrawer from './LoanDetailDrawer.vue'
import DisbursementDrawer from './DisbursementDrawer.vue'
import RepaymentDrawer from './RepaymentDrawer.vue'
import InitialRepaymentPlanDrawer from './InitialRepaymentPlanDrawer.vue'
import LoanProductsGroupedList from './LoanProductsGroupedList.vue'
// import RepaymentDetailDrawer from './RepaymentDetailDrawer.vue'
// import DisbursementDetailDrawer from './DisbursementDetailDrawer.vue'

interface Props {
  productKey: string
  productData?: any
  userInfo?: any
  loading?: boolean
}

interface Emits {
  (e: 'debug-info', info: any): void
  (e: 'refresh'): void
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const emit = defineEmits<Emits>()

// 分页状态（保留分页功能）

// 分页状态
const creditPagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showTotal: true,
  showPageSize: true
})



const adjustmentPagination = ref({ current: 1, pageSize: 5, total: 0 })
const paymentPagination = ref({ current: 1, pageSize: 5, total: 0 })

// 抽屉状态管理
const creditDetailVisible = ref(false)
const loanDetailVisible = ref(false)
const disbursementVisible = ref(false)
const repaymentVisible = ref(false)

// 弹窗状态管理
const repaymentDetailVisible = ref(false)
const disbursementDetailVisible = ref(false)
const loanTagsVisible = ref(false)
const initialPlanVisible = ref(false)

// 当前选中的数据
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const currentCreditData = ref<any>(null)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const currentLoanData = ref<any>(null)

// 表格列定义
const creditColumns = [
  { title: '授信单号', dataIndex: 'id', width: 120 },
  { title: '授信状态', dataIndex: 'reportStatus', slotName: 'reportStatus', width: 80 },
  { title: '信用评分', dataIndex: 'creditScore', slotName: 'creditScore', width: 80 },
  { title: '信用等级', dataIndex: 'creditLevel', width: 80 },
  { title: '总授信额度', dataIndex: 'creditOverview.totalCreditLimit', width: 110 },
  { title: '已用额度', dataIndex: 'creditOverview.usedCredit', width: 100 },
  { title: '额度使用率', dataIndex: 'creditOverview.creditUtilizationRate', width: 90,
    render: ({ record }: any) => record.creditOverview?.creditUtilizationRate != null ? record.creditOverview.creditUtilizationRate + '%' : '-'
  },
  { title: '查询日期', dataIndex: 'queryDate', width: 110 },
  { title: '操作', slotName: 'actions', width: 80 }
]



const adjustmentColumns = [
  { title: '调整类型', dataIndex: 'type', slotName: 'type', width: 80 },
  { title: '产品名称', dataIndex: 'productName', width: 120 },
  { title: '原额度', dataIndex: 'before', slotName: 'before', width: 100 },
  { title: '新额度', dataIndex: 'after', slotName: 'after', width: 100 },
  { title: '调整原因', dataIndex: 'reason', width: 120 },
  { title: '调整时间', dataIndex: 'date', width: 120 },
  { title: '操作', slotName: 'actions', width: 80 }
]

const paymentColumns = [
  { title: '支付编号', dataIndex: 'id', width: 120 },
  { title: '状态', dataIndex: 'status', slotName: 'payStatus', width: 80 },
  { title: '支付类型', dataIndex: 'type', width: 80 },
  { title: '支付金额', dataIndex: 'amount', slotName: 'amount', width: 100 },
  { title: '支付方式', dataIndex: 'method', width: 100 },
  { title: '支付时间', dataIndex: 'date', width: 120 },
  { title: '操作', slotName: 'actions', width: 80 }
]

// 计算属性 - 数据列表
const creditsList = computed(() => {
  const data = props.userInfo?.creditsList
  if (!Array.isArray(data)) {return []}
  if (!props.productKey) {return data}
  return data.filter((item: any) => !item.productKey || item.productKey === props.productKey)
})
const loansList = computed(() => {
  const data = props.userInfo?.loanRecords
  if (!Array.isArray(data)) {return []}
  if (!props.productKey) {return data}
  return data.filter((item: any) => !item.productKey || item.productKey === props.productKey)
})
const adjustmentsList = computed(() => {
  const data = props.userInfo?.quotaAdjustHistory
  if (!Array.isArray(data)) {return []}
  if (!props.productKey) {return data}
  return data.filter((item: any) => !item.productKey || item.productKey === props.productKey)
})
const paymentsList = computed(() => {
  const data = props.userInfo?.paymentProcessRecords
  if (!Array.isArray(data)) {return []}

  // 如果没有productKey，返回所有数据
  if (!props.productKey) {return data}
  
  // 根据productKey过滤数据
  return data.filter((item: any) => !item.productKey || item.productKey === props.productKey)
})

// v3.3: 授信申请 / 用信产品 / 产品列表（给 LoanProductsGroupedList 用）
// F-003 修复:用信列表必须基于当前选中的授信产品(credit-id)筛选
// 1) 当前 productKey 对应的 product(拿到 creditProductId)
// 2) creditApplicationsList 只保留该 creditProductId 下的授信申请
// 3) loanProductsList 只保留上一步授信申请下的用信产品
const productsList = computed(() => {
  return props.userInfo?.products || []
})

const currentCreditProductId = computed(() => {
  if (!props.productKey) return ''
  return productsList.value.find((p: any) => p.productKey === props.productKey)?.creditProductId || ''
})

const creditApplicationsList = computed(() => {
  const all = props.userInfo?.creditApplications || []
  if (!props.productKey) return all
  if (!currentCreditProductId.value) return []
  return all.filter((a: any) => a.creditProductId === currentCreditProductId.value)
})

const loanProductsList = computed(() => {
  const all = props.userInfo?.loanProducts || []
  if (!props.productKey) return all
  // 先用 creditApplicationsList(已按 productKey 过滤)的 creditApplicationId 限定范围
  const allowedAppIds = new Set(creditApplicationsList.value.map((a: any) => a.creditApplicationId))
  return all.filter((lp: any) => allowedAppIds.has(lp.creditApplicationId))
})

// BP-1: 当前授信产品（基于 productKey 匹配 · 切换产品时头部 sticky 上下文随之刷新）
const currentCreditProduct = computed(() => {
  if (!props.productKey) {return null}
  return productsList.value.find((p: any) => p.productKey === props.productKey) || null
})

// 更新分页总数
watch(creditsList, (newVal) => {
  creditPagination.total = newVal.length
}, { immediate: true })



watch(adjustmentsList, (newVal) => {
  adjustmentPagination.value.total = newVal.length
}, { immediate: true })

watch(paymentsList, (newVal) => {
  paymentPagination.value.total = newVal.length
}, { immediate: true })

// 方法
const refreshData = () => {
  emit('refresh')
  emit('debug-info', {
    action: 'refresh',
    component: 'BusinessCoreDetails',
    productKey: props.productKey
  })
}



const copyCreditData = () => {
  const headers = ['授信编号', '产品名称', '授信金额', '已用金额', '可用金额', '授信状态', '授信日期', '到期日期']
  const rows = creditsList.value.map(item => [
    item.creditNo,
    item.productName,
    formatAmount(item.creditAmount),
    formatAmount(item.usedAmount),
    formatAmount(item.availableAmount),
    item.status,
    item.creditDate,
    item.expireDate
  ])
  
  const csvContent = [headers, ...rows]
    .map(row => row.join('\t'))
    .join('\n')
  
  navigator.clipboard.writeText(csvContent).then(() => {
    Message.success('授信数据已复制到剪贴板')
  })
}



const formatAmount = (amount: number) => {
  if (amount === 0) {return '¥0'}
  if (!amount) {return '--'}
  return `¥${amount.toLocaleString()}`
}

// 状态颜色方法
const getCreditStatusColor = (status: string) => {
  const colorMap: Record<string, string> = {
    '正常': 'green',
    '冻结': 'orange',
    '关闭': 'red'
  }
  return colorMap[status] || 'default'
}

const getLoanStatusColor = (status: string) => {
  const colorMap: Record<string, string> = {
    '正常': 'green',
    '逾期': 'red',
    '已结清': 'blue'
  }
  return colorMap[status] || 'default'
}

const getAdjustmentTypeColor = (type: string) => {
  const colorMap: Record<string, string> = {
    '提额': 'green',
    '降额': 'orange'
  }
  return colorMap[type] || 'default'
}

const getPaymentStatusColor = (status: string) => {
  const colorMap: Record<string, string> = {
    '成功': 'green',
    '失败': 'red',
    '处理中': 'orange'
  }
  return colorMap[status] || 'default'
}

// 分页处理方法（保留分页功能）

// 分页处理方法
const handleCreditPageChange = (page: number) => {
  creditPagination.current = page
}



const handleAdjustmentPageChange = (page: number) => {
  adjustmentPagination.value.current = page
}

const handlePaymentPageChange = (page: number) => {
  paymentPagination.value.current = page
}

// 详情查看方法
const viewCreditDetail = (record: any) => {
  currentCreditData.value = record
  creditDetailVisible.value = true
}

const viewLoanDetail = (record: any) => {
  currentLoanData.value = record
  loanDetailVisible.value = true
}

const viewAdjustmentDetail = (record: any) => {
  Message.info(`查看调额详情: ${record.type}`)
}

const viewPaymentDetail = (record: any) => {
  Message.info(`查看支付详情: ${record.paymentId}`)
}

// 查看放款详情
const viewDisbursementDetails = (record: any) => {
  currentLoanData.value = record
  disbursementVisible.value = true
}

// 查看还款详情
const viewRepaymentDetails = (record: any) => {
  currentLoanData.value = record
  repaymentVisible.value = true
}

// 处理LoanRecordTable组件的放款信息事件
const handleViewDisbursementDetails = (record: any) => {
  currentLoanData.value = record
  disbursementVisible.value = true
}

// 处理LoanRecordTable组件的还款信息事件
const handleViewRepaymentDetails = (record: any) => {
  currentLoanData.value = record
  repaymentVisible.value = true
}

// 处理LoanRecordTable组件的用信标签事件
const handleViewLoanTags = (record: any) => {
  currentLoanData.value = record
  loanTagsVisible.value = true
}

// 处理LoanRecordTable组件的初始还款计划事件
const handleViewInitialRepaymentPlan = (record: any) => {
  currentLoanData.value = record
  initialPlanVisible.value = true
}

// 根据用信记录派生出关联标签
const getLoanTags = (record: any) => {
  if (!record) return []
  const tags: string[] = []
  if (record.productName) tags.push(record.productName)
  if (record.status === '逾期') tags.push('逾期')
  else if (record.status === '正常') tags.push('在贷')
  else if (record.status === '已结清') tags.push('已结清')
  if (record.channel) tags.push(`${record.channel}渠道`)
  if (record.installments && record.installments > 1) tags.push(`${record.installments}期分期`)
  if (record.overdueDays && record.overdueDays > 0) tags.push(`逾期${record.overdueDays}天`)
  if (record.interestRate) tags.push(`利率${record.interestRate}%`)
  if (record.result === '成功') tags.push('审批通过')
  if (record.contractNo) tags.push('已签约')
  return tags
}

// 刷新数据
const handleRefresh = () => {
  emit('refresh')
}

// 导出数据
const handleExport = () => {
  Message.info('导出功能已触发')
}
</script>

<style scoped>
.business-core-details {
  padding: 16px;
}

.details-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.details-header h4 {
  margin: 0;
  color: var(--subapp-text-primary);
  font-size: 16px;
  font-weight: 600;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: var(--subapp-text-tertiary);
}

.details-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* BP-1: Sticky header（业务核心明细上下文） */
.business-sticky-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: linear-gradient(180deg, #ffffff 0%, #f7f8fa 100%);
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  padding: 12px 16px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.bsh-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.bsh-icon {
  font-size: 16px;
  color: var(--subapp-info);
}

.bsh-label {
  font-size: 12px;
  color: var(--subapp-text-tertiary);
}

.bsh-meta {
  font-size: 12px;
  color: var(--subapp-text-secondary);
  display: flex;
  align-items: center;
  gap: 4px;
}

.detail-section {
  background: #fff;
  border: 1px solid #e5e6eb;
  border-radius: 6px;
  padding: 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--subapp-bg-secondary);
}

.header-left {
  display: flex;
  align-items: center;
}

.live-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: var(--subapp-success);
  margin-right: 4px;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}

.section-icon {
  font-size: 18px;
  color: var(--subapp-primary);
  margin-right: 8px;
}

.section-title {
  font-weight: 500;
  color: var(--subapp-text-primary);
  font-size: 14px;
  margin-right: 8px;
}

.section-badge {
  margin-left: auto;
}

.table-container {
  width: 100%;
}

.table-toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
  align-items: center;
}

.amount-text {
  font-weight: 500;
  color: var(--subapp-text-primary);
}

.amount-text.available {
  color: var(--subapp-success);
}

.amount-text.increase {
  color: var(--subapp-success);
}

.amount-text.decrease {
  color: var(--subapp-danger);
}

:deep(.arco-table-th) {
  background-color: #f7f8fa;
  font-weight: 500;
}

:deep(.arco-table-td) {
  padding: 8px 12px;
}

:deep(.arco-table-size-small .arco-table-td) {
  padding: 6px 8px;
}

:deep(.arco-badge-number) {
  background-color: var(--subapp-primary);
}

.loan-tags-content {
  padding: 8px 4px;
}

.loan-tags-content .tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>