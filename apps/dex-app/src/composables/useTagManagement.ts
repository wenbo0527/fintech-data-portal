import { storeToRefs } from 'pinia'
import { useTagManagementStore } from '@/stores/tagSystem/tagManagement'
import type { TagItem } from '@/types/tag'

export const useTagManagement = () => {
  const store = useTagManagementStore()
  const { tags, loading, total } = storeToRefs(store)

  const fetchTags = (params?: any) => store.fetchTags(params)
  const createTag = (data: Partial<TagItem>) => store.createTag(data)
  const updateTag = (id: string, data: Partial<TagItem>) => store.updateTag(id, data)
  const deleteTags = (ids: string[]) => store.deleteTags(ids)

  return { tags, loading, total, fetchTags, createTag, updateTag, deleteTags }
}

