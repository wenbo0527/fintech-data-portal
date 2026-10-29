<template>
  <div class="effect-settings-page">
    <DmtPageHeader
      title="阈值与推送配置"
      subtitle="「汰换 / 推荐」名单的判定阈值与推送对象；改这里影响后续所有跑批批次，不回溯已发布名单。"
    >
      <template #extra>
        <a-space>
          <a-button @click="router.push('/effect-tasks')">返回任务列表</a-button>
          <a-button @click="router.push('/variable-hub')">效果总览</a-button>
        </a-space>
      </template>
    </DmtPageHeader>

    <!-- 口径说明：与总览页同一句话，唯一来源仍是 effectStore.overview() -->
    <a-alert type="info" class="coverage-alert">{{ coverageNote }}</a-alert>

    <a-tabs v-model:active-key="activeTab" type="rounded" size="small" class="settings-tabs">
      <!-- ================= 判定阈值 ================= -->
      <a-tab-pane key="rule" title="判定阈值">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-card :bordered="false" class="panel-card">
              <template #title>
                <span class="panel-title">阈值项</span>
                <span class="panel-tip">字段与文案来自 mock 层 RULE_FIELD_METAS，页面不硬编码</span>
              </template>

              <a-alert v-if="!canRun" type="warning" class="perm-alert">
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
                    :disabled="!canRun"
                    size="small"
                    class="field-input"
                  />
                  <div class="field-hint">{{ m.hint }}</div>
                  <div class="field-current">
                    草稿值 {{ formatRuleValue(m, form[m.key]) }} · 已保存 {{ savedText[m.key] }}
                  </div>
                </a-form-item>

                <a-form-item v-for="m in switchMetas" :key="m.key" :label="m.label">
                  <a-switch v-model="form[m.key]" :disabled="!canRun" />
                  <div class="field-hint">{{ m.hint }}</div>
                </a-form-item>

                <a-space class="form-actions">
                  <a-button type="primary" size="small" :disabled="!canRun || !check.ok" @click="save">
                    保存配置
                  </a-button>
                  <a-button size="small" :disabled="!canRun" @click="resetDefault">恢复默认值</a-button>
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
                  :scroll="{ x: 560 }"
                >
                  <template #columns>
                    <a-table-column title="变量" data-index="name" :width="200">
                      <template #cell="{ record }">
                        <div class="cell-name">
                          <a-link @click="goVariable(record)">{{ record.name }}</a-link>
                          <span class="cell-code">{{ record.code }}</span>
                        </div>
                      </template>
                    </a-table-column>
                    <a-table-column title="结论" data-index="verdictLabel" :width="80" />
                    <a-table-column title="效果指数" :width="100">
                      <template #cell="{ record }"><span class="num strong">{{ record.effectIndex }}</span></template>
                    </a-table-column>
                    <a-table-column title="月调用量" :width="100">
                      <template #cell="{ record }"><span class="num">{{ record.callCount }} 万</span></template>
                    </a-table-column>
                    <a-table-column title="口径" :width="120">
                      <template #cell="{ record }">
                        <a-tag v-if="record.synthetic" size="small">演示合成</a-tag>
                        <a-tag v-else size="small" color="green">台账正式</a-tag>
                      </template>
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
              <a-switch v-model="form.pushEnabled" :disabled="!canRun" />
              <span class="field-hint inline">
                关闭后跑批照常产出名单，只是不推送；当前草稿阈值下为
                {{ pushSummary.offline }} 个汰换 / {{ pushSummary.online }} 个推荐
              </span>
            </a-form-item>

            <!-- 候选项来自 store 字典，页面不维护协作对象清单 -->
            <a-form-item label="推送对象">
              <a-checkbox-group
                v-model="form.pushTargets"
                :disabled="!canRun || !form.pushEnabled"
                class="push-group"
              >
                <a-checkbox v-for="c in candidates" :key="c.id" :value="c.id" class="push-item">
                  <div class="push-item-name">{{ c.name }}</div>
                  <div class="push-item-id">{{ c.id }}</div>
                </a-checkbox>
              </a-checkbox-group>
              <div class="field-hint">
                已选 {{ chosenText }} ；推送对象只在批次产出后接收名单，不代表可查看全库数据。
              </div>
            </a-form-item>

            <a-space>
              <a-button type="primary" size="small" :disabled="!canRun || !check.ok" @click="save">保存配置</a-button>
              <a-button size="small" @click="revertToSaved">撤销未保存改动</a-button>
            </a-space>
          </a-form>
        </a-card>
      </a-tab-pane>

      <!-- ================= 抽样试跑 ================= -->
      <a-tab-pane key="trial" title="抽样试跑">
        <a-card :bordered="false" class="panel-card">
          <template #title>
            <span class="panel-title">用草稿阈值做一次抽样试跑</span>
            <span class="panel-tip">试跑不落正式批次、不影响名单推送，只用于保存前验证阈值松紧</span>
          </template>

          <a-alert v-if="!canRun" type="warning" class="perm-alert">
            当前角色无「触发跑批」权限，试跑按钮不可用。
          </a-alert>

          <a-form :model="trial" layout="inline" class="trial-form">
            <a-form-item label="抽样比例(%)">
              <a-input-number v-model="trial.sampleRatio" :min="1" :max="100" :step="5" size="small" :disabled="!canRun" />
            </a-form-item>
            <a-form-item label="抽样上限(个)">
              <a-input-number v-model="trial.sampleLimit" :min="5" :max="200" :step="5" size="small" :disabled="!canRun" />
            </a-form-item>
            <a-form-item>
              <a-button
                type="primary"
                size="small"
                :disabled="!canRun || check.previewBlocked"
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
            :scroll="{ x: 700 }"
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
 * 效果任务管理 · 阈值与推送配置页
 *
 * 约束（见评估文档 §5 / §6）：
 * 1. 字段清单、文案、取值格式、合法性判定全部来自 mock 层，页面零硬编码口径、零自算聚合；
 * 2. 命中预览与试跑的数字一律由 store 计算返回，组件只渲染；
 * 3. Tab 进 URL（?tab=rule|push|trial），前进后退可还原；
 * 4. 输入停止 300ms 后防抖重算预览；区间冲突时禁止保存与试跑；
 * 5. 写权限 RUN_EFFECT_TASK：默认演示角色为风险数据成员，保存与试跑不可用。
 */
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import DmtPageHeader from '@/modules/variable-hub/components/PageHeader.vue'
import {
  effectRuleStore,
  RULE_NUMBER_METAS,
  RULE_SWITCH_METAS,
  RULE_FIELD_METAS,
  formatRuleValue,
  validateRule
} from '@/modules/variable-hub/mock/effect-evaluation/rule-store'
import { effectBatchStore } from '@/modules/variable-hub/mock/effect-evaluation/batch-store'
import { effectStore } from '@/modules/variable-hub/mock/effect-evaluation/effect-store'
import { UserContext, PERMISSIONS } from '@/modules/variable-hub/mock/risk-feature/permissions'

const router = useRouter()
const route = useRoute()

/** 三个子 Tab 的合法值 */
const SETTING_TABS = ['rule', 'push', 'trial']
const activeTab = ref(SETTING_TABS.includes(String(route.query.tab)) ? String(route.query.tab) : 'rule')

const canRun = computed(() => UserContext.has(PERMISSIONS.RUN_EFFECT_TASK))

/** 已保存的配置（对照与撤销的基准） */
const saved = ref(effectRuleStore.getRule())

/** 草稿表单：数值 + 开关 + 推送对象 */
const form = reactive({ ...saved.value, pushTargets: [...saved.value.pushTargets] })

/** 表单分区：由 mock 层拆好的两组元数据驱动渲染 */
const numberMetas = RULE_NUMBER_METAS
const switchMetas = RULE_SWITCH_METAS

/** 推送候选项：store 下发 */
const candidates = computed(() => effectRuleStore.pushCandidates())

/** 口径说明：与总览页 / 任务列表页同一来源 */
const coverageNote = computed(() => effectStore.overview().coverageNote)

/** 已保存值的展示文案（key → 文案） */
const savedText = computed(() => {
  const out = {}
  RULE_FIELD_METAS.forEach((m) => {
    out[m.key] = formatRuleValue(m, saved.value[m.key])
  })
  return out
})

/** 草稿与已保存的差异：比对逻辑在 store，页面只显示结果 */
const diff = computed(() => effectRuleStore.diffRule({ ...form }))

/** 合法性判定：文案与拦截位都由 validateRule 下发 */
const check = computed(() => validateRule({ ...form }))

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

/** 推送摘要数字：直接取预览结果 */
const pushSummary = computed(() => ({
  offline: preview.value.offlineHit,
  online: preview.value.onlineHit
}))

/** 已选推送对象的中文名串（字典与格式在 mock 层） */
const chosenText = computed(() => {
  const meta = RULE_FIELD_METAS.find((m) => m.key === 'pushTargets')
  return meta ? formatRuleValue(meta, form.pushTargets) : '—'
})

/** 最近保存信息 */
const savedMeta = computed(() => ({ updatedAt: saved.value.updatedAt, updatedBy: saved.value.updatedBy }))

const trial = reactive({ sampleRatio: 10, sampleLimit: 50 })
const trialResult = ref(null)
const trialing = ref(false)

let previewTimer = null

/**
 * 防抖重算命中预览
 * mock 为同步计算，用极短延时把 loading 态表达出来
 */
function schedulePreview() {
  clearTimeout(previewTimer)
  previewTimer = window.setTimeout(() => {
    if (check.value.previewBlocked) return
    previewLoading.value = true
    previewTimer = window.setTimeout(() => {
      preview.value = effectRuleStore.previewHit({ ...form })
      previewLoading.value = false
    }, 120)
  }, 300)
}

// 表单任何一项变化都重新预览
watch(() => RULE_FIELD_METAS.map((m) => form[m.key]), schedulePreview, { deep: true })

/** Tab 变化回写 URL */
watch(activeTab, (v) => {
  const next = { ...route.query }
  if (v === 'rule') delete next.tab
  else next.tab = v
  router.replace({ query: next })
})

/** 外部改 URL（前进后退）时同步回 Tab */
watch(
  () => route.query.tab,
  (v) => {
    const next = SETTING_TABS.includes(String(v)) ? String(v) : 'rule'
    if (next !== activeTab.value) activeTab.value = next
  }
)

/**
 * 保存配置：写 localStorage，同步刷新已保存快照与预览
 */
function save() {
  if (!canRun.value || !check.value.ok) return
  const next = effectRuleStore.saveRule({ ...form, pushTargets: [...form.pushTargets] })
  saved.value = next
  preview.value = effectRuleStore.previewHit(next)
  Message.success(`阈值已保存，将应用于后续批次（${next.updatedAt}）`)
}

/**
 * 恢复默认值：只改草稿，仍需保存才生效
 */
function resetDefault() {
  const d = effectRuleStore.defaultRule()
  RULE_FIELD_METAS.forEach((m) => {
    form[m.key] = Array.isArray(d[m.key]) ? [...d[m.key]] : d[m.key]
  })
  Message.info('已填入默认阈值，保存后生效')
}

/** 草稿回退到最近一次已保存的配置 */
function revertToSaved() {
  const s = saved.value
  RULE_FIELD_METAS.forEach((m) => {
    form[m.key] = Array.isArray(s[m.key]) ? [...s[m.key]] : s[m.key]
  })
}

/**
 * 试跑：把草稿阈值作为 patch 传入 store，结果不入库
 * 载体取一个已启用的临时任务，仅用于复用 store 的试跑口径
 */
function runTrial() {
  if (!canRun.value || check.value.previewBlocked) return
  const carrier = effectBatchStore.listTasks({ type: 'adhoc' }).rows.find((t) => t.enabled)
  if (!carrier) {
    Message.error('没有可用于试跑的临时任务，请先在任务列表新建')
    return
  }
  trialing.value = true
  window.setTimeout(() => {
    const payload = effectBatchStore.trialRun(carrier.id, {
      sampleRatio: trial.sampleRatio,
      sampleLimit: trial.sampleLimit,
      rule: { ...form }
    })
    if (payload) {
      // 缺失率文案由 mock 层的 missingRateText 下发，页面不做百分比换算
      trialResult.value = payload
    } else {
      Message.error('试跑失败：载体任务不存在')
    }
    trialing.value = false
  }, 200)
}

/**
 * 跳转变量详情效果 Tab
 * @param {object} record 预览样例行
 */
function goVariable(record) {
  router.push({
    path: `/variable-management/detail/${record.variableId}`,
    query: { tab: 'effect', from: 'variable-hub' }
  })
}

onMounted(() => {
  saved.value = effectRuleStore.getRule()
  preview.value = effectRuleStore.previewHit({ ...form })
})

onUnmounted(() => {
  clearTimeout(previewTimer)
})
</script>

<style scoped>
.coverage-alert {
  margin-bottom: 12px;
}
.settings-tabs {
  margin-top: 4px;
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
