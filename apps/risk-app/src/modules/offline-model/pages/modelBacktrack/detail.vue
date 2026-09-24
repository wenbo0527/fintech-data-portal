<template>
  <div class="backtrack-detail-page">
    <div class="page-header">
      <a-breadcrumb>
        <a-breadcrumb-item to="/model-offline-analysis/model-backtrack">模型回溯</a-breadcrumb-item>
        <a-breadcrumb-item>回溯详情</a-breadcrumb-item>
      </a-breadcrumb>
      <h1 class="page-title">回溯详情 #{{ id }}</h1>
    </div>
    <a-tabs type="card" :active-key="activeTab" @change="activeTab=$event">
      <!-- Tab1：配置信息（只读，对齐创建页步骤一~五结构） -->
      <a-tab-pane key="config" title="配置信息">
        <a-collapse v-model:active-key="collapseKeys" :bordered="false">
          <!-- 步骤一：选择回溯模型 -->
          <a-collapse-item key="model" header="步骤一：选择回溯模型">
            <a-descriptions :column="2" bordered size="small">
              <a-descriptions-item label="回溯ID">{{ detail.id }}</a-descriptions-item>
              <a-descriptions-item label="状态">
                <a-tag :color="statusColor">{{ getStatusLabel(detail.status) }}</a-tag>
              </a-descriptions-item>
              <a-descriptions-item label="任务名称">{{ detail.config?.taskName || '—' }}</a-descriptions-item>
              <a-descriptions-item label="模型与版本">
                {{ detail.config?.serviceName || '—' }} / {{ detail.config?.version || '—' }}
              </a-descriptions-item>
              <a-descriptions-item label="回溯模式">
                <a-tag :color="detail.config?.mode === 'periodic' ? 'purple' : 'blue'">
                  {{ detail.config?.mode === 'periodic' ? '周期回溯' : '单次回溯' }}
                </a-tag>
              </a-descriptions-item>
              <a-descriptions-item label="观测日期范围">
                {{ formatRange(detail.config?.dateRange) }}
              </a-descriptions-item>
              <a-descriptions-item label="推理入参入库" :span="2">
                <a-tag :color="detail.config?.featurePersist ? 'green' : 'gray'">
                  {{ detail.config?.featurePersist ? '已勾选（入参将落库）' : '未勾选' }}
                </a-tag>
              </a-descriptions-item>
              <a-descriptions-item label="创建时间">{{ detail.createTime || '—' }}</a-descriptions-item>
              <a-descriptions-item label="更新时间">{{ detail.updateTime || '—' }}</a-descriptions-item>
            </a-descriptions>
          </a-collapse-item>

          <!-- 步骤二：落表目标与场景配置 -->
          <a-collapse-item key="landing" header="步骤二：落表目标与场景配置">
            <a-descriptions :column="2" bordered size="small">
              <a-descriptions-item label="多模型汇总表" :span="2">
                <a-tag v-if="detail.config?.landingForm?.summary" color="green">已勾选</a-tag>
                <a-tag v-else color="gray">未勾选</a-tag>
                <template v-if="detail.config?.landingForm?.summary">
                  <span style="margin-left: 12px;">
                    类型：
                    <a-tag size="small">
                      {{ detail.config.landingForm.summaryType === 'general' ? '通用汇总表' :
                         detail.config.landingForm.summaryType === 'channel' ? '渠道专属汇总表' : '—' }}
                    </a-tag>
                    <template v-if="detail.config.landingForm.summaryType === 'channel' && detail.config.landingForm.channelCode">
                      <a-tag size="small" color="blue" style="margin-left: 4px;">{{ channelLabel(detail.config.landingForm.channelCode) }}</a-tag>
                    </template>
                  </span>
                </template>
              </a-descriptions-item>
              <a-descriptions-item label="单模型独立表" :span="2">
                <a-tag v-if="detail.config?.landingForm?.singleModel" color="green">已勾选</a-tag>
                <a-tag v-else color="gray">未勾选</a-tag>
                <template v-if="detail.config?.landingForm?.singleModel">
                  <span style="margin-left: 12px;">
                    类型：
                    <a-tag size="small">
                      {{ detail.config.landingForm.singleTableType === 'realtime' ? '实时表' :
                         detail.config.landingForm.singleTableType === 'offline' ? '离线表' : '—' }}
                    </a-tag>
                  </span>
                </template>
              </a-descriptions-item>
              <a-descriptions-item label="场景标签" :span="2">
                <template v-if="detail.config?.sceneTags?.length">
                  <a-tag v-for="tag in detail.config.sceneTags" :key="tag" color="arcoblue" style="margin-right: 6px;">{{ tag }}</a-tag>
                </template>
                <span v-else>—</span>
              </a-descriptions-item>
            </a-descriptions>
          </a-collapse-item>

          <!-- 步骤三：样本数据 / 周期回溯配置 -->
          <a-collapse-item key="sample" :header="detail.config?.mode === 'periodic' ? '步骤三：配置周期回溯' : '步骤三：选择样本数据'">
            <template v-if="detail.config?.mode === 'periodic'">
              <a-divider orientation="left">周期执行配置</a-divider>
              <a-descriptions :column="3" bordered size="small">
                <a-descriptions-item label="执行频率">{{ periodicityLabel }}</a-descriptions-item>
                <a-descriptions-item label="触发方式">{{ triggerTypeLabel }}</a-descriptions-item>
                <a-descriptions-item label="执行时间">{{ detail.config?.scheduleTime || '—' }}</a-descriptions-item>
                <a-descriptions-item label="每周">
                  {{ detail.config?.weekDays?.length ? detail.config.weekDays.join('、') : '—' }}
                </a-descriptions-item>
                <a-descriptions-item label="每月">
                  {{ detail.config?.monthDays?.length ? detail.config.monthDays.join('、') : '—' }}
                </a-descriptions-item>
                <a-descriptions-item label="袋鼠云任务">{{ detail.config?.kangarooTaskId || '—' }}</a-descriptions-item>
                <a-descriptions-item label="任务执行时间窗口" :span="3">
                  {{ formatRange([detail.config?.taskStartDate, detail.config?.taskEndDate]) }}
                </a-descriptions-item>
              </a-descriptions>
            </template>
            <a-divider orientation="left">样本表配置</a-divider>
            <a-descriptions :column="2" bordered size="small">
              <a-descriptions-item label="数据来源">{{ detail.config?.sourceType || '—' }}</a-descriptions-item>
              <a-descriptions-item label="样本表">{{ detail.config?.table || '—' }}</a-descriptions-item>
              <a-descriptions-item label="库名">{{ detail.config?.dbName || '—' }}</a-descriptions-item>
              <a-descriptions-item label="表名">{{ detail.config?.tableName || '—' }}</a-descriptions-item>
              <a-descriptions-item label="WHERE 条件" :span="2">
                <code class="readonly-sql">{{ detail.config?.sqlWhere || '（无）' }}</code>
              </a-descriptions-item>
              <a-descriptions-item label="关联方式" :span="2">
                <a-tag color="arcoblue">{{ associationLabel(detail.config?.associationMethod) }}</a-tag>
              </a-descriptions-item>
            </a-descriptions>
          </a-collapse-item>

          <!-- 步骤四：必填字段映射 -->
          <a-collapse-item key="required" header="步骤四：必填字段映射">
            <a-table
              :data="detail.config?.requiredFieldMappings || []"
              :columns="requiredCols"
              row-key="field"
              size="small"
              :pagination="false"
            >
              <template #requiredCell="{ record }">
                <a-tag :color="record.required ? 'red' : 'gray'" size="small">
                  {{ record.required ? '必填' : '选填' }}
                </a-tag>
              </template>
              <template #encryptedCell="{ record }">
                <a-tag :color="record.isEncrypted ? 'blue' : 'gray'">{{ record.isEncrypted ? '是' : '否' }}</a-tag>
              </template>
            </a-table>
          </a-collapse-item>

          <!-- 步骤五：入参匹配 -->
          <a-collapse-item key="match" header="步骤五：入参匹配">
            <div class="section-tip">
              已匹配 {{ matchedInputCount }} / {{ (detail.config?.inputMappings || []).length }}，未匹配 {{ (detail.config?.inputMappings || []).length - matchedInputCount }}
            </div>
            <a-table
              :data="detail.config?.inputMappings || []"
              :columns="inputCols"
              row-key="input"
              size="small"
              :pagination="false"
            >
              <template #statusCell="{ record }">
                <a-tag :color="record.target ? 'green' : 'red'">
                  {{ record.target ? '已匹配' : '未匹配' }}
                </a-tag>
              </template>
            </a-table>
          </a-collapse-item>

          <!-- 步骤六：输出信息 -->
          <a-collapse-item key="output" header="步骤六：输出信息">
            <a-descriptions v-if="detail.config?.mainScoreField" :column="2" bordered size="small" style="margin-bottom: 12px;">
              <a-descriptions-item label="主模型分指定">
                <a-tag color="arcoblue">{{ detail.config.mainScoreField }}</a-tag>
              </a-descriptions-item>
              <a-descriptions-item label="出参总数">
                {{ (detail.config?.outputs || []).length }} 个
              </a-descriptions-item>
            </a-descriptions>
            <a-table
              :data="detail.config?.outputs || []"
              :columns="outputCols"
              row-key="name"
              size="small"
              :pagination="false"
            />
          </a-collapse-item>
        </a-collapse>
      </a-tab-pane>

      <!-- Tab2：执行记录（结构化日志） -->
      <a-tab-pane key="log" title="执行记录">
        <!-- 模块C P0：日志结构化展示（兼容单模型 / 嵌套两种日志） -->
        <div v-if="!detail.log" class="report-placeholder">
          <a-empty description="暂无结构化日志" />
        </div>
        <template v-else>
          <div class="log-type-tag">
            <a-tag :color="logType === 'nested' ? 'arcoblue' : 'gray'">
              {{ logType === 'nested' ? '嵌套日志（含子模型）' : '单模型日志' }}
            </a-tag>
            <a-tag v-if="logHasFallback" color="orange" size="small">兼容旧版结构</a-tag>
          </div>
          <div class="section">
            <h3>① 执行节点</h3>
            <BacktrackLogTimeline :log="detail.log" />
          </div>
          <div class="section">
            <h3>② 执行结果</h3>
            <div v-if="execution.main">
              <BacktrackModelCard :model="execution.main" kind="main" :include-state="logType === 'nested'" />
            </div>
            <template v-if="execution.subs.length">
              <div v-for="(sm, idx) in execution.subs" :key="sm.model_id || idx">
                <BacktrackModelCard :model="sm" kind="sub" :include-state="true" />
              </div>
            </template>
            <a-empty v-if="!execution.main && execution.subs.length === 0" description="无执行结果" />
          </div>
          <div class="section">
            <BacktrackLogPanel :log="detail.log" />
          </div>
        </template>
      </a-tab-pane>
    </a-tabs>
    <div class="actions-bar">
      <a-space>
        <a-button @click="handleBack">返回</a-button>
        <a-button status="danger" @click="handleStop" :disabled="detail.status!=='running'">停止任务</a-button>
      </a-space>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { backtrackAPI } from '@/modules/offline-model/api'
import {
  getBacktrackRouteParams,
  isFromRiskModule,
  isFromOfflineModule
} from '@/modules/offline-model/utils/model-backtrack-router'
import { detectLogType, parseExecutionResult } from '@/modules/offline-model/utils/logParser'
import BacktrackLogTimeline from '../../components/BacktrackLogTimeline.vue'
import BacktrackModelCard from '../../components/BacktrackModelCard.vue'
import BacktrackLogPanel from '../../components/BacktrackLogPanel.vue'

const route = useRoute()
const router = useRouter()
const id = route.params.id

// 路由 tab 兼容：旧版 progress/result/report 统一映射到 log
const routeParams = getBacktrackRouteParams(route)
const rawTab = routeParams.tab
const activeTab = ref((rawTab && rawTab !== 'config') ? 'log' : 'config')
const detail = ref({ id, status: 'running', config: {}, progress: [], result: {} })

// 配置信息折叠面板展开项（响应式，确保所有面板可点击展开/收起）
const collapseKeys = ref(['model', 'landing', 'sample', 'required', 'match', 'output'])

// 来源模块信息
const isFromRisk = computed(() => isFromRiskModule(route))
const isFromOffline = computed(() => isFromOfflineModule(route))

// 只读列配置
const requiredCols = [
  { title: '字段', dataIndex: 'field', width: 160 },
  { title: '映射到样本字段', dataIndex: 'target', width: 200 },
  { title: '必填/选填', slotName: 'requiredCell', width: 100, align: 'center' },
  { title: '关联加密', dataIndex: 'isEncrypted', slotName: 'encryptedCell', width: 120, align: 'center' }
]
const inputCols = [
  { title: '入参', dataIndex: 'input', width: 180 },
  { title: '映射到特征中心', dataIndex: 'target', width: 240 },
  { title: '状态', slotName: 'statusCell', width: 120, align: 'center' }
]
const outputCols = [
  { title: '出参名', dataIndex: 'name', width: 180 },
  { title: '类型', dataIndex: 'type', width: 140 },
  { title: '描述', dataIndex: 'description' }
]

const matchedInputCount = computed(() => {
  return (detail.value.config?.inputMappings || []).filter(m => m.target).length
})

const statusColor = computed(() => {
  const map = {
    draft: 'gray',
    running: 'blue',
    completed: 'green',
    failed: 'red',
    stopped: 'orange',
    partial_success: 'cyan'
  }
  return map[detail.value.status] || 'gray'
})

const periodicityLabel = computed(() => {
  const m = { daily: '每日', weekly: '每周', monthly: '每月' }
  return m[detail.value.config?.periodicity] || detail.value.config?.periodicity || '—'
})
const triggerTypeLabel = computed(() => {
  const m = { schedule: '定时触发', subscribe: '订阅袋鼠云任务' }
  return m[detail.value.config?.triggerType] || detail.value.config?.triggerType || '—'
})

const getStatusLabel = (status) => {
  const labels = {
    draft: '草稿',
    running: '进行中',
    completed: '已完成',
    failed: '已失败',
    stopped: '已停止',
    partial_success: '部分成功'
  }
  return labels[status] || status
}

// 格式化日期范围
const formatRange = (range) => {
  if (!Array.isArray(range) || range.length < 2) return '—'
  const [s, e] = range
  if (!s && !e) return '—'
  return `${s || '—'} ~ ${e || '—'}`
}

// 渠道标签翻译
const channelLabel = (code) => {
  const map = { alipay: '支付宝', wechat: '微信', jd: '京东', douyin: '抖音' }
  return map[code] || code || '—'
}

// 关联方式标签翻译
const associationLabel = (method) => {
  const map = { flow_id: 'flow_id 关联', cert_no: '身份证号关联' }
  return map[method] || method || '—'
}

// 模块C P0：日志类型 + 解析后的执行结果
const logType = computed(() => detectLogType(detail.value?.log))
const execution = computed(() => parseExecutionResult(detail.value?.log))
const logHasFallback = computed(() => logType.value === null && !!detail.value?.log)

const loadDetail = async () => {
  const res = await backtrackAPI.getBacktrackDetail(id)
  if (res.success && res.data) {
    detail.value = res.data
  } else {
    Message.error(res.message || '加载失败')
  }
}

const handleBack = () => {
  if (isFromRisk.value) {
    router.push('/risk/model-offline-analysis/model-backtrack')
  } else {
    router.push('/model-offline-analysis/model-backtrack')
  }
}
const handleStop = async () => {
  const res = await backtrackAPI.stopBacktrack(id)
  if (res.success) {
    Message.success('任务已停止')
    await loadDetail()
  }
}

onMounted(loadDetail)
</script>

<style scoped>
.backtrack-detail-page { padding: 16px; background: #fff; }
.page-header { margin-bottom: 12px; }
.page-title { margin: 0; font-size: 18px; font-weight: 600; }
.section { margin-top: 12px; }
.section-tip { font-size: 13px; color: var(--color-text-3); margin-bottom: 10px; }
.actions-bar { margin-top: 16px; }
.report-placeholder {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
}
.log-type-tag { margin-bottom: 12px; display: flex; gap: 8px; align-items: center; }
.readonly-sql {
  font-family: 'SFMono-Regular', Consolas, monospace;
  font-size: 12px;
  background: var(--color-fill-relaxed);
  padding: 2px 6px;
  border-radius: 4px;
}
:deep(.arco-collapse-item-header) { font-weight: 500; }
</style>