/**
 * 采集 ↔ 上下架 联动数据中枢
 *
 * 提供：
 *   1) getMetadataTasks / runMetadataTask  —— 任务列表 + 触发执行（mock 模拟异步进度）
 *   2) onTaskComplete 监听器 —— 任务 success 时回调，可挂到 listing-store 写入
 *   3) triggerSyncFromShelf  —— 上下架"同步元数据"按钮调这里
 *
 * 完全前端 mock，使用 localStorage 持久化任务列表，保持浏览器刷新后状态。
 */
import { type ClusterType, type AssetSystemId } from '@/mock-dca/data-map'
import { listingStore } from '@/mock-dca/listing-store'
import type { MockMetric } from '@/mock-dca/listing-store'
import { TableCatalogStore, type StorageType } from '@/mock-dca/shared/table-catalog-store'

export interface MetadataTask {
  id: string
  taskName: string
  dataSourceType: 'Doris' | 'Hive' | 'Oracle' | 'MySQL'
  assetType: '指标' | 'API' | '特征' | '表'
  status: 'pending' | 'running' | 'success' | 'failed'
  createdAt: string
  finishedAt?: string
  /** 任务的产物（采集到的资产） */
  products?: Array<{
    name: string
    category: string
    hivePath?: string
    systemId: AssetSystemId
    clusterType: ClusterType
  }>
  /** 同步触发来源：'user' (人工创建) 或 'shelf' (上下架"同步元数据"按钮) */
  triggeredBy: 'user' | 'shelf'
  /** 上架动作来源资产名（triggeredBy === 'shelf' 时） */
  sourceAssetName?: string
  errorMessage?: string
}

const STORAGE_KEY = 'dmt-metadata-tasks'

// 模块加载：从 localStorage 还原（或初次跑 seed）
const loadTasks = (): MetadataTask[] => {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  // 首次进入：种 6 条历史任务，跟 api/metadata/index.ts 保持一致
  const seed: MetadataTask[] = [
    mkTask('T-001', 'Doris 主仓表采集', 'Doris', '表', 'running', '2026-07-21 09:30', 'user'),
    mkTask('T-002', 'Hive 数仓指标采集', 'Hive', '指标', 'success', '2026-07-21 08:15', 'user'),
    mkTask('T-003', 'Oracle 核心系统特征采集', 'Oracle', '特征', 'failed', '2026-07-21 07:00', 'user'),
    mkTask('T-004', 'Doris 风控 API 采集', 'Doris', 'API', 'success', '2026-07-20 22:00', 'user'),
    mkTask('T-005', 'Hive 用户中心画像采集', 'Hive', '表', 'pending', '2026-07-20 18:30', 'user'),
    mkTask('T-006', 'Doris 数仓指标增量采集', 'Doris', '指标', 'running', '2026-07-20 14:20', 'user')
  ]
  saveTasks(seed)
  return seed
}

const saveTasks = (tasks: MetadataTask[]) => {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
}

function mkTask(
  id: string,
  taskName: string,
  dataSourceType: MetadataTask['dataSourceType'],
  assetType: MetadataTask['assetType'],
  status: MetadataTask['status'],
  createdAt: string,
  triggeredBy: MetadataTask['triggeredBy']
): MetadataTask {
  return { id, taskName, dataSourceType, assetType, status, createdAt, triggeredBy }
}

let _tasks: MetadataTask[] = loadTasks()

// ============================================================
// 公开 API
// ============================================================

/** 取任务列表 */
export function getMetadataTasks(filter?: { status?: MetadataTask['status']; keyword?: string }) {
  let list = [..._tasks].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  if (filter?.status) list = list.filter(t => t.status === filter.status)
  if (filter?.keyword) {
    const kw = filter.keyword.toLowerCase()
    list = list.filter(t => t.taskName.toLowerCase().includes(kw))
  }
  return list
}

/**
 * 触发执行任务（异步 mock，模拟运行 1.2s 完成，可能成功也可能失败）
 * 完成时根据 assetType 自动把"产物"挂到 listing-store（mockTables 或 listingStore.metrics）
 *
 * 这就是"采集 ↔ 上下架联动"的关键：采集成功 → listing 页面立刻能看到。
 */
export function runMetadataTask(taskId: string): Promise<MetadataTask> {
  const task = _tasks.find(t => t.id === taskId)
  if (!task) return Promise.reject(new Error(`Task ${taskId} not found`))
  task.status = 'running'
  saveTasks(_tasks)

  return new Promise(resolve => {
    setTimeout(() => {
      const ok = Math.random() > 0.15 // 85% 成功率
      task.finishedAt = new Date().toISOString().slice(0, 19).replace('T', ' ')
      if (!ok) {
        task.status = 'failed'
        task.errorMessage = '采集超时：Doris 主节点无响应'
        saveTasks(_tasks)
        resolve(task)
        return
      }
      task.status = 'success'
      // ⚡ 关键联动：根据 assetType 写入 listing-store
      task.products = generateMockProducts(task)
      task.products.forEach(p => {
        registerListingProduct(task.assetType, p, task)
      })
      saveTasks(_tasks)
      resolve(task)
    }, 1200)
  })
}

/** 创建新任务（页面表单） */
export function createMetadataTask(input: {
  taskName: string
  dataSourceType: MetadataTask['dataSourceType']
  assetType: MetadataTask['assetType']
  triggeredBy?: MetadataTask['triggeredBy']
  sourceAssetName?: string
}): MetadataTask {
  const id = `T-${String(_tasks.length + 1).padStart(3, '0')}`
  const task: MetadataTask = {
    id,
    taskName: input.taskName,
    dataSourceType: input.dataSourceType,
    assetType: input.assetType,
    status: 'pending',
    createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
    triggeredBy: input.triggeredBy || 'user',
    sourceAssetName: input.sourceAssetName
  }
  _tasks = [task, ..._tasks]
  saveTasks(_tasks)
  return task
}

/**
 * 上下架"同步元数据"按钮触发器
 * 返回一条新创建的采集任务，调用方可以在调用后选择自动 run 或手动触发
 */
export function triggerSyncFromShelf(sourceAssetName: string): MetadataTask {
  return createMetadataTask({
    taskName: `${sourceAssetName} 同步元数据`,
    dataSourceType: 'Hive',
    assetType: '表',
    triggeredBy: 'shelf',
    sourceAssetName
  })
}

/** 重跑任务：创建一条新的（基于 existingT id） */
export function rerunTask(existingTaskId: string): MetadataTask | undefined {
  const existing = _tasks.find(t => t.id === existingTaskId)
  if (!existing) return undefined
  const fresh = createMetadataTask({
    taskName: `${existing.taskName} (重跑)`,
    dataSourceType: existing.dataSourceType,
    assetType: existing.assetType,
    triggeredBy: 'user'
  })
  return fresh
}

/** 删除已完成/失败任务 */
export function deleteTask(id: string): boolean {
  const before = _tasks.length
  _tasks = _tasks.filter(t => t.id !== id)
  if (_tasks.length < before) {
    saveTasks(_tasks)
    return true
  }
  return false
}

/** 触发后立即异步跑（不阻塞 UI） */
export function startMetadataTaskAsync(taskId: string) {
  void runMetadataTask(taskId).then(() => {
    notifyTaskListeners(taskId)
  })
}

// ============================================================
// 任务完成监听（用于联动刷新 listing-store 后自动通知 listing 页面）
// ============================================================

type TaskListener = (taskId: string) => void
const listeners: TaskListener[] = []

export function onTaskComplete(listener: TaskListener): () => void {
  listeners.push(listener)
  return () => {
    const idx = listeners.indexOf(listener)
    if (idx >= 0) listeners.splice(idx, 1)
  }
}

function notifyTaskListeners(taskId: string) {
  listeners.forEach(fn => {
    try { fn(taskId) } catch (e) { console.error('[metadata-bus] listener error', e) }
  })
}

// ============================================================
// 内部：mock 资产生成 + listing-store 写入
// ============================================================

const PRODUCT_POOL = {
  '表': [
    { category: '客户', systemId: 'core', clusterType: 'MySQL', hivePathTpl: 'mysql.cdp.{name}' },
    { category: '授信', systemId: 'core', clusterType: 'MySQL', hivePathTpl: 'mysql.core.{name}' },
    { category: '风控', systemId: 'risk', clusterType: 'HIVE', hivePathTpl: 'hive.risk.{name}' },
    { category: '营销', systemId: 'service', clusterType: 'MySQL', hivePathTpl: 'mysql.mkt.{name}' },
    { category: '数据资产', systemId: 'hive', clusterType: 'HIVE', hivePathTpl: 'hive.dfd.{name}' }
  ],
  '指标': [
    { category: '客户', systemId: 'core', clusterType: 'MySQL' },
    { category: '授信', systemId: 'risk', clusterType: 'HIVE' },
    { category: '放款', systemId: 'core', clusterType: 'MySQL' },
    { category: '营销', systemId: 'service', clusterType: 'MySQL' },
    { category: '风控', systemId: 'risk', clusterType: 'HIVE' }
  ],
  'API': [
    { category: 'API', systemId: 'core', clusterType: 'MySQL' },
    { category: 'API', systemId: 'service', clusterType: 'MySQL' }
  ],
  '特征': [
    { category: '数据要素', systemId: 'hive', clusterType: 'HIVE' }
  ]
}

function generateMockProducts(task: MetadataTask) {
  const pool = (PRODUCT_POOL as any)[task.assetType] || []
  if (!pool.length) return []
  // 按 taskName 简单 hash 选模板，保持产物稳定
  const idx = hashString(task.taskName) % pool.length
  const tpl = pool[idx]
  const baseName = task.taskName.replace(/[^a-zA-Z0-9_一-龥]/g, '_').slice(0, 20)
  const generatedName = `${task.assetType === 'API' ? 'api_' : ''}${baseName}_${Date.now().toString().slice(-4)}`
  return [{
    name: generatedName,
    category: tpl.category,
    hivePath: tpl.hivePathTpl ? tpl.hivePathTpl.replace('{name}', generatedName) : undefined,
    systemId: tpl.systemId as AssetSystemId,
    clusterType: tpl.clusterType as ClusterType
  }]
}

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

/**
 * 把产物注册到统一目录：
 *   - 「表」 → 写入 table-catalog-store（P0 唯一事实源），初始态=未上线，
 *              需在"未上线池"完善元数据并通过上线检查后才进入发现可见范围
 *   - 「指标」 → 追加到 listingStore.metrics（专题层过渡，P3 前不动）
 *   - 「API」「特征」 → 暂以「指标」形态落到 listingStore.metrics（mock 单入口简化）
 */
function registerListingProduct(
  assetType: MetadataTask['assetType'],
  p: NonNullable<MetadataTask['products']>[number],
  task: MetadataTask
) {
  if (assetType === '表') {
    TableCatalogStore.registerCollected({
      name: p.name,
      storage: task.dataSourceType as StorageType,
      domain: p.category,
      sourceSystem: String(p.systemId),
      description: `采集任务自动登记 · ${p.category}`
    })
  } else if (assetType === '指标' || assetType === 'API' || assetType === '特征') {
    if (listingStore.metrics.some((m: MockMetric) => m.metricName === p.name)) return
    listingStore.metrics.push({
      metricName: p.name,
      metricCode: p.name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      category: p.category,
      systemId: p.systemId,
      clusterType: p.clusterType,
      owner: '数据工程组',
      registerTime: new Date().toISOString().slice(0, 19).replace('T', ' '),
      status: 'onShelf',
      onShelfTime: new Date().toISOString().slice(0, 19).replace('T', ' '),
      publisher: '元数据采集',
      description: `${assetType} 自动登记 · ${p.category}`
    } as any)
  }
}

// 暴露给开发模式调试
if (typeof window !== 'undefined') {
  ;(window as any).__metadataBus = {
    getTasks: () => _tasks,
    rerun: rerunTask,
    delete: deleteTask,
    start: startMetadataTaskAsync,
    trigger: triggerSyncFromShelf
  }
}
