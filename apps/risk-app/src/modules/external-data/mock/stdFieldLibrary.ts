/**
 * 落库标准字段库 · Mock 数据源
 * 需求文档《外数文件落库》B2（R30-R40）
 *
 * 数据来源说明：
 *   1. 字段名与字段说明**派生自 mock/stdTableSchema.ts**（落库标准底表的列级元数据），
 *      不再在本文件手写，避免标准字段说明与底表 DDL comment 漂移；
 *   2. 字段说明（comment）文档 R30 要求：命中标准字段时展示说明，
 *      未收录外数产品（R31）字段说明统一显示横杠「—」；
 *   3. 与 external-data/mock/supplierProducts.ts 的 externalDataFieldsMap 区分：
 *      前者是「外数底表出参字段字典」，本文件是「落库标准字段字典」，两者不可混用。
 */
import { getStdTableColumns, getStdTableColumnComment } from './stdTableSchema'

export { EXTRA_PARAM_COLUMN, isStdTableColumn } from './stdTableSchema'

export interface StdField {
  /** 标准库字段名（R40 写入标准表的列名） */
  field: string
  /** 字段说明（R30 命中标准字段时展示，来源为底表 DDL comment） */
  comment: string
  /** 字段分组，仅用于列表分组展示 */
  group: string
  /** 是否为强制绑定字段（R32：主体标识与回溯时间） */
  required: boolean
}

/** 落库标准字段库全集（由底表列元数据派生） */
export const stdFieldLibraryMock: StdField[] = getStdTableColumns().map((c) => ({
  field: c.column,
  comment: c.comment,
  group: c.group,
  required: c.required,
}))

/** 强制绑定字段（R32）：cert_no、create_time、mobile，均需从 CSV 表头中选择 */
export const REQUIRED_STD_FIELDS = ['cert_no', 'create_time', 'mobile']

/** 非标准化字段占位值（R34/R38）：选中后原样透传，序列化写入 extraParam 列 */
export const NON_STD_FIELD = '__non_standard__'

/** 标准库字段下拉选项（仅字段名） */
export function getStdFieldNames(): string[] {
  return stdFieldLibraryMock.map((f) => f.field)
}

/** 按字段名查询标准字段说明，未命中返回横杠「—」 */
export function getStdFieldComment(field: string): string {
  return getStdTableColumnComment(field)
}
