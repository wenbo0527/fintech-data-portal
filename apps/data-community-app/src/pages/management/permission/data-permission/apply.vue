<template>
  <PageContainer>
    <PageHeader
      title="表级权限申请"
      sub-title="表级权限 · 分级驱动四级审批流（挡板演示）"
      show-back
      back-text="返回数据发现"
      @back="goBack"
    >
      <template #extra>
        <a-space wrap>
          <a-tag :color="roleColor">申请身份：{{ applicant }}</a-tag>
          <a-button @click="goProgress">
            <template #icon><icon-clock-circle /></template>
            我的申请进度
          </a-button>
        </a-space>
      </template>
    </PageHeader>

    <div class="content-wrapper">
      <a-alert type="info" class="page-tip" show-icon>
        审批流由「表分级」自动决定：公开 → 直接放行 / 内部 → 域内自动授权 / 敏感 → 管理员审批 / 高敏 → 管理员 + DBA 双审。
        申请人不需要（也不能）手工挑选审批人。
      </a-alert>

      <a-row :gutter="16" align="start">
        <!-- ============ 左：申请表单 ============ -->
        <a-col :xs="24" :xxl="14">
          <a-card :bordered="false" class="form-card">
            <a-form ref="formRef" :model="form" layout="vertical" :disabled="submitting">
              <a-form-item field="tableName" label="目标表" :rules="[{ required: true, message: '请选择要申请的数据表' }]">
                <a-select
                  v-model="form.tableName"
                  placeholder="搜索表名 / 中文名 / 业务域 / 负责人"
                  allow-search
                  allow-clear
                  :filter-option="filterTableOption"
                  :fallback-option="false"
                >
                  <a-option
                    v-for="t in tableOptions"
                    :key="t.name"
                    :value="t.name"
                    :label="`${t.cnName}（${t.name}）`"
                  >
                    <div class="opt-line">
                      <span class="opt-cn">{{ t.cnName }}</span>
                      <span class="opt-en">{{ t.name }}</span>
                      <a-tag size="small" :color="SENSITIVITY_COLORS[t.sensitivity]">
                        {{ SENSITIVITY_LABELS[t.sensitivity] }}
                      </a-tag>
                      <span class="opt-meta">{{ t.domain }} · {{ t.layer }}</span>
                    </div>
                  </a-option>
                  <template #empty>
                    <a-empty :image="false" description="没有匹配的可选表（仅已上线 / 审核中的表可申请）" />
                  </template>
                </a-select>
                <div v-if="selectedTable" class="table-meta">
                  <a-space wrap :size="6">
                    <a-tag size="small" color="arcoblue">{{ selectedTable.layer }}</a-tag>
                    <a-tag size="small" :color="SENSITIVITY_COLORS[selectedTable.sensitivity]">
                      表级 {{ SENSITIVITY_LABELS[selectedTable.sensitivity] }}
                    </a-tag>
                    <span class="meta-text">业务域：{{ selectedTable.domain }}</span>
                    <span class="meta-text">负责人：{{ selectedTable.owner }}</span>
                    <span class="meta-text">字段数：{{ selectedTable.fields.length }}</span>
                    <span class="meta-text">质量分：{{ selectedTable.qualityScore }}</span>
                  </a-space>
                  <div class="meta-desc">{{ selectedTable.description || '（该表暂无描述）' }}</div>
                </div>
              </a-form-item>

              <!-- 高级选项：字段级授权（默认全表） -->
              <a-collapse v-model="advancedKeys" :default-active-key="[]" class="adv-collapse">
                <a-collapse-item key="fields" header="高级选项：仅申请部分字段（不选 = 申请全表）">
                  <a-select
                    v-model="form.fieldNames"
                    multiple
                    allow-clear
                    :max-tag-count="6"
                    placeholder="留空即申请整张表；也可只勾选需要的字段"
                    :disabled="!selectedTable"
                  >
                    <a-option
                      v-for="fd in selectedTable?.fields || []"
                      :key="fd.name"
                      :value="fd.name"
                      :label="fd.name"
                    >
                      <div class="opt-line">
                        <span class="opt-en">{{ fd.name }}</span>
                        <span class="opt-cn">{{ fd.type }}</span>
                        <a-tag size="small" :color="SENSITIVITY_COLORS[fd.sensitivity]">
                          {{ SENSITIVITY_LABELS[fd.sensitivity] }}
                        </a-tag>
                        <span class="opt-meta">{{ fd.description || '无注释' }}</span>
                      </div>
                    </a-option>
                  </a-select>
                  <div class="adv-hint">
                    <span v-if="!form.fieldNames.length">
                      当前口径：<b>全表</b>（{{ selectedTable ? selectedTable.fields.length : 0 }} 个字段）
                    </span>
                    <span v-else>
                      当前口径：<b>指定 {{ form.fieldNames.length }} 个字段</b>
                      （最高分级：{{ selectedFieldLevel ? SENSITIVITY_LABELS[selectedFieldLevel] : '-' }}）
                    </span>
                    <span class="hint-sub">审批流仍按「表级分级」判定，字段级不单独分流。</span>
                  </div>
                </a-collapse-item>
              </a-collapse>

              <a-row :gutter="16" class="form-row">
                <a-col :xs="24" :sm="12">
                  <a-form-item field="scope" label="权限范围">
                    <a-radio-group v-model="form.scope">
                      <a-radio v-for="(label, key) in PERM_SCOPE_LABEL" :key="key" :value="key">
                        {{ label }}
                      </a-radio>
                    </a-radio-group>
                  </a-form-item>
                </a-col>
                <a-col :xs="24" :sm="12">
                  <a-form-item field="validMonths" label="有效期">
                    <a-select v-model="form.validMonths" :options="monthOptions" placeholder="请选择有效期" />
                  </a-form-item>
                </a-col>
              </a-row>

              <a-form-item field="purpose" label="数据用途" :rules="[{ required: true, message: '请选择数据用途' }]">
                <a-select v-model="form.purpose" :options="purposeOptions" placeholder="例如：数据分析 / 风控建模 / 报表" />
              </a-form-item>

              <a-form-item
                field="reason"
                label="申请理由（将完整展示给审批人）"
                :rules="[
                  { required: true, message: '请填写申请理由' },
                  { minLength: 5, message: '申请理由不少于 5 个字，便于审批人判断必要性' }
                ]"
              >
                <a-textarea
                  v-model="form.reason"
                  placeholder="例如：月度客群分层运营需要引用用户风险评分，用于筛选低危存量客户，产出仅用于圈选名单"
                  :auto-size="{ minRows: 3, maxRows: 6 }"
                  :max-length="200"
                  show-word-limit
                />
              </a-form-item>

              <a-form-item class="submit-bar">
                <a-space wrap>
                  <a-button type="primary" :loading="submitting" @click="handleSubmit">
                    <template #icon><icon-send /></template>
                    提交申请
                  </a-button>
                  <a-button :disabled="submitting" @click="resetForm">清空重填</a-button>
                  <span class="submit-hint">当前身份：{{ applicant }}（{{ applicantDept }}）</span>
                </a-space>
              </a-form-item>
            </a-form>
          </a-card>
        </a-col>

        <!-- ============ 右：分级策略预览 + 提交结果 ============ -->
        <a-col :xs="24" :xxl="10">
          <a-card :bordered="false" title="分级策略 · 审批流预览" class="policy-card">
            <a-empty v-if="!selectedTable" :image="false" description="选择目标表后，这里实时展示命中的审批流" />
            <template v-else>
              <a-alert :type="policyAlertType" :title="`审批流：${policy.label}`" show-icon class="policy-alert">
                {{ policy.desc }}
              </a-alert>
              <div class="policy-strip">
                <div
                  v-for="lv in POLICY_LEVELS"
                  :key="lv"
                  class="policy-level"
                  :class="{ active: lv === selectedTable.sensitivity }"
                >
                  <a-tag size="small" :color="SENSITIVITY_COLORS[lv]">{{ SENSITIVITY_LABELS[lv] }}</a-tag>
                  <div class="level-flow">{{ SENSITIVITY_POLICY[lv].label }}</div>
                  <div class="level-who">{{ PERM_FLOW_LABEL[SENSITIVITY_POLICY[lv].flow] }}</div>
                </div>
              </div>
              <a-descriptions :column="1" size="small" bordered class="preview-desc">
                <a-descriptions-item label="目标表">{{ selectedTable.cnName }}（{{ selectedTable.name }}）</a-descriptions-item>
                <a-descriptions-item label="授权口径">
                  {{ form.fieldNames.length ? `指定 ${form.fieldNames.length} 个字段` : '全表' }}
                </a-descriptions-item>
                <a-descriptions-item label="权限范围">{{ PERM_SCOPE_LABEL[form.scope] }}</a-descriptions-item>
                <a-descriptions-item label="有效期">{{ form.validMonths }} 个月</a-descriptions-item>
                <a-descriptions-item label="策略留痕">{{ policyNote }}</a-descriptions-item>
              </a-descriptions>
            </template>
          </a-card>

          <a-card v-if="result" :bordered="false" title="提交结果" class="result-card">
            <a-space wrap :size="6" class="result-head">
              <span class="result-id">单号 {{ result.id }}</span>
              <a-tag :color="PERM_STATUS_COLOR[result.status]">{{ PERM_STATUS_LABEL[result.status] }}</a-tag>
              <a-tag :color="flowTagColor(result.flow)">{{ PERM_FLOW_LABEL[result.flow] }}</a-tag>
            </a-space>

            <!-- public：提交即放行 -->
            <a-alert v-if="result.flow === 'auto'" type="success" title="公开数据 · 已自动放行" show-icon class="result-alert">
              「{{ result.tableCnName }}」为公开数据，权限已即时生效（{{ PERM_SCOPE_LABEL[result.scope] }}），
              可在数据发现 / 表详情直接取数。
            </a-alert>
            <!-- internal：域内自动开通中 → 翻转成功条 -->
            <a-alert
              v-else-if="result.flow === 'domain_auto'"
              :type="autoPhase === 'done' ? 'success' : autoPhase === 'timeout' ? 'warning' : 'info'"
              :title="autoTitle"
              show-icon
              class="result-alert"
            >
              {{ autoText }}
            </a-alert>
            <!-- sensitive / restricted：进入人工审批 -->
            <a-alert v-else type="warning" title="已提交，等待人工审批" show-icon class="result-alert">
              单号 {{ result.id }} 已进入「{{ PERM_FLOW_LABEL[result.flow] }}」队列。
              {{ result.flow === 'approval_dba' ? '管理员通过后还需 DBA 二次确认方可使用。' : '审批结果会以站内通知同步给你。' }}
            </a-alert>

            <a-space wrap class="result-actions">
              <a-button type="primary" @click="goProgress">
                <template #icon><icon-history /></template>
                查看审批进度
              </a-button>
              <a-button @click="goApproval">
                <template #icon><icon-thumb-up /></template>
                去审批台（管理员视角）
              </a-button>
              <a-button @click="resetForm">再申请一张表</a-button>
            </a-space>
          </a-card>
        </a-col>
      </a-row>
    </div>
  </PageContainer>
</template>

<script setup lang="ts">
/**
 * 表级权限申请（数据权限 · 第 1 页）
 *
 * 数据源（唯一事实源，禁止在本页自造字段）：
 *   - 表实体：@/mock-dca/shared/table-catalog-store（可选表 = 已上线 / 审核中）
 *   - 权限单：@/mock-shared/permission-store（分级 → 审批流策略、提交动作）
 *
 * 演示闭环：
 *   选表 → 右侧实时命中 SENSITIVITY_POLICY（四级审批流预览）→ 填理由提交
 *   → 按返回状态分支提示：approved 绿色「已自动放行」/ domain_auto 蓝色「自动开通中」+ 轮询翻转
 *   → pending「已提交待审批」→ 引导跳「审批进度」页
 *
 * 入口约定：支持 `?table=<表英文名>` 预选表（表详情页「申请权限」按钮跳转时携带）
 */
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import type { FormInstance, SelectOptionData } from '@arco-design/web-vue'
import PageContainer from '@/components-dca/common/PageContainer.vue'
import PageHeader from '@/components-dca/common/PageHeader.vue'
import { useRoleStore } from '@/stores-dca/role'
import {
  TableCatalogStore,
  SENSITIVITY_LABELS,
  SENSITIVITY_COLORS,
  STATUS_LABELS,
  type Sensitivity
} from '@/mock-dca/shared/table-catalog-store'
import {
  PermissionStore,
  SENSITIVITY_POLICY,
  PERM_STATUS_LABEL,
  PERM_STATUS_COLOR,
  PERM_SCOPE_LABEL,
  PERM_FLOW_LABEL,
  PERM_PURPOSE_LABEL,
  type PermFlow,
  type PermPurpose,
  type PermScope
} from '@/mock-shared/permission-store'

const route = useRoute()
const router = useRouter()
const roleStore = useRoleStore()

/** 四级策略展示顺序（与分级由低到高一致） */
const POLICY_LEVELS: Sensitivity[] = ['public', 'internal', 'sensitive', 'restricted']

/** 审批流标签色：仅复用 store 里的状态色，不自造色值 */
function flowTagColor(flow: PermFlow): string {
  if (flow === 'auto') return PERM_STATUS_COLOR.approved
  if (flow === 'domain_auto') return PERM_STATUS_COLOR.pending
  if (flow === 'approval') return PERM_STATUS_COLOR.dba_confirming
  return PERM_STATUS_COLOR.rejected
}

/** 模拟一次异步耗时（挡板：真实环境是调权限中心接口） */
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

// ---------------- 演示身份 ----------------
const applicant = computed(() => roleStore.currentRoleDef?.label || '数据工程师')
const applicantDept = computed(() => roleStore.currentRoleDef?.department || '数据团队')
const roleColor = computed(() => roleStore.currentRoleDef?.color || '#165dff')

// ---------------- 表单 ----------------
const formRef = ref<FormInstance>()
const form = reactive({
  tableName: '',
  fieldNames: [] as string[],
  scope: 'read' as PermScope,
  validMonths: 6,
  purpose: 'data-analysis' as PermPurpose,
  reason: ''
})
const advancedKeys = ref<string[]>([])
const submitting = ref(false)

const monthOptions = [1, 3, 6, 12].map(m => ({ label: `${m} 个月`, value: m }))
const purposeOptions = (Object.keys(PERM_PURPOSE_LABEL) as PermPurpose[]).map(k => ({
  label: PERM_PURPOSE_LABEL[k],
  value: k
}))

/** 可选表：已上线 + 审核中（审核中表元数据可见，支持提前申请） */
const tableOptions = computed(() => TableCatalogStore.search(''))

const selectedTable = computed(() => (form.tableName ? TableCatalogStore.byName(form.tableName) : undefined))

/** 命中的分级策略 */
const policy = computed(() => SENSITIVITY_POLICY[selectedTable.value ? selectedTable.value.sensitivity : 'internal'])
const policyNote = computed(() => `${SENSITIVITY_LABELS[selectedTable.value?.sensitivity || 'internal']} · ${policy.value.label}`)

/** 策略提示条配色（Arco alert 四型，不额外自造色值） */
const policyAlertType = computed<'success' | 'info' | 'warning' | 'error'>(() => {
  const s = selectedTable.value?.sensitivity
  if (s === 'public') return 'success'
  if (s === 'sensitive') return 'warning'
  if (s === 'restricted') return 'error'
  return 'info'
})

/** 所选字段的最高分级（仅作提示，审批流仍按表级） */
const selectedFieldLevel = computed<Sensitivity | ''>(() => {
  const t = selectedTable.value
  if (!t || !form.fieldNames.length) return ''
  const order: Sensitivity[] = POLICY_LEVELS
  const levels = t.fields.filter(f => form.fieldNames.includes(f.name)).map(f => f.sensitivity)
  if (!levels.length) return ''
  return levels.reduce((acc, cur) => (order.indexOf(cur) > order.indexOf(acc) ? cur : acc), 'public' as Sensitivity)
})

/** 自定义搜索：中文名 / 英文表名 / 业务域 / 负责人 / 标签 都能命中 */
function filterTableOption(inputValue: string, option: SelectOptionData) {
  const kw = inputValue.trim().toLowerCase()
  if (!kw) return true
  const t = TableCatalogStore.byName(String(option.value ?? ''))
  if (!t) return String(option.label ?? '').toLowerCase().includes(kw)
  return [t.name, t.cnName, t.domain, t.owner, t.layer, SENSITIVITY_LABELS[t.sensitivity]]
    .concat(t.tags)
    .some(x => String(x).toLowerCase().includes(kw))
}

/** 换表后清空字段勾选（避免残留别的表的字段名） */
watch(() => form.tableName, () => {
  form.fieldNames = []
})

// ---------------- 提交与自动开通轮询 ----------------
const resultId = ref('')
const result = computed(() => (resultId.value ? PermissionStore.byId(resultId.value) : undefined))
const autoPhase = ref<'idle' | 'waiting' | 'done' | 'timeout'>('idle')
let autoTimer: ReturnType<typeof setInterval> | null = null

const autoTitle = computed(() => {
  if (autoPhase.value === 'done') return '权限已自动开通'
  if (autoPhase.value === 'timeout') return '自动开通未按时返回'
  return '域内自动开通中，约 1 秒'
})
const autoText = computed(() => {
  const name = result.value ? result.value.tableCnName : '该表'
  if (autoPhase.value === 'done') {
    return `「${name}」为内部数据，已按业务域成员关系自动授权（${PERM_SCOPE_LABEL[result.value?.scope || 'read']}）并即时生效。`
  }
  if (autoPhase.value === 'timeout') {
    return `「${name}」的自动开通未在预期时间内返回，请到审批进度页查看，或在审批台由管理员兜底处理。`
  }
  return `正在按业务域成员关系为「${name}」自动开通权限，无需人工审批，请稍候…`
})

function stopAutoPoll() {
  if (autoTimer) {
    clearInterval(autoTimer)
    autoTimer = null
  }
}

/** internal 档：store 内部 1.2s 后异步置为已通过，页面轮询把结果回显成绿色成功条 */
function startAutoPoll(id: string) {
  autoPhase.value = 'waiting'
  stopAutoPoll()
  let ticks = 0
  autoTimer = setInterval(() => {
    ticks += 1
    const cur = PermissionStore.byId(id)
    if (cur && cur.status === 'approved') {
      stopAutoPoll()
      autoPhase.value = 'done'
      Message.success(`「${cur.tableCnName}」域内自动授权已开通，权限即时生效`)
    } else if (ticks >= 40) {
      stopAutoPoll()
      autoPhase.value = 'timeout'
      Message.warning('自动开通未按时返回，请到审批进度页确认')
    }
  }, 300)
}

async function handleSubmit() {
  if (!form.tableName) {
    Message.warning('请先选择要申请的数据表')
    return
  }
  const errors = await formRef.value?.validate()
  if (errors) return
  submitting.value = true
  stopAutoPoll()
  autoPhase.value = 'idle'
  resultId.value = ''
  await sleep(600) // 挡板：模拟策略计算耗时
  const created = PermissionStore.submit({
    tableName: form.tableName,
    applicant: applicant.value,
    applicantDept: applicantDept.value,
    fieldNames: form.fieldNames.slice(),
    reason: form.reason.trim(),
    purpose: form.purpose,
    scope: form.scope,
    validMonths: form.validMonths
  })
  submitting.value = false
  resultId.value = created.id
  if (created.status === 'approved') {
    Message.success(`公开数据已自动放行：「${created.tableCnName}」${PERM_SCOPE_LABEL[created.scope]}权限即时生效`)
  } else if (created.flow === 'domain_auto') {
    Message.info('内部数据 · 域内自动开通中，约 1 秒出结果')
    startAutoPoll(created.id)
  } else {
    Message.info(`已提交待审批（单号 ${created.id}），进入「${PERM_FLOW_LABEL[created.flow]}」队列`)
  }
}

function resetForm() {
  stopAutoPoll()
  autoPhase.value = 'idle'
  resultId.value = ''
  form.tableName = ''
  form.fieldNames = []
  form.scope = 'read'
  form.validMonths = 6
  form.purpose = 'data-analysis'
  form.reason = ''
  advancedKeys.value = []
  formRef.value?.clearValidate()
}

// ---------------- 入口：?table= 预选 ----------------
function applyTableFromQuery() {
  const raw = route.query.table
  const name = Array.isArray(raw) ? raw[0] : raw
  if (!name) return
  const t = TableCatalogStore.byName(String(name))
  if (!t) {
    Message.warning(`表目录中未找到「${name}」，请手动选择目标表`)
    return
  }
  if (t.status !== 'online' && t.status !== 'reviewing') {
    Message.warning(`表「${t.cnName}」当前为「${STATUS_LABELS[t.status]}」，暂不可申请`)
    return
  }
  if (form.tableName !== t.name) {
    form.tableName = t.name
    Message.info(`已按来源页预选「${t.cnName}（${t.name}）」`)
  }
}

watch(() => route.query.table, applyTableFromQuery)

onMounted(() => {
  roleStore.initFromStorage()
  applyTableFromQuery()
})

onUnmounted(stopAutoPoll)

// ---------------- 跳转 ----------------
function goBack() {
  router.push('/discovery')
}
function goProgress() {
  router.push('/management/permission/data-permission/progress')
}
function goApproval() {
  router.push('/management/permission/data-permission/approval')
}
</script>

<style lang="scss" scoped>
.content-wrapper {
  padding: 0 24px 24px;
}
.page-tip {
  margin-bottom: 12px;
}
.form-card,
.policy-card,
.result-card {
  margin-bottom: 12px;
}
.form-row {
  margin-bottom: 0;
}
.adv-collapse {
  margin-bottom: 16px;
  background: var(--dca-bg-page-alt, #f7f8fa);
  border-radius: var(--dca-radius-md, 6px);
}
.adv-hint {
  margin-top: 8px;
  font-size: 12px;
  color: var(--dca-text-secondary, #4e5969);
}
.hint-sub {
  margin-left: 8px;
  color: var(--dca-text-tertiary, #86909c);
}
.submit-bar {
  margin-bottom: 0;
}
.submit-hint {
  font-size: 12px;
  color: var(--dca-text-tertiary, #86909c);
}
.opt-line {
  display: flex;
  align-items: center;
  gap: 8px;
}
.opt-cn {
  font-size: 13px;
  color: var(--dca-text-primary, #1d2129);
}
.opt-en {
  font-family: 'SFMono-Regular', Consolas, Menlo, monospace;
  font-size: 12px;
  color: var(--dca-text-secondary, #4e5969);
}
.opt-meta {
  font-size: 12px;
  color: var(--dca-text-tertiary, #86909c);
}
.table-meta {
  margin-top: 8px;
  padding: 8px 10px;
  background: var(--dca-bg-page-alt, #f7f8fa);
  border-radius: var(--dca-radius-md, 6px);
}
.meta-text {
  font-size: 12px;
  color: var(--dca-text-secondary, #4e5969);
}
.meta-desc {
  margin-top: 4px;
  font-size: 12px;
  color: var(--dca-text-tertiary, #86909c);
}
.policy-alert {
  margin-bottom: 12px;
}
.policy-strip {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 12px;
}
.policy-level {
  padding: 8px 10px;
  background: var(--dca-bg-page-alt, #f7f8fa);
  border: 1px solid var(--dca-border-light, #e5e6eb);
  border-radius: var(--dca-radius-md, 6px);
  opacity: 0.65;
}
.policy-level.active {
  background: var(--color-primary-light-1, #e8f3ff);
  border-color: var(--dca-brand-primary, #165dff);
  opacity: 1;
}
.level-flow {
  margin-top: 4px;
  font-size: 13px;
  font-weight: 600;
  color: var(--dca-text-primary, #1d2129);
}
.level-who {
  font-size: 12px;
  color: var(--dca-text-tertiary, #86909c);
}
.preview-desc {
  :deep(.arco-descriptions-item-label) {
    width: 92px;
  }
}
.result-head {
  margin-bottom: 10px;
}
.result-id {
  font-family: 'SFMono-Regular', Consolas, Menlo, monospace;
  font-size: 13px;
  font-weight: 600;
  color: var(--dca-text-primary, #1d2129);
}
.result-alert {
  margin-bottom: 12px;
}
.result-actions {
  margin-top: 4px;
}
</style>
