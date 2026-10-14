<template>
  <div id="semantic-app">
    <router-view />
  </div>
</template>

<script setup lang="ts">
// semantic-app 根组件
// 仅作为路由出口容器；侧边栏布局位于 layouts/AppLayout.vue（路由 "/" 的组件）
// 与 mkt-app / dex-app 等子应用约定一致，避免双重渲染
</script>

<style>
#semantic-app {
  width: 100%;
  height: 100%;
}
</style>
