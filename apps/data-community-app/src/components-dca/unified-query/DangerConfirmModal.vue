<template>
  <a-modal
    :visible="visible"
    :title="title"
    :width="480"
    :footer="false"
    :mask-closable="false"
    @cancel="close"
  >
    <a-alert type="error" show-icon class="danger-tip">{{ description }}</a-alert>

    <div v-if="items.length" class="danger-list">
      <div v-for="item in items" :key="item" class="danger-list__item">
        <icon-exclamation-circle />
        <span>{{ item }}</span>
      </div>
    </div>

    <div class="danger-confirm">
      <div class="danger-confirm__label">
        请输入 <code>{{ keyword }}</code> 以确认:
      </div>
      <a-input
        v-model="input"
        :placeholder="keyword"
        allow-clear
        @press-enter="submit"
      />
    </div>

    <div class="modal-foot">
      <a-button @click="close">取消</a-button>
      <a-button
        type="primary"
        status="danger"
        :disabled="input.trim() !== keyword"
        @click="submit"
      >{{ okText }}</a-button>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
/**
 * 危险操作二次确认(输入确认词)
 *
 * 回收账号、吊销密钥等不可恢复动作,必须手工输入确认词才能提交,
 * 避免误点造成不可逆损失。
 */
import { ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  visible: boolean
  title: string
  description: string
  /** 需要用户逐字输入的确认词 */
  keyword?: string
  okText?: string
  /** 额外的影响清单(可选) */
  items?: string[]
}>(), {
  keyword: '确认',
  okText: '确定',
  items: () => []
})

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'confirm'): void
}>()

const input = ref('')

watch(() => props.visible, visible => {
  if (visible) input.value = ''
})

function close() {
  emit('update:visible', false)
}

function submit() {
  if (input.value.trim() !== props.keyword) return
  emit('confirm')
  close()
}
</script>

<style lang="scss" scoped>
.danger-tip {
  margin-bottom: 12px;
}

.danger-list {
  max-height: 150px;
  margin-bottom: 12px;
  padding: 8px 12px;
  overflow-y: auto;
  border: 1px solid var(--color-border-2);
  border-radius: 6px;
  background: var(--color-fill-1);

  &__item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    line-height: 1.9;
    color: var(--color-text-2);

    .arco-icon {
      color: rgb(var(--danger-6));
    }
  }
}

.danger-confirm {
  &__label {
    margin-bottom: 8px;
    font-size: 13px;
    color: var(--color-text-2);

    code {
      padding: 0 4px;
      border-radius: 3px;
      background: var(--color-fill-2);
      color: rgb(var(--danger-6));
    }
  }
}

.modal-foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 20px;
}
</style>