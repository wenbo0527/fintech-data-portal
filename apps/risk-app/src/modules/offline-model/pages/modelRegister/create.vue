<template>
  <div class="model-create-page">
    <div class="page-header">
      <a-breadcrumb>
        <a-breadcrumb-item to="/model-offline-analysis/model-register">模型注册</a-breadcrumb-item>
        <a-breadcrumb-item>新建模型</a-breadcrumb-item>
      </a-breadcrumb>
      <h1 class="page-title">新建模型</h1>
    </div>
    <div class="page-content">
      <a-card :bordered="false" class="panel-card">
        <a-form :model="platformForm" layout="inline" style="margin-bottom: 12px">
          <a-form-item label="模型平台服务">
            <a-select v-model="selectedService" placeholder="选择平台模型服务" allow-search style="min-width: 260px" @change="handleServiceChange">
              <a-option v-for="s in platformServices" :key="s.serviceName" :value="s.serviceName">{{ s.name }} ({{ s.version }})</a-option>
            </a-select>
          </a-form-item>
          <a-form-item>
            <a-button @click="pullModelFile" :disabled="!selectedService">拉取模型文件</a-button>
          </a-form-item>
        </a-form>
      </a-card>

      <a-collapse :default-active-key="['basic','io-validate','featureize','udf','test']" :bordered="false">
        <a-collapse-item key="basic" header="1. 模型基础信息">
          <a-form :model="form" :rules="rules" layout="vertical" ref="formRef">
            <a-form-item field="name" label="模型名称" required>
              <a-input v-model="form.name" placeholder="请输入模型名称" />
            </a-form-item>
            <a-form-item field="code" label="模型编码" required>
              <a-input v-model="form.code" placeholder="请输入模型编码" />
            </a-form-item>
            <a-row :gutter="16">
              <a-col :span="12">
                <a-form-item field="type" label="模型类型" required>
                  <a-select v-model="form.type" placeholder="请选择模型类型">
                    <a-option value="daily">日模型</a-option>
                    <a-option value="monthly">月模型</a-option>
                    <a-option value="classification">分类模型</a-option>
                    <a-option value="regression">回归模型</a-option>
                    <a-option value="clustering">聚类模型</a-option>
                    <a-option value="deep_learning">深度学习</a-option>
                  </a-select>
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item field="framework" label="算法框架" required>
                  <a-select v-model="form.framework" placeholder="请选择算法框架">
                    <a-option value="sklearn">Scikit-learn</a-option>
                    <a-option value="tensorflow">TensorFlow</a-option>
                    <a-option value="pytorch">PyTorch</a-option>
                    <a-option value="xgboost">XGBoost</a-option>
                  </a-select>
                </a-form-item>
              </a-col>
            </a-row>
            <a-row :gutter="16">
              <a-col :span="12">
                <a-form-item field="version" label="版本" required>
                  <a-input v-model="form.version" placeholder="例如 1" />
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item field="parameters" label="超参数(JSON)">
                  <a-input v-model="form.parameters" placeholder='{"n_estimators":100}' />
                </a-form-item>
              </a-col>
            </a-row>
            <a-form-item field="variableVersion" label="特征版本" required>
              <a-radio-group v-model="form.variableVersion" type="button">
                <a-radio value="new">新特征模型</a-radio>
                <a-radio value="old">老特征模型</a-radio>
              </a-radio-group>
            </a-form-item>
            <a-form-item field="description" label="描述">
              <a-textarea v-model="form.description" placeholder="请输入模型描述" :max-length="300" show-word-limit />
            </a-form-item>
          </a-form>
        </a-collapse-item>

        <a-collapse-item key="io-validate" header="2. 入参/出参定义">
          <a-card :bordered="false" class="panel-card">
            <div class="io-block">
              <div class="io-block-header">
                <strong>入参定义</strong>
                <!-- 一键样本表匹配：只碰「绑定来源」为空的入参，N 为 0 时置灰 -->
                <a-tooltip :disabled="!!unboundInputCount" content="所有字段均已绑定来源">
                  <span>
                    <a-button
                      type="outline"
                      size="small"
                      :disabled="!unboundInputCount"
                      @click="bindUnboundToSample"
                    >
                      一键样本表匹配（{{ unboundInputCount }}）
                    </a-button>
                  </span>
                </a-tooltip>
              </div>
              <a-table :data="form.inputParams" :columns="inputColumns" row-key="__key" :pagination="false">
                <template #paramKind="{ record }">
                  <a-select v-model="record.paramKind" placeholder="参数类型">
                    <a-option value="sample">样本表</a-option>
                    <a-option value="feature">离线特征</a-option>
                  </a-select>
                </template>
                <template #type="{ record }">
                  <a-select v-model="record.type" placeholder="类型">
                    <a-option value="number">number</a-option>
                    <a-option value="string">string</a-option>
                    <a-option value="boolean">boolean</a-option>
                    <a-option value="array">array</a-option>
                  </a-select>
                </template>
                <template #featureId="{ record }">
                  <a-select :model-value="bindSourceOf(record)" placeholder="绑定来源" allow-search @change="val => onFeatureBindChange(record, val)">
                    <a-option value="__SAMPLE__">样本表提供</a-option>
                    <a-option v-for="f in featureOptions" :key="f.id" :value="f.id">{{ f.name }} ({{ f.code }})</a-option>
                  </a-select>
                </template>
              </a-table>
            </div>
            <div class="io-block">
              <div class="io-block-header">
                <strong>出参定义</strong>
              </div>
              <a-table :data="form.outputParams" :columns="outputColumns" row-key="__key" :pagination="false">
                <template #type="{ record }">
                  <a-select v-model="record.type" placeholder="类型">
                    <a-option value="number">number</a-option>
                    <a-option value="string">string</a-option>
                    <a-option value="boolean">boolean</a-option>
                    <a-option value="array">array</a-option>
                  </a-select>
                </template>
              </a-table>
            </div>
            <a-space>
              <a-button type="outline" @click="runIOValidate">执行校验</a-button>
              <a-tag v-if="ioValidateMsg" color="green">{{ ioValidateMsg }}</a-tag>
            </a-space>
          </a-card>
        </a-collapse-item>

        <a-collapse-item key="featureize" header="3. 输出特征化">
          <a-card :bordered="false" class="panel-card">
            <a-space style="margin-bottom: 8px">
              <a-button type="outline" @click="autoFillOutputFeatures">自动填充特征信息</a-button>
              <a-button type="primary" @click="registerAllOutputFeatures">全部注册为特征</a-button>
              <a-tag>目标表：{{ DEFAULT_TARGET_TABLE }}</a-tag>
            </a-space>
            <a-table :data="featureizeRows" :columns="featureizeCols" row-key="name" :pagination="false" size="small">
              <template #codeCell="{ record }">
                <a-input v-model="record.code" placeholder="特征编码" />
              </template>
              <template #cnNameCell="{ record }">
                <a-input v-model="record.cnName" placeholder="中文名" />
              </template>
              <template #dataTypeCell="{ record }">
                <a-select v-model="record.dataType" placeholder="数据类型" style="min-width: 120px">
                  <a-option value="int">int</a-option>
                  <a-option value="double">double</a-option>
                  <a-option value="string">string</a-option>
                </a-select>
              </template>
              <template #defaultValueCell="{ record }">
                <a-input v-model="record.defaultValue" placeholder="默认值" />
              </template>
              <template #processingLogicCell="{ record }">
                <a-input v-model="record.processingLogic" placeholder="加工逻辑" />
              </template>
              <template #level1Cell="{ record }">
                <a-input v-model="record.level1" placeholder="一级分类" />
              </template>
              <template #level2Cell="{ record }">
                <a-input v-model="record.level2" placeholder="二级分类" />
              </template>
              <template #statusCell="{ record }">
                <a-tag :color="record.registered ? 'green' : 'gray'">{{ record.registered ? '已注册' : '未注册' }}</a-tag>
              </template>
              <template #actionCell="{ record }">
                <a-button type="primary" size="small" :disabled="record.registered" @click="registerOutputFeature(record)">注册为特征</a-button>
              </template>
            </a-table>
          </a-card>
        </a-collapse-item>

        <a-collapse-item key="udf" header="4. UDF 注册">
          <a-card :bordered="false" class="panel-card">
            <a-typography-paragraph>
              <pre class="code-block">{{ udfDefinition?.code || '尚未生成UDF，请先选择平台服务' }}</pre>
            </a-typography-paragraph>
            <a-space>
              <a-button type="outline" @click="registerUDF" :disabled="!udfDefinition">注册UDF(模拟)</a-button>
              <a-tag v-if="udfRegisterMsg" color="green">{{ udfRegisterMsg }}</a-tag>
            </a-space>
          </a-card>
        </a-collapse-item>

        <a-collapse-item key="test" header="5. 执行测试">
          <a-card :bordered="false" class="panel-card">
            <a-form :model="testForm" layout="vertical">
              <a-form-item label="测试入参(JSON)">
                <a-textarea v-model="testForm.input" placeholder='{"age":30,"income":8000,"credit_history":700}' :auto-size="{minRows: 3, maxRows: 6}" />
              </a-form-item>
            </a-form>
            <a-space>
              <a-button type="outline" @click="runTest">执行测试(模拟)</a-button>
              <a-tag v-if="testMsg" color="green">{{ testMsg }}</a-tag>
            </a-space>
          </a-card>
        </a-collapse-item>
      </a-collapse>
    </div>

    <div class="actions-bar">
      <div class="actions-inner">
        <a-button @click="handleCancel">返回</a-button>
        <a-button :loading="saving" @click="handleSave">保存</a-button>
        <a-button type="primary" :loading="submitting" @click="handleSubmit">创建</a-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
// import { goBack } from '@/router/utils' // 暂时注释掉，使用替代方法
import { Message } from '@arco-design/web-vue'
import { modelAPI } from '@/modules/offline-model/api'
import { featureAPI } from '@/modules/offline-model/api'

const router = useRouter()
const formRef = ref()
const submitting = ref(false)
const saving = ref(false)
const form = ref({
  name: '',
  code: '',
  type: '',
  framework: '',
  version: '',
  variableVersion: 'new',
  description: '',
  parameters: '',
  inputParams: [],
  outputParams: [],
  modelFile: null
})

const rules = {
  name: [{ required: true, message: '请输入模型名称' }],
  code: [{ required: true, message: '请输入模型编码' }],
  type: [{ required: true, message: '请选择模型类型' }],
  framework: [{ required: true, message: '请选择算法框架' }],
  version: [{ required: true, message: '请输入版本号' }],
  variableVersion: [{ required: true, message: '请选择特征版本' }]
}

const featureOptions = ref([])
const platformServices = ref([])
const selectedService = ref('')
  const udfDefinition = ref(null)
  const platformForm = ref({})
  const ioValidateMsg = ref('')
  const udfRegisterMsg = ref('')
  const testForm = ref({ input: '' })
  const testMsg = ref('')
const inputColumns = [
  { title: '入参名', dataIndex: 'name', width: 160 },
  { title: '参数类型', dataIndex: 'paramKind', slotName: 'paramKind', width: 140 },
  { title: '类型', dataIndex: 'type', slotName: 'type', width: 140 },
  { title: '绑定离线特征', dataIndex: 'featureId', slotName: 'featureId', width: 240 },
  { title: '描述', dataIndex: 'description' },
]
  const outputColumns = [
    { title: '出参名', dataIndex: 'name', width: 160 },
    { title: '类型', dataIndex: 'type', slotName: 'type', width: 140 },
    { title: '描述', dataIndex: 'description' },
  ]

// 输出特征化
const DEFAULT_TARGET_TABLE = 'user_profile'
const featureizeRows = ref([])
const featureizeRegisteredSet = ref(new Set())
const featureizeCols = [
  { title: '出参名', dataIndex: 'name', width: 160 },
  { title: '特征编码', dataIndex: 'code', slotName: 'codeCell', width: 160 },
  { title: '类型', dataIndex: 'type', width: 120 },
  { title: '描述', dataIndex: 'description' },
  { title: '中文名', dataIndex: 'cnName', slotName: 'cnNameCell', width: 140 },
  { title: '数据类型', dataIndex: 'dataType', slotName: 'dataTypeCell', width: 140 },
  { title: '默认值', dataIndex: 'defaultValue', slotName: 'defaultValueCell', width: 120 },
  { title: '加工逻辑', dataIndex: 'processingLogic', slotName: 'processingLogicCell', width: 200 },
  { title: '一级分类', dataIndex: 'level1', slotName: 'level1Cell', width: 140 },
  { title: '二级分类', dataIndex: 'level2', slotName: 'level2Cell', width: 140 },
  { title: '状态', dataIndex: 'registered', slotName: 'statusCell', width: 100 },
  { title: '操作', dataIndex: 'action', slotName: 'actionCell', width: 140 }
]


onMounted(async () => {
  try {
    const res = await featureAPI.getFeatures({ page: 1, pageSize: 50 })
    featureOptions.value = Array.isArray(res.data) ? res.data : (res.data?.data || [])
  } catch (e) {}
  try {
    const listRes = await modelAPI.listPlatformModels()
    platformServices.value = listRes.data || []
  } catch {}
  await refreshFeatureizeRegistered()
})

const handleServiceChange = async (serviceName) => {
  if (!serviceName) return
  const res = await modelAPI.getPlatformModel(serviceName)
  if (!res.success) {
    Message.error(res.message || '同步失败')
    return
  }
  const p = res.data
  form.value.name = p.name
  form.value.code = p.code
  form.value.version = p.version
  form.value.framework = p.framework
  form.value.type = p.type || form.value.type
  form.value.description = p.description || ''
  form.value.inputParams = (p.inputs || []).map(i => ({ __key: Date.now() + Math.random(), name: i.name, paramKind: 'feature', type: i.type, featureId: null, description: i.description || '' }))
  form.value.outputParams = (p.outputs || []).map(o => ({ __key: Date.now() + Math.random(), name: o.name, type: o.type, description: o.description || '' }))
  udfDefinition.value = p.udfDefinition
  // 刷新输出特征化表格
  featureizeRows.value = (form.value.outputParams || []).map(o => ({
    name: o.name,
    code: o.name,
    type: o.type,
    description: o.description || '',
    cnName: o.name,
    dataType: o.type,
    defaultValue: '',
    processingLogic: '模型输出沉淀为特征',
    level1: 'model_outputs',
    level2: form.value.code || 'platform',
    registered: featureizeRegisteredSet.value.has(o.name)
  }))
}

const pullModelFile = async () => {
  if (!selectedService.value) return
  const res = await modelAPI.downloadPlatformModelFile(selectedService.value)
  if (res.success) {
    Message.success(`已拉取模型文件: ${res.data.fileName}`)
    form.value.modelFile = res.data
  } else {
    Message.error(res.message || '拉取失败')
  }
}

const refreshFeatureizeRegistered = async () => {
  featureizeRegisteredSet.value = new Set()
  try {
    const res = await featureAPI.getRegisteredFields(DEFAULT_TARGET_TABLE)
    const list = Array.isArray(res.data) ? res.data : (res.data?.data || [])
    list.forEach(f => featureizeRegisteredSet.value.add(f.name))
  } catch {}
  featureizeRows.value = (form.value.outputParams || []).map(o => ({ name: o.name, code: o.name, type: o.type, description: o.description || '', registered: featureizeRegisteredSet.value.has(o.name) }))
}

const autoFillOutputFeatures = () => {
  featureizeRows.value = featureizeRows.value.map(r => ({
    ...r,
    cnName: r.cnName || r.name,
    dataType: r.dataType || r.type,
    defaultValue: r.defaultValue || '',
    processingLogic: r.processingLogic || '模型输出沉淀为特征',
    level1: r.level1 || 'model_outputs',
    level2: r.level2 || (form.value.code || 'platform')
  }))
  Message.success('已自动填充')
}

const registerOutputFeature = async (record) => {
  const fields = [{
    name: record.name,
    code: record.code || record.name,
    level1: 'model_outputs',
    level2: form.value.code || 'platform',
    cnName: record.cnName || record.name,
    dataType: record.dataType || record.type,
    defaultValue: record.defaultValue || '',
    processingLogic: record.processingLogic || '模型输出沉淀为特征',
    batch: '',
    remark: '',
    level1: record.level1 || 'model_outputs',
    level2: record.level2 || (form.value.code || 'platform'),
    sourceType: 'model_output',
    sourceRefId: form.value.code || '',
    lineage: { type: 'model_output', service: form.value.code || '', output: record.name }
  }]
  const res = await featureAPI.batchRegisterFields(DEFAULT_TARGET_TABLE, fields)
  if (res.success) {
    Message.success('已注册为特征')
    await refreshFeatureizeRegistered()
  } else {
    Message.error(res.message || '注册失败')
  }
}

const registerAllOutputFeatures = async () => {
  const pending = featureizeRows.value.filter(r => !r.registered)
  if (!pending.length) { Message.info('暂无可注册项'); return }
  const fields = pending.map(record => ({
    name: record.name,
    code: record.code || record.name,
    level1: record.level1 || 'model_outputs',
    level2: record.level2 || (form.value.code || 'platform'),
    cnName: record.cnName || record.name,
    dataType: record.dataType || record.type,
    defaultValue: record.defaultValue || '',
    processingLogic: record.processingLogic || '模型输出沉淀为特征',
    batch: '',
    remark: '',
    sourceType: 'model_output',
    sourceRefId: form.value.code || '',
    lineage: { type: 'model_output', service: form.value.code || '', output: record.name }
  }))
  const res = await featureAPI.batchRegisterFields(DEFAULT_TARGET_TABLE, fields)
  if (res.success) { Message.success('批量注册成功'); await refreshFeatureizeRegistered() } else { Message.error(res.message || '批量注册失败') }
}

const handleSubmit = async () => {
  try {
    await formRef.value.validate()
    submitting.value = true
    const payload = { ...form.value }
    if (payload.parameters) {
      try { payload.parameters = JSON.parse(payload.parameters) } catch { }
    }
    if (udfDefinition.value) {
      payload.udfDefinition = udfDefinition.value
    }
    const res = await modelAPI.createModel(payload)
    if (res.success) {
      Message.success('模型创建成功')
      router.push('/model-offline-analysis/model-register')
    } else {
      Message.error(res.message || '模型创建失败')
    }
  } catch (e) {
    if (e?.message) Message.error(e.message)
  } finally {
    submitting.value = false
  }
}

const handleSave = async () => {
  try {
    await formRef.value.validate()
    saving.value = true
    const payload = { ...form.value }
    if (payload.parameters) {
      try { payload.parameters = JSON.parse(payload.parameters) } catch { }
    }
    if (udfDefinition.value) {
      payload.udfDefinition = udfDefinition.value
    }
    const res = await modelAPI.createModel(payload)
    if (res.success) {
      Message.success('已保存')
    } else {
      Message.error(res.message || '保存失败')
    }
  } catch (e) {
    if (e?.message) Message.error(e.message)
  } finally {
    saving.value = false
  }
}

const onFeatureBindChange = (record, value) => {
  if (value === '__SAMPLE__') {
    record.paramKind = 'sample'
    record.featureId = null
  } else {
    record.paramKind = 'feature'
    record.featureId = value
  }
}

// 绑定来源列回显：选「样本表提供」时口径落在 paramKind 上（featureId 置 null），否则列上看不出已绑定
const bindSourceOf = (record) => (record.paramKind === 'sample' ? '__SAMPLE__' : record.featureId)
// 是否已绑定来源：已选样本表提供，或已关联离线特征
const isInputBound = (record) => record.paramKind === 'sample' || !!record.featureId
// N = 绑定来源为空的入参数
const unboundInputCount = computed(() => (form.value.inputParams || []).filter(p => !isInputBound(p)).length)

/** 一键样本表匹配：只把未绑定来源的入参填成「样本表提供」，已绑定的不动，不弹预览直接生效 */
const bindUnboundToSample = () => {
  const list = form.value.inputParams || []
  let bound = 0
  list.forEach((p) => {
    if (isInputBound(p)) {
      return
    }
    p.paramKind = 'sample'
    p.featureId = null
    bound += 1
  })
  if (!bound) {
    return
  }
  // 绑定关系已变，旧的校验结论不再成立，清掉待重新校验
  ioValidateMsg.value = ''
  Message.success(`已为 ${bound} 个入参绑定「样本表提供」`)
}

const runIOValidate = () => {
  const okInputs = Array.isArray(form.value.inputParams) && form.value.inputParams.every(i => {
    const baseOk = i && i.name && i.type && i.paramKind
    const featureBindOk = i.paramKind === 'sample' ? true : !!i.featureId
    return baseOk && featureBindOk
  })
  const okOutputs = Array.isArray(form.value.outputParams) && form.value.outputParams.every(o => o.name && o.type)
  if (okInputs && okOutputs) {
    ioValidateMsg.value = '校验通过'
  } else {
    ioValidateMsg.value = '校验不通过，请完善入参/出参定义'
  }
}

const registerUDF = () => {
  if (!udfDefinition.value) { Message.warning('请先生成UDF'); return }
  udfRegisterMsg.value = 'UDF注册成功(模拟)'
}

const runTest = () => {
  try {
    const parsed = testForm.value.input ? JSON.parse(testForm.value.input) : {}
    if (!parsed || typeof parsed !== 'object') throw new Error('入参格式错误')
    testMsg.value = '执行成功(模拟)'
  } catch (e) {
    testMsg.value = '执行失败：入参JSON解析错误'
  }
}

const handleCancel = () => {
  router.push('/model-offline-analysis/model-register')
}
</script>

<style scoped>
.model-create-page { padding: 16px; background-color: #fff; }
.page-header { margin-bottom: 12px; }
.page-title { margin: 0; font-size: 18px; font-weight: 600; }
.page-content { max-width: 1200px; margin: 0 auto; }
.panel-card { margin-top: 12px; }
/* 入参 / 出参定义块：标题居左、快捷按钮居右上，表格整宽在下（不用 a-form-item，其内容区是横排 flex 会把按钮和表格挤在一起） */
.io-block { margin-bottom: 16px; }
.io-block-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}
.code-block { background: #f7f8fa; border: 1px solid var(--subapp-border); border-radius: 6px; padding: 10px; white-space: pre-wrap; }
.actions-bar { position: sticky; bottom: 0; background: rgba(255,255,255,0.95); border-top: 1px solid var(--subapp-border); padding: 10px 0; margin-top: 12px; }
.actions-inner { display: flex; gap: 8px; justify-content: flex-end; max-width: 1200px; margin: 0 auto; padding: 0 8px; }
</style>
