/**
 * DCA 全量页面 E2E 渲染测试(扩展版)
 *
 * 覆盖 P0/P1 + G2/G3 补齐的所有页面
 * 目标:60+ 页面 E2E 验证
 */
import { test, expect, type Page } from '@playwright/test'

test.use({ baseURL: 'http://localhost:5177' })

const PAGES = [
  // ===== P0 必做功能 =====
  { group: 'P0', name: 'P0-我的关注', path: '/discovery/favorites', expectedContent: ['关注'] },
  { group: 'P0', name: 'P0-影响分析', path: '/discovery/impact-analysis', expectedContent: ['分析'] },

  // ===== P1 业务功能 =====
  { group: 'P1', name: 'P1-要素字典', path: '/discovery/elements-dictionary', expectedContent: ['要素'] },
  { group: 'P1', name: 'P1-智能分级分类', path: '/discovery/classification', expectedContent: ['分类'] },
  { group: 'P1', name: 'P1-资产详情', path: '/discovery/asset-detail/dim_user', expectedContent: ['详情'] },
  { group: 'P1', name: 'P1-批量注册', path: '/discovery/batch-registration', expectedContent: ['指标'] },
  { group: 'P1', name: 'P1-监管报表', path: '/discovery/regulatory-config', expectedContent: ['配置'] },
  { group: 'P1', name: 'P1-资产导览', path: '/discovery/asset-guide', expectedContent: ['资产'] },

  // ===== 发现域 - 已有路由 =====
  { group: '发现域', name: '资产总览', path: '/discovery/asset-overview', expectedContent: ['资产'] },
  { group: '发现域', name: '客户360', path: '/discovery/customer360', expectedContent: ['客户'] },
  { group: '发现域', name: '外数', path: '/discovery/external', expectedContent: ['外数'] },
  { group: '发现域', name: '征信变量', path: '/discovery/credit', expectedContent: ['征信'] },
  { group: '发现域', name: '指标地图', path: '/discovery/metrics-map', expectedContent: ['指标'] },
  { group: '发现域', name: '特征地图', path: '/discovery/feature-map', expectedContent: ['特征'] },
  { group: '发现域', name: 'API 市场', path: '/discovery/api-market', expectedContent: ['API'] },
  { group: '发现域', name: '统一指标', path: '/discovery/unified-metrics', expectedContent: ['指标'] },
  { group: '发现域', name: '数据消费地图', path: '/discovery/data-map', expectedContent: ['数据'] },
  { group: '发现域', name: '常用表管理', path: '/discovery/data-map/collections', expectedContent: ['表'] },
  { group: '发现域', name: '血缘分析', path: '/discovery/lineage', expectedContent: ['血缘'] },
  { group: '发现域', name: '业务系统资源', path: '/discovery/data-resources/business-system', expectedContent: ['业务系统'] },
  { group: '发现域', name: '外部数据资源', path: '/discovery/data-resources/external-data', expectedContent: ['外部'] },
  { group: '发现域', name: '文件导入资源', path: '/discovery/data-resources/file-import', expectedContent: ['文件'] },
  { group: '发现域', name: '日志数据资源', path: '/discovery/data-resources/log-data', expectedContent: ['日志'] },
  { group: '发现域', name: '实时数据资源', path: '/discovery/data-resources/real-time-data', expectedContent: ['实时'] },
  { group: '发现域', name: '统一搜索', path: '/discovery/search', expectedContent: ['搜索'] },
  { group: '发现域', name: '资产批量管理', path: '/discovery/asset-management/batch-asset-management', expectedContent: ['资产'] },
  { group: '发现域', name: '外数采购登记', path: '/discovery/asset-management/external-purchase-register', expectedContent: ['外数'] },

  // ===== G2 新增: 管理域补齐 =====
  { group: 'G2-管理', name: '资产总揽', path: '/management/asset-management/overview', expectedContent: ['资产'] },
  { group: 'G2-管理', name: '指标登记管理', path: '/management/asset-management/listing-management/metric-management', expectedContent: ['指标'] },
  { group: 'G2-管理', name: '变量登记管理', path: '/management/asset-management/listing-management/variable-management', expectedContent: ['变量'] },
  { group: 'G2-管理', name: '外数登记管理', path: '/management/asset-management/listing-management/external-data-management', expectedContent: ['外数'] },
  { group: 'G2-管理', name: '业务概念', path: '/management/business-concept', expectedContent: ['业务'] },
  { group: 'G2-管理', name: '管理域数据地图', path: '/management/data-map', expectedContent: ['数据'] },
  { group: 'G2-管理', name: '权限申请', path: '/management/permission/apply', expectedContent: ['权限'] },
  { group: 'G2-管理', name: '我的审批', path: '/management/permission/approval', expectedContent: ['审批'] },
  { group: 'G2-管理', name: '我的进度', path: '/management/permission/progress', expectedContent: ['进度'] },
  { group: 'G2-管理', name: '申请管理', path: '/management/permission/management', expectedContent: ['申请'] },
  { group: 'G2-管理', name: '权限业务模块', path: '/management/permission/business-module', expectedContent: ['业务'] },
  { group: 'G2-管理', name: '角色管理', path: '/management/permission/role-management', expectedContent: ['角色'] },
  { group: 'G2-管理', name: '用户管理', path: '/management/permission/user-management', expectedContent: ['用户'] },
  { group: 'G2-管理', name: '数据权限', path: '/management/permission/data-permission', expectedContent: ['权限'] },
  { group: 'G2-管理', name: '应用权限', path: '/management/permission/app-permission', expectedContent: ['权限'] },
  { group: 'G2-管理', name: '数据标准', path: '/management/data-standard/standards', expectedContent: ['标准'] },
  { group: 'G2-管理', name: '数据域', path: '/management/data-standard/domains', expectedContent: ['数据域'] },
  { group: 'G2-管理', name: '标准代码', path: '/management/data-standard/codes', expectedContent: ['代码'] },
  { group: 'G2-管理', name: '元数据查询', path: '/management/metadata/query', expectedContent: ['元数据'] },
  { group: 'G2-管理', name: '元数据建模', path: '/management/metadata/modeling', expectedContent: ['建模'] },
  { group: 'G2-管理', name: '标签管理', path: '/management/asset-management/basic-management/tag-management', expectedContent: ['标签'] },
  { group: 'G2-管理', name: '元数据采集', path: '/management/asset-management/basic-management/metadata-collection', expectedContent: ['元数据'] },
  { group: 'G2-管理', name: '业务域管理', path: '/management/business-domain', expectedContent: ['业务'] },
  { group: 'G2-管理', name: '业务实体', path: '/management/business-entity', expectedContent: ['实体'] },

  // ===== G3 新增: 营销域 =====
  { group: 'G3-营销', name: '预警中心', path: '/marketing/alert', expectedContent: ['预警'] },
  { group: 'G3-营销', name: '权益管理', path: '/marketing/benefit/management', expectedContent: ['权益'] },
  { group: 'G3-营销', name: '权益包', path: '/marketing/benefit/package', expectedContent: ['权益'] },
  { group: 'G3-营销', name: '权益模板', path: '/marketing/benefit/template', expectedContent: ['权益'] },
  { group: 'G3-营销', name: '券规则', path: '/marketing/coupon/rules', expectedContent: ['券'] },
  { group: 'G3-营销', name: '券模板详情', path: '/marketing/coupon/template/detail', expectedContent: ['券'] },
  { group: 'G3-营销', name: '权益首页', path: '/marketing/dashboard', expectedContent: ['权益'] }
]

async function verifyPage(page: Page, expectedContent: string[]) {
  // 等网络空闲（最大 15 秒）
  try {
    await page.waitForLoadState('networkidle', { timeout: 15000 })
  } catch {}
  // 额外等 2 秒让 Vue 完成渲染
  await page.waitForTimeout(2000)
  const body = (await page.locator('body').first().textContent()) || ''
  for (const text of expectedContent) {
    expect(body, `期望包含 "${text}"`).toContain(text)
  }
}

// 按 group 分组
const grouped = PAGES.reduce<Record<string, typeof PAGES>>((acc, p) => {
  if (!acc[p.group]) acc[p.group] = []
  acc[p.group].push(p)
  return acc
}, {})

test.describe('DCA 全量页面 E2E(扩展版)', () => {
  Object.entries(grouped).forEach(([group, pages]) => {
    test.describe(group, () => {
      for (const p of pages) {
        test(`${p.name} (${p.path})`, async ({ page }) => {
          // 注入 mock token 绕过路由守卫
          await page.context().addInitScript(() => {
            localStorage.setItem('user-token', 'mock-test-token')
            localStorage.setItem('userInfo', JSON.stringify({
              id: 'test-user', name: 'Test User', token: 'mock-test-token', roles: ['admin']
            }))
          })

          const response = await page.goto(p.path, { waitUntil: 'domcontentloaded' })
          expect(response?.status()).toBe(200)
          await verifyPage(page, p.expectedContent)

          // 验证 Vue 已挂载
          const appRoot = await page.locator('#app').count()
          expect(appRoot).toBeGreaterThan(0)

          const appHtml = await page.locator('#app').innerHTML().catch(() => '')
          expect(appHtml.length).toBeGreaterThan(100)
        })
      }
    })
  })
})

test.describe('汇总', () => {
  test(`总计 ${PAGES.length} 个页面`, () => {
    console.log(`\n📊 DCA 全量页面 E2E:`)
    console.log(`总页面数: ${PAGES.length}`)
    Object.entries(grouped).forEach(([g, ps]) => {
      console.log(`  - ${g}: ${ps.length} 个`)
    })
    expect(PAGES.length).toBeGreaterThanOrEqual(50)
  })
})