import type { Term } from '@/types/knowledge'
// 语义契约包：业务阶段 / 部门语境 / 术语字典的唯一事实源（本文件只做 re-export + 内存态 CRUD）
import {
  mockBusinessStages as contractBusinessStages,
  mockTerms as contractTerms,
  buildStageTree as contractBuildStageTree,
  stageMetricsOf as contractStageMetricsOf
} from '@data-community/semantic-contract'

/**
 * 业务阶段树数据（契约包同一数组实例，禁止复制或重新赋值）
 * 结构：业务阶段 → 部门语境（市场/风险/运营/公共）→ 指标
 */
export const mockBusinessStages = contractBusinessStages

/** 术语字典数据（契约包同一数组实例，禁止复制或重新赋值） */
export const mockTerms = contractTerms

/** 扁平化：取出阶段下全部语境（兼容按阶段汇总的场景） */
export const stageMetricsOf = contractStageMetricsOf

/** 构建业务阶段树（阶段 → 部门语境 → 指标，用于 a-tree 组件） */
export const buildStageTree = contractBuildStageTree

/** 内存态术语存储（支持CRUD） */
let termStore: Term[] = [...mockTerms]

export function saveTerm(data: Partial<Term>): { success: boolean; id?: string } {
  if (data.termId) {
    const idx = termStore.findIndex(t => t.termId === data.termId)
    if (idx >= 0) {
      termStore[idx] = { ...termStore[idx], ...data }
    }
    return { success: true }
  } else {
    const newTerm: Term = {
      termId: `term_${Date.now()}`,
      termName: data.termName || '新术语',
      definition: data.definition || '',
      category: data.category || '业务术语',
      relatedMetric: data.relatedMetric
    }
    termStore.push(newTerm)
    return { success: true, id: newTerm.termId }
  }
}

export function deleteTerm(id: string): { success: boolean } {
  termStore = termStore.filter(t => t.termId !== id)
  return { success: true }
}

export function getTermList(): Term[] {
  return [...termStore]
}
