import { TaskStorage } from '@/utils/taskStorage.js'
import { getNodeLabel } from '@/utils/nodeTypes.js'
import { createVueShapeNode } from '../createVueShapeNode.js'
import { validateForPublishPure } from './validateForPublish.js'
import type { X6GraphLike, X6Cell, X6NodeData, CanvasData, CanvasNodeRecord, CanvasConnectionRecord, ValidationResult, TaskMeta } from '@/types/graph.js'

// 包装纯算法（内部供 validateForPublish 使用；同时供单测直接覆盖）
function runPureValidation(canvasData: CanvasData): { messages: string[]; details: Array<{ kind: string; nodeIds: string[] }>; byId: Map<string, CanvasNodeRecord> } {
  const result = validateForPublishPure(canvasData)
  const byId = new Map<string, CanvasNodeRecord>()
  if (canvasData && Array.isArray(canvasData.nodes)) canvasData.nodes.forEach((n) => byId.set(n.id, n))
  return { messages: result.messages.slice(), details: (result.details || []).slice(), byId }
}

export type GraphLike = X6GraphLike

export function collectCanvasData(graph: GraphLike): CanvasData {
  const nodes = (graph.getNodes?.() || []).map((n: X6Cell) => {
    try {
      const pos = n.getPosition?.() || { x: 0, y: 0 }
      const data = n.getData?.() || {}
      return { id: n.id, type: data.nodeType || data.type || 'node', x: pos.x, y: pos.y, label: data.nodeName || data.headerTitle || getNodeLabel(data.nodeType || data.type) || '', config: data.config || {}, isConfigured: data.isConfigured === true, branches: Array.isArray(data?.config?.branches) ? data.config.branches : [] }
    } catch {
      return { id: n.id, type: 'node', x: 0, y: 0, label: '未知节点', config: {}, isConfigured: false, branches: [] }
    }
  })
  const connections = (graph.getEdges?.() || []).map((e: X6Cell) => {
    try {
      const src = e.getSource?.() || {}
      const tgt = e.getTarget?.() || {}
      return { id: e.id, source: src.cell || (e.getSourceCell?.() ? e.getSourceCell().id : null), target: tgt.cell || (e.getTargetCell?.() ? e.getTargetCell().id : null), sourcePortId: e.getSourcePortId?.() || null, targetPortId: e.getTargetPortId?.() || null }
    } catch {
      return { id: e.id, source: null, target: null, sourcePortId: null, targetPortId: null }
    }
  })
  return { nodes: nodes as CanvasNodeRecord[], connections: connections as CanvasConnectionRecord[] }
}

/**
 * 加载画布数据到 Graph
 * 入参：graph(X6GraphLike), canvasData(CanvasData)
 * 返回：boolean（加载是否成功）
 * 细节：
 * - 清空现有 cells 并逐个创建节点与连接
 * - 出端口不存在时按未占用 out-N 回填
 * - AB 分支按 out-N 与节点 config.branches 的 id 进行 branchId 修复
 */
export function loadCanvasData(graph: GraphLike, canvasData: CanvasData): boolean {
  if (!canvasData || !Array.isArray(canvasData.nodes) || !Array.isArray(canvasData.connections)) return false
  try {
    try { graph.freeze?.() } catch {}
    graph.clearCells?.()
    const nodeMap = new Map<string, X6Cell>()
    const seenNodeIds = new Set<string>()
    const nodes = canvasData.nodes.filter((n) => {
      const id = String(n?.id || '')
      if (!id) return false
      if (seenNodeIds.has(id)) return false
      seenNodeIds.add(id)
      return true
    })
    nodes.forEach((nodeData) => {
      try {
        const position = nodeData.position || { x: nodeData.x || 100, y: nodeData.y || 100 }
        const labelText = nodeData.label || nodeData.data?.label || getNodeLabel(nodeData.type) || ''
        const nodeDataForGraph = { id: nodeData.id, x: position.x, y: position.y, label: labelText, data: { nodeType: nodeData.type, nodeName: labelText, headerTitle: labelText, config: nodeData.config || nodeData.data?.config || {}, level: nodeData.data?.level || 0, levelIndex: nodeData.data?.levelIndex || 0, isConfigured: nodeData.data?.isConfigured !== undefined ? nodeData.data.isConfigured : nodeData.isConfigured !== undefined ? nodeData.isConfigured : nodeData.type === 'start' ? true : false, branches: nodeData.branches || nodeData.data?.branches || (nodeData.config?.branches) || [] } }
        try {
          const existing = graph.getCellById?.(nodeData.id)
          if (existing) graph.removeNode?.(nodeData.id)
        } catch {}
        const node = createVueShapeNode(nodeDataForGraph)
        // 必须保存 addNode 返回的 X6 节点实例：后续端口回填依赖 getPorts()/getData()
        const added = graph.addNode?.(node) || node
        nodeMap.set(nodeData.id, added)
      } catch {}
    })
    const seenConnKeys = new Set<string>()
    const connections = canvasData.connections.filter((e) => {
      const id = String(e?.id || '')
      const key = id || `${String(e.source)}->${String(e.target)}:${String(e.sourcePort || e.sourcePortId || '')}|${String(e.targetPort || e.targetPortId || '')}`
      if (seenConnKeys.has(key)) return false
      seenConnKeys.add(key)
      return true
    })
    connections.forEach((connectionData) => {
      try {
        const sourceNode = nodeMap.get(connectionData.source)
        const targetNode = nodeMap.get(connectionData.target)
        if (sourceNode && targetNode) {
          // 端口 id 规范为 out-N / in；'out' 是"未指定"哨兵值，必然触发下方 out-N 回填
          let sourcePort = connectionData.sourcePort || connectionData.sourcePortId || 'out'
          const targetPort = connectionData.targetPort || connectionData.targetPortId || 'in'
          try {
            const outPorts = (sourceNode.getPorts?.() || []).filter((p) => p?.group === 'out')
            const outIds = outPorts.map((p) => p.id)
            if (!outIds.includes(sourcePort)) {
              const used = new Set<string>()
              const existingEdges = graph.getOutgoingEdges?.(sourceNode) || []
              existingEdges.forEach((ed) => { try { const pid = ed.getSourcePortId?.(); if (pid) used.add(pid) } catch {} })
              const firstFree = outIds.find((id) => !used.has(id)) || outIds[0] || sourcePort
              sourcePort = firstFree
            }
          } catch {}
          const edge = graph.addEdge({ id: connectionData.id, source: { cell: connectionData.source, port: sourcePort }, target: { cell: connectionData.target, port: targetPort }, router: { name: 'normal' }, connector: { name: 'smooth' }, attrs: { line: { stroke: '#4C78FF', strokeWidth: 2, targetMarker: { name: 'block', args: { size: 6, fill: '#4C78FF' } }, strokeLinecap: 'round', strokeLinejoin: 'round' } }, zIndex: 1, data: { branchId: connectionData.branchId || null, label: connectionData.label || '' } })
          try {
            const srcData = sourceNode.getData?.() || {}
            const srcType = srcData?.type || srcData?.nodeType
            if (edge && srcType === 'ab-test' && !edge.getData?.()?.branchId) {
              const match = /^out-(\d+)$/.exec(sourcePort)
              const branches = Array.isArray(srcData?.config?.branches) ? srcData.config.branches : []
              if (match) {
                const idx = Number(match[1])
                const b = branches[idx]
                if (b && b.id) { try { edge.setData({ ...(edge.getData?.() || {}), branchId: b.id }) } catch {} }
              }
            }
          } catch {}
        }
      } catch {}
    })
    try { graph.unfreeze?.() } catch {}
    return true
  } catch { return false }
}

/**
 * 保存任务（草稿）
 * 入参：meta(TaskMeta 任务元信息), canvasData(CanvasData 画布数据)
 * 返回：TaskLike（包含 id 等字段）
 */
export function saveTask(meta: TaskMeta, canvasData: CanvasData): TaskMeta {
  return TaskStorage.createTask({ ...meta, canvasData })
}

/**
 * 发布任务（状态置为 published）
 * 入参：meta(TaskMeta 任务元信息), canvasData(CanvasData 画布数据)
 * 返回：TaskLike（包含 id 等字段）
 */
export function publishTask(meta: TaskMeta, canvasData: CanvasData): TaskMeta {
  return TaskStorage.createTask({ ...meta, canvasData, status: 'published' })
}

/**
 * 发布校验（结构/配置/连通性/端口与分支完整性）
 * 入参：graph(X6GraphLike), canvasData(CanvasData)
 * 返回：ValidationResult { pass, messages, details }
 * 细节：
 * - 缺少开始节点/空画布/未配置节点/无出边节点
 * - 端口完整性：每个节点的 out 端口需有连接
 * - 分支完整性：分流/AB 节点每个分支需存在连线（按 edge.data.branchId 对齐）
 */
export function validateForPublish(graph: GraphLike, canvasData: CanvasData): ValidationResult {
  // 委托纯算法做基础校验（可被单测覆盖）
  const pure = runPureValidation(canvasData)
  const messages = pure.messages
  const details = pure.details
  const byId = pure.byId
  try {
    if (graph) {
      const missingPortConnections: string[] = []
      const missingBranchConnections: string[] = []
      const x6Nodes = graph.getNodes?.() || []
      x6Nodes.forEach((node: X6Cell) => {
        const nodeId = node.id
        const nodeData = (node.getData?.() || {}) as X6NodeData
        const nodeType: string = String(nodeData.type || nodeData.nodeType || (byId.get(nodeId)?.type || ''))
        const ports = (node.getPorts?.() || []).filter((p) => p?.group === 'out')
        if (ports.length > 0 && nodeType !== 'end') {
          const outs = graph.getOutgoingEdges?.(node) || []
          const realOuts = outs.filter((e: X6Cell) => { try { const s = e.getSourceCellId?.(); const t = e.getTargetCellId?.(); return !!s && !!t } catch { return false } })
          const connectedPortIds = new Set<string>()
          realOuts.forEach((e: X6Cell) => { try { const pid = e.getSourcePortId?.(); if (pid) connectedPortIds.add(pid) } catch {} })
          ports.forEach((p) => { if (!connectedPortIds.has(p.id)) missingPortConnections.push(`${byId.get(nodeId)?.label || nodeId}#${p.id}`) })
        }
        if (['audience-split', 'event-split', 'ab-test'].includes(nodeType)) {
          const branches = (nodeData.branches as unknown[]) || (byId.get(nodeId)?.data?.branches as unknown[]) || []
          if (Array.isArray(branches) && branches.length > 0) {
            const outs = graph.getOutgoingEdges?.(node) || []
            const realOuts = outs.filter((e: X6Cell) => { try { return !!e.getSourceCellId?.() && !!e.getTargetCellId?.() } catch { return false } })
            branches.forEach((b: { id?: string; label?: string; name?: string }) => {
              const ok = realOuts.some((e: X6Cell) => { try { const bd = (e.getData?.() || {}) as { branchId?: string }; return bd.branchId === b.id } catch { return false } })
              if (!ok) missingBranchConnections.push(`${byId.get(nodeId)?.label || nodeId}:${b.label || b.name || b.id}`)
            })
          }
        }
      })
      if (missingPortConnections.length > 0) messages.push(`以下节点的出端口未连接: ${missingPortConnections.join(', ')}`)
      if (missingBranchConnections.length > 0) messages.push(`以下分流分支未连接: ${missingBranchConnections.join(', ')}`)
    }
  } catch {}
  return { pass: messages.length === 0, messages, details }
}
/*
用途：持久化服务（采集/加载/保存/发布/发布校验）
说明：集中管理画布数据流转与校验逻辑，提供页面调用的统一入口；与 TaskStorage 集成。
边界：不负责 UI；加载时做端口回填与分支标识修复；发布校验覆盖结构/配置/连通性/端口与分支完整性。
*/
