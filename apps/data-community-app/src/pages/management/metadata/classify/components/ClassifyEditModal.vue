<template>
  <a-modal
    :visible="visible"
    :title="`编辑字段分级 · ${field?.field_name || ''}（${tableKey}）· 变更需审批后生效`"
    :width="660"
    :mask-closable="false"
    :ok-text="'提交审批'"
    :cancel-text="'取消'"
    :ok-button-props="{ disabled: !hasChange }"
    @ok="handleOk"
    @cancel="emit('update:visible', false)"
  >
    <!-- 先审后发提示：审批通过前不会改动分级数据，避免用户误以为保存即生效 -->
    <a-alert :type="alertType" show-icon class="policy-alert">
      <template #title>{{ policyTitle }}</template>
      {{ policyDesc }}
    </a-alert>

    <a-form v-if="form" ref="formRef" :model="form" layout="vertical">
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="字段名">
            <a-input :model-value="form.field_name" readonly />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="字段注释">
            <a-input :model-value="form.field_comment" readonly />
          </a-form-item>
        </a-col>
      </a-row>
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="Schema">
            <a-input :model-value="tableKey.split('.')[0]" readonly />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="表名">
            <a-input :model-value="tableKey.split('.')[1]" readonly />
          </a-form-item>
        </a-col>
      </a-row>
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="业务属于" required>
            <a-select v-model="form.business_belonging" placeholder="请选择">
              <a-option v-for="b in BELONGING_OPTIONS" :key="b" :value="b">{{ b }}</a-option>
            </a-select>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="分级" required>
            <a-select v-model="form.grade" placeholder="请选择">
              <a-option v-for="g in GRADE_OPTIONS" :key="g" :value="g">{{ g }}</a-option>
            </a-select>
          </a-form-item>
        </a-col>
      </a-row>
      <a-form-item label="敏感级别" required>
        <a-radio-group v-model="form.sensitivity_level">
          <a-radio v-for="lv in (['L1', 'L2', 'L3', 'L4'] as const)" :key="lv" :value="lv">
            <a-tag :color="SENSITIVITY_COLORS[lv]">{{ lv }} {{ SENSITIVITY_NAMES[lv] }}</a-tag>
          </a-radio>
        </a-radio-group>
      </a-form-item>
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="一级业务目录" required>
            <a-select v-model="form.category_l1" allow-search>
              <a-option v-for="l1 in l1Options" :key="l1" :value="l1">{{ l1 }}</a-option>
            </a-select>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="二级业务目录" required>
            <a-input v-model="form.category_l2" />
          </a-form-item>
        </a-col>
      </a-row>
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="三级业务目录" required>
            <a-input v-model="form.category_l3" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="四级业务目录" required>
            <a-input v-model="form.category_l4" />
          </a-form-item>
        </a-col>
      </a-row>

      <!-- 变更原因：审批人判断依据，规格与审批台驳回理由一致 -->
      <a-form-item
        field="_reason"
        :label="`变更原因（将留痕在变更单 ${idHint || ''} 上，供审批人判断）`"
        :rules="reasonRules"
      >
        <a-textarea
          v-model="reason"
          placeholder="例如：该字段存储客户手机号，按数据安全分级矩阵应定为 L3 秘密，补全后本表覆盖率达标"
          :auto-size="{ minRows: 2, maxRows: 5 }"
          :max-length="200"
          show-word-limit
        />
      </a-form-item>

      <div class="diff-box">
        <div class="diff-title">本次变更（{{ changedDims.length }} 项）</div>
        <template v-if="changedDims.length">
          <div v-for="d in changedDims" :key="d.key" class="diff-row">
            <span class="diff-dim">{{ d.label }}</span>
            <span class="diff-old">{{ d.oldText }}</span>
            <icon-arrow-right class="diff-arrow" />
            <span class="diff-new">{{ d.newText }}</span>
          </div>
        </template>
        <div v-else class="diff-empty">未检测到字段变更，填写至少一项后即可提交审批</div>
      </div>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Message } from '@arco-design/web-vue'
import { IconArrowRight } from '@arco-design/web-vue/es/icon'
import { SENSITIVITY_COLORS, SENSITIVITY_NAMES, GRADE_OPTIONS, BELONGING_OPTIONS, CLASSIFY_DIMS, dimValueText } from '@/mock-shared/classify-constants'
import { classifyMatrixData } from '@/mock-shared/classify-matrix'
import { buildFieldDiff, CLASSIFY_LEVEL_POLICY, type ClassifyFieldDiff } from '@/mock-shared/classify-change-store'
import type { ClassifyField, SensitivityLevel } from '@/mock-shared/classify-types'

const props = defineProps<{
  visible: boolean
  field: ClassifyField | null
  tableKey: string
  /** 在途单号提示（同表已有未完结变更单时由页面传入） */
  idHint?: string
}>()
const emit = defineEmits<{
  'update:visible': [v: boolean]
  /** 提交审批：由页面调 ClassifyChangeStore.submit 落地成变更单，本组件不写数据 */
  'submitted': [payload: { diffs: ClassifyFieldDiff[]; reason: string }]
}>()

const form = ref<ClassifyField | null>(null)
const reason = ref('')
const l1Options = Array.from(new Set(classifyMatrixData.map(i => i.category_l1)))

watch(() => props.field, (f) => {
  if (f) {
    form.value = { ...f }
    reason.value = ''
  }
}, { immediate: true })

/** 变更维度摘要（弹窗内即时反馈，审批人关心的就是这几项） */
const changedDims = computed(() => {
  const before = props.field
  const after = form.value
  if (!before || !after) return []
  return CLASSIFY_DIMS
    .filter(d => before[d.key] !== after[d.key])
    .map(d => ({
      key: d.key as string,
      label: d.label,
      oldText: dimValueText(d.key as string, before[d.key] as string | undefined),
      newText: dimValueText(d.key as string, after[d.key] as string | undefined)
    }))
})
const hasChange = computed(() => changedDims.value.length > 0)

/** 按本次要定到的级别给出审批流预告：L3/L4 走双审，口径与变更单策略查表同源 */
const policyLevel = computed<SensitivityLevel>(() => {
  const lv = form.value?.sensitivity_level
  return lv === '' || !lv ? (props.field?.sensitivity_level || 'L2') : lv
})
const isDualReview = computed(() => CLASSIFY_LEVEL_POLICY[policyLevel.value].flow === 'approval_dba')
const alertType = computed(() => (isDualReview.value ? 'warning' : 'info'))
const policyTitle = computed(() => `审批流：${CLASSIFY_LEVEL_POLICY[policyLevel.value].label}`)
const policyDesc = computed(() =>
  `${CLASSIFY_LEVEL_POLICY[policyLevel.value].desc} 提交后进入「表权限审批台 · 分级变更审批」，审批通过才写入分级结果。`
)

const reasonRules = [
  { required: true, message: '请填写变更原因' },
  { minLength: 5, message: '变更原因不少于 5 个字，便于审批人判断' }
]

const handleOk = () => {
  if (!form.value || !props.field) return
  if (!form.value.business_belonging || !form.value.grade || !form.value.sensitivity_level ||
      !form.value.category_l1 || !form.value.category_l2 || !form.value.category_l3 || !form.value.category_l4) {
    Message.warning('请填写所有必填项')
    return
  }
  if (reason.value.trim().length < 5) {
    Message.warning('请填写变更原因（不少于 5 个字）')
    return
  }
  const diff = buildFieldDiff(props.field, form.value)
  if (!diff) {
    Message.info('未检测到字段变更')
    return
  }
  emit('submitted', { diffs: [diff], reason: reason.value.trim() })
}
</script>

<style scoped>
.policy-alert { margin-bottom: 16px; }
.diff-box { padding: 12px; background: var(--color-fill-1, #f7f8fa); border-radius: 6px; }
.diff-title { font-size: 12px; font-weight: 600; color: #4e5969; margin-bottom: 6px; }
.diff-row { display: flex; align-items: center; gap: 8px; font-size: 12px; line-height: 22px; }
.diff-dim { width: 88px; color: #86909c; flex: none; }
.diff-old { color: #86909c; text-decoration: line-through; }
.diff-arrow { color: #c9cdd4; font-size: 12px; }
.diff-new { color: #1d2129; font-weight: 500; }
.diff-empty { font-size: 12px; color: #86909c; }
</style>
