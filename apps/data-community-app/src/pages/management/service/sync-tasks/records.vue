<template>
  <PageContainer size="wide" class="sync-records">
    <PageHeader
      title="同步任务·执行记录"
      sub-title="Doris ↔ Hive 双向同步执行记录 · 全员可见 · 人人可查"
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

    <!-- 统计卡片 -->
    <a-row :gutter="16" class="sync-records__stats">
      <a-col :span="6">
        <a-card :bordered="false">
          <a-statistic title="累计任务" :value="store.stats.total" />
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
            title="失败/超时"
            :value="store.stats.failed"
            :value-style="{ color: '#f53f3f' }"
          />
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card :bordered="false">
          <a-statistic
            title="执行中/待执行"
            :value="store.stats.running"
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
            placeholder="搜索任务编号 / 源表名 / 发起人"
            allow-clear
          >
            <template #prefix><icon-search /></template>
          </a-input>
        </a-col>
        <a-col :span="4">
          <a-select
            v-model="store.listFilter.direction"
            placeholder="同步方向"
            allow-clear
          >
            <a-option value="all">全部方向</a-option>
            <a-option value="doris-to-hive">Doris → Hive</a-option>
            <a-option value="hive-to-doris">Hive → Doris</a-option>
          </a-select>
        </a-col>
        <a-col :span="4">
          <a-select v-model="store.listFilter.status" placeholder="执行状态" allow-clear>
            <a-option value="all">全部状态</a-option>
            <a-option value="success">成功</a-option>
            <a-option value="failed">失败</a-option>
            <a-option value="running">执行中</a-option>
            <a-option value="pending">待执行</a-option>
            <a-option value="timeout">超时</a-option>
          </a-select>
        </a-col>
        <a-col :span="4">
          <a-select
            v-model="store.listFilter.creator"
            placeholder="发起人"
            allow-clear
          >
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
              {{ store.filteredRecords.length }} / {{ store.records.length }} 条
            </span>
          </a-space>
        </a-col>
      </a-row>

      <a-table
        :columns="columns"
        :data="store.filteredRecords"
        row-key="id"
        size="medium"
        stripe
        :pagination="{ pageSize: 10, showTotal: true }"
        :scroll="{ x: 1280 }"
      >
        <template #id="{ record }">
          <a-link @click="openDetail(record)">{{ record.id }}</a-link>
          <a-tooltip v-if="isLoopSync(record)" content="源表名 = 目标表名,可能存在循环同步">
            <a-tag color="red" size="small" class="sync-records__loop">回灌</a-tag>
          </a-tooltip>
        </template>

        <template #direction="{ record }">
          <a-tag :color="directionMeta(record.direction).color" size="small">
            {{ directionMeta(record.direction).text }}
          </a-tag>
        </template>

        <template #sourceTable="{ record }">
          <code class="sync-records__code">{{ record.sourceDatabase }}.{{ record.sourceTable }}</code>
          <div class="text-gray sync-records__sub">{{ record.srcTable.comment }}</div>
        </template>

        <template #targetTable="{ record }">
          <code class="sync-records__code">{{ record.targetDatabase }}.{{ record.targetTable }}</code>
          <a-tag v-if="record.targetSnapshot.tmp" color="orange" size="small" style="margin-left: 4px">tmp</a-tag>
        </template>

        <template #status="{ record }">
          <a-tag :color="statusMeta(record.status).color" size="small">
            <template #icon>
              <icon-loading v-if="record.status === 'running'" />
            </template>
            {{ statusMeta(record.status).text }}
          </a-tag>
        </template>

        <template #rows="{ record }">
          {{ record.rowsCopied.toLocaleString() }}
        </template>

        <template #cost="{ record }">
          {{ formatCost(record.costMs) }}
        </template>

        <template #actions="{ record }">
          <a-space size="mini" wrap>
            <a-link @click="openDetail(record)">详情</a-link>
            <a-link
              v-if="record.status === 'failed'"
              status="danger"
              @click="retry(record)"
            >重试</a-link>
            <a-tag v-if="record.status === 'running' || record.status === 'pending'" color="arcoblue" size="small">
              执行中
            </a-tag>
          </a-space>
        </template>

        <template #empty>
          <a-empty description="暂无符合条件的同步记录">
            <a-button @click="store.resetListFilter">清空筛选</a-button>
            <a-button v-if="!store.records.length" type="primary" @click="goCreate">
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
      :width="640"
      unmount-on-close
    >
      <template v-if="current">
        <a-alert
          v-if="current.status === 'failed' || current.status === 'timeout'"
          type="error"
          :show-icon="true"
          class="sync-records__drawer-alert"
        >
          {{ current.errorMessage || '执行失败,源数据未受影响。' }}
        </a-alert>

        <a-descriptions :column="2" bordered size="medium" title="基础信息">
          <a-descriptions-item label="任务编号">{{ current.id }}</a-descriptions-item>
          <a-descriptions-item label="发起人">{{ current.creator }}</a-descriptions-item>
          <a-descriptions-item label="同步方向">
            <a-tag :color="directionMeta(current.direction).color" size="small">
              {{ directionMeta(current.direction).text }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="执行状态">
            <a-tag :color="statusMeta(current.status).color" size="small">
              {{ statusMeta(current.status).text }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="源表">
            <code class="sync-records__code">{{ current.sourceDatabase }}.{{ current.sourceTable }}</code>
          </a-descriptions-item>
          <a-descriptions-item label="目标端">
            <code class="sync-records__code">{{ current.targetDatabase }}.{{ current.targetTable }}</code>
          </a-descriptions-item>
          <a-descriptions-item label="字段数">{{ current.fieldCount }}</a-descriptions-item>
          <a-descriptions-item label="耗时">{{ formatCost(current.costMs) }}</a-descriptions-item>
          <a-descriptions-item label="搬迁行数">{{ current.rowsCopied.toLocaleString() }}</a-descriptions-item>
          <a-descriptions-item label="起止时间">
            <div>{{ current.startedAt }}</div>
            <div v-if="current.finishedAt" class="text-gray">{{ current.finishedAt }}</div>
          </a-descriptions-item>
          <a-descriptions-item v-if="current.note" label="备注" :span="2">
            {{ current.note }}
          </a-descriptions-item>
        </a-descriptions>

        <div class="sync-records__drawer-block">
          <div class="block-title">源表字段预览</div>
          <a-table
            :columns="fieldColumns"
            :data="current.srcTable.fields"
            :pagination="false"
            row-key="name"
            size="small"
            :scroll="{ y: 240 }"
          />
        </div>

        <div class="sync-records__drawer-block">
          <div class="block-title">通知送达</div>
          <a-descriptions :column="1" bordered size="small">
            <a-descriptions-item label="数据服务公众号">本期不实现(预留字段)</a-descriptions-item>
            <a-descriptions-item label="数字社区">本期不实现(预留字段)</a-descriptions-item>
          </a-descriptions>
        </div>
      </template>

      <template #footer>
        <a-space>
          <a-button @click="detailVisible = false">关闭</a-button>
          <a-button
            v-if="current && current.status === 'failed'"
            type="primary"
            status="danger"
            @click="retry(current)"
          >
            <template #icon><icon-refresh /></template>
            重试该任务
          </a-button>
        </a-space>
      </template>
    </a-drawer>
  </PageContainer>
</template>

<script setup lang="ts">
/**
 * 数据任务服务(一期) · Doris ↔ Hive 双向自助同步 - 执行记录列表
 *
 * 实现需求文档模块 B:
 *   B1 执行记录列表(R16-R19)
 *   R17 同步方向标识
 *   R18 检索(源表名/发起人/方向/时间/状态)
 *   R19 回灌视觉标记
 * E12 列表加载失败 → 重试入口
 */
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import PageContainer from '@/components-dca/common/PageContainer.vue'
import PageHeader from '@/components-dca/common/PageHeader.vue'
import { useSyncTaskStore } from '@/stores-dca/management/sync-task'
import { SYNC_DIRECTION_META, SYNC_STATUS_META } from '@/mock/service/sync-tasks'
import type { SyncDirection, SyncRecord, SyncStatus } from '@/mock/service/sync-tasks-types'

const router = useRouter()
const store = useSyncTaskStore()

const goCreate = () => router.push({ name: 'service-sync-create' })

/* ── 列表列定义 ── */

const columns = [
  { title: '任务编号', dataIndex: 'id', slotName: 'id', width: 200 },
  { title: '同步方向', dataIndex: 'direction', slotName: 'direction', width: 130 },
  { title: '源表', dataIndex: 'sourceTable', slotName: 'sourceTable', width: 280 },
  { title: '目标端', dataIndex: 'targetTable', slotName: 'targetTable', width: 280 },
  { title: '执行状态', dataIndex: 'status', slotName: 'status', width: 100 },
  { title: '发起人', dataIndex: 'creator', width: 100 },
  { title: '搬迁行数', dataIndex: 'rows', slotName: 'rows', width: 110 },
  { title: '耗时', dataIndex: 'cost', slotName: 'cost', width: 100 },
  { title: '提交时间', dataIndex: 'startedAt', width: 170 },
  { title: '操作', dataIndex: 'actions', slotName: 'actions', width: 130, fixed: 'right' }
]

/* ── 字段预览(详情抽屉) ── */

const fieldColumns = [
  { title: '字段', dataIndex: 'name', width: 200 },
  { title: '类型', dataIndex: 'type', width: 160 }
]

/* ── 派生 ── */

function directionMeta(d: SyncDirection) {
  return SYNC_DIRECTION_META[d] ?? { text: d, color: 'gray' }
}

function statusMeta(s: SyncStatus) {
  return SYNC_STATUS_META[s] ?? { text: s, color: 'gray' }
}

/** 是否循环同步(同名回灌) */
function isLoopSync(r: SyncRecord): boolean {
  return r.sourceTable === r.targetTable
}

/** 耗时展示 */
function formatCost(ms: number): string {
  if (!ms) return '—'
  if (ms < 1000) return `${ms} ms`
  const s = ms / 1000
  if (s < 60) return `${s.toFixed(1)} s`
  return `${Math.floor(s / 60)}m${Math.round(s % 60)}s`
}

/* ── 详情 ── */

const detailVisible = ref(false)
const current = ref<SyncRecord | null>(null)
function openDetail(record: SyncRecord) {
  current.value = record
  detailVisible.value = true
}

/* ── 重试 ── */

function retry(record: SyncRecord) {
  const r = store.retry(record.id)
  if (r) {
    Message.success(`任务「${r.id}」已重新加入执行队列`)
    detailVisible.value = false
  }
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
    margin-top: 2px;
  }
  &__loop {
    margin-left: 4px;
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
}
</style>
