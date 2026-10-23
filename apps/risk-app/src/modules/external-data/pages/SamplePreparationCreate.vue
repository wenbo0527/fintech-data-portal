<template>
  <div class="drawer-content">
    <!-- 1. 基础配置 -->
    <a-card title="基础配置" :bordered="false" class="section-card">
      <a-form :model="form" layout="vertical">
        <a-form-item label="样本表名称" required>
          <a-input v-model="form.sampleName" placeholder="请输入样本表名称" allow-clear />
        </a-form-item>

        <a-form-item label="目标服务类型" required>
          <a-select v-model="form.serviceType" placeholder="请选择服务类型" @change="handleServiceTypeChange">
            <a-option>在线批量调用</a-option>
            <a-option>外数离线回溯申请</a-option>
            <a-option>全量特征回溯申请</a-option>
            <a-option>风险合规离线回溯申请</a-option>
          </a-select>
        </a-form-item>

        <a-form-item label="选择外数产品" required>
          <a-select
            v-model="form.externalProduct"
            placeholder="请选择外数产品"
            @change="handleExternalProductChange"
            :loading="productsLoading"
            allow-search
          >
            <a-option v-for="product in availableProducts" :key="product.productCode" :value="product.productCode">
              {{ product.productName }} ({{ product.productCode }})
            </a-option>
          </a-select>
        </a-form-item>
      </a-form>
    </a-card>

    <!-- 2. 目标表配置 -->
    <a-card title="目标表配置" :bordered="false" class="section-card">
      <a-form :model="tableForm" layout="vertical">
        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item label="存储类型" required>
              <a-radio-group v-model="tableForm.storageType" type="button" @change="handleStorageTypeChange">
                <a-radio value="doris">Doris</a-radio>
                <a-radio value="hive">Hive</a-radio>
              </a-radio-group>
            </a-form-item>
          </a-col>
          <a-col :span="16">
            <a-form-item label="操作类型" required>
              <a-select v-model="tableForm.operationType" placeholder="请选择操作类型" :disabled="!tableForm.storageType">
                <a-option v-for="op in availableOperations" :key="op.code" :value="op.code">
                  {{ op.name }}
                </a-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="集群/连接" required>
              <a-select 
                v-model="tableForm.cluster" 
                placeholder="请选择集群" 
                @change="handleClusterChange"
                :loading="clustersLoading"
              >
                <a-option v-for="cluster in availableClusters" :key="cluster.id" :value="cluster.id">
                  {{ cluster.name }}
                </a-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="数据库" required>
              <a-select 
                v-model="tableForm.database" 
                placeholder="请选择数据库"
                :loading="databasesLoading"
                :disabled="!tableForm.cluster"
              >
                <a-option v-for="db in availableDatabases" :key="db.id" :value="db.name">
                  {{ db.name }} ({{ db.description }})
                </a-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="表名" required>
              <a-input v-model="tableForm.tableName" placeholder="请输入表名" />
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item label="应用场景说明">
          <a-textarea v-model="tableForm.description" placeholder="请输入表的业务描述" :auto-size="{ minRows: 2, maxRows: 4 }" />
        </a-form-item>
      </a-form>
    </a-card>

    <!-- 3. 建议表结构 (基于外数自动生成) -->
    <a-card title="建议表结构" :bordered="false" class="section-card">
      <template #extra>
        <a-space>
          <a-tag v-if="form.externalProduct" color="green">
            <template #icon><icon-check-circle /></template>
            已选择: {{ form.externalProduct }}
          </a-tag>
          <a-button type="text" size="small" @click="generateTableStructure">
            <template #icon><icon-refresh /></template>
            重新生成
          </a-button>
        </a-space>
      </template>

      <a-alert v-if="!form.externalProduct" type="warning" class="mb-4">
        请先在上方选择外数产品，系统将自动生成建议的表结构字段。
      </a-alert>

      <a-table v-else :data="tableForm.columns" :pagination="false" size="mini" :scroll="{ y: 200 }">
        <template #columns>
          <a-table-column title="字段名" data-index="name" :width="120" />
          <a-table-column title="类型" data-index="type" :width="100" />
          <a-table-column title="注释" data-index="comment" />
          <a-table-column title="必填" :width="60" align="center">
            <template #cell="{ record }">
              <a-tag v-if="record.required" color="red" size="mini">必填</a-tag>
              <a-tag v-else color="gray" size="mini">可选</a-tag>
            </template>
          </a-table-column>
        </template>
      </a-table>

      <a-divider v-if="form.externalProduct" style="margin: 12px 0" />

      <div v-if="form.externalProduct" style="font-size: 12px; color: var(--color-text-3);">
        <icon-info-circle /> 已根据 "{{ form.externalProduct }}" 的要素要求自动生成表结构，您可以在提交前核对字段。
      </div>
    </a-card>

    <!-- 4. 数据逻辑配置 -->
    <a-card title="数据逻辑配置" :bordered="false" class="section-card">
      <template #extra>
        <a-button type="text" size="small" @click="parseSelect">
          <template #icon><icon-code /></template>
          解析 SQL 提取字段
        </a-button>
      </template>
      <a-form :model="sqlForm" layout="vertical">
        <a-alert type="info" class="mb-4">
          请输入 SELECT 查询语句，补充外数需要返回的业务字段。
        </a-alert>
        <a-form-item label="SELECT 查询语句" required>
          <a-textarea 
            v-model="sqlForm.content" 
            placeholder="SELECT id, name, age, created_at FROM source_table WHERE dt = '${bizdate}' ..." 
            :auto-size="{ minRows: 6, maxRows: 12 }"
            style="font-family: monospace;"
            @blur="parseSelect"
          />
        </a-form-item>
      </a-form>
    </a-card>

    <!-- 5. 调度配置 -->
    <a-card title="调度配置" :bordered="false" class="section-card">
      <a-form :model="scheduleForm" layout="vertical">
        <a-form-item label="执行策略" required>
          <a-radio-group v-model="scheduleForm.type" type="button">
            <a-radio value="single">单次执行</a-radio>
            <a-radio value="periodic">周期执行</a-radio>
          </a-radio-group>
        </a-form-item>

        <div v-if="scheduleForm.type === 'periodic'">
          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item label="调度周期" required>
                <a-select v-model="scheduleForm.cycle">
                  <a-option value="daily">每天</a-option>
                  <a-option value="weekly">每周</a-option>
                  <a-option value="monthly">每月</a-option>
                </a-select>
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="执行时间" required>
                <a-time-picker v-model="scheduleForm.time" format="HH:mm" style="width: 100%" />
              </a-form-item>
            </a-col>
          </a-row>
        </div>
      </a-form>
    </a-card>

    <!-- 校验结果弹窗 -->
    <a-modal v-model:visible="validationVisible" title="校验结果" :footer="false" width="600px">
       <a-result v-if="validationResult.success" status="success" title="校验通过">
        <template #subtitle>
          样本表配置及 SQL 逻辑校验通过，任务已提交。
        </template>
        <template #extra>
          <a-space>
            <a-button type="primary" @click="goToCreateService">前往创建服务</a-button>
            <a-button @click="closeValidation">关闭</a-button>
          </a-space>
        </template>
      </a-result>

      <a-result v-else status="error" title="校验未通过">
          <template #subtitle>
          请检查以下问题并修正配置。
        </template>
      </a-result>
      
      <a-descriptions :column="1" bordered class="mt-4">
        <a-descriptions-item label="主键检查">
          <a-tag :color="validationResult.pkCheck ? 'green' : 'red'">
            {{ validationResult.pkCheck ? '通过' : '失败 (缺少必要主键)' }}
          </a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="必填字段检查">
            <a-tag :color="validationResult.fieldsCheck ? 'green' : 'red'">
            {{ validationResult.fieldsCheck ? '通过' : '失败 (缺少必要字段)' }}
          </a-tag>
        </a-descriptions-item>
          <a-descriptions-item label="字段类型检查">
            <a-tag :color="validationResult.typeCheck ? 'green' : 'red'">
            {{ validationResult.typeCheck ? '通过' : '失败 (字段类型不匹配)' }}
          </a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="数据结果校验">
          <a-tag :color="validationResult.dataCheck ? 'green' : 'gray'">
            {{ validationResult.dataCheck ? '通过' : (validationResult.hasDataRules ? '失败 (数据格式不符合规则)' : '未配置 (跳过)') }}
          </a-tag>
          <div v-if="validationResult.hasDataRules && !validationResult.dataCheck" style="margin-top: 8px; font-size: 12px; color: red;">
            Mock校验: 字段 [mobile] 数据格式不符合正则表达式 ^1[3-9]\d{9}$
          </div>
        </a-descriptions-item>
      </a-descriptions>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted, defineEmits, defineExpose } from 'vue'
import { useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { IconImport, IconPlus, IconDelete, IconCode, IconRefresh, IconCheckCircle, IconInfoCircle } from '@arco-design/web-vue/es/icon'
import { getActiveSupplierProducts, getExternalDataFields, externalDataFieldsMap } from '../mock/supplierProducts'
import type { SupplierProduct, ExternalDataField } from '../mock/supplierProducts'
import { 
  getStorageClustersByType, 
  getDatabasesByCluster, 
  getOperationTypesByStorage 
} from '../mock/storageClusters'
import type { StorageCluster, Database, OperationType } from '../mock/storageClusters'

const emit = defineEmits(['success'])

const router = useRouter()
const isSubmitting = ref(false)
const validationVisible = ref(false)
const productsLoading = ref(false)
const clustersLoading = ref(false)
const databasesLoading = ref(false)
const availableProducts = ref<SupplierProduct[]>([])
const availableClusters = ref<StorageCluster[]>([])
const availableDatabases = ref<Database[]>([])
const availableOperations = ref<OperationType[]>([])

const form = reactive({
  sampleName: '',
  serviceType: '',
  externalProduct: ''
})

const sqlForm = reactive({ content: '' })
const scheduleForm = reactive({
  type: 'single',
  cycle: 'daily',
  time: '00:00'
})

const tableForm = reactive({
  storageType: 'doris',
  operationType: '',
  cluster: '',
  database: '',
  tableName: '',
  description: '',
  columns: [] as ExternalDataField[]
})

const validationResult = reactive({
  success: false,
  pkCheck: false,
  fieldsCheck: false,
  typeCheck: false,
  dataCheck: false,
  hasDataRules: false
})

const loadClusters = async (type: string) => {
  clustersLoading.value = true
  try {
    availableClusters.value = await getStorageClustersByType(type as 'doris' | 'hive' | 'all')
  } finally {
    clustersLoading.value = false
  }
}

const loadDatabases = async (clusterId: string) => {
  databasesLoading.value = true
  try {
    availableDatabases.value = await getDatabasesByCluster(clusterId)
  } finally {
    databasesLoading.value = false
  }
}

const loadOperations = async (storageType: string) => {
  availableOperations.value = await getOperationTypesByStorage(storageType)
}

onMounted(async () => {
  productsLoading.value = true
  try {
    availableProducts.value = await getActiveSupplierProducts()
    await loadClusters('all')
    await loadOperations('doris')
  } finally {
    productsLoading.value = false
  }
})

const handleStorageTypeChange = async () => {
  tableForm.cluster = ''
  tableForm.database = ''
  tableForm.operationType = ''
  availableDatabases.value = []
  await loadClusters(tableForm.storageType)
  await loadOperations(tableForm.storageType)
}

const handleClusterChange = async () => {
  tableForm.database = ''
  availableDatabases.value = []
  if (tableForm.cluster) {
    await loadDatabases(tableForm.cluster)
  }
}

const handleServiceTypeChange = () => {
  if (form.externalProduct && form.serviceType) {
    generateTableStructure()
  }
}

const handleExternalProductChange = (value: string) => {
  if (value) {
    generateTableStructure()
  }
}

const generateTableStructure = async () => {
  if (!form.externalProduct) {
    Message.warning('请先选择外数产品')
    return
  }

  const fields = externalDataFieldsMap[form.externalProduct]
  if (fields && fields.length > 0) {
    tableForm.columns = [...fields]
    Message.success(`已生成 ${fields.length} 个建议字段`)
  } else {
    tableForm.columns = []
    Message.warning('该外数产品暂无字段要素定义')
  }
}

const parseSelect = () => {
  if (!sqlForm.content) return

  try {
    const sql = sqlForm.content.trim()
    const selectMatch = sql.match(/select\s+(.*?)\s+from/is)
    
    if (selectMatch && selectMatch[1]) {
      const fieldStr = selectMatch[1]
      const fields = fieldStr.split(',').map(f => f.trim())
      
      const parsedCols = fields.map(field => {
        let name = field
        const asMatch = field.match(/(?:\s+as\s+|\s+)(\w+)$/i)
        if (asMatch) {
          name = asMatch[1]
        } else {
          const dotParts = field.split('.')
          name = dotParts[dotParts.length - 1]
        }
        name = name.replace(/[`'"]/g, '')
        
        return {
          name: name,
          type: 'STRING',
          comment: '',
          required: false
        }
      }).filter(c => c.name && c.name !== '*')

      if (parsedCols.length > 0) {
        const existingMap = new Map(tableForm.columns.map(c => [c.name, c]))
        const newColumns = [...tableForm.columns]

        for (const parsed of parsedCols) {
          if (!existingMap.has(parsed.name)) {
            newColumns.push(parsed)
          }
        }

        tableForm.columns = newColumns
        Message.success(`解析成功，补充了 ${parsedCols.length} 个额外字段`)
      }
    }
  } catch (e) {
    console.warn('SQL解析部分字段失败')
  }
}

const handleSubmit = () => {
  if (!form.sampleName) {
    Message.warning('请输入样本表名称')
    return
  }
  if (!form.serviceType) {
    Message.warning('请选择目标服务类型')
    return
  }
  if (!form.externalProduct) {
    Message.warning('请选择外数产品')
    return
  }
  if (!tableForm.operationType) {
    Message.warning('请选择操作类型')
    return
  }
  if (!tableForm.cluster) {
    Message.warning('请选择集群')
    return
  }
  if (!tableForm.database) {
    Message.warning('请选择数据库')
    return
  }
  if (!tableForm.tableName) {
    Message.warning('请输入表名')
    return
  }
  if (!sqlForm.content) {
    Message.warning('请输入数据查询逻辑')
    return
  }

  isSubmitting.value = true
  
  setTimeout(() => {
    isSubmitting.value = false
    
    const hasKey = tableForm.columns.some(c => ['id_no', 'primary_key', 'request_id'].includes(c.name))
    const requiredFields = tableForm.columns.filter(c => c.required)
    const hasAllRequired = requiredFields.every(f => tableForm.columns.some(c => c.name === f.name))
    
    validationResult.pkCheck = true
    validationResult.fieldsCheck = hasAllRequired
    validationResult.typeCheck = true
    
    if (form.serviceType === '在线批量调用' && tableForm.columns.some(c => c.name === 'mobile')) {
      validationResult.hasDataRules = true
      validationResult.dataCheck = Math.random() > 0.2
    } else {
      validationResult.hasDataRules = false
      validationResult.dataCheck = true
    }

    validationResult.success = validationResult.pkCheck && validationResult.fieldsCheck && validationResult.typeCheck && validationResult.dataCheck
    
    validationVisible.value = true
  }, 1500)
}

const closeValidation = () => {
  validationVisible.value = false
}

const goToCreateService = () => {
  validationVisible.value = false
  emit('success')
  // 服务申请入口统一收敛到「服务场景入口」
  router.push({ name: 'RiskExternalDataServiceScene' })
}

defineExpose({
  handleSubmit,
  isSubmitting
})
</script>

<style scoped>
.drawer-content {
  padding-bottom: 20px;
}

.section-card {
  margin-bottom: 16px;
  background-color: var(--color-fill-1);
  border-radius: 4px;
}

.mb-4 {
  margin-bottom: 16px;
}

.mt-4 {
  margin-top: 16px;
}
</style>