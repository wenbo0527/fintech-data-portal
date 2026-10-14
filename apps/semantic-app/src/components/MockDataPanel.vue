<template>
  <div class="mock-data-panel">
    <!-- 统计卡片 -->
    <a-row :gutter="12" class="stats-row">
      <a-col :span="8">
        <div class="stat-card stat--green">
          <icon-file class="stat-icon" />
          <div class="stat-info">
            <div class="stat-label">总贷款数</div>
            <div class="stat-value">{{ store.stats.total_loans }}</div>
          </div>
        </div>
      </a-col>
      <a-col :span="8">
        <div class="stat-card stat--red">
          <icon-close-circle class="stat-icon" />
          <div class="stat-info">
            <div class="stat-label">逾期笔数</div>
            <div class="stat-value">{{ store.stats.overdue_count }}</div>
          </div>
        </div>
      </a-col>
      <a-col :span="8">
        <div class="stat-card" :class="store.stats.fpd30_rate > 5 ? 'stat--warning' : 'stat--yellow'">
          <icon-alert class="stat-icon" />
          <div class="stat-info">
            <div class="stat-label">
              首逾率
              <a-tag v-if="store.stats.fpd30_rate > 5" color="red" size="small" style="margin-left: 4px">超阈值</a-tag>
            </div>
            <div class="stat-value">{{ store.stats.fpd30_rate.toFixed(2) }}%</div>
          </div>
        </div>
      </a-col>
    </a-row>

    <!-- 数据表切换 -->
    <div class="table-switcher">
      <a-radio-group v-model="currentTable" type="button" size="small" @change="onTableChange">
        <a-radio value="loans">贷款记录</a-radio>
        <a-radio value="repayments">还款记录</a-radio>
        <a-radio value="overdues">逾期记录</a-radio>
      </a-radio-group>
    </div>

    <!-- 筛选条件 -->
    <div class="filter-bar">
      <a-select v-model="filters.productLine" placeholder="产品线" size="small" style="width: 120px" allow-clear @change="onFilterChange">
        <a-option value="全部">全部</a-option>
        <a-option value="现金贷">现金贷</a-option>
        <a-option value="分期">分期</a-option>
        <a-option value="循环额度">循环额度</a-option>
      </a-select>
      <a-select v-model="filters.month" placeholder="月份" size="small" style="width: 120px; margin-left: 8px" allow-clear @change="onFilterChange">
        <a-option value="全部">全部</a-option>
        <a-option value="2026-07">2026-07</a-option>
        <a-option value="2026-08">2026-08</a-option>
        <a-option value="2026-09">2026-09</a-option>
      </a-select>
      <a-select v-model="filters.channel" placeholder="渠道" size="small" style="width: 120px; margin-left: 8px" allow-clear @change="onFilterChange">
        <a-option value="全部">全部</a-option>
        <a-option value="APP">APP</a-option>
        <a-option value="合作方">合作方</a-option>
        <a-option value="线下">线下</a-option>
      </a-select>
      <a-button type="primary" size="small" style="margin-left: 8px" @click="onFilterChange">查询</a-button>
    </div>

    <!-- 数据表格 -->
    <a-table
      :data="tableData"
      :columns="currentColumns"
      :pagination="{
        total: store.tableData.total,
        current: store.tableData.page,
        pageSize: store.tableData.pageSize,
        showTotal: true
      }"
      :loading="store.loading"
      row-key="loan_id"
      size="small"
      @page-change="onPageChange"
    >
      <template #product_line="{ record }">
        <a-tag :color="productColor(record.product_line)" size="small">{{ record.product_line }}</a-tag>
      </template>
      <template #loan_amount="{ record }">
        <span class="amount">¥{{ formatNumber(record.loan_amount) }}</span>
      </template>
      <template #actual_date="{ record }">
        <span :class="{ 'text-danger': !record.actual_date }">
          {{ record.actual_date || '未还款' }}
        </span>
      </template>
      <template #amount_paid="{ record }">
        <span :class="{ 'text-warning': record.amount_paid < record.amount_due }">
          ¥{{ formatNumber(record.amount_paid) }}
        </span>
      </template>
      <template #overdue_days="{ record }">
        <a-tag :color="record.overdue_days > 30 ? 'red' : 'orange'" size="small">
          {{ record.overdue_days }}天
        </a-tag>
      </template>
    </a-table>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useMockDataStore } from '@/stores/mockData'
import { getRepaymentsApi, getOverduesApi } from '@/api/mockData'
import type { MockDataQueryParams } from '@/api/mockData'

const store = useMockDataStore()

const currentTable = ref('loans')
const filters = ref<MockDataQueryParams>({
  productLine: '全部',
  month: '全部',
  channel: '全部',
  page: 1,
  pageSize: 10
})

// 还款/逾期记录的本地数据
const extraData = ref<Record<string, unknown>[]>([])

const tableData = computed(() => {
  if (currentTable.value === 'loans') {
    return store.tableData.list
  }
  return extraData.value
})

const loanColumns = [
  { title: '贷款编号', dataIndex: 'loan_id', key: 'loan_id', width: 120 },
  { title: '客户编号', dataIndex: 'customer_id', key: 'customer_id', width: 120 },
  { title: '产品线', slotName: 'product_line', key: 'product_line', width: 100 },
  { title: '贷款金额', slotName: 'loan_amount', key: 'loan_amount', width: 120 },
  { title: '放款日期', dataIndex: 'issue_date', key: 'issue_date', width: 120 },
  { title: '渠道', dataIndex: 'channel', key: 'channel', width: 80 }
]

const repaymentColumns = [
  { title: '还款编号', dataIndex: 'repayment_id', key: 'repayment_id', width: 100 },
  { title: '贷款编号', dataIndex: 'loan_id', key: 'loan_id', width: 120 },
  { title: '到期日', dataIndex: 'due_date', key: 'due_date', width: 120 },
  { title: '实际还款日', slotName: 'actual_date', key: 'actual_date', width: 120 },
  { title: '应还金额', dataIndex: 'amount_due', key: 'amount_due', width: 100 },
  { title: '实还金额', slotName: 'amount_paid', key: 'amount_paid', width: 100 }
]

const overdueColumns = [
  { title: '记录编号', dataIndex: 'record_id', key: 'record_id', width: 100 },
  { title: '贷款编号', dataIndex: 'loan_id', key: 'loan_id', width: 120 },
  { title: '逾期天数', slotName: 'overdue_days', key: 'overdue_days', width: 100 },
  { title: '记录日期', dataIndex: 'record_date', key: 'record_date', width: 120 }
]

const currentColumns = computed(() => {
  if (currentTable.value === 'repayments') return repaymentColumns
  if (currentTable.value === 'overdues') return overdueColumns
  return loanColumns
})

onMounted(async () => {
  await store.refreshAll(filters.value)
})

function onTableChange() {
  filters.value.page = 1
  loadData()
}

function onFilterChange() {
  filters.value.page = 1
  loadData()
}

function onPageChange(page: number) {
  filters.value.page = page
  loadData()
}

async function loadData() {
  if (currentTable.value === 'loans') {
    await store.refreshAll(filters.value)
  } else if (currentTable.value === 'repayments') {
    const data = await getRepaymentsApi()
    extraData.value = data as unknown as Record<string, unknown>[]
  } else if (currentTable.value === 'overdues') {
    const data = await getOverduesApi()
    extraData.value = data as unknown as Record<string, unknown>[]
  }
}

function formatNumber(n: number): string {
  return n.toLocaleString('zh-CN')
}

function productColor(line: string): string {
  const map: Record<string, string> = {
    '现金贷': 'blue',
    '分期': 'green',
    '循环额度': 'purple'
  }
  return map[line] || 'gray'
}
</script>

<style scoped lang="scss">
.mock-data-panel {
  .stats-row {
    margin-bottom: 16px;
  }

  .stat-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    border-radius: 8px;
    background: var(--color-bg-light);
    border: 1px solid var(--color-border);

    .stat-icon {
      font-size: 28px;
    }

    .stat-label {
      font-size: 12px;
      color: var(--color-text-secondary);
      margin-bottom: 4px;
    }

    .stat-value {
      font-size: 22px;
      font-weight: 700;
      color: var(--color-text);
    }

    &.stat--green .stat-icon { color: var(--color-success); }
    &.stat--red .stat-icon { color: var(--color-danger); }
    &.stat--yellow .stat-icon { color: var(--color-warning); }
    &.stat--warning {
      border-color: var(--color-danger);
      .stat-icon { color: var(--color-danger); }
      .stat-value { color: var(--color-danger); }
    }
  }

  .table-switcher {
    margin-bottom: 12px;
  }

  .filter-bar {
    margin-bottom: 12px;
    display: flex;
    align-items: center;
  }
}

.amount {
  font-family: monospace;
  color: var(--color-success);
}

.text-danger {
  color: var(--color-danger);
}

.text-warning {
  color: var(--color-warning);
}

:deep(.arco-table-th) {
  background: var(--color-bg-light) !important;
  color: var(--color-text-secondary) !important;
  border-color: var(--color-border) !important;
}

:deep(.arco-table-td) {
  color: var(--color-text) !important;
  border-color: var(--color-border) !important;
}

:deep(.arco-table-tr:hover .arco-table-td) {
  background: #f7f8fa !important;
}
</style>
