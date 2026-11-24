<template>
  <div class="classify-tables-page">
    <!-- 面包屑 -->
    <a-breadcrumb class="breadcrumb">
      <a-breadcrumb-item><a @click="goHome">数据分级</a></a-breadcrumb-item>
      <a-breadcrumb-item>{{ currentSystem?.name }}</a-breadcrumb-item>
    </a-breadcrumb>

    <PageHeader :title="`${currentSystem?.name || '数据源'} · 表列表`" :sub-title="`当前身份可见 ${visibleTables.length} 张表，${currentSystem?.description || ''}`">
      <template #extra>
        <a-space>
          <a-button @click="goHome">返回数据源</a-button>
          <a-button @click="downloadTemplate">
            <template #icon><icon-download /></template>
            下载模板
          </a-button>
          <a-tooltip :content="auth.canEdit ? '按模板批量补全待分级字段（生成批量变更单，审批通过后生效）' : noEditTip">
            <a-button type="primary" :disabled="!auth.canEdit" @click="openUpload()">
              <template #icon><icon-upload /></template>
              批量上传分级分类
            </a-button>
          </a-tooltip>
          <a-popconfirm content="将清空本地已生效的分级结果与审批单，恢复到演示初始数据？" type="warning" @ok="resetDemo">
            <a-button>
              <template #icon><icon-refresh /></template>
              重置演示数据
            </a-button>
          </a-popconfirm>
        </a-space>
      </template>
    </PageHeader>

    <!-- ① 身份与数据权限条：所有权限差异都源自右上角平台角色，见 classify-permission.ts -->
    <a-alert class="auth-alert" :type="auth.canEdit ? 'info' : 'warning'" show-icon>
      <template #title>
        <a-space :size="8" wrap>
          <span>操作身份</span>
          <a-tag :color="roleDef?.color">{{ roleDef?.label }}</a-tag>
          <a-tag :color="auth.canEdit ? 'arcoblue' : 'gray'">数据权限：{{ auth.label }}</a-tag>
          <span class="auth-scope">可见范围：{{ scopeLabel }}</span>
        </a-space>
      </template>
      <div class="auth-body">
        <span class="auth-desc">
          {{ auth.desc }}
          <template v-if="auth.canEdit">分级变更需审批通过后才会写入分级目录。</template>
          <template v-else>当前身份为只读，编辑入口已置灰，如需修订请申请数据权限。</template>
        </span>
        <a-space :size="8">
          <a-button v-if="!auth.canEdit" size="mini" type="primary" @click="goApplyPermission">申请数据权限</a-button>
          <a-dropdown trigger="click" @select="onSwitchRole">
            <a-button size="mini">
              <template #icon><icon-swap /></template>
              切换身份
            </a-button>
            <template #content>
              <a-doption v-for="p in rolePresets" :key="p.role" :value="p.role" :disabled="p.role === roleStore.currentRole">
                <a-space :size="6">
                  <a-tag :color="p.color" size="small">{{ p.label }}</a-tag>
                  <span class="doption-tier">{{ p.tierLabel }}</span>
                </a-space>
              </a-doption>
            </template>
          </a-dropdown>
        </a-space>
      </div>
    </a-alert>

    <!-- ② 统计卡：治理/开发档看「待分级表数」（治理职责指标），只读档看消费口径 -->
    <a-row v-if="auth.seePendingStats" :gutter="16" class="stats-row">
      <a-col :span="6">
        <a-card>
          <a-statistic title="总表数（可见）" :value="stats.total" :value-style="{ color: '#165DFF' }" />
          <div v-if="auth.schemas !== 'all'" class="stat-note">已按「{{ scopeLabel }}」裁剪</div>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card>
          <a-statistic title="已分级" :value="stats.classified" :value-style="{ color: '#52C41A' }">
            <template #suffix>
              <span style="font-size: 14px; color: #86909c">/ {{ stats.total }}</span>
            </template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card hoverable class="stat-clickable" @click="filterPending">
          <a-statistic title="待分级表数" :value="stats.pending" :value-style="{ color: '#FA8C16' }" />
          <div class="stat-note">共 {{ stats.pendingFieldTotal }} 个字段待补全 · 点击筛选</div>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card>
          <a-statistic
            title="平均覆盖率"
            :value="stats.avgCoverage"
            :precision="1"
            :value-style="{ color: stats.avgCoverage >= 80 ? '#52C41A' : '#FA8C16' }"
          >
            <template #suffix>%</template>
          </a-statistic>
        </a-card>
      </a-col>
    </a-row>
    <a-row v-else :gutter="16" class="stats-row">
      <a-col :span="6">
        <a-card>
          <a-statistic title="总表数（可见）" :value="stats.total" :value-style="{ color: '#165DFF' }" />
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card>
          <a-statistic title="已定级字段数" :value="stats.classifiedFieldTotal" :value-style="{ color: '#52C41A' }">
            <template #suffix>
              <span style="font-size: 14px; color: #86909c">/ {{ stats.total ? tableFieldTotal : 0 }}</span>
            </template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card>
          <a-statistic
            title="平均覆盖率"
            :value="stats.avgCoverage"
            :precision="1"
            :value-style="{ color: stats.avgCoverage >= 80 ? '#52C41A' : '#FA8C16' }"
          >
            <template #suffix>%</template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card hoverable class="stat-clickable" @click="goApproval">
          <a-statistic title="分级变更审批中" :value="inflightTotal" :value-style="{ color: inflightTotal ? '#FA8C16' : '#86909C' }" />
          <div class="stat-note">待分级属治理职责指标，只读身份不展示 · 点击查看审批台</div>
        </a-card>
      </a-col>
    </a-row>

    <!-- ③ 筛选区：只读身份隐藏「未完成」（治理口径） -->
    <a-card class="filter-card">
      <a-form layout="inline" :model="filterForm">
        <a-form-item label="搜索">
          <a-input v-model="filterForm.searchKw" placeholder="按表名/注释搜索" allow-clear style="width: 240px" />
        </a-form-item>
        <a-form-item label="分级状态">
          <a-select v-model="filterForm.statusFilter" placeholder="全部" allow-clear style="width: 140px">
            <a-option value="all">全部</a-option>
            <a-option value="done">已分级</a-option>
            <a-option v-if="auth.seePendingStats" value="pending">未完成</a-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <span class="filter-tip">共 {{ filteredTables.length }} 张</span>
        </a-form-item>
      </a-form>
    </a-card>

    <!-- ④ 表列表 / ⑦ 空态 -->
    <a-card>
      <!-- a-empty 的默认插槽会顶掉 description 区域（Arco 实现如此），
           所以越权说明文案必须写在插槽内部，不能只传 :description -->
      <a-empty v-if="visibleTables.length === 0" class="scope-empty">
        <div class="scope-empty-desc">{{ scopeEmptyDesc }}</div>
        <a-space>
          <a-button type="primary" @click="goApplyPermission">申请数据权限</a-button>
          <a-button @click="scrollToSwitch">切换身份查看</a-button>
        </a-space>
      </a-empty>
      <a-table v-else :data="filteredTables" :pagination="{ showTotal: true, pageSize: 20 }" row-key="table_name">
        <template #columns>
          <a-table-column title="表名" :width="220">
            <template #cell="{ record }">
              <a-link @click="goToDetail(record)">{{ record.table_name }}</a-link>
              <div class="schema-sub">{{ record.schema }}</div>
            </template>
          </a-table-column>
          <a-table-column title="表注释" data-index="table_comment" :width="200">
            <template #cell="{ record }">
              <a-tooltip :content="record.table_comment">
                <span class="comment-cell">{{ record.table_comment }}</span>
              </a-tooltip>
            </template>
          </a-table-column>
          <a-table-column title="字段数" :width="90">
            <template #cell="{ record }">
              <a-tag>{{ record.fields.length }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column title="分级覆盖率" :width="170">
            <template #cell="{ record }">
              <a-progress
                :percent="record.coverage / 100"
                :stroke-color="record.coverage === 100 ? '#52C41A' : '#FA8C16'"
                :show-text="true"
                :format="(p: number) => `${Math.round(p * 100)}%`"
              />
              <div v-if="record.pendingFields" class="pending-sub">{{ record.pendingFields }} 个字段未定级</div>
            </template>
          </a-table-column>
          <a-table-column title="分级分布" :width="240">
            <template #cell="{ record }">
              <a-space :size="4" wrap>
                <a-tag
                  v-for="lv in (['L1', 'L2', 'L3', 'L4'] as const)"
                  :key="lv"
                  :color="SENSITIVITY_COLORS[lv]"
                  size="small"
                >
                  {{ lv }} × {{ countByLevel(record, lv) }}
                </a-tag>
                <a-tag v-if="record.pendingFields" color="gray" size="small">待分级 × {{ record.pendingFields }}</a-tag>
              </a-space>
            </template>
          </a-table-column>
          <!-- ④ 分级变更状态：待分级 / 在途单 / 最近驳回三个信号并存，不互斥 -->
          <a-table-column title="分级变更" :width="170">
            <template #cell="{ record }">
              <a-space :size="4" wrap>
                <a-tag v-if="record.pendingFields" color="gray" size="small">{{ record.pendingFields }} 字段待分级</a-tag>
                <a-tooltip v-if="pendingOf(record).length" :content="pendingTip(record)">
                  <a-tag color="orange" size="small" class="tag-link" @click="goApproval">变更审批中</a-tag>
                </a-tooltip>
                <a-tooltip v-if="rejectedOf(record)" :content="rejectedTip(record)">
                  <a-tag color="red" size="small" class="tag-link" @click="goApproval">变更被驳回</a-tag>
                </a-tooltip>
                <span v-if="!record.pendingFields && !pendingOf(record).length && !rejectedOf(record)" class="schema-sub">无待办</span>
              </a-space>
            </template>
          </a-table-column>
          <a-table-column title="负责人" data-index="owner" :width="100">
            <template #cell="{ record }">
              <a-avatar :size="22" :style="{ background: '#165DFF' }">{{ record.owner?.charAt(0) }}</a-avatar>
              <span style="margin-left: 6px">{{ record.owner }}</span>
            </template>
          </a-table-column>
          <a-table-column title="最近更新" data-index="updated_at" :width="110" />
          <!-- ⑤ 操作列三态：可编辑 / 只读引导申请权限 -->
          <a-table-column title="操作" :width="200" fixed="right">
            <template #cell="{ record }">
              <a-space :size="0">
                <a-button type="text" size="small" @click="goToDetail(record)">查看</a-button>
                <template v-if="auth.canEdit">
                  <a-tooltip :content="editTip(record)">
                    <a-button type="text" size="small" @click="openEdit(record)">编辑</a-button>
                  </a-tooltip>
                </template>
                <template v-else>
                  <a-tooltip :content="noEditTip">
                    <a-button type="text" size="small" disabled>编辑</a-button>
                  </a-tooltip>
                  <a-button type="text" size="mini" @click="goApplyPermission">申请权限</a-button>
                </template>
                <a-button type="text" size="small" @click="exportTable(record)">导出</a-button>
              </a-space>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>

    <!-- 批量上传弹窗（解析结果落成批量变更单，不直接改分级数据） -->
    <ClassifyUploadModal v-model:visible="uploadVisible" :table-name="uploadTableName" @success="onUploadSuccess" />

    <!-- 字段分级编辑弹窗（复用详情页同一组件，提交即发起审批） -->
    <ClassifyEditModal
      v-model:visible="editVisible"
      :field="editingField"
      :table-key="editingTableKey"
      :id-hint="editingInflightHint"
      @submitted="onEditSubmitted"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * 数据分级 · 表列表（classify/tables/:systemId）
 *
 * 2026-11「分级变更审批 + 数据权限」改造要点：
 *  1. 数据源换成 ClassifyStore（响应式 + localStorage），覆盖率/待分级全部按字段派生，
 *     页面不再直读 classify-modules 的普通数组；
 *  2. 数据权限只有唯一入口：resolveClassifyAuth(roleStore.currentRole)，
 *     三档能力（可见 schema / 可编辑 / 可见待分级指标）见 classify-permission.ts；
 *  3. 编辑与批量上传一律「先审后发」：只生成 ClassifyChangeApply，
 *     审批通过后由 ClassifyChangeStore → ClassifyStore.applyApprovedChange() 落地；
 *  4. 审批台复用「表权限审批台」的分级变更 Tab，无权限出口复用表权限申请页。
 */
import { ref, reactive, computed, onMounted, h } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import PageHeader from '@/components-dca/common/PageHeader.vue'
import ClassifyUploadModal from './components/ClassifyUploadModal.vue'
import ClassifyEditModal from './components/ClassifyEditModal.vue'
import { useRoleStore } from '@/stores-dca/role'
import { ROLE_DEFINITIONS, type UserRole } from '@/types-dca/roles'
import { ClassifyStore, type ClassifyTableView } from '@/mock-shared/classify-store'
import {
  ClassifyChangeStore,
  CLASSIFY_STAGE_LABEL,
  CLASSIFY_LEVEL_POLICY,
  buildBatchDiffs,
  type ClassifyChangeApply,
  type ClassifyFieldDiff
} from '@/mock-shared/classify-change-store'
import {
  resolveClassifyAuth,
  scopeText,
  PERM_APPLY_PATH,
  PERM_APPROVAL_PATH
} from '@/mock-shared/classify-permission'
import { SENSITIVITY_COLORS } from '@/mock-shared/classify-constants'
import type { ClassifyField, SensitivityLevel } from '@/mock-shared/classify-types'
import { IconUpload, IconDownload, IconRefresh, IconSwap } from '@arco-design/web-vue/es/icon'

const route = useRoute()
const router = useRouter()
const roleStore = useRoleStore()

const systemId = computed(() => route.params.systemId as string)
const currentSystem = computed(() => ClassifyStore.systemById(systemId.value))

// ---------------- 数据权限档位 ----------------
const auth = computed(() => resolveClassifyAuth(roleStore.currentRole))
const roleDef = computed(() => ROLE_DEFINITIONS[roleStore.currentRole])
const scopeLabel = computed(() => scopeText(auth.value))
const noEditTip = computed(() => `当前身份「${roleDef.value?.label || ''}」为${auth.value.label}，无分级编辑权，需先申请数据权限`)

/** 演示用身份快切：三个档位各留一个代表角色，方便对照权限差异 */
const rolePresets: Array<{ role: UserRole; label: string; color: string; tierLabel: string }> = [
  { role: 'data_admin', label: '数据治理者', color: '#722ed1', tierLabel: '分级治理员 · 全量可编辑可审批' },
  { role: 'data_engineer', label: '数据工程师', color: '#165dff', tierLabel: '数仓开发 · 仅 hive_dw' },
  { role: 'risk_analyst', label: '风控分析师', color: '#fa541c', tierLabel: '只读消费 · 业务系统表' }
]
const onSwitchRole = (v: unknown) => {
  const role = v as UserRole
  if (roleStore.switchRole(role)) {
    Message.success(`已切换到「${ROLE_DEFINITIONS[role]?.label}」：${resolveClassifyAuth(role).label}`)
  }
}

// ---------------- 表列表与统计 ----------------
const allTables = computed<ClassifyTableView[]>(() => ClassifyStore.tablesOf(systemId.value))
const visibleTables = computed(() => ClassifyStore.filterTables(allTables.value, auth.value.schemas))
const stats = computed(() => ClassifyStore.statsFor(visibleTables.value))
const tableFieldTotal = computed(() => visibleTables.value.reduce((s, t) => s + t.fields.length, 0))
const scopeEmptyDesc = computed(() => {
  const name = currentSystem.value?.name || '当前数据源'
  return `当前身份在「${scopeLabel.value}」范围内无可见表（${name}）`
})

/** 在途/驳回标记：直接读 ClassifyChangeStore 的响应式列表，审批后自动刷新 */
const pendingOf = (t: ClassifyTableView): ClassifyChangeApply[] => ClassifyChangeStore.pendingOfTable(t.schema, t.table_name)
const rejectedOf = (t: ClassifyTableView) => ClassifyChangeStore.latestRejected(t.schema, t.table_name)
const inflightTotal = computed(() =>
  visibleTables.value.reduce((s, t) => s + pendingOf(t).length, 0)
)
const pendingTip = (t: ClassifyTableView) => {
  const list = pendingOf(t)
  return list.map(c => `${c.id}｜${c.applicant}｜${c.diffs.map(d => d.field_name).join('、')}｜当前环节：${CLASSIFY_STAGE_LABEL[c.status]}`).join('\n')
}
const rejectedTip = (t: ClassifyTableView) => {
  const c = rejectedOf(t)
  return c ? `${c.id} 驳回理由：${c.approvalComment || c.dbaComment || '未填写'}` : ''
}

const filterForm = reactive({
  searchKw: '',
  statusFilter: '' as '' | 'all' | 'done' | 'pending'
})
const filteredTables = computed(() => {
  return visibleTables.value.filter(t => {
    const kw = filterForm.searchKw.trim()
    const sf = filterForm.statusFilter
    const matchKw = !kw || t.table_name.includes(kw) || t.table_comment.includes(kw)
    const matchStatus = !sf || sf === 'all' ||
      (sf === 'done' && t.coverage === 100) ||
      (sf === 'pending' && t.coverage < 100)
    return matchKw && matchStatus
  })
})
/** 点「待分级表数」卡直接筛出待办队列 */
const filterPending = () => {
  if (!auth.value.seePendingStats) return
  filterForm.statusFilter = filterForm.statusFilter === 'pending' ? 'all' : 'pending'
}

const countByLevel = (t: ClassifyTableView, lv: SensitivityLevel) => t.fields.filter(f => f.sensitivity_level === lv).length

// ---------------- 导航 ----------------
const goHome = () => router.push('/management/metadata/classify/sources')
const goToDetail = (t: ClassifyTableView) => {
  router.push(`/management/metadata/classify/table/${systemId.value}/${t.schema}/${t.table_name}`)
}
const goApplyPermission = () => router.push(PERM_APPLY_PATH)
const goApproval = () => router.push(PERM_APPROVAL_PATH)
const scrollToSwitch = () => {
  document.querySelector('.auth-alert')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  Message.info('请在身份条右侧「切换身份」中选择有编辑权的角色')
}

// ---------------- ⑤ 编辑 → 提交审批 ----------------
const editVisible = ref(false)
const editingField = ref<ClassifyField | null>(null)
const editingTableKey = ref('')
const editingInflightHint = ref('')

/** 优先定位到该表首个未定级字段：这正是治理队列里真正需要人处理的东西 */
const pendingFieldOf = (t: ClassifyTableView): ClassifyField | undefined =>
  t.fields.find(f => f.sensitivity_level === '' && !ClassifyChangeStore.isFieldInFlight(t.schema, t.table_name, f.field_name))
const editTip = (t: ClassifyTableView) => {
  const f = pendingFieldOf(t)
  if (f) return `编辑未定级字段 ${f.field_name}（${f.field_comment}）`
  if (t.pendingFields > 0) return '未定级字段均在审批中，可在详情页查看进度'
  return '本表字段已全部定级，如需调整请到详情页选择字段编辑'
}
const openEdit = (t: ClassifyTableView) => {
  const target = pendingFieldOf(t) || t.fields.find(f => !ClassifyChangeStore.isFieldInFlight(t.schema, t.table_name, f.field_name))
  if (!target) {
    Message.info(`「${t.table_name}」的字段全部已定级或均在审批中，请到详情页跟踪审批进度`)
    return
  }
  editingField.value = target
  editingTableKey.value = `${t.schema}.${t.table_name}`
  editingInflightHint.value = pendingOf(t).map(c => c.id).join(' / ')
  editVisible.value = true
}
const applicantName = () => roleDef.value?.label || '当前用户'
const onEditSubmitted = (payload: { diffs: ClassifyFieldDiff[]; reason: string }) => {
  const tableKey = editingTableKey.value.split('.')
  const schema = tableKey[0]
  const tableName = tableKey.slice(1).join('.')
  try {
    const c = ClassifyChangeStore.submit({
      systemId: systemId.value,
      schema,
      tableName,
      diffs: payload.diffs,
      reason: payload.reason,
      applicant: applicantName(),
      applicantDept: roleDef.value?.department || '未填写'
    })
    editVisible.value = false
    notifySubmitted(`${c.id} · 1 个字段`, c)
  } catch (e) {
    Message.error((e as Error).message)
  }
}

// ---------------- ⑥ 批量上传 → 批量变更单 ----------------
const uploadVisible = ref(false)
const uploadTableName = ref('')
const openUpload = () => { uploadTableName.value = ''; uploadVisible.value = true }
const onUploadSuccess = (count: number) => {
  const targets = (uploadTableName.value
    ? visibleTables.value.filter(t => t.table_name === uploadTableName.value)
    : visibleTables.value
  ).filter(t => t.pendingFields > 0)

  const submitted: ClassifyChangeApply[] = []
  for (const t of targets) {
    const suggestions = ClassifyStore.suggestClassification(systemId.value, t.schema, t.table_name)
    const diffs = buildBatchDiffs(systemId.value, t.schema, t.table_name, suggestions)
    if (!diffs.length) continue
    try {
      submitted.push(ClassifyChangeStore.submit({
        systemId: systemId.value,
        schema: t.schema,
        tableName: t.table_name,
        kind: 'batch',
        diffs,
        reason: `批量上传分级分类（解析 ${count} 个字段），本表补全 ${diffs.length} 个待分级字段的建议值`,
        applicant: applicantName(),
        applicantDept: roleDef.value?.department || '未填写'
      }))
    } catch { /* 单表失败不影响其他表 */ }
  }
  uploadVisible.value = false

  if (!submitted.length) {
    Message.info('解析成功，但当前可见范围内没有待分级字段可落单（未检测到字段变更）')
    return
  }
  const totalFields = submitted.reduce((s, c) => s + c.diffs.length, 0)
  Message.success({
    content: () => h('span', {}, [
      `已提交 ${submitted.length} 张批量变更单（${submitted.map(c => c.id).join('、')}），共 ${totalFields} 个字段，治理员审批通过后生效。`,
      h('a', { style: 'margin-left: 8px', onClick: () => router.push(PERM_APPROVAL_PATH) }, '去审批台')
    ]),
    duration: 7000,
    closable: true
  })
}

/** 提交成功后的统一提示：带上单号与审批流口径，避免用户以为已经改完了 */
function notifySubmitted(label: string, c: ClassifyChangeApply) {
  Message.success({
    content: () => h('span', {}, [
      `已提交分级变更单 ${label}（${CLASSIFY_LEVEL_POLICY[c.maxLevelAfter].label}），审批通过后方可生效。`,
      h('a', { style: 'margin-left: 8px', onClick: () => router.push(PERM_APPROVAL_PATH) }, '去审批台')
    ]),
    duration: 6000,
    closable: true
  })
}

// ---------------- 其他 ----------------
const exportTable = (t: ClassifyTableView) => {
  // Demo 模式：仅 Toast 提示，不生成真实 Excel 文件
  Message.info(`Demo 模式：已生成「${t.schema}.${t.table_name}」共 ${t.fields.length} 个字段的分级导出（实际部署时生成 xlsx）`)
}
const downloadTemplate = () => {
  // Demo 模式：仅提示
  Message.info('Demo 模式：模板下载功能已预留，实际部署时生成 Excel 模板')
}
const resetDemo = () => {
  ClassifyChangeStore.reset()
  ClassifyStore.resetDemo()
  Message.success('已恢复演示初始数据（分级结果与审批单）')
}

onMounted(() => {
  // 角色持久化在 localStorage，MainLayout 的角色弹窗之外的入口也需要主动恢复一次（幂等）
  roleStore.initFromStorage()
})
</script>

<style scoped>
.classify-tables-page { padding: 16px 24px 24px; }
.breadcrumb { margin-bottom: 8px; }
.auth-alert { margin-bottom: 16px; }
.auth-scope { font-size: 12px; color: #86909c; font-weight: 400; }
.auth-body { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.auth-desc { font-size: 12px; color: #4e5969; line-height: 20px; }
.doption-tier { font-size: 12px; color: #86909c; }
.stats-row { margin-bottom: 16px; }
.stat-clickable { cursor: pointer; }
.stat-note { margin-top: 4px; font-size: 12px; color: #86909c; }
.filter-card { margin-bottom: 16px; }
.filter-tip { color: #86909c; font-size: 13px; }
.schema-sub { font-size: 11px; color: #86909c; margin-top: 2px; font-family: monospace; }
.pending-sub { font-size: 11px; color: #FA8C16; }
.comment-cell { display: inline-block; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: middle; }
.tag-link { cursor: pointer; }
.scope-empty { padding: 48px 0; }
.scope-empty-desc { margin-bottom: 16px; font-size: 13px; color: #4e5969; }
</style>
