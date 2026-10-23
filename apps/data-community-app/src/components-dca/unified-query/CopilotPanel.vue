<template>
  <div class="uq-copilot">
    <!-- 上下文摘要 -->
    <div class="uq-copilot__summary">
      <a-space :size="6" wrap>
        <a-tag color="arcoblue" size="small">可查 {{ ctx.summary.tableCount }} 张表</a-tag>
        <a-tag size="small">资产目录 {{ ctx.summary.catalogTableCount }}</a-tag>
        <a-tag size="small">数据源树 {{ ctx.summary.editorTableCount }}</a-tag>
        <a-tag size="small">{{ ctx.summary.fieldCount }} 字段</a-tag>
        <a-tag color="green" size="small">{{ ctx.summary.standardCount }} 数据标准</a-tag>
        <a-tag color="purple" size="small">{{ ctx.summary.codeCount }} 码值</a-tag>
        <a-tag color="gray" size="small">{{ ctx.summary.wordCount }} 业务词</a-tag>
      </a-space>
      <div class="uq-copilot__selected" v-if="selectedTable">
        <span class="uq-copilot__selected-dot" />
        当前表:{{ selectedTable.tableName }} · {{ selectedTable.comment }}
      </div>
    </div>

    <!-- 路由信息条(展示本轮 Copilot 用了哪些知识源) -->
    <div v-if="lastRoute" class="uq-copilot__route">
      <a-space :size="4" wrap>
        <a-tag size="small" color="arcoblue">{{ lastRoute.action }}</a-tag>
        <a-tag v-for="(s, i) in lastRoute.sources" :key="i" size="small">{{ sourceLabel(s) }}</a-tag>
        <a-tag v-for="(w, i) in lastRoute.matchedWords.slice(0, 2)" :key="`w-${i}`" size="small" color="green">命中:{{ w }}</a-tag>
        <a-tag v-if="lastRoute.matchedStandards.length" size="small" color="purple">命中 {{ lastRoute.matchedStandards.length }} 条标准</a-tag>
        <a-tag v-if="lastRoute.tables.length" size="small" color="cyan">知识表 {{ lastRoute.tables.length }}</a-tag>
        <a-tag size="small" color="gray" style="cursor: pointer" @click="promptVisible = !promptVisible">
          {{ promptVisible ? '收起 System Prompt' : '查看 System Prompt' }}
        </a-tag>
      </a-space>
      <!-- 本轮实际下发给模型的 system prompt(接 LLM 时即为真实内容) -->
      <pre v-if="promptVisible && lastRoute.systemPrompt" class="uq-copilot__prompt">{{ lastRoute.systemPrompt }}</pre>
    </div>

    <!-- 输入区 -->
    <div class="uq-copilot__input">
      <a-textarea
        v-model="input"
        placeholder="试试:近 7 天放款额汇总 / 客户身份证命中 / 给当前 SQL 解释一下"
        :auto-size="{ minRows: 2, maxRows: 4 }"
        allow-clear
        @keydown.enter.exact.prevent="runAction('nl2sql')"
      />
      <a-space :size="6" wrap class="uq-copilot__actions">
        <a-button type="primary" size="small" :loading="loadingAction === 'nl2sql'" @click="runAction('nl2sql')">
          <template #icon><icon-code /></template>
          生成 SQL
        </a-button>
        <a-button size="small" :loading="loadingAction === 'explain'" @click="runAction('explain')">
          <template #icon><icon-info-circle /></template>
          解释
        </a-button>
        <a-button size="small" :loading="loadingAction === 'optimize'" @click="runAction('optimize')">
          <template #icon><icon-thunderbolt /></template>
          优化
        </a-button>
        <a-button size="small" :loading="loadingAction === 'audit'" @click="runAction('audit')">
          <template #icon><icon-safe /></template>
          合规
        </a-button>
      </a-space>
    </div>

    <!-- 对话列表 -->
    <div class="uq-copilot__chat" ref="chatRef">
      <template v-if="!messages.length">
        <a-empty description="还没对话 · 输入自然语言或选中 SQL 后点击上方按钮" :image-size="64" />
      </template>
      <div v-for="m in messages" :key="m.id" :class="['uq-msg', `uq-msg--${m.role}`]">
        <div class="uq-msg__head">
          <a-tag v-if="m.action" size="small" :color="actionColor(m.action)">{{ actionLabel(m.action) }}</a-tag>
          <span class="uq-msg__text">{{ m.text }}</span>
          <span class="uq-msg__time">{{ m.ts }}</span>
        </div>

        <!-- 候选 SQL -->
        <div v-if="m.payload?.kind === 'candidates'" class="uq-msg__candidates">
          <a-empty v-if="!m.payload.candidates.length" description="未生成候选" />
          <a-card
            v-for="(c, idx) in m.payload.candidates"
            :key="idx"
            class="uq-candidate"
            size="small"
            :body-style="{ padding: '8px 10px' }"
          >
            <pre class="uq-candidate__sql">{{ c.sql }}</pre>
            <div class="uq-candidate__meta">
              <a-space :size="4" wrap>
                <a-tag v-for="t in c.tables" :key="t" size="small" color="arcoblue">{{ t }}</a-tag>
                <a-tag v-for="f in c.fields" :key="`f-${f}`" size="small">{{ f }}</a-tag>
                <a-tag v-for="s in c.standards" :key="`s-${s}`" size="small" color="green">{{ s }}</a-tag>
              </a-space>
            </div>
            <div v-if="c.warnings.length" class="uq-candidate__warn">
              <a-alert v-for="(w, i) in c.warnings" :key="i" type="warning" :content="w" size="mini" show-icon />
            </div>
            <div class="uq-candidate__op">
              <a-button size="mini" type="primary" @click="onInsert(c.sql)">
                <template #icon><icon-import /></template>
                插入编辑器
              </a-button>
              <a-button size="mini" @click="onReplace(c.sql)">
                <template #icon><icon-swap /></template>
                替换
              </a-button>
            </div>
          </a-card>
        </div>

        <!-- 解释 -->
        <div v-else-if="m.payload?.kind === 'explain'" class="uq-msg__explain">
          <p class="uq-msg__summary">{{ m.payload.summary }}</p>
          <ul class="uq-msg__bullets">
            <li v-for="(b, i) in m.payload.bullets" :key="i">{{ b }}</li>
          </ul>
        </div>

        <!-- 优化 -->
        <div v-else-if="m.payload?.kind === 'optimize'" class="uq-msg__optimize">
          <ul class="uq-msg__bullets">
            <li v-for="(s, i) in m.payload.suggestions" :key="i">{{ s }}</li>
          </ul>
          <pre v-if="m.payload.rewrite" class="uq-candidate__sql">{{ m.payload.rewrite }}</pre>
          <div v-if="m.payload.rewrite" class="uq-candidate__op">
            <a-button size="mini" type="primary" @click="onReplace(m.payload.rewrite!)">
              <template #icon><icon-swap /></template>
              用推荐版本替换
            </a-button>
          </div>
        </div>

        <!-- 合规 -->
        <div v-else-if="m.payload?.kind === 'audit'" class="uq-msg__audit">
          <a-empty v-if="!m.payload.issues.length" description="未发现问题,SQL 合规 ✓" />
          <a-alert
            v-for="(it, i) in m.payload.issues"
            :key="i"
            :type="levelToAlertType(it.level)"
            :title="`${it.field ? it.field + ' · ' : ''}${it.message}`"
            :content="it.suggestion ?? ''"
            size="mini"
            show-icon
            class="uq-issue"
          />
        </div>
      </div>
    </div>

    <!-- 实时合规提示条 -->
    <div class="uq-copilot__audit" v-if="liveIssues.length">
      <a-divider margin="6px">实时合规</a-divider>
      <a-space :size="4" wrap>
        <a-tag v-for="(i, idx) in liveIssues.slice(0, 6)" :key="idx" :color="levelColor(i.level)" size="small">
          {{ i.field ? i.field + ' · ' : '' }}{{ i.message }}
        </a-tag>
        <a-tag v-if="liveIssues.length > 6" size="small">等 {{ liveIssues.length }} 项</a-tag>
      </a-space>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 右侧 Copilot 面板(P1)
 *
 * 接收 CopilotMetaContext,提供四个动作(nl2sql/explain/optimize/audit),
 * 与左侧 SqlEditor 通过 props + emit 联动(插入/替换 SQL、显示实时合规提示)。
 */
import { computed, nextTick, ref } from 'vue'
import { Message } from '@arco-design/web-vue'
import type { CopilotMetaContext } from '@/mock/unified-query/metadata-context'
import type { CopilotIssue, CopilotMessage, IssueLevel } from '@/mock/unified-query/types'
import {
  auditSql,
  explainSql,
  getLastRoutes,
  newCopilotMessageId,
  nl2sql,
  optimizeSql,
  type RouteSnapshot
} from '@/mock/unified-query/copilot'

const props = defineProps<{
  context: CopilotMetaContext
  selectedTable?: { tableName: string; comment: string } | null
  /** 实时合规 Issue(SqlEditor 推送) */
  liveIssues?: CopilotIssue[]
  /** 编辑器当前 SQL(父组件响应式传入,explain/optimize/audit 直接消费) */
  currentSql?: string
  /** 注入到编辑器的 SQL(父组件提供通道) */
  insertFn?: (sql: string) => void
  replaceFn?: (sql: string) => void
}>()

const ctx = computed(() => props.context)
const selectedTable = computed(() => props.selectedTable ?? null)
const liveIssues = computed(() => props.liveIssues ?? [])
/** 编辑器当前 SQL(响应式来源,替代旧的 window 全局变量) */
const currentSql = computed(() => props.currentSql ?? '')

const input = ref('')
const messages = ref<CopilotMessage[]>([])
const loadingAction = ref<'nl2sql' | 'explain' | 'optimize' | 'audit' | null>(null)
const chatRef = ref<HTMLElement | null>(null)

/** 最近一次路由决策(展示「本轮用了哪些知识源」) */
const lastRoute = ref<RouteSnapshot | null>(null)
/** 是否展开本轮 system prompt */
const promptVisible = ref(false)

const SOURCE_LABEL: Record<string, string> = {
  table: '表',
  field: '字段',
  standard: '标准',
  domain: '域',
  code: '码值',
  word: '业务词',
  'business-caliber': '业务口径'
}
function sourceLabel(s: string) {
  return SOURCE_LABEL[s] ?? s
}

function nowStr() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function actionLabel(a: 'nl2sql' | 'explain' | 'optimize' | 'audit') {
  return { nl2sql: '生成 SQL', explain: '解释', optimize: '优化', audit: '合规' }[a]
}
function actionColor(a: 'nl2sql' | 'explain' | 'optimize' | 'audit') {
  return { nl2sql: 'arcoblue', explain: 'gray', optimize: 'orange', audit: 'green' }[a]
}
function levelToAlertType(l: IssueLevel) {
  return ({ info: 'info', warn: 'warning', error: 'error' } as const)[l]
}
function levelColor(l: IssueLevel) {
  return ({ info: 'gray', warn: 'orange', error: 'red' } as const)[l]
}

/**
 * 执行一次 Copilot 动作。
 *
 * explain/optimize/audit 直接消费父组件传入的当前 SQL(响应式),
 * 不再依赖 window 全局变量。
 *
 * @param action 动作类型
 */
async function runAction(action: 'nl2sql' | 'explain' | 'optimize' | 'audit') {
  if (loadingAction.value) return
  const prompt = input.value.trim()
  loadingAction.value = action
  try {
    if (action === 'nl2sql') {
      if (!prompt) return Message.warning('请先输入自然语言描述')
      const userMsg: CopilotMessage = {
        id: newCopilotMessageId(),
        role: 'user',
        text: prompt,
        ts: nowStr()
      }
      messages.value.push(userMsg)
      const { candidates } = await nl2sql(prompt, ctx.value, {
        hintTable: selectedTable.value?.tableName
      })
      messages.value.push({
        id: newCopilotMessageId(),
        role: 'assistant',
        action: 'nl2sql',
        text: candidates.length ? `已生成 ${candidates.length} 个候选` : '未识别到已上线表',
        payload: { kind: 'candidates', candidates },
        ts: nowStr()
      })
      input.value = ''
    } else if (action === 'explain') {
      const sqlText = currentSql.value
      if (!sqlText.trim()) return Message.warning('当前编辑器没有 SQL,无法解释')
      const userMsg: CopilotMessage = { id: newCopilotMessageId(), role: 'user', text: '解释当前 SQL', ts: nowStr() }
      messages.value.push(userMsg)
      const result = await explainSql(sqlText, ctx.value)
      messages.value.push({
        id: newCopilotMessageId(),
        role: 'assistant',
        action: 'explain',
        text: result.summary,
        payload: { kind: 'explain', ...result },
        ts: nowStr()
      })
    } else if (action === 'optimize') {
      const sqlText = currentSql.value
      if (!sqlText.trim()) return Message.warning('当前编辑器没有 SQL,无法优化')
      const userMsg: CopilotMessage = { id: newCopilotMessageId(), role: 'user', text: '优化当前 SQL', ts: nowStr() }
      messages.value.push(userMsg)
      const result = await optimizeSql(sqlText, ctx.value)
      messages.value.push({
        id: newCopilotMessageId(),
        role: 'assistant',
        action: 'optimize',
        text: result.suggestions[0] ?? '已生成建议',
        payload: { kind: 'optimize', ...result },
        ts: nowStr()
      })
    } else if (action === 'audit') {
      const sqlText = currentSql.value
      if (!sqlText.trim()) return Message.warning('当前编辑器没有 SQL,无法检查')
      const userMsg: CopilotMessage = { id: newCopilotMessageId(), role: 'user', text: '合规检查', ts: nowStr() }
      messages.value.push(userMsg)
      const issues = await auditSql(sqlText, ctx.value)
      messages.value.push({
        id: newCopilotMessageId(),
        role: 'assistant',
        action: 'audit',
        text: issues.length ? `发现 ${issues.length} 项提示` : '全部合规',
        payload: { kind: 'audit', issues },
        ts: nowStr()
      })
    }
    await nextTick()
    chatRef.value?.scrollTo({ top: chatRef.value.scrollHeight, behavior: 'smooth' })
    // 记录本轮路由(从 copilot.ts 拉回)
    const routes = getLastRoutes()
    if (routes.length) lastRoute.value = routes[routes.length - 1]
  } finally {
    loadingAction.value = null
  }
}

function onInsert(sql: string) {
  if (!props.insertFn) return Message.warning('编辑器引用未就绪')
  props.insertFn(sql)
  Message.success('已插入到光标位置')
}
function onReplace(sql: string) {
  if (!props.replaceFn) return Message.warning('编辑器引用未就绪')
  props.replaceFn(sql)
  Message.success('已替换为推荐版本')
}
</script>

<style lang="scss" scoped>
.uq-copilot {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-bg-2);
  border-radius: 6px;
  border: 1px solid var(--color-border-2);
  overflow: hidden;
}

.uq-copilot__summary {
  padding: 10px 12px;
  border-bottom: 1px solid var(--color-border-2);
  background: var(--color-fill-1);
}

.uq-copilot__selected {
  margin-top: 6px;
  font-size: 12px;
  color: var(--color-text-3);
  display: flex;
  align-items: center;
  gap: 4px;
}

.uq-copilot__selected-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgb(var(--success-6));
}

.uq-copilot__input {
  padding: 10px 12px;
  border-bottom: 1px solid var(--color-border-2);
}

.uq-copilot__route {
  padding: 6px 12px;
  background: var(--color-fill-1);
  border-bottom: 1px solid var(--color-border-2);
  font-size: 12px;
  color: var(--color-text-3);
}

.uq-copilot__prompt {
  margin: 6px 0 0;
  padding: 6px 8px;
  max-height: 180px;
  overflow: auto;
  background: var(--color-bg-2);
  border: 1px solid var(--color-border-2);
  border-radius: 4px;
  font-family: 'SFMono-Regular', Menlo, Consolas, monospace;
  font-size: 11px;
  line-height: 1.5;
  color: var(--color-text-2);
  white-space: pre-wrap;
  word-break: break-all;
}

.uq-copilot__actions {
  margin-top: 8px;
}

.uq-copilot__chat {
  flex: 1;
  overflow: auto;
  padding: 8px 12px;
  background: var(--color-bg-2);
}

.uq-msg {
  margin-bottom: 12px;
}

.uq-msg__head {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.uq-msg__text {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-1);
}

.uq-msg__time {
  margin-left: auto;
  font-size: 11px;
  color: var(--color-text-3);
}

.uq-msg__candidates {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.uq-candidate {
  border: 1px solid var(--color-border-2);
}

.uq-candidate__sql {
  font-family: 'SFMono-Regular', Menlo, Consolas, monospace;
  font-size: 12px;
  line-height: 1.5;
  background: var(--color-fill-1);
  padding: 8px;
  border-radius: 4px;
  margin: 0 0 6px;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 160px;
  overflow: auto;
}

.uq-candidate__meta {
  margin-bottom: 6px;
}

.uq-candidate__warn {
  margin-bottom: 6px;
}

.uq-candidate__op {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
}

.uq-msg__summary {
  font-size: 13px;
  color: var(--color-text-2);
  margin: 0 0 6px;
}

.uq-msg__bullets {
  margin: 0;
  padding-left: 18px;
  font-size: 12px;
  color: var(--color-text-2);
  line-height: 1.7;
}

.uq-msg__audit {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.uq-issue {
  margin: 0;
}

.uq-copilot__audit {
  border-top: 1px solid var(--color-border-2);
  padding: 6px 12px;
  background: var(--color-fill-1);
  max-height: 110px;
  overflow: auto;
}
</style>