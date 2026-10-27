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

/** SFTP 目录树节点类型：文件夹 / CSV 数据文件 / 压缩包 */
export type RetroNodeType = 'folder' | 'csv' | 'archive'

/** SFTP 目录树节点 */
export interface RetroTreeNode {
  /** 节点唯一键 */
  key: string
  /** 节点名称（文件夹名或文件名） */
  name: string
  /** 节点类型 */
  nodeType: RetroNodeType
  /** 相对机构根目录的路径；压缩包内文件形如 `包名!/内层路径` */
  path: string
  /** 文件大小（字节）；文件夹为其子项合计 */
  size?: number
  /** 数据行数（不含表头）；文件夹与压缩包为 0 */
  rows?: number
  /** 更新时间 */
  updateTime?: string
  /** 是否加密（CSV 节点为文件加密；压缩包节点为压缩包密码加密） */
  encrypted?: boolean
  /** 编码格式 */
  encoding?: string
  /** 分隔符 */
  delimiter?: string
  /** 表头字段数 */
  fieldCount?: number
  /** 表头字段名 */
  header?: string[]
  /** 子节点：文件夹内容 / 压缩包内文件 */
  children?: RetroTreeNode[]
}

/** 文件大小格式化（KB/MB/GB） */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

/**
 * 从回溯文件名解析回溯日期（review date）
 * 数据来源说明：各机构回溯文件名内嵌回溯日期，命名口径见本文件头部说明：
 *   1. 8 位日期：BH_RETRO_20260922_01.csv / QT_resp_20260930.csv / PBC_BASE_20260930.csv
 *      / SHGJ_CREDIT_20260929.csv，均为 yyyyMMdd；
 *   2. 4 位月日：PD_BACK_0929_2.csv，仅含 MMdd，年份按当年补齐；
 *   3. 其余文件名解析不到日期时返回空串，由调用方兜底。
 * @param fileName 回溯返回文件名
 * @returns 形如 2026-09-22 的回溯日期，解析不到时为空串
 */
export function parseReviewDateFromFileName(fileName: string): string {
  if (!fileName) return ''
  // 优先取 8 位 yyyyMMdd，并校验月日合法性
  const ymd = fileName.match(/(\d{4})(\d{2})(\d{2})/)
  if (ymd) {
    const [, y, m, d] = ymd
    const month = Number(m)
    const day = Number(d)
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${y}-${m}-${d}`
    }
  }
  // 其次取 4 位 MMdd（排除已消费的 8 位日期），年份按当年补齐
  const md = fileName.match(/(\d{2})(\d{2})/)
  if (md) {
    const [, m, d] = md
    const month = Number(m)
    const day = Number(d)
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${new Date().getFullYear()}-${m}-${d}`
    }
  }
  return ''
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
      fieldCount: 9,
      header: ['id_md5', 'phone_md5', 'inst_cnt_1m', 'loan_cnt_1m', 'loan_cnt_3m', 'loan_cnt_12m', 'max_overdue_amt', 'risk_band', 'review_data'],
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
      fieldCount: 9,
      header: ['id_md5', 'phone_md5', 'inst_cnt_1m', 'loan_cnt_1m', 'loan_cnt_3m', 'loan_cnt_12m', 'max_overdue_amt', 'risk_band', 'review_data'],
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
      fieldCount: 9,
      header: ['id_md5', 'phone_md5', 'inst_cnt_1m', 'loan_cnt_1m', 'loan_cnt_3m', 'loan_cnt_12m', 'max_overdue_amt', 'risk_band', 'review_data'],
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
      fieldCount: 7,
      header: ['id_md5', 'phone_md5', 'overdue_cnt_24m', 'max_overdue_amt', 'overdue_days_max', 'review_data', 'q_id'],
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
      fieldCount: 7,
      header: ['id_md5', 'phone_md5', 'overdue_cnt_24m', 'max_overdue_amt', 'overdue_days_max', 'review_data', 'q_id'],
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
      fieldCount: 7,
      header: ['id_md5', 'phone_md5', 'credit_score', 'risk_band', 'limit_amt_total', 'review_data', 'q_id'],
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
      fieldCount: 7,
      header: ['id_md5', 'phone_md5', 'credit_score', 'risk_band', 'limit_amt_total', 'review_data', 'q_id'],
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
      fieldCount: 8,
      header: ['id_md5', 'phone_md5', 'credit_query_cnt_6m', 'card_cnt', 'account_open_months', 'risk_level_code', 'review_data', 'q_id'],
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

/**
 * 压缩包内容目录（按压缩包节点 key 索引）
 * 数据来源说明：
 *   1. 压缩包节点在目录树中不带 children，需先解密（加密包）再解压才可看到包内文件；
 *   2. 包内文件 path 使用 `包名!/内层路径` 表达解压后的虚拟路径；
 *   3. 包内 CSV 同样可能是加密文件，解密流程与普通 CSV 一致（R19）。
 */
export const archiveContentCatalog: Record<string, RetroTreeNode[]> = {
  'BH/2026-10/BH_RETRO_20261012_batch.zip': [
    {
      key: 'BH/2026-10/BH_RETRO_20261012_batch.zip!/BH_RETRO_20261012_01.csv',
      name: 'BH_RETRO_20261012_01.csv',
      nodeType: 'csv',
      path: '2026-10/BH_RETRO_20261012_batch.zip!/BH_RETRO_20261012_01.csv',
      size: 47185920,
      rows: 66400,
      updateTime: '2026-10-13 08:05:22',
      encrypted: false,
      encoding: 'UTF-8',
      delimiter: '逗号',
      fieldCount: 9,
      header: ['id_md5', 'phone_md5', 'inst_cnt_1m', 'loan_cnt_1m', 'loan_cnt_3m', 'loan_cnt_12m', 'max_overdue_amt', 'risk_band', 'review_data'],
    },
    {
      key: 'BH/2026-10/BH_RETRO_20261012_batch.zip!/BH_RETRO_20261012_02.csv',
      name: 'BH_RETRO_20261012_02.csv',
      nodeType: 'csv',
      path: '2026-10/BH_RETRO_20261012_batch.zip!/BH_RETRO_20261012_02.csv',
      size: 47185920,
      rows: 66400,
      updateTime: '2026-10-13 08:05:31',
      encrypted: false,
      encoding: 'UTF-8',
      delimiter: '逗号',
      fieldCount: 9,
      header: ['id_md5', 'phone_md5', 'inst_cnt_1m', 'loan_cnt_1m', 'loan_cnt_3m', 'loan_cnt_12m', 'max_overdue_amt', 'risk_band', 'review_data'],
    },
  ],
  'PD/2026-09/PD_BACK_0918_1.zip': [
    {
      key: 'PD/2026-09/PD_BACK_0918_1.zip!/PD_BACK_0918_1.csv',
      name: 'PD_BACK_0918_1.csv',
      nodeType: 'csv',
      path: '2026-09/PD_BACK_0918_1.zip!/PD_BACK_0918_1.csv',
      size: 25165824,
      rows: 22880,
      updateTime: '2026-09-19 09:11:50',
      encrypted: false,
      encoding: 'UTF-8',
      delimiter: '逗号',
      fieldCount: 7,
      header: ['id_md5', 'phone_md5', 'overdue_cnt_24m', 'max_overdue_amt', 'overdue_days_max', 'review_data', 'q_id'],
    },
  ],
  'QT/2026-10/QT_resp_20261015_batch.zip': [
    {
      key: 'QT/2026-10/QT_resp_20261015_batch.zip!/QT_resp_20261015.csv',
      name: 'QT_resp_20261015.csv',
      nodeType: 'csv',
      path: '2026-10/QT_resp_20261015_batch.zip!/QT_resp_20261015.csv',
      size: 53060608,
      rows: 66820,
      updateTime: '2026-10-16 08:05:58',
      encrypted: true,
      encoding: 'UTF-8',
      delimiter: '逗号',
      fieldCount: 7,
      header: ['id_md5', 'phone_md5', 'credit_score', 'risk_band', 'limit_amt_total', 'review_data', 'q_id'],
    },
  ],
  'PBC/2026-10/PBC_BASE_20260930.zip': [
    {
      key: 'PBC/2026-10/PBC_BASE_20260930.zip!/PBC_BASE_20260930.csv',
      name: 'PBC_BASE_20260930.csv',
      nodeType: 'csv',
      path: '2026-10/PBC_BASE_20260930.zip!/PBC_BASE_20260930.csv',
      size: 220200960,
      rows: 210000,
      updateTime: '2026-09-30 15:22:20',
      encrypted: false,
      encoding: 'UTF-8',
      delimiter: '制表符',
      fieldCount: 8,
      header: ['id_md5', 'phone_md5', 'credit_query_cnt_6m', 'card_cnt', 'account_open_months', 'risk_level_code', 'review_data', 'q_id'],
    },
  ],
  'SHGJ/2026-10/SHGJ_CREDIT_20260929.zip': [
    {
      key: 'SHGJ/2026-10/SHGJ_CREDIT_20260929.zip!/SHGJ_CREDIT_20260929.csv',
      name: 'SHGJ_CREDIT_20260929.csv',
      nodeType: 'csv',
      path: '2026-10/SHGJ_CREDIT_20260929.zip!/SHGJ_CREDIT_20260929.csv',
      size: 39845888,
      rows: 38000,
      updateTime: '2026-09-29 17:41:05',
      encrypted: false,
      encoding: 'UTF-8',
      delimiter: '逗号',
      fieldCount: 6,
      header: ['id_md5', 'enterprise_risk_score', 'legal_case_cnt', 'tax_arrear_flag', 'review_data', 'q_id'],
    },
  ],
}

/**
 * 各机构 SFTP 目录树（支持文件夹 / CSV / 压缩包三级节点）
 * 数据来源说明：
 *   1. 根路径为各机构 sftp.directory（download 目录），由页面自动带入（R13）；
 *   2. 目录下按「月份子目录 + 历史归档目录」组织，贴近机构实际回传习惯；
 *   3. 压缩包节点不带 children，包内文件由 archiveContentCatalog 在解压后下发；
 *   4. 压缩包节点 encrypted 表示「压缩包加密」，需先解密再解压（R17/R19）。
 */
export const retroTreeCatalog: Record<string, RetroTreeNode[]> = {
  BH: [
    {
      key: 'BH/2026-10',
      name: '2026-10',
      nodeType: 'folder',
      path: '2026-10/',
      size: 283115520,
      children: [
        {
          key: 'BH/2026-10/BH_RETRO_20261012_01.csv',
          name: 'BH_RETRO_20261012_01.csv',
          nodeType: 'csv',
          path: '2026-10/BH_RETRO_20261012_01.csv',
          size: 94371840,
          rows: 132800,
          updateTime: '2026-10-13 08:00:15',
          encrypted: false,
          encoding: 'UTF-8',
          delimiter: '逗号',
          fieldCount: 9,
          header: ['id_md5', 'phone_md5', 'inst_cnt_1m', 'loan_cnt_1m', 'loan_cnt_3m', 'loan_cnt_12m', 'max_overdue_amt', 'risk_band', 'review_data'],
        },
        {
          key: 'BH/2026-10/BH_RETRO_20261012_batch.zip',
          name: 'BH_RETRO_20261012_batch.zip',
          nodeType: 'archive',
          path: '2026-10/BH_RETRO_20261012_batch.zip',
          size: 188743680,
          rows: 0,
          updateTime: '2026-10-13 08:05:40',
          encrypted: true,
        },
      ],
    },
    {
      key: 'BH/2026-09',
      name: '2026-09',
      nodeType: 'folder',
      path: '2026-09/',
      size: 210540230,
      children: [
        {
          key: 'BH/2026-09/BH_RETRO_20260928_01.csv',
          name: 'BH_RETRO_20260928_01.csv',
          nodeType: 'csv',
          path: '2026-09/BH_RETRO_20260928_01.csv',
          size: 90596947,
          rows: 128450,
          updateTime: '2026-09-29 08:00:12',
          encrypted: false,
          encoding: 'UTF-8',
          delimiter: '逗号',
          fieldCount: 9,
          header: ['id_md5', 'phone_md5', 'inst_cnt_1m', 'loan_cnt_1m', 'loan_cnt_3m', 'loan_cnt_12m', 'max_overdue_amt', 'risk_band', 'review_data'],
        },
        {
          key: 'BH/2026-09/BH_RETRO_20260922_01.csv',
          name: 'BH_RETRO_20260922_01.csv',
          nodeType: 'csv',
          path: '2026-09/BH_RETRO_20260922_01.csv',
          size: 64159744,
          rows: 96210,
          updateTime: '2026-09-23 08:00:09',
          encrypted: false,
          encoding: 'UTF-8',
          delimiter: '逗号',
          fieldCount: 9,
          header: ['id_md5', 'phone_md5', 'inst_cnt_1m', 'loan_cnt_1m', 'loan_cnt_3m', 'loan_cnt_12m', 'max_overdue_amt', 'risk_band', 'review_data'],
        },
      ],
    },
    {
      key: 'BH/archive',
      name: 'archive',
      nodeType: 'folder',
      path: 'archive/',
      size: 55784243,
      children: [
        {
          key: 'BH/archive/BH_RETRO_20260915_01.csv',
          name: 'BH_RETRO_20260915_01.csv',
          nodeType: 'csv',
          path: 'archive/BH_RETRO_20260915_01.csv',
          size: 55784243,
          rows: 88120,
          updateTime: '2026-09-16 08:11:40',
          encrypted: false,
          encoding: 'UTF-8',
          delimiter: '逗号',
          fieldCount: 9,
          header: ['id_md5', 'phone_md5', 'inst_cnt_1m', 'loan_cnt_1m', 'loan_cnt_3m', 'loan_cnt_12m', 'max_overdue_amt', 'risk_band', 'review_data'],
        },
      ],
    },
  ],
  PD: [
    {
      key: 'PD/2026-10',
      name: '2026-10',
      nodeType: 'folder',
      path: '2026-10/',
      size: 102186880,
      children: [
        {
          key: 'PD/2026-10/PD_BACK_0930_1.csv',
          name: 'PD_BACK_0930_1.csv',
          nodeType: 'csv',
          path: '2026-10/PD_BACK_0930_1.csv',
          size: 51093440,
          rows: 48770,
          updateTime: '2026-09-30 12:00:05',
          encrypted: false,
          encoding: 'GBK',
          delimiter: '逗号',
          fieldCount: 7,
          header: ['id_md5', 'phone_md5', 'overdue_cnt_24m', 'max_overdue_amt', 'overdue_days_max', 'review_data', 'q_id'],
        },
        {
          key: 'PD/2026-10/PD_BACK_0929_2.csv',
          name: 'PD_BACK_0929_2.csv',
          nodeType: 'csv',
          path: '2026-10/PD_BACK_0929_2.csv',
          size: 47915008,
          rows: 45320,
          updateTime: '2026-09-29 12:00:31',
          encrypted: false,
          encoding: 'UTF-8',
          delimiter: '逗号',
          fieldCount: 7,
          header: ['id_md5', 'phone_md5', 'overdue_cnt_24m', 'max_overdue_amt', 'overdue_days_max', 'review_data', 'q_id'],
        },
      ],
    },
    {
      key: 'PD/2026-09',
      name: '2026-09',
      nodeType: 'folder',
      path: '2026-09/',
      size: 50331648,
      children: [
        {
          key: 'PD/2026-09/PD_BACK_0918_1.zip',
          name: 'PD_BACK_0918_1.zip',
          nodeType: 'archive',
          path: '2026-09/PD_BACK_0918_1.zip',
          size: 50331648,
          rows: 0,
          updateTime: '2026-09-19 09:12:03',
          encrypted: false,
        },
      ],
    },
  ],
  QT: [
    {
      key: 'QT/2026-10',
      name: '2026-10',
      nodeType: 'folder',
      path: '2026-10/',
      size: 153925632,
      children: [
        {
          key: 'QT/2026-10/QT_resp_20260930.csv',
          name: 'QT_resp_20260930.csv',
          nodeType: 'csv',
          path: '2026-10/QT_resp_20260930.csv',
          size: 23902208,
          rows: 30210,
          updateTime: '2026-09-30 08:00:05',
          encrypted: true,
          encoding: 'UTF-8',
          delimiter: '逗号',
          fieldCount: 7,
          header: ['id_md5', 'phone_md5', 'credit_score', 'risk_band', 'limit_amt_total', 'review_data', 'q_id'],
        },
        {
          key: 'QT/2026-10/QT_resp_20261020.csv',
          name: 'QT_resp_20261020.csv',
          nodeType: 'csv',
          path: '2026-10/QT_resp_20261020.csv',
          size: 23902208,
          rows: 30210,
          updateTime: '2026-10-21 08:00:05',
          encrypted: false,
          encoding: 'UTF-8',
          delimiter: '逗号',
          fieldCount: 7,
          header: ['id_md5', 'phone_md5', 'credit_score', 'risk_band', 'limit_amt_total', 'review_data', 'q_id'],
        },
        {
          key: 'QT/2026-10/QT_resp_20261015_batch.zip',
          name: 'QT_resp_20261015_batch.zip',
          nodeType: 'archive',
          path: '2026-10/QT_resp_20261015_batch.zip',
          size: 106121216,
          rows: 0,
          updateTime: '2026-10-16 08:06:12',
          encrypted: true,
        },
      ],
    },
    {
      key: 'QT/2026-09',
      name: '2026-09',
      nodeType: 'folder',
      path: '2026-09/',
      size: 20250624,
      children: [
        {
          key: 'QT/2026-09/QT_resp_20260916.csv',
          name: 'QT_resp_20260916.csv',
          nodeType: 'csv',
          path: '2026-09/QT_resp_20260916.csv',
          size: 20250624,
          rows: 26880,
          updateTime: '2026-09-16 08:00:02',
          encrypted: false,
          encoding: 'UTF-8',
          delimiter: '逗号',
          fieldCount: 7,
          header: ['id_md5', 'phone_md5', 'credit_score', 'risk_band', 'limit_amt_total', 'review_data', 'q_id'],
        },
      ],
    },
  ],
  PBC: [
    {
      key: 'PBC/2026-10',
      name: '2026-10',
      nodeType: 'folder',
      path: '2026-10/',
      size: 660602880,
      children: [
        {
          key: 'PBC/2026-10/PBC_BASE_20260930.csv',
          name: 'PBC_BASE_20260930.csv',
          nodeType: 'csv',
          path: '2026-10/PBC_BASE_20260930.csv',
          size: 220200960,
          rows: 210000,
          updateTime: '2026-09-30 15:20:18',
          encrypted: false,
          encoding: 'UTF-8',
          delimiter: '制表符',
          fieldCount: 8,
          header: ['id_md5', 'phone_md5', 'credit_query_cnt_6m', 'card_cnt', 'account_open_months', 'risk_level_code', 'review_data', 'q_id'],
        },
        {
          key: 'PBC/2026-10/PBC_BASE_20261020.csv',
          name: 'PBC_BASE_20261020.csv',
          nodeType: 'csv',
          path: '2026-10/PBC_BASE_20261020.csv',
          size: 220200960,
          rows: 210000,
          updateTime: '2026-10-21 09:30:18',
          encrypted: false,
          encoding: 'UTF-8',
          delimiter: '制表符',
          fieldCount: 8,
          header: ['id_md5', 'phone_md5', 'credit_query_cnt_6m', 'card_cnt', 'account_open_months', 'risk_level_code', 'review_data', 'q_id'],
        },
        {
          key: 'PBC/2026-10/PBC_BASE_20260930.zip',
          name: 'PBC_BASE_20260930.zip',
          nodeType: 'archive',
          path: '2026-10/PBC_BASE_20260930.zip',
          size: 220200960,
          rows: 0,
          updateTime: '2026-09-30 15:22:36',
          encrypted: false,
        },
      ],
    },
  ],
  SHGJ: [
    {
      key: 'SHGJ/2026-10',
      name: '2026-10',
      nodeType: 'folder',
      path: '2026-10/',
      size: 119537664,
      children: [
        {
          key: 'SHGJ/2026-10/SHGJ_CREDIT_20260929.csv',
          name: 'SHGJ_CREDIT_20260929.csv',
          nodeType: 'csv',
          path: '2026-10/SHGJ_CREDIT_20260929.csv',
          size: 39845888,
          rows: 38000,
          updateTime: '2026-09-29 17:40:02',
          encrypted: false,
          encoding: 'UTF-8',
          delimiter: '逗号',
          fieldCount: 6,
          header: ['id_md5', 'enterprise_risk_score', 'legal_case_cnt', 'tax_arrear_flag', 'review_data', 'q_id'],
        },
        {
          key: 'SHGJ/2026-10/SHGJ_CREDIT_20261020.csv',
          name: 'SHGJ_CREDIT_20261020.csv',
          nodeType: 'csv',
          path: '2026-10/SHGJ_CREDIT_20261020.csv',
          size: 39845888,
          rows: 38000,
          updateTime: '2026-10-21 08:50:02',
          encrypted: false,
          encoding: 'UTF-8',
          delimiter: '逗号',
          fieldCount: 6,
          header: ['id_md5', 'enterprise_risk_score', 'legal_case_cnt', 'tax_arrear_flag', 'review_data', 'q_id'],
        },
        {
          key: 'SHGJ/2026-10/SHGJ_CREDIT_20260929.zip',
          name: 'SHGJ_CREDIT_20260929.zip',
          nodeType: 'archive',
          path: '2026-10/SHGJ_CREDIT_20260929.zip',
          size: 39845888,
          rows: 0,
          updateTime: '2026-09-29 17:41:20',
          encrypted: false,
        },
      ],
    },
  ],
}

/** 前 5 行原始内容（R20：预览展示前 5 行原始内容） */
export type PreviewRow = Record<string, string>

/** 生成文件前 5 行原始内容（mock：按表头字段名稳定生成，总行数不足 5 行时展示全部行） */
export function buildPreviewRows(file: { rows?: number; header?: string[] }): PreviewRow[] {
  const rows: PreviewRow[] = []
  const header = file.header || []
  const total = Math.min(5, Math.max(file.rows || 0, 1))
  for (let i = 0; i < total; i++) {
    const row: PreviewRow = {}
    header.forEach((h, idx) => {
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

/** 按机构编码查询 SFTP 目录树（含文件夹 / CSV / 压缩包节点） */
export async function listRetroTree(agencyCode: string): Promise<RetroTreeNode[]> {
  return (retroTreeCatalog[agencyCode] || []).map((n) => ({ ...n }))
}

/**
 * 解密压缩包（R19：压缩包密码由机构线下提供）
 * mock 规则：密码长度不少于 8 位视为正确，用于演示密码错误时的阻断提示
 * @param archiveKey 压缩包节点 key
 * @param password 线下获取的压缩包密码
 * @returns 解密成功时返回 true
 */
export async function decryptArchive(archiveKey: string, password: string): Promise<boolean> {
  await new Promise((r) => setTimeout(r, 600))
  if (!archiveContentCatalog[archiveKey]) return false
  return password.trim().length >= 8
}

/**
 * 解压压缩包并返回包内文件（R17：包内仍只接受 CSV）
 * @param archiveKey 压缩包节点 key
 * @returns 包内文件节点列表
 */
export async function extractArchiveContent(archiveKey: string): Promise<RetroTreeNode[]> {
  await new Promise((r) => setTimeout(r, 500))
  return (archiveContentCatalog[archiveKey] || []).map((n) => ({ ...n }))
}

/** 按文件指纹（文件名 + 文件大小）查询历史落库批次 */
export async function findProcessedRecords(fileName: string, fileSize: number): Promise<ProcessedFileRecord[]> {
  return processedFileRecords.filter((r) => r.fileName === fileName && r.fileSize === fileSize)
}
