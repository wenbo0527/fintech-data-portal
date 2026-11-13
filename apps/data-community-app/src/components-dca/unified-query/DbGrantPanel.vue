<template>
  <div class="grant-panel">
    <!-- 当前状态摘要:一行两个数据源,不重复列表字段 -->
    <div class="status-strip">
      <div v-for="panel in dsPanels" :key="panel.ds" class="status-item">
        <icon-storage class="status-item__icon" />
        <span class="status-item__name">{{ panel.label }}</span>
        <code v-if="panel.grant" class="status-item__code">{{ panel.grant.accountName }}</code>
        <span v-else class="is-muted">未开通</span>
        <a-tag size="small" :color="DB_ACCOUNT_STATUS_META[panel.status].tag">
          {{ DB_ACCOUNT_STATUS_META[panel.status].text }}
        </a-tag>
        <span class="status-item__scope">{{ scopeText(panel.grant) }}</span>
      </div>
    </div>

    <!-- 申请记录 -->
    <div class="toolbar">
      <a-input-search
        v-model="keyword"
        placeholder="搜索申请单号 / 账号"
        allow-clear
        style="width: 220px"
      />
      <a-select v-model="statusFilter" :options="statusOptions" style="width: 130px" />
      <a-button :disabled="!keyword && statusFilter === 'all'" @click="resetFilter">重置</a-button>
      <span class="toolbar-hint">共 {{ rows.length }} 条记录</span>
    </div>

    <a-table
      :columns="columns"
      :data="rows"
      row-key="id"
      size="medium"
      :scroll="{ x: 1135 }"
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
        <a-space size="mini">
          <a-tag size="small" :color="accountStatusMeta(record.status).tag">
            <template #icon>
              <icon-loading v-if="record.status === 'applying'" />
              <span v-else class="cell-dot" :style="{ background: accountStatusMeta(record.status).dot }" />
            </template>
            {{ accountStatusMeta(record.status).text }}
          </a-tag>
          <a-tag v-if="isCurrent(record)" size="small" color="gray">当前</a-tag>
        </a-space>
      </template>
      <template #grantApplied="{ record }">
        <div>{{ dateOf(record.appliedAt) }}</div>
        <div class="cell-sub">{{ timeOf(record.appliedAt) }}</div>
      </template>
      <template #grantOps="{ record }">
        <a-space size="mini" wrap>
          <a-link @click="openDetail(record)">详情</a-link>
          <a-link v-if="record.status === 'active'" status="danger" @click="confirmRevoke(record)">释放</a-link>
          <a-link v-if="canApply(record)" @click="openApply(record.datasource, record)">重新申请</a-link>
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
        <a-form-item label="权限级别" required>
          <!-- 自助申请只开放只读：读写 / 管理权限由 DBA 在管理端授予 -->
          <a-space size="mini" align="center">
            <a-tag color="arcoblue">只读</a-tag>
            <span class="form-hint">自助申请仅支持只读权限;如需读写 / 管理权限,请联系 DBA 在管理端授予</span>
          </a-space>
        </a-form-item>
        <a-form-item label="用途说明" required>
          <a-select
            v-model="applyForm.purpose"
            :options="purposeOptions"
            allow-create
            allow-search
            placeholder="选择或输入用途"
          />
        </a-form-item>
      </a-form>
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
 * 按用户申请 Doris / Hive 库级授权(账号长期有效,无到期日);已开通可释放,
 * 驳回 / 释放后可重新申请。每个数据源只展示最新一份申请,历史流转在详情抽屉中查看。
 */
import { computed, reactive, ref, watch } from 'vue'
import { Message, Modal } from '@arco-design/web-vue'
import { useUqDbAccountStore } from '@/stores-dca/unified-query/db-account'
import {
  ACCOUNT_PURPOSE_OPTIONS,
  DB_ACCOUNT_STATUS_META,
  GRANT_SCOPE_OPTIONS,
  PRIVILEGE_META
} from '@/mock/unified-query/db-account'
import type {
  DataSourceKey,
  DbAccountGrant,
  DbAccountStatus,
  DbPrivilegeLevel
} from '@/mock/unified-query/types'
import { canApply, dateOf, dsLabel, scopeText, timeOf } from './db-account-utils'

const store = useUqDbAccountStore()

/* 表格插槽的 record 为 any,用带类型的取值函数避免 TS7053 */
const privilegeMeta = (level: DbPrivilegeLevel) => PRIVILEGE_META[level]
const accountStatusMeta = (status: DbAccountStatus) => DB_ACCOUNT_STATUS_META[status]

/* ── 当前状态摘要(一行) ───────────────── */
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

/* ── 申请记录列表 ─────────────────────── */
const keyword = ref('')
const statusFilter = ref<'all' | DbAccountStatus>('all')

const statusOptions = [
  { label: '全部状态', value: 'all' },
  ...(Object.keys(DB_ACCOUNT_STATUS_META) as DbAccountStatus[]).map(s => ({
    label: DB_ACCOUNT_STATUS_META[s].text,
    value: s
  }))
]

/** 每个数据源最新一条申请视为「当前」,列表里加标记区分历史记录 */
const currentIds = computed(() => {
  const seen = new Set<DataSourceKey>()
  const ids = new Set<string>()
  for (const g of [...store.grants].sort((a, b) => b.appliedAt.localeCompare(a.appliedAt))) {
    if (seen.has(g.datasource)) {
      continue
    }
    seen.add(g.datasource)
    ids.add(g.id)
  }
  return ids
})
const isCurrent = (grant: DbAccountGrant) => currentIds.value.has(grant.id)

/** 全部申请记录,按申请时间倒序 */
const rows = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return [...store.grants]
    .sort((a, b) => b.appliedAt.localeCompare(a.appliedAt))
    .filter(g => {
      if (statusFilter.value !== 'all' && g.status !== statusFilter.value) {
        return false
      }
      if (kw && !g.id.toLowerCase().includes(kw) && !g.accountName.toLowerCase().includes(kw)) {
        return false
      }
      return true
    })
})

function resetFilter() {
  keyword.value = ''
  statusFilter.value = 'all'
}

const columns = [
  { title: '申请单号', dataIndex: 'id', width: 165 },
  { title: '数据源', dataIndex: 'datasource', slotName: 'grantDs', width: 80 },
  { title: '数据库账号', dataIndex: 'accountName', slotName: 'grantAccount', width: 170 },
  { title: '授权范围', dataIndex: 'databases', slotName: 'grantScope', width: 210 },
  { title: '权限', dataIndex: 'privilege', slotName: 'grantPrivilege', width: 70 },
  { title: '状态', dataIndex: 'status', slotName: 'grantStatus', width: 130 },
  { title: '申请时间', dataIndex: 'appliedAt', slotName: 'grantApplied', width: 150 },
  { title: '操作', dataIndex: 'operations', slotName: 'grantOps', width: 160 }
]

/* ── 申请 / 释放 ───────────────── */
const purposeOptions = ACCOUNT_PURPOSE_OPTIONS.map(p => ({ label: p, value: p }))

const applyVisible = ref(false)
const submitting = ref(false)
// 自助申请不含权限级别字段:固定只读,由 store 落库时统一写入
const applyForm = reactive<{
  datasource: DataSourceKey
  databases: string[]
  purpose: string
}>({
  datasource: 'doris',
  databases: [],
  purpose: ''
})

// 切换数据源时清空库选择,避免上一数据源的库名被带过去
watch(() => applyForm.datasource, () => {
  applyForm.databases = []
})

function openApply(ds: DataSourceKey = 'doris', grant: DbAccountGrant | null = null) {
  applyForm.datasource = ds
  applyForm.databases = grant ? [...grant.databases] : []
  applyForm.purpose = grant?.purpose ?? ''
  applyVisible.value = true
}

function submitApply() {
  if (!applyForm.databases.length) {
    return Message.warning('请至少选择一个授权库')
  }
  if (!applyForm.purpose.trim()) {
    return Message.warning('请填写用途说明')
  }
  submitting.value = true
  const record = store.applyGrant({
    datasource: applyForm.datasource,
    databases: [...applyForm.databases],
    // 自助申请固定只读:读写 / 管理权限仅由 DBA 管理端授予
    privilege: 'read',
    purpose: applyForm.purpose.trim()
  })
  submitting.value = false
  applyVisible.value = false
  Message.success(`申请单 ${record.id} 已提交,等待 DBA 审批`)
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
.status-strip {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 24px;
  padding: 10px 14px;
  margin: 4px 0 14px;
  border: 1px solid var(--color-border-2);
  border-radius: 8px;
  background: var(--color-bg-2);
}

.status-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;

  &__icon {
    color: rgb(var(--primary-6));
  }

  &__name {
    font-weight: 600;
  }

  &__code {
    font-family: 'SFMono-Regular', Consolas, Menlo, monospace;
    font-size: 12px;
    background: var(--color-fill-2);
    padding: 1px 6px;
    border-radius: 3px;
  }

  &__scope {
    font-size: 12px;
    color: var(--color-text-3);
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