<template>
  <div class="classify-table-detail-page">
    <!-- 面包屑 -->
    <a-breadcrumb class="breadcrumb">
      <a-breadcrumb-item><a @click="goHome">数据分级</a></a-breadcrumb-item>
      <a-breadcrumb-item><a @click="goToTables">{{ currentSystem?.name }}</a></a-breadcrumb-item>
      <a-breadcrumb-item>{{ tableData?.table_name }}</a-breadcrumb-item>
    </a-breadcrumb>

    <PageHeader :title="tableData?.table_name || '表详情'" :sub-title="tableData?.table_comment || ''">
      <template #extra>
        <a-space>
          <a-tag :color="roleDef?.color">操作身份：{{ roleDef?.label }}（{{ auth.label }}）</a-tag>
          <a-button @click="goToTables">返回表列表</a-button>
        </a-space>
      </template>
    </PageHeader>

    <!-- 越权直达提示：列表已按可见范围裁剪，这里兜住直接改 URL 的场景（只读放行，不整页拦截） -->
    <a-alert v-if="outOfScope" type="warning" show-icon class="scope-alert">
      <template #title>本表（{{ schema }}）不在当前身份「{{ auth.label }}」的可见范围（{{ scopeLabel }}）内</template>
      演示环境不做整页拦截，可查看已生效的分级结果；如需修订分级口径，请到「数据权限申请」提交对应范围的授权。
      <a-button type="text" size="mini" @click="goApplyPermission">申请数据权限</a-button>
    </a-alert>

    <!-- 区域 1：表元信息卡片（表粒度） -->
    <a-card title="表元信息" class="meta-card">
      <a-descriptions :column="2" :data="tableMetaList" />
    </a-card>

    <!-- 区域 2：血缘（上下游） -->
    <TableLineageCard
      class="lineage-card"
      :upstream="lineageUpstream"
      :downstream="lineageDownstream"
      @node-click="onLineageNode"
    >
      <template #tip>
        按仓内分层推演的演示 mock 血缘（ODS 贴源供数 → 本表 → 同系统下游加工），非真实调度链路；「在目录」节点可点击进入对应表详情。
      </template>
    </TableLineageCard>

    <!-- 区域 3：字段分级列表（字段粒度） -->
    <a-card class="fields-card">
      <template #title>
        <div class="fields-header">
          <span>
            字段分级分类（{{ tableData?.fields.length || 0 }}）
            <a-tag v-if="pendingCount" color="orange" size="small">{{ pendingCount }} 个待分级</a-tag>
          </span>
          <a-space>
            <a-input-search
              v-model="searchKw"
              placeholder="搜索字段名/注释"
              allow-clear
              style="width: 220px"
            />
            <a-select v-model="filterLevel" placeholder="全部级别" allow-clear style="width: 140px">
              <a-option v-for="lv in (['L1', 'L2', 'L3', 'L4'] as const)" :key="lv" :value="lv">
                {{ lv }} {{ SENSITIVITY_NAMES[lv] }}
              </a-option>
              <a-option value="__pending__">待分级</a-option>
            </a-select>
            <a-select v-model="filterBelonging" placeholder="业务属于" allow-clear style="width: 130px">
              <a-option v-for="b in BELONGING_OPTIONS" :key="b" :value="b">{{ b }}</a-option>
            </a-select>
            <a-select v-model="filterGrade" placeholder="分级" allow-clear style="width: 110px">
              <a-option v-for="g in GRADE_OPTIONS" :key="g" :value="g">{{ g }}</a-option>
            </a-select>
          </a-space>
        </div>
      </template>

      <a-tabs v-model:active-key="activeTab">
        <a-tab-pane key="fields" title="字段列表">
          <a-table
            :data="filteredFields"
            :columns="fieldColumns"
            :pagination="{ showTotal: true, pageSize: 20 }"
            row-key="field_name"
            :bordered="false"
            :column-resizable="true"
            :scroll="{ x: '100%' }"
          >
            <template #cell-name="{ record }">
              <a-tag color="gray">{{ record.field_name }}</a-tag>
            </template>
            <template #cell-belonging="{ record }">
              <a-tag v-if="record.business_belonging">{{ record.business_belonging }}</a-tag>
              <a-tag v-else color="gray" size="small">未填写</a-tag>
            </template>
            <template #cell-grade="{ record }">
              <a-tag v-if="record.grade" :color="record.grade === '关键' ? 'red' : record.grade === '重要' ? 'orange' : 'gray'">
                {{ record.grade }}
              </a-tag>
              <a-tag v-else color="gray" size="small">未填写</a-tag>
            </template>
            <template #cell-sensitivity="{ record }">
              <!-- 空串 = 待分级，是「待分级表数」的唯一判定依据 -->
              <a-tag v-if="record.sensitivity_level" :color="SENSITIVITY_COLORS[record.sensitivity_level as SensitivityLevel]">
                {{ record.sensitivity_level }} {{ SENSITIVITY_NAMES[record.sensitivity_level as SensitivityLevel] }}
              </a-tag>
              <a-tag v-else color="gray">待分级</a-tag>
            </template>
            <template #cell-change="{ record }">
              <a-space v-if="fieldChanges(record.field_name).length" :size="4" wrap>
                <a-tooltip v-for="c in fieldChanges(record.field_name)" :key="c.id" :content="changeTip(c)">
                  <a-tag color="orange" size="small" class="tag-link" @click="goApproval">
                    {{ c.id }} {{ CLASSIFY_STAGE_LABEL[c.status] }}
                  </a-tag>
                </a-tooltip>
              </a-space>
              <a-tag v-else-if="rejectedChange(record.field_name)" color="red" size="small">
                <a-tooltip :content="changeTip(rejectedChange(record.field_name)!)">
                  {{ rejectedChange(record.field_name)!.id }} 已驳回
                </a-tooltip>
              </a-tag>
              <span v-else class="muted">—</span>
            </template>
            <template #cell-op="{ record }">
              <a-tooltip v-if="!canEdit" :content="noEditTip">
                <a-button type="text" size="mini" disabled>编辑</a-button>
              </a-tooltip>
              <a-tooltip v-else-if="fieldChanges(record.field_name).length" :content="`${record.field_name} 有变更正在审批中`">
                <a-button type="text" size="mini" @click="openEdit(record)">编辑</a-button>
              </a-tooltip>
              <a-button v-else type="text" size="mini" @click="openEdit(record)">编辑</a-button>
            </template>
          </a-table>
        </a-tab-pane>

        <a-tab-pane key="history" :title="`编辑历史（${historyList.length}）`">
          <a-alert type="info" show-icon class="history-tip">
            编辑历史只在「分级变更审批通过」后写入，提交审批本身不改动分级结果（先审后发）。
          </a-alert>
          <a-table :data="historyList" :pagination="false" row-key="id">
            <template #columns>
              <a-table-column title="修改时间" data-index="modified_at" :width="160" />
              <a-table-column title="修改人" data-index="modified_by" :width="110" />
              <a-table-column title="字段" :width="140">
                <template #cell="{ record }">
                  <a-tag color="gray">{{ shortFieldOf(record.field_key) }}</a-tag>
                </template>
              </a-table-column>
              <a-table-column title="修改维度" data-index="field_name" :width="110" />
              <a-table-column title="旧值" data-index="old_value" :width="130" />
              <a-table-column title="新值" data-index="new_value" :width="130" />
            </template>
            <template #empty>
              <a-empty description="暂无编辑历史" />
            </template>
          </a-table>
        </a-tab-pane>
      </a-tabs>
    </a-card>

    <!-- 编辑弹窗：提交即发起分级变更审批，不直接落地 -->
    <ClassifyEditModal
      v-model:visible="editVisible"
      :field="editingField"
      :table-key="`${schema}.${tableName}`"
      :id-hint="editingInflightHint"
      @submitted="onEditSubmitted"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * 数据分级 · 表详情（classify/table/:systemId/:schema/:tableName）
 *
 * 2026-11「分级变更审批 + 数据权限」改造要点：
 *  1. 数据源换成 ClassifyStore（响应式），覆盖率/待分级字段数全部按字段派生；
 *  2. 编辑权由 resolveClassifyAuth(currentRole) 决定，不再写死 canEdit = true；
 *  3. 编辑保存 = 提交分级变更单（先审后发），页面不再直接改字段对象；
 *  4. 编辑历史改为读响应式 classifyEditHistory（审批落地时由 store 追加）。
 */
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import type { TableColumnData } from '@arco-design/web-vue'
import PageHeader from '@/components-dca/common/PageHeader.vue'
import TableLineageCard, { type LineageNode } from '@/components-dca/common/TableLineageCard.vue'
import { useDraggableColumns } from '@/composables/useDraggableColumns'
import ClassifyEditModal from './components/ClassifyEditModal.vue'
import { useRoleStore } from '@/stores-dca/role'
import { ROLE_DEFINITIONS } from '@/types-dca/roles'
import { ClassifyStore, type ClassifyTableView } from '@/mock-shared/classify-store'
import { classifyEditHistory } from '@/mock-shared/classify-edit-history'
import {
  ClassifyChangeStore,
  CLASSIFY_STAGE_LABEL,
  CLASSIFY_LEVEL_POLICY,
  type ClassifyChangeApply,
  type ClassifyFieldDiff
} from '@/mock-shared/classify-change-store'
import { resolveClassifyAuth, scopeText, PERM_APPLY_PATH, PERM_APPROVAL_PATH } from '@/mock-shared/classify-permission'
import { SENSITIVITY_COLORS, SENSITIVITY_NAMES, GRADE_OPTIONS, BELONGING_OPTIONS } from '@/mock-shared/classify-constants'
import type { ClassifyField, SensitivityLevel } from '@/mock-shared/classify-types'

const route = useRoute()
const router = useRouter()
const roleStore = useRoleStore()

const systemId = computed(() => route.params.systemId as string)
const schema = computed(() => route.params.schema as string)
const tableName = computed(() => route.params.tableName as string)

// ---------------- 数据权限档位 ----------------
const auth = computed(() => resolveClassifyAuth(roleStore.currentRole))
const roleDef = computed(() => ROLE_DEFINITIONS[roleStore.currentRole])
const scopeLabel = computed(() => scopeText(auth.value))
const canEdit = computed(() => auth.value.canEdit)
const noEditTip = computed(() => `当前身份「${roleDef.value?.label || ''}」为${auth.value.label}，无分级编辑权，需先申请数据权限`)
const outOfScope = computed(() => auth.value.schemas !== 'all' && !auth.value.schemas.includes(schema.value))
const goApplyPermission = () => router.push(PERM_APPLY_PATH)
const goApproval = () => router.push(PERM_APPROVAL_PATH)

const currentSystem = computed(() => ClassifyStore.systemById(systemId.value))
const tableData = computed<ClassifyTableView | undefined>(() =>
  ClassifyStore.tableOf(systemId.value, schema.value, tableName.value)
)

const goHome = () => router.push('/management/metadata/classify/sources')
const goToTables = () => router.push(`/management/metadata/classify/tables/${systemId.value}`)

// ---------- 血缘（演示 mock：ODS 贴源上游 + 同系统后续表下游） ----------
const lineageUpstream = computed<LineageNode[]>(() => {
  if (!tableData.value) return []
  // ODS 贴源层不在本分级目录内，仅作展示不可点击
  return [{ name: `ods.${tableName.value}`, cnName: 'ODS 贴源供数', resolved: false }]
})

const lineageDownstream = computed<LineageNode[]>(() => {
  if (!currentSystem.value || !tableData.value) return []
  const idx = currentSystem.value.tables.findIndex(
    t => t.schema === schema.value && t.table_name === tableName.value
  )
  if (idx < 0) return []
  return currentSystem.value.tables.slice(idx + 1, idx + 3).map(t => ({
    name: t.table_name,
    cnName: t.table_comment,
    resolved: true
  }))
})

function onLineageNode(node: LineageNode) {
  const hit = currentSystem.value?.tables.find(t => t.table_name === node.name)
  if (hit) router.push(`/management/metadata/classify/table/${systemId.value}/${hit.schema}/${hit.table_name}`)
}

// 表元信息（覆盖率/待分级字段数均为派生值，不再读表上硬编码）
const pendingCount = computed(() => tableData.value?.pendingFields ?? 0)
const tableMetaList = computed(() => {
  if (!tableData.value) return []
  const t = tableData.value
  const sys = currentSystem.value
  // 安全级别分布（demo 用，4 段拼接）；未定级单列，不混进 L1–L4
  const dist: Record<SensitivityLevel, number> = { L1: 0, L2: 0, L3: 0, L4: 0 }
  t.fields.forEach(f => { if (f.sensitivity_level) dist[f.sensitivity_level]++ })
  const distText = `L1×${dist.L1} / L2×${dist.L2} / L3×${dist.L3} / L4×${dist.L4}${pendingCount.value ? ` / 待分级×${pendingCount.value}` : ''}`

  return [
    { label: '表名', value: t.table_name },
    { label: '所属系统', value: sys?.name || '—' },
    { label: 'Schema', value: t.schema },
    { label: '类型', value: sys?.name?.includes('HIVE') ? 'HIVE 表' : '业务表' },
    { label: '表注释', value: t.table_comment },
    { label: '字段数', value: String(t.fields.length) },
    { label: '负责人', value: t.owner },
    { label: '分级覆盖率', value: `${t.coverage}%` },
    { label: '待分级字段数', value: String(pendingCount.value) },
    { label: '敏感级别分布', value: distText },
    { label: '创建时间', value: t.updated_at },
    { label: '最近更新', value: t.updated_at },
    { label: '数据更新时间', value: t.updated_at }
  ]
})

// 字段筛选
const searchKw = ref('')
const filterLevel = ref<string>('')
const filterBelonging = ref<string>('')
const filterGrade = ref<string>('')
const filteredFields = computed(() => {
  if (!tableData.value) return []
  return tableData.value.fields.filter(f => {
    if (searchKw.value && !f.field_name.includes(searchKw.value) && !f.field_comment.includes(searchKw.value)) return false
    // __pending__ 是页面侧的「待分级」虚拟筛选项，映射 sensitivity_level === ''
    if (filterLevel.value === '__pending__') {
      if (f.sensitivity_level !== '') return false
    } else if (filterLevel.value && f.sensitivity_level !== filterLevel.value) return false
    if (filterBelonging.value && f.business_belonging !== filterBelonging.value) return false
    if (filterGrade.value && f.grade !== filterGrade.value) return false
    return true
  })
})

// ---------- 在途变更单（只读展示，落地由审批台驱动） ----------
const inflight = computed<ClassifyChangeApply[]>(() =>
  ClassifyChangeStore.pendingOfTable(schema.value, tableName.value)
)
const rejected = computed(() => ClassifyChangeStore.latestRejected(schema.value, tableName.value))
const fieldChanges = (fieldName: string) => inflight.value.filter(c => c.diffs.some(d => d.field_name === fieldName))
const rejectedChange = (fieldName: string) => {
  const r = rejected.value
  return r && r.diffs.some(d => d.field_name === fieldName) ? r : undefined
}
const changeTip = (c?: ClassifyChangeApply) => {
  if (!c) return ''
  const actor = c.status === 'rejected' && c.dbaComment ? c.dbaComment : (c.approvalComment || c.dbaComment || '')
  return `${c.id}｜${c.applicant}｜${CLASSIFY_LEVEL_POLICY[c.maxLevelAfter].label}｜当前环节：${CLASSIFY_STAGE_LABEL[c.status]}${actor ? `｜意见：${actor}` : ''}`
}

// 字段列定义（表头可拖动换序 + 列宽可拖动，见 useDraggableColumns）
const fieldColumns = useDraggableColumns((): TableColumnData[] => [
  { title: '字段名', dataIndex: 'field_name', slotName: 'cell-name', width: 140, fixed: 'left' },
  { title: '字段注释', dataIndex: 'field_comment', width: 130 },
  { title: '业务属于', slotName: 'cell-belonging', width: 100 },
  { title: '分级', slotName: 'cell-grade', width: 90 },
  { title: '敏感级别', slotName: 'cell-sensitivity', width: 130 },
  { title: '一级业务目录', dataIndex: 'category_l1', width: 100 },
  { title: '二级业务目录', dataIndex: 'category_l2', width: 120 },
  { title: '三级业务目录', dataIndex: 'category_l3', width: 120 },
  { title: '四级业务目录', dataIndex: 'category_l4', width: 120 },
  { title: '变更状态', slotName: 'cell-change', width: 180 },
  { title: '操作', slotName: 'cell-op', width: 90, fixed: 'right' }
])

// Tab
const activeTab = ref('fields')
const shortFieldOf = (fieldKey: string) => fieldKey.split('.').pop() || fieldKey
const historyList = computed(() =>
  classifyEditHistory.value.filter(h => h.field_key.startsWith(`${schema.value}.${tableName.value}.`))
)

// 编辑 → 提交审批
const editVisible = ref(false)
const editingField = ref<ClassifyField | null>(null)
const editingInflightHint = computed(() => inflight.value.map(c => c.id).join(' / '))
const openEdit = (f: ClassifyField) => { editingField.value = f; editVisible.value = true }
const onEditSubmitted = (payload: { diffs: ClassifyFieldDiff[]; reason: string }) => {
  try {
    const c = ClassifyChangeStore.submit({
      systemId: systemId.value,
      schema: schema.value,
      tableName: tableName.value,
      diffs: payload.diffs,
      reason: payload.reason,
      applicant: roleDef.value?.label || '当前用户',
      applicantDept: roleDef.value?.department || '未填写'
    })
    editVisible.value = false
    editingField.value = null
    Message.success(`已提交变更单 ${c.id} · ${CLASSIFY_LEVEL_POLICY[c.maxLevelAfter].label}，通过后方可生效`)
  } catch (e) {
    Message.error((e as Error).message)
  }
}

onMounted(() => {
  // MainLayout 的角色弹窗会写 localStorage，但 URL 直达本页时也需要恢复一次（幂等）
  roleStore.initFromStorage()
})
</script>

<style scoped>
.classify-table-detail-page { padding: 16px 24px 24px; }
.breadcrumb { margin-bottom: 8px; }
.scope-alert { margin-bottom: 16px; }
.meta-card, .lineage-card { margin-bottom: 16px; }
.fields-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
.history-tip { margin-bottom: 12px; }
.tag-link { cursor: pointer; }
.muted { color: #c9cdd4; }
</style>
