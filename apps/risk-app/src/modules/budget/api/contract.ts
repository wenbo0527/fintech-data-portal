import http from '../../../api/http'

// 兼容 Vite 注入的 import.meta.env
const env = (typeof import.meta !== 'undefined' && (import.meta as any).env) || {}
const useMock = env.VITE_USE_MOCK === 'true' || env.VITE_USE_MOCK === true || !env.VITE_API_BASE

export interface ContractItem {
  id: string
  contractNo: string
  contractName: string
  /** 签约主体（工商全称或历史简称），签报/定价/结算沿用的那个键，2026-11-03 起由两轴派生 */
  supplier: string
  /** 2026-11-03 两轴整合：与外数档案同名的合作机构轴（百行/朴道/钱塘/其他） */
  cooperationOrg?: string
  /** 2026-11-03 两轴整合：供应商轴（实际供数厂商）；持牌征信机构直供时为空 */
  dataSupplier?: string
  amount: number
  startDate: string
  endDate: string
  /** PRD I02: 合同失效日期（非必填，仅信息展示，不关联拦截） */
  expireDate?: string
  status: 'active' | 'completed' | 'terminated' | 'pending' | 'expired'
  dataCount?: number
  productCount?: number
  writtenOffAmount?: number
  totalFreeQuota?: number
  usedFreeQuota?: number
  contractType?: 'framework' | 'supplement'
  frameworkId?: string | null
  supplementIds?: string[]
  signReportNo?: string
  initialOccupiedAmount?: number
  /** PRD I03: 合同中外数名称（外数→合同专属名称映射，按外数 ID 存储） */
  externalProductNames?: Record<string, string>
}

export interface ContractListParams {
  page?: number
  pageSize?: number
  supplier?: string
  status?: string
}

// 客户端 mock 数据（useMock fallback 用）
// 7 条：4 active + 2 expired + 1 completed；5 framework + 2 supplement
// 两轴回填口径 = api/supplierDictionary.ts 的 ORG_AXES_BY_SUP_ID：
//   持牌三家（百行/朴道/钱塘）只填合作机构、供应商轴留空（它们是合规通道不是供数厂商）；
//   同盾科技 / 中诚信 不在十二家主体名单里，按档案兜底口径记「其他 + 本名当供应商」。
const MOCK_CONTRACTS: ContractItem[] = [
  {
    id: 'C001',
    contractNo: 'HT-2024-001',
    contractName: '百行征信数据服务框架协议',
    supplier: '百行征信',
    cooperationOrg: '百行',
    dataSupplier: '',
    amount: 120,
    startDate: '2024-01-15',
    endDate: '2026-01-14',
    expireDate: '2026-12-31',
    status: 'active',
    dataCount: 8,
    productCount: 5,
    writtenOffAmount: 35.6,
    totalFreeQuota: 100,
    usedFreeQuota: 42.3,
    contractType: 'framework',
    frameworkId: null,
    supplementIds: ['C002', 'C003'],
    signReportNo: 'BG-2024-001',
    initialOccupiedAmount: 50,
  },
  {
    id: 'C002',
    contractNo: 'HT-2024-002',
    contractName: '百行征信补充协议-反欺诈模块',
    supplier: '百行征信',
    cooperationOrg: '百行',
    dataSupplier: '',
    amount: 30,
    startDate: '2024-03-01',
    endDate: '2025-12-31',
    expireDate: '2025-12-31',
    status: 'active',
    dataCount: 3,
    productCount: 2,
    writtenOffAmount: 8.5,
    totalFreeQuota: 25,
    usedFreeQuota: 12.1,
    contractType: 'supplement',
    frameworkId: 'C001',
    supplementIds: [],
    signReportNo: 'BG-2024-002',
    initialOccupiedAmount: 15,
  },
  {
    id: 'C003',
    contractNo: 'HT-2024-003',
    contractName: '朴道数据风控补充协议',
    supplier: '朴道数据',
    cooperationOrg: '朴道',
    dataSupplier: '',
    amount: 25,
    startDate: '2024-04-10',
    endDate: '2025-12-31',
    expireDate: '2025-12-31',
    status: 'active',
    dataCount: 2,
    productCount: 1,
    writtenOffAmount: 5.2,
    totalFreeQuota: 20,
    usedFreeQuota: 7.8,
    contractType: 'supplement',
    frameworkId: 'C001',
    supplementIds: [],
    signReportNo: 'BG-2024-003',
    initialOccupiedAmount: 10,
  },
  {
    id: 'C004',
    contractNo: 'HT-2024-004',
    contractName: '钱塘征信框架协议',
    supplier: '钱塘征信',
    cooperationOrg: '钱塘',
    dataSupplier: '',
    amount: 80,
    startDate: '2024-06-01',
    endDate: '2026-05-31',
    expireDate: '2026-06-30',
    status: 'active',
    dataCount: 5,
    productCount: 3,
    writtenOffAmount: 18.9,
    totalFreeQuota: 60,
    usedFreeQuota: 22.5,
    contractType: 'framework',
    frameworkId: null,
    supplementIds: ['C005'],
    signReportNo: 'BG-2024-004',
    initialOccupiedAmount: 30,
  },
  {
    id: 'C005',
    contractNo: 'HT-2024-005',
    contractName: '钱塘征信-学信网数据补充',
    supplier: '钱塘征信',
    cooperationOrg: '钱塘',
    dataSupplier: '',
    amount: 18,
    startDate: '2024-07-01',
    endDate: '2025-09-30',
    status: 'expired',
    dataCount: 2,
    productCount: 1,
    writtenOffAmount: 16.4,
    totalFreeQuota: 15,
    usedFreeQuota: 14.8,
    contractType: 'supplement',
    frameworkId: 'C004',
    supplementIds: [],
    signReportNo: 'BG-2024-005',
    initialOccupiedAmount: 8,
  },
  {
    id: 'C006',
    contractNo: 'HT-2023-006',
    contractName: '同盾科技框架协议-2023',
    supplier: '同盾科技',
    cooperationOrg: '其他',
    dataSupplier: '同盾科技',
    amount: 95,
    startDate: '2023-01-01',
    endDate: '2024-06-30',
    status: 'expired',
    dataCount: 6,
    productCount: 4,
    writtenOffAmount: 92.1,
    totalFreeQuota: 80,
    usedFreeQuota: 79.5,
    contractType: 'framework',
    frameworkId: null,
    supplementIds: [],
    signReportNo: 'BG-2023-006',
    initialOccupiedAmount: 40,
  },
  {
    id: 'C007',
    contractNo: 'HT-2023-007',
    contractName: '中诚信征信框架协议-2023',
    supplier: '中诚信',
    cooperationOrg: '其他',
    dataSupplier: '中诚信',
    amount: 65,
    startDate: '2023-03-01',
    endDate: '2024-08-31',
    status: 'completed',
    dataCount: 4,
    productCount: 3,
    writtenOffAmount: 63.8,
    totalFreeQuota: 60,
    usedFreeQuota: 60,
    contractType: 'framework',
    frameworkId: null,
    supplementIds: [],
    signReportNo: 'BG-2023-007',
    initialOccupiedAmount: 25,
  },
]

export async function getContracts(params: ContractListParams = {}): Promise<{ list: ContractItem[]; total: number }> {
  if (useMock) {
    let list = [...MOCK_CONTRACTS]
    // supplier 过滤（includes 匹配）
    if (params.supplier) {
      const q = params.supplier
      list = list.filter((c) => c.supplier.includes(q))
    }
    // status 过滤（精确匹配）
    if (params.status) {
      list = list.filter((c) => c.status === params.status)
    }
    const total = list.length
    // 分页
    const page = params.page ?? 1
    const pageSize = params.pageSize ?? total
    const start = (page - 1) * pageSize
    const paged = list.slice(start, start + pageSize)
    return { list: paged, total }
  }

  const res: any = await http.get('/budget/contracts', { params })
  // Handle standard response wrapper { code: 200, data: { list, total } }
  if (res && res.code === 200 && res.data) {
    return res.data
  }
  // Handle direct return or other formats
  return res
}

export async function createContract(data: Partial<ContractItem>): Promise<ContractItem> {
  if (useMock) {
    const newItem: ContractItem = {
      id: Date.now().toString(),
      contractNo: data.contractNo || `HT-NEW-${Date.now()}`,
      contractName: data.contractName || '',
      supplier: data.supplier || '',
      cooperationOrg: data.cooperationOrg,
      dataSupplier: data.dataSupplier,
      amount: data.amount ?? 0,
      startDate: data.startDate || new Date().toISOString().slice(0, 10),
      endDate: data.endDate || '',
      status: data.status || 'pending',
      dataCount: data.dataCount,
      productCount: data.productCount,
      writtenOffAmount: data.writtenOffAmount,
      totalFreeQuota: data.totalFreeQuota,
      usedFreeQuota: data.usedFreeQuota,
      contractType: data.contractType || 'framework',
      frameworkId: data.frameworkId ?? null,
      supplementIds: data.supplementIds || [],
      signReportNo: data.signReportNo,
      initialOccupiedAmount: data.initialOccupiedAmount,
      expireDate: data.expireDate,
      externalProductNames: data.externalProductNames,
    }
    MOCK_CONTRACTS.unshift(newItem)
    return newItem
  }

  const res: any = await http.post('/budget/contracts', data)
  if (res && res.code === 200 && res.data) {
    return res.data
  }
  return res
}

export async function updateContract(id: string, data: Partial<ContractItem>): Promise<boolean> {
  if (useMock) {
    const idx = MOCK_CONTRACTS.findIndex((c) => c.id === id)
    if (idx === -1) return false
    MOCK_CONTRACTS[idx] = { ...MOCK_CONTRACTS[idx], ...data, id }
    return true
  }

  const res: any = await http.put(`/budget/contracts/${id}`, data)
  if (res && res.code === 200) {
    return true
  }
  return !!res
}

export async function deleteContract(id: string): Promise<boolean> {
  if (useMock) {
    const idx = MOCK_CONTRACTS.findIndex((c) => c.id === id)
    if (idx === -1) return false
    MOCK_CONTRACTS.splice(idx, 1)
    return true
  }

  const res: any = await http.delete(`/budget/contracts/${id}`)
  if (res && res.code === 200) {
    return true
  }
  return !!res
}