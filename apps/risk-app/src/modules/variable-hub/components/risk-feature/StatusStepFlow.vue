<!--
  11 状态机竖直点状步骤条（文档 §三 B1 §3.6 设计图 · v2 完整版）
  - 类型：Arco Design a-steps direction="vertical" type="dot"
  - 布局：步骤信息展示在步骤条右侧（description 区域）
  - 数据整合：状态变更记录 + 同步日志 + 下线批次 + 特征档案 + 动态操作 + 备注

  阶段：v2（用户反馈重构 · 治理与生命周期统一收纳）
  状态机严格对齐文档 v2.1 D.4：11 正常 + 4 异常 = 15 态
-->
<template>
  <div class="status-step-flow">
    <!-- ========== scope 外顶部提示 ========== -->
    <a-alert
      v-if="scopeBanner"
      :type="scopeBanner.type"
      :show-icon="true"
      class="mb-12"
    >
      <template #title>
        <component :is="scopeBanner.icon" /> {{ scopeBanner.title }}
      </template>
      <div class="alert-detail">
        <div>{{ scopeBanner.detail }}</div>
      </div>
    </a-alert>

    <!-- ========== 异常状态顶部 alert（仅当前 scope 包含异常态时展示） ========== -->
    <a-alert v-if="isFailedInScope" type="error" :show-icon="true" class="mb-12">
      <template #title>
        <icon-exclamation-circle-fill /> {{ currentStatusLabel }} · 异常状态
      </template>
      <div class="alert-detail">
        <div>失败原因：{{ failedReason || '—' }}</div>
        <div>失败时间：{{ failedAt || '—' }} · 已尝试 {{ retryCount }} 次</div>
        <a-space style="margin-top: 8px">
          <a-button v-if="showRetry" type="primary" size="small" @click.stop="emit('retry')">
            <icon-refresh /> {{ retryLabel }}
          </a-button>
          <a-button v-if="showManualRetry" size="small" status="warning" @click.stop="emit('manual-retry')">
            <icon-tool /> 手动触发批次重试
          </a-button>
        </a-space>
      </div>
    </a-alert>

    <!-- ========== 特征档案（顶部摘要 · 1 行）============ -->
    <a-card v-if="featureArchive && showArchive" class="feature-archive-card" :bordered="false">
      <a-space wrap>
        <a-tag color="arcoblue" size="small">
          <icon-idcard /> 特征档案
        </a-tag>
        <span class="archive-meta">
          <strong>{{ featureArchive.featureId }}</strong> · {{ featureArchive.name }}
        </span>
        <a-divider direction="vertical" />
        <span class="archive-meta">OA单号：<code>{{ featureArchive.devOaOrderId || '—' }}</code></span>
        <a-divider direction="vertical" />
        <span class="archive-meta">验收人：{{ featureArchive.acceptor || '—' }}</span>
        <a-divider direction="vertical" />
        <a-tag v-if="!featureArchive.dataTableName" color="warning" size="mini">
          <icon-exclamation-circle-fill /> 数据底表未补充
        </a-tag>
        <a-tag v-else color="success" size="mini">
          <icon-check /> 数据底表：{{ featureArchive.dataTableName }}
        </a-tag>
        <a-divider direction="vertical" />
        <a-button size="mini" type="text" @click="emit('supplement-table')">
          <icon-edit /> 补充数据底表
        </a-button>
      </a-space>
    </a-card>

    <!-- ========== 状态列表（按 scope 直接铺平，去除阶段折叠外层）============ -->
    <div class="status-list">
      <a-steps
        direction="vertical"
        type="dot"
        :current="flatCurrentIndex"
        :status="flatStepsStatus"
        class="step-flow"
      >
        <a-step
          v-for="step in flatSteps"
          :key="step.key"
          :title="step.label"
        >
              <template #icon>
                <span
                  v-if="step.globalIdx < currentStepIndex"
                  class="step-dot done"
                >✓</span>
                <span
                  v-else-if="step.globalIdx === currentStepIndex && !isFailed"
                  class="step-dot current"
                >●</span>
                <span
                  v-else-if="step.globalIdx === currentStepIndex && isFailed"
                  class="step-dot failed"
                >✕</span>
                <span
                  v-else
                  class="step-dot pending"
                >○</span>
              </template>
              <template #description>
                <div class="step-right" v-if="isStepReached(step.key, step.globalIdx)">
                  <!-- 头部：时间 + 操作人 + 触发方式 -->
                  <div class="step-header">
                    <a-space :size="6" wrap>
                      <a-tag
                        v-if="getStatusChangeRecord(step.key)"
                        :color="getStatusBadgeColor(step.key)"
                        size="small"
                      >
                        {{ getStepBadge(step.key) }}
                      </a-tag>
                      <a-tag v-else-if="step.globalIdx === currentStepIndex && !isFailed" color="blue" size="small">
                        <icon-location /> 当前状态
                      </a-tag>
                      <a-tag v-else color="gray" size="small">
                        <icon-clock-circle /> 未到达
                      </a-tag>
                    </a-space>
                    <span class="step-time">{{ stepTime(step, step.globalIdx) }}</span>
                    <span v-if="stepOperator(step, step.globalIdx)" class="step-operator">
                      <icon-user /> {{ stepOperator(step, step.globalIdx) }}
                    </span>
                  </div>

                  <!-- 主内容：状态描述 + 备注 -->
                  <div class="step-body">
                    <div class="step-desc">{{ getStatusDescription(step.key) }}</div>
                    <div v-if="getStatusChangeRecord(step.key)?.reason" class="step-reason">
                      <icon-edit /> 备注：{{ getStatusChangeRecord(step.key).reason }}
                    </div>
                  </div>

                  <!-- 底部：动态操作按钮（点击触发）============ -->
                  <!-- 只在「当前步骤」展示可执行操作；已过的步骤不展示按钮，避免重复点击 -->
                  <div v-if="step.globalIdx === currentStepIndex" class="step-actions">
                    <a-space wrap>
                      <a-tag
                        v-for="action in getActionsForStatus(step.key)"
                        :key="action.key"
                        :color="action.type === 'primary' ? 'arcoblue' : (action.type === 'danger' ? 'red' : (action.type === 'warning' ? 'orange' : 'gray'))"
                        size="small"
                        style="cursor: pointer"
                        @click="onActionClick(action)"
                      >
                        <icon-right /> {{ action.label }}
                      </a-tag>
                      <a-tag v-if="getActionsForStatus(step.key).length === 0" color="gray" size="small">
                        当前状态下无可执行操作
                      </a-tag>
                    </a-space>
                  </div>

                  <!-- ========== 同步日志（仅 syncing_internal / syncing_variable，且当前已达到该步骤）============ -->
                  <div
                    v-if="['syncing_internal', 'syncing_variable', 'internal_sync_failed', 'variable_sync_failed'].includes(step.key) && step.globalIdx <= currentStepIndex"
                    class="step-sync-logs"
                  >
                    <a-divider style="margin: 8px 0" orientation="left">
                      <span style="font-size: 12px; color: var(--color-text-3);">同步日志</span>
                    </a-divider>
                    <a-space direction="vertical" :size="4" style="width: 100%">
                      <div
                        v-for="log in getSyncLogsForStep(step.key)"
                        :key="log.id"
                        class="sync-log-row"
                      >
                        <a-tag :color="log.status === 'success' ? 'green' : (log.status === 'failed' ? 'red' : 'gray')" size="mini">
                          {{ log.direction }}
                        </a-tag>
                        <span class="sync-log-type">{{ log.type }}</span>
                        <span class="sync-log-time">{{ log.startedAt }}</span>
                        <span v-if="log.reason" class="sync-log-reason">{{ log.reason }}</span>
                      </div>
                      <a-empty v-if="getSyncLogsForStep(step.key).length === 0" :image-size="40" description="暂无同步日志" />
                    </a-space>
                  </div>

                  <!-- ========== 下线批次（仅 offline / offline_failed 步骤，且当前已达到该步骤）============ -->
                  <div
                    v-if="['offline', 'offline_failed'].includes(step.key) && step.globalIdx <= currentStepIndex && offlineBatches.length > 0"
                    class="step-offline-batch"
                  >
                    <a-divider style="margin: 8px 0" orientation="left">
                      <span style="font-size: 12px; color: var(--color-text-3);">下线批次</span>
                    </a-divider>
                    <a-space direction="vertical" :size="4" style="width: 100%">
                      <div v-for="batch in offlineBatches" :key="batch.batchId" class="batch-row">
                        <a-tag :color="batch.status === 'success' ? 'green' : 'red'" size="mini">
                          {{ batch.status === 'success' ? '成功' : '失败' }}
                        </a-tag>
                        <span class="batch-id">{{ batch.batchId }}</span>
                        <span class="batch-time">{{ batch.offlineAt }}</span>
                        <span class="batch-reason">{{ batch.reason }}</span>
                      </div>
                    </a-space>
                  </div>
                </div>
              </template>
            </a-step>
    </a-steps>
    </div>

    <!-- ========== 异常状态底部提示（仅当前 scope 包含异常态时展示） ========== -->
    <div v-if="isFailedInScope" class="failed-branch-tip">
      <icon-exclamation-circle-fill style="color:#f53f3f" />
      <span>当前处于异常分支，需要修复后点击上方按钮重试。修复后将回到正常状态「{{ nextNormalLabel }}」</span>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, h } from 'vue'
import {
  MIDLOAN_STATUS_ORDER,
  MIDLOAN_PHASES,
  getPhasesByScope,
  getStatusOrderByScope,
  isStatusOutsideScope,
  getStatusCategory,
  midloanStatusMeta,
  MIDLOAN_FAILED_STATUSES,
  isRetryableFailedStatus,
  allowedActionsByStatus,
  midloanStatusLabel,
  midloanStatusColor
} from '@/modules/variable-hub/constants/midloanStatusMap'

const props = defineProps({
  /** 当前状态 */
  status: { type: String, required: true },
  /** 阶段展示范围：all=完整5阶段；offline_analysis=仅阶段1-3；online_interface=仅阶段4-5 */
  scope: {
    type: String,
    default: 'all',
    validator: (v) => ['all', 'offline_analysis', 'online_interface'].includes(v)
  },
  /** 状态变更时间戳映射 */
  timestamps: { type: Object, default: () => ({}) },
  /** 状态变更记录列表 */
  statusChangeList: { type: Array, default: () => [] },
  /** 同步日志列表（用于同步步骤）*/
  syncLogs: { type: Array, default: () => [] },
  /** 下线批次列表 */
  offlineBatches: { type: Array, default: () => [] },
  /** 特征档案摘要 */
  featureArchive: { type: Object, default: () => null },
  /** 是否显示特征档案摘要卡（避免在多 Tab 场景下重复展示）*/
  showArchive: { type: Boolean, default: true },
  /** 重试次数 */
  retryCount: { type: Number, default: 0 },
  /** 失败原因 */
  failedReason: { type: String, default: '' },
  /** 失败时间 */
  failedAt: { type: String, default: '' },
  /** 是否显示重试按钮 */
  showRetry: { type: Boolean, default: false },
  /** 是否显示手动批次重试按钮 */
  showManualRetry: { type: Boolean, default: false },
  /** 重试按钮文案 */
  retryLabel: { type: String, default: '重新同步' }
})

const emit = defineEmits(['retry', 'manual-retry', 'action', 'supplement-table'])

// ============ scope 感知的常量与辅助 ============
const scopePhases = computed(() => getPhasesByScope(props.scope))
const scopeStatusOrder = computed(() => getStatusOrderByScope(props.scope))
const scopeFirstIdx = computed(() => MIDLOAN_STATUS_ORDER.indexOf(scopeStatusOrder.value[0]))
const scopeLastIdx = computed(() => MIDLOAN_STATUS_ORDER.indexOf(scopeStatusOrder.value[scopeStatusOrder.value.length - 1]))

/** scope 外提示 banner（当前状态不在 scope 范围内时展示） */
const scopeBanner = computed(() => {
  const pos = isStatusOutsideScope(props.status, props.scope)
  if (pos === 'inside') return null
  if (props.scope === 'offline_analysis' && pos === 'after') {
    return {
      type: 'success',
      title: '离线分析阶段已完成',
      detail: '该特征已进入 API 调用阶段（上线/汰换），请切换到「API调用状态」tab 查看后续推进。',
      icon: 'icon-check-circle-fill'
    }
  }
  if (props.scope === 'online_interface' && pos === 'before') {
    return {
      type: 'warning',
      title: '尚未进入 API 调用阶段',
      detail: '当前特征仍在离线分析阶段（注册/开发/验证），请切换到「离线分析状态」tab 查看推进情况。',
      icon: 'icon-info-circle-fill'
    }
  }
  return null
})

// ============ 核心响应式状态 ============
const isFailed = computed(() => isRetryableFailedStatus(props.status))
const currentStatusLabel = computed(() => midloanStatusMeta(props.status).label)

/** 当前状态在全局 12 状态机中的下标（异常态映射到对应正常位置） */
const globalStepIndex = computed(() => {
  if (isFailed.value) {
    const failedMap = {
      internal_sync_failed: 8,
      variable_sync_failed: 9,
      dw_online_failed: 3,
      offline_failed: 11
    }
    return failedMap[props.status] !== undefined ? failedMap[props.status] : 0
  }
  const idx = MIDLOAN_STATUS_ORDER.indexOf(props.status)
  return idx >= 0 ? idx : -1
})

/** 异常态是否在当前 scope 内（异常态 dataForm 需与 scope 对齐） */
const isFailedInScope = computed(() => {
  if (!isFailed.value) return false
  const cat = getStatusCategory(props.status)
  if (props.scope === 'all') return true
  if (props.scope === 'offline_analysis') return cat === 'offline_analysis'
  if (props.scope === 'online_interface') return cat === 'online_interface'
  return false
})

/** 全局步骤下标（12 正常状态机的 0-based 索引，模板内 step.globalIdx 对比均用此值） */
const currentStepIndex = globalStepIndex

/** scope 相对步骤下标（仅用于 localCurrentIndex 计算，内部使用） */
const localStepIndexInScope = computed(() => {
  const gi = globalStepIndex.value
  if (gi < 0) return -1

  const first = scopeFirstIdx.value
  const last = scopeLastIdx.value

  if (props.scope === 'all' || props.scope === undefined) return gi

  if (gi < first) return -1
  if (gi > last) return scopeStatusOrder.value.length
  return gi - first
})

// ============ 状态列表（按 scope 铺平，直接展示）============
/** 把 scope 内所有阶段的状态展平成一个扁平步骤列表 */
const flatSteps = computed(() => {
  const phases = scopePhases.value
  return phases.flatMap(phase => {
    const indices = phase.statuses.map(s => MIDLOAN_STATUS_ORDER.indexOf(s))
    return phase.statuses.map((key, localIdx) => ({
      key,
      label: midloanStatusMeta(key).label,
      globalIdx: indices[localIdx],
      dataForm: phase.dataForm
    }))
  })
})

/** 当前步骤在 flatSteps 中的索引（用于 a-steps :current） */
const flatCurrentIndex = computed(() => {
  const gi = globalStepIndex.value
  const idx = flatSteps.value.findIndex(s => s.globalIdx === gi)
  return idx >= 0 ? idx : 0
})

/** a-steps 的 :status（finish/process/error/wait） */
const flatStepsStatus = computed(() => {
  if (isFailed.value) return 'error'
  const gi = globalStepIndex.value
  const last = flatSteps.value[flatSteps.value.length - 1]?.globalIdx
  if (gi >= last) return 'finish'
  if (gi < flatSteps.value[0]?.globalIdx) return 'wait'
  return 'process'
})

// ============ 数据查询 helper ============
/**
 * 判断某个步骤是否已被到达
 * - idx <= currentStepIndex 表示该步骤已发生
 * - 当前状态点本身（idx === currentStepIndex）也算「已到达」（展示当前信息）
 */
function isStepReached(key, idx) {
  if (isFailed.value) {
    // 异常态：失败前的步骤都算已到达，失败步骤本身也展示
    return idx <= currentStepIndex.value
  }
  return idx <= currentStepIndex.value
}

function getStatusChangeRecord(key) {
  return props.statusChangeList.find(item =>
    item.toStatus === key || item.fromStatus === key
  )
}

function getStatusDescription(key) {
  return midloanStatusMeta(key).description
}

function getActionsForStatus(key) {
  // 主流程操作（不包括 demo 演示按钮）
  return allowedActionsByStatus(key).filter(a => a.category !== 'demo')
}

function getSyncLogsForStep(stepKey) {
  // 同步步骤下显示同步日志
  const logTypeMap = {
    syncing_internal: ['internal_sync', 'oa_production_internal'],
    syncing_variable: ['variable_sync', 'oa_production_variable'],
    internal_sync_failed: ['internal_sync'],
    variable_sync_failed: ['variable_sync']
  }
  const types = logTypeMap[stepKey] || []
  return props.syncLogs.filter(log => types.includes(log.type)).slice(0, 5)
}

function onActionClick(action) {
  emit('action', action)
}

// 步骤徽章颜色
function getStatusBadgeColor(key) {
  const idx = MIDLOAN_STATUS_ORDER.indexOf(key)
  if (idx < currentStepIndex.value) return 'green'
  return 'gray'
}

function getStepBadge(key) {
  const idx = MIDLOAN_STATUS_ORDER.indexOf(key)
  if (idx < currentStepIndex.value) return '已完成'
  if (idx === currentStepIndex.value) return '当前'
  return '未到达'
}

const nextNormalLabel = computed(() => {
  if (props.status === 'internal_sync_failed') return '特征中心同步中'
  if (props.status === 'variable_sync_failed') return '已上线'
  if (props.status === 'dw_online_failed') return '数仓开发完成'
  if (props.status === 'offline_failed') return '已下线'
  return ''
})

// ============ 步骤描述 ============
function stepTime(step, idx) {
  const ts = props.timestamps[step.key]
  if (ts) return ts
  const record = getStatusChangeRecord(step.key)
  if (record?.operatedAt) return record.operatedAt
  if (idx === currentStepIndex.value && !isFailed.value) return '当前状态'
  if (idx > currentStepIndex.value) return '—'
  return '已完成'
}

function stepOperator(step, idx) {
  const record = getStatusChangeRecord(step.key)
  if (record?.operator) return record.operator
  if (idx === currentStepIndex.value && !isFailed.value) return '当前'
  if (idx > currentStepIndex.value) return ''
  return ''
}

// 给模板用
const getMidloanStatusLabel = midloanStatusLabel
const getMidloanStatusColor = midloanStatusColor
</script>

<style scoped>
.status-step-flow {
  padding: 4px 0;
}
.mb-12 { margin-bottom: 12px; }
.alert-detail {
  font-size: 12px;
  line-height: 1.7;
}

/* ========== 特征档案（顶部摘要）============ */
.feature-archive-card {
  margin-bottom: 16px;
  background: var(--color-fill-1, #f7f8fa);
  border: 1px solid var(--color-border-2, #e5e6eb);
}
.archive-meta {
  font-size: 13px;
  color: var(--color-text-2, #4e5969);
}
.archive-meta code {
  font-family: 'SF Mono', Monaco, monospace;
  font-size: 12px;
  color: var(--color-text-1);
}

/* ========== 状态列表（直接铺平，无阶段外层）========== */
.status-list {
  margin-top: 8px;
  padding: 4px 4px 4px 0;
}

/* ========== 步骤流 ========== */
.step-flow {
  margin-top: 0;
}

/* ========== 步骤操作按钮颜色（覆盖 arco 默认 checked 误色）========== */
/* arco v2.55+ 在某些条件下会给 a-tag 自动加上 .arco-tag-checked 类，导致渲染为 gold 色。
   强制让详情页时间轴里的「主流程按钮」按 :color 属性回归 arcoblue/red/orange/gray */
.step-actions :deep(.arco-tag-checked.arco-tag-color-arcoblue),
.step-actions :deep(.arco-tag.arco-tag-checked[style*="cursor: pointer"]) {
  background-color: rgb(var(--arcoblue-6));
  border-color: rgb(var(--arcoblue-6));
  color: #fff;
}
.step-actions :deep(.arco-tag-checked.arco-tag-color-arcoblue:hover) {
  background-color: rgb(var(--arcoblue-5));
  border-color: rgb(var(--arcoblue-5));
}
.step-actions :deep(.arco-tag-checked.arco-tag-color-red) {
  background-color: rgb(var(--danger-6));
  border-color: rgb(var(--danger-6));
  color: #fff;
}
.step-actions :deep(.arco-tag-checked.arco-tag-color-orange) {
  background-color: rgb(var(--warning-6));
  border-color: rgb(var(--warning-6));
  color: #fff;
}
/* 兜底：干掉任何残留 gold/checked 类 */
.step-actions :deep(.arco-tag-checked.arco-tag-color-gold),
.step-actions :deep(.arco-tag.arco-tag-gold.arco-tag-checked) {
  background-color: rgb(var(--arcoblue-6));
  border-color: rgb(var(--arcoblue-6));
  color: #fff;
}

/* ========== 步骤右侧内容 ========== */
.step-right {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 0 16px 0;
}
.step-header {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.step-time {
  font-size: 12px;
  color: var(--color-text-2, #4e5969);
  font-weight: 500;
  font-family: 'SF Mono', Monaco, monospace;
}
.step-operator {
  font-size: 12px;
  color: var(--color-text-3, #86909c);
}
.step-body {
  margin-top: 4px;
}
.step-desc {
  font-size: 13px;
  color: var(--color-text-2, #4e5969);
  line-height: 1.6;
}
.step-reason {
  font-size: 12px;
  color: var(--color-text-3, #86909c);
  margin-top: 4px;
  padding: 4px 8px;
  background: var(--color-fill-2, #f7f8fa);
  border-left: 2px solid var(--color-primary-light-3, #bedaff);
  border-radius: 2px;
}
.step-actions {
  margin-top: 4px;
}

/* ========== 同步日志 ========== */
.step-sync-logs {
  margin-top: 4px;
  background: var(--color-fill-1, #f7f8fa);
  padding: 4px 8px;
  border-radius: 4px;
}
.sync-log-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--color-text-2);
  padding: 2px 0;
}
.sync-log-type {
  font-family: 'SF Mono', Monaco, monospace;
  font-size: 11px;
  background: var(--color-fill-3, #f2f3f5);
  padding: 1px 6px;
  border-radius: 2px;
}
.sync-log-time {
  font-size: 11px;
  color: var(--color-text-3, #86909c);
}
.sync-log-reason {
  font-size: 11px;
  color: var(--color-danger, #f53f3f);
}

/* ========== 下线批次 ========== */
.step-offline-batch {
  margin-top: 4px;
  background: var(--color-fill-1, #f7f8fa);
  padding: 4px 8px;
  border-radius: 4px;
}
.batch-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  padding: 2px 0;
}
.batch-id {
  font-family: 'SF Mono', Monaco, monospace;
  font-size: 11px;
  background: var(--color-fill-3, #f2f3f5);
  padding: 1px 6px;
  border-radius: 2px;
}
.batch-time {
  font-size: 11px;
  color: var(--color-text-3, #86909c);
}
.batch-reason {
  font-size: 11px;
  color: var(--color-text-2, #4e5969);
}

/* ========== 点状图标 ========== */
.step-dot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  font-size: 12px;
  font-weight: bold;
  transition: all 0.2s;
}
.step-dot.done {
  background: var(--color-success-light-3, #cdf3d2);
  color: var(--color-success, #00b42a);
  border: 2px solid var(--color-success-light-1, #e6f7ea);
}
.step-dot.current {
  background: var(--color-primary-light-1, #e8f3ff);
  color: var(--color-primary, #165dff);
  border: 2px solid var(--color-primary-light-3, #bedaff);
  box-shadow: 0 0 0 4px rgba(22, 93, 255, 0.15);
  animation: pulse 2s infinite;
}
.step-dot.failed {
  background: var(--color-danger-light-3, #fde7e7);
  color: var(--color-danger, #f53f3f);
  border: 2px solid var(--color-danger-light-1, #fde7e7);
}
.step-dot.pending {
  background: #f7f8fa;
  color: var(--color-text-4, #c9cdd4);
  border: 2px solid #f7f8fa;
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 4px rgba(22, 93, 255, 0.15); }
  50% { box-shadow: 0 0 0 8px rgba(22, 93, 255, 0.05); }
}

/* ========== 异常态底部提示 ========== */
.failed-branch-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: var(--color-danger-light-1, #fef0f0);
  border-radius: 6px;
  margin-top: 12px;
  font-size: 13px;
  color: var(--color-danger, #f53f3f);
}
</style>