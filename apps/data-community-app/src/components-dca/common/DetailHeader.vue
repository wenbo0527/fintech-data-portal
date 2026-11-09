<template>
  <div class="detail-header">
    <div class="left">
      <a-space>
        <a-button v-if="backEnabled" type="text" size="small" @click="onBack">
          返回
        </a-button>
        <h2 class="title">{{ title }}</h2>
        <StatusTag v-if="status && dictKey" :status="status" :dict-key="dictKey" />
        <slot name="extra-title" />
      </a-space>
    </div>
    <div class="right">
      <a-space>
        <template v-for="action in actions" :key="action.key">
          <a-button
            :type="action.type || 'primary'"
            :size="action.size || 'small'"
            :status="action.status"
            :disabled="action.disabled"
            @click="emit('action', action.key)"
          >
            <template v-if="action.icon" #icon>
              <component :is="action.icon" />
            </template>
            {{ action.label }}
          </a-button>
        </template>
        <slot name="extra-actions" />
      </a-space>
    </div>
  </div>
</template>

<script setup>
import StatusTag from './StatusTag.vue'
import { useRouter } from 'vue-router'

const props = defineProps({
  title: { type: String, required: true },
  status: { type: String, default: '' },
  dictKey: { type: String, default: '' },
  actions: { type: Array, default: () => [] },
  backEnabled: { type: Boolean, default: true }
})
const emit = defineEmits(['back', 'action'])
const router = useRouter()

const onBack = () => {
  emit('back')
  try {
    router.back()
  } catch (e) {}
}
</script>

<style scoped lang="less">
.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  .title {
    margin: 0;
    font-size: 20px;
    font-weight: 500;
  }
}
</style>
