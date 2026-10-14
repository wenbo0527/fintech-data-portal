<template>
  <div class="instance-list">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">任务实例日志</h2>
        <p class="page-description">查看校验任务的每次运行实例、运行日志和校验结果（实例日志保留90天）</p>
      </div>
      <div class="header-right">
        <a-button @click="goBack">
          <template #icon><IconArrowLeft /></template>
          返回任务列表
        </a-button>
      </div>
    </div>

    <!-- 搜索和筛选 -->
    <div class="search-section">
      <a-row :gutter="16">
        <a-col :span="8">
          <a-select
            v-model="searchForm.taskId"
            placeholder="选择任务"
            allow-clear
            allow-search
            @change="handleSearch"
          >
            <a-option v-for="t in taskOptions" :key="t.id" :value="t.id">{{ t.name }}</a-option>
          </a-select>
        </a-col>
        <a-col :span="6">
          <a-select
            v-model="searchForm.status"
            placeholder="运行状态"
            allow-clear
            @change="handleSearch"
          >
            <a-option value="consistent">一致</a-option>
            <a-option value="inconsistent">不一致</a-option>
            <a-option value="failed">执行失败</a-option>
          </a-select>
        </a-col>
      </a-row>
    </div>

    <!-- 数据表格 -->
    <div class="table-section">
      <a-table
        :columns="columns"
        :data="dataList"
        :loading="loading"
        :pagination="pagination"
        :scroll="{ x: 1310 }"
        @page-change="handlePageChange"
        @page-size-change="handlePageSizeChange"
        :bordered="{ wrapper: true, cell: true }"
      >
        <!-- 任务名称 -->
        <template #taskName="{ record }">
          <div class="task-name">
            <a-link @click="handleViewDetail(record)">{{ record.taskName }}</a-link>
          </div>
        </template>

        <!-- 运行状态 -->
        <template #status="{ record }">
          <a-badge
            :status="statusMap[record.status]?.status"
            :text="statusMap[record.status]?.text"
          />
        </template>

        <!-- 目标资产（评分回流的表） -->
        <template #targetTable="{ record }">
          <span class="table-name">{{ record.targetTable || '—' }}</span>
        </template>

        <!-- 覆盖的质量维度 -->
        <template #dims="{ record }">
          <div class="dim-tags">
            <a-tag
              v-for="dim in dimsOfInstance(record)"
              :key="dim"
              :color="QUALITY_DIM_COLORS[dim]"
              size="small"
            >
              {{ QUALITY_DIM_LABELS[dim] }}
            </a-tag>
            <span v-if="!dimsOfInstance(record).length" class="text-gray">—</span>
          </div>
        </template>

        <!-- 校验方式 -->
        <template #checkMethod="{ record }">
          <span>{{ record.results?.length || 0 }} 条规则</span>
        </template>

        <!-- 差异概要 -->
        <template #diffSummary="{ record }">
          <div class="diff-summary">
            <template v-if="record.status === 'failed'">
              <span class="text-gray">—</span>
            </template>
            <template v-else>
              <span :class="['diff-count', { 'diff-red': getInconsistentCount(record) > 0 }]">
                {{ getInconsistentCount(record) }} 条不一致
              </span>
              <span class="diff-total">/ {{ record.results?.length || 0 }} 条</span>
            </template>
          </div>
        </template>

        <!-- 执行耗时 -->
        <template #duration="{ record }">
          {{ record.duration }}s
        </template>

        <!-- 操作 -->
        <template #actions="{ record }">
          <a-button type="text" size="small" @click="handleViewDetail(record)">
            查看日志
          </a-button>
        </template>
      </a-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { IconArrowLeft } from '@arco-design/web-vue/es/icon'
import {
  getTaskInstances,
  getQualityTasks,
  QUALITY_DIMENSIONS,
  QUALITY_DIM_LABELS,
  QUALITY_DIM_COLORS,
  dimOfRule,
  type QualityDimension
} from '../../../../mock/api/dataQuality'

const router = useRouter()
const route = useRoute()

const loading = ref(false)
const dataList = ref<any[]>([])
const taskOptions = ref<any[]>([])

const searchForm = reactive({
  taskId: (route.query.taskId as string) || '',
  status: '' as '' | 'consistent' | 'inconsistent' | 'failed'
})

const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showTotal: true,
  showPageSize: true,
  pageSizeOptions: [10, 20, 50]
})

const columns = [
  { title: '任务名称', slotName: 'taskName', width: 230 },
  { title: '运行状态', slotName: 'status', width: 110 },
  { title: '目标资产', slotName: 'targetTable', width: 170 },
  { title: '覆盖维度', slotName: 'dims', width: 180 },
  { title: '规则数', slotName: 'checkMethod', width: 100 },
  { title: '差异概要', slotName: 'diffSummary', width: 140 },
  { title: '执行耗时', slotName: 'duration', width: 100 },
  { title: '运行时间', dataIndex: 'runTime', width: 180 },
  { title: '操作', slotName: 'actions', width: 100, fixed: 'right' }
]

const statusMap: Record<string, { status: any; text: string }> = {
  consistent: { status: 'success', text: '一致' },
  inconsistent: { status: 'warning', text: '不一致' },
  failed: { status: 'danger', text: '执行失败' }
}

const getInconsistentCount = (record: any) => {
  if (!record.results) return 0
  return record.results.filter((r: any) => !r.isConsistent).length
}

// 实例覆盖的质量维度：按检查结果规则维度去重（未标注时按校验类型兜底）
const dimsOfInstance = (record: any): QualityDimension[] => {
  const set = new Set<QualityDimension>(
    (record?.results || []).map(
      (r: any) => dimOfRule(r)
    )
  )
  return QUALITY_DIMENSIONS.filter((d) => set.has(d))
}

const goBack = () => {
  router.push('/management/data-quality/tasks')
}

const handleViewDetail = (record: any) => {
  router.push(`/management/data-quality/instances/${record.id}`)
}

const handleSearch = () => {
  pagination.current = 1
  loadData()
}

const handlePageChange = (page: number) => {
  pagination.current = page
  loadData()
}

const handlePageSizeChange = (size: number) => {
  pagination.pageSize = size
  pagination.current = 1
  loadData()
}

const loadData = async () => {
  loading.value = true
  try {
    const data = await getTaskInstances({
      page: pagination.current,
      pageSize: pagination.pageSize,
      taskId: searchForm.taskId || undefined,
      status: searchForm.status || undefined
    })
    dataList.value = data?.list || []
    pagination.total = data?.total || 0
  } catch (e: any) {
    Message.error(e?.message || '加载数据失败')
    dataList.value = []
  } finally {
    loading.value = false
  }
}

const loadTaskOptions = async () => {
  try {
    const data = await getQualityTasks({ page: 1, pageSize: 100 })
    taskOptions.value = data?.list || []
  } catch (e) {
    /* noop */
  }
}

onMounted(() => {
  loadTaskOptions()
  loadData()
})
</script>

<style scoped>
.instance-list {
  padding: 20px;
  background-color: #fff;
  border-radius: 8px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e5e6eb;
}

.header-left {
  flex: 1;
}

.page-title {
  margin: 0 0 8px 0;
  font-size: 20px;
  font-weight: 600;
  color: #1d2129;
}

.page-description {
  margin: 0;
  color: #86909c;
  font-size: 14px;
}

.search-section {
  margin-bottom: 20px;
  padding: 16px;
  background-color: #f7f8fa;
  border-radius: 6px;
}

.diff-summary {
  display: flex;
  align-items: center;
  gap: 4px;
}

.diff-count {
  font-weight: 600;
  color: #00b42a;
}

.diff-count.diff-red {
  color: #f53f3f;
}

.diff-total {
  font-size: 12px;
  color: #86909c;
}

.text-gray {
  color: #86909c;
}

.table-name {
  font-family: Menlo, Consolas, monospace;
  font-size: 13px;
  color: #1d2129;
}

.dim-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
</style>