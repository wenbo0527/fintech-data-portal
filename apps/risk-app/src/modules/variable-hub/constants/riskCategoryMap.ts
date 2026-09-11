/**
 * 风险特征品类枚举 + 色板
 * 来源：风险数据一体化一期 文档
 *
 * 三品类：贷中行为 / 外数 / 征信
 * 一期聚焦「贷中行为」品类，启用 11 状态机；
 * 外数/征信继续使用现有 5 状态机（draft/pending/active/inactive/expired）。
 */

export type RiskCategory = 'midloan_behavior' | 'external' | 'credit'

export const RISK_CATEGORY_OPTIONS = [
  { label: '贷中行为', value: 'midloan_behavior', color: 'arcoblue', description: '11 状态机 · Hbase 元数据' },
  { label: '外数',   value: 'external',         color: 'purple',   description: '5 状态机 · 外部数据服务' },
  { label: '征信',   value: 'credit',           color: 'gold',     description: '5 状态机 · 人行/三方资信' }
] as const

export const RISK_CATEGORY_MAP: Record<RiskCategory, { label: string; color: string; description: string }> = {
  midloan_behavior: { label: '贷中行为', color: 'arcoblue', description: '11 状态机 · Hbase 元数据' },
  external:         { label: '外数',   color: 'purple',   description: '5 状态机 · 外部数据服务' },
  credit:           { label: '征信',   color: 'gold',     description: '5 状态机 · 人行/三方资信' }
}

/**
 * 一级分类（贷中行为品类） - 文档 A1 R12
 */
export const MIDLOAN_L1_CATEGORIES = [
  { label: '授信', value: 'credit_grant' },
  { label: '支用', value: 'loan_usage' },
  { label: '还款', value: 'repayment' },
  { label: '催收', value: 'collection' }
]

/**
 * 字段类型枚举 - 文档 A1 R08
 */
export const FIELD_TYPES = [
  { label: 'Integer', value: 'Integer' },
  { label: 'Double',  value: 'Double' },
  { label: 'Boolean', value: 'Boolean' },
  { label: 'String',  value: 'String' }
]

/**
 * 数据时效枚举 - 文档 A1 R17
 */
export const DATA_FRESHNESS = [
  { label: '实时',     value: 'realtime' },
  { label: '离线T-1', value: 'offline_t1' },
  { label: '离线T-2', value: 'offline_t2' }
]

/**
 * 名单类型 - 文档 附录 A B1
 */
export const LIST_TYPES = [
  { label: '空',     value: 'none' },
  { label: '白名单', value: 'white' },
  { label: '黑名单', value: 'black' },
  { label: '灰名单', value: 'gray' }
]

/** 名单类型展示名（同时兼容历史直接存中文标签的数据）*/
const LIST_TYPE_LABEL_MAP: Record<string, string> = LIST_TYPES.reduce(
  (acc, t) => ({ ...acc, [t.value]: t.label, [t.label]: t.label }),
  {} as Record<string, string>
)

/** 名单类型标签色：黑=红 / 白=绿 / 灰=橙 / 空=灰 */
const LIST_TYPE_COLOR_MAP: Record<string, string> = {
  黑名单: 'red',
  白名单: 'green',
  灰名单: 'orange',
  空: 'gray'
}

/** 名单类型码值 → 中文标签；未登记 / 「空」（none）返回空串，列表与详情按「—」展示 */
export const listTypeLabel = (value?: string): string => {
  if (!value || value === 'none') return ''
  return LIST_TYPE_LABEL_MAP[value] || ''
}

/** 名单类型码值 → a-tag 颜色 */
export const listTypeColor = (value?: string): string =>
  LIST_TYPE_COLOR_MAP[listTypeLabel(value)] || 'gray'

/**
 * 特征分类筛选选项（2026-08-10 会议新增 · 需求5）
 * 按内数/外数/行为/实时分类展示，支持全量混合展示
 */
export const VARIABLE_SOURCE_FILTER_OPTIONS = [
  { label: '全量', value: '', description: '全量混合展示' },
  { label: '内数', value: 'internal', description: '内部数据源特征' },
  { label: '外数', value: 'external', description: '外部数据源特征' },
  { label: '行为', value: 'behavior', description: '行为类特征' },
  { label: '实时', value: 'realtime', description: '实时数据源特征' }
] as const

export const riskCategoryLabel = (cat: string) => RISK_CATEGORY_MAP[cat as RiskCategory]?.label || cat || '—'
export const riskCategoryColor = (cat: string) => RISK_CATEGORY_MAP[cat as RiskCategory]?.color || 'gray'