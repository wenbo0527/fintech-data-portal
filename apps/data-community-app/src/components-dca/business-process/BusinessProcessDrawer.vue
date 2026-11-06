<template>
  <a-drawer
    v-model:visible="visible"
    :width="1000"
    :mask-closable="false"
    :closable="false"
    placement="right"
    class="business-process-drawer"
  >
    <!-- 抽屉头部 -->
    <template #title>
      <div class="drawer-header">
        <div class="header-left">
          <h3 class="drawer-title">
            <template v-if="currentPhase === 'selection'">
              业务流程管理
            </template>
            <template v-else>
              {{ mode === 'create' ? '创建业务流程' : '编辑业务流程' }}
            </template>
          </h3>
          <div v-if="currentPhase === 'editing'" class="progress-indicator">
            <span class="progress-text">步骤 {{ currentStepIndex + 1 }} / {{ totalSteps }}</span>
            <a-progress 
              :percent="((currentStepIndex + 1) / totalSteps) * 100" 
              :show-text="false" 
              size="small"
              :style="{ width: '120px' }"
            />
          </div>
        </div>
        <div class="header-right">
          <a-button v-if="currentPhase === 'editing'" type="text" @click="handleBackToSelection">
            <template #icon><IconArrowLeft /></template>
            返回
          </a-button>
          <a-button type="text" @click="handleClose">
            <template #icon><IconClose /></template>
          </a-button>
        </div>
      </div>
    </template>

    <!-- 抽屉内容 -->
    <div class="drawer-content">
      <!-- 增强的错误边界 -->
      <div v-if="hasError" class="error-boundary">
        <div class="error-content">
          <IconExclamationCircle class="error-icon" />
          <h4 class="error-title">组件运行异常</h4>
          <p class="error-message">{{ errorMessage }}</p>
          
          <!-- 错误详情（可展开） -->
          <div class="error-details">
            <a-collapse v-if="errorStack || errorContext" :default-active-key="[]">
              <a-collapse-item key="details" header="查看详细信息">
                <div class="error-detail-item" v-if="errorContext">
                  <strong>错误上下文：</strong>
                  <span>{{ errorContext }}</span>
                </div>
                <div class="error-detail-item" v-if="errorStack">
                  <strong>错误堆栈：</strong>
                  <pre class="error-stack">{{ errorStack }}</pre>
                </div>
                <div class="error-detail-item">
                  <strong>重试次数：</strong>
                  <span>{{ retryCount }} / {{ maxRetries }}</span>
                </div>
              </a-collapse-item>
            </a-collapse>
          </div>
          
          <!-- 错误操作按钮 -->
          <div class="error-actions">
            <a-button 
              type="primary" 
              :loading="isRecovering"
              :disabled="retryCount >= maxRetries"
              @click="retryComponent"
            >
              {{ isRecovering ? '恢复中...' : '重试' }}
            </a-button>
            <a-button @click="resetComponent">重置组件</a-button>
            <a-button type="outline" @click="copyErrorReport">复制错误信息</a-button>
          </div>
          
          <!-- 用户指导 -->
          <div class="error-guidance">
            <p class="guidance-text">
              <template v-if="retryCount >= maxRetries">
                重试次数已达上限，建议刷新页面或联系技术支持
              </template>
              <template v-else>
                如果问题持续出现，请尝试刷新页面或联系技术支持
              </template>
            </p>
          </div>
        </div>
      </div>

      <!-- 正常内容 -->
      <template v-else>
        <!-- 第一阶段：流程选择界面 -->
        <template v-if="currentPhase === 'selection'">
          <ProcessSelectionView
            @create-process="handleCreateProcess"
            @edit-process="handleEditProcess"
            @delete-process="handleDeleteProcess"
          />
        </template>

        <!-- 第二阶段：详细编辑界面 -->
        <template v-else>
          <!-- 步骤导航 -->
          <div class="step-navigation">
            <StepNavigation
              :current-step="currentStepIndex"
              :steps="stepList"
              :completed-steps="completedSteps"
              @step-change="handleStepChange"
            />
          </div>

          <!-- 编辑区域 -->
          <div class="edit-area">
            <!-- 基本信息步骤 -->
            <div v-if="currentStepIndex === 0" class="step-content">
              <BasicInfoEditor
                v-model:data="processData.basicInfo"
                @validate="handleStepValidate"
              />
            </div>

            <!-- 步骤管理 -->
            <div v-else-if="currentStepIndex === 1" class="step-content">
              <StepManager
                v-model:steps="processData.steps"
                @validate="handleStepValidate"
              />
            </div>

            <!-- 步骤配置 -->
            <div v-else-if="currentStepIndex >= 2 && currentStepIndex < totalSteps - 1" class="step-content">
              <StepEditor
                :step-data="currentStepData"
                :step-index="currentStepIndex - 2"
                @validate="handleStepValidate"
                @update:step-data="handleStepDataUpdate"
              />
            </div>

            <!-- 预览确认 -->
            <div v-else-if="currentStepIndex === totalSteps - 1" class="step-content">
              <ProcessPreview
                :process-data="processData"
                @validate="handleStepValidate"
              />
            </div>
          </div>
        </template>
      </template>
    </div>

    <!-- 抽屉底部操作 -->
    <template #footer>
      <div class="drawer-footer">
        <!-- 第一阶段：流程选择界面的底部 -->
        <template v-if="currentPhase === 'selection'">
          <div class="footer-left">
            <a-button @click="handleClose">关闭</a-button>
          </div>
        </template>

        <!-- 第二阶段：详细编辑界面的底部 -->
        <template v-else>
          <div class="footer-left">
            <span v-if="autoSaveStatus === 'saving'" class="auto-save-status">
              <IconLoading class="loading-icon" />
              自动保存中...
            </span>
            <span v-else-if="autoSaveStatus === 'saved'" class="auto-save-status saved">
              <IconCheck class="check-icon" />
              已自动保存
            </span>
            <span v-else-if="autoSaveStatus === 'error'" class="auto-save-status error">
              <IconExclamation class="error-icon" />
              保存失败
            </span>
          </div>
          <div class="footer-right">
            <a-button @click="handleClose">取消</a-button>
            <a-button 
              v-if="currentStepIndex > 0" 
              @click="handlePrevStep"
            >
              上一步
            </a-button>
            <a-button 
              v-if="currentStepIndex < totalSteps - 1" 
              type="primary" 
              :disabled="!currentStepValid"
              @click="handleNextStep"
            >
              下一步
            </a-button>
            <a-button 
              v-if="currentStepIndex === totalSteps - 1" 
              type="primary" 
              :loading="submitting"
              :disabled="!allStepsValid"
              @click="handleSubmit"
            >
              {{ mode === 'create' ? '创建流程' : '保存修改' }}
            </a-button>
          </div>
        </template>
      </div>
    </template>
  </a-drawer>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { Message } from '@arco-design/web-vue'
import { IconClose, IconLoading, IconCheck, IconExclamation, IconExclamationCircle, IconArrowLeft } from '@arco-design/web-vue/es/icon'
import ProcessSelectionView from './ProcessSelectionView.vue'
import StepNavigation from './StepNavigation.vue'
import BasicInfoEditor from './BasicInfoEditor.vue'
import StepManager from './StepManager.vue'
import StepEditor from './StepEditor.vue'
import ProcessPreview from './ProcessPreview.vue'
import { useProcessEditor, type ProcessData, type ProcessStep, type TableItem, type MetricItem } from './composables/useProcessEditor'
import { useAutoSave } from './composables/useAutoSave'

// 组件属性
interface Props {
  visible: boolean
  processId?: string
  mode: 'create' | 'edit'
}

// 属性验证
const validateProps = (props: Props) => {
  // 原两个空 if 块（条件成立时不执行任何语句）已删除，validateProps 行为不变
}

// 组件事件
interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'save', data: ProcessData): void
  (e: 'cancel'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 阶段管理
type DrawerPhase = 'selection' | 'editing'
const currentPhase = ref<DrawerPhase>('selection')
const selectedProcess = ref<any>(null)

// 响应式数据
const visible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const currentStepIndex = ref(0)
const submitting = ref(false)
const stepValidationStatus = ref<Record<number, boolean>>({})

// 增强的错误边界状态
const hasError = ref(false)
const errorMessage = ref('')
const retryCount = ref(0)
const maxRetries = 3
const errorStack = ref('')
const errorContext = ref('')
const errorHistory = ref<Array<{timestamp: number, error: string, context: string}>>([])
const isRecovering = ref(false)
const lastErrorTime = ref(0)
const errorThreshold = 5 // 5秒内不重复显示相同错误

// 增强的错误处理方法
const retryComponent = async () => {
  try {
    if (retryCount.value < maxRetries) {
      isRecovering.value = true
      retryCount.value++
      
      // 记录重试操作
      logError('用户触发重试', `第${retryCount.value}次重试`)
      
      // 清理错误状态
      hasError.value = false
      errorMessage.value = ''
      errorStack.value = ''
      errorContext.value = ''
      
      // 延迟重试，避免立即失败
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      try {
        // 尝试重新初始化
        if (props.processId) {
          await initEditor(props.processId)
        } else {
          initEditor()
        }
        
        // 重试成功，重置计数器
        retryCount.value = 0
        Message.success('组件恢复成功')
      } catch (error) {
        handleComponentError(error, '重试初始化')
      }
    } else {
      Message.error('重试次数已达上限，请刷新页面重试')
      logError('重试次数超限', '建议用户刷新页面')
    }
  } catch (error) {

    handleComponentError(error, '重试操作')
  } finally {
    isRecovering.value = false
  }
}

const resetComponent = () => {
  try {
    // 记录重置操作
    logError('用户触发重置', '清理所有状态')
    
    // 清理错误状态
    hasError.value = false
    errorMessage.value = ''
    errorStack.value = ''
    errorContext.value = ''
    retryCount.value = 0
    isRecovering.value = false
    
    // 重置业务状态
    resetEditor()
    currentStepIndex.value = 0
    stepValidationStatus.value = {}
    currentPhase.value = 'selection'
    selectedProcess.value = null
    submitting.value = false
    
    Message.success('组件已重置')
  } catch (error) {

    // 强制重置关键状态
    hasError.value = false
    currentStepIndex.value = 0
    currentPhase.value = 'selection'
    logError('重置失败', error instanceof Error ? error.message : '未知错误')
  }
}

// 错误日志记录
const logError = (error: string, context: string) => {
  const timestamp = Date.now()
  errorHistory.value.push({ timestamp, error, context })
  
  // 保持错误历史记录在合理范围内
  if (errorHistory.value.length > 50) {
    errorHistory.value = errorHistory.value.slice(-30)
  }

}

// 获取错误报告
const getErrorReport = () => {
  return {
    currentError: {
      hasError: hasError.value,
      message: errorMessage.value,
      stack: errorStack.value,
      context: errorContext.value
    },
    retryInfo: {
      count: retryCount.value,
      maxRetries,
      isRecovering: isRecovering.value
    },
    history: errorHistory.value.slice(-10), // 最近10条错误
    componentState: {
      phase: currentPhase.value,
      stepIndex: currentStepIndex.value,
      hasProcessData: Boolean(processData)
    }
  }
}

// 智能错误恢复
const attemptAutoRecovery = async (error: unknown, context: string) => {
  try {
    logError('尝试自动恢复', context)
    
    // 检查是否是网络错误
    if (error instanceof Error && error.message.includes('fetch')) {
      // 网络错误，等待后重试
      await new Promise(resolve => setTimeout(resolve, 2000))
      return true
    }
    
    // 检查是否是数据错误
    if (error instanceof Error && error.message.includes('data')) {
      // 尝试重新初始化数据
      resetEditor()
      return true
    }
    
    // 检查是否是状态错误
    if (context.includes('步骤') || context.includes('状态')) {
      // 重置步骤状态
      currentStepIndex.value = 0
      stepValidationStatus.value = {}
      return true
    }
    
    return false
  } catch (recoveryError) {
    logError('自动恢复失败', recoveryError instanceof Error ? recoveryError.message : '未知错误')
    return false
  }
}

// 使用编辑器逻辑
const {
  processData,
  initializeEditor: initEditor,
  resetForm: resetEditor,
  getProcessData,
  updateStepBasicInfo,
  updateStepTables,
  updateStepMetrics
} = useProcessEditor()

// 使用自动保存
const {
  state: autoSaveState,
  saveNow: triggerAutoSave
} = useAutoSave(() => {
  try {
    const data = getProcessData()
    // 确保数据有效性
    if (!data || typeof data !== 'object') {
      return null
    }
    return data
  } catch (error) {

    return null
  }
}, {
  interval: 30000,
  validator: (data) => {
    try {
      // 添加更严格的null检查
      if (!data || typeof data !== 'object') {
        return false
      }
      // 确保data.basicInfo.name存在且不为空
      return Boolean(data.basicInfo?.name && typeof data.basicInfo.name === 'string' && data.basicInfo.name.trim().length > 0)
    } catch (error) {

      return false
    }
  }
})

// 计算autoSaveStatus属性 - 使用 shallowRef 避免深度响应式
const autoSaveStatus = computed(() => {
  // 添加防护检查，避免访问未定义的属性
  const saveStatus = autoSaveState.value?.saveStatus
  if (!saveStatus) {
    return 'idle'
  }
  
  // 使用简单的映射，避免复杂的响应式依赖
  const statusMap: Record<string, string> = {
    'saving': 'saving',
    'success': 'saved', 
    'error': 'error'
  }
  
  return statusMap[saveStatus] || 'idle'
})

// 步骤列表
const stepList = computed(() => {
  try {
    const steps = processData?.steps || []
    return [
      { key: 'basic', title: '基本信息', description: '配置流程基本信息' },
      { key: 'manage', title: '步骤管理', description: '添加和管理业务步骤' },
      ...steps.map((step, index) => ({
        key: `step-${index}`,
        title: `步骤${index + 1}`,
        description: step?.name || `配置第${index + 1}个步骤`
      })),
      { key: 'preview', title: '预览确认', description: '预览完整流程配置' }
    ]
  } catch (error) {

    return [
      { key: 'basic', title: '基本信息', description: '配置流程基本信息' },
      { key: 'preview', title: '预览确认', description: '预览完整流程配置' }
    ]
  }
})

// 总步骤数
const totalSteps = computed(() => stepList.value.length)

// 已完成的步骤
const completedSteps = computed(() => {
  const completed: number[] = []
  for (let i = 0; i < currentStepIndex.value; i++) {
    if (stepValidationStatus.value[i]) {
      completed.push(i)
    }
  }
  return completed
})

// 当前步骤数据
const currentStepData = computed(() => {
  try {
    if (currentStepIndex.value >= 2 && currentStepIndex.value < totalSteps.value - 1) {
      const stepIndex = currentStepIndex.value - 2
      const steps = processData?.steps || []
      return steps[stepIndex] || null
    }
    return null
  } catch (error) {

    return null
  }
})

// 当前步骤是否有效
const currentStepValid = computed(() => {
  return stepValidationStatus.value[currentStepIndex.value] || false
})

// 所有步骤是否有效
const allStepsValid = computed(() => {
  for (let i = 0; i < totalSteps.value; i++) {
    if (!stepValidationStatus.value[i]) {
      return false
    }
  }
  return true
})

// 步骤切换处理
const handleStepChange = (stepIndex: number) => {
  try {
    if (typeof stepIndex !== 'number' || stepIndex < 0) {

      return
    }
    
    if (stepIndex < currentStepIndex.value || stepValidationStatus.value[currentStepIndex.value]) {
      currentStepIndex.value = stepIndex
    } else {
      Message.warning('请先完成当前步骤的配置')
    }
  } catch (error) {

    Message.error('步骤切换失败')
  }
}

// 步骤验证处理
const handleStepValidate = (isValid: boolean) => {
  try {
    stepValidationStatus.value[currentStepIndex.value] = Boolean(isValid)
    if (isValid) {
      triggerAutoSave()
    }
  } catch (error) {

  }
}

// 下一步
const handleNextStep = () => {
  try {
    if (currentStepValid.value && currentStepIndex.value < totalSteps.value - 1) {
      currentStepIndex.value++
    } else {
      Message.warning('请先完成当前步骤的配置')
    }
  } catch (error) {

    Message.error('操作失败，请重试')
  }
}

// 上一步
const handlePrevStep = () => {
  try {
    if (currentStepIndex.value > 0) {
      currentStepIndex.value--
    }
  } catch (error) {

    Message.error('操作失败，请重试')
  }
}

// 处理步骤数据更新
const handleStepDataUpdate = (updatedStepData: ProcessStep) => {
  try {
    if (currentStepIndex.value >= 2 && currentStepIndex.value < totalSteps.value - 1) {
      const stepIndex = currentStepIndex.value - 2
      const currentStep = processData?.steps?.[stepIndex]
      
      if (currentStep && updatedStepData) {
        // 使用 useProcessEditor 提供的方法更新步骤数据
        updateStepBasicInfo(currentStep.id, {
          name: updatedStepData.name,
          description: updatedStepData.description
        })
        
        // 更新关联表
        if (updatedStepData.tables) {
          updateStepTables(currentStep.id, updatedStepData.tables)
        }
        
        // 更新关联指标
        if (updatedStepData.metrics) {
          updateStepMetrics(currentStep.id, updatedStepData.metrics)
        }
        
        // 触发验证
        validateCurrentStep()
        
        // 触发自动保存
        triggerAutoSave()
      }
    }
  } catch (error) {

    Message.error('更新失败，请重试')
  }
}

// 阶段切换方法
const handleBackToSelection = () => {
  try {
    currentPhase.value = 'selection'
    currentStepIndex.value = 0
    stepValidationStatus.value = {}
    selectedProcess.value = null
    resetEditor()
  } catch (error) {

    Message.error('操作失败，请重试')
  }
}

const handleCreateProcess = () => {
  try {
    currentPhase.value = 'editing'
    selectedProcess.value = null
    initEditor()
  } catch (error) {

    Message.error('操作失败，请重试')
  }
}

const handleEditProcess = (process: any) => {
  try {
    currentPhase.value = 'editing'
    selectedProcess.value = process
    // 使用选中的流程数据初始化编辑器
    initEditor(process.id)
  } catch (error) {

    Message.error('操作失败，请重试')
  }
}

const handleDeleteProcess = (processId: string) => {
  try {
    // 这里可以添加删除流程的逻辑

    Message.success('流程删除成功')
  } catch (error) {

    Message.error('删除失败，请重试')
  }
}

// 关闭抽屉
const handleClose = () => {
  try {
    if (autoSaveState.value.isSaving) {
      Message.warning('正在保存中，请稍候...')
      return
    }
    
    // 重置到初始状态
    currentPhase.value = 'selection'
    selectedProcess.value = null
    resetEditor()
    currentStepIndex.value = 0
    stepValidationStatus.value = {}
    
    // 清理自动保存
    if (typeof triggerAutoSave === 'function') {
      try {
        // triggerAutoSave 是 saveNow 方法，不需要 cancel

      } catch (error) {

      }
    }
    
    emit('cancel')
  } catch (error) {

    Message.error('关闭时发生错误，请重试')
    // 即使出错也要尝试关闭
    try {
      emit('cancel')
    } catch (emitError) {

    }
  }
}

// 提交流程
const handleSubmit = async () => {
  try {
    if (!allStepsValid.value) {
      Message.error('请完成所有步骤的配置')
      return
    }

    submitting.value = true
    
    try {
      const result = getProcessData()
      if (!result) {
        throw new Error('获取流程数据失败')
      }
      
      emit('save', result)
      Message.success(props.mode === 'create' ? '流程创建成功' : '流程更新成功')
      
      // 延迟关闭，确保保存操作完成
      setTimeout(() => {
        handleClose()
      }, 1000)
    } catch (error) {

      Message.error(error instanceof Error ? error.message : '保存失败，请重试')
    } finally {
      submitting.value = false
    }
  } catch (error) {

    Message.error('操作失败，请重试')
    submitting.value = false
  }
}

// 监听抽屉显示状态
watch(() => props.visible, (newVisible) => {
  try {
    if (newVisible) {
      // 验证属性
      validateProps(props)
      
      // 打开抽屉时重置到选择阶段
      currentPhase.value = 'selection'
      selectedProcess.value = null
      currentStepIndex.value = 0
      stepValidationStatus.value = {}
      
      // 如果有传入的 processId，直接进入编辑阶段
      if (props.processId) {
        currentPhase.value = 'editing'
        initEditor(props.processId)
      }
    } else {
      resetEditor()
    }
  } catch (error) {

    Message.error('初始化失败，请重试')
    emit('update:visible', false)
    handleComponentError(error)
  }
})

// 验证当前步骤
const validateCurrentStep = () => {
  try {
    const errors: string[] = []
    
    // 检查 processData 是否存在
    if (!processData) {
      errors.push('流程数据未初始化')
      stepValidationStatus.value[currentStepIndex.value] = false
      return { isValid: false, errors }
    }
    
    // 根据当前步骤索引进行相应的验证
    switch (currentStepIndex.value) {
      case 0: { // 基本信息步骤
        const basicInfo = processData?.basicInfo
        if (!basicInfo?.name?.trim()) {
          errors.push('流程名称不能为空')
        }
        if (!basicInfo?.businessType) {
          errors.push('请选择业务类型')
        }
        if (!basicInfo?.productType) {
          errors.push('请选择产品类型')
        }
        const isBasicValid = errors.length === 0
        stepValidationStatus.value[0] = isBasicValid
        break
      }
      case 1: { // 步骤管理
        const hasSteps = processData?.steps && processData.steps.length > 0
        if (!hasSteps) {
          errors.push('至少需要添加一个步骤')
        }
        stepValidationStatus.value[1] = Boolean(hasSteps)
        break
      }
      default: // 具体步骤编辑
        if (currentStepIndex.value >= 2 && currentStepIndex.value < totalSteps.value - 1) {
          const stepIndex = currentStepIndex.value - 2
          const step = processData?.steps?.[stepIndex]
          if (step && !step.name?.trim()) {
            errors.push('步骤名称不能为空')
          }
          const isStepValid = Boolean(
            step?.name?.trim() &&
            step?.description?.trim()
          )
          stepValidationStatus.value[currentStepIndex.value] = isStepValid
        } else if (currentStepIndex.value === totalSteps.value - 1) {
          // 预览步骤，检查所有前置步骤是否完成
          stepValidationStatus.value[currentStepIndex.value] = allStepsValid.value
        }
        break
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  } catch (error) {
    handleComponentError(error, '验证步骤')
    stepValidationStatus.value[currentStepIndex.value] = false
    return {
      isValid: false,
      errors: ['验证过程中发生错误']
    }
  }
}

// 增强的全局错误处理函数
const handleComponentError = async (error: unknown, context = '组件操作') => {
  try {
    const currentTime = Date.now()
    const errorMsg = error instanceof Error 
      ? error.message 
      : typeof error === 'string' 
        ? error 
        : '操作失败，请重试'
    
    // 防止短时间内重复显示相同错误
    if (currentTime - lastErrorTime.value < errorThreshold * 1000 && 
        errorMessage.value === errorMsg) {
      return
    }
    
    lastErrorTime.value = currentTime
    
    // 记录错误详情
    errorMessage.value = errorMsg
    errorContext.value = context
    errorStack.value = error instanceof Error ? error.stack || '' : ''
    
    // 记录到错误历史
    logError(errorMsg, context)
    
    // 尝试自动恢复
    const recovered = await attemptAutoRecovery(error, context)
    
    if (!recovered) {
      // 自动恢复失败，显示错误边界
      hasError.value = true
      
      // 根据错误类型显示不同的用户提示
      if (error instanceof Error) {
        if (error.message.includes('网络') || error.message.includes('fetch')) {
          Message.error('网络连接异常，请检查网络后重试')
        } else if (error.message.includes('权限') || error.message.includes('auth')) {
          Message.error('权限验证失败，请重新登录')
        } else if (error.message.includes('数据') || error.message.includes('data')) {
          Message.error('数据处理异常，请重试或联系管理员')
        } else {
          Message.error(errorMsg)
        }
      } else {
        Message.error(errorMsg)
      }
    }
    
    // 发送错误报告到监控系统（如果需要）
    if (typeof window !== 'undefined' && window.console) {




      console.error('组件状态:', getErrorReport())

    }
  } catch (handlerError) {
    // 错误处理器本身出错，使用最基本的错误处理

    hasError.value = true
    errorMessage.value = '系统异常，请刷新页面重试'
    Message.error('系统异常，请刷新页面重试')
  }
}

// 复制错误报告到剪贴板
const copyErrorReport = async () => {
  try {
    const report = getErrorReport()
    const reportText = `
业务流程组件错误报告
===================
时间: ${new Date().toLocaleString()}
错误信息: ${report.currentError.message}
错误上下文: ${report.currentError.context}
重试次数: ${report?.retryInfo?.count ?? 0}/${report?.retryInfo?.maxRetries ?? 0}
组件状态: ${JSON.stringify(report.componentState, null, 2)}

最近错误历史:
${report.history.map(h => `${new Date(h.timestamp).toLocaleString()} - ${h.context}: ${h.error}`).join('\n')}

错误堆栈:
${report.currentError.stack}
`
    
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(reportText)
      Message.success('错误信息已复制到剪贴板')
    } else {
      // 降级方案
      const textArea = document.createElement('textarea')
      textArea.value = reportText
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      Message.success('错误信息已复制到剪贴板')
    }
  } catch (error) {

    Message.error('复制失败，请手动复制错误信息')
  }
}

// 监听流程数据变化（防止递归更新）
let isUpdatingProcessData = false
watch(() => processData, (newData, oldData) => {
  try {
    // 防止递归更新
    if (isUpdatingProcessData) {
      return
    }
    
    // 只在数据真正变化且处于编辑阶段时处理
    if (newData && currentPhase.value === 'editing' && newData !== oldData) {
      isUpdatingProcessData = true
      
      // 使用nextTick和setTimeout双重延迟，确保DOM更新完成
      nextTick(() => {
        setTimeout(() => {
          try {
            // 再次检查阶段，确保仍在编辑状态
            if (currentPhase.value === 'editing' && !hasError.value) {
              validateCurrentStep()
            }
          } finally {
            isUpdatingProcessData = false
          }
        }, 0)
      })
    }
  } catch (error) {
    isUpdatingProcessData = false
    handleComponentError(error, '处理数据变化')
  }
}, { deep: false, flush: 'post' })

// 组件挂载时初始化
onMounted(() => {
  try {
    if (props.visible) {
      initEditor()
    }
  } catch (error) {
    handleComponentError(error)
  }
})
</script>

<style scoped>
.business-process-drawer {
  :deep(.arco-drawer-header) {
    padding: 16px 24px;
    border-bottom: 1px solid var(--color-border-2);
  }

  :deep(.arco-drawer-body) {
    padding: 0;
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  :deep(.arco-drawer-footer) {
    padding: 16px 24px;
    border-top: 1px solid var(--color-border-2);
    background: var(--color-bg-1);
  }
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 24px;
}

.drawer-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-1);
}

.progress-indicator {
  display: flex;
  align-items: center;
  gap: 12px;
}

.progress-text {
  font-size: 14px;
  color: var(--color-text-2);
  white-space: nowrap;
}

.drawer-content {
  display: flex;
  flex: 1;
  height: 100%;
  overflow: hidden;
}

.step-navigation {
  width: 200px;
  background: var(--color-bg-2);
  border-right: 1px solid var(--color-border-2);
  flex-shrink: 0;
}

.edit-area {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.step-content {
  max-width: 100%;
}

.drawer-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.footer-left {
  flex: 1;
}

.footer-right {
  display: flex;
  gap: 12px;
}

.auto-save-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--color-text-3);
}

.auto-save-status.saved {
  color: var(--color-success-6);
}

.auto-save-status.error {
  color: var(--color-danger-6);
}

.loading-icon {
  animation: spin 1s linear infinite;
}

.check-icon {
  color: var(--color-success-6);
}

.error-icon {
  color: var(--color-danger-6);
}

/* 增强的错误边界样式 */
.error-boundary {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  background: var(--color-bg-1);
}

.error-content {
  text-align: center;
  max-width: 600px;
  background: var(--color-bg-2);
  border-radius: 8px;
  padding: 32px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.error-boundary .error-icon {
  font-size: 48px;
  color: var(--color-danger-6);
  margin-bottom: 16px;
}

.error-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-1);
  margin-bottom: 8px;
}

.error-message {
  font-size: 14px;
  color: var(--color-text-2);
  margin-bottom: 24px;
  line-height: 1.5;
}

.error-details {
  margin-bottom: 24px;
  text-align: left;
}

.error-detail-item {
  margin-bottom: 12px;
  font-size: 13px;
}

.error-detail-item strong {
  color: var(--color-text-1);
  margin-right: 8px;
}

.error-stack {
  background: var(--color-bg-3);
  border: 1px solid var(--color-border-2);
  border-radius: 4px;
  padding: 12px;
  font-size: 11px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  color: var(--color-text-3);
  max-height: 200px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

.error-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-bottom: 20px;
}

.error-guidance {
  border-top: 1px solid var(--color-border-2);
  padding-top: 16px;
}

.guidance-text {
  font-size: 12px;
  color: var(--color-text-3);
  line-height: 1.4;
  margin: 0;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .business-process-drawer :deep(.arco-drawer) {
    width: 90vw !important;
  }
}

@media (max-width: 768px) {
  .business-process-drawer :deep(.arco-drawer) {
    width: 100vw !important;
  }
  
  .drawer-content {
    flex-direction: column;
  }
  
  .step-navigation {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid var(--color-border-2);
  }
  
  .edit-area {
    padding: 16px;
  }
  
  .header-left {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .progress-indicator {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .business-process-drawer :deep(.arco-drawer-header) {
    padding: 12px 16px;
  }
  
  .business-process-drawer :deep(.arco-drawer-footer) {
    padding: 12px 16px;
  }
  
  .edit-area {
    padding: 12px;
  }
  
  .drawer-title {
    font-size: 14px;
  }
  
  .footer-right {
    flex-direction: column;
    gap: 8px;
  }
}
</style>