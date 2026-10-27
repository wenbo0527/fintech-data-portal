<template>
  <BaseDrawer
    :visible="visible"
    :form-data="formData"
    :form-rules="formRules"
    :is-submitting="isSubmitting"
    title="事件分流节点配置"
    width="640px"
    :read-only="readOnly"
    @update:visible="visible = $event"
    @confirm="handleSubmit"
    @cancel="handleCancel"
  >
    <template #form>
      <div v-if="!readOnly" class="debug-info">
        <div>表单验证状态: {{ isValid ? '✓' : '✗' }}</div>
        <div v-if="isFromCombo">来源：{{ comboOriginLabel }}</div>
        <div>超时设置：{{ formData.timeout || 0 }}{{ formData.unit || '分钟' }}</div>
      </div>
      <a-form-item label="节点名称" field="nodeName">
        <a-input v-model="formData.nodeName" placeholder="请输入节点名称" allow-clear />
      </a-form-item>

      <a-form-item label="分支配置">
        <div class="branch-list">
          <div v-for="(branch, bIdx) in branches" :key="branch.key" class="branch-item" :class="{ 'branch-item--miss': branch.type === 'miss' }">
            <div class="branch-item__header">
              <span class="branch-item__index">分支 {{ bIdx + 1 }}</span>
              <a-tag v-if="branch.type === 'miss'" color="gray" size="small">未命中（默认）</a-tag>
              <a-tag v-else-if="branch.unconditional" color="arcoblue" size="small">无条件</a-tag>
              <a-input
                v-model="branch.name"
                :placeholder="branch.type === 'miss' ? '默认：否' : '请输入分支名称'"
                :disabled="readOnly"
                allow-clear
                class="branch-item__name"
              />
              <a-button
                v-if="!readOnly && branch.type !== 'miss' && branches.filter(b => b.type !== 'miss').length > 1"
                status="danger"
                size="mini"
                @click="removeBranch(bIdx)"
              >删除分支</a-button>
            </div>

            <!-- 分支事件类型（hit 分支必填；miss 分支不展示） -->
            <div v-if="branch.type !== 'miss'" class="branch-item__event">
              <span class="branch-item__label">监听事件</span>
              <a-select
                v-model="branch.eventType"
                :disabled="readOnly || isBranchEventLocked(branch)"
                placeholder="请选择事件类型"
                allow-clear
                style="flex: 1"
              >
                <a-option v-for="opt in EVENT_TYPE_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</a-option>
              </a-select>
              <a-tag v-if="isBranchEventLocked(branch)" size="small" color="gray">已锁定</a-tag>
            </div>
            <div v-if="branch.type !== 'miss' && branch.eventType === 'custom'" class="branch-item__event-custom">
              <span class="branch-item__label">自定义事件名</span>
              <a-input
                v-model="branch.customEventName"
                :disabled="readOnly || isBranchEventLocked(branch)"
                placeholder="请输入自定义事件名称"
                allow-clear
                style="flex: 1"
              />
            </div>

            <div v-if="branch.type !== 'miss'" class="branch-item__conditions">
              <template v-if="branch.unconditional">
                <div class="branch-item__uncond-tip">该分支无条件：发生"{{ getEventLabel(branch) }}"即落入，其他分支将不再评估</div>
              </template>
              <template v-else>
                <div class="branch-item__cond-toggle">
                  <a-checkbox v-model="branch.unconditional" :disabled="readOnly">无条件（事件发生即落入）</a-checkbox>
                </div>
                <div v-if="!branch.unconditional">
                  <div v-for="(cond, cIdx) in branch.conditions" :key="cond.key" class="branch-condition-row">
                    <a-input v-model="cond.field" placeholder="属性名（如 响应层级）" :disabled="readOnly" allow-clear style="width: 160px" />
                    <a-select v-model="cond.operator" :disabled="readOnly" style="width: 120px">
                      <a-option value="eq">等于</a-option>
                      <a-option value="neq">不等于</a-option>
                      <a-option value="contains">包含</a-option>
                      <a-option value="gt">大于</a-option>
                      <a-option value="lt">小于</a-option>
                      <a-option value="in">属于</a-option>
                      <a-option value="not_in">不属于</a-option>
                    </a-select>
                    <a-input v-model="cond.value" placeholder="属性值" :disabled="readOnly" allow-clear style="flex: 1" />
                    <a-button v-if="!readOnly" status="danger" size="mini" @click="removeCondition(bIdx, cIdx)" :disabled="branch.conditions.length <= 1">删除</a-button>
                  </div>
                  <div v-if="!readOnly" class="branch-condition-actions">
                    <a-button size="small" type="primary" @click="addCondition(bIdx)">+ 增加属性判断</a-button>
                    <span class="form-item-tip">同一分支内多条件为 AND 关系；分支按顺序匹配，命中第一个后即落入</span>
                  </div>
                </div>
              </template>
            </div>

            <div v-else class="branch-item__miss-tip">
              <div class="branch-item__miss-trigger">触发条件：超过
                <a-input-number v-model="formData.timeout" :min="1" size="small" style="width: 120px" />
                <a-select v-model="formData.unit" size="small" style="width: 100px">
                  <a-option value="分钟">分钟</a-option>
                  <a-option value="小时">小时</a-option>
                  <a-option value="天">天</a-option>
                </a-select>
                未发生任一分支事件时进入此分支
              </div>
              <div class="form-item-tip">该分支是兜底分支，所有命中分支条件都不满足时进入</div>
            </div>
          </div>
          <div v-if="!readOnly" class="branch-list__actions">
            <a-button size="small" type="primary" @click="addBranch">+ 增加分支</a-button>
          </div>
        </div>
      </a-form-item>
    </template>
  </BaseDrawer>
</template>
<script setup>
import { computed, ref, watch } from 'vue'
import BaseDrawer from './BaseDrawer.vue'
import { useBaseDrawer } from '@/composables/useBaseDrawer.js'
import { TOUCH_COMBOS, getNodeLabel } from '@/utils/nodeTypes.js'

const props = defineProps({ visible: { type: Boolean, default: false }, nodeData: { type: Object, default: () => ({}) }, readOnly: { type: Boolean, default: false } })
const emit = defineEmits(['update:visible', 'confirm', 'cancel'])

const OPERATOR_LABEL = { eq: '等于', neq: '不等于', contains: '包含', gt: '大于', lt: '小于', in: '属于', not_in: '不属于' }

const EVENT_TYPE_OPTIONS = [
  { label: '短信发送成功事件', value: 'sms_success' },
  { label: 'APP热场景事件', value: 'app_hot_scene' },
  { label: '点击事件', value: 'click' },
  { label: '浏览事件', value: 'view' },
  { label: '购买事件', value: 'purchase' },
  { label: '注册事件', value: 'register' },
  { label: '登录事件', value: 'login' },
  { label: '自定义事件', value: 'custom' }
]
const EVENT_TYPE_LABEL_MAP = Object.fromEntries(EVENT_TYPE_OPTIONS.map(o => [o.value, o.label]))

const formRules = {
  // 节点级已不再需要 eventType；移除校验
}

// 组合节点判定以 TOUCH_COMBOS 为单一数据源：新增高级节点时此处无需再改动
const isFromCombo = computed(() => Boolean(TOUCH_COMBOS[props.nodeData?.config?.comboType]))
const comboOriginLabel = computed(() => {
  const t = props.nodeData?.config?.comboType
  return TOUCH_COMBOS[t] ? getNodeLabel(t) : ''
})

const nodeDefaultEventType = computed(() => {
  const cfg = props.nodeData?.config || {}
  return cfg.eventType || (isFromCombo.value ? 'custom' : '')
})
const nodeDefaultCustomEventName = computed(() => props.nodeData?.config?.customEventName || '')

// 分支列表：自定义命中的分支按顺序匹配，最后一条固定为 miss（未命中）
const branches = ref([
  { key: `branch-${Date.now()}-0`, name: '发生事件', type: 'hit', eventType: '', customEventName: '', unconditional: true, conditions: [] },
  { key: `branch-${Date.now()}-miss`, name: '否', type: 'miss', eventType: '', customEventName: '', unconditional: false, conditions: [] }
])

const getInitialFormData = () => ({
  nodeName: props.nodeData?.nodeName || '事件分流',
  timeout: 60,
  unit: '分钟'
})

const customValidation = (formData) => {
  const errors = []
  // 校验 hit 分支必须选了事件类型
  branches.value.forEach((b, idx) => {
    if (b.type !== 'miss' && !b.eventType) {
      errors.push(`分支${idx + 1}未选择监听事件`)
    }
    if (b.type !== 'miss' && b.eventType === 'custom' && !b.customEventName) {
      errors.push(`分支${idx + 1}未填写自定义事件名称`)
    }
  })
  return errors
}

const { formData, formRef, isValid, visible, isSubmitting, handleSubmit: baseHandleSubmit, handleCancel } = useBaseDrawer({
  props,
  emit,
  formRules,
  getInitialFormData,
  customValidation,
  nodeType: 'event-split'
})

const isBranchEventLocked = (branch) => Boolean(isFromCombo.value && branch.type !== 'miss')

const getEventLabel = (branch) => {
  if (!branch || !branch.eventType) return ''
  if (branch.eventType === 'custom') return branch.customEventName || '自定义事件'
  return EVENT_TYPE_LABEL_MAP[branch.eventType] || branch.eventType
}

// 抽屉打开时同步分支列表
watch(visible, (v) => {
  if (!v) return
  try {
    const cfg = props.nodeData?.config || {}
    const inheritedType = cfg.eventType || (isFromCombo.value ? 'custom' : '')
    const inheritedCustom = cfg.customEventName || ''
    if (Array.isArray(cfg.branches) && cfg.branches.length) {
      branches.value = cfg.branches.map((b, i) => {
        const isMiss = b.type === 'miss'
        const unconditional = Boolean(b.unconditional)
        const conds = isMiss || unconditional
          ? []
          : (Array.isArray(b.conditions) && b.conditions.length
              ? b.conditions.map((c, j) => ({
                  key: c.key || `cond-${Date.now()}-${i}-${j}`,
                  field: c.field || '',
                  operator: c.operator || 'eq',
                  value: c.value != null ? String(c.value) : ''
                }))
              : [{ key: `cond-${Date.now()}-${i}`, field: '', operator: 'eq', value: '' }])
        return {
          key: b.id || b.key || `branch-${Date.now()}-${i}`,
          name: b.name || b.label || (isMiss ? '否' : (unconditional ? '发生事件' : `分支${i + 1}`)),
          type: isMiss ? 'miss' : 'hit',
          unconditional,
          eventType: b.eventType || (isMiss ? '' : inheritedType),
          customEventName: b.customEventName || (isMiss ? '' : (b.eventType === 'custom' ? inheritedCustom : '')),
          conditions: conds
        }
      })
      // 确保最后一条是 miss
      const last = branches.value[branches.value.length - 1]
      if (!last || last.type !== 'miss') {
        branches.value.push({ key: `branch-${Date.now()}-miss`, name: '否', type: 'miss', eventType: '', customEventName: '', unconditional: false, conditions: [] })
      }
    } else if (Array.isArray(cfg.hitConditions) && cfg.hitConditions.length) {
      branches.value = [
        {
          key: `branch-${Date.now()}-0`,
          name: cfg.yesLabel || '发生事件',
          type: 'hit',
          unconditional: false,
          eventType: inheritedType,
          customEventName: inheritedCustom,
          conditions: cfg.hitConditions.map((c, j) => ({
            key: c.key || `cond-${Date.now()}-${j}`,
            field: c.field || '',
            operator: c.operator || 'eq',
            value: c.value != null ? String(c.value) : ''
          }))
        },
        { key: `branch-${Date.now()}-miss`, name: cfg.noLabel || '否', type: 'miss', eventType: '', customEventName: '', unconditional: false, conditions: [] }
      ]
    } else {
      // 全新节点：第一个 hit 分支默认继承节点事件
      branches.value[0].eventType = inheritedType || branches.value[0].eventType
      branches.value[0].customEventName = inheritedCustom || branches.value[0].customEventName
    }
  } catch (e) {
    console.warn('[EventSplit] 同步分支配置失败:', e)
  }
}, { immediate: true })

const addBranch = () => {
  const ts = Date.now()
  const missIdx = branches.value.findIndex(b => b.type === 'miss')
  // 新分支默认继承上一分支（hit 分支）的事件；若无则继承节点默认事件
  let inheritedType = ''
  let inheritedCustom = ''
  for (let i = branches.value.length - 1; i >= 0; i--) {
    if (branches.value[i].type === 'hit') {
      inheritedType = branches.value[i].eventType || ''
      inheritedCustom = branches.value[i].customEventName || ''
      break
    }
  }
  if (!inheritedType) {
    inheritedType = nodeDefaultEventType.value || ''
    inheritedCustom = nodeDefaultCustomEventName.value || ''
  }
  const newBranch = {
    key: `branch-${ts}-${branches.value.length}`,
    name: `分支${branches.value.filter(b => b.type !== 'miss').length + 1}`,
    type: 'hit',
    unconditional: true,
    eventType: inheritedType,
    customEventName: inheritedCustom,
    conditions: []
  }
  if (missIdx >= 0) branches.value.splice(missIdx, 0, newBranch)
  else branches.value.push(newBranch)
}

const removeBranch = (idx) => {
  const branch = branches.value[idx]
  if (!branch || branch.type === 'miss') return
  const hitCount = branches.value.filter(b => b.type !== 'miss').length
  if (hitCount <= 1) return
  branches.value.splice(idx, 1)
}

const addCondition = (bIdx) => {
  const ts = Date.now()
  branches.value[bIdx].conditions.push({ key: `cond-${ts}-${branches.value[bIdx].conditions.length}`, field: '', operator: 'eq', value: '' })
}

const removeCondition = (bIdx, cIdx) => {
  const branch = branches.value[bIdx]
  if (!branch || branch.conditions.length <= 1) return
  branch.conditions.splice(cIdx, 1)
}

const handleSubmit = async () => {
  const splitId = props.nodeData?.nodeId || props.nodeData?.id || 'event-split'
  const normalizedBranches = branches.value.map((b, i) => {
    const isMiss = b.type === 'miss'
    const unconditional = Boolean(b.unconditional)
    const conds = (isMiss || unconditional)
      ? []
      : b.conditions.filter(c => c && (c.field || c.value)).map(c => ({
          key: c.key,
          field: c.field || '',
          operator: c.operator || 'eq',
          operatorLabel: OPERATOR_LABEL[c.operator] || c.operator,
          value: c.value != null ? c.value : ''
        }))
    const eventType = isMiss ? '' : (b.eventType || '')
    const customEventName = isMiss ? '' : (b.customEventName || '')
    const label = b.name || (isMiss ? '否' : (unconditional ? '发生事件' : `分支${i + 1}`))
    return {
      id: `${splitId}-branch-${i}`,
      key: b.key,
      name: label,
      type: isMiss ? 'miss' : 'hit',
      label,
      default: isMiss,
      unconditional,
      eventType,
      customEventName,
      eventTypeLabel: eventType === 'custom' ? customEventName : (EVENT_TYPE_LABEL_MAP[eventType] || eventType),
      conditions: conds
    }
  })
  const config = {
    nodeName: formData.nodeName || '事件分流',
    timeout: formData.timeout,
    unit: formData.unit || '分钟',
    branches: normalizedBranches,
    splitCount: normalizedBranches.length,
    nodeType: 'event-split',
    comboType: props.nodeData?.config?.comboType || '',
    // 兼容旧字段（取第一个 hit 分支的事件）
    eventType: normalizedBranches.find(b => b.type === 'hit')?.eventType || '',
    customEventName: normalizedBranches.find(b => b.type === 'hit')?.customEventName || ''
  }
  await baseHandleSubmit(config)
}
</script>
<style scoped>
.branch-list { display: flex; flex-direction: column; gap: 12px }
.branch-item { border: 1px solid var(--color-border-2); border-radius: 6px; padding: 12px; background-color: var(--color-fill-1) }
.branch-item--miss { background-color: #fafafa; border-style: dashed }
.branch-item__header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px }
.branch-item__index { font-weight: 600; color: var(--color-text-1); min-width: 60px }
.branch-item__name { flex: 1 }
.branch-item__event { display: flex; align-items: center; gap: 8px; margin-bottom: 8px }
.branch-item__event-custom { display: flex; align-items: center; gap: 8px; margin-bottom: 8px }
.branch-item__label { color: var(--color-text-2); font-size: 13px; min-width: 70px }
.branch-item__conditions { display: flex; flex-direction: column; gap: 8px; margin-top: 4px }
.branch-item__cond-toggle { display: flex; align-items: center; gap: 8px }
.branch-condition-row { display: flex; align-items: center; gap: 8px }
.branch-condition-actions { display: flex; align-items: center; gap: 12px; margin-top: 4px }
.branch-item__miss-tip { font-size: 12px; color: var(--color-text-3); padding: 4px 0 }
.branch-item__miss-trigger { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; color: var(--color-text-2) }
.branch-item__uncond-tip { font-size: 12px; color: var(--color-text-2); padding: 8px 12px; background: var(--color-primary-1); border-radius: 4px; border: 1px dashed var(--color-primary-3) }
.branch-list__actions { display: flex; justify-content: flex-start }
.form-item-tip { font-size: 12px; color: var(--color-text-3); margin-top: 4px; line-height: 1.4 }
.debug-info { font-size: 12px; color: #666; background: #f5f5f5; padding: 8px; border-radius: 4px; margin-bottom: 12px }
.debug-info div { margin-bottom: 4px }
.debug-info div:last-child { margin-bottom: 0 }
.arco-form-item-label { font-weight: 500; color: var(--color-text-1) }
.arco-input, .arco-select, .arco-textarea, .arco-input-number { border-radius: 6px }
.arco-input:focus, .arco-select:focus, .arco-textarea:focus, .arco-input-number:focus { border-color: var(--color-primary-6); box-shadow: 0 0 0 2px var(--color-primary-1) }
</style>