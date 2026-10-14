<template>
  <a-card class="tl-card">
    <template #title>
      <div class="tl-header">
        <span>血缘</span>
        <a-space>
          <a-tag size="small" color="arcoblue">上游 {{ upstream.length }}</a-tag>
          <a-tag size="small" color="purple">下游 {{ downstream.length }}</a-tag>
        </a-space>
      </div>
    </template>

    <div class="tl-cols">
      <div class="tl-col">
        <div class="tl-head">上游来源（{{ upstream.length }}）</div>
        <div v-if="!upstream.length" class="tl-empty">未登记上游血缘</div>
        <div
          v-for="n in upstream"
          :key="'up-' + n.name"
          class="tl-node"
          :class="{ 'is-clickable': n.resolved }"
          @click="onNode(n)"
        >
          <div class="tl-main">
            <code>{{ n.name }}</code>
            <span v-if="n.cnName" class="tl-cn">{{ n.cnName }}</span>
          </div>
          <a-tag size="small" :color="n.resolved ? 'arcoblue' : 'gray'">
            {{ n.resolved ? '在目录' : '不在目录' }}
          </a-tag>
        </div>
      </div>

      <div class="tl-col">
        <div class="tl-head">下游去向（{{ downstream.length }}）</div>
        <div v-if="!downstream.length" class="tl-empty">未登记下游血缘</div>
        <div
          v-for="n in downstream"
          :key="'down-' + n.name"
          class="tl-node"
          :class="{ 'is-clickable': n.resolved }"
          @click="onNode(n)"
        >
          <div class="tl-main">
            <code>{{ n.name }}</code>
            <span v-if="n.cnName" class="tl-cn">{{ n.cnName }}</span>
          </div>
          <a-tag size="small" :color="n.resolved ? 'arcoblue' : 'gray'">
            {{ n.resolved ? '在目录' : '不在目录' }}
          </a-tag>
        </div>
      </div>
    </div>

    <div class="tl-tip">
      <icon-info-circle />
      <slot name="tip">纯列表视图；「在目录」节点可点击跳转对应表详情。演示 mock 血缘，非真实链路。</slot>
    </div>
  </a-card>
</template>

<script setup lang="ts">
import { IconInfoCircle } from '@arco-design/web-vue/es/icon'

/** 血缘节点（与 table-detail/index.vue 的 LineageNode 结构对齐，精简为 mock 展示所需字段） */
export interface LineageNode {
  name: string
  cnName?: string
  /** 是否能在表目录中解析到（决定可点击与标签色） */
  resolved?: boolean
}

const props = defineProps<{
  upstream: LineageNode[]
  downstream: LineageNode[]
}>()

const emit = defineEmits<{ (e: 'node-click', node: LineageNode): void }>()

function onNode(n: LineageNode) {
  if (n.resolved) emit('node-click', n)
}

// 模板中引用 props 变量名（避免未使用告警）
void props
</script>

<style scoped>
.tl-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
.tl-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 960px) { .tl-cols { grid-template-columns: 1fr; } }
.tl-head { font-size: 13px; font-weight: 600; color: var(--dca-text-secondary); margin-bottom: 8px; }
.tl-empty { font-size: 13px; color: var(--dca-text-tertiary); padding: 8px 0; }
.tl-node {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding: 8px 12px; border: 1px solid var(--dca-border-default); border-radius: 6px;
  margin-bottom: 8px; background: var(--dca-bg-page-alt); transition: border-color 0.15s, box-shadow 0.15s;
}
.tl-node.is-clickable { cursor: pointer; }
.tl-node.is-clickable:hover { border-color: rgb(var(--arcoblue-6)); box-shadow: var(--dca-shadow-sm); }
.tl-main { display: flex; align-items: baseline; gap: 8px; min-width: 0; flex-wrap: wrap; }
.tl-main code { font-size: 13px; color: var(--dca-text-primary); word-break: break-all; }
.tl-cn { font-size: 12px; color: var(--dca-text-tertiary); }
.tl-tip {
  display: flex; align-items: center; gap: 6px; margin-top: 8px;
  color: var(--dca-text-secondary); font-size: 13px;
  background: var(--dca-bg-page-alt); padding: 10px 14px; border-radius: 6px;
}
</style>
