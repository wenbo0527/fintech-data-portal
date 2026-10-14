<template>
  <div class="data-resources-page">
    <div class="banner-section">
      <div class="banner-content">
        <div class="title-row"><h1 class="banner-title">特征字典</h1></div>
        <p class="banner-subtitle">征信与行为特征的统一注册、分类与质量监控</p>
        <div class="search-area">
          <a-input-search v-model="search" class="main-search-input" placeholder="输入特征名称或编码搜索" search-button size="large" allow-clear>
            <template #button-icon><icon-search /></template>
          </a-input-search>
          <div class="search-filters-inline">
            <a-select v-model="majorCat" placeholder="业务类型" allow-clear size="large" style="width: 160px" class="filter-select">
              <a-option value="credit">征信特征</a-option>
              <a-option value="behavior">行为特征</a-option>
            </a-select>
            <a-select v-model="featStatus" placeholder="状态" allow-clear size="large" style="width: 140px" class="filter-select">
              <a-option value="active">已发布</a-option>
              <a-option value="pending">待审核</a-option>
              <a-option value="draft">草稿</a-option>
            </a-select>
            <a-button class="action-btn" size="large" @click="showMissingTicket({ assetType: 'feature', pageSource: '特征字典' })">
              <template #icon><icon-plus /></template>缺失工单
            </a-button>
          </div>
        </div>
      </div>
      <div class="banner-decoration"><div class="decoration-cube"></div></div>
    </div>
    <div class="main-content">
      <div class="content-section">
        <a-row :gutter="[16, 16]">
          <a-col v-for="f in filteredList" :key="f.id" :xs="24" :sm="12" :md="8" :lg="6">
            <a-card hoverable :bordered="false">
              <template #title>
                <a-space>
                  <a-tag :color="f.majorCategory === 'credit' ? 'blue' : 'green'">{{ f.majorCategoryLabel }}</a-tag>
                  <span>{{ f.name }}</span>
                </a-space>
              </template>
              <a-descriptions :column="1" size="small">
                <a-descriptions-item label="编码">{{ f.code }}</a-descriptions-item>
                <a-descriptions-item label="一级分类">{{ f.level1Label }}</a-descriptions-item>
                <a-descriptions-item label="二级分类">{{ f.level2 }}</a-descriptions-item>
                <a-descriptions-item label="数据源">{{ f.dataSource }}</a-descriptions-item>
                <a-descriptions-item v-if="f.baseTable" label="存储引擎">
                  <a-space :size="6">
                    <a-tag v-if="storageMeta(f.baseTable).engine" :color="storageMeta(f.baseTable).color">
                      {{ storageMeta(f.baseTable).engine }}
                    </a-tag>
                    <a-tooltip v-if="storageMeta(f.baseTable).engine === 'HBase'" content="rowkey 在线点查，毫秒级取数">
                      <span class="base-table-link" @click="goBaseTable(f.baseTable)">{{ f.baseTable }}</span>
                    </a-tooltip>
                    <span v-else class="base-table-link" @click="goBaseTable(f.baseTable)">{{ f.baseTable }}</span>
                  </a-space>
                </a-descriptions-item>
                <a-descriptions-item label="质量">
                  <a-progress :percent="f.quality" :color="f.quality >= 90 ? 'green' : f.quality >= 70 ? 'orange' : 'red'" size="mini" />
                </a-descriptions-item>
                <a-descriptions-item label="状态">
                  <a-tag :color="statusColor(f.status)">{{ statusLabel(f.status) }}</a-tag>
                </a-descriptions-item>
              </a-descriptions>
              <template #actions>
                <a-button type="text" size="small" @click="viewDetail(f)">详情</a-button>
                <a-button type="text" size="small" @click="applyPermission(f)">申请权限</a-button>
              </template>
            </a-card>
          </a-col>
        </a-row>
        <a-empty v-if="filteredList.length === 0" description="暂无特征数据" />
      </div>
    </div>

    <!-- 缺失工单弹窗 -->
    <MissingTicketModal
      v-model:visible="showMissingTicketModal"
      :context="ticketContext"
      @confirm="handleMissingTicketConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { IconSearch, IconPlus } from '@arco-design/web-vue/es/icon'
import MissingTicketModal from '@/pages/search/MissingTicketModal.vue'
import { useMissingTicket } from '@/composables/useMissingTicket'
import { TableCatalogStore } from '@/mock-dca/shared/table-catalog-store'

const { showMissingTicketModal, ticketContext, showMissingTicket, handleMissingTicketConfirm } = useMissingTicket()
const router = useRouter()

interface FeatureItem {
  id: string
  name: string
  code: string
  description: string
  majorCategory: string
  majorCategoryLabel: string
  level1: string
  level1Label: string
  level2: string
  type: string
  status: string
  dataSource: string
  creator: string
  createdAt: string
  quality: number
  /** 取数底表（统一表目录 table-catalog-store 中的逻辑表名） */
  baseTable?: string
}

const search = ref('')
const majorCat = ref<string | undefined>(undefined)
const featStatus = ref<string | undefined>(undefined)

const allFeatures = ref<FeatureItem[]>([
  { id: 'feat_0701', name: '征信查询次数', code: 'credit_query_count', description: '征信报告近半年查询次数', majorCategory: 'credit', majorCategoryLabel: '征信特征', level1: 'credit_report', level1Label: '征信报告', level2: 'query_count', type: 'numerical', status: 'active', dataSource: '用户基础信息表', creator: '李明', createdAt: '2026-03-01', quality: 95.5, baseTable: 'ads_feature_user_rt' },
  { id: 'feat_0702', name: '信用卡逾期次数', code: 'credit_card_overdue_count', description: '信用卡近12个月逾期次数', majorCategory: 'credit', majorCategoryLabel: '征信特征', level1: 'credit_history', level1Label: '信贷记录', level2: 'overdue', type: 'numerical', status: 'active', dataSource: '征信报告', creator: '李明', createdAt: '2026-03-02', quality: 92.0, baseTable: 'ads_feature_user_rt' },
  { id: 'feat_0703', name: '近30天交易笔数', code: 'trx_count_30d', description: '近30天成功交易笔数', majorCategory: 'behavior', majorCategoryLabel: '行为特征', level1: 'transaction_behavior', level1Label: '交易行为', level2: 'count', type: 'numerical', status: 'active', dataSource: '交易流水表', creator: '王芳', createdAt: '2026-03-05', quality: 88.5, baseTable: 'ads_feature_user_rt' },
  { id: 'feat_0704', name: '近30天交易金额', code: 'trx_amt_30d', description: '近30天成功交易总金额', majorCategory: 'behavior', majorCategoryLabel: '行为特征', level1: 'transaction_behavior', level1Label: '交易行为', level2: 'amount', type: 'numerical', status: 'active', dataSource: '交易流水表', creator: '王芳', createdAt: '2026-03-05', quality: 91.0, baseTable: 'ads_feature_user_rt' },
  { id: 'feat_0705', name: '近7天登录天数', code: 'login_days_7d', description: '近7天有登录行为的天数', majorCategory: 'behavior', majorCategoryLabel: '行为特征', level1: 'activity', level1Label: '活跃度', level2: 'login_days', type: 'numerical', status: 'pending', dataSource: '运营日志表', creator: '赵六', createdAt: '2026-03-08', quality: 75.0, baseTable: 'ads_feature_user_rt' },
  { id: 'feat_0706', name: '风险评分模型输出', code: 'risk_model_score', description: '风控模型输出的风险评分', majorCategory: 'behavior', majorCategoryLabel: '行为特征', level1: 'model_outputs', level1Label: '模型输出', level2: 'risk_score', type: 'numerical', status: 'draft', dataSource: '风控模型表', creator: '张风控', createdAt: '2026-03-10', quality: 60.0, baseTable: 'ads_feature_user_rt' }
])

const filteredList = computed(() => {
  let result = allFeatures.value
  if (search.value) {
    const k = search.value.toLowerCase()
    result = result.filter(f => f.name.toLowerCase().includes(k) || f.code.toLowerCase().includes(k))
  }
  if (majorCat.value) result = result.filter(f => f.majorCategory === majorCat.value)
  if (featStatus.value) result = result.filter(f => f.status === featStatus.value)
  return result
})

function statusColor(s: string) { return { active: 'green', pending: 'orange', draft: 'gray' }[s] || 'gray' }
function statusLabel(s: string) { return { active: '已发布', pending: '待审核', draft: '草稿' }[s] || s }
function viewDetail(f: FeatureItem) {
  if (f.baseTable) {
    router.push({ name: 'data-map-table', params: { tableName: f.baseTable } })
  } else {
    Message.info(`特征「${f.name}」未绑定底表，暂无详情页`)
  }
}
function applyPermission(f: FeatureItem) {
  if (f.baseTable) {
    router.push({ name: 'data-map-table', params: { tableName: f.baseTable }, query: { tab: 'permission' } })
  } else {
    Message.info(`特征「${f.name}」未绑定底表，无法申请权限`)
  }
}

// ── 存储引擎联动（统一表目录 table-catalog-store 为唯一事实源）──
const STORAGE_COLORS: Record<string, string> = { HBase: 'orange', Kafka: 'purple', Doris: 'cyan' }

/** 窄类型取值助手：规避模板内索引 Record 的 TS7053；底表查不到则不返回引擎 */
function storageMeta(name?: string): { engine: string; color: string } {
  const storage = name ? TableCatalogStore.byName(name)?.storage : undefined
  return storage ? { engine: storage, color: STORAGE_COLORS[storage] || 'gray' } : { engine: '', color: 'gray' }
}

/** 跳转表详情（数据地图·表详情 7 Tab） */
function goBaseTable(name?: string) {
  if (!name) return
  router.push({ name: 'data-map-table', params: { tableName: name } })
}
</script>

<style scoped>
.data-resources-page { min-height: 100vh; background: #f7f8fa; position: relative; overflow-x: hidden; }
.banner-section { background: linear-gradient(180deg, #E6F0FF 0%, #F7F8FA 100%); padding: 40px 0; position: relative; display: flex; justify-content: center; align-items: center; min-height: 280px; }
.banner-content { width: 100%; max-width: 1800px; z-index: 2; position: relative; display: flex; flex-direction: column; padding: 0 40% 0 40px; box-sizing: border-box; }
.banner-title { font-size: 40px; font-weight: bold; color: #1d2129; margin: 0 0 16px 0; line-height: 1.2; }
.banner-subtitle { font-size: 14px; color: #86909c; margin-bottom: 32px; max-width: 600px; line-height: 1.6; }
.search-area { display: flex; gap: 16px; align-items: center; width: 100%; max-width: 900px; flex-wrap: wrap; }
.main-search-input { flex: 1; min-width: 400px; background: #fff; border-radius: 30px; border: 1px solid #165DFF; box-shadow: 0 4px 10px rgba(22, 93, 255, 0.1); }
.main-search-input :deep(.arco-input-wrapper) { border-radius: 30px; padding-left: 20px; background: #fff; }
.main-search-input :deep(.arco-input-search-btn) { border-radius: 0 30px 30px 0; background: transparent; color: #165DFF; border-left: 1px solid #f2f3f5; }
.search-filters-inline { display: flex; gap: 12px; }
.filter-select { background: #fff; border-radius: 4px; }
.banner-decoration { position: absolute; right: 0; top: 0; width: 40%; height: 100%; overflow: hidden; pointer-events: none; }
.decoration-cube { position: absolute; top: 40px; right: 100px; width: 200px; height: 200px; background: linear-gradient(135deg, #e8f3ff 0%, #cce4ff 100%); transform: rotate(-15deg) skew(-10deg); border-radius: 20px; box-shadow: -20px 20px 40px rgba(22, 93, 255, 0.1); }
.main-content { padding: 0 40px 40px; width: 100%; max-width: 1800px; margin: -40px auto 0; position: relative; z-index: 3; }
.content-section { background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04); }
.base-table-link { color: #165DFF; cursor: pointer; font-size: 12px; }
.base-table-link:hover { text-decoration: underline; }
</style>