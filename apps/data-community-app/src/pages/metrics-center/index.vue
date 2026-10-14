<template>
  <div class="metrics-center-page">
    <!-- 页头 -->
    <div class="page-header">
      <h2>指标管理</h2>
      <a-space>
        <a-radio-group v-model="filterType" type="button" @change="handleSearch">
          <a-radio value="">全部</a-radio>
          <a-radio value="business">业务核心指标</a-radio>
          <a-radio value="regulatory">监管指标</a-radio>
        </a-radio-group>
        <a-dropdown @select="handleCreate">
          <a-button type="primary">
            <template #icon><IconPlus /></template>
            创建指标
            <template #suffix><IconDown /></template>
          </a-button>
          <template #content>
            <a-doption value="single"><template #icon><IconPlus /></template>新建指标</a-doption>
            <a-doption value="batch"><template #icon><IconUpload /></template>批量注册</a-doption>
          </template>
        </a-dropdown>
      </a-space>
    </div>

    <!-- 搜索和筛选 -->
    <div class="filter-section">
      <a-row :gutter="12">
        <a-col :span="6">
          <a-input
            v-model="searchKeyword"
            placeholder="搜索名称 / 编码 / 同义词（如：首逾率）"
            allow-clear
            @press-enter="handleSearch"
            @clear="handleSearch"
          >
            <template #prefix><IconSearch /></template>
          </a-input>
        </a-col>
        <a-col :span="4">
          <a-select v-model="filterDomain" placeholder="指标域" allow-clear @change="handleSearch">
            <a-option v-for="d in domainOptions" :key="d" :value="d">{{ d }}</a-option>
          </a-select>
        </a-col>
        <a-col :span="4">
          <a-select v-model="filterScenario" placeholder="归属场景" allow-clear @change="handleSearch">
            <a-option v-for="s in scenarioOptions" :key="s" :value="s">{{ s }}</a-option>
          </a-select>
        </a-col>
        <a-col :span="6">
          <a-select v-model="filterStatus" placeholder="状态" multiple allow-clear @change="handleSearch">
            <a-option value="active">启用</a-option>
            <a-option value="pending">审核中</a-option>
            <a-option value="draft">草稿</a-option>
            <a-option value="archived">归档</a-option>
          </a-select>
        </a-col>
        <a-col :span="4">
          <a-button @click="handleReset">重置</a-button>
        </a-col>
      </a-row>
      <!-- 治理筛选（R03/R15：按挂载与完整度档位圈出缺口指标） -->
      <a-row :gutter="12" style="margin-top: 12px">
        <a-col :span="6">
          <a-select v-model="filterMount" placeholder="报表挂载" allow-clear @change="handleSearch">
            <a-option v-for="o in MOUNT_STATUS_FILTER_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</a-option>
          </a-select>
        </a-col>
        <a-col :span="6">
          <a-select v-model="filterMeta" placeholder="人读信息完整度" allow-clear @change="handleSearch">
            <a-option v-for="o in COMPLETENESS_FILTER_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</a-option>
          </a-select>
        </a-col>
        <a-col :span="6">
          <a-select v-model="filterAgent" placeholder="Agent 字段完整度" allow-clear @change="handleSearch">
            <a-option v-for="o in COMPLETENESS_FILTER_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</a-option>
          </a-select>
        </a-col>
      </a-row>
    </div>

    <!-- 列表 -->
    <a-table
      :data="tableData"
      :pagination="{
        total: total,
        current: currentPage,
        pageSize: pageSize,
        showTotal: true,
        showPageSize: true,
      }"
      :loading="loading"
      row-key="id"
      :scroll="{ x: 1900 }"
      @page-change="handlePageChange"
      @page-size-change="handlePageSizeChange"
      @sorter-change="handleSorterChange"
    >
      <template #columns>
        <a-table-column title="指标名称" data-index="name" :width="200" :sortable="{ sortDirections: ['ascend', 'descend'] }">
          <template #cell="{ record }">
            <a-space :size="4">
              <a-link @click="goDetail(record.id)">{{ record.name }}</a-link>
              <a-tooltip v-if="record.agentMeta?.synonyms?.length" :content="`同义词：${record.agentMeta.synonyms.join('、')}`">
                <a-tag size="small" color="arcoblue">别名</a-tag>
              </a-tooltip>
            </a-space>
          </template>
        </a-table-column>
        <a-table-column title="指标编码" data-index="code" :width="150" ellipsis tooltip />
        <a-table-column title="业务口径" data-index="businessDefinition" :width="180" :ellipsis="true" :tooltip="true">
          <template #cell="{ record }">
            <span v-html="record.businessDefinition"></span>
          </template>
        </a-table-column>
        <a-table-column title="类型" data-index="type" :width="90">
          <template #cell="{ record }">
            <a-tag :color="record.type === 'business' ? 'blue' : 'red'">
              {{ record.type === 'business' ? '业务' : '监管' }}
            </a-tag>
          </template>
        </a-table-column>
        <a-table-column title="指标域" data-index="domain" :width="90" />
        <a-table-column title="归属场景" data-index="scenario" :width="110" />
        <a-table-column title="挂载报表" :width="100">
          <template #cell="{ record }">
            <a-tag v-if="record.reportMounts?.length" size="small" color="green">{{ record.reportMounts.length }} 个</a-tag>
            <a-tag v-else size="small" color="gray">未挂载</a-tag>
          </template>
        </a-table-column>
        <a-table-column title="完整度（人读/Agent）" :width="150">
          <template #cell="{ record }">
            <a-tooltip :content="completenessTip(record)">
              <span class="completeness-cell">
                <a-progress :percent="completeness(record).metaScore / 100" size="small" :show-text="false" style="width: 52px" :status="progressStatus(completeness(record).metaScore)" />
                <a-progress :percent="completeness(record).agentScore / 100" size="small" :show-text="false" style="width: 52px" :status="progressStatus(completeness(record).agentScore)" />
              </span>
            </a-tooltip>
          </template>
        </a-table-column>
        <a-table-column title="状态" data-index="status" :width="80">
          <template #cell="{ record }">
            <a-badge :status="statusMap[record.status]" :text="statusText[record.status]" />
          </template>
        </a-table-column>
        <a-table-column title="业务负责人" data-index="businessOwner" :width="100" />
        <a-table-column title="更新时间" data-index="updatedAt" :width="160" :sortable="{ sortDirections: ['ascend', 'descend'] }" />
        <a-table-column title="操作" :width="260" fixed="right">
          <template #cell="{ record }">
            <a-space>
              <template v-if="record.status === 'pending'">
                <a-popconfirm content="确认审批通过并启用该指标？" @ok="handleApprove(record.id)">
                  <a-button type="text" size="small" status="success">审批通过</a-button>
                </a-popconfirm>
                <a-button type="text" size="small" status="danger" @click="openReject(record)">驳回</a-button>
              </template>
              <template v-else>
                <a-button v-if="record.status !== 'archived'" type="text" size="small" @click="goEdit(record)">编辑</a-button>
                <a-popconfirm v-if="record.status === 'draft'" content="提交后将进入审核流程，审核通过方可启用" @ok="handleSubmitReview(record.id)">
                  <a-button type="text" size="small">提交审核</a-button>
                </a-popconfirm>
                <a-button type="text" size="small" @click="goDetail(record.id)">详情</a-button>
                <a-popconfirm v-if="record.status !== 'archived' && record.status !== 'draft'" content="确定要归档该指标吗？归档后不在指标地图展示" @ok="handleArchive(record.id)">
                  <a-button type="text" status="danger" size="small">归档</a-button>
                </a-popconfirm>
                <a-button v-if="record.status === 'archived'" type="text" size="small" @click="handleReactivate(record.id)">重新激活</a-button>
              </template>
            </a-space>
          </template>
        </a-table-column>
      </template>

      <template #empty>
        <a-empty description="未找到匹配指标，请调整筛选条件" />
      </template>
    </a-table>

    <!-- 驳回意见（必填，E 流程要求留痕） -->
    <a-modal v-model:visible="rejectVisible" title="驳回指标审核" @ok="confirmReject" ok-text="确认驳回" :ok-button-props="{ disabled: !rejectReason.trim() }">
      <p style="margin-bottom: 8px">驳回 <b>{{ rejectTarget?.name }}</b>，请填写驳回意见：</p>
      <a-textarea v-model="rejectReason" :max-length="200" show-word-limit placeholder="例如：业务口径与技术口径不一致，请补充去重说明" :auto-size="{ minRows: 3 }" />
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { MetricsCenterStore, calcCompleteness } from '@/mock-dca/metrics-center/store'
import { DOMAIN_OPTIONS, SCENARIO_OPTIONS, COMPLETENESS_FILTER_OPTIONS, MOUNT_STATUS_FILTER_OPTIONS } from '@/mock-dca/metrics-center/data'
import type { MetricItem, CompletenessScore } from '@/mock-dca/metrics-center/types'

const router = useRouter()
const loading = ref(false)
const tableData = ref<MetricItem[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const searchKeyword = ref('')
const filterType = ref('')
const filterDomain = ref('')
const filterScenario = ref('')
const filterStatus = ref<string[]>([])
const filterMount = ref('')
const filterMeta = ref('')
const filterAgent = ref('')
const sortField = ref('')
const sortOrder = ref<'asc' | 'desc'>('asc')

// 驳回弹窗
const rejectVisible = ref(false)
const rejectReason = ref('')
const rejectTarget = ref<MetricItem | null>(null)

const domainOptions = DOMAIN_OPTIONS
const scenarioOptions = computed(() => {
  if (filterDomain.value) return SCENARIO_OPTIONS[filterDomain.value] || []
  return Object.values(SCENARIO_OPTIONS).flat()
})

const statusMap: Record<string, string> = {
  active: 'success',
  pending: 'processing',
  archived: 'default',
  draft: 'warning',
}
const statusText: Record<string, string> = {
  active: '启用',
  pending: '审核中',
  archived: '归档',
  draft: '草稿',
}

function completeness(record: MetricItem): CompletenessScore {
  return calcCompleteness(record)
}

function completenessTip(record: MetricItem): string {
  const c = completeness(record)
  const lines = [`人读信息 ${c.metaScore}%`, `Agent 字段 ${c.agentScore}%`]
  if (c.metaMissing.length) lines.push(`人读缺口：${c.metaMissing.join('、')}`)
  if (c.agentMissing.length) lines.push(`Agent 缺口：${c.agentMissing.join('、')}`)
  return lines.join(' ｜ ')
}

function progressStatus(score: number): 'normal' | 'warning' | 'danger' {
  if (score >= 90) return 'normal'
  if (score >= 40) return 'warning'
  return 'danger'
}

function loadData() {
  loading.value = true
  setTimeout(() => {
    const result = MetricsCenterStore.query({
      keyword: searchKeyword.value,
      type: filterType.value as any,
      domain: filterDomain.value,
      scenario: filterScenario.value,
      status: filterStatus.value as any[],
      mountStatus: filterMount.value as any,
      metaCompleteness: filterMeta.value as any,
      agentCompleteness: filterAgent.value as any,
      page: currentPage.value,
      pageSize: pageSize.value,
      sortField: sortField.value || undefined,
      sortOrder: sortOrder.value,
    })
    tableData.value = result.list
    total.value = result.total
    loading.value = false
  }, 200)
}

function handleSearch() {
  currentPage.value = 1
  loadData()
}

function handleReset() {
  searchKeyword.value = ''
  filterType.value = ''
  filterDomain.value = ''
  filterScenario.value = ''
  filterStatus.value = []
  filterMount.value = ''
  filterMeta.value = ''
  filterAgent.value = ''
  handleSearch()
}

function handlePageChange(page: number) {
  currentPage.value = page
  loadData()
}

function handlePageSizeChange(size: number) {
  pageSize.value = size
  currentPage.value = 1
  loadData()
}

function handleSorterChange(sorter: any) {
  if (sorter.field) {
    sortField.value = sorter.field
    sortOrder.value = sorter.order === 'descend' ? 'desc' : 'asc'
  } else {
    sortField.value = ''
  }
  loadData()
}

function handleCreate(value: string | number | Record<string, any> | undefined) {
  const v = String(value)
  if (v === 'single') {
    router.push({ name: 'metrics-center-create' })
  } else if (v === 'batch') {
    router.push({ name: 'metrics-center-batch-import' })
  }
}

function goDetail(id: string) {
  router.push({ name: 'metrics-center-detail', params: { id } })
}

function goEdit(record: MetricItem) {
  router.push({ name: 'metrics-center-create', query: { id: record.id } })
}

function handleArchive(id: string) {
  MetricsCenterStore.archive(id)
  Message.success('指标已归档')
  loadData()
}

function handleReactivate(id: string) {
  MetricsCenterStore.reactivate(id)
  Message.success('指标已重新启用')
  loadData()
}

function handleSubmitReview(id: string) {
  try {
    MetricsCenterStore.submitReview(id)
    Message.success('已提交审核，等待指标管理员审批')
    loadData()
  } catch (e: any) {
    Message.error(e.message || '提交审核失败')
  }
}

function handleApprove(id: string) {
  try {
    MetricsCenterStore.approve(id)
    Message.success('审批通过，指标已启用')
    loadData()
  } catch (e: any) {
    Message.error(e.message || '审批失败')
  }
}

function openReject(record: MetricItem) {
  rejectTarget.value = record
  rejectReason.value = ''
  rejectVisible.value = true
}

function confirmReject() {
  if (!rejectTarget.value || !rejectReason.value.trim()) return
  try {
    MetricsCenterStore.reject(rejectTarget.value.id, rejectReason.value.trim())
    Message.success('已驳回，指标退回草稿状态')
  } catch (e: any) {
    Message.error(e.message || '驳回失败')
  }
  rejectVisible.value = false
  rejectTarget.value = null
  loadData()
}

onMounted(() => {
  loadData()
})
</script>

<style lang="scss" scoped>
.metrics-center-page {
  padding: 24px;

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;

    h2 { margin: 0; font-size: 20px; }
  }

  .filter-section {
    margin-bottom: 16px;
    padding: 16px;
    background: #fff;
    border-radius: 4px;
    border: 1px solid #e5e6eb;
  }
}

.completeness-cell {
  display: inline-flex;
  gap: 6px;
  align-items: center;
}
</style>
