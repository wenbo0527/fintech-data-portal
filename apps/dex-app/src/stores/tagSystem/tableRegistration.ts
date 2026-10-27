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

  /**
   * 加载指定数据源下的表结构（字段列表）
   * @param dataSourceId 数据源 ID
   * @param tableName 表名
   */
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

  /**
   * 校验候选主键字段的唯一性
   * @param fields 候选字段名列表
   * @returns 唯一性校验结果
   */
  const checkPrimaryKey = async (fields: string[]) => {
    validation.value = await validatePrimaryKey(currentDataSourceId.value, currentTableName.value, fields)
    return validation.value
  }

  /**
   * 注册标签表
   * @param payload 注册参数
   * @returns 注册后的标签表
   */
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
