export type Edge = { id: string; source: string; target: string; kind?: 'sync' | 'async' | 'batch' }
export const edges: Edge[] = [
  { id: 'e_platform_dws', source: 'platform', target: 'dws', kind: 'sync' },
  { id: 'e_dws_dwd', source: 'dws', target: 'dwd', kind: 'sync' },
  { id: 'e_dwd_ods', source: 'dwd', target: 'ods', kind: 'sync' },
  { id: 'e_ods_ltv', source: 'ods', target: 'ltv', kind: 'sync' },
  { id: 'e_ltv_feature', source: 'ltv', target: 'feature', kind: 'batch' },
  { id: 'e_feature_risk', source: 'feature', target: 'risk', kind: 'sync' },
  { id: 'e_risk_labelMarket', source: 'risk', target: 'labelMarket', kind: 'sync' },
  { id: 'e_labelMarket_report', source: 'labelMarket', target: 'report', kind: 'sync' },
  { id: 'e_report_credit', source: 'report', target: 'credit', kind: 'sync' },
  { id: 'e_credit_app', source: 'credit', target: 'app', kind: 'async' },
  { id: 'e_app_variable', source: 'app', target: 'variable', kind: 'sync' },
  { id: 'e_variable_label', source: 'variable', target: 'label', kind: 'sync' },
  { id: 'e_label_viz', source: 'label', target: 'viz', kind: 'sync' },
  { id: 'e_viz_api', source: 'viz', target: 'api', kind: 'sync' },
  { id: 'e_api_marketing', source: 'api', target: 'marketing', kind: 'sync' },
  { id: 'e_api_creditControl', source: 'api', target: 'creditControl', kind: 'sync' }
]
