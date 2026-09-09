/**
 * 风险特征需求 mock store
 *
 * 需求列表 2 状态：
 * - 需求受理 (requirement_accepted)：初始状态
 * - 需求驳回 (rejected)：驳回（含原因），不创建特征
 *
 * 特征台账 2 状态（对应 VariableAssetMock.midloanStatus）：
 * - 需求提出 (requirement_proposal)：需求受理后「去注册」时在特征台账生成
 * - 已注册 (registered)：注册完成后
 *
 * 需求ID：DRV-YYYYMMDD-NNNN
 */

export interface DerivationRecord {
  id: string                          // DRV-YYYYMMDD-NNNN
  name: string                        // 需求名称
  businessScene: string               // 业务场景：贷前/贷中/贷后
  expectedEffect: string              // 预期效果
  requirementDescription?: string      // 需求描述
  category: 'midloan_behavior'        // 品类（锁定为贷中行为）
  dataSource: string                  // 关联数据源（默认 Hbase）
  /** 特征核心属性 */
  featureEnName: string               // 特征英文名
  featureCnName: string               // 中文名
  fieldType: string                   // Integer/Double/Boolean/String
  processingLogic: string             // 加工逻辑
  defaultValue: string                // 默认值（可空）
  l1Category: string                  // 一级分类
  l2Category: string                  // 二级分类
  sourceTableAfter: string            // 标准化后来源表（可空）
  sourceTableBefore: string           // 标准化前来源表（可空）
  originFeatureEnName: string         // 原特征英文名（可空）
  dataFreshness: string               // 实时/离线T-1/离线T-2
  developer: string                   // 开发人员（数仓团队成员）
  excelReport?: string                // Excel 评估报告文件名
  attachment?: { name: string; size: number; uploadedAt: string }  // 需求附件
  /** 批量导入时解析的 Excel 原始行数据（用于详情页预览） */
  excelData?: Array<{
    variableEnName: string      // 特征英文名
    variableCnName: string      // 中文名
    fieldType: string           // 字段类型
    variableMeaning: string    // 特征含义
    processingLogic: string    // 取数逻辑
    dimension: string          // 维度
    dataFreshness: string      // 时效性
    defaultValue: string       // 默认值
    proposer: string           // 需求人
    backtrackPeriod: string    // 回溯时间段
    expectedLaunchDate: string  // 逾期上线时间
    expectedEffect: string     // 效果字段
  }>
  /** 提出人 & 处理人 */
  proposer: string                    // 提出人（需求发起方）
  handler?: string                    // 处理人（负责跟进/处理的业务方）
  syncLevel?: string                  // 业务同步等级（S/A/B/C）
  /** 注册阶段补充 */
  dataTableName?: string              // 数据底表名称（可暂空）
  dwTaskId?: string                   // 数仓任务ID
  productScope?: string               // 产品范围
  listType?: string                   // 名单类型
  batch?: string                      // 批次
  acceptor?: string                   // 验收人
  verifiedAt?: string                 // 验收时间
  registeredAt?: string               // 注册时间
  remark?: string                     // 备注
  /** 驳回信息 */
  rejectReason?: string               // 驳回原因（仅 rejected 状态）
  rejectedAt?: string                 // 驳回时间
  /** 状态与系统字段 */
  status: 'requirement_accepted' | 'rejected'
  featureId?: string                   // 关联特征ID（注册后写入，用于「查看特征」跳转）
  createdAt: string
  updatedAt: string
}

// localStorage 持久化（带版本号，版本变更时自动清除旧缓存）
const STORAGE_KEY = 'variable.management.derivations'
const STORAGE_VERSION_KEY = 'variable.management.derivations.version'
const STORAGE_VERSION = '6' // v5: excelData/attachment → v6: 丰富 Excel 字段

function safeParse(raw: string | null): DerivationRecord[] {
  if (!raw) return []
  try {
    const data = JSON.parse(raw)
    return Array.isArray(data) ? data : []
  } catch { return [] }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  localStorage.setItem(STORAGE_VERSION_KEY, STORAGE_VERSION)
}

// 初始种子数据
const SEED_DATA: DerivationRecord[] = [
  {
    id: 'DRV-20260725-0001',
    name: '近30日大额交易次数',
    businessScene: '贷中',
    expectedEffect: '识别异常消费模式，辅助贷中反欺诈策略',
    category: 'midloan_behavior',
    dataSource: 'Hbase',
    featureEnName: 'MIDLOAN_BIGTXN_CNT_30D',
    featureCnName: '近30日大额交易次数',
    fieldType: 'Integer',
    processingLogic: '从 dwd_trade_detail 过滤 amount >= 5000 的成功记录，按 user_id 维度统计 30 天滚动窗口',
    defaultValue: '0',
    l1Category: 'credit_grant',
    l2Category: 'credit_grant_amount',
    sourceTableAfter: 'ads_midloan_bigtxn_30d',
    sourceTableBefore: 'dwd_trade_detail',
    originFeatureEnName: '',
    dataFreshness: 'offline_t1',
    developer: '王数仓',
    dataTableName: 'ads_midloan_bigtxn_30d',
    dwTaskId: 'DW-TASK-998877',
    productScope: '现金贷',
    listType: 'none',
    batch: '2026Q3',
    acceptor: '小李',
    remark: '',
    status: 'requirement_accepted',
    featureId: 'MIDLOAN-FEAT-0001',
    proposer: '小李',
    handler: '业务方-张三',
    syncLevel: 'S',
    attachment: { name: '贷中行为特征需求批次_202607.xlsx', size: 245760, uploadedAt: '2026-07-25 09:50:00' },
    excelData: [
      {
        variableEnName: 'MIDLOAN_BIGTXN_CNT_30D',
        variableCnName: '近30日大额交易次数',
        fieldType: 'Integer',
        variableMeaning: '统计用户近30日大额交易频次，识别异常消费',
        processingLogic: '从 dwd_trade_detail 过滤 amount≥5000 的成功记录，按 user_id 统计 30 天滚动窗口',
        dimension: '用户维度',
        dataFreshness: '离线T-1',
        defaultValue: '0',
        proposer: '业务方-张三',
        backtrackPeriod: '2026-06-25 ~ 2026-07-25',
        expectedLaunchDate: '2026-08-15',
        expectedEffect: 'IV≥0.05，高风险识别 recall 提升 10%'
      },
      {
        variableEnName: 'MIDLOAN_REPAY_VOL_7D',
        variableCnName: '近7日还款波动率',
        fieldType: 'Double',
        variableMeaning: '衡量用户还款金额的波动情况，预警风险',
        processingLogic: '计算近7日还款金额序列的标准差/均值',
        dimension: '用户维度',
        dataFreshness: '实时',
        defaultValue: '0.0',
        proposer: '业务方-李四',
        backtrackPeriod: '2026-07-19 ~ 2026-07-25',
        expectedLaunchDate: '2026-08-20',
        expectedEffect: '波动率>0.3 的人群逾期率提升 15%'
      },
      {
        variableEnName: 'MIDLOAN_COLLECT_RESP_HRS',
        variableCnName: '催收响应时效',
        fieldType: 'Double',
        variableMeaning: '衡量催收触达效率，识别高响应客户',
        processingLogic: '从催收工单 join 用户触达日志，avg(respond_time-send_time)/3600',
        dimension: '用户维度',
        dataFreshness: '实时',
        defaultValue: '24.0',
        proposer: '业务方-张三',
        backtrackPeriod: '2026-07-01 ~ 2026-07-25',
        expectedLaunchDate: '2026-08-25',
        expectedEffect: '响应<2h 的客户回款率提升 20%'
      },
      {
        variableEnName: 'MIDLOAN_LOGIN_DEVICE_CHG_30D',
        variableCnName: '近30日登录设备变更次数',
        fieldType: 'Integer',
        variableMeaning: '统计设备变更频次，识别账号被盗风险',
        processingLogic: '统计 user_id 近30日的不同 device_id 数量',
        dimension: '用户维度',
        dataFreshness: '实时',
        defaultValue: '0',
        proposer: '业务方-赵六',
        backtrackPeriod: '2026-06-25 ~ 2026-07-25',
        expectedLaunchDate: '2026-08-30',
        expectedEffect: '设备变更≥3 次的欺诈命中率提升 25%'
      }
    ],
    createdAt: '2026-07-25 10:00:00',
    updatedAt: '2026-08-01 09:30:00'
  },
  {
    id: 'DRV-20260801-0007',
    name: '近7日还款波动率',
    businessScene: '贷中',
    expectedEffect: '贷中风险预警，发现还款异常',
    category: 'midloan_behavior',
    dataSource: 'Hbase',
    featureEnName: 'MIDLOAN_REPAY_VOL_7D',
    featureCnName: '近7日还款波动率',
    fieldType: 'Double',
    processingLogic: '计算近7日还款金额序列的标准差，再除以均值得到波动率',
    defaultValue: '0.0',
    l1Category: 'repayment',
    l2Category: 'repayment_volatility',
    sourceTableAfter: 'ads_midloan_repay_vol_7d',
    sourceTableBefore: 'dwd_repayment_detail',
    originFeatureEnName: '',
    dataFreshness: 'realtime',
    developer: '王数仓',
    dataTableName: 'ads_midloan_repay_vol_7d',
    dwTaskId: 'DW-TASK-998900',
    productScope: '消费分期',
    listType: 'none',
    batch: '2026Q3',
    acceptor: '小李',
    remark: '',
    status: 'requirement_accepted',
    featureId: 'MIDLOAN-FEAT-0002',
    proposer: '小李',
    handler: '业务方-李四',
    syncLevel: 'A',
    createdAt: '2026-08-01 14:20:00',
    updatedAt: '2026-08-03 11:00:00'
  },
  {
    id: 'DRV-20260803-0015',
    name: '催收响应时效',
    businessScene: '贷中',
    expectedEffect: '衡量催收触达效率，识别高响应客户',
    category: 'midloan_behavior',
    dataSource: 'Hbase',
    featureEnName: 'MIDLOAN_COLLECT_RESP_HRS',
    featureCnName: '催收响应时效',
    fieldType: 'Double',
    processingLogic: '从催收工单系统 join 用户触达日志，计算 avg(respond_time - send_time) / 3600',
    defaultValue: '24.0',
    l1Category: 'collection',
    l2Category: 'collection_response',
    sourceTableAfter: 'ads_midloan_collect_resp_hrs',
    sourceTableBefore: 'dwd_collection_log',
    originFeatureEnName: '',
    dataFreshness: 'realtime',
    developer: '王数仓',
    dataTableName: '',
    dwTaskId: '',
    productScope: '现金贷',
    listType: 'none',
    batch: '2026Q3',
    acceptor: '小李',
    remark: '数据底表未补充',
    status: 'requirement_accepted',
    featureId: 'MIDLOAN-FEAT-0003',
    proposer: '小李',
    handler: '业务方-张三',
    syncLevel: 'B',
    createdAt: '2026-08-03 09:15:00',
    updatedAt: '2026-08-04 18:00:00'
  },
  {
    id: 'DRV-20260804-0020',
    name: '支用间隔天数均值',
    businessScene: '贷中',
    expectedEffect: '识别异常支用频次',
    category: 'midloan_behavior',
    dataSource: 'Hbase',
    featureEnName: 'MIDLOAN_USAGE_INTERVAL_D',
    featureCnName: '支用间隔天数均值',
    fieldType: 'Double',
    processingLogic: '从支用明细按 user_id 排序，计算相邻支用日期差值的均值',
    defaultValue: '30.0',
    l1Category: 'loan_usage',
    l2Category: 'loan_usage_freq',
    sourceTableAfter: '',
    sourceTableBefore: 'dwd_loan_usage_detail',
    originFeatureEnName: '',
    dataFreshness: 'offline_t1',
    developer: '王数仓',
    productScope: '消费分期',
    listType: 'none',
    batch: '2026Q3',
    acceptor: '小李',
    remark: '待注册',
    status: 'requirement_accepted',
    proposer: '小李',
    handler: '业务方-王五',
    syncLevel: 'A',
    createdAt: '2026-08-04 16:30:00',
    updatedAt: '2026-08-04 16:30:00'
  },
  {
    id: 'DRV-20260805-0025',
    name: '近30日登录设备变更次数',
    businessScene: '贷中',
    expectedEffect: '识别账号被盗风险',
    category: 'midloan_behavior',
    dataSource: 'Hbase',
    featureEnName: 'MIDLOAN_LOGIN_DEVICE_CHG_30D',
    featureCnName: '近30日登录设备变更次数',
    fieldType: 'Integer',
    processingLogic: '统计 user_id 近30日的不同 device_id 数量',
    defaultValue: '0',
    l1Category: 'collection',
    l2Category: 'collection_behavior',
    sourceTableAfter: '',
    sourceTableBefore: '',
    originFeatureEnName: '',
    dataFreshness: 'realtime',
    developer: '王数仓',
    productScope: '现金贷',
    listType: 'none',
    batch: '2026Q3',
    acceptor: '小李',
    remark: '',
    status: 'requirement_accepted',
    proposer: '小李',
    handler: '业务方-赵六',
    syncLevel: 'B',
    createdAt: '2026-08-05 09:30:00',
    updatedAt: '2026-08-05 09:30:00'
  },
  {
    id: 'DRV-20260803-0030',
    name: '近30日交易次数',
    businessScene: '贷中',
    expectedEffect: '统计用户近30日成功交易次数，识别交易频次异常',
    category: 'midloan_behavior',
    dataSource: 'Hbase',
    featureEnName: 'IN_TXN_CNT_30D',
    featureCnName: '近30日交易次数',
    fieldType: 'Integer',
    processingLogic: '按用户维度统计近30日交易成功记录数',
    defaultValue: '0',
    l1Category: 'credit_grant',
    l2Category: 'credit_grant_freq',
    sourceTableAfter: 'ads_midloan_txn_cnt_30d',
    sourceTableBefore: 'dwd_trade_detail',
    originFeatureEnName: 'txn_cnt_30d',
    dataFreshness: 'offline_t1',
    developer: '王数仓',
    dataTableName: 'ads_midloan_txn_cnt_30d',
    dwTaskId: 'DW-TASK-998755',
    productScope: '现金贷',
    listType: 'none',
    batch: '2026Q3',
    acceptor: '数据应用团队',
    remark: '由原内数特征迁移为贷中行为品类',
    status: 'requirement_accepted',
    proposer: '数据应用团队',
    handler: '业务方-张三',
    syncLevel: 'C',
    attachment: { name: '内数特征迁移清单_202608.xlsx', size: 184320, uploadedAt: '2026-08-03 11:10:00' },
    excelData: [
      {
        variableEnName: 'IN_TXN_CNT_30D',
        variableCnName: '近30日交易次数',
        fieldType: 'Integer',
        variableMeaning: '统计用户近30日交易频次',
        processingLogic: '按 user_id 维度统计近30日交易成功记录数',
        dimension: '用户维度',
        dataFreshness: '离线T-1',
        defaultValue: '0',
        proposer: '数据应用团队',
        backtrackPeriod: '2026-07-04 ~ 2026-08-03',
        expectedLaunchDate: '2026-08-20',
        expectedEffect: 'IV≥0.03，交易频次<5 的用户风险提升 8%'
      },
      {
        variableEnName: 'IN_REPAY_AMT_30D',
        variableCnName: '近30日还款金额',
        fieldType: 'Double',
        variableMeaning: '汇总用户近30日还款总额',
        processingLogic: '按 user_id 汇总近30日还款金额 sum(amount)',
        dimension: '用户维度',
        dataFreshness: '离线T-1',
        defaultValue: '0.0',
        proposer: '数据应用团队',
        backtrackPeriod: '2026-07-04 ~ 2026-08-03',
        expectedLaunchDate: '2026-08-20',
        expectedEffect: '还款金额环比下降>50% 的用户逾期率提升 12%'
      },
      {
        variableEnName: 'IN_OVERDUE_CNT_30D',
        variableCnName: '近30日逾期次数',
        fieldType: 'Integer',
        variableMeaning: '统计用户近30日逾期记录条数',
        processingLogic: '从 dwd_overdue_detail 按 user_id 统计近30日逾期记录 count',
        dimension: '用户维度',
        dataFreshness: '离线T-1',
        defaultValue: '0',
        proposer: '数据应用团队',
        backtrackPeriod: '2026-07-04 ~ 2026-08-03',
        expectedLaunchDate: '2026-08-25',
        expectedEffect: '逾期≥2 次的客户坏账率提升 18%'
      }
    ],
    createdAt: '2026-08-03 11:20:00',
    updatedAt: '2026-08-04 09:15:00'
  },
  // ============ 需求受理状态 ============
  {
    id: 'DRV-20260805-0050',
    name: '近30日社保缴纳连续月数',
    businessScene: '贷中',
    expectedEffect: '通过社保缴纳连续月数评估用户工作稳定性',
    category: 'midloan_behavior',
    dataSource: 'Hbase',
    featureEnName: 'MIDLOAN_SOCIAL_CONT_MONTHS_30D',
    featureCnName: '近30日社保缴纳连续月数',
    fieldType: 'Integer',
    processingLogic: '对接社保查询 API，按 user_id 统计近30日内连续社保缴纳月数',
    defaultValue: '0',
    l1Category: 'repayment',
    l2Category: 'repayment_stability',
    sourceTableAfter: '',
    sourceTableBefore: 'dwd_social_security_log',
    originFeatureEnName: '',
    dataFreshness: 'offline_t2',
    developer: '王数仓',
    productScope: '小微贷',
    listType: 'none',
    batch: '2026Q3',
    acceptor: '小李',
    remark: '需数仓团队联调社保查询 API',
    status: 'requirement_accepted',
    proposer: '小李',
    handler: '业务方-李四',
    syncLevel: 'A',
    createdAt: '2026-08-05 10:30:00',
    updatedAt: '2026-08-05 10:30:00'
  },
  // ============ 需求驳回状态（含驳回原因，不创建特征）============
  {
    id: 'DRV-20260720-0003',
    name: '近90日账户余额均值',
    businessScene: '贷中',
    expectedEffect: '评估用户资金充裕程度',
    category: 'midloan_behavior',
    dataSource: 'Hbase',
    featureEnName: 'MIDLOAN_AVG_BAL_90D',
    featureCnName: '近90日账户余额均值',
    fieldType: 'Double',
    processingLogic: '统计 user_id 近90日账户余额的均值',
    defaultValue: '0.0',
    l1Category: 'repayment',
    l2Category: 'repayment_stability',
    sourceTableAfter: '',
    sourceTableBefore: '',
    originFeatureEnName: '',
    dataFreshness: 'offline_t2',
    developer: '',
    productScope: '现金贷',
    listType: 'none',
    batch: '2026Q3',
    acceptor: '小李',
    remark: '',
    rejectReason: '业务方撤回需求，不再需要该特征',
    rejectedAt: '2026-08-10 14:00:00',
    status: 'rejected',
    proposer: '小李',
    handler: '',
    syncLevel: '',
    createdAt: '2026-07-20 11:00:00',
    updatedAt: '2026-08-10 14:00:00'
  }
]

// 从 localStorage 初始化（版本号变更时自动清除旧缓存，重新使用种子数据）
const storedVersion = localStorage.getItem(STORAGE_VERSION_KEY)
const storedData = safeParse(localStorage.getItem(STORAGE_KEY))
let store: DerivationRecord[]
if (storedVersion === STORAGE_VERSION && storedData.length > 0) {
  store = storedData
} else {
  store = [...SEED_DATA]
  persist()
}

/**
 * 生成下一个 DRV ID：DRV-YYYYMMDD-NNNN
 */
function nextId(): string {
  const today = new Date()
  const ymd = today.toISOString().slice(0, 10).replace(/-/g, '')
  const todayCount = store.filter(d => d.id.startsWith(`DRV-${ymd}-`)).length
  return `DRV-${ymd}-${String(todayCount + 1).padStart(4, '0')}`
}

export const DerivationStore = {
  /** 列表查询 */
  list(filter: any = {}) {
    let list: any[] = [...store]
    if (filter.status) list = list.filter((d: any) => d.status === filter.status)
    if (filter.businessScene) list = list.filter((d: any) => d.businessScene === filter.businessScene)
    if (filter.keyword) {
      const k = String(filter.keyword).toLowerCase()
      list = list.filter((d: any) =>
        d.name.toLowerCase().includes(k) ||
        d.id.toLowerCase().includes(k) ||
        d.featureEnName.toLowerCase().includes(k) ||
        d.featureCnName.toLowerCase().includes(k)
      )
    }
    return list
  },
  /** 详情查询 */
  get(id: string) {
    return store.find((d: any) => d.id === id) || null
  },
  /** 创建：初始状态为需求受理 */
  create(payload: any, proposer: string = 'Demo 用户') {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
    const record: DerivationRecord = {
      // 必填字段默认值（payload 中有则覆盖）
      name: payload.name || '',
      businessScene: payload.businessScene || '贷中',
      expectedEffect: payload.expectedEffect || '—',
      requirementDescription: payload.requirementDescription || '',
      category: payload.category || 'midloan_behavior',
      dataSource: payload.dataSource || 'Hbase',
      featureEnName: payload.featureEnName || '',
      featureCnName: payload.featureCnName || payload.name || '',
      fieldType: payload.fieldType || 'String',
      processingLogic: payload.processingLogic || '',
      defaultValue: payload.defaultValue ?? '',
      l1Category: payload.l1Category || '',
      l2Category: payload.l2Category || '',
      sourceTableAfter: payload.sourceTableAfter || '',
      sourceTableBefore: payload.sourceTableBefore || '',
      originFeatureEnName: payload.originFeatureEnName || '',
      dataFreshness: payload.dataFreshness || '',
      developer: payload.developer || '',
      // 系统字段
      id: nextId(),
      status: 'requirement_accepted',
      proposer,
      createdAt: now,
      updatedAt: now,
      // payload 覆盖以上默认值
      ...payload
    }
    store.unshift(record)
    persist()
    return record
  },
  /**
   * 特征注册：写入注册信息并关联特征台账资产
   * @param payload B1 注册表单载荷（由页面完成字段映射后传入）
   *                payload.featureId 优先使用（来自台账已有资产或新建草稿），
   *                未传时兜底生成 MIDLOAN-FEAT-NNNN（避开已有编号）
   */
  register(id: string, payload: any) {
    const d = store.find(x => x.id === id)
    if (!d) return null
    Object.assign(d, payload)
    if (!d.featureId) {
      const used = store
        .filter(x => x.featureId)
        .map(x => Number(String(x.featureId).replace(/^MIDLOAN-FEAT-/, '')))
        .filter(n => !Number.isNaN(n))
      const idx = String((used.length ? Math.max(...used) : 0) + 1).padStart(4, '0')
      d.featureId = `MIDLOAN-FEAT-${idx}`
    }
    d.registeredAt = new Date().toISOString().slice(0, 19).replace('T', ' ')
    d.updatedAt = d.registeredAt
    // 需求状态保持为 requirement_accepted（注册状态由特征台账的 midloanStatus 跟踪）
    persist()
    return d
  },
  /** 需求驳回：仅需求受理状态可驳回，记录驳回原因 */
  reject(id: string, reason: string) {
    const d = store.find(x => x.id === id)
    if (!d) return null
    if (d.status !== 'requirement_accepted') return null
    d.status = 'rejected'
    d.rejectReason = reason
    d.rejectedAt = new Date().toISOString().slice(0, 19).replace('T', ' ')
    d.updatedAt = d.rejectedAt
    persist()
    return d
  },
  /** 重新受理：仅驳回状态可重新受理，恢复为需求受理 */
  reopen(id: string) {
    const d = store.find(x => x.id === id)
    if (!d) return null
    if (d.status !== 'rejected') return null
    d.status = 'requirement_accepted'
    d.rejectReason = undefined
    d.rejectedAt = undefined
    d.updatedAt = new Date().toISOString().slice(0, 19).replace('T', ' ')
    persist()
    return d
  },
  /** 补充数据底表 */
  supplementDataTable(id: string, tableName: string) {
    const d = store.find(x => x.id === id)
    if (!d) return null
    d.dataTableName = tableName
    d.updatedAt = new Date().toISOString().slice(0, 19).replace('T', ' ')
    persist()
    return d
  }
}

export default DerivationStore
