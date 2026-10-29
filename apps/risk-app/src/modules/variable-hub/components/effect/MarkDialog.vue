<template>
  <a-modal
    :visible="visible"
    :title="title"
    :ok-loading="submitting"
    :ok-button-props="{ disabled: !canSubmit }"
    width="520px"
    @ok="submit"
    @cancel="close"
    @update:visible="(v) => emit('update:visible', v)"
  >
    <a-alert type="info" class="mark-tip">
      标记为人工意见，仅记录在本演示环境，不改变跑批产出的「汰换 / 推荐」名单。
    </a-alert>

    <a-form :model="form" layout="vertical" class="mark-form">
      <a-form-item field="type" label="标记类型" required>
        <a-radio-group v-model="form.type" type="button" size="small">
          <a-radio v-for="opt in typeOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </a-radio>
        </a-radio-group>
      </a-form-item>

      <a-form-item field="reason" label="理由" required>
        <a-textarea
          v-model="form.reason"
          :auto-size="{ minRows: 3, maxRows: 6 }"
          :max-length="200"
          show-word-limit
          placeholder="必填：说明判断依据，例如覆盖率下滑、成本过高、口径待对齐"
        />
      </a-form-item>

      <div class="target-list">
        <div class="target-title">本次标记 {{ ids.length }} 个变量</div>
        <div v-if="preview.length" class="target-names">
          <a-tag v-for="n in preview" :key="n" size="small">{{ n }}</a-tag>
        </div>
      </div>
    </a-form>
  </a-modal>
</template>

<script setup>
/**
 * 变量标记弹窗（单个 / 批量共用）
 * 理由必填与「本次标记 N 个变量」文案均在本组件受控，
 * 落库统一走 effectOpinionStore.markVariables，组件不写 localStorage。
 */
import { computed, reactive, ref, watch } from 'vue'
import { Message } from '@arco-design/web-vue'
import { effectOpinionStore, MARK_TYPE_LABELS } from '@/modules/variable-hub/mock/effect-evaluation/opinion-store'

const props = defineProps({
  visible: { type: Boolean, default: false },
  /** 被标记的变量 ID 列表 */
  ids: { type: Array, default: () => [] },
  /** 被标记的变量名列表（仅用于弹窗预览，长度与 ids 对应） */
  names: { type: Array, default: () => [] }
})

const emit = defineEmits(['update:visible', 'done'])

const submitting = ref(false)
const form = reactive({ type: 'offline', reason: '' })

/** 类型选项来自 opinion-store 的 MARK_TYPE_LABELS，避免两处维护枚举 */
const typeOptions = computed(() =>
  Object.keys(MARK_TYPE_LABELS).map((k) => ({ value: k, label: MARK_TYPE_LABELS[k] }))
)

const title = computed(() =>
  props.ids.length > 1 ? `批量标记（${props.ids.length} 个变量）` : '标记该变量'
)

/** 弹窗最多预览 8 个名字，超出部分只在标题里体现数量 */
const preview = computed(() => props.names.slice(0, 8))

const canSubmit = computed(() => !!form.reason.trim())

/** 每次打开重置表单，避免上一次的理由残留 */
watch(
  () => props.visible,
  (v) => {
    if (v) {
      form.type = 'offline'
      form.reason = ''
    }
  }
)

/**
 * 提交标记：调用 store 并按返回条数提示
 */
function submit() {
  if (!canSubmit.value) {
    Message.warning('请填写标记理由')
    return
  }
  submitting.value = true
  const res = effectOpinionStore.markVariables(props.ids, form.type, form.reason)
  submitting.value = false
  if (res.marked > 0) {
    Message.success(`本次标记 ${res.marked} 个变量`)
    emit('done', res.marked)
    close()
  } else {
    Message.error('标记失败：理由不能为空')
  }
}

/** 关闭弹窗 */
function close() {
  emit('update:visible', false)
}
</script>

<style scoped>
.mark-tip {
  margin-bottom: 12px;
}
.mark-form :deep(.arco-form-item) {
  margin-bottom: 14px;
}
.target-list {
  padding: 10px 12px;
  background: var(--color-fill-1);
  border-radius: 4px;
}
.target-title {
  font-size: 12px;
  color: var(--color-text-3);
  margin-bottom: 6px;
}
.target-names {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-height: 92px;
  overflow-y: auto;
}
</style>
