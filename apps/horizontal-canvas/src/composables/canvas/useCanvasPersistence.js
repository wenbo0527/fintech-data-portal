/**
 * 画布持久化组合式（保存草稿 / 发布 / 提交审批）
 * 职责：
 *  - 校验画布数据（依赖注入 validateForPublish）
 *  - 持久化（依赖注入 TaskStorage 与 save/publish 服务）
 *  - 埋点（依赖注入 tracker）
 * 依赖注入：
 *  - getGraph, getTaskName, getTaskDescription, getTaskVersion, getEditingTaskId, getEditingTaskVersion,
 *    getCurrentUser, Message, validateForPublish, TaskStorage, saveTaskSvc, publishTaskSvc,
 *    tracker, onAfterSave（路由切换 / 状态切换）
 * 边界：UI 状态（taskStatus / isDirty / approvalStatus / publishReady / publishMessages）由
 *  index.vue 通过 setRefs 注入；不在 composable 中维护。
 */

export function useCanvasPersistence(deps) {
  const {
    getGraph,
    getTaskName, getTaskDescription,
    getTaskVersion, setTaskVersion,
    getIsEditMode, setIsEditMode,
    getEditingTaskId, setEditingTaskId,
    getEditingTaskVersion,
    getCurrentUser,
    Message,
    validateForPublish,
    collectCanvasData,
    TaskStorage,
    saveTaskSvc, publishTaskSvc,
    tracker,
    router,
    onShowValidation,
    setTaskStatus, setIsDirty,
    setPublishReady, setPublishMessages,
    setApprovalStatus
  } = deps || {}

  /**
   * 保存为草稿
   * 入参：无（依赖注入的所有 getXxx()）
   * 返回：Promise<boolean> 是否成功
   * 副作用：写 TaskStorage + tracker；调用 setTaskStatus/setIsDirty；跳转路由
   */
  async function saveDraft() {
    if (!getTaskName?.()) { Message?.error?.('请输入任务名称'); return false }
    const saveStart = Date.now()
    try {
      const canvasData = collectCanvasData(getGraph?.())
      const validation = validateForPublish(getGraph?.(), canvasData)
      let versionToUse = getTaskVersion?.() || 1
      if (getIsEditMode?.() && getEditingTaskId?.()) {
        const existing = TaskStorage.getTaskById(parseInt(getEditingTaskId()))
        if (existing && existing.status === 'published') {
          versionToUse = (existing.version || 1) + 1
          setTaskVersion?.(versionToUse)
        }
      }
      // 校验失败时 saveDraft 也允许保存草稿（仅当校验 pass 时才走 funnel），不阻塞用户保存
      const name = getTaskName() || '未命名任务'
      const saveMeta = {
        name, description: getTaskDescription?.() || '', version: versionToUse,
        type: 'marketing', status: 'draft',
        publishReady: validation.pass, publishMessages: validation.messages || [],
        lastValidatedAt: new Date().toISOString(),
        updateTime: new Date().toLocaleString('zh-CN'),
        creator: getCurrentUser?.()
      }
      let saved
      if (getIsEditMode?.() && getEditingTaskId?.()) {
        saved = TaskStorage.updateTask(getEditingTaskId(), { ...saveMeta, canvasData })
        Message?.success?.('已保存为草稿，可继续编辑')
      } else {
        saved = saveTaskSvc(saveMeta, canvasData)
        if (!saved || !saved.id) {
          Message?.error?.('保存失败：未生成任务ID，请稍后重试')
          return false
        }
        Message?.success?.('已保存为草稿，可继续编辑')
        setIsEditMode?.(true)
        setEditingTaskId?.(saved.id)
        router?.replace?.({ path: '/marketing/tasks/horizontal', query: { mode: 'edit', id: saved.id, version: saved.version } })
      }
      setTaskStatus?.('draft')
      setIsDirty?.(false)
      const saveMs = Date.now() - saveStart
      try { tracker.track('save_draft', { taskId: getEditingTaskId?.(), version: versionToUse, props: { durationMs: saveMs, pass: validation.pass, versionToUse } }) } catch {}
      if (validation.pass) {
        try { tracker.trackFunnelStep('canvas_creation', 'validate_pass', {}) } catch {}
        try { tracker.trackFunnelStep('canvas_creation', 'save_draft', {}) } catch {}
      } else {
        // 校验失败的 draft 不阻塞，但写埋点标记 pass=false
        try { tracker.track('save_draft', { taskId: getEditingTaskId?.(), version: versionToUse, props: { durationMs: Date.now() - saveStart, pass: false, draftWithValidationFail: true } }) } catch {}
      }
      return true
    } catch (e) {
      try { tracker.track('save_draft', { taskId: getEditingTaskId?.(), version: getTaskVersion?.(), props: { durationMs: Date.now() - saveStart, pass: false, error: String(e?.message || 'unknown') } }) } catch {}
      Message?.error?.(`保存失败: ${e?.message || '未知错误'}`)
      return false
    }
  }

  /**
   * 发布当前版本
   * 入参：无
   * 返回：Promise<boolean>
   * 副作用：写 TaskStorage + tracker；调用 setTaskStatus/setIsDirty；跳转路由
   */
  async function publish() {
    if (!getTaskName?.()) { Message?.error?.('请输入任务名称'); return false }
    const publishStart = Date.now()
    try {
      const canvasData = collectCanvasData(getGraph?.())
      const validation = validateForPublish(getGraph?.(), canvasData)
      if (!validation.pass) {
        try {
          const kinds = (validation.details || []).map(d => d.kind).filter(Boolean)
          tracker.track('validate_fail', { taskId: getEditingTaskId?.(), version: getTaskVersion?.(), props: { errorKinds: kinds, messageCount: (validation.messages || []).length } })
        } catch {}
        onShowValidation?.(validation.messages, validation.details || [])
        return false
      }
      const name = getTaskName() || '未命名任务'
      let versionToUse = getTaskVersion?.() || 1
      if (getIsEditMode?.() && getEditingTaskId?.()) {
        const existing = TaskStorage.getTaskById(parseInt(getEditingTaskId()))
        if (existing && existing.status === 'published') {
          versionToUse = (existing.version || 1) + 1
          setTaskVersion?.(versionToUse)
        }
      }
      const publishMeta = {
        name, description: getTaskDescription?.() || '', version: versionToUse,
        type: 'marketing', status: 'published',
        publishTime: new Date().toLocaleString('zh-CN'),
        updateTime: new Date().toLocaleString('zh-CN'),
        creator: getCurrentUser?.()
      }
      let saved
      if (getIsEditMode?.() && getEditingTaskId?.()) {
        saved = TaskStorage.updateTask(getEditingTaskId(), { ...publishMeta, canvasData })
        Message?.success?.(`已发布当前版本（v${versionToUse}），可在任务列表查看`)
      } else {
        saved = publishTaskSvc(publishMeta, canvasData)
        if (!saved || !saved.id) {
          Message?.error?.('发布失败：未生成任务ID，请稍后重试')
          return false
        }
        Message?.success?.(`已发布当前版本（v${versionToUse}），可在任务列表查看`)
        setIsEditMode?.(true)
        setEditingTaskId?.(saved.id)
        router?.replace?.({ path: '/marketing/tasks/horizontal', query: { mode: 'edit', id: saved.id, version: saved.version } })
      }
      setTaskStatus?.('published')
      setIsDirty?.(false)
      try {
        tracker.track('publish', { taskId: getEditingTaskId?.(), version: versionToUse, props: { durationMs: Date.now() - publishStart, version: versionToUse } })
        tracker.trackFunnelStep('canvas_creation', 'publish', { version: versionToUse })
      } catch {}
      return true
    } catch (e) {
      try { tracker.track('publish', { taskId: getEditingTaskId?.(), version: getTaskVersion?.(), props: { durationMs: Date.now() - publishStart, pass: false, error: String(e?.message || 'unknown') } }) } catch {}
      Message?.error?.(`发布失败: ${e?.message || '未知错误'}`)
      return false
    }
  }

  /**
   * 提交审批
   * 入参：无
   * 返回：Promise<boolean>
   * 副作用：调用 TaskStorage.updateTask + submitApproval；设置 approvalStatus/publishReady/publishMessages
   */
  async function submitApproval() {
    try {
      if (!getTaskName?.()) { Message?.error?.('请输入任务名称'); return false }
      const canvasData = collectCanvasData(getGraph?.())
      const validation = validateForPublish(getGraph?.(), canvasData)
      if (!validation.pass) {
        try {
          const kinds = (validation.details || []).map(d => d.kind).filter(Boolean)
          tracker.track('validate_fail', { taskId: getEditingTaskId?.(), version: getEditingTaskVersion?.(), props: { errorKinds: kinds, fromSubmitApproval: true } })
        } catch {}
        onShowValidation?.(validation.messages, validation.details || [])
        setPublishReady?.(false)
        setPublishMessages?.(validation.messages || [])
        return false
      }
      TaskStorage.updateTask(getEditingTaskId(), {
        version: getEditingTaskVersion(),
        description: getTaskDescription?.() || '',
        updateTime: new Date().toLocaleString('zh-CN'),
        publishReady: true, publishMessages: [],
        lastValidatedAt: new Date().toISOString()
      })
      const submitted = TaskStorage.submitApproval(getEditingTaskId(), getEditingTaskVersion(), getCurrentUser?.(), getTaskDescription?.() || '')
      if (submitted === false) {
        Message?.error?.('提交审批失败：未找到待提交的任务或版本，请先保存草稿')
        return false
      }
      setApprovalStatus?.('pending_approval')
      try { tracker.track('submit_approval', { taskId: getEditingTaskId?.(), version: getEditingTaskVersion?.(), props: { by: getCurrentUser?.() } }) } catch {}
      Message?.success?.('已提交审批')
      return true
    } catch (e) {
      Message?.error?.(`提交审批失败: ${e?.message || '未知错误'}`)
      return false
    }
  }

  return { saveDraft, publish, submitApproval }
}
/*
用途：画布持久化组合式（保存草稿 / 发布 / 提交审批）
说明：从 index.vue 抽出共享的"校验→写→埋点"核心；UI 状态依赖注入，由 index.vue 维护。
边界：UI 状态、路由跳转、Toast 提示均通过 deps 注入；composable 自身不维护响应式 ref。
*/