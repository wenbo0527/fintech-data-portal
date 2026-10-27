<template>
  <div class="table-registration">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <h2 class="page-title">标签表注册</h2>
        <p class="page-description">选择数据源与表，并配置身份标识与IDMapping规则</p>
      </div>
      <div class="header-actions">
        <a-space>
          <a-button @click="goBack">
            <template #icon><IconArrowLeft /></template>
            返回
          </a-button>
        </a-space>
      </div>
    </div>

    <!-- 单页注册 -->
    <div class="registration-wizard">
      <div class="card-block">
        <a-card title="数据源与基础信息">
          <a-form :model="dsForm" layout="vertical">
            <a-row :gutter="16">
              <a-col :span="12">
                <a-form-item label="选择数据源" field="dataSourceId" required>
                  <a-select v-model="dsForm.dataSourceId" placeholder="请选择已注册的数据源" allow-search>
                    <a-option v-for="ds in dataSources" :key="ds.id" :value="ds.id">{{ ds.name }}（{{ ds.type }}）- {{ ds.database }}/{{ ds.table }}</a-option>
                  </a-select>
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="选择数据表" field="tableName" required>
                  <a-select v-model="dsForm.tableName" :disabled="!dsForm.dataSourceId" placeholder="请选择数据表">
                    <a-option v-for="t in tableOptions" :key="t" :value="t">{{ t }}</a-option>
                  </a-select>
                </a-form-item>
              </a-col>
            </a-row>
            <!-- 已移除表类型选择，统一按标签表注册 -->
          </a-form>
          <a-divider style="margin: 8px 0" />
          <a-form :model="basicForm" layout="vertical">
            <a-row :gutter="16">
              <a-col :span="12">
                <a-form-item label="表名称" field="tableAlias" required>
                  <a-input v-model="basicForm.tableAlias" placeholder="显示名称（可与实际表名不同）" />
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="表分类标签" field="categories">
                  <a-select v-model="basicForm.categories" multiple allow-search :options="categoryOptions" placeholder="选择或输入分类标签" />
                </a-form-item>
              </a-col>
              <a-col :span="24">
                <a-form-item label="表描述" field="description">
                  <a-textarea v-model="basicForm.description" :rows="3" placeholder="用于说明该标签表的用途、来源与维护人" />
                </a-form-item>
              </a-col>
            </a-row>
          </a-form>
        </a-card>
      </div>

      <div class="card-block">
        <a-card title="身份标识与主键">
          <a-form :model="identityUi" layout="vertical">
            <a-space style="margin-bottom: 12px;">
              <a-button type="primary" @click="addIdentityRow">
                <template #icon><IconPlus /></template>
                添加标识字段
              </a-button>
            </a-space>
            <div v-if="identityRows.length" class="identity-config">
              <div class="detail-condition-row" v-for="row in identityRows" :key="row.id">
                <div class="detail-config">
                  <div class="form-group">
                    <label class="form-label">标识字段名</label>
                    <a-select v-model="row.field" allow-search size="small" placeholder="选择表字段" class="form-control">
                      <a-option v-for="field in availableFields" :key="field.name" :value="field.name">
                        {{ field.name }}（{{ field.type }}）
                      </a-option>
                    </a-select>
                  </div>
                  <div class="form-group">
                    <label class="form-label">对应身份类型</label>
                    <a-select v-model="row.type" :options="identityTypeOptions" size="small" placeholder="选择身份类型" class="form-control" />
                  </div>
                  <div class="form-group">
                    <label class="form-label">对应关系</label>
                    <a-select v-model="row.relation" :options="relationOptions" size="small" placeholder="选择匹配关系" class="form-control" />
                  </div>
                </div>
                <div class="detail-actions">
                  <a-button type="text" class="action-btn delete-btn" status="danger" size="mini" @click="removeIdentityRowById(row.id)">
                    <template #icon><IconMinus /></template>
                  </a-button>
                </div>
              </div>
            </div>
            <div v-else style="padding: 12px 0;">
              <a-empty description="暂无标识字段，请点击上方按钮添加" />
            </div>
          </a-form>
        </a-card>
      </div>

      

      <div class="step-navigation" v-if="!registrationResult">
        <a-space>
          <a-button type="primary" :loading="submitting" :disabled="!canSubmit" @click="submitRegistration">提交注册</a-button>
        </a-space>
      </div>
      <div v-if="registrationResult" class="registration-result">
        <a-result
          :status="registrationResult.status"
          :title="registrationResult.title"
          :sub-title="registrationResult.subTitle"
        >
          <template #extra v-if="registrationResult.status === 'success'">
            <a-space>
              <a-button type="primary" @click="viewRegisteredTable">查看注册的表</a-button>
              <a-button @click="registerAnother">注册新表</a-button>
            </a-space>
          </template>
        </a-result>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import {
  IconPlus,
  IconDelete,
  IconArrowLeft,
  IconCheck,
  IconMinus
} from '@arco-design/web-vue/es/icon'
import { useTableRegistration } from '@/composables/useTableRegistration'
import { useDataSourceStore } from '@/stores/datasource'
import { usePrimaryKeyAnalysis } from '@/composables/usePrimaryKeyAnalysis'

const router = useRouter()

const currentStep = ref(0)

// 导入方式
const importMethod = ref<'database'>('database')
const dsStore = useDataSourceStore()
const dataSources = dsStore.list
const dsForm = reactive<{ dataSourceId: string; tableName: string }>({ dataSourceId: '', tableName: '' })
const tableOptions = computed(() => dsForm.dataSourceId ? dsStore.getTables(dsForm.dataSourceId) : [])
const basicForm = reactive<{ tableAlias: string; categories: string[]; description: string }>({ tableAlias: '', categories: [], description: '' })
const categoryOptions = computed(() => ['标签表', '流水表'])

// API配置
// API 接入已移除

// 自动加载字段：当数据源与数据表同时选定时

// 字段选择
const availableFields = ref<any[]>([])
const selectedIdentityField = ref<string>('')
const candidateKeys = computed(() => suggestCandidateKeys(availableFields.value))
const uniquenessScore = ref<number>(-1)
const primaryKeyFormat = ref('')
const identityType = ref<'mobile' | 'device_id' | 'id_card' | 'card_no'>('mobile')
const identityUi = reactive<Record<string, any>>({})
const identityRows = ref<Array<{ id: string; field: string; type: string; relation: string }>>([])
const identityTypeOptions = [
  { label: '手机号', value: 'mobile' },
  { label: '设备号', value: 'device_id' },
  { label: '身份证号', value: 'id_card' },
  { label: '卡号', value: 'card_no' },
  { label: '邮箱', value: 'email' },
  { label: 'OpenID', value: 'open_id' },
  { label: 'UnionID', value: 'union_id' }
]
const relationOptions = [
  { label: '精确匹配', value: 'exact' },
  { label: '规范化后精确匹配', value: 'normalized_exact' },
  { label: '模糊匹配', value: 'fuzzy' }
]

// IDMapping规则
const mappingRules = ref<any[]>([])
const conflictResolution = ref<'first' | 'last' | 'weight'>('first')
const matchTimeout = ref(30)
const enableQualityCheck = ref(true)
const minMatchRate = ref(95)
const maxErrorRate = ref(5)

// 注册结果
const registrationResult = ref<any>(null)
const submitting = ref(false)

const canSubmit = computed(() => {
  const keys = identityRows.value.map((r: { field: string }) => r.field).filter(Boolean)
  return !!dsForm.dataSourceId && !!dsForm.tableName && !!basicForm.tableAlias && keys.length > 0
})

const enableMapping = ref(true)
const enabledRulesCount = computed(() => enableMapping.value ? 1 : 0)

const estimatedRecords = computed(() => {
  // 模拟估算
  return Math.floor(Math.random() * 100000) + 1000
})

// 方法
const goBack = () => {
  router.push({ name: 'TagSystemTagManagement' })
}

const { tableSchema, checkPrimaryKey, registerTable, loadTableSchema } = useTableRegistration()
watch([() => dsForm.dataSourceId, () => dsForm.tableName], async ([dsId, tbl]: [string, string]) => {
  if (dsId && tbl) {
    const ds = dataSources.find((x: any) => x.id === dsId)
    try {
      await loadTableSchema(ds.id, tbl)
      availableFields.value = (tableSchema.value as any) || []
      Message.success('已加载字段')
    } catch {
      availableFields.value = []
      Message.error('字段加载失败，请检查数据源配置')
    }
  } else {
    availableFields.value = []
  }
})
watch(() => dsForm.tableName, (tbl: string) => {
  if (tbl && !basicForm.tableAlias) {
    basicForm.tableAlias = tbl
  }
})
watch(identityRows, async (rows: Array<{ field: string }>) => {
  const first = rows[0]?.field as string
  if (first) {
    const res = await checkPrimaryKey([first])
    if (res) {
      uniquenessScore.value = Number(res.score || 0)
    }
  } else {
    uniquenessScore.value = -1
  }
}, { deep: true })

// 文件上传相关逻辑已移除

// 移除初始模拟加载，改为根据数据源与表自动加载字段

const suggestCandidateKeys = (fields: Array<any>): string[] => {
  const names = fields.map(f => String(f.name).toLowerCase())
  const picks = [] as string[]
  const priority = ['id_card','mobile','device_id','card_no']
  priority.forEach(p => { const hit = fields.find(f => String(f.name).toLowerCase() === p); if (hit) picks.push(hit.name) })
  // 追加包含关键字的字段
  names.forEach((n,i) => {
    if ((/mobile|phone/.test(n) || /id_card|idcard/.test(n) || /device_id|imei|idfa/.test(n) || /card_no|bank_card|card/.test(n)) && !picks.includes(fields[i].name)) {
      picks.push(fields[i].name)
    }
  })
  return picks.slice(0,5)
}

const toggleKey = (k: string) => {
  if (!identityRows.value.length) identityRows.value.push({ id: `${Date.now()}`, field: '', type: 'mobile', relation: 'exact' })
  identityRows.value[0].field = k
}
const addIdentityRow = () => {
  identityRows.value.push({ id: `${Date.now()}_${identityRows.value.length}`, field: '', type: 'mobile', relation: 'exact' })
}
const removeIdentityRow = (index: number) => {
  identityRows.value.splice(index, 1)
}
const removeIdentityRowById = (id: string) => {
  const idx = identityRows.value.findIndex((r: { id: string }) => r.id === id)
  if (idx >= 0) identityRows.value.splice(idx, 1)
}

const loadMappingRules = () => {}

// 已不支持多选主键，移除字段删除逻辑

const generateKeyPreview = () => {
  const keys = identityRows.value.map((r: { field: string }) => r.field).filter(Boolean)
  if (!keys.length) return ''
  let format = primaryKeyFormat.value
  if (!format) {
    format = keys.join('_')
  }
  const sampleValues: Record<string, string> = {
    'user_id': 'user123',
    'mobile': '13800138000',
    'email': 'user@example.com',
    'id_card': '123456789012345678',
    'device_id': 'device123',
    'card_no': '6222************',
    'age': '25',
    'gender': 'male',
    'city': '北京'
  }
  let preview = format
  keys.forEach((k: string) => {
    preview = preview.replace(new RegExp(`{${k}}`, 'g'), sampleValues[k] || k)
  })
  return preview
}

const addMappingRule = () => {}
const removeMappingRule = (_index: number) => {}

const getFieldTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    string: 'green',
    number: 'blue',
    date: 'orange',
    boolean: 'purple'
  }
  return colors[type] || 'gray'
}

const getImportMethodText = () => '数据库连接'

const getDataSourceSummary = () => {
  const ds = dataSources.find((x: any) => x.id === dsForm.dataSourceId)
  return ds && dsForm.tableName ? `${ds.type}://${ds.host}/${ds.database}/${dsForm.tableName}` : ''
}

const getIdentityTypeText = () => {
  const texts = {
    mobile: '手机号',
    device_id: '设备号',
    id_card: '身份证号',
    card_no: '卡号',
    email: '邮箱',
    open_id: 'OpenID',
    union_id: 'UnionID'
  }
  return texts[identityType.value as keyof typeof texts]
}


const getConflictResolutionText = () => '优先保留'

const submitRegistration = async () => {
  submitting.value = true
  
  try {
    const keys = identityRows.value.map((r: { field: string }) => r.field).filter(Boolean)
    const payload = {
      importMethod: 'database',
      dataSource: getDataSourceSummary(),
      fields: availableFields.value,
      primaryKeys: keys,
      primaryKeyFormat: primaryKeyFormat.value,
      mappingRules: enableMapping.value ? identityRows.value.filter((r: { field: string }) => r.field).map((r: { field: string; relation: string; type: string }) => ({ sourceField: r.field, targetField: r.field, algorithm: r.relation, enabled: true, identityType: r.type })) : [],
      conflictResolution: 'first',
      matchTimeout: 30,
      quality: { enableQualityCheck: false, minMatchRate: 0, maxErrorRate: 100 },
      basic: { tableAlias: basicForm.tableAlias, categories: basicForm.categories, description: basicForm.description }
    }
    const res = await registerTable(payload)
    if (res.status === 'SUCCESS') {
      registrationResult.value = { status: 'success', title: '注册成功', subTitle: '标签表已成功注册，IDMapping规则已生效' }
      Message.success('标签表注册成功')
    } else {
      registrationResult.value = { status: 'error', title: '注册失败', subTitle: '注册过程中出现错误，请检查配置后重试' }
      Message.error('标签表注册失败')
    }
  } catch (error) {
    registrationResult.value = {
      status: 'error',
      title: '注册失败',
      subTitle: '网络错误或服务器异常'
    }
    Message.error('提交失败')
  } finally {
    submitting.value = false
  }
}

const viewRegisteredTable = () => {
  router.push({ name: 'TagSystemTagManagement' })
}

const registerAnother = () => {
  // 重置所有数据
  currentStep.value = 0
  // 文件上传状态重置已移除
  selectedIdentityField.value = ''
  mappingRules.value = []
  registrationResult.value = null
  
  // 重置表单
  Object.assign(dsForm, { dataSourceId: '', tableName: '' })
  Object.assign(basicForm, { tableAlias: '', categories: [], description: '' })
  
  // API 配置重置已移除
}

// 初始化无需预加载字段

// 下拉已支持搜索，移除额外的字段过滤逻辑
</script>

<style scoped lang="less">
.table-registration {
  padding: 24px;
  min-height: 100vh;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.header-content {
  flex: 1;
}

.page-title {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
  color: #1d2129;
}

.page-description {
  margin: 0;
  color: #86909c;
  font-size: 14px;
}

.registration-wizard {
  max-width: 1200px;
  margin: 0 auto;
}

.card-block { margin-bottom: 16px; }

.wizard-steps {
  margin-bottom: 32px;
}

.step-content { padding: 0; }

.step-panel {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.import-methods {
  margin-bottom: 24px;
  text-align: center;
}

.import-method-group {
  display: inline-flex;
}

.import-content {
  max-width: 800px;
  margin: 0 auto;
}

.file-upload-area {
  width: 100%;
}

.upload-area {
  width: 100%;
  padding: 40px;
  text-align: center;
  border: 2px dashed #e5e6eb;
  border-radius: 8px;
  background: #fafafa;
  transition: all 0.3s;
}

.upload-area:hover {
  border-color: #165dff;
  background: #f0f7ff;
}

.file-preview {
  margin-top: 24px;
}

.preview-content {
  max-height: 300px;
  overflow: auto;
}

.db-form,
.api-form {
  max-width: 600px;
  margin: 0 auto;
}

.connection-test {
  margin-top: 24px;
  text-align: center;
}

.connection-status {
  margin-left: 16px;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 14px;
}

.connection-status.success {
  background: #e8f7f0;
  color: #00b96b;
}

.connection-status.error {
  background: #ffece8;
  color: #f53f3f;
}

.primary-key-config { max-width: 1200px; margin: 0 auto; }

.config-header { display: none; }

.config-header h3 {
  margin: 0 0 8px 0;
  font-size: 20px;
  color: #1d2129;
}

.config-desc {
  margin: 0;
  color: #86909c;
  font-size: 14px;
}

.field-selection {
  margin-bottom: 24px;
}

.field-checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.field-item {
  padding: 12px;
  border: 1px solid #e5e6eb;
  border-radius: 6px;
  transition: all 0.2s;
}

.field-item:hover {
  border-color: #165dff;
  background: #f0f7ff;
}

.field-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.field-name {
  font-weight: 500;
  color: #1d2129;
}

.field-desc {
  color: #86909c;
  font-size: 12px;
}

.key-preview {
  margin-top: 24px;
}

.preview-content {
  padding: 16px;
}

.selected-fields,
.key-format,
.identity-type {
  margin-bottom: 20px;
}

.selected-fields h4,
.key-format h4,
.identity-type h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #1d2129;
}

.field-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.format-input {
  margin-bottom: 8px;
}

.format-preview {
  padding: 8px 12px;
  background: #f7f8fa;
  border-radius: 4px;
  font-family: monospace;
  font-size: 14px;
  color: #165dff;
}

.mapping-rules-config {
  max-width: 800px;
  margin: 0 auto;
}

.rules-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.rules-header h4 {
  margin: 0;
  font-size: 16px;
  color: #1d2129;
}

.rules-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.rule-item {
  transition: all 0.2s;
}

.rule-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.rule-title {
  font-weight: 500;
  color: #1d2129;
}

.rule-content {
  padding: 16px 0;
}

.similarity-config {
  margin-top: 16px;
  padding: 16px;
  background: #f7f8fa;
  border-radius: 4px;
}

.empty-rules {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  text-align: center;
  color: #86909c;
}

.empty-rules p {
  margin: 16px 0 0 0;
  font-size: 14px;
}

.advanced-config {
  margin-top: 24px;
}

.quality-config {
  margin-top: 16px;
  padding: 16px;
  background: #f7f8fa;
  border-radius: 4px;
}

.registration-summary {
  max-width: 800px;
  margin: 0 auto;
}

.summary-header { display: none; }

.summary-header h3 {
  margin: 0 0 8px 0;
  font-size: 20px;
  color: #1d2129;
}

.summary-desc {
  margin: 0;
  color: #86909c;
  font-size: 14px;
}

.config-summary {
  margin-bottom: 24px;
}

.step-navigation { margin-top: 16px; text-align: right; }

.registration-result {
  margin-top: 32px;
}

/* Identity config rows mimic ConditionConfig style */
.identity-config {
  padding: 8px 0;
}
.detail-condition-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  padding: 12px;
  border: 1px solid #e5e6eb;
  border-radius: 6px;
  background: #fff;
  margin-bottom: 8px;
}
.detail-config {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}
.form-group {
  display: flex;
  align-items: center;
  gap: 8px;
}
.form-label {
  font-size: 12px;
  color: #4e5969;
  min-width: 84px;
}
.form-control {
  min-width: 200px;
}
.detail-actions .action-btn {
  color: #f53f3f;
}

// 响应式设计
@media (max-width: 768px) {
  .table-registration {
    padding: 12px;
  }
  
  .page-header {
    flex-direction: column;
    gap: 16px;
  }
  
  .import-method-group {
    flex-direction: column;
    width: 100%;
  }
  
  .field-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .rules-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }
}
</style>
