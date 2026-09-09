<template>
  <div class="requirement-detail-page">
    <!-- 404 处理：需求ID不存在 -->
    <a-empty v-if="notFound" description="未找到对应需求记录">
      <a-button type="primary" @click="handleBackToList">返回需求列表</a-button>
    </a-empty>
    <template v-else-if="record">
      <!-- 面包屑 -->
      <div class="page-header">
        <a-breadcrumb class="breadcrumb">
          <a-breadcrumb-item>风险管理</a-breadcrumb-item>
          <a-breadcrumb-item @click="handleBackToList" style="cursor: pointer">
            需求管理
          </a-breadcrumb-item>
          <a-breadcrumb-item>需求详情</a-breadcrumb-item>
        </a-breadcrumb>

        <!-- 标题区 -->
        <div class="header-content">
          <div class="title-section">
            <div class="title-wrapper">
              <h1 class="title">{{ record.name }}</h1>
              <a-tag v-if="registered" color="green" size="medium" class="status-tag">
                已注册
              </a-tag>
              <a-tag v-else :color="statusColor" size="medium" class="status-tag">
                {{ statusLabel }}
              </a-tag>
            </div>
            <div class="sub-line">
              <span class="sub-id">{{ record.id }}</span>
              <span class="divider">|</span>
              <span class="label">创建时间</span>
              <span class="value">{{ record.createdAt }}</span>
            </div>
          </div>

          <div class="actions">
            <a-button @click="handleBackToList">返回列表</a-button>
            <!-- 已注册：查看特征 + 驳回 -->
            <a-button
              v-if="registered"
              type="primary"
              @click="handleViewFeature"
            >查看特征</a-button>
            <a-button
              v-if="registered || isAccepted"
              status="danger"
              @click="handleReject"
            >驳回</a-button>
            <!-- 需求受理（未注册）：去注册 -->
            <a-button
              v-if="isAccepted"
              type="primary"
              @click="handleRegister"
            >去注册</a-button>
            <!-- 已驳回：重新受理 -->
            <a-button
              v-if="isRejected"
              type="primary"
              @click="handleReopen"
            >重新受理</a-button>
          </div>
        </div>
      </div>

      <!-- 基础信息卡片：6 列布局 -->
      <div class="basic-info-card">
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">需求名称</div>
            <div class="info-value">{{ record.name || '—' }}</div>
          </div>
          <div class="info-item">
            <div class="info-label">特征名称</div>
            <div class="info-value">{{ record.featureCnName || '—' }}</div>
          </div>
          <div class="info-item">
            <div class="info-label">特征类型</div>
            <div class="info-value">{{ categoryLabel }}</div>
          </div>
          <div class="info-item">
            <div class="info-label">关联特征ID</div>
            <div class="info-value">
              <a-link v-if="record.featureId" @click="handleViewFeature">{{ record.featureId }}</a-link>
              <span v-else>—</span>
            </div>
          </div>
          <div class="info-item">
            <div class="info-label">处理人</div>
            <div class="info-value">{{ record.handler || '—' }}</div>
          </div>
          <div class="info-item">
            <div class="info-label">创建时间</div>
            <div class="info-value">{{ record.createdAt || '—' }}</div>
          </div>
        </div>
      </div>

      <!-- Tabs 区 -->
      <div class="detail-content">
        <a-tabs v-model:active-key="activeTab" class="detail-tabs">
          <a-tab-pane key="attachments" title="附件与解析">
            <!-- 需求描述 -->
            <a-card class="detail-card" :bordered="false">
              <template #title>
                <span class="card-title-bar">需求描述</span>
              </template>
              <div class="description-block">
                {{ record.requirementDescription || record.expectedEffect || '—' }}
              </div>
            </a-card>

            <!-- 附件 -->
            <a-card v-if="record.attachment" class="detail-card" :bordered="false">
              <template #title>
                <span class="card-title-bar">附件</span>
              </template>
              <div class="attachment-row">
                <div class="attachment-info">
                  <icon-attachment class="attachment-icon" />
                  <a-link @click="handleDownload(record.attachment)">
                    {{ record.attachment.name }}
                  </a-link>
                </div>
                <div class="attachment-meta">
                  <span>{{ formatSize(record.attachment.size) }}</span>
                  <span class="dot">·</span>
                  <span>上传于 {{ record.attachment.uploadedAt }}</span>
                  <a-link class="download-link" @click="handleDownload(record.attachment)">下载</a-link>
                </div>
              </div>
            </a-card>

            <!-- 附件解析预览 -->
            <a-card v-if="record.excelData && record.excelData.length" class="detail-card" :bordered="false">
              <template #title>
                <span class="card-title-bar">附件解析预览</span>
              </template>
              <div class="parse-status">
                <icon-check-circle class="parse-icon" />
                <span class="parse-success">解析成功，共 {{ record.excelData.length }} 条数据</span>
                <span class="parse-tip">仅校验特征英文名 + 中文名</span>
              </div>
              <a-table
                :data="record.excelData"
                :columns="excelColumns"
                :pagination="false"
                size="small"
                class="excel-preview-table"
              >
                <template #variableEnName="{ record: row }">
                  <span class="mono">{{ row.variableEnName }}</span>
                </template>
                <template #index="{ rowIndex }">
                  {{ rowIndex + 1 }}
                </template>
              </a-table>
            </a-card>
          </a-tab-pane>

          <a-tab-pane key="history" title="变更记录">
            <a-card class="detail-card" :bordered="false">
              <template #title>
                <span class="card-title-bar">变更记录</span>
              </template>
              <a-timeline>
                <a-timeline-item v-for="(item, idx) in changeRecords" :key="idx" :label="item.time">
                  <div class="timeline-title">{{ item.title }}</div>
                  <div class="timeline-desc">{{ item.desc }}</div>
                </a-timeline-item>
              </a-timeline>
            </a-card>
          </a-tab-pane>
        </a-tabs>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Message, Modal } from '@arco-design/web-vue'
import { IconAttachment, IconCheckCircle } from '@arco-design/web-vue/es/icon'
import { DerivationStore } from '@/modules/variable-hub/mock/risk-feature/derivations'
import {
  DERIVATION_STATUS_LABELS,
  DERIVATION_STATUS_COLORS,
  getDisplayStatus
} from '@/modules/variable-hub/types/derivation'
import { RISK_CATEGORY_MAP } from '@/modules/variable-hub/constants/riskCategoryMap'

const router = useRouter()
const route = useRoute()
const requirementId = computed(() => String(route.params.id || ''))

const record = ref<any>(null)
const notFound = ref(false)
const activeTab = ref('attachments')

const displayStatus = computed(() => record.value ? getDisplayStatus(record.value) : '')
const statusLabel = computed(() => record.value ? (DERIVATION_STATUS_LABELS[displayStatus.value as keyof typeof DERIVATION_STATUS_LABELS] || record.value.status) : '')
const statusColor = computed(() => record.value ? (DERIVATION_STATUS_COLORS[displayStatus.value as keyof typeof DERIVATION_STATUS_COLORS] || 'gray') : 'gray')

const registered = computed(() => displayStatus.value === 'registered')
const isAccepted = computed(() => record.value?.status === 'requirement_accepted' && !record.value?.featureId)
const isRejected = computed(() => record.value?.status === 'rejected')

const categoryLabel = computed(() => {
  const cat = record.value?.category
  if (!cat) return '—'
  return RISK_CATEGORY_MAP[cat as keyof typeof RISK_CATEGORY_MAP]?.label || cat
})

// 附件解析表格列定义
const excelColumns = [
  { title: '#', slotName: 'index', width: 60 },
  { title: '特征英文名', dataIndex: 'variableEnName', slotName: 'variableEnName', width: 220, ellipsis: true, tooltip: true },
  { title: '中文名', dataIndex: 'variableCnName', width: 160, ellipsis: true, tooltip: true },
  { title: '字段类型', dataIndex: 'fieldType', width: 100 },
  { title: '加工逻辑', dataIndex: 'processingLogic', ellipsis: true, tooltip: true }
]

// 变更记录（基于需求 mock 数据合成）
const changeRecords = computed(() => {
  if (!record.value) return []
  const items: Array<{ time: string; title: string; desc: string }> = []
  items.push({
    time: record.value.createdAt,
    title: '需求创建',
    desc: `提出人 ${record.value.proposer || '—'} 创建需求，处理人：${record.value.handler || '—'}`
  })
  if (record.value.updatedAt && record.value.updatedAt !== record.value.createdAt) {
    items.push({
      time: record.value.updatedAt,
      title: '需求更新',
      desc: '需求信息或附件发生变更'
    })
  }
  if (record.value.registeredAt) {
    items.push({
      time: record.value.registeredAt,
      title: '注册完成',
      desc: `已注册到特征台账，关联特征ID：${record.value.featureId || '—'}`
    })
  }
  if (record.value.status === 'rejected' && record.value.rejectedAt) {
    items.push({
      time: record.value.rejectedAt,
      title: '需求驳回',
      desc: `驳回原因：${record.value.rejectReason || '—'}`
    })
  }
  return items
})

function formatSize(bytes?: number) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function handleBackToList() {
  router.push('/variable-management')
}

function handleViewFeature() {
  const fid = record.value?.featureId
  if (!fid) return
  router.push({ name: 'VariableAssetDetail', params: { id: fid } })
}

function handleDownload(att: any) {
  if (!att) return
  Message.info(`下载附件：${att.name}（Demo）`)
}

function handleReject() {
  if (!record.value) return
  let reason = ''
  Modal.confirm({
    title: '驳回需求',
    content: '确认驳回该需求？',
    okText: '驳回',
    cancelText: '取消',
    okButtonProps: { status: 'danger' },
    onOk: async () => {
      reason = reason || '不符合上线要求'
      const r = DerivationStore.reject(requirementId.value, reason)
      if (r) {
        Message.success('需求已驳回')
        loadRecord()
      } else {
        Message.error('驳回失败')
      }
    }
  })
}

function handleReopen() {
  if (!record.value) return
  Modal.confirm({
    title: '重新受理',
    content: '确认重新受理该需求？受理后需求将恢复为「需求受理」状态。',
    okText: '确认',
    cancelText: '取消',
    onOk: async () => {
      const r = DerivationStore.reopen(requirementId.value)
      if (r) {
        Message.success('需求已重新受理')
        loadRecord()
      } else {
        Message.error('重新受理失败，仅已驳回状态的需求可重新受理')
      }
    }
  })
}

function handleRegister() {
  if (!record.value) return
  router.push({
    path: '/variable-management',
    query: { action: 'register', id: record.value.id }
  })
}

function loadRecord() {
  const data = DerivationStore.get(requirementId.value)
  if (!data) {
    notFound.value = true
    record.value = null
    return
  }
  notFound.value = false
  record.value = data
}

onMounted(() => {
  loadRecord()
})
</script>

<style scoped>
.requirement-detail-page {
  padding: 24px;
  min-height: calc(100vh - 64px);
  background-color: var(--color-fill-2, #f7f8fa);
}

.page-header {
  background: #fff;
  padding: 20px 24px;
  border-radius: 8px;
  margin-bottom: 16px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.02);
}

.breadcrumb {
  margin-bottom: 16px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 16px;
}

.title-section {
  flex: 1 1 400px;
  min-width: 0;
}

.title-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text-1, #1d2129);
  line-height: 1.4;
}

.status-tag {
  margin: 0;
}

.sub-line {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--color-text-3, #86909c);
}

.sub-id {
  font-family: 'JetBrains Mono', 'Menlo', 'Consolas', monospace;
  color: var(--color-text-2, #4e5969);
}

.divider {
  color: var(--color-border-2, #e5e6eb);
}

.label {
  color: var(--color-text-3, #86909c);
}

.value {
  color: var(--color-text-2, #4e5969);
}

.actions {
  flex-shrink: 0;
}

.actions :deep(.arco-btn) {
  margin-left: 8px;
}

/* 基础信息卡片：纯字段网格 */
.basic-info-card {
  background: #fff;
  border-radius: 8px;
  padding: 24px;
  margin-bottom: 16px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.02);
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 24px 32px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.info-label {
  font-size: 13px;
  color: var(--color-text-3, #86909c);
}

.info-value {
  font-size: 14px;
  color: var(--color-text-1, #1d2129);
  word-break: break-all;
  line-height: 1.5;
}

/* 下方 tabs 内容区 */
.detail-content {
  background: #fff;
  border-radius: 8px;
  padding: 8px 24px 24px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.02);
}

.detail-tabs :deep(.arco-tabs-nav-tab) {
  justify-content: flex-start;
}

.detail-card {
  margin-bottom: 16px;
  border-radius: 8px;
  border: 1px solid var(--color-border-2, #e5e6eb);
}

.detail-card:last-child {
  margin-bottom: 0;
}

.detail-card :deep(.arco-card-header) {
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border-1, #f2f3f5);
}

.card-title-bar {
  display: inline-block;
  border-left: 3px solid var(--color-primary, #165dff);
  padding-left: 8px;
  font-weight: 600;
  font-size: 14px;
  color: var(--color-text-1, #1d2129);
}

.description-block {
  font-size: 13px;
  line-height: 1.7;
  color: var(--color-text-2, #4e5969);
  background: var(--color-fill-2, #f7f8fa);
  padding: 12px 16px;
  border-radius: 6px;
  white-space: pre-wrap;
}

.attachment-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  padding: 8px 0;
}

.attachment-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.attachment-icon {
  color: var(--color-text-3, #86909c);
  font-size: 16px;
}

.attachment-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--color-text-3, #86909c);
}

.attachment-meta .dot {
  color: var(--color-border-2, #e5e6eb);
}

.download-link {
  margin-left: 8px;
}

.parse-status {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 13px;
}

.parse-icon {
  color: var(--color-success-6, #00b42a);
  font-size: 16px;
}

.parse-success {
  color: var(--color-success-6, #00b42a);
  font-weight: 500;
}

.parse-tip {
  color: var(--color-text-3, #86909c);
}

.excel-preview-table {
  border: 1px solid var(--color-border-2, #e5e6eb);
  border-radius: 6px;
  overflow: hidden;
}

.mono {
  font-family: 'JetBrains Mono', 'Menlo', 'Consolas', monospace;
  font-size: 12.5px;
}

.timeline-title {
  font-weight: 500;
  color: var(--color-text-1, #1d2129);
  margin-bottom: 2px;
}

.timeline-desc {
  font-size: 13px;
  color: var(--color-text-2, #4e5969);
}
</style>
