<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold text-gray-900">告警中心</h1>
      <div class="flex space-x-2">
        <a-select v-model="statusFilter" placeholder="状态筛选" style="width: 120px">
          <a-option value="">全部</a-option>
          <a-option value="open">待处理</a-option>
          <a-option value="acknowledged">已确认</a-option>
          <a-option value="closed">已关闭</a-option>
        </a-select>
        <a-select v-model="levelFilter" placeholder="级别筛选" style="width: 120px">
          <a-option value="">全部</a-option>
          <a-option value="info">信息</a-option>
          <a-option value="warning">警告</a-option>
          <a-option value="error">错误</a-option>
          <a-option value="critical">严重</a-option>
        </a-select>
        <a-button @click="refreshData">
          <template #icon><icon-refresh /></template>
          刷新
        </a-button>
      </div>
    </div>

    <a-card class="bg-white">
      <div v-if="loading" class="text-center py-8">
        <a-spin />
      </div>
      <div v-else-if="filteredAlerts.length === 0" class="text-center py-8 text-gray-500">
        暂无告警记录
      </div>
      <div v-else>
        <a-table :data="filteredAlerts" :columns="columns">
          <template #target="{ record }">
            <span>{{ getTargetName(record.targetId) }}</span>
          </template>
          
          <template #level="{ record }">
            <a-tag :color="getLevelColor(record.level)">
              {{ getLevelLabel(record.level) }}
            </a-tag>
          </template>
          
          <template #state="{ record }">
            <a-tag :color="getStateColor(record.state)">
              {{ getStateLabel(record.state) }}
            </a-tag>
          </template>
          
          <template #message="{ record }">
            <div class="max-w-md truncate" :title="record.message">
              {{ record.message.split('\n')[0] }}
            </div>
          </template>
          
          <template #actions="{ record }">
            <div class="flex space-x-2">
              <a-button
                v-if="record.state === 'open'"
                type="text"
                size="small"
                @click="acknowledgeAlert(record.id)"
              >
                确认
              </a-button>
              <a-button
                v-if="record.state !== 'closed'"
                type="text"
                size="small"
                status="success"
                @click="closeAlert(record.id)"
              >
                关闭
              </a-button>
              <a-button type="text" size="small" @click="viewDetails(record)">
                详情
              </a-button>
            </div>
          </template>
        </a-table>
      </div>
    </a-card>

    <a-modal
      v-model:visible="showDetailModal"
      title="告警详情"
      width="700px"
    >
      <div v-if="selectedAlert" class="space-y-4">
        <a-descriptions :data="detailData" :column="2" bordered />
        
        <div>
          <h4 class="font-medium mb-2">告警内容</h4>
          <div class="bg-gray-50 p-3 rounded border">
            <pre class="whitespace-pre-wrap text-sm">{{ selectedAlert.message }}</pre>
          </div>
        </div>
        
        <div v-if="selectedAlert.acknowledgedAt || selectedAlert.closedAt">
          <h4 class="font-medium mb-2">处理记录</h4>
          <a-descriptions :data="processData" :column="2" bordered />
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useMonitorStore } from '@/store/monitor'
import type { Alert } from '@/types/monitor'
import {
  IconRefresh
} from '@arco-design/web-vue/es/icon'

const store = useMonitorStore()

const alerts = computed(() => store.alerts)
const loading = computed(() => store.loading)
const statusFilter = ref('')
const levelFilter = ref('')
const showDetailModal = ref(false)
const selectedAlert = ref<Alert | null>(null)

const filteredAlerts = computed(() => {
  let filtered = alerts.value
  
  if (statusFilter.value) {
    filtered = filtered.filter(alert => alert.state === statusFilter.value)
  }
  
  if (levelFilter.value) {
    filtered = filtered.filter(alert => alert.level === levelFilter.value)
  }
  
  return filtered
})

const columns = [
  { title: '监控目标', dataIndex: 'targetId', slotName: 'target' },
  { title: '级别', dataIndex: 'level', slotName: 'level' },
  { title: '状态', dataIndex: 'state', slotName: 'state' },
  { title: '告警内容', dataIndex: 'message', slotName: 'message' },
  { title: '创建时间', dataIndex: 'createdAt' },
  { title: '操作', slotName: 'actions' }
]

const detailData = computed(() => {
  if (!selectedAlert.value) return []
  return [
    { label: '告警ID', value: selectedAlert.value.id },
    { label: '监控目标', value: getTargetName(selectedAlert.value.targetId) },
    { label: '级别', value: getLevelLabel(selectedAlert.value.level) },
    { label: '状态', value: getStateLabel(selectedAlert.value.state) },
    { label: '创建时间', value: formatTime(selectedAlert.value.createdAt) },
    { label: '通知渠道', value: selectedAlert.value.channel.join(', ') }
  ]
})

const processData = computed(() => {
  if (!selectedAlert.value) return []
  const data = []
  if (selectedAlert.value.acknowledgedAt) {
    data.push({ label: '确认时间', value: formatTime(selectedAlert.value.acknowledgedAt) })
  }
  if (selectedAlert.value.closedAt) {
    data.push({ label: '关闭时间', value: formatTime(selectedAlert.value.closedAt) })
  }
  return data
})

const getTargetName = (targetId: string) => {
  const target = store.targets.find(t => t.id === targetId)
  return target?.name || '未知目标'
}

const getLevelLabel = (level: string) => {
  const labels = {
    info: '信息',
    warning: '警告',
    error: '错误',
    critical: '严重'
  }
  return labels[level as keyof typeof labels] || level
}

const getLevelColor = (level: string) => {
  const colors = {
    info: 'blue',
    warning: 'orange',
    error: 'red',
    critical: 'red'
  }
  return colors[level as keyof typeof colors] || 'gray'
}

const getStateLabel = (state: string) => {
  const labels = {
    open: '待处理',
    acknowledged: '已确认',
    closed: '已关闭'
  }
  return labels[state as keyof typeof labels] || state
}

const getStateColor = (state: string) => {
  const colors = {
    open: 'red',
    acknowledged: 'orange',
    closed: 'green'
  }
  return colors[state as keyof typeof colors] || 'gray'
}

const formatTime = (timestamp: string) => {
  return new Date(timestamp).toLocaleString('zh-CN')
}

const acknowledgeAlert = (alertId: string) => {
  store.updateAlert(alertId, { state: 'acknowledged' })
}

const closeAlert = (alertId: string) => {
  store.updateAlert(alertId, { state: 'closed' })
}

const viewDetails = (alert: Alert) => {
  selectedAlert.value = alert
  showDetailModal.value = true
}

const refreshData = () => {
  // 这里可以实现数据刷新功能
  console.log('刷新告警数据')
}

onMounted(() => {
  // 这里可以加载初始数据
})
</script>