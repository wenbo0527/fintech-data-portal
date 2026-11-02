<!--
  任务管理 · 评估任务详情（评估域自封装的抽屉载体）
  - 统一任务列表只负责「哪一行被点开」，评估域的字段、报告、脚本口径都留在本组件
  - 详情载体由 task-kinds 注册表决定：评估域 = drawer（本组件），效果域 = 独立路由页
  - store 基于 localStorage 无响应式，每次 open 都重新装载，写操作后由调用方再 open
-->
<template>
  <a-drawer :visible="visible" :width="880" title="评估任务详情" unmount-on-close @cancel="close">
    <template v-if="record && task">
      <!-- 顶部 Header：任务名 + 状态 + 横向字段带 -->
      <div class="detail-header">
        <div class="detail-header-top">
          <h3 class="detail-title">{{ record.name }}</h3>
          <a-tag :color="record.statusColor" size="medium">{{ record.statusLabel }}</a-tag>
          <a-tag :color="record.tagColor" size="medium">{{ record.domainLabel }} · {{ record.kindLabel }}</a-tag>
        </div>
        <div class="detail-field-strip">
          <div class="detail-field-cell">
            <div class="detail-field-label">任务 ID</div>
            <div class="detail-field-value">{{ record.id }}</div>
          </div>
          <div class="detail-field-cell">
            <div class="detail-field-label">数据源</div>
            <div class="detail-field-value">{{ task.dataSourceName || '—' }}</div>
          </div>
          <div class="detail-field-cell">
            <div class="detail-field-label">特征类型</div>
            <div class="detail-field-value">{{ task.variableTypeName || '—' }}</div>
          </div>
          <div class="detail-field-cell">
            <div class="detail-field-label">负责人</div>
            <div class="detail-field-value">{{ task.owner }}</div>
          </div>
          <div class="detail-field-cell">
            <div class="detail-field-label">创建时间</div>
            <div class="detail-field-value">{{ task.createdAt }}</div>
          </div>
          <div class="detail-field-cell">
            <div class="detail-field-label">完成时间</div>
            <div class="detail-field-value">{{ task.finishedAt || '—' }}</div>
          </div>
        </div>
        <div class="detail-description">
          <div class="detail-description-label">任务说明</div>
          <div class="detail-description-value">{{ task.description || '—' }}</div>
        </div>
      </div>

      <!-- 判定口径提示：评估域的口径就是它锁定的 Python 脚本，没有任务级阈值 -->
      <a-alert type="normal" class="detail-caliber-alert">
        评估任务的判定口径由所选 Python 脚本决定（可在「脚本管理」查看与改版）；
        本域没有任务级阈值配置，任务级阈值只在效果任务的新建与详情里维护。
      </a-alert>

      <!-- 输入输出契约：状态、不符项与字段清单，数字全部来自聚合层，抽屉不自己算 -->
      <TaskContractCard :contract="record.contract" :kind="record.kind" />

      <!-- 指标带：4 个指标横向 4 等分 -->
      <div v-if="task.metrics" class="detail-metric-strip">
        <div class="detail-metric-cell">
          <div class="metric-label">覆盖率</div>
          <div class="metric-value">{{ metricPercent(task.metrics.coverage) }}</div>
        </div>
        <div class="detail-metric-cell">
          <div class="metric-label">通过率</div>
          <div class="metric-value">{{ metricPercent(task.metrics.passRate) }}</div>
        </div>
        <div class="detail-metric-cell">
          <div class="metric-label">IV</div>
          <div class="metric-value">{{ metricNumber(task.metrics.iv) }}</div>
        </div>
        <div class="detail-metric-cell">
          <div class="metric-label">KS</div>
          <div class="metric-value">{{ metricNumber(task.metrics.ks) }}</div>
        </div>
      </div>

      <!-- 结果摘要 -->
      <a-alert v-if="task.resultSummary" type="info" :show-icon="false" class="detail-summary">
        {{ task.resultSummary }}
      </a-alert>

      <!-- 常态性评估：调度配置与 Python 计算脚本 -->
      <a-card v-if="task.taskType === 'routine'" title="调度与计算口径" :bordered="false" class="detail-schedule-card">
        <a-descriptions :column="3" size="small">
          <a-descriptions-item label="调度频率">{{ frequencyLabel(task.routineConfig?.frequency) }}</a-descriptions-item>
          <a-descriptions-item label="执行时间">{{ task.routineConfig?.scheduleTime || '—' }}</a-descriptions-item>
          <a-descriptions-item label="启用状态">
            <a-tag size="small" :color="task.routineConfig?.enabled ? 'green' : 'gray'">
              {{ task.routineConfig?.enabled ? '已启用' : '已停用' }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="上次执行">{{ task.routineConfig?.lastRunAt || '—' }}</a-descriptions-item>
          <a-descriptions-item label="上次结果">{{ task.routineConfig?.lastRunResult || '—' }}</a-descriptions-item>
          <a-descriptions-item label="下次执行">{{ task.routineConfig?.nextRunAt || '—' }}</a-descriptions-item>
        </a-descriptions>
        <a-divider style="margin: 12px 0" />
        <div class="script-ref-title">Python 脚本（{{ task.pythonScripts?.length || 0 }}）</div>
        <a-space wrap>
          <a-tag
            v-for="sref in task.pythonScripts || []"
            :key="sref.id"
            color="arcoblue"
            class="script-ref-tag"
            @click="goScriptDetail(sref.id)"
          >
            {{ sref.name }}
            <span v-if="sref.currentVersion" class="script-ref-ver">v{{ sref.currentVersion }}</span>
            <a-tag v-if="isScriptStale(sref)" color="orange" size="small">非最新</a-tag>
          </a-tag>
          <span v-if="!task.pythonScripts?.length" class="muted">未配置 Python 脚本</span>
        </a-space>
      </a-card>

      <!-- 执行记录：任务每一次跑批都会产生一个执行实例 -->
      <a-card :bordered="false" class="detail-runs-card">
        <template #title>执行记录（{{ runs.length }}）</template>
        <template #extra>
          <a-link @click="router.push('/runs')">全部执行记录</a-link>
        </template>
        <a-table
          v-if="runs.length"
          :data="runs.slice(0, 5)"
          :pagination="false"
          row-key="id"
          size="small"
          :bordered="false"
        >
          <template #columns>
            <a-table-column title="轮次" :width="70">
              <template #cell="{ record: r }">第 {{ r.seq }} 次</template>
            </a-table-column>
            <a-table-column title="触发方式" :width="120">
              <template #cell="{ record: r }">{{ triggerLabel(r.trigger) }}</template>
            </a-table-column>
            <a-table-column title="开始时间" data-index="startedAt" :width="170" />
            <a-table-column title="耗时" :width="90">
              <template #cell="{ record: r }">{{ formatDuration(r.durationMs) }}</template>
            </a-table-column>
            <a-table-column title="结果" :width="150">
              <template #cell="{ record: r }">
                <a-space size="mini">
                  <a-tag size="small" :color="runStatusColor(r.status)">{{ runStatusLabel(r.status) }}</a-tag>
                  <span class="muted">{{ r.targetSuccess }}/{{ r.targetTotal }}</span>
                </a-space>
              </template>
            </a-table-column>
            <a-table-column title="操作" :width="70" fixed="right">
              <template #cell="{ record: r }">
                <a-button type="text" size="mini" @click="goRunDetail(r.id)">详情</a-button>
              </template>
            </a-table-column>
          </template>
        </a-table>
        <a-empty v-else description="该任务尚无执行记录" />
      </a-card>

      <!-- 目标特征 + 评估报告 左右两列 -->
      <a-row :gutter="16" class="detail-row">
        <a-col :span="12">
          <a-card title="目标特征" :bordered="false">
            <a-table :data="task.targets" :pagination="false" row-key="id" :bordered="false">
              <template #columns>
                <a-table-column title="特征名称" data-index="name" />
                <a-table-column title="编码" data-index="code" :width="160" />
                <a-table-column title="来源" :width="80">
                  <template #cell="{ record: t }">
                    <a-tag size="small">{{ sourceTypeLabel(t.sourceType) }}</a-tag>
                  </template>
                </a-table-column>
              </template>
              <template #empty><a-empty description="暂无目标特征" /></template>
            </a-table>
          </a-card>
        </a-col>
        <a-col :span="12">
          <a-card title="评估报告" :bordered="false">
            <template v-if="task.reports.length">
              <a-alert v-if="externalReportCount" type="success" :show-icon="false" class="detail-mini-alert">
                外数评估能力已生成 {{ externalReportCount }} 份报告并回写特征档案。
              </a-alert>
              <a-table :data="task.reports" :pagination="false" row-key="id" :bordered="false">
                <template #columns>
                  <a-table-column title="类型" :width="90">
                    <template #cell="{ record: rep }">
                      <a-tag size="small" :color="reportKindColor(rep.kind)">{{ reportKindLabel(rep.kind) }}</a-tag>
                    </template>
                  </a-table-column>
                  <a-table-column title="报告名称" data-index="name" />
                  <a-table-column title="操作" :width="100" fixed="right">
                    <template #cell="{ record: rep }">
                      <a-button v-if="rep.kind === 'external'" type="text" size="mini" @click="openExternalReport(rep)">
                        跳转
                      </a-button>
                      <a-button
                        v-else-if="rep.kind === 'python'"
                        type="text"
                        size="mini"
                        @click="goScriptDetail(rep.scriptId || '')"
                      >
                        查看脚本
                      </a-button>
                      <a-button v-else type="text" size="mini" @click="openInternalReport(rep)">查看</a-button>
                    </template>
                  </a-table-column>
                </template>
              </a-table>
            </template>
            <a-empty v-else description="该任务尚未生成评估报告" />
          </a-card>
        </a-col>
      </a-row>
    </template>

    <!-- 内部评估报告预览 -->
    <a-modal
      v-model:visible="internalPreviewVisible"
      :title="internalPreviewContent?.name || '评估报告（内部）'"
      :width="560"
      :footer="false"
      unmount-on-close
    >
      <a-descriptions v-if="internalPreviewContent" :column="1" bordered>
        <a-descriptions-item label="报告 ID">{{ internalPreviewContent.id }}</a-descriptions-item>
        <a-descriptions-item label="报告类型">内部报告（DMT 评估引擎）</a-descriptions-item>
        <a-descriptions-item label="报告名称">{{ internalPreviewContent.name }}</a-descriptions-item>
        <a-descriptions-item v-if="internalPreviewContent.variableName" label="关联特征">
          <a-link @click="goToVariable(internalPreviewContent.variableId!)">
            {{ internalPreviewContent.variableName }}
          </a-link>
        </a-descriptions-item>
        <a-descriptions-item label="生成时间">{{ internalPreviewContent.generatedAt }}</a-descriptions-item>
        <a-descriptions-item label="结论摘要">{{ internalPreviewContent.summary }}</a-descriptions-item>
      </a-descriptions>
    </a-modal>
  </a-drawer>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Message } from '@arco-design/web-vue'
import { useRouter } from 'vue-router'
import EvaluationTaskStore, {
  formatDuration,
  runStatusLabel,
  runStatusColor,
  triggerLabel,
  type EvaluationTaskMock,
  type EvaluationTaskReport,
  type PythonScriptRef
} from '@/modules/variable-hub/mock/evaluation/evaluation-task-store'
import TaskContractCard from '../TaskContractCard.vue'
import { frequencyLabel } from '@/modules/variable-hub/mock/task-center/task-kinds'
import { buildRiskAppUrl } from '@/utils/appLinks'
import type { TaskRecord } from '@/modules/variable-hub/mock/task-center/task-record'

const router = useRouter()

const visible = ref(false)
/** 当前查看的行：头部字段直接用它，避免与列表两处文案不一致 */
const record = ref<TaskRecord | null>(null)
/** 详情正文取域内原始对象：列表行只带公共字段 */
const task = computed<EvaluationTaskMock | null>(() => (record.value ? (record.value.raw as EvaluationTaskMock) : null))
const runs = computed(() => (task.value ? EvaluationTaskStore.listRunsByTask(task.value.id) : []))
const externalReportCount = computed(() => (task.value ? task.value.reports.filter((r) => r.kind === 'external').length : 0))

const internalPreviewVisible = ref(false)
const internalPreviewContent = ref<EvaluationTaskReport | null>(null)

/** 由统一列表调用：传入被点开的行 */
const open = (row: TaskRecord) => {
  record.value = row
  visible.value = true
}

const close = () => {
  visible.value = false
}

defineExpose({ open })

const openInternalReport = (rep: EvaluationTaskReport) => {
  internalPreviewContent.value = rep
  internalPreviewVisible.value = true
}

const openExternalReport = (rep: EvaluationTaskReport) => {
  // 透传 risk-app 链接（与特征档案「查看外数评估」一致）
  const target = rep.url?.startsWith('http') ? rep.url : buildRiskAppUrl(rep.url)
  window.open(target, '_blank')
}

const goToVariable = (variableId: string) => {
  router.push({ name: 'VariableAssetDetail', params: { id: variableId, mode: 'view' } })
}

const goRunDetail = (runId?: string) => {
  if (!runId) {
    return
  }
  router.push(`/runs/${runId}`)
}

const goScriptDetail = (id?: string) => {
  if (!id) {
    Message.warning('该报告未关联 Python 脚本')
    return
  }
  router.push(`/tasks/scripts/${id}`)
}

/** 任务快照记录的脚本版本落后于脚本库当前版本，说明口径已升级、任务仍按旧版本配置 */
const isScriptStale = (ref: PythonScriptRef) => {
  if (!ref.currentVersion) {
    return false
  }
  const live = EvaluationTaskStore.getPythonScriptById(ref.id)
  return !!live && live.currentVersion > ref.currentVersion
}

const reportKindLabel = (kind?: string) => (kind === 'external' ? '外数' : kind === 'python' ? 'Python' : '内部')
const reportKindColor = (kind?: string) => (kind === 'external' ? 'arcoblue' : kind === 'python' ? 'purple' : 'green')
const sourceTypeLabel = (value?: string) =>
  ({ external: '外数', internal: '内数', credit: '征信' }[value || ''] || '—')
const metricPercent = (value?: number) => (typeof value === 'number' ? `${Math.round(value * 100)}%` : '—')
const metricNumber = (value?: number) => (typeof value === 'number' ? value.toFixed(2) : '—')
</script>

<style scoped>
.detail-caliber-alert {
  margin-bottom: 12px;
  font-size: 12px;
}

.detail-header {
  background: var(--color-fill-1);
  border: 1px solid var(--color-border-2);
  border-radius: 8px;
  padding: 16px 20px;
  margin-bottom: 16px;
}

.detail-header-top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.detail-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-1);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-field-strip {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 0;
  background: #fff;
  border-radius: 6px;
  padding: 4px 0;
  border: 1px solid var(--color-border-2);
}

.detail-field-cell {
  position: relative;
  padding: 6px 14px;
  min-width: 0;
}

.detail-field-cell + .detail-field-cell::before {
  content: "";
  position: absolute;
  left: 0;
  top: 6px;
  bottom: 6px;
  width: 1px;
  background: var(--color-border-2);
}

.detail-field-label {
  color: var(--color-text-3);
  font-size: 12px;
  margin-bottom: 4px;
}

.detail-field-value {
  color: var(--color-text-1);
  font-size: 13px;
  font-weight: 500;
  line-height: 22px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.detail-description {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 12px;
  padding: 8px 12px;
  background: #fff;
  border-radius: 6px;
  border: 1px solid var(--color-border-2);
}

.detail-description-label {
  flex-shrink: 0;
  color: var(--color-text-3);
  font-size: 12px;
  line-height: 22px;
}

.detail-description-value {
  flex: 1;
  color: var(--color-text-2);
  font-size: 13px;
  line-height: 22px;
}

.detail-metric-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 12px;
}

.detail-metric-cell {
  background: linear-gradient(135deg, #f0f7ff 0%, #fafcff 100%);
  border: 1px solid var(--color-border-2);
  border-radius: 8px;
  padding: 14px 16px;
  text-align: center;
}

.metric-label {
  color: var(--color-text-3);
  font-size: 12px;
  margin-bottom: 6px;
}

.metric-value {
  color: var(--color-text-1);
  font-size: 22px;
  font-weight: 600;
  line-height: 1.2;
}

.detail-summary {
  margin-bottom: 16px;
}

.detail-row {
  margin-top: 4px;
}

.script-ref-title {
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-1);
}

.detail-schedule-card {
  margin-bottom: 16px;
  background: var(--color-fill-1);
}

.detail-runs-card {
  margin-bottom: 16px;
  background: var(--color-fill-1);
}

.script-ref-tag {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.script-ref-ver {
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 12px;
  opacity: 0.8;
}

.detail-mini-alert {
  margin-bottom: 10px;
}

.muted {
  color: var(--color-text-3);
}

@media (max-width: 1100px) {
  .detail-field-strip {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .detail-metric-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
