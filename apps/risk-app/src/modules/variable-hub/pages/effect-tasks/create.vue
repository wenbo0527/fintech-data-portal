<!--
  效果任务 · 新建页（效果域自封装的创建载体）
  - 入口只有一个：统一任务列表「新建任务」→ 选类型 → 带 ?type= 进本页；类型可在表单里改
  - 判定配置在这里就配好（任务级阈值 + 推送对象），不再有全局的「判定配置」Tab
  - 输入来源可选引用评估任务产出（字段候选由 io-contract 的 upstream 声明驱动），引用后跑批只扫上游覆盖的变量
  - 提交前走契约校验：有 blocker 就地阻断并列出具体字段，不带病创建
  - 提交是两步：先建任务，再落任务级口径；口径与全局默认模板一致时不追加变更历史
  - 演示环境只写 localStorage，不接后端；写操作受 RUN_EFFECT_TASK 权限门控
-->
<template>
  <div class="effect-task-create-page">
    <DmtPageHeader title="新建效果任务">
      <template #subtitle>
        效果任务按任务级阈值产出「汰换 / 推荐」名单，每个任务的口径独立，互不影响。
      </template>
      <template #extra>
        <a-space>
          <a-button @click="handleCancel">取消</a-button>
          <a-button type="primary" :disabled="!canRun" :loading="submitting" @click="handleSubmit">创建任务</a-button>
        </a-space>
      </template>
    </DmtPageHeader>

    <a-alert v-if="!canRun" type="warning" class="perm-alert">
      当前角色（风险数据成员）没有「触发跑批」权限，只能查看效果任务，不能新建。
    </a-alert>

    <div class="page-content">
      <!-- 任务类型：注册表驱动，新类型接入后这里自动多一个选项 -->
      <a-card title="任务类型" :bordered="false" class="form-card">
        <a-row :gutter="16">
          <a-col v-for="k in kindList" :key="k.kind" :span="6">
            <div
              class="kind-option"
              :class="{ 'kind-option--active': form.type === k.typeValue }"
              role="button"
              tabindex="0"
              @click="pickType(k.typeValue)"
              @keydown.enter="pickType(k.typeValue)"
            >
              <div class="kind-option-head">
                <span class="kind-icon" :style="{ background: k.accent }">{{ k.iconText }}</span>
                <span class="kind-name">{{ k.label }}</span>
              </div>
              <div class="kind-desc">{{ k.desc }}</div>
            </div>
          </a-col>
        </a-row>
      </a-card>

      <!-- 基础信息与输入来源同属一个表单：a-form-item 必须在 a-form 上下文里才拿得到 model -->
      <a-form :model="form" layout="vertical">
        <!-- 基础信息 -->
        <a-card title="基础信息" :bordered="false" class="form-card">
          <a-row :gutter="24">
            <a-col :span="12">
              <a-form-item label="任务名称" required>
                <a-input v-model="form.name" placeholder="如：外数变量每日汰换扫描" :max-length="50" show-word-limit />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="调度方式" required>
                <a-input v-model="form.scheduleText" placeholder="如：每日 06:30 / 手动触发" />
                <template #extra>
                  <span class="field-hint">演示环境不做真实调度，可在任务列表用「立即执行」验证一轮。</span>
                </template>
              </a-form-item>
            </a-col>
          </a-row>
        </a-card>

        <!-- 输入来源：默认走本域全量效果宽表，也可以引用上游评估任务的产出（两域打通的落点） -->
        <a-card title="输入来源" :bordered="false" class="form-card">
          <a-radio-group v-model="form.inputMode">
            <a-radio value="local">本域效果宽表（按任务覆盖量全库扫描）</a-radio>
            <a-radio value="upstream" :disabled="!upstreamAllowed">引用评估任务产出</a-radio>
          </a-radio-group>
          <span v-if="!upstreamAllowed" class="field-hint upstream-hint">
            当前任务类型的契约没有声明 upstream，所以不能引用上游产出；需要打通请先在 io-contract 登记。
          </span>

          <template v-if="form.inputMode === 'upstream' && upstreamAllowed">
            <a-row :gutter="24" class="upstream-row">
              <a-col :span="12">
                <a-form-item label="上游评估任务" required>
                  <a-select v-model="form.upstreamTaskId" :options="upstreamTaskOptions" placeholder="请选择可引用的评估任务" allow-search />
                  <template #extra>
                    <span class="field-hint">候选只列契约 upstream.fromKinds 允许的评估类型，其余任务选不到。</span>
                  </template>
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="引用的产出字段" required>
                  <a-select v-model="form.upstreamField" :options="upstreamFieldChoices" placeholder="如：IV / 数据质量得分" />
                  <template #extra>
                    <span class="field-hint">字段 key 与评估契约的产出完全一致，这就是两域能对上话的原因。</span>
                  </template>
                </a-form-item>
              </a-col>
            </a-row>

            <a-alert v-if="upstreamMeta" type="info" class="lineage-alert">
              <div class="lineage-title">{{ upstreamMeta.name }} → {{ fieldLabel(form.upstreamField) }}</div>
              <div>上游覆盖 {{ upstreamMeta.count }} 个变量，引用后本任务只扫这部分范围（不再是全库），执行日志会留下这条血缘。</div>
              <div v-if="!upstreamMeta.finished" class="lineage-warn">该上游还没有成功执行过，执行前预检会给出警告（可继续）。</div>
            </a-alert>
            <a-alert v-else-if="form.upstreamTaskId" type="error" class="lineage-alert">
              引用的上游任务已经不存在或类型不匹配，契约校验会阻断创建，请重新选择。
            </a-alert>
          </template>
        </a-card>
      </a-form>

      <!-- 契约不符项：保存被拦下时就地列到具体字段，不让用户猜 -->
      <a-alert v-if="problems.length" type="error" class="form-card">
        <div class="problem-head">契约校验未通过，共 {{ problems.length }} 项阻断：</div>
        <ul class="problem-list">
          <li v-for="(p, i) in problems" :key="i">{{ p.message }}<span v-if="p.anchor">（配置位置：{{ ANCHOR_LABELS[p.anchor] }}）</span></li>
        </ul>
      </a-alert>

      <!-- 判定配置：任务级阈值 + 推送对象，与详情页共用同一个面板 -->
      <a-card title="判定配置" :bordered="false" class="form-card">
        <template #extra>
          <span class="field-hint">先给一套阈值再创建，创建后仍可在详情页「判定配置」里改</span>
        </template>
        <EffectRulePanel v-model="ruleDraft" />
      </a-card>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import DmtPageHeader from '@/modules/variable-hub/components/PageHeader.vue'
import EffectRulePanel from '@/modules/variable-hub/pages/task-center/effect/EffectRulePanel.vue'
import { effectBatchStore } from '@/modules/variable-hub/mock/effect-evaluation/batch-store'
import { EvaluationTaskStore } from '@/modules/variable-hub/mock/evaluation/evaluation-task-store'
import { TASK_KINDS, kindOf } from '@/modules/variable-hub/mock/task-center/task-kinds'
import {
  fieldLabel,
  issueSummary,
  upstreamFieldOptions,
  upstreamKindOptions,
  validateEffectOnSave
} from '@/modules/variable-hub/mock/task-center/io-contract'
import { UserContext, PERMISSIONS } from '@/modules/variable-hub/mock/risk-feature/permissions'

/** 校验问题落在哪块配置，阻断时直接把区域名告诉用户 */
const ANCHOR_LABELS = {
  scripts: '判定口径（脚本）',
  targets: '基础信息',
  input: '输入来源',
  output: '产出契约',
  upstream: '输入来源',
  schedule: '调度方式'
}

const route = useRoute()
const router = useRouter()

const canRun = computed(() => UserContext.has(PERMISSIONS.RUN_EFFECT_TASK))

/** 效果域可新建的类型：唯一来源是注册表，页面不维护清单 */
const kindList = computed(() => TASK_KINDS.filter((k) => k.domain === 'effect' && k.creatable))

/** URL 带进来的类型，取不到就落回第一个可新建类型 */
const initialType = computed(() => {
  const fromQuery = String(route.query.type || '')
  const hit = kindOf(`effect.${fromQuery}`)
  return hit.creatable && hit.domain === 'effect' ? hit.typeValue : kindList.value[0]?.typeValue || 'adhoc'
})

const form = reactive({
  name: '',
  type: initialType.value,
  scheduleText: '每日 06:30',
  /** 输入来源：local = 本域全库，upstream = 引用评估任务产出 */
  inputMode: 'local',
  upstreamTaskId: '',
  upstreamField: ''
})
/** 任务级判定配置草稿：由面板双向维护，提交时随任务一起落库 */
const ruleDraft = ref(null)
/** 契约校验不通过时的阻断项，页面就地列出 */
const problems = ref([])

const submitting = ref(false)

/** 当前类型的全局 kind，契约与注册表都靠它索引 */
const currentKind = computed(() => `effect.${form.type}`)
/** 契约里声明了 upstream 才允许引用上游，没声明就只讲本域口径 */
const upstreamAllowed = computed(() => upstreamKindOptions(currentKind.value).length > 0)
/** 可引用的上游评估任务：按契约 fromKinds 过滤，不合法的类型根本选不到 */
const upstreamCandidates = computed(() => {
  const kinds = upstreamKindOptions(currentKind.value)
  if (!kinds.length) {
    return []
  }
  return EvaluationTaskStore.listTasks().filter((t) => kinds.includes(`evaluation.${t.taskType}`))
})
const upstreamTaskOptions = computed(() =>
  upstreamCandidates.value.map((t) => ({ label: `${t.name}（${(t.targets || []).length} 个对象）`, value: t.id }))
)
const upstreamFieldChoices = computed(() => upstreamFieldOptions(currentKind.value))

/**
 * 选中上游后的血缘信息：覆盖变量数优先取最近一次已结束的实例（实际跑出来的口径），
 * 没有实例就按任务配置的对象数；kind 回传给契约校验比对 fromKinds
 */
const upstreamMeta = computed(() => {
  const task = upstreamCandidates.value.find((t) => t.id === form.upstreamTaskId)
  if (!task) {
    return null
  }
  const runs = EvaluationTaskStore.listRunsByTask(task.id)
  const done = runs.find((r) => r.status === 'success' || r.status === 'partial')
  return {
    name: task.name,
    kind: `evaluation.${task.taskType}`,
    count: done ? done.targetTotal : (task.targets || []).length,
    finished: Boolean(done)
  }
})

/** 选了上游就把字段预先填成第一个可引用项，避免多一步无效操作 */
watch(
  () => [form.inputMode, form.upstreamTaskId],
  () => {
    if (form.inputMode === 'upstream' && !form.upstreamField) {
      form.upstreamField = upstreamFieldChoices.value[0]?.value || ''
    }
  }
)

/**
 * 换类型：不同 kind 的可引用范围不一样，留着旧的上游选择会被契约判红，所以直接重置
 */
function pickType(typeValue) {
  if (form.type === typeValue) {
    return
  }
  form.type = typeValue
  form.upstreamTaskId = ''
  form.upstreamField = ''
  if (!upstreamAllowed.value) {
    form.inputMode = 'local'
  }
  problems.value = []
}

const handleCancel = () => {
  router.push({ path: '/tasks', query: { tab: 'tasks' } })
}

/**
 * 提交：先过契约校验，再建任务，最后落任务级口径
 * 分两步是为了复用 saveTaskRule 的变更历史与快照逻辑，口径没改过就不会留下多余记录
 */
function handleSubmit() {
  if (!canRun.value) {
    return
  }
  const useUpstream = form.inputMode === 'upstream' && !!form.upstreamTaskId
  const check = validateEffectOnSave({
    kind: currentKind.value,
    name: form.name,
    scheduleText: form.scheduleText,
    upstreamTaskId: useUpstream ? form.upstreamTaskId : undefined,
    upstreamField: useUpstream ? form.upstreamField : undefined,
    upstreamExists: useUpstream ? !!upstreamMeta.value : undefined,
    upstreamKind: useUpstream ? upstreamMeta.value?.kind : undefined
  })
  problems.value = check.blockers
  if (problems.value.length) {
    Message.error(`契约校验未通过：${issueSummary(problems.value)}`)
    return
  }
  submitting.value = true
  const created = effectBatchStore.saveTask({
    name: form.name.trim(),
    type: form.type,
    scheduleText: form.scheduleText.trim() || '手动触发',
    inputRef:
      useUpstream && upstreamMeta.value
        ? {
            upstreamTaskId: form.upstreamTaskId,
            upstreamTaskName: upstreamMeta.value.name,
            upstreamField: form.upstreamField,
            upstreamCount: upstreamMeta.value.count
          }
        : undefined
  })
  if (ruleDraft.value) {
    effectBatchStore.saveTaskRule(created.id, ruleDraft.value)
  }
  submitting.value = false
  Message.success(
    useUpstream
      ? `已创建「${created.name}」，输入已引用「${upstreamMeta.value?.name}」的产出`
      : `已创建「${created.name}」，可在详情页调整判定配置`
  )
  /** 用 replace 把新建页从历史里替掉，详情页「返回列表」后退才能落回任务列表 */
  router.replace({ path: `/tasks/effect/${created.id}`, query: { tab: 'rule' } })
}
</script>

<style scoped>
.perm-alert {
  margin-bottom: 12px;
}
.page-content {
  padding: 16px;
  background: var(--color-bg-2);
  border-radius: 8px;
}
.form-card {
  margin-bottom: 16px;
}
.form-card:last-child {
  margin-bottom: 0;
}
.kind-option {
  padding: 12px 14px;
  border: 1px solid var(--color-border-2);
  border-radius: 8px;
  background: var(--color-fill-1);
  cursor: pointer;
  transition: all 0.15s ease;
}
.kind-option:hover {
  border-color: rgb(var(--primary-6));
}
.kind-option--active {
  border-color: rgb(var(--primary-6));
  background: var(--color-primary-light-1);
  box-shadow: 0 0 0 1px rgb(var(--primary-6)) inset;
}
.kind-option-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.kind-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  color: #fff;
  font-size: 12px;
}
.kind-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-1);
}
.kind-desc {
  font-size: 12px;
  line-height: 1.5;
  color: var(--color-text-3);
  min-height: 36px;
}
.field-hint {
  font-size: 12px;
  color: var(--color-text-3);
}
.upstream-hint {
  display: block;
  margin-top: 6px;
}
.upstream-row {
  margin-top: 12px;
}
.lineage-alert {
  margin-top: 4px;
}
.lineage-title {
  font-weight: 600;
  margin-bottom: 2px;
}
.lineage-warn {
  margin-top: 2px;
  color: rgb(var(--warning-6));
}
.problem-head {
  font-weight: 600;
  margin-bottom: 4px;
}
.problem-list {
  margin: 0;
  padding-left: 18px;
}
</style>
