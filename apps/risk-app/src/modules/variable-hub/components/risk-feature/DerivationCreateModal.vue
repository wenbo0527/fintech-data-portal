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
      需求名称、需求描述、处理人为本批次公共字段，只需填写一次；下方逐条登记特征中文名 / 英文名。提交后每条特征生成独立需求 ID（DRV-{{ todayYmd }}-NNNN）。
    </a-alert>

    <!-- ============ 公共字段（本批次共用）============ -->
    <div class="common-block">
      <div class="common-block-title">需求信息（公共字段）</div>
      <a-form layout="vertical">
        <a-form-item label="需求名称" required>
          <a-input
            v-model="common.name"
            :max-length="50"
            show-word-limit
            size="large"
            placeholder="≤50字，输入需求名称（本批次共用）"
          />
        </a-form-item>

        <a-form-item label="需求描述">
          <a-textarea
            v-model="common.requirementDescription"
            :max-length="500"
            :rows="3"
            show-word-limit
            size="large"
            placeholder="补充需求内容、背景及具体要求（非必填）"
          />
        </a-form-item>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="处理人">
              <a-select
                v-model="common.handler"
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
          </a-col>
          <a-col :span="12">
            <a-form-item label="附件">
              <a-upload
                :custom-request="(opt) => handleUpload(opt)"
                :show-file-list="false"
                :before-upload="beforeUpload"
                accept=".xlsx,.xls,.csv,.pdf,.doc,.docx"
              >
                <a-button size="large">
                  <template #icon><icon-upload /></template>
                  {{ common.attachment ? common.attachment.name : '上传附件' }}
                </a-button>
                <span v-if="common.attachment" class="attachment-info">
                  <icon-file /> {{ formatSize(common.attachment.size) }}
                  <a-link style="margin-left: 8px" @click="common.attachment = null">移除</a-link>
                </span>
              </a-upload>
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </div>

    <!-- ============ 特征清单（逐条填写）============ -->
    <div class="feature-list-title">特征清单（{{ rows.length }} 条）</div>
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
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="特征中文名" required>
              <a-input
                v-model="row.featureCnName"
                :max-length="50"
                show-word-limit
                size="large"
                placeholder="≤50字，输入特征中文名"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="特征英文名" required>
              <a-input
                v-model="row.featureEnName"
                :max-length="30"
                show-word-limit
                size="large"
                placeholder="字母开头，仅字母/数字/下划线，≤30字"
              />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </div>

    <a-button type="dashed" long @click="addRow" style="margin-top: 8px">
      <template #icon><icon-plus /></template>
      添加一条特征
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

/** 特征英文名规则：字母开头，仅字母/数字/下划线，≤30 字 */
const EN_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9_]*$/

// ============ 公共字段（本批次共用一条需求信息）============
function createCommon() {
  return {
    name: '',
    requirementDescription: '',
    handler: '',
    attachment: null
  }
}
const common = reactive(createCommon())

// ============ 特征清单（逐条）============
function createEmptyRow() {
  return {
    featureCnName: '',
    featureEnName: ''
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

function beforeUpload(file) {
  if (file.size > MAX_FILE_SIZE) {
    Message.error('文件超过 10MB 上限')
    return false
  }
  return true
}

function handleUpload(option) {
  const file = option.fileItem?.file
  if (!file) return
  common.attachment = {
    name: file.name,
    size: file.size,
    uploadedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
  }
  option.onSuccess?.(file)
}

// ============ 提交 ============
function onOk() {
  if (!common.name || !common.name.trim()) {
    Message.warning('请填写需求名称')
    return
  }
  if (rows.length === 0) {
    Message.warning('请至少添加一条特征')
    return
  }
  const invalidCn = rows.findIndex((r) => !r.featureCnName || !r.featureCnName.trim())
  if (invalidCn >= 0) {
    Message.warning(`第 ${invalidCn + 1} 条：特征中文名必填`)
    return
  }
  const invalidEn = rows.findIndex((r) => !r.featureEnName || !r.featureEnName.trim())
  if (invalidEn >= 0) {
    Message.warning(`第 ${invalidEn + 1} 条：特征英文名必填`)
    return
  }
  const invalidFormat = rows.findIndex((r) => !EN_NAME_PATTERN.test(r.featureEnName.trim()))
  if (invalidFormat >= 0) {
    Message.warning(
      `第 ${invalidFormat + 1} 条：特征英文名需以字母开头，仅允许字母、数字与下划线（≤30 字）`
    )
    return
  }

  submitting.value = true
  try {
    const requirementName = common.name.trim()
    const payloads = rows.map((r) => ({
      // 公共字段
      name: requirementName,
      requirementDescription: common.requirementDescription,
      handler: common.handler || '',
      attachment: common.attachment,
      // 逐条特征
      featureCnName: r.featureCnName.trim(),
      featureEnName: r.featureEnName.trim(),
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
      Object.assign(common, createCommon())
      rows.splice(0, rows.length, createEmptyRow())
    }
  }
)
</script>

<style scoped>
.common-block {
  padding: 12px 16px 0;
  margin-bottom: 12px;
  border: 1px solid var(--color-border-2);
  border-radius: 4px;
  background: var(--color-fill-1);
}
.common-block-title,
.feature-list-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-1);
  margin-bottom: 8px;
}
.feature-list-title {
  margin-top: 4px;
}
.batch-row {
  padding: 8px 0;
  border-bottom: 1px dashed var(--color-border-2);
}
.batch-row:last-of-type {
  border-bottom: none;
}
.batch-row-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
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
