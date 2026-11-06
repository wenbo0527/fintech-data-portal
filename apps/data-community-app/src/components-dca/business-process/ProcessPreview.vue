<template>
  <div class="process-preview">
    <!-- 基本信息预览 -->
    <div class="preview-section">
      <div class="section-header">
        <IconInfoCircle class="section-icon" />
        <h3 class="section-title">基本信息</h3>
      </div>
      <div class="section-content">
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">流程名称：</span>
            <span class="info-value">{{ basicInfo.name || '未设置' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">业务类型：</span>
            <span class="info-value">{{ getBusinessTypeLabel(basicInfo.businessType) }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">产品类型：</span>
            <span class="info-value">{{ getProductTypeLabel(basicInfo.productType) }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">优先级：</span>
            <a-tag :color="getPriorityColor(basicInfo.priority)">
              {{ getPriorityLabel(basicInfo.priority) }}
            </a-tag>
          </div>
          <div class="info-item full-width">
            <span class="info-label">描述：</span>
            <span class="info-value">{{ basicInfo.description || '无描述' }}</span>
          </div>
          <div v-if="basicInfo.tags && basicInfo.tags.length > 0" class="info-item full-width">
            <span class="info-label">标签：</span>
            <div class="tags-container">
              <a-tag v-for="tag in basicInfo.tags" :key="tag" size="small">
                {{ tag }}
              </a-tag>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 流程步骤预览 -->
    <div class="preview-section">
      <div class="section-header">
        <IconList class="section-icon" />
        <h3 class="section-title">流程步骤</h3>
        <div class="section-summary">
          共 {{ processData.steps?.length || 0 }} 个步骤
        </div>
      </div>
      <div class="section-content">
        <div v-if="!processData.steps || processData.steps.length === 0" class="empty-state">
          <IconEmpty class="empty-icon" />
          <p class="empty-text">暂无步骤配置</p>
        </div>
        <div v-else class="steps-container">
          <div
            v-for="(step, index) in processData.steps"
            :key="step.id"
            class="step-card"
          >
            <div class="step-header">
              <div class="step-number">{{ index + 1 }}</div>
              <div class="step-info">
                <h4 class="step-name">{{ step.name || `步骤 ${index + 1}` }}</h4>
                <p v-if="step.description" class="step-description">
                  {{ step.description }}
                </p>
              </div>
            </div>
            
            <div class="step-content">
              <!-- 关联数据统计 -->
              <div class="step-stats">
                <div class="stat-row">
                  <div class="stat-item-inline">
                    <IconStorage class="stat-icon" />
                    <span class="stat-label">关联数据表：</span>
                    <span class="stat-value">{{ step.tables?.length || 0 }} 个</span>
                  </div>
                  <div class="stat-item-inline">
                    <IconBarChart class="stat-icon" />
                    <span class="stat-label">关联指标：</span>
                    <span class="stat-value">{{ step.metrics?.length || 0 }} 个</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 统计信息 -->
    <div class="preview-section">
      <div class="section-header">
        <IconBarChart class="section-icon" />
        <h3 class="section-title">统计信息</h3>
      </div>
      <div class="section-content">
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-value">{{ processData.steps?.length || 0 }}</div>
            <div class="stat-label">总步骤数</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ totalTables }}</div>
            <div class="stat-label">关联数据表</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ totalMetrics }}</div>
            <div class="stat-label">关联指标</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ completionRate }}%</div>
            <div class="stat-label">完成度</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, onMounted } from 'vue'
import {
  IconInfoCircle,
  IconList,
  IconStorage,
  IconBarChart,
  IconEmpty,
  IconExclamationCircle
} from '@arco-design/web-vue/es/icon'

// 数据类型定义
interface TableItem {
  name: string
  description: string
  type: string
  owner: string
}

interface MetricItem {
  name: string
  description: string
  category: string
  level: string
  unit?: string
  formula?: string
}

interface ProcessStep {
  id: string
  name: string
  description?: string
  tables: TableItem[]
  metrics: MetricItem[]
}

interface BasicInfo {
  name: string
  description: string
  businessType: string
  productType: string
  priority: string
  tags: string[]
}

interface ProcessData {
  basicInfo: BasicInfo
  steps: ProcessStep[]
}

interface Props {
  processData: ProcessData
}

interface Emits {
  (e: 'validate', isValid: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 计算属性 - 提取基本信息
const basicInfo = computed(() => props.processData.basicInfo || {
  name: '',
  description: '',
  businessType: '',
  productType: '',
  priority: 'medium',
  tags: []
})

// 计算属性
const totalTables = computed(() => {
  if (!props.processData.steps) {return 0}
  const tableNames = new Set()
  props.processData.steps.forEach((step: ProcessStep) => {
    step.tables?.forEach((table: TableItem) => tableNames.add(table.name))
  })
  return tableNames.size
})

const totalMetrics = computed(() => {
  if (!props.processData.steps) {return 0}
  const metricNames = new Set()
  props.processData.steps.forEach((step: ProcessStep) => {
    step.metrics?.forEach((metric: MetricItem) => metricNames.add(metric.name))
  })
  return metricNames.size
})

const completionRate = computed(() => {
  if (!props.processData.steps || props.processData.steps.length === 0) {return 0}
  
  let totalFields = 0
  let completedFields = 0
  
  // 基本信息完成度
  totalFields += 5 // name, description, businessType, productType, priority
  if (basicInfo.value.name) {completedFields++}
  if (basicInfo.value.description) {completedFields++}
  if (basicInfo.value.businessType) {completedFields++}
  if (basicInfo.value.productType) {completedFields++}
  if (basicInfo.value.priority) {completedFields++}
  
  // 步骤完成度
  props.processData.steps.forEach((step: ProcessStep) => {
    totalFields += 3 // name, tables, metrics
    if (step.name) {completedFields++}
    if (step.tables && step.tables.length > 0) {completedFields++}
    if (step.metrics && step.metrics.length > 0) {completedFields++}
  })
  
  return totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 0
})

// 标签转换函数
const getBusinessTypeLabel = (type: string) => {
  const labels = {
    'data-analysis': '数据分析',
    'business-intelligence': '商业智能',
    'data-processing': '数据处理',
    'reporting': '报表生成'
  }
  return labels[type as keyof typeof labels] || type
}

const getProductTypeLabel = (type: string) => {
  const labels = {
    'web-app': 'Web应用',
    'mobile-app': '移动应用',
    'desktop-app': '桌面应用',
    'api-service': 'API服务'
  }
  return labels[type as keyof typeof labels] || type
}

const getPriorityLabel = (priority: string) => {
  const labels = {
    'high': '高',
    'medium': '中',
    'low': '低'
  }
  return labels[priority as keyof typeof labels] || priority
}

const getPriorityColor = (priority: string) => {
  const colors = {
    'high': 'red',
    'medium': 'orange',
    'low': 'green'
  }
  return colors[priority as keyof typeof colors] || 'gray'
}

const getTableTypeLabel = (type: string) => {
  const labels = {
    fact: '事实表',
    dimension: '维度表',
    summary: '汇总表',
    temp: '临时表'
  }
  return labels[type as keyof typeof labels] || type
}

const getTableTypeColor = (type: string) => {
  const colors = {
    fact: 'blue',
    dimension: 'green',
    summary: 'orange',
    temp: 'gray'
  }
  return colors[type as keyof typeof colors] || 'gray'
}

const getMetricCategoryLabel = (category: string) => {
  const labels = {
    business: '业务指标',
    technical: '技术指标',
    financial: '财务指标',
    operational: '运营指标'
  }
  return labels[category as keyof typeof labels] || category
}

const getMetricCategoryColor = (category: string) => {
  const colors = {
    business: 'blue',
    technical: 'green',
    financial: 'orange',
    operational: 'purple'
  }
  return colors[category as keyof typeof colors] || 'gray'
}

const getMetricLevelLabel = (level: string) => {
  const labels = {
    core: '核心指标',
    important: '重要指标',
    general: '一般指标'
  }
  return labels[level as keyof typeof labels] || level
}

const getMetricLevelColor = (level: string) => {
  const colors = {
    core: 'red',
    important: 'orange',
    general: 'gray'
  }
  return colors[level as keyof typeof colors] || 'gray'
}

// 验证逻辑
const isValid = computed(() => {
  // 检查基本信息是否完整
  const basicInfoValid = !!(
    basicInfo.value.name &&
    basicInfo.value.businessType &&
    basicInfo.value.productType
  )
  
  // 检查是否有步骤配置
  const hasSteps = props.processData.steps && props.processData.steps.length > 0
  
  // 检查步骤是否有基本配置
  const stepsValid = hasSteps ? props.processData.steps.every(step => 
    step.name && step.name.trim().length > 0
  ) : false
  
  return basicInfoValid && stepsValid
})

// 监听验证状态变化
watch(isValid, (newValue) => {
  emit('validate', newValue)
}, { immediate: true })

// 组件挂载时触发验证
onMounted(() => {
  emit('validate', isValid.value)
})
</script>

<style scoped>
.process-preview {
  padding: 20px;
  max-height: 600px;
  overflow-y: auto;
}

.preview-section {
  margin-bottom: 24px;
  border: 1px solid var(--color-border-2);
  border-radius: 8px;
  overflow: hidden;
}

.section-header {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  background: var(--color-bg-2);
  border-bottom: 1px solid var(--color-border-2);
}

.section-icon {
  margin-right: 8px;
  color: var(--color-text-2);
}

.section-title {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  color: var(--color-text-1);
  flex: 1;
}

.section-summary {
  font-size: 14px;
  color: var(--color-text-3);
}

.section-content {
  padding: 20px;
}

/* 基本信息样式 */
.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.info-item {
  display: flex;
  align-items: center;
}

.info-item.full-width {
  grid-column: 1 / -1;
  align-items: flex-start;
}

.info-label {
  font-weight: 500;
  color: var(--color-text-2);
  margin-right: 8px;
  min-width: 80px;
}

.info-value {
  color: var(--color-text-1);
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

/* 步骤样式 */
.steps-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.step-card {
  border: 1px solid var(--color-border-3);
  border-radius: 8px;
  padding: 16px;
  background: var(--color-bg-1);
}

.step-header {
  display: flex;
  align-items: flex-start;
  margin-bottom: 16px;
}

.step-number {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--color-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  margin-right: 12px;
  flex-shrink: 0;
}

.step-info {
  flex: 1;
}

.step-name {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 500;
  color: var(--color-text-1);
}

.step-description {
  margin: 0;
  font-size: 14px;
  color: var(--color-text-3);
}

.step-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.content-header {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.content-icon {
  margin-right: 6px;
  color: var(--color-text-2);
}

.content-title {
  font-weight: 500;
  color: var(--color-text-1);
}

/* 步骤统计样式 */
.step-stats {
  padding: 16px;
  background: var(--color-bg-2);
  border-radius: 6px;
  border: 1px solid var(--color-border-3);
}

.stat-row {
  display: flex;
  gap: 24px;
  align-items: center;
}

.stat-item-inline {
  display: flex;
  align-items: center;
  gap: 6px;
}

.stat-icon {
  color: var(--color-text-2);
  font-size: 14px;
}

.stat-label {
  font-size: 14px;
  color: var(--color-text-2);
}

.stat-value {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-primary);
}

/* 统计信息样式 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.stat-item {
  text-align: center;
  padding: 16px;
  background: var(--color-bg-2);
  border-radius: 8px;
  border: 1px solid var(--color-border-3);
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: var(--color-primary);
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: var(--color-text-3);
}

/* 空状态样式 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: var(--color-text-3);
}

.empty-icon {
  font-size: 24px;
  margin-bottom: 8px;
  color: var(--color-text-4);
}

.empty-text {
  font-size: 14px;
  margin: 0;
}
</style>