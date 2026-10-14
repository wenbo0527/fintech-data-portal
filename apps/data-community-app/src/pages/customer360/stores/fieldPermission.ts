import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// 字段维度：客户 / 客户-产品 / 授信 / 借据
// PRD §F-005 自定义查询：4 维度拆分 + 借据多行复制
export type FieldDimension = 'customer' | 'customer-product' | 'credit-application' | 'loan-product'

export interface FieldPermission {
  fieldKey: string         // 字段路径
  fieldLabel: string       // 中文名
  visible: boolean
  copyable: boolean
  searchable: boolean
}

export const useFieldPermissionStore = defineStore('fieldPermission', () => {
  // 字段按 4 维度分组（真实场景从 /api/dex/customer360/field-config 拉取）
  const fieldsByDimension = ref<Record<FieldDimension, FieldPermission[]>>({
    // ===== 维度 1：客户（cross-product 全局画像） =====
    customer: [
      { fieldKey: 'name',           fieldLabel: '客户姓名',   visible: true, copyable: true, searchable: true },
      { fieldKey: 'idCard',         fieldLabel: '身份证号',   visible: true, copyable: false, searchable: false }, // R01
      { fieldKey: 'phone',          fieldLabel: '手机号',     visible: true, copyable: true, searchable: true },
      { fieldKey: 'gender',         fieldLabel: '性别',       visible: true, copyable: true, searchable: true },
      { fieldKey: 'birthDate',      fieldLabel: '出生日期',   visible: true, copyable: true, searchable: true },
      { fieldKey: 'email',          fieldLabel: '邮箱',       visible: true, copyable: true, searchable: true },
      { fieldKey: 'address',        fieldLabel: '居住地址',   visible: true, copyable: true, searchable: true },
      { fieldKey: 'company',        fieldLabel: '工作单位',   visible: true, copyable: true, searchable: true },
      { fieldKey: 'customerLevel',  fieldLabel: '客户等级',   visible: true, copyable: true, searchable: true },
      { fieldKey: 'occupation',     fieldLabel: '职业',       visible: true, copyable: true, searchable: true },
      { fieldKey: 'annualIncome',   fieldLabel: '年收入',     visible: true, copyable: true, searchable: true },
      { fieldKey: 'marriage',       fieldLabel: '婚姻状况',   visible: true, copyable: true, searchable: true },
      { fieldKey: 'creditScore',    fieldLabel: '信用评分',   visible: true, copyable: true, searchable: true },
      { fieldKey: 'creditLevel',    fieldLabel: '信用等级',   visible: true, copyable: true, searchable: true },
      { fieldKey: 'totalCredit',    fieldLabel: '总授信额度', visible: true, copyable: true, searchable: true },
      { fieldKey: 'usedCredit',     fieldLabel: '总在贷余额', visible: true, copyable: true, searchable: true }
    ],

    // ===== 维度 2：客户-产品（基于当前选中授信产品） =====
    'customer-product': [
      { fieldKey: 'productName',       fieldLabel: '产品名称',   visible: true, copyable: true, searchable: true }, // PRD §R08 豁免
      { fieldKey: 'productCode',       fieldLabel: '产品编码',   visible: true, copyable: true, searchable: true },
      { fieldKey: 'creditProductId',   fieldLabel: '授信产品ID', visible: true, copyable: true, searchable: true },
      { fieldKey: 'amount',            fieldLabel: '授信额度',   visible: true, copyable: true, searchable: true },
      { fieldKey: 'balance',           fieldLabel: '在贷余额',   visible: true, copyable: true, searchable: true },
      { fieldKey: 'interestRate',      fieldLabel: '利率',       visible: true, copyable: true, searchable: true },
      { fieldKey: 'startDate',         fieldLabel: '授信起始日', visible: true, copyable: true, searchable: true },
      { fieldKey: 'maturityDate',      fieldLabel: '到期日',     visible: true, copyable: true, searchable: true },
      { fieldKey: 'creditTime',        fieldLabel: '授信时间',   visible: true, copyable: true, searchable: true },
      { fieldKey: 'creditStatus',      fieldLabel: '授信状态',   visible: true, copyable: true, searchable: true },
      { fieldKey: 'bank',              fieldLabel: '资方银行',   visible: true, copyable: true, searchable: true },
      { fieldKey: 'productType',       fieldLabel: '产品类型',   visible: true, copyable: true, searchable: true },
      { fieldKey: 'thirdPartyLoanId',  fieldLabel: '三方借据号', visible: true, copyable: true, searchable: true }
    ],

    // ===== 维度 3：授信（授信申请 ID） =====
    'credit-application': [
      { fieldKey: 'creditApplicationId', fieldLabel: '授信申请ID', visible: true, copyable: true, searchable: true },
      { fieldKey: 'creditProductId',     fieldLabel: '授信产品ID', visible: true, copyable: true, searchable: true },
      { fieldKey: 'productName',         fieldLabel: '产品名称',   visible: true, copyable: true, searchable: true },
      { fieldKey: 'appliedAt',           fieldLabel: '申请时间',   visible: true, copyable: true, searchable: true },
      { fieldKey: 'approvedBy',          fieldLabel: '审批人',     visible: true, copyable: true, searchable: true },
      { fieldKey: 'status',              fieldLabel: '授信状态',   visible: true, copyable: true, searchable: true },
      { fieldKey: 'loanProductCount',    fieldLabel: '用信产品数', visible: true, copyable: true, searchable: true },
      { fieldKey: 'totalLoanAmount',     fieldLabel: '用信总金额', visible: true, copyable: true, searchable: true },
      { fieldKey: 'totalLoanCount',      fieldLabel: '用信总笔数', visible: true, copyable: true, searchable: true },
      { fieldKey: 'overdueCount',        fieldLabel: '逾期笔数',   visible: true, copyable: true, searchable: true },
      { fieldKey: 'overdueAmount',       fieldLabel: '逾期金额',   visible: true, copyable: true, searchable: true }
    ],

    // ===== 维度 4：借据（用信产品 ID · 每行一条借据） =====
    'loan-product': [
      // 用信产品维度
      { fieldKey: 'loanProductId',       fieldLabel: '用信产品ID',   visible: true, copyable: true, searchable: true },
      { fieldKey: 'loanProductName',     fieldLabel: '用信产品名',   visible: true, copyable: true, searchable: true },
      { fieldKey: 'creditApplicationId', fieldLabel: '授信申请ID',   visible: true, copyable: true, searchable: true },
      { fieldKey: 'createdAt',           fieldLabel: '创建时间',     visible: true, copyable: true, searchable: true },
      // 借据维度（每个 loanRecord 一行）
      { fieldKey: 'id',                  fieldLabel: '借据ID',       visible: true, copyable: true, searchable: true },
      { fieldKey: 'loanNo',              fieldLabel: '用信编号',     visible: true, copyable: true, searchable: true },
      { fieldKey: 'productName',         fieldLabel: '产品名称',     visible: true, copyable: true, searchable: true },
      { fieldKey: 'amount',              fieldLabel: '用信金额',     visible: true, copyable: true, searchable: true },
      { fieldKey: 'balance',             fieldLabel: '当前余额',     visible: true, copyable: true, searchable: true },
      { fieldKey: 'loanDate',            fieldLabel: '用信日期',     visible: true, copyable: true, searchable: true },
      { fieldKey: 'status',              fieldLabel: '用信状态',     visible: true, copyable: true, searchable: true },
      { fieldKey: 'contractNo',          fieldLabel: '合同编号',     visible: true, copyable: true, searchable: true },
      { fieldKey: 'channel',             fieldLabel: '申请渠道',     visible: true, copyable: true, searchable: true },
      { fieldKey: 'installments',        fieldLabel: '分期数',       visible: true, copyable: true, searchable: true },
      { fieldKey: 'currentPeriod',       fieldLabel: '当前期次',     visible: true, copyable: true, searchable: true },
      { fieldKey: 'overdueDays',         fieldLabel: '逾期天数',     visible: true, copyable: true, searchable: true },
      { fieldKey: 'maxOverdueDays',      fieldLabel: '历史最大逾期', visible: true, copyable: true, searchable: true },
      { fieldKey: 'settlementDate',      fieldLabel: '结清日期',     visible: true, copyable: true, searchable: true },
      { fieldKey: 'remainingPrincipal',  fieldLabel: '剩余本金',     visible: true, copyable: true, searchable: true },
      { fieldKey: 'remainingInterest',   fieldLabel: '剩余利息',     visible: true, copyable: true, searchable: true },
      { fieldKey: 'remainingPenalty',    fieldLabel: '剩余罚息',     visible: true, copyable: true, searchable: true },
      { fieldKey: 'remainingTotal',      fieldLabel: '剩余应还',     visible: true, copyable: true, searchable: true },
      { fieldKey: 'result',              fieldLabel: '申请结果',     visible: true, copyable: true, searchable: true },
      { fieldKey: 'rejectReason',        fieldLabel: '拒绝原因',     visible: true, copyable: true, searchable: true },
      { fieldKey: 'thirdPartyCustomerId', fieldLabel: '三方客户号',   visible: true, copyable: true, searchable: true },
      { fieldKey: 'productKey',          fieldLabel: '产品Key',      visible: true, copyable: true, searchable: true },
      { fieldKey: 'interestRate',        fieldLabel: '利率',         visible: true, copyable: true, searchable: true }
    ]
  })

  // 兼容旧版字段池（aggregate 所有维度的字段）
  const fields = computed(() => {
    const all: FieldPermission[] = []
    const seen = new Set<string>()
    Object.values(fieldsByDimension.value).forEach(dimFields => {
      dimFields.forEach(f => {
        if (!seen.has(f.fieldKey)) {
          seen.add(f.fieldKey)
          all.push(f)
        }
      })
    })
    return all
  })

  // 当前生效的字段权限更新
  const updateField = (dimension: FieldDimension, fieldKey: string, patch: Partial<FieldPermission>) => {
    const arr = fieldsByDimension.value[dimension]
    const idx = arr.findIndex(f => f.fieldKey === fieldKey)
    if (idx >= 0) {
      // R01 强一致链
      if (patch.visible === false) {
        patch.copyable = false
        patch.searchable = false
      }
      arr[idx] = { ...arr[idx], ...patch }
    }
  }

  const getField = (fieldKey: string): FieldPermission | undefined =>
    fields.value.find(f => f.fieldKey === fieldKey)

  const getFieldByDim = (dimension: FieldDimension, fieldKey: string): FieldPermission | undefined =>
    fieldsByDimension.value[dimension].find(f => f.fieldKey === fieldKey)

  const isCopyable = (fieldKey: string) => {
    const f = getField(fieldKey)
    return !!f && f.visible && f.copyable
  }

  const isSearchable = (fieldKey: string) => {
    const f = getField(fieldKey)
    return !!f && f.visible && f.searchable
  }

  const isVisible = (fieldKey: string) => {
    const f = getField(fieldKey)
    return !!f && f.visible
  }

  // 字段池（仅 visible=true · 按维度）
  const availableFieldPool = computed<Record<FieldDimension, FieldPermission[]>>(() => {
    const out: Record<FieldDimension, FieldPermission[]> = {
      customer: [],
      'customer-product': [],
      'credit-application': [],
      'loan-product': []
    }
    ;(Object.keys(fieldsByDimension.value) as FieldDimension[]).forEach(dim => {
      out[dim] = fieldsByDimension.value[dim].filter(f => f.visible)
    })
    return out
  })

  return {
    fieldsByDimension,
    fields,
    updateField,
    getField,
    getFieldByDim,
    isCopyable,
    isSearchable,
    isVisible,
    availableFieldPool
  }
})