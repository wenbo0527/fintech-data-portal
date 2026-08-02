<template>
  <div class="virtual-events">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">虚拟事件管理</h1>
        <div class="page-stats">
          <span class="stat-item">总计: {{ totalVirtualEvents }}</span>
          <span class="stat-item">在线: {{ onlineVirtualEvents }}</span>
          <span class="stat-item">草稿: {{ draftVirtualEvents }}</span>
        </div>
      </div>
      <div class="header-right">
        <div class="search-area">
          <a-input 
            v-model="searchKeyword" 
            placeholder="搜索虚拟事件名称或描述"
            allow-clear
            style="width: 280px"
            @change="handleSearch"
          >
            <template #prefix><IconSearch /></template>
          </a-input>
        </div>
        <div class="filter-area">
          <a-select 
            v-model="scenarioFilter" 
            placeholder="应用场景"
            style="width: 200px"
            multiple
            allow-clear
            @change="handleFilter"
          >
            <a-option value="营销通知">营销通知</a-option>
            <a-option value="电销出池">电销出池</a-option>
          </a-select>
          <a-select 
            v-model="statusFilter" 
            placeholder="状态"
            style="width: 120px"
            allow-clear
            @change="handleFilter"
          >
            <a-option value="">全部状态</a-option>
            <a-option value="已上线">已上线</a-option>
            <a-option value="已下线">已下线</a-option>
          </a-select>
        </div>
        <div class="button-area">
          <!-- P1#2 虚拟事件组合创建 - 2026-08-02: 改为 dropdown 含 2 个 menu item -->
          <!-- rebase 解冲突（本块为合成解）：
               1) 保留 main 侧的 a-menu + handleCreateMenu —— 组合入口在 main 已是现行交付
                  （main 已有配套页面 virtual-event-combine.vue + 路由 customer/virtual-event-combine
                   + route name VirtualEventCombine），且 Arco 用 a-menu/a-menu-item + Button #suffix 更规范；
               2) 不引入分支侧的 a-doption + handleCreate/handleCreateCombine —— 与 handleCreateMenu
                  功能完全等价（同一对路由名 VirtualEventCreate / VirtualEventCombine），并行引入会造双实现死代码；
               3) 保留分支侧的 trigger="click"（hover→click）—— 分支独有的交互修正，main 未含。 -->
          <a-dropdown trigger="click">
            <a-button type="primary">
              <template #icon><IconPlus /></template>
              创建虚拟事件
              <template #suffix><IconDown /></template>
            </a-button>
            <template #content>
              <a-menu @menu-item-click="(key) => handleCreateMenu(key as string)">
                <a-menu-item key="single">
                  <template #icon><IconPlus /></template>
                  创建虚拟事件(单事件)
                </a-menu-item>
                <a-menu-item key="combine">
                  <template #icon><IconLink /></template>
                  虚拟事件组合(OR / AND)
                </a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
          <a-button @click="handleRefresh">
            <template #icon><IconRefresh /></template>
            刷新
          </a-button>
        </div>
      </div>
    </div>

    <!-- 虚拟事件列表 -->
    <div class="table-container">
      <a-table
        :data="filteredVirtualEvents"
        :loading="loading"
        :pagination="paginationConfig"
        row-key="id"
        @selection-change="handleSelectionChange"
        @page-change="handlePageChange"
        @page-size-change="handlePageSizeChange"
      >
        <template #columns>
          <a-table-column type="selection" width="50" />
          
          <!-- 虚拟事件信息 -->
          <a-table-column title="虚拟事件信息" width="220">
            <template #cell="{ record }">
              <div class="virtual-event-info">
                <div class="event-name">{{ record.eventName }}</div>
                <div class="event-id">{{ record.id }}</div>
                <div class="real-event">
                  <span class="label">关联事件:</span>
                  <span class="value">{{ getRealEventName(record.realEventId) }}</span>
                </div>
              </div>
            </template>
          </a-table-column>
          
          <!-- 应用场景 -->
          <a-table-column title="应用场景" width="160">
            <template #cell="{ record }">
              <div style="display:flex;gap:4px;flex-wrap:wrap;">
                <a-tag v-for="sc in record.scenario" :key="sc" :color="getScenarioColor(sc)">{{ sc }}</a-tag>
              </div>
            </template>
          </a-table-column>
          
          <!-- 状态 -->
          <a-table-column title="状态" width="100">
            <template #cell="{ record }">
              <a-tag :color="getStatusColor(record.status)" size="small">
                {{ record.status }}
              </a-tag>
            </template>
          </a-table-column>
          
          <!-- 版本信息 -->
          <a-table-column title="版本" width="120">
            <template #cell="{ record }">
              <a-tag color="blue" size="small">v{{ record.version }}</a-tag>
            </template>
          </a-table-column>

          <!-- 有效期 -->
          <a-table-column title="有效期" width="180">
            <template #cell="{ record }">
              {{ formatDate(record.expireAt) }}
            </template>
          </a-table-column>
          
          <!-- 更新信息 -->
          <a-table-column title="更新信息" width="160">
            <template #cell="{ record }">
              <div class="update-info">
                <div class="updater">{{ record.updater }}</div>
                <div class="update-time">{{ formatDate(record.updateTime) }}</div>
              </div>
            </template>
          </a-table-column>
          

          
          <!-- 操作 -->
          <a-table-column title="操作" fixed="right" width="220">
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
                <a-button v-if="record.status !== '已下线'" type="text" size="small" @click="handleOffline(record)" status="danger">
                  下线
                </a-button>
                <a-popconfirm
                  v-if="record.status === '已下线' && !record.archived"
                  content="归档后不可编辑，确认归档？"
                  @ok="handleArchive(record)"
                >
                  <a-button type="text" size="small" status="danger">归档</a-button>
                </a-popconfirm>
              </div>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { mockEventAPI } from '@/mock/event'
import VirtualEventForm from './components/VirtualEventForm.vue'
import {
  IconSearch,
  IconPlus,
  IconRefresh,
  IconEdit,
  IconDelete,
  IconPlayCircle,
  IconDown,
  IconLink
} from '@arco-design/web-vue/es/icon'

const router = useRouter()

// 响应式数据
const loading = ref(false)
const virtualEvents = ref([])
const realEvents = ref([])
const searchKeyword = ref('')
const scenarioFilter = ref([])
const statusFilter = ref('')
const selectedRows = ref([])
const modalVisible = ref(false)
const modalTitle = ref('')
const currentEvent = ref(null)
const syncLoading = reactive({})

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
const filteredVirtualEvents = computed(() => {
  let filtered = virtualEvents.value

  // 搜索过滤
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    filtered = filtered.filter(event => 
      event.eventName.toLowerCase().includes(keyword) ||
      event.description.toLowerCase().includes(keyword)
    )
  }

  // 场景过滤
  if (Array.isArray(scenarioFilter.value) && scenarioFilter.value.length > 0) {
    filtered = filtered.filter(event => Array.isArray(event.scenario) && event.scenario.some(sc => scenarioFilter.value.includes(sc)))
  }

  // 状态过滤
  if (statusFilter.value) {
    filtered = filtered.filter(event => event.status === statusFilter.value)
  }

  return filtered
})

const totalVirtualEvents = computed(() => virtualEvents.value.length)
const onlineVirtualEvents = computed(() => virtualEvents.value.filter(e => e.status === '已上线').length)
const draftVirtualEvents = computed(() => virtualEvents.value.filter(e => e.status === '草稿').length)

// 方法
const loadData = async () => {
  loading.value = true
  try {
    // 加载真实事件列表
    const events = await mockEventAPI.getEvents()
    realEvents.value = events
    
    // 加载虚拟事件列表
    const virtualData = await mockEventAPI.getVirtualEvents(events)
    const now = Date.now()
    virtualEvents.value = virtualData.map(v => {
      const exp = v.expireAt ? new Date(v.expireAt).getTime() : 0
      const expired = exp > 0 && exp < now
      return { ...v, status: expired ? '已下线' : v.status }
    })
    
    paginationConfig.total = virtualData.length
    Message.success('虚拟事件数据加载成功')
  } catch (error) {
    Message.error('虚拟事件数据加载失败')
    console.error('加载虚拟事件数据失败:', error)
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
  router.push({ name: 'VirtualEventCreate' })
}

// P1#2 虚拟事件组合创建 - 2026-08-02: dropdown menu 选择
const handleCreateMenu = (key: string) => {
  if (key === 'single') {
    router.push({ name: 'VirtualEventCreate' })
  } else if (key === 'combine') {
    router.push({ name: 'VirtualEventCombine' })
  }
}

const handleEdit = (record) => {
  router.push({
    name: 'VirtualEventEdit',
    params: { id: record.id }
  })
}

// 跳转样本统计（mkt-app convention: /customer/<page>）
const handleStats = (record) => {
  router.push({
    path: '/customer/sample-stats',
    query: {
      eventId: record.id,
      eventName: record.eventName,
      isVirtual: 'true'
    }
  })
}

const handleArchive = async (record) => {
  loading.value = true
  try {
    await new Promise(resolve => setTimeout(resolve, 500))
    record.archived = true
    record.updateTime = new Date().toISOString()
    record.updater = '当前用户'
    Message.success('归档成功')
  } catch (error) {
    Message.error('归档失败')
    console.error('归档虚拟事件失败:', error)
  } finally {
    loading.value = false
  }
}

const handleStatusChange = async (record, value) => {
  const newStatus = value ? '已上线' : '已下线'
  try {
    // 模拟状态更新
    await new Promise(resolve => setTimeout(resolve, 300))
    record.status = newStatus
    Message.success(`虚拟事件已${newStatus}`)
  } catch (error) {
    Message.error('状态更新失败')
    console.error('更新虚拟事件状态失败:', error)
  }
}

const handleCreateVersion = async (record) => {
  try {
    await new Promise(resolve => setTimeout(resolve, 300))
    const nextVersion = (record.version || 1) + 1
    record.version = nextVersion
    const history = record.versions || []
    history.push({ version: nextVersion, updatedAt: new Date().toISOString(), updater: '当前用户', description: '版本更新' })
    record.versions = history
    record.updateTime = new Date().toISOString()
    record.updater = '当前用户'
    Message.success('已创建新版本')
  } catch (error) {
    Message.error('创建版本失败')
    console.error('创建版本失败:', error)
  }
}

const handleRefresh = () => {
  loadData()
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

const handleModalOk = () => {
  // 表单提交逻辑在VirtualEventForm组件中处理
}

const handleModalCancel = () => {
  modalVisible.value = false
  currentEvent.value = null
}

const handleFormSubmit = async (formData) => {
  try {
    // 模拟保存操作
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    if (currentEvent.value) {
      // 编辑模式
      const index = virtualEvents.value.findIndex(e => e.id === currentEvent.value.id)
      if (index > -1) {
        virtualEvents.value[index] = { ...virtualEvents.value[index], ...formData }
      }
      Message.success('虚拟事件更新成功')
    } else {
      // 创建模式
      const newEvent = {
        ...formData,
        id: `VIRT${Date.now()}`,
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString(),
        version: 1,
        versions: [{ version: 1, updatedAt: new Date().toISOString(), updater: '当前用户', description: '初始版本' }]
      }
      virtualEvents.value.unshift(newEvent)
      Message.success('虚拟事件创建成功')
    }
    
    modalVisible.value = false
  } catch (error) {
    Message.error('操作失败')
    console.error('保存虚拟事件失败:', error)
  }
}

// 工具函数
const getRealEventName = (eventId) => {
  const event = realEvents.value.find(e => e.id === eventId)
  return event ? event.eventName : '未知事件'
}

const getScenarioColor = (scenario) => {
  const colorMap = {
    '营销触达': 'blue',
    '风险控制': 'red',
    '用户分析': 'green',
    '行为监控': 'orange'
  }
  return colorMap[scenario] || 'gray'
}

const getStatusColor = (status) => {
  const colorMap = {
    '已上线': 'green',
    '已下线': 'gray',
    '草稿': 'orange'
  }
  return colorMap[status] || 'gray'
}

 

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString('zh-CN')
}

// 生命周期
onMounted(() => {
  loadData()
})
</script>

<script lang="ts">
export default {
  name: 'VirtualEvents'
}
</script>

<style scoped>
.virtual-events {
  height: 100%;
  background: #F2F3F5;
  display: flex;
  flex-direction: column;
}

/* 页面头部样式 */
.page-header {
  background: white;
  padding: 20px 24px;
  border-bottom: 1px solid #E5E6EB;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.header-left {
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

.header-right {
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
  gap: 8px;
}

.button-area {
  display: flex;
  gap: 8px;
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

/* 虚拟事件信息样式 */
.virtual-event-info {
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

.real-event {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
}

.real-event .label {
  color: #4E5969;
}

.real-event .value {
  color: #165DFF;
  font-weight: 500;
}

/* 状态容器 */
.status-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
}

/* 条件配置样式 */
.condition-summary {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.condition-count {
  font-size: 14px;
  color: #1D2129;
  font-weight: 500;
}

.condition-detail {
  font-size: 12px;
  color: #4E5969;
}

/* 更新信息样式 */
.update-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.updater {
  font-size: 14px;
  color: #1D2129;
  font-weight: 500;
}

.update-time {
  font-size: 12px;
  color: #8A8E99;
}

/* 同步状态样式 */
.sync-status {
  display: flex;
  align-items: center;
  gap: 8px;
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

/* 专业桌面端优化 */
@media screen and (min-width: 1920px) {
  .page-header {
    padding: 24px 32px;
  }
  
  .table-container {
    margin: 24px;
  }
}

/* 响应式调整 */
@media screen and (max-width: 1440px) {
  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }
  
  .header-right {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
