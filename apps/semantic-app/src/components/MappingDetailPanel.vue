<template>
  <div class="mapping-detail-panel">
    <template v-if="selectedNode">
      <!-- 指标级别 -->
      <div v-if="selectedNode.nodeType === 'metric'" class="detail-section">
        <div class="detail-header">
          <icon-bookmark class="header-icon" />
          <span class="header-title">指标：{{ selectedNode.title }}</span>
        </div>
        <div class="detail-body">
          <div v-for="(value, key) in selectedNode.data" :key="key" class="detail-row">
            <span class="detail-label">{{ fieldLabel(key as string) }}：</span>
            <span class="detail-value">{{ value }}</span>
          </div>
          <div v-if="selectedNode.children?.length" class="detail-sub">
            <div class="sub-title">涉及数据表（{{ selectedNode.children.length }}）</div>
            <div v-for="child in selectedNode.children" :key="child.key" class="sub-item">
              <icon-link class="sub-icon" />
              <span>{{ child.title }}</span>
              <span v-if="child.role" :class="['semantic-tag', `semantic-tag--${child.role}`]">
                {{ roleLabel(child.role) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 表级别 -->
      <div v-else-if="selectedNode.nodeType === 'table'" class="detail-section">
        <div class="detail-header">
          <icon-link class="header-icon" />
          <span class="header-title">数据表：{{ selectedNode.title }}</span>
          <span v-if="selectedNode.role" :class="['semantic-tag', `semantic-tag--${selectedNode.role}`]">
            {{ roleLabel(selectedNode.role) }}
          </span>
        </div>
        <div class="detail-body">
          <div v-for="(value, key) in selectedNode.data" :key="key" class="detail-row">
            <span class="detail-label">{{ fieldLabel(key as string) }}：</span>
            <span class="detail-value">{{ value }}</span>
          </div>
          <div v-if="selectedNode.children?.length" class="detail-sub">
            <div class="sub-title">字段列表（{{ selectedNode.children.length }}）</div>
            <a-table
              :data="fieldTableData"
              :pagination="false"
              size="small"
              :columns="fieldColumns"
            />
          </div>
          <div class="detail-actions">
            <a-button type="outline" size="small" @click="$emit('edit', selectedNode)">
              <template #icon><icon-edit /></template>
              编辑映射
            </a-button>
          </div>
        </div>
      </div>

      <!-- 字段级别 -->
      <div v-else-if="selectedNode.nodeType === 'field'" class="detail-section">
        <div class="detail-header">
          <icon-storage class="header-icon" />
          <span class="header-title">字段：{{ selectedNode.title }}</span>
        </div>
        <div class="detail-body">
          <div v-for="(value, key) in selectedNode.data" :key="key" class="detail-row">
            <span class="detail-label">{{ fieldLabel(key as string) }}：</span>
            <span class="detail-value">{{ value }}</span>
          </div>
          <div class="detail-actions">
            <a-button type="outline" size="small" @click="$emit('edit', selectedNode)">
              <template #icon><icon-edit /></template>
              编辑映射
            </a-button>
          </div>
        </div>
      </div>
    </template>

    <!-- 空状态 -->
    <div v-else class="empty-state">
      <icon-empty class="empty-icon" />
      <p>点击左侧树节点查看映射详情</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { MappingTreeNode } from '@/types/metadataMap'

const props = defineProps<{
  selectedNode: MappingTreeNode | null
}>()

defineEmits<{
  edit: [node: MappingTreeNode]
}>()

const fieldColumns = [
  { title: '字段名', dataIndex: 'fieldName', key: 'fieldName' },
  { title: '中文名', dataIndex: 'fieldCnName', key: 'fieldCnName' },
  { title: '类型', dataIndex: 'dataType', key: 'dataType' },
  { title: '用途', dataIndex: 'usedInFormula', key: 'usedInFormula' }
]

const fieldTableData = computed(() => {
  if (!props.selectedNode?.children) return []
  return props.selectedNode.children.map(child => {
    const d = child.data || {}
    return {
      key: child.key,
      fieldName: d.fieldName || '',
      fieldCnName: d.fieldCnName || '',
      dataType: d.dataType || '',
      usedInFormula: d.usedInFormula || ''
    }
  })
})

function fieldLabel(key: string): string {
  const labels: Record<string, string> = {
    metricId: '指标ID',
    metricName: '指标名称',
    metricCode: '指标编码',
    maintainedBy: '维护团队',
    definitionCount: '口径数量',
    tableId: '表ID',
    tableName: '表名',
    tableCnName: '中文名',
    role: '角色',
    fieldId: '字段ID',
    fieldName: '字段名',
    fieldCnName: '中文名',
    dataType: '数据类型',
    description: '描述',
    usedInFormula: '公式用途'
  }
  return labels[key] || key
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
.mapping-detail-panel {
  padding: 16px;
  height: 100%;
  overflow-y: auto;
}

.detail-section {
  .detail-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--color-border);
    margin-bottom: 12px;

    .header-icon {
      font-size: 20px;
      color: var(--color-accent);
    }

    .header-title {
      font-size: 16px;
      font-weight: 600;
      color: var(--color-text);
    }
  }

  .detail-body {
    .detail-row {
      display: flex;
      padding: 6px 0;
      font-size: 13px;

      .detail-label {
        width: 100px;
        color: var(--color-text-secondary);
        flex-shrink: 0;
      }

      .detail-value {
        color: var(--color-text);
        flex: 1;
      }
    }
  }

  .detail-sub {
    margin-top: 16px;
    padding-top: 12px;
    border-top: 1px solid var(--color-border);

    .sub-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--color-text);
      margin-bottom: 8px;
    }

    .sub-item {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 0;
      font-size: 13px;
      color: var(--color-text-secondary);

      .sub-icon {
        font-size: 14px;
        color: var(--color-text-secondary);
      }
    }
  }

  .detail-actions {
    margin-top: 16px;
    padding-top: 12px;
    border-top: 1px solid var(--color-border);
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--color-text-secondary);

  .empty-icon {
    font-size: 48px;
    margin-bottom: 12px;
    opacity: 0.3;
  }

  p {
    font-size: 13px;
  }
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
</style>
