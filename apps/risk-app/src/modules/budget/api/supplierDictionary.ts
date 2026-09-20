import type { Supplier } from '../../external-data/types/supplier'

const now = new Date().toISOString()

// PRD R01: 合作机构初始枚举值
const suppliersMock: Supplier[] = [
  { id: 'SUP-001', supplierCode: '学信网', supplierName: '学信网', supplierType: 'data_provider', status: 'active', creditRating: 90, registrationDate: now, contactInfo: { company: '学信网', contactPerson: '教务经理', email: 'support@chsi.com.cn', phone: '010-12345678', address: '北京' }, tags: ['教育','认证'], createdAt: now, updatedAt: now, createdBy: 'admin', updatedBy: 'admin' },
  { id: 'SUP-002', supplierCode: '百行', supplierName: '百行征信有限公司', supplierType: 'data_provider', status: 'active', creditRating: 88, registrationDate: now, contactInfo: { company: '百行征信有限公司', contactPerson: '客户经理', email: 'service@bhcredit.cn', phone: '021-98765432', address: '上海' }, tags: ['征信','信用'], createdAt: now, updatedAt: now, createdBy: 'admin', updatedBy: 'admin' },
  { id: 'SUP-003', supplierCode: '朴道', supplierName: '朴道征信有限公司', supplierType: 'data_provider', status: 'active', creditRating: 85, registrationDate: now, contactInfo: { company: '朴道征信有限公司', contactPerson: '渠道经理', email: 'bd@pudao.ai', phone: '0755-11223344', address: '深圳' }, tags: ['征信','风控'], createdAt: now, updatedAt: now, createdBy: 'admin', updatedBy: 'admin' },
  { id: 'SUP-004', supplierCode: '钱塘', supplierName: '钱塘征信有限公司', supplierType: 'data_provider', status: 'active', creditRating: 84, registrationDate: now, contactInfo: { company: '钱塘征信有限公司', contactPerson: '商务经理', email: 'contact@qiantangdata.cn', phone: '0571-55667788', address: '杭州' }, tags: ['征信'], createdAt: now, updatedAt: now, createdBy: 'admin', updatedBy: 'admin' },
  { id: 'SUP-005', supplierCode: '上海数据集团', supplierName: '上海数据集团金融科技有限公司', supplierType: 'data_provider', status: 'active', creditRating: 82, registrationDate: now, contactInfo: { company: '上海数据集团金融科技有限公司', contactPerson: '商务经理', email: '', phone: '', address: '上海' }, tags: ['数据'], createdAt: now, updatedAt: now, createdBy: 'admin', updatedBy: 'admin' },
  { id: 'SUP-006', supplierCode: '厦门信息集团', supplierName: '厦门信息集团大数据运营有限公司', supplierType: 'data_provider', status: 'active', creditRating: 80, registrationDate: now, contactInfo: { company: '厦门信息集团大数据运营有限公司', contactPerson: '商务经理', email: '', phone: '', address: '厦门' }, tags: ['数据'], createdAt: now, updatedAt: now, createdBy: 'admin', updatedBy: 'admin' },
  { id: 'SUP-007', supplierCode: '中银保信', supplierName: '中国银行保险信息技术管理有限公司', supplierType: 'data_provider', status: 'active', creditRating: 86, registrationDate: now, contactInfo: { company: '中国银行保险信息技术管理有限公司', contactPerson: '商务经理', email: '', phone: '', address: '北京' }, tags: ['保险','数据'], createdAt: now, updatedAt: now, createdBy: 'admin', updatedBy: 'admin' },
  { id: 'SUP-008', supplierCode: '融七牛', supplierName: '北京融七牛信息技术有限公司', supplierType: 'data_provider', status: 'active', creditRating: 78, registrationDate: now, contactInfo: { company: '北京融七牛信息技术有限公司', contactPerson: '商务经理', email: '', phone: '', address: '北京' }, tags: ['数据'], createdAt: now, updatedAt: now, createdBy: 'admin', updatedBy: 'admin' },
  { id: 'SUP-009', supplierCode: '上海理想', supplierName: '上海理想信息产业(集团)有限公司', supplierType: 'data_provider', status: 'active', creditRating: 79, registrationDate: now, contactInfo: { company: '上海理想信息产业(集团)有限公司', contactPerson: '商务经理', email: '', phone: '', address: '上海' }, tags: ['数据'], createdAt: now, updatedAt: now, createdBy: 'admin', updatedBy: 'admin' },
  { id: 'SUP-010', supplierCode: '北京移动', supplierName: '北京移动系统集成有限公司', supplierType: 'data_provider', status: 'active', creditRating: 81, registrationDate: now, contactInfo: { company: '北京移动系统集成有限公司', contactPerson: '商务经理', email: '', phone: '', address: '北京' }, tags: ['通信','数据'], createdAt: now, updatedAt: now, createdBy: 'admin', updatedBy: 'admin' },
  { id: 'SUP-011', supplierCode: '原力金智', supplierName: '原力金智(北京)科技有限公司', supplierType: 'data_provider', status: 'active', creditRating: 77, registrationDate: now, contactInfo: { company: '原力金智(北京)科技有限公司', contactPerson: '商务经理', email: '', phone: '', address: '北京' }, tags: ['数据'], createdAt: now, updatedAt: now, createdBy: 'admin', updatedBy: 'admin' },
  { id: 'SUP-012', supplierCode: '人行征信中心', supplierName: '中国人民银行征信中心', supplierType: 'data_provider', status: 'active', creditRating: 95, registrationDate: now, contactInfo: { company: '中国人民银行征信中心', contactPerson: '商务经理', email: '', phone: '', address: '北京' }, tags: ['征信'], createdAt: now, updatedAt: now, createdBy: 'admin', updatedBy: 'admin' }
]

// PRD R01: 合作机构名称枚举（供外数管理、合同管理、签报管理、结算管理联动使用）
export const partnerOrgNames: string[] = suppliersMock.map(s => s.supplierName)

// 短名称 → 全称映射（兼容历史数据中的短名称）
export const shortToFullName: Record<string, string> = {
  '学信网': '学信网',
  '百行': '百行征信有限公司',
  '朴道': '朴道征信有限公司',
  '钱塘': '钱塘征信有限公司'
}

// 把合同/结算任务里出现的各类机构写法（SUP-ID、短名称、全称、简称）统一解析为 SUP-ID，
// 避免定价档案、供应商产品等 mock 数据因名称不一致而查不到
export function resolveSupplierId(key: string): string {
  if (!key) return key
  if (suppliersMock.some(s => s.id === key)) return key
  const exact = suppliersMock.find(s => s.supplierCode === key || s.supplierName === key)
  if (exact) return exact.id
  // 简称兜底：如「百行征信」→「百行」、「朴道数据」→「朴道」
  const byPrefix = suppliersMock.find(s => s.supplierCode.length >= 2 && key.startsWith(s.supplierCode))
  return byPrefix ? byPrefix.id : key
}

export async function getSupplierOptions() {
  return suppliersMock.map(s => s.supplierName)
}

export async function getAvailableSuppliers(): Promise<Supplier[]> {
  return suppliersMock.filter(s => s.status === 'active')
}

export async function getSupplierById(id: string): Promise<Supplier | undefined> {
  return suppliersMock.find(s => s.id === id)
}

export async function getSuppliersByIds(ids: string[]): Promise<Supplier[]> {
  const set = new Set(ids)
  return suppliersMock.filter(s => set.has(s.id))
}

export async function checkSupplierAvailability(id: string): Promise<boolean> {
  const s = suppliersMock.find(x => x.id === id)
  return !!s && s.status === 'active'
}
