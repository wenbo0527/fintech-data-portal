<template>
  <div class="dca-search">
    <!-- ============================================================
         ① 顶部搜索区：标题 + 搜索框；筛选/历史收进「高级搜索」「搜索历史」面板
         ============================================================ -->
    <section class="search-hero">
      <div class="hero-top">
        <div class="hero-heading">
          <h2 class="hero-title">统一搜索</h2>
          <span class="hero-sub">搜索和管理您的数据资产</span>
        </div>
        <div class="hero-actions">
          <a-button type="text" size="small" :class="{ 'is-active': showAdvanced }" @click="showAdvanced = !showAdvanced">
            <template #icon><icon-filter /></template>高级搜索
            <span v-if="hasFilter" class="adv-count">{{ activeFilterCount }}</span>
          </a-button>
          <a-button type="text" size="small" @click="openTicket">
            <template #icon><icon-plus /></template>缺失工单
          </a-button>
          <a-button type="text" size="small" :class="{ 'is-active': showHistory }" @click="showHistory = !showHistory">
            <template #icon><icon-history /></template>搜索历史
          </a-button>
        </div>
      </div>

      <div class="hero-input">
        <a-input-search
          v-model="keyword"
          size="large"
          placeholder="请输入表名、描述或业务域进行搜索"
          search-button
          allow-clear
          :loading="searching"
          @search="runSearch"
        />
      </div>

      <!-- 高级搜索面板：业务域 / 存储类型 / 分级（改动即重查，共用 300ms 防抖） -->
      <div v-show="showAdvanced" class="hero-filters">
        <span class="filters-label">高级搜索</span>
        <a-select
          v-model="filterDomain"
          :options="domainOptions"
          size="small"
          placeholder="业务域：全部"
          allow-clear
          show-search
          class="filter-item"
        />
        <a-select
          v-model="filterStorage"
          :options="storageOptions"
          size="small"
          placeholder="存储类型：全部"
          allow-clear
          class="filter-item"
        />
        <a-select
          v-model="filterSensitivity"
          :options="sensitivityOptions"
          size="small"
          placeholder="数据分级：全部"
          allow-clear
          class="filter-item"
        />
        <a-button v-if="hasFilter" type="text" size="mini" @click="resetFilters">重置筛选</a-button>
        <span class="filter-tip">改动筛选条件将自动重查（约 300ms）</span>
      </div>

      <!-- 搜索历史面板（localStorage: search-history，点击直接搜、可清空） -->
      <div v-show="showHistory" class="hero-history">
        <template v-if="searchHistory.length">
          <span class="history-label">最近搜索</span>
          <a-tag
            v-for="h in searchHistory"
            :key="h"
            size="small"
            class="keyword-chip"
            @click="applyKeyword(h)"
          >{{ h }}</a-tag>
          <a-button type="text" size="mini" class="history-clear" @click="clearHistory">清空历史</a-button>
        </template>
        <span v-else class="history-label">暂无搜索历史，搜索后可在这里快速回访</span>
      </div>
    </section>

    <!-- ============================================================
         ② 结果区：7 个 Tab（4 主 + 3 过渡期）+ 统一卡片流 + 空态引导
         ============================================================ -->
    <section v-if="searched || searching" class="result-section">
      <div class="result-toolbar">
        <span class="result-summary">
          <template v-if="searchedKeyword">关键词「{{ searchedKeyword }}」</template>
          <template v-else>未限定关键词</template>
          ，为您找到 <b>{{ cards.length }}</b> 个搜索结果<template v-if="hasFilter">（已应用高级搜索筛选）</template>
        </span>
        <div class="result-toolbar-right">
          <span class="sort-label">排序：</span>
          <a-select v-model="sortBy" size="small" style="width: 140px" @change="applySort">
            <a-option value="heat">查询热度</a-option>
            <a-option value="updateTime">最近更新</a-option>
            <a-option value="relevance">相关度</a-option>
          </a-select>
          <span class="sort-order">降序</span>
        </div>
      </div>

      <!-- Tab 头：无结果的 Tab 置灰禁用但不隐藏；过渡 Tab 带「过渡期」角标 -->
      <a-tabs v-model:active-key="activeTab" class="result-tabs">
        <a-tab-pane v-for="tab in tabDefs" :key="tab.key" :disabled="tab.count === 0">
          <template #title>
            <span class="tab-label">
              {{ tab.label }}
              <span class="tab-count">{{ tab.count }}</span>
              <a-tag v-if="tab.transition" size="small" color="gray" class="tab-badge">过渡期</a-tag>
            </span>
          </template>
        </a-tab-pane>
      </a-tabs>

      <p class="result-hint">{{ activeTabHint }}</p>

      <!-- loading 骨架 -->
      <div v-if="searching" class="skeleton-grid">
        <div v-for="n in 6" :key="n" class="skeleton-card">
          <a-skeleton :animation="true">
            <a-skeleton-line :rows="3" :widths="['52%', '100%', '36%']" />
          </a-skeleton>
        </div>
      </div>

      <!-- 结果卡片：所有 Tab 复用同一份卡片模板（activeTab 只切换数据切片） -->
      <div v-else-if="paginatedCards.length" class="result-grid">
        <article
          v-for="card in paginatedCards"
          :key="card.key"
          class="asset-card"
          :class="[`kind-${card.kind}`, { 'is-reviewing': card.greyed }]"
          :title="card.tip"
          @click="openCard(card, $event)"
        >
          <div class="card-main">
            <header class="card-head">
              <span class="card-kind">{{ card.kindLabel }}</span>
              <h4 class="card-title">{{ card.title }}</h4>
              <code v-if="card.subtitle" class="card-subtitle">{{ card.subtitle }}</code>
              <a-tag v-if="card.badge" size="small" color="red" class="card-badge">{{ card.badge }}</a-tag>
            </header>
            <p class="card-desc" :class="{ 'card-desc-1': card.kind === 'field' }">{{ card.desc }}</p>
            <div v-if="card.tags.length" class="card-tags">
              <a-tag v-for="tg in card.tags" :key="tg.label" size="small" :color="tg.color">{{ tg.label }}</a-tag>
            </div>
          </div>
          <div class="card-side">
            <div v-if="card.qualityScore !== undefined" class="quality-score">
              <span class="quality-val">{{ card.qualityScore }}</span>
              <span class="quality-label">质量分</span>
            </div>
            <div v-if="card.heatStars !== undefined" class="heat-stars">
              <span v-for="n in 5" :key="n" class="heat-star" :class="{ active: n <= card.heatStars }">★</span>
            </div>
            <p v-for="line in card.meta" :key="line" class="card-meta">
              <template v-if="line.html" v-html="line.html"></template>
              <template v-else>{{ line.text || line }}</template>
            </p>
            <span class="card-action">{{ card.actionText }}<icon-right /></span>
          </div>
        </article>
      </div>
      <!-- 分页器 -->
      <div v-if="!searching && sortedCards.length > pageSize" class="result-pagination">
        <a-pagination
          v-model:current="currentPage"
          :total="sortedCards.length"
          :page-size="pageSize"
          show-total
          show-page-size
          :page-size-options="[20, 50, 100]"
          @change="onPageChange"
          @page-size-change="onPageSizeChange"
        />
      </div>

      <!-- 空态：CSS/SVG 插画 + 引导 + 工单入口 -->
      <div v-else class="empty-state">
        <svg class="empty-svg" viewBox="0 0 200 150" role="img" aria-label="未找到数据">
          <rect x="34" y="26" width="84" height="70" rx="8" fill="none" stroke="currentColor" stroke-width="3" />
          <line x1="48" y1="46" x2="104" y2="46" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
          <line x1="48" y1="60" x2="94" y2="60" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
          <line x1="48" y1="74" x2="78" y2="74" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
          <circle cx="132" cy="92" r="26" fill="none" stroke="currentColor" stroke-width="4" />
          <line x1="151" y1="111" x2="168" y2="128" stroke="currentColor" stroke-width="6" stroke-linecap="round" />
          <line x1="122" y1="92" x2="142" y2="92" stroke="currentColor" stroke-width="4" stroke-linecap="round" />
        </svg>
        <h4 class="empty-title">没有找到「{{ searchedKeyword || '相关内容' }}」的数据</h4>
        <p class="empty-desc">
          可以换个更短的关键词，或展开「高级搜索」放宽业务域/存储/分级筛选；确认数据确实缺失的话，直接提交数据工单，补齐后我们会在站内通知里告诉你。
        </p>
        <div class="empty-actions">
          <a-button type="primary" @click="openTicket">提交数据工单</a-button>
          <a-button @click="resetAll">清空条件看全部数据</a-button>
        </div>
        <div class="empty-tips">
          <span class="tips-label">大家都在搜：</span>
          <a-tag
            v-for="h in HOT_KEYWORDS"
            :key="h"
            size="small"
            class="keyword-chip"
            @click="applyKeyword(h)"
          >{{ h }}</a-tag>
        </div>
      </div>
    </section>

    <!-- ③ 缺失工单弹窗：复用 dfd 页面组件 + dca 本地 composable（别名 @/composables 指向 dca） -->
    <MissingTicketModal
      v-model:visible="showMissingTicketModal"
      :context="ticketContext"
      @confirm="handleTicketConfirm"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * dca 版统一搜索页（重构方案 P1 · 第 3 节「搜索体系对齐」）
 *
 * 数据源：@/api/search-shim（dca 真实实现，表侧唯一读 TableCatalogStore）
 * 视觉基调与门户首页 apps/data-community-app/src/pages/discovery/index.vue 一致（--dca-* token）
 *
 * 路由约定：由主 Agent 挂到 path `discovery/search`；支持 query `q` 预填关键词并自动搜索。
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
// 表/字段结果的类型与标签常量与状态机同源，避免在本页重复定义枚举
import {
  STATUS_COLORS,
  STATUS_LABELS,
  SENSITIVITY_COLORS,
  SENSITIVITY_LABELS,
  TableCatalogStore
} from '@/mock-dca/shared/table-catalog-store'
import { searchApi } from '@/api/search-shim'
// 注意别名遮蔽：@/pages 指向 dfd-app/src/pages，@/composables 指向 dca 本地 src/composables
import MissingTicketModal from '@/pages/search/MissingTicketModal.vue'
import { useMissingTicket } from '@/composables/useMissingTicket'

/* ---------------------------------------------------------------------
 * 类型：直接由 searchApi 返回值推导，杜绝 any，也避免与 store 枚举重复定义
 * ------------------------------------------------------------------- */
type SearchData = Awaited<ReturnType<typeof searchApi.search>>['data']
type TableCard = SearchData['tables'][number]
type FieldCard = SearchData['fields'][number]
type MetricCard = SearchData['metrics'][number]
type ExternalCard = SearchData['external'][number]
type ConceptBag = SearchData['concepts']

/** 卡片类别：决定左侧色条与类型角标 */
type ResultKind = 'asset' | 'resource' | 'field' | 'metric' | 'concept' | 'external'
/** 点击行为：none 表示详情页尚未建设（业务概念） */
type CardTarget = 'table' | 'table-field' | 'metric' | 'external' | 'none'

interface ResultTag {
  label: string
  color: string
}

/** 统一结果卡片模型：7 个 Tab 共用一套模板 */
interface ResultCard {
  key: string
  kind: ResultKind
  kindLabel: string
  title: string
  subtitle: string
  desc: string
  tags: ResultTag[]
  /** meta 行：支持纯字符串或带 HTML 的对象（如所属表链接） */
  meta: (string | { text: string; html?: string })[]
  /** 质量分：仅表类结果有 */
  qualityScore?: number
  /** 排序权重（无热度概念的过渡类结果为 0，排在表/字段之后） */
  heat: number
  /** 热度 5 星可视化（1-5） */
  heatStars?: number
  /** 最近更新时间（用于排序） */
  updateTime?: string
  /** 角标：如「主键」 */
  badge?: string
  /** 审核中的表：整体置灰、不可进入详情 */
  greyed: boolean
  actionText: string
  tip: string
  target: CardTarget
  /** 跳转路径（含 query）；target 为 none 时为空 */
  to?: string
}

/** 业务概念统一展示形状（域/实体/要素三套结构归一） */
interface ConceptView {
  code: string
  name: string
  kindLabel: '业务域' | '业务实体' | '数据要素'
  desc: string
  meta: string[]
}

/** 缺失工单提交载荷（MissingTicketModal 的 emit 未标注类型，这里显式收敛） */
interface MissingTicketPayload {
  ticketType?: 'content_error' | 'content_missing' | 'content_suggestion'
  missingContent?: string
  remark?: string
  expectedTime?: string
  assetType?: string
  assetName?: string
  pageSource?: string
  screenshot?: unknown
}

/** 落到 localStorage 的工单记录（带提交时间，供后续「我的工单」列表消费） */
type StoredTicket = MissingTicketPayload & { createdAt: string }

type TabKey = 'all' | 'asset' | 'resource' | 'field' | 'external' | 'metric' | 'concept'

interface TabDef {
  key: TabKey
  label: string
  count: number
  /** 过渡期 Tab：标签右侧带「过渡期」小角标 */
  transition: boolean
}

/* ---------------------------------------------------------------------
 * 常量
 * ------------------------------------------------------------------- */
const HISTORY_KEY = 'search-history'
const HISTORY_MAX = 10
const TICKET_KEY = 'dca-missing-tickets'
const DEBOUNCE_MS = 300
/** 空态引导用的常用关键词（与 TableCatalogStore 种子数据中的业务域/表名对得上） */
const HOT_KEYWORDS = ['客户', '风控', '逾期', '营销', '用户', '指标']
/** 指标上架状态文案（过渡期 Tab 展示用） */
const METRIC_STATUS_LABELS: Record<string, string> = {
  active: '已注册',
  onShelf: '已上架',
  offShelf: '已下架'
}
/** 数据要素类型文案 */
const ELEMENT_TYPE_LABELS: Record<string, string> = {
  metric: '指标',
  tag: '标签',
  variable: '变量',
  caliber: '口径'
}
const KIND_LABELS: Record<ResultKind, string> = {
  asset: '数据资产',
  resource: '数据资源',
  field: '字段',
  metric: '指标',
  concept: '业务概念',
  external: '外部数据'
}
const TAB_HINTS: Record<TabKey, string> = {
  all: '聚合数据资产 / 数据资源 / 字段 / 过渡期专题结果，按热度降序',
  asset: '数据资产：加工层（DWD/DWS/ADS/DIM）产出，可直接消费',
  resource: '数据资源：ODS 贴源层，按源头系统登记，需加工后才成为资产',
  field: '字段级命中，点击可跳转到所属表并定位该字段',
  external: '外部数据（过渡期专题）：仍读外数档案 mock，后续并入统一目录',
  metric: '指标（过渡期专题）：仍读指标字典 mock，后续并入统一目录',
  concept: '业务概念（过渡期专题）：详情页建设中，当前仅展示元数据'
}

/* ---------------------------------------------------------------------
 * 状态
 * ------------------------------------------------------------------- */
const route = useRoute()
const router = useRouter()

const keyword = ref('')
const filterDomain = ref<string>()
const filterStorage = ref<string>()
const filterSensitivity = ref<string>()
/** 顶部面板开关：高级搜索（业务域/存储/分级）与搜索历史 */
const showAdvanced = ref(false)
const showHistory = ref(false)

const searching = ref(false)
const searched = ref(false)
/** 实际生效的关键词（避免输入过程中标题抖动） */
const searchedKeyword = ref('')
const cards = ref<ResultCard[]>([])
const activeTab = ref<TabKey>('all')
const searchHistory = ref<string[]>([])
/** 排序方式：heat（热度降序）/ updateTime（最近更新）/ relevance（相关度） */
const sortBy = ref<'heat' | 'updateTime' | 'relevance'>('heat')
/** 分页 */
const currentPage = ref(1)
const pageSize = ref(20)

let debounceTimer: ReturnType<typeof setTimeout> | null = null

/* ---------------------------------------------------------------------
 * 派生：目录索引 + 筛选选项
 * search-shim 的卡片载荷未带 updateFrequency，这里按 tableId 回查唯一事实源补齐
 * ------------------------------------------------------------------- */
const catalogTables = computed(() => TableCatalogStore.all())

const catalogIndex = computed(() => {
  const map = new Map<string, { updateFrequency: string; heat: number }>()
  catalogTables.value.forEach(t => map.set(t.tableId, { updateFrequency: t.updateFrequency, heat: t.heat }))
  return map
})

const uniq = (list: string[]) => Array.from(new Set(list)).sort()

const domainOptions = computed(() =>
  uniq(catalogTables.value.map(t => t.domain)).map(v => ({ label: v, value: v }))
)
const storageOptions = computed(() =>
  uniq(catalogTables.value.map(t => t.storage)).map(v => ({ label: v, value: v }))
)
const sensitivityOptions = computed(() =>
  Object.entries(SENSITIVITY_LABELS).map(([value, label]) => ({ label, value }))
)

const hasFilter = computed(
  () => !!(filterDomain.value || filterStorage.value || filterSensitivity.value)
)
/** 已生效的高级搜索条件数（按钮角标） */
const activeFilterCount = computed(
  () => [filterDomain.value, filterStorage.value, filterSensitivity.value].filter(Boolean).length
)

/* ---------------------------------------------------------------------
 * 卡片构建
 * ------------------------------------------------------------------- */
const tableCard = (t: TableCard): ResultCard => {
  const kind: ResultKind = t.assetType === 'resource' ? 'resource' : 'asset'
  const freq = catalogIndex.value.get(t.tableId)?.updateFrequency || '—'
  const reviewing = t.status === 'reviewing'
  // 热度转 5 星：heat 0-100 映射到 1-5 星
  const heatStars = Math.max(1, Math.min(5, Math.ceil(t.heat / 20)))
  const tags: ResultTag[] = [
    { label: t.domain, color: 'arcoblue' },
    { label: t.storage, color: 'purple' },
    { label: `更新 ${freq}`, color: 'gray' },
    { label: SENSITIVITY_LABELS[t.sensitivity], color: SENSITIVITY_COLORS[t.sensitivity] }
  ]
  // 状态标签与状态机同源；审核中额外强调，其余状态同样如实展示
  tags.splice(3, 0, { label: STATUS_LABELS[t.status], color: STATUS_COLORS[t.status] })
  return {
    key: `table-${t.tableId}`,
    kind,
    kindLabel: KIND_LABELS[kind],
    title: t.cnName,
    subtitle: t.name,
    desc: t.description,
    tags,
    meta: [`负责人 ${t.owner}｜${t.layer}｜${t.sourceSystem}`, t.updateTime ? `最近更新 ${t.updateTime}` : '待上线'],
    qualityScore: t.qualityScore,
    heat: t.heat,
    heatStars,
    updateTime: t.updateTime,
    greyed: reviewing,
    actionText: '查看表详情',
    tip: reviewing ? `${t.cnName}（${t.name}）正在上线审核中，审核通过后开放详情页` : `${t.cnName}（${t.name}）`,
    target: 'table',
    to: `/discovery/data-map/table/${encodeURIComponent(t.name)}`
  }
}

const fieldCard = (f: FieldCard): ResultCard => ({
  key: `field-${f.tableId}-${f.name}`,
  kind: 'field',
  kindLabel: KIND_LABELS.field,
  title: f.cnName ? `${f.name}（${f.cnName}）` : f.name,
  subtitle: f.type,
  desc: f.description,
  badge: f.isPrimaryKey ? '主键' : undefined,
  tags: [
    { label: f.domain, color: 'arcoblue' },
    { label: SENSITIVITY_LABELS[f.sensitivity as keyof typeof SENSITIVITY_LABELS] ?? f.sensitivity, color: SENSITIVITY_COLORS[f.sensitivity as keyof typeof SENSITIVITY_COLORS] ?? 'gray' }
  ],
  meta: [
    `所属分类 ${f.domain}`,
    { text: `所属表 ${f.tableCnName}（${f.tableName}）`, html: `所属表 <a class="field-table-link" data-table="${f.tableName}">${f.tableCnName}（${f.tableName}）</a>` }
  ],
  heat: catalogIndex.value.get(f.tableId)?.heat ?? 0,
  greyed: false,
  actionText: '定位到该字段',
  tip: `${f.name}｜所属表 ${f.tableName}`,
  target: 'table-field',
  to: `/discovery/data-map/table/${encodeURIComponent(f.tableName)}?tab=fields&highlight=${encodeURIComponent(f.name)}`
})

const metricCard = (m: MetricCard): ResultCard => ({
  key: `metric-${m.id}`,
  kind: 'metric',
  kindLabel: KIND_LABELS.metric,
  title: m.name,
  subtitle: m.id,
  desc: m.description,
  tags: [
    { label: m.category, color: 'green' },
    { label: m.clusterType, color: 'cyan' },
    { label: METRIC_STATUS_LABELS[m.status] ?? m.status, color: m.status === 'onShelf' ? 'blue' : 'gray' }
  ],
  meta: [`负责人 ${m.owner}｜发布人 ${m.publisher}`, `注册时间 ${m.registerTime}`],
  heat: 0,
  greyed: false,
  actionText: '查看指标详情',
  tip: `${m.metricName}（${m.metricCode}）`,
  target: 'metric',
  to: `/discovery/metrics-map/detail/${encodeURIComponent(m.id)}`
})

const conceptView = (c: ConceptBag): ConceptView[] => [
  ...c.domains.map<ConceptView>(d => ({
    code: d.code,
    name: d.name,
    kindLabel: '业务域',
    desc: d.description,
    meta: [`负责人 ${d.owner}`, `覆盖范围 ${d.coverage}`]
  })),
  ...c.entities.map<ConceptView>(e => ({
    code: e.code,
    name: e.name,
    kindLabel: '业务实体',
    desc: e.description,
    meta: [`所属业务域 ${e.domainCode}`, `核心关系 ${e.coreRelations.length} 条｜属性 ${e.attributes.length} 个`]
  })),
  // DataElement 无 description 字段，用类型 + 关联产品兜底
  ...c.elements.map<ConceptView>(el => ({
    code: el.code,
    name: el.name,
    kindLabel: '数据要素',
    desc: `${ELEMENT_TYPE_LABELS[el.type] ?? el.type}类要素，适用产品：${el.relatedProduct}`,
    meta: [`关联实体 ${el.relatedEntityCode}`, el.relatedResource ? `关联资源 ${el.relatedResource.table}.${el.relatedResource.field}` : '未关联具体资源']
  }))
]

const externalCard = (e: ExternalCard): ResultCard => ({
  key: `external-${e.interfaceId}`,
  kind: 'external',
  kindLabel: KIND_LABELS.external,
  title: e.dataName,
  subtitle: e.interfaceId,
  desc: `${e.dataType}／${e.subType}，由 ${e.supplier} 提供`,
  tags: [
    { label: e.dataType, color: 'orangered' },
    { label: `管理方式 ${e.dataManagement}`, color: 'blue' }
  ],
  meta: [`供应商 ${e.supplier}`, `上线时间 ${e.onlineTime}`],
  heat: 0,
  greyed: false,
  actionText: '查看外数档案',
  tip: `${e.dataName}（${e.interfaceId}）`,
  target: 'external',
  to: `/discovery/external?focus=${encodeURIComponent(e.interfaceId)}`
})

const buildCards = (data: SearchData): ResultCard[] => {
  const list: ResultCard[] = [
    ...data.tables.map(tableCard),
    ...data.fields.map(fieldCard),
    ...data.metrics.map(metricCard),
    ...conceptView(data.concepts).map(c => ({
      key: `concept-${c.kindLabel}-${c.code}`,
      kind: 'concept' as ResultKind,
      kindLabel: c.kindLabel,
      title: c.name,
      subtitle: c.code,
      desc: c.desc,
      tags: [{ label: '业务概念', color: 'gold' }],
      meta: c.meta,
      heat: 0,
      greyed: false,
      actionText: '查看详情',
      tip: `${c.name}（${c.code}）详情页建设中`,
      target: 'none' as CardTarget
    })),
    ...data.external.map(externalCard)
  ]
  // 「全部」聚合四类主结果 + 过渡专题，排序由 sortedCards 动态计算
  return list
}

/* ---------------------------------------------------------------------
 * Tab
 * ------------------------------------------------------------------- */
const countOf = (kind: ResultKind) => cards.value.filter(c => c.kind === kind).length

const tabDefs = computed<TabDef[]>(() => [
  { key: 'all', label: '全部', count: cards.value.length, transition: false },
  { key: 'asset', label: '数据资产', count: countOf('asset'), transition: false },
  { key: 'resource', label: '数据资源', count: countOf('resource'), transition: false },
  { key: 'field', label: '字段', count: countOf('field'), transition: false },
  { key: 'external', label: '外部数据', count: countOf('external'), transition: true },
  { key: 'metric', label: '指标', count: countOf('metric'), transition: true },
  { key: 'concept', label: '业务概念', count: countOf('concept'), transition: true }
])

const tabFilteredCards = computed(() =>
  activeTab.value === 'all' ? cards.value : cards.value.filter(c => c.kind === activeTab.value)
)

/** 动态排序：根据 sortBy 切换热度/更新时间/相关度 */
const sortedCards = computed(() => {
  const list = [...tabFilteredCards.value]
  if (sortBy.value === 'updateTime') {
    list.sort((a, b) => (b.updateTime || '').localeCompare(a.updateTime || ''))
  } else if (sortBy.value === 'relevance') {
    // 相关度：有搜索词时按字段命中位置粗排，无搜索词时退化为热度
    const kw = searchedKeyword.value.toLowerCase()
    if (kw) {
      list.sort((a, b) => {
        const aScore = (a.title.toLowerCase().includes(kw) ? 2 : 0) + (a.desc.toLowerCase().includes(kw) ? 1 : 0)
        const bScore = (b.title.toLowerCase().includes(kw) ? 2 : 0) + (b.desc.toLowerCase().includes(kw) ? 1 : 0)
        return bScore - aScore || b.heat - a.heat
      })
    } else {
      list.sort((a, b) => b.heat - a.heat)
    }
  } else {
    // heat：默认热度降序
    list.sort((a, b) => b.heat - a.heat)
  }
  return list
})

/** 分页切片 */
const paginatedCards = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return sortedCards.value.slice(start, start + pageSize.value)
})

const applySort = () => {
  currentPage.value = 1
}

const onPageChange = () => {
  // 滚动到结果区顶部
  document.querySelector('.result-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const onPageSizeChange = () => {
  currentPage.value = 1
}

const activeTabHint = computed(() => TAB_HINTS[activeTab.value])

/** Tab URL 同步：写入 URL 以支持返回保留最后选中 Tab */
watch(activeTab, (val) => {
  currentPage.value = 1
  const query: Record<string, string> = { ...route.query, tab: val }
  if (!route.query.q) delete query.q
  router.replace({ query })
})

/* ---------------------------------------------------------------------
 * 搜索：300ms 防抖 + loading 骨架
 * ------------------------------------------------------------------- */
const cancelDebounce = () => {
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
}

const runSearch = async () => {
  cancelDebounce()
  searching.value = true
  currentPage.value = 1
  const kw = keyword.value.trim()
  try {
    const res = await searchApi.search(kw, {
      domain: filterDomain.value,
      storage: filterStorage.value,
      sensitivity: filterSensitivity.value
    })
    cards.value = buildCards(res.data)
    // 当前 Tab 本轮无结果时回落到「全部」，禁用态 Tab 不可停留
    const active = tabDefs.value.find(t => t.key === activeTab.value)
    if (!active || active.count === 0) activeTab.value = 'all'
    if (kw) saveSearchHistory(kw)
  } finally {
    searching.value = false
    searched.value = true
    searchedKeyword.value = kw
  }
}

const scheduleSearch = () => {
  cancelDebounce()
  // 立即进入 loading，避免防抖窗口内闪现空态
  searching.value = true
  debounceTimer = setTimeout(() => {
    debounceTimer = null
    void runSearch()
  }, DEBOUNCE_MS)
}

watch([keyword, filterDomain, filterStorage, filterSensitivity], scheduleSearch)

/* ---------------------------------------------------------------------
 * 搜索历史（localStorage: search-history）
 * ------------------------------------------------------------------- */
const loadSearchHistory = (): string[] => {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((h): h is string => typeof h === 'string') : []
  } catch {
    return []
  }
}

const saveSearchHistory = (query: string) => {
  const list = searchHistory.value.filter(h => h !== query)
  list.unshift(query)
  searchHistory.value = list.slice(0, HISTORY_MAX)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(searchHistory.value))
}

const clearHistory = () => {
  searchHistory.value = []
  localStorage.removeItem(HISTORY_KEY)
  Message.success('已清空搜索历史')
}

const applyKeyword = (kw: string) => {
  if (keyword.value === kw) {
    void runSearch()
    return
  }
  keyword.value = kw
}

const resetFilters = () => {
  filterDomain.value = undefined
  filterStorage.value = undefined
  filterSensitivity.value = undefined
}

const resetAll = () => {
  resetFilters()
  applyKeyword('')
}

/* ---------------------------------------------------------------------
 * 卡片点击跳转（跳转均有 toast）
 * ------------------------------------------------------------------- */
const openCard = (card: ResultCard, event?: MouseEvent) => {
  // 事件委托：检查是否点击了字段卡片中的表链接
  if (event) {
    const target = event.target as HTMLElement
    const linkEl = target.closest('.field-table-link')
    if (linkEl) {
      const tableName = linkEl.getAttribute('data-table')
      if (tableName) {
        event.stopPropagation()
        router.push(`/discovery/data-map/table/${encodeURIComponent(tableName)}`)
        return
      }
    }
  }
  if (card.greyed) {
    Message.info(`「${card.title}」正在上线审核中，仅开放元数据预览，审核通过后即可查看详情`)
    return
  }
  if (card.target === 'none' || !card.to) {
    Message.info('业务概念详情页建设中，当前仅展示元数据')
    return
  }
  router.push(card.to)
}

/* ---------------------------------------------------------------------
 * 缺失工单：复用 MissingTicketModal + useMissingTicket，提交结果落本地
 * ------------------------------------------------------------------- */
const { showMissingTicketModal, ticketContext, showMissingTicket } = useMissingTicket()

const openTicket = () => {
  showMissingTicket({
    assetType: 'other',
    pageSource: searchedKeyword.value ? `统一搜索「${searchedKeyword.value}」` : '统一搜索'
  })
}

const handleTicketConfirm = (payload: MissingTicketPayload) => {
  // 落 localStorage
  let list: StoredTicket[] = []
  try {
    const raw = localStorage.getItem(TICKET_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    if (Array.isArray(parsed)) list = parsed as StoredTicket[]
  } catch {
    list = []
  }
  const ticket: StoredTicket = { ...payload, createdAt: new Date().toISOString() }
  list.unshift(ticket)
  localStorage.setItem(TICKET_KEY, JSON.stringify(list.slice(0, 50)))

  // 跳转通知中心查看进度
  Message.success('工单已提交，即将跳转通知中心查看进度')
  setTimeout(() => {
    router.push({ name: 'notifications' })
  }, 800)
}

/* ---------------------------------------------------------------------
 * 生命周期：支持 route.query.q 预填并自动搜索
 * ------------------------------------------------------------------- */
onMounted(() => {
  searchHistory.value = loadSearchHistory()
  const q = route.query.q
  const tab = route.query.tab as TabKey | undefined
  if (tab && ['all', 'asset', 'resource', 'field', 'external', 'metric', 'concept'].includes(tab)) {
    activeTab.value = tab
  }
  if (typeof q === 'string' && q.trim()) {
    // 赋值触发 keyword watcher → 防抖后自动搜索
    keyword.value = q
    return
  }
  void runSearch()
})

onBeforeUnmount(cancelDebounce)
</script>

<style scoped>
.dca-search {
  min-height: 100%;
  padding: 20px 24px 40px;
  background: var(--dca-bg-page-alt, #f7f8fa);
}

/* ---------- ① 搜索区（白卡：标题行 + 全宽搜索框，筛选/历史折叠面板） ---------- */
.search-hero {
  padding: 18px 20px 16px;
  border-radius: var(--dca-radius-xl, 12px);
  background: var(--dca-bg-card, #fff);
  box-shadow: var(--dca-shadow-md, 0 2px 8px rgba(0, 0, 0, 0.04));
}

.hero-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}

.hero-heading {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.hero-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--dca-text-primary, #1d2129);
}

.hero-sub {
  font-size: var(--dca-font-md, 13px);
  color: var(--dca-text-tertiary, #86909c);
}

.hero-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.hero-actions :deep(.arco-btn) {
  color: var(--dca-text-secondary, #4e5969);
}

.hero-actions :deep(.arco-btn.is-active),
.hero-actions :deep(.arco-btn:hover) {
  color: var(--dca-brand-primary, #165dff);
}

.adv-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  margin-left: 4px;
  padding: 0 4px;
  border-radius: 8px;
  font-size: 11px;
  color: #fff;
  background: var(--dca-brand-primary, #165dff);
}

.hero-input :deep(.arco-input-wrapper),
.hero-input :deep(.arco-input-search-btn) {
  border-radius: var(--dca-radius-lg, 8px);
}

.hero-filters {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px dashed rgba(29, 33, 41, 0.08);
}

.filters-label {
  font-size: var(--dca-font-sm, 12px);
  font-weight: 600;
  color: var(--dca-text-secondary, #4e5969);
}

.filter-item {
  width: 160px;
}

.filter-tip {
  font-size: var(--dca-font-sm, 12px);
  color: var(--dca-text-tertiary, #86909c);
}

.hero-history {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px dashed rgba(29, 33, 41, 0.08);
}

.sort-label,
.sort-order {
  font-size: var(--dca-font-md, 13px);
  color: var(--dca-text-secondary, #4e5969);
}

.sort-order {
  color: var(--dca-brand-primary, #165dff);
}

.history-label,
.tips-label {
  font-size: var(--dca-font-sm, 12px);
  color: var(--dca-text-tertiary, #86909c);
}

.keyword-chip {
  cursor: pointer;
  background: rgba(255, 255, 255, 0.75);
}

.keyword-chip:hover {
  color: var(--dca-brand-primary, #165dff);
  background: #fff;
}

.history-clear {
  color: var(--dca-text-tertiary, #86909c);
}

/* ---------- ② 结果区 ---------- */
.result-section {
  margin-top: 18px;
  padding: 16px 20px 24px;
  border-radius: var(--dca-radius-xl, 12px);
  background: var(--dca-bg-card, #fff);
  box-shadow: var(--dca-shadow-md, 0 2px 8px rgba(0, 0, 0, 0.04));
}

.result-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.result-toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.result-pagination {
  display: flex;
  justify-content: center;
  margin-top: 20px;
  padding-bottom: 8px;
}

.result-summary {
  font-size: var(--dca-font-base, 14px);
  color: var(--dca-text-secondary, #4e5969);
}

.result-summary b {
  color: var(--dca-brand-primary, #165dff);
  font-size: 16px;
  margin: 0 2px;
}

/* 热度 5 星 */
.heat-stars {
  display: flex;
  gap: 1px;
  margin-bottom: 4px;
}
.heat-star {
  font-size: 14px;
  color: #e5e6eb;
}
.heat-star.active {
  color: #ff7d00;
}

/* 字段卡片：主键角标 */
.card-badge {
  margin-left: 4px;
}

/* 字段卡片：描述 1 行省略 */
.card-desc-1 {
  -webkit-line-clamp: 1 !important;
}

/* 字段卡片：所属表链接 */
:deep(.field-table-link) {
  color: #165DFF;
  cursor: pointer;
  text-decoration: none;
}
:deep(.field-table-link:hover) {
  text-decoration: underline;
}

.result-tabs {
  margin-top: 6px;
}

/* 只使用 Tab 头，内容区由下方统一卡片流承载 */
.result-tabs :deep(.arco-tabs-content) {
  display: none;
}

.result-tabs :deep(.arco-tabs-nav) {
  margin-bottom: 4px;
}

.tab-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.tab-count {
  min-width: 20px;
  padding: 0 6px;
  border-radius: 10px;
  font-size: 11px;
  line-height: 16px;
  text-align: center;
  color: var(--dca-text-secondary, #4e5969);
  background: var(--dca-bg-hover, #f5f7fa);
}

.tab-badge {
  transform: scale(0.86);
  transform-origin: left center;
}

.result-hint {
  margin: 8px 0 14px;
  font-size: var(--dca-font-sm, 12px);
  color: var(--dca-text-tertiary, #86909c);
}

.skeleton-grid,
.result-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
  gap: 12px;
}

.skeleton-card {
  padding: 16px;
  border: 1px solid var(--dca-border-light, #f2f3f5);
  border-radius: var(--dca-radius-lg, 8px);
}

.asset-card {
  position: relative;
  display: flex;
  gap: 12px;
  padding: 14px 16px 14px 18px;
  border: 1px solid var(--dca-border-default, #e5e6eb);
  border-radius: var(--dca-radius-lg, 8px);
  background: var(--dca-bg-card, #fff);
  cursor: pointer;
  transition: box-shadow 0.2s, border-color 0.2s, transform 0.2s;
}

.asset-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  border-radius: 3px 0 0 3px;
  background: var(--card-accent, #c9cdd4);
}

.asset-card:hover {
  border-color: var(--card-accent, #165dff);
  box-shadow: var(--dca-shadow-lg, 0 4px 16px rgba(0, 0, 0, 0.08));
  transform: translateY(-1px);
}

.kind-asset { --card-accent: #165dff; }
.kind-resource { --card-accent: #0fc6c2; }
.kind-field { --card-accent: #722ed1; }
.kind-metric { --card-accent: #00b42a; }
.kind-concept { --card-accent: #ff7d00; }
.kind-external { --card-accent: #f53f3f; }

/* 审核中的表：整体置灰（半透明 + cursor 仍可见），卡片信息保持可读 */
.asset-card.is-reviewing {
  opacity: 0.55;
  cursor: not-allowed;
}

.asset-card.is-reviewing:hover {
  transform: none;
  box-shadow: none;
}

.card-main {
  flex: 1;
  min-width: 0;
}

.card-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.card-kind {
  flex: none;
  padding: 1px 6px;
  border-radius: var(--dca-radius-md, 4px);
  font-size: 11px;
  color: var(--card-accent, #165dff);
  background: var(--dca-bg-emphasis, #e8f3ff);
}

.card-title {
  margin: 0;
  font-size: var(--dca-font-lg, 15px);
  font-weight: 600;
  color: var(--dca-text-primary, #1d2129);
}

.card-subtitle {
  font-size: var(--dca-font-sm, 12px);
  color: var(--dca-text-tertiary, #86909c);
}

.card-desc {
  margin: 8px 0;
  font-size: var(--dca-font-md, 13px);
  line-height: 1.5;
  color: var(--dca-text-secondary, #4e5969);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.card-side {
  flex: none;
  width: 132px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: space-between;
  gap: 6px;
  text-align: right;
}

.quality-score {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: 2px solid var(--card-accent, #165dff);
  background: var(--dca-bg-hover, #f5f7fa);
}

.quality-val {
  font-size: 17px;
  font-weight: 600;
  line-height: 1;
  color: var(--dca-text-primary, #1d2129);
}

.quality-label {
  font-size: 10px;
  color: var(--dca-text-tertiary, #86909c);
}

.card-meta {
  margin: 0;
  font-size: var(--dca-font-sm, 12px);
  line-height: 1.6;
  color: var(--dca-text-tertiary, #86909c);
}

.card-action {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: var(--dca-font-sm, 12px);
  color: var(--card-accent, #165dff);
}

/* ---------- 空态 ---------- */
.empty-state {
  padding: 36px 20px 28px;
  text-align: center;
}

.empty-svg {
  width: 180px;
  height: 135px;
  color: var(--dca-border-strong, #c9cdd4);
}

.empty-title {
  margin: 10px 0 6px;
  font-size: var(--dca-font-xl, 16px);
  color: var(--dca-text-primary, #1d2129);
}

.empty-desc {
  margin: 0 auto 18px;
  max-width: 560px;
  font-size: var(--dca-font-md, 13px);
  line-height: 1.6;
  color: var(--dca-text-tertiary, #86909c);
}

.empty-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-bottom: 20px;
}

.empty-tips {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
}

.empty-tips .keyword-chip {
  background: var(--dca-bg-hover, #f5f7fa);
}

@media (max-width: 960px) {
  .skeleton-grid,
  .result-grid {
    grid-template-columns: 1fr;
  }

  .card-side {
    width: 96px;
  }
}
</style>
