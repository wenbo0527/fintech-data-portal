<template>
  <div class="key-panel">
    <a-alert type="warning" show-icon class="key-tip">
      SecretKey 等同数据库密码,请勿写入代码仓库或明文分享。Key 仅在已开通或审批中的数据源上可选,
      停用后将立即阻断 Python / R 客户端连接。
    </a-alert>

    <div class="toolbar">
      <a-input-search
        v-model="keyword"
        placeholder="搜索名称 / AccessKeyId"
        allow-clear
        style="width: 220px"
      />
      <a-select v-model="langFilter" :options="langFilterOptions" style="width: 140px" />
      <a-select v-model="statusFilter" :options="statusOptions" style="width: 130px" />
      <a-button :disabled="!keyword && langFilter === 'all' && statusFilter === 'all'" @click="resetFilter">
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
      :scroll="{ x: 1200 }"
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
      <template #keyLang="{ record }">
        <a-tag size="small" :color="langMeta(record.language).tag">
          {{ langMeta(record.language).text }}
        </a-tag>
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
        <div>{{ record.lastUsedAt ?? '从未使用' }}</div>
        <div class="cell-sub">累计调用 {{ record.callCount.toLocaleString() }} 次</div>
      </template>
      <template #keyOps="{ record }">
        <a-space size="mini" wrap>
          <a-link @click="openDetail(record)">代码示例</a-link>
          <a-link @click="confirmReset(record)">重置密钥</a-link>
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
          <a-input v-model="form.name" placeholder="如:风控建模-Python" allow-clear />
        </a-form-item>
        <a-form-item label="适用语言" required>
          <a-radio-group v-model="form.language" type="button">
            <a-radio value="python">Python</a-radio>
            <a-radio value="r">R</a-radio>
            <a-radio value="both">两者</a-radio>
          </a-radio-group>
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

    <!-- 密钥一次性展示 -->
    <a-modal
      v-model:visible="secretVisible"
      :title="secretPayload?.mode === 'reset' ? '密钥已重置' : '访问 Key 创建成功'"
      :footer="false"
      :width="600"
      :mask-closable="false"
    >
      <a-alert type="warning" show-icon class="modal-tip">
        SecretKey 仅显示这一次,关闭后无法再次查看,请立即保存到安全位置。
      </a-alert>
      <div v-if="secretPayload" class="secret-box">
        <div class="secret-row">
          <span class="secret-row__label">AccessKeyId</span>
          <code>{{ secretPayload.accessKeyId }}</code>
          <a-link @click="copyText(secretPayload.accessKeyId, 'AccessKeyId')"><icon-copy /> 复制</a-link>
        </div>
        <div class="secret-row">
          <span class="secret-row__label">SecretKey</span>
          <code class="secret-row__secret">{{ secretPayload.secretKey }}</code>
          <a-link @click="copyText(secretPayload.secretKey, 'SecretKey')"><icon-copy /> 复制</a-link>
        </div>
      </div>
      <div class="secret-foot">
        <a-button type="primary" @click="secretVisible = false">我已保存</a-button>
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
          <a-descriptions-item label="SecretKey">
            <code class="is-muted">{{ maskSecret(detail.secretKey) }}</code>
            <a-link class="reset-link" @click="confirmReset(detail)">重置密钥</a-link>
          </a-descriptions-item>
          <a-descriptions-item label="适用语言">{{ CLIENT_LANGUAGE_META[detail.language].text }}</a-descriptions-item>
          <a-descriptions-item label="授权数据源">
            <a-space size="mini">
              <a-tag v-for="ds in detail.datasources" :key="ds" size="small">{{ dsLabel(ds) }}</a-tag>
            </a-space>
          </a-descriptions-item>
          <a-descriptions-item label="状态">{{ ACCESS_KEY_STATUS_META[detail.status].text }}</a-descriptions-item>
          <a-descriptions-item label="有效期">{{ detail.createdAt }} ~ {{ detail.expireAt }}</a-descriptions-item>
          <a-descriptions-item label="最近使用">{{ detail.lastUsedAt ?? '从未使用' }}</a-descriptions-item>
          <a-descriptions-item label="用途">{{ detail.purpose }}</a-descriptions-item>
        </a-descriptions>

        <div class="drawer-title">
          连接示例
          <a-radio-group v-model="codeLang" size="mini" type="button" class="code-lang">
            <a-radio value="python">Python</a-radio>
            <a-radio value="r">R</a-radio>
          </a-radio-group>
        </div>
        <div class="code-block">
          <div class="code-block__head">
            <span>{{ CONNECTION_ENDPOINT[detail.datasources[0]].host }}</span>
            <a-link @click="copyText(codeSnippet, '连接示例')"><icon-copy /> 复制代码</a-link>
          </div>
          <pre><code>{{ codeSnippet }}</code></pre>
        </div>
        <div class="code-hint">
          代码中的 &lt;SecretKey&gt; 需替换为创建 / 重置时保存的密钥;Doris 走 MySQL 协议,
          Hive 走 HiveServer2。密钥泄露时应立即重置。
        </div>
      </template>
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
/**
 * 统一查询 · 数据库账号管理 —— 访问 Key 面板
 *
 * 为 Python / R 客户端签发 AccessKeyId + SecretKey:
 * 创建 / 重置时一次性展示密钥,支持停用、启用、删除与连接示例复制。
 */
import { computed, reactive, ref } from 'vue'
import { Message, Modal } from '@arco-design/web-vue'
import { useUqDbAccountStore } from '@/stores-dca/unified-query/db-account'
import {
  ACCESS_KEY_STATUS_META,
  ACCOUNT_PURPOSE_OPTIONS,
  buildPythonSnippet,
  buildRSnippet,
  CLIENT_LANGUAGE_META,
  CONNECTION_ENDPOINT,
  KEY_EXPIRE_OPTIONS
} from '@/mock/unified-query/db-account'
import type {
  AccessKeyRecord,
  AccessKeyStatus,
  ClientLanguage,
  DataSourceKey
} from '@/mock/unified-query/types'
import { copyText, daysLeft, dsLabel, maskSecret } from './db-account-utils'

const store = useUqDbAccountStore()

/* 表格插槽的 record 为 any,用带类型的取值函数避免 TS7053 */
const langMeta = (language: ClientLanguage) => CLIENT_LANGUAGE_META[language]
const keyStatusMeta = (status: AccessKeyStatus) => ACCESS_KEY_STATUS_META[status]

/* ── 筛选 ─────────────────────────────── */
const keyword = ref('')
const langFilter = ref<'all' | ClientLanguage>('all')
const statusFilter = ref<'all' | AccessKeyStatus>('all')

const langFilterOptions = [
  { label: '全部语言', value: 'all' },
  ...(Object.keys(CLIENT_LANGUAGE_META) as ClientLanguage[]).map(l => ({
    label: CLIENT_LANGUAGE_META[l].text,
    value: l
  }))
]

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
    if (langFilter.value !== 'all' && k.language !== langFilter.value) return false
    if (statusFilter.value !== 'all' && k.status !== statusFilter.value) return false
    if (kw && !k.name.toLowerCase().includes(kw) && !k.accessKeyId.toLowerCase().includes(kw)) return false
    return true
  })
})

function resetFilter() {
  keyword.value = ''
  langFilter.value = 'all'
  statusFilter.value = 'all'
}

const columns = [
  { title: '名称', dataIndex: 'name', slotName: 'keyName', width: 160 },
  { title: 'AccessKeyId', dataIndex: 'accessKeyId', slotName: 'keyAk', width: 200 },
  { title: '授权数据源', dataIndex: 'datasources', slotName: 'keyDs', width: 110 },
  { title: '适用语言', dataIndex: 'language', slotName: 'keyLang', width: 95 },
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
  language: ClientLanguage
  datasources: DataSourceKey[]
  expireDays: number
  purpose: string
}>({
  name: '',
  language: 'python',
  datasources: [],
  expireDays: 90,
  purpose: ''
})

function openCreate() {
  form.name = ''
  form.language = 'python'
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
    language: form.language,
    datasources: [...form.datasources],
    expireDays: form.expireDays,
    purpose: form.purpose.trim()
  })
  createVisible.value = false
  showSecret('create', record)
}

/* ── 密钥弹窗 ─────────────────────────── */
const secretVisible = ref(false)
const secretPayload = ref<{
  mode: 'create' | 'reset'
  name: string
  accessKeyId: string
  secretKey: string
} | null>(null)

function showSecret(mode: 'create' | 'reset', record: AccessKeyRecord) {
  secretPayload.value = {
    mode,
    name: record.name,
    accessKeyId: record.accessKeyId,
    secretKey: record.secretKey
  }
  secretVisible.value = true
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

function confirmReset(record: AccessKeyRecord) {
  Modal.confirm({
    title: '重置 SecretKey',
    content: `重置后旧密钥立即失效,使用「${record.name}」的 Python / R 连接需要同步更新。确定继续?`,
    okText: '确定重置',
    cancelText: '取消',
    onOk: () => {
      const secret = store.resetSecret(record.id)
      if (!secret) return Message.error('重置失败,Key 不存在')
      showSecret('reset', record)
    }
  })
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
const codeLang = ref<'python' | 'r'>('python')

function openDetail(record: AccessKeyRecord) {
  detail.value = record
  codeLang.value = record.language === 'r' ? 'r' : 'python'
  detailVisible.value = true
}

const codeSnippet = computed(() => {
  const key = detail.value
  if (!key) return ''
  return codeLang.value === 'python' ? buildPythonSnippet(key) : buildRSnippet(key)
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

  &.block {
    display: block;
    margin: 4px 0 0;
  }
}

.secret-box {
  border: 1px dashed var(--color-border-2);
  border-radius: 6px;
  padding: 12px 14px;
  background: var(--color-fill-1);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.secret-row {
  display: flex;
  align-items: center;
  gap: 8px;

  &__label {
    flex: none;
    width: 96px;
    font-size: 13px;
    color: var(--color-text-3);
  }

  code {
    flex: 1;
    font-family: 'SFMono-Regular', Consolas, Menlo, monospace;
    font-size: 12px;
    word-break: break-all;
  }

  &__secret {
    color: rgb(var(--danger-6));
  }
}

.secret-foot {
  margin-top: 16px;
  text-align: right;
}

.reset-link {
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

.code-lang {
  margin-left: auto;
}

.code-block {
  border: 1px solid var(--color-border-2);
  border-radius: 6px;
  overflow: hidden;
  background: #1e1e1e;

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