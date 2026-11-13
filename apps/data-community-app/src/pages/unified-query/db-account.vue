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
        SecretKey 仅在创建时展示一次,遗失需删除后重建。
      </a-alert>

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
 *   1. 数据源权限 — 按用户申请 Doris / Hive 库级只读授权(读写 / 管理权限由 DBA 管理端授予),账号长期有效,已开通可释放
 *   2. 访问 Key  — 供 Python / R 客户端连接,创建时一次性展示 SecretKey,到期可续期
 *
 * 全部为前端 Mock,不发起任何 HTTP 请求;审批流由 store 定时器模拟。
 */
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import PageContainer from '@/components-dca/common/PageContainer.vue'
import PageHeader from '@/components-dca/common/PageHeader.vue'
import DbGrantPanel from '@/components-dca/unified-query/DbGrantPanel.vue'
import AccessKeyPanel from '@/components-dca/unified-query/AccessKeyPanel.vue'
import { ACCOUNT_OWNER } from '@/mock/unified-query/db-account'

const router = useRouter()

const activeTab = ref<'grants' | 'keys'>('grants')
const grantPanel = ref<InstanceType<typeof DbGrantPanel> | null>(null)
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

</style>