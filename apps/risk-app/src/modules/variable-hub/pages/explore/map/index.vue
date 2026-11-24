<template>
  <div class="explore-map-page">
    <DmtPageHeader title="特征全景" subtitle="以特征类型为入口，查看当前类型下的分类汇总与状态分布。">
      <template #extra>
        <a-button @click="router.push('/variable-management')">特征字典</a-button>
        <a-button type="primary" @click="router.push('/explore/topics')">探索课题</a-button>
      </template>
    </DmtPageHeader>

    <DmtStatGroup :items="statItems" />

    <a-card :bordered="false" class="toolbar-card">
      <div class="toolbar-head">
        <div>
          <div class="toolbar-title">第一层：特征类型筛选</div>
          <div class="toolbar-desc">先选定一个特征类型，再看该类型下的来源结构和状态分布。</div>
        </div>
        <a-tag color="arcoblue">当前选中：{{ selectedType.title }}</a-tag>
      </div>

      <div class="type-selector">
        <div
          v-for="item in typeTree"
          :key="item.id"
          class="type-card"
          :class="{ active: selectedTypeId === item.id }"
          @click="selectedTypeId = item.id"
        >
          <div class="type-card-top">
            <div>
              <div class="type-card-title">{{ item.title }}</div>
              <div class="type-card-subtitle">{{ item.subtitle }}</div>
            </div>
            <a-button size="mini" type="text" @click.stop="openTypeDrawer(item)">详情</a-button>
          </div>
          <div class="type-card-stats">
            <span>特征 {{ item.stats.totalVariables }}</span>
            <span>数据源 {{ item.stats.dataSources }}</span>
            <span>探索中 {{ item.stats.exploring }}</span>
            <span>已上线 {{ item.stats.online }}</span>
            <span>已归档 {{ item.stats.archived }}</span>
          </div>
        </div>
      </div>
    </a-card>

    <a-card :bordered="false" class="panel-card content-row">
      <template #title>
        <div class="card-title">
          <span>{{ selectedType.title }} · 分类汇总（万级场景下不展开具体特征）</span>
          <a-space>
            <a-tag color="arcoblue">类型 → 探索分类</a-tag>
            <a-tag v-if="totalVariablesUnderType > 0" color="orange">涉及 {{ totalVariablesUnderType }} 个特征</a-tag>
            <a-button size="mini" type="primary" @click="goToVariableList()">在台账中查看全部</a-button>
          </a-space>
        </div>
      </template>

      <a-row :gutter="12">
        <a-col v-for="cat in categorySummary" :key="cat.id" :span="6">
          <a-card :bordered="false" class="category-summary-card" hoverable>
            <div class="cat-title">{{ cat.title }}</div>
            <div class="cat-stats">
              <a-tag color="arcoblue">特征 {{ cat.stats?.totalVariables || 0 }}</a-tag>
              <a-tag color="green">已上线 {{ cat.stats?.online || 0 }}</a-tag>
              <a-tag color="orange">探索中 {{ cat.stats?.exploring || 0 }}</a-tag>
              <a-tag>已归档 {{ cat.stats?.archived || 0 }}</a-tag>
            </div>

            <!-- 第三层：探索来源（精简列表，前 3 个 + 链接） -->
            <div class="cat-topics">
              <div class="cat-topics-title">
                探索来源 · {{ getTopicsByCategory(cat.id).length }} 个课题
              </div>
              <div v-if="getTopicsByCategory(cat.id).length === 0" class="cat-topics-empty">
                暂无探索课题
              </div>
              <div v-else class="cat-topics-list">
                <div
                  v-for="topic in getTopicsByCategory(cat.id).slice(0, 3)"
                  :key="topic.id"
                  class="cat-topic-item"
                  @click.stop="goToTopic(topic.id)"
                >
                  <a-tag size="small" :color="topicStatusColor(topic.status)">{{ topicStatusLabel(topic.status) }}</a-tag>
                  <span class="cat-topic-name">{{ topic.name }}</span>
                </div>
                <a-button
                  v-if="getTopicsByCategory(cat.id).length > 3"
                  size="mini"
                  type="text"
                  @click.stop="openTopicListDrawer(cat)"
                >查看全部 {{ getTopicsByCategory(cat.id).length }} 个 →</a-button>
                <a-button
                  v-else-if="getTopicsByCategory(cat.id).length > 0"
                  size="mini"
                  type="text"
                  @click.stop="openTopicListDrawer(cat)"
                >查看详情</a-button>
              </div>
            </div>

            <a-space class="cat-actions">
              <a-button size="mini" type="text" @click="goToVariableList(selectedTypeId, cat.id)">在台账中查看 {{ cat.stats?.totalVariables || 0 }} 个</a-button>
              <a-button size="mini" type="text" @click="openTypeDrawer(cat)">详情</a-button>
            </a-space>
          </a-card>
        </a-col>
      </a-row>
    </a-card>

    <a-drawer v-model:visible="drawerVisible" :width="460" unmount-on-close>
      <template #title>
        <div class="drawer-header">
          <span>{{ drawerState.title }}</span>
          <a-tag>{{ drawerState.levelLabel }}</a-tag>
        </div>
      </template>

      <a-descriptions :column="1" bordered size="small">
        <a-descriptions-item label="说明">{{ drawerState.description || '—' }}</a-descriptions-item>
        <a-descriptions-item label="统计摘要">
          特征 {{ drawerState.stats.totalVariables }} / 数据源 {{ drawerState.stats.dataSources }}
        </a-descriptions-item>
        <a-descriptions-item label="状态分布">
          探索中 {{ drawerState.stats.exploring }}，已上线 {{ drawerState.stats.online }}，已归档 {{ drawerState.stats.archived }}
        </a-descriptions-item>
      </a-descriptions>

      <!-- 探索来源（仅在抽屉来自 openTopicListDrawer 时展示） -->
      <template v-if="drawerState.topics && drawerState.topics.length">
        <a-divider />
        <div class="drawer-title">
          探索来源（双击查看课题）
          <a-tag size="small" color="purple">{{ drawerState.topics.length }} 个课题</a-tag>
        </div>
        <div class="topic-list">
          <div
            v-for="topic in drawerState.topics"
            :key="topic.id"
            class="topic-item"
            @click="goToTopic(topic.id)"
          >
            <div class="topic-top">
              <a-tag size="small" :color="topicStatusColor(topic.status)">{{ topicStatusLabel(topic.status) }}</a-tag>
              <span class="topic-name">{{ topic.name }}</span>
              <a-tag v-if="topic.variableSync?.status" size="small" :color="syncStatusColor(topic.variableSync.status)">
                特征 {{ syncStatusLabel(topic.variableSync.status) }}
              </a-tag>
            </div>
            <div class="topic-meta">
              {{ topic.owner }} · {{ topic.updatedAt }}
            </div>
            <div v-if="topic.businessProblem" class="topic-problem">{{ topic.businessProblem }}</div>
          </div>
          <a-empty v-if="!drawerState.topics.length" description="暂无探索课题" />
        </div>
      </template>

      <a-divider />

      <div class="drawer-title">示例特征</div>
      <div class="sample-list">
        <div v-for="item in drawerVariables" :key="item.id" class="sample-item">
          <div class="sample-top">
            <a-link @click="goVariableDetail(item)">{{ item.name }}</a-link>
            <a-tag size="small" :color="lifecycleColor(item.lifecycle)">{{ lifecycleLabel(item.lifecycle) }}</a-tag>
          </div>
          <div class="sample-meta">{{ item.variableType }} / {{ item.exploreCategory }} · {{ item.dataSourceName }} · {{ item.owner }}</div>
          <div class="sample-actions">
            <a-button size="mini" type="text" @click="goVariableDetail(item)">查看完整档案</a-button>
            <a-button v-if="item.topicId" size="mini" type="text" @click="router.push(`/explore/topics/${item.topicId}`)">来源课题</a-button>
            <a-button size="mini" type="text" @click="router.push('/variable-management')">回到台账</a-button>
          </div>
        </div>
      </div>
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, reactive, ref, resolveComponent, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ExploreStore } from '@/modules/variable-hub/mock/explore/explore-store'
import {
  getPanoramaSummary,
  getPanoramaTypeTree,
  getPanoramaVariables,
  type PanoramaCategoryBranch,
  type PanoramaLifecycleBranch,
  type PanoramaSourceBranch,
  type PanoramaStats,
  type PanoramaTypeBranch,
  type VariableLifecycle
} from '@/modules/variable-hub/mock/explore/explore-panorama'
import DmtPageHeader from '@/modules/variable-hub/components/PageHeader.vue'
import DmtStatGroup from '@/modules/variable-hub/components/StatGroup.vue'

const router = useRouter()

const goVariableDetail = (item: any) => {
  if (!item?.id) {
    router.push('/variable-management')
    return
  }
  router.push({ name: 'VariableAssetDetail', params: { id: item.id, mode: 'view' } })
  drawerVisible.value = false
}

const summary = getPanoramaSummary()
const typeTree = getPanoramaTypeTree()
const allVariables = getPanoramaVariables()

const archivedRatio = computed(() => {
  if (!summary.totalVariables) return 0
  return (summary.archived / summary.totalVariables) * 100
})

const statItems = computed(() => [
  { title: '特征总数', value: summary.totalVariables, iconText: '#', iconBg: '#f0f7ff', iconColor: '#165dff', subtitle: '当前全景' },
  { title: '数据源数', value: summary.totalDataSources, iconText: '▣', iconBg: '#f5edff', iconColor: '#722ed1', subtitle: '覆盖数据源' },
  { title: '探索中', value: summary.exploring, iconText: '○', iconBg: '#e6fffb', iconColor: '#0fc6c2', subtitle: '在探索流程中' },
  { title: '已上线', value: summary.online, iconText: '✓', iconBg: '#e8ffea', iconColor: '#00b42a', subtitle: '已进入台账生产' },
  {
    title: '已归档',
    value: summary.archived,
    iconText: '⌫',
    iconBg: '#fff1f0',
    iconColor: '#f53f3f',
    subtitle: '过程沉淀，便于复用',
    extraLabel: '占特征总数',
    extraValue: archivedRatio.value,
    extraPrecision: 1,
    extraSuffix: '%',
    extraColor: '#f53f3f'
  }
])
const selectedTypeId = ref(typeTree[0].id)
const selectedType = computed(() => typeTree.find((item) => item.id === selectedTypeId.value) || typeTree[0])

const lifecycleLabel = (value: VariableLifecycle) => {
  if (value === 'exploring') return '探索中'
  if (value === 'online') return '已上线'
  return '已归档'
}

const lifecycleColor = (value: VariableLifecycle) => {
  if (value === 'exploring') return 'arcoblue'
  if (value === 'online') return 'green'
  return 'orange'
}

const drawerVisible = ref(false)
const drawerState = reactive<{
  title: string
  levelLabel: string
  description: string
  stats: PanoramaStats
  typeTitle?: string
  categoryTitle?: string
  sourceTitle?: string
  lifecycle?: VariableLifecycle
  topics?: Array<{
    id: string
    name: string
    status: string
    owner: string
    updatedAt: string
    businessProblem?: string
    variableSync?: { variableId?: string; status?: string }
  }>
}>({
  title: '',
  levelLabel: '',
  description: '',
  stats: { totalVariables: 0, dataSources: 0, exploring: 0, online: 0, archived: 0 },
  topics: []
})

const drawerVariables = computed(() => {
  let list = [...allVariables]
  if (drawerState.typeTitle) {
    list = list.filter((item) => item.variableType === drawerState.typeTitle)
  }
  if (drawerState.categoryTitle) {
    list = list.filter((item) => item.exploreCategory === drawerState.categoryTitle)
  }
  if (drawerState.sourceTitle) {
    list = list.filter((item) => item.sourceGroup === drawerState.sourceTitle)
  }
  if (drawerState.lifecycle) {
    list = list.filter((item) => item.lifecycle === drawerState.lifecycle)
  }
  return list.slice(0, 8)
})

function titleToLifecycle(title: string): VariableLifecycle {
  if (title === '探索中') return 'exploring'
  if (title === '已上线') return 'online'
  return 'archived'
}

function openTypeDrawer(type: PanoramaTypeBranch | (PanoramaCategoryBranch & { stats: PanoramaStats })) {
  drawerState.title = type.title
  drawerState.levelLabel = '特征类型'
  drawerState.description = type.description
  drawerState.stats = type.stats || { totalVariables: 0, dataSources: 0, exploring: 0, online: 0, archived: 0 }
  drawerState.typeTitle = type.title
  drawerState.categoryTitle = undefined
  drawerState.sourceTitle = undefined
  drawerState.lifecycle = undefined
  drawerVisible.value = true
}

function openCategoryDrawer(category: PanoramaCategoryBranch) {
  drawerState.title = category.title
  drawerState.levelLabel = '探索分类'
  drawerState.description = category.description
  drawerState.stats = category.stats || { totalVariables: 0, dataSources: 0, exploring: 0, online: 0, archived: 0 }
  drawerState.typeTitle = selectedType.value.title
  drawerState.categoryTitle = category.title
  drawerState.sourceTitle = undefined
  drawerState.lifecycle = undefined
  drawerVisible.value = true
}

function openSourceDrawer(category: PanoramaCategoryBranch, source: PanoramaSourceBranch) {
  drawerState.title = source.title
  drawerState.levelLabel = '来源结构'
  drawerState.description = source.description
  drawerState.stats = source.stats
  drawerState.typeTitle = selectedType.value.title
  drawerState.categoryTitle = category.title
  drawerState.sourceTitle = source.title
  drawerState.lifecycle = undefined
  drawerVisible.value = true
}

function openLifecycleDrawer(category: PanoramaCategoryBranch, source: PanoramaSourceBranch, lifecycle: PanoramaLifecycleBranch) {
  drawerState.title = `${source.title} / ${lifecycle.title}`
  drawerState.levelLabel = '生命周期'
  drawerState.description = `查看 ${selectedType.value.title} / ${category.title} 在 ${source.title} 下，处于${lifecycle.title}状态的特征样例与统计。`
  drawerState.stats = lifecycle.stats
  drawerState.typeTitle = selectedType.value.title
  drawerState.categoryTitle = category.title
  drawerState.sourceTitle = source.title
  drawerState.lifecycle = titleToLifecycle(lifecycle.title)
  drawerVisible.value = true
}

/**
 * 打开"探索来源"抽屉，展示该分类下的所有探索课题
 */
function openTopicListDrawer(cat: { id: string; title: string }) {
  const topics = getTopicsByCategory(cat.id)
  drawerState.title = `${cat.title} · 探索来源`
  drawerState.levelLabel = '探索课题'
  drawerState.description = `${selectedType.value.title} / ${cat.title} 下的所有探索课题。`
  drawerState.stats = cat.stats || { totalVariables: 0, dataSources: 0, exploring: 0, online: 0, archived: 0 }
  drawerState.typeTitle = selectedType.value.title
  drawerState.categoryTitle = cat.title
  drawerState.sourceTitle = undefined
  drawerState.lifecycle = undefined
  drawerState.topics = topics.map((t) => ({
    id: t.id,
    name: t.name,
    status: t.status,
    owner: t.owner,
    updatedAt: t.updatedAt,
    businessProblem: t.businessProblem,
    variableSync: t.variableSync
  }))
  drawerVisible.value = true
}

/**
 * 跳转到探索课题详情
 */
const goToTopic = (topicId: string) => {
  router.push(`/explore/topics/${topicId}`)
}

type MindTreeLevel = 'type' | 'category' | 'source' | 'lifecycle'

interface MindTreeNode {
  key: string
  title: string
  subtitle?: string
  description?: string
  level: MindTreeLevel
  stats?: PanoramaStats
  categoryRef?: PanoramaCategoryBranch
  sourceRef?: PanoramaSourceBranch
  lifecycleRef?: PanoramaLifecycleBranch
  children?: MindTreeNode[]
}

const expandedKeys = ref<Record<string, boolean>>({})

function setExpanded(key: string, value: boolean) {
  expandedKeys.value = { ...expandedKeys.value, [key]: value }
}

function toggleExpanded(key: string) {
  setExpanded(key, !expandedKeys.value[key])
}

watch(
  () => selectedTypeId.value,
  () => {
    const next: Record<string, boolean> = {}
    const rootKey = `type:${selectedType.value.id}`
    next[rootKey] = true
    selectedType.value.categories.forEach((category) => {
      next[`category:${category.id}`] = true
    })
    expandedKeys.value = next
  },
  { immediate: true }
)

const categorySummary = computed(() => {
  return selectedType.value.categories.map((cat) => ({
    id: cat.id,
    title: cat.title,
    description: cat.description,
    stats: cat.stats
  }))
})

const totalVariablesUnderType = computed(() =>
  categorySummary.value.reduce((acc, item) => acc + (item.stats?.totalVariables || 0), 0)
)

/**
 * 课题状态映射
 */
const topicStatusLabel = (status) => ({
  exploring: '探索中',
  adopted: '已采纳',
  rejected: '已否决',
  paused: '已暂缓'
}[status] || status)

const topicStatusColor = (status) => ({
  exploring: 'arcoblue',
  adopted: 'green',
  rejected: 'red',
  paused: 'orange'
}[status] || 'gray')

// 特征同步状态（与 §6.5 对齐）
const syncStatusLabel = (status) => ({
  none: '无',
  pending_approval: '待审批',
  pending_deploy: '待部署',
  online: '已上线',
  rejected: '已驳回'
}[status] || '—')

const syncStatusColor = (status) => ({
  none: 'gray',
  pending_approval: 'arcoblue',
  pending_deploy: 'orange',
  online: 'green',
  rejected: 'red'
}[status] || 'gray')

/**
 * 分类卡 baseId（如 `behavior-behavior-loan`） → 提取分类 ID（如 `behavior-loan`）
 * 已知 selectedType.id 是 typeId（如 `behavior`），去掉前缀即可
 */
const extractCategoryId = (baseId, typeId) => {
  if (!baseId || !typeId) return ''
  const prefix = `${typeId}-`
  return baseId.startsWith(prefix) ? baseId.slice(prefix.length) : baseId
}

/**
 * 根据分类 ID 筛选探索课题（按更新时间倒序）
 */
const getTopicsByCategory = (baseId) => {
  const categoryId = extractCategoryId(baseId, selectedTypeId.value)
  if (!categoryId) return []
  return ExploreStore.listTopics().filter((t) => t.exploreCategoryId === categoryId)
}

const goToVariableList = (typeId, categoryId) => {
  // 跳转到特征字典并带预筛选条件（通过 query 实现）
  router.push({
    path: '/variable-management',
    query: {
      ...(typeId ? { variableTypeId: typeId } : {}),
      ...(categoryId ? { exploreCategoryId: categoryId } : {})
    }
  })
}

const mindTreeRoot = computed<MindTreeNode>(() => {
  const type = selectedType.value
  return {
    key: `type:${type.id}`,
    title: type.title,
    subtitle: type.subtitle,
    description: type.description,
    level: 'type',
    stats: type.stats,
    children: type.categories.map((category) => ({
      key: `category:${category.id}`,
      title: category.title,
      description: category.description,
      level: 'category',
      stats: category.stats,
      categoryRef: category,
      children: category.sources.map((source) => ({
        key: `source:${category.id}:${source.id}`,
        title: source.title,
        subtitle: source.subtitle,
        description: source.description,
        level: 'source',
        stats: source.stats,
        categoryRef: category,
        sourceRef: source,
        children: source.lifecycles.map((lifecycle) => ({
          key: `lifecycle:${category.id}:${source.id}:${lifecycle.id}`,
          title: lifecycle.title,
          level: 'lifecycle',
          stats: lifecycle.stats,
          categoryRef: category,
          sourceRef: source,
          lifecycleRef: lifecycle
        }))
      }))
    }))
  }
})

const MindTreeNodeView = defineComponent({
  name: 'MindTreeNodeView',
  props: {
    node: {
      type: Object as () => MindTreeNode,
      required: true
    }
  },
  setup(props) {
    const AButton = resolveComponent('a-button') as any
    const hasChildren = computed(() => Array.isArray(props.node.children) && props.node.children.length > 0)
    const isExpanded = computed(() => !!expandedKeys.value[props.node.key])
    const toggle = () => {
      if (!hasChildren.value) return
      toggleExpanded(props.node.key)
    }
    const openDetail = () => {
      const node = props.node
      if (node.level === 'type') {
        openTypeDrawer(selectedType.value)
        return
      }
      if (node.level === 'category' && node.categoryRef) {
        openCategoryDrawer(node.categoryRef)
        return
      }
      if (node.level === 'source' && node.categoryRef && node.sourceRef) {
        openSourceDrawer(node.categoryRef, node.sourceRef)
        return
      }
      if (node.level === 'lifecycle' && node.categoryRef && node.sourceRef && node.lifecycleRef) {
        openLifecycleDrawer(node.categoryRef, node.sourceRef, node.lifecycleRef)
      }
    }

    const statsText = computed(() => {
      const stats = props.node.stats
      if (!stats) return []
      return [
        `特征 ${stats.totalVariables}`,
        `数据源 ${stats.dataSources}`,
        `探索中 ${stats.exploring}`,
        `已上线 ${stats.online}`,
        `已归档 ${stats.archived}`
      ]
    })

    const toggleSymbol = computed(() => {
      if (!hasChildren.value) return ''
      return isExpanded.value ? '−' : '+'
    })

    return () =>
      h('div', { class: 'mindtree-node' }, [
        h('div', { class: 'mindtree-node-row' }, [
          h(
            'div',
            { class: 'mindtree-box', 'data-level': props.node.level, onClick: toggle },
            [
              h('div', { class: 'mindtree-box-top' }, [
                h('div', {}, [
                  h('div', { class: 'mindtree-title' }, [
                    h('span', { class: 'mindtree-toggle' }, toggleSymbol.value),
                    h('span', {}, props.node.title)
                  ]),
                  props.node.subtitle ? h('div', { class: 'mindtree-subtitle' }, props.node.subtitle) : null
                ]),
                h(
                  AButton,
                  {
                    size: 'mini',
                    type: 'text',
                    onClick: (e: Event) => {
                      e.stopPropagation()
                      openDetail()
                    }
                  },
                  { default: () => '详情' }
                )
              ]),
              props.node.description ? h('div', { class: 'mindtree-desc' }, props.node.description) : null,
              statsText.value.length
                ? h(
                    'div',
                    { class: 'mindtree-stats' },
                    statsText.value.map((item) => h('span', { key: item }, item))
                  )
                : null
            ].filter(Boolean)
          ),
          hasChildren.value && isExpanded.value
            ? h(
                'div',
                { class: 'mindtree-children' },
                props.node.children!.map((child) => h(MindTreeNodeView, { key: child.key, node: child }))
              )
            : null
        ])
      ])
  }
})
</script>

<style scoped>
.explore-map-page {
  min-height: calc(100vh - 88px);
  background: #f7f8fa;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
  margin-bottom: 16px;
}

.page-header h2 {
  margin: 0;
  font-size: 22px;
  line-height: 30px;
}

.page-header p {
  margin: 8px 0 0;
  color: #4e5969;
  max-width: 760px;
}

.summary-row {
  margin-bottom: 16px;
}

.summary-card,
.toolbar-card,
.panel-card {
  box-shadow: 0 8px 20px rgba(15, 35, 95, 0.06);
}

.toolbar-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 16px;
}

.toolbar-title {
  font-weight: 600;
  color: #1d2129;
}

.toolbar-desc {
  margin-top: 6px;
  color: #4e5969;
}

.type-selector {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.type-card {
  padding: 14px;
  border-radius: 14px;
  border: 1px solid #e5e6eb;
  background: #fff;
  cursor: pointer;
  transition: all 0.2s ease;
}

.type-card:hover,
.type-card.active {
  border-color: #165dff;
  box-shadow: 0 10px 20px rgba(22, 93, 255, 0.12);
}

.type-card-top,
.source-card-top,
.lifecycle-card-top,
.drawer-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.type-card-title,
.source-card-title,
.banner-title {
  font-weight: 600;
  color: #1d2129;
}

.type-card-subtitle,
.source-card-subtitle {
  margin-top: 6px;
  font-size: 12px;
  color: #86909c;
}

.type-card-stats,
.source-card-stats,
.lifecycle-stats,
.banner-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 14px;
  margin-top: 12px;
  font-size: 12px;
  color: #4e5969;
}

.custom-stat-title {
  font-size: 14px;
  color: rgb(var(--gray-8));
}

.custom-stat-value {
  margin-top: 10px;
  font-size: 32px;
  line-height: 1.2;
  color: #1d2129;
  font-weight: 600;
}

.content-row {
  margin-top: 16px;
}

.card-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

:deep(.mindtree-wrap) {
  padding: 14px;
  border-radius: 14px;
  background:
    linear-gradient(90deg, rgba(229, 230, 235, 0.6) 1px, transparent 1px),
    linear-gradient(rgba(229, 230, 235, 0.6) 1px, transparent 1px);
  background-size: 24px 24px;
  overflow-x: auto;
}

.category-summary-card {
  margin-bottom: 12px;
  border: 1px solid var(--color-border-2);
  transition: all 0.2s;
}

.category-summary-card:hover {
  border-color: #165dff;
  box-shadow: 0 4px 12px rgba(22, 93, 255, 0.1);
}

.cat-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-1);
  margin-bottom: 8px;
}

.cat-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 10px;
  min-height: 24px;
}

.cat-actions {
  display: flex;
  gap: 4px;
}

/* 第三层：分类卡内探索来源 */
.cat-topics {
  margin-top: 10px;
  padding: 8px;
  background: linear-gradient(135deg, #f0f7ff 0%, #f9f0ff 100%);
  border-radius: 6px;
  border: 1px dashed #d6e4ff;
}

.cat-topics-title {
  font-size: 12px;
  color: #86909c;
  margin-bottom: 6px;
}

.cat-topics-empty {
  font-size: 12px;
  color: #c9cdd4;
  text-align: center;
  padding: 4px 0;
}

.cat-topics-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.cat-topic-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.15s;
  overflow: hidden;
}

.cat-topic-item:hover {
  background: rgba(22, 93, 255, 0.08);
}

.cat-topic-name {
  font-size: 12px;
  color: #1d2129;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

/* 抽屉内的探索来源列表 */
.topic-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.topic-item {
  padding: 10px 12px;
  background: #fff;
  border: 1px solid var(--color-border-2);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}

.topic-item:hover {
  border-color: #722ed1;
  box-shadow: 0 2px 8px rgba(114, 46, 209, 0.1);
}

.topic-top {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.topic-name {
  font-size: 13px;
  font-weight: 500;
  color: #1d2129;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.topic-meta {
  font-size: 11px;
  color: #86909c;
  margin-bottom: 4px;
}

.topic-problem {
  font-size: 12px;
  color: #4e5969;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

:deep(.mindtree-node) {
  position: relative;
}

:deep(.mindtree-node-row) {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

:deep(.mindtree-box) {
  min-width: 300px;
  max-width: 420px;
  padding: 14px;
  border-radius: 14px;
  border: 1px solid #e5e6eb;
  background: #fff;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

:deep(.mindtree-box:hover) {
  border-color: #165dff;
  box-shadow: 0 10px 20px rgba(22, 93, 255, 0.12);
}

:deep(.mindtree-box[data-level='type']) {
  border-color: rgba(22, 93, 255, 0.4);
}

:deep(.mindtree-box[data-level='category']) {
  border-color: rgba(0, 180, 42, 0.32);
}

:deep(.mindtree-box[data-level='source']) {
  border-color: rgba(255, 125, 0, 0.35);
}

:deep(.mindtree-box[data-level='lifecycle']) {
  border-color: rgba(114, 46, 209, 0.28);
}

:deep(.mindtree-box-top) {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

:deep(.mindtree-title) {
  font-weight: 600;
  color: #1d2129;
  display: flex;
  align-items: center;
  gap: 6px;
}

:deep(.mindtree-toggle) {
  width: 18px;
  height: 18px;
  border-radius: 6px;
  border: 1px solid #c9cdd4;
  color: #4e5969;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  line-height: 18px;
  background: #fff;
}

:deep(.mindtree-subtitle) {
  margin-top: 6px;
  font-size: 12px;
  color: #86909c;
}

:deep(.mindtree-desc) {
  margin-top: 10px;
  color: #4e5969;
  line-height: 1.6;
}

:deep(.mindtree-stats) {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 14px;
  margin-top: 12px;
  font-size: 12px;
  color: #4e5969;
}

:deep(.mindtree-children) {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-left: 28px;
}

:deep(.mindtree-children)::before {
  content: '';
  position: absolute;
  left: 12px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #e5e6eb;
  border-radius: 2px;
}

:deep(.mindtree-children > .mindtree-node)::before {
  content: '';
  position: absolute;
  left: -16px;
  top: 22px;
  width: 16px;
  height: 2px;
  background: #e5e6eb;
}

.drawer-title {
  margin-bottom: 12px;
  font-weight: 600;
  color: #1d2129;
}

.sample-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sample-item {
  padding: 12px;
  border-radius: 12px;
  border: 1px solid #e5e6eb;
  background: #fff;
}

.sample-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.sample-meta {
  margin-top: 8px;
  color: #4e5969;
  font-size: 12px;
}

.sample-actions {
  margin-top: 8px;
}

.lifecycle-title {
  font-weight: 600;
  color: #1d2129;
}
</style>
