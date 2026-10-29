/**
 * 变量效果评估 · 规则阈值与推送配置 store（mock 单例）
 *
 * 持久化：localStorage `effect.rule`（阈值 + 推送开关）、`effect.push`（穿梭框选择）
 * 文档「命中预览实时算」转译为本 store 内计算，组件不得自行 filter 出命中数。
 */

import { formatDateTime, getDataset, toRow } from './generator'
import { effectOpinionStore } from './opinion-store'
import type { EffectRow, RuleConfig } from './types'

const RULE_KEY = 'effect.rule'
const PUSH_KEY = 'effect.push'

/** 默认阈值：与生成器切分口径对齐（63 / 118 条） */
const DEFAULT_RULE: RuleConfig = {
  offlineIndexBelow: 46,
  onlineIndexAbove: 78,
  minCalls: 1,
  maxMissingRate: 0.12,
  dpd30WorseThan: 0.052,
  pushEnabled: true,
  pushTargets: ['risk_strategy_group'],
  updatedAt: '2026-10-28 06:30:00',
  updatedBy: '小李'
}

/** 推送候选对象字典 */
export const PUSH_CANDIDATES = [
  { id: 'risk_strategy_group', name: '风控策略组' },
  { id: 'risk_data_group', name: '风险数据组' },
  { id: 'model_team', name: '建模团队' },
  { id: 'external_data_owner', name: '外数采购负责人' },
  { id: 'compliance', name: '合规审计' },
  { id: 'loan_mid_office', name: '贷中运营' }
]

/**
 * 阈值字段元数据：配置页表单文案与入参历史字段名的唯一来源
 * 页面只按这里的 label / hint 渲染，不在组件里硬编码口径说明
 */
export const RULE_FIELD_METAS: {
  key: keyof RuleConfig
  label: string
  hint: string
  /** number=数值输入，boolean=开关，array=多选（array 不参与表单逐字段渲染，仅用于文案与差异比较） */
  kind: 'number' | 'boolean' | 'array'
  min?: number
  max?: number
  step?: number
  /** 展示后缀（百分号等） */
  suffix?: string
}[] = [
  { key: 'offlineIndexBelow', label: '汰换阈值（效果指数低于）', hint: '综合效果指数小于该值的变量进入「汰换」名单', kind: 'number', min: 0, max: 100, step: 1 },
  { key: 'onlineIndexAbove', label: '推荐阈值（效果指数高于）', hint: '综合效果指数大于该值的变量进入「推荐」名单', kind: 'number', min: 0, max: 100, step: 1 },
  { key: 'minCalls', label: '最小月调用量（万次）', hint: '低于该调用量的变量不判定，避免小样本误判', kind: 'number', min: 0, max: 1000, step: 1 },
  { key: 'maxMissingRate', label: '缺失率上限', hint: '缺失率高于该值的变量先剔除，建议先对齐上游产出', kind: 'number', min: 0, max: 1, step: 0.01, suffix: '%' },
  { key: 'dpd30WorseThan', label: 'MOB3 DPD30 恶化线', hint: '逾期率高于该值视为表现恶化，作为汰换的辅助证据', kind: 'number', min: 0, max: 1, step: 0.005, suffix: '%' },
  { key: 'pushEnabled', label: '名单自动推送', hint: '关闭后跑批仍产出名单，只是不推送给协作对象', kind: 'boolean' },
  { key: 'pushTargets', label: '推送对象', hint: '批次产出后自动发送名单的协作对象', kind: 'array' }
]

/** 字段名 → 中文标签（入参历史表用） */
export const RULE_FIELD_LABELS: Record<string, string> = RULE_FIELD_METAS.reduce((acc, m) => {
  acc[m.key as string] = m.label
  return acc
}, {} as Record<string, string>)

/**
 * 阈值取值 → 展示文案（百分号 / 开关 / 原值）
 * 与 RULE_FIELD_METAS 放在一起，保证配置页、任务详情、入参历史三处格式一致
 */
export function formatRuleValue(meta: (typeof RULE_FIELD_METAS)[number], raw: unknown): string {
  if (meta.kind === 'boolean') return raw ? '开启' : '关闭'
  if (raw === undefined || raw === null || raw === '') return '—'
  if (meta.kind === 'array') {
    const ids = Array.isArray(raw) ? (raw as string[]) : []
    if (!ids.length) return '未选择'
    const nameMap = new Map(PUSH_CANDIDATES.map((c) => [c.id, c.name]))
    return ids.map((id) => nameMap.get(id) || id).join('、')
  }
  if (meta.suffix === '%') {
    const digits = (meta.step ?? 1) < 0.01 ? 2 : 1
    return `${((Number(raw) || 0) * 100).toFixed(digits)}%`
  }
  return String(raw)
}

/** 数值阈值字段（配置页表单上半区） */
export const RULE_NUMBER_METAS = RULE_FIELD_METAS.filter((m) => m.kind === 'number')

/** 开关型字段（配置页表单下半区，目前只有名单自动推送） */
export const RULE_SWITCH_METAS = RULE_FIELD_METAS.filter((m) => m.kind === 'boolean')

/**
 * 阈值合法性判定：状态判断集中在 mock 层，页面不自己比较大小
 * @returns ok 是否可保存；message 提示文案；previewBlocked 阈值区间冲突（预览与试跑也无意义）
 */
export function validateRule(rule: Partial<RuleConfig>): {
  ok: boolean
  message: string
  previewBlocked: boolean
} {
  const offline = Number(rule.offlineIndexBelow)
  const online = Number(rule.onlineIndexAbove)
  if (!(offline >= 0) || !(online >= 0)) {
    return { ok: false, message: '阈值不能为负数，请修正后再保存。', previewBlocked: true }
  }
  if (offline >= online) {
    return {
      ok: false,
      message: `汰换阈值（${offline}）必须小于推荐阈值（${online}），否则同一条变量会同时进两份名单。`,
      previewBlocked: true
    }
  }
  /** 推送开关与对象的关系也在此判定，页面不自己拼校验（不影响预览） */
  if (rule.pushEnabled === true && (!Array.isArray(rule.pushTargets) || rule.pushTargets.length === 0)) {
    return { ok: false, message: '已开启名单推送，请至少选择一个推送对象，或关闭推送开关。', previewBlocked: false }
  }
  return { ok: true, message: '', previewBlocked: false }
}

/**
 * 读取本地阈值配置并与默认值合并
 * 目的：老数据缺字段时用默认值兜底，避免页面拿到 undefined
 */
function readRule(): RuleConfig {
  try {
    const raw = localStorage.getItem(RULE_KEY)
    const push = localStorage.getItem(PUSH_KEY)
    const base = raw ? { ...DEFAULT_RULE, ...(JSON.parse(raw) as Partial<RuleConfig>) } : { ...DEFAULT_RULE }
    if (push) {
      const parsed = JSON.parse(push)
      if (Array.isArray(parsed.targets)) base.pushTargets = parsed.targets
      if (typeof parsed.enabled === 'boolean') base.pushEnabled = parsed.enabled
    }
    return base
  } catch {
    return { ...DEFAULT_RULE }
  }
}

/** 写回 localStorage（阈值与推送分开存，对应文档的 rule / push 两个子 Tab） */
function writeRule(rule: RuleConfig) {
  try {
    localStorage.setItem(RULE_KEY, JSON.stringify({ ...rule, pushTargets: undefined, pushEnabled: undefined }))
    localStorage.setItem(PUSH_KEY, JSON.stringify({ enabled: rule.pushEnabled, targets: rule.pushTargets }))
  } catch {
    // 演示环境忽略配额异常
  }
}

export const effectRuleStore = {
  /** 规则阈值配置读取 */
  getRule(): RuleConfig {
    return readRule()
  },

  /** 默认阈值（重置按钮用） */
  defaultRule(): RuleConfig {
    return { ...DEFAULT_RULE }
  },

  /**
   * 保存阈值：合并 patch 后持久化，返回保存后的完整配置
   */
  saveRule(patch: Partial<RuleConfig>): RuleConfig {
    const next = { ...readRule(), ...patch, updatedAt: formatDateTime(new Date()) }
    writeRule(next)
    return next
  },

  /**
   * 命中预览：按传入阈值实时算命中数与样例
   * 在 store 内计算并直接返回文案所需的分档计数，组件只渲染
   */
  previewHit(rule: RuleConfig): {
    hitCount: number
    sampleRows: EffectRow[]
    offlineHit: number
    onlineHit: number
    excludedByCalls: number
    excludedByMissing: number
    /** 剔除合计：在 store 内相加，页面不得再做算术 */
    excludedTotal: number
  } {
    const ds = getDataset()
    const marked = effectOpinionStore.markedIds()
    /** 先剔无效样本（调用量不足 / 缺失率超限），再按指数分档，保证预览与列表口径一致 */
    const excludedByCalls = ds.samples.filter((s) => s.callCount < rule.minCalls).length
    const eligible = ds.samples.filter((s) => s.callCount >= rule.minCalls)
    const excludedByMissing = eligible.filter((s) => s.missingRate > rule.maxMissingRate).length
    const judged = eligible.filter((s) => s.missingRate <= rule.maxMissingRate)
    const offlineHit = judged.filter((s) => s.effectIndex < rule.offlineIndexBelow).length
    const onlineHit = judged.filter((s) => s.effectIndex > rule.onlineIndexAbove).length
    const sampleRows = judged
      .filter((s) => s.effectIndex < rule.offlineIndexBelow || s.effectIndex > rule.onlineIndexAbove)
      .slice(0, 10)
      .map((s) => {
        const row = toRow(s)
        return { ...row, likes: effectOpinionStore.likesOf(s.variableId), comments: effectOpinionStore.commentsOf(s.variableId), marked: marked.has(s.variableId), markType: marked.get(s.variableId) }
      })
    return {
      hitCount: offlineHit + onlineHit,
      sampleRows,
      offlineHit,
      onlineHit,
      excludedByCalls,
      excludedByMissing,
      excludedTotal: excludedByCalls + excludedByMissing
    }
  },

  /** 推送候选对象（穿梭框数据源） */
  pushCandidates() {
    return PUSH_CANDIDATES.map((c) => ({ ...c }))
  },

  /**
   * 草稿与已保存配置的差异比较
   * 页面只显示 changed 的数量与字段名，不自己逐字段比对
   */
  diffRule(draft: Partial<RuleConfig>): { dirty: boolean; changedCount: number; changedLabels: string[] } {
    const current = readRule()
    const changedLabels: string[] = []
    RULE_FIELD_METAS.forEach((m) => {
      const a = current[m.key]
      const b = draft[m.key]
      if (m.kind === 'boolean') {
        if (Boolean(a) !== Boolean(b)) changedLabels.push(m.label)
        return
      }
      if (Array.isArray(a) || Array.isArray(b)) {
        const sa = JSON.stringify([...(a as string[])].sort())
        const sb = JSON.stringify([...((b as string[]) || [])].sort())
        if (sa !== sb) changedLabels.push(m.label)
        return
      }
      if (Number(a) !== Number(b)) changedLabels.push(m.label)
    })
    return { dirty: changedLabels.length > 0, changedCount: changedLabels.length, changedLabels }
  }
}

export default effectRuleStore
