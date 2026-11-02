<!--
  执行记录（一级页面）
  - 汇聚「特征评估」与「效果运营」两个域的全部跑批实例，一个列表看全厂执行情况
  - 每次执行 = 一条记录：触发方式、耗时、状态、结果摘要、当次锁定的口径快照
  - 失败 / 部分成功的记录可一键重跑，重跑会新建一条记录（原记录保留可追溯）
-->
<template>
  <div class="run-record-page">
    <DmtPageHeader
      title="执行记录"
      subtitle="特征评估与效果运营的全部执行实例、耗时、结果与口径快照"
    />

    <DmtStatGroup :items="statItems" />

    <a-card :bordered="false" class="filter-card">
      <a-space wrap size="large">
        <a-input v-model="filters.keyword" allow-clear placeholder="搜索实例 ID / 任务名称 / 触发人 / 批次号" style="width: 280px">
          <template #prefix><icon-search /></template>
        </a-input>
        <a-select v-model="filters.domain" allow-clear placeholder="业务域" :options="domainOptions" style="width: 150px" />
        <a-select v-model="filters.taskId" allow-clear placeholder="所属任务" :options="taskSelectOptions" style="width: 260px" show-search>
          <template #prefix><icon-schedule /></template>
        </a-select>
        <a-select v-model="filters.status" allow-clear placeholder="执行状态" :options="statusOptions" style="width: 140px" />
        <a-select v-model="filters.trigger" allow-clear placeholder="触发方式" :options="triggerOptions" style="width: 160px" />
        <a-button @click="resetFilters">重置</a-button>
        <a-button @click="reload">
          <template #icon><icon-refresh /></template>
          刷新
        </a-button>
      </a-space>
    </a-card>

    <a-card :bordered="false" class="table-card">
      <a-alert v-if="filteredRecords.some((r) => r.status === 'running')" type="info" class="running-alert">
        <template #icon><icon-loading /></template>
        有 {{ runningCount }} 个实例正在执行中，可稍后刷新查看结果。
      </a-alert>
      <a-table
        :columns="columns"
        :data="pagedRecords"
        :pagination="false"
        row-key="id"
        :scroll="{ x: 1560 }"
      >
        <template #runCell="{ record }">
          <a-space direction="vertical" size="mini">
            <a-link @click="goDetail(record.id)">
              <icon-common /> {{ record.id }}
            </a-link>
            <span class="muted">第 {{ record.seq }} 次执行</span>
          </a-space>
        </template>
        <template #domainCell="{ record }">
          <a-tag size="small" :color="record.domain === 'evaluation' ? 'arcoblue' : 'green'">
            {{ record.domainLabel }}
          </a-tag>
        </template>
        <template #taskCell="{ record }">
          <a-space direction="vertical" size="mini">
            <a-link @click="goTask(record)">{{ record.taskName }}</a-link>
            <span class="muted">{{ record.taskTypeLabel }}</span>
          </a-space>
        </template>
        <template #triggerCell="{ record }">
          <a-space direction="vertical" size="mini">
            <a-tag size="small" :color="triggerColor(record.trigger)">{{ RunRecordStore.triggerLabel(record.trigger) }}</a-tag>
            <span class="muted">{{ record.triggeredBy }}</span>
          </a-space>
        </template>
        <template #statusCell="{ record }">
          <a-space direction="vertical" size="mini">
            <a-tag :color="RunRecordStore.statusColor(record.status)">
              <icon-loading v-if="record.status === 'running'" />
              {{ RunRecordStore.statusLabel(record.status) }}
            </a-tag>
            <a-tooltip v-if="record.errorMessage" :content="record.errorMessage">
              <span class="error-brief">{{ record.errorMessage }}</span>
            </a-tooltip>
          </a-space>
        </template>
        <template #resultCell="{ record }">
          <a-space direction="vertical" size="mini">
            <span :class="{ muted: record.status !== 'success' && record.status !== 'partial' }">{{ record.resultText }}</span>
            <!-- 契约第三段留痕：不只看结果档，还要能一眼看出产出字段齐不齐 -->
            <a-tooltip v-if="record.contractIssues?.length" :content="contractTip(record)">
              <a-tag size="small" color="orange">产出契约不符 {{ record.contractIssues?.length }} 项</a-tag>
            </a-tooltip>
          </a-space>
        </template>
        <template #caliberCell="{ record }">
          <a-space direction="vertical" size="mini">
            <a-tooltip :content="record.caliber.versionText">
              <span class="caliber-text">{{ record.caliber.summary }}</span>
            </a-tooltip>
            <a-tag v-if="record.caliber.stale" size="small" color="orange">口径已更新</a-tag>
          </a-space>
        </template>
        <template #durationCell="{ record }">
          <span>{{ RunRecordStore.formatDuration(record.durationMs) }}</span>
        </template>
        <template #actionsCell="{ record }">
          <a-space>
            <a-button type="text" size="small" @click="goDetail(record.id)">详情</a-button>
            <a-button type="text" size="small" @click="openLog(record)">日志</a-button>
            <a-tooltip :disabled="canRetry(record)" :content="RETRY_TIP">
              <span>
                <a-button
                  type="text"
                  size="small"
                  :disabled="!canRetry(record)"
                  @click="handleRetry(record)"
                >
                  重跑
                </a-button>
              </span>
            </a-tooltip>
          </a-space>
        </template>
      </a-table>

      <div class="pager">
        <a-pagination
          v-model:current="currentPage"
          :total="filteredRecords.length"
          :page-size="pageSize"
          :page-size-options="[10, 20, 50]"
          show-total
          show-jumper
          show-page-size
          @change="() => {}"
          @page-size-change="handlePageSizeChange"
        />
      </div>
    </a-card>

    <RunLogDrawer ref="logDrawerRef" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Message, Modal } from '@arco-design/web-vue'
import DmtPageHeader from '@/modules/variable-hub/components/PageHeader.vue'
import DmtStatGroup from '@/modules/variable-hub/components/StatGroup.vue'
import RunLogDrawer from '@/modules/variable-hub/components/run-record/RunLogDrawer.vue'
import { RunRecordStore, RUN_DOMAIN_LABELS, type RunDomain, type RunRecord } from '@/modules/variable-hub/mock/run-record/run-record-store'
import { issueSummary } from '@/modules/variable-hub/mock/task-center/io-contract'
import type { RunInstanceStatus, RunTrigger } from '@/modules/variable-hub/mock/evaluation/evaluation-task-store'
import { UserContext, PERMISSIONS } from '@/modules/variable-hub/mock/risk-feature/permissions'

const route = useRoute()
const router = useRouter()

const records = ref<RunRecord[]>([])
const filters = reactive({ keyword: '', domain: '' as RunDomain | '', taskId: '', status: '', trigger: '' })
const currentPage = ref(1)
const pageSize = ref(10)
const logDrawerRef = ref()

/** 效果域重跑沿用 RUN_EFFECT_TASK 权限，评估域无门控 */
const canRunEffect = computed(() => UserContext.has(PERMISSIONS.RUN_EFFECT_TASK))
const RETRY_TIP = canRunEffect.value
  ? '该任务已有实例在执行中，请稍后再试'
  : '当前角色无「执行效果任务」权限，无法重跑效果批次'

const statusOptions: Array<{ label: string; value: RunInstanceStatus }> = [
  { label: '执行中', value: 'running' },
  { label: '成功', value: 'success' },
  { label: '部分成功', value: 'partial' },
  { label: '失败', value: 'failed' }
]

const triggerOptions: Array<{ label: string; value: RunTrigger }> = [
  { label: '调度自动触发', value: 'schedule' },
  { label: '手动立即执行', value: 'manual' },
  { label: '失败重试', value: 'retry' }
]

const domainOptions = (Object.keys(RUN_DOMAIN_LABELS) as RunDomain[]).map((value) => ({
  label: RUN_DOMAIN_LABELS[value],
  value
}))

const taskSelectOptions = computed(() => RunRecordStore.taskOptions())

/** URL 可带筛选（任务详情跳转、分享链接），只读入不写回，避免与本地筛选打架 */
function syncFromQuery() {
  const q = route.query
  filters.domain = (typeof q.domain === 'string' ? q.domain : '') as RunDomain | ''
  filters.taskId = typeof q.taskId === 'string' ? q.taskId : ''
  filters.status = typeof q.status === 'string' ? q.status : ''
}

const filteredRecords = computed(() =>
  records.value.filter((r) => {
    if (filters.domain && r.domain !== filters.domain) {
      return false
    }
    if (filters.taskId && r.taskId !== filters.taskId) {
      return false
    }
    if (filters.status && r.status !== filters.status) {
      return false
    }
    if (filters.trigger && r.trigger !== filters.trigger) {
      return false
    }
    if (filters.keyword) {
      const kw = filters.keyword.trim().toLowerCase()
      const batchNo = r.payload.kind === 'effect' ? r.payload.batchNo : ''
      const hay = `${r.id} ${r.taskId} ${r.taskName} ${r.triggeredBy} ${batchNo}`.toLowerCase()
      if (kw && !hay.includes(kw)) {
        return false
      }
    }
    return true
  })
)

const pagedRecords = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredRecords.value.slice(start, start + pageSize.value)
})

const runningCount = computed(() => filteredRecords.value.filter((r) => r.status === 'running').length)

const statItems = computed(() => {
  const s = RunRecordStore.summary()
  return [
    { title: '执行实例总数', value: s.total, iconText: '实', iconBg: '#f0f7ff', iconColor: '#165dff', extraLabel: '效果域', extraValue: s.byDomain.effect, extraColor: '#00b42a' },
    { title: '今日执行', value: s.today, iconText: '今', iconBg: '#e6fffb', iconColor: '#0fc6c2', extraLabel: '评估域', extraValue: s.byDomain.evaluation, extraColor: '#165dff' },
    { title: '执行中', value: s.running, iconText: '跑', iconBg: '#e8f3ff', iconColor: '#165dff' },
    {
      title: '成功率',
      value: Math.round(s.successRate * 100),
      precision: 0,
      iconText: '%',
      iconBg: '#e8ffea',
      iconColor: '#00b42a',
      extraLabel: '失败',
      extraValue: s.failed,
      extraColor: s.failed > 0 ? '#f53f3f' : '#4e5969'
    }
  ]
})

const columns = [
  { title: '执行实例', slotName: 'runCell', width: 250 },
  { title: '业务域', slotName: 'domainCell', width: 110 },
  { title: '所属任务', slotName: 'taskCell', width: 220 },
  { title: '触发方式', slotName: 'triggerCell', width: 150 },
  { title: '开始时间', dataIndex: 'startedAt', width: 170 },
  { title: '耗时', slotName: 'durationCell', width: 100 },
  { title: '状态', slotName: 'statusCell', width: 160 },
  { title: '结果摘要', slotName: 'resultCell', width: 240 },
  { title: '当次口径', slotName: 'caliberCell', width: 220 },
  { title: '操作', slotName: 'actionsCell', width: 170, fixed: 'right' }
]

const triggerColor = (value: RunTrigger) => (value === 'schedule' ? 'arcoblue' : value === 'retry' ? 'orange' : 'gray')

/** 产出契约不符项气泡：只载摘要，完整列表在详情页 */
const contractTip = (record: RunRecord) => issueSummary(record.contractIssues || [])

/** 重跑条件：终态记录 + 同任务无执行中实例 + 效果域要有权限 */
function canRetry(record: RunRecord): boolean {
  if (record.status === 'running') {
    return false
  }
  if (record.domain === 'effect' && !canRunEffect.value) {
    return false
  }
  const busy = records.value.some((r) => r.taskId === record.taskId && r.status === 'running')
  return !busy
}

function reload() {
  records.value = RunRecordStore.list()
}

const resetFilters = () => {
  filters.keyword = ''
  filters.domain = ''
  filters.taskId = ''
  filters.status = ''
  filters.trigger = ''
  currentPage.value = 1
}

const handlePageSizeChange = (size: number) => {
  pageSize.value = size
  currentPage.value = 1
}

// 筛选条件变化后回到第一页，避免出现「第 5 页无数据」的空表
watch(
  () => [filters.domain, filters.taskId, filters.status, filters.trigger, filters.keyword],
  () => {
    currentPage.value = 1
  }
)

const goDetail = (id: string) => router.push(`/runs/${id}`)
const openLog = (record: RunRecord) => logDrawerRef.value?.open(record)

/** 任务详情按域分流：评估任务与效果任务各自的路由 */
function goTask(record: RunRecord) {
  if (record.domain === 'effect') {
    router.push(`/tasks/effect/${record.taskId}`)
    return
  }
  router.push({ path: '/tasks', query: { tab: 'tasks', taskId: record.taskId } })
}

const handleRetry = (record: RunRecord) => {
  Modal.confirm({
    title: '重跑该任务？',
    content: `将为「${record.taskName}」创建一次新的执行实例（触发方式：失败重试），原实例记录保留。`,
    okText: '开始重跑',
    cancelText: '取消',
    onOk: async () => {
      const started = RunRecordStore.rerunStart(record.id, UserContext.get().name || 'Demo 用户')
      if (!started) {
        Message.warning('该任务已有实例在执行中，请稍后再试')
        reload()
        return
      }
      Message.info('重跑实例已创建，正在执行…')
      reload()
      await new Promise((r) => setTimeout(r, 1600))
      const finished = RunRecordStore.rerunFinish(started.id, 'success')
      Message.success(finished ? `重跑完成：${finished.resultText}` : '重跑已结束，刷新列表查看结果')
      reload()
    }
  })
}

onMounted(() => {
  syncFromQuery()
  reload()
})
</script>

<style scoped lang="less">
.run-record-page {
  padding-top: 4px;
}

.filter-card,
.table-card {
  margin-bottom: 16px;
  border-radius: 8px;
}

.running-alert {
  margin-bottom: 12px;
}

.muted {
  color: var(--color-text-4);
  font-size: 12px;
}

.error-brief {
  display: inline-block;
  max-width: 120px;
  font-size: 12px;
  color: rgb(var(--danger-6));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: bottom;
}

.caliber-text {
  display: inline-block;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: bottom;
}

.pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
