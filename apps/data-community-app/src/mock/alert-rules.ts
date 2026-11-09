// 预警规则 Mock 数据源（REST 风格）
export type AlertRule = {
  id: number
  name: string
  type: 'inventory' | 'expiry' | 'failure'
  description?: string
  conditions: {
    granularity: 'coupon_stock' | 'coupon_package' | 'coupon_instance_lifecycle'
    metricConfigs: Array<{ metric: string; operator: string; threshold: number; window?: 'today' | '24h' | '7d' }>
    scope?: string[]
    selectedInventories?: string[]
    selectedPackages?: (string | number)[]
  }
  channels: string[]
  contentUnified?: string
  recipientsUnified?: string[]
  handling?: { severity: 'minor' | 'major' | 'critical'; cooldownMinutes: number }
  enabled: boolean
  createdAt: string
  triggerCount: number
  lastTriggerTime: string | null
}

const now = () => new Date().toISOString().replace('T', ' ').substring(0, 19)

export const mockAlertRules: AlertRule[] = [
  {
    id: 1001,
    name: '库存不足预警',
    type: 'inventory',
    description: '监控券库存剩余比例低于阈值',
    conditions: {
      granularity: 'coupon_stock',
      metricConfigs: [
        { metric: 'remaining_stock_ratio', operator: 'less_than', threshold: 20 }
      ],
      scope: ['all_stock']
    },
    channels: ['wechat'],
    contentUnified: '库存低于20%，请及时补充库存',
    recipientsUnified: ['U1001', 'U2002'],
    handling: { severity: 'major', cooldownMinutes: 30 },
    enabled: true,
    createdAt: now(),
    triggerCount: 12,
    lastTriggerTime: now()
  },
  {
    id: 1002,
    name: '券包下发成功率预警',
    type: 'inventory',
    description: '监控当日下发成功率异常',
    conditions: {
      granularity: 'coupon_package',
      metricConfigs: [
        { metric: 'daily_distribution_success_rate', operator: 'less_than', threshold: 85, window: 'today' }
      ],
      selectedPackages: [1]
    },
    channels: ['wechat', 'sms'],
    contentUnified: '今日券包下发成功率低于85%，请排查接口与链路',
    recipientsUnified: ['18800001111'],
    handling: { severity: 'critical', cooldownMinutes: 60 },
    enabled: true,
    createdAt: now(),
    triggerCount: 5,
    lastTriggerTime: now()
  }
]

