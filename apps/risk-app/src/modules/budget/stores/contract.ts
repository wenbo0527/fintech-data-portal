import { defineStore } from 'pinia'
import type { ErrorType } from '@/types/api'
import { getContracts, createContract as apiCreateContract, deleteContract as apiDeleteContract, updateContract as apiUpdateContract } from '../api/contract'

export interface ContractItem {
  id: string
  contractNo: string
  contractName: string
  /** 签约主体（签报/定价/结算沿用的键），2026-11-03 起由两轴派生 */
  supplier: string
  /** 2026-11-03 两轴整合：与外数档案同名的两轴，字段定义以 api/contract.ts 为准 */
  cooperationOrg?: string
  dataSupplier?: string
  amount: number
  startDate: string
  endDate: string
  // PRD I02: 合同失效日期（非必填）
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
  // PRD R10: 签报号字段（非必填，支持搜索选择已有签报）
  signReportNo?: string
  // PRD R11: 合同初始占用金额（非必填，默认0）
  initialOccupiedAmount?: number
  // PRD I03: 合同中外数名称（按外数 ID 存储）
  externalProductNames?: Record<string, string>
}

export interface ContractListParams {
  page?: number
  pageSize?: number
  supplier?: string
  status?: string
}

function daysBetween(dateStr: string) {
  try { const now = new Date(); const target = new Date(dateStr); return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) } catch { return NaN }
}

export const useContractStore = defineStore('contract', {
  state: () => ({
    list: [] as ContractItem[],
    total: 0,
    loading: false,
    error: null as ErrorType | null,
    pricingMap: {} as Record<string, { billingMode?: string; billingType?: 'fixed' | 'tiered' | 'special'; basePrice?: number; tiers?: Array<{ lower: number; upper: number; price: number }>; remark?: string; freeQuotaValue?: number; freeQuotaStart?: string; freeQuotaEnd?: string }>
  }),

  getters: {
    stats: (state) => {
      const count = state.list.length
      const totalAmount = state.list.reduce((sum, i) => sum + (Number(i.amount) || 0), 0)
      const expiringCount = state.list.filter(i => daysBetween(i.endDate) <= 30 && daysBetween(i.endDate) >= 0).length
      const supplierSet = new Set(state.list.map(i => i.supplier))
      const supplierCount = supplierSet.size
      return { count, totalAmount, expiringCount, supplierCount }
    },
    bySupplier: (state) => {
      const map: Record<string, ContractItem[]> = {}
      state.list.forEach((item) => {
        const key = item.supplier || '—'
        const bucket = map[key] ?? (map[key] = [])
        bucket.push(item)
      })
      return map
    },
    frameworkOptions: (state) => {
      return state.list.filter(i => i.contractType === 'framework').map(i => ({ label: `${i.contractName}（${i.contractNo}）`, value: i.id, supplier: i.supplier }))
    },
    supplementOptions: (state) => {
      return state.list.filter(i => i.contractType === 'supplement').map(i => ({ label: `${i.contractName}（${i.contractNo}）`, value: i.id, supplier: i.supplier }))
    },
    getPricing: (state) => {
      return (productId: string) => state.pricingMap[productId]
    }
  },

  actions: {
    async fetchContractList(params: ContractListParams = {}) {
      this.loading = true
      try {
        const res = await getContracts({ supplier: params.supplier, status: params.status })
        const list = res.list.map((i) => {
          const numId = Number(String(i.id || '').replace(/\D/g, '')) || 1
          const defaultDataCount = i.dataCount ?? (numId * 1000 + 500)
          const defaultProductCount = i.productCount ?? (numId % 5) + 1
          const ratios = [0.3, 0.5, 0.7]
          const defaultWrittenOff = i.writtenOffAmount ?? Math.round((i.amount || 0) * ratios[numId % ratios.length])
          const defaultTotalFree = i.totalFreeQuota ?? 10000
          const defaultUsedFree = i.usedFreeQuota ?? Math.round(defaultTotalFree * ratios[numId % ratios.length])
          const defaultType: 'framework' | 'supplement' = numId % 2 === 0 ? 'framework' : 'supplement'
          const frameworks = (this.list || []).filter(x => x.contractType === 'framework')
          const linkId = defaultType === 'supplement' && frameworks.length ? frameworks[frameworks.length - 1].id : null
          return { ...i, dataCount: defaultDataCount, productCount: defaultProductCount, writtenOffAmount: defaultWrittenOff, totalFreeQuota: defaultTotalFree, usedFreeQuota: defaultUsedFree, contractType: i.contractType ?? defaultType, frameworkId: i.frameworkId ?? linkId }
        })

        this.list = list
        this.total = list.length
        this.error = null
        return true
      } catch (e: any) {
        this.error = { code: 'CONTRACT_FETCH_ERROR', message: e?.message || '获取合同列表失败' }
        return false
      } finally {
        this.loading = false
      }
    },

    async createContract(payload: Partial<ContractItem>) {
      try {
        const item = await apiCreateContract(payload)
        this.list = [item, ...this.list]
        this.total = this.list.length
        return true
      } catch (e: any) {
        this.error = { code: 'CONTRACT_CREATE_ERROR', message: e?.message || '新增合同失败' }
        return false
      }
    },

    async deleteById(id: string) {
      try {
        await apiDeleteContract(id)
        this.list = this.list.filter(i => i.id !== id)
        this.total = this.list.length
        return true
      } catch (e: any) {
        this.error = { code: 'CONTRACT_DELETE_ERROR', message: e?.message || '删除合同失败' }
        return false
      }
    },

    async updateContractStatus(id: string, status: ContractItem['status']) {
      try {
        await apiUpdateContract(id, { status })
        const item = this.list.find(i => i.id === id)
        if (item) item.status = status
        return true
      } catch (e: any) {
        this.error = { code: 'CONTRACT_UPDATE_ERROR', message: e?.message || '更新合同状态失败' }
        return false
      }
    },

    updatePricing(productId: string | number, pricing: any) {
      this.pricingMap[String(productId)] = {
        ...pricing,
        billingType: pricing.billingType as 'fixed' | 'tiered' | 'special'
      }
    },

    restoreBalance(contractId: string, amount: number, discountAmount: number) {
      const item = this.list.find(i => i.id === contractId)
      if (item) {
        item.writtenOffAmount = Math.max(0, (item.writtenOffAmount || 0) - amount)
        item.usedFreeQuota = Math.max(0, (item.usedFreeQuota || 0) - discountAmount)
      }
    }
  }
})
