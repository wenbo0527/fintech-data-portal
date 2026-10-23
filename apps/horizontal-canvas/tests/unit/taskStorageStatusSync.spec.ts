import { describe, it, expect, beforeEach } from 'vitest'
import { TaskStorage } from '../../src/utils/taskStorage.js'

const STORAGE_KEY = 'horizontal_canvas_tasks'

function readAll() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}
function writeAll(list) { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)) }

/**
 * 构造带单个版本快照的任务
 * 入参：id、version、status
 * 返回：任务对象（versions 含一条与 version 同号的快照，status 与任务级一致）
 */
function makeTask(id: string, version: number, status = 'draft') {
  return {
    id: String(id),
    name: `task-${id}`,
    version: Number(version),
    status,
    canvasData: { nodes: [{ id: 'start', type: 'start' }], connections: [] },
    versions: [{
      version: Number(version),
      status,
      approvalStatus: null,
      approvalFlow: [],
      publishReady: true,
      publishMessages: [],
      canvasData: { nodes: [{ id: 'start', type: 'start' }], connections: [] }
    }]
  }
}

describe('TaskStorage 状态同步', () => {
  beforeEach(() => { writeAll([]) })

  it('仅状态流转（不传 canvasData）时同步版本条目 status', () => {
    writeAll([makeTask('1001', 1, 'draft')])
    TaskStorage.updateTask('1001', { status: 'running', updateTime: '2026-01-01 00:00:00' })
    const t = readAll()[0]
    expect(t.status).toBe('running')
    // 版本条目必须同步，否则画布页读版本 status 停留在 draft，统计入口不出现
    expect(t.versions[0].status).toBe('running')
  })

  it('仅状态流转不影响版本条目的画布快照与审批信息', () => {
    writeAll([makeTask('1001', 1, 'draft')])
    TaskStorage.updateTask('1001', { status: 'running' })
    const v = readAll()[0].versions[0]
    expect(v.canvasData.nodes).toHaveLength(1)
    expect(v.approvalStatus).toBe(null)
    expect(v.publishReady).toBe(true)
  })

  it('带 canvasData 的更新仍以 data.status 覆盖版本条目 status', () => {
    writeAll([makeTask('1001', 1, 'draft')])
    TaskStorage.updateTask('1001', { version: 1, status: 'published', canvasData: { nodes: [{ id: 'start', type: 'start' }, { id: 'end', type: 'end' }], connections: [] } })
    const t = readAll()[0]
    expect(t.status).toBe('published')
    expect(t.versions[0].status).toBe('published')
    expect(t.versions[0].canvasData.nodes).toHaveLength(2)
  })

  it('状态流转不影响其他版本条目', () => {
    const base = makeTask('1001', 1, 'draft')
    base.version = 2
    base.versions = [
      { ...base.versions[0], version: 1, status: 'published' },
      { ...base.versions[0], version: 2, status: 'draft' }
    ]
    writeAll([base])
    TaskStorage.updateTask('1001', { status: 'running' })
    const vs = readAll()[0].versions
    expect(vs.find(v => v.version === 2).status).toBe('running')
    expect(vs.find(v => v.version === 1).status).toBe('published')
  })
})

describe('统计模式种子数据', () => {
  beforeEach(() => { localStorage.removeItem(STORAGE_KEY) })

  it('seedIfEmpty 写入的种子任务版本状态为 published/running，统计入口可见', () => {
    TaskStorage.seedIfEmpty()
    const list = readAll()
    expect(list.length).toBeGreaterThan(0)
    list.forEach(t => {
      const versions = t.versions || []
      expect(versions.length).toBeGreaterThan(0)
      versions.forEach(v => {
        // 画布页 isPublished 依赖版本 status，缺失会导致统计按钮不渲染
        expect(['published', 'running', 'draft']).toContain(v.status)
      })
    })
    const running = list.find(t => t.status === 'running')
    expect(running).toBeTruthy()
    expect(running.versions.some(v => v.status === 'running')).toBe(true)
  })

  it('种子任务含 start/end 节点，供画布级统计识别', () => {
    TaskStorage.seedIfEmpty()
    readAll().forEach(t => {
      const nodes = t.canvasData?.nodes || []
      expect(nodes.some(n => n.type === 'start')).toBe(true)
      expect(nodes.some(n => n.type === 'end')).toBe(true)
    })
  })

  it('种子任务的顶层 canvasData 与版本快照一致（画布渲染与统计读同一份数据）', () => {
    TaskStorage.seedIfEmpty()
    readAll().forEach(t => {
      const v = (t.versions || [])[0]
      expect(v.canvasData).toEqual(t.canvasData)
    })
  })

  it('种子数据仅在 localStorage 为空时写入一次', () => {
    TaskStorage.seedIfEmpty()
    const first = readAll()
    TaskStorage.seedIfEmpty()
    expect(readAll().length).toBe(first.length)
  })
})
/*
用途：状态同步与统计模式种子数据的回归测试
说明：锁定两处修复——① updateTask 仅状态流转时同步版本条目 status（否则 running 任务看不到统计入口）；
      ② seedIfEmpty 种子任务版本状态/画布快照满足统计面板读取前提。
边界：仅验证 localStorage 写入结果，不涉及 UI。
*/
