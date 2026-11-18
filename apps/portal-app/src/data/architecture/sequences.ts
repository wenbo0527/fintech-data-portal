export type Sequence = { id: string; name: string; nodeIds: string[] }
export const sequences: Sequence[] = [
  { id: 's1', name: '采集到分析', nodeIds: ['collector', 'stream', 'insight'] }
]
