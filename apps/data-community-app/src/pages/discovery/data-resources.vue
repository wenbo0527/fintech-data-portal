<template>
  <div class="data-resources-page">
    <PageBanner
      v-model:search="search"
      :title="selectedCategory ? `数据资源目录 · ${selectedCategory.name}` : '数据资源目录'"
      :subtitle="selectedCategory ? selectedCategory.description : '业务数据库 / 交易库 / 风险库 等核心交易源系统的注册与元数据同步'"
      :search-placeholder="selectedCategory ? '输入系统名称、库名或负责人搜索' : '搜索主题'"
    >
      <template #actions>
        <a-button v-if="selectedCategory" size="large" @click="goBack">
          <template #icon><icon-left /></template>
          返回
        </a-button>
        <a-button v-else class="action-btn" size="large" @click="showMissingTicket({ assetType: 'table', pageSource: '数据资源目录' })">
          <template #icon><icon-plus /></template>
          缺失工单
        </a-button>
      </template>
    </PageBanner>

    <!-- 一级：主题卡片网格 -->
    <div v-if="!selectedCategory" class="main-content">
      <a-row :gutter="[16, 16]">
        <a-col v-for="cat in filteredCategories" :key="cat.code" :xs="24" :sm="12" :md="8" :lg="6">
          <a-card hoverable :bordered="false" class="theme-card" @click="selectCategory(cat)">
            <div class="theme-card-header">
              <a-tag :color="cat.color" size="large">{{ cat.name }}</a-tag>
            </div>
            <div class="theme-card-count">{{ cat.count }}<span class="theme-card-unit"> 个系统</span></div>
            <div class="theme-card-desc">{{ cat.description }}</div>
            <div class="theme-card-footer"><span>点击查看详情</span><icon-right /></div>
          </a-card>
        </a-col>
      </a-row>
    </div>

    <!-- 二级：详情表格 -->
    <div v-else class="main-content">
      <a-card :bordered="false">
        <a-table :columns="columns" :data="filteredList" :pagination="{ pageSize: 10, showTotal: true }" row-key="id" size="medium">
          <template #dbType="{ record }">
            <a-tag :color="getDbTypeColor(record.dbType)">{{ record.dbType.toUpperCase() }}</a-tag>
          </template>
          <template #actions="{ record }">
            <a-button type="text" size="small" @click="goToTables(record)">查看表结构</a-button>
          </template>
        </a-table>
      </a-card>
    </div>

    <!-- 缺失工单弹窗 -->
    <MissingTicketModal
      v-model:visible="showMissingTicketModal"
      :context="ticketContext"
      @confirm="handleMissingTicketConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { IconPlus, IconLeft, IconRight } from '@arco-design/web-vue/es/icon'
import PageBanner from '@/components-dca/common/PageBanner.vue'
import MissingTicketModal from '@/pages/search/MissingTicketModal.vue'
import { useMissingTicket } from '@/composables/useMissingTicket'

const { showMissingTicketModal, ticketContext, showMissingTicket, handleMissingTicketConfirm } = useMissingTicket()

const router = useRouter()
const search = ref('')
const selectedCategory = ref<any>(null)

const businessSystems = ref([
  { id: 'BS001', name: '核心交易系统', dbType: 'mysql', systemType: 'core', systemTypeLabel: '核心交易', database: 'core_trade', tableCount: 320, owner: '李开发', updatedAt: '今天 10:30', classifyId: 'SYS-002' },
  { id: 'BS002', name: '风控决策引擎', dbType: 'doris', systemType: 'risk', systemTypeLabel: '风控系统', database: 'risk_decision', tableCount: 180, owner: '张风控', updatedAt: '今天 09:15', classifyId: 'SYS-001' },
  { id: 'BS003', name: '用户中心', dbType: 'pg', systemType: 'core', systemTypeLabel: '核心交易', database: 'user_center', tableCount: 95, owner: '王运营', updatedAt: '今天 11:20', classifyId: 'SYS-002' },
  { id: 'BS004', name: '营销活动平台', dbType: 'hive', systemType: 'marketing', systemTypeLabel: '营销系统', database: 'mkt_platform', tableCount: 420, owner: '陈营销', updatedAt: '今天 08:45', classifyId: 'SYS-001' },
  { id: 'BS005', name: '财务核算系统', dbType: 'oracle', systemType: 'finance', systemTypeLabel: '财务系统', database: 'fin_acc', tableCount: 220, owner: '吴财务', updatedAt: '昨天 17:30', classifyId: 'SYS-002' },
  { id: 'BS006', name: '数据分析平台', dbType: 'clickhouse', systemType: 'core', systemTypeLabel: '核心交易', database: 'olap', tableCount: 180, owner: '王运营', updatedAt: '今天 14:15', classifyId: 'SYS-001' }
])

const categories = computed(() => [
  { code: 'core', name: '核心交易', count: businessSystems.value.filter(s => s.systemType === 'core').length, description: '核心交易、用户中心等源系统', color: 'arcoblue' },
  { code: 'risk', name: '风控系统', count: businessSystems.value.filter(s => s.systemType === 'risk').length, description: '风控决策引擎等风险管理系统', color: 'red' },
  { code: 'marketing', name: '营销系统', count: businessSystems.value.filter(s => s.systemType === 'marketing').length, description: '营销活动平台等营销系统', color: 'green' },
  { code: 'finance', name: '财务系统', count: businessSystems.value.filter(s => s.systemType === 'finance').length, description: '财务核算等财务类系统', color: 'orange' }
])

const filteredCategories = computed(() => {
  if (!search.value) return categories.value
  const k = search.value.toLowerCase()
  return categories.value.filter(c => c.name.toLowerCase().includes(k) || c.description.toLowerCase().includes(k))
})

function matchSearch(s: any) {
  if (!search.value) return true
  const k = search.value.toLowerCase()
  return s.name.toLowerCase().includes(k) || s.database.toLowerCase().includes(k) || s.owner.toLowerCase().includes(k)
}

const filteredList = computed(() => {
  if (!selectedCategory.value) return []
  return businessSystems.value.filter(s => s.systemType === selectedCategory.value.code).filter(matchSearch)
})

function selectCategory(cat: any) { selectedCategory.value = cat; search.value = '' }
function goBack() { selectedCategory.value = null; search.value = '' }

const columns = [
  { title: '系统ID', dataIndex: 'id', width: 100 },
  { title: '系统名称', dataIndex: 'name', width: 160 },
  { title: '数据库类型', dataIndex: 'dbType', slotName: 'dbType', width: 110 },
  { title: '数据库名', dataIndex: 'database', width: 160 },
  { title: '表数量', dataIndex: 'tableCount', width: 100 },
  { title: '负责人', dataIndex: 'owner', width: 100 },
  { title: '更新时间', dataIndex: 'updatedAt', width: 120 },
  { title: '操作', slotName: 'actions', width: 120, fixed: 'right' as const }
]

function goToTables(s: any) {
  // 留在发现域，跳转到资产目录按系统筛选
  router.push({ name: 'asset-catalog', query: { source: s.name } })
}
function getDbTypeColor(t: string) {
  return ({ mysql: 'arcoblue', doris: 'green', pg: 'cyan', hive: 'orange', oracle: 'red', clickhouse: 'purple' }[t]) || 'gray'
}
</script>

<style scoped>
.data-resources-page { min-height: 100vh; background: var(--dca-bg-page-alt); position: relative; overflow-x: hidden; }
.action-btn { white-space: nowrap; }
.main-content { padding: 0 40px var(--dca-spacing-2xl); width: 100%; max-width: var(--dca-page-max-width-wide); margin: -40px auto 0; position: relative; z-index: 3; }
.theme-card { cursor: pointer; transition: all 0.3s; border-radius: var(--dca-radius-lg); }
.theme-card:hover { transform: translateY(-4px); box-shadow: var(--dca-shadow-lg); }
.theme-card-header { margin-bottom: var(--dca-spacing-md); }
.theme-card-count { font-size: 32px; font-weight: 700; color: var(--dca-text-primary); margin-bottom: var(--dca-spacing-xs); }
.theme-card-unit { font-size: var(--dca-font-md); font-weight: 400; color: var(--dca-text-tertiary); }
.theme-card-desc { font-size: var(--dca-font-sm); color: var(--dca-text-secondary); margin-bottom: var(--dca-spacing-md); line-height: 1.5; }
.theme-card-footer { display: flex; justify-content: space-between; align-items: center; font-size: var(--dca-font-sm); color: var(--dca-text-tertiary); border-top: 1px solid var(--dca-border-light); padding-top: var(--dca-spacing-sm); }
</style>
