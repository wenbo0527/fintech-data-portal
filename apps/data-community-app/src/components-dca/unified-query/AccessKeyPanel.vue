<template>
  <div class="key-panel">
    <a-alert type="warning" show-icon class="key-tip">
      AccessKey 等同数据库密码,请勿写入代码仓库或明文分享。Key 仅在已开通或审批中的数据源上可选,
      停用后将立即阻断 Python / R 客户端连接。
    </a-alert>

    <div class="toolbar">
      <a-input-search
        v-model="keyword"
        placeholder="搜索名称 / AccessKeyId"
        allow-clear
        style="width: 220px"
      />
      <a-select v-model="statusFilter" :options="statusOptions" style="width: 130px" />
      <a-button :disabled="!keyword && statusFilter === 'all'" @click="resetFilter">
        重置
      </a-button>
      <a-button type="primary" style="margin-left: auto" @click="openCreate">
        <template #icon><icon-plus /></template>
        新建访问 Key
      </a-button>
    </div>

    <a-table
      :columns="columns"
      :data="rows"
      row-key="id"
      size="medium"
      :scroll="{ x: 1105 }"
      :pagination="{ pageSize: 8, showTotal: true, sizeCanChange: false }"
    >
      <template #keyName="{ record }">
        <div class="cell-key-name">{{ record.name }}</div>
        <div class="cell-sub">{{ record.purpose }}</div>
      </template>
      <template #keyAk="{ record }">
        <div class="cell-ak">
          <code>{{ record.accessKeyId }}</code>
          <a-link @click="copyText(record.accessKeyId, 'AccessKeyId')"><icon-copy /></a-link>
        </div>
      </template>
      <template #keyDs="{ record }">
        <a-space size="mini" wrap>
          <a-tag
            v-for="ds in record.datasources"
            :key="ds"
            size="small"
            :color="ds === 'doris' ? 'arcoblue' : 'orange'"
          >
            {{ dsLabel(ds) }}
          </a-tag>
        </a-space>
      </template>
      <template #keyStatus="{ record }">
        <a-tag size="small" :color="keyStatusMeta(record.status).tag">
          {{ keyStatusMeta(record.status).text }}
        </a-tag>
      </template>
      <template #keyExpire="{ record }">
        <div>{{ record.expireAt }}</div>
        <div class="cell-sub" :class="{ 'is-warn': daysLeft(record.expireAt) <= 30 }">
          {{ daysLeft(record.expireAt) >= 0 ? `剩余 ${daysLeft(record.expireAt)} 天` : '已过期' }}
        </div>
      </template>
      <template #keyUsed="{ record }">
        <div>{{ record.lastUsedAt ? record.lastUsedAt.slice(0, 16) : '从未使用' }}</div>
        <div class="cell-sub">累计调用 {{ record.callCount.toLocaleString() }} 次</div>
      </template>
      <template #keyOps="{ record }">
        <a-space size="mini" wrap>
          <a-link @click="openDetail(record)">代码示例</a-link>
          <a-link @click="openExtend(record)">续期</a-link>
          <a-link v-if="record.status !== 'expired'" @click="toggleKey(record)">
            {{ record.status === 'active' ? '停用' : '启用' }}
          </a-link>
          <a-link status="danger" @click="confirmDelete(record)">删除</a-link>
        </a-space>
      </template>
    </a-table>

    <!-- 新建访问 Key -->
    <a-modal
      v-model:visible="createVisible"
      title="新建访问 Key"
      ok-text="创建"
      cancel-text="取消"
      :width="580"
      @ok="submitCreate"
    >
      <a-form :model="form" layout="vertical">
        <a-form-item label="Key 名称" required>
          <a-input v-model="form.name" placeholder="如:风控建模-特征查询" allow-clear />
        </a-form-item>
        <a-form-item label="授权数据源(可多选)" required>
          <a-checkbox-group v-model="form.datasources">
            <a-checkbox
              v-for="ds in (['doris', 'hive'] as DataSourceKey[])"
              :key="ds"
              :value="ds"
              :disabled="!store.availableDatasources.includes(ds)"
            >
              {{ dsLabel(ds) }}
              <span v-if="!store.availableDatasources.includes(ds)" class="form-hint">(未开通权限)</span>
            </a-checkbox>
          </a-checkbox-group>
          <div class="form-hint block">仅可选择已开通或审批中的数据源;未开通请先申请账号权限。</div>
        </a-form-item>
        <a-form-item label="有效期" required>
          <a-select v-model="form.expireDays" :options="KEY_EXPIRE_OPTIONS" />
        </a-form-item>
        <a-form-item label="用途说明" required>
          <a-select
            v-model="form.purpose"
            :options="purposeOptions"
            allow-create
            allow-search
            placeholder="选择或输入用途"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 续期 -->
    <a-modal
      v-model:visible="extendVisible"
      title="续期访问 Key"
      ok-text="确定续期"
      cancel-text="取消"
      :width="480"
      @ok="submitExtend"
    >
      <template v-if="extendTarget">
        <a-descriptions :column="1" size="small" class="extend-info">
          <a-descriptions-item label="Key 名称">{{ extendTarget.name }}</a-descriptions-item>
          <a-descriptions-item label="当前有效期">
            {{ extendTarget.expireAt }}
            <span class="extend-info__hint">
              {{ daysLeft(extendTarget.expireAt) >= 0 ? `剩余 ${daysLeft(extendTarget.expireAt)} 天` : '已过期' }}
            </span>
          </a-descriptions-item>
        </a-descriptions>
        <a-form layout="vertical">
          <a-form-item label="续期时长" required>
            <a-select v-model="extendDays" :options="KEY_EXPIRE_OPTIONS" />
          </a-form-item>
        </a-form>
        <a-alert type="info" show-icon>
          续期后有效期至 <b>{{ previewExpire }}</b>。
          <template v-if="extendTarget.status === 'expired'">该 Key 已过期,续期后自动恢复启用。</template>
        </a-alert>
      </template>
    </a-modal>

    <!-- 创建成功:下发 AccessKeyId -->
    <a-modal
      v-model:visible="createdVisible"
      title="访问 Key 创建成功"
      :footer="false"
      :width="600"
    >
      <a-alert type="success" show-icon class="modal-tip">
        AccessKey 是 Python / R 客户端连接的唯一凭证,可在「代码示例」中直接复制使用。
      </a-alert>
      <div v-if="createdPayload" class="ak-box">
        <div class="ak-row">
          <span class="ak-row__label">Key 名称</span>
          <span class="ak-row__value">{{ createdPayload.name }}</span>
        </div>
        <div class="ak-row">
          <span class="ak-row__label">AccessKeyId</span>
          <code>{{ createdPayload.accessKeyId }}</code>
          <a-link @click="copyText(createdPayload.accessKeyId, 'AccessKeyId')"><icon-copy /> 复制</a-link>
        </div>
      </div>
      <div class="ak-foot">
        <a-button type="primary" @click="createdVisible = false">完成</a-button>
      </div>
    </a-modal>

    <!-- Key 详情 / 代码示例 -->
    <a-drawer
      v-model:visible="detailVisible"
      :title="`访问 Key · ${detail?.name ?? ''}`"
      :width="640"
      :footer="false"
    >
      <template v-if="detail">
        <a-descriptions :column="1" bordered size="small">
          <a-descriptions-item label="AccessKeyId">
            <div class="cell-ak">
              <code>{{ detail.accessKeyId }}</code>
              <a-link @click="copyText(detail.accessKeyId, 'AccessKeyId')"><icon-copy /> 复制</a-link>
            </div>
          </a-descriptions-item>
          <a-descriptions-item label="授权数据源">
            <a-space size="mini">
              <a-tag v-for="ds in detail.datasources" :key="ds" size="small">{{ dsLabel(ds) }}</a-tag>
            </a-space>
          </a-descriptions-item>
          <a-descriptions-item label="状态">{{ ACCESS_KEY_STATUS_META[detail.status].text }}</a-descriptions-item>
          <a-descriptions-item label="有效期">
            {{ detail.createdAt }} ~ {{ detail.expireAt }}
            <a-link class="row-action" @click="openExtend(detail)">续期</a-link>
          </a-descriptions-item>
          <a-descriptions-item label="最近使用">{{ detail.lastUsedAt ?? '从未使用' }}</a-descriptions-item>
          <a-descriptions-item label="用途">{{ detail.purpose }}</a-descriptions-item>
        </a-descriptions>

        <div class="drawer-title">
          <span>连接示例</span>
          <a-radio-group v-model="activeLang" type="button" size="mini">
            <a-radio v-for="l in CLIENT_LANGUAGES" :key="l.key" :value="l.key">{{ l.label }}</a-radio>
          </a-radio-group>
        </div>
        <div class="code-lang-tip">
          当前语言:<b>{{ activeLangLabel }}</b> · 安装依赖 Doris / Hive 共用一段,仅连接按数据源区分
        </div>

        <template v-if="connModel">
          <div class="ds-section">
            <div class="ds-section__head">
              <a-tag size="small" color="purple">安装</a-tag>
              <span class="ds-section__note">Doris / Hive 共用</span>
            </div>
            <div class="code-block">
              <div class="code-block__head">
                <span class="code-block__lang">安装依赖</span>
                <a-link @click="copyText(connModel.install, `${activeLangLabel} 安装`)">
                  <icon-copy /> 复制
                </a-link>
              </div>
              <pre><code>{{ connModel.install }}</code></pre>
            </div>
          </div>

          <div v-for="c in connModel.connects" :key="c.ds" class="ds-section">
            <div class="ds-section__head">
              <a-tag size="small" :color="c.ds === 'doris' ? 'arcoblue' : 'orange'">{{ c.dsName }}</a-tag>
              <span class="ds-section__note">{{ c.note }}</span>
              <a-tag v-if="c.authorized" size="small" color="green">已授权</a-tag>
              <a-tag v-else size="small" color="gray">当前 Key 未授权</a-tag>
            </div>
            <div class="code-block">
              <div class="code-block__head">
                <span class="code-block__lang">连接</span>
                <a-link @click="copyText(c.code, `${activeLangLabel} · ${c.dsName} 连接`)">
                  <icon-copy /> 复制代码
                </a-link>
              </div>
              <pre><code>{{ c.code }}</code></pre>
            </div>
          </div>
        </template>

        <div class="code-hint">
          示例中的 ACCESS_KEY 就是当前 Key 的 AccessKeyId,可直接复制到客户端配置;Doris 走 MySQL 协议,
          Hive 走 HiveServer2。AccessKey 泄露时请停用或删除后重建 Key。
        </div>
      </template>
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
/**
 * 统一查询 · 数据库账号管理 —— 访问 Key 面板
 *
 * 为 Python / R 客户端签发 AccessKeyId(唯一连接凭证):
 * 创建后支持查看连接示例、续期、停用、启用、删除。
 */
import { computed, reactive, ref } from 'vue'
import { Message, Modal } from '@arco-design/web-vue'
import { useUqDbAccountStore } from '@/stores-dca/unified-query/db-account'
import {
  ACCESS_KEY_STATUS_META,
  ACCOUNT_PURPOSE_OPTIONS,
  buildKeySnippets,
  CLIENT_LANGUAGES,
  CONNECTION_ENDPOINT,
  extendExpireAt,
  KEY_EXPIRE_OPTIONS
} from '@/mock/unified-query/db-account'
import type { ClientLanguage } from '@/mock/unified-query/db-account'
import type {
  AccessKeyRecord,
  AccessKeyStatus,
  DataSourceKey
} from '@/mock/unified-query/types'
import { copyText, daysLeft, dsLabel } from './db-account-utils'

const store = useUqDbAccountStore()

/* 表格插槽的 record 为 any,用带类型的取值函数避免 TS7053 */
const keyStatusMeta = (status: AccessKeyStatus) => ACCESS_KEY_STATUS_META[status]

/* ── 筛选 ─────────────────────────────── */
const keyword = ref('')
const statusFilter = ref<'all' | AccessKeyStatus>('all')

const statusOptions = [
  { label: '全部状态', value: 'all' },
  ...(Object.keys(ACCESS_KEY_STATUS_META) as AccessKeyStatus[]).map(s => ({
    label: ACCESS_KEY_STATUS_META[s].text,
    value: s
  }))
]

const rows = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return store.keys.filter(k => {
    if (statusFilter.value !== 'all' && k.status !== statusFilter.value) return false
    if (kw && !k.name.toLowerCase().includes(kw) && !k.accessKeyId.toLowerCase().includes(kw)) return false
    return true
  })
})

function resetFilter() {
  keyword.value = ''
  statusFilter.value = 'all'
}

const columns = [
  { title: '名称', dataIndex: 'name', slotName: 'keyName', width: 160 },
  { title: 'AccessKeyId', dataIndex: 'accessKeyId', slotName: 'keyAk', width: 200 },
  { title: '授权数据源', dataIndex: 'datasources', slotName: 'keyDs', width: 110 },
  { title: '状态', dataIndex: 'status', slotName: 'keyStatus', width: 85 },
  { title: '有效期', dataIndex: 'expireAt', slotName: 'keyExpire', width: 145 },
  { title: '最近使用', dataIndex: 'lastUsedAt', slotName: 'keyUsed', width: 165 },
  { title: '操作', dataIndex: 'operations', slotName: 'keyOps', width: 240 }
]

/* ── 新建 ─────────────────────────────── */
const purposeOptions = ACCOUNT_PURPOSE_OPTIONS.map(p => ({ label: p, value: p }))

const createVisible = ref(false)
const form = reactive<{
  name: string
  datasources: DataSourceKey[]
  expireDays: number
  purpose: string
}>({
  name: '',
  datasources: [],
  expireDays: 90,
  purpose: ''
})

function openCreate() {
  form.name = ''
  form.datasources = store.availableDatasources.slice(0, 1)
  form.expireDays = 90
  form.purpose = ''
  createVisible.value = true
}

function submitCreate() {
  if (!form.name.trim()) return Message.warning('请填写 Key 名称')
  if (!form.datasources.length) return Message.warning('请至少选择一个授权数据源')
  if (!form.purpose.trim()) return Message.warning('请填写用途说明')
  const record = store.createKey({
    name: form.name.trim(),
    datasources: [...form.datasources],
    expireDays: form.expireDays,
    purpose: form.purpose.trim()
  })
  createVisible.value = false
  showCreated(record)
}

/* ── 创建成功弹窗 ─────────────────────── */
const createdVisible = ref(false)
const createdPayload = ref<{
  name: string
  accessKeyId: string
} | null>(null)

function showCreated(record: AccessKeyRecord) {
  createdPayload.value = {
    name: record.name,
    accessKeyId: record.accessKeyId
  }
  createdVisible.value = true
}

/* ── 状态操作 ─────────────────────────── */
function toggleKey(record: AccessKeyRecord) {
  const updated = store.toggleKey(record.id)
  if (!updated) {
    Message.warning('该 Key 已过期,无法切换状态')
    return
  }
  Message.success(`Key「${record.name}」已${updated.status === 'active' ? '启用' : '停用'}`)
}

/* ── 续期 ─────────────────────────────── */
const extendVisible = ref(false)
const extendTarget = ref<AccessKeyRecord | null>(null)
const extendDays = ref(90)

const previewExpire = computed(() =>
  extendTarget.value ? extendExpireAt(extendTarget.value.expireAt, extendDays.value) : '—'
)

function openExtend(record: AccessKeyRecord) {
  extendTarget.value = record
  extendDays.value = 90
  extendVisible.value = true
}

function submitExtend() {
  const target = extendTarget.value
  if (!target) return
  const wasExpired = target.status === 'expired'
  const updated = store.extendKey(target.id, extendDays.value)
  if (!updated) return Message.error('续期失败,Key 不存在')
  extendVisible.value = false
  Message.success(
    `Key「${target.name}」已续期至 ${updated.expireAt}${wasExpired ? ',并已恢复启用' : ''}`
  )
}

function confirmDelete(record: AccessKeyRecord) {
  Modal.confirm({
    title: '删除访问 Key',
    content: `删除后「${record.name}」将彻底移除且不可恢复,相关客户端连接会立即失败。确定继续?`,
    okText: '确定删除',
    cancelText: '取消',
    okButtonProps: { status: 'danger' },
    onOk: () => {
      store.deleteKey(record.id)
      if (detail.value?.id === record.id) detailVisible.value = false
      Message.success(`Key「${record.name}」已删除`)
    }
  })
}

/* ── 详情 / 代码示例 ──────────────────── */
const detailVisible = ref(false)
const detail = ref<AccessKeyRecord | null>(null)

function openDetail(record: AccessKeyRecord) {
  detail.value = record
  activeLang.value = 'python' // 每次打开重置为默认语言,避免跨 Key 残留上次选择
  detailVisible.value = true
}

/** 当前选择的客户端语言(详情抽屉内切换) */
const activeLang = ref<ClientLanguage>('python')
const activeLangLabel = computed(
  () => CLIENT_LANGUAGES.find(l => l.key === activeLang.value)?.label ?? ''
)

/**
 * 连接示例:当前语言下安装为 Doris / Hive 共用的一段,
 * 连接才按 Doris / Hive 拆成两段;并标注当前 Key 是否已授权该数据源。
 */
const connModel = computed(() => {
  const key = detail.value
  if (!key) return null
  const s = buildKeySnippets(key)[activeLang.value]
  return {
    install: s.install,
    connects: (['doris', 'hive'] as DataSourceKey[]).map(ds => ({
      ds,
      dsName: dsLabel(ds),
      note: CONNECTION_ENDPOINT[ds].note,
      authorized: key.datasources.includes(ds),
      code: s.connect[ds]
    }))
  }
})

defineExpose({ openCreate })
</script>

<style lang="scss" scoped>
.key-tip {
  margin-bottom: 12px;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.cell-key-name {
  font-weight: 500;
}

.cell-sub {
  margin-top: 2px;
  font-size: 12px;
  color: var(--color-text-3);

  &.is-warn {
    color: rgb(var(--warning-6));
  }
}

.cell-ak {
  display: flex;
  align-items: center;
  gap: 6px;

  code {
    font-family: 'SFMono-Regular', Consolas, Menlo, monospace;
    font-size: 12px;
  }
}

.modal-tip {
  margin-bottom: 12px;
}

.form-hint {
  margin-left: 8px;
  font-size: 12px;
  color: var(--color-text-3);

  &.block {
    display: block;
    margin: 4px 0 0;
  }
}

.ak-box {
  border: 1px dashed var(--color-border-2);
  border-radius: 6px;
  padding: 12px 14px;
  background: var(--color-fill-1);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ak-row {
  display: flex;
  align-items: center;
  gap: 8px;

  &__label {
    flex: none;
    width: 96px;
    font-size: 13px;
    color: var(--color-text-3);
  }

  &__value {
    flex: 1;
    font-size: 13px;
  }

  code {
    flex: 1;
    font-family: 'SFMono-Regular', Consolas, Menlo, monospace;
    font-size: 12px;
    word-break: break-all;
  }
}

.ak-foot {
  margin-top: 16px;
  text-align: right;
}

.extend-info {
  margin-bottom: 12px;

  &__hint {
    margin-left: 8px;
    font-size: 12px;
    color: var(--color-text-3);
  }
}

.row-action {
  margin-left: 12px;
}

.drawer-title {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 20px 0 12px;
  font-size: 14px;
  font-weight: 600;
}

.code-lang-tip {
  margin: -4px 0 12px;
  font-size: 12px;
  color: var(--color-text-3);

  b {
    color: rgb(var(--primary-6));
  }
}

.ds-section {
  & + & {
    margin-top: 16px;
  }

  &__head {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }

  &__note {
    font-size: 12px;
    color: var(--color-text-3);
  }

  .code-block + .code-block {
    margin-top: 8px;
  }
}

.code-block {
  border: 1px solid var(--color-border-2);
  border-radius: 6px;
  overflow: hidden;
  background: #1e1e1e;

  & + & {
    margin-top: 12px;
  }

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 12px;
    background: #2a2a2a;
    font-size: 12px;
    color: #c9cdd4;

    // 深色背景上的 arco-link 默认主色(蓝)对比度不足,改成浅蓝白
    :deep(.arco-link) {
      color: #a9c7ff;

      &:hover {
        color: #d0e0ff;
      }
    }
  }

  &__lang {
    font-weight: 600;
    color: #e5e6eb;
  }

  pre {
    margin: 0;
    padding: 12px;
    overflow-x: auto;
  }

  code {
    font-family: 'SFMono-Regular', Consolas, Menlo, monospace;
    font-size: 12px;
    line-height: 1.7;
    color: #e5e6eb;
    white-space: pre;
  }
}

.code-hint {
  margin-top: 8px;
  font-size: 12px;
  color: var(--color-text-3);
  line-height: 1.7;
}
</style>