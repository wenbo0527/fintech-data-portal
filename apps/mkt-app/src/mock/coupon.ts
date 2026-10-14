/**
 * Coupon Mock Data
 * 用途：券模板/库存 mock 数据源（覆盖 8 类券种 + 库存告警规则）
 * 来源：TASK-20260609-C3AD735A（合并双 mock 源为单一数据源）
 * 消费方：@/api/coupon.ts、@/api/coupon.js、@/services/* (8 个页面)
 * 边界：纯前端 demo；不接后端；字段 1:1 对齐 types/api/coupon.ts
 */

export interface MockTemplate {
  id: string
  templateId: string
  name: string
  type: 'discount' | 'reduction' | 'cash' | 'gift' | 'interest_free' | 'PRICED_DISCOUNT'
  description?: string
  denomination?: number
  threshold?: number
  // v1.2.8 5/26 教训链 #4: 改 optional, PRICED_DISCOUNT 模板用 valid_from/valid_to
  validDays?: number
  status: 'draft' | 'active' | 'online' | 'paused' | 'expired'
  createTime: string
  updateTime: string
  // 临价折扣券字段
  product_id?: string
  product_name?: string
  discount_value?: number
  valid_from?: string
  valid_to?: string
  // v1.2.8 5/26 教训链 #4: mock 实例中 'products' 字段存在,补 types 声明
  products?: string[]
  // 6/9 v1.3.1 教训链修复: 补 4 字段（template/index.vue 列映射）—— 避免 5/26 静默失败
  /** 属主（template/index.vue 表格列 data-index="creator"） */
  creator?: string
  /** 适用范围-渠道（template/index.vue 表格列 data-index="useChannels"） */
  useChannels?: string[]
  /** 有效期类型 'unlimited'=长期 / 'fixed'=固定（template/index.vue 表格列 data-index="validityPeriodType"） */
  validityPeriodType?: 'unlimited' | 'fixed'
}

/** 临价折扣券 Mock */
export const pricedTemplateMockData: MockTemplate[] = [
  {
    id: 'PRICED-001',
    templateId: 'TPL-PRICED-001',
    name: '京东大额低息临价券',
    type: 'PRICED_DISCOUNT',
    product_id: 'JD_001',
    product_name: '京东大额低息',
    discount_value: 0.8,
    valid_from: '2026-06-01',
    valid_to: '2026-06-30',
    status: 'online',
    createTime: '2026-06-01 10:00:00',
    updateTime: '2026-06-01 10:00:00',
  },
  {
    id: 'PRICED-002',
    templateId: 'TPL-PRICED-002',
    name: '美团大额低息临价券',
    type: 'PRICED_DISCOUNT',
    product_id: 'MT_001',
    product_name: '美团大额低息',
    discount_value: 0.85,
    valid_from: '2026-06-01',
    valid_to: '2026-06-30',
    status: 'online',
    createTime: '2026-06-01 10:00:00',
    updateTime: '2026-06-01 10:00:00',
  },
]

/**
 * 挂载的券模板批次（PRD §12.2 字段）
 * 演示范围: 同产品挂载（JD 挂 JD 模板, MT 挂 MT 模板, SUD 挂 SUD 模板）
 * 字段含义: batch_id 批次号 / template_id 模板ID / total 批次总量 / remaining 剩余可发
 * [回退恢复] git restore 误丢 Demo-001 G6, 重新补 (2026-06-04 15:09)
 */
export interface MockInventoryBatch {
  batch_id: string
  template_id: string
  total: number
  remaining: number
}

export interface MockPackage {
  id: string
  packageId: string
  name: string
  description: string
  couponCount: number
  totalValue: number
  /** 券包状态 — 对齐 PRD §11.2 枚举（demo 收紧，去掉 paused/expired） */
  status: 'draft' | 'active' | 'inactive'
  validDays: number
  createTime: string
  product_id?: string
  product_name?: string
  type?: 'interest_free' | 'discount' | 'reduction' | 'cash' | 'gift' | 'PRICED_DISCOUNT'
  creator?: string
  creatorId?: string
  /** 挂载的库存批次（PRD §12.2，v1.2.8 字段名） */
  inventory_batches?: MockInventoryBatch[]
  // v1.2.9 修订: 停用时间戳 — 仅在 status='inactive' 时由 handleStatusChange 写入
  // 必为可选字段，避免 5/26 教训链 #1（types 与 mock 实例字段必对齐）导致列渲染异常
  // 重新激活或解绑回退 draft 时清空
  // 6/11 T1: 改名为 invalidated_time 复用 PRD §11.3 (避免字段冗余)
  invalidated_time?: string
  // 6/9 v1.3.1 教训链修复: 补 2 字段（package/index.vue 列映射）—— 消除 v1.2.8-C' v2 公开承认的偏差
  /** 包含的券种类数组（package/index.vue 表格列 data-index="couponTypes"） */
  couponTypes?: string[]
  /** 挂载的券库存模板列表（package/index.vue 表格列 data-index="inventoryTemplates"，替代 inventory_batches 业务语义） */
  inventoryTemplates?: MockInventoryBatch[]
}

export interface MockRecord {
  id: string
  recordId: string
  userId: string
  userName: string
  couponName: string
  /**
   * 操作类型 (v1.4 §2.5 流水层)
   * v1.2.9 修复: 补6 类型 (received/locked/unlocked/used/expired/invalidated) + 1 failed
   */
  action: 'received' | 'locked' | 'unlocked' | 'used' | 'expired' | 'invalidated' | 'failed'
  /** v1.2.9 修复: 操作时间 (与 createTime 区分) */
  operationTime: string
  /** v1.2.9 修复: 实例状态 (v1.4 §2.3.1 临价 4 态) */
  status?: 'pending' | 'received' | 'invalidated' | 'expired'
  /** v1.2.9 修复: 失败码 1001-1005 (v1.4 §1.8 仅临价) */
  failureCode?: number
  /** v1.2.9 修复: 失败原因文案 */
  failureReason?: string
  /** v1.2.9 修复: pending 超时时间 (仅 1002) */
  timeoutTime?: string
  /** v1.2.9 修复: 详情文本 */
  failedReason?: string
  /** 遗留字段 - 保持向后兼容 */
  createTime: string
  // 6/9 v1.3.1 教训链修复: 补 6 字段（record/index.vue 列/筛选映射）—— 消除中英文 enum 静默失败
  /** 券实例ID（表格列 data-index="couponId"） */
  couponId?: string
  /** 券库存ID（表格列 data-index="inventoryId"） */
  inventoryId?: string
  /** 券包ID（表格列 data-index="packageId"） */
  packageId?: string
  /** 任务ID（表格列 data-index="taskId"） */
  taskId?: string
  /**
   * 流水类型（中文 enum，对齐 record/index.vue v-if/option）
   * 6 态: '发放' / '锁定' / '解锁' / '核销' / '过期' / '作废'
   */
  operationType?: '发放' | '锁定' | '解锁' | '核销' | '过期' | '作废'
  /**
   * 发放状态（中文 enum，对齐 record/index.vue 表格列 '成功'/'失败' 颜色判断）
   * 2 态: '成功' / '失败'
   */
  status?: '成功' | '失败'
}

export interface MockCoupon {
  id: string
  instanceId: string
  couponId: string
  templateId: string
  couponName: string
  couponType: 'discount' | 'reduction' | 'cash' | 'gift' | 'PRICED_DISCOUNT' | 'interest_free'
  /**
   * 券实例状态（9 态，PRD v1.2.8 §11.3）
   * 对齐 types/api/coupon.ts CouponInventory.status
   * 5/26 教训链 #1: types 与 mock enum 1:1 必对齐，杜绝静默失败
   */
  status:
    | 'pending'
    | 'received'
    | 'failed_1001_core_rejected'
    | 'failed_1002_timeout'
    | 'failed_1003_invalidation'
    | 'failed_1004_kafka_push'
    | 'failed_1005_kafka_consume'
    | 'invalidated'
    | 'expired'
  /** 作废时间（PRD §11.3 invalidated 列） */
  invalidated_time?: string
  /**
   * 失败码（PRD v1.2.6 §11.3.1，数字码 1001-1005）
   * 仅 failed_* 状态时使用
   */
  failure_code?: number
  /** 失败原因文案（PRD v1.2.6 §11.3.1） */
  failure_reason?: string
  /** pending 超时时间（PRD v1.2.6 §11.3.2） */
  timeout_time?: string
  validPeriod: string
  createTime: string
  // v1.2.8 5/26 教训链 #4: mock 实例中字段必须 types 同步声明，否则 TS 编译报错
  startTime?: string
  endTime?: string
  userId?: string
  userName?: string
  product_id?: string
  product_name?: string
  operator?: string
  stock?: number
  validity?: string
  grantChannel?: 'simulate_jd' | 'simulate_mt' | 'manual'
  approvalStatus?: 'pending' | 'approved' | 'rejected'
  unclaimed?: number
  claimed?: number
  locked?: number
  used?: number
  expired?: number
  invalid?: number
  // 6/9 v1.3.1 教训链修复: 补 6 字段（management/index.vue 详情弹窗硬编码字段映射）—— 消除 undefined
  /** 审核员（详情弹窗硬编码） */
  auditor?: string
  /** 总发放数量（详情弹窗硬编码，=stock） */
  totalCount?: number
  /** 单日发放上限（创建券库存表单沉淀字段） */
  dailyLimit?: number | null
  /** 单周发放上限（创建券库存表单沉淀字段） */
  weeklyLimit?: number | null
  /** 单月发放上限（创建券库存表单沉淀字段） */
  monthlyLimit?: number | null
  /** 券使用场景（创建券库存表单沉淀字段：batch_distribution 批量下发 / telemarketing 电销使用） */
  usageScenarios?: string[]
  /** 有效期类型（创建券库存表单沉淀字段：absolute 绝对有效期 / relative 相对有效期） */
  validityType?: 'absolute' | 'relative'
  /** 相对有效期天数（validityType=relative 时生效） */
  relativeDays?: number
  /** 已核销（详情弹窗硬编码，=used） */
  verified?: number
  /** 使用规则（详情弹窗硬编码） */
  rules?: string
  /** 有效期开始（详情弹窗硬编码，=startTime） */
  validityStartTime?: string
  /** 有效期结束（详情弹窗硬编码，=endTime） */
  validityEndTime?: string
}

// Mock data（包含 SUD001 + PRICED_DISCOUNT）
// 6/9 v1.3.1 修复: 4 条全补 creator / useChannels / validityPeriodType
// 6/9 v1.3.1 修复: 2 条普通券补 products 数组（前 2 条缺，后 2 条 PRICED 已有）
export const templateMockData: MockTemplate[] = [
  {
    id: '1',
    templateId: 'T001',
    name: '新人专享券',
    type: 'interest_free',
    description: '新用户首单立减',
    denomination: 20,
    threshold: 100,
    validDays: 30,
    status: 'online',
    createTime: '2024-01-01 10:00:00',
    updateTime: '2024-01-15 14:30:00',
    creator: '系统管理员',
    useChannels: ['simulate_jd', 'manual'],
    validityPeriodType: 'fixed',
    products: ['SUD001'],
  },
  {
    id: '2',
    templateId: 'T002',
    name: '满减券',
    type: 'discount',
    description: '满200减50',
    denomination: 50,
    threshold: 200,
    validDays: 15,
    status: 'online',
    createTime: '2024-01-05 09:00:00',
    updateTime: '2024-01-10 16:00:00',
    creator: '运营小王',
    useChannels: ['manual'],
    validityPeriodType: 'fixed',
    products: ['SUD001'],
  },
  // 临价折扣券 Mock
  {
    id: 'PRICED-001',
    templateId: 'TPL-PRICED-001',
    name: '京东大额低息临价券',
    type: 'PRICED_DISCOUNT',
    product_id: 'JD_001',
    product_name: '京东大额低息',
    discount_value: 0.8,
    valid_from: '2026-06-01',
    valid_to: '2026-06-30',
    status: 'online',
    createTime: '2026-06-01 10:00:00',
    updateTime: '2026-06-01 10:00:00',
    creator: '运营小王',
    useChannels: ['simulate_jd'],
    validityPeriodType: 'fixed',
    products: ['JD_001'],
  },
  {
    id: 'PRICED-002',
    templateId: 'TPL-PRICED-002',
    name: '美团大额低息临价券',
    type: 'PRICED_DISCOUNT',
    product_id: 'MT_001',
    product_name: '美团大额低息',
    discount_value: 0.85,
    valid_from: '2026-06-01',
    valid_to: '2026-06-30',
    status: 'online',
    createTime: '2026-06-01 10:00:00',
    updateTime: '2026-06-01 10:00:00',
    creator: '运营小李',
    useChannels: ['simulate_mt'],
    validityPeriodType: 'fixed',
    products: ['MT_001'],
  },
]

export const packageMockData: MockPackage[] = [
  {
    id: '1',
    packageId: 'P001',
    name: '新人礼包',
    description: '新用户专属礼包，含3张优惠券',
    couponCount: 3,
    totalValue: 100,
    status: 'active',
    validDays: 30,
    createTime: '2024-01-01 10:00:00',
    product_id: 'SUD001',
    product_name: '速贷产品',
    type: 'interest_free',
    creator: '系统管理员',
    creatorId: 'A001',
    // 6/9 v1.3.1 修复: 补 couponTypes（包含券种类数组）+ inventoryTemplates（挂载的券库存模板）
    couponTypes: ['interest_free', 'discount'],
    inventoryTemplates: [
      { batch_id: 'B001', template_id: 'T001', total: 1000, remaining: 642 },
      { batch_id: 'B002', template_id: 'T002', total: 500, remaining: 318 },
    ],
    inventory_batches: [
      { batch_id: 'B001', template_id: 'T001', total: 1000, remaining: 642 },
      { batch_id: 'B002', template_id: 'T002', total: 500, remaining: 318 },
    ],
  },
  {
    id: '2',
    packageId: 'P002',
    name: '美团大额低息礼包',
    description: '美团临价券包，限时优惠',
    couponCount: 2,
    totalValue: 80,
    status: 'active',
    validDays: 30,
    createTime: '2024-01-05 10:00:00',
    product_id: 'MT_001',
    product_name: '美团大额低息',
    type: 'PRICED_DISCOUNT',
    creator: '运营小李',
    creatorId: 'U002',
    couponTypes: ['PRICED_DISCOUNT'],
    inventoryTemplates: [
      { batch_id: 'B003', template_id: 'TPL-PRICED-002', total: 800, remaining: 0 },
    ],
    inventory_batches: [
      { batch_id: 'B003', template_id: 'TPL-PRICED-002', total: 800, remaining: 0 },
    ],
  },
  {
    id: '3',
    packageId: 'P003',
    name: '京东 6 月活动包',
    description: '京东渠道专项优惠',
    couponCount: 5,
    totalValue: 200,
    status: 'active',
    validDays: 30,
    createTime: '2024-06-01 09:00:00',
    product_id: 'JD_001',
    product_name: '京东大额低息',
    type: 'PRICED_DISCOUNT',
    creator: '运营小王',
    creatorId: 'U003',
    couponTypes: ['PRICED_DISCOUNT', 'cash'],
    inventoryTemplates: [
      { batch_id: 'B004', template_id: 'TPL-PRICED-001', total: 1500, remaining: 280 },
    ],
    inventory_batches: [
      { batch_id: 'B004', template_id: 'TPL-PRICED-001', total: 1500, remaining: 280 },
    ],
  },
  {
    id: '4',
    packageId: 'P004',
    name: '测试用过期包',
    description: '已过期，无法领取（demo 收紧后以 inactive 表达）',
    couponCount: 2,
    totalValue: 50,
    status: 'inactive',
    validDays: 15,
    createTime: '2023-12-01 10:00:00',
    product_id: 'SUD001',
    product_name: '速贷产品',
    type: 'discount',
    creator: '测试员',
    creatorId: 'U004',
    couponTypes: ['discount'],
    inventoryTemplates: [
      { batch_id: 'B005', template_id: 'T001', total: 200, remaining: 0 },
    ],
    inventory_batches: [
      { batch_id: 'B005', template_id: 'T001', total: 200, remaining: 0 },
    ],
  },
  {
    id: '5',
    packageId: 'P005',
    name: '已暂停测试包',
    description: '活动暂停中（demo 收紧后以 inactive 表达）',
    couponCount: 3,
    totalValue: 90,
    status: 'inactive',
    validDays: 20,
    createTime: '2024-05-01 10:00:00',
    product_id: 'MT_001',
    product_name: '美团大额低息',
    type: 'PRICED_DISCOUNT',
    creator: '运营小李',
    creatorId: 'U002',
    couponTypes: ['PRICED_DISCOUNT'],
    inventoryTemplates: [
      { batch_id: 'B006', template_id: 'TPL-PRICED-004', total: 600, remaining: 155 },
    ],
    inventory_batches: [
      { batch_id: 'B006', template_id: 'TPL-PRICED-004', total: 600, remaining: 155 },
    ],
  },
  {
    id: '6',
    packageId: 'P006',
    name: '草稿包',
    description: '待发布的券包草稿',
    couponCount: 4,
    totalValue: 150,
    status: 'draft',
    validDays: 30,
    createTime: '2026-06-02 09:00:00',
    product_id: 'JD_001',
    product_name: '京东大额低息',
    type: 'PRICED_DISCOUNT',
    creator: '运营小王',
    creatorId: 'U003',
    couponTypes: ['PRICED_DISCOUNT', 'discount'],
    inventoryTemplates: [
      { batch_id: 'B007', template_id: 'TPL-PRICED-003', total: 500, remaining: 500 },
      { batch_id: 'B008', template_id: 'TPL-PRICED-005', total: 300, remaining: 300 },
    ],
    inventory_batches: [
      { batch_id: 'B007', template_id: 'TPL-PRICED-003', total: 500, remaining: 500 },
      { batch_id: 'B008', template_id: 'TPL-PRICED-005', total: 300, remaining: 300 },
    ],
  },
  {
    id: '7',
    packageId: 'P007',
    name: '大额低息专属包',
    description: '针对高价值用户定向发放',
    couponCount: 6,
    totalValue: 300,
    status: 'active',
    validDays: 45,
    createTime: '2024-06-10 10:00:00',
    product_id: 'JD_001',
    product_name: '京东大额低息',
    type: 'PRICED_DISCOUNT',
    creator: '系统管理员',
    creatorId: 'A001',
    couponTypes: ['PRICED_DISCOUNT', 'reduction'],
    inventoryTemplates: [
      { batch_id: 'B009', template_id: 'TPL-PRICED-006', total: 200, remaining: 47 },
    ],
    inventory_batches: [
      { batch_id: 'B009', template_id: 'TPL-PRICED-006', total: 200, remaining: 47 },
    ],
  },
  {
    id: '8',
    packageId: 'P008',
    name: '美团 7 月活动包',
    description: '美团渠道 7 月限时活动',
    couponCount: 4,
    totalValue: 160,
    status: 'active',
    validDays: 31,
    createTime: '2026-06-15 08:00:00',
    product_id: 'MT_001',
    product_name: '美团大额低息',
    type: 'PRICED_DISCOUNT',
    creator: '运营小张',
    creatorId: 'U005',
    couponTypes: ['PRICED_DISCOUNT'],
    inventoryTemplates: [
      { batch_id: 'B010', template_id: 'TPL-PRICED-002', total: 700, remaining: 700 },
      { batch_id: 'B011', template_id: 'TPL-PRICED-004', total: 400, remaining: 400 },
    ],
    inventory_batches: [
      { batch_id: 'B010', template_id: 'TPL-PRICED-002', total: 700, remaining: 700 },
      { batch_id: 'B011', template_id: 'TPL-PRICED-004', total: 400, remaining: 400 },
    ],
  },
]

/**
 * v1.2.9 修复: 补 6 操作类型 + 5 失败码实例
 * 总计 12 条流水 (6 成功 + 1 实例复制 + 5 failed_*)
 * 完全覆盖 v1.4 §1.8 + §2.3.1 实战场景
 */
export const recordMockData: MockRecord[] = [
  // ===== 6 类型成功流水 (v1.4 §2.3.2) =====
  {
    id: '1',
    recordId: 'R001',
    userId: 'U001',
    userName: '张三',
    couponName: '新人专享券',
    action: 'received',
    // 6/9 v1.3.1 修复: status 改为中文 enum「成功」对齐 record/index.vue 表格列
    status: '成功',
    operationTime: '2024-01-10 10:00:00',
    createTime: '2024-01-10 10:00:00',
    couponId: 'C003',
    inventoryId: 'I003',
    packageId: 'P001',
    taskId: 'TASK-R001',
    operationType: '发放',
  },
  {
    id: '2',
    recordId: 'R002',
    userId: 'U002',
    userName: '李四',
    couponName: '减免息费 100 元券',
    action: 'locked',
    status: '成功',
    operationTime: '2024-01-15 14:30:00',
    createTime: '2024-01-15 14:30:00',
    couponId: 'C003',
    inventoryId: 'I003',
    packageId: 'P001',
    taskId: 'TASK-R002',
    operationType: '锁定',
  },
  {
    id: '3',
    recordId: 'R003',
    userId: 'U003',
    userName: '王五',
    couponName: '折什一 5 折优惠券',
    action: 'unlocked',
    status: '成功',
    operationTime: '2024-01-20 11:15:00',
    createTime: '2024-01-20 11:15:00',
    couponId: 'C013',
    inventoryId: 'I013',
    packageId: 'P001',
    taskId: 'TASK-R003',
    operationType: '解锁',
  },
  {
    id: '4',
    recordId: 'R004',
    userId: 'U004',
    userName: '赵六',
    couponName: '减免息费 50 元券',
    action: 'used',
    status: '成功',
    operationTime: '2024-01-25 16:45:00',
    createTime: '2024-01-25 16:45:00',
    couponId: 'C012',
    inventoryId: 'I012',
    packageId: 'P001',
    taskId: 'TASK-R004',
    operationType: '核销',
  },
  {
    id: '5',
    recordId: 'R005',
    userId: 'U005',
    userName: '孙七',
    couponName: '临价折扣优惠券',
    action: 'expired',
    status: '成功',
    operationTime: '2024-02-01 09:00:00',
    createTime: '2024-02-01 09:00:00',
    couponId: 'C004',
    inventoryId: 'I004',
    packageId: 'P004',
    taskId: 'TASK-R005',
    operationType: '过期',
  },
  {
    id: '6',
    recordId: 'R006',
    userId: 'U006',
    userName: '周八',
    couponName: '京东大额低息临价券',
    action: 'invalidated',
    status: '成功',
    operationTime: '2024-02-05 15:20:00',
    createTime: '2024-02-05 15:20:00',
    couponId: 'C001',
    inventoryId: 'I001',
    packageId: 'P003',
    taskId: 'TASK-R006',
    operationType: '作废',
  },
  // ===== 5 failed_* 流水 (v1.4 §1.8) =====
  {
    id: '7',
    recordId: 'R007',
    userId: 'U007',
    userName: '吴九',
    couponName: '京东大额低息临价券',
    action: 'failed',
    // 6/9 v1.3.1 修复: failed_* 对齐中文 enum「失败」
    status: '失败',
    failureCode: 1001,
    failureReason: '资质不通过',
    failedReason: '核心拒收：用户资质校验未通过',
    operationTime: '2024-02-10 10:30:00',
    createTime: '2024-02-10 10:30:00',
    couponId: 'C001',
    inventoryId: 'I001',
    packageId: 'P003',
    taskId: 'TASK-R007',
    operationType: '发放',
  },
  {
    id: '8',
    recordId: 'R008',
    userId: 'U008',
    userName: '郑十',
    couponName: '美团大额低息临价券',
    action: 'failed',
    status: '失败',
    failureCode: 1002,
    failureReason: '5 分钟未收到回执',
    timeoutTime: '2024-02-12 14:35:00',
    failedReason: 'pending 超时：5 分钟未收到核心回执',
    operationTime: '2024-02-12 14:35:00',
    createTime: '2024-02-12 14:35:00',
    couponId: 'C002',
    inventoryId: 'I002',
    packageId: 'P002',
    taskId: 'TASK-R008',
    operationType: '发放',
  },
  {
    id: '9',
    recordId: 'R009',
    userId: 'U009',
    userName: '赵一一',
    couponName: '折什一临价券',
    action: 'failed',
    status: '失败',
    failureCode: 1003,
    failureReason: '存量作废失败',
    failedReason: '存量作废失败：同事务回滚，库存回滚',
    operationTime: '2024-02-15 11:00:00',
    createTime: '2024-02-15 11:00:00',
    couponId: 'C013',
    inventoryId: 'I013',
    packageId: 'P001',
    taskId: 'TASK-R009',
    operationType: '作废',
  },
  {
    id: '10',
    recordId: 'R010',
    userId: 'U010',
    userName: '钱一二',
    couponName: '京东大额低息临价券',
    action: 'failed',
    status: '失败',
    failureCode: 1004,
    failureReason: 'Kafka producer 重试耗尽',
    failedReason: '推送失败：权益→核心 Kafka producer 重试耗尽',
    operationTime: '2024-02-18 16:25:00',
    createTime: '2024-02-18 16:25:00',
    couponId: 'C001',
    inventoryId: 'I001',
    packageId: 'P003',
    taskId: 'TASK-R010',
    operationType: '发放',
  },
  {
    id: '11',
    recordId: 'R011',
    userId: 'U011',
    userName: '孙一三',
    couponName: '美团大额低息临价券',
    action: 'failed',
    status: '失败',
    failureCode: 1005,
    failureReason: 'Kafka consumer 重试耗尽',
    failedReason: '消费失败：核心→权益 Kafka consumer 重试耗尽',
    operationTime: '2024-02-20 13:40:00',
    createTime: '2024-02-20 13:40:00',
    couponId: 'C002',
    inventoryId: 'I002',
    packageId: 'P002',
    taskId: 'TASK-R011',
    operationType: '发放',
  },
  // ===== 额外补 1 临价成功 received 示例 (v1.4 §1.7 "1 张 received" 限领) =====
  {
    id: '12',
    recordId: 'R012',
    userId: 'U012',
    userName: '李一四',
    couponName: '京东大额低息临价券',
    action: 'received',
    status: '成功',
    operationTime: '2024-03-01 14:00:00',
    createTime: '2024-03-01 14:00:00',
    couponId: 'C001',
    inventoryId: 'I001',
    packageId: 'P003',
    taskId: 'TASK-R012',
    operationType: '发放',
  },
]

export const couponMockData: MockCoupon[] = [

  {
    id: '1',
    instanceId: 'I001',
    couponId: 'C001',
    templateId: 'TPL-PRICED-001',
    couponName: '京东大额低息临价券',
    couponType: 'PRICED_DISCOUNT',
    status: 'received',
    validPeriod: '2026-06-01 至 2026-06-30',
    startTime: '2026-06-01',
    endTime: '2026-06-30',
    createTime: '2026-06-01 10:00:00',
    userId: 'U101',
    userName: '张三',
    product_id: 'JD_001',
    product_name: '京东大额低息',
    operator: '运营小王',
    // 6/9 v1.3.1 教训链修复: 补 6 字段（management 详情弹窗）
    auditor: '运营小王',
    totalCount: 1000,  // = stock
    verified: 0,  // = used
    rules: '同一用户仅可领取1次；30天内有效；不可与其它优惠叠加',
    validityStartTime: '2026-06-01',  // = startTime
    validityEndTime: '2026-06-30',  // = endTime
    stock: 1000,
    validity: '30天',
    grantChannel: 'simulate_jd',
    approvalStatus: 'pending',
    unclaimed: 250,
    claimed: 750,
    locked: 0,
    used: 0,
    expired: 0,
    invalid: 0,
  },
  {
    id: '2',
    instanceId: 'I002',
    couponId: 'C002',
    templateId: 'TPL-PRICED-002',
    couponName: '美团大额低息临价券',
    couponType: 'PRICED_DISCOUNT',
    status: 'received',
    validPeriod: '2026-06-01 至 2026-06-30',
    startTime: '2026-06-01',
    endTime: '2026-06-30',
    createTime: '2026-06-01 11:00:00',
    userId: 'U102',
    userName: '李四',
    product_id: 'MT_001',
    product_name: '美团大额低息',
    operator: '运营小李',
    // 6/9 v1.3.1 教训链修复: 补 6 字段（management 详情弹窗）
    auditor: '运营小李',
    totalCount: 800,  // = stock
    verified: 0,  // = used
    rules: '同一用户仅可领取1次；30天内有效；不可与其它优惠叠加',
    validityStartTime: '2026-06-01',  // = startTime
    validityEndTime: '2026-06-30',  // = endTime
    stock: 800,
    validity: '30天',
    grantChannel: 'simulate_mt',
    approvalStatus: 'pending',
    unclaimed: 200,
    claimed: 600,
    locked: 0,
    used: 0,
    expired: 0,
    invalid: 0,
  },
  {
    id: '3',
    instanceId: 'I003',
    couponId: 'C003',
    templateId: 'T001',
    couponName: '新人专享券',
    couponType: 'interest_free',
    status: 'received',
    validPeriod: '2024-01-10 至 2024-02-09',
    startTime: '2024-01-10',
    endTime: '2024-02-09',
    createTime: '2024-01-10 10:00:00',
    userId: 'U103',
    userName: '王五',
    product_id: 'SUD001',
    product_name: '速贷产品',
    operator: '系统',
    // 6/9 v1.3.1 教训链修复: 补 6 字段（management 详情弹窗）
    auditor: '系统',
    totalCount: 5000,  // = stock
    verified: 0,  // = used
    rules: '同一用户仅可领取1次；30天内有效；不可与其它优惠叠加',
    validityStartTime: '2024-01-10',  // = startTime
    validityEndTime: '2024-02-09',  // = endTime
    stock: 5000,
    validity: '30天',
    grantChannel: 'manual',
    approvalStatus: 'approved',
    unclaimed: 1250,
    claimed: 3750,
    locked: 0,
    used: 0,
    expired: 0,
    invalid: 0,
  },
  {
    id: '4',
    instanceId: 'I004',
    couponId: 'C004',
    templateId: 'T002',
    couponName: '满减券',
    couponType: 'reduction',
    // 5/26 教训链修复: types 9 态已删 'used'（PRD v1.2.8 §11.3 明确「无已使用」）
    // 注: 该条为 SUD001 老数据,本字段保留 by 'expired' 表达「已使用后过期」
    status: 'expired',
    validPeriod: '2024-02-01 至 2024-02-28',
    startTime: '2024-02-01',
    endTime: '2024-02-28',
    createTime: '2024-02-01 09:00:00',
    userId: 'U104',
    userName: '孙七',
    product_id: 'SUD001',
    product_name: '速贷产品',
    operator: '运营小王',
    // 6/9 v1.3.1 教训链修复: 补 6 字段（management 详情弹窗）
    auditor: '运营小王',
    totalCount: 3000,  // = stock
    verified: 2000,  // = used
    rules: '同一用户仅可领取1次；30天内有效；不可与其它优惠叠加',
    validityStartTime: '2024-02-01',  // = startTime
    validityEndTime: '2024-02-28',  // = endTime
    stock: 3000,
    validity: '28天',
    grantChannel: 'manual',
    approvalStatus: 'approved',
    unclaimed: 0,
    claimed: 1000,
    locked: 0,
    used: 2000,
    expired: 0,
    invalid: 0,
  },
  {
    id: '5',
    instanceId: 'I005',
    couponId: 'C005',
    templateId: 'T003',
    couponName: '节日特惠券',
    couponType: 'cash',
    status: 'expired',
    validPeriod: '2024-02-10 至 2024-02-15',
    startTime: '2024-02-10',
    endTime: '2024-02-15',
    createTime: '2024-02-10 10:00:00',
    userId: 'U105',
    userName: '赵八',
    product_id: 'SUD001',
    product_name: '速贷产品',
    operator: '系统',
    // 6/9 v1.3.1 教训链修复: 补 6 字段（management 详情弹窗）
    auditor: '系统',
    totalCount: 1000,  // = stock
    verified: 0,  // = used
    rules: '同一用户仅可领取1次；30天内有效；不可与其它优惠叠加',
    validityStartTime: '2024-02-10',  // = startTime
    validityEndTime: '2024-02-15',  // = endTime
    stock: 1000,
    validity: '5天',
    grantChannel: 'manual',
    approvalStatus: 'approved',
    unclaimed: 0,
    claimed: 500,
    locked: 0,
    used: 0,
    expired: 500,
    invalid: 0,
  },
  {
    id: '6',
    instanceId: 'I006',
    couponId: 'C006',
    templateId: 'TPL-PRICED-003',
    couponName: '京东会员专享临价券',
    couponType: 'PRICED_DISCOUNT',
    // 5/26 教训链修复: types 9 态已删 'locked',对齐为 'received'（PRICED_DISCOUNT 无"已锁定"概念）
    status: 'received',
    validPeriod: '2026-06-15 至 2026-07-15',
    startTime: '2026-06-15',
    endTime: '2026-07-15',
    createTime: '2026-06-15 10:00:00',
    userId: 'U106',
    userName: '陈九',
    product_id: 'JD_001',
    product_name: '京东大额低息',
    operator: '运营小王',
    // 6/9 v1.3.1 教训链修复: 补 6 字段（management 详情弹窗）
    auditor: '运营小王',
    totalCount: 500,  // = stock
    verified: 0,  // = used
    rules: '同一用户仅可领取1次；30天内有效；不可与其它优惠叠加',
    validityStartTime: '2026-06-15',  // = startTime
    validityEndTime: '2026-07-15',  // = endTime
    stock: 500,
    validity: '30天',
    grantChannel: 'simulate_jd',
    approvalStatus: 'pending',
    unclaimed: 100,
    claimed: 250,
    locked: 150,
    used: 0,
    expired: 0,
    invalid: 0,
  },
  {
    id: '7',
    instanceId: 'I007',
    couponId: 'C007',
    templateId: 'TPL-PRICED-004',
    couponName: '美团复借专享券',
    couponType: 'PRICED_DISCOUNT',
    status: 'received',
    validPeriod: '2026-07-01 至 2026-07-31',
    startTime: '2026-07-01',
    endTime: '2026-07-31',
    createTime: '2026-07-01 10:00:00',
    userId: 'U107',
    userName: '周十',
    product_id: 'MT_001',
    product_name: '美团大额低息',
    operator: '运营小李',
    // 6/9 v1.3.1 教训链修复: 补 6 字段（management 详情弹窗）
    auditor: '运营小李',
    totalCount: 600,  // = stock
    verified: 0,  // = used
    rules: '同一用户仅可领取1次；30天内有效；不可与其它优惠叠加',
    validityStartTime: '2026-07-01',  // = startTime
    validityEndTime: '2026-07-31',  // = endTime
    stock: 600,
    validity: '30天',
    grantChannel: 'simulate_mt',
    approvalStatus: 'pending',
    unclaimed: 150,
    claimed: 450,
    locked: 0,
    used: 0,
    expired: 0,
    invalid: 0,
  },
  {
    id: '8',
    instanceId: 'I008',
    couponId: 'C008',
    templateId: 'TPL-PRICED-001',
    couponName: '京东大额低息临价券',
    couponType: 'PRICED_DISCOUNT',
    // 5/26 教训链修复: types 9 态已删 'used'（PRICED_DISCOUNT 无"已使用"状态）
    // 已发放实例用 'invalidated' 表达历史态（dev 接手时可按业务补全字段）
    status: 'invalidated',
    validPeriod: '2026-06-01 至 2026-06-30',
    startTime: '2026-06-01',
    endTime: '2026-06-30',
    createTime: '2026-06-05 14:30:00',
    userId: 'U108',
    userName: '吴十一',
    product_id: 'JD_001',
    product_name: '京东大额低息',
    operator: '运营小王',
    // 6/9 v1.3.1 教训链修复: 补 6 字段（management 详情弹窗）
    auditor: '运营小王',
    totalCount: 1500,  // = stock
    verified: 1000,  // = used
    rules: '同一用户仅可领取1次；30天内有效；不可与其它优惠叠加',
    validityStartTime: '2026-06-01',  // = startTime
    validityEndTime: '2026-06-30',  // = endTime
    stock: 1500,
    validity: '30天',
    grantChannel: 'simulate_jd',
    approvalStatus: 'approved',
    unclaimed: 0,
    claimed: 500,
    locked: 0,
    used: 1000,
    expired: 0,
    invalid: 0,
  },
  {
    id: '9',
    instanceId: 'I009',
    couponId: 'C009',
    templateId: 'TPL-PRICED-005',
    couponName: '京东大额低息渠道专享',
    couponType: 'PRICED_DISCOUNT',
    status: 'invalidated',
    validPeriod: '2026-06-20 至 2026-07-20',
    startTime: '2026-06-20',
    endTime: '2026-07-20',
    createTime: '2026-06-20 09:00:00',
    invalidated_time: '2026-06-22 11:00:00',
    userId: 'U109',
    userName: '郑十二',
    product_id: 'JD_001',
    product_name: '京东大额低息',
    operator: '运营小王',
    // 6/9 v1.3.1 教训链修复: 补 6 字段（management 详情弹窗）
    auditor: '运营小王',
    totalCount: 800,  // = stock
    verified: 0,  // = used
    rules: '同一用户仅可领取1次；30天内有效；不可与其它优惠叠加',
    validityStartTime: '2026-06-20',  // = startTime
    validityEndTime: '2026-07-20',  // = endTime
    stock: 800,
    validity: '30天',
    grantChannel: 'manual',
    approvalStatus: 'rejected',
    unclaimed: 0,
    claimed: 400,
    locked: 0,
    used: 0,
    expired: 0,
    invalid: 400,
  },
  {
    id: '10',
    instanceId: 'I010',
    couponId: 'C010',
    templateId: 'TPL-PRICED-006',
    couponName: '京东大额低息专属券',
    couponType: 'PRICED_DISCOUNT',
    status: 'received',
    validPeriod: '2026-06-25 至 2026-07-25',
    startTime: '2026-06-25',
    endTime: '2026-07-25',
    createTime: '2026-06-25 10:00:00',
    userId: 'U110',
    userName: '王十三',
    product_id: 'JD_001',
    product_name: '京东大额低息',
    operator: '系统',
    // 6/9 v1.3.1 教训链修复: 补 6 字段（management 详情弹窗）
    auditor: '系统',
    totalCount: 200,  // = stock
    verified: 0,  // = used
    rules: '同一用户仅可领取1次；30天内有效；不可与其它优惠叠加',
    validityStartTime: '2026-06-25',  // = startTime
    validityEndTime: '2026-07-25',  // = endTime
    stock: 200,
    validity: '30天',
    grantChannel: 'manual',
    approvalStatus: 'approved',
    unclaimed: 50,
    claimed: 150,
    locked: 0,
    used: 0,
    expired: 0,
    invalid: 0,
  },
  {
    id: '11',
    instanceId: 'I011',
    couponId: 'C011',
    templateId: 'TPL-PRICED-002',
    couponName: '美团大额低息临价券',
    couponType: 'PRICED_DISCOUNT',
    status: 'expired',
    validPeriod: '2026-05-01 至 2026-05-31',
    startTime: '2026-05-01',
    endTime: '2026-05-31',
    createTime: '2026-05-01 10:00:00',
    userId: 'U111',
    userName: '李十四',
    product_id: 'MT_001',
    product_name: '美团大额低息',
    operator: '运营小李',
    // 6/9 v1.3.1 教训链修复: 补 6 字段（management 详情弹窗）
    auditor: '运营小李',
    totalCount: 500,  // = stock
    verified: 0,  // = used
    rules: '同一用户仅可领取1次；30天内有效；不可与其它优惠叠加',
    validityStartTime: '2026-05-01',  // = startTime
    validityEndTime: '2026-05-31',  // = endTime
    stock: 500,
    validity: '30天',
    grantChannel: 'simulate_mt',
    approvalStatus: 'approved',
    unclaimed: 0,
    claimed: 250,
    locked: 0,
    used: 0,
    expired: 250,
    invalid: 0,
  },
  {
    id: '12',
    instanceId: 'I012',
    couponId: 'C012',
    templateId: 'T004',
    couponName: '生日专属免息券',
    couponType: 'interest_free',
    status: 'received',
    validPeriod: '2024-03-01 至 2024-03-31',
    startTime: '2024-03-01',
    endTime: '2024-03-31',
    createTime: '2024-03-01 10:00:00',
    userId: 'U112',
    userName: '张十五',
    product_id: 'SUD001',
    product_name: '速贷产品',
    operator: '系统',
    // 6/9 v1.3.1 教训链修复: 补 6 字段（management 详情弹窗）
    auditor: '系统',
    totalCount: 2000,  // = stock
    verified: 0,  // = used
    rules: '同一用户仅可领取1次；30天内有效；不可与其它优惠叠加',
    validityStartTime: '2024-03-01',  // = startTime
    validityEndTime: '2024-03-31',  // = endTime
    stock: 2000,
    validity: '30天',
    grantChannel: 'manual',
    approvalStatus: 'approved',
    unclaimed: 500,
    claimed: 1500,
    locked: 0,
    used: 0,
    expired: 0,
    invalid: 0,
  },
  {
    id: '13',
    instanceId: 'I013',
    couponId: 'C013',
    templateId: 'T005',
    couponName: '春季促销券',
    couponType: 'discount',
    status: 'expired',
    validPeriod: '2024-03-15 至 2024-05-15',
    startTime: '2024-03-15',
    endTime: '2024-05-15',
    createTime: '2024-03-15 10:00:00',
    userId: 'U113',
    userName: '赵十六',
    product_id: 'SUD001',
    product_name: '速贷产品',
    operator: '运营小王',
    // 6/9 v1.3.1 教训链修复: 补 6 字段（management 详情弹窗）
    auditor: '运营小王',
    totalCount: 4000,  // = stock
    verified: 0,  // = used
    rules: '同一用户仅可领取1次；30天内有效；不可与其它优惠叠加',
    validityStartTime: '2024-03-15',  // = startTime
    validityEndTime: '2024-05-15',  // = endTime
    stock: 4000,
    validity: '60天',
    grantChannel: 'manual',
    approvalStatus: 'approved',
    unclaimed: 0,
    claimed: 2000,
    locked: 0,
    used: 0,
    expired: 2000,
    invalid: 0,
  },
  {
    id: '14',
    instanceId: 'I014',
    couponId: 'C014',
    templateId: 'T006',
    couponName: '新手体验券',
    couponType: 'cash',
    status: 'invalidated',
    validPeriod: '2024-04-01 至 2024-09-30',
    startTime: '2024-04-01',
    endTime: '2024-09-30',
    createTime: '2024-04-01 09:00:00',
    invalidated_time: '2024-04-05 16:00:00',
    userId: 'U114',
    userName: '孙十七',
    product_id: 'SUD001',
    product_name: '速贷产品',
    operator: '系统',
    // 6/9 v1.3.1 教训链修复: 补 6 字段（management 详情弹窗）
    auditor: '系统',
    totalCount: 1500,  // = stock
    verified: 0,  // = used
    rules: '同一用户仅可领取1次；30天内有效；不可与其它优惠叠加',
    validityStartTime: '2024-04-01',  // = startTime
    validityEndTime: '2024-09-30',  // = endTime
    stock: 1500,
    validity: '180天',
    grantChannel: 'manual',
    approvalStatus: 'rejected',
    unclaimed: 0,
    claimed: 750,
    locked: 0,
    used: 0,
    expired: 0,
    invalid: 750,
  },
  {
    id: '15',
    instanceId: 'I015',
    couponId: 'C015',
    templateId: 'TPL-PRICED-003',
    couponName: '京东会员8折券',
    couponType: 'PRICED_DISCOUNT',
    status: 'received',
    validPeriod: '2026-07-05 至 2026-08-05',
    startTime: '2026-07-05',
    endTime: '2026-08-05',
    createTime: '2026-07-05 10:00:00',
    userId: 'U115',
    userName: '周十八',
    product_id: 'JD_001',
    product_name: '京东大额低息',
    operator: '运营小王',
    // 6/9 v1.3.1 教训链修复: 补 6 字段（management 详情弹窗）
    auditor: '运营小王',
    totalCount: 700,  // = stock
    verified: 0,  // = used
    rules: '同一用户仅可领取1次；30天内有效；不可与其它优惠叠加',
    validityStartTime: '2026-07-05',  // = startTime
    validityEndTime: '2026-08-05',  // = endTime
    stock: 700,
    validity: '30天',
    grantChannel: 'simulate_jd',
    approvalStatus: 'pending',
    unclaimed: 175,
    claimed: 525,
    locked: 0,
    used: 0,
    expired: 0,
    invalid: 0,
  },
  {
    id: '16',
    instanceId: 'I016',
    couponId: 'C016',
    templateId: 'TPL-PRICED-004',
    couponName: '美团7月大促券',
    couponType: 'PRICED_DISCOUNT',
    status: 'received',
    validPeriod: '2026-07-15 至 2026-08-15',
    startTime: '2026-07-15',
    endTime: '2026-08-15',
    createTime: '2026-07-15 10:00:00',
    userId: 'U116',
    userName: '吴十九',
    product_id: 'MT_001',
    product_name: '美团大额低息',
    operator: '运营小李',
    // 6/9 v1.3.1 教训链修复: 补 6 字段（management 详情弹窗）
    auditor: '运营小李',
    totalCount: 1000,  // = stock
    verified: 0,  // = used
    rules: '同一用户仅可领取1次；30天内有效；不可与其它优惠叠加',
    validityStartTime: '2026-07-15',  // = startTime
    validityEndTime: '2026-08-15',  // = endTime
    stock: 1000,
    validity: '30天',
    grantChannel: 'simulate_mt',
    approvalStatus: 'pending',
    unclaimed: 250,
    claimed: 750,
    locked: 0,
    used: 0,
    expired: 0,
  },
  // ========== 5/26 教训链修复: 补 9 态全覆盖示例（PRD v1.2.8 §11.3 失败状态机） ==========
  // 1. pending 内部态示例（对用户不可见，仅内部追踪用）
  {
    id: '17',
    instanceId: 'I017',
    couponId: 'C017',
    templateId: 'TPL-PRICED-001',
    couponName: '京东大额低息临价券',
    couponType: 'PRICED_DISCOUNT',
    status: 'pending',
    validPeriod: '2026-07-20 至 2026-08-20',
    startTime: '2026-07-20',
    endTime: '2026-08-20',
    createTime: '2026-07-20 10:00:00',
    userId: 'U117',
    userName: '钱二十',
    product_id: 'JD_001',
    product_name: '京东大额低息',
    operator: '运营小王',
    // 6/9 v1.3.1 教训链修复: 补 6 字段（management 详情弹窗）
    auditor: '运营小王',
    totalCount: 300,  // = stock
    verified: 0,  // = used
    rules: '同一用户仅可领取1次；30天内有效；不可与其它优惠叠加',
    validityStartTime: '2026-07-20',  // = startTime
    validityEndTime: '2026-08-20',  // = endTime
    stock: 300,
    validity: '30天',
    grantChannel: 'simulate_jd',
    approvalStatus: 'pending',
    unclaimed: 75,
    claimed: 225,
    locked: 0,
    used: 0,
    expired: 0,
    invalid: 0,
  },
  // 2. failed_1001_core_rejected: 核心拒收（资质不通过）
  {
    id: '18',
    instanceId: 'I018',
    couponId: 'C018',
    templateId: 'TPL-PRICED-001',
    couponName: '京东大额低息临价券',
    couponType: 'PRICED_DISCOUNT',
    status: 'failed_1001_core_rejected',
    validPeriod: '2026-07-21 至 2026-08-21',
    startTime: '2026-07-21',
    endTime: '2026-08-21',
    createTime: '2026-07-21 10:00:00',
    userId: 'U118',
    userName: '孙二十一',
    product_id: 'JD_001',
    product_name: '京东大额低息',
    operator: '系统',
    // 6/9 v1.3.1 教训链修复: 补 6 字段（management 详情弹窗）
    auditor: '系统',
    totalCount: 100,  // = stock
    verified: 0,  // = used
    rules: '同一用户仅可领取1次；30天内有效；不可与其它优惠叠加',
    validityStartTime: '2026-07-21',  // = startTime
    validityEndTime: '2026-08-21',  // = endTime
    stock: 100,
    validity: '30天',
    grantChannel: 'simulate_jd',
    approvalStatus: 'rejected',
    unclaimed: 0,
    claimed: 100,
    locked: 0,
    used: 0,
    expired: 0,
    invalid: 100,
    failure_code: 1001,
    failure_reason: 'USER_QUALIFICATION_NOT_PASS',
  },
  // 3. failed_1002_timeout: 5 分钟未收到核心回执 + 企微报警
  {
    id: '19',
    instanceId: 'I019',
    couponId: 'C019',
    templateId: 'TPL-PRICED-002',
    couponName: '美团大额低息临价券',
    couponType: 'PRICED_DISCOUNT',
    status: 'failed_1002_timeout',
    validPeriod: '2026-07-22 至 2026-08-22',
    startTime: '2026-07-22',
    endTime: '2026-08-22',
    createTime: '2026-07-22 10:00:00',
    userId: 'U119',
    userName: '李二十二',
    product_id: 'MT_001',
    product_name: '美团大额低息',
    operator: '系统',
    // 6/9 v1.3.1 教训链修复: 补 6 字段（management 详情弹窗）
    auditor: '系统',
    totalCount: 200,  // = stock
    verified: 0,  // = used
    rules: '同一用户仅可领取1次；30天内有效；不可与其它优惠叠加',
    validityStartTime: '2026-07-22',  // = startTime
    validityEndTime: '2026-08-22',  // = endTime
    stock: 200,
    validity: '30天',
    grantChannel: 'simulate_mt',
    approvalStatus: 'pending',
    unclaimed: 0,
    claimed: 200,
    locked: 0,
    used: 0,
    expired: 0,
    invalid: 200,
    failure_code: 1002,
    failure_reason: '待核心方确认（建议: 系统繁忙，请稍后重试）',
    timeout_time: '2026-07-22 10:05:30',
  },
  // 4. failed_1003_invalidation: 存量作废失败（同事务回滚，库存回滚）
  {
    id: '20',
    instanceId: 'I020',
    couponId: 'C020',
    templateId: 'TPL-PRICED-001',
    couponName: '京东大额低息临价券',
    couponType: 'PRICED_DISCOUNT',
    status: 'failed_1003_invalidation',
    validPeriod: '2026-07-23 至 2026-08-23',
    startTime: '2026-07-23',
    endTime: '2026-08-23',
    createTime: '2026-07-23 10:00:00',
    userId: 'U120',
    userName: '周二十三',
    product_id: 'JD_001',
    product_name: '京东大额低息',
    operator: '运营小王',
    // 6/9 v1.3.1 教训链修复: 补 6 字段（management 详情弹窗）
    auditor: '运营小王',
    totalCount: 150,  // = stock
    verified: 0,  // = used
    rules: '同一用户仅可领取1次；30天内有效；不可与其它优惠叠加',
    validityStartTime: '2026-07-23',  // = startTime
    validityEndTime: '2026-08-23',  // = endTime
    stock: 150,
    validity: '30天',
    grantChannel: 'simulate_jd',
    approvalStatus: 'rejected',
    unclaimed: 0,
    claimed: 150,
    locked: 0,
    used: 0,
    expired: 0,
    invalid: 150,
    failure_code: 1003,
    failure_reason: '待核心方确认（建议: 系统异常，已自动回滚）',
  },
  // 5. failed_1004_kafka_push: 权益→核心 Kafka producer 重试耗尽
  {
    id: '21',
    instanceId: 'I021',
    couponId: 'C021',
    templateId: 'TPL-PRICED-002',
    couponName: '美团大额低息临价券',
    couponType: 'PRICED_DISCOUNT',
    status: 'failed_1004_kafka_push',
    validPeriod: '2026-07-24 至 2026-08-24',
    startTime: '2026-07-24',
    endTime: '2026-08-24',
    createTime: '2026-07-24 10:00:00',
    userId: 'U121',
    userName: '吴二十四',
    product_id: 'MT_001',
    product_name: '美团大额低息',
    operator: '系统',
    // 6/9 v1.3.1 教训链修复: 补 6 字段（management 详情弹窗）
    auditor: '系统',
    totalCount: 80,  // = stock
    verified: 0,  // = used
    rules: '同一用户仅可领取1次；30天内有效；不可与其它优惠叠加',
    validityStartTime: '2026-07-24',  // = startTime
    validityEndTime: '2026-08-24',  // = endTime
    stock: 80,
    validity: '30天',
    grantChannel: 'simulate_mt',
    approvalStatus: 'pending',
    unclaimed: 0,
    claimed: 80,
    locked: 0,
    used: 0,
    expired: 0,
    invalid: 80,
    failure_code: 1004,
    failure_reason: '待核心方确认（建议: 系统异常，请联系客服）',
  },
  // 6. failed_1005_kafka_consume: 核心→权益 Kafka consumer 重试耗尽
  {
    id: '22',
    instanceId: 'I022',
    couponId: 'C022',
    templateId: 'TPL-PRICED-001',
    couponName: '京东大额低息临价券',
    couponType: 'PRICED_DISCOUNT',
    status: 'failed_1005_kafka_consume',
    validPeriod: '2026-07-25 至 2026-08-25',
    startTime: '2026-07-25',
    endTime: '2026-08-25',
    createTime: '2026-07-25 10:00:00',
    userId: 'U122',
    userName: '郑二十五',
    product_id: 'JD_001',
    product_name: '京东大额低息',
    operator: '系统',
    // 6/9 v1.3.1 教训链修复: 补 6 字段（management 详情弹窗）
    auditor: '系统',
    totalCount: 120,  // = stock
    verified: 0,  // = used
    rules: '同一用户仅可领取1次；30天内有效；不可与其它优惠叠加',
    validityStartTime: '2026-07-25',  // = startTime
    validityEndTime: '2026-08-25',  // = endTime
    stock: 120,
    validity: '30天',
    grantChannel: 'simulate_jd',
    approvalStatus: 'pending',
    unclaimed: 0,
    claimed: 120,
    locked: 0,
    used: 0,
    expired: 0,
    invalid: 120,
    failure_code: 1005,
    failure_reason: '待核心方确认（建议: 系统异常，请联系客服）',
  },
]

/**
 * mock 沉淀补齐：创建券库存表单含 单日/单周/单月发放上限 字段，
 * 实例数据未显式声明时按发放总量比例生成默认上限（日=总量/10、周=总量/2、月=总量*2），
 * 与"创建券库存"默认值口径一致（1000 张 → 100/500/2000）。已有显式值不覆盖。
 */
couponMockData.forEach((c) => {
  const total = c.totalCount ?? c.stock ?? 0
  if (c.dailyLimit == null) c.dailyLimit = Math.max(1, Math.round(total / 10))
  if (c.weeklyLimit == null) c.weeklyLimit = Math.max(1, Math.round(total / 2))
  if (c.monthlyLimit == null) c.monthlyLimit = Math.max(1, total * 2)
  // 券使用场景 / 有效期类型：创建表单必填项，实例未显式声明时按默认口径补齐
  if (!c.usageScenarios) c.usageScenarios = ['batch_distribution']
  if (!c.validityType) {
    if (c.startTime && c.endTime) {
      c.validityType = 'absolute'
    } else {
      c.validityType = 'relative'
      if (c.relativeDays == null) c.relativeDays = Number(String(c.validity ?? '').replace(/\D/g, '')) || 30
    }
  }
})

export default {
  templateMockData,
  couponMockData,
  packageMockData,
  recordMockData,
}
