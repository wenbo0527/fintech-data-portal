<template>
  <a-modal
    v-model:visible="visible"
    :title="modalTitle"
    :width="560"
    :mask-closable="false"
    @ok="handleOk"
    @cancel="handleCancel"
  >
    <div class="modal-intro">
      <icon-info-circle-fill /> {{ modalIntro }}
    </div>

    <!-- 上下文关联信息（只读展示，来自当前页面） -->
    <div class="context-panel" v-if="contextSummary">
      <div class="context-label">关联信息</div>
      <div class="context-body">
        <a-tag v-if="context.assetType" :color="assetTypeColor" size="small">{{ assetTypeLabel }}</a-tag>
        <span v-if="context.assetName" class="context-asset-name">{{ context.assetName }}</span>
        <span v-if="context.pageSource" class="context-page-source">来源：{{ context.pageSource }}</span>
      </div>
    </div>

    <a-form
      :model="form"
      ref="formRef"
      layout="vertical"
      class="ticket-form"
      validate-trigger="blur"
    >
      <!-- 工单类型（必填） -->
      <a-form-item
        field="ticketType"
        label="工单类型"
        :rules="[{ required: true, message: '请选择工单类型' }]"
      >
        <a-radio-group v-model="form.ticketType">
          <a-radio value="content_error">内容错误</a-radio>
          <a-radio value="content_missing">内容缺失</a-radio>
          <a-radio value="content_suggestion">内容建议</a-radio>
        </a-radio-group>
      </a-form-item>

      <!-- 缺失内容（必填） -->
      <a-form-item
        field="missingContent"
        label="缺失内容"
        :rules="[{ required: true, message: '请描述缺失的数据或内容' }]"
      >
        <a-textarea
          v-model="form.missingContent"
          placeholder="例如：缺少客户画像标签字段、需要近一年的逾期明细表..."
          :auto-size="{ minRows: 2, maxRows: 4 }"
          show-word-limit
          :max-length="200"
        />
      </a-form-item>

      <!-- 备注说明（选填） -->
      <a-form-item
        field="remark"
        label="备注说明"
      >
        <a-textarea
          v-model="form.remark"
          placeholder="补充说明缺失内容的影响范围、使用场景或紧急程度（选填）"
          :auto-size="{ minRows: 2, maxRows: 3 }"
          show-word-limit
          :max-length="200"
        />
      </a-form-item>

      <!-- 高级选项（折叠） -->
      <a-collapse :bordered="false" class="advanced-options">
        <a-collapse-item header="更多可选信息（期望补齐时间、截图等）" key="1">
          <a-form-item field="expectedTime" label="期望补齐时间">
            <a-date-picker v-model="form.expectedTime" style="width: 100%" placeholder="请选择时间" />
          </a-form-item>

          <a-form-item field="screenshot" label="截图附件">
            <a-upload
              v-model:file-list="fileList"
              :limit="1"
              :auto-upload="false"
              draggable
              :custom-request="customRequest"
            >
              <template #upload-button>
                <div class="upload-trigger">
                  <icon-upload /> <span>拖拽或点击上传</span>
                </div>
              </template>
            </a-upload>
          </a-form-item>
        </a-collapse-item>
      </a-collapse>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { Message, Modal } from '@arco-design/web-vue'
import {
  IconInfoCircleFill,
  IconUpload
} from '@arco-design/web-vue/es/icon'

export interface MissingTicketContext {
  /** 资产类型：table/metric/external/concept/variable/feature 等 */
  assetType?: string
  /** 具体资产名称（详情页传入） */
  assetName?: string
  /** 页面来源名称（如"指标字典"、"外部数据"） */
  pageSource?: string
}

const props = defineProps<{
  /** 初始资产名称（兼容旧用法） */
  initialName?: string
  /** 页面上下文信息 */
  context?: MissingTicketContext
}>()

const visible = defineModel<boolean>('visible', { required: true })
const emits = defineEmits(['confirm'])

const formRef = ref()
const fileList = ref([])

const form = reactive({
  ticketType: 'content_missing' as 'content_error' | 'content_missing' | 'content_suggestion',
  missingContent: '',
  remark: '',
  expectedTime: ''
})

// 工单类型映射
const TICKET_TYPE_MAP: Record<string, { title: string; intro: string }> = {
  content_error: { title: '内容错误工单', intro: '发现数据或内容有误？请描述错误详情，我们将尽快核实修正。' },
  content_missing: { title: '内容缺失工单', intro: '没找到想要的数据？告诉我们，我们将尽快为您补齐。' },
  content_suggestion: { title: '内容建议工单', intro: '对数据内容有改进建议？请告诉我们，帮助我们持续优化。' }
}

const modalTitle = computed(() => TICKET_TYPE_MAP[form.ticketType]?.title || '内容工单')
const modalIntro = computed(() => TICKET_TYPE_MAP[form.ticketType]?.intro || '')

// 合并上下文：优先使用 context prop，回退到 initialName
const context = computed<MissingTicketContext>(() => {
  if (props.context) return props.context
  return {
    assetName: props.initialName || ''
  }
})

// 是否有上下文信息可展示
const contextSummary = computed(() => {
  const c = context.value
  return c.assetType || c.assetName || c.pageSource
})

// 资产类型标签
const ASSET_TYPE_MAP: Record<string, { label: string; color: string }> = {
  table: { label: '数据表', color: 'blue' },
  metric: { label: '指标', color: 'green' },
  external: { label: '外部数据', color: 'orange' },
  concept: { label: '业务概念', color: 'purple' },
  variable: { label: '特征', color: 'cyan' },
  feature: { label: '特征', color: 'magenta' },
  other: { label: '其他', color: 'gray' }
}

const assetTypeLabel = computed(() => {
  const t = context.value.assetType
  return ASSET_TYPE_MAP[t]?.label || t || '未分类'
})

const assetTypeColor = computed(() => {
  const t = context.value.assetType
  return ASSET_TYPE_MAP[t]?.color || 'gray'
})

// 弹窗打开时重置表单
watch(visible, (val) => {
  if (val) {
    form.ticketType = 'content_missing'
    form.missingContent = ''
    form.remark = ''
    form.expectedTime = ''
    fileList.value = []
  }
})

const customRequest = (options: any) => {
  const { onSuccess } = options
  setTimeout(() => {
    onSuccess({})
    Message.success('上传成功')
  }, 500)
}

const handleOk = async () => {
  const errors = await formRef.value?.validate()
  if (errors) return

  emits('confirm', {
    ...form,
    ...context.value,
    screenshot: fileList.value.length > 0 ? fileList.value[0] : null
  })

  resetForm()
  visible.value = false
}

const isDirty = computed(() => {
  return form.ticketType !== 'content_missing' ||
         form.missingContent !== '' ||
         form.remark !== '' ||
         form.expectedTime !== '' ||
         fileList.value.length > 0
})

const handleCancel = () => {
  if (isDirty.value) {
    Modal.confirm({
      title: '确认取消？',
      content: '您输入的内容尚未提交，取消将丢失已填写的资料。',
      okText: '确认取消',
      cancelText: '继续填写',
      onOk: () => {
        resetForm()
        visible.value = false
      }
    })
  } else {
    resetForm()
    visible.value = false
  }
}

const resetForm = () => {
  formRef.value?.resetFields()
  form.ticketType = 'content_missing'
  form.missingContent = ''
  form.remark = ''
  form.expectedTime = ''
  fileList.value = []
}
</script>

<style scoped>
.modal-intro {
  margin-bottom: 16px;
  padding: 10px 16px;
  background-color: var(--color-fill-2);
  border-radius: 4px;
  color: var(--color-text-2);
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.modal-intro .arco-icon {
  color: var(--subapp-primary);
  font-size: 16px;
}

.context-panel {
  margin-bottom: 16px;
  padding: 12px 16px;
  background-color: var(--color-fill-1);
  border-radius: 6px;
  border: 1px solid var(--color-border-2);
}

.context-label {
  font-size: 12px;
  color: var(--color-text-3);
  margin-bottom: 6px;
}

.context-body {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 13px;
}

.context-asset-name {
  font-weight: 500;
  color: var(--color-text-1);
}

.context-page-source {
  color: var(--color-text-3);
  font-size: 12px;
}

.ticket-form :deep(.arco-form-item-label) {
  font-weight: 500;
  color: var(--color-text-1);
}

.advanced-options {
  margin-top: 8px;
  background: transparent;
}

.advanced-options :deep(.arco-collapse-item-header) {
  padding-left: 0;
  color: var(--color-text-3);
  font-size: 13px;
}

.upload-trigger {
  width: 100%;
  border: 1px dashed var(--color-border-3);
  padding: 20px;
  border-radius: 4px;
  text-align: center;
  color: var(--color-text-3);
  transition: all 0.2s;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
}

.upload-trigger:hover {
  border-color: var(--subapp-primary);
  color: var(--subapp-primary);
  background-color: var(--color-primary-light-1);
}
</style>
