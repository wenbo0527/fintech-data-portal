import { describe, it, expect, vi } from 'vitest'
import { useCanvasDrop } from '../../src/composables/canvas/useCanvasDrop.js'

const TOUCH_COMBOS = { 'touch-combo': true }

function makeDeps(overrides = {}) {
  return {
    getGraph: () => ({ addNode: vi.fn((s) => ({ id: s.id, ...s })) }),
    getIsViewMode: () => false,
    createVueShapeNode: vi.fn((s) => s),
    getNodeLabel: (t) => `LABEL_${t}`,
    insertTouchComboNodes: vi.fn(() => ['a', 'b']),
    highlightNodes: vi.fn(),
    setPendingCreatePoint: vi.fn(),
    setPendingInsertionEdge: vi.fn(),
    Message: { warning: vi.fn(), error: vi.fn(), success: vi.fn() },
    log: { warn: vi.fn() },
    tracker: { track: vi.fn(), trackFunnelStep: vi.fn() },
    getEditingTaskId: () => '1001',
    getEditingTaskVersion: () => 1,
    TOUCH_COMBOS,
    ...overrides
  }
}

function dragEvent(nodeType) {
  return {
    preventDefault: vi.fn(),
    pageX: 200, pageY: 100, offsetX: 0, offsetY: 0,
    dataTransfer: { getData: vi.fn((k) => k === 'nodeType' ? nodeType : '') }
  }
}

describe('useCanvasDrop', () => {
  it('view mode 时直接返回 false，不调用 addNode', () => {
    const deps = makeDeps({ getIsViewMode: () => true })
    const drop = useCanvasDrop(deps)
    const r = drop.onCanvasDrop(dragEvent('sms'))
    expect(r).toBe(false)
    expect(deps.createVueShapeNode).not.toHaveBeenCalled()
  })

  it('空 nodeType 返回 false', () => {
    const deps = makeDeps()
    const drop = useCanvasDrop(deps)
    const r = drop.onCanvasDrop({ preventDefault: vi.fn(), dataTransfer: { getData: () => '' }, pageX: 0, pageY: 0, offsetX: 0, offsetY: 0 })
    expect(r).toBe(false)
  })

  it('普通节点：addNode + highlight + tracker.node_drop', () => {
    const deps = makeDeps()
    const drop = useCanvasDrop(deps)
    const r = drop.onCanvasDrop(dragEvent('sms'))
    expect(r).toBe(true)
    expect(deps.createVueShapeNode).toHaveBeenCalledOnce()
    const spec = deps.createVueShapeNode.mock.calls[0][0]
    expect(spec.data.type).toBe('sms')
    // 出端口数量与 id 由 createVueShapeNode 按节点类型/配置行推导，调用方不再显式传 outCount
    expect(spec.outCount).toBeUndefined()
    expect(deps.highlightNodes).toHaveBeenCalledOnce()
    expect(deps.tracker.track).toHaveBeenCalledWith('node_drop', expect.objectContaining({ props: expect.objectContaining({ nodeType: 'sms' }) }))
    expect(deps.tracker.trackFunnelStep).toHaveBeenCalledWith('canvas_creation', 'first_node_drop', expect.objectContaining({ nodeType: 'sms' }))
  })

  it('crowd-split 不显式传 outCount + 不触发 funnel（仅 start 之外业务节点）', () => {
    const deps = makeDeps()
    const drop = useCanvasDrop(deps)
    drop.onCanvasDrop(dragEvent('crowd-split'))
    const spec = deps.createVueShapeNode.mock.calls[0][0]
    expect(spec.outCount).toBeUndefined()
    expect(spec.data.type).toBe('crowd-split')
    expect(deps.tracker.trackFunnelStep).toHaveBeenCalled()
  })

  it('start 节点不触发 funnel first_node_drop', () => {
    const deps = makeDeps()
    const drop = useCanvasDrop(deps)
    drop.onCanvasDrop(dragEvent('start'))
    expect(deps.tracker.track).toHaveBeenCalledWith('node_drop', expect.any(Object))
    expect(deps.tracker.trackFunnelStep).not.toHaveBeenCalled()
  })

  it('高级组合节点：调 insertTouchComboNodes + tracker combo_insert', () => {
    const deps = makeDeps()
    const drop = useCanvasDrop(deps)
    const r = drop.onCanvasDrop(dragEvent('touch-combo'))
    expect(r).toBe(true)
    expect(deps.insertTouchComboNodes).toHaveBeenCalledWith('touch-combo')
    expect(deps.highlightNodes).toHaveBeenCalledWith(['a', 'b'])
    expect(deps.tracker.track).toHaveBeenCalledWith('combo_insert', expect.objectContaining({ props: expect.objectContaining({ comboType: 'touch-combo', nodeCount: 2 }) }))
  })

  it('高级组合节点失败：Message.warning + tracker node_drop_fail', () => {
    const deps = makeDeps({ insertTouchComboNodes: vi.fn(() => []) })
    const drop = useCanvasDrop(deps)
    const r = drop.onCanvasDrop(dragEvent('touch-combo'))
    expect(r).toBe(false)
    expect(deps.Message.warning).toHaveBeenCalled()
    expect(deps.tracker.track).toHaveBeenCalledWith('node_drop_fail', expect.objectContaining({ props: expect.objectContaining({ reason: 'combo_insert_failed' }) }))
  })

  it('addNode 返回 null：tracker node_drop_fail reason=addNode_failed', () => {
    const deps = makeDeps({ getGraph: () => ({ addNode: vi.fn(() => null) }) })
    const drop = useCanvasDrop(deps)
    const r = drop.onCanvasDrop(dragEvent('sms'))
    expect(r).toBe(false)
    expect(deps.tracker.track).toHaveBeenCalledWith('node_drop_fail', expect.objectContaining({ props: expect.objectContaining({ reason: 'addNode_failed' }) }))
  })

  it('异常路径：Message.error + log.warn + tracker node_drop_fail reason=exception', () => {
    const deps = makeDeps({ createVueShapeNode: vi.fn(() => { throw new Error('boom') }) })
    const drop = useCanvasDrop(deps)
    const r = drop.onCanvasDrop(dragEvent('sms'))
    expect(r).toBe(false)
    expect(deps.Message.error).toHaveBeenCalled()
    expect(deps.log.warn).toHaveBeenCalled()
    expect(deps.tracker.track).toHaveBeenCalledWith('node_drop_fail', expect.objectContaining({ props: expect.objectContaining({ reason: 'exception' }) }))
  })
})
/*
用途：useCanvasDrop 单元测试
说明：覆盖 view-mode / 空类型 / 普通节点 / 高级组合节点 / 异常分支。
边界：使用 vi.fn 注入 graph/tracker/Message；不测真实 X6 绑定。
*/