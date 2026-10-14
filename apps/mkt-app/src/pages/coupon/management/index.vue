<template>
  <div class="coupon-container">
      <h2>券库存管理</h2>
    <div class="header-actions">
      <a-space>
        <a-input-search v-model="searchKeyword" placeholder="搜索券名称" style="width: 300px" @search="handleSearch" />
        <a-button type="primary" @click="showCreateModal = true">
          <template #icon>
            <IconPlus />
          </template>
          新建券
        </a-button>
        <a-button type="primary" @click="handleBatchCreate">
          <template #icon>
            <IconPlus />
          </template>
          批量新建
        </a-button>
        <a-button 
          v-if="pendingApprovalCount > 0"
          type="primary" 
          status="success"
          :loading="quickApprovalLoading"
          @click="handleQuickApproval">
          <template #icon>
            <IconCheck />
          </template>
          快速审批({{ pendingApprovalCount }})
        </a-button>
      </a-space>
    </div>

    <a-table :data="tableData" :loading="loading" :pagination="pagination" @page-change="onPageChange"
      @page-size-change="onPageSizeChange" :bordered="true" :stripe="true">
      <template #columns>
        
        <a-table-column title="券名称" data-index="couponName" :width="220">
          <template #cell="{ record }">
            <a-tooltip :content="record.couponName" position="top">
              <a-space>
                <a-tag :color="record.couponType === 'reduction' ? 'blue' : record.couponType === 'discount' ? 'cyan' : record.couponType === 'PRICED_DISCOUNT' ? 'orange' : 'green'">
                  {{ couponTypeLabelMap[record.couponType] || record.couponType }}
                </a-tag>
                <a-link @click="handleViewDetail(record)" style="color: rgb(var(--primary-6)); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;">
                  {{ record.couponName }}
                </a-link>
              </a-space>
            </a-tooltip>
          </template>
        </a-table-column>
        <a-table-column title="状态" data-index="status" :width="150" align="center" :filterable="{ filters: statusFilters }">
          <template #cell="{ record }">
            <StatusTag :status="record.status" dictKey="couponStatus" />
          </template>
        </a-table-column>
        
        <a-table-column title="库存" data-index="stock" :width="120" align="center">
          <template #cell="{ record }">
            <a-tooltip :content="`初始化: ${record.unclaimed || 0}\n已领取: ${record.claimed || 0}\n已锁定: ${record.locked || 0}\n已核销: ${record.used || 0}\n已过期: ${record.expired || 0}\n已作废: ${record.invalid || 0}`" position="top" :mouse-enter-delay="100" :mouse-leave-delay="100">
              <span style="cursor: pointer;">{{ record.stock }}</span>
            </a-tooltip>
          </template>
        </a-table-column>
        <a-table-column title="下发比例" :width="150" align="center">
          <template #cell="{ record }">
            {{ (record.claimed / record.stock * 100).toFixed(2) }}%
          </template>
        </a-table-column>
        <a-table-column title="有效期" data-index="validity" :width="220">
          <template #cell="{ record }">
            <a-tooltip :content="`${DateUtils.formatDate(record.startTime)} - ${DateUtils.formatDate(record.endTime)}`" position="top">
              <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;">
                {{ DateUtils.formatDate(record.startTime) }} - {{ DateUtils.formatDate(record.endTime) }}
              </span>
            </a-tooltip>
          </template>
        </a-table-column>
        

        <a-table-column title="录入员" data-index="operator" :width="150" :filterable="{ filters: operatorOptions.map(op => ({ text: op.name, value: op.id })) }">
          <template #cell="{ record }">
            {{ record.operator }}
          </template>
        </a-table-column>
        <!--
          v1.6.2 修: 操作列必须按 couponStatus 9 态实例态渲染
          (原判断用 draft/online/active 模板态, 与 mock 数据 9 态不匹配 → 整列空白)
        -->
        <a-table-column title="操作" fixed="right" :width="180" align="center">
          <template #cell="{ record }">
            <a-space :size="4">
              <!-- 详情入口收敛为券名称链接（同为 handleViewDetail），操作列仅保留状态相关操作 -->
              <a-button
                v-if="record.status === 'pending'"
                type="text" size="small" @click="handleWithdraw(record)">撤回</a-button>
              <a-button
                v-if="record.status === 'received'"
                type="text" size="small" status="danger" @click="handleInvalidate(record)">作废</a-button>
              <a-button
                v-if="record.status === 'received' && record.grantChannel === 'simulate_jd'"
                type="text" size="small" status="warning" @click="handleSimulateJdCallback(record)">模拟京东回调</a-button>
              <a-button
                v-if="String(record.status || '').startsWith('failed_')"
                type="text" size="small" status="warning"
                :loading="resendingId === record.instanceId" @click="handleResend(record)">补发</a-button>
            </a-space>
          </template>
        </a-table-column>
      </template>


    </a-table>


    
    <!-- 创建券弹窗 -->
    <!-- 创建券库存抽屉（分组卡片：基本信息 + 券库存下发限制，与详情页同款蓝竖条样式） -->
    <a-drawer v-model:visible="showCreateModal" title="创建券库存" :width="640" :ok-loading="createLoading"
      ok-text="确认创建" cancel-text="取消" :on-before-ok="handleSubmit" @cancel="resetForm">
      <a-form ref="formRef" :model="formData" :rules="rules" layout="vertical">
        <a-card class="section-card">
          <div class="section-title">
            <span>基本信息</span>
          </div>
          <a-grid :cols="2" :col-gap="16" :row-gap="0">
            <a-grid-item>
              <a-form-item field="templateId" label="券模版" required>
                <template #help>
                  <span class="help-text">选择合适的券模版作为基础配置</span>
                </template>
                <a-select v-model="formData.templateId" placeholder="请选择券模版" allow-clear
                  @change="handleTemplateChange">
                  <a-option v-for="template in templateOptions" :key="template.id" :value="template.id">
                    {{ template.name }}
                  </a-option>
                </a-select>
              </a-form-item>
            </a-grid-item>

            <a-grid-item>
              <a-form-item field="operator" label="录入员" required>
                <template #help>
                  <span class="help-text">当前登录用户</span>
                </template>
                <a-input v-model="formData.operator" readonly disabled />
              </a-form-item>
            </a-grid-item>

            <a-grid-item>
              <a-form-item field="auditor" label="审核员" required>
                <template #help>
                  <span class="help-text">选择负责审核该券的人员</span>
                </template>
                <a-select v-model="formData.auditor" placeholder="请选择审核员" allow-clear>
                  <a-option v-for="user in auditorOptions" :key="user.id" :value="user.id">
                    {{ user.name }}
                  </a-option>
                </a-select>
              </a-form-item>
            </a-grid-item>

            <a-grid-item>
              <a-form-item field="name" label="券名称" required>
                <template #help>
                  <span class="help-text">设置便于识别的券名称，最多50个字符</span>
                </template>
                <a-input v-model="formData.name" placeholder="请输入券名称" allow-clear />
              </a-form-item>
            </a-grid-item>

            <a-grid-item>
              <a-form-item field="totalCount" label="发放数量" required>
                <template #help>
                  <span class="help-text">设置本次创建的券的发放数量</span>
                </template>
                <a-input-number v-model="formData.totalCount" placeholder="请输入发放数量" :min="1" :max="999999"
                  :step="1" hide-button style="width: 100%">
                  <template #suffix>张</template>
                </a-input-number>
              </a-form-item>
            </a-grid-item>

            <a-grid-item>
              <a-form-item field="usageScenarios" label="券使用场景">
                <template #help>
                  <span class="help-text">选择券的适用场景，可多选</span>
                </template>
                <a-checkbox-group v-model="formData.usageScenarios">
                  <a-checkbox value="batch_distribution">批量下发</a-checkbox>
                  <a-checkbox value="telemarketing">电销使用</a-checkbox>
                </a-checkbox-group>
              </a-form-item>
            </a-grid-item>

            <a-grid-item :span="2">
              <a-alert type="info" style="margin-bottom: 4px">
                【规则提示】相同名称的优惠券每个用户仅可领取一次<span v-if="formData.userLimitDesc">；{{
                  formData.userLimitDesc }}</span>
              </a-alert>
            </a-grid-item>

            <a-grid-item :span="2">
              <a-form-item field="validityType" label="有效期类型" required>
                <template #help>
                  <span class="help-text">选择券的有效期类型</span>
                </template>
                <a-radio-group v-model="formData.validityType">
                  <a-radio value="absolute">绝对有效期</a-radio>
                  <a-radio value="relative">相对有效期</a-radio>
                </a-radio-group>
              </a-form-item>
            </a-grid-item>

            <a-grid-item v-if="formData.validityType === 'absolute'" :span="2">
              <a-form-item field="validity" label="有效期" required>
                <template #help>
                  <span class="help-text">设置券的可用时间范围</span>
                </template>
                <a-range-picker v-model="formData.validity" format="YYYY-MM-DD" style="width: 100%" />
              </a-form-item>
            </a-grid-item>

            <a-grid-item v-else :span="2">
              <a-form-item field="relativeDays" label="相对有效期" required>
                <template #help>
                  <span class="help-text">设置券的相对有效期天数，最长不超过45天</span>
                </template>
                <a-input-number v-model="formData.relativeDays" :min="1" :max="45" :step="1" style="width: 100%" />
              </a-form-item>
            </a-grid-item>
          </a-grid>
        </a-card>

        <a-card class="section-card">
          <div class="section-title">
            <span>券库存下发限制</span>
          </div>
          <a-alert type="info" style="margin-bottom: 16px">
            以上发放频率限制为券库存粒度的限制，针对单一用户的下发限制请在全局规则中控制
          </a-alert>
          <a-grid :cols="2" :col-gap="16" :row-gap="0">
            <a-grid-item>
              <a-form-item field="dailyLimit" label="单日发放上限">
                <template #help>
                  <span class="help-text">选填项：设置每日最大发放数量</span>
                </template>
                <a-input-number v-model="formData.dailyLimit" placeholder="请输入" :min="1" :max="formData.totalCount"
                  :step="1" hide-button style="width: 100%">
                  <template #suffix>张/日</template>
                </a-input-number>
              </a-form-item>
            </a-grid-item>
            <a-grid-item>
              <a-form-item field="weeklyLimit" label="单周发放上限">
                <template #help>
                  <span class="help-text">选填项：设置每周最大发放数量</span>
                </template>
                <a-input-number v-model="formData.weeklyLimit" placeholder="请输入" :min="1" :max="formData.totalCount"
                  :step="1" hide-button style="width: 100%">
                  <template #suffix>张/周</template>
                </a-input-number>
              </a-form-item>
            </a-grid-item>
            <a-grid-item>
              <a-form-item field="monthlyLimit" label="单月发放上限">
                <template #help>
                  <span class="help-text">选填项：设置每月最大发放数量</span>
                </template>
                <a-input-number v-model="formData.monthlyLimit" placeholder="请输入" :min="1" :max="formData.totalCount"
                  :step="1" hide-button style="width: 100%">
                  <template #suffix>张/月</template>
                </a-input-number>
              </a-form-item>
            </a-grid-item>
          </a-grid>
        </a-card>
      </a-form>
    </a-drawer>

    <!-- 券库存详情抽屉（复用 InventoryDetailPanel，与 /benefit/management/detail 路由页同一组件） -->
    <a-drawer
      v-model:visible="detailDrawerVisible"
      :width="900"
      placement="right"
      :title="detailRecord?.couponName ? `券库存详情 - ${detailRecord.couponName}` : '券库存详情'"
      :footer="false"
      unmountOnClose
    >
      <InventoryDetailPanel v-if="detailRecord" :record="detailRecord" />
    </a-drawer>
  </div>
</template>



<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Message, Modal } from '@arco-design/web-vue'
import { IconPlus, IconCheck } from '@arco-design/web-vue/es/icon'
import { useUserStore } from '@/stores/user'
import { couponMockData } from '@/mock/coupon'
import { inventoryAPI } from '@/api/coupon'
import StatusTag from '@/components/common/StatusTag.vue'
import DateUtils from '@/utils/dateUtils'
import InventoryDetailPanel from './components/InventoryDetailPanel.vue'

/**
 * 状态筛选下拉 (v1.2.8 统一收口)
 * 本页表格数据源 = couponMockData (MockCoupon 实例态),与 StatusTag dictKey="couponStatus" 严格对齐 9 态
 */
const statusFilters = [
  { text: '待确认', value: 'pending' },
  { text: '未使用', value: 'received' },
  { text: '已作废', value: 'invalidated' },
  { text: '已过期', value: 'expired' },
  { text: '核心拒收失败', value: 'failed_1001_core_rejected' },
  { text: '超时失败', value: 'failed_1002_timeout' },
  { text: '存量作废失败', value: 'failed_1003_invalidation' },
  { text: '推送失败', value: 'failed_1004_kafka_push' },
  { text: '消费失败', value: 'failed_1005_kafka_consume' }
]

// 6/9 v1.3.1 教训链修复: 补 couponType 中英映射（消除 v-if 中文枚举静默失败）
const couponTypeLabelMap = {
  reduction: '满减券',
  discount: '折扣券',
  cash: '立减券',
  gift: '礼品券',
  interest_free: '免息券',
  PRICED_DISCOUNT: '临价折扣券',
}

const router = useRouter()
const userStore = useUserStore()

// 批量创建处理函数
const handleBatchCreate = () => {
  router.push('/marketing/benefit/management/batch-create')
}

// 表格数据
const tableData = ref([])
const loading = ref(false)
const searchKeyword = ref('')
// 详情抽屉状态（复用 InventoryDetailPanel）
const detailDrawerVisible = ref(false)
const detailRecord = ref(null)

// 快速审批相关
const quickApprovalLoading = ref(false)
const pendingApprovalCount = ref(0)

// 步骤控制
const currentStep = ref(1)
const nextStep = async () => {
  const form = formRef.value
  if (!form) return

  try {
    // 根据当前步骤验证对应的字段
    const validateFields = currentStep.value === 1
      ? ['templateId', 'name', 'totalCount']
      : ['rules', 'validity']

    await form.validate(validateFields)
    currentStep.value++
  } catch (error) {
    // 验证失败不跳转
    return false
  }
}

// 预览数据
const previewData = computed(() => [
  {
    label: '券模版',
    value: templateOptions.value.find(t => t.id === formData.value?.templateId)?.name || '-'
  },
  {
    label: '券名称',
    value: formData.value?.name || '-'
  },
  {
    label: '发放数量',
    value: formData.value?.totalCount || '-'
  },
  {
    label: '使用规则',
    value: formData.value?.rules || '-'
  },
  {
    label: '有效期',
    value: formData.value?.validity?.length
      ? `${formData.value.validity[0]} 至 ${formData.value.validity[1]}`
      : '-'
  }
])

// 分页配置
const pagination = ref({
  total: 0,
  current: 1,
  pageSize: 10,
  showTotal: true,
  showJumper: true,
  showPageSize: true,
})

// 创建券相关
const showCreateModal = ref(false)
const formRef = ref(null)
const templateOptions = ref([])

const handleViewDetail = (record) => {
  detailRecord.value = record
  detailDrawerVisible.value = true
}

// 审批弹窗
const showApproveModal = ref(false)
const currentApproveRecord = ref({})

const handleApproveModal = (record) => {
  currentApproveRecord.value = record
  showApproveModal.value = true
}

const handleApprove = (record) => {
  Modal.confirm({
    title: '确认审批',
    content: `确定要通过审批「${record.couponName}」吗？`,
    onOk: async () => {
      try {
        // TODO: 调用接口更新状态
        Message.success('审批成功')
        showApproveModal.value = false
        fetchData()
      } catch (error) {
        Message.error('审批失败')
      }
    }
  })
}

// 审核员和录入员选项
const auditorOptions = ref([
  { id: 'A001', name: '张三' },
  { id: 'A002', name: '李四' },
  { id: 'A003', name: '王五' }
])

const operatorOptions = ref([
  { id: 'O001', name: '赵六' },
  { id: 'O002', name: '钱七' },
  { id: 'O003', name: '孙八' }
])

// 表单数据
const formData = ref({
  templateId: '',
  name: '',
  totalCount: 1000,
  dailyLimit: 100, // 单日发放上限
  weeklyLimit: 500, // 单周发放上限
  monthlyLimit: 2000, // 单月发放上限
  validityType: 'absolute', // 有效期类型：absolute-绝对有效期，relative-相对有效期
  validity: [], // 绝对有效期
  relativeDays: 1, // 相对有效期天数
  auditor: '',
  operator: userStore.userInfo.username, // 默认设置为当前登录用户
  validityPeriod: [],
  userLimitDesc: '', // 用户持券限制说明
  usageScenarios: [] // 券使用场景（多选）
})

const rules = {
  templateId: [{ required: true, message: '请选择券模版' }],
  name: [
    { required: true, message: '请输入券名称' },
    { maxLength: 50, message: '名称长度不能超过50个字符' }
  ],
  totalCount: [{ required: true, message: '请输入发放数量' }],
  validityType: [{ required: true, message: '请选择有效期类型' }],
  validity: [{ required: true, message: '请选择有效期' }],
  relativeDays: [{ required: true, message: '请输入相对有效期天数' }],
  auditor: [{ required: true, message: '请选择审核员' }],
  operator: [{ required: true, message: '请选择录入员' }],
  validityPeriod: [{ required: true, message: '请选择有效期' }]
}

// 定时器ID
const timerId = ref(null)

// 清理函数
const cleanup = () => {
  if (timerId.value) {
    clearTimeout(timerId.value)
    timerId.value = null
  }
}

// 获取表格数据
const fetchData = async () => {
  if (loading.value) return
  loading.value = true
  cleanup() // 清理之前的定时器

  const timeoutPromise = new Promise((_, reject) => {
    timerId.value = setTimeout(() => {
      reject(new Error('请求超时'))
    }, 5000) // 5秒超时保护
  })

  try {
    const dataPromise = new Promise(resolve => {
      setTimeout(() => {
        // TODO: 调用接口获取数据
        const mockData = couponMockData
        resolve(mockData)
      }, 300)
    })

    const data = await Promise.race([dataPromise, timeoutPromise])
    tableData.value = data
    pagination.value.total = 100
    
    // 更新待审批数量
    await updatePendingApprovalCount()
  } catch (error) {
    Message.error(error.message || '获取数据失败')
  } finally {
    loading.value = false
    cleanup() // 请求完成后清理定时器
  }
}

// 更新待审批数量
const updatePendingApprovalCount = async () => {
  try {
    const response = await inventoryAPI.getInventoryList({ approvalStatus: 'pending' })
    if (response.code === 200) {
      pendingApprovalCount.value = response.data.total
    }
  } catch (error) {
    console.error('获取待审批数量失败:', error)
  }
}

// 监听路由参数
const route = useRoute()

onMounted(() => {
  fetchData()
  fetchTemplateOptions()
  
  // 检查路由参数，显示创建弹窗
  if (route.query.showCreateModal === 'true') {
    showCreateModal.value = true
    // P0-模板-fail-#4 (qa 15:17 fail) 修复: 严格判断 templateId 非空 (原 if (route.query.templateId) 对 'undefined'/'' 都 falsy, 但某些场景 qa 报告 'templateId=&' URL 编码 = 空字符串, 弹窗不填充)
    if (route.query.templateId && String(route.query.templateId).trim() !== '') {
      formData.value.templateId = String(route.query.templateId)
      if (route.query.templateName) {
        formData.value.name = String(route.query.templateName)
      }
    }
  }
})

onUnmounted(() => {
  cleanup()
})

// 搜索
const handleSearch = () => {
  pagination.value.current = 1
  fetchData()
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


// 获取券模版选项
const fetchTemplateOptions = async () => {
  try {
    // 从mock数据中获取券模版列表
    const { templateMockData } = await import('@/mock/coupon')
    templateOptions.value = templateMockData.map(template => ({
      id: template.id,
      name: template.name
    }))
  } catch (error) {
    Message.error('获取券模版失败')
  }
}

// 选择模版后自动填充名称
const handleTemplateChange = (templateId) => {
  const template = templateOptions.value.find(t => t.id === templateId)
  if (template) {
    formData.value.name = `${template.name}-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}`
  }
}

// 重置表单
const resetForm = () => {
  formRef.value?.resetFields()
  showCreateModal.value = false
}

// 提交表单（作为 drawer before-ok：返回 false 阻止关闭）
const handleSubmit = async () => {
  // Arco validate() 直接 resolve 错误对象（成功时为 undefined）
  const errors = await formRef.value?.validate()
  if (errors) return false

  try {
    // TODO: 调用接口提交数据
    Message.success('创建成功')
    resetForm()
    fetchData()
    return true
  } catch (error) {
    Message.error('创建失败')
    return false
  }
}

// 作废券实例（PRD §11.3：仅 received 未使用可作废，作废后记 invalidated_time）
const handleInvalidate = (record) => {
  Modal.warning({
    title: '确认作废',
    content: `确定要作废「${record.couponName}」吗？作废后该券实例不可恢复。`,
    okText: '确认作废',
    cancelText: '取消',
    onOk: () => {
      record.status = 'invalidated'
      record.invalidated_time = new Date().toLocaleString('zh-CN', { hour12: false })
      Message.success('作废成功')
    }
  })
}

// 补发（仅 failed_* 状态可操作，走 inventoryAPI.resendCoupon）
const resendingId = ref('')
const handleResend = async (record) => {
  resendingId.value = record.instanceId
  try {
    const res = await inventoryAPI.resendCoupon(record.instanceId)
    if (res.code === 200) {
      Message.success(`券 ${record.couponId} 补发成功`)
      await fetchData()
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

// 模拟京东回调
const handleSimulateJdCallback = (record) => {
  Modal.warning({
    title: '模拟京东回调',
    content: `确定要模拟京东对「${record.couponName}」的回调吗？回调后状态将变为已核销。`,
    okText: '确认回调',
    cancelText: '取消',
    onOk: async () => {
      try {
        // 9 态无"已核销"实例态（types/api/coupon.ts §11.3），核销只体现在库存计数上
        const idx = tableData.value.findIndex(r => r.id === record.id)
        if (idx > -1) {
          const row = tableData.value[idx]
          row.used = (row.used || 0) + 1
          row.verified = (row.verified || 0) + 1
          row.claimed = Math.max((row.claimed || 0) - 1, 0)
        }
        Message.success('京东回调模拟成功，券已核销')
      } catch (error) {
        Message.error('回调模拟失败')
      }
    }
  })
}

// 撤回审核
const handleWithdraw = (record) => {
  Modal.confirm({
    title: '确认撤回',
    content: `确定要撤回「${record.couponName}」的审核申请吗？`,
    onOk: async () => {
      try {
        // TODO: 调用撤回接口
        Message.success('撤回成功');
        fetchData();
      } catch (error) {
        Message.error('撤回失败');
      }
    }
  });
};


const handleReject = (record) => {
  Modal.confirm({
    title: '确认拒绝',
    content: `确定要拒绝「${record.couponName}」吗？`,
    okText: '确认拒绝',
    cancelText: '取消',
    onOk: async () => {
      try {
        // TODO: 调用接口更新状态
        Message.success('已拒绝')
        showApproveModal.value = false
        fetchData()
      } catch (error) {
        Message.error('拒绝失败')
      }
    }
  })
}

// 删除券
const handleDelete = (record) => {
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除券包「${record.couponName}」吗？`,
    onOk: async () => {
      try {
        // TODO: 调用删除接口
        Message.success('删除成功');
        await fetchData();
      } catch (error) {
        Message.error('删除失败');
      }
    }
  });
};

// 快速审批功能
const handleQuickApproval = async () => {
  if (pendingApprovalCount.value === 0) {
    Message.warning('当前没有待审批的券库存')
    return
  }

  Modal.confirm({
    title: '确认快速审批',
    content: `确定要一次性审批通过所有 ${pendingApprovalCount.value} 个待审批的券库存吗？`,
    okText: '确认审批',
    cancelText: '取消',
    onOk: async () => {
      quickApprovalLoading.value = true
      try {
        const response = await inventoryAPI.batchApproveInventory()
        
        if (response.code === 200) {
          Message.success(response.message || '批量审批成功')
          // 刷新数据
          await fetchData()
        } else {
          Message.error(response.message || '批量审批失败')
        }
      } catch (error) {
        console.error('批量审批失败:', error)
        Message.error('批量审批失败，请稍后重试')
      } finally {
        quickApprovalLoading.value = false
      }
    }
  })
};

onMounted(() => {
  fetchData();
  fetchTemplateOptions();
})
</script>

<style scoped>
.coupon-package-container {
  padding: 20px;
}

.header-actions {
  margin-bottom: 16px;
  display: flex;
  justify-content: space-between;
}

/* 创建抽屉分组卡片（与详情页同款蓝竖条视觉语言） */
.section-card {
  margin-bottom: 16px;
  border: none;
}

.section-card :deep(.arco-card-body) {
  padding: 16px;
}

.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 0 0 16px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-1);
  border-left: 3px solid rgb(var(--primary-6, 22, 93, 255));
  padding-left: 8px;
}

.help-text {
  font-size: 12px;
  color: var(--color-text-3);
}
</style>
