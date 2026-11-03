import type { Supplier } from '../../external-data/types/supplier'
import { COOPERATION_ORG_OPTIONS, SUPPLIER_OPTIONS, normalizeCooperationOrg } from '../../external-data/mock/orgDictionaries'

const now = new Date().toISOString()

// PRD R01: 合作机构初始枚举值
// 机构全称以《外数档案》R09 的十二家工商登记全称为准（唯一事实源：
// modules/external-data/mock/creditAgencies.ts），本表 supplierName 不再自写一份口径；
// supplierCode 仍保留短名，供历史数据与 resolveSupplierId 前缀兜底使用。
// 已知偏差：SUP-001 仍写作「学信网」，且结算/用量侧多处直接用短名做数据值，属 budget 侧待收。
const suppliersMock: Supplier[] = [
  { id: 'SUP-001', supplierCode: '学信网', supplierName: '学信网', supplierType: 'data_provider', status: 'active', creditRating: 90, registrationDate: now, contactInfo: { company: '学信网', contactPerson: '教务经理', email: 'support@chsi.com.cn', phone: '010-12345678', address: '北京' }, tags: ['教育','认证'], createdAt: now, updatedAt: now, createdBy: 'admin', updatedBy: 'admin' },
  { id: 'SUP-002', supplierCode: '百行', supplierName: '百行征信有限公司', supplierType: 'data_provider', status: 'active', creditRating: 88, registrationDate: now, contactInfo: { company: '百行征信有限公司', contactPerson: '客户经理', email: 'service@bhcredit.cn', phone: '021-98765432', address: '上海' }, tags: ['征信','信用'], createdAt: now, updatedAt: now, createdBy: 'admin', updatedBy: 'admin' },
  { id: 'SUP-003', supplierCode: '朴道', supplierName: '朴道征信有限公司', supplierType: 'data_provider', status: 'active', creditRating: 85, registrationDate: now, contactInfo: { company: '朴道征信有限公司', contactPerson: '渠道经理', email: 'bd@pudao.ai', phone: '0755-11223344', address: '深圳' }, tags: ['征信','风控'], createdAt: now, updatedAt: now, createdBy: 'admin', updatedBy: 'admin' },
  { id: 'SUP-004', supplierCode: '钱塘', supplierName: '钱塘征信有限公司', supplierType: 'data_provider', status: 'active', creditRating: 84, registrationDate: now, contactInfo: { company: '钱塘征信有限公司', contactPerson: '商务经理', email: 'contact@qiantangdata.cn', phone: '0571-55667788', address: '杭州' }, tags: ['征信'], createdAt: now, updatedAt: now, createdBy: 'admin', updatedBy: 'admin' },
  { id: 'SUP-005', supplierCode: '上海数据集团', supplierName: '上海数据集团金融科技有限公司', supplierType: 'data_provider', status: 'active', creditRating: 82, registrationDate: now, contactInfo: { company: '上海数据集团金融科技有限公司', contactPerson: '商务经理', email: '', phone: '', address: '上海' }, tags: ['数据'], createdAt: now, updatedAt: now, createdBy: 'admin', updatedBy: 'admin' },
  { id: 'SUP-006', supplierCode: '厦门信息集团', supplierName: '厦门信息集团大数据运营有限公司', supplierType: 'data_provider', status: 'active', creditRating: 80, registrationDate: now, contactInfo: { company: '厦门信息集团大数据运营有限公司', contactPerson: '商务经理', email: '', phone: '', address: '厦门' }, tags: ['数据'], createdAt: now, updatedAt: now, createdBy: 'admin', updatedBy: 'admin' },
  { id: 'SUP-007', supplierCode: '中银保信', supplierName: '中国银行保险信息技术管理有限公司', supplierType: 'data_provider', status: 'active', creditRating: 86, registrationDate: now, contactInfo: { company: '中国银行保险信息技术管理有限公司', contactPerson: '商务经理', email: '', phone: '', address: '北京' }, tags: ['保险','数据'], createdAt: now, updatedAt: now, createdBy: 'admin', updatedBy: 'admin' },
  { id: 'SUP-008', supplierCode: '融七牛', supplierName: '北京融七牛信息技术有限公司', supplierType: 'data_provider', status: 'active', creditRating: 78, registrationDate: now, contactInfo: { company: '北京融七牛信息技术有限公司', contactPerson: '商务经理', email: '', phone: '', address: '北京' }, tags: ['数据'], createdAt: now, updatedAt: now, createdBy: 'admin', updatedBy: 'admin' },
  { id: 'SUP-009', supplierCode: '上海理想', supplierName: '上海理想信息（集团）有限公司', supplierType: 'data_provider', status: 'active', creditRating: 79, registrationDate: now, contactInfo: { company: '上海理想信息（集团）有限公司', contactPerson: '商务经理', email: '', phone: '', address: '上海' }, tags: ['数据'], createdAt: now, updatedAt: now, createdBy: 'admin', updatedBy: 'admin' },
  { id: 'SUP-010', supplierCode: '北京移动', supplierName: '北京移动系统集成有限公司', supplierType: 'data_provider', status: 'active', creditRating: 81, registrationDate: now, contactInfo: { company: '北京移动系统集成有限公司', contactPerson: '商务经理', email: '', phone: '', address: '北京' }, tags: ['通信','数据'], createdAt: now, updatedAt: now, createdBy: 'admin', updatedBy: 'admin' },
  { id: 'SUP-011', supplierCode: '原力金智', supplierName: '原力金智（北京）科技有限公司', supplierType: 'data_provider', status: 'active', creditRating: 77, registrationDate: now, contactInfo: { company: '原力金智（北京）科技有限公司', contactPerson: '商务经理', email: '', phone: '', address: '北京' }, tags: ['数据'], createdAt: now, updatedAt: now, createdBy: 'admin', updatedBy: 'admin' },
  { id: 'SUP-012', supplierCode: '人行征信中心', supplierName: '中国人民银行征信中心', supplierType: 'data_provider', status: 'active', creditRating: 95, registrationDate: now, contactInfo: { company: '中国人民银行征信中心', contactPerson: '商务经理', email: '', phone: '', address: '北京' }, tags: ['征信'], createdAt: now, updatedAt: now, createdBy: 'admin', updatedBy: 'admin' }
]

// PRD R01: 合作机构名称枚举（供外数管理、合同管理、签报管理、结算管理联动使用）
export const partnerOrgNames: string[] = suppliersMock.map(s => s.supplierName)

/**
 * 签约主体（SUP-ID）→ 外数档案两轴的归属表（2026-11-03 两轴整合的唯一映射）
 *
 * 背景：档案侧只有两轴（合作机构四档 / 供应商，见 external-data/mock/orgDictionaries.ts），
 * 而 budget 侧一直只有「合作机构」一个字段，存的是十二家工商全称 —— 里面既混着持牌征信机构
 * （百行 / 朴道 / 钱塘），也混着实际出数方（学信网 / 上海数据集团等），一个字段承了两套语义，
 * 正是档案侧刚被拆掉的那个问题。
 *
 * 口径（用户 2026-11-03 选定）：十二家主体与 SUP-ID **一律不动**（签报 partnerOrgs、定价档案、
 * 结算/核销/用量都按 SUP-ID 取值，改键会牵动整条预算链），只给每个主体补上两轴归属：
 *   - 持牌三家（SUP-002/003/004）：合作机构＝百行/朴道/钱塘，供应商轴留空 —— 它们是合规通道，
 *     不是实际供数厂商（BH_* 的数据其实来自京东，PD_* 来自字节，那才是要填的供应商）；
 *   - 其余九家非持牌主体：合作机构＝其他，主体本名即供应商（上海数据集团金融科技 → 档案里登记的
 *     简称「上数金科」，与 archiveProducts 种子一致）。
 * 反向派生见 subjectOfAxes：档案两轴 → 签约主体，合同/签报继续只认主体一个键。
 */
const ORG_AXES_BY_SUP_ID: Record<string, { cooperationOrg: string; supplier: string }> = {
  'SUP-001': { cooperationOrg: '其他', supplier: '学信网' },
  'SUP-002': { cooperationOrg: '百行', supplier: '' },
  'SUP-003': { cooperationOrg: '朴道', supplier: '' },
  'SUP-004': { cooperationOrg: '钱塘', supplier: '' },
  'SUP-005': { cooperationOrg: '其他', supplier: '上数金科' },
  'SUP-006': { cooperationOrg: '其他', supplier: '厦门信息集团' },
  'SUP-007': { cooperationOrg: '其他', supplier: '中银保信' },
  'SUP-008': { cooperationOrg: '其他', supplier: '融七牛' },
  'SUP-009': { cooperationOrg: '其他', supplier: '上海理想' },
  'SUP-010': { cooperationOrg: '其他', supplier: '北京移动' },
  'SUP-011': { cooperationOrg: '其他', supplier: '原力金智' },
  'SUP-012': { cooperationOrg: '其他', supplier: '人行征信中心' },
}

/** 两轴取值（供合同/签报表单直接用，避免 budget 侧再自写一份枚举） */
export const orgAxisOptions = COOPERATION_ORG_OPTIONS
export const supplierAxisOptions = SUPPLIER_OPTIONS

/**
 * 签约主体（SUP-ID / 全称 / 短名 / 历史写法）→ 两轴。
 * 认不出的主体（如合同种子里的「同盾科技」「中诚信」，本就不在十二家名单）按档案口径兜底：
 * 合作机构落「其他」，主体本名当供应商 —— 宁可降级为供应商，也不让它污染四档。
 */
export function axesOfSubject(subject?: string): { cooperationOrg: string; supplier: string } {
  const raw = String(subject || '').trim()
  if (!raw) {
    return { cooperationOrg: '', supplier: '' }
  }
  const hit = ORG_AXES_BY_SUP_ID[resolveSupplierId(raw)]
  if (hit) {
    return { ...hit }
  }
  return { cooperationOrg: normalizeCooperationOrg(raw) || '其他', supplier: raw }
}

/**
 * 两轴 → 签约主体（工商全称，即合同/签报/定价沿用的那个键）。
 * 规则与上面的归属表严格互逆：持牌三档由合作机构决定主体；「其他」档由供应商本名决定主体。
 * 派生不出主体时返回空串（如供应商＝恒普/字节 这类既不是持牌方也不是已登记主体的情况），
 * 由调用方提示人工补选 —— 兜底造一个 SUP-ID 会把定价与结算挂到错的主体上。
 */
export function subjectOfAxes(cooperationOrg?: string, supplier?: string): string {
  const org = String(cooperationOrg || '').trim()
  const sup = String(supplier || '').trim()
  if (!org) {
    return ''
  }
  if (org !== '其他') {
    const licensed = suppliersMock.find((s) => ORG_AXES_BY_SUP_ID[s.id]?.cooperationOrg === org)
    return licensed ? licensed.supplierName : ''
  }
  const bySupplier = suppliersMock.find((s) => ORG_AXES_BY_SUP_ID[s.id]?.supplier === sup && sup !== '')
  return bySupplier ? bySupplier.supplierName : ''
}


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
