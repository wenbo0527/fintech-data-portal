<template>
  <a-layout class="main-layout">
    <a-layout-header class="main-header">
      <div class="logo">
        <div class="logo-text">数字风险</div>
      </div>
      <a-menu
        mode="horizontal"
        :selected-keys="topSelectedKeys"
        @menu-item-click="handleTopMenuClick"
        class="top-menu"
      >
        <a-menu-item key="riskData">风险数据生命周期</a-menu-item>
        <a-menu-item key="analysis">离线模型分析</a-menu-item>
      </a-menu>
    </a-layout-header>
    <a-layout class="body-layout">
      <a-layout-sider class="main-sider" :width="240" collapsible breakpoint="xl">
        <!-- 风险数据生命周期 Tab -->
        <a-menu
          v-if="activeTopMenu === 'riskData'"
          :selected-keys="sideSelectedKeys"
          :open-keys="sideOpenKeys"
          :auto-open="false"
          @menu-item-click="handleSideMenuClick"
          @sub-menu-click="handleSubMenuClick"
        >
          <!-- 风险要素 -->
          <a-sub-menu key="risk-factor-group">
            <template #title>风险要素</template>
            <a-menu-item key="/variable-hub">一体化总览</a-menu-item>
            <a-menu-item key="/variable-management">特征台账</a-menu-item>
            <a-menu-item key="/explore/map">特征全景</a-menu-item>
            <a-menu-item key="/evaluation/tasks">评估任务中心</a-menu-item>
          </a-sub-menu>
          <a-sub-menu key="risk-factor-explore">
            <template #title>探索过程</template>
            <a-menu-item key="/explore/topics">探索课题</a-menu-item>
          </a-sub-menu>
          <a-sub-menu key="risk-factor-config">
            <template #title>模块配置</template>
            <a-menu-item key="/explore/taxonomy">探索分类管理</a-menu-item>
          </a-sub-menu>

          <!-- 外数生命周期管理 -->
          <a-sub-menu key="external-data-core-group">
            <template #title>外数生命周期</template>
            <a-menu-item key="/variable-hub/external-data/lifecycle">生命周期总览</a-menu-item>
            <a-menu-item key="/variable-hub/external-data/archive">外数档案管理</a-menu-item>
            <a-menu-item key="/variable-hub/external-data/evaluation">外数评估中心</a-menu-item>
          </a-sub-menu>
          <a-sub-menu key="external-data-service-group">
            <template #title>外数服务管理</template>
            <a-menu-item key="/variable-hub/external-data/service-scene">服务场景入口</a-menu-item>
            <a-menu-item key="/variable-hub/external-data/service">服务任务列表</a-menu-item>
            <a-menu-item key="/variable-hub/external-data/sample-preparation">样本表准备</a-menu-item>
            <a-menu-item key="/variable-hub/external-data/validation-template">服务校验模版管理</a-menu-item>
          </a-sub-menu>
          <a-sub-menu key="external-data-budget-group">
            <template #title>预算与合同</template>
            <a-menu-item key="/budget/overview">预算总览</a-menu-item>
            <a-menu-item key="/budget/list">预算列表</a-menu-item>
            <a-menu-item key="/budget/monitor">预算监控</a-menu-item>
            <a-menu-item key="/budget/contracts">合同管理</a-menu-item>
            <a-menu-item key="/budget/sign-reports">签报管理</a-menu-item>
            <a-menu-item key="/budget/settlement">结算管理</a-menu-item>
          </a-sub-menu>
          <a-sub-menu key="external-data-accompany-group">
            <template #title>陪跑计划</template>
            <a-menu-item key="/accompany">陪跑列表</a-menu-item>
            <a-menu-item key="/accompany/create">创建陪跑</a-menu-item>
            <a-menu-item key="/accompany/result">陪跑结果</a-menu-item>
          </a-sub-menu>
        </a-menu>

        <!-- 离线模型分析 Tab -->
        <a-menu
          v-else
          :selected-keys="sideSelectedKeys"
          :open-keys="sideOpenKeys"
          :auto-open="false"
          @menu-item-click="handleSideMenuClick"
        >
          <a-menu-item key="/model-offline-analysis/feature-center">特征中心</a-menu-item>
          <a-menu-item key="/model-offline-analysis/model-register">模型注册</a-menu-item>
          <a-menu-item key="/model-offline-analysis/model-backtrack">模型回溯</a-menu-item>
          <a-menu-item key="/model-offline-analysis/task-management">任务管理</a-menu-item>
          <a-menu-item key="/model-offline-analysis/model-evaluation">模型评估</a-menu-item>
        </a-menu>
      </a-layout-sider>
      <a-layout-content class="main-content">
        <div class="content-wrapper">
          <router-view />
        </div>
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const activeTopMenu = ref('riskData')
const activeSideMenu = ref<string>('')
const openSubKeys = ref<string[]>([
  'risk-factor-group',
  'external-data-core-group',
  'external-data-service-group',
  'external-data-budget-group',
  'external-data-accompany-group'
])

const topSelectedKeys = computed(() => [activeTopMenu.value])
const sideSelectedKeys = computed(() => (activeSideMenu.value ? [activeSideMenu.value] : []))
const sideOpenKeys = computed(() => openSubKeys.value)

watch(() => route.path, (path) => {
  updateMenuState(path)
}, { immediate: true })

function updateMenuState(path: string) {
  if (path.startsWith('/model-offline-analysis')) {
    activeTopMenu.value = 'analysis'
  } else {
    activeTopMenu.value = 'riskData'
  }

  // 风险要素
  if (path === '/variable-hub' || path === '/variable-hub/') activeSideMenu.value = '/variable-hub'
  else if (path.startsWith('/variable-management')) activeSideMenu.value = '/variable-management'
  else if (path.startsWith('/explore/topics')) activeSideMenu.value = '/explore/topics'
  else if (path.startsWith('/explore/taxonomy')) activeSideMenu.value = '/explore/taxonomy'
  else if (path.startsWith('/explore/map')) activeSideMenu.value = '/explore/map'
  else if (path.startsWith('/evaluation/')) activeSideMenu.value = '/evaluation/tasks'
  // 外数
  else if (path.startsWith('/variable-hub/external-data/lifecycle')) activeSideMenu.value = '/variable-hub/external-data/lifecycle'
  else if (path.startsWith('/variable-hub/external-data/archive')) activeSideMenu.value = '/variable-hub/external-data/archive'
  else if (path.startsWith('/variable-hub/external-data/evaluation')) activeSideMenu.value = '/variable-hub/external-data/evaluation'
  else if (path.startsWith('/variable-hub/external-data/service-scene')) activeSideMenu.value = '/variable-hub/external-data/service-scene'
  else if (path.startsWith('/variable-hub/external-data/service')) activeSideMenu.value = '/variable-hub/external-data/service'
  else if (path.startsWith('/variable-hub/external-data/sample-preparation')) activeSideMenu.value = '/variable-hub/external-data/sample-preparation'
  else if (path.startsWith('/variable-hub/external-data/validation-template')) activeSideMenu.value = '/variable-hub/external-data/validation-template'
  // 预算
  else if (path.startsWith('/budget/overview')) activeSideMenu.value = '/budget/overview'
  else if (path.startsWith('/budget/list')) activeSideMenu.value = '/budget/list'
  else if (path.startsWith('/budget/monitor')) activeSideMenu.value = '/budget/monitor'
  else if (path.startsWith('/budget/contracts')) activeSideMenu.value = '/budget/contracts'
  else if (path.startsWith('/budget/sign-reports')) activeSideMenu.value = '/budget/sign-reports'
  else if (path.startsWith('/budget/settlement')) activeSideMenu.value = '/budget/settlement'
  // 陪跑
  else if (path.startsWith('/accompany/create')) activeSideMenu.value = '/accompany/create'
  else if (path.startsWith('/accompany/result')) activeSideMenu.value = '/accompany/result'
  else if (path.startsWith('/accompany')) activeSideMenu.value = '/accompany'
  // 离线模型
  else if (path.startsWith('/model-offline-analysis/feature-center')) activeSideMenu.value = '/model-offline-analysis/feature-center'
  else if (path.startsWith('/model-offline-analysis/model-register')) activeSideMenu.value = '/model-offline-analysis/model-register'
  else if (path.startsWith('/model-offline-analysis/model-backtrack')) activeSideMenu.value = '/model-offline-analysis/model-backtrack'
  else if (path.startsWith('/model-offline-analysis/task-management')) activeSideMenu.value = '/model-offline-analysis/task-management'
  else if (path.startsWith('/model-offline-analysis/model-evaluation')) activeSideMenu.value = '/model-offline-analysis/model-evaluation'
  else activeSideMenu.value = ''
}

const handleTopMenuClick = (key: string) => {
  activeTopMenu.value = key
  if (key === 'riskData') {
    router.push('/variable-hub')
  } else if (key === 'analysis') {
    router.push('/model-offline-analysis/feature-center')
  }
}

const handleSideMenuClick = (key: string) => {
  if (!key || !key.startsWith('/')) return
  router.push(key)
}

const handleSubMenuClick = (key: string) => {
  if (openSubKeys.value.includes(key)) {
    openSubKeys.value = openSubKeys.value.filter((k) => k !== key)
  } else {
    openSubKeys.value = [...openSubKeys.value, key]
  }
}
</script>

<style scoped>
.main-layout {
  height: 100vh;
  display: flex;
  flex-direction: column;
}
.main-header {
  height: 60px;
  background: var(--color-bg-2);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  padding: 0 20px;
  flex-shrink: 0;
}
.logo {
  margin-right: 40px;
  display: flex;
  align-items: center;
}
.logo-text {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-1);
}
.top-menu {
  flex: 1;
}
.body-layout {
  flex: 1;
  overflow: hidden;
  display: flex;
}
.main-sider {
  height: 100%;
  border-right: 1px solid var(--color-border);
  background: var(--color-bg-2);
}
.main-content {
  flex: 1;
  background: var(--color-fill-2);
  overflow: auto;
  padding: 16px;
  height: 100%;
}
.content-wrapper {
  background: var(--color-bg-2);
  min-height: 100%;
  padding: 20px;
  border-radius: 4px;
}
</style>
