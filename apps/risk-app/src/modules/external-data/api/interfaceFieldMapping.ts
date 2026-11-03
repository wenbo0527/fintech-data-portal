import {
  getProductFieldMapping,
  upsertProductFieldMapping,
  getStdFieldCandidates,
  getStdFieldComment,
  getArchiveApiFields,
  buildTemplateCsv,
  parseMappingCsv,
  validateMapping,
  autoMatchStdField,
  productMappingBaseline,
  inheritMappingForBatch,
  diffMappingFromProduct,
  commitBatchMappingToProduct,
  NON_STD_FIELD,
  NON_STD_FIELD_LABEL,
  type ProductFieldMapping,
  type InterfaceFieldMappingRow,
  type InheritedMappingRow,
  type MappingParseResult,
  type MappingValidation,
} from '../mock/interfaceFieldMapping'

/**
 * 分产品「API 接口字段 ↔ 标准落库字段」映射 API 层
 * 项目无后端服务，VITE_USE_MOCK=true 时直接短路到 mock 数据源。
 */
const useMock = import.meta.env.VITE_USE_MOCK === 'true'

export type { ProductFieldMapping, InterfaceFieldMappingRow, InheritedMappingRow, MappingParseResult, MappingValidation }
export { autoMatchStdField, NON_STD_FIELD, NON_STD_FIELD_LABEL }
// 分层继承的三个纯函数：产品级默认映射、批次继承结果、批次差量
// 同一内存仓库的同步读，无 IO，向导与页签都直接调用，保证两处看到的是同一份默认值
export { productMappingBaseline, inheritMappingForBatch, diffMappingFromProduct }

/** 取本产品映射（无保存记录时返回以待匹配的空壳） */
export async function fetchProductFieldMapping(productCode: string): Promise<ProductFieldMapping | null> {
  if (useMock) {return getProductFieldMapping(productCode)}
  return null
}

/** 保存本产品映射（覆盖式） */
export async function saveProductFieldMapping(payload: Partial<ProductFieldMapping> & { productCode: string }): Promise<ProductFieldMapping> {
  if (useMock) {return upsertProductFieldMapping(payload)}
  throw new Error('未接入后端服务，无法保存字段映射')
}

/** 标准落库字段候选（字段名 + 底表 comment，供右列下拉与说明展示） */
export async function fetchStdFieldCandidates() {
  if (useMock) {return getStdFieldCandidates()}
  return []
}

/** 按标准字段名取落库底表的字段注释 */
export function stdFieldComment(field: string): string {
  return getStdFieldComment(field)
}

/** 档案接口出参字段（「按档案接口出参生成」的左列数据源） */
export function fetchArchiveApiFields(productCode: string) {
  if (useMock) {return getArchiveApiFields(productCode)}
  return []
}

/** 下载用模板 CSV */
export function buildMappingTemplate(productCode: string): string {
  return buildTemplateCsv(productCode)
}

/** 解析上传的映射表 CSV */
export function parseMappingText(text: string, productCode: string): MappingParseResult {
  return parseMappingCsv(text, productCode)
}

/** 校验映射（落库服务能否按此匹配写入标准表） */
export function validateProductMapping(rows: InterfaceFieldMappingRow[]): MappingValidation {
  return validateMapping(rows)
}

/**
 * 批次落库成功后把本次结论回写为产品级默认映射
 * owner 仍是映射模块（与档案页保存同一个仓库），档案侧只读不写；
 * 产品名/供应商/落库表由 mock 从档案主数据取，调用方不再传一份
 */
export async function commitPersistBatchMapping(productCode: string, rows: InterfaceFieldMappingRow[], batchId: string): Promise<ProductFieldMapping | null> {
  if (useMock) {return commitBatchMappingToProduct(productCode, rows, batchId)}
  throw new Error('未接入后端服务，无法回写落库映射')
}
