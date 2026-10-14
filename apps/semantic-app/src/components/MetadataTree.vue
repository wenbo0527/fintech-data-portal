<template>
  <div class="metadata-tree">
    <div class="tree-header">
      <a-input
        v-model="searchKeyword"
        placeholder="搜索指标/表名"
        allow-clear
        size="small"
      >
        <template #prefix><icon-search /></template>
      </a-input>
    </div>
    <div class="tree-body">
      <a-tree
        :data="filteredTreeData"
        :field-names="{ title: 'title', key: 'key', children: 'children' }"
        :default-expand-all="expandedKeys.length === 0"
        :expanded-keys="expandedKeys.length ? expandedKeys : undefined"
        @select="onSelect"
        block-node
      >
        <template #title="node">
          <span class="tree-node">
            <component :is="getNodeIcon(node.nodeType)" class="node-icon" />
            <span class="node-title">{{ node.title }}</span>
            <span
              v-if="node.role"
              :class="['semantic-tag', `semantic-tag--${node.role}`]"
            >
              {{ roleLabel(node.role) }}
            </span>
          </span>
        </template>
      </a-tree>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { MappingTreeNode } from '@/types/metadataMap'

const props = defineProps<{
  treeData: MappingTreeNode[]
}>()

const emit = defineEmits<{
  select: [node: MappingTreeNode]
}>()

const searchKeyword = ref('')
const expandedKeys = ref<string[]>([])

const filteredTreeData = computed(() => {
  if (!searchKeyword.value) return props.treeData
  const kw = searchKeyword.value.toLowerCase()
  return filterTree(props.treeData, kw)
})

function filterTree(nodes: MappingTreeNode[], kw: string): MappingTreeNode[] {
  const result: MappingTreeNode[] = []
  for (const node of nodes) {
    const titleMatch = node.title.toLowerCase().includes(kw)
    const childrenMatch = node.children ? filterTree(node.children, kw) : []
    if (titleMatch || childrenMatch.length > 0) {
      result.push({ ...node, children: childrenMatch.length > 0 ? childrenMatch : node.children })
    }
  }
  return result
}

function onSelect(selectedKeys: string[], { node }: { node: MappingTreeNode }) {
  if (node) {
    emit('select', node)
  }
}

function getNodeIcon(nodeType: string) {
  const iconMap: Record<string, string> = {
    metric: 'icon-bookmark',
    table: 'icon-link',
    field: 'icon-storage'
  }
  return iconMap[nodeType] || 'icon-file'
}

function roleLabel(role: string): string {
  const labels: Record<string, string> = {
    numerator: '分子',
    denominator: '分母',
    dimension: '维度'
  }
  return labels[role] || role
}
</script>

<style scoped lang="scss">
.metadata-tree {
  height: 100%;
  display: flex;
  flex-direction: column;

  .tree-header {
    padding: 8px 0;
  }

  .tree-body {
    flex: 1;
    overflow-y: auto;
    padding: 4px 0;
  }
}

.tree-node {
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
}

:deep(.arco-tree-node-title) {
  color: var(--color-text) !important;
}

:deep(.arco-tree-node:hover) {
  background: var(--color-bg) !important;
}

:deep(.arco-tree-node-selected) {
  background: #e8f3ff !important;
}
</style>
