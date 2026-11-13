/**
 * 三重行数验证与一致性校验 · Mock 数据源
 * 需求文档《外数文件落库》B4（R60-R75）
 *
 * 数据来源说明：
 *   1. 三重行数口径：入库行数（临时库批次记录）、源文件行数（回溯返回文件）、原样本文件行数（原样本上传文件）；
 *   2. 一致性校验关联口径（R68）：t1 = 落库临时表（回溯值来源），t2 = 用户所选目标表（线上值来源），
 *      两表按 cert_no + create_time 等值关联，明细以客户号（cert_no）为主体逐字段对比；
 *   3. 抽样规模遵循 R72（50-100 条），mock 固定生成 100 条明细；
 *   4. 排序遵循 R71：不匹配项排在最前。
 */

/** 验证明细：客户号 + 回溯字段逐字段对比结果 */
export interface ValidationDetail {
  /** 客户号（cert_no，取自 t1 落库临时表） */
  certNo: string
  /** 样本回溯时间（create_time，取自 t1 落库临时表） */
  createTime: string
  /** 对比的回溯字段名 */
  field: string
  /** 线上值（t2 目标表） */
  onlineValue: string
  /** 回溯值（t1 落库临时表） */
  retroValue: string
  /** 对比结果：true = 一致，false = 不同 */
  consistent: boolean
  /** 关联状态（R69：仅展示关联成功的，未关联成功的计入关联失败数） */
  related: boolean
  /** 差异分布标注（R75 分布校验标注，由 Python 侧生成后回填） */
  diffDistribution?: string
}

/** 三重行数验证结果（R60/R61/R62/R63/R65） */
export interface TripleRowCheck {
  /** 入库行数 */
  loadedRows: number
  /** 源文件行数 */
  sourceFileRows: number
  /** 原样本文件行数 */
  sampleFileRows: number
  /** 是否拼接文件（R63 文件拼接场景） */
  merged: boolean
  /** 拼接后的总行数 */
  mergedRows: number
  /** 三重行数是否一致（R60/R61：入库行数 = 源文件行数 = 原样本文件行数方为通过） */
  matched: boolean
  /** 必填字段非空校验（R65） */
  requiredFieldPass: boolean
  /** 必填字段非空校验异常数 */
  requiredFieldErrorCount: number
}

/** 一致性校验汇总（R71/R72） */
export interface ConsistencySummary {
  /** 对比目标表 */
  targetTable: string
  /** 抽样总数 */
  sampleTotal: number
  /** 关联成功条数（R69） */
  matchedTotal: number
  /** 关联失败条数 */
  unmatchedTotal: number
  /** 不一致条数 */
  inconsistentTotal: number
  /** 差异摘要 */
  diffSummary: string
}

/** 参与一致性对比的默认回溯字段（页面未传入映射字段时兜底） */
const DEFAULT_CONSISTENCY_FIELDS = [
  'std_loan_cnt_12m',
  'std_overdue_amt_max',
  'std_credit_score',
  'std_risk_level_code',
  'std_loan_cnt_1m',
  'std_loan_cnt_3m',
]

/** 按字段下标生成稳定的回溯值（mock） */
function mockFieldValue(field: string, seq: number): string {
  const idx = DEFAULT_CONSISTENCY_FIELDS.indexOf(field)
  const kind = idx >= 0 ? idx : field.length % 6
  switch (kind) {
    case 1: return ((seq + 1) * 1200.5).toFixed(2)
    case 2: return String(560 + (seq % 90))
    case 3: return ['A', 'B', 'C', 'D'][seq % 4]
    case 4: return String(seq % 5)
    case 5: return String((seq * 2) % 7)
    default: return String((seq * 3) % 18)
  }
}

/** 一致性校验入参 */
export interface ConsistencyDetailOptions {
  /** 样本回溯时间（create_time，取自 t1 临时库） */
  createTime?: string
  /** 参与对比的回溯字段（来自字段映射的标准字段） */
  fields?: string[]
}

/**
 * 生成一致性校验明细
 * 一行 = 一个客户号的某个回溯字段：回溯值取自 t1 临时库，线上值取自 t2 目标表，
 * 两者相同记「一致」，不同记「不同」。
 * @param count 抽样明细条数（R72：50-100 条）
 * @param options 关联口径（create_time 取值与参与对比的字段）
 */
export function buildConsistencyDetails(count = 100, options: ConsistencyDetailOptions = {}): ValidationDetail[] {
  const createTime = options.createTime || '2026-09-30'
  const fields = options.fields?.length ? options.fields : DEFAULT_CONSISTENCY_FIELDS
  const details: ValidationDetail[] = []
  for (let i = 0; i < count; i++) {
    // 每个客户号按字段展开成多行，客户号本身按序号稳定生成
    const customerSeq = Math.floor(i / fields.length) + 1
    const field = fields[i % fields.length]
    const retroValue = mockFieldValue(field, i)
    // 每 17 条制造一条不同，每 29 条制造一条关联失败
    const consistent = i % 17 !== 0
    const related = i % 29 !== 0
    details.push({
      certNo: `CUST${String(customerSeq).padStart(8, '0')}`,
      createTime,
      field,
      onlineValue: related ? (consistent ? retroValue : mockFieldValue(field, i + 7)) : '—',
      retroValue,
      consistent: related && consistent,
      related,
      diffDistribution: related && !consistent ? `差值区间 [${(i % 5) * 100 + 100}, ${(i % 5) * 100 + 200}]，占该字段不一致样本 ${((i % 5) + 1) * 12}.5%` : undefined,
    })
  }
  return details
}

/** 汇总一致性校验结果 */
export function summarizeConsistency(details: ValidationDetail[], targetTable: string): ConsistencySummary {
  const matchedTotal = details.filter((d) => d.related).length
  const unmatchedTotal = details.length - matchedTotal
  const inconsistentTotal = details.filter((d) => d.related && !d.consistent).length
  return {
    targetTable,
    sampleTotal: details.length,
    matchedTotal,
    unmatchedTotal,
    inconsistentTotal,
    diffSummary: inconsistentTotal
      ? `关联成功 ${matchedTotal} 条，其中 ${inconsistentTotal} 条字段值不一致，集中在 ${Array.from(new Set(details.filter((d) => d.related && !d.consistent).map((d) => d.field))).join('、')}`
      : `关联成功 ${matchedTotal} 条，字段值全部一致，无差异`,
  }
}

/**
 * 生成三重行数验证结果（R60/R61）
 * @param loadedRows 入库行数
 * @param sourceFileRows 源文件行数
 * @param sampleFileRows 原样本文件行数
 */
export function buildTripleRowCheck(loadedRows: number, sourceFileRows: number, sampleFileRows: number): TripleRowCheck {
  return {
    loadedRows,
    sourceFileRows,
    sampleFileRows,
    merged: false,
    mergedRows: sourceFileRows,
    // R60/R61：入库行数、源文件行数、原样本文件行数三者完全一致方为通过
    matched: loadedRows === sourceFileRows && sourceFileRows === sampleFileRows,
    requiredFieldPass: true,
    requiredFieldErrorCount: 0,
  }
}
