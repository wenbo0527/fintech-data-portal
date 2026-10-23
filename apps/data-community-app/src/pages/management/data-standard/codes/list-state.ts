/**
 * 标准代码列表页状态快照 —— 支撑 R21「返回列表后保留进入前的搜索条件、筛选条件与页码」
 *
 * 列表页与详情页是同一路由树下的两个页面,离开列表再返回时组件会被销毁重建,
 * 因此把列表的搜索条件与页码落到 sessionStorage,返回时按快照恢复。
 */

/** sessionStorage 键名 */
export const CODES_LIST_STATE_KEY = 'data-standard-codes:list-state'

/** 列表页状态快照 */
export interface CodesListState {
  /** 搜索关键词 */
  keyword: string
  /** 当前页码 */
  page: number
}

/**
 * 读取列表页状态快照。
 *
 * @returns 快照(无记录时返回默认值)
 */
export function readCodesListState(): CodesListState {
  try {
    const raw = sessionStorage.getItem(CODES_LIST_STATE_KEY)
    if (!raw) {return { keyword: '', page: 1 }}
    const parsed = JSON.parse(raw) as Partial<CodesListState>
    return {
      keyword: typeof parsed.keyword === 'string' ? parsed.keyword : '',
      page: typeof parsed.page === 'number' && parsed.page > 0 ? parsed.page : 1
    }
  } catch {
    return { keyword: '', page: 1 }
  }
}

/**
 * 写入列表页状态快照。
 *
 * @param state 待保存的状态
 */
export function writeCodesListState(state: CodesListState) {
  try {
    sessionStorage.setItem(CODES_LIST_STATE_KEY, JSON.stringify(state))
  } catch {
    // sessionStorage 不可用时忽略:仅影响返回态体验,不影响主流程
  }
}
