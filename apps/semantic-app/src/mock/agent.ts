import type { AgentResponse } from '@/types/agent'
import type { Metric, MetricDefinition } from '@/types/metric'
import { mockMetrics, mockMetricDetail, statusLabelMap } from './metric'
import { mockTerms } from './knowledge'
import { getMetricStat } from './mockData'

/**
 * Agent查询Mock逻辑
 * 根据问题关键词匹配不同的Agent响应（7个预设场景）
 */
export function mockAgentQuery(question: string): AgentResponse {
  // 场景6前置：未注册指标（坏账率）无论何种问法都应先拦截，避免落入其他场景
  if (question.includes('坏账') || question.includes('坏帐')) {
    return agentHallucinationBlockResponse(question)
  }
  // 场景1：指标定义查询
  if (question.includes('是什么') || question.includes('什么是')) {
    return agentMetricDefinitionResponse(question)
  }
  // 场景2：数据查询
  if (question.includes('是多少') || question.includes('多少') || question.includes('查询')) {
    return agentDataQueryResponse(question)
  }
  // 场景3：跨指标对比
  if (question.includes('区别') || question.includes('对比') || question.includes('比较') || question.includes('差异')) {
    return agentCompareResponse(question)
  }
  // 场景4：术语查询
  if (question.match(/M[1-3]/) || question.includes('意思') || question.includes('术语')) {
    return agentTermResponse(question)
  }
  // 场景5：治理信息
  if (question.includes('谁维护') || question.includes('谁负责') || question.includes('维护')) {
    return agentGovernanceResponse(question)
  }
  // 默认
  return agentDefaultResponse(question)
}

// ---- 场景1：指标定义查询 ----
function agentMetricDefinitionResponse(question: string): AgentResponse {
  // 匹配指标；未命中时回退到术语字典（如"什么是授信额度"）
  const metric = matchMetric(question)
  if (!metric) {
    return agentTermResponse(question)
  }

  const detail = mockMetricDetail(metric.id)

  return {
    answer: `"${metric.name}"（编码：${metric.code}）是${metric.category}，由${metric.maintainedBy}维护，当前状态：${statusLabelMap[metric.status]}${metric.aliases.length ? `，常见别名：${metric.aliases.join('、')}` : ''}。该指标存在 ${metric.definitions.length} 套口径定义：\n\n${metric.definitions.map((d, i) => `${i + 1}. ${d.caliberName}：${d.formula}（来源：${d.sourceSystem} ${d.version}）`).join('\n\n')}`,
    reasoningSteps: [
      {
        step: 1,
        tool: 'query_metric',
        input: `keyword="${metric.name}"`,
        output: `找到指标 ${metric.name}（${metric.code}），返回 ${metric.definitions.length} 套口径定义`,
        outputDetail: {
          metricId: metric.id,
          definitions: metric.definitions
        }
      },
      {
        step: 2,
        tool: 'get_metadata_mapping',
        input: `metricId="${metric.id}"`,
        output: `该指标涉及 ${detail.tableMappings.length} 张数据表：${detail.tableMappings.map(t => t.tableName).join(', ')}`,
        outputDetail: {
          tables: detail.tableMappings.map(t => ({
            table: t.tableName,
            role: t.role,
            fields: t.fields.length
          }))
        }
      }
    ]
  }
}

// ---- 场景2：数据查询 ----
/** 分子/分母均为"贷款笔数"口径的指标，结果卡片可展示总贷款/逾期明细行 */
const loanBasedCodes = ['fpd30', 'overdue_rate', 'npl_rate']

function agentDataQueryResponse(question: string): AgentResponse {
  const metric = matchMetric(question)
  if (!metric) {
    return agentDefaultResponse(question)
  }

  // 提取月份
  const monthMatch = question.match(/2026-(\d{2})/)
  const month = monthMatch ? `2026-${monthMatch[1]}` : '全部'
  const monthLabel = month === '全部' ? '近三个月（2026-07 ~ 2026-09）' : month

  // 按指标 code 分派到对应的统计函数，基于内存数据实算
  const stat = getMetricStat(metric.code, month)
  if (!stat) {
    return agentDefaultResponse(question)
  }

  // 口径选择：问题中提到口径关键词则命中对应口径，否则默认第一套并提示其他可选口径
  const { caliber, explicit } = pickCaliber(metric, question)
  const otherCalibers = metric.definitions.filter(d => d.id !== caliber.id)
  const caliberHint = explicit
    ? ''
    : otherCalibers.length
      ? `\n该指标另有 ${otherCalibers.length} 套口径：${otherCalibers.map(d => d.caliberName).join('、')}，可在提问中指定，如"用${otherCalibers[0].caliberName.replace(/口径$/, '')}口径查${metric.name}"。`
      : ''
  const statusNote = metric.status !== 'published'
    ? `\n注意：该指标当前状态为"${statusLabelMap[metric.status]}"，尚未正式发布。`
    : ''
  const alertActive = metric.alertEnabled
  const alertTriggered = alertActive && stat.rate > metric.alertThreshold
  const alertText = alertActive
    ? alertTriggered
      ? `⚠ 当前值已超过预警阈值 ${metric.alertThreshold}%，请关注！`
      : `当前值未超过预警阈值 ${metric.alertThreshold}%。`
    : '该指标暂未启用阈值预警。'

  const detail = mockMetricDetail(metric.id)
  const tableDesc = detail.tableMappings
    .map(t => `${t.tableName}（${t.role === 'numerator' ? '分子' : t.role === 'denominator' ? '分母' : '维度'}）`)
    .join('、')

  const fmt = (v: number) => Math.round(v).toLocaleString('zh-CN')

  return {
    answer: `${monthLabel}的${metric.name}为 ${stat.rate.toFixed(2)}%（${stat.numeratorLabel} ${fmt(stat.numerator)} / ${stat.denominatorLabel} ${fmt(stat.denominator)}），口径为"${caliber.caliberName}"：${caliber.formula}。${alertText}${caliberHint}${statusNote}`,
    reasoningSteps: [
      {
        step: 1,
        tool: 'query_metric',
        input: `keyword="${metric.name}"${metric.aliases.length ? `; aliases=[${metric.aliases.join(',')}]` : ''}`,
        output: `找到指标 ${metric.name}（${metric.code}），${explicit ? `按问题指定使用口径：${caliber.caliberName}` : `使用默认口径：${caliber.caliberName}（共 ${metric.definitions.length} 套可选）`}`
      },
      {
        step: 2,
        tool: 'get_metadata_mapping',
        input: `metricId="${metric.id}"`,
        output: `映射到表：${tableDesc}`
      },
      {
        step: 3,
        tool: 'execute_data_query',
        input: `table=${detail.tableMappings.map(t => t.tableName).join(',')}; month=${month}; caliber=${caliber.caliberName}`,
        output: `查询完成：${stat.numeratorLabel} ${fmt(stat.numerator)}，${stat.denominatorLabel} ${fmt(stat.denominator)}，${metric.name} ${stat.rate.toFixed(2)}%`
      },
      {
        step: 4,
        tool: 'check_alert',
        input: alertActive ? `value=${stat.rate}%; threshold=${metric.alertThreshold}%` : `alert_enabled=false`,
        output: alertActive
          ? alertTriggered
            ? `触发预警：${stat.rate}% > ${metric.alertThreshold}%`
            : `未触发预警：${stat.rate}% <= ${metric.alertThreshold}%`
          : '该指标未启用预警，跳过阈值检查'
      }
    ],
    queryResult: {
      metric: metric.name,
      value: stat.rate,
      valueDisplay: `${stat.rate.toFixed(2)}%`,
      caliber: caliber.formula,
      formula: caliber.formula,
      sourceSystem: caliber.sourceSystem,
      version: caliber.version,
      maintainedBy: metric.maintainedBy,
      alertThreshold: metric.alertThreshold,
      alertTriggered,
      totalLoans: loanBasedCodes.includes(metric.code) ? stat.denominator : undefined,
      overdueCount: loanBasedCodes.includes(metric.code) ? stat.numerator : undefined
    }
  }
}

// ---- 场景3：跨指标对比 ----
function agentCompareResponse(question: string): AgentResponse {
  const metrics: typeof mockMetrics = []
  for (const m of mockMetrics) {
    if (question.includes(m.name) || question.includes(m.code) || (m.aliases ?? []).some(a => question.includes(a))) {
      metrics.push(m)
    }
  }
  if (metrics.length < 2) {
    return agentDefaultResponse(question)
  }

  return {
    answer: `${metrics.map(m => m.name).join(' 与 ')}的区别如下：\n\n${metrics.map(m => `【${m.name}】（${m.code}）\n口径：${m.definitions[0].caliberName}\n公式：${m.definitions[0].formula}\n来源：${m.definitions[0].sourceSystem}\n维护：${m.maintainedBy}`).join('\n\n')}`,
    reasoningSteps: [
      {
        step: 1,
        tool: 'query_metric',
        input: `keywords=${metrics.map(m => m.name).join(',')}`,
        output: `匹配到 ${metrics.length} 个指标`
      },
      {
        step: 2,
        tool: 'compare_definitions',
        input: `metricIds=${metrics.map(m => m.id).join(',')}`,
        output: `口径差异对比完成，并取各指标近三个月实测值`
      }
    ],
    comparisons: metrics.map(m => {
      const stat = getMetricStat(m.code)
      const value = stat?.rate ?? 0
      return {
        caliberName: m.definitions[0].caliberName,
        value,
        valueDisplay: `${value.toFixed(2)}%`,
        sourceSystem: m.definitions[0].sourceSystem
      }
    })
  }
}

// ---- 场景4：术语查询 ----
function agentTermResponse(question: string): AgentResponse {
  const termMatch = mockTerms.find(t =>
    question.includes(t.termName) || question.toUpperCase().includes(t.termName.toUpperCase())
  )
  if (!termMatch) {
    return agentDefaultResponse(question)
  }

  const relatedMetric = termMatch.relatedMetric
    ? mockMetrics.find(m => m.code === termMatch.relatedMetric)
    : null

  return {
    answer: `${termMatch.termName}：${termMatch.definition}${relatedMetric ? `\n\n该术语关联指标：${relatedMetric.name}（${relatedMetric.code}）` : ''}`,
    reasoningSteps: [
      {
        step: 1,
        tool: 'query_term',
        input: `keyword="${termMatch.termName}"`,
        output: `找到术语：${termMatch.termName}，分类：${termMatch.category}`
      },
      {
        step: 2,
        tool: 'find_related_metric',
        input: `termId="${termMatch.termId}"`,
        output: relatedMetric
          ? `关联指标：${relatedMetric.name}（${relatedMetric.code}）`
          : '无关联指标'
      }
    ]
  }
}

// ---- 场景5：治理信息 ----
function agentGovernanceResponse(question: string): AgentResponse {
  const metric = matchMetric(question)
  if (!metric) {
    // 查询全部指标维护信息
    return {
      answer: `当前已定义 ${mockMetrics.length} 个指标的治理信息：\n\n${mockMetrics.map(m => `【${m.name}】状态：${statusLabelMap[m.status]}，维护团队：${m.maintainedBy}，最后更新：${m.updatedAt}，口径数：${m.definitions.length}`).join('\n\n')}`,
      reasoningSteps: [
        {
          step: 1,
          tool: 'query_all_metrics',
          input: 'fields=maintained_by,updated_at',
          output: `返回 ${mockMetrics.length} 个指标的治理信息`
        }
      ]
    }
  }

  return {
    answer: `"${metric.name}"（${metric.code}）的治理信息：\n- 状态：${statusLabelMap[metric.status]}${metric.aliases.length ? `\n- 别名：${metric.aliases.join('、')}` : ''}\n- 维护团队：${metric.maintainedBy}\n- 最后更新：${metric.updatedAt}\n- 口径版本：${metric.definitions.map(d => `${d.caliberName}(${d.version})`).join('、')}\n- 预警配置：${metric.alertEnabled ? `已启用，阈值 ${metric.alertThreshold}%` : '未启用'}\n- 涉及数据表：${metric.tables.length}张${metric.changeHistory?.length ? `\n- 最近变更：${metric.changeHistory[0].time} ${metric.changeHistory[0].action}（${metric.changeHistory[0].description}）` : ''}`,
    reasoningSteps: [
      {
        step: 1,
        tool: 'query_metric',
        input: `keyword="${metric.name}"; fields=maintained_by,version,alert_threshold`,
        output: `返回 ${metric.name} 的治理元数据`
      }
    ]
  }
}

// ---- 场景6：幻觉拦截 ----
function agentHallucinationBlockResponse(question: string): AgentResponse {
  return {
    answer: `未找到"坏账率"的指标定义。语义底座中已注册的指标为：${mockMetrics.map(m => m.name).join('、')}。\n\n如需查询逾期类指标，建议使用"不良贷款率"或"逾期率"。我不会编造未定义的指标数据。`,
    reasoningSteps: [
      {
        step: 1,
        tool: 'query_metric',
        input: 'keyword="坏账率"',
        output: '未找到匹配指标'
      },
      {
        step: 2,
        tool: 'fuzzy_match',
        input: 'keyword="坏账率"',
        output: `最接近的已定义指标：不良贷款率（npl_rate）、逾期率（overdue_rate）`
      },
      {
        step: 3,
        tool: 'block_hallucination',
        input: 'reason=指标未定义',
        output: '拦截：拒绝编造未定义指标的数据'
      }
    ],
    error: '指标"坏账率"未在语义底座中定义，Agent拒绝编造数据'
  }
}

// ---- 默认响应 ----
function agentDefaultResponse(question: string): AgentResponse {
  return {
    answer: `我理解您的问题"${question}"。当前语义底座支持以下查询场景：\n\n1. 指标定义查询：如"首逾率是什么？"\n2. 数据查询：如"上个月首逾率是多少？"\n3. 指标对比：如"首逾率和逾期率有什么区别？"\n4. 术语查询：如"M1是什么意思？"\n5. 治理信息：如"首逾率是谁维护的？"\n\n当前已注册指标：${mockMetrics.map(m => m.name).join('、')}，可围绕这些指标提问。`,
    reasoningSteps: [
      {
        step: 1,
        tool: 'parse_intent',
        input: `question="${question}"`,
        output: '无法匹配已知意图'
      }
    ]
  }
}

// ---- 工具函数 ----
/** 名称/编码优先匹配，未命中时回退别名匹配（如"不良率"→不良贷款率） */
function matchMetric(question: string): Metric | null {
  return mockMetrics.find(m => question.includes(m.name) || question.includes(m.code))
    || mockMetrics.find(m => (m.aliases ?? []).some(a => question.includes(a)))
    || null
}

/** 从口径名提取匹配关键词："M3+口径"→["M3+","M3"]；"终审通过口径"→["终审通过","终审"] */
function caliberKeywords(caliberName: string): string[] {
  const base = caliberName.replace(/口径$/, '').trim()
  const kws = new Set([caliberName, base])
  if (base.endsWith('+')) kws.add(base.slice(0, -1))
  const trimmed = base.replace(/(通过|全部)$/, '')
  if (trimmed && trimmed !== base) kws.add(trimmed)
  return [...kws].filter(k => k.length >= 2)
}

/** 按问题中的口径关键词选择定义；未显式命中则取第一套 */
function pickCaliber(metric: Metric, question: string): { caliber: MetricDefinition; explicit: boolean } {
  const defs = metric.definitions
  if (!defs.length) throw new Error(`metric ${metric.code} has no definition`)
  if (defs.length === 1) return { caliber: defs[0], explicit: false }
  let best: MetricDefinition | null = null
  let bestLen = 0
  for (const d of defs) {
    for (const kw of caliberKeywords(d.caliberName)) {
      if (question.includes(kw) && kw.length > bestLen) {
        best = d
        bestLen = kw.length
      }
    }
  }
  return { caliber: best ?? defs[0], explicit: !!best }
}

// 预设快捷问题
export const quickQuestions: string[] = [
  '首逾率是什么？',
  '上个月首逾率是多少？',
  '首逾率和逾期率有什么区别？',
  'M1是什么意思？',
  '首逾率是谁维护的？',
  '帮我查坏账率',
  '2026-09首逾率多少？',
  '2026-08不良贷款率是多少？',
  '当前额度使用率是多少？',
  '申请通过率是多少？',
  '提前还款率是什么？',
  'Vintage是什么意思？',
  '复购率和资金回收率有什么区别？',
  '不良率是多少？',
  '用监管口径查不良贷款率是多少？',
  '用M3+口径查首逾率是多少？'
]
