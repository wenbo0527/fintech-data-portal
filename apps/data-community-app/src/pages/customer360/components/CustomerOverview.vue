<template>
  <div class="customer-overview">
    <div class="overview-header">
      <h4>客户概览</h4>
      <div class="header-actions">
        <a-button size="small" @click="refreshData">
          <template #icon><IconRefresh /></template>
          刷新
        </a-button>

        <!-- 查看联系人按钮 -->
        <a-button size="small" @click="showContacts">
          <template #icon><IconUserGroup /></template>
          查看联系人
        </a-button>
      </div>
    </div>
    
    <div v-if="loading" class="loading-state">
      <a-spin size="large" />
      <p>加载客户概览数据...</p>
    </div>
    
    <div v-else-if="!userInfo" class="empty-state">
      <a-empty description="暂无客户数据" />
    </div>
    
    <div v-else class="overview-content">
      <!-- 客户基本信息卡片 -->
      <div class="info-card">
        <div class="card-header">
          <div class="header-left">
            <IconUser class="card-icon" />
            <span class="card-title">客户基本信息</span>
          </div>
          <div class="header-right">
            <a-tag color="green" size="small">
              <template #icon><span class="live-dot"></span></template>
              实时
            </a-tag>
          </div>
        </div>
        <div class="card-content">
          <div class="info-grid">
            <div class="info-item">
              <span class="label">姓名</span>
              <span class="value">{{ userInfo.name }}</span>
            </div>
            <div class="info-item">
              <span class="label">客户号</span>
              <span class="value">{{ userInfo.customerId }}</span>
            </div>
            <div class="info-item">
              <span class="label">三方客户号</span>
              <span class="value" style="color: var(--subapp-primary)">{{ userInfo.basicInfo?.thirdPartyCustomerId || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="label">身份证号</span>
              <span class="value">{{ formatIdCard(userInfo.idCard) }}</span>
            </div>
            <div class="info-item">
              <span class="label">手机号</span>
              <span class="value">{{ formatPhone(userInfo.phone) }}</span>
            </div>
            <div class="info-item">
              <span class="label">年龄</span>
              <span class="value">{{ userInfo.age }}岁</span>
            </div>
            <div class="info-item">
              <span class="label">性别</span>
              <span class="value">{{ userInfo.gender }}</span>
            </div>
            <div class="info-item">
              <span class="label">户籍</span>
              <span class="value">{{ userInfo.domicile }}</span>
            </div>
            <div class="info-item">
              <span class="label">身份证有效期</span>
              <span class="value">{{ userInfo.idCardExpiry }}</span>
            </div>
            <div class="info-item">
              <span class="label">用户状态</span>
              <a-tag :color="getStatusColor(userInfo.status)">{{ userInfo.status }}</a-tag>
            </div>
            <div class="info-item">
              <span class="label">自营总额度</span>
              <span class="value amount">{{ formatAmount(userInfo.totalCredit) }}</span>
            </div>
            <div class="info-item">
              <span class="label">自营已用额度</span>
              <span class="value amount">{{ formatAmount(userInfo.usedCredit) }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 账户状态卡片 -->
      <div class="info-card">
        <div class="card-header">
          <IconSafe class="card-icon" />
          <span class="card-title">账户状态</span>
        </div>
        <div class="card-content">
          <div class="account-status-grid">
            <div class="status-item">
              <span class="label">当前总授信金额</span>
              <span class="value amount">{{ formatAmount(accountStatus.currentTotalCreditAmount) }}</span>
            </div>
            <div class="status-item">
              <span class="label">当前总在贷余额</span>
              <span class="value amount">{{ formatAmount(accountStatus.currentTotalLoanBalance) }}</span>
            </div>
            <div class="status-item">
              <span class="label">未结清借据笔数</span>
              <span class="value count">{{ accountStatus.unsettledLoanCount }}笔</span>
            </div>
            <div class="status-item">
              <span class="label">最大期数</span>
              <span class="value count">{{ accountStatus.maxInstallments }}期</span>
            </div>
            <div class="status-item">
              <span class="label">最早借款时间</span>
              <span class="value date">{{ formatDate(accountStatus.earliestLoanDate) }}</span>
            </div>
            <div class="status-item">
              <span class="label">已还本金</span>
              <span class="value amount">{{ formatAmount(accountStatus.totalPaidPrincipal) }}</span>
            </div>
            <div class="status-item">
              <span class="label">已还利息罚息</span>
              <span class="value amount">{{ formatAmount(accountStatus.totalPaidInterestPenalty) }}</span>
            </div>
            <div class="status-item">
              <span class="label">剩余应还本金</span>
              <span class="value amount">{{ formatAmount(accountStatus.remainingPrincipal) }}</span>
            </div>
            <div class="status-item">
              <span class="label">剩余应还利息</span>
              <span class="value amount">{{ formatAmount(accountStatus.remainingInterest) }}</span>
            </div>
            <div class="status-item">
              <span class="label">剩余应还罚息</span>
              <span class="value amount">{{ formatAmount(accountStatus.remainingPenalty) }}</span>
            </div>
            <div class="status-item total">
              <span class="label">剩余应还总额</span>
              <span class="value amount highlight">{{ formatAmount(accountStatus.remainingTotalAmount) }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 风险情况卡片 -->
      <div class="info-card">
        <div class="card-header">
          <IconExclamationCircle class="card-icon risk-icon" />
          <span class="card-title">风险情况</span>
        </div>
        <div class="card-content">
          <div class="risk-status-grid">
            <div class="risk-item">
              <span class="label">历史最大逾期天数</span>
              <span class="value risk-value">{{ riskStatus.historyMaxOverdueDays }}天</span>
            </div>
            <div class="risk-item">
              <span class="label">当前逾期期数</span>
              <span class="value risk-value">{{ riskStatus.currentOverduePeriods }}期</span>
            </div>
            <div class="risk-item">
              <span class="label">当前总逾期金额</span>
              <span class="value amount risk-value">{{ formatAmount(riskStatus.currentTotalOverdueAmount) }}</span>
            </div>
          </div>
        </div>
      </div>
      

    </div>
  </div>
  
  <!-- APP信息抽屉 -->
  <AppInfoDrawer 
    v-model:visible="appDrawerVisible"
    :app-info="currentAppInfo"
    @close="closeAppDrawer"
  />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  IconUser,
  IconApps,
  IconSafe,
  IconMobile,
  IconExclamationCircle,
  IconRefresh,
  IconUserGroup
} from '@arco-design/web-vue/es/icon'
import AppInfoDrawer from './AppInfoDrawer.vue'

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

// APP信息抽屉状态
const appDrawerVisible = ref(false)
const currentAppInfo = ref<Record<string, any> | undefined>(undefined)

// 计算属性

// 账户状态相关计算属性
const accountStatus = computed(() => {
  return {
    currentTotalCreditAmount: props.userInfo?.currentTotalCreditAmount || 0,
    currentTotalLoanBalance: props.userInfo?.currentTotalLoanBalance || 0,
    unsettledLoanCount: props.userInfo?.unsettledLoanCount || 0,
    maxInstallments: props.userInfo?.maxInstallments || 0,
    earliestLoanDate: props.userInfo?.earliestLoanDate || '',
    totalPaidPrincipal: props.userInfo?.totalPaidPrincipal || 0,
    totalPaidInterestPenalty: props.userInfo?.totalPaidInterestPenalty || 0,
    remainingPrincipal: props.userInfo?.remainingPrincipal || 0,
    remainingInterest: props.userInfo?.remainingInterest || 0,
    remainingPenalty: props.userInfo?.remainingPenalty || 0,
    remainingTotalAmount: props.userInfo?.remainingTotalAmount || 0
  }
})

// 风险情况相关计算属性
const riskStatus = computed(() => {
  return {
    historyMaxOverdueDays: props.userInfo?.historyMaxOverdueDays || 0,
    currentOverduePeriods: props.userInfo?.currentOverduePeriods || 0,
    currentTotalOverdueAmount: props.userInfo?.currentTotalOverdueAmount || 0
  }
})

// recentActivities 计算属性已删除（最近活动模块已删除）

// 方法
const refreshData = () => {
  emit('refresh')
  emit('debug-info', {
    action: 'refresh',
    component: 'CustomerOverview',
    productKey: props.productKey
  })
}

// 处理产品点击
const handleProductClick = (product: any) => {
  // 可以在这里添加产品选择逻辑
}

// 显示APP信息抽屉
const showAppInfo = (appInfo: any) => {
  currentAppInfo.value = appInfo
  appDrawerVisible.value = true
}

// 关闭APP信息抽屉
const closeAppDrawer = () => {
  appDrawerVisible.value = false
  currentAppInfo.value = undefined
}

// 显示联系人
const showContacts = () => {
  // TODO: 实现查看联系人功能
}

const formatPhone = (phone: string) => {
  if (!phone) {return '--'}
  return phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1****$3')
}

const formatIdCard = (idCard: string) => {
  if (!idCard) {return '--'}
  return idCard.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2')
}

const formatDate = (date: string) => {
  if (!date) {return '--'}
  return new Date(date).toLocaleDateString('zh-CN')
}

const formatAmount = (amount: number) => {
  if (amount === 0) {return '¥0'}
  if (!amount) {return '--'}
  return `¥${amount.toLocaleString()}`
}

const getStatusColor = (status: string) => {
  const colorMap: Record<string, string> = {
    '正常': 'green',
    '冻结': 'orange',
    '注销': 'red'
  }
  return colorMap[status] || 'default'
}


</script>

<style scoped>
.customer-overview {
  padding: 16px;
}

.overview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.overview-header h4 {
  margin: 0;
  color: var(--subapp-text-primary);
  font-size: 16px;
  font-weight: 600;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: var(--subapp-text-tertiary);
}

.overview-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-card {
  background: #fff;
  border: 1px solid #e5e6eb;
  border-radius: 4px;
  padding: 20px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.02);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
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

.card-icon {
  margin-right: 12px;
  color: var(--subapp-primary);
  font-size: 20px;
}

.card-title {
  font-weight: 600;
  color: var(--subapp-text-primary);
  font-size: 16px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px 32px;
}

.info-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.label {
  color: var(--subapp-text-tertiary);
  font-size: 13px;
  margin-bottom: 2px;
}

.value {
  color: var(--subapp-text-primary);
  font-size: 14px;
  font-weight: 500;
}

.value.amount {
  font-family: 'DIN Alternate', sans-serif;
  font-size: 16px;
  font-weight: 600;
  color: var(--subapp-text-primary);
}

/* 账户状态样式 */
.account-status-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px 32px;
}

.status-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.status-item.total {
  grid-column: 1 / -1;
  border-top: 1px solid var(--subapp-bg-secondary);
  padding-top: 16px;
  margin-top: 8px;
}

.status-item .label {
  color: var(--subapp-text-tertiary);
  font-size: 13px;
}

.status-item .value {
  color: var(--subapp-text-primary);
  font-size: 14px;
  font-weight: 500;
}

.status-item .value.amount {
  color: var(--subapp-primary);
  font-family: 'DIN Alternate', sans-serif;
  font-size: 18px;
  font-weight: 600;
}

.status-item .value.count {
  color: var(--subapp-success);
  font-weight: 600;
}

.status-item .value.highlight {
  color: var(--subapp-warning);
  font-size: 20px;
  font-weight: 700;
}

/* 风险情况样式 */
.risk-status-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px 32px;
}

.risk-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.risk-item .label {
  color: var(--subapp-text-tertiary);
  font-size: 13px;
}

.risk-item .value.risk-value {
  color: var(--subapp-danger);
  font-size: 15px;
  font-weight: 600;
}

.risk-icon {
  color: var(--subapp-danger) !important;
}

.risk-overview {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.risk-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.activity-list {
  max-height: 200px;
  overflow-y: auto;
}

.activity-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid var(--subapp-bg-secondary);
}

.activity-item:last-child {
  border-bottom: none;
}

.activity-icon {
  margin-top: 2px;
}

.success-icon {
  color: var(--subapp-success);
}

.warning-icon {
  color: var(--subapp-warning);
}

.info-icon {
  color: var(--subapp-primary);
}

.activity-content {
  flex: 1;
}

.activity-title {
  color: var(--subapp-text-primary);
  font-size: 12px;
  font-weight: 500;
  margin-bottom: 4px;
}

.activity-time {
  color: var(--subapp-text-tertiary);
  font-size: 11px;
}
</style>