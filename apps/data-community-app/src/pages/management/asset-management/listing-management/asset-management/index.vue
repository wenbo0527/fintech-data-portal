<template>
  <div class="asset-management">
    <div class="page-header">
      <h2>数据资产上下架</h2>
      <a-space>
        <a-button type="primary" @click="openSyncModal">
          <template #icon><IconSync /></template>
          同步元数据
        </a-button>
        <a-button type="outline" @click="refreshAll">
          <template #icon><IconRefresh /></template>
          刷新
        </a-button>
      </a-space>
    </div>

    <!-- 统计卡片 -->
    <a-row :gutter="16" class="stats-section">
      <a-col :span="8">
        <a-card title="资产总数" :bordered="false">
          <a-statistic :value="stats.total" :value-style="{ color: '#165DFF' }" />
        </a-card>
      </a-col>
      <a-col :span="8">
        <a-card title="已上架" :bordered="false">
          <a-statistic :value="stats.onShelf" :value-style="{ color: '#00B42A' }" />
        </a-card>
      </a-col>
      <a-col :span="8">
        <a-card title="已下架" :bordered="false">
          <a-statistic :value="stats.offShelf" :value-style="{ color: '#FF7D00' }" />
        </a-card>
      </a-col>
    </a-row>

    <!-- 搜索和筛选 -->
    <div class="search-section">
      <a-row :gutter="16">
        <a-col :span="9">
          <a-input
            v-model="searchParams.keyword"
            placeholder="搜索资产名称 / 描述 / HIVE 表名"
            allow-clear
            @press-enter="handleSearch"
            @clear="handleSearch"
          >
            <template #prefix><IconSearch /></template>
          </a-input>
        </a-col>
        <a-col :span="6">
          <a-select
            v-model="searchParams.status"
            placeholder="上架状态"
            allow-clear
            @change="handleSearch"
          >
            <a-option value="onShelf">已上架</a-option>
            <a-option value="offShelf">已下架</a-option>
            <a-option value="active">活跃</a-option>
          </a-select>
        </a-col>
        <a-col :span="9">
          <a-space>
            <a-button type="primary" @click="handleSearch">
              <template #icon><IconSearch /></template>
              搜索
            </a-button>
            <a-button @click="resetSearch">重置</a-button>
          </a-space>
        </a-col>
      </a-row>
    </div>

    <!-- 资产表格 -->
    <a-table
      :columns="columns"
      :data="pagedData"
      :loading="loading"
      :pagination="pagination"
      row-key="id"
      @page-change="handlePageChange"
      @page-size-change="handlePageSizeChange"
    >
      <template #assetName="{ record }">
        <a-button type="text" size="small" @click="gotoDetail(record)">
          {{ record.assetName }}
        </a-button>
      </template>

      <template #clusterType="{ record }">
        <a-tag color="arcoblue">{{ record.clusterType }}</a-tag>
      </template>

      <template #hiveTable="{ record }">
        <span class="hive-table">{{ record.hiveDatabase }}.{{ record.hiveTableName }}</span>
      </template>

      <template #status="{ record }">
        <a-tag :color="statusColor[record.status as ShelfStatus]">
          {{ statusLabel[record.status as ShelfStatus] }}
        </a-tag>
      </template>

      <template #registerTime="{ record }">
        {{ formatDateTime(record.registerTime) }}
      </template>

      <template #onShelfTime="{ record }">
        {{ formatDateTime(record.onShelfTime) }}
      </template>

      <template #lastSyncTime="{ record }">
        <span :class="{ 'sync-stale': isSyncStale(record) }">
          {{ formatDateTime(record.lastSyncTime) }}
        </span>
      </template>

      <template #actions="{ record }">
        <a-space>
          <a-button
            v-if="canOnShelf(record)"
            type="text"
            size="small"
            status="success"
            @click="onShelf(record)"
          >
            上架
          </a-button>
          <a-button
            v-if="canOffShelf(record)"
            type="text"
            size="small"
            status="warning"
            @click="offShelf(record)"
          >
            下架
          </a-button>
          <a-button type="text" size="small" @click="syncOne(record)">
            同步
          </a-button>
          <a-button type="text" size="small" @click="gotoDetail(record)">
            详情
          </a-button>
        </a-space>
      </template>
    </a-table>

    <!-- 详情弹窗 -->
    <a-modal
      v-model:visible="detailVisible"
      :title="detailRecord ? `${detailRecord.assetName} · 资产详情` : '资产详情'"
      :width="640"
      :footer="false"
      :mask-closable="false"
    >
      <a-descriptions v-if="detailRecord" :column="2" bordered>
        <a-descriptions-item label="资产名称">{{ detailRecord.assetName }}</a-descriptions-item>
        <a-descriptions-item label="集群类型">
          <a-tag color="arcoblue">{{ detailRecord.clusterType }}</a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="HIVE 库" :span="2">{{ detailRecord.hiveDatabase }}</a-descriptions-item>
        <a-descriptions-item label="HIVE 表名" :span="2">
          <span class="hive-table">{{ detailRecord.hiveDatabase }}.{{ detailRecord.hiveTableName }}</span>
        </a-descriptions-item>
        <a-descriptions-item label="业务域">{{ detailRecord.category }}</a-descriptions-item>
        <a-descriptions-item label="负责人">{{ detailRecord.owner }}</a-descriptions-item>
        <a-descriptions-item label="状态">
          <a-tag :color="statusColor[detailRecord.status]">
            {{ statusLabel[detailRecord.status] }}
          </a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="发布人">{{ detailRecord.publisher }}</a-descriptions-item>
        <a-descriptions-item label="注册时间">{{ formatDateTime(detailRecord.registerTime) }}</a-descriptions-item>
        <a-descriptions-item label="上架时间">{{ formatDateTime(detailRecord.onShelfTime) }}</a-descriptions-item>
        <a-descriptions-item label="下架时间">{{ formatDateTime(detailRecord.offShelfTime) }}</a-descriptions-item>
        <a-descriptions-item label="最近同步">{{ formatDateTime(detailRecord.lastSyncTime) }}</a-descriptions-item>
        <a-descriptions-item label="描述" :span="2">{{ detailRecord.description || '—' }}</a-descriptions-item>
      </a-descriptions>
    </a-modal>

    <!-- 同步元数据弹窗 -->
    <a-modal
      v-model:visible="syncVisible"
      title="同步元数据"
      :width="560"
      :ok-text="syncing ? '同步中…' : '开始同步'"
      :cancel-text="'取消'"
      :ok-button-props="{ disabled: syncing }"
      @ok="runSync"
      @cancel="syncVisible = false"
    >
      <a-form :model="syncForm" layout="vertical">
        <a-form-item label="同步范围">
          <a-radio-group v-model="syncForm.scope">
            <a-radio value="all">全部资产（{{ assets.length }} 条）</a-radio>
            <a-radio value="stale">仅同步过期资产（{{ staleAssets.length }} 条）</a-radio>
            <a-radio value="hive_compute">仅 HIVE 计算集群（{{ countByCluster('compute') }} 条）</a-radio>
            <a-radio value="hive_analysis">仅 HIVE 分析集群（{{ countByCluster('analysis') }} 条）</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="同步目标">
          <a-checkbox-group v-model="syncForm.targets">
            <a-checkbox value="compute">计算集群元数据</a-checkbox>
            <a-checkbox value="analysis">分析集群元数据</a-checkbox>
          </a-checkbox-group>
        </a-form-item>
      </a-form>

      <div v-if="syncProgress.total > 0" class="sync-progress">
        <a-progress
          :percent="Math.round((syncProgress.done / syncProgress.total) * 100)"
          :status="syncProgress.failed > 0 ? 'warning' : 'normal'"
        />
        <div class="sync-progress-text">
          已处理 {{ syncProgress.done }} / {{ syncProgress.total }}
          <span v-if="syncProgress.failed > 0" class="sync-failed">
            · 失败 {{ syncProgress.failed }} 条
          </span>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import {
  IconSearch,
  IconSync,
  IconRefresh
} from '@arco-design/web-vue/es/icon'
import { mockTables } from '@/mock-dca/data-map'
import { listingStore } from '@/mock-dca/listing-store'
import { formatDateTime } from '@/utils/dateUtils'

type ShelfStatus = 'active' | 'onShelf' | 'offShelf'
type ClusterType = 'HIVE'
type HiveClusterEnv = 'compute' | 'analysis'

interface AssetItem {
  id: string
  assetName: string
  clusterType: ClusterType
  clusterEnv: HiveClusterEnv
  hiveDatabase: string
  hiveTableName: string
  category: string
  owner: string
  registerTime: string
  status: ShelfStatus
  onShelfTime?: string
  offShelfTime?: string
  publisher: string
  description: string
  lastSyncTime?: string
}

const statusLabel: Record<ShelfStatus, string> = {
  active: '活跃',
  onShelf: '已上架',
  offShelf: '已下架'
}
const statusColor: Record<ShelfStatus, string> = {
  active: 'green',
  onShelf: 'green',
  offShelf: 'orange'
}

const router = useRouter()
const loading = ref(false)
const searchParams = reactive({ keyword: '', status: '' })

// 资产列表（统一视为 HIVE 集群资产，env 区分 compute/analysis）
const assets = ref<AssetItem[]>([])

/**
 * 解析 mockTables 的 HIVE 路径
 * hive.risk.t_loan_apply -> { database: 'risk', tableName: 't_loan_apply' }
 */
const parseHivePath = (fullPath: string) => {
  if (!fullPath) return { database: 'default', tableName: fullPath || '' }
  const segs = fullPath.split('.')
  if (segs.length >= 3) {
    return { database: segs[segs.length - 2], tableName: segs[segs.length - 1] }
  }
  return { database: segs[0] || 'default', tableName: segs[segs.length - 1] }
}

const initAssets = () => {
  // mockTables：直接当资产（计算/分析集群各一份，或共用一份）
  const tableAssets: AssetItem[] = mockTables.map((t, idx) => {
    const parsed = parseHivePath(t.computeClusterTable)
    return {
      id: `T-${idx}-${t.tableName}`,
      assetName: t.tableName,
      clusterType: 'HIVE',
      clusterEnv: 'compute',
      hiveDatabase: parsed.database,
      hiveTableName: parsed.tableName,
      category: t.category,
      owner: t.owner,
      registerTime: t.registerTime,
      status: t.status,
      onShelfTime: t.onShelfTime,
      offShelfTime: t.offShelfTime,
      publisher: t.publisher,
      description: t.description,
      lastSyncTime: t.onShelfTime
    }
  })
  // listingStore.metrics：用 metricCode 作为 HIVE 表名，category 作为库
  const metricAssets: AssetItem[] = listingStore.metrics.map((m, idx) => ({
    id: `M-${idx}-${m.metricCode}`,
    assetName: m.metricName,
    clusterType: 'HIVE',
    clusterEnv: 'analysis',
    hiveDatabase: `metric_${m.category}`,
    hiveTableName: m.metricCode,
    category: m.category,
    owner: m.owner,
    registerTime: m.registerTime,
    status: m.status,
    onShelfTime: m.onShelfTime,
    offShelfTime: m.offShelfTime,
    publisher: m.publisher,
    description: m.description,
    lastSyncTime: m.onShelfTime
  }))
  assets.value = [...tableAssets, ...metricAssets]
}

onMounted(() => {
  initAssets()
})

// 过滤
const filteredAssets = computed(() => {
  const kw = searchParams.keyword.trim().toLowerCase()
  return assets.value.filter(a => {
    if (searchParams.status && a.status !== searchParams.status) return false
    if (kw) {
      const fullHive = `${a.hiveDatabase}.${a.hiveTableName}`.toLowerCase()
      const hit = a.assetName.toLowerCase().includes(kw)
        || (a.description || '').toLowerCase().includes(kw)
        || fullHive.includes(kw)
        || a.hiveDatabase.toLowerCase().includes(kw)
      if (!hit) return false
    }
    return true
  })
})

// 统计
const stats = computed(() => {
  const list = assets.value
  return {
    total: list.length,
    onShelf: list.filter(a => a.status === 'onShelf' || a.status === 'active').length,
    offShelf: list.filter(a => a.status === 'offShelf').length
  }
})

// 分页
const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: computed(() => filteredAssets.value.length),
  showTotal: true,
  showPageSize: true,
  pageSizeOptions: [10, 20, 50]
})
const pagedData = computed(() => {
  const start = (pagination.current - 1) * pagination.pageSize
  return filteredAssets.value.slice(start, start + pagination.pageSize)
})

watch(() => filteredAssets.value.length, () => {
  pagination.current = 1
})

// 表格列
const columns = [
  { title: '资产名称', slotName: 'assetName', width: 220, fixed: 'left' as const },
  { title: '集群类型', slotName: 'clusterType', width: 100 },
  { title: 'HIVE 表', slotName: 'hiveTable', width: 240 },
  { title: '业务域', dataIndex: 'category', width: 110 },
  { title: '负责人', dataIndex: 'owner', width: 100 },
  { title: '状态', slotName: 'status', width: 100 },
  { title: '注册时间', slotName: 'registerTime', width: 170 },
  { title: '上架时间', slotName: 'onShelfTime', width: 170 },
  { title: '最近同步', slotName: 'lastSyncTime', width: 170 },
  { title: '操作', slotName: 'actions', width: 240, fixed: 'right' as const }
]

// 同步相关
const SYNC_STALE_DAYS = 7
const isSyncStale = (record: AssetItem) => {
  if (!record.lastSyncTime) return true
  const diff = Date.now() - new Date(record.lastSyncTime).getTime()
  return diff > SYNC_STALE_DAYS * 24 * 60 * 60 * 1000
}
const staleAssets = computed(() => assets.value.filter(isSyncStale))

const countByCluster = (env: HiveClusterEnv) =>
  assets.value.filter(a => a.clusterEnv === env).length

const syncVisible = ref(false)
const syncing = ref(false)
const syncForm = reactive({
  scope: 'all' as 'all' | 'stale' | 'hive_compute' | 'hive_analysis',
  targets: ['compute', 'analysis']
})
const syncProgress = reactive({ total: 0, done: 0, failed: 0 })

const getSyncTargets = () => {
  let list: AssetItem[] = []
  if (syncForm.scope === 'all') list = assets.value
  else if (syncForm.scope === 'stale') list = staleAssets.value
  else if (syncForm.scope === 'hive_compute') list = assets.value.filter(a => a.clusterEnv === 'compute')
  else if (syncForm.scope === 'hive_analysis') list = assets.value.filter(a => a.clusterEnv === 'analysis')
  return list
}

const openSyncModal = () => {
  syncForm.scope = 'all'
  syncForm.targets = ['compute', 'analysis']
  syncProgress.total = 0
  syncProgress.done = 0
  syncProgress.failed = 0
  syncVisible.value = true
}

const runSync = async () => {
  if (syncForm.targets.length === 0) {
    Message.warning('请至少选择一个同步目标')
    return
  }
  const targets = getSyncTargets()
  if (targets.length === 0) {
    Message.info('没有可同步的资产')
    return
  }
  syncing.value = true
  syncProgress.total = targets.length
  syncProgress.done = 0
  syncProgress.failed = 0

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  for (const a of targets) {
    await new Promise(r => setTimeout(r, 80))
    const ok = Math.random() > 0.05
    if (ok) {
      a.lastSyncTime = now
      syncProgress.done += 1
    } else {
      syncProgress.failed += 1
    }
  }
  syncing.value = false
  const failedMsg = syncProgress.failed > 0 ? `，失败 ${syncProgress.failed} 条` : ''
  Message.success(`同步完成：成功 ${syncProgress.done} 条${failedMsg}`)
  setTimeout(() => { syncVisible.value = false }, 400)
}

const syncOne = (record: AssetItem) => {
  Message.loading({ content: `正在同步 ${record.assetName}…`, duration: 600 })
  setTimeout(() => {
    record.lastSyncTime = new Date().toISOString().slice(0, 19).replace('T', ' ')
    Message.success(`${record.assetName} 同步成功`)
  }, 700)
}

// 操作判断
const canOnShelf = (record: AssetItem) => record.status === 'offShelf'
const canOffShelf = (record: AssetItem) =>
  record.status === 'onShelf' || record.status === 'active'

const onShelf = (record: AssetItem) => {
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  record.status = 'onShelf'
  record.onShelfTime = now
  record.offShelfTime = undefined
  Message.success(`${record.assetName} 已上架`)
}
const offShelf = (record: AssetItem) => {
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  record.status = 'offShelf'
  record.offShelfTime = now
  Message.success(`${record.assetName} 已下架`)
}

// 详情
const detailVisible = ref(false)
const detailRecord = ref<AssetItem | null>(null)
const viewDetail = (record: AssetItem) => {
  detailRecord.value = record
  detailVisible.value = true
}
const gotoDetail = (record: AssetItem) => {
  router.push(`/management/asset-management/listing-management/asset-management/detail/${encodeURIComponent(record.assetName)}`)
}

// 搜索
const handleSearch = () => {
  pagination.current = 1
}
const resetSearch = () => {
  searchParams.keyword = ''
  searchParams.status = ''
  pagination.current = 1
}
const handlePageChange = (page: number) => { pagination.current = page }
const handlePageSizeChange = (size: number) => {
  pagination.pageSize = size
  pagination.current = 1
}
const refreshAll = () => {
  loading.value = true
  initAssets()
  setTimeout(() => { loading.value = false; Message.success('已刷新') }, 300)
}
</script>

<style scoped>
.asset-management {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.stats-section {
  margin-bottom: 16px;
}

.search-section {
  margin-bottom: 20px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 6px;
}

.hive-table {
  font-family: 'JetBrains Mono', Consolas, Menlo, monospace;
  font-size: 12px;
  color: #165dff;
  background: #f0f7ff;
  padding: 2px 6px;
  border-radius: 3px;
}

.sync-progress {
  margin-top: 12px;
}

.sync-progress-text {
  margin-top: 6px;
  font-size: 12px;
  color: #86909c;
}

.sync-failed {
  color: #ff7d00;
}

.sync-stale {
  color: #ff7d00;
}
</style>