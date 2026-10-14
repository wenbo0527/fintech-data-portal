import { mockBusinessStages, buildStageTree, getTermList, saveTerm, deleteTerm } from '@/mock/knowledge'
import { mockDelay } from '@/utils/mockDelay'
import type { BusinessStage, Term, StageTreeNode } from '@/types/knowledge'

export function getBusinessStages(): Promise<BusinessStage[]> {
  return mockDelay(mockBusinessStages)
}

export function getStageTree(): Promise<StageTreeNode[]> {
  return mockDelay(buildStageTree(mockBusinessStages))
}

export function getTerms(): Promise<Term[]> {
  return mockDelay(getTermList())
}

export function saveTermApi(data: Partial<Term>): Promise<{ success: boolean; id?: string }> {
  return mockDelay(saveTerm(data))
}

export function deleteTermApi(id: string): Promise<{ success: boolean }> {
  return mockDelay(deleteTerm(id))
}
