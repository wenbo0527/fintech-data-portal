<template>
  <PageContainer>
    <PageHeader
      title="我的权限申请进度"
      sub-title="表级权限 · 分级驱动四级审批流（挡板演示）"
    >
      <template #extra>
        <a-space wrap>
          <a-select
            v-model="viewer"
            :options="viewerOptions"
            size="small"
            style="width: 190px"
          >
            <template #prefix><icon-user /></template>
          </a-select>
          <a-button @click="goManagement">
            <template #icon><icon-list /></template>
            授权台账
          </a-button>
          <a-button type="primary" @click="goApply">
            <template #icon><icon-plus /></template>
            去申请新权限
          </a-button>
        </a-space>
      </template>
    </PageHeader>

    <div class="content-wrapper">
      <a-alert type="info" show-icon class="page-tip">
        公开表提交即生效；内部表由「域内自动授权」在约 1 秒内开通，本行会显示
        <span class="strong">自动开通中</span> 并实时回显为「已通过」；敏感表等管理员审批、高敏表还需 DBA 二次确认，
        审批留痕可在展开的流转时间线里逐步查看。
      </a-alert>

      <!-- ==================== 概览 ==================== -->
      <a-row :gutter="12" class="stat-row">
        <a-col v-for="s in statCards" :key="s.title" :span="6">
          <div class="stat-card">
            <div class="stat-title">{{ s.title }}</div>
            <div class="stat-value" :class="`tone-${s.tone}`">
              {{ s.value }}<span class="stat-unit"> 项</span>
            </div>
            <div class="stat-desc">{{ s.desc }}</div>
          </div>
        </a-col>
      </a-row>

      <a-card :bordered="false">
        <div class="toolbar">
          <a-space wrap>
            <a-input-search
              v-model="keyword"
              placeholder="搜索单号 / 表名"
              allow-clear
              style="width: 220px"
            />
            <a-select
              v-model="filterStatus"
              :options="statusOptions"
              placeholder="状态"
              allow-clear
              style="width: 130px"
            />
            <a-button :disabled="!keyword && !filterStatus" @click="resetFilter">重置筛选</a-button>
            <span class="toolbar-hint">点击行首箭头展开流转时间线</span>
          </a-space>
        </div>

        <a-table
          :columns="columns"
          :data="filteredRows"
          row-key="id"
          :expandable="{ width: 44 }"
          :pagination="{ pageSize: 8, showTotal: true, sizeCanChange: false }"
          :scroll="{ x: 1240 }"
          size="medium"
        >
          <template #expand-row="{ record }">
            <div class="expand-panel">
              <div class="expand-block">
                <div class="expand-title">当前环节</div>
                <div class="expand-text">{{ stageOf(record) }}</div>
                <div class="expand-title mt">策略留痕</div>
                <div class="expand-text policy-note">{{ record.policyNote }}</div>
                <div class="expand-title mt">授权口径</div>
                <div class="expand-text">
                  {{ scopeLabel(record.scope) }} · 有效期 {{ record.validMonths }} 个月 · 用途
                  {{ purposeLabel(record.purpose) }} ·
                  {{ record.fieldNames.length ? `指定列：${record.fieldNames.join('、')}` : '全表' }}
                </div>
                <div v-if="grantOf(record.id)" class="expand-text grant-line">
                  授权有效期至 {{ grantOf(record.id)?.validUntil }}（{{ grantOf(record.id)?.via }}）
                </div>
                <div v-if="record.approvalComment || record.dbaComment" class="expand-title mt">审批意见</div>
                <div v-if="record.approvalComment" class="expand-text">
                  {{ record.approver }}：{{ record.approvalComment }}
                </div>
                <div v-if="record.dbaComment" class="expand-text">
                  {{ record.dbaConfirmer }}：{{ record.dbaComment }}
                </div>
              </div>
              <div class="expand-block">
                <div class="expand-title">流转时间线</div>
                <a-timeline class="history-timeline">
                  <a-timeline-item v-for="(h, i) in record.history" :key="`${h.ts}-${i}`">
                    <div class="his-head">
                      <span class="his-action">{{ h.action }}</span>
                      <a-tag size="small" :color="statusColor(h.from)">{{ statusLabel(h.from) }}</a-tag>
                      <icon-arrow-right class="his-arrow" />
                      <a-tag size="small" :color="statusColor(h.to)">{{ statusLabel(h.to) }}</a-tag>
                    </div>
                    <div class="his-meta">{{ h.ts }} · {{ h.actor }}</div>
                    <div v-if="h.comment" class="his-comment">意见：{{ h.comment }}</div>
                  </a-timeline-item>
                </a-timeline>
              </div>
            </div>
          </template>

          <template #table="{ record }">
            <div class="cell-cn">{{ record.tableCnName }}</div>
            <div class="cell-en">{{ record.tableName }}</div>
          </template>
          <template #level="{ record }">
            <a-tag size="small" :color="levelColor(record.sensitivity)">
              {{ levelLabel(record.sensitivity) }}
            </a-tag>
          </template>
          <template #flow="{ record }">
            <a-tag size="small" :color="flowTagColor(record.flow)">{{ flowLabel(record.flow) }}</a-tag>
          </template>
          <template #status="{ record }">
            <a-space :size="6">
              <a-tag size="small" :color="statusColor(record.status)">
                {{ statusLabel(record.status) }}
              </a-tag>
              <!-- 域内自动授权：行内 loading，由轮询驱动状态回显 -->
              <a-tag v-if="isAutoOpening(record)" size="small" :color="PERM_STATUS_COLOR.pending" class="auto-tag">
                <icon-loading class="auto-icon" />
                自动开通中
              </a-tag>
            </a-space>
          </template>
          <template #stage="{ record }">
            <div class="cell-cn">{{ stageOf(record) }}</div>
            <div class="cell-en">{{ record.updatedAt }}</div>
          </template>
          <template #actions="{ record }">
            <a-space :size="2">
              <a-button
                v-if="record.status === 'pending' && record.flow !== 'domain_auto'"
                type="text"
                size="small"
                status="warning"
                :loading="busyId === record.id"
                @click="handleWithdraw(record)"
              >
                撤回
              </a-button>
              <a-button
                v-if="record.status === 'draft'"
                type="text"
                size="small"
                :loading="busyId === record.id"
                @click="handleResubmit(record)"
              >
                重新提交
              </a-button>
              <a-button
                v-if="record.status === 'pending' && (record.flow === 'approval' || record.flow === 'approval_dba')"
                type="text"
                size="small"
                @click="goApproval"
              >
                去审批台
              </a-button>
              <a-button
                v-if="record.status === 'rejected' || record.status === 'expired'"
                type="text"
                size="small"
                @click="goApplyTable(record.tableName)"
              >
                重新申请
              </a-button>
              <a-button v-if="record.status === 'approved'" type="text" size="small" @click="goDiscovery">
                去用数
              </a-button>
            </a-space>
          </template>

          <template #empty>
            <a-empty
              :description="`「${viewer}」名下还没有权限申请单，先发起一条即可看到四级审批流的实时回显`"
            >
              <a-space>
                <a-button type="primary" @click="goApply">
                  <template #icon><icon-plus /></template>
                  去申请新权限
                </a-button>
                <a-button @click="switchToSeedViewer">查看演示种子单</a-button>
              </a-space>
            </a-empty>
          </template>
        </a-table>

        <div v-if="isSeedViewerMissing" class="seed-hint">
          提示：演示种子的 7 张申请单挂在业务人名下（王运营 / 张风控 / 陈营销 等），与角色身份不同名，
          所以默认视角下这里可能为空；用右上角「查看身份」下拉可切换查看，或直接发起一条新申请。
        </div>
      </a-card>
    </div>
  </PageContainer>
</template>

<script setup lang="ts">
/**
 * 表级权限 · 我的申请进度
 *
 * 数据源：`@/mock-shared/permission-store`
 *   - 列表 = PermissionStore.myApplies(viewer)（applicant 完全匹配）
 *   - 撤回 = PermissionStore.withdraw(id, actor)（pending → draft）
 *   - 重提 = PermissionStore.resubmit(id, actor)（draft → pending，按 flow 复触发自动分支）
 *   - 生效授权 = PermissionStore.grants() 派生（展示有效期与开通方式）
 *
 * 「自动开通中」轮询：internal 表走 domain_auto，store 内部 1.2s 后置为 approved。
 * 页面用 300ms 定时器读取最新状态并累计等待次数（上限 40 次 ≈ 12s 兜底告警），
 * 一旦该单不再是 domain_auto 的 pending，就从轮询集合中移除并在集合为空时清理定时器。
 */
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Message, Modal } from '@arco-design/web-vue'
import PageContainer from '@/components-dca/common/PageContainer.vue'
import PageHeader from '@/components-dca/common/PageHeader.vue'
import { useRoleStore } from '@/stores-dca/role'
import {
  SENSITIVITY_LABELS,
  SENSITIVITY_COLORS,
  type Sensitivity
} from '@/mock-dca/shared/table-catalog-store'
import {
  PermissionStore,
  PERM_STATUS_LABEL,
  PERM_STATUS_COLOR,
  PERM_SCOPE_LABEL,
  PERM_PURPOSE_LABEL,
  PERM_FLOW_LABEL,
  type PermFlow,
  type PermPurpose,
  type PermScope,
  type PermStatus,
  type PermissionApply
} from '@/mock-shared/permission-store'

const router = useRouter()
const roleStore = useRoleStore()

/** 模拟一次异步耗时（挡板：真实环境是调权限中心接口） */
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

// ---------------- 表格/时间线插槽取值助手 ----------------
// a-table 插槽里的 record（以及 record.history 的元素）会被推断为 any，直接用它索引
// store 导出的 Record<...> 常量会命中 noImplicitAny（TS7053）；用具名形参收窄类型后取值，
// 文案与配色仍然全部来自 store 常量。
const levelColor = (s: Sensitivity) => SENSITIVITY_COLORS[s]
const levelLabel = (s: Sensitivity) => SENSITIVITY_LABELS[s]
const scopeLabel = (s: PermScope) => PERM_SCOPE_LABEL[s]
const purposeLabel = (p: PermPurpose) => PERM_PURPOSE_LABEL[p]
const flowLabel = (f: PermFlow) => PERM_FLOW_LABEL[f]
const statusColor = (s: PermStatus) => PERM_STATUS_COLOR[s]
const statusLabel = (s: PermStatus) => PERM_STATUS_LABEL[s]

// ---------------- 查看身份 ----------------
const roleLabel = computed(() => roleStore.currentRoleDef?.label || '数据工程师')
/** 种子申请人（便于切视角看演示数据） */
const seedApplicants = computed(() => [...new Set(PermissionStore.all().map(a => a.applicant))])
const viewer = ref('')
const viewerOptions = computed(() =>
  [...new Set([roleLabel.value, ...seedApplicants.value])].map(x => ({
    label: x === roleLabel.value ? `我的身份：${x}` : `演示视角：${x}`,
    value: x
  }))
)

// ---------------- 数据 ----------------
const myRows = computed(() => PermissionStore.myApplies(viewer.value))
/** 当前视角名下没有单据（默认角色身份与种子申请人名不同名，属正常现象） */
const isSeedViewerMissing = computed(() => myRows.value.length === 0 && seedApplicants.value.length > 0)

function switchToSeedViewer() {
  const first = seedApplicants.value[0]
  if (first) {
    viewer.value = first
    Message.info(`已切换到演示视角「${first}」，可查看种子申请单的完整流转时间线`)
  } else {
    goApply()
  }
}

const keyword = ref('')
const filterStatus = ref<string>('')
const statusOptions = (Object.keys(PERM_STATUS_LABEL) as PermStatus[]).map(s => ({
  label: PERM_STATUS_LABEL[s],
  value: s
}))

const filteredRows = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return myRows.value.filter(a => {
    if (filterStatus.value && a.status !== filterStatus.value) return false
    if (!kw) return true
    return [a.id, a.tableName, a.tableCnName].some(x => x.toLowerCase().includes(kw))
  })
})

function resetFilter() {
  keyword.value = ''
  filterStatus.value = ''
}

const grantMap = computed(() => {
  const m = new Map<string, { validUntil: string; via: string }>()
  PermissionStore.grants().forEach(g => m.set(g.applyId, { validUntil: g.validUntil, via: g.via }))
  return m
})
function grantOf(applyId: string) {
  return grantMap.value.get(applyId)
}

const statCards = computed(() => {
  const rows = myRows.value
  const doing = rows.filter(a => a.status === 'pending' || a.status === 'dba_confirming').length
  const active = rows.filter(a => a.status === 'approved').length
  const needAction = rows.filter(a => a.status === 'draft' || a.status === 'rejected' || a.status === 'expired').length
  return [
    { title: '我的申请单', value: rows.length, desc: '含全部状态', tone: 'primary' as const },
    { title: '审批中', value: doing, desc: '管理员 / DBA 处理中', tone: 'warning' as const },
    { title: '已生效授权', value: active, desc: '可直接去用数', tone: 'success' as const },
    { title: '需我处理', value: needAction, desc: '草稿 / 被驳回 / 已过期', tone: 'danger' as const }
  ]
})

// ---------------- 当前环节文案 ----------------
function stageOf(a: PermissionApply): string {
  switch (a.status) {
    case 'draft':
      return '已撤回，编辑后可重新提交'
    case 'pending':
      return a.flow === 'domain_auto' ? '域内自动开通中（约 1 秒）' : '等待数据管理员审批'
    case 'dba_confirming':
      return '管理员已通过，等待 DBA 二次确认'
    case 'approved':
      return '权限已生效，可直接访问该表'
    case 'rejected':
      return `已驳回：${a.dbaComment || a.approvalComment || '见审批意见'}`
    case 'expired':
      return '授权已到期或被回收，需重新申请'
    default:
      return '-'
  }
}

/** 审批流标签色：仅复用 store 里的状态色，不自造色值 */
function flowTagColor(flow: PermFlow): string {
  if (flow === 'auto') return PERM_STATUS_COLOR.approved
  if (flow === 'domain_auto') return PERM_STATUS_COLOR.pending
  if (flow === 'approval') return PERM_STATUS_COLOR.dba_confirming
  return PERM_STATUS_COLOR.rejected
}

// ---------------- 自动开通轮询 ----------------
const columns = [
  { title: '单号', dataIndex: 'id', width: 92 },
  { title: '目标表', slotName: 'table', width: 200 },
  { title: '分级', slotName: 'level', width: 96 },
  { title: '审批流', slotName: 'flow', width: 150 },
  { title: '状态', slotName: 'status', width: 190 },
  { title: '当前环节', slotName: 'stage', width: 240 },
  { title: '提交时间', dataIndex: 'createdAt', width: 156 },
  { title: '操作', slotName: 'actions', width: 200, fixed: 'right' as const }
]

function isAutoOpening(a: PermissionApply): boolean {
  return a.status === 'pending' && a.flow === 'domain_auto'
}
/** 各单已轮询的次数（用于「自动开通中 N」提示） */
const autoTicks = reactive<Record<string, number>>({})
/** 等待过久的兜底告警 */
const warned = new Set<string>()
const AUTO_TICK_LIMIT = 40

const autoOpeningIds = computed(() => myRows.value.filter(isAutoOpening).map(a => a.id))

let autoTimer: ReturnType<typeof setInterval> | undefined

function stopAutoPoll() {
  if (autoTimer) {
    clearInterval(autoTimer)
    autoTimer = undefined
  }
}

function startAutoPoll() {
  if (autoTimer) return
  autoTimer = setInterval(() => {
    // 读一次 store：状态变化由响应式自动反映到列表；这里同时做等待计数与超时兜底
    const ids = autoOpeningIds.value
    ids.forEach(id => {
      autoTicks[id] = (autoTicks[id] || 0) + 1
      const cur = PermissionStore.byId(id)
      if (cur && cur.status === 'approved') {
        delete autoTicks[id]
        warned.delete(id)
        Message.success(`「${cur.tableCnName}（${cur.tableName}）」已由域内自动授权开通`)
        return
      }
      if (autoTicks[id] > AUTO_TICK_LIMIT && !warned.has(id)) {
        warned.add(id)
        delete autoTicks[id]
        Message.warning(`单号 ${id} 自动开通超时，已转人工审批，请到「审批台」查看`)
      }
    })
  }, 300)
}

watch(
  autoOpeningIds,
  ids => {
    if (ids.length) startAutoPoll()
    else stopAutoPoll()
    Object.keys(autoTicks).forEach(id => {
      if (!ids.includes(id)) delete autoTicks[id]
    })
  },
  { immediate: true }
)

// ---------------- 行操作 ----------------
const busyId = ref('')

function handleWithdraw(a: PermissionApply) {
  Modal.confirm({
    title: '撤回申请',
    content: `确认撤回单号 ${a.id}（${a.tableCnName}）？撤回后变为草稿，可修改后重新提交。`,
    okText: '确认撤回',
    cancelText: '取消',
    onOk: async () => {
      busyId.value = a.id
      await sleep(450)
      try {
        PermissionStore.withdraw(a.id, viewer.value)
        Message.warning(`已撤回单号 ${a.id}，可在本行点「重新提交」再次发起`)
      } catch (e) {
        Message.error((e as Error).message || '撤回失败')
      } finally {
        busyId.value = ''
      }
    }
  })
}

async function handleResubmit(a: PermissionApply) {
  busyId.value = a.id
  await sleep(500)
  try {
    const r = PermissionStore.resubmit(a.id, viewer.value)
    if (r.flow === 'auto') Message.success(`单号 ${r.id} 已重新提交并自动放行`)
    else if (r.flow === 'domain_auto') Message.info(`单号 ${r.id} 已重新提交，域内自动授权开通中…`)
    else if (r.flow === 'approval_dba') Message.info(`单号 ${r.id} 已重新提交，需管理员 + DBA 双审`)
    else Message.info(`单号 ${r.id} 已重新提交，等待数据管理员审批`)
  } catch (e) {
    Message.error((e as Error).message || '重新提交失败')
  } finally {
    busyId.value = ''
  }
}

onMounted(() => {
  roleStore.initFromStorage()
  viewer.value = roleLabel.value
})

// 角色切换时回到「我的身份」视角
watch(roleLabel, v => {
  viewer.value = v
})

onUnmounted(stopAutoPoll)

// ---------------- 跳转 ----------------
function goApply() {
  router.push('/management/permission/data-permission/apply')
}
function goApplyTable(tableName: string) {
  router.push({ path: '/management/permission/data-permission/apply', query: { table: tableName } })
}
function goApproval() {
  router.push('/management/permission/data-permission/approval')
}
function goManagement() {
  router.push('/management/permission/data-permission/management')
}
function goDiscovery() {
  router.push('/discovery')
}
</script>

<style lang="scss" scoped>
/* 页面背景/高度/最大宽度由 PageContainer 提供 */
.content-wrapper {
  padding: 0 24px 24px;
}
.page-tip {
  margin-bottom: 12px;
}
.strong {
  font-weight: 600;
  color: var(--dca-brand-primary, #165dff);
}
.stat-row {
  margin-bottom: 12px;
}
.stat-card {
  padding: 12px 14px;
  background: var(--dca-bg-card, #fff);
  border: 1px solid var(--dca-border-default, #e5e6eb);
  border-radius: var(--dca-radius-lg, 8px);
}
.stat-title {
  font-size: 12px;
  color: var(--dca-text-secondary, #4e5969);
}
.stat-value {
  margin-top: 4px;
  font-size: 24px;
  font-weight: 600;
  line-height: 1.2;
}
.stat-unit {
  font-size: 12px;
  font-weight: 400;
  color: var(--dca-text-tertiary, #86909c);
}
.tone-primary {
  color: var(--dca-brand-primary, #165dff);
}
.tone-success {
  color: var(--dca-success, #00b42a);
}
.tone-warning {
  color: var(--dca-warning, #ff7d00);
}
.tone-danger {
  color: var(--dca-danger, #f53f3f);
}
.stat-desc {
  margin-top: 2px;
  font-size: 12px;
  color: var(--dca-text-tertiary, #86909c);
}
.toolbar {
  margin-bottom: 12px;
}
.toolbar-hint {
  font-size: 12px;
  color: var(--dca-text-tertiary, #86909c);
}
.cell-cn {
  font-size: 13px;
  color: var(--dca-text-primary, #1d2129);
}
.cell-en {
  font-family: 'SFMono-Regular', Consolas, Menlo, monospace;
  font-size: 12px;
  color: var(--dca-text-tertiary, #86909c);
}
.auto-tag {
  :deep(.arco-tag-content) {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
}
.auto-icon {
  font-size: 12px;
}
.seed-hint {
  margin-top: 10px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--dca-text-tertiary, #86909c);
}
.expand-panel {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  padding: 4px 8px 8px 48px;
}
.expand-block {
  flex: 1 1 320px;
  min-width: 300px;
}
.expand-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--dca-text-secondary, #4e5969);
}
.expand-title.mt {
  margin-top: 10px;
}
.expand-text {
  margin-top: 4px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--dca-text-primary, #1d2129);
}
.policy-note {
  font-size: 12px;
  color: var(--dca-text-secondary, #4e5969);
}
.grant-line {
  font-size: 12px;
  color: var(--dca-success, #00b42a);
}
.history-timeline {
  margin-top: 6px;
  padding-left: 4px;
}
.his-head {
  display: flex;
  align-items: center;
  gap: 6px;
}
.his-action {
  font-size: 13px;
  font-weight: 600;
  color: var(--dca-text-primary, #1d2129);
}
.his-arrow {
  font-size: 12px;
  color: var(--dca-text-tertiary, #86909c);
}
.his-meta {
  margin-top: 2px;
  font-size: 12px;
  color: var(--dca-text-tertiary, #86909c);
}
.his-comment {
  margin-top: 4px;
  font-size: 12px;
  color: var(--dca-text-secondary, #4e5969);
}
</style>
