<template>
  <PageContainer size="wide" class="sync-records">
    <PageHeader
      title="同步任务·任务列表"
      sub-title="Doris ↔ Hive 双向同步任务 · 每条任务可多次执行(手动/定时) · 全员可见"
    >
      <template #extra>
        <a-space>
          <a-button @click="router.push({ name: 'service' })">
            <template #icon><icon-left /></template>
            返回服务
          </a-button>
          <a-button type="primary" @click="goCreate">
            <template #icon><icon-plus /></template>
            新建同步任务
          </a-button>
        </a-space>
      </template>
    </PageHeader>

    <!-- 统计卡片(任务级) -->
    <a-row :gutter="16" class="sync-records__stats">
      <a-col :span="6">
        <a-card :bordered="false">
          <a-statistic title="同步任务总数" :value="store.taskStats.total" />
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card :bordered="false">
          <a-statistic
            title="已启用"
            :value="store.taskStats.success"
            :value-style="{ color: '#00b42a' }"
          />
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card :bordered="false">
          <a-statistic
            title="失败"
            :value="store.taskStats.failed"
            :value-style="{ color: '#f53f3f' }"
          />
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card :bordered="false">
          <a-statistic
            title="运行中"
            :value="store.taskStats.running"
            :value-style="{ color: '#165dff' }"
          />
        </a-card>
      </a-col>
    </a-row>

    <!-- 筛选 + 列表 -->
    <a-card :bordered="false" class="sync-records__list">
      <a-row :gutter="12" class="sync-records__filters">
        <a-col :span="6">
          <a-input
            v-model="store.listFilter.keyword"
            placeholder="搜索任务编号 / 任务名 / 源表名 / 发起人"
            allow-clear
          >
            <template #prefix><icon-search /></template>
          </a-input>
        </a-col>
        <a-col :span="4">
          <a-select v-model="store.listFilter.direction" placeholder="同步方向" allow-clear>
            <a-option value="all">全部方向</a-option>
            <a-option value="doris-to-hive">Doris → Hive</a-option>
            <a-option value="hive-to-doris">Hive → Doris</a-option>
          </a-select>
        </a-col>
        <a-col :span="4">
          <a-select v-model="store.listFilter.status" placeholder="任务状态" allow-clear>
            <a-option value="all">全部状态</a-option>
            <a-option value="enabled">启用</a-option>
            <a-option value="disabled">停用</a-option>
            <a-option value="running">运行中</a-option>
            <a-option value="failed">失败</a-option>
            <a-option value="success">成功</a-option>
          </a-select>
        </a-col>
        <a-col :span="4">
          <a-select v-model="store.listFilter.creator" placeholder="发起人" allow-clear>
            <a-option value="">全部发起人</a-option>
            <a-option v-for="c in store.creatorOptions" :key="c" :value="c">
              {{ c }}
            </a-option>
          </a-select>
        </a-col>
        <a-col :span="6" style="text-align: right">
          <a-space>
            <a-button @click="store.resetListFilter">重置筛选</a-button>
            <span class="sync-records__filter-hint">
              {{ store.filteredTasks.length }} / {{ store.tasks.length }} 条
            </span>
          </a-space>
        </a-col>
      </a-row>

      <a-table
        :columns="columns"
        :data="store.filteredTasks"
        row-key="id"
        size="medium"
        stripe
        :pagination="{ pageSize: 10, showTotal: true }"
        :scroll="{ x: 1480 }"
        :expanded-row-keys="expandedRowKeys"
        @expand="onExpand"
      >
        <template #id="{ record }">
          <a-link @click="openDetail(record)">{{ record.id }}</a-link>
        </template>

        <template #name="{ record }">
          {{ record.name }}
        </template>

        <template #direction="{ record }">
          <a-tag :color="directionMeta(record.direction).color" size="small">
            {{ directionMeta(record.direction).text }}
          </a-tag>
        </template>

        <template #strategy="{ record }">
          <span class="sync-records__sub">
            {{ strategyText(record.strategy) }}
          </span>
        </template>

        <template #trigger="{ record }">
          <a-tag size="small" :color="record.trigger === 'schedule' ? 'purple' : 'arcoblue'">
            {{ record.trigger === 'schedule' ? `定时 · ${record.schedule || '—'}` : '手动' }}
          </a-tag>
        </template>

        <template #status="{ record }">
          <a-tag size="small" :color="taskStatusColor(record.status)">
            {{ taskStatusText(record.status) }}
          </a-tag>
        </template>

        <template #lastRun="{ record }">
          {{ record.lastRunAt || '—' }}
        </template>

        <template #runsCount="{ record }">
          <a-badge :count="runsForTask(record.id).length" :max-count="99" />
        </template>

        <template #actions="{ record }">
          <a-space size="mini" wrap>
            <a-link @click="openDetail(record)">详情</a-link>
            <a-link v-if="record.status === 'failed' || record.status === 'success' || record.status === 'enabled'" @click="runNow(record)">
              立即执行
            </a-link>
            <a-link v-if="record.status === 'disabled'" status="success" @click="enable(record)">启用</a-link>
            <a-link v-else-if="record.status !== 'running'" status="warning" @click="disable(record)">停用</a-link>
          </a-space>
        </template>

        <template #expanded-row="{ record }">
          <div class="sync-records__runs">
            <div class="block-title">执行历史({{ runsForTask(record.id).length }} 次)</div>
            <a-table
              :columns="runColumns"
              :data="runsForTask(record.id)"
              :pagination="false"
              row-key="id"
              size="small"
            >
              <template #trigger="{ record: r }">
                <a-tag size="small" :color="r.trigger === 'schedule' ? 'purple' : 'arcoblue'">
                  {{ r.trigger === 'schedule' ? '定时' : r.trigger === 'manual' ? '手动' : r.trigger }}
                </a-tag>
              </template>
              <template #status="{ record: r }">
                <a-tag size="small" :color="runStatusColor(r.status)">
                  {{ runStatusText(r.status) }}
                </a-tag>
              </template>
              <template #cost="{ record: r }">{{ formatCost(r.costMs) }}</template>
              <template #rows="{ record: r }">{{ r.rowsCopied.toLocaleString() }}</template>
              <template #startedAt="{ record: r }">
                <div>{{ r.startedAt }}</div>
                <div v-if="r.errorMessage" class="sync-records__err">{{ r.errorMessage }}</div>
              </template>
            </a-table>
          </div>
        </template>

        <template #empty>
          <a-empty description="暂无符合筛选条件的同步任务">
            <a-button @click="store.resetListFilter">清空筛选</a-button>
            <a-button v-if="!store.tasks.length" type="primary" @click="goCreate">
              立即新建
            </a-button>
          </a-empty>
        </template>
      </a-table>
    </a-card>

    <!-- ═══ 详情抽屉 ═══ -->
    <a-drawer
      v-model:visible="detailVisible"
      :title="`同步任务详情 · ${current?.id || ''}`"
      :width="720"
      unmount-on-close
    >
      <template v-if="current">
        <a-alert
          v-if="current.status === 'failed'"
          type="error"
          :show-icon="true"
          class="sync-records__drawer-alert"
        >
          最近一次执行失败,源数据未受影响
        </a-alert>

        <a-descriptions :column="2" bordered size="small" title="基础信息">
          <a-descriptions-item label="任务编号">{{ current.id }}</a-descriptions-item>
          <a-descriptions-item label="任务名">{{ current.name }}</a-descriptions-item>
          <a-descriptions-item label="发起人">{{ current.creator }}</a-descriptions-item>
          <a-descriptions-item label="任务状态">
            <a-tag size="small" :color="taskStatusColor(current.status)">{{ taskStatusText(current.status) }}</a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="同步方向">
            <a-tag :color="directionMeta(current.direction).color" size="small">
              {{ directionMeta(current.direction).text }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="触发方式">
            <a-tag size="small" :color="current.trigger === 'schedule' ? 'purple' : 'arcoblue'">
              {{ current.trigger === 'schedule' ? `定时 · ${current.schedule || '—'}` : '手动' }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="源端连接" :span="2">
            {{ current.source.datasource }} / {{ current.source.cluster }} / {{ current.source.database }}
          </a-descriptions-item>
          <a-descriptions-item label="目标端连接" :span="2">
            {{ current.target.datasource }} / {{ current.target.cluster }} / {{ current.target.database }}
          </a-descriptions-item>
          <a-descriptions-item label="源表 ID">{{ current.sourceTableId }}</a-descriptions-item>
          <a-descriptions-item label="目标表">{{ current.targetDatabase }}.{{ current.targetTable }}</a-descriptions-item>
          <a-descriptions-item label="同步策略" :span="2">
            {{ strategyText(current.strategy) }}
          </a-descriptions-item>
          <a-descriptions-item v-if="current.note" label="备注" :span="2">{{ current.note }}</a-descriptions-item>
        </a-descriptions>

        <div class="sync-records__drawer-block">
          <div class="block-title">字段映射({{ enabledFieldCount(current) }} / {{ current.fieldMappings.length }} 启用)</div>
          <a-table
            :columns="mappingColumns"
            :data="current.fieldMappings"
            :pagination="false"
            row-key="source"
            size="small"
          >
            <template #enabled="{ record }">
              <a-tag size="small" :color="record.enabled ? 'green' : 'gray'">
                {{ record.enabled ? '是' : '否' }}
              </a-tag>
            </template>
            <template #source="{ record }">
              <code class="sync-records__code">{{ record.source }}</code>
            </template>
            <template #target="{ record }">
              <code v-if="record.target" class="sync-records__code">{{ record.target }}</code>
              <span v-else class="text-gray">(丢弃)</span>
            </template>
          </a-table>
        </div>

        <div class="sync-records__drawer-block">
          <div class="block-title">执行历史</div>
          <a-table
            :columns="runColumns"
            :data="runsForTask(current.id)"
            :pagination="false"
            row-key="id"
            size="small"
          >
            <template #trigger="{ record: r }">
              <a-tag size="small" :color="r.trigger === 'schedule' ? 'purple' : 'arcoblue'">
                {{ r.trigger === 'schedule' ? '定时' : r.trigger === 'manual' ? '手动' : r.trigger }}
              </a-tag>
            </template>
            <template #status="{ record: r }">
              <a-tag size="small" :color="runStatusColor(r.status)">
                {{ runStatusText(r.status) }}
              </a-tag>
            </template>
            <template #cost="{ record: r }">{{ formatCost(r.costMs) }}</template>
            <template #rows="{ record: r }">{{ r.rowsCopied.toLocaleString() }}</template>
            <template #startedAt="{ record: r }">
              <div>{{ r.startedAt }}</div>
              <div v-if="r.finishedAt" class="text-gray">{{ r.finishedAt }}</div>
              <div v-if="r.errorMessage" class="sync-records__err">{{ r.errorMessage }}</div>
            </template>
          </a-table>
        </div>
      </template>

      <template #footer>
        <a-space>
          <a-button @click="detailVisible = false">关闭</a-button>
          <a-button
            v-if="current && (current.status === 'enabled' || current.status === 'success' || current.status === 'failed')"
            type="primary"
            @click="runNow(current)"
          >
            <template #icon><icon-play-circle /></template>
            立即执行
          </a-button>
          <a-button
            v-if="current && current.status === 'disabled'"
            type="primary"
            status="success"
            @click="enable(current)"
          >
            <template #icon><icon-check /></template>
            启用
          </a-button>
          <a-button
            v-else-if="current && current.status !== 'running'"
            status="warning"
            @click="disable(current)"
          >
            <template #icon><icon-pause /></template>
            停用
          </a-button>
        </a-space>
      </template>
    </a-drawer>
  </PageContainer>
</template>

<script setup lang="ts">
/**
 * 数据任务服务 · 同步任务列表 + 详情(P0 重构)
 *
 * 一级页面:任务列表(任务级,按 SyncTask)
 * - 行可展开:展示该任务历次 SyncRun
 * - 详情抽屉:展示任务配置(字段映射/策略/触发方式) + 执行历史
 */
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import PageContainer from '@/components-dca/common/PageContainer.vue'
import PageHeader from '@/components-dca/common/PageHeader.vue'
import { useSyncTaskStore } from '@/stores-dca/management/sync-task'
import { SYNC_DIRECTION_META } from '@/mock/service/sync-tasks'
import type { SyncDirection, SyncRunStatus, SyncTask, SyncTaskStatus } from '@/mock/service/sync-tasks-types'

const router = useRouter()
const store = useSyncTaskStore()

const goCreate = () => router.push({ name: 'service-sync-create' })

/* ── 列表列定义 ── */

const columns = [
  { title: '任务编号', dataIndex: 'id', slotName: 'id', width: 180 },
  { title: '任务名', dataIndex: 'name', slotName: 'name', width: 220 },
  { title: '方向', dataIndex: 'direction', slotName: 'direction', width: 140 },
  { title: '同步策略', dataIndex: 'strategy', slotName: 'strategy', width: 180 },
  { title: '触发方式', dataIndex: 'trigger', slotName: 'trigger', width: 160 },
  { title: '任务状态', dataIndex: 'status', slotName: 'status', width: 100 },
  { title: '最近执行', dataIndex: 'lastRun', slotName: 'lastRun', width: 170 },
  { title: '运行次数', dataIndex: 'runsCount', slotName: 'runsCount', width: 80 },
  { title: '操作', dataIndex: 'actions', slotName: 'actions', width: 200, fixed: 'right' }
]

/* ── 字段映射列 ── */

const mappingColumns = [
  { title: '启用', dataIndex: 'enabled', slotName: 'enabled', width: 70 },
  { title: '源字段', dataIndex: 'source', slotName: 'source', width: 220 },
  { title: '目标字段', dataIndex: 'target', slotName: 'target' }
]

/* ── 运行历史列 ── */

const runColumns = [
  { title: '运行编号', dataIndex: 'id', width: 200 },
  { title: '触发', dataIndex: 'trigger', slotName: 'trigger', width: 90 },
  { title: '状态', dataIndex: 'status', slotName: 'status', width: 100 },
  { title: '耗时', dataIndex: 'cost', slotName: 'cost', width: 100 },
  { title: '搬运行数', dataIndex: 'rows', slotName: 'rows', width: 110 },
  { title: '开始时间', dataIndex: 'startedAt', slotName: 'startedAt', width: 220 }
]

/* ── 派生 ── */

function directionMeta(d: SyncDirection) {
  return SYNC_DIRECTION_META[d] ?? { text: d, color: 'gray' }
}

function taskStatusColor(s: SyncTaskStatus): string {
  return ({
    enabled: 'green',
    disabled: 'gray',
    running: 'arcoblue',
    success: 'green',
    failed: 'red'
  } as Record<SyncTaskStatus, string>)[s] ?? 'gray'
}

function taskStatusText(s: SyncTaskStatus): string {
  return ({
    enabled: '启用',
    disabled: '停用',
    running: '运行中',
    success: '成功',
    failed: '失败'
  } as Record<SyncTaskStatus, string>)[s] ?? s
}

function runStatusColor(s: SyncRunStatus): string {
  return ({
    pending: 'gray',
    running: 'arcoblue',
    success: 'green',
    failed: 'red',
    timeout: 'orange'
  } as Record<SyncRunStatus, string>)[s] ?? 'gray'
}

function runStatusText(s: SyncRunStatus): string {
  return ({
    pending: '待执行',
    running: '运行中',
    success: '成功',
    failed: '失败',
    timeout: '超时'
  } as Record<SyncRunStatus, string>)[s] ?? s
}

function strategyText(s: SyncTask['strategy']): string {
  const mode = s.mode === 'full' ? '全量' : '增量'
  const write = s.writeMode === 'overwrite' ? '覆盖' : '追加'
  const checkMap = { none: '不校验', count: '行数校验', sample: '抽样校验' }
  return `${mode} · ${write} · ${checkMap[s.dataCheck]}`
}

/** 字段映射启用数 */
function enabledFieldCount(t: SyncTask): number {
  return t.fieldMappings.filter(f => f.enabled).length
}

/** 取任务所有 run(按时间倒序) */
function runsForTask(taskId: string) {
  return store.getRunsByTaskId(taskId)
}

/** 耗时展示 */
function formatCost(ms: number): string {
  if (!ms) return '—'
  if (ms < 1000) return `${ms} ms`
  const s = ms / 1000
  if (s < 60) return `${s.toFixed(1)} s`
  return `${Math.floor(s / 60)}m${Math.round(s % 60)}s`
}

/* ── 展开行 ── */

const expandedRowKeys = ref<string[]>([])
function onExpand(keys: (string | number)[], record: SyncTask) {
  if (keys.includes(record.id)) {
    expandedRowKeys.value.push(record.id)
  } else {
    expandedRowKeys.value = expandedRowKeys.value.filter(k => k !== record.id)
  }
}

/* ── 详情 ── */

const detailVisible = ref(false)
const current = ref<SyncTask | null>(null)
function openDetail(record: SyncTask) {
  current.value = record
  detailVisible.value = true
}

/* ── 写操作 ── */

function runNow(record: SyncTask) {
  if (record.status === 'disabled') {
    Message.warning('任务已停用,请先启用')
    return
  }
  store.submitRun(record.id, { trigger: 'manual', note: '手动触发' })
  Message.success(`任务「${record.name}」已触发执行`)
}

function enable(record: SyncTask) {
  store.enable(record.id)
  Message.success(`任务「${record.name}」已启用`)
}

function disable(record: SyncTask) {
  store.disable(record.id)
  Message.success(`任务「${record.name}」已停用`)
}
</script>

<style lang="scss" scoped>
.sync-records {
  &__stats {
    margin: 0 24px 16px;
    :deep(.arco-card-body) {
      padding: 16px;
    }
  }
  &__list {
    margin: 0 24px;
  }
  &__filters {
    margin-bottom: 12px;
  }
  &__filter-hint {
    font-size: 12px;
    color: var(--color-text-3);
  }
  &__code {
    font-family: 'Menlo', monospace;
    background: var(--color-fill-2);
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 12px;
    color: #165dff;
  }
  &__sub {
    font-size: 12px;
    color: var(--color-text-2);
  }
  &__drawer-alert {
    margin-bottom: 16px;
  }
  &__drawer-block {
    margin-top: 20px;
    .block-title {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 8px;
    }
  }
  &__runs {
    padding: 8px 16px;
    background: var(--color-fill-1);
    border-radius: 4px;
    margin: 4px 16px;
    .block-title {
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 8px;
    }
  }
  &__err {
    font-size: 12px;
    color: rgb(var(--danger-6));
    margin-top: 2px;
  }
}
</style>
