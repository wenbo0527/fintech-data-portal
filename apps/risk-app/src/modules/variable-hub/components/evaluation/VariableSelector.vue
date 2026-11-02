<!--
  特征选择器组件
  支持按类型筛选、关键词搜索、分页加载（适用于几万级特征数据）
-->
<template>
  <div class="variable-selector">
    <!-- 来源类型切换 -->
    <div class="selector-header">
      <a-radio-group v-model="localSourceType" type="button" @change="handleSourceTypeChange">
        <a-radio value="variable_batch">特征批量选择</a-radio>
        <a-radio value="topic">从课题导入</a-radio>
      </a-radio-group>
    </div>

    <!-- 特征选择区域 -->
    <div v-if="localSourceType === 'variable_batch'" class="selector-content">
      <!-- 筛选栏 -->
      <div class="filter-bar">
        <a-space wrap size="small">
          <a-input-search
            v-model="searchKeyword"
            placeholder="搜索特征名称/编码"
            style="width: 240px"
            allow-clear
            @search="handleSearch"
          />
          <a-select
            v-model="filterType"
            placeholder="特征类型"
            :options="typeOptions"
            style="width: 140px"
            allow-clear
            @change="handleFilterChange"
          />
          <a-select
            v-model="filterDataSource"
            placeholder="数据来源"
            :options="dataSourceOptions"
            style="width: 160px"
            allow-clear
            @change="handleFilterChange"
          />
          <a-select
            v-model="filterStatus"
            placeholder="状态"
            :options="statusOptions"
            style="width: 120px"
            allow-clear
            @change="handleFilterChange"
          />
          <a-button @click="resetFilters">重置</a-button>
        </a-space>
        <div class="filter-stats">
          共 <strong>{{ filteredVariables.length }}</strong> 个特征，已选 <strong>{{ modelValue.length }}</strong> 个
        </div>
      </div>

      <!-- 已选特征标签 -->
      <div v-if="modelValue.length > 0" class="selected-tags">
        <div class="selected-tags-header">
          <span>已选特征：</span>
          <a-button type="text" size="mini" @click="clearSelection">清空</a-button>
        </div>
        <div class="selected-tags-list">
          <a-tag
            v-for="item in modelValue.slice(0, 20)"
            :key="item.id"
            closable
            color="arcoblue"
            @close="removeSelected(item.id)"
          >
            {{ item.name }}
          </a-tag>
          <a-tag v-if="modelValue.length > 20" color="gray">
            +{{ modelValue.length - 20 }} 个...
          </a-tag>
        </div>
      </div>

      <!-- 特征列表 -->
      <div class="variable-list">
        <a-table
          :columns="columns"
          :data="pagedVariables"
          :pagination="pagination"
          :loading="loading"
          row-key="id"
          :bordered="false"
          size="small"
          @page-change="handlePageChange"
          @page-size-change="handlePageSizeChange"
        >
          <template #nameCell="{ record }">
            <div class="variable-name">
              <a-checkbox
                :model-value="isSelected(record.id)"
                @change="(val) => toggleSelect(record, val as boolean)"
              />
              <span class="name-text">{{ record.name }}</span>
            </div>
          </template>
          <template #codeCell="{ record }">
            <code class="variable-code">{{ record.code }}</code>
          </template>
          <template #typeCell="{ record }">
            <a-tag :color="typeColor(record.type)" size="small">{{ record.type }}</a-tag>
          </template>
          <template #sourceCell="{ record }">
            <a-tag :color="sourceColor(record.sourceType)" size="small">{{ sourceLabel(record.sourceType) }}</a-tag>
          </template>
          <template #statusCell="{ record }">
            <a-badge :status="statusBadge(record.status)" :text="statusLabel(record.status)" />
          </template>
        </a-table>
      </div>
    </div>

    <!-- 从课题导入 -->
    <div v-else class="selector-topic">
      <a-alert type="info" :show-icon="false">
        <template #title>从探索课题导入特征</template>
        选择已有的探索课题，将课题产出的候选特征批量导入为评估对象。
      </a-alert>
      <a-form-item label="选择课题" style="margin-top: 16px">
        <a-select
          v-model="selectedTopicId"
          :options="topicOptions"
          placeholder="请选择课题"
          allow-search
          allow-clear
          style="width: 100%"
          @change="handleTopicSelect"
        />
      </a-form-item>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { Message } from '@arco-design/web-vue'
import { variableAssets } from '@/modules/variable-hub/mock/variable-management/variables'
import { dataSources } from '@/modules/variable-hub/mock/variable-management/data-sources'
import type { EvaluationTaskTarget } from '@/modules/variable-hub/mock/evaluation/evaluation-task-store'

interface Props {
  modelValue: EvaluationTaskTarget[]
  sourceType: 'variable_batch' | 'topic'
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: EvaluationTaskTarget[]): void
  (e: 'sourceTypeChange', value: 'variable_batch' | 'topic'): void
}>()

const localSourceType = ref(props.sourceType)
const searchKeyword = ref('')
const filterType = ref('')
const filterDataSource = ref('')
const filterStatus = ref('')
const loading = ref(false)
const selectedTopicId = ref('')

// 分页
const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
  showTotal: true,
  showPageSize: true
})

// 选项数据
const typeOptions = computed(() => {
  const types = new Set(variableAssets.map((v) => v.type).filter(Boolean))
  return Array.from(types).map((t) => ({ label: t, value: t }))
})

const dataSourceOptions = computed(() =>
  dataSources.map((d) => ({ label: d.name, value: d.id }))
)

const statusOptions = [
  { label: '草稿', value: 'draft' },
  { label: '已发布', value: 'published' },
  { label: '已停用', value: 'disabled' },
  { label: '评审中', value: 'reviewing' }
]

// 模拟课题数据
const topicOptions = [
  { label: '风控_逾期前行为特征_202606', value: 'EXP-2026-001' },
  { label: '营销_用户画像特征_202607', value: 'EXP-2026-002' },
  { label: '信贷_申请反欺诈特征_202608', value: 'EXP-2026-003' }
]

// 表格列定义
const columns = [
  { title: '特征名称', dataIndex: 'name', slotName: 'nameCell', width: 240 },
  { title: '编码', dataIndex: 'code', slotName: 'codeCell', width: 180 },
  { title: '类型', dataIndex: 'type', slotName: 'typeCell', width: 100 },
  { title: '来源', dataIndex: 'sourceType', slotName: 'sourceCell', width: 100 },
  { title: '数据源', dataIndex: 'dataSource', width: 140 },
  { title: '状态', dataIndex: 'status', slotName: 'statusCell', width: 100 }
]

// 过滤后的特征列表
const filteredVariables = computed(() => {
  let list = [...variableAssets]
  
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    list = list.filter((v) =>
      v.name.toLowerCase().includes(keyword) ||
      v.code.toLowerCase().includes(keyword)
    )
  }
  
  if (filterType.value) {
    list = list.filter((v) => v.type === filterType.value)
  }
  
  if (filterDataSource.value) {
    list = list.filter((v) => v.dataSource === filterDataSource.value)
  }
  
  if (filterStatus.value) {
    list = list.filter((v) => v.status === filterStatus.value)
  }
  
  return list
})

// 分页数据
const pagedVariables = computed(() => {
  const start = (pagination.current - 1) * pagination.pageSize
  return filteredVariables.value.slice(start, start + pagination.pageSize)
})

// 辅助函数
const typeColor = (type: string) => ({
  external: 'arcoblue',
  internal: 'green',
  credit: 'purple',
  behavior: 'orange'
}[type] || 'gray')

const sourceLabel = (source: string) => ({
  external: '外数',
  internal: '内数',
  credit: '征信'
}[source] || '—')

const sourceColor = (source: string) => ({
  external: 'arcoblue',
  internal: 'green',
  credit: 'purple'
}[source] || 'gray')

const statusLabel = (status: string) => ({
  draft: '草稿',
  published: '已发布',
  disabled: '已停用',
  reviewing: '评审中'
}[status] || status)

const statusBadge = (status: string): 'default' | 'processing' | 'success' | 'warning' => ({
  draft: 'default',
  published: 'success',
  disabled: 'warning',
  reviewing: 'processing'
}[status] as any || 'default')

// 方法
function handleSourceTypeChange(val: string | number | boolean) {
  emit('sourceTypeChange', val as 'variable_batch' | 'topic')
}

function handleSearch() {
  pagination.current = 1
}

function handleFilterChange() {
  pagination.current = 1
}

function resetFilters() {
  searchKeyword.value = ''
  filterType.value = ''
  filterDataSource.value = ''
  filterStatus.value = ''
  pagination.current = 1
}

function handlePageChange(page: number) {
  pagination.current = page
}

function handlePageSizeChange(pageSize: number) {
  pagination.pageSize = pageSize
  pagination.current = 1
}

function isSelected(id: string): boolean {
  return props.modelValue.some((item) => item.id === id)
}

function toggleSelect(record: any, checked: boolean) {
  const target: EvaluationTaskTarget = {
    id: record.id,
    name: record.name,
    code: record.code,
    sourceType: record.sourceType,
    dataSourceName: record.dataSource
  }
  
  if (checked) {
    if (!isSelected(target.id)) {
      emit('update:modelValue', [...props.modelValue, target])
    }
  } else {
    emit('update:modelValue', props.modelValue.filter((item) => item.id !== target.id))
  }
}

function removeSelected(id: string) {
  emit('update:modelValue', props.modelValue.filter((item) => item.id !== id))
}

function clearSelection() {
  emit('update:modelValue', [])
}

function handleTopicSelect(topicId: string) {
  // 模拟从课题导入特征
  if (topicId) {
    const mockTargets: EvaluationTaskTarget[] = [
      { id: `TOPIC-${topicId}-1`, name: '课题特征A', code: 'TOPIC_FEAT_A', sourceType: 'internal', dataSourceName: '课题底表' },
      { id: `TOPIC-${topicId}-2`, name: '课题特征B', code: 'TOPIC_FEAT_B', sourceType: 'internal', dataSourceName: '课题底表' }
    ]
    emit('update:modelValue', mockTargets)
    Message.success(`已从课题导入 ${mockTargets.length} 个特征`)
  }
}

// 监听 total 变化
watch(filteredVariables, (val) => {
  pagination.total = val.length
}, { immediate: true })
</script>

<style scoped lang="less">
.variable-selector {
  background: var(--color-bg-2);
}

.selector-header {
  margin-bottom: 16px;
}

.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 12px 16px;
  background: var(--color-fill-1);
  border-radius: 6px;
}

.filter-stats {
  color: var(--color-text-2);
  font-size: 13px;
}

.selected-tags {
  margin-bottom: 16px;
  padding: 12px;
  background: var(--primary-1);
  border-radius: 6px;
}

.selected-tags-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 13px;
  color: var(--color-text-2);
}

.selected-tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.variable-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.name-text {
  font-weight: 500;
}

.variable-code {
  font-size: 12px;
  color: var(--color-text-2);
  padding: 2px 6px;
  background: var(--color-fill-2);
  border-radius: 3px;
}

.selector-topic {
  padding: 20px 0;
}
</style>
