/**
 * 真实大模型问答（流式）
 *
 * 语义注册表（semantic-contract 契约包）被编译进 system prompt，
 * 让模型基于「唯一事实源」的指标口径/别名/跨系统引用作答；
 * 请求经 dev 桥接中间件（/llm-api）转发到所配置的 OpenAI 兼容端点。
 */
import { listAllMetrics, listContextsByDepartment } from '@data-community/semantic-contract/query'
import { mockTerms } from '@data-community/semantic-contract/data/knowledge'
import {
  departmentLabelMap,
  statusLabelMap,
  externalAppLabelMap,
  type Department
} from '@data-community/semantic-contract/types'
import type { LLMSettings } from '@/config/llmSettings'

/** dev 桥接路径（相对 base，兼容独立运行与 qiankun 挂载） */
const BRIDGE_URL = `${import.meta.env.BASE_URL.replace(/\/+$/, '')}/llm-api/chat/completions`

interface ChatTurn {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/** 把语义注册表压缩成模型可读的清单 */
function buildRegistryDigest(): string {
  const lines: string[] = []

  lines.push('【指标注册表】（code | 名称 | 状态 | 归属部门 | 别名）')
  for (const m of listAllMetrics()) {
    const dept = departmentLabelMap[m.department as Department] || m.department
    const alias = m.aliases?.length ? m.aliases.join('、') : '无'
    lines.push(`- ${m.code} | ${m.name} | ${statusLabelMap[m.status]} | ${dept} | 别名：${alias}`)
    for (const d of m.definitions || []) {
      lines.push(`    · 口径「${d.caliberName}」= ${d.formula}（来源：${d.sourceSystem}，版本：${d.version}）`)
    }
    for (const r of m.externalRefs || []) {
      const label = externalAppLabelMap[r.app] || r.app
      lines.push(`    · 跨系统引用：${label} 的 ${r.code}（${r.name}）${r.note ? `；${r.note}` : ''}`)
    }
  }

  const contexts = (['risk', 'marketing', 'operations', 'public'] as Department[])
    .flatMap((dep) => listContextsByDepartment(dep).map((c) => `- ${departmentLabelMap[dep]}｜${c.contextName}：${c.description}`))
  if (contexts.length) {
    lines.push('', '【部门业务语境】')
    lines.push(...contexts)
  }

  lines.push('', '【术语表】')
  for (const t of mockTerms) {
    lines.push(`- ${t.termName}（${t.category}）：${t.definition}`)
  }

  return lines.join('\n')
}

export function buildSystemPrompt(): string {
  return [
    '你是「消金语义底座」的指标问答助手，服务于消费金融公司的数据治理团队。',
    '你的知识来源是下方语义注册表（指标、口径、部门语境、术语），它是企业口径的唯一事实源。',
    '回答规则：',
    '1. 只依据注册表内容作答；注册表没有的信息，明确说「语义注册表中未收录」，不要编造口径或数值。',
    '2. 涉及指标时给出 code（如 apply_approval_rate）与标准口径名称，帮助提问者回到注册表核对。',
    '3. 同一指标存在多口径或跨系统引用差异时，逐项说明差异，不强行等价。',
    '4. 本系统为演示环境，没有实时数值；被问到「当前值/数据」时说明数值需从数据工厂等物理层系统查询，并给出应查询的指标口径。',
    '5. 用简体中文回答，简洁、结构化（必要时用列表），不要输出 Markdown 标题。',
    '',
    '===== 语义注册表 =====',
    buildRegistryDigest()
  ].join('\n')
}

/** 非流式调用（用于「测试连接」） */
export async function llmPing(settings: LLMSettings): Promise<string> {
  const res = await fetch(BRIDGE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-LLM-Base-Url': settings.baseUrl,
      Authorization: `Bearer ${settings.apiKey}`
    },
    body: JSON.stringify({
      model: settings.model,
      messages: [{ role: 'user', content: '请只回复：ok' } as ChatTurn],
      max_tokens: 8,
      stream: false
    })
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(data?.error?.message || `HTTP ${res.status}`)
  }
  return data?.choices?.[0]?.message?.content ?? ''
}

export interface StreamAskOptions {
  settings: LLMSettings
  question: string
  /** 既往对话（不含本次问题），按时间正序 */
  history: ChatTurn[]
  /** 每收到增量即回调当前累计全文 */
  onDelta: (accumulated: string) => void
  signal?: AbortSignal
}

/** 流式问答：解析 SSE，逐 token 回调累计内容，返回全文 */
export async function streamAsk(options: StreamAskOptions): Promise<string> {
  const { settings, question, history, onDelta, signal } = options

  const messages: ChatTurn[] = [
    { role: 'system', content: buildSystemPrompt() },
    ...history.slice(-6), // 控制上下文规模
    { role: 'user', content: question }
  ]

  const res = await fetch(BRIDGE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-LLM-Base-Url': settings.baseUrl,
      Authorization: `Bearer ${settings.apiKey}`
    },
    body: JSON.stringify({ model: settings.model, messages, stream: true, temperature: 0.3 }),
    signal
  })

  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.error?.message || `模型服务返回 HTTP ${res.status}`)
  }
  if (!res.body) throw new Error('模型服务未返回可读取的流')

  const reader = res.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  let accumulated = ''
  let finishReason = ''

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    // 按行解析 SSE
    let nl: number
    while ((nl = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, nl).trim()
      buffer = buffer.slice(nl + 1)
      if (!line.startsWith('data:')) continue
      const payload = line.slice(5).trim()
      if (payload === '[DONE]') continue
      try {
        const json = JSON.parse(payload)
        const delta: string = json?.choices?.[0]?.delta?.content ?? ''
        if (json?.choices?.[0]?.finish_reason) finishReason = json.choices[0].finish_reason
        if (delta) {
          accumulated += delta
          onDelta(accumulated)
        }
      } catch {
        /* 忽略不完整/心跳行 */
      }
    }
  }

  if (!accumulated) {
    throw new Error(finishReason ? `模型未返回内容（${finishReason}）` : '模型未返回内容')
  }
  return accumulated
}
