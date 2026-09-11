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

    <!-- 导出弹窗:选择导出方式 / 编辑文件名 / 文件类型 CSV -->
    <a-modal
      v-model:visible="exportVisible"
      title="导出查询结果"
      :width="460"
      :mask-closable="false"
      ok-text="确定"
      @before-ok="submitExport"
    >
      <a-form :model="exportForm" layout="vertical">
        <a-form-item label="导出方式" required>
          <a-radio-group v-model="exportForm.method" type="button">
            <a-radio value="platform">
              <icon-save /> 保存到平台
            </a-radio>
            <a-radio value="local">
              <icon-download /> 下载到本地
            </a-radio>
          </a-radio-group>
          <div class="uq-export__hint">
            {{ exportForm.method === 'platform'
              ? '生成导出任务并保存到「我的导出」,可稍后统一下载。'
              : '创建导出任务的同时,浏览器会立即下载一份 CSV 文件。' }}
          </div>
        </a-form-item>
        <a-form-item label="文件名称" required>
          <a-input v-model="exportForm.fileName" placeholder="请输入文件名称" allow-clear>
            <template #suffix>.csv</template>
          </a-input>
        </a-form-item>
        <a-form-item label="文件类型">
          <a-input value="CSV(逗号分隔)" disabled />
        </a-form-item>
      </a-form>
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
import type { DataSourceKey, ExecStatus, ExportMethod, QueryResult, ResultColumn } from '@/mock/unified-query/types'
import { DATASOURCE_LABEL } from '@/mock/unified-query/database'
import { useUqExportStore } from '@/stores-dca/unified-query/export'

const props = withDefaults(
  defineProps<{
    result: QueryResult | null;
    loading?: boolean;
    status: ExecStatus;
    datasource?: DataSourceKey;
  }>(),
  { loading: false, datasource: 'doris' }
)

const router = useRouter()
const exportStore = useUqExportStore()

const columns = computed<ResultColumn[]>(() => props.result?.columns ?? [])
const rows = computed<Record<string, string | number>[]>(() =>
  (props.result?.rows ?? []).map((r, i) => ({ ...r, __idx: i }))
)
const duration = computed(() => props.result?.duration ?? '')
const rowCount = computed(() => props.result?.rowCount ?? 0)

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

/** 生成 CSV 文本(含 BOM,Excel 友好) */
function buildCsv(cols: ResultColumn[], data: Record<string, string | number>[]): string {
  const header = cols.map(c => c.title).join(',')
  const lines = data.map(r =>
    cols.map(c => {
      const v = r[c.dataIndex] ?? ''
      const s = String(v)
      // 含逗号/引号/换行的用双引号包裹
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }).join(',')
  )
  return '\uFEFF' + [header, ...lines].join('\n')
}

/** 触发浏览器下载 CSV */
function downloadCsv(fileName: string, cols: ResultColumn[], data: Record<string, string | number>[]) {
  const csv = buildCsv(cols, data)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${fileName}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

/* ── 导出弹窗 ── */
const exportVisible = ref(false)
const exportForm = reactive<{ fileName: string; method: ExportMethod }>({
  fileName: '',
  method: 'platform'
})

/** 默认文件名:查询结果_YYYYMMDDHHmmss */
function defaultFileName(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `查询结果_${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
}

function openExport() {
  exportForm.fileName = defaultFileName()
  exportForm.method = 'platform'
  exportVisible.value = true
}

/** 点击确定:创建导出任务;下载到本地时额外触发浏览器下载 */
function submitExport() {
  const name = exportForm.fileName.trim()
  if (!name) {
    Message.warning('请填写文件名称')
    return false // 阻止弹窗关闭
  }
  const cols = columns.value
  const data = sortedRows.value
  const dsLabel = DATASOURCE_LABEL[props.datasource]

  const task = exportStore.createTask({
    baseName: name,
    datasource: dsLabel,
    method: exportForm.method,
    rowCount: data.length,
    columns: cols,
    rows: data
  })

  if (exportForm.method === 'local') {
    downloadCsv(task.fileName, cols, data)
  }

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
  return true
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

.uq-export__hint {
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--color-text-3);
}
</style>
