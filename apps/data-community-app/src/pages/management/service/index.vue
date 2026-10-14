<template>
  <div class="service-page">
    <a-page-header
      title="数据服务"
      sub-title="运营视角：API 暴露清单、调用度量、限流配置、调用方分析（与表详情「服务」Tab 同源）"
    >
      <template #extra>
        <a-space>
          <a-button @click="goWorkbench">返回工作台</a-button>
          <a-tooltip content="服务形态在表详情页「服务」Tab 注册，本页只做运营度量视角">
            <a-button type="primary" @click="hintPublish">
              <template #icon><icon-plus /></template>
              发布 API
            </a-button>
          </a-tooltip>
        </a-space>
      </template>
    </a-page-header>

    <!-- 统计卡片（全部由当前数据 computed 聚合） -->
    <a-row :gutter="16">
      <a-col :span="6">
        <a-card :bordered="false" class="stat-card">
          <a-statistic title="API 总数" :value="stats.total" />
          <div class="stat-sub">来源于 {{ stats.tableCount }} 张表的服务形态</div>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card :bordered="false" class="stat-card">
          <a-statistic title="在线服务" :value="stats.online" :value-style="{ color: '#00b42a' }" />
          <div class="stat-sub">已下线 {{ stats.total - stats.online }} 个（指标归零）</div>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card :bordered="false" class="stat-card">
          <a-statistic title="今日调用总量（QPS 合计）" :value="stats.totalCalls" />
          <div class="stat-sub">按各服务运行 QPS 汇总</div>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card :bordered="false" class="stat-card">
          <a-statistic
            title="平均成功率"
            :value="stats.avgSuccessRate"
            :precision="2"
            suffix="%"
            :value-style="{ color: stats.avgSuccessRate >= 99.5 ? '#00b42a' : '#ff7d00' }"
          />
          <div class="stat-sub">仅统计在线服务</div>
        </a-card>
      </a-col>
    </a-row>

    <a-card :bordered="false" style="margin-top: 16px">
      <a-row :gutter="16" style="margin-bottom: 16px">
        <a-col :span="9">
          <a-input v-model="keyword" placeholder="搜索服务名 / Endpoint / 来源表" allow-clear>
            <template #prefix><icon-search /></template>
          </a-input>
        </a-col>
        <a-col :span="4">
          <a-select v-model="filterStatus" placeholder="状态" allow-clear>
            <a-option value="online">在线</a-option>
            <a-option value="offline">下线</a-option>
          </a-select>
        </a-col>
        <a-col :span="5">
          <a-select v-model="filterDomain" placeholder="所属域" allow-clear :options="domainOptions" />
        </a-col>
        <a-col :span="6">
          <a-space>
            <a-button type="primary" @click="resetFilters">重置</a-button>
            <span class="hint-text">当前 {{ filtered.length }} / {{ stats.total }} 个服务</span>
          </a-space>
        </a-col>
      </a-row>

      <a-table
        :columns="columns"
        :data="filtered"
        row-key="id"
        stripe
        size="medium"
        :scroll="{ x: 1320 }"
        :pagination="{ pageSize: 10, showTotal: true, sizeCanChange: false }"
      >
        <template #name="{ record }">
          <div class="svc-name">{{ record.name }}</div>
          <a-tag size="small" color="arcoblue">{{ kindLabel(record.kind) }}</a-tag>
        </template>
        <template #endpoint="{ record }">
          <code class="endpoint">{{ record.endpoint }}</code>
        </template>
        <template #table="{ record }">
          <a-button type="text" size="mini" class="table-link" @click="goTable(record.tableName)">
            {{ record.tableName }}
          </a-button>
          <div class="sub-text">{{ record.tableCnName }}</div>
        </template>
        <template #status="{ record }">
          <a-tag :color="svcStatusColor(record.status)">{{ svcStatusLabel(record.status) }}</a-tag>
        </template>
        <template #qps="{ record }">
          <div class="qps-cell">
            <a-progress
              :percent="qpsRatio(record)"
              :show-text="false"
              :stroke-width="6"
              :color="qpsColor(qpsRatio(record))"
            />
            <span class="sub-text">{{ record.ops.qps }} / {{ record.ops.qpsLimit }}</span>
          </div>
        </template>
        <template #successRate="{ record }">
          <span :style="{ color: rateColor(record) }">{{ rateText(record) }}</span>
        </template>
        <template #actions="{ record }">
          <a-link @click="openDetail(record)">详情</a-link>
        </template>
        <template #empty>
          <a-empty :description="emptyText">
            <a-button v-if="stats.total" @click="resetFilters">清空筛选条件</a-button>
            <a-button v-else type="primary" @click="goCatalog">去表详情页注册服务形态</a-button>
          </a-empty>
        </template>
      </a-table>
    </a-card>

    <a-drawer
      v-model:visible="detailVisible"
      :title="`API 详情 · ${current?.name || ''}`"
      :width="820"
      unmount-on-close
    >
      <template v-if="current">
        <a-alert v-if="current.status !== 'online'" type="warning" class="drawer-alert">
          该服务已下线，运行指标归零；如需恢复请在表详情页「服务」Tab 重新上线。
        </a-alert>

        <a-descriptions :column="2" bordered size="medium" title="基础信息">
          <a-descriptions-item label="服务名称">{{ current.name }}</a-descriptions-item>
          <a-descriptions-item label="服务形态">{{ kindLabel(current.kind) }}</a-descriptions-item>
          <a-descriptions-item label="状态">
            <a-tag :color="svcStatusColor(current.status)">{{ svcStatusLabel(current.status) }}</a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="所属域">{{ current.domain }}</a-descriptions-item>
          <a-descriptions-item label="Endpoint" :span="2">
            <code class="endpoint">{{ current.endpoint }}</code>
          </a-descriptions-item>
          <a-descriptions-item label="来源表">
            <a-button type="text" size="mini" class="table-link" @click="goTable(current.tableName)">
              {{ current.tableName }}
            </a-button>
            <span class="sub-text">（{{ current.tableCnName }}）</span>
          </a-descriptions-item>
          <a-descriptions-item label="表状态">
            <a-tag size="small" :color="tableStatusColor(current.tableStatus)">
              {{ tableStatusLabel(current.tableStatus) }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="表负责人">{{ current.tableOwner }}</a-descriptions-item>
          <a-descriptions-item label="表数据分级">
            <a-tag size="small" :color="sensitivityColor(current.tableSensitivity)">
              {{ sensitivityLabel(current.tableSensitivity) }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="存储 / 来源系统" :span="2">
            {{ current.storage }} · {{ current.sourceSystem }}
          </a-descriptions-item>
          <a-descriptions-item label="服务更新时间" :span="2">{{ current.updatedAt }}</a-descriptions-item>
          <a-descriptions-item v-if="sourceTable" label="表描述" :span="2">
            {{ sourceTable.description || '—' }}
          </a-descriptions-item>
        </a-descriptions>

        <a-descriptions :column="3" bordered size="medium" title="运行指标" class="drawer-block">
          <a-descriptions-item label="请求方式">
            <a-tag :color="methodColor(current.ops.method)">{{ current.ops.method }}</a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="实时 QPS">{{ current.ops.qps }}</a-descriptions-item>
          <a-descriptions-item label="限流 QPS">{{ current.ops.qpsLimit }}</a-descriptions-item>
          <a-descriptions-item label="今日调用量">{{ current.ops.dailyCalls }}</a-descriptions-item>
          <a-descriptions-item label="成功率">{{ current.ops.successRate }}%</a-descriptions-item>
          <a-descriptions-item label="平均延迟">{{ current.ops.latency }} ms</a-descriptions-item>
          <a-descriptions-item label="当前限流水位" :span="3">
            <a-progress :percent="qpsRatio(current)" :color="qpsColor(qpsRatio(current))" size="small" />
          </a-descriptions-item>
        </a-descriptions>

        <div class="drawer-block">
          <div class="block-title">调用方 Top 5</div>
          <a-table
            :columns="callerColumns"
            :data="current.ops.topCallers"
            :pagination="false"
            row-key="system"
            size="small"
          >
            <template #empty>
              <a-empty :image="false" description="该服务暂无调用方记录" />
            </template>
          </a-table>
        </div>
      </template>

      <template #footer>
        <a-space>
          <a-button @click="detailVisible = false">关闭</a-button>
          <a-button type="primary" :disabled="!current" @click="goTable(current?.tableName, true)">
            <template #icon><icon-arrow-right /></template>
            查看来源表
          </a-button>
        </a-space>
      </template>
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
/**
 * [重构方案 P3 · 服务暴露] 运营视角：API 服务度量页
 *
 * 数据源：与「API 市场」「表详情 · 服务 Tab」同源——
 *   flattenServices('API') 把 table-catalog-store 里各表的 services[] 打平，
 *   opsOf() 由服务 id 确定性哈希派生运行指标（QPS / 成功率 / 延迟 / 限流 / 调用方）。
 * 本页无任何硬编码 mock，已上线表新增/下线下服务后切回本页即自动同步；
 * 唯一的写动作发生在表详情页，因此本页只做只读度量与跳转。
 */
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { flattenServices, opsOf, type ServiceOps, type ServiceRow } from '@/mock-shared/service-ops'
import {
  TableCatalogStore,
  SERVICE_KIND_LABELS,
  SENSITIVITY_LABELS,
  SENSITIVITY_COLORS,
  STATUS_LABELS,
  STATUS_COLORS,
  type Sensitivity,
  type ServiceKind,
  type TableStatus
} from '@/mock-shared/table-catalog-store'

/** 打平行 + 派生运行指标（表格与抽屉共用同一份，避免模板里重复算哈希） */
interface ServiceView extends ServiceRow {
  ops: ServiceOps
}

const router = useRouter()

const keyword = ref('')
const filterStatus = ref<string | undefined>(undefined)
const filterDomain = ref<string | undefined>(undefined)

const detailVisible = ref(false)
const current = ref<ServiceView | null>(null)

// ---------------- 数据 ----------------

const allServices = computed<ServiceView[]>(() =>
  flattenServices('API').map(row => ({ ...row, ops: opsOf(row) }))
)

/** 所属域选项由数据去重生成，不硬编码 */
const domainOptions = computed(() => {
  const set = new Set<string>()
  for (const s of allServices.value) set.add(s.domain)
  return [...set].sort().map(d => ({ label: d, value: d }))
})

const filtered = computed(() => {
  const k = keyword.value.trim().toLowerCase()
  return allServices.value.filter(s => {
    if (k) {
      const hit = [s.name, s.endpoint, s.tableName, s.tableCnName].some(x => x.toLowerCase().includes(k))
      if (!hit) return false
    }
    if (filterStatus.value && s.status !== filterStatus.value) return false
    if (filterDomain.value && s.domain !== filterDomain.value) return false
    return true
  })
})

const stats = computed(() => {
  const list = allServices.value
  const online = list.filter(s => s.status === 'online')
  return {
    total: list.length,
    online: online.length,
    totalCalls: list.reduce((sum, s) => sum + s.ops.qps, 0),
    avgSuccessRate: online.length
      ? Math.round((online.reduce((sum, s) => sum + s.ops.successRate, 0) / online.length) * 100) / 100
      : 0,
    tableCount: new Set(list.map(s => s.tableName)).size
  }
})

const emptyText = computed(() =>
  stats.value.total
    ? '没有符合筛选条件的 API 服务'
    : '暂无已暴露的 API 服务，请先在表详情页注册服务形态'
)

/** 抽屉里的来源表补充信息（同 store 取数，表被删除时自然为 undefined） */
const sourceTable = computed(() =>
  current.value ? TableCatalogStore.byName(current.value.tableName) : undefined
)

// ---------------- 列定义 ----------------

const columns = [
  { title: '服务名称', dataIndex: 'name', slotName: 'name', width: 220 },
  { title: 'Endpoint', dataIndex: 'endpoint', slotName: 'endpoint', width: 260 },
  { title: '来源表', dataIndex: 'tableName', slotName: 'table', width: 210 },
  { title: '所属域', dataIndex: 'domain', width: 110 },
  { title: '负责人', dataIndex: 'tableOwner', width: 100 },
  { title: '状态', dataIndex: 'status', slotName: 'status', width: 100 },
  { title: 'QPS / 限流', dataIndex: 'qps', slotName: 'qps', width: 170 },
  { title: '成功率', dataIndex: 'successRate', slotName: 'successRate', width: 100 },
  { title: '操作', dataIndex: 'actions', slotName: 'actions', width: 90, fixed: 'right' }
]

const callerColumns = [
  { title: '调用方', dataIndex: 'system' },
  { title: 'QPS', dataIndex: 'qps', width: 120 },
  { title: '日调用', dataIndex: 'dailyCalls', width: 140 }
]

// ---------------- 窄类型取值助手（规避模板 any 索引 Record 的 TS7053） ----------------

const SVC_STATUS_LABELS: Record<string, string> = { online: '在线', offline: '下线' }
const SVC_STATUS_COLORS: Record<string, string> = { online: 'green', offline: 'gray' }
const METHOD_COLORS: Record<string, string> = {
  GET: 'arcoblue', POST: 'green', PUT: 'orange', DELETE: 'red'
}

function kindLabel(k: string): string {
  return SERVICE_KIND_LABELS[k as ServiceKind] || String(k)
}
function svcStatusLabel(s: string): string {
  return SVC_STATUS_LABELS[s] || String(s)
}
function svcStatusColor(s: string): string {
  return SVC_STATUS_COLORS[s] || 'gray'
}
function tableStatusLabel(s: string): string {
  return STATUS_LABELS[s as TableStatus] || String(s)
}
function tableStatusColor(s: string): string {
  return STATUS_COLORS[s as TableStatus] || 'gray'
}
function sensitivityLabel(s: string): string {
  return SENSITIVITY_LABELS[s as Sensitivity] || String(s)
}
function sensitivityColor(s: string): string {
  return SENSITIVITY_COLORS[s as Sensitivity] || 'gray'
}
function methodColor(m: string): string {
  return METHOD_COLORS[m] || 'gray'
}
function qpsRatio(row: { ops: ServiceOps } | null | undefined): number {
  if (!row || !row.ops.qpsLimit) return 0
  return Math.min(row.ops.qps / row.ops.qpsLimit, 1)
}
function qpsColor(ratio: number): string {
  if (ratio >= 0.9) return '#f53f3f'
  if (ratio >= 0.7) return '#ff7d00'
  return '#00b42a'
}
function rateText(row: ServiceView): string {
  return row.status === 'online' ? `${row.ops.successRate}%` : '—'
}
function rateColor(row: ServiceView): string {
  if (row.status !== 'online') return '#86909c'
  if (row.ops.successRate >= 99.5) return '#00b42a'
  return '#ff7d00'
}

// ---------------- 交互 ----------------

function resetFilters() {
  keyword.value = ''
  filterStatus.value = undefined
  filterDomain.value = undefined
}

function openDetail(row: ServiceView) {
  current.value = row
  detailVisible.value = true
}

function hintPublish() {
  Message.info('请在表详情页「服务」Tab 注册服务形态')
}

/** 表详情页支持 ?tab=service（TAB_KEYS 白名单含 'service'） */
function goTable(tableName?: string, closeDrawer = false) {
  if (!tableName) return
  if (closeDrawer) detailVisible.value = false
  router.push({ path: `/discovery/data-map/table/${tableName}`, query: { tab: 'service' } })
}

const goWorkbench = () => router.push('workbench')
const goCatalog = () => router.push('/discovery/search')
</script>

<style lang="scss" scoped>
.service-page {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;

  .stat-card {
    :deep(.arco-card-body) {
      padding: 16px;
    }
  }

  .stat-sub,
  .sub-text,
  .hint-text {
    font-size: 12px;
    color: var(--color-text-3);
  }

  .hint-text {
    white-space: nowrap;
  }

  .svc-name {
    font-weight: 500;
    margin-bottom: 2px;
  }

  .endpoint {
    background: var(--color-fill-2);
    padding: 2px 6px;
    border-radius: 4px;
    font-family: 'Menlo', monospace;
    font-size: 12px;
    color: #165dff;
    word-break: break-all;
  }

  .table-link {
    padding: 0;
    height: auto;
    font-family: 'Menlo', monospace;
    font-size: 13px;
  }

  .qps-cell {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .drawer-alert {
    margin-bottom: 16px;
  }

  .drawer-block {
    margin-top: 20px;
  }

  .block-title {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 8px;
  }
}
</style>
