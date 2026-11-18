/**
 * 门户首页本地 mock 数据
 *
 * 只服务首页展示与首页自身交互，不含任何跨模块路由跳转。
 */

export interface TopMenu {
  key: string
  title: string
}

export interface Metric {
  id: string
  title: string
  value: number
  trend: 'up' | 'down'
  color: string
  dayOverDay: number
  trendSeries: number[]
}

export interface Notice {
  id: string
  title: string
  type: string
  status: string
  publishedAt: string
  createdAt: string
  content: string
}

export interface Todo {
  id: number
  title: string
  deadline: string
}

export interface ApplicationOption {
  label: string
  value: string
  icon: string
}

export interface QuickChannelSeed {
  id: number
  row: number
  col: number
  icon: string
  name: string
}

export interface CommunityItem {
  id: number
  icon: string
  title: string
}

export const TOP_MENUS: TopMenu[] = [
  { key: 'home', title: '首页' },
  { key: 'discovery', title: '数据发现' },
  { key: 'exploration', title: '数据探索' },
  { key: 'management', title: '数据管理' },
  { key: 'dataClassify', title: '数据分级分类' },
  { key: 'marketing', title: '数字营销' },
  { key: 'risk', title: '数字风险' },
  { key: 'touch', title: '触达管理' },
  { key: 'system', title: '系统管理' },
]

export const METRICS: Metric[] = [
  {
    id: 'metric-ontu',
    title: '上日在途余额',
    value: 1234.56,
    trend: 'up',
    color: '#0fbf60',
    dayOverDay: 2.3,
    trendSeries: [1200, 1210, 1190, 1220, 1230, 1225, 1234.56],
  },
  {
    id: 'metric-fangkan',
    title: '上日放款金额',
    value: 987.65,
    trend: 'down',
    color: '#f53f3f',
    dayOverDay: -1.5,
    trendSeries: [1050, 1020, 1010, 990, 1000, 995, 987.65],
  },
  {
    id: 'metric-huankuan',
    title: '上日还款金额',
    value: 876.54,
    trend: 'up',
    color: '#0fbf60',
    dayOverDay: 3.2,
    trendSeries: [800, 820, 810, 840, 850, 860, 876.54],
  },
  {
    id: 'metric-dingjia',
    title: '上日在途加权定价',
    value: 765.43,
    trend: 'up',
    color: '#0fbf60',
    dayOverDay: 1.8,
    trendSeries: [700, 710, 720, 730, 740, 750, 765.43],
  },
]

const noticeContent = (title: string) => `
  <div class="notification-article">
    <div class="article-section">
      <p><strong>尊敬的用户：</strong></p>
      <p>您好！这是一条关于 <strong>${title}</strong> 的详细通知。</p>
      <p>为了给您提供更优质的服务体验，我们对平台进行了重要的更新和优化。本次更新主要包含以下内容：</p>
    </div>
    <div class="article-section">
      <h4>一、核心更新点</h4>
      <ul>
        <li><strong>功能升级：</strong> 全面提升了数据处理能力，支持更大规模的数据集分析。</li>
        <li><strong>体验优化：</strong> 优化了用户界面交互，操作更加流畅便捷。</li>
        <li><strong>安全增强：</strong> 升级了安全防护机制，为您的数据安全保驾护航。</li>
      </ul>
    </div>
    <div class="article-section">
      <h4>二、注意事项</h4>
      <ol>
        <li>建议您在使用新功能前，仔细阅读相关的操作指南。</li>
        <li>如遇到任何问题，请及时联系我们的技术支持团队。</li>
        <li>部分旧版本功能可能会有所调整，请留意相关公告。</li>
      </ol>
    </div>
    <div class="article-section">
      <p>我们将持续为您提供优质的产品和服务，感谢您的支持与信任！</p>
      <p style="text-align: right; margin-top: 20px;">数据社区运营团队</p>
    </div>
  </div>
`

const rawNotices = [
  {
    id: 'n-1',
    title: '数据社区 v2.4 版本发布说明',
    type: 'update',
    status: 'published',
    publishedAt: '2026-11-12 10:20',
  },
  {
    id: 'n-2',
    title: '关于外部数据源接入规范的公告',
    type: 'policy_notice',
    status: 'published',
    publishedAt: '2026-11-11 16:05',
  },
  {
    id: 'n-3',
    title: '数据资产目录治理专项启动',
    type: 'announcement',
    status: 'published',
    publishedAt: '2026-11-10 09:30',
  },
  {
    id: 'n-4',
    title: '指标口径评审会报名开始',
    type: 'activity',
    status: 'published',
    publishedAt: '2026-11-07 14:00',
  },
  {
    id: 'n-5',
    title: '统一查询能力升级说明',
    type: 'product_news',
    status: 'published',
    publishedAt: '2026-11-05 11:15',
  },
]

export const NOTICES: Notice[] = rawNotices.map(item => ({
  ...item,
  createdAt: item.publishedAt,
  content: noticeContent(item.title),
}))

export const TODOS: Todo[] = [
  { id: 1, title: '数据质量周报审核', deadline: '2026-11-16 18:00' },
  { id: 2, title: '新增数据接口评审', deadline: '2026-11-17 12:00' },
  { id: 3, title: '数据安全培训', deadline: '2026-11-18 15:00' },
  { id: 4, title: '月度数据统计报告', deadline: '2026-11-19 17:00' },
]

export const APPLICATIONS: ApplicationOption[] = [
  { label: '模型平台', value: 'model-platform', icon: 'IconRobot' },
  { label: '客户360', value: 'customer360', icon: 'IconUserGroup' },
  { label: '数据地图', value: 'data-map', icon: 'IconLocation' },
  { label: '客群中心', value: 'customer-center', icon: 'IconUserGroup' },
  { label: '权益中心', value: 'benefit-center', icon: 'IconHeart' },
  { label: '营销中心', value: 'marketing-center', icon: 'IconFire' },
  { label: '外数管理', value: 'external-data', icon: 'IconCloud' },
  { label: '服务中心', value: 'service-center', icon: 'IconCustomerService' },
  { label: '洞察中心', value: 'insight-center', icon: 'IconBulb' },
]

export const DEFAULT_CHANNELS: QuickChannelSeed[] = [
  { id: 1, row: 1, col: 1, icon: 'IconSafe', name: '权限服务' },
  { id: 2, row: 1, col: 2, icon: 'IconCloud', name: '外数服务' },
  { id: 3, row: 1, col: 3, icon: 'IconApps', name: '任务管理' },
]

export const COMMUNITY_ITEMS: CommunityItem[] = [
  { id: 1, icon: 'IconBook', title: '政策制度' },
  { id: 2, icon: 'IconBulb', title: '实践案例' },
  { id: 3, icon: 'IconCompass', title: '使用指南' },
  { id: 4, icon: 'IconNotification', title: '社区动态' },
]

export const NOTICE_TYPE_MAP: Record<string, string> = {
  general: '普通通知',
  data_service: '数据服务',
  announcement: '公告',
  activity: '活动资讯',
  update: '更新',
  policy_notice: '政策通知',
  product_news: '产品消息',
}

export const NOTICE_TYPE_COLOR_MAP: Record<string, string> = {
  general: 'gray',
  data_service: 'arcoblue',
  announcement: 'orange',
  activity: 'red',
  update: 'green',
  policy_notice: 'purple',
  product_news: 'blue',
}

export const NOTICE_STATUS_MAP: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'orange' },
  published: { label: '已发布', color: 'green' },
  archived: { label: '已归档', color: 'blue' },
  expired: { label: '已过期', color: 'red' },
}

export const getNoticeTypeLabel = (type: string): string => NOTICE_TYPE_MAP[type] || type || '未知'

export const getNoticeTypeColor = (type: string): string => NOTICE_TYPE_COLOR_MAP[type] || 'gray'

export const getNoticeStatusMeta = (status: string) =>
  NOTICE_STATUS_MAP[status] || { label: status || '未知', color: 'gray' }