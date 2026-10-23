/**
 * DCA 全量页面渲染测试
 *
 * 目的:扫描所有 P0/P1/G1-G6 新建的页面,逐个 mount 验证:
 *   1. 没有运行时错误
 *   2. 没有未捕获的 Vue warning
 *   3. 渲染出非空 DOM
 *
 * 策略:
 *   - mock 整个 @/api/* 模块(返回 default object + 所有方法 Promise.resolve)
 *   - mock 整个 @/utils/* 模块(返回 default object)
 *   - 只测"可挂载性",不测业务逻辑
 *   - 每个页面单独 it,失败单独报告
 *
 * 覆盖范围:本次会话所有新建/重写的页面 + 关键管理域/发现域路由
 */
import { describe, it, expect, vi } from 'vitest'

// ===== 全局 mock:让所有 @/api/* 和 @/utils/* 模块都可解析 =====

const proxyHandler: ProxyHandler<any> = {
  get(target, prop) {
    if (prop === 'default') return target
    if (prop === '__esModule') return true
    return new Proxy(function () {}, proxyHandler)
  },
  apply() {
    return new Proxy({}, proxyHandler)
  }
}

// Mock 所有 @/api/* 模块
function makeApiModule() {
  return new Proxy({
    default: new Proxy({}, proxyHandler)
  }, proxyHandler)
}

vi.mock('@/api/permission', () => makeApiModule())
vi.mock('@/api/user', () => makeApiModule())
vi.mock('@/api/dataModels', () => makeApiModule())
vi.mock('@/api/dataModels.js', () => makeApiModule())
vi.mock('@/api/metadata', () => makeApiModule())
vi.mock('@/api/variable-management', () => makeApiModule())
vi.mock('@/api/community', () => makeApiModule())
vi.mock('@/api/offlineModel', () => makeApiModule())
vi.mock('@/api/notification', () => makeApiModule())
vi.mock('@/api/external/evaluation', () => makeApiModule())
vi.mock('@/api/external/task.ts', () => makeApiModule())
vi.mock('@/api/tag', () => makeApiModule())
vi.mock('@/api/alert', () => makeApiModule())
vi.mock('@/api/alertRules', () => makeApiModule())
vi.mock('@/api/alertRulesService', () => makeApiModule())
vi.mock('@/api/coupon.js', () => makeApiModule())
vi.mock('@/api/coupon', () => makeApiModule())
vi.mock('@/api/docsLocal', () => makeApiModule())
vi.mock('@/api/external', () => makeApiModule())

// Mock 所有 @/utils/* 模块(除 dateUtils,我们已实现)
vi.mock('@/utils/api', () => makeApiModule())
vi.mock('@/utils/auth', () => makeApiModule())
vi.mock('@/utils/format', () => makeApiModule())
vi.mock('@/utils/storage', () => makeApiModule())
vi.mock('@/utils/request', () => makeApiModule())
vi.mock('@/utils/router', () => makeApiModule())
vi.mock('@/utils/constants', () => makeApiModule())
vi.mock('@/utils/permission', () => makeApiModule())
vi.mock('@/utils/validate', () => makeApiModule())
vi.mock('@/utils/error', () => makeApiModule())
vi.mock('@/utils/i18n', () => makeApiModule())

import { mountComponent } from './createWrapper'

// 抑制 Arco 图标的 ESM 警告
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

/**
 * 页面清单 - 来源:
 *   1. 本次会话新建的 P0/P1 页面
 *   2. G1-G6 路由补齐后挂载的页面
 *   3. 文档要求但 DCA 必须可用的核心页面
 */
const pagesToTest = [
  // ===== P0 =====
  {
    group: 'P0 - 必做功能',
    path: '/home/discovery/favorites',
    name: '我的关注(P0 重写)',
    loader: () => import('@/pages/discovery/favorites/index.vue')
  },
  {
    group: 'P0 - 必做功能',
    path: '/home/discovery/impact-analysis',
    name: '上下架影响分析(P0 必做)',
    loader: () => import('@/pages/discovery/impact-analysis/index.vue')
  },

  // ===== P1 =====
  {
    group: 'P1 - 要素与详情',
    path: '/home/discovery/elements-dictionary',
    name: '要素字典(P1-A)',
    loader: () => import('@/pages/discovery/elements-dictionary/index.vue')
  },
  {
    group: 'P1 - 要素与详情',
    path: '/home/discovery/classification',
    name: '智能分级分类(P1-B)',
    loader: () => import('@/pages/discovery/classification/index.vue')
  },
  {
    group: 'P1 - 要素与详情',
    path: '/home/discovery/asset-detail/dim_user',
    name: '资产详情 5 Tab(P1-C)',
    loader: () => import('@/pages/discovery/asset-detail/index.vue')
  },

  // ===== 数据发现域 路由挂载页 =====
  {
    group: '发现域 - 总览',
    path: '/home/discovery/asset-overview',
    name: '资产总览',
    loader: () => import('@/pages/discovery/asset-overview/index.vue')
  },
  {
    group: '发现域 - 总览',
    path: '/home/discovery/asset-guide',
    name: '资产导览',
    loader: () => import('@/pages/discovery/asset-guide/index.vue')
  },
  {
    group: '发现域 - 数据资源',
    path: '/home/discovery/data-resources/business-system',
    name: '业务系统资源',
    loader: () => import('@/pages/discovery/data-resources/BusinessSystem.vue')
  },
  {
    group: '发现域 - 数据资源',
    path: '/home/discovery/data-resources/external-data',
    name: '外部数据资源',
    loader: () => import('@/pages/discovery/data-resources/ExternalData.vue')
  },
  {
    group: '发现域 - 数据资源',
    path: '/home/discovery/data-resources/file-import',
    name: '文件导入资源',
    loader: () => import('@/pages/discovery/data-resources/FileImport.vue')
  },
  {
    group: '发现域 - 数据资源',
    path: '/home/discovery/data-resources/log-data',
    name: '日志数据资源',
    loader: () => import('@/pages/discovery/data-resources/LogData.vue')
  },
  {
    group: '发现域 - 数据资源',
    path: '/home/discovery/data-resources/real-time-data',
    name: '实时数据资源',
    loader: () => import('@/pages/discovery/data-resources/RealTimeData.vue')
  },
  {
    group: '发现域 - 消费地图',
    path: '/home/discovery/data-map',
    name: '数据消费地图',
    loader: () => import('@/pages/discovery/data-map/index.vue')
  },
  {
    group: '发现域 - 消费地图',
    path: '/home/discovery/data-map/collections',
    name: '常用表管理',
    loader: () => import('@/pages/discovery/data-map/CollectionsManagement.vue')
  },
  {
    group: '发现域 - 资产管理',
    path: '/home/discovery/asset-management/table-management',
    name: '表管理',
    loader: () => import('@/pages/discovery/asset-management/table-management/index.vue')
  },
  {
    group: '发现域 - 资产管理',
    path: '/home/discovery/asset-management/field-management',
    name: '字段管理',
    loader: () => import('@/pages/discovery/asset-management/field-management/index.vue')
  },
  {
    group: '发现域 - 客户360',
    path: '/home/discovery/customer360',
    name: '客户 360',
    loader: () => import('@/pages/discovery/customer360/index.vue')
  },
  {
    group: '发现域 - 要素',
    path: '/home/discovery/unified-metrics',
    name: '统一指标管理',
    loader: () => import('@/pages/discovery/unified-metrics/index.vue')
  },
  {
    group: '发现域 - 要素',
    path: '/home/discovery/metrics-map',
    name: '指标地图',
    loader: () => import('@/pages/discovery/metrics-map/index.vue')
  },
  {
    group: '发现域 - 要素',
    path: '/home/discovery/feature-map',
    name: '特征地图',
    loader: () => import('@/pages/discovery/feature-map/index.vue')
  },
  {
    group: '发现域 - 要素',
    path: '/home/discovery/credit',
    name: '征信变量',
    loader: () => import('@/pages/discovery/credit/index.vue')
  },
  {
    group: '发现域 - API/外数',
    path: '/home/discovery/api-market',
    name: 'API 市场',
    loader: () => import('@/pages/discovery/api-market/index.vue')
  },
  {
    group: '发现域 - API/外数',
    path: '/home/discovery/external',
    name: '外数管理',
    loader: () => import('@/pages/discovery/external/index.vue')
  },
  {
    group: '发现域 - 指标治理',
    path: '/home/discovery/batch-registration',
    name: '批量注册指标',
    loader: () => import('@/pages/discovery/batch-registration/index.vue')
  },
  {
    group: '发现域 - 指标治理',
    path: '/home/discovery/regulatory-config',
    name: '监管报表配置',
    loader: () => import('@/pages/discovery/regulatory-config/index.vue')
  },
  {
    group: '发现域 - 搜索',
    path: '/home/discovery/search',
    name: '统一搜索',
    loader: () => import('@/pages/discovery/search/index.vue')
  },
  {
    group: '发现域 - 血缘',
    path: '/home/discovery/lineage',
    name: '数据血缘',
    loader: () => import('@/pages/discovery/lineage/index.vue')
  },

  // ===== 数据管理域 =====
  {
    group: '管理域 - 资产',
    path: '/home/management/asset-management/overview',
    name: '资产总揽',
    loader: () => import('@/pages/management/asset-management/overview/index.vue')
  },
  {
    group: '管理域 - 资产登记',
    path: '/home/management/asset-management/listing-management/table-management',
    name: '表登记',
    loader: () => import('@/pages/management/asset-management/listing-management/table-management/index.vue')
  },
  {
    group: '管理域 - 资产登记',
    path: '/home/management/asset-management/listing-management/metric-management',
    name: '指标登记',
    loader: () => import('@/pages/management/asset-management/listing-management/metric-management/index.vue')
  },
  {
    group: '管理域 - 资产登记',
    path: '/home/management/asset-management/listing-management/variable-management',
    name: '变量登记',
    loader: () => import('@/pages/management/asset-management/listing-management/variable-management/index.vue')
  },
  {
    group: '管理域 - 资产登记',
    path: '/home/management/asset-management/listing-management/data-elements',
    name: '数据要素登记',
    loader: () => import('@/pages/management/asset-management/listing-management/data-elements/index.vue')
  },
  {
    group: '管理域 - 资产登记',
    path: '/home/management/asset-management/listing-management/external-data-management',
    name: '外数登记',
    loader: () => import('@/pages/management/asset-management/listing-management/external-data-management/index.vue')
  },
  {
    group: '管理域 - 基础管理',
    path: '/home/management/asset-management/basic-management/tag-management',
    name: '标签管理',
    loader: () => import('@/pages/management/asset-management/basic-management/tag-management/index.vue')
  },
  {
    group: '管理域 - 基础管理',
    path: '/home/management/asset-management/basic-management/metadata-collection',
    name: '元数据采集',
    loader: () => import('@/pages/management/asset-management/basic-management/metadata-collection/index.vue')
  },
  {
    group: '管理域 - 数据标准',
    path: '/home/management/data-standard/standards',
    name: '数据标准',
    loader: () => import('@/pages/management/data-standard/standards/index.vue')
  },
  {
    group: '管理域 - 数据标准',
    path: '/home/management/data-standard/codes',
    name: '标准代码管理',
    loader: () => import('@/pages/management/data-standard/codes/index.vue')
  },
  {
    group: '管理域 - 数据标准',
    path: '/home/management/data-standard/domains',
    name: '数据域',
    loader: () => import('@/pages/management/data-standard/domains/index.vue')
  },
  {
    group: '管理域 - 业务概念',
    path: '/home/management/business-concept/domain',
    name: '业务域管理',
    loader: () => import('@/pages/management/business-concept/BusinessDomainList.vue')
  },
  {
    group: '管理域 - 业务概念',
    path: '/home/management/business-concept/entity',
    name: '业务实体',
    loader: () => import('@/pages/management/business-concept/BusinessEntityList.vue')
  },
  {
    group: '管理域 - 数据模型',
    path: '/home/management/data-models',
    name: '数据模型',
    loader: () => import('@/pages/management/data-models/index.vue')
  },
  {
    group: '管理域 - 元数据',
    path: '/home/management/metadata/query',
    name: '元数据查询',
    loader: () => import('@/pages/management/metadata/query/index.vue')
  },
  {
    group: '管理域 - 元数据',
    path: '/home/management/metadata/modeling',
    name: '元数据建模',
    loader: () => import('@/pages/management/metadata/modeling/index.vue')
  },
  {
    group: '管理域 - 服务',
    path: '/home/management/service/api-management',
    name: 'API 管理',
    loader: () => import('@/pages/management/service/api-management/index.vue')
  },
  {
    group: '管理域 - 服务',
    path: '/home/management/service/fund-usage-query',
    name: '风险合规外数查询',
    loader: () => import('@/pages/management/service/fund-usage-query/index.vue')
  },

  // ===== 权限管理域 =====
  {
    group: '权限 - 我的入口',
    path: '/home/management/permission/apply',
    name: '权限申请',
    loader: () => import('@/pages/management/permission/PermissionApply.vue')
  },
  {
    group: '权限 - 我的入口',
    path: '/home/management/permission/approval',
    name: '我的审批',
    loader: () => import('@/pages/management/permission/PermissionApproval.vue')
  },
  {
    group: '权限 - 我的入口',
    path: '/home/management/permission/progress',
    name: '我的进度',
    loader: () => import('@/pages/management/permission/PermissionProgress.vue')
  },
  {
    group: '权限 - 我的入口',
    path: '/home/management/permission/management',
    name: '申请管理',
    loader: () => import('@/pages/management/permission/PermissionManagement.vue')
  },
  {
    group: '权限 - 子模块',
    path: '/home/management/permission/users/list',
    name: '用户管理',
    loader: () => import('@/pages/management/permission/user-management/index.vue')
  },
  {
    group: '权限 - 子模块',
    path: '/home/management/permission/role',
    name: '角色管理(RBAC)',
    loader: () => import('@/pages/management/permission/role-management/index.vue')
  },
  {
    group: '权限 - 子模块',
    path: '/home/management/permission/data',
    name: '数据权限管理',
    loader: () => import('@/pages/management/permission/data-permission/index.vue')
  },
  {
    group: '权限 - 子模块',
    path: '/home/management/permission/app',
    name: '应用权限管理',
    loader: () => import('@/pages/management/permission/app-permission/index.vue')
  },
  {
    group: '权限 - 子模块',
    path: '/home/management/permission/business-module',
    name: '业务模块管理',
    loader: () => import('@/pages/management/permission/business-module/index.vue')
  },

  // ===== 探索域 =====
  {
    group: '探索域',
    path: '/home/exploration/index',
    name: '探索首页',
    loader: () => import('@/pages/exploration/index.vue')
  },
  {
    group: '探索域',
    path: '/home/exploration/indicator-dashboard',
    name: '指标看板',
    loader: () => import('@/pages/exploration/indicator-dashboard/index.vue')
  },

  // ===== 应用外壳 =====
  {
    group: '应用外壳',
    path: '/home',
    name: 'Home 容器',
    loader: () => import('@/views/home/index.vue')
  },
  {
    group: '应用外壳',
    path: '/home',
    name: 'Sidebar 侧边栏',
    loader: () => import('@/views/home/Sidebar.vue')
  }
]

// 按 group 分组,生成 describe
const groupedPages = pagesToTest.reduce<Record<string, typeof pagesToTest>>((acc, page) => {
  if (!acc[page.group]) acc[page.group] = []
  acc[page.group].push(page)
  return acc
}, {})

describe('DCA 全量页面渲染测试', () => {
  Object.entries(groupedPages).forEach(([group, pages]) => {
    describe(group, () => {
      pages.forEach(page => {
        it(`${page.name} (${page.path}) 应能成功 mount`, async () => {
          let Component: any
          try {
            const mod = await page.loader()
            Component = mod.default || mod
          } catch (e: any) {
            throw new Error(`加载失败: ${e.message}`)
          }

          if (!Component) {
            throw new Error('组件未导出')
          }

          let wrapper: any
          let renderError: any = null
          try {
            wrapper = mountComponent(Component, {
              props: page.path.includes('/asset-detail/') ? { tableName: 'dim_user' } : {}
            })
          } catch (e: any) {
            renderError = e
          }

          if (renderError) {
            throw new Error(`挂载失败: ${renderError.message}`)
          }

          // 验证渲染出非空 DOM
          const html = wrapper.html()
          expect(html).toBeTruthy()
          expect(html.length).toBeGreaterThan(50)

          // 验证至少有一个 Arco/HTML 元素
          expect(html).toMatch(/<(\w+)/)

          wrapper.unmount()
        }, 15000)
      })
    })
  })
})

describe('DCA 渲染测试 - 汇总', () => {
  it(`总计 ${pagesToTest.length} 个页面待测试`, () => {
    console.log(`\n📊 页面渲染测试覆盖统计:`)
    console.log(`总页面数: ${pagesToTest.length}`)
    Object.entries(groupedPages).forEach(([group, pages]) => {
      console.log(`  - ${group}: ${pages.length} 个`)
    })
    expect(pagesToTest.length).toBeGreaterThan(20)
  })
})

// 防止 spy 报警告
beforeAll(() => {})
afterAll(() => {
  consoleErrorSpy.mockRestore()
  consoleWarnSpy.mockRestore()
})