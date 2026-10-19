/**
 * 数据任务服务(一期) · Doris ↔ Hive 双向自助同步 - Mock 数据
 *
 * 参考需求文档
 *   - 一期:仅 Doris ↔ Hive 双向同步
 *   - 模块 A:同步任务创建(选库 → 选源表 → 推导目标端 → 提交执行)
 *   - 模块 B:执行记录(全员可见,人人可查)
 *   - 模块 C:通知推送 → 本期前端不实现,仅预留字段
 *
 * 数据全部为前端 Mock,前端模拟执行流程
 *   pending → running → success / failed
 * 失败态为可点击重试。
 */
import type { SyncDirection, SyncRecord, SyncStatus, SyncTable, SyncTarget, AllowDb } from './sync-tasks-types'

/* ------------------------------------------------------------------ */
/* ① 允许同步的数据库(白名单)                                            */
/* ------------------------------------------------------------------ */

/** 允许同步的数据库白名单(取自现有表/库结构 + 用户个人账户库,符合需求 R01/R03) */
export const ALLOWED_DATABASES: AllowDb[] = [
  {
    id: 'doris-internal',
    datasource: 'doris',
    cluster: 'internal',
    database: 'ADM',
    owner: '王运营',
    type: 'personal'
  },
  {
    id: 'doris-risk',
    datasource: 'doris',
    cluster: 'internal',
    database: 'risk',
    owner: '王运营',
    type: 'personal'
  },
  {
    id: 'doris-temp',
    datasource: 'doris',
    cluster: 'internal',
    database: 'temp',
    owner: '王运营',
    type: 'team'
  },
  {
    id: 'hive-inceptor',
    datasource: 'hive',
    cluster: 'inceptor',
    database: 'risk',
    owner: '王运营',
    type: 'personal'
  },
  {
    id: 'hive-dwd',
    datasource: 'hive',
    cluster: 'inceptor',
    database: 'dwd',
    owner: '王运营',
    type: 'personal'
  }
]

/** 单表字段数上限(由数仓/Tech 侧给出默认值,可被配置覆盖) */
export const SYNC_FIELD_LIMIT = 32

/* ------------------------------------------------------------------ */
/* ② 可同步表清单(白名单下,不同步分区表 / 非个人表 / 超字段数)             */
/* ------------------------------------------------------------------ */

const FIELD_TYPES = ['varchar(32)', 'varchar(64)', 'decimal(18,2)', 'int', 'date', 'string']
function fields(n: number, prefix = 'col'): { name: string; type: string }[] {
  return Array.from({ length: n }, (_, i) => ({
    name: `${prefix}_${String(i + 1).padStart(2, '0')}`,
    type: FIELD_TYPES[i % FIELD_TYPES.length]
  }))
}

/** 同名表在两端都建:字段数固定展示,便于预览 */
export const SYNC_TABLES: SyncTable[] = [
  {
    id: 't-doris-dwd_loan_daily',
    datasource: 'doris',
    cluster: 'internal',
    database: 'ADM',
    tableName: 'dwd_loan_daily',
    comment: '放款明细表',
    isPartitioned: false,
    fieldCount: 6,
    fields: fields(6, 'col')
  },
  {
    id: 't-doris-dwd_repay_daily',
    datasource: 'doris',
    cluster: 'internal',
    database: 'ADM',
    tableName: 'dwd_repay_daily',
    comment: '还款明细表',
    isPartitioned: false,
    fieldCount: 6,
    fields: fields(6, 'col')
  },
  {
    id: 't-doris-ads_user_summary',
    datasource: 'doris',
    cluster: 'internal',
    database: 'ADM',
    tableName: 'ads_user_summary',
    comment: '用户汇总表',
    isPartitioned: false,
    fieldCount: 6,
    fields: fields(6, 'col')
  },
  {
    id: 't-doris-risk_sample_policy_a',
    datasource: 'doris',
    cluster: 'internal',
    database: 'risk',
    tableName: 'risk_sample_policy_a',
    comment: '通反·策略样本A表',
    isPartitioned: false,
    fieldCount: 10,
    fields: fields(10, 'col')
  },
  {
    id: 't-doris-risk_sample_policy_b',
    datasource: 'doris',
    cluster: 'internal',
    database: 'risk',
    tableName: 'risk_sample_policy_b',
    comment: '通反·策略样本B表',
    isPartitioned: false,
    fieldCount: 8,
    fields: fields(8, 'col')
  },
  {
    id: 't-hive-dwd_loan_detail',
    datasource: 'hive',
    cluster: 'inceptor',
    database: 'dwd',
    tableName: 'dwd_loan_detail',
    comment: '贷款明细宽表',
    isPartitioned: false,
    fieldCount: 5,
    fields: fields(5, 'col')
  },
  {
    id: 't-hive-dws_risk_summary',
    datasource: 'hive',
    cluster: 'inceptor',
    database: 'dwd',
    tableName: 'dws_risk_summary',
    comment: '风险汇总表',
    isPartitioned: false,
    fieldCount: 5,
    fields: fields(5, 'col')
  },
  {
    id: 't-hive-risk_scored_a',
    datasource: 'hive',
    cluster: 'inceptor',
    database: 'risk',
    tableName: 'risk_scored_a',
    comment: '通反·模型打分结果A',
    isPartitioned: false,
    fieldCount: 12,
    fields: fields(12, 'col')
  }
]

/** 给定一个库,取它的可同步表(已按需求过滤:仅个人账户 / 仅非分区表) */
export function tablesOfDatabase(databaseId: string): SyncTable[] {
  const db = ALLOWED_DATABASES.find(d => d.id === databaseId)
  if (!db) return []
  return SYNC_TABLES.filter(
    t =>
      t.datasource === db.datasource &&
      t.cluster === db.cluster &&
      t.database === db.database &&
      !t.isPartitioned
  )
}

/* ------------------------------------------------------------------ */
/* ③ 目标端推导                                                           */
/* ------------------------------------------------------------------ */

/** 对端默认落库(推导失败时的 fallback) */
const PEER_DEFAULT_DB: Record<'doris' | 'hive', { cluster: string; database: string; tmp: boolean }> = {
  doris: { cluster: 'internal', database: 'tmp', tmp: true },
  hive: { cluster: 'inceptor', database: 'risk', tmp: false }
}

/**
 * 由源表推导目标端
 *   - 优先找对端同名表(语义最清晰)
 *   - 找不到时 fallback 到对端默认库建同名表(满足 R06/R07 同名表 + 自动建表的需求)
 */
export function deriveTarget(source: SyncTable): SyncTarget {
  const sameTableName = SYNC_TABLES.filter(
    t => t.tableName === source.tableName && t.id !== source.id
  )
  const peerDatasource: 'doris' | 'hive' = source.datasource === 'doris' ? 'hive' : 'doris'
  const peerOfSameName = sameTableName.find(t => t.datasource === peerDatasource)
  if (peerOfSameName) {
    return {
      datasource: peerOfSameName.datasource,
      cluster: peerOfSameName.cluster,
      database: peerOfSameName.database,
      tableName: peerOfSameName.tableName,
      // 反向 Hive→Doris 时,需要走新的 tmp 表方式(以 source.db_user 为前缀的 tmp 库)
      // 本期为前端 Mock,直接落到 `db_target` 标识
      tmp: source.datasource === 'hive'
    }
  }
  // Fallback:对端默认库建同名表
  const fallback = PEER_DEFAULT_DB[peerDatasource]
  return {
    datasource: peerDatasource,
    cluster: fallback.cluster,
    database: fallback.database,
    tableName: source.tableName,
    tmp: fallback.tmp
  }
}

/** 系统推导同步方向:R07 */
export function deriveDirection(source: SyncTable): SyncDirection {
  return source.datasource === 'doris' ? 'doris-to-hive' : 'hive-to-doris'
}

/* ------------------------------------------------------------------ */
/* ④ 执行记录 · 种子数据                                                  */
/* ------------------------------------------------------------------ */

function rid(seed: number): string {
  return `SYNC${seed}`
}

function nowOffsetDays(daysAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

export const SEED_SYNC_RECORDS: SyncRecord[] = [
  {
    id: rid(20261018),
    direction: 'doris-to-hive',
    sourceDatasource: 'doris',
    sourceDatabase: 'risk.risk_sample_policy_a',
    sourceTable: 'risk_sample_policy_a',
    targetDatasource: 'hive',
    targetDatabase: 'risk.risk_sample_policy_a',
    targetTable: 'risk_sample_policy_a',
    creator: '王运营',
    fieldCount: 10,
    status: 'success',
    rowsCopied: 124_500,
    costMs: 142_000,
    startedAt: nowOffsetDays(2),
    finishedAt: nowOffsetDays(2),
    note: '正向:同步到 Hive 跑模型',
    srcTable: SYNC_TABLES[3],
    targetSnapshot: deriveTarget(SYNC_TABLES[3]) as SyncTarget
  },
  {
    id: rid(20261017),
    direction: 'hive-to-doris',
    sourceDatasource: 'hive',
    sourceDatabase: 'risk.risk_scored_a',
    sourceTable: 'risk_scored_a',
    targetDatasource: 'doris',
    targetDatabase: 'tmp.risk_scored_a',
    targetTable: 'risk_scored_a',
    creator: '张分析',
    fieldCount: 12,
    status: 'success',
    rowsCopied: 124_500,
    costMs: 198_000,
    startedAt: nowOffsetDays(1),
    finishedAt: nowOffsetDays(1),
    note: '反向:把模型结果回灌 Doris',
    srcTable: SYNC_TABLES[7],
    targetSnapshot: deriveTarget(SYNC_TABLES[7]) as SyncTarget
  },
  {
    id: rid(20261016),
    direction: 'doris-to-hive',
    sourceDatasource: 'doris',
    sourceDatabase: 'risk.risk_sample_policy_b',
    sourceTable: 'risk_sample_policy_b',
    targetDatasource: 'hive',
    targetDatabase: 'risk.risk_sample_policy_b',
    targetTable: 'risk_sample_policy_b',
    creator: '陈策略',
    fieldCount: 8,
    status: 'failed',
    rowsCopied: 0,
    costMs: 36_000,
    startedAt: nowOffsetDays(0),
    finishedAt: nowOffsetDays(0),
    note: '建表失败:目标库无写权限',
    errorMessage: '目标表 risk.risk_sample_policy_b 建表失败(无写权限),任务终止,源数据未受影响。',
    srcTable: SYNC_TABLES[4],
    targetSnapshot: deriveTarget(SYNC_TABLES[4]) as SyncTarget
  },
  {
    id: rid(20261015),
    direction: 'hive-to-doris',
    sourceDatasource: 'hive',
    sourceDatabase: 'dwd.dws_risk_summary',
    sourceTable: 'dws_risk_summary',
    targetDatasource: 'doris',
    targetDatabase: 'tmp.dws_risk_summary',
    targetTable: 'dws_risk_summary',
    creator: '陈策略',
    fieldCount: 5,
    status: 'success',
    rowsCopied: 3_200,
    costMs: 12_300,
    startedAt: nowOffsetDays(3),
    finishedAt: nowOffsetDays(3),
    note: '',
    srcTable: SYNC_TABLES[6],
    targetSnapshot: deriveTarget(SYNC_TABLES[6]) as SyncTarget
  },
  // 同名表循环同步示例:用于演示 R19 "回灌视觉标记"
  {
    id: rid(20261014),
    direction: 'doris-to-hive',
    sourceDatasource: 'doris',
    sourceDatabase: 'ADM.dwd_loan_daily',
    sourceTable: 'dwd_loan_daily',
    targetDatasource: 'hive',
    targetDatabase: 'dwd.dwd_loan_daily',
    targetTable: 'dwd_loan_daily',
    creator: '李开发',
    fieldCount: 6,
    status: 'success',
    rowsCopied: 78_200,
    costMs: 96_500,
    startedAt: nowOffsetDays(4),
    finishedAt: nowOffsetDays(4),
    note: '源表名 = 目标表名(循环同步可能性提示)',
    srcTable: SYNC_TABLES[0],
    targetSnapshot: deriveTarget(SYNC_TABLES[0]) as SyncTarget
  }
]

/* ------------------------------------------------------------------ */
/* ⑤ 状态机显示                                                            */
/* ------------------------------------------------------------------ */

export const SYNC_STATUS_META: Record<
  SyncStatus,
  { text: string; color: string; icon?: string }
> = {
  pending: { text: '待执行', color: 'gray' },
  running: { text: '执行中', color: 'arcoblue', icon: 'loading' },
  success: { text: '成功', color: 'green' },
  failed: { text: '失败', color: 'red' },
  timeout: { text: '超时', color: 'orange' }
}

export const SYNC_DIRECTION_META: Record<SyncDirection, { text: string; color: string }> = {
  'doris-to-hive': { text: 'Doris → Hive', color: 'arcoblue' },
  'hive-to-doris': { text: 'Hive → Doris', color: 'orange' }
}
