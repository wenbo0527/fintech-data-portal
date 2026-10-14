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
          <a-button @click="goToTables">返回表列表</a-button>
        </a-space>
      </template>
    </PageHeader>

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
          <span>字段分级分类（{{ tableData?.fields.length || 0 }}）</span>
          <a-space>
            <a-input-search
              v-model="searchKw"
              placeholder="搜索字段名/注释"
              allow-clear
              style="width: 240px"
            />
            <a-select v-model="filterLevel" placeholder="全部级别" allow-clear style="width: 130px">
              <a-option v-for="lv in (['L1', 'L2', 'L3', 'L4'] as const)" :key="lv" :value="lv">
                {{ lv }} {{ SENSITIVITY_NAMES[lv] }}
              </a-option>
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
              <a-tag>{{ record.business_belonging }}</a-tag>
            </template>
            <template #cell-grade="{ record }">
              <a-tag :color="record.grade === '关键' ? 'red' : record.grade === '重要' ? 'orange' : 'gray'">
                {{ record.grade }}
              </a-tag>
            </template>
            <template #cell-sensitivity="{ record }">
              <a-tag :color="SENSITIVITY_COLORS[record.sensitivity_level as SensitivityLevel]">
                {{ record.sensitivity_level }}
              </a-tag>
            </template>
            <template #cell-op="{ record }">
              <a-tooltip v-if="!canEdit" content="仅数据治理员可编辑">
                <a-button type="text" size="mini" disabled>编辑</a-button>
              </a-tooltip>
              <a-button v-else type="text" size="mini" @click="openEdit(record)">编辑</a-button>
            </template>
          </a-table>
        </a-tab-pane>

        <a-tab-pane key="history" title="编辑历史">
          <a-table :data="historyList" :pagination="false" row-key="id">
            <template #columns>
              <a-table-column title="修改时间" data-index="modified_at" :width="180" />
              <a-table-column title="修改人" data-index="modified_by" :width="100" />
              <a-table-column title="修改字段" data-index="field_name" :width="120" />
              <a-table-column title="旧值" data-index="old_value" :width="120" />
              <a-table-column title="新值" data-index="new_value" :width="120" />
            </template>
            <template #empty>
              <a-empty description="暂无编辑历史" />
            </template>
          </a-table>
        </a-tab-pane>
      </a-tabs>
    </a-card>

    <!-- 编辑弹窗 -->
    <ClassifyEditModal
      v-model:visible="editVisible"
      :field="editingField"
      :table-key="`${tableData?.schema}.${tableData?.table_name}`"
      @saved="onEditSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { TableColumnData } from '@arco-design/web-vue'
import PageHeader from '@/components-dca/common/PageHeader.vue'
import TableLineageCard, { type LineageNode } from '@/components-dca/common/TableLineageCard.vue'
import { useDraggableColumns } from '@/composables/useDraggableColumns'
import ClassifyEditModal from './components/ClassifyEditModal.vue'
import { classifySystemsData } from '@/mock-shared/classify-modules'
import { classifyEditHistory } from '@/mock-shared/classify-edit-history'
import { SENSITIVITY_COLORS, SENSITIVITY_NAMES, GRADE_OPTIONS, BELONGING_OPTIONS, MOCK_ROLES } from '@/mock-shared/classify-constants'
import type { ClassifyField, ClassifyTable, SensitivityLevel } from '@/mock-shared/classify-types'

const route = useRoute()
const router = useRouter()

const systemId = computed(() => route.params.systemId as string)
const schema = computed(() => route.params.schema as string)
const tableName = computed(() => route.params.tableName as string)

const currentSystem = computed(() => classifySystemsData.find(s => s.id === systemId.value))
const tableData = computed<ClassifyTable | undefined>(() =>
  currentSystem.value?.tables.find(t => t.schema === schema.value && t.table_name === tableName.value)
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

// 表元信息（与数据发现域 TableDetailPage 保持 8 项结构 + 2 列布局）
const tableMetaList = computed(() => {
  if (!tableData.value) return []
  const t = tableData.value
  const sys = currentSystem.value
  // 安全级别分布（demo 用，4 段拼接）
  const dist = { L1: 0, L2: 0, L3: 0, L4: 0 }
  t.fields.forEach(f => { dist[f.sensitivity_level]++ })
  const distText = `L1×${dist.L1} / L2×${dist.L2} / L3×${dist.L3} / L4×${dist.L4}`

  return [
    { label: '表名', value: t.table_name },
    { label: '所属系统', value: sys?.name || '—' },
    { label: 'Schema', value: t.schema },
    { label: '类型', value: sys?.name?.includes('HIVE') ? 'HIVE 表' : '业务表' },
    { label: '表注释', value: t.table_comment },
    { label: '字段数', value: String(t.fields.length) },
    { label: '负责人', value: t.owner },
    { label: '分级覆盖率', value: `${t.coverage}%` },
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
    if (filterLevel.value && f.sensitivity_level !== filterLevel.value) return false
    if (filterBelonging.value && f.business_belonging !== filterBelonging.value) return false
    if (filterGrade.value && f.grade !== filterGrade.value) return false
    return true
  })
})

// 字段列定义（表头可拖动换序 + 列宽可拖动，见 useDraggableColumns）
const fieldColumns = useDraggableColumns((): TableColumnData[] => [
  { title: '字段名', dataIndex: 'field_name', slotName: 'cell-name', width: 140, fixed: 'left' },
  { title: '字段注释', dataIndex: 'field_comment', width: 140 },
  { title: '业务属于', slotName: 'cell-belonging', width: 100 },
  { title: '分级', slotName: 'cell-grade', width: 80 },
  { title: '敏感级别', slotName: 'cell-sensitivity', width: 110 },
  { title: '一级业务目录', dataIndex: 'category_l1', width: 100 },
  { title: '二级业务目录', dataIndex: 'category_l2', width: 120 },
  { title: '三级业务目录', dataIndex: 'category_l3', width: 120 },
  { title: '四级业务目录', dataIndex: 'category_l4', width: 120 },
  { title: '操作', slotName: 'cell-op', width: 100, fixed: 'right' }
])

// 角色（用于权限 demo）
const canEdit = ref(true) // 默认治理员角色

// Tab
const activeTab = ref('fields')
const historyList = computed(() => classifyEditHistory.filter(h => h.field_key.startsWith(`${tableData.value?.schema}.${tableData.value?.table_name}.`)))

// 编辑
const editVisible = ref(false)
const editingField = ref<ClassifyField | null>(null)
const openEdit = (f: ClassifyField) => { editingField.value = f; editVisible.value = true }
const onEditSaved = (updated: ClassifyField) => {
  if (!tableData.value || !editingField.value) return
  const idx = tableData.value.fields.findIndex(f => f.field_name === updated.field_name)
  if (idx > -1) {
    tableData.value.fields[idx] = { ...updated, updated_at: new Date().toISOString().slice(0, 10) }
  }
  editVisible.value = false
  editingField.value = null
}
</script>

<style scoped>
.classify-table-detail-page { padding: 16px 24px 24px; }
.breadcrumb { margin-bottom: 8px; }
.meta-card, .lineage-card { margin-bottom: 16px; }
.fields-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
</style>
