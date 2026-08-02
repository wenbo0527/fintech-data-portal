<template>
  <div class="audience-create">
    <!-- 面包屑导航 -->
    <a-breadcrumb class="breadcrumb">
      <a-breadcrumb-item>
        <router-link to="/marketing/exploration/customer-center">客户中心</router-link>
      </a-breadcrumb-item>
      <a-breadcrumb-item>
        <router-link to="/marketing/exploration/customer-center/audience-system/audience-management">人群管理</router-link>
      </a-breadcrumb-item>
      <a-breadcrumb-item>{{ getPageTitle() }}</a-breadcrumb-item>
    </a-breadcrumb>

    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <div class="page-title-row">
          <h2 class="page-title">{{ getPageTitle() }}</h2>
          <a-tag color="arcoblue" class="subject-badge">
            <template #icon><IconUser /></template>
            单主体圈选
          </a-tag>
        </div>
        <p class="page-description">{{ getPageDescription() }}</p>
      </div>
    </div>

    <!-- 基本信息 -->
    <div class="content-section">
      <a-card class="form-card">
        <template #title>
          <span class="card-title">基本信息</span>
        </template>
        <a-form :model="audienceForm.basic" layout="vertical" class="basic-form">
          <a-row :gutter="24">
            <a-col :span="8">
              <a-form-item label="人群名称" required>
                <a-input v-model="audienceForm.basic.name" placeholder="请输入人群名称" />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="更新频率">
                <a-select v-model="audienceForm.basic.updateFrequency" placeholder="请选择更新频率">
                  <a-option value="realtime">实时</a-option>
                  <a-option value="daily">每日</a-option>
                  <a-option value="weekly">每周</a-option>
                  <a-option value="monthly">每月</a-option>
                  <a-option value="manual">手动</a-option>
                </a-select>
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="有效期">
                <a-date-picker
                  v-model="audienceForm.basic.expireDate"
                  placeholder="请选择有效期"
                  style="width: 100%"
                />
              </a-form-item>
            </a-col>
          </a-row>
          <a-form-item label="人群描述">
            <a-textarea
              v-model="audienceForm.basic.description"
              placeholder="请输入人群描述"
              :rows="3"
            />
          </a-form-item>
        </a-form>
      </a-card>
    </div>

    <!-- 规则配置 -->
    <div class="content-section">
      <a-card class="form-card">
        <template #title>
          <span class="card-title">人群圈选规则</span>
        </template>
        <template #extra>
          <span class="card-hint">从下方「+ 添加条件组」开始，或点击示例快速填充</span>
        </template>
        <div class="rules-config-section">
          <CDPRuleBuilderForm
            ref="cdpRuleRef"
            :model-value="null"
            @update:model-value="(v) => (cdpRuleExposed = v)"
          />
        </div>
      </a-card>
    </div>

    <!-- 预览结果区域 -->
    <div v-if="showPreviewResult" class="preview-result-section">
      <a-card>
        <div class="preview-result-header">
          <h3>预计算结果</h3>
          <p class="section-description">根据当前配置的规则预计算出的人群规模和统计信息</p>
        </div>
        
        <div class="preview-result-content">
          <a-row :gutter="24">
            <a-col :span="6">
              <a-statistic title="预估人群规模" :value="previewStats.totalCount" suffix="人" />
            </a-col>
            <a-col :span="6">
              <a-statistic title="规则条件数" :value="previewStats.ruleCount" suffix="个" />
            </a-col>
            <a-col :span="6">
              <a-statistic title="数据覆盖率" :value="previewStats.coverage" suffix="%" :precision="2" />
            </a-col>
            <a-col :span="6">
              <a-statistic title="预计执行时间" :value="previewStats.estimatedTime" suffix="分钟" />
            </a-col>
          </a-row>
        </div>
      </a-card>
    </div>

    <!-- 页面底部按钮 -->
    <div class="page-footer">
      <a-space>
        <a-button @click="goBack">取消</a-button>
        <a-button 
          v-if="!showPreviewResult" 
          type="primary" 
          @click="preCalculate" 
          :loading="preCalculating"
          :disabled="!canPreCalculate"
        >
          预计算
        </a-button>
        <a-button 
          v-if="showPreviewResult" 
          type="primary" 
          @click="saveAudience" 
          :loading="saving"
        >
          {{ isEditMode ? '保存' : '创建' }}
        </a-button>
      </a-space>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { IconUser } from '@arco-design/web-vue/es/icon'
import CDPRuleBuilderForm from '@/components/task/CDPRuleBuilderForm.vue'

const router = useRouter()
const route = useRoute()

// 编辑状态
const isEditMode = ref(!!route.params.id)
const saving = ref(false)
const preCalculating = ref(false)
const showPreviewResult = ref(false)
const createMode = ref<'rule' | 'import'>('rule')

// 人群表单数据
// 架构调整：basic 字段由父级管理；cdpRule 由子组件 CDPRuleBuilderForm 完全自治，父级只在需要时通过 ref + getRuleData() 读取。
// 早期 v-model 实现导致 arco 内部 watch + 子组件 watch 产生 Maximum recursive updates，已移除 v-model。
const audienceForm = reactive({
  basic: {
    name: '',
    updateFrequency: 'daily',
    expireDate: null,
    description: ''
  },
})

// 子组件 ref：用于读取其内部当前规则数据
const cdpRuleRef = ref<InstanceType<typeof CDPRuleBuilderForm> | null>(null)

// 预览统计数据
const previewStats = reactive({
  totalCount: 0,
  ruleCount: 0,
  coverage: 0,
  estimatedTime: 0
})

// 页面标题和描述
const getPageTitle = () => {
  if (isEditMode.value) {
    return '编辑人群'
  }
  return '新建人群'
}

const getPageDescription = () => {
  if (isEditMode.value) {
    return '修改人群配置信息'
  }
  return '通过「标签」和「行为」组合条件，圈选出您的目标人群'
}

// 计算属性：是否可以进行预计算
// 改为依赖 cdpRuleRef（由子组件 expose 的快照）：仅在子组件变更时重算（通过 cdpRuleExposed 这条线）
const cdpRuleExposed = ref<any>(null) // 子组件每次 emit 时同步过来的快照

// 基本信息必须填写人群名称 + 规则模式至少有一个条件（用 emitted 快照检查）
const canPreCalculate = computed(() => {
  if (!audienceForm.basic.name) {
    return false
  }
  const rules = cdpRuleExposed.value
  if (createMode.value === 'rule') {
    if (!rules || !rules.ruleGroups || rules.ruleGroups.length === 0) return false
  }
  return true
})


// 预计算
const preCalculate = async () => {
  preCalculating.value = true
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // 更新预览统计
    previewStats.totalCount = Math.floor(Math.random() * 100000) + 10000
    previewStats.ruleCount = (cdpRuleExposed.value?.ruleGroups?.length) ?? 0
    previewStats.coverage = Math.floor(Math.random() * 30) + 70
    previewStats.estimatedTime = Math.floor(Math.random() * 10) + 1
    
    // 显示预览结果
    showPreviewResult.value = true
    
    Message.success('预计算完成')
  } catch (error) {
    Message.error('预计算失败')
  } finally {
    preCalculating.value = false
  }
}



// 保存人群
const saveAudience = async () => {
  // 基本信息校验
  if (!audienceForm.basic.name) {
    Message.warning('请填写人群名称')
    return
  }
  
  saving.value = true
  try {
    // 生成人群ID（如果是新建模式）
    const audienceId = isEditMode.value ? route.params.id : `AUD_${Date.now()}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`
    
    // 构建完整的人群数据（cdpRule 从子组件 ref 取最新快照）
    const audienceData = {
      id: audienceId,
      ...audienceForm.basic,
      cdpRule: cdpRuleExposed.value || cdpRuleRef.value?.getRuleData?.() || null,
      createUser: '当前用户',
      createTime: new Date().toISOString(),
      updateTime: new Date().toISOString(),
      status: 'active'
    }
    
    console.log('保存人群数据:', audienceData)
    
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    Message.success(isEditMode.value ? '人群更新成功' : '人群创建成功')
    
    // 返回人群管理页面
    goBack()
  } catch (error) {
    Message.error(isEditMode.value ? '人群更新失败' : '人群创建失败')
  } finally {
    saving.value = false
  }
}

// 返回人群管理页面
const goBack = () => {
  router.push({ name: 'audience-management' })
}
</script>

<style scoped>
/* 页面容器 */
.audience-create {
  padding: 20px;
  background: #f5f5f5;
  min-height: 100vh;
  max-height: 100vh;
  overflow-y: auto;
  overflow-x: hidden;
}

.card-hint {
  font-size: 12px;
  color: #999;
  font-weight: normal;
}

.breadcrumb {
  margin-bottom: 20px;
}

.breadcrumb :deep(.arco-breadcrumb-item-link) {
  color: #165dff;
  text-decoration: none;
}

.breadcrumb :deep(.arco-breadcrumb-item-link:hover) {
  text-decoration: underline;
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

.page-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.page-title-row .page-title {
  margin: 0;
}

.subject-badge {
  font-size: 12px;
  border-radius: 12px;
  padding: 2px 10px;
}

.subject-hint {
  color: #86909c;
  font-size: 12px;
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

.form-card {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.basic-form {
  padding: 20px;
}

/* 规则配置区域 */
.rules-config-section {
  padding: 20px;
}

.section-header {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e5e6eb;
}

.section-header h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: #1d2129;
}

.section-description {
  margin: 0;
  color: #86909c;
  font-size: 14px;
}

/* 导入配置区域 */
.import-config-section {
  padding: 20px;
}

.upload-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  border: 2px dashed #c9cdd4;
  border-radius: 8px;
  background: #f8f9fa;
  cursor: pointer;
  transition: all 0.3s ease;
}

.upload-area:hover {
  border-color: #165dff;
  background: #f0f5ff;
}

/* 预览区域 */
.preview-section {
  padding: 20px;
}

.preview-stats {
  margin: 24px 0;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
}

.preview-actions {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #e5e6eb;
}

/* 卡片标题样式 */
.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #1d2129;
}

.card-description {
  font-size: 14px;
  color: #86909c;
  margin-left: 8px;
}

.form-card {
  margin-bottom: 20px;
}

/* 统计卡片样式 */
.preview-stats :deep(.arco-statistic) {
  text-align: center;
}

.preview-stats :deep(.arco-statistic-title) {
  font-size: 14px;
  color: #86909c;
  margin-bottom: 8px;
}

.preview-stats :deep(.arco-statistic-value) {
  font-size: 24px;
  font-weight: 600;
  color: #1d2129;
}



/* 响应式设计 */
@media (max-width: 768px) {
  .audience-create {
    padding: 12px;
  }
  
  .page-header {
    flex-direction: column;
    gap: 16px;
  }
  
  .header-actions {
    width: 100%;
  }
  
  .basic-form,
  .rules-config-section,
  .import-config-section,
  .preview-section {
    padding: 16px;
  }
  
  .preview-stats {
    padding: 16px;
  }
  
  .upload-area {
    padding: 30px 15px;
  }
}

/* 预览结果区域 */
.preview-result-section {
  margin-top: 20px;
}

.preview-result-header {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e5e6eb;
}

.preview-result-header h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: #1d2129;
}

.preview-result-content {
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
}

/* 页面底部按钮 */
.page-footer {
  margin-top: 20px;
  padding: 20px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: flex-end;
}
</style>
