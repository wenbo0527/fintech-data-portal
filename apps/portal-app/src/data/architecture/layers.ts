export type Layer = { id: string; index: number; title: string; parallax: number }
export const layers: Layer[] = [
  { id: 'source', index: 0, title: '数据源', parallax: 0.95 },
  { id: 'warehouse', index: 1, title: '数据仓库', parallax: 0.9 },
  { id: 'market', index: 2, title: '数据集市', parallax: 0.8 },
  { id: 'processing', index: 3, title: '数据应用', parallax: 0.7 },
  { id: 'business', index: 4, title: '业务场景', parallax: 0.6 }
]
