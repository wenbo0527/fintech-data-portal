<template>
  <div class="term-dict-table">
    <div class="table-toolbar">
      <a-button type="primary" size="small" @click="$emit('add')">
        <template #icon><icon-plus /></template>
        新增术语
      </a-button>
      <a-input
        v-model="searchKeyword"
        placeholder="搜索术语"
        allow-clear
        size="small"
        style="width: 200px; margin-left: 12px"
      >
        <template #prefix><icon-search /></template>
      </a-input>
      <a-select
        v-model="filterCategory"
        placeholder="分类筛选"
        size="small"
        style="width: 140px; margin-left: 12px"
        allow-clear
      >
        <a-option value="逾期分级">逾期分级</a-option>
        <a-option value="风控术语">风控术语</a-option>
        <a-option value="业务术语">业务术语</a-option>
      </a-select>
    </div>

    <a-table
      :data="filteredTerms"
      :pagination="{ pageSize: 10, showTotal: true, showJumper: true }"
      :columns="columns"
      row-key="termId"
      size="small"
    >
      <template #category="{ record }">
        <a-tag :color="categoryColor(record.category)" size="small">
          {{ record.category }}
        </a-tag>
      </template>
      <template #relatedMetric="{ record }">
        <span v-if="record.relatedMetric" class="related-metric">{{ record.relatedMetric }}</span>
        <span v-else class="text-muted">—</span>
      </template>
      <template #operations="{ record }">
        <a-button type="text" size="mini" @click="$emit('edit', record)">
          <template #icon><icon-edit /></template>
          编辑
        </a-button>
        <a-popconfirm content="确定删除该术语？" @ok="$emit('delete', record.termId)">
          <a-button type="text" size="mini" status="danger">
            <template #icon><icon-delete /></template>
            删除
          </a-button>
        </a-popconfirm>
      </template>
    </a-table>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Term } from '@/types/knowledge'

const props = defineProps<{
  terms: Term[]
}>()

defineEmits<{
  add: []
  edit: [term: Term]
  delete: [id: string]
}>()

const searchKeyword = ref('')
const filterCategory = ref<string | undefined>(undefined)

const columns = [
  { title: '术语', dataIndex: 'termName', key: 'termName', width: 100 },
  { title: '定义', dataIndex: 'definition', key: 'definition', ellipsis: true },
  { title: '分类', slotName: 'category', key: 'category', width: 100 },
  { title: '关联指标', slotName: 'relatedMetric', key: 'relatedMetric', width: 120 },
  { title: '操作', slotName: 'operations', key: 'operations', width: 140 }
]

const filteredTerms = computed(() => {
  let result = [...props.terms]
  if (searchKeyword.value) {
    const kw = searchKeyword.value.toLowerCase()
    result = result.filter(t =>
      t.termName.toLowerCase().includes(kw) ||
      t.definition.toLowerCase().includes(kw)
    )
  }
  if (filterCategory.value) {
    result = result.filter(t => t.category === filterCategory.value)
  }
  return result
})

function categoryColor(category: string): string {
  const colorMap: Record<string, string> = {
    '逾期分级': 'red',
    '风控术语': 'orange',
    '业务术语': 'green'
  }
  return colorMap[category] || 'gray'
}
</script>

<style scoped lang="scss">
.term-dict-table {
  .table-toolbar {
    display: flex;
    align-items: center;
    margin-bottom: 12px;
  }
}

.related-metric {
  font-size: 12px;
  color: var(--color-accent);
  font-family: monospace;
}

.text-muted {
  color: var(--color-text-secondary);
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
