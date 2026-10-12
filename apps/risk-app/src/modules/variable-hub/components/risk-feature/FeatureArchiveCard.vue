<!--
  midloan 特征档案卡 · 文档 B2 R03~R05
  展示 midloan 特征专属 11+ 字段
-->
<template>
  <a-card title="特征档案" class="detail-card">
    <a-descriptions :column="1" bordered size="small">
      <a-descriptions-item label="特征ID">{{ data.midloanFeatureId || '—' }}</a-descriptions-item>
      <a-descriptions-item label="衍生需求ID">{{ data.derivationId || '—' }}</a-descriptions-item>
      <a-descriptions-item label="数据底表">
        <a-space>
          <span :class="{ 'missing-table': !data.dataTableName }">
            {{ data.dataTableName || '未补充（必填）' }}
          </span>
          <a-button v-if="!data.dataTableName" size="mini" type="primary" @click="$emit('supplement-table')">补充</a-button>
          <a-button v-else size="mini" @click="$emit('supplement-table')">修改</a-button>
        </a-space>
      </a-descriptions-item>
      <a-descriptions-item label="数仓任务ID">{{ data.dwTaskId || '—' }}</a-descriptions-item>
      <a-descriptions-item label="数仓上线时间">{{ data.dwOnlineTime || data.dwOnlineAt || '—' }}</a-descriptions-item>
      <a-descriptions-item label="已提交时间">{{ data.registeredAt || '—' }}</a-descriptions-item>
      <a-descriptions-item label="开发中(OA)时间">{{ data.developingOaAt || '—' }}</a-descriptions-item>
      <a-descriptions-item label="业务验证时间">{{ data.verifiedAt || '—' }}</a-descriptions-item>
      <a-descriptions-item label="内数同步时间">{{ data.syncingInternalAt || '—' }}</a-descriptions-item>
      <a-descriptions-item label="特征中心同步时间">{{ data.syncingVariableAt || '—' }}</a-descriptions-item>
      <a-descriptions-item label="OA开发单号">{{ data.devOaOrderId || '—' }}</a-descriptions-item>
      <a-descriptions-item label="OA验收单号（历史）">{{ data.verifyOaOrderId || '—' }}</a-descriptions-item>
      <a-descriptions-item label="验收人">{{ data.acceptor || '—' }}</a-descriptions-item>
      <a-descriptions-item label="接口号">{{ data.apiNo || '—' }}</a-descriptions-item>
      <a-descriptions-item label="上线时间">{{ data.onlineTime || '—' }}</a-descriptions-item>
      <a-descriptions-item label="下线时间">{{ data.offlineTime || '—' }}</a-descriptions-item>
    </a-descriptions>
  </a-card>
</template>

<script setup lang="ts">
interface Props {
  data: any
}

defineProps<Props>()
defineEmits<{
  (e: 'supplement-table'): void
}>()
</script>

<style scoped>
.missing-table {
  color: #f53f3f;
  font-style: italic;
}
</style>
