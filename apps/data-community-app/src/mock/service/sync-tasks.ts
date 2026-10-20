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
import type {
  FieldMappingItem,
  SyncDirection,
  SyncRecord,
  SyncRun,
  SyncRunStatus,
  SyncTable,
  SyncTarget,
  SyncTask,
  SyncTaskStatus,
  SyncTrigger,
  AllowDb
} from './sync-tasks-types'

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
    comment: '通反·策略样本B表(E6 演示:无读权限)',
    isPartitioned: false,
    fieldCount: 8,
    fields: fields(8, 'col'),
    hasReadPermission: false
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
  },
  // 补:doris-internal / ADM 库已有 3 张,补 2 张演示用
  {
    id: 't-doris-dws_user_profile',
    datasource: 'doris',
    cluster: 'internal',
    database: 'ADM',
    tableName: 'dws_user_profile',
    comment: '用户画像宽表',
    isPartitioned: false,
    fieldCount: 8,
    fields: fields(8, 'col')
  },
  {
    id: 't-doris-ads_risk_daily',
    datasource: 'doris',
    cluster: 'internal',
    database: 'ADM',
    tableName: 'ads_risk_daily',
    comment: '风险日报',
    isPartitioned: false,
    fieldCount: 6,
    fields: fields(6, 'col')
  },
  // 补:doris-internal / risk 已有 2 张,补 1 张
  {
    id: 't-doris-risk_score_d',
    datasource: 'doris',
    cluster: 'internal',
    database: 'risk',
    tableName: 'risk_score_d',
    comment: '风险评分日表',
    isPartitioned: false,
    fieldCount: 6,
    fields: fields(6, 'col')
  },
  // 补:hive-inceptor / dwd 已有 2 张,补 1 张
  {
    id: 't-hive-dwd_repay_detail',
    datasource: 'hive',
    cluster: 'inceptor',
    database: 'dwd',
    tableName: 'dwd_repay_detail',
    comment: '还款明细宽表',
    isPartitioned: false,
    fieldCount: 6,
    fields: fields(6, 'col')
  },
  // 补:hive-inceptor / risk 已有 1 张,补 1 张演示新建场景
  {
    id: 't-hive-risk_decision_log',
    datasource: 'hive',
    cluster: 'inceptor',
    database: 'risk',
    tableName: 'risk_decision_log',
    comment: '风控决策日志',
    isPartitioned: false,
    fieldCount: 7,
    fields: fields(7, 'col')
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
      tmp: source.datasource === 'hive',
      connection: {
        datasource: peerOfSameName.datasource,
        cluster: peerOfSameName.cluster,
        database: peerOfSameName.database
      }
    }
  }
  // Fallback:对端默认库建同名表
  const fallback = PEER_DEFAULT_DB[peerDatasource]
  return {
    datasource: peerDatasource,
    cluster: fallback.cluster,
    database: fallback.database,
    tableName: source.tableName,
    tmp: fallback.tmp,
    connection: {
      datasource: peerDatasource,
      cluster: fallback.cluster,
      database: fallback.database
    }
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

/**
 * 种子任务:每条任务可关联多条运行(SyncRun)
 * - 任务级 status:跟随最近一次运行;无运行则为 enabled(草稿)/disabled
 */
type SeedSpec = {
  id: string
  name: string
  direction: SyncDirection
  source: SyncTable
  targetDb: string
  creator: string
  taskStatus?: SyncTaskStatus
  trigger?: SyncTrigger
  schedule?: string
  fieldMappings?: FieldMappingItem[]
  note?: string
  runs: {
    status: SyncRunStatus
    rowsCopied: number
    costMs: number
    startedAt: string
    finishedAt: string
    note?: string
    errorMessage?: string
    trigger?: SyncTrigger
  }[]
}

const SEED_SPECS: SeedSpec[] = [
  {
    id: 'SYNCT20261018',
    name: '同步·risk_sample_policy_a',
    direction: 'doris-to-hive',
    source: SYNC_TABLES[3],
    targetDb: 'risk',
    creator: '王运营',
    trigger: 'manual',
    note: '正向:同步到 Hive 跑模型',
    runs: [
      {
        status: 'success',
        rowsCopied: 124_500,
        costMs: 142_000,
        startedAt: nowOffsetDays(2),
        finishedAt: nowOffsetDays(2),
        trigger: 'manual'
      }
    ]
  },
  {
    id: 'SYNCT20261017',
    name: '同步·risk_scored_a (回灌)',
    direction: 'hive-to-doris',
    source: SYNC_TABLES[7],
    targetDb: 'tmp',
    creator: '张分析',
    trigger: 'schedule',
    schedule: '每天 02:00',
    note: '反向:把模型结果回灌 Doris',
    runs: [
      {
        status: 'success',
        rowsCopied: 98_000,
        costMs: 198_000,
        startedAt: nowOffsetDays(1),
        finishedAt: nowOffsetDays(1),
        trigger: 'schedule'
      }
    ]
  },
  {
    id: 'SYNCT20261016',
    name: '同步·risk_sample_policy_b',
    direction: 'doris-to-hive',
    source: SYNC_TABLES[4],
    targetDb: 'risk',
    creator: '陈策略',
    trigger: 'manual',
    note: '权限校验失败示例',
    runs: [
      {
        status: 'failed',
        rowsCopied: 3_200,
        costMs: 18_500,
        startedAt: nowOffsetDays(0),
        finishedAt: nowOffsetDays(0),
        errorMessage: '目标表 risk.risk_sample_policy_b 建表失败(无写权限),任务终止,源数据未受影响。',
        trigger: 'manual'
      }
    ]
  },
  {
    id: 'SYNCT20261015',
    name: '同步·dws_risk_summary (回流)',
    direction: 'hive-to-doris',
    source: SYNC_TABLES[6],
    targetDb: 'tmp',
    creator: '陈策略',
    trigger: 'schedule',
    schedule: '每周一 07:00',
    note: 'Hive 宽表回流 Doris 跑下游',
    runs: [
      {
        status: 'success',
        rowsCopied: 3_200,
        costMs: 12_300,
        startedAt: nowOffsetDays(3),
        finishedAt: nowOffsetDays(3),
        trigger: 'schedule'
      },
      {
        status: 'failed',
        rowsCopied: 0,
        costMs: 5_200,
        startedAt: nowOffsetDays(10),
        finishedAt: nowOffsetDays(10),
        errorMessage: '建表失败:目标 Doris tmp 表 commit 阶段超时,已回滚。',
        trigger: 'schedule'
      }
    ]
  },
  // 同名表循环同步示例:用于演示 R19 "回灌视觉标记"
  {
    id: 'SYNCT20261014',
    name: '同步·dwd_loan_daily',
    direction: 'doris-to-hive',
    source: SYNC_TABLES[0],
    targetDb: 'risk',
    creator: '李开发',
    trigger: 'manual',
    note: '源表名 = 目标表名(循环同步可能性提示)',
    runs: [
      {
        status: 'success',
        rowsCopied: 78_200,
        costMs: 96_500,
        startedAt: nowOffsetDays(4),
        finishedAt: nowOffsetDays(4),
        trigger: 'manual'
      }
    ]
  }
]

/** 由 spec 生成 SyncTask 列表 */
export const SEED_SYNC_TASKS: SyncTask[] = SEED_SPECS.map(spec => {
  const target = deriveTarget(spec.source)
  const latest = spec.runs[0]
  return {
    id: spec.id,
    name: spec.name,
    direction: spec.direction,
    source: {
      datasource: spec.source.datasource,
      cluster: spec.source.cluster,
      database: spec.source.database
    },
    target: {
      datasource: target.datasource,
      cluster: target.cluster,
      database: spec.targetDb
    },
    sourceTableId: spec.source.id,
    targetTable: target.tableName,
    targetDatabase: spec.targetDb,
    fieldMappings:
      spec.fieldMappings ??
      spec.source.fields.map(f => ({
        source: f.name,
        target: f.name,
        enabled: true
      })),
    strategy: { mode: 'full', writeMode: 'overwrite', dataCheck: 'count' },
    trigger: spec.trigger ?? 'manual',
    schedule: spec.schedule,
    cronExpression: spec.schedule ? cronFromScheduleLabel(spec.schedule) : undefined,
    status: spec.taskStatus ?? (latest ? deriveTaskStatus(latest.status) : 'enabled'),
    creator: spec.creator,
    draft: false,
    createdAt: latest?.startedAt ?? nowOffsetDays(7),
    lastRunAt: latest?.startedAt,
    nextRunAt: undefined,
    note: spec.note
  }
})

/** 由 spec 生成 SyncRun 列表 */
export const SEED_SYNC_RUNS: SyncRun[] = SEED_SPECS.flatMap(spec =>
  spec.runs.map((r, rIdx) => ({
    id: `${spec.id}-R${String(rIdx + 1).padStart(3, '0')}`,
    taskId: spec.id,
    trigger: r.trigger ?? spec.trigger ?? 'manual',
    status: r.status,
    creator: spec.creator,
    rowsCopied: r.rowsCopied,
    costMs: r.costMs,
    startedAt: r.startedAt,
    finishedAt: r.finishedAt,
    errorMessage: r.errorMessage,
    note: r.note
  }))
)

/** 派生 SyncRecord 视图(task + 最新 run),用于兼容老 consumer(task-scheduler / task-instances) */
export const SEED_SYNC_RECORDS: SyncRecord[] = SEED_SYNC_TASKS.map(t => {
  const sourceTable = SYNC_TABLES.find(s => s.id === t.sourceTableId)
  const runsForTask = SEED_SYNC_RUNS.filter(r => r.taskId === t.id)
  const latestRun = [...runsForTask].sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1))[0]
  return {
    id: t.id,
    name: t.name,
    direction: t.direction,
    sourceDatasource: t.source.datasource,
    sourceDatabase: `${t.source.database}.${sourceTable?.tableName ?? ''}`,
    sourceTable: sourceTable?.tableName ?? '',
    targetDatasource: t.target.datasource,
    targetDatabase: `${t.target.database}.${t.targetTable}`,
    targetTable: t.targetTable,
    creator: t.creator,
    fieldCount: sourceTable?.fieldCount ?? 0,
    status: latestRun?.status ?? 'pending',
    rowsCopied: latestRun?.rowsCopied ?? 0,
    costMs: latestRun?.costMs ?? 0,
    startedAt: latestRun?.startedAt ?? t.createdAt,
    finishedAt: latestRun?.finishedAt ?? '',
    note: latestRun?.note ?? t.note,
    errorMessage: latestRun?.errorMessage,
    srcTable: sourceTable!,
    targetSnapshot: {
      datasource: t.target.datasource,
      cluster: t.target.cluster,
      database: t.target.database,
      tableName: t.targetTable,
      tmp: t.target.database === 'tmp',
      connection: t.target
    },
    taskStatus: t.status,
    trigger: t.trigger,
    schedule: t.schedule
  }
})

/** SyncRunStatus → SyncTaskStatus 的派生规则 */
function deriveTaskStatus(run: SyncRunStatus): SyncTaskStatus {
  if (run === 'running' || run === 'pending') return 'running'
  if (run === 'failed' || run === 'timeout') return 'failed'
  return 'success'
}

/** 简易 cron 推算(避免 store 里直接 import 调度 cron 工具) */
function cronFromScheduleLabel(label: string): string {
  const map: Record<string, string> = {
    '每小时': '0 0 * * * ?',
    '每天 02:00': '0 0 2 * * ?',
    '每天 06:00': '0 0 6 * * ?',
    '每周一 07:00': '0 0 7 ? * MON',
    '每月 1 日 08:00': '0 0 8 1 * ?'
  }
  return map[label] ?? '0 0 2 * * ?'
}

/* ------------------------------------------------------------------ */
/* ⑤ 状态机显示                                                            */
/* ------------------------------------------------------------------ */

export const SYNC_STATUS_META: Record<
  SyncRunStatus,
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
