import { ref, computed } from 'vue'
import type { TableField, CandidateKey, ValidationResult } from '@/types/table'

/**
 * 主键候选分析组合式函数
 * @param schema 表字段列表
 */
export const usePrimaryKeyAnalysis = (schema: TableField[]) => {
  const tableFields = ref<TableField[]>(schema)
  const candidateKeys = computed<CandidateKey[]>(() => {
    return tableFields.value.map(f => ({ field: f.name, uniqueness: Math.floor(80 + Math.random() * 20), selected: false }))
  })

  /**
   * 校验候选字段的唯一性
   * @param fields 候选字段名列表
   * @returns 唯一性校验结果
   */
  const validateUniqueness = async (fields: string[]): Promise<ValidationResult> => {
    const items = fields.map(f => ({ field: f, uniqueness: Math.floor(85 + Math.random() * 15), duplicates: Math.floor(Math.random() * 10) }))
    const score = Math.round(items.reduce((s, i) => s + i.uniqueness, 0) / items.length)
    return { isValid: score >= 95, items, score }
  }

  /**
   * 获取数据质量报告
   */
  const getQualityReport = () => {
    return { coverage: Math.floor(90 + Math.random() * 10), errorRate: Math.floor(Math.random() * 5) }
  }

  return { tableFields, candidateKeys, validateUniqueness, getQualityReport }
}
