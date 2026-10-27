<template>
  <div class="tag-create">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <div class="breadcrumb">
          <a-breadcrumb>
            <a-breadcrumb-item @click="goBack">标签管理</a-breadcrumb-item>
            <a-breadcrumb-item>自定义规则创建</a-breadcrumb-item>
          </a-breadcrumb>
        </div>
        <h2 class="page-title">自定义规则创建标签</h2>
        <p class="page-description">通过配置标签值和条件规则创建自定义标签</p>
      </div>
      <div class="header-actions">
        <a-space>
          <a-button @click="goBack">取消</a-button>
          <a-button type="primary" @click="saveTag">保存标签</a-button>
        </a-space>
      </div>
    </div>

    <!-- 主要内容区域 -->
    <div class="content-section">
      <a-row :gutter="24">
        <!-- 基本信息 -->
        <a-col :span="24">
          <a-card class="basic-info-card">
            <template #title>
              <div class="card-title">
                <IconSettings style="margin-right: 8px;" />
                基本信息
              </div>
            </template>
            
            <a-form :model="tagForm" layout="vertical">
              <a-row :gutter="16">
                <a-col :span="8">
                  <a-form-item label="标签ID" required>
                    <a-input v-model="tagForm.id" placeholder="请输入标签ID" />
                  </a-form-item>
                </a-col>
                <a-col :span="8">
                  <a-form-item label="标签名称" required>
                    <a-input v-model="tagForm.name" placeholder="请输入标签名称" />
                  </a-form-item>
                </a-col>
                <a-col :span="8">
                  <a-form-item label="数据类型" required>
                    <a-select v-model="tagForm.dataType" placeholder="请选择数据类型">
                      <a-option value="string">字符型</a-option>
                      <a-option value="number">数值型</a-option>
                    </a-select>
                  </a-form-item>
                </a-col>
              </a-row>
              <a-row :gutter="16">
                <a-col :span="8">
                  <a-form-item label="标签分类" required>
                    <a-select v-model="tagForm.category" placeholder="请选择标签分类">
                      <a-option value="basic">基础信息</a-option>
                      <a-option value="behavior">行为特征</a-option>
                      <a-option value="preference">偏好特征</a-option>
                      <a-option value="business">业务特征</a-option>
                    </a-select>
                  </a-form-item>
                </a-col>
                <a-col :span="8">
                  <a-form-item label="维度主键" required>
                    <a-input v-model="tagForm.dimensionKey" placeholder="请输入维度主键" />
                  </a-form-item>
                </a-col>
                <a-col :span="8">
                  <a-form-item label="共享级别">
                    <a-select v-model="tagForm.shareLevel" placeholder="请选择共享级别">
                      <a-option value="public">公开</a-option>
                      <a-option value="private">私有</a-option>
                    </a-select>
                  </a-form-item>
                </a-col>
              </a-row>
              <a-form-item label="标签描述">
                <a-textarea v-model="tagForm.description" placeholder="请输入标签描述" :rows="3" />
              </a-form-item>
            </a-form>
          </a-card>
        </a-col>

        <!-- 标签值配置 -->
        <a-col :span="24">
          <a-card class="tag-values-card">
            <template #title>
              <div class="card-title">
                <IconTags style="margin-right: 8px;" />
                标签值配置
              </div>
            </template>
            
            <div class="tag-values-config">
              <!-- 使用Tab方式呈现标签值 -->
              <a-tabs 
                v-model:active-key="activeTabKey" 
                type="editable-card" 
                @add="addTagValue" 
                @delete="deleteTagValue" 
                :editable="true"
                show-add-button
              >
                <a-tab-pane 
                  v-for="(tagValue, index) in tagValues" 
                  :key="getTabKey(index)" 
                  :title="tagValue.name || `标签值${index + 1}`"
                  :closable="tagValues.length > 1"
                >
                  <!-- 标签值基本信息配置 -->
                  <div class="tag-value-config">
                    <div class="config-section">
                      <h4 class="section-title">基本信息</h4>
                      <a-form :model="tagValue" layout="vertical">
                        <a-row :gutter="16">
                          <a-col :span="12">
                            <a-form-item label="标签值名称" required>
                              <a-input v-model="tagValue.name" placeholder="请输入标签值名称" @input="updateTabTitle(index)" />
                            </a-form-item>
                          </a-col>
                          <a-col :span="12">
                            <a-form-item label="标签值">
                              <a-input v-model="tagValue.value" placeholder="请输入标签值" />
                            </a-form-item>
                          </a-col>
                        </a-row>
                        <a-form-item label="描述">
                          <a-textarea v-model="tagValue.description" placeholder="请输入标签值描述" :rows="2" />
                        </a-form-item>
                      </a-form>
                    </div>
                    
                    <!-- 条件组配置 -->
                    <div class="config-section">
                      <div class="section-header">
                        <h4 class="section-title">条件配置</h4>
                        <div class="section-info">
                          <span class="condition-count">共 {{ tagValue.conditionGroups.length }} 个条件组</span>
                        </div>
                      </div>
                      
                      <ConditionConfig
                        :condition-groups="tagValue.conditionGroups"
                        :cross-group-logic="tagValue.crossGroupLogic || 'or'"
                        :editable="true"
                        :data-source-type-options="dataSourceTypeOptions"
                        :date-type-options="dateTypeOptions"
                        :dynamic-unit-options="dynamicUnitOptions"
                        :get-field-options="getFieldOptions"
                        :get-aggregation-options="getAggregationOptions"
                        :get-operator-options="getOperatorOptions"
                        :need-value-input="needValueInput"
                        :get-value-placeholder="getValuePlaceholder"
                        :on-data-source-type-change="onDataSourceTypeChange"
                        :on-date-type-change="onDateTypeChange"
                        @add-condition-group="() => addConditionGroup(index)"
                        @add-exclude-condition-group="() => addExcludeConditionGroup(index)"
        @delete-exclude-condition-group="(groupIndex) => deleteExcludeConditionGroup(index, groupIndex)"
                        @delete-condition-group="(groupIndex) => deleteConditionGroup(index, groupIndex)"
                        @toggle-group-logic="(group) => toggleGroupLogic(index, group)"
                        @toggle-cross-group-logic="() => toggleCrossGroupLogic(index)"
                        @add-condition-by-type="(group, type) => addConditionByType(index, group, type)"
                        @remove-condition="(group, conditionIndex) => removeCondition(index, group, conditionIndex)"
                      />
                    </div>
                  </div>
                </a-tab-pane>
              </a-tabs>
              
              <!-- 空状态提示 -->
              <div v-if="tagValues.length === 0" class="empty-state">
                <IconPlus style="font-size: 48px; color: #c9cdd4;" />
                <p>暂无标签值，请点击上方"+"按钮添加第一个标签值</p>
              </div>
            </div>
          </a-card>
        </a-col>
      </a-row>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { IconPlus, IconDelete, IconSettings, IconTags } from '@arco-design/web-vue/es/icon'
import ConditionConfig from '@/components/common/ConditionConfig.vue'

const router = useRouter()

// 标签基本信息表单
const tagForm = reactive({
  id: '',
  name: '',
  dataType: 'string',
  category: 'basic',
  dimensionKey: '',
  shareLevel: 'public',
  description: ''
})

// 标签值数据
const tagValues = ref([{
  name: '',
  value: '',
  description: '',
  conditionGroups: [],
  crossGroupLogic: 'or'
}] as Array<{
  name: string
  value: string
  description: string
  conditionGroups: Array<{
    id?: string
    logic?: string
    isExclude?: boolean
    conditions: Array<{
      id?: string
      type?: string
      dataSourceType?: string
      fieldName?: string
      aggregationType?: string
      operator?: string
      value?: string
      dateType?: string
      dynamicValue?: number
      dynamicUnit?: string
      dateRange?: [string, string]
      isExclude?: boolean
    }>
  }>
  crossGroupLogic: string
}>)

// Tab相关状态管理
const activeTabKey = ref('tab-0')

// 工具函数
const getTabKey = (index: number) => {
  return `tab-${index}`
}

const getIndexFromTabKey = (tabKey: string) => {
  const match = tabKey.match(/tab-(\d+)/)
  return match ? parseInt(match[1]) : -1
}

// 确保初始activeTabKey正确
if (tagValues.value.length > 0) {
  activeTabKey.value = getTabKey(0)
}

// 标签值配置相关函数
const addTagValue = () => {
  const newTagValue = {
    name: '',
    value: '',
    description: '',
    conditionGroups: [],
    crossGroupLogic: 'or'
  }
  tagValues.value.push(newTagValue)
  const newIndex = tagValues.value.length - 1
  activeTabKey.value = getTabKey(newIndex)
  console.log('添加标签值:', newTagValue, '新索引:', newIndex, '新activeTabKey:', activeTabKey.value)
}

const deleteTagValue = (targetKey: string) => {
  const index = getIndexFromTabKey(targetKey)
  if (index >= 0 && index < tagValues.value.length) {
    tagValues.value.splice(index, 1)
    
    // 更新activeTabKey
    if (tagValues.value.length > 0) {
      if (index === 0) {
        activeTabKey.value = getTabKey(0)
      } else {
        activeTabKey.value = getTabKey(index - 1)
      }
    } else {
      activeTabKey.value = ''
    }
  }
}

const updateTabTitle = (index: number) => {
  // Tab标题会自动更新，因为绑定了tagValue.name
}

const addConditionGroup = (tagValueIndex: number) => {
  if (tagValueIndex >= 0 && tagValueIndex < tagValues.value.length) {
    const tagValue = tagValues.value[tagValueIndex]
    tagValue.conditionGroups.push({
      id: Date.now().toString(),
      logic: 'and',
      conditions: [{
        id: Date.now().toString() + '_1',
        type: 'detail',
        dataSourceType: 'detail',
        fieldName: '',
        aggregationType: '',
        operator: '',
        value: '',
        dateType: 'dynamic',
        dynamicValue: 1,
        dynamicUnit: 'days',
        dateRange: undefined as [string, string] | undefined,
        isExclude: false
      }]
    })
  }
}

const addExcludeConditionGroup = (tagValueIndex: number) => {
  if (tagValueIndex >= 0 && tagValueIndex < tagValues.value.length) {
    const tagValue = tagValues.value[tagValueIndex]
    tagValue.conditionGroups.push({
      id: Date.now().toString(),
      logic: 'and',
      isExclude: true,
      conditions: [{
        id: Date.now().toString() + '_1',
        type: 'detail',
        dataSourceType: 'detail',
        fieldName: '',
        aggregationType: '',
        operator: '',
        value: '',
        dateType: 'dynamic',
        dynamicValue: 1,
        dynamicUnit: 'days',
        dateRange: undefined as [string, string] | undefined,
        isExclude: false
      }]
    })
  }
}

const deleteConditionGroup = (tagValueIndex: number, groupIndex: number) => {
  if (tagValueIndex >= 0 && tagValueIndex < tagValues.value.length) {
    const tagValue = tagValues.value[tagValueIndex]
    // 找到常规条件组中的索引
    const regularGroups = tagValue.conditionGroups.filter(group => !group.isExclude)
    if (groupIndex >= 0 && groupIndex < regularGroups.length) {
      const targetGroup = regularGroups[groupIndex]
      const actualIndex = tagValue.conditionGroups.indexOf(targetGroup)
      tagValue.conditionGroups.splice(actualIndex, 1)
    }
  }
}

const deleteExcludeConditionGroup = (tagValueIndex: number, groupIndex: number) => {
  if (tagValueIndex >= 0 && tagValueIndex < tagValues.value.length) {
    const tagValue = tagValues.value[tagValueIndex]
    // 找到排除条件组中的索引
    const excludeGroups = tagValue.conditionGroups.filter(group => group.isExclude)
    if (groupIndex >= 0 && groupIndex < excludeGroups.length) {
      const targetGroup = excludeGroups[groupIndex]
      const actualIndex = tagValue.conditionGroups.indexOf(targetGroup)
      tagValue.conditionGroups.splice(actualIndex, 1)
    }
  }
}

const toggleCrossGroupLogic = (tagValueIndex: number) => {
  if (tagValueIndex >= 0 && tagValueIndex < tagValues.value.length) {
    const tagValue = tagValues.value[tagValueIndex]
    tagValue.crossGroupLogic = tagValue.crossGroupLogic === 'and' ? 'or' : 'and'
  }
}

const toggleGroupLogic = (tagValueIndex: number, group: any) => {
  if (tagValueIndex >= 0 && tagValueIndex < tagValues.value.length) {
    group.logic = group.logic === 'and' ? 'or' : 'and'
  }
}

const addConditionByType = (tagValueIndex: number, group: any, type: string) => {
  if (tagValueIndex >= 0 && tagValueIndex < tagValues.value.length) {
    group.conditions.push({
      id: Date.now().toString() + '_' + group.conditions.length,
      type: type,
      dataSourceType: type,
      fieldName: '',
      aggregationType: '',
      operator: '',
      value: '',
      dateType: 'dynamic',
      dynamicValue: 1,
      dynamicUnit: 'days',
      dateRange: undefined as [string, string] | undefined,
      isExclude: false
    })
  }
}

const removeCondition = (tagValueIndex: number, group: any, conditionIndex: number) => {
  if (tagValueIndex >= 0 && tagValueIndex < tagValues.value.length) {
    if (group.conditions && conditionIndex >= 0 && conditionIndex < group.conditions.length) {
      group.conditions.splice(conditionIndex, 1)
    }
  }
}

// ConditionConfig组件所需的数据选项
const dataSourceTypeOptions = [
  { label: '明细数据', value: 'detail' },
  { label: '行为数据', value: 'behavior' },
  { label: '属性数据', value: 'attribute' }
]

const dateTypeOptions = [
  { label: '动态时间', value: 'dynamic' },
  { label: '固定时间', value: 'fixed' }
]

const dynamicUnitOptions = [
  { label: '天', value: 'days' },
  { label: '周', value: 'weeks' },
  { label: '月', value: 'months' }
]

// 获取字段选项
const getFieldOptions = (dataSourceType: string) => {
  const fieldMap: Record<string, Array<{label: string, value: string}>> = {
    detail: [
      { label: '用户ID', value: 'user_id' },
      { label: '订单金额', value: 'order_amount' },
      { label: '订单时间', value: 'order_time' },
      { label: '商品类别', value: 'product_category' }
    ],
    behavior: [
      { label: '页面访问', value: 'page_view' },
      { label: '点击事件', value: 'click_event' },
      { label: '停留时长', value: 'stay_duration' },
      { label: '访问频次', value: 'visit_frequency' }
    ],
    attribute: [
      { label: '年龄', value: 'age' },
      { label: '性别', value: 'gender' },
      { label: '城市', value: 'city' },
      { label: '收入', value: 'income' }
    ]
  }
  return fieldMap[dataSourceType] || []
}

// 获取聚合选项
const getAggregationOptions = (dataSourceType: string) => {
  if (dataSourceType === 'attribute') {
    return []
  }
  return [
    { label: '计数', value: 'count' },
    { label: '求和', value: 'sum' },
    { label: '平均值', value: 'avg' },
    { label: '最大值', value: 'max' },
    { label: '最小值', value: 'min' }
  ]
}

// 获取操作符选项
const getOperatorOptions = (condition: any) => {
  return [
    { label: '等于', value: 'eq' },
    { label: '不等于', value: 'ne' },
    { label: '大于', value: 'gt' },
    { label: '小于', value: 'lt' },
    { label: '大于等于', value: 'gte' },
    { label: '小于等于', value: 'lte' },
    { label: '包含', value: 'in' },
    { label: '不包含', value: 'not_in' },
    { label: '模糊匹配', value: 'like' }
  ]
}

// 判断是否需要值输入
const needValueInput = (condition: any) => {
  return true
}

// 获取值输入占位符
const getValuePlaceholder = (condition: any) => {
  return '请输入值'
}

// 数据源类型变化处理
const onDataSourceTypeChange = (condition: any) => {
  condition.fieldName = ''
  condition.aggregationType = ''
}

// 日期类型变化处理
const onDateTypeChange = (condition: any) => {
  if (condition.dateType === 'dynamic') {
    condition.dateRange = undefined
    condition.dynamicValue = 1
    condition.dynamicUnit = 'days'
  } else {
    condition.dynamicValue = undefined
    condition.dynamicUnit = undefined
    condition.dateRange = ['', ''] as [string, string]
  }
}



// 保存标签
const saveTag = () => {
  // 验证基本信息
  if (!tagForm.id || !tagForm.name || !tagForm.dataType || !tagForm.category || !tagForm.dimensionKey) {
    Message.error('请填写完整的基本信息')
    return
  }
  
  // 验证标签值
  if (tagValues.value.length === 0) {
    Message.error('请至少添加一个标签值')
    return
  }
  
  // 验证标签值配置
  for (let i = 0; i < tagValues.value.length; i++) {
    const tagValue = tagValues.value[i]
    if (!tagValue.name) {
      Message.error(`标签值 ${i + 1} 的名称不能为空`)
      return
    }
  }
  
  // 构建完整的标签数据
  const tagData = {
    ...tagForm,
    tagType: 'rule',
    createUser: '当前用户',
    createTime: new Date().toISOString(),
    tagValues: tagValues.value
  }
  
  console.log('保存标签数据:', tagData)
  Message.success('标签创建成功')
  
  // 返回标签管理页面
  goBack()
}

// 返回标签管理页面
const goBack = () => {
  router.push({ name: 'TagSystemTagManagement' })
}
</script>

<style scoped>
.tag-create {
  padding: 20px;
  background: #f5f5f5;
  min-height: 100vh;
}

/* 页面头部 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header-content {
  flex: 1;
}

.breadcrumb {
  margin-bottom: 12px;
}

.breadcrumb :deep(.arco-breadcrumb-item-link) {
  color: #165dff;
  cursor: pointer;
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

.header-actions {
  flex-shrink: 0;
}

/* 内容区域 */
.content-section {
  margin-bottom: 20px;
}

.basic-info-card,
.tag-values-card {
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.card-title {
  display: flex;
  align-items: center;
  font-size: 16px;
  font-weight: 600;
  color: #1d2129;
}

/* 标签值配置样式 - Tab布局 */
.tag-values-config {
  min-height: 500px;
}

.tag-value-config {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
}

.config-section {
  background: #ffffff;
  border: 1px solid #e5e6eb;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
}

.section-title {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #1d2129;
  padding-bottom: 12px;
  border-bottom: 1px solid #e5e6eb;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e5e6eb;
}

.section-header .section-title {
  margin: 0;
  padding: 0;
  border: none;
}

.section-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.condition-count {
  font-size: 12px;
  color: #86909c;
  background: #f2f3f5;
  padding: 4px 8px;
  border-radius: 4px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  color: #86909c;
  background: #f8f9fa;
  border: 2px dashed #c9cdd4;
  border-radius: 8px;
  margin: 20px 0;
}

.empty-state p {
  margin: 12px 0 0 0;
  font-size: 14px;
}

/* Tab样式优化 */
.tag-values-config :deep(.arco-tabs) {
  height: 100%;
}

.tag-values-config :deep(.arco-tabs-content) {
  height: calc(100% - 40px);
  overflow-y: auto;
}

.tag-values-config :deep(.arco-tabs-pane) {
  height: 100%;
  padding: 0;
}

.tag-values-config :deep(.arco-tabs-nav) {
  margin-bottom: 0;
  border-bottom: 1px solid #e5e6eb;
}

.tag-values-config :deep(.arco-tabs-tab) {
  padding: 12px 16px;
  font-weight: 500;
}

.tag-values-config :deep(.arco-tabs-tab-active) {
  background: #f0f5ff;
  border-color: #165dff;
}

.tag-values-config :deep(.arco-tabs-tab:hover) {
  background: #f8f9fa;
}



/* 响应式设计 */
@media (max-width: 768px) {
  .tag-create {
    padding: 12px;
  }
  
  .page-header {
    flex-direction: column;
    gap: 16px;
  }
  
  .header-actions {
    width: 100%;
  }
  
  .tag-values-config {
    flex-direction: column;
  }
  
  .tag-values-section,
  .tag-value-config {
    min-width: auto;
  }
  
  .tag-values-list {
    grid-template-columns: 1fr;
  }
}
</style>