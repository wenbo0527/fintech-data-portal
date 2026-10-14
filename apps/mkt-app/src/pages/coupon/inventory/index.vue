<template>
  <div class="coupon-inventory-container">
    <!-- 搜索表单 -->
    <a-card class="search-card">
      <a-form :model="formModel" @submit="handleSearch" layout="horizontal" :style="{ width: '100%' }">
        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item field="couponId" label="券实例ID">
              <a-input v-model="formModel.couponId" placeholder="请输入券实例ID" allow-clear />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item field="templateId" label="券模版">
              <a-input v-model="formModel.templateId" placeholder="请输入券模版ID" allow-clear />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item field="userId" label="用户ID">
              <a-input v-model="formModel.userId" placeholder="请输入用户ID" allow-clear />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item field="packageId" label="券包ID">
              <a-input v-model="formModel.packageId" placeholder="请输入券包ID" allow-clear />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item field="status" label="券状态">
              <a-select v-model="formModel.status" placeholder="请选择券状态" allow-clear>
                <!-- 严格对齐 types/api/coupon.ts 9 态 (PRD v1.2.8 §11.3) -->
                <a-option value="pending">待确认</a-option>
                <a-option value="received">未使用</a-option>
                <a-option value="invalidated">已作废</a-option>
                <a-option value="expired">已过期</a-option>
                <a-option value="failed_1001_core_rejected">核心拒收失败</a-option>
                <a-option value="failed_1002_timeout">超时失败</a-option>
                <a-option value="failed_1003_invalidation">存量作废失败</a-option>
                <a-option value="failed_1004_kafka_push">推送失败</a-option>
                <a-option value="failed_1005_kafka_consume">消费失败</a-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item field="createTime" label="创建时间">
              <a-range-picker v-model="formModel.createTime" placeholder="请选择创建时间范围" allow-clear />
            </a-form-item>
          </a-col>
          <!-- 产品筛选（临价折扣券） -->
          <a-col :span="8">
            <a-form-item field="product_id" label="产品">
              <a-select v-model="formModel.product_id" placeholder="请选择产品" allow-clear>
                <a-option value="JD_001">京东大额低息</a-option>
                <a-option value="MT_001">美团大额低息</a-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        <a-row>
          <a-col :span="24" style="text-align: right">
            <a-space>
              <a-button @click="resetForm">重置</a-button>
              <a-button type="primary" html-type="submit">查询</a-button>
            </a-space>
          </a-col>
        </a-row>
      </a-form>
    </a-card>

    <!-- 数据列表 -->
    <a-card class="table-card">
      <template #title>
        库存统计列表
      </template>
      <template #extra>
        <div class="table-actions">
          <!-- 库存操作区域 -->
          <div class="inventory-actions">
            <a-button 
              type="primary" 
              @click="handleExport">
              <template #icon><IconDownload /></template>
              导出数据
            </a-button>
            <a-button 
              type="outline" 
              @click="handleRefresh">
              <template #icon><IconRefresh /></template>
              刷新数据
            </a-button>
          </div>
        </div>
      </template>
      <a-table
        :data="tableData"
        :loading="loading"
        :pagination="pagination"
        @page-change="onPageChange"
        @page-size-change="onPageSizeChange"
        :bordered="{ cell: true, wrapper: true }"
        stripe
      >
        <template #columns>
          <template v-for="column in columns" :key="column.dataIndex">
            <a-table-column v-bind="column">
              <template #cell="{ record }" v-if="column.customCell">
                <component :is="column.customCell" :record="record" />
              </template>
            </a-table-column>
          </template>
          <!-- 操作列：单独用 #cell slot 渲染按钮（v-bind 模式下 slotName 不生效） -->
          <a-table-column title="操作" :width="200" align="center">
            <template #cell="{ record }">
              <a-space>
                <a-button
                  v-if="record.status?.startsWith('failed_')"
                  type="text"
                  size="small"
                  status="warning"
                  :loading="resendingId === record.instanceId"
                  @click="handleResend(record)"
                >
                  <template #icon><IconRefresh /></template>
                  补发
                </a-button>
                <a-button 
                  type="text" 
                  size="small"
                  @click="viewDetail(record)"
                >
                  查看详情
                </a-button>
              </a-space>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>
   </div>
</template>

<script setup>
import { ref, reactive, h } from 'vue'
import { IconDownload, IconRefresh } from '@arco-design/web-vue/es/icon'
import { Message } from '@arco-design/web-vue'
import { STATUS_DICTIONARY } from '@/constants/status'

// 表格列配置
const columns = [
  { title: '用户ID', dataIndex: 'userId', width: 120, align: 'center' },
  { title: '券实例ID', dataIndex: 'couponId', width: 120, align: 'center' },
  { title: '券模版ID', dataIndex: 'templateId', width: 120, align: 'center' },
  { title: '券名称', dataIndex: 'couponName', width: 200 },
  {
    title: '券类型',
    dataIndex: 'couponType',
    width: 100,
    align: 'center',
    customCell: ({ record }) => h('a-tag', {
      // v1.6.1 6/14 修: 补 PRICED_DISCOUNT 临价折扣券（types/api/coupon.ts:29 + mock/coupon.ts:10/42/56）
      // 5/26 教训链 #1: types 改 → mock 改 → column 改 三方同步，缺一会 fallback 错显
      color: record.couponType === 'discount' ? 'blue' : record.couponType === 'reduction' ? 'green' : record.couponType === 'PRICED_DISCOUNT' ? 'purple' : 'orange'
    }, record.couponType === 'discount' ? '折扣券' : record.couponType === 'reduction' ? '满减券' : record.couponType === 'PRICED_DISCOUNT' ? '临价折扣券' : '立减券')
  },
  {
    title: '有效期',
    dataIndex: 'validPeriod',
    width: 200,
    customCell: ({ record }) => `${record.startTime} ~ ${record.endTime}`
  },
  {
    title: '券状态',
    dataIndex: 'status',
    width: 100,
    align: 'center',
    // 统一字典查表(替代内联 map,与 constants/status.ts couponStatus 9 态严格对齐)
    customCell: ({ record }) => {
      const meta = STATUS_DICTIONARY.couponStatus[record.status] || { label: record.status, color: 'gray' }
      return h('a-tag', { color: meta.color }, meta.label)
    }
  },
  { 
    title: '创建时间', 
    dataIndex: 'createTime', 
    width: 160
  },
  { 
    title: '作废时间',
    dataIndex: 'invalidated_time',
    width: 160,
    customCell: ({ record }) => record.invalidated_time || '—'
  },
]

// 搜索表单数据
const formModel = reactive({
  couponId: '',
  templateId: '',
  userId: '',
  packageId: '',
  status: '',
  createTime: [],
  product_id: '',
})

// 表格数据
const tableData = ref([])
const loading = ref(false)

// 导出数据功能
const handleExport = () => {
  Message.info('导出功能开发中...')
}

// 刷新数据功能
const handleRefresh = () => {
  fetchInventoryData()
}

// 分页配置
const pagination = reactive({
  total: 0,
  current: 1,
  pageSize: 50,
  showTotal: true,
  showJumper: true,
  showPageSize: true
})

// 获取库存数据
const fetchInventoryData = async () => {
  loading.value = true
  try {
    const { inventoryAPI } = await import('@/api/coupon.ts')
    
    // 构建查询参数，过滤掉空值
    const queryParams = {
      page: pagination.current,
      pageSize: pagination.pageSize
    }
    
    // 只添加非空的搜索条件
    Object.keys(formModel).forEach(key => {
      if (formModel[key] && formModel[key] !== '') {
        queryParams[key] = formModel[key]
      }
    })
    
    const response = await inventoryAPI.getInventoryList(queryParams)
    
    if (response.code === 200) {
       tableData.value = response.data.list
       pagination.total = response.data.pagination.total
     } else {
       Message.error(response.message || '获取数据失败')
     }
  } catch (error) {
    console.error('获取库存数据失败:', error)
    Message.error('获取数据失败，请重试')
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  pagination.current = 1
  fetchInventoryData()
}

// 重置表单
const resetForm = () => {
  formModel.couponId = ''
  formModel.templateId = ''
  formModel.userId = ''
  formModel.packageId = ''
  formModel.status = ''
  formModel.createTime = []
  formModel.product_id = ''
  handleSearch()
}



// 分页变化
const onPageChange = (current) => {
  pagination.current = current
  fetchInventoryData()
}

// 每页条数变化
const onPageSizeChange = (pageSize) => {
  pagination.pageSize = pageSize
  pagination.current = 1
  fetchInventoryData()
}

// 补发（仅 failed_* 状态可操作）
const resendingId = ref('')
const handleResend = async (record) => {
  resendingId.value = record.instanceId
  try {
    const { inventoryAPI } = await import('@/api/coupon.ts')
    const res = await inventoryAPI.resendCoupon(record.instanceId)
    if (res.code === 200) {
      Message.success(`券 ${record.couponId} 补发成功`)
      await fetchInventoryData()
    } else {
      Message.error(res.message || '补发失败')
    }
  } catch (error) {
    console.error('补发失败:', error)
    Message.error('补发失败，请重试')
  } finally {
    resendingId.value = ''
  }
}

// 查看详情
const viewDetail = (record) => {
  // 这里可以打开详情弹窗或跳转到详情页面
  Message.info(`查看券实例 ${record.couponId} 的详情`)
}

// 初始化加载数据
fetchInventoryData()
</script>

<style scoped>
.coupon-inventory-container {
  padding: 24px;
  background-color: var(--color-bg-2);
}

.search-card {
  margin-bottom: 16px;
}

.table-card {
  :deep(.arco-table-th) {
    background-color: var(--color-bg-2);
    font-weight: 600;
  }

  :deep(.arco-table-tr:hover) {
    background-color: var(--color-fill-1);
  }
}
</style>