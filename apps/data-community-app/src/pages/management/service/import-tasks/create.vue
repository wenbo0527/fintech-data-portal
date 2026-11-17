<template>
  <PageContainer size="wide" class="imp-create">
    <PageHeader
      title="新建数据导入任务"
      sub-title="任意分隔符文件 → Hive / Doris · 五步配置:目标数据源 → 源文件解析 → 写入目标表 → 字段映射 → 保存执行"
    >
      <template #extra>
        <a-space>
          <a-button @click="goBack">取消</a-button>
          <a-button @click="onSaveDraft">存草稿</a-button>
          <a-button type="primary" :loading="submitting" @click="onSaveAndRun">保存并导入</a-button>
        </a-space>
      </template>
    </PageHeader>

    <a-alert
      v-if="errors.length"
      type="error"
      show-icon
      class="imp-create__alert"
      :title="`保存校验未通过(共 ${errors.length} 项)`"
    >
      <ul class="imp-create__err-list">
        <li v-for="(e, i) in errors" :key="i">
          <a-tag size="small" color="red">{{ e.field }}</a-tag>
          {{ e.message }}
        </li>
      </ul>
    </a-alert>

    <a-form :model="form" layout="vertical" class="imp-create__form">
      <!-- ═══ ① 目标数据源 ═══ -->
      <a-card title="① 目标数据源" :bordered="false">
        <a-form-item label="导入到" required>
          <a-radio-group v-model="form.targetDatasource" type="button" size="large">
            <a-radio value="hive">Hive</a-radio>
            <a-radio value="doris">Doris</a-radio>
          </a-radio-group>
          <div class="imp-hint">文件将被写入所选数据源的目标库表;数据源仅支持 Hive 与 Doris。</div>
        </a-form-item>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="目标集群 / 库" required>
              <a-cascader
                v-model="form.connection"
                :options="targetDbOptions"
                placeholder="选择 集群/库"
                allow-clear
              />
            </a-form-item>
          </a-col>
        </a-row>
      </a-card>

      <!-- ═══ ② 源文件与解析 ═══ -->
      <a-card title="② 源文件(任意分隔符)" :bordered="false">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="分隔符" required>
              <a-space>
                <a-select v-model="form.delimiterPreset" style="width: 160px" @change="onDelimiterPresetChange">
                  <a-option v-for="d in DELIMITER_PRESETS" :key="d.label" :value="d.value">{{ d.label }}</a-option>
                </a-select>
                <a-input
                  v-if="isCustomDelimiter"
                  v-model="form.customDelim"
                  placeholder="输入分隔符字符"
                  :maxlength="4"
                  style="width: 140px"
                />
              </a-space>
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="文件编码">
              <a-select v-model="form.encoding" style="width: 140px">
                <a-option v-for="e in ENCODING_OPTIONS" :key="e.value" :value="e.value">{{ e.label }}</a-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="首行为表头">
              <a-switch v-model="form.hasHeader" />
              <span class="imp-hint" style="margin-left: 8px">
                {{ form.hasHeader ? '用首行作为列名' : '列名自动编号 col_N' }}
              </span>
            </a-form-item>
          </a-col>
        </a-row>

        <a-upload
          draggable
          :show-file-list="false"
          :custom-request="handleUpload"
          accept=".csv,.tsv,.txt,.tab,text/plain"
          class="imp-drop"
        >
          <template #upload-button>
            <div class="imp-drop__inner">
              <icon-upload style="font-size: 30px; color: rgb(var(--primary-6))" />
              <p class="imp-drop__text">拖拽文件到此处或<span class="imp-drop__hl"> 点击上传</span></p>
              <p class="imp-hint">支持 CSV / TSV / TXT 等分隔符文本,单文件;解析在浏览器本地完成,不上传服务器</p>
            </div>
          </template>
        </a-upload>

        <!-- 解析结果预览 -->
        <div v-if="parsed" class="imp-preview">
          <a-descriptions :column="4" bordered size="small">
            <a-descriptions-item label="文件名">
              <code>{{ fileName }}</code>
            </a-descriptions-item>
            <a-descriptions-item label="大小">{{ formatFileSize(fileSize) }}</a-descriptions-item>
            <a-descriptions-item label="识别列数">{{ preview.columns.length }}</a-descriptions-item>
            <a-descriptions-item label="数据行数">{{ preview.totalRows.toLocaleString() }}</a-descriptions-item>
          </a-descriptions>
          <div class="imp-preview__title">数据预览(前 {{ preview.sampleRows.length }} 行)</div>
          <a-table
            :columns="previewColumns"
            :data="previewData"
            :pagination="false"
            size="mini"
            :scroll="{ x: '100%' }"
            class="imp-preview__table"
          />
        </div>
        <a-alert v-else type="info" show-icon style="margin-top: 12px">
          请先上传文件,系统将按所选分隔符与编码解析出列结构与样例数据。
        </a-alert>
      </a-card>

      <!-- ═══ ③ 写入目标表 ═══ -->
      <a-card title="③ 写入目标表" :bordered="false">
        <a-form-item label="目标表操作" required>
          <a-radio-group v-model="form.tableMode" type="button" size="small">
            <a-radio value="new">新建表</a-radio>
            <a-radio value="existing">写入已有表</a-radio>
          </a-radio-group>
          <div class="imp-hint">
            <template v-if="form.tableMode === 'new'">
              目标库下没有该表,首次执行时按解析出的列结构自动建表;列名 / 类型可在下方调整
            </template>
            <template v-else>
              写入目标库下已存在的表,需把文件列映射到表列
            </template>
          </div>
        </a-form-item>

        <a-row :gutter="16">
          <a-col :span="12">
            <!-- 新建表:自定义表名 -->
            <a-form-item v-if="form.tableMode === 'new'" label="新表名" required>
              <a-input v-model="form.targetTable" placeholder="如:ods_customer_loan_import" allow-clear />
              <div class="imp-hint">仅允许字母/数字/下划线,以字母或下划线开头</div>
            </a-form-item>
            <!-- 已有表:从目标库下选表 -->
            <a-form-item v-else label="选择已有表" required>
              <a-select
                v-model="form.targetTableId"
                placeholder="先选目标库,再选表"
                :disabled="!pickedDb"
                allow-clear
                show-search
                :filter-option="filterOption"
              >
                <a-option v-for="t in availableTargetTables" :key="t.id" :value="t.id" :label="t.tableName">
                  <span>{{ t.tableName }}</span>
                  <span class="imp-cell-sub">{{ t.fieldCount }} 列 · {{ t.comment }}</span>
                </a-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
      </a-card>

      <!-- ═══ ④ 字段映射 / 列结构 ═══ -->
      <a-card
        :title="form.tableMode === 'new' ? '④ 新表列结构(解析自文件,可修改)' : '④ 字段映射(文件列 → 表列)'"
        :bordered="false"
      >
        <a-alert v-if="!parsed" type="info" show-icon>请先在「② 源文件」上传并解析文件</a-alert>
        <template v-else>
          <div v-if="form.tableMode === 'existing'" class="imp-hint" style="margin-bottom: 8px">
            默认按同名列自动匹配;未匹配到的目标列需手动选择,留空表示该文件列不导入
          </div>
          <a-table :columns="mapColumns" :data="form.columns" :pagination="false" row-key="index" size="small">
            <template #enabled="{ record }">
              <a-switch v-model="record.enabled" size="small" />
            </template>
            <template #fileCol="{ record }">
              <code class="imp-code">{{ record.name }}</code>
            </template>
            <template #sample="{ record }">
              <span class="imp-sample">{{ record.sample || '—' }}</span>
            </template>
            <!-- 新建表:列名 + 类型可编辑 -->
            <template #newName="{ record }">
              <a-input v-model="record.targetColumn" :disabled="!record.enabled" size="small" placeholder="列名" />
            </template>
            <template #newType="{ record }">
              <a-select v-model="record.type" :disabled="!record.enabled" size="small" style="width: 130px">
                <a-option v-for="t in COLUMN_TYPES" :key="t" :value="t">{{ t }}</a-option>
              </a-select>
            </template>
            <!-- 已有表:映射到目标表列 -->
            <template #targetCol="{ record }">
              <a-select
                v-model="record.targetColumn"
                :disabled="!record.enabled"
                size="small"
                placeholder="选择目标列"
                allow-clear
                style="width: 180px"
              >
                <a-option v-for="c in targetTableColumns" :key="c.name" :value="c.name">
                  <span>{{ c.name }}</span>
                  <span class="imp-cell-sub">{{ c.type }}</span>
                </a-option>
              </a-select>
            </template>
          </a-table>
          <div v-if="form.tableMode === 'new'" class="imp-cte">
            <div class="imp-hint" style="margin-bottom: 4px">建表语句预览(首次执行时运行)</div>
            <pre class="imp-cte__code">{{ createTableSql }}</pre>
          </div>
        </template>
      </a-card>

      <!-- ═══ ⑤ 导入策略 + 任务信息 ═══ -->
      <a-card title="⑤ 导入策略与任务信息" :bordered="false">
        <a-row :gutter="24" style="margin-bottom: 12px">
          <a-col v-if="form.tableMode === 'existing'" :span="8">
            <div class="imp-sub">写入方式</div>
            <a-radio-group v-model="form.writeMode" type="button" size="small">
              <a-radio value="append">追加</a-radio>
              <a-radio value="overwrite">覆盖</a-radio>
            </a-radio-group>
          </a-col>
          <a-col v-else :span="8">
            <div class="imp-sub">写入方式</div>
            <a-tag color="green">新建表 · 首次全量写入</a-tag>
            <div class="imp-hint">目标表尚不存在,首次执行按列结构建表并全量写入,无追加 / 覆盖之分</div>
          </a-col>
          <a-col :span="8">
            <div class="imp-sub">错误行处理</div>
            <a-switch v-model="form.skipErrorRows" />
            <span class="imp-hint" style="margin-left: 8px">
              {{ form.skipErrorRows ? '跳过错误行继续' : '遇到错误行即失败' }}
            </span>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="任务名称" required>
              <a-input v-model="form.name" placeholder="留空自动生成:导入·<文件名>" :maxlength="60" allow-clear />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="备注">
              <a-input v-model="form.note" placeholder="选填,如:2026Q3 客户贷款增量导入" :maxlength="80" allow-clear />
            </a-form-item>
          </a-col>
        </a-row>

        <div class="imp-summary">
          <div class="imp-sub">保存摘要</div>
          <a-descriptions :column="2" bordered size="small">
            <a-descriptions-item label="目标数据源">{{ store.datasourceLabel(form.targetDatasource) }}</a-descriptions-item>
            <a-descriptions-item label="目标库表">{{ targetFullTable }}</a-descriptions-item>
            <a-descriptions-item label="目标表操作">{{ form.tableMode === 'new' ? '新建表' : '写入已有表' }}</a-descriptions-item>
            <a-descriptions-item label="分隔符">{{ delimiterLabel }}</a-descriptions-item>
            <a-descriptions-item label="源文件">{{ parsed ? `${fileName} · ${preview.columns.length} 列` : '—' }}</a-descriptions-item>
            <a-descriptions-item label="写入列">{{ enabledCount }} / {{ form.columns.length }} 列启用</a-descriptions-item>
            <a-descriptions-item v-if="form.tableMode === 'existing'" label="写入方式">{{ form.writeMode === 'append' ? '追加' : '覆盖' }}</a-descriptions-item>
            <a-descriptions-item v-else label="写入说明">新建表 · 首次全量写入</a-descriptions-item>
            <a-descriptions-item label="执行方式">保存后立即执行一次</a-descriptions-item>
          </a-descriptions>
        </div>
      </a-card>
    </a-form>
  </PageContainer>
</template>

<script setup lang="ts">
/**
 * 数据任务服务 · 数据导入任务配置页
 *
 * 需求(见 mock/service/import-tasks-types.ts 顶部注释):
 *   ① 目标数据源:Hive / Doris + 集群/库
 *   ② 源文件:任意分隔符 + 编码 + 表头开关,浏览器本地解析并预览
 *   ③ 写入目标表:新建表(自定义表名)或写入已有表(选表)
 *   ④ 字段映射:新建表→列名/类型可改;已有表→文件列映射到表列
 *   ⑤ 导入策略(追加/覆盖、错误行处理)+ 任务信息 + 保存摘要
 *
 * 执行方式:单次,保存即执行一次(store.submit 内部 createTask + submitRun)
 */
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import PageContainer from '@/components-dca/common/PageContainer.vue'
import PageHeader from '@/components-dca/common/PageHeader.vue'
import { useImportTaskStore } from '@/stores-dca/management/import-task'
import {
  CUSTOM_DELIMITER,
  DELIMITER_PRESETS,
  ENCODING_OPTIONS,
  delimiterLabelOf,
  formatFileSize,
  parseDelimitedText,
  tableColumnsOf,
  targetTablesOf
} from '@/mock/service/import-tasks'
import type { DataSource } from '@/mock/service/sync-tasks-types'
import type {
  ImportColumn,
  ImportEncoding,
  ImportPreview,
  ImportTableMode,
  ImportWriteMode
} from '@/mock/service/import-tasks-types'

const router = useRouter()
const store = useImportTaskStore()

const COLUMN_TYPES = ['string', 'int', 'bigint', 'double', 'decimal(18,2)', 'date', 'datetime', 'boolean']

const goBack = () => router.push({ name: 'unified-query-tasks' })

/* ─────── 表单 ─────── */

const form = reactive({
  targetDatasource: 'hive' as DataSource,
  /** 集群/库 cascader 字符串值 `cluster/database` */
  connection: '',
  tableMode: 'new' as ImportTableMode,
  targetTable: '',
  /** 已有表模式选中的表 id */
  targetTableId: '',
  /** 分隔符预设 value('' 表示自定义) */
  delimiterPreset: ',',
  customDelim: '',
  encoding: 'utf-8' as ImportEncoding,
  hasHeader: true,
  columns: [] as ImportColumn[],
  writeMode: 'append' as ImportWriteMode,
  skipErrorRows: true,
  name: '',
  note: ''
})

const submitting = ref(false)

/* ─────── 文件解析 ─────── */

const selectedFile = ref<File | null>(null)
const fileName = ref('')
const fileSize = ref(0)
const rawText = ref('')
const parsed = ref(false)
const preview = ref<ImportPreview>({ columns: [], sampleRows: [], totalRows: 0, headerApplied: false })

/** 自定义分隔符:选到 custom 预设(哨兵值) */
const isCustomDelimiter = computed(() => form.delimiterPreset === CUSTOM_DELIMITER)

/** 实际用于解析的分隔符字符 */
const delimiterChar = computed(() => (isCustomDelimiter.value ? form.customDelim : form.delimiterPreset))

/** 分隔符展示名 */
const delimiterLabel = computed(() => delimiterLabelOf(delimiterChar.value))

/** TextDecoder 标签映射 */
function decoderLabel(enc: ImportEncoding): string {
  const map: Record<ImportEncoding, string> = {
    'utf-8': 'utf-8',
    gbk: 'gbk',
    gb2312: 'gbk',
    latin1: 'windows-1252'
  }
  return map[enc] ?? 'utf-8'
}

/** 读取文件文本(按编码解码) */
async function decodeFile(file: File, enc: ImportEncoding): Promise<string> {
  const buf = await file.arrayBuffer()
  try {
    return new TextDecoder(decoderLabel(enc)).decode(buf)
  } catch {
    // 某些环境不支持指定编码 label,回退 UTF-8
    return new TextDecoder('utf-8').decode(buf)
  }
}

/** 重新解析 rawText → preview + form.columns */
function reparse() {
  if (!rawText.value) {
    parsed.value = false
    preview.value = { columns: [], sampleRows: [], totalRows: 0, headerApplied: false }
    form.columns = []
    return
  }
  const p = parseDelimitedText(rawText.value, delimiterChar.value, form.hasHeader)
  preview.value = p
  parsed.value = p.columns.length > 0
  form.columns = p.columns.map(c => ({ ...c }))
  syncColumns()
}

/** a-upload custom-request:拿到原生 File 后本地解析,不发请求 */
async function handleUpload(option: { fileItem: any }) {
  const file: File | undefined = option.fileItem?.file ?? option.fileItem?.originFile
  if (!file) return { abort() {} }
  selectedFile.value = file
  fileName.value = file.name
  fileSize.value = file.size
  rawText.value = await decodeFile(file, form.encoding)
  reparse()
  if (!parsed.value) Message.warning('未解析到有效数据行,请检查分隔符 / 编码')
  else Message.success(`解析完成:${preview.value.columns.length} 列 · ${preview.value.totalRows.toLocaleString()} 行`)
  if (!form.name && !form.targetTable) form.targetTable = suggestTableName(file.name)
  return { abort() {} }
}

/** 由文件名推导一个合法表名 */
function suggestTableName(name: string): string {
  const base = name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase()
  return `imp_${base || 'table'}`.slice(0, 48)
}

/* ─────── 目标库/表元数据 ─────── */

/** 目标库 cascader options(按当前数据源过滤) */
const targetDbOptions = computed(() => {
  const dbs = store.allowedDatabases.filter(d => d.datasource === form.targetDatasource)
  const byCluster: Record<string, typeof dbs> = {}
  for (const d of dbs) (byCluster[d.cluster] ??= []).push(d)
  return Object.entries(byCluster).map(([cluster, items]) => ({
    value: cluster,
    label: cluster,
    children: items.map(d => ({ value: `${cluster}/${d.database}`, label: d.database }))
  }))
})

/** 解析 cascader 值 */
function parseConnection(val: unknown): { cluster: string; database: string } | null {
  if (typeof val !== 'string' || !val.includes('/')) return null
  const idx = val.indexOf('/')
  const cluster = val.slice(0, idx)
  const database = val.slice(idx + 1)
  return cluster && database ? { cluster, database } : null
}

/** 选中的目标库 */
const pickedDb = computed(() => {
  const p = parseConnection(form.connection)
  if (!p) return null
  return store.allowedDatabases.find(
    d => d.datasource === form.targetDatasource && d.cluster === p.cluster && d.database === p.database
  ) ?? null
})

/** 当前目标库下已有表 */
const availableTargetTables = computed(() => {
  const p = parseConnection(form.connection)
  if (!p) return []
  return targetTablesOf(form.targetDatasource, p.cluster, p.database)
})

/** 选中已有表对象 */
const pickedTargetTable = computed(
  () => availableTargetTables.value.find(t => t.id === form.targetTableId) ?? null
)

/** 已有表列(映射下拉选项) */
const targetTableColumns = computed(() =>
  pickedTargetTable.value ? tableColumnsOf(pickedTargetTable.value.id) : []
)

/** 目标全名 `db.table` */
const targetFullTable = computed(() => {
  const p = parseConnection(form.connection)
  const db = p?.database ?? '—'
  const table = form.tableMode === 'new' ? form.targetTable || '(未命名)' : pickedTargetTable.value?.tableName || '(未选择)'
  return `${db}.${table}`
})

/* ─────── 列结构 / 映射同步 ─────── */

/** 依据模式与所选表,重置/匹配 columns 的 targetColumn */
function syncColumns() {
  for (const col of form.columns) {
    if (form.tableMode === 'new') {
      col.targetColumn = col.targetColumn || col.name
    } else {
      const opts = targetTableColumns.value
      const hit = opts.find(c => c.name.toLowerCase() === col.name.toLowerCase())
      col.targetColumn = hit ? hit.name : ''
    }
  }
}

const enabledCount = computed(() => form.columns.filter(c => c.enabled).length)

/* ─────── 建表语句预览 ─────── */

const createTableSql = computed(() => {
  if (form.tableMode !== 'new' || !enabledCount.value) return '—'
  const p = parseConnection(form.connection)
  const db = p?.database ?? 'target_db'
  const table = form.targetTable || 'new_table'
  const cols = form.columns
    .filter(c => c.enabled)
    .map(c => `  \`${c.targetColumn || c.name}\` ${c.type}`)
    .join(',\n')
  const engine = form.targetDatasource === 'doris'
    ? 'ENGINE=OLAP\nDUPLICATE KEY(1)'
    : 'STORED AS ORC'
  return `CREATE TABLE IF NOT EXISTS \`${db}\`.\`${table}\` (\n${cols}\n)\n${engine};`
})

/* ─────── 预览表格 ─────── */

const previewColumns = computed(() =>
  preview.value.columns.slice(0, 12).map(c => ({ title: c.name, dataIndex: c.name, ellipsis: true, tooltip: true }))
)

const previewData = computed(() =>
  preview.value.sampleRows.slice(0, 8).map(row => {
    const obj: Record<string, string> = {}
    preview.value.columns.slice(0, 12).forEach((c, i) => {
      obj[c.name] = row[c.index] ?? ''
    })
    return obj
  })
)

/* ─────── 映射表格列定义 ─────── */

const mapColumns = computed(() => {
  const base: Record<string, unknown>[] = [
    { title: '导入', dataIndex: 'enabled', slotName: 'enabled', width: 70 },
    { title: '文件列', dataIndex: 'name', slotName: 'fileCol', width: 160 },
    { title: '样例值', dataIndex: 'sample', slotName: 'sample', width: 180 }
  ]
  if (form.tableMode === 'new') {
    base.push({ title: '列名', dataIndex: 'targetColumn', slotName: 'newName' })
    base.push({ title: '类型', dataIndex: 'type', slotName: 'newType', width: 150 })
  } else {
    base.push({ title: '文件类型', dataIndex: 'type', width: 120 })
    base.push({ title: '目标表列', dataIndex: 'targetColumn', slotName: 'targetCol' })
  }
  return base
})

function filterOption(input: string, option: any) {
  const s = input.toLowerCase()
  return (option.label ?? '').toLowerCase().includes(s)
}

/* ─────── 联动 ─────── */

function onDelimiterPresetChange() {
  // 切回预设分隔符时清空自定义输入(重新解析由 delimiterChar 监听触发)
  if (!isCustomDelimiter.value) form.customDelim = ''
}

// 分隔符 / 表头变化:重新解析(自定义分隔符输入即时生效)
watch([delimiterChar, () => form.hasHeader], () => {
  if (rawText.value) reparse()
})

// 编码变化:重新读取文件文本
watch(
  () => form.encoding,
  async () => {
    if (selectedFile.value) {
      rawText.value = await decodeFile(selectedFile.value, form.encoding)
      reparse()
    }
  }
)

// 数据源变化:清空库/表(库表按数据源不同)
watch(
  () => form.targetDatasource,
  () => {
    form.connection = ''
    form.targetTableId = ''
  }
)

// 目标库变化:清空已选表
watch(pickedDb, () => {
  form.targetTableId = ''
})

// 模式切换:重新映射
watch(
  () => form.tableMode,
  mode => {
    if (mode === 'new') {
      form.targetTableId = ''
      if (!form.targetTable) form.targetTable = suggestTableName(fileName.value || 'table')
    } else {
      form.targetTable = ''
    }
    syncColumns()
  }
)

// 选中的已有表变化:重新做名称匹配
watch(pickedTargetTable, () => syncColumns())

/* ─────── 校验 ─────── */

const errors = computed(() => {
  const list: { field: string; message: string }[] = []
  if (!pickedDb.value) list.push({ field: '目标库', message: '请选择目标集群 / 库' })
  if (!parsed.value) list.push({ field: '源文件', message: '请上传并成功解析至少 1 列的文件' })
  if (form.tableMode === 'new') {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(form.targetTable)) {
      list.push({ field: '新表名', message: '表名仅允许字母/数字/下划线,且以字母或下划线开头' })
    }
  } else {
    if (!pickedTargetTable.value) list.push({ field: '目标表', message: '请选择要写入的已有表' })
  }
  if (parsed.value && enabledCount.value === 0) {
    list.push({ field: '字段', message: '至少启用 1 列' })
  }
  if (form.tableMode === 'existing' && parsed.value) {
    const unmapped = form.columns.filter(c => c.enabled && !c.targetColumn)
    if (unmapped.length) {
      list.push({ field: '字段映射', message: `${unmapped.length} 个启用列尚未映射目标表列` })
    }
  }
  return list
})

/* ─────── 保存 ─────── */

function buildInput(draft: boolean) {
  const p = parseConnection(form.connection)
  if (!p || !parsed.value) return null
  const targetTable = form.tableMode === 'new' ? form.targetTable : pickedTargetTable.value?.tableName ?? ''
  const columns = form.columns
    .filter(c => c.enabled)
    .map(c => ({ ...c }))
  return {
    name: form.name || `导入·${fileName.value}`,
    targetDatasource: form.targetDatasource,
    targetCluster: p.cluster,
    targetDatabase: p.database,
    tableMode: form.tableMode,
    targetTable,
    fileName: fileName.value,
    fileSize: fileSize.value,
    delimiter: delimiterChar.value || ',',
    delimiterLabel: delimiterLabel.value,
    encoding: form.encoding,
    hasHeader: form.hasHeader,
    columns,
    writeMode: form.writeMode,
    skipErrorRows: form.skipErrorRows,
    note: form.note,
    draft,
    creator: '王运营'
  }
}

function onSaveDraft() {
  save(true)
}
function onSaveAndRun() {
  save(false)
}

function save(draft: boolean) {
  if (errors.value.length) {
    Message.error('保存校验未通过,请先处理红色提示')
    return
  }
  const input = buildInput(draft)
  if (!input) {
    Message.warning('请先完成所有必填项')
    return
  }
  submitting.value = true
  try {
    const rec = store.submit(input)
    Message.success(draft ? `任务「${rec.name}」已存为草稿` : `任务「${rec.name}」已创建,首次导入执行已触发`)
    submitting.value = false
    router.push({ name: 'unified-query-tasks' })
  } catch (e) {
    submitting.value = false
    Message.error('保存失败:' + (e as Error).message)
  }
}
</script>

<style lang="scss" scoped>
.imp-create {
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
}

.imp-hint {
  font-size: 12px;
  color: var(--color-text-3);
  margin-top: 4px;
}

.imp-sub {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-2);
  margin-bottom: 8px;
}

.imp-cell-sub {
  margin-left: 8px;
  font-size: 12px;
  color: var(--color-text-3);
}

.imp-drop {
  margin-top: 8px;
  display: block;
  width: 100%;
  border: 1px dashed var(--color-neutral-3);
  border-radius: 4px;
  background: var(--color-fill-1);
  transition: border-color 0.2s, background 0.2s;
  &:hover {
    border-color: rgb(var(--primary-6));
    background: rgb(var(--primary-1));
  }
  :deep(> span) {
    display: block;
  }
  &__inner {
    padding: 28px 12px;
    text-align: center;
  }
  &__text {
    font-size: 15px;
    margin: 8px 0 4px;
  }
  &__hl {
    color: rgb(var(--primary-6));
  }
}

.imp-preview {
  margin-top: 16px;
  &__title {
    font-size: 13px;
    font-weight: 600;
    color: var(--color-text-2);
    margin: 12px 0 6px;
  }
  &__table {
    margin-top: 4px;
  }
}

.imp-code {
  font-family: 'Menlo', monospace;
  background: var(--color-fill-2);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  color: #165dff;
}

.imp-sample {
  color: var(--color-text-2);
  font-size: 12px;
}

.imp-cte {
  margin-top: 12px;
  &__code {
    margin: 0;
    padding: 12px;
    background: var(--color-fill-1);
    border-radius: 4px;
    font-family: 'Menlo', monospace;
    font-size: 12px;
    line-height: 1.6;
    color: var(--color-text-1);
    white-space: pre-wrap;
    overflow-x: auto;
  }
}

.imp-summary {
  margin-top: 12px;
}

:deep(.arco-card) + :deep(.arco-card) {
  margin-top: 12px;
}
</style>
