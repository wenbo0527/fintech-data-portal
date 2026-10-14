<template>
  <div class="metric-detail-page" v-if="metric">
    <!-- 头部 -->
    <div class="detail-header">
      <div class="header-left">
        <a-button type="text" @click="goBack" size="small">
          <template #icon><IconLeft /></template>
        </a-button>
        <div class="header-info">
          <div class="header-title">
            <span class="title-name">{{ metric.name }}</span>
            <a-tag :color="metric.type === 'business' ? 'blue' : 'red'" size="small">
              {{ metric.type === 'business' ? '业务核心指标' : '监管指标' }}
            </a-tag>
            <a-badge :status="statusMap[metric.status]" :text="statusText[metric.status]" />
          </div>
          <div class="header-meta">
            <span>{{ metric.domain }}</span>
            <a-divider direction="vertical" />
            <span>{{ metric.scenario }}</span>
            <a-divider direction="vertical" />
            <span>指标ID：{{ metric.id }}</span>
            <a-divider direction="vertical" />
            <span>当前版本：v{{ metric.currentVersion }}</span>
          </div>
        </div>
      </div>
      <div class="header-right">
        <a-space>
          <a-tooltip :content="metric.isFavorite ? '取消收藏' : '收藏'">
            <a-button type="text" @click="toggleFavorite">
              <IconStarFill v-if="metric.isFavorite" style="color: #ff7d00" />
              <IconStar v-else />
            </a-button>
          </a-tooltip>
          <a-tooltip :content="metric.isSubscribed ? '取消订阅' : '订阅'">
            <a-button type="text" @click="toggleSubscribe">
              <IconBellFill v-if="metric.isSubscribed" style="color: #165dff" />
              <IconBell v-else />
            </a-button>
          </a-tooltip>
          <a-button @click="goEdit" v-if="metric.status !== 'pending'">
            <template #icon><IconEdit /></template>
            编辑
          </a-button>
          <template v-if="metric.status === 'draft'">
            <a-button type="outline" @click="handleSubmitReview">提交审核</a-button>
          </template>
          <template v-if="metric.status === 'pending'">
            <a-popconfirm content="确定审批通过并上线该指标？" @ok="handleApprove">
              <a-button type="primary">审批通过</a-button>
            </a-popconfirm>
            <a-button status="danger" @click="rejectVisible = true">驳回</a-button>
          </template>
        </a-space>
      </div>
    </div>

    <a-alert v-if="metric.status === 'pending'" type="warning" style="margin-bottom: 16px">
      该指标正在审核中，审批通过后将以上待生效版本上线
    </a-alert>
    <a-alert v-else-if="metric.status === 'draft' && metric.reviewNote" type="error" style="margin-bottom: 16px">
      最近一次审核被驳回：{{ metric.reviewNote }}
    </a-alert>

    <!-- 内容区域 -->
    <div class="detail-body">
      <!-- 基本信息 -->
      <a-card title="基本信息" class="detail-card">
        <a-descriptions :column="3" bordered>
          <a-descriptions-item label="指标名称">{{ metric.name }}</a-descriptions-item>
          <a-descriptions-item label="指标编码">{{ metric.code }}</a-descriptions-item>
          <a-descriptions-item label="指标类型">
            <a-tag :color="metric.type === 'business' ? 'blue' : 'red'">
              {{ metric.type === 'business' ? '业务核心指标' : '监管指标' }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="指标域">{{ metric.domain }}</a-descriptions-item>
          <a-descriptions-item label="归属场景">{{ metric.scenario }}</a-descriptions-item>
          <a-descriptions-item label="计算时效">{{ frequencyLabel(metric.calculationFrequency) }}</a-descriptions-item>
          <a-descriptions-item label="业务负责人">{{ metric.businessOwner }}</a-descriptions-item>
          <a-descriptions-item label="技术负责人">{{ metric.technicalOwner }}</a-descriptions-item>
          <a-descriptions-item label="创建时间">{{ metric.createdAt }}</a-descriptions-item>
          <a-descriptions-item label="来源类型">{{ optionLabel(SOURCE_TYPE_OPTIONS, metric.sourceType) || '未填写' }}</a-descriptions-item>
          <a-descriptions-item label="统计粒度">{{ optionLabel(GRANULARITY_OPTIONS, metric.granularity) || '未填写' }}</a-descriptions-item>
          <a-descriptions-item label="维护完整度">
            <div class="completeness-cell">
              <a-progress :percent="completeness.metaScore / 100" size="small" :show-text="false" :status="progressStatus(completeness.metaScore)" style="width: 80px" />
              <span class="completeness-label">人读 {{ completeness.metaScore }}</span>
              <a-progress :percent="completeness.agentScore / 100" size="small" :show-text="false" :status="progressStatus(completeness.agentScore)" style="width: 80px" />
              <span class="completeness-label">Agent {{ completeness.agentScore }}</span>
            </div>
          </a-descriptions-item>
        </a-descriptions>
        <div v-if="completeness.metaMissing.length || completeness.agentMissing.length" class="completeness-gaps">
          缺口：
          <a-tag v-for="g in completeness.metaMissing" :key="'m-' + g" color="orange" size="small">{{ g }}</a-tag>
          <a-tag v-for="g in completeness.agentMissing" :key="'a-' + g" color="red" size="small">{{ g }}</a-tag>
        </div>
      </a-card>

      <!-- 消费情况：指标被哪些看板/报表使用（反向依赖） -->
      <a-card class="detail-card">
        <template #title>
          消费情况
          <a-tag size="small" color="arcoblue" style="margin-left: 8px">{{ consumers.length }} 个看板卡片</a-tag>
        </template>
        <div class="consume-summary">
          <span>最新取值：<strong>{{ latestValueText }}</strong></span>
          <a-divider direction="vertical" />
          <span>取值版本：v{{ metric.currentVersion }}</span>
        </div>
        <a-table :data="consumers" :pagination="false" row-key="cardKey" size="small" style="margin-top: 12px">
          <template #columns>
            <a-table-column title="消费方" data-index="boardTitle" :width="180" />
            <a-table-column title="看板卡片" data-index="cardTitle" :width="160" />
            <a-table-column title="看板锁定版本" :width="120">
              <template #cell="{ record }">v{{ record.pinnedVersion }}</template>
            </a-table-column>
            <a-table-column title="指标当前版本" :width="120">
              <template #cell="{ record }">v{{ record.currentVersion }}</template>
            </a-table-column>
            <a-table-column title="状态" :width="120">
              <template #cell="{ record }">
                <a-tag v-if="record.pinnedVersion !== record.currentVersion" color="orange" size="small">口径已更新</a-tag>
                <a-tag v-else color="green" size="small">一致</a-tag>
              </template>
            </a-table-column>
            <a-table-column title="操作" :width="100">
              <template #cell="{ record }">
                <a-button type="text" size="small" @click="goBoard(record.boardId)">前往看板</a-button>
              </template>
            </a-table-column>
          </template>
          <template #empty>
            <a-empty description="该指标暂无看板引用，可在分支看板中按编码引用" />
          </template>
        </a-table>
      </a-card>

      <!-- 业务定义 -->
      <a-card title="业务定义" class="detail-card">
        <div class="section-content">
          <h4>业务口径</h4>
          <div class="rich-text-content" v-html="metric.businessDefinition"></div>
          <template v-if="metric.useCase">
            <h4 style="margin-top: 16px;">使用场景</h4>
            <div class="rich-text-content" v-html="metric.useCase"></div>
          </template>
        </div>
      </a-card>

      <!-- 技术逻辑 -->
      <a-card title="技术逻辑" class="detail-card">
        <div class="section-content">
          <h4>技术口径
            <a-button type="text" size="mini" @click="toggleExpand('technicalDefinition')">
              {{ expanded.technicalDefinition ? '收起' : '展开' }}
            </a-button>
          </h4>
          <pre v-if="expanded.technicalDefinition" class="sql-block">{{ metric.technicalDefinition }}</pre>
          <pre v-else class="sql-block collapsed">{{ metric.technicalDefinition }}</pre>

          <template v-if="metric.technicalUsageNotes">
            <h4 style="margin-top: 16px;">技术口径使用说明</h4>
            <p>{{ metric.technicalUsageNotes }}</p>
          </template>

          <template v-if="metric.resultTable">
            <h4 style="margin-top: 16px;">结果表</h4>
            <p>{{ metric.resultTable }}</p>
          </template>

          <template v-if="metric.queryCode">
            <h4 style="margin-top: 16px;">查询代码</h4>
            <pre class="sql-block">{{ metric.queryCode }}</pre>
          </template>
        </div>
      </a-card>

      <!-- Agent 信息（语义契约） -->
      <a-card class="detail-card">
        <template #title>
          Agent 信息（语义契约）
          <a-tag size="small" color="orangered" style="margin-left: 8px">机器可读 · 二期智能问数地基</a-tag>
        </template>
        <a-descriptions :column="1" bordered size="small">
          <a-descriptions-item label="同义词 / 别名（AG-01）">
            <a-space wrap>
              <a-tag v-for="s in metric.agentMeta?.synonyms" :key="s" color="arcoblue">{{ s }}</a-tag>
              <span v-if="!metric.agentMeta?.synonyms?.length" class="gap-text">缺失</span>
            </a-space>
          </a-descriptions-item>
        </a-descriptions>
        <!-- Agent 说明文档（Markdown，统一承载 AG-02~08 语义内容） -->
        <div v-if="metric.agentDoc" class="agent-doc">
          <h4 class="block-subtitle">Agent 说明文档（AG-02~08：口径约束 / 枚举映射 / 维度组 / 适用禁用 / 回答行为）</h4>
          <MarkdownView :content="metric.agentDoc" />
        </div>
        <span v-else class="gap-text" style="display: block; margin-top: 12px">未维护 Agent 说明文档（语义类型、枚举映射、必需过滤、维度组、适用禁用场景等请在此文档中补充）</span>
      </a-card>

      <!-- 报表挂载 / 报表位置 -->
      <a-card title="报表位置" class="detail-card" v-if="metric.reportLocations.length > 0 || metric.reportMounts?.length">
        <a-table v-if="metric.reportMounts?.length" :data="mountRows" :pagination="false" size="small" row-key="reportId" style="margin-bottom: 12px">
          <template #columns>
            <a-table-column title="报表" data-index="reportName" :width="200" />
            <a-table-column title="使用方" data-index="role" :width="160" />
            <a-table-column title="可见范围" :width="120">
              <template #cell="{ record }">
                <a-tag size="small" :color="record.visibility === 'all' ? 'green' : record.visibility === 'domain' ? 'blue' : 'orange'">
                  {{ visibilityText[record.visibility] }}
                </a-tag>
              </template>
            </a-table-column>
            <a-table-column title="参数说明" data-index="params" :width="160" />
            <a-table-column title="场景路由提示词（AG-11）" data-index="scenarioRoutingPrompt" />
            <a-table-column title="访问入口（人机同源）" :width="220">
              <template #cell="{ record }">
                <a-link v-if="record.entry" :href="record.entry" target="_blank" hover-behave="underline">{{ record.entry }}</a-link>
                <span v-else class="gap-text">报表侧未维护</span>
              </template>
            </a-table-column>
          </template>
        </a-table>
        <!-- 无挂载时兜底展示旧版手工"报表位置"，避免与挂载表重复 -->
        <a-list v-else :data="metric.reportLocations" :bordered="false">
          <template #item="{ item }">
            <a-list-item>
              <a-list-item-meta :title="item.name">
                <template #description>{{ item.url }}</template>
              </a-list-item-meta>
              <template #actions>
                <a-link :href="item.url" target="_blank">访问</a-link>
              </template>
            </a-list-item>
          </template>
        </a-list>
        <div v-if="metric.reportMounts?.length" class="derive-hint">"访问入口"列由报表侧统一派生（人机同源），如需调整请到报表管理修改</div>
      </a-card>

      <!-- 数据血缘 -->
      <a-card title="数据血缘" class="detail-card">
        <a-empty v-if="!lineage" description="暂未采集血缘（元数据系统未接通）；可参考上方技术口径 SQL 与结果表" />
        <div v-else>
          <div class="lineage-flow">
            <div v-for="group in lineageGroups" :key="group.type" class="lineage-group">
              <div class="lineage-group-title">{{ group.label }}</div>
              <a-tag
                v-for="node in group.nodes"
                :key="node.id"
                :color="nodeColor[node.type]"
                class="lineage-node"
                @click="viewLineageNode(node)"
              >
                {{ node.label }}<template v-if="node.table">（{{ node.table }}）</template>
              </a-tag>
            </div>
          </div>
          <div class="lineage-edges">
            <div v-for="(e, i) in lineage.edges" :key="i" class="lineage-edge">
              {{ nodeLabel(e.from) }} <span class="edge-arrow">→</span> {{ nodeLabel(e.to) }}
            </div>
          </div>
        </div>
      </a-card>

      <!-- 版本历史 -->
      <a-card title="版本历史" class="detail-card">
        <a-alert v-if="metric.versions.length > 50" type="info" style="margin-bottom: 12px;">
          仅展示最近50条版本记录
        </a-alert>
        <a-table :data="metric.versions.slice(0, 50)" :pagination="false" row-key="version" :scroll="{ x: 800 }">
          <template #columns>
            <a-table-column title="版本号" data-index="version" :width="100">
              <template #cell="{ record }">v{{ record.version }}</template>
            </a-table-column>
            <a-table-column title="状态" data-index="status" :width="100">
              <template #cell="{ record }">
                <a-tag :color="versionStatusColor[record.status]" size="small">{{ versionStatusText[record.status] }}</a-tag>
              </template>
            </a-table-column>
            <a-table-column title="版本说明" data-index="description" :width="200" />
            <a-table-column title="创建时间" data-index="createdAt" :width="180" />
            <a-table-column title="创建人" data-index="createdBy" :width="100" />
            <a-table-column title="操作" :width="200" fixed="right">
              <template #cell="{ record }">
                <a-space>
                  <a-button type="text" size="small" @click="viewVersion(record.version)">查看详情</a-button>
                  <a-button
                    v-if="record.status !== 'active'"
                    type="text"
                    size="small"
                    status="success"
                    @click="activateVersion(record.version)"
                  >激活版本</a-button>
                  <a-popconfirm
                    v-if="record.status !== 'active'"
                    content="确定删除该版本？删除后不可恢复"
                    @ok="deleteVersion(record.version)"
                  >
                    <a-button type="text" size="small" status="danger">删除</a-button>
                  </a-popconfirm>
                  <span v-else style="color: #86909c; font-size: 12px;">当前启用</span>
                </a-space>
              </template>
            </a-table-column>
          </template>
        </a-table>
      </a-card>
    </div>

    <!-- 血缘节点详情弹窗 -->
    <a-modal v-model:visible="nodeVisible" :title="nodeDetail?.label || '节点详情'" :footer="false" unmount-on-close>
      <a-descriptions v-if="nodeDetail?.detail" :column="1" bordered size="small">
        <a-descriptions-item label="计算表达式">
          <pre class="sql-block" style="max-height: 200px">{{ nodeDetail.detail.expression }}</pre>
        </a-descriptions-item>
        <a-descriptions-item label="业务定义">{{ nodeDetail.detail.businessDefinition }}</a-descriptions-item>
        <a-descriptions-item label="敏感等级">
          <a-tag :color="nodeDetail.detail.sensitivity.includes('高') ? 'red' : 'orange'" size="small">{{ nodeDetail.detail.sensitivity }}</a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="质量规则">
          <div v-for="q in nodeDetail.detail.qualityRules" :key="q">· {{ q }}</div>
        </a-descriptions-item>
      </a-descriptions>
      <a-empty v-else description="该节点暂无字段级详情" />
    </a-modal>

    <!-- 驳回原因弹窗 -->
    <a-modal v-model:visible="rejectVisible" title="驳回审核" @before-ok="confirmReject" :ok-button-props="{ disabled: !rejectReason.trim() }" ok-text="确认驳回">
      <a-form-item label="驳回原因（必填，将展示给提交人）">
        <a-textarea v-model="rejectReason" placeholder="如：业务口径与技术口径不一致，请补充" :max-length="200" show-word-limit :auto-size="{ minRows: 3 }" />
      </a-form-item>
    </a-modal>
  </div>

  <a-empty v-else description="指标不存在" style="padding: 60px;">
    <a-button @click="goBack">返回列表</a-button>
  </a-empty>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { MetricsCenterStore, calcCompleteness } from '@/mock-dca/metrics-center/store'
import MarkdownView from '@/components-dca/common/MarkdownView.vue'
import {
  FREQUENCY_OPTIONS, SOURCE_TYPE_OPTIONS, GRANULARITY_OPTIONS,
} from '@/mock-dca/metrics-center/data'
import type { MetricItem, LineageNode, LineageNodeType } from '@/mock-dca/metrics-center/types'

const props = defineProps<{ id: string }>()
const router = useRouter()
const route = useRoute()
const metric = ref<MetricItem | undefined>()
const expanded = reactive({ technicalDefinition: false })

/** 反向依赖：该指标被哪些分支看板卡片引用 */
const consumers = computed(() => {
  const code = metric.value?.code
  return code ? MetricsCenterStore.getConsumers(code) : []
})

const latestValueText = computed(() => {
  const code = metric.value?.code
  if (!code) return '-'
  const series = MetricsCenterStore.getMetricValues(code)
  if (!series?.points.length) return '指标中心暂无取值'
  const last = series.points[series.points.length - 1]
  return `${last.value.toLocaleString('zh-CN')} ${series.unit}（${last.period}）`
})

const statusMap: Record<string, string> = { active: 'success', pending: 'processing', archived: 'default', draft: 'warning' }
const statusText: Record<string, string> = { active: '启用', pending: '审核中', archived: '归档', draft: '草稿' }
const versionStatusColor: Record<string, string> = { active: 'green', pending: 'blue', archived: 'gray', draft: 'orange' }
const versionStatusText: Record<string, string> = { active: '启用', pending: '待生效', archived: '归档', draft: '草稿' }

function frequencyLabel(val: string) {
  return FREQUENCY_OPTIONS.find(f => f.value === val)?.label || val
}

function optionLabel(options: { label: string; value: string }[], val?: string | '') {
  return options.find(o => o.value === val)?.label || ''
}

function progressStatus(score: number) {
  return score >= 90 ? 'normal' : score >= 40 ? 'warning' : 'danger'
}

/** 完整度评分（实时计算，不持久化） */
const completeness = computed(() => {
  if (!metric.value) return { metaScore: 0, agentScore: 0, metaMissing: [], agentMissing: [] }
  return calcCompleteness(metric.value)
})

const visibilityText: Record<string, string> = { all: '全部可见', domain: '角色/域内', specific: '白名单' }

/** 挂载明细行：报表 ID 反查报表库名称 */
const mountRows = computed(() => {
  const mounts = metric.value?.reportMounts ?? []
  return mounts.map(m => {
    const r = MetricsCenterStore.getReportById(m.reportId)
    return { ...m, reportName: r ? r.name : `未知报表（${m.reportId}）`, entry: r?.accessEntry }
  })
})

/** 数据血缘（R18）：未采集时为空，展示 E9 空态 */
const lineage = computed(() => (metric.value ? MetricsCenterStore.getLineage(metric.value.code) : undefined))

const LINEAGE_GROUP_ORDER: { type: LineageNodeType; label: string }[] = [
  { type: 'metric', label: '指标' },
  { type: 'result_table', label: '结果表' },
  { type: 'upstream_table', label: '上游表' },
  { type: 'field', label: '上游字段' },
  { type: 'downstream', label: '下游消费' },
]
const nodeColor: Record<string, string> = {
  metric: 'arcoblue', result_table: 'green', upstream_table: 'orange', field: 'purple', downstream: 'cyan',
}

const lineageGroups = computed(() => {
  if (!lineage.value) return []
  return LINEAGE_GROUP_ORDER
    .map(g => ({ ...g, nodes: lineage.value!.nodes.filter(n => n.type === g.type) }))
    .filter(g => g.nodes.length > 0)
})

function nodeLabel(id: string) {
  return lineage.value?.nodes.find(n => n.id === id)?.label || id
}

const nodeVisible = ref(false)
const nodeDetail = ref<LineageNode | undefined>()

function viewLineageNode(node: LineageNode) {
  if (!node.detail) return
  nodeDetail.value = node
  nodeVisible.value = true
}

/* ---------------- 审核状态机动作 ---------------- */
const rejectVisible = ref(false)
const rejectReason = ref('')

function handleSubmitReview() {
  try {
    MetricsCenterStore.submitReview(props.id)
    Message.success('已提交审核，等待管理员审批')
    loadData()
  } catch (e: any) {
    Message.error(e.message || '提交失败')
  }
}

function handleApprove() {
  try {
    MetricsCenterStore.approve(props.id)
    Message.success('审批通过，指标已上线')
    loadData()
  } catch (e: any) {
    Message.error(e.message || '操作失败')
  }
}

function confirmReject() {
  try {
    MetricsCenterStore.reject(props.id, rejectReason.value.trim())
    Message.success('已驳回，指标退回草稿状态')
    rejectReason.value = ''
    loadData()
    return true
  } catch (e: any) {
    Message.error(e.message || '驳回失败')
    return false
  }
}

function toggleExpand(field: string) {
  (expanded as any)[field] = !(expanded as any)[field]
}

function loadData() {
  metric.value = MetricsCenterStore.getById(props.id)
}

function toggleFavorite() {
  const result = MetricsCenterStore.toggleFavorite(props.id)
  if (metric.value) metric.value.isFavorite = result
  Message.success(result ? '已收藏' : '已取消收藏')
}

function toggleSubscribe() {
  const result = MetricsCenterStore.toggleSubscribe(props.id)
  if (metric.value) metric.value.isSubscribed = result
  Message.success(result ? '已订阅' : '已取消订阅')
}

function goEdit() {
  router.push({ name: 'metrics-center-create', query: { id: props.id } })
}

/** 前往引用该指标的分支看板 */
function goBoard(boardId: string) {
  router.push({ name: 'metrics-center-dashboard', query: { board: boardId } })
}

function goBack() {
  // 从看板跳转过来的，返回看板；其余返回指标管理列表
  if (route.query.from === 'dashboard') {
    router.push({ name: 'metrics-center-dashboard' })
    return
  }
  if (route.query.from === 'map') {
    router.push({ name: 'metrics-center-map' })
    return
  }
  router.push({ name: 'metrics-center' })
}

function viewVersion(version: number) {
  const v = metric.value?.versions.find(x => x.version === version)
  if (v && metric.value) {
    const snap = v.snapshot
    metric.value.businessDefinition = snap.businessDefinition
    metric.value.useCase = snap.useCase
    metric.value.calculationFrequency = snap.calculationFrequency
    metric.value.technicalDefinition = snap.technicalDefinition
    metric.value.technicalUsageNotes = snap.technicalUsageNotes
    metric.value.reportLocations = JSON.parse(JSON.stringify(snap.reportLocations))
    metric.value.resultTable = snap.resultTable
    metric.value.queryCode = snap.queryCode
    Message.info(`已切换到 v${version} 的内容`)
  }
}

function activateVersion(version: number) {
  try {
    const updated = MetricsCenterStore.activateVersion(props.id, version)
    if (updated) {
      metric.value = updated
      Message.success(`v${version} 已激活，原启用版本已归档`)
    }
  } catch (e: any) {
    Message.error(e.message)
  }
}

function deleteVersion(version: number) {
  try {
    const updated = MetricsCenterStore.deleteVersion(props.id, version)
    if (updated) {
      metric.value = updated
      Message.success(`v${version} 已删除`)
    }
  } catch (e: any) {
    Message.error(e.message)
  }
}

onMounted(() => {
  loadData()
})
</script>

<style lang="scss" scoped>
.metric-detail-page {
  padding: 16px 24px;

  .detail-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 16px;

    .header-left {
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }

    .header-info {
      .header-title {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 4px;

        .title-name { font-size: 20px; font-weight: 600; }
      }

      .header-meta {
        color: #86909c;
        font-size: 13px;
      }
    }
  }

  .detail-card {
    margin-bottom: 16px;
  }

  .section-content {
    h4 { margin: 0 0 8px; font-size: 14px; color: #4e5969; }
  }

  .completeness-cell {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  .completeness-label {
    font-size: 12px;
    color: #4e5969;
    margin-right: 4px;
  }

  .completeness-gaps {
    margin-top: 12px;
    font-size: 12px;
    color: #86909c;

    :deep(.arco-tag) { margin: 2px 4px 2px 0; }
  }

  .gap-text {
    color: #f53f3f;
    font-size: 12px;
  }

  .agent-doc {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px dashed #e5e6eb;
  }

  .block-subtitle {
    margin: 0 0 8px;
    font-size: 13px;
    color: #4e5969;
  }

  .enum-line {
    font-size: 12px;
    line-height: 1.8;
  }

  .dim-group-line {
    margin-bottom: 6px;
    font-size: 13px;
  }

  .derive-hint {
    margin-top: 8px;
    font-size: 12px;
    color: #86909c;
  }

  .lineage-flow {
    display: flex;
    gap: 24px;
    flex-wrap: wrap;
    margin-bottom: 16px;
  }

  .lineage-group {
    min-width: 180px;
    max-width: 280px;

    .lineage-group-title {
      font-size: 12px;
      color: #86909c;
      margin-bottom: 6px;
    }
  }

  .lineage-node {
    margin: 0 6px 6px 0;
    cursor: pointer;
  }

  .lineage-edges {
    border-top: 1px dashed #e5e6eb;
    padding-top: 12px;

    .lineage-edge {
      font-size: 12px;
      color: #4e5969;
      line-height: 2;
    }

    .edge-arrow { color: #165dff; margin: 0 4px; }
  }

  .rich-text-content {
    line-height: 1.8;
    :deep(p) { margin: 4px 0; }
  }

  .sql-block {
    background: #1e1e1e;
    color: #d4d4d4;
    padding: 12px 16px;
    border-radius: 4px;
    font-family: 'Fira Code', 'Monaco', monospace;
    font-size: 13px;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-all;
    max-height: 500px;
    overflow-y: auto;
    margin: 0;
  }

  .sql-block.collapsed {
    max-height: 120px;
    overflow: hidden;
    position: relative;

    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 40px;
      background: linear-gradient(transparent, #1e1e1e);
    }
  }
}
</style>
