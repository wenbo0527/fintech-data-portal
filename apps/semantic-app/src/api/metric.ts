import { mockMetricDetail, listMetricItems, saveMetric, deleteMetric, changeMetricStatus } from '@/mock/metric'
import { mockDelay } from '@/utils/mockDelay'
import type { Metric, MetricDetail, MetricListItem, MetricStatus } from '@/types/metric'

export function getMetricList(): Promise<MetricListItem[]> {
  // 动态派生，保证新建/删除/状态流转后列表与数据源一致
  return mockDelay(listMetricItems())
}

export function getMetricDetail(id: string): Promise<MetricDetail> {
  return mockDelay(mockMetricDetail(id))
}

export function saveMetricApi(data: Partial<Metric>): Promise<{ success: boolean }> {
  return mockDelay(saveMetric(data))
}

export function updateMetricStatusApi(id: string, status: MetricStatus): Promise<{ success: boolean }> {
  return mockDelay(changeMetricStatus(id, status))
}

export function deleteMetricApi(id: string): Promise<{ success: boolean }> {
  return mockDelay(deleteMetric(id))
}
