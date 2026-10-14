export const nodeTypes = {
  start: { label: '开始', color: '#2563eb' },
  end: { label: '结束', color: '#475569' },
  'crowd-split': { label: '人群分流', color: '#dc2626' },
  'event-split': { label: '事件分流', color: '#ef4444' },
  'ab-test': { label: 'AB实验', color: '#b91c1c' },
  sms: { label: '短信', color: '#059669' },
  'ai-call': { label: 'AI外呼', color: '#047857' },
  'manual-call': { label: '人工外呼', color: '#047857' },
  'app-push': { label: 'APP PUSH', color: '#10b981' },
  'wechat-push': { label: '公众号推送', color: '#059669' },
  benefit: { label: '权益', color: '#ea580c' },
  wait: { label: '等待', color: '#7c3aed' },
  // 高级节点（不渲染实体；仅在选择器中作为入口，点击后生成两个真实节点）
  'sms-touch-combo': { label: '短信触达成功', color: '#059669' },
  'ai-touch-combo': { label: 'AI外呼触达成功', color: '#047857' },
  'benefit-touch-combo': { label: '权益下发成功', color: '#ea580c' }
}

// 高级节点 → 真实子节点类型映射（顺序：先放触达节点，再放事件分流）
export const TOUCH_COMBOS = {
  'sms-touch-combo': {
    outreach: { type: 'sms', label: '短信' },
    split: { type: 'event-split', eventType: 'custom', customEventName: '短信触达成功' }
  },
  'ai-touch-combo': {
    outreach: { type: 'ai-call', label: 'AI外呼' },
    split: { type: 'event-split', eventType: 'custom', customEventName: 'AI触达成功' }
  },
  'benefit-touch-combo': {
    outreach: { type: 'benefit', label: '权益' },
    split: { type: 'event-split', eventType: 'custom', customEventName: '权益下发成功' }
  }
}

export const getNodeConfig = (t) => nodeTypes[t] || null
export const getNodeLabel = (t) => (nodeTypes[t]?.label || t || '节点')
export const getAllNodeTypes = () => Object.keys(nodeTypes)
