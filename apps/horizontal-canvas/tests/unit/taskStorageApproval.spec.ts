import { describe, it, expect, beforeEach } from 'vitest'
import { TaskStorage } from '../../src/utils/taskStorage.js'

const STORAGE_KEY = 'horizontal_canvas_tasks'

function readAll() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}
function writeAll(list) { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)) }

/**
 * 构造带单个版本快照的任务
 * 入参：id、version、status、approvalStatus
 * 返回：任务对象（versions 含一条与 version 同号的快照）
 */
function makeTask(id: string, version: number, status = 'draft', approvalStatus: string | null = null) {
  return {
    id: String(id),
    name: `task-${id}`,
    version: Number(version),
    status,
    versions: [{
      version: Number(version),
      status,
      approvalStatus,
      approvalFlow: [],
      publishReady: true,
      publishMessages: [],
      canvasData: { nodes: [], connections: [] }
    }]
  }
}

describe('TaskStorage 审批方法转发', () => {
  beforeEach(() => { writeAll([]) })

  it('submitApproval：任务不存在时返回 false（不抛异常）', () => {
    expect(TaskStorage.submitApproval('missing', 1, 'u1', '')).toBe(false)
  })

  it('submitApproval：成功写入 pending_approval 与提交流水', () => {
    writeAll([makeTask('1001', 1)])
    expect(TaskStorage.submitApproval('1001', 1, 'u1', '首次提交')).toBe(true)
    const t = readAll()[0]
    expect(t.status).toBe('pending_approval')
    expect(t.versions[0].approvalStatus).toBe('pending_approval')
    expect(t.versions[0].approvalFlow).toHaveLength(1)
    expect(t.versions[0].approvalFlow[0].action).toBe('submit')
    expect(t.versions[0].approvalFlow[0].remark).toBe('首次提交')
  })

  it('approveVersions：审批通过后版本状态变为 approved', () => {
    writeAll([makeTask('1001', 1, 'pending_approval', 'pending_approval')])
    const res = TaskStorage.approveVersions([{ id: '1001', version: 1 }], 'approve', 'reviewer', 'ok')
    expect(res[0].status).toBe('success')
    const t = readAll()[0]
    expect(t.versions[0].approvalStatus).toBe('approved')
    expect(t.status).toBe('approved')
  })

  it('approveVersions：非 pending_approval 版本返回 not_pending', () => {
    writeAll([makeTask('1001', 1)])
    const res = TaskStorage.approveVersions([{ id: '1001', version: 1 }], 'approve', 'reviewer', '')
    expect(res[0].status).toBe('error')
    expect(res[0].message).toBe('not_pending')
  })

  it('withdrawApproval：撤回后审批状态置空且追加流水', () => {
    writeAll([makeTask('1001', 1, 'pending_approval', 'pending_approval')])
    expect(TaskStorage.withdrawApproval('1001', 1, 'u1', '')).toBe(true)
    const t = readAll()[0]
    expect(t.versions[0].approvalStatus).toBe(null)
    expect(t.versions[0].approvalFlow[t.versions[0].approvalFlow.length - 1].action).toBe('withdraw')
  })
})
/*
用途：TaskStorage 审批方法转发的回归测试
说明：锁定 TaskStorage.submitApproval / approveVersions / withdrawApproval 三个方法的存在与行为，
      防止审批服务拆分到 approvalService.js 后再次出现方法丢失导致"提交审批失败"。
边界：仅验证 localStorage 写入结果，不涉及 UI。
*/
