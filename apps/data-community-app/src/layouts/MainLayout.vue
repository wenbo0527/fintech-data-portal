<template>
  <a-layout class="dca-layout">
    <!-- 顶部导航 -->
    <a-layout-header class="main-header">
      <!-- Logo + App 切换器 -->
      <div class="logo-area">
        <div class="logo">数据社区</div>
        <a-dropdown trigger="click">
          <a-button type="text" class="app-switcher">
            <template #icon><icon-swap /></template>
            切换 App
            <template #suffix><icon-down /></template>
          </a-button>
          <template #content>
            <a-doption @click="goToApp('workbench')">
              <strong>数据社区 (DCA)</strong>
              <div style="font-size: 12px; color: #86909c">数据发现 + 数据管理 + 数据探索</div>
            </a-doption>
            <a-doption @click="goToApp('mkt')">
              <strong>营销域 (MKT)</strong>
              <div style="font-size: 12px; color: #86909c">触达 + 客群 + 券 + 营销</div>
            </a-doption>
          </template>
        </a-dropdown>
      </div>

      <!-- 主菜单(三大模块 + 工作台) -->
      <a-menu
        mode="horizontal"
        :selected-keys="[activeTopMenu]"
        @menu-item-click="handleTopMenuClick"
        class="top-menu"
      >
        <a-menu-item key="workbench">工作台</a-menu-item>
        <a-menu-item key="discovery">数据发现</a-menu-item>
        <a-menu-item key="management">数据管理</a-menu-item>
        <a-menu-item key="exploration">数据探索</a-menu-item>
      </a-menu>

      <!-- 右侧:角色切换 + 用户菜单 -->
      <div class="header-right">
        <a-tooltip content="切换角色">
          <a-button type="text" @click="showRoleSwitcher = true">
            <template #icon><icon-user /></template>
            {{ currentRoleLabel }}
          </a-button>
        </a-tooltip>

        <a-tooltip content="通知">
          <a-button type="text" @click="goToNotifications">
            <template #icon><icon-notification /></template>
            <a-badge v-if="unreadCount > 0" :count="unreadCount" :max-count="9" />
          </a-button>
        </a-tooltip>

        <a-dropdown trigger="click">
          <a-button type="text">
            <a-avatar :size="28" :style="avatarStyle">{{ currentUser.name.charAt(0) }}</a-avatar>
            <span style="margin-left: 8px">{{ currentUser.name }}</span>
            <template #suffix><icon-down /></template>
          </a-button>
          <template #content>
            <a-doption @click="goToProfile">
              <template #icon><icon-user /></template>个人信息
            </a-doption>
            <a-doption @click="showRoleSwitcher = true">
              <template #icon><icon-swap /></template>切换角色
            </a-doption>
            <a-divider style="margin: 4px 0" />
            <a-doption>
              <template #icon><icon-export /></template>退出登录
            </a-doption>
          </template>
        </a-dropdown>
      </div>
    </a-layout-header>

    <a-layout class="body-layout">
      <!-- 左侧菜单:随顶部模块切换 -->
      <a-layout-sider
        class="main-sider"
        :width="220"
        :collapsible="true"
        :trigger="null"
        breakpoint="xl"
      >
        <a-menu
          :selected-keys="sideSelectedKeys"
          :default-open-keys="sideDefaultOpenKeys"
          @menu-item-click="handleSideMenuClick"
        >
          <template v-for="item in currentSideMenusStable" :key="item.key">
            <a-sub-menu v-if="item.children" :key="item.key">
              <template #title>{{ item.title }}</template>
              <template v-for="child in item.children" :key="child.key">
                <!-- 三级菜单:有子项时渲染嵌套 a-sub-menu -->
                <a-sub-menu v-if="child.children" :key="child.key">
                  <template #title>{{ child.title }}</template>
                  <a-menu-item v-for="grandchild in child.children" :key="grandchild.key">{{ grandchild.title }}</a-menu-item>
                </a-sub-menu>
                <!-- 二级菜单:无子项时直接渲染 a-menu-item -->
                <a-menu-item v-else :key="child.key">{{ child.title }}</a-menu-item>
              </template>
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

    <!-- 角色切换弹窗 -->
    <a-modal
      v-model:visible="showRoleSwitcher"
      title="切换角色"
      :width="520"
      @ok="confirmRoleSwitch"
    >
      <p style="color: #86909c; margin-bottom: 16px">不同角色看到的菜单和权限不同,切换后立即生效。</p>
      <a-radio-group v-model="pendingRole" direction="vertical" style="width: 100%">
        <a-radio v-for="r in roles" :key="r.code" :value="r.code" style="display: block; padding: 8px 0;">
          <div style="display: flex; align-items: center; gap: 8px">
            <a-avatar :size="32" :style="{ background: r.color }">{{ r.label.charAt(0) }}</a-avatar>
            <div>
              <strong>{{ r.label }}</strong>
              <div style="font-size: 12px; color: #86909c">{{ r.description }}</div>
            </div>
          </div>
        </a-radio>
      </a-radio-group>
    </a-modal>
  </a-layout>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { useRoleStore } from '../stores-dca/role'
import { ROLE_DEFINITIONS, type UserRole } from '@/types-dca/roles'

const router = useRouter()
const route = useRoute()
const roleStore = useRoleStore()

// ── 角色 ──────────────────────────────────────
const showRoleSwitcher = ref(false)
const pendingRole = ref<UserRole>(roleStore.currentRole)
// 角色列表:必须和 types-dca/roles.ts 的 ROLE_DEFINITIONS 一一对应,
//   否则 roleStore.switchRole(code) 会因为 code 不在 ROLE_DEFINITIONS 里报「无效角色」
// 这里直接复用 store 中计算的 currentRoleDef.label,不维护重复数据,避免漂移
const currentRoleLabel = computed(() => {
  return roleStore.currentRoleDef?.label || '角色未识别'
})

/**
 * 角色切换弹窗的候选项
 * 颜色 / 头像 / 部门 取自 ROLE_DEFINITIONS(code 必须与 UserRole 联合类型精确一致)
 *   —— 改用直接从 ROLE_DEFINITIONS 派生避免漂移
 */
const roles = ref(
  (Object.entries(ROLE_DEFINITIONS) as Array<[UserRole, typeof ROLE_DEFINITIONS[UserRole]]>)
    .map(([code, def]) => ({
      code,
      label: def.label,
      description: def.description || def.department,
      color: def.color
    }))
)

function confirmRoleSwitch() {
  // role store 暴露的切换接口叫 switchRole(不是 setRole)
  roleStore.switchRole(pendingRole.value)
  showRoleSwitcher.value = false
  Message.success(`已切换到: ${currentRoleLabel.value}`)
}

// ── 用户信息 ──────────────────────────────────
const currentUser = ref({ name: '王运营', email: 'wangyy@company.com' })
const unreadCount = ref(5)
const avatarStyle = { background: '#165dff' }

// ── 顶部主菜单(工作台 + 三大模块) ──────────────
const topMenuMap: Record<string, { key: string; path: string }> = {
  'discovery':   { key: 'discovery',   path: '/discovery' },
  'management':  { key: 'management',  path: '/management' },
  'exploration': { key: 'exploration', path: '/exploration' },
  'workbench':   { key: 'workbench',   path: '/workbench' },
}

const activeTopMenu = ref('workbench')
const activeSideMenu = ref('')
const defaultOpenKeys = ref<string[]>([])
// 用 computed 包装避免每次模板渲染都创建新 array,触发 arco menu 内部 watch
const sideSelectedKeys = computed<string[]>(() => activeSideMenu.value ? [activeSideMenu.value] : [])
const sideDefaultOpenKeys = computed<string[]>(() => defaultOpenKeys.value)

// ── 数据发现菜单(按 资源/资产/要素 三分法重构)───────
const discoveryMenus = [
  // 顶层入口
  { key: 'discovery/overview', title: '数据总览' },
  { key: 'discovery/search', title: '数据搜索' },
  { key: 'discovery/favorites', title: '我的关注' },

  // 数据资源(原始数据来源,排除「外部数据」「征信查询」,后者属于数据要素)
  { key: 'discovery-group-resource', title: '📥 数据资源', children: [
    { key: 'discovery/data-resources', title: '业务系统' },
    { key: 'discovery/data-resources/files', title: '文件导入' },
    { key: 'discovery/data-resources/logs', title: '日志数据' },
    { key: 'discovery/data-resources/realtime', title: '实时接入' },
  ]},

  // 数据资产(治理后) — 平台层面的资产台账
  // 客户 360 已移出,属于「数据探索」侧的分析视图
  { key: 'discovery-group-assets', title: '🏛️ 数据资产', children: [
    { key: 'discovery/asset-catalog', title: '资产目录' },
  ]},

  // 数据要素(高价值业务形态 — 指标 / 特征 / 特征 / 外数 4 个核心入口)
  // 其它能力(征信查询 / 统一指标 / 指标看板 / 地铁图)已并入相应字典页或工作台快捷入口
  { key: 'discovery-group-element', title: '✨ 数据要素', children: [
    { key: 'discovery/indicator-dict', title: '指标字典' },
    { key: 'discovery/variable-dict', title: '特征字典' },
    { key: 'discovery/feature-dict', title: '特征字典' },
    { key: 'discovery/external', title: '外部数据' },
  ]},

  // 运营工具(实际是数据治理 + 监管 + API,跨三大类)
  { key: 'discovery-group-ops', title: '🛠 治理运营', children: [
    { key: 'discovery/lineage', title: '全链路血缘' },
    { key: 'discovery/api-market', title: 'API 市场' },
  ]},
]

// ── 数据管理菜单(2026-08-11 重构:二级分组+三级归类)──
const managementMenus = [
  { key: 'management-group-home', title: '首页', children: [
    { key: 'management', title: '数据管理' },
  ]},
  { key: 'management-group-mine', title: '我的', children: [
    { key: 'management/notifications', title: '通知中心' },
    { key: 'management/notifications/categories', title: '通知分类' },
  ]},
  // ── 元数据管理(数据源→采集→上下架→标签 全生命周期)──
  // 上下架管理与「数据发现」三分法对应:
  //   数据资源 ↔ 业务系统/文件/日志/实时 (discovery/data-resources)
  //   数据资产 ↔ 资产目录/数据表 (discovery/asset-catalog)
  //   数据要素 ↔ 指标/特征/特征/外数/API (discovery/indicator-dict 等)
  { key: 'management-group-metadata', title: '元数据管理', children: [
    { key: 'management/metadata-sub-basic', title: '元数据基础', children: [
      { key: 'management/metadata', title: '元数据总览' },
      { key: 'management/metadata/modeling', title: '元数据建模' },
    ]},
    { key: 'management/metadata-sub-collect', title: '采集管理', children: [
      { key: 'management/asset-management/basic-management/data-source', title: '数据源管理' },
      { key: 'management/metadata/task', title: '采集任务' },
    ]},
    { key: 'management/metadata-sub-shelf', title: '上下架管理', children: [
      // ↔ 数据发现·数据资源(业务系统/文件/日志/实时)
      { key: 'management/asset-management/listing-management/data-source', title: '数据资源上下架' },
      // ↔ 数据发现·数据资产(资产目录/数据表)
      { key: 'management/asset-management/listing-management/asset-management', title: '数据资产上下架' },
      // ↔ 数据发现·数据要素(指标/特征/特征/外数/API)
      { key: 'management/shelf/element-shelf', title: '数据要素上下架' },
      // 指标管理属于数据要素范畴,归入上下架管理
      { key: 'management/asset-management/listing-management/metric-management', title: '指标管理' },
      { key: 'management/shelf/batch-shelf', title: '批量上下架' },
    ]},
    // 标签管理(对资产打标,属于元数据管理范畴)
    { key: 'management/metadata-sub-tag', title: '标签管理', children: [
      { key: 'management/asset-management/basic-management/tag-management', title: '标签管理' },
      { key: 'management/asset-management/asset-tags', title: '资产标签' },
      { key: 'management/asset-management/tag-group', title: '标签分组' },
    ]},
  ]},
  // ── 数据治理(标准+分级分类+业务概念)──
  { key: 'management-group-governance', title: '数据治理', children: [
    { key: 'management/governance-sub-std', title: '数据标准', children: [
      { key: 'management/data-standard/standards', title: '数据标准' },
      { key: 'management/data-standard/domains', title: '数据域管理' },
      { key: 'management/data-standard/codes', title: '标准代码' },
      { key: 'management/data-standard/words', title: '标准单词' },
      { key: 'management/data-standard/audit', title: '标准稽核' },
    ]},
    { key: 'management/governance-sub-classify', title: '数据分级分类', children: [
      { key: 'management/metadata/classify/sources', title: '分级分类·数据源' },
      { key: 'management/metadata/classify-matrix', title: '分级矩阵表' },
      { key: 'management/metadata/classify-tasks', title: '分级分类任务' },
      { key: 'management/metadata/classify-api-docs', title: '分级分类 API 文档' },
    ]},
    { key: 'management/governance-sub-biz', title: '业务概念', children: [
      { key: 'management/business-concept', title: '业务概念总览' },
      { key: 'management/business-domain', title: '业务域管理' },
      { key: 'management/business-entity', title: '业务实体管理' },
      { key: 'management/business-graph', title: '业务图谱' },
    ]},
    { key: 'management/governance-sub-quality', title: '数据质量', children: [
      { key: 'management/data-quality/tasks', title: '校验任务管理' },
      { key: 'management/data-quality/instances', title: '任务实例日志' },
    ]},
  ]},
  // ── 数据要素管理(模型+服务)──
  // 标签管理已迁入元数据管理;指标管理已归入上下架管理·数据要素上下架
  { key: 'management-group-element', title: '数据要素管理', children: [
    { key: 'management/element-sub-model', title: '数据模型', children: [
      { key: 'management/data-models', title: '数据模型' },
    ]},
    { key: 'management/element-sub-service', title: '数据服务', children: [
      { key: 'management/service', title: '数据服务' },
      { key: 'management/service/api-management', title: 'API 管理' },
      { key: 'management/service/api-wizard', title: 'API 上架' },
      { key: 'management/service/monitor', title: '服务监控' },
      { key: 'management/service/stats', title: '调用统计' },
    ]},
  ]},
  // 字段权限/查询类服务(backtrack/detail-data-query/fund-usage-query)
  // 不属于数据管理范畴,已从侧边菜单移除,路由保留可直接访问
]

// ── 数据探索菜单(去掉前导 /,与 router path 一致)───────
// 数据探索 = 面向业务的「分析视图」:客户 360 / 工作流 / 指标看板
//   2026-08-06 清理:已移除越界路由(客群/标签/事件→ MKT)
// 数据发现 = 平台级「资产管理」:总览 / 资源 / 资产 / 要素 / 治理
//   2026-09-03 新增「统一查询」子菜单分组(SQL编辑执行 / 脚本管理 / 任务调度)
//     见 .trae/documents/产品设计/设计文档:统一查询平台Demo(前端交互版).md
//   2026-09-03 r2 合并:脚本管理+SQL编辑执行合为一个左右布局页面,菜单从 3 项变 2 项
const explorationMenus = [
  { key: 'exploration', title: '数据探索' },
  { key: 'exploration/customer360', title: '客户 360' },
  { key: 'exploration-group-unified-query', title: '统一查询', children: [
    { key: 'exploration/unified-query/sql', title: '统一查询' },
    { key: 'exploration/unified-query/tasks', title: '任务调度' },
    { key: 'exploration/unified-query/exports', title: '导出任务' },
  ]},
  { key: 'exploration/workflows', title: '分析工作流' },
  { key: 'exploration/indicator-dashboard', title: '业务指标看板' },
]

// ── 工作台菜单(快速入口 + 我的)────────────
const workbenchMenus = [
  { key: 'workbench-group-quick', title: '快速入口', children: [
    { key: 'discovery', title: '数据发现' },
    { key: 'exploration/customer360', title: '客户 360' },
    { key: 'discovery/asset-catalog', title: '资产目录' },
    { key: 'management/data-standard/standards', title: '数据标准' },
  ]},
  { key: 'workbench-group-mine', title: '我的', children: [
    { key: 'discovery/favorites', title: '我的关注' },
    { key: 'management/notifications', title: '通知中心' },
  ]},
]

// ── 菜单切换 ─────────────────────────────────
const allMenus: Record<string, any[]> = {
  discovery: discoveryMenus,
  management: managementMenus,
  exploration: explorationMenus,
  workbench: workbenchMenus,
}

const topMenuDefaultPath: Record<string, string> = {
  discovery: '/discovery',
  management: '/management',
  exploration: '/exploration',
  workbench: '/workbench',
}

const currentSideMenus = computed(() => allMenus[activeTopMenu.value] || [])

// 按角色过滤侧边栏菜单(2026-08-05 「数据发现侧边栏缺失」修复版)
//
// 设计原则:
//  - 公共入口模块(数据发现 discovery、工作台 workbench)不对角色过滤,
//    因为它们是平台基础能力,所有用户都需要浏览数据资产 — 否则低权限角色
//    直接看不到任何菜单项,体验割裂且无法自助探索
//  - 数据管理 management、数据探索 exploration 模块保留按 shortcuts 过滤
//    (这两个模块权限敏感)
//  - admin 直接放行,其它角色走规则引擎
//  - 组 key(`*-group-*`)只作容器,完全由其子项决定是否显示
//  - `splitKey` 把原始 key 加入候选,确保每个菜单至少有这一次匹配机会
//  - 「数据探索」顶层 3 项(entry / customer360 / workflows)对所有角色可见,
//    因为它们是「客户 360」等核心业务的入口;否则 data_engineer 这类角色
//    完全看不到客户 360,体验割裂。子组「客户中心 / 指标看板」再按角色过滤
const PUBLIC_TOP_MODULES = new Set(['discovery', 'workbench'])
// 数据探索的顶层入口项,所有角色均可见(不依赖 shortcuts)
const EXPLORATION_ALWAYS_ON = new Set([
  'exploration',
  'exploration/customer360',
  'exploration/workflows',
  // 统一查询;父组 key 含 -group- 由 isAllowed 自动放行
  'exploration/unified-query/sql',
  'exploration/unified-query/tasks',
  'exploration/unified-query/exports',
])

// 用 ref + 手动 update 替代 computed,避免每次 render 返回新 array
// arco menu watch prop 变化时反复触发,导致 layout 渲染循环
let _sideMenusCache: { key: string; result: any[] } = { key: '', result: [] }
const currentSideMenusByRole = ref<any[]>([])

function recomputeSideMenus() {
  const roleDef = roleStore.currentRoleDef
  let result: any[]
  // 1. 公共模块不过滤,直接返回原始引用
  if (PUBLIC_TOP_MODULES.has(activeTopMenu.value)) {
    result = currentSideMenus.value
  } else if (!roleDef || roleDef.role === 'admin') {
    result = currentSideMenus.value
  } else {
    const shortcuts = roleDef.shortcuts || []
    if (shortcuts.length === 0) {
      result = currentSideMenus.value
    } else {
      const allowedSet = new Set<string>(shortcuts)
      const alwaysOn = new Set(['favorites', 'notifications', 'workbench', 'discovery', 'management', 'exploration'])
      const splitKey = (k: string) => {
        const parts = k.split('/').filter(Boolean)
        const expanded: string[] = [k, ...parts]
        for (let i = 0; i < parts.length - 1; i++) {
          expanded.push(`${parts[i]}-${parts[i + 1]}`)
        }
        return expanded
      }
      const isAllowed = (k: string) => {
        if (alwaysOn.has(k)) return true
        // 容器 key(二级分组 -group- / 三级归类 -sub-)不作权限拦截
        if (/-group-/.test(k) || /-sub-/.test(k)) return true
        if (activeTopMenu.value === 'exploration' && EXPLORATION_ALWAYS_ON.has(k)) return true
        const parts = splitKey(k)
        return parts.some(p => allowedSet.has(p))
      }
      const filterItem = (item: any): any | null => {
        if (Array.isArray(item.children)) {
          const newChildren = item.children.map(filterItem).filter(Boolean)
          if (newChildren.length === 0) return null
          return { ...item, children: newChildren }
        }
        if (isAllowed(item.key)) return item
        return null
      }
      result = currentSideMenus.value.map(filterItem).filter(Boolean)
    }
  }
  // 只在 result 实际变化时更新 ref
  if (result !== currentSideMenusByRole.value) {
    currentSideMenusByRole.value = result
  }
}

// 在 activeTopMenu/role/currentSideMenus 变化时重算
watch([activeTopMenu, () => roleStore.currentRole, currentSideMenus], recomputeSideMenus, { immediate: true, flush: 'post' })

// stable:不再有,直接用 currentSideMenusByRole
const currentSideMenusStable = currentSideMenusByRole

function updateMenuState(path: string) {
  // 1. 顶部主模块(route.path 不带前导 /,topMenuMap 的 key 也不带前导 /)
  for (const [prefix, info] of Object.entries(topMenuMap)) {
    if (path === prefix || path.startsWith(prefix + '/')) {
      if (activeTopMenu.value !== info.key) activeTopMenu.value = info.key
      break
    }
  }
  // 2. 侧边栏选中
  if (activeSideMenu.value !== path) activeSideMenu.value = path
  // 计算需要展开的菜单 key(支持三级嵌套)
  const newOpenKeys: string[] = []
  for (const group of currentSideMenusStable.value) {
    if (!group.children) continue
    let groupMatched = false
    for (const sub of group.children) {
      // 三级菜单:sub 有 children,检查孙项是否命中
      if (sub.children) {
        const subMatched = sub.children.some((g: any) =>
          path === g.key || path.startsWith(g.key + '/')
        )
        if (subMatched) {
          groupMatched = true
          newOpenKeys.push(sub.key)
        }
      } else {
        // 二级菜单:直接检查 sub 是否命中
        if (path === sub.key || path.startsWith(sub.key + '/')) {
          groupMatched = true
        }
      }
    }
    if (groupMatched) newOpenKeys.push(group.key)
  }
  // 数组内容相同才更新,避免每次都生成新 array 触发 arco menu 重复渲染
  if (JSON.stringify(newOpenKeys) !== JSON.stringify(defaultOpenKeys.value)) {
    defaultOpenKeys.value = newOpenKeys
  }
}

function handleTopMenuClick(key: string) {
  activeTopMenu.value = key
  const target = topMenuDefaultPath[key] || '/'
  router.push(target)
}

function handleSideMenuClick(key: string) {
  if (!key) return
  // ⛳ 断点 F: 侧栏菜单点击的入口
  // eslint-disable-next-line no-console
  console.debug('[handleSideMenuClick] key =', JSON.stringify(key))
  // 优先按路由名跳转(更稳定,不需要 path 字符串手动拼接相对路径)
  // 这样避免 vue-router 4 在相对路径解析时出现 "No match found" 警告
  const named = NAME_BY_PATH[key]
  if (named) {
    // eslint-disable-next-line no-console
    console.debug('[handleSideMenuClick] push by name =', named)
    router.push({ name: named })
    return
  }
  // 没找到映射则退回字符串路径(原行为兼容)
  const path = key.startsWith('/') ? key.substring(1) : key
  router.push(path)
}

/**
 * 菜单 key → 路由 name 映射
 * 集中维护,避免散落的 push 字符串
 */
const NAME_BY_PATH: Record<string, string> = {
  // —— 顶层入口 ——
  'discovery/overview': 'discovery-overview',
  'discovery/search': 'search',
  'discovery/favorites': 'discovery-favorites',

  // —— 数据资源 ——
  'discovery/data-resources': 'data-resources',
  'discovery/data-resources/files': 'dr-files',
  'discovery/data-resources/logs': 'dr-logs',
  'discovery/data-resources/realtime': 'dr-realtime',

  // —— 数据资产 ——
  'discovery/asset-catalog': 'asset-catalog',

  // —— 数据要素(精简到 4 个核心入口,与 discoveryMenus 保持一致)——
  'discovery/indicator-dict': 'indicator-dict',
  'discovery/variable-dict': 'variable-dict',
  'discovery/feature-dict': 'feature-dict',
  'discovery/external': 'external',
  'discovery/metrics-map': 'metrics-map',
  'discovery/variable-map': 'variable-map',
  'discovery/feature-map': 'feature-map',

  // —— 治理运营 ——
  'discovery/lineage': 'lineage',
  'discovery/api-market': 'api-market',

  // —— 数据管理 ——
  'management': 'management',
  'management/notifications': 'notifications',
  'management/notifications/categories': 'notification-categories',
  'management/metadata': 'metadata',
  'management/metadata/modeling': 'metadata-modeling',
  'management/metadata/entity': 'metadata-entity',
  'management/metadata/task': 'metadata-task',
  'management/metadata/classify/sources': 'classify-sources',
  'management/metadata/classify/tables': 'classify-tables',
  'management/metadata/classify-matrix': 'classify-matrix',
  'management/metadata/classify-tasks': 'classify-tasks',
  'management/metadata/classify-api-docs': 'classify-api-docs',
  'management/business-concept': 'business-concept',
  'management/business-domain': 'business-domain',
  'management/business-entity': 'business-entity',
  'management/business-graph': 'business-graph',
  'management/data-standard/standards': 'data-standard',
  'management/data-standard/domains': 'data-standard-domains',
  'management/data-standard/codes': 'data-standard-codes',
  'management/data-standard/words': 'data-standard-words',
  'management/data-standard/audit': 'data-standard-audit',
  'management/data-quality/tasks': 'quality-task-list',
  'management/data-quality/instances': 'quality-instance-list',
  'management/data-models': 'data-models',
  'management/asset-management/asset-tags': 'asset-tags',
  'management/asset-management/tag-group': 'tag-group',
  'management/asset-management/basic-management/data-source': 'asset-data-source',
  'management/asset-management/basic-management/metadata-collection': 'metadata-collection',
  'management/asset-management/basic-management/metadata-collection/task-list': 'metadata-collection-list',
  'management/asset-management/basic-management/tag-management': 'tag-management',
  'management/asset-management/listing-management/asset-management': 'asset-listing-overview',
  'management/asset-management/listing-management/data-source': 'data-source-listing-overview',
  'management/asset-management/listing-management/metric-management': 'metric-management',
  'management/service': 'service',
  'management/service/api-wizard': 'api-wizard',
  'management/service/api-management': 'service-api-management',
  'management/service/backtrack': 'service-backtrack',
  'management/service/detail-data-query': 'service-detail-data-query',
  'management/service/fund-usage-query': 'service-fund-usage-query',
  'management/service/monitor': 'service-monitor',
  'management/service/stats': 'service-stats',
  'management/permission/data-permission/apply': 'permission-apply',
  'management/permission/data-permission/approval': 'permission-approval',
  'management/permission/data-permission/management': 'permission-management',
  'management/permission/data-permission/progress': 'permission-progress',
  'management/shelf/resource-shelf': 'shelf-resource',
  'management/shelf/asset-shelf': 'shelf-asset',
  'management/shelf/element-shelf': 'shelf-element',
  'management/shelf/batch-shelf': 'shelf-batch',
  'management/user-groups': 'user-groups',

  // —— 数据探索 ——
  // 2026-08-06 清理:客群/标签/事件已划归 MKT,这里不再引用它们的 key
  //   指标看板已确认为 DCA 探索域自有能力,保留
  'exploration': 'exploration',
  'exploration/customer360': 'Customer360',
  'exploration/customer360/detail': 'Customer360Detail',
  'exploration/workflows': 'workflows',
  'exploration/workflows/editor': 'workflow-editor',
  'exploration/indicator-dashboard': 'exploration-indicator-dashboard',
  'exploration/unified-query/sql': 'unified-query-sql',
  'exploration/unified-query/tasks': 'unified-query-tasks',
  'exploration/unified-query/exports': 'unified-query-exports',

  // —— 工作台 ——
  'workbench': 'workbench'
}

// ── 跨 App 跳转 ──────────────────────────────
function goToApp(app: 'workbench' | 'mkt') {
  if (app === 'mkt') {
    // 跳到 mkt 子应用(端口 5177)
    window.location.href = 'http://localhost:5177/mkt/'
  } else {
    router.push('workbench')
  }
}

function goToNotifications() {
  router.push('management/notifications')
}

function goToProfile() {
  Message.info('个人信息(待实现)')
}

// 不再 watch route.path,避免 arco menu 内部 watch 触发的 reactive 循环
// 页面切换时菜单状态由 page onMounted 自行管理
</script>

<style scoped>
.dca-layout {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-header {
  height: 60px;
  background: #fff;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  padding: 0 20px;
  flex-shrink: 0;
  z-index: 100;
}

.logo-area {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-right: 24px;
}

.logo {
  font-size: 18px;
  font-weight: 600;
  color: #1d2129;
  white-space: nowrap;
}

.app-switcher {
  font-size: 12px;
  color: #165dff;
}

.top-menu {
  flex: 1;
  border-bottom: none !important;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.body-layout {
  flex: 1;
  overflow: hidden;
  display: flex;
}

.main-sider {
  height: 100%;
  border-right: 1px solid var(--color-border);
  background: #fff;
  overflow-y: auto;
}

.main-content {
  flex: 1;
  background: var(--color-fill-2);
  overflow: auto;
  padding: 16px;
  height: 100%;
}

.content-wrapper {
  background: #fff;
  min-height: 100%;
  padding: 0;
  border-radius: 4px;
}
</style>