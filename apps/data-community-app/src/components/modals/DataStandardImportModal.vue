<template>
  <!--
    @prd: data-standard 全量上传（U1-U4 / U-E1~U-E4 / E1~E5）
    2026-10-23 按《需求文档:数据管理-数据标准(评审简化版)》重写:
      U1  模板下载 —— 每模块提供 Excel(.xlsx)模板,列名 = 该模块展示字段(R06/R11/R23);
            模板含「填写说明」页签,仅支持 .xls/.xlsx 格式
      U2  全量覆盖 —— 校验通过后调用对应 Store.replaceAll,未出现在文件中的旧记录不保留
      U3  上传反馈 —— 回显总/成功/失败/警告条数,失败行标注行号与原因
      U4  原子性   —— 存在错误行时「确认导入」禁用,整批不写入,保留原有数据不变
      U-E1 文件格式错误(仅 .xls/.xlsx)/ U-E2 文件内唯一键重复 / U-E3 必填列缺失 / U-E4 读取中断
      E1  数据标准引用的数据域或代码集编号不存在 → 警告行
      E2  数据域代码格式非法 → 拦截
      E3  同一代码集内代码值重复 → 拦截;E4 适用标准编号不存在 → 警告;E5 代码集层字段不一致 → 警告
  -->
  <a-modal
    :visible="visible"
    :title="title"
    :width="900"
    :mask-closable="false"
    :esc-to-close="true"
    unmount-on-close
    @update:visible="handleVisibleChange"
    @cancel="handleClose"
  >
    <a-alert type="info" style="margin-bottom: 16px">
      {{ description }}上传文件视为<strong>全量数据</strong>，校验通过后覆盖式更新，文件中未出现的旧记录将不再保留；
      仅支持 <strong>.xls / .xlsx</strong> 格式。
    </a-alert>

    <a-space style="margin-bottom: 12px">
      <a-button @click="downloadTemplate">
        <template #icon><icon-download /></template>
        下载模板（{{ moduleConfig.columns.length }} 列）
      </a-button>
      <a-upload
        :auto-upload="false"
        :limit="1"
        :file-list="false"
        accept=".xls,.xlsx"
        @change="handleFileChange"
      >
        <template #upload-button>
          <a-button type="primary" :loading="uploading">
            <template #icon><icon-upload /></template>
            选择文件并校验
          </a-button>
        </template>
      </a-upload>
      <a-button v-if="result" size="small" @click="resetResult">清除结果</a-button>
    </a-space>

    <!-- 页面状态速查:上传中 → 上传进度条 -->
    <div v-if="uploading" style="margin-bottom: 12px">
      <a-progress :percent="progress" status="normal" />
      <div style="margin-top: 6px; color: var(--color-text-3); font-size: 12px">
        正在解析并校验文件，请勿关闭弹窗…
      </div>
    </div>

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
          <a-statistic title="失败行（拦截）" :value="result.errors.length">
            <template #suffix><span style="font-size: 12px">行</span></template>
          </a-statistic>
        </a-col>
        <a-col :span="6"><a-statistic title="警告行（可导入）" :value="result.warnings.length" /></a-col>
      </a-row>

      <a-alert v-if="result.fatal" type="error" style="margin-bottom: 12px">
        {{ result.fatal }}
      </a-alert>
      <a-alert v-else-if="result.errors.length" type="warning" style="margin-bottom: 12px">
        存在 {{ result.errors.length }} 个失败行，按 U4 原子性规则整批不写入，原 {{ moduleLabel }} 数据保持不变；请修正后重新上传。
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
        <a-button type="primary" :disabled="!result || blocked" @click="handleConfirm">
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
import * as XLSX from 'xlsx'
import {
  StandardStore,
  DomainStore,
  StdCodeStore,
  STANDARD_STATUS_LIST,
  STANDARD_STATUS_LABEL,
  type Standard,
  type StandardDomain,
  type StandardStatus,
  type StdCodeRow
} from '@/mock-shared/standard-store'

/** 支持全量上传的资产类型 */
type ModuleType = 'standards' | 'domains' | 'codes'

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

/** 单条校验问题 */
interface Issue {
  /** 行号(Excel 行号,表头为第 1 行) */
  row: number
  /** 涉及字段 */
  field: string
  /** 问题描述 */
  message: string
  /** 关联键值 */
  key: string
}

/** 文件解析与校验结果 */
interface ParseResult {
  /** 文件数据行数 */
  total: number
  /** 校验通过条数 */
  validCount: number
  /** 文件级致命错误 */
  fatal: string
  /** 失败行(拦截) */
  errors: Issue[]
  /** 警告行(允许上传,提示核对) */
  warnings: Issue[]
  /** 待写入的记录 */
  records: unknown[]
}

/** 行级构建上下文:单元格读取、列存在性判断与问题收集 */
interface RowContext {
  /** 行数据 */
  row: string[]
  /** Excel 行号(表头为第 1 行) */
  lineNo: number
  /** 单元格读取函数 */
  cell: (row: string[], col: string) => string
  /** 表头列存在性判断 */
  hasColumn: (col: string) => boolean
  /** 失败行(拦截) */
  errors: Issue[]
  /** 警告行(允许上传) */
  warnings: Issue[]
  /** 该行的唯一键文本 */
  keyValue: string
}

/** 模块上传配置:模板列 = 展示字段,唯一键见 R07/R12/R24/R29 */
interface ModuleConfig {
  /** 模块中文名 */
  label: string
  /** 唯一键说明 */
  keyLabel: string
  /** 模板列(与展示字段一致) */
  columns: string[]
  /** 必填列 */
  required: string[]
  /** 示例数据行 */
  sample: string[][]
  /** 填写说明(写入模板的「填写说明」页签) */
  guide: string[]
}

/* ══════════════════════ 模块配置 ══════════════════════ */

/** 数据域代码格式规则(E2:不符合格式即拦截) */
const DOMAIN_CODE_PATTERN = /^[A-Z][A-Z0-9_]*$/

const MODULES: Record<ModuleType, ModuleConfig> = {
  standards: {
    label: '数据标准',
    keyLabel: '标准编号',
    columns: [
      '标准编号', '所属数据域', '标准名称(中文)', '标准名称(英文)', '标准定义(业务含义)', '数据类型',
      '长度/精度', '是否必填', '值域/取值规则', '关联代码集编号', '数据分类', '数据分级',
      '涉及个人信息', '责任部门', '标准状态', '版本', '生效日期', '依据/引用标准', '备注'
    ],
    required: ['标准编号', '标准名称(中文)', '数据类型'],
    sample: [
      [
        'STD-101', 'CUST_DOMAIN', '客户编号', 'Customer Identification Number',
        '标识客户在本行唯一性的编号，客户信息建立时分配，全行共享。',
        '字符型', '12', '是', '^[0-9]{12}$', '-', '客户信息', '核心', '是', '零售银行部',
        '生效', 'V1.0', '2025-01-01', '《核心系统数据字典 V3.2》', '客户信息主键'
      ],
      [
        'STD-102', 'CODE_DOMAIN', '证件类型', 'Identity Document Type',
        '客户身份证明文件的种类划分，境内个人统一使用居民身份证。',
        '代码型', '3', '是', '枚举：CODE_ID_TYPE 码值', 'CODE_ID_TYPE', '客户信息', '重要', '是',
        '合规与法律部', '生效', 'V1.2', '2025-02-01', 'JR/T 0166-2020', '码值以代码集为准'
      ]
    ],
    guide: [
      '1. 唯一键为「标准编号」，文件内不可重复（U-E2）。',
      '2. 「标准定义(业务含义)」按纯文本填写，导入后以富文本形式在列表内截断 2 行展示，可展开查看。',
      '3. 「所属数据域」「关联代码集编号」填写的目标不存在时标注警告行，允许上传但请核对（E1）。',
      '4. 「是否必填」「涉及个人信息」填写 是 / 否。',
      '5. 「标准状态」可填：' + STANDARD_STATUS_LIST.map(s => STANDARD_STATUS_LABEL[s]).join(' / ') + '。'
    ]
  },
  domains: {
    label: '数据域',
    keyLabel: '数据域代码',
    columns: ['数据域代码', '数据域名称', '覆盖范围名称', '建议主责部门'],
    required: ['数据域代码', '数据域名称'],
    sample: [
      ['CUST_DOMAIN', '客户域', '客户主数据、客户信息类表字段', '零售银行部'],
      ['AMT_DOMAIN', '金额域', '账户余额、交易金额、还款金额类字段', '财务会计部']
    ],
    guide: [
      '1. 唯一键为「数据域代码」，文件内不可重复（U-E2）。',
      '2. 「数据域代码」只允许大写字母、数字与下划线，且以字母开头，不符合格式的行将被拦截（E2）。',
      '3. 上传为覆盖式更新，文件中未出现的数据域将被清除。',
      '4. 本模板不维护引用关系：引用该数据域的标准清单由数据标准「所属数据域」字段自动关联生成。'
    ]
  },
  codes: {
    label: '标准代码',
    keyLabel: '代码集编号 + 代码值',
    // R23 模板列:严格为 8 列,「是否有效」为代码集层字段(同一代码集多行共享,合并展示以首行为准)
    columns: [
      '代码集编号', '代码集名称', '适用标准编号', '代码值', '代码名称', '代码说明',
      '是否有效', '备注'
    ],
    required: ['代码集编号', '代码值', '代码名称'],
    sample: [
      ['CODE_GENDER', '性别代码', 'STD-003', '1', '男', '', '是', '按国家标准执行'],
      ['CODE_GENDER', '性别代码', 'STD-003', '2', '女', '', '是', ''],
      ['CODE_GENDER', '性别代码', 'STD-003', '9', '未说明', 'GB/T 2261.1 保留值', '是', '']
    ],
    guide: [
      '1. 一个代码值一行，联合唯一键为「代码集编号 + 代码值」，组合不可重复（U-E2 / E3）。',
      '2. 同一代码集下的多行共用代码集编号、代码集名称、是否有效等代码集层字段，'
        + '合并展示时以首行为准（E5）。',
      '3. 「是否有效」为代码集层字段；如需单独标记某条代码值是否有效，'
        + '可额外增加「代码值是否有效」列，与代码集层互不级联（对应 R17-1）。',
      '4. 同一代码集编号下的代码集层字段不一致时标注警告行，合并展示以首行为准（E5）。',
      '5. 「适用标准编号」填写不存在的标准编号时标注警告行，允许上传但请核对（E4）。',
      '6. 本模板不维护引用关系：引用该代码集的标准清单由数据标准「关联代码集编号」字段自动关联生成。'
    ]
  }
}

/* ══════════════════════ 响应式状态 ══════════════════════ */

const moduleConfig = computed(() => MODULES[props.type])
const moduleLabel = computed(() => moduleConfig.value.label)
const result = ref<ParseResult | null>(null)
/** 上传中(解析与校验过程) */
const uploading = ref(false)
/** 上传进度(0-100) */
const progress = ref(0)

/** U4：文件级致命错误、行级失败行、或零有效行 —— 任一命中即禁止写入 */
const blocked = computed(() => {
  const r = result.value
  if (!r) {return true}
  return !!r.fatal || r.errors.length > 0 || r.validCount === 0
})

/* ══════════════════════ 通用工具 ══════════════════════ */

/**
 * 布尔值解析(是/否、Y/N、true/false、1/0)。
 *
 * @param v 单元格原始文本
 * @returns 布尔值
 */
function toBool(v: string): boolean {
  return ['是', 'Y', 'y', 'true', 'TRUE', '1'].includes(String(v ?? '').trim())
}

/**
 * 生成当前时间戳(上传写入时作为最近更新时间)。
 *
 * @returns 形如 2026-10-23 10:00:00 的时间串
 */
function now(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

/**
 * 归一化表头(去 BOM、空白、全角空格)。
 *
 * @param h 表头文本
 * @returns 归一化后的表头
 */
function normalizeHeader(h: string): string {
  return String(h ?? '').replace(/^\uFEFF/, '').trim().replace(/\s+/g, '')
}

/**
 * 标准状态文本转枚举值。
 *
 * @param text 状态文本
 * @returns 状态枚举(非法值返回 undefined)
 */
function parseStatus(text: string): StandardStatus | undefined {
  const t = String(text ?? '').trim()
  return STANDARD_STATUS_LIST.find(s => STANDARD_STATUS_LABEL[s] === t || s === t)
}

/**
 * 纯文本转富文本 HTML(标准定义在列表中以富文本渲染)。
 *
 * @param text 纯文本
 * @returns HTML 字符串
 */
function textToHtml(text: string): string {
  const lines = String(text ?? '').split(/\r?\n/).filter(l => l.trim() !== '')
  if (!lines.length) {return ''}
  return lines.map(l => `<p>${l}</p>`).join('')
}

/* ══════════════════════ 文件解析 ══════════════════════ */

/**
 * 解析 Excel 文件为二维数组(首个页签)。
 *
 * @param buffer 文件二进制内容
 * @returns 行数组;解析失败抛出异常
 */
function parseWorkbook(buffer: ArrayBuffer): string[][] {
  const wb = XLSX.read(buffer, { type: 'array' })
  const sheetName = wb.SheetNames[0]
  if (!sheetName) {throw new Error('EMPTY_WORKBOOK')}
  const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], {
    header: 1,
    raw: false,
    defval: ''
  })
  return rows.map(r => (Array.isArray(r) ? r.map(c => String(c ?? '')) : []))
}

/* ══════════════════════ 校验 ══════════════════════ */

/**
 * 校验并构建记录(按模块分发)。
 *
 * @param headerMap 表头 → 列索引映射
 * @param dataRows 数据行
 * @returns 校验结果
 */
function validate(headerMap: Record<string, number>, dataRows: string[][]): ParseResult {
  const cfg = moduleConfig.value
  const errors: Issue[] = []
  const warnings: Issue[] = []

  /**
   * 读取单元格文本。
   *
   * @param row 行数据
   * @param col 列名
   * @returns 单元格文本
   */
  const cell = (row: string[], col: string): string => {
    const idx = headerMap[col]
    return idx === undefined ? '' : String(row[idx] ?? '').trim()
  }

  /**
   * 取该行的唯一键文本(用于问题清单展示)。
   *
   * @param row 行数据
   * @returns 键值文本
   */
  const keyTextOf = (row: string[]): string => {
    if (props.type === 'codes') {
      return `${cell(row, '代码集编号')} / ${cell(row, '代码值')}`
    }
    if (props.type === 'standards') {return cell(row, '标准编号')}
    if (props.type === 'domains') {return cell(row, '数据域代码')}
    return cell(row, '单词英文缩写')
  }

  // U-E2 文件内唯一键重复(标准代码为「代码集编号 + 代码值」联合键,对应 E3)
  const seen = new Map<string, number[]>()
  dataRows.forEach((row, i) => {
    const k = keyTextOf(row)
    if (!k) {return}
    const arr = seen.get(k) || []
    arr.push(i + 2)
    seen.set(k, arr)
  })
  seen.forEach((rowNos, key) => {
    if (rowNos.length > 1) {
      errors.push({
        row: rowNos[1],
        field: cfg.keyLabel,
        message: `唯一键重复（同键出现在第 ${rowNos.join('、')} 行，${props.type === 'codes' ? 'E3' : 'U-E2'}）`,
        key
      })
    }
  })

  /**
   * 判断某列是否存在于表头。
   *
   * @param col 列名
   * @returns 表头中是否存在该列
   */
  const hasColumn = (col: string): boolean => headerMap[col] !== undefined

  // U-E3 必填列缺失(表头层面)
  // 仅「必填列」缺失才整批拦截;其余模板列缺失按警告处理
  const missingRequired = cfg.required.filter(c => !hasColumn(c))
  if (missingRequired.length) {
    return {
      total: dataRows.length,
      validCount: 0,
      fatal: `缺少模板必需列：${missingRequired.join('、')}，请重新下载模板后上传（U-E3）。`,
      errors,
      warnings,
      records: []
    }
  }
  if (!dataRows.length) {
    return { total: 0, validCount: 0, fatal: '文件中没有有效数据行。', errors, warnings, records: [] }
  }

  // 非必填的模板列缺失 → 警告行(不阻断上传)
  const missingOptional = cfg.columns.filter(c => !cfg.required.includes(c) && !hasColumn(c))
  if (missingOptional.length) {
    warnings.push({
      row: 1,
      field: '表头',
      message: `缺少模板列：${missingOptional.join('、')}，对应字段将按空值写入，请核对`,
      key: '表头'
    })
  }

  const records: unknown[] = []
  dataRows.forEach((row, i) => {
    const lineNo = i + 2
    const keyValue = keyTextOf(row)

    // 行级必填校验
    cfg.required.forEach(col => {
      if (!cell(row, col)) {
        errors.push({ row: lineNo, field: col, message: '必填项为空', key: keyValue })
      }
    })

    // 行级构建上下文:单元格读取、列存在性判断、问题收集
    const ctx: RowContext = { row, lineNo, cell, hasColumn, errors, warnings, keyValue }
    if (props.type === 'standards') {records.push(buildStandard(ctx))}
    else if (props.type === 'domains') {records.push(buildDomain(ctx))}
    else {records.push(buildCodeRow(ctx))}
  })

  // U3:校验通过条数 = 总行数 - 存在失败项的行数(失败行不计入通过数)
  const failedRows = new Set(errors.map(e => e.row))
  const validCount = Math.max(0, records.length - failedRows.size)

  return {
    total: dataRows.length,
    validCount,
    fatal: '',
    errors,
    warnings,
    records
  }
}

/**
 * 构建数据标准记录(E1:引用的数据域/代码集编号不存在 → 警告)。
 *
 * @param ctx 行级构建上下文
 * @returns 数据标准记录
 */
function buildStandard(ctx: RowContext): Standard {
  const { row, lineNo, cell, warnings, keyValue } = ctx
  const standardNo = cell(row, '标准编号')
  const cnName = cell(row, '标准名称(中文)')
  const domain = cell(row, '所属数据域')
  const codeSetNo = cell(row, '关联代码集编号')
  const statusText = cell(row, '标准状态')
  const status = parseStatus(statusText)

  if (statusText && !status) {
    warnings.push({
      row: lineNo,
      field: '标准状态',
      message: `标准状态「${statusText}」不在允许范围（${STANDARD_STATUS_LIST
        .map(s => STANDARD_STATUS_LABEL[s])
        .join(' / ')}），已按「${STANDARD_STATUS_LABEL.draft}」写入，请核对`,
      key: keyValue
    })
  }
  // E1:引用的数据域 / 代码集编号不存在 → 警告行
  if (domain && domain !== '-' && !DomainStore.exists(domain)) {
    warnings.push({
      row: lineNo,
      field: '所属数据域',
      message: `引用的数据域「${domain}」不存在，请核对（E1）`,
      key: keyValue
    })
  }
  if (codeSetNo && codeSetNo !== '-' && !StdCodeStore.exists(codeSetNo)) {
    warnings.push({
      row: lineNo,
      field: '关联代码集编号',
      message: `引用的代码集「${codeSetNo}」不存在，请核对（E1）`,
      key: keyValue
    })
  }

  return {
    code: standardNo,
    standardNo,
    cnName,
    name: cnName,
    enName: cell(row, '标准名称(英文)'),
    domain: domain || '-',
    definition: textToHtml(cell(row, '标准定义(业务含义)')),
    dataType: cell(row, '数据类型') || '-',
    lengthPrecision: cell(row, '长度/精度') || '-',
    required: toBool(cell(row, '是否必填')),
    valueRange: cell(row, '值域/取值规则') || '-',
    codeSetNo: codeSetNo || '-',
    dataCategory: cell(row, '数据分类'),
    dataLevel: cell(row, '数据分级'),
    personalInfo: toBool(cell(row, '涉及个人信息')),
    ownerDept: cell(row, '责任部门'),
    status: status || 'draft',
    version: cell(row, '版本'),
    effectiveDate: cell(row, '生效日期'),
    basis: cell(row, '依据/引用标准'),
    remark: cell(row, '备注'),
    updateTime: now()
  }
}

/**
 * 构建数据域记录(E2:数据域代码格式非法 → 拦截)。
 *
 * @param ctx 行级构建上下文
 * @returns 数据域记录
 */
function buildDomain(ctx: RowContext): StandardDomain {
  const { row, lineNo, cell, errors, keyValue } = ctx
  const code = cell(row, '数据域代码')
  if (code && !DOMAIN_CODE_PATTERN.test(code)) {
    errors.push({
      row: lineNo,
      field: '数据域代码',
      message: '数据域代码格式非法，只允许大写字母、数字与下划线且以字母开头（E2）',
      key: keyValue
    })
  }
  return {
    code,
    name: cell(row, '数据域名称'),
    coverage: cell(row, '覆盖范围名称'),
    ownerDept: cell(row, '建议主责部门'),
    updateTime: now()
  }
}

/**
 * 标准代码:同一代码集编号的代码集层字段首行取值(E5 以首行为准)。
 * 用于后续行继承代码集层字段,避免同一代码集内各行字段取值不一致。
 */
const CODE_SET_FIRST_ROW = new Map<string, { name: string; valid: boolean }>()

/**
 * 构建标准代码行(E3:同代码集内代码值重复 → 拦截;E4:适用标准编号不存在 → 警告;
 * E5:同一代码集编号下代码集层字段不一致 → 警告,以首行为准)。
 *
 * R17-1:代码集层与代码值层的「是否有效」相互独立、不级联。
 * 模板的「是否有效」列写入代码集层;可选列「代码值是否有效」单独控制代码值层,
 * 未提供时代码值层默认有效。
 *
 * @param ctx 行级构建上下文
 * @returns 标准代码行
 */
function buildCodeRow(ctx: RowContext): StdCodeRow {
  const { row, lineNo, cell, hasColumn, warnings, keyValue } = ctx
  const codeSetNo = cell(row, '代码集编号')
  const applicableStandards = cell(row, '适用标准编号')
  const codeValue = cell(row, '代码值')

  // 代码集层字段:同一代码集多行共享,以首行为准(E5)
  const firstRow = CODE_SET_FIRST_ROW.get(codeSetNo)
  const rawName = cell(row, '代码集名称')
  const rawValid = cell(row, '是否有效')
  const codeSetName = firstRow ? firstRow.name : rawName
  const setValid = firstRow ? firstRow.valid : toBool(rawValid)

  // R17-1:代码值层的「是否有效」独立于代码集层
  const valueValid = hasColumn('代码值是否有效')
    ? toBool(cell(row, '代码值是否有效'))
    : true

  // E4:适用标准编号不存在 → 警告行
  applicableStandards
    .split(/[,，;；]/)
    .map(s => s.trim())
    .filter(Boolean)
    .forEach(stdNo => {
      if (!StandardStore.findByCode(stdNo)) {
        warnings.push({
          row: lineNo,
          field: '适用标准编号',
          message: `适用标准「${stdNo}」不存在，请核对（E4）`,
          key: keyValue
        })
      }
    })

  // E5:同一代码集编号下代码集层字段不一致 → 警告行(以首行为准)
  if (!firstRow) {
    CODE_SET_FIRST_ROW.set(codeSetNo, { name: rawName, valid: toBool(rawValid) })
    if (!rawName) {
      warnings.push({
        row: lineNo,
        field: '代码集名称',
        message: '代码集名称为空，代码集在列表中无法展示名称，请核对',
        key: keyValue
      })
    }
  } else {
    if (rawName && firstRow.name && rawName !== firstRow.name) {
      warnings.push({
        row: lineNo,
        field: '代码集名称',
        message: `同一代码集编号下代码集名称不一致（以首行「${firstRow.name}」为准，请核对，E5）`,
        key: keyValue
      })
    }
    if (rawValid && toBool(rawValid) !== firstRow.valid) {
      warnings.push({
        row: lineNo,
        field: '是否有效',
        message: `同一代码集编号下是否有效不一致（以首行为准，请核对，E5）`,
        key: keyValue
      })
    }
  }

  return {
    codeSetNo,
    codeSetName,
    applicableStandards,
    codeValue,
    codeName: cell(row, '代码名称'),
    codeDescription: cell(row, '代码说明'),
    setValid,
    valueValid,
    remark: cell(row, '备注'),
    updateTime: now()
  }
}

/* ══════════════════════ 交互 ══════════════════════ */

/**
 * 选择文件后解析并校验(U-E1 格式校验 / U-E4 读取中断)。
 *
 * @param fileList 文件列表
 * @param fileItem 当前文件项
 */
function handleFileChange(
  fileList: unknown[],
  fileItem: { file?: File; name?: string; status?: string; uid?: string }
): void {
  const raw = fileItem?.file as File | undefined
  if (!raw) {return}
  const name = (raw.name || fileItem?.name || '').toLowerCase()

  // U-E1:仅支持 .xls / .xlsx
  if (!/\.(xls|xlsx)$/.test(name)) {
    result.value = {
      total: 0,
      validCount: 0,
      fatal: `不支持的文件格式：${name || '未知'}。请上传 .xls 或 .xlsx 模板文件（U-E1）。`,
      errors: [],
      warnings: [],
      records: []
    }
    return
  }

  uploading.value = true
  progress.value = 10
  CODE_SET_FIRST_ROW.clear()

  const reader = new FileReader()
  reader.onload = e => {
    try {
      progress.value = 50
      const buffer = e.target?.result as ArrayBuffer
      const rows = parseWorkbook(buffer)
      if (rows.length < 2) {
        result.value = {
          total: 0,
          validCount: 0,
          fatal: '文件仅含表头或为空，无数据行。',
          errors: [],
          warnings: [],
          records: []
        }
      } else {
        const headerMap: Record<string, number> = {}
        rows[0].forEach((h, idx) => {
          const key = normalizeHeader(h)
          if (key && headerMap[key] === undefined) {headerMap[key] = idx}
        })
        progress.value = 80
        result.value = validate(headerMap, rows.slice(1))
        Message.info(
          `已解析 ${result.value.total} 行：通过 ${result.value.validCount} 条，失败 ${result.value.errors.length} 条，警告 ${result.value.warnings.length} 条`
        )
      }
    } catch {
      // U-E4:上传中断,保留原有数据不变
      result.value = {
        total: 0,
        validCount: 0,
        fatal: '文件读取中断或内容无法解析，原有数据保持不变，请重新上传（U-E4）。',
        errors: [],
        warnings: [],
        records: []
      }
    } finally {
      progress.value = 100
      uploading.value = false
    }
  }
  reader.onerror = () => {
    // U-E4
    uploading.value = false
    result.value = {
      total: 0,
      validCount: 0,
      fatal: '文件读取失败，原有数据保持不变，请重新上传（U-E4）。',
      errors: [],
      warnings: [],
      records: []
    }
  }
  reader.readAsArrayBuffer(raw)
}

/** 清除本次解析结果 */
function resetResult(): void {
  result.value = null
  CODE_SET_FIRST_ROW.clear()
}

/**
 * 弹窗可见性变化。
 *
 * @param v 是否可见
 */
function handleVisibleChange(v: boolean): void {
  emit('update:visible', v)
  if (!v) {
    result.value = null
    CODE_SET_FIRST_ROW.clear()
  }
}

/** 确认导入(U2 全量覆盖 + U3 反馈) */
function handleConfirm(): void {
  const r = result.value
  if (!r || blocked.value) {return}

  if (props.type === 'standards') {StandardStore.replaceAllStandards(r.records as Standard[])}
  else if (props.type === 'domains') {DomainStore.replaceAll(r.records as StandardDomain[])}
  else {StdCodeStore.replaceAll(r.records as StdCodeRow[])}

  Message.success(
    `${moduleLabel.value}已全量覆盖：成功 ${r.validCount} 条` +
      (r.warnings.length ? `，其中 ${r.warnings.length} 条带核对提示` : '')
  )
  emit('success', { type: props.type, count: r.validCount })
  emit('update:visible', false)
  result.value = null
  CODE_SET_FIRST_ROW.clear()
}

/** 关闭弹窗 */
function handleClose(): void {
  emit('update:visible', false)
  result.value = null
  CODE_SET_FIRST_ROW.clear()
}

/**
 * 下载 Excel 模板(U1:模板列 = 展示字段,含「填写说明」页签)。
 */
function downloadTemplate(): void {
  const cfg = moduleConfig.value
  const aoa = [cfg.columns, ...cfg.sample]
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  ws['!cols'] = cfg.columns.map(() => ({ wch: 22 }))
  const guide = XLSX.utils.aoa_to_sheet([['填写说明'], ...cfg.guide.map(g => [g])])
  guide['!cols'] = [{ wch: 100 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '数据导入')
  XLSX.utils.book_append_sheet(wb, guide, '填写说明')

  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([out], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
  saveAs(blob, `${cfg.label}导入模板.xlsx`)
  Message.success(`已下载${cfg.label}模板（${cfg.columns.length} 列，唯一键：${cfg.keyLabel}）`)
}
</script>
