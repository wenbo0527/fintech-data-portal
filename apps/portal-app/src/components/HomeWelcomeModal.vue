<template>
  <a-modal
    v-model:visible="visibleProxy"
    :title="isNewUser ? '欢迎加入数据社区' : '欢迎回来'"
    width="640px"
    :mask-closable="true"
  >
    <div class="welcome-modal-body">
      <a-typography-title :heading="5">
        {{ isNewUser ? '快速开始' : '最新动态' }}
      </a-typography-title>
      <a-typography-paragraph>
        {{ isNewUser ? '为你准备了入门指引与常用入口，帮助你快速上手。' : '查看社区最新公告与常用入口。' }}
      </a-typography-paragraph>
      <a-space>
        <a-button type="primary" @click="handlePrimary">{{ isNewUser ? '开始引导' : '查看公告' }}</a-button>
        <a-button @click="close">稍后再说</a-button>
      </a-space>
    </div>
  </a-modal>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  isNewUser: { type: Boolean, default: false }
})
const emit = defineEmits(['update:visible'])

const visibleProxy = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

const close = () => emit('update:visible', false)
const handlePrimary = () => emit('update:visible', false)
</script>

<style scoped>
.welcome-modal-body { padding: 8px 0; }
</style>
