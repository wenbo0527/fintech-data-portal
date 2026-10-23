/**
 * DCA 管理域 E2E 渲染测试 (25 页面)
 */
import { test, expect, type Page } from '@playwright/test'

test.use({ baseURL: 'http://localhost:5177' })

const PAGES = [
  // 资产总览 + 登记管理 (4)
  { name: '资产总揽', path: '/management/asset-management/overview', expectedContent: ['资产'] },
  { name: '指标登记管理', path: '/management/asset-management/listing-management/metric-management', expectedContent: ['指标'] },
  { name: '变量登记管理', path: '/management/asset-management/listing-management/variable-management', expectedContent: ['变量'] },
  { name: '外数登记管理', path: '/management/asset-management/listing-management/external-data-management', expectedContent: ['外数'] },
  // 业务 + 地图 (2)
  { name: '业务概念', path: '/management/business-concept', expectedContent: ['业务'] },
  { name: '管理域数据地图', path: '/management/data-map', expectedContent: ['数据'] },
  // 权限 4 大入口 (4)
  { name: '权限申请', path: '/management/permission/apply', expectedContent: ['权限'] },
  { name: '我的审批', path: '/management/permission/approval', expectedContent: ['审批'] },
  { name: '我的进度', path: '/management/permission/progress', expectedContent: ['进度'] },
  { name: '申请管理', path: '/management/permission/management', expectedContent: ['申请'] },
  // 权限 5 子页面 (5)
  { name: '权限业务模块', path: '/management/permission/business-module', expectedContent: ['业务'] },
  { name: '角色管理', path: '/management/permission/role-management', expectedContent: ['角色'] },
  { name: '用户管理', path: '/management/permission/user-management', expectedContent: ['用户'] },
  { name: '数据权限', path: '/management/permission/data-permission', expectedContent: ['权限'] },
  { name: '应用权限', path: '/management/permission/app-permission', expectedContent: ['权限'] },
  // 数据标准 3 (3)
  { name: '数据标准', path: '/management/data-standard/standards', expectedContent: ['标准'] },
  { name: '数据域', path: '/management/data-standard/domains', expectedContent: ['数据域'] },
  { name: '标准代码', path: '/management/data-standard/codes', expectedContent: ['代码'] },
  // 元数据 2 (2)
  { name: '元数据查询', path: '/management/metadata/query', expectedContent: ['元数据'] },
  { name: '元数据建模', path: '/management/metadata/modeling', expectedContent: ['建模'] },
  // 业务域 + 实体 (2)
  { name: '业务域管理', path: '/management/business-domain', expectedContent: ['业务'] },
  { name: '业务实体', path: '/management/business-entity', expectedContent: ['实体'] },
  // 收藏 (1)
  { name: '管理域收藏', path: '/management/favorites', expectedContent: ['收藏'] }
]

async function verifyPage(page: Page, expectedContent: string[]) {
  try { await page.waitForLoadState('networkidle', { timeout: 30000 }) } catch {}
  await page.waitForTimeout(3000)
  const body = (await page.locator('body').first().textContent()) || ''
  for (const text of expectedContent) {
    expect(body, `期望包含 "${text}"`).toContain(text)
  }
}

test.beforeEach(async ({ page }) => {
  await page.context().addInitScript(() => {
    localStorage.setItem('user-token', 'mock-test-token')
    localStorage.setItem('userInfo', JSON.stringify({
      id: 'test-user', name: 'Test User', token: 'mock-test-token', roles: ['admin']
    }))
  })
})

for (const p of PAGES) {
  test(`管理域-${p.name} (${p.path})`, async ({ page }) => {
    const response = await page.goto(p.path, { waitUntil: 'domcontentloaded' })
    expect(response?.status()).toBe(200)
    await verifyPage(page, p.expectedContent)

    const appRoot = await page.locator('#app').count()
    expect(appRoot).toBeGreaterThan(0)

    const appHtml = await page.locator('#app').innerHTML().catch(() => '')
    expect(appHtml.length).toBeGreaterThan(100)
  })
}

test(`管理域 汇总: ${PAGES.length} 个页面`, () => {
  expect(PAGES.length).toBe(25)
})