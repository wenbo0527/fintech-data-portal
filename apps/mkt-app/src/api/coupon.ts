/**
 * Coupon API 模块
 * Phase 2.3: types/api 类型体系
 *
 * 改造说明：
 * - 将 .js 改为 .ts
 * - 添加完整的类型定义
 * - 实现真实的 API 调用
 *
 * 6/9 v1.3.1 教训链修复 (TASK-20260609-C3AD735A):
 * - 合并双 mock 源: api 层 内部 270 行 mockTemplates/mockInventories 全部删除
 * - 改为 import 自 @/mock/coupon (单一数据源, 字段 1:1 对齐, v1.3 硬约束)
 * - types/api/coupon.ts 仍为对外契约 (CouponTemplate / CouponInventory)
 * - mock 字段是 superset, 用类型断言让 TS 编译通过
 * - 5 路由表格列渲染字段不缺 (auditor/totalCount/verified/rules/validityStartTime/validityEndTime 全有)
 *
 * 6/9 同时修复 (5/26 教训链 #1):
 * - batchWithdraw 的 status: 'invalid' → 'invalidated' (types 9 态已删 invalid)
 *
 * 6/9 同时补全缺失 API 表面 (与 api/coupon.js 兼容):
 * - templateAPI.createTemplate / updateTemplate (pages 用了 _Template 后缀)
 * - approvalAPI.submitApproval / cancelApproval / getApprovalHistory
 */
import type {
  CouponAPI,
  InventoryAPI,
  TemplateAPI,
  ApiResponse,
  PaginatedResponse,
  CouponTemplate,
  CouponInventory,
  CouponTemplateParams,
  CouponInventoryParams
} from '@/types/api/coupon'
import {
  couponMockData,
  templateMockData,
  packageMockData,
  recordMockData
} from '@/mock/coupon'

// 模拟延迟
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * 6/9 v1.3.1 修复: 内部 mock 270 行删掉, 改为读 @/mock/coupon 单一数据源 (方案 A 推荐)
 *
 * 数据源:
 * - templateMockData: 4 条 (T1 已补 creator/useChannels/validityPeriodType/products)
 * - couponMockData:   22 条 (T1 已补 auditor/totalCount/verified/rules/validityStartTime/validityEndTime)
 * - packageMockData:  8 条 (T1 已补 couponTypes/inventoryTemplates)
 * - recordMockData:   12 条 (T1 已补 couponId/inventoryId/packageId/taskId/operationType)
 *
 * 类型对齐 (v1.3 硬约束 types 与 mock 1:1):
 * - MockTemplate (mock) ⊃ CouponTemplate (types/api) - mock 字段更多
 * - MockCoupon (mock)   ⊃ CouponInventory (types/api) - mock 字段更多
 * - 用类型断言 as unknown as 让 TS 编译通过
 * - 运行时字段不缺 (mock 是 superset)
 *
 * 维护: 内部 _runtime* 是可变 runtime 临时变更 (后续接真实后端可删, 直接重 import)
 */
const _runtimeTemplates: CouponTemplate[] = [...(templateMockData as unknown as CouponTemplate[])]
const _runtimeInventories: CouponInventory[] = [...(couponMockData as unknown as CouponInventory[])]

// 旧 270 行 mock 数组已彻底删除 (方案 B 备选已废弃)
// 5/26 + 6/9 教训: 双 mock 源是字段不统一的根本原因, 必须单一数据源

/**
 * Coupon API 实现
 */
export const couponAPI: CouponAPI = {
  async getList(params: CouponTemplateParams) {
    await delay(300)
    const filtered = _runtimeTemplates.filter(t => {
      if (params.name && !t.name.includes(params.name)) {return false}
      if (params.type && t.type !== params.type) {return false}
      if (params.status && t.status !== params.status) {return false}
      return true
    })
    const page = params.page || 1
    const pageSize = params.pageSize || 10
    const start = (page - 1) * pageSize
    const list = filtered.slice(start, start + pageSize)
    return {
      code: 200,
      message: 'success',
      data: {
        list,
        pagination: {
          page,
          pageSize,
          total: filtered.length,
          totalPages: Math.ceil(filtered.length / pageSize)
        }
      }
    }
  },

  async getById(id: string) {
    await delay(200)
    const template = _runtimeTemplates.find(t => t.id === id)
    return {
      code: 200,
      message: 'success',
      data: template || null
    }
  },

  async create(data: Partial<CouponTemplate>) {
    await delay(300)
    const template: CouponTemplate = {
      id: Date.now().toString(),
      templateId: `TPL${Date.now()}`,
      name: data.name || '',
      type: (data.type || 'discount') as CouponTemplate['type'],
      description: data.description,
      denomination: data.denomination,
      threshold: data.threshold,
      validDays: data.validDays || 30,
      status: 'draft',
      createTime: new Date().toISOString(),
      updateTime: new Date().toISOString()
    }
    _runtimeTemplates.push(template)
    return { code: 200, message: 'success', data: template }
  },

  async update(id: string, data: Partial<CouponTemplate>) {
    await delay(300)
    const template = _runtimeTemplates.find(t => t.id === id)
    if (!template) {
      return { code: 404, message: 'Template not found', data: null }
    }
    Object.assign(template, data, { updateTime: new Date().toISOString() })
    return { code: 200, message: 'success', data: template }
  },

  async delete(id: string) {
    await delay(200)
    const index = _runtimeTemplates.findIndex(t => t.id === id)
    if (index === -1) {
      return { code: 404, message: 'Template not found', data: false }
    }
    _runtimeTemplates.splice(index, 1)
    return { code: 200, message: 'success', data: true }
  }
}

/**
 * Inventory API 实现
 * 6/9 v1.3.1 修复: 读 @/mock/coupon.couponMockData (22 条, 字段 1:1 对齐)
 */
export const inventoryAPI: InventoryAPI = {
  async getInventoryList(params: CouponInventoryParams) {
    await delay(300)
    let filtered = [..._runtimeInventories]

    if (params.couponId) {filtered = filtered.filter(i => i.couponId === params.couponId)}
    if (params.templateId) {filtered = filtered.filter(i => i.templateId === params.templateId)}
    if (params.userId) {filtered = filtered.filter(i => i.userId === params.userId)}
    if (params.status) {filtered = filtered.filter(i => i.status === params.status)}
    if (params.approvalStatus) {filtered = filtered.filter(i => i.approvalStatus === params.approvalStatus)}

    const page = params.page || 1
    const pageSize = params.pageSize || 10
    const start = (page - 1) * pageSize
    const list = filtered.slice(start, start + pageSize)

    return {
      code: 200,
      message: 'success',
      data: {
        list,
        pagination: {
          page,
          pageSize,
          total: filtered.length,
          totalPages: Math.ceil(filtered.length / pageSize)
        }
      }
    }
  },

  async getInventoryDetail(instanceId: string) {
    await delay(200)
    const inventory = _runtimeInventories.find(i => i.instanceId === instanceId)
    return { code: 200, message: 'success', data: inventory || null }
  },

  async batchCreateInventory(data: { templateId: string; count: number; userIds?: string[] }) {
    await delay(500)
    const success = data.count
    return { code: 200, message: 'success', data: { success, failed: 0 } }
  },

  async batchApproveInventory(ids: string[] = []) {
    await delay(400)
    // 6/9 修复: 接受无参调用 (management 页 handleQuickApproval 不传 ids)
    // 6/9 修复: 默认审批所有 approvalStatus='pending' 的 inventory
    if (ids.length === 0) {
      const pending = _runtimeInventories.filter(i => i.approvalStatus === 'pending')
      pending.forEach(inv => {
        inv.approvalStatus = 'approved'
      })
      return { code: 200, message: 'success', data: { success: pending.length, failed: 0 } }
    }
    ids.forEach(id => {
      const inv = _runtimeInventories.find(i => i.instanceId === id)
      if (inv) {
        inv.approvalStatus = 'approved'
      }
    })
    return { code: 200, message: 'success', data: { success: ids.length, failed: 0 } }
  },

  async batchWithdraw(ids: string[]) {
    await delay(400)
    ids.forEach(id => {
      const inv = _runtimeInventories.find(i => i.instanceId === id)
      if (inv) {
        // 5/26 教训链修复: types 9 态已删 'invalid'（PRD v1.2.8 §11.3）
        // batchWithdraw(批量作废) 业务语义对齐为 'invalidated'（被动作废, 记 invalidated_time）
        inv.status = 'invalidated'
        inv.invalidated_time = new Date().toISOString()
      }
    })
    return { code: 200, message: 'success', data: { success: ids.length, failed: 0 } }
  },

  async getBatchCreateDetail(batchId: string) {
    await delay(300)
    // 6/9 修复: batchId 暂时不在 CouponInventory 类型里, 用 unknown 强转
    const items = _runtimeInventories.filter(i => (i as unknown as { batchId?: string }).batchId === batchId)
    return { code: 200, message: 'success', data: items }
  },

  async getBatchCreateHistory(params: { page?: number; pageSize?: number }) {
    await delay(300)
    const page = params.page || 1
    const pageSize = params.pageSize || 10
    return {
      code: 200,
      message: 'success',
      data: {
        list: [],
        pagination: { page, pageSize, total: 0, totalPages: 0 }
      }
    }
  },

  async resendCoupon(instanceId: string) {
    await delay(400)
    const inv = _runtimeInventories.find(i => i.instanceId === instanceId)
    if (!inv) {
      return { code: 404, message: '券实例不存在', data: null }
    }
    if (!inv.status?.startsWith('failed_')) {
      return { code: 400, message: '当前状态不支持补发', data: null }
    }
    inv.status = 'received'
    return { code: 200, message: '补发成功', data: { success: true, instanceId } }
  }
}

/**
 * Template API 实现
 * 6/9 修复: pages 实际调 createTemplate / updateTemplate (非 create / update), 补 2 个 alias
 */
export const templateAPI: TemplateAPI & {
  createTemplate(data: Partial<CouponTemplate>): Promise<ApiResponse<CouponTemplate | null>>
  updateTemplate(id: string, data: Partial<CouponTemplate>): Promise<ApiResponse<CouponTemplate | null>>
} = {
  async getList(params: CouponTemplateParams) {
    return couponAPI.getList(params)
  },

  async getById(id: string) {
    return couponAPI.getById(id)
  },

  async create(data: Partial<CouponTemplate>) {
    return couponAPI.create(data)
  },

  async update(id: string, data: Partial<CouponTemplate>) {
    return couponAPI.update(id, data)
  },

  async delete(id: string) {
    return couponAPI.delete(id)
  },

  // 6/9 补: pages/coupon/template/index.vue + create.vue 用的方法名
  async createTemplate(data: Partial<CouponTemplate>) {
    return couponAPI.create(data)
  },

  async updateTemplate(id: string, data: Partial<CouponTemplate>) {
    return couponAPI.update(id, data)
  }
}

/**
 * Approval API 实现
 * 6/9 修复: 补 submitApproval / cancelApproval / getApprovalHistory
 */
export const approvalAPI = {
  async getApprovalList(params: any = {}) {
    await delay(300)
    // 6/9 修复: 从 _runtimeInventories 过滤 approvalStatus 非空 (pending/approved/rejected)
    const list = _runtimeInventories
      .filter(i => i.approvalStatus && i.approvalStatus !== 'pending' || i.approvalStatus === 'pending')
      .map((item, idx) => ({
        id: `AP${item.id}`,
        batchId: `BATCH${item.id}`,
        type: 'coupon_inventory',
        title: `${item.couponName} - 券库存审批`,
        applicant: item.operator || '系统用户',
        department: '营销部',
        templateCount: 1,
        totalInventory: item.validityStartTime ? 1000 : 0,
        usageScenario: 'batch_distribute',
        configMode: 'unified',
        status: item.approvalStatus || 'pending',
        priority: 'medium',
        createTime: item.createTime,
        approvalTime: null,
        approver: null,
        expectedTime: item.endTime,
        reason: `${item.couponName} 券库存创建申请`,
        comment: '',
        remark: `${item.couponName} 券库存`,
        couponInfo: {
          couponId: item.couponId,
          couponName: item.couponName,
          couponType: item.couponType,
          startTime: item.startTime,
          endTime: item.endTime,
          status: item.status
        },
        _idx: idx
      }))

    // 简化: 直接返回列表, 不做 keyword/priority 复杂过滤 (mock 演示用)
    return {
      code: 200,
      message: 'success',
      data: {
        list,
        pagination: {
          page: params.page || 1,
          pageSize: params.pageSize || 10,
          total: list.length,
          totalPages: Math.ceil(list.length / (params.pageSize || 10))
        }
      }
    }
  },

  async getApprovalDetail(id: string) {
    await delay(200)
    // 6/9 修复: 从 _runtimeInventories 查 id 对应记录
    const inv = _runtimeInventories.find(i => i.id === id || `AP${i.id}` === id)
    if (!inv) {
      return { code: 200, message: 'success', data: null }
    }
    return {
      code: 200,
      message: 'success',
      data: {
        id,
        type: 'batch_create',
        title: `${inv.couponName} - 券库存审批`,
        applicant: inv.operator || '系统用户',
        department: '营销部',
        status: inv.approvalStatus || 'pending',
        priority: 'high',
        createTime: inv.createTime,
        reason: `${inv.couponName} 券库存创建申请`,
        batchInfo: {
          usageScenario: 'batch_distribute',
          configMode: 'unified',
          templateIds: [inv.templateId],
          templateCount: 1,
          totalInventory: 1000,
          unifiedConfig: { quantity: 1000, validFrom: inv.startTime, validTo: inv.endTime },
          batchSettings: { createTime: inv.createTime, remark: inv.couponName, operator: inv.operator || '系统' }
        },
        attachments: [],
        approvalFlow: []
      }
    }
  },

  async processApproval(params: { id: string; action: 'approve' | 'reject'; reason?: string }) {
    await delay(300)
    // 6/9 修复: 同步改 _runtimeInventories 状态
    const inv = _runtimeInventories.find(i => `AP${i.id}` === params.id || i.id === params.id)
    if (inv) {
      inv.approvalStatus = params.action === 'approve' ? 'approved' : 'rejected'
    }
    return { code: 200, message: 'success', data: { success: true, id: params.id, status: params.action } }
  },

  async batchProcessApproval(params: { ids: string[]; action: 'approve' | 'reject'; reason?: string }) {
    await delay(400)
    params.ids.forEach(id => {
      const inv = _runtimeInventories.find(i => `AP${i.id}` === id || i.id === id)
      if (inv) {
        inv.approvalStatus = params.action === 'approve' ? 'approved' : 'rejected'
      }
    })
    return { code: 200, message: 'success', data: { success: params.ids.length, failed: 0 } }
  },

  // 6/9 补: approval 提交/撤销/历史
  async submitApproval(data: any) {
    await delay(500)
    return { code: 200, message: '提交成功', data: { id: 'AP' + Date.now(), ...data, status: 'pending' } }
  },

  async cancelApproval(id: string) {
    await delay(300)
    return { code: 200, message: '撤销成功', data: { id, status: 'cancelled' } }
  },

  async getApprovalHistory(params: any = {}) {
    await delay(300)
    return {
      code: 200,
      message: 'success',
      data: {
        list: [],
        pagination: { page: params.page || 1, pageSize: params.pageSize || 10, total: 0, totalPages: 0 }
      }
    }
  }
}

// 6/9 修复: 6/9 导入的 4 个数据源 (避免 vite tree-shake 警告 unused)
void packageMockData
void recordMockData

export default { couponAPI, inventoryAPI, templateAPI, approvalAPI }
