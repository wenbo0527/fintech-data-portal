<template>
  <div class="effect-card">
    <!-- 无效果域数据：明确空态，不让用户面对空白页签 -->
    <a-empty v-if="!detail" description="该变量未进入本期效果评估样本（效果域 412 个），暂无效果结论">
      <a-link @click="goOverview">查看效果总览</a-link>
    </a-empty>

    <template v-else>
      <!-- ========== 结论区 + 人工标记 ========== -->
      <a-card class="sub-card" size="small" :bordered="false">
        <template #title>
          <span class="sub-title">本期效果结论</span>
          <a-tag :color="verdictColor" size="small" class="verdict-tag">{{ detail.verdictLabel }}</a-tag>
        </template>
        <template #extra>
          <a-button
            v-if="canMark"
            size="mini"
            type="primary"
            @click="markVisible = true"
          >标记该变量</a-button>
        </template>

        <!-- 合成档案提示：台账外的演示变量必须声明数据来源 -->
        <a-alert
          v-if="detail.fallbackProfile"
          type="warning"
          :show-icon="true"
          class="fallback-alert"
        >
          该变量为效果域演示合成样本，不在特征台账正式资产内；本页基础信息为兜底档案，效果数据与正式变量同口径。
        </a-alert>

        <a-row :gutter="16">
          <a-col :span="15">
            <div class="reason-label">结论依据</div>
            <div class="reason-text">{{ detail.verdictReason }}</div>
            <div class="delta-row">
              <span class="delta-item">
                综合效果指数
                <strong class="delta-value">{{ currentIndex }}</strong>
              </span>
              <span class="delta-item">
                较上期
                <span class="delta-value" :class="deltaClass">{{ deltaText }}</span>
              </span>
              <span class="delta-item">
                <IconThumbUp class="delta-icon" /> {{ likeTotal }}
                <IconMessage class="delta-icon" /> {{ commentTotal }}
                <a-link class="delta-link" @click="scrollToOpinion">意见区</a-link>
              </span>
            </div>
          </a-col>
          <a-col :span="9">
            <div class="reason-label">近 {{ detail.trendLabels.length }} 期指数趋势</div>
            <!-- 一期不用图表：指数逐期直接给数据，数字由 store 下发 -->
            <div class="index-trend">
              <span v-for="(v, i) in detail.trend" :key="i" class="index-point">
                <span class="index-val">{{ v }}</span>
                <span class="index-month">{{ detail.trendLabels[i] }}</span>
              </span>
            </div>
          </a-col>
        </a-row>

        <!-- 人工标记历史：紧跟结论，标记是对结论的人工修订 -->
        <div v-if="detail.marks.length" class="marks-section">
          <div class="marks-title">人工标记（{{ detail.marks.length }}）</div>
          <a-list :data="detail.marks" size="small">
            <template #item="{ item }">
              <a-list-item>
                <div class="mark-item">
                  <div class="mark-head">
                    <a-tag size="small">{{ item.typeLabel }}</a-tag>
                    <span class="mark-who">{{ item.operator }}（{{ item.operatorRole }}）</span>
                    <span class="mark-time">{{ item.createdAt }}</span>
                  </div>
                  <div class="mark-reason">{{ item.reason }}</div>
                </div>
              </a-list-item>
            </template>
          </a-list>
        </div>
      </a-card>

      <!-- ========== 标签效果 + 使用深度（共用渠道筛选） ========== -->
      <a-card class="sub-card" size="small" :bordered="false">
        <template #title>
          <span class="sub-title">效果分析</span>
          <span class="card-hint">渠道筛选与下方使用深度联动，观察月同时影响两者</span>
        </template>
        <template #extra>
          <div class="platform-filter">
            <span class="filter-label">渠道</span>
            <a-select
              :model-value="platform"
              :options="platformOptions"
              size="small"
              class="platform-select"
              allow-search
              @change="onPlatformChange"
            />
          </div>
        </template>

        <!-- 标签效果（观察月筛选） -->
        <div class="section-block">
          <div class="section-title">标签效果</div>
          <LabelEffectPanel
            :variable-id="String(props.variableId)"
            :platform="platform"
            :months="labelMonths"
            @change="onLabelEffectChange"
          />
        </div>

        <!-- 使用深度（渠道已由上方筛选控制） -->
        <div class="section-block">
          <div class="section-title">使用深度</div>
          <ExpandedEffectRow
            :data="expanded"
            :platform-switch="false"
          />
        </div>
      </a-card>

      <!-- ========== 意见区（赞 / 评单源，与列表列一致） ========== -->
      <a-card ref="opinionCard" class="sub-card" size="small" :bordered="false" title="评估意见">
        <CommentBlock :variable-id="String(props.variableId)" @changed="reload" />
      </a-card>

      <MarkDialog
        v-model:visible="markVisible"
        :ids="[String(props.variableId)]"
        :names="[profile ? profile.name : String(props.variableId)]"
        @done="reload"
      />
    </template>
  </div>
</template>

<script setup>
/**
 * 特征详情页 · 效果评估 Tab
 * 数据全部来自 effectStore / effectOpinionStore：
 * 本页不做任何 filter / reduce / sort 聚合，赞与评论数直接取 store 单源结果。
 * 渠道切换只改展示口径（store.expandRow 第二个入参），写入 URL 便于分享与回退。
 */
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { IconThumbUp, IconMessage } from '@arco-design/web-vue/es/icon'
import ExpandedEffectRow from './ExpandedEffectRow.vue'
import LabelEffectPanel from './LabelEffectPanel.vue'
import CommentBlock from './CommentBlock.vue'
import MarkDialog from './MarkDialog.vue'
import { effectStore } from '@/modules/variable-hub/mock/effect-evaluation/effect-store'
import { effectOpinionStore } from '@/modules/variable-hub/mock/effect-evaluation/opinion-store'
import { UserContext, PERMISSIONS } from '@/modules/variable-hub/mock/risk-feature/permissions'

const props = defineProps({
  /** 特征 ID：既可能是台账 ID，也可能是效果域合成 ID（VAR-EFF-xxxx） */
  variableId: { type: String, required: true }
})

const router = useRouter()
const route = useRoute()

const markVisible = ref(false)
const opinionCard = ref(null)
const detail = ref(null)
const expanded = ref(null)
const profile = ref(null)
const counters = ref({ likes: 0, comments: 0 })
/** 当前选中的策略渠道（空 = 全部渠道），与列表页 ?platform= 同一键 */
const platform = ref(typeof route.query.platform === 'string' ? route.query.platform : '')
/** 标签效果的观察月多选（空数组 = 最新月），与列表页 ?om= 同一键（逗号分隔） */
const labelMonths = ref(parseMonthQuery(route.query.om))

/**
 * 解析 ?om=：逗号分隔的月份列表（多选月份）
 * @param {unknown} v query 原始值
 * @returns {string[]} 月份数组（未校验合法性，非法月由 store 回落）
 */
function parseMonthQuery(v) {
  if (typeof v !== 'string' || !v) return []
  return v.split(',').map((s) => s.trim()).filter(Boolean)
}

/** 人工标记权限（无权限只隐藏入口，不影响只读展示） */
const canMark = computed(() => UserContext.has(PERMISSIONS.MARK_EFFECT))

/** 结论标签配色：文字仍是主判断，颜色只做辅助 */
const verdictColor = computed(() => {
  const v = detail.value?.verdict
  if (v === 'online') return 'green'
  if (v === 'offline') return 'red'
  return 'gray'
})

/** 最新一期综合效果指数 */
const currentIndex = computed(() => detail.value?.trend?.[detail.value.trend.length - 1] ?? '-')

/** 环比文案：正数带 + 号 */
const deltaText = computed(() => {
  const d = detail.value?.indexDelta ?? 0
  return d > 0 ? `+${d}` : `${d}`
})

const deltaClass = computed(() => {
  const d = detail.value?.indexDelta ?? 0
  if (d > 0) return 'delta-good'
  if (d < 0) return 'delta-bad'
  return 'delta-flat'
})

const likeTotal = computed(() => counters.value.likes)
const commentTotal = computed(() => counters.value.comments)

/** 渠道选项：全部渠道 + 该变量绑定渠道，由 expanded 数据驱动 */
const platformOptions = computed(() => {
  const usage = expanded.value?.platformUsage || []
  return [
    { label: '全部渠道', value: '' },
    ...usage.map((row) => ({
      label: `${row.platform}（${row.callsText} 万次）`,
      value: row.platform
    }))
  ]
})

/**
 * 重新拉取本变量的效果数据（标记 / 发表意见后调用，保证赞评与名单同步）
 * 赞、评论数直接取 opinion-store 单源，与推荐列表列口径完全一致
 * @returns {void}
 */
function reload() {
  const id = String(props.variableId)
  detail.value = effectStore.variableEffect(id)
  expanded.value = effectStore.expandRow(id, platform.value || undefined, labelMonths.value)
  profile.value = effectStore.profile(id)
  counters.value = {
    likes: effectOpinionStore.likesOf(id),
    comments: effectOpinionStore.commentsOf(id)
  }
}

/**
 * 切换使用渠道：同步 URL 后只重算展开区口径（结论与趋势不随渠道变化）
 * @param {string|undefined} value 渠道名；undefined = 全部渠道
 * @returns {void}
 */
function onPlatformChange(value) {
  platform.value = value || ''
  const next = { ...route.query }
  if (value) next.platform = value
  else delete next.platform
  router.replace({ query: next })
  expanded.value = effectStore.expandRow(String(props.variableId), value, labelMonths.value)
}

/**
 * 标签效果观察月切换：同时影响标签效果与使用深度（两者共用观察月口径）
 * @param {{months?: string[]}} patch 变更项
 * @returns {void}
 */
function onLabelEffectChange(patch) {
  if (!Array.isArray(patch.months)) return
  labelMonths.value = patch.months.map(String)
  const next = { ...route.query }
  if (labelMonths.value.length) next.om = labelMonths.value.join(',')
  else delete next.om
  router.replace({ query: next })
  // 观察月变化时，重新加载使用深度数据
  expanded.value = effectStore.expandRow(String(props.variableId), platform.value || undefined, labelMonths.value)
}

/** 跳到意见区（长页面内定位） */
function scrollToOpinion() {
  const el = opinionCard.value?.$el || opinionCard.value
  if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

/** 回效果总览页 */
function goOverview() {
  router.push('/variable-hub')
}

watch(() => props.variableId, reload, { immediate: true })

/** 前进 / 后退时按 URL 回放渠道选择；非法渠道由 store 回落为全部渠道 */
watch(
  () => route.query.platform,
  (v) => {
    const next = typeof v === 'string' ? v : ''
    if (next === platform.value) return
    platform.value = next
    reload()
  }
)

/** 前进 / 后退时按 URL 回放观察月多选；非法月由 store 回落为最新月 */
watch(
  () => route.query.om,
  (v) => {
    const next = parseMonthQuery(v)
    if (next.join(',') !== labelMonths.value.join(',')) labelMonths.value = next
  }
)
</script>

<style scoped>
.effect-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.sub-card {
  background: var(--color-bg-2);
  border: 1px solid var(--color-neutral-3);
}
.sub-title {
  font-weight: 600;
}
.card-hint {
  font-size: 12px;
  color: var(--color-text-3);
}
.verdict-tag {
  margin-left: 8px;
}
.fallback-alert {
  margin-bottom: 12px;
}
.reason-label {
  font-size: 12px;
  color: var(--color-text-3);
  margin-bottom: 4px;
}
.reason-text {
  font-size: 13px;
  line-height: 1.7;
  color: var(--color-text-1);
}
.delta-row {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 20px;
  font-size: 12px;
  color: var(--color-text-3);
}
.delta-value {
  font-size: 14px;
  font-variant-numeric: tabular-nums;
  margin-left: 4px;
}
.delta-good {
  color: rgb(var(--green-6));
}
.delta-bad {
  color: rgb(var(--red-6));
}
.delta-flat {
  color: var(--color-text-3);
}
.delta-icon {
  margin-right: 2px;
  vertical-align: -2px;
}
.delta-link {
  margin-left: 6px;
  font-size: 12px;
}
.index-trend {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  padding-top: 4px;
}
.index-point {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 46px;
}
.index-val {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-1);
  font-variant-numeric: tabular-nums;
}
.index-month {
  font-size: 11px;
  color: var(--color-text-3);
  font-variant-numeric: tabular-nums;
}
.mark-item {
  width: 100%;
}
.mark-head {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
}
.mark-who,
.mark-time {
  color: var(--color-text-3);
}
.mark-reason {
  margin-top: 4px;
  font-size: 13px;
  line-height: 1.6;
}
.marks-section {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px dashed var(--color-neutral-3);
}
.marks-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-2);
  margin-bottom: 8px;
}
.platform-filter {
  display: flex;
  align-items: center;
  gap: 8px;
}
.filter-label {
  font-size: 12px;
  color: var(--color-text-3);
  white-space: nowrap;
}
.platform-select {
  width: 200px;
}
.section-block {
  margin-top: 16px;
}
.section-block:first-child {
  margin-top: 0;
}
.section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-2);
  margin-bottom: 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--color-neutral-3);
}
</style>
