<template>
  <a-drawer 
    :visible="visible" 
    :width="1000" 
    @cancel="close" 
    :esc-to-close="true" 
    :mask-closable="false" 
    :title="editMode ? '查看/编辑外数服务' : '新增外数服务'"
  >
    <a-steps :current="createStep" style="margin-bottom: 24px" small>
      <a-step title="基础配置" description="选择产品与调用方式" />
      <a-step title="样本准备与映射" description="准备数据并绑定要素" />
      <a-step title="发起审批" description="补充原因并校验" />
      <a-step title="调用发起" description="执行服务调用" />
      <a-step title="任务结束" description="回收调用结果" />
    </a-steps>

    <!-- 阶段1: 基础配置 -->
    <div v-show="createStep === 0">
      <a-form :model="basicForm" layout="vertical">
        <a-card title="外数服务配置" :bordered="false" class="form-section">
          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item label="选择外数产品" field="relatedProduct" required>
                <a-select v-model="basicForm.relatedProduct" placeholder="选择外数产品" allow-create>
                  <a-option v-for="p in store.products" :key="p.id" :value="p.name">{{ p.name }}</a-option>
                </a-select>
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="调用方式" field="callMethod" required>
                <a-radio-group v-model="basicForm.callMethod" type="button">
                  <a-radio value="online">在线调用</a-radio>
                  <a-radio value="offline">离线调用</a-radio>
                </a-radio-group>
              </a-form-item>
            </a-col>
          </a-row>
          
          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item label="调用周期" field="callCycle" required>
                <a-radio-group v-model="basicForm.callCycle">
                  <a-radio value="single">单次调用</a-radio>
                  <a-radio value="periodic">周期调用</a-radio>
                </a-radio-group>
              </a-form-item>
            </a-col>
          </a-row>

          <template v-if="basicForm.callCycle === 'periodic'">
            <a-divider orientation="left" style="margin-top: 0">周期任务配置</a-divider>
            <a-row :gutter="16">
              <a-col :span="24">
                <a-form-item label="任务发起时间" field="periodicity" required>
                  <a-radio-group v-model="basicForm.periodicity">
                    <a-radio value="daily">每日</a-radio>
                    <a-radio value="weekly">每周</a-radio>
                    <a-radio value="monthly">每月</a-radio>
                  </a-radio-group>
                </a-form-item>
              </a-col>

              <!-- 每周具体星期选择 -->
              <a-col :span="24" v-if="basicForm.periodicity === 'weekly'">
                <a-form-item label="每周具体时间" field="weekDays" required>
                  <a-checkbox-group v-model="basicForm.weekDays">
                    <a-checkbox value="1">周一</a-checkbox>
                    <a-checkbox value="2">周二</a-checkbox>
                    <a-checkbox value="3">周三</a-checkbox>
                    <a-checkbox value="4">周四</a-checkbox>
                    <a-checkbox value="5">周五</a-checkbox>
                    <a-checkbox value="6">周六</a-checkbox>
                    <a-checkbox value="0">周日</a-checkbox>
                  </a-checkbox-group>
                </a-form-item>
              </a-col>

              <!-- 每月具体日期选择 -->
              <a-col :span="24" v-if="basicForm.periodicity === 'monthly'">
                <a-form-item label="每月具体时间" field="monthDays" required>
                  <a-select v-model="basicForm.monthDays" multiple placeholder="请选择每月几号执行" allow-clear>
                    <a-option v-for="day in 31" :key="day" :value="day.toString()">{{ day }}号</a-option>
                  </a-select>
                </a-form-item>
              </a-col>
              
              <a-col :span="12">
                <a-form-item label="定时执行时间" field="scheduleTime" required>
                  <a-time-picker v-model="basicForm.scheduleTime" format="HH:mm" placeholder="选择时间" style="width: 100%" />
                </a-form-item>
              </a-col>
            </a-row>
            <a-divider style="margin-bottom: 16px"/>
          </template>

          <template v-if="basicForm.callMethod === 'offline'">
            <a-row :gutter="16">
              <a-col :span="24">
                <a-form-item label="离线调用类型" field="offlineType" required>
                  <a-radio-group v-model="basicForm.offlineType">
                    <a-radio value="production">生产调用</a-radio>
                    <a-radio value="analysis">分析调用</a-radio>
                  </a-radio-group>
                </a-form-item>
              </a-col>
              <a-col :span="24">
                <a-form-item :label="basicForm.offlineType === 'production' ? '袋鼠云任务ID' : '交互文件路径'" field="filePath" required>
                  <a-input v-model="basicForm.filePath" 
                    :placeholder="basicForm.offlineType === 'production' ? '请输入袋鼠云任务ID' : '/data/analysis/external_transfer/...'" />
                </a-form-item>
              </a-col>
            </a-row>
          </template>
        </a-card>
      </a-form>
    </div>

    <!-- 阶段2: 样本准备与映射 -->
    <div v-show="createStep === 1">
      <a-form :model="sampleForm" layout="vertical">
        <!-- 样本来源选择 -->
        <a-card title="样本来源选择" :bordered="false" class="form-section">
          <a-form-item label="准备方式" field="sampleMethod" required>
            <a-radio-group v-model="sampleForm.sampleMethod" type="button" @change="handleSampleChange">
              <a-radio value="upload">文件上传</a-radio>
              <a-radio value="database">数据库读取</a-radio>
              <a-radio value="association">样本表关联</a-radio>
            </a-radio-group>
          </a-form-item>

          <div v-if="sampleForm.sampleMethod === 'upload'" style="margin-top: 16px;">
            <a-form-item label="上传样本文件" required>
              <a-upload draggable action="/" @success="handleSampleChange" />
            </a-form-item>
          </div>

          <div v-if="sampleForm.sampleMethod === 'database'" style="margin-top: 16px;">
            <a-row :gutter="16">
              <a-col :span="12">
                <a-form-item label="数据源" required>
                  <a-select v-model="sampleForm.dataSource" placeholder="选择数据库" @change="handleSampleChange">
                    <a-option value="db1">业务库 (MySQL)</a-option>
                    <a-option value="db2">数仓 (Hive)</a-option>
                  </a-select>
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="读取表名" required>
                  <a-input v-model="sampleForm.tableName" placeholder="输入表名" @blur="handleSampleChange" />
                </a-form-item>
              </a-col>
            </a-row>
          </div>

          <div v-if="sampleForm.sampleMethod === 'association'" style="margin-top: 16px;">
            <a-form-item label="选择现有样本表" required>
              <a-select v-model="sampleForm.sampleTable" placeholder="选择已有的样本表" @change="handleSampleChange">
                <a-option value="table_a">信用评估样本集 A</a-option>
                <a-option value="table_b">反欺诈样本集 B</a-option>
              </a-select>
            </a-form-item>
          </div>
        </a-card>

        <!-- 产品要素绑定 (当样本准备好后显示) -->
        <a-card title="产品要素绑定" :bordered="false" class="form-section" v-if="sampleReady">
          <a-alert type="info" style="margin-bottom: 16px;">
            已成功读取样本字段，请将样本字段与外数产品的查询要素进行绑定。通常至少需要配置身份证、姓名和手机号。
          </a-alert>
          <a-row :gutter="16">
            <a-col :span="8">
              <a-form-item label="身份证 (ID Card)" required>
                <a-select v-model="mappingForm.idCardField" placeholder="选择样本字段">
                  <a-option v-for="field in mockSampleFields" :key="field" :value="field">{{ field }}</a-option>
                </a-select>
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="姓名 (Name)" required>
                <a-select v-model="mappingForm.nameField" placeholder="选择样本字段">
                  <a-option v-for="field in mockSampleFields" :key="field" :value="field">{{ field }}</a-option>
                </a-select>
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="手机号 (Mobile)" required>
                <a-select v-model="mappingForm.phoneField" placeholder="选择样本字段">
                  <a-option v-for="field in mockSampleFields" :key="field" :value="field">{{ field }}</a-option>
                </a-select>
              </a-form-item>
            </a-col>
          </a-row>
        </a-card>
      </a-form>
    </div>

    <!-- 阶段3: 发起审批 -->
    <div v-show="createStep === 2">
      <a-form :model="approvalForm" layout="vertical">
        <a-card title="校验与补充原因" :bordered="false" class="form-section">
          <a-form-item label="申请原因" required>
            <a-textarea v-model="approvalForm.reason" placeholder="请详细描述申请该数据服务的业务背景和用途" :rows="3" />
          </a-form-item>
          
          <a-divider />

          <a-result v-if="validationStatus !== 'idle'" :status="validationStatus === 'processing' ? 'info' : (validationStatus === 'success' ? 'success' : 'error')" :title="validationStatus === 'processing' ? '正在校验样本准确性...' : (validationStatus === 'success' ? '样本校验通过' : '样本校验失败')">
            <template #extra>
              <div v-if="validationStatus === 'processing'" style="width: 100%; text-align: center">
                <a-progress :percent="validationProgress" status="active" />
                <p style="margin-top: 8px">校验中... {{ validationProgress }}%</p>
              </div>
              <div v-else-if="validationStatus === 'success'">
                <a-alert type="success" style="margin-bottom: 16px">所有检查项均已通过，可以发起审批。</a-alert>
              </div>
              <div v-else-if="validationStatus === 'error'">
                <a-alert type="error" style="margin-bottom: 16px">发现样本格式错误，请检查。</a-alert>
                <a-button type="primary" @click="startValidation">重试校验</a-button>
              </div>
            </template>
          </a-result>

          <div v-if="validationStatus === 'idle'" style="text-align: center; margin-top: 16px;">
            <a-button type="outline" @click="startValidation" size="large">校验样本准确性</a-button>
          </div>

          <a-card title="校验日志" v-if="validationLogs.length > 0" style="margin-top: 24px; background: var(--color-fill-2);" :bordered="false">
            <a-timeline>
              <a-timeline-item v-for="(log, idx) in validationLogs" :key="idx" :dot-color="log.type === 'error' ? 'red' : 'green'">
                {{ log.message }}
              </a-timeline-item>
            </a-timeline>
          </a-card>

        </a-card>
      </a-form>
    </div>

    <!-- 阶段4: 调用发起 -->
    <div v-show="createStep === 3">
      <a-result status="success" title="审批已通过">
        <template #subtitle>您可以配置执行参数并发起服务调用。</template>
        <template #extra>
           <a-space direction="vertical" style="width: 100%">
             <a-card title="执行配置" style="width: 100%; text-align: left" :bordered="false" class="form-section">
               <a-form :model="approvalForm" layout="vertical">
                 <a-form-item label="执行时间窗口"><a-range-picker show-time style="width: 100%" /></a-form-item>
                 <a-form-item label="结果通知"><a-checkbox-group><a-checkbox value="email">邮件</a-checkbox><a-checkbox value="sms">短信</a-checkbox></a-checkbox-group></a-form-item>
               </a-form>
             </a-card>
           </a-space>
        </template>
      </a-result>
    </div>

    <!-- 阶段5: 任务结束 -->
    <div v-show="createStep === 4">
      <a-result status="success" title="调用已完成">
        <template #subtitle>服务执行成功，共处理数据 12,500 条。</template>
        <template #extra>
          <a-space>
            <a-button type="primary">下载结果数据</a-button>
            <a-button>查看执行报告</a-button>
          </a-space>
        </template>
      </a-result>
      <a-table :data="[{id:1, time:'2024-05-20 10:00', status:'成功', count: 12500}]" :pagination="false" style="margin-top: 24px">
         <a-table-column title="执行时间" data-index="time" />
         <a-table-column title="状态" data-index="status" />
         <a-table-column title="数据量" data-index="count" />
      </a-table>
    </div>

    <template #footer>
      <div class="drawer-footer">
        <a-button @click="close" v-if="createStep === 0 || createStep === 3 || createStep === 4">取消</a-button>
        <a-button @click="goToStep(createStep - 1)" v-if="createStep > 0 && createStep < 3">上一步</a-button>
        <a-button type="primary" @click="goToStep(createStep + 1)" v-if="createStep < 2">下一步</a-button>
        <a-button type="primary" :disabled="validationStatus !== 'success'" @click="submitApproval" v-if="createStep === 2">发起审批</a-button>
        <a-button type="primary" status="danger" @click="goToStep(4)" v-if="createStep === 3">发起调用</a-button>
        <a-button type="primary" @click="close" v-if="createStep === 4">完成</a-button>
      </div>
    </template>

  </a-drawer>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { Message } from '@arco-design/web-vue'
import { useExternalDataStore } from '@/modules/external-data/stores'

const store = useExternalDataStore()

const props = defineProps<{
  visible: boolean
  editMode: boolean
  initialData?: any
  initialServiceType?: string
}>()

const emit = defineEmits(['update:visible', 'success'])

const createStep = ref(0)
const editingId = ref<string | null>(null)
const sampleReady = ref(false)
const mockSampleFields = ref<string[]>([])

// 表单数据模型
const basicForm = reactive({
  relatedProduct: '',
  callMethod: 'online', // online, offline
  offlineType: 'production', // production, analysis
  filePath: '',
  callCycle: 'single', // single, periodic
  periodicity: 'daily', // daily, weekly, monthly
  weekDays: [] as string[],
  monthDays: [] as string[],
  scheduleTime: ''
})

const sampleForm = reactive({
  sampleMethod: 'upload', // upload, database, association
  dataSource: '',
  tableName: '',
  sampleTable: ''
})

const mappingForm = reactive({
  idCardField: '',
  nameField: '',
  phoneField: ''
})

const approvalForm = reactive({
  reason: ''
})

// 校验状态
const validationStatus = ref<'idle' | 'processing' | 'success' | 'error'>('idle')
const validationProgress = ref(0)
const validationLogs = ref<{ type: 'info' | 'error' | 'success'; message: string }[]>([])

const close = () => {
  emit('update:visible', false)
}

const resetCreateForm = () => {
  // 重置基础配置
  basicForm.relatedProduct = ''
  basicForm.callMethod = 'online'
  basicForm.offlineType = 'production'
  basicForm.filePath = ''
  basicForm.callCycle = 'single'
  basicForm.periodicity = 'daily'
  basicForm.weekDays = []
  basicForm.monthDays = []
  basicForm.scheduleTime = ''
  
  // 重置样本准备
  sampleForm.sampleMethod = 'upload'
  sampleForm.dataSource = ''
  sampleForm.tableName = ''
  sampleForm.sampleTable = ''
  
  // 重置样本映射
  mappingForm.idCardField = ''
  mappingForm.nameField = ''
  mappingForm.phoneField = ''
  
  // 重置审批
  approvalForm.reason = ''

  createStep.value = 0
  resetValidation()
}

const resetValidation = () => {
  validationStatus.value = 'idle'
  validationProgress.value = 0
  validationLogs.value = []
}

watch(() => props.visible, (val) => {
  if (val) {
    if (props.editMode && props.initialData) {
      // 编辑模式
      editingId.value = String(props.initialData.id || '')
      basicForm.relatedProduct = props.initialData.relatedProduct || ''
      // 这里可根据 mock 数据进一步填充
      
      const status = props.initialData.status || 'draft'
      if (status === 'draft') {
        createStep.value = 0
        resetValidation()
      } else if (status === 'approving') {
        createStep.value = 3 // 跳转到已提交状态 (现为3)
      } else if (status === 'executing') {
        createStep.value = 3 // 调用发起
      } else if (status === 'completed') {
        createStep.value = 4 // 结果回收
      }
    } else {
      // 创建模式
      resetCreateForm()
    }
  }
})

// 导航逻辑
const handleSampleChange = () => {
  // Mock 模拟读取样本内容，解析出字段
  if (
    (sampleForm.sampleMethod === 'upload') ||
    (sampleForm.sampleMethod === 'database' && sampleForm.dataSource && sampleForm.tableName) ||
    (sampleForm.sampleMethod === 'association' && sampleForm.sampleTable)
  ) {
    Message.success('成功读取样本内容，已解析出可用字段')
    mockSampleFields.value = ['id_no', 'cert_num', 'name', 'cust_name', 'phone', 'mobile_no']
    sampleReady.value = true
  } else {
    sampleReady.value = false
    mockSampleFields.value = []
    mappingForm.idCardField = ''
    mappingForm.nameField = ''
    mappingForm.phoneField = ''
  }
}

const goToStep = (step: number) => {
  if (step === 1 && !basicForm.relatedProduct) {
    Message.warning('请选择外数产品')
    return
  }
  if (step === 2 && !sampleReady.value) {
    Message.warning('请先完成样本来源选择并读取数据')
    return
  }
  if (step === 2 && (!mappingForm.idCardField || !mappingForm.nameField || !mappingForm.phoneField)) {
    Message.warning('请完成所有的产品要素绑定')
    return
  }
  createStep.value = step
}

const startValidation = () => {
  validationStatus.value = 'processing'
  validationProgress.value = 0
  validationLogs.value = []
  
  const steps = [
    { progress: 20, msg: '正在检查样本映射格式...' },
    { progress: 40, msg: '映射格式检查通过' },
    { progress: 60, msg: '正在验证数据完整性...' },
    { progress: 80, msg: '完整性验证通过' },
    { progress: 100, msg: '样本数据合规性检查通过' }
  ]
  
  let i = 0
  const timer = setInterval(() => {
    if (i >= steps.length) {
      clearInterval(timer)
      validationStatus.value = 'success'
      return
    }
    const step = steps[i]
    validationProgress.value = step.progress
    validationLogs.value.push({ 
      type: step.msg.includes('通过') ? 'success' : 'info', 
      message: step.msg 
    })
    i++
  }, 800)
}

const submitApproval = async () => {
  if (!approvalForm.reason) {
    Message.warning('请补充申请原因')
    return
  }
  
  const payload = {
    name: `${basicForm.relatedProduct}-外数调用`,
    // 优先沿用服务场景入口带入的服务类型，未指定时按调用方式回退
    serviceType: props.initialServiceType || (basicForm.callMethod === 'online' ? '在线批量调用' : '外数离线回溯申请'),
    relatedProduct: basicForm.relatedProduct,
    applyData: {
      basic: basicForm,
      sample: sampleForm,
      mapping: mappingForm,
      approval: approvalForm
    },
    status: 'approving',
    currentStage: 'approval'
  }
  
  const ok = props.editMode && editingId.value 
    ? await store.updateService(String(editingId.value), payload as any) 
    : await store.createService(payload as any)
    
  if (ok) { 
    Message.success('已发起审批')
    emit('success')
    // 将状态设为 调用发起 以模拟后续流程
    createStep.value = 3
  } else { 
    Message.error(store.error || '提交失败') 
  }
}
</script>

<style scoped>
.form-section { margin-bottom: 16px; border: 1px solid var(--color-neutral-3); border-radius: 4px; }
.drawer-footer { margin-top: 24px; text-align: right; }
.drawer-footer button { margin-left: 12px; }
</style>