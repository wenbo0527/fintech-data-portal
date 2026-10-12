<template>
  <div class="explore-topic-detail-page">
    <DmtPageHeader :title="topic?.name || topicId" subtitle="以课题为载体的探索过程资产，包含实验、决策、审计与关联资源。">
      <template #extra>
        <a-button @click="router.push('/explore/topics')">返回列表</a-button>
        <a-button @click="openGovernanceDrawer('accompany')">陪跑</a-button>
        <a-button @click="openGovernanceDrawer('evaluation')">评估</a-button>
        <a-button @click="router.push({ path: '/explore/compare', query: { topicId } })">实验对比</a-button>
        <a-button type="primary" @click="openDecisionModal">发起决策</a-button>
      </template>
    </DmtPageHeader>

    <a-card :bordered="false" class="header-card">
      <div class="header-top">
        <div>
          <div class="topic-name">{{ topic?.name || topicId }}</div>
          <div class="topic-tags">
            <a-tag v-if="topic" :color="statusColor(topic.status)">{{ statusLabel(topic.status) }}</a-tag>
            <a-tag v-if="topic" :color="priorityColor(topic.priority)">{{ priorityLabel(topic.priority) }}</a-tag>
            <a-tag v-if="topic" :color="visibilityColor(topic.visibility)">{{ visibilityLabel(topic.visibility) }}</a-tag>
          </div>
        </div>
        <div class="topic-meta">
          <div>课题ID：{{ topicId }}</div>
          <div>负责人：{{ topic?.owner || '—' }}</div>
          <div>更新时间：{{ topic?.updatedAt || '—' }}</div>
        </div>
      </div>
    </a-card>

    <a-tabs v-model:active-key="activeTab" class="detail-tabs">
      <a-tab-pane key="basic" title="课题信息">
        <a-card :bordered="false" class="panel-card">
          <a-descriptions :column="2" bordered size="small">
            <a-descriptions-item label="业务问题" :span="2">{{ topic?.businessProblem || '—' }}</a-descriptions-item>
            <a-descriptions-item label="特征假设" :span="2">{{ topic?.hypothesis || '—' }}</a-descriptions-item>
            <a-descriptions-item label="业务域标签" :span="2">
              <a-space wrap>
                <a-tag v-for="tag in topic?.domainTags || []" :key="tag" color="arcoblue">{{ tag }}</a-tag>
                <span v-if="(topic?.domainTags || []).length === 0" class="muted">—</span>
              </a-space>
            </a-descriptions-item>
            <a-descriptions-item label="特征类型标签" :span="2">
              <a-space wrap>
                <a-tag v-for="tag in topic?.variableTypeTags || []" :key="tag">{{ tag }}</a-tag>
                <span v-if="(topic?.variableTypeTags || []).length === 0" class="muted">—</span>
              </a-space>
            </a-descriptions-item>
            <a-descriptions-item label="目标特征类型">{{ variableTypeName || '—' }}</a-descriptions-item>
            <a-descriptions-item label="探索分类">{{ topic?.exploreCategoryTitle || '—' }}</a-descriptions-item>
            <a-descriptions-item label="关联数据源">{{ topic?.relatedDataSourceName || '—' }}</a-descriptions-item>
            <a-descriptions-item label="可见性">{{ topic ? visibilityLabel(topic.visibility) : '—' }}</a-descriptions-item>
          </a-descriptions>
        </a-card>
      </a-tab-pane>

      <!-- ============ 衍生需求专属 Tab（A3）============ -->
      <a-tab-pane v-if="isDerivation" key="derivation" :title="`衍生需求信息`">
        <a-card :bordered="false" class="panel-card">
          <a-alert type="info" :show-icon="false" style="margin-bottom: 16px">
            文档 §三 模块 A · A3 · 衍生需求专属字段（业务场景/数据源/数据时效/开发人员/产品范围/批次等）
          </a-alert>

          <a-descriptions title="基础属性" :column="3" bordered size="small">
            <a-descriptions-item label="需求ID">{{ topicId }}</a-descriptions-item>
            <a-descriptions-item label="业务场景">
              <a-tag color="purple">{{ topic?.businessScene || '—' }}</a-tag>
            </a-descriptions-item>
            <a-descriptions-item label="品类">
              <a-tag color="arcoblue">{{ topic?.category || 'midloan_behavior' }}</a-tag>
            </a-descriptions-item>
            <a-descriptions-item label="数据源">
              <a-tag>{{ topic?.dataSource || 'Hbase' }}</a-tag>
            </a-descriptions-item>
            <a-descriptions-item label="数据时效">
              <a-tag color="cyan">{{ topic?.dataFreshness || '—' }}</a-tag>
            </a-descriptions-item>
            <a-descriptions-item label="开发人员">{{ topic?.developer || '—' }}</a-descriptions-item>
            <a-descriptions-item label="预期效果" :span="3">{{ topic?.expectedEffect || '—' }}</a-descriptions-item>
          </a-descriptions>

          <a-divider>特征核心属性</a-divider>

          <a-descriptions :column="3" bordered size="small">
            <a-descriptions-item label="特征英文名">{{ topic?.featureEnName || '—' }}</a-descriptions-item>
            <a-descriptions-item label="特征中文名">{{ topic?.featureCnName || '—' }}</a-descriptions-item>
            <a-descriptions-item label="字段类型">
              <a-tag>{{ topic?.fieldType || '—' }}</a-tag>
            </a-descriptions-item>
            <a-descriptions-item label="加工逻辑" :span="3">{{ topic?.processingLogic || '—' }}</a-descriptions-item>
            <a-descriptions-item label="默认值">{{ topic?.defaultValue || '—' }}</a-descriptions-item>
            <a-descriptions-item label="一级分类">{{ topic?.l1Category || '—' }}</a-descriptions-item>
            <a-descriptions-item label="二级分类">{{ topic?.l2Category || '—' }}</a-descriptions-item>
            <a-descriptions-item label="标准化后源表" :span="2">{{ topic?.sourceTableAfter || '—' }}</a-descriptions-item>
            <a-descriptions-item label="源表（变更前）">{{ topic?.sourceTableBefore || '—' }}</a-descriptions-item>
          </a-descriptions>

          <a-divider>注册阶段信息（待补充）</a-divider>

          <a-descriptions :column="3" bordered size="small">
            <a-descriptions-item label="数据底表名">{{ topic?.dataTableName || '待补充' }}</a-descriptions-item>
            <a-descriptions-item label="数仓任务ID">{{ topic?.dwTaskId || '—' }}</a-descriptions-item>
            <a-descriptions-item label="OA开发单号">{{ topic?.devOaOrderId || '—' }}</a-descriptions-item>
            <a-descriptions-item label="OA验收单号">{{ topic?.verifyOaOrderId || '—' }}</a-descriptions-item>
            <a-descriptions-item label="验收人">{{ topic?.acceptor || '—' }}</a-descriptions-item>
            <a-descriptions-item label="批次">{{ topic?.batch || '—' }}</a-descriptions-item>
            <a-descriptions-item label="产品范围">{{ topic?.productScope || '—' }}</a-descriptions-item>
            <a-descriptions-item label="名单类型">{{ topic?.listType || '—' }}</a-descriptions-item>
            <a-descriptions-item label="备注" :span="3">{{ topic?.remark || '—' }}</a-descriptions-item>
          </a-descriptions>

          <a-divider v-if="topic?.featureId">关联特征档案</a-divider>

          <a-alert v-if="topic?.featureId" type="success" :show-icon="false" style="margin-bottom: 12px">
            该衍生需求已提交到风险数据特征台账，关联特征ID：<a-link @click="goFeatureDetail(topic.featureId)">{{ topic.featureId }}</a-link>
          </a-alert>
        </a-card>
      </a-tab-pane>

      <a-tab-pane key="experiments" :title="`实验记录 (${experiments.length})`">
        <a-card :bordered="false" class="panel-card">
          <template #title>
            <div class="panel-card-title">
              <span>实验记录</span>
              <a-button size="small" type="primary" @click="openExperimentModal">新增实验</a-button>
            </div>
          </template>
          <a-table :columns="experimentColumns" :data="experiments" :pagination="false" row-key="id">
            <template #metricCell="{ record }">
              <a-space wrap>
                <a-tag color="arcoblue">IV {{ formatMetric(record.metrics.iv) }}</a-tag>
                <a-tag color="green">KS {{ formatMetric(record.metrics.ks) }}</a-tag>
                <a-tag color="orange">PSI {{ formatMetric(record.metrics.psi) }}</a-tag>
                <a-tag>覆盖率 {{ formatPercent(record.metrics.coverage) }}</a-tag>
              </a-space>
            </template>
            <template #recommendCell="{ record }">
              <a-tag :color="recommendColor(record.recommendation)">{{ recommendLabel(record.recommendation) }}</a-tag>
            </template>
          </a-table>
        </a-card>
      </a-tab-pane>

      <a-tab-pane key="decision" :title="`决策记录 (${decision ? 1 : 0})`">
        <a-card :bordered="false" class="panel-card">
          <a-empty v-if="!decision" description="暂无决策记录（可点击右上角发起决策）" />
          <div v-else class="decision-block">
            <a-descriptions :column="1" bordered size="small">
              <a-descriptions-item label="决策结果">
                <a-tag :color="decisionResultColor(decision.result)">{{ decisionResultLabel(decision.result) }}</a-tag>
              </a-descriptions-item>
              <a-descriptions-item label="决策人">{{ decision.decider }}</a-descriptions-item>
              <a-descriptions-item label="决策时间">{{ decision.decidedAt }}</a-descriptions-item>
              <a-descriptions-item label="决策依据">{{ decision.rationale }}</a-descriptions-item>
              <a-descriptions-item label="签名状态">
                <a-tag color="green">{{ decision.signatureStatus === 'mock_verified' ? '已验证（Demo）' : '待签名' }}</a-tag>
              </a-descriptions-item>
            </a-descriptions>

            <a-divider />

            <!-- 采纳后：探索中心只生成草稿，移交特征中心，状态走"待审批→待部署→已上线" -->
            <a-alert v-if="decision.result === 'adopted' && !topic?.variableSync" type="success" :show-icon="false">
              <div class="adopt-tip">
                <div>采纳后可生成特征注册草稿，并移交特征中心（§6.5 状态分层）。</div>
                <a-button size="mini" type="primary" @click="handleGenerateDraft">生成草稿（待审批）</a-button>
              </div>
            </a-alert>

            <!-- 关联特征同步状态展示（§6.5 探索中心只读展示） -->
            <div v-if="topic?.variableSync" class="variable-sync-block">
              <div class="sync-header">
                <span class="sync-title">关联特征同步状态</span>
                <a-tag size="small" color="arcoblue">只读展示 · 同步延迟 {{ syncDelayLabel }}</a-tag>
              </div>

              <div class="sync-row">
                <span class="sync-label">特征ID：</span>
                <a-link @click="router.push({ name: 'VariableAssetDetail', params: { id: topic.variableSync.variableId, mode: 'view' } })">{{ topic.variableSync.variableId }}</a-link>
              </div>
              <div class="sync-row">
                <span class="sync-label">当前状态：</span>
                <a-tag :color="syncStatusColor(topic.variableSync.status)">{{ syncStatusLabel(topic.variableSync.status) }}</a-tag>
              </div>
              <div v-if="topic.variableSync.status === 'online'" class="sync-row">
                <span class="sync-label">实际上线时间：</span>
                <span>{{ topic.variableSync.onlineAt }}</span>
              </div>
              <div v-if="topic.variableSync.status === 'rejected'" class="sync-row">
                <span class="sync-label">驳回原因：</span>
                <span class="sync-rejected">{{ topic.variableSync.rejectedReason }}</span>
              </div>

              <!-- 同步事件时间线 -->
              <div class="sync-events">
                <div class="sync-events-title">同步事件历史（特征中心 → 探索中心）：</div>
                <a-timeline size="small">
                  <a-timeline-item v-for="(evt, idx) in topic.variableSync.events" :key="idx">
                    <span class="evt-time">{{ evt.at }}</span>
                    <a-tag size="small" :color="syncStatusColor(evt.from)">{{ syncStatusLabel(evt.from) }}</a-tag>
                    →
                    <a-tag size="small" :color="syncStatusColor(evt.to)">{{ syncStatusLabel(evt.to) }}</a-tag>
                    <span class="evt-note" v-if="evt.note">· {{ evt.note }}</span>
                  </a-timeline-item>
                </a-timeline>
              </div>

              <!-- 演示操作按钮（特征中心事件模拟） -->
              <a-divider />
              <div class="sync-actions">
                <div class="sync-actions-title">演示操作（模拟特征中心事件）：</div>
                <a-space wrap>
                  <a-button
                    v-if="topic.variableSync.status === 'pending_approval'"
                    size="mini"
                    type="primary"
                    @click="handleMockApprove"
                  >模拟审批通过</a-button>
                  <a-button
                    v-if="topic.variableSync.status === 'pending_approval'"
                    size="mini"
                    status="danger"
                    @click="handleMockReject"
                  >模拟审批驳回</a-button>
                  <a-button
                    v-if="topic.variableSync.status === 'pending_deploy'"
                    size="mini"
                    type="primary"
                    @click="handleMockDeploy"
                  >模拟部署完成</a-button>
                  <a-button
                    v-if="['pending_approval', 'pending_deploy'].includes(topic.variableSync.status)"
                    size="mini"
                    @click="handleMockFastForward"
                  >加速同步（跳过延迟）</a-button>
                </a-space>
                <div class="sync-actions-tip">
                  Demo：实际生产中特征中心状态变更通过消息队列事件推送，探索中心只读订阅。
                </div>
              </div>
            </div>
          </div>
        </a-card>
      </a-tab-pane>

      <a-tab-pane key="audit" :title="`审计追踪 (${auditEvents.length})`">
        <a-card :bordered="false" class="panel-card">
          <a-empty v-if="auditEvents.length === 0" description="暂无审计事件" />
          <a-timeline v-else>
            <a-timeline-item v-for="item in auditEvents" :key="item.id">
              <div class="audit-time">{{ item.occurredAt }}</div>
              <div class="audit-content">{{ item.operator }} · {{ item.action }} · {{ item.field }}</div>
              <div class="audit-desc">原因：{{ item.reason }}</div>
            </a-timeline-item>
          </a-timeline>
        </a-card>
      </a-tab-pane>

      <a-tab-pane key="assets" title="关联资产">
        <a-card :bordered="false" class="panel-card">
          <a-descriptions :column="1" bordered size="small">
            <a-descriptions-item label="关联资源">
              <a-space wrap>
                <a-tag v-for="item in topic?.relatedResources || []" :key="item.type + item.name">
                  {{ item.displayName }}
                </a-tag>
                <span v-if="(topic?.relatedResources || []).length === 0" class="muted">—</span>
              </a-space>
            </a-descriptions-item>
            <a-descriptions-item label="引用历史课题">
              <a-space wrap>
                <a-tag v-for="refId in topic?.referencedTopicIds || []" :key="refId" color="purple">{{ refId }}</a-tag>
                <span v-if="(topic?.referencedTopicIds || []).length === 0" class="muted">—</span>
              </a-space>
            </a-descriptions-item>
            <a-descriptions-item label="衔接到特征（Demo）">
              <a-space>
                <a-button size="mini" @click="router.push('/variable-management')">查看特征台账</a-button>
                <a-button
                  v-if="topic?.relatedVariableIds?.[0]"
                  size="mini"
                  type="primary"
                  @click="router.push({ name: 'VariableAssetDetail', params: { id: topic.relatedVariableIds[0] } })"
                >查看特征详情（含血缘）</a-button>
              </a-space>
            </a-descriptions-item>
          </a-descriptions>
        </a-card>
      </a-tab-pane>
    </a-tabs>

    <a-modal v-model:visible="decisionVisible" title="发起决策（Demo）" ok-text="提交" cancel-text="取消" @ok="handleDecisionSubmit">
      <a-form :model="decisionForm" layout="vertical">
        <a-form-item label="决策结果">
          <a-radio-group v-model="decisionForm.result">
            <a-radio value="adopted">采纳</a-radio>
            <a-radio value="rejected">否决</a-radio>
            <a-radio value="paused">暂缓</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="决策依据">
          <a-textarea v-model="decisionForm.rationale" placeholder="填写依据摘要（Demo）" :max-length="140" show-word-limit />
        </a-form-item>
        <a-form-item label="延伸方案（采纳时）">
          <a-textarea
            v-model="decisionForm.extensionPlan"
            placeholder="采纳时填写推荐特征（多个用逗号/换行分隔），将作为后续生成草稿的推荐特征名"
            :max-length="200"
            show-word-limit
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal v-model:visible="experimentVisible" title="新增实验（Demo）" ok-text="保存" cancel-text="取消" @ok="handleExperimentSubmit">
      <a-form :model="experimentForm" layout="vertical">
        <a-form-item label="实验名称" required>
          <a-input v-model="experimentForm.name" placeholder="例如：近6月还款金额趋势" />
        </a-form-item>
        <a-form-item label="时间窗口">
          <a-input v-model="experimentForm.timeWindow" placeholder="例如：2025-12 ~ 2026-05" />
        </a-form-item>
        <a-form-item label="样本范围">
          <a-input v-model="experimentForm.sampleScope" placeholder="例如：全量活跃客户" />
        </a-form-item>
        <a-form-item label="特征构造逻辑">
          <a-textarea v-model="experimentForm.transformLogic" placeholder="如 repay_amount_30d_slope" />
        </a-form-item>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="IV">
              <a-input-number v-model="experimentForm.iv" :min="0" :max="1" :step="0.01" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="KS">
              <a-input-number v-model="experimentForm.ks" :min="0" :max="1" :step="0.01" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="PSI">
              <a-input-number v-model="experimentForm.psi" :min="0" :max="1" :step="0.01" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="覆盖率">
              <a-input-number v-model="experimentForm.coverage" :min="0" :max="1" :step="0.01" style="width: 100%" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="推荐">
          <a-radio-group v-model="experimentForm.recommendation">
            <a-radio value="go">推荐推进</a-radio>
            <a-radio value="need_more">需进一步</a-radio>
            <a-radio value="no_go">不推荐</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="结论">
          <a-textarea v-model="experimentForm.conclusion" placeholder="实验结论描述" :max-length="200" show-word-limit />
        </a-form-item>
      </a-form>
    </a-modal>

    <GovernanceActionDrawer
      v-model="governanceVisible"
      context-type="topic"
      :context-id="topicId"
      :context-name="topic?.name"
      :default-tab="governanceDefaultTab"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { ExploreStore, type ExploreDecisionResult, type ExplorePriority, type ExploreTopicStatus, type ExploreVisibility, type VariableSyncStatus } from '@/modules/variable-hub/mock/explore/explore-store'
import { ExploreTaxonomyStore } from '@/modules/variable-hub/mock/explore/explore-taxonomy-store'
import GovernanceActionDrawer from '@/modules/variable-hub/components/GovernanceActionDrawer.vue'
import DmtPageHeader from '@/modules/variable-hub/components/PageHeader.vue'

const route = useRoute()
const router = useRouter()

const topicId = String(route.params.id || '')

// 是否衍生需求（A3）
const isDerivation = computed(() => topic.value?.demandType === 'derivation')

// 跳转到特征详情
function goFeatureDetail(featureId) {
  router.push(`/variable-management/detail/${featureId}`)
}

// 注：computed 内引用 tickRef.value 是为了让 mock 同步延迟的 setTimeout 完成后，
// 1 秒轮询触发响应式更新，台账自动刷新到最新状态
const topic = computed(() => {
  // 引用 tickRef 建立响应式依赖
  void tickRef.value
  return ExploreStore.getTopicById(topicId)
})
const experiments = computed(() => {
  void tickRef.value
  return ExploreStore.listExperimentsByTopic(topicId)
})
const decision = computed(() => {
  void tickRef.value
  return ExploreStore.getDecisionByTopicId(topicId)
})
const auditEvents = computed(() => {
  void tickRef.value
  return ExploreStore.listAuditEventsByTopic(topicId)
})

const activeTab = ref('basic')

const variableTypeName = computed(() => {
  const typeId = topic.value?.variableTypeId
  if (!typeId) return ''
  return ExploreTaxonomyStore.getTypeById(typeId)?.title || ''
})

const statusLabel = (value: ExploreTopicStatus) => ({
  exploring: '探索中',
  adopted: '已采纳',
  rejected: '已否决',
  paused: '已暂缓'
}[value])

const statusColor = (value: ExploreTopicStatus) => ({
  exploring: 'arcoblue',
  adopted: 'green',
  rejected: 'red',
  paused: 'orange'
}[value])

const priorityLabel = (value: ExplorePriority) => ({ high: '高', medium: '中', low: '低' }[value])
const priorityColor = (value: ExplorePriority) => ({ high: 'red', medium: 'orange', low: 'gray' }[value])

const visibilityLabel = (value: ExploreVisibility) => ({
  team: '团队内',
  company: '全公司可见',
  audit: '仅审计可见'
}[value])

const visibilityColor = (value: ExploreVisibility) => ({
  team: 'arcoblue',
  company: 'green',
  audit: 'purple'
}[value])

const experimentColumns = [
  { title: '实验名称', dataIndex: 'name', width: 220 },
  { title: '时间窗口', dataIndex: 'timeWindow', width: 160 },
  { title: '样本范围', dataIndex: 'sampleScope', width: 160 },
  { title: '指标（IV/KS/PSI/覆盖率）', dataIndex: 'metrics', slotName: 'metricCell' },
  { title: '推荐', dataIndex: 'recommendation', slotName: 'recommendCell', width: 120 },
  { title: '实验人', dataIndex: 'executor', width: 120 },
  { title: '结束时间', dataIndex: 'finishedAt', width: 160 }
]

const formatMetric = (value?: number) => (typeof value === 'number' ? value.toFixed(2) : '—')
const formatPercent = (value?: number) => (typeof value === 'number' ? `${(value * 100).toFixed(1)}%` : '—')

const recommendLabel = (value: 'go' | 'no_go' | 'need_more') => ({
  go: '推荐推进',
  no_go: '不推荐',
  need_more: '需进一步'
}[value])

const recommendColor = (value: 'go' | 'no_go' | 'need_more') => ({
  go: 'green',
  no_go: 'red',
  need_more: 'orange'
}[value])

const decisionResultLabel = (value: ExploreDecisionResult) => ({ adopted: '采纳', rejected: '否决', paused: '暂缓' }[value])
const decisionResultColor = (value: ExploreDecisionResult) => ({ adopted: 'green', rejected: 'red', paused: 'orange' }[value])

// §6.5 特征同步状态映射
const syncStatusLabel = (value: VariableSyncStatus): string => ({
  none: '无关联特征',
  pending_approval: '待审批',
  pending_deploy: '待部署',
  online: '已上线',
  rejected: '审批驳回'
}[value])

const syncStatusColor = (value: VariableSyncStatus): string => ({
  none: 'gray',
  pending_approval: 'arcoblue',
  pending_deploy: 'orange',
  online: 'green',
  rejected: 'red'
}[value])

const syncDelayLabel = computed(() => {
  const ms = ExploreStore.getSyncDelayMs()
  if (ms >= 60000) return `${Math.round(ms / 60000)}分钟`
  if (ms >= 1000) return `${Math.round(ms / 1000)}秒`
  return `${ms}ms`
})

// 演示用：每 1 秒轮询一次（模拟 1 分钟级同步延迟的展示节奏）
const tickRef = ref(0)
let pollTimer: number | undefined
onMounted(() => {
  pollTimer = window.setInterval(() => {
    tickRef.value++
  }, 1000)
})
onUnmounted(() => {
  if (pollTimer) {
    window.clearInterval(pollTimer)
    pollTimer = undefined
  }
})

const decisionVisible = ref(false)
const decisionForm = reactive({
  result: 'adopted' as ExploreDecisionResult,
  rationale: '',
  extensionPlan: ''
})

const openDecisionModal = () => {
  decisionForm.result = 'adopted'
  decisionForm.rationale = ''
  decisionForm.extensionPlan = ''
  decisionVisible.value = true
}

const handleDecisionSubmit = () => {
  const rationale = decisionForm.rationale.trim()
  if (!rationale) {
    Message.warning('请填写决策依据')
    return
  }
  // 解析"延伸方案"为推荐特征（采纳时）
  const recommendedVariables: Array<{ name: string; bestExperimentId: string }> = []
  if (decisionForm.result === 'adopted') {
    const plan = decisionForm.extensionPlan.trim()
    // 简单解析：第一行/分隔符/冒号前后的内容作为推荐特征名
    const firstExperiment = ExploreStore.listExperimentsByTopic(topicId)[0]
    if (plan) {
      plan
        .split(/[\n，,；;]+/)
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 3)
        .forEach((line) => {
          recommendedVariables.push({
            name: line,
            bestExperimentId: firstExperiment?.id || ''
          })
        })
    }
    if (recommendedVariables.length === 0 && firstExperiment) {
      recommendedVariables.push({
        name: `${topic?.name || topicId}_推荐特征`,
        bestExperimentId: firstExperiment.id
      })
    }
  }
  const decision = ExploreStore.addDecision({
    topicId,
    result: decisionForm.result,
    decider: 'Demo 用户',
    rationale,
    extensionPlan:
      decisionForm.result === 'adopted'
        ? {
            recommendedVariables,
            expectedLaunchDate: '',
            resourceEstimate: '',
            risks: '',
            notes: ''
          }
        : undefined
  })
  Message.success(`已提交决策：${decisionResultLabel(decision.result)}`)
  decisionVisible.value = false
}

const governanceVisible = ref(false)
const governanceDefaultTab = ref<'accompany' | 'evaluation'>('accompany')

const openGovernanceDrawer = (tab: 'accompany' | 'evaluation') => {
  governanceDefaultTab.value = tab
  governanceVisible.value = true
}

const handleGenerateDraft = () => {
  // §6.1 + §6.5：采纳决策只生成草稿并初始化同步状态，移交特征中心
  // 探索中心不再直接跳转特征中心详情页，仅在台账上只读展示同步状态
  const topicData = ExploreStore.getTopicById(topicId)
  const decided = decision.value
  if (!decided) {
    Message.warning('请先在「决策记录」Tab 提交决策')
    return
  }
  if (decided.result !== 'adopted') {
    Message.warning('仅「采纳」状态的决策可生成草稿')
    return
  }
  if (topicData?.variableSync) {
    Message.warning('已生成过特征草稿，请勿重复操作')
    return
  }
  const recommended = decided?.extensionPlan?.recommendedVariables?.[0]
  const firstExperiment = ExploreStore.listExperimentsByTopic(topicId)[0]
  const experimentVariableName = firstExperiment?.conclusion?.match(/[A-Za-z0-9_]+(?:_v\d+)?/)?.[0]
  const name = recommended?.name || experimentVariableName || `${topicData?.name || topicId}_推荐特征`
  const code = `DRAFT-${Date.now().toString().slice(-6)}`

  // 初始化特征同步信息（状态=待审批），不再直接跳转特征中心
  ExploreStore.initVariableSync(topicId, code)
  Message.success(`已生成特征注册草稿 ${code}，移交特征中心（状态：待审批）`)
}

/**
 * Demo 用：模拟特征中心"审批通过"事件
 * 演示同步延迟 5 秒后状态变为"待部署"
 */
const handleMockApprove = () => {
  const ms = ExploreStore.getSyncDelayMs()
  Message.info(`已模拟特征中心审批通过事件，预计 ${Math.round(ms / 1000)} 秒后同步到探索中心`)
  ExploreStore.mockSyncApprove(topicId)
}

/**
 * Demo 用：模拟特征中心"审批驳回"事件
 * 探索中心自动回退到"已暂缓"
 */
const handleMockReject = () => {
  const reason = 'Demo驳回原因：外数接口SLA不满足生产要求，需补充降级方案'
  const ms = ExploreStore.getSyncDelayMs()
  Message.warning(`已模拟审批驳回事件，预计 ${Math.round(ms / 1000)} 秒后同步并通知发起人`)
  ExploreStore.mockSyncReject(topicId, reason)
}

/**
 * Demo 用：模拟特征中心"部署完成"事件
 */
const handleMockDeploy = () => {
  const ms = ExploreStore.getSyncDelayMs()
  Message.info(`已模拟特征中心部署完成事件，预计 ${Math.round(ms / 1000)} 秒后同步`)
  ExploreStore.mockSyncDeploy(topicId)
}

/**
 * Demo 用：跳过延迟，立刻推进到下一态
 */
const handleMockFastForward = () => {
  ExploreStore.mockSyncFastForward(topicId)
  Message.success('已加速同步，跳过演示延迟')
}

// 新增实验
const experimentVisible = ref(false)
const experimentForm = reactive({
  name: '',
  timeWindow: '',
  sampleScope: '',
  transformLogic: '',
  iv: 0.1,
  ks: 0.1,
  psi: 0.05,
  coverage: 0.8,
  recommendation: 'need_more' as 'go' | 'no_go' | 'need_more',
  conclusion: ''
})

const openExperimentModal = () => {
  experimentForm.name = ''
  experimentForm.timeWindow = ''
  experimentForm.sampleScope = ''
  experimentForm.transformLogic = ''
  experimentForm.iv = 0.1
  experimentForm.ks = 0.1
  experimentForm.psi = 0.05
  experimentForm.coverage = 0.8
  experimentForm.recommendation = 'need_more'
  experimentForm.conclusion = ''
  experimentVisible.value = true
}

const handleExperimentSubmit = () => {
  if (!experimentForm.name.trim()) {
    Message.warning('请输入实验名称')
    return
  }
  const exp = ExploreStore.addExperiment({
    topicId,
    name: experimentForm.name.trim(),
    timeWindow: experimentForm.timeWindow.trim(),
    sampleScope: experimentForm.sampleScope.trim(),
    transformLogic: experimentForm.transformLogic.trim(),
    metrics: {
      iv: experimentForm.iv,
      ks: experimentForm.ks,
      psi: experimentForm.psi,
      coverage: experimentForm.coverage
    },
    recommendation: experimentForm.recommendation,
    conclusion: experimentForm.conclusion.trim()
  })
  experimentVisible.value = false
  Message.success(`已新增实验：${exp.id}`)
}
</script>

<style scoped>
.explore-topic-detail-page {
  min-height: calc(100vh - 88px);
  background: #f7f8fa;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.breadcrumb {
  cursor: pointer;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-card,
.panel-card {
  box-shadow: 0 8px 20px rgba(15, 35, 95, 0.06);
}

.header-top {
  display: flex;
  justify-content: space-between;
  gap: 24px;
}

.topic-name {
  font-size: 22px;
  font-weight: 600;
  color: #1d2129;
}

.topic-tags {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.topic-meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: #4e5969;
}

.detail-tabs {
  margin-top: 16px;
}

.muted {
  color: #86909c;
}

.panel-card-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.decision-block {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.adopt-tip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

/* §6.5 特征同步状态区块样式 */
.variable-sync-block {
  margin-top: 12px;
  padding: 16px;
  background: linear-gradient(135deg, #f0f7ff 0%, #f9f0ff 100%);
  border-radius: 8px;
  border: 1px solid #e5e6eb;
}

.sync-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.sync-title {
  font-weight: 600;
  color: #1d2129;
  font-size: 14px;
}

.sync-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 13px;
}

.sync-label {
  color: #86909c;
  min-width: 100px;
}

.sync-rejected {
  color: #f53f3f;
  font-weight: 500;
}

.sync-events {
  margin-top: 16px;
  padding: 12px;
  background: #fff;
  border-radius: 6px;
}

.sync-events-title {
  font-size: 12px;
  color: #86909c;
  margin-bottom: 8px;
}

.evt-time {
  font-size: 12px;
  color: #86909c;
  margin-right: 8px;
}

.evt-note {
  font-size: 12px;
  color: #4e5969;
  margin-left: 8px;
}

.sync-actions {
  margin-top: 8px;
}

.sync-actions-title {
  font-size: 12px;
  color: #86909c;
  margin-bottom: 8px;
}

.sync-actions-tip {
  margin-top: 8px;
  font-size: 11px;
  color: #c9cdd4;
  font-style: italic;
}

.audit-time {
  font-size: 12px;
  color: #86909c;
}

.audit-content {
  font-weight: 600;
  color: #1d2129;
}

.audit-desc {
  margin-top: 4px;
  color: #4e5969;
}
</style>
