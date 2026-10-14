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
        <IconHistory class="title-icon" />
        还款信息详情
      </div>
    </template>

    <div v-if="loading" class="loading-container">
      <a-spin size="large" />
      <p>加载还款信息...</p>
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
            <span class="value copyable" @click="copyText(loanRecord?.contractNo)">
              {{ loanRecord?.contractNo || '--' }}
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
            <span class="label">用信日期</span>
            <span class="value">{{ formatDate(loanRecord?.loanDate) }}</span>
          </div>
          <div class="info-item">
            <span class="label">分期数</span>
            <span class="value">{{ loanRecord?.installments || '--' }}期</span>
          </div>
        </div>
      </div>

      <!-- 还款概览 -->
      <div class="statistics-section">
        <div class="section-title">
          <DollarSign class="section-icon" />
          还款概览
        </div>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">借款金额</div>
            <div class="stat-value amount">{{ formatAmount(loanRecord?.amount) }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">剩余应还</div>
            <div class="stat-value amount">{{ formatAmount(loanRecord?.remainingTotal) }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">剩余本金</div>
            <div class="stat-value amount">{{ formatAmount(loanRecord?.remainingPrincipal) }}</div>
          </div>
          <div class="stat-card penalty" v-if="(loanRecord?.remainingPenalty || 0) > 0">
            <div class="stat-label">剩余罚息</div>
            <div class="stat-value amount penalty">{{ formatAmount(loanRecord?.remainingPenalty) }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">当前期次</div>
            <div class="stat-value amount">{{ loanRecord?.currentPeriod || '--' }}期</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">逾期天数</div>
            <div class="stat-value amount" :class="{ 'penalty': (loanRecord?.overdueDays || 0) > 0 }">
              {{ loanRecord?.overdueDays || 0 }} 天
            </div>
          </div>
        </div>
      </div>

      <!-- 还款记录 -->
      <div class="records-section">
        <div class="section-title">
          <IconHistory class="section-icon" />
          还款记录
        </div>
        <div v-if="repaymentRecords.length > 0" class="records-list">
          <div v-for="record in repaymentRecords" :key="record.id" class="record-card">
            <div class="record-header">
              <span class="record-date">{{ formatDate(record.repayDate) }}</span>
              <a-tag :color="getRepaymentStatusColor(record.status)" size="small">
                {{ record.status }}
              </a-tag>
            </div>
            <div class="record-amount">{{ formatAmount(record.amount) }}</div>
            <div class="record-details">
              <div class="detail-row">
                <span class="detail-label">期次:</span>
                <span class="detail-value">第 {{ record.period }} 期</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">还款方式:</span>
                <span class="detail-value">{{ record.method }}</span>
              </div>
              <div class="detail-row" v-if="record.bankCard">
                <span class="detail-label">扣款卡:</span>
                <span class="detail-value copyable" @click="copyText(record.bankCard)">
                  {{ record.bankCard }}
                  <IconCopy class="copy-icon" />
                </span>
              </div>
              <div class="detail-row" v-if="record.overdueDays && record.overdueDays > 0">
                <span class="detail-label">逾期天数:</span>
                <span class="detail-value penalty">{{ record.overdueDays }} 天</span>
              </div>
            </div>
          </div>
        </div>
        <a-empty v-else description="暂无还款记录" />
      </div>
    </div>
  </a-drawer>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Message } from '@arco-design/web-vue'
import {
  IconUser,
  IconHistory,
  IconCopy
} from '@arco-design/web-vue/es/icon'
import { DollarSign } from 'lucide-vue-next'

interface RepaymentRecord {
  id: string
  repayDate: string
  amount: number
  period: number
  method: string
  bankCard?: string
  status: string
  overdueDays?: number
}

interface LoanRecord {
  loanNo?: string
  contractNo?: string
  productName?: string
  interestRate?: number
  loanDate?: string
  installments?: number
  currentPeriod?: number
  amount?: number
  remainingPrincipal?: number
  remainingInterest?: number
  remainingPenalty?: number
  remainingTotal?: number
  overdueDays?: number
  status?: string
}

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

const loading = ref(false)
const repaymentRecords = ref<RepaymentRecord[]>([])

const visible = computed(() => props.visible)

watch(() => props.visible, (newVisible) => {
  if (newVisible && props.loanRecord) {
    loadRepaymentData()
  }
})

const loadRepaymentData = async () => {
  if (!props.loanRecord) return

  loading.value = true
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 500))

    const loan = props.loanRecord
    const records: RepaymentRecord[] = []

    // 已结清：按期数生成还款记录
    if (loan.status === '已结清') {
      const installments = loan.installments || 1
      const perAmount = Math.round((loan.amount || 0) / installments)
      const startDate = new Date(loan.loanDate || new Date())
      for (let i = 1; i <= installments; i++) {
        const d = new Date(startDate)
        d.setMonth(d.getMonth() + i)
        records.push({
          id: `R${i}`,
          repayDate: d.toISOString().slice(0, 10),
          amount: perAmount,
          period: i,
          method: i % 2 === 0 ? '主动还款' : '自动扣款',
          bankCard: '6222 **** **** 1234',
          status: '已还款'
        })
      }
    } else if (loan.status === '正常' && (loan.currentPeriod || 0) > 0) {
      // 在贷：仅展示已还期次
      const current = loan.currentPeriod || 0
      const perAmount = Math.round((loan.amount || 0) / (loan.installments || current))
      const startDate = new Date(loan.loanDate || new Date())
      for (let i = 1; i <= current; i++) {
        const d = new Date(startDate)
        d.setMonth(d.getMonth() + i)
        records.push({
          id: `R${i}`,
          repayDate: d.toISOString().slice(0, 10),
          amount: perAmount,
          period: i,
          method: '自动扣款',
          bankCard: '6222 **** **** 1234',
          status: '已还款'
        })
      }
    } else if (loan.status === '逾期') {
      // 逾期：展示最近一期已还 + 当前逾期
      const current = Math.max((loan.currentPeriod || 1) - 1, 0)
      const perAmount = Math.round((loan.amount || 0) / (loan.installments || current || 1))
      const startDate = new Date(loan.loanDate || new Date())
      if (current > 0) {
        const d = new Date(startDate)
        d.setMonth(d.getMonth() + current)
        records.push({
          id: `R${current}`,
          repayDate: d.toISOString().slice(0, 10),
          amount: perAmount,
          period: current,
          method: '主动还款',
          bankCard: '6222 **** **** 1234',
          status: '已还款'
        })
      }
      const nextDate = new Date(startDate)
      nextDate.setMonth(nextDate.getMonth() + (current + 1))
      records.push({
        id: `R${current + 1}`,
        repayDate: nextDate.toISOString().slice(0, 10),
        amount: perAmount,
        period: current + 1,
        method: '自动扣款',
        bankCard: '6222 **** **** 1234',
        status: '逾期',
        overdueDays: loan.overdueDays || 0
      })
    }

    repaymentRecords.value = records
  } catch (error) {
    Message.error('加载还款信息失败')
  } finally {
    loading.value = false
  }
}

const formatAmount = (amount: number | undefined) => {
  if (!amount) return '¥0.00'
  return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const formatDate = (date: string | undefined) => {
  if (!date) return '--'
  return new Date(date).toLocaleDateString('zh-CN')
}

const formatRate = (rate: number | undefined) => {
  if (!rate) return '--'
  return `${rate}%`
}

const getRepaymentStatusColor = (status: string) => {
  const colorMap: Record<string, string> = {
    '已还款': 'green',
    '还款中': 'blue',
    '逾期': 'red',
    '失败': 'red'
  }
  return colorMap[status] || 'default'
}

const copyText = async (text: string | undefined) => {
  if (!text) return
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
.records-section {
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

.info-grid,
.stats-grid {
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

.copy-icon {
  margin-left: 4px;
  font-size: 12px;
  opacity: 0.7;
}

.value.rate {
  color: var(--subapp-danger);
  font-weight: 600;
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

.stat-label {
  font-size: 12px;
  color: var(--subapp-text-tertiary);
  margin-bottom: 4px;
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
  font-size: 16px;
  font-weight: 600;
  color: var(--subapp-primary);
  margin-bottom: 8px;
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

.detail-value.penalty {
  color: var(--subapp-danger);
  font-weight: 500;
}

@media (max-width: 768px) {
  .info-grid,
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>