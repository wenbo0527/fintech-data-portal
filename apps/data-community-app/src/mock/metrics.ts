import type { MockMethod } from 'vite-plugin-mock'
import { MetricType, RegulatoryCategory, REGULATORY_CATEGORY_LABELS, type MetricItem } from '@/types-dca/metrics'

export const metrics: MetricItem[] = [
  {
    id: '1',
    type: MetricType.BUSINESS_CORE,
    name: 'DAU',
    category: '用户指标',
    businessDomain: '留存域',
    businessDefinition: `<p><strong>日活跃用户数</strong>，用于衡量当日登录或使用的用户规模。</p><p><span style="color:#52c41a">计算口径：</span>去除测试账号与机器人。</p>`,
    owner: '张三',
    code: 'USER_001',
    useCase: '用于监控产品的日常活跃情况，是产品健康度的重要指标',
    statisticalPeriod: '日更新',
    sourceTable: 'dwd.user_login_detail',
    processingLogic: 'SELECT dt, COUNT(DISTINCT user_id) as dau\nFROM dwd.user_login_detail\nWHERE dt = ${date}\nGROUP BY dt',
    fieldDescription: 'user_id: 用户唯一标识, dt: 统计日期',
    reportInfo: '用户分析/核心指标',
    reportName: '用户分析/核心指标',
    storageLocation: 'adm.ads_user_core_metrics',
    queryCode: 'SELECT dau FROM adm.ads_user_core_metrics WHERE dt = ${date}',
    versions: [
      { date: '2024-01-01', description: '指标创建' },
      { date: '2024-01-15', description: '优化统计逻辑，排除测试账号' }
    ],
    businessOwner: '李四',
    technicalOwner: '王五',
    isFavorite: true
  },
  {
    id: '2',
    type: MetricType.BUSINESS_CORE,
    name: '当日风控授信通过笔数',
    category: '业务域',
    businessDomain: '业务规模',
    businessDefinition: `<p><b>风控授信通过笔数</b>，<span style="color:#f5222d">审批结果=通过</span>的申请数量。</p><p><em>口径说明：</em>去重后取最新审批。</p>`,
    owner: '王志雄',
    code: 'A00043',
    useCase: '',
    statisticalPeriod: '离线T+2',
    sourceTable: 'a_frms_deparment_sx_his_full',
    processingLogic: (
      'WITH base AS (\n' +
      '  SELECT\n' +
      '    flow_id,\n' +
      '    apply_id,\n' +
      '    customer_id,\n' +
      '    product_code,\n' +
      '    result,\n' +
      '    decision_stage,\n' +
      '    decision_time,\n' +
      "    CASE WHEN remark LIKE '%测试%' OR remark LIKE '%test%' THEN 1 ELSE 0 END AS is_test,\n" +
      '    data_dt\n' +
      '  FROM a_frms_deparment_sx_his_full\n' +
      '  WHERE data_dt = ${date}\n' +
      '),\n' +
      'dedup AS (\n' +
      '  SELECT\n' +
      '    flow_id,\n' +
      '    apply_id,\n' +
      '    customer_id,\n' +
      '    product_code,\n' +
      '    result,\n' +
      '    decision_stage,\n' +
      '    decision_time,\n' +
      '    is_test,\n' +
      '    data_dt,\n' +
      '    ROW_NUMBER() OVER (PARTITION BY flow_id ORDER BY decision_time DESC) AS rn\n' +
      '  FROM base\n' +
      '),\n' +
      'latest AS (\n' +
      '  SELECT * FROM dedup WHERE rn = 1\n' +
      '),\n' +
      'valid_app AS (\n' +
      '  SELECT l.*\n' +
      '  FROM latest l\n' +
      '  LEFT JOIN dim_customer d ON l.customer_id = d.customer_id\n' +
      '  LEFT JOIN dim_product p ON l.product_code = p.product_code\n' +
      '  WHERE COALESCE(l.is_test, 0) = 0\n' +
      '    AND COALESCE(d.is_blacklist, 0) = 0\n' +
      "    AND COALESCE(p.status, 'ON') IN ('ON','ACTIVE')\n" +
      '),\n' +
      'pass_at_risk AS (\n' +
      "  SELECT * FROM valid_app WHERE result = 'PA' AND decision_stage = 'RISK'\n" +
      '),\n' +
      'exclude_revoke AS (\n' +
      '  SELECT pr.*\n' +
      '  FROM pass_at_risk pr\n' +
      '  LEFT JOIN a_frms_deparment_sx_his_full h2\n' +
      '    ON pr.flow_id = h2.flow_id\n' +
      "   AND h2.result IN ('RV','RJ')\n" +
      '   AND h2.decision_time > pr.decision_time\n' +
      '   AND h2.data_dt = pr.data_dt\n' +
      '  WHERE h2.flow_id IS NULL\n' +
      '),\n' +
      'final_cnt AS (\n' +
      '  SELECT\n' +
      '    data_dt,\n' +
      '    COUNT(DISTINCT flow_id) AS pass_cnt\n' +
      '  FROM exclude_revoke\n' +
      '  GROUP BY data_dt\n' +
      ')\n' +
      'SELECT pass_cnt\n' +
      'FROM final_cnt\n' +
      'WHERE data_dt = ${date}'
    ),
    fieldDescription: '',
    reportInfo: '发展日测报告\n公司级报表・市场营销报表',
    reportName: '公司级报表・市场营销报表',
    storageLocation: 'adm.ads_report_index_commonality_info_full',
    queryCode: 'SELECT data_dt=20250401\nFROM adm.ads_report_numbersinfo_free_temporal_code\nWHERE data_dt=20250401\nAND indicator_name=\'风控授信通过量\'\nAND indicator_id=\'A00043\'',
    versions: [
      { date: '2024-01-01', description: '指标创建' }
    ],
    businessOwner: '',
    technicalOwner: '',
    isFavorite: false
  },
  {
    id: '3',
    type: MetricType.BUSINESS_CORE,
    name: '用户注册转化率',
    category: '用户指标',
    businessDomain: '转化域',
    businessDefinition: `<p><strong>注册转化率</strong> = 注册用户 / 访问用户。</p><p><span style="color:#1677ff">适用范围：</span>Web与App渠道。</p>`,
    owner: '李四',
    code: 'USER_002',
    useCase: '衡量产品获客效果，优化注册流程',
    statisticalPeriod: '日更新',
    sourceTable: 'dwd.user_register_detail',
    processingLogic: 'SELECT dt, COUNT(DISTINCT register_user_id) / COUNT(DISTINCT visit_user_id) as conversion_rate\nFROM dwd.user_register_detail\nWHERE dt = ${date}\nGROUP BY dt',
    fieldDescription: 'register_user_id: 完成注册的用户ID, visit_user_id: 访问用户ID',
    reportInfo: '用户分析/转化分析',
    reportName: '用户分析/转化分析',
    storageLocation: 'adm.ads_user_conversion_metrics',
    queryCode: 'SELECT conversion_rate FROM adm.ads_user_conversion_metrics WHERE dt = ${date}',
    versions: [
      { date: '2024-01-05', description: '指标创建' }
    ],
    businessOwner: '王五',
    technicalOwner: '赵六',
    isFavorite: false
  },
  // 监管指标示例
  {
    id: '4',
    type: MetricType.REGULATORY,
    name: '资本充足率',
    category: '资本管理',
    businessDefinition: `<p><strong>资本充足率</strong>，反映风险抵御能力。</p><ul><li><span style="color:#faad14">一级资本</span> + 二级资本</li><li>风险加权资产</li></ul>`,
    code: 'REG_001',
    statisticalPeriod: '月度',
    sourceTable: 'reg.capital_adequacy_detail',
    processingLogic: 'SELECT (tier1_capital + tier2_capital) / risk_weighted_assets * 100 as capital_adequacy_ratio\nFROM reg.capital_adequacy_detail\nWHERE report_date = ${date}',
    storageLocation: 'reg.ads_capital_adequacy_ratio',
    queryCode: 'SELECT capital_adequacy_ratio FROM reg.ads_capital_adequacy_ratio WHERE report_date = ${date}',
    versions: [
      { date: '2024-01-01', description: '监管指标创建' }
    ],
    businessOwner: '监管合规部-张经理',
    technicalOwner: '数据团队-李工程师',
    regulatoryCategory: RegulatoryCategory.CBIRC_BANKING,
    reportName: '银行业监管统计报表',
    isFavorite: false
  },
  {
    id: '5',
    type: MetricType.REGULATORY,
    name: '流动性覆盖率',
    category: '流动性管理',
    businessDefinition: `<p><strong>流动性覆盖率</strong>，衡量短期流动性充足程度。</p><p><span style="color:#13c2c2">公式：</span>高质量流动性资产 / 30天净现金流出量 × 100%</p>`,
    code: 'REG_002',
    statisticalPeriod: '日度',
    sourceTable: 'reg.liquidity_coverage_detail',
    processingLogic: 'SELECT high_quality_liquid_assets / net_cash_outflows_30d * 100 as lcr\nFROM reg.liquidity_coverage_detail\nWHERE report_date = ${date}',
    storageLocation: 'reg.ads_liquidity_coverage_ratio',
    queryCode: 'SELECT lcr FROM reg.ads_liquidity_coverage_ratio WHERE report_date = ${date}',
    versions: [
      { date: '2024-01-01', description: '监管指标创建' }
    ],
    businessOwner: '风险管理部-王总监',
    technicalOwner: '数据团队-赵工程师',
    regulatoryCategory: RegulatoryCategory.PBOC_CENTRALIZED,
    reportName: '人民银行大集中系统报表',
    isFavorite: false
  },
  {
    id: '6',
    type: MetricType.REGULATORY,
    name: '杠杆率',
    category: '资本管理',
    businessDefinition: `<p><strong>杠杆率</strong>，体现资产对资本的占用程度。</p><p><span style="color:#722ed1">说明：</span>一级资本 / 调整后资产总额 × 100%</p>`,
    code: 'REG_003',
    statisticalPeriod: '月度',
    sourceTable: 'reg.leverage_ratio_detail',
    processingLogic: 'SELECT tier1_capital / adjusted_total_assets * 100 as leverage_ratio\nFROM reg.leverage_ratio_detail\nWHERE report_date = ${date}',
    storageLocation: 'reg.ads_leverage_ratio',
    queryCode: 'SELECT leverage_ratio FROM reg.ads_leverage_ratio WHERE report_date = ${date}',
    versions: [
      { date: '2024-02-01', description: '新增杠杆率监管指标' }
    ],
    businessOwner: '监管合规部-张经理',
    technicalOwner: '数据团队-李工程师',
    regulatoryCategory: RegulatoryCategory.CBIRC_BANKING,
    reportName: '杠杆率监管报告',
    isFavorite: false
  },
  {
    id: '7',
    type: MetricType.REGULATORY,
    name: '净稳定资金比例',
    category: '流动性管理',
    businessDefinition: `<p><strong>净稳定资金比例</strong>，衡量长期资金稳定性。</p><p><span style="color:#eb2f96">要点：</span>可用稳定资金 / 所需稳定资金 × 100%</p>`,
    code: 'REG_004',
    statisticalPeriod: '月度',
    sourceTable: 'reg.net_stable_funding_ratio_detail',
    processingLogic: 'SELECT available_stable_funding / required_stable_funding * 100 as nsfr\nFROM reg.net_stable_funding_ratio_detail\nWHERE report_date = ${date}',
    storageLocation: 'reg.ads_nsfr_ratio',
    queryCode: 'SELECT nsfr FROM reg.ads_nsfr_ratio WHERE report_date = ${date}',
    versions: [
      { date: '2024-03-01', description: '新增净稳定资金比例监管指标' }
    ],
    businessOwner: '风险管理部-王总监',
    technicalOwner: '数据团队-赵工程师',
    regulatoryCategory: RegulatoryCategory.PBOC_CENTRALIZED,
    reportName: '净稳定资金比例报告',
    isFavorite: false
  },
  {
    id: '8',
    type: MetricType.REGULATORY,
    name: '信贷资产质量不良率',
    category: '信贷风险管理',
    businessDefinition: `<p><strong>不良率</strong>，反映资产质量。</p><p><span style="color:#cf1322">定义：</span>不良贷款余额 / 贷款总额 × 100%</p>`,
    code: 'REG_005',
    statisticalPeriod: '季度',
    sourceTable: 'reg.credit_asset_quality_detail',
    processingLogic: 'SELECT non_performing_loans / total_loans * 100 as npl_ratio\nFROM reg.credit_asset_quality_detail\nWHERE report_quarter = ${quarter}',
    storageLocation: 'reg.ads_npl_ratio',
    queryCode: 'SELECT npl_ratio FROM reg.ads_npl_ratio WHERE report_quarter = ${quarter}',
    versions: [
      { date: '2024-03-31', description: '新增信贷资产质量监管指标' }
    ],
    businessOwner: '授信管理部-刘主管',
    technicalOwner: '数据团队-周工程师',
    regulatoryCategory: RegulatoryCategory.PBOC_FINANCIAL_BASE,
    reportName: '信贷资产质量报告',
    isFavorite: false
  },
  {
    id: '9',
    type: MetricType.REGULATORY,
    name: '大额风险暴露集中度',
    category: '信贷风险管理',
    businessDefinition: `<p><strong>集中度</strong>，控制对大客户的风险暴露。</p><p><span style="color:#597ef7">指标：</span>前若干大客户风险暴露 / 资本 × 100%</p>`,
    code: 'REG_006',
    statisticalPeriod: '月度',
    sourceTable: 'reg.large_exposure_concentration_detail',
    processingLogic: 'SELECT top_exposures_capital_ratio * 100 as concentration_ratio\nFROM reg.large_exposure_concentration_detail\nWHERE report_date = ${date}',
    storageLocation: 'reg.ads_large_exposure_concentration',
    queryCode: 'SELECT concentration_ratio FROM reg.ads_large_exposure_concentration WHERE report_date = ${date}',
    versions: [
      { date: '2024-04-01', description: '新增大额风险暴露监管指标' }
    ],
    businessOwner: '风险管理部-王总监',
    technicalOwner: '数据团队-赵工程师',
    regulatoryCategory: RegulatoryCategory.CBIRC_BANKING,
    reportName: '大额风险暴露报告',
    isFavorite: false
  }
]

// 获取所有指标分类
const getMetricCategories = () => {
  const categories = new Set<string>()
  metrics.forEach(metric => {
    categories.add(metric.category)
  })
  return Array.from(categories)
}

// 获取所有业务域
const getBusinessDomains = () => {
  const domains = new Set<string>()
  metrics.forEach(metric => {
    if (metric.businessDomain) {
      domains.add(metric.businessDomain)
    }
  })
  return Array.from(domains)
}

// 获取监管报表名称列表
const getReportNames = (regulatoryCategory?: string) => {
  const reportNames = new Set<string>()
  metrics.forEach(metric => {
    if (metric.type === MetricType.REGULATORY && metric.reportName) {
      if (!regulatoryCategory || metric.regulatoryCategory === regulatoryCategory) {
        reportNames.add(metric.reportName)
      }
    }
  })
  return Array.from(reportNames)
}

export default [
  {
    url: '/api/metrics/list',
    method: 'get',
    response: ({ query }: { query: { page?: string; pageSize?: string; name?: string; category?: string; businessDomain?: string; type?: string; regulatoryCategory?: string; reportName?: string } }) => {
      const { page = '1', pageSize = '10', name, category, businessDomain, type, regulatoryCategory, reportName } = query
      console.log('Mock服务收到请求参数:', { page, pageSize, name, category, businessDomain, type, regulatoryCategory, reportName })
      let filteredMetrics = [...metrics]

      // 按指标类型筛选
      if (type) {
        filteredMetrics = filteredMetrics.filter(item => item.type === type)
      }

      // 按名称筛选
      if (name) {
        filteredMetrics = filteredMetrics.filter(item => item.name.includes(name))
      }

      // 按分类筛选
      if (category) {
        filteredMetrics = filteredMetrics.filter(item => item.category === category)
      }

      // 按业务域筛选
      if (businessDomain) {
        filteredMetrics = filteredMetrics.filter(item => item.businessDomain === businessDomain)
      }

  // 按监管报表大类筛选
  if (regulatoryCategory) {
    // 支持中文“指标域”映射到内部分类，以及按枚举标签匹配
    const DOMAIN_TO_CATEGORY: Record<string, string> = {
      '资本监管': '资本管理',
      '流动性监管': '流动性管理',
      '信贷风险监管': '信贷风险管理'
    }
    if (DOMAIN_TO_CATEGORY[regulatoryCategory]) {
      const mappedCategory = DOMAIN_TO_CATEGORY[regulatoryCategory]
      filteredMetrics = filteredMetrics.filter(item => item.category === mappedCategory)
    } else {
      const matchedEnumKey = (Object.keys(REGULATORY_CATEGORY_LABELS)
        .find(k => REGULATORY_CATEGORY_LABELS[k as keyof typeof REGULATORY_CATEGORY_LABELS] === regulatoryCategory) 
        || undefined) as keyof typeof REGULATORY_CATEGORY_LABELS | undefined
      if (matchedEnumKey) {
        filteredMetrics = filteredMetrics.filter(item => item.regulatoryCategory === matchedEnumKey)
      } else {
        filteredMetrics = filteredMetrics.filter(item => item.regulatoryCategory === regulatoryCategory)
      }
    }
  }

      // 按报表名称筛选
      if (reportName) {
        filteredMetrics = filteredMetrics.filter(item => item.reportName === reportName)
      }

      // 分页处理
      const startIndex = (parseInt(page, 10) - 1) * parseInt(pageSize, 10)
      const endIndex = startIndex + parseInt(pageSize, 10)
      const paginatedMetrics = filteredMetrics.slice(startIndex, endIndex)

      const response = {
        code: 200,
        message: 'success',
        data: {
          list: paginatedMetrics,
          total: filteredMetrics.length
        }
      }
      console.log('Mock服务返回数据:', response)
      return response
    }
  },
  {
    url: '/api/metrics/categories',
    method: 'get',
    response: () => {
      return {
        code: 200,
        message: 'success',
        data: getMetricCategories()
      }
    }
  },
  {
    url: '/api/metrics/business-domains',
    method: 'get',
    response: () => {
      return {
        code: 200,
        message: 'success',
        data: getBusinessDomains()
      }
    }
  },
  {
    url: '/api/metrics/report-names',
    method: 'get',
    response: ({ query }: { query: { regulatoryCategory?: string } }) => {
      const { regulatoryCategory } = query
      return {
        code: 200,
        message: 'success',
        data: getReportNames(regulatoryCategory)
      }
    }
  },
  {
    url: '/api/metrics/batch-register',
    method: 'post',
    response: ({ body }: { body: any }) => {
      console.log('批量注册指标:', body)
      return {
        code: 200,
        message: 'success',
        data: {
          success: true,
          successCount: body.metrics?.length || 0,
          failCount: 0,
          errors: []
        }
      }
    }
  },
  {
    url: '/api/metrics/:id',
    method: 'get',
    response: ({ url }: { url: string }) => {
      const id = url.split('/').pop()
      const metric = metrics.find(m => m.id === id)
      if (metric) {
        return {
          code: 200,
          message: 'success',
          data: metric
        }
      } else {
        return {
          code: 404,
          message: '指标不存在',
          data: null
        }
      }
    }
  },
  {
    url: '/api/metrics',
    method: 'post',
    response: ({ body }: { body: MetricItem }) => {
      const newMetric = {
        ...body,
        id: String(metrics.length + 1),
        // 使用 slice(0, 10) 保证生成的日期为严格的 string 类型
        versions: [{ date: new Date().toISOString().slice(0, 10), description: '指标创建' }],
        isFavorite: false
      }
      metrics.push(newMetric)
      console.log('创建新指标:', newMetric)
      return {
        code: 200,
        message: 'success',
        data: newMetric
      }
    }
  },
  {
    url: '/api/metrics/:id',
    method: 'put',
    response: ({ url, body }: { url: string; body: MetricItem }) => {
      const id = url.split('/').pop()
      const index = metrics.findIndex(m => m.id === id)
      if (index !== -1) {
        metrics[index] = { ...metrics[index], ...body }
        console.log('更新指标:', metrics[index])
        return {
          code: 200,
          message: 'success',
          data: metrics[index]
        }
      } else {
        return {
          code: 404,
          message: '指标不存在',
          data: null
        }
      }
    }
  },
  {
    url: '/api/metrics/:id',
    method: 'delete',
    response: ({ url }: { url: string }) => {
      const id = url.split('/').pop()
      const index = metrics.findIndex(m => m.id === id)
      if (index !== -1) {
        const deletedMetric = metrics.splice(index, 1)[0]
        console.log('删除指标:', deletedMetric)
        return {
          code: 200,
          message: 'success',
          data: { success: true }
        }
      } else {
        return {
          code: 404,
          message: '指标不存在',
          data: null
        }
      }
    }
  },
  {
    url: '/api/metrics/:id/favorite',
    method: 'post',
    response: ({ url }: { url: string }) => {
      const id = url.split('/').pop()
      const metric = metrics.find(m => m.id === id)
      if (metric) {
        metric.isFavorite = !metric.isFavorite
        console.log('切换收藏状态:', metric)
        return {
          code: 200,
          message: 'success',
          data: { isFavorite: metric.isFavorite }
        }
      } else {
        return {
          code: 404,
          message: '指标不存在',
          data: null
        }
      }
    }
  }] as MockMethod[]
