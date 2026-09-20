import { resolveSupplierId } from './supplierDictionary'

export interface Pricing {
  supplierId: string
  productCode: string
  billingType: 'fixed' | 'tiered' | 'volume' | 'special'
  unit: 'call' | 'record' | 'gb'
  currency: 'CNY' | 'USD'
  unitPrice?: number
  taxRate: number
  tiers?: Array<{ lower: number; upper?: number; price: number }>
  formula?: 'manual' | 'capped' | 'bundled'
  remark?: string
}

const pricingMock: Pricing[] = [
  { supplierId: 'SUP-001', productCode: 'XUEXIN_ID_VERIFY', billingType: 'fixed', unit: 'record', currency: 'CNY', taxRate: 0.06, unitPrice: 0.08 },
  { supplierId: 'SUP-001', productCode: 'XUEXIN_DEGREE_VERIFY', billingType: 'fixed', unit: 'record', currency: 'CNY', taxRate: 0.06, unitPrice: 0.10 },
  { supplierId: 'SUP-001', productCode: 'XUEXIN_STATUS_CHECK', billingType: 'fixed', unit: 'record', currency: 'CNY', taxRate: 0.06, unitPrice: 0.07 },
  { supplierId: 'SUP-001', productCode: 'XUEXIN_ENROLL_VERIFY', billingType: 'fixed', unit: 'record', currency: 'CNY', taxRate: 0.06, unitPrice: 0.09 },
  { supplierId: 'SUP-002', productCode: 'BH_CREDIT_SCORE', billingType: 'fixed', unit: 'record', currency: 'CNY', taxRate: 0.06, unitPrice: 0.06 },
  { supplierId: 'SUP-002', productCode: 'BH_ID_VALIDATION', billingType: 'fixed', unit: 'record', currency: 'CNY', taxRate: 0.06, unitPrice: 0.05 },
  { supplierId: 'SUP-002', productCode: 'BH_PHONE_RISK', billingType: 'fixed', unit: 'record', currency: 'CNY', taxRate: 0.06, unitPrice: 0.04 },
  { supplierId: 'SUP-002', productCode: 'BH_BLACKLIST_CHECK', billingType: 'fixed', unit: 'record', currency: 'CNY', taxRate: 0.06, unitPrice: 0.03 },
  { supplierId: 'SUP-003', productCode: 'PD_LOCATION_RISK', billingType: 'fixed', unit: 'record', currency: 'CNY', taxRate: 0.06, unitPrice: 0.04 },
  { supplierId: 'SUP-003', productCode: 'PD_DEVICE_FINGERPRINT', billingType: 'fixed', unit: 'record', currency: 'CNY', taxRate: 0.06, unitPrice: 0.05 },
  { supplierId: 'SUP-003', productCode: 'PD_IP_RISK', billingType: 'fixed', unit: 'record', currency: 'CNY', taxRate: 0.06, unitPrice: 0.03 },
  { supplierId: 'SUP-003', productCode: 'PD_BEHAVIOR_RISK', billingType: 'fixed', unit: 'record', currency: 'CNY', taxRate: 0.06, unitPrice: 0.06 },
  { supplierId: 'SUP-002', productCode: 'BH_CREDIT_QUERY', billingType: 'tiered', unit: 'record', currency: 'CNY', taxRate: 0.06, tiers: [ { lower: 0, upper: 10000, price: 0.12 }, { lower: 10000, upper: 30000, price: 0.10 }, { lower: 30000, price: 0.09 } ] },
  { supplierId: 'SUP-002', productCode: 'BH_MULTI_QUERY', billingType: 'tiered', unit: 'record', currency: 'CNY', taxRate: 0.06, tiers: [ { lower: 0, upper: 8000, price: 0.15 }, { lower: 8000, upper: 20000, price: 0.12 }, { lower: 20000, price: 0.10 } ] },
  { supplierId: 'SUP-001', productCode: 'XUEXIN_BATCH_DEGREE', billingType: 'tiered', unit: 'record', currency: 'CNY', taxRate: 0.06, tiers: [ { lower: 0, upper: 5000, price: 0.11 }, { lower: 5000, upper: 15000, price: 0.09 }, { lower: 15000, price: 0.08 } ] },
  { supplierId: 'SUP-001', productCode: 'XUEXIN_BATCH_STATUS', billingType: 'tiered', unit: 'record', currency: 'CNY', taxRate: 0.06, tiers: [ { lower: 0, upper: 6000, price: 0.10 }, { lower: 6000, upper: 18000, price: 0.08 }, { lower: 18000, price: 0.07 } ] },
  { supplierId: 'SUP-003', productCode: 'PD_TRAFFIC_ANALYSIS', billingType: 'tiered', unit: 'record', currency: 'CNY', taxRate: 0.06, tiers: [ { lower: 0, upper: 10000, price: 0.06 }, { lower: 10000, upper: 30000, price: 0.05 }, { lower: 30000, price: 0.045 } ] },
  { supplierId: 'SUP-003', productCode: 'PD_DEVICE_CLUSTER', billingType: 'tiered', unit: 'record', currency: 'CNY', taxRate: 0.06, tiers: [ { lower: 0, upper: 7000, price: 0.08 }, { lower: 7000, upper: 20000, price: 0.07 }, { lower: 20000, price: 0.06 } ] },
  { supplierId: 'SUP-003', productCode: 'PD_DEVICE_RISK', billingType: 'special', unit: 'record', currency: 'CNY', taxRate: 0.06, formula: 'manual', remark: '特殊计费：设备风险识别按包计费' },
  { supplierId: 'SUP-001', productCode: 'XUEXIN_SPECIAL_AUDIT', billingType: 'special', unit: 'record', currency: 'CNY', taxRate: 0.06, formula: 'manual', remark: '特殊计费：需人工核算' }
];

// 额外补充：按量计费（volume）产品
pricingMock.push(
  { supplierId: 'SUP-001', productCode: 'XUEXIN_BATCH_EXPORT', billingType: 'volume', unit: 'record', currency: 'CNY', taxRate: 0.06, unitPrice: 0.02, remark: '批量导出服务' },
  { supplierId: 'SUP-002', productCode: 'BH_DATA_EXPORT', billingType: 'volume', unit: 'record', currency: 'CNY', taxRate: 0.06, unitPrice: 0.025, remark: '批量导出服务' },
  { supplierId: 'SUP-003', productCode: 'PD_DATA_EXPORT', billingType: 'volume', unit: 'record', currency: 'CNY', taxRate: 0.06, unitPrice: 0.018, remark: '批量导出服务' },
  // 钱塘征信（对应 C004 钱塘征信框架协议，3 个数据产品 + 批量导出服务）
  { supplierId: 'SUP-004', productCode: 'QT_CREDIT_RISK_SCORE', billingType: 'fixed', unit: 'record', currency: 'CNY', taxRate: 0.06, unitPrice: 0.06, remark: '钱塘框架协议单价' },
  { supplierId: 'SUP-004', productCode: 'QT_FRAUD_BLACKLIST', billingType: 'fixed', unit: 'record', currency: 'CNY', taxRate: 0.06, unitPrice: 0.035, remark: '钱塘框架协议单价' },
  { supplierId: 'SUP-004', productCode: 'QT_ENTERPRISE_TAX_INVOICE', billingType: 'tiered', unit: 'record', currency: 'CNY', taxRate: 0.06, tiers: [{ lower: 0, upper: 100000, price: 0.11 }, { lower: 100000, upper: 500000, price: 0.085 }, { lower: 500000, price: 0.07 }], remark: '阶梯定价' },
  { supplierId: 'SUP-004', productCode: 'QT_BATCH_DATA_EXPORT', billingType: 'volume', unit: 'record', currency: 'CNY', taxRate: 0.06, unitPrice: 0.02, remark: '按月用量计费' }
)

// 合作机构名称（全称/简称/短名称）→ SUP-ID 统一走 supplierDictionary 解析，避免别名遗漏

export async function getActivePricing(supplierId: string, productCode: string): Promise<Pricing | null> {
  const normalizedId = resolveSupplierId(supplierId)
  const found = pricingMock.find(p => p.supplierId === normalizedId && p.productCode === productCode) || null
  return Promise.resolve(found)
}

export async function getActivePricingMap(supplierId: string): Promise<Record<string, Pricing>> {
  const map: Record<string, Pricing> = {}
  const normalizedId = resolveSupplierId(supplierId)
  for (const p of pricingMock) { if (p.supplierId === normalizedId) map[p.productCode] = p }
  return Promise.resolve(map)
}
