/**
 * 语义契约：业务阶段 / 部门语境 / 术语字典的基准数据（唯一事实源）。
 * 说明：mockBusinessStages、mockTerms 为模块级单例数组，消费方（semantic-app 等）
 * 只能 import 后 re-export，不得复制或重新赋值，否则就地变更会失效。
 */
import type { BusinessStage, Term, StageTreeNode } from '../types'

/**
 * 业务阶段树数据
 * 结构：业务阶段 → 部门语境（市场/风险/运营/公共）→ 指标
 * 同一指标可挂载在多个部门语境下，体现"同一术语在不同部门语境中的不同理解"
 */
export const mockBusinessStages: BusinessStage[] = [
  {
    stageId: 'stage_pre',
    stageName: '贷前',
    stageCode: 'pre_loan',
    order: 1,
    contexts: [
      {
        contextId: 'ctx_pre_marketing',
        department: 'marketing',
        contextName: '获客与复借语境',
        description:
          '市场部门在贷前关注获客转化与存量客户复借。此语境下"通过率"通常指预授信口径（宽松门槛），复购率是衡量渠道质量与老客价值的第一指标。',
        metrics: [
          { metricId: 'metric_repurchase', metricName: '复购率', metricCode: 'repurchase_rate' },
          { metricId: 'metric_apply_approval', metricName: '申请通过率', metricCode: 'apply_approval_rate' }
        ]
      },
      {
        contextId: 'ctx_pre_risk',
        department: 'risk',
        contextName: '准入审批语境',
        description:
          '风险部门在贷前关注准入质量与欺诈拦截。此语境下"通过率"指终审口径，与市场的预授信口径数值差异较大，提问时 Agent 需按语境选择口径。',
        metrics: [
          { metricId: 'metric_apply_approval', metricName: '申请通过率', metricCode: 'apply_approval_rate' }
        ]
      }
    ]
  },
  {
    stageId: 'stage_in',
    stageName: '贷中',
    stageCode: 'in_loan',
    order: 2,
    contexts: [
      {
        contextId: 'ctx_in_risk',
        department: 'risk',
        contextName: '额度与风险监控语境',
        description:
          '风险部门在贷中关注额度使用强度与风险敞口。额度使用率偏高提示过度负债风险，是调额降额的触发依据。',
        metrics: [
          { metricId: 'metric_limit_usage', metricName: '额度使用率', metricCode: 'limit_usage_rate' }
        ]
      },
      {
        contextId: 'ctx_in_operations',
        department: 'operations',
        contextName: '存量客户运营语境',
        description:
          '运营部门在贷中关注客户留存与收入贡献。同一指标"提前还款率"在运营语境中被解读为客户流失信号，在风险语境中则是资产质量优化，需按部门区分表述。',
        metrics: [
          { metricId: 'metric_prepay', metricName: '提前还款率', metricCode: 'prepay_rate' }
        ]
      }
    ]
  },
  {
    stageId: 'stage_post',
    stageName: '贷后',
    stageCode: 'post_loan',
    order: 3,
    contexts: [
      {
        contextId: 'ctx_post_risk',
        department: 'risk',
        contextName: '资产质量监控语境',
        description:
          '风险部门在贷后监控资产质量演变，首逾率用于早期预警，逾期率与不良贷款率默认采用内部分类口径（M1+/M3+）。',
        metrics: [
          { metricId: 'metric_fpd30', metricName: '首逾率', metricCode: 'fpd30' },
          { metricId: 'metric_overdue_rate', metricName: '逾期率', metricCode: 'overdue_rate' },
          { metricId: 'metric_npl', metricName: '不良贷款率', metricCode: 'npl_rate' }
        ]
      },
      {
        contextId: 'ctx_post_operations',
        department: 'operations',
        contextName: '催收作业语境',
        description:
          '运营（催收）部门关注回款效率与作业策略。资金回收率按现金回收口径统计，"回收"仅指现金回款，不含核销转让。',
        metrics: [
          { metricId: 'metric_recovery', metricName: '资金回收率', metricCode: 'recovery_rate' }
        ]
      },
      {
        contextId: 'ctx_post_public',
        department: 'public',
        contextName: '监管报送语境',
        description:
          '公共/合规语境面向监管报送与对外披露，逾期率与不良贷款率必须采用监管口径（逾期90天+认定不良），与内部分类口径存在差异。',
        metrics: [
          { metricId: 'metric_overdue_rate', metricName: '逾期率', metricCode: 'overdue_rate' },
          { metricId: 'metric_npl', metricName: '不良贷款率', metricCode: 'npl_rate' }
        ]
      }
    ]
  }
]

/** 扁平化：取出阶段下全部语境（兼容按阶段汇总的场景） */
export function stageMetricsOf(stage: BusinessStage) {
  return stage.contexts.flatMap(c => c.metrics)
}

/** 术语字典数据 */
export const mockTerms: Term[] = [
  {
    termId: 'term_m1',
    termName: 'M1',
    definition: '逾期1-30天，指借款人未按时还款且逾期天数在1到30天之间',
    category: '逾期分级',
    relatedMetric: 'fpd30'
  },
  {
    termId: 'term_m2',
    termName: 'M2',
    definition: '逾期31-60天，指借款人逾期天数在31到60天之间',
    category: '逾期分级',
    relatedMetric: 'overdue_rate'
  },
  {
    termId: 'term_m3',
    termName: 'M3',
    definition: '逾期61-90天，指借款人逾期天数在61到90天之间',
    category: '逾期分级',
    relatedMetric: 'overdue_rate'
  },
  {
    termId: 'term_m3plus',
    termName: 'M3+',
    definition: '逾期90天以上，通常被视为不良贷款',
    category: '逾期分级',
    relatedMetric: 'overdue_rate'
  },
  {
    termId: 'term_fpd',
    termName: '首逾',
    definition: '贷款发放后客户首次出现逾期行为，是风控核心早期预警指标',
    category: '风控术语',
    relatedMetric: 'fpd30'
  },
  {
    termId: 'term_overdue',
    termName: '逾期',
    definition: '借款人未在约定还款日之前完成足额还款的行为',
    category: '风控术语'
  },
  {
    termId: 'term_npl',
    termName: '不良贷款',
    definition: '逾期90天以上的贷款，银行业监管分类为次级、可疑、损失类贷款',
    category: '风控术语',
    relatedMetric: 'npl_rate'
  },
  {
    termId: 'term_repurchase',
    termName: '复购',
    definition: '客户在还清上一笔贷款后再次申请新贷款的行为',
    category: '业务术语',
    relatedMetric: 'repurchase_rate'
  },
  {
    termId: 'term_cashloan',
    termName: '现金贷',
    definition: '无抵押、纯信用的短期小额贷款产品',
    category: '业务术语'
  },
  {
    termId: 'term_installment',
    termName: '分期',
    definition: '将贷款本金分多期偿还的产品类型',
    category: '业务术语'
  },
  {
    termId: 'term_apply',
    termName: '贷款申请',
    definition: '客户提交借款请求并经风控审批的流程，是贷前环节起点',
    category: '业务术语',
    relatedMetric: 'apply_approval_rate'
  },
  {
    termId: 'term_credit_limit',
    termName: '授信额度',
    definition: '经审批后授予客户可借款的最高限额，随风险状况动态调整',
    category: '业务术语',
    relatedMetric: 'limit_usage_rate'
  },
  {
    termId: 'term_loan_balance',
    termName: '在贷余额',
    definition: '尚未偿还的贷款本金总额，反映机构资产规模',
    category: '风控术语',
    relatedMetric: 'limit_usage_rate'
  },
  {
    termId: 'term_dpd',
    termName: 'DPD',
    definition: 'Days Past Due，逾期天数，衡量还款滞后程度的基础计量单位',
    category: '逾期分级',
    relatedMetric: 'overdue_rate'
  },
  {
    termId: 'term_vintage',
    termName: 'Vintage',
    definition: '按放款月份分组跟踪各批次坏账表现的分析方法，用于评估资产质量演变',
    category: '风控术语',
    relatedMetric: 'npl_rate'
  },
  {
    termId: 'term_prepay',
    termName: '提前还款',
    definition: '客户在约定应还日期之前主动结清或部分偿还贷款的行为',
    category: '业务术语',
    relatedMetric: 'prepay_rate'
  },
  {
    termId: 'term_collection',
    termName: '催收',
    definition: '对逾期客户进行提醒、协商与追偿的作业流程，回收率是核心考核指标',
    category: '风控术语',
    relatedMetric: 'recovery_rate'
  },
  {
    termId: 'term_writeoff',
    termName: '核销',
    definition: '对确认无法收回的不良贷款用准备金冲销的账务处理，不代表放弃追偿',
    category: '风控术语',
    relatedMetric: 'npl_rate'
  }
]

/** 构建业务阶段树（阶段 → 部门语境 → 指标，用于 a-tree 组件） */
export function buildStageTree(stages: BusinessStage[]): StageTreeNode[] {
  return stages
    .sort((a, b) => a.order - b.order)
    .map(stage => {
      const allMetrics = stageMetricsOf(stage)
      return {
        key: `stage:${stage.stageId}`,
        title: `${stage.stageName} (${stage.contexts.length}个语境 / ${allMetrics.length}个指标挂载)`,
        nodeType: 'stage' as const,
        stageCode: stage.stageCode,
        children: stage.contexts.map(ctx => ({
          key: `stage-context:${stage.stageId}:${ctx.contextId}`,
          title: ctx.contextName,
          nodeType: 'context' as const,
          stageCode: stage.stageCode,
          stageId: stage.stageId,
          contextId: ctx.contextId,
          department: ctx.department,
          children: ctx.metrics.map(m => ({
            key: `stage-metric:${ctx.contextId}:${m.metricId}`,
            title: `${m.metricName} (${m.metricCode})`,
            nodeType: 'metric' as const,
            stageId: stage.stageId,
            contextId: ctx.contextId,
            department: ctx.department,
            metricId: m.metricId
          }))
        }))
      }
    })
}
