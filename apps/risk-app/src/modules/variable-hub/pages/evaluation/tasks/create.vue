<!--
  常态性评估任务创建页面
  独立页面，支持完整配置：基础信息、评估对象、调度配置、Python 脚本管理
-->
<template>
  <div class="routine-task-create-page">
    <DmtPageHeader :title="isEdit ? '编辑常态性评估任务' : '新建常态性评估任务'">
      <template #subtitle>
        配置评估对象、调度周期与 Python 分析脚本，系统将按计划自动执行特征质量评估。
      </template>
      <template #extra>
        <a-space>
          <a-button @click="handleCancel">取消</a-button>
          <a-button type="primary" :loading="submitting" @click="handleSubmit">
            {{ isEdit ? '保存修改' : '创建任务' }}
          </a-button>
        </a-space>
      </template>
    </DmtPageHeader>

    <div class="page-content">
      <a-form :model="form" layout="vertical">
        <!-- 基础信息 -->
        <a-card title="基础信息" :bordered="false" class="form-card">
          <a-row :gutter="24">
            <a-col :span="12">
              <a-form-item label="任务名称" required>
                <a-input v-model="form.name" placeholder="如：外数特征每日质量巡检" :max-length="50" show-word-limit />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="负责人" required>
                <a-input v-model="form.owner" placeholder="请输入负责人" />
              </a-form-item>
            </a-col>
          </a-row>
          <a-form-item label="任务描述">
            <a-textarea v-model="form.description" placeholder="请描述任务目标和评估范围" :max-length="500" show-word-limit :auto-size="{ minRows: 3, maxRows: 6 }" />
          </a-form-item>
        </a-card>

        <!-- 评估对象 -->
        <a-card title="评估对象" :bordered="false" class="form-card">
          <a-alert type="info" :show-icon="false" style="margin-bottom: 16px">
            选择需要评估的特征，支持按类型筛选和关键词搜索。已选 {{ form.targets.length }} 个特征。
            <!-- 候选不够时给出上游来源，不让用户本身成为「找不到对象」的终点 -->
            <template #action>
              <a-space>
                <a-link @click="router.push('/variable-management')">去台账注册特征</a-link>
                <a-link @click="router.push('/variable-hub/external-data/lifecycle')">去外数落库取数</a-link>
                <a-link @click="router.push('/explore/topics')">去探索课题</a-link>
              </a-space>
            </template>
          </a-alert>

          <VariableSelector
            v-model="form.targets"
            :source-type="form.sourceType"
            @source-type-change="(val) => form.sourceType = val"
          />
        </a-card>

        <!-- 调度配置 -->
        <a-card title="调度配置" :bordered="false" class="form-card">
          <a-row :gutter="24">
            <a-col :span="8">
              <a-form-item label="执行频率" required>
                <a-select v-model="form.frequency" :options="frequencyOptions" placeholder="请选择执行频率" />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="执行时间" required>
                <a-input v-model="form.scheduleTime" :placeholder="scheduleTimePlaceholder" />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="是否启用">
                <a-switch v-model="form.enabled" checked-text="启用" unchecked-text="停用" />
              </a-form-item>
            </a-col>
          </a-row>
          <a-alert type="info" :show-icon="false">
            <template #title>调度预览</template>
            {{ schedulePreview }}
          </a-alert>
        </a-card>

        <!-- Python 脚本配置 -->
        <a-card title="Python 脚本配置" :bordered="false" class="form-card">
          <div class="script-header">
            <div class="script-header-left">
              <a-button type="primary" @click="openScriptCreateModal">
                <template #icon><icon-plus /></template>
                新建脚本
              </a-button>
              <a-button @click="refreshScripts">
                <template #icon><icon-refresh /></template>
                刷新
              </a-button>
              <a-button @click="goScriptManage">
                <template #icon><icon-list /></template>
                脚本管理
              </a-button>
            </div>
            <div class="script-header-right">
              <a-input-search
                v-model="scriptSearchKeyword"
                placeholder="搜索脚本名称"
                style="width: 240px"
                allow-clear
              />
            </div>
          </div>

          <div class="script-list">
            <div v-for="script in filteredScripts" :key="script.id" class="script-item" :class="{ selected: isSelectedScript(script.id) }">
              <div class="script-item-header">
                <a-checkbox :model-value="isSelectedScript(script.id)" @change="(val) => toggleScript(script, val as boolean)" />
                <div class="script-item-info">
                  <span class="script-name">{{ script.name }}</span>
                  <a-tag color="arcoblue" size="small">v{{ script.currentVersion }}</a-tag>
                  <a-tag :color="scenarioColor(script.scenario)" size="small">{{ scenarioLabel(script.scenario) }}</a-tag>
                  <span class="script-path">{{ script.path }}</span>
                </div>
                <div class="script-item-actions">
                  <a-button type="text" size="small" @click="viewScript(script)">查看</a-button>
                  <a-button type="text" size="small" @click="editScript(script)">编辑</a-button>
                  <a-button type="text" size="small" @click="goScriptDetail(script.id)">版本记录</a-button>
                </div>
              </div>
              <div v-if="script.dependencies?.length" class="script-item-deps">
                <a-tag v-for="dep in script.dependencies" :key="dep" size="small" color="gray">{{ dep }}</a-tag>
              </div>
            </div>
            <a-empty v-if="filteredScripts.length === 0" description="暂无可选脚本，可「新建脚本」或到「脚本管理」维护" />
          </div>

          <!-- 契约速览：勾完脚本就能马上看到必产字段还差哪个，不用等保存被拦下 -->
          <template v-if="contractNeeds.length">
            <a-divider style="margin: 16px 0" />
            <div class="contract-check-title">
              常态性评估契约必产字段（{{ coveredCount }}/{{ contractNeeds.length }} 已覆盖）
              <span class="contract-check-tip">{{ contractCheckTip }}</span>
            </div>
            <a-space wrap size="mini">
              <a-tooltip v-for="need in contractNeeds" :key="need.key" :content="need.tip">
                <a-tag size="small" :color="need.covered ? 'green' : 'red'">{{ need.covered ? '已覆盖' : '未覆盖' }} {{ need.label }}</a-tag>
              </a-tooltip>
            </a-space>
          </template>
        </a-card>

        <!-- 保存时的契约校验结果：逐条列出并指出配置位置 -->
        <a-alert v-if="problems.length" type="error" :show-icon="false" class="form-card">
          <div class="problem-head">契约校验未通过，共 {{ problems.length }} 项阻断，保存已拦下：</div>
          <ul class="problem-list">
            <li v-for="(p, i) in problems" :key="i">
              {{ p.message }}<span v-if="p.anchor" class="problem-anchor">（配置位置：{{ ANCHOR_LABELS[p.anchor] }}）</span>
            </li>
          </ul>
        </a-alert>

        <!-- 预览摘要 -->
        <a-card title="配置摘要" :bordered="false" class="form-card">
          <a-descriptions :column="2" bordered>
            <a-descriptions-item label="任务名称">{{ form.name || '—' }}</a-descriptions-item>
            <a-descriptions-item label="负责人">{{ form.owner || '—' }}</a-descriptions-item>
            <a-descriptions-item label="评估对象">{{ form.sourceType === 'variable_batch' ? '特征批量' : '探索课题' }}</a-descriptions-item>
            <a-descriptions-item label="特征数量">{{ form.targets.length }} 个</a-descriptions-item>
            <a-descriptions-item label="调度频率">{{ frequencyLabel(form.frequency) }}</a-descriptions-item>
            <a-descriptions-item label="执行时间">{{ form.scheduleTime || '—' }}</a-descriptions-item>
            <a-descriptions-item label="脚本数量">{{ form.selectedScriptIds.length }} 个</a-descriptions-item>
            <a-descriptions-item label="启用状态">
              <a-tag :color="form.enabled ? 'green' : 'gray'">{{ form.enabled ? '已启用' : '已停用' }}</a-tag>
            </a-descriptions-item>
          </a-descriptions>
        </a-card>
      </a-form>
    </div>

    <!-- 脚本只查看抽屉 -->
    <a-drawer
      v-model:visible="scriptViewVisible"
      title="查看 Python 脚本"
      :width="800"
      :footer="false"
      @cancel="scriptViewVisible = false"
      unmount-on-close
    >
      <PythonScriptEditor :script="currentScript" readonly />
      <div class="view-tip">
        <a-alert type="info">
          如需修改请使用「编辑」，保存后会自动生成新版本；版本回滚与差异对比请到
          <a-link @click="goScriptDetail(currentScript?.id)">脚本管理</a-link> 查看。
        </a-alert>
      </div>
    </a-drawer>

    <!-- 脚本新建 / 编辑（带版本变更说明） -->
    <ScriptFormDrawer ref="scriptFormRef" :script="currentScript" @success="handleScriptSaved" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import {
  contractOf,
  expandRefs,
  fieldSourceText,
  issueSummary,
  validateEvaluationOnSave,
  type ContractIssue
} from '@/modules/variable-hub/mock/task-center/io-contract'
import {
  EvaluationTaskStore,
  scenarioColor,
  scenarioLabel,
  type EvaluationTaskMock,
  type PythonScriptConfig,
  type EvaluationTaskTarget
} from '@/modules/variable-hub/mock/evaluation/evaluation-task-store'
import DmtPageHeader from '@/modules/variable-hub/components/PageHeader.vue'
import PythonScriptEditor from '@/modules/variable-hub/components/evaluation/PythonScriptEditor.vue'
import ScriptFormDrawer from '@/modules/variable-hub/components/evaluation/ScriptFormDrawer.vue'
import VariableSelector from '@/modules/variable-hub/components/evaluation/VariableSelector.vue'

const router = useRouter()
const route = useRoute()

const isEdit = computed(() => !!route.params.id || !!route.query.id)
const taskId = computed(() => (route.params.id || route.query.id) as string)
const submitting = ref(false)

const form = reactive({
  name: '',
  owner: 'Demo 用户',
  description: '',
  sourceType: 'variable_batch' as 'variable_batch' | 'topic',
  targets: [] as EvaluationTaskTarget[],
  frequency: 'daily' as 'daily' | 'weekly' | 'monthly' | 'manual',
  scheduleTime: '06:30',
  enabled: true,
  selectedScriptIds: [] as string[]
})

// ============ 调度配置 ============
const frequencyOptions = [
  { label: '每日', value: 'daily' },
  { label: '每周', value: 'weekly' },
  { label: '每月', value: 'monthly' },
  { label: '手动触发', value: 'manual' }
]

const scheduleTimePlaceholder = computed(() => {
  const map: Record<string, string> = {
    daily: '如：06:30',
    weekly: '如：每周一 08:00',
    monthly: '如：每月 1 日 02:00',
    manual: '手动触发'
  }
  return map[form.frequency]
})

const schedulePreview = computed(() => {
  if (!form.scheduleTime) {
    return '请设置执行时间'
  }
  if (form.frequency === 'manual') {
    return '手动触发执行'
  }
  const freqMap = { daily: '每天', weekly: '每周', monthly: '每月' }
  return `${freqMap[form.frequency]} ${form.scheduleTime} 自动执行`
})

const frequencyLabel = (value: string) => ({
  daily: '每日',
  weekly: '每周',
  monthly: '每月',
  manual: '手动'
}[value] || '未知')

// ============ Python 脚本管理 ============
const allScripts = ref<PythonScriptConfig[]>([])
const scriptSearchKeyword = ref('')

/** 只展示启用中的脚本，已归档脚本不参与新任务选用 */
const filteredScripts = computed(() => {
  const active = allScripts.value.filter((s) => s.status !== 'archived')
  const keyword = scriptSearchKeyword.value.trim().toLowerCase()
  if (!keyword) {
    return active
  }
  return active.filter((s) =>
    s.name.toLowerCase().includes(keyword) ||
    s.path.toLowerCase().includes(keyword) ||
    (s.tags || []).some((t) => t.toLowerCase().includes(keyword))
  )
})

function refreshScripts() {
  allScripts.value = EvaluationTaskStore.listPythonScripts()
}

function isSelectedScript(id: string): boolean {
  return form.selectedScriptIds.includes(id)
}

function toggleScript(script: PythonScriptConfig, checked: boolean) {
  if (checked) {
    if (!form.selectedScriptIds.includes(script.id)) {
      form.selectedScriptIds.push(script.id)
    }
  } else {
    form.selectedScriptIds = form.selectedScriptIds.filter((id) => id !== script.id)
  }
}

// ============ 脚本查看 / 新建 / 编辑 ============
const scriptViewVisible = ref(false)
const currentScript = ref<PythonScriptConfig>()
const scriptFormRef = ref()
/** 新建场景下需要自动勾选的脚本 id（从 ScriptFormDrawer 保存回来后） */
let pendingAutoSelect = false

function viewScript(script: PythonScriptConfig) {
  currentScript.value = script
  scriptViewVisible.value = true
}

function editScript(script: PythonScriptConfig) {
  currentScript.value = script
  pendingAutoSelect = false
  scriptFormRef.value?.open()
}

function openScriptCreateModal() {
  currentScript.value = undefined
  pendingAutoSelect = true
  scriptFormRef.value?.open()
}

function handleScriptSaved(saved: PythonScriptConfig) {
  refreshScripts()
  if (pendingAutoSelect && !form.selectedScriptIds.includes(saved.id)) {
    form.selectedScriptIds.push(saved.id)
  }
  pendingAutoSelect = false
}

const goScriptManage = () => router.push('/tasks?tab=scripts')

const goScriptDetail = (id?: string) => {
  if (!id) {
    return
  }
  router.push(`/tasks/scripts/${id}`)
}

// ============ 输入输出契约（保存时静态校验，阻断） ============
/** 本页只建常态性评估，kind 固定；字段清单与必产项一律查 io-contract，页面不自己列字段 */
const ROUTINE_KIND = 'evaluation.routine'

/** 校验问题落在哪块配置，文案与效果任务新建页一致 */
const ANCHOR_LABELS: Record<NonNullable<ContractIssue['anchor']>, string> = {
  scripts: 'Python 脚本配置',
  targets: '基础信息与评估对象',
  input: '输入来源',
  output: '产出契约',
  upstream: '输入来源（上游引用）',
  schedule: '调度配置'
}

const problems = ref<ContractIssue[]>([])

/** 已勾脚本：provides 取并集，这就是契约覆盖的判据 */
const selectedScripts = computed(() => allScripts.value.filter((s) => form.selectedScriptIds.includes(s.id)))
const providedKeys = computed(() => new Set(selectedScripts.value.flatMap((s) => s.provides || [])))

/** 契约里必须由脚本产出的必产字段（报告由平台引擎产出，不拿它要求脚本） */
const contractNeeds = computed(() => {
  const c = contractOf(ROUTINE_KIND)
  if (!c) {
    return []
  }
  return expandRefs(c.output)
    .filter(({ ref: r, field }) => r.required && field?.source === 'script_output')
    .map(({ ref: r, field }) => ({
      key: r.key,
      label: field?.label || r.key,
      covered: providedKeys.value.has(r.key),
      tip: `${fieldSourceText(r.key)}${r.note ? `｜${r.note}` : ''}`
    }))
})
const coveredCount = computed(() => contractNeeds.value.filter((n) => n.covered).length)
const contractCheckTip = computed(() => {
  if (!selectedScripts.value.length) {
    return '还没勾选脚本，先选口径再看覆盖'
  }
  const missing = contractNeeds.value.filter((n) => !n.covered).map((n) => n.label)
  return missing.length ? `未覆盖：${missing.join(' / ')}，保存会被拦下` : '所选脚本并集已覆盖全部必产字段'
})

/** 配置一改就清掉旧结论，避免页面同时留着过期的阻断提示 */
watch(
  () => [form.selectedScriptIds.length, form.targets.length, form.name],
  () => {
    problems.value = []
  }
)

// ============ 提交 ============
function handleCancel() {
  router.back()
}

async function handleSubmit() {
  // 校验
  if (!form.name.trim()) {
    Message.warning('请输入任务名称')
    return
  }
  if (!form.owner.trim()) {
    Message.warning('请输入负责人')
    return
  }
  if (form.targets.length === 0) {
    Message.warning('请选择至少一个特征')
    return
  }
  if (form.selectedScriptIds.length === 0) {
    Message.warning('请选择至少一个 Python 脚本')
    return
  }
  if (!form.scheduleTime.trim() && form.frequency !== 'manual') {
    Message.warning('请输入执行时间')
    return
  }
  // 契约第一段：必产字段没被脚本覆盖时直接拦下，并把具体缺哪个字段列出来
  const check = validateEvaluationOnSave({
    kind: ROUTINE_KIND,
    name: form.name,
    targets: form.targets,
    scripts: selectedScripts.value.map((s) => ({ id: s.id, name: s.name, type: s.type, requires: s.requires, provides: s.provides }))
  })
  problems.value = check.blockers
  if (!check.ok) {
    Message.error(`契约校验未通过：${issueSummary(problems.value)}`)
    return
  }

  submitting.value = true
  await new Promise((r) => setTimeout(r, 800))

  try {
    if (isEdit.value) {
      // TODO: 更新任务
      Message.success('任务已更新')
    } else {
      // 新建任务
      const task = EvaluationTaskStore.addRoutineTask({
        name: form.name,
        description: form.description,
        sourceType: form.sourceType,
        sourceIds: form.targets.map((t) => t.id),
        sourceNames: form.targets.map((t) => t.name),
        targets: form.targets,
        routineConfig: {
          frequency: form.frequency,
          scheduleTime: form.scheduleTime,
          enabled: form.enabled,
          nextRunAt: form.frequency === 'manual' ? undefined : `2026-10-30 ${form.scheduleTime}:00`
        },
        pythonScriptIds: form.selectedScriptIds
      })
      Message.success(`常态性评估任务「${task.name}」已创建`)
      router.push({ path: '/tasks', query: { tab: 'tasks' } })
    }
  } catch (e) {
    Message.error('操作失败')
  } finally {
    submitting.value = false
  }
}

// ============ 初始化 ============
onMounted(() => {
  refreshScripts()
  
  // 编辑模式：加载数据
  if (taskId.value) {
    const task = EvaluationTaskStore.getTaskById(taskId.value)
    if (task && task.taskType === 'routine') {
      form.name = task.name
      form.owner = task.owner
      form.description = task.description
      form.sourceType = task.sourceType
      form.targets = [...task.targets]
      form.frequency = task.routineConfig?.frequency || 'daily'
      form.scheduleTime = task.routineConfig?.scheduleTime || '06:30'
      form.enabled = task.routineConfig?.enabled ?? true
      form.selectedScriptIds = task.pythonScripts?.map((s) => s.id) || []
    }
  }
})
</script>

<style scoped lang="less">
.routine-task-create-page {
  min-height: calc(100vh - 88px);
  background: var(--color-fill-1);
  padding-bottom: 40px;
}

.page-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}

.form-card {
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.view-tip {
  margin-top: 16px;
}

.script-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.script-header-left {
  display: flex;
  gap: 8px;
}

.script-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.script-item {
  padding: 16px;
  border: 1px solid var(--color-border-2);
  border-radius: 8px;
  background: var(--color-bg-2);
  transition: all 0.2s;

  &:hover {
    border-color: var(--primary-6);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }

  &.selected {
    border-color: var(--primary-6);
    background: var(--primary-1);
  }
}

.script-item-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.script-item-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.script-name {
  font-weight: 500;
  color: var(--color-text-1);
}

.script-path {
  font-size: 12px;
  color: var(--color-text-3);
  font-family: monospace;
}

.script-item-deps {
  margin-top: 8px;
  padding-left: 32px;
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.contract-check-title {
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-1);
}

.contract-check-tip {
  margin-left: 8px;
  font-size: 12px;
  font-weight: 400;
  color: var(--color-text-3);
}

.problem-head {
  margin-bottom: 6px;
}

.problem-list {
  margin: 0;
  padding-left: 18px;
  font-size: 12px;
  line-height: 1.8;
}

.problem-anchor {
  color: var(--color-text-3);
}
</style>
