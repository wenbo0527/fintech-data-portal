<template>
  <div class="semantic-app-root">
    <a-layout>
      <a-layout-sider :width="220" :collapsible="false" class="app-sider">
        <div class="app-logo">
          <icon-search />
          <span>语义底座</span>
        </div>
        <a-menu
          :selected-keys="[activeMenu]"
          @menu-item-click="onMenuClick"
        >
          <a-menu-item key="query">
            <icon-message /> Agent问答
          </a-menu-item>
          <a-menu-item key="metric">
            <icon-bookmark /> 指标定义
          </a-menu-item>
          <a-menu-item key="metadata-map">
            <icon-link /> 元数据映射
          </a-menu-item>
          <a-menu-item key="knowledge">
            <icon-mind-mapping /> 业务知识
          </a-menu-item>
          <a-menu-item key="mock-data">
            <icon-database /> Mock数据
          </a-menu-item>
        </a-menu>
      </a-layout-sider>
      <a-layout-content class="app-content">
        <router-view />
      </a-layout-content>
    </a-layout>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const activeMenu = computed(() => {
  const name = route.name as string || ''
  return name.replace('semantic-', '')
})

function onMenuClick(key: string) {
  router.push({ name: `semantic-${key}` })
}
</script>
