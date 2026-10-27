<template>
  <a-drawer
    v-model:visible="visibleProxy"
    title="快速注册标签表"
    :width="800"
    :footer="false"
    @cancel="handleCancel"
  >
    <div class="quick-register">
      <!-- 步骤指示器 -->
      <a-steps :current="currentStep" type="dot" class="steps-indicator">
        <a-step description="选择数据表" />
        <a-step description="批量选择字段" />
        <a-step description="设置分类信息" />
        <a-step description="确认提交" />
      </a-steps>

      <!-- 步骤1: 选择数据表 -->
      <div v-if="currentStep === 0" class="step-content">
        <a-form :model="formData" layout="vertical">
          <a-form-item label="选择数据源" field="dataSourceId" required>
            <a-select
              v-model="formData.dataSourceId"
              placeholder="请选择数据源"
              allow-search
              @change="handleDataSourceChange"
            >
              <a-option
                v-for="ds in dataSources"
                :key="ds.id"
                :value="ds.id"
                :label="`${ds.name}（${ds.type}）- ${ds.database}`"
              />
            </a-select>
          </a-form-item>
          
          <a-form-item label="选择数据表" field="tableName" required>
            <a-select
              v-model="formData.tableName"
              placeholder="请选择数据表"
              :disabled="!formData.dataSourceId"
              allow-search
              @change="handleTableChange"
            >
              <a-option
                v-for="table in tableOptions"
                :key="table"
                :value="table"
                :label="table"
              />
            </a-select>
          </a-form-item>
        </a-form>
      </div>

      <!-- 步骤2: 批量选择字段 -->
      <div v-if="currentStep === 1" class="step-content">
        <div class="field-selection">
          <div class="field-stats">
            <a-space>
              <span>总字段数: {{ allFields.length }}</span>
              <span>已注册: {{ registeredFields.length }}</span>
              <span>未注册: {{ unregisteredFields.length }}</span>
            </a-space>
          </div>
          
          <a-divider>未注册字段</a-divider>
          <div class="field-list">
            <a-checkbox-group v-model="selectedFields" direction="vertical">
              <a-row :gutter="[16, 16]">
                <a-col v-for="field in unregisteredFields" :key="field.name" :span="12">
                  <a-checkbox :value="field.name" class="field-checkbox">
                    <div class="field-info">
                      <span class="field-name">{{ field.name }}</span>
                      <a-tag size="small" :color="getFieldTypeText(field.type)">
                      {{ getFieldTypeText(field.type) }}
                    </a-tag>
                      <span v-if="field.description" class="field-desc">
                        {{ field.description }}
                      </span>
                    </div>
                  </a-checkbox>
                </a-col>
              </a-row>
            </a-checkbox-group>
          </div>
          
          <a-divider>已注册字段</a-divider>
          <div class="field-list registered">
            <a-row :gutter="[16, 16]">
              <a-col v-for="field in registeredFields" :key="field.name" :span="12">
                <div class="field-item registered">
                  <div class="field-info">
                    <span class="field-name">{{ field.name }}</span>
                    <a-tag size="mini" :color="getFieldTypeColor(field.type)">
                      {{ field.type }}
                    </a-tag>
                    <IconCheckCircle style="color: #00b42a; margin-left: 8px" />
                  </div>
                </div>
              </a-col>
            </a-row>
          </div>
        </div>
      </div>

      <!-- 步骤3: 设置分类信息 -->
      <div v-if="currentStep === 2" class="step-content">
        <a-form :model="formData" layout="vertical">
          <a-form-item label="标签表名称" field="name" required>
            <a-input
              v-model="formData.name"
              placeholder="请输入标签表名称"
              :max-length="50"
              show-word-limit
            />
          </a-form-item>
          
          <a-form-item label="标签表编码" field="code" required>
            <a-input
              v-model="formData.code"
              placeholder="请输入标签表编码（英文）"
              :max-length="30"
              show-word-limit
            />
          </a-form-item>
          
          <a-form-item label="分类标签" field="categories">
            <a-select
              v-model="formData.categories"
              multiple
              allow-search
              allow-create
              placeholder="选择或输入分类标签"
            >
              <a-option value="行为">行为</a-option>
              <a-option value="画像">画像</a-option>
              <a-option value="交易">交易</a-option>
              <a-option value="风险">风险</a-option>
              <a-option value="会员">会员</a-option>
              <a-option value="营销">营销</a-option>
            </a-select>
          </a-form-item>
          
          <a-form-item label="描述" field="description">
            <a-textarea
              v-model="formData.description"
              placeholder="请输入标签表描述"
              :rows="3"
              :max-length="200"
              show-word-limit
            />
          </a-form-item>
          
          <a-form-item label="身份标识字段" field="primaryKey" required>
            <a-select
              v-model="formData.primaryKey"
              placeholder="请选择身份标识字段"
              allow-search
            >
              <a-option
                v-for="field in selectedFieldsList"
                :key="field"
                :value="field"
                :label="field"
              />
            </a-select>
          </a-form-item>
          
          <a-form-item label="身份类型" field="identityType" required>
            <a-radio-group v-model="formData.identityType">
              <a-radio value="mobile">手机号</a-radio>
              <a-radio value="device_id">设备号</a-radio>
              <a-radio value="id_card">身份证号</a-radio>
              <a-radio value="card_no">卡号</a-radio>
            </a-radio-group>
          </a-form-item>
        </a-form>
      </div>

      <!-- 步骤4: 确认提交 -->
      <div v-if="currentStep === 3" class="step-content">
        <div class="summary-section">
          <a-descriptions :column="2" bordered>
            <a-descriptions-item label="标签表名称">
              {{ formData.name }}
            </a-descriptions-item>
            <a-descriptions-item label="标签表编码">
              {{ formData.code }}
            </a-descriptions-item>
            <a-descriptions-item label="数据源">
              {{ getDataSourceName() }}
            </a-descriptions-item>
            <a-descriptions-item label="数据表">
              {{ formData.tableName }}
            </a-descriptions-item>
            <a-descriptions-item label="分类标签">
              <a-space wrap>
                <a-tag v-for="category in formData.categories" :key="category">
                  {{ category }}
                </a-tag>
              </a-space>
            </a-descriptions-item>
            <a-descriptions-item label="身份类型">
              {{ getIdentityTypeText() }}
            </a-descriptions-item>
            <a-descriptions-item label="身份标识字段">
              {{ formData.primaryKey }}
            </a-descriptions-item>
            <a-descriptions-item label="注册字段数">
              {{ selectedFields.length }} 个
            </a-descriptions-item>
          </a-descriptions>
          
          <a-divider />
          
          <div class="field-preview">
            <h4>即将注册的字段：</h4>
            <a-space wrap>
              <a-tag v-for="field in selectedFields" :key="field">
                {{ field }}
              </a-tag>
            </a-space>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部操作按钮 -->
    <template #footer>
      <a-space>
        <a-button v-if="currentStep > 0" @click="handlePrevious">
          上一步
        </a-button>
        <a-button 
          v-if="currentStep < 3" 
          type="primary" 
          :disabled="!canNext"
          @click="handleNext"
        >
          下一步
        </a-button>
        <a-button 
          v-if="currentStep === 3" 
          type="primary" 
          :loading="submitting"
          @click="handleSubmit"
        >
          提交注册
        </a-button>
        <a-button @click="handleCancel">
          取消
        </a-button>
      </a-space>
    </template>
  </a-drawer>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { Message } from '@arco-design/web-vue'
import { 
  IconCheckCircle,
  IconThunderbolt
} from '@arco-design/web-vue/es/icon'
import { useTagCenterStore } from '@/stores/tagCenter'
import { datasourceAPI } from '@/api/tag'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  success: []
}>()

// 抽屉显隐代理：props 只读不可直接 v-model，用可写 computed 桥接父组件的 update:visible
const visibleProxy = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const tagCenterStore = useTagCenterStore()

// 步骤控制
const currentStep = ref(0)
const submitting = ref(false)

// 表单数据
const formData = reactive({
  name: '',
  code: '',
  dataSourceId: '',
  tableName: '',
  primaryKey: '',
  identityType: 'mobile' as 'mobile' | 'device_id' | 'id_card' | 'card_no',
  categories: [] as string[],
  description: ''
})

// 数据源和表
const dataSources = ref<any[]>([])
const tableOptions = ref<string[]>([])

// 字段数据
const allFields = ref<any[]>([])
const registeredFields = ref<any[]>([])
const unregisteredFields = ref<any[]>([])
const selectedFields = ref<string[]>([])

// 计算属性
const selectedFieldsList = computed(() => selectedFields.value)

const canNext = computed(() => {
  switch (currentStep.value) {
    case 0:
      return formData.dataSourceId && formData.tableName
    case 1:
      return selectedFields.value.length > 0
    case 2:
      return formData.name && formData.code && formData.primaryKey && formData.identityType
    case 3:
      return true
    default:
      return false
  }
})

// 监听visible变化
watch(() => props.visible, (newVal: boolean) => {
  if (newVal) {
    // 初始化数据
    loadDataSources()
    resetForm()
  }
})

// 方法
const loadDataSources = async () => {
  try {
    const response = await datasourceAPI.getDataSources()
    if (response.success) {
      dataSources.value = response.data
    }
  } catch (error) {
    Message.error('加载数据源失败')
  }
}

const handleDataSourceChange = async () => {
  formData.tableName = ''
  tableOptions.value = []
  
  if (!formData.dataSourceId) return
  
  try {
    const response = await datasourceAPI.getTables(formData.dataSourceId)
    if (response.success) {
      tableOptions.value = response.data
    }
  } catch (error) {
    Message.error('加载数据表失败')
  }
}

const handleTableChange = async () => {
  if (!formData.dataSourceId || !formData.tableName) return
  
  try {
    // 加载所有字段
    const fieldsResponse = await datasourceAPI.getTableFields(formData.dataSourceId, formData.tableName)
    if (fieldsResponse.success) {
      allFields.value = fieldsResponse.data
      
      // 模拟已注册和未注册字段的区分
      // 实际项目中这里应该调用相应的API
      registeredFields.value = []
      unregisteredFields.value = fieldsResponse.data
    }
  } catch (error) {
    Message.error('加载字段失败')
  }
}

const getFieldTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    string: 'green',
    number: 'blue',
    date: 'orange',
    boolean: 'purple'
  }
  return colors[type] || 'gray'
}

const getDataSourceName = () => {
  const ds = dataSources.value.find((d: any) => d.id === formData.dataSourceId)
  return ds ? `${ds.name}（${ds.type}）` : '-'
}

const getIdentityTypeText = () => {
  const map: Record<string, string> = {
    mobile: '手机号',
    device_id: '设备号',
    id_card: '身份证号',
    card_no: '卡号'
  }
  return map[formData.identityType] || ''
}

const handlePrevious = () => {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

const handleNext = () => {
  if (currentStep.value < 3) {
    currentStep.value++
  }
}

const handleSubmit = async () => {
  submitting.value = true
  
  try {
    // 创建标签表
    await tagCenterStore.createTagTable({
      ...formData,
      mappingRules: [{
        sourceField: formData.primaryKey,
        targetField: formData.primaryKey,
        algorithm: 'exact',
        enabled: true
      }]
    })
    
    // 批量注册字段
    if (selectedFields.value.length > 0) {
      const tableId = tagCenterStore.tagTables[tagCenterStore.tagTables.length - 1]?.id
      if (tableId) {
        const fields = selectedFields.value.map((field: string) => ({
          name: field,
          code: field,
          type: 'string', // 实际项目中应该根据字段类型
          selected: true
        }))
        
        await tagCenterStore.createTagTable({
          ...formData,
          mappingRules: [{
            sourceField: formData.primaryKey,
            targetField: formData.primaryKey,
            algorithm: 'exact',
            enabled: true
          }]
        })
      }
    }
    
    emit('success')
    handleCancel()
  } catch (error) {
    Message.error('注册失败')
  } finally {
    submitting.value = false
  }
}

const handleCancel = () => {
  emit('update:visible', false)
  resetForm()
}

const resetForm = () => {
  currentStep.value = 0
  Object.assign(formData, {
    name: '',
    code: '',
    dataSourceId: '',
    tableName: '',
    primaryKey: '',
    identityType: 'mobile',
    categories: [],
    description: ''
  })
  selectedFields.value = []
  allFields.value = []
  registeredFields.value = []
  unregisteredFields.value = []
}
</script>

<style scoped lang="less">
.quick-register {
  padding: 24px 0;
}

.steps-indicator {
  margin-bottom: 32px;
}

.step-content {
  min-height: 400px;
}

.field-selection {
  .field-stats {
    margin-bottom: 16px;
    padding: 12px;
    background: #f7f8fa;
    border-radius: 6px;
  }
  
  .field-list {
    margin: 16px 0;
    
    &.registered {
      opacity: 0.7;
    }
  }
  
  .field-checkbox {
    width: 100%;
  }
  
  .field-info {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .field-name {
    font-weight: 500;
  }
  
  .field-desc {
    color: #86909c;
    font-size: 12px;
  }
  
  .field-item {
    padding: 8px 12px;
    background: #f7f8fa;
    border-radius: 6px;
    
    &.registered {
      background: #e8f7f0;
    }
  }
}

.summary-section {
  .field-preview {
    margin-top: 24px;
    
    h4 {
      margin-bottom: 12px;
      color: #1d2129;
    }
  }
}
</style>