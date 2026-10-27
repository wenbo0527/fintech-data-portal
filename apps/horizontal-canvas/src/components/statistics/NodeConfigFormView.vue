<template>
  <div class="node-config-form">
    <!-- 复用新建节点时的配置抽屉组件：同一份表单、同一套选项，只读内联渲染 -->
    <component
      :is="drawerComponent"
      v-if="drawerComponent"
      :key="node?.id"
      :visible="true"
      :node-data="nodeData"
      :read-only="true"
      @confirm="handleNoop"
      @cancel="handleNoop"
      @update:visible="handleNoop"
    />
    <a-empty v-else description="该节点无需额外配置" :image-style="{ height: '60px' }" />
  </div>
</template>

<script setup>
/*
用途：节点统计抽屉「配置」TAB 的内容（与新建节点时的配置表单保持一致）
说明：直接复用 components/task 下的配置抽屉组件，以内联只读方式渲染，
      保证字段、选项、文案与新建时完全一致，避免维护两份字段清单。
边界：只读，不写回画布；节点切换时按节点 ID 重建组件以刷新回显数据。
*/
import { computed } from 'vue'
import { CONFIG_DRAWER_REGISTRY } from '@/components/task/drawerRegistry.ts'
import { provideConfigInline } from '@/components/task/configInlineContext.js'

const props = defineProps({
  /** 聚焦节点 { id, name, type, config } */
  node: { type: Object, default: null }
})

// 声明内联模式：BaseDrawer 在该模式下不渲染抽屉外壳，只渲染表单
provideConfigInline()

/** 节点类型归一化（与配置抽屉注册表保持一致） */
const drawerKey = computed(() => {
  const t = String(props.node?.type || '')
  if (t === 'audience-split') return 'crowd-split'
  return t
})

/** 对应的配置抽屉组件；结束节点等无配置项的类型返回 null */
const drawerComponent = computed(() => CONFIG_DRAWER_REGISTRY[drawerKey.value] || null)

/**
 * 组装抽屉组件所需的节点数据
 * 入参：无（读取 props.node）
 * 返回：object —— 顶层平铺配置字段 + config 嵌套字段（兼容两种读取方式）
 * 说明：与打开配置抽屉时传入的载荷保持一致，因此回显结果与新建时相同
 */
const nodeData = computed(() => {
  const node = props.node || {}
  const cfg = { ...(node.config || {}) }
  // displayLines 仅为画布渲染注入的字段，不参与表单
  delete cfg.displayLines
  return {
    ...cfg,
    config: cfg,
    nodeName: cfg.nodeName || node.name || '',
    nodeId: node.id || '',
    nodeType: drawerKey.value,
    isNewNode: false
  }
})

/** 只读内联渲染，无需任何写回动作 */
function handleNoop() {}
</script>

<style scoped>
.node-config-form { display: flex; flex-direction: column; gap: 8px }
</style>
