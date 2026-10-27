import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchTableSchema, validatePrimaryKey, registerTagTable } from '@/api/tag'
import type { TableField, UniquenessCheckResult } from '@/types/tag'

export const useTableRegistrationStore = defineStore('tableRegistration', () => {
  const tableSchema = ref<TableField[]>([])
  const validation = ref<UniquenessCheckResult | null>(null)
  const loading = ref(false)
  const currentDataSourceId = ref<string>('')
  const currentTableName = ref<string>('')

  const loadTableSchema = async (dataSourceId: string, tableName: string) => {
    loading.value = true
    try {
      currentDataSourceId.value = dataSourceId
      currentTableName.value = tableName
      tableSchema.value = await fetchTableSchema(dataSourceId, tableName)
    } finally {
      loading.value = false
    }
  }

  const checkPrimaryKey = async (fields: string[]) => {
    validation.value = await validatePrimaryKey(currentDataSourceId.value, currentTableName.value, fields)
    return validation.value
  }

  const registerTable = async (payload: any) => {
    loading.value = true
    try {
      return await registerTagTable(payload)
    } finally {
      loading.value = false
    }
  }

  return { tableSchema, validation, loading, loadTableSchema, checkPrimaryKey, registerTable }
})
