/**
 * ============================================================
 * classify-store —— 字段分级分类的运行时唯一事实源
 * ============================================================
 * 为什么需要它（2026-11 分级变更审批需求）：
 *  1. classify-modules.ts 的导出是模块级普通数组，页面直读 → 写入不可响应、
 *     刷新即丢，无法承载「审批通过后落地生效」；
 *  2. 覆盖率此前是表上硬编码的 80/75/60，与字段实况脱节（classify-tasks 页
 *     「待分级字段数」恒为 0）。本 store 统一按字段派生：
 *        已定级 = sensitivity_level !== ''
 *        coverage = 已定级字段数 / 总字段数
 *        待分级表 = coverage < 100
 *
 * 范式与 table-catalog-store / permission-store 一致：模块级 ref + localStorage
 * 持久化 + 对象式 Store 导出；数据变更只能由 ClassifyChangeStore 审批通过后
 * 调 applyApprovedChange() 触发，页面不得直接改本 store 的数据。
 *
 * 依赖方向：classify-change-store → classify-store（单向，无环）。
 * 「本表是否有在途变更单」属变更侧信息，由 ClassifyChangeStore.changeStateOf() 提供，
 * 页面组合使用，避免此处反向依赖。
 * ============================================================
 */
import { ref, computed } from 'vue'
import { classifySystemsData, deriveCoverage } from './classify-modules'
import type {
  ClassifyField,
  ClassifySystem,
  ClassifyTable,
  SensitivityLevel,
  Grade,
  BusinessBelonging
} from './classify-types'
import { appendClassifyHistory, resetClassifyHistory } from './classify-edit-history'
import { dimValueText, CLASSIFY_DIMS } from './classify-constants'

const LS_KEY = 'dca-classify-data-v1'
const LEVELS: SensitivityLevel[] = ['L1', 'L2', 'L3', 'L4']

/** 表视图：派生覆盖率与待分级字段数 */
export interface ClassifyTableView extends ClassifyTable {
  coverage: number
  pendingFields: number
  classifiedFields: number
}

/** 数据源视图：tableCount / fieldCount / distribution 全部派生 */
export interface ClassifySystemView extends Omit<ClassifySystem, 'tables' | 'tableCount' | 'fieldCount' | 'distribution'> {
  tables: ClassifyTableView[]
  tableCount: number
  fieldCount: number
  classifiedFieldCount: number
  pendingTableCount: number
  distribution: Record<SensitivityLevel, number>
}

export interface ClassifyStats {
  total: number
  classified: number
  pending: number
  avgCoverage: number
  pendingFieldTotal: number
  classifiedFieldTotal: number
}

function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T
}

function seed(): ClassifySystem[] {
  return deepClone(classifySystemsData)
}

function load(): ClassifySystem[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length) return parsed as ClassifySystem[]
    }
  } catch { /* 脏数据回落种子 */ }
  return seed()
}

const base = ref<ClassifySystem[]>(load())

function persist() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(base.value))
  } catch { /* 配额忽略 */ }
}

function toTableView(t: ClassifyTable): ClassifyTableView {
  const coverage = deriveCoverage(t)
  const pendingFields = t.fields.filter(f => f.sensitivity_level === '').length
  return { ...t, coverage, pendingFields, classifiedFields: t.fields.length - pendingFields }
}

/** L1–L4 分布派生（未定级字段不计入），系统视图与按权限裁剪后的卡片共用同一份 */
function distributionOf(tables: ClassifyTableView[]): Record<SensitivityLevel, number> {
  return LEVELS.reduce((acc, lv) => {
    acc[lv] = tables.reduce((s, t) => s + t.fields.filter(f => f.sensitivity_level === lv).length, 0)
    return acc
  }, { L1: 0, L2: 0, L3: 0, L4: 0 } as Record<SensitivityLevel, number>)
}

const systemViews = computed<ClassifySystemView[]>(() =>
  base.value.map(sys => {
    const tables = sys.tables.map(toTableView)
    const fieldCount = tables.reduce((s, t) => s + t.fields.length, 0)
    const classifiedFieldCount = tables.reduce((s, t) => s + t.classifiedFields, 0)
    const distribution = distributionOf(tables)
    return {
      ...sys,
      tables,
      fieldCount,
      classifiedFieldCount,
      // 卡片上仍显示"表数量"，与目录实际表数保持一致（此前为硬编码 4）
      tableCount: tables.length,
      pendingTableCount: tables.filter(t => t.coverage < 100).length,
      distribution
    }
  })
)

export const ClassifyStore = {
  /** 全量数据源视图（响应式） */
  systems(): ClassifySystemView[] {
    return systemViews.value
  },

  systemById(id: string): ClassifySystemView | undefined {
    return systemViews.value.find(s => s.id === id)
  },

  /** 某数据源下的全部表（未做权限裁剪，权限过滤在 visibleTables） */
  tablesOf(systemId: string): ClassifyTableView[] {
    return ClassifyStore.systemById(systemId)?.tables ?? []
  },

  tableOf(systemId: string, schema: string, tableName: string): ClassifyTableView | undefined {
    return ClassifyStore.tablesOf(systemId).find(t => t.schema === schema && t.table_name === tableName)
  },

  /** 跨数据源按 schema + 表名定位（变更单只留了 schema.table，回查兜底用） */
  findTable(schema: string, tableName: string): { system: ClassifySystemView; table: ClassifyTableView } | undefined {
    for (const sys of systemViews.value) {
      const table = sys.tables.find(t => t.schema === schema && t.table_name === tableName)
      if (table) return { system: sys, table }
    }
    return undefined
  },

  /**
   * 按数据权限档位裁剪表列表。
   * 注意：裁剪的是表（schema 白名单），字段级不裁剪 —— 分级明细对可见表始终全量展示，
   * 与 permission-store 的"字段级授权"是两件事，不要在这里加字段过滤。
   */
  filterTables(tables: ClassifyTableView[], schemas: 'all' | string[]): ClassifyTableView[] {
    if (schemas === 'all') return tables
    return tables.filter(t => schemas.includes(t.schema))
  },

  statsFor(tables: ClassifyTableView[]): ClassifyStats {
    const total = tables.length
    const coverages = tables.map(t => t.coverage)
    const avg = total === 0 ? 0 : Math.round((coverages.reduce((s, c) => s + c, 0) / total) * 10) / 10
    return {
      total,
      classified: coverages.filter(c => c === 100).length,
      pending: coverages.filter(c => c < 100).length,
      avgCoverage: avg,
      pendingFieldTotal: tables.reduce((s, t) => s + t.pendingFields, 0),
      classifiedFieldTotal: tables.reduce((s, t) => s + t.classifiedFields, 0)
    }
  },

  /**
   * 按给定表集合派生 L1–L4 分布（即模块内 distributionOf）。
   * 数据源卡片的「分级分布」必须和同卡片的可见表数/已定级字段数用同一口径，
   * 所以这里接收过滤后的 tables，不要直接用 ClassifySystemView.distribution（全量）。
   */
  distributionOf,

  /**
   * 审批通过后落地：把 diff 的 to 值写入字段，并补写编辑历史。
   * 由 ClassifyChangeStore 在 approved 分支调用，页面不要直接调。
   */
  applyApprovedChange(input: {
    systemId?: string
    schema: string
    tableName: string
    diffs: Array<{ field_name: string; from: Partial<ClassifyField>; to: Partial<ClassifyField> }>
    actor: string
  }): void {
    const sys = input.systemId
      ? base.value.find(s => s.id === input.systemId)
      : base.value.find(s => s.tables.some(t => t.schema === input.schema && t.table_name === input.tableName))
    if (!sys) return
    const table = sys.tables.find(t => t.schema === input.schema && t.table_name === input.tableName)
    if (!table) return

    const today = new Date().toISOString().slice(0, 10)
    const historyEntries: Array<{ schema: string; tableName: string; fieldName: string; dimKey: string; oldValue: string; newValue: string }> = []

    for (const diff of input.diffs) {
      const field = table.fields.find(f => f.field_name === diff.field_name)
      if (!field) continue
      for (const [key, nextVal] of Object.entries(diff.to)) {
        const dimKey = key as keyof ClassifyField
        // 只落分级维度：field_name / field_comment / updated_at 不进分级变更范围
        if (!CLASSIFY_DIMS.some(d => d.key === dimKey)) continue
        const prevVal = field[dimKey] as string | undefined
        if (prevVal === nextVal) continue
        historyEntries.push({
          schema: table.schema,
          tableName: table.table_name,
          fieldName: field.field_name,
          dimKey,
          oldValue: dimValueText(dimKey as string, prevVal),
          newValue: dimValueText(dimKey as string, nextVal as string | undefined)
        })
        // ClassifyField 各维度取值都是字符串联合类型，写入前由调用方（变更单）保证合法性
        Object.assign(field, { [dimKey]: nextVal })
      }
      field.updated_at = today
    }

    table.updated_at = today
    if (historyEntries.length) appendClassifyHistory(historyEntries, input.actor)
    persist()
  },

  /**
   * 为「批量上传分级分类」按待分级字段生成建议值（挡板：真实环境是算法推荐）。
   * 规则按字段名/注释关键词确定性推导，保证同一字段每次建议一致、可复核。
   */
  suggestClassification(systemId: string, schema: string, tableName: string): Array<Partial<ClassifyField> & { field_name: string }> {
    const table = ClassifyStore.tableOf(systemId, schema, tableName)
    if (!table) return []
    return table.fields.filter(f => f.sensitivity_level === '').map(f => suggestOf(f))
  },

  /** 重置演示数据（分级数据 + 编辑历史一起回种子，避免两边不一致） */
  resetDemo() {
    try { localStorage.removeItem(LS_KEY) } catch { /* ignore */ }
    base.value = seed()
    resetClassifyHistory()
    persist()
  }
}

/** 单字段建议值规则（关键词命中即定级，兜底 L2/一般） */
function suggestOf(f: ClassifyField): Partial<ClassifyField> & { field_name: string } {
  const text = `${f.field_name} ${f.field_comment}`
  const hit = (kw: string[]) => kw.some(k => text.includes(k))

  let level: SensitivityLevel = 'L2'
  let grade: Grade = '一般'
  let belonging: BusinessBelonging = '运营'
  let l1 = '业务交易'
  let l2 = '订单'

  if (hit(['身份证', '卡号', '手机号', '号码', '证件'])) {
    level = 'L4'; grade = '关键'; belonging = '零售'; l1 = '客户信息'; l2 = '个人PII'
  } else if (hit(['金额', '额度', '余额', '利率', '评分', '录音', '地址'])) {
    level = 'L3'; grade = '重要'; belonging = text.includes('金额') || text.includes('时长') || text.includes('录音') ? '财务' : '风控'; l1 = '业务交易'; l2 = '订单'
  } else if (hit(['时间', '日期', '周期'])) {
    level = 'L1'; grade = '一般'; belonging = '运营'; l1 = '业务交易'; l2 = '订单'
  } else if (hit(['结果', '类型', '状态', '编号', '设备'])) {
    level = 'L2'; grade = '一般'; belonging = text.includes('设备') ? '风控' : '运营'; l1 = '业务交易'; l2 = '订单'
  }

  const l3 = l1 === '客户信息' ? '联系方式' : '交易明细'
  const l4 = f.field_comment.replace(/[()（].*$/, '')
  return { field_name: f.field_name, business_belonging: belonging, grade, sensitivity_level: level, category_l1: l1, category_l2: l2, category_l3: l3, category_l4: l4 }
}

/** 派生响应式只读视图（页面 watch 用） */
export const classifySystems$ = systemViews
