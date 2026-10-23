import { describe, it, expect, vi } from 'vitest'
import {
  computeSelectorFromAnchor, computeSelectorCenter,
  insertNodeFromSelector, insertNodeAndFinalize
} from '../../src/pages/marketing/tasks/horizontal/composables/useNodeInsertion.ts'

function makeGraph(overrides = {}) {
  return {
    getNodes: () => [],
    getEdges: () => [],
    addNode: vi.fn((spec) => ({ id: spec.id, ...spec })),
    addEdge: vi.fn(),
    removeEdge: vi.fn(),
    cleanSelection: vi.fn(),
    pageToLocal: (x, y) => ({ x, y }),
    ...overrides
  }
}

function makeCreateVueShapeNode() {
  return vi.fn((spec) => ({ id: spec.id, x: spec.x, y: spec.y, label: spec.label, data: spec.data }))
}

describe('computeSelectorFromAnchor', () => {
  it('基于 anchorRect + contentRect 计算选择器位置', () => {
    const anchor = { left: 100, bottom: 50, width: 200 }
    const content = { left: 20, top: 10 }
    const graph = { pageToLocal: (x, y) => ({ x: x - 20, y: y - 10 }) }
    const r = computeSelectorFromAnchor(anchor, content, graph)
    // x = 100 - 20 + 200/2 = 180
    // y = 50 - 10 + 8 = 48
    expect(r.selectorPos).toEqual({ x: 180, y: 48 })
    // pageToLocal: 100+100=200, 50+8=58 → x: 180, y: 48 (与 selectorPos 相同因 pageToLocal 也减了 contentRect)
    expect(r.pendingPoint.x).toBeCloseTo(180, 1)
  })

  it('graph.pageToLocal 不存在时回退到容器坐标', () => {
    const anchor = { left: 0, bottom: 0, width: 100 }
    const content = { left: 0, top: 0 }
    const r = computeSelectorFromAnchor(anchor, content, null)
    expect(r.selectorPos).toEqual({ x: 50, y: 8 })
    expect(r.pendingPoint).toEqual({ x: 50, y: 8 })
  })
})

describe('computeSelectorCenter', () => {
  it('以容器中心点为锚点', () => {
    const container = { left: 0, top: 0, width: 800, height: 600 }
    const r = computeSelectorCenter(container, null)
    expect(r.selectorPos).toEqual({ x: 400, y: 300 })
    expect(r.pendingPoint).toEqual({ x: 400, y: 300 })
  })
})

describe('insertNodeFromSelector', () => {
  it('缺失入参返回 null', () => {
    expect(insertNodeFromSelector(null, 'sms', { x: 0, y: 0 }, null, () => 'SMS', makeCreateVueShapeNode())).toBeNull()
    expect(insertNodeFromSelector(makeGraph(), null, { x: 0, y: 0 }, null, () => 'SMS', makeCreateVueShapeNode())).toBeNull()
    expect(insertNodeFromSelector(makeGraph(), 'sms', null, null, () => 'SMS', makeCreateVueShapeNode())).toBeNull()
  })

  it('普通节点调用 addNode + createVueShapeNode', () => {
    const g = makeGraph()
    const c = makeCreateVueShapeNode()
    const node = insertNodeFromSelector(g, 'sms', { x: 50, y: 60 }, null, (t) => 'SMS', c)
    expect(c).toHaveBeenCalledOnce()
    const spec = c.mock.calls[0][0]
    expect(spec.x).toBe(50)
    expect(spec.y).toBe(60)
    // 出端口数量与 id 由 createVueShapeNode 按节点类型/配置行推导，调用方不再显式传 outCount
    expect(spec.outCount).toBeUndefined()
    expect(spec.data.type).toBe('sms')
    expect(spec.data.isConfigured).toBe(false)
    expect(g.addNode).toHaveBeenCalledOnce()
    expect(node).toBeTruthy()
  })

  it('audience-split 归一为 crowd-split；不再显式传 outCount', () => {
    const c = makeCreateVueShapeNode()
    insertNodeFromSelector(makeGraph(), 'audience-split', { x: 0, y: 0 }, null, () => 'crowd', c)
    const spec = c.mock.calls[0][0]
    expect(spec.outCount).toBeUndefined()
    expect(spec.data.type).toBe('crowd-split')
  })

  it('ab-test 同样不再显式传 outCount', () => {
    const c = makeCreateVueShapeNode()
    insertNodeFromSelector(makeGraph(), 'ab-test', { x: 0, y: 0 }, null, () => 'ab', c)
    expect(c.mock.calls[0][0].outCount).toBeUndefined()
  })

  it('带 pendingInsertionEdge：拆旧边 + 加两段新边', () => {
    const g = makeGraph()
    const c = makeCreateVueShapeNode()
    const oldEdge = {
      id: 'old',
      getSource: () => ({ cell: 'A', port: 'out-0' }),
      getTarget: () => ({ cell: 'B', port: 'in' })
    }
    insertNodeFromSelector(g, 'sms', { x: 100, y: 100 }, oldEdge, () => 'SMS', c)
    expect(g.removeEdge).toHaveBeenCalledWith('old')
    expect(g.addEdge).toHaveBeenCalledTimes(2)
    const first = g.addEdge.mock.calls[0][0]
    const second = g.addEdge.mock.calls[1][0]
    expect(first.source).toEqual({ cell: 'A', port: 'out-0' })
    expect(first.target.cell).toBeDefined()
    expect(second.source.port).toBe('out-0')
    expect(second.target.cell).toBe('B')
  })

  it('getNodeLabel 缺失时回退到 nodeType', () => {
    const c = makeCreateVueShapeNode()
    insertNodeFromSelector(makeGraph(), 'foo', { x: 0, y: 0 }, null, null, c)
    expect(c.mock.calls[0][0].label).toBe('foo')
  })
})

describe('insertNodeAndFinalize', () => {
  it('正常路径：插入 + cleanSelection + onPersist + onAfter', () => {
    const g = makeGraph()
    const c = makeCreateVueShapeNode()
    const onPersist = vi.fn()
    const onAfter = vi.fn()
    const node = insertNodeAndFinalize(g, 'sms', { x: 1, y: 2 }, null, () => 'SMS', c, { onPersist, onAfter })
    expect(g.addNode).toHaveBeenCalledOnce()
    expect(g.cleanSelection).toHaveBeenCalled()
    expect(onPersist).toHaveBeenCalledWith(g, node)
    expect(onAfter).toHaveBeenCalledWith(node)
  })

  it('finalize 回调抛错不影响主流程', () => {
    const g = makeGraph()
    const c = makeCreateVueShapeNode()
    const onPersist = vi.fn(() => { throw new Error('boom') })
    expect(() => insertNodeAndFinalize(g, 'sms', { x: 0, y: 0 }, null, () => 'SMS', c, { onPersist })).not.toThrow()
  })
})
/*
用途：useNodeInsertion 单元测试
说明：覆盖 computeSelector* + insertNodeFromSelector + insertNodeAndFinalize。
边界：使用 vi.fn 模拟 graph；核心算法覆盖完整（路径与端口计算）；不测真实 X6。
*/