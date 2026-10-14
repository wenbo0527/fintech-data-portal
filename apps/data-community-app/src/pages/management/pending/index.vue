<template>
  <PageContainer>
    <PageHeader
      title="未上线池"
      sub-title="采集登记的表统一落入未上线池：完善元数据 → 上线检查 → 提交审核（纯前端演示，唯一数据源 table-catalog-store）"
    >
      <template #extra>
        <a-space wrap>
          <a-tag :color="roleColor">操作身份：{{ actor }}</a-tag>
          <a-button type="text" @click="goSearch">
            <template #icon><icon-search /></template>
            去统一搜索
          </a-button>
          <a-button @click="confirmReset">
            <template #icon><icon-refresh /></template>
            重置演示数据
          </a-button>
        </a-space>
      </template>
    </PageHeader>

    <div class="content-wrapper">
      <!-- 目录摘要：全部由 TableCatalogStore.stats() 派生 -->
      <a-row :gutter="16" class="stat-row">
        <a-col :xs="12" :sm="12" :md="6">
          <a-card :bordered="false" class="stat-card">
            <a-statistic title="未上线（待完善）" :value="stats.offline" :value-style="{ color: '#86909c' }" />
            <div class="stat-tip">其中 {{ readyCount }} 张硬性检查已通过，可直接提交</div>
          </a-card>
        </a-col>
        <a-col :xs="12" :sm="12" :md="6">
          <a-card :bordered="false" class="stat-card">
            <a-statistic title="审核中" :value="stats.reviewing" :value-style="{ color: '#ff7d00' }" />
            <div class="stat-tip">由「上线审核」页的数据管理员处理</div>
          </a-card>
        </a-col>
        <a-col :xs="12" :sm="12" :md="6">
          <a-card :bordered="false" class="stat-card">
            <a-statistic title="已上线（精编目录）" :value="stats.online" :value-style="{ color: '#00b42a' }" />
            <div class="stat-tip">精编表平均质量分 {{ stats.avgQuality }}</div>
          </a-card>
        </a-col>
        <a-col :xs="12" :sm="12" :md="6">
          <a-card :bordered="false" class="stat-card">
            <a-statistic title="目录总数" :value="stats.total" :value-style="{ color: '#165dff' }" />
            <div class="stat-tip">文档口径存量 {{ stats.declaredTotal }} 张默认已上线</div>
          </a-card>
        </a-col>
      </a-row>

      <!-- 筛选条件（全部前端过滤，不落后端） -->
      <a-card :bordered="false" class="filter-card">
        <a-space wrap>
          <a-select
            v-model="filterSource"
            :options="sourceOptions"
            placeholder="来源系统"
            allow-clear
            style="width: 230px"
          />
          <a-select
            v-model="filterStorage"
            :options="storageOptions"
            placeholder="存储类型"
            allow-clear
            style="width: 150px"
          />
          <a-input v-model="keyword" placeholder="搜索表名 / 中文名 / 负责人 / 业务域" allow-clear style="width: 280px">
            <template #prefix><icon-search /></template>
          </a-input>
          <a-button @click="clearFilters">清空条件</a-button>
          <span v-if="filtered.length !== pool.length" class="hint-text">
            筛选结果 {{ filtered.length }} / {{ pool.length }} 张
          </span>
        </a-space>
      </a-card>

      <!-- 未上线表列表 -->
      <a-card :bordered="false" class="table-card">
        <a-table
          :columns="columns"
          :data="filtered"
          row-key="tableId"
          :pagination="{ pageSize: 10, showTotal: true, sizeCanChange: false }"
          :scroll="{ x: 1260 }"
          size="medium"
        >
          <template #name="{ record }">
            <div class="tbl-name">{{ record.name }}</div>
            <a-space :size="4" class="tbl-sub">
              <a-tag size="small" color="arcoblue">{{ record.layer }}</a-tag>
              <a-tag size="small">{{ record.assetType === 'asset' ? '数据资产' : '数据资源' }}</a-tag>
            </a-space>
          </template>
          <template #quality="{ record }">
            <div class="quality-cell">
              <a-progress
                :percent="Number((record.qualityScore / 100).toFixed(2))"
                size="small"
                :show-text="false"
                :status="record.qualityScore >= 60 ? 'normal' : 'danger'"
                style="width: 72px"
              />
              <span :class="['q-score', record.qualityScore >= 60 ? 'q-ok' : 'q-bad']">{{ record.qualityScore }}</span>
            </div>
          </template>
          <template #status="{ record }">
            <a-space :size="4">
              <a-tag :color="statusColor(record.status)">{{ statusLabel(record.status) }}</a-tag>
              <a-tooltip
                v-if="record.reviewInfo && record.reviewInfo.rejectReason"
                :content="`上次驳回原因：${record.reviewInfo.rejectReason}`"
              >
                <icon-exclamation-circle class="reject-icon" />
              </a-tooltip>
            </a-space>
          </template>
          <template #actions="{ record }">
            <a-space :size="2">
              <a-button type="text" size="small" @click="openMetaDrawer(record.tableId)">完善元数据</a-button>
              <a-button type="text" size="small" @click="previewChecks(record.tableId)">预检</a-button>
              <a-button
                type="text"
                size="small"
                :loading="submittingId === record.tableId"
                @click="submitReview(record.tableId)"
              >
                提交上线申请
              </a-button>
            </a-space>
          </template>
          <template #empty>
            <a-empty :description="pool.length ? '没有符合筛选条件的未上线表' : '未上线池已清空，所有表均已提交上线'">
              <a-button v-if="pool.length" @click="clearFilters">清空筛选条件</a-button>
              <a-button v-else type="primary" @click="goCollectTask">
                <template #icon><icon-storage /></template>
                查看采集任务
              </a-button>
            </a-empty>
          </template>
        </a-table>
      </a-card>
    </div>

    <!-- 完善元数据抽屉 -->
    <a-drawer
      v-model:visible="metaVisible"
      :width="780"
      placement="right"
      ok-text="保存元数据"
      cancel-text="取消"
      :ok-loading="saving"
      :mask-closable="false"
      unmount-on-close
      @ok="handleSaveMeta"
      @cancel="metaVisible = false"
    >
      <template #title>
        <div class="drawer-title">
          <span>完善元数据</span>
          <a-tag color="gray">{{ draft.name }}</a-tag>
        </div>
      </template>

      <div ref="metaBodyRef" class="drawer-body">
        <a-alert v-if="drawerBlockers.length" type="warning" class="drawer-alert">
          <div class="alert-line">以下项本抽屉无法修复，补齐后提交仍会被拦截：</div>
          <div v-for="b in drawerBlockers" :key="b" class="alert-line">· {{ b }}</div>
        </a-alert>

        <a-form ref="metaFormRef" :model="draft" layout="vertical">
          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item field="cnName" label="中文名" :rules="[{ required: true, message: '请填写中文名' }]">
                <div class="fc-wrap" data-fc="cnName">
                  <a-input v-model="draft.cnName" placeholder="例如：客户标签变更表" allow-clear />
                </div>
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item field="sourceSystem" label="来源系统（只读）">
                <a-input :model-value="draft.sourceSystem" disabled />
              </a-form-item>
            </a-col>
          </a-row>

          <a-form-item
            field="description"
            label="表描述（上线检查①硬性项）"
            :rules="[{ required: true, message: '请填写表描述，缺失将被硬性检查拦截' }]"
          >
            <div class="fc-wrap" data-fc="description">
              <a-textarea
                v-model="draft.description"
                placeholder="说明这张表记录什么业务过程、口径边界与主要消费方"
                :auto-size="{ minRows: 2, maxRows: 5 }"
                :max-length="200"
                show-word-limit
              />
            </div>
          </a-form-item>

          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item field="domain" label="业务领域" :rules="[{ required: true, message: '请选择业务领域' }]">
                <div class="fc-wrap" data-fc="domain">
                  <a-select v-model="draft.domain" :options="domainOptions" placeholder="请选择业务领域" allow-create />
                </div>
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item
                field="updateFrequency"
                label="更新频次"
                :rules="[{ required: true, message: '请选择更新频次' }]"
              >
                <div class="fc-wrap" data-fc="updateFrequency">
                  <a-select v-model="draft.updateFrequency" :options="frequencyOptions" placeholder="请选择更新频次" />
                </div>
              </a-form-item>
            </a-col>
          </a-row>

          <a-divider orientation="left" class="sub-divider">
            字段清单（{{ draft.fields.length }} 个字段 · 注释全填才能通过上线检查①）
          </a-divider>

          <a-table
            :columns="fieldColumns"
            :data="draft.fields"
            :row-key="'__key'"
            :pagination="false"
            size="mini"
            :scroll="{ y: 260 }"
          >
            <template #fName="{ record }">
              <a-input v-model="record.name" size="small" placeholder="字段名" />
            </template>
            <template #fType="{ record }">
              <a-select v-model="record.type" :options="fieldTypeOptions" size="small" placeholder="类型" allow-create />
            </template>
            <template #fDesc="{ record }">
              <div class="fc-wrap" :data-fc="record.description ? 'ok' : 'field-desc'">
                <a-input v-model="record.description" size="small" placeholder="字段注释（必填）" />
              </div>
            </template>
            <template #fSens="{ record }">
              <a-select v-model="record.sensitivity" :options="sensitivityOptions" size="small" placeholder="分级" />
            </template>
            <template #fOp="{ record }">
              <a-button type="text" size="mini" status="danger" @click="removeField(record.__key)">
                <template #icon><icon-delete /></template>
              </a-button>
            </template>
            <template #empty>
              <a-empty description="该表暂无字段，请点击下方「新增字段」补录" :image="false" />
            </template>
          </a-table>

          <div class="field-actions">
            <a-button size="small" @click="addField">
              <template #icon><icon-plus /></template>
              新增字段
            </a-button>
          </div>
        </a-form>
      </div>
    </a-drawer>

    <!-- 上线检查报告弹窗（提交结果 / 预检共用） -->
    <a-modal v-model:visible="report.visible" :title="reportTitle" :width="640" :esc-to-close="true">
      <a-alert :type="report.ok ? 'success' : report.hardFailed ? 'error' : 'warning'" class="report-alert">
        {{ report.message }}
      </a-alert>
      <div class="check-list">
        <div v-for="c in report.checks" :key="c.key" class="check-item">
          <div class="check-head">
            <icon-check-circle v-if="c.passed" class="ic-ok" />
            <icon-close-circle v-else :class="c.hard ? 'ic-bad' : 'ic-warn'" />
            <span class="check-name">{{ c.name }}</span>
            <a-tag v-if="c.passed" size="small" color="green">通过</a-tag>
            <a-tag v-else-if="c.hard" size="small" color="red">硬性 · 拦截</a-tag>
            <a-tag v-else size="small" color="orange">软性 · 提示</a-tag>
          </div>
          <div class="check-msg">{{ c.message }}</div>
        </div>
      </div>
      <template #footer>
        <a-space>
          <a-button @click="report.visible = false">{{ report.mode === 'submit' && !report.hardFailed ? '完成' : '关闭' }}</a-button>
          <a-button v-if="report.hardFailed" type="primary" status="danger" @click="goFixMeta">去完善元数据</a-button>
        </a-space>
      </template>
    </a-modal>
  </PageContainer>
</template>

<script setup lang="ts">
/**
 * 未上线池（数据管理 · management/lifecycle/pending）
 *
 * 演示角色：数据工程师（提交方）
 * 数据源：@/mock-dca/shared/table-catalog-store 的 offline 状态表
 * 核心链路：完善元数据(updateMeta) → 预检(runChecks) → 提交上线申请(submitForReview)
 *           硬性检查不过则拦截在池子里，通过后状态变 reviewing 并从本列表消失
 */
import { computed, nextTick, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Message, Modal } from '@arco-design/web-vue'
import type { FormInstance } from '@arco-design/web-vue'
import PageContainer from '@/components-dca/common/PageContainer.vue'
import PageHeader from '@/components-dca/common/PageHeader.vue'
import { useRoleStore } from '@/stores-dca/role'
import {
  TableCatalogStore,
  STATUS_LABELS,
  STATUS_COLORS,
  SENSITIVITY_LABELS,
  runChecks,
  hardChecksPassed,
  type LogicalTable,
  type ReviewCheck,
  type Sensitivity,
  type TableStatus
} from '@/mock-dca/shared/table-catalog-store'

const router = useRouter()
const roleStore = useRoleStore()

/** 演示身份：提交上线申请的 actor（写入 store 的 history / reviewInfo） */
const actor = computed(() => {
  if (roleStore.currentRole === 'data_engineer') return '数据工程师'
  return roleStore.currentRoleDef?.label || '数据工程师'
})
const roleColor = computed(() => roleStore.currentRoleDef?.color || '#165dff')

// ---------------- 列表与筛选 ----------------

/** 未上线池 = store 中 status='offline' 的表（store 内部是 ref，操作后列表自动刷新） */
const pool = computed(() => TableCatalogStore.byStatus('offline'))
const stats = computed(() => TableCatalogStore.stats())

/** 硬性检查已全部通过的表数（可直接提交上线） */
const readyCount = computed(() => pool.value.filter(t => hardChecksPassed(runChecks(t))).length)

const filterSource = ref<string>('')
const filterStorage = ref<string>('')
const keyword = ref<string>('')

const sourceOptions = computed(() =>
  Array.from(new Set(pool.value.map(t => t.sourceSystem))).map(v => ({ label: v, value: v }))
)
const storageOptions = computed(() =>
  Array.from(new Set(pool.value.map(t => t.storage))).map(v => ({ label: v, value: v }))
)

const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return pool.value.filter(t => {
    if (filterSource.value && t.sourceSystem !== filterSource.value) return false
    if (filterStorage.value && t.storage !== filterStorage.value) return false
    if (!kw) return true
    return [t.name, t.cnName, t.owner, t.domain].some(x => (x || '').toLowerCase().includes(kw))
  })
})

function clearFilters() {
  filterSource.value = ''
  filterStorage.value = ''
  keyword.value = ''
}

/** 状态标签：与「上线审核」页同源（STATUS_LABELS / STATUS_COLORS） */
function statusLabel(s: string) {
  return STATUS_LABELS[s as TableStatus] || s
}
function statusColor(s: string) {
  return STATUS_COLORS[s as TableStatus] || 'gray'
}

const columns = [
  { title: '表英文名', dataIndex: 'name', slotName: 'name', width: 220 },
  { title: '中文名', dataIndex: 'cnName', width: 150, ellipsis: true, tooltip: true },
  { title: '来源系统', dataIndex: 'sourceSystem', width: 190, ellipsis: true, tooltip: true },
  { title: '存储', dataIndex: 'storage', width: 90 },
  { title: '业务领域', dataIndex: 'domain', width: 110 },
  { title: '负责人', dataIndex: 'owner', width: 96 },
  { title: '质量分', dataIndex: 'qualityScore', slotName: 'quality', width: 130 },
  { title: '状态', dataIndex: 'status', slotName: 'status', width: 130 },
  { title: '操作', slotName: 'actions', width: 260, fixed: 'right' as const }
]

// ---------------- 完善元数据（抽屉） ----------------

interface FieldDraft {
  /** 仅用于子表 row-key，保存时剥离 */
  __key: string
  name: string
  type: string
  description: string
  sensitivity: Sensitivity
}

const FIELD_TYPES = ['string', 'int', 'bigint', 'decimal', 'timestamp', 'date', 'boolean']
const domainOptions = computed(() =>
  Array.from(new Set(TableCatalogStore.all().map(t => t.domain)))
    .filter(v => v && v !== '未分类')
    .map(v => ({ label: v, value: v }))
)
const frequencyOptions = ['实时', '每日', '每周', '每月', '每季度'].map(v => ({ label: v, value: v }))
const fieldTypeOptions = FIELD_TYPES.map(v => ({ label: v, value: v }))
const sensitivityOptions = (Object.keys(SENSITIVITY_LABELS) as Sensitivity[]).map(k => ({
  label: SENSITIVITY_LABELS[k],
  value: k
}))

const metaVisible = ref(false)
const saving = ref(false)
const metaFormRef = ref<FormInstance>()
const metaBodyRef = ref<HTMLElement>()

const draft = ref({
  tableId: '',
  name: '',
  cnName: '',
  description: '',
  domain: '',
  updateFrequency: '',
  sourceSystem: '',
  fields: [] as FieldDraft[]
})

const fieldColumns = [
  { title: '字段名', slotName: 'fName', width: 150 },
  { title: '类型', slotName: 'fType', width: 120 },
  { title: '字段注释', slotName: 'fDesc' },
  { title: '数据分级', slotName: 'fSens', width: 110 },
  { title: '操作', slotName: 'fOp', width: 60 }
]

/** 抽屉内无法修复、但提交时仍会拦截的项（血缘 / 质量基线 / 权限） */
const drawerBlockers = computed(() => {
  const t = TableCatalogStore.byId(draft.value.tableId)
  if (!t) return []
  const out: string[] = []
  if (!t.upstream.length && !t.downstream.length) {
    out.push('血缘未登记（检查②硬性）：该表上下游均为空，请到血缘登记处补齐后再提交')
  }
  if (t.qualityScore < 60) {
    out.push(`质量基线（检查③硬性）：综合质量分 ${t.qualityScore} 未达 60 分，需先配质量规则治理`)
  }
  if (!t.permissionConfigured) {
    out.push('权限策略（检查④软性）：未配置，上线后默认仅负责人可见，建议一并处理')
  }
  return out
})

function toFieldDraft(list: LogicalTable['fields']): FieldDraft[] {
  return list.map((f, i) => ({
    __key: `fd-${Date.now().toString(36)}-${i}`,
    name: f.name,
    type: f.type,
    description: f.description,
    sensitivity: f.sensitivity
  }))
}

function openMetaDrawer(tableId: string, focusMissing = false) {
  const t = TableCatalogStore.byId(tableId)
  if (!t) {
    Message.error('表不存在，可能已被处理')
    return
  }
  draft.value = {
    tableId: t.tableId,
    name: t.name,
    cnName: t.cnName,
    description: t.description,
    domain: t.domain === '未分类' ? '' : t.domain,
    updateFrequency: t.updateFrequency,
    sourceSystem: t.sourceSystem,
    fields: toFieldDraft(t.fields)
  }
  metaVisible.value = true
  if (focusMissing) focusFirstMissing(t)
}

/** 聚焦第一个缺失的表单项：描述 → 缺注释的字段 → 中文名 */
function focusFirstMissing(t: LogicalTable) {
  const mark = !t.description ? 'description' : t.fields.some(f => !f.description) ? 'field-desc' : 'cnName'
  nextTick(() => focusByMark(mark))
}

/**
 * Arco 的 FormInstance 没有 focus 方法，这里用抽屉体内的标记节点定位原生控件聚焦。
 * data-fc 为空串/'ok' 的节点不会被选中，从而实现「聚焦第一个缺失项」。
 */
function focusByMark(mark: string) {
  const wrap = metaBodyRef.value?.querySelector(`[data-fc="${mark}"]`)
  const el = wrap?.querySelector('input, textarea') as HTMLElement | null
  el?.focus()
}

function addField() {
  draft.value.fields.push({
    __key: `fd-${Date.now().toString(36)}-${draft.value.fields.length}`,
    name: '',
    type: 'string',
    description: '',
    sensitivity: 'internal'
  })
}

function removeField(key: string) {
  const idx = draft.value.fields.findIndex(f => f.__key === key)
  if (idx >= 0) draft.value.fields.splice(idx, 1)
}

async function handleSaveMeta() {
  const errors = await metaFormRef.value?.validate()
  if (errors) {
    Message.warning('请先补全必填项')
    return
  }
  const emptyDesc = draft.value.fields.filter(f => !f.description.trim()).length
  if (emptyDesc) {
    Message.warning(`还有 ${emptyDesc} 个字段未填注释，上线检查①会拦截`)
    focusByMark('field-desc')
    return
  }
  saving.value = true
  const res = TableCatalogStore.updateMeta(
    draft.value.tableId,
    {
      cnName: draft.value.cnName.trim(),
      description: draft.value.description.trim(),
      domain: draft.value.domain.trim() || '未分类',
      updateFrequency: draft.value.updateFrequency,
      fields: draft.value.fields.map(f => ({
        name: f.name.trim(),
        type: f.type.trim() || 'string',
        description: f.description.trim(),
        sensitivity: f.sensitivity
      }))
    },
    actor.value
  )
  saving.value = false
  if (res.ok) {
    Message.success(res.message)
    metaVisible.value = false
  } else {
    Message.error(res.message)
  }
}

// ---------------- 上线检查报告（预检 / 提交） ----------------

const report = ref({
  visible: false,
  mode: 'preview' as 'preview' | 'submit',
  tableId: '',
  tableName: '',
  checks: [] as ReviewCheck[],
  ok: false,
  hardFailed: false,
  message: ''
})

const reportTitle = computed(() =>
  report.value.mode === 'preview'
    ? `上线检查报告（预检）· ${report.value.tableName}`
    : `提交上线申请 · ${report.value.tableName}`
)

function showReport(mode: 'preview' | 'submit', t: LogicalTable, checks: ReviewCheck[], ok: boolean, message: string) {
  const hardFailed = checks.some(c => c.hard && !c.passed)
  const softFailed = checks.filter(c => !c.hard && !c.passed).length
  report.value = {
    visible: true,
    mode,
    tableId: t.tableId,
    tableName: t.name,
    checks,
    ok,
    hardFailed,
    message: message + (softFailed ? `；另有 ${softFailed} 项软性提示（不拦截）` : '')
  }
}

/** 预检：只跑检查项展示结果，不改变表状态 */
function previewChecks(tableId: string) {
  const t = TableCatalogStore.byId(tableId)
  if (!t) return
  const checks = runChecks(t)
  const hardFailed = checks.some(c => c.hard && !c.passed)
  showReport(
    'preview',
    t,
    checks,
    !hardFailed,
    hardFailed ? '预检完成：存在硬性项未通过，正式提交会被拦截（当前状态保持不变）' : '预检完成：硬性检查全部通过，可正式提交上线申请'
  )
}

const submittingId = ref<string>('')

/** 提交上线申请：模拟 500ms 检查耗时后交由 store 流转状态 */
async function submitReview(tableId: string) {
  const t = TableCatalogStore.byId(tableId)
  if (!t) {
    Message.error('表不存在，可能已被处理')
    return
  }
  submittingId.value = tableId
  await new Promise(resolve => setTimeout(resolve, 500))
  const res = TableCatalogStore.submitForReview(tableId, actor.value)
  submittingId.value = ''
  if (res.ok) Message.success(res.message)
  else Message.error(res.message)
  showReport('submit', t, res.checks, res.ok, res.message)
}

/** 硬性未通过 → 关闭报告、打开元数据抽屉并聚焦第一个缺失项 */
function goFixMeta() {
  const tableId = report.value.tableId
  report.value.visible = false
  openMetaDrawer(tableId, true)
}

// ---------------- 页面级动作 ----------------

function goSearch() {
  router.push({ name: 'search' })
}

function goCollectTask() {
  router.push({ name: 'metadata-task' })
}

function confirmReset() {
  Modal.confirm({
    title: '重置演示数据',
    content: '将清空本地持久化并回到种子状态：本次演示中的元数据补全、提交、审核结果全部丢失。确认继续？',
    okText: '确认重置',
    cancelText: '取消',
    onOk: () => {
      TableCatalogStore.resetTableCatalog()
      clearFilters()
      metaVisible.value = false
      report.value.visible = false
      Message.success('演示数据已重置为初始种子状态')
    }
  })
}
</script>

<style lang="scss" scoped>
.content-wrapper {
  padding: 0 24px 24px;
}
.stat-row {
  margin-bottom: 16px;
}
.stat-card {
  :deep(.arco-statistic-title) {
    font-size: 13px;
  }
}
.stat-tip {
  margin-top: 4px;
  font-size: 12px;
  color: #86909c;
}
.filter-card {
  margin-bottom: 12px;
}
.hint-text {
  font-size: 12px;
  color: #86909c;
}
.tbl-name {
  font-family: 'SFMono-Regular', Consolas, Menlo, monospace;
  font-size: 13px;
  color: #1d2129;
}
.tbl-sub {
  margin-top: 2px;
}
.quality-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}
.q-score {
  font-size: 13px;
  font-weight: 600;
}
.q-ok {
  color: #00b42a;
}
.q-bad {
  color: #f53f3f;
}
.reject-icon {
  color: #f53f3f;
}
.drawer-title {
  display: flex;
  align-items: center;
  gap: 8px;
}
.drawer-body {
  padding-bottom: 8px;
}
.drawer-alert {
  margin-bottom: 16px;
}
.alert-line {
  font-size: 12px;
  line-height: 20px;
}
.fc-wrap {
  width: 100%;
}
.sub-divider {
  margin: 8px 0 12px;
  font-size: 13px;
  color: #4e5969;
}
.field-actions {
  margin-top: 10px;
}
.report-alert {
  margin-bottom: 12px;
}
.check-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.check-item {
  padding: 10px 12px;
  background: #f7f8fa;
  border-radius: 6px;
}
.check-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.check-name {
  font-size: 13px;
  font-weight: 600;
  color: #1d2129;
}
.check-msg {
  margin-top: 4px;
  padding-left: 22px;
  font-size: 12px;
  color: #4e5969;
}
.ic-ok {
  color: #00b42a;
}
.ic-bad {
  color: #f53f3f;
}
.ic-warn {
  color: #ff7d00;
}
</style>
