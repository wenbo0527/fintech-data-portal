<template>
  <a-modal
    :visible="visible"
    :title="stage === 'confirm' ? '批量重置账号密码' : '批量重置完成'"
    :width="700"
    :footer="false"
    :mask-closable="stage === 'confirm'"
    @cancel="close"
  >
    <!-- 第一步:影响预览 + 原因 + 确认词 -->
    <template v-if="stage === 'confirm'">
      <a-alert type="warning" show-icon class="modal-tip">
        将重置 <b>{{ resettable.length }}</b> 个账号的密码
        <template v-if="skipped.length">,另有 {{ skipped.length }} 个账号已停用将被跳过</template>。
        重置后旧密码立即失效,新密码仅在本弹窗展示一次,平台不保存明文。
      </a-alert>

      <a-table
        :columns="previewColumns"
        :data="accounts"
        row-key="id"
        size="small"
        :pagination="false"
        :scroll="{ y: 220 }"
        class="preview-table"
      >
        <template #pvAccount="{ record }">
          <code class="cell-code">{{ record.accountName }}</code>
        </template>
        <template #pvState="{ record }">
          <a-tag size="small" :color="stateMeta(record.state).tag">
            {{ stateMeta(record.state).text }}
          </a-tag>
        </template>
        <template #pvResult="{ record }">
          <span v-if="record.state === 'disabled'" class="is-skip">跳过:账号已停用</span>
          <span v-else-if="record.state === 'locked'" class="is-unlock">重置并解锁</span>
          <span v-else class="is-ok">可重置</span>
        </template>
      </a-table>

      <a-form :model="form" layout="vertical" class="batch-form">
        <a-form-item label="重置原因" required>
          <a-select v-model="form.reason" :options="reasonOptions" />
        </a-form-item>
        <a-form-item v-if="hasLocked">
          <a-checkbox v-model="form.unlock">同时解除被锁定账号的锁定</a-checkbox>
        </a-form-item>
        <a-form-item required>
          <template #label>
            请输入 <code class="confirm-key">{{ CONFIRM_KEY }}</code> 以确认
          </template>
          <a-input v-model="form.keyword" :placeholder="CONFIRM_KEY" allow-clear />
        </a-form-item>
      </a-form>

      <div class="modal-foot">
        <a-button @click="close">取消</a-button>
        <a-button
          type="primary"
          :disabled="form.keyword.trim() !== CONFIRM_KEY || resettable.length === 0"
          @click="submit"
        >确认重置 {{ resettable.length }} 个账号</a-button>
      </div>
    </template>

    <!-- 第二步:结果 + 导出 -->
    <template v-else>
      <a-alert type="success" show-icon class="modal-tip">
        成功重置 <b>{{ okCount }}</b> 个账号<template v-if="failCount">,{{ failCount }} 个已跳过</template>。
        请立即导出或复制新密码并通过可信渠道下发,关闭后无法再次查看。
      </a-alert>

      <a-table
        :columns="resultColumns"
        :data="results"
        row-key="accountName"
        size="small"
        :pagination="false"
        :scroll="{ y: 240 }"
        class="result-table"
      >
        <template #rsAccount="{ record }">
          <code class="cell-code">{{ record.accountName }}</code>
          <div class="cell-sub">{{ record.ownerName }}</div>
        </template>
        <template #rsStatus="{ record }">
          <a-tag v-if="record.ok" size="small" color="green">已重置</a-tag>
          <a-tag v-else size="small" color="red">已跳过</a-tag>
          <div v-if="!record.ok" class="cell-sub is-skip">{{ record.reason }}</div>
          <div v-else-if="record.reason" class="cell-sub">{{ record.reason }}</div>
        </template>
        <template #rsPassword="{ record }">
          <template v-if="record.ok">
            <a-space size="mini">
              <code class="cell-pwd">{{ record.password }}</code>
              <a-link @click="copyText(record.password!, '密码')">复制</a-link>
            </a-space>
          </template>
          <span v-else class="is-muted">—</span>
        </template>
      </a-table>

      <div class="modal-foot">
        <a-button @click="copyAll"><template #icon><icon-copy /></template>复制全部</a-button>
        <a-button type="primary" @click="exportCsv"><template #icon><icon-download /></template>导出 CSV</a-button>
        <a-button @click="close">我已下发,关闭</a-button>
      </div>
    </template>
  </a-modal>
</template>

<script setup lang="ts">
/**
 * 批量重置账号密码
 *
 * 两步交互:
 *   1. 影响预览 — 列出选中账号、当前状态、是否可重置,已停用账号明确标为跳过
 *   2. 结果交付 — 表格展示新密码,支持逐条复制 / 复制全部 / 导出 CSV
 *
 * 明文密码只存在于本组件内存,关闭弹窗即销毁。
 */
import { computed, reactive, ref, watch } from 'vue'
import { Message } from '@arco-design/web-vue'
import { useUqDbAccountAdminStore } from '@/stores-dca/unified-query/db-account-admin'
import type { BatchResetResult } from '@/stores-dca/unified-query/db-account-admin'
import {
  DB_ACCOUNT_STATE_META,
  RESET_PASSWORD_REASONS
} from '@/mock/unified-query/db-account-admin'
import type { DbAccount, DbAccountState } from '@/mock/unified-query/types'
import { copyText, dsLabel } from './db-account-utils'

const props = defineProps<{
  visible: boolean
  accounts: DbAccount[]
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'done'): void
}>()

const admin = useUqDbAccountAdminStore()

const CONFIRM_KEY = '确认重置'

const stage = ref<'confirm' | 'result'>('confirm')
const results = ref<BatchResetResult[]>([])
const form = reactive({ reason: RESET_PASSWORD_REASONS[1], unlock: true, keyword: '' })

const reasonOptions = RESET_PASSWORD_REASONS.map(r => ({ label: r, value: r }))

const resettable = computed(() => props.accounts.filter(a => a.state !== 'disabled'))
const skipped = computed(() => props.accounts.filter(a => a.state === 'disabled'))
const hasLocked = computed(() => props.accounts.some(a => a.state === 'locked'))

const okCount = computed(() => results.value.filter(r => r.ok).length)
const failCount = computed(() => results.value.filter(r => !r.ok).length)

watch(() => props.visible, visible => {
  if (!visible) return
  stage.value = 'confirm'
  results.value = []
  form.reason = RESET_PASSWORD_REASONS[1]
  form.unlock = true
  form.keyword = ''
})

function stateMeta(state: DbAccountState) {
  return DB_ACCOUNT_STATE_META[state]
}

const previewColumns = [
  { title: '数据库账号', dataIndex: 'accountName', slotName: 'pvAccount', width: 180 },
  { title: '所属用户', dataIndex: 'ownerName', width: 90 },
  { title: '数据源', dataIndex: 'datasource', width: 80, render: ({ record }: any) => dsLabel(record.datasource) },
  { title: '当前状态', dataIndex: 'state', slotName: 'pvState', width: 100 },
  { title: '处理方式', dataIndex: 'result', slotName: 'pvResult' }
]

const resultColumns = [
  { title: '数据库账号', dataIndex: 'accountName', slotName: 'rsAccount', width: 170 },
  { title: '结果', dataIndex: 'ok', slotName: 'rsStatus', width: 130 },
  { title: '新密码', dataIndex: 'password', slotName: 'rsPassword' }
]

function submit() {
  if (form.keyword.trim() !== CONFIRM_KEY) return
  const ids = resettable.value.map(a => a.id)
  if (ids.length === 0) {
    Message.warning('没有可重置的账号')
    return
  }
  const skippedResults: BatchResetResult[] = skipped.value.map(a => ({
    accountName: a.accountName,
    ownerName: a.ownerName,
    ok: false,
    reason: '账号已停用,需先恢复账号'
  }))
  results.value = [...admin.resetPasswords(ids, { reason: form.reason, unlock: form.unlock }), ...skippedResults]
  stage.value = 'result'
  Message.success(`已重置 ${results.value.filter(r => r.ok).length} 个账号的密码`)
}

function copyAll() {
  const lines = results.value
    .filter(r => r.ok)
    .map(r => `${r.accountName}\t${r.ownerName}\t${r.password}`)
  if (lines.length === 0) return
  copyText(`数据库账号\t所属用户\t新密码\n${lines.join('\n')}`, '全部密码')
}

/** CSV 单元格转义:密码含特殊符号,必须整体加引号 */
function csvCell(value: string): string {
  return `"${String(value).replace(/"/g, '""')}"`
}

function exportCsv() {
  const okRows = results.value.filter(r => r.ok)
  if (okRows.length === 0) return
  const pad = (n: number) => String(n).padStart(2, '0')
  const now = new Date()
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
  const stamp = `${date} ${time}`
  const header = ['数据库账号', '所属用户', '新密码', '重置时间'].map(csvCell).join(',')
  const body = okRows.map(r => [r.accountName, r.ownerName, r.password ?? '', stamp].map(csvCell).join(','))
  const content = `\uFEFF${[header, ...body].join('\r\n')}`
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `数据库账号密码重置_${date.replace(/-/g, '')}_${time.replace(/:/g, '')}.csv`
  a.click()
  URL.revokeObjectURL(url)
  Message.success('已导出 CSV,请通过可信渠道下发')
}

function close() {
  emit('update:visible', false)
  if (stage.value === 'result') {
    results.value = []
    emit('done')
  }
}
</script>

<style lang="scss" scoped>
.modal-tip {
  margin-bottom: 12px;

  b {
    color: rgb(var(--danger-6));
  }
}

.preview-table,
.result-table {
  margin-bottom: 16px;
}

.cell-code {
  font-family: 'SFMono-Regular', Consolas, Menlo, monospace;
  font-size: 12px;
}

.cell-pwd {
  font-family: 'SFMono-Regular', Consolas, Menlo, monospace;
  font-size: 12px;
  letter-spacing: 0.5px;
}

.cell-sub {
  margin-top: 2px;
  font-size: 12px;
  color: var(--color-text-3);

  &.is-skip {
    color: rgb(var(--danger-6));
  }
}

.is-ok {
  font-size: 12px;
  color: rgb(var(--success-6));
}

.is-skip {
  font-size: 12px;
  color: rgb(var(--danger-6));
}

.is-unlock {
  font-size: 12px;
  color: rgb(var(--warning-6));
}

.is-muted {
  color: var(--color-text-4);
}

.batch-form {
  margin-top: 4px;
}

.confirm-key {
  padding: 0 4px;
  border-radius: 3px;
  background: var(--color-fill-2);
  color: rgb(var(--danger-6));
}

.modal-foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>