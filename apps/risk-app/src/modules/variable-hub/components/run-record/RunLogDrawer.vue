<!--
  执行实例日志抽屉（评估域 / 效果域共用）
  - 按时间顺序展示执行日志（info / warn / error 分色）
  - 支持只看异常日志，便于失败实例快速定位
-->
<template>
  <a-drawer
    :visible="visible"
    title="执行日志"
    :width="720"
    :footer="false"
    unmount-on-close
    @cancel="handleClose"
  >
    <template v-if="record">
      <div class="run-head">
        <div class="run-head-title">
          <span class="name">{{ record.taskName }}</span>
          <a-tag :color="store.statusColor(record.status)" size="small">{{ store.statusLabel(record.status) }}</a-tag>
          <a-tag size="small">{{ store.triggerLabel(record.trigger) }}</a-tag>
          <a-tag size="small" color="gray">{{ record.domainLabel }}</a-tag>
        </div>
        <div class="run-head-meta">
          <span><icon-clock-circle /> {{ record.startedAt }}</span>
          <span><icon-common /> 第 {{ record.seq }} 次执行</span>
          <span><icon-user /> {{ record.triggeredBy }}</span>
        </div>
      </div>

      <a-descriptions :column="3" size="small" class="run-desc">
        <a-descriptions-item label="实例 ID">{{ record.id }}</a-descriptions-item>
        <a-descriptions-item label="耗时">{{ store.formatDuration(record.durationMs) }}</a-descriptions-item>
        <a-descriptions-item v-for="m in record.metrics.slice(0, 4)" :key="m.label" :label="m.label">
          {{ m.value }}
        </a-descriptions-item>
      </a-descriptions>

      <a-space class="log-toolbar">
        <a-radio-group v-model="levelFilter" type="button" size="small">
          <a-radio value="all">全部（{{ record.logs.length }}）</a-radio>
          <a-radio value="warn">只看异常（{{ warnCount }}）</a-radio>
        </a-radio-group>
        <a-button size="small" @click="copyLogs">
          <template #icon><icon-copy /></template>
          复制日志
        </a-button>
      </a-space>

      <div class="log-console">
        <div v-for="(log, idx) in filteredLogs" :key="idx" class="log-line" :class="`log-line--${log.level}`">
          <span class="log-time">{{ log.time }}</span>
          <span class="log-level">{{ log.level.toUpperCase() }}</span>
          <span class="log-text">{{ log.message }}</span>
        </div>
        <div v-if="!filteredLogs.length" class="log-empty">暂无该级别的日志</div>
      </div>
    </template>
  </a-drawer>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Message } from '@arco-design/web-vue'
import { RunRecordStore, type RunRecord } from '@/modules/variable-hub/mock/run-record/run-record-store'

const store = RunRecordStore

const visible = ref(false)
const record = ref<RunRecord>()
const levelFilter = ref<'all' | 'warn'>('all')

const warnCount = computed(() => record.value?.logs.filter((l) => l.level !== 'info').length || 0)

const filteredLogs = computed(() => {
  const logs = record.value?.logs || []
  return levelFilter.value === 'warn' ? logs.filter((l) => l.level !== 'info') : logs
})

function open(target: RunRecord) {
  record.value = target
  // 异常终态默认只看异常日志，其余展示全量
  levelFilter.value = target.status === 'failed' || target.status === 'partial' ? 'warn' : 'all'
  visible.value = true
}

function handleClose() {
  visible.value = false
  record.value = undefined
}

const copyLogs = () => {
  const text = (record.value?.logs || []).map((l) => `[${l.time}] [${l.level.toUpperCase()}] ${l.message}`).join('\n')
  navigator.clipboard?.writeText(text).then(
    () => Message.success('日志已复制到剪贴板'),
    () => Message.warning('当前浏览器不支持自动复制，请手动选择日志')
  )
}

defineExpose({ open, close: handleClose })
</script>

<style scoped lang="less">
.run-head {
  padding-bottom: 12px;
  border-bottom: 1px solid var(--color-border-2);
}

.run-head-title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;

  .name {
    font-size: 16px;
    font-weight: 600;
    color: var(--color-text-1);
  }
}

.run-head-meta {
  margin-top: 8px;
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  font-size: 12px;
  color: var(--color-text-3);
}

.run-desc {
  margin: 12px 0;
}

.log-toolbar {
  margin-bottom: 12px;
}

.log-console {
  background: #1d2129;
  border-radius: 6px;
  padding: 12px;
  max-height: calc(100vh - 340px);
  overflow: auto;
  font-family: 'Menlo', 'Monaco', monospace;
  font-size: 12px;
  line-height: 1.7;
}

.log-line {
  display: flex;
  gap: 8px;
  white-space: pre-wrap;
  word-break: break-all;
  color: #c9cdd4;
}

.log-time {
  flex: none;
  color: #86909c;
}

.log-level {
  flex: none;
  width: 46px;
  color: #4e8dfc;
}

.log-line--warn .log-level {
  color: #ffcf5c;
}

.log-line--error .log-level,
.log-line--error .log-text {
  color: #f76965;
}

.log-empty {
  color: #86909c;
  text-align: center;
  padding: 24px 0;
}
</style>
