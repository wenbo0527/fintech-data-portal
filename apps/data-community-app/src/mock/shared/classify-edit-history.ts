/**
 * F8 字段编辑历史
 * 按字段 ID（schema.table.field）维护历史记录
 *
 * 2026-11 改造：由只读常量数组改为响应式 + localStorage 持久化，
 * 分级变更审批单「审批通过落地」时通过 appendClassifyHistory() 写入，
 * 表详情页「编辑历史」Tab 立即可见（此前只能展示 3 条写死种子）。
 */
import { ref, watch } from 'vue'
import { dimLabel } from './classify-constants'

export interface ClassifyEditRecord {
  id: string
  field_key: string
  modified_at: string
  modified_by: string
  field_name: string
  old_value: string
  new_value: string
}

const SEED_HISTORY: ClassifyEditRecord[] = [
  { id: 'H001', field_key: 'crm_db.t_user_info.mobile', field_name: '敏感级别', modified_at: '2026-07-02 14:23', modified_by: '张三', old_value: 'L2', new_value: 'L3' },
  { id: 'H002', field_key: 'crm_db.t_user_info.id_card', field_name: '业务属于', modified_at: '2026-07-01 10:15', modified_by: '李四', old_value: '对公', new_value: '零售' },
  { id: 'H003', field_key: 'hive_dw.dwd_user_info.email', field_name: '四级业务目录', modified_at: '2026-06-28 16:40', modified_by: '王五', old_value: '邮箱地址', new_value: '邮箱' }
]

const LS_KEY = 'dca-classify-history-v1'

function load(): ClassifyEditRecord[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length) return parsed as ClassifyEditRecord[]
    }
  } catch { /* 脏数据忽略，回落种子 */ }
  return SEED_HISTORY.map(h => ({ ...h }))
}

export const classifyEditHistory = ref<ClassifyEditRecord[]>(load())

function persist() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(classifyEditHistory.value))
  } catch { /* 配额忽略 */ }
}

// 页面直接读 ref 即可保持同步；此处兜底覆盖手工调用 persist 之外的写入路径
watch(classifyEditHistory, persist, { deep: true })

let seq = classifyEditHistory.value.reduce((m, h) => {
  const n = Number(h.id.replace(/\D/g, ''))
  return Number.isFinite(n) ? Math.max(m, n) : m
}, 0)

function stamp(): string {
  return new Date().toISOString().slice(0, 16).replace('T', ' ')
}

/** 一条维度变更（由 ClassifyStore 落地审批通过的 diff 时构造） */
export interface ClassifyHistoryEntry {
  schema: string
  tableName: string
  fieldName: string
  /** 维度 key（business_belonging / grade / sensitivity_level / category_l1..l4） */
  dimKey: string
  oldValue: string
  newValue: string
}

/**
 * 批量追加编辑历史。
 * field_key 沿用 schema.table.field 语义，表详情页按前缀过滤即可命中；
 * field_name 存「维度显示名」而非字段名（沿用既有 3 条种子的列口径）。
 */
export function appendClassifyHistory(entries: ClassifyHistoryEntry[], actor: string): ClassifyEditRecord[] {
  const created = entries.map<ClassifyEditRecord>(e => {
    seq += 1
    return {
      id: 'H' + String(seq).padStart(3, '0'),
      field_key: `${e.schema}.${e.tableName}.${e.fieldName}`,
      // 与 3 条种子同口径：存维度显示名（如「敏感级别」），字段名在 field_key 末段，由页面拼接展示
      field_name: dimLabel(e.dimKey),
      modified_at: stamp(),
      modified_by: actor,
      old_value: e.oldValue,
      new_value: e.newValue
    }
  })
  if (created.length) {
    classifyEditHistory.value = [...created, ...classifyEditHistory.value]
    persist()
  }
  return created
}

/** 重置演示数据 */
export function resetClassifyHistory() {
  try { localStorage.removeItem(LS_KEY) } catch { /* ignore */ }
  classifyEditHistory.value = SEED_HISTORY.map(h => ({ ...h }))
  seq = 3
}
