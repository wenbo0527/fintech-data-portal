/**
 * 指标相关类型：类型事实源已上移到 @data-community/semantic-contract，
 * 本文件仅做 re-export，保持既有 `@/types/metric` 导入路径不变。
 */
export type {
  MetricStatus,
  MetricChangeRecord,
  MetricDefinition,
  MetricTableRef,
  ExternalAppId,
  ExternalMetricRef,
  Metric,
  TableMapping,
  FieldMapping,
  MetricDetail,
  MetricListItem
} from '@data-community/semantic-contract'

export { statusLabelMap, externalAppLabelMap, externalAppColorMap } from '@data-community/semantic-contract'
