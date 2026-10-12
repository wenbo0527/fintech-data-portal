<template>
  <div class="external-data-service">
    <a-page-header title="外数数据服务" />
    <a-card :bordered="true" class="toolbar">
      <a-form :model="filters" layout="inline">
        <a-form-item field="supplier" label="供应商">
          <a-select v-model="filters.supplier" allow-clear placeholder="选择供应商" style="width: 200px">
            <a-option v-for="s in supplierOptions" :key="s" :value="s">{{ s }}</a-option>
          </a-select>
        </a-form-item>
        <a-form-item field="serviceType" label="服务类型">
          <a-select v-model="filters.serviceType" allow-clear placeholder="选择类型" style="width: 220px">
            <a-option value="在线批量调用">在线批量调用</a-option>
            <a-option value="外数离线回溯申请">外数离线回溯申请</a-option>
            <a-option value="周期跑批任务申请">周期跑批任务申请</a-option>
            <a-option value="全量特征回溯申请">全量特征回溯申请</a-option>
            <a-option value="风险合规离线回溯申请">风险合规离线回溯申请</a-option>
            <a-option value="外数线上调用服务申请">外数线上调用服务申请</a-option>
            <a-option value="外数回溯落库申请">外数回溯落库申请</a-option>
          </a-select>
        </a-form-item>
        <a-form-item field="status" label="状态">
          <a-select v-model="filters.status" allow-clear placeholder="选择状态" style="width: 160px">
            <a-option value="draft">草稿</a-option>
            <a-option value="approving">审批中</a-option>
            <a-option value="executing">执行中</a-option>
            <a-option value="completed">已完成</a-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-button type="primary" @click="applyFilter">查询</a-button>
          <a-button style="margin-left: 8px" @click="resetFilter">重置</a-button>
          <a-button style="margin-left: 8px" type="outline" @click="goToScene">发起新服务</a-button>
          <a-button style="margin-left: 8px" type="outline" status="warning" @click="goToAccompany">查看陪跑计划</a-button>
        </a-form-item>
      </a-form>
    </a-card>
    <a-card title="服务列表">
      <a-table :data="displayedServices" row-key="id" :pagination="pagination" @page-change="onPageChange">
        <template #columns>
          <a-table-column title="服务名称" data-index="name" :width="200" />
          <a-table-column title="服务类型" :width="180">
            <template #cell="{ record }">{{ record.serviceType }}</template>
          </a-table-column>
          <a-table-column title="关联外数产品" data-index="relatedProduct" :width="200">
             <template #cell="{ record }">{{ record.relatedProduct || '-' }}</template>
          </a-table-column>
          <a-table-column title="状态" :width="100">
             <template #cell="{ record }"><a-tag :color="statusTag(record.status)">{{ statusLabel(record.status) }}</a-tag></template>
          </a-table-column>
          <a-table-column title="创建人" data-index="creator" :width="120" />
          <a-table-column title="提出时间" :width="180">
             <template #cell="{ record }">{{ formatDate(record.createdAt) }}</template>
          </a-table-column>
          <a-table-column title="操作" :width="120" fixed="right">
            <template #cell="{ record }"><a-button size="mini" type="outline" @click="openEdit(record)">编辑</a-button></template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>

    <ServiceApplicationDrawer
      v-model:visible="createVisible"
      :edit-mode="editMode"
      :initial-data="editingData"
      @success="load"
    />
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { useExternalDataStore } from '@/modules/external-data/stores'
import ServiceApplicationDrawer from '../components/ServiceApplicationDrawer.vue'

const store = useExternalDataStore()
const router = useRouter()
const route = useRoute()

type ServiceType = '在线批量调用' | '外数离线回溯申请' | '周期跑批任务申请' | '全量特征回溯申请' | '风险合规离线回溯申请' | '外数线上调用服务申请' | '外数回溯落库申请'

const supplierOptions = computed(() => {
  const suppliers = new Set<string>()
  store.products.forEach(p => { if (p.supplier) suppliers.add(p.supplier) })
  return Array.from(suppliers)
})

const filters = reactive<{ supplier?: string; serviceType?: ServiceType; status?: string }>({})
const services = ref<any[]>([])
const pagination = reactive({ total: 0, pageSize: 10, current: 1, showTotal: true })
const displayedServices = computed<any[]>(() => {
  return (services.value as Array<{ serviceType?: string; status?: string; supplier?: string }>).filter((x) => {
    if (filters.serviceType && x.serviceType !== filters.serviceType) return false
    if (filters.status && x.status !== filters.status) return false
    if (filters.supplier && x.supplier !== filters.supplier) return false
    return true
  })
})
const resetFilter = () => { filters.serviceType = undefined; filters.status = undefined; filters.supplier = undefined }
const applyFilter = () => { /* 可以在这里添加额外的查询逻辑，目前computed已经处理了 */ }
const onPageChange = (page: number) => { pagination.current = page }
const statusLabel = (s: string) => ({ draft: '草稿', approving: '审批中', executing: '执行中', completed: '已完成' }[s] || s)
const statusTag = (s: string) => ({ draft: 'gray', approving: 'blue', executing: 'orangered', completed: 'green' }[s] || 'gray')
const formatDate = (d: string) => d ? new Date(d).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'
const load = async () => {
  try {
    await store.fetchProducts()
    await store.fetchServices()
    services.value = store.services || []
    pagination.total = services.value.length
    Message.success('已加载服务列表')
  } catch {
    Message.error('加载失败')
  }
}
onMounted(load)

const createVisible = ref(false)
const editMode = ref(false)
const editingData = ref<any>(null)

// ?mode=create 时自动打开新建抽屉
function handleRouteMode(query: Record<string, any>) {
  if (query.mode === 'create') {
    editMode.value = false
    editingData.value = null
    createVisible.value = true
  } else if (query.mode === 'edit' && query.id) {
    const target = (store.services || []).find((s: any) => String(s.id) === String(query.id))
    if (target) {
      editMode.value = true
      editingData.value = target
      createVisible.value = true
    }
  }
}

watch(
  () => route.query,
  (q) => handleRouteMode(q as Record<string, any>),
  { immediate: true }
)

const goToScene = () => {
  router.push({ name: 'RiskExternalDataServiceScene' })
}

const goToAccompany = () => {
  router.push({ name: 'RiskAccompanyList' })
}

const openEdit = (record: any) => {
  editMode.value = true
  editingData.value = record
  createVisible.value = true
}
</script>

<style scoped>
.toolbar { margin-bottom: 12px; }
</style>
