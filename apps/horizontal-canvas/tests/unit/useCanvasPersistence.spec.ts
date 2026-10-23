import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useCanvasPersistence } from '../../src/composables/canvas/useCanvasPersistence.js'

const STORAGE_KEY = 'horizontal_canvas_tasks'

function readAll() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}
function writeAll(list) { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)) }

function makeDeps(overrides = {}) {
  const calls = { save: 0, publish: 0, submit: 0 }
  return {
    Message: { error: vi.fn(), success: vi.fn() },
    validateForPublish: vi.fn(() => ({ pass: true, messages: [], details: [] })),
    collectCanvasData: vi.fn(() => ({ nodes: [{ id: 'n1' }], connections: [] })),
    TaskStorage: {
      getTaskById: vi.fn(() => null),
      updateTask: vi.fn((id, data) => ({ id, ...data })),
      submitApproval: vi.fn(() => true)
    },
    saveTaskSvc: vi.fn((meta, _d) => { calls.save++; return { id: 'NEW_' + meta.name, ...meta } }),
    publishTaskSvc: vi.fn((meta, _d) => { calls.publish++; return { id: 'NEW_' + meta.name, ...meta } }),
    tracker: { track: vi.fn(), trackFunnelStep: vi.fn() },
    router: { replace: vi.fn() },
    onShowValidation: vi.fn(),
    setTaskStatus: vi.fn(),
    setIsDirty: vi.fn(),
    setPublishReady: vi.fn(),
    setPublishMessages: vi.fn(),
    setApprovalStatus: vi.fn(),
    setIsEditMode: vi.fn(),
    setEditingTaskId: vi.fn(),
    setTaskVersion: vi.fn(),
    getGraph: () => ({}),
    getTaskName: () => 'task-1',
    getTaskDescription: () => 'desc',
    getTaskVersion: () => 1,
    getIsEditMode: () => false,
    getEditingTaskId: () => null,
    getEditingTaskVersion: () => 1,
    getCurrentUser: () => 'u1',
    ...overrides
  }
}

describe('useCanvasPersistence.saveDraft', () => {
  beforeEach(() => { writeAll([]) })

  it('缺失 taskName 时提示错误并不走持久化', async () => {
    const deps = makeDeps({ getTaskName: () => '' })
    const p = useCanvasPersistence(deps)
    const ok = await p.saveDraft()
    expect(ok).toBe(false)
    expect(deps.Message.error).toHaveBeenCalledWith('请输入任务名称')
    expect(deps.TaskStorage.updateTask).not.toHaveBeenCalled()
  })

  it('校验失败：写 tracker validate_fail + 不阻塞保存草稿', async () => {
    const deps = makeDeps({ validateForPublish: () => ({ pass: false, messages: ['missing start'], details: [{ kind: 'no-start' }] }) })
    const p = useCanvasPersistence(deps)
    const ok = await p.saveDraft()
    // 草稿允许保存，校验失败只记录埋点不阻塞
    expect(ok).toBe(true)
    expect(deps.tracker.track).toHaveBeenCalledWith('save_draft', expect.objectContaining({ props: expect.objectContaining({ pass: false }) }))
    expect(deps.saveTaskSvc).toHaveBeenCalled()
  })

  it('创建路径：saveTaskSvc 返回无 id 时报错', async () => {
    const deps = makeDeps({ saveTaskSvc: vi.fn(() => null) })
    const p = useCanvasPersistence(deps)
    const ok = await p.saveDraft()
    expect(ok).toBe(false)
    expect(deps.Message.error).toHaveBeenCalledWith('保存失败：未生成任务ID，请稍后重试')
  })

  it('创建成功：setIsEditMode/setEditingTaskId/router.replace', async () => {
    const deps = makeDeps()
    const p = useCanvasPersistence(deps)
    const ok = await p.saveDraft()
    expect(ok).toBe(true)
    expect(deps.setIsEditMode).toHaveBeenCalledWith(true)
    expect(deps.setEditingTaskId).toHaveBeenCalledWith('NEW_task-1')
    expect(deps.router.replace).toHaveBeenCalled()
    expect(deps.setTaskStatus).toHaveBeenCalledWith('draft')
    expect(deps.setIsDirty).toHaveBeenCalledWith(false)
    expect(deps.tracker.trackFunnelStep).toHaveBeenCalledWith('canvas_creation', 'validate_pass', {})
    expect(deps.tracker.trackFunnelStep).toHaveBeenCalledWith('canvas_creation', 'save_draft', {})
  })

  it('编辑路径：直接走 TaskStorage.updateTask', async () => {
    const deps = makeDeps({ getIsEditMode: () => true, getEditingTaskId: () => '1001' })
    const p = useCanvasPersistence(deps)
    const ok = await p.saveDraft()
    expect(ok).toBe(true)
    expect(deps.TaskStorage.updateTask).toHaveBeenCalled()
    expect(deps.saveTaskSvc).not.toHaveBeenCalled()
    expect(deps.router.replace).not.toHaveBeenCalled()
  })

  it('published 任务编辑时 version+1', async () => {
    const deps = makeDeps({ getIsEditMode: () => true, getEditingTaskId: () => '1001', getTaskVersion: () => 2, TaskStorage: { ...makeDeps().TaskStorage, getTaskById: () => ({ id: '1001', status: 'published', version: 2 }) } })
    const p = useCanvasPersistence(deps)
    await p.saveDraft()
    expect(deps.setTaskVersion).toHaveBeenCalledWith(3)
  })

  it('异常路径：error Message + tracker 上报', async () => {
    const deps = makeDeps({ collectCanvasData: vi.fn(() => { throw new Error('boom') }) })
    const p = useCanvasPersistence(deps)
    const ok = await p.saveDraft()
    expect(ok).toBe(false)
    expect(deps.Message.error).toHaveBeenCalledWith(expect.stringContaining('保存失败'))
  })
})

describe('useCanvasPersistence.publish', () => {
  beforeEach(() => { writeAll([]) })

  it('校验失败：showValidation + 不持久化', async () => {
    const deps = makeDeps({ validateForPublish: () => ({ pass: false, messages: ['m'], details: [{ kind: 'cycle' }] }) })
    const p = useCanvasPersistence(deps)
    const ok = await p.publish()
    expect(ok).toBe(false)
    expect(deps.onShowValidation).toHaveBeenCalled()
    expect(deps.TaskStorage.updateTask).not.toHaveBeenCalled()
  })

  it('发布成功：setTaskStatus published + funnel publish', async () => {
    const deps = makeDeps()
    const p = useCanvasPersistence(deps)
    const ok = await p.publish()
    expect(ok).toBe(true)
    expect(deps.setTaskStatus).toHaveBeenCalledWith('published')
    expect(deps.setIsDirty).toHaveBeenCalledWith(false)
    expect(deps.tracker.trackFunnelStep).toHaveBeenCalledWith('canvas_creation', 'publish', expect.any(Object))
  })

  it('published 任务重新发布 version+1', async () => {
    const deps = makeDeps({ getIsEditMode: () => true, getEditingTaskId: () => 'p1', TaskStorage: { ...makeDeps().TaskStorage, getTaskById: () => ({ id: 'p1', status: 'published', version: 5 }) } })
    const p = useCanvasPersistence(deps)
    await p.publish()
    expect(deps.setTaskVersion).toHaveBeenCalledWith(6)
  })
})

describe('useCanvasPersistence.submitApproval', () => {
  beforeEach(() => { writeAll([]) })

  it('缺失 taskName 报错', async () => {
    const deps = makeDeps({ getTaskName: () => '' })
    const p = useCanvasPersistence(deps)
    const ok = await p.submitApproval()
    expect(ok).toBe(false)
    expect(deps.Message.error).toHaveBeenCalledWith('请输入任务名称')
  })

  it('校验失败：setPublishReady(false) + setPublishMessages', async () => {
    const deps = makeDeps({ validateForPublish: () => ({ pass: false, messages: ['m1'], details: [] }) })
    const p = useCanvasPersistence(deps)
    const ok = await p.submitApproval()
    expect(ok).toBe(false)
    expect(deps.setPublishReady).toHaveBeenCalledWith(false)
    expect(deps.setPublishMessages).toHaveBeenCalledWith(['m1'])
  })

  it('校验通过：updateTask + submitApproval + setApprovalStatus', async () => {
    const deps = makeDeps({ getEditingTaskId: () => '1001', getEditingTaskVersion: () => 1 })
    const p = useCanvasPersistence(deps)
    const ok = await p.submitApproval()
    expect(ok).toBe(true)
    expect(deps.TaskStorage.updateTask).toHaveBeenCalledWith('1001', expect.objectContaining({ publishReady: true }))
    expect(deps.TaskStorage.submitApproval).toHaveBeenCalledWith('1001', 1, 'u1', 'desc')
    expect(deps.setApprovalStatus).toHaveBeenCalledWith('pending_approval')
    expect(deps.tracker.track).toHaveBeenCalledWith('submit_approval', expect.objectContaining({ props: expect.objectContaining({ by: 'u1' }) }))
  })

  it('submitApproval 返回 false：提示失败且不设置审批状态', async () => {
    const deps = makeDeps({ getEditingTaskId: () => '1001', getEditingTaskVersion: () => 1, TaskStorage: { ...makeDeps().TaskStorage, submitApproval: vi.fn(() => false) } })
    const p = useCanvasPersistence(deps)
    const ok = await p.submitApproval()
    expect(ok).toBe(false)
    expect(deps.Message.error).toHaveBeenCalledWith('提交审批失败：未找到待提交的任务或版本，请先保存草稿')
    expect(deps.setApprovalStatus).not.toHaveBeenCalled()
  })
})
/*
用途：useCanvasPersistence 单元测试
说明：覆盖 saveDraft / publish / submitApproval 三方法的正常路径与错误分支；测试隔离用 writeAll([])。
边界：使用 vi.fn 注入 Message/TaskStorage/router/tracker；不测真实持久化。
*/