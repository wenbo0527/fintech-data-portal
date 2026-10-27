<template>
  <div class="tag-management">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <h2 class="page-title">标签管理</h2>
        <p class="page-description">管理用户标签，创建、编辑、删除标签</p>
      </div>
      <div class="header-actions">
        <a-space>
          <a-input 
            v-model="searchForm.tagName" 
            placeholder="请输入标签名称搜索"
            allow-clear
            style="width: 250px"
            @input="handleSearch"
          >
            <template #prefix><IconSearch /></template>
          </a-input>
          <a-dropdown>
            <a-button type="primary">
              <template #icon><IconPlus /></template>
              新增标签
              <template #suffix><IconDown /></template>
            </a-button>
            <template #content>
              <a-doption @click="addTagByRule">
                <template #icon><IconSettings /></template>
                自定义规则创建
              </a-doption>
              <a-doption @click="addTagByImport">
                <template #icon><IconImport /></template>
                数据导入
              </a-doption>
            </template>
          </a-dropdown>
          <a-button type="outline" @click="goToTableRegistration">
            <template #icon><IconUpload /></template>
            标签表注册
          </a-button>
        </a-space>
      </div>
    </div>

    <!-- 标签列表 -->
    <div class="content-section">
      <a-card class="table-card">
        <template #title>
          <div class="table-header">
            <span class="table-title">标签列表</span>
            <span class="table-count">共 {{ pagination.total }} 条</span>
          </div>
        </template>
        
        <a-table 
          :data="tableData" 
          :loading="loading"
          :pagination="pagination"
          @page-change="handlePageChange"
          @page-size-change="handlePageSizeChange"
          class="tag-table"
          size="small"
          :scroll="{ x: 1600 }"
        >
          <template #columns>
            <a-table-column title="标签名称" data-index="name" :width="150" fixed="left">
              <template #cell="{ record }">
                <a-link @click="goToTagDetail(record)">{{ record.name }}</a-link>
              </template>
            </a-table-column>
            <a-table-column title="标签ID" data-index="id" :width="120">
              <template #cell="{ record }">
                <span>{{ record.id }}</span>
              </template>
            </a-table-column>
            <a-table-column title="数据类型" data-index="dataType" :width="120">
              <template #cell="{ record }">
                <a-tag :color="getDataTypeColor(record.dataType)">
                  {{ getDataTypeText(record.dataType) }}
                </a-tag>
              </template>
            </a-table-column>
            <a-table-column title="标签分类" data-index="category" :width="120">
              <template #cell="{ record }">
                <a-tag :color="getCategoryColor(record.category)">
                  {{ getCategoryText(record.category) }}
                </a-tag>
              </template>
            </a-table-column>
            <a-table-column title="标签类型" data-index="tagType" :width="120">
              <template #cell="{ record }">
                <a-tag :color="getTagTypeColor(record.tagType)">
                  {{ getTagTypeText(record.tagType) }}
                </a-tag>
              </template>
            </a-table-column>
            <a-table-column title="维度主键" data-index="dimensionKey" :width="150">
              <template #cell="{ record }">
                <span>{{ record.dimensionKey }}</span>
              </template>
            </a-table-column>
            <a-table-column title="IDMapping状态" data-index="mappingStatus" :width="120">
              <template #cell="{ record }">
                <a-tag :color="getMappingStatusColor(record.mappingStatus)">
                  {{ getMappingStatusText(record.mappingStatus) }}
                </a-tag>
              </template>
            </a-table-column>
            <a-table-column title="共享级别" data-index="shareLevel" :width="120">
              <template #cell="{ record }">
                <a-tag :color="getShareLevelColor(record.shareLevel)">
                  {{ getShareLevelText(record.shareLevel) }}
                </a-tag>
              </template>
            </a-table-column>
            <a-table-column title="创建人" data-index="createUser" :width="120">
              <template #cell="{ record }">
                <span>{{ record.createUser }}</span>
              </template>
            </a-table-column>
            <a-table-column title="操作" :width="200" fixed="right">
              <template #cell="{ record, rowIndex }">
                <a-space>
                  <a-button 
                    type="text" 
                    size="small" 
                    @click="goToTagDetail(record)"
                  >
                    编辑
                  </a-button>
                  <a-button 
                    type="text" 
                    size="small" 
                    @click="updateTag(record)"
                  >
                    更新
                  </a-button>
                  <a-button 
                    type="text" 
                    size="small" 
                    status="danger" 
                    @click="removeTag(rowIndex)"
                  >
                    删除
                  </a-button>
                </a-space>
              </template>
            </a-table-column>
          </template>
        </a-table>
      </a-card>
    </div>

    <!-- 标签编辑模态框 -->
    <a-modal 
      v-model:visible="editModalVisible" 
      :title="getModalTitle()"
      width="1000px"
      @ok="saveTag"
      @cancel="cancelEdit"
      :ok-text="editIndex === -1 ? '创建' : '保存'"
    >
      <!-- 简单编辑模式 -->
      <div v-if="createMode === 'edit'">
        <a-form :model="editForm" layout="vertical">
          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item label="标签ID" required>
                <a-input v-model="editForm.id" placeholder="请输入标签ID" />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="标签名称" required>
                <a-input v-model="editForm.name" placeholder="请输入标签名称" />
              </a-form-item>
            </a-col>
          </a-row>
          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item label="数据类型" required>
                <a-select v-model="editForm.dataType" placeholder="请选择数据类型">
                  <a-option value="string">字符型</a-option>
                  <a-option value="number">数值型</a-option>
                </a-select>
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="标签分类" required>
                <a-select v-model="editForm.category" placeholder="请选择标签分类">
                  <a-option value="basic">基础信息</a-option>
                  <a-option value="behavior">行为特征</a-option>
                  <a-option value="preference">偏好特征</a-option>
                  <a-option value="business">业务特征</a-option>
                </a-select>
              </a-form-item>
            </a-col>
          </a-row>
          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item label="标签类型" required>
                <a-select v-model="editForm.tagType" placeholder="请选择标签类型">
                  <a-option value="static">静态标签</a-option>
                  <a-option value="dynamic">动态标签</a-option>
                  <a-option value="computed">计算标签</a-option>
                  <a-option value="rule">规则标签</a-option>
                </a-select>
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="维度主键" required>
                <a-input v-model="editForm.dimensionKey" placeholder="请输入维度主键" />
              </a-form-item>
            </a-col>
          </a-row>
          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item label="共享级别" required>
                <a-select v-model="editForm.shareLevel" placeholder="请选择共享级别">
                  <a-option value="public">公开</a-option>
                  <a-option value="private">私有</a-option>
                </a-select>
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="创建人">
                <a-input v-model="editForm.createUser" placeholder="请输入创建人" />
              </a-form-item>
            </a-col>
          </a-row>
          <a-form-item label="描述">
            <a-textarea v-model="editForm.description" placeholder="请输入标签描述" :rows="3" />
          </a-form-item>
        </a-form>
      </div>

      <!-- 自定义规则创建模式 -->
      <div v-else-if="createMode === 'rule'">
        <a-tabs v-model:active-key="activeTab" type="line">
          <!-- 基本属性 -->
          <a-tab-pane key="basic" title="基本属性">
            <a-form :model="ruleForm.basic" layout="vertical">
              <a-row :gutter="16">
                <a-col :span="12">
                  <a-form-item label="标签ID" required>
                    <a-input v-model="ruleForm.basic.id" placeholder="请输入标签ID" />
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="标签名称" required>
                    <a-input v-model="ruleForm.basic.name" placeholder="请输入标签名称" />
                  </a-form-item>
                </a-col>
              </a-row>
              <a-row :gutter="16">
                <a-col :span="12">
                  <a-form-item label="数据类型" required>
                    <a-select v-model="ruleForm.basic.dataType" placeholder="请选择数据类型">
                      <a-option value="string">字符型</a-option>
                      <a-option value="number">数值型</a-option>
                    </a-select>
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="标签分类" required>
                    <a-select v-model="ruleForm.basic.category" placeholder="请选择标签分类">
                      <a-option value="basic">基础信息</a-option>
                      <a-option value="behavior">行为特征</a-option>
                      <a-option value="preference">偏好特征</a-option>
                      <a-option value="business">业务特征</a-option>
                    </a-select>
                  </a-form-item>
                </a-col>
              </a-row>
              <a-row :gutter="16">
                <a-col :span="12">
                  <a-form-item label="维度主键" required>
                    <a-input v-model="ruleForm.basic.dimensionKey" placeholder="请输入维度主键" />
                  </a-form-item>
                </a-col>
              </a-row>
              <a-form-item label="标签描述">
                <a-textarea v-model="ruleForm.basic.description" placeholder="请输入标签描述" :rows="3" />
              </a-form-item>
            </a-form>
          </a-tab-pane>

          <!-- 通知管理 -->
          <a-tab-pane key="notification" title="通知管理">
            <a-form :model="ruleForm.notification" layout="vertical">
              <a-form-item label="启用通知">
                <a-switch v-model="ruleForm.notification.enabled" />
                <span style="margin-left: 8px; color: var(--subapp-text-tertiary);">开启后将在标签状态变化时发送通知</span>
              </a-form-item>
              
              <div v-if="ruleForm.notification.enabled">
                <a-form-item label="通知方式">
                  <a-checkbox-group v-model="ruleForm.notification.methods">
                    <a-checkbox value="email">邮件通知</a-checkbox>
                    <a-checkbox value="sms">短信通知</a-checkbox>
                    <a-checkbox value="webhook">Webhook</a-checkbox>
                    <a-checkbox value="internal">站内消息</a-checkbox>
                  </a-checkbox-group>
                </a-form-item>
                
                <a-form-item label="通知场景">
                  <a-checkbox-group v-model="ruleForm.notification.scenarios">
                    <a-checkbox value="created">标签创建</a-checkbox>
                    <a-checkbox value="updated">标签更新</a-checkbox>
                    <a-checkbox value="deleted">标签删除</a-checkbox>
                    <a-checkbox value="error">执行异常</a-checkbox>
                  </a-checkbox-group>
                </a-form-item>
                
                <a-form-item label="通知接收人">
                  <a-select v-model="ruleForm.notification.recipients" multiple placeholder="请选择通知接收人">
                    <a-option value="admin">管理员</a-option>
                    <a-option value="creator">创建人</a-option>
                    <a-option value="department">部门负责人</a-option>
                    <a-option value="custom">自定义用户</a-option>
                  </a-select>
                </a-form-item>
                
                <a-form-item label="Webhook地址" v-if="ruleForm.notification.methods.includes('webhook')">
                  <a-input v-model="ruleForm.notification.webhookUrl" placeholder="请输入Webhook地址" />
                </a-form-item>
              </div>
            </a-form>
          </a-tab-pane>

          <!-- 标签值配置 -->
          <a-tab-pane key="values" title="标签值配置">
            <div class="tag-values-config-vertical">
              <!-- 标签值管理区域 -->
              <div class="tag-values-management">
                <div class="section-header">
                  <h3>标签值管理</h3>
                  <a-button type="primary" @click="addTagValue">
                    <template #icon><IconPlus /></template>
                    添加标签值
                  </a-button>
                </div>
                
                <div class="tag-values-list">
                  <div v-for="(tagValue, index) in ruleForm.tagValues" :key="index" class="tag-value-item" :class="{ active: selectedTagValueIndex === index }">
                    <div class="tag-value-header" @click="selectTagValue(index)">
                      <div class="tag-value-info">
                        <span class="tag-value-name">{{ tagValue.name || '未命名标签值' }}</span>
                        <span class="tag-value-desc">{{ tagValue.description || '暂无描述' }}</span>
                      </div>
                      <div class="tag-value-actions" @click.stop>
                        <a-button type="text" size="small" status="danger" @click="removeTagValue(index)">
                          <template #icon><IconDelete /></template>
                        </a-button>
                      </div>
                    </div>
                  </div>
                  
                  <div v-if="ruleForm.tagValues.length === 0" class="empty-state">
                    <IconPlus style="font-size: 48px; color: #c9cdd4;" />
                    <p>暂无标签值，请添加第一个标签值</p>
                  </div>
                </div>
              </div>
              
              <!-- 标签值配置区域 -->
              <div v-if="selectedTagValueIndex >= 0" class="tag-value-config-section">
                <div class="config-header">
                  <h4>标签值配置</h4>
                </div>
                
                <a-form :model="getCurrentTagValue()" layout="vertical">
                  <a-row :gutter="16">
                    <a-col :span="12">
                      <a-form-item label="标签值名称" required>
                        <a-input v-model="getCurrentTagValue().name" placeholder="请输入标签值名称" />
                      </a-form-item>
                    </a-col>
                    <a-col :span="12">
                      <a-form-item label="标签值">
                        <a-input v-model="getCurrentTagValue().value" placeholder="请输入标签值" />
                      </a-form-item>
                    </a-col>
                  </a-row>
                  <a-form-item label="描述">
                    <a-textarea v-model="getCurrentTagValue().description" placeholder="请输入标签值描述" :rows="2" />
                  </a-form-item>
                </a-form>
                
                <!-- 条件配置 -->
                <div class="condition-config-section">
                  <div class="section-header">
                    <h4>条件配置</h4>
                  </div>
                  
                  <ConditionConfig
                    :condition-groups="getCurrentTagValueConditionGroups()"
                    :cross-group-logic="getCurrentTagValue().crossGroupLogic || 'or'"
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
                    @add-condition-group="addConditionGroup"
                    @add-exclude-condition-group="addExcludeConditionGroup"
                    @delete-condition-group="deleteConditionGroup"
                    @delete-exclude-condition-group="deleteExcludeConditionGroup"
                    @toggle-group-logic="toggleGroupLogic"
                    @toggle-cross-group-logic="toggleCrossGroupLogic"
                    @add-condition-by-type="addConditionByType"
                    @remove-condition="removeCondition"
                  />
                </div>
              </div>
            </div>
          </a-tab-pane>


        </a-tabs>
      </div>

      <!-- 数据导入模式 -->
      <div v-else-if="createMode === 'import'">
        <a-form :model="importForm" layout="vertical">
          <a-form-item label="导入方式">
            <a-radio-group v-model="importForm.method">
              <a-radio value="file">文件上传</a-radio>
              <a-radio value="database">数据库导入</a-radio>
              <a-radio value="api">API接口</a-radio>
            </a-radio-group>
          </a-form-item>
          
          <!-- 文件上传 -->
          <div v-if="importForm.method === 'file'">
            <a-form-item label="上传文件">
              <a-upload
                :file-list="importForm.fileList"
                :show-file-list="true"
                :auto-upload="false"
                accept=".csv,.xlsx,.json"
                @change="handleFileChange"
              >
                <template #upload-button>
                  <div class="upload-area">
                    <IconUpload style="font-size: 48px; color: #c9cdd4;" />
                    <div style="margin-top: 8px;">点击或拖拽文件到此处上传</div>
                    <div style="color: var(--subapp-text-tertiary); font-size: 12px; margin-top: 4px;">支持 CSV、Excel、JSON 格式</div>
                  </div>
                </template>
              </a-upload>
            </a-form-item>
            
            <a-form-item label="字段映射" v-if="importForm.fileList.length > 0">
              <a-table :data="importForm.fieldMapping" :pagination="false" size="small">
                <template #columns>
                  <a-table-column title="源字段" data-index="sourceField" :width="200" />
                  <a-table-column title="目标字段" data-index="targetField" :width="200">
                    <template #cell="{ record }">
                      <a-select v-model="record.targetField" placeholder="选择目标字段">
                        <a-option value="id">标签ID</a-option>
                        <a-option value="name">标签名称</a-option>
                        <a-option value="value">标签值</a-option>
                        <a-option value="user_id">用户ID</a-option>
                        <a-option value="create_time">创建时间</a-option>
                      </a-select>
                    </template>
                  </a-table-column>
                  <a-table-column title="数据类型" data-index="dataType" :width="150">
                    <template #cell="{ record }">
                      <a-select v-model="record.dataType" placeholder="选择类型">
                        <a-option value="string">字符串</a-option>
                        <a-option value="number">数值</a-option>
                        <a-option value="date">日期</a-option>
                        <a-option value="boolean">布尔值</a-option>
                      </a-select>
                    </template>
                  </a-table-column>
                </template>
              </a-table>
            </a-form-item>
          </div>
          
          <!-- 数据库导入 -->
          <div v-if="importForm.method === 'database'">
            <a-row :gutter="16">
              <a-col :span="12">
                <a-form-item label="数据源">
                  <a-select v-model="importForm.dataSource" placeholder="请选择数据源">
                    <a-option value="mysql_main">MySQL主库</a-option>
                    <a-option value="mysql_slave">MySQL从库</a-option>
                    <a-option value="postgresql">PostgreSQL</a-option>
                    <a-option value="oracle">Oracle</a-option>
                  </a-select>
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="数据表">
                  <a-select v-model="importForm.tableName" placeholder="请选择数据表">
                    <a-option value="user_tags">用户标签表</a-option>
                    <a-option value="customer_info">客户信息表</a-option>
                    <a-option value="behavior_data">行为数据表</a-option>
                  </a-select>
                </a-form-item>
              </a-col>
            </a-row>
            <a-form-item label="查询条件">
              <a-textarea v-model="importForm.queryCondition" placeholder="请输入WHERE条件（可选）" :rows="3" />
            </a-form-item>
          </div>
          
          <!-- API接口 -->
          <div v-if="importForm.method === 'api'">
            <a-row :gutter="16">
              <a-col :span="8">
                <a-form-item label="请求方法">
                  <a-select v-model="importForm.apiMethod" placeholder="请选择请求方法">
                    <a-option value="GET">GET</a-option>
                    <a-option value="POST">POST</a-option>
                  </a-select>
                </a-form-item>
              </a-col>
              <a-col :span="16">
                <a-form-item label="API地址">
                  <a-input v-model="importForm.apiUrl" placeholder="请输入API地址" />
                </a-form-item>
              </a-col>
            </a-row>
            <a-form-item label="请求头">
              <a-textarea v-model="importForm.apiHeaders" placeholder="请输入请求头（JSON格式）" :rows="3" />
            </a-form-item>
            <a-form-item label="请求参数" v-if="importForm.apiMethod === 'POST'">
              <a-textarea v-model="importForm.apiParams" placeholder="请输入请求参数（JSON格式）" :rows="3" />
            </a-form-item>
          </div>
          
          <a-form-item label="导入配置">
            <a-row :gutter="16">
              <a-col :span="12">
                <a-form-item label="批次大小">
                  <a-input-number v-model="importForm.batchSize" :min="100" :max="10000" placeholder="1000" />
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="重复处理">
                  <a-select v-model="importForm.duplicateHandling" placeholder="请选择重复处理方式">
                    <a-option value="skip">跳过</a-option>
                    <a-option value="update">更新</a-option>
                    <a-option value="error">报错</a-option>
                  </a-select>
                </a-form-item>
              </a-col>
            </a-row>
          </a-form-item>
        </a-form>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { IconPlus, IconSearch, IconRefresh, IconDelete, IconDown, IconSettings, IconImport, IconUpload, IconEdit, IconCheck, IconClose, IconArrowLeft } from '@arco-design/web-vue/es/icon'
import ConditionConfig from '@/components/common/ConditionConfig.vue'
import { useTagManagement } from '@/composables/useTagManagement'

const router = useRouter()

// 标签数据接口
interface TagItem {
  id: string
  name: string
  dataType: string // 数据类型
  category: string // 标签分类
  tagType: string // 标签类型
  dimensionKey: string // 维度主键
  shareLevel: string // 共享级别
  createUser: string // 创建人
  createTime: string
  description?: string
  mappingStatus?: 'configured' | 'unconfigured' | 'error' // IDMapping状态
}

// 搜索表单
const searchForm = reactive({
  tagName: ''
})

// 表格数据
const tableData = ref<TagItem[]>([])
const loading = ref(false)

// 分页配置
const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showTotal: true,
  showPageSize: true,
  pageSizeOptions: [10, 20, 50, 100]
})

// 标签编辑
const editModalVisible = ref(false)
const createMode = ref<'edit' | 'rule' | 'import'>('edit')
const activeTab = ref('basic')

const editForm = ref<TagItem>({
  id: '',
  name: '',
  dataType: 'string',
  category: 'basic',
  tagType: 'static',
  dimensionKey: '',
  shareLevel: 'public',
  createUser: '',
  createTime: '',
  description: ''
})
const editIndex = ref(-1)

// 自定义规则表单
const ruleForm = ref({
  basic: {
    id: '',
    name: '',
    dataType: 'string',
    category: 'basic',
    dimensionKey: '',
    description: ''
  },
  notification: {
    enabled: false,
    methods: [] as string[],
    scenarios: [] as string[],
    recipients: [] as string[],
    webhookUrl: ''
  },
  tagValues: [] as Array<{
    name: string
    value: string
    description: string
    conditionGroups: Array<{
      isExclude?: boolean
      conditions: Array<{
        field: string
        operator: string
        value: string
        logic?: string
      }>
    }>
    crossGroupLogic: string
  }>
})

// 选中的标签值索引
const selectedTagValueIndex = ref(-1)

// 数据导入表单
const importForm = ref({
  method: 'file',
  fileList: [] as any[],
  fieldMapping: [] as any[],
  dataSource: '',
  tableName: '',
  queryCondition: '',
  apiMethod: 'GET',
  apiUrl: '',
  apiHeaders: '',
  apiParams: '',
  batchSize: 1000,
  duplicateHandling: 'skip'
})
const { tags: storeTags, fetchTags, deleteTags: storeDeleteTags, createTag: storeCreateTag, updateTag: storeUpdateTag } = useTagManagement()

// 获取数据
const fetchData = async () => {
  loading.value = true
  try {
    await fetchTags({ searchText: searchForm.tagName })
    const list = storeTags.value
    let filtered = list
    if (searchForm.tagName) {
      filtered = list.filter(item => item.name.includes(searchForm.tagName) || item.id.includes(searchForm.tagName))
    }
    pagination.total = filtered.length
    const start = (pagination.current - 1) * pagination.pageSize
    const end = start + pagination.pageSize
    tableData.value = filtered.slice(start, end)
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  pagination.current = 1
  fetchData()
}

// 重置搜索
const handleReset = () => {
  searchForm.tagName = ''
  pagination.current = 1
  fetchData()
}

// 分页变化
const handlePageChange = (page: number) => {
  pagination.current = page
  fetchData()
}

const handlePageSizeChange = (pageSize: number) => {
  pagination.pageSize = pageSize
  pagination.current = 1
  fetchData()
}

// 获取模态框标题
const getModalTitle = () => {
  if (editIndex.value >= 0) return '编辑标签'
  if (createMode.value === 'rule') return '自定义规则创建标签'
  if (createMode.value === 'import') return '数据导入创建标签'
  return '新增标签'
}

// 添加标签（编辑模式）
const addTag = () => {
  createMode.value = 'edit'
  editForm.value = {
    id: '',
    name: '',
    dataType: 'string',
    category: 'basic',
    tagType: 'static',
    dimensionKey: '',
    shareLevel: 'public',
    createUser: '当前用户',
    createTime: new Date().toISOString(),
    description: ''
  }
  editIndex.value = -1
  editModalVisible.value = true
}

// 自定义规则创建标签
const addTagByRule = () => {
  router.push({ name: 'TagCreate' })
}

// 数据导入创建标签
const addTagByImport = () => {
  createMode.value = 'import'
  // 重置导入表单
  importForm.value = {
    method: 'file',
    fileList: [],
    fieldMapping: [],
    dataSource: '',
    tableName: '',
    queryCondition: '',
    apiMethod: 'GET',
    apiUrl: '',
    apiHeaders: '',
    apiParams: '',
    batchSize: 1000,
    duplicateHandling: 'skip'
  }
  editIndex.value = -1
  editModalVisible.value = true
}

// 删除标签
const removeTag = async (index: number) => {
  const target = tableData.value[index]
  if (!target) return
  await storeDeleteTags([target.id])
  await fetchData()
  Message.success('删除成功')
}

// 编辑标签
const editTag = (record: TagItem) => {
  createMode.value = 'edit'
  editForm.value = { ...record }
  editIndex.value = tableData.value.findIndex(item => item.id === record.id)
  editModalVisible.value = true
}

// 跳转到标签详情页
const goToTagDetail = (record: TagItem) => {
  router.push({
    name: 'TagSystemTagDetail',
    params: {
      id: record.id
    }
  })
}

// 跳转到表注册页面
const goToTableRegistration = () => {
  router.push({
    name: 'TagSystemTableRegistration'
  })
}

// 更新标签
const updateTag = async (record: TagItem) => {
  await storeUpdateTag(record.id, { ...record })
  await fetchData()
  Message.success('标签已更新')
}

// 保存标签
const saveTag = async () => {
  if (createMode.value === 'edit') {
    if (editIndex.value >= 0) {
      await storeUpdateTag(editForm.value.id, { ...editForm.value })
      Message.success('标签更新成功')
    } else {
      const newTag = { ...editForm.value, createTime: new Date().toISOString() }
      await storeCreateTag(newTag)
      Message.success('标签创建成功')
    }
    await fetchData()
  } else if (createMode.value === 'rule') {
    const newTag: TagItem = {
      id: ruleForm.value.basic.id,
      name: ruleForm.value.basic.name,
      dataType: ruleForm.value.basic.dataType,
      category: ruleForm.value.basic.category,
      tagType: 'rule',
      dimensionKey: ruleForm.value.basic.dimensionKey,
      shareLevel: 'public',
      createUser: '当前用户',
      createTime: new Date().toISOString(),
      description: ruleForm.value.basic.description
    }
    await storeCreateTag(newTag)
    await fetchData()
    Message.success('规则标签创建成功')
  } else if (createMode.value === 'import') {
    Message.success('数据导入任务已提交，请稍后查看结果')
  }
  editModalVisible.value = false
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
  ruleForm.value.tagValues.push(newTagValue)
  selectedTagValueIndex.value = ruleForm.value.tagValues.length - 1
}

const removeTagValue = (index: number) => {
  ruleForm.value.tagValues.splice(index, 1)
  if (selectedTagValueIndex.value === index) {
    selectedTagValueIndex.value = ruleForm.value.tagValues.length > 0 ? 0 : -1
  } else if (selectedTagValueIndex.value > index) {
    selectedTagValueIndex.value--
  }
}

const selectTagValue = (index: number) => {
  selectedTagValueIndex.value = index
}

const getCurrentTagValue = () => {
  if (selectedTagValueIndex.value >= 0 && selectedTagValueIndex.value < ruleForm.value.tagValues.length) {
    return ruleForm.value.tagValues[selectedTagValueIndex.value]
  }
  return {
    name: '',
    value: '',
    description: '',
    conditionGroups: [],
    crossGroupLogic: 'or'
  }
}

const getCurrentTagValueConditionGroups = () => {
  const currentTagValue = getCurrentTagValue()
  return currentTagValue.conditionGroups || []
}

const addConditionGroup = () => {
  const currentTagValue = getCurrentTagValue()
  if (currentTagValue) {
    currentTagValue.conditionGroups.push({
      conditions: [{
        field: '',
        operator: '',
        value: '',
        logic: 'and'
      }]
    })
  }
}

const addExcludeConditionGroup = () => {
  const currentTagValue = getCurrentTagValue()
  if (currentTagValue) {
    currentTagValue.conditionGroups.push({
      isExclude: true,
      conditions: [{
        field: '',
        operator: '',
        value: '',
        logic: 'and'
      }]
    })
  }
}

const deleteConditionGroup = (groupIndex: number) => {
  const currentTagValue = getCurrentTagValue()
  if (currentTagValue && currentTagValue.conditionGroups) {
    currentTagValue.conditionGroups.splice(groupIndex, 1)
  }
}

const deleteExcludeConditionGroup = (groupIndex: number) => {
  const currentTagValue = getCurrentTagValue()
  if (currentTagValue && currentTagValue.conditionGroups) {
    // 找到排除条件组中的索引
    const excludeGroups = currentTagValue.conditionGroups.filter(group => group.isExclude)
    if (groupIndex >= 0 && groupIndex < excludeGroups.length) {
      const targetGroup = excludeGroups[groupIndex]
      const actualIndex = currentTagValue.conditionGroups.indexOf(targetGroup)
      currentTagValue.conditionGroups.splice(actualIndex, 1)
    }
  }
}

const addCondition = (groupIndex: number) => {
  const currentTagValue = getCurrentTagValue()
  if (currentTagValue && currentTagValue.conditionGroups[groupIndex]) {
    currentTagValue.conditionGroups[groupIndex].conditions.push({
      field: '',
      operator: '',
      value: '',
      logic: 'and'
    })
  }
}

const deleteCondition = (groupIndex: number, conditionIndex: number) => {
  const currentTagValue = getCurrentTagValue()
  if (currentTagValue && currentTagValue.conditionGroups[groupIndex]) {
    currentTagValue.conditionGroups[groupIndex].conditions.splice(conditionIndex, 1)
  }
}

const toggleConditionLogic = (groupIndex: number, conditionIndex: number) => {
  const currentTagValue = getCurrentTagValue()
  if (currentTagValue && currentTagValue.conditionGroups[groupIndex] && currentTagValue.conditionGroups[groupIndex].conditions[conditionIndex]) {
    const condition = currentTagValue.conditionGroups[groupIndex].conditions[conditionIndex]
    condition.logic = condition.logic === 'and' ? 'or' : 'and'
  }
}

const toggleCrossGroupLogic = () => {
  const currentTagValue = getCurrentTagValue()
  if (currentTagValue) {
    currentTagValue.crossGroupLogic = currentTagValue.crossGroupLogic === 'and' ? 'or' : 'and'
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
    condition.dateRange = []
  }
}

// 切换条件组逻辑
const toggleGroupLogic = (group: any) => {
  group.logic = group.logic === 'and' ? 'or' : 'and'
}

// 按类型添加条件
const addConditionByType = (group: any, type: string) => {
  const newCondition = {
    id: Date.now().toString(),
    type: type,
    dataSourceType: type === 'tag' ? 'attribute' : type,
    fieldName: '',
    aggregationType: '',
    operator: '',
    value: '',
    dateType: 'dynamic',
    dynamicValue: 1,
    dynamicUnit: 'days',
    isExclude: false
  }
  group.conditions.push(newCondition)
}

// 移除条件
const removeCondition = (group: any, conditionIndex: number) => {
  group.conditions.splice(conditionIndex, 1)
}



// 导入相关函数
const handleFileChange = (fileList: any[]) => {
  importForm.value.fileList = fileList
  if (fileList.length > 0) {
    // 模拟解析文件字段
    importForm.value.fieldMapping = [
      { sourceField: 'user_id', targetField: 'user_id', dataType: 'string' },
      { sourceField: 'tag_name', targetField: 'name', dataType: 'string' },
      { sourceField: 'tag_value', targetField: 'value', dataType: 'string' },
      { sourceField: 'created_at', targetField: 'create_time', dataType: 'date' }
    ]
  }
}

// 取消编辑
const cancelEdit = () => {
  editModalVisible.value = false
  editIndex.value = -1
  createMode.value = 'edit'
  activeTab.value = 'basic'
}

// 获取数据类型颜色
const getDataTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    string: 'green',
    number: 'blue'
  }
  return colors[type] || 'gray'
}

// 获取数据类型文本
const getDataTypeText = (type: string) => {
  const texts: Record<string, string> = {
    string: '字符型',
    number: '数值型'
  }
  return texts[type] || type
}

// 获取标签分类颜色
const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    basic: 'blue',
    behavior: 'green',
    preference: 'orange',
    business: 'purple'
  }
  return colors[category] || 'gray'
}

// 获取标签分类文本
const getCategoryText = (category: string) => {
  const texts: Record<string, string> = {
    basic: '基础信息',
    behavior: '行为特征',
    preference: '偏好特征',
    business: '业务特征'
  }
  return texts[category] || category
}

// 获取标签类型颜色
const getTagTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    static: 'blue',
    dynamic: 'green',
    computed: 'orange',
    rule: 'purple'
  }
  return colors[type] || 'gray'
}

// 获取标签类型文本
const getTagTypeText = (type: string) => {
  const texts: Record<string, string> = {
    static: '静态标签',
    dynamic: '动态标签',
    computed: '计算标签',
    rule: '规则标签'
  }
  return texts[type] || type
}



// 获取共享级别颜色
const getShareLevelColor = (level: string) => {
  const colors: Record<string, string> = {
    public: 'green',
    private: 'orange'
  }
  return colors[level] || 'gray'
}

// 获取共享级别文本
const getShareLevelText = (level: string) => {
  const texts: Record<string, string> = {
    public: '公开',
    private: '私有'
  }
  return texts[level] || level
}

// 获取IDMapping状态颜色
const getMappingStatusColor = (status?: string) => {
  const colors: Record<string, string> = {
    configured: 'green',
    unconfigured: 'orange',
    error: 'red'
  }
  return colors[status || 'unconfigured'] || 'gray'
}

// 获取IDMapping状态文本
const getMappingStatusText = (status?: string) => {
  const texts: Record<string, string> = {
    configured: '已配置',
    unconfigured: '未配置',
    error: '配置错误'
  }
  return texts[status || 'unconfigured'] || '未配置'
}

// 格式化时间
const formatTime = (time: string) => {
  return new Date(time).toLocaleString('zh-CN')
}

// 初始化
onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.tag-management {
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

.page-title {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
  color: var(--subapp-text-primary);
}

.page-description {
  margin: 0;
  color: var(--subapp-text-tertiary);
  font-size: 14px;
}

.header-actions {
  flex-shrink: 0;
}

/* 内容区域 */
.content-section {
  margin-bottom: 20px;
}

.table-card {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.table-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--subapp-text-primary);
}

.table-count {
  color: var(--subapp-text-tertiary);
  font-size: 14px;
}

.tag-table {
  margin-top: 16px;
}

/* 标签值配置样式 - 上下布局 */
.tag-values-config-vertical {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.tag-values-management {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
}

.tag-value-config-section {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  min-height: 400px;
  padding: 20px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--subapp-border);
}

.section-header h3,
.section-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--subapp-text-primary);
}

.tag-values-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  padding: 0;
}

.tag-value-item {
  border: 1px solid var(--subapp-border);
  border-radius: 6px;
  overflow: hidden;
  transition: all 0.2s;
}

.tag-value-item:hover {
  border-color: var(--subapp-primary);
  box-shadow: 0 2px 8px rgba(22, 93, 255, 0.1);
}

.tag-value-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f7f8fa;
  cursor: pointer;
  transition: background-color 0.2s;
}

.tag-value-header:hover {
  background: var(--subapp-bg-secondary);
}

.tag-value-info {
  flex: 1;
}

.tag-value-name {
  display: block;
  font-weight: 500;
  color: var(--subapp-text-primary);
  margin-bottom: 4px;
}

.tag-value-desc {
  display: block;
  font-size: 12px;
  color: var(--subapp-text-tertiary);
}

.tag-value-actions {
  display: flex;
  gap: 8px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  color: var(--subapp-text-tertiary);
}

.empty-state p {
  margin: 8px 0 0 0;
  font-size: 14px;
}

.config-header {
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--subapp-border);
}

.condition-groups-section {
  margin-top: 24px;
}

.section-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.condition-count {
  font-size: 12px;
  color: var(--subapp-text-tertiary);
  background: var(--subapp-bg-secondary);
  padding: 2px 8px;
  border-radius: 10px;
}

.empty-condition-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 20px;
  text-align: center;
  color: var(--subapp-text-tertiary);
  border: 1px dashed var(--subapp-border);
  border-radius: 6px;
  margin-top: 16px;
}

.empty-condition-state p {
  margin: 8px 0 16px 0;
  font-size: 14px;
}

.condition-groups-list {
  margin-top: 16px;
}

.condition-group {
  border: 1px solid var(--subapp-border);
  border-radius: 6px;
  margin-bottom: 16px;
  overflow: hidden;
}

.condition-group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f7f8fa;
  border-bottom: 1px solid var(--subapp-border);
}

.group-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.group-title {
  font-weight: 500;
  color: var(--subapp-text-primary);
}

.group-count {
  font-size: 12px;
  color: var(--subapp-text-tertiary);
  background: var(--subapp-bg-secondary);
  padding: 2px 8px;
  border-radius: 10px;
}

.conditions-list {
  padding: 16px;
}

.condition-item {
  margin-bottom: 12px;
}

.condition-item:last-child {
  margin-bottom: 0;
}

.add-condition-area {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed var(--subapp-border);
}

.logic-connector {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 40px;
  height: 28px;
  background: var(--subapp-primary);
  color: white;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.logic-connector:hover {
  background: var(--subapp-primary);
}

.group-separator {
  display: flex;
  align-items: center;
  margin: 16px 0;
  gap: 12px;
}

.separator-line {
  flex: 1;
  height: 1px;
  background: var(--subapp-border);
}

.add-condition-group-area {
  margin-top: 16px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .tag-management {
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
