<template>
  <div class="admin-key-panel">
    <a-alert type="warning" show-icon class="panel-tip">
      <template #title>管理端可直接重置 / 吊销任何用户的访问 Key</template>
      SecretKey 重置后旧密钥立即失效,用户侧需重新拉取连接示例;吊销为不可恢复操作,仅建议在确认泄露时使用。
    </a-alert>

    <div class="toolbar">
      <a-input-search
        v-model="keyword"
        placeholder="搜索名称 / AccessKeyId / 用户"
        allow-clear
        style="width: 240px"
      />
      <a-select v-model="langFilter" :options="langOptions" style="width: 140px" />
      <a-select v-model="statusFilter" :options="statusOptions" style="width: 130px" />
      <a-button :disabled="!hasFilter" @click="resetFilter">重置</a-button>
      <span class="toolbar-hint">共 {{ rows.length }} 个 Key</span>
    </div>

    <a-table
      :columns="columns"
      :data="rows"
      row-key="id"
      size="medium"
      :scroll="{ x: 1220 }"
      :pagination="{ pageSize: 8, showTotal: true, sizeCanChange: false }"
    >
      <template #colName="{ record }">
        <div>{{ record.name }}</div>
        <div class="cell-sub">{{ record.purpose }}</div>
      </template>
      <template #colOwner="{ record }">
        <div>{{ record.owner }}</div>
        <div v-if="record.owner === ownerName" class="cell-sub">当前申请人</div>
      </template>
      <template #colAk="{ record }">
        <a-space size="mini">
          <code class="cell-code">{{ record.accessKeyId }}</code>
          <a-tooltip content="复制 AccessKeyId">
            <a-link @click="copyText(record.accessKeyId, 'AccessKeyId')"><icon-copy /></a-link>
          </a-tooltip>
        </a-space>
      </template>
      <template #colDs="{ record }">
        <a-space size="mini" direction="vertical" fill>
          <a-tag
            v-for="ds in record.datasources"
            :key="ds"
            size="small"
            :color="ds === 'doris' ? 'arcoblue' : 'orange'"
          >{{ dsLabel(ds) }}</a-tag>
        </a-space>
      </template>
      <template #colLang="{ record }">
        <a-tag size="small" :color="langMeta(record.language).tag">{{ langMeta(record.language).text }}</a-tag>
      </template>
      <template #colStatus="{ record }">
        <a-tag size="small" :color="keyStatusMeta(record.status).tag">
          {{ keyStatusMeta(record.status).text }}
        </a-tag>
      </template>
      <template #colExpire="{ record }">
        <div>{{ record.expireAt }}</div>
        <div class="cell-sub" :class="{ 'is-danger': keyExpired(record) }">{{ keyExpireHint(record) }}</div>
      </template>
      <template #colUsed="{ record }">
        <template v-if="record.lastUsedAt">
          <div>{{ dateOf(record.lastUsedAt) }}</div>
          <div class="cell-sub">{{ timeOf(record.lastUsedAt) }} · {{ record.callCount }} 次</div>
        </template>
        <span v-else class="is-muted">从未调用</span>
      </template>
      <template #colOps="{ record }">
        <div class="cell-ops">
          <a-link @click="openReset(record)">重置密钥</a-link>
          <a-link v-if="record.status !== 'expired'" @click="confirmToggle(record)">
            {{ record.status === 'active' ? '停用' : '启用' }}
          </a-link>
          <a-link status="danger" @click="openRevoke(record)">吊销</a-link>
        </div>
      </template>
    </a-table>

    <!-- 吊销 Key:不可恢复,需输入确认词 -->
    <DangerConfirmModal
      v-model:visible="revokeVisible"
      title="吊销访问 Key"
      keyword="确认吊销"
      ok-text="确定吊销"
      description="吊销后立即失效且不可恢复,用户需重新创建 Key。请确认以下影响:"
      :items="revokeItems"
      @confirm="submitRevoke"
    />

    <!-- 重置密钥 -->
    <a-modal
      v-model:visible="resetVisible"
      :title="resetStage === 'confirm' ? '重置 SecretKey' : '新 SecretKey 已生成'"
      :width="540"
      :footer="false"
      :mask-closable="resetStage === 'confirm'"
      @cancel="closeReset"
    >
      <template v-if="resetTarget">
        <div class="target-card">
          <div class="target-card__main">
            <span class="target-card__name">{{ resetTarget.name }}</span>
            <code>{{ resetTarget.accessKeyId }}</code>
          </div>
          <div class="target-card__sub">
            所属用户 {{ resetTarget.owner }} · 适用 {{ langMeta(resetTarget.language).text }}
          </div>
        </div>

        <template v-if="resetStage === 'confirm'">
          <a-alert type="warning" show-icon class="modal-tip">
            重置后旧 SecretKey 立即失效,使用旧密钥的 Python / R 脚本会连接失败,
            需要用户重新获取连接示例。AccessKeyId 保持不变。
          </a-alert>
          <a-form :model="resetForm" layout="vertical">
            <a-form-item label="重置原因" required>
              <a-select v-model="resetForm.reason" :options="reasonOptions" />
            </a-form-item>
          </a-form>
          <div class="modal-foot">
            <a-button @click="closeReset">取消</a-button>
            <a-button type="primary" status="danger" @click="confirmReset">确认重置</a-button>
          </div>
        </template>

        <template v-else>
          <div class="secret-card">
            <div class="secret-card__label">新的 SecretKey</div>
            <div class="secret-card__value">{{ resetResult }}</div>
            <a-space size="mini" class="secret-card__ops">
              <a-button size="small" @click="copyText(resetResult, 'SecretKey')">
                <template #icon><icon-copy /></template>
                复制密钥
              </a-button>
              <span class="secret-card__hint">关闭后无法再次查看</span>
            </a-space>
          </div>
          <a-alert type="info" show-icon>
            请通知 <b>{{ resetTarget.owner }}</b> 更新客户端配置。本次操作已写入审计流水。
          </a-alert>
          <div class="modal-foot">
            <a-button type="primary" @click="closeReset">我已通知,关闭</a-button>
          </div>
        </template>
      </template>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
/**
 * 数据库账号 · 全库访问 Key(管理端)
 *
 * 跨用户管理 Key:重置 SecretKey(一次性下发)、停用 / 启用、吊销。
 * 所有动作写入审计流水,并即时反映到全库统计。
 */
import { computed, reactive, ref } from 'vue'
import { Message, Modal } from '@arco-design/web-vue'
import DangerConfirmModal from './DangerConfirmModal.vue'
import { useUqDbAccountAdminStore } from '@/stores-dca/unified-query/db-account-admin'
import {
  ACCESS_KEY_STATUS_META,
  CLIENT_LANGUAGE_META
} from '@/mock/unified-query/db-account'
import { ACCOUNT_OWNER } from '@/mock/unified-query/db-account'
import type {
  AccessKeyRecord,
  AccessKeyStatus,
  ClientLanguage
} from '@/mock/unified-query/types'
import { copyText, dateOf, daysLeft, dsLabel, timeOf } from './db-account-utils'

const admin = useUqDbAccountAdminStore()
const ownerName = ACCOUNT_OWNER.name

/* ── 筛选 ─────────────────────────────── */
const keyword = ref('')
const langFilter = ref<'all' | ClientLanguage>('all')
const statusFilter = ref<'all' | AccessKeyStatus>('all')

const langOptions = [
  { label: '全部语言', value: 'all' },
  { label: 'Python', value: 'python' },
  { label: 'R', value: 'r' },
  { label: 'Python + R', value: 'both' }
]

const statusOptions = [
  { label: '全部状态', value: 'all' },
  { label: '启用', value: 'active' },
  { label: '已停用', value: 'disabled' },
  { label: '已过期', value: 'expired' }
]

const hasFilter = computed(
  () => !!keyword.value || langFilter.value !== 'all' || statusFilter.value !== 'all'
)

function resetFilter() {
  keyword.value = ''
  langFilter.value = 'all'
  statusFilter.value = 'all'
}

const rows = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return admin.keys.filter(k => {
    if (langFilter.value !== 'all' && k.language !== langFilter.value) return false
    if (statusFilter.value !== 'all' && k.status !== statusFilter.value) return false
    if (!kw) return true
    return [k.name, k.accessKeyId, k.owner].some(field => field.toLowerCase().includes(kw))
  })
})

const columns = [
  { title: '名称', dataIndex: 'name', slotName: 'colName', width: 165 },
  { title: '所属用户', dataIndex: 'owner', slotName: 'colOwner', width: 100 },
  { title: 'AccessKeyId', dataIndex: 'accessKeyId', slotName: 'colAk', width: 195 },
  { title: '授权数据源', dataIndex: 'datasources', slotName: 'colDs', width: 105 },
  { title: '适用语言', dataIndex: 'language', slotName: 'colLang', width: 90 },
  { title: '状态', dataIndex: 'status', slotName: 'colStatus', width: 85 },
  { title: '有效期', dataIndex: 'expireAt', slotName: 'colExpire', width: 140 },
  { title: '最近使用', dataIndex: 'lastUsedAt', slotName: 'colUsed', width: 145 },
  { title: '操作', dataIndex: 'operations', slotName: 'colOps', width: 195 }
]

/* ── 展示辅助 ─────────────────────────── */
function langMeta(language: ClientLanguage) {
  return CLIENT_LANGUAGE_META[language]
}

function keyStatusMeta(status: AccessKeyStatus) {
  return ACCESS_KEY_STATUS_META[status]
}

function keyExpired(key: AccessKeyRecord): boolean {
  return daysLeft(key.expireAt) < 0
}

function keyExpireHint(key: AccessKeyRecord): string {
  const left = daysLeft(key.expireAt)
  return left >= 0 ? `剩余 ${left} 天` : `已过期 ${Math.abs(left)} 天`
}

/* ── 重置密钥 ─────────────────────────── */
const RESET_REASONS = [
  '用户申诉密钥可能泄露',
  '密钥误写入公开仓库',
  '人员转岗,重新下发',
  '定期轮换'
]

const resetVisible = ref(false)
const resetStage = ref<'confirm' | 'result'>('confirm')
const resetTarget = ref<AccessKeyRecord | null>(null)
const resetResult = ref('')
const resetForm = reactive({ reason: RESET_REASONS[0] })
const reasonOptions = RESET_REASONS.map(r => ({ label: r, value: r }))

function openReset(key: AccessKeyRecord) {
  resetTarget.value = key
  resetStage.value = 'confirm'
  resetResult.value = ''
  resetForm.reason = RESET_REASONS[0]
  resetVisible.value = true
}

function confirmReset() {
  if (!resetTarget.value) return
  const secret = admin.resetKeySecret(resetTarget.value.id)
  if (!secret) {
    Message.error('访问 Key 不存在或已被吊销')
    resetVisible.value = false
    return
  }
  resetResult.value = secret
  resetStage.value = 'result'
  Message.success('SecretKey 已重置,请及时通知用户')
}

function closeReset() {
  resetVisible.value = false
  resetStage.value = 'confirm'
  resetResult.value = ''
  resetTarget.value = null
}

/* ── 停用 / 启用 / 吊销 ───────────────── */
function confirmToggle(key: AccessKeyRecord) {
  const disable = key.status === 'active'
  Modal.confirm({
    title: disable ? '停用访问 Key' : '启用访问 Key',
    content: disable
      ? `停用后「${key.name}」隶属的 ${key.owner} 将无法继续调用,Python / R 脚本会返回鉴权失败。确定继续?`
      : `启用后「${key.name}」恢复调用,请确认用户已完成整改。`,
    okText: disable ? '确定停用' : '确定启用',
    cancelText: '取消',
    onOk: () => {
      admin.toggleKey(key.id)
      Message.success(disable ? 'Key 已停用' : 'Key 已启用')
    }
  })
}

/* ── 吊销 Key(需输入确认词) ──────────────── */
const revokeVisible = ref(false)
const revokeTarget = ref<AccessKeyRecord | null>(null)

const revokeItems = computed(() => {
  const target = revokeTarget.value
  if (!target) return []
  return [
    `Key 名称:${target.name}`,
    `AccessKeyId:${target.accessKeyId}`,
    `隶属用户:${target.owner}`,
    `适用语言:${langMeta(target.language).text} · 已调用 ${target.callCount} 次`,
    '历史上调用记录保留,但该 Key 无法恢复使用'
  ]
})

function openRevoke(key: AccessKeyRecord) {
  revokeTarget.value = key
  revokeVisible.value = true
}

function submitRevoke() {
  const target = revokeTarget.value
  if (!target) return
  admin.revokeKey(target.id)
  Message.success(`Key「${target.name}」已吊销`)
  revokeTarget.value = null
}
</script>

<style lang="scss" scoped>
.panel-tip {
  margin-bottom: 12px;
}

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

.cell-code {
  font-family: 'SFMono-Regular', Consolas, Menlo, monospace;
  font-size: 12px;
}

.cell-sub {
  margin-top: 2px;
  font-size: 12px;
  color: var(--color-text-3);

  &.is-danger {
    color: rgb(var(--danger-6));
  }
}

.is-muted {
  color: var(--color-text-4);
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

.target-card {
  padding: 10px 12px;
  margin-bottom: 12px;
  border: 1px solid var(--color-border-2);
  border-radius: 6px;
  background: var(--color-fill-1);

  &__main {
    display: flex;
    align-items: center;
    gap: 10px;

    code {
      font-size: 12px;
      color: var(--color-text-3);
    }
  }

  &__name {
    font-size: 14px;
    font-weight: 600;
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
  margin-top: 12px;
}

.secret-card {
  padding: 16px;
  margin-bottom: 12px;
  border: 1px dashed rgb(var(--danger-5));
  border-radius: 6px;
  background: rgba(var(--danger-1), 0.4);

  &__label {
    font-size: 12px;
    color: var(--color-text-3);
  }

  &__value {
    margin: 8px 0 10px;
    font-family: 'SFMono-Regular', Consolas, Menlo, monospace;
    font-size: 18px;
    font-weight: 600;
    letter-spacing: 1px;
    color: rgb(var(--danger-6));
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
</style>