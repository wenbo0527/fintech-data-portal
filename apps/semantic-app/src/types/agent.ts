/** Agent推理步骤 */
export interface ReasoningStep {
  step: number
  tool: string               // 调用的工具名
  input: string              // 工具输入
  output: string             // 工具输出（摘要）
  outputDetail?: Record<string, unknown>  // 工具输出（完整）
}

/** 查询结果 */
export interface QueryResult {
  metric: string             // 指标名
  value: number              // 数值
  valueDisplay: string       // 展示用数值（如"4.2%"）
  caliber: string            // 口径说明
  formula: string            // 计算公式
  sourceSystem: string       // 数据来源
  version: string            // 版本
  maintainedBy: string       // 维护团队
  alertThreshold: number     // 预警阈值
  alertTriggered: boolean    // 是否触发预警
  totalLoans?: number        // 总贷款数
  overdueCount?: number      // 逾期数
}

/** 多口径对比结果 */
export interface CaliberComparison {
  caliberName: string
  value: number
  valueDisplay: string
  sourceSystem: string
}

/** Agent响应 */
export interface AgentResponse {
  answer: string             // 自然语言回答
  reasoningSteps: ReasoningStep[]
  queryResult?: QueryResult
  comparisons?: CaliberComparison[]  // 多口径对比
  error?: string             // 错误信息（如幻觉拦截）
}

/** 对话消息 */
export interface ChatMessage {
  id: string
  role: 'user' | 'agent'
  content: string
  timestamp: number
  response?: AgentResponse   // agent消息附带完整响应
  source?: 'llm' | 'rules'   // 回答来源：真实大模型 / 内置规则引擎
  model?: string             // source=llm 时的模型名
  streaming?: boolean        // 大模型流式输出中
}
