<template>
  <div class="metric-detail">
    <!-- 页面头部 -->
    <div class="page-header">
      <!-- 面包屑导航 -->
      <a-breadcrumb class="breadcrumb">
        <a-breadcrumb-item>数据资产</a-breadcrumb-item>
        <a-breadcrumb-item>指标地图</a-breadcrumb-item>
        <a-breadcrumb-item>资产详情</a-breadcrumb-item>
      </a-breadcrumb>
      
      <!-- 指标标题和操作 -->
      <div class="header-content">
        <div class="title-section">
          <h1 class="metric-title">{{ metricDetail?.name }}</h1>
          <div class="metric-meta"></div>
          <a-descriptions :column="2" class="header-basic-info" :label-style="{ 'font-weight': 600 }">
            <a-descriptions-item label="指标编码">{{ metricDetail?.code }}</a-descriptions-item>
            <a-descriptions-item label="指标域">
              <a-tag>{{ domainLabel || '未设置' }}</a-tag>
            </a-descriptions-item>
            <a-descriptions-item label="归属场景">
              <a-tag color="purple">{{ sceneLabel || '未设置' }}</a-tag>
            </a-descriptions-item>
            <a-descriptions-item label="计算时效">
              <a-tag color="blue">{{ metricDetail?.statisticalPeriod }}</a-tag>
            </a-descriptions-item>
            <a-descriptions-item label="业务负责人">{{ metricDetail?.businessOwner || '未设置' }}</a-descriptions-item>
            <a-descriptions-item label="技术负责人">{{ metricDetail?.technicalOwner || '未设置' }}</a-descriptions-item>
          </a-descriptions>
        </div>
        
        <div class="action-buttons">
          <a-button @click="goBack">
            <template #icon><IconArrowLeft /></template>
            返回地图
          </a-button>
          <a-button 
            :type="metricDetail?.isFavorite ? 'primary' : 'outline'"
            @click="toggleFavorite"
          >
            <template #icon>
              <IconHeartFill v-if="metricDetail?.isFavorite" />
              <IconHeart v-else />
            </template>
            {{ metricDetail?.isFavorite ? '已关注' : '关注' }}
          </a-button>
          <a-button type="primary" @click="shareVisible = true">
            <template #icon><IconShareAlt /></template>
            分享资产
          </a-button>
        </div>
      </div>
    </div>

    <!-- 详情内容 -->
    <div class="detail-content" v-if="!loading">
      <div class="content-layout">
        
        
        <!-- 右侧内容区域 -->
        <div class="main-content">
          
          <a-tabs class="detail-tabs" v-model:active-key="activeTab">
            <a-tab-pane key="caliber" title="指标口径">
          <!-- 业务定义 -->
          <a-card id="business-definition" class="detail-card">
            <template #title>
              <span class="card-title">业务口径</span>
            </template>
            <a-descriptions :column="1" :label-style="{ 'font-weight': 600 }">
              <a-descriptions-item label="业务口径">
                <div class="description-content">{{ metricDetail?.businessDefinition || '暂无业务定义' }}</div>
              </a-descriptions-item>
              <a-descriptions-item label="使用场景" v-if="metricDetail?.useCase">
                <div class="description-content">{{ metricDetail?.useCase }}</div>
              </a-descriptions-item>
            </a-descriptions>
          </a-card>
          
          <!-- 技术逻辑 -->
          <a-card id="technical-logic" class="detail-card">
            <template #title>
              <span class="card-title">技术口径</span>
            </template>
            <a-descriptions :column="2" :label-style="{ 'font-weight': 600 }">
              <a-descriptions-item label="技术口径使用说明" :span="2">
                {{ metricDetail?.technicalUsageNote || metricDetail?.fieldDescription || '暂无' }}
              </a-descriptions-item>
            </a-descriptions>

            <!-- 加工逻辑展示（不依赖 sqlDetails） -->
            <div class="sql-block" v-if="metricDetail?.processingLogic">
              <div class="sql-block-header">
                <span class="sql-title">加工逻辑</span>
                <div class="sql-actions">
                  <a-button 
                    type="text" 
                    size="small" 
                    @click="toggleSqlExpand('processingLogic')"
                    :icon="sqlExpanded.processingLogic ? 'icon-up' : 'icon-down'"
                  >
                    {{ sqlExpanded.processingLogic ? '收起' : '展开' }}
                  </a-button>
                  <a-button 
                    type="text" 
                    size="small" 
                    @click="copySql(metricDetail.processingLogic)"
                    icon="icon-copy"
                  >
                    复制
                  </a-button>
                </div>
              </div>
              <div class="sql-content" v-if="sqlExpanded.processingLogic">
                <MonacoEditor
                  :model-value="metricDetail.processingLogic"
                  language="sql"
                  :readonly="false"
                  :auto-height="true"
                  :min-height="120"
                />
              </div>
            </div>
            
            <!-- SQL详情展示区域 -->
            <div class="sql-section" v-if="metricDetail?.sqlDetails">
              <div class="sql-header">
                <h4>技术口径详情</h4>
              </div>
              
              <!-- 主要SQL -->
              <div class="sql-block">
                <div class="sql-block-header">
                  <span class="sql-title">技术口径</span>
                  <div class="sql-actions">
                    <a-button 
                      type="text" 
                      size="small" 
                      @click="toggleSqlExpand('mainSql')"
                      :icon="sqlExpanded.mainSql ? 'icon-up' : 'icon-down'"
                    >
                      {{ sqlExpanded.mainSql ? '收起' : '展开' }}
                    </a-button>
                    <a-button 
                      type="text" 
                      size="small" 
                      @click="copySql(metricDetail.sqlDetails.mainSql)"
                      icon="icon-copy"
                    >
                      复制
                    </a-button>
                  </div>
                </div>
                <div class="sql-content" v-if="sqlExpanded.mainSql">
                  <MonacoEditor
                    :model-value="metricDetail.sqlDetails.mainSql"
                    language="sql"
                    :readonly="false"
                    :auto-height="true"
                    :min-height="120"
                  />
                </div>
              </div>
              
              <!-- 加工逻辑SQL -->
              <div class="sql-block" v-if="metricDetail?.processingLogic">
                <div class="sql-block-header">
                  <span class="sql-title">加工逻辑</span>
                  <div class="sql-actions">
                    <a-button 
                      type="text" 
                      size="small" 
                      @click="toggleSqlExpand('processingLogic')"
                      :icon="sqlExpanded.processingLogic ? 'icon-up' : 'icon-down'"
                    >
                      {{ sqlExpanded.processingLogic ? '收起' : '展开' }}
                    </a-button>
                    <a-button 
                      type="text" 
                      size="small" 
                      @click="copySql(metricDetail.processingLogic)"
                      icon="icon-copy"
                    >
                      复制
                    </a-button>
                  </div>
                </div>
                <div class="sql-content" v-if="sqlExpanded.processingLogic">
                  <MonacoEditor
                    :model-value="metricDetail.processingLogic"
                    language="sql"
                    :readonly="false"
                    :auto-height="true"
                    :min-height="120"
                  />
                </div>
              </div>
              
              <!-- 查询代码 -->
              <div class="sql-block" v-if="metricDetail?.queryCode">
                <div class="sql-block-header">
                  <span class="sql-title">查询代码</span>
                  <div class="sql-actions">
                    <a-button 
                      type="text" 
                      size="small" 
                      @click="toggleSqlExpand('queryCode')"
                      :icon="sqlExpanded.queryCode ? 'icon-up' : 'icon-down'"
                    >
                      {{ sqlExpanded.queryCode ? '收起' : '展开' }}
                    </a-button>
                    <a-button 
                      type="text" 
                      size="small" 
                      @click="copySql(metricDetail.queryCode)"
                      icon="icon-copy"
                    >
                      复制
                    </a-button>
                  </div>
                </div>
                <div class="sql-content" v-if="sqlExpanded.queryCode">
                  <MonacoEditor
                    :model-value="metricDetail.queryCode"
                    language="sql"
                    :readonly="false"
                    :auto-height="true"
                    :min-height="120"
                  />
                </div>
              </div>
              
              <!-- 数据源信息 -->
              <div class="sql-info-section">
                <div class="info-row">
                  <div class="info-label">数据源:</div>
                  <div class="info-content">
                    <a-tag v-for="source in metricDetail.sqlDetails.dataSources" :key="source" class="source-tag">
                      {{ source }}
                    </a-tag>
                  </div>
                </div>
                
                <div class="info-row">
                  <div class="info-label">输出字段:</div>
                  <div class="info-content">
                    <div class="field-list">
                      <div v-for="field in metricDetail.sqlDetails.outputFields" :key="field" class="field-item">
                        {{ field }}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div class="info-row">
                  <div class="info-label">依赖表:</div>
                  <div class="info-content">
                    <a-tag v-for="dep in metricDetail.sqlDetails.dependencies" :key="dep" class="dependency-tag">
                      {{ dep }}
                    </a-tag>
                  </div>
                </div>
              </div>
            </div>
          </a-card>
            </a-tab-pane>
            <a-tab-pane key="query" title="指标查询">
          <!-- 查询代码 -->
          <a-card id="query-code" class="detail-card">
            <template #title>
              <span class="card-title">查询代码</span>
            </template>
            <!-- 查询代码展示（不依赖 sqlDetails） -->
            <div class="sql-block" v-if="metricDetail?.queryCode">
              <div class="sql-block-header">
                <span class="sql-title">查询代码</span>
                <div class="sql-actions">
                  <a-button 
                    type="text" 
                    size="small" 
                    @click="toggleSqlExpand('queryCode')"
                    :icon="sqlExpanded.queryCode ? 'icon-up' : 'icon-down'"
                  >
                    {{ sqlExpanded.queryCode ? '收起' : '展开' }}
                  </a-button>
                  <a-button 
                    type="text" 
                    size="small" 
                    @click="copySql(metricDetail.queryCode)"
                    icon="icon-copy"
                  >
                    复制
                  </a-button>
                </div>
              </div>
              <div class="sql-content" v-if="sqlExpanded.queryCode">
                <MonacoEditor
                  :model-value="metricDetail.queryCode"
                  language="sql"
                  :readonly="false"
                  :auto-height="true"
                  :min-height="120"
                />
              </div>
            </div>
          </a-card>
          
          <a-card id="report-info" class="detail-card" v-if="reportsList.length">
            <template #title>
              <span class="card-title">归属场景</span>
            </template>
            <a-descriptions :column="1" :label-style="{ 'font-weight': 600 }">
              <a-descriptions-item label="报表">
                <div class="description-content report-links">
                  <span v-for="r in reportsList" :key="(r.name||'')+(r.url||'')" class="report-link" @click="openReport(r.url)">{{ r.name }}</span>
                </div>
              </a-descriptions-item>
            </a-descriptions>
          </a-card>
            </a-tab-pane>
            <a-tab-pane key="history" title="历史版本" v-if="metricDetail?.versions?.length">
          <!-- 版本历史 -->
          <a-card id="version-history" class="detail-card" v-if="metricDetail?.versions?.length">
            <template #title>
              <span class="card-title">版本历史</span>
            </template>
            <a-timeline class="version-timeline">
              <a-timeline-item
                v-for="(version, index) in metricDetail?.versions"
                :key="index"
              >
                <div class="version-item">
                  <span class="version-date">{{ version.date }}</span>
                  <span class="version-description">{{ version.description }}</span>
                </div>
              </a-timeline-item>
            </a-timeline>
          </a-card>
            </a-tab-pane>
          </a-tabs>
        </div>
      </div>

      
    </div>

    <!-- 加载状态 -->
    <div v-else class="loading-container">
      <a-spin :size="32" />
    </div>

    <!-- 分享弹窗 -->
    <a-modal v-model:visible="shareVisible" title="分享数据资产" :footer="false">
      <div class="share-content">
        <p class="share-description">分享这个数据资产给同事，让更多人了解其业务价值</p>
        <div class="share-info">
          <p><strong>资产名称：</strong>{{ metricDetail?.name }}</p>
          <p><strong>资产类型：</strong>{{ metricTypeText }}</p>
        </div>
        <p class="share-label">分享链接：</p>
        <a-input-group>
          <a-input 
            :value="shareLink"
            readonly 
          />
          <a-button type="primary" @click="copyShareLink">复制链接</a-button>
        </a-input-group>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  IconArrowLeft,
  IconHeart,
  IconHeartFill,
  IconShareAlt
} from '@arco-design/web-vue/es/icon'
import { Message } from '@arco-design/web-vue'
import { MetricType, type MetricItem } from '@/types/metrics'
import MonacoEditor from '@/components/MonacoEditor.vue'

// 路由
const route = useRoute()
const router = useRouter()

// 响应式数据
const loading = ref(true)
const metricDetail = ref<MetricItem | null>(null)
const relatedMetrics = ref<MetricItem[]>([])
const shareVisible = ref(false)
const activeTab = ref<'caliber' | 'query' | 'history'>('caliber')
const showShareModal = ref(false)
const shareLink = computed(() => {
  const origin = typeof window !== 'undefined' && window.location ? window.location.origin : ''
  const id = metricDetail.value?.id || ''
  const type = metricDetail.value?.type || ''
  return `${origin}/discovery/metrics-map/detail/${id}?type=${type}`
})

// SQL展开状态管理
const sqlExpanded = ref({
  mainSql: true,
  processingLogic: true,
  queryCode: false
})

const editorFixedHeight = ref('400px')
const updateFixedHeight = () => {
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  const h = Math.max(180, Math.floor(vh * 0.55))
  editorFixedHeight.value = `${h}px`
}
onMounted(() => {
  updateFixedHeight()
  window.addEventListener('resize', updateFixedHeight)
})
onUnmounted(() => {
  window.removeEventListener('resize', updateFixedHeight)
})


// 计算属性
const metricType = computed(() => {
  return metricDetail.value?.category || 'unknown'
})

const metricTypeText = computed(() => {
  const typeMap: Record<'business_core' | 'regulatory', string> = {
    business_core: '业务核心指标',
    regulatory: '监管指标'
  }
  const type = metricDetail.value?.type as 'business_core' | 'regulatory' | undefined
  return type ? typeMap[type] : '未知类型'
})

const metricTypeColor = computed(() => {
  const colorMap: Record<'business_core' | 'regulatory', string> = {
    business_core: 'blue',
    regulatory: 'orange'
  }
  const type = metricDetail.value?.type as 'business_core' | 'regulatory' | undefined
  return type ? colorMap[type] : 'gray'
})

const domainLabel = computed(() => {
  return metricDetail.value?.category || metricDetail.value?.regulatoryCategory || ''
})

const sceneLabel = computed(() => {
  return metricDetail.value?.scene || metricDetail.value?.businessDomain || metricDetail.value?.reportName || ''
})

const reportsList = computed(() => {
  const rawList = metricDetail.value?.reports
  if (Array.isArray(rawList)) {
    return rawList.filter((r: any) => (r?.name || '').trim()).map((r: any) => ({ name: String(r.name).trim(), url: String(r.url || '').trim() }))
  }
  const raw = String(metricDetail.value?.reportInfo || '').trim()
  if (!raw) {return []}
  return raw.split(/\n|、|・|,|;|，|；/).map(s => ({ name: s.trim(), url: '' })).filter(v => v.name)
})

const openReport = (url: string) => {
  const u = String(url || '').trim()
  if (!u) {return}
  if (/^https?:\/\//i.test(u)) {
    window.open(u, '_blank')
  } else {
    router.push(u)
  }
}

// 方法
const goBack = () => {
  // 返回指标地图页面
  router.push('/discovery/metrics-map')
}

// SQL展开/收起功能
const toggleSqlExpand = (sqlType: string) => {
  sqlExpanded.value[sqlType] = !sqlExpanded.value[sqlType]
}

// SQL复制功能
const copySql = async (sqlContent: string) => {
  try {
    await navigator.clipboard.writeText(sqlContent)
    // 这里可以添加成功提示

  } catch (error) {

    // 降级方案：使用传统方法复制
    const textArea = document.createElement('textarea')
    textArea.value = sqlContent
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)

  }
}

const fetchMetricDetail = async () => {
  try {
    loading.value = true
    
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 800))
    
    // 从mock数据中获取对应的指标数据
    const mockMetrics = [
      {
        id: '1',
        type: 'business_core' as MetricType,
        name: 'DAU',
        category: '用户指标',
        businessDomain: '留存域',
        businessDefinition: '日活跃用户数',
        owner: '张三',
        code: 'USER_001',
        useCase: '用于监控产品的日常活跃情况，是产品健康度的重要指标',
        statisticalPeriod: '日更新',
        sourceTable: 'dwd.user_login_detail',
        processingLogic: 'SELECT dt, COUNT(DISTINCT user_id) as dau\nFROM dwd.user_login_detail\nWHERE dt = ${date}\nGROUP BY dt',
        fieldDescription: 'user_id: 用户唯一标识, dt: 统计日期',
        reportInfo: '用户分析/核心指标',
        storageLocation: 'adm.ads_user_core_metrics',
        queryCode: 'SELECT dau FROM adm.ads_user_core_metrics WHERE dt = ${date}',
        versions: [
          { date: '2024-01-01', description: '指标创建' },
          { date: '2024-01-15', description: '优化统计逻辑，排除测试账号' }
        ],
        businessOwner: '李四',
        technicalOwner: '王五',
        isFavorite: true
      },
      {
        id: '2',
        type: 'regulatory' as MetricType,
        name: '当日风控授信通过笔数',
        category: '风险指标',
        regulatoryCategory: '信贷风险监管',
        reportName: '信贷资产质量报告',
        businessDomain: '业务规模',
        businessDefinition: '授信申请环节中风控审批结果为通过的笔数',
        owner: '王志雄',
        code: 'A00043',
        useCase: '',
        statisticalPeriod: '离线T+2',
        sourceTable: 'a_frms_deparment_sx_his_full',
        processingLogic: `
WITH base AS (
  SELECT
    flow_id,
    apply_id,
    customer_id,
    product_code,
    result,
    decision_stage,
    decision_time,
    CASE WHEN remark LIKE '%测试%' OR remark LIKE '%test%' THEN 1 ELSE 0 END AS is_test,
    data_dt
  FROM a_frms_deparment_sx_his_full
  WHERE data_dt = \${date}
),
dedup AS (
  SELECT
    flow_id,
    apply_id,
    customer_id,
    product_code,
    result,
    decision_stage,
    decision_time,
    is_test,
    data_dt,
    ROW_NUMBER() OVER (PARTITION BY flow_id ORDER BY decision_time DESC) AS rn
  FROM base
),
latest AS (
  SELECT * FROM dedup WHERE rn = 1
),
valid_app AS (
  SELECT l.*
  FROM latest l
  LEFT JOIN dim_customer d ON l.customer_id = d.customer_id
  LEFT JOIN dim_product p ON l.product_code = p.product_code
  WHERE COALESCE(l.is_test, 0) = 0
    AND COALESCE(d.is_blacklist, 0) = 0
    AND COALESCE(p.status, 'ON') IN ('ON','ACTIVE')
),
pass_at_risk AS (
  SELECT * FROM valid_app WHERE result = 'PA' AND decision_stage = 'RISK'
),
exclude_revoke AS (
  SELECT pr.*
  FROM pass_at_risk pr
  LEFT JOIN a_frms_deparment_sx_his_full h2
    ON pr.flow_id = h2.flow_id
   AND h2.result IN ('RV','RJ')
   AND h2.decision_time > pr.decision_time
   AND h2.data_dt = pr.data_dt
  WHERE h2.flow_id IS NULL
),
final_cnt AS (
  SELECT
    data_dt,
    COUNT(DISTINCT flow_id) AS pass_cnt
  FROM exclude_revoke
  GROUP BY data_dt
)
SELECT pass_cnt
FROM final_cnt
WHERE data_dt = \${date}
`,
        fieldDescription: '',
        reportInfo: '发展日测报告\n公司级报表・市场营销报表',
        storageLocation: 'adm.ads_report_index_commonality_info_full',
        queryCode: 'SELECT data_dt=20250401\nFROM adm.ads_report_numbersinfo_free_temporal_code\nWHERE data_dt=20250401\nAND indicator_name=\'风控授信通过量\'\nAND indicator_id=\'A00043\'',
        versions: [
          { date: '2024-01-01', description: '指标创建' }
        ],
        businessOwner: '',
        technicalOwner: '',
        isFavorite: false
      },
      {
        id: '3',
        type: 'business_core' as MetricType,
        name: '用户注册转化率',
        category: '用户指标',
        businessDomain: '转化域',
        businessDefinition: '访问用户转化为注册用户的比率',
        owner: '李四',
        code: 'USER_002',
        useCase: '衡量产品获客效果，优化注册流程',
        statisticalPeriod: '日更新',
        sourceTable: 'dwd.user_register_detail',
        processingLogic: 'SELECT dt, COUNT(DISTINCT register_user_id) / COUNT(DISTINCT visit_user_id) as conversion_rate\nFROM dwd.user_register_detail\nWHERE dt = ${date}\nGROUP BY dt',
        fieldDescription: 'register_user_id: 完成注册的用户ID, visit_user_id: 访问用户ID',
        reportInfo: '用户分析/转化分析',
        storageLocation: 'adm.ads_user_conversion_metrics',
        queryCode: 'SELECT conversion_rate FROM adm.ads_user_conversion_metrics WHERE dt = ${date}',
        versions: [
          { date: '2024-01-05', description: '指标创建' }
        ],
        businessOwner: '王五',
        technicalOwner: '赵六',
        isFavorite: false
      }
    ]
    
    // 根据路由参数获取对应的指标数据
    const currentMetric = mockMetrics.find(m => m.id === route.params.id) ?? mockMetrics[0]
    if (!currentMetric) {
      Message.error('未找到指标数据')
      return
    }
    
    // 使用真实的mock数据
    const baseData = {
      ...currentMetric,
      createTime: '2024-01-01',
      updateTime: '2024-01-15'
    }
    
    // 根据指标类型添加特定数据
    if (currentMetric.type === 'business_core') {
      // 业务核心指标特有数据
      Object.assign(baseData, {
        businessImpact: {
          keyMetrics: '影响核心业务收入和用户增长',
          scope: '全公司业务部门',
          riskLevel: '高',
          monitorFrequency: '实时监控'
        }
      })
    } else if (currentMetric.type === 'regulatory') {
      // 监管指标特有数据
      Object.assign(baseData, {
        compliance: {
          regulator: '银保监会',
          regulation: '《银行业监督管理法》第三十七条',
          reportFrequency: '月报',
          status: '合规',
          lastCheck: '2024-01-15'
        }
      })
    }
    
    // 模拟数据
    metricDetail.value = baseData
    
    // 获取相关推荐指标
    relatedMetrics.value = [
      { id: '2', name: '当月放款金额', category: '业务核心指标' },
      { id: '3', name: '放款笔数', category: '业务核心指标' },
      { id: '4', name: '平均放款金额', category: '业务核心指标' }
    ]
  } catch (error) {

    Message.error('获取指标详情失败')
  } finally {
    loading.value = false
  }
}

const fetchRelatedMetrics = async () => {
  try {
    if (!metricDetail.value) {return}
    
    // 模拟获取相关指标（同分类或同业务域）
    const mockMetrics = [
      {
        id: '4',
        type: 'business_core' as MetricType,
        name: '月活跃用户数',
        category: '用户指标',
        businessDomain: '留存域',
        businessDefinition: '月活跃用户数',
        owner: '张三',
        code: 'USER_003'
      },
      {
        id: '5',
        type: 'business_core' as MetricType,
        name: '用户留存率',
        category: '用户指标',
        businessDomain: '留存域',
        businessDefinition: '用户留存率',
        owner: '李四',
        code: 'USER_004'
      },
      {
        id: '6',
        type: 'regulatory' as MetricType,
        name: '风险资产比率',
        category: '风险指标',
        businessDomain: '风险管理',
        businessDefinition: '风险资产比率',
        owner: '王五',
        code: 'RISK_001'
      }
    ]
    
    // 过滤相关指标
    relatedMetrics.value = mockMetrics
      .filter(item => item.id !== metricDetail.value?.id && 
                     (item.category === metricDetail.value?.category || 
                      item.businessDomain === metricDetail.value?.businessDomain))
      .slice(0, 3)
  } catch (error) {

  }
}

const toggleFavorite = async () => {
  try {
    // 模拟收藏API调用
    const newFavoriteStatus = !metricDetail.value.isFavorite
    
    // 这里应该调用实际的API
    await new Promise(resolve => setTimeout(resolve, 500))
    
    metricDetail.value.isFavorite = newFavoriteStatus

    // 提示消息未实现：原 dfd 侧为空 if/else，搬迁时删除空语句块而非补实现
  } catch (error) {

  }
}

const handleShare = () => {
  shareVisible.value = true
}

const shareMetric = () => {
  shareVisible.value = true
}

const confirmShare = () => {
  shareVisible.value = false
  Message.success('分享成功')
}

const copyShareLink = async () => {
  try {
    await navigator.clipboard.writeText(shareLink.value)

    shareVisible.value = false
  } catch (error) {

  }
}

const viewRelatedMetric = (metricId: string) => {
  router.push({
    name: 'MetricDetail',
    params: { id: metricId },
    query: { type: metricType.value }
  })
}

const handleRelatedMetricClick = (metric: any) => {
  // 跳转到相关指标详情页
  router.push({
    path: `/discovery/metrics-map/detail/${metric.id}`,
    query: { type: 'operational' }
  })
}



// 生命周期
onMounted(() => {
  fetchMetricDetail()
})
</script>

<style scoped>
.metric-detail {
  padding: 24px;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  min-height: calc(100vh - 64px);
}

.breadcrumb {
  margin-bottom: 24px;
  padding: 16px 24px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
}

.page-header {
  background: #f8f9fa;
  color: var(--subapp-text-primary);
  padding: 24px;
  border-radius: 8px;
  margin-bottom: 24px;
  border: 1px solid var(--subapp-border);
  position: relative;
  overflow: hidden;
}

.page-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="50" cy="50" r="1" fill="%23ffffff" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>') repeat;
  pointer-events: none;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  position: relative;
  z-index: 1;
}

.title-section {
  flex: 1;
}

.metric-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--subapp-text-primary);
  margin: 0 0 12px 0;
}

.metric-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.asset-id {
  font-size: 14px;
  color: var(--subapp-primary);
  background: #f2f3ff;
  padding: 6px 12px;
  border-radius: 4px;
  font-family: monospace;
  font-weight: 500;
}

.asset-description {
  color: var(--subapp-text-secondary);
  margin: 12px 0 0 0;
  line-height: 1.6;
  font-size: 14px;
}

.metric-type-tag {
  background: #f2f3ff !important;
  color: var(--subapp-primary) !important;
  border: 1px solid #d4e4ff !important;
.action-buttons :deep(.arco-btn-outline) {
  background: white;
  border-color: var(--subapp-border);
  color: var(--subapp-text-secondary);
}

.action-buttons :deep(.arco-btn-outline:hover) {
  background: #f2f3ff;
  border-color: var(--subapp-primary);
  color: var(--subapp-primary);
}

.breadcrumb :deep(.arco-breadcrumb-item-link) {
  color: var(--subapp-primary);
}

.breadcrumb :deep(.arco-breadcrumb-item-link:hover) {
  color: var(--subapp-primary);
} position: relative;
  z-index: 1;
}

.detail-content {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  padding: 24px;
}

.content-layout {
  display: flex;
  gap: 24px;
}

.main-content {
  flex: 1;
}

.detail-tabs {
  padding: 0;
}

.detail-tabs :deep(.arco-tabs-content) {
  padding: 24px;
}

.detail-card {
  margin-bottom: 16px;
  border-radius: 6px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  background: white;
  border: 1px solid var(--subapp-border);
  overflow: hidden;
}

.detail-card:last-child {
  margin-bottom: 0;
}

.detail-card :deep(.arco-card-header) {
  background: #f8f9fa;
  border-bottom: 1px solid var(--subapp-border);
  padding: 12px 16px;
}

.card-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--subapp-text-primary);
}

.detail-card :deep(.arco-card-body) {
  padding: 16px;
}

.highlight-text {
  color: var(--subapp-primary);
  font-weight: 600;
}

.description-content {
  line-height: 1.6;
  color: var(--subapp-text-secondary);
  white-space: pre-wrap;
}

.code-block {
  background-color: #f7f8fa;
  padding: 12px;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  line-height: 1.4;
  color: var(--subapp-text-primary);
  border: 1px solid var(--subapp-border);
  white-space: pre-wrap;
  overflow-x: auto;
}

.processing-logic {
  max-height: 200px;
  overflow-y: auto;
}

.query-code {
  margin: 0;
  max-height: 300px;
  overflow-y: auto;
}

/* SQL展示区域样式 */
.sql-section {
  margin-top: 24px;
  border-top: 1px solid var(--subapp-border);
  padding-top: 24px;
}

.sql-header {
  margin-bottom: 16px;
}

.sql-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--subapp-text-primary);
}

.sql-block {
  margin-bottom: 16px;
  border: 1px solid var(--subapp-border);
  border-radius: 6px;
  overflow: visible;
  max-width: 100%;
}

.sql-block-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background-color: #f7f8fa;
  border-bottom: 1px solid var(--subapp-border);
  flex-shrink: 0;
}

.sql-title {
  font-weight: 600;
  color: var(--subapp-text-primary);
  font-size: 14px;
}

.sql-actions {
  display: flex;
  gap: 8px;
}

.sql-content {
  padding: 0;
  overflow-x: hidden;
  max-width: 100%;
}

.sql-code {
  margin: 0;
  padding: 16px;
  background-color: #fafbfc;
  border: none;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  line-height: 1.5;
  color: #24292f;
  overflow-x: auto;
  white-space: pre;
}

.sql-code code {
  background: none;
  padding: 0;
  font-family: inherit;
  font-size: inherit;
  color: inherit;
}

.sql-info-section {
  margin-top: 20px;
  padding: 16px;
  background-color: #f7f8fa;
  border-radius: 6px;
}

.info-row {
  display: flex;
  margin-bottom: 12px;
  align-items: flex-start;
}

.info-row:last-child {
  margin-bottom: 0;
}

.info-label {
  min-width: 80px;
  font-weight: 600;
  color: var(--subapp-text-primary);
  margin-right: 12px;
}

.info-content {
  flex: 1;
}

.source-tag, .dependency-tag {
  margin-right: 8px;
  margin-bottom: 4px;
}

.field-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field-item {
  padding: 4px 8px;
  background-color: #fff;
  border-radius: 4px;
  font-size: 13px;
  color: var(--subapp-text-secondary);
  border-left: 3px solid var(--subapp-primary);
}

.quick-navigation {
  width: 200px;
  flex-shrink: 0;
  margin-right: 24px;
}

.nav-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--subapp-text-primary);
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 2px solid var(--subapp-primary);
}

.nav-menu {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nav-item {
  display: block;
  padding: 8px 12px;
  color: var(--subapp-text-secondary);
  text-decoration: none;
  border-radius: 6px;
  transition: all 0.2s;
  font-size: 14px;
}

.nav-item:hover {
  background: #f2f3ff;
  color: var(--subapp-primary);
  text-decoration: none;
}

.nav-item:active {
  background: #e8f3ff;
  color: var(--subapp-primary);
}

.lineage-container {
  width: 100%;
}

.report-links {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.report-link {
  color: var(--subapp-primary);
  cursor: pointer;
}

.lineage-toolbar {
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--subapp-border);
}

.lineage-graph {
  height: 400px;
  border: 1px solid var(--subapp-border);
  border-radius: 6px;
  background: #fafbfc;
  position: relative;
  margin-bottom: 16px;
}

.lineage-placeholder {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.lineage-info {
  background: #f7f8fa;
  padding: 16px;
  border-radius: 6px;
}

.version-timeline {
  padding: 16px 0;
}

.version-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.version-date {
  font-weight: 600;
  color: var(--subapp-text-primary);
  font-size: 14px;
}

.version-description {
  color: var(--subapp-text-secondary);
  font-size: 14px;
}

/* 已移除相关指标推荐卡片，清理冗余样式 */

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 400px;
  background: white;
  border-radius: 6px;
  border: 1px solid var(--subapp-border);
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .content-layout {
    flex-direction: column;
  }
  
  .quick-navigation {
    width: 100%;
    margin-right: 0;
    margin-bottom: 24px;
  }
  
  .nav-menu {
    flex-direction: row;
    flex-wrap: wrap;
  }
  
  .nav-item {
    flex: 0 0 auto;
  }
}

@media (max-width: 768px) {
  .metric-detail {
    padding: 16px;
  }
  
  .metric-header {
    flex-direction: column;
    gap: 16px;
  }
  
  .header-actions {
    width: 100%;
    justify-content: flex-start;
  }
  
  .metric-title {
    font-size: 24px;
  }
  
  .detail-content {
    padding: 16px;
  }
}
</style>
