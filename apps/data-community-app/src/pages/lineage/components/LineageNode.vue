<template>
  <div class="lineage-node" :class="nodeClass">
    <div class="node-header">
      <div class="status-indicator" :class="statusClass" :title="statusText"></div>
      <component :is="iconComponent" class="node-icon" :style="{ color: typeColor }" />
      <span class="node-title clickable" :title="nodeData.label" @click.stop="handleNavigate">{{ nodeData.label }}</span>
      <span class="node-type-tag" :style="{ backgroundColor: typeColor }">{{ typeLabel }}</span>
    </div>
    <div class="node-content">
      <div class="content-top">
        <div v-if="nodeData.type === 'main'" class="node-tag main-tag">主节点</div>
        <div v-else-if="nodeData.type === 'upstream'" class="node-tag upstream-tag">上游</div>
        <div v-else-if="nodeData.type === 'downstream'" class="node-tag downstream-tag">下游</div>
      </div>
      
      <div class="node-info">
        <div class="info-row" v-if="nodeData.dbName">
          <span class="label">库名:</span>
          <span class="value">{{ nodeData.dbName }}</span>
        </div>
        <div class="info-row" v-if="nodeData.owner">
          <span class="label">负责人:</span>
          <span class="value">{{ nodeData.owner }}</span>
        </div>
      </div>
    </div>

    <!-- 展开按钮 -->
    <div 
      v-if="showLeftExpand" 
      class="expand-btn left" 
      @click.stop="handleExpand('left')"
      title="展开上游"
    >
      <IconPlus />
    </div>
    <div 
      v-if="showRightExpand" 
      class="expand-btn right" 
      @click.stop="handleExpand('right')"
      title="展开下游"
    >
      <IconPlus />
    </div>
  </div>
</template>

<script setup>
import { computed, inject, onMounted, ref } from 'vue'
import { IconApps, IconStorage, IconPlus, IconCode, IconDashboard, IconFile } from '@arco-design/web-vue/es/icon'

const props = defineProps({
  node: {
    type: Object,
    required: true
  }
})

// 注入 Graph 实例的方法（需要在父组件 provide）
const expandNode = inject('expandNode', () => {})
const navigateToDetail = inject('navigateToDetail', () => {})

// 获取节点数据
const getNodeData = () => {
  return props.node.getData() || {}
}

const nodeData = ref(getNodeData())

// 监听数据变化
onMounted(() => {
  props.node.on('change:data', () => {
    nodeData.value = getNodeData()
  })
})

const nodeClass = computed(() => {
  return {
    'is-main': nodeData.value.type === 'main',
    'is-upstream': nodeData.value.type === 'upstream',
    'is-downstream': nodeData.value.type === 'downstream',
    'is-selected': props.node.isSelected?.()
  }
})

const iconComponent = computed(() => {
  // 根据数据类型返回不同的图标
  const type = nodeData.value.dataType
  switch (type) {
    case 'Table': return IconStorage
    case 'Metric': return IconDashboard
    case 'API': return IconApps
    case 'Variable': return IconCode
    default: return IconFile
  }
})

const typeColor = computed(() => {
  const type = nodeData.value.dataType
  switch (type) {
    case 'Table': return 'var(--subapp-primary)' // 蓝色
    case 'Metric': return 'var(--subapp-success)' // 绿色
    case 'API': return '#FF7D00' // 橙色
    case 'Variable': return '#722ED1' // 紫色
    default: return '#86909C'
  }
})

const typeLabel = computed(() => {
  const type = nodeData.value.dataType
  switch (type) {
    case 'Table': return '数据表'
    case 'Metric': return '指标'
    case 'Variable': return '特征'
    case 'API': return 'API'
    default: return type || '未知'
  }
})

const handleNavigate = () => {
  navigateToDetail(nodeData.value)
}

const statusClass = computed(() => {
  const status = nodeData.value.taskStatus
  return {
    'status-success': status === 'success',
    'status-running': status === 'running',
    'status-failed': status === 'failed'
  }
})

const statusText = computed(() => {
  const status = nodeData.value.taskStatus
  switch (status) {
    case 'success': return '运行成功'
    case 'running': return '运行中'
    case 'failed': return '运行失败'
    default: return '未知状态'
  }
})

// 按钮显示逻辑
const showLeftExpand = computed(() => {
  const { type, upstreamExpanded } = nodeData.value
  // 主节点或上游节点可以展开左侧，且未展开过
  return (type === 'main' || type === 'upstream') && !upstreamExpanded
})

const showRightExpand = computed(() => {
  const { type, downstreamExpanded } = nodeData.value
  // 主节点或下游节点可以展开右侧，且未展开过
  return (type === 'main' || type === 'downstream') && !downstreamExpanded
})

const handleExpand = (direction) => {
  expandNode(props.node.id, direction)
}
</script>

<style scoped>
.lineage-node {
  width: 100%;
  height: 100%;
  background: #fff;
  border-radius: 8px;
  border: 1px solid var(--subapp-border);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  overflow: visible; /* 允许按钮超出 */
  transition: all 0.2s;
  position: relative;
}

.expand-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  background: #fff;
  border: 1px solid var(--subapp-primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--subapp-primary);
  font-size: 12px;
  z-index: 10;
  transition: all 0.2s;
}

.expand-btn:hover {
  background: var(--subapp-primary);
  color: #fff;
  transform: translateY(-50%) scale(1.1);
}

.expand-btn.left {
  left: -10px;
}

.expand-btn.right {
  right: -10px;
}

.lineage-node:hover {
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.lineage-node.is-selected {
  border-color: var(--subapp-primary);
  box-shadow: 0 0 0 2px rgba(22, 93, 255, 0.2);
}

.node-header {
  padding: 8px 12px;
  background: #f7f8fa;
  border-bottom: 1px solid var(--subapp-border);
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-success {
  background-color: var(--subapp-success);
  box-shadow: 0 0 4px var(--subapp-success);
}

.status-running {
  background-color: var(--subapp-primary);
  box-shadow: 0 0 4px var(--subapp-primary);
  animation: pulse 2s infinite;
}

.status-failed {
  background-color: var(--subapp-danger);
  box-shadow: 0 0 4px var(--subapp-danger);
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}

.node-icon {
  font-size: 16px;
  color: var(--subapp-text-tertiary);
}

.node-title {
  font-weight: 600;
  color: var(--subapp-text-primary);
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.node-title.clickable {
  cursor: pointer;
  transition: color 0.2s;
}

.node-title.clickable:hover {
  color: var(--subapp-primary);
  text-decoration: underline;
}

.node-type-tag {
  font-size: 10px;
  color: #fff;
  padding: 1px 4px;
  border-radius: 2px;
  margin-left: auto;
  white-space: nowrap;
}

.node-content {
  flex: 1;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.content-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.node-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  width: fit-content;
}

.main-tag {
  background: #e8f3ff;
  color: var(--subapp-primary);
  border: 1px solid #b7ccff;
}

.upstream-tag {
  background: #fff7e6;
  color: #fa8c16;
  border: 1px solid #ffd591;
}

.downstream-tag {
  background: #e8ffea;
  color: var(--subapp-success);
  border: 1px solid #aff0b5;
}

.node-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: var(--subapp-text-secondary);
}

.info-row {
  display: flex;
  gap: 8px;
}

.label {
  color: var(--subapp-text-tertiary);
  min-width: 40px;
}

.value {
  color: var(--subapp-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Specific styles for node types */
.lineage-node.is-main {
  border-color: var(--subapp-primary);
}

.lineage-node.is-main .node-header {
  background: #e8f3ff;
}

.lineage-node.is-main .node-icon {
  color: var(--subapp-primary);
}
</style>
