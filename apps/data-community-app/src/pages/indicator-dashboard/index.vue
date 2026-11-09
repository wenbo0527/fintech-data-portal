<template>
  <div class="indicator-dashboard">
    <a-card :bordered="false" class="dashboard-card">
      <template #title>
        <div class="card-header">
          <div class="title-area">
            <span class="title">指标看板</span>
            <span class="subtitle">在此录入和管理关键业务指标数据</span>
          </div>
          <a-space>
            <a-input-search
              v-model="searchText"
              placeholder="搜索指标名称"
              style="width: 280px"
              allow-clear
              @search="handleSearch"
            />
            <a-button type="primary" @click="handleCreate">
              <template #icon><IconPlus /></template>
              录入指标
            </a-button>
          </a-space>
        </div>
      </template>

      <!-- 统计卡片 -->
      <a-row :gutter="16" class="stat-cards">
        <a-col :span="6" v-for="stat in stats" :key="stat.title">
          <a-card hoverable class="stat-card">
            <a-statistic :title="stat.title" :value="stat.value" :precision="stat.precision" show-group-separator>
              <template #prefix>
                <component :is="stat.icon" :style="{ color: stat.color }" />
              </template>
              <template #suffix>
                <span class="stat-unit">{{ stat.unit }}</span>
              </template>
            </a-statistic>
          </a-card>
        </a-col>
      </a-row>

      <a-divider />

      <!-- 数据表格 -->
      <a-table
        :columns="columns"
        :data="filteredData"
        :pagination="pagination"
        :loading="loading"
        @page-change="onPageChange"
      >
        <template #indicatorName="{ record }">
          <div class="indicator-info" @click="handleViewDetail(record)" style="cursor: pointer">
            <div class="name" style="color: rgb(var(--primary-6))">{{ record.name }}</div>
            <div class="code">{{ record.code }}</div>
          </div>
        </template>
        
        <template #value="{ record }">
          <span class="value-text">{{ record.value }}</span>
          <span class="unit-text" v-if="record.unit">{{ record.unit }}</span>
        </template>

        <template #trend="{ record }">
           <a-tag :color="record.trend > 0 ? 'red' : (record.trend < 0 ? 'green' : 'gray')">
             <template #icon>
               <IconArrowUp v-if="record.trend > 0" />
               <IconArrowDown v-if="record.trend < 0" />
               <IconMinus v-if="record.trend === 0" />
             </template>
             {{ Math.abs(record.trend) }}%
           </a-tag>
        </template>

        <template #status="{ record }">
          <a-badge :status="record.status === 'active' ? 'success' : 'warning'" :text="record.status === 'active' ? '生效中' : '已停用'" />
        </template>

        <template #actions="{ record }">
          <a-space>
            <a-tooltip content="生成数据服务API">
              <a-button type="text" size="small" @click="handleGenerateApi(record)">
                <template #icon><IconCode /></template>
              </a-button>
            </a-tooltip>
            <a-button type="text" size="small" @click="handleViewDetail(record)">详情</a-button>
            <a-button type="text" size="small" @click="handleEdit(record)">编辑</a-button>
            <a-popconfirm content="确定要删除该指标记录吗？" @ok="handleDelete(record)">
              <a-button type="text" status="danger" size="small">删除</a-button>
            </a-popconfirm>
          </a-space>
        </template>
      </a-table>
    </a-card>

    <!-- 录入/编辑弹窗 -->
    <a-modal
      v-model:visible="modalVisible"
      :title="modalType === 'create' ? '录入新指标' : '编辑指标'"
      @ok="handleModalOk"
      @cancel="handleModalCancel"
    >
      <a-form :model="form" ref="formRef" layout="vertical">
        <a-form-item field="metricId" label="选择指标" :rules="[{ required: true, message: '请选择指标' }]">
          <a-select 
            v-model="form.metricId" 
            placeholder="请选择已注册的指标" 
            allow-search 
            :disabled="modalType === 'edit'"
            @change="handleMetricSelect"
          >
            <a-option v-for="item in availableMetrics" :key="item.id" :value="item.id" :label="item.name">
              {{ item.name }} <span style="color: var(--subapp-text-tertiary); font-size: 12px; margin-left: 4px">({{ item.code }})</span>
            </a-option>
          </a-select>
        </a-form-item>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="指标编码">
              <a-input v-model="form.code" disabled />
            </a-form-item>
          </a-col>
          <a-col :span="12">
             <a-form-item label="归属场景">
              <a-input v-model="form.category" disabled />
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <a-col :span="16">
            <a-form-item field="value" label="指标值" :rules="[{ required: true, message: '请输入数值' }]">
              <a-input-number v-model="form.value" placeholder="请输入数值" :precision="2" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item field="unit" label="单位">
              <a-select v-model="form.unit" placeholder="单位" allow-create>
                <a-option>人</a-option>
                <a-option>元</a-option>
                <a-option>%</a-option>
                <a-option>次</a-option>
                <a-option>个</a-option>
                <a-option>万</a-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item field="date" label="统计日期" :rules="[{ required: true, message: '请选择日期' }]">
          <a-date-picker v-model="form.date" style="width: 100%" />
        </a-form-item>
        <a-form-item field="desc" label="备注说明">
          <a-textarea v-model="form.desc" placeholder="请输入备注说明" />
        </a-form-item>
      </a-form>
    </a-modal>
    
    <!-- 指标详情抽屉 -->
    <IndicatorDetailDrawer
      v-model:visible="detailDrawerVisible"
      :indicator="currentIndicator"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { Message } from '@arco-design/web-vue'
import IndicatorDetailDrawer from './components/IndicatorDetailDrawer.vue'
import { 
  IconPlus, 
  IconArrowUp, 
  IconArrowDown, 
  IconMinus,
  IconBarChart,
  IconUserGroup,
  IconThunderbolt,
  IconSafe,
  IconCode
} from '@arco-design/web-vue/es/icon'

const searchText = ref('')
const loading = ref(false)
const modalVisible = ref(false)
const modalType = ref('create')
const formRef = ref(null)

// 详情抽屉状态
const detailDrawerVisible = ref(false)
const currentIndicator = ref(null)

const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showTotal: true,
  showJumper: true,
  showPageSize: true
})

// 模拟“指标管理”中的元数据
const availableMetrics = [
  { id: 101, name: '日活跃用户数', code: 'DAU', category: '用户指标' },
  { id: 102, name: '日新增用户数', code: 'DNU', category: '用户指标' },
  { id: 103, name: '次日留存率', code: 'RETENTION_1D', category: '用户指标' },
  { id: 104, name: 'GMV', code: 'GMV_DAILY', category: '财务指标' },
  { id: 105, name: '客单价', code: 'ARPU', category: '财务指标' },
  { id: 106, name: '当日风控授信通过笔数', code: 'A00043', category: '业务域' },
  { id: 107, name: '用户注册转化率', code: 'USER_002', category: '转化域' },
  { id: 108, name: '资本充足率', code: 'REG_001', category: '风险指标' }
]

// 模拟统计数据
const stats = [
  { title: '接入指标总数', value: 128, icon: IconBarChart, color: 'var(--subapp-primary)', unit: '个' },
  { title: '今日更新', value: 12, icon: IconThunderbolt, color: 'var(--subapp-success)', unit: '个' },
  { title: '异常波动', value: 3, icon: IconSafe, color: '#F53F3F', unit: '个' },
  { title: '覆盖业务线', value: 8, icon: IconUserGroup, color: '#FF7D00', unit: '条' },
]

// 模拟表格数据 (实例数据)
const tableData = ref([
  { id: 1, metricId: 101, name: '日活跃用户数', code: 'DAU', value: 45230, unit: '人', date: '2024-03-20', trend: 5.2, status: 'active', desc: 'APP端日活', category: '用户指标' },
  { id: 2, metricId: 102, name: '日新增用户数', code: 'DNU', value: 1205, unit: '人', date: '2024-03-20', trend: -2.1, status: 'active', desc: '自然流量新增', category: '用户指标' },
  { id: 3, metricId: 103, name: '次日留存率', code: 'RETENTION_1D', value: 42.5, unit: '%', date: '2024-03-19', trend: 0.5, status: 'active', desc: '全渠道', category: '用户指标' },
  { id: 4, metricId: 104, name: 'GMV', code: 'GMV_DAILY', value: 1250000, unit: '元', date: '2024-03-20', trend: 12.8, status: 'active', desc: '含退款', category: '财务指标' },
  { id: 5, metricId: 105, name: '客单价', code: 'ARPU', value: 85.5, unit: '元', date: '2024-03-20', trend: -0.8, status: 'warning', desc: '略有下降', category: '财务指标' },
])

const columns = [
  { title: '指标信息', slotName: 'indicatorName', width: 200 },
  { title: '归属场景', dataIndex: 'category', width: 120 },
  { title: '数值', slotName: 'value', width: 150 },
  { title: '统计日期', dataIndex: 'date', width: 120, sortable: true },
  { title: '环比波动', slotName: 'trend', width: 120 },
  { title: '状态', slotName: 'status', width: 100 },
  { title: '备注', dataIndex: 'desc', ellipsis: true },
  { title: '操作', slotName: 'actions', width: 150, fixed: 'right' }
]

const form = reactive({
  id: '',
  metricId: undefined,
  name: '',
  code: '',
  category: '',
  value: 0,
  unit: '人',
  date: '',
  desc: ''
})

const filteredData = computed(() => {
  if (!searchText.value) {return tableData.value}
  return tableData.value.filter(item => 
    item.name.includes(searchText.value) || 
    item.code.includes(searchText.value)
  )
})

const handleSearch = () => {
  pagination.current = 1
}

const onPageChange = (current) => {
  pagination.current = current
}

const handleCreate = () => {
  modalType.value = 'create'
  Object.assign(form, {
    id: '',
    metricId: undefined,
    name: '',
    code: '',
    category: '',
    value: 0,
    unit: '人',
    date: new Date().toISOString().split('T')[0],
    desc: ''
  })
  modalVisible.value = true
}

const handleEdit = (record) => {
  modalType.value = 'edit'
  Object.assign(form, record)
  modalVisible.value = true
}

const handleViewDetail = (record) => {
  currentIndicator.value = record
  detailDrawerVisible.value = true
}

const handleMetricSelect = (id) => {
  const metric = availableMetrics.find(m => m.id === id)
  if (metric) {
    form.name = metric.name
    form.code = metric.code
    form.category = metric.category
    // 如果需要，可以根据指标类型自动填充默认单位
    if (metric.code.includes('RATE') || metric.code.includes('RATIO')) {
      form.unit = '%'
    }
  }
}

const handleGenerateApi = (record) => {
  loading.value = true
  // 模拟 API 生成过程
  setTimeout(() => {
    loading.value = false
    Message.success({
      content: `已生成API: /api/v1/indicators/${record.code}，请前往API集市查看`,
      duration: 3000
    })
  }, 800)
}

const handleDelete = (record) => {
  const index = tableData.value.findIndex(item => item.id === record.id)
  if (index > -1) {
    tableData.value.splice(index, 1)
    Message.success('删除成功')
  }
}

const handleModalOk = () => {
  formRef.value.validate((errors) => {
    if (!errors) {
      if (modalType.value === 'create') {
        tableData.value.unshift({
          ...form,
          id: Date.now(),
          trend: 0,
          status: 'active'
        })
        Message.success('录入成功')
      } else {
        const index = tableData.value.findIndex(item => item.id === form.id)
        if (index > -1) {
          Object.assign(tableData.value[index], form)
          Message.success('更新成功')
        }
      }
      modalVisible.value = false
    }
  })
}

const handleModalCancel = () => {
  modalVisible.value = false
}
</script>

<style scoped lang="less">
.indicator-dashboard {
  padding: 16px 20px;
  height: 100%;
  overflow-y: auto;

  .dashboard-card {
    min-height: calc(100vh - 140px);
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    .title-area {
      display: flex;
      flex-direction: column;
      
      .title {
        font-size: 18px;
        font-weight: 600;
        color: var(--color-text-1);
      }
      
      .subtitle {
        font-size: 12px;
        color: var(--color-text-3);
        margin-top: 4px;
      }
    }
  }

  .stat-cards {
    margin-bottom: 24px;
    
    .stat-card {
      background: var(--color-fill-1);
      border-radius: 4px;
      
      :deep(.arco-card-body) {
        padding: 16px;
      }

      .stat-unit {
        font-size: 12px;
        color: var(--color-text-3);
        margin-left: 4px;
      }
    }
  }

  .indicator-info {
    .name {
      font-weight: 500;
      color: var(--color-text-1);
    }
    .code {
      font-size: 12px;
      color: var(--color-text-3);
    }
  }

  .value-text {
    font-weight: 600;
    color: var(--color-text-1);
  }
  
  .unit-text {
    font-size: 12px;
    color: var(--color-text-3);
    margin-left: 4px;
  }
}
</style>
