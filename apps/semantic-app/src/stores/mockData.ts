import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getLoansApi, getStatsApi } from '@/api/mockData'
import type { MockDataQueryParams, MockDataStats } from '@/api/mockData'

export const useMockDataStore = defineStore('mockData', () => {
  const tableData = ref<{ list: Record<string, unknown>[]; total: number; page: number; pageSize: number }>({
    list: [], total: 0, page: 1, pageSize: 10
  })
  const stats = ref<MockDataStats>({ total_loans: 0, overdue_count: 0, fpd30_rate: 0, total_amount: 0 })
  const loading = ref(false)
  const currentParams = ref<MockDataQueryParams>({})

  async function fetchTableData(params: MockDataQueryParams = {}) {
    loading.value = true
    currentParams.value = params
    const data = await getLoansApi(params)
    tableData.value = data as typeof tableData.value
    loading.value = false
  }

  async function fetchStats(params: MockDataQueryParams = {}) {
    stats.value = await getStatsApi(params)
  }

  async function refreshAll(params: MockDataQueryParams = {}) {
    await Promise.all([
      fetchTableData(params),
      fetchStats(params)
    ])
  }

  return { tableData, stats, loading, currentParams, fetchTableData, fetchStats, refreshAll }
})
