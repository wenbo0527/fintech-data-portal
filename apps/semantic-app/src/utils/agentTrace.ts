/**
 * Agent推理过程格式化工具
 */
import type { ReasoningStep } from '@/types/agent'

/** 格式化推理步骤为可读文本 */
export function formatReasoningSteps(steps: ReasoningStep[]): string {
  return steps
    .map(s => `[${s.step}] 调用 ${s.tool}\n  输入: ${s.input}\n  输出: ${s.output}`)
    .join('\n')
}

/** 生成唯一消息ID */
export function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}
