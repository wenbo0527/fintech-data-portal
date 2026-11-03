/**
 * 稳定散列工具 · mock 展示派生的唯一随机源替身
 *
 * 需求背景：改造前多处用 Math.random() 现算文件大小、版本号、校验是否通过，
 * 同一条数据每次刷新都不一样，既没法断言也没法复现评审结论。
 * 这里用 FNV-1a 32 位散列把「随机」换成「按 key 稳定」：
 * 同一个 seed 永远得到同一个值，不同 seed 之间仍有明显区分度，够 mock 用。
 */

/** FNV-1a 散列原始值（无符号 32 位） */
function fnv1a(seed: string): number {
  let h = 2166136261
  const s = String(seed ?? '')
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** 散列归一到 [0,1)，用于按比例派生指标 */
export function hashUnit(seed: string): number {
  return (fnv1a(seed) % 100000) / 100000
}

/** 散列映射到 [min,max] 闭区间整数，用于文件大小、流水号尾段等 */
export function hashInt(seed: string, min: number, max: number): number {
  const lo = Math.min(min, max)
  const hi = Math.max(min, max)
  return lo + (fnv1a(seed) % (hi - lo + 1))
}

/** 按 seed 从列表里稳定取一项（替代 `list[Math.floor(Math.random() * list.length)]`） */
export function hashPick<T>(list: T[], seed: string): T | undefined {
  if (!list || !list.length) {return undefined}
  return list[fnv1a(seed) % list.length]
}
