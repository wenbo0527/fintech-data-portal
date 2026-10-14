import type { Metric, MetricDetail, MetricListItem, MetricStatus, MetricDefinition, ExternalMetricRef } from '@/types/metric'
// 语义契约包：指标基准数据与状态文案的唯一事实源（本文件只做 re-export + 本地持久化）
import {
  mockMetrics as contractMetrics,
  statusLabelMap as contractStatusLabelMap
} from '@data-community/semantic-contract'

/** 指标生命周期状态文案（契约包事实源，此处 re-export 以保持既有 `@/mock/metric` 导入路径） */
export const statusLabelMap = contractStatusLabelMap

/**
 * 指标完整定义（单一数据源）。
 * 注意：这里必须是契约包导出的"同一个数组实例"，全仓各处（agent.ts / metadataMap.ts / stores）
 * 通过 splice/push 就地变更才能同步可见，禁止做 [...arr] 拷贝或重新赋值。
 */
export const mockMetrics: Metric[] = contractMetrics

// ---- localStorage 持久化（demo 内 CRUD/状态流转刷新不丢失） ----
const STORAGE_KEY = 'semantic-app:metrics'

/**
 * 契约内置基准里的跨系统映射：旧缓存没有 externalRefs 时按编码回填，
 * 保证存量 localStorage 用户也能看到映射（映射属静态事实，不随编辑丢失）。
 */
function contractRefsOf(code: string): ExternalMetricRef[] | undefined {
  return contractMetrics.find(m => m.code === code)?.externalRefs
}

/** 兼容旧版本缓存：补齐新增字段默认值 */
function normalizeMetric(m: Metric): Metric {
  return {
    ...m,
    status: m.status ?? 'published',
    aliases: m.aliases ?? [],
    changeHistory: m.changeHistory ?? [],
    externalRefs: m.externalRefs ?? contractRefsOf(m.code)
  }
}

/**
 * 有缓存时就地覆盖契约数组（保持数组实例不变），无缓存/解析异常时保留契约内置基准数据。
 * 行为等价于改造前的 loadMetrics()：只在"缓存存在且非空数组"时才采用缓存。
 */
try {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw) {
    const stored = JSON.parse(raw) as Metric[]
    if (Array.isArray(stored) && stored.length > 0) {
      mockMetrics.splice(0, mockMetrics.length, ...stored.map(normalizeMetric))
    }
  }
} catch { /* 解析异常时回退内置基准数据 */ }

function persistMetrics() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockMetrics))
  } catch { /* demo 场景忽略存储写入失败 */ }
}

/** 指标列表（简化），从当前 mockMetrics 动态派生 */
export function listMetricItems(): MetricListItem[] {
  return mockMetrics.map(m => ({
    id: m.id,
    name: m.name,
    code: m.code,
    category: m.category,
    maintainedBy: m.maintainedBy,
    updatedAt: m.updatedAt,
    status: m.status,
    aliases: m.aliases,
    definitionCount: m.definitions.length
  }))
}

/** 字段定义库（全量字段信息） */
const fieldLibrary: Record<string, { fieldName: string; fieldCnName: string; dataType: string; description: string }> = {
  fld_loan_amount: { fieldName: 'loan_amount', fieldCnName: '贷款金额', dataType: 'DECIMAL(12,2)', description: '客户实际放款金额' },
  fld_issue_date: { fieldName: 'issue_date', fieldCnName: '放款日期', dataType: 'DATE', description: '贷款实际发放日期' },
  fld_overdue_days: { fieldName: 'overdue_days', fieldCnName: '逾期天数', dataType: 'INT', description: '当前逾期天数' },
  fld_record_date: { fieldName: 'record_date', fieldCnName: '记录日期', dataType: 'DATE', description: '逾期记录统计日期' },
  fld_customer_id: { fieldName: 'customer_id', fieldCnName: '客户编号', dataType: 'VARCHAR(32)', description: '客户唯一标识' },
  fld_actual_date: { fieldName: 'actual_date', fieldCnName: '实际还款日期', dataType: 'DATE', description: '客户实际还款日期' },
  fld_amount_paid: { fieldName: 'amount_paid', fieldCnName: '实还金额', dataType: 'DECIMAL(12,2)', description: '客户实际还款金额' },
  fld_apply_id: { fieldName: 'apply_id', fieldCnName: '申请编号', dataType: 'VARCHAR(32)', description: '贷款申请唯一标识' },
  fld_apply_date: { fieldName: 'apply_date', fieldCnName: '申请日期', dataType: 'DATE', description: '客户提交借款申请的日期' },
  fld_approval_result: { fieldName: 'approval_result', fieldCnName: '审批结果', dataType: 'VARCHAR(16)', description: '通过/拒绝/审批中的审批状态' },
  fld_approval_date: { fieldName: 'approval_date', fieldCnName: '审批完成日期', dataType: 'DATE', description: '审批流程结束的日期' },
  fld_credit_limit: { fieldName: 'credit_limit', fieldCnName: '授信额度', dataType: 'DECIMAL(12,2)', description: '授予客户的固定授信额度' },
  fld_loan_balance: { fieldName: 'loan_balance', fieldCnName: '在贷余额', dataType: 'DECIMAL(12,2)', description: '贷款尚未偿还的本金余额' },
  fld_due_date: { fieldName: 'due_date', fieldCnName: '应还日期', dataType: 'DATE', description: '合同约定应还款日期' },
  fld_amount_due: { fieldName: 'amount_due', fieldCnName: '应还金额', dataType: 'DECIMAL(12,2)', description: '本期应偿还金额' }
}

/** 根据指标ID获取详情（含字段映射展开） */
export function mockMetricDetail(id: string): MetricDetail {
  const metric = mockMetrics.find(m => m.id === id)
  if (!metric) {
    throw new Error(`Metric not found: ${id}`)
  }

  const tableMappings = metric.tables.map(tbl => ({
    tableId: tbl.tableId,
    tableName: tbl.tableName,
    tableCnName: tbl.tableCnName,
    role: tbl.role,
    fields: tbl.fields.map(fid => {
      const f = fieldLibrary[fid]
      return {
        fieldId: fid,
        fieldName: f?.fieldName || fid,
        fieldCnName: f?.fieldCnName || fid,
        dataType: f?.dataType || 'UNKNOWN',
        description: f?.description || '',
        usedInFormula: getFormulaUsage(metric.code, tbl.role, f?.fieldName || fid)
      }
    })
  }))

  return { ...metric, tableMappings }
}

/** 获取字段在公式中的用途 */
function getFormulaUsage(metricCode: string, role: string, fieldName: string): string {
  if (role === 'denominator') {
    if (fieldName.includes('limit')) return '分母：求和计算授信额度总额'
    if (fieldName.includes('apply')) return '分母：统计申请提交总笔数'
    if (fieldName.includes('amount')) return '分母：求和计算总贷款金额'
    if (fieldName.includes('customer')) return '分母：统计去重客户数'
    if (fieldName.includes('date')) return '分母：筛选放款时间范围'
    return '分母：辅助计算'
  }
  if (role === 'numerator') {
    if (fieldName.includes('result')) return '分子：筛选审批通过的申请笔数'
    if (fieldName.includes('balance')) return '分子：求和计算在贷本金余额'
    if (fieldName.includes('days')) return '分子：判断逾期天数是否满足口径'
    if (fieldName.includes('amount')) return '分子：求和计算逾期/实还金额'
    if (fieldName === 'due_date') return '分子：与实际还款日比较判断是否提前还款'
    if (fieldName.includes('date')) return '分子：筛选记录时间范围'
    return '分子：辅助计算'
  }
  return '维度：分组或筛选条件'
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

/** 保存指标（新建默认草稿态；编辑追加变更历史；结果持久化到 localStorage） */
export function saveMetric(data: Partial<Metric>): { success: boolean } {
  if (data.id) {
    const idx = mockMetrics.findIndex(m => m.id === data.id)
    if (idx >= 0) {
      const prev = mockMetrics[idx]
      const next: Metric = { ...prev, ...data, updatedAt: today() }
      next.changeHistory = [
        { time: today(), operator: '当前用户（demo）', action: '指标更新', description: '在指标管理台编辑了基础信息或口径定义' },
        ...(prev.changeHistory ?? [])
      ]
      mockMetrics.splice(idx, 1, next)
    }
  } else {
    const newMetric: Metric = {
      id: `metric_${Date.now()}`,
      name: data.name || '新指标',
      code: data.code || 'new_metric',
      category: data.category || '业务指标',
      maintainedBy: data.maintainedBy || '未指定',
      updatedAt: today(),
      status: 'draft',
      aliases: data.aliases ?? [],
      definitions: data.definitions || [],
      tables: data.tables || [],
      alertThreshold: data.alertThreshold || 0,
      alertEnabled: data.alertEnabled ?? false,
      changeHistory: [
        { time: today(), operator: '当前用户（demo）', action: '指标创建', description: '新建指标，默认为草稿态，需提交审批后发布' }
      ]
    }
    mockMetrics.push(newMetric)
  }
  persistMetrics()
  return { success: true }
}

/** 生命周期状态流转（demo：模拟审批闭环，直接记录审计） */
export function changeMetricStatus(id: string, status: MetricStatus): { success: boolean } {
  const idx = mockMetrics.findIndex(m => m.id === id)
  if (idx < 0) return { success: false }
  const metric = mockMetrics[idx]
  const actionMap: Record<MetricStatus, string> = {
    draft: '回退草稿',
    pending: '提交审批',
    published: '审批发布',
    offline: '指标下线'
  }
  metric.changeHistory = [
    {
      time: today(),
      operator: '当前用户（demo）',
      action: actionMap[status],
      description: `状态流转：${statusLabelMap[metric.status]} → ${statusLabelMap[status]}`
    },
    ...(metric.changeHistory ?? [])
  ]
  metric.status = status
  metric.updatedAt = today()
  persistMetrics()
  return { success: true }
}

export function deleteMetric(id: string): { success: boolean } {
  const idx = mockMetrics.findIndex(m => m.id === id)
  if (idx >= 0) mockMetrics.splice(idx, 1)
  persistMetrics()
  return { success: true }
}

/** 由口径定义生成 mock SQL（演示"语义定义 → 可执行SQL"的语义层核心能力） */
export function generateMetricSql(metric: Metric, def: MetricDefinition): string {
  const side = (role: 'numerator' | 'denominator'): string => {
    const tbl = metric.tables.find(t => t.role === role)
    if (!tbl) return `  SELECT 0 AS val /* 未映射${role === 'numerator' ? '分子' : '分母'}表 */`
    const fields = tbl.fields.map(fid => fieldLibrary[fid]).filter(Boolean)
    const amount = fields.find(f => /amount|balance|limit|paid/.test(f.fieldName))
    const date = fields.find(f => /_date/.test(f.fieldName))
    const days = fields.find(f => f.fieldName === 'overdue_days')
    const result = fields.find(f => f.fieldName === 'approval_result')
    const agg = amount ? `SUM(t.${amount.fieldName})` : 'COUNT(1)'
    const conds: string[] = []
    if (days) conds.push(`t.${days.fieldName} >= ${metric.code === 'npl_rate' ? 90 : 30}`)
    if (result) conds.push(`t.${result.fieldName} = '通过'`)
    if (date) conds.push(`t.${date.fieldName} BETWEEN '2026-09-01' AND '2026-09-30'`)
    const where = conds.length ? `\n    AND ${conds.join('\n    AND ')}` : ''
    return `  -- ${role === 'numerator' ? '分子' : '分母'}：${tbl.tableCnName} (${tbl.tableName})\n  SELECT ${agg} AS val\n  FROM ods.${tbl.tableName} t\n  WHERE TRUE${where}`
  }
  return [
    `-- 指标：${metric.name} (${metric.code}) · 口径：${def.caliberName} · ${def.version}`,
    `-- 公式：${def.formula}`,
    `SELECT`,
    `  ROUND(num.val / NULLIF(den.val, 0) * 100, 2) AS ${metric.code}_rate`,
    `FROM (`,
    `  ${side('numerator')}`,
    `) num, (`,
    `  ${side('denominator')}`,
    `) den;`
  ].join('\n')
}
