/**
 * 统一查询 · 我的导出 Mock 种子数据
 *
 * 全部为前端 Mock,不发起任何 HTTP 请求。
 * 记录结构与截图「我的导出」列表一致:任务编号 / 文件名 / 数据源 /
 * 状态 / 进度 / 文件大小 / 创建时间。
 */
import type { ExportTask } from './types'

/** 初始导出任务列表(演示用,覆盖 5 种状态) */
export const SEED_EXPORT_TASKS: ExportTask[] = [
  {
    id: 'EXP20260910-001',
    fileName: '风险异动分析_Doris_20260910145500',
    fileExt: 'csv',
    datasource: 'Doris',
    status: 'exporting',
    progress: 67,
    fileSize: '—',
    createdAt: '2026-09-10 14:55:00',
    method: 'platform',
    rowCount: 12840
  },
  {
    id: 'EXP20260910-002',
    fileName: '客群分层报表_Hive_20260910150200',
    fileExt: 'csv',
    datasource: 'Hive',
    status: 'queued',
    progress: 0,
    fileSize: '—',
    createdAt: '2026-09-10 15:02:00',
    method: 'platform',
    rowCount: 5230
  },
  {
    id: 'EXP20260910-003',
    fileName: '放款月维度统计_Doris_20260910143000',
    fileExt: 'csv',
    datasource: 'Doris',
    status: 'success',
    progress: 100,
    fileSize: '156.3 MB',
    createdAt: '2026-09-10 14:30:00',
    method: 'platform',
    rowCount: 96420
  },
  {
    id: 'EXP20260910-004',
    fileName: '账龄迁移矩阵_Spark_20260910120000',
    fileExt: 'csv',
    datasource: 'Spark',
    status: 'success',
    progress: 100,
    fileSize: '2.4 GB',
    createdAt: '2026-09-10 12:00:00',
    method: 'local',
    rowCount: 1250000
  },
  {
    id: 'EXP20260910-005',
    fileName: '产品维度交叉分析_Hive_20260910110000',
    fileExt: 'csv',
    datasource: 'Hive',
    status: 'failed',
    progress: 34,
    fileSize: '—',
    createdAt: '2026-09-10 11:00:00',
    method: 'platform',
    rowCount: 0
  },
  {
    id: 'EXP20260909-012',
    fileName: '逾期率趋势分析_Doris_20260909160000',
    fileExt: 'csv',
    datasource: 'Doris',
    status: 'expired',
    progress: 100,
    fileSize: '89.7 MB',
    createdAt: '2026-09-09 16:00:00',
    method: 'platform',
    rowCount: 68200
  }
]

/** 数据源标签颜色(与截图一致:Doris=紫/Hive=橙/Spark=红) */
export const EXPORT_DS_COLOR: Record<string, string> = {
  Doris: 'arcoblue',
  Hive: 'orange',
  Spark: 'red'
}
