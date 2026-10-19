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
            <a-tag v-if="metric.type === 'regulatory' && metric.version" size="small" color="purple">v{{ metric.version }}</a-tag>
            <a-badge :status="statusMap[metric.status]" :text="statusText[metric.status]" />
          </div>
          <div class="header-meta">
            <span>{{ metric.domain }}</span>
            <a-divider direction="vertical" />
            <span>{{ metric.scenario }}</span>
            <a-divider direction="vertical" />
            <span>指标ID：{{ metric.id }}</span>
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
          <a-button @click="goEdit">
            <template #icon><IconEdit /></template>
            编辑
          </a-button>
          <a-popconfirm v-if="metric.status === 'active'" content="确定停用该指标？" @ok="handleArchive">
            <a-button status="warning">停用</a-button>
          </a-popconfirm>
          <a-popconfirm v-if="metric.status === 'inactive'" content="确定启用该指标？" @ok="handleReactivate">
            <a-button type="primary">启用</a-button>
          </a-popconfirm>
        </a-space>
      </div>
    </div>

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
            </div>
          </a-descriptions-item>
        </a-descriptions>
        <div v-if="completeness.metaMissing.length" class="completeness-gaps">
          缺口：
          <a-tag v-for="g in completeness.metaMissing" :key="'m-' + g" color="orange" size="small">{{ g }}</a-tag>
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
        </div>
        <a-table :data="consumers" :pagination="false" row-key="cardKey" size="small" style="margin-top: 12px">
          <template #columns>
            <a-table-column title="消费方" data-index="boardTitle" :width="180" />
            <a-table-column title="看板卡片" data-index="cardTitle" :width="160" />
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

      <!-- 版本历史（仅监管指标） -->
      <a-card v-if="metric.type === 'regulatory' && metric.versions?.length" class="detail-card">
        <template #title>
          版本历史
          <a-tag size="small" color="purple" style="margin-left: 8px">当前 v{{ metric.version }}</a-tag>
        </template>
        <a-table :data="metric.versions" :pagination="false" row-key="version" size="small">
          <template #columns>
            <a-table-column title="版本" :width="80">
              <template #cell="{ record }">
                <a-tag :color="record.version === metric.version ? 'purple' : 'gray'" size="small">v{{ record.version }}</a-tag>
                <span v-if="record.version === metric.version" style="margin-left: 4px; font-size: 12px; color: #722ed1;">当前</span>
              </template>
            </a-table-column>
            <a-table-column title="变更说明" data-index="changeNote" />
            <a-table-column title="变更时间" data-index="createdAt" :width="180" />
            <a-table-column title="变更人" data-index="createdBy" :width="100" />
            <a-table-column title="操作" :width="160">
              <template #cell="{ record }">
                <a-button type="text" size="small" @click="openVersionSnapshot(record.version)">查看快照</a-button>
                <a-popconfirm
                  v-if="record.version !== metric.version"
                  :content="`确定激活 v${record.version}？将以此版本内容覆盖当前指标，并生成新版本。`"
                  @ok="handleActivateVersion(record.version)"
                >
                  <a-button type="text" size="small" status="warning">激活此版本</a-button>
                </a-popconfirm>
              </template>
            </a-table-column>
          </template>
        </a-table>
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

    <!-- 版本快照查看弹窗 -->
    <a-modal v-model:visible="snapshotVisible" :title="`版本快照 v${viewingVersion?.version ?? ''}`" :footer="false" width="720px" unmount-on-close>
      <a-descriptions v-if="viewingVersion" :column="2" bordered size="small">
        <a-descriptions-item label="指标名称">{{ viewingVersion.snapshot.name }}</a-descriptions-item>
        <a-descriptions-item label="指标编码">{{ viewingVersion.snapshot.code }}</a-descriptions-item>
        <a-descriptions-item label="指标域">{{ viewingVersion.snapshot.domain }}</a-descriptions-item>
        <a-descriptions-item label="归属场景">{{ viewingVersion.snapshot.scenario }}</a-descriptions-item>
        <a-descriptions-item label="业务负责人">{{ viewingVersion.snapshot.businessOwner }}</a-descriptions-item>
        <a-descriptions-item label="技术负责人">{{ viewingVersion.snapshot.technicalOwner }}</a-descriptions-item>
        <a-descriptions-item label="计算时效">{{ frequencyLabel(viewingVersion.snapshot.calculationFrequency) }}</a-descriptions-item>
        <a-descriptions-item label="来源类型">{{ optionLabel(SOURCE_TYPE_OPTIONS, viewingVersion.snapshot.sourceType) || '未填写' }}</a-descriptions-item>
        <a-descriptions-item label="业务口径" :span="2">
          <div class="rich-text-content" v-html="viewingVersion.snapshot.businessDefinition"></div>
        </a-descriptions-item>
        <a-descriptions-item v-if="viewingVersion.snapshot.useCase" label="使用场景" :span="2">
          <div class="rich-text-content" v-html="viewingVersion.snapshot.useCase"></div>
        </a-descriptions-item>
        <a-descriptions-item label="技术口径" :span="2">
          <pre class="sql-block" style="max-height: 200px">{{ viewingVersion.snapshot.technicalDefinition }}</pre>
        </a-descriptions-item>
        <a-descriptions-item v-if="viewingVersion.snapshot.resultTable" label="结果表" :span="2">{{ viewingVersion.snapshot.resultTable }}</a-descriptions-item>
      </a-descriptions>
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
import {
  FREQUENCY_OPTIONS, SOURCE_TYPE_OPTIONS, GRANULARITY_OPTIONS,
} from '@/mock-dca/metrics-center/data'
import type { MetricItem, MetricVersion, LineageNode, LineageNodeType } from '@/mock-dca/metrics-center/types'

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

const statusMap: Record<string, string> = { active: 'success', inactive: 'default' }
const statusText: Record<string, string> = { active: '启用', inactive: '停用' }

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

/* ---------------- 版本管理（仅监管指标） ---------------- */
const snapshotVisible = ref(false)
const viewingVersion = ref<MetricVersion | undefined>()

function openVersionSnapshot(version: number) {
  const v = metric.value?.versions?.find(item => item.version === version)
  if (!v) {
    Message.error('版本不存在')
    return
  }
  viewingVersion.value = v
  snapshotVisible.value = true
}

function handleActivateVersion(version: number) {
  try {
    const updated = MetricsCenterStore.activateVersion(props.id, version)
    if (updated) {
      metric.value = updated
      Message.success(`已激活历史版本 v${version}，当前版本 v${updated.version}`)
    }
  } catch (e: any) {
    Message.error(e.message || '激活失败')
  }
}

/* ---------------- 生命周期动作 ---------------- */
function handleArchive() {
  try {
    MetricsCenterStore.archive(props.id)
    loadData()
    Message.success('指标已停用')
  } catch (e: any) {
    Message.error(e.message || '操作失败')
  }
}

function handleReactivate() {
  try {
    MetricsCenterStore.reactivate(props.id)
    loadData()
    Message.success('指标已启用')
  } catch (e: any) {
    Message.error(e.message || '操作失败')
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
