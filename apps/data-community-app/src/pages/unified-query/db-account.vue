<template>
  <PageContainer size="wide" :with-bg="false" class="uq-account-page">
    <PageHeader title="数据库账号管理" sub-title="按用户申请 Doris / Hive 账号权限,并为 Python / R 签发访问 Key">
      <template #extra>
        <a-space size="mini">
          <a-button @click="router.push({ name: 'unified-query-db-account-admin' })">
            <template #icon><icon-settings /></template>
            管理端
          </a-button>
          <a-button @click="router.push({ name: 'unified-query-sql' })">
            <template #icon><icon-code /></template>
            统一查询
          </a-button>
          <a-button type="primary" @click="grantPanel?.openApply('doris')">
            <template #icon><icon-plus /></template>
            申请数据源权限
          </a-button>
        </a-space>
      </template>
    </PageHeader>

    <div class="content-wrapper">
      <a-alert type="info" show-icon class="page-tip">
        <template #title>数据库账号按用户独立开通</template>
        当前申请人:<b>{{ ACCOUNT_OWNER.name }}</b>({{ ACCOUNT_OWNER.department }} / {{ ACCOUNT_OWNER.employeeNo }})。
        提交申请后进入 DBA 审批(演示约 2 秒自动通过);访问 Key 用于 Python / R 客户端连接,
        SecretKey 仅在创建或重置时展示一次,请及时保存。
      </a-alert>

      <!-- 概览 -->
      <a-row :gutter="12" class="stat-row">
        <a-col v-for="card in statCards" :key="card.key" :span="6">
          <div class="stat-card is-link" @click="activeTab = card.tab">
            <div class="stat-title">
              {{ card.title }}
              <a-tag v-if="card.status" size="small" :color="DB_ACCOUNT_STATUS_META[card.status].tag">
                {{ DB_ACCOUNT_STATUS_META[card.status].text }}
              </a-tag>
            </div>
            <div class="stat-value" :class="[`tone-${card.tone}`, { 'is-code': card.code }]">{{ card.value }}</div>
            <div class="stat-desc">{{ card.desc }}</div>
          </div>
        </a-col>
      </a-row>

      <a-tabs v-model:active-key="activeTab" type="rounded" class="account-tabs">
        <a-tab-pane key="grants" title="数据源权限">
          <DbGrantPanel ref="grantPanel" />
        </a-tab-pane>
        <a-tab-pane key="keys" title="访问 Key">
          <AccessKeyPanel />
        </a-tab-pane>
      </a-tabs>
    </div>
  </PageContainer>
</template>

<script setup lang="ts">
/**
 * 统一查询 · 数据库账号管理
 *
 * 两块能力:
 *   1. 数据源权限 — 按用户申请 Doris / Hive 库级授权(只读 / 读写),已开通可续期 / 释放
 *   2. 访问 Key  — 供 Python / R 客户端连接,创建 / 重置时一次性展示 SecretKey
 *
 * 全部为前端 Mock,不发起任何 HTTP 请求;审批流由 store 定时器模拟。
 */
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageContainer from '@/components-dca/common/PageContainer.vue'
import PageHeader from '@/components-dca/common/PageHeader.vue'
import DbGrantPanel from '@/components-dca/unified-query/DbGrantPanel.vue'
import AccessKeyPanel from '@/components-dca/unified-query/AccessKeyPanel.vue'
import { useUqDbAccountStore } from '@/stores-dca/unified-query/db-account'
import { ACCOUNT_OWNER, DB_ACCOUNT_STATUS_META } from '@/mock/unified-query/db-account'
import type { DbAccountStatus } from '@/mock/unified-query/types'
import { scopeText, toneOf } from '@/components-dca/unified-query/db-account-utils'

const router = useRouter()
const store = useUqDbAccountStore()

const activeTab = ref<'grants' | 'keys'>('grants')
const grantPanel = ref<InstanceType<typeof DbGrantPanel> | null>(null)

/** 概览:两个数据源的当前账号状态 + Key / 审批统计 */
const statCards = computed(() => {
  const d = store.dorisGrant
  const h = store.hiveGrant
  return [
    {
      key: 'doris',
      title: 'Doris 账号',
      status: d?.status ?? ('revoked' as DbAccountStatus),
      value: d?.accountName ?? '未开通',
      code: true,
      tone: toneOf(d?.status ?? 'revoked'),
      desc: d ? `${scopeText(d)} · ${d.privilege === 'read' ? '只读' : '读写'}` : '点击申请开通',
      tab: 'grants' as const
    },
    {
      key: 'hive',
      title: 'Hive 账号',
      status: h?.status ?? ('revoked' as DbAccountStatus),
      value: h?.accountName ?? '未开通',
      code: true,
      tone: toneOf(h?.status ?? 'revoked'),
      desc: h ? `${scopeText(h)} · ${h.privilege === 'read' ? '只读' : '读写'}` : '点击申请开通',
      tab: 'grants' as const
    },
    {
      key: 'keys',
      title: '有效访问 Key',
      value: `${store.stats.activeKeys}`,
      code: false,
      tone: 'ok',
      desc: `共 ${store.keys.length} 个 · 累计调用 ${store.stats.callCount.toLocaleString()} 次`,
      tab: 'keys' as const
    },
    {
      key: 'pending',
      title: '审批中',
      value: `${store.stats.pending}`,
      code: false,
      tone: store.stats.pending ? 'warn' : 'muted',
      desc: '账号申请待 DBA 处理',
      tab: 'grants' as const
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
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--color-text-2);
}

.stat-value {
  margin-top: 8px;
  font-size: 22px;
  font-weight: 600;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;

  &.is-code {
    font-size: 16px;
    font-family: 'SFMono-Regular', Consolas, Menlo, monospace;
  }

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