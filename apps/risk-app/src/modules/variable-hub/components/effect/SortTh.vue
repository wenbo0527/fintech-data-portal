<template>
  <!-- 可排序表头：点击切换排序，Shift+点击添加次级排序，当前排序列高亮并显示方向箭头和优先级 -->
  <span class="sort-th" :class="{ on: sortIndex >= 0 }" @click.capture="handleClick">
    <span>{{ label }}</span>
    <span v-if="sortIndex >= 0" class="sort-priority">{{ sortIndex + 1 }}</span>
    <span class="sort-icon">
      <icon-caret-up v-if="active && currentOrder === 'asc'" />
      <icon-caret-down v-else-if="active" />
      <icon-swap v-else />
    </span>
  </span>
</template>

<script setup>
/**
 * 可排序表头（纯展示组件）
 *
 * 组件不做排序，只把点击的字段抛给列表组件，由列表组件转成 params patch。
 * 支持多字段排序：Shift+点击添加次级排序，显示排序优先级序号。
 */
import { computed } from 'vue'
import { IconCaretUp, IconCaretDown, IconSwap } from '@arco-design/web-vue/es/icon'

const props = defineProps({
  /** 排序字段（store SORTABLE 白名单内的 key） */
  field: { type: String, required: true },
  label: { type: String, required: true },
  /** 排序字段列表（逗号分隔） */
  sortBy: { type: String, default: '' },
  /** 排序方向列表（逗号分隔） */
  sortOrder: { type: String, default: 'desc' }
})

const emit = defineEmits(['sort', 'sort-add'])

/** 当前字段在排序列表中的索引，-1 表示未参与排序 */
const sortIndex = computed(() => {
  const fields = props.sortBy.split(',').map((s) => s.trim()).filter(Boolean)
  return fields.indexOf(props.field)
})

/** 当前字段是否处于激活（排序中）状态 */
const active = computed(() => sortIndex.value >= 0)

/** 当前字段的排序方向 */
const currentOrder = computed(() => {
  const orders = props.sortOrder.split(',').map((s) => s.trim())
  return orders[sortIndex.value] || 'desc'
})

/**
 * 处理点击事件
 * - 普通点击：切换当前字段排序方向
 * - Shift+点击：添加/移除次级排序
 */
function handleClick(e) {
  e.stopPropagation()
  if (e.shiftKey) {
    emit('sort-add', props.field)
  } else {
    emit('sort', props.field)
  }
}
</script>

<style scoped>
.sort-th {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  cursor: pointer;
  user-select: none;
}
.sort-th:hover {
  color: rgb(var(--primary-6));
}
.sort-th.on {
  color: rgb(var(--primary-6));
  font-weight: 600;
}
.sort-priority {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  font-size: 10px;
  font-weight: 600;
  background: rgb(var(--primary-6));
  color: #fff;
  border-radius: 50%;
  line-height: 1;
}
.sort-icon {
  display: inline-flex;
  align-items: center;
  font-size: 12px;
  color: var(--color-text-4);
}
.sort-th.on .sort-icon {
  color: rgb(var(--primary-6));
}
</style>
