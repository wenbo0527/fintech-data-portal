<template>
  <BaseDrawer
    :visible="visible"
    title="等待配置"
    width="480px"
    :form-data="form"
    :form-rules="rules"
    :is-form-valid="!formMaxExceeded"
    :read-only="readOnly"
    :cancel-text="readOnly ? '关闭' : '取消'"
    @update:visible="(val) => emit('update:visible', val)"
    @confirm="handleConfirm"
    @cancel="handleCancel"
  >
    <template #form>
      <a-form-item label="节点名称" field="nodeName">
        <a-input v-model="form.nodeName" :disabled="readOnly" />
      </a-form-item>
      <a-form-item label="等待时间" field="value">
        <a-input-number v-model="form.value" :min="1" :precision="0" :disabled="readOnly" style="width: 160px;" />
        <a-select v-model="form.unit" :disabled="readOnly" style="width: 120px; margin-left: 8px;">
          <a-option value="分钟">分钟</a-option>
          <a-option value="小时">小时</a-option>
          <a-option value="天">天</a-option>
        </a-select>
      </a-form-item>
      <a-alert type="warning" v-if="formMaxExceeded" style="margin-bottom: 8px;">
        最大等待时间为15天，请调整配置
      </a-alert>
    </template>
  </BaseDrawer>
</template>
<script setup>
/*
用途：等待节点配置抽屉
说明：与其他节点抽屉统一使用 BaseDrawer 外壳，从而支持在统计抽屉「配置」TAB 内以只读内联方式复用。
边界：确认时保存结构保持不变（nodeName + config.value/config.unit 二次嵌套），兼容既有数据。
*/
import { reactive, computed, watch } from 'vue'
import BaseDrawer from './BaseDrawer.vue'

const props = defineProps({ visible: { type: Boolean, default: false }, nodeData: { type: Object, default: () => ({}) }, readOnly: { type: Boolean, default: false } })
const emit = defineEmits(['update:visible','confirm','cancel'])

const form = reactive({ nodeName: '', value: 10, unit: '分钟' })
const rules = { value: [{ required: true, message: '请输入等待时间' }], nodeName: [{ required: true, message: '请输入节点名称' }] }
const maxMinutes = 15 * 24 * 60

/**
 * 从节点数据回填表单
 * 入参：nodeData(object) —— 节点数据（config 可能为扁平结构或 config 二次嵌套结构）
 * 返回：void
 * 说明：等待节点历史数据存在 config 二次嵌套（config.config.value），此处兼容两种结构
 */
function applyNodeData(nodeData) {
  const outer = (nodeData && nodeData.config) || {}
  const inner = (outer && typeof outer.config === 'object' && outer.config) ? outer.config : outer
  form.nodeName = (nodeData && nodeData.nodeName) || inner.nodeName || outer.nodeName || ''
  form.value = inner.value != null ? Number(inner.value) : 10
  form.unit = inner.unit || '分钟'
}
watch(() => props.nodeData, (val) => applyNodeData(val), { immediate: true, deep: true })

/** 等待时长换算为分钟 */
const formMinutes = computed(() => {
  const v = Number(form.value) || 0
  switch (form.unit) {
    case '分钟': return v
    case '小时': return v * 60
    case '天': return v * 24 * 60
    default: return v
  }
})
/** 是否超过最大等待时长（15 天） */
const formMaxExceeded = computed(() => formMinutes.value > maxMinutes)

/**
 * 提交配置
 * 返回：void
 * 说明：payload 结构与历史保持一致，等待时长落在 config 二次嵌套层
 */
function handleConfirm() {
  emit('confirm', { nodeName: form.nodeName, config: { value: Number(form.value), unit: form.unit, nodeName: form.nodeName, nodeType: 'wait' } })
}
/** 关闭抽屉 */
function handleCancel() { emit('cancel') }
</script>
