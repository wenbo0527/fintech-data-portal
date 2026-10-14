<template>
  <div class="data-resources-page">
    <div class="banner-section">
      <div class="banner-content">
        <div class="title-row"><h1 class="banner-title">变量字典</h1></div>
        <p class="banner-subtitle">风控与营销变量的统一注册、口径管理与权限控制</p>
        <div class="search-area">
          <a-input-search v-model="search" class="main-search-input" placeholder="输入变量名称、编码或描述搜索" search-button size="large" allow-clear>
            <template #button-icon><icon-search /></template>
          </a-input-search>
          <div class="search-filters-inline">
            <a-select v-model="varType" placeholder="变量类型" allow-clear size="large" style="width: 160px" class="filter-select">
              <a-option value="numerical">数值型</a-option>
              <a-option value="categorical">分类型</a-option>
              <a-option value="text">文本型</a-option>
              <a-option value="datetime">时间型</a-option>
              <a-option value="boolean">布尔型</a-option>
            </a-select>
            <a-select v-model="varStatus" placeholder="状态" allow-clear size="large" style="width: 140px" class="filter-select">
              <a-option value="active">已上架</a-option>
              <a-option value="pending">待审核</a-option>
              <a-option value="inactive">已下架</a-option>
              <a-option value="expired">已过期</a-option>
            </a-select>
            <a-button class="action-btn" size="large" @click="showMissingTicket({ assetType: 'variable', pageSource: '变量字典' })">
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
          <a-col v-for="v in filteredList" :key="v.id" :xs="24" :sm="12" :md="8" :lg="6">
            <a-card hoverable :bordered="false">
              <template #title>
                <a-space>
                  <a-tag :color="typeColor(v.type)">{{ typeLabel(v.type) }}</a-tag>
                  <span>{{ v.name }}</span>
                </a-space>
              </template>
              <a-descriptions :column="1" size="small">
                <a-descriptions-item label="编码">{{ v.code }}</a-descriptions-item>
                <a-descriptions-item label="数据源">{{ v.dataSourceName }}</a-descriptions-item>
                <a-descriptions-item v-if="v.baseTable" label="存储引擎">
                  <a-space :size="6">
                    <a-tag v-if="storageMeta(v.baseTable).engine" :color="storageMeta(v.baseTable).color">
                      {{ storageMeta(v.baseTable).engine }}
                    </a-tag>
                    <a-tooltip v-if="storageMeta(v.baseTable).engine === 'HBase'" content="rowkey 在线点查，毫秒级取数">
                      <span class="base-table-link" @click="goBaseTable(v.baseTable)">{{ v.baseTable }}</span>
                    </a-tooltip>
                    <span v-else class="base-table-link" @click="goBaseTable(v.baseTable)">{{ v.baseTable }}</span>
                  </a-space>
                </a-descriptions-item>
                <a-descriptions-item label="创建人">{{ v.creator }}</a-descriptions-item>
                <a-descriptions-item label="创建时间">{{ v.createdAt }}</a-descriptions-item>
                <a-descriptions-item label="状态">
                  <a-tag :color="statusColor(v.status)">{{ statusLabel(v.status) }}</a-tag>
                </a-descriptions-item>
              </a-descriptions>
              <template #actions>
                <a-button type="text" size="small" @click="viewDetail(v)">详情</a-button>
                <a-button type="text" size="small" @click="applyPermission(v)">申请权限</a-button>
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

interface VariableItem {
  id: number
  name: string
  code: string
  type: string
  status: string
  dataSourceName: string
  creator: string
  createdAt: string
  /** 取数底表（统一表目录 table-catalog-store 中的逻辑表名） */
  baseTable?: string
}

const search = ref('')
const varType = ref<string | undefined>(undefined)
const varStatus = ref<string | undefined>(undefined)

const allVariables = ref<VariableItem[]>([
  { id: 1, name: '客户年龄段', code: 'var_age_group', type: 'categorical', status: 'active', dataSourceName: 'CRM系统', creator: '张三', createdAt: '2024-03-15', baseTable: 'ads_feature_user_rt' },
  { id: 2, name: '近30天交易金额', code: 'var_trx_amt_30d', type: 'numerical', status: 'active', dataSourceName: '交易系统', creator: '李四', createdAt: '2024-03-18', baseTable: 'ads_feature_user_rt' },
  { id: 3, name: '客户等级', code: 'var_cust_level', type: 'categorical', status: 'pending', dataSourceName: 'CRM系统', creator: '王五', createdAt: '2024-04-01', baseTable: 'ads_feature_user_rt' },
  { id: 4, name: '最后登录时间', code: 'var_last_login_time', type: 'datetime', status: 'active', dataSourceName: '运营系统', creator: '赵六', createdAt: '2024-03-20', baseTable: 'ads_feature_user_rt' },
  { id: 5, name: '是否VIP', code: 'var_is_vip', type: 'boolean', status: 'inactive', dataSourceName: '会员系统', creator: '张三', createdAt: '2024-02-28' },
  { id: 6, name: '手机号码', code: 'var_phone', type: 'text', status: 'active', dataSourceName: 'CRM系统', creator: '李四', createdAt: '2024-03-10' },
  { id: 7, name: '近7天登录次数', code: 'var_login_cnt_7d', type: 'numerical', status: 'pending', dataSourceName: '运营系统', creator: '王五', createdAt: '2024-04-05', baseTable: 'ads_feature_user_rt' },
  { id: 8, name: '风险评分', code: 'var_risk_score', type: 'numerical', status: 'active', dataSourceName: '风控系统', creator: '张三', createdAt: '2024-03-30', baseTable: 'kafka_credit_decision_flow' },
  { id: 9, name: '信用等级', code: 'var_credit_level', type: 'categorical', status: 'expired', dataSourceName: '征信系统', creator: '李四', createdAt: '2024-01-15', baseTable: 'ads_feature_user_rt' }
])

const filteredList = computed(() => {
  let result = allVariables.value
  if (search.value) {
    const k = search.value.toLowerCase()
    result = result.filter(v => v.name.toLowerCase().includes(k) || v.code.toLowerCase().includes(k))
  }
  if (varType.value) result = result.filter(v => v.type === varType.value)
  if (varStatus.value) result = result.filter(v => v.status === varStatus.value)
  return result
})

function typeColor(t: string) { return { numerical: 'blue', categorical: 'green', text: 'orange', datetime: 'purple', boolean: 'cyan' }[t] || 'gray' }
function typeLabel(t: string) { return { numerical: '数值型', categorical: '分类型', text: '文本型', datetime: '时间型', boolean: '布尔型' }[t] || t }
function statusColor(s: string) { return { active: 'green', pending: 'orange', inactive: 'gray', expired: 'red' }[s] || 'gray' }
function statusLabel(s: string) { return { active: '已上架', pending: '待审核', inactive: '已下架', expired: '已过期' }[s] || s }
function viewDetail(v: VariableItem) {
  if (v.baseTable) {
    router.push({ name: 'data-map-table', params: { tableName: v.baseTable } })
  } else {
    Message.info(`变量「${v.name}」未绑定底表，暂无详情页`)
  }
}
function applyPermission(v: VariableItem) {
  if (v.baseTable) {
    router.push({ name: 'data-map-table', params: { tableName: v.baseTable }, query: { tab: 'permission' } })
  } else {
    Message.info(`变量「${v.name}」未绑定底表，无法申请权限`)
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