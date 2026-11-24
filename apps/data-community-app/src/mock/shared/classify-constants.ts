/**
 * 数据分级分类 - 共享常量
 * 安全级别配色 + 枚举值 + 可变更维度元信息
 */
import type { SensitivityLevel, ClassifyLevelValue, ClassifyField } from './classify-types'

/** 安全级别配色（与 PRD 附录 A 一致） */
export const SENSITIVITY_COLORS: Record<SensitivityLevel, string> = {
  L1: 'green',
  L2: 'gold',
  L3: 'orange',
  L4: 'red'
}

/** 安全级别名称 */
export const SENSITIVITY_NAMES: Record<SensitivityLevel, string> = {
  L1: '公开',
  L2: '内部',
  L3: '秘密',
  L4: '机密'
}

/** 分级枚举 */
export const GRADE_OPTIONS = ['一般', '重要', '关键'] as const

/** 业务属于枚举 */
export const BELONGING_OPTIONS = ['零售', '对公', '风控', '运营', '财务'] as const

/** 模拟角色（用于 F8 权限提示） */
export const MOCK_ROLES = [
  { value: 'governance', label: '数据治理员（可编辑）' },
  { value: 'analyst', label: '数据分析师（只读）' }
]

/**
 * 可变更的分级维度（有序）。
 * 变更单 diff 计算、审批台展开行、编辑历史落库三处共用同一份，
 * 避免「哪些字段算变更」在页面里各写一遍。
 */
export const CLASSIFY_DIMS: Array<{ key: keyof ClassifyField; label: string }> = [
  { key: 'business_belonging', label: '业务属于' },
  { key: 'grade', label: '分级' },
  { key: 'sensitivity_level', label: '敏感级别' },
  { key: 'category_l1', label: '一级业务目录' },
  { key: 'category_l2', label: '二级业务目录' },
  { key: 'category_l3', label: '三级业务目录' },
  { key: 'category_l4', label: '四级业务目录' }
]

/** 维度显示名（未知 key 回退原 key，防止页面渲染空白） */
export function dimLabel(key: string): string {
  return CLASSIFY_DIMS.find(d => d.key === key)?.label ?? key
}

/** 空值占位：敏感级别用「待分级」，其余维度用「未填写」，与表格标签口径一致 */
export function dimValueText(key: string, value: string | undefined): string {
  if (value === undefined || value === '') {
    return key === 'sensitivity_level' ? '待分级' : '未填写'
  }
  if (key === 'sensitivity_level') return `${value} ${SENSITIVITY_NAMES[value as SensitivityLevel] ?? ''}`.trim()
  return value
}

/** 级别配色取值：未定级字段返回 gray，避免用 '' 索引配色表拿到 undefined */
export function levelTagColor(level: ClassifyLevelValue): string {
  return level === '' ? 'gray' : SENSITIVITY_COLORS[level]
}
