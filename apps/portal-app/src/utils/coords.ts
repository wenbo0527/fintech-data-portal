export const Cx = 8.0
export const Cy = 22.0
export const Sx = 8.0
export const Sy = 8.0
export const alpha = 1.0
export const beta = -1.0

export function computeRel(L: number, N: number) {
  const x = (L - 1) * Sx * alpha + (N - 1) * Sx + 13.0
  const y = (L - 1) * Sy * beta + (26 - N) * Sy - 5.0
  return { x, y }
}

export function computeAbs(L: number, N: number) {
  const r = computeRel(L, N)
  return { xPct: r.x + Cx, yPct: r.y + Cy }
}

