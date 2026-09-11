/**
 * 统一查询 · 我的导出 store
 *
 * 管理导出任务列表与筛选。新建任务后通过定时器模拟进度推进
 * (exporting → success),失败/过期为静态演示态。
 * 全部为前端 Mock,不发起任何 HTTP 请求。
 */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { SEED_EXPORT_TASKS } from '@/mock/unified-query/export-tasks'
import type { ExportMethod, ExportStatus, ExportTask, ResultColumn } from '@/mock/unified-query/types'

/** 每个任务编号的当日序号游标:EXP20260910 → 已分配的最大序号 */
const seqByDate: Record<string, number> = {}

function pad(n: number, len = 3): string {
  return String(n).padStart(len, '0')
}

/** 生成任务编号:EXP{yyyyMMdd}-{seq} */
function nextExportId(dateKey: string): string {
  seqByDate[dateKey] = (seqByDate[dateKey] ?? 0) + 1
  return `EXP${dateKey}-${pad(seqByDate[dateKey])}`
}

function nowParts(): { stamp: string; dateKey: string; fileStamp: string } {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  const dateKey = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`
  const stamp = `${dateKey.slice(0, 4)}-${dateKey.slice(4, 6)}-${dateKey.slice(6, 8)} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
  const fileStamp = `${dateKey}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
  return { stamp, dateKey, fileStamp }
}

/** 由行数估算文件大小展示串 */
function estimateFileSize(rowCount: number): string {
  if (rowCount <= 0) return '—'
  const bytes = rowCount * 168 // 经验值:平均一行 ~168 字节
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${bytes} B`
}

export const useUqExportStore = defineStore('uqExport', () => {
  const list = ref<ExportTask[]>(SEED_EXPORT_TASKS.map(t => ({ ...t })))

  /** 状态筛选:all / active(进行中) / success / failed / expired */
  const statusFilter = ref<'all' | 'active' | ExportStatus>('all')
  /** 数据源筛选:all / Doris / Hive / Spark */
  const datasourceFilter = ref<string>('all')
  const keyword = ref('')

  const datasources = computed(() => {
    const set = new Set(list.value.map(t => t.datasource))
    return Array.from(set)
  })

  const filtered = computed(() => {
    const kw = keyword.value.trim().toLowerCase()
    return list.value.filter(t => {
      if (statusFilter.value === 'active') {
        if (t.status !== 'queued' && t.status !== 'exporting') return false
      } else if (statusFilter.value !== 'all' && t.status !== statusFilter.value) {
        return false
      }
      if (datasourceFilter.value !== 'all' && t.datasource !== datasourceFilter.value) return false
      if (kw && !t.fileName.toLowerCase().includes(kw) && !t.id.toLowerCase().includes(kw)) return false
      return true
    })
  })

  const stats = computed(() => {
    const count = (s: ExportStatus) => list.value.filter(t => t.status === s).length
    const active = count('queued') + count('exporting')
    return {
      total: list.value.length,
      active,
      success: count('success'),
      failed: count('failed'),
      expired: count('expired')
    }
  })

  const getById = (id: string) => list.value.find(t => t.id === id) ?? null

  /** 模拟进度推进:exporting → 逐步到 100 → success */
  function simulate(task: ExportTask) {
    const timer = setInterval(() => {
      const cur = getById(task.id)
      if (!cur || cur.status !== 'exporting') {
        clearInterval(timer)
        return
      }
      cur.progress = Math.min(100, cur.progress + 8 + Math.floor(Math.random() * 12))
      if (cur.progress >= 100) {
        clearInterval(timer)
        cur.status = 'success'
        cur.fileSize = estimateFileSize(cur.rowCount)
      }
    }, 400)
  }

  /** 新建导出任务,返回创建后的记录 */
  function createTask(payload: {
    baseName: string
    datasource: string
    method: ExportMethod
    rowCount: number
    columns?: ResultColumn[]
    rows?: Record<string, string | number>[]
  }): ExportTask {
    const { stamp, dateKey, fileStamp } = nowParts()
    const fileName = `${payload.baseName}_${payload.datasource}_${fileStamp}`
    const task: ExportTask = {
      id: nextExportId(dateKey),
      fileName,
      fileExt: 'csv',
      datasource: payload.datasource,
      status: 'exporting',
      progress: 5,
      fileSize: '—',
      createdAt: stamp,
      method: payload.method,
      rowCount: payload.rowCount,
      data: payload.columns && payload.rows
        ? { columns: payload.columns, rows: payload.rows }
        : undefined
    }
    list.value.unshift(task)
    simulate(task)
    return task
  }

  /** 取消(排队中/导出中 → 移除或标记失败)。演示:直接置为失败并停止进度 */
  function cancel(id: string) {
    const t = getById(id)
    if (t && (t.status === 'queued' || t.status === 'exporting')) {
      t.status = 'failed'
      t.fileSize = '—'
    }
  }

  /** 重试(失败 → 导出中并重新推进) */
  function retry(id: string) {
    const t = getById(id)
    if (t && t.status === 'failed') {
      t.status = 'exporting'
      t.progress = 5
      t.fileSize = '—'
      simulate(t)
    }
  }

  return {
    list,
    filtered,
    stats,
    datasources,
    statusFilter,
    datasourceFilter,
    keyword,
    getById,
    createTask,
    cancel,
    retry
  }
})
