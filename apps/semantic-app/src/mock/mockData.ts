/**
 * Mock业务数据：1500条申请记录 + 1000条贷款记录 + 还款记录 + 逾期记录
 * 数据生成规则：
 * - 1500条申请记录，约70%通过、23%拒绝、7%审批中（通过率约75%）
 * - 1000条贷款记录，7月/8月/9月各约330条
 * - 3个产品线（现金贷/分期/循环额度）均匀分布
 * - 80%按时还款（其中25%提前1-10天结清），20%逾期（逾期仅部分还款20%-70%）
 * - 逾期笔内天数分布：25%为1-30天、55%为31-90天、20%为91-180天
 * - 由此首逾率（1-30天）约5%、不良率（逾期90天+）约4%
 * - 渠道分布：APP 60%、合作方 25%、线下 15%
 */

export interface LoanRecord {
  loan_id: string
  customer_id: string
  product_line: '现金贷' | '分期' | '循环额度'
  loan_amount: number
  issue_date: string
  channel: 'APP' | '合作方' | '线下'
}

export interface ApplyRecord {
  apply_id: string
  customer_id: string
  product_line: LoanRecord['product_line']
  apply_date: string
  approval_date: string
  approval_result: '通过' | '拒绝' | '审批中'
}

export interface RepaymentRecord {
  repayment_id: string
  loan_id: string
  due_date: string
  actual_date: string | null
  amount_due: number
  amount_paid: number
}

export interface OverdueRecord {
  record_id: string
  loan_id: string
  overdue_days: number
  record_date: string
}

// ---- 数据生成 ----
const productLines: LoanRecord['product_line'][] = ['现金贷', '分期', '循环额度']
const channels: LoanRecord['channel'][] = ['APP', 'APP', 'APP', 'APP', 'APP', 'APP', '合作方', '合作方', '合作方', '线下']
const months = ['2026-07', '2026-08', '2026-09']

function randomDate(month: string): string {
  const day = Math.floor(Math.random() * 28) + 1
  return `${month}-${String(day).padStart(2, '0')}`
}

function generateLoanRecords(): LoanRecord[] {
  const records: LoanRecord[] = []
  for (let i = 1; i <= 1000; i++) {
    const month = months[Math.floor((i - 1) / 334)]
    records.push({
      loan_id: `L2026${String(i).padStart(4, '0')}`,
      customer_id: `C${String(Math.floor(Math.random() * 5000) + 1).padStart(6, '0')}`,
      product_line: productLines[i % 3],
      loan_amount: Math.floor(Math.random() * 45000 + 5000),
      issue_date: randomDate(month),
      channel: channels[Math.floor(Math.random() * channels.length)]
    })
  }
  return records
}

function generateApplyRecords(): ApplyRecord[] {
  const records: ApplyRecord[] = []
  for (let i = 1; i <= 1500; i++) {
    const month = months[Math.floor((i - 1) / 500)]
    const r = Math.random()
    records.push({
      apply_id: `A2026${String(i).padStart(4, '0')}`,
      customer_id: `C${String(Math.floor(Math.random() * 5000) + 1).padStart(6, '0')}`,
      product_line: productLines[i % 3],
      apply_date: randomDate(month),
      approval_date: randomDate(month),
      approval_result: r < 0.7 ? '通过' : r < 0.93 ? '拒绝' : '审批中'
    })
  }
  return records
}

function generateRepaymentRecords(loans: LoanRecord[]): RepaymentRecord[] {
  const records: RepaymentRecord[] = []
  loans.forEach((loan, idx) => {
    const isOverdue = idx % 5 === 0 // 20% 逾期
    const issueDate = new Date(loan.issue_date)
    const dueDate = new Date(issueDate)
    dueDate.setDate(dueDate.getDate() + 30)

    const dueDateStr = dueDate.toISOString().slice(0, 10)
    let actualDateStr: string | null
    let amountPaid: number

    if (isOverdue) {
      // 逾期天数分档：25%为1-30天、55%为31-90天、20%为91-180天
      const seq = Math.floor(idx / 5) % 20
      const overdueDays = seq < 5
        ? 1 + Math.floor(Math.random() * 30)
        : seq < 16
          ? 31 + Math.floor(Math.random() * 60)
          : 91 + Math.floor(Math.random() * 90)
      const actualDate = new Date(dueDate)
      actualDate.setDate(actualDate.getDate() + overdueDays)
      actualDateStr = actualDate.toISOString().slice(0, 10)
      amountPaid = Math.floor(loan.loan_amount * (0.2 + Math.random() * 0.5)) // 部分还款20%-70%
    } else if (idx % 10 === 1 || idx % 10 === 2) {
      // 按时还款中约25%提前1-10天结清
      const earlyDays = 1 + Math.floor(Math.random() * 10)
      const actualDate = new Date(dueDate)
      actualDate.setDate(actualDate.getDate() - earlyDays)
      actualDateStr = actualDate.toISOString().slice(0, 10)
      amountPaid = loan.loan_amount
    } else {
      actualDateStr = dueDateStr
      amountPaid = loan.loan_amount
    }

    records.push({
      repayment_id: `R${String(idx + 1).padStart(5, '0')}`,
      loan_id: loan.loan_id,
      due_date: dueDateStr,
      actual_date: actualDateStr,
      amount_due: loan.loan_amount,
      amount_paid: amountPaid
    })
  })
  return records
}

function generateOverdueRecords(repayments: RepaymentRecord[]): OverdueRecord[] {
  return repayments
    .filter(r => r.actual_date && r.amount_paid < r.amount_due)
    .map((r, idx) => {
      const dueDate = new Date(r.due_date)
      const actualDate = new Date(r.actual_date!)
      const overdueDays = Math.floor((actualDate.getTime() - dueDate.getTime()) / 86400000)
      return {
        record_id: `O${String(idx + 1).padStart(5, '0')}`,
        loan_id: r.loan_id,
        overdue_days: overdueDays,
        record_date: r.actual_date!
      }
    })
}

// ---- 内存态数据 ----
const applyRecords = generateApplyRecords()
const loanRecords = generateLoanRecords()
const repaymentRecords = generateRepaymentRecords(loanRecords)
const overdueRecords = generateOverdueRecords(repaymentRecords)

// ---- 查询接口 ----
export interface MockDataQueryParams {
  productLine?: string
  month?: string
  channel?: string
  page?: number
  pageSize?: number
}

export interface MockDataStats {
  total_loans: number
  overdue_count: number
  fpd30_rate: number
  total_amount: number
}

export function getLoans(params: MockDataQueryParams = {}): {
  list: LoanRecord[]
  total: number
  page: number
  pageSize: number
} {
  const { productLine, month, channel, page = 1, pageSize = 10 } = params
  let filtered = [...loanRecords]

  if (productLine && productLine !== '全部') {
    filtered = filtered.filter(l => l.product_line === productLine)
  }
  if (month && month !== '全部') {
    filtered = filtered.filter(l => l.issue_date.startsWith(month))
  }
  if (channel && channel !== '全部') {
    filtered = filtered.filter(l => l.channel === channel)
  }

  const total = filtered.length
  const start = (page - 1) * pageSize
  const list = filtered.slice(start, start + pageSize)

  return { list, total, page, pageSize }
}

export function getRepayments(loanIds?: string[]): RepaymentRecord[] {
  if (loanIds) {
    return repaymentRecords.filter(r => loanIds.includes(r.loan_id))
  }
  return repaymentRecords
}

export function getOverdues(loanIds?: string[]): OverdueRecord[] {
  if (loanIds) {
    return overdueRecords.filter(r => loanIds.includes(r.loan_id))
  }
  return overdueRecords
}

export function getStats(params: MockDataQueryParams = {}): MockDataStats {
  const { productLine, month } = params
  let filtered = [...loanRecords]
  if (productLine && productLine !== '全部') {
    filtered = filtered.filter(l => l.product_line === productLine)
  }
  if (month && month !== '全部') {
    filtered = filtered.filter(l => l.issue_date.startsWith(month))
  }

  const loanIds = filtered.map(l => l.loan_id)
  const overdues = overdueRecords.filter(r => loanIds.includes(r.loan_id))
  const firstOverdues = overdues.filter(r => r.overdue_days >= 1 && r.overdue_days <= 30)

  return {
    total_loans: filtered.length,
    overdue_count: overdues.length,
    fpd30_rate: filtered.length > 0
      ? Number(((firstOverdues.length / filtered.length) * 100).toFixed(2))
      : 0,
    total_amount: filtered.reduce((sum, l) => sum + l.loan_amount, 0)
  }
}

// ---- Agent 指标统计（基于内存数据实算，按指标 code 分派） ----

export interface MetricStat {
  rate: number
  numerator: number
  denominator: number
  numeratorLabel: string
  denominatorLabel: string
}

function pct(numerator: number, denominator: number): number {
  return denominator > 0 ? Number(((numerator / denominator) * 100).toFixed(2)) : 0
}

function loansOfMonth(month?: string): LoanRecord[] {
  if (!month || month === '全部') return loanRecords
  return loanRecords.filter(l => l.issue_date.startsWith(month))
}

function overduesOf(loans: LoanRecord[]): OverdueRecord[] {
  const ids = new Set(loans.map(l => l.loan_id))
  return overdueRecords.filter(o => ids.has(o.loan_id))
}

function repaidOf(loans: LoanRecord[]): RepaymentRecord[] {
  const ids = new Set(loans.map(l => l.loan_id))
  return repaymentRecords.filter(r => ids.has(r.loan_id) && r.actual_date !== null)
}

export function getFpd30Stat(month?: string): MetricStat {
  const loans = loansOfMonth(month)
  const first = overduesOf(loans).filter(o => o.overdue_days >= 1 && o.overdue_days <= 30)
  return {
    rate: pct(first.length, loans.length),
    numerator: first.length,
    denominator: loans.length,
    numeratorLabel: '首逾笔数',
    denominatorLabel: '放款笔数'
  }
}

export function getOverdueRateStat(month?: string): MetricStat {
  const loans = loansOfMonth(month)
  const overdueIds = new Set(overduesOf(loans).map(o => o.loan_id))
  const totalBalance = loans.reduce((s, l) => s + l.loan_amount, 0)
  const overdueBalance = loans.filter(l => overdueIds.has(l.loan_id)).reduce((s, l) => s + l.loan_amount, 0)
  return {
    rate: pct(overdueBalance, totalBalance),
    numerator: overdueIds.size,
    denominator: loans.length,
    numeratorLabel: '逾期贷款笔数',
    denominatorLabel: '总贷款笔数'
  }
}

export function getNplRateStat(month?: string): MetricStat {
  const loans = loansOfMonth(month)
  const nplIds = new Set(overduesOf(loans).filter(o => o.overdue_days > 90).map(o => o.loan_id))
  const totalBalance = loans.reduce((s, l) => s + l.loan_amount, 0)
  const nplBalance = loans.filter(l => nplIds.has(l.loan_id)).reduce((s, l) => s + l.loan_amount, 0)
  return {
    rate: pct(nplBalance, totalBalance),
    numerator: nplIds.size,
    denominator: loans.length,
    numeratorLabel: '不良贷款笔数',
    denominatorLabel: '总贷款笔数'
  }
}

export function getApprovalRateStat(month?: string): MetricStat {
  const applies = month && month !== '全部'
    ? applyRecords.filter(a => a.approval_date.startsWith(month))
    : applyRecords
  const completed = applies.filter(a => a.approval_result !== '审批中')
  const passed = completed.filter(a => a.approval_result === '通过')
  return {
    rate: pct(passed.length, completed.length),
    numerator: passed.length,
    denominator: completed.length,
    numeratorLabel: '审批通过笔数',
    denominatorLabel: '完成审批笔数'
  }
}

export function getLimitUsageRateStat(month?: string): MetricStat {
  const loans = loansOfMonth(month)
  const borrowByCustomer = new Map<string, number>()
  loans.forEach(l => borrowByCustomer.set(l.customer_id, (borrowByCustomer.get(l.customer_id) ?? 0) + l.loan_amount))
  let totalBorrow = 0
  let totalLimit = 0
  borrowByCustomer.forEach(borrow => {
    totalBorrow += borrow
    totalLimit += Math.max(60000, Math.round(borrow * 1.5))
  })
  return {
    rate: pct(totalBorrow, totalLimit),
    numerator: Math.round(totalBorrow),
    denominator: Math.round(totalLimit),
    numeratorLabel: '在贷余额',
    denominatorLabel: '授信额度总额'
  }
}

export function getPrepayRateStat(month?: string): MetricStat {
  const repaid = repaidOf(loansOfMonth(month))
  const prepay = repaid.filter(r => r.actual_date! < r.due_date)
  return {
    rate: pct(prepay.length, repaid.length),
    numerator: prepay.length,
    denominator: repaid.length,
    numeratorLabel: '提前结清笔数',
    denominatorLabel: '已还款笔数'
  }
}

export function getRecoveryRateStat(month?: string): MetricStat {
  const repaid = repaidOf(loansOfMonth(month))
  const totalDue = repaid.reduce((s, r) => s + r.amount_due, 0)
  const totalPaid = repaid.reduce((s, r) => s + r.amount_paid, 0)
  return {
    rate: pct(totalPaid, totalDue),
    numerator: Math.round(totalPaid),
    denominator: totalDue,
    numeratorLabel: '实还金额',
    denominatorLabel: '应还金额'
  }
}

export function getRepurchaseRateStat(month?: string): MetricStat {
  const loans = loansOfMonth(month)
  const countByCustomer = new Map<string, number>()
  loans.forEach(l => countByCustomer.set(l.customer_id, (countByCustomer.get(l.customer_id) ?? 0) + 1))
  const repurchase = [...countByCustomer.values()].filter(c => c >= 2).length
  return {
    rate: pct(repurchase, countByCustomer.size),
    numerator: repurchase,
    denominator: countByCustomer.size,
    numeratorLabel: '复购客户数',
    denominatorLabel: '去重客户数'
  }
}

const statFunctions: Record<string, (month?: string) => MetricStat> = {
  fpd30: getFpd30Stat,
  overdue_rate: getOverdueRateStat,
  npl_rate: getNplRateStat,
  apply_approval_rate: getApprovalRateStat,
  limit_usage_rate: getLimitUsageRateStat,
  prepay_rate: getPrepayRateStat,
  recovery_rate: getRecoveryRateStat,
  repurchase_rate: getRepurchaseRateStat
}

/** 按指标 code 分派统计函数；code 不在统计表中时返回 null */
export function getMetricStat(code: string, month?: string): MetricStat | null {
  const fn = statFunctions[code]
  return fn ? fn(month) : null
}
