<template>
  <div class="effect-task-page">
    <DmtPageHeader
      title="效果任务管理"
      subtitle="按阈值产出「汰换 / 推荐」名单的跑批任务域；效果域口径独立于特征台账，不改变正式资产。"
    >
      <template #extra>
        <a-space>
          <a-button @click="router.push('/variable-hub')">返回效果总览</a-button>
          <a-button @click="router.push('/effect-tasks/settings')">阈值与推送配置</a-button>
          <a-button v-if="canRun" type="primary" @click="openCreate">新建任务</a-button>
        </a-space>
      </template>
    </DmtPageHeader>

    <!-- 口径说明：文案唯一来源是 effectStore.overview()，页面不自己拼样本数 -->
    <a-alert type="info" class="coverage-alert">{{ coverageNote }}</a-alert>

    <!-- 四数字卡：点击即预设筛选，数字与筛选结果同口径（判定全在 batch-store 内） -->
    <div class="stat-row">
      <div v-for="c in statCards" :key="c.key" class="stat-item">
        <a-card
          :bordered="false"
          class="stat-card"
          hoverable
          :class="{ 'stat-card--active': activePreset === c.key }"
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

      <!-- 筛选条：字典来自 store，变更即写 URL 并重置页码 -->
      <div class="filter-bar">
        <a-input
          v-model="keywordDraft"
          allow-clear
          placeholder="搜索任务名 / 任务 ID"
          class="f-keyword"
          @press-enter="flushKeyword"
        >
          <template #prefix><icon-search /></template>
        </a-input>
        <a-select
          v-model="local.type"
          :options="typeOptions"
          allow-clear
          placeholder="任务类型"
          size="small"
          class="f-item"
          @change="(v) => applyChange({ type: v, page: 1 })"
        />
        <a-select
          v-model="local.status"
          :options="statusOptions"
          allow-clear
          placeholder="任务状态"
          size="small"
          class="f-item"
          @change="(v) => applyChange({ status: v, page: 1 })"
        />
        <a-button size="small" type="text" @click="resetFilters">清空筛选</a-button>
      </div>

      <a-table
        row-key="id"
        :data="rows"
        :loading="loading"
        :pagination="pagination"
        :scroll="{ x: 1180 }"
        size="small"
        @page-change="(p) => applyChange({ page: p })"
        @page-size-change="(s) => applyChange({ pageSize: s, page: 1 })"
      >
        <template #columns>
          <a-table-column title="任务" data-index="name" :width="240" fixed="left">
            <template #cell="{ record }">
              <div class="cell-name">
                <a-link @click="goDetail(record)">{{ record.name }}</a-link>
                <span class="cell-code">{{ record.id }}</span>
              </div>
            </template>
          </a-table-column>

          <a-table-column title="类型" data-index="typeLabel" :width="120" />
          <a-table-column title="调度" data-index="scheduleText" :width="130" />
          <a-table-column title="下次触发" data-index="nextTriggerAt" :width="150">
            <template #cell="{ record }">
              <span class="num">{{ record.scheduleText === '手动触发' ? '—' : record.nextTriggerAt }}</span>
            </template>
          </a-table-column>
          <a-table-column title="覆盖变量数" data-index="variableCount" :width="110">
            <template #cell="{ record }"><span class="num">{{ record.variableCount }}</span></template>
          </a-table-column>

          <a-table-column title="最近执行" :width="230">
            <template #cell="{ record }">
              <a-tag :color="resultColor(record.lastRunResult)" size="small">{{ record.lastRunResultLabel }}</a-tag>
              <div class="cell-summary">{{ record.lastRunSummary }}</div>
            </template>
          </a-table-column>

          <a-table-column title="状态" :width="130">
            <template #cell="{ record }">
              <div class="cell-status">
                <a-tag :color="statusColor(record.status)" size="small">{{ record.statusLabel }}</a-tag>
                <div v-if="record.status === 'running'" class="progress-wrap">
                  <a-progress :percent="record.progress / 100" size="mini" :show-text="false" />
                  <span class="num progress-text">{{ record.progress }}%</span>
                </div>
              </div>
            </template>
          </a-table-column>

          <a-table-column title="操作" :width="170" fixed="right">
            <template #cell="{ record }">
              <a-space :size="6">
                <a-link @click="goDetail(record)">详情</a-link>
                <a-link v-if="canRun" :disabled="record.status === 'running'" @click="runTask(record)">立即执行</a-link>
                <a-link v-if="canRun" @click="toggleEnabled(record)">{{ record.enabled ? '停用' : '启用' }}</a-link>
              </a-space>
            </template>
          </a-table-column>
        </template>

        <!-- 六类空态：状态枚举由 store 返回，页面只做文案映射 -->
        <template #empty>
          <div class="empty-state">
            <a-empty :image="false" :description="emptyDescription" />
            <div class="empty-actions">
              <a-button v-if="isError" type="primary" size="small" @click="refresh">重试</a-button>
              <a-button v-if="state === 'empty_filter'" size="small" @click="resetFilters">清空筛选</a-button>
            </div>
          </div>
        </template>
      </a-table>
    </a-card>

    <!-- 新建任务：演示环境只落 localStorage，不接后端 -->
    <a-modal v-model:visible="createVisible" title="新建效果任务" :ok-loading="creating" @ok="submitCreate">
      <a-form :model="createForm" layout="vertical">
        <a-form-item field="name" label="任务名称" :rules="[{ required: true, message: '请输入任务名称' }]">
          <a-input v-model="createForm.name" placeholder="如：外数变量推荐复核" />
        </a-form-item>
        <a-form-item field="type" label="任务类型">
          <a-select v-model="createForm.type" :options="typeOptions" />
        </a-form-item>
        <a-form-item field="scheduleText" label="调度方式">
          <a-input v-model="createForm.scheduleText" placeholder="如：每日 06:30 / 手动触发" />
        </a-form-item>
        <a-alert type="warning">
          演示环境仅写入本地存储：新建任务不会真实跑批，可在详情页用「试跑」验证阈值命中效果。
        </a-alert>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
/**
 * 效果任务管理 · 列表页
 *
 * 约束（见评估文档 §6 / §10）：
 * 1. 关键词 / 类型 / 状态 / 四数卡预设 / 分页全部写进 URL query，链接可分享、前进后退可还原；
 * 2. 页面不做任何 filter / sort / 计数，四个数字与行数据一律来自 effectBatchStore.listTasks()；
 * 3. 搜索 300ms 防抖，任何筛选变更都把 page 重置为 1；
 * 4. 30 秒轮询 effectBatchStore.tick() 推进进度，document.hidden 时暂停；
 * 5. 立即执行 / 启停 受 RUN_EFFECT_TASK 权限控制。
 */
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { IconSearch } from '@arco-design/web-vue/es/icon'
import DmtPageHeader from '@/modules/variable-hub/components/PageHeader.vue'
import { effectBatchStore } from '@/modules/variable-hub/mock/effect-evaluation/batch-store'
import { effectStore } from '@/modules/variable-hub/mock/effect-evaluation/effect-store'
import { UserContext, PERMISSIONS } from '@/modules/variable-hub/mock/risk-feature/permissions'

const router = useRouter()
const route = useRoute()

const POLL_INTERVAL = 30000

const canRun = computed(() => UserContext.has(PERMISSIONS.RUN_EFFECT_TASK))

/** 覆盖范围说明：与效果总览共用同一句话，避免两处数字漂移 */
const coverageNote = computed(() => effectStore.overview().coverageNote)

// ================= URL query ↔ 列表入参 =================

/** query 短键 ↔ 列表入参字段（短键便于分享） */
const QUERY_MAP = {
  q: 'keyword',
  type: 'type',
  st: 'status',
  pre: 'preset',
  page: 'page',
  size: 'pageSize'
}

/** 反向映射：字段名 → query 短键 */
const FIELD_TO_QUERY = Object.keys(QUERY_MAP).reduce((acc, k) => {
  acc[QUERY_MAP[k]] = k
  return acc
}, {})

/** URL → TaskListParams（数字字段做类型还原） */
const queryParams = computed(() => {
  const out = {}
  Object.keys(QUERY_MAP).forEach((k) => {
    const v = route.query[k]
    if (v !== undefined && v !== '') out[QUERY_MAP[k]] = String(v)
  })
  if (out.page !== undefined) out.page = Number(out.page) || 1
  if (out.pageSize !== undefined) out.pageSize = Number(out.pageSize) || 10
  return out
})

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

const keywordDraft = ref(queryParams.value.keyword || '')
const local = reactive({ type: queryParams.value.type, status: queryParams.value.status })

const loading = ref(false)
const result = ref(effectBatchStore.listTasks(queryParams.value))
const rows = computed(() => result.value.rows)
const state = computed(() => result.value.state)
const isError = computed(() => state.value === 'error_network' || state.value === 'error_server')
const activePreset = computed(() => String(queryParams.value.preset || 'all'))

/** 四数字卡：数字直接取 store 的 stats，点击后的筛选结果与卡片数字同口径 */
const statCards = computed(() => [
  { key: 'all', title: '任务总数', value: result.value.stats.total, subtitle: '含预置与本地新建' },
  { key: 'running', title: '执行中', value: result.value.stats.running, subtitle: '30 秒轮询推进进度' },
  { key: 'failed', title: '最近失败', value: result.value.stats.failed, subtitle: '看最近一次执行结果' },
  { key: 'disabled', title: '已停用', value: result.value.stats.paused, subtitle: '停用后不再定时触发' }
])

/** 筛选下拉字典：类型 / 状态文案均来自 store，页面不硬编码枚举 */
const typeOptions = computed(() =>
  Object.keys(effectBatchStore.typeLabels).map((k) => ({ label: effectBatchStore.typeLabels[k], value: k }))
)
const statusOptions = computed(() =>
  Object.keys(effectBatchStore.statusLabels).map((k) => ({ label: effectBatchStore.statusLabels[k], value: k }))
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

/** 空态文案：六态 → 一句人话 */
const emptyDescription = computed(() => {
  const map = {
    loading: '数据加载中…',
    empty_filter: '没有符合当前筛选条件的任务',
    empty_data: '暂无效果跑批任务，可点右上角新建',
    error_network: '网络异常，任务列表拉取失败',
    error_server: '调度服务异常，暂时无法读取任务状态',
    none: '暂无数据'
  }
  return map[state.value] || map.none
})

/**
 * 拉取列表：mock 同步返回，用极短延时体现 loading 态
 */
function refresh() {
  loading.value = true
  window.setTimeout(() => {
    result.value = effectBatchStore.listTasks(queryParams.value)
    loading.value = false
  }, 120)
}

/** 轮询用静默刷新：不闪 loading，避免进度条反复抖动 */
function silentRefresh() {
  result.value = effectBatchStore.listTasks(queryParams.value)
}

/** URL 变化即重新拉数（唯一取数触发源） */
watch(() => route.query, refresh, { deep: true })

/** 前进后退导致关键词变化时回填输入框 */
watch(
  () => queryParams.value.keyword,
  (v) => {
    if ((v || '') !== keywordDraft.value) keywordDraft.value = v || ''
  }
)

/** URL 筛选变化时同步下拉框草稿 */
watch(
  () => [queryParams.value.type, queryParams.value.status],
  ([t, s]) => {
    local.type = t
    local.status = s
  }
)

let keywordTimer = null

/** 搜索输入 300ms 防抖后写 URL */
watch(keywordDraft, (v) => {
  clearTimeout(keywordTimer)
  keywordTimer = setTimeout(() => {
    if ((queryParams.value.keyword || '') === v.trim()) return
    applyChange({ keyword: v.trim(), page: 1 })
  }, 300)
})

/** 回车立即生效，不等防抖 */
function flushKeyword() {
  clearTimeout(keywordTimer)
  applyChange({ keyword: keywordDraft.value.trim(), page: 1 })
}

/** 清空筛选：整段 query 归零（含预设卡与页码），watch(route.query) 会自动重新取数 */
function resetFilters() {
  keywordDraft.value = ''
  local.type = undefined
  local.status = undefined
  router.replace({ query: {} })
}

/**
 * 四数卡点击：all 清空预设，其余写入 ?pre=
 * @param {string} key 卡片标识
 */
function pickPreset(key) {
  const current = key === 'all' ? undefined : key
  if (String(queryParams.value.preset || 'all') === String(current || 'all')) return
  applyChange({ preset: current, page: 1 })
}

/**
 * 跳转任务详情（带 tab，详情侧按需请求对应数据）
 * @param {object} record 任务行
 */
function goDetail(record) {
  router.push({ path: `/effect-tasks/${record.id}`, query: { tab: 'config' } })
}

/** 最近执行结果颜色：仅作辅助，文案已含结论 */
function resultColor(r) {
  return { success: 'green', partial: 'orange', failed: 'red' }[r] || 'gray'
}

/** 任务状态颜色 */
function statusColor(s) {
  return { running: 'arcoblue', success: 'green', failed: 'red', partial: 'orange', paused: 'gray', pending: 'gray' }[s] || 'gray'
}

// ================= 写操作（演示态，仅落 localStorage） =================

/**
 * 立即执行：把任务置为执行中并交给轮询推进
 * @param {object} record 任务行
 */
function runTask(record) {
  effectBatchStore.saveTask({ ...record, status: 'running', progress: 5 })
  Message.success(`已触发「${record.name}」，进度每 30 秒自动刷新`)
  refresh()
}

/**
 * 启用 / 停用：停用同时把状态置为已暂停，避免出现在待触发队列
 * @param {object} record 任务行
 */
function toggleEnabled(record) {
  const enabled = !record.enabled
  effectBatchStore.saveTask({ ...record, enabled, status: enabled ? 'pending' : 'paused' })
  Message.success(enabled ? `已启用「${record.name}」` : `已停用「${record.name}」，不再定时触发`)
  refresh()
}

const createVisible = ref(false)
const creating = ref(false)
const createForm = reactive({ name: '', type: 'adhoc', scheduleText: '手动触发' })

/** 打开新建弹窗并复位表单 */
function openCreate() {
  createForm.name = ''
  createForm.type = 'adhoc'
  createForm.scheduleText = '手动触发'
  createVisible.value = true
}

/** 提交新建：校验名称后交给 store 落本地存储 */
function submitCreate() {
  if (!createForm.name.trim()) {
    Message.warning('请输入任务名称')
    return
  }
  creating.value = true
  effectBatchStore.saveTask({ ...createForm, name: createForm.name.trim() })
  creating.value = false
  createVisible.value = false
  Message.success('任务已创建（演示数据，本地存储）')
  refresh()
}

// ================= 轮询：30s + 页面隐藏暂停 =================

let pollTimer = null

/**
 * 单次轮询：页面不可见时跳过，可见时推进进度并静默刷新
 */
function pollOnce() {
  if (typeof document !== 'undefined' && document.hidden) return
  effectBatchStore.tick()
  silentRefresh()
}

onMounted(() => {
  refresh()
  pollTimer = window.setInterval(pollOnce, POLL_INTERVAL)
})

onUnmounted(() => {
  clearTimeout(keywordTimer)
  if (pollTimer) window.clearInterval(pollTimer)
})
</script>

<style scoped>
.coverage-alert {
  margin-bottom: 12px;
}
.stat-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}
.stat-item {
  flex: 1 1 100%;
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
  gap: 8px;
  margin-bottom: 10px;
}
.f-keyword {
  width: 220px;
}
.f-item {
  width: 140px;
}
.cell-name {
  display: flex;
  flex-direction: column;
}
.cell-code {
  font-size: 12px;
  color: var(--color-text-3);
}
.cell-summary {
  margin-top: 2px;
  font-size: 12px;
  color: var(--color-text-3);
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
}
.num {
  font-variant-numeric: tabular-nums;
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

@media (min-width: 576px) {
  .stat-item {
    flex: 1 1 calc(50% - 6px);
  }
}
@media (min-width: 992px) {
  .stat-item {
    flex: 1 1 0;
  }
}
</style>
