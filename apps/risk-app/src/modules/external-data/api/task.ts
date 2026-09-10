export type TaskConfig = { parallel?: number; retries?: number; range?: string }
export type Task = { id: string | number; taskName: string; status: string; progress: number; createdAt?: string; config?: TaskConfig }

import http from '../../../api/http'
const useMock = import.meta.env.VITE_USE_MOCK === 'true'

export async function getTasks(_: any) {
  if (useMock) {
    const list: Task[] = Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      taskName: `离线任务-${i + 1}`,
      status: ['pending','in_progress','completed'][i % 3],
      progress: i * 20,
      createdAt: new Date(Date.now() - i * 86400000).toISOString(),
      config: { parallel: 4, retries: 3, range: '2025-01-01~2025-01-31' }
    }))
    return { data: { list } }
  }
  return await http.get('/external-data-task/list')
}

export async function getTaskDetail(id: number) {
  if (useMock) return { data: { id, taskName: `离线任务-${id}`, status: 'in_progress', progress: 50 } }
  return await http.get(`/external-data-task/${id}`)
}

export async function createTask(payload: { taskName: string; config?: Partial<TaskConfig> }) {
  if (useMock) return { id: Date.now(), ...payload }
  return await http.post('/external-data-task', payload)
}

export async function updateTaskProgress(id: number, progress: number) {
  if (useMock) return { id, progress }
  return await http.put(`/external-data-task/${id}/progress`, { progress })
}
