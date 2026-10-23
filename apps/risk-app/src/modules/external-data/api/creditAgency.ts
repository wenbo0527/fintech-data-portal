import {
  listCreditAgencies,
  getCreditAgency,
  createCreditAgency,
  updateCreditAgency,
  testAgencySftpConnection,
  getEnabledAgencies,
  getAllAgencies,
} from '../mock/creditAgencies'
import type { CreditAgency, AgencySftpConfig } from '../mock/creditAgencies'

/**
 * 征信机构管理 API 层
 * 项目无后端服务，VITE_USE_MOCK=true 时直接短路到 mock 数据源；
 * 未来接入真实接口时仅需替换此处的实现，页面调用方式保持不变。
 */
const useMock = import.meta.env.VITE_USE_MOCK === 'true'

/** 查询征信机构列表 */
export async function fetchCreditAgencies(params?: { keyword?: string; agencyType?: string; status?: string }): Promise<CreditAgency[]> {
  if (useMock) return listCreditAgencies(params)
  return []
}

/** 查询全部机构（含停用） */
export async function fetchAllAgencies(): Promise<CreditAgency[]> {
  if (useMock) return getAllAgencies()
  return []
}

/** 查询启用机构（R11 仅显示启用机构） */
export async function fetchEnabledAgencies(): Promise<CreditAgency[]> {
  if (useMock) return getEnabledAgencies()
  return []
}

/** 查询单个机构 */
export async function fetchCreditAgency(id: string): Promise<CreditAgency | undefined> {
  if (useMock) return getCreditAgency(id)
  return undefined
}

/** 新增机构 */
export async function addCreditAgency(payload: Partial<CreditAgency>): Promise<CreditAgency> {
  if (useMock) return createCreditAgency(payload)
  throw new Error('未接入后端服务，无法新增机构')
}

/** 编辑机构（R08 机构编码不可修改） */
export async function editCreditAgency(id: string, payload: Partial<CreditAgency>): Promise<CreditAgency> {
  if (useMock) return updateCreditAgency(id, payload)
  throw new Error('未接入后端服务，无法编辑机构')
}

/** SFTP 连接测试（R05/R09 保存前必须通过） */
export async function checkAgencySftpConnection(payload: Partial<AgencySftpConfig>) {
  if (useMock) return testAgencySftpConnection(payload)
  throw new Error('未接入后端服务，无法执行连接测试')
}
