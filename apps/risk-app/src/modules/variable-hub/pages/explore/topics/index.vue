<template>
  <div class="explore-topics-page">
    <DmtPageHeader title="探索课题 / 需求" subtitle="展示探索课题全过程 + 需求 2 状态（需求受理/需求驳回）。">
      <template #extra>
        <a-button @click="router.push('/explore/map')">查看全景</a-button>
        <a-button @click="handleCreateDerivation">新建需求</a-button>
        <a-button type="primary" @click="handleCreateTopic">新建课题</a-button>
      </template>
    </DmtPageHeader>

    <a-card :bordered="false" class="filter-card">
      <a-space wrap size="large">
        <a-input v-model="filters.keyword" allow-clear placeholder="搜索课题/需求 名称 / 业务问题" style="width: 260px" />
        <a-select v-model="filters.demandType" allow-clear placeholder="需求类型" style="width: 160px" :options="demandTypeOptions" />
        <a-select v-model="filters.domain" allow-clear placeholder="业务域" style="width: 160px" :options="domainOptions" />
        <a-select v-model="filters.status" allow-clear placeholder="状态" style="width: 160px" :options="statusOptions" />
        <a-select v-model="filters.derivationStatus" allow-clear placeholder="需求状态" style="width: 160px" :options="derivationStatusOptions" />
        <a-select v-model="filters.visibility" allow-clear placeholder="可见性" style="width: 160px" :options="visibilityOptions" />
        <a-select v-model="filters.priority" allow-clear placeholder="优先级" style="width: 160px" :options="priorityOptions" />
        <a-button @click="resetFilters">重置</a-button>
      </a-space>
    </a-card>

    <DmtStatGroup :items="statItems" />

    <a-card :bordered="false" class="table-card">
      <a-table
        :columns="columns"
        :data="filteredTopics"
        :pagination="pagination"
        row-key="id"
        @page-change="handlePageChange"
        @page-size-change="handlePageSizeChange"
      >
        <template #nameCell="{ record }">
          <a-link @click="router.push(`/explore/topics/${record.id}`)">
            <a-tag v-if="record.demandType === 'derivation'" size="mini" color="purple" style="margin-right: 4px">需求</a-tag>
            <a-tag v-else size="mini" color="arcoblue" style="margin-right: 4px">探索课题</a-tag>
            {{ record.name }}
          </a-link>
        </template>
        <template #derivationStatusCell="{ record }">
          <a-tag v-if="record.derivationStatus" :color="derivationStatusColor(record.derivationStatus)">
            {{ derivationStatusLabel(record.derivationStatus) }}
          </a-tag>
          <span v-else class="muted">—</span>
        </template>
        <template #featureIdCell="{ record }">
          <a-link v-if="record.featureId" @click="router.push(`/variable-management/detail/${record.featureId}`)">{{ record.featureId }}</a-link>
          <span v-else class="muted">—</span>
        </template>
        <template #domainCell="{ record }">
          <a-space wrap>
            <a-tag v-for="tag in record.domainTags" :key="tag" color="arcoblue">{{ tag }}</a-tag>
          </a-space>
        </template>
        <template #statusCell="{ record }">
          <a-tag :color="statusColor(record.status)">{{ statusLabel(record.status) }}</a-tag>
        </template>
        <template #priorityCell="{ record }">
          <a-tag :color="priorityColor(record.priority)">{{ priorityLabel(record.priority) }}</a-tag>
        </template>
        <template #visibilityCell="{ record }">
          <a-tag :color="visibilityColor(record.visibility)">{{ visibilityLabel(record.visibility) }}</a-tag>
        </template>
        <template #syncStatusCell="{ record }">
          <a-tag v-if="record.variableSync" :color="syncStatusColor(record.variableSync.status)">
            {{ syncStatusLabel(record.variableSync.status) }}
          </a-tag>
          <span v-else class="muted">—</span>
        </template>
        <template #resourcesCell="{ record }">
          <a-space wrap>
            <a-tag v-for="item in record.relatedResources" :key="item.type + item.name" size="small">
              {{ item.displayName }}
            </a-tag>
          </a-space>
        </template>
        <template #actionCell="{ record }">
          <a-space>
            <a-button type="text" size="small" @click="router.push(`/explore/topics/${record.id}`)">详情</a-button>
            <a-button type="text" size="small" @click="handleQuickCompare(record.id)">对比</a-button>
          </a-space>
        </template>
      </a-table>
    </a-card>

    <a-modal v-model:visible="createVisible" title="新建课题（Demo）" ok-text="保存" cancel-text="取消" @ok="handleCreateSubmit">
      <a-form :model="createForm" layout="vertical">
        <a-form-item label="课题名称">
          <a-input v-model="createForm.name" placeholder="例如：风控_逾期前行为特征_202606" />
        </a-form-item>
        <a-form-item label="业务问题">
          <a-textarea v-model="createForm.businessProblem" placeholder="描述具体的业务痛点" :max-length="120" show-word-limit />
        </a-form-item>
        <a-form-item label="特征假设">
          <a-textarea v-model="createForm.hypothesis" placeholder="描述要验证的假设" :max-length="120" show-word-limit />
        </a-form-item>
        <a-form-item label="业务域标签">
          <a-select v-model="createForm.domain" :options="domainOptions" placeholder="选择业务域" />
        </a-form-item>
        <a-form-item label="目标特征类型">
          <a-select v-model="createForm.variableTypeId" placeholder="选择特征类型" :options="variableTypeOptions" allow-clear />
        </a-form-item>
        <a-form-item label="探索分类">
          <a-select v-model="createForm.exploreCategoryId" placeholder="选择探索分类" :options="categoryOptions" allow-clear />
        </a-form-item>
        <a-form-item label="关联数据源">
          <a-select v-model="createForm.dataSourceId" placeholder="选择数据源" :options="dataSourceOptions" allow-clear />
        </a-form-item>
        <a-form-item label="关联已有特征">
          <a-select
            v-model="createForm.relatedVariableIds"
            multiple
            allow-search
            allow-clear
            placeholder="选择可复用/对比的特征（可多选）"
            :options="variableOptions"
          />
        </a-form-item>
        <a-form-item label="可见性">
          <a-select v-model="createForm.visibility" :options="visibilityOptions" placeholder="选择可见性" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { Message } from '@arco-design/web-vue'
import { useRouter } from 'vue-router'
import { ExploreStore, type ExplorePriority, type ExploreTopicStatus, type ExploreVisibility, type VariableSyncStatus } from '@/modules/variable-hub/mock/explore/explore-store'
import { ExploreTaxonomyStore } from '@/modules/variable-hub/mock/explore/explore-taxonomy-store'
import { getDataSources } from '@/modules/variable-hub/api/variable-management'
import { variableAssets } from '@/modules/variable-hub/mock/variable-management/variables'
import { VariableDraftStore } from '@/modules/variable-hub/mock/variable-management/variable-draft-store'
import DmtPageHeader from '@/modules/variable-hub/components/PageHeader.vue'
import DmtStatGroup from '@/modules/variable-hub/components/StatGroup.vue'

const router = useRouter()

const filters = reactive({
  keyword: '',
  demandType: '' as '' | 'topic' | 'derivation',
  domain: '',
  status: '' as '' | ExploreTopicStatus,
  derivationStatus: '' as '' | 'requirement_accepted' | 'rejected',
  visibility: '' as '' | ExploreVisibility,
  priority: '' as '' | ExplorePriority
})

// 演示用：1 秒轮询触发响应式更新，让 mock 同步延迟的台账自动刷新
const tickRef = ref(0)
let pollTimer: number | undefined
onMounted(() => {
  pollTimer = window.setInterval(() => {
    tickRef.value++
  }, 1000)
})
onUnmounted(() => {
  if (pollTimer) {
    window.clearInterval(pollTimer)
    pollTimer = undefined
  }
})

const summary = computed(() => {
  void tickRef.value
  return ExploreStore.listStatusSummary()
})

const statItems = computed(() => [
  { title: '课题总数', value: summary.value.total, iconText: '#', iconBg: '#f0f7ff', iconColor: '#165dff', subtitle: '当前可见' },
  { title: '探索中', value: summary.value.statusCounts.exploring, iconText: '○', iconBg: '#e6fffb', iconColor: '#0fc6c2', subtitle: '进行中' },
  { title: '已采纳', value: summary.value.statusCounts.adopted, iconText: '✓', iconBg: '#e8ffea', iconColor: '#00b42a', subtitle: '进入特征字典' },
  { title: '已否决/暂缓', value: summary.value.statusCounts.rejected + summary.value.statusCounts.paused, iconText: '×', iconBg: '#fff1f0', iconColor: '#f53f3f', subtitle: '暂不推进' }
])

const allTopics = computed(() => {
  void tickRef.value
  return ExploreStore.listTopics()
})

const domainOptions = [
  { label: '风控', value: '风控' },
  { label: '营销', value: '营销' },
  { label: '反欺诈', value: '反欺诈' },
  { label: '客户画像', value: '客户画像' }
]

const demandTypeOptions = [
  { label: '探索课题', value: 'topic' },
  { label: '需求', value: 'derivation' }
]

const derivationStatusOptions = [
  { label: '需求受理', value: 'requirement_accepted' },
  { label: '需求驳回', value: 'rejected' }
]

const derivationStatusLabel = (s: string) => ({
  requirement_accepted: '需求受理',
  rejected: '需求驳回'
}[s] || s)

const derivationStatusColor = (s: string) => ({
  requirement_accepted: 'blue',
  rejected: 'red'
}[s] || 'gray')

const statusOptions = [
  { label: '探索中', value: 'exploring' },
  { label: '已采纳', value: 'adopted' },
  { label: '已否决', value: 'rejected' },
  { label: '已暂缓', value: 'paused' }
]

const visibilityOptions = [
  { label: '团队内', value: 'team' },
  { label: '全公司可见', value: 'company' },
  { label: '仅审计可见', value: 'audit' }
]

const priorityOptions = [
  { label: '高', value: 'high' },
  { label: '中', value: 'medium' },
  { label: '低', value: 'low' }
]

const statusLabel = (value: ExploreTopicStatus) => ({
  exploring: '探索中',
  adopted: '已采纳',
  rejected: '已否决',
  paused: '已暂缓'
}[value])

const statusColor = (value: ExploreTopicStatus) => ({
  exploring: 'arcoblue',
  adopted: 'green',
  rejected: 'red',
  paused: 'orange'
}[value])

const priorityLabel = (value: ExplorePriority) => ({ high: '高', medium: '中', low: '低' }[value])
const priorityColor = (value: ExplorePriority) => ({ high: 'red', medium: 'orange', low: 'gray' }[value])

const visibilityLabel = (value: ExploreVisibility) => ({
  team: '团队内',
  company: '全公司可见',
  audit: '仅审计可见'
}[value])

const visibilityColor = (value: ExploreVisibility) => ({
  team: 'arcoblue',
  company: 'green',
  audit: 'purple'
}[value])

const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showTotal: true,
  showJumper: true,
  showPageSize: true
})

const filteredTopics = computed(() => {
  let list = [...allTopics.value]
  const keyword = filters.keyword.trim().toLowerCase()
  if (keyword) {
    list = list.filter((item) => item.name.toLowerCase().includes(keyword) || item.businessProblem.toLowerCase().includes(keyword))
  }
  if (filters.demandType) {
    list = list.filter((item) => (item.demandType || 'topic') === filters.demandType)
  }
  if (filters.domain) {
    list = list.filter((item) => item.domainTags.includes(filters.domain))
  }
  if (filters.status) {
    list = list.filter((item) => item.status === filters.status)
  }
  if (filters.derivationStatus) {
    list = list.filter((item) => item.derivationStatus === filters.derivationStatus)
  }
  if (filters.visibility) {
    list = list.filter((item) => item.visibility === filters.visibility)
  }
  if (filters.priority) {
    list = list.filter((item) => item.priority === filters.priority)
  }
  pagination.total = list.length
  const start = (pagination.current - 1) * pagination.pageSize
  return list.slice(start, start + pagination.pageSize)
})

const handlePageChange = (page: number) => {
  pagination.current = page
}

const handlePageSizeChange = (pageSize: number) => {
  pagination.pageSize = pageSize
  pagination.current = 1
}

const resetFilters = () => {
  filters.keyword = ''
  filters.domain = ''
  filters.status = ''
  filters.visibility = ''
  filters.priority = ''
  pagination.current = 1
}

const columns = [
  { title: '需求名称', dataIndex: 'name', slotName: 'nameCell', width: 280 },
  { title: '业务域', dataIndex: 'domainTags', slotName: 'domainCell', width: 140 },
  { title: '需求状态', dataIndex: 'status', slotName: 'statusCell', width: 110 },
  { title: '衍生需求状态', dataIndex: 'derivationStatus', slotName: 'derivationStatusCell', width: 130 },
  { title: '关联特征ID', dataIndex: 'featureId', slotName: 'featureIdCell', width: 170 },
  { title: '优先级', dataIndex: 'priority', slotName: 'priorityCell', width: 100 },
  { title: '可见性', dataIndex: 'visibility', slotName: 'visibilityCell', width: 120 },
  { title: '特征同步', dataIndex: 'variableSync', slotName: 'syncStatusCell', width: 130 },
  { title: '负责人', dataIndex: 'owner', width: 100 },
  { title: '关联资源', dataIndex: 'relatedResources', slotName: 'resourcesCell' },
  { title: '更新时间', dataIndex: 'updatedAt', width: 150 },
  { title: '操作', dataIndex: 'action', slotName: 'actionCell', width: 140 }
]

// §6.5 特征同步状态映射
const syncStatusLabel = (value: VariableSyncStatus): string => ({
  none: '无关联特征',
  pending_approval: '待审批',
  pending_deploy: '待部署',
  online: '已上线',
  rejected: '审批驳回'
}[value])

const syncStatusColor = (value: VariableSyncStatus): string => ({
  none: 'gray',
  pending_approval: 'arcoblue',
  pending_deploy: 'orange',
  online: 'green',
  rejected: 'red'
}[value])

const createVisible = ref(false)
const createForm = reactive({
  name: '',
  businessProblem: '',
  hypothesis: '',
  domain: '风控',
  visibility: 'team' as ExploreVisibility,
  variableTypeId: '',
  exploreCategoryId: '',
  dataSourceId: '',
  relatedVariableIds: [] as string[]
})

const handleCreateTopic = () => {
  createForm.name = ''
  createForm.businessProblem = ''
  createForm.hypothesis = ''
  createForm.domain = '风控'
  createForm.visibility = 'team'
  createForm.variableTypeId = ''
  createForm.exploreCategoryId = ''
  createForm.dataSourceId = ''
  createForm.relatedVariableIds = []
  createVisible.value = true
}

// 新建衍生需求（文档 §三 模块 A · F-01）
// 跳转到 /variable-management 并携带 query 参数，触发 DerivationCreateModal
const handleCreateDerivation = () => {
  router.push({ path: '/variable-management', query: { action: 'create_derivation' } })
}

const variableTypeOptions = computed(() =>
  ExploreTaxonomyStore.listTypes().map((t) => ({ label: t.title, value: t.id }))
)

const categoryOptions = computed(() => {
  if (!createForm.variableTypeId) return []
  return ExploreTaxonomyStore.listLeafCategories(createForm.variableTypeId).map((c) => ({ label: c.title, value: c.id }))
})

watch(
  () => createForm.variableTypeId,
  () => {
    createForm.exploreCategoryId = ''
  }
)

const dataSourceOptions = ref<Array<{ label: string; value: string }>>([])

const variableOptions = computed(() => {
  const list = [...VariableDraftStore.list(), ...variableAssets]
  return list.slice(0, 100).map((v: any) => ({
    label: `${v.name}（${v.id}）`,
    value: v.id
  }))
})

onMounted(async () => {
  const res: any = await getDataSources()
  const list = Array.isArray(res?.data) ? res.data : []
  dataSourceOptions.value = list.map((s: any) => ({ label: s.name, value: s.id }))
})

const handleCreateSubmit = () => {
  if (!createForm.name.trim()) {
    Message.warning('请填写课题名称')
    return
  }
  const type = ExploreTaxonomyStore.getTypeById(createForm.variableTypeId)
  const category = ExploreTaxonomyStore.listLeafCategories(createForm.variableTypeId).find((c) => c.id === createForm.exploreCategoryId)
  const ds = dataSourceOptions.value.find((d) => d.value === createForm.dataSourceId)

  const variableMap = new Map([...VariableDraftStore.list(), ...variableAssets].map((v: any) => [v.id, v.name]))
  const relatedResources: any[] = []
  if (ds) relatedResources.push({ type: 'data_source', name: ds.value, displayName: ds.label })
  createForm.relatedVariableIds.forEach((id) => {
    const name = variableMap.get(id) || id
    relatedResources.push({ type: 'variable', name: id, displayName: `特征：${name}` })
  })

  const topic = ExploreStore.addTopic({
    name: createForm.name.trim(),
    businessProblem: createForm.businessProblem.trim(),
    hypothesis: createForm.hypothesis.trim(),
    domain: createForm.domain,
    visibility: createForm.visibility,
    variableTypeId: createForm.variableTypeId || undefined,
    variableTypeTags: type ? [type.title] : [],
    exploreCategoryId: createForm.exploreCategoryId || undefined,
    exploreCategoryTitle: category?.title,
    relatedDataSourceId: createForm.dataSourceId || undefined,
    relatedDataSourceName: ds?.label,
    relatedVariableIds: [...createForm.relatedVariableIds],
    relatedResources
  })

  Message.success('已保存并进入详情（Demo）')
  createVisible.value = false
  router.push(`/explore/topics/${topic.id}`)
}

const handleQuickCompare = (topicId: string) => {
  router.push({ path: '/explore/compare', query: { topicId } })
}
</script>

<style scoped>
.explore-topics-page {
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
}

.filter-card,
.table-card {
  box-shadow: 0 8px 20px rgba(15, 35, 95, 0.06);
}

.summary-row {
  margin: 16px 0;
}

.muted {
  color: #c9cdd4;
}
</style>
