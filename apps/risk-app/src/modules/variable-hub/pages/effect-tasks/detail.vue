<template>
  <div class="effect-task-detail">
    <div class="head-bar">
      <a-space>
        <a-button type="text" size="small" @click="goBack">
          <template #icon><icon-left /></template>
          返回任务列表
        </a-button>
        <span class="head-title">{{ task ? task.name : '任务详情' }}</span>
        <a-tag v-if="task" :color="statusColor(task.status)">{{ task.statusLabel }}</a-tag>
      </a-space>
      <a-space v-if="task">
        <a-button size="small" @click="router.push('/effect-tasks/settings')">阈值与推送配置</a-button>
        <template v-if="canRun">
          <a-button size="small" :disabled="task.status === 'running'" @click="runTask">立即执行</a-button>
          <a-button size="small" @click="toggleEnabled">{{ task.enabled ? '停用' : '启用' }}</a-button>
        </template>
      </a-space>
    </div>

    <!-- 任务不存在：只给一条返回路径，不渲染空壳 Tab -->
    <a-card v-if="notFound" :bordered="false" class="panel-card">
      <a-result status="404" title="任务不存在" :subtitle="`未找到任务 ${taskId}，可能已被演示重置清理。`">
        <template #extra>
          <a-button type="primary" @click="goBack">返回任务列表</a-button>
        </template>
      </a-result>
    </a-card>

    <template v-else-if="task">
      <a-card :bordered="false" class="panel-card">
        <a-descriptions :column="4" size="small" :data="headFacts" />
        <div v-if="task.status === 'running'" class="running-bar">
          <a-progress :percent="task.progress / 100" size="small" />
          <span class="tip">执行中进度由 30 秒轮询推进（页面隐藏时暂停）</span>
        </div>
      </a-card>

      <a-card :bordered="false" class="panel-card">
        <a-tabs v-model:active-key="activeTab" type="rounded" size="small">
          <!-- ===== 任务配置 ===== -->
          <a-tab-pane key="config" title="任务配置">
            <a-spin :loading="tabLoading" class="pane-spin">
              <div class="block-title">判定阈值（只读，修改请去配置页）</div>
              <a-descriptions :column="3" size="small" :data="ruleFacts" />

              <div class="block-title">当前阈值命中预览</div>
              <a-row :gutter="12" class="hit-row">
                <a-col v-for="h in hitCards" :key="h.label" :span="6">
                  <div class="hit-card">
                    <div class="hit-value">{{ h.value }}</div>
                    <div class="hit-label">{{ h.label }}</div>
                  </div>
                </a-col>
              </a-row>

              <div class="block-title">
                覆盖变量清单
                <span class="tip">仅展示前 {{ (detail.variables || []).length }} 个，全量名单见效果总览推荐表</span>
              </div>
              <a-table
                row-key="variableId"
                :data="detail.variables || []"
                :pagination="false"
                size="small"
                :scroll="{ y: 320 }"
              >
                <template #columns>
                  <a-table-column title="变量" data-index="name" :width="240">
                    <template #cell="{ record }">
                      <div class="cell-name">
                        <a-link @click="goVariable(record)">{{ record.name }}</a-link>
                        <span class="cell-code">{{ record.code }}</span>
                      </div>
                    </template>
                  </a-table-column>
                  <a-table-column title="结论" data-index="verdictLabel" :width="90" />
                  <a-table-column title="月调用量" :width="110">
                    <template #cell="{ record }"><span class="num">{{ record.callCount }} 万</span></template>
                  </a-table-column>
                  <a-table-column title="口径" :width="160">
                    <template #cell="{ record }">
                      <a-tag v-if="record.synthetic" size="small">演示合成</a-tag>
                      <a-tag v-else size="small" color="green">台账正式</a-tag>
                    </template>
                  </a-table-column>
                </template>
              </a-table>

              <!-- 试跑：结果不写入正式批次 -->
              <div class="block-title">抽样试跑</div>
              <a-form :model="trial" layout="inline" class="trial-form">
                <a-form-item label="抽样比例(%)">
                  <a-input-number v-model="trial.sampleRatio" :min="1" :max="100" :step="5" size="small" />
                </a-form-item>
                <a-form-item label="抽样上限(个)">
                  <a-input-number v-model="trial.sampleLimit" :min="5" :max="200" :step="5" size="small" />
                </a-form-item>
                <a-form-item>
                  <a-button type="primary" size="small" :disabled="!canRun" :loading="trialing" @click="runTrial">
                    开始试跑
                  </a-button>
                </a-form-item>
              </a-form>
              <a-alert v-if="trialResult" type="warning" class="trial-notice">{{ trialResult.notice }}</a-alert>
              <a-table
                v-if="trialResult"
                row-key="variableId"
                :data="trialResult.rows"
                :pagination="false"
                size="small"
                :scroll="{ x: 760 }"
              >
                <template #columns>
                  <a-table-column title="变量" data-index="name" :width="220" />
                  <a-table-column title="结论" data-index="verdictLabel" :width="80" />
                  <a-table-column title="综合效果指数" :width="120">
                    <template #cell="{ record }"><span class="num strong">{{ record.effectIndex }}</span></template>
                  </a-table-column>
                  <a-table-column title="月调用量" :width="100">
                    <template #cell="{ record }"><span class="num">{{ record.callCount }} 万</span></template>
                  </a-table-column>
                  <a-table-column title="缺失率" :width="100">
                    <template #cell="{ record }">
                      <span class="num">{{ record.missingRateText }}</span>
                    </template>
                  </a-table-column>
                </template>
              </a-table>
              <a-empty v-else :image="false" description="未试跑。试跑只按抽样比例返回结果，不写入正式批次。" />
            </a-spin>
          </a-tab-pane>

          <!-- ===== 执行实例 ===== -->
          <a-tab-pane key="instances" title="执行实例">
            <a-spin :loading="tabLoading" class="pane-spin">
              <a-table row-key="id" :data="detail.instances || []" :pagination="false" size="small" :scroll="{ x: 1080 }">
                <template #columns>
                  <a-table-column title="批次号" data-index="batchNo" :width="150" />
                  <a-table-column title="开始时间" data-index="startedAt" :width="150" />
                  <a-table-column title="结束时间" data-index="finishedAt" :width="150" />
                  <a-table-column title="结果" :width="100">
                    <template #cell="{ record }">
                      <a-tag :color="resultColor(record.result)" size="small">{{ record.statusLabel }}</a-tag>
                    </template>
                  </a-table-column>
                  <a-table-column title="命中" :width="90">
                    <template #cell="{ record }"><span class="num">{{ record.hitCount }}</span></template>
                  </a-table-column>
                  <a-table-column title="汰换 / 推荐" :width="120">
                    <template #cell="{ record }">
                      <span class="num">{{ record.offlineCount }} / {{ record.onlineCount }}</span>
                    </template>
                  </a-table-column>
                  <a-table-column title="耗时" :width="100">
                    <template #cell="{ record }"><span class="num">{{ record.duration }} 秒</span></template>
                  </a-table-column>
                  <a-table-column title="触发方式" data-index="trigger" :width="110" />
                  <a-table-column title="执行人" data-index="operator" :width="110" />
                </template>
                <template #empty>
                  <a-empty :image="false" description="该任务暂无执行批次" />
                </template>
              </a-table>
            </a-spin>
          </a-tab-pane>

          <!-- ===== 入参历史 ===== -->
          <a-tab-pane key="params" title="入参历史">
            <a-spin :loading="tabLoading" class="pane-spin">
              <a-alert type="info" class="pane-note">
                阈值与推送对象的修改记录；调整历史只影响后续批次，不回溯已发布名单。
              </a-alert>
              <a-table row-key="id" :data="detail.paramHistory || []" :pagination="false" size="small">
                <template #columns>
                  <a-table-column title="变更时间" data-index="createdAt" :width="160" />
                  <a-table-column title="关联批次" data-index="batchNo" :width="150" />
                  <a-table-column title="操作人" data-index="operator" :width="110" />
                  <a-table-column title="变更内容">
                    <template #cell="{ record }">
                      <div v-for="c in record.changes" :key="c.field" class="change-line">
                        <span class="change-field">{{ fieldLabel(c.field) }}</span>
                        <span class="num">{{ c.beforeText }}</span>
                        <icon-arrow-right class="change-arrow" />
                        <span class="num strong">{{ c.afterText }}</span>
                      </div>
                    </template>
                  </a-table-column>
                </template>
                <template #empty>
                  <a-empty :image="false" description="该任务暂无入参变更记录" />
                </template>
              </a-table>
            </a-spin>
          </a-tab-pane>
        </a-tabs>
      </a-card>
    </template>
  </div>
</template>

<script setup>
/**
 * 效果任务管理 · 详情页
 *
 * 约束（见评估文档 §6）：
 * 1. 三个 Tab 的数据由 effectBatchStore.taskDetail(taskId, tab) 分 Tab 返回，切 Tab 才请求并缓存；
 * 2. ?tab= 进 URL，双向同步（前进后退能还原当前 Tab）；
 * 3. 页面不做任何聚合，命中预览 / 清单 / 实例数字全部来自 store；
 * 4. 写操作（执行、启停、试跑）受 RUN_EFFECT_TASK 权限控制，且只落 localStorage。
 */
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { IconLeft, IconArrowRight } from '@arco-design/web-vue/es/icon'
import { effectBatchStore } from '@/modules/variable-hub/mock/effect-evaluation/batch-store'
import { RULE_FIELD_METAS, RULE_FIELD_LABELS, formatRuleValue } from '@/modules/variable-hub/mock/effect-evaluation/rule-store'
import { UserContext, PERMISSIONS } from '@/modules/variable-hub/mock/risk-feature/permissions'

const router = useRouter()
const route = useRoute()

const POLL_INTERVAL = 30000

const taskId = computed(() => String(route.params.id || ''))
const canRun = computed(() => UserContext.has(PERMISSIONS.RUN_EFFECT_TASK))

const TASK_TABS = ['config', 'instances', 'params']

/** 当前 Tab：URL 优先，非法值回落 config */
const activeTab = ref(TASK_TABS.includes(String(route.query.tab)) ? String(route.query.tab) : 'config')

const task = ref(effectBatchStore.getTask(taskId.value))
const notFound = ref(!task.value)
const detail = ref({})
const tabLoading = ref(false)
/** 已加载过的 Tab 数据缓存，返回同一 Tab 不重复请求 */
const tabCache = reactive({})

const trial = reactive({ sampleRatio: 10, sampleLimit: 50 })
const trialResult = ref(null)
const trialing = ref(false)

/**
 * Tab 变化回写 URL：URL 是状态源
 */
watch(activeTab, (v) => {
  if (String(route.query.tab || 'config') === v) return
  const next = { ...route.query }
  if (v === 'config') delete next.tab
  else next.tab = v
  router.replace({ query: next })
})

/** 外部改 URL（前进后退）时同步回 Tab */
watch(
  () => route.query.tab,
  (v) => {
    const next = TASK_TABS.includes(String(v)) ? String(v) : 'config'
    if (next !== activeTab.value) activeTab.value = next
  }
)

/**
 * 头部事实：只从 task 取字段展示，不做计算
 * 返回 Arco descriptions 需要的 [{ label, value }] 数组
 */
const headFacts = computed(() => {
  const t = task.value || {}
  return [
    { label: '任务类型', value: t.typeLabel || '—' },
    { label: '调度方式', value: t.scheduleText || '—' },
    { label: '下次触发', value: t.scheduleText === '手动触发' ? '—' : t.nextTriggerAt || '—' },
    { label: '最近执行', value: `${t.lastRunAt || '—'} · ${t.lastRunResultLabel || '—'}` },
    { label: '负责人', value: t.owner || '—' },
    { label: '覆盖变量数', value: t.variableCount || 0 },
    { label: '是否启用', value: t.enabled ? '启用' : '停用' },
    { label: '任务编号', value: t.id || '—' }
  ]
})

/** 阈值只读展示：文案与格式统一走 mock 层 formatRuleValue */
const ruleFacts = computed(() => {
  const rule = detail.value.rule || {}
  return RULE_FIELD_METAS.map((m) => ({ label: m.label, value: formatRuleValue(m, rule[m.key]) }))
})

/** 命中预览四数：全部读 store 返回的 hitPreview，页面不重算 */
const hitCards = computed(() => {
  const p = detail.value.hitPreview || {}
  return [
    { label: '命中变量数', value: p.hitCount ?? '—' },
    { label: '判为汰换', value: p.offlineHit ?? '—' },
    { label: '判为推荐', value: p.onlineHit ?? '—' },
    { label: '样本不足剔除', value: p.excludedTotal ?? '—' }
  ]
})

/**
 * 加载当前 Tab 数据（带缓存）
 * @param {string} tab config / instances / params
 */
function loadTab(tab) {
  if (tabCache[tab]) {
    detail.value = tabCache[tab]
    return
  }
  tabLoading.value = true
  window.setTimeout(() => {
    const payload = effectBatchStore.taskDetail(taskId.value, tab)
    if (payload) {
      tabCache[tab] = payload
      detail.value = payload
      task.value = payload.task
    }
    tabLoading.value = false
  }, 120)
}

/** Tab 切换即按需取数 */
watch(activeTab, (v) => loadTab(v))

/**
 * 抽样试跑：调用 store，结果只展示不入库
 */
function runTrial() {
  trialing.value = true
  const payload = effectBatchStore.trialRun(taskId.value, {
    sampleRatio: trial.sampleRatio,
    sampleLimit: trial.sampleLimit
  })
  trialResult.value = payload
  trialing.value = false
  if (!payload) Message.error('试跑失败：任务不存在')
}

/**
 * 跳转变量详情的效果 Tab，来路标记为任务域
 * @param {object} record 变量行
 */
function goVariable(record) {
  router.push({
    path: `/variable-management/detail/${record.variableId}`,
    query: { tab: 'effect', from: 'variable-hub' }
  })
}

/** 入参历史字段名 → 中文标签（字典来自 rule-store） */
function fieldLabel(field) {
  return RULE_FIELD_LABELS[field] || field
}

/** 结果颜色（辅助，文字已表达结论） */
function resultColor(r) {
  return { success: 'green', partial: 'orange', failed: 'red' }[r] || 'gray'
}

/** 状态颜色 */
function statusColor(s) {
  return { running: 'arcoblue', success: 'green', failed: 'red', partial: 'orange', paused: 'gray', pending: 'gray' }[s] || 'gray'
}

/** 返回列表：优先浏览器后退，保留列表页的筛选与页码 */
function goBack() {
  if (window.history.length > 1) {
    router.back()
    return
  }
  router.push('/effect-tasks')
}

/**
 * 立即执行：置为执行中，交给轮询推进
 */
function runTask() {
  effectBatchStore.saveTask({ ...task.value, status: 'running', progress: 5 })
  Message.success(`已触发「${task.value.name}」`)
  refreshTask()
}

/**
 * 启用 / 停用任务
 */
function toggleEnabled() {
  const enabled = !task.value.enabled
  effectBatchStore.saveTask({ ...task.value, enabled, status: enabled ? 'pending' : 'paused' })
  Message.success(enabled ? '已启用' : '已停用，不再定时触发')
  refreshTask()
}

/** 重新读取任务头部（写操作后同步状态与进度） */
function refreshTask() {
  task.value = effectBatchStore.getTask(taskId.value)
  notFound.value = !task.value
  if (task.value) loadTab(activeTab.value)
}

// ================= 轮询：30s + 页面隐藏暂停 =================

let pollTimer = null

/** 单次轮询：仅在可见且任务执行中时推进 */
function pollOnce() {
  if (typeof document !== 'undefined' && document.hidden) return
  if (!task.value || task.value.status !== 'running') return
  effectBatchStore.tick()
  task.value = effectBatchStore.getTask(taskId.value)
}

onMounted(() => {
  if (!task.value) {
    task.value = effectBatchStore.getTask(taskId.value)
    notFound.value = !task.value
  }
  if (task.value) loadTab(activeTab.value)
  pollTimer = window.setInterval(pollOnce, POLL_INTERVAL)
})

onUnmounted(() => {
  if (pollTimer) window.clearInterval(pollTimer)
})
</script>

<style scoped>
.head-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.head-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-1);
}
.panel-card {
  margin-bottom: 12px;
}
.running-bar {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.tip {
  font-size: 12px;
  font-weight: 400;
  color: var(--color-text-3);
}
.block-title {
  margin: 16px 0 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-1);
}
.pane-spin {
  display: block;
  min-height: 120px;
}
.pane-note {
  margin-bottom: 10px;
}
.hit-row {
  margin-bottom: 8px;
}
.hit-card {
  padding: 10px 12px;
  border: 1px solid var(--color-border-2);
  border-radius: 8px;
  background: var(--color-fill-1);
}
.hit-value {
  font-size: 20px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-1);
}
.hit-label {
  margin-top: 2px;
  font-size: 12px;
  color: var(--color-text-3);
}
.trial-form {
  margin-bottom: 10px;
}
.trial-notice {
  margin-bottom: 10px;
}
.cell-name {
  display: flex;
  flex-direction: column;
}
.cell-code {
  font-size: 12px;
  color: var(--color-text-3);
}
.num {
  font-variant-numeric: tabular-nums;
}
.num.strong {
  font-weight: 600;
}
.change-line {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}
.change-field {
  color: var(--color-text-3);
  min-width: 150px;
}
.change-arrow {
  color: var(--color-text-3);
}
</style>
