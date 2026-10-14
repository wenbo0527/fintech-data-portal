<template>
  <div class="metrics-map-page">
    <div class="map-header">
      <h2>指标地图</h2>
      <a-space>
        <a-input
          v-model="searchKeyword"
          placeholder="搜索指标名称 / 编码 / 同义词"
          allow-clear
          style="width: 240px"
          @press-enter="handleSearch"
          @clear="handleSearch"
        >
          <template #prefix><IconSearch /></template>
        </a-input>
        <a-button v-if="isAdmin" type="primary" @click="toggleSortMode">
          <template #icon><IconDragArrowVertical /></template>
          {{ sortMode ? '完成排序' : '顺序编辑' }}
        </a-button>
      </a-space>
    </div>

    <div class="map-body">
      <!-- 左侧筛选树 -->
      <div class="map-tree">
        <a-spin :loading="treeLoading">
          <a-tree
            :data="treeData"
            :default-expanded-keys="defaultExpandedKeys"
            @select="onTreeSelect"
          />
        </a-spin>
      </div>

      <!-- 右侧指标明细 -->
      <div class="map-content">
        <div class="content-toolbar" v-if="!sortMode">
          <span class="toolbar-info">
            共 {{ metricsList.length }} 个指标
            <template v-if="selectedDomain"> · {{ selectedDomain }}</template>
            <template v-if="selectedScenario"> · {{ selectedScenario }}</template>
            <template v-if="selectedType"> · {{ selectedTypeLabel }}</template>
            <template v-if="selectedStatus"> · {{ selectedStatusLabel }}</template>
          </span>
          <a-button v-if="hasFilter" size="small" @click="clearFilter">清除筛选</a-button>
        </div>
        <div class="content-toolbar" v-else>
          <a-space>
            <a-typography-text type="warning">拖拽可调整指标展示顺序，保存后生效</a-typography-text>
            <a-button @click="cancelSort">取消</a-button>
            <a-button type="primary" @click="saveSort">保存排序</a-button>
          </a-space>
        </div>

        <a-spin :loading="listLoading">
          <a-empty v-if="metricsList.length === 0" description="未找到匹配指标">
            <!-- E13：搜索无直接命中时给出相近推荐 -->
            <div v-if="similarSuggestions.length" class="suggest-box">
              <span class="suggest-label">没找到？试试相近指标：</span>
              <a-link
                v-for="s in similarSuggestions"
                :key="s.id"
                class="suggest-link"
                @click="goDetail(s.id)"
              >{{ s.name }}（{{ s.code }}）</a-link>
            </div>
          </a-empty>

          <div v-else class="metric-list">
            <div
              v-for="(m, idx) in metricsList"
              :key="m.id"
              class="metric-row"
              :class="{ 'sort-mode': sortMode }"
              :draggable="sortMode"
              @click="onCardClick(m)"
              @dragstart="onDragStart(idx)"
              @dragover.prevent="onDragOver(idx)"
              @drop="onDrop(idx)"
            >
              <IconDragArrowVertical v-if="sortMode" class="drag-handle" />
              <div class="row-content">
                <div class="row-top">
                  <span class="row-title">{{ m.name }}</span>
                  <a-tag :color="m.type === 'business' ? 'blue' : 'red'" size="small">
                    {{ m.type === 'business' ? '业务' : '监管' }}
                  </a-tag>
                  <span class="row-meta">{{ m.domain }} · {{ m.scenario }}</span>
                  <div class="row-side">
                    <span>更新：{{ frequencyLabel(m.calculationFrequency) }}</span>
                    <span>业务：{{ m.businessOwner }}</span>
                    <span>技术：{{ m.technicalOwner }}</span>
                  </div>
                </div>
                <div class="row-def" v-html="truncate(m.businessDefinition, 80)"></div>
              </div>
            </div>
          </div>
        </a-spin>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { MetricsCenterStore } from '@/mock-dca/metrics-center/store'
import { FREQUENCY_OPTIONS, TYPE_OPTIONS, STATUS_OPTIONS } from '@/mock-dca/metrics-center/data'
import type { MetricItem, MetricTreeNode } from '@/mock-dca/metrics-center/types'
import { useRoleStore } from '@/stores-dca/role'

const router = useRouter()
const roleStore = useRoleStore()
const isAdmin = computed(() => ['admin', 'data_admin'].includes(roleStore.currentRole))

const searchKeyword = ref('')
const treeLoading = ref(false)
const listLoading = ref(false)
const treeData = ref<MetricTreeNode[]>([])
const metricsList = ref<MetricItem[]>([])
const defaultExpandedKeys = ref<string[]>([])

// 当前选中筛选条件
const selectedDomain = ref('')
const selectedScenario = ref('')
const selectedType = ref('')
const selectedStatus = ref('')

// 排序模式
const sortMode = ref(false)
const dragIndex = ref(-1)

const allMetrics = ref<MetricItem[]>([])
/** 搜索无直接命中时的相近推荐（E13） */
const similarSuggestions = ref<MetricItem[]>([])

const hasFilter = computed(() =>
  selectedDomain.value || selectedScenario.value || selectedType.value || selectedStatus.value
)

const selectedTypeLabel = computed(() =>
  TYPE_OPTIONS.find(t => t.value === selectedType.value)?.label || ''
)
const selectedStatusLabel = computed(() =>
  STATUS_OPTIONS.find(s => s.value === selectedStatus.value)?.label || ''
)

function frequencyLabel(val: string) {
  return FREQUENCY_OPTIONS.find(f => f.value === val)?.label || val
}

function truncate(html: string, len: number): string {
  const text = html.replace(/<[^>]+>/g, '')
  return text.length > len ? text.slice(0, len) + '...' : text
}

/** 构建筛选树：指标域 → 场景 / 指标类型 / 指标状态 */
function buildFilterTree(): MetricTreeNode[] {
  const all = MetricsCenterStore.getAll()
  const tree: MetricTreeNode[] = []

  // 1) 指标域 → 场景
  const domainNode: MetricTreeNode = {
    key: 'group-domain',
    title: '指标域',
    children: [],
  }
  const domainMap = new Map<string, MetricTreeNode>()
  for (const m of all) {
    if (!domainMap.has(m.domain)) {
      const node: MetricTreeNode = {
        key: `domain-${m.domain}`,
        title: m.domain,
        domain: m.domain,
        children: [],
      }
      domainMap.set(m.domain, node)
      domainNode.children!.push(node)
    }
    const dNode = domainMap.get(m.domain)!
    if (!dNode.children!.some(c => c.scenario === m.scenario)) {
      dNode.children!.push({
        key: `scenario-${m.domain}-${m.scenario}`,
        title: m.scenario,
        domain: m.domain,
        scenario: m.scenario,
      })
    }
  }
  tree.push(domainNode)

  // 2) 指标类型
  const typeNode: MetricTreeNode = {
    key: 'group-type',
    title: '指标类型',
    children: TYPE_OPTIONS.map(t => ({
      key: `type-${t.value}`,
      title: t.label,
      metricType: t.value,
    })),
  }
  tree.push(typeNode)

  // 3) 指标状态
  const statusNode: MetricTreeNode = {
    key: 'group-status',
    title: '指标状态',
    children: STATUS_OPTIONS.map(s => ({
      key: `status-${s.value}`,
      title: s.label,
      metricStatus: s.value,
    })),
  }
  tree.push(statusNode)

  return tree
}

function loadTree() {
  treeLoading.value = true
  setTimeout(() => {
    treeData.value = buildFilterTree()
    defaultExpandedKeys.value = treeData.value.map(n => n.key)
    treeLoading.value = false
  }, 200)
}

function loadList() {
  listLoading.value = true
  setTimeout(() => {
    let all = MetricsCenterStore.getAll()
    similarSuggestions.value = []
    if (searchKeyword.value) {
      const kw = searchKeyword.value.trim().toLowerCase()
      // 与指标管理列表（MetricsCenterStore.query）保持同一搜索口径：名称 + 编码 + 同义词（AG-01）
      all = all.filter(
        m =>
          m.name.toLowerCase().includes(kw) ||
          m.code.toLowerCase().includes(kw) ||
          (m.agentMeta?.synonyms ?? []).some(s => s.toLowerCase().includes(kw))
      )
      // E13：无直接命中时按同义词/前缀给相近推荐
      if (all.length === 0) {
        similarSuggestions.value = MetricsCenterStore.suggestSimilar(searchKeyword.value.trim())
      }
    }
    all.sort((a, b) => a.sortOrder - b.sortOrder)
    allMetrics.value = all
    applyFilters()
    listLoading.value = false
  }, 200)
}

function handleSearch() {
  loadList()
}

function applyFilters() {
  let result = [...allMetrics.value]
  if (selectedDomain.value && !selectedScenario.value) {
    result = result.filter(m => m.domain === selectedDomain.value)
  } else if (selectedScenario.value) {
    result = result.filter(m =>
      m.domain === selectedDomain.value && m.scenario === selectedScenario.value
    )
  }
  if (selectedType.value) {
    result = result.filter(m => m.type === selectedType.value)
  }
  if (selectedStatus.value) {
    result = result.filter(m => m.status === selectedStatus.value)
  }
  metricsList.value = result
}

/** 按 key 在树数据中递归查找节点 */
function findNodeByKey(nodes: MetricTreeNode[], key: string): MetricTreeNode | null {
  for (const n of nodes) {
    if (n.key === key) return n
    if (n.children) {
      const found = findNodeByKey(n.children, key)
      if (found) return found
    }
  }
  return null
}

function clearAllFilters() {
  selectedDomain.value = ''
  selectedScenario.value = ''
  selectedType.value = ''
  selectedStatus.value = ''
}

function onTreeSelect(selectedKeys: (string | number)[]) {
  // 取消选中或点击分组节点 = 无筛选
  if (!selectedKeys || selectedKeys.length === 0) {
    clearAllFilters()
    applyFilters()
    return
  }

  const node = findNodeByKey(treeData.value, String(selectedKeys[0]))
  clearAllFilters()

  if (node) {
    if (node.domain && node.scenario) {
      selectedDomain.value = node.domain
      selectedScenario.value = node.scenario
    } else if (node.domain) {
      selectedDomain.value = node.domain
    } else if (node.metricType) {
      selectedType.value = node.metricType
    } else if (node.metricStatus) {
      selectedStatus.value = node.metricStatus
    }
    // 分组节点(group-*)无筛选属性，等效于清除筛选
  }
  applyFilters()
}

function clearFilter() {
  selectedDomain.value = ''
  selectedScenario.value = ''
  selectedType.value = ''
  selectedStatus.value = ''
  applyFilters()
}

function goDetail(id: string) {
  router.push({ name: 'metrics-center-detail', params: { id }, query: { from: 'map' } })
}

/** 点击卡片进入指标详情（排序模式下不跳转） */
function onCardClick(m: MetricItem) {
  if (sortMode.value) return
  goDetail(m.id)
}

function toggleSortMode() {
  sortMode.value = !sortMode.value
  if (sortMode.value) {
    Message.info('已进入顺序编辑模式，可拖拽调整指标展示顺序')
  }
}

function cancelSort() {
  sortMode.value = false
  applyFilters()
}

function saveSort() {
  const items = metricsList.value.map((m, idx) => ({
    id: m.id,
    sortOrder: idx + 1,
  }))
  MetricsCenterStore.updateSortOrder(items)
  sortMode.value = false
  allMetrics.value = [...metricsList.value]
  Message.success('排序已保存')
}

function onDragStart(idx: number) {
  dragIndex.value = idx
}

function onDragOver(_idx: number) {
  // 允许放置
}

function onDrop(idx: number) {
  if (dragIndex.value === -1 || dragIndex.value === idx) return
  const list = [...metricsList.value]
  const draggedItem = list[dragIndex.value]
  list.splice(dragIndex.value, 1)
  list.splice(idx, 0, draggedItem)
  metricsList.value = list
  dragIndex.value = -1
}

onMounted(() => {
  loadTree()
  loadList()
})
</script>

<style lang="scss" scoped>
.metrics-map-page {
  padding: 24px;

  .map-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;

    h2 { margin: 0; font-size: 20px; }
  }

  .map-body {
    display: flex;
    gap: 16px;

    .map-tree {
      width: 240px;
      flex-shrink: 0;
      background: #fff;
      border: 1px solid #e5e6eb;
      border-radius: 4px;
      padding: 12px;
      max-height: calc(100vh - 200px);
      overflow-y: auto;
    }

    .map-content {
      flex: 1;
      min-width: 0;

      .content-toolbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 0 12px;

        .toolbar-info {
          color: #86909c;
          font-size: 13px;
        }
      }
    }
  }

  .metric-list {
    background: #fff;
    border: 1px solid #e5e6eb;
    border-radius: 4px;
    overflow: hidden;
  }

  .suggest-box {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 4px;

    .suggest-label {
      color: #86909c;
      font-size: 13px;
    }

    .suggest-link {
      font-size: 13px;
    }
  }

  .metric-row {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 10px 16px;
    cursor: pointer;
    transition: background 0.2s;

    & + .metric-row {
      border-top: 1px solid #f2f3f5;
    }

    &:hover {
      background: #f7f8fa;
    }

    &.sort-mode {
      cursor: move;
    }

    .drag-handle {
      flex-shrink: 0;
      margin-top: 4px;
      color: #86909c;
      cursor: move;
    }

    .row-content {
      flex: 1;
      min-width: 0;
    }

    .row-top {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;

      .row-title {
        font-size: 14px;
        font-weight: 600;
        color: #1d2129;
      }

      .row-meta {
        font-size: 12px;
        color: #86909c;
      }

      .row-side {
        margin-left: auto;
        display: flex;
        gap: 16px;
        font-size: 12px;
        color: #86909c;
        white-space: nowrap;
      }
    }

    .row-def {
      margin-top: 2px;
      font-size: 12px;
      color: #4e5969;
      line-height: 1.6;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
}
</style>
