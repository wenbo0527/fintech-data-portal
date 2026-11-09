<template>
  <div class="external-purchase-register">
    <div class="page-header">
      <div class="header-content">
        <div class="header-info">
          <h2>{{ isEditMode ? '编辑外数采购项目' : '外数采购项目注册' }}</h2>
          <p class="page-description">{{ isEditMode ? '编辑外部数据采购项目信息，支持补充上传材料和更新项目内容' : '注册外部数据采购项目，上传采购文件并关联数据产品' }}</p>
        </div>
        <div class="header-actions">
          <a-button @click="$router.go(-1)">
            返回
          </a-button>
        </div>
      </div>
    </div>

    <!-- 步骤条 -->
    <a-steps :current="currentStep" class="register-steps">
      <a-step title="上传采购文件" description="上传外数项目采购文件" />
      <a-step title="填写项目信息" description="填写项目名称、采购用量和总金额" />
      <a-step title="关联数据产品" description="选择关联的外部数据产品" />
      <a-step title="完成" description="完成项目注册" />
    </a-steps>

    <!-- 步骤内容 -->
    <a-card class="step-content">
      <!-- 步骤1: 上传采购文件 -->
      <div v-if="currentStep === 0" class="step-container">
        <h3>{{ isEditMode ? '补充上传采购文件' : '上传外数项目采购文件' }}</h3>
        <p class="step-description">{{ isEditMode ? '可以补充上传新的采购文件，支持PDF、Word、Excel格式' : '请上传外数项目采购文件，支持PDF、Word、Excel格式' }}</p>
        
        <a-upload-dragger
          :show-file-list="true"
          :file-list="fileList"
          :custom-request="handleFileUpload"
          @change="handleFileChange"
          @drop="handleDrop"
          @dragover="handleDragOver"
          @dragleave="handleDragLeave"
          accept=".pdf,.docx,.xlsx,.xls"
          drag
          class="upload-area"
          :class="{ 'upload-area--dragover': isDragover }"
          style="height: 180px; margin: 16px 0"
        >
          <div class="upload-content">
            <IconUpload class="upload-icon" style="font-size: 32px; margin-bottom: 16px" />
            <p class="upload-text" style="font-size: 16px; margin-bottom: 8px">拖拽文件到此处或<span class="upload-highlight"> 点击上传</span></p>
            <p class="upload-hint" style="color: var(--color-text-3)">支持PDF、Word、Excel格式文件，文件大小不超过10MB</p>
            <a-progress v-if="uploadProgress > 0" :percent="uploadProgress" :show-text="false" />
          </div>
        </a-upload-dragger>

        <div class="step-actions">
          <a-button type="primary" :disabled="fileList.length === 0" @click="nextStep">下一步</a-button>
          <a-button style="margin-left: 8px" @click="skipFileUpload">跳过上传</a-button>
        </div>
      </div>

      <!-- 步骤2: 填写项目信息 -->
      <div v-if="currentStep === 1" class="step-container">
        <h3>填写项目信息</h3>
        <p class="step-description">请填写外数采购项目的基本信息</p>
        
        <a-form :model="formData" layout="vertical">
          <a-form-item label="项目名称" field="projectName" required>
            <a-input 
              v-model="formData.projectName" 
              placeholder="请输入项目名称" 
              :disabled="isEditMode"
              :readonly="isEditMode"
            />
            <div v-if="isEditMode" class="form-tip">编辑模式下项目名称不可修改</div>
          </a-form-item>
          
          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item label="采购用量" field="purchaseVolume" required>
                <a-input-number 
                  v-model="formData.purchaseVolume" 
                  placeholder="请输入采购用量" 
                  :min="1"
                  style="width: 100%"
                >
                  <template #suffix>条</template>
                </a-input-number>
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="总金额" field="totalAmount" required>
                <a-input-number 
                  v-model="formData.totalAmount" 
                  placeholder="请输入总金额" 
                  :min="0"
                  :precision="2"
                  style="width: 100%"
                >
                  <template #suffix>元</template>
                </a-input-number>
              </a-form-item>
            </a-col>
          </a-row>
          
          <a-form-item label="采购日期" field="purchaseDate" required>
            <a-date-picker v-model="formData.purchaseDate" style="width: 100%" />
          </a-form-item>
          
          <a-form-item label="采购说明" field="description">
            <a-textarea v-model="formData.description" placeholder="请输入采购说明" :rows="3" />
          </a-form-item>
        </a-form>

        <div class="step-actions">
          <a-button style="margin-right: 8px" @click="prevStep">上一步</a-button>
          <a-button 
            type="primary" 
            :disabled="!formData.projectName || !formData.purchaseVolume || !formData.totalAmount || !formData.purchaseDate" 
            @click="nextStep"
          >
            下一步
          </a-button>
        </div>
      </div>

      <!-- 步骤3: 关联数据产品 -->
      <div v-if="currentStep === 2" class="step-container">
        <h3>关联数据产品</h3>
        <p class="step-description">请选择关联的外部数据产品，可以批量勾选</p>
        
        <!-- 筛选条件和操作按钮 -->
        <a-card class="filter-card">
          <div class="filter-section">
            <a-form :model="filterForm" layout="inline">
            <a-form-item field="name" label="名称">
              <a-input v-model="filterForm.name" placeholder="请输入数据名称" allow-clear />
            </a-form-item>
            <a-form-item field="dataType" label="数源种类">
              <a-select v-model="filterForm.dataType" placeholder="请选择数源种类" allow-clear>
                <a-option value="API">API</a-option>
                <a-option value="文件">文件</a-option>
                <a-option value="数据库">数据库</a-option>
              </a-select>
            </a-form-item>
            <a-form-item field="supplier" label="供应商">
              <a-select v-model="filterForm.supplier" placeholder="请选择供应商" allow-clear>
                <a-option value="数据供应商A">数据供应商A</a-option>
                <a-option value="数据供应商B">数据供应商B</a-option>
                <a-option value="数据供应商C">数据供应商C</a-option>
                <a-option value="第三方数据公司">第三方数据公司</a-option>
              </a-select>
            </a-form-item>

            <a-form-item>
              <a-space>
                <a-button type="primary" @click="handleFilter">筛选</a-button>
                <a-button @click="resetFilter">重置</a-button>
                <a-button type="outline" @click="showNewDataModal = true">
                  <template #icon>
                    <IconPlus />
                  </template>
                  新增外数注册
                </a-button>
              </a-space>
            </a-form-item>
          </a-form>
          </div>
        </a-card>
        
        <!-- 数据产品表格 -->
        <a-table
          :columns="columns"
          :data="filteredTableData"
          :pagination="pagination"
          :row-selection="{
            type: 'checkbox',
            showCheckedAll: true,
            selectedRowKeys: selectedRowKeys,
            onChange: handleSelectionChange
          }"
          @page-change="handlePageChange"
        >
          <template #name="{ record }">
            <a-tooltip :content="record.dataName">
              <span>{{ record.dataName }}</span>
            </a-tooltip>
          </template>

        </a-table>
        
        <div class="selected-summary" v-if="selectedRowKeys.length > 0">
          <p>已选择 {{ selectedRowKeys.length }} 个数据产品，其中新数据产品 {{ selectedNewProducts }} 个</p>
        </div>

        <div class="step-actions">
          <a-button style="margin-right: 8px" @click="prevStep">上一步</a-button>
          <a-button type="primary" @click="nextStep">下一步</a-button>
        </div>
      </div>

      <!-- 步骤4: 完成 -->
      <div v-if="currentStep === 3" class="step-container">
        <div class="success-content">
          <IconCheckCircle style="font-size: 64px; color: var(--subapp-success); margin-bottom: 16px" />
          <h3>{{ isEditMode ? '采购项目更新成功' : '采购项目注册成功' }}</h3>
          <p>{{ isEditMode ? '您已成功更新外数采购项目信息，可以在外数管理页面查看详情' : '您已成功注册外数采购项目，可以在外数管理页面查看详情' }}</p>
          
          <div class="project-summary">
            <h4>项目信息</h4>
            <a-descriptions :data="summaryData" layout="vertical" bordered />
            
            <h4 style="margin-top: 24px">关联数据产品</h4>
            <a-table
              :columns="summaryColumns"
              :data="selectedProducts"
              :pagination="false"
            />
          </div>
          
          <div class="step-actions">
            <a-button style="margin-right: 8px" @click="prevStep">上一步</a-button>
            <a-button type="primary" @click="finishRegistration">完成</a-button>
          </div>
        </div>
      </div>
    </a-card>

    <!-- 新增外数注册模态框 -->
    <a-modal
      v-model:visible="showNewDataModal"
      title="新增外数注册"
      :width="modalWidth"
      @ok="handleNewDataSubmit"
      @cancel="resetNewDataForm"
      ok-text="确定"
      cancel-text="取消"
    >
      <a-form
        ref="newDataFormRef"
        :model="newDataFormData"
        :rules="newDataFormRules"
        layout="vertical"
      >
        <!-- 基本信息 -->
        <a-divider orientation="left">基本信息</a-divider>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="数源名称" field="name">
              <a-input 
                v-model="newDataFormData.name" 
                placeholder="请输入数源名称" 
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="数源种类" field="dataCategory">
              <a-select 
                v-model="newDataFormData.dataCategory" 
                placeholder="请选择数源种类"
              >
                <a-option value="征信数据">征信数据</a-option>
                <a-option value="风控数据">风控数据</a-option>
                <a-option value="运营商数据">运营商数据</a-option>
                <a-option value="政务数据">政务数据</a-option>
                <a-option value="金融数据">金融数据</a-option>
                <a-option value="其他">其他</a-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        
        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item label="接口类型" field="interfaceType">
              <a-select 
                v-model="newDataFormData.interfaceType" 
                placeholder="请选择接口类型"
              >
                <a-option value="REST API">REST API</a-option>
                <a-option value="SOAP">SOAP</a-option>
                <a-option value="FTP">FTP</a-option>
                <a-option value="SFTP">SFTP</a-option>
                <a-option value="数据库直连">数据库直连</a-option>
                <a-option value="文件传输">文件传输</a-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="接口标签" field="interfaceTag">
              <a-select 
                v-model="newDataFormData.interfaceTag" 
                placeholder="请选择接口标签"
              >
                <a-option value="主接口">主接口</a-option>
                <a-option value="备接口">备接口</a-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        
        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item label="供应商" field="provider">
              <a-input 
                v-model="newDataFormData.provider" 
                placeholder="请输入供应商名称" 
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="负责人" field="owner">
              <a-input 
                v-model="newDataFormData.owner" 
                placeholder="请输入负责人" 
              />
            </a-form-item>
          </a-col>
        </a-row>
        
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="落库表名" field="targetTable">
              <a-input v-model="newDataFormData.targetTable" placeholder="请输入落库表名" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="单价（元/条）" field="unitPrice">
              <a-input-number 
                v-model="newDataFormData.unitPrice" 
                placeholder="请输入单价" 
                :precision="4"
                :min="0"
                :max="9999.9999"
                style="width: 100%"
              >
                <template #suffix>元/条</template>
              </a-input-number>
            </a-form-item>
          </a-col>
        </a-row>
        
        <a-row :gutter="16">
          <a-col :span="24">
            <a-form-item label="描述信息" field="description">
              <a-textarea v-model="newDataFormData.description" placeholder="请输入描述信息" :rows="3" />
            </a-form-item>
          </a-col>
        </a-row>
        
        <!-- 数据管理 -->
        <a-divider orientation="left">数据管理</a-divider>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="数据管理员" field="dataManager">
              <a-input v-model="newDataFormData.dataManager" placeholder="请输入数据管理员" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="数据更新频率" field="updateFrequency">
              <a-select v-model="newDataFormData.updateFrequency" placeholder="选择更新频率">
                <a-option value="实时">实时</a-option>
                <a-option value="日更新">日更新</a-option>
                <a-option value="离线T+1">离线T+1</a-option>
                <a-option value="每周">每周</a-option>
                <a-option value="每月">每月</a-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        
        <a-row :gutter="16">
          <a-col :span="24">
            <a-form-item label="数据管理说明">
              <a-textarea v-model="newDataFormData.dataManagementDescription" placeholder="请输入数据管理相关说明" :rows="3" />
            </a-form-item>
          </a-col>
        </a-row>
        
        <!-- 文件管理 -->
        <a-divider orientation="left">文件管理</a-divider>
        <a-row :gutter="16">
          <a-col :span="24">
            <a-form-item label="相关文件">
              <!-- 已上传文件列表 -->
              <div v-if="newDataFormData.files && newDataFormData.files.length > 0" class="uploaded-files">
                <div v-for="(file, index) in newDataFormData.files" :key="index" class="file-item">
                  <div class="file-info">
                    <a-input 
                      v-model="file.displayName" 
                      placeholder="请输入文件名称"
                      class="file-name-input"
                    />
                    <span class="file-original-name">{{ file.originalName }}</span>
                    <span class="file-size">{{ formatFileSize(file.size) }}</span>
                  </div>
                  <div class="file-actions">
                    <a-button 
                      type="text" 
                      size="small" 
                      @click="downloadFile(file)"
                    >
                      下载
                    </a-button>
                    <a-button 
                      type="text" 
                      size="small" 
                      status="danger" 
                      @click="removeNewDataFile(index)"
                    >
                      删除
                    </a-button>
                  </div>
                </div>
              </div>
              
              <!-- 文件上传 -->
              <a-upload
                :custom-request="handleNewDataFileUpload"
                :show-file-list="false"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
                class="file-upload"
              >
                <template #upload-button>
                  <a-button type="outline">
                    <template #icon>
                      <IconUpload />
                    </template>
                    上传文件
                  </a-button>
                </template>
              </a-upload>
              
              <div class="upload-tips">
                <p>支持格式：PDF、Word、Excel、TXT、ZIP、RAR</p>
                <p>单个文件大小不超过 50MB</p>
              </div>
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { IconUpload, IconCheckCircle, IconPlus } from '@arco-design/web-vue/es/icon'
import { useFileUpload } from '@/utils-dca/fileUploadUtils'

// 文件接口定义
interface FileItem {
  id: string
  displayName: string
  originalName: string
  size: number
  type: string
  uploadTime: string
}

const router = useRouter()
const route = useRoute()

// 编辑模式相关
const isEditMode = ref(false)
const editingProjectId = ref<string>('')

// 文件上传相关
const { 
  isDragover, 
  uploadProgress, 
  currentFile, 
  handleDragOver, 
  handleDragLeave, 
  handleDrop, 
  formatFileSize,
  handleFileChange,
  handleUpload
} = useFileUpload()

const fileList = ref([])
const fileCount = ref(0)

// 模态框宽度计算属性
const modalWidth = computed(() => {
  if (typeof window !== 'undefined') {
    return Math.min(1000, window.innerWidth * 0.9)
  }
  return 1000
})

// 步骤控制
const currentStep = ref(0)
const nextStep = () => {
  if (currentStep.value < 3) {
    currentStep.value++
  }
}
const prevStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

// 跳过文件上传
const skipFileUpload = () => {
  Message.info('已跳过文件上传，可在后续步骤中补充')
  nextStep()
}

// 表单数据
const formData = reactive({
  projectName: '',
  purchaseVolume: undefined,
  totalAmount: undefined,
  purchaseDate: null,
  description: ''
})

// 筛选条件
const filterForm = reactive({
  name: '',
  dataType: '',
  supplier: '',
  isNew: ''
})

// 新增外数注册相关
const showNewDataModal = ref(false)
const newDataFormRef = ref()

// 新增外数表单数据
const newDataFormData = reactive({
  name: '',
  dataCategory: '',
  interfaceType: '',
  interfaceTag: '',
  provider: '',
  owner: '',
  targetTable: '',
  unitPrice: undefined,
  description: '',
  dataManager: '',
  updateFrequency: '',
  dataManagementDescription: '',
  files: [] as FileItem[]
})

// 新增外数表单验证规则
const newDataFormRules = {
  name: [
    { required: true, message: '请输入数源名称' }
  ],
  dataCategory: [
    { required: true, message: '请选择数源种类' }
  ],
  interfaceType: [
    { required: true, message: '请选择接口类型' }
  ],
  provider: [
    { required: true, message: '请输入供应商名称' }
  ],
  owner: [
    { required: true, message: '请输入负责人' }
  ],
  targetTable: [
    { required: true, message: '请输入落库表名' }
  ],
  unitPrice: [
    { required: true, message: '请输入单价' }
  ]
}

// 表格列配置
const columns = [
  {
    title: '数据名称',
    dataIndex: 'dataName',
    slotName: 'name',
    width: 180
  },
  {
    title: '数源种类',
    dataIndex: 'dataType',
    width: 120
  },
  {
    title: '供应商',
    dataIndex: 'supplier',
    width: 150
  },
  {
    title: '单价(元/次)',
    dataIndex: 'price',
    width: 120
  },
  {
    title: '接口标签',
    dataIndex: 'interfaceTag',
    width: 120
  },

]

// 摘要表格列配置
const summaryColumns = [
  {
    title: '数据名称',
    dataIndex: 'dataName',
    width: 180
  },
  {
    title: '数源种类',
    dataIndex: 'dataType',
    width: 120
  },
  {
    title: '供应商',
    dataIndex: 'supplier',
    width: 150
  },
  {
    title: '单价(元/次)',
    dataIndex: 'price',
    width: 120
  }
]

// 数据产品接口定义
interface DataProduct {
  id: string
  dataName: string
  dataType: string
  supplier: string
  price: number
  interfaceTag: string
  isNew: boolean
}

// 表格数据
const tableData = ref<DataProduct[]>([])

// 分页配置
const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0
})

// 选中的行
const selectedRowKeys = ref<string[]>([])
const selectedProducts = ref<DataProduct[]>([])

// 筛选后的表格数据
const filteredTableData = computed(() => {
  let result: DataProduct[] = [...tableData.value]
  
  if (filterForm.name) {
    result = result.filter(item => 
      item.dataName.toLowerCase().includes(filterForm.name.toLowerCase())
    )
  }
  
  if (filterForm.dataType) {
    result = result.filter(item => item.dataType === filterForm.dataType)
  }
  
  if (filterForm.supplier) {
    result = result.filter(item => item.supplier === filterForm.supplier)
  }
  
  if (filterForm.isNew === 'true') {
    result = result.filter(item => item.isNew === true)
  } else if (filterForm.isNew === 'false') {
    result = result.filter(item => item.isNew === false)
  }
  
  pagination.total = result.length
  return result
})

// 计算选中的新数据产品数量
const selectedNewProducts = computed(() => {
  return selectedProducts.value.filter(item => item.isNew).length
})

// 项目摘要信息
const summaryData = computed(() => [
  {
    label: '项目名称',
    value: formData.projectName
  },
  {
    label: '采购用量',
    value: formData.purchaseVolume ? `${formData.purchaseVolume} 条` : ''
  },
  {
    label: '总金额',
    value: formData.totalAmount ? `${formData.totalAmount} 元` : ''
  },
  {
    label: '采购日期',
    value: formData.purchaseDate ? new Date(formData.purchaseDate).toLocaleDateString() : ''
  },
  {
    label: '关联产品数',
    value: selectedRowKeys.value.length
  }
])



// 处理文件上传
const handleFileUpload = async (option: any) => {
  const { fileItem } = option
  uploadProgress.value = 0
  
  // 模拟上传进度
  const interval = setInterval(() => {
    if (uploadProgress.value < 99) {
      uploadProgress.value += 10
    } else {
      clearInterval(interval)
      uploadProgress.value = 100
      Message.success('文件上传成功')
    }
  }, 300)
  
  return {
    abort: () => {
      clearInterval(interval)
      uploadProgress.value = 0
    }
  }
}

// 处理筛选
const handleFilter = () => {
  pagination.current = 1
}

// 重置筛选
const resetFilter = () => {
  filterForm.name = ''
  filterForm.dataType = ''
  filterForm.supplier = ''
  filterForm.isNew = ''
  pagination.current = 1
}

// 处理分页变化
const handlePageChange = (page: number) => {
  pagination.current = page
}

// 处理选择变化
const handleSelectionChange = (rowKeys: string[], rows: DataProduct[]) => {
  selectedRowKeys.value = rowKeys
  selectedProducts.value = rows
}

// 完成注册
const finishRegistration = () => {
  const message = isEditMode.value ? '外数采购项目更新成功' : '外数采购项目注册成功'
  Message.success(message)
  router.push('/discovery/asset-management/external-data-management')
}

// 新增外数注册相关方法
// 提交新增外数表单
const handleNewDataSubmit = async () => {
  try {
    const valid = await newDataFormRef.value?.validate()
    if (valid) {
      // 模拟提交数据
      const newDataProduct: DataProduct = {
        id: `data-new-${Date.now()}`,
        dataName: newDataFormData.name,
        dataType: newDataFormData.dataCategory,
        supplier: newDataFormData.provider,
        price: newDataFormData.unitPrice || 0,
        interfaceTag: newDataFormData.interfaceTag,
        isNew: true, // 标记为新数据产品
        status: 'pending_tech_profile' // 标记为待完善技术档案
      }
      
      // 添加到表格数据中
      tableData.value.unshift(newDataProduct)
      
      // 自动选中新添加的数据产品
      selectedRowKeys.value.push(newDataProduct.id)
      selectedProducts.value.push(newDataProduct)
      
      Message.success('外数注册成功，已自动关联到当前采购项目')
      showNewDataModal.value = false
      resetNewDataForm()
    }
  } catch (error) {

  }
}

// 重置新增外数表单
const resetNewDataForm = () => {
  newDataFormData.name = ''
  newDataFormData.dataCategory = ''
  newDataFormData.interfaceType = ''
  newDataFormData.interfaceTag = ''
  newDataFormData.provider = ''
  newDataFormData.owner = ''
  newDataFormData.targetTable = ''
  newDataFormData.unitPrice = undefined
  newDataFormData.description = ''
  newDataFormData.dataManager = ''
  newDataFormData.updateFrequency = ''
  newDataFormData.dataManagementDescription = ''
  newDataFormData.files = []
  
  newDataFormRef.value?.clearValidate()
}

// 处理新增外数文件上传
const handleNewDataFileUpload = async (option: any) => {
  const { fileItem } = option
  
  // 模拟文件上传
  const newFile = {
    id: Date.now().toString(),
    displayName: fileItem.name,
    originalName: fileItem.name,
    size: fileItem.size,
    type: fileItem.type,
    uploadTime: new Date().toISOString()
  }
  
  newDataFormData.files.push(newFile)
  Message.success('文件上传成功')
  
  return {
    abort: () => {
      // 取消上传逻辑
    }
  }
}

// 删除新增外数文件
const removeNewDataFile = (index: number) => {
  newDataFormData.files.splice(index, 1)
  Message.success('文件删除成功')
}

// 下载文件
const downloadFile = (file: FileItem) => {
  // 模拟文件下载
  Message.info(`正在下载文件: ${file.displayName}`)
}

// 加载编辑数据
const loadEditData = () => {
  // 检查是否为编辑模式
  if (route.query.mode === 'edit' && route.query.id) {
    isEditMode.value = true
    editingProjectId.value = Array.isArray(route.query.id) ? (route.query.id[0] || '') : (route.query.id || '')
    
    // 从路由状态或历史记录中获取编辑数据
    const editData = history.state?.editData
    if (editData) {
      // 填充表单数据
      formData.projectName = editData.projectName
      formData.purchaseVolume = editData.purchaseVolume
      formData.totalAmount = editData.totalAmount
      formData.purchaseDate = editData.purchaseDate
      formData.description = editData.description
      
      // 如果有已关联的产品，设置选中状态
      if (editData.relatedProducts) {
        selectedRowKeys.value = editData.relatedProducts.map((p: any) => p.id)
        selectedProducts.value = [...editData.relatedProducts]
      }
      
      // 如果有已上传的文件，设置文件列表
      if (editData.uploadedFiles) {
        fileList.value = editData.uploadedFiles.map((file: any) => ({
          uid: file.id,
          name: file.name,
          status: 'done',
          url: file.url
        }))
      }
      // 编辑模式直接定位到“关联数据产品”步骤
      currentStep.value = 2
    }
  }
}

// 加载模拟数据
onMounted(() => {
  // 检查编辑模式并加载数据
  loadEditData()
  
  // 模拟获取外部数据产品列表
  tableData.value = Array.from({ length: 50 }).map((_, index): DataProduct => ({
    id: `data-${index + 1}`,
    dataName: `外部数据产品 ${index + 1}`,
    dataType: ['API', '文件', '数据库'][Math.floor(Math.random() * 3)],
    supplier: ['数据供应商A', '数据供应商B', '数据供应商C', '第三方数据公司'][Math.floor(Math.random() * 4)],
    price: Math.floor(Math.random() * 1000) / 100,
    interfaceTag: ['金融', '电商', '运营商', '社交', '交通'][Math.floor(Math.random() * 5)],
    isNew: Math.random() > 0.5 // 随机设置是否为新数据产品
  }))
  
  pagination.total = tableData.value.length
})
</script>

<style scoped>
.external-purchase-register {
  padding: 16px;
}

.page-header {
  margin-bottom: 24px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 8px;
  padding: 24px;
  border: 1px solid var(--subapp-border);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.header-info h2 {
  margin: 0 0 8px 0;
  color: var(--subapp-text-primary);
  font-size: 24px;
  font-weight: 600;
}

.page-description {
  margin: 0;
  color: var(--subapp-text-tertiary);
  font-size: 14px;
  line-height: 1.5;
}

.header-actions {
  flex-shrink: 0;
}

.register-steps {
  margin-bottom: 24px;
  background: white;
  padding: 24px;
  border-radius: 8px;
  border: 1px solid var(--subapp-border);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.step-content {
  margin-bottom: 24px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.step-container {
  padding: 16px 0;
}

.step-description {
  color: var(--color-text-3);
  margin-bottom: 24px;
}

.step-actions {
  margin-top: 24px;
  display: flex;
  justify-content: flex-end;
}

.upload-area {
  border: 2px dashed var(--color-border-2);
  border-radius: 4px;
  transition: all 0.3s;
}

.upload-area--dragover {
  border-color: var(--color-primary-light-3);
  background-color: var(--color-primary-light-1);
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.upload-highlight {
  color: var(--color-primary);
}

.filter-card {
  margin-bottom: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.filter-section {
  margin: 0;
}

.completion-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 0;
}

.project-summary {
  width: 100%;
  margin-top: 32px;
}

.form-tip {
  font-size: 12px;
  color: var(--color-text-3);
  margin-top: 4px;
  font-style: italic;
}

/* 新增外数注册相关样式 */
.uploaded-files {
  margin-bottom: 16px;
}

.file-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border: 1px solid var(--color-border-2);
  border-radius: 6px;
  margin-bottom: 8px;
  background-color: var(--color-fill-1);
}

.file-info {
  display: flex;
  align-items: center;
  flex: 1;
  gap: 12px;
}

.file-name-input {
  width: 200px;
}

.file-original-name {
  color: var(--color-text-2);
  font-size: 14px;
}

.file-size {
  color: var(--color-text-3);
  font-size: 12px;
}

.file-actions {
  display: flex;
  gap: 8px;
}

.file-upload {
  margin-bottom: 16px;
}

.upload-tips {
  color: var(--color-text-3);
  font-size: 12px;
  line-height: 1.5;
}

.upload-tips p {
  margin: 4px 0;
}
</style>
