<template>
  <!-- @prd: classify.matrix -->
  <div class="classify-matrix-page">
    <PageHeader title="数据安全分级矩阵表" :sub-title="`总行制定的分级分类标准定义，共 ${classifyMatrixData.length} 条规范`">
      <template #extra>
        <a-space>
          <a-button @click="openUpload">
            <template #icon><icon-upload /></template>
            批量导入
          </a-button>
          <a-button @click="downloadTemplate">
            <template #icon><icon-download /></template>
            下载模板
          </a-button>
        </a-space>
      </template>
    </PageHeader>

    <!-- 筛选区 -->
    <a-card class="filter-card">
      <a-form layout="inline" :model="filterForm">
        <a-form-item label="一级分类">
          <a-select
            v-model="filterForm.l1"
            placeholder="全部"
            allow-clear
            style="width: 160px"
            @change="applyFilter"
          >
            <a-option v-for="l1 in matrixL1List" :key="l1" :value="l1">{{ l1 }}</a-option>
          </a-select>
        </a-form-item>
        <a-form-item label="安全级别">
          <a-select
            v-model="filterForm.level"
            placeholder="全部"
            allow-clear
            style="width: 140px"
            @change="applyFilter"
          >
            <a-option value="L1">L1 公开</a-option>
            <a-option value="L2">L2 内部</a-option>
            <a-option value="L3">L3 秘密</a-option>
            <a-option value="L4">L4 机密</a-option>
          </a-select>
        </a-form-item>
        <a-form-item label="关键词">
          <a-input
            v-model="filterForm.keyword"
            placeholder="搜索四级分类内容"
            allow-clear
            style="width: 220px"
            @input="onSearchInput"
          />
        </a-form-item>
        <a-form-item>
          <a-button @click="resetFilter">重置</a-button>
        </a-form-item>
      </a-form>

      <!-- 筛选标签栏 -->
      <div v-if="activeFilters.length" class="filter-tags">
        <a-tag v-for="f in activeFilters" :key="f.key" closable @close="removeFilter(f.key)">
          {{ f.label }}
        </a-tag>
      </div>
    </a-card>

    <!-- 矩阵视图 -->
    <a-card class="table-card">
      <a-table
        :data="pagedData"
        :pagination="pagination"
        row-key="id"
        :bordered="false"
        :scroll="{ x: '100%' }"
        @page-change="onPageChange"
        @page-size-change="onPageSizeChange"
        @row-click="openDetail"
      >
        <template #columns>
          <a-table-column title="一级分类" data-index="category_l1" :width="120">
            <template #cell="{ record }">
              <a-tag color="arcoblue">{{ record.category_l1 }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column title="二级定义" data-index="category_l2" :width="140" />
          <a-table-column title="三级定义" data-index="category_l3" :width="140" />
          <a-table-column title="四级分类内容" data-index="category_l4" :width="160" />
          <a-table-column title="安全级别" data-index="sensitivity_level" :width="140">
            <template #cell="{ record }">
              <a-tag :color="SENSITIVITY_COLORS[record.sensitivity_level as SensitivityLevel]">
                {{ record.sensitivity_level }} {{ SENSITIVITY_NAMES[record.sensitivity_level as SensitivityLevel] }}
              </a-tag>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>

    <!-- 详情弹窗 -->
    <a-modal
      v-model:visible="detailVisible"
      :title="detailRecord ? `${detailRecord.category_l4} · 分级详情` : '分级详情'"
      :width="600"
      :footer="false"
      :mask-closable="false"
    >
      <a-descriptions v-if="detailRecord" :column="1" bordered>
        <a-descriptions-item label="一级分类">
          <a-tag color="arcoblue">{{ detailRecord.category_l1 }}</a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="二级定义">{{ detailRecord.category_l2 }}</a-descriptions-item>
        <a-descriptions-item label="三级定义">{{ detailRecord.category_l3 }}</a-descriptions-item>
        <a-descriptions-item label="四级分类内容">{{ detailRecord.category_l4 }}</a-descriptions-item>
        <a-descriptions-item label="安全级别">
          <a-tag :color="SENSITIVITY_COLORS[detailRecord.sensitivity_level]">
            {{ detailRecord.sensitivity_level }} {{ SENSITIVITY_NAMES[detailRecord.sensitivity_level] }}
          </a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="使用该分类的 Mock 字段数">
          <a-statistic :value="detailRecord.usage_count" :value-style="{ color: '#165DFF' }" />
        </a-descriptions-item>
        <a-descriptions-item v-if="detailRecord.description" label="备注">
          {{ detailRecord.description }}
        </a-descriptions-item>
      </a-descriptions>
    </a-modal>

    <!-- 批量导入弹窗 -->
    <ClassifyMatrixUploadModal v-model:visible="uploadVisible" @success="onUploadSuccess" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Message } from '@arco-design/web-vue'
import { IconUpload, IconDownload } from '@arco-design/web-vue/es/icon'
import PageHeader from '@/components-dca/common/PageHeader.vue'
import ClassifyMatrixUploadModal from './classify/components/ClassifyMatrixUploadModal.vue'
import { classifyMatrixData, matrixL1List } from '@/mock-shared/classify-matrix'
import { SENSITIVITY_COLORS, SENSITIVITY_NAMES } from '@/mock-shared/classify-constants'
import type { ClassifyMatrixItem, SensitivityLevel } from '@/mock-shared/classify-types'

// ============ 筛选 ============
const filterForm = ref({ l1: '', level: '', keyword: '' })
const keywordDebounced = ref('')
let keywordTimer: number | undefined
const onSearchInput = () => {
  if (keywordTimer) window.clearTimeout(keywordTimer)
  keywordTimer = window.setTimeout(() => {
    keywordDebounced.value = filterForm.value.keyword.trim()
  }, 300)
}
const applyFilter = () => { /* 触发 computed */ }
const resetFilter = () => { filterForm.value = { l1: '', level: '', keyword: '' }; keywordDebounced.value = '' }

const activeFilters = computed(() => {
  const arr: { key: string; label: string }[] = []
  if (filterForm.value.l1) arr.push({ key: 'l1', label: `一级：${filterForm.value.l1}` })
  if (filterForm.value.level) arr.push({ key: 'level', label: `级别：${filterForm.value.level}` })
  if (filterForm.value.keyword) arr.push({ key: 'keyword', label: `关键词：${filterForm.value.keyword}` })
  return arr
})
const removeFilter = (key: string) => {
  if (key === 'l1') filterForm.value.l1 = ''
  else if (key === 'level') filterForm.value.level = ''
  else if (key === 'keyword') { filterForm.value.keyword = ''; keywordDebounced.value = '' }
}

// ============ 过滤 + 分页 ============
const filteredData = computed(() => {
  return classifyMatrixData.filter(item => {
    if (filterForm.value.l1 && item.category_l1 !== filterForm.value.l1) return false
    if (filterForm.value.level && item.sensitivity_level !== filterForm.value.level) return false
    if (keywordDebounced.value && !item.category_l4.includes(keywordDebounced.value)) return false
    return true
  })
})

const pagination = ref({ current: 1, pageSize: 20, total: 0, showTotal: true, showPageSize: true })
watch(filteredData, (list) => {
  pagination.value.total = list.length
  pagination.value.current = 1
}, { immediate: true })
const pagedData = computed(() => {
  const start = (pagination.value.current - 1) * pagination.value.pageSize
  return filteredData.value.slice(start, start + pagination.value.pageSize)
})
const onPageChange = (current: number) => { pagination.value.current = current }
const onPageSizeChange = (size: number) => { pagination.value.pageSize = size; pagination.value.current = 1 }

// ============ 详情弹窗 ============
const detailVisible = ref(false)
const detailRecord = ref<ClassifyMatrixItem | null>(null)
const openDetail = (record: ClassifyMatrixItem) => {
  detailRecord.value = record
  detailVisible.value = true
}

// ============ Excel 批量导入弹窗 ============
const uploadVisible = ref(false)
const openUpload = () => { uploadVisible.value = true }
const onUploadSuccess = (result: { added: number; updated: number; ignored: number }) => {
  uploadVisible.value = false
  Message.success(`导入完成：新增 ${result.added} 条，更新 ${result.updated} 条，忽略 ${result.ignored} 条`)
}

// ============ 下载导入模板 ============
const downloadTemplate = () => {
  const header = ['一级分类', '二级定义', '三级定义', '四级分类内容', '安全级别']
  const sample = [
    ['客户信息', '个人PII', '联系方式', '手机号', 'L3'],
    ['客户信息', '个人PII', '身份信息', '身份证号', 'L4'],
    ['业务交易', '订单', '支付信息', '支付金额', 'L3']
  ]
  const escape = (s: string) => `"${String(s).replace(/"/g, '""')}"`
  const csv = [header, ...sample].map(row => row.map(escape).join(',')).join('\n')
  // 加 UTF-8 BOM，避免 Excel 打开中文乱码
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = '分级分类矩阵表_导入模板.csv'
  a.click()
  URL.revokeObjectURL(url)
  Message.success('模板已下载')
}
</script>

<style scoped>
.classify-matrix-page { padding: 16px 24px; }
.filter-card { margin-bottom: 16px; }
.filter-tags { margin-top: 12px; display: flex; gap: 8px; flex-wrap: wrap; }
.table-card :deep(.clickable-row) { cursor: pointer; }
.table-card :deep(.clickable-row:hover) { background-color: var(--color-fill-2); }
</style>
