<template>
  <div class="hbase-tables-page">
    <PageBanner
      v-model:search="search"
      :title="inList ? '贷中行为特征 · HBase 表' : '风险特征 HBase 表'"
      :subtitle="inList ? '贷中阶段用户行为特征 HBase 表清单,点击表名查看字段详情' : '风控域 HBase 列式存储表目录,支持实时点查与画像拼接'"
      :search-placeholder="inList ? '输入表名、命名空间或列族搜索' : '点击卡片查看 HBase 表清单'"
    >
      <template #actions>
        <a-button v-if="inList" size="large" @click="goBack">
          <template #icon><icon-left /></template>
          返回
        </a-button>
        <a-button v-else class="action-btn" size="large" @click="showMissingTicket({ assetType: 'table', pageSource: '风险特征 HBase 表' })">
          <template #icon><icon-plus /></template>
          缺失工单
        </a-button>
      </template>
    </PageBanner>

    <!-- 一级:单卡片入口 -->
    <div v-if="!inList" class="main-content">
      <a-row :gutter="[16, 16]">
        <a-col :xs="24" :sm="12" :md="8" :lg="6">
          <a-card hoverable :bordered="false" class="theme-card" @click="enterList">
            <div class="theme-card-header">
              <a-tag color="red" size="large">贷中行为特征</a-tag>
              <a-tag size="small" color="red">HBASE</a-tag>
            </div>
            <div class="theme-card-count">{{ hbaseTables.length }}<span class="theme-card-unit"> 张表</span></div>
            <div class="theme-card-desc">贷中阶段用户行为特征 HBase 表清单,涵盖登录、交易、设备、风险信号等核心行为画像</div>
            <div class="theme-card-footer"><span>点击查看表清单</span><icon-right /></div>
          </a-card>
        </a-col>
      </a-row>
    </div>

    <!-- 二级:表清单(表名点击跳转详情) -->
    <div v-else class="main-content">
      <a-card :bordered="false">
        <a-table
          :columns="columns"
          :data="filteredList"
          :pagination="{ pageSize: 10, showTotal: true }"
          row-key="id"
          size="medium"
        >
          <template #name="{ record }">
            <a-link @click="goToTable(record)">{{ record.name }}</a-link>
          </template>
          <template #status="{ record }">
            <a-tag :color="getStatusColor(record.status)">{{ statusLabel(record.status) }}</a-tag>
          </template>
        </a-table>
      </a-card>
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
import { IconPlus, IconLeft, IconRight } from '@arco-design/web-vue/es/icon'
import PageBanner from '@/components-dca/common/PageBanner.vue'
import MissingTicketModal from '@/pages/search/MissingTicketModal.vue'
import { useMissingTicket } from '@/composables/useMissingTicket'

const { showMissingTicketModal, ticketContext, showMissingTicket, handleMissingTicketConfirm } = useMissingTicket()

const router = useRouter()
const search = ref('')
const inList = ref(false)

// HBase 贷中行为特征表(mock,不分域)
const hbaseTables = ref([
  { id: 'T001', name: 'risk_user_behavior',      displayName: '用户行为明细表', namespace: 'ns', columnFamily: 'f', rowKeyDesign: 'user_id',         regionCount: 32, regionServer: 6,  ttl: '90d',  storageGb: 1280, owner: '张风控',   updatedAt: '今天 10:30', status: 'online', upstream: 'core_trade.user_login_log' },
  { id: 'T002', name: 'risk_user_session',       displayName: '用户会话轨迹表', namespace: 'ns', columnFamily: 'cf', rowKeyDesign: 'user_id+ts',      regionCount: 24, regionServer: 4,  ttl: '30d',  storageGb: 860,  owner: '张风控',   updatedAt: '今天 10:25', status: 'online', upstream: 'core_trade.user_session_raw' },
  { id: 'T003', name: 'risk_user_device',        displayName: '用户设备指纹表', namespace: 'ns', columnFamily: 'd', rowKeyDesign: 'device_id',        regionCount: 16, regionServer: 3,  ttl: '180d', storageGb: 540,  owner: '林反欺诈', updatedAt: '今天 09:50', status: 'online', upstream: 'risk_decision.device_fingerprint' },
  { id: 'T004', name: 'risk_user_profile',       displayName: '用户画像汇总表', namespace: 'ns', columnFamily: 'p', rowKeyDesign: 'user_id',         regionCount: 12, regionServer: 2,  ttl: '永久',  storageGb: 320,  owner: '王运营',   updatedAt: '昨天 18:10', status: 'online', upstream: 'user_center.user_profile' },
  { id: 'T005', name: 'risk_user_login_log',     displayName: '用户登录流水表', namespace: 'ns', columnFamily: 'l', rowKeyDesign: 'user_id+login_ts',regionCount: 40, regionServer: 8,  ttl: '60d',  storageGb: 2100, owner: '张风控',   updatedAt: '今天 11:05', status: 'online', upstream: 'core_trade.user_login_log' },
  { id: 'T006', name: 'risk_user_tag_idx',       displayName: '用户标签索引表', namespace: 'ns', columnFamily: 't', rowKeyDesign: 'tag_id+user_id',  regionCount: 18, regionServer: 3,  ttl: '永久',  storageGb: 480,  owner: '王运营',   updatedAt: '今天 09:00', status: 'online', upstream: 'risk_decision.user_tag_dim' },
  { id: 'T007', name: 'risk_trade_behavior',     displayName: '交易行为明细表', namespace: 'ns', columnFamily: 'f', rowKeyDesign: 'user_id',         regionCount: 48, regionServer: 10, ttl: '180d', storageGb: 3400, owner: '李开发',   updatedAt: '今天 10:40', status: 'online', upstream: 'core_trade.trade_order' },
  { id: 'T008', name: 'risk_trade_aggr_1d',      displayName: '交易 1 日聚合表', namespace: 'ns', columnFamily: 'a', rowKeyDesign: 'user_id',         regionCount: 20, regionServer: 4,  ttl: '90d',  storageGb: 760,  owner: '李开发',   updatedAt: '今天 10:42', status: 'online', upstream: 'risk_decision.trade_dws_1d' },
  { id: 'T009', name: 'risk_trade_aggr_30d',     displayName: '交易 30 日聚合表',namespace: 'ns', columnFamily: 'a', rowKeyDesign: 'user_id',         regionCount: 20, regionServer: 4,  ttl: '永久',  storageGb: 820,  owner: '李开发',   updatedAt: '今天 10:43', status: 'online', upstream: 'risk_decision.trade_dws_30d' },
  { id: 'T010', name: 'risk_merchant_profile',   displayName: '商户画像表',       namespace: 'ns', columnFamily: 'm', rowKeyDesign: 'merchant_id',     regionCount: 10, regionServer: 2,  ttl: '永久',  storageGb: 180,  owner: '陈风控',   updatedAt: '今天 08:55', status: 'online', upstream: 'core_trade.merchant_dim' },
  { id: 'T011', name: 'risk_large_trade_alert',  displayName: '大额交易告警表',   namespace: 'ns', columnFamily: 'a', rowKeyDesign: 'user_id+ts',      regionCount: 14, regionServer: 3,  ttl: '90d',  storageGb: 220,  owner: '张风控',   updatedAt: '今天 11:20', status: 'beta',   upstream: 'risk_decision.alert_event' },
  { id: 'T012', name: 'risk_device_fingerprint', displayName: '设备指纹主表',     namespace: 'ns', columnFamily: 'f', rowKeyDesign: 'device_id',       regionCount: 28, regionServer: 6,  ttl: '365d', storageGb: 960,  owner: '林反欺诈', updatedAt: '今天 10:15', status: 'online', upstream: 'risk_decision.device_fingerprint' },
  { id: 'T013', name: 'risk_device_geo',         displayName: '设备地理位发表',   namespace: 'ns', columnFamily: 'g', rowKeyDesign: 'device_id+ts',    regionCount: 22, regionServer: 4,  ttl: '180d', storageGb: 580,  owner: '林反欺诈', updatedAt: '今天 10:18', status: 'online', upstream: 'risk_decision.device_location_log' },
  { id: 'T014', name: 'risk_device_relation',    displayName: '设备关联图谱表',   namespace: 'ns', columnFamily: 'r', rowKeyDesign: 'device_id',       regionCount: 16, regionServer: 3,  ttl: '永久',  storageGb: 320,  owner: '陈风控',   updatedAt: '今天 09:30', status: 'online', upstream: 'risk_decision.device_relation_edge' },
  { id: 'T015', name: 'risk_device_change_log',  displayName: '设备变更流水表',   namespace: 'ns', columnFamily: 'c', rowKeyDesign: 'user_id+ts',      regionCount: 12, regionServer: 2,  ttl: '90d',  storageGb: 140,  owner: '张风控',   updatedAt: '今天 09:35', status: 'online', upstream: 'core_trade.user_device_change_log' },
  { id: 'T016', name: 'risk_user_signal',        displayName: '用户风险信号表',   namespace: 'ns', columnFamily: 's', rowKeyDesign: 'user_id',         regionCount: 30, regionServer: 6,  ttl: '永久',  storageGb: 720,  owner: '陈风控',   updatedAt: '今天 10:10', status: 'online', upstream: 'risk_decision.user_signal_dws' },
  { id: 'T017', name: 'risk_fraud_graph',        displayName: '欺诈关联图谱表',   namespace: 'ns', columnFamily: 'g', rowKeyDesign: 'entity_id',       regionCount: 24, regionServer: 5,  ttl: '永久',  storageGb: 480,  owner: '陈风控',   updatedAt: '今天 10:05', status: 'online', upstream: 'risk_decision.fraud_relation_edge' },
  { id: 'T018', name: 'risk_apply_record',       displayName: '申请记录明细表',   namespace: 'ns', columnFamily: 'a', rowKeyDesign: 'user_id+ts',      regionCount: 36, regionServer: 7,  ttl: '365d', storageGb: 1800, owner: '张风控',   updatedAt: '今天 09:20', status: 'online', upstream: 'core_trade.loan_apply' },
  { id: 'T019', name: 'risk_overdue_record',     displayName: '逾期记录表',       namespace: 'ns', columnFamily: 'o', rowKeyDesign: 'user_id',         regionCount: 18, regionServer: 3,  ttl: '永久',  storageGb: 260,  owner: '张风控',   updatedAt: '今天 09:22', status: 'online', upstream: 'fin_acc.overdue_record' },
  { id: 'T020', name: 'risk_blacklist',          displayName: '黑名单主表',       namespace: 'ns', columnFamily: 'b', rowKeyDesign: 'entity_id',       regionCount: 8,  regionServer: 2,  ttl: '永久',  storageGb: 80,   owner: '陈风控',   updatedAt: '昨天 16:30', status: 'offline', upstream: 'risk_decision.blacklist_dim' }
])

function matchSearch(t: any) {
  if (!search.value) return true
  const k = search.value.toLowerCase()
  return t.name.toLowerCase().includes(k) || t.displayName.includes(search.value) || t.namespace.toLowerCase().includes(k) || t.columnFamily.toLowerCase().includes(k) || t.owner.includes(search.value)
}

const filteredList = computed(() => hbaseTables.value.filter(matchSearch))

function enterList() { inList.value = true; search.value = '' }
function goBack()   { inList.value = false; search.value = '' }

const columns = [
  { title: '表ID',     dataIndex: 'id',           width: 90 },
  { title: '表名',     dataIndex: 'name',         width: 220, slotName: 'name' },
  { title: '中文名',   dataIndex: 'displayName',  width: 160 },
  { title: '命名空间', dataIndex: 'namespace',    width: 110 },
  { title: '列族',     dataIndex: 'columnFamily', width: 90 },
  { title: 'RowKey',   dataIndex: 'rowKeyDesign', width: 160 },
  { title: 'Region 数', dataIndex: 'regionCount', width: 100 },
  { title: 'TTL',      dataIndex: 'ttl',          width: 90 },
  { title: '存储(GB)', dataIndex: 'storageGb',    width: 100 },
  { title: '负责人',   dataIndex: 'owner',        width: 100 },
  { title: '更新时间', dataIndex: 'updatedAt',    width: 120 },
  { title: '状态',     dataIndex: 'status',       slotName: 'status', width: 90 }
]

function goToTable(t: any) {
  router.push(`/discovery/hbase-table-detail/${encodeURIComponent(t.name)}`)
}
function getStatusColor(s: string) {
  return ({ online: 'green', beta: 'arcoblue', offline: 'gray' }[s]) || 'gray'
}
function statusLabel(s: string) {
  return ({ online: '在线', beta: '灰度', offline: '已下线' }[s]) || s
}
</script>

<style scoped>
.hbase-tables-page { min-height: 100vh; background: var(--dca-bg-page-alt); position: relative; overflow-x: hidden; }
.action-btn { white-space: nowrap; }
.main-content { padding: 0 40px var(--dca-spacing-2xl); width: 100%; max-width: var(--dca-page-max-width-wide); margin: -40px auto 0; position: relative; z-index: 3; }
.theme-card { cursor: pointer; transition: all 0.3s; border-radius: var(--dca-radius-lg); }
.theme-card:hover { transform: translateY(-4px); box-shadow: var(--dca-shadow-lg); }
.theme-card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--dca-spacing-md); }
.theme-card-count { font-size: 32px; font-weight: 700; color: var(--dca-text-primary); margin-bottom: var(--dca-spacing-xs); }
.theme-card-unit { font-size: var(--dca-font-md); font-weight: 400; color: var(--dca-text-tertiary); }
.theme-card-desc { font-size: var(--dca-font-sm); color: var(--dca-text-secondary); margin-bottom: var(--dca-spacing-md); line-height: 1.5; min-height: 42px; }
.theme-card-footer { display: flex; justify-content: space-between; align-items: center; font-size: var(--dca-font-sm); color: var(--dca-text-tertiary); border-top: 1px solid var(--dca-border-light); padding-top: var(--dca-spacing-sm); }
</style>