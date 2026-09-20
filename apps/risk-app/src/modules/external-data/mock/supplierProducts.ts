import type { SupplierProduct } from '../../external-data/types/supplier'
import { resolveSupplierId } from '../../budget/api/supplierDictionary'

const now = new Date().toISOString()

export const supplierProductsMock: SupplierProduct[] = [
  { id: 'SP-001-XUEXIN_ID_VERIFY', supplierId: 'SUP-001', productId: 'P-XUEXIN_ID_VERIFY', productCode: 'XUEXIN_ID_VERIFY', productName: '学籍身份核验', category: 'DATA', status: 'active', interfaceCount: 1, hasContract: true, createdAt: now, updatedAt: now },
  { id: 'SP-001-XUEXIN_DEGREE_VERIFY', supplierId: 'SUP-001', productId: 'P-XUEXIN_DEGREE_VERIFY', productCode: 'XUEXIN_DEGREE_VERIFY', productName: '学历认证查询', category: 'DATA', status: 'active', interfaceCount: 1, hasContract: true, createdAt: now, updatedAt: now },
  { id: 'SP-001-XUEXIN_STATUS_CHECK', supplierId: 'SUP-001', productId: 'P-XUEXIN_STATUS_CHECK', productCode: 'XUEXIN_STATUS_CHECK', productName: '在学状态核验', category: 'DATA', status: 'active', interfaceCount: 1, hasContract: true, createdAt: now, updatedAt: now },
  { id: 'SP-001-XUEXIN_ENROLL_VERIFY', supplierId: 'SUP-001', productId: 'P-XUEXIN_ENROLL_VERIFY', productCode: 'XUEXIN_ENROLL_VERIFY', productName: '入学信息核验', category: 'DATA', status: 'active', interfaceCount: 1, hasContract: true, createdAt: now, updatedAt: now },
  { id: 'SP-002-BH_CREDIT_SCORE', supplierId: 'SUP-002', productId: 'P-BH_CREDIT_SCORE', productCode: 'BH_CREDIT_SCORE', productName: '百行信用评分', category: 'DATA', status: 'active', interfaceCount: 1, hasContract: true, createdAt: now, updatedAt: now },
  { id: 'SP-002-BH_ID_VALIDATION', supplierId: 'SUP-002', productId: 'P-BH_ID_VALIDATION', productCode: 'BH_ID_VALIDATION', productName: '身份有效性核验', category: 'DATA', status: 'active', interfaceCount: 1, hasContract: true, createdAt: now, updatedAt: now },
  { id: 'SP-002-BH_PHONE_RISK', supplierId: 'SUP-002', productId: 'P-BH_PHONE_RISK', productCode: 'BH_PHONE_RISK', productName: '手机号风险评估', category: 'DATA', status: 'active', interfaceCount: 1, hasContract: true, createdAt: now, updatedAt: now },
  { id: 'SP-002-BH_BLACKLIST_CHECK', supplierId: 'SUP-002', productId: 'P-BH_BLACKLIST_CHECK', productCode: 'BH_BLACKLIST_CHECK', productName: '黑名单查询', category: 'DATA', status: 'active', interfaceCount: 1, hasContract: true, createdAt: now, updatedAt: now },
  { id: 'SP-003-PD_LOCATION_RISK', supplierId: 'SUP-003', productId: 'P-PD_LOCATION_RISK', productCode: 'PD_LOCATION_RISK', productName: '位置风险评估', category: 'DATA', status: 'active', interfaceCount: 1, hasContract: true, createdAt: now, updatedAt: now },
  { id: 'SP-003-PD_DEVICE_FINGERPRINT', supplierId: 'SUP-003', productId: 'P-PD_DEVICE_FINGERPRINT', productCode: 'PD_DEVICE_FINGERPRINT', productName: '设备指纹分析', category: 'DATA', status: 'active', interfaceCount: 1, hasContract: true, createdAt: now, updatedAt: now },
  { id: 'SP-003-PD_IP_RISK', supplierId: 'SUP-003', productId: 'P-PD_IP_RISK', productCode: 'PD_IP_RISK', productName: 'IP风险识别', category: 'DATA', status: 'active', interfaceCount: 1, hasContract: true, createdAt: now, updatedAt: now },
  { id: 'SP-003-PD_BEHAVIOR_RISK', supplierId: 'SUP-003', productId: 'P-PD_BEHAVIOR_RISK', productCode: 'PD_BEHAVIOR_RISK', productName: '行为风险分析', category: 'DATA', status: 'active', interfaceCount: 1, hasContract: true, createdAt: now, updatedAt: now },
  { id: 'SP-002-BH_CREDIT_QUERY', supplierId: 'SUP-002', productId: 'P-BH_CREDIT_QUERY', productCode: 'BH_CREDIT_QUERY', productName: '百行征信查询', category: 'DATA', status: 'active', interfaceCount: 1, hasContract: true, createdAt: now, updatedAt: now },
  { id: 'SP-002-BH_MULTI_QUERY', supplierId: 'SUP-002', productId: 'P-BH_MULTI_QUERY', productCode: 'BH_MULTI_QUERY', productName: '多维征信查询', category: 'DATA', status: 'active', interfaceCount: 1, hasContract: true, createdAt: now, updatedAt: now },
  { id: 'SP-001-XUEXIN_BATCH_DEGREE', supplierId: 'SUP-001', productId: 'P-XUEXIN_BATCH_DEGREE', productCode: 'XUEXIN_BATCH_DEGREE', productName: '学历批量认证', category: 'DATA', status: 'active', interfaceCount: 1, hasContract: true, createdAt: now, updatedAt: now },
  { id: 'SP-001-XUEXIN_BATCH_STATUS', supplierId: 'SUP-001', productId: 'P-XUEXIN_BATCH_STATUS', productCode: 'XUEXIN_BATCH_STATUS', productName: '在学状态批量核验', category: 'DATA', status: 'active', interfaceCount: 1, hasContract: true, createdAt: now, updatedAt: now },
  { id: 'SP-003-PD_TRAFFIC_ANALYSIS', supplierId: 'SUP-003', productId: 'P-PD_TRAFFIC_ANALYSIS', productCode: 'PD_TRAFFIC_ANALYSIS', productName: '流量行为分析', category: 'DATA', status: 'active', interfaceCount: 1, hasContract: true, createdAt: now, updatedAt: now },
  { id: 'SP-003-PD_DEVICE_CLUSTER', supplierId: 'SUP-003', productId: 'P-PD_DEVICE_CLUSTER', productCode: 'PD_DEVICE_CLUSTER', productName: '设备聚类分析', category: 'DATA', status: 'active', interfaceCount: 1, hasContract: true, createdAt: now, updatedAt: now },
  { id: 'SP-003-PD_DEVICE_RISK', supplierId: 'SUP-003', productId: 'P-PD_DEVICE_RISK', productCode: 'PD_DEVICE_RISK', productName: '设备风险识别', category: 'SPECIAL', status: 'active', interfaceCount: 1, hasContract: true, createdAt: now, updatedAt: now },
  { id: 'SP-001-XUEXIN_SPECIAL_AUDIT', supplierId: 'SUP-001', productId: 'P-XUEXIN_SPECIAL_AUDIT', productCode: 'XUEXIN_SPECIAL_AUDIT', productName: '特殊教育审核', category: 'SPECIAL', status: 'active', interfaceCount: 1, hasContract: true, createdAt: now, updatedAt: now },
  // 钱塘征信（SUP-004）：与 C004 钱塘征信框架协议 productCount=3 对齐，编码与定价档案 QT_* 一致
  { id: 'SP-004-QT_CREDIT_RISK_SCORE', supplierId: 'SUP-004', productId: 'P-QT_CREDIT_RISK_SCORE', productCode: 'QT_CREDIT_RISK_SCORE', productName: '钱塘个人信用风险评分', category: 'DATA', status: 'active', interfaceCount: 1, hasContract: true, createdAt: now, updatedAt: now },
  { id: 'SP-004-QT_FRAUD_BLACKLIST', supplierId: 'SUP-004', productId: 'P-QT_FRAUD_BLACKLIST', productCode: 'QT_FRAUD_BLACKLIST', productName: '钱塘反欺诈黑名单核验', category: 'DATA', status: 'active', interfaceCount: 1, hasContract: true, createdAt: now, updatedAt: now },
  { id: 'SP-004-QT_ENTERPRISE_TAX_INVOICE', supplierId: 'SUP-004', productId: 'P-QT_ENTERPRISE_TAX_INVOICE', productCode: 'QT_ENTERPRISE_TAX_INVOICE', productName: '企业税务发票画像', category: 'DATA', status: 'active', interfaceCount: 1, hasContract: true, createdAt: now, updatedAt: now }
]

export interface ExternalDataField {
  name: string
  type: string
  comment: string
  required: boolean
}

export interface ExternalDataFieldsMap {
  [productCode: string]: ExternalDataField[]
}

export const externalDataFieldsMap: ExternalDataFieldsMap = {
  XUEXIN_ID_VERIFY: [
    { name: 'request_id', type: 'STRING', comment: '请求ID', required: true },
    { name: 'id_no', type: 'STRING', comment: '身份证号', required: true },
    { name: 'name', type: 'STRING', comment: '姓名', required: true }
  ],
  XUEXIN_DEGREE_VERIFY: [
    { name: 'request_id', type: 'STRING', comment: '请求ID', required: true },
    { name: 'id_no', type: 'STRING', comment: '身份证号', required: true },
    { name: 'name', type: 'STRING', comment: '姓名', required: true },
    { name: 'degree_type', type: 'STRING', comment: '学历类型', required: false }
  ],
  XUEXIN_STATUS_CHECK: [
    { name: 'request_id', type: 'STRING', comment: '请求ID', required: true },
    { name: 'id_no', type: 'STRING', comment: '身份证号', required: true },
    { name: 'name', type: 'STRING', comment: '姓名', required: true },
    { name: 'enroll_year', type: 'STRING', comment: '入学年份', required: false }
  ],
  XUEXIN_ENROLL_VERIFY: [
    { name: 'request_id', type: 'STRING', comment: '请求ID', required: true },
    { name: 'id_no', type: 'STRING', comment: '身份证号', required: true },
    { name: 'name', type: 'STRING', comment: '姓名', required: true },
    { name: 'university', type: 'STRING', comment: '院校名称', required: false }
  ],
  BH_CREDIT_SCORE: [
    { name: 'request_id', type: 'STRING', comment: '请求ID', required: true },
    { name: 'id_no', type: 'STRING', comment: '身份证号', required: true },
    { name: 'name', type: 'STRING', comment: '姓名', required: true },
    { name: 'mobile', type: 'STRING', comment: '手机号', required: true }
  ],
  BH_ID_VALIDATION: [
    { name: 'request_id', type: 'STRING', comment: '请求ID', required: true },
    { name: 'id_no', type: 'STRING', comment: '身份证号', required: true },
    { name: 'name', type: 'STRING', comment: '姓名', required: true }
  ],
  BH_PHONE_RISK: [
    { name: 'request_id', type: 'STRING', comment: '请求ID', required: true },
    { name: 'mobile', type: 'STRING', comment: '手机号', required: true },
    { name: 'id_no', type: 'STRING', comment: '身份证号', required: false }
  ],
  BH_BLACKLIST_CHECK: [
    { name: 'request_id', type: 'STRING', comment: '请求ID', required: true },
    { name: 'id_no', type: 'STRING', comment: '身份证号', required: true },
    { name: 'name', type: 'STRING', comment: '姓名', required: true }
  ],
  PD_LOCATION_RISK: [
    { name: 'request_id', type: 'STRING', comment: '请求ID', required: true },
    { name: 'id_no', type: 'STRING', comment: '身份证号', required: true },
    { name: 'longitude', type: 'DOUBLE', comment: '经度', required: true },
    { name: 'latitude', type: 'DOUBLE', comment: '纬度', required: true }
  ],
  PD_DEVICE_FINGERPRINT: [
    { name: 'request_id', type: 'STRING', comment: '请求ID', required: true },
    { name: 'id_no', type: 'STRING', comment: '身份证号', required: true },
    { name: 'device_id', type: 'STRING', comment: '设备ID', required: true }
  ],
  PD_IP_RISK: [
    { name: 'request_id', type: 'STRING', comment: '请求ID', required: true },
    { name: 'id_no', type: 'STRING', comment: '身份证号', required: true },
    { name: 'ip_address', type: 'STRING', comment: 'IP地址', required: true }
  ],
  PD_BEHAVIOR_RISK: [
    { name: 'request_id', type: 'STRING', comment: '请求ID', required: true },
    { name: 'id_no', type: 'STRING', comment: '身份证号', required: true },
    { name: 'behavior_type', type: 'STRING', comment: '行为类型', required: true }
  ],
  BH_CREDIT_QUERY: [
    { name: 'request_id', type: 'STRING', comment: '请求ID', required: true },
    { name: 'id_no', type: 'STRING', comment: '身份证号', required: true },
    { name: 'name', type: 'STRING', comment: '姓名', required: true },
    { name: 'mobile', type: 'STRING', comment: '手机号', required: false }
  ],
  BH_MULTI_QUERY: [
    { name: 'request_id', type: 'STRING', comment: '请求ID', required: true },
    { name: 'id_no', type: 'STRING', comment: '身份证号', required: true },
    { name: 'name', type: 'STRING', comment: '姓名', required: true },
    { name: 'mobile', type: 'STRING', comment: '手机号', required: true }
  ],
  XUEXIN_BATCH_DEGREE: [
    { name: 'request_id', type: 'STRING', comment: '请求ID', required: true },
    { name: 'id_no', type: 'STRING', comment: '身份证号', required: true },
    { name: 'name', type: 'STRING', comment: '姓名', required: true }
  ],
  XUEXIN_BATCH_STATUS: [
    { name: 'request_id', type: 'STRING', comment: '请求ID', required: true },
    { name: 'id_no', type: 'STRING', comment: '身份证号', required: true },
    { name: 'name', type: 'STRING', comment: '姓名', required: true }
  ],
  PD_TRAFFIC_ANALYSIS: [
    { name: 'request_id', type: 'STRING', comment: '请求ID', required: true },
    { name: 'id_no', type: 'STRING', comment: '身份证号', required: true },
    { name: 'device_id', type: 'STRING', comment: '设备ID', required: true },
    { name: 'traffic_type', type: 'STRING', comment: '流量类型', required: false }
  ],
  PD_DEVICE_CLUSTER: [
    { name: 'request_id', type: 'STRING', comment: '请求ID', required: true },
    { name: 'id_no', type: 'STRING', comment: '身份证号', required: true },
    { name: 'device_id', type: 'STRING', comment: '设备ID', required: true }
  ],
  PD_DEVICE_RISK: [
    { name: 'request_id', type: 'STRING', comment: '请求ID', required: true },
    { name: 'id_no', type: 'STRING', comment: '身份证号', required: true },
    { name: 'device_id', type: 'STRING', comment: '设备ID', required: true },
    { name: 'risk_type', type: 'STRING', comment: '风险类型', required: false }
  ],
  XUEXIN_SPECIAL_AUDIT: [
    { name: 'request_id', type: 'STRING', comment: '请求ID', required: true },
    { name: 'id_no', type: 'STRING', comment: '身份证号', required: true },
    { name: 'name', type: 'STRING', comment: '姓名', required: true },
    { name: 'audit_reason', type: 'STRING', comment: '审核原因', required: false }
  ],
  QT_CREDIT_RISK_SCORE: [
    { name: 'request_id', type: 'STRING', comment: '请求ID', required: true },
    { name: 'id_no', type: 'STRING', comment: '身份证号', required: true },
    { name: 'name', type: 'STRING', comment: '姓名', required: true },
    { name: 'risk_score', type: 'INT', comment: '风险评分', required: false }
  ],
  QT_FRAUD_BLACKLIST: [
    { name: 'request_id', type: 'STRING', comment: '请求ID', required: true },
    { name: 'id_no', type: 'STRING', comment: '身份证号', required: true },
    { name: 'blacklist_level', type: 'STRING', comment: '黑名单等级', required: false }
  ],
  QT_ENTERPRISE_TAX_INVOICE: [
    { name: 'request_id', type: 'STRING', comment: '请求ID', required: true },
    { name: 'company_name', type: 'STRING', comment: '企业名称', required: true },
    { name: 'tax_credit_level', type: 'STRING', comment: '纳税信用等级', required: false },
    { name: 'invoice_amount', type: 'DOUBLE', comment: '发票金额', required: false }
  ]
}

export async function getSupplierProductsMock(supplierId: string): Promise<SupplierProduct[]> {
  const normalizedId = resolveSupplierId(supplierId)
  return Promise.resolve(supplierProductsMock.filter(p => p.supplierId === normalizedId))
}

export async function getSupplierProductsMap(): Promise<Record<string, SupplierProduct[]>> {
  const map: Record<string, SupplierProduct[]> = {}
  for (const p of supplierProductsMock) {
    (map[p.supplierId] ||= []).push(p)
  }
  return Promise.resolve(map)
}

export async function getActiveSupplierProducts(): Promise<SupplierProduct[]> {
  return Promise.resolve(supplierProductsMock.filter(p => p.status === 'active'))
}

export async function getExternalDataFields(productCode: string): Promise<ExternalDataField[]> {
  const fields = externalDataFieldsMap[productCode]
  return Promise.resolve(fields || [])
}