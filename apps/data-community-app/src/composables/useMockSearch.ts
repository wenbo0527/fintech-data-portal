/**
 * useMockSearch —— 用户搜索链路的 mock 数据 + 跳转契约
 *
 * 设计意图:
 *   1. 把搜索结果(表/指标/字段/API)统一收口为 SearchRecord
 *   2. 每条 record 自带 path / query,跳转时直接用,不再写散落字符串
 *   3. 通过 useMockSearch().search(keyword) / useMockSearch().goTo(record)
 *      形成完整的「搜索 → 跳转」链路,方便埋断点和扩展
 *
 * 上线后:
 *   - 把 mockSearch 内部替换为真实 API 调用即可
 *   - SearchRecord 结构保持不变,业务方可平滑切换
 */
import { useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'

export type SearchRecordType = 'table' | 'metric' | 'api' | 'field'

export interface SearchRecord {
  id: string
  type: SearchRecordType
  name: string
  description: string
  domain: string
  owner: string
  /** 命中后跳转的相对路径(不带 /dca 前缀) */
  path: string
  /** 命中后跳转的 query 参数 */
  query?: Record<string, string | number>
  /** 搜索匹配得分(由 mockSearch 计算) */
  score: number
}

/**
 * mock 搜索数据源 —— 真实环境下应由后端返回
 * path 字段全部为相对路径,跟 useCrossNav 保持一致风格
 */
const MOCK_RECORDS: SearchRecord[] = [
  // ── 数据表(table) ──────────────────────────
  { id: 't-001', type: 'table', name: 'dwd_贷款_0042', description: '贷款申请主表',
    domain: '用户域', owner: '王运营', path: 'discovery/asset-catalog', query: { table: 'dwd_贷款_0042' }, score: 0 },
  { id: 't-002', type: 'table', name: 'dwd_风控_0017', description: '风控评分事实表',
    domain: '风控域', owner: '张风控', path: 'discovery/asset-catalog', query: { table: 'dwd_风控_0017' }, score: 0 },
  { id: 't-003', type: 'table', name: 'dws_客户主档', description: '客户主档宽表',
    domain: '用户域', owner: '李产品', path: 'discovery/asset-catalog', query: { table: 'dws_客户主档' }, score: 0 },
  { id: 't-004', type: 'table', name: 'ods_交易流水', description: '交易流水原始层',
    domain: '交易域', owner: '吴工程', path: 'discovery/asset-catalog', query: { table: 'ods_交易流水' }, score: 0 },

  // ── 指标(metric) ────────────────────────────
  { id: 'm-001', type: 'metric', name: '首逾率', description: '贷款首期逾期率',
    domain: '风控域', owner: '张风控', path: 'discovery/indicator-dict', query: { focus: '首逾率' }, score: 0 },
  { id: 'm-002', type: 'metric', name: 'DAU', description: '日活跃用户数',
    domain: '用户域', owner: '王运营', path: 'discovery/unified-metrics', query: { focus: 'DAU' }, score: 0 },
  { id: 'm-003', type: 'metric', name: '授信总额', description: '在贷用户的总授信额度',
    domain: '风控域', owner: '张风控', path: 'discovery/indicator-dict', query: { focus: '授信总额' }, score: 0 },

  // ── API(api) ─────────────────────────────────
  { id: 'a-001', type: 'api', name: 'getCreditScore', description: '查询用户征信评分',
    domain: '风控域', owner: '陈策略', path: 'discovery/api-market', query: { api: 'getCreditScore' }, score: 0 },
  { id: 'a-002', type: 'api', name: 'queryUserProfile', description: '查询用户画像',
    domain: '用户域', owner: '王运营', path: 'discovery/api-market', query: { api: 'queryUserProfile' }, score: 0 },

  // ── 字段(field) ──────────────────────────────
  { id: 'f-001', type: 'field', name: 'loan_amount', description: '贷款金额字段',
    domain: '用户域', owner: '王运营', path: 'discovery/feature-dict', score: 0 },
  { id: 'f-002', type: 'field', name: 'credit_score', description: '征信评分字段',
    domain: '风控域', owner: '张风控', path: 'discovery/feature-dict', score: 0 }
]

/**
 * type → 默认跳转目标(用于 record 没有自带 path 时的兜底)
 * 后续若有「按 type 全跳转」的入口,可直接复用这张表
 */
export const JUMP_TARGETS: Record<SearchRecordType, { path: string }> = {
  table:  { path: 'discovery/asset-catalog' },
  metric: { path: 'discovery/indicator-dict' },
  api:    { path: 'discovery/api-market' },
  field:  { path: 'discovery/feature-dict' }
}

/**
 * 搜索:对关键字做轻量匹配(名称/描述/域/owner)
 * 返回按 score 倒序、截前 limit 条的结果
 */
export function mockSearch(keyword: string, limit = 20): SearchRecord[] {
  const kw = (keyword || '').trim().toLowerCase()
  if (!kw) return []
  return MOCK_RECORDS
    .map(r => {
      let score = 0
      if (r.name.toLowerCase().includes(kw)) score += 10
      if (r.description.toLowerCase().includes(kw)) score += 5
      if (r.domain.toLowerCase().includes(kw)) score += 3
      if (r.owner.toLowerCase().includes(kw)) score += 1
      return { ...r, score }
    })
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

export function useMockSearch() {
  const router = useRouter()

  /**
   * 搜索入口:对外只暴露这一个 API,内部统一调用 mockSearch
   * 后续替换为真实 API 时,只动这一个函数
   */
  const search = (keyword: string, limit = 20) => mockSearch(keyword, limit)

  /**
   * 跳转入口:每条 record 自带 path/query,统一走 router.push
   * 这条函数就是「断点 D」之外最关键的链路节点 —— 调试时埋在这里
   */
  const goTo = (record: SearchRecord) => {
    if (!record?.path) {
      Message.warning('该结果暂不支持跳转')
      return Promise.reject(new Error('empty path'))
    }
    // ⛳ 断点 E: search → target 链路出口
    // eslint-disable-next-line no-console
    console.debug('[mockSearch.goTo] record =', record)
    return router.push({
      path: record.path,
      query: record.query
    })
  }

  return { search, goTo, JUMP_TARGETS }
}