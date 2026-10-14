<template>
  <div class="coupon-detail-container">
    <a-card class="form-card">
      <div class="page-header">
        <h2 class="page-title">优惠券详情</h2>
        <a-button type="outline" @click="goBackAction" style="margin-left: auto">
          <template #icon><IconLeft /></template>
          返回
        </a-button>
      </div>

      <!-- v1.6.3: 详情数据不再硬编码 mock,直接从 couponMockData 按路由参数取点击行实例,
           与券管理列表详情抽屉复用同一 InventoryDetailPanel 组件 -->
      <a-empty
        v-if="!record"
        description="未找到对应的券库存实例，请从券管理列表点击进入"
        style="padding: 40px 0"
      />
      <InventoryDetailPanel v-else :record="record" />
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { goBack } from '@/router/utils'
import { IconLeft } from '@arco-design/web-vue/es/icon'
import { couponMockData } from '@/mock/coupon'
import InventoryDetailPanel from './components/InventoryDetailPanel.vue'

const route = useRoute()
const router = useRouter()
const goBackAction = () => goBack(router, '/marketing/benefit/management')

const record = ref<Record<string, any> | null>(null)

onMounted(() => {
  // 兼容两种入参口径: instanceId 可能是列表行 id(如 '1') 或券实例号(如 'I001')
  const instanceId = String(route.query.instanceId || '')
  if (instanceId) {
    record.value =
      couponMockData.find((r) => r.id === instanceId || r.instanceId === instanceId) || null
  }
})
</script>

<style scoped>
.coupon-detail-container {
  padding: 20px;
}

.form-card {
  margin-top: 20px;
}

.page-header {
  display: flex;
  align-items: center;
  margin-bottom: 24px;
}

.page-title {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
}
</style>
