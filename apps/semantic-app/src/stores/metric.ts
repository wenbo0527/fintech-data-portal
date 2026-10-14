import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { MetricListItem, MetricDetail, Metric, MetricStatus } from '@/types/metric'
import { getMetricList, getMetricDetail, saveMetricApi, deleteMetricApi, updateMetricStatusApi } from '@/api/metric'

export const useMetricStore = defineStore('metric', () => {
  const list = ref<MetricListItem[]>([])
  const currentDetail = ref<MetricDetail | null>(null)
  const loading = ref(false)

  async function fetchList() {
    loading.value = true
    list.value = await getMetricList()
    loading.value = false
  }

  async function fetchDetail(id: string) {
    loading.value = true
    currentDetail.value = await getMetricDetail(id)
    loading.value = false
  }

  async function save(data: Partial<Metric>) {
    const res = await saveMetricApi(data)
    if (res.success) await fetchList()
    return res
  }

  async function remove(id: string) {
    const res = await deleteMetricApi(id)
    if (res.success) await fetchList()
    return res
  }

  async function changeStatus(id: string, status: MetricStatus) {
    const res = await updateMetricStatusApi(id, status)
    if (res.success) {
      await fetchList()
      if (currentDetail.value?.id === id) await fetchDetail(id)
    }
    return res
  }

  return { list, currentDetail, loading, fetchList, fetchDetail, save, remove, changeStatus }
})
