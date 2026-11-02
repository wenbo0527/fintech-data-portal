<!--
  任务管理（一级入口 · Tab 容器）
  - 两 Tab：任务管理（评估 + 效果一张表）/ 脚本管理
  - 判定配置不再是一级 Tab：它是任务级配置，进「新建效果任务」与效果任务详情
  - Tab 状态写入 ?tab=，支持外部深链（如 /tasks?tab=scripts）；面板自己的筛选键不受影响
  - 面板用 v-if 只在激活时挂载，保证每次切回都从 store 重新取数
  - 执行实例的全域视图不在此页，见一级菜单「执行记录」（/runs）
-->
<template>
  <div class="task-center-page">
    <DmtPageHeader title="任务管理" subtitle="特征评估与效果运营的跑批任务统一在此管理；Python 计算口径在「脚本管理」维护。">
      <template #extra>
        <a-space>
          <a-button @click="router.push('/runs')">
            <template #icon><icon-history /></template>
            执行记录
          </a-button>
          <a-button @click="router.push('/variable-hub')">
            <template #icon><icon-home /></template>
            返回一体化总览
          </a-button>
        </a-space>
      </template>
    </DmtPageHeader>

    <a-tabs v-model:active-key="activeTab" type="rounded" size="medium" class="task-center-tabs">
      <a-tab-pane key="tasks" title="任务管理">
        <TaskListPanel v-if="activeTab === 'tasks'" />
      </a-tab-pane>
      <a-tab-pane key="scripts" title="脚本管理">
        <ScriptsPanel v-if="activeTab === 'scripts'" />
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import DmtPageHeader from '@/modules/variable-hub/components/PageHeader.vue'
import TaskListPanel from './TaskListPanel.vue'
import ScriptsPanel from './ScriptsPanel.vue'

type TabKey = 'tasks' | 'scripts'
const TABS: TabKey[] = ['tasks', 'scripts']

const route = useRoute()
const router = useRouter()

const normalize = (value: unknown): TabKey =>
  (TABS.includes(value as TabKey) ? value : 'tasks') as TabKey

// 首屏直接按 URL 初始化，避免先渲染默认 Tab 再切 Tab 造成面板反复挂载
const activeTab = ref<TabKey>(normalize(route.query.tab))

/** URL → Tab：兼容外部深链与旧路径 redirect 过来的场景 */
const syncFromRoute = () => {
  activeTab.value = normalize(route.query.tab)
}

// Tab → URL：用 replace 避免每次切 Tab 都堆一条历史记录
watch(activeTab, (tab) => {
  if (normalize(route.query.tab) !== tab) {
    const query = { ...route.query }
    delete query.taskId
    query.tab = tab
    router.replace({ path: '/tasks', query })
  }
})

watch(() => route.query.tab, syncFromRoute)
</script>

<style scoped>
.task-center-page {
  min-height: calc(100vh - 88px);
  background: #f7f8fa;
}

.task-center-tabs {
  background: var(--color-bg-2);
  border-radius: 8px;
  padding: 0 16px 16px;
}

.task-center-tabs :deep(.arco-tabs-content) {
  padding-top: 16px;
}
</style>
