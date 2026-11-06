<template>
  <div class="step-manager">
    <div class="manager-header">
      <h3 class="section-title">步骤管理</h3>
      <p class="section-description">添加和管理业务流程的各个步骤，每个步骤可以关联相关的数据表和指标。</p>
    </div>

    <div class="steps-container">
      <!-- 步骤列表 -->
      <div class="steps-list">
        <div
          v-for="(step, index) in localSteps"
          :key="step.id"
          class="step-card"
          :class="{ 'dragging': dragIndex === index }"
          draggable="true"
          @dragstart="handleDragStart(index, $event)"
          @dragover="handleDragOver($event)"
          @drop="handleDrop(index, $event)"
          @dragend="handleDragEnd"
        >
          <div class="step-header">
            <div class="step-info">
              <div class="step-number">{{ index + 1 }}</div>
              <div class="step-title-container">
                <a-input
                  v-if="editingStepId === step.id"
                  v-model="step.name"
                  placeholder="请输入步骤名称"
                  size="small"
                  @blur="handleStepNameBlur(step)"
                  @keyup.enter="handleStepNameBlur(step)"
                  @keyup.esc="cancelEdit"
                />
                <div v-else class="step-title" @click="editStepName(step.id)">
                  {{ step.name || `步骤 ${index + 1}` }}
                </div>
              </div>
            </div>
            <div class="step-actions">
              <a-button
                type="text"
                size="small"
                @click="moveStepUp(index)"
                :disabled="index === 0"
              >
                <template #icon><IconUp /></template>
              </a-button>
              <a-button
                type="text"
                size="small"
                @click="moveStepDown(index)"
                :disabled="index === localSteps.length - 1"
              >
                <template #icon><IconDown /></template>
              </a-button>
              <a-button
                type="text"
                size="small"
                status="danger"
                @click="removeStep(index)"
                :disabled="localSteps.length <= 1"
              >
                <template #icon><IconDelete /></template>
              </a-button>
            </div>
          </div>

          <div class="step-content">
            <a-textarea
              v-model="step.description"
              placeholder="请描述该步骤的具体内容和目标"
              :rows="2"
              :max-length="200"
              show-word-limit
              @input="handleStepChange"
            />
          </div>

          <div class="step-meta">
            <div class="meta-item">
              <span class="meta-label">关联表：</span>
              <span class="meta-value">{{ step.tables?.length || 0 }} 个</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">关联指标：</span>
              <span class="meta-value">{{ step.metrics?.length || 0 }} 个</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 添加步骤按钮 -->
      <div class="add-step-container">
        <a-button
          type="dashed"
          size="large"
          class="add-step-btn"
          @click="addStep"
        >
          <template #icon><IconPlus /></template>
          添加新步骤
        </a-button>
      </div>
    </div>

    <!-- 步骤统计 -->
    <div class="steps-summary">
      <div class="summary-card">
        <div class="summary-item">
          <div class="summary-number">{{ localSteps.length }}</div>
          <div class="summary-label">总步骤数</div>
        </div>
        <div class="summary-item">
          <div class="summary-number">{{ totalTables }}</div>
          <div class="summary-label">关联表数</div>
        </div>
        <div class="summary-item">
          <div class="summary-number">{{ totalMetrics }}</div>
          <div class="summary-label">关联指标数</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { Message } from '@arco-design/web-vue'
import { IconUp, IconDown, IconDelete, IconPlus } from '@arco-design/web-vue/es/icon'
import { nanoid } from 'nanoid'

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
  steps: ProcessStep[]
}

interface Emits {
  (e: 'update:steps', steps: ProcessStep[]): void
  (e: 'validate', isValid: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 本地步骤数据
const localSteps = ref<ProcessStep[]>([])

// 编辑状态
const editingStepId = ref<string | null>(null)
const dragIndex = ref<number | null>(null)

// 初始化步骤数据
const initSteps = () => {
  if (props.steps && props.steps.length > 0) {
    localSteps.value = props.steps.map(step => ({ ...step }))
  } else {
    // 默认创建一个步骤
    localSteps.value = [createNewStep()]
  }
}

// 创建新步骤
const createNewStep = (): ProcessStep => {
  return {
    id: nanoid(),
    name: '',
    description: '',
    tables: [],
    metrics: []
  }
}

// 添加步骤
const addStep = () => {
  try {
    const newStep = createNewStep()
    localSteps.value.push(newStep)
    handleStepChange()
    
    // 自动编辑新步骤名称
    setTimeout(() => {
      editStepName(newStep.id)
    }, 100)
  } catch (error) {

    Message.error('添加步骤失败，请重试')
  }
}

// 移除步骤
const removeStep = (index: number) => {
  try {
    if (localSteps.value.length <= 1) {
      Message.warning('至少需要保留一个步骤')
      return
    }
    
    localSteps.value.splice(index, 1)
    handleStepChange()
  } catch (error) {

    Message.error('移除步骤失败，请重试')
  }
}

// 上移步骤
const moveStepUp = (index: number) => {
  try {
    if (index > 0) {
      const temp = localSteps.value[index]
      localSteps.value[index] = localSteps.value[index - 1]
      localSteps.value[index - 1] = temp
      handleStepChange()
    }
  } catch (error) {

    Message.error('移动步骤失败，请重试')
  }
}

// 下移步骤
const moveStepDown = (index: number) => {
  try {
    if (index < localSteps.value.length - 1) {
      const temp = localSteps.value[index]
      localSteps.value[index] = localSteps.value[index + 1]
      localSteps.value[index + 1] = temp
      handleStepChange()
    }
  } catch (error) {

    Message.error('移动步骤失败，请重试')
  }
}

// 编辑步骤名称
const editStepName = (stepId: string) => {
  editingStepId.value = stepId
}

// 步骤名称编辑完成
const handleStepNameBlur = (step: ProcessStep) => {
  try {
    if (!step.name.trim()) {
      step.name = `步骤 ${localSteps.value.findIndex(s => s.id === step.id) + 1}`
    }
    editingStepId.value = null
    handleStepChange()
  } catch (error) {

    Message.error('保存步骤名称失败，请重试')
  }
}

// 取消编辑
const cancelEdit = () => {
  editingStepId.value = null
}

// 拖拽开始
const handleDragStart = (index: number, event: DragEvent) => {
  dragIndex.value = index
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/html', index.toString())
  }
}

// 拖拽悬停
const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}

// 拖拽放置
const handleDrop = (targetIndex: number, event: DragEvent) => {
  try {
    event.preventDefault()
    
    if (dragIndex.value !== null && dragIndex.value !== targetIndex) {
      const draggedStep = localSteps.value[dragIndex.value]
      localSteps.value.splice(dragIndex.value, 1)
      localSteps.value.splice(targetIndex, 0, draggedStep)
      handleStepChange()
    }
  } catch (error) {

    Message.error('移动步骤失败，请重试')
  }
}

// 拖拽结束
const handleDragEnd = () => {
  dragIndex.value = null
}

// 步骤变化处理
const handleStepChange = () => {
  try {
    emit('update:steps', localSteps.value)
    
    // 验证步骤
    const isValid = localSteps.value.length > 0 && 
      localSteps.value.every(step => step.name.trim().length > 0)
    emit('validate', isValid)
  } catch (error) {

    emit('validate', false)
  }
}

// 计算总表数
const totalTables = computed(() => {
  return localSteps.value.reduce((total, step) => total + (step.tables?.length || 0), 0)
})

// 计算总指标数
const totalMetrics = computed(() => {
  return localSteps.value.reduce((total, step) => total + (step.metrics?.length || 0), 0)
})

// 监听props变化
watch(() => props.steps, () => {
  initSteps()
}, { immediate: true, deep: true })

// 初始验证
watch(() => localSteps.value, () => {
  handleStepChange()
}, { immediate: true, deep: true })
</script>

<style scoped>
.step-manager {
  max-width: 800px;
}

.manager-header {
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

.steps-container {
  margin-bottom: 24px;
}

.steps-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 16px;
}

.step-card {
  background: var(--color-bg-1);
  border: 1px solid var(--color-border-2);
  border-radius: 8px;
  padding: 16px;
  transition: all 0.2s ease;
  cursor: move;
}

.step-card:hover {
  border-color: var(--color-border-3);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.step-card.dragging {
  opacity: 0.5;
  transform: rotate(2deg);
}

.step-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.step-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.step-number {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--color-primary-6);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.step-title-container {
  flex: 1;
}

.step-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-1);
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.step-title:hover {
  background: var(--color-fill-2);
}

.step-actions {
  display: flex;
  gap: 4px;
}

.step-content {
  margin-bottom: 12px;
}

.step-meta {
  display: flex;
  gap: 16px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.meta-label {
  font-size: 12px;
  color: var(--color-text-3);
}

.meta-value {
  font-size: 12px;
  color: var(--color-text-2);
  font-weight: 500;
}

.add-step-container {
  display: flex;
  justify-content: center;
}

.add-step-btn {
  width: 100%;
  height: 60px;
  border-style: dashed;
  border-width: 2px;
  font-size: 14px;
}

.steps-summary {
  margin-top: 24px;
}

.summary-card {
  background: var(--color-bg-2);
  border-radius: 8px;
  padding: 20px;
  display: flex;
  justify-content: space-around;
}

.summary-item {
  text-align: center;
}

.summary-number {
  font-size: 24px;
  font-weight: 600;
  color: var(--color-primary-6);
  margin-bottom: 4px;
}

.summary-label {
  font-size: 12px;
  color: var(--color-text-3);
}

:deep(.arco-textarea) {
  border-radius: 6px;
}

:deep(.arco-input) {
  border-radius: 4px;
}
</style>