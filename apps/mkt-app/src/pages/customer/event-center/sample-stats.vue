<template>
  <div class="sample-stats">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">
          <span v-if="currentEvent">{{ currentEvent.eventName }}</span>
          <span v-else>样本统计</span>
        </h1>

        <div class="event-info" v-if="currentEvent">
          <StatusTag :status="currentEvent.eventType" dictKey="eventType" />
          <span class="event-id">({{ currentEvent.id }})</span>
        </div>
      </div>
      <div class="header-right">
        <div class="time-controls">
          <a-radio-group v-model="timeRange" type="button" size="small">
            <a-radio value="1h">近1小时</a-radio>
            <a-radio value="6h">近6小时</a-radio>
            <a-radio value="24h">近1天</a-radio>
            <a-radio value="7d">近7天</a-radio>
          </a-radio-group>
        </div>
        <div class="action-buttons">
          <a-button @click="handleRefresh">
            <template #icon><IconRefresh /></template>
            刷新
          </a-button>
        </div>
      </div>
    </div>

    <!-- 图表区域 -->
    <div class="charts-section">
      <a-row :gutter="24">
        <!-- 消息趋势分析图 -->
        <a-col :span="24">
          <div class="chart-card main-chart">
            <div class="chart-header">
              <h3 class="chart-title">消息趋势分析</h3>
              <div class="chart-controls">
                <a-radio-group v-model="chartType" type="button" size="small">
                  <a-radio value="messages">消息数量</a-radio>
                </a-radio-group>
              </div>
            </div>
            <div class="chart-content">
              <div ref="trendChartRef" class="chart-container main-chart-container"></div>
            </div>
          </div>
        </a-col>
      </a-row>

      <a-row :gutter="24" style="margin-top: 24px;">
        <!-- 异常检测 -->
        <a-col :span="24">
          <div class="chart-card">
            <div class="chart-header">
              <h3 class="chart-title">异常检测</h3>
              <a-button type="text" size="small" @click="handleAnomalyRefresh">
                <template #icon><IconRefresh /></template>
              </a-button>
            </div>
            <div class="anomaly-list">
              <div
                v-for="anomaly in (sampleStats.anomalies || [])"
                :key="anomaly.id"
                class="anomaly-item"
                :class="`severity-${anomaly.severity}`"
              >
                <div class="anomaly-header">
                  <div class="anomaly-type">{{ getEventAnomalyTypeText(anomaly.type) }}</div>
                  <div class="anomaly-severity" :class="`severity-${anomaly.severity}`">
                    {{ getSeverityText(anomaly.severity) }}
                  </div>
                </div>
                <div class="anomaly-desc">{{ anomaly.description }}</div>
                <div class="anomaly-metrics">
                  <span class="anomaly-value">{{ formatNumber(anomaly.value) }}</span>
                  <span class="anomaly-threshold">阈值: {{ anomaly.threshold }}</span>
                  <span class="affected-users">影响用户: {{ anomaly.affectedUsers }}</span>
                </div>
                <div class="anomaly-time">{{ DateUtils.formatDateTime(anomaly.detectedAt) }}</div>
              </div>
              <div v-if="!sampleStats.anomalies || sampleStats.anomalies.length === 0" class="no-anomaly">
                <IconCheckCircle class="no-anomaly-icon" />
                <div class="no-anomaly-text">暂无异常检测</div>
              </div>
            </div>
          </div>
        </a-col>
      </a-row>
    </div>

    

    <!-- 消息详情表格 -->
    <div class="data-table-section">
      <div class="table-card">
        <div class="table-header">
          <h3 class="table-title">消息详情</h3>
          <div class="table-controls">
            <a-select v-model="messageTypeFilter" size="small" style="width: 120px;">
              <a-option value="all">全部类型</a-option>
              <a-option value="订单消息">订单消息</a-option>
              <a-option value="库存消息">库存消息</a-option>
              <a-option value="通知消息">通知消息</a-option>
              <a-option value="状态消息">状态消息</a-option>
              <a-option value="数据同步">数据同步</a-option>
            </a-select>
            <a-select v-model="formatFilter" size="small" style="width: 100px;">
              <a-option value="all">全部格式</a-option>
              <a-option value="json">JSON</a-option>
              <a-option value="xml">XML</a-option>
              <a-option value="text">文本</a-option>
              <a-option value="binary">二进制</a-option>
            </a-select>
          </div>
        </div>
        <div class="table-content">
          <a-table
            :data="filteredMessages"
            :loading="tableLoading"
            :pagination="tablePagination"
            :scroll="{ x: 980 }"
            @page-change="handleTablePageChange"
          >
            <template #columns>
              <a-table-column title="消息ID" data-index="id" width="120" />
              <a-table-column title="时间戳" width="160">
                <template #cell="{ record }">
                  {{ DateUtils.formatDateTime(record.timestamp) }}
                </template>
              </a-table-column>
              <a-table-column title="客户号" width="120">
                <template #cell="{ record }">
                  {{ extractCustomerId(record) }}
                </template>
              </a-table-column>

              <!-- 触发事件：消息触发的虚拟事件（VIRT***）。空时显示占位 -->
              <a-table-column title="触发事件" width="180">
                <template #cell="{ record }">
                  <a-tag
                    v-if="record.triggeredVirtualEvent && record.triggeredVirtualEvent.id"
                    color="arcoblue"
                    size="small"
                  >
                    {{ record.triggeredVirtualEvent.name || record.triggeredVirtualEvent.id }}
                    <span v-if="record.triggeredVirtualEvent.name" class="virt-event-id">({{ record.triggeredVirtualEvent.id }})</span>
                  </a-tag>
                  <span v-else class="no-trigger">—</span>
                </template>
              </a-table-column>

              
              <a-table-column title="消息内容" width="200">
                <template #cell="{ record }">
                  <a-popover title="消息内容详情">
                    <template #content>
                      <pre class="message-content-json">{{ JSON.stringify(record.content, null, 2) }}</pre>
                    </template>
                    <a-button size="mini" type="text">查看内容</a-button>
                  </a-popover>
                </template>
              </a-table-column>
            </template>
          </a-table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import * as echarts from 'echarts'
import { Message } from '@arco-design/web-vue'
import { mockEventAPI } from '@/mock/event'
import {
  IconRefresh,
  IconDownload,
  IconArrowLeft,
  IconInfoCircle,
  IconCheckCircle
} from '@arco-design/web-vue/es/icon'
import StatusTag from '@/components/common/StatusTag.vue'
import DateUtils from '@/utils/dateUtils'

const router = useRouter()
const route = useRoute()

// 响应式数据
const timeRange = ref('24h')

// 时间范围文本
const timeRangeText = computed(() => {
  const textMap = {
    '1h': '近1小时',
    '6h': '近6小时',
    '24h': '近1天',
    '7d': '近7天'
  }
  return textMap[timeRange.value] || '近1天'
})
const chartType = ref('messages')
const MESSAGE_DETAILS_LIMIT = 5
const messageTypeFilter = ref('all')
const formatFilter = ref('all')
const tableLoading = ref(false)

// 当前事件数据
const currentEvent = ref(null)
const sampleStats = ref({
  eventId: '',
  eventName: '',
  totalMessages: 0,
  totalSize: 0,
  avgMessageSize: 0,
  messageTypes: [],
  hourlyDistribution: [],
  dailyDistribution: [],
  messageDetails: [],
  messageTrends: [],
  anomalies: [],
  contentAnalysis: {
    topFields: [],
    fieldTypes: {},
    contentPatterns: [],
    sizeDistribution: []
  }
})

// 计算属性
const filteredMessages = computed(() => {
  if (!sampleStats.value || !sampleStats.value.messageDetails) {
    return []
  }
  let messages = sampleStats.value.messageDetails
  
  // 按消息类型筛选
  if (messageTypeFilter.value !== 'all') {
    messages = messages.filter(msg => msg.messageType === messageTypeFilter.value)
  }
  
  // 按格式筛选
  if (formatFilter.value !== 'all') {
    messages = messages.filter(msg => msg.format === formatFilter.value)
  }
  // 近5条（按时间倒序）
  return [...messages]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, MESSAGE_DETAILS_LIMIT)
    .map(m => ({
      ...m,
      properties: Array.isArray(m.properties) ? m.properties : []
    }))
})

// 展示的总消息数（基于选择的时间范围）
const displayTotalMessages = computed(() => {
  const stats = sampleStats.value || {}
  const hourly = stats.hourlyDistribution || []
  const daily = stats.dailyDistribution || []
  if (timeRange.value === '1h') {
    if (hourly.length === 0) return 0
    return hourly[hourly.length - 1].messageCount || 0
  }
  if (timeRange.value === '6h') {
    const last6 = hourly.slice(Math.max(hourly.length - 6, 0))
    return last6.reduce((sum, item) => sum + (item.messageCount || 0), 0)
  }
  if (timeRange.value === '24h') {
    return hourly.reduce((sum, item) => sum + (item.messageCount || 0), 0)
  }
  if (timeRange.value === '7d') {
    return daily.reduce((sum, item) => sum + (item.messageCount || 0), 0)
  }
  return stats.totalMessages || 0
})



// 响应式引用
const trendChartRef = ref(null)

// 图表实例
let trendChart = null

// 表格分页
const tablePagination = reactive({
  total: 5,
  current: 1,
  pageSize: 5,
  showTotal: false
})

// 计算属性 - 已移除旧的tableData，使用filteredUserEvents

// 获取趋势变化百分比
const getTrendChange = (type) => {
  if (!sampleStats.value || !sampleStats.value.messageTrends || sampleStats.value.messageTrends.length < 2) {
    return '0.0'
  }
  const trends = sampleStats.value.messageTrends
  const current = trends[trends.length - 1]
  const previous = trends[trends.length - 2]
  
  if (!current || !previous) {
    return '0.0'
  }
  
  if (type === 'messages') {
    const change = previous.messageCount > 0 
      ? ((current.messageCount - previous.messageCount) / previous.messageCount) * 100
      : 0
    return change.toFixed(1)
  } else if (type === 'size') {
    const change = previous.totalSize > 0
      ? ((current.totalSize - previous.totalSize) / previous.totalSize) * 100
      : 0
    return change.toFixed(1)
  }
  return '0.0'
}

// 状态相关方法
const getStatusColor = (status) => {
  if (!status) return 'gray'
  const colors = {
    success: 'green',
    error: 'red',
    timeout: 'orange'
  }
  return colors[status] || 'gray'
}

const getStatusText = (status) => {
  if (!status) return '未知'
  const texts = {
    success: '成功',
    error: '错误',
    timeout: '超时'
  }
  return texts[status] || '未知'
}

const getEventAnomalyTypeText = (type) => {
  if (!type) return '未知异常'
  const texts = {
    spike: '异常激增',
    drop: '异常下降',
    pattern: '模式异常',
    response_time: '响应时间异常'
  }
  return texts[type] || '未知异常'
}

 

 

// 格式化字节大小
const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}



// 提取客户号
const extractCustomerId = (record) => {
  if (!record) return '-'
  const content = record.content || {}
  let cid = record.customerId || content.customerId || content.userId
  if (!cid && Array.isArray(record.properties)) {
    const found = record.properties.find(p => p && (p.key === 'customerId' || p.key === 'userId'))
    cid = found?.value
  }
  return cid || '-'
}

// 初始化趋势图
const initTrendChart = () => {
  if (!trendChartRef.value) return
  
  trendChart = echarts.init(trendChartRef.value)
  
  const data = getChartData()
  
  const option = {
    title: {
      text: getChartTitle(),
      left: 'center',
      textStyle: {
        fontSize: 14,
        fontWeight: 'normal'
      }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      }
    },
    legend: {
      data: [getChartTitle()],
      bottom: 0
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: data.labels,
      axisLabel: {
        rotate: 45
      }
    },
    yAxis: {
      type: 'value',
      name: getChartUnit()
    },
    series: [
      {
        name: getChartTitle(),
        type: chartType.value === 'response' ? 'bar' : 'line',
        data: data.values,
        smooth: chartType.value !== 'response',
        lineStyle: chartType.value === 'response' ? undefined : {
          color: getChartColor(),
          width: 3
        },
        itemStyle: chartType.value === 'response' ? {
          color: getChartColor()
        } : undefined,
        areaStyle: chartType.value === 'response' ? undefined : {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: getChartColor() + '30' },
            { offset: 1, color: getChartColor() + '10' }
          ])
        }
      }
    ]
  }
  
  trendChart.setOption(option)
}

// 获取图表数据
const getChartData = () => {
  if (!sampleStats.value) {
    return { values: [], labels: [] }
  }
  
  const trends = sampleStats.value.messageTrends || []
  
  let values = []
  let labels = []
  
  if (chartType.value === 'messages') {
    values = trends.map(item => item.messageCount || 0)
    labels = trends.map(item => DateUtils.formatDate(item.timestamp))
  } else if (chartType.value === 'size') {
    values = trends.map(item => item.totalSize || 0)
    labels = trends.map(item => DateUtils.formatDate(item.timestamp))
  } else if (chartType.value === 'avgSize') {
    values = trends.map(item => item.avgSize || 0)
    labels = trends.map(item => DateUtils.formatDate(item.timestamp))
  }
  
  return { values, labels }
}

// 获取图表标题
const getChartTitle = () => {
  const titles = {
    messages: '消息数量趋势',
    size: '消息总大小趋势',
    avgSize: '平均消息大小趋势'
  }
  return titles[chartType.value] || '趋势分析'
}

// 获取图表单位
const getChartUnit = () => {
  const units = {
    messages: '消息数量',
    size: '大小(字节)',
    avgSize: '平均大小(字节)'
  }
  return units[chartType.value] || '数量'
}

// 获取图表颜色
const getChartColor = () => {
  const colorMap = {
    messages: '#3491FA',
    size: '#00B42A',
    avgSize: '#F53F3F'
  }
  return colorMap[chartType.value]
}

// 获取异常类型文本
const getAnomalyTypeText = (type) => {
  const typeMap = {
    spike: '尖峰',
    drop: '跌落',
    pattern: '模式异常'
  }
  return typeMap[type] || type
}

// 获取严重程度文本
const getSeverityText = (severity) => {
  const severityMap = {
    low: '低',
    medium: '中',
    high: '高'
  }
  return severityMap[severity] || severity
}

// 格式化数字
const formatNumber = (num) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

// 格式化时间
 

// 计算转化率
const calculateConversionRate = (conversions, clicks) => {
  if (clicks === 0) return 0
  return ((conversions / clicks) * 100).toFixed(2)
}

// 计算错误率
const calculateErrorRate = (errors, clicks) => {
  if (clicks === 0) return 0
  return ((errors / clicks) * 100).toFixed(2)
}
  
  // 获取趋势宽度 - 已移除旧逻辑
  const getTrendWidth = (value) => {
    return 50 // 默认值
  }
  
  // 事件处理函数
const handleRefresh = async () => {
  if (!currentEvent.value) return
  
  tableLoading.value = true
  try {
    const stats = await mockEventAPI.getSampleStats(currentEvent.value.id)
    sampleStats.value = stats
    
    // 重新初始化图表
    nextTick(() => {
      initTrendChart()
    })
    
    Message.success('数据已刷新')
  } catch (error) {
    Message.error('数据刷新失败')
    console.error('刷新数据失败:', error)
  } finally {
    tableLoading.value = false
  }
}

const handleExport = () => {
  Message.info('导出功能开发中...')
}

const handleBack = () => {
  router.push('/customer/event-management')
}

const handleChartExport = () => {
  Message.success('消息趋势图导出功能开发中...')
}

const handleAnomalyRefresh = () => {
  Message.success('异常检测已刷新')
}

const handleTableExport = () => {
  Message.success('消息详情导出功能开发中...')
}

const handleTablePageChange = (page) => {
  tablePagination.current = page
}

// 监听数据变化
watch([chartType], () => {
  nextTick(() => {
    if (trendChart) {
      initTrendChart()
    }
  })
})

// 生命周期
onMounted(async () => {
  // 获取路由参数（虚拟事件带 isVirtual=true）
  const eventId = route.query.eventId
  const eventName = route.query.eventName || '测试事件'
  const isVirtual = route.query.isVirtual === 'true'

  if (eventId) {
    // 模拟获取事件数据
    currentEvent.value = {
      id: eventId,
      eventName,
      eventType: isVirtual ? '虚拟事件' : '系统事件'
    }

    // 加载样本统计数据
    try {
      await handleRefresh()
    } catch (e) {
      console.error('[sample-stats] handleRefresh failed:', e)
      Message.error('数据加载失败，将显示空数据')
    }
  }

  nextTick(() => {
    try {
      initTrendChart()
    } catch (e) {
      console.error('[sample-stats] initTrendChart failed:', e)
    }
  })
})

onUnmounted(() => {
  if (trendChart) {
    trendChart.dispose()
  }
})
</script>

<style scoped>
.sample-stats {
  padding: 24px;
  background: #F2F3F5;
  min-height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
}

/* 页面头部 */
.page-header {
  background: white;
  padding: 20px 24px;
  border-radius: 8px;
  margin-bottom: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: #1D2129;
  margin: 0;
}

.event-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.event-name {
  font-size: 16px;
  font-weight: 500;
  color: #1D2129;
}

.event-id {
  font-size: 12px;
  color: #8A8E99;
  font-family: monospace;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.time-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

/* 指标卡片 */
.metrics-cards {
  margin-bottom: 24px;
}

.metric-card {
  background: white;
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: transform 0.2s ease;
}

.metric-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.primary-metric {
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  border: 1px solid #e8e9eb;
  position: relative;
  overflow: hidden;
}

.primary-metric::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #3491FA 0%, #00B42A 100%);
}

.metric-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.metric-title {
  font-size: 14px;
  color: #4E5969;
  font-weight: 500;
}

.metric-value {
  font-size: 32px;
  font-weight: 700;
  color: #1D2129;
  margin-bottom: 8px;
}

.metric-value-large {
  font-size: 48px;
  font-weight: 800;
  color: #1D2129;
  margin-bottom: 12px;
  line-height: 1.2;
}

.time-range-indicator {
  position: absolute;
  top: 16px;
  right: 16px;
}

.metric-change {
  display: flex;
  align-items: center;
  gap: 8px;
}

.change-up {
  color: #00B42A;
  font-size: 14px;
  font-weight: 600;
}

.change-down {
  color: #F53F3F;
  font-size: 14px;
  font-weight: 600;
}

.change-label {
  color: #8A8E99;
  font-size: 12px;
}

/* 图表区域 */
.charts-section {
  margin-bottom: 24px;
}

.chart-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  height: 100%;
}

.main-chart {
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  border: 1px solid #e8e9eb;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.chart-title {
  font-size: 18px;
  font-weight: 600;
  color: #1D2129;
  margin: 0;
}

.chart-controls {
  display: flex;
  gap: 8px;
  align-items: center;
}

.chart-content {
  position: relative;
}

.chart-container {
  width: 100%;
  height: 300px;
}

.main-chart-container {
  height: 400px;
}

.chart-container.small {
  height: 250px;
}



/* 异常检测 */
.anomaly-list {
  max-height: 300px;
  overflow-y: auto;
}

.anomaly-item {
  padding: 16px;
  border-radius: 6px;
  margin-bottom: 12px;
  border-left: 4px solid;
}

.anomaly-item.severity-low {
  background: rgba(0, 180, 42, 0.05);
  border-left-color: #00B42A;
}

.anomaly-item.severity-medium {
  background: rgba(255, 125, 0, 0.05);
  border-left-color: #FF7D00;
}

.anomaly-item.severity-high {
  background: rgba(245, 63, 63, 0.05);
  border-left-color: #F53F3F;
}

.anomaly-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.anomaly-type {
  font-size: 14px;
  font-weight: 600;
  color: #1D2129;
}

.anomaly-severity {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 500;
}

.anomaly-severity.severity-low {
  background: rgba(0, 180, 42, 0.1);
  color: #00B42A;
}

.anomaly-severity.severity-medium {
  background: rgba(255, 125, 0, 0.1);
  color: #FF7D00;
}

.anomaly-severity.severity-high {
  background: rgba(245, 63, 63, 0.1);
  color: #F53F3F;
}

.anomaly-desc {
  font-size: 13px;
  color: #4E5969;
  margin-bottom: 8px;
  line-height: 1.5;
}

.anomaly-time {
  font-size: 12px;
  color: #8A8E99;
}

.no-anomaly {
  text-align: center;
  padding: 40px 0;
  color: #8A8E99;
}

.no-anomaly-icon {
  font-size: 48px;
  color: #00B42A;
  margin-bottom: 16px;
}

.no-anomaly-text {
  font-size: 14px;
}

/* 表格区域 */
.data-table-section {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.table-card {
  padding: 20px;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.table-title {
  font-size: 16px;
  font-weight: 600;
  color: #1D2129;
  margin: 0;
}

.table-controls {
  display: flex;
  gap: 12px;
  align-items: center;
}

.table-content {
  position: relative;
}

/* 迷你趋势图 */
.mini-trend {
  display: flex;
  align-items: center;
  gap: 8px;
}

.trend-bar {
  width: 60px;
  height: 4px;
  background: #F2F3F5;
  border-radius: 2px;
  overflow: hidden;
}

.trend-fill {
  height: 100%;
  background: linear-gradient(90deg, #165DFF 0%, #00B42A 100%);
  border-radius: 2px;
  transition: width 0.3s ease;
}

.trend-value {
  font-size: 12px;
  color: #4E5969;
  font-weight: 500;
}

/* 专业桌面端优化 */
@media screen and (min-width: 1920px) {
  .sample-stats {
    padding: 32px;
  }
  
  .page-header {
    padding: 24px 32px;
  }
  
  .chart-card,
  .table-card {
    padding: 24px;
  }
  
  .metric-card {
    padding: 32px;
  }
}

/* 响应式设计 */
@media screen and (max-width: 1200px) {
  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }
  
  .header-right {
    width: 100%;
    justify-content: space-between;
  }
  
  .charts-section .arco-col {
    margin-bottom: 16px;
  }
}

/* 消息类型分布样式 */
.message-types-list {
  max-height: 300px;
  overflow-y: auto;
}

.message-type-item {
  display: flex;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.message-type-item:last-child {
  border-bottom: none;
}

.type-info {
  flex: 1;
}

.type-name {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 4px;
}

.type-stats {
  display: flex;
  gap: 8px;
  font-size: 12px;
  color: #666;
}

.type-count {
  color: #00b42a;
}

.type-percentage {
  color: #3491fa;
}

.type-size {
  font-size: 12px;
  color: #666;
}

/* 消息属性样式 */
.message-properties {
  font-size: 12px;
}

.property-item {
  display: flex;
  margin-bottom: 2px;
}

.prop-key {
  color: #666;
  margin-right: 4px;
}

.prop-value {
  color: #333;
  font-weight: 500;
}

.more-props {
  color: #3491fa;
  font-size: 11px;
  cursor: pointer;
}

/* 消息内容JSON样式 */
.message-content-json {
  background: #f5f5f5;
  padding: 12px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  max-width: 400px;
  max-height: 300px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

/* 触发事件列样式 */
.no-trigger {
  color: #c9cdd4;
  font-size: 12px;
}
.virt-event-id {
  margin-left: 4px;
  color: #86909c;
  font-size: 11px;
  font-family: monospace;
}

/* 异常详情样式 */
.anomaly-metrics {
  display: flex;
  gap: 12px;
  margin: 8px 0;
  font-size: 12px;
  color: #86909c;
}

.anomaly-value {
  color: #f53f3f;
  font-weight: 500;
}

.anomaly-threshold {
  color: #86909c;
}

.affected-users {
  color: #3491fa;
}

/* 设备信息样式 */
.device-info {
  font-size: 12px;
}

.device-detail {
  color: #86909c;
  font-size: 11px;
  margin-top: 2px;
}

/* 事件数据JSON样式 */
.event-data-json {
  max-width: 300px;
  max-height: 200px;
  overflow: auto;
  background: #f2f3f5;
  padding: 8px;
  border-radius: 4px;
  font-size: 11px;
  line-height: 1.4;
  margin: 0;
}

/* 错误信息样式 */
.error-message {
  color: #f53f3f;
  font-size: 12px;
  max-width: 150px;
  word-break: break-all;
}
</style>
