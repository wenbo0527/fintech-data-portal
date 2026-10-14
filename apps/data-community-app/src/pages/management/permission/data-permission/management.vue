<template>
  <PageContainer>
    <PageHeader
      title="表级权限·授权台账"
      sub-title="表级权限 · 分级驱动四级审批流（挡板演示）"
    >
      <template #extra>
        <a-space wrap>
          <a-tag :color="roleColor">当前身份：{{ roleLabel }}</a-tag>
          <a-button @click="goApply">
            <template #icon><icon-plus /></template>
            发起申请
          </a-button>
          <a-button @click="goApproval">
            <template #icon><icon-safe /></template>
            去审批{{ pendingTotal ? `（${pendingTotal}）` : '' }}
          </a-button>
          <a-button @click="goProgress">
            <template #icon><icon-clock-circle /></template>
            我的进度
          </a-button>
          <a-button status="warning" @click="confirmReset">
            <template #icon><icon-refresh /></template>
            重置演示数据
          </a-button>
        </a-space>
      </template>
    </PageHeader>

    <div class="content-wrapper">
      <!-- ==================== 概览统计卡 ==================== -->
      <a-row :gutter="12" class="stat-row">
        <a-col v-for="s in statCards" :key="s.title" :span="6">
          <div class="stat-card">
            <div class="stat-title">{{ s.title }}</div>
            <div class="stat-value" :class="`tone-${s.tone}`">
              {{ s.value }}<span class="stat-unit">{{ s.unit }}</span>
            </div>
            <div class="stat-desc">{{ s.desc }}</div>
          </div>
        </a-col>
      </a-row>

      <a-alert type="info" show-icon class="page-tip">
        授权台账是「已通过」申请单的派生视图：一条通过的申请 = 一条有效授权。
        点「回收权限」会把对应申请单置为「已过期」，台账随即消失，申请人需重新提交申请。
      </a-alert>

      <a-card :bordered="false">
        <a-tabs v-model:active-key="activeTab" size="large">
          <!-- ==================== 授权台账 ==================== -->
          <a-tab-pane key="grants" :title="`授权台账（${grantRows.length}）`">
            <div class="toolbar">
              <a-space wrap>
                <a-input-search
                  v-model="gKeyword"
                  placeholder="搜索授权对象 / 表名 / 单号"
                  allow-clear
                  style="width: 240px"
                />
                <a-select
                  v-model="gLevel"
                  :options="grantLevelOptions"
                  placeholder="表分级"
                  allow-clear
                  style="width: 130px"
                />
                <a-checkbox v-model="gSoonOnly">仅看 30 天内到期</a-checkbox>
                <a-button :disabled="!gKeyword && !gLevel && !gSoonOnly" @click="resetGrantFilter">
                  重置筛选
                </a-button>
                <span class="toolbar-hint">
                  高敏（红标）授权均由「管理员 + DBA 双审」开通，回收前请先与 DBA 对齐
                </span>
              </a-space>
            </div>

            <a-table
              :columns="grantColumns"
              :data="filteredGrants"
              row-key="applyId"
              :pagination="{ pageSize: 8, showTotal: true, sizeCanChange: false }"
              :scroll="{ x: 1220 }"
              size="medium"
            >
              <template #grantee="{ record }">
                <div class="cell-cn">{{ record.grantee }}</div>
                <div class="cell-en">{{ record.granteeDept }}</div>
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
              <template #grantScope="{ record }">
                <a-tag size="small" :color="record.scope === 'write' ? 'red' : 'gray'">
                  {{ scopeLabel(record.scope) }}
                </a-tag>
                <span class="cell-sub">
                  {{ record.fieldNames.length ? `指定 ${record.fieldNames.length} 列` : '全表' }}
                </span>
              </template>
              <template #via="{ record }">
                <a-tag size="small">{{ record.via }}</a-tag>
              </template>
              <template #validUntil="{ record }">
                <div class="cell-cn">{{ record.validUntil }}</div>
                <div v-if="daysLeft(record.validUntil) !== null" class="cell-en">
                  剩余 {{ daysLeft(record.validUntil) }} 天
                </div>
              </template>
              <template #actions="{ record }">
                <a-space :size="2">
                  <a-button type="text" size="small" @click="openDetail(record.applyId)">溯源单号</a-button>
                  <a-button
                    type="text"
                    size="small"
                    status="danger"
                    :loading="revokingId === record.applyId"
                    @click="handleRevoke(record)"
                  >
                    回收权限
                  </a-button>
                </a-space>
              </template>

              <template #empty>
                <a-empty description="没有符合条件的有效授权（公开表走自动放行、内部表走域内自动，也会出现在这里）">
                  <a-button type="primary" @click="goApply">
                    <template #icon><icon-plus /></template>
                    去申请表权限
                  </a-button>
                </a-empty>
              </template>
            </a-table>

            <!-- 按表授权分布（grantCountByTable 派生） -->
            <div class="dist-box">
              <div class="dist-head">按表授权分布</div>
              <div v-if="tableDist.length" class="dist-list">
                <div v-for="d in tableDist" :key="d.tableName" class="dist-item">
                  <div class="dist-line">
                    <span class="cell-cn">{{ d.tableCnName }}</span>
                    <a-tag size="small" :color="SENSITIVITY_COLORS[d.sensitivity]">
                      {{ SENSITIVITY_LABELS[d.sensitivity] }}
                    </a-tag>
                    <span class="dist-count">{{ d.grantees }} 人</span>
                  </div>
                  <a-progress
                    :percent="d.grantees / maxGrantees"
                    :show-text="false"
                    size="small"
                  />
                  <div class="cell-en">{{ d.tableName }}</div>
                </div>
              </div>
              <div v-else class="dist-empty">暂无授权，去「发起申请」走一遍审批流即可看到分布</div>
            </div>
          </a-tab-pane>

          <!-- ==================== 全部申请单 ==================== -->
          <a-tab-pane key="applies" :title="`全部申请单（${applyList.length}）`">
            <div class="toolbar">
              <a-space wrap>
                <a-input-search
                  v-model="aKeyword"
                  placeholder="搜索单号 / 表名 / 申请人"
                  allow-clear
                  style="width: 230px"
                />
                <a-select
                  v-model="aStatus"
                  :options="statusOptions"
                  placeholder="状态"
                  allow-clear
                  style="width: 128px"
                />
                <a-select
                  v-model="aFlow"
                  :options="flowOptions"
                  placeholder="审批流"
                  allow-clear
                  style="width: 158px"
                />
                <a-select
                  v-model="aPurpose"
                  :options="purposeOptions"
                  placeholder="用途"
                  allow-clear
                  style="width: 128px"
                />
                <a-button :disabled="!aKeyword && !aStatus && !aFlow && !aPurpose" @click="resetApplyFilter">
                  重置筛选
                </a-button>
                <span class="toolbar-hint">
                  按最后更新时间倒序；点击「详情」查看四级审批流转留痕
                </span>
              </a-space>
            </div>

            <a-table
              :columns="applyColumns"
              :data="filteredApplies"
              row-key="id"
              :pagination="{ pageSize: 8, showTotal: true, sizeCanChange: false }"
              :scroll="{ x: 1280 }"
              size="medium"
            >
              <template #table="{ record }">
                <div class="cell-cn">{{ record.tableCnName }}</div>
                <div class="cell-en">{{ record.tableName }}</div>
              </template>
              <template #level="{ record }">
                <a-tag size="small" :color="levelColor(record.sensitivity)">
                  {{ levelLabel(record.sensitivity) }}
                </a-tag>
              </template>
              <template #applicant="{ record }">
                <div class="cell-cn">{{ record.applicant }}</div>
                <div class="cell-en">{{ record.applicantDept }}</div>
              </template>
              <template #grantScope="{ record }">
                <a-tag size="small" :color="record.scope === 'write' ? 'red' : 'gray'">
                  {{ scopeLabel(record.scope) }}
                </a-tag>
                <span class="cell-sub">
                  {{ record.fieldNames.length ? `指定 ${record.fieldNames.length} 列` : '全表' }} ·
                  {{ record.validMonths }} 个月
                </span>
              </template>
              <template #flow="{ record }">
                <a-tag size="small" :color="flowTagColor(record.flow)">{{ flowLabel(record.flow) }}</a-tag>
              </template>
              <template #status="{ record }">
                <a-tag size="small" :color="statusColor(record.status)">
                  {{ statusLabel(record.status) }}
                </a-tag>
              </template>
              <template #actions="{ record }">
                <a-button type="text" size="small" @click="openDetail(record.id)">详情</a-button>
              </template>

              <template #empty>
                <a-empty description="没有符合筛选条件的申请单">
                  <a-space>
                    <a-button @click="resetApplyFilter">清空筛选</a-button>
                    <a-button type="primary" @click="goApply">
                      <template #icon><icon-plus /></template>
                      发起新申请
                    </a-button>
                  </a-space>
                </a-empty>
              </template>
            </a-table>
          </a-tab-pane>
        </a-tabs>
      </a-card>
    </div>

    <!-- ==================== 申请单详情抽屉（含流转时间线） ==================== -->
    <a-drawer
      v-model:visible="detailVisible"
      :title="current ? `申请详情 · ${current.id}` : '申请详情'"
      :width="680"
      :footer="false"
      unmount-on-close
    >
      <template v-if="current">
        <a-descriptions :column="2" bordered size="medium" class="detail-desc">
          <a-descriptions-item label="单号">{{ current.id }}</a-descriptions-item>
          <a-descriptions-item label="当前状态">
            <a-tag size="small" :color="PERM_STATUS_COLOR[current.status]">
              {{ PERM_STATUS_LABEL[current.status] }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="申请人">{{ current.applicant }}</a-descriptions-item>
          <a-descriptions-item label="申请部门">{{ current.applicantDept }}</a-descriptions-item>
          <a-descriptions-item label="目标表" :span="2">
            {{ current.tableCnName }}
            <span class="mono">{{ current.tableName }}</span>
          </a-descriptions-item>
          <a-descriptions-item label="数据分级">
            <a-tag size="small" :color="SENSITIVITY_COLORS[current.sensitivity]">
              {{ SENSITIVITY_LABELS[current.sensitivity] }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="审批流">
            <a-tag size="small" :color="flowTagColor(current.flow)">{{ PERM_FLOW_LABEL[current.flow] }}</a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="授权口径" :span="2">
            {{ PERM_SCOPE_LABEL[current.scope] }} · 有效期 {{ current.validMonths }} 个月 · 用途
            {{ PERM_PURPOSE_LABEL[current.purpose] }}
          </a-descriptions-item>
          <a-descriptions-item label="指定列" :span="2">
            <template v-if="current.fieldNames.length">
              <a-tag v-for="fd in current.fieldNames" :key="fd" size="small" class="field-tag">{{ fd }}</a-tag>
            </template>
            <span v-else class="muted">全表（未限定字段）</span>
          </a-descriptions-item>
          <a-descriptions-item label="申请理由" :span="2">{{ current.reason || '（未填写）' }}</a-descriptions-item>
          <a-descriptions-item label="策略留痕" :span="2">
            <span class="policy-note">{{ current.policyNote }}</span>
          </a-descriptions-item>
          <a-descriptions-item label="管理员">{{ current.approver || '-' }}</a-descriptions-item>
          <a-descriptions-item label="管理员意见">{{ current.approvalComment || '-' }}</a-descriptions-item>
          <a-descriptions-item label="DBA 确认人">{{ current.dbaConfirmer || '-' }}</a-descriptions-item>
          <a-descriptions-item label="DBA 意见">{{ current.dbaComment || '-' }}</a-descriptions-item>
          <a-descriptions-item label="提交时间">{{ current.createdAt }}</a-descriptions-item>
          <a-descriptions-item label="最后更新">{{ current.updatedAt }}</a-descriptions-item>
          <a-descriptions-item label="开通时间" :span="2">
            {{ current.approvedAt || '-' }}
            <span v-if="currentGrant" class="muted">
              （有效期至 {{ currentGrant.validUntil }}）
            </span>
          </a-descriptions-item>
        </a-descriptions>

        <div class="section-title">流转历史</div>
        <a-timeline class="history-timeline">
          <a-timeline-item v-for="(h, i) in current.history" :key="`${h.ts}-${i}`">
            <div class="his-head">
              <span class="his-action">{{ h.action }}</span>
              <a-tag size="small" :color="PERM_STATUS_COLOR[h.from]">{{ PERM_STATUS_LABEL[h.from] }}</a-tag>
              <icon-arrow-right class="his-arrow" />
              <a-tag size="small" :color="PERM_STATUS_COLOR[h.to]">{{ PERM_STATUS_LABEL[h.to] }}</a-tag>
            </div>
            <div class="his-meta">{{ h.ts }} · {{ h.actor }}</div>
            <div v-if="h.comment" class="his-comment">意见：{{ h.comment }}</div>
          </a-timeline-item>
        </a-timeline>

        <div class="drawer-actions">
          <a-space>
            <a-button
              v-if="current.status === 'approved'"
              status="danger"
              :loading="revokingId === current.id"
              @click="handleRevokeById(current.id)"
            >
              回收该授权
            </a-button>
            <a-button @click="detailVisible = false">关闭</a-button>
          </a-space>
        </div>
      </template>
    </a-drawer>
  </PageContainer>
</template>

<script setup lang="ts">
/**
 * 表级权限 · 授权台账与申请管理
 *
 * 数据源：`@/mock-shared/permission-store`（纯前端挡板，localStorage 持久化）
 *   - 授权台账 = PermissionStore.grants()（由 status==='approved' 的申请单派生，含 validUntil / via）
 *   - 全部申请单 = PermissionStore.manageList()（按 updatedAt 倒序）
 *   - 按表分布 = PermissionStore.grantCountByTable()
 *   - 回收权限 = PermissionStore.expire(applyId)（approved → expired，写 history）
 *   - 重置演示数据 = PermissionStore.reset()
 *
 * 页面只做展示与调用，不自造状态机；状态/分级配色一律取 store 与 table-catalog-store 导出的常量。
 */
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Message, Modal } from '@arco-design/web-vue'
import PageContainer from '@/components-dca/common/PageContainer.vue'
import PageHeader from '@/components-dca/common/PageHeader.vue'
import { useRoleStore } from '@/stores-dca/role'
import { SENSITIVITY_LABELS, SENSITIVITY_COLORS, type Sensitivity } from '@/mock-dca/shared/table-catalog-store'
import {
  PermissionStore,
  PERM_STATUS_LABEL,
  PERM_STATUS_COLOR,
  PERM_SCOPE_LABEL,
  PERM_FLOW_LABEL,
  PERM_PURPOSE_LABEL,
  type PermFlow,
  type PermGrant,
  type PermPurpose,
  type PermScope,
  type PermStatus
} from '@/mock-shared/permission-store'

const router = useRouter()
const roleStore = useRoleStore()

/** 模拟一次异步耗时（挡板：真实环境是调权限中心接口） */
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

// ---------------- 表格插槽取值助手 ----------------
// a-table 插槽里的 record 会被推断为 any，直接用它索引 store 导出的 Record<...> 常量
// 会命中 noImplicitAny（TS7053）；用具名形参收窄类型后取值，文案与配色仍全部来自 store 常量。
const levelColor = (s: Sensitivity) => SENSITIVITY_COLORS[s]
const levelLabel = (s: Sensitivity) => SENSITIVITY_LABELS[s]
const scopeLabel = (s: PermScope) => PERM_SCOPE_LABEL[s]
const flowLabel = (f: PermFlow) => PERM_FLOW_LABEL[f]
const statusColor = (s: PermStatus) => PERM_STATUS_COLOR[s]
const statusLabel = (s: PermStatus) => PERM_STATUS_LABEL[s]

// ---------------- 演示身份 ----------------
const roleLabel = computed(() => roleStore.currentRoleDef?.label || '数据工程师')
const roleColor = computed(() => roleStore.currentRoleDef?.color || '#165dff')

const activeTab = ref<'grants' | 'applies'>('grants')

// ---------------- 概览统计 ----------------
const allApplies = computed(() => PermissionStore.all())
const applyList = computed(() => PermissionStore.manageList())
const grantRows = computed(() => PermissionStore.grants())
const tableDist = computed(() =>
  [...PermissionStore.grantCountByTable()].sort((a, b) => b.grantees - a.grantees)
)
const maxGrantees = computed(() => tableDist.value.reduce((m, d) => Math.max(m, d.grantees), 1))

const pendingAdmin = computed(() => PermissionStore.pendingForAdmin().length)
const pendingDba = computed(() => PermissionStore.pendingForDba().length)
const pendingTotal = computed(() => pendingAdmin.value + pendingDba.value)

const statCards = computed(() => [
  {
    title: '累计申请单',
    value: allApplies.value.length,
    unit: ' 张',
    desc: '覆盖四级审批流全部分支',
    tone: 'primary' as const
  },
  {
    title: '有效授权',
    value: grantRows.value.length,
    unit: ' 条',
    desc: `覆盖 ${tableDist.value.length} 张数据表`,
    tone: 'success' as const
  },
  {
    title: '待人工处理',
    value: pendingTotal.value,
    unit: ' 张',
    desc: `管理员 ${pendingAdmin.value} · DBA 二次确认 ${pendingDba.value}`,
    tone: 'warning' as const
  },
  {
    title: '已回收 / 到期',
    value: allApplies.value.filter(a => a.status === 'expired').length,
    unit: ' 张',
    desc: '到期或被管理员回收，需重新申请',
    tone: 'danger' as const
  }
])

// ---------------- 授权台账 ----------------
const grantColumns = [
  { title: '授权对象', slotName: 'grantee', width: 130 },
  { title: '目标表', slotName: 'table', width: 200 },
  { title: '分级', slotName: 'level', width: 96 },
  { title: '授权口径', slotName: 'grantScope', width: 170 },
  { title: '开通方式', slotName: 'via', width: 130 },
  { title: '授权时间', dataIndex: 'grantedAt', width: 156 },
  { title: '到期时间', slotName: 'validUntil', width: 160 },
  { title: '操作', slotName: 'actions', width: 168, fixed: 'right' as const }
]

const gKeyword = ref('')
const gLevel = ref<string>('')
const gSoonOnly = ref(false)

const grantLevelOptions = computed(() => {
  const set = new Set(grantRows.value.map(g => g.sensitivity))
  return (['public', 'internal', 'sensitive', 'restricted'] as Sensitivity[])
    .filter(s => set.has(s))
    .map(s => ({ label: SENSITIVITY_LABELS[s], value: s }))
})

const filteredGrants = computed(() => {
  const kw = gKeyword.value.trim().toLowerCase()
  return grantRows.value.filter(g => {
    if (gLevel.value && g.sensitivity !== gLevel.value) return false
    if (gSoonOnly.value) {
      const left = daysLeft(g.validUntil)
      if (left === null || left > 30) return false
    }
    if (!kw) return true
    return [g.applyId, g.tableName, g.tableCnName, g.grantee, g.granteeDept].some(x =>
      x.toLowerCase().includes(kw)
    )
  })
})

function resetGrantFilter() {
  gKeyword.value = ''
  gLevel.value = ''
  gSoonOnly.value = false
}

/** 到期剩余天数；「长期」或无法解析时返回 null */
function daysLeft(validUntil: string): number | null {
  if (!validUntil || validUntil === '长期') return null
  const t = new Date(validUntil.replace(' ', 'T')).getTime()
  if (Number.isNaN(t)) return null
  return Math.ceil((t - Date.now()) / 86400000)
}

const revokingId = ref('')

async function doRevoke(g: PermGrant) {
  revokingId.value = g.applyId
  await sleep(500)
  try {
    PermissionStore.expire(g.applyId)
    Message.warning(
      `已回收「${g.grantee}」在「${g.tableCnName}（${g.tableName}）」上的 ${PERM_SCOPE_LABEL[g.scope]} 授权`
    )
  } catch (e) {
    Message.error((e as Error).message || '回收失败')
  } finally {
    revokingId.value = ''
  }
}

function handleRevoke(g: PermGrant) {
  Modal.confirm({
    title: '回收权限',
    content: `确认回收「${g.grantee}」在「${g.tableCnName}（${g.tableName}）」上的${PERM_SCOPE_LABEL[g.scope]}授权？` +
      `申请单 ${g.applyId} 将置为「已过期」，申请人需重新提交。`,
    okText: '确认回收',
    cancelText: '取消',
    onOk: () => doRevoke(g)
  })
}

function handleRevokeById(applyId: string) {
  const g = grantRows.value.find(x => x.applyId === applyId)
  if (g) handleRevoke(g)
}

// ---------------- 全部申请单 ----------------
const applyColumns = [
  { title: '单号', dataIndex: 'id', width: 92 },
  { title: '目标表', slotName: 'table', width: 200 },
  { title: '分级', slotName: 'level', width: 96 },
  { title: '申请人', slotName: 'applicant', width: 130 },
  { title: '授权口径', slotName: 'grantScope', width: 210 },
  { title: '审批流', slotName: 'flow', width: 150 },
  { title: '状态', slotName: 'status', width: 112 },
  { title: '提交时间', dataIndex: 'createdAt', width: 156 },
  { title: '最后更新', dataIndex: 'updatedAt', width: 156 },
  { title: '操作', slotName: 'actions', width: 84, fixed: 'right' as const }
]

const aKeyword = ref('')
const aStatus = ref<string>('')
const aFlow = ref<string>('')
const aPurpose = ref<string>('')

/** store 未导出状态枚举数组，用 label 常量反推筛选项 */
const statusOptions = (Object.keys(PERM_STATUS_LABEL) as PermStatus[]).map(s => ({
  label: PERM_STATUS_LABEL[s],
  value: s
}))
const flowOptions = (Object.keys(PERM_FLOW_LABEL) as PermFlow[]).map(f => ({
  label: PERM_FLOW_LABEL[f],
  value: f
}))
const purposeOptions = (Object.keys(PERM_PURPOSE_LABEL) as PermPurpose[]).map(p => ({
  label: PERM_PURPOSE_LABEL[p],
  value: p
}))

const filteredApplies = computed(() => {
  const kw = aKeyword.value.trim().toLowerCase()
  return applyList.value.filter(a => {
    if (aStatus.value && a.status !== aStatus.value) return false
    if (aFlow.value && a.flow !== aFlow.value) return false
    if (aPurpose.value && a.purpose !== aPurpose.value) return false
    if (!kw) return true
    return [a.id, a.tableName, a.tableCnName, a.applicant, a.applicantDept].some(x =>
      x.toLowerCase().includes(kw)
    )
  })
})

function resetApplyFilter() {
  aKeyword.value = ''
  aStatus.value = ''
  aFlow.value = ''
  aPurpose.value = ''
}

/** 审批流标签色：仅复用 store 里的状态色，不自造色值 */
function flowTagColor(flow: PermFlow): string {
  if (flow === 'auto') return PERM_STATUS_COLOR.approved
  if (flow === 'domain_auto') return PERM_STATUS_COLOR.pending
  if (flow === 'approval') return PERM_STATUS_COLOR.dba_confirming
  return PERM_STATUS_COLOR.rejected
}

// ---------------- 详情抽屉 ----------------
const detailVisible = ref(false)
const detailId = ref('')
const current = computed(() => (detailId.value ? PermissionStore.byId(detailId.value) : undefined))
const currentGrant = computed(() => grantRows.value.find(g => g.applyId === detailId.value))

function openDetail(applyId: string) {
  detailId.value = applyId
  detailVisible.value = true
}

// ---------------- 重置演示数据 ----------------
function confirmReset() {
  Modal.confirm({
    title: '重置演示数据',
    content: '将清空本机全部权限申请与授权台账，恢复为 7 张种子申请单（含待审 / DBA 确认中 / 已通过 / 已拒绝 / 已过期）。是否继续？',
    okText: '确认重置',
    cancelText: '取消',
    onOk: async () => {
      await sleep(600)
      PermissionStore.reset()
      resetGrantFilter()
      resetApplyFilter()
      detailVisible.value = false
      Message.success('演示数据已重置：7 张申请单 / 3 条有效授权 / 管理员待审 1 · DBA 队列 1')
    }
  })
}

onMounted(() => {
  // 恢复演示身份（角色持久化在 localStorage）
  roleStore.initFromStorage()
})

// ---------------- 跳转 ----------------
function goApply() {
  router.push('/management/permission/data-permission/apply')
}
function goApproval() {
  router.push('/management/permission/data-permission/approval')
}
function goProgress() {
  router.push('/management/permission/data-permission/progress')
}
</script>

<style lang="scss" scoped>
/* 页面背景/高度/最大宽度由 PageContainer 提供 */
.content-wrapper {
  padding: 0 24px 24px;
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
.page-tip {
  margin-bottom: 12px;
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
.cell-sub {
  margin-left: 6px;
  font-size: 12px;
  color: var(--dca-text-secondary, #4e5969);
}
.mono {
  margin-left: 8px;
  font-family: 'SFMono-Regular', Consolas, Menlo, monospace;
  font-size: 12px;
  color: var(--dca-text-tertiary, #86909c);
}
.muted {
  color: var(--dca-text-tertiary, #86909c);
}
.dist-box {
  margin-top: 16px;
  padding: 12px 14px;
  background: var(--dca-bg-page-alt, #f7f8fa);
  border-radius: var(--dca-radius-lg, 8px);
}
.dist-head {
  margin-bottom: 10px;
  font-size: 13px;
  font-weight: 600;
  color: var(--dca-text-primary, #1d2129);
}
.dist-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}
.dist-item {
  padding: 8px 10px;
  background: var(--dca-bg-panel, #fff);
  border: 1px solid var(--dca-border-light, #e5e6eb);
  border-radius: var(--dca-radius-md, 6px);
}
.dist-line {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}
.dist-count {
  margin-left: auto;
  font-size: 12px;
  color: var(--dca-text-secondary, #4e5969);
}
.dist-empty {
  font-size: 12px;
  color: var(--dca-text-tertiary, #86909c);
}
.detail-desc {
  margin-bottom: 8px;
}
.field-tag {
  margin: 0 6px 4px 0;
}
.policy-note {
  font-size: 12px;
  color: var(--dca-text-secondary, #4e5969);
}
.section-title {
  margin: 18px 0 10px;
  font-size: 14px;
  font-weight: 600;
  color: var(--dca-text-primary, #1d2129);
}
.history-timeline {
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
.drawer-actions {
  margin-top: 16px;
}
</style>
