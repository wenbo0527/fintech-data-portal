<template>
  <div class="basic-info-editor">
    <div class="editor-header">
      <h3 class="section-title">基本信息配置</h3>
      <p class="section-description">请填写业务流程的基本信息，这些信息将帮助团队更好地理解和使用该流程。</p>
    </div>

    <div class="form-container">
      <a-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        layout="vertical"
        @submit="handleSubmit"
      >
        <a-row :gutter="24">
          <a-col :span="12">
            <a-form-item label="流程名称" field="name" required>
              <a-input
                v-model="formData.name"
                placeholder="请输入流程名称"
                :max-length="50"
                show-word-limit
                @input="handleFormChange"
              />
            </a-form-item>
          </a-col>
          
          <a-col :span="12">
            <a-form-item label="业务类型" field="businessType" required>
              <a-select
                v-model="formData.businessType"
                placeholder="请选择业务类型"
                @change="handleFormChange"
              >
                <a-option
                  v-for="type in businessTypes"
                  :key="type.value"
                  :value="type.value"
                  :label="type.label"
                >
                  {{ type.label }}
                </a-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="24">
          <a-col :span="12">
            <a-form-item label="产品类型" field="productType" required>
              <a-select
                v-model="formData.productType"
                placeholder="请选择产品类型"
                @change="handleFormChange"
              >
                <a-option
                  v-for="type in productTypes"
                  :key="type.value"
                  :value="type.value"
                  :label="type.label"
                >
                  {{ type.label }}
                </a-option>
              </a-select>
            </a-form-item>
          </a-col>
          
          <a-col :span="12">
            <a-form-item label="优先级" field="priority">
              <a-select
                v-model="formData.priority"
                placeholder="请选择优先级"
                @change="handleFormChange"
              >
                <a-option value="high" label="高">
                  <div class="priority-option">
                    <span class="priority-dot high"></span>
                    高
                  </div>
                </a-option>
                <a-option value="medium" label="中">
                  <div class="priority-option">
                    <span class="priority-dot medium"></span>
                    中
                  </div>
                </a-option>
                <a-option value="low" label="低">
                  <div class="priority-option">
                    <span class="priority-dot low"></span>
                    低
                  </div>
                </a-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item label="流程描述" field="description">
          <a-textarea
            v-model="formData.description"
            placeholder="请详细描述该业务流程的目的、适用场景和关键特点"
            :rows="4"
            :max-length="500"
            show-word-limit
            @input="handleFormChange"
          />
        </a-form-item>

        <a-form-item label="标签">
          <div class="tags-container">
            <a-tag
              v-for="tag in formData.tags"
              :key="tag"
              closable
              @close="removeTag(tag)"
            >
              {{ tag }}
            </a-tag>
            <a-input
              v-if="showTagInput"
              ref="tagInputRef"
              v-model="newTag"
              size="small"
              style="width: 100px"
              @blur="handleTagInputBlur"
              @keyup.enter="handleTagInputConfirm"
            />
            <a-button
              v-else
              size="small"
              type="dashed"
              @click="showTagInputHandler"
            >
              <template #icon><IconPlus /></template>
              添加标签
            </a-button>
          </div>
        </a-form-item>
      </a-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, nextTick } from 'vue'
import type { FormInstance } from '@arco-design/web-vue'
import { IconPlus } from '@arco-design/web-vue/es/icon'

// 基本信息数据类型
interface BasicInfo {
  name: string
  description: string
  businessType: string
  productType: string
  priority: string
  tags: string[]
}

interface Props {
  data?: BasicInfo
}

interface Emits {
  (e: 'update:data', data: BasicInfo): void
  (e: 'validate', isValid: boolean): void
}

const props = defineProps<Props>()

// 提供默认值
const defaultData: BasicInfo = {
  name: '',
  description: '',
  businessType: '',
  productType: '',
  priority: 'medium',
  tags: []
}
const emit = defineEmits<Emits>()

// 表单引用
const formRef = ref<FormInstance>()
const tagInputRef = ref()

// 表单数据
const formData = reactive<BasicInfo>({ ...defaultData, ...props.data })

// 标签输入
const showTagInput = ref(false)
const newTag = ref('')

// 业务类型选项
const businessTypes = [
  { value: 'marketing', label: '营销业务' },
  { value: 'sales', label: '销售业务' },
  { value: 'customer_service', label: '客户服务' },
  { value: 'product', label: '产品业务' },
  { value: 'finance', label: '财务业务' },
  { value: 'hr', label: '人力资源' },
  { value: 'operations', label: '运营业务' },
  { value: 'technology', label: '技术业务' }
]

// 产品类型选项
const productTypes = [
  { value: 'web', label: 'Web应用' },
  { value: 'mobile', label: '移动应用' },
  { value: 'api', label: 'API服务' },
  { value: 'data', label: '数据产品' },
  { value: 'platform', label: '平台产品' },
  { value: 'tool', label: '工具产品' },
  { value: 'service', label: '服务产品' }
]

// 表单验证规则
const formRules = {
  name: [
    { required: true, message: '请输入流程名称' },
    { minLength: 2, message: '流程名称至少2个字符' },
    { maxLength: 50, message: '流程名称不能超过50个字符' }
  ],
  businessType: [
    { required: true, message: '请选择业务类型' }
  ],
  productType: [
    { required: true, message: '请选择产品类型' }
  ],
  description: [
    { maxLength: 500, message: '描述不能超过500个字符' }
  ]
}

// 初始化表单数据
const initFormData = () => {
  if (props.data && typeof props.data === 'object') {
    Object.assign(formData, {
      name: props.data.name || '',
      description: props.data.description || '',
      businessType: props.data.businessType || '',
      productType: props.data.productType || '',
      priority: props.data.priority || 'medium',
      tags: props.data.tags || []
    })
  } else {
    // 重置为默认值
    Object.assign(formData, {
      name: '',
      description: '',
      businessType: '',
      productType: '',
      priority: 'medium',
      tags: []
    })
  }
}

// 表单变化处理
const handleFormChange = async () => {
  try {
    // 更新父组件数据
    emit('update:data', { ...formData })
    
    // 验证表单
    try {
      const errors = await formRef.value?.validate()
      emit('validate', !errors)
    } catch (validateError) {

      emit('validate', false)
    }
  } catch (error) {

    try {
      emit('validate', false)
    } catch (emitError) {

    }
  }
}

// 表单提交
const handleSubmit = (data: any) => {
  try {
    if (data.errors) {
      emit('validate', false)
    } else {
      emit('validate', true)
    }
  } catch (error) {

    try {
      emit('validate', false)
    } catch (emitError) {

    }
  }
}

// 显示标签输入框
const showTagInputHandler = () => {
  try {
    showTagInput.value = true
    nextTick(() => {
      try {
        tagInputRef.value?.focus()
      } catch (focusError) {

      }
    })
  } catch (error) {

  }
}

// 标签输入确认
const handleTagInputConfirm = () => {
  try {
    if (newTag.value && !formData.tags.includes(newTag.value)) {
      formData.tags.push(newTag.value)
      handleFormChange()
    }
    newTag.value = ''
    showTagInput.value = false
  } catch (error) {

    // 重置输入状态
    newTag.value = ''
    showTagInput.value = false
  }
}

// 标签输入失焦
const handleTagInputBlur = () => {
  try {
    handleTagInputConfirm()
  } catch (error) {

  }
}

// 移除标签
const removeTag = (tag: string) => {
  try {
    const index = formData.tags.indexOf(tag)
    if (index > -1) {
      formData.tags.splice(index, 1)
      handleFormChange()
    }
  } catch (error) {

  }
}

// 监听props变化
watch(() => props.data, (newData) => {
  try {
    // 添加更严格的数据检查
    if (newData !== undefined) {
      initFormData()
    }
  } catch (error) {

    // 发生错误时重置为默认值
    try {
      Object.assign(formData, {
        name: '',
        description: '',
        businessType: '',
        productType: '',
        priority: 'medium',
        tags: []
      })
      // 通知父组件验证失败
      emit('validate', false)
    } catch (resetError) {

    }
  }
}, { immediate: true, deep: true })

// 初始验证
watch(() => formData, () => {
  try {
    if (formData.name && formData.businessType && formData.productType) {
      handleFormChange()
    } else {
      // 如果必填字段不完整，通知父组件验证失败
      emit('validate', false)
    }
  } catch (error) {

    // 发生错误时通知父组件验证失败
    try {
      emit('validate', false)
    } catch (emitError) {

    }
  }
}, { immediate: true, deep: true })
</script>

<style scoped>
.basic-info-editor {
  max-width: 800px;
}

.editor-header {
  margin-bottom: 32px;
}

.section-title {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-1);
}

.section-description {
  margin: 0;
  font-size: 14px;
  color: var(--color-text-3);
  line-height: 1.5;
}

.form-container {
  background: var(--color-bg-1);
  border-radius: 8px;
  padding: 24px;
  border: 1px solid var(--color-border-2);
}

.priority-option {
  display: flex;
  align-items: center;
  gap: 8px;
}

.priority-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.priority-dot.high {
  background: var(--color-danger-6);
}

.priority-dot.medium {
  background: var(--color-warning-6);
}

.priority-dot.low {
  background: var(--color-success-6);
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

:deep(.arco-form-item-label) {
  font-weight: 500;
  color: var(--color-text-1);
}

:deep(.arco-input),
:deep(.arco-select),
:deep(.arco-textarea) {
  border-radius: 6px;
}

:deep(.arco-form-item) {
  margin-bottom: 20px;
}
</style>