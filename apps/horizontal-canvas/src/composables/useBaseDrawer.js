import { ref, reactive, computed, watch } from 'vue'

export function useBaseDrawer({ props, emit, initialFormData, formRules, getInitialFormData, customValidation, nodeType, onSubmit, onCancel }) {
  /**
   * 抽屉可见性（与 props.visible 双向同步）
   * 读取：始终反映父组件（TaskFlowConfigDrawers）传入的 visible
   * 写入：向外派发 update:visible，由父组件统一维护抽屉状态
   */
  const visible = computed({
    get: () => !!props.visible,
    set: (val) => { emit('update:visible', !!val) }
  })
  const formRef = ref(null)
  /**
   * 构建表单初始值：基础初始值 + 节点已保存的配置（config）
   * @param {Object} nodeData 当前节点数据
   * @returns {Object} 表单初始值
   */
  const buildFormData = (nodeData) => {
    const baseData = getInitialFormData ? getInitialFormData() : (initialFormData || {})
    const cfg = (nodeData && nodeData.config) ? nodeData.config : {}
    const merged = { ...baseData, ...cfg }
    if (cfg && typeof cfg.nodeName === 'string' && cfg.nodeName) merged.nodeName = cfg.nodeName
    return merged
  }
  const formData = reactive(buildFormData(props.nodeData))
  const submitting = ref(false)

  // 打开不同节点时同步表单数据，避免表单残留上一个节点的配置
  watch(() => props.nodeData, (nodeData) => {
    try {
      const next = buildFormData(nodeData)
      Object.keys(formData).forEach((key) => { if (!(key in next)) delete formData[key] })
      Object.assign(formData, next)
    } catch {}
  })

  const normalizeValidation = (res) => {
    if (res == null) return true
    if (Array.isArray(res)) return res.length === 0
    if (typeof res === 'boolean') return res
    return true
  }

  const isFormValid = computed(() => {
    try {
      const res = customValidation ? customValidation(formData) : true
      return normalizeValidation(res)
    } catch { return true }
  })
  const isValid = isFormValid

  const baseHandleSubmit = async (config) => {
    try {
      submitting.value = true
      const payload = onSubmit ? (await onSubmit(config ?? formData)) : (config ?? formData)
      emit('confirm', payload)
      emit('update:visible', false)
    } finally {
      submitting.value = false
    }
  }

  const handleSubmit = async () => {
    await baseHandleSubmit(formData)
  }

  const handleCancel = () => {
    if (onCancel) onCancel()
    emit('cancel')
    emit('update:visible', false)
  }

  const handleDebugSubmit = async () => {
    await baseHandleSubmit(formData)
  }

  return { formData, formRef, isFormValid, isValid, submitting, isSubmitting: submitting, visible, handleSubmit, handleCancel, handleDebugSubmit, handleSubmitBase: baseHandleSubmit }
}
