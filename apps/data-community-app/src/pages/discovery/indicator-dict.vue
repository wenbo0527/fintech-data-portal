<template>
  <div class="data-resources-page">
    <div class="banner-section">
      <div class="banner-content">
        <div class="title-row"><h1 class="banner-title">指标字典</h1></div>
        <p class="banner-subtitle">监管指标与业务指标的统一定义、口径与归属场景；指标取数底表已接入统一表目录，可直接下钻表详情</p>
        <div class="search-area">
          <a-input-search v-model="search" class="main-search-input" placeholder="输入指标名称搜索" search-button size="large" allow-clear>
            <template #button-icon><icon-search /></template>
          </a-input-search>
          <div class="search-filters-inline">
            <a-select v-model="indicatorType" placeholder="指标类型" allow-clear size="large" style="width: 160px" class="filter-select">
              <a-option value="regulatory">监管指标</a-option>
              <a-option value="business_core">业务指标</a-option>
            </a-select>
            <a-select v-model="regCategory" placeholder="监管分类" allow-clear size="large" style="width: 180px" class="filter-select">
              <a-option value="cbirc_banking">银保监会-银监报表</a-option>
              <a-option value="pboc_centralized">人行-大集中报表</a-option>
              <a-option value="pboc_financial_base">人行-金融基础数据</a-option>
              <a-option value="pboc_interest_rate">人行-利率报备检测</a-option>
            </a-select>
            <a-button class="action-btn" size="large" @click="showMissingTicket({ assetType: 'metric', pageSource: '指标字典' })">
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
          <a-col v-for="m in filteredList" :key="m.id" :xs="24" :sm="12" :md="8" :lg="6">
            <a-card hoverable :bordered="false">
              <template #title>
                <a-space>
                  <a-tag :color="m.type === 'regulatory' ? 'orange' : 'blue'">{{ m.type === 'regulatory' ? '监管指标' : '业务指标' }}</a-tag>
                  <span>{{ m.name }}</span>
                </a-space>
              </template>
              <a-descriptions :column="1" size="small">
                <a-descriptions-item label="监管分类">{{ CATEGORY_LABELS[m.regulatoryCategory] || '—' }}</a-descriptions-item>
                <a-descriptions-item label="归属场景">{{ m.reportName }}</a-descriptions-item>
                <a-descriptions-item label="业务定义">{{ m.businessDefinition }}</a-descriptions-item>
                <a-descriptions-item label="统计频率">{{ m.statisticalPeriod }}</a-descriptions-item>
                <a-descriptions-item label="存储引擎">
                  <a-tag v-if="storageMeta(m.baseTable).engine" size="small" :color="storageMeta(m.baseTable).color">{{ storageMeta(m.baseTable).engine }}</a-tag>
                  <span v-else>—</span>
                </a-descriptions-item>
                <a-descriptions-item label="取数底表">
                  <a v-if="m.baseTable" class="base-table-link" :title="baseTableHint(m.baseTable)" @click="goBaseTable(m.baseTable)">{{ m.baseTable }}</a>
                  <span v-else>—</span>
                </a-descriptions-item>
                <a-descriptions-item label="业务负责人">{{ m.businessOwner }}</a-descriptions-item>
                <a-descriptions-item label="技术负责人">{{ m.technicalOwner }}</a-descriptions-item>
              </a-descriptions>
              <template #actions>
                <a-button type="text" size="small" @click="viewDetail(m)">详情</a-button>
                <a-button type="text" size="small" @click="applyPermission(m)">申请权限</a-button>
              </template>
            </a-card>
          </a-col>
        </a-row>
        <a-empty v-if="filteredList.length === 0" description="暂无指标数据" />
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
// 注意：dca 自己的 mock 必须走 @/mock-dca（@/mock 与 @/pages 别名指向 dfd 项目）
import { TableCatalogStore } from '@/mock-dca/shared/table-catalog-store'

const { showMissingTicketModal, ticketContext, showMissingTicket, handleMissingTicketConfirm } = useMissingTicket()
const router = useRouter()

const search = ref('')
const indicatorType = ref<string | undefined>(undefined)
const regCategory = ref<string | undefined>(undefined)

type IndicatorType = 'regulatory' | 'business_core'

interface IndicatorItem {
  id: string
  name: string
  type: IndicatorType
  regulatoryCategory: string
  reportName: string
  businessDefinition: string
  statisticalPeriod: string
  businessOwner: string
  technicalOwner: string
  /** 取数底表（逻辑表名，关联统一表目录 table-catalog-store） */
  baseTable?: string
}

const CATEGORY_LABELS: Record<string, string> = {
  cbirc_banking: '银保监会-银监报表',
  pboc_centralized: '人行-大集中报表',
  pboc_financial_base: '人行-金融基础数据',
  pboc_interest_rate: '人行-利率报备检测'
}

// baseTable：指标取数底表（逻辑表名），与统一表目录 table-catalog-store 联动
//  · dws_metric_credit_rt —— 信贷/风控等业务口径指标（授信、资本、资产质量、利率）
//  · ads_metric_dashboard —— 看板/运营/趋势类指标（消费侧结果表）
//  · 缺省表示该指标暂无对应已上线底表
const CREDIT_RT = 'dws_metric_credit_rt'
const DASHBOARD = 'ads_metric_dashboard'

const allIndicators = ref<IndicatorItem[]>([
  { id: 'm001', name: '核心一级资本充足率', type: 'regulatory', regulatoryCategory: 'cbirc_banking', reportName: '资本充足率报告', businessDefinition: '核心一级资本与风险加权资产的比例', statisticalPeriod: '月度', businessOwner: '风险管理部', technicalOwner: '数据平台组', baseTable: CREDIT_RT },
  { id: 'm002', name: '一级资本充足率', type: 'regulatory', regulatoryCategory: 'cbirc_banking', reportName: '资本充足率报告', businessDefinition: '一级资本与风险加权资产的比例', statisticalPeriod: '月度', businessOwner: '风险管理部', technicalOwner: '数据平台组', baseTable: CREDIT_RT },
  { id: 'm003', name: '资本充足率', type: 'regulatory', regulatoryCategory: 'cbirc_banking', reportName: '资本充足率报告', businessDefinition: '总资本与风险加权资产的比例', statisticalPeriod: '月度', businessOwner: '风险管理部', technicalOwner: '数据平台组', baseTable: CREDIT_RT },
  { id: 'm004', name: '杠杆率', type: 'regulatory', regulatoryCategory: 'cbirc_banking', reportName: '杠杆率报告', businessDefinition: '一级资本与总资产的比例', statisticalPeriod: '季度', businessOwner: '风险管理部', technicalOwner: '数据平台组', baseTable: CREDIT_RT },
  { id: 'm005', name: '流动性覆盖率', type: 'regulatory', regulatoryCategory: 'pboc_centralized', reportName: '流动性风险监管报告', businessDefinition: '优质流动性资产与未来30天净现金流出量的比例', statisticalPeriod: '月度', businessOwner: '资产负债管理部', technicalOwner: '数据平台组' },
  { id: 'm006', name: '净稳定资金比例', type: 'regulatory', regulatoryCategory: 'pboc_centralized', reportName: '净稳定资金比例报告', businessDefinition: '可用稳定资金与所需稳定资金的比例', statisticalPeriod: '季度', businessOwner: '资产负债管理部', technicalOwner: '数据平台组' },
  { id: 'm008', name: '不良贷款率', type: 'regulatory', regulatoryCategory: 'pboc_financial_base', reportName: '信贷资产质量报告', businessDefinition: '不良贷款余额与贷款总额的比例', statisticalPeriod: '季度', businessOwner: '信贷管理部', technicalOwner: '数据平台组', baseTable: CREDIT_RT },
  { id: 'm011', name: '拨备覆盖率', type: 'regulatory', regulatoryCategory: 'pboc_financial_base', reportName: '贷款拨备率报表', businessDefinition: '贷款损失准备与不良贷款的比例', statisticalPeriod: '季度', businessOwner: '信贷管理部', technicalOwner: '数据平台组', baseTable: CREDIT_RT },
  { id: 'm012', name: '加权平均利率-对公贷款', type: 'regulatory', regulatoryCategory: 'pboc_interest_rate', reportName: '利率报备检测分析', businessDefinition: '对公贷款加权平均利率', statisticalPeriod: '月度', businessOwner: '资产负债管理部', technicalOwner: '数据平台组', baseTable: CREDIT_RT },
  { id: 'm015', name: '月活跃用户数', type: 'business_core', regulatoryCategory: '', reportName: '产品运营报告', businessDefinition: '当月有交易或登录行为的去重用户数', statisticalPeriod: '月度', businessOwner: '产品运营部', technicalOwner: '数据平台组', baseTable: DASHBOARD },
  { id: 'm016', name: '交易额', type: 'business_core', regulatoryCategory: '', reportName: '产品运营报告', businessDefinition: '统计周期内所有成功交易的金额总和', statisticalPeriod: '日度', businessOwner: '产品运营部', technicalOwner: '数据平台组', baseTable: DASHBOARD },
  { id: 'm018', name: '授信通过率', type: 'business_core', regulatoryCategory: '', reportName: '风控运营报告', businessDefinition: '授信申请通过数量与申请总量的比例', statisticalPeriod: '月度', businessOwner: '风控运营部', technicalOwner: '数据平台组', baseTable: CREDIT_RT }
])

const filteredList = computed(() => {
  let result = allIndicators.value
  if (search.value) {
    const k = search.value.toLowerCase()
    result = result.filter(m => m.name.toLowerCase().includes(k) || m.businessDefinition.toLowerCase().includes(k))
  }
  if (indicatorType.value) result = result.filter(m => m.type === indicatorType.value)
  if (regCategory.value) result = result.filter(m => m.regulatoryCategory === regCategory.value)
  return result
})

// ---------- 与统一表目录联动：存储引擎 + 取数底表下钻 ----------

/** 由底表派生存储引擎与标签色（底表未登记则 engine 为空串，模板不显示标签） */
function storageMeta(name?: string): { engine: string; color: string } {
  const t = name ? TableCatalogStore.byName(name) : undefined
  if (!t) return { engine: '', color: 'gray' }
  const color = t.storage === 'Doris' ? 'purple' : t.storage === 'Hive' ? 'blue' : 'gray'
  return { engine: t.storage, color }
}

/** 底表悬浮提示：中文名 + 更新频率 */
function baseTableHint(name?: string): string {
  const t = name ? TableCatalogStore.byName(name) : undefined
  return t ? `${t.cnName} · ${t.updateFrequency}更新 · 点击查看表详情` : ''
}

function goBaseTable(name?: string) {
  if (!name) return
  if (!TableCatalogStore.byName(name)) { Message.warning(`底表「${name}」暂未登记到统一表目录`); return }
  router.push({ name: 'data-map-table', params: { tableName: name } })
}

function viewDetail(m: IndicatorItem) {
  if (m.baseTable) {
    router.push({ name: 'data-map-table', params: { tableName: m.baseTable } })
  } else {
    Message.info(`指标「${m.name}」未绑定底表，暂无详情页`)
  }
}
function applyPermission(m: IndicatorItem) {
  if (m.baseTable) {
    router.push({ name: 'data-map-table', params: { tableName: m.baseTable }, query: { tab: 'permission' } })
  } else {
    Message.info(`指标「${m.name}」未绑定底表，无法申请权限`)
  }
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
.base-table-link { color: #165DFF; cursor: pointer; font-family: Menlo, Consolas, monospace; font-size: 12px; }
.base-table-link:hover { text-decoration: underline; }
</style>