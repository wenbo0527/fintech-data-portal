/**
 * 变量效果评估 · 意见与标记 store（mock）
 *
 * 单源约定：列表行的「赞数 / 评论数」一律由本 store 提供，生成器不重复造数，
 * 避免「列表显示 32 赞、详情意见区只有 2 条」这类演示穿帮。
 *
 * 点赞粒度：点赞作用于「变量」（一个变量本机只能赞一次，可再点取消），不是意见条目；
 * 赞数 = 该变量历史意见赞合计 + 本机投票，列表列与详情页共用 likesOf 单源。
 *
 * 持久化：localStorage `effect.opinions`（本地新增评论与变量票态）、`effect.marks`（标记记录）
 */

import { formatDateTime, getDataset } from './generator'
import { UserContext, ROLE_LABELS } from '../risk-feature/permissions'
import type { MarkRecord, MarkType, Opinion } from './types'

const OPINION_KEY = 'effect.opinions'
const MARK_KEY = 'effect.marks'

/** 标记类型中文映射 */
export const MARK_TYPE_LABELS: Record<MarkType, string> = {
  offline: '建议汰换',
  online: '推荐使用',
  keep_observing: '继续观察',
  wrong_data: '数据口径有误'
}

/** 意见语料池：用于按变量 ID 确定性派生历史意见 */
const OPINION_TEXTS = [
  '这块在支用环节已经跑了两个季度，逾期区分度稳定，建议保留并纳入下一版评分卡。',
  '覆盖率掉得厉害，最近一个月缺了一半以上，怀疑上游表分区没按时产出。',
  '外数采购成本偏高，同效的站内变量已经能替代，建议走下线评估流程。',
  '和额度使用率高度相关，放进模型会有共线，建议只做规则侧使用。',
  '催收场景验证下来 lift 不明显，但样本量太小，先继续观察一期。',
  '口径写的是 30 天，实际取数窗口是 28 天，需要先对齐再谈效果结论。',
  '在反欺诈侧表现不错，风控侧别急着下线，建议分场景保留。',
  '与征信变量叠加后增益接近于零，成本角度建议退。'
]
const AUTHORS = [
  { name: '小李', role: 'risk_data_member' },
  { name: '王数仓', role: 'risk_data_admin' },
  { name: '陈数据', role: 'risk_data_member' },
  { name: '社区管理员', role: 'community_admin' },
  { name: '张策略', role: 'risk_data_member' }
]

/** 本地新增数据（会话内写入 localStorage） */
interface LocalState {
  opinions: Opinion[]
  /** 变量级点赞票态：key = variableId（点赞是变量粒度，不是意见条目粒度） */
  varVotes: Record<string, boolean>
  marks: MarkRecord[]
}

/**
 * 读取 localStorage 并补默认结构
 * @returns 本地意见、变量票态与标记
 */
function readState(): LocalState {
  try {
    const raw = localStorage.getItem(OPINION_KEY)
    const marksRaw = localStorage.getItem(MARK_KEY)
    const parsed = raw ? (JSON.parse(raw) as { opinions?: Opinion[]; varVotes?: Record<string, boolean> }) : {}
    /** 只 parse 一次：JSON.parse(null) 会被强转成 JSON.parse("null") 得到 null，直接二次 parse 会产出 null.marks */
    const marksList = marksRaw ? (JSON.parse(marksRaw) as MarkRecord[]) : []
    return {
      opinions: Array.isArray(parsed.opinions) ? parsed.opinions : [],
      varVotes: parsed.varVotes && typeof parsed.varVotes === 'object' ? parsed.varVotes : {},
      marks: Array.isArray(marksList) ? marksList : []
    }
  } catch {
    return { opinions: [], varVotes: {}, marks: [] }
  }
}

/** 写回 localStorage（意见与变量票态一起存，保证刷新后点赞态不丢） */
function writeState(state: LocalState) {
  try {
    localStorage.setItem(OPINION_KEY, JSON.stringify({ opinions: state.opinions, varVotes: state.varVotes }))
    localStorage.setItem(MARK_KEY, JSON.stringify(state.marks))
  } catch {
    // 演示环境忽略配额异常
  }
}

/** 简单的字符串哈希，作为按变量派生历史意见的种子（保证同一变量每次结果一致） */
function hashId(id: string): number {
  let h = 2166136261
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** mulberry32：与生成器同款确定性随机 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 历史意见缓存：首次访问某变量时派生，之后复用 */
const seededCache = new Map<string, Opinion[]>()

/**
 * 按变量 ID 派生历史意见（确定性）
 * 数量 0-3 条，赞数 0-18，作者与角色从固定池取
 */
function seedOpinions(variableId: string): Opinion[] {
  if (seededCache.has(variableId)) return seededCache.get(variableId)!
  const rng = mulberry32(hashId(variableId))
  const count = Math.floor(rng() * 3.4)
  const list: Opinion[] = []
  for (let i = 0; i < count; i++) {
    const author = AUTHORS[Math.floor(rng() * AUTHORS.length)]
    const daysAgo = Math.floor(rng() * 90) + 1
    list.push({
      id: `op-${variableId}-${i}`,
      variableId,
      author: author.name,
      role: author.role,
      roleLabel: ROLE_LABELS[author.role],
      text: OPINION_TEXTS[Math.floor(rng() * OPINION_TEXTS.length)],
      createdAt: formatDateTime(new Date(Date.now() - daysAgo * 86400000)),
      likes: Math.floor(rng() * 19),
      voted: false
    })
  }
  seededCache.set(variableId, list)
  return list
}

export const effectOpinionStore = {
  /**
   * 变量意见列表：历史派生 + 本地新增，按时间倒序
   * 赞数是变量粒度，意见条目只展示内容与作者，不再带单条赞按钮
   * @param variableId 变量 ID（合成 ID 同样可用）
   */
  listOpinions(variableId: string): Opinion[] {
    const state = readState()
    const local = state.opinions.filter((o) => o.variableId === variableId).map((o) => ({ ...o }))
    const seeded = seedOpinions(variableId).map((o) => ({ ...o }))
    return [...local, ...seeded].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  },

  /**
   * 发表评论：写入 localStorage，返回入库后的意见对象（含身份徽章字段）
   */
  addOpinion(variableId: string, text: string): Opinion {
    const state = readState()
    const user = UserContext.get()
    const opinion: Opinion = {
      id: `op-local-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      variableId,
      author: user.name,
      role: user.role,
      roleLabel: ROLE_LABELS[user.role] || user.role,
      text: text.trim(),
      createdAt: formatDateTime(new Date()),
      likes: 0,
      voted: false
    }
    state.opinions = [opinion, ...state.opinions]
    writeState(state)
    return opinion
  },

  /**
   * 变量级点赞 / 取消点赞（一个变量本机只能赞一次，可再点取消）
   * @returns 该变量最新赞数与本机票态
   */
  toggleVariableVote(variableId: string): { likes: number; voted: boolean } {
    const state = readState()
    const voted = !!state.varVotes[variableId]
    if (voted) delete state.varVotes[variableId]
    else state.varVotes[variableId] = true
    writeState(state)
    return { likes: this.likesOf(variableId), voted: !voted }
  },

  /**
   * 本机是否已给该变量点赞（详情页按钮态唯一来源）
   */
  variableVoted(variableId: string): boolean {
    return !!readState().varVotes[variableId]
  },

  /**
   * 变量级赞数合计（列表列与详情页的唯一来源）
   * = 历史意见赞合计 + 本地新增意见赞 + 本机对该变量的投票（0/1）
   */
  likesOf(variableId: string): number {
    const state = readState()
    const seeded = seedOpinions(variableId).reduce((a, o) => a + o.likes, 0)
    const local = state.opinions
      .filter((o) => o.variableId === variableId)
      .reduce((a, o) => a + (Number(o.likes) || 0), 0)
    return seeded + local + (state.varVotes[variableId] ? 1 : 0)
  },

  /**
   * 变量级评论数合计（列表列的唯一来源）
   */
  commentsOf(variableId: string): number {
    return this.listOpinions(variableId).length
  },

  /**
   * 批量标记：理由必填，返回本次标记数量（供「本次标记 N 个变量」文案）
   */
  markVariables(ids: string[], type: MarkType, reason: string): { marked: number } {
    if (!ids.length || !reason || !reason.trim()) return { marked: 0 }
    const state = readState()
    const user = UserContext.get()
    const at = formatDateTime(new Date())
    const ds = getDataset()
    const records: MarkRecord[] = ids.map((id, i) => {
      const sample = ds.byId.get(id)
      return {
        id: `mark-${Date.now()}-${i}`,
        variableId: id,
        variableName: sample ? sample.name : id,
        type,
        typeLabel: MARK_TYPE_LABELS[type],
        reason: reason.trim(),
        operator: user.name,
        operatorRole: ROLE_LABELS[user.role] || user.role,
        createdAt: at
      }
    })
    state.marks = [...records, ...state.marks]
    writeState(state)
    return { marked: records.length }
  },

  /**
   * 标记记录列表：可按变量过滤，不传 ID 返回全量
   */
  listMarks(variableId?: string): MarkRecord[] {
    const all = readState().marks
    return variableId ? all.filter((m) => m.variableId === variableId) : all
  },

  /**
   * 已被人工标记的变量 ID 集合（推荐列表 marked 列的唯一来源）
   */
  markedIds(): Map<string, MarkType> {
    const map = new Map<string, MarkType>()
    readState().marks.forEach((m) => map.set(m.variableId, m.type))
    return map
  },

  /** 清空本地标记与意见（演示重置用） */
  resetLocal() {
    try {
      localStorage.removeItem(OPINION_KEY)
      localStorage.removeItem(MARK_KEY)
    } catch {
      // ignore
    }
  }
}

export default effectOpinionStore
