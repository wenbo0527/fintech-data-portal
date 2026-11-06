import { ref, watch, onUnmounted, readonly } from 'vue'
import { Message } from '@arco-design/web-vue'
import type { ProcessData } from './useProcessEditor'

export interface AutoSaveOptions {
  /** 自动保存间隔（毫秒），默认30秒 */
  interval?: number
  /** 是否启用自动保存，默认true */
  enabled?: boolean
  /** 保存前的验证函数 */
  validator?: (data: ProcessData) => boolean
  /** 自定义保存函数 */
  saveFunction?: (data: ProcessData) => Promise<void>
  /** 是否在页面卸载时保存 */
  saveOnUnload?: boolean
  /** 最大重试次数 */
  maxRetries?: number
  /** 智能保存配置 */
  smartSave?: {
    /** 是否启用智能保存 */
    enabled?: boolean
    /** 最小保存间隔（毫秒） */
    minInterval?: number
    /** 最大保存间隔（毫秒） */
    maxInterval?: number
    /** 数据变化阈值（字符数） */
    changeThreshold?: number
    /** 用户活动检测间隔（毫秒） */
    activityCheckInterval?: number
    /** 用户空闲时间阈值（毫秒） */
    idleThreshold?: number
  }
  /** 性能优化配置 */
  performance?: {
    /** 是否启用防抖 */
    debounce?: boolean
    /** 防抖延迟（毫秒） */
    debounceDelay?: number
    /** 是否启用压缩 */
    compression?: boolean
    /** 批量保存大小 */
    batchSize?: number
  }
}

export interface AutoSaveState {
  /** 是否正在保存 */
  isSaving: boolean
  /** 最后保存时间 */
  lastSaveTime: Date | null
  /** 保存状态 */
  saveStatus: 'idle' | 'saving' | 'success' | 'error'
  /** 错误信息 */
  errorMessage: string
  /** 重试次数 */
  retryCount: number
  /** 智能保存状态 */
  smartSave: {
    /** 当前保存间隔 */
    currentInterval: number
    /** 用户是否活跃 */
    isUserActive: boolean
    /** 最后用户活动时间 */
    lastActivityTime: Date | null
    /** 数据变化量 */
    changeAmount: number
    /** 保存策略 */
    strategy: 'immediate' | 'delayed' | 'idle' | 'batch'
  }
  /** 性能统计 */
  performance: {
    /** 总保存次数 */
    totalSaves: number
    /** 成功保存次数 */
    successfulSaves: number
    /** 平均保存时间（毫秒） */
    averageSaveTime: number
    /** 数据压缩率 */
    compressionRatio: number
  }
}

// 默认保存函数（模拟API调用）
const defaultSaveFunction = async (data: ProcessData): Promise<void> => {
  return new Promise((resolve, reject) => {
    // 模拟网络延迟
    setTimeout(() => {
      try {
        // 模拟保存到localStorage
        const key = `business_process_draft_${data.id || 'new'}`
        const saveData = {
          ...data,
          lastSaved: new Date().toISOString(),
          version: Date.now()
        }
        localStorage.setItem(key, JSON.stringify(saveData))
        resolve()
      } catch (error) {
        reject(new Error('保存失败：存储空间不足'))
      }
    }, 500 + Math.random() * 1000) // 0.5-1.5秒随机延迟
  })
}

// 默认验证函数
const defaultValidator = (data: ProcessData): boolean => {
  return !!(data.basicInfo?.name && data.basicInfo.name.trim())
}

export function useAutoSave(
  getData: () => ProcessData,
  options: AutoSaveOptions = {}
) {
  const {
    interval = 30000, // 30秒
    enabled = true,
    validator = defaultValidator,
    saveFunction = defaultSaveFunction,
    saveOnUnload = true,
    maxRetries = 3,
    smartSave = {
      enabled: true,
      minInterval: 5000, // 5秒
      maxInterval: 120000, // 2分钟
      changeThreshold: 50, // 50个字符
      activityCheckInterval: 1000, // 1秒
      idleThreshold: 30000 // 30秒
    },
    performance = {
      debounce: true,
      debounceDelay: 1000, // 1秒
      compression: false,
      batchSize: 10
    }
  } = options

  // 状态管理
  const state = ref<AutoSaveState>({
    isSaving: false,
    lastSaveTime: null,
    saveStatus: 'idle',
    errorMessage: '',
    retryCount: 0,
    smartSave: {
      currentInterval: interval,
      isUserActive: true,
      lastActivityTime: new Date(),
      changeAmount: 0,
      strategy: 'delayed'
    },
    performance: {
      totalSaves: 0,
      successfulSaves: 0,
      averageSaveTime: 0,
      compressionRatio: 1.0
    }
  })

  const isEnabled = ref(enabled)
  const saveTimer = ref<NodeJS.Timeout | null>(null)
  const lastSavedData = ref<string>('')
  
  // 智能保存相关状态
  const activityTimer = ref<NodeJS.Timeout | null>(null)
  const debounceTimer = ref<NodeJS.Timeout | null>(null)
  const saveQueue = ref<Array<{ data: ProcessData; timestamp: number }>>([])
  const saveHistory = ref<Array<{ timestamp: number; duration: number; success: boolean }>>([])
  const lastChangeTime = ref<Date | null>(null)

  // 智能保存核心功能
  
  // 检测用户活动
  const detectUserActivity = () => {
    state.value.smartSave.isUserActive = true
    state.value.smartSave.lastActivityTime = new Date()
    
    // 重置空闲检测定时器
    if (activityTimer.value) {
      clearTimeout(activityTimer.value)
    }
    
    activityTimer.value = setTimeout(() => {
      state.value.smartSave.isUserActive = false
    }, smartSave.idleThreshold)
  }
  
  // 计算智能保存间隔
  const calculateSmartInterval = (): number => {
    if (!smartSave.enabled) {
      return interval
    }
    
    const { isUserActive, changeAmount } = state.value.smartSave
    const { successfulSaves, totalSaves } = state.value.performance
    
    // 基础间隔
    let smartInterval = interval
    
    // 根据用户活动调整
    if (isUserActive) {
      // 用户活跃时缩短间隔
      smartInterval = Math.max(smartSave.minInterval, smartInterval * 0.5)
    } else {
      // 用户空闲时延长间隔
      smartInterval = Math.min(smartSave.maxInterval, smartInterval * 1.5)
    }
    
    // 根据数据变化量调整
    if (changeAmount > smartSave.changeThreshold) {
      // 变化较大时缩短间隔
      smartInterval = Math.max(smartSave.minInterval, smartInterval * 0.7)
    }
    
    // 根据保存成功率调整
    const successRate = totalSaves > 0 ? successfulSaves / totalSaves : 1
    if (successRate < 0.8) {
      // 成功率低时延长间隔
      smartInterval = Math.min(smartSave.maxInterval, smartInterval * 1.2)
    }
    
    return Math.round(smartInterval)
  }
  
  // 选择保存策略
  const selectSaveStrategy = (dataSize: number): 'immediate' | 'delayed' | 'idle' | 'batch' => {
    if (!smartSave.enabled) {
      return 'delayed'
    }
    
    const { isUserActive, changeAmount } = state.value.smartSave
    
    // 立即保存：重要数据变化或用户明确操作
    if (changeAmount > smartSave.changeThreshold * 2) {
      return 'immediate'
    }
    
    // 批量保存：数据量大且用户空闲
    if (dataSize > 10000 && !isUserActive) {
      return 'batch'
    }
    
    // 空闲保存：用户不活跃
    if (!isUserActive) {
      return 'idle'
    }
    
    // 默认延迟保存
    return 'delayed'
  }
  
  // 压缩数据
  const compressData = (data: string): string => {
    if (!performance.compression) {
      return data
    }
    
    try {
      // 简单的压缩算法：移除多余空格和换行
      const compressed = data
        .replace(/\s+/g, ' ')
        .replace(/\n\s*/g, '\n')
        .trim()
      
      const originalSize = data.length
      const compressedSize = compressed.length
      state.value.performance.compressionRatio = originalSize > 0 ? compressedSize / originalSize : 1
      
      return compressed
    } catch (error) {

      return data
    }
  }
  
  // 防抖保存
  const debouncedSave = (data: ProcessData, isManual = false) => {
    if (!performance.debounce || isManual) {
      return performSave(isManual)
    }
    
    if (debounceTimer.value) {
      clearTimeout(debounceTimer.value)
    }
    
    debounceTimer.value = setTimeout(() => {
      performSave(false)
    }, performance.debounceDelay)
  }
  
  // 批量保存
  const batchSave = async (): Promise<boolean> => {
    if (saveQueue.value.length === 0) {
      return true
    }
    
    const batch = saveQueue.value.splice(0, performance.batchSize)
    const latestData = batch[batch.length - 1]?.data
    
    if (!latestData) {
      return false
    }
    
    return performSave(false, latestData)
  }
  
  // 更新性能统计
  const updatePerformanceStats = (duration: number, success: boolean) => {
    state.value.performance.totalSaves++
    
    if (success) {
      state.value.performance.successfulSaves++
    }
    
    // 更新平均保存时间
    const { totalSaves, averageSaveTime } = state.value.performance
    state.value.performance.averageSaveTime = 
      (averageSaveTime * (totalSaves - 1) + duration) / totalSaves
    
    // 记录保存历史
    saveHistory.value.push({
      timestamp: Date.now(),
      duration,
      success
    })
    
    // 保持历史记录在合理范围内
    if (saveHistory.value.length > 100) {
      saveHistory.value = saveHistory.value.slice(-50)
    }
  }

  // 执行保存
  const performSave = async (isManual = false, customData?: ProcessData): Promise<boolean> => {
    if (state.value.isSaving && !isManual) {
      return false
    }

    const startTime = Date.now()
    const currentData = customData || getData()
    let currentDataStr: string
    
    try {
      currentDataStr = JSON.stringify(currentData)
    } catch (serializeError) {

      if (isManual) {
        Message.error('数据序列化失败，无法保存')
      }
      updatePerformanceStats(Date.now() - startTime, false)
      return false
    }

    // 计算数据变化量
    const changeAmount = Math.abs(currentDataStr.length - lastSavedData.value.length)
    state.value.smartSave.changeAmount = changeAmount
    
    // 检查数据是否有变化
    if (!isManual && currentDataStr === lastSavedData.value) {
      return false
    }

    // 验证数据
    if (!validator(currentData)) {
      if (isManual) {
        Message.warning('数据验证失败，无法保存')
      }
      updatePerformanceStats(Date.now() - startTime, false)
      return false
    }

    // 选择保存策略
    const strategy = selectSaveStrategy(currentDataStr.length)
    state.value.smartSave.strategy = strategy
    
    // 根据策略处理保存
    if (strategy === 'batch' && !isManual) {
      saveQueue.value.push({ data: currentData, timestamp: Date.now() })
      if (saveQueue.value.length >= performance.batchSize) {
        return batchSave()
      }
      return true
    }
    
    if (strategy === 'delayed' && !isManual && performance.debounce) {
      debouncedSave(currentData, false)
      return true
    }

    state.value.isSaving = true
    state.value.saveStatus = 'saving'
    state.value.errorMessage = ''

    try {
      // 压缩数据（如果启用）
      const processedData = {
        ...currentData,
        _compressed: performance.compression
      }
      
      await saveFunction(processedData)
      
      const duration = Date.now() - startTime
      state.value.lastSaveTime = new Date()
      state.value.saveStatus = 'success'
      state.value.retryCount = 0
      lastSavedData.value = currentDataStr
      
      // 更新智能保存间隔
      state.value.smartSave.currentInterval = calculateSmartInterval()
      
      // 更新性能统计
      updatePerformanceStats(duration, true)
      
      if (isManual) {
        Message.success('保存成功')
      }
      
      return true
    } catch (error) {
      const duration = Date.now() - startTime
      state.value.saveStatus = 'error'
      state.value.errorMessage = error instanceof Error ? error.message : '保存失败'
      state.value.retryCount++
      
      // 更新性能统计
      updatePerformanceStats(duration, false)
      
      if (isManual) {
        Message.error(state.value.errorMessage)
      }
      
      // 智能重试策略
      if (state.value.retryCount < maxRetries && !isManual) {
        const retryDelay = Math.min(
          1000 * Math.pow(2, state.value.retryCount),
          smartSave.enabled ? smartSave.maxInterval / 4 : 10000
        )
        
        setTimeout(() => {
          performSave(false)
        }, retryDelay)
      }
      
      return false
    } finally {
      state.value.isSaving = false
    }
  }

  // 手动保存
  const saveNow = async (): Promise<boolean> => {
    return performSave(true)
  }

  // 启动自动保存
  const startAutoSave = () => {
    if (saveTimer.value) {
      clearInterval(saveTimer.value)
    }
    
    if (isEnabled.value && interval > 0) {
      const currentInterval = smartSave.enabled 
        ? state.value.smartSave.currentInterval 
        : interval
        
      saveTimer.value = setInterval(() => {
        performSave(false)
        
        // 动态调整间隔
        if (smartSave.enabled) {
          const newInterval = calculateSmartInterval()
          if (newInterval !== state.value.smartSave.currentInterval) {
            state.value.smartSave.currentInterval = newInterval
            startAutoSave() // 重启定时器以应用新间隔
          }
        }
      }, currentInterval)
    }
  }

  // 停止自动保存
  const stopAutoSave = () => {
    if (saveTimer.value) {
      clearInterval(saveTimer.value)
      saveTimer.value = null
    }
    
    if (activityTimer.value) {
      clearTimeout(activityTimer.value)
      activityTimer.value = null
    }
    
    if (debounceTimer.value) {
      clearTimeout(debounceTimer.value)
      debounceTimer.value = null
    }
  }

  // 启用/禁用自动保存
  const setEnabled = (enabled: boolean) => {
    isEnabled.value = enabled
    if (enabled) {
      startAutoSave()
    } else {
      stopAutoSave()
    }
  }

  // 重置状态
  const resetState = () => {
    state.value = {
      isSaving: false,
      lastSaveTime: null,
      saveStatus: 'idle',
      errorMessage: '',
      retryCount: 0,
      smartSave: {
        currentInterval: interval,
        isUserActive: true,
        lastActivityTime: new Date(),
        changeAmount: 0,
        strategy: 'delayed'
      },
      performance: {
        totalSaves: 0,
        successfulSaves: 0,
        averageSaveTime: 0,
        compressionRatio: 1.0
      }
    }
    lastSavedData.value = ''
    saveQueue.value = []
    saveHistory.value = []
    lastChangeTime.value = null
  }

  // 获取保存状态文本
  const getSaveStatusText = (): string => {
    switch (state.value.saveStatus) {
      case 'idle':
        return '未保存'
      case 'saving':
        return '保存中...'
      case 'success':
        return state.value.lastSaveTime 
          ? `已保存 ${formatTime(state.value.lastSaveTime)}`
          : '已保存'
      case 'error':
        return `保存失败: ${state.value.errorMessage}`
      default:
        return '未知状态'
    }
  }

  // 格式化时间
  const formatTime = (date: Date): string => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    if (diff < 60000) { // 1分钟内
      return '刚刚'
    } else if (diff < 3600000) { // 1小时内
      return `${Math.floor(diff / 60000)}分钟前`
    } else if (diff < 86400000) { // 24小时内
      return `${Math.floor(diff / 3600000)}小时前`
    } else {
      return date.toLocaleDateString()
    }
  }

  // 从本地存储恢复数据
  const loadDraft = (processId?: string): ProcessData | null => {
    try {
      const key = `business_process_draft_${processId || 'new'}`
      const saved = localStorage.getItem(key)
      if (saved) {
        const data = JSON.parse(saved)
        return data
      }
    } catch (error) {

    }
    return null
  }

  // 清除草稿
  const clearDraft = (processId?: string) => {
    try {
      const key = `business_process_draft_${processId || 'new'}`
      localStorage.removeItem(key)
    } catch (error) {

    }
  }

  // 获取所有草稿
  const getAllDrafts = (): Array<{ key: string; data: ProcessData }> => {
    const drafts: Array<{ key: string; data: ProcessData }> = []
    
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('business_process_draft_')) {
          const data = localStorage.getItem(key)
          if (data) {
            try {
              const parsed = JSON.parse(data)
              drafts.push({ key, data: parsed })
            } catch (error) {

            }
          }
        }
      }
    } catch (error) {

    }
    
    return drafts.sort((a, b) => 
      new Date(b.data.lastSaved || 0).getTime() - new Date(a.data.lastSaved || 0).getTime()
    )
  }
  
  // 智能保存：根据上下文自动选择最佳保存策略
  const smartSaveFunction = async (context?: 'user_action' | 'auto' | 'idle' | 'before_unload'): Promise<boolean> => {
    if (!options.smartSave.enabled) {
      return performSave(context === 'user_action')
    }
    
    const currentData = getData()
    const dataSize = JSON.stringify(currentData).length
    
    // 根据上下文调整策略
    switch (context) {
      case 'user_action':
        // 用户主动操作，立即保存
        return performSave(true)
        
      case 'before_unload':
        // 页面卸载前，同步保存到本地存储
        try {
          const key = `business_process_draft_${currentData.id || 'new'}`
          const saveData = {
            ...currentData,
            lastSaved: new Date().toISOString(),
            version: Date.now()
          }
          localStorage.setItem(key, JSON.stringify(saveData))
          return true
        } catch (error) {

          return false
        }
        
      case 'idle':
        // 用户空闲时，批量保存或延迟保存
        if (saveQueue.value.length > 0) {
          return batchSave()
        }
        return performSave(false)
        
      default: {
        // 自动保存，使用智能策略
        const strategy = selectSaveStrategy(dataSize)
        state.value.smartSave.strategy = strategy
        
        switch (strategy) {
          case 'immediate':
            return performSave(false)
          case 'batch':
            saveQueue.value.push({ data: currentData, timestamp: Date.now() })
            if (saveQueue.value.length >= performance.batchSize) {
              return batchSave()
            }
            return true
          case 'delayed':
            return debouncedSave(currentData, false)
          default:
            return performSave(false)
        }
      }
    }
  }
  
  // 获取性能报告
  const getPerformanceReport = () => {
    const { performance: perf, smartSave: smart } = state.value
    const recentHistory = saveHistory.value.slice(-20)
    
    return {
      totalSaves: perf.totalSaves,
      successRate: perf.totalSaves > 0 ? (perf.successfulSaves / perf.totalSaves * 100).toFixed(1) + '%' : '0%',
      averageSaveTime: perf.averageSaveTime.toFixed(0) + 'ms',
      compressionRatio: (perf.compressionRatio * 100).toFixed(1) + '%',
      currentInterval: smart.currentInterval + 'ms',
      currentStrategy: smart.strategy,
      isUserActive: smart.isUserActive,
      queueSize: saveQueue.value.length,
      recentSaves: recentHistory.map(h => ({
        timestamp: new Date(h.timestamp).toLocaleTimeString(),
        duration: h.duration + 'ms',
        success: h.success
      }))
    }
  }
  
  // 优化建议
  const getOptimizationSuggestions = (): string[] => {
    const suggestions: string[] = []
    const { performance: perf, smartSave: smart } = state.value
    
    if (perf.totalSaves > 10) {
      const successRate = perf.successfulSaves / perf.totalSaves
      
      if (successRate < 0.8) {
        suggestions.push('保存成功率较低，建议检查网络连接或增加重试间隔')
      }
      
      if (perf.averageSaveTime > 3000) {
        suggestions.push('保存时间较长，建议启用数据压缩或减少保存频率')
      }
      
      if (smart.currentInterval < smartSave.minInterval * 2) {
        suggestions.push('保存频率过高，可能影响性能，建议调整变化阈值')
      }
      
      if (saveQueue.value.length > performance.batchSize * 2) {
        suggestions.push('保存队列积压较多，建议增加批量大小或减少保存间隔')
      }
    }
    
    if (suggestions.length === 0) {
      suggestions.push('当前保存策略运行良好')
    }
    
    return suggestions
  }

  // 页面卸载时保存
  const handleBeforeUnload = (event: BeforeUnloadEvent) => {
    if (saveOnUnload && isEnabled.value) {
      const currentData = getData()
      const currentDataStr = JSON.stringify(currentData)
      
      if (currentDataStr !== lastSavedData.value && validator(currentData)) {
        // 同步保存（页面卸载时异步操作可能被中断）
        try {
          const key = `business_process_draft_${currentData.id || 'new'}`
          const saveData = {
            ...currentData,
            lastSaved: new Date().toISOString(),
            version: Date.now()
          }
          localStorage.setItem(key, JSON.stringify(saveData))
        } catch (error) {

        }
        
        // 提示用户有未保存的更改
        event.preventDefault()
        event.returnValue = '您有未保存的更改，确定要离开吗？'
        return '您有未保存的更改，确定要离开吗？'
      }
    }
  }

  // 设置用户活动监听
  const setupActivityListeners = () => {
    if (typeof window === 'undefined' || !smartSave.enabled) {
      return
    }
    
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart']
    
    const handleActivity = () => {
      detectUserActivity()
    }
    
    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true })
    })
    
    // 清理函数
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity)
      })
    }
  }
  
  // 监听数据变化
  watch(
    getData,
    (newData) => {
      try {
        // 确保数据存在且有效
        if (!newData || typeof newData !== 'object') {

          return
        }
        
        // 确保enabled属性存在，添加更严格的检查
        if (typeof isEnabled.value === 'undefined' || isEnabled.value === null) {

          isEnabled.value = true
        }
        
        // 检查是否启用自动保存
        if (!isEnabled.value) {

          return
        }
        
        // 增强的数据验证
        let dataStr: string
        try {
          // 检查循环引用
          const seen = new WeakSet()
          const checkCircular = (obj: any): any => {
            if (obj !== null && typeof obj === 'object') {
              if (seen.has(obj)) {
                return '[Circular Reference]'
              }
              seen.add(obj)
              if (Array.isArray(obj)) {
                return obj.map(checkCircular)
              }
              const result: any = {}
              for (const key in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                  result[key] = checkCircular(obj[key])
                }
              }
              return result
            }
            return obj
          }
          
          const cleanData = checkCircular(newData)
          dataStr = JSON.stringify(cleanData)
        } catch (serializationError) {

          state.value.saveStatus = 'error'
          state.value.errorMessage = '数据包含无法序列化的内容'
          return
        }
        
        // 验证数据
        if (validator(newData)) {
          if (dataStr !== lastSavedData.value) {
            lastChangeTime.value = new Date()
            
            // 使用智能保存
            if (smartSave?.enabled) {
              smartSaveFunction('auto')
            } else {
              performSave()
            }
          }
        }
      } catch (error) {

        // 记录错误但不阻止程序继续运行
        state.value.saveStatus = 'error'
        state.value.errorMessage = error instanceof Error ? error.message : '自动保存监听器执行失败'
      }
    },
    { deep: true, immediate: false, flush: 'post' }
  )

  // 初始化
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', handleBeforeUnload)
    startAutoSave()
  }

  // 设置用户活动监听
  const cleanupActivityListeners = setupActivityListeners()
  
  // 清理
  onUnmounted(() => {
    stopAutoSave()
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
    
    // 清理用户活动监听
    if (cleanupActivityListeners) {
      cleanupActivityListeners()
    }
    
    // 清理定时器
    if (activityTimer.value) {
      clearTimeout(activityTimer.value)
    }
    if (debounceTimer.value) {
      clearTimeout(debounceTimer.value)
    }
  })

  return {
    // 状态
    state: readonly(state),
    isEnabled: readonly(isEnabled),
    
    // 方法
    saveNow,
    setEnabled,
    resetState,
    getSaveStatusText,
    loadDraft,
    clearDraft,
    getAllDrafts,
    smartSave: smartSaveFunction,
    getPerformanceReport,
    getOptimizationSuggestions,
    
    // 控制
    startAutoSave,
    stopAutoSave
  }
}

export type AutoSave = ReturnType<typeof useAutoSave>