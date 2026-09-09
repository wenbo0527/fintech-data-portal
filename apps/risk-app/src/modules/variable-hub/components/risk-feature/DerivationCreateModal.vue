<template>
  <a-modal
    :visible="visible"
    :title="title || '批量注册需求'"
    :width="820"
    :ok-loading="submitting"
    :ok-text="`批量提交（${rows.length} 条）`"
    :cancel-text="cancelText || '取消'"
    :mask-closable="false"
    @ok="onOk"
    @cancel="onCancel"
  >
    <a-alert type="info" :show-icon="false" style="margin-bottom: 16px">
      填写特征名称、需求描述（可上传附件），支持一次提交多条需求。每条生成独立需求 ID（DRV-{{ todayYmd }}-NNNN）。
    </a-alert>

    <div v-for="(row, idx) in rows" :key="idx" class="batch-row">
      <div class="batch-row-header">
        <span class="batch-row-index">第 {{ idx + 1 }} 条</span>
        <a-button
          v-if="rows.length > 1"
          type="text"
          size="small"
          status="danger"
          @click="removeRow(idx)"
        >
          <template #icon><icon-delete /></template>
          删除
        </a-button>
      </div>

      <a-form layout="vertical">
        <a-form-item label="需求名称" required>
          <a-input
            v-model="row.variableName"
            :max-length="50"
            show-word-limit
            size="large"
            placeholder="≤50字，输入需求名称（作为本次提交的标识）"
          />
        </a-form-item>

        <a-form-item label="特征名称" required>
          <a-input
            v-model="row.featureCnName"
            :max-length="50"
            show-word-limit
            size="large"
            placeholder="≤50字，输入特征中文名"
          />
        </a-form-item>

        <a-form-item label="需求描述">
          <a-textarea
            v-model="row.requirementDescription"
            :max-length="500"
            :rows="4"
            show-word-limit
            size="large"
            placeholder="详细描述需求内容、背景及具体要求"
          />
        </a-form-item>

        <a-form-item label="处理人">
          <a-select
            v-model="row.handler"
            placeholder="选择处理人（非必填）"
            allow-clear
            size="large"
          >
            <a-option value="小李">小李</a-option>
            <a-option value="小王">小王</a-option>
            <a-option value="培培">培培</a-option>
            <a-option value="张三">张三</a-option>
          </a-select>
        </a-form-item>

        <a-form-item label="附件">
          <a-upload
            :custom-request="(opt) => handleUpload(opt, idx)"
            :show-file-list="false"
            :before-upload="(file) => beforeUpload(file, idx)"
            accept=".xlsx,.xls,.csv,.pdf,.doc,.docx"
          >
            <a-button size="large">
              <template #icon><icon-upload /></template>
              {{ row.attachment ? row.attachment.name : '上传附件' }}
            </a-button>
            <span v-if="row.attachment" class="attachment-info">
              <icon-file /> {{ row.attachment.name }}（{{ formatSize(row.attachment.size) }}）
              <a-link style="margin-left: 8px" @click="row.attachment = null">移除</a-link>
            </span>
          </a-upload>
        </a-form-item>
      </a-form>

      <a-divider v-if="idx < rows.length - 1" style="margin: 4px 0" />
    </div>

    <a-button type="dashed" long @click="addRow" style="margin-top: 8px">
      <template #icon><icon-plus /></template>
      添加一行
    </a-button>
  </a-modal>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { Message } from '@arco-design/web-vue'

const props = defineProps({
  visible: Boolean,
  initial: Object,
  title: String,
  okText: String,
  cancelText: String
})
const emit = defineEmits(['ok', 'cancel'])

const submitting = ref(false)
const todayYmd = computed(() => new Date().toISOString().slice(0, 10).replace(/-/g, ''))

function createEmptyRow() {
  return {
    variableName: '',
    featureCnName: '',
    requirementDescription: '',
    handler: '',
    attachment: null
  }
}

const rows = reactive([createEmptyRow()])

function addRow() {
  rows.push(createEmptyRow())
}

function removeRow(idx) {
  rows.splice(idx, 1)
}

// ============ 附件上传 ============
function formatSize(bytes) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

const MAX_FILE_SIZE = 10 * 1024 * 1024

function beforeUpload(file, idx) {
  if (file.size > MAX_FILE_SIZE) {
    Message.error('文件超过 10MB 上限')
    return false
  }
  return true
}

function handleUpload(option, idx) {
  const file = option.fileItem?.file
  if (!file) return
  rows[idx].attachment = {
    name: file.name,
    size: file.size,
    uploadedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
  }
  option.onSuccess?.(file)
}

// ============ 提交 ============
function onOk() {
  // 校验：至少有一条，且每条特征名称必填
  if (rows.length === 0) {
    Message.warning('请至少添加一条需求')
    return
  }
  const invalid = rows.findIndex((r) => !r.variableName || !r.variableName.trim())
  if (invalid >= 0) {
    Message.warning(`第 ${invalid + 1} 条：需求名称必填`)
    return
  }
  const invalidFeature = rows.findIndex((r) => !r.featureCnName || !r.featureCnName.trim())
  if (invalidFeature >= 0) {
    Message.warning(`第 ${invalidFeature + 1} 条：特征名称必填`)
    return
  }

  submitting.value = true
  try {
    const payloads = rows.map((r) => ({
      name: r.variableName,
      featureCnName: r.featureCnName,
      requirementDescription: r.requirementDescription,
      handler: r.handler || '',
      attachment: r.attachment,
      // 保留默认值，确保 store 正常工作
      businessScene: '贷中',
      category: 'midloan_behavior',
      dataSource: 'Hbase'
    }))
    emit('ok', payloads)
  } finally {
    submitting.value = false
  }
}

function onCancel() {
  emit('cancel')
}

// 打开时重置
watch(
  () => props.visible,
  (v) => {
    if (v) {
      rows.splice(0, rows.length, createEmptyRow())
    }
  }
)
</script>

<style scoped>
.batch-row {
  padding: 12px 0;
}
.batch-row-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.batch-row-index {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-2);
}
.attachment-info {
  margin-left: 12px;
  color: var(--color-text-3);
  font-size: 13px;
}
</style>
