<template>
  <div class="coupon-template-container">
    <a-card class="header-card">
      <div class="header-actions">
        <a-space>
          <a-select
            v-model="searchType"
            placeholder="选择模版类型"
            style="width: 200px"
            @change="handleSearch"
            allow-clear
          >
            <a-option value="interest_free">免息券</a-option>
            <a-option value="discount">折扣券</a-option>
            <a-option value="PRICED_DISCOUNT">临价折扣券</a-option>
          </a-select>
          <!-- 产品筛选（原有） -->
          <a-select
            v-model="searchProduct"
            placeholder="选择产品"
            style="width: 200px"
            @change="handleSearch"
            allow-clear
          >
            <a-option value="SUD001">SU贷</a-option>
            <a-option value="JD_001">京东大额低息</a-option>
            <a-option value="MT_001">美团大额低息</a-option>
          </a-select>
          <!-- 状态筛选（P0-PRD-#6 新增） -->
          <a-select
            v-model="searchStatus"
            placeholder="选择状态"
            style="width: 160px"
            @change="handleSearch"
            allow-clear
          >
            <a-option value="online">已上架</a-option>
            <a-option value="offline">已下架</a-option>
            <a-option value="draft">草稿</a-option>
            <a-option value="paused">已暂停</a-option>
            <a-option value="expired">已过期</a-option>
          </a-select>
          <!-- 名称搜索（P0-PRD-#6 新增） -->
          <a-input-search
            v-model="searchName"
            placeholder="搜索券名称"
            style="width: 240px"
            allow-clear
            @search="handleSearch"
            @clear="handleSearch"
          />
          <a-button type="primary" @click="handleCreate">
            <template #icon>
              <IconPlus />
            </template>
            新建券模版
          </a-button>
        </a-space>
      </div>
    </a-card>

    <a-card class="table-card">
      <a-table
        :data="tableData"
        :loading="loading"
        :pagination="pagination"
        :bordered="false"
        :stripe="true"
        @page-change="onPageChange"
        @page-size-change="onPageSizeChange"
        @filter-change="handleFilterChange"
      >
        <template #columns>
          <a-table-column title="模版名称" data-index="name" :width="200" :filterable="{ filterSearch: true }">
            <template #cell="{ record }">
              <a-space>
            <a-tag :color="record.type === 'interest_free' ? 'arcoblue' : record.type === 'PRICED_DISCOUNT' ? 'orange' : 'green'">
                  {{ record.type === 'interest_free' ? '免息券' : record.type === 'discount' ? '折扣券' : '临价折扣券' }}
                </a-tag>
                <a-link @click="handleRowDblClick(record)">
                  {{ record.name }}
                </a-link>
              </a-space>
            </template>
          </a-table-column>
          <a-table-column title="适用范围" data-index="scope" :width="160">
            <template #cell="{ record }">
              <div>
                <div class="scope-row">
                  <span class="scope-label">产品：</span>
                  <a-space size="mini">
                    <a-tag v-for="product in record.products" :key="product" size="small">
                      {{ product === 'personal_loan' ? '个人贷款' : product === 'SUD001' ? 'SU贷' : product === 'JD_001' ? '京东' : product === 'MT_001' ? '美团' : '企业贷款' }}
                    </a-tag>
                  </a-space>
                  <!-- 临价折扣券显示产品名称 -->
                  <div v-if="record.type === 'PRICED_DISCOUNT' && record.product_name" class="scope-row">
                    <span class="scope-label">产品：</span>
                    <a-tag size="small" color="orange">{{ record.product_name }}</a-tag>
                  </div>
                </div>
                <div class="scope-row">
                  <span class="scope-label">渠道：</span>
                  <a-space size="mini">
                    <a-tag v-for="channel in record.useChannels" :key="channel" size="small">
                      {{ channel === 'app' ? 'APP' : channel === 'miniprogram' ? '小程序' : 'H5' }}
                    </a-tag>
                  </a-space>
                </div>
              </div>
            </template>
          </a-table-column>
          <a-table-column title="有效期" data-index="valid_from" :width="160">
            <template #cell="{ record }">
              <div>
                {{ record.validityPeriodType === 'unlimited' ? '长期有效' : `${record.valid_from || ''} 至 ${record.valid_to || ''}` }}
              </div>
            </template>
          </a-table-column>
          <a-table-column title="属主" data-index="creator" :width="100" :filterable="{ filterSearch: true }" />
          <a-table-column title="状态" data-index="status" :width="80" align="center" :filterable="{ filterMultiple: false }" :filters="[
            // v1.6.1 6/14 修: filter value 严格对齐 statusTextMap 5 态 + mock 状态机
            // (mock/coupon.ts:16: 'draft' | 'active' | 'online' | 'paused' | 'expired')
            // 5/26 教训链 #1: 避免英文 enum 拼写漂移
            { text: '草稿', value: 'draft' },
            { text: '生效中', value: 'online' },
            { text: '已暂停', value: 'paused' },
            { text: '已过期', value: 'expired' }
          ]">
            <template #cell="{ record }">
              <a-tag :color="statusColorMap[record.status] || 'gray'">
                {{ statusTextMap[record.status] || record.status }}
              </a-tag>
            </template>
          </a-table-column>
          <a-table-column title="操作" :width="100" align="center">
            <template #cell="{ record }">
              <a-space size="mini">
                <a-button
                  type="text"
                  size="small"
                  @click="handleStatusChange(record)"
                  :status="record.status === 'online' ? 'danger' : 'success'"
                >
                  {{ record.status === 'online' ? '下线' : '上线' }}
                </a-button>
                <a-divider direction="vertical" />
                <a-button
                  v-if="record.status === 'draft'"
                  type="text"
                  size="small"
                  status="danger"
                  @click="handleDelete(record)"
                >
                  删除
                </a-button>
                <a-button
                  type="text"
                  size="small"
                  @click="handleCopy(record)"
                >
                  复制
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
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Message, Modal } from '@arco-design/web-vue'
import { IconPlus } from '@arco-design/web-vue/es/icon'
import { templateAPI } from '@/api/coupon.js'

const router = useRouter()

// 表格数据
const tableData = ref([])
const loading = ref(false)
// 分页配置
const pagination = ref({
  total: 0,
  current: 1,
  pageSize: 10,
  showTotal: true,
  showJumper: true,
  showPageSize: true,
})

import { templateMockData } from '@/mock/coupon'
import { STATUS_DICTIONARY } from '@/constants/status'

// 获取表格数据
const fetchData = async () => {
  loading.value = true
  try {
    // 使用mock数据
    tableData.value = templateMockData
    pagination.value.total = templateMockData.length
  } catch (error) {
    Message.error('获取数据失败')
  } finally {
    loading.value = false
  }
}

// 表格筛选变化
const handleFilterChange = (dataIndex, values) => {
  if (!values || values.length === 0) return
  
  const filteredData = templateMockData.filter(item => {
    if (dataIndex === 'status') {
      return values.includes(item[dataIndex])
    } else {
      return item[dataIndex].toLowerCase().includes(values[0].toLowerCase())
    }
  })
  
  tableData.value = filteredData
  pagination.value.total = filteredData.length
  pagination.value.current = 1
}

// 分页变化
const onPageChange = (current) => {
  pagination.value.current = current
  fetchData()
}

const onPageSizeChange = (pageSize) => {
  pagination.value.pageSize = pageSize
  pagination.value.current = 1
  fetchData()
}

// 新建券模版
const handleCreate = () => {
  router.push('/benefit/template/create')
}

// 处理上线/下线
const handleStatusChange = async (record) => {
  if (record.status === 'online') {
    Modal.warning({
      title: '确认下线',
      content: `确定要下线模版「${record.name}」吗？`,
      onOk: async () => {
        // P0-模板-#1 BUG-5: 调 templateAPI.updateTemplate 接口 (上线/下线)
        try {
          const res = await templateAPI.updateTemplate(record.templateId || record.id, { status: 'offline' })
          if (res.code === 200) {
            record.status = 'offline'
            Message.success('下线成功')
            fetchData()
          } else {
            Message.error(res.message || '下线失败')
          }
        } catch (err) {
          console.error('下线接口失败:', err)
          Message.error('下线失败')
        }
      }
    })
  } else {
    // P0-模板-#1 BUG-5: 调 templateAPI.updateTemplate 接口 (上线)
    try {
      const res = await templateAPI.updateTemplate(record.templateId || record.id, { status: 'online' })
      if (res.code === 200) {
        record.status = 'online'
        Message.success('上线成功')
        fetchData()
      } else {
        Message.error(res.message || '上线失败')
      }
    } catch (err) {
      console.error('上线接口失败:', err)
      Message.error('上线失败')
    }
  }
}

// 复制券模版
const handleCopy = (record) => {
  // 准备复制数据，排除不需要复制的字段
  const copyData = { ...record }
  delete copyData.id
  delete copyData.createTime
  delete copyData.status
  
  // 修改名称添加副本后缀
  copyData.name = `${record.name}_副本`
  
  // 跳转到创建页面并传递复制数据
  router.push({
    path: '/benefit/template/create',
    query: {
      mode: 'create',
      copyData: encodeURIComponent(JSON.stringify(copyData))
    }
  })
}

// 删除券模版
// 处理点击查看详情
const handleRowDblClick = (record) => {
  router.push({
    path: '/benefit/template/detail',
    query: {
      id: record.id,
      mode: 'view' // 添加mode参数标识为查看模式
    }
  })
}

const handleDelete = (record) => {
  Modal.warning({
    title: '确认删除',
    content: `确定要删除模版「${record.name}」吗？`,
    onOk: () => {
      // TODO: 调用删除接口
      Message.success('删除成功')
      fetchData()
    }
  })
}

onMounted(() => {
  fetchData()
})

const searchType = ref('')
const searchProduct = ref('')
const searchStatus = ref('')
const searchName = ref('')

/** MockTemplate.status 6 态 → 复用 constants/status.ts templateStatus 字典
 *  v1.2.8 统一收口: 模板态独立字典,不再混用 couponStatus
 *  本地视图模式 (v-if 分支) 仍按 value 判断,与字典解耦
 */
// 视图层仍按 record.status 直接查 label/color,这里把字典展开成两个扁平映射
const statusTextMap = Object.fromEntries(
  Object.entries(STATUS_DICTIONARY.templateStatus).map(([k, v]) => [k, v.label])
)
const statusColorMap = Object.fromEntries(
  Object.entries(STATUS_DICTIONARY.templateStatus).map(([k, v]) => [k, v.color])
)

// 处理搜索（按类型 + 产品 + 状态 + 名称筛选）
const handleSearch = () => {
  tableData.value = templateMockData.filter(item => {
    const matchType = !searchType.value || item.type === searchType.value
    const matchProduct = !searchProduct.value || item.product_id === searchProduct.value || (item.products && (
      item.products.includes(searchProduct.value) ||
      item.products.some(p => (typeof p === 'string' ? p : p.product_id) === searchProduct.value)
    ))
    const matchStatus = !searchStatus.value || item.status === searchStatus.value
    const matchName = !searchName.value || (item.name || '').toLowerCase().includes(searchName.value.toLowerCase())
    return matchType && matchProduct && matchStatus && matchName
  })
  pagination.value.total = tableData.value.length
  pagination.value.current = 1
}
</script>

<style scoped>
.coupon-template-container {
  padding: 16px;
}

.header-card {
  margin-bottom: 16px;
}

.table-card {
  background-color: var(--color-bg-2);
}

:deep(.arco-table-td) {
  padding: 12px 16px;
}

:deep(.arco-table-cell) {
  white-space: normal;
  word-break: break-word;
}

:deep(.arco-table-th) {
  padding: 12px 16px;
  background-color: var(--color-neutral-2) !important;
}

:deep(.arco-link) {
  color: rgb(var(--primary-6));
}

:deep(.arco-space-mini) {
  gap: 4px !important;
}

.scope-row, .time-row {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
  &:last-child {
    margin-bottom: 0;
  }
}

.scope-label, .time-label {
  color: var(--color-text-3);
  font-size: 13px;
  margin-right: 8px;
  white-space: nowrap;
}

.time-info {
  max-width: 160px;
  overflow: hidden;
}

.time-row {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  &:last-child {
    margin-bottom: 0;
  }
}

.time-label {
  color: var(--color-text-3);
  font-size: 13px;
  margin-right: 8px;
  white-space: nowrap;
}
</style>