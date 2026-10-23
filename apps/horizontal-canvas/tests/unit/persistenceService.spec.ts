import { describe, it, expect, vi } from 'vitest'
import { loadCanvasData, collectCanvasData } from '../../src/pages/marketing/tasks/horizontal/persistence/PersistenceService'

/**
 * 构造最小可用的 X6 图桩
 * 关键点：addNode 必须返回"节点实例"（含 getPorts/getData），端口回填依赖该实例
 */
function makeGraph() {
  const nodeMap = new Map<string, any>()
  const edges: any[] = []
  const graph: any = {
    freeze: vi.fn(),
    unfreeze: vi.fn(),
    clearCells: vi.fn(() => { nodeMap.clear(); edges.length = 0 }),
    getCellById: (id: string) => nodeMap.get(id),
    removeNode: vi.fn((id: string) => { nodeMap.delete(id) }),
    addNode: vi.fn((spec: any) => {
      const instance: any = {
        id: spec.id,
        _ports: (spec.ports?.items || []).map((p: any) => ({ id: p.id, group: p.group })),
        getPorts: () => instance._ports,
        getData: () => spec.data,
        getPosition: () => ({ x: spec.x, y: spec.y })
      }
      nodeMap.set(spec.id, instance)
      return instance
    }),
    getOutgoingEdges: (node: any) => edges.filter((e) => e.source.cell === node.id),
    addEdge: vi.fn((cfg: any) => {
      const edge: any = {
        id: cfg.id,
        source: cfg.source,
        target: cfg.target,
        _data: cfg.data,
        getSourcePortId: () => cfg.source.port,
        getTargetPortId: () => cfg.target.port,
        getData: () => edge._data,
        setData: (d: any) => { edge._data = d }
      }
      edges.push(edge)
      return edge
    }),
    getNodes: () => [...nodeMap.values()],
    getEdges: () => edges
  }
  return { graph, nodeMap, edges }
}

describe('PersistenceService.loadCanvasData 端口回填', () => {
  it('连接缺少 sourcePort 时回填到源节点真实的 out-0（开始节点）', () => {
    const { graph, edges } = makeGraph()
    const ok = loadCanvasData(graph as any, {
      nodes: [
        { id: 'n-start', type: 'start', x: 0, y: 0 },
        { id: 'n-crowd', type: 'crowd-split', x: 200, y: 0 }
      ],
      connections: [{ source: 'n-start', target: 'n-crowd' }]
    } as any)
    expect(ok).toBe(true)
    expect(edges).toHaveLength(1)
    // 开始节点端口为 out-0，不能回填成裸 'out'
    expect(edges[0].source.port).toBe('out-0')
    expect(edges[0].target.port).toBe('in')
  })

  it('连接携带失效的 sourcePort（裸 out）时同样回填到 out-0', () => {
    const { graph, edges } = makeGraph()
    loadCanvasData(graph as any, {
      nodes: [
        { id: 'n-start', type: 'start', x: 0, y: 0 },
        { id: 'n-crowd', type: 'crowd-split', x: 200, y: 0 }
      ],
      connections: [{ source: 'n-start', target: 'n-crowd', sourcePort: 'out' }]
    } as any)
    expect(edges[0].source.port).toBe('out-0')
  })

  it('多出端口节点：优先回填到未占用的 out-N', () => {
    const { graph, edges } = makeGraph()
    loadCanvasData(graph as any, {
      nodes: [
        { id: 'n-start', type: 'start', x: 0, y: 0 },
        { id: 'n-ab', type: 'ab-test', x: 200, y: 0, config: { branches: [{ id: 'branch_1' }, { id: 'branch_2' }] } },
        { id: 'n-end1', type: 'end', x: 400, y: 0 },
        { id: 'n-end2', type: 'end', x: 400, y: 200 }
      ],
      connections: [
        { source: 'n-ab', target: 'n-end1' },
        { source: 'n-ab', target: 'n-end2' }
      ]
    } as any)
    expect(edges.map((e) => e.source.port)).toEqual(['out-0', 'out-1'])
    // AB 分支按 out-N 修复 branchId
    expect(edges[0].getData().branchId).toBe('branch_1')
    expect(edges[1].getData().branchId).toBe('branch_2')
  })

  it('数据非法时返回 false', () => {
    const { graph } = makeGraph()
    expect(loadCanvasData(graph as any, null as any)).toBe(false)
    expect(loadCanvasData(graph as any, { nodes: [] } as any)).toBe(false)
  })
})

describe('PersistenceService.collectCanvasData', () => {
  it('采集边时记录 sourcePortId/targetPortId', () => {
    const { graph, edges } = makeGraph()
    loadCanvasData(graph as any, {
      nodes: [
        { id: 'n-start', type: 'start', x: 0, y: 0 },
        { id: 'n-crowd', type: 'crowd-split', x: 200, y: 0 }
      ],
      connections: [{ source: 'n-start', target: 'n-crowd' }]
    } as any)
    const data = collectCanvasData(graph as any)
    expect(data.connections[0].sourcePortId).toBe('out-0')
    expect(data.connections[0].targetPortId).toBe('in')
  })
})
/*
用途：PersistenceService 单元测试
说明：覆盖 loadCanvasData 的端口回填（缺省 sourcePort / 失效 sourcePort / 多出端口节点）与 collectCanvasData 的端口采集。
边界：使用最小 X6 图桩（addNode 返回带 getPorts/getData 的实例）；不测真实渲染与交互。
*/
