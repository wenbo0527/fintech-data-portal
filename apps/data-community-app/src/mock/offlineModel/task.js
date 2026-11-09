// 任务管理 Mock（支持查看回溯拆分子任务与重试）

import backtrackMock from './backtrack'

const tasks = []
let taskSeq = 100
let subSeq = 1

function seedFromBacktracks() {
  const btList = backtrackMock.getBacktracks({ page: 1, pageSize: 100 }).data || []
  for (const bt of btList) {
    // 为每个回溯任务创建一个管理任务，包含若干子任务（按分片模拟）
    const shards = ['S1', 'S2', 'S3', 'S4']
    const subtasks = shards.map((sh, idx) => ({
      id: subSeq++,
      shard: sh,
      status: idx % 4 === 0 ? 'failed' : (idx % 3 === 0 ? 'pending' : 'completed'),
      progress: idx % 4 === 0 ? 30 : (idx % 3 === 0 ? 0 : 100),
      lastError: idx % 4 === 0 ? '网络中断' : ''
    }))
    tasks.push({
      id: taskSeq++,
      name: `回溯拆分 - ${bt.config?.serviceName || 'unknown'}`,
      type: 'backtrack',
      status: subtasks.some(s => s.status === 'failed') ? 'failed' : (subtasks.some(s => s.status !== 'completed') ? 'running' : 'completed'),
      priority: 'medium',
      progress: Math.round((subtasks.filter(s => s.status === 'completed').length / subtasks.length) * 100),
      startTime: bt.createTime,
      estimatedEndTime: bt.updateTime,
      creator: '系统',
      createTime: bt.createTime,
      backtrackId: bt.id,
      subtasks
    })
  }
}

seedFromBacktracks()

export function getTasks(params = {}) {
  const { type = '', status = '', page = 1, pageSize = 10 } = params
  let list = [...tasks]
  if (type) {list = list.filter(t => t.type === type)}
  if (status) {list = list.filter(t => t.status === status)}
  const start = (page - 1) * pageSize
  const end = start + pageSize
  return { data: list.slice(start, end), total: list.length, page, pageSize }
}

export function getTaskDetail(id) {
  return tasks.find(t => t.id === parseInt(id, 10)) || null
}

export function retrySubtask(taskId, subtaskId) {
  const t = tasks.find(x => x.id === parseInt(taskId, 10))
  if (!t) {return null}
  const s = (t.subtasks || []).find(x => x.id === parseInt(subtaskId, 10))
  if (!s) {return null}
  s.status = 'running'
  s.progress = 10
  s.lastError = ''
  // 更新任务聚合状态与进度
  const completed = t.subtasks.filter(x => x.status === 'completed').length
  const running = t.subtasks.filter(x => x.status === 'running').length
  if (running > 0) {t.status = 'running'}
  t.progress = Math.round((completed / t.subtasks.length) * 100)
  return { task: t, subtask: s }
}

export default {
  getTasks,
  getTaskDetail,
  retrySubtask
}

