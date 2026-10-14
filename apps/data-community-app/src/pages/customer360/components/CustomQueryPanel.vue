<template>
  <div class="custom-query-panel">
    <div class="cq-layout">
      <!-- 顶部:客户全景 + 目标层级 + 快速场景 -->
      <div class="cq-top-bar">
        <!-- 客户全景摘要(从 userInfo.basicInfo 拿) -->
        <div v-if="customerInfo" class="cq-customer-summary">
          <div class="summary-header">
            <div class="summary-name">
              <a-avatar :size="36" style="background:#165dff;flex-shrink:0">
                {{ customerInfo.name?.charAt(0) || '客' }}
              </a-avatar>
              <div>
                <div class="name-line">
                  <span class="name">{{ customerInfo.name }}</span>
                  <a-tag size="small" :color="customerInfo.customerLevel === 'VIP' ? 'gold' : 'arcoblue'">{{ customerInfo.customerLevel }}</a-tag>
                  <a-tag size="small" :color="customerInfo.status === '正常' ? 'green' : 'red'">{{ customerInfo.status }}</a-tag>
                </div>
                <div class="muted">
                  {{ customerInfo.userId }} ·
                  {{ customerInfo.gender || '-' }} ·
                  {{ customerInfo.age ? customerInfo.age + '岁' : '-' }} ·
                  {{ customerInfo.domicile || '-' }}
                </div>
              </div>
            </div>
            <div class="summary-tags">
              <a-tag size="small" color="cyan">{{ customerInfo.thirdPartyCustomerId || '无三方ID' }}</a-tag>
            </div>
          </div>
          <a-divider style="margin: 8px 0" />
          <div class="summary-metrics">
            <div class="metric">
              <div class="metric-label">总授信额度</div>
              <div class="metric-value">¥{{ formatMoney(customerInfo.totalCredit) }}</div>
            </div>
            <div class="metric">
              <div class="metric-label">已用额度</div>
              <div class="metric-value">¥{{ formatMoney(customerInfo.usedCredit) }}</div>
            </div>
            <div class="metric">
              <div class="metric-label">可用额度</div>
              <div class="metric-value text-success">¥{{ formatMoney(customerInfo.totalCredit - customerInfo.usedCredit) }}</div>
            </div>
            <div class="metric">
              <div class="metric-label">产品数</div>
              <div class="metric-value">{{ rawProducts.length }}</div>
            </div>
            <div class="metric">
              <div class="metric-label">用信借据</div>
              <div class="metric-value">{{ rawLoanRecords.length }}</div>
            </div>
            <div class="metric">
              <div class="metric-label">还款记录</div>
              <div class="metric-value">{{ rawRepaymentRecords.length }}</div>
            </div>
          </div>
        </div>

      </div>

      <!-- 左侧: 筛选区 -->
      <div class="cq-filter-side">
        <!-- ============ 还款粒度:级联筛选 ============ -->
        <template v-if="targetLevel === 'repayment'">
          <div class="cq-filter-header">
            <h4>还款级联筛选</h4>
            <a-button size="mini" @click="clearRepaymentFilter" :disabled="!filters.selectedProductKey">重置</a-button>
          </div>

          <!-- 提示:必须选择产品和借据 -->
          <a-alert
            v-if="!filters.selectedLoanNo"
            type="warning"
            :show-icon="true"
            style="margin-bottom: 12px; font-size: 12px;"
          >
            {{ !filters.selectedProductKey ? '还款记录查询需锁定1个产品和1个借据' : '产品已选择，请继续选择用信借据' }}
          </a-alert>

          <!-- 第1步:选产品(单选,必选) -->
          <div class="repay-step">
            <div class="repay-step-title">
              <span class="step-badge" :class="{ done: filters.selectedProductKey }">1</span>
              <span>选择产品 <span class="required" v-if="!filters.selectedProductKey">*</span></span>
              <a-button v-if="filters.selectedProductKey && productCollapsed" size="mini" type="text" @click="expandProductList" style="margin-left: auto; padding: 0 4px;">更换</a-button>
            </div>

            <!-- 折叠态:仅显示已选产品摘要 -->
            <div v-if="filters.selectedProductKey && productCollapsed" class="product-item active" role="button" tabindex="0" @click="expandProductList" @keydown.enter="expandProductList">
              <div class="product-row1">
                <a-radio :model-value="true" @click.stop />
                <span class="product-name">{{ selectedProductSummary?.productName }}</span>
                <a-tag size="small" :color="productTypeColor(selectedProductSummary?.productType)">{{ selectedProductSummary?.productType }}</a-tag>
              </div>
              <div class="product-row2">
                <a-tag size="small" :color="creditStatusColor(selectedProductSummary?.creditStatus)">{{ selectedProductSummary?.creditStatus || '正常' }}</a-tag>
                <span class="product-meta">授信 ¥{{ formatMoney(selectedProductSummary?.amount) }} · 余额 ¥{{ formatMoney(selectedProductSummary?.balance) }}</span>
              </div>
            </div>

            <!-- 展开态:完整产品列表 -->
            <div v-else class="cq-product-list">
              <div
                v-for="p in rawProducts"
                :key="p.productKey"
                class="product-item"
                :class="{ active: filters.selectedProductKey === p.productKey }"
                role="button"
                tabindex="0"
                @click="selectRepaymentProduct(p.productKey)"
                @keydown.enter="selectRepaymentProduct(p.productKey)"
              >
                <div class="product-row1">
                  <a-radio :model-value="filters.selectedProductKey === p.productKey" @change="selectRepaymentProduct(p.productKey)" @click.stop />
                  <span class="product-name">{{ p.productName }}</span>
                  <a-tag size="small" :color="productTypeColor(p.productType)">{{ p.productType }}</a-tag>
                </div>
                <div class="product-row2">
                  <a-tag size="small" :color="creditStatusColor(p.creditStatus)">{{ p.creditStatus || '正常' }}</a-tag>
                  <span class="product-meta">授信 ¥{{ formatMoney(p.amount) }} · 余额 ¥{{ formatMoney(p.balance) }}</span>
                </div>
              </div>
            </div>
          </div>

          <a-divider v-if="filters.selectedProductKey" />

          <!-- 第2步:选用信借据(单选,必选) -->
          <div v-if="filters.selectedProductKey" class="repay-step">
            <div class="repay-step-title">
              <span class="step-badge" :class="{ done: filters.selectedLoanNo }">2</span>
              <span>选择用信借据 <span class="required" v-if="!filters.selectedLoanNo">*</span></span>
              <a-tag v-if="loansForSelectedProduct.length" size="small" color="arcoblue" style="margin-left: auto;">{{ loansForSelectedProduct.length }}条</a-tag>
            </div>
            <a-empty v-if="!loansForSelectedProduct.length" description="该产品下无用信借据" />
            <div v-else class="cq-loan-list">
              <div
                v-for="l in loansForSelectedProduct"
                :key="l.loanNo"
                class="loan-item"
                :class="{ active: filters.selectedLoanNo === l.loanNo }"
                role="button"
                tabindex="0"
                @click="selectRepaymentLoan(l.loanNo)"
                @keydown.enter="selectRepaymentLoan(l.loanNo)"
              >
                <div class="loan-row1">
                  <a-radio :model-value="filters.selectedLoanNo === l.loanNo" @change="selectRepaymentLoan(l.loanNo)" @click.stop />
                  <span class="loan-name">{{ l.loanProductName || l.loanNo }}</span>
                </div>
                <div class="loan-row2">
                  <a-tag size="small" :color="l.status === '逾期' ? 'red' : l.status === '结清' ? 'gray' : 'green'">{{ l.status }}</a-tag>
                  <span class="muted-small">¥{{ formatMoney(l.amount) }} · 余额 ¥{{ formatMoney(l.balance) }}</span>
                </div>
                <div class="loan-row3">
                  <span class="muted-small">{{ l.loanNo }}</span>
                  <span class="muted-small">第{{ l.currentPeriod }}/{{ l.installments }}期</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 未选产品时的提示 -->
          <div v-if="!filters.selectedProductKey" class="repay-hint">
            <a-empty description="请先选择产品" />
          </div>
        </template>

        <!-- ============ 授信/用信粒度:产品筛选 ============ -->
        <template v-else>
          <div class="cq-filter-header">
            <h4>按产品筛选</h4>
            <a-button size="mini" @click="clearProductFilter" :disabled="!filters.productKeys.length">清空</a-button>
          </div>

          <a-alert type="info" :show-icon="false" style="margin-bottom: 12px; font-size: 12px;">
            客户: <b>{{ customerInfo?.name || '-' }}</b>(已固定)<br>
            选中产品后,该产品下的数据自动限定
          </a-alert>

          <div class="cq-product-list">
            <div
              v-for="p in rawProducts"
              :key="p.productKey"
              class="product-item"
              :class="{ active: filters.productKeys.includes(p.productKey) }"
              role="button"
              tabindex="0"
              @click="toggleProduct(p.productKey)"
              @keydown.enter="toggleProduct(p.productKey)"
            >
              <div class="product-row1">
                <a-checkbox :model-value="filters.productKeys.includes(p.productKey)" @change="toggleProduct(p.productKey)" @click.stop />
                <span class="product-name">{{ p.productName }}</span>
                <a-tag size="small" :color="productTypeColor(p.productType)">{{ p.productType }}</a-tag>
              </div>
              <div class="product-row2">
                <a-tag size="small" :color="creditStatusColor(p.creditStatus)">{{ p.creditStatus || '正常' }}</a-tag>
                <span class="product-meta">授信 ¥{{ formatMoney(p.amount) }} · 余额 ¥{{ formatMoney(p.balance) }}</span>
              </div>
            </div>
          </div>

          <a-divider />

          <div class="cq-extra-filters">
            <div class="extra-label">辅助筛选(可选):</div>
            <a-checkbox-group v-model="filters.loanStatus" size="small" @change="executeQuery">
              <a-checkbox value="正常">仅正常</a-checkbox>
              <a-checkbox value="逾期">仅逾期</a-checkbox>
              <a-checkbox value="结清">仅结清</a-checkbox>
            </a-checkbox-group>
            <div style="margin-top: 8px;">
              <a-input-number
                v-model="filters.minAmount"
                :min="0"
                placeholder="最低借据金额"
                size="small"
                style="width: 100%"
                @change="onAmountChange"
              >
                <template #prepend>≥</template>
              </a-input-number>
            </div>
          </div>
        </template>
      </div>

      <!-- 右侧: 查询目标 + 字段选择 + 表格 + 复制 -->
      <div class="cq-result-side">
        <!-- 查询目标 + 快速场景 -->
        <div class="cq-target-bar">
          <div class="cq-target-level">
            <span class="level-label">查询目标:</span>
            <a-radio-group v-model="targetLevel" type="button" size="small">
              <a-radio value="credit">授信</a-radio>
              <a-radio value="usage">用信</a-radio>
              <a-radio value="repayment">还款</a-radio>
            </a-radio-group>
          </div>
          <template v-if="targetLevel !== 'repayment'">
            <a-divider direction="vertical" />
            <div class="cq-quick-scenarios">
              <a-space :size="4">
                <a-button size="mini" @click="applyScenario('all')">📊 全部</a-button>
                <a-button size="mini" status="danger" @click="applyScenario('overdue')">⚠️ 仅逾期</a-button>
                <a-button size="mini" status="success" @click="applyScenario('settled')">✅ 已结清</a-button>
                <a-button size="mini" @click="applyScenario('highAmount')">📈 高额借据</a-button>
              </a-space>
            </div>
          </template>
        </div>

        <div class="cq-result-header">
          <h4>结果预览与字段复制</h4>
          <a-space>
            <a-tag color="arcoblue">{{ flatTable.length }} 行</a-tag>
            <a-tag color="green">已选 {{ selectedFields.length }} / {{ allFields.length }} 列</a-tag>
            <a-button size="mini" @click="selectAllFields">全选</a-button>
            <a-button size="mini" @click="deselectAllFields">清空</a-button>
            <a-button size="mini" type="primary" @click="showCopyModal" :disabled="!flatTable.length">
              <template #icon><IconCopy /></template>
              复制
            </a-button>
            <a-button size="mini" @click="exportCSV" :disabled="!flatTable.length">
              <template #icon><IconDownload /></template>
              导出
            </a-button>
          </a-space>
        </div>

        <div v-if="allFields.length" class="cq-field-selector">
          <div class="field-selector-title">
            <IconSettings />
            字段选择(勾选要复制的列):
          </div>
          <a-checkbox-group v-model="selectedFields" class="field-group">
            <a-checkbox v-for="f in allFields" :key="f.value" :value="f.value">
              <span :title="f.description">{{ f.label }}</span>
            </a-checkbox>
          </a-checkbox-group>
        </div>

        <div class="cq-table-preview">
          <a-empty v-if="!flatTable.length" :description="emptyText" />
          <a-empty v-else-if="!previewColumns.length" description="请勾选要展示的字段" />
          <a-table
            v-else
            :data="flatTable"
            :columns="previewColumns"
            :pagination="{ pageSize: 10, showTotal: true, showPageSize: true, pageSizeOptions: [10, 20, 50, 100] }"
            :row-selection="rowSelection"
            :scroll="{ x: 'max-content', y: 380 }"
            size="mini"
            row-key="__rowKey"
            class="result-table"
          >
            <template #columns>
              <a-table-column
                v-for="col in previewColumns"
                :key="col.value"
                :title="col.label"
                :data-index="col.value"
                :width="col.width"
                :ellipsis="true"
              >
                <template #cell="{ record }">
                  <a-tooltip :content="String(record[col.value] ?? '')" position="top">
                    <span :class="['cell-value', cellClass(record[col.value])]">{{ formatCell(record[col.value]) }}</span>
                  </a-tooltip>
                </template>
              </a-table-column>
            </template>
          </a-table>
        </div>
      </div>
    </div>

    <!-- 复制选项弹窗 -->
    <a-modal
      v-model:visible="copyModalVisible"
      title="复制选项"
      :width="560"
      ok-text="复制"
      :ok-button-props="{ disabled: !selectedFields.length }"
      @ok="confirmCopy"
    >
      <a-form :model="copyForm" layout="vertical">
        <a-form-item label="复制范围">
          <a-radio-group v-model="copyForm.scope">
            <a-radio value="all">所有行({{ flatTable.length }} 行)</a-radio>
            <a-radio value="selected" :disabled="!selectedRowKeys.length">选中行({{ selectedRowKeys.length }} 行)</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="分隔符">
          <a-radio-group v-model="copyForm.separator">
            <a-radio value="tab">制表符 \t (粘贴到 Excel)</a-radio>
            <a-radio value="comma">逗号 , (CSV)</a-radio>
            <a-radio value="pipe">竖线 |</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="是否包含表头">
          <a-switch v-model="copyForm.includeHeader" />
        </a-form-item>
        <a-form-item v-if="!selectedFields.length" label="提示">
          <a-alert type="warning">请先在右侧勾选要复制的列(字段)</a-alert>
        </a-form-item>
        <a-form-item v-else label="预览(前 3 行)">
          <a-input :model-value="copyPreview" type="textarea" :rows="4" readonly />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed, onMounted } from 'vue'
import { Message, Modal } from '@arco-design/web-vue'
import { IconCopy, IconDownload, IconSettings } from '@arco-design/web-vue/es/icon'
import { fetchUserInfo } from '@/mock-dca/customer360'

const props = defineProps({
  userInfo: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['audit-copy'])

// ===== 本地 userInfo:优先用 props,如果空就自己 fetch =====
const localUserInfo = ref<any>(null)

const effectiveUserInfo = computed(() => {
  const p = props.userInfo
  if (p && p.userId) return p
  if (localUserInfo.value && localUserInfo.value.userId) return localUserInfo.value
  return null
})

// 主动 fetch(兜底:防止父组件未传 userInfo)
const selfFetch = async () => {
  // 优先用 userId 字段,其次 props.userId
  const uid = (props.userInfo as any)?.userId || (props as any).userId
  if (!uid) {
    console.warn('[CQP] 没有 userId,无法 self fetch')
    return
  }
  try {
    const data = await fetchUserInfo(uid)
    if (data && !data.error) {
      localUserInfo.value = data
    }
  } catch (e) {
    console.warn('[CQP] selfFetch 失败:', e)
  }
}

// ===== 状态 =====
const targetLevel = ref<'credit' | 'usage' | 'repayment'>('usage')

// 还款粒度:产品列表折叠状态
const productCollapsed = ref(false)

// 场景应用标志(防止 watch(targetLevel) 中 selectFirstProduct 覆盖场景清空)
const scenarioApplying = ref(false)

const filters = reactive<{
  productKeys: string[]
  loanStatus: string[]
  minAmount?: number
  selectedLoanNo: string | null
  selectedProductKey: string | null
}>({
  productKeys: [],
  loanStatus: [],
  minAmount: undefined,
  selectedLoanNo: null,
  selectedProductKey: null
})

const selectedFields = ref<string[]>([])
const copyModalVisible = ref(false)
const copyForm = reactive({
  scope: 'all' as 'all' | 'selected',
  separator: 'tab' as 'tab' | 'comma' | 'pipe',
  includeHeader: true
})
const selectedRowKeys = ref<number[]>([])
const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys: number[]) => { selectedRowKeys.value = keys }
}))

// ===== 数据源:从 props.userInfo 拿真实数据 =====
const customerInfo = computed(() => {
  const u = effectiveUserInfo.value
  if (!u || !u.userId) return null
  return {
    userId: u.userId,
    name: u.basicInfo?.name,
    status: u.basicInfo?.status,
    age: u.basicInfo?.age,
    gender: u.basicInfo?.gender,
    domicile: u.basicInfo?.domicile,
    customerLevel: u.basicInfo?.customerLevel,
    thirdPartyCustomerId: u.basicInfo?.thirdPartyCustomerId,
    totalCredit: u.totalCredit || 0,
    usedCredit: u.usedCredit || 0
  }
})

const rawProducts = computed(() => (effectiveUserInfo.value?.products || []) as any[])
const rawCreditApplications = computed(() => (effectiveUserInfo.value?.creditApplications || []) as any[])
const rawLoanRecords = computed(() => (effectiveUserInfo.value?.loanRecords || []) as any[])
const rawRepaymentRecords = computed(() => (effectiveUserInfo.value?.repaymentRecords || []) as any[])

// ===== 字段定义(与详情页 userInfo 实际字段对齐) =====
interface QueryFieldDef {
  label: string
  value: string
  width: number
  description?: string
}

const fieldDefs: Record<'credit' | 'usage' | 'repayment', QueryFieldDef[]> = {
  credit: [
    { label: '产品Key', value: 'productKey', width: 150 },
    { label: '产品名', value: 'productName', width: 120 },
    { label: '产品类型', value: 'productType', width: 100 },
    { label: '产品码', value: 'productCode', width: 100 },
    { label: '授信额度', value: 'amount', width: 120 },
    { label: '已用余额', value: 'balance', width: 120 },
    { label: '利率', value: 'interestRate', width: 100 },
    { label: '授信时间', value: 'creditTime', width: 120 },
    { label: '到期日', value: 'maturityDate', width: 120 },
    { label: '产品状态', value: 'status', width: 100 },
    { label: '授信状态', value: 'creditStatus', width: 100 },
    { label: '授信产品ID', value: 'creditProductId', width: 140 },
    { label: '借据号(第三方)', value: 'thirdPartyLoanId', width: 160 }
  ],
  usage: [
    { label: '借据号', value: 'loanNo', width: 160 },
    { label: '借据产品ID', value: 'loanProductId', width: 160 },
    { label: '借据名称', value: 'loanProductName', width: 160 },
    { label: '产品名', value: 'productName', width: 120 },
    { label: '产品Key', value: 'productKey', width: 140 },
    { label: '授信产品ID', value: 'creditProductId', width: 140 },
    { label: '授信申请ID', value: 'creditApplicationId', width: 140 },
    { label: '借据金额', value: 'amount', width: 120 },
    { label: '借据余额', value: 'balance', width: 120 },
    { label: '利率(%)', value: 'interestRate', width: 90 },
    { label: '借据日期', value: 'loanDate', width: 120 },
    { label: '渠道', value: 'channel', width: 80 },
    { label: '结果', value: 'result', width: 80 },
    { label: '合同号', value: 'contractNo', width: 160 },
    { label: '借据状态', value: 'status', width: 100 },
    { label: '当前期次', value: 'currentPeriod', width: 90 },
    { label: '总期数', value: 'installments', width: 90 },
    { label: '逾期天数', value: 'overdueDays', width: 90 },
    { label: '最大逾期天数', value: 'maxOverdueDays', width: 100 },
    { label: '结清日期', value: 'settlementDate', width: 120 },
    { label: '剩余本金', value: 'remainingPrincipal', width: 120 },
    { label: '剩余利息', value: 'remainingInterest', width: 120 },
    { label: '剩余罚息', value: 'remainingPenalty', width: 120 },
    { label: '剩余总额', value: 'remainingTotal', width: 120 },
    { label: '客户ID', value: 'userId', width: 120 }
  ],
  repayment: [
    { label: '还款记录ID', value: 'id', width: 140 },
    { label: '借据号', value: 'loanNo', width: 160 },
    { label: '产品名', value: 'productName', width: 120 },
    { label: '产品Key', value: 'productKey', width: 140 },
    { label: '授信产品ID', value: 'creditProductId', width: 140 },
    { label: '用信产品ID', value: 'loanProductId', width: 160 },
    { label: '用信名称', value: 'loanProductName', width: 160 },
    { label: '期次', value: 'period', width: 80 },
    { label: '还款日期', value: 'repayDate', width: 120 },
    { label: '还款金额', value: 'amount', width: 120 },
    { label: '本金', value: 'principal', width: 120 },
    { label: '利息', value: 'interest', width: 120 },
    { label: '罚息', value: 'penalty', width: 120 },
    { label: '还款方式', value: 'method', width: 100 },
    { label: '还款状态', value: 'status', width: 100 },
    { label: '逾期天数', value: 'overdueDays', width: 90 }
  ]
}
const allFields = computed(() => fieldDefs[targetLevel.value])

// ===== 筛选 =====
const toggleProduct = (key: string) => {
  const idx = filters.productKeys.indexOf(key)
  if (idx >= 0) filters.productKeys.splice(idx, 1)
  else filters.productKeys.push(key)
  executeQuery()
}

const clearProductFilter = () => {
  if (filters.productKeys.length) {
    Modal.confirm({
      title: '确认清空',
      content: `当前已选 ${filters.productKeys.length} 个产品，确认清空筛选？`,
      okText: '清空',
      cancelText: '取消',
      onOk: () => {
        filters.productKeys = []
        executeQuery()
      }
    })
  }
}

const clearRepaymentFilter = () => {
  if (filters.selectedProductKey || filters.selectedLoanNo) {
    Modal.confirm({
      title: '确认重置',
      content: '将清空已选产品和借据，确认重置？',
      okText: '重置',
      cancelText: '取消',
      onOk: () => {
        filters.selectedProductKey = null
        filters.selectedLoanNo = null
        productCollapsed.value = false
        executeQuery()
      }
    })
  }
}

const productTypeColor = (t: string) => {
  const map: Record<string, string> = { self: 'blue', loan: 'green', sudai: 'purple', credit_card: 'orange' }
  return map[t] || 'gray'
}

const creditStatusColor = (s: string) => {
  if (!s) return 'gray'
  if (s.includes('正常')) return 'green'
  if (s.includes('逾期')) return 'red'
  if (s.includes('结清')) return 'gray'
  if (s.includes('冻结')) return 'orange'
  return 'gray'
}

// ===== 联动:产品 → 用信/还款 =====
const filteredCredits = computed(() => {
  if (!filters.productKeys.length) return rawCreditApplications.value
  // 通过 creditProductId 关联
  const productCreditIds = rawProducts.value
    .filter(p => filters.productKeys.includes(p.productKey))
    .map(p => p.creditProductId)
  return rawCreditApplications.value.filter(c => productCreditIds.includes(c.creditProductId))
})

const filteredLoans = computed(() => {
  let loans = rawLoanRecords.value
  // 产品筛选:通过 productKey 关联
  if (filters.productKeys.length) {
    loans = loans.filter(l => filters.productKeys.includes(l.productKey))
  }
  // 借据状态筛选
  if (filters.loanStatus.length) {
    loans = loans.filter(l => filters.loanStatus.includes(l.status))
  }
  // 最低金额
  if (filters.minAmount !== undefined) {
    loans = loans.filter(l => l.amount >= filters.minAmount!)
  }
  return loans
})

// 还款粒度:按选中产品筛选可用借据列表
const loansForSelectedProduct = computed(() => {
  if (!filters.selectedProductKey) return []
  return rawLoanRecords.value.filter(l => l.productKey === filters.selectedProductKey)
})

// 还款粒度:已选产品摘要(折叠态展示)
const selectedProductSummary = computed(() => {
  if (!filters.selectedProductKey) return null
  return rawProducts.value.find(p => p.productKey === filters.selectedProductKey) || null
})

// 还款粒度:按选中借据筛选还款记录
const filteredRepayments = computed(() => {
  if (!filters.selectedLoanNo) return []
  return rawRepaymentRecords.value.filter(r => r.loanNo === filters.selectedLoanNo)
})

// 还款粒度:产品单选
const selectRepaymentProduct = (key: string) => {
  filters.selectedProductKey = key
  filters.selectedLoanNo = null // 切换产品时清空借据选择
  productCollapsed.value = true // 选中后折叠产品列表
}

// 还款粒度:展开产品列表(重新选择)
const expandProductList = () => {
  productCollapsed.value = false
}

// 还款粒度:借据单选
const selectRepaymentLoan = (loanNo: string) => {
  filters.selectedLoanNo = loanNo
  setTimeout(executeQuery, 50)
}

// ===== 扁平化表格(用 userInfo 实际数据) =====
const flatTable = computed(() => {
  if (!customerInfo.value) return []
  const rows: any[] = []
  let k = 0

  if (targetLevel.value === 'credit') {
    let products = rawProducts.value
    if (filters.productKeys.length) {
      products = products.filter(p => filters.productKeys.includes(p.productKey))
    }
    products.forEach((p: any) => {
      rows.push({
        __rowKey: k++,
        productKey: p.productKey,
        productName: p.productName,
        productType: p.productType,
        productCode: p.productCode || '',
        amount: p.amount,
        balance: p.balance,
        interestRate: p.interestRate || (p.rate ? p.rate + '%' : ''),
        creditTime: p.creditTime || '',
        maturityDate: p.maturityDate || '',
        status: p.status,
        creditStatus: p.creditStatus,
        creditProductId: p.creditProductId,
        thirdPartyLoanId: p.thirdPartyLoanId
      })
    })
  } else if (targetLevel.value === 'usage') {
    filteredLoans.value.forEach((l: any) => {
      rows.push({
        __rowKey: k++,
        loanNo: l.loanNo,
        loanProductId: l.loanProductId,
        loanProductName: l.loanProductName,
        productName: l.productName,
        productKey: l.productKey,
        creditProductId: l.creditProductId,
        creditApplicationId: l.creditApplicationId,
        amount: l.amount,
        balance: l.balance,
        interestRate: l.interestRate,
        loanDate: l.loanDate,
        channel: l.channel,
        result: l.result,
        contractNo: l.contractNo,
        status: l.status,
        currentPeriod: l.currentPeriod,
        installments: l.installments,
        overdueDays: l.overdueDays,
        maxOverdueDays: l.maxOverdueDays,
        settlementDate: l.settlementDate,
        remainingPrincipal: l.remainingPrincipal,
        remainingInterest: l.remainingInterest,
        remainingPenalty: l.remainingPenalty,
        remainingTotal: l.remainingTotal,
        userId: l.userId || customerInfo.value?.userId
      })
    })
  } else if (targetLevel.value === 'repayment') {
    filteredRepayments.value.forEach((r: any) => {
      rows.push({
        __rowKey: k++,
        id: r.id,
        loanNo: r.loanNo,
        productName: r.productName,
        productKey: r.productKey,
        creditProductId: r.creditProductId,
        loanProductId: r.loanProductId,
        loanProductName: r.loanProductName,
        period: r.period,
        repayDate: r.repayDate,
        amount: r.amount,
        principal: r.principal,
        interest: r.interest,
        penalty: r.penalty,
        method: r.method,
        status: r.status,
        overdueDays: r.overdueDays || 0
      })
    })
  }
  return rows
})

const previewColumns = computed(() => {
  return selectedFields.value
    .map(field => allFields.value.find(f => f.value === field))
    .filter(Boolean) as any[]
})

// 空状态文案(随粒度变化)
const emptyText = computed(() =>
  targetLevel.value === 'repayment'
    ? '请先选择产品和借据'
    : '请勾选产品或选择目标层级'
)

// minAmount 输入防抖
let amountTimer: ReturnType<typeof setTimeout> | null = null
const onAmountChange = () => {
  if (amountTimer) clearTimeout(amountTimer)
  amountTimer = setTimeout(() => executeQuery(), 400)
}

// ===== 工具 =====
const formatMoney = (n: number | undefined | null) => {
  if (n === undefined || n === null) return '0'
  return n.toLocaleString()
}
const formatCell = (val: any) => {
  if (val === null || val === undefined || val === '') return '-'
  if (typeof val === 'number') return val.toLocaleString()
  return String(val)
}
const cellClass = (val: any) => {
  if (val === '逾期' || val?.includes?.('逾期')) return 'text-danger'
  if (val === '已结清' || val?.includes?.('结清')) return 'text-success'
  if (val === '成功' || val === '生效' || val === '正常' || val?.includes?.('正常')) return 'text-success'
  return ''
}

const selectAllFields = () => { selectedFields.value = allFields.value.map(f => f.value) }
const deselectAllFields = () => { selectedFields.value = [] }

const copyPreview = computed(() => {
  if (!selectedFields.value.length) return ''
  const sep = copyForm.separator === 'tab' ? '\t' : copyForm.separator === 'comma' ? ',' : '|'
  const rows = copyForm.scope === 'all' ? flatTable.value : flatTable.value.filter(r => selectedRowKeys.value.includes(r.__rowKey))
  if (!rows.length) return ''
  const lines: string[] = []
  if (copyForm.includeHeader) {
    lines.push(selectedFields.value.map(f => allFields.value.find(x => x.value === f)?.label || f).join(sep))
  }
  rows.forEach(r => {
    lines.push(selectedFields.value.map(f => r[f] ?? '').join(sep))
  })
  return lines.slice(0, 4).join('\n')
})

const showCopyModal = () => {
  copyForm.scope = selectedRowKeys.value.length ? 'selected' : 'all'
  copyForm.separator = 'tab'
  copyForm.includeHeader = true
  copyModalVisible.value = true
}

const confirmCopy = async () => {
  if (!selectedFields.value.length) {
    Message.warning('请先勾选要复制的字段')
    return
  }
  const sep = copyForm.separator === 'tab' ? '\t' : copyForm.separator === 'comma' ? ',' : '|'
  const rows = copyForm.scope === 'all' ? flatTable.value : flatTable.value.filter(r => selectedRowKeys.value.includes(r.__rowKey))
  if (!rows.length) {
    Message.warning('没有可复制的数据')
    return
  }
  const lines: string[] = []
  if (copyForm.includeHeader) {
    lines.push(selectedFields.value.map(f => allFields.value.find(x => x.value === f)?.label || f).join(sep))
  }
  rows.forEach(r => {
    lines.push(selectedFields.value.map(f => r[f] ?? '').join(sep))
  })
  const text = lines.join('\n')
  try {
    await navigator.clipboard.writeText(text)
    Message.success(`已复制 ${rows.length} 行 × ${selectedFields.value.length} 列${copyForm.includeHeader ? ' (含表头)' : ''}`)
    emit('audit-copy', {
      userId: customerInfo.value?.userId,
      targetLevel: targetLevel.value,
      scope: copyForm.scope,
      fieldList: [...selectedFields.value],
      rowCount: rows.length,
      timestamp: Date.now()
    })
    copyModalVisible.value = false
  } catch (e) {
    const ta = document.createElement('textarea')
    ta.value = text
    document.body.appendChild(ta)
    ta.select()
    try { document.execCommand('copy'); Message.success(`已复制 ${rows.length} 行`) } catch { Message.error('复制失败') }
    document.body.removeChild(ta)
    copyModalVisible.value = false
  }
}

const exportCSV = () => {
  if (!selectedFields.value.length) {
    Message.warning('请先勾选要导出的字段')
    return
  }
  const rows = selectedRowKeys.value.length
    ? flatTable.value.filter(r => selectedRowKeys.value.includes(r.__rowKey))
    : flatTable.value
  if (!rows.length) {
    Message.warning('没有可导出的数据')
    return
  }
  const lines = [selectedFields.value.map(f => allFields.value.find(x => x.value === f)?.label || f).join(',')]
  rows.forEach(r => {
    lines.push(selectedFields.value.map(f => {
      const v = r[f] ?? ''
      return typeof v === 'string' && (v.includes(',') || v.includes('"')) ? `"${v.replace(/"/g, '""')}"` : v
    }).join(','))
  })
  const csv = '\uFEFF' + lines.join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `客户360-${targetLevel.value === 'credit' ? '授信' : targetLevel.value === 'usage' ? '用信' : '还款'}-${customerInfo.value?.userId || 'unknown'}-${Date.now()}.csv`
  a.click()
  URL.revokeObjectURL(url)
  Message.success(`已导出 ${rows.length} 行${selectedRowKeys.value.length ? ' (选中行)' : ''}`)
}

// ===== 快速场景 =====
const applyScenario = (scenario: string) => {
  scenarioApplying.value = true
  filters.productKeys = []
  filters.loanStatus = []
  filters.minAmount = undefined
  filters.selectedProductKey = null
  filters.selectedLoanNo = null
  if (scenario === 'all') targetLevel.value = 'usage'
  else if (scenario === 'overdue') { targetLevel.value = 'usage'; filters.loanStatus = ['逾期'] }
  else if (scenario === 'settled') { targetLevel.value = 'usage'; filters.loanStatus = ['结清'] }
  else if (scenario === 'highAmount') { targetLevel.value = 'usage'; filters.minAmount = 100000 }
  setTimeout(() => {
    scenarioApplying.value = false
    executeQuery()
  }, 50)
}

const executeQuery = () => {
  selectedRowKeys.value = []
  const rows = flatTable.value
  if (!customerInfo.value) {
    Message.warning('未识别到当前用户')
    return
  }
  if (!rows.length) Message.warning('当前筛选条件下无匹配数据')
}

// 授信/用信粒度:默认选中首个产品
const selectFirstProduct = () => {
  if (targetLevel.value === 'repayment') return
  const products = rawProducts.value
  if (products.length && !filters.productKeys.length) {
    filters.productKeys = [products[0].productKey]
  }
}

// 初始化:等待 userInfo 加载后默认字段
onMounted(async () => {
  // 兜底:如果 props.userInfo 是空,自己 fetch
  if (!props.userInfo || !props.userInfo.userId) {
    await selfFetch()
  }
  setTimeout(() => {
    selectedFields.value = allFields.value.slice(0, 6).map(f => f.value)
    selectFirstProduct()
  }, 100)
})

// 监听 userInfo 变化(仅在 userId 变化时重置)
watch(() => props.userInfo?.userId, (uid) => {
  if (uid) {
    setTimeout(() => {
      selectedFields.value = allFields.value.slice(0, 6).map(f => f.value)
      selectFirstProduct()
    }, 100)
  }
})

// 切换 targetLevel 时重新选默认字段
watch(targetLevel, () => {
  selectedFields.value = allFields.value.slice(0, 6).map(f => f.value)
  selectedRowKeys.value = [] // 修复:重置行选择
  // 切换粒度时清除还款级联选择
  filters.selectedProductKey = null
  filters.selectedLoanNo = null
  productCollapsed.value = false
  if (targetLevel.value === 'repayment') {
    // 切到还款:清空授信/用信筛选残留
    filters.productKeys = []
    filters.loanStatus = []
    filters.minAmount = undefined
  } else if (!scenarioApplying.value) {
    // 切到授信/用信:清空多选并默认选中首个产品(场景模式跳过)
    filters.productKeys = []
    filters.loanStatus = []
    filters.minAmount = undefined
    selectFirstProduct()
  }
})
</script>

<style scoped>
.custom-query-panel {
  width: 100%;
  height: 100%;
  padding: 12px 0;
}

.cq-layout {
  display: grid;
  grid-template-columns: 300px 1fr;
  grid-template-rows: auto 1fr;
  gap: 12px;
  height: calc(100vh - 200px);
  min-height: 520px;
}

.cq-top-bar {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cq-customer-summary {
  background: linear-gradient(135deg, #fff7e6 0%, #ffffff 100%);
  border: 1px solid #ffd591;
  border-radius: 8px;
  padding: 12px 16px;
}

.summary-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.summary-name {
  display: flex;
  align-items: center;
  gap: 12px;
}

.name-line {
  display: flex;
  align-items: center;
  gap: 6px;
}

.name {
  font-size: 16px;
  font-weight: 600;
  color: #1d2129;
}

.muted {
  color: #86909c;
  font-size: 12px;
  margin-top: 2px;
}

.muted-small {
  color: #86909c;
  font-size: 11px;
}

.summary-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.summary-metrics {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 12px;
}

.metric {
  background: rgba(255, 255, 255, 0.6);
  border-radius: 6px;
  padding: 8px 10px;
  text-align: center;
}

.metric-label {
  font-size: 12px;
  color: #86909c;
  margin-bottom: 2px;
}

.metric-value {
  font-size: 15px;
  font-weight: 600;
  color: #1d2129;
}

.text-success { color: #00b42a; }
.text-warning { color: #ff7d00; }
.text-danger { color: #f53f3f; font-weight: 600; }

.cq-target-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  padding: 8px 12px;
  background: #f0f7ff;
  border: 1px solid #d6e4ff;
  border-radius: 6px;
  flex-wrap: wrap;
  flex-shrink: 0;
  margin-bottom: 8px;
}

.cq-target-level,
.cq-quick-scenarios {
  display: flex;
  align-items: center;
  gap: 8px;
}

.level-label {
  font-weight: 600;
  color: #1d2129;
}

.cq-filter-side {
  background: #fafbfc;
  border-radius: 8px;
  padding: 12px;
  overflow-y: auto;
  border: 1px solid #e5e6eb;
}

.cq-filter-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
}

.cq-filter-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.cq-product-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.product-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 10px;
  background: #fff;
  border: 1px solid #e5e6eb;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}

.product-item:hover {
  border-color: #165dff;
  background: #f0f7ff;
}

.product-item.active {
  border-color: #165dff;
  background: #e8f3ff;
  box-shadow: 0 0 0 1px #165dff;
}

.product-row1 {
  display: flex;
  align-items: center;
  gap: 6px;
}

.product-name {
  font-weight: 600;
  font-size: 13px;
  color: #1d2129;
}

.product-row2 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  color: #86909c;
  padding-left: 24px;
}

.product-row3 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-left: 24px;
}

.product-meta { font-size: 11px; margin-left: auto; }

.cq-extra-filters {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.extra-label {
  font-size: 12px;
  color: #4e5969;
  font-weight: 500;
}

/* ===== 还款级联筛选样式 ===== */
.repay-step {
  margin-bottom: 12px;
}

.repay-step-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #1d2129;
  margin-bottom: 8px;
}

.step-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #e5e6eb;
  color: #86909c;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}

.step-badge.done {
  background: #165dff;
  color: #fff;
}

.required {
  color: #f53f3f;
  font-size: 12px;
}

.cq-loan-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.loan-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 10px;
  background: #fff;
  border: 1px solid #e5e6eb;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}

.loan-item:hover {
  border-color: #165dff;
  background: #f0f7ff;
}

.loan-item.active {
  border-color: #165dff;
  background: #e8f3ff;
  box-shadow: 0 0 0 1px #165dff;
}

.loan-row1 {
  display: flex;
  align-items: center;
  gap: 6px;
}

.loan-name {
  font-weight: 600;
  font-size: 13px;
  color: #1d2129;
}

.loan-row2,
.loan-row3 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-left: 24px;
}

.repay-hint {
  padding: 24px 0;
}

.cq-result-side {
  background: #fff;
  border-radius: 8px;
  padding: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border: 1px solid #e5e6eb;
}

.cq-result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.cq-result-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.cq-field-selector {
  background: #fffbe6;
  border: 1px solid #ffe58f;
  border-radius: 6px;
  padding: 10px 12px;
  margin-bottom: 12px;
  flex-shrink: 0;
}

.field-selector-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #874d00;
  margin-bottom: 8px;
}

.field-group {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
}

.field-group :deep(.arco-checkbox) {
  font-size: 12px;
  margin-right: 0;
}

.cq-table-preview {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.cell-value {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}
</style>
