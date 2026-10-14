import { getLoans, getRepayments, getOverdues, getStats } from '@/mock/mockData'
import { mockDelay } from '@/utils/mockDelay'
import type { MockDataQueryParams, MockDataStats } from '@/mock/mockData'

export function getLoansApi(params: MockDataQueryParams = {}) {
  return mockDelay(getLoans(params))
}

export function getRepaymentsApi(loanIds?: string[]) {
  return mockDelay(getRepayments(loanIds))
}

export function getOverduesApi(loanIds?: string[]) {
  return mockDelay(getOverdues(loanIds))
}

export function getStatsApi(params: MockDataQueryParams = {}) {
  return mockDelay(getStats(params))
}

export type { MockDataQueryParams, MockDataStats }
