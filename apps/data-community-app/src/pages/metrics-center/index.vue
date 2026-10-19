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
            <a-option value="inactive">停用</a-option>
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
      :scroll="{ x: 1960 }"
      @page-change="handlePageChange"
      @page-size-change="handlePageSizeChange"
      @sorter-change="handleSorterChange"
    >
      <template #columns>
        <a-table-column title="指标名称" data-index="name" :width="200" :sortable="{ sortDirections: ['ascend', 'descend'] }">
          <template #cell="{ record }">
            <a-link @click="goDetail(record.id)">{{ record.name }}</a-link>
          </template>
        </a-table-column>
        <a-table-column title="指标编码" data-index="code" :width="150" ellipsis tooltip />
        <a-table-column title="业务口径" data-index="businessDefinition" :width="180" :ellipsis="true" :tooltip="true">
          <template #cell="{ record }">
            <span v-html="record.businessDefinition"></span>
          </template>
        </a-table-column>
        <a-table-column title="类型" data-index="type" :width="120">
          <template #cell="{ record }">
            <a-space :size="4">
              <a-tag :color="record.type === 'business' ? 'blue' : 'red'">
                {{ record.type === 'business' ? '业务' : '监管' }}
              </a-tag>
              <a-tag v-if="record.type === 'regulatory' && record.version" size="small" color="purple">v{{ record.version }}</a-tag>
            </a-space>
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
        <a-table-column title="完整度（人读）" :width="120">
          <template #cell="{ record }">
            <a-tooltip :content="completenessTip(record)">
              <a-progress :percent="completeness(record).metaScore / 100" size="small" :show-text="false" style="width: 80px" :status="progressStatus(completeness(record).metaScore)" />
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
        <a-table-column title="操作" :width="240" fixed="right">
          <template #cell="{ record }">
            <a-space>
              <a-button type="text" size="small" @click="goEdit(record)">编辑</a-button>
              <a-button v-if="record.type === 'regulatory' && record.versions?.length" type="text" size="small" @click="openVersionModal(record)">版本切换</a-button>
              <a-popconfirm v-if="record.status === 'active'" content="确定要停用该指标吗？停用后不在指标地图展示" @ok="handleArchive(record.id)">
                <a-button type="text" status="danger" size="small">停用</a-button>
              </a-popconfirm>
              <a-button v-if="record.status === 'inactive'" type="text" size="small" @click="handleReactivate(record.id)">启用</a-button>
            </a-space>
          </template>
        </a-table-column>
      </template>

      <template #empty>
        <a-empty description="未找到匹配指标，请调整筛选条件" />
      </template>
    </a-table>

    <!-- 版本切换弹窗 -->
    <a-modal
      v-model:visible="versionModalVisible"
      :title="`版本切换 · ${versionModalMetric?.name ?? ''}`"
      width="720px"
      unmount-on-close
      :footer="false"
    >
      <div v-if="versionModalMetric" class="version-modal-body">
        <div class="version-modal-info">
          <a-tag color="red" size="small">监管指标</a-tag>
          <a-tag color="purple" size="small">当前 v{{ versionModalMetric.version }}</a-tag>
          <span class="version-modal-code">{{ versionModalMetric.code }}</span>
        </div>
        <a-table
          :data="versionModalMetric.versions"
          :pagination="false"
          row-key="version"
          size="small"
          style="margin-top: 12px"
        >
          <template #columns>
            <a-table-column title="版本" :width="100">
              <template #cell="{ record }">
                <a-tag
                  :color="record.version === versionModalMetric.version ? 'purple' : 'gray'"
                  size="small"
                >
                  v{{ record.version }}
                </a-tag>
                <span
                  v-if="record.version === versionModalMetric.version"
                  style="margin-left: 4px; font-size: 12px; color: #722ed1;"
                >当前</span>
              </template>
            </a-table-column>
            <a-table-column title="变更说明" data-index="changeNote" />
            <a-table-column title="变更时间" data-index="createdAt" :width="180" />
            <a-table-column title="变更人" data-index="createdBy" :width="100" />
            <a-table-column title="操作" :width="120">
              <template #cell="{ record }">
                <a-popconfirm
                  v-if="record.version !== versionModalMetric.version"
                  :content="`确定激活 v${record.version}？将以此版本内容覆盖当前指标，并生成新版本。`"
                  @ok="handleActivateVersion(record.version)"
                >
                  <a-button type="text" size="small" status="warning">激活</a-button>
                </a-popconfirm>
                <span v-else style="color: #86909c; font-size: 12px;">—</span>
              </template>
            </a-table-column>
          </template>
        </a-table>
      </div>
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

const domainOptions = DOMAIN_OPTIONS
const scenarioOptions = computed(() => {
  if (filterDomain.value) return SCENARIO_OPTIONS[filterDomain.value] || []
  return Object.values(SCENARIO_OPTIONS).flat()
})

const statusMap: Record<string, string> = {
  active: 'success',
  inactive: 'default',
}
const statusText: Record<string, string> = {
  active: '启用',
  inactive: '停用',
}

function completeness(record: MetricItem): CompletenessScore {
  return calcCompleteness(record)
}

function completenessTip(record: MetricItem): string {
  const c = completeness(record)
  const lines = [`人读信息 ${c.metaScore}%`]
  if (c.metaMissing.length) lines.push(`人读缺口：${c.metaMissing.join('、')}`)
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
  Message.success('指标已停用')
  loadData()
}

function handleReactivate(id: string) {
  MetricsCenterStore.reactivate(id)
  Message.success('指标已启用')
  loadData()
}

// ── 版本切换弹窗（仅监管指标） ──
const versionModalVisible = ref(false)
const versionModalMetric = ref<MetricItem | undefined>()

function openVersionModal(record: MetricItem) {
  // 从 store 重新获取最新数据（含版本历史）
  versionModalMetric.value = MetricsCenterStore.getById(record.id)
  versionModalVisible.value = true
}

function handleActivateVersion(version: number) {
  if (!versionModalMetric.value) return
  try {
    const updated = MetricsCenterStore.activateVersion(versionModalMetric.value.id, version)
    if (updated) {
      versionModalMetric.value = updated
      Message.success(`已激活历史版本 v${version}，当前版本 v${updated.version}`)
      loadData()
    }
  } catch (e: any) {
    Message.error(e.message || '激活失败')
  }
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

.version-modal-info {
  display: flex;
  align-items: center;
  gap: 8px;

  .version-modal-code {
    color: #86909c;
    font-size: 13px;
    margin-left: 4px;
  }
}
</style>
