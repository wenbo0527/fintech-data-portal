<template>
  <a-drawer
    :visible="visible"
    :width="600"
    :closable="true"
    :mask-closable="true"
    placement="right"
    @close="$emit('close')"
  >
    <template #title>
      <div class="drawer-title">
        <IconStorage class="title-icon" />
        放款信息详情
      </div>
    </template>

    <div v-if="loading" class="loading-container">
      <a-spin size="large" />
      <p>加载放款信息...</p>
    </div>

    <div v-else class="drawer-content">
      <!-- 借据基本信息 -->
      <div class="info-section">
        <div class="section-title">
          <IconUser class="section-icon" />
          借据基本信息
        </div>
        <div class="info-grid">
          <div class="info-item">
            <span class="label">借据编号</span>
            <span class="value copyable" @click="copyText(loanRecord?.loanNo)">
              {{ loanRecord?.loanNo || '--' }}
              <IconCopy class="copy-icon" />
            </span>
          </div>
          <div class="info-item">
            <span class="label">合同编号</span>
            <span class="value copyable" @click="copyText(loanRecord?.contractNumber)">
              {{ loanRecord?.contractNumber || '--' }}
              <IconCopy class="copy-icon" />
            </span>
          </div>
          <div class="info-item">
            <span class="label">产品名称</span>
            <span class="value">{{ loanRecord?.productName || '--' }}</span>
          </div>
          <div class="info-item">
            <span class="label">借款利率</span>
            <span class="value rate">{{ formatRate(loanRecord?.interestRate) }}</span>
          </div>
          <div class="info-item">
            <span class="label">放款日期</span>
            <span class="value">{{ formatDate(loanRecord?.loanDate) }}</span>
          </div>
          <div class="info-item">
            <span class="label">到期日期</span>
            <span class="value">{{ formatDate(loanRecord?.dueDate) }}</span>
          </div>
          <div class="info-item">
            <span class="label">分期数</span>
            <span class="value">{{ loanRecord?.installments || '--' }}期</span>
          </div>
          <div class="info-item">
            <span class="label">当前期次</span>
            <span class="value">{{ loanRecord?.currentPeriod || '--' }}期</span>
          </div>
        </div>
      </div>

      <!-- 金额统计 -->
      <div class="statistics-section">
        <div class="section-title">
          <DollarSign class="section-icon" />
          金额统计
        </div>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">放款金额</div>
            <div class="stat-value amount">{{ formatAmount(loanRecord?.amount) }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">剩余本金</div>
            <div class="stat-value amount">{{ formatAmount(loanRecord?.remainingPrincipal) }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">剩余利息</div>
            <div class="stat-value amount">{{ formatAmount(loanRecord?.remainingInterest) }}</div>
          </div>
          <div class="stat-card penalty" v-if="(loanRecord?.remainingPenalty ?? 0) > 0">
            <div class="stat-label">
              剩余罚息
              <a-tooltip content="本金罚息+利息罚息">
                <IconExclamationCircle class="penalty-tip" />
              </a-tooltip>
            </div>
            <div class="stat-value amount penalty">{{ formatAmount(loanRecord?.remainingPenalty) }}</div>
          </div>
          <div class="stat-card total">
            <div class="stat-label">剩余应还总额</div>
            <div class="stat-value amount total">{{ formatAmount(loanRecord?.remainingTotal) }}</div>
          </div>
        </div>
      </div>

      <!-- 放款记录 -->
      <div class="records-section">
        <div class="section-title">
          <IconHistory class="section-icon" />
          放款记录
        </div>
        <div class="records-list">
          <div v-for="record in disbursementRecords" :key="record.id" class="record-card">
            <div class="record-header">
              <span class="record-date">{{ formatDate(record.disbursementDate) }}</span>
              <span class="record-amount">{{ formatAmount(record.amount) }}</span>
            </div>
            <div class="record-details">
              <div class="detail-row">
                <span class="detail-label">放款渠道:</span>
                <span class="detail-value">{{ record.channel }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">银行卡号:</span>
                <span class="detail-value copyable" @click="copyText(record.bankCard)">
                  {{ record.bankCard }}
                  <IconCopy class="copy-icon" />
                </span>
              </div>
              <div class="detail-row">
                <span class="detail-label">状态:</span>
                <a-tag :color="getDisbursementStatusColor(record.status)">{{ record.status }}</a-tag>
              </div>
            </div>
          </div>
        </div>
        
        <a-empty v-if="disbursementRecords.length === 0" description="暂无放款记录" />
      </div>

      <!-- 审批信息 -->
      <div class="approval-section">
        <div class="section-title">
          <IconFile class="section-icon" />
          审批信息
        </div>
        <div class="approval-timeline">
          <div v-for="approval in approvalHistory" :key="approval.id" class="approval-item">
            <div class="approval-dot" :class="getApprovalStatusClass(approval.status)"></div>
            <div class="approval-content">
              <div class="approval-header">
                <span class="approval-step">{{ approval.step }}</span>
                <span class="approval-time">{{ formatDate(approval.time) }}</span>
              </div>
              <div class="approval-details">
                <div class="approval-result">
                  <a-tag :color="getApprovalStatusColor(approval.status)">{{ approval.status }}</a-tag>
                </div>
                <div class="approval-operator">审批人: {{ approval.operator }}</div>
                <div v-if="approval.remark" class="approval-remark">备注: {{ approval.remark }}</div>
              </div>
            </div>
          </div>
        </div>
        
        <a-empty v-if="approvalHistory.length === 0" description="暂无审批记录" />
      </div>
    </div>
  </a-drawer>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Message } from '@arco-design/web-vue'
import {
  IconUser,
  IconFile,
  IconHistory,
  IconStorage,
  IconCheckCircle,
  IconCopy,
  IconExclamationCircle
} from '@arco-design/web-vue/es/icon'
import { DollarSign } from 'lucide-vue-next'

// 接口定义
interface DisbursementRecord {
  id: string
  disbursementDate: string
  amount: number
  channel: string
  bankCard: string
  status: string
}

interface ApprovalRecord {
  id: string
  step: string
  status: string
  operator: string
  time: string
  remark?: string
}

interface LoanRecord {
  loanNo: string
  contractNumber: string
  productName: string
  interestRate: number
  loanDate: string
  dueDate: string
  installments: number
  currentPeriod: number
  amount: number
  remainingPrincipal: number
  remainingInterest: number
  remainingPenalty: number
  remainingTotal: number
}

// Props 和 Emits
interface Props {
  visible: boolean
  loanRecord?: LoanRecord | null
}

interface Emits {
  (e: 'close'): void
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  loanRecord: null
})

const emit = defineEmits<Emits>()

// 响应式数据
const loading = ref(false)
const disbursementRecords = ref<DisbursementRecord[]>([])
const approvalHistory = ref<ApprovalRecord[]>([])

// 计算属性
const visible = computed(() => props.visible)

// 监听器
watch(() => props.visible, (newVisible) => {
  if (newVisible && props.loanRecord) {
    loadDisbursementData()
  }
})

// 方法
const loadDisbursementData = async () => {
  if (!props.loanRecord) {return}
  
  loading.value = true
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // 模拟放款记录数据
    disbursementRecords.value = [
      {
        id: '1',
        disbursementDate: props.loanRecord.loanDate,
        amount: props.loanRecord.amount,
        channel: '手机银行',
        bankCard: '6222 **** **** 1234',
        status: '成功'
      }
    ]
    
    // 模拟审批历史数据
    approvalHistory.value = [
      {
        id: '1',
        step: '初审',
        status: '通过',
        operator: '张三',
        time: '2024-01-15 09:30:00',
        remark: '客户资质良好'
      },
      {
        id: '2',
        step: '复审',
        status: '通过',
        operator: '李四',
        time: '2024-01-15 14:20:00'
      },
      {
        id: '3',
        step: '终审',
        status: '通过',
        operator: '王五',
        time: '2024-01-15 16:45:00',
        remark: '批准放款'
      }
    ]
  } catch (error) {
    Message.error('加载放款信息失败')
  } finally {
    loading.value = false
  }
}

const formatAmount = (amount: number | undefined) => {
  if (!amount) {return '¥0.00'}
  return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const formatDate = (date: string | undefined) => {
  if (!date) {return '--'}
  return new Date(date).toLocaleDateString('zh-CN')
}

const formatRate = (rate: number | undefined) => {
  if (!rate) {return '--'}
  return `${rate}%`
}

const getDisbursementStatusColor = (status: string) => {
  const colorMap: Record<string, string> = {
    '成功': 'green',
    '失败': 'red',
    '处理中': 'orange'
  }
  return colorMap[status] || 'default'
}

const getApprovalStatusColor = (status: string) => {
  const colorMap: Record<string, string> = {
    '通过': 'green',
    '拒绝': 'red',
    '待审批': 'orange'
  }
  return colorMap[status] || 'default'
}

const getApprovalStatusClass = (status: string) => {
  const classMap: Record<string, string> = {
    '通过': 'success',
    '拒绝': 'error',
    '待审批': 'warning'
  }
  return classMap[status] || 'default'
}

const copyText = async (text: string | undefined) => {
  if (!text) {return}
  
  try {
    await navigator.clipboard.writeText(text)
    Message.success('已复制到剪贴板')
  } catch (error) {
    Message.error('复制失败')
  }
}
</script>

<style scoped>
.drawer-title {
  display: flex;
  align-items: center;
  font-size: 16px;
  font-weight: 600;
  color: var(--subapp-text-primary);
}

.title-icon {
  margin-right: 8px;
  color: var(--subapp-primary);
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: var(--subapp-text-tertiary);
}

.drawer-content {
  padding: 0;
}

.info-section,
.statistics-section,
.records-section,
.approval-section {
  margin-bottom: 24px;
  padding: 16px;
  background: #f7f8fa;
  border-radius: 6px;
}

.section-title {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  font-size: 14px;
  font-weight: 600;
  color: var(--subapp-text-primary);
}

.section-icon {
  margin-right: 8px;
  color: var(--subapp-primary);
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}

.label {
  color: var(--subapp-text-tertiary);
  font-size: 13px;
}

.value {
  color: var(--subapp-text-primary);
  font-weight: 500;
  font-size: 13px;
}

.value.copyable {
  cursor: pointer;
  color: var(--subapp-primary);
  display: flex;
  align-items: center;
}

.value.copyable:hover {
  color: var(--subapp-primary);
}

.copy-icon {
  margin-left: 4px;
  font-size: 12px;
  opacity: 0.7;
}

.value.rate {
  color: var(--subapp-danger);
  font-weight: 600;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.stat-card {
  padding: 12px;
  background: white;
  border-radius: 4px;
  border: 1px solid #e5e6eb;
}

.stat-card.penalty {
  border-color: var(--subapp-danger);
  background: #fff1f0;
}

.stat-card.total {
  border-color: var(--subapp-primary);
  background: #f0f5ff;
}

.stat-label {
  display: flex;
  align-items: center;
  font-size: 12px;
  color: var(--subapp-text-tertiary);
  margin-bottom: 4px;
}

.penalty-tip {
  margin-left: 4px;
  color: var(--subapp-danger);
  cursor: help;
}

.stat-value {
  font-size: 16px;
  font-weight: 600;
  color: var(--subapp-text-primary);
}

.stat-value.amount {
  color: var(--subapp-primary);
}

.stat-value.penalty {
  color: var(--subapp-danger);
}

.stat-value.total {
  color: var(--subapp-primary);
  font-size: 18px;
}

.records-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.record-card {
  padding: 12px;
  background: white;
  border-radius: 4px;
  border: 1px solid #e5e6eb;
}

.record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.record-date {
  font-size: 13px;
  color: var(--subapp-text-tertiary);
}

.record-amount {
  font-size: 14px;
  font-weight: 600;
  color: var(--subapp-primary);
}

.record-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.detail-label {
  font-size: 12px;
  color: var(--subapp-text-tertiary);
}

.detail-value {
  font-size: 12px;
  color: var(--subapp-text-primary);
}

.detail-value.copyable {
  cursor: pointer;
  color: var(--subapp-primary);
  display: flex;
  align-items: center;
}

.approval-timeline {
  position: relative;
  padding-left: 20px;
}

.approval-timeline::before {
  content: '';
  position: absolute;
  left: 8px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #e5e6eb;
}

.approval-item {
  position: relative;
  margin-bottom: 16px;
}

.approval-dot {
  position: absolute;
  left: -16px;
  top: 4px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #e5e6eb;
}

.approval-dot.success {
  background: var(--subapp-success);
}

.approval-dot.error {
  background: var(--subapp-danger);
}

.approval-dot.warning {
  background: var(--subapp-warning);
}

.approval-content {
  padding: 8px 12px;
  background: white;
  border-radius: 4px;
  border: 1px solid #e5e6eb;
}

.approval-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.approval-step {
  font-weight: 600;
  color: var(--subapp-text-primary);
}

.approval-time {
  font-size: 12px;
  color: var(--subapp-text-tertiary);
}

.approval-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.approval-result {
  margin-bottom: 4px;
}

.approval-operator,
.approval-remark {
  font-size: 12px;
  color: var(--subapp-text-tertiary);
}

@media (max-width: 768px) {
  .info-grid,
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>