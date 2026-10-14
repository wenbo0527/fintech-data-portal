import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { MappingTreeNode } from '@/types/metadataMap'
import { getMappingTree, getRelatedMetrics } from '@/api/metadataMap'

export const useMetadataMapStore = defineStore('metadataMap', () => {
  const tree = ref<MappingTreeNode[]>([])
  const loading = ref(false)

  async function fetchTree() {
    loading.value = true
    tree.value = await getMappingTree()
    loading.value = false
  }

  async function fetchRelatedMetrics(tableName: string) {
    return await getRelatedMetrics(tableName)
  }

  return { tree, loading, fetchTree, fetchRelatedMetrics }
})
