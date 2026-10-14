<template>
  <div class="query-view">
    <div class="query-header">
      <div class="header-left">
        <span class="page-title">消金语义底座 · Agent问答</span>
      </div>
      <div class="header-right">
        <a-button
          status="danger"
          @click="handleClear"
        >
          <template #icon><icon-delete /></template>
          清空对话
        </a-button>
      </div>
    </div>
    <div class="query-body">
      <AgentChatPanel />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useAgentStore } from '@/stores/agent'
import AgentChatPanel from '@/components/AgentChatPanel.vue'

const agentStore = useAgentStore()

onMounted(() => {
  // messages为空时显示欢迎语（AgentChatPanel内部已处理空状态）
  if (agentStore.messages.length === 0) {
    // 欢迎语由 AgentChatPanel 的 welcome-hint 展示
  }
})

function handleClear() {
  agentStore.clearMessages()
}
</script>

<style scoped lang="scss">
.query-view {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.query-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg-light);

  .page-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--color-text);
  }
}

.query-body {
  flex: 1;
  overflow: hidden;
}
</style>
