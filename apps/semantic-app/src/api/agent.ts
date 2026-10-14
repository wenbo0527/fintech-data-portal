import { mockAgentQuery, quickQuestions } from '@/mock/agent'
import { mockDelay } from '@/utils/mockDelay'
import type { AgentResponse } from '@/types/agent'

export function queryAgent(question: string): Promise<AgentResponse> {
  return mockDelay(mockAgentQuery(question), 300) // Agent查询稍慢，模拟思考
}

export function getQuickQuestions(): string[] {
  return quickQuestions
}
