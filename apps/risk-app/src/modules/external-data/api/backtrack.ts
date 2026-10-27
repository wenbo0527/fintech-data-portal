import { listRetroStdTables, listOnlineSampleTables, recommendRetroStdTable } from '../mock/hiveTables'
import type { HiveTableItem } from '../mock/hiveTables'
import { listOutboundTasks, getOutboundTasksByIds } from '../mock/outboundTasks'
import type { OutboundTask } from '../mock/outboundTasks'
import {
  listAsyncTasks,
  listAsyncTasksByBackid,
  resolveBatchStage,
  resolveStatusFromTasks,
  findDuplicateWriteTask,
  appendAsyncTask,
  updateAsyncTask,
  appendTaskLog,
  getAsyncTask,
  bindAsyncTaskBackid,
  getPersistRecord,
  appendPersistRecord,
  appendNotifyRecords,
  generateBackid,
} from '../mock/backtrackPersist'
import type { AsyncTask, PersistRecord, NotifyRecord, TaskLogEntry, BatchStage, PersistStatus } from '../mock/backtrackPersist'
import { getStdFieldNames, getStdFieldComment } from '../mock/stdFieldLibrary'
import {
  listRetroFiles,
  findProcessedRecords,
  listRetroTree,
  buildPreviewRows,
  decryptArchive,
  extractArchiveContent,
  parseReviewDateFromFileName,
} from '../mock/retroFiles'
import type { RetroFile, RetroTreeNode, ProcessedFileRecord, PreviewRow } from '../mock/retroFiles'
import { getBacktrackProduct, listBacktrackProducts } from '../mock/backtrackProducts'
import type { BacktrackProduct } from '../mock/backtrackProducts'
import { buildConsistencyDetails, summarizeConsistency, buildTripleRowCheck } from '../mock/validation'
import type { ValidationDetail, ConsistencySummary, TripleRowCheck } from '../mock/validation'
import { notifyConfigMock, buildNotifyContent, sendNotification } from '../mock/notify'
import type { NotifyConfig, NotifyContent, NotifyChannel } from '../mock/notify'

/**
 * 外数回溯落库 API 层
 * 项目无后端服务，VITE_USE_MOCK=true 时直接短路到 mock 数据源。
 */
const useMock = import.meta.env.VITE_USE_MOCK === 'true'

/** 查询落库目标 Hive 表候选（R41：固定外数库内搜索，不允许新建） */
export async function fetchRetroStdTables(keyword?: string): Promise<HiveTableItem[]> {
  if (useMock) return listRetroStdTables(keyword)
  return []
}

/** 查询一致性校验线上样本表（R67） */
export async function fetchOnlineSampleTables(keyword?: string): Promise<HiveTableItem[]> {
  if (useMock) return listOnlineSampleTables(keyword)
  return []
}

/** 按机构推荐默认落库目标表 */
export async function fetchRecommendedRetroStdTable(agencyCode: string): Promise<HiveTableItem | undefined> {
  if (useMock) return recommendRetroStdTable(agencyCode)
  return undefined
}

/** 按机构查询前置外发任务（R24/R25） */
export async function fetchOutboundTasks(agencyCode?: string): Promise<OutboundTask[]> {
  if (useMock) return listOutboundTasks(agencyCode)
  return []
}

/** 批量查询前置外发任务 */
export async function fetchOutboundTasksByIds(ids: string[]): Promise<OutboundTask[]> {
  if (useMock) return getOutboundTasksByIds(ids)
  return []
}

/** 查询异步任务列表（模块三 R83-R92） */
export async function fetchAsyncTasks(params?: { status?: string; taskType?: string; keyword?: string }): Promise<AsyncTask[]> {
  if (useMock) return listAsyncTasks(params)
  return []
}

/**
 * 按 backid 查询批次关联的任务（R51：backid 为批次标识，一个批次可关联多条任务）
 * @param backid 批次标识
 */
export async function fetchTasksByBackid(backid: string): Promise<AsyncTask[]> {
  if (useMock) return listAsyncTasksByBackid(backid)
  return []
}

/**
 * 推导批次所处流程阶段（R51：按批次内任务状态定位卡点或最终产出）
 * @param tasks 该 backid 关联的任务集合
 */
export async function fetchBatchStage(tasks: AsyncTask[]): Promise<BatchStage | null> {
  if (useMock) return resolveBatchStage(tasks)
  return null
}

/**
 * 按批次任务推导落库状态机状态
 * 后两态（临时库已落库 / Hive已落库）以任务列表为唯一事实源
 * @param tasks 该 backid 关联的任务集合
 */
export async function fetchBatchStatus(tasks: AsyncTask[]): Promise<PersistStatus | null> {
  if (useMock) return resolveStatusFromTasks(tasks)
  return null
}

/** 文件指纹判重（R90：写操作类命中则阻断，只读类放行） */
export async function checkDuplicateWriteTask(fileFingerprint: string, excludeTaskId?: string): Promise<AsyncTask | null> {
  if (useMock) return findDuplicateWriteTask(fileFingerprint, excludeTaskId)
  return null
}

/**
 * 新增异步任务（R86：所有执行类操作均创建任务）
 * @param task 任务主体，taskId 可缺省由生成器补齐
 */
export async function createAsyncTask(
  task: Omit<AsyncTask, 'taskId'> & { taskId?: string }
): Promise<AsyncTask> {
  if (useMock) return appendAsyncTask(task)
  throw new Error('未接入后端服务，无法创建异步任务')
}

/** 更新任务状态与完成时间（R84 状态维护） */
export async function saveAsyncTask(
  taskId: string,
  patch: Partial<Pick<AsyncTask, 'status' | 'finishTime' | 'failReason' | 'skipped'>>
): Promise<AsyncTask | null> {
  if (useMock) return updateAsyncTask(taskId, patch)
  return null
}

/** 追加任务执行日志（R88：任务明细展示执行轨迹） */
export async function saveTaskLog(taskId: string, entry: TaskLogEntry): Promise<void> {
  if (useMock) return appendTaskLog(taskId, entry)
}

/** 按任务 ID 查询任务详情（R88） */
export async function fetchAsyncTask(taskId: string): Promise<AsyncTask | undefined> {
  if (useMock) return getAsyncTask(taskId)
  return undefined
}

/**
 * 回写任务的关联 backid（R51：backid 在落临时库收尾时生成）
 * @param taskId 任务 ID
 * @param backid 批次标识
 */
export async function bindTaskBackid(taskId: string, backid: string): Promise<void> {
  if (useMock) return bindAsyncTaskBackid(taskId, backid)
}

/** 查询落库记录 */
export async function fetchPersistRecord(backid: string): Promise<PersistRecord | undefined> {
  if (useMock) return getPersistRecord(backid)
  return undefined
}

/** 追加落库记录 */
export async function savePersistRecord(record: PersistRecord): Promise<PersistRecord> {
  if (useMock) return appendPersistRecord(record)
  throw new Error('未接入后端服务，无法保存落库记录')
}

/** 生成 backid（R51） */
export async function createBackid(seq: number): Promise<string> {
  if (useMock) return generateBackid(seq)
  return ''
}

/** 标准库字段名列表 */
export async function fetchStdFieldNames(): Promise<string[]> {
  if (useMock) return getStdFieldNames()
  return []
}

/** 标准库字段说明（R30） */
export async function fetchStdFieldComment(field: string): Promise<string> {
  if (useMock) return getStdFieldComment(field)
  return '—'
}

/** 按机构查询 SFTP 返回文件（R13 使用机构配置自动带入连接参数后拉取） */
export async function fetchRetroFiles(agencyCode: string): Promise<RetroFile[]> {
  if (useMock) return listRetroFiles(agencyCode)
  return []
}

/** 按文件指纹查询历史落库批次（R26/R27 文件去重校验，放在生成 backid / 落库前执行） */
export async function fetchProcessedRecords(fileName: string, fileSize: number): Promise<ProcessedFileRecord[]> {
  if (useMock) return findProcessedRecords(fileName, fileSize)
  return []
}

/** 查询机构 SFTP 目录树（R14：支持文件夹 / CSV / 压缩包三级节点） */
export async function fetchRetroTree(agencyCode: string): Promise<RetroTreeNode[]> {
  if (useMock) return listRetroTree(agencyCode)
  return []
}

/** 解密压缩包（R19：密码由机构线下提供，密码错误时返回 false） */
export async function decryptArchivePackage(archiveKey: string, password: string): Promise<boolean> {
  if (useMock) return decryptArchive(archiveKey, password)
  return false
}

/** 解压压缩包并返回包内文件（R17：包内仍只接受 CSV） */
export async function fetchArchiveContent(archiveKey: string): Promise<RetroTreeNode[]> {
  if (useMock) return extractArchiveContent(archiveKey)
  return []
}

/** 生成文件前 5 行原始内容（R20 预览） */
export async function fetchPreviewRows(file: { rows?: number; header?: string[] }): Promise<PreviewRow[]> {
  if (useMock) return buildPreviewRows(file)
  return []
}

/** 按名称查询回溯产品（R29 已收录产品拉底表字段） */
export async function fetchBacktrackProduct(name: string): Promise<BacktrackProduct | undefined> {
  if (useMock) return getBacktrackProduct(name)
  return undefined
}

/** 按机构查询回溯产品 */
export async function fetchBacktrackProducts(agencyCode?: string): Promise<BacktrackProduct[]> {
  if (useMock) return listBacktrackProducts(agencyCode)
  return []
}

/** 生成一致性校验明细（R72 抽样 50-100 条） */
export async function fetchConsistencyDetails(count = 100, reviewDate?: string): Promise<ValidationDetail[]> {
  if (useMock) return buildConsistencyDetails(count, reviewDate)
  return []
}

/**
 * 从回溯文件名解析回溯日期（R68 关联条件之一）
 * 页面不再要求用户输入回溯日期，校验关联条件由文件名自动推导
 * @param fileName 回溯返回文件名
 */
export async function fetchReviewDateFromFileName(fileName: string): Promise<string> {
  if (useMock) return parseReviewDateFromFileName(fileName)
  return ''
}

/** 汇总一致性校验结果 */
export async function fetchConsistencySummary(details: ValidationDetail[], targetTable: string): Promise<ConsistencySummary> {
  if (useMock) return summarizeConsistency(details, targetTable)
  return { targetTable, sampleTotal: 0, matchedTotal: 0, unmatchedTotal: 0, inconsistentTotal: 0, diffSummary: '' }
}

/** 生成三重行数验证结果（R60/R61） */
export async function fetchTripleRowCheck(loadedRows: number, sourceRows: number, sampleRows: number): Promise<TripleRowCheck> {
  if (useMock) return buildTripleRowCheck(loadedRows, sourceRows, sampleRows)
  return {
    loadedRows,
    sourceFileRows: sourceRows,
    sampleFileRows: sampleRows,
    merged: false,
    mergedRows: sourceRows,
    // R60/R61：三者行数一致方为通过
    matched: loadedRows === sourceRows && sourceRows === sampleRows,
    requiredFieldPass: true,
    requiredFieldErrorCount: 0,
  }
}

/** 查询通知配置（R80 接收人配置 / R77 双渠道 / R79 脱敏 / R81 重试次数） */
export async function fetchNotifyConfig(): Promise<NotifyConfig> {
  if (useMock) return { ...notifyConfigMock }
  return { channels: [], receivers: [], maskEnabled: true, maxRetry: 3, configDesc: '' }
}

/** 组装通知内容 8 要素（R78） */
export async function createNotifyContent(params: {
  agency: string
  fileName: string
  backid: string
  loadTime: string
  loadedRows: number
  validationResult: string
  exceptionSummary: string
  consistencySummary: string
}): Promise<NotifyContent> {
  if (useMock) return buildNotifyContent(params)
  return { ...params }
}

/** 执行通知发送（R76 自动触发 / R81 失败重试 3 次），发送结果留存通知记录（R82） */
export async function dispatchNotification(
  channels: NotifyChannel[],
  content: NotifyContent,
  receivers: string[],
  maskEnabled: boolean,
  maxRetry = 3
): Promise<NotifyRecord[]> {
  if (useMock) {
    const records = await sendNotification(channels, content, receivers, maskEnabled, maxRetry)
    return appendNotifyRecords(records)
  }
  return []
}
