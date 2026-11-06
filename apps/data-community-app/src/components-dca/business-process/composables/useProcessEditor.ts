import { ref, reactive, computed, watch, readonly } from 'vue'
import { Message } from '@arco-design/web-vue'
import { v4 as uuidv4 } from 'uuid'

// 数据类型定义
export interface TableItem {
  name: string
  description: string
  type: string
  owner: string
}

export interface MetricItem {
  name: string
  description: string
  category: string
  level: string
  unit?: string
  formula?: string
}

export interface ProcessStep {
  id: string
  name: string
  description?: string
  tables: TableItem[]
  metrics: MetricItem[]
}

export interface BasicInfo {
  name: string
  description: string
  businessType: string
  productType: string
  priority: string
  tags: string[]
}

export interface ProcessData {
  id?: string
  basicInfo: BasicInfo
  steps: ProcessStep[]
  lastSaved?: Date
}

export interface ValidationResult {
  isValid: boolean
  errors: string[]
}

// 步骤定义
export const EDIT_STEPS = [
  { key: 'basic', title: '基本信息', description: '配置流程基本信息' },
  { key: 'steps', title: '步骤管理', description: '管理流程步骤' },
  { key: 'config', title: '步骤配置', description: '配置步骤详情' },
  { key: 'preview', title: '预览确认', description: '预览并确认配置' }
] as const

export type EditStepKey = typeof EDIT_STEPS[number]['key']

// 默认基本信息数据
const createDefaultBasicInfo = (): BasicInfo => ({
  name: '',
  description: '',
  businessType: '',
  productType: '',
  priority: 'medium',
  tags: []
})

// 默认流程数据
const createDefaultProcessData = (): ProcessData => ({
  basicInfo: createDefaultBasicInfo(),
  steps: []
})

// 创建默认步骤
const createDefaultStep = (): ProcessStep => ({
  id: uuidv4(),
  name: '',
  description: '',
  tables: [],
  metrics: []
})

export function useProcessEditor(initialData?: Partial<ProcessData>) {
  // 响应式数据
  const currentStep = ref<EditStepKey>('basic')
  const currentStepIndex = ref(0)
  const processData = reactive<ProcessData>({
    ...createDefaultProcessData(),
    ...initialData
  })
  const originalData = ref<ProcessData | null>(null)
  const isModified = ref(false)
  const validationErrors = ref<Record<string, string[]>>({})

  // 计算属性
  const currentStepConfig = computed(() => {
    return EDIT_STEPS[currentStepIndex.value]
  })

  const canGoNext = computed(() => {
    return currentStepIndex.value < EDIT_STEPS.length - 1
  })

  const canGoPrev = computed(() => {
    return currentStepIndex.value > 0
  })

  const isFirstStep = computed(() => {
    return currentStepIndex.value === 0
  })

  const isLastStep = computed(() => {
    return currentStepIndex.value === EDIT_STEPS.length - 1
  })

  const completedSteps = computed(() => {
    const completed: EditStepKey[] = []
    
    // 基本信息步骤
    if (processData.basicInfo?.name && processData.basicInfo?.businessType && processData.basicInfo?.productType) {
      completed.push('basic')
    }
    
    // 步骤管理
    if (processData.steps.length > 0) {
      completed.push('steps')
    }
    
    // 步骤配置
    const hasConfiguredSteps = processData.steps.some(step => 
      step.name && (step.tables.length > 0 || step.metrics.length > 0)
    )
    if (hasConfiguredSteps) {
      completed.push('config')
    }
    
    // 预览步骤（如果前面都完成了）
    if (completed.length === 3) {
      completed.push('preview')
    }
    
    return completed
  })

  const totalTables = computed(() => {
    const tableNames = new Set()
    processData.steps.forEach(step => {
      step.tables.forEach(table => tableNames.add(table.name))
    })
    return tableNames.size
  })

  const totalMetrics = computed(() => {
    const metricNames = new Set()
    processData.steps.forEach(step => {
      step.metrics.forEach(metric => metricNames.add(metric.name))
    })
    return metricNames.size
  })

  // 初始化
  const initializeEditor = (data?: Partial<ProcessData>) => {
    if (data) {
      Object.assign(processData, createDefaultProcessData(), data)
      originalData.value = JSON.parse(JSON.stringify(processData))
    } else {
      Object.assign(processData, createDefaultProcessData())
      originalData.value = null
    }
    currentStep.value = 'basic'
    currentStepIndex.value = 0
    isModified.value = false
    validationErrors.value = {}
  }

  // 步骤导航
  const goToStep = (stepKey: EditStepKey) => {
    const stepIndex = EDIT_STEPS.findIndex(step => step.key === stepKey)
    if (stepIndex !== -1) {
      currentStep.value = stepKey
      currentStepIndex.value = stepIndex
    }
  }

  const nextStep = () => {
    if (canGoNext.value) {
      const nextIndex = currentStepIndex.value + 1
      currentStep.value = EDIT_STEPS[nextIndex].key
      currentStepIndex.value = nextIndex
    }
  }

  const prevStep = () => {
    if (canGoPrev.value) {
      const prevIndex = currentStepIndex.value - 1
      currentStep.value = EDIT_STEPS[prevIndex].key
      currentStepIndex.value = prevIndex
    }
  }

  // 步骤管理
  const addStep = () => {
    const newStep = createDefaultStep()
    newStep.name = `步骤 ${processData.steps.length + 1}`
    processData.steps.push(newStep)
    markAsModified()
    return newStep
  }

  const removeStep = (stepId: string) => {
    const index = processData.steps.findIndex(step => step.id === stepId)
    if (index > -1) {
      processData.steps.splice(index, 1)
      markAsModified()
    }
  }

  const moveStepUp = (stepId: string) => {
    const index = processData.steps.findIndex(step => step.id === stepId)
    if (index > 0) {
      const step = processData.steps.splice(index, 1)[0]
      processData.steps.splice(index - 1, 0, step)
      markAsModified()
    }
  }

  const moveStepDown = (stepId: string) => {
    const index = processData.steps.findIndex(step => step.id === stepId)
    if (index < processData.steps.length - 1) {
      const step = processData.steps.splice(index, 1)[0]
      processData.steps.splice(index + 1, 0, step)
      markAsModified()
    }
  }

  const duplicateStep = (stepId: string) => {
    const index = processData.steps.findIndex(step => step.id === stepId)
    if (index > -1) {
      const originalStep = processData.steps[index]
      const duplicatedStep: ProcessStep = {
        ...JSON.parse(JSON.stringify(originalStep)),
        id: uuidv4(),
        name: `${originalStep.name} (副本)`
      }
      processData.steps.splice(index + 1, 0, duplicatedStep)
      markAsModified()
      return duplicatedStep
    }
    return null
  }

  // 步骤配置
  const updateStepBasicInfo = (stepId: string, updates: Partial<Pick<ProcessStep, 'name' | 'description'>>) => {
    const step = processData.steps.find(s => s.id === stepId)
    if (step) {
      Object.assign(step, updates)
      markAsModified()
    }
  }

  const updateStepTables = (stepId: string, tables: TableItem[]) => {
    const step = processData.steps.find(s => s.id === stepId)
    if (step) {
      step.tables = [...tables]
      markAsModified()
    }
  }

  const updateStepMetrics = (stepId: string, metrics: MetricItem[]) => {
    const step = processData.steps.find(s => s.id === stepId)
    if (step) {
      step.metrics = [...metrics]
      markAsModified()
    }
  }

  // 基本信息更新
  const updateBasicInfo = (updates: Partial<Omit<ProcessData, 'steps'>>) => {
    Object.assign(processData, updates)
    markAsModified()
  }

  // 标签管理
  const addTag = (tag: string) => {
    if (tag && !processData.basicInfo.tags.includes(tag)) {
      processData.basicInfo.tags.push(tag)
      markAsModified()
    }
  }

  const removeTag = (tag: string) => {
    const index = processData.basicInfo.tags.indexOf(tag)
    if (index > -1) {
      processData.basicInfo.tags.splice(index, 1)
      markAsModified()
    }
  }

  // 验证
  const validateBasicInfo = (): ValidationResult => {
    const errors: string[] = []
    
    if (!processData.basicInfo?.name?.trim()) {
      errors.push('流程名称不能为空')
    }
    
    if (!processData.basicInfo?.businessType) {
      errors.push('请选择业务类型')
    }
    
    if (!processData.basicInfo?.productType) {
      errors.push('请选择产品类型')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }

  const validateSteps = (): ValidationResult => {
    const errors: string[] = []
    
    if (processData.steps.length === 0) {
      errors.push('至少需要添加一个步骤')
    }
    
    processData.steps.forEach((step, index) => {
      if (!step.name.trim()) {
        errors.push(`步骤 ${index + 1} 的名称不能为空`)
      }
    })
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }

  const validateStepConfig = (): ValidationResult => {
    const errors: string[] = []
    
    const hasConfiguredSteps = processData.steps.some(step => 
      step.tables.length > 0 || step.metrics.length > 0
    )
    
    if (!hasConfiguredSteps) {
      errors.push('至少需要为一个步骤配置数据表或指标')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }

  const validateCurrentStep = (): ValidationResult => {
    switch (currentStep.value) {
      case 'basic':
        return validateBasicInfo()
      case 'steps':
        return validateSteps()
      case 'config':
        return validateStepConfig()
      case 'preview':
        return { isValid: true, errors: [] }
      default:
        return { isValid: true, errors: [] }
    }
  }

  const validateAll = (): ValidationResult => {
    const basicResult = validateBasicInfo()
    const stepsResult = validateSteps()
    const configResult = validateStepConfig()
    
    const allErrors = [
      ...basicResult.errors,
      ...stepsResult.errors,
      ...configResult.errors
    ]
    
    return {
      isValid: allErrors.length === 0,
      errors: allErrors
    }
  }

  // 修改状态管理
  const markAsModified = () => {
    isModified.value = true
  }

  const resetModified = () => {
    isModified.value = false
    originalData.value = JSON.parse(JSON.stringify(processData))
  }

  const hasChanges = computed(() => {
    if (!originalData.value) {return isModified.value}
    return JSON.stringify(processData) !== JSON.stringify(originalData.value)
  })

  // 重置和恢复
  const resetToOriginal = () => {
    if (originalData.value) {
      Object.assign(processData, JSON.parse(JSON.stringify(originalData.value)))
      isModified.value = false
    }
  }

  const resetForm = () => {
    Object.assign(processData, createDefaultProcessData())
    currentStep.value = 'basic'
    currentStepIndex.value = 0
    isModified.value = false
    validationErrors.value = {}
  }

  // 数据导出
  const getProcessData = (): ProcessData => {
    return JSON.parse(JSON.stringify(processData))
  }

  const getProcessSummary = () => {
    return {
      name: processData.basicInfo?.name || '',
      stepsCount: processData.steps.length,
      tablesCount: totalTables.value,
      metricsCount: totalMetrics.value,
      completionRate: Math.round((completedSteps.value.length / EDIT_STEPS.length) * 100)
    }
  }

  // 监听数据变化
  watch(
    () => processData,
    () => {
      if (originalData.value) {
        isModified.value = JSON.stringify(processData) !== JSON.stringify(originalData.value)
      }
    },
    { deep: true }
  )

  return {
    // 状态
    currentStep: readonly(currentStep),
    currentStepIndex: readonly(currentStepIndex),
    processData,
    isModified: readonly(isModified),
    validationErrors: readonly(validationErrors),
    
    // 计算属性
    currentStepConfig,
    canGoNext,
    canGoPrev,
    isFirstStep,
    isLastStep,
    completedSteps,
    totalTables,
    totalMetrics,
    hasChanges,
    
    // 方法
    initializeEditor,
    goToStep,
    nextStep,
    prevStep,
    addStep,
    removeStep,
    moveStepUp,
    moveStepDown,
    duplicateStep,
    updateStepBasicInfo,
    updateStepTables,
    updateStepMetrics,
    updateBasicInfo,
    addTag,
    removeTag,
    validateBasicInfo,
    validateSteps,
    validateStepConfig,
    validateCurrentStep,
    validateAll,
    markAsModified,
    resetModified,
    resetToOriginal,
    resetForm,
    getProcessData,
    getProcessSummary
  }
}

export type ProcessEditor = ReturnType<typeof useProcessEditor>