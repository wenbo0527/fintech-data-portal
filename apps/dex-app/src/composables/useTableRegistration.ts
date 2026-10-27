import { storeToRefs } from 'pinia'
import { useTableRegistrationStore } from '@/stores/tagSystem/tableRegistration'

/**
 * 标签表注册组合式函数：解包 store 的响应式状态与方法
 */
export const useTableRegistration = () => {
  const store = useTableRegistrationStore()
  const { tableSchema, validation, loading } = storeToRefs(store)
  const loadTableSchema = (dataSourceId: string, tableName: string) => store.loadTableSchema(dataSourceId, tableName)
  const checkPrimaryKey = (fields: string[]) => store.checkPrimaryKey(fields)
  const registerTable = (payload: any) => store.registerTable(payload)
  return { tableSchema, validation, loading, loadTableSchema, checkPrimaryKey, registerTable }
}
