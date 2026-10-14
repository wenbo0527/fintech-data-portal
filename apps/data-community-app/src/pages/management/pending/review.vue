<template>
  <PageContainer>
    <PageHeader
      title="上线审核"
      sub-title="数据管理员处理待审核的上线申请：核对上线检查报告与质量五维 → 通过 / 驳回（支持批量）"
    >
      <template #extra>
        <a-space wrap>
          <a-tag :color="roleColor">操作身份：{{ actor }}</a-tag>
          <a-button @click="goPool">
            <template #icon><icon-left /></template>
            去未上线池
          </a-button>
          <a-button @click="confirmReset">
            <template #icon><icon-refresh /></template>
            重置演示数据
          </a-button>
        </a-space>
      </template>
    </PageHeader>

    <div class="content-wrapper">
      <a-alert v-if="!isReviewer" type="info" class="role-alert">
        当前身份「{{ actor }}」不是数据治理者；演示环境不做强管控，可直接操作，建议用右上角角色切换成「数据治理者」再看审批留痕。
      </a-alert>

      <!-- 待审核队列概览 -->
      <a-card :bordered="false" class="summary-card">
        <a-space wrap :size="16">
          <a-statistic title="待审核" :value="queue.length" :value-style="{ color: '#ff7d00', fontSize: '20px' }" />
          <a-statistic title="其中含软性提示" :value="softHintCount" :value-style="{ color: '#165dff', fontSize: '20px' }" />
          <a-statistic title="目录已上线" :value="stats.online" :value-style="{ color: '#00b42a', fontSize: '20px' }" />
          <span class="hint-text">
            队列平均质量分 {{ avgQuality }} · 检查项为提交时的快照，可通过展开行核对明细
          </span>
        </a-space>
      </a-card>

      <!-- 筛选 -->
      <a-card :bordered="false" class="filter-card">
        <a-space wrap>
          <a-select
            v-model="filterSource"
            :options="sourceOptions"
            placeholder="业务系统 / 来源集群"
            allow-clear
            style="width: 240px"
          />
          <a-select
            v-model="filterStorage"
            :options="storageOptions"
            placeholder="存储类型"
            allow-clear
            style="width: 150px"
          />
          <a-button @click="clearFilters">清空条件</a-button>
          <a-button type="outline" :disabled="!filtered.length" @click="selectAllFiltered">
            选择当前筛选结果（{{ filtered.length }}）
          </a-button>
          <a-button
            type="primary"
            :disabled="!selectedKeys.length"
            @click="handleBatchApprove"
          >
            <template #icon><icon-check-circle /></template>
            批量通过（{{ selectedKeys.length }}）
          </a-button>
        </a-space>
      </a-card>

      <!-- 审核列表 -->
      <a-card :bordered="false" class="table-card">
        <a-table
          :columns="columns"
          :data="filtered"
          row-key="tableId"
          :row-selection="rowSelection"
          :expandable="{ width: 44 }"
          :pagination="{ pageSize: 10, showTotal: true, sizeCanChange: false }"
          :scroll="{ x: 1260 }"
          size="medium"
          @selection-change="handleSelectionChange"
        >
          <template #expand-row="{ record }">
            <div class="expand-panel">
              <div class="expand-col">
                <div class="expand-title">上线检查报告（提交时快照）</div>
                <div v-for="c in checksOf(record)" :key="c.key" class="check-item">
                  <div class="check-head">
                    <icon-check-circle v-if="c.passed" class="ic-ok" />
                    <icon-close-circle v-else :class="c.hard ? 'ic-bad' : 'ic-warn'" />
                    <span class="check-name">{{ c.name }}</span>
                    <a-tag v-if="c.passed" size="small" color="green">通过</a-tag>
                    <a-tag v-else-if="c.hard" size="small" color="red">硬性 · 拦截</a-tag>
                    <a-tag v-else size="small" color="orange">软性 · 提示</a-tag>
                  </div>
                  <div class="check-msg">{{ c.message }}</div>
                </div>
                <a-empty v-if="!checksOf(record).length" description="该申请没有检查快照（历史数据）" :image="false" />
                <div v-if="rejectReasonOf(record)" class="reject-box">
                  <icon-exclamation-circle class="ic-bad" />
                  上次驳回原因：{{ rejectReasonOf(record) }}
                </div>
              </div>
              <div class="expand-col expand-col-right">
                <div class="expand-title">质量五维（提交方自检口径）</div>
                <div v-for="d in qualityDimsOf(record)" :key="d.key" class="dim-row">
                  <span class="dim-name">{{ d.label }}</span>
                  <a-progress
                    :percent="Number((d.value / 100).toFixed(2))"
                    size="small"
                    :show-text="false"
                    :status="d.value >= 60 ? 'normal' : 'danger'"
                    style="width: 150px"
                  />
                  <span :class="['dim-val', d.value >= 60 ? 'q-ok' : 'q-bad']">{{ d.value }}</span>
                </div>
                <div class="dim-total">
                  综合质量分
                  <span :class="['q-score', record.qualityScore >= 60 ? 'q-ok' : 'q-bad']">{{ record.qualityScore }}</span>
                  <span class="q-weight">（完整性30 / 准确性30 / 一致性20 / 及时性10 / 唯一性10）</span>
                </div>
                <div class="expand-meta">
                  <span>负责人：{{ record.owner }}</span>
                  <span>业务领域：{{ record.domain }}</span>
                  <span>更新频次：{{ record.updateFrequency }}</span>
                  <span>字段数：{{ record.fields ? record.fields.length : 0 }}</span>
                </div>
              </div>
            </div>
          </template>
          <template #name="{ record }">
            <div class="tbl-name">{{ record.name }}</div>
            <a-space :size="4" class="tbl-sub">
              <a-tag size="small" color="arcoblue">{{ record.layer }}</a-tag>
              <a-tag size="small" :color="sensitivityColor(record.sensitivity)">
                {{ sensitivityLabel(record.sensitivity) }}
              </a-tag>
            </a-space>
          </template>
          <template #submitter="{ record }">
            <a-space :size="4">
              <icon-user />
              <span>{{ submittedBy(record) }}</span>
            </a-space>
          </template>
          <template #submitTime="{ record }">
            <span class="submit-time">{{ record.reviewInfo ? record.reviewInfo.submittedAt : '-' }}</span>
          </template>
          <template #status="{ record }">
            <a-space :size="4">
              <a-tag :color="statusColor(record.status)">{{ statusLabel(record.status) }}</a-tag>
              <a-tooltip v-if="hasSoftHint(record)" content="存在软性检查提示，不拦截上线，建议在评语中知会负责人">
                <icon-exclamation-circle class="ic-warn" />
              </a-tooltip>
            </a-space>
          </template>
          <template #actions="{ record }">
            <a-space :size="2">
              <a-button type="text" size="small" status="success" @click="confirmApprove(record)">通过</a-button>
              <a-button type="text" size="small" status="danger" @click="openReject(record)">驳回</a-button>
            </a-space>
          </template>
          <template #empty>
            <a-empty :description="queue.length ? '没有符合筛选条件的待审核表' : '审核队列已清空，暂无待处理的上线申请'">
              <a-button v-if="queue.length" @click="clearFilters">清空筛选条件</a-button>
              <a-button v-else type="primary" @click="goPool">
                <template #icon><icon-plus /></template>
                去未上线池
              </a-button>
            </a-empty>
          </template>
        </a-table>
      </a-card>
    </div>

    <!-- 驳回原因弹窗 -->
    <a-modal
      v-model:visible="rejectVisible"
      :title="`驳回上线申请 · ${rejectTarget.name}`"
      :width="560"
      ok-text="确认驳回"
      cancel-text="取消"
      :ok-loading="rejecting"
      @ok="doReject"
      @cancel="rejectVisible = false"
    >
      <a-form ref="rejectFormRef" :model="rejectForm" layout="vertical">
        <a-form-item
          field="reason"
          label="驳回原因（必填，将同步给提交人与负责人）"
          :rules="[
            { required: true, message: '请填写驳回原因' },
            { minLength: 5, message: '驳回原因不少于 5 个字，便于对方定位整改点' }
          ]"
        >
          <a-textarea
            v-model="rejectForm.reason"
            placeholder="例如：字段 total_asset 分级为高敏但未配置权限策略，请补齐授权范围后重新提交"
            :auto-size="{ minRows: 3, maxRows: 6 }"
            :max-length="200"
            show-word-limit
          />
        </a-form-item>
      </a-form>
      <a-descriptions :column="1" size="small" bordered class="reject-desc">
        <a-descriptions-item label="表名">{{ rejectTarget.name }}</a-descriptions-item>
        <a-descriptions-item label="中文名">{{ rejectTarget.cnName }}</a-descriptions-item>
        <a-descriptions-item label="提交人">{{ rejectTarget.submittedBy || '-' }}</a-descriptions-item>
        <a-descriptions-item label="提交时间">{{ rejectTarget.submittedAt || '-' }}</a-descriptions-item>
        <a-descriptions-item label="未通过项">{{ rejectTarget.failedText || '全部通过（可放心驳回前再核对）' }}</a-descriptions-item>
      </a-descriptions>
      <div class="quick-reasons">
        <span class="quick-label">常用原因：</span>
        <a-space wrap :size="6">
          <a-tag v-for="r in QUICK_REASONS" :key="r" size="small" color="gray" class="quick-tag" @click="useQuickReason(r)">
            {{ r }}
          </a-tag>
        </a-space>
      </div>
    </a-modal>
  </PageContainer>
</template>

<script setup lang="ts">
/**
 * 上线审核（数据管理 · management/lifecycle/review）
 *
 * 演示角色：数据管理员（数据治理者 · 审批方）
 * 数据源：@/mock-dca/shared/table-catalog-store 的 reviewing 状态表
 * 核心链路：approve → online（store 内部 notify 生成站内通知给提交人）
 *           reject → 回退 offline（写入 reviewInfo.rejectReason + 高优先级通知）
 *           batchApprove → 批量通过，返回 { success, failed }
 * 状态标签与「未上线池」同源：共用 STATUS_LABELS / STATUS_COLORS
 */
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Message, Modal } from '@arco-design/web-vue'
import type { FormInstance } from '@arco-design/web-vue'
import PageContainer from '@/components-dca/common/PageContainer.vue'
import PageHeader from '@/components-dca/common/PageHeader.vue'
import { useRoleStore } from '@/stores-dca/role'
import {
  TableCatalogStore,
  STATUS_LABELS,
  STATUS_COLORS,
  SENSITIVITY_LABELS,
  SENSITIVITY_COLORS,
  QUALITY_DIM_LABELS,
  type QualityDims,
  type ReviewCheck,
  type Sensitivity,
  type TableStatus
} from '@/mock-dca/shared/table-catalog-store'

const router = useRouter()
const roleStore = useRoleStore()

/** 演示身份：审批动作的 actor（approve / reject / batchApprove 的留痕人） */
const actor = computed(() => {
  const code = roleStore.currentRole
  if (code === 'data_admin' || code === 'admin') return '数据管理员'
  return roleStore.currentRoleDef?.label || '数据管理员'
})
const roleColor = computed(() => roleStore.currentRoleDef?.color || '#722ed1')
/** 是否为约定的审批角色（仅用于页面提示，不阻断演示） */
const isReviewer = computed(() => ['data_admin', 'admin'].includes(roleStore.currentRole))

// ---------------- 审核队列与筛选 ----------------

/** 待审核队列 = store 中 status='reviewing' 的表 */
const queue = computed(() => TableCatalogStore.byStatus('reviewing'))
const stats = computed(() => TableCatalogStore.stats())

/** 含软性提示（软性检查未通过）的表数量 */
const softHintCount = computed(() => queue.value.filter(t => (t.reviewInfo?.checks || []).some(c => !c.hard && !c.passed)).length)

const avgQuality = computed(() => {
  if (!queue.value.length) return 0
  return Math.round(queue.value.reduce((a, t) => a + t.qualityScore, 0) / queue.value.length)
})

const filterSource = ref<string>('')
const filterStorage = ref<string>('')

const sourceOptions = computed(() =>
  Array.from(new Set(queue.value.map(t => t.sourceSystem))).map(v => ({ label: v, value: v }))
)
const storageOptions = computed(() =>
  Array.from(new Set(queue.value.map(t => t.storage))).map(v => ({ label: v, value: v }))
)

const filtered = computed(() =>
  queue.value.filter(t => {
    if (filterSource.value && t.sourceSystem !== filterSource.value) return false
    if (filterStorage.value && t.storage !== filterStorage.value) return false
    return true
  })
)

function clearFilters() {
  filterSource.value = ''
  filterStorage.value = ''
}

/** 状态标签：与「未上线池」同一份常量，保证颜色/文案一致 */
function statusLabel(s: string) {
  return STATUS_LABELS[s as TableStatus] || s
}
function statusColor(s: string) {
  return STATUS_COLORS[s as TableStatus] || 'gray'
}
function sensitivityLabel(s: string) {
  return SENSITIVITY_LABELS[s as Sensitivity] || s
}
function sensitivityColor(s: string) {
  return SENSITIVITY_COLORS[s as Sensitivity] || 'gray'
}

const columns = [
  { title: '表名', dataIndex: 'name', slotName: 'name', width: 230 },
  { title: '中文名', dataIndex: 'cnName', width: 160, ellipsis: true, tooltip: true },
  { title: '业务系统 / 来源', dataIndex: 'sourceSystem', width: 190, ellipsis: true, tooltip: true },
  { title: '存储', dataIndex: 'storage', width: 90 },
  { title: '提交人', dataIndex: 'submittedBy', slotName: 'submitter', width: 110 },
  { title: '提交时间', dataIndex: 'submittedAt', slotName: 'submitTime', width: 160 },
  { title: '状态', dataIndex: 'status', slotName: 'status', width: 130 },
  { title: '操作', slotName: 'actions', width: 140, fixed: 'right' as const }
]

// ---------------- 展开行明细（检查项 + 质量五维） ----------------

function checksOf(row: any): ReviewCheck[] {
  const checks: ReviewCheck[] = row && row.reviewInfo ? row.reviewInfo.checks || [] : []
  return checks
}
function rejectReasonOf(row: any): string {
  return row && row.reviewInfo && row.reviewInfo.rejectReason ? row.reviewInfo.rejectReason : ''
}
function hasSoftHint(row: any): boolean {
  return checksOf(row).some(c => !c.hard && !c.passed)
}
function qualityDimsOf(row: any): Array<{ key: string; label: string; value: number }> {
  const dims: QualityDims = row && row.quality ? row.quality : { completeness: 0, accuracy: 0, consistency: 0, timeliness: 0, uniqueness: 0 }
  return (Object.keys(QUALITY_DIM_LABELS) as Array<keyof QualityDims>).map(k => ({
    key: k as string,
    label: QUALITY_DIM_LABELS[k],
    value: dims[k]
  }))
}

// ---------------- 多选与批量通过 ----------------

const selectedKeys = ref<string[]>([])

const rowSelection = computed(() => ({
  type: 'checkbox' as const,
  showCheckedAll: true,
  selectedRowKeys: selectedKeys.value
}))

function handleSelectionChange(keys: (string | number)[]) {
  selectedKeys.value = keys.map(k => String(k))
}

/** 队列变化（通过/驳回后行消失）时同步剔除已不存在的选中项 */
watch(queue, list => {
  const alive = new Set(list.map(t => t.tableId))
  selectedKeys.value = selectedKeys.value.filter(id => alive.has(id))
})

function selectAllFiltered() {
  if (!filtered.value.length) {
    Message.info('当前筛选结果为空')
    return
  }
  selectedKeys.value = filtered.value.map(t => t.tableId)
  Message.success(`已选中当前筛选结果的 ${selectedKeys.value.length} 张表`)
}

function scopeText(count: number): string {
  const coveringFiltered = filtered.value.length > 0 && count === filtered.value.length
  const noFilter = !filterSource.value && !filterStorage.value
  if (coveringFiltered && noFilter) return `将批量通过当前筛选结果（全部待审核）的 ${count} 张表`
  if (coveringFiltered) return `将批量通过当前筛选结果的 ${count} 张表`
  return `将批量通过已选中的 ${count} 张表（当前筛选结果共 ${filtered.value.length} 张）`
}

function handleBatchApprove() {
  const ids = [...selectedKeys.value]
  if (!ids.length) {
    Message.info('请先勾选要通过的申请')
    return
  }
  Modal.confirm({
    title: '批量审核通过',
    content: `${scopeText(ids.length)}。通过后各表进入已上线状态并在统一搜索可见，store 内部会为每张表 notify 一条站内通知给提交人。确认继续？`,
    okText: `确认通过 ${ids.length} 张`,
    cancelText: '取消',
    onOk: () => {
      const res = TableCatalogStore.batchApprove(ids, actor.value)
      selectedKeys.value = []
      const text = `批量审核完成：成功 ${res.success} 张${res.failed ? `、失败 ${res.failed} 张（已不在审核中）` : ''}`
      res.failed ? Message.warning(text) : Message.success(text)
    }
  })
}

// ---------------- 单条通过 / 驳回 ----------------

function submittedBy(row: any): string {
  return row && row.reviewInfo && row.reviewInfo.submittedBy ? row.reviewInfo.submittedBy : row.owner
}

function confirmApprove(row: any) {
  const tableId: string = String(row.tableId)
  const soft = checksOf(row).filter(c => !c.hard && !c.passed)
  Modal.confirm({
    title: '确认审核通过？',
    content:
      `表「${row.name}（${row.cnName}）」通过后即进入已上线状态，统一搜索可检索。store 内部已 notify 已产生通知：会给提交人 ${submittedBy(row)} 推送一条「上线审核已通过」站内通知。` +
      (soft.length ? `注意：本次存在 ${soft.length} 项软性提示（${soft.map(c => c.name).join('、')}），不拦截上线。` : ''),
    okText: '确认通过',
    cancelText: '再想想',
    onOk: () => {
      const res = TableCatalogStore.approve(tableId, actor.value)
      res.ok ? Message.success(`${res.message} · 已产生站内通知给 ${submittedBy(row)}`) : Message.error(res.message)
    }
  })
}

const rejectVisible = ref(false)
const rejecting = ref(false)
const rejectFormRef = ref<FormInstance>()
const rejectForm = reactive({ reason: '' })
const rejectTarget = reactive({ tableId: '', name: '', cnName: '', submittedBy: '', submittedAt: '', failedText: '' })

const QUICK_REASONS = [
  '血缘未登记，影响面无法评估',
  '质量分未达 60 分基线',
  '高敏字段未配置权限策略',
  '字段注释缺失，口径不清',
  '与已上线表口径重复，需合并'
]

function openReject(row: any) {
  rejectTarget.tableId = String(row.tableId)
  rejectTarget.name = row.name
  rejectTarget.cnName = row.cnName
  rejectTarget.submittedBy = submittedBy(row)
  rejectTarget.submittedAt = row.reviewInfo ? row.reviewInfo.submittedAt : ''
  const failed = checksOf(row).filter(c => !c.passed)
  rejectTarget.failedText = failed.length ? failed.map(c => `${c.name}（${c.hard ? '硬性' : '软性'}）`).join('、') : ''
  rejectForm.reason = ''
  rejectVisible.value = true
}

function useQuickReason(reason: string) {
  rejectForm.reason = rejectForm.reason ? `${rejectForm.reason}；${reason}` : reason
}

async function doReject() {
  const errors = await rejectFormRef.value?.validate()
  if (errors) return
  rejecting.value = true
  const res = TableCatalogStore.reject(rejectTarget.tableId, rejectForm.reason.trim(), actor.value)
  rejecting.value = false
  if (res.ok) {
    Message.success(res.message)
    rejectVisible.value = false
  } else {
    Message.error(res.message)
  }
}

// ---------------- 页面级动作 ----------------

function goPool() {
  router.push('/management/lifecycle/pending')
}

function confirmReset() {
  Modal.confirm({
    title: '重置演示数据',
    content: '将清空本地持久化并回到种子状态：本次演示中的通过、驳回、批量审核结果全部丢失。确认继续？',
    okText: '确认重置',
    cancelText: '取消',
    onOk: () => {
      TableCatalogStore.resetTableCatalog()
      clearFilters()
      selectedKeys.value = []
      rejectVisible.value = false
      Message.success('演示数据已重置为初始种子状态')
    }
  })
}
</script>

<style lang="scss" scoped>
.content-wrapper {
  padding: 0 24px 24px;
}
.role-alert {
  margin-bottom: 12px;
}
.summary-card {
  margin-bottom: 12px;
  :deep(.arco-statistic) {
    display: inline-flex;
    align-items: baseline;
    gap: 8px;
  }
  :deep(.arco-statistic-title) {
    font-size: 13px;
  }
}
.filter-card {
  margin-bottom: 12px;
}
.tbl-name {
  font-family: 'SFMono-Regular', Consolas, Menlo, monospace;
  font-size: 13px;
  color: #1d2129;
}
.tbl-sub {
  margin-top: 2px;
}
.expand-panel {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  padding: 12px 16px 12px 48px;
  background: #f7f8fa;
}
.expand-col {
  flex: 1 1 380px;
  min-width: 340px;
}
.expand-title {
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #1d2129;
}
.check-item {
  padding: 6px 10px;
  margin-bottom: 6px;
  background: #fff;
  border-radius: 4px;
}
.check-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.check-name {
  font-size: 13px;
  font-weight: 600;
  color: #1d2129;
}
.check-msg {
  margin-top: 2px;
  padding-left: 22px;
  font-size: 12px;
  color: #4e5969;
}
.reject-box {
  margin-top: 8px;
  padding: 8px 10px;
  font-size: 12px;
  color: #f53f3f;
  background: #ffece8;
  border-radius: 4px;
}
.dim-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}
.dim-name {
  width: 56px;
  font-size: 12px;
  color: #4e5969;
}
.dim-val {
  width: 28px;
  font-size: 13px;
  font-weight: 600;
}
.dim-total {
  margin-top: 10px;
  font-size: 12px;
  color: #4e5969;
}
.q-score {
  margin: 0 4px;
  font-size: 15px;
  font-weight: 700;
}
.q-weight {
  margin-left: 4px;
  color: #86909c;
}
.q-ok {
  color: #00b42a;
}
.q-bad {
  color: #f53f3f;
}
.expand-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 10px;
  font-size: 12px;
  color: #86909c;
}
.submit-time {
  font-size: 12px;
  color: #4e5969;
}
.hint-text {
  font-size: 12px;
  color: #86909c;
}
.reject-desc {
  margin-top: 8px;
}
.quick-reasons {
  margin-top: 10px;
}
.quick-label {
  display: block;
  margin-bottom: 6px;
  font-size: 12px;
}
.quick-tag {
  cursor: pointer;
}
.ic-ok {
  color: #00b42a;
}
.ic-bad {
  color: #f53f3f;
}
.ic-warn {
  color: #ff7d00;
}
</style>
