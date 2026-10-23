/**
 * 落库目标 Hive 表 · Mock 数据源
 * 需求文档《外数文件落库》B2 R41 / B4 R67
 *
 * 数据来源说明：
 *   1. 库名 dw_ods / dw_dwd / dw_dws 派生自 external-data/mock/storageClusters.ts 的 databasesMock
 *      （db-hive-02 ~ db-hive-04，均挂在 Hive-DataWarehouse 集群 cluster-hive-01）；
 *   2. 表级清单为本模块新增：storageClusters 只有库级 tableCount，无表名，
 *      故按外数回溯场景构造 dw_ods 下的回溯标准表与线上样本表；
 *   3. R41 要求「落库目标表由用户在固定外数库中手动搜索选择」，因此这里只提供候选，
 *      页面侧为下拉搜索而非 allow-create，不允许新建表。
 */

export interface HiveTableItem {
  /** 库名 */
  database: string
  /** 表名 */
  table: string
  /** 全限定名 */
  fullName: string
  /** 表类型：回溯落库标准表 / 线上样本表（用于一致性校验对比） */
  kind: 'retro_std' | 'online_sample'
  /** 表描述 */
  description: string
  /** 分区字段，标准表固定为 datax（R40） */
  partitionField: string
  /** 字段数 */
  columnCount: number
  /** 最近更新时间 */
  updatedAt: string
}

/** 固定外数库（落库目标表与一致性校验样本表均在此范围内搜索） */
export const EXTERNAL_DATA_DATABASE = 'dw_ods'

/** Hive 表候选清单 */
export const hiveTablesMock: HiveTableItem[] = [
  {
    database: 'dw_ods',
    table: 'ods_ext_bh_retro_std',
    fullName: 'dw_ods.ods_ext_bh_retro_std',
    kind: 'retro_std',
    description: '百行征信-回溯标准化结果表',
    partitionField: 'datax',
    columnCount: 28,
    updatedAt: '2026-09-30 02:10:00',
  },
  {
    database: 'dw_ods',
    table: 'ods_ext_pd_retro_std',
    fullName: 'dw_ods.ods_ext_pd_retro_std',
    kind: 'retro_std',
    description: '朴道征信-回溯标准化结果表',
    partitionField: 'datax',
    columnCount: 22,
    updatedAt: '2026-09-29 02:10:00',
  },
  {
    database: 'dw_ods',
    table: 'ods_ext_qt_retro_std',
    fullName: 'dw_ods.ods_ext_qt_retro_std',
    kind: 'retro_std',
    description: '钱塘征信-回溯标准化结果表',
    partitionField: 'datax',
    columnCount: 19,
    updatedAt: '2026-09-28 02:10:00',
  },
  {
    database: 'dw_ods',
    table: 'ods_ext_pbcc_retro_std',
    fullName: 'dw_ods.ods_ext_pbcc_retro_std',
    kind: 'retro_std',
    description: '人行征信中心-回溯标准化结果表',
    partitionField: 'datax',
    columnCount: 31,
    updatedAt: '2026-09-27 02:10:00',
  },
  {
    database: 'dw_ods',
    table: 'ods_ext_shgj_retro_std',
    fullName: 'dw_ods.ods_ext_shgj_retro_std',
    kind: 'retro_std',
    description: '上海数据集团-回溯标准化结果表',
    partitionField: 'datax',
    columnCount: 25,
    updatedAt: '2026-09-26 02:10:00',
  },
  {
    database: 'dw_ods',
    table: 'ods_ext_retro_online_std',
    fullName: 'dw_ods.ods_ext_retro_online_std',
    kind: 'online_sample',
    description: '外数回溯线上存量样本表（一致性校验对比基准）',
    partitionField: 'datax',
    columnCount: 28,
    updatedAt: '2026-10-20 01:30:00',
  },
  {
    database: 'dw_ods',
    table: 'ods_ext_retro_batch_std',
    fullName: 'dw_ods.ods_ext_retro_batch_std',
    kind: 'online_sample',
    description: '外数回溯批次合并样本表（多文件拼接场景对比基准）',
    partitionField: 'datax',
    columnCount: 28,
    updatedAt: '2026-10-19 01:30:00',
  },
  {
    database: 'dw_dwd',
    table: 'dwd_credit_query_snapshot',
    fullName: 'dw_dwd.dwd_credit_query_snapshot',
    kind: 'online_sample',
    description: '征信查询快照明细表（一致性校验对比基准）',
    partitionField: 'datax',
    columnCount: 17,
    updatedAt: '2026-10-20 03:00:00',
  },
  {
    database: 'dw_dws',
    table: 'dws_risk_feature_online',
    fullName: 'dw_dws.dws_risk_feature_online',
    kind: 'online_sample',
    description: '风险特征在线宽表（一致性校验对比基准）',
    partitionField: 'datax',
    columnCount: 46,
    updatedAt: '2026-10-20 03:10:00',
  },
  {
    database: 'dw_dws',
    table: 'dm_customer_score_daily',
    fullName: 'dw_dws.dm_customer_score_daily',
    kind: 'online_sample',
    description: '客户评分日汇总表（一致性校验对比基准）',
    partitionField: 'datax',
    columnCount: 21,
    updatedAt: '2026-10-20 03:20:00',
  },
]

/** 查询可作为落库目标的 Hive 表（R41：仅固定外数库内搜索，不允许新建） */
export async function listRetroStdTables(keyword?: string): Promise<HiveTableItem[]> {
  const kw = keyword?.trim().toLowerCase()
  return hiveTablesMock.filter((t) => {
    if (t.kind !== 'retro_std') return false
    if (kw && !t.fullName.toLowerCase().includes(kw) && !t.description.toLowerCase().includes(kw)) return false
    return true
  })
}

/** 查询一致性校验可选的线上样本表（R67：需求方指定固定库位置，待确认） */
export async function listOnlineSampleTables(keyword?: string): Promise<HiveTableItem[]> {
  const kw = keyword?.trim().toLowerCase()
  return hiveTablesMock.filter((t) => {
    if (t.kind !== 'online_sample') return false
    if (kw && !t.fullName.toLowerCase().includes(kw) && !t.description.toLowerCase().includes(kw)) return false
    return true
  })
}

/** 按机构推荐默认落库目标表（按机构编码前缀匹配表名） */
export function recommendRetroStdTable(agencyCode: string): HiveTableItem | undefined {
  const map: Record<string, string> = {
    BH: 'ods_ext_bh_retro_std',
    PD: 'ods_ext_pd_retro_std',
    QT: 'ods_ext_qt_retro_std',
    PBC: 'ods_ext_pbcc_retro_std',
    SHGJ: 'ods_ext_shgj_retro_std',
  }
  const table = map[agencyCode]
  return table ? hiveTablesMock.find((t) => t.table === table) : undefined
}
