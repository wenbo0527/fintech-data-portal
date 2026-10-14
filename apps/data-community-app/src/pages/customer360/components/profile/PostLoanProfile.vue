<template>
  <div class="postloan-profile">
    <a-tabs v-model:active-key="activeSubTab" type="line" size="small" position="top" class="postloan-subtabs">
      <a-tab-pane key="collection">
        <template #title>催收记录</template>
        <div class="profile-section">
          <div class="collection-records-section" v-if="collectionRecords?.length">
            <div class="flex justify-between items-center mb-4">
              <h4 class="subsection-title mb-0">催收记录详情</h4>
              <div class="flex gap-2">
                <a-select 
                  v-model="filterMethod" 
                  placeholder="筛选催收方式" 
                  style="width: 120px" 
                  size="small"
                  allow-clear
                >
                  <a-option value="电话">电话</a-option>
                  <a-option value="短信">短信</a-option>
                  <a-option value="上门">上门</a-option>
                  <a-option value="邮件">邮件</a-option>
                </a-select>
                <a-select 
                  v-model="filterResult" 
                  placeholder="筛选联系结果" 
                  style="width: 120px" 
                  size="small"
                  allow-clear
                >
                  <a-option value="联系成功">联系成功</a-option>
                  <a-option value="联系失败">联系失败</a-option>
                  <a-option value="已发送">已发送</a-option>
                  <a-option value="未联系到">未联系到</a-option>
                </a-select>
                <a-select 
                  v-model="sortBy" 
                  placeholder="排序方式" 
                  style="width: 120px" 
                  size="small"
                >
                  <a-option value="date-desc">时间倒序</a-option>
                  <a-option value="date-asc">时间正序</a-option>
                  <a-option value="score-desc">评分降序</a-option>
                  <a-option value="score-asc">评分升序</a-option>
                </a-select>
                <a-button-group size="small">
                  <a-button 
                    :type="viewMode === 'table' ? 'primary' : 'secondary'"
                    @click="viewMode = 'table'"
                  >
                    表格
                  </a-button>
                  <a-button 
                    :type="viewMode === 'timeline' ? 'primary' : 'secondary'"
                    @click="viewMode = 'timeline'"
                  >
                    时间线
                  </a-button>
                </a-button-group>
              </div>
            </div>
            <a-table
              v-if="viewMode === 'table'"
              :columns="collectionColumns"
              :data="filteredAndSortedRecords"
              row-key="id"
              :pagination="{ pageSize: 10, showTotal: true, showPageSize: true, showJumper: true, pageSizeOptions: [5, 10, 20, 50] }"
              size="small"
            >
              <template #empty>
                <div class="text-center py-8 text-gray-500">
                  <div class="text-lg mb-2">📋</div>
                  <div>暂无催收记录</div>
                </div>
              </template>
              <template #collectionMethod="{ record }">
                <a-tag :color="getMethodTagColor(record.collectionMethod)">
                  {{ record.collectionMethod }}
                </a-tag>
              </template>
              <template #contactResult="{ record }">
                <a-tag :color="getResultTagColor(record.contactResult)">
                  {{ record.contactResult }}
                </a-tag>
              </template>
              <template #overdueAmount="{ record }">
                <span class="font-medium text-red-600">
                  ¥{{ formatAmount(record.overdueAmount) }}
                </span>
              </template>
              <template #overdueDays="{ record }">
                <span :class="getOverdueDaysClass(record.overdueDays)">
                  {{ record.overdueDays }}天
                </span>
              </template>
              <template #effectiveScore="{ record }">
                <div class="flex items-center gap-1">
                  <span :class="getScoreClass(record.effectiveScore)">
                    {{ record.effectiveScore }}
                  </span>
                  <div class="w-12 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      class="h-full transition-all duration-300"
                      :class="getScoreBarColor(record.effectiveScore)"
                      :style="{ width: record.effectiveScore + '%' }"
                    ></div>
                  </div>
                </div>
              </template>
              <template #actions="{ record }">
                <div class="flex gap-1">
              <a-button type="text" size="small" @click="viewDetails">
                    查看详情
                  </a-button>
                  <a-button type="text" size="small" @click="copyRecord(record)">
                    复制
                  </a-button>
                </div>
              </template>
            </a-table>

            <div v-if="viewMode === 'timeline'" class="timeline-view">
              <a-timeline>
                <a-timeline-item 
                  v-for="record in filteredAndSortedRecords" 
                  :key="record.id"
                  :color="getTimelineColor(record.effectiveScore)"
                >
                  <template #dot>
                    <div class="timeline-dot" :class="getTimelineDotClass(record.contactResult)">
                      {{ getMethodIcon(record.collectionMethod) }}
                    </div>
                  </template>
                  <div class="timeline-content">
                    <div class="flex justify-between items-start mb-2">
                      <div class="font-medium text-gray-900">
                        {{ record.collectionDate }} {{ record.collectionTime }}
                      </div>
                      <div class="flex gap-2">
                        <a-tag :color="getMethodTagColor(record.collectionMethod)" size="small">
                          {{ record.collectionMethod }}
                        </a-tag>
                        <a-tag :color="getResultTagColor(record.contactResult)" size="small">
                          {{ record.contactResult }}
                        </a-tag>
                      </div>
                    </div>
                    <div class="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-2">
                      <div>催收员：{{ record.collectorName }}</div>
                      <div>逾期金额：<span class="text-red-600 font-medium">¥{{ formatAmount(record.overdueAmount) }}</span></div>
                      <div>逾期天数：<span :class="getOverdueDaysClass(record.overdueDays)">{{ record.overdueDays }}天</span></div>
                      <div>效果评分：<span :class="getScoreClass(record.effectiveScore)">{{ record.effectiveScore }}</span></div>
                    </div>
                    <div v-if="record.promiseAmount" class="text-sm text-blue-600 mb-2">
                      承诺还款：¥{{ formatAmount(record.promiseAmount) }}（{{ record.promiseDate }}）
                    </div>
                    <div class="text-sm text-gray-700 mb-3">{{ record.remarks }}</div>
                    <div class="flex gap-2">
                    <a-button type="text" size="small" @click="viewDetails">
                        查看详情
                      </a-button>
                      <a-button type="text" size="small" @click="copyRecord(record)">
                        复制
                      </a-button>
                    </div>
                  </div>
                </a-timeline-item>
              </a-timeline>
            </div>
          </div>
          <a-empty v-else description="暂无催收记录" />
        </div>
      </a-tab-pane>
      <a-tab-pane key="bad-sms">
        <template #title>还款提醒</template>
        <div class="profile-section">
          <a-table
            :data="badNotifications"
            row-key="id"
            size="small"
            :pagination="{ pageSize: 5, showTotal: true, showPageSize: true, showJumper: true, pageSizeOptions: [5, 10, 20, 50] }"
          >
            <template #columns>
              <a-table-column title="短信发送时间" data-index="notificationDate" :width="180" />
              <a-table-column title="发送系统" data-index="sendSystem" :width="140" />
              <a-table-column title="短信发送状态" data-index="sendStatus" :width="120">
                <template #cell="{ record }">
                  <a-tag :color="getSendStatusColor(record.sendStatus)" size="small">
                    {{ record.sendStatus || '-' }}
                  </a-tag>
                </template>
              </a-table-column>
              <a-table-column title="短信发送接受状态" data-index="receiveStatus" :width="150">
                <template #cell="{ record }">
                  <a-tag :color="getReceiveStatusColor(record.receiveStatus)" size="small">
                    {{ record.receiveStatus || '-' }}
                  </a-tag>
                </template>
              </a-table-column>
              <a-table-column title="短信内容" data-index="content" :ellipsis="true">
                <template #cell="{ record }">
                  <span class="sms-content" :title="record.content">{{ record.content }}</span>
                </template>
              </a-table-column>
              <a-table-column title="备注" data-index="remark" :width="160" :ellipsis="true" />
            </template>
            <template #empty>
              <a-empty description="暂无还款提醒" />
            </template>
          </a-table>
        </div>
      </a-tab-pane>
    </a-tabs>

    
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Message } from '@arco-design/web-vue'

interface Props {
  userInfo?: any
  collectionRecords?: any[]
}

const activeSubTab = ref('collection')

// 筛选和排序状态
const filterMethod = ref('')
const filterResult = ref('')
const sortBy = ref('date-desc')
const viewMode = ref('table')

const props = withDefaults(defineProps<Props>(), {
  userInfo: () => ({}),
  collectionRecords: () => [
    {
      id: '1',
      collectionDate: '2024-01-15',
      collectionTime: '14:30:00',
      collectionMethod: '电话',
      collectorName: '张三',
      collectorPhone: '13800138001',
      contactResult: '联系成功',
      customerResponse: '同意还款',
      promiseAmount: 5000,
      promiseDate: '2024-01-20',
      overdueAmount: 5000,
      overdueDays: 15,
      effectiveScore: 85,
      duration: 8,
      riskLevel: '中',
      followUpAction: '电话回访',
      remarks: '客户承诺本周内还款，态度良好'
    },
    {
      id: '2',
      collectionDate: '2024-01-10',
      collectionTime: '09:15:00',
      collectionMethod: '短信',
      collectorName: '李四',
      collectorPhone: '13800138002',
      contactResult: '已发送',
      customerResponse: '未回复',
      overdueAmount: 5000,
      overdueDays: 10,
      effectiveScore: 30,
      duration: 0,
      riskLevel: '低',
      followUpAction: '继续电话催收',
      remarks: '发送还款提醒短信，客户未回复'
    },
    {
      id: '3',
      collectionDate: '2024-01-08',
      collectionTime: '16:45:00',
      collectionMethod: '上门',
      collectorName: '王五',
      collectorPhone: '13800138003',
      contactResult: '未联系到',
      customerResponse: '无响应',
      overdueAmount: 5000,
      overdueDays: 8,
      effectiveScore: 10,
      duration: 0,
      riskLevel: '高',
      followUpAction: '联系紧急联系人',
      remarks: '客户不在家，已联系家属，家属表示会转达'
    },
    {
      id: '4',
      collectionDate: '2024-01-05',
      collectionTime: '10:20:00',
      collectionMethod: '邮件',
      collectorName: '赵六',
      collectorPhone: '13800138004',
      contactResult: '已发送',
      customerResponse: '已查看',
      overdueAmount: 5000,
      overdueDays: 5,
      effectiveScore: 50,
      duration: 0,
      riskLevel: '中',
      followUpAction: '电话跟进',
      remarks: '发送正式催收函，客户已查看邮件'
    }
  ]
})

const badNotifications = computed(() => props.userInfo?.badNotifications || [])

// 模拟数据
// 已移除下方标签类信息的计算属性，保留核心数据视图

const collectionColumns = [
  {
    title: '催收日期',
    dataIndex: 'collectionDate',
    key: 'collectionDate',
    width: 100
  },
  {
    title: '催收方式',
    dataIndex: 'collectionMethod',
    key: 'collectionMethod',
    width: 100
  },
  {
    title: '催收员',
    dataIndex: 'collectorName',
    key: 'collectorName',
    width: 80
  },
  {
    title: '联系结果',
    dataIndex: 'contactResult',
    key: 'contactResult',
    width: 100
  },
  {
    title: '逾期金额',
    dataIndex: 'overdueAmount',
    key: 'overdueAmount',
    width: 100
  },
  {
    title: '逾期天数',
    dataIndex: 'overdueDays',
    key: 'overdueDays',
    width: 80
  },
  {
    title: '效果评分',
    dataIndex: 'effectiveScore',
    key: 'effectiveScore',
    width: 80
  },
  {
    title: '备注',
    dataIndex: 'remarks',
    key: 'remarks',
    ellipsis: true
  },
  {
    title: '操作',
    key: 'actions',
    width: 120
  }
]

// 催收方式标签颜色
const getMethodTagColor = (method: string) => {
  const colorMap: Record<string, string> = {
    '电话': 'blue',
    '短信': 'green',
    '上门': 'orange',
    '邮件': 'purple',
    '微信': 'cyan'
  }
  return colorMap[method] || 'default'
}

// 联系结果标签颜色
const getResultTagColor = (result: string) => {
  const colorMap: Record<string, string> = {
    '联系成功': 'green',
    '联系失败': 'red',
    '拒接': 'orange',
    '关机': 'gray',
    '已发送': 'blue',
    '未联系到': 'red',
    '已查看': 'cyan'
  }
  return colorMap[result] || 'default'
}

// 短信发送状态颜色
const getSendStatusColor = (status: string) => {
  const colorMap: Record<string, string> = {
    '发送成功': 'green',
    '发送失败': 'red',
    '发送中': 'orange',
    '待发送': 'blue'
  }
  return colorMap[status] || 'default'
}

// 短信发送接受状态颜色
const getReceiveStatusColor = (status: string) => {
  const colorMap: Record<string, string> = {
    '已送达': 'green',
    '送达失败': 'red',
    '等待回执': 'orange',
    '未知': 'gray'
  }
  return colorMap[status] || 'default'
}

// 逾期天数样式
const getOverdueDaysClass = (days: number) => {
  if (days <= 7) {return 'text-yellow-600 font-medium'}
  if (days <= 30) {return 'text-orange-600 font-medium'}
  return 'text-red-600 font-bold'
}

// 效果评分样式
const getScoreClass = (score: number) => {
  if (score >= 80) {return 'text-green-600 font-medium'}
  if (score >= 60) {return 'text-yellow-600 font-medium'}
  return 'text-red-600 font-medium'
}

// 效果评分进度条颜色
const getScoreBarColor = (score: number) => {
  if (score >= 80) {return 'bg-green-500'}
  if (score >= 60) {return 'bg-yellow-500'}
  return 'bg-red-500'
}

// 格式化金额
const formatAmount = (amount: number) => {
  return amount?.toLocaleString() || '0'
}

// 筛选和排序的计算属性
const filteredAndSortedRecords = computed(() => {
  let filtered = props.collectionRecords
  
  // 按催收方式筛选
  if (filterMethod.value) {
    filtered = filtered.filter(record => record.collectionMethod === filterMethod.value)
  }
  
  // 按联系结果筛选
  if (filterResult.value) {
    filtered = filtered.filter(record => record.contactResult === filterResult.value)
  }
  
  // 排序
  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy.value) {
      case 'date-desc':
        return new Date(b.collectionDate + ' ' + b.collectionTime).getTime() - 
               new Date(a.collectionDate + ' ' + a.collectionTime).getTime()
      case 'date-asc':
        return new Date(a.collectionDate + ' ' + a.collectionTime).getTime() - 
               new Date(b.collectionDate + ' ' + b.collectionTime).getTime()
      case 'score-desc':
        return b.effectiveScore - a.effectiveScore
      case 'score-asc':
        return a.effectiveScore - b.effectiveScore
      default:
        return 0
    }
  })
  
  return sorted
})

// 时间线相关方法
const getTimelineColor = (score: number) => {
  if (score >= 80) {return 'green'}
  if (score >= 60) {return 'orange'}
  return 'red'
}

const getTimelineDotClass = (result: string) => {
  const baseClass = 'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white'
  const colorMap: Record<string, string> = {
    '联系成功': 'bg-green-500',
    '联系失败': 'bg-red-500',
    '拒接': 'bg-orange-500',
    '关机': 'bg-gray-500',
    '已发送': 'bg-blue-500',
    '未联系到': 'bg-red-500',
    '已查看': 'bg-cyan-500'
  }
  return `${baseClass} ${colorMap[result] || 'bg-gray-500'}`
}

const getMethodIcon = (method: string) => {
  const iconMap: Record<string, string> = {
    '电话': '📞',
    '短信': '💬',
    '上门': '🚪',
    '邮件': '📧',
    '微信': '💬'
  }
  return iconMap[method] || '📋'
}

// 查看催收详情
const viewDetails = () => {
  Message.info('详情功能建设中')
}

// 复制催收记录
const copyRecord = async (record: any) => {
  const copyText = `催收记录详情：
日期：${record.collectionDate} ${record.collectionTime}
方式：${record.collectionMethod}
催收员：${record.collectorName}
联系结果：${record.contactResult}
客户响应：${record.customerResponse}
逾期金额：¥${formatAmount(record.overdueAmount)}
逾期天数：${record.overdueDays}天
效果评分：${record.effectiveScore}
备注：${record.remarks}`
  
  try {
    await navigator.clipboard.writeText(copyText)
    Message.success('复制成功')
  } catch (err) {
    Message.error('复制失败')
  }
}
</script>

<style scoped>
.postloan-profile {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.postloan-subtabs {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

:deep(.postloan-subtabs > .arco-tabs-nav) {
  margin-bottom: 0;
  padding: 0 20px;
}

:deep(.postloan-subtabs > .arco-tabs-content) {
  flex: 1;
  overflow: auto;
  padding-top: 8px;
}

:deep(.postloan-subtabs.arco-tabs) {
  display: flex;
  flex-direction: column;
}

.profile-section {
  padding: 16px 20px;
}

.section-title {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--subapp-text-primary);
}

.subsection-title {
  margin: 16px 0 12px 0;
  font-size: 14px;
  font-weight: 500;
  color: #595959;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tags-container .ant-tag {
  margin: 0;
  padding: 4px 12px;
  font-size: 13px;
  border-radius: 16px;
}

.collection-records-section {
  margin-top: 16px;
}

.collection-table {
  background: #fff;
  border-radius: 6px;
}

.collection-table :deep(.ant-table-thead > tr > th) {
  background: #fafafa;
  font-weight: 500;
}

.collection-table :deep(.ant-table-tbody > tr > td) {
  padding: 8px 16px;
}

.collection-table :deep(.ant-btn-link) {
  padding: 0;
  height: auto;
}

/* 时间线视图样式 */
.timeline-view {
  margin-top: 16px;
  max-height: 600px;
  overflow-y: auto;
}

.timeline-content {
  background: #f7f8fa;
  border-radius: 8px;
  padding: 16px;
  margin-left: 8px;
  border: 1px solid #e5e6eb;
  transition: all 0.2s ease;
}

.timeline-content:hover {
  background: var(--subapp-bg-secondary);
  border-color: #c9cdd4;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.timeline-dot {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .timeline-content {
    margin-left: 4px;
    padding: 12px;
  }
  
  .timeline-content .grid {
    grid-template-columns: 1fr;
    gap: 2px;
  }
  
  .flex.justify-between {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}

/* 表格优化 */
:deep(.arco-table-th) {
  background-color: #f7f8fa;
  font-weight: 600;
}

:deep(.arco-table-td) {
  border-bottom: 1px solid #f0f0f0;
}

:deep(.arco-table-tbody .arco-table-tr:hover .arco-table-td) {
  background-color: #f7f8fa;
}
</style>
