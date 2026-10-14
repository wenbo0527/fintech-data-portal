<template>
  <!-- @prd: asset-listing.resource.business-system -->
  <div class="business-system-page">
    <DmtPageHeader title="业务系统" sub-title="全量业务源表的统一台账，支持跨系统筛选、搜索与同步" />

    <!-- 筛选区 -->
    <a-card class="filter-card">
      <a-row :gutter="16">
        <a-col :span="8">
          <a-input
            v-model="searchKw"
            placeholder="搜索源表名 / 业务系统 / 负责人 / 描述"
            allow-clear
            @press-enter="handleSearch"
            @clear="handleSearch"
          >
            <template #prefix><IconSearch /></template>
          </a-input>
        </a-col>
        <a-col :span="5">
          <a-select v-model="systemFilter" placeholder="业务系统" allow-clear @change="handleSearch">
            <a-option v-for="s in availableSystems" :key="s.id" :value="s.id">{{ s.name }}</a-option>
          </a-select>
        </a-col>
        <a-col :span="5">
          <a-select v-model="clusterFilter" placeholder="集群类型" allow-clear @change="handleSearch">
            <a-option v-for="c in availableClusters" :key="c" :value="c">{{ c }}</a-option>
          </a-select>
        </a-col>
        <a-col :span="6">
          <a-space>
            <a-button type="primary" @click="handleSearch">
              <template #icon><IconSearch /></template>
              搜索
            </a-button>
            <a-button @click="resetSearch">重置</a-button>
            <a-button type="outline" @click="openSyncModal">
              <template #icon><IconSync /></template>
              批量同步
            </a-button>
          </a-space>
        </a-col>
      </a-row>
    </a-card>

    <!-- 表格 -->
    <a-card>
      <a-table
        :data="filteredRows"
        :pagination="{ showTotal: true, pageSize: 10 }"
        row-key="id"
      >
        <template #columns>
          <a-table-column title="源表名" :width="220">
            <template #cell="{ record }">
              <span class="link-name" @click="gotoDetail(record)">{{ record.name }}</span>
              <div class="hive-path">{{ record.fullPath }}</div>
            </template>
          </a-table-column>
          <a-table-column title="业务系统" :width="140">
            <template #cell="{ record }">
              <a-tag>{{ record.systemName }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column title="集群类型" :width="100">
            <template #cell="{ record }">
              <a-tag :color="clusterColor[record.clusterType as ClusterType]">{{ record.clusterType }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column title="业务域" data-index="category" :width="100" />
          <a-table-column title="负责人" data-index="owner" :width="100" />
          <a-table-column title="状态" :width="100">
            <template #cell="{ record }">
              <a-tag :color="statusColor[record.status as ShelfStatus]">{{ statusLabel[record.status as ShelfStatus] }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column title="注册时间" :width="170">
            <template #cell="{ record }">{{ formatDateTime(record.registerTime) }}</template>
          </a-table-column>
          <a-table-column title="最近同步" :width="170">
            <template #cell="{ record }">
              <span :class="{ 'sync-stale': isSyncStale(record) }">{{ formatDateTime(record.lastSyncTime) }}</span>
            </template>
          </a-table-column>
          <a-table-column title="操作" :width="240" fixed="right">
            <template #cell="{ record }">
              <a-space>
                <a-button
                  v-if="canOnShelf(record)"
                  type="text" size="small" status="success"
                  @click="onShelf(record)"
                >上架</a-button>
                <a-button
                  v-if="canOffShelf(record)"
                  type="text" size="small" status="warning"
                  @click="offShelf(record)"
                >下架</a-button>
                <a-button type="text" size="small" @click="syncOne(record)">同步</a-button>
                <a-button type="text" size="small" @click="gotoDetail(record)">详情</a-button>
              </a-space>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>

    <!-- 批量同步弹窗 -->
    <a-modal
      v-model:visible="syncVisible"
      title="批量同步元数据"
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
            <a-radio value="all">全部（{{ rows.length }} 条）</a-radio>
            <a-radio value="stale">仅同步过期（{{ staleCount }} 条）</a-radio>
            <a-radio value="filtered">当前筛选结果（{{ filteredRows.length }} 条）</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="同步目标集群">
          <a-checkbox-group v-model="syncForm.targets">
            <a-checkbox value="compute">计算集群</a-checkbox>
            <a-checkbox value="analysis">分析集群</a-checkbox>
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
          <span v-if="syncProgress.failed > 0" class="sync-failed">· 失败 {{ syncProgress.failed }} 条</span>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { IconSearch, IconSync } from '@arco-design/web-vue/es/icon'
import DmtPageHeader from '@/components-dca/common/PageHeader.vue'
import {
  ASSET_SYSTEMS, mockTables, type AssetSystemId, type ClusterType
} from '@/mock-dca/data-map'
import { listingStore } from '@/mock-dca/listing-store'
import { triggerSyncFromShelf, runMetadataTask, createMetadataTask } from '@/mock-dca/metadata-bus'
import { formatDateTime } from '@/utils/dateUtils'

type ShelfStatus = 'active' | 'onShelf' | 'offShelf'

interface Row {
  id: string
  name: string
  fullPath: string
  systemId: AssetSystemId
  systemName: string
  clusterType: ClusterType
  category: string
  owner: string
  registerTime: string
  status: ShelfStatus
  onShelfTime?: string
  offShelfTime?: string
  lastSyncTime?: string
  description?: string
}

const statusLabel: Record<ShelfStatus, string> = {
  active: '活跃', onShelf: '已上架', offShelf: '已下架'
}
const statusColor: Record<ShelfStatus, string> = {
  active: 'green', onShelf: 'green', offShelf: 'orange'
}
const clusterColor: Record<ClusterType, string> = {
  HIVE: 'arcoblue', MySQL: 'orange', Oracle: 'purple'
}

const router = useRouter()

// 业务系统台账：聚合 mockTables + listingStore.metrics
// 重点是「业务系统」属性 + 集群类型 + 跨系统统一台账
const rows = ref<Row[]>([])

const buildRows = () => {
  const result: Row[] = []
  mockTables.forEach((t, idx) => {
    const sys = ASSET_SYSTEMS.find(s => s.id === t.systemId)
    result.push({
      id: `T-${idx}-${t.tableName}`,
      name: t.tableName,
      fullPath: t.computeClusterTable,
      systemId: t.systemId,
      systemName: sys?.name || t.systemId,
      clusterType: t.clusterType,
      category: t.category,
      owner: t.owner,
      registerTime: t.registerTime,
      status: t.status,
      onShelfTime: t.onShelfTime,
      offShelfTime: t.offShelfTime,
      lastSyncTime: t.onShelfTime,
      description: t.description
    })
  })
  listingStore.metrics.forEach((m, idx) => {
    const sys = ASSET_SYSTEMS.find(s => s.id === m.systemId)
    result.push({
      id: `M-${idx}-${m.metricCode}`,
      name: m.metricName,
      fullPath: `metric_${m.category}.${m.metricCode}`,
      systemId: m.systemId,
      systemName: sys?.name || m.systemId,
      clusterType: m.clusterType,
      category: m.category,
      owner: m.owner,
      registerTime: m.registerTime,
      status: m.status,
      onShelfTime: m.onShelfTime,
      offShelfTime: m.offShelfTime,
      lastSyncTime: m.onShelfTime,
      description: m.description
    })
  })
  rows.value = result
}
buildRows()

// 筛选
const searchKw = ref('')
const systemFilter = ref<AssetSystemId | ''>('')
const clusterFilter = ref<ClusterType | ''>('')

const availableSystems = computed(() => ASSET_SYSTEMS)
const availableClusters = computed(() => {
  const set = new Set<ClusterType>()
  rows.value.forEach(r => set.add(r.clusterType))
  return Array.from(set)
})

const filteredRows = computed(() => {
  return rows.value.filter(r => {
    if (systemFilter.value && r.systemId !== systemFilter.value) return false
    if (clusterFilter.value && r.clusterType !== clusterFilter.value) return false
    if (searchKw.value) {
      const kw = searchKw.value.trim().toLowerCase()
      const hit = r.name.toLowerCase().includes(kw)
        || r.fullPath.toLowerCase().includes(kw)
        || r.systemName.toLowerCase().includes(kw)
        || r.owner.toLowerCase().includes(kw)
        || (r.description || '').toLowerCase().includes(kw)
      if (!hit) return false
    }
    return true
  })
})

watch(filteredRows, () => { /* 触发 computed */ })

const handleSearch = () => { /* 触发 computed */ }
const resetSearch = () => {
  searchKw.value = ''
  systemFilter.value = ''
  clusterFilter.value = ''
}

// 同步
const SYNC_STALE_DAYS = 7
const isSyncStale = (r: Row) => {
  if (!r.lastSyncTime) return true
  return (Date.now() - new Date(r.lastSyncTime).getTime()) > SYNC_STALE_DAYS * 86400000
}
const staleCount = computed(() => rows.value.filter(isSyncStale).length)

const syncVisible = ref(false)
const syncing = ref(false)
const syncForm = reactive({ scope: 'all' as 'all' | 'stale' | 'filtered', targets: ['compute', 'analysis'] })
const syncProgress = reactive({ total: 0, done: 0, failed: 0 })

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
  let targets: Row[] = rows.value
  if (syncForm.scope === 'stale') targets = rows.value.filter(isSyncStale)
  else if (syncForm.scope === 'filtered') targets = filteredRows.value

  if (targets.length === 0) {
    Message.info('没有可同步的资产')
    return
  }
  // ⚡ 联动：造一个"业务系统台账批量同步"汇总任务
  const batchTask = createMetadataTask({
    taskName: `业务系统台账批量同步（${targets.length} 个资产）`,
    dataSourceType: 'MySQL',
    assetType: '表',
    triggeredBy: 'shelf'
  })
  Message.loading({ content: `任务 ${batchTask.id} 运行中…`, duration: 1500 })
  syncing.value = true
  syncProgress.total = targets.length
  syncProgress.done = 0
  syncProgress.failed = 0
  void runMetadataTask(batchTask.id).then(t => {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
    if (t.status === 'success') {
      targets.forEach(r => {
        if (Math.random() < 0.8) {
          r.lastSyncTime = now
          syncProgress.done += 1
        } else {
          syncProgress.failed += 1
        }
      })
      Message.success(`批次 ${batchTask.id} 完成：成功 ${syncProgress.done}，失败 ${syncProgress.failed}`)
    } else {
      Message.warning(`批次 ${batchTask.id} 失败：${t.errorMessage}`)
    }
    syncing.value = false
    setTimeout(() => { syncVisible.value = false }, 400)
  })
}

const syncOne = (record: Row) => {
  // ⚡ 联动：触发采集任务（vs 之前的简单模拟）
  const task = triggerSyncFromShelf(record.name)
  Message.success(`已创建采集任务 ${task.id}，可在「元数据管理 → 任务」中查看`)
  void runMetadataTask(task.id).then(t => {
    if (t.status === 'success') {
      record.lastSyncTime = new Date().toISOString().slice(0, 19).replace('T', ' ')
      Message.success(`${record.name} 同步成功（${task.id}）`)
    } else {
      Message.warning(`${record.name} 同步失败：${t.errorMessage}`)
    }
  })
}

// 操作
const canOnShelf = (r: Row) => r.status === 'offShelf'
const canOffShelf = (r: Row) => r.status === 'onShelf' || r.status === 'active'

const onShelf = (r: Row) => {
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  r.status = 'onShelf'
  r.onShelfTime = now
  r.offShelfTime = undefined
  Message.success(`${r.name} 已上架`)
}
const offShelf = (r: Row) => {
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  r.status = 'offShelf'
  r.offShelfTime = now
  Message.success(`${r.name} 已下架`)
}

const gotoDetail = (record: Row) => {
  router.push(`/management/asset-management/listing-management/asset-management/detail/${encodeURIComponent(record.name)}`)
}
</script>

<style scoped>
.business-system-page { padding: 16px 24px 24px; }
.filter-card { margin-bottom: 16px; }
.link-name { color: #165DFF; cursor: pointer; }
.link-name:hover { text-decoration: underline; }
.hive-path {
  font-family: 'JetBrains Mono', Consolas, Menlo, monospace;
  font-size: 11px;
  color: #86909c;
  margin-top: 2px;
}
.sync-progress { margin-top: 12px; }
.sync-progress-text { margin-top: 6px; font-size: 12px; color: #86909c; }
.sync-failed { color: #ff7d00; }
.sync-stale { color: #ff7d00; }
</style>