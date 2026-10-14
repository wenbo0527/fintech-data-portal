<template>
  <!-- @prd: metadata-collection -->
  <div class="data-source-page">
    <DmtPageHeader
      title="数据源管理"
      :sub-title="`共 ${dataSources.length} 个数据源连接，覆盖 4 种集群类型`"
    >
      <template #extra>
        <a-space>
          <a-button @click="openTestModal">
            <template #icon><IconLink /></template>
            连接测试
          </a-button>
          <a-button type="primary" @click="openAdd">
            <template #icon><IconPlus /></template>
            新增数据源
          </a-button>
        </a-space>
      </template>
    </DmtPageHeader>

    <!-- 统计卡 -->
    <a-row :gutter="16" class="stats-row">
      <a-col :span="6">
        <a-card>
          <a-statistic title="数据源总数" :value="stats.total" :value-style="{ color: '#165DFF' }" />
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card>
          <a-statistic title="在线" :value="stats.healthy" :value-style="{ color: '#00B42A' }">
            <template #suffix><span style="font-size: 13px; color: #86909c">个</span></template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card>
          <a-statistic title="告警" :value="stats.warning" :value-style="{ color: '#FF7D00' }" />
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card>
          <a-statistic title="离线" :value="stats.offline" :value-style="{ color: '#86909C' }" />
        </a-card>
      </a-col>
    </a-row>

    <!-- 表格 -->
    <a-card>
      <template #title>
        <a-space>
          <IconStorage />
          <span>数据源列表</span>
        </a-space>
      </template>
      <a-row :gutter="16" class="filter-row">
        <a-col :span="8">
          <a-input v-model="keyword" placeholder="搜索名称 / IP" allow-clear @input="onFilterChange">
            <template #prefix><IconSearch /></template>
          </a-input>
        </a-col>
        <a-col :span="6">
          <a-select v-model="clusterFilter" placeholder="集群类型" allow-clear @change="onFilterChange">
            <a-option v-for="t in clusterTypes" :key="t" :value="t">{{ t }}</a-option>
          </a-select>
        </a-col>
        <a-col :span="6">
          <a-select v-model="statusFilter" placeholder="健康状态" allow-clear @change="onFilterChange">
            <a-option value="healthy">在线</a-option>
            <a-option value="warning">告警</a-option>
            <a-option value="offline">离线</a-option>
          </a-select>
        </a-col>
      </a-row>

      <a-table
        :data="filteredData"
        :pagination="false"
        row-key="id"
      >
        <template #columns>
          <a-table-column title="名称" :width="180">
            <template #cell="{ record }">
              <a-space>
                <span class="cluster-tag-badge">
                  <span class="cluster-dot" :style="{ background: clusterColor[record.clusterType as ClusterType] }" />
                  {{ record.name }}
                </span>
              </a-space>
            </template>
          </a-table-column>
          <a-table-column title="集群类型" :width="100">
            <template #cell="{ record }">
              <a-tag :color="clusterTagColor[record.clusterType as ClusterType]">{{ record.clusterType }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column title="地址" :width="200">
            <template #cell="{ record }">
              <span class="hive-table">{{ record.host }}:{{ record.port }}</span>
            </template>
          </a-table-column>
          <a-table-column title="数据库 / Schema" :width="160">
            <template #cell="{ record }">
              <span class="hive-table">{{ record.database || '—' }}</span>
            </template>
          </a-table-column>
          <a-table-column title="关联系统" :width="120">
            <template #cell="{ record }">
              <a-tag>{{ assetSystemName[record.relatedSystem] }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column title="最近同步" :width="170">
            <template #cell="{ record }">
              <span :class="{ 'sync-stale': isStale(record.lastSyncTime) }">{{ formatDateTime(record.lastSyncTime) }}</span>
            </template>
          </a-table-column>
          <a-table-column title="健康" :width="100">
            <template #cell="{ record }">
              <a-tag :color="healthTagColor[record.health as Health]">{{ healthLabel[record.health as Health] }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column title="操作" :width="240" fixed="right">
            <template #cell="{ record }">
              <a-space>
                <a-button type="text" size="small" @click="testOne(record)">测试</a-button>
                <a-button type="text" size="small" @click="editOne(record)">编辑</a-button>
                <a-button type="text" size="small" @click="createSyncTask(record)">同步</a-button>
                <a-popconfirm
                  content="确定删除该数据源？"
                  @ok="deleteOne(record)"
                >
                  <a-button type="text" size="small" status="danger">删除</a-button>
                </a-popconfirm>
              </a-space>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>

    <!-- 新增 / 编辑 Modal -->
    <a-modal
      v-model:visible="editVisible"
      :title="editingId ? '编辑数据源' : '新增数据源'"
      :width="640"
      :ok-text="'保存'"
      @ok="saveDataSource"
      @cancel="editVisible = false"
    >
      <a-form :model="editForm" layout="vertical">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="名称" required>
              <a-input v-model="editForm.name" placeholder="如：核心交易系统 MySQL" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="集群类型" required>
              <a-select v-model="editForm.clusterType">
                <a-option v-for="t in clusterTypes" :key="t" :value="t">{{ t }}</a-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="主机" required>
              <a-input v-model="editForm.host" placeholder="例如：10.20.30.40" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="端口" required>
              <a-input-number v-model="editForm.port" :min="1" :max="65535" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="关联系统">
              <a-select v-model="editForm.relatedSystem">
                <a-option v-for="s in ASSET_SYSTEMS" :key="s.id" :value="s.id">{{ s.name }}</a-option>
                <a-option value="">无（未关联）</a-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="数据库 / Schema">
              <a-input v-model="editForm.database" placeholder="如：core_db" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="用户名">
              <a-input v-model="editForm.username" placeholder="root" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="密码">
              <a-input-password v-model="editForm.password" placeholder="******" />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="备注">
              <a-textarea v-model="editForm.remark" placeholder="连接说明 / 使用范围 / 负责人..." />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>

    <!-- 连接测试 Modal -->
    <a-modal
      v-model:visible="testVisible"
      title="批量连接测试"
      :width="520"
      :footer="false"
    >
      <div v-if="!testResult">
        <a-spin tip="正在测试连接..." />
      </div>
      <div v-else>
        <div v-for="r in testResult" :key="r.id" class="test-row">
          <span class="test-row-name">{{ r.name }}</span>
          <a-tag :color="healthTagColor[r.health]">{{ healthLabel[r.health] }}</a-tag>
          <span class="test-latency">{{ r.latency }}ms</span>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { Message } from '@arco-design/web-vue'
import {
  IconStorage,
  IconLink,
  IconPlus,
  IconSearch
} from '@arco-design/web-vue/es/icon'
import DmtPageHeader from '@/components-dca/common/PageHeader.vue'
import { ASSET_SYSTEMS, type AssetSystemId } from '@/mock-dca/data-map'
import {
  createMetadataTask,
  startMetadataTaskAsync,
  onTaskComplete
} from '@/mock-dca/metadata-bus'
import { formatDateTime } from '@/utils/dateUtils'

type ClusterType = 'HIVE' | 'MySQL' | 'Oracle'
type Health = 'healthy' | 'warning' | 'offline'

interface DataSource {
  id: string
  name: string
  clusterType: ClusterType
  host: string
  port: number
  database?: string
  username?: string
  password?: string
  relatedSystem: AssetSystemId | ''
  remark?: string
  health: Health
  lastSyncTime?: string
  latency?: number
}

// ========== mock 数据（持久化 localStorage） ==========
const STORAGE_KEY = 'dmt-data-sources'

const seedDataSources: DataSource[] = [
  { id: 'DS-001', name: '核心交易系统 MySQL', clusterType: 'MySQL', host: '10.20.30.41', port: 3306, database: 'core_db', username: 'readonly', relatedSystem: 'core', health: 'healthy', lastSyncTime: '2026-07-21 09:30', latency: 12 },
  { id: 'DS-002', name: '核心用户库 MySQL', clusterType: 'MySQL', host: '10.20.30.42', port: 3306, database: 'cdp_db', username: 'readonly', relatedSystem: 'core', health: 'healthy', lastSyncTime: '2026-07-21 09:30', latency: 16 },
  { id: 'DS-003', name: '催收事件库 MySQL', clusterType: 'MySQL', host: '10.20.30.51', port: 3306, database: 'coll_db', relatedSystem: 'collection', health: 'healthy', lastSyncTime: '2026-07-21 08:00', latency: 28 },
  { id: 'DS-004', name: '客服工单库 MySQL', clusterType: 'MySQL', host: '10.20.30.61', port: 3306, database: 'cs_db', relatedSystem: 'service', health: 'warning', lastSyncTime: '2026-07-20 18:00', latency: 145 },
  { id: 'DS-005', name: '风控决策 HIVE', clusterType: 'HIVE', host: '10.20.30.71', port: 10000, database: 'risk_db', relatedSystem: 'risk', health: 'healthy', lastSyncTime: '2026-07-21 09:30', latency: 88 },
  { id: 'DS-006', name: '数仓底表 HIVE', clusterType: 'HIVE', host: '10.20.30.72', port: 10000, database: 'dfd_db', relatedSystem: 'hive', health: 'healthy', lastSyncTime: '2026-07-21 09:30', latency: 65 },
  { id: 'DS-007', name: '历史 Oracle', clusterType: 'Oracle', host: '10.20.30.81', port: 1521, database: 'ORCL', relatedSystem: 'core', health: 'offline', lastSyncTime: '2026-07-19 14:00', latency: undefined as any }
]

const loadFromStorage = (): DataSource[] => {
  if (typeof window === 'undefined') return seedDataSources
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seedDataSources))
  return seedDataSources
}

const dataSources = ref<DataSource[]>(loadFromStorage())
const persistDataSources = () => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataSources.value))
  }
}

// ========== 表单 / 筛选 ==========
const keyword = ref('')
const clusterFilter = ref<ClusterType | ''>('')
const statusFilter = ref<Health | ''>('')
const onFilterChange = () => { /* trigger computed */ }

const clusterTypes: ClusterType[] = ['HIVE', 'MySQL', 'Oracle']
const clusterColor: Record<ClusterType, string> = { HIVE: '#165dff', MySQL: '#FF7D00', Oracle: '#722ED1' }
const clusterTagColor: Record<ClusterType, string> = { HIVE: 'arcoblue', MySQL: 'orange', Oracle: 'purple' }
const healthLabel: Record<Health, string> = { healthy: '在线', warning: '告警', offline: '离线' }
const healthTagColor: Record<Health, string> = { healthy: 'green', warning: 'orange', offline: 'gray' }
const assetSystemName: Record<string, string> = Object.fromEntries(
  ASSET_SYSTEMS.map(s => [s.id, s.name])
)
assetSystemName[''] = '未关联'

const isStale = (t?: string) => {
  if (!t) return true
  return (Date.now() - new Date(t).getTime()) > 3 * 86400000 // 3 天
}

const stats = computed(() => ({
  total: dataSources.value.length,
  healthy: dataSources.value.filter(s => s.health === 'healthy').length,
  warning: dataSources.value.filter(s => s.health === 'warning').length,
  offline: dataSources.value.filter(s => s.health === 'offline').length
}))

const filteredData = computed(() => {
  return dataSources.value.filter(s => {
    if (clusterFilter.value && s.clusterType !== clusterFilter.value) return false
    if (statusFilter.value && s.health !== statusFilter.value) return false
    if (keyword.value) {
      const kw = keyword.value.trim().toLowerCase()
      const hit = s.name.toLowerCase().includes(kw) || s.host.toLowerCase().includes(kw)
      if (!hit) return false
    }
    return true
  })
})

// ========== 新增 / 编辑 ==========
const editVisible = ref(false)
const editingId = ref('')
const editForm = reactive({
  name: '',
  clusterType: 'MySQL' as ClusterType,
  host: '',
  port: 3306 as number,
  database: '',
  username: '',
  password: '',
  relatedSystem: '' as AssetSystemId | '',
  remark: ''
})

const openAdd = () => {
  editingId.value = ''
  Object.assign(editForm, {
    name: '', clusterType: 'MySQL', host: '', port: 3306, database: '', username: '', password: '', relatedSystem: '', remark: ''
  })
  editVisible.value = true
}
const editOne = (record: DataSource) => {
  editingId.value = record.id
  Object.assign(editForm, {
    name: record.name,
    clusterType: record.clusterType,
    host: record.host,
    port: record.port,
    database: record.database || '',
    username: record.username || '',
    password: record.password || '',
    relatedSystem: record.relatedSystem,
    remark: record.remark || ''
  })
  editVisible.value = true
}
const saveDataSource = () => {
  if (!editForm.name.trim()) {
    Message.warning('请输入名称')
    return
  }
  if (!editForm.host.trim()) {
    Message.warning('请输入主机地址')
    return
  }
  if (editingId.value) {
    const idx = dataSources.value.findIndex(s => s.id === editingId.value)
    if (idx >= 0) {
      dataSources.value[idx] = { ...dataSources.value[idx], ...editForm }
    }
    Message.success('已更新')
  } else {
    const id = `DS-${String(dataSources.value.length + 1).padStart(3, '0')}`
    dataSources.value.push({ id, health: 'warning', ...editForm })
    Message.success('已新增（标记为告警，请稍后测试连接）')
  }
  persistDataSources()
  editVisible.value = false
}

const deleteOne = (record: DataSource) => {
  dataSources.value = dataSources.value.filter(s => s.id !== record.id)
  persistDataSources()
  Message.success('已删除')
}

// ========== 连接测试 ==========
const testVisible = ref(false)
const testResult = ref<Array<{ id: string; name: string; health: Health; latency: number }> | null>(null)
const openTestModal = async () => {
  testVisible.value = true
  testResult.value = null
  await new Promise(r => setTimeout(r, 800))
  testResult.value = dataSources.value.map(s => ({
    id: s.id,
    name: s.name,
    health: s.health,
    latency: s.latency ?? Math.floor(Math.random() * 200)
  }))
}
const testOne = (record: DataSource) => {
  Message.loading({ content: `正在测试 ${record.name}...`, duration: 600 })
  setTimeout(() => {
    const latency = Math.floor(Math.random() * 200)
    const health: Health = latency < 100 ? 'healthy' : latency < 150 ? 'warning' : 'offline'
    const idx = dataSources.value.findIndex(s => s.id === record.id)
    if (idx >= 0) {
      dataSources.value[idx].health = health
      dataSources.value[idx].latency = latency
      dataSources.value[idx].lastSyncTime = new Date().toISOString().slice(0, 19).replace('T', ' ')
      persistDataSources()
    }
    Message.success(`${record.name} ${healthLabel[health]} (${latency}ms)`)
  }, 800)
}

// ========== 「同步」操作 = 联动采集任务 ==========
const createSyncTask = (record: DataSource) => {
  const dataSourceMap: Record<ClusterType, 'Doris' | 'Hive' | 'Oracle' | 'MySQL'> = {
    HIVE: 'Hive', MySQL: 'MySQL', Oracle: 'Oracle'
  }
  const sysName = assetSystemName[record.relatedSystem] || ''
  const task = createMetadataTask({
    taskName: `${record.name}${sysName ? '（' + sysName + '）' : ''} 元数据同步`,
    dataSourceType: dataSourceMap[record.clusterType],
    assetType: '表',
    triggeredBy: 'user'
  })
  Message.success(`已创建同步任务 ${task.id}，可在元数据管理查看`)
  startMetadataTaskAsync(task.id)
}

// ========== 跨页联动：监听任务完成 ==========
onTaskComplete(() => {
  // 联动刷新 listing 页面数据（不强制刷新当前页）
  // 简单提示：把已联网的资产数反馈给用户
  Message.info('采集任务已完成，新资产已登记到上下架台账')
})
</script>

<style scoped>
.data-source-page { padding: 16px 24px; }
.stats-row { margin-bottom: 16px; }
.filter-row { margin-bottom: 16px; }
.cluster-tag-badge { display: inline-flex; align-items: center; gap: 6px; }
.cluster-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
.hive-table {
  font-family: 'JetBrains Mono', Consolas, Menlo, monospace;
  font-size: 12px;
  color: #165dff;
  background: #f0f7ff;
  padding: 1px 5px;
  border-radius: 3px;
}
.sync-stale { color: #ff7d00; }
.test-row { display: flex; align-items: center; gap: 12px; padding: 8px 0; }
.test-row-name { flex: 1; }
.test-latency { color: #86909c; font-size: 12px; font-family: monospace; }
</style>
