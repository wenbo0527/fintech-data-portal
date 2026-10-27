import { defineStore } from 'pinia'
import { ref, computed, readonly } from 'vue'
import type { TagTable, CreateTagTableDTO, UpdateTagTableDTO, GetTagTablesParams } from '@/types/tag'
import { tagAPI } from '@/api/tag'
import { Message } from '@arco-design/web-vue'

export const useTagCenterStore = defineStore('tagCenter', () => {
  // 状态定义
  const tagTables = ref<TagTable[]>([])
  const loading = ref(false)
  const pagination = ref({
    current: 1,
    pageSize: 10,
    total: 0,
    showTotal: true,
    showJumper: true,
    showPageSize: true
  })
  
  const filterForm = ref({
    name: '',
    status: '',
    category: '',
    dateRange: [] as string[]
  })

  // 计算属性
  const stats = computed(() => ({
    total: tagTables.value.length,
    active: tagTables.value.filter(t => t.status === 'active').length,
    archived: tagTables.value.filter(t => t.status === 'archived').length,
    trend: {
      total: Math.random() * 20 - 10, // 模拟趋势数据
      active: Math.random() * 20 - 10,
      archived: Math.random() * 20 - 10
    }
  }))

  // 方法
  const loadTagTables = async (params?: GetTagTablesParams) => {
    loading.value = true
    try {
      const response = await tagAPI.getTagTables({
        page: pagination.value.current,
        pageSize: pagination.value.pageSize,
        ...filterForm.value,
        ...params
      })
      
      if (response.success) {
        tagTables.value = response.data.data
        pagination.value.total = response.data.total
      } else {
        Message.error(response.message || '加载数据失败')
      }
    } catch (error) {
      Message.error('加载数据失败')
      console.error('Failed to load tag tables:', error)
    } finally {
      loading.value = false
    }
  }

  const createTagTable = async (data: CreateTagTableDTO) => {
    try {
      const response = await tagAPI.createTagTable(data)
      if (response.success) {
        tagTables.value.unshift(response.data)
        pagination.value.total += 1
        Message.success('标签表创建成功')
        return response.data
      } else {
        Message.error(response.message || '创建失败')
        throw new Error(response.message)
      }
    } catch (error) {
      Message.error('创建标签表失败')
      throw error
    }
  }

  const updateTagTable = async (id: string, data: UpdateTagTableDTO) => {
    try {
      const response = await tagAPI.updateTagTable(id, data)
      if (response.success) {
        const index = tagTables.value.findIndex(t => t.id === id)
        if (index !== -1) {
          tagTables.value[index] = { ...tagTables.value[index], ...response.data }
        }
        Message.success('更新成功')
        return response.data
      } else {
        Message.error(response.message || '更新失败')
        throw new Error(response.message)
      }
    } catch (error) {
      Message.error('更新标签表失败')
      throw error
    }
  }

  const deleteTagTable = async (id: string) => {
    try {
      const response = await tagAPI.deleteTagTable(id)
      if (response.success) {
        const index = tagTables.value.findIndex(t => t.id === id)
        if (index !== -1) {
          tagTables.value.splice(index, 1)
          pagination.value.total -= 1
        }
        Message.success('删除成功')
      } else {
        Message.error(response.message || '删除失败')
        throw new Error(response.message)
      }
    } catch (error) {
      Message.error('删除标签表失败')
      throw error
    }
  }

  const batchCreateTagTables = async (data: CreateTagTableDTO[]) => {
    try {
      const response = await tagAPI.batchCreateTagTables(data)
      if (response.success) {
        // 批量添加到列表
        response.data.success.forEach((item: TagTable) => {
          tagTables.value.unshift(item)
        })
        pagination.value.total += response.data.success.length
        
        if (response.data.failed.length > 0) {
          Message.warning(`批量创建完成，${response.data.failed.length}条记录失败`)
        } else {
          Message.success('批量创建成功')
        }
        
        return response.data
      } else {
        Message.error(response.message || '批量创建失败')
        throw new Error(response.message)
      }
    } catch (error) {
      Message.error('批量创建标签表失败')
      throw error
    }
  }

  const batchImportTags = async (data: CreateTagTableDTO[]) => {
    try {
      loading.value = true
      const response = await tagAPI.batchImportTags(data)
      
      if (response.success) {
        // 导入成功后重新加载列表
        await loadTagTables()
        return response.data
      } else {
        Message.error(response.message || '批量导入失败')
        throw new Error(response.message)
      }
    } catch (error) {
      Message.error('批量导入标签失败')
      throw error
    } finally {
      loading.value = false
    }
  }

  // 辅助方法
  const setFilterForm = (form: Partial<typeof filterForm.value>) => {
    Object.assign(filterForm.value, form)
  }

  const setPagination = (page: Partial<typeof pagination.value>) => {
    Object.assign(pagination.value, page)
  }

  const resetFilter = () => {
    filterForm.value = {
      name: '',
      status: '',
      category: '',
      dateRange: []
    }
  }

  return {
    // 状态（只读）
    tagTables: readonly(tagTables),
    loading: readonly(loading),
    pagination: readonly(pagination),
    filterForm: readonly(filterForm),
    stats: readonly(stats),
    
    // 方法
    loadTagTables,
    createTagTable,
    updateTagTable,
    deleteTagTable,
    batchCreateTagTables,
    batchImportTags,
    setFilterForm,
    setPagination,
    resetFilter
  }
})