<!--
  执行实例详情页（全域）
  - 一次跑批的完整现场：基本信息、结果指标、当次口径快照、域内明细、执行日志
  - 评估域明细 = 逐特征结果 + 产出报告；效果域明细 = 汰换/推荐命中清单 + 推送对象
  - 支持失败/部分成功实例重跑，可对比同任务其他执行轮次
-->
<template>
  <div class="run-detail-page">
    <DmtPageHeader :title="record ? `${record.taskName} · 第 ${record.seq} 次执行` : '执行实例详情'" show-back @back="goBack">
      <template #subtitle>
        <a-space v-if="record" size="mini">
          <a-tag :color="store.statusColor(record.status)">{{ store.statusLabel(record.status) }}</a-tag>
          <a-tag>{{ store.triggerLabel(record.trigger) }}</a-tag>
          <a-tag color="gray">{{ record.domainLabel }}</a-tag>
          <span class="run-id">{{ record.id }}</span>
        </a-space>
      </template>
      <template #extra>
        <a-space v-if="record">
          <a-button @click="openLog">
            <template #icon><icon-history /></template>
            执行日志
          </a-button>
          <a-button @click="goTask">
            <template #icon><icon-list /></template>
            所属任务
          </a-button>
          <a-button
            v-if="record.status === 'failed' || record.status === 'partial'"
            type="primary"
            :disabled="!canRetry"
            :loading="retrying"
            @click="handleRetry"
          >
            <template #icon><icon-undo /></template>
            重跑
          </a-button>
        </a-space>
      </template>
    </DmtPageHeader>

    <a-empty v-if="!record" description="执行实例不存在，可能已被清理">
      <a-button type="primary" @click="goBack">返回执行记录</a-button>
    </a-empty>

    <template v-else>
      <a-alert v-if="record.status === 'running'" type="info" class="run-alert">
        <template #icon><icon-loading /></template>
        该实例正在执行中，日志与结果会持续追加，可稍后刷新查看。
      </a-alert>
      <a-alert v-else-if="record.errorMessage" type="error" class="run-alert">
        <template #icon><icon-exclamation-circle-fill /></template>
        执行失败原因：{{ record.errorMessage }}
      </a-alert>
      <a-alert v-else-if="record.status === 'partial'" type="warning" class="run-alert">
        <template #icon><icon-exclamation-circle-fill /></template>
        {{ partialTip }}
      </a-alert>

      <a-row :gutter="16">
        <a-col :xs="24" :lg="16" :xl="17">
          <!-- 基本信息 -->
          <a-card title="基本信息" :bordered="false" class="detail-card">
            <a-descriptions :data="baseInfo" :column="3" size="medium" layout="inline-horizontal" />
          </a-card>

          <!-- 结果指标 -->
          <a-card :bordered="false" class="detail-card">
            <template #title>本次执行结果</template>
            <template #extra>
              <span class="hint">{{ metricsHint }}</span>
            </template>
            <a-row :gutter="12">
              <a-col v-for="m in record.metrics" :key="m.label" :span="6">
                <div class="metric-box">
                  <div class="metric-value">{{ m.value }}</div>
                  <div class="metric-label">{{ m.label }}</div>
                </div>
              </a-col>
            </a-row>
          </a-card>

          <!-- 执行后产出校验（契约第三段）：不符项登记在实例上，原本 success 的已因此降级 -->
          <a-card :bordered="false" class="detail-card">
            <template #title>产出契约校验</template>
            <template #extra>
              <span class="hint">契约只比对必产字段在不在，不重新算数值</span>
            </template>
            <a-alert v-if="record.status === 'running'" type="info" :show-icon="false">
              批次还在执行，产出校验在本轮收尾时进行，跑完后这里才会给出必产字段是否齐备的结论。
            </a-alert>
            <a-alert v-else-if="record.contractIssues === undefined" type="normal" :show-icon="false">
              该实例执行时还没开启产出校验（只有本轮之后新跑与重跑的批次会落校验结果），不回填历史数据。
            </a-alert>
            <a-alert v-else-if="!record.contractIssues.length" type="success" :show-icon="false">
              必产字段全部落档{{ record.domain === 'effect' ? '，判定六数与口径快照可回溯' : '，产出可安全回写特征档案' }}。
            </a-alert>
            <template v-else>
              <a-alert :type="record.status === 'partial' ? 'warning' : 'error'" class="contract-head">
                {{ contractHeadText }}
              </a-alert>
              <div v-for="(item, idx) in record.contractIssues" :key="idx" class="contract-line">
                <a-tag size="small" :color="item.level === 'blocker' ? 'red' : 'orange'">
                  {{ item.level === 'blocker' ? '必产缺失' : '格式存疑' }}
                </a-tag>
                <span class="contract-text">{{ item.message }}</span>
              </div>
              <a-link class="contract-jump" @click="goTask">去任务配置核对契约字段</a-link>
            </template>
          </a-card>

          <!-- 评估域：逐特征结果 + 产出报告 -->
          <template v-if="record.payload.kind === 'evaluation'">
            <a-card :bordered="false" class="detail-card">
              <template #title>评估对象执行结果（{{ record.payload.targets.length }}）</template>
              <a-table :columns="targetColumns" :data="record.payload.targets" :pagination="false" row-key="targetId" size="small">
                <template #targetName="{ record: row }">
                  <a-link @click="goVariable(row.targetId)">{{ row.targetName }}</a-link>
                </template>
                <template #targetStatus="{ record: row }">
                  <a-tag size="small" :color="row.status === 'success' ? 'green' : 'red'">
                    {{ row.status === 'success' ? '成功' : '失败' }}
                  </a-tag>
                </template>
                <template #targetReport="{ record: row }">
                  <a-link v-if="row.reportId" @click="openReport(row.reportId)">查看报告</a-link>
                  <span v-else class="muted">—</span>
                </template>
              </a-table>
            </a-card>

            <a-card :bordered="false" class="detail-card">
              <template #title>本次执行产出报告（{{ record.payload.reports.length }}）</template>
              <a-table :columns="reportColumns" :data="record.payload.reports" :pagination="false" row-key="id" size="small">
                <template #reportKind="{ record: row }">
                  <a-tag size="small" :color="reportKindColor(row.kind)">{{ reportKindLabel(row.kind) }}</a-tag>
                </template>
                <template #reportName="{ record: row }">
                  <a-link @click="openReport(row.id)">{{ row.name }}</a-link>
                </template>
                <template #reportVer="{ record: row }">
                  <a-tag v-if="row.scriptVersion" size="small" color="purple">v{{ row.scriptVersion }}</a-tag>
                  <span v-else class="muted">内置引擎</span>
                </template>
              </a-table>
            </a-card>
          </template>

          <!-- 效果域：命中清单 -->
          <template v-else>
            <a-card :bordered="false" class="detail-card">
              <template #title>本次判定命中名单</template>
              <template #extra>
                <span class="hint">{{ hitListHint }}</span>
              </template>
              <a-alert v-if="record.status === 'failed' || record.status === 'running'" type="info" class="hit-empty">
                {{ record.status === 'running' ? '批次执行中，名单尚未产出。' : '批次失败，未产出汰换 / 推荐名单。' }}
              </a-alert>
              <a-tabs v-else default-active-key="offline" type="rounded" size="small">
                <a-tab-pane key="offline" :title="`建议汰换（${record.payload.rows.offline.length}）`">
                  <a-table :columns="hitColumns" :data="record.payload.rows.offline" :pagination="false" row-key="variableId" size="small">
                    <template #hitName="{ record: row }">
                      <a-space direction="vertical" size="mini">
                        <a-link @click="goVariable(row.variableId)">{{ row.name }}</a-link>
                        <span class="muted">{{ row.code }}</span>
                      </a-space>
                    </template>
                    <template #hitVerdict="{ record: row }">
                      <a-tag size="small" color="red">{{ row.verdictLabel }}</a-tag>
                    </template>
                  </a-table>
                </a-tab-pane>
                <a-tab-pane key="online" :title="`推荐使用（${record.payload.rows.online.length}）`">
                  <a-table :columns="hitColumns" :data="record.payload.rows.online" :pagination="false" row-key="variableId" size="small">
                    <template #hitName="{ record: row }">
                      <a-space direction="vertical" size="mini">
                        <a-link @click="goVariable(row.variableId)">{{ row.name }}</a-link>
                        <span class="muted">{{ row.code }}</span>
                      </a-space>
                    </template>
                    <template #hitVerdict="{ record: row }">
                      <a-tag size="small" color="green">{{ row.verdictLabel }}</a-tag>
                    </template>
                  </a-table>
                </a-tab-pane>
              </a-tabs>
            </a-card>

            <a-card :bordered="false" class="detail-card">
              <template #title>名单推送</template>
              <!-- 推送不是终点：给一个回到效果分析的回看入口，才能看到这批名单后续被反馈成怎样 -->
              <template #extra>
                <a-link @click="goAnalysis">去效果分析回看</a-link>
              </template>
              <a-descriptions :column="1" size="medium">
                <a-descriptions-item label="推送开关">
                  <a-tag size="small" :color="record.payload.push.enabled ? 'green' : 'gray'">
                    {{ record.payload.push.enabled ? '已开启' : '已关闭' }}
                  </a-tag>
                </a-descriptions-item>
                <a-descriptions-item label="推送对象">
                  <a-space wrap size="mini">
                    <a-tag v-for="name in record.payload.push.names" :key="name" size="small">{{ name }}</a-tag>
                    <span v-if="!record.payload.push.names.length" class="muted">未配置推送对象</span>
                  </a-space>
                </a-descriptions-item>
              </a-descriptions>
            </a-card>
          </template>
        </a-col>

        <a-col :xs="24" :lg="8" :xl="7">
          <!-- 口径快照 -->
          <a-card :bordered="false" class="detail-card">
            <template #title>计算口径快照</template>
            <div class="caliber-head">
              <a-tag size="small" :color="record.caliber.kind === 'python' ? 'purple' : 'cyan'">
                {{ record.caliber.kind === 'python' ? 'Python 脚本' : '阈值规则' }}
              </a-tag>
              <span class="muted">{{ record.caliber.versionText }}</span>
            </div>
            <template v-if="record.caliber.items.length">
              <div
                v-for="(item, idx) in record.caliber.items"
                :key="`${item.label}-${idx}`"
                class="snapshot-item"
                :class="{ 'snapshot-item--link': !!item.id }"
                @click="openCaliberItem(item)"
              >
                <div class="snapshot-head">
                  <span class="snapshot-name">{{ item.label }}</span>
                  <a-tag v-if="item.version" size="small" color="purple">v{{ item.version }}</a-tag>
                  <span v-else class="snapshot-value">{{ item.valueText }}</span>
                </div>
                <div class="snapshot-meta">
                  <a-tag v-if="item.stale" size="small" color="orange">{{ item.staleText || '口径已变更' }}</a-tag>
                  <span v-else class="muted">{{ record.caliber.kind === 'python' ? '与脚本库当前版本一致' : '与当前判定配置一致' }}</span>
                </div>
              </div>
              <a-alert type="info" class="snapshot-tip">
                实例固定记录本次执行使用的{{ record.caliber.kind === 'python' ? '脚本版本' : '阈值口径' }}，
                配置后续变更不影响历史记录。
              </a-alert>
            </template>
            <a-empty v-else :description="record.caliber.summary" />
          </a-card>

          <!-- 执行日志 -->
          <a-card :bordered="false" class="detail-card">
            <template #title>执行日志</template>
            <template #extra>
              <a-link @click="openLog">全部 {{ record.logs.length }} 条</a-link>
            </template>
            <div class="log-console">
              <div v-for="(log, idx) in previewLogs" :key="idx" class="log-line" :class="`log-line--${log.level}`">
                <span class="log-time">{{ log.time.slice(11) }}</span>
                <span class="log-text">{{ log.message }}</span>
              </div>
            </div>
          </a-card>

          <!-- 同任务其他执行 -->
          <a-card :bordered="false" class="detail-card">
            <template #title>同任务执行轮次（{{ siblings.length }}）</template>
            <div class="sibling-list">
              <div
                v-for="item in siblings"
                :key="item.id"
                class="sibling-item"
                :class="{ active: item.id === record.id }"
                @click="goRun(item.id)"
              >
                <a-space size="mini">
                  <span class="sibling-seq">第 {{ item.seq }} 次</span>
                  <a-tag size="small" :color="store.statusColor(item.status)">{{ store.statusLabel(item.status) }}</a-tag>
                </a-space>
                <div class="sibling-meta">
                  <span>{{ item.startedAt }}</span>
                  <span>{{ siblingBrief(item) }}</span>
                </div>
              </div>
            </div>
          </a-card>
        </a-col>
      </a-row>
    </template>

    <RunLogDrawer ref="logDrawerRef" />

    <!-- 评估报告详情 -->
    <a-modal v-model:visible="reportVisible" title="评估报告" :width="620" :footer="false" unmount-on-close>
      <template v-if="currentReport">
        <a-descriptions :column="1" size="medium" class="report-desc">
          <a-descriptions-item label="报告名称">{{ currentReport.name }}</a-descriptions-item>
          <a-descriptions-item label="类型">{{ reportKindLabel(currentReport.kind) }}</a-descriptions-item>
          <a-descriptions-item label="评估特征">{{ currentReport.variableName }}</a-descriptions-item>
          <a-descriptions-item label="生成时间">{{ currentReport.generatedAt }}</a-descriptions-item>
          <a-descriptions-item v-if="currentReport.scriptId" label="计算口径">
            <a-space size="mini">
              <a-link @click="goReportScript">{{ reportScriptName }}</a-link>
              <a-tag v-if="currentReport.scriptVersion" size="small" color="purple">
                v{{ currentReport.scriptVersion }}
              </a-tag>
            </a-space>
          </a-descriptions-item>
          <a-descriptions-item label="结论摘要">{{ currentReport.summary }}</a-descriptions-item>
        </a-descriptions>
      </template>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import DmtPageHeader from '@/modules/variable-hub/components/PageHeader.vue'
import RunLogDrawer from '@/modules/variable-hub/components/run-record/RunLogDrawer.vue'
import { RunRecordStore, type RunCaliberItem, type RunRecord } from '@/modules/variable-hub/mock/run-record/run-record-store'
import { issueSummary } from '@/modules/variable-hub/mock/task-center/io-contract'
import type { EvaluationTaskReport } from '@/modules/variable-hub/mock/evaluation/evaluation-task-store'
import { UserContext, PERMISSIONS } from '@/modules/variable-hub/mock/risk-feature/permissions'

const store = RunRecordStore

const route = useRoute()
const router = useRouter()

const runId = computed(() => String(route.params.id || ''))
const record = ref<RunRecord>()
const siblings = ref<RunRecord[]>([])
const logDrawerRef = ref()
const reportVisible = ref(false)
const currentReport = ref<EvaluationTaskReport>()
const retrying = ref(false)

const canRunEffect = computed(() => UserContext.has(PERMISSIONS.RUN_EFFECT_TASK))
const canRetry = computed(() => {
  const r = record.value
  if (!r || r.status === 'running') {
    return false
  }
  if (r.domain === 'effect' && !canRunEffect.value) {
    return false
  }
  return !siblings.value.some((item) => item.status === 'running')
})

/** 效果域批次号只在效果分支有意义，基本信息按域补一行 */
const domainExtraInfo = computed(() => {
  const r = record.value
  if (!r) {
    return []
  }
  if (r.payload.kind === 'effect') {
    return [
      { label: '批次号', value: r.payload.batchNo },
      { label: '扫描范围', value: `${r.payload.scope} 个变量` },
      { label: '剔除不判定', value: `${r.payload.excludedByCalls + r.payload.excludedByMissing} 个` }
    ]
  }
  return [{ label: '特征成功 / 总数', value: `${r.payload.targetSuccess} / ${r.payload.targetTotal}` }]
})

const baseInfo = computed(() => {
  const r = record.value
  if (!r) {
    return []
  }
  return [
    { label: '实例 ID', value: r.id },
    { label: '业务域', value: r.domainLabel },
    { label: '所属任务', value: `${r.taskId} ${r.taskName}` },
    { label: '执行轮次', value: `第 ${r.seq} 次` },
    { label: '开始时间', value: r.startedAt },
    { label: '结束时间', value: r.finishedAt || '—' },
    { label: '耗时', value: store.formatDuration(r.durationMs) },
    { label: '触发方式', value: store.triggerLabel(r.trigger) },
    { label: '触发人', value: r.triggeredBy },
    ...domainExtraInfo.value
  ]
})

const metricsHint = computed(() =>
  record.value?.payload.kind === 'effect'
    ? '计数取自批次落库结果，名单由当次阈值快照扫描得出'
    : '指标由本次执行产出的报告汇总而得'
)

/** 降级原因：契约不符项把原本的 success 拉成 partial，一句话先把结论说清 */
const contractHeadText = computed(() => {
  const r = record.value
  if (!r || !r.contractIssues?.length) {
    return ''
  }
  const blockers = r.contractIssues.filter((i) => i.level === 'blocker').length
  const head = r.status === 'partial'
    ? '产出与契约对不上，本轮已由成功降级为部分成功：'
    : `产出契约校验发现 ${r.contractIssues.length} 项不符（其中必产缺失 ${blockers} 项）：`
  return `${head}${issueSummary(r.contractIssues)}`
})

const partialTip = computed(() => {
  const r = record.value
  if (!r) {
    return ''
  }
  const contractPart = r.contractIssues?.length ? '；且必产字段没齐，下游回写 / 名单会缺项' : ''
  if (r.payload.kind === 'effect') {
    return `部分完成：${r.payload.excludedByMissing} 个变量因上游缺数只出观察结论，名单建议先复核再落地${contractPart}。`
  }
  return `部分完成：${r.payload.targetSuccess} 个特征成功，${r.payload.targetFailed} 个失败，失败特征未产出报告${contractPart}。`
})

/** 命中清单是抽样头部，全量口径在指标卡里，这里要说清避免误读 */
const hitListHint = computed(() => {
  const r = record.value
  if (!r || r.payload.kind !== 'effect') {
    return ''
  }
  const total = r.payload.hit
  const shown = r.payload.rows.offline.length + r.payload.rows.online.length
  return total > shown
    ? `按当次阈值扫描抽样展示前 ${shown} 条（本批次命中 ${total} 个）`
    : `按当次阈值扫描展示全部命中变量`
})

const previewLogs = computed(() => (record.value?.logs || []).slice(-8))

const targetColumns = [
  { title: '特征', slotName: 'targetName', width: 200 },
  { title: '结果', slotName: 'targetStatus', width: 90 },
  { title: '说明 / 摘要', dataIndex: 'message', ellipsis: 'tooltip' },
  { title: '报告', slotName: 'targetReport', width: 100 }
]

const reportColumns = [
  { title: '类型', slotName: 'reportKind', width: 90 },
  { title: '报告名称', slotName: 'reportName', ellipsis: 'tooltip' },
  { title: '口径版本', slotName: 'reportVer', width: 110 },
  { title: '生成时间', dataIndex: 'generatedAt', width: 170 }
]

const hitColumns = [
  { title: '变量', slotName: 'hitName', width: 220 },
  { title: '综合效果指数', dataIndex: 'effectIndex', width: 120 },
  { title: '月调用量', dataIndex: 'callCount', width: 110 },
  { title: '缺失率', dataIndex: 'missingRate', width: 100 },
  { title: '结论', slotName: 'hitVerdict', width: 90 },
  { title: '判定理由', dataIndex: 'reason', ellipsis: 'tooltip' }
]

const reportKindLabel = (kind?: string) => (kind === 'external' ? '外数' : kind === 'python' ? 'Python' : '内部')
const reportKindColor = (kind?: string) => (kind === 'external' ? 'arcoblue' : kind === 'python' ? 'purple' : 'green')

const siblingBrief = (item: RunRecord) => {
  if (item.payload.kind === 'effect') {
    return `命中 ${item.payload.hit}`
  }
  return `${item.payload.targetSuccess}/${item.payload.targetTotal}`
}

function reload() {
  record.value = RunRecordStore.getById(runId.value)
  siblings.value = record.value ? RunRecordStore.listByTask(record.value.domain, record.value.taskId) : []
}

// 实例之间互跳（同任务其他轮次、重跑后新实例）不会重新挂载，需要监听参数变化
watch(runId, () => {
  currentReport.value = undefined
  reload()
})

const goBack = () => router.push('/runs')
/** 效果分析落在一体化总览的推荐表（方案 C 不单独设菜单） */
const goAnalysis = () => router.push({ path: '/variable-hub', hash: '#recommend' })
const goRun = (id: string) => router.push(`/runs/${id}`)
const goScript = (id: string) => router.push(`/tasks/scripts/${id}`)
const goVariable = (id: string) => router.push(`/variable-management/detail/${id}`)
const openLog = () => logDrawerRef.value?.open(record.value)

/** 口径条目：评估域是脚本可跳详情，效果域只是阈值取值 */
function openCaliberItem(item: RunCaliberItem) {
  if (item.id) {
    goScript(item.id)
  }
}

/** 所属任务按域分流 */
function goTask() {
  const r = record.value
  if (!r) {
    return
  }
  if (r.domain === 'effect') {
    router.push(`/tasks/effect/${r.taskId}`)
    return
  }
  router.push({ path: '/tasks', query: { tab: 'tasks', taskId: r.taskId } })
}

/** 报告对应脚本在实例中的口径名称（快照） */
const reportScriptName = computed(() => {
  const id = currentReport.value?.scriptId
  if (!id) {
    return ''
  }
  return record.value?.caliber.items.find((i) => i.id === id)?.label || id
})

const goReportScript = () => {
  if (currentReport.value?.scriptId) {
    goScript(currentReport.value.scriptId)
  }
}

const openReport = (reportId: string) => {
  const payload = record.value?.payload
  const target = payload && payload.kind === 'evaluation' ? payload.reports.find((r) => r.id === reportId) : undefined
  if (!target) {
    Message.warning('未找到该报告记录')
    return
  }
  currentReport.value = target
  reportVisible.value = true
}

const handleRetry = async () => {
  const origin = record.value
  if (!origin) {
    return
  }
  const started = RunRecordStore.rerunStart(origin.id, UserContext.get().name || 'Demo 用户')
  if (!started) {
    Message.warning('该任务已有实例在执行中，请稍后再试')
    reload()
    return
  }
  retrying.value = true
  record.value = started
  siblings.value = RunRecordStore.listByTask(started.domain, started.taskId)
  Message.info('重跑实例已创建，正在执行…')
  await new Promise((resolve) => setTimeout(resolve, 1600))
  const finished = RunRecordStore.rerunFinish(started.id, 'success')
  retrying.value = false
  Message.success(finished ? `重跑完成：${finished.resultText}` : '重跑已结束，刷新查看结果')
  if (finished) {
    // 跳转到新实例，保留失败实例记录
    router.replace(`/runs/${finished.id}`)
  }
  reload()
}

onMounted(reload)
</script>

<style scoped lang="less">
.run-detail-page {
  padding: 16px;
}

.run-alert {
  margin-bottom: 16px;
}

.detail-card {
  margin-bottom: 16px;
  border-radius: 8px;
}

.run-id {
  font-family: 'Menlo', 'Monaco', monospace;
  font-size: 12px;
  color: var(--color-text-3);
}

.hint {
  font-size: 12px;
  color: var(--color-text-4);
}

.muted {
  color: var(--color-text-4);
}

.metric-box {
  border: 1px solid var(--color-border-2);
  border-radius: 6px;
  padding: 12px;
  text-align: center;
}

.metric-value {
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text-1);
}

.metric-label {
  margin-top: 4px;
  font-size: 12px;
  color: var(--color-text-3);
}

.caliber-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  font-size: 12px;
}

.snapshot-item {
  padding: 10px 12px;
  border: 1px solid var(--color-border-2);
  border-radius: 6px;
  margin-bottom: 8px;
  transition: all 0.2s;
}

.snapshot-item--link {
  cursor: pointer;
}

.snapshot-item--link:hover {
  border-color: rgb(var(--primary-6));
  background: var(--color-primary-light-1);
}

.snapshot-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.snapshot-name {
  font-weight: 500;
  color: var(--color-text-1);
}

.snapshot-value {
  font-size: 13px;
  color: var(--color-text-2);
}

.snapshot-meta {
  margin-top: 6px;
  font-size: 12px;
}

.snapshot-tip {
  margin-top: 4px;
  font-size: 12px;
}

.hit-empty {
  font-size: 12px;
}

/* 产出契约校验：不符项逐行列出，标签只分「必产缺失 / 格式存疑」两档 */
.contract-head {
  margin-bottom: 10px;
}
.contract-line {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 6px 0;
  font-size: 13px;
  line-height: 1.7;
  border-bottom: 1px dashed var(--color-border-2);

  &:last-of-type {
    border-bottom: none;
  }
}
.contract-text {
  flex: 1;
  min-width: 0;
  color: var(--color-text-1);
}
.contract-jump {
  display: inline-block;
  margin-top: 8px;
  font-size: 12px;
}

.log-console {
  background: #1d2129;
  border-radius: 6px;
  padding: 10px 12px;
  max-height: 260px;
  overflow: auto;
  font-family: 'Menlo', 'Monaco', monospace;
  font-size: 12px;
  line-height: 1.7;
}

.log-line {
  display: flex;
  gap: 8px;
  color: #c9cdd4;
  white-space: pre-wrap;
  word-break: break-all;
}

.log-time {
  flex: none;
  color: #86909c;
}

.log-line--warn .log-text {
  color: #ffcf5c;
}

.log-line--error .log-text {
  color: #f76965;
}

.sibling-item {
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid transparent;
}

.sibling-item:hover {
  background: var(--color-fill-2);
}

.sibling-item.active {
  background: var(--color-primary-light-1);
  border-color: rgb(var(--primary-6));
}

.sibling-seq {
  font-weight: 500;
  color: var(--color-text-1);
}

.sibling-meta {
  display: flex;
  justify-content: space-between;
  margin-top: 4px;
  font-size: 12px;
  color: var(--color-text-3);
}

.report-desc {
  margin-bottom: 0;
}
</style>
