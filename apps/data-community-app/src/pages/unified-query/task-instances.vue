<template>
  <PageContainer size="wide" class="uq-instances">
    <PageHeader
      title="执行实例"
      :sub-title="subTitle"
    >
      <template #extra>
        <a-space>
          <a-button @click="router.push({ name: 'unified-query-tasks' })">
            <template #icon><icon-left /></template>
            返回任务服务
          </a-button>
          <a-button type="primary" @click="router.push({ name: 'service-sync-create' })">
            <template #icon><icon-plus /></template>
            新建同步任务
          </a-button>
        </a-space>
      </template>
    </PageHeader>

    <!-- 当前任务上下文(从 task-scheduler 行点击带过来的) -->
    <a-alert
      v-if="taskContext"
      :type="taskContext.taskType === 'sync' ? 'warning' : 'info'"
      show-icon
      closable
      class="uq-instances__context"
    >
      <template v-if="taskContext.taskType === 'sync'">
        「<b>{{ taskContext.taskName }}</b>」是<b>同步任务</b>,无独立「执行实例」概念,下方展示的是该任务下所有同步<b>执行记录</b>(每次执行即一条)。
        <a-button size="mini" type="text" style="margin-left: 8px" @click="clearTaskContext">
          查看全部记录
        </a-button>
      </template>
      <template v-else>
        当前按调度任务筛选:<b>{{ taskContext.taskName }}</b>
        <a-button size="mini" type="text" style="margin-left: 8px" @click="clearTaskContext">
          显示全部实例
        </a-button>
      </template>
    </a-alert>

    <!-- 概览统计(D1) -->
    <a-row :gutter="16" class="uq-instances__stats">
      <a-col :span="6">
        <a-card :bordered="false">
          <a-statistic
            :title="statsTitle.total"
            :value="store.stats.total"
          />
          <div class="uq-instances__stat-sub">{{ store.filtered.length }} 条经筛选</div>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card :bordered="false">
          <a-statistic
            title="成功"
            :value="store.stats.success"
            :value-style="{ color: '#00b42a' }"
          />
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card :bordered="false">
          <a-statistic
            title="失败 / 终止"
            :value="store.stats.failed"
            :value-style="{ color: '#f53f3f' }"
          />
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card :bordered="false">
          <a-statistic
            title="执行中"
            :value="store.stats.running"
            :value-style="{ color: '#165dff' }"
          />
        </a-card>
      </a-col>
    </a-row>

    <!-- 筛选 -->
    <a-card :bordered="false" class="uq-instances__filter">
      <a-row :gutter="12">
        <a-col :span="6">
          <a-input
            v-model="store.filter.keyword"
            placeholder="搜索任务 / 实例 ID / 表名"
            allow-clear
          >
            <template #prefix><icon-search /></template>
          </a-input>
        </a-col>
        <a-col :span="4">
          <a-select v-model="store.filter.type" placeholder="任务类型">
            <a-option value="all">全部类型</a-option>
            <a-option value="sync">同步</a-option>
            <a-option value="schedule">调度</a-option>
          </a-select>
        </a-col>
        <a-col :span="4">
          <a-select v-model="store.filter.status" placeholder="状态">
            <a-option value="all">全部状态</a-option>
            <a-option value="queued">排队</a-option>
            <a-option value="running">运行中</a-option>
            <a-option value="success">成功</a-option>
            <a-option value="failed">失败</a-option>
            <a-option value="cancelled">已取消</a-option>
          </a-select>
        </a-col>
        <a-col :span="4">
          <a-select v-model="store.filter.trigger" placeholder="触发方式">
            <a-option value="all">全部触发</a-option>
            <a-option value="manual">手动</a-option>
            <a-option value="cron">定时</a-option>
            <a-option value="dependency">依赖上游</a-option>
            <a-option value="external">外部调用</a-option>
          </a-select>
        </a-col>
        <a-col :span="6" style="text-align: right">
          <a-space>
            <a-tag color="arcoblue">时间范围:近 {{ store.filter.days }} 天</a-tag>
            <a-button @click="store.resetFilter">重置筛选</a-button>
          </a-space>
        </a-col>
      </a-row>
    </a-card>

    <!-- 主表(公共列 R26) -->
    <a-card :bordered="false" class="uq-instances__list">
      <a-table
        :columns="columns"
        :data="store.filtered"
        row-key="id"
        size="medium"
        stripe
        :pagination="{ pageSize: 10, showTotal: true }"
        :scroll="{ x: 1280 }"
        :row-class-name="rowClass"
        :default-expand-all-rows="false"
      >
        <template #id="{ record }">
          <a-link @click="openDetail(record)">{{ record.id }}</a-link>
        </template>
        <template #taskType="{ record }">
          <a-tag size="small" :color="record.taskType === 'sync' ? 'arcoblue' : 'green'">
            {{ record.taskType === 'sync' ? '同步' : '调度' }}
          </a-tag>
        </template>
        <template #trigger="{ record }">
          <a-tag size="small" :color="triggerMeta(record.trigger).color">
            {{ triggerMeta(record.trigger).text }}
          </a-tag>
        </template>
        <template #status="{ record }">
          <a-tag size="small" :color="statusMeta(record.status).color">
            {{ statusMeta(record.status).text }}
          </a-tag>
        </template>
        <template #cost="{ record }">{{ formatCost(record.costMs) }}</template>
        <template #operations="{ record }">
          <a-space size="mini">
            <a-link @click="openDetail(record)">详情</a-link>
          </a-space>
        </template>
        <template #empty>
          <a-empty description="暂无符合筛选条件的执行实例">
            <a-button @click="store.resetFilter">清空筛选</a-button>
          </a-empty>
        </template>
      </a-table>
    </a-card>

    <!-- 实例详情抽屉 -->
    <a-drawer
      v-model:visible="detailVisible"
      :title="`执行实例 · ${current?.id ?? ''}`"
      :width="600"
      unmount-on-close
    >
      <template v-if="current">
        <a-alert
          v-if="current.status === 'failed' || current.status === 'cancelled'"
          :type="current.status === 'failed' ? 'error' : 'warning'"
          :show-icon="true"
          class="uq-instances__detail-alert"
        >
          {{ current.errorMessage || '执行异常,源数据未受影响。' }}
        </a-alert>
        <a-descriptions :column="2" bordered size="small" title="基础信息">
          <a-descriptions-item label="实例 ID">{{ current.id }}</a-descriptions-item>
          <a-descriptions-item label="任务名">{{ current.taskName }}</a-descriptions-item>
          <a-descriptions-item label="任务类型">
            <a-tag size="small" :color="current.taskType === 'sync' ? 'arcoblue' : 'green'">
              {{ current.taskType === 'sync' ? '同步' : '调度' }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="触发方式">
            <a-tag size="small" :color="triggerMeta(current.trigger).color">
              {{ triggerMeta(current.trigger).text }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="状态">
            <a-tag size="small" :color="statusMeta(current.status).color">
              {{ statusMeta(current.status).text }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="发起人">{{ current.creator }}</a-descriptions-item>
          <a-descriptions-item label="起止时间" :span="2">
            <div>{{ current.startedAt }}</div>
            <div v-if="current.finishedAt" class="uq-instances__sub">{{ current.finishedAt }}</div>
          </a-descriptions-item>
          <a-descriptions-item label="耗时">{{ formatCost(current.costMs) }}</a-descriptions-item>
        </a-descriptions>
      </template>
    </a-drawer>
  </PageContainer>
</template>

<script setup lang="ts">
/**
 * 数据任务服务(一期) · 执行实例列表(D1)
 *
 * 实现需求文档:
 *   R25 唯一实例列表 - 同步 + 调度合并为同一份
 *   R26 公共列:实例ID / 任务名 / 任务类型 / 触发方式 / 开始 / 结束 / 耗时 / 状态 / 发起人 / 失败原因
 *   R28 触发方式统一语义:手动 / 定时 / 依赖上游 / 外部调用
 *   E12 时间范围筛选 - 默认近 30 天
 */
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageContainer from '@/components-dca/common/PageContainer.vue'
import PageHeader from '@/components-dca/common/PageHeader.vue'
import {
  INSTANCE_STATUS_META,
  INSTANCE_TRIGGER_META,
  useTaskInstanceStore
} from '@/stores-dca/unified-query/task-instance'
import { useSyncTaskStore } from '@/stores-dca/management/sync-task'
import { useUqTaskStore } from '@/stores-dca/unified-query/task'
import type {
  TaskInstance,
  TaskInstanceStatus,
  TaskInstanceTrigger
} from '@/stores-dca/unified-query/task-instance'

const router = useRouter()
const route = useRoute()
const store = useTaskInstanceStore()
const syncStore = useSyncTaskStore()
const uqStore = useUqTaskStore()

/* ─── 从 query.taskId 解析任务上下文 ─── */
const currentTaskId = ref<string>('')
const currentTaskType = ref<'sync' | 'schedule' | null>(null)

const taskContext = computed(() => {
  if (!currentTaskId.value) return null
  if (currentTaskType.value === 'sync') {
    const r = syncStore.records.find(x => x.id === currentTaskId.value)
    if (!r) return null
    return {
      taskId: r.id,
      taskName: `同步·${r.sourceTable}`,
      taskType: 'sync' as const
    }
  }
  if (currentTaskType.value === 'schedule') {
    const t = uqStore.list.find(x => x.id === currentTaskId.value)
    if (!t) return null
    return { taskId: t.id, taskName: t.name, taskType: 'schedule' as const }
  }
  return null
})

/** 顶部 subtitle —— 若在查特定任务,展示对应 taskName */
const subTitle = computed(() => {
  if (taskContext.value) {
    if (taskContext.value.taskType === 'sync') {
      return `同步任务「${taskContext.value.taskName}」的同步执行记录列表 · 每次执行即一条记录`
    }
    return `调度任务「${taskContext.value.taskName}」的执行实例列表 · 数据任务服务`
  }
  return '数据任务服务 · 调度任务为「执行实例」,同步任务为「执行记录」(每次执行即一条),合并展示'
})

/**
 * 概览卡标题:跟当前上下文区分语义
 * - 没有 taskContext:总记录数(混合)
 * - 有 sync 上下文:总记录数(同步)
 * - 有 schedule 上下文:总实例数(调度)
 */
const statsTitle = computed(() => {
  if (taskContext.value?.taskType === 'sync') {
    return { total: '同步记录总数', success: '同步成功', failed: '同步失败/超时', running: '同步执行中' }
  }
  if (taskContext.value?.taskType === 'schedule') {
    return { total: '执行实例总数', success: '执行成功', failed: '执行失败', running: '执行中' }
  }
  return { total: '总记录(实例+同步)', success: '成功', failed: '失败/终止', running: '执行中' }
})

function applyQuery() {
  const tid = (route.query.taskId as string) || ''
  const typ = (route.query.type as 'sync' | 'schedule') || ''
  currentTaskId.value = tid
  currentTaskType.value = typ || null
  if (tid) {
    store.filterByTask(tid)
  }
}

function clearTaskContext() {
  currentTaskId.value = ''
  currentTaskType.value = null
  router.replace({ name: route.name as string })
  store.resetFilter()
}

onMounted(applyQuery)
watch(() => route.query.taskId, applyQuery)

/**
 * 表头列定义:
 * - 同步任务上下文时,「实例 ID」列改名为「同步编号」
 * - 否则保持原 R26 公共列
 */
const columns = computed(() => [
  { title: idColumnTitle.value, dataIndex: 'id', slotName: 'id', width: 180 },
  { title: '任务名', dataIndex: 'taskName', width: 220 },
  { title: '任务类型', dataIndex: 'taskType', slotName: 'taskType', width: 90 },
  { title: '触发方式', dataIndex: 'trigger', slotName: 'trigger', width: 110 },
  { title: '开始时间', dataIndex: 'startedAt', width: 170 },
  { title: '耗时', dataIndex: 'cost', slotName: 'cost', width: 100 },
  { title: '状态', dataIndex: 'status', slotName: 'status', width: 100 },
  { title: '发起人', dataIndex: 'creator', width: 100 },
  { title: '操作', dataIndex: 'operations', slotName: 'operations', width: 100, fixed: 'right' }
])

/** 同步上下文时,首列用「同步编号」,否则「实例 ID」 */
const idColumnTitle = computed(() =>
  taskContext.value?.taskType === 'sync' ? '同步编号' : '实例 ID'
)

function statusMeta(s: TaskInstanceStatus) {
  return INSTANCE_STATUS_META[s]
}
function triggerMeta(t: TaskInstanceTrigger) {
  return INSTANCE_TRIGGER_META[t]
}
function formatCost(ms: number): string {
  if (!ms) return '—'
  if (ms < 1000) return `${ms} ms`
  const s = ms / 1000
  if (s < 60) return `${s.toFixed(1)} s`
  return `${Math.floor(s / 60)}m${Math.round(s % 60)}s`
}

function rowClass() {
  return ''
}

/** 详情抽屉 */
const detailVisible = ref(false)
const current = ref<TaskInstance | null>(null)
function openDetail(r: TaskInstance) {
  current.value = r
  detailVisible.value = true
}
</script>

<style lang="scss" scoped>
.uq-instances {
  &__context {
    margin: 0 24px 16px;
  }
  &__stats {
    margin: 0 24px 16px;
    :deep(.arco-card-body) {
      padding: 16px;
    }
  }
  &__stat-sub {
    font-size: 12px;
    color: var(--color-text-3);
    margin-top: 4px;
  }
  &__filter {
    margin: 0 24px 16px;
  }
  &__list {
    margin: 0 24px 24px;
  }
  &__detail-alert {
    margin-bottom: 16px;
  }
  &__sub {
    font-size: 12px;
    color: var(--color-text-3);
  }
}
</style>
