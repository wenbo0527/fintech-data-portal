<template>
  <div class="hbase-table-detail-page">
    <!-- 面包屑 -->
    <a-breadcrumb class="breadcrumb">
      <a-breadcrumb-item><a @click="goHome">数据发现</a></a-breadcrumb-item>
      <a-breadcrumb-item><a @click="goToList">风险特征 HBase 表</a></a-breadcrumb-item>
      <a-breadcrumb-item>{{ table?.displayName || tableName }}</a-breadcrumb-item>
    </a-breadcrumb>

    <PageHeader :title="table?.displayName || tableName" :sub-title="table?.name || ''">
      <template #extra>
        <a-space>
          <a-tag color="red" size="large">HBASE</a-tag>
          <a-button @click="goToList">返回表清单</a-button>
        </a-space>
      </template>
    </PageHeader>

    <!-- 区域 1:表元信息(与 classify/table-detail 统一:标题「表元信息」+ 2 列) -->
    <a-card title="表元信息" class="meta-card">
      <a-descriptions :column="2" :data="basicMeta" />
    </a-card>

    <!-- 区域 2:血缘(上游原表 + 下游消费) -->
    <TableLineageCard
      class="lineage-card"
      :upstream="lineageUpstream"
      :downstream="lineageDownstream"
      @node-click="onLineageNode"
    >
      <template #tip>
        该 HBase 表为上游业务表数据同步/加工后的列式存储,用于贷中实时点查与画像拼接;「在目录」节点可点击进入对应 HBase 表详情。演示 mock 血缘,非真实链路。
      </template>
    </TableLineageCard>

    <!-- 区域 3:字段详情 -->
    <a-card class="fields-card">
      <template #title>
        <div class="fields-header">
          <span>字段详情（{{ fields.length }}）</span>
          <a-input-search
            v-model="searchKw"
            placeholder="搜索字段名或注释"
            allow-clear
            style="width: 240px"
          />
        </div>
      </template>

      <a-table
        :data="filteredFields"
        :columns="fieldColumns"
        :pagination="{ showTotal: true, pageSize: 20 }"
        row-key="name"
        :bordered="false"
        :column-resizable="true"
        :scroll="{ x: '100%' }"
      >
        <template #cell-idx="{ rowIndex }">{{ rowIndex + 1 }}</template>
        <template #cell-name="{ record }">
          <a-tag color="gray">{{ record.name }}</a-tag>
        </template>
        <template #cell-type="{ record }">
          <a-tag color="cyan">{{ record.type }}</a-tag>
        </template>
        <template #cell-cf="{ record }">
          <a-tag>{{ record.cf }}</a-tag>
        </template>
        <template #cell-pk="{ record }">
          <a-tag v-if="record.isPk" color="red">是</a-tag>
          <span v-else>否</span>
        </template>
        <template #cell-null="{ record }">
          <span v-if="record.nullable" style="color:#86909c">是</span>
          <span v-else style="color:#1d2129">否</span>
        </template>
        <template #cell-sens="{ record }">
          <a-tag :color="sensitivityColor(record.sensitivity)">{{ record.sensitivity }}</a-tag>
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { TableColumnData } from '@arco-design/web-vue'
import PageHeader from '@/components-dca/common/PageHeader.vue'
import TableLineageCard, { type LineageNode } from '@/components-dca/common/TableLineageCard.vue'
import { useDraggableColumns } from '@/composables/useDraggableColumns'

const route = useRoute()
const router = useRouter()

const tableName = computed(() => decodeURIComponent(String(route.params.tableName || '')))
const searchKw = ref('')

// 表元数据(与列表页共用,这里简化集中维护;实际项目可由 mock store 提供)
const allTables = ref([
  { name: 'risk_user_behavior',      displayName: '用户行为明细表', namespace: 'ns', columnFamily: 'f', rowKeyDesign: 'user_id',         regionCount: 32, regionServer: 6,  ttl: '90d',  storageGb: 1280, owner: '张风控',   updatedAt: '今天 10:30', status: 'online', upstream: 'core_trade.user_login_log' },
  { name: 'risk_user_session',       displayName: '用户会话轨迹表', namespace: 'ns', columnFamily: 'cf', rowKeyDesign: 'user_id+ts',      regionCount: 24, regionServer: 4,  ttl: '30d',  storageGb: 860,  owner: '张风控',   updatedAt: '今天 10:25', status: 'online', upstream: 'core_trade.user_session_raw' },
  { name: 'risk_user_device',        displayName: '用户设备指纹表', namespace: 'ns', columnFamily: 'd', rowKeyDesign: 'device_id',        regionCount: 16, regionServer: 3,  ttl: '180d', storageGb: 540,  owner: '林反欺诈', updatedAt: '今天 09:50', status: 'online', upstream: 'risk_decision.device_fingerprint' },
  { name: 'risk_user_profile',       displayName: '用户画像汇总表', namespace: 'ns', columnFamily: 'p', rowKeyDesign: 'user_id',         regionCount: 12, regionServer: 2,  ttl: '永久',  storageGb: 320,  owner: '王运营',   updatedAt: '昨天 18:10', status: 'online', upstream: 'user_center.user_profile' },
  { name: 'risk_user_login_log',     displayName: '用户登录流水表', namespace: 'ns', columnFamily: 'l', rowKeyDesign: 'user_id+login_ts',regionCount: 40, regionServer: 8,  ttl: '60d',  storageGb: 2100, owner: '张风控',   updatedAt: '今天 11:05', status: 'online', upstream: 'core_trade.user_login_log' },
  { name: 'risk_user_tag_idx',       displayName: '用户标签索引表', namespace: 'ns', columnFamily: 't', rowKeyDesign: 'tag_id+user_id',  regionCount: 18, regionServer: 3,  ttl: '永久',  storageGb: 480,  owner: '王运营',   updatedAt: '今天 09:00', status: 'online', upstream: 'risk_decision.user_tag_dim' },
  { name: 'risk_trade_behavior',     displayName: '交易行为明细表', namespace: 'ns', columnFamily: 'f', rowKeyDesign: 'user_id',         regionCount: 48, regionServer: 10, ttl: '180d', storageGb: 3400, owner: '李开发',   updatedAt: '今天 10:40', status: 'online', upstream: 'core_trade.trade_order' },
  { name: 'risk_trade_aggr_1d',      displayName: '交易 1 日聚合表', namespace: 'ns', columnFamily: 'a', rowKeyDesign: 'user_id',         regionCount: 20, regionServer: 4,  ttl: '90d',  storageGb: 760,  owner: '李开发',   updatedAt: '今天 10:42', status: 'online', upstream: 'risk_decision.trade_dws_1d' },
  { name: 'risk_trade_aggr_30d',     displayName: '交易 30 日聚合表',namespace: 'ns', columnFamily: 'a', rowKeyDesign: 'user_id',         regionCount: 20, regionServer: 4,  ttl: '永久',  storageGb: 820,  owner: '李开发',   updatedAt: '今天 10:43', status: 'online', upstream: 'risk_decision.trade_dws_30d' },
  { name: 'risk_merchant_profile',   displayName: '商户画像表',       namespace: 'ns', columnFamily: 'm', rowKeyDesign: 'merchant_id',     regionCount: 10, regionServer: 2,  ttl: '永久',  storageGb: 180,  owner: '陈风控',   updatedAt: '今天 08:55', status: 'online', upstream: 'core_trade.merchant_dim' },
  { name: 'risk_large_trade_alert',  displayName: '大额交易告警表',   namespace: 'ns', columnFamily: 'a', rowKeyDesign: 'user_id+ts',      regionCount: 14, regionServer: 3,  ttl: '90d',  storageGb: 220,  owner: '张风控',   updatedAt: '今天 11:20', status: 'beta',   upstream: 'risk_decision.alert_event' },
  { name: 'risk_device_fingerprint', displayName: '设备指纹主表',     namespace: 'ns', columnFamily: 'f', rowKeyDesign: 'device_id',       regionCount: 28, regionServer: 6,  ttl: '365d', storageGb: 960,  owner: '林反欺诈', updatedAt: '今天 10:15', status: 'online', upstream: 'risk_decision.device_fingerprint' },
  { name: 'risk_device_geo',         displayName: '设备地理位发表',   namespace: 'ns', columnFamily: 'g', rowKeyDesign: 'device_id+ts',    regionCount: 22, regionServer: 4,  ttl: '180d', storageGb: 580,  owner: '林反欺诈', updatedAt: '今天 10:18', status: 'online', upstream: 'risk_decision.device_location_log' },
  { name: 'risk_device_relation',    displayName: '设备关联图谱表',   namespace: 'ns', columnFamily: 'r', rowKeyDesign: 'device_id',       regionCount: 16, regionServer: 3,  ttl: '永久',  storageGb: 320,  owner: '陈风控',   updatedAt: '今天 09:30', status: 'online', upstream: 'risk_decision.device_relation_edge' },
  { name: 'risk_device_change_log',  displayName: '设备变更流水表',   namespace: 'ns', columnFamily: 'c', rowKeyDesign: 'user_id+ts',      regionCount: 12, regionServer: 2,  ttl: '90d',  storageGb: 140,  owner: '张风控',   updatedAt: '今天 09:35', status: 'online', upstream: 'core_trade.user_device_change_log' },
  { name: 'risk_user_signal',        displayName: '用户风险信号表',   namespace: 'ns', columnFamily: 's', rowKeyDesign: 'user_id',         regionCount: 30, regionServer: 6,  ttl: '永久',  storageGb: 720,  owner: '陈风控',   updatedAt: '今天 10:10', status: 'online', upstream: 'risk_decision.user_signal_dws' },
  { name: 'risk_fraud_graph',        displayName: '欺诈关联图谱表',   namespace: 'ns', columnFamily: 'g', rowKeyDesign: 'entity_id',       regionCount: 24, regionServer: 5,  ttl: '永久',  storageGb: 480,  owner: '陈风控',   updatedAt: '今天 10:05', status: 'online', upstream: 'risk_decision.fraud_relation_edge' },
  { name: 'risk_apply_record',       displayName: '申请记录明细表',   namespace: 'ns', columnFamily: 'a', rowKeyDesign: 'user_id+ts',      regionCount: 36, regionServer: 7,  ttl: '365d', storageGb: 1800, owner: '张风控',   updatedAt: '今天 09:20', status: 'online', upstream: 'core_trade.loan_apply' },
  { name: 'risk_overdue_record',     displayName: '逾期记录表',       namespace: 'ns', columnFamily: 'o', rowKeyDesign: 'user_id',         regionCount: 18, regionServer: 3,  ttl: '永久',  storageGb: 260,  owner: '张风控',   updatedAt: '今天 09:22', status: 'online', upstream: 'fin_acc.overdue_record' },
  { name: 'risk_blacklist',          displayName: '黑名单主表',       namespace: 'ns', columnFamily: 'b', rowKeyDesign: 'entity_id',       regionCount: 8,  regionServer: 2,  ttl: '永久',  storageGb: 80,   owner: '陈风控',   updatedAt: '昨天 16:30', status: 'offline', upstream: 'risk_decision.blacklist_dim' }
])

const table = computed(() => allTables.value.find(t => t.name === tableName.value))

// ---------- 血缘(mock:上游业务原表 + 下游 HBase 消费表) ----------
// 下游关系演示挡板:本 HBase 表加工后被哪些下游 HBase 表消费
const DOWNSTREAM_MAP: Record<string, string[]> = {
  risk_user_session: ['risk_user_behavior'],
  risk_user_login_log: ['risk_user_behavior'],
  risk_user_behavior: ['risk_user_signal', 'risk_fraud_graph'],
  risk_trade_behavior: ['risk_trade_aggr_1d', 'risk_trade_aggr_30d', 'risk_large_trade_alert'],
  risk_device_fingerprint: ['risk_device_relation', 'risk_fraud_graph'],
  risk_device_geo: ['risk_fraud_graph'],
  risk_user_tag_idx: ['risk_user_profile'],
  risk_fraud_graph: ['risk_blacklist'],
  risk_apply_record: ['risk_overdue_record']
}

const lineageUpstream = computed<LineageNode[]>(() => {
  if (!table.value?.upstream) return []
  // 上游为业务库原表,不在 HBase 目录内
  return [{ name: table.value.upstream, cnName: '上游业务原表', resolved: false }]
})

const lineageDownstream = computed<LineageNode[]>(() => {
  const names = DOWNSTREAM_MAP[tableName.value] || []
  return names.map(n => {
    const hit = allTables.value.find(t => t.name === n)
    return { name: n, cnName: hit?.displayName, resolved: !!hit }
  })
})

function onLineageNode(node: LineageNode) {
  if (allTables.value.some(t => t.name === node.name)) {
    router.push(`/discovery/hbase-table-detail/${encodeURIComponent(node.name)}`)
  }
}

// 字段 mock:基于 rowKey 设计反推关键字段 + 通用画像字段
function genFields(t: any) {
  if (!t) return []
  const baseFields = [
    { name: 'user_id',         type: 'STRING',  comment: '用户ID',     isPk: true,  nullable: false, sensitivity: 'L3' },
    { name: 'ts',              type: 'LONG',    comment: '事件时间戳', isPk: false, nullable: false, sensitivity: 'L2' },
    { name: 'event_type',      type: 'STRING',  comment: '事件类型',   isPk: false, nullable: false, sensitivity: 'L2' },
    { name: 'device_id',       type: 'STRING',  comment: '设备指纹ID', isPk: false, nullable: true,  sensitivity: 'L3' },
    { name: 'ip',              type: 'STRING',  comment: '客户端IP',   isPk: false, nullable: true,  sensitivity: 'L3' },
    { name: 'channel',         type: 'STRING',  comment: '渠道',       isPk: false, nullable: true,  sensitivity: 'L1' },
    { name: 'amount',          type: 'DECIMAL', comment: '金额',       isPk: false, nullable: true,  sensitivity: 'L3' },
    { name: 'cnt',             type: 'INT',     comment: '计数',       isPk: false, nullable: true,  sensitivity: 'L1' },
    { name: 'score',           type: 'DECIMAL', comment: '风险评分',   isPk: false, nullable: true,  sensitivity: 'L3' },
    { name: 'flag',            type: 'STRING',  comment: '业务标记',   isPk: false, nullable: true,  sensitivity: 'L2' }
  ]
  return baseFields.map(f => ({ ...f, cf: t.columnFamily, desc: `${t.displayName} · ${f.comment}` }))
}

const fields = computed(() => genFields(table.value))

// 字段列定义（表头可拖动换序 + 列宽可拖动，见 useDraggableColumns）
const fieldColumns = useDraggableColumns((): TableColumnData[] => [
  { title: '序号', slotName: 'cell-idx', width: 60 },
  { title: '字段名', dataIndex: 'name', slotName: 'cell-name', width: 200, fixed: 'left' },
  { title: '字段注释', dataIndex: 'comment', width: 240 },
  { title: '类型', dataIndex: 'type', slotName: 'cell-type', width: 120 },
  { title: '列族', dataIndex: 'cf', slotName: 'cell-cf', width: 100 },
  { title: '是否主键', dataIndex: 'isPk', slotName: 'cell-pk', width: 100 },
  { title: '可空', dataIndex: 'nullable', slotName: 'cell-null', width: 80 },
  { title: '敏感级别', dataIndex: 'sensitivity', slotName: 'cell-sens', width: 110 },
  { title: '说明', dataIndex: 'desc', width: 220 }
])

const filteredFields = computed(() => {
  if (!searchKw.value) return fields.value
  const k = searchKw.value.toLowerCase()
  return fields.value.filter(f => f.name.toLowerCase().includes(k) || f.comment.toLowerCase().includes(k))
})

const basicMeta = computed(() => {
  if (!table.value) return []
  return [
    { label: '表名',     value: table.value.name },
    { label: '中文名',   value: table.value.displayName },
    { label: '命名空间', value: table.value.namespace },
    { label: '列族',     value: table.value.columnFamily },
    { label: 'RowKey',   value: table.value.rowKeyDesign },
    { label: 'Region 数', value: table.value.regionCount },
    { label: 'RegionServer', value: table.value.regionServer },
    { label: 'TTL',      value: table.value.ttl },
    { label: '存储',     value: `${table.value.storageGb} GB` },
    { label: '负责人',   value: table.value.owner },
    { label: '更新时间', value: table.value.updatedAt },
    { label: '状态',     value: table.value.status === 'online' ? '在线' : table.value.status === 'beta' ? '灰度' : '已下线' }
  ]
})

function sensitivityColor(s: string) {
  return ({ L1: 'gray', L2: 'arcoblue', L3: 'orange', L4: 'red' }[s]) || 'gray'
}

function goHome()   { router.push('/discovery/overview') }
function goToList() { router.push('/discovery/hbase-tables') }
</script>

<style scoped>
/* 与 classify/table-detail 统一:页面内边距与面包屑间距 */
.hbase-table-detail-page { padding: 16px 24px 24px; }
.breadcrumb { margin-bottom: 8px; }
.meta-card, .lineage-card, .fields-card { margin-bottom: 16px; }
.fields-header { display: flex; align-items: center; justify-content: space-between; }
</style>
