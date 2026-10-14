/**
 * 类型详情页 13 个配置 — PRD 模块 C 要求
 *
 * 5 资源 + 6 资产 + 2 要素 = 13 个
 * 每个配置定义了标题、说明、分类、过滤谓词
 */

export type TypeCategory = 'resource' | 'asset' | 'element'

export interface TypeConfig {
  /** 路由 key */
  key: string
  /** 页面标题 */
  title: string
  /** 说明文字 */
  description: string
  /** 分类 */
  category: TypeCategory
  /** 分类标签 */
  categoryLabel: string
  /** 过滤函数：从 LogicalTable[] 中筛选属于该类型的表 */
  filter: (tables: any[]) => any[]
}

// 13 个配置
export const TYPE_CONFIGS: Record<string, TypeConfig> = {
  // ==================== 5 资源类 ====================
  'ods-source': {
    key: 'ods-source',
    title: 'ODS 贴源数据',
    description: '从源系统接入的原始数据贴源表，保持与源系统一致的结构',
    category: 'resource',
    categoryLabel: '数据资源',
    filter: (tables) => tables.filter(t => t.layer === 'ODS' && t.storage !== 'Kafka')
  },
  'external-data': {
    key: 'external-data',
    title: '外部数据',
    description: '从外部供应商引入的第三方数据，如征信、工商、运营商等',
    category: 'resource',
    categoryLabel: '数据资源',
    filter: (tables) => tables.filter(t => t.sourceSystem?.includes('外部') || t.sourceSystem?.includes('external') || t.sourceSystem?.includes('征信') || t.sourceSystem?.includes('工商'))
  },
  'file-data': {
    key: 'file-data',
    title: '文件数据',
    description: '通过文件批量导入的结构化和半结构化数据',
    category: 'resource',
    categoryLabel: '数据资源',
    filter: (tables) => tables.filter(t => t.sourceSystem?.includes('文件') || t.sourceSystem?.includes('file'))
  },
  'log-data': {
    key: 'log-data',
    title: '日志数据',
    description: '应用日志、行为日志、点击日志等半结构化日志数据',
    category: 'resource',
    categoryLabel: '数据资源',
    filter: (tables) => tables.filter(t => t.sourceSystem?.includes('log') || t.sourceSystem?.includes('日志') || t.name?.includes('log') || t.name?.includes('click'))
  },
  'realtime-data': {
    key: 'realtime-data',
    title: '实时数据',
    description: '通过 Kafka 等消息队列接入的实时流数据',
    category: 'resource',
    categoryLabel: '数据资源',
    filter: (tables) => tables.filter(t => t.storage === 'Kafka' || (t.freq === '实时' && t.storage !== 'HBase'))
  },

  // ==================== 6 资产类（按业务域） ====================
  'customer-domain': {
    key: 'customer-domain',
    title: '客户域',
    description: '客户主数据、用户画像、客户标签等客户相关数据资产',
    category: 'asset',
    categoryLabel: '数据资产',
    filter: (tables) => tables.filter(t => t.domain === '用户域' && t.assetType === 'asset')
  },
  'risk-domain': {
    key: 'risk-domain',
    title: '风控域',
    description: '风控评分、反欺诈、贷后监控等风控相关数据资产',
    category: 'asset',
    categoryLabel: '数据资产',
    filter: (tables) => tables.filter(t => t.domain === '风控域' && t.assetType === 'asset')
  },
  'credit-domain': {
    key: 'credit-domain',
    title: '信贷域',
    description: '授信申请、合同、提款、还款等信贷交易相关数据资产',
    category: 'asset',
    categoryLabel: '数据资产',
    filter: (tables) => tables.filter(t => t.domain === '交易域' && t.assetType === 'asset')
  },
  'marketing-domain': {
    key: 'marketing-domain',
    title: '营销域',
    description: '营销触达、营销效果、用户行为等营销相关数据资产',
    category: 'asset',
    categoryLabel: '数据资产',
    filter: (tables) => tables.filter(t => t.domain === '营销域' && t.assetType === 'asset')
  },
  'product-domain': {
    key: 'product-domain',
    title: '产品域',
    description: '产品维度、机构维度、地区维度等产品相关数据资产',
    category: 'asset',
    categoryLabel: '数据资产',
    filter: (tables) => tables.filter(t => t.domain === '产品域' && t.assetType === 'asset')
  },
  'finance-domain': {
    key: 'finance-domain',
    title: '财务域',
    description: '发票、银行流水、财务核算等财务相关数据资产',
    category: 'asset',
    categoryLabel: '数据资产',
    filter: (tables) => tables.filter(t => t.domain === '财务域' && t.assetType === 'asset')
  },

  // ==================== 2 要素类 ====================
  'risk-feature': {
    key: 'risk-feature',
    title: '风险特征',
    description: '风控特征变量、实时特征宽表等特征要素',
    category: 'element',
    categoryLabel: '数据要素',
    filter: (tables) => tables.filter(t => t.storage === 'HBase' || t.sourceSystem?.includes('feature') || t.sourceSystem?.includes('特征'))
  },
  'unified-metric': {
    key: 'unified-metric',
    title: '统一指标',
    description: '业务指标、运营看板指标等指标要素',
    category: 'element',
    categoryLabel: '数据要素',
    filter: (tables) => tables.filter(t => t.name?.includes('metric') || t.sourceSystem?.includes('指标') || t.cnName?.includes('指标'))
  }
}

/** 获取配置 */
export function getTypeConfig(key: string): TypeConfig | undefined {
  return TYPE_CONFIGS[key]
}

/** 所有配置的数组 */
export const ALL_TYPE_CONFIGS = Object.values(TYPE_CONFIGS)
