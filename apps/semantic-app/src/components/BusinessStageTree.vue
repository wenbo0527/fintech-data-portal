<template>
  <div class="business-stage-tree">
    <div class="tree-hint">
      <icon-info-circle class="hint-icon" />
      <span>阶段 → 部门语境（市场/风险/运营/公共）→ 指标</span>
    </div>
    <a-tree
      :data="treeData"
      :field-names="{ title: 'title', key: 'key', children: 'children' }"
      :default-expand-all="true"
      @select="onSelect"
      block-node
    >
      <template #title="node">
        <span class="stage-node">
          <component :is="getNodeIcon(node.nodeType)" class="node-icon" />
          <a-tag
            v-if="node.nodeType === 'context'"
            size="small"
            :color="departmentColorMap[node.department]"
          >
            {{ departmentLabelMap[node.department] }}
          </a-tag>
          <span class="node-title" :class="{ 'context-title': node.nodeType === 'context' }">{{ node.title }}</span>
          <a-link
            v-if="node.nodeType === 'metric'"
            class="view-link"
            :hoverable="false"
            @click.stop="$emit('viewMetric', node.metricId)"
          >
            查看定义
          </a-link>
        </span>
      </template>
    </a-tree>
  </div>
</template>

<script setup lang="ts">
import type { StageTreeNode } from '@/types/knowledge'
import { departmentLabelMap, departmentColorMap } from '@/types/knowledge'

defineProps<{
  treeData: StageTreeNode[]
}>()

const emit = defineEmits<{
  select: [node: StageTreeNode]
  viewMetric: [metricId: string | undefined]
}>()

function onSelect(_selectedKeys: string[], { node }: { node: StageTreeNode }) {
  emit('select', node)
}

function getNodeIcon(nodeType: string) {
  const iconMap: Record<string, string> = {
    stage: 'icon-folder',
    context: 'icon-user-group',
    metric: 'icon-bookmark'
  }
  return iconMap[nodeType] || 'icon-file'
}
</script>

<style scoped lang="scss">
.business-stage-tree {
  .tree-hint {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    background: #e8f3ff;
    border-radius: 4px;
    margin-bottom: 8px;
    font-size: 12px;
    color: var(--color-text-secondary);

    .hint-icon {
      font-size: 14px;
      color: var(--color-warning);
    }
  }
}

.stage-node {
  display: flex;
  align-items: center;
  gap: 6px;

  .node-icon {
    font-size: 14px;
    color: var(--color-text-secondary);
  }

  .node-title {
    flex: 1;
    font-size: 13px;
  }

  .context-title {
    color: var(--color-text-secondary);
  }

  .view-link {
    font-size: 12px;
    color: var(--color-accent) !important;
  }
}

:deep(.arco-tree-node-title) {
  color: var(--color-text) !important;
}

:deep(.arco-tree-node:hover) {
  background: var(--color-bg) !important;
}
</style>
