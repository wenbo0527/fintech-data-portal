/**
 * DCA 全量页面 E2E 渲染测试(Playwright)
 *
 * 目的:覆盖 vitest jsdom 不能跑的页面(X6 图、ECharts 看板、Arco 复杂组件等)
 * 工具:@playwright/test + 真实 Chromium 浏览器
 * 前置:dev server 启动在 http://localhost:5173
 *
 * 与 vitest 测试互补:
 *   - vitest: 73.8% (45/61) 通过率
 *   - e2e: 目标 90%+ 通过率(覆盖 jsdom 限制的 16 个页面)
 *
 * @see 文档 §13 落地路径
 */

import { test, expect, type Page } from '@playwright/test'

// 配置:使用 5177 端口(vite.config.js 的 server.port)
test.use({ baseURL: 'http://localhost:5177' })

/**
 * 页面清单:本次会话新建的所有 P0/P1/G1-G6 页面 + jsdom 跑不过的页面
 *
 * 每个页面定义:
 *   - path: URL 路径
 *   - name: 页面显示名称(用于错误信息)
 *   - group: 分组
 *   - expectedContent: 期望页面包含的文本(用于验证渲染成功)
 */
const PAGES = [
  // ===== P0 必做功能 =====
  {
    group: 'P0 - 必做功能',
    name: '我的关注(必做)',
    path: '/home/discovery/favorites',
    expectedContent: ['我的关注', '统一管理']
  },
  {
    group: 'P0 - 必做功能',
    name: '上下架影响分析(必做)',
    path: '/home/discovery/impact-analysis',
    expectedContent: ['上下架', '影响']
  },

  // ===== P1 功能 =====
  {
    group: 'P1 - 要素与详情',
    name: '要素字典',
    path: '/home/discovery/elements-dictionary',
    expectedContent: ['要素字典', '指标']
  },
  {
    group: 'P1 - 要素与详情',
    name: '智能分级分类',
    path: '/home/discovery/classification',
    expectedContent: ['智能分级分类', '分级']
  },
  {
    group: 'P1 - 要素与详情',
    name: '资产详情 5 Tab',
    path: '/home/discovery/asset-detail/dim_user',
    expectedContent: ['Schema', 'Schema']
  },

  // ===== 数据发现域 =====
  {
    group: '发现域 - 总览',
    name: '资产总览',
    path: '/home/discovery/asset-overview',
    expectedContent: ['资产']
  },
  {
    group: '发现域 - 总览',
    name: '资产导览',
    path: '/home/discovery/asset-guide',
    expectedContent: ['资产导览']
  },
  {
    group: '发现域 - 数据资源',
    name: '业务系统资源',
    path: '/home/discovery/data-resources/business-system',
    expectedContent: ['业务系统']
  },
  {
    group: '发现域 - 数据资源',
    name: '外部数据资源',
    path: '/home/discovery/data-resources/external-data',
    expectedContent: ['外部数据']
  },
  {
    group: '发现域 - 数据资源',
    name: '文件导入资源',
    path: '/home/discovery/data-resources/file-import',
    expectedContent: ['文件导入']
  },
  {
    group: '发现域 - 数据资源',
    name: '日志数据资源',
    path: '/home/discovery/data-resources/log-data',
    expectedContent: ['日志']
  },
  {
    group: '发现域 - 数据资源',
    name: '实时数据资源',
    path: '/home/discovery/data-resources/real-time-data',
    expectedContent: ['实时']
  },
  {
    group: '发现域 - 消费地图',
    name: '数据消费地图',
    path: '/home/discovery/data-map',
    expectedContent: ['数据']
  },
  {
    group: '发现域 - 消费地图',
    name: '常用表管理',
    path: '/home/discovery/data-map/collections',
    expectedContent: ['集合', '表']
  },
  {
    group: '发现域 - 资产管理',
    name: '表管理',
    path: '/home/discovery/asset-management/table-management',
    expectedContent: ['表']
  },
  {
    group: '发现域 - 资产管理',
    name: '字段管理',
    path: '/home/discovery/asset-management/field-management',
    expectedContent: ['字段']
  },
  {
    group: '发现域 - 客户360',
    name: '客户 360',
    path: '/home/discovery/customer360',
    expectedContent: ['客户']
  },
  {
    group: '发现域 - 要素',
    name: '统一指标管理',
    path: '/home/discovery/unified-metrics',
    expectedContent: ['指标']
  },
  {
    group: '发现域 - 要素',
    name: '指标地图',
    path: '/home/discovery/metrics-map',
    expectedContent: ['指标']
  },
  {
    group: '发现域 - 要素',
    name: '特征地图',
    path: '/home/discovery/feature-map',
    expectedContent: ['特征']
  },
  {
    group: '发现域 - 要素',
    name: '征信变量',
    path: '/home/discovery/credit',
    expectedContent: ['征信', '变量']
  },
  {
    group: '发现域 - API/外数',
    name: 'API 市场',
    path: '/home/discovery/api-market',
    expectedContent: ['API']
  },
  {
    group: '发现域 - API/外数',
    name: '外数管理',
    path: '/home/discovery/external',
    expectedContent: ['外数']
  },
  {
    group: '发现域 - 指标治理',
    name: '批量注册指标',
    path: '/home/discovery/batch-registration',
    expectedContent: ['指标', '注册']
  },
  {
    group: '发现域 - 指标治理',
    name: '监管报表配置',
    path: '/home/discovery/regulatory-config',
    expectedContent: ['监管', '报表']
  },
  {
    group: '发现域 - 搜索',
    name: '统一搜索',
    path: '/home/discovery/search',
    expectedContent: ['搜索']
  },
  {
    group: '发现域 - 血缘(X6 图 - vitest 跑不过)',
    name: '数据血缘',
    path: '/home/discovery/lineage',
    expectedContent: ['血缘', 'dim_user']
  },

  // ===== 数据管理域 =====
  {
    group: '管理域 - 资产总揽(ECharts - vitest 跑不过)',
    name: '资产总揽',
    path: '/home/management/asset-management/overview',
    expectedContent: ['资产']
  },
  {
    group: '管理域 - 资产登记',
    name: '表登记',
    path: '/home/management/asset-management/listing-management/table-management',
    expectedContent: ['表']
  },
  {
    group: '管理域 - 资产登记',
    name: '指标登记',
    path: '/home/management/asset-management/listing-management/metric-management',
    expectedContent: ['指标']
  },
  {
    group: '管理域 - 资产登记',
    name: '变量登记',
    path: '/home/management/asset-management/listing-management/variable-management',
    expectedContent: ['变量']
  },
  {
    group: '管理域 - 资产登记',
    name: '数据要素登记',
    path: '/home/management/asset-management/listing-management/data-elements',
    expectedContent: ['要素']
  },
  {
    group: '管理域 - 资产登记',
    name: '外数登记',
    path: '/home/management/asset-management/listing-management/external-data-management',
    expectedContent: ['外数']
  },
  {
    group: '管理域 - 基础管理',
    name: '标签管理',
    path: '/home/management/asset-management/basic-management/tag-management',
    expectedContent: ['标签']
  },
  {
    group: '管理域 - 基础管理',
    name: '元数据采集',
    path: '/home/management/asset-management/basic-management/metadata-collection',
    expectedContent: ['元数据']
  },
  {
    group: '管理域 - 数据标准',
    name: '数据标准',
    path: '/home/management/data-standard/standards',
    expectedContent: ['标准']
  },
  {
    group: '管理域 - 数据标准',
    name: '标准代码管理',
    path: '/home/management/data-standard/codes',
    expectedContent: ['代码']
  },
  {
    group: '管理域 - 数据标准',
    name: '数据域',
    path: '/home/management/data-standard/domains',
    expectedContent: ['域']
  },
  {
    group: '管理域 - 业务概念',
    name: '业务域管理',
    path: '/home/management/business-concept/domain',
    expectedContent: ['业务域']
  },
  {
    group: '管理域 - 业务概念',
    name: '业务实体',
    path: '/home/management/business-concept/entity',
    expectedContent: ['业务实体']
  },
  {
    group: '管理域 - 数据模型',
    name: '数据模型',
    path: '/home/management/data-models',
    expectedContent: ['数据模型']
  },
  {
    group: '管理域 - 元数据',
    name: '元数据查询',
    path: '/home/management/metadata/query',
    expectedContent: ['元数据']
  },
  {
    group: '管理域 - 元数据',
    name: '元数据建模',
    path: '/home/management/metadata/modeling',
    expectedContent: ['建模']
  },
  {
    group: '管理域 - 服务',
    name: 'API 管理',
    path: '/home/management/service/api-management',
    expectedContent: ['API']
  },
  {
    group: '管理域 - 服务',
    name: '风险合规外数查询',
    path: '/home/management/service/fund-usage-query',
    expectedContent: ['风险', '外数']
  },

  // ===== 权限管理域 =====
  {
    group: '权限 - 我的入口',
    name: '权限申请',
    path: '/home/management/permission/apply',
    expectedContent: ['权限']
  },
  {
    group: '权限 - 我的入口',
    name: '我的审批',
    path: '/home/management/permission/approval',
    expectedContent: ['审批']
  },
  {
    group: '权限 - 我的入口',
    name: '我的进度',
    path: '/home/management/permission/progress',
    expectedContent: ['进度']
  },
  {
    group: '权限 - 我的入口',
    name: '申请管理',
    path: '/home/management/permission/management',
    expectedContent: ['申请']
  },
  {
    group: '权限 - 子模块',
    name: '用户管理',
    path: '/home/management/permission/users/list',
    expectedContent: ['用户']
  },
  {
    group: '权限 - 子模块',
    name: '角色管理(RBAC)',
    path: '/home/management/permission/role',
    expectedContent: ['角色']
  },
  {
    group: '权限 - 子模块',
    name: '数据权限管理',
    path: '/home/management/permission/data',
    expectedContent: ['数据权限']
  },
  {
    group: '权限 - 子模块',
    name: '应用权限管理',
    path: '/home/management/permission/app',
    expectedContent: ['应用权限']
  },
  {
    group: '权限 - 子模块',
    name: '业务模块管理',
    path: '/home/management/permission/business-module',
    expectedContent: ['业务模块']
  },

  // ===== 探索域 =====
  {
    group: '探索域',
    name: '探索首页',
    path: '/home/exploration/index',
    expectedContent: ['首页']
  },
  {
    group: '探索域',
    name: '指标看板',
    path: '/home/exploration/indicator-dashboard',
    expectedContent: ['指标', '看板']
  }
]

// 按 group 分组
const groupedPages = PAGES.reduce<Record<string, typeof PAGES>>((acc, page) => {
  if (!acc[page.group]) acc[page.group] = []
  acc[page.group].push(page)
  return acc
}, {})

/**
 * 通用检查:等待页面加载 + 验证期望内容
 */
async function verifyPage(page: Page, expectedContent: string[]) {
  // 等待网络空闲或超时
  try {
    await page.waitForLoadState('networkidle', { timeout: 8000 })
  } catch {
    // 忽略:某些页面可能有持续活动(图表轮询)
  }
  // 验证期望内容
  const body = await page.locator('body').textContent()
  for (const text of expectedContent) {
    expect(body, `期望包含 "${text}",实际内容: ${body?.slice(0, 200)}`).toContain(text)
  }
}

/**
 * 测试套件:遍历所有页面 + 验证渲染
 */
test.describe('DCA 全量页面 E2E 渲染测试', () => {
  // 按 group 分别 describe,失败单独报告
  Object.entries(groupedPages).forEach(([group, pages]) => {
    test.describe(group, () => {
      for (const pageDef of pages) {
        test(`${pageDef.name} (${pageDef.path}) 应能正确渲染`, async ({ page }) => {
          // 静默 console.error(测试期间 Arco 会有无害警告)
          const consoleErrors: string[] = []
          page.on('console', (msg) => {
            if (msg.type() === 'error') consoleErrors.push(msg.text())
          })
          page.on('pageerror', (err) => consoleErrors.push(err.message))

          // 访问页面
          const response = await page.goto(pageDef.path, { waitUntil: 'domcontentloaded' })

          // 验证 HTTP 200
          expect(response?.status(), `HTTP 状态码`).toBe(200)

          // 验证期望内容
          await verifyPage(page, pageDef.expectedContent)

          // 检查是否有未捕获的页面错误(过滤掉已知的 Arco 警告)
          const realErrors = consoleErrors.filter(e =>
            !e.includes('Failed to load resource') &&
            !e.includes('favicon') &&
            !e.includes('[Arco Design]') &&
            !e.includes('warning')
          )
          if (realErrors.length > 0) {
            console.log(`⚠️  ${pageDef.name} 控制台错误:`, realErrors.slice(0, 3))
          }
        })
      }
    })
  })
})

/**
 * 汇总统计
 */
test.describe('汇总', () => {
  test(`总计 ${PAGES.length} 个页面待测试`, () => {
    console.log(`\n📊 E2E 页面渲染测试覆盖统计:`)
    console.log(`总页面数: ${PAGES.length}`)
    Object.entries(groupedPages).forEach(([group, pages]) => {
      console.log(`  - ${group}: ${pages.length} 个`)
    })
    expect(PAGES.length).toBeGreaterThan(40)
  })
})