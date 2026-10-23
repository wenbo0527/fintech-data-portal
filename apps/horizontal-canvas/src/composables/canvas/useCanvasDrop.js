/**
 * 画布拖放组合式（拖入节点 + 选择器选型）
 * 职责：
 *  - 处理 drop 事件：把 dataTransfer 中的 nodeType 翻译为新节点 / 高级组合节点
 *  - 埋点：node_drop / node_drop_fail / combo_insert / funnel first_node_drop
 * 依赖注入：
 *  - getGraph, getIsViewMode, createVueShapeNode, getNodeLabel,
 *    insertTouchComboNodes, highlightNodes,
 *    onPendingCreatePoint, onPendingInsertionEdge,
 *    Message, log, tracker,
 *    getEditingTaskId, getEditingTaskVersion
 * 边界：仅处理 drop 事件；dragover 在模板上内联处理；选择器关闭由 index.vue 调 closeNodeSelector。
 */

export function useCanvasDrop(deps) {
  const {
    getGraph, getIsViewMode,
    createVueShapeNode, getNodeLabel,
    insertTouchComboNodes,
    highlightNodes,
    setPendingCreatePoint, setPendingInsertionEdge,
    Message, log, tracker,
    getEditingTaskId, getEditingTaskVersion,
    TOUCH_COMBOS
  } = deps || {}

  /**
   * 处理拖放事件：从 dataTransfer.getData('nodeType') 创建节点
   * 入参：e(DragEvent)
   * 返回：boolean 是否成功处理
   * 副作用：调用 graph.addNode + highlightNodes；tracker 上报；失败时 Message 提示
   */
  function onCanvasDrop(e) {
    e.preventDefault?.()
    if (getIsViewMode?.()) return false
    const graph = getGraph?.()
    const nodeType = e?.dataTransfer?.getData?.('nodeType')
    if (!nodeType) return false
    const local = graph?.pageToLocal ? graph.pageToLocal(e.pageX, e.pageY) : { x: e.offsetX, y: e.offsetY }
    try {
      // 高级组合节点
      if (TOUCH_COMBOS?.[nodeType]) {
        setPendingCreatePoint?.({ x: local.x, y: local.y })
        setPendingInsertionEdge?.(null)
        const createdIds = insertTouchComboNodes?.(nodeType) || []
        if (createdIds.length) {
          highlightNodes?.(createdIds)
          try { tracker.track('combo_insert', { taskId: getEditingTaskId?.(), version: getEditingTaskVersion?.(), props: { comboType: nodeType, nodeCount: createdIds.length } }) } catch {}
        } else {
          Message?.warning?.('高级组合节点创建失败，请重试')
          try { tracker.track('node_drop_fail', { taskId: getEditingTaskId?.(), version: getEditingTaskVersion?.(), props: { nodeType, reason: 'combo_insert_failed' } }) } catch {}
        }
        return createdIds.length > 0
      }
      // 普通节点
      const label = getNodeLabel?.(nodeType) || nodeType
      const newNodeId = `${nodeType}-${Date.now()}`
      // 出端口数量与 id 统一由 createVueShapeNode 按节点类型/配置行推导
      const created = graph?.addNode?.(createVueShapeNode?.({
        id: newNodeId,
        x: local.x, y: local.y,
        label,
        data: { type: nodeType, nodeType, isConfigured: false }
      }))
      if (created) {
        highlightNodes?.([created.id])
        try {
          tracker.track('node_drop', { taskId: getEditingTaskId?.(), version: getEditingTaskVersion?.(), props: { nodeType, isCombo: false, x: local.x, y: local.y } })
          if (nodeType !== 'start') tracker.trackFunnelStep('canvas_creation', 'first_node_drop', { nodeType })
        } catch {}
        return true
      } else {
        try { tracker.track('node_drop_fail', { taskId: getEditingTaskId?.(), version: getEditingTaskVersion?.(), props: { nodeType, reason: 'addNode_failed' } }) } catch {}
        return false
      }
    } catch (err) {
      Message?.error?.('拖放创建节点失败，请重试')
      try { tracker.track('node_drop_fail', { taskId: getEditingTaskId?.(), version: getEditingTaskVersion?.(), props: { nodeType, reason: 'exception' } }) } catch {}
      log?.warn?.('拖放创建节点失败', err)
      return false
    }
  }

  return { onCanvasDrop }
}
/*
用途：画布拖放组合式
说明：从 index.vue 抽出 drop 事件处理；埋点 + Toast + highlight 集中；不持有 graph 实例。
边界：仅处理 drop 事件；dragover 在模板上内联处理；依赖注入避免直接耦合。
*/