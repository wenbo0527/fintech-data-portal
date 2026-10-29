<template>
  <div class="effect-table">
    <!-- 筛选条：排序前置（进页面即可综合排序），中段筛选条件，右侧批量动作 -->
    <div class="filter-bar">
      <div class="filter-tools">
        <a-select v-model="sortDraft" :options="sortOptions" size="small" class="f-sort" @change="applySort" />
        <a-button size="small" type="text" class="f-order" @click="toggleOrder">
          {{ sortOrders[0] === 'asc' ? '升序' : '降序' }}
          <icon-arrow-down v-if="sortOrders[0] !== 'asc'" />
          <icon-arrow-up v-else />
        </a-button>
        <a-tooltip content="点击列头切换排序方向，Shift+点击添加次级排序，数字表示排序优先级">
          <icon-question-circle class="sort-hint-icon" />
        </a-tooltip>
        <span class="f-sep" />
      </div>

      <div class="filter-group">
        <a-input
          v-model="keywordDraft"
          allow-clear
          size="small"
          placeholder="搜索变量名 / Code / ID"
          class="f-keyword"
          @press-enter="flushKeyword"
        >
          <template #prefix><icon-search /></template>
        </a-input>

        <a-select v-model="local.platform" :options="platformOptions" allow-clear allow-search placeholder="平台" size="small" class="f-item" @change="(v) => patch({ platform: v, page: 1 })" />
        <a-select v-model="local.variableType" :options="variableTypeOptions" allow-clear placeholder="变量类型" size="small" class="f-item" @change="(v) => patch({ variableType: v, page: 1 })" />
        <a-input-number v-model="local.minCalls" :min="0" :step="10" placeholder="最小月调用量" size="small" class="f-calls" @change="(v) => patch({ minCalls: v || 0, page: 1 })" />
      </div>

      <div class="filter-actions">
        <a-button size="small" :disabled="!selectedKeys.length" @click="markSelected">
          批量标记<template v-if="selectedKeys.length">（{{ selectedKeys.length }}）</template>
        </a-button>
        <a-button size="small" type="text" @click="resetFilters">清空筛选</a-button>
      </div>

      <!-- 量级 / 占比 / lift 数值下限：与渠道、变量筛选并列，空值即不筛 -->
      <div class="filter-advanced">
        <span class="fa-label">量级下限</span>
        <a-input-number
          v-model="local.minGrantCalls"
          :min="0"
          :step="1"
          size="small"
          placeholder="授信量级（万次）"
          class="f-num"
          @change="(v) => patch({ minGrantCalls: numOrUndef(v), page: 1 })"
        />
        <a-input-number
          v-model="local.minLoanCalls"
          :min="0"
          :step="1"
          size="small"
          placeholder="支用量级（万次）"
          class="f-num"
          @change="(v) => patch({ minLoanCalls: numOrUndef(v), page: 1 })"
        />
        <span class="fa-label">占比下限</span>
        <a-input-number
          v-model="local.minGrantRatio"
          :min="0"
          :max="100"
          :precision="1"
          size="small"
          placeholder="授信占比 %"
          class="f-num"
          @change="(v) => patch({ minGrantRatio: numOrUndef(v), page: 1 })"
        />
        <a-input-number
          v-model="local.minLoanRatio"
          :min="0"
          :max="100"
          :precision="1"
          size="small"
          placeholder="支用占比 %"
          class="f-num"
          @change="(v) => patch({ minLoanRatio: numOrUndef(v), page: 1 })"
        />
        <span class="fa-label">lift</span>
        <a-input-number
          v-model="local.minLift"
          :min="0"
          :step="0.1"
          :precision="2"
          size="small"
          placeholder="lift 下限"
          class="f-num"
          @change="(v) => patch({ minLift: numOrUndef(v), page: 1 })"
        />
        <a-select
          v-model="local.liftVsMean"
          :options="liftCompareOptions"
          allow-clear
          size="small"
          placeholder="相对 lift 均值"
          class="f-compare"
          @change="(v) => patch({ liftVsMean: v || undefined, page: 1 })"
        />
      </div>
    </div>

    <!-- Y 标签 + 时间区间：只影响结果列，选择写入 URL query -->
    <div class="y-switch">
      <span class="y-switch-label">Y 标签</span>
      <a-select
        :model-value="yDraft"
        :options="yOptions"
        size="small"
        class="f-y"
        @change="applyY"
      />
      <span class="y-switch-label">时间区间</span>
      <a-select
        :model-value="monthsDraft"
        :options="allMonthsOptions"
        size="small"
        class="f-months"
        multiple
        :max-tag-count="2"
        placeholder="选择观察月"
        @change="applyMonths"
      />
      <span class="y-switch-hint">{{ months.length }} 个月{{ monthRangeText ? `：${monthRangeText}` : '' }}</span>
    </div>

    <a-table
      row-key="variableId"
      :data="rows"
      :loading="loading"
      :pagination="pagination"
      :scroll="{ x: scrollX, y: 520 }"
      size="small"
      :column-hover="true"
      v-model:expanded-keys="expandedKeys"
      v-model:selectedKeys="selectedKeys"
      :row-selection="{ type: 'checkbox', showCheckedAll: true, width: 44 }"
      @page-change="onPageChange"
      @page-size-change="onPageSizeChange"
    >
      <template #columns>
        <a-table-column title="变量" data-index="name" :width="230" fixed="left">
          <template #title>
            <SortTh field="name" label="变量" :sort-by="sortField" :sort-order="sortOrder" @sort="toggleSort" @sort-add="addSortField" />
          </template>
          <template #cell="{ record }">
            <div class="cell-name">
              <a-link @click="emit('open-detail', record.variableId)">{{ record.name }}</a-link>
              <span class="cell-code">{{ record.code }}</span>
              <a-tag v-if="record.synthetic" size="small" class="tag-syn">演示合成</a-tag>
            </div>
          </template>
        </a-table-column>

        <a-table-column title="结论" data-index="verdictLabel" :width="78" />

        <!-- 变量类型：外数 / 行为变量 / 征信变量，取代原「来源」列 -->
        <a-table-column title="变量类型" data-index="variableTypeLabel" :width="92" />

        <!-- 平台（渠道）= 使用变量策略的业务平台，枚举 20+，tooltip 列出接入明细 -->
        <a-table-column :width="94">
          <template #title>
            <SortTh field="platformCount" label="平台" :sort-by="sortField" :sort-order="sortOrder" @sort="toggleSort" @sort-add="addSortField" />
          </template>
          <template #cell="{ record }">
            <a-tooltip v-if="record.platforms.length" :content="record.platforms.join('、')">
              <span class="num">{{ record.platformCount }} 个</span>
            </a-tooltip>
            <span v-else class="num muted">0 个</span>
          </template>
        </a-table-column>

        <!-- 价格：枚举口径（免费 / 低 / 中 / 高），文案与颜色均由枚举值映射 -->
        <a-table-column :width="84">
          <template #title>
            <SortTh field="priceLevel" label="价格" :sort-by="sortField" :sort-order="sortOrder" @sort="toggleSort" @sort-add="addSortField" />
          </template>
          <template #cell="{ record }">
            <a-tag :color="priceColor(record.priceLevel)" size="small">{{ record.priceLevelLabel }}</a-tag>
          </template>
        </a-table-column>

        <!-- 获客结构：授信 / 支用在月调用量中的量级与占比（列头均可点击排序） -->
        <a-table-column :width="136">
          <template #title>
            <SortTh field="grantCalls" label="授信量级（万次）" :sort-by="sortField" :sort-order="sortOrder" @sort="toggleSort" @sort-add="addSortField" />
          </template>
          <template #cell="{ record }"><span class="num">{{ record.grantCalls }}</span></template>
        </a-table-column>
        <a-table-column :width="104">
          <template #title>
            <SortTh field="grantRatio" label="授信量级占比" :sort-by="sortField" :sort-order="sortOrder" @sort="toggleSort" @sort-add="addSortField" />
          </template>
          <template #cell="{ record }"><span class="num">{{ record.grantRatioText }}</span></template>
        </a-table-column>
        <a-table-column :width="136">
          <template #title>
            <SortTh field="loanCalls" label="支用量级（万次）" :sort-by="sortField" :sort-order="sortOrder" @sort="toggleSort" @sort-add="addSortField" />
          </template>
          <template #cell="{ record }"><span class="num">{{ record.loanCalls }}</span></template>
        </a-table-column>
        <a-table-column :width="104">
          <template #title>
            <SortTh field="loanRatio" label="支用量级占比" :sort-by="sortField" :sort-order="sortOrder" @sort="toggleSort" @sort-add="addSortField" />
          </template>
          <template #cell="{ record }"><span class="num">{{ record.loanRatioText }}</span></template>
        </a-table-column>

        <!-- Y 标签结果列（月份数由时间区间决定，列头随 store 下发动态生成） -->
        <a-table-column v-for="(month, idx) in months" :key="month" :width="98">
          <template #title>{{ month }}</template>
          <template #cell="{ record }">
            <div class="y-cell" :title="`${record.yLabel} · ${month} · ${record.yMonths?.[idx]?.judge || ''}`">
              <span class="num" :class="judgeClass(record.yMonths?.[idx]?.judge)">{{ record.yMonths?.[idx]?.text }}</span>
              <span v-if="record.yMonths?.[idx]?.deltaText" class="y-delta">{{ record.yMonths[idx].deltaText }}</span>
            </div>
          </template>
        </a-table-column>

        <!-- 当前 Y 标签的 lift 与全库 lift 均值：> 1.00 为优于全库均值 -->
        <a-table-column :width="92">
          <template #title>
            <SortTh field="lift" label="lift" :sort-by="sortField" :sort-order="sortOrder" @sort="toggleSort" @sort-add="addSortField" />
          </template>
          <template #cell="{ record }">
            <span class="num strong" :class="liftClass(record.lift)">{{ record.liftText }}</span>
          </template>
        </a-table-column>
        <a-table-column :width="110">
          <template #title>
            <SortTh field="liftMean" label="lift 均值" :sort-by="sortField" :sort-order="sortOrder" @sort="toggleSort" @sort-add="addSortField" />
          </template>
          <template #cell="{ record }"><span class="num muted">{{ record.liftMeanText }}</span></template>
        </a-table-column>

        <a-table-column :width="126">
          <template #title>
            <SortTh field="effectIndex" label="综合效果指数" :sort-by="sortField" :sort-order="sortOrder" @sort="toggleSort" @sort-add="addSortField" />
          </template>
          <template #cell="{ record }">
            <span class="num strong">{{ record.effectIndex }}</span>
            <span class="delta">{{ deltaText(record) }}</span>
          </template>
        </a-table-column>

        <a-table-column title="赞 / 评论" :width="92">
          <template #cell="{ record }">
            <span class="num">{{ record.likes }} / {{ record.comments }}</span>
          </template>
        </a-table-column>

        <a-table-column title="操作" :width="140" fixed="right">
          <template #cell="{ record }">
            <a-space :size="6">
              <a-link @click="emit('open-detail', record.variableId)">详情</a-link>
              <a-link v-if="canMark" @click="markOne(record)">标记</a-link>
              <span v-if="record.marked" class="marked-flag">已标记·{{ markTypeText(record.markType) }}</span>
            </a-space>
          </template>
        </a-table-column>
      </template>

      <!-- 行内展开：一次只展开一行，数据按需从 store 取并缓存，筛选变更时缓存清空 -->
      <template #expanded-row="{ record }">
        <ExpandedEffectRow v-if="expandCache[record.variableId]" :data="expandCache[record.variableId]" />
        <div v-else class="expand-loading">明细加载中…</div>
      </template>

      <!-- 六态渲染：状态由 store 判定，组件只做文案映射 -->
      <template #empty>
        <div class="empty-state">
          <a-empty :image="false" :description="emptyDescription" />
          <div class="empty-actions">
            <a-button v-if="isError" type="primary" size="small" @click="emit('retry')">重试</a-button>
            <a-button v-if="state === 'empty_filter'" size="small" @click="resetFilters">清空筛选</a-button>
          </div>
        </div>
      </template>
    </a-table>

    <!-- Top20 → 展开全部：全量条数来自 result.fullCount -->
    <div v-if="mode === 'top' && result.fullCount > rows.length && !isError" class="expand-all">
      当前展示 Top {{ rows.length }}，共 {{ result.fullCount }} 个
      <a-link @click="emit('change', { mode: 'all', page: 1 })">展开全部 {{ result.fullCount }} 个</a-link>
    </div>

    <MarkDialog
      v-model:visible="markVisible"
      :ids="markIds"
      :names="markNames"
      @done="onMarked"
    />
  </div>
</template>

<script setup>
/**
 * 变量效果推荐列表（受控组件）
 *
 * 设计约束：
 * 1. 组件不产汇总数、不做筛选/排序实现——所有数据来自 effectStore.listRows(params)；
 * 2. 用户操作统一转成 params patch 通过 `change` 事件抛给页面，由页面写入 URL query；
 * 3. 搜索框 300ms 防抖，且任何筛选变更都把 page 重置为 1；
 * 4. 展开一次一行 + 按需请求 + 缓存随筛选变更清空；
 * 5. 六态（loading / empty_filter / empty_data / error_network / error_server / none）由 store 返回的 state 驱动。
 */
import { computed, reactive, ref, watch } from 'vue'
import { Message } from '@arco-design/web-vue'
import { IconSearch, IconArrowUp, IconArrowDown, IconQuestionCircle } from '@arco-design/web-vue/es/icon'
import ExpandedEffectRow from './ExpandedEffectRow.vue'
import MarkDialog from './MarkDialog.vue'
import SortTh from './SortTh.vue'
import { effectStore } from '@/modules/variable-hub/mock/effect-evaluation/effect-store'
import { effectOpinionStore, MARK_TYPE_LABELS } from '@/modules/variable-hub/mock/effect-evaluation/opinion-store'
import { UserContext, PERMISSIONS } from '@/modules/variable-hub/mock/risk-feature/permissions'

const props = defineProps({
  /** 当前 tab：all / offline / online / neutral */
  tab: { type: String, default: 'all' },
  /** URL 直译而来的列表入参 */
  params: { type: Object, default: () => ({}) },
  /** effectStore.listRows() 返回值 */
  result: { type: Object, default: () => ({ total: 0, rows: [], fullCount: 0, page: 1, pageSize: 50, state: 'none' }) },
  loading: { type: Boolean, default: false },
  /** 筛选项字典（页面调 effectStore.filterOptions() 传入） */
  options: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['change', 'retry', 'open-detail', 'mark'])

const keywordDraft = ref(props.params.keyword || '')
const sortDraft = ref(props.params.sortBy || 'effectIndex')
const expandedKeys = ref([])
const selectedKeys = ref([])
const expandCache = reactive({})
const markVisible = ref(false)
const markIds = ref([])
const markNames = ref([])

/** 本地筛选草稿：与 URL params 单向对齐，变更即抛 patch */
const local = reactive({
  platform: props.params.platform || undefined,
  /** 变量类型：外数 / 行为变量 / 征信变量（替代原来源筛选） */
  variableType: props.params.variableType || undefined,
  minCalls: props.params.minCalls || 0,
  /** 量级（万次）、占比（%）与 lift 下限：空值 / 0 均视为不筛 */
  minGrantCalls: props.params.minGrantCalls || undefined,
  minLoanCalls: props.params.minLoanCalls || undefined,
  minGrantRatio: props.params.minGrantRatio || undefined,
  minLoanRatio: props.params.minLoanRatio || undefined,
  minLift: props.params.minLift || undefined,
  /** 与 lift 均值的关系：above（优于均值）/ below（低于均值） */
  liftVsMean: props.params.liftVsMean || undefined
})

const rows = computed(() => props.result.rows)
const state = computed(() => props.result.state)
const isError = computed(() => state.value === 'error_network' || state.value === 'error_server')
const mode = computed(() => (props.params.mode === 'all' ? 'all' : 'top'))
const canMark = computed(() => UserContext.has(PERMISSIONS.MARK_EFFECT))

/** 分页配置：Top20 模式下不显示分页器 */
const pagination = computed(() =>
  mode.value === 'top'
    ? false
    : {
        current: props.result.page,
        pageSize: props.result.pageSize,
        total: props.result.total,
        pageSizeOptions: [50, 20, 100],
        showTotal: true,
        showJumper: true
      }
)

/** 空态文案：六态 → 一句人话 */
const emptyDescription = computed(() => {
  const map = {
    loading: '数据加载中…',
    empty_filter: '没有符合当前筛选条件的变量',
    empty_data: '本期效果域暂无可评估变量',
    error_network: '网络异常，效果数据拉取失败',
    error_server: '跑批结果服务异常，暂时无法读取',
    none: '暂无数据'
  }
  return map[state.value] || map.none
})

const platformOptions = computed(() => (props.options.platforms || []).map(toOpt))
const variableTypeOptions = computed(() => (props.options.variableTypes || []).map(toOpt))
const sortOptions = computed(() => (props.options.sortKeys || []).map(toOpt))
/** lift 与均值关系筛选选项（选项与文案均由 store 下发） */
const liftCompareOptions = computed(() => (props.options.liftCompare || []).map(toOpt))
/** 当前排序字段与方向：列头高亮与箭头方向都由此驱动（支持多字段） */
const sortField = computed(() => props.params.sortBy || 'effectIndex')
const sortOrder = computed(() => props.params.sortOrder || 'desc')
/** 排序字段列表（数组形式） */
const sortFields = computed(() => sortField.value.split(',').map((s) => s.trim()).filter(Boolean))
/** 排序方向列表（数组形式） */
const sortOrders = computed(() => sortOrder.value.split(',').map((s) => s.trim()))

/** Y 标签选项与月份列头：均由 store 下发，组件不硬编码 */
const yOptions = computed(() => props.options.yLabels || [])
const months = computed(() => props.options.months || [])
/** 默认 Y 标签（第一个指标）：选中默认值时不写 URL，保持链接干净 */
const defaultY = computed(() => yOptions.value[0]?.value || '')
const yDraft = ref(props.params.y || defaultY.value)
/** 时间区间：多选月份，由 URL ?months= 逗号分隔直译，默认近 4 个月 */
const allMonthsOptions = computed(() =>
  (props.options.allMonths || []).map((m) => ({ label: m, value: m }))
)
/** 默认月份：取 options.defaultMonths（由 store 算好的近 4 个月） */
const defaultMonths = computed(() => props.options.defaultMonths || [])
const monthsDraft = ref(parseMonthsParam(props.params.months, defaultMonths.value))
/** 横向滚动宽度：基准按 4 个月列宽算，每多一个月加一列宽 */
const scrollX = computed(() => 2040 + Math.max(0, months.value.length - 4) * 98)
const monthRangeText = computed(() => {
  const list = months.value
  return list.length ? `${list[0]} ~ ${list[list.length - 1]}` : ''
})

/**
 * 解析 URL 中的 months 参数：逗号分隔的月份字符串
 * @param {string} raw URL 原始值
 * @param {string[]} fallback 默认月份
 * @returns {string[]} 月份数组
 */
function parseMonthsParam(raw, fallback) {
  if (typeof raw === 'string' && raw) {
    const list = raw.split(',').map((s) => s.trim()).filter(Boolean)
    if (list.length) return list
  }
  return [...fallback]
}

/** 浏览器前进/后退导致 Y 标签变化时回填切换条 */
watch(
  () => props.params.y,
  (v) => {
    const next = v || defaultY.value
    if (next && next !== yDraft.value) yDraft.value = next
  }
)

/** 浏览器前进/后退导致月份变化时回填多选框 */
watch(
  () => props.params.months,
  (v) => {
    const next = parseMonthsParam(v, defaultMonths.value)
    if (next.join(',') !== monthsDraft.value.join(',')) monthsDraft.value = next
  }
)

/**
 * 切换 Y 标签：只影响结果列，重置到第 1 页
 * @param {string} v 指标键（MetricKey）
 */
function applyY(v) {
  emit('change', { y: v === defaultY.value ? undefined : v, page: 1 })
}

/**
 * 切换时间区间（多选月份）：改结果列月份，记录进 URL
 * @param {string[]} values 选中的月份列表
 */
function applyMonths(values) {
  const list = Array.isArray(values) ? values.map(String) : []
  // 与默认月份相同时不写 URL，保持链接干净
  const isDefault = list.join(',') === defaultMonths.value.join(',')
  emit('change', { months: isDefault ? undefined : list.join(','), page: 1 })
}

/**
 * 判断文案 → 颜色类名（好/差/持平），文字判断仍由 title 提示给出
 * @param {string} judge 判断标签
 */
function judgeClass(judge) {
  if (judge === '好') return 'good'
  if (judge === '差') return 'bad'
  return ''
}

/**
 * lift 数值 → 颜色类名：≥ 1.00 优于全库均值，< 1.00 低于全库均值
 * @param {number} lift 倍数
 */
function liftClass(lift) {
  if (!lift) return 'muted'
  return lift >= 1 ? 'good' : 'bad'
}

/**
 * 输入框清空 → undefined，避免把 0 写进 URL
 * @param {number|string} v 输入值
 */
function numOrUndef(v) {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

/**
 * 价格枚举 → Arco Tag 颜色（免费灰 / 低绿 / 中橙 / 高红）
 * 只做颜色映射，枚举文案由 store 下发，避免组件硬编码业务文案
 * @param {string} level 价格枚举
 */
function priceColor(level) {
  if (level === 'free') return 'gray'
  if (level === 'low') return 'green'
  if (level === 'medium') return 'orange'
  if (level === 'high') return 'red'
  return 'gray'
}

/**
 * 选项字典 → a-select options（保留 label 原样，不补计数以免误导）
 * @param {object} o { label, value }
 */
function toOpt(o) {
  return { label: o.label, value: o.value }
}

/**
 * 抛出筛选/排序/分页变更：统一把 page 重置由调用处显式决定
 * @param {object} patch 增量参数
 */
function patch(patchObj) {
  emit('change', patchObj)
}

let keywordTimer = null

/** 搜索输入 300ms 防抖后抛给页面 */
watch(keywordDraft, (v) => {
  clearTimeout(keywordTimer)
  keywordTimer = setTimeout(() => {
    if ((props.params.keyword || '') === v.trim()) return
    emit('change', { keyword: v.trim(), page: 1 })
  }, 300)
})

/** 回车立即生效，不等防抖 */
function flushKeyword() {
  clearTimeout(keywordTimer)
  emit('change', { keyword: keywordDraft.value.trim(), page: 1 })
}

/** 浏览器前进/后退导致 keyword 变化时回填输入框 */
watch(
  () => props.params.keyword,
  (v) => {
    if ((v || '') !== keywordDraft.value) keywordDraft.value = v || ''
  }
)

/** URL 排序字段变化时同步下拉框 */
watch(
  () => props.params.sortBy,
  (v) => {
    if (v) sortDraft.value = v
  }
)

/**
 * 应用排序：默认降序，切字段回到降序首页（清空次级排序）
 * @param {string} v 排序字段
 */
function applySort(v) {
  emit('change', { sortBy: v, sortOrder: 'desc', page: 1 })
}

/** 切换升降序（仅影响主排序字段的方向） */
function toggleOrder() {
  const curOrders = sortOrders.value
  const newOrders = curOrders.map((o) => (o === 'desc' ? 'asc' : 'desc'))
  emit('change', { sortOrder: newOrders.join(','), page: 1 })
}

/**
 * 列头点击排序：首次点击降序，已处于降序则翻为升序（清空次级排序）
 * @param {string} field 排序字段（store SORTABLE 白名单 key）
 */
function toggleSort(field) {
  const same = sortFields.value[0] === field
  const nextOrder = same && sortOrders.value[0] === 'desc' ? 'asc' : 'desc'
  sortDraft.value = field
  emit('change', { sortBy: field, sortOrder: nextOrder, page: 1 })
}

/**
 * Shift+点击列头：添加/移除次级排序字段
 * @param {string} field 排序字段
 */
function addSortField(field) {
  const fields = [...sortFields.value]
  const orders = [...sortOrders.value]
  const idx = fields.indexOf(field)

  if (idx >= 0) {
    // 已存在，移除
    fields.splice(idx, 1)
    orders.splice(idx, 1)
  } else {
    // 不存在，添加（默认降序）
    fields.push(field)
    orders.push('desc')
  }

  // 至少保留一个排序字段
  if (fields.length === 0) {
    fields.push('effectIndex')
    orders.push('desc')
  }

  emit('change', { sortBy: fields.join(','), sortOrder: orders.join(','), page: 1 })
}

/** 清空所有筛选条件（保留 tab、Y 标签与排序） */
function resetFilters() {
  local.platform = undefined
  local.variableType = undefined
  local.minCalls = 0
  local.minGrantCalls = undefined
  local.minLoanCalls = undefined
  local.minGrantRatio = undefined
  local.minLoanRatio = undefined
  local.minLift = undefined
  local.liftVsMean = undefined
  keywordDraft.value = ''
  emit('change', {
    keyword: undefined,
    platform: undefined,
    variableType: undefined,
    minCalls: undefined,
    minGrantCalls: undefined,
    minLoanCalls: undefined,
    minGrantRatio: undefined,
    minLoanRatio: undefined,
    minLift: undefined,
    liftVsMean: undefined,
    page: 1
  })
}

/** 分页变化 */
function onPageChange(page) {
  emit('change', { page })
}

/** 每页条数变化：重置到第 1 页 */
function onPageSizeChange(size) {
  emit('change', { pageSize: size, page: 1 })
}

/**
 * 展开行：一次只保留一行，明细按需请求并缓存
 * @param {string[]} keys 当前展开的 key 集合
 */
watch(expandedKeys, (keys) => {
  const next = keys.length ? [keys[keys.length - 1]] : []
  if (next.length !== keys.length) {
    expandedKeys.value = next
    return
  }
  next.forEach((id) => {
    if (!expandCache[id]) {
      const detail = effectStore.expandRow(String(id))
      if (detail) expandCache[id] = detail
    }
  })
})

/** 筛选条件或 Y 标签或月份变化即清空展开缓存与展开态，避免展示过期明细 */
watch(
  () => [
    props.tab,
    props.params.keyword,
    props.params.platform,
    props.params.variableType,
    props.params.minCalls,
    props.params.minGrantCalls,
    props.params.minLoanCalls,
    props.params.minGrantRatio,
    props.params.minLoanRatio,
    props.params.minLift,
    props.params.liftVsMean,
    props.params.y,
    props.params.months
  ],
  () => {
    Object.keys(expandCache).forEach((k) => delete expandCache[k])
    expandedKeys.value = []
  }
)

/** 浏览器前进/后退导致筛选参数变化时回填筛选控件（避免控件与 URL 不一致） */
watch(
  () => [
    props.params.platform,
    props.params.variableType,
    props.params.minCalls,
    props.params.minGrantCalls,
    props.params.minLoanCalls,
    props.params.minGrantRatio,
    props.params.minLoanRatio,
    props.params.minLift,
    props.params.liftVsMean
  ],
  () => {
    local.platform = props.params.platform || undefined
    local.variableType = props.params.variableType || undefined
    local.minCalls = props.params.minCalls || 0
    local.minGrantCalls = props.params.minGrantCalls || undefined
    local.minLoanCalls = props.params.minLoanCalls || undefined
    local.minGrantRatio = props.params.minGrantRatio || undefined
    local.minLoanRatio = props.params.minLoanRatio || undefined
    local.minLift = props.params.minLift || undefined
    local.liftVsMean = props.params.liftVsMean || undefined
  }
)

/** 切换 tab 时清空勾选并提示（文档硬要求） */
watch(
  () => props.tab,
  () => {
    if (selectedKeys.value.length) {
      const n = selectedKeys.value.length
      selectedKeys.value = []
      Message.info(`切换页签，已清空 ${n} 个勾选`)
    }
  }
)

/** 当前列表里勾选中的行记录（用于取名字） */
const selectedRecords = computed(() => rows.value.filter((r) => selectedKeys.value.includes(r.variableId)))

/**
 * 效果指数环比文案：统一用文字描述，不用颜色单独编码
 * @param {object} record 行数据
 */
function deltaText(record) {
  const d = record.effectIndex - record.prevEffectIndex
  if (d > 0) return `较上期 +${d.toFixed(1)}`
  if (d < 0) return `较上期 ${d.toFixed(1)}`
  return '与上期持平'
}

/**
 * 标记类型文案
 * @param {string} type MarkType
 */
function markTypeText(type) {
  return MARK_TYPE_LABELS[type] || '—'
}

/** 打开批量标记弹窗 */
function markSelected() {
  markIds.value = [...selectedKeys.value]
  markNames.value = selectedRecords.value.map((r) => r.name)
  markVisible.value = true
}

/**
 * 行内标记单个变量
 * @param {object} record 行数据
 */
function markOne(record) {
  markIds.value = [record.variableId]
  markNames.value = [record.name]
  markVisible.value = true
}

/** 标记完成后清空勾选，并要求页面重新拉取列表（标记列与四数需同步） */
function onMarked(count) {
  selectedKeys.value = []
  emit('mark', count)
  emit('retry')
}
</script>

<style scoped>
.effect-table {
  margin-top: 12px;
}
.filter-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 12px;
  padding: 8px 10px;
  margin-bottom: 10px;
  background: var(--color-fill-1);
  border-radius: 6px;
}
.filter-group {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  flex: 1 1 420px;
  min-width: 0;
}
/* 排序段前置在最左：进页面即可切换综合排序维度 */
.filter-tools {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
}
.filter-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}
.y-switch {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}
.y-switch-label {
  font-size: 12px;
  color: var(--color-text-3);
}
.y-switch-hint {
  font-size: 12px;
  color: var(--color-text-3);
  margin-left: auto;
}
.y-cell {
  display: flex;
  align-items: baseline;
  gap: 4px;
}
.y-delta {
  font-size: 11px;
  color: var(--color-text-3);
}
.num.good {
  color: #00b42a;
}
.num.bad {
  color: #f53f3f;
}
.f-keyword {
  flex: 1.4 1 150px;
  min-width: 150px;
}
/* Arco Select 根节点不继承 scoped 属性，宽度必须穿透设置，否则会退回 100% 各占一行 */
.filter-group :deep(.f-item) {
  flex: 1 1 92px;
  width: auto;
  min-width: 92px;
}
.f-calls {
  flex: 1 1 104px;
  width: auto;
  min-width: 100px;
}
/* 高级筛选行：量级 / 占比 / lift 数值下限，与主筛选行自动换行排列 */
.filter-advanced {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  flex: 1 0 100%;
  padding-top: 6px;
  border-top: 1px dashed var(--color-neutral-3);
}
.fa-label {
  font-size: 12px;
  color: var(--color-text-3);
}
.filter-advanced :deep(.f-num) {
  width: 132px;
}
.filter-advanced :deep(.f-compare) {
  width: 148px;
}
.filter-tools :deep(.f-sort) {
  width: 132px;
}
/* Arco Select 根节点不继承 scoped 属性，宽度必须穿透设置 */
.y-switch :deep(.f-y) {
  width: 150px;
}
.y-switch :deep(.f-months) {
  width: 260px;
}
.f-order {
  padding: 0 4px;
}
.sort-hint-icon {
  font-size: 14px;
  color: var(--color-text-3);
  cursor: help;
  margin-left: 4px;
}
.sort-hint-icon:hover {
  color: rgb(var(--primary-6));
}
.f-sep {
  flex: 0 0 1px;
  width: 1px;
  height: 16px;
  margin: 0 2px;
  background: var(--color-neutral-3);
}
.cell-name {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.cell-code {
  font-size: 12px;
  color: var(--color-text-3);
}
.tag-syn {
  transform: scale(0.92);
}
.num {
  font-variant-numeric: tabular-nums;
}
.num.strong {
  font-weight: 600;
}
.num.muted {
  color: var(--color-text-3);
}
.delta {
  display: block;
  font-size: 12px;
  color: var(--color-text-3);
}
.marked-flag {
  font-size: 12px;
  color: var(--color-text-3);
}
.expand-loading {
  padding: 12px;
  font-size: 12px;
  color: var(--color-text-3);
}
.empty-state {
  padding: 12px 0;
}
.empty-actions {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 8px;
}
.expand-all {
  margin-top: 10px;
  font-size: 12px;
  color: var(--color-text-3);
  text-align: center;
}
</style>
