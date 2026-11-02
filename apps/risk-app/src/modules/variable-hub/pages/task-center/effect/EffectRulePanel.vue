<!--
  效果任务 · 任务级判定配置面板（效果域自封装）
  - 判定配置不再是全局一个 Tab：每个效果任务带自己的阈值与推送对象，新建时就配，详情页可改
  - 两种载体共用本组件：
    · 新建（不传 taskId）：阈值与推送在草稿里编辑，由创建页整体提交，此时没有真实批次，不提供试跑
    · 详情（传 taskId）：读写都走 effectBatchStore.saveTaskRule / getTaskRule，并追加任务级变更历史
  - 字段清单、文案、取值格式、合法性判定全部来自 mock 层，页面零硬编码口径、零自算聚合
  - 全局默认模板（effectRuleStore）只作为新建时的预填值，不再单独出入口
-->
<template>
  <div class="effect-rule-panel">
    <a-alert v-if="taskId" type="info" class="scope-alert">
      本任务口径独立生效：保存只影响「{{ taskName }}」后续批次，不改全局默认模板，也不回溯已发布名单与历史批次快照。
      <a-tag v-if="inherited" size="small" color="gray">当前沿用全局默认模板</a-tag>
      <a-tag v-else size="small" color="orange">已自定义（与全局模板脱钩）</a-tag>
    </a-alert>
    <a-alert v-else type="info" class="scope-alert">
      新建时先给一套默认阈值（来自全局模板），保存任务后仍可在详情页「判定配置」里改。
    </a-alert>

    <a-tabs v-model:active-key="activeTab" type="rounded" size="small">
      <!-- ================= 判定阈值 ================= -->
      <a-tab-pane key="rule" title="判定阈值">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-card :bordered="false" class="panel-card">
              <template #title>
                <span class="panel-title">阈值项</span>
                <span class="panel-tip">字段与文案来自 mock 层 RULE_FIELD_METAS，页面不硬编码</span>
              </template>

              <a-alert v-if="!editable" type="warning" class="perm-alert">
                当前角色（风险数据成员）只能查看与预览阈值，保存需「触发跑批」权限。
              </a-alert>

              <!-- 校验文案由 store 的 validateRule 下发，页面不自己比较大小 -->
              <a-alert v-if="!check.ok" type="error" class="perm-alert">{{ check.message }}</a-alert>

              <a-form :model="form" layout="vertical">
                <a-form-item v-for="m in numberMetas" :key="m.key" :label="m.label">
                  <a-input-number
                    v-model="form[m.key]"
                    :min="m.min"
                    :max="m.max"
                    :step="m.step"
                    :precision="m.step < 1 ? 3 : 0"
                    :disabled="!editable"
                    size="small"
                    class="field-input"
                  />
                  <div class="field-hint">{{ m.hint }}</div>
                  <div class="field-current">
                    草稿值 {{ formatRuleValue(m, form[m.key]) }} · 已保存 {{ savedText[m.key] }}
                  </div>
                </a-form-item>

                <a-form-item v-for="m in switchMetas" :key="m.key" :label="m.label">
                  <a-switch v-model="form[m.key]" :disabled="!editable" />
                  <div class="field-hint">{{ m.hint }}</div>
                </a-form-item>

                <a-space class="form-actions">
                  <a-button v-if="taskId" type="primary" size="small" :disabled="!editable || !check.ok" @click="save">
                    保存配置
                  </a-button>
                  <a-button size="small" :disabled="!editable" @click="resetDefault">恢复默认值</a-button>
                  <a-button size="small" type="text" @click="revertToSaved">撤销未保存改动</a-button>
                </a-space>
              </a-form>

              <a-divider class="rule-divider" />
              <div class="saved-line">
                最近保存：{{ savedMeta.updatedAt }} · {{ savedMeta.updatedBy }}
                <a-tag v-if="diff.dirty" size="small" color="orange">
                  {{ diff.changedCount }} 项未保存（{{ diff.changedLabels.join('、') }}）
                </a-tag>
                <a-tag v-else size="small" color="green">与已保存配置一致</a-tag>
              </div>
            </a-card>
          </a-col>

          <!-- 命中预览：输入防抖后由 store 重算，页面不做任何过滤计数 -->
          <a-col :span="12">
            <a-card :bordered="false" class="panel-card">
              <template #title>
                <span class="panel-title">命中预览</span>
                <span class="panel-tip">按左侧草稿阈值实时计算（输入停止 300ms 后刷新）</span>
              </template>

              <a-spin :loading="previewLoading" class="pane-spin">
                <a-row :gutter="12" class="hit-row">
                  <a-col v-for="h in hitCards" :key="h.label" :span="6">
                    <div class="hit-card">
                      <div class="hit-value">{{ h.value }}</div>
                      <div class="hit-label">{{ h.label }}</div>
                    </div>
                  </a-col>
                </a-row>

                <div class="block-title">命中样例（前 10 条）</div>
                <a-table
                  row-key="variableId"
                  :data="preview.sampleRows || []"
                  :pagination="false"
                  size="small"
                  :scroll="{ x: 520 }"
                >
                  <template #columns>
                    <a-table-column title="变量" data-index="name" :width="180">
                      <template #cell="{ record }">
                        <div class="cell-name">
                          <a-link @click="goVariable(record)">{{ record.name }}</a-link>
                          <span class="cell-code">{{ record.code }}</span>
                        </div>
                      </template>
                    </a-table-column>
                    <a-table-column title="结论" data-index="verdictLabel" :width="80" />
                    <a-table-column title="效果指数" :width="90">
                      <template #cell="{ record }"><span class="num strong">{{ record.effectIndex }}</span></template>
                    </a-table-column>
                    <a-table-column title="月调用量" :width="90">
                      <template #cell="{ record }"><span class="num">{{ record.callCount }} 万</span></template>
                    </a-table-column>
                  </template>
                  <template #empty>
                    <a-empty :image="false" description="当前阈值下没有命中样例" />
                  </template>
                </a-table>
              </a-spin>
            </a-card>
          </a-col>
        </a-row>
      </a-tab-pane>

      <!-- ================= 名单推送 ================= -->
      <a-tab-pane key="push" title="名单推送">
        <a-card :bordered="false" class="panel-card">
          <a-form :model="form" layout="vertical" class="push-form">
            <a-form-item label="推送开关">
              <a-switch v-model="form.pushEnabled" :disabled="!editable" />
              <span class="field-hint inline">
                关闭后跑批照常产出名单，只是不推送；当前草稿阈值下为
                {{ preview.offlineHit }} 个汰换 / {{ preview.onlineHit }} 个推荐
              </span>
            </a-form-item>

            <!-- 候选项来自 store 字典，页面不维护协作对象清单 -->
            <a-form-item label="推送对象">
              <a-checkbox-group v-model="form.pushTargets" :disabled="!editable || !form.pushEnabled" class="push-group">
                <a-checkbox v-for="c in candidates" :key="c.id" :value="c.id" class="push-item">
                  <div class="push-item-name">{{ c.name }}</div>
                  <div class="push-item-id">{{ c.id }}</div>
                </a-checkbox>
              </a-checkbox-group>
              <div class="field-hint">已选 {{ chosenText }} ；推送对象只在批次产出后接收名单，不代表可查看全库数据。</div>
            </a-form-item>

            <a-space v-if="taskId">
              <a-button type="primary" size="small" :disabled="!editable || !check.ok" @click="save">保存配置</a-button>
              <a-button size="small" @click="revertToSaved">撤销未保存改动</a-button>
            </a-space>
          </a-form>
        </a-card>
      </a-tab-pane>

      <!-- ================= 抽样试跑（只有已存在的任务才能跑） ================= -->
      <a-tab-pane v-if="taskId" key="trial" title="抽样试跑">
        <a-card :bordered="false" class="panel-card">
          <template #title>
            <span class="panel-title">用草稿阈值做一次抽样试跑</span>
            <span class="panel-tip">试跑不落正式批次、不影响名单推送，只用于保存前验证阈值松紧</span>
          </template>

          <a-form :model="trial" layout="inline" class="trial-form">
            <a-form-item label="抽样比例(%)">
              <a-input-number v-model="trial.sampleRatio" :min="1" :max="100" :step="5" size="small" :disabled="!editable" />
            </a-form-item>
            <a-form-item label="抽样上限(个)">
              <a-input-number v-model="trial.sampleLimit" :min="5" :max="200" :step="5" size="small" :disabled="!editable" />
            </a-form-item>
            <a-form-item>
              <a-button
                type="primary"
                size="small"
                :disabled="!editable || check.previewBlocked"
                :loading="trialing"
                @click="runTrial"
              >
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
            :scroll="{ x: 620 }"
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
              <a-table-column title="缺失率" data-index="missingRateText" :width="100">
                <template #cell="{ record }"><span class="num">{{ record.missingRateText }}</span></template>
              </a-table-column>
            </template>
            <template #empty>
              <a-empty :image="false" description="抽样范围内没有可判定的变量" />
            </template>
          </a-table>
          <a-empty v-else :image="false" description="尚未试跑。" />
        </a-card>
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script setup>
/**
 * 约定：
 * 1. 命中预览与试跑的数字一律由 store 计算返回，组件只渲染，输入停止 300ms 后防抖重算；
 * 2. 区间冲突时禁止保存与试跑（validateRule 下发 previewBlocked / message）；
 * 3. 写权限 RUN_EFFECT_TASK：无权限时表单只读，草稿仍可预览；
 * 4. 子 Tab 只在本组件内切，不写 URL —— 外层 URL 的 ?tab= 归宿主页面（详情/创建）占用。
 */
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import {
  effectRuleStore,
  RULE_NUMBER_METAS,
  RULE_SWITCH_METAS,
  RULE_FIELD_METAS,
  formatRuleValue,
  validateRule
} from '@/modules/variable-hub/mock/effect-evaluation/rule-store'
import { effectBatchStore } from '@/modules/variable-hub/mock/effect-evaluation/batch-store'
import { UserContext, PERMISSIONS } from '@/modules/variable-hub/mock/risk-feature/permissions'

const props = defineProps({
  /** 已存在的任务 ID；缺省即新建草稿模式 */
  taskId: { type: String, default: '' },
  /** 草稿模式下的配置对象（v-model），由创建页整体提交 */
  modelValue: { type: Object, default: null }
})
const emit = defineEmits(['update:modelValue', 'saved'])

const router = useRouter()

const activeTab = ref('rule')
const editable = computed(() => UserContext.has(PERMISSIONS.RUN_EFFECT_TASK))

/** 读任务级已存配置：任务不存在时回退到全局模板，不让面板因为脏链接白屏 */
function loadSaved(id) {
  const payload = id ? effectBatchStore.getTaskRule(id) : null
  return payload ? payload.rule : effectBatchStore.defaultTaskRule()
}

/** 已保存基准：任务级配置或全局默认模板（草稿模式） */
const saved = ref(loadSaved(props.taskId))
const taskName = ref(props.taskId ? effectBatchStore.getTask(props.taskId)?.name || '' : '')
/** 没保存过任务级配置的任务跟全局模板，面板上明确标出来 */
const inherited = computed(() => {
  if (!props.taskId) {
    return true
  }
  const t = effectBatchStore.getTask(props.taskId)
  return !!(t && !t.rule)
})

/** 表单初值：草稿模式取创建页传入的对象，任务模式取已保存配置 */
const initial = props.modelValue || saved.value
const form = reactive({ ...initial, pushTargets: [...(initial.pushTargets || [])] })

const numberMetas = RULE_NUMBER_METAS
const switchMetas = RULE_SWITCH_METAS
const candidates = computed(() => effectRuleStore.pushCandidates())

/** 已保存值的展示文案（key → 文案） */
const savedText = computed(() => {
  const out = {}
  RULE_FIELD_METAS.forEach((m) => {
    out[m.key] = formatRuleValue(m, saved.value[m.key])
  })
  return out
})

/** 合法性判定：文案与拦截位都由 validateRule 下发 */
const check = computed(() => validateRule({ ...form }))

/** 差异计数交给 store，组件不自己比字段 */
const diff = computed(() => effectBatchStore.diffTaskRule(props.taskId || undefined, { ...form }))

/** 预览结果：store 返回，组件只渲染 */
const preview = ref(effectRuleStore.previewHit({ ...form }))
const previewLoading = ref(false)

/** 命中预览四数：剔除合计直接取 store 的 excludedTotal，不在组件里相加 */
const hitCards = computed(() => [
  { label: '命中变量数', value: preview.value.hitCount },
  { label: '判为汰换', value: preview.value.offlineHit },
  { label: '判为推荐', value: preview.value.onlineHit },
  { label: '样本剔除', value: preview.value.excludedTotal }
])

/** 已选推送对象的中文名串（字典与格式在 mock 层） */
const chosenText = computed(() => {
  const meta = RULE_FIELD_METAS.find((m) => m.key === 'pushTargets')
  return meta ? formatRuleValue(meta, form.pushTargets) : '—'
})

const savedMeta = computed(() => ({ updatedAt: saved.value.updatedAt, updatedBy: saved.value.updatedBy }))

const trial = reactive({ sampleRatio: 10, sampleLimit: 50 })
const trialResult = ref(null)
const trialing = ref(false)

let previewTimer = null

/** 防抖重算命中预览：mock 为同步计算，用极短延时把 loading 态表达出来 */
function schedulePreview() {
  clearTimeout(previewTimer)
  previewTimer = window.setTimeout(() => {
    if (check.value.previewBlocked) {
      return
    }
    previewLoading.value = true
    previewTimer = window.setTimeout(() => {
      preview.value = effectRuleStore.previewHit({ ...form })
      previewLoading.value = false
    }, 120)
  }, 300)
}

// 表单任何一项变化都重新预览
watch(() => RULE_FIELD_METAS.map((m) => form[m.key]), schedulePreview, { deep: true })

// 草稿模式：任何改动都同步回创建页，提交时随任务一起落库
watch(
  () => ({ ...form, pushTargets: [...form.pushTargets] }),
  (v) => {
    if (!props.taskId) {
      emit('update:modelValue', v)
    }
  },
  { deep: true }
)

/** 载入任务级已保存配置（切换 taskId 时重新对齐基准） */
function reload() {
  if (!props.taskId) {
    return
  }
  const payload = effectBatchStore.getTaskRule(props.taskId)
  if (!payload) {
    return
  }
  saved.value = payload.rule
  taskName.value = effectBatchStore.getTask(props.taskId)?.name || ''
  RULE_FIELD_METAS.forEach((m) => {
    form[m.key] = Array.isArray(payload.rule[m.key]) ? [...payload.rule[m.key]] : payload.rule[m.key]
  })
  preview.value = effectRuleStore.previewHit({ ...form })
}

watch(() => props.taskId, reload)

/** 保存任务级配置：只写本任务，并追加一条任务级变更历史 */
function save() {
  if (!editable.value || !check.value.ok || !props.taskId) {
    return
  }
  const next = effectBatchStore.saveTaskRule(props.taskId, { ...form, pushTargets: [...form.pushTargets] })
  if (!next) {
    Message.error('保存失败：任务不存在')
    return
  }
  saved.value = loadSaved(props.taskId)
  preview.value = effectRuleStore.previewHit({ ...form })
  Message.success(`本任务阈值已保存（${next.rule ? next.rule.updatedAt : ''}），只影响后续批次`)
  emit('saved', next)
}

/** 恢复默认值：只改草稿，仍需保存才生效 */
function resetDefault() {
  const d = effectRuleStore.defaultRule()
  RULE_FIELD_METAS.forEach((m) => {
    form[m.key] = Array.isArray(d[m.key]) ? [...d[m.key]] : d[m.key]
  })
  Message.info('已填入全局默认阈值，保存后生效')
}

/** 草稿回退到最近一次已保存的配置 */
function revertToSaved() {
  const s = saved.value
  RULE_FIELD_METAS.forEach((m) => {
    form[m.key] = Array.isArray(s[m.key]) ? [...s[m.key]] : s[m.key]
  })
}

/** 试跑：把草稿阈值作为 patch 传入 store，结果不入库 */
function runTrial() {
  if (!editable.value || check.value.previewBlocked || !props.taskId) {
    return
  }
  trialing.value = true
  window.setTimeout(() => {
    const payload = effectBatchStore.trialRun(props.taskId, {
      sampleRatio: trial.sampleRatio,
      sampleLimit: trial.sampleLimit,
      rule: { ...form }
    })
    if (payload) {
      // 缺失率文案由 mock 层的 missingRateText 下发，页面不做百分比换算
      trialResult.value = payload
    } else {
      Message.error('试跑失败：任务不存在')
    }
    trialing.value = false
  }, 200)
}

/** 跳转变量详情效果 Tab */
function goVariable(record) {
  router.push({
    path: `/variable-management/detail/${record.variableId}`,
    query: { tab: 'effect', from: 'variable-hub' }
  })
}

onMounted(() => {
  reload()
  preview.value = effectRuleStore.previewHit({ ...form })
})

onUnmounted(() => {
  clearTimeout(previewTimer)
})

defineExpose({ reload })
</script>

<style scoped>
.scope-alert {
  margin-bottom: 12px;
}
.panel-card {
  margin-bottom: 12px;
}
.panel-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-1);
}
.panel-tip {
  margin-left: 8px;
  font-size: 12px;
  font-weight: 400;
  color: var(--color-text-3);
}
.perm-alert {
  margin-bottom: 12px;
}
.field-input {
  width: 160px;
}
.field-hint {
  margin-top: 4px;
  font-size: 12px;
  color: var(--color-text-3);
  line-height: 1.5;
}
.field-hint.inline {
  display: inline-block;
  margin-left: 10px;
}
.field-current {
  margin-top: 2px;
  font-size: 12px;
  color: var(--color-text-3);
}
.form-actions {
  margin-top: 6px;
}
.rule-divider {
  margin: 12px 0;
}
.saved-line {
  font-size: 12px;
  color: var(--color-text-3);
}
.pane-spin {
  display: block;
  min-height: 160px;
}
.hit-row {
  margin-bottom: 10px;
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
.block-title {
  margin: 14px 0 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-1);
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
.push-form {
  max-width: 780px;
}
.push-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.push-item {
  min-width: 180px;
  padding: 8px 10px;
  border: 1px solid var(--color-border-2);
  border-radius: 8px;
  background: var(--color-fill-1);
}
.push-item-name {
  font-size: 13px;
  color: var(--color-text-1);
}
.push-item-id {
  font-size: 12px;
  color: var(--color-text-3);
}
.trial-form {
  margin-bottom: 10px;
}
.trial-notice {
  margin-bottom: 10px;
}
</style>
