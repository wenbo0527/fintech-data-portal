<template>
  <a-drawer
    v-model:visible="visibleProxy"
    title="表单注册标签表"
    :width="800"
    :footer="false"
    @cancel="handleCancel"
  >
    <div class="form-register">
      <!-- 折叠面板 -->
      <a-collapse v-model:active-key="activeKeys" :bordered="false">
        <!-- 基础配置 -->
        <a-collapse-item key="basic" header="基础配置">
          <template #extra>
            <IconCheckCircle v-if="basicCompleted" style="color: #00b42a" />
          </template>
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
            
            <a-row :gutter="16">
              <a-col :span="12">
                <a-form-item label="标签表名称" field="name" required>
                  <a-input
                    v-model="formData.name"
                    placeholder="请输入标签表名称"
                    :max-length="50"
                    show-word-limit
                  />
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="标签表编码" field="code" required>
                  <a-input
                    v-model="formData.code"
                    placeholder="请输入标签表编码（英文）"
                    :max-length="30"
                    show-word-limit
                  />
                </a-form-item>
              </a-col>
            </a-row>
            
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
          </a-form>
        </a-collapse-item>

        <!-- 字段配置 -->
        <a-collapse-item key="fields" header="字段配置">
          <template #extra>
            <IconCheckCircle v-if="fieldsCompleted" style="color: #00b42a" />
          </template>
          <div class="field-config">
            <a-form :model="formData" layout="vertical">
              <a-form-item label="身份标识字段" field="primaryKey" required>
                <a-select
                  v-model="formData.primaryKey"
                  placeholder="请选择身份标识字段"
                  allow-search
                >
                  <a-option
                    v-for="field in availableFields"
                    :key="field.name"
                    :value="field.name"
                    :label="`${field.name}（${field.type}）`"
                  />
                </a-select>
              </a-form-item>
              
              <a-form-item label="主键格式" field="primaryKeyFormat">
                <a-input
                  v-model="formData.primaryKeyFormat"
                  placeholder="例如: {field1}_{field2}（可选）"
                />
                <div v-if="formData.primaryKeyFormat" class="format-preview">
                  预览: {{ generateKeyPreview() }}
                </div>
              </a-form-item>
              
              <a-form-item label="身份类型" field="identityType" required>
                <a-radio-group v-model="formData.identityType">
                  <a-radio value="mobile">手机号</a-radio>
                  <a-radio value="device_id">设备号</a-radio>
                  <a-radio value="id_card">身份证号</a-radio>
                  <a-radio value="card_no">卡号</a-radio>
                </a-radio-group>
              </a-form-item>
              
              <div v-if="formData.primaryKey" class="uniqueness-check">
                <a-button type="outline" @click="checkUniqueness">
                  <template #icon><IconSearch /></template>
                  检查唯一性
                </a-button>
                <div v-if="uniquenessScore >= 0" class="uniqueness-result">
                  唯一性评分：<a-progress :percent="uniquenessScore" />
                </div>
              </div>
            </a-form>
          </div>
        </a-collapse-item>

        <!-- IDMapping配置 -->
        <a-collapse-item key="mapping" header="IDMapping配置">
          <template #extra>
            <IconCheckCircle v-if="mappingCompleted" style="color: #00b42a" />
          </template>
          <div class="mapping-config">
            <a-form :model="formData" layout="vertical">
              <a-form-item label="启用IDMapping">
                <a-switch v-model="formData.enableMapping" />
              </a-form-item>
              
              <div v-if="formData.enableMapping">
                <a-descriptions :column="2" bordered>
                  <a-descriptions-item label="源字段">
                    {{ formData.primaryKey || '-' }}
                  </a-descriptions-item>
                  <a-descriptions-item label="目标字段">
                    {{ formData.primaryKey || '-' }}
                  </a-descriptions-item>
                  <a-descriptions-item label="匹配算法">
                    精确匹配
                  </a-descriptions-item>
                  <a-descriptions-item label="冲突解决">
                    <a-select v-model="formData.conflictResolution" size="small">
                      <a-option value="first">优先保留</a-option>
                      <a-option value="last">后入优先</a-option>
                      <a-option value="weight">权重优先</a-option>
                    </a-select>
                  </a-descriptions-item>
                </a-descriptions>
                
                <a-row :gutter="16" style="margin-top: 16px">
                  <a-col :span="12">
                    <a-form-item label="匹配超时时间（秒）">
                      <a-input-number
                        v-model="formData.matchTimeout"
                        :min="10"
                        :max="300"
                        :step="10"
                      />
                    </a-form-item>
                  </a-col>
                  <a-col :span="12">
                    <a-form-item label="最小匹配率（%）">
                      <a-input-number
                        v-model="formData.minMatchRate"
                        :min="0"
                        :max="100"
                        :step="5"
                      />
                    </a-form-item>
                  </a-col>
                </a-row>
                
                <a-form-item label="质量检查">
                  <a-space>
                    <a-switch v-model="formData.enableQualityCheck" />
                    <span v-if="formData.enableQualityCheck">
                      最大错误率：<a-input-number
                        v-model="formData.maxErrorRate"
                        :min="0"
                        :max="100"
                        :step="1"
                        size="small"
                      />%
                    </span>
                  </a-space>
                </a-form-item>
              </div>
            </a-form>
          </div>
        </a-collapse-item>
      </a-collapse>

      <!-- 配置预览 -->
      <div class="config-preview">
        <a-card title="配置预览" size="small">
          <a-descriptions :column="2" bordered>
            <a-descriptions-item label="标签表名称">{{ formData.name || '-' }}</a-descriptions-item>
            <a-descriptions-item label="标签表编码">{{ formData.code || '-' }}</a-descriptions-item>
            <a-descriptions-item label="数据源">{{ getDataSourceName() }}</a-descriptions-item>
            <a-descriptions-item label="数据表">{{ formData.tableName || '-' }}</a-descriptions-item>
            <a-descriptions-item label="身份标识字段">{{ formData.primaryKey || '-' }}</a-descriptions-item>
            <a-descriptions-item label="身份类型">{{ getIdentityTypeText() }}</a-descriptions-item>
            <a-descriptions-item label="IDMapping">
              <a-tag :color="formData.enableMapping ? 'green' : 'gray'">
                {{ formData.enableMapping ? '已启用' : '未启用' }}
              </a-tag>
            </a-descriptions-item>
            <a-descriptions-item label="分类标签">
              <a-space v-if="formData.categories.length">
                <a-tag v-for="category in formData.categories" :key="category">
                  {{ category }}
                </a-tag>
              </a-space>
              <span v-else>-</span>
            </a-descriptions-item>
          </a-descriptions>
        </a-card>
      </div>
    </div>

    <!-- 底部操作按钮 -->
    <template #footer>
      <a-space>
        <a-button @click="handleCancel">
          取消
        </a-button>
        <a-button 
          type="primary" 
          :loading="submitting"
          :disabled="!canSubmit"
          @click="handleSubmit"
        >
          提交注册
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
  IconSearch
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

// 折叠面板状态
const activeKeys = ref(['basic'])

// 表单数据
const formData = reactive({
  name: '',
  code: '',
  dataSourceId: '',
  tableName: '',
  primaryKey: '',
  primaryKeyFormat: '',
  identityType: 'mobile' as 'mobile' | 'device_id' | 'id_card' | 'card_no',
  categories: [] as string[],
  description: '',
  enableMapping: true,
  conflictResolution: 'first' as 'first' | 'last' | 'weight',
  matchTimeout: 30,
  minMatchRate: 95,
  enableQualityCheck: true,
  maxErrorRate: 5
})

// 数据源和表
const dataSources = ref<any[]>([])
const tableOptions = ref<string[]>([])
const availableFields = ref<any[]>([])

// 唯一性检查
const uniquenessScore = ref<number>(-1)
const submitting = ref(false)

// 计算属性
const basicCompleted = computed(() => {
  return formData.name && formData.code && formData.dataSourceId && formData.tableName
})

const fieldsCompleted = computed(() => {
  return formData.primaryKey && formData.identityType
})

const mappingCompleted = computed(() => {
  return true // IDMapping配置总是有默认值
})

const canSubmit = computed(() => {
  return basicCompleted.value && fieldsCompleted.value
})

// 监听visible变化
watch(() => props.visible, (newVal) => {
  if (newVal) {
    // 初始化数据
    loadDataSources()
    resetForm()
    activeKeys.value = ['basic']
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
  formData.primaryKey = ''
  tableOptions.value = []
  availableFields.value = []
  
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
  formData.primaryKey = ''
  
  if (!formData.dataSourceId || !formData.tableName) return
  
  try {
    const response = await datasourceAPI.getFields(formData.dataSourceId, formData.tableName)
    if (response.success) {
      availableFields.value = response.data
    }
  } catch (error) {
    Message.error('加载字段失败')
  }
}

const getDataSourceName = () => {
  const ds = dataSources.value.find(d => d.id === formData.dataSourceId)
  return ds ? `${ds.name}（${ds.type}）` : '-'
}

const getIdentityTypeText = () => {
  const map = {
    mobile: '手机号',
    device_id: '设备号',
    id_card: '身份证号',
    card_no: '卡号'
  }
  return map[formData.identityType]
}

const generateKeyPreview = () => {
  if (!formData.primaryKeyFormat || !formData.primaryKey) return ''
  
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
  
  return formData.primaryKeyFormat.replace(
    new RegExp(`{${formData.primaryKey}}`, 'g'),
    sampleValues[formData.primaryKey] || formData.primaryKey
  )
}

const checkUniqueness = async () => {
  if (!formData.primaryKey) {
    Message.warning('请先选择身份标识字段')
    return
  }
  
  // 模拟唯一性检查
  uniquenessScore.value = Math.floor(Math.random() * 30) + 70
  Message.info(`唯一性评分: ${uniquenessScore.value}%`)
}

const handleSubmit = async () => {
  submitting.value = true
  
  try {
    const payload = {
      ...formData,
      mappingRules: formData.enableMapping ? [{
        sourceField: formData.primaryKey,
        targetField: formData.primaryKey,
        algorithm: 'exact' as const,
        enabled: true
      }] : []
    }
    
    await tagCenterStore.createTagTable(payload)
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
  Object.assign(formData, {
    name: '',
    code: '',
    dataSourceId: '',
    tableName: '',
    primaryKey: '',
    primaryKeyFormat: '',
    identityType: 'mobile',
    categories: [],
    description: '',
    enableMapping: true,
    conflictResolution: 'first',
    matchTimeout: 30,
    minMatchRate: 95,
    enableQualityCheck: true,
    maxErrorRate: 5
  })
  uniquenessScore.value = -1
}
</script>

<style scoped lang="less">
.form-register {
  padding: 24px 0;
}

.field-config,
.mapping-config {
  padding: 16px 0;
}

.format-preview {
  margin-top: 8px;
  padding: 8px 12px;
  background: #f7f8fa;
  border-radius: 4px;
  font-family: monospace;
  font-size: 14px;
  color: #165dff;
}

.uniqueness-check {
  margin-top: 16px;
  
  .uniqueness-result {
    margin-top: 16px;
    max-width: 300px;
  }
}

.config-preview {
  margin-top: 32px;
}

// 折叠面板样式
:deep(.arco-collapse-item) {
  margin-bottom: 16px;
  border: 1px solid #e5e6eb;
  border-radius: 8px;
  
  .arco-collapse-item-header {
    padding: 16px 20px;
    background: #f7f8fa;
    border-radius: 8px;
    
    &:hover {
      background: #f0f1f3;
    }
  }
  
  .arco-collapse-item-content {
    padding: 20px;
    background: white;
    border-top: 1px solid #e5e6eb;
  }
}
</style>