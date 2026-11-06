<template>
  <PageContainer size="wide" :with-bg="false" class="uq-account-admin">
    <PageHeader title="数据库账号管理 · 管理端" sub-title="DBA 视角:全库账号、密码重置、权限调整与操作审计">
      <template #extra>
        <a-space size="mini">
          <a-button @click="router.push({ name: 'unified-query-db-account' })">
            <template #icon><icon-user /></template>
            用户自助入口
          </a-button>
          <a-button @click="router.push({ name: 'unified-query-sql' })">
            <template #icon><icon-code /></template>
            统一查询
          </a-button>
        </a-space>
      </template>
    </PageHeader>

    <div class="content-wrapper">
      <a-alert type="warning" show-icon class="page-tip">
        <template #title>当前为管理员视角</template>
        操作人:<b>{{ ADMIN_OPERATOR }}</b>。这里的改动直接作用于库内真实账号与密钥,
        包括重置用户密码、调整授权库、锁定 / 回收账号;所有动作都会写入
        <a-link @click="activeTab = 'audits'">操作审计</a-link>。
      </a-alert>

      <!-- 概览 -->
      <a-row :gutter="12" class="stat-row">
        <a-col v-for="card in statCards" :key="card.key" :span="6">
          <div class="stat-card is-link" @click="activeTab = card.tab">
            <div class="stat-title">{{ card.title }}</div>
            <div class="stat-value" :class="`tone-${card.tone}`">{{ card.value }}</div>
            <div class="stat-desc">{{ card.desc }}</div>
          </div>
        </a-col>
      </a-row>

      <a-tabs v-model:active-key="activeTab" type="rounded" class="account-tabs">
        <a-tab-pane key="accounts" title="账号清单">
          <DbAccountTable />
        </a-tab-pane>
        <a-tab-pane key="keys" title="访问 Key">
          <DbAdminKeyPanel />
        </a-tab-pane>
        <a-tab-pane key="audits" title="操作审计">
          <DbAdminAuditPanel />
        </a-tab-pane>
      </a-tabs>
    </div>
  </PageContainer>
</template>

<script setup lang="ts">
/**
 * 统一查询 · 数据库账号管理(管理端)
 *
 * 与用户自助版并存:
 *   自助版 — 用户申请 Doris / Hive 权限、创建自己的访问 Key
 *   管理端 — DBA 管理全库账号:重置密码、改权限、锁定 / 停用 / 回收,并审计留痕
 *
 * 演示环境两个版本共用同一份「真实库」:用户在自助侧开通的账号会同步进本清单。
 */
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageContainer from '@/components-dca/common/PageContainer.vue'
import PageHeader from '@/components-dca/common/PageHeader.vue'
import DbAccountTable from '@/components-dca/unified-query/DbAccountTable.vue'
import DbAdminKeyPanel from '@/components-dca/unified-query/DbAdminKeyPanel.vue'
import DbAdminAuditPanel from '@/components-dca/unified-query/DbAdminAuditPanel.vue'
import { useUqDbAccountAdminStore } from '@/stores-dca/unified-query/db-account-admin'
import { ADMIN_OPERATOR, passwordState } from '@/mock/unified-query/db-account-admin'

const router = useRouter()
const admin = useUqDbAccountAdminStore()

const activeTab = ref<'accounts' | 'keys' | 'audits'>('accounts')

/** 把自助侧新开通的账号 / 新建的 Key 并入全库清单 */
onMounted(() => admin.syncSelfService())

const statCards = computed(() => {
  const { total, abnormal, activeKeys, totalCalls } = admin.stats
  const passwordPending = admin.accounts.filter(a => passwordState(a) !== 'ok').length
  const expired = admin.accounts.filter(a => passwordState(a) === 'expired').length
  const locked = admin.accounts.filter(a => a.state === 'locked').length
  return [
    {
      key: 'total',
      title: '全库账号',
      value: `${total}`,
      tone: 'ok',
      desc: `正常 ${total - abnormal} 个 · 已锁定 ${locked} 个 · 已停用 ${abnormal - locked} 个`,
      tab: 'accounts' as const
    },
    {
      key: 'password',
      title: '密码待处理',
      value: `${passwordPending}`,
      tone: passwordPending ? 'warn' : 'muted',
      desc: `其中已过期 ${expired} 个,建议批量重置后下发`,
      tab: 'accounts' as const
    },
    {
      key: 'keys',
      title: '有效访问 Key',
      value: `${activeKeys}`,
      tone: 'ok',
      desc: `共 ${admin.keys.length} 个 · 累计调用 ${totalCalls.toLocaleString()} 次`,
      tab: 'keys' as const
    },
    {
      key: 'audits',
      title: '操作审计',
      value: `${admin.audits.length}`,
      tone: 'muted',
      desc: '管理端所有动作均可追溯',
      tab: 'audits' as const
    }
  ]
})
</script>

<style lang="scss" scoped>
.content-wrapper {
  padding: 0 24px 24px;
}

.page-tip {
  margin-bottom: 12px;

  b {
    color: rgb(var(--primary-6));
  }
}

.stat-row {
  margin-bottom: 12px;
}

.stat-card {
  padding: 14px 16px;
  border: 1px solid var(--color-border-2);
  border-radius: 8px;
  background: var(--color-bg-2);
  height: 100%;

  &.is-link {
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      border-color: rgb(var(--primary-5));
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
    }
  }
}

.stat-title {
  font-size: 13px;
  color: var(--color-text-2);
}

.stat-value {
  margin-top: 8px;
  font-size: 22px;
  font-weight: 600;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;

  &.tone-ok { color: rgb(var(--success-6)); }
  &.tone-warn { color: rgb(var(--warning-6)); }
  &.tone-danger { color: rgb(var(--danger-6)); }
  &.tone-muted { color: var(--color-text-3); }
}

.stat-desc {
  margin-top: 6px;
  font-size: 12px;
  color: var(--color-text-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>