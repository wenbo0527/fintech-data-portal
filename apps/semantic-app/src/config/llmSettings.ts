/**
 * 「模型服务设置」——语义底座内置的大模型接入配置
 *
 * 配置持久化在浏览器 localStorage（仅本机可见，不随代码提交），
 * 调用时由 dev 桥接中间件（src/plugins/llmBridge.ts）转发到所选端点。
 */

export interface LLMSettings {
  /** OpenAI 兼容端点基址，如 https://dashscope.aliyuncs.com/compatible-mode/v1 */
  baseUrl: string
  /** API Key（Bearer） */
  apiKey: string
  /** 模型名，如 qwen-plus */
  model: string
}

export interface LLMPreset {
  key: string
  label: string
  baseUrl: string
  model: string
  hint: string
}

export const llmPresets: LLMPreset[] = [
  {
    key: 'dashscope',
    label: '阿里云百炼（标准端点）',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-plus',
    hint: '控制台「API-KEY 管理」创建的 sk- 开头密钥'
  },
  {
    key: 'token-plan',
    label: '百炼 Token Plan',
    baseUrl: 'https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1',
    model: 'qwen3.8-max',
    hint: '订阅套餐密钥（sk-sp 开头），密钥失效时请重新登录或改用标准端点'
  },
  {
    key: 'custom',
    label: '自定义兼容端点',
    baseUrl: '',
    model: '',
    hint: '任何 OpenAI 兼容 /chat/completions 网关（https）'
  }
]

const STORAGE_KEY = 'semantic-app:llm-settings'

export function loadLLMSettings(): LLMSettings | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<LLMSettings>
    if (!parsed?.baseUrl || !parsed?.apiKey || !parsed?.model) return null
    return { baseUrl: parsed.baseUrl, apiKey: parsed.apiKey, model: parsed.model }
  } catch {
    return null
  }
}

export function saveLLMSettings(settings: LLMSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

export function clearLLMSettings() {
  localStorage.removeItem(STORAGE_KEY)
}

/** 是否已配置（决定问答走大模型还是内置规则引擎） */
export function hasLLMSettings(): boolean {
  return loadLLMSettings() !== null
}
