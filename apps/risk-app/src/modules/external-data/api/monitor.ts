import http from '../../../api/http'
const useMock = import.meta.env.VITE_USE_MOCK === 'true'

export async function getBurndown(params: any) {
  if (useMock) {
    const months = ['01','02','03','04','05','06','07','08','09','10','11','12']
    const initial = 1000000
    const data = months.map((m, i) => ({
      granularity: 'month',
      month: `${new Date().getFullYear()}-${m}`,
      budget: initial - i * 60000,
      actual: initial - i * 50000,
      initialBudget: initial
    }))
    return data
  }
  try {
    const payload = await http.get('budget/monitor/burndown', { params })
    const list = Array.isArray(payload) ? payload : (payload?.data ?? [])
    if (Array.isArray(list) && list.length) return list
  } catch {}
  const months = ['01','02','03','04','05','06','07','08','09','10','11','12']
  const initial = 1000000
  return months.map((m, i) => ({
    granularity: 'month',
    month: `${new Date().getFullYear()}-${m}`,
    budget: initial - i * 60000,
    actual: initial - i * 50000,
    initialBudget: initial
  }))
}

export async function getWarnings(params: any) {
  if (useMock) {
    const platforms = ['字节','京东','美团','百度','腾讯']
    const list = Array.from({ length: 10 }, (_, i) => {
      const platform = platforms[i % platforms.length]
      const businessType = ['授信','营销','风控'][i % 3]
      const estimatedLoan = 500000 + i * 12000
      const actualLoan = estimatedLoan * (0.88 + (i % 5) * 0.03)
      const estimatedCost = 100000 + i * 7000
      const actualCost = estimatedCost * (1.05 + (i % 4) * 0.04)
      const estimatedAnnualCost = 0.08 + (i % 4) * 0.005
      const actualAnnualCost = estimatedAnnualCost * (1.02 + (i % 3) * 0.03)
      const estimatedRiskFreeReturn = 0.035 + (i % 3) * 0.003
      const actualRiskFreeReturn = estimatedRiskFreeReturn * (0.95 + (i % 4) * 0.02)
      const externalDataCost = Math.round(estimatedCost * (0.25 + (i % 3) * 0.05))
      const over = actualCost > estimatedCost * 1.1
      const slow = actualLoan < estimatedLoan * 0.9
      const budgetStatus = over ? '超支' : (slow ? '偏离' : '正常')
      return {
        id: i + 1,
        level: over ? 'critical' : slow ? 'warning' : 'info',
        message: `预算预警 - ${platform} - ${businessType}`,
        createdAt: new Date(Date.now() - i * 3600000).toISOString(),
        businessType,
        platform,
        estimatedCost,
        actualCost,
        estimatedLoan,
        actualLoan,
        targetLoan: estimatedLoan,
        estimatedAnnualCost,
        actualAnnualCost,
        estimatedRiskFreeReturn,
        actualRiskFreeReturn,
        externalDataCost,
        budgetStatus
      }
    })
    return list
  }
  try {
    const payload = await http.get('budget/monitor/warnings', { params })
    const list = Array.isArray(payload) ? payload : (payload?.data ?? [])
    if (Array.isArray(list) && list.length) return list
  } catch {}
  const platforms = ['字节','京东','美团','百度','腾讯']
  const list = Array.from({ length: 10 }, (_, i) => {
    const platform = platforms[i % platforms.length]
    const businessType = ['授信','营销','风控'][i % 3]
    const estimatedLoan = 500000 + i * 12000
    const actualLoan = estimatedLoan * (0.88 + (i % 5) * 0.03)
    const estimatedCost = 100000 + i * 7000
    const actualCost = estimatedCost * (1.05 + (i % 4) * 0.04)
    const estimatedAnnualCost = 0.08 + (i % 4) * 0.005
    const actualAnnualCost = estimatedAnnualCost * (1.02 + (i % 3) * 0.03)
    const estimatedRiskFreeReturn = 0.035 + (i % 3) * 0.003
    const actualRiskFreeReturn = estimatedRiskFreeReturn * (0.95 + (i % 4) * 0.02)
    const externalDataCost = Math.round(estimatedCost * (0.25 + (i % 3) * 0.05))
    const over = actualCost > estimatedCost * 1.1
    const slow = actualLoan < estimatedLoan * 0.9
    const budgetStatus = over ? '超支' : (slow ? '偏离' : '正常')
    return {
      id: i + 1,
      level: over ? 'critical' : slow ? 'warning' : 'info',
      message: `预算预警 - ${platform} - ${businessType}`,
      createdAt: new Date(Date.now() - i * 3600000).toISOString(),
      businessType,
      platform,
      estimatedCost,
      actualCost,
      estimatedLoan,
      actualLoan,
      targetLoan: estimatedLoan,
      estimatedAnnualCost,
      actualAnnualCost,
      estimatedRiskFreeReturn,
      actualRiskFreeReturn,
      externalDataCost,
      budgetStatus
    }
  })
  return list
}
