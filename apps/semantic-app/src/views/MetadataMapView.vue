<template>
  <div class="metadata-map-view">
    <div class="page-header">
      <h2 class="semantic-page-title">元数据映射维护</h2>
      <span class="page-subtitle">指标 → 数据表 → 字段 层级映射管理</span>
    </div>
    <div class="page-body">
      <a-row :gutter="16" class="content-row">
        <a-col :span="9">
          <div class="semantic-card tree-panel">
            <MetadataTree :tree-data="store.tree" @select="onSelectNode" />
          </div>
        </a-col>
        <a-col :span="15">
          <div class="semantic-card detail-panel">
            <MappingDetailPanel :selected-node="selectedNode" @edit="onEditMapping" />
          </div>
        </a-col>
      </a-row>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useMetadataMapStore } from '@/stores/metadataMap'
import MetadataTree from '@/components/MetadataTree.vue'
import MappingDetailPanel from '@/components/MappingDetailPanel.vue'
import type { MappingTreeNode } from '@/types/metadataMap'

const store = useMetadataMapStore()
const selectedNode = ref<MappingTreeNode | null>(null)

onMounted(async () => {
  await store.fetchTree()
  if (store.tree.length > 0) {
    selectedNode.value = store.tree[0]
  }
})

function onSelectNode(node: MappingTreeNode) {
  selectedNode.value = node
}

function onEditMapping(_node: MappingTreeNode) {
  // Demo中编辑映射仅展示提示
}
</script>

<style scoped lang="scss">
.metadata-map-view {
  padding: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.page-header {
  margin-bottom: 16px;

  .page-subtitle {
    font-size: 13px;
    color: var(--color-text-secondary);
  }
}

.page-body {
  flex: 1;
  overflow: hidden;
}

.content-row {
  height: 100%;
}

.tree-panel {
  height: calc(100vh - 160px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.detail-panel {
  height: calc(100vh - 160px);
  overflow: hidden;
}
</style>
