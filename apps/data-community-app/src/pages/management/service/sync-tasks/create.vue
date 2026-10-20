<template>
  <PageContainer size="wide" class="sync-create">
    <PageHeader
      title="新建同步任务"
      sub-title="Doris ↔ Hive 双向自助同步 · 表六步配置:数据源 → 表选择 → 字段映射 → 同步策略 → 触发方式 → 保存"
    >
      <template #extra>
        <a-space>
          <a-button @click="goBack">取消</a-button>
          <a-button @click="onSaveDraft">存草稿</a-button>
          <a-button type="primary" :loading="submitting" @click="onSaveAndEnable">保存并启用</a-button>
        </a-space>
      </template>
    </PageHeader>

    <a-alert
      v-if="errors.length"
      type="error"
      show-icon
      class="sync-create__alert"
      :title="`保存校验未通过(共 ${errors.length} 项)`"
    >
      <ul class="sync-create__err-list">
        <li v-for="(e, i) in errors" :key="i">
          <a-tag size="small" color="red">{{ e.field }}</a-tag>
          {{ e.message }}
        </li>
      </ul>
    </a-alert>

    <a-form :model="form" layout="vertical" class="sync-create__form">
      <!-- ═══ ① 同步方向(先选方向,锁定源/目标类型) ═══ -->
      <a-card title="① 同步方向" :bordered="false">
        <a-form-item label="方向" required>
          <a-radio-group v-model="form.direction" type="button" size="large">
            <a-radio value="doris-to-hive">Doris → Hive</a-radio>
            <a-radio value="hive-to-doris">Hive → Doris</a-radio>
          </a-radio-group>
          <div class="sync-section__hint">
            选中方向后,源端/目标端类型自动锁定为对应数据源,只需在下方选择具体的库和表
          </div>
        </a-form-item>
        <a-row :gutter="16">
          <a-col :span="12">
            <div class="sync-section__sub">源端</div>
            <a-form-item label="源端类型">
              <a-tag size="small" :color="form.sourceDatasource === 'doris' ? 'arcoblue' : 'orange'">
                {{ store.datasourceLabel(form.sourceDatasource) }}
              </a-tag>
              <span class="sync-section__hint" style="margin-left: 8px">
                由「方向」自动锁定
              </span>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <div class="sync-section__sub">目标端</div>
            <a-form-item label="目标端类型">
              <a-tag size="small" :color="form.targetDatasource === 'doris' ? 'arcoblue' : 'orange'">
                {{ store.datasourceLabel(form.targetDatasource) }}
              </a-tag>
              <span class="sync-section__hint" style="margin-left: 8px">
                由「方向」自动锁定
              </span>
            </a-form-item>
          </a-col>
        </a-row>
      </a-card>

      <!-- ═══ ② 库与表 ═══ -->
      <a-card title="② 库与表" :bordered="false">
        <a-row :gutter="16">
          <a-col :span="12">
            <div class="sync-section__sub">源端</div>
            <a-form-item label="源端连接" required>
              <a-cascader
                v-model="form.sourceConnection"
                :options="sourceDbOptions"
                placeholder="选择 集群/库"
                allow-clear
              />
            </a-form-item>
            <a-alert
              v-if="pickedSourceDb && pickedSourceDb.type !== 'personal'"
              type="warning"
              show-icon
              style="margin-bottom: 12px"
            >
              该库为团队库,本期仅支持个人账户下的库
            </a-alert>
            <a-form-item label="选择源表" required>
              <a-select
                v-model="form.sourceTableId"
                placeholder="先选源端连接,再选源表"
                :disabled="!pickedSourceDb"
                allow-clear
                show-search
                :filter-option="filterTable"
              >
                <a-option
                  v-for="t in availableSourceTables"
                  :key="t.id"
                  :value="t.id"
                  :disabled="t.isPartitioned || t.fieldCount > store.fieldLimit"
                  :label="t.tableName"
                >
                  <span>{{ t.tableName }}</span>
                  <a-tag v-if="t.isPartitioned" color="red" size="small" style="margin-left: 6px">分区</a-tag>
                  <a-tag v-if="t.hasReadPermission === false" color="orange" size="small" style="margin-left: 6px">无读权限</a-tag>
                  <span class="sync-section__cell-sub">{{ t.database }} · {{ t.fieldCount }} 字段 · {{ t.comment }}</span>
                </a-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <div class="sync-section__sub">目标端</div>
            <a-form-item label="目标端连接" required>
              <a-cascader
                v-model="form.targetConnection"
                :options="targetDbOptions"
                placeholder="选择 集群/库"
                allow-clear
              />
            </a-form-item>
            <a-form-item label="目标表操作" required>
              <a-radio-group v-model="form.targetMode" type="button" size="small">
                <a-radio value="same">同名表写入</a-radio>
                <a-radio value="new">新建目标表</a-radio>
              </a-radio-group>
              <div class="sync-section__hint">
                <template v-if="form.targetMode === 'same'">
                  对端已存在同名表,直接搬运过去;若已被其他任务占用会被阻断
                </template>
                <template v-else>
                  对端没有该表,系统会先建表再搬运;目标表名由你自定义
                </template>
              </div>
            </a-form-item>
            <a-form-item label="目标表名" required>
              <!-- 同名表写入:从对端的表中选 -->
              <a-select
                v-if="form.targetMode === 'same'"
                v-model="form.targetTable"
                placeholder="先选目标端连接,再选目标表"
                :disabled="!pickedTargetDb"
                allow-clear
                show-search
                :filter-option="filterTable"
              >
                <a-option
                  v-for="t in availableTargetTables"
                  :key="t.id"
                  :value="t.tableName"
                  :label="t.tableName"
                >
                  <span>{{ t.tableName }}</span>
                  <span class="sync-section__cell-sub">{{ t.database }} · {{ t.fieldCount }} 字段 · {{ t.comment }}</span>
                </a-option>
              </a-select>
              <!-- 新建目标表:用户自定义表名 -->
              <a-input
                v-else
                v-model="form.targetTable"
                placeholder="请输入要新建的目标表名"
                :disabled="!pickedSourceTable"
                allow-clear
              />
              <div class="sync-section__hint" v-if="form.targetMode === 'same'">从对端已有的表中选择;同名表规则 R07</div>
              <div class="sync-section__hint" v-else>新建表将在首次执行时自动建表</div>
            </a-form-item>
          </a-col>
        </a-row>

        <!-- E6 / E7 / 回灌视觉标记,集中放在 ② 卡片底部 -->
        <a-alert
          v-if="pickedSourceTable && pickedSourceTable.hasReadPermission === false"
          type="error"
          show-icon
          style="margin-top: 8px"
        >
          无源表读权限,请联系数据管理员申请
        </a-alert>
        <a-alert
          v-if="pickedSourceTable && pickedSourceTable.isPartitioned"
          type="warning"
          show-icon
          style="margin-top: 8px"
        >
          仅支持非分区表同步
        </a-alert>
      </a-card>

      <!-- ═══ ② 库与表 ═══ -->
      <!-- (字段映射等已合并到上方) -->

      <!-- ═══ ③ 字段映射 ═══ -->
      <a-card title="③ 字段映射(左右对照)" :bordered="false">
        <a-alert v-if="!pickedSourceTable" type="info" show-icon>
          请先在「② 库与表」选定源表
        </a-alert>
        <template v-else>
          <div class="sync-section__hint" style="margin-bottom: 8px">
            支持同名自动匹配(目标字段名 = 源字段名);勾选/取消勾选决定是否搬运
          </div>
          <a-table
            :columns="fieldColumns"
            :data="form.fieldMappings"
            :pagination="false"
            row-key="source"
            size="small"
          >
            <template #enabled="{ record }">
              <a-switch v-model="record.enabled" size="small" />
            </template>
            <template #source="{ record }">
              <code class="sync-code">{{ record.source }}</code>
            </template>
            <template #target="{ record }">
              <a-input
                v-model="record.target"
                :disabled="!record.enabled"
                placeholder="可改名,留空表示丢弃"
                size="small"
              />
            </template>
          </a-table>
        </template>
      </a-card>

      <!-- ═══ ④ 同步策略 ═══ -->
      <a-card title="④ 同步策略" :bordered="false">
        <a-row :gutter="24">
          <a-col :span="8">
            <div class="sync-section__sub">数据范围</div>
            <a-radio-group v-model="form.strategy.mode" type="button" size="small">
              <a-radio value="full">全量</a-radio>
              <a-radio value="incremental">增量</a-radio>
            </a-radio-group>
          </a-col>
          <a-col :span="8">
            <div class="sync-section__sub">写入方式</div>
            <a-radio-group v-model="form.strategy.writeMode" type="button" size="small">
              <a-radio value="overwrite">覆盖</a-radio>
              <a-radio value="append">追加</a-radio>
            </a-radio-group>
          </a-col>
          <a-col :span="8">
            <div class="sync-section__sub">数据校验</div>
            <a-select v-model="form.strategy.dataCheck" size="small" style="width: 100%">
              <a-option value="none">不校验</a-option>
              <a-option value="count">行数校验</a-option>
              <a-option value="sample">抽样校验</a-option>
            </a-select>
          </a-col>
        </a-row>
      </a-card>

      <!-- ═══ ⑤ 触发方式 ═══ -->
      <a-card title="⑤ 触发方式" :bordered="false">
        <a-radio-group v-model="form.trigger" type="button">
          <a-radio value="manual">手动</a-radio>
          <a-radio value="schedule">定时</a-radio>
        </a-radio-group>
        <div class="sync-section__hint">
          R12:支持手动、定时;模型上预留依赖上游与外部调用,本期表单不开放
        </div>
        <div v-if="form.trigger === 'schedule'" style="margin-top: 12px">
          <a-row :gutter="12" align="center">
            <a-col :span="6">
              <a-form-item label="调度频率" required>
                <a-select v-model="form.schedule" placeholder="选择调度频率" @change="onScheduleChange">
                  <a-option v-for="p in schedulePresets" :key="p" :value="p" :label="p" />
                </a-select>
              </a-form-item>
            </a-col>
            <a-col :span="6">
              <a-form-item label="Cron 表达式">
                <a-input v-model="form.cronExpression" placeholder="由调度频率自动生成" />
              </a-form-item>
            </a-col>
          </a-row>
        </div>
      </a-card>

      <!-- ═══ ⑥ 保存 ═══ -->
      <a-card title="⑥ 任务信息" :bordered="false">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="任务名称" required>
              <a-input v-model="form.name" placeholder="如:同步·risk_sample_policy_a" max-length="60" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="备注">
              <a-input v-model="form.note" placeholder="选填,如:本批用于风险策略 v3 模型" max-length="80" />
            </a-form-item>
          </a-col>
        </a-row>
        <div class="sync-create__summary">
          <div class="sync-section__sub">保存摘要</div>
          <a-descriptions :column="2" bordered size="small">
            <a-descriptions-item label="源端">{{ form.sourceDatasource }} / {{ connectionText(form.sourceConnection) }}</a-descriptions-item>
            <a-descriptions-item label="目标端">{{ form.targetDatasource }} / {{ connectionText(form.targetConnection) }}</a-descriptions-item>
            <a-descriptions-item label="方向">{{ form.direction }}</a-descriptions-item>
            <a-descriptions-item label="源表">{{ pickedSourceTable?.tableName || '—' }}</a-descriptions-item>
            <a-descriptions-item label="目标表">{{ form.targetDatabase }}.{{ form.targetTable }}</a-descriptions-item>
            <a-descriptions-item label="字段映射">{{ enabledFieldCount }} / {{ form.fieldMappings.length }} 字段启用</a-descriptions-item>
            <a-descriptions-item label="同步策略">{{ strategyText }}</a-descriptions-item>
            <a-descriptions-item label="触发方式">{{ form.trigger === 'schedule' ? `定时 (${form.schedule || '—'})` : '手动' }}</a-descriptions-item>
          </a-descriptions>
        </div>
      </a-card>
    </a-form>
  </PageContainer>
</template>

<script setup lang="ts">
/**
 * 数据任务服务 · 同步任务配置页(P0 重构)
 *
 * 实现需求文档 B2 六步:
 *   ① 数据源(源端类型/连接、目标端类型/连接、方向)
 *   ② 表选择(源表 + 目标表)
 *   ③ 字段映射(左右对照、勾选、支持同名自动匹配)
 *   ④ 同步策略(全量/增量、覆盖/追加、校验开关)
 *   ⑤ 触发方式(手动 / 定时;模型预留 dependency / external)
 *   ⑥ 保存:存草稿 / 保存并启用
 *
 * 业务规则:
 *   R10 源端/目标端双向 + 方向
 *   R11 权限校验(读源表 / 写目标)
 *   R12 触发方式
 *   E6  无源表读权限 → 阻断
 *   E7  目标表已存在且非本任务创建 → 阻断
 */
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import PageContainer from '@/components-dca/common/PageContainer.vue'
import PageHeader from '@/components-dca/common/PageHeader.vue'
import { useSyncTaskStore, validateSubmission } from '@/stores-dca/management/sync-task'
import { SYNC_FIELD_LIMIT } from '@/mock/service/sync-tasks'
import { SCHEDULE_PRESETS } from '@/mock/unified-query/tasks'
import type {
  AllowDb,
  DataSource,
  DataSourceConnection,
  FieldMappingItem,
  SyncDirection,
  SyncTable,
  SyncTrigger
} from '@/mock/service/sync-tasks-types'

const router = useRouter()
const store = useSyncTaskStore()

const schedulePresets = SCHEDULE_PRESETS

const goBack = () => router.push({ name: 'service' })

/* ─────── ① 数据源 ─────── */

/** 方向 → 源端类型/目标端类型 */
const SOURCE_BY_DIRECTION: Record<SyncDirection, { source: DataSource; target: DataSource }> = {
  'doris-to-hive': { source: 'doris', target: 'hive' },
  'hive-to-doris': { source: 'hive', target: 'doris' }
}
const TARGET_BY_DIRECTION = SOURCE_BY_DIRECTION

const form = reactive({
  /** ① 数据源 */
  direction: 'doris-to-hive' as SyncDirection,
  sourceDatasource: 'doris' as DataSource,
  targetDatasource: 'hive' as DataSource,
  /** 源端连接(cascader 非 multiple 模式:值为 `cluster/database` 字符串,空为 '') */
  sourceConnection: '' as string,
  /** 目标端连接(同上) */
  targetConnection: '' as string,
  /** ② 表选择 */
  sourceTableId: '' as string,
  /**
   * 目标表操作模式:
   *   - same:同名表写入(对端已有同名表,直接搬运过去)
   *   - new: 新建目标表(对端没有该表,系统建表后再搬运)
   */
  targetMode: 'same' as 'same' | 'new',
  targetDatabase: '',
  targetTable: '',
  /** ③ 字段映射 */
  fieldMappings: [] as FieldMappingItem[],
  /** ④ 同步策略 */
  strategy: {
    mode: 'full' as 'full' | 'incremental',
    writeMode: 'overwrite' as 'overwrite' | 'append',
    dataCheck: 'count' as 'none' | 'count' | 'sample'
  },
  /** ⑤ 触发方式 */
  trigger: 'manual' as SyncTrigger,
  schedule: '每天 02:00',
  cronExpression: '0 0 2 * * ?',
  /** ⑥ 任务信息 */
  name: '',
  note: ''
})

const submitting = ref(false)

/* ─────── cascader options ─────── */

/** 源端可用的库(白名单 + 个人账户过滤) */
const sourceDbOptions = computed(() => {
  const ds = form.sourceDatasource
  const dbs = store.allowedDatabases.filter(d => d.datasource === ds)
  return clusterDbTree(dbs)
})

/** 目标端可用的库 */
const targetDbOptions = computed(() => {
  const ds = form.targetDatasource
  const dbs = store.allowedDatabases.filter(d => d.datasource === ds)
  return clusterDbTree(dbs)
})

/**
 * 构造 cascader options:集群 → 库 两级
 * children.value 用 `cluster/database` 拼接,cascader 非 multiple 模式下 v-model 即为该字符串
 */
function clusterDbTree(dbs: AllowDb[]): { value: string; label: string; children: { value: string; label: string }[] }[] {
  const byCluster: Record<string, AllowDb[]> = {}
  for (const d of dbs) {
    ;(byCluster[d.cluster] ??= []).push(d)
  }
  return Object.entries(byCluster).map(([cluster, items]) => ({
    value: cluster,
    label: cluster,
    children: items.map(d => ({
      value: `${cluster}/${d.database}`,
      label: `${d.database}${d.type === 'personal' ? '(个人)' : '(团队)'}`
    }))
  }))
}

/** 把 cascader 的字符串值(`cluster/database`)拆成 { cluster, database } */
function parseConnection(val: unknown): { cluster: string; database: string } | null {
  if (typeof val !== 'string' || !val.includes('/')) return null
  const idx = val.indexOf('/')
  const cluster = val.slice(0, idx)
  const database = val.slice(idx + 1)
  if (!cluster || !database) return null
  return { cluster, database }
}

/** 把 cascader 的字符串值格式化成可读文本 */
function connectionText(val: unknown): string {
  const p = parseConnection(val)
  return p ? `${p.cluster} / ${p.database}` : '—'
}

/** 选中的源库(cascader 值为 `cluster/database` 字符串) */
const pickedSourceDb = computed<AllowDb | null>(() => {
  const p = parseConnection(form.sourceConnection)
  if (!p) return null
  return store.allowedDatabases.find(
    d => d.datasource === form.sourceDatasource && d.cluster === p.cluster && d.database === p.database
  ) ?? null
})

/** 选中的目标库(cascader 值为 `cluster/database` 字符串) */
const pickedTargetDb = computed(() => {
  const p = parseConnection(form.targetConnection)
  if (!p) return null
  return store.allowedDatabases.find(
    d => d.datasource === form.targetDatasource && d.cluster === p.cluster && d.database === p.database
  ) ?? null
})

/* ─────── ② 表选择 ─────── */

/** 当前源端库下的表(非分区) */
const availableSourceTables = computed(() => {
  if (!pickedSourceDb.value) return []
  return store.allTables.filter(
    t =>
      t.datasource === pickedSourceDb.value!.datasource &&
      t.cluster === pickedSourceDb.value!.cluster &&
      t.database === pickedSourceDb.value!.database
  )
})

const pickedSourceTable = computed<SyncTable | null>(
  () => store.allTables.find(t => t.id === form.sourceTableId) ?? null
)

/**
 * 目标端可选的表(对端在所选库下已有的表)
 * 同名表写入模式下:用户必须从这里选一个已有的对端表
 */
const availableTargetTables = computed(() => {
  if (!pickedTargetDb.value) return []
  return store.allTables.filter(
    t =>
      t.datasource === pickedTargetDb.value!.datasource &&
      t.cluster === pickedTargetDb.value!.cluster &&
      t.database === pickedTargetDb.value!.database
  )
})

/** cascader filter */
function filterTable(input: string, option: any) {
  const s = input.toLowerCase()
  return (option.label ?? '').toLowerCase().includes(s) || (option.value ?? '').toLowerCase().includes(s)
}

/* ─────── ③ 字段映射 ─────── */

const fieldColumns = [
  { title: '启用', dataIndex: 'enabled', slotName: 'enabled', width: 70 },
  { title: '源字段', dataIndex: 'source', slotName: 'source', width: 200 },
  { title: '目标字段', dataIndex: 'target', slotName: 'target' }
]

/** 源表变更时,自动用同名规则重置字段映射 */
watch(pickedSourceTable, t => {
  form.fieldMappings = t
    ? t.fields.map(f => ({ source: f.name, target: f.name, enabled: true }))
    : []
  if (t && !form.targetTable) form.targetTable = t.tableName
}, { immediate: true })

const enabledFieldCount = computed(() => form.fieldMappings.filter(f => f.enabled).length)

/* ─────── ⑤ 触发方式 ─────── */

function cronFromSchedule(schedule: string): string {
  const map: Record<string, string> = {
    '每小时': '0 0 * * * ?',
    '每天 02:00': '0 0 2 * * ?',
    '每天 06:00': '0 0 6 * * ?',
    '每周一 07:00': '0 0 7 ? * MON',
    '每月 1 日 08:00': '0 0 8 1 * ?'
  }
  return map[schedule] ?? '0 0 2 * * ?'
}

function onScheduleChange(val: string) {
  form.cronExpression = cronFromSchedule(val)
}

/* ─────── 方向联动 ─────── */

watch(() => form.direction, d => {
  const s = SOURCE_BY_DIRECTION[d]
  form.sourceDatasource = s.source
  form.targetDatasource = s.target
  form.sourceConnection = ''
  form.targetConnection = ''
  form.sourceTableId = ''
})

/** 源端库变更时清空源表 */
watch(pickedSourceDb, () => {
  form.sourceTableId = ''
})

/**
 * 源表变更时:
 * - 同名表写入模式:不动 targetTable(由用户从对端表里主动选)
 * - 新建目标表模式:预填同名(用户可改)
 */
watch(pickedSourceTable, t => {
  if (!t) return
  if (form.targetMode === 'new' && !form.targetTable) {
    form.targetTable = t.tableName
  }
}, { immediate: true })

/** 模式切换:清空 targetTable 重新选 */
watch(() => form.targetMode, () => {
  form.targetTable = ''
})

/** 目标端连接或库变更:清空 targetTable 让用户重新选 */
watch(pickedTargetDb, () => {
  form.targetTable = ''
})

/** 目标库变更时默认填 targetDatabase */
watch(pickedTargetDb, db => {
  if (db && !form.targetDatabase) form.targetDatabase = db.database
})

/* ─────── 校验 ─────── */

/**
 * 校验:任务语义是「单次执行」,不做 E7 目标表重复占用阻断
 * (E7 是 P1 预留:当任务支持定时多次执行后再开启)
 */
const errors = computed(() => {
  return validateSubmission(
    pickedSourceDb.value,
    pickedSourceTable.value,
    { requirePersonal: true, fieldLimit: SYNC_FIELD_LIMIT },
    null,
    store.tasks
  ).errors
})

const strategyText = computed(() => {
  const mode = form.strategy.mode === 'full' ? '全量' : '增量'
  const write = form.strategy.writeMode === 'overwrite' ? '覆盖' : '追加'
  const checkMap = { none: '不校验', count: '行数校验', sample: '抽样校验' }
  return `${mode} · ${write} · ${checkMap[form.strategy.dataCheck]}`
})

/* ─────── 保存 ─────── */

function buildInput(enableNow: boolean) {
  if (!pickedSourceDb.value || !pickedSourceTable.value || !pickedTargetDb.value) return null
  return {
    name: form.name || `同步·${pickedSourceTable.value.tableName}`,
    source: {
      datasource: form.sourceDatasource,
      cluster: pickedSourceDb.value.cluster,
      database: pickedSourceDb.value.database
    } as DataSourceConnection,
    target: {
      datasource: form.targetDatasource,
      cluster: pickedTargetDb.value.cluster,
      database: pickedTargetDb.value.database
    } as DataSourceConnection,
    sourceTableId: form.sourceTableId,
    targetTable: form.targetTable,
    targetDatabase: form.targetDatabase,
    direction: form.direction,
    fieldMappings: form.fieldMappings,
    strategy: { ...form.strategy },
    trigger: form.trigger,
    schedule: form.trigger === 'schedule' ? form.schedule : undefined,
    cronExpression: form.trigger === 'schedule' ? form.cronExpression : undefined,
    note: form.note,
    draft: !enableNow,
    creator: '王运营'
  }
}

function onSaveDraft() {
  save(false)
}
function onSaveAndEnable() {
  save(true)
}

function save(enableNow: boolean) {
  if (errors.value.length) {
    Message.error('保存校验未通过,请先处理红色提示')
    return
  }
  const input = buildInput(enableNow)
  if (!input) {
    Message.warning('请先完成所有必填项')
    return
  }
  submitting.value = true
  try {
    const task = store.createTask(input)
    if (enableNow) {
      store.submitRun(task.id, { trigger: task.trigger, note: input.note })
      Message.success(`任务「${task.name}」已创建并启用,首次执行已触发`)
    } else {
      Message.success(`任务「${task.name}」已存为草稿`)
    }
    submitting.value = false
    router.push({ name: 'service-sync-records' })
  } catch (e) {
    submitting.value = false
    Message.error('保存失败:' + (e as Error).message)
  }
}
</script>

<style lang="scss" scoped>
.sync-create {
  padding-bottom: 24px;
  &__alert {
    margin: 0 24px 16px;
  }
  &__err-list {
    margin: 0;
    padding-left: 18px;
    li {
      margin: 4px 0;
    }
  }
  &__form {
    margin: 0 24px;
  }
  &__summary {
    margin-top: 12px;
  }
}

.sync-section {
  &__sub {
    font-size: 13px;
    font-weight: 600;
    color: var(--color-text-2);
    margin-bottom: 8px;
  }
  &__hint {
    font-size: 12px;
    color: var(--color-text-3);
    margin-top: 4px;
  }
  &__cell-sub {
    margin-left: 8px;
    font-size: 12px;
    color: var(--color-text-3);
  }
}

.sync-code {
  font-family: 'Menlo', monospace;
  background: var(--color-fill-2);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  color: #165dff;
}

/* 卡片之间的间距 */
:deep(.arco-card) + :deep(.arco-card) {
  margin-top: 12px;
}
</style>
