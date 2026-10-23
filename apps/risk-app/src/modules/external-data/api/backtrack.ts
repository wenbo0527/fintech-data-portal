import { listRetroStdTables, listOnlineSampleTables, recommendRetroStdTable } from '../mock/hiveTables'
import type { HiveTableItem } from '../mock/hiveTables'
import { listOutboundTasks, getOutboundTasksByIds } from '../mock/outboundTasks'
import type { OutboundTask } from '../mock/outboundTasks'
import {
  listAsyncTasks,
  findDuplicateWriteTask,
  getPersistRecord,
  appendPersistRecord,
  listNotifyRecords,
  generateBackid,
} from '../mock/backtrackPersist'
import type { AsyncTask, PersistRecord, NotifyRecord } from '../mock/backtrackPersist'
import { getStdFieldNames, getStdFieldComment } from '../mock/stdFieldLibrary'
import { listRetroFiles, findProcessedRecords, retroDirCatalog, buildPreviewRows } from '../mock/retroFiles'
import type { RetroFile, ProcessedFileRecord, PreviewRow } from '../mock/retroFiles'
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

/** 文件指纹判重（R90：写操作类命中则阻断，只读类放行） */
export async function checkDuplicateWriteTask(fileFingerprint: string, excludeTaskId?: string): Promise<AsyncTask | null> {
  if (useMock) return findDuplicateWriteTask(fileFingerprint, excludeTaskId)
  return null
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

/** 查询通知记录 */
export async function fetchNotifyRecords(backid?: string): Promise<NotifyRecord[]> {
  if (useMock) return listNotifyRecords(backid)
  return []
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

/** 查询机构 SFTP 目录下的子目录（R14 目录路径拼接） */
export async function fetchRetroDirs(agencyCode: string): Promise<string[]> {
  if (useMock) return retroDirCatalog[agencyCode] || []
  return []
}

/** 生成文件前 5 行原始内容（R20 预览） */
export async function fetchPreviewRows(file: RetroFile): Promise<PreviewRow[]> {
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

/** 执行通知发送（R76 自动触发 / R81 失败重试 3 次） */
export async function dispatchNotification(
  channels: NotifyChannel[],
  content: NotifyContent,
  receivers: string[],
  maskEnabled: boolean,
  maxRetry = 3
): Promise<NotifyRecord[]> {
  if (useMock) return sendNotification(channels, content, receivers, maskEnabled, maxRetry)
  return []
}
