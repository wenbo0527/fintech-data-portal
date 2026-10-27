/**
 * 外数回溯落库 · Mock 数据源
 * 需求文档《外数文件落库》B3 落库记录（R54）/ B4 验证报告（R64）/ B5 通知记录（R82）/ 模块三 异步任务（R85-R92）
 *
 * 数据来源说明：
 *   1. backid 格式沿用 BacktrackPersist.vue 既有批次号（BACK + yyyyMMdd + 3 位序号），保证前后端口径一致；
 *   2. 机构、文件名口径引用 mock/creditAgencies.ts、mock/outboundTasks.ts；
 *   3. 落库记录字段按 R54 的六组字段清单（基础信息 / 机构信息 / 文件信息 / 映射信息 / 存储信息 / 计费要素）组织；
 *   4. 验证报告按 R64 组织（比对结果 / 异常行号 / 差异摘要 / backid）。
 */
import type { NotifyRecord } from './notify'

/**
 * 落库状态机（3.1）
 * 终点为「Hive已落库」：落 Hive 标准库即完成落库主流程，
 * 行数验证与通知均为后台任务，由任务列表跟踪进度
 */
export type PersistStatus =
  | '待开始'
  | '文件已获取'
  | '文件就绪'
  | '预览已确认'
  | '前置任务已匹配'
  | '临时库已落库'
  | 'Hive已落库'

/** 状态顺序定义，供步骤条与状态徽标统一取值 */
export const PERSIST_STATUS_FLOW: PersistStatus[] = [
  '待开始',
  '文件已获取',
  '文件就绪',
  '预览已确认',
  '前置任务已匹配',
  '临时库已落库',
  'Hive已落库',
]

/** 异步任务类型（R85） */
export type AsyncTaskType = '解析落库' | '推进Hive' | '行数验证' | '一致性校验'

/**
 * 异步任务类型 → 落库状态机状态映射
 * 后两态（临时库已落库 / Hive已落库）由批次任务推导，避免页面状态与任务列表出现两套事实源
 */
const TASK_TYPE_STATUS_MAP: Partial<Record<AsyncTaskType, PersistStatus>> = {
  解析落库: '临时库已落库',
  推进Hive: 'Hive已落库',
}

/**
 * 按批次任务推导落库状态机状态
 * 规则：取批次内已成功且能映射到状态的任务中，状态最靠后者；
 * 推进Hive 成功即视为流程终点 Hive已落库；无相关成功任务时返回 null，交由页面基准状态兜底
 * @param tasks 该 backid 关联的任务集合
 */
export function resolveStatusFromTasks(tasks: AsyncTask[]): PersistStatus | null {
  let derived: PersistStatus | null = null
  for (const t of tasks) {
    if (t.status !== '成功') continue
    const mapped = TASK_TYPE_STATUS_MAP[t.taskType]
    if (!mapped) continue
    if (!derived || PERSIST_STATUS_FLOW.indexOf(mapped) > PERSIST_STATUS_FLOW.indexOf(derived)) {
      derived = mapped
    }
  }
  return derived
}

/** 异步任务状态机（3.2） */
export type AsyncTaskStatus = '排队中' | '执行中' | '成功' | '失败' | '疑似卡死'

/**
 * 批次阶段（R51：backid 为批次标识，批次所处阶段由批次内任务推导）
 * 步骤序号与落库流程步骤条一致（0 基），子区块锚点用于页面内定位
 */
export interface BatchStage {
  /** 落库流程步骤序号（0 基） */
  stepIndex: number
  /** 子区块锚点 key */
  sectionKey: string
  /** 子区块标题 */
  sectionTitle: string
  /** 该阶段对应的任务类型 */
  taskType: AsyncTaskType
}

/** 任务类型 → 落库流程阶段映射 */
const TASK_STAGE_MAP: Record<AsyncTaskType, Omit<BatchStage, 'taskType'>> = {
  解析落库: { stepIndex: 2, sectionKey: 'sec-3-1', sectionTitle: '3.1 落临时库' },
  一致性校验: { stepIndex: 2, sectionKey: 'sec-3-2', sectionTitle: '3.2 一致性抽样校验' },
  推进Hive: { stepIndex: 2, sectionKey: 'sec-3-3', sectionTitle: '3.3 落 Hive 标准库' },
  行数验证: { stepIndex: 2, sectionKey: 'sec-3-4', sectionTitle: '3.4 落库结果（后台任务）' },
}

/**
 * 推导批次所处阶段
 * 规则：存在未成功任务时定位到最早的未完成环节（流程串行，卡点即待办）；
 * 全部成功时定位到落库结果环节，便于查看批次最终产出
 * @param tasks 该 backid 关联的任务集合
 */
export function resolveBatchStage(tasks: AsyncTask[]): BatchStage | null {
  if (!tasks.length) return null
  const pending = tasks.filter((t) => t.status !== '成功')
  if (pending.length) {
    const target = pending.reduce((min, t) => (t.createTime < min.createTime ? t : min))
    return { ...TASK_STAGE_MAP[target.taskType], taskType: target.taskType }
  }
  const last = tasks.reduce((max, t) => (t.createTime > max.createTime ? t : max))
  return { stepIndex: 2, sectionKey: 'sec-3-4', sectionTitle: '3.4 落库结果（后台任务）', taskType: last.taskType }
}

/** 落库记录 - 计费要素（R54 最后一组，落库数据供外数费用计算模块使用） */
export interface BillingElement {
  /** 计费主体（需求方） */
  billingSubject: string
  /** 计费类型：按条数 / 按字段数 / 按接口调用 */
  billingType: string
  /** 计费条数 */
  billingRows: number
  /** 计费字段数（标准字段 + 非标字段） */
  billingFieldCount: number
  /** 计费单价（元/条） */
  unitPrice: number
  /** 预估费用 */
  estimatedAmount: number
  /** 费用状态 */
  billingStatus: '未计费' | '已计费'
}

/** 落库记录（R54） */
export interface PersistRecord {
  /** backid 批次标识（R51 落临时库阶段生成） */
  backid: string
  /** 基础信息 */
  baseInfo: {
    /** 操作人 */
    operator: string
    /** 操作时间 */
    operateTime: string
    /** 落库状态（9 态） */
    status: PersistStatus
  }
  /** 机构信息（R10 编辑不影响历史落库记录，保留机构快照） */
  agencyInfo: {
    agencyId: string
    agencyCode: string
    agencyName: string
    agencyType: string
    licenseNo: string
  }
  /** 文件信息 */
  fileInfo: {
    fileName: string
    /** 获取方式（R23）：SFTP 拉取 / 手动上传 */
    acquireMode: 'SFTP拉取' | '手动上传'
    /** 文件大小（字节） */
    fileSize: number
    /** 文件行数 */
    fileRows: number
    /** 编码格式 */
    encoding: string
    /** 分隔符 */
    delimiter: string
    /** 是否加密 */
    encrypted: boolean
    /** 关联的前置外发任务（R24） */
    outboundTaskIds: string[]
  }
  /** 映射信息 */
  mappingInfo: {
    /** 外数产品 */
    product: string
    /** 接口号 */
    interfaceId: string
    /** 映射规则版本（R43） */
    mappingVersion: string
    /** 标准字段数 */
    stdFieldCount: number
    /** 非标字段数 */
    nonStdFieldCount: number
    /** 非标字段列表 */
    nonStdFields: string[]
  }
  /** 存储信息 */
  storageInfo: {
    /** 临时库表 */
    tempTable: string
    /** Hive 目标表 */
    hiveTable: string
    /** 分区字段（R40 固定 datax） */
    partitionField: string
    /** 分区值 */
    partitionValue: string
    /** 入库行数 */
    loadedRows: number
    /** 覆盖策略（R52 主键=身份证号+review date，直接覆盖） */
    writeStrategy: string
    /** 临时库清理策略（R58） */
    tempTableCleanup: string
    /** 上传文件清理策略（R57） */
    uploadFileCleanup: string
  }
  /** 计费要素 */
  billing: BillingElement
}

/** 验证报告（R64） */
export interface ValidationReport {
  /** 报告编号 */
  reportId: string
  /** 关联 backid */
  backid: string
  /** 验证类型：三重行数验证 / 一致性校验 */
  type: '三重行数验证' | '一致性校验'
  /** 生成时间 */
  generatedAt: string
  /** 操作人 */
  operator: string
  /** 三重行数结果（R60/R61） */
  rowCount?: {
    /** 入库行数 */
    loadedRows: number
    /** 源文件行数 */
    sourceFileRows: number
    /** 原样本文件行数 */
    sampleFileRows: number
    /** 是否一致 */
    matched: boolean
    /** 差值 */
    diff: number
    /** 拼接行数（R63 文件拼接场景） */
    mergedRows?: number
    /** 必填字段非空校验（R65） */
    requiredFieldPass: boolean
  }
  /** 一致性校验结果（R68-R72） */
  consistency?: {
    /** 关联目标表 */
    targetTable: string
    /** 抽样总数 */
    sampleTotal: number
    /** 关联成功条数（R69 仅展示关联成功的） */
    matchedTotal: number
    /** 关联失败条数 */
    unmatchedTotal: number
    /** 不一致条数 */
    inconsistentTotal: number
    /** 差异摘要 */
    diffSummary: string
  }
  /** 一致性校验是否已跳过（未上线产品无线上数据可对比，跳过后标注「未执行」） */
  consistencySkipped?: boolean
  /** 一致性校验跳过原因 */
  consistencySkipReason?: string
  /** 明细（分页由前端 mock 模拟后端分页 R71） */
  details: ValidationDetail[]
}

/** 验证明细（R70：抽样 ID 为 SM4 身份证号） */
export interface ValidationDetail {
  /** SM4 加密身份证号 */
  sampleId: string
  /** 对比字段名 */
  field: string
  /** 线上值 */
  onlineValue: string
  /** 回溯值 */
  retroValue: string
  /** 是否一致 */
  consistent: boolean
  /** review date（关联条件之一 R68） */
  reviewDate: string
}

/** 任务执行日志（R88：任务明细按时间顺序展示执行轨迹） */
export interface TaskLogEntry {
  /** 时间戳 */
  time: string
  /** 阶段名称 */
  stage: string
  /** 日志内容 */
  message: string
  /** 是否异常 */
  error?: boolean
}

/**
 * 任务续做上下文（支撑「从任务列表回到落库流程继续下一步」）
 * 数据来源说明：落库流程提交执行动作时快照当前上下文，
 * 任务列表据此定位到对应步骤并回填已完成的环节，避免用户重头再来。
 */
export interface TaskResumeContext {
  /** 机构 ID */
  agencyId: string
  /** 机构编码 */
  agencyCode: string
  /** 机构名称 */
  agencyName: string
  /** 机构类型（个人征信 / 企业征信） */
  agencyType: string
  /** 文件名 */
  fileName: string
  /** 文件指纹（文件名 + 文件大小） */
  fileFingerprint: string
  /** 关联 backid */
  backid: string
  /** 外数产品 */
  product: string
  /** 接口号 */
  interfaceId: string
  /** Hive 目标表 */
  hiveTable: string
  /** 分区值 */
  partitionValue: string
  /** 回溯日期 */
  reviewDate: string
  /** 一致性校验目标表 */
  consistencyTargetTable: string
  /** 已匹配的前置外发任务 ID */
  outboundTaskIds: string[]
  /** 续做应落位的步骤序号（0 基） */
  resumeStep: number
}

/** 异步任务（模块三 R85） */
export interface AsyncTask {
  /** 任务 ID */
  taskId: string
  /** 任务类型（R85） */
  taskType: AsyncTaskType
  /** 关联 backid */
  backid: string
  /** 征信机构 */
  agencyName: string
  /** 文件名 */
  fileName: string
  /** 创建时间 */
  createTime: string
  /** 执行状态（R84） */
  status: AsyncTaskStatus
  /** 完成时间 */
  finishTime: string
  /** 操作人 */
  operator: string
  /** 失败原因（R89） */
  failReason?: string
  /** 文件指纹（文件名 + 文件大小，R90 判重依据） */
  fileFingerprint: string
  /** 是否写操作类任务（R90：写操作类按文件指纹判重并阻断，只读类放行） */
  writeOperation: boolean
  /** 疑似卡死阈值（R91） */
  stuckThresholdMinutes: number
  /** 是否为跳过执行（一致性校验可跳过，跳过后验证报告标注「未执行」） */
  skipped?: boolean
  /** 执行日志（R88：任务明细展示执行轨迹） */
  logs?: TaskLogEntry[]
  /** 续做上下文（支撑从任务列表回到落库流程继续下一步） */
  resumeContext?: TaskResumeContext
}

/** backid 生成器（R51：落临时库阶段生成，格式 BACK + yyyyMMdd + 3 位序号） */
export function generateBackid(seq: number, date?: Date): string {
  const d = date ?? new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `BACK${y}${m}${day}${String(seq).padStart(3, '0')}`
}

/** 落库记录初始集合 */
export const persistRecordsMock: PersistRecord[] = [
  {
    backid: 'BACK20260924017',
    baseInfo: { operator: '王琳（风控数据组）', operateTime: '2026-09-24 10:32:05', status: 'Hive已落库' },
    agencyInfo: { agencyId: 'AG-001', agencyCode: 'BH', agencyName: '百行征信有限公司', agencyType: '个人征信', licenseNo: 'JC证-JXKP-2023-0001' },
    fileInfo: { fileName: 'BH_RETRO_20260922_01.csv', acquireMode: 'SFTP拉取', fileSize: 64159744, fileRows: 96210, encoding: 'UTF-8', delimiter: '逗号', encrypted: false, outboundTaskIds: ['OUT20260905'] },
    mappingInfo: { product: '百行-多头借贷汇总 V4', interfaceId: 'BH1023', mappingVersion: 'v1.3', stdFieldCount: 8, nonStdFieldCount: 2, nonStdFields: ['ext_score_v2', 'ext_tag_list'] },
    storageInfo: { tempTable: 'tmp_ext_retro_raw', hiveTable: 'dw_ods.ods_ext_bh_retro_std', partitionField: 'datax', partitionValue: '2026-09-22', loadedRows: 96210, writeStrategy: '主键（身份证号+review_date）直接覆盖', tempTableCleanup: '进入下一步即清理 / 定时 1 小时清理', uploadFileCleanup: '落库完成后 24 小时清理' },
    billing: { billingSubject: '风控策略组', billingType: '按条数', billingRows: 96210, billingFieldCount: 10, unitPrice: 0.35, estimatedAmount: 33673.5, billingStatus: '未计费' },
  },
  {
    // 朴道批次：推进 Hive 任务失败、一致性校验失败，仅落临时库成功，故状态为「临时库已落库」
    backid: 'BACK20260930003',
    baseInfo: { operator: '陈昊（模型算法组）', operateTime: '2026-09-30 09:15:42', status: '临时库已落库' },
    agencyInfo: { agencyId: 'AG-002', agencyCode: 'PD', agencyName: '朴道征信有限公司', agencyType: '个人征信', licenseNo: 'JC证-JXKP-2022-0037' },
    fileInfo: { fileName: 'PD_BACK_0929_2.csv', acquireMode: 'SFTP拉取', fileSize: 47915008, fileRows: 45320, encoding: 'UTF-8', delimiter: '逗号', encrypted: false, outboundTaskIds: ['OUT20260912'] },
    mappingInfo: { product: '朴道-历史逾期明细', interfaceId: 'PD2048', mappingVersion: 'v1.1', stdFieldCount: 6, nonStdFieldCount: 1, nonStdFields: ['ext_ovd_level'] },
    storageInfo: { tempTable: 'tmp_ext_retro_raw', hiveTable: 'dw_ods.ods_ext_pd_retro_std', partitionField: 'datax', partitionValue: '2026-09-29', loadedRows: 45320, writeStrategy: '主键（身份证号+review_date）直接覆盖', tempTableCleanup: '进入下一步即清理 / 定时 1 小时清理', uploadFileCleanup: '落库完成后 24 小时清理' },
    billing: { billingSubject: '贷中管理团队', billingType: '按条数', billingRows: 45320, billingFieldCount: 7, unitPrice: 0.4, estimatedAmount: 18128, billingStatus: '未计费' },
  },
  {
    // 上海数据集团批次：行数验证任务执行中，说明已完成落 Hive，故存在落库记录
    backid: 'BACK20261021002',
    baseInfo: { operator: '赵磊（模型算法组）', operateTime: '2026-10-21 08:55:12', status: 'Hive已落库' },
    agencyInfo: { agencyId: 'AG-005', agencyCode: 'SHGJ', agencyName: '上海数据集团金融科技有限公司', agencyType: '企业征信', licenseNo: '沪ICP备备案-2020-1145' },
    fileInfo: { fileName: 'SHGJ_CREDIT_20261020.csv', acquireMode: 'SFTP拉取', fileSize: 39845888, fileRows: 38000, encoding: 'UTF-8', delimiter: '逗号', encrypted: false, outboundTaskIds: ['OUT20260925'] },
    mappingInfo: { product: '上海数据集团-工商司法信息回溯', interfaceId: 'SHGJ2006', mappingVersion: 'v1.0', stdFieldCount: 5, nonStdFieldCount: 1, nonStdFields: ['q_id'] },
    storageInfo: { tempTable: 'tmp_ext_retro_raw', hiveTable: 'dw_ods.ods_ext_shgj_retro_std', partitionField: 'datax', partitionValue: '2026-10-20', loadedRows: 38000, writeStrategy: '主键（身份证号+review_date）直接覆盖', tempTableCleanup: '进入下一步即清理 / 定时 1 小时清理', uploadFileCleanup: '落库完成后 24 小时清理' },
    billing: { billingSubject: '贷中管理团队', billingType: '按条数', billingRows: 38000, billingFieldCount: 6, unitPrice: 0.5, estimatedAmount: 19000, billingStatus: '未计费' },
  },
]

/**
 * 机构级续做上下文基线（供种子任务派生，避免重复书写机构 / 产品 / 落库目标信息）
 * 数据来源说明：
 *   1. 机构 ID / 编码 / 名称 / 类型取自 mock/creditAgencies.ts（AG-001 ~ AG-005）；
 *   2. 外数产品与接口号取自 mock/backtrackProducts.ts，Hive 目标表取自 mock/hiveTables.ts；
 *   3. 一致性校验目标表统一取线上存量样本表 dw_ods.ods_ext_retro_online_std；
 *   4. 前置外发任务取自 mock/outboundTasks.ts（同机构同产品的外发任务）。
 */
const RESUME_BASE_BH: TaskResumeContext = {
  agencyId: 'AG-001',
  agencyCode: 'BH',
  agencyName: '百行征信有限公司',
  agencyType: '个人征信',
  fileName: 'BH_RETRO_20260922_01.csv',
  fileFingerprint: 'BH_RETRO_20260922_01.csv@64159744',
  backid: 'BACK20260924017',
  product: '百行-多头借贷汇总 V4',
  interfaceId: 'BH1023',
  hiveTable: 'dw_ods.ods_ext_bh_retro_std',
  partitionValue: '2026-09-22',
  reviewDate: '2026-09-22',
  consistencyTargetTable: 'dw_ods.ods_ext_retro_online_std',
  outboundTaskIds: ['OUT20260905'],
  resumeStep: 2,
}

const RESUME_BASE_PD: TaskResumeContext = {
  agencyId: 'AG-002',
  agencyCode: 'PD',
  agencyName: '朴道征信有限公司',
  agencyType: '个人征信',
  fileName: 'PD_BACK_0929_2.csv',
  fileFingerprint: 'PD_BACK_0929_2.csv@47915008',
  backid: 'BACK20260930003',
  product: '朴道-历史逾期明细',
  interfaceId: 'PD2048',
  hiveTable: 'dw_ods.ods_ext_pd_retro_std',
  partitionValue: '2026-09-29',
  reviewDate: '2026-09-29',
  consistencyTargetTable: 'dw_ods.ods_ext_retro_online_std',
  outboundTaskIds: ['OUT20260912'],
  resumeStep: 2,
}

const RESUME_BASE_QT: TaskResumeContext = {
  agencyId: 'AG-003',
  agencyCode: 'QT',
  agencyName: '钱塘征信有限公司',
  agencyType: '个人征信',
  fileName: 'QT_resp_20261020.csv',
  fileFingerprint: 'QT_resp_20261020.csv@23902208',
  backid: 'BACK20261021001',
  product: '钱塘-授信评分回溯',
  interfaceId: 'QT3015',
  hiveTable: 'dw_ods.ods_ext_qt_retro_std',
  partitionValue: '2026-10-20',
  reviewDate: '2026-10-20',
  consistencyTargetTable: 'dw_ods.ods_ext_retro_online_std',
  outboundTaskIds: ['OUT20260918'],
  resumeStep: 2,
}

const RESUME_BASE_PBC: TaskResumeContext = {
  agencyId: 'AG-004',
  agencyCode: 'PBC',
  agencyName: '中国人民银行征信中心',
  agencyType: '个人征信',
  fileName: 'PBC_BASE_20261020.csv',
  fileFingerprint: 'PBC_BASE_20261020.csv@220200960',
  backid: 'BACK20261021003',
  product: '人行征信-公共基础信息回溯',
  interfaceId: 'PBC1001',
  hiveTable: 'dw_ods.ods_ext_pbcc_retro_std',
  partitionValue: '2026-10-20',
  reviewDate: '2026-10-20',
  consistencyTargetTable: 'dw_ods.ods_ext_retro_online_std',
  outboundTaskIds: ['OUT20260922'],
  resumeStep: 2,
}

const RESUME_BASE_SHGJ: TaskResumeContext = {
  agencyId: 'AG-005',
  agencyCode: 'SHGJ',
  agencyName: '上海数据集团金融科技有限公司',
  agencyType: '企业征信',
  fileName: 'SHGJ_CREDIT_20261020.csv',
  fileFingerprint: 'SHGJ_CREDIT_20261020.csv@39845888',
  backid: 'BACK20261021002',
  product: '上海数据集团-工商司法信息回溯',
  interfaceId: 'SHGJ2006',
  hiveTable: 'dw_ods.ods_ext_shgj_retro_std',
  partitionValue: '2026-10-20',
  reviewDate: '2026-10-20',
  consistencyTargetTable: 'dw_ods.ods_ext_retro_online_std',
  outboundTaskIds: ['OUT20260925'],
  resumeStep: 3,
}

/** 异步任务初始集合（模块三） */
export const asyncTasksMock: AsyncTask[] = [
  {
    taskId: 'TASK20261020001', taskType: '解析落库', backid: 'BACK20260924017', agencyName: '百行征信有限公司', fileName: 'BH_RETRO_20260922_01.csv',
    createTime: '2026-09-24 10:30:00', status: '成功', finishTime: '2026-09-24 10:44:12', operator: '王琳（风控数据组）',
    fileFingerprint: 'BH_RETRO_20260922_01.csv@64159744', writeOperation: true, stuckThresholdMinutes: 120,
    logs: [
      { time: '2026-09-24 10:30:00', stage: '任务创建', message: '解析落库任务已提交，进入执行中' },
      { time: '2026-09-24 10:31:20', stage: '落临时库', message: '文件已落临时库 tmp_ext_retro_raw，生成 backid BACK20260924017' },
      { time: '2026-09-24 10:44:12', stage: '任务结束', message: '解析落库完成，共写入 96210 行' },
    ],
    resumeContext: { ...RESUME_BASE_BH, resumeStep: 2 },
  },
  {
    taskId: 'TASK20261020002', taskType: '推进Hive', backid: 'BACK20260924017', agencyName: '百行征信有限公司', fileName: 'BH_RETRO_20260922_01.csv',
    createTime: '2026-09-24 10:44:20', status: '成功', finishTime: '2026-09-24 11:02:35', operator: '王琳（风控数据组）',
    fileFingerprint: 'BH_RETRO_20260922_01.csv@64159744', writeOperation: true, stuckThresholdMinutes: 120,
    logs: [
      { time: '2026-09-24 10:44:20', stage: '任务创建', message: '推进 Hive 任务已提交，进入执行中' },
      { time: '2026-09-24 10:45:05', stage: '写入 Hive', message: '写入目标表 dw_ods.ods_ext_bh_retro_std 分区 datax=2026-09-22' },
      { time: '2026-09-24 11:02:35', stage: '任务结束', message: '已落 Hive 标准库，写入 96210 行' },
    ],
    resumeContext: { ...RESUME_BASE_BH, resumeStep: 2 },
  },
  {
    taskId: 'TASK20261020003', taskType: '行数验证', backid: 'BACK20260924017', agencyName: '百行征信有限公司', fileName: 'BH_RETRO_20260922_01.csv',
    createTime: '2026-09-24 11:02:40', status: '成功', finishTime: '2026-09-24 11:09:02', operator: '王琳（风控数据组）',
    fileFingerprint: 'BH_RETRO_20260922_01.csv@64159744', writeOperation: false, stuckThresholdMinutes: 30,
    logs: [
      { time: '2026-09-24 11:02:40', stage: '任务创建', message: '行数验证任务已提交，进入执行中' },
      { time: '2026-09-24 11:09:02', stage: '任务结束', message: '三重行数验证通过：入库 96210 = 源文件 96210 = 样本 96210' },
    ],
    resumeContext: { ...RESUME_BASE_BH, resumeStep: 3 },
  },
  {
    taskId: 'TASK20261020004', taskType: '一致性校验', backid: 'BACK20260924017', agencyName: '百行征信有限公司', fileName: 'BH_RETRO_20260922_01.csv',
    createTime: '2026-09-24 11:09:10', status: '成功', finishTime: '2026-09-24 11:22:47', operator: '王琳（风控数据组）',
    fileFingerprint: 'BH_RETRO_20260922_01.csv@64159744', writeOperation: false, stuckThresholdMinutes: 30,
    logs: [
      { time: '2026-09-24 11:09:10', stage: '任务创建', message: '一致性校验任务已提交，进入执行中' },
      { time: '2026-09-24 11:22:47', stage: '任务结束', message: '抽样 100 条全部关联成功且值一致，比对表 dw_ods.ods_ext_retro_online_std' },
    ],
    resumeContext: { ...RESUME_BASE_BH, resumeStep: 2 },
  },
  {
    taskId: 'TASK20261020005', taskType: '解析落库', backid: 'BACK20260930003', agencyName: '朴道征信有限公司', fileName: 'PD_BACK_0929_2.csv',
    createTime: '2026-09-30 09:10:00', status: '成功', finishTime: '2026-09-30 09:26:18', operator: '陈昊（模型算法组）',
    fileFingerprint: 'PD_BACK_0929_2.csv@47915008', writeOperation: true, stuckThresholdMinutes: 120,
    logs: [
      { time: '2026-09-30 09:10:00', stage: '任务创建', message: '解析落库任务已提交，进入执行中' },
      { time: '2026-09-30 09:11:15', stage: '落临时库', message: '文件已落临时库 tmp_ext_retro_raw，生成 backid BACK20260930003' },
      { time: '2026-09-30 09:26:18', stage: '任务结束', message: '解析落库完成，共写入 45320 行' },
    ],
    resumeContext: { ...RESUME_BASE_PD, resumeStep: 2 },
  },
  {
    taskId: 'TASK20261020006', taskType: '推进Hive', backid: 'BACK20260930003', agencyName: '朴道征信有限公司', fileName: 'PD_BACK_0929_2.csv',
    createTime: '2026-09-30 09:26:30', status: '失败', finishTime: '2026-09-30 09:31:55', operator: '陈昊（模型算法组）',
    failReason: '目标表 dw_ods.ods_ext_pd_retro_std 分区 datax=2026-09-29 已存在同名任务写入锁，等待人工处理',
    fileFingerprint: 'PD_BACK_0929_2.csv@47915008', writeOperation: true, stuckThresholdMinutes: 120,
    logs: [
      { time: '2026-09-30 09:26:30', stage: '任务创建', message: '推进 Hive 任务已提交，进入执行中' },
      { time: '2026-09-30 09:31:55', stage: '任务结束', message: '目标表 dw_ods.ods_ext_pd_retro_std 分区 datax=2026-09-29 已存在同名任务写入锁，等待人工处理', error: true },
    ],
    resumeContext: { ...RESUME_BASE_PD, resumeStep: 2 },
  },
  {
    taskId: 'TASK20261020007', taskType: '一致性校验', backid: 'BACK20260930003', agencyName: '朴道征信有限公司', fileName: 'PD_BACK_0929_2.csv',
    createTime: '2026-09-30 09:32:00', status: '失败', finishTime: '2026-09-30 09:36:12', operator: '陈昊（模型算法组）',
    failReason: '关联条件命中 0 条：目标表 dw_ods.ods_ext_retro_online_std 中无 SM4 身份证号匹配的存量样本',
    fileFingerprint: 'PD_BACK_0929_2.csv@47915008', writeOperation: false, stuckThresholdMinutes: 30,
    logs: [
      { time: '2026-09-30 09:32:00', stage: '任务创建', message: '一致性校验任务已提交，进入执行中' },
      { time: '2026-09-30 09:36:12', stage: '任务结束', message: '关联条件命中 0 条：目标表 dw_ods.ods_ext_retro_online_std 中无 SM4 身份证号匹配的存量样本', error: true },
    ],
    resumeContext: { ...RESUME_BASE_PD, resumeStep: 2 },
  },
  {
    taskId: 'TASK20261021008', taskType: '解析落库', backid: 'BACK20261021001', agencyName: '钱塘征信有限公司', fileName: 'QT_resp_20261020.csv',
    createTime: '2026-10-21 08:05:00', status: '疑似卡死', finishTime: '', operator: '李思远（贷中管理团队）',
    failReason: '执行时长已超过落库阈值 2 小时，疑似卡死（系统不自动重跑，需人工终止或重新发起）',
    fileFingerprint: 'QT_resp_20261020.csv@23902208', writeOperation: true, stuckThresholdMinutes: 120,
    logs: [
      { time: '2026-10-21 08:05:00', stage: '任务创建', message: '解析落库任务已提交，进入执行中' },
      { time: '2026-10-21 08:06:40', stage: '落临时库', message: '文件已落临时库 tmp_ext_retro_raw，生成 backid BACK20261021001' },
      { time: '2026-10-21 10:20:00', stage: '卡死告警', message: '执行时长已超过落库阈值 120 分钟，标记为疑似卡死（不自动重跑）', error: true },
    ],
    resumeContext: { ...RESUME_BASE_QT, resumeStep: 2 },
  },
  {
    taskId: 'TASK20261021008', taskType: '解析落库', backid: 'BACK20261021002', agencyName: '上海数据集团金融科技有限公司', fileName: 'SHGJ_CREDIT_20261020.csv',
    createTime: '2026-10-21 08:40:00', status: '成功', finishTime: '2026-10-21 08:52:30', operator: '赵磊（模型算法组）',
    fileFingerprint: 'SHGJ_CREDIT_20261020.csv@39845888', writeOperation: true, stuckThresholdMinutes: 120,
    logs: [
      { time: '2026-10-21 08:40:00', stage: '任务创建', message: '解析落库任务已提交，进入执行中' },
      { time: '2026-10-21 08:41:10', stage: '落临时库', message: '文件已落临时库 tmp_ext_retro_raw，生成 backid BACK20261021002' },
      { time: '2026-10-21 08:52:30', stage: '任务结束', message: '解析落库完成，共写入 38000 行' },
    ],
    resumeContext: { ...RESUME_BASE_SHGJ, resumeStep: 2 },
  },
  {
    taskId: 'TASK20261021009', taskType: '推进Hive', backid: 'BACK20261021002', agencyName: '上海数据集团金融科技有限公司', fileName: 'SHGJ_CREDIT_20261020.csv',
    createTime: '2026-10-21 08:53:00', status: '成功', finishTime: '2026-10-21 08:58:40', operator: '赵磊（模型算法组）',
    fileFingerprint: 'SHGJ_CREDIT_20261020.csv@39845888', writeOperation: true, stuckThresholdMinutes: 120,
    logs: [
      { time: '2026-10-21 08:53:00', stage: '任务创建', message: '推进 Hive 任务已提交，进入执行中' },
      { time: '2026-10-21 08:54:20', stage: '写入 Hive', message: '写入目标表 dw_ods.ods_ext_shgj_retro_std 分区 datax=2026-10-20' },
      { time: '2026-10-21 08:58:40', stage: '任务结束', message: '已落 Hive 标准库，写入 38000 行' },
    ],
    resumeContext: { ...RESUME_BASE_SHGJ, resumeStep: 2 },
  },
  {
    taskId: 'TASK20261021011', taskType: '行数验证', backid: 'BACK20261021002', agencyName: '上海数据集团金融科技有限公司', fileName: 'SHGJ_CREDIT_20261020.csv',
    createTime: '2026-10-21 09:00:00', status: '执行中', finishTime: '', operator: '赵磊（模型算法组）',
    fileFingerprint: 'SHGJ_CREDIT_20261020.csv@39845888', writeOperation: false, stuckThresholdMinutes: 30,
    logs: [
      { time: '2026-10-21 09:00:00', stage: '任务创建', message: '行数验证任务已提交，进入执行中' },
      { time: '2026-10-21 09:00:18', stage: '取数比对', message: '正在比对入库行数与源文件行数…' },
    ],
    resumeContext: { ...RESUME_BASE_SHGJ, resumeStep: 3 },
  },
  {
    taskId: 'TASK20261021010', taskType: '解析落库', backid: 'BACK20261021003', agencyName: '中国人民银行征信中心', fileName: 'PBC_BASE_20261020.csv',
    createTime: '2026-10-21 09:40:00', status: '排队中', finishTime: '', operator: '刘敏（风控数据组）',
    fileFingerprint: 'PBC_BASE_20261020.csv@220200960', writeOperation: true, stuckThresholdMinutes: 120,
    logs: [{ time: '2026-10-21 09:40:00', stage: '任务创建', message: '解析落库任务已提交，进入排队中' }],
    resumeContext: { ...RESUME_BASE_PBC, resumeStep: 2 },
  },
]

/** 通知记录初始集合（R82，实体定义见 mock/notify.ts） */
export const notifyRecordsMock: NotifyRecord[] = [
  {
    notifyId: 'NOTIFY20260924001',
    backid: 'BACK20260924017',
    channel: '数据服务公众号',
    receivers: ['王琳（风控策略组）', '风控数据团队值班'],
    content: {
      agency: '百行征信有限公司',
      fileName: 'BH_RETRO_20260922_01.csv',
      backid: 'BACK20260924017',
      loadTime: '2026-09-24 11:02:35',
      loadedRows: 96210,
      validationResult: '三重行数验证通过，一致性校验通过',
      exceptionSummary: '无异常行',
      consistencySummary: '抽样 100 条全部关联成功且值一致',
    },
    maskEnabled: true,
    sendStatus: '发送成功',
    retryCount: 0,
    sentAt: '2026-09-24 11:03:10',
  },
  {
    notifyId: 'NOTIFY20260930001',
    backid: 'BACK20260930003',
    channel: '数字社区',
    receivers: ['陈昊（模型算法组）'],
    content: {
      agency: '朴道征信有限公司',
      fileName: 'PD_BACK_0929_2.csv',
      backid: 'BACK20260930003',
      loadTime: '2026-09-30 09:26:18',
      loadedRows: 45320,
      validationResult: '三重行数验证未通过，一致性校验未执行',
      exceptionSummary: '源文件行数 45320，入库行数 45180，差值 140 行',
      consistencySummary: '关联条件命中 0 条，无抽样结果',
    },
    maskEnabled: true,
    sendStatus: '发送失败',
    retryCount: 3,
    sentAt: '2026-09-30 09:37:05',
    failReason: '接收人未在数字社区订阅该 backid 批次（已重试 3 次）',
  },
  {
    // 上海数据集团批次：已落 Hive 并进入行数验证，通知尚未发送
    notifyId: 'NOTIFY20261021001',
    backid: 'BACK20261021002',
    channel: '数据服务公众号',
    receivers: ['赵磊（模型算法组）', '贷中管理团队值班'],
    content: {
      agency: '上海数据集团金融科技有限公司',
      fileName: 'SHGJ_CREDIT_20261020.csv',
      backid: 'BACK20261021002',
      loadTime: '2026-10-21 08:55:12',
      loadedRows: 38000,
      validationResult: '行数验证执行中，尚未产出结论',
      exceptionSummary: '无异常行',
      consistencySummary: '尚未执行一致性校验',
    },
    maskEnabled: true,
    sendStatus: '待发送',
    retryCount: 0,
    sentAt: '',
  },
]

/** 查询异步任务列表 */
export async function listAsyncTasks(params?: { status?: string; taskType?: string; keyword?: string }) {
  const keyword = params?.keyword?.trim()
  return asyncTasksMock.filter((t) => {
    if (params?.status && t.status !== params.status) return false
    if (params?.taskType && t.taskType !== params.taskType) return false
    if (keyword && !t.fileName.includes(keyword) && !t.backid.includes(keyword) && !t.taskId.includes(keyword)) return false
    return true
  })
}

/**
 * 按 backid 查询批次关联的任务（R51：backid 为批次标识，一个批次可关联多条任务）
 * @param backid 批次标识
 */
export async function listAsyncTasksByBackid(backid: string) {
  return asyncTasksMock.filter((t) => t.backid === backid)
}

/**
 * 按文件指纹判断是否存在未完成的写操作类任务（R90：写操作类判重并阻断，只读类放行）
 * 返回命中的任务，未命中返回 null
 */
export async function findDuplicateWriteTask(fileFingerprint: string, excludeTaskId?: string): Promise<AsyncTask | null> {
  return (
    asyncTasksMock.find(
      (t) => t.fileFingerprint === fileFingerprint && t.writeOperation && t.status !== '失败' && t.status !== '成功' && t.taskId !== excludeTaskId
    ) ?? null
  )
}

/** 任务 ID 生成器（R85：格式 TASK + yyyyMMdd + 3 位序号） */
export function generateTaskId(seq: number, date?: Date): string {
  const d = date ?? new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `TASK${y}${m}${day}${String(seq).padStart(3, '0')}`
}

/**
 * 新增异步任务（R86：所有执行类操作均创建任务）
 * 任务写入后立即出现在服务任务列表，可查看明细并继续下一步
 * @param task 任务主体（taskId 可缺省，由生成器补齐）
 * @returns 写入后的完整任务
 */
export async function appendAsyncTask(task: Omit<AsyncTask, 'taskId'> & { taskId?: string }): Promise<AsyncTask> {
  const full: AsyncTask = {
    ...task,
    taskId: task.taskId || generateTaskId(asyncTasksMock.length + 1),
  }
  asyncTasksMock.unshift(full)
  return full
}

/**
 * 更新任务状态与日志（R84 状态维护 / R88 执行轨迹）
 * @param taskId 任务 ID
 * @param patch 待更新字段
 */
export async function updateAsyncTask(
  taskId: string,
  patch: Partial<Pick<AsyncTask, 'status' | 'finishTime' | 'failReason' | 'skipped'>>
): Promise<AsyncTask | null> {
  const task = asyncTasksMock.find((t) => t.taskId === taskId)
  if (!task) return null
  Object.assign(task, patch)
  return task
}

/**
 * 追加任务执行日志（R88：任务明细展示执行轨迹）
 * @param taskId 任务 ID
 * @param entry 日志条目
 */
export async function appendTaskLog(taskId: string, entry: TaskLogEntry): Promise<void> {
  const task = asyncTasksMock.find((t) => t.taskId === taskId)
  if (!task) return
  task.logs = [...(task.logs ?? []), entry]
}

/** 按任务 ID 查询任务 */
export async function getAsyncTask(taskId: string): Promise<AsyncTask | undefined> {
  return asyncTasksMock.find((t) => t.taskId === taskId)
}

/**
 * 回写任务的关联 backid（R51：backid 在落临时库收尾时才生成）
 * 同时同步续做上下文中的 backid，保证从任务续做时能定位到原批次
 * @param taskId 任务 ID
 * @param backid 批次标识
 */
export async function bindAsyncTaskBackid(taskId: string, backid: string): Promise<void> {
  const task = asyncTasksMock.find((t) => t.taskId === taskId)
  if (!task) return
  task.backid = backid
  if (task.resumeContext) {
    task.resumeContext = { ...task.resumeContext, backid }
  }
}

/** 查询落库记录（按 backid） */
export async function getPersistRecord(backid: string): Promise<PersistRecord | undefined> {
  return persistRecordsMock.find((r) => r.backid === backid)
}

/** 追加落库记录 */
export async function appendPersistRecord(record: PersistRecord): Promise<PersistRecord> {
  persistRecordsMock.unshift(record)
  return record
}

/** 追加通知记录（R82：后台推送后留存通知明细） */
export async function appendNotifyRecords(records: NotifyRecord[]): Promise<NotifyRecord[]> {
  notifyRecordsMock.unshift(...records)
  return records
}
