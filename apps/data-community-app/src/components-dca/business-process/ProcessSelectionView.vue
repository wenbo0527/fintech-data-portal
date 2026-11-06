<template>
  <div class="process-selection-view">
    <!-- 头部操作区 -->
    <div class="selection-header">
      <div class="header-title">
        <h4>业务流程列表</h4>
        <p class="header-desc">选择要编辑的业务流程，或创建新的流程</p>
      </div>
      <div class="header-actions">
        <a-button type="primary" @click="handleCreateProcess">
          <template #icon><IconPlus /></template>
          新增流程
        </a-button>
      </div>
    </div>

    <!-- 搜索和筛选 -->
    <div class="selection-filters">
      <a-input-search
        v-model="searchKeyword"
        placeholder="搜索流程名称或描述"
        style="width: 300px"
        @search="handleSearch"
      />
      <a-select
        v-model="selectedBusinessType"
        placeholder="业务类型"
        style="width: 150px"
        allow-clear
        @change="handleFilter"
      >
        <a-option value="core-business">自营业务</a-option>
        <a-option value="marketing">营销触达</a-option>
        <a-option value="benefits">权益使用</a-option>
        <a-option value="risk-control">风险管控</a-option>
        <a-option value="customer-service">客户服务</a-option>
      </a-select>
    </div>

    <!-- 流程列表 -->
    <div class="process-list">
      <div v-if="loading" class="loading-container">
        <a-spin :size="1" tip="加载中..." />
      </div>
      
      <div v-else-if="filteredProcesses.length === 0" class="empty-container">
        <a-empty description="暂无业务流程">
          <a-button type="primary" @click="handleCreateProcess">
            创建第一个流程
          </a-button>
        </a-empty>
      </div>
      
      <div v-else class="process-grid">
        <div
          v-for="process in filteredProcesses"
          :key="process.id"
          class="process-card"
          @click="handleEditProcess(process)"
        >
          <div class="card-header">
            <div class="process-info">
              <h5 class="process-name">{{ process.name }}</h5>
              <p class="process-desc">{{ process.description || '暂无描述' }}</p>
            </div>
            <div class="process-actions" @click.stop>
              <a-dropdown>
                <a-button type="text" size="small">
                  <template #icon><IconMore /></template>
                </a-button>
                <template #content>
                  <a-doption @click="handleEditProcess(process)">
                    <template #icon><IconEdit /></template>
                    编辑
                  </a-doption>
                  <a-doption @click="handleDuplicateProcess(process)">
                    <template #icon><IconCopy /></template>
                    复制
                  </a-doption>
                  <a-doption @click="handleDeleteProcess(process.id)" class="danger">
                    <template #icon><IconDelete /></template>
                    删除
                  </a-doption>
                </template>
              </a-dropdown>
            </div>
          </div>
          
          <div class="card-content">
            <div class="process-stats">
              <span class="stat-item">
                <IconLayers />
                {{ process.steps?.length || 0 }} 个步骤
              </span>
              <span class="stat-item">
                <IconCalendar />
                {{ formatDate(process.updatedAt) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Message } from '@arco-design/web-vue'
import {
  IconPlus,
  IconSearch,
  IconMore,
  IconEdit,
  IconCopy,
  IconDelete,
  IconLayers,
  IconCalendar
} from '@arco-design/web-vue/es/icon'

// 组件事件
interface Emits {
  (e: 'create-process'): void
  (e: 'edit-process', process: any): void
  (e: 'delete-process', processId: string): void
}

const emit = defineEmits<Emits>()

// 响应式数据
const loading = ref(false)
const searchKeyword = ref('')
const selectedBusinessType = ref('')
const processes = ref<any[]>([])

// 模拟数据
const mockProcesses = [
  {
    id: '1',
    name: '自营业务核心流程',
    description: '涵盖用户注册、身份认证、产品申请、风险评估、审批决策等核心业务环节的完整流程',
    businessType: 'core-business',
    productType: 'business-core',
    steps: [
      { id: '1-1', name: '用户注册' },
      { id: '1-2', name: '身份认证' },
      { id: '1-3', name: '产品申请' },
      { id: '1-4', name: '风险评估' },
      { id: '1-5', name: '审批决策' },
      { id: '1-6', name: '业务开通' }
    ],
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-25T15:30:00Z'
  },
  {
    id: '2',
    name: '营销触达流程',
    description: '基于用户画像分析，制定营销策略，选择合适渠道进行内容推送，并跟踪营销效果的完整流程',
    businessType: 'marketing',
    productType: 'marketing-platform',
    steps: [
      { id: '2-1', name: '用户画像分析' },
      { id: '2-2', name: '营销策略制定' },
      { id: '2-3', name: '渠道选择' },
      { id: '2-4', name: '内容推送' },
      { id: '2-5', name: '效果跟踪' },
      { id: '2-6', name: '策略优化' }
    ],
    createdAt: '2024-01-18T09:00:00Z',
    updatedAt: '2024-01-26T11:20:00Z'
  },
  {
    id: '3',
    name: '权益使用流程',
    description: '管理权益发放、使用验证、消费记录、结算处理和数据统计的完整权益管理流程',
    businessType: 'benefits',
    productType: 'benefits-system',
    steps: [
      { id: '3-1', name: '权益发放' },
      { id: '3-2', name: '使用验证' },
      { id: '3-3', name: '消费记录' },
      { id: '3-4', name: '结算处理' },
      { id: '3-5', name: '数据统计' }
    ],
    createdAt: '2024-01-20T14:00:00Z',
    updatedAt: '2024-01-27T16:45:00Z'
  },
  {
    id: '4',
    name: '风险管控流程',
    description: '实时风险识别、评估、预警处理、风险处置和监控反馈的全方位风险管控体系',
    businessType: 'risk-control',
    productType: 'risk-system',
    steps: [
      { id: '4-1', name: '风险识别' },
      { id: '4-2', name: '风险评估' },
      { id: '4-3', name: '预警处理' },
      { id: '4-4', name: '风险处置' },
      { id: '4-5', name: '监控反馈' }
    ],
    createdAt: '2024-01-22T08:30:00Z',
    updatedAt: '2024-01-28T10:15:00Z'
  },
  {
    id: '5',
    name: '客户服务流程',
    description: '从问题接收、分类处理、解决跟踪到满意度调研的完整客户服务管理流程',
    businessType: 'customer-service',
    productType: 'service-platform',
    steps: [
      { id: '5-1', name: '问题接收' },
      { id: '5-2', name: '问题分类' },
      { id: '5-3', name: '处理分配' },
      { id: '5-4', name: '解决跟踪' },
      { id: '5-5', name: '满意度调研' }
    ],
    createdAt: '2024-01-24T13:20:00Z',
    updatedAt: '2024-01-29T14:30:00Z'
  }
]

// 计算属性
const filteredProcesses = computed(() => {
  let result = processes.value
  
  // 按关键词搜索
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    result = result.filter(process => 
      process.name.toLowerCase().includes(keyword) ||
      (process.description && process.description.toLowerCase().includes(keyword))
    )
  }
  
  // 按业务类型筛选
  if (selectedBusinessType.value) {
    result = result.filter(process => process.businessType === selectedBusinessType.value)
  }
  
  return result
})

// 方法
const loadProcesses = async () => {
  try {
    loading.value = true
    // 模拟 API 调用
    await new Promise(resolve => setTimeout(resolve, 500))
    processes.value = mockProcesses
  } catch (error) {

    Message.error('加载失败，请重试')
  } finally {
    loading.value = false
  }
}

const handleCreateProcess = () => {
  emit('create-process')
}

const handleEditProcess = (process: any) => {
  emit('edit-process', process)
}

const handleDeleteProcess = (processId: string) => {
  emit('delete-process', processId)
}

const handleDuplicateProcess = (process: any) => {
  try {
    const duplicatedProcess = {
      ...process,
      id: `${process.id}-copy-${Date.now()}`,
      name: `${process.name} - 副本`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    processes.value.push(duplicatedProcess)
    Message.success('流程复制成功')
  } catch (error) {

    Message.error('复制失败，请重试')
  }
}

const handleSearch = () => {
  // 搜索逻辑已在计算属性中处理
}

const handleFilter = () => {
  // 筛选逻辑已在计算属性中处理
}

// 工具方法
const getBusinessTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    'core-business': 'blue',
    'marketing': 'green',
    'benefits': 'orange',
    'risk-control': 'red',
    'customer-service': 'purple'
  }
  return colors[type] || 'gray'
}

const getBusinessTypeName = (type: string) => {
  const names: Record<string, string> = {
    'core-business': '自营业务',
    'marketing': '营销触达',
    'benefits': '权益使用',
    'risk-control': '风险管控',
    'customer-service': '客户服务'
  }
  return names[type] || type
}

const getProductTypeName = (type: string) => {
  const names: Record<string, string> = {
    'business-core': '核心业务系统',
    'marketing-platform': '营销平台',
    'benefits-system': '权益系统',
    'risk-system': '风控系统',
    'service-platform': '服务平台'
  }
  return names[type] || type
}

const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  } catch {
    return '未知时间'
  }
}

// 生命周期
onMounted(() => {
  loadProcesses()
})
</script>

<style scoped>
.process-selection-view {
  /* 调整padding以匹配抽屉编辑区域的布局 */
  padding: 24px;
  height: 100%;
  display: flex;
  flex-direction: column;
  /* 设置容器宽度以匹配编辑阶段的有效内容宽度 */
  /* 编辑阶段：1000px总宽 - 200px导航 - 48px编辑区padding = 752px有效宽度 */
  /* 选择阶段：为了视觉一致，使用相同的有效内容宽度 */
  width: 100%;
  max-width: none;
  box-sizing: border-box;
}

.selection-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  /* 确保头部内容在容器内正确对齐 */
  width: 100%;
}

.header-title h4 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-1);
}

.header-desc {
  margin: 0;
  color: var(--color-text-3);
  font-size: 14px;
}

.selection-filters {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
}

.process-list {
  flex: 1;
  overflow: auto;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  gap: 16px;
}

.empty-container {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 300px;
}

.process-grid {
  display: grid;
  /* 修改为单列布局，1行1个流程 */
  grid-template-columns: 1fr;
  gap: 16px;
  /* 确保网格在容器宽度下有良好的适配 */
  max-width: 100%;
}

.process-card {
  border: 1px solid var(--color-border-2);
  border-radius: 8px;
  padding: 16px;
  background: var(--color-bg-2);
  cursor: pointer;
  transition: all 0.2s ease;
}

.process-card:hover {
  border-color: var(--color-primary-light-4);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.process-info {
  flex: 1;
  min-width: 0;
}

.process-name {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.process-desc {
  margin: 0;
  font-size: 14px;
  color: var(--color-text-3);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.process-actions {
  margin-left: 8px;
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}



.process-stats {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: var(--color-text-4);
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.stat-item svg {
  width: 14px;
  height: 14px;
}

:deep(.arco-dropdown-option.danger) {
  color: var(--color-danger-6);
}

:deep(.arco-dropdown-option.danger:hover) {
  background-color: var(--color-danger-light-1);
}

/* 响应式媒体查询 - 保持单列布局 */
@media (max-width: 600px) {
  .process-grid {
    grid-template-columns: 1fr;
  }
}

@media (min-width: 601px) and (max-width: 900px) {
  .process-grid {
    grid-template-columns: 1fr;
  }
}
</style>