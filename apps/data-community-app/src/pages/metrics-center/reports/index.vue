<template>
  <div class="reports-page">
    <!-- 页头 -->
    <div class="page-header">
      <div>
        <h2>报表管理</h2>
        <span class="header-desc">报表库是报表实体与 Agent 调用契约（AG-09/AG-10）的唯一维护处，指标侧仅引用挂载</span>
      </div>
      <a-space>
        <a-button type="primary" @click="goCreate">
          <template #icon><IconPlus /></template>
          新增报表
        </a-button>
        <a-button @click="goMetrics">
          <template #icon><IconSwap /></template>
          返回指标管理
        </a-button>
      </a-space>
    </div>

    <!-- 筛选 -->
    <div class="filter-section">
      <a-row :gutter="12">
        <a-col :span="7">
          <a-input
            v-model="filters.keyword"
            placeholder="搜索报表名称"
            allow-clear
            @press-enter="load"
            @clear="load"
          >
            <template #prefix><IconSearch /></template>
          </a-input>
        </a-col>
        <a-col :span="5">
          <a-select v-model="filters.type" placeholder="报表类型" allow-clear @change="load">
            <a-option v-for="o in REPORT_TYPE_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</a-option>
          </a-select>
        </a-col>
        <a-col :span="5">
          <a-select v-model="filters.status" placeholder="状态" allow-clear @change="load">
            <a-option value="active">启用中</a-option>
            <a-option value="offline">已下线</a-option>
          </a-select>
        </a-col>
        <a-col :span="4">
          <a-button @click="handleReset">重置</a-button>
        </a-col>
      </a-row>
    </div>

    <!-- 列表 -->
    <a-table
      :data="tableData"
      :pagination="{
        total: total,
        current: currentPage,
        pageSize: pageSize,
        showTotal: true,
        showPageSize: true,
      }"
      :loading="loading"
      row-key="id"
      :scroll="{ x: 1200 }"
      @page-change="(p: number) => (currentPage = p)"
      @page-size-change="(s: number) => { pageSize = s; currentPage = 1 }"
    >
      <template #columns>
        <a-table-column title="报表名称" data-index="name" :width="200">
          <template #cell="{ record }">
            <a-link @click="goDetail(record.id)">{{ record.name }}</a-link>
          </template>
        </a-table-column>
        <a-table-column title="类型" data-index="type" :width="110">
          <template #cell="{ record }">
            <a-tag :color="typeColor(record.type)">{{ typeLabel(record.type) }}</a-tag>
          </template>
        </a-table-column>
        <a-table-column title="负责人" data-index="owner" :width="100" />
        <a-table-column title="更新频率" data-index="updateFrequency" :width="100">
          <template #cell="{ record }">{{ freqLabel(record.updateFrequency) }}</template>
        </a-table-column>
        <a-table-column title="挂载引用" data-index="refCount" :width="110">
          <template #cell="{ record }">
            <a-tooltip :content="record.refCount > 0 ? '被指标挂载引用，下线前需先解除挂载（E11）' : '暂无指标挂载'">
              <a-tag :color="record.refCount > 0 ? 'arcoblue' : 'gray'" size="small">
                {{ record.refCount > 0 ? `${record.refCount} 个指标` : '未引用' }}
              </a-tag>
            </a-tooltip>
          </template>
        </a-table-column>
        <a-table-column title="状态" data-index="status" :width="90">
          <template #cell="{ record }">
            <a-tag :color="record.status === 'active' ? 'green' : 'red'">
              {{ record.status === 'active' ? '启用中' : '已下线' }}
            </a-tag>
          </template>
        </a-table-column>
        <a-table-column title="更新时间" data-index="updatedAt" :width="170" />
        <a-table-column title="操作" :width="160" fixed="right">
          <template #cell="{ record }">
            <a-space>
              <a-link @click="goDetail(record.id)">详情</a-link>
              <a-popconfirm
                :content="record.status === 'active' ? '下线后指标挂载将失效，确认下线？' : '确认重新上线该报表？'"
                @ok="() => handleToggleStatus(record)"
              >
                <a-link :status="record.status === 'active' ? 'danger' : 'normal'">
                  {{ record.status === 'active' ? '下线' : '上线' }}
                </a-link>
              </a-popconfirm>
            </a-space>
          </template>
        </a-table-column>
      </template>
    </a-table>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { IconSearch, IconSwap, IconPlus } from '@arco-design/web-vue/es/icon'
import { MetricsCenterStore } from '@/mock-dca/metrics-center/store'
import { REPORT_TYPE_OPTIONS, FREQUENCY_OPTIONS } from '@/mock-dca/metrics-center/data'
import type { ReportItem, ReportType } from '@/mock-dca/metrics-center/types'

const router = useRouter()

const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)
const filters = reactive({ keyword: '', type: '', status: '' })

const reports = ref<ReportItem[]>([])

/** 列表附带挂载引用数（R25 反查），便于下线前评估影响（E11） */
const tableData = computed(() =>
  reports.value.map(r => ({
    ...r,
    refCount: MetricsCenterStore.getReportReferencedMetrics(r.id).length,
  }))
)
const total = computed(() => reports.value.length)

function typeLabel(t: ReportType) {
  return REPORT_TYPE_OPTIONS.find(o => o.value === t)?.label ?? t
}
function typeColor(t: ReportType) {
  return t === 'fixed' ? 'arcoblue' : t === 'branch_board' ? 'orangered' : 'purple'
}
function freqLabel(f: string) {
  return FREQUENCY_OPTIONS.find(o => o.value === f)?.label ?? f
}

function load() {
  loading.value = true
  reports.value = MetricsCenterStore.getReports({
    keyword: filters.keyword || undefined,
    type: filters.type || undefined,
    status: filters.status || undefined,
  })
  loading.value = false
}

function handleReset() {
  filters.keyword = ''
  filters.type = ''
  filters.status = ''
  currentPage.value = 1
  load()
}

/** 上线/下线：被引用报表禁止下线（E11，store 内 throw 拦截） */
function handleToggleStatus(record: ReportItem & { refCount: number }) {
  const next = record.status === 'active' ? 'offline' : 'active'
  try {
    MetricsCenterStore.setReportStatus(record.id, next)
    Message.success(next === 'active' ? '报表已上线' : '报表已下线')
    load()
  } catch (e) {
    Message.error((e as Error).message)
  }
}

function goDetail(id: string) {
  router.push({ name: 'metrics-center-reports-detail', params: { id } })
}
function goMetrics() {
  router.push({ name: 'metrics-center' })
}
function goCreate() {
  router.push({ name: 'metrics-center-reports-create' })
}

onMounted(load)
</script>

<style scoped lang="less">
.reports-page {
  padding: 16px;

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;

    h2 { margin: 0; font-size: 20px; }
  }

  .header-desc {
    font-size: 12px;
    color: #86909c;
  }

  .filter-section {
    margin-bottom: 16px;
    padding: 16px;
    background: #fff;
    border-radius: 4px;
    border: 1px solid #e5e6eb;
  }
}
</style>
