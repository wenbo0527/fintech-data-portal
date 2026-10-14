<template>
  <!--
    @prd: data-standard 全量上传（U1-U4 / U-E1~U-E4 / E3-E7）
    2026-10-13 由空壳重写为可用的全量上传通道：
      U1 模板下载 —— 每个模块给出与展示字段一致的模板列（演示环境以 CSV/UTF-8 承载，列名与 Excel 模板一致）
      U2 全量覆盖 —— 校验通过后调用对应 Store.replaceAll，未出现在文件中的旧记录不保留
      U3 上传反馈 —— 回显总/成功/失败/警告条数，失败行标注行号与原因
      U4 原子性   —— 存在错误行时「确认导入」禁用，整批不写入
      U-E1 格式   / U-E2 唯一键重复 / U-E3 必填列缺失 / U-E4 读取中断
      E3/E5 引用不存在、E6 来源非法 = 警告行（允许上传、提示核对）
      E4 类型长度精度不匹配、E7 缩写非法字符 = 错误行（拦截）
  -->
  <a-modal
    :visible="visible"
    :title="title"
    :width="860"
    :mask-closable="false"
    :esc-to-close="true"
    unmount-on-close
    @update:visible="handleVisibleChange"
    @cancel="handleClose"
  >
    <a-alert type="info" style="margin-bottom: 16px">
      {{ description }}上传文件视为<strong>全量数据</strong>，校验通过后覆盖式更新，文件中未出现的旧记录将不再保留。
    </a-alert>

    <a-space style="margin-bottom: 12px">
      <a-button @click="downloadTemplate">
        <template #icon><icon-download /></template>
        下载模板（{{ columns.length }} 列）
      </a-button>
      <a-upload
        :auto-upload="false"
        :limit="1"
        :file-list="false"
        accept=".csv,.txt,.xls,.xlsx"
        @change="handleFileChange"
      >
        <template #upload-button>
          <a-button type="primary">
            <template #icon><icon-upload /></template>
            选择文件并校验
          </a-button>
        </template>
      </a-upload>
      <a-button v-if="result" size="small" @click="resetResult">清除结果</a-button>
    </a-space>

    <a-result
      v-if="!result"
      status="info"
      title="尚未选择文件"
      :subtitle="`模板首行为表头，唯一键为「${moduleConfig.keyLabel}」；支持列顺序与模板一致或任意顺序。`"
    />

    <template v-else>
      <a-row :gutter="12" style="margin-bottom: 12px">
        <a-col :span="6"><a-statistic title="文件数据行" :value="result.total" /></a-col>
        <a-col :span="6"><a-statistic title="校验通过" :value="result.validCount" show-group-separator /></a-col>
        <a-col :span="6">
          <a-statistic title="错误行（拦截）" :value="result.errors.length">
            <template #suffix><span style="font-size: 12px">行</span></template>
          </a-statistic>
        </a-col>
        <a-col :span="6"><a-statistic title="警告行（可导入）" :value="result.warnings.length" /></a-col>
      </a-row>

      <a-alert
        v-if="result.fatal"
        type="error"
        style="margin-bottom: 12px"
      >
        {{ result.fatal }}
      </a-alert>
      <a-alert
        v-else-if="result.errors.length"
        type="warning"
        style="margin-bottom: 12px"
      >
        存在 {{ result.errors.length }} 个错误行，按 U4 原子性规则整批不写入，原 {{ moduleLabel }} 数据保持不变；请修正后重新上传。
      </a-alert>

      <a-table
        v-if="result.errors.length"
        :data="result.errors"
        :pagination="{ pageSize: 5, showTotal: true }"
        size="small"
        :scroll="{ y: 200 }"
        style="margin-bottom: 12px"
      >
        <template #columns>
          <a-table-column title="行号" data-index="row" :width="80" />
          <a-table-column title="字段" data-index="field" :width="150" />
          <a-table-column title="问题" data-index="message" />
          <a-table-column title="键值" data-index="key" :width="160" ellipsis tooltip />
        </template>
      </a-table>

      <a-table
        v-if="result.warnings.length"
        :data="result.warnings"
        :pagination="{ pageSize: 5 }"
        size="small"
        :scroll="{ y: 160 }"
      >
        <template #columns>
          <a-table-column title="行号" data-index="row" :width="80" />
          <a-table-column title="字段" data-index="field" :width="150" />
          <a-table-column title="提示" data-index="message" />
          <a-table-column title="键值" data-index="key" :width="160" ellipsis tooltip />
        </template>
      </a-table>
    </template>

    <template #footer>
      <a-space>
        <span v-if="result && !blocked" style="color: var(--color-text-3)">
          确认后将覆盖当前 {{ moduleLabel }} 列表（{{ result.validCount }} 条）
        </span>
        <a-button @click="handleClose">取消</a-button>
        <a-button
          type="primary"
          :disabled="!result || blocked"
          @click="handleConfirm"
        >
          确认导入
        </a-button>
      </a-space>
    </template>
  </a-modal>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Message } from '@arco-design/web-vue'
import { saveAs } from 'file-saver'
import {
  StandardStore,
  DomainStore,
  StdCodeStore,
  WordStore,
  type Standard,
  type StandardDomain,
  type StandardCodeEntry,
  type StandardWord
} from '@/mock-shared/standard-store'

type ModuleType = 'standards' | 'domains' | 'codes' | 'words'

const props = withDefaults(
  defineProps<{
    visible: boolean
    title?: string
    type?: ModuleType
    description?: string
  }>(),
  {
    title: '全量导入',
    type: 'standards',
    description: '请下载模板，填写完成后上传，系统将自动解析并完成校验。'
  }
)

const emit = defineEmits<{
  (e: 'update:visible', v: boolean): void
  (e: 'success', payload: { type: ModuleType; count: number }): void
}>()

interface Issue {
  row: number
  field: string
  message: string
  key: string
}

interface ParseResult {
  total: number
  validCount: number
  fatal: string
  errors: Issue[]
  warnings: Issue[]
  records: unknown[]
}

// ───────────────────────── 模块配置（模板列 = 展示字段，R06/R11/R18/R23） ─────────────────────────
const SOURCES = ['国标', '行标', 'ISO', '行内标准', '国家标准', '行业标准', '国际标准']
const LOGICAL_TYPES = ['CHAR', 'VARCHAR2', 'VARCHAR', 'NUMBER', 'DECIMAL', 'DATE', 'TIMESTAMP', 'CLOB']

const MODULES: Record<
  ModuleType,
  {
    label: string
    keyLabel: string
    columns: string[]
    required: string[]
    sample: string[][]
  }
> = {
  standards: {
    label: '数据标准',
    keyLabel: '标准编号',
    columns: [
      '标准编号', '主题', '一级分类', '二级分类', '归口管理部门', '中文名称', '英文全称', '英文简称',
      '词素分析', '业务定义', '域', '数据类型', '业务数据类型', '长度', '精度', '是否代码',
      '标准代码编号', '标准代码中文名称', '标准来源', '标准依据'
    ],
    required: ['标准编号', '中文名称', '业务定义', '数据类型', '长度'],
    sample: [
      ['STD-101', '客户', '客户信息', '基本信息', '数据管理部', '客户名称', 'Customer Name', 'CUST_NM',
       'cust(客户) + name(名称)', '客户的法定名称', 'CHAR_120', 'VARCHAR2', '字符型', '120', '-', '否',
       '-', '-', '行内标准', '《数据标准管理办法 V2.0》'],
      ['STD-102', '公共', '代码类', '性别', '数据管理部', '性别', 'Gender', 'GENDER',
       'gender(性别)', '客户性别统计分类', 'CODE_GENDER', 'CHAR', '代码型', '1', '-', '是',
       'STD_GENDER', '性别代码', '国标', 'GB/T 2261.1-2003']
    ]
  },
  domains: {
    label: '标准域',
    keyLabel: '域',
    columns: [
      '域', '域中文名称', '业务数据类型', '逻辑数据类型', '长度', '精度', '是否代码',
      '标准代码编号', '标准代码中文名称', '域描述'
    ],
    required: ['域', '域中文名称', '逻辑数据类型', '长度'],
    sample: [
      ['AMT_18_2', '金额域', '金额', 'NUMBER', '18', '2', '否', '-', '-', '总长 18 位、小数 2 位'],
      ['CODE_GENDER', '性别代码域', '代码', 'CHAR', '1', '0', '是', 'STD_GENDER', '性别代码', '1 位枚举代码']
    ]
  },
  codes: {
    label: '标准代码',
    keyLabel: '标准代码',
    columns: ['主题', '代码名称', '标准代码', '码值', '码意', '其他', '来源'],
    required: ['标准代码', '代码名称', '码值', '码意'],
    sample: [
      ['公共', '性别代码', 'STD_GENDER', '1', '男', '', '国标'],
      ['公共', '性别代码', 'STD_GENDER', '2', '女', '', '国标'],
      ['账户', '账户状态代码', 'STD_ACCT_STATUS', 'A', '正常', '', '行内标准']
    ]
  },
  words: {
    label: '标准单词',
    keyLabel: '单词英文缩写',
    columns: ['单词中文名称', '单词英文名称', '单词英文缩写', '同义词', '是否为分类词', '备注'],
    required: ['单词中文名称', '单词英文名称', '单词英文缩写'],
    sample: [
      ['客户', 'Customer', 'CUST', '用户, 消费者', '否', '零售与对公客户统称'],
      ['代码', 'Code', 'CD', '编号', '是', '分类词，枚举字段命名后缀']
    ]
  }
}

const moduleConfig = computed(() => MODULES[props.type])
const moduleLabel = computed(() => moduleConfig.value.label)
const columns = computed(() => moduleConfig.value.columns)

const result = ref<ParseResult | null>(null)

/** U4：文件级致命错误、行级校验错误、或零有效行 —— 任一命中即禁止写入 */
const blocked = computed(() => {
  const r = result.value
  if (!r) return true
  return !!r.fatal || r.errors.length > 0 || r.validCount === 0
})

// ───────────────────────── CSV 解析 ─────────────────────────
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let cur: string[] = []
  let field = ''
  let quoted = false
  const src = text.replace(/^\uFEFF/, '')
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') { field += '"'; i++ } else { quoted = false }
      } else {
        field += ch
      }
      continue
    }
    if (ch === '"') { quoted = true; continue }
    if (ch === ',') { cur.push(field); field = ''; continue }
    if (ch === '\r') continue
    if (ch === '\n') { cur.push(field); rows.push(cur); cur = []; field = ''; continue }
    field += ch
  }
  if (field !== '' || cur.length) { cur.push(field); rows.push(cur) }
  return rows.filter(r => r.some(c => String(c).trim() !== ''))
}

function normalizeHeader(h: string) {
  return String(h || '').replace(/^\uFEFF/, '').trim().replace(/\s+/g, '')
}

const toBool = (v: string) => ['是', 'Y', 'y', 'true', 'TRUE', '1'].includes(String(v).trim())

function numOrNaN(v: string): number {
  const s = String(v ?? '').trim()
  if (s === '' || s === '-') return NaN
  return Number(s)
}

// ───────────────────────── 校验（U-E1~E3 + E4~E7） ─────────────────────────
function validate(headerMap: Record<string, number>, dataRows: string[][]): ParseResult {
  const cfg = moduleConfig.value
  const errors: Issue[] = []
  const warnings: Issue[] = []

  const cell = (row: string[], col: string) => {
    const idx = headerMap[col]
    return idx === undefined ? '' : String(row[idx] ?? '').trim()
  }

  // U-E3 必填列缺失（表头层面）
  const missingCols = cfg.columns.filter(c => headerMap[c] === undefined)
  if (missingCols.length) {
    return {
      total: dataRows.length, validCount: 0,
      fatal: `缺少模板必需列：${missingCols.join('、')}，请重新下载模板后上传（U-E3）。`,
      errors, warnings, records: []
    }
  }
  if (!dataRows.length) {
    return { total: 0, validCount: 0, fatal: '文件中没有有效数据行。', errors, warnings, records: [] }
  }

  // U-E2 唯一键重复（标准代码为「一码多行」，按分组判断）
  const keyValueRows = new Map<string, number[]>()
  dataRows.forEach((row, i) => {
    const k = cell(row, cfg.keyLabel)
    if (!k) return
    const arr = keyValueRows.get(k) || []
    arr.push(i + 2)
    keyValueRows.set(k, arr)
  })
  if (props.type !== 'codes') {
    keyValueRows.forEach((rows, key) => {
      if (rows.length > 1) {
        errors.push({ row: rows[1], field: cfg.keyLabel, message: `唯一键重复（同键出现在第 ${rows.join('、')} 行）`, key })
      }
    })
  }

  const codeGroups: StandardCodeEntry[] = []
  const groupIndex = new Map<string, StandardCodeEntry>()
  const built: unknown[] = []

  dataRows.forEach((row, i) => {
    const lineNo = i + 2
    const keyValue = cell(row, cfg.keyLabel)

    // 必填（行层面）
    cfg.required.forEach(col => {
      if (!cell(row, col)) {
        errors.push({ row: lineNo, field: col, message: '必填项为空', key: keyValue })
      }
    })

    if (props.type === 'standards') built.push(buildStandard(row, lineNo, cell, errors, warnings, keyValue));
    if (props.type === 'domains') built.push(buildDomain(row, lineNo, cell, errors, warnings, keyValue));
    if (props.type === 'words') built.push(buildWord(row, lineNo, cell, errors, warnings, keyValue));
    if (props.type === 'codes') groupCode(row, lineNo, cell, errors, warnings, keyValue, groupIndex, codeGroups);
  })

  const records = props.type === 'codes' ? codeGroups : built.filter(Boolean)
  const validCount = props.type === 'codes' ? codeGroups.length : records.length

  return {
    total: dataRows.length,
    validCount,
    fatal: '',
    errors,
    warnings,
    records
  }
}

// —— 数据标准（E3：引用的域/标准代码编号不存在 → 警告） ——
function buildStandard(
  row: string[], lineNo: number,
  cell: (r: string[], c: string) => string,
  errors: Issue[], warnings: Issue[], keyValue: string
): Standard | null {
  const dataType = cell(row, '数据类型').toUpperCase()
  const len = numOrNaN(cell(row, '长度'))
  const precision = cell(row, '精度')
  const domain = cell(row, '域')
  const stdCodeNo = cell(row, '标准代码编号')
  const isCode = toBool(cell(row, '是否代码'))

  if (len !== len || len <= 0) {
    errors.push({ row: lineNo, field: '长度', message: '长度须为正整数', key: keyValue })
  }
  if (!LOGICAL_TYPES.includes(dataType) && dataType) {
    errors.push({ row: lineNo, field: '数据类型', message: `数据类型「${dataType}」不在允许范围`, key: keyValue })
  }
  if (isCode && !stdCodeNo) {
    errors.push({ row: lineNo, field: '标准代码编号', message: '是否代码=是 时必须填写标准代码编号', key: keyValue })
  }
  if (domain && !DomainStore.exists(domain)) {
    warnings.push({ row: lineNo, field: '域', message: `引用的域「${domain}」不存在，请核对（E3）`, key: keyValue })
  }
  if (stdCodeNo && stdCodeNo !== '-' && !StdCodeStore.exists(stdCodeNo)) {
    warnings.push({ row: lineNo, field: '标准代码编号', message: `引用的标准代码「${stdCodeNo}」不存在，请核对（E3）`, key: keyValue })
  }

  return {
    code: keyValue, standardNo: keyValue,
    name: cell(row, '中文名称'), cnName: cell(row, '中文名称'),
    category: cell(row, '一级分类'), categoryL1: cell(row, '一级分类'), categoryL2: cell(row, '二级分类'),
    theme: cell(row, '主题'), manageDept: cell(row, '归口管理部门'),
    enFullName: cell(row, '英文全称'), enAbbr: cell(row, '英文简称'),
    morpheme: cell(row, '词素分析'), definition: cell(row, '业务定义'), bizDefinition: cell(row, '业务定义'),
    domain: domain || '-', dataType: dataType || '-', bizDataType: cell(row, '业务数据类型'),
    length: Number.isFinite(len) ? len : 0, precision: precision || '-', scale: undefined,
    isCode, stdCodeNo: stdCodeNo || '-', stdCodeName: cell(row, '标准代码中文名称') || '-',
    stdSource: cell(row, '标准来源'), stdBasis: cell(row, '标准依据'),
    owner: cell(row, '归口管理部门'), complianceRate: 100, valueRange: '', example: '',
    status: 'published', updateTime: now(),
    history: [{ ts: now(), actor: '全量上传', action: '全量导入覆盖', from: 'draft', to: 'published' }]
  }
}

// —— 标准域（E4：逻辑数据类型与长度精度不匹配 → 拦截；E5：标准代码编号不存在 → 警告） ——
function buildDomain(
  row: string[], lineNo: number,
  cell: (r: string[], c: string) => string,
  errors: Issue[], warnings: Issue[], keyValue: string
): StandardDomain | null {
  const logical = cell(row, '逻辑数据类型').toUpperCase()
  const len = numOrNaN(cell(row, '长度'))
  const prec = numOrNaN(cell(row, '精度'))
  const stdCodeNo = cell(row, '标准代码编号')
  const isCode = toBool(cell(row, '是否代码'))

  if (!LOGICAL_TYPES.includes(logical)) {
    errors.push({ row: lineNo, field: '逻辑数据类型', message: `「${logical}」不在允许范围`, key: keyValue })
  }
  if (!Number.isFinite(len) || len <= 0) {
    errors.push({ row: lineNo, field: '长度', message: '长度须为正整数', key: keyValue })
  }
  const isNumeric = logical === 'NUMBER' || logical === 'DECIMAL'
  if (!Number.isFinite(prec)) {
    errors.push({ row: lineNo, field: '精度', message: '精度须为数字（非数值型填 0）', key: keyValue })
  } else if (!isNumeric && prec > 0) {
    errors.push({ row: lineNo, field: '精度', message: `${logical} 不支持精度>0（E4）`, key: keyValue })
  } else if (isNumeric && Number.isFinite(len) && prec > len) {
    errors.push({ row: lineNo, field: '精度', message: `精度 ${prec} 不可大于长度 ${len}（E4）`, key: keyValue })
  }
  if (isCode && stdCodeNo && !StdCodeStore.exists(stdCodeNo)) {
    warnings.push({ row: lineNo, field: '标准代码编号', message: `标准代码「${stdCodeNo}」不存在，请核对（E5）`, key: keyValue })
  }

  return {
    code: keyValue, name: cell(row, '域中文名称'),
    businessDataType: cell(row, '业务数据类型'), logicalDataType: logical,
    length: Number.isFinite(len) ? len : 0, precision: Number.isFinite(prec) ? prec : 0,
    isCode, stdCodeNo: stdCodeNo || '-', stdCodeName: cell(row, '标准代码中文名称') || '-',
    description: cell(row, '域描述'), updateTime: now()
  }
}

// —— 标准代码（一码多行分组；E6：来源取值非法 → 警告） ——
function groupCode(
  row: string[], lineNo: number,
  cell: (r: string[], c: string) => string,
  errors: Issue[], warnings: Issue[], keyValue: string,
  groupIndex: Map<string, StandardCodeEntry>, groups: StandardCodeEntry[]
) {
  const source = cell(row, '来源')
  if (source && !SOURCES.includes(source)) {
    warnings.push({ row: lineNo, field: '来源', message: `来源「${source}」不在国标/行标/ISO/行内标准范围内（E6）`, key: keyValue })
  }
  let entry = groupIndex.get(keyValue)
  if (!entry) {
    entry = {
      code: keyValue, name: cell(row, '代码名称'), subject: cell(row, '主题'),
      source: source || '-', items: [], updateTime: now()
    }
    groupIndex.set(keyValue, entry)
    groups.push(entry)
    return
  }
  if (entry.name && cell(row, '代码名称') && entry.name !== cell(row, '代码名称')) {
    errors.push({
      row: lineNo, field: '代码名称',
      message: `同一标准代码下代码名称不一致（与第 1 行「${entry.name}」冲突）`, key: keyValue
    })
  }
  entry.items.push({ value: cell(row, '码值'), meaning: cell(row, '码意'), extra: cell(row, '其他') || undefined })
}

// —— 标准单词（R22/U-E2：缩写唯一；E7：非法字符） ——
function buildWord(
  row: string[], lineNo: number,
  cell: (r: string[], c: string) => string,
  errors: Issue[], warnings: Issue[], keyValue: string
): StandardWord | null {
  if (keyValue && !/^[A-Za-z0-9_]+$/.test(keyValue)) {
    errors.push({ row: lineNo, field: '单词英文缩写', message: '缩写只允许字母、数字与下划线（E7）', key: keyValue })
  }
  return {
    chineseName: cell(row, '单词中文名称'), englishName: cell(row, '单词英文名称'),
    abbreviation: keyValue, synonyms: cell(row, '同义词'),
    isClassWord: toBool(cell(row, '是否为分类词')), remark: cell(row, '备注'), updateTime: now()
  }
}

function now() {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

// ───────────────────────── 交互 ─────────────────────────
function handleFileChange(fileList: unknown[], fileItem: { file?: File; name?: string; status?: string; uid?: string }) {
  const raw = fileItem?.file as File | undefined
  if (!raw) return
  const name = (raw.name || fileItem?.name || '').toLowerCase()
  if (/\.(xls|xlsx)$/.test(name)) {
    // U-E1：演示环境为纯前端 mock，不做二进制 xlsx 解析，明确引导另存为 CSV
    result.value = {
      total: 0, validCount: 0,
      fatal: '当前为纯前端演示环境，未内置 Excel 解析引擎；请在 Excel 中「另存为 CSV UTF-8」后重新上传（列名不变，U-E1）。',
      errors: [], warnings: [], records: []
    }
    return
  }
  if (!/\.(csv|txt)$/.test(name)) {
    result.value = {
      total: 0, validCount: 0,
      fatal: `不支持的文件格式：${name || '未知'}。请上传 .csv 模板文件（U-E1）。`,
      errors: [], warnings: [], records: []
    }
    return
  }

  const reader = new FileReader()
  reader.onload = () => {
    try {
      const rows = parseCsv(String(reader.result || ''))
      if (rows.length < 2) {
        result.value = { total: 0, validCount: 0, fatal: '文件仅含表头或为空，无数据行。', errors: [], warnings: [], records: [] }
        return
      }
      const headerMap: Record<string, number> = {}
      rows[0].forEach((h, idx) => { headerMap[normalizeHeader(h)] = idx })
      result.value = validate(headerMap, rows.slice(1))
      Message.info(`已解析 ${result.value.total} 行：通过 ${result.value.validCount} 条，错误 ${result.value.errors.length} 条，警告 ${result.value.warnings.length} 条`)
    } catch {
      // U-E4
      result.value = { total: 0, validCount: 0, fatal: '文件读取中断，原有数据保持不变，请重新上传（U-E4）。', errors: [], warnings: [], records: [] }
    }
  }
  reader.onerror = () => {
    result.value = { total: 0, validCount: 0, fatal: '文件读取失败，原有数据保持不变，请重新上传（U-E4）。', errors: [], warnings: [], records: [] }
  }
  reader.readAsText(raw, 'UTF-8')
}

function resetResult() {
  result.value = null
}

function handleVisibleChange(v: boolean) {
  emit('update:visible', v)
  if (!v) result.value = null
}

function handleConfirm() {
  const r = result.value
  if (!r || blocked.value) return
  // U2 全量覆盖
  if (props.type === 'standards') StandardStore.replaceAllStandards(r.records as Standard[])
  else if (props.type === 'domains') DomainStore.replaceAll(r.records as StandardDomain[])
  else if (props.type === 'codes') StdCodeStore.replaceAll(r.records as StandardCodeEntry[])
  else WordStore.replaceAll(r.records as StandardWord[])

  Message.success(
    `${moduleLabel.value}已全量覆盖：成功 ${r.validCount} 条` +
    (r.warnings.length ? `，其中 ${r.warnings.length} 条带核对提示` : '')
  )
  emit('success', { type: props.type, count: r.validCount })
  emit('update:visible', false)
  result.value = null
}

function handleClose() {
  emit('update:visible', false)
  result.value = null
}

function downloadTemplate() {
  const cfg = moduleConfig.value
  const head = cfg.columns.join(',')
  const body = cfg.sample.map(r => r.map(c => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(',')).join('\n')
  // BOM 保证 Excel 打开中文不乱码
  const blob = new Blob([`\uFEFF${head}\n${body}\n`], { type: 'text/csv;charset=utf-8' })
  saveAs(blob, `${moduleLabel.value}导入模板.csv`)
  Message.success(`已下载${moduleLabel.value}模板（${cfg.columns.length} 列，唯一键：${cfg.keyLabel}）`)
}
</script>
