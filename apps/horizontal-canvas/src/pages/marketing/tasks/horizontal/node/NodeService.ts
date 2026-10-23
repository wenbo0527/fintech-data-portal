import { getNodeLabel } from '@/utils/nodeTypes.js'
import { createVueShapeNode } from '../createVueShapeNode.js'
import type { X6GraphLike, X6Cell, XYPoint } from '@/types/graph.js'

export type GraphLike = X6GraphLike

export interface NodePortSpec {
  id: string
  group?: string
  args?: Record<string, unknown>
  attrs?: { circle?: Record<string, unknown> }
}

export interface NodeSpecShape {
  id: string
  x: number
  y: number
  label: string
  width: number
  height: number
  ports: { items: NodePortSpec[]; groups: Record<string, unknown> }
  data: Record<string, unknown>
}

/**
 * 创建节点规格
 * 入参：nodeType(string)、config(Record<string, unknown>)、pos({ x, y })
 * 返回：NodeSpecShape（Vue Shape 节点规格对象）
 * 边界：标记 isConfigured=true；label 优先使用 config.nodeName 其后回退到类型标签
 */
export function createNodeSpec(nodeType: string, config: Record<string, unknown>, pos: XYPoint): NodeSpecShape {
  const label = config?.nodeName || getNodeLabel(nodeType) || nodeType
  return createVueShapeNode({ id: `${nodeType}-${Date.now()}`, x: pos.x, y: pos.y, label, data: { type: nodeType, nodeType, config, isConfigured: true } })
}

/**
 * 统一更新节点（尺寸、端口映射、数据写回）
 * 入参：graph(X6GraphLike)、node(X6Cell)、nodeType(string)、config(Record<string, unknown>)
 * 返回：void
 * 边界：按 out-N 规则重映射出端口；移除旧端口并保持连接；写回 data/props 并触发 change:data
 */
export function updateNodeUnified(graph: GraphLike, node: X6Cell, nodeType: string, config: Record<string, unknown>): void {
  const pos = node.getPosition?.() || { x: 0, y: 0 }
  const label = config?.nodeName || getNodeLabel(nodeType) || nodeType
  const spec = createVueShapeNode({ id: node.id, x: pos.x, y: pos.y, label, data: { type: nodeType, nodeType, config, isConfigured: true } })
  node.resize?.(spec.width, spec.height)
  const existingPorts = node.getPorts?.() || []
  const existingIds = new Set((existingPorts || []).map((p: { id: string }) => p.id))
  const specIds = new Set((spec.ports.items || []).map((p: { id: string }) => p.id))
  node.setProp?.('ports/groups', spec.ports.groups)
  ;(existingPorts || []).forEach((p: { id: string; group?: string }) => {
    if (!specIds.has(p.id)) {
      try {
        const isOut = p.group === 'out'
        if (isOut) {
          const edges = (graph?.getOutgoingEdges?.(node) || []).filter((e: X6Cell) => {
            try { return e.getSourcePortId?.() === p.id } catch { return false }
          })
          edges.forEach((e: X6Cell) => { try { graph?.removeEdge?.(e.id) } catch {} })
        }
        node.removePort?.(p.id)
      } catch {}
    }
  })
  if (spec.ports.items && spec.ports.items.length) {
    spec.ports.items.forEach((it: NodePortSpec) => {
      if (existingIds.has(it.id)) {
        try {
          node.setPortProp?.(it.id, 'group', it.group)
          if (it.args != null) node.setPortProp?.(it.id, 'args', it.args)
          if (it.attrs?.circle) {
            const c = it.attrs.circle
            if (c['data-port'] != null) node.setPortProp?.(it.id, 'attrs/circle/data-port', c['data-port'])
            if (c['data-port-group'] != null) node.setPortProp?.(it.id, 'attrs/circle/data-port-group', c['data-port-group'])
            if (c['data-port-type'] != null) node.setPortProp?.(it.id, 'attrs/circle/data-port-type', c['data-port-type'])
          }
        } catch {}
      } else {
        node.addPort?.(it)
      }
    })
  }
  try {
    const outgoing = graph?.getOutgoingEdges?.(node) || []
    const byPort: Record<string, X6Cell[]> = {}
    outgoing.forEach((e: X6Cell) => {
      const pid = (() => { try { return e.getSourcePortId?.() } catch { return null } })()
      if (!pid) return
      if (!byPort[pid]) byPort[pid] = []
      byPort[pid].push(e)
    })
    Object.keys(byPort).forEach((pid) => {
      const list = byPort[pid]
      if (Array.isArray(list) && list.length > 1) {
        list.slice(1).forEach((e: X6Cell) => { try { graph?.removeEdge?.(e.id) } catch {} })
      }
    })
  } catch {}
  if (node.setProp) {
    if (node.setData) node.setData(spec.data)
    node.prop?.('data', spec.data)
    node.prop?.('nodeType', spec.data.nodeType)
    node.prop?.('headerTitle', spec.data.headerTitle)
    node.prop?.('displayLines', spec.data.displayLines)
    node.trigger?.('change:data', { current: spec.data, previous: node.getData?.() })
  }
}

/**
 * 保障开始节点存在
 * 入参：graph(X6GraphLike)
 * 返回：void
 * 场景：空画布或缺少 start 节点时自动补齐一个开始节点
 */
export function ensureStartNode(graph: GraphLike): void {
  const nodes = graph.getNodes?.() || []
  const hasStart = nodes.some((n: X6Cell) => { const d = n.getData?.() || {}; return d?.type === 'start' || d?.nodeType === 'start' || String(n.id).includes('start') })
  if (hasStart) return
  const startNodeId = 'start-node'
  // 开始节点的端口由 createVueShapeNode 按 nodeType==='start' 统一推导：仅有 out-0，无 in 端口
  const buildSpec = (y: number) => createVueShapeNode({ id: startNodeId, x: 60, y, label: '开始', data: { type: 'start', nodeType: 'start', isConfigured: true } })
  try {
    const rect = graph?.container?.getBoundingClientRect?.() || { width: 800, height: 600 }
    const draft = buildSpec(0)
    const y = Math.max(20, Math.round(((rect.height || 600) - (draft?.height || 120)) / 2))
    graph.addNode?.({ ...draft, y })
  } catch {
    graph.addNode?.(buildSpec(160))
  }
}
/*
用途：节点服务（创建规格、统一更新、起始节点保障）
说明：集中封装节点尺寸/端口映射/数据写回的统一路径，减少页面更新分散；必要时保障开始节点存在。
边界：不负责发布校验；端口映射遵循 out-N 规则与 in 端口回填；避免直接持久化。
*/
