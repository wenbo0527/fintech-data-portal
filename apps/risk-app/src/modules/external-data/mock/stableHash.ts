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

/**
 * 按 seed 派生一条确定性随机流，用于给 mock 样例数据连续铺行/铺列。
 *
 * 存在的理由：散点取值靠 hashUnit 就够，但「按表名生成 50 行 × N 列」需要每次调用
 * 都推进状态，各页面若各自再抄一份 FNV + 同余生成器，就会出现同一张表在不同入口
 * 取到不同数据、且散列实现失控（G9 单一事实源）。统一到这里，页面只认 makeStableRng。
 */
export function makeStableRng(seed: string): () => number {
  let h = fnv1a(seed)
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return ((h ^= h >>> 16) >>> 0) / 4294967296
  }
}
