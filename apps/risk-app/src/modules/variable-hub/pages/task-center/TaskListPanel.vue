<!--
  任务管理 · 统一任务列表（评估域 + 效果域一张表）
  - 一张列表管两域：行数据、筛选、分页、统计全部来自 taskRecordStore，面板不自己 filter / 计数
  - 类型差异不塞进列：域与类型做成标签，专属字段进各自详情载体（评估 = 抽屉，效果 = 路由页）
  - 契约状态也成一列：输入输出字段对不对齐不用进详情就能看见，引用上游评估产出的直接露出血缘
  - 「立即执行」前先跑执行前预检：只给 warning，不阻断，用户确认后才真跑
  - 操作按 task-kinds 注册的能力开关渲染；效果域写操作受 RUN_EFFECT_TASK 门控
  - 筛选状态全部写进 URL（?dm=&tk=&st=&ct=&pre=&q=&page=&size=），链接可分享、前进后退可还原
  - store 基于 localStorage 无响应式，任何写操作后都要 refresh() 重新装载
-->
<template>
  <div class="task-list-panel">
    <div class="panel-toolbar">
      <span class="toolbar-tip">
        两域任务同表管理：{{ TASK_DOMAIN_LABELS.evaluation }}按 Python 脚本口径跑批，{{ TASK_DOMAIN_LABELS.effect }}按任务级阈值出名单。
      </span>
      <a-space>
        <a-button size="small" @click="router.push('/runs')">
          <template #icon><icon-history /></template>
          执行记录
        </a-button>
        <a-button type="primary" size="small" @click="createVisible = true">
          <template #icon><icon-plus /></template>
          新建任务
        </a-button>
      </a-space>
    </div>

    <!-- 统计卡：数字固定全库口径，点击即预设筛选，与筛选结果同口径 -->
    <div class="stat-row">
      <div v-for="c in statCards" :key="c.key" class="stat-item">
        <a-card
          :bordered="false"
          class="stat-card"
          hoverable
          :class="{ 'stat-card--active': c.active }"
          @click="pickPreset(c.key)"
        >
          <a-statistic :title="c.title" :value="c.value" />
          <div class="stat-sub">{{ c.subtitle }}</div>
        </a-card>
      </div>
    </div>

    <a-card :bordered="false" class="panel-card">
      <template #title>
        <span class="panel-title">任务列表</span>
        <span class="panel-tip">执行中的任务每 30 秒自动推进进度（页面隐藏时暂停轮询）</span>
      </template>

      <div class="filter-bar">
        <a-input
          v-model="keywordDraft"
          allow-clear
          size="small"
          placeholder="搜索任务名 / 任务 ID / 负责人"
          class="f-keyword"
          :class="{ 'f-active': !!queryParams.keyword }"
          @press-enter="flushKeyword"
        >
          <template #prefix><icon-search /></template>
        </a-input>

        <!-- 四个维度筛选项成组收缩：窄屏时整组换行，不会出现单个下拉孤零零掉尾 -->
        <div class="f-filters">
          <span class="f-split" aria-hidden="true" />
          <a-select
            v-model="local.domain"
            :options="domainOpts"
            allow-clear
            placeholder="业务域"
            size="small"
            class="f-item"
            :class="{ 'f-active': !!queryParams.domain }"
            @change="(v) => applyChange({ domain: v, page: 1 })"
          />
          <a-select
            v-model="local.kind"
            :options="kindOpts"
            allow-clear
            placeholder="任务类型"
            size="small"
            class="f-item f-item--wide"
            :class="{ 'f-active': !!queryParams.kind }"
            @change="(v) => applyChange({ kind: v, page: 1 })"
          />
          <a-select
            v-model="local.status"
            :options="statusOpts"
            allow-clear
            placeholder="任务状态"
            size="small"
            class="f-item"
            :class="{ 'f-active': !!queryParams.status }"
            @change="(v) => applyChange({ status: v, page: 1 })"
          />
          <a-select
            v-model="local.contract"
            :options="contractOpts"
            allow-clear
            placeholder="契约状态"
            size="small"
            class="f-item"
            :class="{ 'f-active': !!queryParams.contractState }"
            @change="(v) => applyChange({ contractState: v, page: 1 })"
          />
        </div>

        <!-- 行尾操作区钉右，与筛选维度拉开距离，避免被当成第 5 个下拉 -->
        <div class="f-actions">
          <span v-if="activeFilterCount" class="f-count">已按 {{ activeFilterCount }} 项筛选</span>
          <a-button size="small" type="text" :disabled="!activeFilterCount" @click="resetFilters">
            <template #icon><icon-close-circle /></template>
            清空筛选
          </a-button>
        </div>
      </div>

      <a-table
        row-key="id"
        :data="rows"
        :loading="loading"
        :pagination="pagination"
        :scroll="{ x: 1720 }"
        size="small"
        @page-change="(p) => applyChange({ page: p })"
        @page-size-change="(s) => applyChange({ pageSize: s, page: 1 })"
      >
        <template #columns>
          <a-table-column title="任务" data-index="name" :width="260" fixed="left">
            <template #cell="{ record }">
              <div class="cell-name">
                <a-link @click="goDetail(record)">{{ record.name }}</a-link>
                <span class="cell-code">{{ record.id }}</span>
              </div>
            </template>
          </a-table-column>

          <a-table-column title="类型" :width="200">
            <template #cell="{ record }">
              <a-space size="mini" wrap>
                <a-tag size="small" :color="record.tagColor">{{ record.kindLabel }}</a-tag>
                <span class="cell-domain">{{ record.domainLabel }}</span>
              </a-space>
            </template>
          </a-table-column>

          <a-table-column title="调度" :width="170">
            <template #cell="{ record }">
              <div class="cell-schedule">{{ record.scheduleText }}</div>
              <div v-if="record.nextTriggerAt !== '—'" class="cell-sub">下次 {{ record.nextTriggerAt }}</div>
            </template>
          </a-table-column>

          <a-table-column title="覆盖对象" data-index="scopeText" :width="110" />

          <a-table-column title="输入输出契约" :width="170">
            <template #cell="{ record }">
              <a-tooltip :content="contractTip(record)">
                <a-tag size="small" :color="record.contract.stateColor">{{ record.contract.stateLabel }}</a-tag>
              </a-tooltip>
              <div v-if="record.contract.upstream" class="cell-lineage" :title="lineageTitle(record)">
                引用 {{ record.contract.upstream.taskName }} · {{ record.contract.upstream.fieldLabel }}
              </div>
            </template>
          </a-table-column>

          <a-table-column title="最近执行" :width="280">
            <template #cell="{ record }">
              <a-tag size="small" :color="record.lastRunResultColor">{{ record.lastRunResultLabel }}</a-tag>
              <div class="cell-summary" :title="record.lastRunSummary">{{ record.lastRunSummary }}</div>
              <div v-if="record.lastRunAt !== '—'" class="cell-sub">{{ record.lastRunAt }}</div>
            </template>
          </a-table-column>

          <a-table-column title="状态" :width="140">
            <template #cell="{ record }">
              <div class="cell-status">
                <a-tag size="small" :color="record.statusColor">{{ record.statusLabel }}</a-tag>
                <div v-if="record.running" class="progress-wrap">
                  <a-progress :percent="record.progress / 100" size="mini" :show-text="false" />
                  <span class="num progress-text">{{ record.progress }}%</span>
                </div>
              </div>
            </template>
          </a-table-column>

          <a-table-column title="负责人" data-index="owner" :width="100" />
          <a-table-column title="更新时间" data-index="updatedAt" :width="160" />

          <a-table-column title="操作" :width="240" fixed="right">
            <template #cell="{ record }">
              <a-space :size="6" wrap>
                <a-link @click="goDetail(record)">详情</a-link>
                <a-link v-if="record.actions.run" :disabled="!operable(record) || record.running" @click="runTask(record)">
                  立即执行
                </a-link>
                <a-link v-if="record.actions.toggle" :disabled="!operable(record)" @click="toggleTask(record)">
                  {{ record.enabled ? '停用' : '启用' }}
                </a-link>
                <a-link v-if="record.actions.caliber" @click="goCaliber(record)">判定配置</a-link>
                <a-link v-if="record.editPath" @click="router.push(record.editPath)">编辑</a-link>
              </a-space>
            </template>
          </a-table-column>
        </template>

        <template #empty>
          <div class="empty-state">
            <a-empty :image="false" :description="emptyDescription" />
            <div class="empty-actions">
              <a-button v-if="result.state === 'empty_data'" type="primary" size="small" @click="createVisible = true">
                新建任务
              </a-button>
              <a-button v-if="result.state === 'empty_filter'" size="small" @click="resetFilters">清空筛选</a-button>
            </div>
          </div>
        </template>
      </a-table>
    </a-card>

    <!-- 执行前预检：契约第二段只给 warning，用户确认后才真的执行 -->
    <a-modal
      v-model:visible="preCheckVisible"
      title="执行前预检"
      ok-text="仍然执行"
      cancel-text="回去看看配置"
      @ok="confirmPreCheck"
    >
      <p class="precheck-task">{{ preCheckRecord?.name }}（{{ preCheckRecord?.kindLabel }}）</p>
      <a-alert type="warning">
        <div class="precheck-head">本次执行有 {{ preCheckIssues.length }} 项提示，不阻断执行，但结果可能不完整：</div>
        <ul class="precheck-list">
          <li v-for="(item, idx) in preCheckIssues" :key="idx">{{ item.message }}</li>
        </ul>
      </a-alert>
    </a-modal>

    <!-- 新建：先选任务类型，再进各类型自己的创建页 -->
    <CreateTaskDialog v-model:visible="createVisible" />
    <!-- 评估域详情载体（抽屉），效果域走独立路由页 -->
    <EvaluationTaskDetail ref="evalDetailRef" />
  </div>
</template>

<script setup lang="ts">
/**
 * 取数与写操作约定：
 * 1. 行数据 / 统计 / 分页一律来自 taskRecordStore.list()，面板零 filter、零自算计数；
 * 2. 关键词 300ms 防抖，任何筛选变更都把 page 重置为 1；
 * 3. 30 秒轮询 effectBatchStore.tick() 推进效果域进度，document.hidden 时暂停；
 * 4. 立即执行 / 启停 走 taskRecordStore 分派到域内 store，执行必然留下一条执行记录；
 * 5. 效果域写操作受 RUN_EFFECT_TASK 权限控制，评估域沿用本域原有的无门控行为。
 */
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { IconSearch } from '@arco-design/web-vue/es/icon'
import CreateTaskDialog from './CreateTaskDialog.vue'
import EvaluationTaskDetail from './evaluation/EvaluationTaskDetail.vue'
import taskRecordStore, {
  type TaskListParams,
  type TaskListResult,
  type TaskRecord
} from '@/modules/variable-hub/mock/task-center/task-record'
import { effectBatchStore } from '@/modules/variable-hub/mock/effect-evaluation/batch-store'
import { contractStateOptions, type ContractIssue } from '@/modules/variable-hub/mock/task-center/io-contract'
import {
  TASK_DOMAIN_LABELS,
  UNIFIED_STATUS_META,
  kindOptions,
  type UnifiedTaskStatus
} from '@/modules/variable-hub/mock/task-center/task-kinds'
import { UserContext, PERMISSIONS } from '@/modules/variable-hub/mock/risk-feature/permissions'

const router = useRouter()
const route = useRoute()

/** 本面板在容器里对应的 Tab 键，写 URL 时必须保住它 */
const TAB_KEY = 'tasks'
const POLL_INTERVAL = 30000

const canRunEffect = computed(() => UserContext.has(PERMISSIONS.RUN_EFFECT_TASK))

// ================= URL query ↔ 列表入参 =================

/** query 短键 ↔ 列表入参字段（短键便于分享） */
const QUERY_MAP: Record<string, keyof TaskListParams> = {
  q: 'keyword',
  dm: 'domain',
  tk: 'kind',
  st: 'status',
  ct: 'contractState',
  pre: 'preset',
  page: 'page',
  size: 'pageSize'
}

/** 反向映射：字段名 → query 短键 */
const FIELD_TO_QUERY = Object.keys(QUERY_MAP).reduce<Record<string, string>>((acc, short) => {
  acc[QUERY_MAP[short]] = short
  return acc
}, {})

/** URL → 列表入参（数字字段做类型还原） */
const queryParams = computed<TaskListParams>(() => {
  const out: Record<string, unknown> = {}
  Object.keys(QUERY_MAP).forEach((short) => {
    const v = route.query[short]
    if (v !== undefined && v !== '') {
      out[QUERY_MAP[short]] = String(v)
    }
  })
  if (out.page !== undefined) {
    out.page = Number(out.page) || 1
  }
  if (out.pageSize !== undefined) {
    out.pageSize = Number(out.pageSize) || 10
  }
  return out as TaskListParams
})

/** 写 URL：空值删键，其余转字符串；容器的 ?tab= / ?taskId= 由调用侧决定去留 */
function applyChange(patch: Record<string, unknown>) {
  const next = { ...route.query }
  delete next.taskId
  Object.keys(patch).forEach((field) => {
    const key = FIELD_TO_QUERY[field] || field
    const val = patch[field]
    if (val === undefined || val === null || val === '') {
      delete next[key]
    } else {
      next[key] = String(val)
    }
  })
  router.replace({ query: next })
}

const keywordDraft = ref(queryParams.value.keyword || '')
const local = reactive({
  domain: queryParams.value.domain,
  kind: queryParams.value.kind,
  status: queryParams.value.status,
  contract: queryParams.value.contractState
})

/**
 * 生效中的筛选项计数：一律认 URL（queryParams），不认输入框与下拉的草稿值
 * 草稿还没防抖落进 URL 时不算生效，「已按 N 项筛选」必须与实际列表口径一致
 */
const activeFilterCount = computed(
  () => [queryParams.value.keyword, queryParams.value.domain, queryParams.value.kind, queryParams.value.status, queryParams.value.contractState].filter(Boolean).length
)

const loading = ref(false)
const result = ref<TaskListResult>(taskRecordStore.list(queryParams.value))
const rows = computed(() => result.value.rows)
const createVisible = ref(false)
const evalDetailRef = ref<InstanceType<typeof EvaluationTaskDetail> | null>(null)

/**
 * 统计卡选中态：只有 URL 真写了这个预设才算选中
 * 「任务总数」是复位卡，不预填 pre=all 就不常驻高亮，否则看起来像两个卡同时被选中
 */
function presetActive(key: string): boolean {
  return String(route.query.pre || '') === key
}

/** 统计卡：数字取 store 全库口径，点击后的筛选结果与卡片数字同口径 */
const statCards = computed(() => [
  { key: 'all', title: '任务总数', value: result.value.stats.total, subtitle: '评估 + 效果两域', active: presetActive('all') },
  { key: 'running', title: '执行中', value: result.value.stats.running, subtitle: '30 秒轮询推进进度', active: presetActive('running') },
  { key: 'pending', title: '待触发', value: result.value.stats.pending, subtitle: '含已调度', active: presetActive('pending') },
  { key: 'failed', title: '最近失败', value: result.value.stats.failed, subtitle: '看最近一次执行结果', active: presetActive('failed') },
  { key: 'paused', title: '已停用', value: result.value.stats.paused, subtitle: '停用后不再定时触发', active: presetActive('paused') },
  /** 契约卡不参与 ?pre= 预设，点下去写的是 ?ct=block，与列表同一档口径 */
  {
    key: 'contract',
    title: '契约需处理',
    value: result.value.stats.contractBlock + result.value.stats.contractWarn,
    subtitle: `不符 ${result.value.stats.contractBlock} · 待确认 ${result.value.stats.contractWarn}`,
    active: queryParams.value.contractState === 'block'
  }
])

/** 筛选下拉字典：域 / 类型 / 状态都来自注册表，面板不硬编码枚举 */
const domainOpts = computed(() =>
  Object.keys(TASK_DOMAIN_LABELS).map((d) => ({ label: TASK_DOMAIN_LABELS[d as keyof typeof TASK_DOMAIN_LABELS], value: d }))
)
const kindOpts = computed(() => kindOptions())
const contractOpts = computed(() => contractStateOptions())
const statusOpts = computed(() =>
  (Object.keys(UNIFIED_STATUS_META) as UnifiedTaskStatus[]).map((s) => ({
    label: UNIFIED_STATUS_META[s].label,
    value: s
  }))
)

/** 分页配置：总数与当前页取 store 回显值 */
const pagination = computed(() => ({
  current: result.value.page,
  pageSize: result.value.pageSize,
  total: result.value.total,
  pageSizeOptions: [10, 20, 50],
  showTotal: true,
  showJumper: true
}))

const emptyDescription = computed(() => {
  const map: Record<string, string> = {
    empty_filter: '没有符合当前筛选条件的任务',
    empty_data: '还没有任务，点右上角选类型新建',
    none: '暂无数据'
  }
  return map[result.value.state] || map.none
})

/** 拉取列表：mock 同步返回，用极短延时体现 loading 态 */
function refresh() {
  loading.value = true
  window.setTimeout(() => {
    result.value = taskRecordStore.list(queryParams.value)
    loading.value = false
  }, 120)
}

/** 轮询用静默刷新：不闪 loading，避免进度条反复抖动 */
function silentRefresh() {
  result.value = taskRecordStore.list(queryParams.value)
}

/** URL 变化即重新拉数（唯一取数触发源） */
watch(() => route.query, refresh, { deep: true })

/** 前进后退导致关键词变化时回填输入框 */
watch(
  () => queryParams.value.keyword,
  (v) => {
    if ((v || '') !== keywordDraft.value) {
      keywordDraft.value = v || ''
    }
  }
)

/** URL 筛选变化时同步下拉框草稿 */
watch(
  () => [queryParams.value.domain, queryParams.value.kind, queryParams.value.status, queryParams.value.contractState],
  ([dm, tk, st, ct]) => {
    local.domain = dm
    local.kind = tk
    local.status = st
    local.contract = ct
  }
)

let keywordTimer: number | undefined

/** 搜索输入 300ms 防抖后写 URL */
watch(keywordDraft, (v) => {
  clearTimeout(keywordTimer)
  keywordTimer = window.setTimeout(() => {
    if ((queryParams.value.keyword || '') === v.trim()) {
      return
    }
    applyChange({ keyword: v.trim(), page: 1 })
  }, 300)
})

/** 回车立即生效，不等防抖 */
function flushKeyword() {
  clearTimeout(keywordTimer)
  applyChange({ keyword: keywordDraft.value.trim(), page: 1 })
}

/** 清空筛选：本页 query 归零，只留容器 Tab 键 */
function resetFilters() {
  keywordDraft.value = ''
  local.domain = undefined
  local.kind = undefined
  local.status = undefined
  local.contract = undefined
  router.replace({ query: { tab: TAB_KEY } })
}

/** 四数卡点击：all 清空预设，其余写入 ?pre=；契约卡走 ?ct=block */
function pickPreset(key: string) {
  if (key === 'contract') {
    const next = queryParams.value.contractState === 'block' ? undefined : 'block'
    applyChange({ contractState: next, page: 1 })
    return
  }
  const current = key === 'all' ? undefined : key
  if (String(route.query.pre || 'all') === String(current || 'all')) {
    return
  }
  applyChange({ preset: current, page: 1 })
}

/** 效果域写操作要权限，评估域不受该权限约束 */
const operable = (record: TaskRecord) => record.domain !== 'effect' || canRunEffect.value

/** 契约徽标 tooltip：先说状态含义，再列具体不符项 */
function contractTip(record: TaskRecord): string {
  return record.contract.summary ? `${record.contract.tip}｜${record.contract.summary}` : record.contract.tip
}

function lineageTitle(record: TaskRecord): string {
  const up = record.contract.upstream
  if (!up) {
    return ''
  }
  const scope = up.upstreamCount ? `；扫描范围按上游覆盖收窄到 ${up.upstreamCount} 个变量` : ''
  return `输入引用评估任务「${up.taskName}」产出的「${up.fieldLabel}」（字段 ${up.field}）${scope}`
}

/** 详情分派：效果域是独立路由页，评估域用本域自封装的抽屉 */
function goDetail(record: TaskRecord) {
  if (record.detailMode === 'route') {
    router.push({ path: record.detailPath, query: { tab: 'config' } })
    return
  }
  evalDetailRef.value?.open(record)
}

/** 判定配置只有效果任务有，直达详情里的「判定配置」Tab */
function goCaliber(record: TaskRecord) {
  router.push({ path: record.detailPath, query: { tab: 'rule' } })
}

/**
 * 立即执行：先跑执行前预检（契约第二段）
 * 预检只给 warning，弹框确认后照样能跑；没提示就直接执行
 */
const runningId = ref('')
const preCheckVisible = ref(false)
const preCheckRecord = ref<TaskRecord | null>(null)
const preCheckIssues = ref<ContractIssue[]>([])

async function runTask(record: TaskRecord) {
  if (!operable(record) || runningId.value) {
    return
  }
  const check = taskRecordStore.preflight(record.id)
  if (check && check.issues.length) {
    preCheckRecord.value = record
    preCheckIssues.value = check.issues
    preCheckVisible.value = true
    return
  }
  await doRun(record)
}

/** 预检确认：用户选择继续执行（契约不替用户做决定） */
function confirmPreCheck() {
  const record = preCheckRecord.value
  preCheckVisible.value = false
  preCheckRecord.value = null
  if (record) {
    doRun(record)
  }
}

async function doRun(record: TaskRecord) {
  runningId.value = record.id
  const delay = record.domain === 'evaluation' ? 900 : 0
  if (delay) {
    await new Promise((r) => setTimeout(r, delay))
  }
  const res = taskRecordStore.run(record.id)
  runningId.value = ''
  if (!res.ok) {
    Message.warning(res.message)
    refresh()
    return
  }
  Message.success(res.message)
  refresh()
}

/** 启用 / 停用：域内差异由 taskRecordStore.toggle 分派 */
function toggleTask(record: TaskRecord) {
  if (!operable(record)) {
    return
  }
  const res = taskRecordStore.toggle(record.id)
  if (!res.ok) {
    Message.warning(res.message)
    return
  }
  Message.success(res.message)
  refresh()
}

// ================= 轮询：30s + 页面隐藏暂停 =================

let pollTimer: number | undefined

function pollOnce() {
  if (typeof document !== 'undefined' && document.hidden) {
    return
  }
  effectBatchStore.tick()
  silentRefresh()
}

onMounted(() => {
  refresh()
  /** 执行记录页跳回来时带 taskId，直接打开对应任务详情 */
  const taskId = typeof route.query.taskId === 'string' ? route.query.taskId : ''
  if (taskId) {
    const record = taskRecordStore.get(taskId)
    if (record) {
      goDetail(record)
    }
  }
  pollTimer = window.setInterval(pollOnce, POLL_INTERVAL)
})

onUnmounted(() => {
  clearTimeout(keywordTimer)
  if (pollTimer) {
    window.clearInterval(pollTimer)
  }
})
</script>

<style scoped>
.panel-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}
.toolbar-tip {
  font-size: 12px;
  color: var(--color-text-3);
}
.stat-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}
.stat-item {
  flex: 1 1 160px;
  min-width: 0;
}
.stat-card {
  cursor: pointer;
  border: 1px solid var(--color-border-2);
  transition: all 0.2s;
}
.stat-card--active {
  border-color: rgb(var(--primary-6));
  background: var(--color-primary-light-1);
}
.stat-sub {
  margin-top: 6px;
  font-size: 12px;
  color: var(--color-text-3);
}
.panel-card {
  margin-bottom: 16px;
}
.panel-title {
  font-size: 14px;
  font-weight: 600;
}
.panel-tip {
  margin-left: 10px;
  font-size: 12px;
  font-weight: 400;
  color: var(--color-text-3);
}
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  margin-bottom: 12px;
}
/*
 * 控件一律按 flex 等比收缩，不再写死 px 宽度：
 * 写死宽度时一行总宽超阈值就随机换行（某个下拉孤零零掉第二行），
 * 等比收缩 + 筛选项成组包裹，才能保证要么整齐一行、要么整组换行。
 * 搜索框与维度筛选项之间以竖线分组，行尾操作区钉右与筛选器拉开主次。
 */
.f-keyword {
  flex: 0 1 260px;
  min-width: 170px;
}
.f-filters {
  display: flex;
  flex: 1 1 520px;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.f-split {
  flex: 0 0 1px;
  height: 16px;
  background: var(--color-border-2);
}
.f-item {
  flex: 1 1 0;
  min-width: 104px;
}
.f-item--wide {
  flex: 1.5 1 0;
}
/* 生效中的筛选维度：placeholder 被值顶掉后，靠边框说清是哪个下拉在起作用 */
.f-active {
  border-color: rgb(var(--primary-6));
  background: var(--color-primary-light-1);
}
.f-actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}
.f-count {
  font-size: 12px;
  color: rgb(var(--primary-6));
}
.cell-name {
  display: flex;
  flex-direction: column;
}
.cell-code {
  font-size: 12px;
  color: var(--color-text-3);
}
.cell-domain {
  font-size: 12px;
  color: var(--color-text-3);
}
.cell-schedule {
  font-size: 13px;
  color: var(--color-text-1);
}
.cell-sub {
  margin-top: 2px;
  font-size: 12px;
  color: var(--color-text-3);
}
.cell-summary {
  margin-top: 2px;
  font-size: 12px;
  color: var(--color-text-2);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
/* 血缘行：引用上游评估产出时露出来，两行截断，全文交给 title */
.cell-lineage {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--color-text-3);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.cell-status {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.progress-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
}
.progress-text {
  font-size: 12px;
  color: var(--color-text-3);
}
.num {
  font-variant-numeric: tabular-nums;
}
.precheck-task {
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-1);
}
.precheck-head {
  margin-bottom: 6px;
}
.precheck-list {
  margin: 0;
  padding-left: 18px;
  font-size: 12px;
  line-height: 1.8;
}
.empty-state {
  padding: 12px 0;
}
.empty-actions {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 10px;
}
</style>
