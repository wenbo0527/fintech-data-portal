<template>
  <div class="credit-report-list">
    <!-- 顶部操作栏 -->
    <div class="list-header">
      <div class="header-title">
        <IconFile class="header-icon" />
        <span>报告列表</span>
        <a-badge :count="reports.length" :max="99" class="report-count" />
      </div>
      <div class="header-actions">
        <a-button type="primary" size="small" @click="$emit('refresh')">
          <template #icon><IconRefresh /></template>
          刷新
        </a-button>
      </div>
    </div>

    <!-- 报告卡片列表 -->
    <div v-if="reports.length > 0" class="report-cards">
      <div
        v-for="(report, index) in reports"
        :key="report.id"
        class="report-card"
        @click="handleViewDetail(report)"
      >
        <div class="card-left">
          <div class="card-index">{{ index + 1 }}</div>
          <div class="card-score">
            <span class="score-value">{{ report.creditScore }}</span>
            <span class="score-label">评分</span>
          </div>
        </div>
        <div class="card-body">
          <div class="card-header-row">
            <div class="card-meta">
              <a-tag :color="getLevelColor(report.creditLevel)" size="small">
                {{ report.creditLevel }}级
              </a-tag>
              <a-tag :color="getStatusColor(report.reportStatus)" size="small">
                {{ report.reportStatus }}
              </a-tag>
            </div>
            <div class="card-date">{{ report.queryDate }}</div>
          </div>
          <div class="card-info-row">
            <span class="info-item">
              <IconUser />
              {{ report.source }}
            </span>
            <span class="info-item">
              <IconSafe />
              负债率: {{ report.creditOverview?.creditUtilizationRate || 0 }}%
            </span>
            <span class="info-item" :class="{ 'has-overdue': (report.overdueInfo?.overdueCount ?? 0) > 0 }">
              <IconExclamationCircle />
              逾期: {{ report.overdueInfo?.overdueCount || 0 }}次
            </span>
          </div>
        </div>
        <div class="card-actions">
          <a-button type="text" size="small" @click.stop="handleCompare(report)">
            <template #icon><IconSwap /></template>
            对比
          </a-button>
          <a-button type="primary" size="small" @click.stop="handleViewDetail(report)">
            <template #icon><IconRight /></template>
            查看详情
          </a-button>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="empty-state">
      <IconFile class="empty-icon" />
      <p class="empty-text">暂无征信报告</p>
      <p class="empty-hint">请稍后再试或联系数据管理员</p>
    </div>

    <!-- 报告选择弹窗（对比前选择第二份） -->
    <a-modal
      v-model:visible="compareModalVisible"
      title="选择对比报告"
      :width="480"
      @ok="handleCompareConfirm"
      @cancel="compareModalVisible = false"
    >
      <div class="compare-select-list">
        <div
          v-for="report in availableReports"
          :key="report.id"
          class="compare-select-item"
          :class="{ selected: compareTargetId === report.id }"
          @click="compareTargetId = report.id"
        >
          <a-radio :model-value="compareTargetId === report.id" />
          <div class="select-item-content">
            <div class="select-item-header">
              <span class="select-item-date">{{ report.queryDate }}</span>
              <a-tag :color="getLevelColor(report.creditLevel)" size="small">
                {{ report.creditLevel }}级
              </a-tag>
            </div>
            <div class="select-item-meta">
              评分: {{ report.creditScore }} | 负债率: {{ report.creditOverview?.creditUtilizationRate || 0 }}%
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <a-button @click="compareModalVisible = false">取消</a-button>
        <a-button type="primary" :disabled="!compareTargetId" @click="handleCompareConfirm">
          开始对比
        </a-button>
      </template>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  IconFile,
  IconRefresh,
  IconRight,
  IconSwap,
  IconUser,
  IconSafe,
  IconExclamationCircle
} from '@arco-design/web-vue/es/icon'

interface CreditReport {
  id: string
  reportId: string
  source: string
  queryDate: string
  creditScore: number
  creditLevel: string
  reportStatus: string
  creditOverview?: {
    creditCardAccounts: number
    loanAccounts: number
    totalCreditLimit: number
    usedCredit: number
    creditUtilizationRate: number
  }
  overdueInfo?: {
    overdueCount: number
    maxOverdueDays: number
    overdueAmount: number
    currentOverdueCount: number
  }
  queryRecords?: {
    totalQueryCount: number
    queriesLast3Months: number
    queryReasons: { reason: string; count: number }[]
  }
  specialNotes?: { type: string; label: string; description: string }[]
  accounts?: {
    type: 'credit_card' | 'loan'
    bank: string
    accountNo: string
    openDate: string
    creditLimit: number
    usedAmount: number
    overdueStatus: string
    overdueDays: number
  }[]
}

const props = defineProps<{
  reports: CreditReport[]
}>()

const emit = defineEmits<{
  (e: 'refresh'): void
  (e: 'view-detail', report: CreditReport): void
  (e: 'compare', reports: [CreditReport, CreditReport]): void
}>()

// 状态
const detailDrawerVisible = ref(false)
const selectedReport = ref<CreditReport | null>(null)
const compareModalVisible = ref(false)
const compareBaseReport = ref<CreditReport | null>(null)
const compareTargetId = ref<string | null>(null)

// 计算可选的对比报告（排除已选择的）
const availableReports = computed(() => {
  if (!compareBaseReport.value) return []
  return props.reports.filter(r => r.id !== compareBaseReport.value?.id)
})

// 方法
const getLevelColor = (level: string) => {
  const colorMap: Record<string, string> = {
    'AAA': 'green', 'AA': 'green', 'A': 'cyan',
    'BBB': 'blue', 'BB': 'blue', 'B': 'arcoblue',
    'CCC': 'orange', 'CC': 'orange', 'C': 'orangered',
    'D': 'red'
  }
  return colorMap[level] || 'default'
}

const getStatusColor = (status: string) => {
  const colorMap: Record<string, string> = {
    '正常': 'green',
    '关注': 'orange',
    '异常': 'red'
  }
  return colorMap[status] || 'default'
}

const handleViewDetail = (report: CreditReport) => {
  emit('view-detail', report)
}

const handleCompare = (report: CreditReport) => {
  // 如果只有2份报告，直接对比
  if (props.reports.length === 2) {
    const otherReport = props.reports.find(r => r.id !== report.id)
    if (otherReport) {
      emit('compare', [report, otherReport])
      return
    }
  }
  
  // 否则弹出选择框
  detailDrawerVisible.value = false
  compareBaseReport.value = report
  compareTargetId.value = null
  
  // 默认选择第一个可对比的报告
  const firstAvailable = availableReports.value[0]
  if (firstAvailable) {
    compareTargetId.value = firstAvailable.id
  }
  
  compareModalVisible.value = true
}

const handleCompareConfirm = () => {
  if (!compareBaseReport.value || !compareTargetId.value) return
  
  const targetReport = props.reports.find(r => r.id === compareTargetId.value)
  if (targetReport) {
    emit('compare', [compareBaseReport.value, targetReport])
  }
  
  compareModalVisible.value = false
  compareBaseReport.value = null
  compareTargetId.value = null
}
</script>

<style scoped>
.credit-report-list {
  padding: 0;
}

/* 顶部操作栏 */
.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f7f8fa;
  border-radius: 8px 8px 0 0;
  border-bottom: 1px solid #e8e8e8;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: var(--subapp-text-primary);
}

.header-icon {
  font-size: 18px;
  color: var(--subapp-info);
}

.report-count {
  margin-left: 4px;
}

/* 报告卡片列表 */
.report-cards {
  padding: 16px;
}

.report-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  margin-bottom: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.report-card:hover {
  border-color: var(--subapp-info);
  box-shadow: 0 2px 12px rgba(24, 144, 255, 0.15);
}

.card-left {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 70px;
}

.card-index {
  width: 24px;
  height: 24px;
  background: #e6f7ff;
  color: var(--subapp-info);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
}

.card-score {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.score-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--subapp-info);
  line-height: 1;
}

.score-label {
  font-size: 11px;
  color: #8c8c8c;
}

.card-body {
  flex: 1;
  min-width: 0;
}

.card-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.card-meta {
  display: flex;
  gap: 8px;
}

.card-date {
  font-size: 13px;
  color: #8c8c8c;
}

.card-info-row {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #666;
}

.info-item.has-overdue {
  color: var(--subapp-danger);
  font-weight: 500;
}

.card-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #8c8c8c;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-text {
  margin: 0;
  font-size: 14px;
  color: var(--subapp-text-primary);
}

.empty-hint {
  margin: 8px 0 0;
  font-size: 12px;
  color: #8c8c8c;
}

/* 抽屉样式 */
:deep(.credit-detail-drawer .arco-drawer-body) {
  padding: 0;
}

/* 对比选择弹窗 */
.compare-select-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.compare-select-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.compare-select-item:hover {
  border-color: var(--subapp-info);
  background: #f0f9ff;
}

.compare-select-item.selected {
  border-color: var(--subapp-info);
  background: #e6f7ff;
}

.select-item-content {
  flex: 1;
}

.select-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.select-item-date {
  font-weight: 500;
  color: var(--subapp-text-primary);
}

.select-item-meta {
  font-size: 12px;
  color: #666;
}
</style>
