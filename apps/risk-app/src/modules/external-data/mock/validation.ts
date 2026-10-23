/**
 * 三重行数验证与一致性校验 · Mock 数据源
 * 需求文档《外数文件落库》B4（R60-R75）
 *
 * 数据来源说明：
 *   1. 三重行数口径：入库行数（临时库批次记录）、源文件行数（回溯返回文件）、原样本文件行数（原样本上传文件）；
 *   2. 一致性校验关联条件（R68）：SM4 加密身份证号 + review date 双条件，故抽样 ID 生成 SM4 形态的密文串；
 *   3. 抽样规模遵循 R72（50-100 条），mock 固定生成 100 条；
 *   4. 排序遵循 R71：不匹配项排在最前。
 */

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
  /** review date（关联条件之一） */
  reviewDate: string
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

/** 生成稳定的 SM4 形态密文（mock：64 位十六进制） */
function mockSm4(seed: number): string {
  let s = (seed * 2654435761) >>> 0
  let out = ''
  for (let i = 0; i < 64; i++) {
    s = (s * 1103515245 + 12345) >>> 0
    out += '0123456789abcdef'[(s >>> (i % 16)) % 16]
  }
  return out
}

/** 参与一致性对比的标准字段（R68 关联后按字段值比对） */
const CONSISTENCY_FIELDS = [
  { field: 'std_loan_cnt_12m', gen: (i: number) => String((i * 3) % 18) },
  { field: 'std_overdue_amt_max', gen: (i: number) => ((i + 1) * 1200.5).toFixed(2) },
  { field: 'std_credit_score', gen: (i: number) => String(560 + (i % 90)) },
  { field: 'std_risk_level_code', gen: (i: number) => ['A', 'B', 'C', 'D'][i % 4] },
  { field: 'std_loan_cnt_1m', gen: (i: number) => String(i % 5) },
  { field: 'std_loan_cnt_3m', gen: (i: number) => String((i * 2) % 7) },
]

/**
 * 生成一致性校验明细
 * @param count 抽样条数（R72：50-100 条）
 * @param reviewDate 回溯日期（关联条件之一）
 */
export function buildConsistencyDetails(count = 100, reviewDate = '2026-09-30'): ValidationDetail[] {
  const details: ValidationDetail[] = []
  for (let i = 0; i < count; i++) {
    const meta = CONSISTENCY_FIELDS[i % CONSISTENCY_FIELDS.length]
    const value = meta.gen(i)
    // 每 17 条制造一条不一致；每 29 条制造一条关联失败
    const consistent = i % 17 !== 0
    const related = i % 29 !== 0
    details.push({
      sampleId: mockSm4(i + 1),
      field: meta.field,
      onlineValue: related ? value : '—',
      retroValue: value,
      consistent: related && consistent,
      reviewDate,
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
