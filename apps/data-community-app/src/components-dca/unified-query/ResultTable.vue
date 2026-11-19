<template>
  <div class="uq-result">
    <a-spin :loading="loading" class="uq-result__spin" tip="查询执行中…">
      <div v-if="status === 'running' && !rows.length" class="uq-result__placeholder">
        正在执行,请稍候…
      </div>
      <div v-else-if="status === 'error'" class="uq-result__placeholder is-error">
        <icon-close-circle-fill />
        <span>查询执行失败,请切换到「日志」查看原因</span>
      </div>
      <div v-else-if="status === 'aborted'" class="uq-result__placeholder is-warn">
        <icon-exclamation-circle-fill />
        <span>查询已终止,未返回结果集</span>
      </div>
      <div v-else-if="!rows.length" class="uq-result__placeholder">
        <icon-storage />
        <span>暂无数据</span>
      </div>
      <a-table
        v-else
        :columns="arcoColumns"
        :data="sortedRows"
        :pagination="pagination"
        :scroll="{ x: '100%', y: 300 }"
        size="small"
        borderless
        row-key="__idx"
        @sorter-change="onSorterChange"
      />
    </a-spin>

    <div class="uq-result__footer">
      <span>耗时: <b>{{ duration || '-' }}</b></span>
      <a-divider direction="vertical" />
      <span>返回行数: <b>{{ rowCount }}</b></span>
      <template v-if="sortState.key">
        <a-divider direction="vertical" />
        <span class="uq-result__sorted">
          已按「{{ sortTitle }}」{{ sortState.order === 'ascend' ? '升序' : '降序' }}
          <a-link size="mini" @click="clearSort">取消排序</a-link>
        </span>
      </template>
      <span class="uq-result__spacer" />
      <a-button v-if="rowCount > 0" size="mini" type="primary" @click="openExport">
        <template #icon><icon-export /></template>
        导出
      </a-button>
    </div>

    <!-- 导出弹窗:右下角两个按钮就是两种导出模式;行数超限时不展示「快速导出」 -->
    <a-modal
      v-model:visible="exportVisible"
      title="导出查询结果"
      :width="520"
      :mask-closable="false"
    >
      <a-alert v-if="quickEligible" type="success" show-icon class="uq-export__alert">
        <template #title>已匹配「快速导出」· {{ STATEMENT_KIND_LABEL[statementKind] }}</template>
        {{ quickReason }}。点右下角「快速导出」由浏览器直接生成 CSV,不创建任务、不写入「我的导出」;需要留存记录时点「常规导出」。
      </a-alert>
      <a-alert v-else type="warning" show-icon class="uq-export__alert">
        <template #title>本次仅支持「常规导出」</template>
        结果共 {{ rowCount }} 行,超过快速导出上限({{ QUICK_EXPORT_ROW_LIMIT }} 行),因此不展示「快速导出」,只能走后端导出任务。
      </a-alert>

      <a-form :model="exportForm" layout="vertical">
        <a-form-item label="分隔符" required>
          <div class="uq-export__delimiter">
            <a-select v-model="exportForm.delimiter" style="width: 200px">
              <a-option v-for="o in DELIMITER_OPTIONS" :key="o.value" :value="o.value" :label="o.label">
                {{ o.label }}
                <span class="uq-export__delimiter-preview">{{ o.preview }}</span>
              </a-option>
            </a-select>
            <a-input
              v-if="exportForm.delimiter === 'custom'"
              v-model="exportForm.delimiterCustom"
              size="small"
              placeholder="输入 1-3 个字符"
              :max-length="MAX_CUSTOM_DELIMITER_LEN"
              allow-clear
              style="width: 160px;"
            />
            <a-tag size="small" color="gray">→ .{{ exportExt }}</a-tag>
          </div>
          <div class="uq-export__hint">
            当前分隔：<code>{{ prettyDelimiter(effectiveDelimiter) }}</code>；值内含分隔串、双引号或换行会自动转义。
          </div>
        </a-form-item>
        <a-form-item label="文件名称" required>
          <a-input v-model="exportForm.fileName" placeholder="请输入文件名称" allow-clear>
            <template #suffix>.{{ exportExt }}</template>
          </a-input>
        </a-form-item>
      </a-form>

      <!-- 导出列:放在最下面,面板可折叠 + 列名可搜索 -->
      <a-collapse
        v-model:active-key="colsPanel"
        :bordered="false"
        expand-icon-position="right"
        class="uq-export__collapse"
      >
        <a-collapse-item
          key="cols"
          :header="`导出列(已选 ${exportColumns.length} / ${columns.length})`"
        >
          <template #extra>
            <a-space size="mini" @click.stop>
              <a-link size="mini" @click="selectAllColumns">全选当前</a-link>
              <a-link size="mini" @click="exportForm.columns = []">清空</a-link>
            </a-space>
          </template>
          <a-input-search
            v-model="colKeyword"
            size="small"
            placeholder="搜索列名(支持中文名与字段名)"
            allow-clear
            class="uq-export__cols-search"
          />
          <a-checkbox-group v-if="filteredColumns.length" v-model="exportForm.columns" class="uq-export__cols">
            <a-checkbox v-for="c in filteredColumns" :key="c.dataIndex" :value="c.dataIndex">
              {{ c.title }}
            </a-checkbox>
          </a-checkbox-group>
          <div v-else class="uq-export__cols-empty">无匹配列</div>
          <div class="uq-export__hint">
            默认导出全部列,可按需只勾选部分列;两种导出模式都按勾选列生成文件。
          </div>
        </a-collapse-item>
      </a-collapse>

      <!-- 右下角:模式即动作,点哪个就走哪条链路 -->
      <template #footer>
        <a-space>
          <a-button @click="exportVisible = false">取消</a-button>
          <a-button
            v-if="quickEligible"
            type="primary"
            status="success"
            @click="submitExport('quick')"
          >
            <template #icon><icon-download /></template>
            快速导出
          </a-button>
          <a-button type="primary" @click="submitExport('backend')">
            <template #icon><icon-save /></template>
            常规导出
          </a-button>
        </a-space>
      </template>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
/**
 * 查询结果表格(F08)
 *
 * 数值列右对齐并按数值排序,文本列按字典序排序;
 * 排序状态由组件内部管理,Arco 只负责表头交互回调。
 */
import { computed, h, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import type { TableColumnData } from '@arco-design/web-vue'
import type { DataSourceKey, ExecStatus, ExportMode, QueryResult, ResultColumn, StatementKind } from '@/mock/unified-query/types'
import { DATASOURCE_LABEL } from '@/mock/unified-query/database'
import {
  detectStatementKind,
  isQuickExportEligible,
  quickExportReason,
  QUICK_EXPORT_ROW_LIMIT,
  STATEMENT_KIND_LABEL
} from '@/mock/unified-query/statement'
import {
  buildDelimitedText,
  DELIMITER_OPTIONS,
  extOfDelimiter,
  MAX_CUSTOM_DELIMITER_LEN,
  prettyDelimiter,
  resolveDelimiter,
  validateCustomDelimiter
} from '@/mock/unified-query/delimiter'
import { useUqExportStore } from '@/stores-dca/unified-query/export'

const props = withDefaults(
  defineProps<{
    result: QueryResult | null;
    loading?: boolean;
    status: ExecStatus;
    datasource?: DataSourceKey;
    /** 实际执行的 SQL,用于判定 DDL / 结构查询的导出模式 */
    sql?: string;
  }>(),
  { loading: false, datasource: 'doris', sql: '' }
)

const router = useRouter()
const exportStore = useUqExportStore()

const columns = computed<ResultColumn[]>(() => props.result?.columns ?? [])
const rows = computed<Record<string, string | number>[]>(() =>
  (props.result?.rows ?? []).map((r, i) => ({ ...r, __idx: i }))
)
const duration = computed(() => props.result?.duration ?? '')
const rowCount = computed(() => props.result?.rowCount ?? 0)

/* ── 导出模式判定:DDL / 结构查询,或行数低于阈值 ── */
const statementKind = computed<StatementKind>(() => detectStatementKind(props.sql))
const quickEligible = computed(() => isQuickExportEligible(statementKind.value, rowCount.value))
const quickReason = computed(() => quickExportReason(statementKind.value, rowCount.value))

const sortState = ref<{ key: string; order: 'ascend' | 'descend' | '' }>({ key: '', order: '' })

const pagination = computed(() =>
  rows.value.length > 10 ? { pageSize: 10, size: 'mini' as const, showTotal: true } : false
)

const arcoColumns = computed<TableColumnData[]>(() =>
  columns.value.map(c => ({
    title: c.title,
    dataIndex: c.dataIndex,
    width: c.width,
    sortable: { sortDirections: ['ascend', 'descend'] },
    align: c.numeric ? ('right' as const) : ('left' as const),
    ellipsis: true,
    tooltip: true
  }))
)

const sortTitle = computed(
  () => columns.value.find(c => c.dataIndex === sortState.value.key)?.title ?? ''
)

const sortedRows = computed(() => {
  const { key, order } = sortState.value
  if (!key || !order) return rows.value
  const numeric = columns.value.find(c => c.dataIndex === key)?.numeric
  const dir = order === 'ascend' ? 1 : -1
  return [...rows.value].sort((a, b) => {
    const av = a[key]
    const bv = b[key]
    if (numeric) return ((Number(av) || 0) - (Number(bv) || 0)) * dir
    return String(av ?? '').localeCompare(String(bv ?? ''), 'zh-CN') * dir
  })
})

function onSorterChange(dataIndex: string, direction: string) {
  sortState.value = {
    key: direction ? dataIndex : '',
    order: direction === 'ascend' || direction === 'descend' ? (direction as 'ascend' | 'descend') : ''
  }
}

function clearSort() {
  sortState.value = { key: '', order: '' }
}

// 换了查询结果就重置排序,避免残留的排序键落到新列上
watch(() => props.result, clearSort)

/** 按当前分隔符生成导出文本（含 BOM） */
function buildFile(cols: ResultColumn[], data: Record<string, string | number>[], delimiter: string): string {
  return buildDelimitedText(cols, data, delimiter)
}

/** 触发浏览器下载（扩展名由分隔符推导） */
function downloadFile(
  fileName: string,
  ext: string,
  cols: ResultColumn[],
  data: Record<string, string | number>[],
  delimiter: string
) {
  const text = buildFile(cols, data, delimiter)
  const mime = ext === 'tsv' ? 'text/tab-separated-values' : ext === 'csv' ? 'text/csv' : 'text/plain'
  const blob = new Blob([text], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${fileName}.${ext}`
  a.click()
  URL.revokeObjectURL(url)
}

/* ── 导出弹窗 ── */
const exportVisible = ref(false)
/** columns 存勾选的列 dataIndex，默认全选；delimiter/delimiterCustom 控制分隔符 */
const exportForm = reactive<{
  fileName: string
  columns: string[]
  delimiter: string
  delimiterCustom: string
}>({
  fileName: '',
  columns: [],
  delimiter: ',',
  delimiterCustom: ''
})

/** 当前选择推导出的实际分隔串（自定义为空时回落逗号） */
const effectiveDelimiter = computed(() =>
  resolveDelimiter({ selected: exportForm.delimiter, custom: exportForm.delimiterCustom })
)
/** 当前选择对应的文件扩展名 */
const exportExt = computed(() =>
  extOfDelimiter({ selected: exportForm.delimiter, custom: exportForm.delimiterCustom })
)

/** 勾选列(按表格列顺序,保证 CSV 列序稳定) */
const exportColumns = computed<ResultColumn[]>(() =>
  columns.value.filter(c => exportForm.columns.includes(c.dataIndex))
)

/** 导出列面板:默认展开;colKeyword 只影响展示,不改变已勾列 */
const colsPanel = ref<string[]>(['cols'])
const colKeyword = ref('')
const filteredColumns = computed<ResultColumn[]>(() => {
  const kw = colKeyword.value.trim().toLowerCase()
  if (!kw) return columns.value
  return columns.value.filter(
    c => c.title.toLowerCase().includes(kw) || c.dataIndex.toLowerCase().includes(kw)
  )
})

/** 全选当前(筛选结果):并入勾选中按表格列序排列,已勾但被筛掉的列不丢 */
function selectAllColumns() {
  const picked = new Set([...exportForm.columns, ...filteredColumns.value.map(c => c.dataIndex)])
  exportForm.columns = columns.value.filter(c => picked.has(c.dataIndex)).map(c => c.dataIndex)
}

/** 默认文件名:查询结果_YYYYMMDDHHmmss */
function defaultFileName(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `查询结果_${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
}

function openExport() {
  exportForm.fileName = defaultFileName()
  exportForm.delimiter = ','
  exportForm.delimiterCustom = ''
  colKeyword.value = ''
  colsPanel.value = ['cols']
  selectAllColumns()
  exportVisible.value = true
}

/**
 * 右下角模式按钮直接提交(只导出勾选列):
 * quick 纯前端生成文件,不创建任务、不写入「我的导出」;
 * backend 创建导出任务,文件在「我的导出」列表里下载。
 */
function submitExport(mode: ExportMode) {
  const name = exportForm.fileName.trim()
  if (!name) {
    Message.warning('请填写文件名称')
    return // 保持弹窗打开
  }
  // 自定义分隔符验证：非空 + 长度 + 不涵盖换行
  if (exportForm.delimiter === 'custom') {
    const err = validateCustomDelimiter(exportForm.delimiterCustom)
    if (err) {
      Message.warning(err)
      return
    }
  }
  const cols = exportColumns.value
  if (!cols.length) {
    Message.warning('请至少勾选 1 列')
    return
  }
  const data = sortedRows.value
  const delimiter = effectiveDelimiter.value
  const ext = exportExt.value

  if (mode === 'quick') {
    downloadFile(name, ext, cols, data, delimiter)
    Message.success(`已生成 ${ext.toUpperCase()}（${data.length} 行，分隔符 “${prettyDelimiter(delimiter)}”），开始下载`)
    exportVisible.value = false
    return
  }

  const dsLabel = DATASOURCE_LABEL[props.datasource]

  exportStore.createTask({
    baseName: name,
    datasource: dsLabel,
    rowCount: data.length,
    columns: cols,
    rows: data,
    delimiter,
    fileExt: ext
  })

  exportVisible.value = false
  Message.success({
    content: () =>
      h('span', {}, [
        '导出任务已创建,请到「我的导出」查看 ',
        h(
          'a',
          {
            style: 'color:rgb(var(--primary-6));cursor:pointer;margin-left:4px',
            onClick: () => router.push({ name: 'unified-query-exports' })
          },
          '查看任务'
        )
      ]),
    duration: 5000,
    closable: true
  })
}
</script>

<style lang="scss" scoped>
.uq-result {
  height: 100%;
  display: flex;
  flex-direction: column;

  &__spin {
    flex: 1;
    min-height: 120px;
    display: block;
  }

  &__placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 120px;
    color: var(--color-text-3);
    font-size: 13px;

    &.is-error { color: rgb(var(--danger-6)); }
    &.is-warn { color: rgb(var(--warning-6)); }
  }

  &__footer {
    flex: none;
    display: flex;
    align-items: center;
    padding: 6px 12px;
    border-top: 1px solid var(--color-border-2);
    font-size: 12px;
    color: var(--color-text-3);
  }

  &__sorted {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  &__spacer {
    flex: 1;
  }
}

.uq-export__alert {
  margin-bottom: 16px;
}

/* 分隔符行：下拉 + 自定义输入 + 扩展名标签 */
.uq-export__delimiter {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.uq-export__delimiter-preview {
  margin-left: 8px;
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 12px;
  color: var(--color-text-3);
}

.uq-export__hint {
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--color-text-3);
}

/* 导出列面板(可折叠):紧贴表单下方 */
.uq-export__collapse {
  margin-top: 4px;
}

.uq-export__cols-search {
  margin-bottom: 8px;
}

/* 列名平铺展示,列多时限定高度内滚动,避免弹窗被撑长 */
.uq-export__cols {
  width: 100%;
  max-height: 132px;
  padding: 8px 10px;
  overflow-y: auto;
  border: 1px solid var(--color-border-2);
  border-radius: 4px;
}

.uq-export__cols-empty {
  padding: 12px 0;
  font-size: 12px;
  text-align: center;
  color: var(--color-text-3);
}
</style>
