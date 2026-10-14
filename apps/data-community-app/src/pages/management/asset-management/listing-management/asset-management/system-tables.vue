<template>
  <!-- @prd: asset-listing.resource.system -->
  <div class="system-tables-page">
    <!-- 面包屑 -->
    <a-breadcrumb class="breadcrumb">
      <a-breadcrumb-item><a @click="goHome">数据资产上下架</a></a-breadcrumb-item>
      <a-breadcrumb-item>{{ currentSystem?.name }}</a-breadcrumb-item>
    </a-breadcrumb>

    <DmtPageHeader
      :title="currentSystem?.name || '系统资产'"
      :sub-title="`${currentSystem?.description || ''} · 共 ${totalAssets} 个资产`"
    >
      <template #extra>
        <a-space>
          <a-button @click="goHome">返回</a-button>
          <a-button type="primary" @click="openSyncModal">
            <template #icon><IconSync /></template>
            同步元数据
          </a-button>
          <a-button type="outline" @click="refreshAll">
            <template #icon><IconRefresh /></template>
            刷新
          </a-button>
        </a-space>
      </template>
    </DmtPageHeader>

    <!-- 系统统计概览 -->
    <a-row :gutter="16" class="stats-row">
      <a-col :span="8">
        <a-card>
          <a-statistic title="资产总数" :value="totalAssets" :value-style="{ color: '#165DFF' }" />
        </a-card>
      </a-col>
      <a-col :span="8">
        <a-card>
          <a-statistic title="已上架" :value="onShelfCount" :value-style="{ color: '#00B42A' }">
            <template #suffix><span style="font-size: 14px; color: #86909c">/ {{ totalAssets }}</span></template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :span="8">
        <a-card>
          <a-statistic title="已下架" :value="offShelfCount" :value-style="{ color: '#FF7D00' }" />
        </a-card>
      </a-col>
    </a-row>

    <!-- 筛选 -->
    <a-card class="filter-card">
      <a-row :gutter="16">
        <a-col :span="10">
          <a-input
            v-model="searchKw"
            placeholder="搜索资产名称 / 描述 / HIVE 表名"
            allow-clear
            @press-enter="handleSearch"
            @clear="handleSearch"
          >
            <template #prefix><IconSearch /></template>
          </a-input>
        </a-col>
        <a-col :span="7">
          <a-select v-model="statusFilter" placeholder="状态" allow-clear @change="handleSearch">
            <a-option value="onShelf">已上架</a-option>
            <a-option value="offShelf">已下架</a-option>
            <a-option value="active">活跃</a-option>
          </a-select>
        </a-col>
        <a-col :span="7">
          <a-space>
            <a-button type="primary" @click="handleSearch">
              <template #icon><IconSearch /></template>
              搜索
            </a-button>
            <a-button @click="resetSearch">重置</a-button>
          </a-space>
        </a-col>
      </a-row>
    </a-card>

    <!-- 资产表 -->
    <a-card>
      <a-table
        :data="filteredAssets"
        :pagination="{ showTotal: true, pageSize: 10 }"
        row-key="id"
      >
        <template #columns>
          <a-table-column title="资产名称" :width="220">
            <template #cell="{ record }">
              <span class="link-name" @click="gotoDetail(record)">{{ record.name }}</span>
              <div class="hive-path">{{ record.hiveDatabase }}.{{ record.hiveTableName }}</div>
            </template>
          </a-table-column>
          <a-table-column title="类型" :width="100">
            <template #cell="{ record }">
              <a-tag color="arcoblue">{{ record.recordType === 'table' ? '数据资源' : '数据要素' }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column title="集群类型" :width="100">
            <template #cell="{ record }">
              <a-tag>{{ record.clusterType }}</a-tag>
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
          <a-table-column title="上架时间" :width="170">
            <template #cell="{ record }">{{ formatDateTime(record.onShelfTime) }}</template>
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
                  type="text"
                  size="small"
                  status="success"
                  @click="onShelf(record)"
                >上架</a-button>
                <a-button
                  v-if="canOffShelf(record)"
                  type="text"
                  size="small"
                  status="warning"
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
            <a-radio value="all">全部（{{ totalAssets }} 条）</a-radio>
            <a-radio value="stale">仅同步过期（{{ staleCount }} 条）</a-radio>
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
          <span v-if="syncProgress.failed > 0" class="sync-failed">· 失败 {{ syncProgress.failed }} 条</span>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { IconSearch, IconSync, IconRefresh } from '@arco-design/web-vue/es/icon'
import DmtPageHeader from '@/components-dca/common/PageHeader.vue'
import { ASSET_SYSTEMS, mockTables, type AssetSystemId, type ClusterType, SYSTEM_CLUSTER_MAP } from '@/mock-dca/data-map'
import { listingStore } from '@/mock-dca/listing-store'
import { triggerSyncFromShelf, runMetadataTask, createMetadataTask } from '@/mock-dca/metadata-bus'
import { formatDateTime } from '@/utils/dateUtils'

type ShelfStatus = 'active' | 'onShelf' | 'offShelf'

interface AssetRow {
  id: string
  name: string
  recordType: 'table' | 'metric'
  category: string
  owner: string
  registerTime: string
  status: ShelfStatus
  onShelfTime?: string
  offShelfTime?: string
  clusterType: ClusterType
  hiveDatabase: string
  hiveTableName: string
  lastSyncTime?: string
}

const statusLabel: Record<ShelfStatus, string> = {
  active: '活跃', onShelf: '已上架', offShelf: '已下架'
}
const statusColor: Record<ShelfStatus, string> = {
  active: 'green', onShelf: 'green', offShelf: 'orange'
}

const route = useRoute()
const router = useRouter()

const systemId = computed(() => route.params.systemId as AssetSystemId)
const currentSystem = computed(() => ASSET_SYSTEMS.find(s => s.id === systemId.value))

const parseHivePath = (fullPath: string) => {
  if (!fullPath) return { database: 'default', tableName: '' }
  const segs = fullPath.split('.')
  if (segs.length >= 3) return { database: segs[segs.length - 2], tableName: segs[segs.length - 1] }
  return { database: segs[0] || 'default', tableName: segs[segs.length - 1] }
}

const assets = ref<AssetRow[]>([])

const buildAssetsForSystem = (sysId: AssetSystemId): AssetRow[] => {
  const rows: AssetRow[] = []
  // 集群类型与来源系统保持一致：核心/催收/客服 → MySQL，数仓/风控 → HIVE
  const defaultCluster: ClusterType = SYSTEM_CLUSTER_MAP[sysId] || 'HIVE'

  mockTables.filter(t => t.systemId === sysId).forEach((t, idx) => {
    const p = parseHivePath(t.computeClusterTable)
    rows.push({
      id: `T-${sysId}-${idx}-${t.tableName}`,
      name: t.tableName,
      recordType: 'table',
      category: t.category,
      owner: t.owner,
      registerTime: t.registerTime,
      status: t.status,
      onShelfTime: t.onShelfTime,
      offShelfTime: t.offShelfTime,
      clusterType: t.clusterType || defaultCluster,
      hiveDatabase: p.database,
      hiveTableName: p.tableName,
      lastSyncTime: t.onShelfTime
    })
  })
  listingStore.metrics.filter(m => m.systemId === sysId).forEach((m, idx) => {
    rows.push({
      id: `M-${sysId}-${idx}-${m.metricCode}`,
      name: m.metricName,
      recordType: 'metric',
      category: m.category,
      owner: m.owner,
      registerTime: m.registerTime,
      status: m.status,
      onShelfTime: m.onShelfTime,
      offShelfTime: m.offShelfTime,
      clusterType: m.clusterType || defaultCluster,
      hiveDatabase: `metric_${m.category}`,
      hiveTableName: m.metricCode,
      lastSyncTime: m.onShelfTime
    })
  })
  return rows
}

// 监听 systemId 变化重新构建资产
watch(systemId, (id) => {
  assets.value = buildAssetsForSystem(id)
}, { immediate: true })

// 顶部统计
const totalAssets = computed(() => assets.value.length)
const onShelfCount = computed(() => assets.value.filter(a => a.status === 'onShelf' || a.status === 'active').length)
const offShelfCount = computed(() => assets.value.filter(a => a.status === 'offShelf').length)

// 筛选
const searchKw = ref('')
const statusFilter = ref<ShelfStatus | ''>('')

const filteredAssets = computed(() => {
  return assets.value.filter(a => {
    if (statusFilter.value && a.status !== statusFilter.value) return false
    if (searchKw.value) {
      const kw = searchKw.value.trim().toLowerCase()
      const fullHive = `${a.hiveDatabase}.${a.hiveTableName}`.toLowerCase()
      const hit = a.name.toLowerCase().includes(kw)
        || (a.category || '').toLowerCase().includes(kw)
        || fullHive.includes(kw)
      if (!hit) return false
    }
    return true
  })
})

const handleSearch = () => { /* 触发 computed */ }
const resetSearch = () => {
  searchKw.value = ''
  statusFilter.value = ''
}

// 同步
const SYNC_STALE_DAYS = 7
const isSyncStale = (a: AssetRow) => {
  if (!a.lastSyncTime) return true
  return (Date.now() - new Date(a.lastSyncTime).getTime()) > SYNC_STALE_DAYS * 86400000
}
const staleCount = computed(() => assets.value.filter(isSyncStale).length)

const syncVisible = ref(false)
const syncing = ref(false)
const syncForm = reactive({ scope: 'all' as 'all' | 'stale', targets: ['compute', 'analysis'] })
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
  const targets = syncForm.scope === 'all' ? assets.value : assets.value.filter(isSyncStale)
  if (targets.length === 0) {
    Message.info('没有可同步的资产')
    return
  }
  // ⚡ 联动：造一个"批量同步"汇总任务，状态变化通过 bus 回调回填
  const batchTask = createMetadataTask({
    taskName: `${currentSystem.value?.name || '系统'}批量同步（${targets.length} 个资产）`,
    dataSourceType: 'Hive',
    assetType: '表',
    triggeredBy: 'shelf'
  })
  Message.loading({ content: `任务 ${batchTask.id} 运行中…`, duration: 1500 })
  syncing.value = true
  syncProgress.total = targets.length
  syncProgress.done = 0
  syncProgress.failed = 0
  void runMetadataTask(batchTask.id).then(t => {
    // 通过 bus 自身逻辑登记一条虚拟产物：在我们批量模式下，把成功的资产时间更新
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
    if (t.status === 'success') {
      // 80% 成功率，更新成功资产的时间
      let fail = 0
      targets.forEach(a => {
        if (Math.random() < 0.8) {
          a.lastSyncTime = now
          syncProgress.done += 1
        } else {
          fail += 1
          syncProgress.failed += 1
        }
      })
      Message.success(`批次 ${batchTask.id} 完成：成功 ${syncProgress.done} 条，失败 ${syncProgress.failed} 条`)
    } else {
      Message.warning(`批次 ${batchTask.id} 失败：${t.errorMessage}`)
    }
    syncing.value = false
    setTimeout(() => { syncVisible.value = false }, 400)
  })
}

const syncOne = (record: AssetRow) => {
  // ⚡ 联动采集任务：基于记录创建采集任务，并切换到「元数据管理 - 任务」Tab
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

const refreshAll = () => {
  assets.value = buildAssetsForSystem(systemId.value)
  Message.success('已刷新')
}

// 操作
const canOnShelf = (a: AssetRow) => a.status === 'offShelf'
const canOffShelf = (a: AssetRow) => a.status === 'onShelf' || a.status === 'active'

const onShelf = (a: AssetRow) => {
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  a.status = 'onShelf'
  a.onShelfTime = now
  a.offShelfTime = undefined
  Message.success(`${a.name} 已上架`)
}
const offShelf = (a: AssetRow) => {
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  a.status = 'offShelf'
  a.offShelfTime = now
  Message.success(`${a.name} 已下架`)
}

const gotoDetail = (record: AssetRow) => {
  router.push(`/management/asset-management/listing-management/asset-management/detail/${encodeURIComponent(record.name)}`)
}

const goHome = () => {
  // 二级页所属分组：根据路由 path 决定返回路径
  // - /asset-management/.../data-source/system/... → 数据资源上下架
  // - /asset-management/.../element-management/system/... → 数据要素上下架
  // - /asset-management/.../asset-management/system/... → 数据资产上下架
  const path = route.path
  let homePath = '/management/asset-management/listing-management/asset-management'
  if (path.includes('/data-source/')) {
    homePath = '/management/asset-management/listing-management/data-source'
  } else if (path.includes('/element-management/')) {
    homePath = '/management/asset-management/listing-management/element-management'
  }
  router.push(homePath)
}
</script>

<style scoped>
.system-tables-page { padding: 16px 24px 24px; }
.breadcrumb { margin-bottom: 8px; }
.stats-row { margin-bottom: 16px; }
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