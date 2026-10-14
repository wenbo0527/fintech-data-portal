import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ChatMessage, AgentResponse } from '@/types/agent'
import { queryAgent, getQuickQuestions } from '@/api/agent'
import { streamAsk } from '@/api/llmAgent'
import { loadLLMSettings } from '@/config/llmSettings'
import { generateMessageId } from '@/utils/agentTrace'

export const useAgentStore = defineStore('agent', () => {
  const messages = ref<ChatMessage[]>([])
  const loading = ref(false)
  const quickQuestions = ref<string[]>(getQuickQuestions())
  let seq = 0

  /** 流式消息以「索引 + 本地 id」双重校验定位，避免旧对象误改新会话消息 */
  function patchMessage(index: number, id: string, patch: Partial<ChatMessage>) {
    const target = messages.value[index]
    if (target && target.id === id) Object.assign(target, patch)
  }

  function nextId(): string {
    return `${generateMessageId()}-${++seq}`
  }

  /** 发送用户消息并获取Agent响应（优先真实大模型流式，失败/未配置回退规则引擎） */
  async function sendQuestion(question: string) {
    messages.value.push({
      id: nextId(),
      role: 'user',
      content: question,
      timestamp: Date.now()
    })
    loading.value = true

    const settings = loadLLMSettings()
    if (settings) {
      // 大模型通道：先推一条流式 agent 消息，逐 token 回填
      const msgId = nextId()
      const msgIndex = messages.value.length
      messages.value.push({
        id: msgId,
        role: 'agent',
        content: '',
        timestamp: Date.now(),
        source: 'llm',
        model: settings.model,
        streaming: true
      })

      // 取本轮之前的对话作为多轮上下文
      const history = messages.value
        .slice(0, msgIndex)
        .filter((m) => m.content)
        .map((m) => ({
          role: m.role === 'agent' ? ('assistant' as const) : ('user' as const),
          content: m.content
        }))

      const controller = new AbortController()
      try {
        const full = await streamAsk({
          settings,
          question,
          history,
          signal: controller.signal,
          onDelta: (accumulated) => patchMessage(msgIndex, msgId, { content: accumulated })
        })
        patchMessage(msgIndex, msgId, { content: full, streaming: false })
        loading.value = false
        return
      } catch (e) {
        // 流式失败：移除占位气泡，携带错误说明回退规则引擎
        if (messages.value[msgIndex]?.id === msgId) {
          messages.value.splice(msgIndex, 1)
        }
        const llmError = (e as Error)?.name === 'AbortError'
          ? '回答已停止生成'
          : `大模型调用失败（${(e as Error).message || '未知错误'}）`
        await replyWithRules(question, llmError)
        loading.value = false
        return
      }
    }

    // 未配置模型服务：直接走内置规则引擎
    await replyWithRules(question)
    loading.value = false
  }

  /** 内置规则引擎兜底回答 */
  async function replyWithRules(question: string, fallbackNote?: string) {
    const base: AgentResponse = await queryAgent(question)
    const response: AgentResponse = fallbackNote
      ? { ...base, error: [fallbackNote, base.error].filter(Boolean).join('；') }
      : base
    messages.value.push({
      id: nextId(),
      role: 'agent',
      content: response.answer,
      timestamp: Date.now(),
      response,
      source: 'rules'
    })
  }

  /** 清空对话 */
  function clearMessages() {
    messages.value = []
  }

  return { messages, loading, quickQuestions, sendQuestion, clearMessages }
})
