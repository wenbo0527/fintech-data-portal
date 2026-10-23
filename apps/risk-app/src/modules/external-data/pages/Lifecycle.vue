<template>
  <div class="external-data-lifecycle">
    <div class="page-header">
      <div class="header-content">
        <div class="header-info">
          <h2>外数生命周期</h2>
          <p class="page-description">统一查看外数引入、上线、评估与归档状态，联动档案与预算监控</p>
        </div>
        <div class="header-actions">
          <a-space>
            <a-button type="outline" @click="$router.push('/budget/monitor')">预算监控</a-button>
            <a-button type="primary" @click="$router.push('/variable-hub/external-data/archive')">外数档案</a-button>
          </a-space>
        </div>
      </div>
    </div>
    <a-grid :cols="4" :col-gap="12" :row-gap="12" class="section-grid nav-grid">
      <a-grid-item>
        <a-card hoverable class="nav-card" @click="goNav('/budget/overview')">
          <div class="nav-title">预算管理</div>
          <div class="nav-sub">总览与监控</div>
        </a-card>
      </a-grid-item>
      <a-grid-item>
        <a-card hoverable class="nav-card" @click="goNav('/variable-hub/external-data/archive')">
          <div class="nav-title">档案管理</div>
          <div class="nav-sub">档案与状态</div>
        </a-card>
      </a-grid-item>
      <a-grid-item>
        <a-card hoverable class="nav-card" @click="goNav('/variable-hub/external-data/evaluation')">
          <div class="nav-title">评估中心</div>
          <div class="nav-sub">报告与结论</div>
        </a-card>
      </a-grid-item>
      <a-grid-item>
        <a-card hoverable class="nav-card" @click="goNav('/variable-hub/external-data/service-scene')">
          <div class="nav-title">服务场景</div>
          <div class="nav-sub">场景与申请</div>
        </a-card>
      </a-grid-item>
    </a-grid>
    <a-grid :cols="4" :col-gap="12" :row-gap="12" class="section-grid">
      <a-grid-item>
        <a-card hoverable @click="goArchive('importing')" class="metric-card importing">
          <div class="metric-title">引入中</div>
          <div class="metric-value">{{ statusCounts.importing }}</div>
          <div class="metric-sub">点击查看对应档案</div>
        </a-card>
      </a-grid-item>
      <a-grid-item>
        <a-card hoverable @click="goArchive('online')" class="metric-card online">
          <div class="metric-title">已上线</div>
          <div class="metric-value">{{ statusCounts.online }}</div>
          <div class="metric-sub">点击查看对应档案</div>
        </a-card>
      </a-grid-item>
      <a-grid-item>
        <a-card hoverable @click="goArchive('pending_evaluation')" class="metric-card pending">
          <div class="metric-title">待评估</div>
          <div class="metric-value">{{ statusCounts.pending_evaluation }}</div>
          <div class="metric-sub">点击查看对应档案</div>
        </a-card>
      </a-grid-item>
      <a-grid-item>
        <a-card hoverable @click="goArchive('archived')" class="metric-card archived">
          <div class="metric-title">已归档</div>
          <div class="metric-value">{{ statusCounts.archived }}</div>
          <div class="metric-sub">点击查看对应档案</div>
        </a-card>
      </a-grid-item>
    </a-grid>

    <a-grid :cols="2" :col-gap="12" :row-gap="12" class="section-grid">
      <a-grid-item>
        <a-card title="预算燃尽图">
          <a-skeleton :loading="burndownLoading" animation>
            <BudgetBurndownTabs :chart-data="burndownChartData" @granularity-change="onGranularityChange" />
          </a-skeleton>
        </a-card>
      </a-grid-item>
      <a-grid-item>
        <a-card title="待办项">
          <a-skeleton :loading="tasksLoading" animation>
          <a-table :data="todoList" :pagination="false">
            <template #columns>
              <a-table-column title="任务" data-index="taskName" :width="200" />
              <a-table-column title="进度" :width="160">
                <template #cell="{ record }"><a-progress :percent="Number(record.progress||0)" size="small" /></template>
              </a-table-column>
              <a-table-column title="状态" :width="120">
                <template #cell="{ record }"><a-tag :status="taskTag(record.status)">{{ taskStatusLabel(record.status) }}</a-tag></template>
              </a-table-column>
            </template>
            <template #empty><a-empty description="暂无待办项" /></template>
          </a-table>
          </a-skeleton>
        </a-card>
      </a-grid-item>
    </a-grid>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { Message } from '@arco-design/web-vue'
import { useExternalDataStore } from '@/modules/external-data/stores'
import { useRouter } from 'vue-router'
import BudgetBurndownTabs from '@/components/modals/BudgetBurndownTabs.vue'
const store = useExternalDataStore()
const router = useRouter()

const mapStatus = (s?: string) => { if (s === 'active') return 'online'; if (s === 'inactive') return 'archived'; if (s === 'pending_evaluation') return 'pending_evaluation'; if (s === 'importing') return 'importing'; return (s || 'online') }
const statusCounts = computed(() => {
  const list = Array.isArray(store.products) ? store.products : []
  const counts = { importing: 0, online: 0, pending_evaluation: 0, archived: 0 }
  list.forEach((p: any) => { const st = mapStatus(p.status); if (st in counts) (counts as any)[st]++ })
  return counts
})
const burndownChartData = computed(() => store.burndown || [])
const todoList = computed(() => store.tasks || [])
const burndownLoading = computed(() => store.burndownLoading)
const tasksLoading = computed(() => store.tasksLoading)

const load = async () => { try { await store.fetchProducts(); await store.fetchBurndown({ range: 'month' }); await store.fetchTasks(); Message.success('已加载生命周期数据') } catch { Message.error('加载失败') } }
onMounted(load)
const goArchive = (status: string) => { router.push({ path: '/variable-hub/external-data/archive', query: { status } }) }
const goNav = (path: string) => { router.push(path) }
const onGranularityChange = async (g: 'month' | 'quarter') => { await store.fetchBurndown({ range: g }) }
const taskTag = (s?: string) => s === 'pending' ? 'default' : s === 'in_progress' ? 'warning' : s === 'completed' ? 'success' : 'default'
const taskStatusLabel = (s?: string) => s === 'pending' ? '待处理' : s === 'in_progress' ? '进行中' : s === 'completed' ? '已完成' : '—'
</script>

<style scoped>
.metric-value { font-size: 28px; font-weight: 600; }
.metric-sub { color: var(--color-text-2); margin-top: 4px; }
.metric-title { font-weight: 600; margin-bottom: 6px; }
.page-header { margin-bottom: 12px; }
.header-content { display: flex; align-items: center; justify-content: space-between; }
.header-info h2 { margin: 0 0 4px; }
.page-description { color: var(--color-text-2); }
.section-grid { margin-top: 12px; }
.nav-grid { margin-top: 12px; }
.nav-card { cursor: pointer; border: none; }
.nav-title { font-weight: 600; margin-bottom: 4px; }
.nav-sub { color: var(--color-text-2); }
</style>
