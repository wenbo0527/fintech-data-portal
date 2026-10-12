<template>
  <div class="feature-center-page">
    <!-- 页面标题和操作区 -->
    <div class="page-header">
      <div class="page-title">
        <h2>特征中心</h2>
        <span class="page-subtitle">管理和查看所有特征数据</span>
      </div>
      <div class="page-actions">
        <a-space>
          <a-dropdown>
            <a-button type="primary">
              <template #icon><icon-plus /></template>
              新建
              <template #suffix><icon-down /></template>
            </a-button>
            <template #content>
              <a-doption @click="registerVisible = true">
                <template #icon><icon-plus /></template>
                注册特征
              </a-doption>
              <a-doption @click="quickRegisterVisible = true">
                <template #icon><icon-plus /></template>
                快速注册
              </a-doption>
              <a-doption @click="importVisible = true">
                <template #icon><icon-upload /></template>
                批量导入
              </a-doption>
            </template>
          </a-dropdown>
        </a-space>
      </div>
    </div>

    <!-- 搜索和筛选区 -->
    <div class="filter-section">
      <a-card>
        <a-form :model="filterForm" layout="inline">
          <a-form-item label="特征名称">
            <a-input
              v-model="filterForm.name"
              placeholder="请输入特征名称"
              allow-clear
              @change="handleFilterChange"
            />
          </a-form-item>

          <a-form-item label="特征类型">
            <a-select
              v-model="filterForm.type"
              placeholder="请选择特征类型"
              allow-clear
              @change="handleFilterChange"
            >
              <a-option value="numerical">数值型</a-option>
              <a-option value="categorical">分类型</a-option>
              <a-option value="text">文本型</a-option>
              <a-option value="time">时间型</a-option>
            </a-select>
          </a-form-item>

          <a-form-item label="状态">
            <a-select
              v-model="filterForm.status"
              placeholder="请选择状态"
              allow-clear
              @change="handleFilterChange"
            >
              <a-option value="active">上线</a-option>
              <a-option value="inactive">归档</a-option>
              <a-option value="draft">草稿</a-option>
            </a-select>
          </a-form-item>

          <a-form-item label="模型类型">
            <a-select
              v-model="filterForm.modelType"
              placeholder="请选择模型类型"
              allow-clear
              @change="handleFilterChange"
            >
              <a-option value="daily">日模型</a-option>
              <a-option value="monthly">月模型</a-option>
              <a-option value="other">其他模型</a-option>
            </a-select>
          </a-form-item>

          <a-form-item>
            <a-space>
              <a-button type="primary" @click="handleSearch">
                <template #icon>
                  <icon-search />
                </template>
                搜索
              </a-button>
              <a-button @click="handleReset">重置</a-button>
            </a-space>
          </a-form-item>
        </a-form>
      </a-card>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-section">
      <a-row :gutter="16">
        <a-col :span="6">
          <a-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon">
                <icon-apps />
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ stats.totalFeatures }}</div>
                <div class="stat-label">总特征数</div>
              </div>
            </div>
          </a-card>
        </a-col>
        <a-col :span="6">
          <a-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon">
                <icon-check-circle />
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ stats.activeFeatures }}</div>
                <div class="stat-label">有效特征</div>
              </div>
            </div>
          </a-card>
        </a-col>
        <a-col :span="6">
          <a-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon">
                <icon-clock-circle />
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ stats.pendingFeatures }}</div>
                <div class="stat-label">待审核</div>
              </div>
            </div>
          </a-card>
        </a-col>
        <a-col :span="6">
          <a-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon">
                <icon-exclamation-circle-fill />
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ stats.expiredFeatures }}</div>
                <div class="stat-label">已过期</div>
              </div>
            </div>
          </a-card>
        </a-col>
      </a-row>
    </div>

    <!-- 数据表格 -->
    <div class="table-section">
      <a-card>
        <template #title>
          <div class="table-header">
            <div class="header-left">
              <span>特征列表</span>
              <a-tag v-if="selectedRows.length" color="arcoblue" style="margin-left: 12px">
                已选 {{ selectedRows.length }} 项
              </a-tag>
            </div>
            <div class="header-right">
              <a-space>
                <a-button type="outline" size="small" :disabled="selectedRows.length === 0" @click="handleBatchDelete">
                  批量删除
                </a-button>
                <a-button type="outline" size="small" :disabled="selectedRows.length === 0" @click="handleBatchExport">
                  批量导出
                </a-button>
              </a-space>
            </div>
          </div>
        </template>

        <a-table
          :data="featureList"
          :columns="columns"
          :loading="loading"
          :pagination="pagination"
          row-key="id"
          @page-change="handlePageChange"
          @selection-change="handleSelectionChange"
        >
          <template #name="{ record }">
            <a-link @click="handleViewDetail(record)">{{ record.name }}</a-link>
          </template>

          <template #code="{ record }">
            <a-typography-text copyable>{{ record.code }}</a-typography-text>
          </template>

          <template #type="{ record }">
            <a-tag :color="getTypeColor(record.type)">
              {{ getTypeLabel(record.type) }}
            </a-tag>
          </template>

          <template #status="{ record }">
            <a-tag :color="getStatusColor(record.status)">
              {{ getStatusLabel(record.status) }}
            </a-tag>
          </template>

          <template #createTime="{ record }">
            {{ formatDate(record.createTime) }}
          </template>

          <template #modelType="{ record }">
            <a-space v-if="Array.isArray(record.modelType)">
              <a-tag v-for="type in record.modelType" :key="type" :color="getModelTypeColor(type)">
                {{ getModelTypeLabel(type) }}
              </a-tag>
            </a-space>
            <a-tag v-else :color="getModelTypeColor(record.modelType)">
              {{ getModelTypeLabel(record.modelType) }}
            </a-tag>
          </template>

          <template #actions="{ record }">
            <a-space>
              <a-button type="text" size="small" @click="handleViewDetail(record)">
                查看
              </a-button>
              <a-button type="text" size="small" @click="handleEdit(record)">
                编辑
              </a-button>
              <a-button
                type="text"
                size="small"
                status="danger"
                @click="handleDelete(record)"
              >
                删除
              </a-button>
            </a-space>
          </template>
        </a-table>
      </a-card>
    </div>

    <!-- 快速注册抽屉 -->
    <QuickRegisterDrawer
      v-model:visible="quickRegisterVisible"
      @success="loadData"
    />

    <!-- 注册特征抽屉 -->
    <RegisterDrawer
      v-model:visible="registerVisible"
      @success="loadData"
    />

    <!-- 批量导入抽屉 -->
    <ImportDrawer
      v-model:visible="importVisible"
      @success="loadData"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useOfflineModelStore } from '@/modules/offline-model/stores'
import { Message } from '@arco-design/web-vue'
import { featureAPI } from '@/modules/offline-model/api'
import {
  getTypeColor, getTypeLabel,
  getStatusColor, getStatusLabel,
  getModelTypeColor, getModelTypeLabel,
  formatDate
} from './shared'
import QuickRegisterDrawer from './components/QuickRegisterDrawer.vue'
import RegisterDrawer from './components/RegisterDrawer.vue'
import ImportDrawer from './components/ImportDrawer.vue'

const router = useRouter()
const store = useOfflineModelStore()

// 响应式数据
const loading = ref(false)
const selectedRows = ref([])

// 抽屉可见性
const quickRegisterVisible = ref(false)
const registerVisible = ref(false)
const importVisible = ref(false)

// 统计数据
const stats = ref({
  totalFeatures: 0,
  activeFeatures: 0,
  pendingFeatures: 0,
  expiredFeatures: 0
})

// 筛选表单
const filterForm = reactive({
  name: '',
  type: '',
  status: '',
  modelType: ''
})

// 分页配置
const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showTotal: true,
  showJumper: true,
  showPageSize: true
})

// 表格列配置
const columns = [
  { title: '特征名称', dataIndex: 'name', slotName: 'name', width: 200 },
  { title: '特征编码', dataIndex: 'code', slotName: 'code', width: 150 },
  { title: '特征类型', dataIndex: 'type', slotName: 'type', width: 100 },
  { title: '支持模型类型', dataIndex: 'modelType', slotName: 'modelType', width: 150 },
  { title: '描述', dataIndex: 'description', ellipsis: true, tooltip: true },
  { title: '状态', dataIndex: 'status', slotName: 'status', width: 100 },
  { title: '创建时间', dataIndex: 'createTime', slotName: 'createTime', width: 180 },
  { title: '创建人', dataIndex: 'creator', width: 120 },
  { title: '操作', slotName: 'actions', width: 150, fixed: 'right' }
]

// 计算属性
const featureList = computed(() => store.getFeatures)

// 生命周期
onMounted(() => {
  loadData()
  loadStats()
})

// 加载数据
const loadData = async () => {
  loading.value = true
  try {
    let response
    if (filterForm.modelType) {
      response = await featureAPI.getFeaturesByModelType(filterForm.modelType, {
        ...filterForm,
        page: pagination.current,
        pageSize: pagination.pageSize
      })
    } else {
      response = await featureAPI.getFeatures({
        ...filterForm,
        page: pagination.current,
        pageSize: pagination.pageSize
      })
    }

    if (response.success) {
      store.setFeatures(response.data.data)
      pagination.total = response.data.total
    } else {
      Message.error({ content: response.message || '加载数据失败', duration: 6000 })
    }
  } catch (error) {
    Message.error({ content: '加载数据失败: ' + error.message, duration: 6000 })
  } finally {
    loading.value = false
  }
}

// 加载统计数据（使用全量统计，而非当前页数据）
const loadStats = async () => {
  try {
    const res = await featureAPI.getFeatureStats()
    if (res.success) {
      stats.value = {
        totalFeatures: res.data.totalFeatures,
        activeFeatures: res.data.activeFeatures,
        pendingFeatures: res.data.pendingFeatures,
        expiredFeatures: res.data.expiredFeatures
      }
    }
  } catch (error) {
    console.error('获取统计数据失败:', error)
  }
}

const handleFilterChange = () => {
  pagination.current = 1
  loadData()
}

const handleSearch = () => {
  loadData()
}

const handleReset = () => {
  filterForm.name = ''
  filterForm.type = ''
  filterForm.status = ''
  filterForm.modelType = ''
  loadData()
}

const handlePageChange = (page) => {
  pagination.current = page
  loadData()
}

const handleSelectionChange = (rows) => {
  selectedRows.value = rows
}

const handleBatchDelete = () => {
  if (selectedRows.value.length === 0) return
  Message.info({ content: `批量删除 ${selectedRows.value.length} 个特征 (模拟)`, duration: 3000 })
}

const handleBatchExport = () => {
  if (selectedRows.value.length === 0) return
  Message.info({ content: `批量导出 ${selectedRows.value.length} 个特征 (模拟)`, duration: 3000 })
}

const handleViewDetail = (record) => {
  router.push(`/model-offline-analysis/feature-center/detail/${record.id}`)
}

const handleEdit = (record) => {
  router.push(`/model-offline-analysis/feature-center/edit/${record.id}`)
}

const handleDelete = async (record) => {
  try {
    const res = await featureAPI.deleteFeature(record.id)
    if (res.success) {
      Message.success({ content: '删除成功', duration: 3000 })
      loadData()
      loadStats()
    } else {
      Message.error({ content: res.message || '删除失败', duration: 6000 })
    }
  } catch (error) {
    Message.error({ content: '删除失败', duration: 6000 })
  }
}
</script>

<style scoped lang="less">
.feature-center-page {
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;

    .page-title {
      h2 {
        margin: 0;
        font-size: 24px;
        font-weight: 500;
      }

      .page-subtitle {
        color: #666;
        font-size: 14px;
      }
    }
  }

  .filter-section {
    margin-bottom: 24px;
  }

  .stats-section {
    margin-bottom: 24px;

    .stat-card {
      .stat-content {
        display: flex;
        align-items: center;

        .stat-icon {
          font-size: 32px;
          color: var(--subapp-info);
          margin-right: 16px;
        }

        .stat-info {
          .stat-value {
            font-size: 24px;
            font-weight: 600;
            color: #333;
          }

          .stat-label {
            color: #666;
            font-size: 14px;
          }
        }
      }
    }
  }

  .table-section {
    .table-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
  }
}
</style>
