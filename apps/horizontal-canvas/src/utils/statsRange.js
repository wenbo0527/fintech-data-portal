import { parseDateStr, toDateStr } from './canvasFlowDataset.js'

/**
 * 通用时间筛选器（模块 D）预设项
 * 说明：预设均为「含今天」的闭区间；自定义区间由调用方传入起止日期。
 */
export const STATS_PRESETS = [
  { key: 'today', label: '今日', days: 1 },
  { key: '7d', label: '近 7 天', days: 7 },
  { key: '30d', label: '近 30 天', days: 30 },
  { key: '90d', label: '近 90 天', days: 90 }
]

/** 自定义区间最大跨度（与 mock 层 MAX_DAYS 对齐，超出按性能阈值裁剪） */
export const MAX_RANGE_DAYS = 90

/**
 * 计算闭区间天数
 * 入参：from(string)、to(string)
 * 返回：天数（>=1）
 */
function diffDays(from, to) {
  const s = parseDateStr(from)
  const e = parseDateStr(to)
  if (!s || !e || e < s) return 1
  return Math.floor((e.getTime() - s.getTime()) / 86400000) + 1
}

/**
 * 按预设推导请求区间
 * 入参：preset(string)、now(Date)
 * 返回：{ from, to }；未知预设回退近 7 天
 */
function resolvePresetRange(preset, now) {
  const base = now instanceof Date ? now : new Date()
  const today = toDateStr(base)
  const matched = STATS_PRESETS.find(p => p.key === preset) || STATS_PRESETS[1]
  const start = new Date(base.getFullYear(), base.getMonth(), base.getDate() - (matched.days - 1))
  return { from: toDateStr(start), to: today }
}

/**
 * 解析统计区间（含画布运行周期裁剪）
 * 说明：R41 默认近 7 天含今天；R43 起止为闭区间；R44 超出运行周期自动裁剪并提示。
 * 入参：options(object)
 *      - preset：预设 key（today/7d/30d/90d/custom）
 *      - from / to：自定义区间起止（YYYY-MM-DD）
 *      - runFrom / runTo：画布运行周期（YYYY-MM-DD），可为空表示不裁剪
 *      - now：参考时间（Date）
 * 返回：{ preset, from, to, days, label, clipped, clipHint, invalid }
 */
export function resolveStatsRange(options = {}) {
  const now = options.now instanceof Date ? options.now : new Date()
  const preset = options.preset || '7d'
  let from = ''
  let to = ''
  let invalid = false

  if (preset === 'custom') {
    from = String(options.from || '')
    to = String(options.to || '')
    if (!from || !to) invalid = true
    else if (parseDateStr(from) > parseDateStr(to)) invalid = true
    else if (diffDays(from, to) > MAX_RANGE_DAYS) {
      // E24：跨度超限，按上限截断到结束日往前 MAX_RANGE_DAYS 天
      const end = parseDateStr(to)
      const clippedStart = new Date(end.getFullYear(), end.getMonth(), end.getDate() - (MAX_RANGE_DAYS - 1))
      from = toDateStr(clippedStart)
      invalid = true
    }
  } else {
    const r = resolvePresetRange(preset, now)
    from = r.from
    to = r.to
  }

  // R44：超出画布运行周期时自动裁剪
  let clipped = false
  const runFrom = options.runFrom || ''
  const runTo = options.runTo || ''
  if (runFrom && runTo && !invalid) {
    const clippedFrom = from < runFrom ? runFrom : from
    const clippedTo = to > runTo ? runTo : to
    if (clippedFrom !== from || clippedTo !== to) {
      clipped = true
      from = clippedFrom
      to = clippedTo
    }
  }

  const days = invalid ? 1 : diffDays(from, to)
  const label = preset === 'custom' ? `${from} 至 ${to}` : (STATS_PRESETS.find(p => p.key === preset)?.label || '近 7 天')
  const clipHint = clipped ? `已自动裁剪至画布运行周期：${runFrom} 至 ${runTo}` : ''

  return { preset, from, to, days, label, clipped, clipHint, invalid }
}

/**
 * 判断某日期是否为今天
 * 入参：dateStr(string)、now(Date)
 * 返回：boolean
 */
export function isToday(dateStr, now) {
  const base = now instanceof Date ? now : new Date()
  return String(dateStr || '') === toDateStr(base)
}

/*
用途：通用时间筛选器（模块 D）的区间推导与裁剪
说明：预设与自定义区间统一输出 { from, to, days }，供 KPI、趋势、节点抽屉、客户明细统一取数。
边界：仅做区间推导，不负责数据查询；数据口径由 runtimeStatsMock 保证。
*/
