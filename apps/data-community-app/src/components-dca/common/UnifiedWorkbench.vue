<template>
  <div class="unified-workbench">
    <!-- 1. Hero 区(模块标题 + 全局搜索 + 角色切换器) -->
    <section class="hero">
      <div class="hero-content">
        <div class="hero-title-row">
          <h1 class="hero-title">{{ moduleTitle }}</h1>
          <RoleSwitcher />
        </div>
        <p class="hero-greeting">{{ rolePersonalizedGreeting }}</p>
      </div>
      <div class="hero-search">
        <a-input-search
          v-model="searchKeyword"
          :placeholder="searchPlaceholder"
          size="large"
          search-button
          @search="handleSearch"
          @press-enter="handleSearch"
        />
      </div>
    </section>

    <!-- 1.5. 数据治理全景(打通数据标准/分级/资源/资产/要素) -->
    <section class="governance" data-testid="governance-overview">
      <GlobalGovernanceOverview />
    </section>

    <!-- 1.6. 今日业务概念(按角色推荐) -->
    <section v-if="roleConcepts && roleConcepts.length > 0" class="business-concepts" data-testid="business-concepts">
      <div class="section-header">
        <h2 class="section-title">
          <icon-link class="section-icon" />
          今日业务概念
        </h2>
        <a-link @click="onViewAllConcepts">查看图谱 <icon-right /></a-link>
      </div>
      <a-row :gutter="16">
        <a-col
          v-for="concept in roleConcepts"
          :key="concept.code"
          :xs="12" :sm="8" :md="6" :lg="6"
        >
          <a-card class="concept-card" hoverable @click="onViewConcept(concept)">
            <div class="concept-inner">
              <div class="concept-header">
                <a-tag :color="concept.level === 1 ? 'purple' : concept.level === 2 ? 'arcoblue' : 'green'" size="small">
                  L{{ concept.level }} · {{ nodeTypeLabel(concept.nodeType) }}
                </a-tag>
                <span v-if="concept.standardCode" class="concept-std">{{ concept.standardCode }}</span>
              </div>
              <div class="concept-name">{{ concept.name }}</div>
              <div class="concept-desc">{{ concept.description }}</div>
              <div class="concept-footer">
                <a-tag size="small">{{ concept.businessBelonging }}</a-tag>
                <span v-if="concept.defaultSensitivity" class="concept-sensitivity">
                  <a-tag size="small" :color="sensitivityColor(concept.defaultSensitivity)">
                    {{ concept.defaultSensitivity }}
                  </a-tag>
                </span>
              </div>
            </div>
          </a-card>
        </a-col>
      </a-row>
    </section>

    <!-- 2. 角色个性化快捷作业(P0 角色机制) -->
    <section class="shortcuts" data-testid="shortcuts-section">
      <div class="section-header">
        <h2 class="section-title">{{ moduleTitle }} · 快捷作业</h2>
        <a-tag :color="currentRoleDef.color">
          {{ currentRoleDef.avatar }} {{ currentRoleDef.label }}· {{ currentRoleDef.department }}
        </a-tag>
        <span class="role-hint">已根据角色定制 · 共 {{ (shortcuts || []).length }} 个</span>
      </div>
      <a-row :gutter="16" class="shortcut-grid">
        <a-col
          v-for="tool in personalizedShortcuts"
          :key="tool.key"
          :xs="12" :sm="12" :md="6" :lg="6" :xl="6"
          :xxl="6"
        >
          <a-card class="shortcut-card" hoverable @click="onPersonalizedClick(tool)">
            <div class="shortcut-card-inner">
              <div class="shortcut-icon" :style="{ color: currentRoleDef.color }">
                <component :is="tool.icon" />
              </div>
              <div class="shortcut-text">
                <div class="shortcut-title">{{ tool.title }}</div>
                <div class="shortcut-desc">{{ tool.desc }}</div>
                <a-tag :color="moduleColor(tool.module)" size="small" class="module-tag">
                  {{ moduleLabel(tool.module) }}
                </a-tag>
              </div>
            </div>
          </a-card>
        </a-col>
      </a-row>
    </section>

    <!-- 3. 跨模块跳转入口 -->
    <section v-if="showCrossNav" class="cross-nav">
      <h2 class="section-title">进入其他模块</h2>
      <a-row :gutter="16">
        <a-col
          v-for="mod in otherModules"
          :key="mod.key"
          :xs="24" :sm="8" :md="8" :lg="8" :xl="8"
        >
          <a-card class="cross-nav-card" hoverable @click="onCrossNav(mod.key)">
            <div class="cross-nav-inner">
              <component :is="mod.icon" class="cross-nav-icon" />
              <div class="cross-nav-text">
                <div class="cross-nav-title">{{ mod.title }}</div>
                <div class="cross-nav-desc">{{ mod.desc }}</div>
              </div>
            </div>
          </a-card>
        </a-col>
      </a-row>
    </section>

    <!-- 4. 最近访问(从 localStorage 读) -->
    <section class="recent">
      <h2 class="section-title">最近访问</h2>
      <a-empty v-if="!recentVisits || recentVisits.length === 0" description="暂无最近访问" />
      <a-row v-else :gutter="16">
        <a-col
          v-for="visit in recentVisits.slice(0, 6)"
          :key="visit.path"
          :xs="12" :sm="8" :md="6" :lg="6"
        >
          <a-card class="recent-card" hoverable @click="onRecentClick(visit)">
            <div class="recent-inner">
              <icon-clock-circle class="recent-icon" />
              <div class="recent-info">
                <div class="recent-title">{{ visit.title }}</div>
                <div class="recent-time">{{ visit.time }}</div>
              </div>
            </div>
          </a-card>
        </a-col>
      </a-row>
    </section>

    <!-- 4.5. 我的收藏(P0 角色机制 + 收藏系统) -->
    <section class="favorites-section" data-testid="favorite-section" v-if="topFavorites && topFavorites.length > 0">
      <div class="section-header">
        <h2 class="section-title">
          <icon-star class="section-icon" />
          我的收藏
        </h2>
        <a-link @click="onViewAllFavorites">
          查看全部 <icon-right />
        </a-link>
      </div>
      <a-row :gutter="16">
        <a-col
          v-for="fav in topFavorites"
          :key="fav.id"
          :xs="12" :sm="8" :md="6" :lg="6"
        >
          <a-card class="favorite-card" hoverable @click="onVisitFavorite(fav)">
            <div class="favorite-inner">
              <component :is="resourceIcon(fav.resourceType)" class="fav-icon" />
              <div class="favorite-info">
                <div class="favorite-title">{{ fav.resourceName }}</div>
                <div class="favorite-meta">
                  <a-tag size="small">{{ resourceTypeName(fav.resourceType) }}</a-tag>
                  <span class="visit-count">{{ fav.visitCount }} 次</span>
                </div>
              </div>
            </div>
          </a-card>
        </a-col>
      </a-row>
    </section>

    <!-- 5. P0#5: 我的产出(跨模块工作产出聚合) -->
    <section class="artifacts" data-testid="my-artifacts-panel">
      <h2 class="section-title">我的产出</h2>
      <MyArtifactsPanel />
    </section>

    <!-- 5. 搜索结果抽屉(L2 整合接入) -->
    <a-drawer
      v-model:visible="searchDrawer"
      :title="`搜索结果: ${lastKeyword}`"
      :width="720"
      :footer="false"
    >
      <GlobalSearchResult
        :keyword="lastKeyword"
        @navigate="onResultNavigate"
      />
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  IconStorage,
  IconUserGroup,
  IconBranch,
  IconSearch,
  IconSettings,
  IconSafe,
  IconCommon,
  IconTags,
  IconCalendar,
  IconDesktop,
  IconClockCircle,
  IconApps,
  IconStar,
  IconCode,
  IconFile,
  IconDashboard,
  IconLink,
  IconRight
} from '@arco-design/web-vue/es/icon'
import { useCrossNav } from '@/composables/useCrossNav'
import { usePersonalizedWorkbench } from '@/composables/usePersonalizedWorkbench'
import GlobalSearchResult from './GlobalSearchResult.vue'
import MyArtifactsPanel from './MyArtifactsPanel.vue'
import GlobalGovernanceOverview from './GlobalGovernanceOverview.vue'
import RoleSwitcher from './RoleSwitcher.vue'
import { FavoriteStore } from '@/mock-shared/favorite-directory'

type Module = 'discovery' | 'management' | 'exploration'

interface Shortcut {
  key: string
  title: string
  icon: any
  desc: string
  navKey: string
}

const props = withDefaults(defineProps<{
  module?: Module
  greeting?: string
  shortcuts?: Shortcut[]
}>(), {
  module: 'discovery'
})

const emit = defineEmits<{
  toolClick: [tool: Shortcut]
  crossNav: [module: Module]
}>()

const { go } = useCrossNav()

// P0 角色机制: 个性化工作台
// 优先使用外部传入的 shortcuts(供老调用方),否则用角色相关的个性化 shortcuts
const { shortcuts: roleShortcuts, currentRoleDef, onShortcutClick } = usePersonalizedWorkbench()

// 当前用户(从 favorite store 推断 mock,实际应从 useUserStore 取)
// 这里写死方便演示 — dev 模式下 RoleSwitcher 切换角色后,FavoriteStore 自动筛选
const currentUserId = computed(() => {
  // 从角色映射:数据工程师→张三,运营主管→王运营...
  const roleMap: Record<string, string> = {
    data_engineer: 'user-zhangsan',
    data_admin: 'user-zhangsan',
    risk_analyst: 'user-fengkong',
    risk_manager: 'user-fengkong',
    loan_manager: 'user-xindai',
    operation_lead: 'user-yunying',
    marketing_lead: 'user-yingxiao',
    product_manager: 'user-chanpin',
    finance_lead: 'user-caiwu',
    admin: 'user-system'
  }
  return roleMap[currentRoleDef.value.role] || 'user-zhangsan'
})

// 我的收藏:按当前用户筛 + Top 4
const topFavorites = computed(() => {
  const list = FavoriteStore.byUser(currentUserId.value)
  return [...list]
    .sort((a, b) => b.visitCount - a.visitCount)
    .slice(0, 4)
})

const resourceIcon = (type: string) => ({
  table: IconStorage,
  field: IconCode,
  metric: IconBranch,
  tag: IconTags,
  audience: IconUserGroup,
  dashboard: IconDashboard,
  service: IconDesktop,
  api: IconFile,
  report: IconCalendar
}[type] || IconStorage)

const resourceTypeName = (type: string) => ({
  table: '表', field: '字段', metric: '指标', tag: '标签',
  audience: '人群', dashboard: '看板', service: '服务', api: 'API', report: '报表'
}[type] || type)

const onVisitFavorite = (fav: any) => {
  FavoriteStore.visit(fav.id)
  if (fav.resourcePath) {
    go(fav.resourceKey as any || fav.resourcePath)
  }
}

const onViewAllFavorites = () => {
  go('discovery:favorites' as any)
}

const moduleColor = (mod: string) => ({
  discovery: 'arcoblue',
  management: 'purple',
  exploration: 'green'
}[mod] || 'gray')

const moduleLabel = (mod: string) => ({
  discovery: '发现',
  management: '管理',
  exploration: '探索'
}[mod] || mod)

// 敏感级别标签颜色(L1-L4,与数据权限模块保持一致)
const sensitivityColor = (level: string) => ({
  L1: 'gray', L2: 'arcoblue', L3: 'orange', L4: 'red'
}[level] || 'gray')

// 角色个性化问候语
const rolePersonalizedGreeting = computed(() => {
  const def = currentRoleDef.value
  return `欢迎 ${def.label} (${def.department}) — ${def.description}`
})

// P1.2: 按角色推荐业务概念
import { TaxonomyStore } from '@/mock-shared/classification-taxonomy'
const roleConcepts = computed(() => {
  const def = currentRoleDef.value
  // 按业务归属筛概念
  const concepts = TaxonomyStore.byBusinessBelonging(def.department as any)
  // 取前 8 个
  return concepts.slice(0, 8)
})

const nodeTypeLabel = (type: string) => ({
  domain: '业务域',
  entity: '业务实体',
  element: '业务要素',
  field: '子要素'
}[type] || type)

const onViewConcept = (concept: any) => {
  go('management:business-concept' as any)
}

const onViewAllConcepts = () => {
  go('management:business-concept' as any)
}

// 把 roleShortcuts 转成 component-friendly 格式
const iconMap: Record<string, any> = {
  'asset-catalog': IconStorage,
  'customer360': IconUserGroup,
  'metrics-map': IconBranch,
  'variable-map': IconDesktop,
  'lineage': IconLink,
  'service': IconDesktop,
  'metadata-modeling': IconCode,
  'data-standard': IconCommon,
  'data-permission': IconSafe,
  'business-concept': IconLink,
  'asset-tags': IconStar,
  'favorites': IconStar,
  'tag-system': IconTags,
  'event-center': IconCalendar,
  'audience-system': IconUserGroup,
  'workflows': IconCode,
  'indicator-dashboard': IconDashboard
}

const personalizedShortcuts = computed(() =>
  roleShortcuts.value.map(s => ({
    key: s.key,
    title: s.title,
    desc: s.desc,
    icon: iconMap[s.key] || IconStorage,
    module: s.module,
    navKey: s.routeKey
  }))
)

const onPersonalizedClick = (tool: any) => {
  onShortcutClick({
    key: tool.key,
    title: tool.title,
    desc: tool.desc,
    iconName: '',
    module: 'discovery',
    routeKey: tool.navKey
  })
}

// 搜索(L2 整合入口)
const searchKeyword = ref('')
const searchDrawer = ref(false)
const lastKeyword = ref('')

const moduleTitle = computed(() => ({
  discovery: '数据发现',
  management: '数据管理',
  exploration: '数据探索'
}[props.module]))

const searchPlaceholder = computed(() => ({
  discovery: '搜索数据表、指标、特征、血缘...',
  management: '搜索元数据、标准、权限...',
  exploration: '搜索标签、事件、人群、看板...'
}[props.module]))

const greeting = computed(() => props.greeting || '欢迎使用数据中台')

const handleSearch = () => {
  const kw = searchKeyword.value.trim()
  if (!kw) return
  lastKeyword.value = kw
  searchDrawer.value = true
  // 记录最近访问
  saveRecentVisit({
    title: kw,
    path: '__search__',
    module: props.module,
    time: new Date().toLocaleString('zh-CN')
  })
}

const onResultNavigate = (result: { routeKey: string; params?: Record<string, string | number> }) => {
  searchDrawer.value = false
  go(result.routeKey, result.params)
}

// 快捷作业
const onToolClick = (tool: Shortcut) => {
  emit('toolClick', tool)
  go(tool.navKey as any)
  saveRecentVisit({
    title: tool.title,
    path: tool.navKey,
    module: props.module,
    time: new Date().toLocaleString('zh-CN')
  })
}

// 跨模块
const otherModules = computed(() => {
  const all = [
    {
      key: 'discovery' as Module,
      title: '数据发现',
      desc: '浏览数据资产、指标、客户360',
      icon: IconStorage,
      color: '#165DFF'
    },
    {
      key: 'management' as Module,
      title: '数据管理',
      desc: '元数据、标准、权限治理',
      icon: IconSettings,
      color: '#722ED1'
    },
    {
      key: 'exploration' as Module,
      title: '数据探索',
      desc: '标签、事件、人群、分析流程',
      icon: IconApps,
      color: '#0FC6C2'
    }
  ]
  return all.filter(m => m.key !== props.module)
})

const showCrossNav = computed(() => props.module !== undefined)

const onCrossNav = (mod: Module) => {
  emit('crossNav', mod)
  const map: Record<Module, string> = {
    discovery: 'discovery:index',
    management: 'management:index',
    exploration: 'exploration:index'
  }
  go(map[mod])
}

// 最近访问
interface RecentVisit {
  title: string
  path: string
  module: Module
  time: string
}

const recentVisits = ref<RecentVisit[]>([])

const RECENT_KEY = 'data-mid-platform:recent-visits'

const loadRecentVisits = () => {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    if (raw) recentVisits.value = JSON.parse(raw)
  } catch (e) {
    console.warn('[UnifiedWorkbench] 加载最近访问失败', e)
  }
}

const saveRecentVisit = (visit: RecentVisit) => {
  try {
    const list = recentVisits.value.filter(v => v.path !== visit.path)
    list.unshift(visit)
    recentVisits.value = list.slice(0, 10)
    localStorage.setItem(RECENT_KEY, JSON.stringify(recentVisits.value))
  } catch (e) {
    console.warn('[UnifiedWorkbench] 保存最近访问失败', e)
  }
}

const onRecentClick = (visit: RecentVisit) => {
  if (visit.path === '__search__') {
    lastKeyword.value = visit.title
    searchDrawer.value = true
    return
  }
  go(visit.path as any)
}

onMounted(loadRecentVisits)
</script>

<style lang="scss" scoped>
.unified-workbench {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.hero-title-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 4px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;

  .section-icon {
    color: #ff7d00;
  }

  .role-hint {
    font-size: 12px;
    color: #86909c;
    margin-left: auto;
  }
}

.shortcut-text .module-tag {
  margin-top: 4px;
}

.favorites-section {
  margin-bottom: 24px;

  .favorite-card {
    cursor: pointer;
    transition: all 0.2s;
    margin-bottom: 12px;

    &:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      transform: translateY(-2px);
    }

    .favorite-inner {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .fav-icon {
      font-size: 24px;
      color: #ff7d00;
      flex-shrink: 0;
    }

    .favorite-info {
      flex: 1;
      min-width: 0;
    }

    .favorite-title {
      font-size: 14px;
      font-weight: 500;
      color: #1d2129;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      margin-bottom: 4px;
    }

    .favorite-meta {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #86909c;
    }
  }
}

.hero {
  background: linear-gradient(135deg, #f0f7ff 0%, #e6f4ff 100%);
  border-radius: 12px;
  padding: 32px;
  margin-bottom: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;

  .hero-content {
    .hero-title {
      font-size: 28px;
      font-weight: 600;
      color: #1d2129;
      margin: 0 0 8px;
    }
    .hero-greeting {
      font-size: 14px;
      color: #4e5969;
      margin: 0;
    }
  }

  .hero-search {
    max-width: 640px;
  }
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #1d2129;
  margin: 0 0 16px;
}

.shortcuts {
  margin-bottom: 24px;
}

.shortcut-grid {
  .shortcut-card {
    cursor: pointer;
    transition: all 0.2s;
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
    }
  }

  .shortcut-card-inner {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 4px 0;
  }

  .shortcut-icon {
    font-size: 28px;
    color: #165dff;
    flex-shrink: 0;
  }

  .shortcut-text {
    flex: 1;
    min-width: 0;
  }

  .shortcut-title {
    font-size: 15px;
    font-weight: 500;
    color: #1d2129;
    margin-bottom: 2px;
  }

  .shortcut-desc {
    font-size: 12px;
    color: #86909c;
    line-height: 1.4;
  }
}

.cross-nav {
  margin-bottom: 24px;

  .cross-nav-card {
    cursor: pointer;
    transition: all 0.2s;
    border: 1px solid #e5e6eb;
    &:hover {
      border-color: #165dff;
      box-shadow: 0 6px 16px rgba(22, 93, 255, 0.08);
    }
  }

  .cross-nav-inner {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .cross-nav-icon {
    font-size: 32px;
    color: #165dff;
  }

  .cross-nav-title {
    font-size: 16px;
    font-weight: 600;
    color: #1d2129;
  }

  .cross-nav-desc {
    font-size: 12px;
    color: #86909c;
    margin-top: 4px;
  }
}

.recent {
  .recent-card {
    cursor: pointer;
    transition: all 0.2s;
    &:hover {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    }
  }

  .recent-inner {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .recent-icon {
    color: #86909c;
    font-size: 14px;
  }

  .recent-title {
    font-size: 13px;
    color: #1d2129;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .recent-time {
    font-size: 11px;
    color: #c9cdd4;
    margin-top: 2px;
  }
}

.artifacts {
  margin-top: 24px;
}

.governance {
  margin-bottom: 24px;
}

.business-concepts {
  margin-bottom: 24px;

  .section-icon {
    color: #722ed1;
  }

  .concept-card {
    margin-bottom: 12px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      box-shadow: 0 4px 12px rgba(114, 46, 209, 0.12);
      transform: translateY(-2px);
    }

    .concept-inner {
      .concept-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;

        .concept-std {
          font-family: monospace;
          font-size: 11px;
          color: #86909c;
          background: #f7f8fa;
          padding: 1px 4px;
          border-radius: 2px;
        }
      }

      .concept-name {
        font-size: 14px;
        font-weight: 600;
        color: #1d2129;
        margin-bottom: 4px;
      }

      .concept-desc {
        font-size: 12px;
        color: #4e5969;
        line-height: 1.5;
        min-height: 36px;
        margin-bottom: 8px;
      }

      .concept-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
    }
  }
}
</style>