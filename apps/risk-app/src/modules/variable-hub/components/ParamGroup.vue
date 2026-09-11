<template>
  <div class="param-group" :class="`param-group--${layout}`">
    <div v-if="title" class="param-group-title">{{ title }}</div>

    <!-- inline：参考「参数详情」样例，标签右对齐 + 值左对齐，无边框网格 -->
    <div
      v-if="layout === 'inline'"
      class="param-inline-grid"
      :style="{
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        columnGap: gap + 'px',
        rowGap: rowGap + 'px',
        '--param-label-width': labelWidth
      }"
    >
      <div
        v-for="(item, idx) in items"
        :key="item.key || idx"
        class="param-inline-item"
        :class="{ 'param-inline-item--wide': item.nowrap }"
        :style="{ gridColumn: item.span ? `span ${Math.min(item.span, columns)}` : undefined }"
      >
        <span class="param-inline-label">{{ item.label }}</span>
        <span class="param-inline-value">
          <slot :name="item.key || `item-${idx}`" :item="item">
            <span v-if="item.value === '' || item.value == null" class="param-inline-empty">—</span>
            <span v-else :class="{ 'param-inline-mono': item.mono }">{{ item.value }}</span>
          </slot>
        </span>
      </div>
    </div>

    <!-- stacked：标签在上、值在下（原有瀑布流布局） -->
    <div v-else class="param-group-grid" :style="{ columnCount: columns, columnGap: gap + 'px' }">
      <div v-for="(item, idx) in items" :key="idx" class="param-group-item">
        <div class="param-label">{{ item.label }}</div>
        <div class="param-value">
          <slot :name="`item-${idx}`" :item="item">
            {{ item.value }}
          </slot>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  /** 分组标题 */
  title: {
    type: String,
    default: ''
  },
  /**
   * 字段列表：[{ key, label, value, span, mono, nowrap }]
   * span：值占据的列数；nowrap：标签过长，标签列按内容撑开不折行
   */
  items: {
    type: Array,
    default: () => []
  },
  /** 列数 */
  columns: {
    type: Number,
    default: 3
  },
  /** 列间距 */
  gap: {
    type: Number,
    default: 32
  },
  /** 行间距（仅 inline 布局使用） */
  rowGap: {
    type: Number,
    default: 14
  },
  /** 布局：stacked（标签在上）| inline（标签右对齐 + 值左对齐，无边框） */
  layout: {
    type: String,
    default: 'stacked'
  },
  /** inline 布局下标签列宽度（保证同列的值左对齐） */
  labelWidth: {
    type: String,
    default: '7em'
  }
})
</script>

<style scoped>
.param-group {
  margin-bottom: 4px;
}

.param-group:not(:last-child) {
  margin-bottom: 20px;
}

.param-group-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-1, #1d2129);
  margin-bottom: 14px;
}

.param-group--stacked .param-group-title {
  font-size: 13px;
  padding-left: 8px;
  border-left: 3px solid #165dff;
}

.param-group-grid {
  width: 100%;
  break-inside: avoid;
}

.param-group-item {
  margin-bottom: 14px;
  break-inside: avoid;
  page-break-inside: avoid;
}

.param-label {
  font-size: 12px;
  color: #86909c;
  margin-bottom: 4px;
  line-height: 1.5;
}

.param-value {
  font-size: 14px;
  font-weight: 500;
  color: #1d2129;
  line-height: 1.5;
  word-break: break-all;
}

/* ====== inline：样例图的 label / value 网格 ====== */
.param-inline-grid {
  display: grid;
  width: 100%;
}

.param-inline-item {
  display: grid;
  grid-template-columns: var(--param-label-width) minmax(0, 1fr);
  align-items: baseline;
  column-gap: 8px;
  min-width: 0;
}

.param-inline-label {
  text-align: right;
  font-size: 13px;
  color: var(--color-text-3, #86909c);
  line-height: 1.6;
  word-break: break-word;
}

/* 长标签项：标签列按内容撑开，避免折行 */
.param-inline-item--wide {
  grid-template-columns: max-content minmax(0, 1fr);
}

.param-inline-item--wide .param-inline-label {
  white-space: nowrap;
}

.param-inline-value {
  font-size: 13px;
  color: var(--color-text-1, #1d2129);
  line-height: 1.6;
  word-break: break-all;
  min-width: 0;
}

.param-inline-empty {
  color: var(--color-text-4, #c9cdd4);
}

.param-inline-mono {
  font-family: 'JetBrains Mono', 'Menlo', 'Consolas', monospace;
  font-size: 12.5px;
}

@media (max-width: 1200px) {
  .param-inline-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }
}

@media (max-width: 768px) {
  .param-inline-grid {
    grid-template-columns: minmax(0, 1fr) !important;
  }

  .param-inline-item {
    grid-column: auto !important;
  }
}
</style>
