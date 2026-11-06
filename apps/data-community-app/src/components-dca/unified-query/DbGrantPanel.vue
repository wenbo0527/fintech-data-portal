<template>
  <div class="grant-panel">
    <!-- 数据源当前状态 -->
    <a-row :gutter="12" class="ds-row">
      <a-col v-for="panel in dsPanels" :key="panel.ds" :span="12">
        <div class="ds-card" :class="panel.grant ? `is-${panel.grant.status}` : 'is-none'">
          <div class="ds-card__head">
            <icon-storage class="ds-card__icon" />
            <span class="ds-card__name">{{ panel.label }}</span>
            <a-tag size="small" :color="DB_ACCOUNT_STATUS_META[panel.status].tag">
              {{ DB_ACCOUNT_STATUS_META[panel.status].text }}
            </a-tag>
            <span class="ds-card__cluster">{{ GRANT_SCOPE_OPTIONS[panel.ds].cluster }}</span>
          </div>
          <div class="ds-card__body">
            <div class="ds-kv">
              <span class="ds-kv__label">账号</span>
              <code v-if="panel.grant" class="ds-kv__code">{{ panel.grant.accountName }}</code>
              <span v-else class="is-muted">未开通</span>
            </div>
            <div class="ds-kv">
              <span class="ds-kv__label">授权范围</span>
              <span>{{ scopeText(panel.grant) }}</span>
            </div>
            <div class="ds-kv">
              <span class="ds-kv__label">有效期</span>
              <span :class="{ 'is-muted': !panel.grant?.expireAt }">{{ expireText(panel.grant) }}</span>
            </div>
          </div>
          <div class="ds-card__foot">
            <a-button v-if="canApply(panel.grant)" size="mini" type="primary" @click="openApply(panel.ds, panel.grant)">
              {{ panel.grant ? '重新申请' : '申请开通' }}
            </a-button>
            <a-button v-if="panel.grant?.status === 'active'" size="mini" @click="openExtend(panel.grant!)">续期</a-button>
            <a-button
              v-if="panel.grant?.status === 'active'"
              size="mini"
              status="danger"
              @click="confirmRevoke(panel.grant!)"
            >释放</a-button>
            <a-button v-if="panel.grant" size="mini" type="text" @click="openDetail(panel.grant!)">详情</a-button>
            <span v-if="panel.status === 'applying'" class="ds-card__hint">
              <icon-loading />
              审批中,通过后自动生效
            </span>
            <span v-else-if="panel.status === 'rejected'" class="ds-card__hint is-danger">
              <icon-exclamation-circle />
              已驳回,可修改后重新申请
            </span>
          </div>
        </div>
      </a-col>
    </a-row>

    <!-- 申请记录 -->
    <div class="toolbar">
      <a-input-search
        v-model="keyword"
        placeholder="搜索申请单号 / 账号"
        allow-clear
        style="width: 220px"
      />
      <a-select v-model="dsFilter" :options="dsFilterOptions" style="width: 130px" />
      <a-select v-model="statusFilter" :options="statusOptions" style="width: 130px" />
      <a-button :disabled="!keyword && dsFilter === 'all' && statusFilter === 'all'" @click="resetFilter">
        重置
      </a-button>
      <span class="toolbar-hint">共 {{ rows.length }} 条申请记录</span>
    </div>

    <a-table
      :columns="columns"
      :data="rows"
      row-key="id"
      size="medium"
      :scroll="{ x: 1230 }"
      :pagination="{ pageSize: 8, showTotal: true, sizeCanChange: false }"
    >
      <template #grantDs="{ record }">
        <a-tag size="small" :color="record.datasource === 'doris' ? 'arcoblue' : 'orange'">
          {{ dsLabel(record.datasource) }}
        </a-tag>
      </template>
      <template #grantAccount="{ record }">
        <code class="cell-code">{{ record.accountName }}</code>
      </template>
      <template #grantScope="{ record }">
        <div class="cell-scope">
          <span class="cell-scope__cluster">{{ record.cluster }}</span>
          <a-tag v-for="db in record.databases" :key="db" size="small" color="gray">{{ db }}</a-tag>
        </div>
      </template>
      <template #grantPrivilege="{ record }">
        <a-tag size="small" :color="privilegeMeta(record.privilege).tag">
          {{ privilegeMeta(record.privilege).text }}
        </a-tag>
      </template>
      <template #grantStatus="{ record }">
        <a-tag size="small" :color="accountStatusMeta(record.status).tag">
          <template #icon>
            <icon-loading v-if="record.status === 'applying'" />
            <span v-else class="cell-dot" :style="{ background: accountStatusMeta(record.status).dot }" />
          </template>
          {{ accountStatusMeta(record.status).text }}
        </a-tag>
      </template>
      <template #grantExpire="{ record }">
        <div>{{ record.expireAt ?? '—' }}</div>
        <div class="cell-sub">{{ expireHint(record) }}</div>
      </template>
      <template #grantApplied="{ record }">
        <div>{{ dateOf(record.appliedAt) }}</div>
        <div class="cell-sub">{{ timeOf(record.appliedAt) }}</div>
      </template>
      <template #grantOps="{ record }">
        <a-space size="mini" wrap>
          <a-link @click="openDetail(record)">详情</a-link>
          <a-link v-if="record.status === 'active'" @click="openExtend(record)">续期</a-link>
          <a-link v-if="record.status === 'active'" status="danger" @click="confirmRevoke(record)">释放</a-link>
          <a-link v-if="canApply(record)" @click="openApply(record.datasource, record)">重新申请</a-link>
          <span v-if="record.status === 'applying'" class="cell-loading"><icon-loading /> 审批中</span>
        </a-space>
      </template>
    </a-table>

    <!-- 申请账号权限 -->
    <a-modal
      v-model:visible="applyVisible"
      title="申请数据库账号权限"
      ok-text="提交申请"
      cancel-text="取消"
      :ok-button-loading="submitting"
      :width="560"
      @ok="submitApply"
    >
      <a-alert type="info" show-icon class="modal-tip">
        提交后由直属主管 + DBA 审批(演示约 2 秒自动通过),通过后账号立即生效。
      </a-alert>
      <a-form :model="applyForm" layout="vertical">
        <a-form-item label="数据源" required>
          <a-radio-group v-model="applyForm.datasource" type="button">
            <a-radio value="doris">Doris</a-radio>
            <a-radio value="hive">Hive</a-radio>
          </a-radio-group>
          <span class="form-hint">集群:{{ GRANT_SCOPE_OPTIONS[applyForm.datasource].cluster }}</span>
        </a-form-item>
        <a-form-item label="授权库(可多选)" required>
          <a-checkbox-group v-model="applyForm.databases" direction="vertical">
            <a-checkbox
              v-for="db in GRANT_SCOPE_OPTIONS[applyForm.datasource].databases"
              :key="db.value"
              :value="db.value"
            >
              {{ db.label }}
            </a-checkbox>
          </a-checkbox-group>
        </a-form-item>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="权限级别" required>
              <a-radio-group v-model="applyForm.privilege">
                <a-radio value="read">只读</a-radio>
                <a-radio value="write">读写</a-radio>
              </a-radio-group>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="有效期" required>
              <a-select v-model="applyForm.validMonths">
                <a-option v-for="m in GRANT_VALID_MONTHS_OPTIONS" :key="m" :value="m">{{ m }} 个月</a-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="用途说明" required>
          <a-select
            v-model="applyForm.purpose"
            :options="purposeOptions"
            allow-create
            allow-search
            placeholder="选择或输入用途"
          />
        </a-form-item>
        <a-alert v-if="applyForm.privilege === 'write'" type="warning" show-icon class="modal-tip">
          读写权限需数据 Owner 会签,审批时长可能延长。
        </a-alert>
      </a-form>
    </a-modal>

    <!-- 续期 -->
    <a-modal
      v-model:visible="extendVisible"
      title="账号续期"
      ok-text="提交续期"
      cancel-text="取消"
      :ok-button-loading="submitting"
      @ok="submitExtend"
    >
      <a-descriptions v-if="extendTarget" :column="1" size="small" class="extend-desc">
        <a-descriptions-item label="数据库账号">{{ extendTarget.accountName }}</a-descriptions-item>
        <a-descriptions-item label="当前到期">{{ extendTarget.expireAt ?? '—' }}</a-descriptions-item>
      </a-descriptions>
      <a-form :model="extendForm" layout="vertical">
        <a-form-item label="续期时长" required>
          <a-select v-model="extendForm.validMonths">
            <a-option v-for="m in GRANT_VALID_MONTHS_OPTIONS" :key="m" :value="m">{{ m }} 个月</a-option>
          </a-select>
        </a-form-item>
      </a-form>
      <a-alert type="info" show-icon>续期通过后,有效期从审批通过当日起重新计算。</a-alert>
    </a-modal>

    <!-- 账号详情 -->
    <a-drawer v-model:visible="detailVisible" title="账号申请详情" :width="500" :footer="false">
      <template v-if="detail">
        <a-descriptions :column="1" bordered size="small">
          <a-descriptions-item label="申请单号">{{ detail.id }}</a-descriptions-item>
          <a-descriptions-item label="数据源">{{ dsLabel(detail.datasource) }}</a-descriptions-item>
          <a-descriptions-item label="数据库账号">{{ detail.accountName }}</a-descriptions-item>
          <a-descriptions-item label="授权范围">{{ scopeText(detail) }}</a-descriptions-item>
          <a-descriptions-item label="权限级别">{{ PRIVILEGE_META[detail.privilege].text }}</a-descriptions-item>
          <a-descriptions-item label="状态">
            <a-tag size="small" :color="DB_ACCOUNT_STATUS_META[detail.status].tag">
              {{ DB_ACCOUNT_STATUS_META[detail.status].text }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="有效期至">{{ detail.expireAt ?? '审批通过后生成' }}</a-descriptions-item>
          <a-descriptions-item label="审批人">{{ detail.approver ?? '—' }}</a-descriptions-item>
          <a-descriptions-item label="用途">{{ detail.purpose }}</a-descriptions-item>
          <a-descriptions-item label="最近登录">{{ detail.lastLoginAt ?? '—' }}</a-descriptions-item>
        </a-descriptions>

        <a-alert v-if="detail.rejectReason" type="error" show-icon class="drawer-alert">
          驳回原因:{{ detail.rejectReason }}
        </a-alert>

        <div class="drawer-title">流转记录</div>
        <a-timeline class="history-timeline">
          <a-timeline-item v-for="(h, i) in detail.history" :key="`${h.ts}-${i}`">
            <div class="his-action">{{ h.action }}</div>
            <div class="his-meta">{{ h.ts }} · {{ h.actor }}</div>
            <div v-if="h.comment" class="his-comment">{{ h.comment }}</div>
          </a-timeline-item>
        </a-timeline>
      </template>
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
/**
 * 统一查询 · 数据库账号管理 —— 数据源权限面板
 *
 * 按用户申请 Doris / Hive 库级授权;已开通可续期 / 释放,
 * 驳回 / 过期 / 释放后可重新申请。审批流由 store 定时器模拟。
 */
import { computed, reactive, ref, watch } from 'vue'
import { Message, Modal } from '@arco-design/web-vue'
import { useUqDbAccountStore } from '@/stores-dca/unified-query/db-account'
import {
  ACCOUNT_PURPOSE_OPTIONS,
  DB_ACCOUNT_STATUS_META,
  GRANT_SCOPE_OPTIONS,
  GRANT_VALID_MONTHS_OPTIONS,
  PRIVILEGE_META
} from '@/mock/unified-query/db-account'
import type {
  DataSourceKey,
  DbAccountGrant,
  DbAccountStatus,
  DbPrivilegeLevel
} from '@/mock/unified-query/types'
import { canApply, dateOf, dsLabel, expireHint, expireText, scopeText, timeOf } from './db-account-utils'

const store = useUqDbAccountStore()

/* 表格插槽的 record 为 any,用带类型的取值函数避免 TS7053 */
const privilegeMeta = (level: DbPrivilegeLevel) => PRIVILEGE_META[level]
const accountStatusMeta = (status: DbAccountStatus) => DB_ACCOUNT_STATUS_META[status]

/* ── 数据源卡片 ───────────────────────── */
const dsPanels = computed(() =>
  (['doris', 'hive'] as DataSourceKey[]).map(ds => {
    const grant = ds === 'doris' ? store.dorisGrant : store.hiveGrant
    return {
      ds,
      label: dsLabel(ds),
      grant,
      status: (grant?.status ?? 'revoked') as DbAccountStatus
    }
  })
)

/* ── 列表筛选 ─────────────────────────── */
const keyword = ref('')
const dsFilter = ref<'all' | DataSourceKey>('all')
const statusFilter = ref<'all' | DbAccountStatus>('all')

const dsFilterOptions = [
  { label: '全部数据源', value: 'all' },
  { label: 'Doris', value: 'doris' },
  { label: 'Hive', value: 'hive' }
]

const statusOptions = [
  { label: '全部状态', value: 'all' },
  ...(Object.keys(DB_ACCOUNT_STATUS_META) as DbAccountStatus[]).map(s => ({
    label: DB_ACCOUNT_STATUS_META[s].text,
    value: s
  }))
]

const rows = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return store.grants.filter(g => {
    if (dsFilter.value !== 'all' && g.datasource !== dsFilter.value) return false
    if (statusFilter.value !== 'all' && g.status !== statusFilter.value) return false
    if (kw && !g.id.toLowerCase().includes(kw) && !g.accountName.toLowerCase().includes(kw)) return false
    return true
  })
})

function resetFilter() {
  keyword.value = ''
  dsFilter.value = 'all'
  statusFilter.value = 'all'
}

const columns = [
  { title: '申请单号', dataIndex: 'id', width: 165 },
  { title: '数据源', dataIndex: 'datasource', slotName: 'grantDs', width: 80 },
  { title: '数据库账号', dataIndex: 'accountName', slotName: 'grantAccount', width: 170 },
  { title: '授权范围', dataIndex: 'databases', slotName: 'grantScope', width: 210 },
  { title: '权限', dataIndex: 'privilege', slotName: 'grantPrivilege', width: 70 },
  { title: '状态', dataIndex: 'status', slotName: 'grantStatus', width: 100 },
  { title: '有效期', dataIndex: 'expireAt', slotName: 'grantExpire', width: 150 },
  { title: '申请时间', dataIndex: 'appliedAt', slotName: 'grantApplied', width: 150 },
  { title: '操作', dataIndex: 'operations', slotName: 'grantOps', width: 160 }
]

/* ── 申请 / 续期 / 释放 ───────────────── */
const purposeOptions = ACCOUNT_PURPOSE_OPTIONS.map(p => ({ label: p, value: p }))

const applyVisible = ref(false)
const submitting = ref(false)
const applyForm = reactive<{
  datasource: DataSourceKey
  databases: string[]
  privilege: DbPrivilegeLevel
  validMonths: number
  purpose: string
}>({
  datasource: 'doris',
  databases: [],
  privilege: 'read',
  validMonths: 12,
  purpose: ''
})

// 切换数据源时清空库选择,避免上一数据源的库名被带过去
watch(() => applyForm.datasource, () => {
  applyForm.databases = []
})

function openApply(ds: DataSourceKey = 'doris', grant: DbAccountGrant | null = null) {
  applyForm.datasource = ds
  applyForm.databases = grant ? [...grant.databases] : []
  applyForm.privilege = grant?.privilege ?? 'read'
  applyForm.validMonths = grant?.validMonths ?? 12
  applyForm.purpose = grant?.purpose ?? ''
  applyVisible.value = true
}

function submitApply() {
  if (!applyForm.databases.length) return Message.warning('请至少选择一个授权库')
  if (!applyForm.purpose.trim()) return Message.warning('请填写用途说明')
  submitting.value = true
  const record = store.applyGrant({
    datasource: applyForm.datasource,
    databases: [...applyForm.databases],
    privilege: applyForm.privilege,
    validMonths: applyForm.validMonths,
    purpose: applyForm.purpose.trim()
  })
  submitting.value = false
  applyVisible.value = false
  Message.success(`申请单 ${record.id} 已提交,等待 DBA 审批`)
}

const extendVisible = ref(false)
const extendTarget = ref<DbAccountGrant | null>(null)
const extendForm = reactive({ validMonths: 12 })

function openExtend(grant: DbAccountGrant) {
  extendTarget.value = grant
  extendForm.validMonths = grant.validMonths
  extendVisible.value = true
}

function submitExtend() {
  if (!extendTarget.value) return
  submitting.value = true
  store.extendGrant(extendTarget.value.id, extendForm.validMonths)
  submitting.value = false
  extendVisible.value = false
  Message.success('续期申请已提交,审批通过后有效期自动顺延')
}

function confirmRevoke(grant: DbAccountGrant) {
  Modal.confirm({
    title: '释放数据库账号',
    content: `释放后账号「${grant.accountName}」立即失效,使用该账号的连接会中断。确定继续?`,
    okText: '确定释放',
    cancelText: '取消',
    okButtonProps: { status: 'danger' },
    onOk: () => {
      store.revokeGrant(grant.id)
      Message.success(`账号「${grant.accountName}」已释放`)
    }
  })
}

/* ── 详情抽屉 ─────────────────────────── */
const detailVisible = ref(false)
const detail = ref<DbAccountGrant | null>(null)

function openDetail(grant: DbAccountGrant) {
  detail.value = grant
  detailVisible.value = true
}

defineExpose({ openApply })
</script>

<style lang="scss" scoped>
.ds-row {
  margin: 4px 0 16px;
}

.ds-card {
  border: 1px solid var(--color-border-2);
  border-radius: 8px;
  padding: 14px 16px;
  height: 100%;
  background: var(--color-bg-2);

  &.is-active { border-left: 3px solid rgb(var(--success-6)); }
  &.is-applying { border-left: 3px solid rgb(var(--warning-6)); }
  &.is-rejected { border-left: 3px solid rgb(var(--danger-6)); }
  &.is-expired,
  &.is-revoked,
  &.is-none { border-left: 3px solid var(--color-fill-3); }
}

.ds-card__head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ds-card__icon {
  color: rgb(var(--primary-6));
}

.ds-card__name {
  font-size: 15px;
  font-weight: 600;
}

.ds-card__cluster {
  margin-left: auto;
  font-size: 12px;
  color: var(--color-text-3);
}

.ds-card__body {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ds-kv {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 13px;

  &__label {
    flex: none;
    width: 66px;
    color: var(--color-text-3);
  }

  &__code {
    font-family: 'SFMono-Regular', Consolas, Menlo, monospace;
    font-size: 12px;
    background: var(--color-fill-2);
    padding: 1px 6px;
    border-radius: 3px;
  }
}

.ds-card__foot {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.ds-card__hint {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: rgb(var(--warning-6));

  &.is-danger {
    color: rgb(var(--danger-6));
  }
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.toolbar-hint {
  margin-left: auto;
  font-size: 12px;
  color: var(--color-text-3);
}

.cell-code {
  font-family: 'SFMono-Regular', Consolas, Menlo, monospace;
  font-size: 12px;
}

.cell-scope {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;

  &__cluster {
    font-size: 12px;
    color: var(--color-text-3);
  }
}

.cell-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  vertical-align: middle;
}

.cell-loading {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: rgb(var(--warning-6));
}

.cell-sub {
  margin-top: 2px;
  font-size: 12px;
  color: var(--color-text-3);
}

.is-muted {
  color: var(--color-text-4);
}

.modal-tip {
  margin-bottom: 12px;
}

.form-hint {
  margin-left: 8px;
  font-size: 12px;
  color: var(--color-text-3);
}

.extend-desc {
  margin-bottom: 12px;
}

.drawer-alert {
  margin-top: 16px;
}

.drawer-title {
  margin: 20px 0 12px;
  font-size: 14px;
  font-weight: 600;
}

.history-timeline {
  padding-left: 4px;
}

.his-action {
  font-size: 13px;
  font-weight: 500;
}

.his-meta {
  margin-top: 2px;
  font-size: 12px;
  color: var(--color-text-3);
}

.his-comment {
  margin-top: 4px;
  font-size: 12px;
  color: var(--color-text-2);
  background: var(--color-fill-1);
  border-radius: 4px;
  padding: 6px 8px;
}
</style>