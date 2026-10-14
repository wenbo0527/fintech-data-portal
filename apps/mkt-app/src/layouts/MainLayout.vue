<template>
  <a-layout class="mkt-layout">
    <!-- 顶部导航 -->
    <a-layout-header class="main-header">
      <div class="logo">
        <div class="logo-text">营销域 (MKT)</div>
      </div>
      <a-menu
        mode="horizontal"
        :selected-keys="[activeTopMenu]"
        @menu-item-click="handleTopMenuClick"
        class="top-menu"
      >
        <a-menu-item key="benefit">权益中心</a-menu-item>
        <a-menu-item key="touch">触达系统</a-menu-item>
        <a-menu-item key="customer">客群中心</a-menu-item>
        <a-menu-item key="call">人工电销</a-menu-item>
        <a-menu-item key="canvas">营销画布</a-menu-item>
        <a-menu-item key="marketing">营销任务</a-menu-item>
      </a-menu>
    </a-layout-header>

    <a-layout class="body-layout">
      <!-- 侧边栏：随顶部应用切换 -->
      <a-layout-sider
        class="main-sider"
        :width="220"
        :collapsible="true"
        :trigger="null"
        breakpoint="xl"
      >
        <a-menu
          :selected-keys="[activeSideMenu]"
          :default-open-keys="defaultOpenKeys"
          @menu-item-click="handleSideMenuClick"
          :auto-open="true"
        >
          <template v-for="item in currentSideMenus" :key="item.key">
            <a-sub-menu v-if="item.children" :key="item.key">
              <template #title>{{ item.title }}</template>
              <a-menu-item v-for="child in item.children" :key="child.key">{{ child.title }}</a-menu-item>
            </a-sub-menu>
            <a-menu-item v-else :key="item.key">{{ item.title }}</a-menu-item>
          </template>
        </a-menu>
      </a-layout-sider>

      <!-- 主内容区 -->
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

// ── 顶部应用菜单映射 ──────────────────────────────────────
const topMenuMap: Record<string, { key: string; path: string }> = {
  '/benefit':      { key: 'benefit',   path: '/benefit' },
  '/touch':        { key: 'touch',     path: '/touch' },
  '/customer':     { key: 'customer',  path: '/customer' },
  '/call':         { key: 'call',      path: '/call' },
  '/canvas':       { key: 'canvas',    path: '/canvas' },
  '/marketing':    { key: 'marketing', path: '/marketing' },
}

const activeTopMenu = ref('benefit')
const activeSideMenu = ref('')
const defaultOpenKeys = ref<string[]>([])

// ── 各应用侧边栏菜单配置 ──────────────────────────────────
// v1.2.9 修复: 5 父 14 子 (派蒙 19:19 方案 A) → 修正为 6 父 14 子 (v1.4 §1.2 8 菜单 - 跳移调整)
// 变更: 父3 补库存查询 / 父4 透视察出
const benefitMenus = [
  // 父0 🏠 权益首页 (v1.2.9 新增: 补 7 权益中心首项)
  { key: 'benefit-group-index', title: '权益首页', children: [
    { key: '/benefit',         title: '权益首页' },
  ]},
  // 父1 🎫 券管理 - 3 子 (库存入口归「库存与日志」组，避免重复)
  { key: 'benefit-group-coupon', title: '券管理', children: [
    { key: '/benefit/template',    title: '券模板管理' },
    { key: '/benefit/management', title: '券管理' },
    { key: '/benefit/package',    title: '券包管理' },
  ]},
  // 父2 ⚠️ 预警中心 - 4 子 (含 S403 库存预警配置)
  { key: 'benefit-group-alert', title: '预警中心', children: [
    { key: '/marketing/statistics/inventory/alert-config', title: '库存预警配置' },
    { key: '/marketing/alert/management',  title: '预警管理' },
    { key: '/marketing/alert/rules',       title: '预警规则' },
    { key: '/marketing/alert/history',      title: '预警历史' },
  ]},
  // 父3 📊 库存与日志 - 2 子 (v1.2.9 修复: 改名“库存与日志”对齐 v1.4 §1.2)
  { key: 'benefit-group-stats', title: '库存与日志', children: [
    { key: '/benefit/inventory',  title: '库存查询' },
    { key: '/benefit/logs',       title: '权益日志' },
  ]},
  // 父4 👁️ 透视 - 3 子 (v1.2.9 修复: 已删父4 透视组，3 children 已迁 customerMenus "人群管理"父 (v1.2.9-B 闭环 2026-06-24))
  // v1.2.9 修复: 删除"父4 透视"组 (3 子菜单 应归 customerMenus 客群中心) — 2026-06-24 PM 决策 B 简化版闭环
  // 父5 📋 规则 - 1 子
  { key: 'benefit-group-rules', title: '规则', children: [
    { key: '/marketing/global/rules', title: '全局规则' },
  ]},
]

const touchMenus = [
  { key: 'touch-overview', title: '触达首页', children: [
    { key: '/touch', title: '触达首页' },
  ]},
  { key: 'touch-group-policy', title: '策略管理', children: [
    { key: '/touch/policy/overview',        title: '策略数据概览' },
    { key: '/touch/policy/template',         title: '策略模板' },
    { key: '/touch/policy/template/create',  title: '创建策略模板' },
  ]},
  { key: 'touch-group-query', title: '触达查询', children: [
    { key: '/touch/query',                            title: '触达查询' },
    { key: '/touch/query/marketing-list',              title: '营销记录列表' },
    { key: '/touch/query/marketing-search',            title: '营销记录搜索' },
    { key: '/touch/query/detail',                      title: '触达详情' },
    { key: '/touch/query/sms-records',                 title: '短信发送记录' },
    { key: '/touch/query/ai-call-records',            title: 'AI呼叫记录' },
    { key: '/touch/query/ai-sms-vendor-records',      title: 'AI短信厂商记录' },
    { key: '/touch/query/manual-call-records',         title: '人工呼叫记录' },
    { key: '/touch/query/manual-sms-vendor-records',  title: '人工短信厂商记录' },
  ]},
  { key: 'touch-group-channel', title: '渠道管理', children: [
    { key: '/touch/channel',                           title: '渠道总览' },
    { key: '/touch/channel/sms-template',              title: '短信模板' },
    { key: '/touch/channel/sms-template/create',        title: '创建短信模板' },
    { key: '/touch/channel/ai-call-template',          title: 'AI外呼模板' },
    { key: '/touch/channel/manual-call-template',      title: '人工电销模板' },
    { key: '/touch/channel/vendors',                   title: '厂商管理' },
    { key: '/touch/channel/vendors/sms',              title: '短信厂商' },
    { key: '/touch/channel/vendors/ai',               title: 'AI厂商' },
    { key: '/touch/channel/blacklist',                  title: '黑名单管理' },
    { key: '/touch/channel/alert',                     title: '渠道预警' },
    { key: '/touch/channel/rate-limit',               title: '渠道限流' },
  ]},
  { key: 'touch-group-system', title: '系统配置', children: [
    { key: '/touch/system',             title: '系统概览' },
    { key: '/touch/system/dictionary',  title: '系统词典' },
    { key: '/touch/manual-sms',         title: '手动短信' },
  ]},
]

const customerMenus = [
  { key: 'customer-overview', title: '客群首页', children: [
    { key: '/customer', title: '客群首页' },
  ]},
  { key: 'customer-group-audience', title: '人群管理', children: [
    { key: '/marketing/exploration/customer-center/audience-system/audience-management', title: '人群列表' },
    { key: '/marketing/exploration/customer-center/audience-system/audience-create', title: '人群圈选' },
    { key: '/marketing/exploration/customer-center/audience-system/audience-detail', title: '客户画像' },
  ]},
  { key: 'customer-group-event', title: '事件中心', children: [
    { key: '/customer/event-center',         title: '事件首页' },
    { key: '/customer/event-management',     title: '事件管理' },
    { key: '/customer/virtual-events',        title: '虚拟事件' },
    { key: '/customer/kafka-datasource',      title: 'Kafka数据源' },
  ]},
  { key: 'customer-group-tag', title: '标签体系', children: [
    { key: '/customer/tag-management',         title: '标签管理' },
    { key: '/customer/tag-create',             title: '创建标签' },
    { key: '/customer/tag-system',             title: '标签系统' },
    { key: '/customer/tag-table',              title: '标签表管理' },
    { key: '/customer/attribute-management',   title: '属性管理' },
  ]},
]

const callMenus = [
  { key: 'call-overview', title: '数据看板', children: [
    { key: '/call', title: '数据看板' },
  ]},
  { key: 'call-group-task', title: '任务管理', children: [
    { key: '/call/task',   title: '任务列表' },
    { key: '/call/list',   title: '名单管理' },
    { key: '/call/record', title: '通话记录' },
  ]},
  { key: 'call-group-admin', title: '坐席管理', children: [
    { key: '/call/agent',    title: '坐席管理' },
    { key: '/call/team',     title: '班组管理' },
    { key: '/call/settings', title: '系统设置' },
  ]},
]

const canvasMenus = [
  { key: 'canvas-main', title: '横向画布', children: [
    { key: '/canvas', title: '横向画布' },
  ]},
]

const marketingMenus = [
  { key: 'marketing-overview', title: '任务中心', children: [
    { key: '/marketing/tasks/horizontal', title: '任务中心' },
  ]},
]

// ── 菜单切换逻辑 ──────────────────────────────────────────
const allMenus = {
  benefit:   benefitMenus,
  touch:     touchMenus,
  customer:  customerMenus,
  call:      callMenus,
  canvas:    canvasMenus,
  marketing: marketingMenus,
}

const topMenuDefaultPath: Record<string, string> = {
  benefit:   '/benefit/template',
  touch:     '/touch',
  customer:  '/customer',
  call:      '/call',
  canvas:    '/canvas',
  marketing: '/marketing/tasks/horizontal',
}

const currentSideMenus = computed(() => allMenus[activeTopMenu.value] || [])

function updateMenuState(path: string) {
  // 1. 判断顶部应用 (P0-侧边-#3 路径前缀优先级: 边界匹配, 避免 /benefit 误匹配 /benefitX)
  for (const [prefix, info] of Object.entries(topMenuMap)) {
    // 边界匹配: 完全相等 OR 以 prefix + '/' 开头
    if (path === prefix || path.startsWith(prefix + '/')) {
      activeTopMenu.value = info.key
      break
    }
  }

  // 2. 判断侧边栏选中
  activeSideMenu.value = path
  defaultOpenKeys.value = currentSideMenus.value
    .filter(m => m.children?.some(c => path.startsWith(c.key.split('/').slice(0, -1).join('/') + '/') || c.key === path || path.startsWith(c.key)))
    .map(m => m.key)
}

// 顶部菜单点击
function handleTopMenuClick(key: string) {
  activeTopMenu.value = key
  router.push(topMenuDefaultPath[key] || '/')
}

// 侧边栏菜单点击
function handleSideMenuClick(key: string) {
  if (!key) return
  // 必须传绝对路径: createWebHashHistory('/mkt/') 自身负责拼接 base。
  // 若去掉前导 '/', vue-router 4 会按「当前路由的目录」做相对解析,
  // 例: 当前 /benefit/template 时 push('benefit/package') → /benefit/benefit/package → No match found
  router.push(key.startsWith('/') ? key : `/${key}`)
}

watch(() => route.path, (path) => {
  updateMenuState(path)
}, { immediate: true })
</script>

<style scoped>
.mkt-layout {
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
  margin-right: 32px;
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
