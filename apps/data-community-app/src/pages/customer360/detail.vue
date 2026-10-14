<template>
  <div class="customer-detail-container">
    
    <!-- 优化后的顶部信息区域 -->
    <div class="customer-header-container">
      <!-- 左侧：客户基本信息卡片 -->
      <div class="customer-basic-card">
        <div class="customer-avatar">
          <a-avatar :size="64" :style="{ backgroundColor: 'var(--subapp-primary)' }">
            {{ userInfo?.basicInfo?.name?.charAt(0) || '客' }}
          </a-avatar>
        </div>
        <div class="customer-info">
          <div class="customer-name-row">
            <span class="customer-name">{{ userInfo?.basicInfo?.name || '未知用户' }}</span>
            <a-tag :color="getStatusColor(userInfo?.basicInfo?.status)" size="small">
              {{ userInfo?.basicInfo?.status || '正常' }}
            </a-tag>
          </div>
          <div class="customer-meta">
            <span>{{ userInfo?.basicInfo?.age || '28' }}岁</span>
            <a-divider direction="vertical" />
            <span>{{ userInfo?.basicInfo?.gender || '男' }}</span>
            <a-divider direction="vertical" />
            <span>统一客户ID：{{ userInfo?.userId || userId }}</span>
          </div>
        </div>
      </div>

      <!-- 右侧：关键指标卡片 -->
      <div class="key-metrics-card">
        <div class="metric-item">
          <div class="metric-label">总授信金额</div>
          <div class="metric-value">¥ {{ (userInfo?.totalCredit || 0).toLocaleString() }}</div>
        </div>
        <div class="metric-item highlight">
          <div class="metric-label">总在贷余额</div>
          <div class="metric-value">¥ {{ (userInfo?.usedCredit || 0).toLocaleString() }}</div>
        </div>
      </div>

      <!-- 快捷操作栏 -->
      <div class="quick-actions">
        <HistoryQueryButton :user-info="userInfo ?? undefined" />
        <a-tooltip content="字段权限配置（PM 配置后台）">
          <a-button type="text" size="small" @click="openFieldConfigDrawer">
            <template #icon><IconSettings /></template>
          </a-button>
        </a-tooltip>
        <a-tooltip content="查看征信">
          <a-button type="text" size="small" @click="handleViewCredit">
            <template #icon><IconSafe /></template>
          </a-button>
        </a-tooltip>
        <a-tooltip content="查看用信">
          <a-button type="text" size="small" @click="handleViewLoans">
            <template #icon><IconStorage /></template>
          </a-button>
        </a-tooltip>
        <a-tooltip :content="isFavorite ? '取消收藏' : '收藏客户'">
          <a-button type="text" size="small" @click="handleToggleFavorite">
            <template #icon>
              <IconStar :style="{ color: isFavorite ? '#FFB800' : '#86909C' }" />
            </template>
          </a-button>
        </a-tooltip>
      </div>

      <!-- 字段权限配置抽屉（PRD §F-004） -->
      <a-drawer
        v-model:visible="fieldConfigVisible"
        title="字段权限配置（PM 配置后台）"
        width="700"
        :footer="false"
        placement="right"
        unmount-on-close
      >
        <FieldPermissionConfig />
      </a-drawer>
    </div>

    <!-- 数据不一致警告 -->
    <div v-if="hasDataInconsistency" class="data-inconsistency-warning">
      <a-alert
        type="warning"
        title="数据不一致警告"
        description="检测到部分数据可能存在不一致，请注意核实相关信息。"
        show-icon
        closable
      />
    </div>

    <!-- 加载状态 -->
    <a-skeleton v-if="loading" animation class="skeleton-loader">
      <a-space direction="vertical" :style="{width:'100%'}" size="large">
        <a-skeleton-line :rows="3" :widths="['40%', '80%', '60%']" />
        <a-skeleton-line :rows="2" :widths="['100%', '100%']" />
        <div style="display:flex; gap:16px">
          <a-skeleton-shape shape="square" :style="{width:'200px', height:'100vh'}" />
          <a-skeleton-shape shape="square" :style="{flex:1, height:'100vh'}" />
        </div>
      </a-space>
    </a-skeleton>

    <!-- 错误状态 -->
    <div v-else-if="userInfo && userInfo.error" class="error-container">
      <a-result status="error" :title="userInfo.error" />
    </div>

    <!-- 无数据状态 -->
    <div v-else-if="!userInfo && !loading" class="empty-container">
      <a-empty>
        <template #image>
          <IconUserGroup :style="{ fontSize: '48px', color: '#C9CDD4' }" />
        </template>
        暂无客户数据，请检查客户ID是否正确
      </a-empty>
    </div>

    <!-- 主要内容 -->
    <div v-else-if="userInfo && !userInfo.error" class="content">

      <div class="main-layout">
        <!-- 左侧菜单（合并客户级 Tab + 产品可展开） -->
        <LeftNavMenu
          v-model="navSelection"
          :products="userOwnedProducts"
          :loan-records="userInfo?.loanRecords || []"
        />

        <!-- 右侧内容区 -->
        <main class="content-pane">
          <!-- 客户级 Tab：客户概览 -->
          <template v-if="navSelection.type === 'top' && navSelection.topKey === 'all-around'">
            <CustomerProfile :user-info="userInfo" />
          </template>

          <!-- 客户级 Tab：贷后管理 -->
          <template v-else-if="navSelection.type === 'top' && navSelection.topKey === 'postloan'">
            <div class="data-zone offline-zone">
              <div class="zone-header">
                <div class="zone-title">
                  <IconBarChart />
                  <span>贷后综合分析</span>
                  <span class="update-time">数据更新于 T-1</span>
                </div>
              </div>
              <PostLoanProfile :user-info="userInfo" :collection-records="collectionRecords" />
            </div>
          </template>

          <!-- 客户级 Tab：征信 -->
          <template v-else-if="navSelection.type === 'top' && navSelection.topKey === 'credit'">
            <div class="data-zone offline-zone credit-zone">
              <CreditReportList
                :reports="userInfo?.creditReports || []"
                @view-detail="handleViewCreditDetail"
                @compare="handleCompareReports"
              />
            </div>
          </template>

          <!-- 产品 Tab：产品名选中（未选授信产品ID） -->
          <template v-else-if="navSelection.type === 'product-name'">
            <div class="content-placeholder">
              <a-empty description="请在左侧选择具体的授信产品ID 查看详情" />
            </div>
          </template>

          <!-- 产品 Tab：授信产品ID 选中 -->
          <template v-else-if="navSelection.type === 'credit-id'">
            <InfoModuleTabs
              :product-key="navSelection.productKey"
              :product-data="currentSelectedProduct"
              :user-info="userInfo"
              :loading="loading"
              :show-debug-panel="showDebugPanel"
              :credit-product-id="navSelection.creditProductId"
              @module-change="handleModuleChange"
            />
          </template>

          <!-- 默认占位 -->
          <template v-else>
            <div class="content-placeholder">
              <a-empty description="请在左侧选择模块" />
            </div>
          </template>
        </main>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

// 在页面标题中添加标识
document.title = '🔥 Customer360 Detail - ' + new Date().toLocaleTimeString()

import { ref, computed, watch, onMounted, onUnmounted, nextTick, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import {
  IconUserGroup,
  IconSafe,
  IconStorage,
  IconStar,
  IconDashboard,
  IconBarChart,
  IconIdcard,
  IconSettings
} from '@arco-design/web-vue/es/icon'
// 删除了不再需要的图标导入
import { fetchUserInfo } from '../../mock/customer360'
import { formatAmount, formatPercent } from '../../utils-dca/formatUtils'
import LeftNavMenu from './components/LeftNavMenu.vue'
import InfoModuleTabs from './components/InfoModuleTabs.vue'
import CustomerProfile from './components/CustomerProfile.vue'
import PostLoanProfile from './components/profile/PostLoanProfile.vue'
import CreditReportList from './components/CreditReportList.vue'
import HistoryQueryButton from './components/HistoryQueryButton.vue'
import FieldPermissionConfig from './components/FieldPermissionConfig.vue'

// 基础响应式特征
const route = useRoute()
const router = useRouter()
const userInfo = ref<Record<string, any> | null>(null)
const loading = ref(true)
const showDebugPanel = ref(false)
// Tab切换控制
const activeInfoTab = ref('basic') // 默认显示基本信息Tab
const selectedProduct = ref<Record<string, any> | undefined>(undefined)
const isFavorite = ref(false)
const detailExpanded = ref(false)
// v3.3: 字段权限配置抽屉
const fieldConfigVisible = ref(false)
const openFieldConfigDrawer = () => {
  fieldConfigVisible.value = true
}
// 移除了selectedProductType，不再使用产品类型切换

// 左侧菜单选中状态（统一管理）
type NavSelection =
  | { type: 'top'; topKey: 'all-around' | 'postloan' | 'credit' }
  | { type: 'product-name'; productName: string }
  | { type: 'credit-id'; productName: string; creditProductId: string; productKey: string }
  | { type: 'none' }

const navSelection = ref<NavSelection>({ type: 'top', topKey: 'all-around' })

// 当前选中的产品（基于 navSelection 计算）
const currentSelectedProduct = computed(() => {
  const selection = navSelection.value
  if (selection.type !== 'credit-id') {return undefined}
  return userOwnedProducts.value.find(p => p.productKey === selection.productKey)
})

// 移除了调试系统相关的状态特征

// 移除了数据流跟踪相关的函数

// 移除了组件状态更新和调试日志相关的函数

// 移除了手动刷新和调试处理相关的函数

// 用户拥有的产品数据（所有产品都是信贷产品）
const userOwnedProducts = computed<any[]>(() => {
  if (!userInfo.value || userInfo.value.error) {return []}

  const products: any[] = []
  const userProducts: Record<string, any>[] = userInfo.value.products || []

  // 所有产品都是信贷产品
  userProducts.forEach(product => {
    products.push({
      ...product,
      category: '信贷产品',
      type: 'loan'
    })
  })

  return products
})

// 三列布局：主 Tab / 产品侧栏 / 内容区（依赖 userOwnedProducts，必须在它之后）
// 已由 navSelection / currentSelectedProduct（上方定义）接管

// 产品选项（已简化，不再区分自营和助贷）
const productOptions = ref([
  { label: '全部产品', value: '全部产品' }
])

// 获取用户ID
const userId = computed<string>(() => {
  const raw = route.params.userId || route.query.userId
  if (Array.isArray(raw)) return String(raw[0] ?? '')
  return raw ? String(raw) : ''
})

// 移除了selfProductData和loanProductData计算属性，改为直接使用userOwnedProducts

const creditData = computed(() => {
  // 优先返回征信报告汇总信息
  if (userInfo.value?.creditReports && userInfo.value.creditReports.length > 0) {
    return userInfo.value.creditReports[0]
  }
  return {}
})
// 催收记录数据
const collectionRecords = computed(() => {
  if (!userInfo.value || userInfo.value.error) {return []}
  return userInfo.value.collectionRecords || []
})

// 处理模块切换
const handleModuleChange = (moduleKey: string) => {
  // 占位：保留事件桥接，具体实现可后续接入分析埋点
  console.debug('[customer360] module change:', moduleKey)
}

const getStatusColor = (status: string) => {
  const colorMap: Record<string, string> = {
    '正常': 'green',
    '逾期': 'red',
    '关闭': 'gray',
    '冻结': 'orange'
  }
  return colorMap[status] || 'blue'
}

const handleViewCredit = () => {
  Message.info('跳转到征信详情')
}

const handleViewLoans = () => {
  Message.info('跳转到用信记录')
}

const handleToggleFavorite = () => {
  isFavorite.value = !isFavorite.value
  Message.success(isFavorite.value ? '已收藏客户' : '已取消收藏')
}

// 产品状态颜色（用于产品详情头部）
const getProductStatusColor = (status?: string) => {
  const colorMap: Record<string, string> = {
    '正常': 'green',
    '正常使用': 'green',
    '逾期': 'red',
    '结清': 'blue',
    '关闭': 'gray',
    '冻结': 'orange'
  }
  return colorMap[status || ''] || 'default'
}

// 征信模块事件处理
const handleViewCreditDetail = (report: any) => {
  Message.info(`查看征信报告 ${report.id || ''}`)
}
const handleCompareReports = (reports: any[]) => {
  Message.info(`对比 ${reports.length} 份征信报告`)
}

// 数据完整性检查（只检查信贷产品）
const hasDataInconsistency = computed(() => {
  if (!userInfo.value || userInfo.value.error) {return false}
  
  // 检查基本信息是否缺失
  if (!userInfo.value.basicInfo) {return true}
  
  // 检查必要字段是否存在
  const basicInfo = userInfo.value.basicInfo
  if (!basicInfo.name || !basicInfo.idCard || !basicInfo.phone) {return true}
  
  // 检查信贷产品数据一致性
  const products = userInfo.value.products || []
  
  // 如果有信贷产品但没有对应的记录，可能存在不一致
  if (products.length > 0 && (!userInfo.value.loanRecords || userInfo.value.loanRecords.length === 0)) {
    return true
  }
  
  return false
})

// 删除了不再需要的计算属性（creditUtilizationRate, totalAssets, totalLiabilities, riskLevel）

const fetchData = async () => {
  if (!userId.value) { return }
  loading.value = true
  try {
    const response = await fetchUserInfo(userId.value)
    if (response && !response.error) { userInfo.value = response }
  } catch (error) {
    Message.error(`获取用户数据失败: ${error.message}`)
  } finally {
    loading.value = false
  }
}

// goBack函数已删除，不再需要返回功能





// 获取风险等级颜色
const getRiskLevelColor = (level: string) => {
  const colorMap: Record<string, string> = {
    '低风险': 'green',
    '中风险': 'orange',
    '高风险': 'red',
    '极高风险': 'red'
  }
  return colorMap[level] || 'blue'
}

// 处理产品选择
const handleProductSelect = (product: Record<string, any>) => {
  selectedProduct.value = product
}

// 产品统计数据计算属性
const productStats = computed(() => {
  // 所有产品都是信贷产品
  const totalCount = userOwnedProducts.value.length
  
  return {
    total: totalCount,
    creditProducts: {
      count: totalCount,
      label: '信贷产品', 
      hasData: totalCount > 0
    }
  }
})

// 监听路由变化
watch(() => userId.value, (newUserId, oldUserId) => {
  if (newUserId && newUserId !== oldUserId) {
      fetchData()
  }
})

// 移除userInfo监听器以避免重复刷新
// userInfo的变化会自动触发相关计算属性更新，无需额外监听

// 移除loading状态监听器以避免重复刷新
// loading状态变化不需要额外的监听处理

// 监听计算属性变化
watch(() => userOwnedProducts.value, (newProducts, oldProducts) => {
  
  // 只在产品数据真正变化时自动选择第一个产品
  // 避免重复触发导致无限循环
  if (newProducts && newProducts.length > 0 && 
      (!oldProducts || oldProducts.length === 0) && 
      !selectedProduct.value) {
    const firstProduct = newProducts[0]
    selectedProduct.value = firstProduct.productKey
    }
}, { immediate: false })

// 移除userId变化监听器以避免重复刷新
// 数据获取已在onMounted中处理，无需重复监听userId变化

// 移除路由参数监听器以避免重复刷新
// 路由变化时组件会重新挂载，onMounted会自动处理数据获取

onMounted(async () => {
  // 检查userId是否存在
  if (!userId.value) {
    Message.error('用户ID不存在，请检查URL参数')
    return
  }
  
  try {
    await fetchData()
  } catch (error) {
    console.error('数据获取失败:', error)
    Message.error(`初始化失败: ${error.message}`)
  }
})

onUnmounted(() => {
  // 组件卸载清理
})
</script>

<style scoped>
.customer-detail-container {
  width: 100%;
  max-width: none;
  margin: 0;
  padding: 12px;
  background: var(--subapp-bg-secondary);
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 优化后的顶部信息区域样式 */
.customer-header-container {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 16px;
  background: #fff;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  margin-bottom: 12px;
}

.customer-basic-card {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
}

.customer-avatar {
  flex-shrink: 0;
}

.customer-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.customer-name-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.customer-name {
  font-size: 20px;
  font-weight: 600;
  color: var(--subapp-text-primary);
}

.customer-meta {
  display: flex;
  align-items: center;
  font-size: 14px;
  color: var(--subapp-text-secondary);
}

.key-metrics-card {
  display: flex;
  gap: 24px;
  padding: 16px 24px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
  border-radius: 8px;
  border: 1px solid #e5e6eb;
}

.metric-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 140px;
}

.metric-item.highlight {
  border-left: 3px solid var(--subapp-primary);
  padding-left: 12px;
}

.metric-label {
  font-size: 13px;
  color: var(--subapp-text-tertiary);
}

.metric-value {
  font-size: 18px;
  font-weight: 600;
  color: var(--subapp-text-primary);
  font-family: 'DIN Alternate', 'Helvetica Neue', Arial, sans-serif;
}

.quick-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-left: 16px;
  border-left: 1px solid #e5e6eb;
}

.detail-collapse {
  flex-shrink: 0;
  margin-bottom: 12px;
}

.detail-collapse :deep(.arco-collapse-item-header) {
  background: #fff;
  border-radius: 8px;
  padding: 12px 16px;
  font-weight: 500;
}

.detail-collapse :deep(.arco-collapse-item-content) {
  background: #fff;
  border-radius: 0 0 8px 8px;
  padding: 16px;
  margin-top: 2px;
}

.content {
  flex: 1;
  min-height: 0; /* 关键：允许 flex 子项小于内容高度，从而触发滚动 */
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 0;
  width: 100%;
  max-width: 100%;
}

/* 主要内容区域 */
.main-content {
  flex: 1;
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  overflow-x: hidden;
}

.left-content,
.right-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.detail-sections {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-section {
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px 8px 16px;
  background: #fafbfc;
  border-bottom: 1px solid #e5e6eb;
}

.section-title h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--subapp-text-primary);
  display: flex;
  align-items: center;
  gap: 8px;
}

.product-indicator {
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
  background: var(--color-primary-light-1);
  color: var(--color-primary-6);
  font-weight: 500;
  white-space: nowrap;
}

.detail-section :deep(.arco-card),
.detail-section :deep(.arco-table),
.detail-section :deep(.arco-list) {
  margin: 0;
  border: none;
  box-shadow: none;
}

.detail-section > *:not(.section-title) {
  padding: 16px;
}

.error-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 400px;
  border-radius: 12px;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .content {
    padding: 20px;
  }
  
  .main-content {
    padding: 0 20px;
  }
  
  .page-header {
    padding: 16px 20px;
  }
}

@media (max-width: 768px) {
  .customer-detail-container {
    padding: 8px;
  }
  
  .content {
    padding: 12px;
    flex-direction: column;
    gap: 12px;
  }
  
  .main-content {
    padding: 0 12px;
  }
  
  .page-header {
    padding: 12px;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .header-actions {
    width: 100%;
    justify-content: flex-start;
    flex-wrap: wrap;
    gap: 8px;
  }
  
  .detail-section {
    padding: 12px;
  }
  
  .detail-sections {
    gap: 12px;
  }
  
  .product-tabs-container {
    padding: 0 12px;
  }
  
  .section-title {
    padding: 12px 16px 6px 16px;
  }
  
  .detail-section > *:not(.section-title) {
    padding: 16px;
  }
  
  .tab-content {
    padding: 12px;
  }
}

@media (max-width: 480px) {
  .content {
    padding: 12px;
  }
  
  .main-content {
    padding: 0 12px;
    gap: 16px;
  }
  
  .page-header {
    padding: 12px;
  }
  
  .card-content {
    gap: 8px;
  }
  
  .info-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  
  .left-content,
  .right-content {
    gap: 16px;
  }
}

/* 统一调试面板样式 */
.unified-debug-panel {
  position: fixed;
  top: 20px;
  right: 20px;
  width: 600px;
  max-height: 80vh;
  border: 1px solid #d9d9d9;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  overflow: hidden;
}

.debug-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f5f5f5;
  border-bottom: 1px solid #d9d9d9;
}

.debug-header h4 {
  margin: 0;
  font-size: 14px;
  color: var(--subapp-text-primary);
}

.debug-controls {
  display: flex;
  gap: 8px;
}

.debug-content {
  /* 移除内部滚动，使用页面级滚动 */
  padding: 16px;
}

.debug-section {
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.debug-section:last-child {
  border-bottom: none;
}

.debug-section h5 {
  margin: 0 0 12px 0;
  font-size: 13px;
  color: var(--subapp-info);
  font-weight: 600;
}

.debug-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
  font-size: 12px;
}

.debug-label {
  color: #8c8c8c;
  min-width: 80px;
}

.debug-value {
  color: var(--subapp-text-primary);
  font-family: 'Monaco', 'Menlo', monospace;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.debug-flow {
  /* 移除内部滚动，使用页面级滚动 */
  border: 1px solid #f0f0f0;
  border-radius: 4px;
}

.debug-log-item {
  display: flex;
  gap: 8px;
  padding: 6px 8px;
  border-bottom: 1px solid #f5f5f5;
  font-size: 11px;
  align-items: flex-start;
}

.debug-log-item:last-child {
  border-bottom: none;
}

.debug-timestamp {
  color: #8c8c8c;
  min-width: 60px;
  font-size: 10px;
}

.debug-component {
  min-width: 80px;
  font-weight: 500;
  padding: 1px 4px;
  border-radius: 2px;
  font-size: 10px;
}

.component-main {
  background-color: #e6f7ff;
  color: var(--subapp-info);
}

.component-api {
  background-color: #f6ffed;
  color: #52c41a;
}

.component-BasicInfo {
  background-color: #fff7e6;
  color: #fa8c16;
}

.component-ProductModules {
  background-color: #f9f0ff;
  color: #722ed1;
}

.component-LoanList {
  background-color: #fff2f0;
  color: #f5222d;
}

.component-CreditList {
  background-color: #f0f9ff;
  color: var(--subapp-info);
}

.component-AdjustmentHistory {
  background-color: #f6ffed;
  color: #52c41a;
}

.debug-message {
  flex: 1;
  color: var(--subapp-text-primary);
}

.debug-data {
  color: #8c8c8c;
  font-style: italic;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.component-status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.component-status-item {
  padding: 8px;
  border: 1px solid #f0f0f0;
  border-radius: 4px;
  background-color: #fafafa;
}

.component-status-item h6 {
  margin: 0 0 6px 0;
  font-size: 12px;
  color: var(--subapp-info);
  font-weight: 600;
}

.status-details {
  font-size: 11px;
  color: #595959;
}

.status-details > div {
  margin-bottom: 2px;
}

.status-success {
  color: #52c41a !important;
  font-weight: 600;
}

.status-error {
  color: #f5222d !important;
  font-weight: 600;
}

.status-loading {
  color: var(--subapp-info) !important;
  font-weight: 600;
}

.debug-json {
  font-size: 11px;
  /* 移除内部滚动，使用页面级滚动 */
  background-color: #f5f5f5;
  padding: 8px;
  border-radius: 4px;
  margin: 0;
}

.computed-data {
  font-size: 11px;
  /* 移除内部滚动，使用页面级滚动 */
}

.computed-data > div {
  margin-bottom: 8px;
  padding: 6px;
  background-color: #f5f5f5;
  border-radius: 4px;
}

.debug-toggle-btn {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1001;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.data-inconsistency-warning {
  margin-bottom: 16px;
}

/* 数据流跟踪样式 */
.data-flow-list {
  max-height: 300px;
  overflow-y: auto;
}

.data-flow-item {
  padding: 8px;
  margin-bottom: 8px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  background-color: #fafafa;
}

.data-flow-item.status-start {
  border-left: 4px solid var(--subapp-info);
  background-color: #f0f9ff;
}

.data-flow-item.status-success {
  border-left: 4px solid #52c41a;
  background-color: #f6ffed;
}

.data-flow-item.status-error {
  border-left: 4px solid #f5222d;
  background-color: #fff2f0;
}

.flow-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.flow-name, .flow-path {
  font-weight: 500;
  color: var(--subapp-text-primary);
}

.flow-status {
  padding: 2px 6px;
  border-radius: 2px;
  font-size: 12px;
  color: white;
}

.flow-count, .flow-action {
  padding: 2px 6px;
  background-color: #e6f7ff;
  border-radius: 2px;
  font-size: 12px;
  color: var(--subapp-info);
}

.flow-time {
  font-size: 12px;
  color: #8c8c8c;
}

.flow-data {
  font-size: 12px;
  color: #595959;
  background-color: #f5f5f5;
  padding: 4px 8px;
  border-radius: 2px;
  white-space: pre-wrap;
  max-height: 100px;
  overflow-y: auto;
}

/* Tab切换样式 */
.customer-info-tabs {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.customer-info-tabs .arco-tabs-nav {
  background: #f8f9fa;
  margin: 0;
  padding: 0 16px;
}

.customer-info-tabs .arco-tabs-tab {
  font-weight: 500;
  color: #666;
  transition: all 0.3s ease;
}

.customer-info-tabs .arco-tabs-tab:hover {
  color: var(--subapp-info);
}

.customer-info-tabs .arco-tabs-tab-active {
  color: var(--subapp-info);
  font-weight: 600;
}

.customer-info-tabs .arco-tabs-content {
  padding: 0;
}

.tab-content {
  padding: 16px;
  min-height: 300px;
}

.tab-content .section-subtitle {
  color: #666;
  font-size: 14px;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
}

/* Tab内容区域样式优化 */
.tab-content .basic-info-section,
.tab-content .credit-reports-section,
.tab-content .collection-records-section {
  background: transparent;
}

.tab-content .basic-info-grid {
  margin-top: 0;
}

.tab-content .basic-info-card {
  border: none;
  box-shadow: none;
  background: transparent;
}

.tab-content .credit-reports-container,
.tab-content .collection-records-container {
  background: #fafafa;
  border-radius: 6px;
  padding: 16px;
}

/* 页面标题和操作按钮布局 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  width: 100%;
  max-width: 100%;
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--subapp-text-primary);
  line-height: 1.4;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .customer-info-tabs .arco-tabs-nav {
    padding: 0 8px;
  }

  .tab-content {
    padding: 16px;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-end;
  }
}

/* ====== 主区域：左侧菜单 + 右侧内容区 ====== */
.main-layout {
  background: #fff;
  border-radius: 8px;
  margin: 0 20px 20px;
  overflow: hidden;
  display: flex;
  flex-direction: row;
  align-items: stretch;
  min-height: calc(100vh - 320px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.content-pane {
  flex: 1;
  overflow-y: auto;
  background: #fff;
  padding: 16px 20px;
  min-width: 0;
}

.content-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 300px;
}

.product-detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.product-detail-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: var(--subapp-text-primary);
}

.product-detail-title .arco-icon {
  color: var(--subapp-info);
}

.product-detail-meta {
  font-size: 13px;
  color: var(--subapp-text-secondary);
}

.data-zone {
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.zone-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--subapp-bg-secondary);
  flex-shrink: 0;
}

.zone-title {
  display: flex;
  align-items: center;
  font-size: 16px;
  font-weight: 600;
  color: var(--subapp-text-primary);
}

.zone-title .arco-icon {
  margin-right: 8px;
  font-size: 18px;
}

.update-time {
  font-size: 12px;
  color: var(--subapp-text-tertiary);
  font-weight: normal;
  margin-left: 12px;
}

@media (max-width: 1200px) {
  .main-layout {
    min-height: auto;
    flex-direction: column;
  }
}
</style>