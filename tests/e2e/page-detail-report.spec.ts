/**
 * DCA 全量页面详情报告
 *
 * 跑遍 P0/P1 + 发现域 + 管理域 + 营销域所有页面
 * 输出: 路径、Title、DOM 字符数、是否含期望关键词
 */
import { test, type Page } from '@playwright/test'

test.use({ baseURL: 'http://localhost:5177' })

const PAGES = [
  // P0
  { group: 'P0', name: '我的关注', path: '/discovery/favorites', kw: ['关注'] },
  { group: 'P0', name: '影响分析', path: '/discovery/impact-analysis', kw: ['分析'] },
  // P1
  { group: 'P1', name: '要素字典', path: '/discovery/elements-dictionary', kw: ['要素'] },
  { group: 'P1', name: '智能分级分类', path: '/discovery/classification', kw: ['分类'] },
  { group: 'P1', name: '资产详情', path: '/discovery/asset-detail/dim_user', kw: ['详情'] },
  { group: 'P1', name: '批量注册', path: '/discovery/batch-registration', kw: ['指标'] },
  { group: 'P1', name: '监管报表', path: '/discovery/regulatory-config', kw: ['配置'] },
  { group: 'P1', name: '资产导览', path: '/discovery/asset-guide', kw: ['资产'] },
  // 发现域
  { group: '发现域', name: '资产总览', path: '/discovery/asset-overview', kw: ['资产'] },
  { group: '发现域', name: '客户360', path: '/discovery/customer360', kw: ['客户'] },
  { group: '发现域', name: '外数', path: '/discovery/external', kw: ['外数'] },
  { group: '发现域', name: '征信变量', path: '/discovery/credit', kw: ['征信'] },
  { group: '发现域', name: '指标地图', path: '/discovery/metrics-map', kw: ['指标'] },
  { group: '发现域', name: '特征地图', path: '/discovery/feature-map', kw: ['特征'] },
  { group: '发现域', name: 'API 市场', path: '/discovery/api-market', kw: ['API'] },
  { group: '发现域', name: '统一指标', path: '/discovery/unified-metrics', kw: ['指标'] },
  { group: '发现域', name: '数据消费地图', path: '/discovery/data-map', kw: ['数据'] },
  { group: '发现域', name: '常用表管理', path: '/discovery/data-map/collections', kw: ['表'] },
  { group: '发现域', name: '血缘分析', path: '/discovery/lineage', kw: ['血缘'] },
  { group: '发现域', name: '业务系统资源', path: '/discovery/data-resources/business-system', kw: ['业务系统'] },
  { group: '发现域', name: '外部数据资源', path: '/discovery/data-resources/external-data', kw: ['外部'] },
  { group: '发现域', name: '文件导入资源', path: '/discovery/data-resources/file-import', kw: ['文件'] },
  { group: '发现域', name: '日志数据资源', path: '/discovery/data-resources/log-data', kw: ['日志'] },
  { group: '发现域', name: '实时数据资源', path: '/discovery/data-resources/real-time-data', kw: ['实时'] },
  { group: '发现域', name: '统一搜索', path: '/discovery/search', kw: ['搜索'] },
  { group: '发现域', name: '资产批量管理', path: '/discovery/asset-management/batch-asset-management', kw: ['资产'] },
  { group: '发现域', name: '外数采购登记', path: '/discovery/asset-management/external-purchase-register', kw: ['外数'] },
  // 管理域
  { group: '管理域', name: '资产总揽', path: '/management/asset-management/overview', kw: ['资产'] },
  { group: '管理域', name: '指标登记管理', path: '/management/asset-management/listing-management/metric-management', kw: ['指标'] },
  { group: '管理域', name: '变量登记管理', path: '/management/asset-management/listing-management/variable-management', kw: ['变量'] },
  { group: '管理域', name: '外数登记管理', path: '/management/asset-management/listing-management/external-data-management', kw: ['外数'] },
  { group: '管理域', name: '业务概念', path: '/management/business-concept', kw: ['业务'] },
  { group: '管理域', name: '管理域数据地图', path: '/management/data-map', kw: ['数据'] },
  { group: '管理域', name: '权限申请', path: '/management/permission/apply', kw: ['权限'] },
  { group: '管理域', name: '我的审批', path: '/management/permission/approval', kw: ['审批'] },
  { group: '管理域', name: '我的进度', path: '/management/permission/progress', kw: ['进度'] },
  { group: '管理域', name: '申请管理', path: '/management/permission/management', kw: ['申请'] },
  { group: '管理域', name: '权限业务模块', path: '/management/permission/business-module', kw: ['业务'] },
  { group: '管理域', name: '角色管理', path: '/management/permission/role-management', kw: ['角色'] },
  { group: '管理域', name: '用户管理', path: '/management/permission/user-management', kw: ['用户'] },
  { group: '管理域', name: '数据权限', path: '/management/permission/data-permission', kw: ['权限'] },
  { group: '管理域', name: '应用权限', path: '/management/permission/app-permission', kw: ['权限'] },
  { group: '管理域', name: '数据标准', path: '/management/data-standard/standards', kw: ['标准'] },
  { group: '管理域', name: '数据域', path: '/management/data-standard/domains', kw: ['数据域'] },
  { group: '管理域', name: '标准代码', path: '/management/data-standard/codes', kw: ['代码'] },
  { group: '管理域', name: '元数据查询', path: '/management/metadata/query', kw: ['元数据'] },
  { group: '管理域', name: '元数据建模', path: '/management/metadata/modeling', kw: ['建模'] },
  { group: '管理域', name: '业务域管理', path: '/management/business-domain', kw: ['业务'] },
  { group: '管理域', name: '业务实体', path: '/management/business-entity', kw: ['实体'] },
  { group: '管理域', name: '管理域收藏', path: '/management/favorites', kw: ['收藏'] },
  // 营销域
  { group: '营销域', name: '预警中心', path: '/marketing/alert', kw: ['预警'] },
  { group: '营销域', name: '权益管理', path: '/marketing/benefit/management', kw: ['权益'] },
  { group: '营销域', name: '权益包', path: '/marketing/benefit/package', kw: ['权益'] },
  { group: '营销域', name: '权益模板', path: '/marketing/benefit/template', kw: ['权益'] },
  { group: '营销域', name: '券规则', path: '/marketing/coupon/rules', kw: ['券'] },
  { group: '营销域', name: '券模板详情', path: '/marketing/coupon/template/detail', kw: ['券'] },
  { group: '营销域', name: '权益首页', path: '/marketing/dashboard', kw: ['权益'] }
]

const summary: { group: string, name: string, path: string, status: string, title: string, domLen: number, kw: string, hasKw: string }[] = []

test.beforeEach(async ({ page }) => {
  await page.context().addInitScript(() => {
    localStorage.setItem('user-token', 'mock-test-token')
    localStorage.setItem('userInfo', JSON.stringify({
      id: 'test-user', name: 'Test User', token: 'mock-test-token', roles: ['admin']
    }))
  })
})

for (const p of PAGES) {
  test(`详情报告-${p.group}-${p.name}`, async ({ page }) => {
    const response = await page.goto(p.path, { waitUntil: 'domcontentloaded' })
    try { await page.waitForLoadState('networkidle', { timeout: 10000 }) } catch {}
    await page.waitForTimeout(1500)

    const status = response?.status() ?? 0
    const title = await page.title()
    const body = (await page.locator('body').first().textContent()) || ''
    const hasKw = p.kw.every(k => body.includes(k)) ? '✓' : '✗'
    const domLen = (await page.locator('#app').innerHTML().catch(() => '')).length

    summary.push({
      group: p.group,
      name: p.name,
      path: p.path,
      status: String(status),
      title,
      domLen,
      kw: p.kw.join('+'),
      hasKw
    })
  })
}

test.afterAll(() => {
  // 按 group 分组输出
  const grouped: Record<string, typeof summary> = {}
  summary.forEach(s => {
    if (!grouped[s.group]) grouped[s.group] = []
    grouped[s.group].push(s)
  })

  console.log('\n\n')
  console.log('='.repeat(120))
  console.log('DCA 全量页面详情报告')
  console.log('='.repeat(120))

  Object.entries(grouped).forEach(([group, items]) => {
    console.log(`\n【${group}】 ${items.length} 个页面`)
    console.log('-'.repeat(120))
    console.log('状态 | Title                                  | DOM 长度 | 关键词  | 路径')
    console.log('-'.repeat(120))
    items.forEach(s => {
      const titlePadded = (s.title || '(空)').slice(0, 35).padEnd(38)
      const domPadded = String(s.domLen).padStart(7)
      console.log(`${s.status}   | ${titlePadded} | ${domPadded} | ${s.kw.padEnd(8)} ${s.hasKw} | ${s.path}`)
    })
  })

  // 统计
  const total = summary.length
  const allOk = summary.filter(s => s.hasKw === '✓').length
  const total2xx = summary.filter(s => s.status.startsWith('2')).length
  const emptyTitle = summary.filter(s => !s.title || s.title === 'Vite + Vue').length

  console.log('\n' + '='.repeat(120))
  console.log(`📊 总计: ${total} 页面`)
  console.log(`  ✓ HTTP 200: ${total2xx}/${total} (${((total2xx / total) * 100).toFixed(1)}%)`)
  console.log(`  ✓ 关键词全中: ${allOk}/${total} (${((allOk / total) * 100).toFixed(1)}%)`)
  console.log(`  ✗ Title 为空/默认: ${emptyTitle}`)
  console.log('='.repeat(120))
})