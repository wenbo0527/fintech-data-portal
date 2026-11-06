<template>
  <div class="step-editor">
    <div class="editor-header">
      <h3 class="section-title">步骤配置 - {{ stepData?.name || `步骤 ${stepIndex + 1}` }}</h3>
      <p class="section-description">为该步骤配置相关的数据表和指标，这些配置将帮助团队理解步骤的数据依赖关系。</p>
    </div>

    <div class="editor-content">
      <!-- 步骤基本信息 -->
      <div class="info-section">
        <h4 class="subsection-title">基本信息</h4>
        <div class="info-form">
          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item label="步骤名称">
                <a-input
                  v-model="localStepData.name"
                  placeholder="请输入步骤名称"
                  @input="handleStepChange"
                />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="执行顺序">
                <a-input-number
                  v-model="displayOrder"
                  :min="1"
                  :disabled="true"
                  style="width: 100%"
                />
              </a-form-item>
            </a-col>
          </a-row>
          <a-form-item label="步骤描述">
            <a-textarea
              v-model="localStepData.description"
              placeholder="请详细描述该步骤的具体内容、目标和关键活动"
              :rows="3"
              :max-length="300"
              show-word-limit
              @input="handleStepChange"
            />
          </a-form-item>
        </div>
      </div>

      <!-- 数据表配置 -->
      <div class="tables-section">
        <div class="section-header">
          <h4 class="subsection-title">关联数据表</h4>
          <a-button type="primary" @click="showTableSelector">
            <template #icon><IconPlus /></template>
            添加数据表
          </a-button>
        </div>
        
        <div v-if="localStepData.tables.length === 0" class="empty-state">
          <div class="empty-icon">
            <IconStorage />
          </div>
          <div class="empty-text">暂未关联任何数据表</div>
          <div class="empty-description">点击上方按钮添加相关的数据表</div>
        </div>
        
        <div v-else class="tables-list">
          <div
            v-for="(table, index) in localStepData.tables"
            :key="table.name"
            class="table-item"
          >
            <div class="table-info">
              <div class="table-name">{{ table.name }}</div>
              <div class="table-description">{{ table.description }}</div>
              <div class="table-meta">
                <a-tag size="small">{{ table.type }}</a-tag>
                <span class="table-owner">负责人: {{ table.owner }}</span>
              </div>
            </div>
            <div class="table-actions">
              <a-button
                type="text"
                size="small"
                status="danger"
                @click="removeTable(index)"
              >
                <template #icon><IconDelete /></template>
              </a-button>
            </div>
          </div>
        </div>
      </div>

      <!-- 指标配置 -->
      <div class="metrics-section">
        <div class="section-header">
          <h4 class="subsection-title">关联指标</h4>
          <a-button type="primary" @click="showMetricSelector">
            <template #icon><IconPlus /></template>
            添加指标
          </a-button>
        </div>
        
        <div v-if="localStepData.metrics.length === 0" class="empty-state">
          <div class="empty-icon">
            <IconBarChart />
          </div>
          <div class="empty-text">暂未关联任何指标</div>
          <div class="empty-description">点击上方按钮添加相关的业务指标</div>
        </div>
        
        <div v-else class="metrics-list">
          <div
            v-for="(metric, index) in localStepData.metrics"
            :key="metric.name"
            class="metric-item"
          >
            <div class="metric-info">
              <div class="metric-name">{{ metric.name }}</div>
              <div class="metric-description">{{ metric.description }}</div>
              <div class="metric-meta">
                <span class="metric-unit">单位: {{ metric.unit }}</span>
                <span class="metric-formula">计算公式: {{ metric.formula }}</span>
              </div>
            </div>
            <div class="metric-actions">
              <a-button
                type="text"
                size="small"
                status="danger"
                @click="removeMetric(index)"
              >
                <template #icon><IconDelete /></template>
              </a-button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 数据表选择器 -->
    <DataTableSelector
      v-model:visible="tableSelectorVisible"
      :selected-tables="localStepData.tables"
      @confirm="handleTablesSelected"
    />

    <!-- 指标选择器 -->
    <MetricSelector
      v-model:visible="metricSelectorVisible"
      :selected-metrics="localStepData.metrics"
      @confirm="handleMetricsSelected"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { IconPlus, IconBarChart, IconDelete, IconStorage } from '@arco-design/web-vue/es/icon'
import DataTableSelector from './DataTableSelector.vue'
import MetricSelector from './MetricSelector.vue'

// 步骤数据类型
interface ProcessStep {
  id: string
  name: string
  description: string
  tables: TableItem[]
  metrics: MetricItem[]
}

interface TableItem {
  name: string
  description: string
  type: string
  owner: string
}

interface MetricItem {
  name: string
  description: string
  unit: string
  formula: string
}

interface Props {
  stepData: ProcessStep | null
  stepIndex: number
}

interface Emits {
  (e: 'update:step-data', stepData: ProcessStep): void
  (e: 'validate', isValid: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 本地步骤数据
const localStepData = reactive<ProcessStep>({
  id: '',
  name: '',
  description: '',
  tables: [],
  metrics: []
})

// 选择器显示状态
const tableSelectorVisible = ref(false)
const metricSelectorVisible = ref(false)

// 显示顺序
const displayOrder = computed(() => props.stepIndex + 1)

// 初始化步骤数据
const initStepData = () => {
  if (props.stepData) {
    Object.assign(localStepData, {
      id: props.stepData.id,
      name: props.stepData.name,
      description: props.stepData.description,
      tables: [...(props.stepData.tables || [])],
      metrics: [...(props.stepData.metrics || [])]
    })
  }
}

// 步骤变化处理
const handleStepChange = () => {
  emit('update:step-data', { ...localStepData })
  
  // 验证步骤
  const isValid = localStepData.name.trim().length > 0
  emit('validate', isValid)
}

// 显示数据表选择器
const showTableSelector = () => {
  tableSelectorVisible.value = true
}

// 显示指标选择器
const showMetricSelector = () => {
  metricSelectorVisible.value = true
}

// 处理数据表选择
const handleTablesSelected = (tables: TableItem[]) => {
  localStepData.tables = tables
  handleStepChange()
}

// 处理指标选择
const handleMetricsSelected = (metrics: MetricItem[]) => {
  localStepData.metrics = metrics
  handleStepChange()
}

// 移除数据表
const removeTable = (index: number) => {
  localStepData.tables.splice(index, 1)
  handleStepChange()
}

// 移除指标
const removeMetric = (index: number) => {
  localStepData.metrics.splice(index, 1)
  handleStepChange()
}

// 监听props变化
watch(() => props.stepData, () => {
  initStepData()
}, { immediate: true, deep: true })

// 初始验证
watch(() => localStepData.name, () => {
  handleStepChange()
}, { immediate: true })
</script>

<style scoped>
.step-editor {
  max-width: 800px;
}

.editor-header {
  margin-bottom: 24px;
}

.section-title {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-1);
}

.section-description {
  margin: 0;
  font-size: 14px;
  color: var(--color-text-3);
  line-height: 1.5;
}

.editor-content {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.info-section,
.tables-section,
.metrics-section {
  background: var(--color-bg-1);
  border-radius: 8px;
  padding: 20px;
  border: 1px solid var(--color-border-2);
}

.subsection-title {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-1);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.info-form {
  :deep(.arco-form-item) {
    margin-bottom: 16px;
  }
  
  :deep(.arco-form-item-label) {
    font-weight: 500;
    color: var(--color-text-1);
  }
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--color-text-3);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-text {
  font-size: 16px;
  margin-bottom: 8px;
  color: var(--color-text-2);
}

.empty-description {
  font-size: 14px;
}

.tables-list,
.metrics-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.table-item,
.metric-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 16px;
  background: var(--color-bg-2);
  border-radius: 6px;
  border: 1px solid var(--color-border-3);
  transition: all 0.2s ease;
}

.table-item:hover,
.metric-item:hover {
  border-color: var(--color-border-2);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.table-info,
.metric-info {
  flex: 1;
}

.table-name,
.metric-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-1);
  margin-bottom: 4px;
}

.table-description,
.metric-description {
  font-size: 13px;
  color: var(--color-text-2);
  margin-bottom: 8px;
  line-height: 1.4;
}

.table-meta,
.metric-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: var(--color-text-3);
}

.table-owner,
.metric-unit,
.metric-formula {
  font-size: 12px;
  color: var(--color-text-3);
}

.table-actions,
.metric-actions {
  flex-shrink: 0;
  margin-left: 12px;
}

:deep(.arco-input),
:deep(.arco-textarea),
:deep(.arco-input-number) {
  border-radius: 6px;
}
</style>