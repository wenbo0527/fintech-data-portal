import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { BusinessStage, Term, StageTreeNode } from '@/types/knowledge'
import { getBusinessStages, getStageTree, getTerms, saveTermApi, deleteTermApi } from '@/api/knowledge'

export const useKnowledgeStore = defineStore('knowledge', () => {
  const stages = ref<BusinessStage[]>([])
  const stageTree = ref<StageTreeNode[]>([])
  const terms = ref<Term[]>([])
  const loading = ref(false)

  async function fetchStages() {
    loading.value = true
    stages.value = await getBusinessStages()
    loading.value = false
  }

  async function fetchStageTree() {
    loading.value = true
    stageTree.value = await getStageTree()
    loading.value = false
  }

  async function fetchTerms() {
    loading.value = true
    terms.value = await getTerms()
    loading.value = false
  }

  async function saveTerm(data: Partial<Term>) {
    const res = await saveTermApi(data)
    if (res.success) await fetchTerms()
    return res
  }

  async function removeTerm(id: string) {
    const res = await deleteTermApi(id)
    if (res.success) await fetchTerms()
    return res
  }

  return { stages, stageTree, terms, loading, fetchStages, fetchStageTree, fetchTerms, saveTerm, removeTerm }
})
