<template>
  <PageContainer size="wide" class="uq-export-page">
    <PageHeader title="我的导出" :sub-title="`共 ${store.list.length} 条任务`">
      <template #extra>
        <a-space size="mini">
          <a-button @click="router.push({ name: 'unified-query-sql' })">
            <template #icon><icon-thunderbolt /></template>
            去新建查询
          </a-button>
        </a-space>
      </template>
    </PageHeader>

    <!-- 筛选栏 -->
    <a-card class="uq-export-filter" :bordered="false">
      <div class="uq-export-filter__row">
        <div class="uq-export-filter__group">
          <span class="uq-export-filter__label">状态:</span>
          <a-radio-group v-model="store.statusFilter" size="small" type="button">
            <a-radio value="all">全部</a-radio>
            <a-radio value="active">进行中</a-radio>
            <a-radio value="success">成功</a-radio>
            <a-radio value="failed">失败</a-radio>
            <a-radio value="expired">已过期</a-radio>
          </a-radio-group>
        </div>
        <div class="uq-export-filter__group">
          <span class="uq-export-filter__label">数据源:</span>
          <a-select v-model="store.datasourceFilter" size="small" style="width: 120px">
            <a-option value="all">全部</a-option>
            <a-option v-for="ds in store.datasources" :key="ds" :value="ds" :label="ds" />
          </a-select>
        </div>
        <a-input-search
          v-model="store.keyword"
          size="small"
          placeholder="搜索文件名或任务编号"
          allow-clear
          style="width: 240px; margin-left: auto"
        />
      </div>
    </a-card>

    <!-- 导出任务列表 -->
    <a-card class="uq-export-list" :bordered="false" style="margin-top: 16px">
      <a-table
        :columns="columns"
        :data="store.filtered"
        :pagination="{ pageSize: 10, showTotal: true, size: 'small' }"
        row-key="id"
        size="medium"
      >
        <template #fileName="{ record }">
          <div class="uq-export-file">
            <icon-file class="uq-export-file__icon" />
            <a-tooltip :content="`${record.fileName}.${record.fileExt}`">
              <span class="uq-export-file__name">{{ record.fileName }}.{{ record.fileExt }}</span>
            </a-tooltip>
          </div>
        </template>

        <template #datasource="{ record }">
          <a-tag :color="EXPORT_DS_COLOR[record.datasource] ?? 'gray'" size="small">
            {{ record.datasource }}
          </a-tag>
        </template>

        <template #status="{ record }">
          <a-tag :color="statusMeta(record.status).tag" size="small" class="uq-export-status">
            <template #icon>
              <icon-loading v-if="record.status === 'exporting'" />
              <span v-else class="uq-dot" :style="{ background: statusMeta(record.status).dot }" />
            </template>
            {{ statusMeta(record.status).text }}
          </a-tag>
        </template>

        <template #progress="{ record }">
          <div class="uq-export-progress">
            <div class="uq-export-progress__bar">
              <span
                class="uq-export-progress__fill"
                :class="`is-${record.status}`"
                :style="{ width: `${record.progress}%` }"
              />
            </div>
            <span class="uq-export-progress__text">
              {{ record.status === 'queued' ? '等待' : `${record.progress}%` }}
            </span>
          </div>
        </template>

        <template #fileSize="{ record }">
          <span :class="{ 'is-muted': record.fileSize === '—' }">{{ record.fileSize }}</span>
        </template>

        <template #operations="{ record }">
          <a-space size="mini" wrap>
            <!-- 下载:导出中/排队中/成功 可下载 -->
            <a-link
              v-if="record.status === 'success' || record.status === 'exporting' || record.status === 'queued'"
              :disabled="record.status !== 'success' && !record.data"
              @click="handleDownload(record)"
            >下载</a-link>
            <!-- 取消:导出中/排队中 -->
            <a-link
              v-if="record.status === 'exporting' || record.status === 'queued'"
              status="danger"
              @click="handleCancel(record)"
            >取消</a-link>
            <!-- 重试:失败 -->
            <a-link
              v-if="record.status === 'failed'"
              @click="handleRetry(record)"
            >重试</a-link>
            <!-- 已过期:置灰 -->
            <a-link v-if="record.status === 'expired'" disabled>已过期</a-link>
            <!-- 详情:非进行中 -->
            <a-link
              v-if="record.status === 'success' || record.status === 'failed' || record.status === 'expired'"
              @click="openDetail(record)"
            >详情</a-link>
          </a-space>
        </template>
      </a-table>
    </a-card>

    <!-- 详情抽屉 -->
    <a-drawer
      v-model:visible="detailVisible"
      title="导出任务详情"
      :width="420"
      :footer="false"
    >
      <a-descriptions v-if="detailTask" :column="1" bordered size="medium">
        <a-descriptions-item label="任务编号">{{ detailTask.id }}</a-descriptions-item>
        <a-descriptions-item label="文件名">{{ detailTask.fileName }}.{{ detailTask.fileExt }}</a-descriptions-item>
        <a-descriptions-item label="数据源">{{ detailTask.datasource }}</a-descriptions-item>
        <a-descriptions-item label="导出方式">{{ detailTask.method === 'platform' ? '保存到平台' : '下载到本地' }}</a-descriptions-item>
        <a-descriptions-item label="状态">{{ statusMeta(detailTask.status).text }}</a-descriptions-item>
        <a-descriptions-item label="进度">{{ detailTask.progress }}%</a-descriptions-item>
        <a-descriptions-item label="文件大小">{{ detailTask.fileSize }}</a-descriptions-item>
        <a-descriptions-item label="返回行数">{{ detailTask.rowCount.toLocaleString() }}</a-descriptions-item>
        <a-descriptions-item label="创建时间">{{ detailTask.createdAt }}</a-descriptions-item>
      </a-descriptions>
    </a-drawer>
  </PageContainer>
</template>

<script setup lang="ts">
/**
 * 我的导出 —— 统一查询结果导出任务列表页
 *
 * 与「任务调度」平级,展示从 SQL 结果页创建的导出任务。
 * 状态机:queued → exporting → success / failed;expired 为静态演示态。
 * 全部为前端 Mock,不发起任何 HTTP 请求。
 */
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import PageContainer from '@/components-dca/common/PageContainer.vue'
import PageHeader from '@/components-dca/common/PageHeader.vue'
import { useUqExportStore } from '@/stores-dca/unified-query/export'
import { EXPORT_DS_COLOR } from '@/mock/unified-query/export-tasks'
import type { ExportStatus, ExportTask, ResultColumn } from '@/mock/unified-query/types'

const router = useRouter()
const store = useUqExportStore()

const columns = [
  { title: '任务编号', dataIndex: 'id', width: 160 },
  { title: '文件名', dataIndex: 'fileName', slotName: 'fileName', width: 260 },
  { title: '数据源', dataIndex: 'datasource', slotName: 'datasource', width: 100 },
  { title: '状态', dataIndex: 'status', slotName: 'status', width: 110 },
  { title: '进度', dataIndex: 'progress', slotName: 'progress', width: 160 },
  { title: '文件大小', dataIndex: 'fileSize', slotName: 'fileSize', width: 110 },
  { title: '创建时间', dataIndex: 'createdAt', width: 170 },
  { title: '操作', dataIndex: 'operations', slotName: 'operations', width: 150 }
]

const STATUS_META: Record<ExportStatus, { text: string; tag: string; dot: string }> = {
  queued: { text: '排队中', tag: 'orange', dot: '#ff7d10' },
  exporting: { text: '导出中', tag: 'green', dot: '#00b42a' },
  success: { text: '成功', tag: 'arcoblue', dot: '#165dff' },
  failed: { text: '失败', tag: 'red', dot: '#f53f3f' },
  expired: { text: '已过期', tag: 'gray', dot: '#c9cdd4' }
}

function statusMeta(s: ExportStatus) {
  return STATUS_META[s] ?? STATUS_META.queued
}

/* ── 操作 ── */
function buildCsv(cols: ResultColumn[], data: Record<string, string | number>[]): string {
  const header = cols.map(c => c.title).join(',')
  const lines = data.map(r =>
    cols.map(c => {
      const v = r[c.dataIndex] ?? ''
      const s = String(v)
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }).join(',')
  )
  return '\uFEFF' + [header, ...lines].join('\n')
}

function handleDownload(record: ExportTask) {
  if (!record.data) {
    Message.info('该演示任务无结果集快照,无法下载')
    return
  }
  const csv = buildCsv(record.data.columns, record.data.rows)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${record.fileName}.${record.fileExt}`
  a.click()
  URL.revokeObjectURL(url)
  Message.success(`已开始下载 ${record.fileName}.${record.fileExt}`)
}

function handleCancel(record: ExportTask) {
  store.cancel(record.id)
  Message.success(`任务「${record.id}」已取消`)
}

function handleRetry(record: ExportTask) {
  store.retry(record.id)
  Message.success(`任务「${record.id}」已重新加入导出队列`)
}

/* ── 详情抽屉 ── */
const detailVisible = ref(false)
const detailTask = ref<ExportTask | null>(null)

function openDetail(record: ExportTask) {
  detailTask.value = record
  detailVisible.value = true
}
</script>

<style lang="scss" scoped>
.uq-export-filter {
  &__row {
    display: flex;
    align-items: center;
    gap: 24px;
    flex-wrap: wrap;
  }

  &__group {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__label {
    font-size: 13px;
    color: var(--color-text-2);
  }
}

.uq-export-file {
  display: flex;
  align-items: center;
  gap: 8px;

  &__icon {
    color: rgb(var(--primary-6));
    flex: none;
  }

  &__name {
    display: inline-block;
    max-width: 220px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    vertical-align: middle;
  }
}

.uq-export-status {
  .uq-dot {
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    vertical-align: middle;
  }
}

.uq-export-progress {
  display: flex;
  align-items: center;
  gap: 8px;

  &__bar {
    flex: 1;
    height: 6px;
    border-radius: 3px;
    background: var(--color-fill-2);
    overflow: hidden;
    min-width: 60px;
  }

  &__fill {
    display: block;
    height: 100%;
    border-radius: 3px;
    transition: width 0.4s ease;

    &.is-exporting { background: rgb(var(--success-6)); }
    &.is-success { background: rgb(var(--primary-6)); }
    &.is-failed { background: rgb(var(--danger-6)); }
    &.is-queued { background: var(--color-fill-3); }
    &.is-expired { background: var(--color-fill-3); }
  }

  &__text {
    flex: none;
    width: 40px;
    font-size: 12px;
    color: var(--color-text-3);
  }
}

.is-muted {
  color: var(--color-text-4);
}
</style>
