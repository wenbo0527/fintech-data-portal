import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { TagItem } from '@/types/tag'
import { listTags, createTag as apiCreateTag, updateTag as apiUpdateTag, deleteTags as apiDeleteTags } from '@/api/tag'

export const useTagManagementStore = defineStore('tagManagement', () => {
  const tags = ref<TagItem[]>([])
  const loading = ref(false)
  const total = ref(0)

  const fetchTags = async (params?: any) => {
    loading.value = true
    try {
      const res = await listTags(params)
      tags.value = res.list
      total.value = res.total
    } finally {
      loading.value = false
    }
  }

  const createTag = async (data: Partial<TagItem>) => {
    const created = await apiCreateTag(data)
    tags.value = [created, ...tags.value]
    total.value = tags.value.length
    return created
  }

  const updateTag = async (id: string, data: Partial<TagItem>) => {
    const ok = await apiUpdateTag(id, data)
    if (ok) {
      const idx = tags.value.findIndex(t => t.id === id)
      if (idx >= 0) tags.value[idx] = { ...tags.value[idx], ...data }
    }
    return ok
  }

  const deleteTags = async (ids: string[]) => {
    const ok = await apiDeleteTags(ids)
    if (ok) {
      tags.value = tags.value.filter(t => !ids.includes(t.id))
      total.value = tags.value.length
    }
    return ok
  }

  return { tags, loading, total, fetchTags, createTag, updateTag, deleteTags }
})

