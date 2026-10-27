<template>
  <!-- 内联模式：嵌入统计抽屉内展示配置表单，不弹抽屉外壳（R13-2：同一时刻只存在一个抽屉） -->
  <div v-if="inline" class="base-drawer-inline" :class="[{ 'base-drawer--readonly': readOnly }]">
    <!-- 标题复用抽屉自身的 title，与新建时完全一致 -->
    <div class="base-drawer-inline__title">{{ title }}</div>
    <!-- inert：只读态彻底阻断聚焦与输入（含键盘 Tab 后键入），保持与新建时一致的表单结构与选项 -->
    <div class="form-container" :inert="readOnly ? true : null">
      <a-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        layout="vertical"
      >
        <slot name="form" :form-data="formData" :form-ref="formRef" />
      </a-form>
    </div>
  </div>

  <a-drawer
    v-else
    :visible="visible"
    :title="title"
    :width="width"
    placement="right"
    :closable="closable"
    :mask-closable="maskClosable"
    :class="[{ 'base-drawer--readonly': readOnly }]"
    @cancel="handleCancel"
    @close="handleCancel"
  >
    <div class="base-drawer-content">
      <div class="form-container" :style="readOnly ? { pointerEvents: 'none', opacity: 0.85 } : {}">
        <a-form
          ref="formRef"
          :model="formData"
          :rules="formRules"
          layout="vertical"
        >
          <slot name="form" :form-data="formData" :form-ref="formRef" />
        </a-form>
      </div>
      <div v-if="$slots.content" class="content-container">
        <slot name="content" />
      </div>
      <div v-if="showDebug && !readOnly && $slots.debug" class="debug-container">
        <a-divider>调试信息</a-divider>
        <slot name="debug" :form-data="formData" :is-valid="isFormValid" />
      </div>
    </div>
    <template #footer>
      <div class="drawer-footer">
        <div v-if="$slots.actions" class="custom-actions">
          <slot name="actions" />
        </div>
        <a-button v-if="showDebug && !readOnly" type="outline" @click="handleDebugSubmit">调试</a-button>
        <a-button @click="handleCancel">{{ cancelText }}</a-button>
        <a-button v-if="!readOnly" type="primary" :loading="submitting" :disabled="!isFormValid" @click="handleConfirm">{{ confirmText }}</a-button>
      </div>
    </template>
  </a-drawer>
</template>
<script setup>
import { computed } from 'vue'
import { useConfigInline } from './configInlineContext.js'
const props = defineProps({
  visible: { type: Boolean, default: false },
  title: { type: String, default: '配置' },
  width: { type: String, default: '520px' },
  closable: { type: Boolean, default: true },
  maskClosable: { type: Boolean, default: true },
  formData: { type: Object, required: true },
  formRules: { type: Object, default: () => ({}) },
  formRef: { type: Object, default: null },
  isFormValid: { type: Boolean, default: true },
  submitting: { type: Boolean, default: false },
  confirmText: { type: String, default: '确定' },
  cancelText: { type: String, default: '取消' },
  showDebug: { type: Boolean, default: false },
  readOnly: { type: Boolean, default: false }
})
const emit = defineEmits(['update:visible','confirm','cancel','debug-submit'])
/** 是否处于内联模式（由统计抽屉「配置」TAB 注入） */
const inline = useConfigInline()
const handleCancel = () => { emit('cancel'); emit('update:visible', false) }
const handleConfirm = () => { emit('confirm') }
const handleDebugSubmit = () => { emit('debug-submit') }
</script>
<style scoped>
.base-drawer-inline { width: 100% }
.base-drawer-inline__title { font-size: 14px; font-weight: 600; color: var(--color-text-1); margin-bottom: 12px }
.base-drawer-content { height: 100%; display: flex; flex-direction: column }
.form-container { flex: 1; padding: 0 4px }
.content-container { margin-top: 16px }
.debug-container { margin-top: 16px; padding: 12px; background-color: var(--color-bg-2); border: 1px solid var(--color-border-2); border-radius: 4px }
.drawer-footer { display: flex; justify-content: flex-end; align-items: center; gap: 12px }
.custom-actions { margin-right: auto }
.base-drawer--readonly :deep(.arco-input),
.base-drawer--readonly :deep(textarea),
.base-drawer--readonly :deep(select),
.base-drawer--readonly :deep(.arco-input-number),
.base-drawer--readonly :deep(.arco-select),
.base-drawer--readonly :deep(.arco-textarea) { pointer-events: none }
/* 只读态：编辑类按钮不可点击（新增/删除分支、导出日志等） */
.base-drawer--readonly :deep(.arco-btn) { pointer-events: none; opacity: 0.5 }
/* 内联只读：与新建时一致的表单布局，仅去除交互能力 */
.base-drawer-inline.base-drawer--readonly :deep(.arco-select-view),
.base-drawer-inline.base-drawer--readonly :deep(.arco-picker),
.base-drawer-inline.base-drawer--readonly :deep(.arco-checkbox),
.base-drawer-inline.base-drawer--readonly :deep(.arco-radio) { pointer-events: none; opacity: 0.7 }
</style>
