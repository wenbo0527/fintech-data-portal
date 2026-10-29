<template>
  <div class="variable-hub-page">
    <DmtPageHeader title="特征一体化管理" subtitle="以特征台账为中心，把关系探索、评估与治理动作收口在同一资产域中。">
      <template #extra>
        <a-space>
          <a-button @click="router.push('/effect-tasks')">效果任务管理</a-button>
          <a-button type="primary" @click="router.push('/variable-management')">进入特征台账</a-button>
        </a-space>
      </template>
    </DmtPageHeader>

    <!-- 指标概览：特征综述 + 效果三数合并为四个指标，不再区分资产 / 效果两套四数 -->
    <a-card :bordered="false" class="panel-card overview-card">
      <div class="overview-head">
        <span class="overview-title">指标概览</span>
        <span class="overview-hint">特征综述取台账在册口径；推荐使用 / 建议汰换 / 效果覆盖取本期跑批口径，点击可筛选下方推荐表</span>
      </div>

      <EffectNumberGroup :numbers="overviewCards" @select="onCardSelect" />
    </a-card>

    <a-row :gutter="12" class="entry-row">
      <a-col v-for="item in entries" :key="item.key" :span="8">
        <a-card class="entry-card" :bordered="false" hoverable @click="router.push(item.path)">
          <a-space>
            <span class="entry-icon" :style="{ background: item.bg, color: item.color }">{{ item.iconText }}</span>
            <div>
              <div class="entry-title">{{ item.title }}</div>
              <div class="entry-desc">{{ item.desc }}</div>
            </div>
          </a-space>
        </a-card>
      </a-col>
    </a-row>

    <!-- 效果总览 + 页内推荐表（不新增路由与菜单，四数点击 = 页内锚点 + ?tab=） -->
    <a-card title="变量效果评估" :bordered="false" class="panel-card effect-panel">
      <StatusBar :overview="overview" />

      <div id="recommend" class="recommend-anchor">
        <a-tabs v-model:active-key="activeTab" type="rounded" size="small" class="verdict-tabs">
          <a-tab-pane v-for="v in verdictTabs" :key="v.value" :title="v.label" />
        </a-tabs>

        <EffectVariableTable
          :tab="activeTab"
          :params="queryParams"
          :result="result"
          :loading="loading"
          :options="tableOptions"
          @change="applyChange"
          @retry="refresh"
          @open-detail="openDetail"
          @mark="refresh"
        />
      </div>
    </a-card>
  </div>
</template>

<script setup>
/**
 * 风险要素工作台
 *
 * 落位方案（见评估文档 §4）：
 * 1. 效果总览与页内推荐表都长在本页面，不新增独立路由与菜单项；
 * 2. 筛选 / 排序 / Tab / 页码全部写进 URL query，链接可直接分享；
 * 3. 页面不做任何 filter / reduce / sort 聚合，数字一律来自 mock store。
 */
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useVariableStore } from '@/modules/variable-hub/store/variable'
import { summarizeWorkbench } from '@/modules/variable-hub/mock/variable-management/variable-map-workbench'
import { effectStore } from '@/modules/variable-hub/mock/effect-evaluation/effect-store'
import DmtPageHeader from '@/modules/variable-hub/components/PageHeader.vue'
import StatusBar from '@/modules/variable-hub/components/effect/StatusBar.vue'
import EffectNumberGroup from '@/modules/variable-hub/components/effect/EffectNumberGroup.vue'
import EffectVariableTable from '@/modules/variable-hub/components/effect/EffectVariableTable.vue'

const router = useRouter()
const route = useRoute()
const variableStore = useVariableStore()

const entries = [
  { key: 'ledger', title: '特征台账', desc: '权威台账，状态/分类/详情档案', path: '/variable-management', iconText: '账', color: '#165dff', bg: '#f0f7ff' },
  { key: 'eval', title: '评估任务中心', desc: '批量评估/外数/内部报告回写', path: '/evaluation/tasks', iconText: '评', color: '#0fc6c2', bg: '#e6fffb' },
  { key: 'effect', title: '效果任务管理', desc: '上下线推荐跑批/阈值/推送', path: '/effect-tasks', iconText: '效', color: '#722ed1', bg: '#f5eefc' }
]

const variableList = computed(() => variableStore.variableList || [])

/** 台账视角汇总：仅用于指标概览的特征综述卡，已下沉到 mock 层 summarizeWorkbench */
const aggregate = computed(() => summarizeWorkbench(variableList.value.map((item) => String(item.id))))

// ================= 效果区：URL query 是唯一状态源 =================

/** query 短键 ↔ 列表入参字段映射（短键便于分享链接） */
const QUERY_MAP = {
  tab: 'tab',
  q: 'keyword',
  platform: 'platform',
  /** 变量类型：外数 / 行为变量 / 征信变量 */
  vt: 'variableType',
  /** Y 标签：表格结果列当前选中的指标 */
  y: 'y',
  /** 时间区间：逗号分隔的月份列表（YYYY-MM），默认近 4 个月 */
  months: 'months',
  calls: 'minCalls',
  /** 量级（万次）与占比（%）下限：列表高级筛选行 */
  gmin: 'minGrantCalls',
  lmin: 'minLoanCalls',
  grmin: 'minGrantRatio',
  lrmin: 'minLoanRatio',
  /** Y 标签 lift 下限与相对均值筛选（above / below） */
  liftmin: 'minLift',
  lvc: 'liftVsMean',
  sort: 'sortBy',
  order: 'sortOrder',
  page: 'page',
  size: 'pageSize',
  mode: 'mode'
}

/** 反向映射：字段名 → query 短键 */
const FIELD_TO_QUERY = Object.keys(QUERY_MAP).reduce((acc, k) => {
  acc[QUERY_MAP[k]] = k
  return acc
}, {})

/** URL → EffectListParams（数字字段做类型还原） */
const queryParams = computed(() => {
  const out = {}
  Object.keys(QUERY_MAP).forEach((k) => {
    const v = route.query[k]
    if (v !== undefined && v !== '') out[QUERY_MAP[k]] = String(v)
  })
  if (out.minCalls !== undefined) out.minCalls = Number(out.minCalls) || 0
  /** 高级筛选数值还原：非法 / 0 一律视为未筛 */
  ;['minGrantCalls', 'minLoanCalls', 'minGrantRatio', 'minLoanRatio', 'minLift'].forEach((k) => {
    if (out[k] !== undefined) out[k] = Number(out[k]) || undefined
  })
  if (out.page !== undefined) out.page = Number(out.page) || 1
  if (out.pageSize !== undefined) out.pageSize = Number(out.pageSize) || 50
  return out
})

const filterOpts = reactive(effectStore.filterOptions())

/** 月份列头跟随时间区间变化：只重算标签，不重建整个字典 */
const tableOptions = computed(() => {
  const monthsList = effectStore.monthsOf(queryParams.value.months)
  return {
    ...filterOpts,
    months: monthsList,
    allMonths: effectStore.allMonths(),
    defaultMonths: effectStore.defaultMonths()
  }
})

/** 页签标题文案来自 store 的 verdicts 字典 */
const verdictTabs = computed(() => filterOpts.verdicts || [])

/** 当前结论页签：URL 没写就是全部 */
const activeTab = ref(queryParams.value.tab || 'all')

const overview = ref(effectStore.overview())

/**
 * 指标概览四卡：特征综述（台账在册）+ 效果三数（本期跑批）
 * 效果三数的 anchor / tab 来自 store，点击写 URL 并滚动到推荐表；特征综述带 route 直接跳台账
 */
const overviewCards = computed(() => {
  const pick = (key) => overview.value.numbers.find((n) => n.key === key)
  const coverage = pick('coverage')
  const online = pick('online')
  const offline = pick('offline')
  return [
    {
      key: 'ledger',
      label: '特征综述',
      value: aggregate.value.total,
      unit: '个',
      deltaLabel: `高风险 ${aggregate.value.high} 个 · 待处理 ${aggregate.value.pending} 个`,
      route: '/variable-management'
    },
    online && { ...online, label: '推荐使用' },
    offline && { ...offline, label: '建议汰换' },
    coverage && { ...coverage, label: '效果覆盖' }
  ].filter(Boolean)
})

/**
 * 指标卡点击：带 route 的跳页面，其余走页内锚点 + ?tab=
 * @param {object} payload { key, anchor, tab, route }
 */
function onCardSelect(payload) {
  if (payload.route) {
    router.push(payload.route)
    return
  }
  pickNumber(payload)
}

const result = ref(effectStore.listRows({ ...queryParams.value, tab: activeTab.value }))
const loading = ref(false)

/** 同步 activeTab ← URL（浏览器前进后退 / 四数卡点击） */
watch(
  () => route.query.tab,
  (v) => {
    const next = String(v || 'all')
    if (next !== activeTab.value) activeTab.value = next
  }
)

/** 写 URL：undefined / 空串删除键，其余转字符串 */
function applyChange(patch) {
  const next = { ...route.query }
  Object.keys(patch).forEach((field) => {
    const key = FIELD_TO_QUERY[field] || field
    const val = patch[field]
    if (val === undefined || val === null || val === '') delete next[key]
    else next[key] = String(val)
  })
  router.replace({ query: next })
}

/**
 * 拉取列表数据：mock 同步返回，用极短延时体现 loading 态
 */
function refresh() {
  loading.value = true
  window.setTimeout(() => {
    result.value = effectStore.listRows({ ...queryParams.value, tab: activeTab.value })
    overview.value = effectStore.overview()
    loading.value = false
  }, 120)
}

/** URL 变化即重新拉数（唯一的取数触发源，避免与页签 watch 双触发） */
watch(() => route.query, refresh, { deep: true })

/** 手动切页签回写 URL：URL 才是状态源，页签只是它的镜像 */
watch(activeTab, (v) => {
  const qTab = String(route.query.tab || 'all')
  if (v === qTab) return
  applyChange({ tab: v === 'all' ? undefined : v, page: undefined, mode: undefined })
})

/**
 * 效果四数点击：写 ?tab= 并滚动到页内推荐表锚点
 * @param {object} payload { anchor, tab, key }
 */
function pickNumber(payload) {
  applyChange({ tab: payload.tab === 'all' ? undefined : payload.tab, page: undefined, mode: undefined })
  const el = document.getElementById(payload.anchor)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

/**
 * 跳转特征详情页效果 Tab，并带上来路用于返回还原
 * @param {string} variableId 变量 ID（含演示合成 ID）
 */
function openDetail(variableId) {
  /** 详情页标签效果按 6 个 Y 标签全量展示，不再带列表的 Y / 区间；平台筛选仍带过去 */
  const query = { tab: 'effect', from: 'variable-hub' }
  if (queryParams.value.platform) query.platform = queryParams.value.platform
  router.push({
    path: `/variable-management/detail/${variableId}`,
    query
  })
}

onMounted(async () => {
  if (!variableStore.variableList?.length) {
    await variableStore.fetchVariableList({ pageSize: 100 })
  }
  // 深链进入（带 ?tab= / ?q=）时确保滚动到推荐表
  if (Object.keys(queryParams.value).length) {
    const el = document.getElementById('recommend')
    if (el) el.scrollIntoView({ block: 'start' })
  }
})
</script>

<style scoped>
.overview-card {
  margin-bottom: 16px;
}
.overview-head {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 4px 10px;
  margin-bottom: 12px;
}
.overview-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-1);
}
.overview-hint {
  font-size: 12px;
  color: var(--color-text-3);
}
.entry-row {
  margin: 16px 0;
}
.entry-card {
  cursor: pointer;
  border: 1px solid var(--color-border-2);
  transition: all 0.2s;
}
.entry-card:hover {
  box-shadow: 0 4px 12px rgba(15, 35, 95, 0.1);
  border-color: #165dff;
}
.entry-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 600;
  flex-shrink: 0;
}
.entry-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-1);
}
.entry-desc {
  font-size: 12px;
  color: var(--color-text-3);
  margin-top: 2px;
}
.effect-panel {
  margin-bottom: 16px;
}
.recommend-anchor {
  margin-top: 16px;
  scroll-margin-top: 12px;
}
.verdict-tabs {
  margin-bottom: 4px;
}
</style>
