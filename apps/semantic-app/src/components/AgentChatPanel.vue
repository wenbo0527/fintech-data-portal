<template>
  <div class="chat-panel">
    <!-- 左侧栏 -->
    <div class="chat-sidebar">
      <div class="sidebar-section">
        <div class="sidebar-title">快捷问题</div>
        <div class="quick-questions">
          <a-button
            v-for="q in agentStore.quickQuestions"
            :key="q"
            size="small"
            long
            class="quick-question-btn"
            @click="handleSendQuestion(q)"
          >
            {{ q }}
          </a-button>
        </div>
      </div>

      <div class="sidebar-section">
        <div class="sidebar-title">已定义指标</div>
        <div class="metric-list">
          <div
            v-for="m in metricStore.list"
            :key="m.id"
            class="metric-list-item"
            @click="handleSendQuestion(`${m.name}是什么？`)"
          >
            <div class="metric-list-name">{{ m.name }}</div>
            <div class="metric-list-code">{{ m.code }} · {{ m.definitionCount }}口径</div>
          </div>
          <a-empty v-if="metricStore.list.length === 0" description="暂无指标" />
        </div>
      </div>

      <div class="sidebar-section">
        <div class="sidebar-title">模型服务</div>
        <a-tag size="small" :color="llmConfigured ? 'purple' : 'gray'">
          {{ llmConfigured ? '大模型已接入' : '内置规则引擎' }}
        </a-tag>
        <div class="llm-sub">{{ llmConfigured ? llmSummary : '未配置时回答来自本地规则引擎' }}</div>
        <a-button
          size="small"
          long
          class="llm-config-btn"
          @click="openSettings"
        >
          <template #icon><icon-settings /></template>
          {{ llmConfigured ? '修改配置' : '接入大模型' }}
        </a-button>
      </div>
    </div>

    <!-- 右侧主区域 -->
    <div class="chat-main">
      <!-- 消息区域 -->
      <div class="message-area">
        <div v-if="agentStore.messages.length === 0 && !agentStore.loading" class="welcome-hint">
          <icon-chat class="welcome-icon" />
          <p>欢迎使用消金语义底座 Agent</p>
          <span>从左侧选择快捷问题或直接输入问题开始对话</span>
        </div>

        <TrBubbleList
          v-else
          :messages="bubbleMessages"
          :role-configs="roleConfigs"
          auto-scroll
        >
          <template #content-footer="{ messages, role }">
            <template v-if="role === 'agent'">
              <div
                v-for="bm in messages"
                :key="bm.id"
                class="agent-cards"
              >
                <!-- 回答来源标注 -->
                <div v-if="rawOf(bm)?.source" class="source-line">
                  <a-tag size="small" :color="rawOf(bm)?.source === 'llm' ? 'purple' : 'gray'">
                    {{ rawOf(bm)?.source === 'llm'
                      ? `大模型生成 · ${rawOf(bm)?.model}`
                      : '内置规则引擎' }}
                  </a-tag>
                </div>

                <template v-if="rawOf(bm)?.response">
                  <!-- 推理步骤 -->
                  <div
                    v-if="rawOf(bm)?.response?.reasoningSteps?.length"
                    class="reasoning-panel"
                  >
                    <div class="panel-title">
                      <icon-bulb /> 推理过程
                    </div>
                    <div
                      v-for="step in rawOf(bm)?.response?.reasoningSteps"
                      :key="step.step"
                      class="reasoning-step"
                    >
                      <div class="reasoning-step__index">{{ step.step }}</div>
                      <div class="reasoning-step__content">
                        <div class="tool-name">{{ step.tool }}</div>
                        <div class="tool-input">输入: {{ step.input }}</div>
                        <div class="tool-output">输出: {{ step.output }}</div>
                      </div>
                    </div>
                  </div>

                  <!-- 查询结果卡片 -->
                  <div
                    v-if="rawOf(bm)?.response?.queryResult"
                    class="query-result-card"
                  >
                    <div class="panel-title">
                      <icon-bookmark /> 查询结果
                    </div>
                    <div class="result-grid">
                      <div class="result-item">
                        <span class="result-label">指标</span>
                        <span class="result-value">{{ rawOf(bm)?.response?.queryResult?.metric }}</span>
                      </div>
                      <div class="result-item">
                        <span class="result-label">数值</span>
                        <span class="result-value result-value--highlight">
                          {{ rawOf(bm)?.response?.queryResult?.valueDisplay }}
                        </span>
                      </div>
                      <div class="result-item">
                        <span class="result-label">口径</span>
                        <span class="result-value">{{ rawOf(bm)?.response?.queryResult?.caliber }}</span>
                      </div>
                      <div class="result-item">
                        <span class="result-label">数据来源</span>
                        <span class="result-value">{{ rawOf(bm)?.response?.queryResult?.sourceSystem }}</span>
                      </div>
                      <div class="result-item">
                        <span class="result-label">维护团队</span>
                        <span class="result-value">{{ rawOf(bm)?.response?.queryResult?.maintainedBy }}</span>
                      </div>
                      <div class="result-item">
                        <span class="result-label">版本</span>
                        <span class="result-value">{{ rawOf(bm)?.response?.queryResult?.version }}</span>
                      </div>
                    </div>
                    <!-- 明细数据 -->
                    <div
                      v-if="rawOf(bm)?.response?.queryResult?.totalLoans != null"
                      class="result-detail"
                    >
                      总贷款 {{ rawOf(bm)?.response?.queryResult?.totalLoans }} 笔，逾期 {{ rawOf(bm)?.response?.queryResult?.overdueCount }} 笔
                    </div>
                    <!-- 预警判断 -->
                    <div
                      class="alert-bar"
                      :class="rawOf(bm)?.response?.queryResult?.alertTriggered ? 'alert-bar--danger' : 'alert-bar--safe'"
                    >
                      <component :is="rawOf(bm)?.response?.queryResult?.alertTriggered ? 'icon-alert' : 'icon-check-circle'" />
                      {{ rawOf(bm)?.response?.queryResult?.alertTriggered
                        ? `已触发预警：${rawOf(bm)?.response?.queryResult?.valueDisplay} > 阈值 ${rawOf(bm)?.response?.queryResult?.alertThreshold}%`
                        : `未触发预警：${rawOf(bm)?.response?.queryResult?.valueDisplay} <= 阈值 ${rawOf(bm)?.response?.queryResult?.alertThreshold}%`
                      }}
                    </div>
                  </div>

                  <!-- 多口径对比 -->
                  <div
                    v-if="rawOf(bm)?.response?.comparisons?.length"
                    class="comparison-panel"
                  >
                    <div class="panel-title">
                      <icon-swap /> 口径对比
                    </div>
                    <div class="comparison-cards">
                      <div
                        v-for="(cmp, idx) in rawOf(bm)?.response?.comparisons"
                        :key="idx"
                        class="comparison-card"
                      >
                        <div class="cmp-caliber">{{ cmp.caliberName }}</div>
                        <div class="cmp-value">{{ cmp.valueDisplay }}</div>
                        <div class="cmp-source">{{ cmp.sourceSystem }}</div>
                      </div>
                    </div>
                  </div>

                  <!-- 错误提示 -->
                  <div
                    v-if="rawOf(bm)?.response?.error"
                    class="error-banner"
                  >
                    <icon-close-circle-fill class="error-icon" />
                    {{ rawOf(bm)?.response?.error }}
                  </div>
                </template>
              </div>
            </template>
          </template>
        </TrBubbleList>
      </div>

      <!-- 底部输入框 -->
      <div class="input-area">
        <TrSender
          v-model="inputText"
          mode="multiple"
          :auto-size="{ minRows: 1, maxRows: 4 }"
          :disabled="agentStore.loading"
          placeholder="输入问题，Enter 发送，Shift+Enter 换行..."
          @submit="handleSubmit"
        />
      </div>
    </div>

    <!-- 模型服务设置 -->
    <a-modal
      v-model:visible="settingsVisible"
      title="模型服务设置"
      :width="520"
      :esc-to-close="true"
      :mask-closable="false"
    >
      <a-form :model="settingsForm" layout="vertical">
        <a-form-item label="服务预设">
          <a-select v-model="settingsForm.presetKey" @change="onPresetChange">
            <a-option v-for="p in llmPresets" :key="p.key" :value="p.key">{{ p.label }}</a-option>
          </a-select>
          <div class="form-hint">{{ currentPreset?.hint }}</div>
        </a-form-item>
        <a-form-item label="Base URL（OpenAI 兼容端点）" required>
          <a-input
            v-model="settingsForm.baseUrl"
            :disabled="settingsForm.presetKey !== 'custom'"
            placeholder="https://dashscope.aliyuncs.com/compatible-mode/v1"
          />
        </a-form-item>
        <a-form-item label="API Key" required>
          <a-input-password v-model="settingsForm.apiKey" placeholder="sk-..." :default-visible="false" />
          <div class="form-hint">
            密钥仅保存在本机浏览器 localStorage，调用时经 dev 服务器转发注入，不会进入前端构建产物。
          </div>
        </a-form-item>
        <a-form-item label="模型名" required>
          <a-input v-model="settingsForm.model" placeholder="qwen-plus" />
        </a-form-item>
      </a-form>
      <template #footer>
        <a-space>
          <a-button @click="settingsVisible = false">取消</a-button>
          <a-button v-if="llmConfigured" status="danger" @click="handleClearSettings">清除配置</a-button>
          <a-button :loading="testingConnection" @click="handleTestConnection">测试连接</a-button>
          <a-button type="primary" @click="handleSaveSettings">保存</a-button>
        </a-space>
      </template>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, onMounted } from 'vue'
import { Message } from '@arco-design/web-vue'
import { TrBubbleList, TrSender } from '@opentiny/tiny-robot'
import type { BubbleMessage, BubbleRoleConfig } from '@opentiny/tiny-robot'
import { useAgentStore } from '@/stores/agent'
import { useMetricStore } from '@/stores/metric'
import type { ChatMessage } from '@/types/agent'
import { llmPresets, loadLLMSettings, saveLLMSettings, clearLLMSettings } from '@/config/llmSettings'
import { llmPing } from '@/api/llmAgent'

const agentStore = useAgentStore()
const metricStore = useMetricStore()

const inputText = ref('')

/* ---- 模型服务设置 ---- */
const llmConfigured = ref(!!loadLLMSettings())
const llmSummary = computed(() => {
  const s = loadLLMSettings()
  if (!s) return ''
  let host = s.baseUrl
  try { host = new URL(s.baseUrl).host } catch { /* 保留原样 */ }
  return `${s.model} · ${host}`
})

const settingsVisible = ref(false)
const testingConnection = ref(false)
const settingsForm = reactive({
  presetKey: 'dashscope',
  baseUrl: llmPresets[0].baseUrl,
  apiKey: '',
  model: llmPresets[0].model
})

const currentPreset = computed(() => llmPresets.find((p) => p.key === settingsForm.presetKey))

function openSettings() {
  const saved = loadLLMSettings()
  if (saved) {
    const matched = llmPresets.find((p) => p.baseUrl && p.baseUrl === saved.baseUrl)
    settingsForm.presetKey = matched?.key || 'custom'
    settingsForm.baseUrl = saved.baseUrl
    settingsForm.model = saved.model
    settingsForm.apiKey = saved.apiKey
  } else {
    settingsForm.presetKey = 'dashscope'
    settingsForm.baseUrl = llmPresets[0].baseUrl
    settingsForm.model = llmPresets[0].model
    settingsForm.apiKey = ''
  }
  settingsVisible.value = true
}

function onPresetChange(key: unknown) {
  const preset = llmPresets.find((p) => p.key === key)
  if (!preset || preset.key === 'custom') return
  settingsForm.baseUrl = preset.baseUrl
  if (preset.model) settingsForm.model = preset.model
}

function collectForm(): { baseUrl: string; apiKey: string; model: string } | null {
  const baseUrl = settingsForm.baseUrl.trim()
  const apiKey = settingsForm.apiKey.trim()
  const model = settingsForm.model.trim()
  if (!baseUrl || !apiKey || !model) {
    Message.warning('请填写 Base URL、API Key 与模型名')
    return null
  }
  if (!/^https:\/\//.test(baseUrl)) {
    Message.warning('Base URL 必须为 https 端点')
    return null
  }
  return { baseUrl, apiKey, model }
}

function handleSaveSettings() {
  const settings = collectForm()
  if (!settings) return
  saveLLMSettings(settings)
  llmConfigured.value = true
  settingsVisible.value = false
  Message.success('已保存，后续问答将由大模型生成')
}

async function handleTestConnection() {
  const settings = collectForm()
  if (!settings) return
  testingConnection.value = true
  try {
    const reply = await llmPing(settings)
    Message.success(`连接成功：${reply || '（空回复）'}`)
  } catch (e) {
    Message.error(`连接失败：${(e as Error).message}`)
  } finally {
    testingConnection.value = false
  }
}

function handleClearSettings() {
  clearLLMSettings()
  llmConfigured.value = false
  settingsVisible.value = false
  Message.info('已清除配置，问答回退内置规则引擎')
}

/** 原始消息随 state 透传，供气泡插槽渲染业务卡片 */
function rawOf(bm: BubbleMessage): ChatMessage | undefined {
  return (bm.state as { raw?: ChatMessage } | undefined)?.raw
}

const bubbleMessages = computed<BubbleMessage[]>(() => {
  const hasStreaming = agentStore.messages.some((m) => m.streaming)
  const list: BubbleMessage[] = agentStore.messages.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    // 流式消息尚无首 token 时，以加载态气泡占位
    loading: !!m.streaming && !m.content,
    state: { raw: m }
  }))
  if (agentStore.loading && !hasStreaming) {
    list.push({ id: '__loading__', role: 'agent', content: '', loading: true })
  }
  return list
})

const roleConfigs: Record<string, BubbleRoleConfig> = {
  user: { placement: 'end', shape: 'corner' },
  agent: { placement: 'start', shape: 'corner' }
}

onMounted(() => {
  metricStore.fetchList()
})

async function handleSubmit(text: string) {
  const q = (text || '').trim()
  if (!q || agentStore.loading) return
  inputText.value = ''
  await agentStore.sendQuestion(q)
}

async function handleSendQuestion(question: string) {
  if (agentStore.loading) return
  await agentStore.sendQuestion(question)
}
</script>

<style scoped lang="scss">
.chat-panel {
  display: flex;
  height: 100%;
  gap: 0;

  /* ---- TinyRobot 主题变量（对齐亮色 token） ---- */
  --tr-bubble-box-bg: #ffffff;
  --tr-bubble-box-border: 1px solid var(--color-border, #e5e6eb);
  --tr-bubble-box-padding: 10px 14px;
  --tr-bubble-text-color: var(--color-text, #1d2129);
  --tr-bubble-list-gap: 16px;
  --tr-bubble-max-width: 75%;
  --tr-bubble-loading-color: var(--color-accent, #165dff);

  --tr-sender-bg-color: #ffffff;
  --tr-sender-border-radius: 12px;
  --tr-sender-box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
  --tr-sender-text-color: var(--color-text, #1d2129);
  --tr-sender-placeholder-color: var(--color-text-tertiary, #86909c);
}

/* user 气泡反色（蓝底白字），placement 以 data-placement 属性渲染 */
.chat-panel :deep(.tr-bubble[data-placement="end"]) {
  --tr-bubble-box-bg: var(--color-primary, #165dff);
  --tr-bubble-box-border: none;
  --tr-bubble-text-color: #ffffff;
}

/* ---- 左侧栏 ---- */
.chat-sidebar {
  width: 240px;
  flex-shrink: 0;
  background: var(--color-bg-light);
  border-right: 1px solid var(--color-border);
  padding: 16px 12px;
  overflow-y: auto;

  .sidebar-section {
    margin-bottom: 24px;

    .sidebar-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--color-text-secondary);
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
  }

  .quick-questions {
    display: flex;
    flex-direction: column;
    gap: 6px;

    .quick-question-btn {
      justify-content: flex-start;
      text-align: left;
      background: #f7f8fa;
      border: 1px solid var(--color-border);
      color: var(--color-text);

      &:hover {
        border-color: var(--color-accent);
        color: var(--color-accent);
        background: #e8f3ff;
      }
    }
  }

  .metric-list-item {
    padding: 8px 10px;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.2s;
    margin-bottom: 4px;

    &:hover {
      background: var(--color-bg);
    }

    .metric-list-name {
      font-size: 14px;
      color: var(--color-text);
    }

    .metric-list-code {
      font-size: 12px;
      color: var(--color-text-secondary);
      margin-top: 2px;
    }
  }

  .llm-sub {
    margin: 6px 0 8px;
    font-size: 12px;
    color: var(--color-text-secondary);
    word-break: break-all;
  }

  .llm-config-btn {
    margin-top: 2px;
  }
}

/* ---- 右侧主区域 ---- */
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.message-area {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
}

.welcome-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--color-text-secondary);

  .welcome-icon {
    font-size: 48px;
    color: var(--color-accent);
    margin-bottom: 16px;
  }

  p {
    font-size: 18px;
    font-weight: 600;
    color: var(--color-text);
    margin: 0 0 8px;
  }

  span {
    font-size: 14px;
  }
}

/* 业务卡片容器（气泡下方） */
.agent-cards {
  max-width: 75%;
  margin-top: 8px;
}

/* ---- 推理步骤面板 ---- */
.reasoning-panel,
.query-result-card,
.comparison-panel {
  margin-top: 12px;
  background: #f7f8fa;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 12px;

  .panel-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--color-accent);
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
}

/* ---- 查询结果卡片 ---- */
.result-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 16px;

  .result-item {
    display: flex;
    flex-direction: column;
    gap: 2px;

    .result-label {
      font-size: 12px;
      color: var(--color-text-secondary);
    }

    .result-value {
      font-size: 14px;
      color: var(--color-text);

      &--highlight {
        font-size: 18px;
        font-weight: 700;
        color: var(--color-warning);
      }
    }
  }
}

.result-detail {
  margin-top: 8px;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.alert-bar {
  margin-top: 8px;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 6px;

  &--danger {
    background: #ffece8;
    color: var(--color-danger);
    border: 1px solid rgba(245, 63, 63, 0.3);
  }

  &--safe {
    background: #e8ffea;
    color: var(--color-success);
    border: 1px solid rgba(0, 180, 42, 0.3);
  }
}

/* ---- 对比面板 ---- */
.comparison-cards {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;

  .comparison-card {
    flex: 1;
    min-width: 120px;
    text-align: center;
    padding: 10px;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    background: #fff;

    .cmp-caliber {
      font-size: 13px;
      color: var(--color-text-secondary);
      margin-bottom: 4px;
    }

    .cmp-value {
      font-size: 20px;
      font-weight: 700;
      color: var(--color-accent);
    }

    .cmp-source {
      font-size: 12px;
      color: var(--color-text-secondary);
      margin-top: 4px;
    }
  }
}

/* ---- 错误提示 ---- */
.error-banner {
  margin-top: 10px;
  padding: 8px 12px;
  background: rgba(231, 76, 60, 0.12);
  border: 1px solid rgba(231, 76, 60, 0.3);
  border-radius: 6px;
  color: var(--color-danger);
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 6px;

  .error-icon {
    font-size: 16px;
    flex-shrink: 0;
  }
}

/* ---- 来源标注 ---- */
.source-line {
  margin-top: 6px;
}

/* ---- 设置表单提示 ---- */
.form-hint {
  margin-top: 4px;
  font-size: 12px;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

/* ---- 底部输入区 ---- */
.input-area {
  flex-shrink: 0;
  padding: 12px 24px 16px;
  border-top: 1px solid var(--color-border);
}
</style>
