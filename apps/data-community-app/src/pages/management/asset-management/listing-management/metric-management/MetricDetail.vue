<template>
  <div class="metric-detail-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <a-button type="text" @click="goBack">
        <template #icon><IconLeft /></template>
        返回
      </a-button>
      <h2>{{ isEditMode ? '编辑指标' : (isViewMode ? '指标详情' : '新建指标') }}</h2>
      <div v-if="!isViewMode">
        <a-button type="outline" @click="handleSaveDraft" style="margin-right: 12px">
          保存草稿
        </a-button>
        <a-button type="primary" @click="handleSubmit">
          {{ isEditMode ? '更新指标' : '上线' }}
        </a-button>
        <a-button v-if="isEditMode && formData.versionStatus === '草稿'" type="primary" @click="handleGoOnline" style="margin-left: 12px">
          上线
        </a-button>
      </div>
      <div v-else>
        <a-button type="outline" @click="handleEdit" style="margin-right: 12px">
          编辑
        </a-button>
        <a-button type="primary" @click="goBack">
          返回列表
        </a-button>
      </div>
    </div>



    <!-- 指标表单 -->
    <div class="form-container" :class="{ 'scrollable': enableScroll }">
      <a-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        layout="vertical"
        :disabled="isViewMode"
      >
        <!-- 基本信息 -->
        <a-card title="基本信息" class="form-section">
          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item label="指标名称" field="name">
                <a-input v-model="formData.name" :max-length="50" show-word-limit placeholder="请输入指标名称（2-50字符）" />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="指标编码" field="code">
                <a-input v-model="formData.code" :max-length="20" show-word-limit placeholder="请输入指标编码（英文数字组合，2-20字符）" />
              </a-form-item>
            </a-col>
          </a-row>

          <a-row :gutter="16">
            
            <a-col :span="12">
              <a-form-item label="指标域" field="category">
                <a-select v-model="formData.category" placeholder="请选择指标分类">
                  <a-option value="用户指标">用户指标</a-option>
                  <a-option value="业务域">业务域</a-option>
                  <a-option value="技术指标">技术指标</a-option>
                  <a-option value="财务指标">财务指标</a-option>
                  <a-option value="风险指标">风险指标</a-option>
                </a-select>
              </a-form-item>
            </a-col>
          </a-row>

          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item label="归属场景" field="scene">
                <a-select v-model="formData.scene" placeholder="请选择或新建归属场景" allow-create @create="onCreateScene">
                  <a-option v-for="s in scenesOptions" :key="s" :value="s">{{ s }}</a-option>
                </a-select>
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="关联业务模块" field="modules">
                <a-select v-model="formData.modules" mode="multiple" placeholder="选择或新建关联模块" allow-create>
                  <a-option v-for="m in moduleOptions" :key="m" :value="m">{{ m }}</a-option>
                </a-select>
              </a-form-item>
            </a-col>
          </a-row>

          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item label="业务负责人" field="businessOwner">
                <a-select v-model="formData.businessOwner" placeholder="请选择业务负责人" :filter-option="false" @search="(v: string) => fetchUsers(v)" :loading="loadingUsers">
                  <a-option v-for="u in usersOptions" :key="u.value" :value="u.value">{{ u.label }}</a-option>
                </a-select>
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="技术负责人" field="technicalOwner">
                <a-select v-model="formData.technicalOwner" placeholder="请选择技术负责人" :filter-option="false" @search="(v: string) => fetchUsers(v)" :loading="loadingUsers">
                  <a-option v-for="u in usersOptions" :key="u.value" :value="u.value">{{ u.label }}</a-option>
                </a-select>
              </a-form-item>
            </a-col>
          </a-row>

          <a-row :gutter="16">
            <a-col :span="24">
              <a-form-item label="业务口径" field="businessDefinition">
                <a-textarea 
                  ref="businessDefinitionEditor"
                  v-model="formData.businessDefinition" 
                  :max-length="500"
                  show-word-limit
                  placeholder="请输入业务口径（支持 Markdown 富文本，最大500字符）" 
                  :auto-size="{ minRows: 4, maxRows: 8 }"
                />
                <div class="editor-toolbar">
                  <a-button size="mini" @click="insertMarkdown('business')">粗体/斜体/列表</a-button>
                </div>
              </a-form-item>
            </a-col>
          </a-row>

          <a-row :gutter="16">
            <a-col :span="24">
              <a-form-item label="使用场景" field="useCase">
                <a-textarea 
                  ref="useCaseEditor"
                  v-model="formData.useCase" 
                  :max-length="300"
                  show-word-limit
                  placeholder="请输入使用场景（支持 Markdown 富文本，最大300字符）" 
                  :auto-size="{ minRows: 3, maxRows: 6 }"
                />
                <div class="editor-toolbar">
                  <a-button size="mini" @click="insertMarkdown('use')">粗体/斜体/列表</a-button>
                </div>
              </a-form-item>
            </a-col>
          </a-row>
        </a-card>

        <!-- 技术信息 -->
        <a-card title="技术信息" class="form-section">
          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item label="计算时效" field="computeTimeliness">
                <a-select v-model="formData.computeTimeliness" placeholder="请选择计算时效">
                  <a-option value="实时">实时</a-option>
                  <a-option value="T+1">T+1</a-option>
                  <a-option value="T+2">T+2</a-option>
                  <a-option value="周更新">周更新</a-option>
                  <a-option value="月更新">月更新</a-option>
                </a-select>
              </a-form-item>
            </a-col>
          </a-row>

          <a-row :gutter="16">
            
            <a-col :span="24">
              <a-form-item label="技术口径" field="technicalCaliber">
                <MonacoEditor v-model:modelValue="formData.technicalCaliber" language="sql" height="240px" />
              </a-form-item>
            </a-col>
          </a-row>

          <a-row :gutter="16">
            <a-col :span="24">
              <a-form-item label="技术口径使用说明" field="technicalUsageNote">
                <a-textarea 
                  v-model="formData.technicalUsageNote" 
                  :max-length="300"
                  show-word-limit
                  placeholder="请输入技术口径使用说明（可选，最大300字符）" 
                  :auto-size="{ minRows: 2, maxRows: 4 }"
                />
              </a-form-item>
            </a-col>
          </a-row>

          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item label="结果表" field="resultTable">
                <a-input v-model="formData.resultTable" :max-length="50" show-word-limit placeholder="请输入结果表（50字符以内）" />
              </a-form-item>
            </a-col>
            <a-col :span="24">
              <a-form-item label="查询代码" field="queryCode">
                <MonacoEditor v-model:modelValue="formData.queryCode" language="sql" height="180px" />
              </a-form-item>
            </a-col>
          </a-row>
        </a-card>

        <!-- 版本信息 -->
        <a-card title="版本信息" class="form-section">
          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item label="版本号（自动）" field="version">
                <a-input v-model="formData.version" placeholder="自动生成版本号" :disabled="true" />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="版本状态" field="versionStatus">
                <a-select v-model="formData.versionStatus" :disabled="true">
                  <a-option value="草稿">草稿</a-option>
                  <a-option value="启动">启动</a-option>
                  <a-option value="归档">归档</a-option>
                </a-select>
              </a-form-item>
            </a-col>
          </a-row>
          <a-row :gutter="16">
            <a-col :span="24">
              <a-alert v-if="formData.versionStatus === '草稿'" type="info" style="margin-bottom: 16px">
                当前版本为草稿状态，需要点击"上线"按钮后才能生效
              </a-alert>
              <a-alert v-else-if="formData.versionStatus === '启动'" type="success" style="margin-bottom: 16px">
                当前版本已启动
              </a-alert>
            </a-col>
          </a-row>

          <a-row :gutter="16">
            <a-col :span="24">
              <a-form-item label="版本说明" field="versionDescription">
                <a-textarea 
                  v-model="formData.versionDescription" 
                  placeholder="请输入版本说明（最大100字符）" 
                  :max-length="100"
                  show-word-limit
                  :auto-size="{ minRows: 2, maxRows: 4 }"
                />
              </a-form-item>
            </a-col>
          </a-row>
        </a-card>

        <!-- 报表信息 -->
        <a-card title="报表信息" class="form-section">
          <div v-for="(report, index) in formData.reports" :key="index" class="report-item">
            <a-row :gutter="16">
              <a-col :span="10">
                <a-form-item :label="`报表名称 ${index + 1}`" :field="`reports[${index}].name`">
                  <a-input v-model="report.name" placeholder="请输入报表名称" />
                </a-form-item>
              </a-col>
              <a-col :span="10">
                <a-form-item :label="`报表链接 ${index + 1}`" :field="`reports[${index}].url`">
                  <a-input v-model="report.url" placeholder="请输入报表链接" />
                </a-form-item>
              </a-col>
              <a-col :span="4">
                <a-button 
                  type="outline" 
                  status="danger" 
                  @click="removeReport(index)"
                  style="margin-top: 30px"
                  :disabled="formData.reports.length <= 1"
                >
                  删除
                </a-button>
              </a-col>
            </a-row>
          </div>
          
          <a-button type="outline" @click="addReport" class="add-report-btn">
            <template #icon><IconPlus /></template>
            添加报表
          </a-button>
        </a-card>
      </a-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { IconLeft, IconPlus } from '@arco-design/web-vue/es/icon'
import metricsMock from '@/mock/metrics'
import MonacoEditor from '@/components/MonacoEditor.vue'
import { userApi } from '@/api/community'
import type { User, QueryParams } from '@/types/community'

const route = useRoute()
const router = useRouter()
const formRef = ref()

// 页面滚动相关状态
const enableScroll = ref(true)

// 页面模式判断（兼容 params 与 query 的 mode）
const isEditMode = computed(() => {
  return (
    route.params.mode === 'edit' ||
    route.query.mode === 'edit' ||
    (route.params.id && route.params.id !== 'create')
  )
})
const isViewMode = computed(() => {
  return route.params.mode === 'view' || route.query.mode === 'view'
})
const isCreateMode = computed(() => !isEditMode.value && !isViewMode.value)

// 表单数据
const formData = reactive({
  name: '',
  code: '',
  category: '',
  scene: '',
  modules: [],
  businessOwner: '',
  technicalOwner: '',
  version: '1',
  versionDescription: '',
  versionStatus: '草稿',
  businessDefinition: '',
  useCase: '',
  computeTimeliness: '',
  
  technicalCaliber: '',
  technicalUsageNote: '',
  resultTable: '',
  reports: [{ name: '', url: '' }],
  queryCode: ''
})

// 表单验证规则
const getFormRules = () => {
  const nameValidator = {
    validator: (_: any, value: string) => {
      const len = (value || '').trim().length
      if (!len) return Promise.reject('请输入指标名称')
      if (len < 2 || len > 50) return Promise.reject('指标名称需在2-50字符之间')
      return Promise.resolve()
    }
  }
  const codeValidator = {
    validator: (_: any, value: string) => {
      const v = (value || '').trim()
      if (!v) return Promise.reject('请输入指标编码')
      if (v.length < 2 || v.length > 20) return Promise.reject('指标编码需在2-20字符之间')
      if (!/^[A-Za-z0-9_-]+$/.test(v)) return Promise.reject('指标编码仅支持英文、数字、下划线或中划线')
      return Promise.resolve()
    }
  }
  const businessDefValidator = {
    validator: (_: any, value: string) => {
      const len = (value || '').trim().length
      if (!len) return Promise.reject('请输入业务口径')
      if (len > 500) return Promise.reject('业务口径最大500字符')
      return Promise.resolve()
    }
  }
  const useCaseValidator = {
    validator: (_: any, value: string) => {
      const len = (value || '').trim().length
      if (len > 300) return Promise.reject('使用场景最大300字符')
      return Promise.resolve()
    }
  }
  const technicalCaliberValidator = {
    validator: (_: any, value: string) => {
      const len = (value || '').trim().length
      if (!len) return Promise.reject('请输入技术口径（SQL）')
      if (len > 1000) return Promise.reject('技术口径最大1000字符')
      return Promise.resolve()
    }
  }
  const technicalUsageValidator = {
    validator: (_: any, value: string) => {
      const len = (value || '').trim().length
      if (len > 300) return Promise.reject('技术口径使用说明最大300字符')
      return Promise.resolve()
    }
  }
  const resultTableValidator = {
    validator: (_: any, value: string) => {
      const len = (value || '').trim().length
      if (len > 50) return Promise.reject('结果表最大50字符')
      return Promise.resolve()
    }
  }
  const queryCodeValidator = {
    validator: (_: any, value: string) => {
      const len = (value || '').trim().length
      if (!len) return Promise.reject('请输入查询代码（SQL）')
      if (len > 500) return Promise.reject('查询代码最大500字符')
      return Promise.resolve()
    }
  }

  const baseRules: Record<string, any[]> = {
    name: [nameValidator],
    code: [codeValidator],
    category: [{ required: true, message: '请选择指标域' }],
    scene: [{ required: true, message: '请选择归属场景' }],
    version: [{ required: true, message: '版本号自动生成' }],
    businessDefinition: [businessDefValidator],
    useCase: [useCaseValidator],
    computeTimeliness: [{ required: true, message: '请选择计算时效' }],
    
    technicalCaliber: [technicalCaliberValidator],
    technicalUsageNote: [technicalUsageValidator],
    resultTable: [resultTableValidator],
    queryCode: [{
      validator: (_: any, value: string) => {
        const len = (value || '').trim().length
        if (len > 500) return Promise.reject('查询代码最大500字符')
        return Promise.resolve()
      }
    }],
    businessOwner: [{ required: true, message: '请选择业务负责人' }],
    technicalOwner: [{ required: true, message: '请选择技术负责人' }]
  }
  return baseRules
}

const formRules = computed(() => getFormRules())

// 方法
const goBack = () => {
  router.push('/management/asset-management/listing-management/metric-management')
}

const handleEdit = () => {
  router.push({
    name: 'MetricDetail',
    params: { id: route.params.id, mode: 'edit' }
  })
}

const scenesOptions = ref<Array<string>>(['留存域','转化域','业务规模','风控域'])
const onCreateScene = (val: string) => {
  const v = (val || '').trim()
  if (v && !scenesOptions.value.includes(v)) scenesOptions.value.push(v)
}
const moduleOptions = ref<Array<string>>(['客户画像','风险预警','营销转化'])

const addReport = () => {
  formData.reports.push({ name: '', url: '' })
}

const removeReport = (index: number) => {
  if (formData.reports.length > 1) {
    formData.reports.splice(index, 1)
  }
}

const handleSaveDraft = async () => {
  try {
    const valid = await formRef.value?.validate()
    if (valid) {
      if (!validateReports()) return
      formData.versionStatus = '草稿'
      // 调用保存草稿API
      console.log('保存草稿:', formData)
      Message.success('草稿保存成功')
    }
  } catch (error) {
    console.error('表单验证失败:', error)
  }
}

const handleSubmit = async () => {
  try {
    const valid = await formRef.value?.validate()
    if (valid) {
      if (!validateReports()) return
      // 创建或更新时保持草稿状态
      if (isCreateMode.value) {
        formData.versionStatus = '草稿'
      }
      
      if (isEditMode.value) {
        // 调用编辑API
        console.log('更新指标:', formData)
        Message.success('指标更新成功')
      } else {
        // 调用创建API
        console.log('创建指标:', formData)
        Message.success('指标创建成功')
      }
      
      // 返回列表页
      goBack()
    }
  } catch (error) {
    console.error('表单验证失败:', error)
  }
}

// 上线功能
const handleGoOnline = async () => {
  try {
    const valid = await formRef.value?.validate()
    if (valid) {
      if (!validateReports()) return
      formData.versionStatus = '启动'
      // 调用上线API
      console.log('指标上线:', formData)
      Message.success('指标已成功上线')
    }
  } catch (error) {
    console.error('表单验证失败:', error)
  }
}



// 加载指标数据
const loadMetricData = async (id: string) => {
  try {
    const endpoint = metricsMock.find((m) => m.url === '/api/metrics/:id')
    if (endpoint) {
      const res = endpoint.response({ url: `/api/metrics/${id}` })
      const metric = res.data
      if (metric) {
        Object.assign(formData, {
          name: metric.name,
          code: metric.code,
          category: metric.category,
          scene: metric.reportName || metric.businessDomain || '',
          businessOwner: metric.businessOwner || '',
          technicalOwner: metric.technicalOwner || '',
          businessDefinition: metric.businessDefinition || '',
          useCase: metric.useCase || '',
          computeTimeliness: metric.computeTimeliness || '',
          
          technicalCaliber: metric.processingLogic || '',
          technicalUsageNote: metric.technicalUsageNote || '',
          resultTable: metric.resultTable || '',
          reports: metric.reports || [{ name: '', url: '' }],
          queryCode: metric.queryCode || ''
        })
        const currentVersion = Array.isArray(metric.versions) ? metric.versions.length : 1
        formData.version = isViewMode.value ? String(currentVersion) : String(currentVersion + 1)
        formData.versionStatus = isViewMode.value ? '启动' : '草稿'
      }
    }
  } catch (error) {
    console.error('加载指标数据失败:', error)
    Message.error('加载指标数据失败')
  }
}

 

// 人员选择器数据源
const usersOptions = ref<Array<{ label: string; value: string }>>([])
const loadingUsers = ref(false)
const fetchUsers = async (keyword?: string) => {
  try {
    loadingUsers.value = true
    const params: QueryParams = {
      keyword: keyword || '',
      page: 1,
      pageSize: 10
    }
    const res = await userApi.getUsers(params)
    const items: User[] = (res?.data?.items) || []
    usersOptions.value = items.map(u => ({ label: u.displayName || u.username || u.id, value: String(u.id) }))
  } catch (e) {
    console.error('获取用户列表失败:', e)
  } finally {
    loadingUsers.value = false
  }
}

// 富文本插入工具
const businessDefinitionEditor = ref()
const useCaseEditor = ref()
const insertMarkdown = (target: 'business' | 'use') => {
  const snippet = '**加粗** _斜体_\n- 列表项1\n- 列表项2\n'
  if (target === 'business') {
    const next = (formData.businessDefinition || '') + (formData.businessDefinition ? '\n' : '') + snippet
    formData.businessDefinition = next.slice(0, 500)
  } else {
    const next = (formData.useCase || '') + (formData.useCase ? '\n' : '') + snippet
    formData.useCase = next.slice(0, 300)
  }
}

// 报表校验（非必填；如填写则校验URL格式与名称）
const validateReports = () => {
  if (!Array.isArray(formData.reports)) return true
  const urlRegex = /^https?:\/\//i
  for (const [idx, r] of formData.reports.entries()) {
    const name = (r.name || '').trim()
    const url = (r.url || '').trim()
    if (!name && !url) continue
    if (url && !urlRegex.test(url)) {
      Message.warning(`报表链接 ${idx + 1} 需以 http/https 开头`)
      return false
    }
    if (!name || !url) {
      Message.warning(`报表项 ${idx + 1} 名称与链接需同时填写或同时为空`)
      return false
    }
  }
  return true
}

// 初始化
const initByRoute = () => {}

onMounted(async () => {
  initByRoute()
  if (isEditMode.value || isViewMode.value) {
    await loadMetricData(route.params.id as string)
  }
  // 预加载一次用户列表（空关键字）
  fetchUsers('')
})
</script>

<style scoped>
.metric-detail-page {
  padding: 20px;
  min-height: calc(100vh - 40px);
  display: flex;
  flex-direction: column;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e5e6eb;
  flex-shrink: 0;
}

.page-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.form-container {
  flex: 1;
  overflow-y: auto;
  padding-right: 8px;
}

.form-container.scrollable {
  overflow-y: auto;
  scroll-behavior: smooth;
}

/* 自定义滚动条样式 */
.form-container::-webkit-scrollbar {
  width: 6px;
}

.form-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.form-container::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.form-container::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

.form-section {
  margin-bottom: 24px;
}

.report-item {
  margin-bottom: 16px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #e5e6eb;
}

.add-report-btn {
  width: 100%;
  margin-top: 16px;
  border-style: dashed;
}

/* 等宽输入样式（用于 SQL / 代码块） */
.monospace-textarea :deep(textarea) {
  font-family: SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  white-space: pre;
  line-height: 1.6;
}


</style>
