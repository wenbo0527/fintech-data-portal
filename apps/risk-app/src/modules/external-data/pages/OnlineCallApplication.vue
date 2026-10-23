<template>
  <div class="online-call-application">
    <a-page-header title="外数线上调用服务申请" subtitle="针对风险贷中单次或周期发起的线上调用服务申请">
      <template #extra>
        <a-button @click="goBack">返回</a-button>
      </template>
    </a-page-header>

    <a-card class="apply-card">
      <!-- 申请类型选择 -->
      <div class="application-type-bar">
        <a-space size="large">
          <span class="type-label">申请类型</span>
          <a-radio-group v-model="applicationType" type="button" @change="handleTypeChange">
            <a-radio value="first">首次申请</a-radio>
            <a-radio value="subsequent">后续申请</a-radio>
          </a-radio-group>
          <a-tag
            v-if="applicationType === 'subsequent' && isWithinLimits && existingApplication"
            color="green"
            bordered
          >
            快速审批通道
          </a-tag>
          <a-tag
            v-if="applicationType === 'subsequent' && !isWithinLimits && existingApplication"
            color="red"
            bordered
          >
            超出任务条件 - 标准审批流程
          </a-tag>
        </a-space>
      </div>

      <!-- 后续申请：简化审批信息栏 -->
      <div v-if="applicationType === 'subsequent' && existingApplication" class="approval-info-bar">
        <div class="approval-info-header">
          <span class="approval-info-title">简化审批信息</span>
          <a-tag color="green" size="small">已通过</a-tag>
        </div>
        <a-descriptions :column="5" size="small" style="margin-top: 8px">
          <a-descriptions-item label="首次审批时间">{{ existingApplication.first_approval_time }}</a-descriptions-item>
          <a-descriptions-item label="总次数">{{ existingApplication.total_count }}</a-descriptions-item>
          <a-descriptions-item label="剩余次数">
            <span :class="{ 'count-warning': existingApplication.total_count - existingApplication.used_count <= 2 }">
              {{ existingApplication.total_count - existingApplication.used_count }}
            </span>
          </a-descriptions-item>
          <a-descriptions-item label="单次客户限制">
            {{ existingApplication.batch_user_limit.toLocaleString() }}
          </a-descriptions-item>
          <a-descriptions-item label="累计去重客户限制">
            {{ existingApplication.dedup_weight_limit.toLocaleString() }}
          </a-descriptions-item>
        </a-descriptions>
      </div>

      <!-- 动态步骤 -->
      <a-steps :current="currentStep" style="margin-bottom: 24px">
        <a-step
          v-for="(s, i) in stepsList"
          :key="i"
          :title="s.title"
          :description="s.description"
        />
      </a-steps>

      <div class="step-content">
        <!-- 步骤1：基础信息 -->
        <div v-show="currentStep === 0">
          <a-form :model="step1Form" layout="vertical">
            <a-row :gutter="24">
              <a-col :span="12">
                <a-form-item label="外数产品" field="product" required>
                  <a-input
                    :model-value="step1Form.product"
                    readonly
                    placeholder="-"
                  >
                    <template #append>
                      <a-tag color="arcoblue" size="small">年包类</a-tag>
                    </template>
                  </a-input>
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="团队经理" field="manager" required>
                  <a-select v-model="step1Form.manager" placeholder="请选择团队经理" allow-search allow-clear>
                    <a-option v-for="m in managerOptions" :key="m" :value="m">{{ m }}</a-option>
                  </a-select>
                </a-form-item>
              </a-col>
            </a-row>

            <!-- 首次申请：周期任务参数 -->
            <template v-if="applicationType === 'first'">
              <a-divider orientation="left" style="margin-top: 8px">周期任务参数</a-divider>
              <a-row :gutter="24">
                <a-col :span="24">
                  <a-form-item label="周期任务申请周期" field="cycleRange" required>
                    <a-range-picker
                      v-model="step1Form.cycleRange"
                      style="width: 100%"
                      :placeholder="['开始日期', '结束日期']"
                    />
                  </a-form-item>
                </a-col>
                <a-col :span="8">
                  <a-form-item label="总次数" field="totalCount" required>
                    <a-input-number
                      v-model="step1Form.totalCount"
                      :min="1"
                      :max="365"
                      placeholder="请输入"
                      style="width: 100%"
                    />
                  </a-form-item>
                </a-col>
                <a-col :span="8">
                  <a-form-item label="单次跑批客户量限制（单位：万）" field="batchUserLimit" required>
                    <a-input-number
                      v-model="step1Form.batchUserLimit"
                      :min="1"
                      :max="10000000"
                      :step="1000"
                      placeholder="请输入"
                      style="width: 100%"
                    />
                  </a-form-item>
                </a-col>
                <a-col :span="8">
                  <a-form-item label="累计去重客户量限制（单位：万）" field="dedupWeightLimit" required>
                    <a-input-number
                      v-model="step1Form.dedupWeightLimit"
                      :min="1"
                      :step="1000"
                      placeholder="请输入"
                      style="width: 100%"
                    />
                  </a-form-item>
                </a-col>
              </a-row>
            </template>

            <!-- 后续申请：离线计算说明 -->
            <template v-if="applicationType === 'subsequent' && existingApplication">
              <a-divider orientation="left" style="margin-top: 8px">本次跑批参数</a-divider>
              <a-alert type="info" style="margin-top: 4px">
                本次跑批客户量及累计去重客户量需在任务发起后基于样本数据离线计算，预计耗时约 10~30 分钟。计算完成后将自动与首次审批限制进行比对，若在限制范围内则走快速审批通道，超出则转入标准审批流程。
              </a-alert>
            </template>

            <a-row :gutter="24">
              <a-col :span="24">
                <a-form-item label="申请说明" field="description" required>
                  <a-textarea
                    v-model="step1Form.description"
                    placeholder="请描述申请该服务的业务背景和用途"
                    :rows="4"
                    :max-length="500"
                    show-word-limit
                  />
                </a-form-item>
              </a-col>
            </a-row>
          </a-form>
        </div>

        <!-- 步骤2（标准流程）：样本选择 -->
        <div v-show="currentStep === 1 && !isSimplifiedFlow">
          <a-form :model="step2Form" layout="vertical">
            <a-row :gutter="24">
              <a-col :span="12">
                <a-form-item label="样本库表" field="sampleTable" required>
                  <a-select
                    v-model="step2Form.sampleTable"
                    placeholder="请选择样本库表"
                    allow-search
                    @change="handleSampleTableChange"
                  >
                    <a-option v-for="t in sampleTableOptions" :key="t.id" :value="t.id">
                      {{ t.logicName }} (V{{ t.version }})
                    </a-option>
                  </a-select>
                </a-form-item>
              </a-col>
            </a-row>

            <a-alert v-if="selectedSampleTable" type="info" style="margin-top: 8px">
              <template #title>已选样本表信息</template>
              <a-descriptions :column="2" size="small">
                <a-descriptions-item label="样本表名称">{{ selectedSampleTable.logicName }}</a-descriptions-item>
                <a-descriptions-item label="当前版本">{{ selectedSampleTable.version }}</a-descriptions-item>
                <a-descriptions-item label="创建人">{{ selectedSampleTable.creator }}</a-descriptions-item>
                <a-descriptions-item label="更新时间">{{ selectedSampleTable.updateTime }}</a-descriptions-item>
              </a-descriptions>
            </a-alert>
          </a-form>
        </div>

        <!-- 步骤2（简化流程）：确认提交 -->
        <div v-show="currentStep === 1 && isSimplifiedFlow">
          <a-alert type="success" style="margin-bottom: 16px">
            本次申请将走快速审批通道，提交后系统将基于样本数据离线计算本次跑批客户量及累计去重客户量，并与首次审批限制自动比对。
          </a-alert>
          <a-descriptions :column="2" bordered>
            <a-descriptions-item label="外数产品">{{ step1Form.product }}</a-descriptions-item>
            <a-descriptions-item label="团队经理">{{ step1Form.manager }}</a-descriptions-item>
            <a-descriptions-item label="申请周期">
              {{ cycleText(existingApplication?.cycle_start, existingApplication?.cycle_end) }}
            </a-descriptions-item>
            <a-descriptions-item label="剩余次数">
              {{ existingApplication?.total_count - existingApplication?.used_count }} / {{ existingApplication?.total_count }}
            </a-descriptions-item>
            <a-descriptions-item label="单次跑批客户量限制（单位：万）">
              {{ existingApplication?.batch_user_limit.toLocaleString() }}
            </a-descriptions-item>
            <a-descriptions-item label="累计去重客户量限制（单位：万）">
              {{ existingApplication?.dedup_weight_limit.toLocaleString() }}
            </a-descriptions-item>
            <a-descriptions-item label="本次跑批客户量" :span="2">
              <span style="color: var(--color-text-3)">任务发起后离线计算</span>
            </a-descriptions-item>
            <a-descriptions-item label="本次累计去重客户量" :span="2">
              <span style="color: var(--color-text-3)">任务发起后离线计算</span>
            </a-descriptions-item>
            <a-descriptions-item label="已绑定参数" :span="2">
              <a-space wrap>
                <a-tag v-for="b in existingApplication?.bindings" :key="b.element" color="arcoblue">
                  {{ elementText(b.element) }} → {{ b.sampleField }}
                </a-tag>
              </a-space>
            </a-descriptions-item>
            <a-descriptions-item label="申请说明" :span="2">{{ step1Form.description }}</a-descriptions-item>
          </a-descriptions>
        </div>

        <!-- 步骤3（标准流程）：参数绑定 -->
        <div v-show="currentStep === 2 && !isSimplifiedFlow">
          <a-form layout="vertical">
            <a-alert type="info" style="margin-bottom: 16px">
              请将样本表字段与外数产品的查询要素进行映射绑定。至少需要绑定身份证、手机号、姓名（如产品需要）。
            </a-alert>

            <a-table :data="step3Form.bindings" :pagination="false" row-key="key">
              <template #columns>
                <a-table-column title="产品要素" data-index="element" :width="180">
                  <template #cell="{ rowIndex }">
                    <a-select v-model="step3Form.bindings[rowIndex].element" placeholder="选择要素">
                      <a-option value="idCard">身份证</a-option>
                      <a-option value="name">姓名</a-option>
                      <a-option value="mobile">手机号</a-option>
                    </a-select>
                  </template>
                </a-table-column>
                <a-table-column title="样本字段" data-index="sampleField" :width="180">
                  <template #cell="{ rowIndex }">
                    <a-select v-model="step3Form.bindings[rowIndex].sampleField" placeholder="选择字段">
                      <a-option v-for="f in sampleFields" :key="f" :value="f">{{ f }}</a-option>
                    </a-select>
                  </template>
                </a-table-column>
                <a-table-column title="映射说明" data-index="description">
                  <template #cell="{ rowIndex }">
                    <a-input v-model="step3Form.bindings[rowIndex].description" placeholder="可选说明" />
                  </template>
                </a-table-column>
                <a-table-column title="操作" :width="80" align="center">
                  <template #cell="{ rowIndex }">
                    <a-button
                      type="text"
                      status="danger"
                      size="small"
                      @click="removeBinding(rowIndex)"
                      :disabled="step3Form.bindings.length <= 1"
                    >
                      删除
                    </a-button>
                  </template>
                </a-table-column>
              </template>
            </a-table>

            <a-button type="outline" style="margin-top: 12px" @click="addBinding">
              <template #icon><icon-plus /></template>
              添加绑定
            </a-button>
          </a-form>
        </div>
      </div>

      <div class="step-footer">
        <a-button v-if="currentStep > 0" @click="prevStep">上一步</a-button>
        <a-space style="margin-left: auto">
          <a-button @click="goBack">取消</a-button>
          <a-button v-if="currentStep < totalSteps - 1" type="primary" @click="nextStep">下一步</a-button>
          <a-button
            v-if="currentStep === totalSteps - 1"
            type="primary"
            :loading="submitting"
            @click="submitApplication"
          >
            {{ isSimplifiedFlow ? '快速提交申请' : '提交申请' }}
          </a-button>
        </a-space>
      </div>
    </a-card>

    <a-modal v-model:visible="successVisible" :title="isSimplifiedFlow ? '快速审批通过' : '申请已提交'" :footer="false" closable @ok="goBack" @cancel="goBack">
      <a-result status="success" :title="successTitle">
        <template #subtitle>{{ successSubtitle }}</template>
        <template #extra>
          <a-button type="primary" @click="goBack">返回服务列表</a-button>
        </template>
      </a-result>
      <template v-if="isSimplifiedFlow && computedResult">
        <a-divider style="margin: 12px 0" />
        <a-descriptions :column="2" size="small" :title="'离线计算结果'">
          <a-descriptions-item label="本次跑批客户量">
            {{ computedResult.customerCount.toLocaleString() }}
            <a-tag
              :color="computedResult.customerCount <= existingApplication?.batch_user_limit ? 'green' : 'red'"
              size="small"
              style="margin-left: 4px"
            >
              {{ computedResult.customerCount <= existingApplication?.batch_user_limit ? '在限制内' : '超出限制' }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="本次累计去重客户量">
            {{ computedResult.dedupCount.toLocaleString() }}
            <a-tag
              :color="computedResult.dedupCount <= existingApplication?.dedup_weight_limit ? 'green' : 'red'"
              size="small"
              style="margin-left: 4px"
            >
              {{ computedResult.dedupCount <= existingApplication?.dedup_weight_limit ? '在限制内' : '超出限制' }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="单次跑批客户量限制（单位：万）">
            {{ existingApplication?.batch_user_limit.toLocaleString() }}
          </a-descriptions-item>
          <a-descriptions-item label="累计去重客户量限制（单位：万）">
            {{ existingApplication?.dedup_weight_limit.toLocaleString() }}
          </a-descriptions-item>
        </a-descriptions>
      </template>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { IconPlus } from '@arco-design/web-vue/es/icon'

const router = useRouter()
const currentStep = ref(0)
const submitting = ref(false)
const successVisible = ref(false)
const computedResult = ref<{ customerCount: number; dedupCount: number } | null>(null)

/* ---------- Mock 数据 ---------- */
const managerOptions = ref(['张三', '李四', '王五', '赵六', '钱七'])

// 已有审批记录（用于后续申请时展示首次配置限制和剩余次数）
const existingApplications = ref([
  {
    product: '字节-金融存客分层（年包类 批量外数产品）',
    first_approval_time: '2024-01-05 10:30:00',
    cycle_start: '2024-01-01',
    cycle_end: '2024-12-31',
    total_count: 12,
    batch_user_limit: 50000,
    dedup_weight_limit: 5000,
    used_count: 5,
    sample_customer_count: 35000,
    sample_dedup_count: 3200,
    sample_table_id: 'sample_1',
    sample_table_name: 'sample_risk_model_v1',
    bindings: [
      { element: 'idCard', sampleField: 'id_no', description: '身份证映射' },
      { element: 'mobile', sampleField: 'phone', description: '手机号映射' },
      { element: 'name', sampleField: 'name', description: '姓名映射' }
    ]
  }
])

const sampleTableOptions = ref([
  { id: 'sample_1', logicName: 'sample_risk_model_v1', version: 'V1.0', creator: '张三', updateTime: '2023-10-27 10:30:00' },
  { id: 'sample_2', logicName: 'sample_credit_check_v2', version: 'V1.1', creator: '李四', updateTime: '2023-10-25 15:20:00' },
  { id: 'sample_3', logicName: 'sample_fraud_detection_v1', version: 'V1.2', creator: '王五', updateTime: '2023-10-20 09:00:00' }
])

const sampleFields = ref(['id_no', 'cert_num', 'name', 'cust_name', 'phone', 'mobile_no'])

/* ---------- 申请类型与流程控制 ---------- */
const applicationType = ref<'first' | 'subsequent'>('first')
const flowType = ref<'first' | 'simplified' | 'standard'>('first')

const step1Form = reactive({
  product: '字节-金融存客分层（年包类 批量外数产品）',
  manager: '',
  description: '',
  // 首次申请：周期任务参数
  cycleRange: [] as string[],
  totalCount: undefined as number | undefined,
  batchUserLimit: undefined as number | undefined,
  dedupWeightLimit: undefined as number | undefined
})

const step2Form = reactive({
  sampleTable: ''
})

const step3Form = reactive({
  bindings: [
    { key: 1, element: 'idCard', sampleField: '', description: '' },
    { key: 2, element: 'mobile', sampleField: '', description: '' },
    { key: 3, element: 'name', sampleField: '', description: '' }
  ]
})

/* ---------- 计算属性 ---------- */
const existingApplication = computed(() => {
  return existingApplications.value.find(a => a.product === step1Form.product)
})

const hasExistingApplication = computed(() => !!existingApplication.value)

const isWithinLimits = computed(() => {
  if (!existingApplication.value) return false
  const batchOk = existingApplication.value.sample_customer_count <= existingApplication.value.batch_user_limit
  const dedupOk = existingApplication.value.sample_dedup_count <= existingApplication.value.dedup_weight_limit
  const countOk = existingApplication.value.used_count < existingApplication.value.total_count
  return batchOk && dedupOk && countOk
})

const isSimplifiedFlow = computed(() => flowType.value === 'simplified')

const stepsList = computed(() => {
  if (isSimplifiedFlow.value) {
    return [
      { title: '基础信息', description: '选择产品及本次跑批参数' },
      { title: '确认提交', description: '确认参数并快速提交' }
    ]
  }
  return [
    { title: '基础信息', description: applicationType.value === 'first' ? '选择产品及周期任务参数' : '选择产品及本次跑批参数' },
    { title: '样本选择', description: '选择样本库表' },
    { title: '参数绑定', description: '绑定参数列并提交' }
  ]
})

const totalSteps = computed(() => stepsList.value.length)

const selectedSampleTable = computed(() => {
  return sampleTableOptions.value.find(t => t.id === step2Form.sampleTable)
})

const successTitle = computed(() => isSimplifiedFlow.value ? '快速审批通过' : '申请已提交')
const successSubtitle = computed(() =>
  isSimplifiedFlow.value
    ? '您的外数线上调用服务申请已通过快速审批通道，可直接执行跑批。'
    : '您的外数线上调用服务申请已成功提交，状态为「审批中」。'
)

/* ---------- 工具函数 ---------- */
const cycleText = (start?: string, end?: string) => {
  if (!start && !end) return '-'
  return `${start} ~ ${end}`
}

const elementText = (el: string) => {
  const map: Record<string, string> = { idCard: '身份证', mobile: '手机号', name: '姓名' }
  return map[el] || el
}

/* ---------- 事件处理 ---------- */
const handleTypeChange = () => {
  currentStep.value = 0
  flowType.value = applicationType.value === 'first' ? 'first' : 'standard'
}

const handleSampleTableChange = (value: string) => {
  if (value) {
    Message.success('已选择样本表')
    sampleFields.value = ['id_no', 'cert_num', 'name', 'cust_name', 'phone', 'mobile_no', 'email', 'address']
  }
}

const addBinding = () => {
  step3Form.bindings.push({
    key: Date.now(),
    element: '',
    sampleField: '',
    description: ''
  })
}

const removeBinding = (index: number) => {
  step3Form.bindings.splice(index, 1)
}

const nextStep = () => {
  if (currentStep.value === 0) {
    if (!step1Form.product) {
      Message.warning('请选择外数产品')
      return
    }
    if (!step1Form.manager) {
      Message.warning('请选择团队经理')
      return
    }
    if (!step1Form.description) {
      Message.warning('请填写申请说明')
      return
    }

    if (applicationType.value === 'first') {
      if (!step1Form.cycleRange || step1Form.cycleRange.length !== 2) {
        Message.warning('请选择周期任务申请周期')
        return
      }
      if (!step1Form.totalCount || step1Form.totalCount < 1) {
        Message.warning('请输入总次数')
        return
      }
      if (!step1Form.batchUserLimit || step1Form.batchUserLimit < 1) {
        Message.warning('请输入单次跑批客户量限制')
        return
      }
      if (!step1Form.dedupWeightLimit) {
        Message.warning('请输入累计去重客户量限制')
        return
      }
      flowType.value = 'first'
    } else if (applicationType.value === 'subsequent') {
      // 后续申请：参数由样本自动计算，无需手动校验
      flowType.value = isWithinLimits.value ? 'simplified' : 'standard'
    }
  } else if (currentStep.value === 1 && !isSimplifiedFlow.value) {
    if (!step2Form.sampleTable) {
      Message.warning('请选择样本库表')
      return
    }
  }

  currentStep.value++
}

const prevStep = () => {
  currentStep.value--
}

const submitApplication = () => {
  if (isSimplifiedFlow.value) {
    submitting.value = true
    // 模拟离线计算（样本量大，耗时较长）
    setTimeout(() => {
      submitting.value = false
      computedResult.value = {
        customerCount: existingApplication.value?.sample_customer_count ?? 0,
        dedupCount: existingApplication.value?.sample_dedup_count ?? 0
      }
      successVisible.value = true
    }, 1500)
    return
  }

  const validBindings = step3Form.bindings.filter(b => b.element && b.sampleField)
  if (validBindings.length === 0) {
    Message.warning('请至少完成一项参数绑定')
    return
  }

  submitting.value = true
  setTimeout(() => {
    submitting.value = false
    successVisible.value = true
  }, 1500)
}

const goBack = () => {
  successVisible.value = false
  computedResult.value = null
  // 服务申请入口统一收敛到「服务场景入口」
  router.push({ name: 'RiskExternalDataServiceScene' })
}
</script>

<style scoped>
.online-call-application {
  padding: 0 16px;
}

.apply-card {
  margin-top: 20px;
}

.application-type-bar {
  margin-bottom: 16px;
  padding: 12px 16px;
  background: var(--color-fill-1);
  border-radius: 4px;
}

.type-label {
  font-weight: 500;
}

.count-warning {
  color: #ff7d00;
  font-weight: 600;
}

.approval-info-bar {
  margin-bottom: 16px;
  padding: 12px 16px;
  background: var(--color-fill-1);
  border-radius: 4px;
  border-left: 3px solid rgb(var(--green-6));
}

.approval-info-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.approval-info-title {
  font-weight: 500;
  font-size: 14px;
}

.step-content {
  min-height: 300px;
  padding: 16px 0;
}

.step-footer {
  display: flex;
  justify-content: space-between;
  padding-top: 16px;
  border-top: 1px solid var(--color-neutral-3);
}
</style>
