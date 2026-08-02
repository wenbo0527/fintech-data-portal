<template>
  <div class="event-management">
    <!-- 专业桌面端操作栏 -->
    <div class="action-bar">
      <div class="action-left">
        <h1 class="page-title">事件管理</h1>
        <div class="page-stats">
          <span class="stat-item">总计: {{ totalEvents }}</span>
          <span class="stat-item">在线: {{ onlineEvents }}</span>
          <span class="stat-item">离线: {{ offlineEvents }}</span>
        </div>
      </div>
      <div class="action-right">
        <div class="search-area">
          <a-input 
            v-model="searchKeyword" 
            placeholder="搜索事件名称、描述或所有者"
            allow-clear
            style="width: 300px"
            @change="handleSearch"
          >
            <template #prefix><IconSearch /></template>
          </a-input>
        </div>
        <div class="filter-area">
          <a-select 
            v-model="eventSourceFilter" 
            placeholder="事件来源"
            style="width: 140px"
            allow-clear
            @change="handleFilter"
          >
            <a-option value="">全部来源</a-option>
            <a-option value="核心事件">核心事件</a-option>
            <a-option value="APP埋点事件">APP埋点事件</a-option>
          </a-select>
          <a-select 
            v-model="statusFilter" 
            placeholder="状态"
            style="width: 100px"
            allow-clear
            @change="handleFilter"
          >
            <a-option value="">全部状态</a-option>
            <a-option value="草稿">草稿</a-option>
            <a-option value="上线">上线</a-option>
            <a-option value="下线">下线</a-option>
          </a-select>
        </div>
        <div class="button-area">
          <a-button type="primary" @click="handleCreate">
            <template #icon><IconPlus /></template>
            新建事件
          </a-button>
        </div>
      </div>
    </div>

    <!-- 数据表格区域 -->
    <div class="table-container">
      <a-table
        :data="filteredEvents"
        :loading="loading"
        :pagination="paginationConfig"
        row-key="id"
        @selection-change="handleSelectionChange"
        @page-change="handlePageChange"
        @page-size-change="handlePageSizeChange"
      >
        <!-- 选择列 -->
        <template #columns>
          <!-- 事件名称（名称+ID） -->
          <a-table-column title="事件名称" data-index="eventName" width="220">
            <template #cell="{ record }">
              <div class="event-info">
                <div class="event-name">{{ record.eventName }}</div>
                <div class="event-id">{{ record.id }}</div>
              </div>
            </template>
          </a-table-column>
          
          <!-- 事件来源列 -->
          <a-table-column title="事件来源" data-index="eventSource" width="120">
            <template #cell="{ record }">
              <span class="event-source">{{ record.eventSource }}</span>
            </template>
          </a-table-column>

          <!-- 获取方式 -->
          <a-table-column title="获取方式" data-index="acquireMethod" width="100">
            <template #cell="{ record }">
              <span>{{ record.acquireMethod }}</span>
            </template>
          </a-table-column>
          
          <!-- 状态列 -->
          <a-table-column title="状态" data-index="status" width="100">
            <template #cell="{ record }">
              <StatusTag :status="record.status" dictKey="eventStatus" />
            </template>
          </a-table-column>
          
          <!-- 事件负责人 -->
          <a-table-column title="事件负责人" data-index="owner" width="120">
            <template #cell="{ record }">
              <div class="owner-info">
                <a-avatar :size="24">
                  {{ record.owner.charAt(0) }}
                </a-avatar>
                <span class="owner-name">{{ record.owner }}</span>
              </div>
            </template>
          </a-table-column>
          
          <!-- 更新人 -->
          <a-table-column title="更新人" data-index="updatedBy" width="120">
            <template #cell="{ record }">
              <span class="owner-name">{{ record.updatedBy || '-' }}</span>
            </template>
          </a-table-column>

          <!-- 更新时间 -->
          <a-table-column title="更新时间" data-index="updateTime" width="160">
            <template #cell="{ record }">
              <div class="create-time">
                {{ DateUtils.formatDateTime(record.updateTime) }}
              </div>
            </template>
          </a-table-column>
          
          <!-- 操作列 -->
          <a-table-column title="操作" fixed="right" width="200">
            <template #cell="{ record }">
              <div class="action-buttons">
                <a-button type="text" size="small" @click="handleEdit(record)">
                  <template #icon><IconEdit /></template>
                  编辑
                </a-button>
                <a-button type="text" size="small" @click="handleStats(record)">
                  <template #icon><IconPlayCircle /></template>
                  统计
                </a-button>
                <a-popconfirm
                  v-if="record.status === '草稿'"
                  content="确定要删除此事件吗？"
                  @ok="handleDelete(record)"
                >
                  <a-button type="text" size="small" status="danger">
                    <template #icon><IconDelete /></template>
                    删除
                  </a-button>
                </a-popconfirm>
              </div>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </div>

    <!-- 创建/编辑事件模态框 -->
    
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import {
  IconSearch,
  IconPlus,
  IconRefresh,
  IconDownload,
  IconEdit,
  IconDelete,
  IconPlayCircle
} from '@arco-design/web-vue/es/icon'
import { mockEventAPI } from '@/mock/event'
import StatusTag from '@/components/common/StatusTag.vue'
import DateUtils from '@/utils/dateUtils'

const router = useRouter()

// 响应式数据
const loading = ref(false)
const events = ref([])
const searchKeyword = ref('')
const eventSourceFilter = ref('')
const statusFilter = ref('')
const selectedRows = ref([])
const currentEvent = ref(null)

// 分页配置
const paginationConfig = reactive({
  total: 0,
  current: 1,
  pageSize: 20,
  showTotal: true,
  showJumper: true,
  showPageSize: true
})

// 计算属性
const filteredEvents = computed(() => {
  let filtered = events.value

  // 搜索过滤
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    filtered = filtered.filter(event => 
      event.eventName.toLowerCase().includes(keyword) ||
      event.description.toLowerCase().includes(keyword) ||
      event.owner.toLowerCase().includes(keyword)
    )
  }

  // 事件来源过滤
  if (eventSourceFilter.value) {
    filtered = filtered.filter(event => event.eventSource === eventSourceFilter.value)
  }

  // 状态过滤
  if (statusFilter.value) {
    filtered = filtered.filter(event => event.status === statusFilter.value)
  }

  return filtered
})

const totalEvents = computed(() => events.value.length)
const onlineEvents = computed(() => events.value.filter(e => e.status === '上线').length)
const offlineEvents = computed(() => events.value.filter(e => e.status === '下线').length)

// 方法
const loadEvents = async () => {
  loading.value = true
  try {
    const data = await mockEventAPI.getEvents()
    events.value = data
    paginationConfig.total = data.length
    Message.success('事件数据加载成功')
  } catch (error) {
    Message.error('事件数据加载失败')
    console.error('加载事件数据失败:', error)
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  // 搜索逻辑已在computed中处理
}

const handleFilter = () => {
  // 过滤逻辑已在computed中处理
}

const handleCreate = () => {
  router.push('/customer/event-create')
}

const handleEdit = (record) => {
  router.push({ path: '/customer/event-create', query: { id: record.id } })
}

const handleStats = (record) => {
  // 跳转到样本统计页面 (TASK-20260714-FCA1BD2D 修复: 路径对齐 router/modules/customer.ts L57 'customer/sample-stats')
  router.push({
    path: '/customer/sample-stats',
    query: { eventId: record.id, eventName: record.eventName }
  })
}

const handleDelete = async (record) => {
  loading.value = true
  try {
    await mockEventAPI.deleteEvent(record.id)
    Message.success('事件删除成功')
    await loadEvents()
  } catch (error) {
    Message.error('事件删除失败')
    console.error('删除事件失败:', error)
  } finally {
    loading.value = false
  }
}

 

const handleSelectionChange = (rows) => {
  selectedRows.value = rows
}

const handlePageChange = (page) => {
  paginationConfig.current = page
}

const handlePageSizeChange = (pageSize) => {
  paginationConfig.pageSize = pageSize
  paginationConfig.current = 1
}

// 工具函数
const getEventTypeColor = (type) => {
  const colorMap = {
    '系统事件': 'blue',
    '业务事件': 'green',
    '用户事件': 'orange',
    '营销事件': 'purple',
    '风控事件': 'red'
  }
  return colorMap[type] || 'gray'
}

 

// 生命周期
onMounted(() => {
  loadEvents()
})
</script>

<script>
export default {
  name: 'EventManagement'
}
</script>

<style scoped>
.event-management {
  height: 100%;
  background: #F2F3F5;
  display: flex;
  flex-direction: column;
}

/* 操作栏样式 */
.action-bar {
  background: #fff;
  padding: 16px 20px;
  border-bottom: 1px solid #E5E6EB;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.04);
}

.action-left {
  display: flex;
  align-items: center;
  gap: 24px;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: #1D2129;
  margin: 0;
}

.page-stats {
  display: flex;
  gap: 16px;
}

.stat-item {
  font-size: 14px;
  color: #4E5969;
}

.action-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.search-area {
  display: flex;
  align-items: center;
}

.filter-area {
  display: flex;
  gap: 12px;
}

.button-area {
  display: flex;
  gap: 6px;
}

/* 表格容器 */
.table-container {
  flex: 1;
  background: white;
  margin: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  overflow: auto;
}

/* 表格样式优化 */
:deep(.arco-table) {
  border-radius: 8px;
}

:deep(.arco-table-th) {
  background: #F2F3F5 !important;
  font-weight: 600;
  color: #1D2129;
}

/* 事件信息样式 */
.event-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.event-name {
  font-weight: 500;
  color: #1D2129;
  font-size: 14px;
}

.event-id {
  font-size: 12px;
  color: #8A8E99;
  font-family: monospace;
}

/* 触发条件样式 */
.trigger-condition {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #4E5969;
  font-size: 13px;
}

/* 所有者信息样式 */
.owner-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.owner-name {
  font-size: 14px;
  color: #1D2129;
}

/* 操作按钮样式 */
.action-buttons {
  display: flex;
  gap: 8px;
}

.action-buttons .arco-btn {
  padding: 4px 8px;
  font-size: 13px;
}

/* 事件来源样式 */
.event-source {
  font-size: 13px;
  color: #4E5969;
}

/* 创建时间样式 */
.create-time {
  font-size: 13px;
  color: #4E5969;
  font-family: monospace;
}

/* 专业桌面端优化 */
@media screen and (min-width: 1920px) {
  .action-bar {
    padding: 24px 32px;
  }
  
  .table-container {
    margin: 24px;
  }
}

/* 响应式调整 */
@media screen and (max-width: 1440px) {
  .action-bar {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }
  
  .action-right {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
