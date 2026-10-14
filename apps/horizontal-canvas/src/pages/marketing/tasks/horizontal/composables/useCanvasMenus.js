import { ref, computed } from 'vue'
import { PerformanceUtils } from '@/utils/performanceUtils.js'

/**
 * 画布右键/操作菜单组合式（节点菜单 / 边菜单 / 端口菜单）
 * 入参：
 *   - getGraph()      : () => Graph | null
 *   - getIsViewMode() : () => boolean
 *   - getContentRect() : () => DOMRect | null（用于坐标转换）
 *   - openConfigDrawer(type, node, data) : 重命名打开抽屉
 *   - createVueShapeNode(spec)           : 复制节点用
 *   - getNodeLabel(type)                 : 复制节点用
 *   - deleteNodeCascade(id)              : 级联删除
 *   - Message, Modal                    : Arco 反馈
 * 返回：
 *   { nodeActionsMenu, edgeActionsMenu, portActionsMenu,
 *     nodeActionsMenuEl, nodeActionsMenuHovering, isStartNodeMenu,
 *     getNodeActionsMenuRect, getHeaderMenuCooldownUntil,
 *     renameCurrentNode, copyCurrentNode, deleteCurrentNode,
 *     deleteCurrentEdge, deleteCurrentPortEdge,
 *     closeEdgeMenu, closePortMenu }
 * 边界：仅承担菜单状态、显隐与基础操作；删除校验、级联删除、复制节点创建均委托注入。
 */
export function useCanvasMenus(deps) {
  const {
    getGraph, getIsViewMode, getContentRect,
    openConfigDrawer, createVueShapeNode, getNodeLabel,
    deleteNodeCascade, Message, Modal,
    onTrack
  } = deps || {}

  const nodeActionsMenu = ref({ visible: false, x: 0, y: 0, nodeId: null })
  const edgeActionsMenu = ref({ visible: false, x: 0, y: 0, edgeId: null })
  const portActionsMenu = ref({ visible: false, x: 0, y: 0, nodeId: null, portId: null, edgeId: null })

  const nodeActionsMenuEl = ref(null)
  const nodeActionsMenuHovering = ref(false)

  const isStartNodeMenu = computed(() => {
    try {
      const nid = nodeActionsMenu.value.nodeId
      if (!nid) return false
      const graph = getGraph()
      if (!graph) return false
      const node = graph.getCellById(nid)
      const data = node?.getData?.() || {}
      const t = data?.type || data?.nodeType
      return t === 'start'
    } catch { return false }
  })

  const getNodeActionsMenuRect = () => {
    try { return nodeActionsMenuEl.value?.getBoundingClientRect?.() || null } catch { return null }
  }

  let headerMenuCooldownUntil = 0
  const getHeaderMenuCooldownUntil = () => headerMenuCooldownUntil

  // 节点操作
  function renameCurrentNode() {
    const nodeId = nodeActionsMenu.value.nodeId
    const graph = getGraph()
    if (!nodeId || !graph) return
    const node = graph.getCellById(nodeId)
    if (!node) return
    const data = node.getData?.() || {}
    const nodeType = data?.type || data?.nodeType
    if (nodeType && typeof openConfigDrawer === 'function') {
      openConfigDrawer(nodeType, node, data)
    }
    nodeActionsMenu.value.visible = false
  }

  function copyCurrentNode() {
    const nodeId = nodeActionsMenu.value.nodeId
    const graph = getGraph()
    if (!nodeId || !graph) return
    const node = graph.getCellById(nodeId)
    if (!node) return
    const data = node.getData?.() || {}
    const pos = node.getPosition?.() || { x: 0, y: 0 }
    const nodeType = data?.type || data?.nodeType
    if (nodeType === 'start') {
      try { Message.warning('开始节点不支持复制') } catch {}
      nodeActionsMenu.value.visible = false
      return
    }
    if (!nodeType) return
    const label = (typeof getNodeLabel === 'function' && getNodeLabel(nodeType)) || nodeType
    const fourOutTypes = ['crowd-split', 'event-split', 'ab-test']
    const outCount = fourOutTypes.includes(nodeType) ? 4 : 1
    const newNodeId = `${nodeType}-copy-${Date.now()}`
    graph.addNode(createVueShapeNode({
      id: newNodeId,
      x: pos.x + 40,
      y: pos.y + 40,
      label,
      outCount,
      data: { ...data, nodeName: `${data?.nodeName || label}_副本` }
    }))
    try { onTrack && onTrack('node_action_copy', { nodeType }) } catch {}
    headerMenuCooldownUntil = Date.now() + 600
    nodeActionsMenu.value.visible = false
  }

  function deleteCurrentNode() {
    const nodeId = nodeActionsMenu.value.nodeId
    if (!nodeId) return
    const graph = getGraph()
    if (!graph) return
    let capturedNodeType = ''
    try {
      const node = graph.getCellById(nodeId)
      const data = node?.getData?.() || {}
      const nodeType = data?.type || data?.nodeType
      capturedNodeType = String(nodeType || '')
      if (nodeType === 'start') {
        try { Message.warning('开始节点不支持删除') } catch {}
        nodeActionsMenu.value.visible = false
        return
      }
    } catch {}
    Modal.confirm({
      title: '删除节点确认',
      content: '删除该节点将移除与其相关的连接线，且不可恢复，是否继续？',
      okText: '删除',
      cancelText: '取消',
      hideCancel: false,
      onOk: () => {
        deleteNodeCascade(nodeId)
        try { onTrack && onTrack('node_action_delete', { nodeType: capturedNodeType }) } catch {}
        Message.success('节点已删除')
        nodeActionsMenu.value.visible = false
      }
    })
  }

  // 边/端口操作
  function deleteCurrentEdge() {
    const id = edgeActionsMenu.value.edgeId
    const graph = getGraph()
    if (!id || !graph) return
    if (getIsViewMode()) { edgeActionsMenu.value = { visible: false, x: 0, y: 0, edgeId: null }; return }
    Modal.confirm({
      title: '删除连接确认',
      content: '确定删除该连接线？',
      okText: '删除',
      cancelText: '取消',
      onOk: () => {
        try { graph.removeEdge(id) } catch {}
        Message.success('连接线已删除')
        edgeActionsMenu.value = { visible: false, x: 0, y: 0, edgeId: null }
      }
    })
  }

  function deleteCurrentPortEdge() {
    const id = portActionsMenu.value.edgeId
    const graph = getGraph()
    if (!id || !graph) { portActionsMenu.value.visible = false; return }
    if (getIsViewMode()) {
      portActionsMenu.value = { visible: false, x: 0, y: 0, nodeId: null, portId: null, edgeId: null }
      return
    }
    Modal.confirm({
      title: '删除端口连接确认',
      content: '确定删除该端口的连接？',
      okText: '删除',
      cancelText: '取消',
      onOk: () => {
        try { graph.removeEdge(id) } catch {}
        Message.success('端口连接已删除')
        portActionsMenu.value = { visible: false, x: 0, y: 0, nodeId: null, portId: null, edgeId: null }
      }
    })
  }

  function closePortMenu() {
    portActionsMenu.value = { visible: false, x: 0, y: 0, nodeId: null, portId: null, edgeId: null }
  }
  function closeEdgeMenu() {
    edgeActionsMenu.value = { visible: false, x: 0, y: 0, edgeId: null }
  }

  return {
    nodeActionsMenu, edgeActionsMenu, portActionsMenu,
    nodeActionsMenuEl, nodeActionsMenuHovering, isStartNodeMenu,
    getNodeActionsMenuRect, getHeaderMenuCooldownUntil,
    renameCurrentNode, copyCurrentNode, deleteCurrentNode,
    deleteCurrentEdge, deleteCurrentPortEdge,
    closeEdgeMenu, closePortMenu
  }
}
/*
用途：画布右键/操作菜单（节点 / 边 / 端口）
说明：抽离菜单状态、显隐节流、节点/边/端口操作；菜单数据由调用方注入（graph/viewMode/contentRect）。
边界：依赖注入式，避免直接耦合 index.vue；删除/复制委托注入函数，自身不持有持久化与历史。
*/