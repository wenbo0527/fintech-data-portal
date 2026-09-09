<template>
  <div class="creation-wizard">
    <a-steps :current="currentStep" type="navigation" size="small">
      <a-step title="选择目标" description="选择要监控的页面" />
      <a-step title="探索页面" description="预览和分析页面结构" />
      <a-step title="选择规则" description="从推荐中选择监控规则" />
      <a-step title="配置规则" description="设置规则参数和阈值" />
      <a-step title="设置调度" description="配置执行计划和告警" />
      <a-step title="完成" description="确认并创建监控任务" />
    </a-steps>

    <div class="wizard-content mt-6">
      <!-- Step 1: Select Target -->
      <div v-if="currentStep === 0" class="step-content">
        <h3 class="text-lg font-medium mb-4">选择监控目标</h3>
        <div class="mb-4">
          <a-alert v-if="selectedTarget" type="info" class="mb-4">
            <template #title>已选择目标</template>
            {{ getTargetDisplay(selectedTarget) }}
          </a-alert>
          <a-select 
            v-model="selectedTarget" 
            placeholder="请选择监控目标" 
            class="w-full"
            @change="onTargetSelected"
          >
            <a-option 
              v-for="target in targets" 
              :key="target.id" 
              :value="target.id"
            >
              {{ target.name }} - {{ target.url }}
            </a-option>
          </a-select>
        </div>
        <div class="target-preview" v-if="selectedTarget">
          <div class="bg-gray-50 p-4 rounded-lg">
            <h4 class="font-medium mb-2">目标信息</h4>
            <div class="space-y-2 text-sm">
              <div><strong>名称:</strong> {{ selectedTargetData?.name }}</div>
              <div><strong>URL:</strong> {{ selectedTargetData?.url }}</div>
              <div><strong>认证方式:</strong> {{ getAuthTypeLabel(selectedTargetData?.authType) }}</div>
              <div><strong>更新时间:</strong> {{ selectedTargetData?.updatedAt || '-' }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 2: Explore Page -->
      <div v-if="currentStep === 1" class="step-content">
        <h3 class="text-lg font-medium mb-4">探索页面结构</h3>
        <div class="mb-4">
          <a-button 
            type="primary" 
            @click="startExploration" 
            :loading="exploring"
            :disabled="!selectedTarget"
          >
            <template #icon><icon-search /></template>
            开始探索
          </a-button>
          <a-button @click="showExplorationResults" class="ml-2" v-if="explorationData">
            查看探索结果
          </a-button>
        </div>
        
        <div v-if="exploring" class="text-center py-8">
          <a-spin size="large" />
          <p class="mt-2 text-gray-600">正在探索页面结构...</p>
        </div>

        <div v-if="explorationData && !exploring" class="exploration-results">
          <a-alert type="success" class="mb-4">
            <template #title>探索完成</template>
            发现 {{ explorationData.elements?.length || 0 }} 个元素，{{ explorationData.networkRequests?.length || 0 }} 个网络请求
          </a-alert>
          
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <a-card title="页面元素">
              <div class="text-center">
                <div class="text-2xl font-bold text-blue-600">{{ explorationData.elements?.length || 0 }}</div>
                <div class="text-sm text-gray-600">个元素</div>
              </div>
            </a-card>
            <a-card title="网络请求">
              <div class="text-center">
                <div class="text-2xl font-bold text-green-600">{{ explorationData.networkRequests?.length || 0 }}</div>
                <div class="text-sm text-gray-600">个请求</div>
              </div>
            </a-card>
            <a-card title="关键元素">
              <div class="text-center">
                <div class="text-2xl font-bold text-purple-600">{{ keyElementsCount }}</div>
                <div class="text-sm text-gray-600">个关键</div>
              </div>
            </a-card>
          </div>
        </div>
      </div>

      <!-- Step 3: Select Rules -->
      <div v-if="currentStep === 2" class="step-content">
        <h3 class="text-lg font-medium mb-4">选择监控规则</h3>
        <div class="mb-4">
          <a-alert type="info" class="mb-4">
            <template #title>智能推荐</template>
            基于页面探索结果，我们为您推荐了以下监控规则
          </a-alert>
          
          <div class="rule-recommendations space-y-3">
            <div 
              v-for="(rec, index) in ruleRecommendations" 
              :key="index"
              class="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              :class="{ 'border-blue-300 bg-blue-50': selectedRecommendations.includes(rec) }"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center space-x-2 mb-2">
                    <a-tag :color="getConfidenceColor(rec.confidence)">
                      置信度 {{ Math.round(rec.confidence * 100) }}%
                    </a-tag>
                    <a-tag>{{ getRuleTypeLabel(rec.type) }}</a-tag>
                    <a-tag v-if="rec.difficulty" :color="getDifficultyColor(rec.difficulty)">
                      {{ getDifficultyLabel(rec.difficulty) }}
                    </a-tag>
                  </div>
                  <div class="font-medium text-gray-900">{{ rec.description }}</div>
                  <div class="text-sm text-gray-600 mt-1">{{ rec.reason }}</div>
                  <div v-if="rec.selector" class="text-xs text-gray-500 mt-1">
                    选择器: <code>{{ rec.selector }}</code>
                  </div>
                </div>
                <div class="flex items-center space-x-2">
                  <a-checkbox 
                    :model-value="selectedRecommendations.includes(rec)"
                    @change="(val: boolean) => toggleRecommendation(rec, val)"
                  />
                  <a-button size="small" @click="previewRecommendation(rec)">
                    预览
                  </a-button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="mt-4">
          <h4 class="font-medium mb-2">已选择规则 ({{ selectedRecommendations.length }})</h4>
          <div v-if="selectedRecommendations.length === 0" class="text-gray-500 text-sm">
            请选择至少一个监控规则
          </div>
          <div v-else class="space-y-2">
            <div v-for="rule in selectedRecommendations" :key="rule.id" class="text-sm">
              • {{ rule.description }}
            </div>
          </div>
        </div>
      </div>

      <!-- Step 4: Configure Rules -->
      <div v-if="currentStep === 3" class="step-content">
        <h3 class="text-lg font-medium mb-4">配置规则参数</h3>
        <div class="space-y-4">
          <div v-for="(rule, index) in configuredRules" :key="index" class="rule-config">
            <a-card :title="rule.description" size="small">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div v-if="rule.selector">
                  <label class="block text-sm font-medium mb-1">选择器</label>
                  <a-input v-model="rule.selector" placeholder="CSS选择器" />
                </div>
                <div v-if="rule.expect !== undefined">
                  <label class="block text-sm font-medium mb-1">期望值</label>
                  <a-input v-model="rule.expect" placeholder="期望值" />
                </div>
                <div v-if="rule.threshold !== undefined">
                  <label class="block text-sm font-medium mb-1">阈值</label>
                  <a-input-number v-model="rule.threshold" :min="0" class="w-full" />
                </div>
                <div v-if="rule.matchType">
                  <label class="block text-sm font-medium mb-1">匹配方式</label>
                  <a-select v-model="rule.matchType" class="w-full">
                    <a-option value="exact">精确匹配</a-option>
                    <a-option value="contains">包含匹配</a-option>
                    <a-option value="regex">正则匹配</a-option>
                  </a-select>
                </div>
              </div>
            </a-card>
          </div>
        </div>
      </div>

      <!-- Step 5: Set Schedule -->
      <div v-if="currentStep === 4" class="step-content">
        <h3 class="text-lg font-medium mb-4">设置调度计划</h3>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-2">执行频率</label>
            <a-radio-group v-model="scheduleConfig.frequency" direction="vertical">
              <a-radio value="5min">每5分钟</a-radio>
              <a-radio value="15min">每15分钟</a-radio>
              <a-radio value="30min">每30分钟</a-radio>
              <a-radio value="1hour">每小时</a-radio>
              <a-radio value="2hours">每2小时</a-radio>
              <a-radio value="4hours">每4小时</a-radio>
              <a-radio value="daily">每天</a-radio>
              <a-radio value="custom">自定义</a-radio>
            </a-radio-group>
            <div v-if="scheduleConfig.frequency === 'custom'" class="mt-2">
              <a-input v-model="scheduleConfig.cron" placeholder="Cron表达式，如: 0 */30 * * * *" />
            </div>
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-2">时区</label>
            <a-select v-model="scheduleConfig.timezone" class="w-full">
              <a-option value="UTC">UTC</a-option>
              <a-option value="Asia/Shanghai">Asia/Shanghai</a-option>
              <a-option value="Asia/Tokyo">Asia/Tokyo</a-option>
              <a-option value="America/New_York">America/New_York</a-option>
              <a-option value="Europe/London">Europe/London</a-option>
            </a-select>
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-2">最大并发数</label>
            <a-input-number v-model="scheduleConfig.maxConcurrency" :min="1" :max="10" class="w-full" />
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-2">重试策略</label>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label class="block text-xs text-gray-600 mb-1">最大重试次数</label>
                <a-input-number v-model="scheduleConfig.retryPolicy.maxRetries" :min="0" :max="5" class="w-full" />
              </div>
              <div>
                <label class="block text-xs text-gray-600 mb-1">退避策略</label>
                <a-select v-model="scheduleConfig.retryPolicy.backoff" class="w-full">
                  <a-option value="fixed">固定间隔</a-option>
                  <a-option value="exponential">指数退避</a-option>
                </a-select>
              </div>
              <div>
                <label class="block text-xs text-gray-600 mb-1">重试间隔（毫秒）</label>
                <a-input-number v-model="scheduleConfig.retryPolicy.delay" :min="1000" :max="60000" class="w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 6: Review and Complete -->
      <div v-if="currentStep === 5" class="step-content">
        <h3 class="text-lg font-medium mb-4">确认配置</h3>
        <div class="space-y-6">
          <a-card title="监控目标" size="small">
            <div class="text-sm space-y-1">
              <div><strong>名称:</strong> {{ selectedTargetData?.name }}</div>
              <div><strong>URL:</strong> {{ selectedTargetData?.url }}</div>
              <div><strong>认证:</strong> {{ getAuthTypeLabel(selectedTargetData?.authType) }}</div>
            </div>
          </a-card>
          
          <a-card title="监控规则" size="small">
            <div class="space-y-2">
              <div v-for="(rule, index) in configuredRules" :key="index" class="text-sm">
                <div class="flex justify-between">
                  <span>{{ rule.description }}</span>
                  <a-tag size="small">{{ getRuleTypeLabel(rule.type) }}</a-tag>
                </div>
              </div>
            </div>
          </a-card>
          
          <a-card title="调度配置" size="small">
            <div class="text-sm space-y-1">
              <div><strong>频率:</strong> {{ getFrequencyLabel(scheduleConfig.frequency) }}</div>
              <div><strong>时区:</strong> {{ scheduleConfig.timezone }}</div>
              <div><strong>并发:</strong> {{ scheduleConfig.maxConcurrency }}</div>
              <div><strong>重试:</strong> {{ scheduleConfig.retryPolicy.maxRetries }}次</div>
            </div>
          </a-card>
        </div>
        
        <div class="mt-6 p-4 bg-blue-50 rounded-lg">
          <div class="flex items-start space-x-2">
            <icon-info-circle class="text-blue-600 mt-0.5" />
            <div class="text-sm text-blue-800">
              <div class="font-medium">即将创建以下资源：</div>
              <ul class="mt-1 space-y-1">
                <li>• 监控规则：{{ configuredRules.length }} 条</li>
                <li>• 调度计划：1 个</li>
                <li>• 预计执行：{{ getNextExecutionTime() }}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Navigation Buttons -->
    <div class="wizard-navigation mt-6 flex justify-between">
      <a-button @click="previousStep" :disabled="currentStep === 0">
        <template #icon><icon-arrow-left /></template>
        上一步
      </a-button>
      
      <div class="flex space-x-2">
        <a-button @click="cancelWizard">取消</a-button>
        <a-button 
          type="primary" 
          @click="nextStep" 
          :disabled="!canProceedToNextStep"
        >
          {{ currentStep === 5 ? '完成创建' : '下一步' }}
          <template #icon><icon-arrow-right /></template>
        </a-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useMonitorStore } from '@/store/monitor'
import { apiService } from '@/services/api'
import type { MonitorTarget, MonitorRule, MonitorSchedule } from '@/types/monitor'
import {
  IconArrowLeft,
  IconArrowRight,
  IconSearch,
  IconInfoCircle
} from '@arco-design/web-vue/es/icon'

const router = useRouter()
const store = useMonitorStore()

// State
const currentStep = ref(0)
const selectedTarget = ref('')
const exploring = ref(false)
const explorationData = ref<any>(null)
const selectedRecommendations = ref<any[]>([])
const configuredRules = ref<any[]>([])
const scheduleConfig = ref<{
  frequency: string
  cron: string
  timezone: string
  maxConcurrency: number
  retryPolicy: {
    maxRetries: number
    backoff: 'fixed' | 'exponential'
    delay: number
  }
}>({
  frequency: '1hour',
  cron: '',
  timezone: 'Asia/Shanghai',
  maxConcurrency: 1,
  retryPolicy: {
    maxRetries: 2,
    backoff: 'exponential',
    delay: 2000
  }
})

// Computed
const targets = computed(() => store.targets)
const selectedTargetData = computed(() => 
  targets.value.find(t => t.id === selectedTarget.value)
)

const keyElementsCount = computed(() => {
  if (!explorationData.value?.elements) return 0
  const elements = explorationData.value.elements
  return elements.filter((el: any) => 
    el.tagName === 'table' || 
    ['h1', 'h2', 'h3'].includes(el.tagName) ||
    el.attributes?.class?.includes('chart') ||
    el.isClickable
  ).length
})

const ruleRecommendations = computed(() => {
  if (!explorationData.value) return []
  return generateRuleRecommendations(explorationData.value)
})

const canProceedToNextStep = computed(() => {
  switch (currentStep.value) {
    case 0: // Select Target
      return !!selectedTarget.value
    case 1: // Explore Page
      return !!explorationData.value
    case 2: // Select Rules
      return selectedRecommendations.value.length > 0
    case 3: // Configure Rules
      return configuredRules.value.length > 0
    case 4: // Set Schedule
      return true // Always allow to proceed
    case 5: // Review
      return true // Always allow to complete
    default:
      return false
  }
})

// Methods
const getAuthTypeLabel = (type: string) => {
  const labels = {
    password: '密码认证',
    sso: 'SSO认证',
    cookie: 'Cookie认证',
    script: '自定义脚本'
  }
  return labels[type as keyof typeof labels] || type
}

const getRuleTypeLabel = (type: string) => {
  const labels = {
    exists: '存在性检查',
    visible: '可见性检查',
    textMatch: '文本匹配',
    nonEmpty: '非空检查',
    tableRows: '表格行数',
    minPerf: '最小性能',
    maxPerf: '最大性能',
    networkOk: '网络状态',
    screenshotDiff: '截图对比'
  }
  return labels[type as keyof typeof labels] || type
}

const getConfidenceColor = (confidence: number) => {
  if (confidence >= 0.8) return 'green'
  if (confidence >= 0.6) return 'orange'
  return 'red'
}

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case 'easy': return 'green'
    case 'medium': return 'orange'
    case 'hard': return 'red'
    default: return 'blue'
  }
}

const getDifficultyLabel = (difficulty: string) => {
  const labels = {
    easy: '简单',
    medium: '中等',
    hard: '困难'
  }
  return labels[difficulty as keyof typeof labels] || '未知'
}

const getTargetDisplay = (targetId: string) => {
  const target = targets.value.find(t => t.id === targetId)
  return target ? `${target.name} - ${target.url}` : ''
}

const getFrequencyLabel = (frequency: string) => {
  const labels = {
    '5min': '每5分钟',
    '15min': '每15分钟',
    '30min': '每30分钟',
    '1hour': '每小时',
    '2hours': '每2小时',
    '4hours': '每4小时',
    'daily': '每天',
    'custom': '自定义'
  }
  return labels[frequency as keyof typeof labels] || frequency
}

const getNextExecutionTime = () => {
  const now = new Date()
  let nextTime = new Date(now)
  
  switch (scheduleConfig.value.frequency) {
    case '5min':
      nextTime.setMinutes(now.getMinutes() + 5)
      break
    case '15min':
      nextTime.setMinutes(now.getMinutes() + 15)
      break
    case '30min':
      nextTime.setMinutes(now.getMinutes() + 30)
      break
    case '1hour':
      nextTime.setHours(now.getHours() + 1)
      break
    case '2hours':
      nextTime.setHours(now.getHours() + 2)
      break
    case '4hours':
      nextTime.setHours(now.getHours() + 4)
      break
    case 'daily':
      nextTime.setDate(now.getDate() + 1)
      break
    default:
      nextTime.setHours(now.getHours() + 1)
  }
  
  return nextTime.toLocaleString('zh-CN')
}

const onTargetSelected = () => {
  // Reset exploration data when target changes
  explorationData.value = null
  selectedRecommendations.value = []
  configuredRules.value = []
}

const startExploration = async () => {
  if (!selectedTarget.value) return
  
  exploring.value = true
  try {
    // Simulate exploration (in real implementation, this would call the API)
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    explorationData.value = {
      elements: [
        { selector: '.ant-table', tagName: 'table', textContent: '数据表格', isVisible: true, isClickable: false },
        { selector: 'h1', tagName: 'h1', textContent: '销售报表', isVisible: true, isClickable: false },
        { selector: '.chart-container', tagName: 'div', textContent: '图表区域', isVisible: true, isClickable: false }
      ],
      networkRequests: [
        { url: '/api/sales/data', method: 'GET', status: 200, type: 'xhr', responseTime: 245 },
        { url: '/api/charts/config', method: 'GET', status: 200, type: 'xhr', responseTime: 189 }
      ],
      screenshots: ['screenshot1.png'],
      recommendations: generateRuleRecommendations({
        elements: [
          { selector: '.ant-table', tagName: 'table', textContent: '数据表格', isVisible: true, isClickable: false },
          { selector: 'h1', tagName: 'h1', textContent: '销售报表', isVisible: true, isClickable: false },
          { selector: '.chart-container', tagName: 'div', textContent: '图表区域', isVisible: true, isClickable: false }
        ],
        networkRequests: [
          { url: '/api/sales/data', method: 'GET', status: 200, type: 'xhr', responseTime: 245 },
          { url: '/api/charts/config', method: 'GET', status: 200, type: 'xhr', responseTime: 189 }
        ]
      })
    }
  } catch (error) {
    console.error('探索失败:', error)
  } finally {
    exploring.value = false
  }
}

const generateRuleRecommendations = (data: any) => {
  const recommendations = []
  const elements = data.elements || []
  const networkRequests = data.networkRequests || []
  
  // Table recommendations
  const tables = elements.filter((el: any) => el.tagName === 'table')
  if (tables.length > 0) {
    recommendations.push({
      id: 'table-exists',
      type: 'exists',
      selector: tables[0].selector,
      description: `表格存在性检查 (${tables.length}个表格)`,
      confidence: 0.9,
      reason: '检测到表格元素，建议验证数据存在',
      difficulty: 'easy'
    })
  }
  
  // Heading recommendations
  const headings = elements.filter((el: any) => ['h1', 'h2', 'h3'].includes(el.tagName))
  if (headings.length > 0) {
    recommendations.push({
      id: 'heading-text',
      type: 'textMatch',
      selector: headings[0].selector,
      expect: headings[0].textContent || '',
      description: `页面标题检查: ${headings[0].textContent}`,
      confidence: 0.85,
      reason: '检测到页面标题，建议验证关键文本',
      difficulty: 'easy'
    })
  }
  
  // Network performance recommendations
  const apiRequests = networkRequests.filter((req: any) => req.type === 'xhr' || req.type === 'fetch')
  if (apiRequests.length > 0) {
    recommendations.push({
      id: 'network-status',
      type: 'networkOk',
      description: 'API请求状态检查',
      confidence: 0.85,
      reason: '检测到API请求，建议验证接口可用性',
      difficulty: 'easy'
    })
  }
  
  return recommendations
}

const showExplorationResults = () => {
  // Navigate to exploration page with current data
  router.push({
    name: 'Explore',
    query: { targetId: selectedTarget.value }
  })
}

const toggleRecommendation = (recommendation: any, selected: boolean) => {
  if (selected) {
    selectedRecommendations.value.push(recommendation)
  } else {
    selectedRecommendations.value = selectedRecommendations.value.filter(r => r.id !== recommendation.id)
  }
}

const previewRecommendation = (recommendation: any) => {
  // Show preview dialog or navigate to preview
  console.log('预览推荐:', recommendation)
}

const previousStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

const nextStep = async () => {
  if (currentStep.value === 5) {
    // Final step - create everything
    await createMonitoringSetup()
  } else {
    // Prepare data for next step
    if (currentStep.value === 2) {
      // Convert selected recommendations to configured rules
      configuredRules.value = selectedRecommendations.value.map(rec => ({
        ...rec,
        enabled: true,
        targetId: selectedTarget.value
      }))
    }
    currentStep.value++
  }
}

const createMonitoringSetup = async () => {
  try {
    // Create rules
    const createdRules = []
    for (const rule of configuredRules.value) {
      const newRule = await store.addRule({
        targetId: selectedTarget.value,
        type: rule.type,
        selector: rule.selector,
        expect: rule.expect,
        threshold: rule.threshold,
        enabled: true
      })
      createdRules.push(newRule)
    }
    
    // Create schedule
    const cronExpression = scheduleConfig.value.frequency === 'custom' 
      ? scheduleConfig.value.cron 
      : getCronFromFrequency(scheduleConfig.value.frequency)
    
    await store.addSchedule({
      targetId: selectedTarget.value,
      cron: cronExpression,
      timezone: scheduleConfig.value.timezone,
      maxConcurrency: scheduleConfig.value.maxConcurrency,
      retryPolicy: scheduleConfig.value.retryPolicy,
      enabled: true
    })
    
    // Navigate to success page or show success message
    router.push('/targets')
    
  } catch (error) {
    console.error('创建监控配置失败:', error)
  }
}

const getCronFromFrequency = (frequency: string): string => {
  const cronMap: Record<string, string> = {
    '5min': '0 */5 * * * *',
    '15min': '0 */15 * * * *',
    '30min': '0 */30 * * * *',
    '1hour': '0 0 * * * *',
    '2hours': '0 0 */2 * * *',
    '4hours': '0 0 */4 * * *',
    'daily': '0 0 0 * * *'
  }
  return cronMap[frequency] || '0 0 * * * *'
}

const cancelWizard = () => {
  if (confirm('确定要取消创建吗？所有配置将丢失。')) {
    router.push('/targets')
  }
}

onMounted(() => {
  // Load targets if not already loaded
  if (store.targets.length === 0) {
    store.loadTargets()
  }
})
</script>

<style scoped>
.creation-wizard {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.step-content {
  min-height: 400px;
}

.wizard-content {
  background: white;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.rule-config {
  margin-bottom: 16px;
}

.rule-recommendations {
  max-height: 400px;
  overflow-y: auto;
}

.target-preview {
  margin-top: 16px;
}

.exploration-results {
  margin-top: 16px;
}

.wizard-navigation {
  border-top: 1px solid #e5e7eb;
  padding-top: 16px;
}
</style>