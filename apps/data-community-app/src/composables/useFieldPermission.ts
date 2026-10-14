import { computed, ref } from 'vue'
import { useUserStore } from '@/stores/user'

/**
 * 字段权限统一入口(P1#3 + 客户 360 v3.3)
 *
 * 三维开关:
 *   - visible:  是否可见
 *   - copyable: 是否可复制
 *   - searchable: 是否可加入筛选/搜索条件
 *
 * 权限来源(优先级):
 *   1. PD-COM 权限中心(management/permission/data-permission)
 *   2. 字段级 fallback(白名单/黑名单)
 *   3. 字段敏感度等级(sensitivity)
 */

export type SensitivityLevel = 'public' | 'internal' | 'confidential' | 'restricted'

export interface FieldPermission {
  visible: boolean
  copyable: boolean
  searchable: boolean
  reason?: string
}

export interface PermissionContext {
  userId?: string
  role?: string
  department?: string
  dataDomain?: string
}

/**
 * 字段默认规则(基于敏感度)
 */
const DEFAULT_RULES: Record<SensitivityLevel, FieldPermission> = {
  public:       { visible: true,  copyable: true,  searchable: true },
  internal:     { visible: true,  copyable: true,  searchable: true },
  confidential: { visible: true,  copyable: false, searchable: false, reason: '机密字段不可复制/检索' },
  restricted:   { visible: false, copyable: false, searchable: false, reason: '高敏感字段不展示' }
}

/**
 * 角色豁免规则(高级角色可突破默认)
 */
const ROLE_EXEMPTIONS: Record<string, Partial<FieldPermission>> = {
  admin:        { visible: true, copyable: true, searchable: true },
  data_admin:   { visible: true, copyable: true, searchable: true },
  risk_manager: { visible: true, copyable: true, searchable: true },
  risk_analyst: { visible: true, copyable: false, searchable: true }
}

/**
 * 共享的字段权限 Store
 */
export const useFieldPermissionStore = () => {
  // 当前用户对每个 (domain, field) 的 override
  // Key: `${domain}:${field}`, value: 完整权限对象
  const overrides = ref<Record<string, FieldPermission>>({})

  /**
   * 取字段权限
   * @param domain 数据域(如 'customer360')
   * @param field 字段名(如 'id_card')
   * @param sensitivity 敏感度
   * @param ctx 权限上下文
   */
  const getPermission = (
    domain: string,
    field: string,
    sensitivity: SensitivityLevel = 'public',
    ctx?: PermissionContext
  ): FieldPermission => {
    const key = `${domain}:${field}`
    const userStore = useUserStore()

    // 1. override 优先
    if (overrides.value[key]) return overrides.value[key]

    // 2. 角色豁免
    const role = ctx?.role || userStore.userInfo?.role || 'user'
    const exemption = ROLE_EXEMPTIONS[role]
    if (exemption) {
      const base = DEFAULT_RULES[sensitivity]
      return { ...base, ...exemption }
    }

    // 3. 默认规则
    return DEFAULT_RULES[sensitivity]
  }

  /**
   * 设置 override
   */
  const setOverride = (domain: string, field: string, perm: FieldPermission) => {
    overrides.value[`${domain}:${field}`] = perm
  }

  /**
   * 批量设置 override(从权限中心拉取)
   */
  const applyOverrides = (list: Array<{ domain: string; field: string; perm: FieldPermission }>) => {
    list.forEach(({ domain, field, perm }) => {
      overrides.value[`${domain}:${field}`] = perm
    })
  }

  /**
   * 清除 override
   */
  const clearOverrides = () => {
    overrides.value = {}
  }

  /**
   * 过滤字段列表(只保留可见的)
   */
  const filterVisible = <T extends { name: string; sensitivity?: SensitivityLevel }>(
    fields: T[],
    domain: string,
    ctx?: PermissionContext
  ): T[] => {
    return fields.filter(f => getPermission(domain, f.name, f.sensitivity, ctx).visible)
  }

  return {
    overrides: computed(() => overrides.value),
    getPermission,
    setOverride,
    applyOverrides,
    clearOverrides,
    filterVisible
  }
}

/**
 * 简化 composable:在页面里直接用
 *
 * 用法:
 *   const { can } = useFieldPermission('customer360')
 *   can('id_card', 'restricted').visible
 *   can('mobile', 'confidential').copyable
 */
export function useFieldPermission(domain: string) {
  const store = useFieldPermissionStore()

  const can = (field: string, sensitivity: SensitivityLevel = 'public') => {
    return store.getPermission(domain, field, sensitivity)
  }

  return {
    can,
    store
  }
}