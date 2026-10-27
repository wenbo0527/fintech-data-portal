import { migrateCanvasData, MIGRATION_VERSION } from './migrateCanvasData.js'
import { RuntimeStatsMock, clearFlowDatasetCache } from './runtimeStatsMock.js'
import { submitApproval as submitApprovalSvc, approveVersions as approveVersionsSvc, withdrawApproval as withdrawApprovalSvc } from './approvalService.js'

const KEY = 'horizontal_canvas_tasks'

/**
 * 智能迁移：仅当 canvasData 未标 `_migrationVersion` 或版本低于当前时才迁移
 * 入参：canvasData(对象或 null/undefined)
 * 返回：迁移后的 canvasData（已迁移的会原样返回，避免重复遍历）
 * 边界：空值原样返回；_migrationVersion >= MIGRATION_VERSION 视为已迁移。
 */
function migrateIfNeeded(canvasData) {
  if (!canvasData || typeof canvasData !== 'object') return canvasData
  try {
    if (Number(canvasData._migrationVersion) >= MIGRATION_VERSION) return canvasData
  } catch {}
  return migrateCanvasData(canvasData)
}

/**
 * 任务本地存储（CRUD + 版本快照）
 * 说明：所有读都通过 migrateCanvasData 做一次迁移；版本快照独立维护，与任务主记录分离。
 * 边界：不负责审批流（参见 approvalService.js）；不负责运行时统计（参见 runtimeStatsMock.js）。
 */
export const TaskStorage = {
  getAllTasks() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || '[]')
      return Array.isArray(raw) ? raw.map(t => ({
        ...t,
        canvasData: migrateIfNeeded(t.canvasData),
        versions: Array.isArray(t.versions)
          ? t.versions.map(v => ({ ...v, canvasData: migrateIfNeeded(v.canvasData) }))
          : []
      })) : []
    } catch { return [] }
  },
  getTaskById(id) { return this.getAllTasks().find(t => String(t.id) === String(id)) || null },

  saveTask(task) {
    const list = this.getAllTasks()
    const idx = list.findIndex(t => String(t.id) === String(task.id))
    if (idx >= 0) {
      const base = list[idx]
      const next = { ...base, ...task, id: base.id, canvasData: migrateIfNeeded(task.canvasData || base.canvasData) }
      next.versions = Array.isArray(base.versions) ? base.versions.slice() : []
      // 版本快照：保存当前版本的画布
      if (task.version != null && task.canvasData) {
        const vNum = Number(task.version)
        const vIdx = next.versions.findIndex(v => Number(v.version) === vNum)
        const vEntry = { version: vNum, status: task.status || base.status || 'draft', approvalStatus: task.approvalStatus || null, approvalFlow: Array.isArray(task.approvalFlow) ? task.approvalFlow.slice() : (next.versions[vIdx]?.approvalFlow || [] || []), publishReady: !!task.publishReady, publishMessages: Array.isArray(task.publishMessages) ? task.publishMessages.slice() : (next.versions[vIdx]?.publishMessages || []), lastValidatedAt: task.lastValidatedAt || new Date().toISOString(), canvasData: migrateIfNeeded(task.canvasData), updateTime: task.updateTime || new Date().toISOString(), publishTime: task.publishTime || null }
        if (vIdx >= 0) next.versions[vIdx] = { ...next.versions[vIdx], ...vEntry }
        else next.versions.push(vEntry)
      }
      list[idx] = next
    } else {
      const created = { ...task, createdAt: task.createdAt || new Date().toISOString() }
      // 初始化版本快照
      created.versions = Array.isArray(created.versions) ? created.versions : []
      if (created.version != null && created.canvasData) {
        created.versions.push({ version: Number(created.version), status: created.status || 'draft', approvalStatus: created.approvalStatus || null, approvalFlow: Array.isArray(created.approvalFlow) ? created.approvalFlow.slice() : [], publishReady: !!created.publishReady, publishMessages: Array.isArray(created.publishMessages) ? created.publishMessages.slice() : [], lastValidatedAt: created.lastValidatedAt || null, canvasData: migrateIfNeeded(created.canvasData), updateTime: created.updateTime || new Date().toISOString(), publishTime: created.publishTime || null })
      }
      list.push(created)
    }
    localStorage.setItem(KEY, JSON.stringify(list))
    return task
  },

  deleteTask(id) {
    const list = this.getAllTasks().filter(t => String(t.id) !== String(id))
    localStorage.setItem(KEY, JSON.stringify(list))
    return true
  },

  updateTask(id, data) {
    // DocRef: 架构文档「关键代码片段/本地任务存储：创建与更新」
    // 画布结构可能变化，清空运行态统计数据集缓存，避免统计口径与画布不一致
    if (data && data.canvasData) { try { clearFlowDatasetCache() } catch {} }
    const list = this.getAllTasks()
    const idx = list.findIndex(t => String(t.id) === String(id))
    if (idx >= 0) {
      const base = list[idx]
      const merged = { ...base, ...data, id: base.id, canvasData: migrateIfNeeded(data.canvasData || base.canvasData) }
      merged.versions = Array.isArray(base.versions) ? base.versions.slice() : []
      if (data.version != null && data.canvasData) {
        const vNum = Number(data.version)
        const vIdx = merged.versions.findIndex(v => Number(v.version) === vNum)
        const vEntry = { version: vNum, status: data.status || base.status || 'draft', approvalStatus: data.approvalStatus ?? merged.versions[vIdx]?.approvalStatus ?? null, approvalFlow: Array.isArray(data.approvalFlow) ? data.approvalFlow.slice() : (merged.versions[vIdx]?.approvalFlow || []), publishReady: data.publishReady ?? merged.versions[vIdx]?.publishReady ?? false, publishMessages: Array.isArray(data.publishMessages) ? data.publishMessages.slice() : (merged.versions[vIdx]?.publishMessages || []), lastValidatedAt: data.lastValidatedAt || new Date().toISOString(), canvasData: migrateIfNeeded(data.canvasData), updateTime: data.updateTime || new Date().toISOString(), publishTime: data.publishTime || null }
        if (vIdx >= 0) merged.versions[vIdx] = { ...merged.versions[vIdx], ...vEntry }
        else merged.versions.push(vEntry)
      } else if (data.status != null) {
        // 仅状态流转（运行中/停止等）不携带 canvasData：同步当前版本条目的 status，
        // 否则画布页读版本 status 时会停留在 draft，统计入口不出现
        const vNum = Number(data.version ?? base.version ?? 1)
        const vIdx = merged.versions.findIndex(v => Number(v.version) === vNum)
        if (vIdx >= 0) merged.versions[vIdx] = { ...merged.versions[vIdx], status: data.status }
      }
      list[idx] = merged
      localStorage.setItem(KEY, JSON.stringify(list))
      return merged
    }
    const created = { id: String(id), ...data, canvasData: migrateCanvasData(data.canvasData) }
    created.versions = Array.isArray(created.versions) ? created.versions : []
    if (created.version != null && created.canvasData) {
      created.versions.push({ version: Number(created.version), status: created.status || 'draft', canvasData: migrateIfNeeded(created.canvasData), updateTime: created.updateTime || new Date().toISOString(), publishTime: created.publishTime || null })
    }
    list.push(created)
    localStorage.setItem(KEY, JSON.stringify(list))
    return created
  },

  // DocRef: 架构文档「关键代码片段/本地任务存储：创建与更新」
  createTask(task) {
    const t = { id: String(Date.now()), ...task }
    this.saveTask(t)
    // 画布结构可能变化，清空运行态统计数据集缓存，避免统计口径与画布不一致
    try { clearFlowDatasetCache() } catch {}
    return t
  },
  getStorageStats() { const list = this.getAllTasks(); return { totalTasks: list.length } },

  // 审批流转发到 approvalService（审批读写与 TaskStorage 同一份 localStorage 列表）
  submitApproval(id, version, user, remark) { return submitApprovalSvc(id, version, user, remark) },
  approveVersions(items, decision, user, remark) { return approveVersionsSvc(items, decision, user, remark) },
  withdrawApproval(id, version, user, remark) { return withdrawApprovalSvc(id, version, user, remark) },

  // 版本读取
  getTaskVersions(id) {
    const t = this.getTaskById(id)
    return (t && Array.isArray(t.versions)) ? t.versions : []
  },
  getTaskVersionCanvas(id, version) {
    try {
      const vNum = Number(version)
      const t = this.getTaskById(id)
      const entry = (t && Array.isArray(t.versions)) ? t.versions.find(v => Number(v.version) === vNum) : null
      return entry && entry.canvasData ? migrateIfNeeded(entry.canvasData) : null
    } catch { return null }
  },

  seedIfEmpty() {
    const list = this.getAllTasks()
    if (Array.isArray(list) && list.length) return
    const now = new Date().toLocaleString('zh-CN')
    // 运行周期起点：mock 任务视为已上线 N 天，R44 裁剪与 A2 趋势图据此推导多日区间
    const runFromDaysAgo = (days) => {
      const d = new Date()
      d.setDate(d.getDate() - days)
      d.setHours(0, 0, 0, 0)
      return d.toISOString()
    }
    const publishedDaysAgo = 6
    // 统计模式种子数据：versions[].status 必须为 published/running，
    // 否则画布页 isPublished 恒为 false，统计入口不出现
    const statsCanvas = {
      nodes: [
        { id: 'start', type: 'start', x: 80, y: 220, label: '开始', isConfigured: true, config: { taskType: 'marketing', targetAudience: ['all'], products: ['sudai'] } },
        { id: 'crowd', type: 'crowd-split', x: 260, y: 220, label: '人群分流', isConfigured: true, config: { nodeType: 'crowd-split', crowdLayers: [ { id: 'layer_1', order: 1, crowdId: 'c_black', crowdName: '黑名单' }, { id: 'layer_2', order: 2, crowdId: 'c_high', crowdName: '高响应客群' } ], unmatchBranch: { id: 'unmatch', name: '其他', isDefault: true, crowdId: '', crowdName: '其他', order: 3 } } },
        { id: 'ab', type: 'ab-test', x: 460, y: 220, label: 'AB实验', isConfigured: true, config: { nodeType: 'ab-test', experimentName: '短信模板AB', description: '对比两种文案', branches: [ { id: 'branch_1', name: '文案A', label: '文案A', percentage: 50 }, { id: 'branch_2', name: '文案B', label: '文案B', percentage: 50 } ] } },
        { id: 'sms', type: 'sms', x: 660, y: 220, label: '短信', isConfigured: true, config: { nodeType: 'sms', smsTemplate: 'marketing' } },
        { id: 'wait', type: 'wait', x: 860, y: 220, label: '等待', isConfigured: true, config: { nodeType: 'wait', nodeName: '等待', value: 10, unit: '分钟' } },
        { id: 'end', type: 'end', x: 1060, y: 220, label: '结束', isConfigured: true }
      ],
      connections: [
        { source: 'start', target: 'crowd', sourcePort: 'out-0', targetPort: 'in' },
        { source: 'crowd', target: 'ab', sourcePort: 'out-0', targetPort: 'in' },
        { source: 'crowd', target: 'sms', sourcePort: 'out-1', targetPort: 'in' },
        { source: 'crowd', target: 'sms', sourcePort: 'out-2', targetPort: 'in' },
        { source: 'ab', target: 'sms', sourcePort: 'out-0', targetPort: 'in' },
        { source: 'ab', target: 'sms', sourcePort: 'out-1', targetPort: 'in' },
        { source: 'sms', target: 'wait', sourcePort: 'out-0', targetPort: 'in' },
        { source: 'wait', target: 'end', sourcePort: 'out-0', targetPort: 'in' }
      ]
    }
    const mock = [
      {
        id: '1001', name: '消费贷促实名认证活动', type: '促实名', status: 'running', version: 2,
        createdAt: now, creator: 'current_user', description: '面向全量客户的人群分流与文案 AB 实验',
        canvasData: statsCanvas,
        versions: [
          { version: 1, status: 'published', approvalStatus: 'approved', createTime: now, isActive: false, publishReady: true, publishMessages: [], canvasData: statsCanvas, publishTime: runFromDaysAgo(publishedDaysAgo) },
          { version: 2, status: 'running', approvalStatus: 'approved', createTime: now, isActive: true, publishReady: true, publishMessages: [], canvasData: statsCanvas, publishTime: runFromDaysAgo(publishedDaysAgo) }
        ]
      },
      {
        id: '1002', name: '消费贷促授信额度提升', type: '促授信', status: 'published', version: 1,
        createdAt: now, creator: 'current_user', description: '授信额度提升策略（已发布，可查看统计）',
        canvasData: statsCanvas,
        versions: [
          { version: 1, status: 'published', approvalStatus: 'approved', createTime: now, isActive: true, publishReady: true, publishMessages: [], canvasData: statsCanvas, publishTime: runFromDaysAgo(publishedDaysAgo) }
        ]
      },
      {
        id: '1003', name: '消费贷催收提醒活动', type: '促催收', status: 'draft', version: 1,
        createdAt: now, creator: 'current_user', description: '草稿态任务（用于走审批流）',
        canvasData: statsCanvas,
        versions: [
          { version: 1, status: 'draft', approvalStatus: null, createTime: now, isActive: false, publishReady: true, publishMessages: [], canvasData: statsCanvas }
        ]
      }
    ]
    localStorage.setItem(KEY, JSON.stringify(mock))
  }
}

/**
 * 兼容导出：旧代码可能从 taskStorage.js 直接 import RuntimeStatsMock；
 * 真实实现已迁移到 utils/runtimeStatsMock.js
 */
export { RuntimeStatsMock }

/*
用途：任务本地存储（CRUD + 版本快照）
说明：所有读取都通过 migrateCanvasData 做一次迁移；版本快照独立维护；审批/运行时统计已迁出。
边界：仅 localStorage 持久化；审批流请用 approvalService；运行时统计请用 runtimeStatsMock。
*/