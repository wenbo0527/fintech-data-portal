<template>
  <div class="data-map-container">
    <PageBanner
      v-model:search="searchKeyword"
      title="资产目录"
      subtitle="全域数据资产的统一检索与管理入口,支持按业务域、主题域快速定位数据表。"
      search-placeholder="输入表名、字段名或描述进行搜索"
      @search="handleSearch"
      @clear="clearSearch"
    >
      <template #filters>
        <a-select
          v-model="businessDomain"
          placeholder="业务域"
          allow-clear
          size="large"
          style="width: 160px"
          @change="handleFilterChange"
          class="filter-select"
        >
          <a-option v-for="theme in assetThemes" :key="theme.name" :value="theme.name">{{ theme.name }}</a-option>
        </a-select>
        <a-select
          v-model="tableType"
          placeholder="资产类型"
          allow-clear
          size="large"
          style="width: 160px"
          @change="handleFilterChange"
          class="filter-select"
        >
          <a-option value="fact">事实表</a-option>
          <a-option value="dim">维度表</a-option>
          <a-option value="dws">汇总表</a-option>
          <a-option value="dwd">明细表</a-option>
          <a-option value="metric">指标</a-option>
          <a-option value="variable">特征</a-option>
          <a-option value="feature">特征</a-option>
        </a-select>
      </template>
    </PageBanner>

    <div class="main-content">
      <!-- 资产主题区域 (默认展示) -->
      <div v-if="!hasSearchQuery" class="content-section">
        <div class="section-header">
          <h3 class="section-title">数据资产主题</h3>
          <span class="section-subtitle">按业务域划分的数据资产集合</span>
        </div>

        <a-row :gutter="[16, 16]">
          <a-col
            v-for="theme in assetThemes"
            :key="theme.name"
            :xs="24" :sm="12" :md="12" :lg="8" :xl="6"
          >
            <AssetCard
              :title="theme.name"
              type="业务域"
              type-color="arcoblue"
              :count="theme.count"
              count-label="资产"
              :description="theme.description || `包含${theme.name}相关的核心数据资产`"
              :theme-color="getThemeColorKey(theme.name)"
              :icon="theme.icon"
              @click="handleThemeClick(theme)"
            />
          </a-col>
        </a-row>
      </div>

      <!-- 搜索结果列表 (搜索后展示) -->
      <div v-else class="content-section">
        <div class="section-header">
          <div class="header-left">
            <h3 class="section-title">搜索结果</h3>
            <span class="result-count">共找到 {{ pagination.total }} 条相关数据资产</span>
          </div>
          <a-button type="text" size="small" @click="clearSearch">
            <template #icon><icon-close /></template>
            清空搜索
          </a-button>
        </div>

        <a-spin :loading="loading" style="width: 100%">
          <a-empty v-if="tableData.length === 0" description="未找到相关数据资产" />
          <a-row v-else :gutter="[16, 16]">
            <a-col
              v-for="record in tableData"
              :key="record.name"
              :xs="24" :sm="12" :md="12" :lg="8" :xl="6"
            >
              <AssetCard
                :title="record.name"
                :type="record.type || '数据表'"
                :type-color="getTypeColor(record.type)"
                :meta="record.domain"
                :description="record.description || '暂无描述'"
                @click="showTableDetail(record)"
              >
                <template #actions>
                  <a-tooltip content="申请权限">
                    <a-button
                      type="text"
                      size="mini"
                      class="permission-btn"
                      @click.stop="requestPermission(record)"
                    >
                      <icon-lock />
                    </a-button>
                  </a-tooltip>
                  <a-button
                    type="text"
                    size="mini"
                    @click.stop="addToFavorite(record)"
                  >
                    <icon-star />
                  </a-button>
                </template>
              </AssetCard>
            </a-col>
          </a-row>

          <div v-if="tableData.length > 0" class="pagination-wrapper">
            <a-pagination
              :total="pagination.total"
              :current="pagination.current"
              :page-size="pagination.pageSize"
              show-total
              show-jumper
              @change="onPageChange"
              @page-size-change="onPageSizeChange"
            />
          </div>
        </a-spin>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { IconClose, IconLock, IconStar } from '@arco-design/web-vue/es/icon'
import PageBanner from '@dca-components/common/PageBanner.vue'
import AssetCard from '@dca-components/common/AssetCard.vue'

// 模拟主题数据
const mockDataAssets = [
  { name: '用户域', icon: 'icon-user-group', count: 128, description: '用户注册、登录、行为等用户核心数据资产' },
  { name: '交易域', icon: 'icon-branch', count: 256, description: '订单、支付、退款等交易全流程数据资产' },
  { name: '商品域', icon: 'icon-common', count: 84, description: '商品信息、库存、价格等商品数据资产' },
  { name: '营销域', icon: 'icon-notification', count: 62, description: '营销活动、优惠券、用户触达等营销数据资产' },
  { name: '风控域', icon: 'icon-safe', count: 95, description: '风控模型、欺诈检测、信用评估等风控数据资产' },
  { name: '财务域', icon: 'icon-branch', count: 48, description: '账单、结算、对账等财务数据资产' },
  { name: '供应链域', icon: 'icon-public', count: 37, description: '采购、库存、物流等供应链数据资产' },
  { name: '公共域', icon: 'icon-common', count: 112, description: '时间维表、地区维表等公共数据资产' }
]

// 模拟表格数据
const tableMockData = [
  { name: 'dwd_trade_order', type: '明细表', domain: '交易域', description: '交易订单明细宽表', updateTime: '2024-04-15', owner: '数据平台组' },
  { name: 'dws_trade_daily', type: '汇总表', domain: '交易域', description: '交易每日汇总表', updateTime: '2024-04-14', owner: '数据平台组' },
  { name: 'dim_user_info', type: '维度表', domain: '用户域', description: '用户信息维度表', updateTime: '2024-04-10', owner: '数据平台组' },
  { name: 'dwd_risk_event', type: '明细表', domain: '风控域', description: '风控事件明细表', updateTime: '2024-04-12', owner: '风控组' },
  { name: 'dws_mkt_campaign', type: '汇总表', domain: '营销域', description: '营销活动汇总表', updateTime: '2024-04-11', owner: '营销组' },
  { name: 'dim_product', type: '维度表', domain: '商品域', description: '商品维度表', updateTime: '2024-04-09', owner: '商品组' },
  { name: 'dwd_finance_settle', type: '明细表', domain: '财务域', description: '财务结算明细表', updateTime: '2024-04-13', owner: '财务组' },
  { name: 'dws_user_behavior', type: '汇总表', domain: '用户域', description: '用户行为每日汇总', updateTime: '2024-04-14', owner: '数据平台组' },
  { name: 'fact_core_indicator', type: '事实表', domain: '风控域', description: '核心指标事实表', updateTime: '2024-04-08', owner: '风控组' },
  { name: 'dim_time', type: '维度表', domain: '公共域', description: '时间维度表', updateTime: '2024-01-01', owner: '数据平台组' },
  { name: 'dwd_supply_chain', type: '明细表', domain: '供应链域', description: '供应链明细表', updateTime: '2024-04-07', owner: '供应链组' },
  { name: 'dws_product_sales', type: '汇总表', domain: '商品域', description: '商品销售汇总表', updateTime: '2024-04-12', owner: '商品组' }
]

interface TableItem {
  name: string
  type: string
  description: string
  updateTime: string
  domain?: string
  owner?: string
}

const route = useRoute()
const router = useRouter()
const searchKeyword = ref('')
const businessDomain = ref('')
const tableType = ref('')
const loading = ref(false)
const tableData = ref<TableItem[]>([])
const assetThemes = ref(mockDataAssets)

const pagination = ref({
  total: 0,
  current: 1,
  pageSize: 12,
  showTotal: true,
  showJumper: true,
  showPageSize: true,
})

const hasSearchQuery = computed(() => {
  return !!(searchKeyword.value || businessDomain.value || tableType.value)
})

const themeColorMap: Record<string, 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'cyan' | 'arcoblue' | 'gray'> = {
  '用户域': 'blue',
  '交易域': 'green',
  '商品域': 'orange',
  '营销域': 'red',
  '风控域': 'purple',
  '财务域': 'cyan',
  '供应链域': 'arcoblue',
  '公共域': 'gray'
}
function getThemeColorKey(name: string) {
  return themeColorMap[name] || 'blue'
}

function getTypeColor(type?: string) {
  if (!type) {return 'arcoblue'}
  if (type === '维度表') {return 'blue'}
  if (type === '事实表') {return 'green'}
  return 'arcoblue'
}

const handleThemeClick = (theme: any) => {
  businessDomain.value = theme.name
  handleSearch()
}

onMounted(() => {
  const { keyword, domain, type } = route.query
  if (keyword) {searchKeyword.value = keyword as string}
  if (domain) {businessDomain.value = domain as string}
  if (type) {tableType.value = type as string}

  if (hasSearchQuery.value) {handleSearch()}
})

const clearSearch = () => {
  searchKeyword.value = ''
  businessDomain.value = ''
  tableType.value = ''
  tableData.value = []
}

const handleFilterChange = () => {
  if (hasSearchQuery.value) {handleSearch()}
}

const handleSearch = async () => {
  if (!hasSearchQuery.value) {return}

  loading.value = true
  try {
    await new Promise(resolve => setTimeout(resolve, 500))

    const filteredData = tableMockData.filter(item => {
      const keywordMatch = !searchKeyword.value ||
        item.name.toLowerCase().includes(searchKeyword.value.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchKeyword.value.toLowerCase()))

      const domainMatch = !businessDomain.value || item.domain === businessDomain.value

      let typeMatch = true
      if (tableType.value) {
        if (tableType.value === 'dim') {typeMatch = item.type === '维度表'}
        else if (tableType.value === 'fact') {typeMatch = item.type === '事实表'}
        else if (tableType.value === 'dws') {typeMatch = item.type === '汇总表'}
        else if (tableType.value === 'dwd') {typeMatch = item.type === '明细表'}
        else {typeMatch = item.type === tableType.value}
      }

      return keywordMatch && domainMatch && typeMatch
    })

    tableData.value = filteredData
    pagination.value.total = filteredData.length
    pagination.value.current = 1
  } catch (error) {
    Message.error('搜索失败')
  } finally {
    loading.value = false
  }
}

const onPageChange = (current: number) => {
  pagination.value.current = current
}

const onPageSizeChange = (pageSize: number) => {
  pagination.value.pageSize = pageSize
  pagination.value.current = 1
}

const showTableDetail = (record: TableItem) => {
  router.push({ name: 'AssetCatalogTable', params: { tableName: record.name } })
}

const addToFavorite = async (record: TableItem) => {
  Message.success('添加收藏成功')
}

const requestPermission = async (record: TableItem) => {
  Message.success('权限申请已提交')
}
</script>

<style scoped>
.data-map-container {
  min-height: 100vh;
  background: var(--dca-bg-page-alt);
  position: relative;
  overflow-x: hidden;
}

.filter-select {
  background: var(--dca-bg-card);
  border-radius: var(--dca-radius-md);
}

.main-content {
  padding: 0 40px var(--dca-spacing-2xl);
  width: 100%;
  max-width: var(--dca-page-max-width-wide);
  margin: -40px auto 0;
  position: relative;
  z-index: 3;
}

.content-section {
  background: var(--dca-bg-card);
  border-radius: var(--dca-radius-xl);
  padding: var(--dca-spacing-lg);
  box-shadow: var(--dca-shadow-md);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--dca-spacing-lg);
}

.section-title {
  font-size: var(--dca-font-2xl);
  font-weight: 600;
  color: var(--dca-text-primary);
  margin: 0;
}

.section-subtitle {
  font-size: var(--dca-font-md);
  color: var(--dca-text-tertiary);
  margin-left: 12px;
  font-weight: normal;
}

.header-left {
  display: flex;
  align-items: baseline;
}

.result-count {
  font-size: var(--dca-font-md);
  color: var(--dca-text-tertiary);
  margin-left: 12px;
}

.pagination-wrapper {
  margin-top: var(--dca-spacing-lg);
  display: flex;
  justify-content: flex-end;
}
</style>
