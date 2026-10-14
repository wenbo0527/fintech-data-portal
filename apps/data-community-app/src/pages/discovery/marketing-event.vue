<template>
  <div class="marketing-event-page">
    <PageBanner
      v-model:search="search"
      title="营销事件"
      subtitle="营销实时事件统一注册与订阅管理 · 基于 Kafka 事件流，支撑触达策略与行为分析"
      search-placeholder="输入事件名称、编码或 Kafka 主题搜索"
    >
      <template #filters>
        <a-tag class="model-tag" color="purple">要素模型 v2</a-tag>
        <a-radio-group v-model="category" type="button" size="large">
          <a-radio value="">全部</a-radio>
          <a-radio v-for="c in categoryOptions" :key="c.value" :value="c.value">{{ c.label }}</a-radio>
        </a-radio-group>
      </template>
      <template #actions>
        <a-button type="primary" class="action-btn" size="large" @click="openRegister">
          <template #icon><icon-plus /></template>
          注册事件
        </a-button>
        <a-button class="action-btn" size="large" @click="showMissingTicket({ assetType: 'event', pageSource: '营销事件' })">
          <template #icon><icon-plus /></template>
          缺失工单
        </a-button>
      </template>
    </PageBanner>

    <div class="main-content">
      <!-- 统计条 -->
      <a-row :gutter="[16, 16]" class="stat-row">
        <a-col v-for="s in stats" :key="s.key" :xs="12" :sm="12" :md="6">
          <div class="stat-card">
            <div class="stat-value" :style="{ color: s.color }">{{ s.value }}</div>
            <div class="stat-label">{{ s.label }}</div>
            <div class="stat-hint">{{ s.hint }}</div>
          </div>
        </a-col>
      </a-row>

      <!-- 事件卡片网格 -->
      <div class="content-section">
        <a-row v-if="filteredList.length" :gutter="[16, 16]">
          <a-col v-for="e in filteredList" :key="e.id" :xs="24" :sm="12" :md="8" :lg="6">
            <a-card hoverable :bordered="false" class="event-card">
              <template #title>
                <a-space :size="8">
                  <a-tag :color="categoryMeta(e.category).color">{{ categoryMeta(e.category).label }}</a-tag>
                  <span class="event-name">{{ e.name }}</span>
                </a-space>
              </template>

              <div class="event-code mono">{{ e.code }}</div>
              <div class="event-desc">{{ e.description }}</div>
              <div class="event-topic mono" :title="e.topic">{{ e.topic }}</div>

              <a-descriptions :column="1" size="small" class="event-desc-list">
                <a-descriptions-item label="状态">
                  <a-tag :color="statusMeta(e.status).color">{{ statusMeta(e.status).label }}</a-tag>
                </a-descriptions-item>
                <a-descriptions-item label="日均事件量">{{ volumeLabel(e.dailyVolume) }}</a-descriptions-item>
                <a-descriptions-item label="订阅方">{{ e.subscribers }} 个消费方</a-descriptions-item>
                <a-descriptions-item label="负责人">{{ e.owner }}</a-descriptions-item>
                <a-descriptions-item label="更新时间">{{ e.updatedAt }}</a-descriptions-item>
                <a-descriptions-item label="事件流底表">
                  <a-space :size="6">
                    <a-tag size="small" color="purple">Kafka</a-tag>
                    <a class="base-table-link" :title="baseTableTitle(e.baseTable)" @click="goBaseTable(e.baseTable)">{{ e.baseTable }}</a>
                    <a-tooltip v-if="!isTableOnline(e.baseTable)" content="该底表在未上线池，新注册事件不可再绑定此主题">
                      <a-tag size="small" color="orange">底表未上线</a-tag>
                    </a-tooltip>
                  </a-space>
                </a-descriptions-item>
              </a-descriptions>

              <template #actions>
                <a-button type="text" size="small" @click="subscribe(e)">订阅事件</a-button>
                <a-button type="text" size="small" @click="viewDetail(e)">事件详情</a-button>
              </template>
            </a-card>
          </a-col>
        </a-row>

        <a-empty v-else :description="emptyHint">
          <a-space>
            <a-button type="primary" size="small" @click="openRegister">注册事件</a-button>
            <a-button size="small" @click="resetFilters">清除筛选条件</a-button>
          </a-space>
        </a-empty>
      </div>
    </div>

    <!-- 注册事件抽屉 -->
    <a-drawer
      v-model:visible="registerVisible"
      :width="560"
      placement="right"
      title="注册营销事件"
      ok-text="提交注册"
      cancel-text="取消"
      :ok-loading="submitting"
      :mask-closable="false"
      @ok="handleSubmit"
      @cancel="registerVisible = false"
    >
      <a-form ref="formRef" :model="form" :rules="rules" layout="vertical" auto-focus>
        <a-form-item field="name" label="事件名称" :rules="[{ required: true, message: '请输入事件名称' }]">
          <a-input v-model="form.name" placeholder="如：APP页面浏览" allow-clear />
        </a-form-item>
        <a-form-item
          field="code"
          label="事件编码"
          :rules="[
            { required: true, message: '请输入事件编码' },
            { match: /^event_[a-z0-9_]+$/, message: '编码需为 event_ 开头的小写下划线命名' }
          ]"
        >
          <a-input v-model="form.code" class="mono-input" placeholder="如：event_app_page_view" allow-clear>
            <template #prepend>event_</template>
          </a-input>
        </a-form-item>
        <a-form-item field="category" label="事件类别" :rules="[{ required: true, message: '请选择事件类别' }]">
          <a-select v-model="form.category" placeholder="请选择事件类别">
            <a-option v-for="c in categoryOptions" :key="c.value" :value="c.value">{{ c.label }}</a-option>
          </a-select>
        </a-form-item>
        <a-form-item field="description" label="事件描述">
          <a-textarea v-model="form.description" placeholder="事件的业务含义与消费场景" :max-length="120" show-word-limit :auto-size="{ minRows: 2, maxRows: 4 }" />
        </a-form-item>
        <a-form-item field="storage" label="存储引擎">
          <a-select v-model="form.storage" disabled>
            <a-option value="Kafka">Kafka</a-option>
          </a-select>
          <template #extra>营销事件统一走 Kafka 事件流，禁止落库轮询</template>
        </a-form-item>
        <a-form-item field="baseTable" label="Kafka 主题 / 事件流底表" :rules="[{ required: true, message: '请选择要绑定的事件流底表' }]">
          <a-select v-model="form.baseTable" placeholder="选择已上线的 Kafka 事件流底表" allow-search>
            <a-option
              v-for="o in kafkaTopicOptions"
              :key="o.tableName"
              :value="o.tableName"
              :label="`${o.cnName}（${o.tableName}）`"
            >
              <div class="topic-option">
                <span class="topic-option-name">{{ o.cnName }}（{{ o.tableName }}）</span>
                <span class="topic-option-meta">
                  <span class="mono topic-option-endpoint">{{ o.topic }}</span>
                  <a-tag v-if="o.streamable" size="small" color="green">stream 可订阅</a-tag>
                </span>
              </div>
            </a-option>
            <template #empty>
              <a-empty description="暂无可绑定的已上线 Kafka 主题" />
            </template>
          </a-select>
          <template #extra>
            <span>绑定后事件流主题：<b class="mono">{{ selectedTopic || '待选择' }}</b>（仅可选 storage=Kafka 且状态=已上线的事件流底表）</span>
          </template>
        </a-form-item>
        <a-form-item field="dailyVolume" label="日均事件量估算（条/日）">
          <a-input-number v-model="form.dailyVolume" :min="0" :step="10000" :precision="0" placeholder="如：1240000" hide-button>
            <template #suffix>条 / 日</template>
          </a-input-number>
        </a-form-item>
        <a-form-item field="owner" label="负责人">
          <a-input v-model="form.owner" placeholder="事件归属负责人" allow-clear />
        </a-form-item>
      </a-form>
    </a-drawer>

    <!-- 缺失工单弹窗 -->
    <MissingTicketModal
      v-model:visible="showMissingTicketModal"
      :context="ticketContext"
      @confirm="handleMissingTicketConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import type { FieldRule, FormInstance } from '@arco-design/web-vue'
import { IconPlus } from '@arco-design/web-vue/es/icon'
import PageBanner from '@/components-dca/common/PageBanner.vue'
import MissingTicketModal from '@/pages/search/MissingTicketModal.vue'
import { useMissingTicket } from '@/composables/useMissingTicket'
// 注意：dca 自己的 mock 必须走 @/mock-dca（@/mock 与 @/pages 别名指向 dfd 项目）
import { TableCatalogStore } from '@/mock-dca/shared/table-catalog-store'

const { showMissingTicketModal, ticketContext, showMissingTicket, handleMissingTicketConfirm } = useMissingTicket()
const router = useRouter()

// ---------------- 类型 ----------------

interface MarketingEvent {
  id: string
  name: string
  /** 事件编码：event_xxx */
  code: string
  /** behavior | trade | approval */
  category: string
  description: string
  /** Kafka 主题（endpoint），如 kafka://topic_user_behavior */
  topic: string
  /** 绑定的事件流底表（统一表目录 table-catalog-store 中的逻辑表名） */
  baseTable: string
  /** online 已发布 | draft 草稿 | offline 已下线 */
  status: string
  /** 日均事件量（条/日） */
  dailyVolume: number
  /** 订阅方（消费方）数 */
  subscribers: number
  owner: string
  updatedAt: string
}

interface TopicOption {
  tableName: string
  cnName: string
  topic: string
  /** 是否带在线 stream 订阅服务 */
  streamable: boolean
}

// ---------------- 常量映射（页内窄类型函数取值，规避模板内索引 Record） ----------------

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  behavior: { label: '行为事件', color: 'green' },
  trade: { label: '交易事件', color: 'arcoblue' },
  approval: { label: '审批事件', color: 'orange' }
}
const STATUS_META: Record<string, { label: string; color: string }> = {
  online: { label: '已发布', color: 'green' },
  draft: { label: '草稿', color: 'gray' },
  offline: { label: '已下线', color: 'red' }
}

const categoryOptions = Object.keys(CATEGORY_META).map(k => ({ value: k, label: CATEGORY_META[k].label }))

function categoryMeta(c: string): { label: string; color: string } {
  return CATEGORY_META[c] || { label: c || '未分类', color: 'gray' }
}
function statusMeta(s: string): { label: string; color: string } {
  return STATUS_META[s] || { label: s || '未知', color: 'gray' }
}

// ---------------- 种子数据（营销事件 · 要素模型 v2） ----------------

const EVENT_SEED: MarketingEvent[] = [
  {
    id: 'evt_app_page_view', name: 'APP页面浏览', code: 'event_app_page_view', category: 'behavior',
    description: 'APP 内页面曝光埋点事件，触达策略与漏斗分析的主行为源。',
    topic: 'kafka://topic_user_behavior', baseTable: 'kafka_user_behavior_flow',
    status: 'online', dailyVolume: 9800000, subscribers: 6, owner: '吴九', updatedAt: '2025-09-12 10:05'
  },
  {
    id: 'evt_button_click', name: '按钮点击', code: 'event_button_click', category: 'behavior',
    description: '关键按钮（领券、提额申请、还款）点击事件，用于即时触达判定。',
    topic: 'kafka://topic_user_behavior', baseTable: 'kafka_user_behavior_flow',
    status: 'online', dailyVolume: 2400000, subscribers: 4, owner: '吴九', updatedAt: '2025-09-11 16:20'
  },
  {
    id: 'event_landing_arrive', name: '注册落地页到达', code: 'event_landing_arrive', category: 'behavior',
    description: '营销投放带来的落地页到达事件，衡量渠道引流质量。',
    topic: 'kafka://topic_user_behavior', baseTable: 'kafka_user_behavior_flow',
    status: 'online', dailyVolume: 460000, subscribers: 3, owner: '陈营销', updatedAt: '2025-09-10 09:35'
  },
  {
    id: 'evt_trade_deposit', name: '交易入金提醒', code: 'event_trade_deposit', category: 'trade',
    description: '实时交易流水中的入金事件，驱动入金关怀与额度提升营销。',
    topic: 'kafka://trade_flow', baseTable: 'kafka_trade_flow',
    status: 'online', dailyVolume: 1240000, subscribers: 5, owner: '刘一', updatedAt: '2025-09-12 08:12'
  },
  {
    id: 'evt_deduct_success', name: '扣款成功事件', code: 'event_deduct_success', category: 'trade',
    description: '代扣成功事件，用于还款激励与权益发放的实时触发。',
    topic: 'kafka://trade_flow', baseTable: 'kafka_trade_flow',
    status: 'online', dailyVolume: 380000, subscribers: 7, owner: '刘一', updatedAt: '2025-09-09 20:40'
  },
  {
    id: 'evt_credit_approved', name: '授信审批通过', code: 'event_credit_approved', category: 'approval',
    description: '风控决策引擎输出的授信通过事件，下游引用最多的营销触发源。',
    topic: 'kafka://topic_credit_decision', baseTable: 'kafka_credit_decision_flow',
    status: 'online', dailyVolume: 96000, subscribers: 12, owner: '张风控', updatedAt: '2025-09-12 07:50'
  },
  {
    id: 'evt_limit_raise_result', name: '提额审批结果', code: 'event_limit_raise_result', category: 'approval',
    description: '客户主动提额申请的审批结果事件，待补口径后发布。',
    topic: 'kafka://topic_credit_decision', baseTable: 'kafka_credit_decision_flow',
    status: 'draft', dailyVolume: 32000, subscribers: 2, owner: '张风控', updatedAt: '2025-09-08 14:05'
  }
]

// ---------------- localStorage 持久化（dca-marketing-event-v1） ----------------

const LS_KEY = 'dca-marketing-event-v1'

function loadEvents(): MarketingEvent[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length) {
        const stored = parsed as MarketingEvent[]
        // seed 之外的新增项优先展示；seed 项以最新种子为基底叠加本地改动
        const custom = stored.filter(x => !EVENT_SEED.some(s => s.id === x.id))
        const seeds = EVENT_SEED.map(s => {
          const hit = stored.find(x => x.id === s.id)
          return hit ? { ...s, ...hit } : { ...s }
        })
        return [...custom, ...seeds]
      }
    }
  } catch { /* corrupt json / quota ignore */ }
  return EVENT_SEED.map(e => ({ ...e }))
}

const events = ref<MarketingEvent[]>(loadEvents())

watch(events, (list) => {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(list))
  } catch { /* quota ignore */ }
}, { deep: true })

// ---------------- Kafka 主题候选（统一表目录为唯一事实源） ----------------

/**
 * 可绑定候选：
 *  1. storage=Kafka 且 status=online 的事件流底表（kafka_trade_flow / kafka_credit_decision_flow）
 *     —— kafka_user_behavior_flow 处于未上线池，故不可选（演示约束）
 *  2. 带在线 stream 订阅服务的表作为补充（dwd_loan_drawdown / dwd_fraud_alert / ads_feature_device_rt）
 */
const kafkaTopicOptions = computed<TopicOption[]>(() => {
  const map = new Map<string, TopicOption>()
  for (const t of TableCatalogStore.all()) {
    const stream = t.services.find(s => s.kind === 'stream' && s.status === 'online')
    if (t.storage === 'Kafka' && t.status === 'online') {
      map.set(t.name, {
        tableName: t.name,
        cnName: t.cnName,
        topic: stream?.endpoint || `kafka://${t.name.replace(/^kafka_/, '')}`,
        streamable: !!stream
      })
    } else if (stream && t.status === 'online') {
      map.set(t.name, { tableName: t.name, cnName: t.cnName, topic: stream.endpoint, streamable: true })
    }
  }
  return Array.from(map.values())
})

const selectedTopic = computed(() =>
  kafkaTopicOptions.value.find(o => o.tableName === form.baseTable)?.topic || ''
)

// ---------------- 筛选 / 统计 ----------------

const search = ref('')
const category = ref('')

function matchSearch(e: MarketingEvent) {
  if (!search.value) return true
  const k = search.value.toLowerCase()
  return e.name.toLowerCase().includes(k) || e.code.toLowerCase().includes(k) || e.topic.toLowerCase().includes(k)
}

const filteredList = computed(() =>
  events.value.filter(e => (!category.value || e.category === category.value) && matchSearch(e))
)

function formatVolume(n: number): string {
  if (n >= 100000000) return `${(n / 100000000).toFixed(1).replace(/\.0$/, '')}亿`
  if (n >= 10000) return `${(n / 10000).toFixed(0)}万`
  return String(n)
}
function volumeLabel(n: number): string {
  return `${formatVolume(n)}/日`
}

const stats = computed(() => {
  const list = events.value
  const online = list.filter(e => e.status === 'online')
  const totalVolume = list.reduce((a, e) => a + (e.dailyVolume || 0), 0)
  const subscriberTotal = list.reduce((a, e) => a + (e.subscribers || 0), 0)
  return [
    { key: 'total', label: '事件总数', value: String(list.length), hint: `行为 / 交易 / 审批 三类`, color: 'var(--dca-text-primary)' },
    { key: 'volume', label: '日均产生量', value: `${formatVolume(totalVolume)}条`, hint: '全部事件实时产出合计', color: 'var(--dca-brand-primary)' },
    { key: 'subscribers', label: '订阅方数', value: String(subscriberTotal), hint: '跨策略/看板消费方', color: 'var(--dca-brand-secondary)' },
    { key: 'online', label: '实时已发布', value: String(online.length), hint: `草稿 ${list.length - online.length} 个待发布`, color: 'var(--dca-success)' }
  ]
})

const emptyHint = computed(() => (search.value || category.value ? '没有匹配的营销事件，试试换个关键词或类别' : '还没有注册任何营销事件'))

function resetFilters() {
  search.value = ''
  category.value = ''
}

// ---------------- 底表联动 ----------------

function goBaseTable(name: string) {
  if (!name) return
  router.push({ name: 'data-map-table', params: { tableName: name } })
}
function isTableOnline(name: string): boolean {
  return TableCatalogStore.byName(name)?.status === 'online'
}
function baseTableTitle(name: string): string {
  const cn = TableCatalogStore.byName(name)?.cnName || ''
  return `${cn || name} · 查看表详情（字段 / 血缘 / 服务）`
}

// ---------------- 注册事件 ----------------

interface EventForm {
  name: string
  code: string
  category: string
  description: string
  storage: string
  baseTable: string
  dailyVolume: number
  owner: string
}

function emptyForm(): EventForm {
  return { name: '', code: '', category: '', description: '', storage: 'Kafka', baseTable: '', dailyVolume: 100000, owner: '吴九' }
}

const registerVisible = ref(false)
const submitting = ref(false)
const formRef = ref<FormInstance>()
const form = reactive<EventForm>(emptyForm())

const rules: Record<string, FieldRule[]> = {
  name: [{ required: true, message: '请输入事件名称' }],
  code: [{ required: true, message: '请输入事件编码' }],
  category: [{ required: true, message: '请选择事件类别' }],
  baseTable: [{ required: true, message: '请选择要绑定的事件流底表' }]
}

function openRegister() {
  Object.assign(form, emptyForm())
  registerVisible.value = true
}

function nowStr(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

/** 编码输入去掉 event_ 前缀重复（prepend 插槽已展示前缀） */
function normalizeCode(code: string): string {
  return code.startsWith('event_') ? code : `event_${code}`
}

async function handleSubmit() {
  const errors = await formRef.value?.validate()
  if (errors) return
  submitting.value = true
  setTimeout(() => {
    const matched = kafkaTopicOptions.value.find(o => o.tableName === form.baseTable)
    events.value.unshift({
      id: `evt-${Date.now().toString(36)}`,
      name: form.name.trim(),
      code: normalizeCode(form.code.trim()),
      category: form.category,
      description: form.description.trim() || '待补充业务口径',
      topic: matched?.topic || `kafka://${form.baseTable}`,
      baseTable: form.baseTable,
      status: 'draft',
      dailyVolume: form.dailyVolume || 0,
      subscribers: 0,
      owner: form.owner.trim() || '营销数据组',
      updatedAt: nowStr()
    })
    submitting.value = false
    registerVisible.value = false
    Message.success(`事件「${form.name.trim()}」已注册（草稿），绑定主题 ${matched?.topic || form.baseTable}`)
  }, 600)
}

// ---------------- 卡片交互 ----------------

function subscribe(e: MarketingEvent) {
  e.subscribers += 1
  Message.success(`已提交订阅申请：${e.name}（${e.topic}）`)
}

function viewDetail(e: MarketingEvent) {
  if (e.baseTable) {
    router.push({ name: 'data-map-table', params: { tableName: e.baseTable } })
  } else {
    Message.info(`事件「${e.name}」未绑定底表，暂无详情页`)
  }
}
</script>

<style scoped>
.marketing-event-page { min-height: 100vh; background: var(--dca-bg-page-alt); position: relative; overflow-x: hidden; }
.action-btn { white-space: nowrap; }
.model-tag { margin-right: 4px; }
.mono { font-family: 'JetBrains Mono', Menlo, Consolas, 'Courier New', monospace; }
.mono-input :deep(.arco-input-append) { font-family: 'JetBrains Mono', Menlo, Consolas, monospace; }

.main-content { padding: 0 40px var(--dca-spacing-2xl); width: 100%; max-width: var(--dca-page-max-width-wide); margin: -40px auto 0; position: relative; z-index: 3; }

/* 统计条 */
.stat-row { margin-bottom: var(--dca-spacing-md); }
.stat-card { background: var(--dca-bg-card); border-radius: var(--dca-radius-xl); padding: var(--dca-spacing-lg); box-shadow: var(--dca-shadow-md); }
.stat-value { font-size: 28px; font-weight: 700; line-height: 1.2; margin-bottom: var(--dca-spacing-xs); }
.stat-label { font-size: var(--dca-font-base); color: var(--dca-text-secondary); margin-bottom: var(--dca-spacing-xs); }
.stat-hint { font-size: var(--dca-font-sm); color: var(--dca-text-tertiary); }

/* 事件卡片 */
.content-section { background: var(--dca-bg-card); border-radius: var(--dca-radius-xl); padding: var(--dca-spacing-lg); box-shadow: var(--dca-shadow-md); }
.event-card { height: 100%; border-radius: var(--dca-radius-lg); transition: all 0.3s; }
.event-card:hover { transform: translateY(-4px); box-shadow: var(--dca-shadow-lg); }
.event-name { font-size: var(--dca-font-xl); color: var(--dca-text-primary); }
.event-code { font-size: var(--dca-font-sm); color: var(--dca-text-tertiary); margin-bottom: var(--dca-spacing-sm); }
.event-desc { font-size: var(--dca-font-sm); color: var(--dca-text-secondary); line-height: 1.5; margin-bottom: var(--dca-spacing-sm); min-height: 36px; }
.event-topic { font-size: var(--dca-font-sm); color: var(--dca-brand-secondary); background: #f7f2ff; border-radius: var(--dca-radius-md); padding: 4px 8px; margin-bottom: var(--dca-spacing-md); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.event-desc-list :deep(.arco-descriptions-item-label) { color: var(--dca-text-tertiary); }
.base-table-link { color: var(--dca-brand-primary); cursor: pointer; font-size: var(--dca-font-sm); font-family: 'JetBrains Mono', Menlo, Consolas, monospace; }
.base-table-link:hover { text-decoration: underline; }

/* 主题下拉选项 */
.topic-option { display: flex; flex-direction: column; gap: 2px; padding: 2px 0; }
.topic-option-name { font-size: var(--dca-font-base); color: var(--dca-text-primary); }
.topic-option-meta { display: flex; align-items: center; gap: var(--dca-spacing-sm); }
.topic-option-endpoint { font-size: var(--dca-font-xs); color: var(--dca-text-tertiary); }
</style>
