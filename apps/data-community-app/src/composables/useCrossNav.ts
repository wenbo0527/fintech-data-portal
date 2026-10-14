import { useRouter } from 'vue-router'

/**
 * 跨模块/同模块导航契约
 * 替代散落的 router.push('/xxx/yyy') 字符串
 *
 * 用法:
 *   const { go } = useCrossNav()
 *   go('discovery:asset-catalog')
 *   go('discovery:customer360-detail', { userId: '123' })
 */
export const ROUTE_KEYS = {
  // discovery
  discoveryHome: { module: 'discovery', page: 'index' },
  discoveryOverview: { module: 'discovery', page: 'overview' },
  discoveryMetrics: { module: 'discovery', page: 'metrics-map' },
  discoveryVariable: { module: 'discovery', page: 'variable-map' },
  discoveryLineage: { module: 'discovery', page: 'lineage' },
  discoverySearch: { module: 'discovery', page: 'search' },
  // management
  managementHome: { module: 'management', page: 'service' },
  managementMetadata: { module: 'management', page: 'metadata/modeling' },
  managementStandard: { module: 'management', page: 'data-standard/standards' },
  managementDataPermission: { module: 'management', page: 'permission/data-permission' },
  managementBusinessConcept: { module: 'management', page: 'business-concept' },
  managementService: { module: 'management', page: 'service' },
  // exploration
  // 2026-08-06 清理:客群/标签/事件路由已删除,这里同步移除对应的 key,
  //   避免跨模块跳转走 ghost 路径
  explorationHome: { module: 'exploration', page: 'index' },
  explorationCustomer360: { module: 'exploration', page: 'customer360' },
  explorationCustomer360Detail: { module: 'exploration', page: 'customer360/detail', param: 'userId' },
  explorationWorkflows: { module: 'exploration', page: 'workflows' },
  explorationDashboard: { module: 'exploration', page: 'indicator-dashboard' }
} as const

export type RouteKey = keyof typeof ROUTE_KEYS

/**
 * 路由表:key = "module:page", value = 完整路径
 * 凡是引用了路由跳转的地方都应从此处取值,避免散落字符串
 */
export const ROUTE_TABLE: Record<string, string> = {
  // discovery
  'discovery:index': '/discovery/index',
  'discovery:asset-catalog': '/discovery/asset-catalog',
  'discovery:overview': '/discovery/overview',
  'discovery:metrics-map': '/discovery/metrics-map',
  'discovery:variable-map': '/discovery/variable-map',
  'discovery:lineage': '/discovery/lineage',
  'discovery:search': '/discovery/search',
  'discovery:favorites': '/discovery/favorites', // 2026-08-06:统一收藏入口

  // management
  'management:index': '/management/index',
  'management:service': '/management/service',
  'management:metadata-modeling': '/management/metadata/modeling',
  'management:data-permission': '/management/permission/data-permission',
  'management:data-permission-apply': '/management/permission/data-permission/apply',
  'management:business-concept': '/management/business-concept',
  'management:data-standard': '/management/data-standard/standards',
  'management:asset-tags': '/management/asset-management/asset-tags',
  'management:favorites': '/discovery/favorites', // 2026-08-06:统一到发现域

  // exploration
  // 2026-08-06 清理:同上,移除客群/标签/事件 3 条
  'exploration:index': '/exploration/index',
  'exploration:customer360': '/exploration/customer360',
  'exploration:customer360-detail': '/exploration/customer360/detail/:userId',
  'exploration:workflows': '/exploration/workflows',
  'exploration:indicator-dashboard': '/exploration/indicator-dashboard',
  // 统一查询平台(数据探索下,与客户 360 并列)
  'exploration:unified-query-sql': '/exploration/unified-query/sql',
  'exploration:unified-query-tasks': '/exploration/unified-query/tasks'
}

export function useCrossNav() {
  const router = useRouter()

  /**
   * 跳转到指定 key 路由
   * @param key 例如 'discovery:asset-catalog' 或 'discovery:customer360-detail'
   * @param options.context 上下文参数(通过 query 传递,接收页面可读取)
   * @param options.params 参数替换,例如 { userId: '123' } 会替换 :userId
   */
  const go = (
    key: string,
    options?: {
      params?: Record<string, string | number>
      context?: Record<string, string | number | boolean>
    }
  ) => {
    let path = ROUTE_TABLE[key]
    if (!path) {
      console.warn(`[useCrossNav] 未注册的路由 key: ${key}`)
      return Promise.reject(new Error(`Unknown route key: ${key}`))
    }
    const params = options?.params
    const context = options?.context

    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        path = path.replace(`:${k}`, String(v))
      })
    }

    // 子应用 base 兼容:vue-router 4 接到以 '/' 开头的路径会跳过 base
    // 这里去掉前导 '/',让 vue-router 自动加 base(vite build.base,当前为 '/data-community/')
    if (path.startsWith('/')) path = path.substring(1)

    // P0#2: 上下文通过 query 传递,接收页面用 useRoute().query 读取
    if (context && Object.keys(context).length > 0) {
      const queryString = Object.entries(context)
        .filter(([_, v]) => v !== undefined && v !== null)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&')
      if (queryString) path += `?${queryString}`
    }

    return router.push(path)
  }

  /**
   * 仅解析路径,不跳转(用于 a-link href)
   */
  const resolve = (
    key: string,
    options?: {
      params?: Record<string, string | number>
      context?: Record<string, string | number | boolean>
    }
  ): string => {
    let path = ROUTE_TABLE[key] || '#'
    if (options?.params) {
      Object.entries(options.params).forEach(([k, v]) => {
        path = path.replace(`:${k}`, String(v))
      })
    }
    if (options?.context && Object.keys(options.context).length > 0) {
      const queryString = Object.entries(options.context)
        .filter(([_, v]) => v !== undefined && v !== null)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&')
      if (queryString) path += `?${queryString}`
    }
    // href 需要带 base(浏览器地址栏),base 唯一来源 = vite build.base
    const base = import.meta.env.BASE_URL
    if (!path.startsWith(base) && path.startsWith('/')) {
      path = base.replace(/\/$/, '') + path
    }
    return path
  }

  /**
   * 兼容旧菜单配置:从 moduleKey + pageKey 拼接
   */
  const goFromMenuPath = (moduleKey: string, pageKey: string) => {
    return go(`${moduleKey}:${pageKey}`)
  }

  return { go, resolve, goFromMenuPath, ROUTE_KEYS, ROUTE_TABLE }
}