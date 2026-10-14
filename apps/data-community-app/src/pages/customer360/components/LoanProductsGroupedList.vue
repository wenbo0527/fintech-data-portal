<template>
  <div class="loan-products-grouped">
    <!-- 头部 -->
    <div class="lp-header">
      <div class="lp-title-area">
        <IconLink class="lp-title-icon" />
        <span class="lp-title-text">用信列表</span>
        <a-tag color="arcoblue" size="small">
          按「授信申请ID → 用信产品」二级分组
        </a-tag>
      </div>
      <div class="lp-summary">
        <span>授信申请 <strong>{{ groupedData.length }}</strong> 个</span>
        <a-divider direction="vertical" />
        <span>用信笔数 <strong>{{ totalLoanCount }}</strong> 笔</span>
        <a-divider direction="vertical" />
        <span>在贷余额合计 <strong class="text-green-600">¥{{ formatAmount(totalBalance) }}</strong></span>
      </div>
    </div>

    <!-- 树形二级分组 -->
    <div v-if="groupedData.length === 0" class="lp-empty">
      <a-empty description="暂无用信数据" />
    </div>

    <div v-else class="lp-tree">
      <!-- 一级：授信申请ID（不再按授信产品分组，授信产品归属感保留在每个 appGroup 上） -->
      <div
        v-for="appGroup in groupedData"
        :key="appGroup.creditApplicationId"
        class="lp-app-group"
      >
        <div class="lp-app-row">
          <IconLink class="lp-app-icon" />
          <span class="lp-app-label">
            授信申请ID: <strong>{{ appGroup.creditApplicationId }}</strong>
          </span>
          <a-tag color="gray" size="small">
            归属：{{ getCreditProductName(appGroup.creditProductId) }} · {{ appGroup.creditProductId }}
          </a-tag>
          <a-tag color="arcoblue" size="small">
            {{ appGroup.loanProducts.length }} 个用信产品
          </a-tag>
          <a-tag color="green" size="small">
            {{ appGroup.totalLoanCount }} 笔借款
          </a-tag>
          <span class="lp-app-amount">
            在贷 ¥{{ formatAmount(appGroup.totalBalance) }}
          </span>
        </div>

        <!-- 二级：用信产品卡片 -->
        <div class="lp-loan-products">
          <div
            v-for="lp in appGroup.loanProducts"
            :key="lp.loanProductId"
            class="lp-product-card"
          >
            <div class="lp-product-head">
              <IconBookmark class="lp-product-icon" />
              <span class="lp-product-name">{{ lp.loanProductName }}</span>
              <a-tag size="small" color="gray">{{ lp.loanProductId }}</a-tag>
            </div>
            <div v-if="lp.loans.length > 0" class="lp-product-loans">
              <div class="loan-row-header">
                <span>用信单号</span>
                <span>用信日期</span>
                <span>银行卡号</span>
                <span>用信结果</span>
                <span>拒绝原因</span>
                <span>借据号</span>
                <span>三方借据号</span>
                <span>借据状态</span>
                <span>借款金额</span>
                <span>期数</span>
                <span>操作</span>
              </div>
              <div
                v-for="loan in lp.loans"
                :key="loan.id"
                class="loan-row"
              >
                <span class="loan-cell loan-id">{{ loan.loanNo || '-' }}</span>
                <span class="loan-cell">{{ loan.loanDate || '-' }}</span>
                <span class="loan-cell">{{ loan.bankCardNo || '-' }}</span>
                <span class="loan-cell">
                  <a-tag :color="getResultColor(loan.result)" size="small">{{ loan.result || '-' }}</a-tag>
                </span>
                <span class="loan-cell" :class="{ 'text-red': loan.rejectReason }">{{ loan.rejectReason || '-' }}</span>
                <span class="loan-cell loan-id">{{ loan.iouNo || '-' }}</span>
                <span class="loan-cell loan-id">{{ loan.thirdPartyIouNo || '-' }}</span>
                <span class="loan-cell">
                  <a-tag :color="getIouStatusColor(loan.iouStatus)" size="small">{{ loan.iouStatus || '-' }}</a-tag>
                </span>
                <span class="loan-cell amount">¥{{ formatAmount(loan.amount) }}</span>
                <span class="loan-cell">{{ loan.installments ? loan.installments + '期' : '-' }}</span>
                <span class="loan-cell">
                  <a-space :size="2" wrap>
                    <a-button size="mini" type="text" @click="emit('view-loan', loan)">详情</a-button>
                    <a-button size="mini" type="text" @click="emit('view-disbursement', loan)">放款信息</a-button>
                    <a-button size="mini" type="text" @click="emit('view-repayment', loan)">还款信息</a-button>
                    <a-button size="mini" type="text" @click="emit('view-initial-plan', loan)">初始还款计划</a-button>
                    <a-button size="mini" type="text" @click="emit('view-tags', loan)">标签</a-button>
                  </a-space>
                </span>
              </div>
            </div>
            <div v-else class="lp-product-empty">
              该用信产品下暂无借款记录
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  IconLink,
  IconStorage,
  IconBookmark
} from '@arco-design/web-vue/es/icon'
import { formatAmount } from '../../../utils-dca/formatUtils'

interface Props {
  loans: any[]
  loanProducts: any[]
  creditApplications: any[]
  products: any[]
}

const props = withDefaults(defineProps<Props>(), {
  loans: () => [],
  loanProducts: () => [],
  creditApplications: () => [],
  products: () => []
})

const emit = defineEmits<{
  'view-loan': [loan: any]
  'view-disbursement': [loan: any]
  'view-repayment': [loan: any]
  'view-initial-plan': [loan: any]
  'view-tags': [loan: any]
}>()

// 一级：按 creditApplicationId 分组（不再按 creditProductId 分组）
const groupedData = computed(() => {
  const appMap = new Map<string, {
    creditApplicationId: string
    creditProductId: string
    loanProducts: Map<string, {
      loanProductId: string
      loanProductName: string
      loans: any[]
    }>
    totalLoanCount: number
    totalBalance: number
  }>()

  // 先按 creditApplicationId 建立分组（来自 creditApplications）
  for (const app of props.creditApplications) {
    if (!appMap.has(app.creditApplicationId)) {
      appMap.set(app.creditApplicationId, {
        creditApplicationId: app.creditApplicationId,
        creditProductId: app.creditProductId,
        loanProducts: new Map(),
        totalLoanCount: 0,
        totalBalance: 0
      })
    }
  }

  // loanProducts 挂到对应 application 下
  for (const lp of props.loanProducts) {
    const appGroup = appMap.get(lp.creditApplicationId)
    if (!appGroup) {continue}
    appGroup.loanProducts.set(lp.loanProductId, {
      loanProductId: lp.loanProductId,
      loanProductName: lp.loanProductName,
      loans: []
    })
  }

  // loans 挂到对应 loanProduct 下
  for (const loan of props.loans) {
    if (!loan.creditApplicationId || !loan.loanProductId) {continue}
    const appGroup = appMap.get(loan.creditApplicationId)
    if (!appGroup) {continue}
    const lpGroup = appGroup.loanProducts.get(loan.loanProductId)
    if (!lpGroup) {continue}
    lpGroup.loans.push(loan)
    appGroup.totalLoanCount += 1
    appGroup.totalBalance += Number(loan.balance || 0)
  }

  // 转为数组（按 creditApplicationId 排序）
  return Array.from(appMap.values())
    .map(ag => ({
      creditApplicationId: ag.creditApplicationId,
      creditProductId: ag.creditProductId,
      loanProducts: Array.from(ag.loanProducts.values()),
      totalLoanCount: ag.totalLoanCount,
      totalBalance: ag.totalBalance
    }))
    .sort((a, b) => a.creditApplicationId.localeCompare(b.creditApplicationId))
})

const totalLoanCount = computed(() =>
  groupedData.value.reduce((sum, ag) => sum + ag.totalLoanCount, 0)
)

const totalBalance = computed(() =>
  groupedData.value.reduce((sum, ag) => sum + ag.totalBalance, 0)
)

const getCreditProductName = (cpid: string): string => {
  const found = props.products.find((p: any) => p.creditProductId === cpid)
  return found?.productName || cpid
}

const getStatusColor = (status?: string) => {
  const map: Record<string, string> = {
    '正常': 'green',
    '逾期': 'red',
    '结清': 'blue',
    '关闭': 'gray'
  }
  return map[status || ''] || 'default'
}

const getResultColor = (result?: string) => {
  const map: Record<string, string> = { '成功': 'green', '失败': 'red', '拒绝': 'orange', '待处理': 'blue' }
  return map[result || ''] || 'default'
}

const getIouStatusColor = (status?: string) => {
  const map: Record<string, string> = { '正常': 'green', '逾期': 'red', '已结清': 'gray', '结清': 'blue', '冻结': 'orange', '拒绝': 'red', '放款中': 'blue' }
  return map[status || ''] || 'default'
}
</script>

<style scoped>
.loan-products-grouped {
  background: #fff;
  border-radius: 6px;
  padding: 16px 20px;
}

.lp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.lp-title-area {
  display: flex;
  align-items: center;
  gap: 8px;
}

.lp-title-icon {
  font-size: 18px;
  color: var(--subapp-info);
}

.lp-title-text {
  font-size: 16px;
  font-weight: 600;
  color: var(--subapp-text-primary);
}

.lp-summary {
  font-size: 13px;
  color: var(--subapp-text-secondary);
}

.lp-empty {
  padding: 40px 0;
}

.lp-tree {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 一级：授信申请 ID */
.lp-app-group {
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 16px;
}

.lp-app-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  font-size: 13px;
}

.lp-app-icon {
  font-size: 14px;
  color: var(--subapp-primary, #165dff);
}

.lp-app-label {
  color: var(--subapp-text-primary);
}

.lp-app-amount {
  margin-left: auto;
  color: var(--subapp-text-secondary);
  font-size: 12px;
}

/* 三级：用信产品卡片 */
.lp-loan-products {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  padding: 12px 16px;
}

.lp-product-card {
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  background: #fff;
  overflow: hidden;
}

.lp-product-head {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: rgba(24, 144, 255, 0.04);
  font-size: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.lp-product-icon {
  font-size: 12px;
  color: var(--subapp-info);
}

.lp-product-name {
  font-weight: 500;
  color: var(--subapp-text-primary);
}

.lp-product-empty {
  padding: 12px;
  font-size: 12px;
  color: var(--subapp-text-tertiary);
  text-align: center;
}

/* 用信明细行（紧凑卡片式） */
.lp-product-loans {
  padding: 4px 0;
  overflow-x: auto;
}

.loan-row-header,
.loan-row {
  display: grid;
  grid-template-columns: 1.4fr 0.9fr 1fr 0.7fr 0.9fr 1.3fr 1.3fr 0.8fr 1fr 0.5fr 1.8fr;
  gap: 8px;
  padding: 6px 12px;
  font-size: 12px;
  min-width: 1200px;
}

.loan-row-header {
  background: #f7f8fa;
  color: var(--subapp-text-tertiary);
  font-weight: 500;
}

.loan-row {
  border-top: 1px dashed #f0f0f0;
  color: var(--subapp-text-secondary);
}

.loan-row:hover {
  background: rgba(24, 144, 255, 0.03);
}

.loan-cell {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.loan-id {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.loan-cell.amount {
  color: var(--subapp-text-primary);
  font-weight: 500;
}

.loan-cell.amount.balance {
  color: #00b42a;
}

.text-red {
  color: #f5222d;
}
</style>