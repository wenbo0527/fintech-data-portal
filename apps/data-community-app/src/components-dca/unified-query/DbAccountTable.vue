<template>
  <div class="account-table">
    <!-- 筛选 -->
    <div class="toolbar">
      <a-input-search
        v-model="keyword"
        placeholder="搜索账号 / 姓名 / 工号"
        allow-clear
        style="width: 220px"
      />
      <a-select v-model="dsFilter" :options="dsOptions" style="width: 130px" />
      <a-select v-model="stateFilter" :options="stateOptions" style="width: 130px" />
      <a-select v-model="ownerFilter" :options="admin.ownerOptions" style="width: 130px" />
      <a-button :disabled="!hasFilter" @click="resetFilter">重置</a-button>
      <span class="toolbar-hint">共 {{ rows.length }} 个账号</span>
    </div>

    <!-- 多选提示条 -->
    <div v-if="selectedKeys.length" class="select-bar">
      <span class="select-bar__text">已选 <b>{{ selectedKeys.length }}</b> 个账号</span>
      <a-button size="small" type="primary" @click="batchVisible = true">
        <template #icon><icon-refresh /></template>
        批量重置密码
      </a-button>
      <span class="select-bar__hint">已停用账号会被自动跳过</span>
      <a-link class="select-bar__clear" @click="selectedKeys = []">清空选择</a-link>
    </div>

    <a-table
      :columns="columns"
      :data="rows"
      v-model:selected-keys="selectedKeys"
      :row-selection="{ type: 'checkbox', showCheckedAll: true, width: 44 }"
      row-key="id"
      size="medium"
      :scroll="{ x: 1103 }"
      :pagination="{ pageSize: 8, showTotal: true, sizeCanChange: false }"
    >
      <template #colAccount="{ record }">
        <a-link class="cell-account" @click="openDetail(record)">{{ record.accountName }}</a-link>
        <div v-if="record.source === 'self-service'" class="cell-sub">自助申请开通</div>
        <div v-else class="cell-sub">管理员创建</div>
      </template>
      <template #colOwner="{ record }">
        <div>{{ record.ownerName }}</div>
        <div class="cell-sub">{{ record.department }} · {{ record.employeeNo }}</div>
      </template>
      <template #colDs="{ record }">
        <a-tag size="small" :color="record.datasource === 'doris' ? 'arcoblue' : 'orange'">
          {{ dsLabel(record.datasource) }}
        </a-tag>
      </template>
      <template #colScope="{ record }">
        <div class="cell-scope">
          <span class="cell-scope__cluster">{{ record.cluster }}</span>
          <a-tag v-for="db in record.databases" :key="db" size="small" color="gray">{{ db }}</a-tag>
        </div>
      </template>
      <template #colPrivilege="{ record }">
        <a-tag size="small" :color="privMeta(record.privilege).tag">
          {{ privMeta(record.privilege).text }}
        </a-tag>
      </template>
      <template #colState="{ record }">
        <div class="cell-state">
          <a-tooltip v-if="record.remark" :content="record.remark">
            <a-tag size="small" :color="stateMeta(record.state).tag">
              <template #icon>
                <span class="cell-dot" :style="{ background: stateMeta(record.state).dot }" />
              </template>
              {{ stateMeta(record.state).text }}
            </a-tag>
          </a-tooltip>
          <a-tag v-else size="small" :color="stateMeta(record.state).tag">
            <template #icon>
              <span class="cell-dot" :style="{ background: stateMeta(record.state).dot }" />
            </template>
            {{ stateMeta(record.state).text }}
          </a-tag>
          <span v-if="record.lastLoginAt" class="cell-sub">登录 {{ shortDate(record.lastLoginAt) }}</span>
          <span v-else class="cell-sub is-muted">从未登录</span>
        </div>
      </template>
      <template #colPassword="{ record }">
        <div>{{ dateOf(record.passwordUpdatedAt) }}</div>
        <div class="cell-sub" :class="`is-${passwordState(record)}`">{{ passwordHint(record) }}</div>
      </template>
      <template #colOps="{ record }">
        <div class="cell-ops">
          <a-link :disabled="record.state === 'disabled'" @click="openResetPwd(record)">重置密码</a-link>
          <a-link :disabled="record.state === 'disabled'" @click="openEditGrant(record)">修改权限</a-link>
          <a-dropdown trigger="click" @select="(v: string) => handleMore(v, record)">
            <a-link>更多<icon-down /></a-link>
            <template #content>
              <a-doption value="detail">查看详情</a-doption>
              <a-doption v-if="record.state !== 'locked'" value="lock">锁定账号</a-doption>
              <a-doption v-else value="unlock">解除锁定</a-doption>
              <a-doption v-if="record.state !== 'disabled'" value="disable">停用账号</a-doption>
              <a-doption v-else value="enable">恢复账号</a-doption>
              <a-doption value="revoke">
                <span class="danger-text">回收账号</span>
              </a-doption>
            </template>
          </a-dropdown>
        </div>
      </template>
    </a-table>

    <!-- 批量重置密码 -->
    <DbBatchResetModal
      v-model:visible="batchVisible"
      :accounts="selectedAccounts"
      @done="selectedKeys = []"
    />

    <!-- 回收账号:不可恢复,需输入确认词 -->
    <DangerConfirmModal
      v-model:visible="revokeVisible"
      title="回收账号"
      keyword="确认回收"
      ok-text="确定回收"
      :description="`回收后不可恢复,审计流水保留。请确认以下影响:`"
      :items="revokeItems"
      @confirm="confirmRevoke"
    />

    <!-- 重置密码 -->
    <a-modal
      v-model:visible="pwdVisible"
      :title="pwdStage === 'confirm' ? '重置账号密码' : '新密码已生成'"
      :width="540"
      :footer="false"
      :mask-closable="pwdStage === 'confirm'"
      @cancel="closeResetPwd"
    >
      <template v-if="pwdTarget">
        <div class="target-card">
          <div class="target-card__main">
            <code>{{ pwdTarget.accountName }}</code>
            <a-tag size="small" :color="pwdTarget.datasource === 'doris' ? 'arcoblue' : 'orange'">
              {{ dsLabel(pwdTarget.datasource) }}
            </a-tag>
          </div>
          <div class="target-card__sub">
            {{ pwdTarget.ownerName }}({{ pwdTarget.department }} / {{ pwdTarget.employeeNo }}) ·
            {{ pwdTarget.cluster }}
          </div>
        </div>

        <template v-if="pwdStage === 'confirm'">
          <a-alert type="warning" show-icon class="modal-tip">
            重置后旧密码立即失效,该账号已建立的连接不受影响,但下次登录必须使用新密码。
            新密码仅在此处展示一次,平台不保存明文。
          </a-alert>
          <a-form :model="pwdForm" layout="vertical">
            <a-form-item label="重置原因" required>
              <a-select v-model="pwdForm.reason" :options="reasonOptions" />
            </a-form-item>
            <a-form-item v-if="pwdTarget.state === 'locked'">
              <a-checkbox v-model="pwdForm.unlock">同时解除账号锁定</a-checkbox>
            </a-form-item>
          </a-form>
          <div class="modal-foot">
            <a-button @click="closeResetPwd">取消</a-button>
            <a-button type="primary" @click="confirmResetPwd">确认重置</a-button>
          </div>
        </template>

        <template v-else>
          <div class="secret-card">
            <div class="secret-card__label">一次性密码</div>
            <div class="secret-card__value">{{ pwdResult }}</div>
            <a-space size="mini" class="secret-card__ops">
              <a-button size="small" @click="copyPassword">
                <template #icon><icon-copy /></template>
                复制密码
              </a-button>
              <span class="secret-card__hint">关闭后无法再次查看</span>
            </a-space>
          </div>
          <a-alert type="info" show-icon class="modal-tip">
            请通过企业微信 / 工单等可信渠道发给 <b>{{ pwdTarget.ownerName }}</b>,
            并要求其首次登录后立即修改。本次操作已写入审计流水。
          </a-alert>
          <div class="modal-foot">
            <a-button type="primary" @click="closeResetPwd">我已下发,关闭</a-button>
          </div>
        </template>
      </template>
    </a-modal>

    <!-- 修改权限 -->
    <a-modal
      v-model:visible="grantVisible"
      title="修改账号权限"
      ok-text="保存变更"
      cancel-text="取消"
      :width="560"
      @ok="submitGrant"
    >
      <template v-if="grantTarget">
        <div class="target-card">
          <div class="target-card__main">
            <code>{{ grantTarget.accountName }}</code>
            <a-tag size="small" :color="grantTarget.datasource === 'doris' ? 'arcoblue' : 'orange'">
              {{ dsLabel(grantTarget.datasource) }}
            </a-tag>
          </div>
          <div class="target-card__sub">
            {{ grantTarget.ownerName }} · {{ grantTarget.cluster }} · 当前
            {{ privMeta(grantTarget.privilege).text }} · {{ grantTarget.databases.join('、') }}
          </div>
        </div>
        <a-form :model="grantForm" layout="vertical">
          <a-form-item label="权限级别" required>
            <a-radio-group v-model="grantForm.privilege" type="button">
              <a-radio value="read">只读</a-radio>
              <a-radio value="write">读写</a-radio>
              <a-radio value="admin">管理</a-radio>
            </a-radio-group>
          </a-form-item>
          <a-form-item label="授权库" required>
            <a-checkbox-group v-model="grantForm.databases" direction="vertical">
              <a-checkbox v-for="opt in dbOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </a-checkbox>
            </a-checkbox-group>
          </a-form-item>
          <a-form-item label="变更说明" required>
            <a-select v-model="grantForm.reason" :options="changeReasonOptions" />
          </a-form-item>
        </a-form>
        <a-alert type="warning" show-icon>
          权限变更将在 5 分钟内同步到 {{ grantTarget.cluster }};降级为只读会立即阻断写入,
          正在执行的事务将被回滚。本次操作已写入审计流水。
        </a-alert>
      </template>
    </a-modal>

    <!-- 详情抽屉 -->
    <a-drawer v-model:visible="detailVisible" :width="560" :footer="false">
      <template #header>
        <span>账号详情</span>
        <code v-if="detail" class="drawer-code">{{ detail.accountName }}</code>
      </template>
      <template v-if="detail">
        <a-descriptions :column="1" size="medium" class="detail-desc" bordered>
          <a-descriptions-item label="所属用户">
            {{ detail.ownerName }} · {{ detail.ownerAccount }}
          </a-descriptions-item>
          <a-descriptions-item label="部门 / 工号">
            {{ detail.department }} / {{ detail.employeeNo }}
          </a-descriptions-item>
          <a-descriptions-item label="数据源">
            {{ dsLabel(detail.datasource) }} · {{ detail.cluster }}
          </a-descriptions-item>
          <a-descriptions-item label="授权范围">
            <a-space size="mini" wrap>
              <a-tag v-for="db in detail.databases" :key="db" size="small" color="gray">{{ db }}</a-tag>
            </a-space>
          </a-descriptions-item>
          <a-descriptions-item label="权限级别">
            <a-tag size="small" :color="privMeta(detail.privilege).tag">
              {{ privMeta(detail.privilege).text }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="账号状态">
            <a-tag size="small" :color="stateMeta(detail.state).tag">
              {{ stateMeta(detail.state).text }}
            </a-tag>
            <span v-if="detail.remark" class="detail-remark">{{ detail.remark }}</span>
          </a-descriptions-item>
          <a-descriptions-item label="密码更新">{{ detail.passwordUpdatedAt }}</a-descriptions-item>
          <a-descriptions-item label="密码状态">
            <span :class="`is-${passwordState(detail)}`">{{ passwordHint(detail) }}</span>
            <span class="detail-remark">密码有效期 {{ detail.passwordValidDays }} 天</span>
          </a-descriptions-item>
          <a-descriptions-item label="最近登录">{{ detail.lastLoginAt ?? '从未登录' }}</a-descriptions-item>
          <a-descriptions-item label="关联访问 Key">{{ detail.keyCount }} 个</a-descriptions-item>
        </a-descriptions>

        <div class="detail-actions">
          <a-button size="small" :disabled="detail.state === 'disabled'" @click="openResetPwd(detail)">
            <template #icon><icon-lock /></template>
            重置密码
          </a-button>
          <a-button size="small" :disabled="detail.state === 'disabled'" @click="openEditGrant(detail)">
            <template #icon><icon-settings /></template>
            修改权限
          </a-button>
        </div>

        <div class="detail-section__title">操作记录</div>
        <a-timeline v-if="detailAudits.length" class="detail-timeline">
          <a-timeline-item v-for="log in detailAudits" :key="log.id">
            <div class="tl-head">
              <span class="tl-action">{{ log.action }}</span>
              <span class="tl-ts">{{ log.ts }}</span>
            </div>
            <div class="tl-detail">{{ log.detail }}</div>
            <div class="tl-actor">{{ log.operator }}</div>
          </a-timeline-item>
        </a-timeline>
        <a-empty v-else description="暂无管理操作记录" />
      </template>
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
/**
 * 数据库账号 · 全库账号清单(管理端)
 *
 * DBA 视角的账号管理:跨用户检索、重置密码(一次性下发)、调整权限与授权库、
 * 锁定 / 停用 / 回收。密码明文只在重置结果中出现一次,不写入任何数据。
 */
import { computed, reactive, ref } from 'vue'
import { Message, Modal } from '@arco-design/web-vue'
import DangerConfirmModal from './DangerConfirmModal.vue'
import DbBatchResetModal from './DbBatchResetModal.vue'
import { useUqDbAccountAdminStore } from '@/stores-dca/unified-query/db-account-admin'
import {
  DB_ACCOUNT_STATE_META,
  PASSWORD_WARN_DAYS,
  passwordDaysLeft,
  passwordState,
  PRIVILEGE_CHANGE_REASONS,
  RESET_PASSWORD_REASONS
} from '@/mock/unified-query/db-account-admin'
import { GRANT_SCOPE_OPTIONS, PRIVILEGE_META } from '@/mock/unified-query/db-account'
import type {
  DataSourceKey,
  DbAccount,
  DbAccountState,
  DbPrivilegeLevel
} from '@/mock/unified-query/types'
import { copyText, dateOf, dsLabel } from './db-account-utils'

const admin = useUqDbAccountAdminStore()

/* ── 批量选择 ─────────────────────────── */
const selectedKeys = ref<(string | number)[]>([])
const batchVisible = ref(false)

const selectedAccounts = computed(() =>
  admin.accounts.filter(a => selectedKeys.value.includes(a.id))
)

/* ── 筛选 ─────────────────────────────── */
const keyword = ref('')
const dsFilter = ref<'all' | DataSourceKey>('all')
const stateFilter = ref<'all' | DbAccountState>('all')
const ownerFilter = ref('all')

const dsOptions = [
  { label: '全部数据源', value: 'all' },
  { label: 'Doris', value: 'doris' },
  { label: 'Hive', value: 'hive' }
]

const stateOptions = [
  { label: '全部状态', value: 'all' },
  { label: '正常', value: 'normal' },
  { label: '已锁定', value: 'locked' },
  { label: '已停用', value: 'disabled' }
]

const hasFilter = computed(
  () => !!keyword.value || dsFilter.value !== 'all' || stateFilter.value !== 'all' || ownerFilter.value !== 'all'
)

function resetFilter() {
  keyword.value = ''
  dsFilter.value = 'all'
  stateFilter.value = 'all'
  ownerFilter.value = 'all'
}

const rows = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return admin.accounts.filter(a => {
    if (dsFilter.value !== 'all' && a.datasource !== dsFilter.value) return false
    if (stateFilter.value !== 'all' && a.state !== stateFilter.value) return false
    if (ownerFilter.value !== 'all' && a.ownerAccount !== ownerFilter.value) return false
    if (!kw) return true
    return [a.accountName, a.ownerName, a.employeeNo, a.ownerAccount]
      .some(field => field.toLowerCase().includes(kw))
  })
})

const columns = [
  { title: '数据库账号', dataIndex: 'accountName', slotName: 'colAccount', width: 160 },
  { title: '所属用户', dataIndex: 'ownerName', slotName: 'colOwner', width: 148 },
  { title: '数据源', dataIndex: 'datasource', slotName: 'colDs', width: 78 },
  { title: '授权范围', dataIndex: 'databases', slotName: 'colScope', width: 135 },
  { title: '权限', dataIndex: 'privilege', slotName: 'colPrivilege', width: 68 },
  { title: '账号状态', dataIndex: 'state', slotName: 'colState', width: 102 },
  { title: '密码更新', dataIndex: 'passwordUpdatedAt', slotName: 'colPassword', width: 142 },
  { title: '操作', dataIndex: 'operations', slotName: 'colOps', width: 228, fixed: 'right' }
]

/* ── 展示辅助 ─────────────────────────── */
function stateMeta(state: DbAccountState) {
  return DB_ACCOUNT_STATE_META[state]
}

function privMeta(level: DbPrivilegeLevel) {
  return PRIVILEGE_META[level]
}

/** 副行日期省略年份(完整时间见详情抽屉),避免单元格折行 */
function shortDate(datetime: string): string {
  return dateOf(datetime).slice(5)
}

/** 密码副文案:剩余天数 / 已过期 / 永不(未设策略) */
function passwordHint(account: DbAccount): string {
  const left = passwordDaysLeft(account)
  if (left < 0) return `已过期 ${Math.abs(left)} 天`
  if (left <= PASSWORD_WARN_DAYS) return `剩余 ${left} 天,即将过期`
  return `剩余 ${left} 天`
}

/* ── 重置密码 ─────────────────────────── */
const pwdVisible = ref(false)
const pwdStage = ref<'confirm' | 'result'>('confirm')
const pwdTarget = ref<DbAccount | null>(null)
const pwdResult = ref('')
const pwdForm = reactive({ reason: RESET_PASSWORD_REASONS[0], unlock: true })

const reasonOptions = RESET_PASSWORD_REASONS.map(r => ({ label: r, value: r }))

function openResetPwd(account: DbAccount) {
  pwdTarget.value = account
  pwdStage.value = 'confirm'
  pwdResult.value = ''
  pwdForm.reason = account.state === 'locked' ? RESET_PASSWORD_REASONS[1] : RESET_PASSWORD_REASONS[0]
  pwdForm.unlock = account.state === 'locked'
  pwdVisible.value = true
}

function confirmResetPwd() {
  if (!pwdTarget.value) return
  const pwd = admin.resetPassword(pwdTarget.value.id, { reason: pwdForm.reason, unlock: pwdForm.unlock })
  if (!pwd) {
    Message.error('账号不存在或已被回收')
    pwdVisible.value = false
    return
  }
  pwdResult.value = pwd
  pwdStage.value = 'result'
  Message.success('密码已重置,请及时下发')
}

function closeResetPwd() {
  pwdVisible.value = false
  pwdStage.value = 'confirm'
  pwdResult.value = ''
  pwdTarget.value = null
}

function copyPassword() {
  copyText(pwdResult.value, '一次性密码')
}

/* ── 修改权限 ─────────────────────────── */
const grantVisible = ref(false)
const grantTarget = ref<DbAccount | null>(null)
const grantForm = reactive({
  privilege: 'read' as DbPrivilegeLevel,
  databases: [] as string[],
  reason: PRIVILEGE_CHANGE_REASONS[0]
})

const changeReasonOptions = PRIVILEGE_CHANGE_REASONS.map(r => ({ label: r, value: r }))

const dbOptions = computed(() => {
  const ds = grantTarget.value?.datasource
  return ds ? GRANT_SCOPE_OPTIONS[ds].databases : []
})

function openEditGrant(account: DbAccount) {
  grantTarget.value = account
  grantForm.privilege = account.privilege
  grantForm.databases = [...account.databases]
  grantForm.reason = PRIVILEGE_CHANGE_REASONS[0]
  grantVisible.value = true
}

function submitGrant() {
  const account = grantTarget.value
  if (!account) return
  if (grantForm.databases.length === 0) {
    Message.warning('请至少保留一个授权库')
    return
  }
  admin.updateAccountGrant(account.id, {
    privilege: grantForm.privilege,
    databases: grantForm.databases,
    reason: grantForm.reason
  })
  grantVisible.value = false
  Message.success(`账号「${account.accountName}」权限已更新`)
}

/* ── 更多操作 ─────────────────────────── */
function handleMore(action: string, account: DbAccount) {
  if (action === 'detail') {
    openDetail(account)
    return
  }
  if (action === 'lock' || action === 'unlock') {
    const lock = action === 'lock'
    Modal.confirm({
      title: lock ? '锁定账号' : '解除锁定',
      content: lock
        ? `锁定后账号「${account.accountName}」将无法登录,已建立的连接在下次重连时被拒绝。确定继续?`
        : `解除锁定后账号「${account.accountName}」恢复登录,请确认已核实用户身份。`,
      okText: lock ? '确定锁定' : '解除锁定',
      cancelText: '取消',
      okButtonProps: lock ? { status: 'danger' } : {},
      onOk: () => {
        admin.setAccountState(account.id, lock ? 'locked' : 'normal', lock ? 'DBA 手动锁定' : 'DBA 解除锁定')
        Message.success(lock ? '账号已锁定' : '账号已解除锁定')
      }
    })
    return
  }
  if (action === 'disable' || action === 'enable') {
    const disable = action === 'disable'
    Modal.confirm({
      title: disable ? '停用账号' : '恢复账号',
      content: disable
        ? `停用后账号「${account.accountName}」立即下线,所有使用该账号的客户端连接将中断。确定继续?`
        : `恢复后账号「${account.accountName}」重新可用。`,
      okText: disable ? '确定停用' : '确定恢复',
      cancelText: '取消',
      okButtonProps: disable ? { status: 'danger' } : {},
      onOk: () => {
        admin.setAccountState(account.id, disable ? 'disabled' : 'normal', disable ? 'DBA 手动停用' : 'DBA 恢复账号')
        Message.success(disable ? '账号已停用' : '账号已恢复')
      }
    })
    return
  }
  if (action === 'revoke') {
    revokeTarget.value = account
    revokeVisible.value = true
  }
}

/* ── 回收账号(需输入确认词) ──────────────── */
const revokeVisible = ref(false)
const revokeTarget = ref<DbAccount | null>(null)

const revokeItems = computed(() => {
  const target = revokeTarget.value
  if (!target) return []
  return [
    `数据库账号:${target.accountName}`,
    `所属用户:${target.ownerName}(${target.department} / ${target.employeeNo})`,
    `数据源:${dsLabel(target.datasource)} · ${target.cluster}`,
    `授权范围:${target.databases.join('、')}(${privMeta(target.privilege).text})`,
    target.keyCount > 0
      ? `名下访问 Key:${target.keyCount} 个,将一并失效`
      : '名下无访问 Key'
  ]
})

function confirmRevoke() {
  const target = revokeTarget.value
  if (!target) return
  admin.revokeAccount(target.id, 'DBA 手动回收')
  Message.success(`账号「${target.accountName}」已回收`)
  if (detail.value?.id === target.id) detailVisible.value = false
  selectedKeys.value = selectedKeys.value.filter(k => k !== target.id)
  revokeTarget.value = null
}

/* ── 详情抽屉 ─────────────────────────── */
const detailVisible = ref(false)
const detail = ref<DbAccount | null>(null)

const detailAudits = computed(() =>
  detail.value ? admin.audits.filter(a => a.target === detail.value?.accountName) : []
)

function openDetail(account: DbAccount) {
  // 取商店里的最新引用,避免展示被替换后的旧对象
  detail.value = admin.getAccountById(account.id)
  detailVisible.value = true
}
</script>

<style lang="scss" scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.toolbar-hint {
  margin-left: auto;
  font-size: 12px;
  color: var(--color-text-3);
}

.select-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  padding: 8px 12px;
  border: 1px solid rgb(var(--arcoblue-2));
  border-radius: 6px;
  background: var(--color-primary-light-1);

  &__text {
    font-size: 13px;
    color: var(--color-text-1);

    b {
      color: rgb(var(--arcoblue-6));
    }
  }

  &__hint {
    font-size: 12px;
    color: var(--color-text-3);
  }

  &__clear {
    margin-left: auto;
    font-size: 12px;
  }
}

.cell-account {
  font-family: 'SFMono-Regular', Consolas, Menlo, monospace;
  font-size: 13px;
}

.cell-state {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.cell-sub {
  margin-top: 2px;
  font-size: 12px;
  color: var(--color-text-3);

  &.is-expired {
    color: rgb(var(--danger-6));
  }

  &.is-expiring {
    color: rgb(var(--warning-6));
  }
}

.cell-scope {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;

  &__cluster {
    color: var(--color-text-3);
    font-size: 12px;
  }
}

/* 操作列:CJK 文本在 flex 容器内默认会被压缩折行,强制单行 */
.cell-ops {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;

  :deep(.arco-link) {
    white-space: nowrap;
  }
}

.cell-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.is-muted {
  color: var(--color-text-4);
}

.danger-text {
  color: rgb(var(--danger-6));
}

.target-card {
  padding: 10px 12px;
  margin-bottom: 12px;
  border: 1px solid var(--color-border-2);
  border-radius: 6px;
  background: var(--color-fill-1);

  &__main {
    display: flex;
    align-items: center;
    gap: 8px;

    code {
      font-size: 14px;
      font-weight: 600;
    }
  }

  &__sub {
    margin-top: 4px;
    font-size: 12px;
    color: var(--color-text-3);
  }
}

.modal-tip {
  margin-bottom: 12px;
}

.modal-foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}

.secret-card {
  padding: 16px;
  margin-bottom: 12px;
  border: 1px dashed rgb(var(--primary-5));
  border-radius: 6px;
  background: rgba(var(--primary-1), 0.5);

  &__label {
    font-size: 12px;
    color: var(--color-text-3);
  }

  &__value {
    margin: 8px 0 10px;
    font-family: 'SFMono-Regular', Consolas, Menlo, monospace;
    font-size: 20px;
    font-weight: 600;
    letter-spacing: 1px;
    color: rgb(var(--primary-6));
    word-break: break-all;
  }

  &__ops {
    align-items: center;
  }

  &__hint {
    font-size: 12px;
    color: var(--color-text-3);
  }
}

.drawer-code {
  margin-left: 8px;
  font-family: 'SFMono-Regular', Consolas, Menlo, monospace;
  font-size: 13px;
  color: var(--color-text-3);
}

.detail-desc {
  margin-bottom: 12px;
}

.detail-remark {
  margin-left: 8px;
  font-size: 12px;
  color: var(--color-text-3);
}

.detail-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.detail-section__title {
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 600;
}

.tl-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tl-action {
  font-weight: 600;
}

.tl-ts {
  font-size: 12px;
  color: var(--color-text-3);
}

.tl-detail {
  margin-top: 4px;
  font-size: 12px;
  color: var(--color-text-2);
  line-height: 1.6;
}

.tl-actor {
  margin-top: 2px;
  font-size: 12px;
  color: var(--color-text-3);
}
</style>