<template>
  <div class="audit-panel">
    <a-alert type="info" show-icon class="panel-tip">
      <template #title>管理操作全程留痕</template>
      重置密码、修改权限、锁定 / 停用 / 回收账号、重置与吊销密钥均会写入审计流水,保留期 180 天,
      可用于安全稽核与责任追溯。
    </a-alert>

    <div class="toolbar">
      <a-input-search
        v-model="keyword"
        placeholder="搜索账号 / AccessKeyId / 用户"
        allow-clear
        style="width: 240px"
      />
      <a-select v-model="actionFilter" :options="actionOptions" style="width: 150px" />
      <a-button :disabled="!hasFilter" @click="resetFilter">重置</a-button>
      <span class="toolbar-hint">共 {{ rows.length }} 条操作记录</span>
    </div>

    <a-table
      :columns="columns"
      :data="rows"
      row-key="id"
      size="medium"
      :pagination="{ pageSize: 10, showTotal: true, sizeCanChange: false }"
    >
      <template #colTs="{ record }">
        <div>{{ dateOf(record.ts) }}</div>
        <div class="cell-sub">{{ timeOf(record.ts) }}</div>
      </template>
      <template #colAction="{ record }">
        <a-tag size="small" :color="actionTag(record.action).tag">{{ record.action }}</a-tag>
      </template>
      <template #colTarget="{ record }">
        <code class="cell-code">{{ record.target }}</code>
      </template>
      <template #colDetail="{ record }">
        <span class="cell-detail">{{ record.detail }}</span>
      </template>
    </a-table>
  </div>
</template>

<script setup lang="ts">
/**
 * 数据库账号 · 管理操作审计(管理端)
 *
 * 只读流水:谁在什么时候对哪个账号做了什么,附带原因说明。
 */
import { computed, ref } from 'vue'
import { useUqDbAccountAdminStore } from '@/stores-dca/unified-query/db-account-admin'
import { dateOf, timeOf } from './db-account-utils'

const admin = useUqDbAccountAdminStore()

const keyword = ref('')
const actionFilter = ref('all')

const ACTION_LEVEL_META: Record<string, { tag: string }> = {
  '重置密码': { tag: 'arcoblue' },
  '修改权限': { tag: 'purple' },
  '锁定账号': { tag: 'orange' },
  '解锁账号': { tag: 'green' },
  '停用账号': { tag: 'orangered' },
  '回收账号': { tag: 'red' },
  '重置密钥': { tag: 'orangered' },
  '停用密钥': { tag: 'orange' },
  '启用密钥': { tag: 'green' },
  '吊销密钥': { tag: 'red' }
}

// color 为自定义色时会统一使用白字,因此不能使用 gray / lime 这类浅色
function actionTag(action: string) {
  return ACTION_LEVEL_META[action] ?? { tag: 'arcoblue' }
}

const actionOptions = computed(() => {
  const actions = [...new Set(admin.audits.map(a => a.action))]
  return [{ label: '全部操作', value: 'all' }, ...actions.map(a => ({ label: a, value: a }))]
})

const hasFilter = computed(() => !!keyword.value || actionFilter.value !== 'all')

function resetFilter() {
  keyword.value = ''
  actionFilter.value = 'all'
}

const rows = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return admin.audits.filter(a => {
    if (actionFilter.value !== 'all' && a.action !== actionFilter.value) return false
    if (!kw) return true
    return [a.target, a.targetUser, a.operator].some(f => f.toLowerCase().includes(kw))
  })
})

const columns = [
  { title: '操作时间', dataIndex: 'ts', slotName: 'colTs', width: 150 },
  { title: '操作', dataIndex: 'action', slotName: 'colAction', width: 110 },
  { title: '影响对象', dataIndex: 'target', slotName: 'colTarget', width: 190 },
  { title: '所属用户', dataIndex: 'targetUser', width: 100 },
  { title: '操作人', dataIndex: 'operator', width: 120 },
  { title: '说明', dataIndex: 'detail', slotName: 'colDetail' }
]
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

.cell-sub {
  margin-top: 2px;
  font-size: 12px;
  color: var(--color-text-3);
}

.cell-code {
  font-family: 'SFMono-Regular', Consolas, Menlo, monospace;
  font-size: 12px;
}

.cell-detail {
  font-size: 12px;
  color: var(--color-text-2);
  line-height: 1.6;
}
</style>