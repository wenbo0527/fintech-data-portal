<template>
  <div class="quality-task-list">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">校验任务管理</h2>
        <p class="page-description">管理跨库数据一致性校验任务，包括创建、编辑、启停和查看任务列表</p>
      </div>
      <div class="header-right">
        <a-button type="primary" @click="handleCreate">
          <template #icon>
            <IconPlus />
          </template>
          新建任务
        </a-button>
      </div>
    </div>

    <!-- 搜索和筛选 -->
    <div class="search-section">
      <a-row :gutter="16">
        <a-col :span="6">
          <a-input
            v-model="searchForm.name"
            placeholder="搜索任务名称"
            allow-clear
            @input="handleSearch"
          >
            <template #prefix>
              <IconSearch />
            </template>
          </a-input>
        </a-col>
        <a-col :span="4">
          <a-select
            v-model="searchForm.status"
            placeholder="任务状态"
            allow-clear
            @change="handleSearch"
          >
            <a-option value="active">已启用</a-option>
            <a-option value="inactive">已停用</a-option>
          </a-select>
        </a-col>
        <a-col :span="4">
          <a-select
            v-model="searchForm.checkMethod"
            placeholder="校验方式"
            allow-clear
            @change="handleSearch"
          >
            <a-option value="count">条数校验</a-option>
            <a-option value="sum">金额汇总校验</a-option>
          </a-select>
        </a-col>
        <a-col :span="4">
          <a-select
            v-model="searchForm.dimension"
            placeholder="质量维度"
            allow-clear
            @change="handleSearch"
          >
            <a-option v-for="dim in QUALITY_DIMENSIONS" :key="dim" :value="dim">
              {{ QUALITY_DIM_LABELS[dim] }}
            </a-option>
          </a-select>
        </a-col>
        <a-col :span="6">
          <a-link class="dim-weights-hint" @click="goQualityDashboard">
            <IconDashboard />
            <span>查看质量看板（评分回流资产目录）</span>
          </a-link>
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
        @page-change="handlePageChange"
        @page-size-change="handlePageSizeChange"
        :bordered="{ wrapper: true, cell: true }"
      >
        <!-- 任务名称 -->
        <template #name="{ record }">
          <div class="task-name">
            <a-link @click="handleViewInstances(record)">{{ record.name }}</a-link>
            <div class="task-desc">{{ record.description }}</div>
          </div>
        </template>

        <!-- 源端表 -->
        <template #sourceTable="{ record }">
          <div class="source-info">
            <a-tag color="blue" size="small">{{ record.source.datasourceName }}</a-tag>
            <span class="table-path">{{ record.source.database }}.{{ record.source.table }}</span>
          </div>
        </template>

        <!-- 目标端表 -->
        <template #targetTable="{ record }">
          <div class="target-info">
            <a-tag color="green" size="small">{{ record.target.datasourceName }}</a-tag>
            <span class="table-path">{{ record.target.database }}.{{ record.target.table }}</span>
          </div>
        </template>

        <!-- 校验规则 -->
        <template #rules="{ record }">
          <div class="rules-summary">
            <span class="rules-count">{{ record.rules.length }} 条规则</span>
            <div class="rules-tags">
              <a-tag
                v-for="r in record.rules"
                :key="r.id"
                :color="r.type === 'count' ? 'arcoblue' : 'orangered'"
                size="small"
              >
                {{ r.type === 'count' ? 'count' : 'sum' }}
              </a-tag>
            </div>
          </div>
        </template>

        <!-- 质量维度（五维标签） -->
        <template #dimensions="{ record }">
          <div class="rules-tags">
            <a-tag
              v-for="dim in dimsOfTask(record)"
              :key="dim"
              :color="QUALITY_DIM_COLORS[dim]"
              size="small"
            >
              {{ QUALITY_DIM_LABELS[dim] }}
            </a-tag>
            <span v-if="!dimsOfTask(record).length" class="text-gray">未标注</span>
          </div>
        </template>

        <!-- 调度周期 -->
        <template #schedule="{ record }">
          <div class="schedule-info">
            <span>{{ record.scheduleType === 'daily' ? '按天' : '按周' }}</span>
            <span class="schedule-detail">
              {{ record.scheduleType === 'weekly' && record.scheduleDay ? record.scheduleDay + ' ' : '' }}{{ record.scheduleTime }}
            </span>
          </div>
        </template>

        <!-- 上次运行状态 -->
        <template #lastRunStatus="{ record }">
          <template v-if="record.lastRunStatus">
            <a-badge
              :status="runStatusMap[record.lastRunStatus].status"
              :text="runStatusMap[record.lastRunStatus].text"
            />
          </template>
          <span v-else class="text-gray">未执行</span>
        </template>

        <!-- 任务状态 -->
        <template #status="{ record }">
          <a-switch
            :model-value="record.status === 'active'"
            @change="handleToggle(record)"
            :loading="record._toggling"
          >
            <template #checked>已启用</template>
            <template #unchecked>已停用</template>
          </a-switch>
        </template>

        <!-- 操作 -->
        <template #actions="{ record }">
          <a-space>
            <a-button type="text" size="small" @click="handleEdit(record)">编辑</a-button>
            <a-button type="text" size="small" @click="handleTrigger(record)" :loading="record._triggering">
              手动触发
            </a-button>
            <a-button type="text" size="small" @click="handleViewInstances(record)">实例</a-button>
            <a-popconfirm
              content="删除后历史实例日志保留30天，确定删除此任务吗？"
              @ok="handleDelete(record)"
            >
              <a-button type="text" size="small" status="danger">删除</a-button>
            </a-popconfirm>
          </a-space>
        </template>
      </a-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { IconPlus, IconSearch, IconDashboard } from '@arco-design/web-vue/es/icon'
import {
  getQualityTasks,
  deleteQualityTask,
  toggleQualityTask,
  triggerTask,
  QUALITY_DIMENSIONS,
  QUALITY_DIM_LABELS,
  QUALITY_DIM_COLORS,
  dimOfRule,
  type QualityDimension
} from '../../../../mock/api/dataQuality'

const router = useRouter()

const loading = ref(false)
const dataList = ref<any[]>([])

const searchForm = reactive({
  name: '',
  status: '' as '' | 'active' | 'inactive',
  checkMethod: '' as '' | 'count' | 'sum',
  dimension: '' as '' | QualityDimension
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
  { title: '任务名称', dataIndex: 'name', slotName: 'name', width: 220 },
  { title: '源端表', slotName: 'sourceTable', width: 200 },
  { title: '目标端表', slotName: 'targetTable', width: 200 },
  { title: '校验规则', slotName: 'rules', width: 110 },
  { title: '质量维度', slotName: 'dimensions', width: 170 },
  { title: '调度周期', slotName: 'schedule', width: 130 },
  { title: '上次运行', slotName: 'lastRunStatus', width: 120 },
  { title: '状态', slotName: 'status', width: 100 },
  { title: '操作', slotName: 'actions', width: 240, fixed: 'right' }
]

const runStatusMap: Record<string, { status: any; text: string }> = {
  consistent: { status: 'success', text: '一致' },
  inconsistent: { status: 'warning', text: '不一致' },
  failed: { status: 'danger', text: '执行失败' }
}

/** 任务覆盖的质量维度（去重，按五维固定顺序；历史规则未打标时按校验类型兜底） */
const dimsOfTask = (task: any): QualityDimension[] => {
  const set = new Set<QualityDimension>(
    (task?.rules || []).map((r: any) => dimOfRule(r))
  )
  return QUALITY_DIMENSIONS.filter(d => set.has(d))
}

const goQualityDashboard = () => {
  router.push('/management/quality/dashboard')
}

const handleCreate = () => {
  router.push('/management/data-quality/tasks/create')
}

const handleEdit = (record: any) => {
  router.push(`/management/data-quality/tasks/${record.id}/edit`)
}

const handleViewInstances = (record: any) => {
  router.push(`/management/data-quality/instances?taskId=${record.id}`)
}

const handleToggle = async (record: any) => {
  record._toggling = true
  try {
    const data = await toggleQualityTask(record.id)
    record.status = data.status
    Message.success(data.status === 'active' ? '任务已启用' : '任务已停用')
  } catch (e: any) {
    Message.error(e?.message || '操作失败')
  } finally {
    record._toggling = false
  }
}

const handleTrigger = async (record: any) => {
  record._triggering = true
  try {
    const inst = await triggerTask(record.id)
    const results = (inst as any)?.results || []
    const breach = results.filter((r: any) => !r.isConsistent).length
    Message.success(
      breach
        ? `执行完成：${results.length} 条规则中 ${breach} 条超阈值，已推送告警`
        : `执行完成：${results.length} 条规则全部通过`
    )
    loadData()
  } catch (e: any) {
    Message.error(e?.message || '触发失败')
  } finally {
    record._triggering = false
  }
}

const handleDelete = async (record: any) => {
  try {
    await deleteQualityTask(record.id)
    Message.success('删除成功')
    loadData()
  } catch (e: any) {
    Message.error(e?.message || '删除失败')
  }
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
    const data = await getQualityTasks({
      page: pagination.current,
      pageSize: pagination.pageSize,
      name: searchForm.name || undefined,
      status: searchForm.status || undefined,
      checkMethod: searchForm.checkMethod || undefined,
      dimension: searchForm.dimension || undefined
    })
    dataList.value = (data?.list || []).map((t: any) => ({ ...t, _toggling: false, _triggering: false }))
    pagination.total = data?.total || 0
  } catch (e: any) {
    Message.error(e?.message || '加载数据失败')
    dataList.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.quality-task-list {
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

.header-right {
  flex-shrink: 0;
}

.search-section {
  margin-bottom: 20px;
  padding: 16px;
  background-color: #f7f8fa;
  border-radius: 6px;
}

.task-name {
  display: flex;
  flex-direction: column;
}

.task-desc {
  font-size: 12px;
  color: #86909c;
  margin-top: 4px;
}

.source-info, .target-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.table-path {
  font-size: 13px;
  color: #4e5969;
}

.rules-summary {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.rules-count {
  font-size: 12px;
  color: #86909c;
}

.rules-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
}

.schedule-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.schedule-detail {
  font-size: 12px;
  color: #86909c;
}

.dim-weights-hint {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #4e5969;
}

.text-gray {
  color: #86909c;
}
</style>