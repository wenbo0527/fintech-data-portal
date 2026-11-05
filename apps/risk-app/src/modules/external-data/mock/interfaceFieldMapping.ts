/**
 * 分产品「API 接口字段 ↔ 标准落库字段」映射 · Mock 数据源
 *
 * 数据来源与口径说明：
 *   1. 左列接口字段取自**产品出参**（mock/archiveProducts.resolveOutputParams）：档案上人工维护过的出参优先，
 *      未维护时回落到 mock/supplierProducts.ts 的 externalDataFieldsMap（接口字段字典），
 *      按产品编码 productCode（与档案主键同一口径）分产品维护，需求文档 R53；
 *   2. 右列标准字段与标准字段说明取自 mock/stdTableSchema.ts（落库标准底表的列级元数据，
 *      说明即底表 DDL comment），本模块不再自行维护标准字段说明；
 *   3. 映射只保留两件事：接口字段名、标准落库字段（接口侧含义已由字段名与档案出参交代，不再单独维护）；
 *      撞不上底表列的接口字段走非标准化透传（extraParam），不含类型与字典转化；
 *   4. **分层继承**：本文件保存的是「产品级默认映射」（档案落库字段映射页签维护），
 *      回溯落库向导按批次继承这一份默认值，只对未命中的字段做自动碰撞，向导内的就地调整作为
 *      批次差异（inheritMappingForBatch / diffMappingFromProduct）；批次落库成功后再把结论回写产品级
 *      默认映射（commitBatchMappingToProduct），下一批就能继承到最新口径（需求文档 R58/R64）；
 *   5. 字段名→标准字段的碰撞字典全模块只有 AUTO_MATCH_DICT 一份，回溯向导不再自带一份；
 *   6. 项目无后端，保存仅落在模块内存 store，页面刷新后回到种子数据。
 */
import { loadArchiveProducts, resolveOutputParams } from './archiveProducts'
import { NON_STD_FIELD } from './stdFieldLibrary'
import { markMappingConfigured } from './mappingConfiguredFlags'
import { getStdTableColumns, getStdTableColumnComment, isStdTableColumn, EXTRA_PARAM_COLUMN } from './stdTableSchema'

/** 透传占位符沿用落库标准库定义，此处再导出一次，供 API 层与面板统一从本模块取用 */
export { NON_STD_FIELD }

/**
 * 按产品编码取接口出参字段名（映射左列的唯一生成源）
 * 走产品主数据解析器，保证与档案详情页「产品出参」页签看到的是同一份数据。
 */
export function apiFieldsOf(productCode: string): string[] {
  const product = loadArchiveProducts().find((p) => String(p.id) === String(productCode))
  return resolveOutputParams(product).map((f) => f.name)
}

/** 单行映射记录：接口字段 → 标准落库字段 */
export interface InterfaceFieldMappingRow {
  /** API 接口出参字段名 */
  apiField: string
  /** 标准落库字段名（底表列名）；空表示待匹配，NON_STD_FIELD 表示非标准化透传 */
  stdField: string
}

/** 分产品映射集合 */
export interface ProductFieldMapping {
  productCode: string
  productName: string
  supplier: string
  /** 落库目标表（仅展示用，映射行都写入该表） */
  targetTable: string
  rows: InterfaceFieldMappingRow[]
  /** 最近一次上传的映射表文件名 */
  sourceFileName: string
  /** 最近一次保存时间 */
  savedAt: string
}

/** 落库服务要求绑定的主键标识列 */
export const KEY_STD_FIELD = 'cert_no'

/** 非标准化透传选项文案（下拉宽度有限，完整说明由「标准字段说明」列带出） */
export const NON_STD_FIELD_LABEL = '非标准化字段（透传 extraParam）'

/** 标准字段候选：字段名 + 底表 comment，供右列下拉与说明展示 */
export function getStdFieldCandidates() {
  return getStdTableColumns().map((c) => ({ field: c.column, comment: c.comment, group: c.group, required: c.required }))
}

/** 按标准字段名取底表字段注释，透传占位符给出固定说明 */
export function getStdFieldComment(field: string): string {
  if (!field) {return '—'}
  if (field === NON_STD_FIELD) {return `非标准化字段：原样透传写入 ${EXTRA_PARAM_COLUMN} 列`}
  return getStdTableColumnComment(field)
}

/** 非标准化透传的多种写法归一（映射表里可能写「非标准化」「extraParam」等） */
const PASSTHROUGH_ALIAS = [NON_STD_FIELD, 'extraParam', '非标准化', '非标准化字段', '原样透传', 'passthrough', '-']

/** 接口字段名 → 标准字段的语义碰撞字典（全模块唯一一份，回溯向导与映射表解析都调 autoMatchStdField） */
const AUTO_MATCH_DICT: Record<string, string> = {
  id_no: 'cert_no',
  id_card: 'cert_no',
  idcard: 'cert_no',
  cert_id: 'cert_no',
  id_md5: 'cert_no',
  phone: 'mobile',
  mobile_md5: 'mobile',
  phone_md5: 'mobile',
  review_date: 'create_time',
  review_data: 'create_time',
  query_date: 'create_time',
  verify_date: 'create_time',
  apply_date: 'create_time',
  credit_score: 'std_credit_score',
  score: 'std_credit_score',
  risk_score: 'std_risk_score_v3',
  risk_level: 'std_risk_level_code',
  risk_band: 'std_risk_level_code',
  credit_query_cnt_6m: 'std_credit_query_cnt_6m',
  inst_cnt_1m: 'std_apply_inst_cnt_1m',
  overdue_cnt_24m: 'std_overdue_cnt_24m',
  account_open_months: 'std_account_open_months',
  loan_cnt_1m: 'std_loan_cnt_1m',
  loan_cnt_3m: 'std_loan_cnt_3m',
  loan_cnt_12m: 'std_loan_cnt_12m',
  max_overdue_amt: 'std_overdue_amt_max',
  overdue_days_max: 'std_overdue_days_max',
  card_cnt: 'std_card_cnt',
  limit_amt_total: 'std_limit_amt_total',
}

/**
 * 接口字段名自动碰撞标准字段
 * 优先字段名精确同名 → 语义字典 → 命名规则（密文/日期），全部不中返回空串
 */
export function autoMatchStdField(apiField: string): string {
  const name = String(apiField || '').trim().toLowerCase()
  if (!name) {return ''}
  if (isStdTableColumn(name)) {return name}
  if (AUTO_MATCH_DICT[name]) {return AUTO_MATCH_DICT[name]}
  const isPhone = /phone|mobile|tel/.test(name)
  const isDigest = /md5|hash|sm4|enc/.test(name)
  if (isPhone && isDigest) {return 'mobile'}
  if (isDigest && !isPhone) {return 'cert_no'}
  return /date|time/.test(name) ? 'create_time' : ''
}

/** 归一映射表里的标准字段写法：命中底表列返回列名，透传写法返回占位符，其余返回空串 */
export function normalizeStdField(value: string): string {
  const v = String(value || '').trim()
  if (!v) {return ''}
  if (PASSTHROUGH_ALIAS.includes(v) || PASSTHROUGH_ALIAS.includes(v.toLowerCase())) {return NON_STD_FIELD}
  if (isStdTableColumn(v)) {return v}
  return ''
}

/* --------------------------------------------------------------------------
 * CSV 模板与解析
 * -------------------------------------------------------------------------- */

/** 映射表表头（中英双语，解析时两种写法都认） */
export const MAPPING_CSV_HEADER = [
  '产品编码(product_code)',
  '接口字段名(api_field)',
  '标准落库字段(std_field)',
]

/** 表头列识别规则，按特异性排序，先命中的规则先占列 */
type MappingColumnKey = 'productCode' | 'apiFieldComment' | 'apiField' | 'stdField'

const COLUMN_RULES: Array<{ key: MappingColumnKey; re: RegExp }> = [
  { key: 'productCode', re: /product_?code|产品编码/i },
  // 接口字段说明已从映射中移除，但仍识别该列：旧模板里它排在字段名之前时会被 apiField 规则误认
  { key: 'apiFieldComment', re: /api_?field_?(comment|desc)|接口字段说明|字段说明|字段注释/i },
  { key: 'stdField', re: /std_?field|标准字段|标准落库字段|落库字段/i },
  { key: 'apiField', re: /api_?field|接口字段|出参字段|字段名/i },
]

/** 按分隔符切分一行 CSV，支持双引号包裹与转义引号 */
function splitCsvLine(line: string): string[] {
  const cells: string[] = []
  let cur = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++ } else if (ch === '"') { quoted = false } else { cur += ch }
    } else if (ch === '"') { quoted = true } else if (ch === ',') { cells.push(cur); cur = '' } else { cur += ch }
  }
  cells.push(cur)
  return cells.map((c) => c.trim())
}

/** CSV 解析结果 */
export interface MappingParseResult {
  rows: InterfaceFieldMappingRow[]
  /** 因不属于本产品而跳过的行数（分产品上传场景） */
  skippedOtherProduct: number
  /** 标准字段不在落库底表、已降级为透传的行（接口字段→原写法） */
  unknownStdFields: string[]
  /** 接口字段名为空被忽略的行数 */
  ignoredRows: number
  /** 右列留空但被自动碰撞命中的行数 */
  autoMatched: number
  /** 解析失败原因 */
  error?: string
}

/** 识别表头列位：同一列只能被一个语义占用，因此规则按特异性排序 */
function detectColumns(header: string[]): Partial<Record<MappingColumnKey, number>> {
  const claimed = new Set<number>()
  const colIndex: Partial<Record<MappingColumnKey, number>> = {}
  for (const rule of COLUMN_RULES) {
    const idx = header.findIndex((h, i) => !claimed.has(i) && rule.re.test(h))
    if (idx < 0) {
      continue
    }
    colIndex[rule.key] = idx
    claimed.add(idx)
  }
  return colIndex
}

/** 按列位取单元格值，列未识别时返回空串 */
function cellOf(cells: string[], colIndex: Partial<Record<MappingColumnKey, number>>, key: MappingColumnKey): string {
  const i = colIndex[key]
  return typeof i === 'number' ? cells[i] ?? '' : ''
}

/**
 * 定一行映射的右列结论
 * 表内已写且命中底表列 → 直接用；写了但底表没有该列 → 降级透传并记入 unknown；
 * 未写 → 先按字段名自动碰撞，仍不中则留待匹配
 */
function resolveRowStd(apiField: string, rawStd: string, ctx: { unknown: string[]; auto: number }): string {
  const stdField = normalizeStdField(rawStd)
  if (stdField) {return stdField}
  if (rawStd) {
    ctx.unknown.push(`${apiField}→${rawStd}`)
    return NON_STD_FIELD
  }
  const auto = autoMatchStdField(apiField)
  if (auto) {ctx.auto++}
  return auto
}

/**
 * 解析映射表 CSV
 * @param text 文件文本内容
 * @param productCode 当前产品编码；表内带产品编码列时只取本产品的行（分产品拆分）
 */
export function parseMappingCsv(text: string, productCode = ''): MappingParseResult {
  const empty: MappingParseResult = { rows: [], skippedOtherProduct: 0, unknownStdFields: [], ignoredRows: 0, autoMatched: 0 }
  const content = String(text || '').replace(/^\uFEFF/, '')
  const lines = content.split(/\r?\n/).filter((l) => l.trim() && !l.trim().startsWith('#'))
  if (lines.length === 0) {
    return { ...empty, error: '文件内容为空' }
  }

  const colIndex = detectColumns(splitCsvLine(lines[0]))
  if (typeof colIndex.apiField !== 'number' || typeof colIndex.stdField !== 'number') {
    return { ...empty, error: '未识别到「接口字段名(api_field)」或「标准落库字段(std_field)」列，请使用模板表头' }
  }

  const rows: InterfaceFieldMappingRow[] = []
  const ctx = { unknown: [] as string[], auto: 0 }
  let skippedOtherProduct = 0
  let ignoredRows = 0
  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line)
    const apiField = cellOf(cells, colIndex, 'apiField')
    if (!apiField) {
      ignoredRows++
      continue
    }
    // 分产品：映射表可含多产品，仅保留本产品的行
    const rowProduct = cellOf(cells, colIndex, 'productCode')
    if (typeof colIndex.productCode === 'number' && productCode && rowProduct && rowProduct.toUpperCase() !== productCode.toUpperCase()) {
      skippedOtherProduct++
      continue
    }
    // apiFieldComment 列仅用于占列（见 COLUMN_RULES），值本身不再进入映射
    rows.push({ apiField, stdField: resolveRowStd(apiField, cellOf(cells, colIndex, 'stdField'), ctx) })
  }
  if (rows.length === 0) {
    return { ...empty, error: '未解析到本产品的有效映射行', skippedOtherProduct, ignoredRows }
  }
  return { rows, skippedOtherProduct, unknownStdFields: ctx.unknown, ignoredRows, autoMatched: ctx.auto }
}

/**
 * 生成产品映射表模板 CSV
 * 默认用档案已有的接口出参字段预填左列，右列留空待用户填写
 */
export function buildTemplateCsv(productCode: string): string {
  const fieldNames = apiFieldsOf(productCode)
  const body = fieldNames.length
    ? fieldNames.map((name) => [productCode, name, ''].join(','))
    : [
        [productCode, 'id_no', 'cert_no'].join(','),
        [productCode, 'mobile', ''].join(','),
        [productCode, 'query_date', 'create_time'].join(','),
        [productCode, 'ext_score_v3', ''].join(','),
      ]
  return ['\uFEFF' + MAPPING_CSV_HEADER.join(','), ...body].join('\n')
}

/* --------------------------------------------------------------------------
 * 映射校验：服务于「落库服务能否按此匹配写入标准表」
 * -------------------------------------------------------------------------- */

export interface MappingValidation {
  total: number
  /** 待匹配（标准字段为空）的接口字段 */
  pendingFields: string[]
  /** 接口字段名为空的行下标 */
  emptyApiFieldIndexes: number[]
  /** 同一标准字段被多个接口字段绑定 */
  duplicateGroups: Array<{ std: string; fields: string[] }>
  /** 主键标识字段是否已绑定 */
  keyFieldBound: boolean
  /** 阻断保存的问题 */
  errors: string[]
  /** 不阻断但需提醒的问题 */
  warnings: string[]
  canSave: boolean
}

/** 校验映射完整性与冲突 */
export function validateMapping(rows: InterfaceFieldMappingRow[]): MappingValidation {
  const pendingFields = rows.filter((r) => String(r.apiField || '').trim() && !r.stdField).map((r) => r.apiField)
  const emptyApiFieldIndexes = rows.map((r, i) => ({ r, i })).filter((x) => !String(x.r.apiField || '').trim()).map((x) => x.i + 1)
  const stdMap: Record<string, string[]> = {}
  rows.forEach((r) => {
    if (!r.stdField || r.stdField === NON_STD_FIELD) {
      return
    }
    (stdMap[r.stdField] ||= []).push(r.apiField || '（空字段名）')
  })
  const duplicateGroups = Object.entries(stdMap)
    .filter(([, fs]) => fs.length > 1)
    .map(([std, fields]) => ({ std, fields }))

  const errors: string[] = []
  const warnings: string[] = []
  if (rows.length === 0) {
    errors.push('映射表为空，请上传映射表或从档案接口出参生成')
  }
  if (emptyApiFieldIndexes.length) {
    errors.push(`第 ${emptyApiFieldIndexes.join('、')} 行接口字段名为空`)
  }
  if (pendingFields.length) {
    errors.push(`接口字段 ${pendingFields.join('、')} 尚未匹配标准落库字段`)
  }
  if (duplicateGroups.length) {
    errors.push(`标准字段重复绑定：${duplicateGroups.map((g) => `${g.std} ← ${g.fields.join('、')}`).join('；')}`)
  }
  const keyFieldBound = rows.some((r) => r.stdField === KEY_STD_FIELD)
  if (rows.length && !keyFieldBound) {
    warnings.push(`未绑定主键标识字段 ${KEY_STD_FIELD}，落库服务将无法按主体匹配写入`)
  }

  return {
    total: rows.length,
    pendingFields,
    emptyApiFieldIndexes,
    duplicateGroups,
    keyFieldBound,
    errors,
    warnings,
    canSave: errors.length === 0,
  }
}

/* --------------------------------------------------------------------------
 * 内存 store（分产品）
 * -------------------------------------------------------------------------- */

const row = (apiField: string, stdField = ''): InterfaceFieldMappingRow => ({ apiField, stdField })

/**
 * 种子只维护「映射行 + 映射表文件信息」：产品名/供应商/落库目标表都是档案主数据，
 * 由 archiveMappingMeta 在装载时派生，不重复维护第二份（避免改了档案后两处漂移）。
 *
 * 覆盖范围只给**有落库环节**的产品（离线批量调用 / 外数离线回溯申请）：
 * 在线实时调用没有落库，不存在「产品级默认落库映射」。行均源于档案出参（apiFieldsOf），
 * 底表没有语义对应列的字段（request_id/name/device_id/经纬度等）按 R61 原样透传，不强行贴列。
 */
const seeds: Array<Pick<ProductFieldMapping, 'productCode' | 'rows' | 'sourceFileName' | 'savedAt'>> = [
  {
    productCode: 'XUEXIN_BATCH_STATUS',
    sourceFileName: 'XUEXIN_BATCH_STATUS_接口字段映射_v1.csv',
    savedAt: '2026-08-12T10:24:31.000Z',
    rows: [
      row('id_no', 'cert_no'),
      row('request_id', NON_STD_FIELD),
      row('name', NON_STD_FIELD),
    ],
  },
  {
    productCode: 'BH_CREDIT_QUERY',
    sourceFileName: 'BH_CREDIT_QUERY_落库映射.csv',
    savedAt: '2026-07-28T06:12:04.000Z',
    rows: [
      row('id_no', 'cert_no'),
      row('mobile', 'mobile'),
      row('name', NON_STD_FIELD),
      row('request_id', NON_STD_FIELD),
    ],
  },
  {
    productCode: 'BH_MULTI_QUERY',
    sourceFileName: 'BH_MULTI_QUERY_落库映射.csv',
    savedAt: '2026-09-06T03:40:12.000Z',
    rows: [
      row('id_no', 'cert_no'),
      row('mobile', 'mobile'),
      row('name', NON_STD_FIELD),
      row('request_id', NON_STD_FIELD),
    ],
  },
  {
    productCode: 'BH_BLACKLIST_CHECK',
    sourceFileName: '',
    savedAt: '2026-09-18T08:05:00.000Z',
    rows: [
      row('id_no', 'cert_no'),
      row('name', NON_STD_FIELD),
      row('request_id', NON_STD_FIELD),
    ],
  },
  {
    productCode: 'PD_LOCATION_RISK',
    sourceFileName: 'PD_LOCATION_RISK_落库映射.csv',
    savedAt: '2026-09-22T02:15:40.000Z',
    rows: [
      row('id_no', 'cert_no'),
      row('longitude', NON_STD_FIELD),
      row('latitude', NON_STD_FIELD),
      row('request_id', NON_STD_FIELD),
    ],
  },
  {
    productCode: 'PD_DEVICE_CLUSTER',
    sourceFileName: 'PD_DEVICE_CLUSTER_落库映射.csv',
    savedAt: '2026-05-11T07:30:00.000Z',
    rows: [
      row('id_no', 'cert_no'),
      row('device_id', NON_STD_FIELD),
      row('request_id', NON_STD_FIELD),
    ],
  },
  {
    /**
     * 上数金科「工商司法信息回溯」：回溯向导默认映射的示例样本（列最多）。
     * 底表没有涉诉类列，legal_case_cnt 按 R61 原样透传 extra_param，不强行贴到语义不同的标准列。
     */
    productCode: 'SHGJ_ENTERPRISE_JUDICIAL',
    sourceFileName: 'SHGJ_ENTERPRISE_JUDICIAL_回溯落库映射.csv',
    savedAt: '2026-10-18T09:20:00.000Z',
    rows: [
      row('id_md5', 'cert_no'),
      row('review_data', 'create_time'),
      row('enterprise_risk_score', 'std_risk_score_v3'),
      row('tax_arrear_flag', 'std_risk_level_code'),
      row('legal_case_cnt', NON_STD_FIELD),
    ],
  },
]

/** 「映射已配置」的判定：有行且每行都有落库结论（标准列或透传），与面板 canSave 同口径 */
function isMappingComplete(rows: InterfaceFieldMappingRow[]): boolean {
  return rows.length > 0 && rows.every((r) => !!r.apiField && !!r.stdField)
}

/** 分产品映射内存仓库（产品名/供应商/落库表从档案主数据派生） */
const mappingStore: Record<string, ProductFieldMapping> = {}
seeds.forEach((s) => {
  const entry: ProductFieldMapping = {
    ...archiveMappingMeta(s.productCode),
    ...s,
    rows: s.rows.map((r) => ({ ...r })),
  }
  mappingStore[s.productCode] = entry
  markMappingConfigured(s.productCode, isMappingComplete(entry.rows))
})

/** 默认落库目标表（与档案底表命名口径一致） */
export function defaultTargetTable(productCode: string): string {
  return `dwd_${String(productCode || 'external').toLowerCase()}_detail`
}

/** 按产品编码取映射，未保存过则返回空壳（行取自档案接口出参字段，全部待匹配） */
export async function getProductFieldMapping(productCode: string): Promise<ProductFieldMapping | null> {
  if (!productCode) {
    return null
  }
  const exist = mappingStore[productCode]
  if (exist) {
    return { ...exist, rows: exist.rows.map((r) => ({ ...r })) }
  }
  const fields = apiFieldsOf(productCode)
  return {
    productCode,
    productName: '',
    supplier: '',
    targetTable: defaultTargetTable(productCode),
    sourceFileName: '',
    savedAt: '',
    rows: fields.map((name) => row(name)),
  }
}

/** 保存分产品映射（覆盖式 upsert，返回落库后的快照） */
export async function upsertProductFieldMapping(payload: Partial<ProductFieldMapping> & { productCode: string }): Promise<ProductFieldMapping> {
  const prev = mappingStore[payload.productCode]
  const next: ProductFieldMapping = {
    productCode: payload.productCode,
    productName: payload.productName ?? prev?.productName ?? '',
    supplier: payload.supplier ?? prev?.supplier ?? '',
    targetTable: payload.targetTable || prev?.targetTable || defaultTargetTable(payload.productCode),
    rows: (payload.rows ?? []).map((r) => ({ ...r })),
    sourceFileName: payload.sourceFileName ?? prev?.sourceFileName ?? '',
    savedAt: new Date().toISOString(),
  }
  mappingStore[payload.productCode] = next
  // 保存即登记：档案列表的「映射已配置」不再由档案侧自己存一份，避免两处漂移
  markMappingConfigured(next.productCode, isMappingComplete(next.rows))
  return { ...next, rows: next.rows.map((r) => ({ ...r })) }
}

/**
 * 档案已有的接口出参字段名（左列生成源）
 * 与是否保存过映射无关，保证「按档案接口出参生成」结果稳定
 */
export function getArchiveApiFields(productCode: string): string[] {
  return apiFieldsOf(productCode)
}

/* --------------------------------------------------------------------------
 * 分层继承：产品级默认映射 ↔ 批次映射
 * 档案页签保存的是产品级默认值，回溯落库向导按批次继承，只存差异，
 * 批次落库成功后再把结论回写产品级默认，下一批能继承到最新口径。
 * -------------------------------------------------------------------------- */

/** 继承结果的结论来源：产品级默认映射 / 字段名自动碰撞 / 仍待人工匹配 */
export type MappingInheritSource = 'inherit' | 'auto' | 'pending'

/** 批次映射行：在产品映射行基础上多一个来源标记，供向导「匹配方式」列直接说清为何已定 */
export interface InheritedMappingRow extends InterfaceFieldMappingRow {
  inheritSource: MappingInheritSource
}

/** 从档案主数据取产品名/供应商/落库表，回写映射时不再由调用方各传一份 */
export function archiveMappingMeta(productCode: string): { productName: string; supplier: string; targetTable: string } {
  const product = loadArchiveProducts().find((p) => String(p.id) === String(productCode))
  return {
    productName: product?.name || '',
    supplier: product?.supplier || '',
    targetTable: product?.targetTable || defaultTargetTable(productCode),
  }
}

/** 产品级默认映射（档案「落库字段映射」页签保存的那一份），未保存过返回空数组 */
export function productMappingBaseline(productCode: string): InterfaceFieldMappingRow[] {
  const saved = mappingStore[productCode]
  return saved ? saved.rows.filter((r) => !!r.apiField).map((r) => ({ ...r })) : []
}

/**
 * 批次字段清单继承产品级默认映射
 * 同名字段直接沿用档案结论（标记 inherit），档案没覆盖的字段走自动碰撞，仍不中的留待人工
 */
export function inheritMappingForBatch(productCode: string, apiFields: string[]): InheritedMappingRow[] {
  const baseline = new Map(productMappingBaseline(productCode).map((r) => [r.apiField, r.stdField]))
  return apiFields.filter(Boolean).map((apiField) => {
    if (baseline.has(apiField)) {
      return { apiField, stdField: baseline.get(apiField) || '', inheritSource: 'inherit' as MappingInheritSource }
    }
    const auto = autoMatchStdField(apiField)
    return { apiField, stdField: auto, inheritSource: (auto ? 'auto' : 'pending') as MappingInheritSource }
  })
}

/** 相对产品级默认的差量：只含改过结论或新增的字段（批次只存差异，不复制整份默认映射） */
export function diffMappingFromProduct(productCode: string, rows: InterfaceFieldMappingRow[]): InterfaceFieldMappingRow[] {
  const baseline = new Map(productMappingBaseline(productCode).map((r) => [r.apiField, r.stdField]))
  return rows
    .filter((r) => !!r.apiField)
    .filter((r) => baseline.get(r.apiField) !== r.stdField)
    .map((r) => ({ ...r }))
}

/**
 * 批次落库成功后把结论回写为产品级默认映射
 * 同名字段以批次结论为准，批次没带的历史字段保留；产品名/供应商/目标表一律取档案主数据
 */
export async function commitBatchMappingToProduct(productCode: string, rows: InterfaceFieldMappingRow[], batchId: string): Promise<ProductFieldMapping> {
  const merged = new Map(productMappingBaseline(productCode).map((r) => [r.apiField, r.stdField]))
  rows.filter((r) => !!r.apiField).forEach((r) => merged.set(r.apiField, r.stdField))
  const meta = archiveMappingMeta(productCode)
  return upsertProductFieldMapping({
    productCode,
    productName: meta.productName,
    supplier: meta.supplier,
    targetTable: meta.targetTable,
    sourceFileName: `落库批次 ${batchId} 回写`,
    rows: [...merged].map(([apiField, stdField]) => ({ apiField, stdField })),
  })
}
