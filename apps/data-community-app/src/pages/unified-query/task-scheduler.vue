<template>
  <PageContainer size="wide" class="uq-task-page">
    <PageHeader title="数据任务服务" sub-title="同步 + 调度任务统一入口、同一份实例列表;调度任务脚本复用统一查询平台">
      <template #extra>
        <a-space size="mini">
          <a-button type="primary" @click="openTypeChoose">
            <template #icon><icon-plus /></template>
            新建任务
          </a-button>
        </a-space>
      </template>
    </PageHeader>

    <!-- 概览看板(F22) -->
    <a-row :gutter="16">
      <a-col v-for="card in cards" :key="card.key" :span="6">
        <a-card class="uq-stat" :class="`uq-stat--${card.tone}`" :bordered="false" hoverable>
          <a-statistic
            :title="card.title"
            :value="card.value"
            :value-style="{ color: card.color }"
            show-group-separator
          >
            <template #suffix>
              <span class="uq-stat__unit">{{ card.unit }}</span>
            </template>
          </a-statistic>
          <div class="uq-stat__hint">{{ card.hint }}</div>
        </a-card>
      </a-col>
    </a-row>

    <!-- 任务列表(F23 / F36 · 单表合并 同步 + 调度,R02/R26) -->
    <a-card class="uq-task-list" title="任务列表" style="margin-top: 16px">
      <template #extra>
        <a-space size="mini">
          <a-radio-group v-model="instanceStore.taskFilter.type" size="small" type="button">
            <a-radio value="all">全部</a-radio>
            <a-radio value="schedule">调度</a-radio>
            <a-radio value="sync">同步</a-radio>
          </a-radio-group>
          <a-input-search
            v-model="instanceStore.taskFilter.keyword"
            size="small"
            placeholder="搜索任务 / 脚本 / 表名"
            allow-clear
            style="width: 220px"
          />
        </a-space>
      </template>

      <a-table
        :columns="mergedColumns"
        :data="instanceStore.filteredTasks"
        :pagination="{ pageSize: 10, showTotal: true, size: 'small' }"
        row-key="taskId"
        size="medium"
        stripe
        :scroll="{ x: 1200 }"
      >
        <template #name="{ record }">
          <div class="uq-task-name">
            <!-- 调度任务:点击进入实例列表 -->
            <a-link v-if="record.taskType === 'schedule'" @click="openTaskInstances(record)">
              {{ record.taskName }}
            </a-link>
            <!-- 同步任务:点击进入同步详情(无实例概念) -->
            <a-link v-else @click="openSyncDetail(record)">
              {{ record.taskName }}
            </a-link>
            <span v-if="record.taskType === 'schedule' && record.scriptName" class="uq-task-name__sub">
              关联脚本:{{ record.scriptName }}
            </span>
          </div>
        </template>
        <template #taskType="{ record }">
          <a-tag size="small" :color="record.taskType === 'sync' ? 'arcoblue' : 'green'">
            {{ record.taskType === 'sync' ? '同步' : '调度' }}
          </a-tag>
        </template>
        <!-- 同步任务专属:同步方向 -->
        <template #detail="{ record }">
          <span v-if="record.taskType === 'sync'">
            <a-tag size="small" color="arcoblue">{{ record.direction }}</a-tag>
          </span>
          <span v-else class="text-gray">{{ record.schedule || '—' }}</span>
        </template>
        <!-- 调度任务专属:下次执行;同步任务此处展示上一次同步的目标表 -->
        <template #secondary="{ record }">
          <span v-if="record.taskType === 'schedule'">{{ record.nextRun || '—' }}</span>
          <code v-else class="uq-task-code">{{ record.targetTable }}</code>
        </template>
        <template #status="{ record }">
          <a-tag size="small" :color="record.statusColor">{{ record.statusText }}</a-tag>
        </template>
        <template #operations="{ record }">
          <a-space size="mini">
            <!-- 调度任务:每次执行产出一条实例,可查看实例列表 -->
            <a-link v-if="record.taskType === 'schedule'" @click="openTaskInstances(record)">实例</a-link>
            <!-- 同步任务:每次执行即一条记录本身,无独立实例,直接看记录详情 -->
            <a-link v-if="record.taskType === 'sync'" @click="openSyncDetail(record)">详情</a-link>
            <a-link v-if="record.taskType === 'schedule'" @click="editSchedule(record)">配置</a-link>
            <a-link v-if="record.taskType === 'sync' && record.status === 'failed'" status="danger" @click="retrySync(record)">重跑</a-link>
          </a-space>
        </template>
      </a-table>
    </a-card>

    <!-- 任务详情抽屉(F24 + F34 + F35) -->
    <DetailDrawer v-model:visible="drawerVisible" :task-id="drawerTaskId" />

    <!-- 同步任务详情 drawer(P0 重构:展示 SyncTask 配置 + 历次 SyncRun) -->
    <a-drawer
      v-model:visible="syncDetailVisible"
      :title="syncDetailRecord ? `同步任务 · ${syncDetailRecord.id}` : '同步任务详情'"
      :width="640"
      unmount-on-close
    >
      <template v-if="syncDetailRecord">
        <a-alert
          v-if="syncDetailRecord.taskStatus === 'failed'"
          type="error"
          show-icon
          style="margin-bottom: 16px"
        >
          最近一次执行失败,源数据未受影响
        </a-alert>
        <a-descriptions :column="2" bordered size="small" title="任务配置">
          <a-descriptions-item label="任务编号">{{ syncDetailRecord.id }}</a-descriptions-item>
          <a-descriptions-item label="任务名">{{ syncDetailRecord.name }}</a-descriptions-item>
          <a-descriptions-item label="任务状态">
            <a-tag size="small" :color="syncTaskStatusColor(syncDetailRecord.taskStatus)">
              {{ syncTaskStatusText(syncDetailRecord.taskStatus) }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="方向">
            <a-tag :color="syncDetailRecord.direction === 'doris-to-hive' ? 'arcoblue' : 'cyan'" size="small">
              {{ syncDetailRecord.direction === 'doris-to-hive' ? 'Doris → Hive' : 'Hive → Doris' }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="触发方式">
            <a-tag size="small" :color="syncDetailRecord.trigger === 'schedule' ? 'purple' : 'arcoblue'">
              {{ syncDetailRecord.trigger === 'schedule' ? `定时 · ${syncDetailRecord.schedule || '—'}` : '手动' }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="发起人">{{ syncDetailRecord.creator }}</a-descriptions-item>
          <a-descriptions-item label="源端" :span="2">
            <code>{{ syncDetailRecord.sourceDatasource }}.{{ syncDetailRecord.sourceDatabase }}</code>
          </a-descriptions-item>
          <a-descriptions-item label="目标端" :span="2">
            <code>{{ syncDetailRecord.targetDatasource }}.{{ syncDetailRecord.targetDatabase }}</code>
            <a-tag v-if="syncDetailRecord.targetSnapshot.tmp" color="orange" size="small" style="margin-left: 4px">tmp</a-tag>
          </a-descriptions-item>
        </a-descriptions>

        <div style="margin-top: 16px">
          <div class="block-title">执行历史({{ syncDetailRuns.length }} 次)</div>
          <a-table
            :columns="syncRunColumns"
            :data="syncDetailRuns"
            :pagination="false"
            row-key="id"
            size="small"
          >
            <template #trigger="{ record: r }">
              <a-tag size="small" :color="r.trigger === 'schedule' ? 'purple' : 'arcoblue'">
                {{ r.trigger === 'schedule' ? '定时' : '手动' }}
              </a-tag>
            </template>
            <template #status="{ record: r }">
              <a-tag size="small" :color="r.status === 'success' ? 'green' : r.status === 'failed' ? 'red' : r.status === 'running' ? 'arcoblue' : 'gray'">
                {{ syncStatusText(r.status) }}
              </a-tag>
            </template>
            <template #cost="{ record: r }">{{ formatCost(r.costMs) }}</template>
            <template #startedAt="{ record: r }">
              <div>{{ r.startedAt }}</div>
              <div v-if="r.errorMessage" style="font-size: 12px; color: rgb(var(--danger-6))">{{ r.errorMessage }}</div>
            </template>
          </a-table>
        </div>
      </template>
    </a-drawer>

    <!-- B1: 新建任务 · 类型选择 -->
    <a-modal
      v-model:visible="typeChooseVisible"
      title="选择任务类型"
      :width="520"
      :footer="false"
      unmount-on-close
    >
      <div class="uq-type-grid">
        <div class="uq-type-card" @click="pickSync">
          <div class="uq-type-card__icon uq-type-card__icon--sync">
            <icon-swap />
          </div>
          <div class="uq-type-card__title">同步任务</div>
          <div class="uq-type-card__desc">
            Doris ↔ Hive 双向自助同步,同名表自动建表,提交即执行一次
          </div>
        </div>
        <div class="uq-type-card" @click="pickSchedule">
          <div class="uq-type-card__icon uq-type-card__icon--schedule">
            <icon-clock-circle />
          </div>
          <div class="uq-type-card__title">调度任务</div>
          <div class="uq-type-card__desc">
            基于统一查询脚本的定时/手动执行,支持重试、依赖、超时告警
          </div>
        </div>
      </div>
    </a-modal>
  </PageContainer>
</template>

<script setup lang="ts">
/**
 * 模块三:任务调度(F22 概览看板 / F23 任务列表 / F24 详情抽屉 /
 *  F25-F29 定时配置 / F30-F33 操作按钮 / F34-F35 历史+日志 / F36 状态颜色)
 *
 * 概览指标由任务列表实时派生,列表状态变化看板同步(§7.1 状态一致性)。
 */
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import PageContainer from '@/components-dca/common/PageContainer.vue'
import PageHeader from '@/components-dca/common/PageHeader.vue'
import DetailDrawer from '@/components-dca/unified-query/DetailDrawer.vue'
import { useUqTaskStore } from '@/stores-dca/unified-query/task'
import { useSyncTaskStore } from '@/stores-dca/management/sync-task'
import { useTaskInstanceStore } from '@/stores-dca/unified-query/task-instance'
import { TASK_TREND_7D } from '@/mock/unified-query/tasks'
import type { TaskRecord } from '@/mock/unified-query/types'
import type { TaskSummary } from '@/stores-dca/unified-query/task-instance'
import type { SyncRecord, SyncRunStatus, SyncTaskStatus } from '@/mock/service/sync-tasks-types'

const router = useRouter()
const store = useUqTaskStore()
const syncStore = useSyncTaskStore()
const instanceStore = useTaskInstanceStore()
const trend = TASK_TREND_7D

/* ─── 一期合并:任务类型筛选(R02 同步/调度) ─── */
type TaskTypeFilter = 'all' | 'schedule' | 'sync'
// 已迁至 instanceStore.taskFilter.type,这里保留一个本地只读镜像用于旧代码片段

/** 单表方案:合并列定义 */
const mergedColumns = [
  { title: '任务名', dataIndex: 'taskName', slotName: 'name', width: 280 },
  { title: '类型', dataIndex: 'taskType', slotName: 'taskType', width: 90 },
  { title: '详情', dataIndex: 'detail', slotName: 'detail', width: 200 },
  { title: '目标 / 下次', dataIndex: 'secondary', slotName: 'secondary', width: 200 },
  { title: '状态', dataIndex: 'status', slotName: 'status', width: 100 },
  { title: '发起人', dataIndex: 'creator', width: 100 },
  { title: '最近执行', dataIndex: 'lastRunAt', width: 170 },
  { title: '操作', dataIndex: 'operations', slotName: 'operations', width: 200, fixed: 'right' }
]

/** 行点击 → 跳到执行实例页(带 taskId query) */
function openTaskInstances(row: TaskSummary) {
  router.push({
    name: 'unified-query-tasks-instances',
    query: { taskId: row.taskId, type: row.taskType }
  })
}

/** 调度任务:跳到 task-create 页面(带 taskId query 走编辑模式) */
function editSchedule(row: TaskSummary) {
  if (row.taskType !== 'schedule') return
  router.push({ name: 'unified-query-task-create', query: { taskId: row.taskId } })
}

/** 同步失败任务:重跑 */
function retrySync(row: TaskSummary) {
  if (row.taskType !== 'sync') return
  const r = syncStore.retry(row.taskId)
  if (r) Message.success(`任务「${r.id}」已重新加入执行队列`)
}

/* ─── 同步任务详情 drawer(同步无独立实例,记录本身就是执行) ─── */
const syncDetailVisible = ref(false)
const syncDetailRecord = ref<SyncRecord | null>(null)

/**
 * 打开同步任务详情 drawer
 * P0:SyncTask(任务配置) + SyncRun(执行记录)分层,通过 SyncRecord 视图兼容展示
 */
function openSyncDetail(row: TaskSummary) {
  if (row.taskType !== 'sync') return
  const r = syncStore.getById(row.taskId)
  if (!r) {
    Message.warning('未找到该同步任务')
    return
  }
  syncDetailRecord.value = r
  syncDetailVisible.value = true
}

/** 当前 drawer 任务的历次 SyncRun */
const syncDetailRuns = computed(() => {
  const t = syncDetailRecord.value
  return t ? syncStore.getRunsByTaskId(t.id) : []
})

/** 同步任务级状态文案 */
function syncTaskStatusText(s: SyncTaskStatus): string {
  return ({
    enabled: '启用',
    disabled: '停用',
    running: '运行中',
    success: '成功',
    failed: '失败'
  } as Record<SyncTaskStatus, string>)[s] ?? s
}

/** 同步任务级状态颜色 */
function syncTaskStatusColor(s: SyncTaskStatus): string {
  return ({
    enabled: 'green',
    disabled: 'gray',
    running: 'arcoblue',
    success: 'green',
    failed: 'red'
  } as Record<SyncTaskStatus, string>)[s] ?? 'gray'
}

/** 同步 run 历史表格列 */
const syncRunColumns = [
  { title: '运行编号', dataIndex: 'id', width: 200 },
  { title: '触发', dataIndex: 'trigger', slotName: 'trigger', width: 90 },
  { title: '状态', dataIndex: 'status', slotName: 'status', width: 100 },
  { title: '耗时', dataIndex: 'cost', slotName: 'cost', width: 100 },
  { title: '开始时间', dataIndex: 'startedAt', slotName: 'startedAt' }
]

/** 同步状态 → 文案 */
function syncStatusText(s: SyncRunStatus): string {
  return {
    pending: '待执行',
    running: '执行中',
    success: '成功',
    failed: '失败',
    timeout: '超时'
  }[s] || s
}

/** 复用耗时格式化(同步任务使用 ms) */
function formatCost(ms: number): string {
  if (!ms) return '—'
  if (ms < 1000) return `${ms} ms`
  const s = ms / 1000
  if (s < 60) return `${s.toFixed(1)} s`
  return `${Math.floor(s / 60)}m${Math.round(s % 60)}s`
}

/* ─── 新建任务 类型选择 modal(B1) ─── */
const typeChooseVisible = ref(false)
function openTypeChoose() {
  typeChooseVisible.value = true
}
function pickSync() {
  typeChooseVisible.value = false
  router.push({ name: 'service-sync-create' })
}
function pickSchedule() {
  typeChooseVisible.value = false
  router.push({ name: 'unified-query-task-create' })
}

/** F22: 概览看板 4 张卡(总任务 / 成功 / 失败 / 运行中) */
const cards = computed(() => {
  const s = instanceStore.taskStats
  return [
    { key: 'total', title: '总任务', value: s.total, unit: '个', tone: 'default', color: 'rgb(var(--primary-6))', hint: '同步 + 调度合计' },
    { key: 'success', title: '成功', value: s.success, unit: '个', tone: 'success', color: 'rgb(var(--success-6))', hint: '最近一次执行成功' },
    { key: 'failed', title: '失败 / 超时', value: s.failed, unit: '个', tone: 'danger', color: 'rgb(var(--danger-6))', hint: '需排查或重跑' },
    { key: 'running', title: '运行中', value: s.running, unit: '个', tone: 'info', color: 'rgb(var(--link-6))', hint: '正在执行中' }
  ]
})

/* ── F24: 详情抽屉 ── */
const drawerVisible = ref(false)
const drawerTaskId = ref<string | null>(null)

function openDrawer(record: TaskRecord) {
  drawerTaskId.value = record.id
  drawerVisible.value = true
}

/* ── F30-F33: 任务操作按钮 ── */
const rerunningIds = ref<Set<string>>(new Set())

/** F30: 停用 */
function handleDisable(record: TaskRecord) {
  store.disable(record.id)
  Message.success(`任务「${record.name}」已停用`)
}

/** F33: 启用 */
function handleEnable(record: TaskRecord) {
  store.enable(record.id)
  Message.success(`任务「${record.name}」已启用`)
}

/** F32: 停止运行中任务 */
function handleStop(record: TaskRecord) {
  store.stop(record.id)
  Message.success(`任务「${record.name}」已停止`)
}

/** F31: 重跑 */
async function handleRerun(record: TaskRecord) {
  rerunningIds.value.add(record.id)
  const status = await store.rerun(record.id)
  rerunningIds.value.delete(record.id)
  if (status === 'success') {
    Message.success(`任务「${record.name}」重跑成功`)
  } else {
    Message.error(`任务「${record.name}」重跑失败`)
  }
}

/** 跨模块联动:跳到统一查询页并按脚本名搜索 */
function viewScript(record: TaskRecord) {
  router.push({ name: 'unified-query-sql', query: { keyword: record.scriptName } })
}
</script>

<style lang="scss" scoped>
.uq-stat {
  &__unit {
    font-size: 13px;
    color: var(--color-text-3);
    margin-left: 4px;
  }

  &__title {
    font-size: 14px;
    color: var(--color-text-2);
    margin-bottom: 8px;
  }

  &__hint {
    margin-top: 6px;
    font-size: 12px;
    color: var(--color-text-3);
  }

  &--trend {
    height: 100%;
  }
}

.uq-trend {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  height: 56px;
  gap: 4px;

  &__col {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
    gap: 2px;
    flex: 1;

    i {
      font-style: normal;
      font-size: 10px;
      color: var(--color-text-4);
    }
  }

  &__bar {
    width: 100%;
    max-width: 12px;
    border-radius: 2px;

    &.is-success {
      background: rgb(var(--success-6));
      min-height: 4px;
    }

    &.is-failed {
      background: rgb(var(--danger-6));

      &:not([style*='0px']) {
        min-height: 3px;
      }
    }
  }
}

.uq-task-name {
  display: flex;
  flex-direction: column;
  gap: 2px;

  span {
    font-size: 12px;
    color: var(--color-text-3);
  }
}

.uq-task-name__sub {
  display: block;
  font-size: 12px;
  color: var(--color-text-3);
  margin-top: 2px;
}
.uq-task-code {
  font-family: 'Menlo', monospace;
  background: var(--color-fill-2);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  color: #165dff;
}

/* 一期合并:B1 类型选择 */
.uq-type-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.uq-type-card {
  border: 1px solid var(--color-border-2);
  border-radius: 6px;
  padding: 20px 16px;
  cursor: pointer;
  transition: 0.18s ease;
  &:hover {
    border-color: rgb(var(--primary-6));
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
  }
  &__icon {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    &--sync {
      background: rgb(var(--primary-1));
      color: rgb(var(--primary-6));
    }
    &--schedule {
      background: rgb(var(--success-1));
      color: rgb(var(--success-6));
    }
  }
  &__title {
    font-size: 15px;
    font-weight: 600;
    margin-bottom: 6px;
  }
  &__desc {
    font-size: 12px;
    color: var(--color-text-3);
    line-height: 1.5;
  }
}
</style>
