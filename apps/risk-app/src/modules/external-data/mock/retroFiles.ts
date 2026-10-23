/**
 * SFTP 回溯返回文件目录 · Mock 数据源
 * 需求文档《外数文件落库》B1（R13-R27）
 *
 * 数据来源说明：
 *   1. 目录根路径取自 mock/creditAgencies.ts 各机构的 sftp.directory（download 目录）；
 *   2. 文件名沿用 BacktrackPersist.vue 既有命名（BH_RETRO_* / PD_BACK_* / QT_resp_*），
 *      扩展为统一 CSV 格式以符合 R17「全链路只接受 CSV」；
 *   3. 文件结构（编码 / 分隔符 / 字段数）按各机构返回文件的常见形态构造，供 R20 文件结构识别展示；
 *   4. 历史落库批次（processedFileRecords）用于 R26/R27 文件去重校验演示。
 */

/** 回溯返回文件 */
export interface RetroFile {
  id: string
  /** 所属机构编码 */
  agencyCode: string
  /** 文件名 */
  name: string
  /** 文件大小（字节） */
  size: number
  /** 数据行数（不含表头） */
  rows: number
  /** 更新时间 */
  updateTime: string
  /** 是否加密 */
  encrypted: boolean
  /** 编码格式 */
  encoding: string
  /** 分隔符 */
  delimiter: string
  /** 表头字段数 */
  fieldCount: number
  /** 表头字段名 */
  header: string[]
}

/** 文件大小格式化（KB/MB/GB） */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

/** 各机构 SFTP 目录下的返回文件（按机构编码索引） */
export const retroFileCatalog: Record<string, RetroFile[]> = {
  BH: [
    {
      id: 'f-bh-1',
      agencyCode: 'BH',
      name: 'BH_RETRO_20260928_01.csv',
      size: 90596947,
      rows: 128450,
      updateTime: '2026-09-29 08:00:12',
      encrypted: false,
      encoding: 'UTF-8',
      delimiter: '逗号',
      fieldCount: 8,
      header: ['id_md5', 'inst_cnt_1m', 'loan_cnt_1m', 'loan_cnt_3m', 'loan_cnt_12m', 'max_overdue_amt', 'risk_band', 'review_data'],
    },
    {
      id: 'f-bh-2',
      agencyCode: 'BH',
      name: 'BH_RETRO_20260922_01.csv',
      size: 64159744,
      rows: 96210,
      updateTime: '2026-09-23 08:00:09',
      encrypted: false,
      encoding: 'UTF-8',
      delimiter: '逗号',
      fieldCount: 8,
      header: ['id_md5', 'inst_cnt_1m', 'loan_cnt_1m', 'loan_cnt_3m', 'loan_cnt_12m', 'max_overdue_amt', 'risk_band', 'review_data'],
    },
    {
      id: 'f-bh-3',
      agencyCode: 'BH',
      name: 'BH_RETRO_20260915_01.csv',
      size: 55784243,
      rows: 88120,
      updateTime: '2026-09-16 08:11:40',
      encrypted: false,
      encoding: 'UTF-8',
      delimiter: '逗号',
      fieldCount: 8,
      header: ['id_md5', 'inst_cnt_1m', 'loan_cnt_1m', 'loan_cnt_3m', 'loan_cnt_12m', 'max_overdue_amt', 'risk_band', 'review_data'],
    },
  ],
  PD: [
    {
      id: 'f-pd-1',
      agencyCode: 'PD',
      name: 'PD_BACK_0929_2.csv',
      size: 47915008,
      rows: 45320,
      updateTime: '2026-09-29 12:00:31',
      encrypted: false,
      encoding: 'UTF-8',
      delimiter: '逗号',
      fieldCount: 6,
      header: ['id_md5', 'overdue_cnt_24m', 'max_overdue_amt', 'overdue_days_max', 'review_data', 'q_id'],
    },
    {
      id: 'f-pd-2',
      agencyCode: 'PD',
      name: 'PD_BACK_0930_1.csv',
      size: 51093440,
      rows: 48770,
      updateTime: '2026-09-30 12:00:05',
      encrypted: false,
      encoding: 'GBK',
      delimiter: '逗号',
      fieldCount: 6,
      header: ['id_md5', 'overdue_cnt_24m', 'max_overdue_amt', 'overdue_days_max', 'review_data', 'q_id'],
    },
  ],
  QT: [
    {
      id: 'f-qt-1',
      agencyCode: 'QT',
      name: 'QT_resp_20260930.csv',
      size: 23902208,
      rows: 30210,
      updateTime: '2026-09-30 08:00:05',
      encrypted: true,
      encoding: 'UTF-8',
      delimiter: '逗号',
      fieldCount: 6,
      header: ['id_md5', 'credit_score', 'risk_band', 'limit_amt_total', 'review_data', 'q_id'],
    },
    {
      id: 'f-qt-2',
      agencyCode: 'QT',
      name: 'QT_resp_20260916.csv',
      size: 20250624,
      rows: 26880,
      updateTime: '2026-09-16 08:00:02',
      encrypted: false,
      encoding: 'UTF-8',
      delimiter: '逗号',
      fieldCount: 6,
      header: ['id_md5', 'credit_score', 'risk_band', 'limit_amt_total', 'review_data', 'q_id'],
    },
  ],
  PBC: [
    {
      id: 'f-pbc-1',
      agencyCode: 'PBC',
      name: 'PBC_BASE_20260930.csv',
      size: 220200960,
      rows: 210000,
      updateTime: '2026-09-30 15:20:18',
      encrypted: false,
      encoding: 'UTF-8',
      delimiter: '制表符',
      fieldCount: 7,
      header: ['id_md5', 'credit_query_cnt_6m', 'card_cnt', 'account_open_months', 'risk_level_code', 'review_data', 'q_id'],
    },
  ],
  SHGJ: [
    {
      id: 'f-shgj-1',
      agencyCode: 'SHGJ',
      name: 'SHGJ_CREDIT_20260929.csv',
      size: 39845888,
      rows: 38000,
      updateTime: '2026-09-29 17:40:02',
      encrypted: false,
      encoding: 'UTF-8',
      delimiter: '逗号',
      fieldCount: 6,
      header: ['id_md5', 'enterprise_risk_score', 'legal_case_cnt', 'tax_arrear_flag', 'review_data', 'q_id'],
    },
  ],
}

/** 各机构 SFTP 目录下的子目录（R14：目录路径 + 文件名 = 完整文件路径） */
export const retroDirCatalog: Record<string, string[]> = {
  BH: ['2026-09', '2026-10'],
  PD: ['2026-09', '2026-10'],
  QT: ['2026-09', '2026-10'],
  PBC: ['2026-09', '2026-10'],
  SHGJ: ['2026-09', '2026-10'],
}

/** 前 5 行原始内容（R20：预览展示前 5 行原始内容） */
export type PreviewRow = Record<string, string>

/** 生成文件前 5 行原始内容（mock：按表头字段名稳定生成，总行数不足 5 行时展示全部行） */
export function buildPreviewRows(file: RetroFile): PreviewRow[] {
  const rows: PreviewRow[] = []
  const total = Math.min(5, Math.max(file.rows, 1))
  for (let i = 0; i < total; i++) {
    const row: PreviewRow = {}
    file.header.forEach((h, idx) => {
      row[h] = previewCellValue(h, idx, i)
    })
    rows.push(row)
  }
  return rows
}

/** 按字段名生成稳定的预览值 */
function previewCellValue(field: string, idx: number, rowIdx: number): string {
  if (field === 'id_md5') return `${(idx + 1).toString().padStart(2, '0')}a4f2c9b7d3805c6f1a2b3c4d5e6f70${rowIdx}91a2b3c4d5e6f708`.slice(0, 32)
  if (field === 'review_data' || field === 'review_date') return '2026-09-30'
  if (field === 'q_id') return `Q${(rowIdx + 1).toString().padStart(6, '0')}`
  if (/cnt|count|card/.test(field)) return String((rowIdx * 3 + idx) % 17)
  if (/amt|amount|limit/.test(field)) return ((rowIdx + 1) * 1200.5).toFixed(2)
  if (/score/.test(field)) return String(560 + rowIdx * 7)
  if (/flag/.test(field)) return rowIdx % 2 === 0 ? '0' : '1'
  if (/band|level/.test(field)) return ['A', 'B', 'C', 'D'][rowIdx % 4]
  if (/date|time/.test(field)) return '2026-09-30'
  return `VAL_${rowIdx + 1}_${idx + 1}`
}

/** 历史落库批次（R26/R27 文件去重校验依据：文件名 + 文件大小指纹） */
export interface ProcessedFileRecord {
  /** 文件名 */
  fileName: string
  /** 文件大小（字节），与文件名共同构成文件指纹 */
  fileSize: number
  /** 处理时间 */
  processTime: string
  /** 操作人 */
  operator: string
  /** 已生成的 backid */
  backid: string
}

/** 历史落库批次清单 */
export const processedFileRecords: ProcessedFileRecord[] = [
  { fileName: 'BH_RETRO_20260922_01.csv', fileSize: 64159744, processTime: '2026-09-24 10:32:05', operator: '王琳（风控数据组）', backid: 'BACK20260924017' },
  { fileName: 'PD_BACK_0929_2.csv', fileSize: 47915008, processTime: '2026-09-30 09:15:42', operator: '陈昊（模型算法组）', backid: 'BACK20260930003' },
  { fileName: 'PD_BACK_0929_2.csv', fileSize: 47915008, processTime: '2026-10-02 14:20:11', operator: '陈昊（模型算法组）', backid: 'BACK20261002011' },
  { fileName: 'QT_resp_20260916.csv', fileSize: 20250624, processTime: '2026-09-18 11:05:36', operator: '李思远（贷中管理团队）', backid: 'BACK20260918006' },
]

/** 按机构编码查询返回文件 */
export async function listRetroFiles(agencyCode: string): Promise<RetroFile[]> {
  return (retroFileCatalog[agencyCode] || []).map((f) => ({ ...f }))
}

/** 按文件指纹（文件名 + 文件大小）查询历史落库批次 */
export async function findProcessedRecords(fileName: string, fileSize: number): Promise<ProcessedFileRecord[]> {
  return processedFileRecords.filter((r) => r.fileName === fileName && r.fileSize === fileSize)
}
