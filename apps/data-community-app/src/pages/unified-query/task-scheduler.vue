<template>
  <PageContainer size="wide" class="uq-task-page">
    <PageHeader title="数据任务服务" sub-title="同步 + 调度任务统一入口、同一份实例列表;调度任务脚本复用统一查询平台">
      <template #extra>
        <a-space size="mini">
          <a-button type="primary" @click="openTypeChoose">
            <template #icon><icon-plus /></template>
            新建任务
          </a-button>
          <a-button @click="router.push({ name: 'unified-query-tasks-instances' })">
            <template #icon><icon-list /></template>
            执行实例
          </a-button>
          <a-button @click="router.push({ name: 'service-sync' })">
            <template #icon><icon-storage /></template>
            同步任务快查
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
            <a-link @click="openTaskInstances(record)">
              {{ record.taskName }}
            </a-link>
            <span v-if="record.taskType === 'schedule' && record.scriptName" class="uq-task-name__sub">
              关联脚本:{{ record.scriptName }}
            </span>
            <span v-if="record.taskType === 'sync'" class="uq-task-name__sub">
              {{ record.sourceTable }} → {{ record.targetTable }}
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
            <a-link @click="openTaskInstances(record)">实例</a-link>
            <a-link v-if="record.taskType === 'schedule'" @click="editSchedule(record)">配置</a-link>
            <a-link v-if="record.taskType === 'sync' && record.status === 'failed'" status="danger" @click="retrySync(record)">重跑</a-link>
          </a-space>
        </template>
      </a-table>
    </a-card>

    <!-- 任务详情抽屉(F24 + F34 + F35) -->
    <DetailDrawer v-model:visible="drawerVisible" :task-id="drawerTaskId" />

    <!-- 定时配置弹窗(F25-F29) -->
    <a-modal
      :visible="configVisible"
      :title="configMode === 'create' ? '新建定时任务' : '编辑任务配置'"
      :width="640"
      :mask-closable="false"
      @cancel="configVisible = false"
      @ok="submitConfig"
    >
      <a-form :model="configForm" layout="vertical">
        <!-- F25: 关联脚本 -->
        <a-form-item label="任务名称" field="name" required>
          <a-input v-model="configForm.name" placeholder="请输入任务名称" />
        </a-form-item>
        <a-form-item label="关联脚本" field="scriptId" required>
          <a-select
            v-model="configForm.scriptId"
            placeholder="请选择关联脚本"
            allow-clear
            @change="onScriptChange"
          >
            <a-optgroup label="共享脚本">
              <a-option
                v-for="s in sharedScripts"
                :key="s.id"
                :value="s.id"
                :label="s.name"
              />
            </a-optgroup>
            <a-optgroup label="我的脚本">
              <a-option
                v-for="s in myScripts"
                :key="s.id"
                :value="s.id"
                :label="s.name"
              />
            </a-optgroup>
          </a-select>
        </a-form-item>
        <a-form-item label="数据源">
          <DataSourceBadge v-if="selectedScript" :datasource="selectedScript.datasource" mode="full" />
          <span v-else class="uq-form-hint">选择脚本后自动带出</span>
        </a-form-item>

        <!-- F26: 频率联动 + Cron 展示 -->
        <a-form-item label="调度频率" field="schedule" required>
          <a-select v-model="configForm.schedule" placeholder="请选择调度频率" @change="onScheduleChange">
            <a-option v-for="p in schedulePresets" :key="p" :value="p" :label="p" />
          </a-select>
        </a-form-item>
        <a-form-item label="Cron 表达式">
          <a-input v-model="configForm.cronExpression" placeholder="Cron 表达式">
            <template #append>
              <a-tooltip content="由调度频率自动生成,也可手动修改">
                <icon-info-circle />
              </a-tooltip>
            </template>
          </a-input>
        </a-form-item>

        <!-- F27: 通知告警配置 -->
        <a-divider orientation="left">通知告警</a-divider>
        <a-form-item label="执行成功时通知">
          <a-switch v-model="configForm.notify.notifyOnSuccess" />
          <template v-if="configForm.notify.notifyOnSuccess">
            <span class="uq-form-label">通知通道:</span>
            <a-select v-model="configForm.notify.successChannel" size="small" style="width: 120px">
              <a-option value="dingtalk" label="钉钉" />
              <a-option value="feishu" label="飞书" />
              <a-option value="email" label="邮件" />
            </a-select>
          </template>
        </a-form-item>
        <a-form-item label="执行失败时通知">
          <a-switch v-model="configForm.notify.notifyOnFailed" />
          <template v-if="configForm.notify.notifyOnFailed">
            <span class="uq-form-label">通知通道:</span>
            <a-select v-model="configForm.notify.failedChannel" size="small" style="width: 120px">
              <a-option value="dingtalk" label="钉钉" />
              <a-option value="feishu" label="飞书" />
              <a-option value="email" label="邮件" />
            </a-select>
          </template>
        </a-form-item>
        <a-form-item label="超时通知阈值(分钟)">
          <a-input-number v-model="configForm.notify.timeoutMinutes" :min="0" :max="120" placeholder="0 表示不启用" />
        </a-form-item>
        <a-form-item label="连续失败升级阈值(次)">
          <a-input-number v-model="configForm.notify.maxConsecutiveFailures" :min="0" :max="10" placeholder="0 表示不启用" />
        </a-form-item>

        <!-- F28: 高级设置 -->
        <a-divider orientation="left">高级设置</a-divider>
        <a-form-item label="重试次数">
          <a-input-number v-model="configForm.advanced.retryCount" :min="0" :max="10" />
        </a-form-item>
        <a-form-item label="重试间隔(分钟)">
          <a-input-number v-model="configForm.advanced.retryInterval" :min="1" :max="60" />
        </a-form-item>
        <a-form-item label="跳过堆积任务">
          <a-switch v-model="configForm.advanced.skipBacklog" />
          <span class="uq-form-hint">错过执行时间后不补跑</span>
        </a-form-item>
      </a-form>
    </a-modal>

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
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import PageContainer from '@/components-dca/common/PageContainer.vue'
import PageHeader from '@/components-dca/common/PageHeader.vue'
import StatusTag from '@/components-dca/unified-query/StatusTag.vue'
import DataSourceBadge from '@/components-dca/unified-query/DataSourceBadge.vue'
import DetailDrawer from '@/components-dca/unified-query/DetailDrawer.vue'
import { useUqTaskStore } from '@/stores-dca/unified-query/task'
import { useSyncTaskStore } from '@/stores-dca/management/sync-task'
import { useUqScriptStore } from '@/stores-dca/unified-query/script'
import { useTaskInstanceStore } from '@/stores-dca/unified-query/task-instance'
import { SCHEDULE_PRESETS, TASK_TREND_7D } from '@/mock/unified-query/tasks'
import type { TaskRecord, NotifyConfig } from '@/mock/unified-query/types'
import type { TaskSummary } from '@/stores-dca/unified-query/task-instance'

const router = useRouter()
const store = useUqTaskStore()
const syncStore = useSyncTaskStore()
const scriptStore = useUqScriptStore()
const instanceStore = useTaskInstanceStore()
const trend = TASK_TREND_7D
const schedulePresets = SCHEDULE_PRESETS

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

/** 调度任务:跳到原定时配置 modal */
function editSchedule(row: TaskSummary) {
  if (row.taskType !== 'schedule') return
  const t = store.getById(row.taskId)
  if (t) editConfig(t)
}

/** 同步失败任务:重跑 */
function retrySync(row: TaskSummary) {
  if (row.taskType !== 'sync') return
  const r = syncStore.retry(row.taskId)
  if (r) Message.success(`任务「${r.id}」已重新加入执行队列`)
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
  openCreateConfig()
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

/* ── F25-F29: 定时配置弹窗 ── */
const configVisible = ref(false)
const configMode = ref<'create' | 'edit'>('create')
const editingTaskId = ref<string | null>(null)

const sharedScripts = computed(() => scriptStore.byScope('shared'))
const myScripts = computed(() => scriptStore.byScope('mine'))
const selectedScript = computed(() =>
  configForm.scriptId ? scriptStore.getById(configForm.scriptId) : null
)

const configForm = reactive({
  name: '',
  scriptId: '',
  schedule: '每天 02:00',
  cronExpression: '0 0 2 * * ?',
  notify: {
    notifyOnSuccess: false,
    notifyOnFailed: true,
    successChannel: 'dingtalk',
    failedChannel: 'dingtalk',
    timeoutMinutes: 0,
    maxConsecutiveFailures: 3
  } as NotifyConfig,
  advanced: {
    retryCount: 3,
    retryInterval: 5,
    skipBacklog: false
  }
})

/** F26: 频率 → Cron 联动 */
function cronFromSchedule(schedule: string): string {
  const map: Record<string, string> = {
    '每小时': '0 0 * * * ?',
    '每天 02:00': '0 0 2 * * ?',
    '每天 06:00': '0 0 6 * * ?',
    '每周一 07:00': '0 0 7 ? * MON',
    '每月 1 日 08:00': '0 0 8 1 * ?'
  }
  return map[schedule] ?? '0 0 2 * * ?'
}

function onScheduleChange(val: string) {
  configForm.cronExpression = cronFromSchedule(val)
}

function onScriptChange() {
  // 选择脚本后自动带出数据源信息(selectedScript computed 已处理)
}

function resetForm() {
  configForm.name = ''
  configForm.scriptId = ''
  configForm.schedule = '每天 02:00'
  configForm.cronExpression = '0 0 2 * * ?'
  configForm.notify = {
    notifyOnSuccess: false,
    notifyOnFailed: true,
    successChannel: 'dingtalk',
    failedChannel: 'dingtalk',
    timeoutMinutes: 0,
    maxConsecutiveFailures: 3
  }
  configForm.advanced = {
    retryCount: 3,
    retryInterval: 5,
    skipBacklog: false
  }
}

function openCreateConfig() {
  router.push({ name: 'unified-query-task-create' })
}

function editConfig(record: TaskRecord) {
  configMode.value = 'edit'
  editingTaskId.value = record.id
  configForm.name = record.name
  const script = scriptStore.list.find(s => s.name === record.scriptName)
  configForm.scriptId = script?.id ?? ''
  configForm.schedule = record.schedule
  configForm.cronExpression = record.cronExpression
  configForm.notify = { ...record.notify }
  configForm.advanced = { ...record.advanced }
  configVisible.value = true
}

/** F29: 提交定时配置(新建或编辑) */
function submitConfig() {
  if (!configForm.name.trim()) {
    Message.warning('请填写任务名称')
    return
  }
  if (!configForm.scriptId) {
    Message.warning('请选择关联脚本')
    return
  }
  const script = scriptStore.getById(configForm.scriptId)
  if (!script) {
    Message.error('关联脚本不存在')
    return
  }

  if (configMode.value === 'edit' && editingTaskId.value) {
    store.updateConfig(editingTaskId.value, {
      name: configForm.name,
      schedule: configForm.schedule,
      cronExpression: configForm.cronExpression,
      notify: { ...configForm.notify },
      advanced: { ...configForm.advanced }
    })
    Message.success('任务配置已更新')
  } else {
    store.createTask({
      name: configForm.name,
      datasource: script.datasource,
      scriptName: script.name,
      schedule: configForm.schedule,
      cronExpression: configForm.cronExpression,
      notify: { ...configForm.notify },
      advanced: { ...configForm.advanced }
    })
    Message.success('定时任务创建成功')
  }
  configVisible.value = false
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

.uq-form-hint {
  font-size: 12px;
  color: var(--color-text-3);
}

.uq-form-label {
  margin-left: 12px;
  font-size: 13px;
  color: var(--color-text-2);
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
