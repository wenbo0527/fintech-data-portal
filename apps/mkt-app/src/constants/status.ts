export type StatusMeta = { label: string; color: string }

export const STATUS_DICTIONARY: Record<string, Record<string, StatusMeta>> = {
  task: {
    pending: { label: '待执行', color: 'gray' },
    running: { label: '运行中', color: 'blue' },
    completed: { label: '已完成', color: 'green' },
    failed: { label: '失败', color: 'red' },
    paused: { label: '暂停', color: 'orange' }
  },
  evaluation: {
    completed: { label: '已完成', color: 'green' },
    running: { label: '进行中', color: 'blue' },
    failed: { label: '失败', color: 'red' }
  },
  backtrackStatus: {
    running: { label: '运行中', color: 'blue' },
    completed: { label: '已完成', color: 'green' },
    failed: { label: '失败', color: 'red' },
    stopped: { label: '已停止', color: 'orange' }
  },
  backtrackType: {
    single: { label: '单次回溯', color: 'blue' },
    periodic: { label: '周期回溯', color: 'purple' }
  },
  notification: {
    draft: { label: '草稿', color: 'orange' },
    published: { label: '已发布', color: 'green' },
    archived: { label: '已归档', color: 'blue' },
    expired: { label: '已过期', color: 'red' }
  },
  budgetTask: {
    costing: { label: '待核算', color: 'orange' },
    reconcile: { label: '待对账', color: 'blue' },
    writeoff: { label: '待核销', color: 'purple' },
    done: { label: '已完成', color: 'green' }
  },
  externalDataStatus: {
    importing: { label: '引入中', color: 'orange' },
    online: { label: '已上线', color: 'green' },
    pending_evaluation: { label: '待评估', color: 'blue' },
    archived: { label: '已归档', color: 'gray' }
  },
  metricStatus: {
    active: { label: '启用', color: 'green' },
    inactive: { label: '停用', color: 'red' },
    draft: { label: '草稿', color: 'orange' }
  },
  dataQueryStatus: {
    pending: { label: '待处理', color: 'orange' },
    processing: { label: '处理中', color: 'blue' },
    completed: { label: '已完成', color: 'green' },
    failed: { label: '失败', color: 'red' },
    cancelled: { label: '已取消', color: 'gray' }
  },
  touchSmsStatus: {
    pending: { label: '待发送', color: 'blue' },
    sending: { label: '发送中', color: 'orange' },
    completed: { label: '已完成', color: 'green' },
    failed: { label: '发送失败', color: 'red' }
  },
  marketingTask: {
    draft: { label: '草稿', color: 'orange' },
    running: { label: '运行中', color: 'blue' },
    completed: { label: '已完成', color: 'green' },
    disabled: { label: '停用', color: 'red' },
    published: { label: '已发布', color: 'green' }
  },
  // 券【实例】状态 - 严格 9 态对齐 types/api/coupon.ts (PRD v1.2.8 §11.3)
  // 5/26 教训链: 模板态/审批态必须独立字典,不再混用
  couponStatus: {
    pending: { label: '待确认', color: 'arcoblue' },                   // 内部态:Kafka 消费后→核心回执前(对用户不可见)
    received: { label: '未使用', color: 'blue' },                     // 激活态 - v1.2.7 中文化(原"已领取")
    invalidated: { label: '已作废', color: 'red' },                    // 被动作废
    expired: { label: '已过期', color: 'gray' },                      // 自然过期
    // v1.2.6 PRD §11.3 5 个失败态(v1.2.7 中文化) - 可补发
    failed_1001_core_rejected: { label: '核心拒收失败', color: 'red' },
    failed_1002_timeout: { label: '超时失败', color: 'red' },
    failed_1003_invalidation: { label: '存量作废失败', color: 'red' },
    failed_1004_kafka_push: { label: '推送失败', color: 'red' },
    failed_1005_kafka_consume: { label: '消费失败', color: 'red' }
  },
  // 券【模板】状态 - 模板级生命周期(独立字典,避免与实例态 pending 混用)
  templateStatus: {
    draft: { label: '草稿', color: 'gray' },
    online: { label: '生效中', color: 'green' },
    active: { label: '生效中', color: 'green' },   // 兼容 alias: 部分模板历史数据
    offline: { label: '已下线', color: 'gray' },
    paused: { label: '已暂停', color: 'orange' },
    expired: { label: '已过期', color: 'red' }
  },
  // 审批状态(模板审批流) - 独立字典
  approvalStatus: {
    pending: { label: '待审批', color: 'blue' },
    approved: { label: '已通过', color: 'green' },
    rejected: { label: '已拒绝', color: 'red' },
    cancelled: { label: '已撤销', color: 'gray' }
  },
  alertRuleStatus: {
    active: { label: '启用', color: 'green' },
    inactive: { label: '停用', color: 'red' }
  },
  tagTableStatus: {
    online: { label: '上线', color: 'green' },
    offline: { label: '下线', color: 'red' }
  },
  eventStatus: {
    草稿: { label: '草稿', color: 'gray' },
    上线: { label: '上线', color: 'green' },
    下线: { label: '下线', color: 'red' }
  },
  eventType: {
    系统事件: { label: '系统事件', color: 'blue' },
    业务事件: { label: '业务事件', color: 'green' },
    用户事件: { label: '用户事件', color: 'orange' },
    营销事件: { label: '营销事件', color: 'purple' },
    风控事件: { label: '风控事件', color: 'red' }
  },
  kafkaConnection: {
    connected: { label: '已连接', color: 'green' },
    disconnected: { label: '未连接', color: 'gray' },
    error: { label: '连接异常', color: 'red' }
  },
  attributeType: {
    numeric: { label: '数值型', color: 'blue' },
    string: { label: '字符型', color: 'green' }
  },
  dimensionType: {
    customer: { label: '客户级', color: 'blue' },
    'product-customer': { label: '产品客户级', color: 'green' }
  },
  mappingSupport: {
    支持: { label: '支持', color: 'green' },
    不支持: { label: '不支持', color: 'gray' }
  },
  externalDataMgmtStatus: {
    active: { label: '启用', color: 'green' },
    inactive: { label: '停用', color: 'orange' },
    draft: { label: '草稿', color: 'gray' }
  },
  purchaseProjectStatus: {
    pending: { label: '待审核', color: 'orange' },
    approved: { label: '已审核', color: 'blue' },
    'in-progress': { label: '进行中', color: 'cyan' },
    completed: { label: '已完成', color: 'green' },
    cancelled: { label: '已取消', color: 'red' }
  },
  versionStatus: {
    active: { label: '当前版本', color: 'green' },
    history: { label: '历史版本', color: 'gray' }
  },
  tableAssetStatus: {
    active: { label: '活跃', color: 'green' },
    inactive: { label: '非活跃', color: 'orange' },
    archived: { label: '已归档', color: 'red' }
  },
  alertType: {
    inventory: { label: '库存监控', color: 'blue' },
    expiry: { label: '过期监控', color: 'orange' },
    failure: { label: '发放失败', color: 'red' }
  },
  alertHistoryStatus: {
    pending: { label: '待处理', color: 'red' },
    processing: { label: '处理中', color: 'orange' },
    resolved: { label: '已处理', color: 'green' }
  },
  riskTaskType: {
    training: { label: '模型训练', color: 'blue' },
    evaluation: { label: '模型评估', color: 'green' },
    prediction: { label: '模型预测', color: 'orange' },
    backtrack: { label: '模型回溯', color: 'purple' }
  },
  riskTaskStatus: {
    pending: { label: '待执行', color: 'gray' },
    running: { label: '运行中', color: 'blue' },
    completed: { label: '已完成', color: 'green' },
    failed: { label: '失败', color: 'red' },
    paused: { label: '暂停', color: 'orange' }
  },
  riskTaskPriority: {
    high: { label: '高', color: 'red' },
    medium: { label: '中', color: 'orange' },
    low: { label: '低', color: 'green' }
  },
  dataModelUseCase: {
    download: { label: '明细数据下载', color: 'blue' },
    report: { label: '分析报告模板', color: 'green' },
    external_data_sample: { label: '外数样本表', color: 'purple' },
    validation_rule: { label: '校验规则', color: 'orange' }
  },
  dataModelLanguage: {
    sql: { label: 'SQL', color: 'orange' },
    python: { label: 'Python', color: 'purple' }
  },
  dataModelStatus: {
    draft: { label: '草稿', color: 'gray' },
    published: { label: '已发布', color: 'green' },
    archived: { label: '已归档', color: 'red' }
  },
  dataModelExecutionStatus: {
    success: { label: '成功', color: 'green' },
    failed: { label: '失败', color: 'red' },
    running: { label: '运行中', color: 'blue' }
  }
}

export function getStatusMeta(dictKey: string, status: string): StatusMeta {
  const dict = STATUS_DICTIONARY[dictKey]
  if (!dict) return { label: status, color: 'gray' }
  return dict[status] || { label: status, color: 'gray' }
}
