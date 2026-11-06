// 业务流程状态枚举
export enum ProcessStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress', 
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

// 审批状态枚举
export enum ApprovalStatus {
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  RETURNED = 'returned'
}

// 数据质量等级枚举
export enum DataQualityLevel {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  UNKNOWN = 'unknown'
}

// 字段验证规则类型
export type ValidationRule = 
  | 'UNIQUE' 
  | 'NOT_NULL' 
  | 'NOT NULL'  // 兼容旧格式
  | 'PHONE_FORMAT' 
  | 'EMAIL_FORMAT' 
  | 'ID_CARD_FORMAT' 
  | 'ENCRYPTED' 
  | 'NAME_FORMAT'
  | 'POSITIVE_NUMBER'
  | 'POSITIVE'  // 兼容旧格式
  | 'DATE_RANGE'
  | 'ENUM_VALUE'
  | 'RANGE_300_850'  // 信用评分范围
  | 'RANGE_1_60'     // 期限范围
  | 'MAX_CREDIT_LIMIT'  // 最大授信额度
  | string;  // 允许其他自定义规则

/**
 * 流程步骤字段接口
 * @interface ProcessStepField
 */
export interface ProcessStepField {
  /** 字段名称 */
  name: string
  /** 字段类型 */
  type: 'string' | 'number' | 'boolean' | 'date' | 'datetime' | 'decimal' | 'text' | 'json' | 'timestamp' | 'integer'
  /** 字段描述 */
  description: string
  /** 字段用途说明 */
  usage: string
  /** 是否必填 */
  required?: boolean
  /** 字段长度限制 */
  maxLength?: number
  /** 最小长度限制 */
  minLength?: number
  /** 数值范围 */
  range?: { min?: number; max?: number }
  /** 默认值 */
  defaultValue?: any
  /** 字段约束 */
  constraints?: ValidationRule[]
  /** 数据质量等级 */
  qualityLevel?: DataQualityLevel
  /** 业务重要性 */
  businessImportance?: 'critical' | 'important' | 'normal' | 'low'
  /** 敏感数据标识 */
  isSensitive?: boolean
}

/**
 * 流程步骤指标接口
 * @interface ProcessStepMetric
 */
export interface ProcessStepMetric {
  /** 指标名称 */
  name: string
  /** 指标描述 */
  description: string
  /** 计算公式 */
  formula?: string
  /** 指标类型 */
  type?: 'count' | 'sum' | 'avg' | 'rate' | 'ratio' | 'custom'
  /** 指标单位 */
  unit?: string
  /** 负责人 */
  owner?: string
  /** 业务含义 */
  businessMeaning?: string
  /** 计算周期 */
  calculationPeriod?: 'real-time' | 'daily' | 'weekly' | 'monthly'
}

/**
 * 流程步骤表格接口
 * @interface ProcessStepTable
 */
export interface ProcessStepTable {
  /** 表格名称 */
  name: string
  /** 表格描述 */
  description: string
  /** 使用说明 */
  usage: string
  /** 负责人 */
  owner?: string
  /** 表格类型 */
  type: string
  /** 数据源 */
  dataSource?: string
  /** 更新频率 */
  updateFrequency?: 'real-time' | 'hourly' | 'daily' | 'weekly' | 'monthly'
  /** 数据量级 */
  dataVolume?: 'small' | 'medium' | 'large' | 'huge'
  /** 字段列表 */
  fields?: ProcessStepField[]
  /** 指标列表 */
  metrics?: ProcessStepMetric[]
  /** 表格依赖关系 */
  dependencies?: string[]
}

/**
 * 审批流程接口
 * @interface ApprovalProcess
 */
export interface ApprovalProcess {
  /** 流程ID */
  processId: string
  /** 步骤名称 */
  stepName: string
  /** 审批人 */
  approver: string
  /** 审批时间 */
  approvalTime?: string
  /** 审批状态 */
  status: ApprovalStatus
  /** 审批意见 */
  comments?: string
  /** 下一步骤 */
  nextStep?: string
  /** 审批权限级别 */
  authorityLevel?: 'L1' | 'L2' | 'L3' | 'L4'
  /** 审批时限 */
  deadline?: string
}

/**
 * 业务流程监控接口
 * @interface ProcessMonitoring
 */
export interface ProcessMonitoring {
  /** 流程ID */
  processId: string
  /** 步骤名称 */
  stepName: string
  /** 开始时间 */
  startTime: string
  /** 结束时间 */
  endTime?: string
  /** 处理时长(秒) */
  duration?: number
  /** 流程状态 */
  status: ProcessStatus
  /** 错误信息 */
  errorMessage?: string
  /** 重试次数 */
  retryCount?: number
  /** 性能指标 */
  performanceMetrics?: {
    cpuUsage?: number
    memoryUsage?: number
    throughput?: number
  }
}

/**
 * 流程步骤接口
 * @interface ProcessStep
 */
export interface ProcessStep {
  /** 步骤名称 */
  name: string
  /** 步骤描述 */
  description: string
  /** 步骤图标 */
  icon?: string
  /** 责任人 */
  owner?: string
  /** 步骤顺序 */
  order?: number
  /** 步骤状态 */
  status?: ProcessStatus | 'active' | 'inactive' | 'deprecated'
  /** 业务域 */
  businessDomain?: string
  /** 预计处理时间 */
  estimatedDuration?: string
  /** 风险等级 */
  riskLevel?: 'low' | 'medium' | 'high'
  /** 关联表格 */
  tables: ProcessStepTable[]
  /** 前置步骤 */
  prerequisites?: string[]
  /** 后续步骤 */
  nextSteps?: string[]
  /** 审批流程 */
  approvalProcess?: ApprovalProcess[]
  /** 监控配置 */
  monitoring?: ProcessMonitoring
  /** SLA要求 */
  slaRequirements?: {
    maxDuration: number
    successRate: number
    errorThreshold: number
  }
}

export const processSteps: ProcessStep[] = [
  {
    name: '注册',
    description: '用户首次进入系统，完成基本信息注册',
    icon: 'icon-user-add',
    owner: '产品团队',
    order: 1,
    status: 'active',
    businessDomain: '用户管理',
    estimatedDuration: '5-10分钟',
    riskLevel: 'low',
    tables: [
      {
        name: 'user_register',
        description: '用户注册信息表',
        usage: '用于记录用户注册信息，可分析注册渠道转化率和用户增长趋势。',
        type: 'table',
        owner: '张三',
        dataSource: 'app_database',
        updateFrequency: 'real-time',
        dataVolume: 'large',
        fields: [
          { name: 'user_id', type: 'string', description: '用户ID', usage: '用户唯一标识', required: true, maxLength: 32, constraints: ['UNIQUE', 'NOT_NULL'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' },
          { name: 'mobile', type: 'string', description: '手机号', usage: '用户注册手机号码', required: true, maxLength: 11, constraints: ['UNIQUE', 'PHONE_FORMAT'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical', isSensitive: true },
          { name: 'register_time', type: 'timestamp', description: '注册时间', usage: '记录用户注册时间', required: true, defaultValue: 'CURRENT_TIMESTAMP', qualityLevel: DataQualityLevel.HIGH, businessImportance: 'important' },
          { name: 'register_channel', type: 'string', description: '注册渠道', usage: '记录用户注册来源渠道', required: true, maxLength: 50, qualityLevel: DataQualityLevel.HIGH, businessImportance: 'important' },
          { name: 'invite_code', type: 'string', description: '邀请码', usage: '记录用户邀请码信息', required: false, maxLength: 20, qualityLevel: DataQualityLevel.MEDIUM, businessImportance: 'normal' },
          { name: 'register_ip', type: 'string', description: '注册IP', usage: '用户注册时的IP地址', required: true, maxLength: 45, qualityLevel: DataQualityLevel.MEDIUM, businessImportance: 'normal' }
        ],
        metrics: [
          { name: '日注册量', description: '每日新增注册用户数', formula: 'count(distinct user_id)', type: 'count', unit: '人', owner: '张三', businessMeaning: '衡量产品获客能力', calculationPeriod: 'daily' },
          { name: '渠道转化率', description: '各渠道注册成功率', formula: 'count(success)/count(total)', type: 'rate', unit: '%', owner: '张三', businessMeaning: '评估渠道质量', calculationPeriod: 'daily' }
        ],
        dependencies: ['user_behavior_log', 'channel_config']
      },
      {
        name: 'user_device',
        description: '用户设备信息表',
        usage: '存储用户设备信息，可用于分析用户设备分布和版本兼容性。',
        type: 'table',
        owner: '李四',
        dataSource: 'app_database',
        updateFrequency: 'real-time',
        dataVolume: 'medium',
        fields: [
          { name: 'device_id', type: 'string', description: '设备ID', usage: '用户设备唯一标识', required: true, maxLength: 64, constraints: ['UNIQUE', 'NOT_NULL'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' },
          { name: 'device_type', type: 'string', description: '设备类型', usage: '记录用户设备类型', required: true, maxLength: 20, constraints: ['ENUM_VALUE'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'important' },
          { name: 'os_version', type: 'string', description: '操作系统版本', usage: '记录设备操作系统版本', required: true, maxLength: 50, qualityLevel: DataQualityLevel.MEDIUM, businessImportance: 'normal' },
          { name: 'app_version', type: 'string', description: 'APP版本', usage: '记录APP版本号', required: true, maxLength: 20, qualityLevel: DataQualityLevel.HIGH, businessImportance: 'important' }
        ],
        metrics: [
          { name: '设备类型分布', description: '各设备类型用户占比', formula: 'count(device_type)/count(total)', type: 'rate', unit: '%', owner: '李四', businessMeaning: '了解用户设备偏好', calculationPeriod: 'daily' },
          { name: 'APP版本覆盖率', description: '最新版本APP使用率', formula: 'count(latest_version)/count(total)', type: 'rate', unit: '%', owner: '李四', businessMeaning: '评估版本升级效果', calculationPeriod: 'daily' }
        ],
        dependencies: ['user_register']
      }
    ],
    prerequisites: [],
    nextSteps: ['实名']
  },
  {
    name: '实名',
    description: '用户完成身份认证和银行卡绑定',
    icon: 'icon-idcard',
    owner: '风控团队',
    order: 2,
    status: 'active',
    businessDomain: '身份认证',
    estimatedDuration: '10-15分钟',
    riskLevel: 'medium',
    tables: [
      {
        name: 'user_auth',
        description: '用户实名认证表',
        usage: '用于记录用户实名认证信息，可分析实名认证转化率和通过率。',
        type: 'table',
        owner: '王五',
        dataSource: 'auth_database',
        updateFrequency: 'real-time',
        dataVolume: 'medium',
        fields: [
          { name: 'user_id', type: 'string', description: '用户ID', usage: '用户唯一标识', required: true, maxLength: 32, constraints: ['NOT_NULL'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' },
          { name: 'real_name', type: 'string', description: '真实姓名', usage: '用户实名认证姓名', required: true, maxLength: 50, constraints: ['NAME_FORMAT'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical', isSensitive: true },
          { name: 'id_card', type: 'string', description: '身份证号', usage: '用户身份证号码', required: true, maxLength: 18, constraints: ['ID_CARD_FORMAT', 'ENCRYPTED'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical', isSensitive: true },
          { name: 'auth_time', type: 'timestamp', description: '认证时间', usage: '记录实名认证时间', required: true, defaultValue: 'CURRENT_TIMESTAMP', qualityLevel: DataQualityLevel.HIGH, businessImportance: 'important' },
          { name: 'auth_status', type: 'string', description: '认证状态', usage: '记录认证审核状态', required: true, maxLength: 20, qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' },
          { name: 'auth_source', type: 'string', description: '认证数据源', usage: '记录认证数据来源', required: true, maxLength: 50, qualityLevel: DataQualityLevel.MEDIUM, businessImportance: 'normal' }
        ],
        dependencies: ['user_register'],
        metrics: [
          { name: '实名认证率', description: '完成实名认证的用户占比', formula: 'count(distinct auth_user)/count(distinct total_user)', type: 'rate', unit: '%', owner: '王五', businessMeaning: '衡量用户转化深度', calculationPeriod: 'daily' },
          { name: '认证通过率', description: '实名认证通过的比例', formula: 'count(success)/count(total)', type: 'rate', unit: '%', owner: '王五', businessMeaning: '评估认证流程效率', calculationPeriod: 'daily' }
        ]
      },
      {
        name: 'user_bankcard',
        description: '用户银行卡信息表',
        usage: '存储用户银行卡绑定信息，可用于分析银行卡绑定率和银行分布。',
        type: 'table',
        owner: '赵六',
        dataSource: 'payment_database',
        updateFrequency: 'real-time',
        dataVolume: 'medium',
        fields: [
          { name: 'card_id', type: 'string', description: '银行卡ID', usage: '银行卡唯一标识', required: true, maxLength: 32, constraints: ['UNIQUE', 'NOT_NULL'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' },
          { name: 'user_id', type: 'string', description: '用户ID', usage: '用户唯一标识', required: true, maxLength: 32, constraints: ['NOT_NULL'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' },
          { name: 'card_number', type: 'string', description: '银行卡号', usage: '银行卡号码（加密存储）', required: true, maxLength: 64, constraints: ['ENCRYPTED'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical', isSensitive: true },
          { name: 'bank_name', type: 'string', description: '银行名称', usage: '记录银行名称', required: true, maxLength: 100, qualityLevel: DataQualityLevel.HIGH, businessImportance: 'important' },
          { name: 'card_type', type: 'string', description: '卡类型', usage: '记录银行卡类型', required: true, maxLength: 20, qualityLevel: DataQualityLevel.HIGH, businessImportance: 'important' },
          { name: 'bind_time', type: 'timestamp', description: '绑定时间', usage: '记录银行卡绑定时间', required: true, defaultValue: 'CURRENT_TIMESTAMP', qualityLevel: DataQualityLevel.HIGH, businessImportance: 'important' },
          { name: 'bind_status', type: 'string', description: '绑定状态', usage: '记录银行卡绑定状态', required: true, maxLength: 20, qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' }
        ],
        dependencies: ['user_auth'],
        metrics: [
          { name: '银行卡绑定率', description: '完成银行卡绑定的用户占比', formula: 'count(distinct bind_user)/count(distinct total_user)', type: 'rate', unit: '%', owner: '赵六', businessMeaning: '衡量支付准备度', calculationPeriod: 'daily' },
          { name: '主流银行占比', description: '主要银行卡绑定占比', formula: 'count(main_banks)/count(total_cards)', type: 'ratio', unit: '%', owner: '赵六', businessMeaning: '评估银行合作效果', calculationPeriod: 'weekly' }
        ]
      }
    ],
    prerequisites: ['注册'],
    nextSteps: ['授信']
  },
  {
    name: '授信',
    description: '评估用户资质，确定授信额度',
    icon: 'icon-file-protection',
    owner: '风控团队',
    order: 3,
    status: 'active',
    businessDomain: '风险控制',
    estimatedDuration: '1-3小时',
    riskLevel: 'high',
    tables: [
      {
        name: 'credit_apply',
        description: '授信申请记录表',
        usage: '用于记录用户授信申请信息，可分析授信申请转化率和申请金额分布。',
        type: '事实表',
        owner: '孙七',
        dataSource: 'credit_database',
        updateFrequency: 'real-time',
        dataVolume: 'large',
        fields: [
          { name: 'apply_id', type: 'string', description: '申请ID', usage: '授信申请唯一标识', required: true, maxLength: 32, constraints: ['UNIQUE', 'NOT NULL'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' },
          { name: 'user_id', type: 'string', description: '用户ID', usage: '用户唯一标识', required: true, maxLength: 32, constraints: ['NOT NULL'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' },
          { name: 'apply_amount', type: 'decimal', description: '申请金额', usage: '记录授信申请金额', required: true, constraints: ['POSITIVE'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' },
          { name: 'apply_time', type: 'datetime', description: '申请时间', usage: '记录授信申请时间', required: true, defaultValue: 'CURRENT_TIMESTAMP', qualityLevel: DataQualityLevel.HIGH, businessImportance: 'important' },
          { name: 'apply_channel', type: 'string', description: '申请渠道', usage: '记录授信申请渠道', required: true, maxLength: 50, qualityLevel: DataQualityLevel.MEDIUM, businessImportance: 'important' },
          { name: 'product_type', type: 'string', description: '产品类型', usage: '记录申请的授信产品类型', required: true, maxLength: 50, qualityLevel: DataQualityLevel.HIGH, businessImportance: 'important' },
          { name: 'apply_status', type: 'string', description: '申请状态', usage: '记录申请当前状态', required: true, maxLength: 20, qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' }
        ],
        metrics: [
          { name: '授信申请率', description: '注册用户中申请授信的比例', formula: 'count(distinct apply_user)/count(distinct register_user)', type: 'rate', unit: '%', owner: '孙七', businessMeaning: '衡量产品吸引力', calculationPeriod: 'daily' },
          { name: '平均申请金额', description: '授信申请平均金额', formula: 'avg(apply_amount)', type: 'avg', unit: '元', owner: '孙七', businessMeaning: '反映用户资金需求', calculationPeriod: 'daily' },
          { name: '渠道申请分布', description: '各渠道申请量分布', formula: 'count(apply_id) group by apply_channel', type: 'count', unit: '笔', owner: '孙七', businessMeaning: '指导渠道运营策略', calculationPeriod: 'daily' }
        ],
        dependencies: ['user_auth', 'user_behavior']
      },
      {
        name: 'credit_result',
        description: '授信结果表',
        usage: '用于记录用户授信审批结果，可分析授信通过率和额度分布。',
        type: '事实表',
        owner: '周八',
        dataSource: 'credit_database',
        updateFrequency: 'real-time',
        dataVolume: 'large',
        fields: [
          { name: 'apply_id', type: 'string', description: '申请ID', usage: '授信申请唯一标识', required: true, maxLength: 32, constraints: ['NOT NULL'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' },
          { name: 'credit_score', type: 'integer', description: '信用评分', usage: '记录用户信用评分', required: true, constraints: ['RANGE_300_850'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' },
          { name: 'credit_limit', type: 'decimal', description: '授信额度', usage: '记录用户授信额度', required: false, constraints: ['POSITIVE'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' },
          { name: 'result_time', type: 'datetime', description: '审批时间', usage: '记录授信审批时间', required: true, defaultValue: 'CURRENT_TIMESTAMP', qualityLevel: DataQualityLevel.HIGH, businessImportance: 'important' },
          { name: 'approval_status', type: 'string', description: '审批状态', usage: '记录最终审批状态', required: true, maxLength: 20, qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' },
          { name: 'reject_reason', type: 'string', description: '拒绝原因', usage: '记录授信被拒原因', required: false, maxLength: 200, qualityLevel: DataQualityLevel.MEDIUM, businessImportance: 'normal' },
          { name: 'risk_level', type: 'string', description: '风险等级', usage: '记录用户风险等级', required: true, maxLength: 10, qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' },
          { name: 'interest_rate', type: 'decimal', description: '利率', usage: '记录授信利率', required: false, constraints: ['POSITIVE'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'important' }
        ],
        metrics: [
          { name: '授信通过率', description: '授信申请通过的比例', formula: 'count(approved)/count(total_apply)', type: 'rate', unit: '%', owner: '周八', businessMeaning: '评估风控策略效果', calculationPeriod: 'daily' },
          { name: '平均授信额度', description: '授信通过用户的平均额度', formula: 'avg(credit_limit)', type: 'avg', unit: '元', owner: '周八', businessMeaning: '反映用户质量水平', calculationPeriod: 'daily' },
          { name: '风险等级分布', description: '各风险等级用户分布', formula: 'count(user_id) group by risk_level', type: 'count', unit: '人', owner: '周八', businessMeaning: '监控风险结构', calculationPeriod: 'daily' }
        ],
        dependencies: ['credit_apply', 'risk_model_output']
      }
    ],
    prerequisites: ['实名'],
    nextSteps: ['支用']
  },
  {
    name: '支用',
    description: '用户申请借款，签订借款合同',
    icon: 'icon-money',
    owner: '业务团队',
    order: 4,
    status: 'active',
    businessDomain: '放款业务',
    estimatedDuration: '30分钟-2小时',
    riskLevel: 'medium',
    tables: [
      {
        name: 'loan_apply',
        description: '借款申请记录表',
        usage: '用于记录用户借款申请信息，可分析借款申请转化率和金额分布。',
        type: '事实表',
        owner: '吴九',
        dataSource: 'loan_database',
        updateFrequency: 'real-time',
        dataVolume: 'large',
        fields: [
          { name: 'loan_id', type: 'string', description: '借款ID', usage: '借款唯一标识', required: true, maxLength: 32, constraints: ['UNIQUE', 'NOT NULL'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' },
          { name: 'user_id', type: 'string', description: '用户ID', usage: '用户唯一标识', required: true, maxLength: 32, constraints: ['NOT NULL'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' },
          { name: 'loan_amount', type: 'decimal', description: '借款金额', usage: '记录借款金额', required: true, constraints: ['POSITIVE', 'MAX_CREDIT_LIMIT'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' },
          { name: 'loan_term', type: 'integer', description: '借款期限', usage: '记录借款期限（月）', required: true, constraints: ['RANGE_1_60'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' },
          { name: 'apply_time', type: 'datetime', description: '申请时间', usage: '记录借款申请时间', required: true, defaultValue: 'CURRENT_TIMESTAMP', qualityLevel: DataQualityLevel.HIGH, businessImportance: 'important' },
          { name: 'loan_purpose', type: 'string', description: '借款用途', usage: '记录借款使用目的', required: true, maxLength: 100, qualityLevel: DataQualityLevel.MEDIUM, businessImportance: 'important' },
          { name: 'repayment_method', type: 'string', description: '还款方式', usage: '记录还款方式', required: true, maxLength: 50, qualityLevel: DataQualityLevel.HIGH, businessImportance: 'important' },
          { name: 'apply_status', type: 'string', description: '申请状态', usage: '记录申请当前状态', required: true, maxLength: 20, qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' }
        ],
        metrics: [
          { name: '支用转化率', description: '授信用户中申请借款的比例', formula: 'count(distinct loan_user)/count(distinct credit_user)', type: 'rate', unit: '%', owner: '吴九', businessMeaning: '衡量授信额度使用效率', calculationPeriod: 'daily' },
          { name: '平均借款金额', description: '借款申请平均金额', formula: 'avg(loan_amount)', type: 'avg', unit: '元', owner: '吴九', businessMeaning: '反映用户借款需求', calculationPeriod: 'daily' },
          { name: '支用金额占比', description: '支用金额占授信额度比例', formula: 'avg(loan_amount/credit_limit)', type: 'rate', unit: '%', owner: '吴九', businessMeaning: '评估额度利用率', calculationPeriod: 'daily' }
        ],
        dependencies: ['credit_result']
      },
      {
        name: 'loan_contract',
        description: '借款合同表',
        usage: '用于记录用户借款合同信息，可分析合同签约率和条款分布。',
        type: '事实表',
        owner: '郑十',
        dataSource: 'loan_database',
        updateFrequency: 'real-time',
        dataVolume: 'large',
        fields: [
          { name: 'contract_id', type: 'string', description: '合同ID', usage: '借款合同唯一标识', required: true, maxLength: 32, constraints: ['UNIQUE', 'NOT NULL'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' },
          { name: 'loan_id', type: 'string', description: '借款ID', usage: '借款唯一标识', required: true, maxLength: 32, constraints: ['NOT NULL'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' },
          { name: 'contract_amount', type: 'decimal', description: '合同金额', usage: '记录合同金额', required: true, constraints: ['POSITIVE'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' },
          { name: 'interest_rate', type: 'decimal', description: '利率', usage: '记录借款利率', required: true, constraints: ['POSITIVE', 'MAX_36_PERCENT'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' },
          { name: 'sign_time', type: 'timestamp', description: '签约时间', usage: '记录合同签约时间', required: true, defaultValue: 'CURRENT_TIMESTAMP', qualityLevel: DataQualityLevel.HIGH, businessImportance: 'important' },
          { name: 'start_date', type: 'date', description: '起息日', usage: '记录借款起息日期', required: true, qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' },
          { name: 'end_date', type: 'date', description: '到期日', usage: '记录借款到期日期', required: true, qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' },
          { name: 'contract_status', type: 'string', description: '合同状态', usage: '记录合同当前状态', required: true, maxLength: 20, qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' }
        ],
        metrics: [
          { name: '合同签约率', description: '借款申请中完成签约的比例', formula: 'count(signed)/count(loan_apply)', type: 'rate', unit: '%', owner: '郑十', businessMeaning: '评估放款流程效率', calculationPeriod: 'daily' },
          { name: '平均利率', description: '借款合同平均利率', formula: 'avg(interest_rate)', type: 'avg', unit: '%', owner: '郑十', businessMeaning: '监控定价策略', calculationPeriod: 'daily' },
          { name: '平均放款周期', description: '从申请到放款的平均时长', formula: 'avg(sign_time - apply_time)', type: 'avg', unit: '小时', owner: '郑十', businessMeaning: '优化操作流程', calculationPeriod: 'daily' }
        ],
        dependencies: ['loan_apply']
      }
    ],
    prerequisites: ['授信'],
    nextSteps: ['还款']
  },
  {
    name: '还款',
    description: '用户按期还款，维护还款计划',
    icon: 'icon-calendar',
    tables: [
      {
        name: 'repayment_plan',
        description: '还款计划表',
        usage: '用于记录用户还款计划信息，可分析还款计划和实际还款情况。',
        type: 'table',
        fields: [
          { name: 'plan_id', type: 'string', description: '计划ID', usage: '还款计划唯一标识', required: true, maxLength: 32, constraints: ['UNIQUE', 'NOT_NULL'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' },
          { name: 'loan_id', type: 'string', description: '借款ID', usage: '借款唯一标识', required: true, maxLength: 32, constraints: ['NOT_NULL'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' },
          { name: 'due_amount', type: 'decimal', description: '应还金额', usage: '记录应还金额', required: true, constraints: ['POSITIVE'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' },
          { name: 'due_date', type: 'date', description: '应还日期', usage: '记录应还日期', required: true, constraints: ['DATE_RANGE'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' }
        ],
        metrics: [
          { name: '按期还款率', description: '按期还款的比例', formula: 'count(ontime_repay)/count(total_repay)', unit: '%', owner: '李四' },
          { name: '提前还款率', description: '提前还款的比例', formula: 'count(early_repay)/count(total_repay)', unit: '%', owner: '李四' }
        ]
      },
      {
        name: 'repayment_record',
        description: '还款记录表',
        usage: '用于记录用户实际还款信息，可分析还款及时率和逾期情况。',
        type: 'table',
        owner: '郑十',
        fields: [
          { name: 'record_id', type: 'string', description: '记录ID', usage: '还款记录唯一标识', required: true, maxLength: 32, constraints: ['UNIQUE', 'NOT_NULL'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' },
          { name: 'plan_id', type: 'string', description: '计划ID', usage: '还款计划唯一标识', required: true, maxLength: 32, constraints: ['NOT_NULL'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' },
          { name: 'paid_amount', type: 'decimal', description: '实还金额', usage: '记录实际还款金额', required: true, constraints: ['POSITIVE'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' },
          { name: 'paid_time', type: 'timestamp', description: '实还时间', usage: '记录实际还款时间', required: true, defaultValue: 'CURRENT_TIMESTAMP', qualityLevel: DataQualityLevel.HIGH, businessImportance: 'important' }
        ],
        metrics: [
          { name: '实际还款率', description: '完成还款的计划占比', formula: 'count(paid_plans)/count(total_plans)', unit: '%', owner: '郑十' },
          { name: '平均还款金额', description: '实际还款平均金额', formula: 'avg(paid_amount)', unit: '元', owner: '郑十' }
        ]
      }
    ]
  },
  {
    name: '贷后管理',
    description: '管理逾期账户，进行催收工作',
    icon: 'icon-alert',
    tables: [
      {
        name: 'loan_overdue',
        description: '逾期记录表',
        usage: '用于记录用户逾期信息，可分析逾期率和催收效果。',
        type: 'table',
        fields: [
          { name: 'overdue_id', type: 'string', description: '逾期ID', usage: '逾期记录唯一标识', required: true, maxLength: 32, constraints: ['UNIQUE', 'NOT_NULL'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' },
          { name: 'loan_id', type: 'string', description: '借款ID', usage: '借款唯一标识', required: true, maxLength: 32, constraints: ['NOT_NULL'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' },
          { name: 'overdue_days', type: 'integer', description: '逾期天数', usage: '记录逾期天数', required: true, constraints: ['POSITIVE'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' },
          { name: 'overdue_amount', type: 'decimal', description: '逾期金额', usage: '记录逾期金额', required: true, constraints: ['POSITIVE'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' }
        ],
        metrics: [
          { name: '逾期率', description: '逾期账户占比', formula: 'count(distinct overdue_loan)/count(distinct total_loan)', unit: '%', owner: '李四' },
          { name: '逾期金额占比', description: '逾期金额占总放款金额比例', formula: 'sum(overdue_amount)/sum(loan_amount)', unit: '%', owner: '李四' }
        ]
      },
      {
        name: 'collection_record',
        description: '催收记录表',
        usage: '用于记录催收操作信息，可分析催收效果和回款率。',
        type: 'table',
        owner: '钱十一',
        fields: [
          { name: 'collection_id', type: 'string', description: '催收ID', usage: '催收记录唯一标识', required: true, maxLength: 32, constraints: ['UNIQUE', 'NOT_NULL'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' },
          { name: 'overdue_id', type: 'string', description: '逾期ID', usage: '逾期记录唯一标识', required: true, maxLength: 32, constraints: ['NOT_NULL'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' },
          { name: 'collector', type: 'string', description: '催收员', usage: '记录催收人员', required: true, maxLength: 50, constraints: ['NOT_NULL'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'important' },
          { name: 'collection_result', type: 'string', description: '催收结果', usage: '记录催收结果', required: true, maxLength: 50, constraints: ['ENUM_VALUE'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' }
        ],
        metrics: [
          { name: '催收成功率', description: '催收成功的案例占比', formula: 'count(success_collection)/count(total_collection)', unit: '%', owner: '钱十一' },
          { name: '催收回款率', description: '通过催收回收的金额占比', formula: 'sum(recovered_amount)/sum(overdue_amount)', unit: '%', owner: '钱十一' }
        ]
      }
    ],
    prerequisites: ['支用'],
    nextSteps: []
  },
  {
    name: '营销活动',
    description: '策划和执行营销活动，提升用户活跃度和转化率',
    icon: 'icon-megaphone',
    owner: '营销团队',
    order: 6,
    status: 'active',
    businessDomain: '营销运营',
    estimatedDuration: '7-30天',
    riskLevel: 'medium',
    tables: [
      {
        name: 'marketing_campaign',
        description: '营销活动表',
        usage: '用于记录营销活动信息，可分析活动效果和ROI。',
        type: 'table',
        owner: '营销经理',
        dataSource: 'marketing_database',
        updateFrequency: 'daily',
        dataVolume: 'medium',
        fields: [
          { name: 'campaign_id', type: 'string', description: '活动ID', usage: '营销活动唯一标识', required: true, maxLength: 32, constraints: ['UNIQUE', 'NOT_NULL'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' },
          { name: 'campaign_name', type: 'string', description: '活动名称', usage: '记录活动名称', required: true, maxLength: 100, constraints: ['NOT_NULL'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'important' },
          { name: 'campaign_type', type: 'string', description: '活动类型', usage: '记录活动类型', required: true, maxLength: 50, constraints: ['ENUM_VALUE'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'important' },
          { name: 'start_date', type: 'date', description: '开始日期', usage: '记录活动开始日期', required: true, constraints: ['DATE_RANGE'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' },
          { name: 'end_date', type: 'date', description: '结束日期', usage: '记录活动结束日期', required: true, constraints: ['DATE_RANGE'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' },
          { name: 'target_audience', type: 'string', description: '目标受众', usage: '记录活动目标受众', required: true, maxLength: 200, qualityLevel: DataQualityLevel.MEDIUM, businessImportance: 'important' },
          { name: 'budget', type: 'decimal', description: '活动预算', usage: '记录活动预算金额', required: true, constraints: ['POSITIVE_NUMBER'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' },
          { name: 'status', type: 'string', description: '活动状态', usage: '记录活动当前状态', required: true, maxLength: 20, constraints: ['ENUM_VALUE'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'important' }
        ],
        metrics: [
          { name: '活动参与率', description: '目标用户中参与活动的比例', formula: 'count(distinct participant_user)/count(distinct target_user)', type: 'rate', unit: '%', owner: '营销经理', businessMeaning: '衡量活动吸引力', calculationPeriod: 'daily' },
          { name: '活动转化率', description: '参与用户中完成转化的比例', formula: 'count(distinct converted_user)/count(distinct participant_user)', type: 'rate', unit: '%', owner: '营销经理', businessMeaning: '评估活动效果', calculationPeriod: 'daily' },
          { name: '活动ROI', description: '活动投资回报率', formula: '(revenue - cost) / cost', type: 'ratio', unit: '%', owner: '营销经理', businessMeaning: '评估活动价值', calculationPeriod: 'monthly' }
        ],
        dependencies: ['user_register', 'user_behavior_log']
      },
      {
        name: 'campaign_participation',
        description: '活动参与记录表',
        usage: '用于记录用户参与营销活动的详细信息，可分析用户行为和活动效果。',
        type: 'table',
        owner: '数据分析师',
        dataSource: 'marketing_database',
        updateFrequency: 'real-time',
        dataVolume: 'large',
        fields: [
          { name: 'participation_id', type: 'string', description: '参与ID', usage: '参与记录唯一标识', required: true, maxLength: 32, constraints: ['UNIQUE', 'NOT_NULL'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' },
          { name: 'campaign_id', type: 'string', description: '活动ID', usage: '营销活动唯一标识', required: true, maxLength: 32, constraints: ['NOT_NULL'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' },
          { name: 'user_id', type: 'string', description: '用户ID', usage: '用户唯一标识', required: true, maxLength: 32, constraints: ['NOT_NULL'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' },
          { name: 'participation_time', type: 'timestamp', description: '参与时间', usage: '记录用户参与时间', required: true, defaultValue: 'CURRENT_TIMESTAMP', qualityLevel: DataQualityLevel.HIGH, businessImportance: 'important' },
          { name: 'participation_channel', type: 'string', description: '参与渠道', usage: '记录用户参与渠道', required: true, maxLength: 50, constraints: ['ENUM_VALUE'], qualityLevel: DataQualityLevel.MEDIUM, businessImportance: 'important' },
          { name: 'reward_amount', type: 'decimal', description: '奖励金额', usage: '记录用户获得的奖励金额', required: false, constraints: ['POSITIVE_NUMBER'], qualityLevel: DataQualityLevel.MEDIUM, businessImportance: 'normal' },
          { name: 'conversion_status', type: 'string', description: '转化状态', usage: '记录用户转化状态', required: true, maxLength: 20, constraints: ['ENUM_VALUE'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'important' }
        ],
        metrics: [
          { name: '渠道参与分布', description: '各渠道参与用户分布', formula: 'count(user_id) group by participation_channel', type: 'count', unit: '人', owner: '数据分析师', businessMeaning: '优化渠道投放', calculationPeriod: 'daily' },
          { name: '平均奖励金额', description: '用户平均获得奖励金额', formula: 'avg(reward_amount)', type: 'avg', unit: '元', owner: '数据分析师', businessMeaning: '控制成本投入', calculationPeriod: 'daily' }
        ],
        dependencies: ['marketing_campaign', 'user_register']
      }
    ],
    prerequisites: [],
    nextSteps: ['数据分析'],
    approvalProcess: [
      {
        processId: 'MARKETING_APPROVAL_001',
        stepName: '营销活动审批',
        approver: '营销总监',
        status: ApprovalStatus.SUBMITTED,
        authorityLevel: 'L3',
        deadline: '2025-01-30',
        comments: '需要评估预算合理性和目标受众精准度'
      }
    ],
    slaRequirements: {
      maxDuration: 2592000, // 30天
      successRate: 0.85,
      errorThreshold: 0.05
    }
  },
  {
    name: '数据质量监控',
    description: '监控数据质量，确保数据准确性和完整性',
    icon: 'icon-shield-check',
    owner: '数据治理团队',
    order: 7,
    status: 'active',
    businessDomain: '数据治理',
    estimatedDuration: '持续进行',
    riskLevel: 'high',
    tables: [
      {
        name: 'data_quality_rules',
        description: '数据质量规则表',
        usage: '用于定义和管理数据质量检查规则，可分析数据质量趋势。',
        type: 'table',
        owner: '数据治理专员',
        dataSource: 'governance_database',
        updateFrequency: 'daily',
        dataVolume: 'small',
        fields: [
          { name: 'rule_id', type: 'string', description: '规则ID', usage: '数据质量规则唯一标识', required: true, maxLength: 32, constraints: ['UNIQUE', 'NOT_NULL'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' },
          { name: 'rule_name', type: 'string', description: '规则名称', usage: '记录规则名称', required: true, maxLength: 100, constraints: ['NOT_NULL'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'important' },
          { name: 'table_name', type: 'string', description: '表名', usage: '记录检查的表名', required: true, maxLength: 100, constraints: ['NOT_NULL'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' },
          { name: 'field_name', type: 'string', description: '字段名', usage: '记录检查的字段名', required: true, maxLength: 100, constraints: ['NOT_NULL'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' },
          { name: 'rule_type', type: 'string', description: '规则类型', usage: '记录规则类型', required: true, maxLength: 50, constraints: ['ENUM_VALUE'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'important' },
          { name: 'rule_expression', type: 'text', description: '规则表达式', usage: '记录具体的检查规则', required: true, qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' },
          { name: 'threshold', type: 'decimal', description: '阈值', usage: '记录规则阈值', required: false, constraints: ['POSITIVE_NUMBER'], qualityLevel: DataQualityLevel.MEDIUM, businessImportance: 'important' },
          { name: 'severity', type: 'string', description: '严重程度', usage: '记录规则严重程度', required: true, maxLength: 20, constraints: ['ENUM_VALUE'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'important' }
        ],
        metrics: [
          { name: '规则覆盖率', description: '有质量规则的表占比', formula: 'count(distinct table_name)/count(distinct all_tables)', type: 'rate', unit: '%', owner: '数据治理专员', businessMeaning: '评估治理覆盖度', calculationPeriod: 'weekly' },
          { name: '高严重性规则占比', description: '高严重性规则占总规则比例', formula: 'count(high_severity)/count(total_rules)', type: 'rate', unit: '%', owner: '数据治理专员', businessMeaning: '关注核心质量问题', calculationPeriod: 'weekly' }
        ],
        dependencies: []
      },
      {
        name: 'data_quality_check_results',
        description: '数据质量检查结果表',
        usage: '用于记录数据质量检查结果，可分析数据质量趋势和问题分布。',
        type: 'table',
        owner: '数据质量分析师',
        dataSource: 'governance_database',
        updateFrequency: 'real-time',
        dataVolume: 'large',
        fields: [
          { name: 'check_id', type: 'string', description: '检查ID', usage: '质量检查记录唯一标识', required: true, maxLength: 32, constraints: ['UNIQUE', 'NOT_NULL'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' },
          { name: 'rule_id', type: 'string', description: '规则ID', usage: '数据质量规则唯一标识', required: true, maxLength: 32, constraints: ['NOT_NULL'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' },
          { name: 'check_time', type: 'timestamp', description: '检查时间', usage: '记录检查执行时间', required: true, defaultValue: 'CURRENT_TIMESTAMP', qualityLevel: DataQualityLevel.HIGH, businessImportance: 'important' },
          { name: 'check_result', type: 'string', description: '检查结果', usage: '记录检查结果状态', required: true, maxLength: 20, constraints: ['ENUM_VALUE'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' },
          { name: 'error_count', type: 'integer', description: '错误数量', usage: '记录发现的错误数量', required: true, constraints: ['POSITIVE_NUMBER'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'important' },
          { name: 'total_count', type: 'integer', description: '总记录数', usage: '记录检查的总记录数', required: true, constraints: ['POSITIVE_NUMBER'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'important' },
          { name: 'error_rate', type: 'decimal', description: '错误率', usage: '记录数据错误率', required: true, range: { min: 0, max: 1 }, qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' },
          { name: 'error_details', type: 'json', description: '错误详情', usage: '记录具体错误信息', required: false, qualityLevel: DataQualityLevel.MEDIUM, businessImportance: 'normal' }
        ],
        metrics: [
          { name: '数据质量得分', description: '整体数据质量评分', formula: 'avg(1 - error_rate) * 100', type: 'avg', unit: '分', owner: '数据质量分析师', businessMeaning: '衡量数据质量水平', calculationPeriod: 'daily' },
          { name: '质量问题发现率', description: '检查中发现问题的比例', formula: 'count(failed_checks)/count(total_checks)', type: 'rate', unit: '%', owner: '数据质量分析师', businessMeaning: '监控质量风险', calculationPeriod: 'daily' },
          { name: '平均错误率', description: '所有检查的平均错误率', formula: 'avg(error_rate)', type: 'avg', unit: '%', owner: '数据质量分析师', businessMeaning: '评估数据准确性', calculationPeriod: 'daily' }
        ],
        dependencies: ['data_quality_rules']
      }
    ],
    prerequisites: [],
    nextSteps: ['数据修复'],
    monitoring: {
      processId: 'DQ_MONITOR_001',
      stepName: '数据质量监控',
      startTime: '2025-01-27T00:00:00Z',
      status: ProcessStatus.IN_PROGRESS,
      performanceMetrics: {
        cpuUsage: 15,
        memoryUsage: 512,
        throughput: 1000
      }
    },
    slaRequirements: {
      maxDuration: 3600, // 1小时
      successRate: 0.99,
      errorThreshold: 0.01
    }
  }
]

export const commonTables = [
  {
    name: 'user_info',
    description: '用户基础信息表',
    usage: '存储用户基础信息，可用于分析用户画像和行为特征。',
    owner: '数据管理员',
    fields: [
      { name: 'user_id', type: 'string', description: '用户ID', required: true, maxLength: 32, constraints: ['UNIQUE', 'NOT_NULL'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' },
      { name: 'mobile', type: 'string', description: '手机号', usage: '用户手机号码', required: true, maxLength: 20, constraints: ['PHONE_FORMAT'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical', isSensitive: true },
      { name: 'email', type: 'string', description: '邮箱', usage: '用户电子邮箱', required: false, maxLength: 100, constraints: ['EMAIL_FORMAT'], qualityLevel: DataQualityLevel.MEDIUM, businessImportance: 'normal' },
      { name: 'create_time', type: 'timestamp', description: '创建时间', usage: '记录创建时间', required: true, defaultValue: 'CURRENT_TIMESTAMP', qualityLevel: DataQualityLevel.HIGH, businessImportance: 'important' }
    ]
  },
  {
    name: 'product_info',
    description: '产品信息表',
    usage: '存储产品基础信息，可用于分析产品类型分布和状态监控。',
    owner: '产品经理',
    fields: [
      { name: 'product_id', type: 'string', description: '产品ID', usage: '产品唯一标识', required: true, maxLength: 32, constraints: ['UNIQUE', 'NOT_NULL'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' },
      { name: 'product_name', type: 'string', description: '产品名称', usage: '记录产品名称', required: true, maxLength: 100, constraints: ['NOT_NULL'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'important' },
      { name: 'product_type', type: 'string', description: '产品类型', usage: '记录产品类型', required: true, maxLength: 50, constraints: ['ENUM_VALUE'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'important' },
      { name: 'status', type: 'string', description: '产品状态', usage: '记录产品状态', required: true, maxLength: 20, constraints: ['ENUM_VALUE'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' }
    ]
  },
  {
    name: 'transaction_log',
    description: '交易流水表',
    usage: '用于记录用户交易流水信息，可分析交易量和交易类型分布。',
    owner: '财务分析师',
    fields: [
      { name: 'transaction_id', type: 'string', description: '交易ID', usage: '交易记录唯一标识', required: true, maxLength: 32, constraints: ['UNIQUE', 'NOT_NULL'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' },
      { name: 'user_id', type: 'string', description: '用户ID', required: true, maxLength: 32, constraints: ['NOT_NULL'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' },
      { name: 'amount', type: 'decimal', description: '交易金额', usage: '记录交易金额', required: true, constraints: ['POSITIVE'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' },
      { name: 'transaction_type', type: 'string', description: '交易类型', usage: '记录交易类型', required: true, maxLength: 50, constraints: ['ENUM_VALUE'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'important' }
    ]
  },
  {
    name: 'risk_control',
    description: '风控指标表',
    usage: '用于记录用户风险评估信息，可分析风险分布和风控效果。',
    owner: '风控专员',
    fields: [
      { name: 'user_id', type: 'string', description: '用户ID', required: true, maxLength: 32, constraints: ['NOT_NULL'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' },
      { name: 'risk_score', type: 'integer', description: '风险评分', usage: '记录风险评分', required: true, constraints: ['RANGE_300_850'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' },
      { name: 'risk_level', type: 'string', description: '风险等级', usage: '记录风险等级', required: true, maxLength: 20, constraints: ['ENUM_VALUE'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' },
      { name: 'update_time', type: 'timestamp', description: '更新时间', usage: '记录更新时间', required: true, defaultValue: 'CURRENT_TIMESTAMP', qualityLevel: DataQualityLevel.HIGH, businessImportance: 'important' }
    ]
  },
  {
    name: 'customer_service',
    description: '客服记录表',
    usage: '用于记录客服服务信息，可分析服务质量和用户满意度。',
    owner: '客服主管',
    fields: [
      { name: 'service_id', type: 'string', description: '服务ID', usage: '客服记录唯一标识', required: true, maxLength: 32, constraints: ['UNIQUE', 'NOT_NULL'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' },
      { name: 'user_id', type: 'string', description: '用户ID', required: true, maxLength: 32, constraints: ['NOT_NULL'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' },
      { name: 'service_type', type: 'string', description: '服务类型', usage: '记录服务类型', required: true, maxLength: 50, constraints: ['ENUM_VALUE'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'important' },
      { name: 'content', type: 'string', description: '服务内容', usage: '记录服务内容', required: true, maxLength: 1000, constraints: ['NOT_NULL'], qualityLevel: DataQualityLevel.MEDIUM, businessImportance: 'normal' }
    ]
  }
]

// 业务流程类型枚举
export enum BusinessProcessType {
  USER_LIFECYCLE = 'user_lifecycle',
  CREDIT_APPROVAL = 'credit_approval', 
  LOAN_MANAGEMENT = 'loan_management',
  RISK_CONTROL = 'risk_control',
  MARKETING_CAMPAIGN = 'marketing_campaign',
  DATA_GOVERNANCE = 'data_governance',
  CUSTOMER_SERVICE = 'customer_service'
}

// 数据血缘关系接口
export interface DataLineage {
  /** 源表 */
  sourceTable: string
  /** 目标表 */
  targetTable: string
  /** 关联字段 */
  relationFields: string[]
  /** 关系类型 */
  relationType: 'one_to_one' | 'one_to_many' | 'many_to_many'
  /** 数据流向 */
  dataFlow: 'upstream' | 'downstream' | 'bidirectional'
  /** 更新频率 */
  updateFrequency: 'real-time' | 'batch' | 'manual'
}

// 业务指标计算规则接口
export interface MetricCalculationRule {
  /** 指标ID */
  metricId: string
  /** 指标名称 */
  metricName: string
  /** 计算公式 */
  formula: string
  /** 依赖字段 */
  dependentFields: string[]
  /** 计算逻辑 */
  calculationLogic: string
  /** 业务规则 */
  businessRules: string[]
  /** 异常处理规则 */
  exceptionHandling: string[]
}

// 完整的业务流程配置
export const completeBusinessProcesses: ProcessStep[] = [
  ...processSteps,
  {
    name: '贷后管理',
    description: '监控贷款状态，管理还款和逾期处理',
    icon: 'icon-calendar-check',
    owner: '贷后管理团队',
    order: 6,
    status: 'active',
    businessDomain: '贷后管理',
    estimatedDuration: '持续进行',
    riskLevel: 'medium',
    tables: [
      {
        name: 'loan_repayment',
        description: '还款记录表',
        usage: '用于记录用户还款信息，可分析还款行为和逾期风险。',
        type: '事实表',
        owner: '贷后管理专员',
        dataSource: 'loan_database',
        updateFrequency: 'real-time',
        dataVolume: 'large',
        fields: [
          { name: 'repayment_id', type: 'string', description: '还款ID', usage: '还款记录唯一标识', required: true, maxLength: 32, constraints: ['UNIQUE', 'NOT_NULL'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' },
          { name: 'loan_id', type: 'string', description: '借款ID', usage: '借款记录唯一标识', required: true, maxLength: 32, constraints: ['NOT_NULL'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' },
          { name: 'user_id', type: 'string', description: '用户ID', usage: '用户唯一标识', required: true, maxLength: 32, constraints: ['NOT_NULL'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' },
          { name: 'repayment_amount', type: 'decimal', description: '还款金额', usage: '记录实际还款金额', required: true, constraints: ['POSITIVE'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' },
          { name: 'due_amount', type: 'decimal', description: '应还金额', usage: '记录应还金额', required: true, constraints: ['POSITIVE'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' },
          { name: 'repayment_date', type: 'date', description: '还款日期', usage: '记录实际还款日期', required: true, qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' },
          { name: 'due_date', type: 'date', description: '应还日期', usage: '记录应还日期', required: true, qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' },
          { name: 'repayment_status', type: 'string', description: '还款状态', usage: '记录还款状态', required: true, maxLength: 20, constraints: ['ENUM_VALUE'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' },
          { name: 'overdue_days', type: 'integer', description: '逾期天数', usage: '记录逾期天数', required: false, constraints: ['POSITIVE_NUMBER'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'important' }
        ],
        metrics: [
          { name: '按时还款率', description: '按时还款用户占比', formula: 'count(on_time_repayment)/count(total_repayment)', type: 'rate', unit: '%', owner: '贷后管理专员', businessMeaning: '衡量用户还款质量', calculationPeriod: 'daily' },
          { name: '逾期率', description: '逾期用户占比', formula: 'count(overdue_users)/count(total_users)', type: 'rate', unit: '%', owner: '贷后管理专员', businessMeaning: '监控信贷风险', calculationPeriod: 'daily' },
          { name: '平均逾期天数', description: '逾期用户平均逾期天数', formula: 'avg(overdue_days)', type: 'avg', unit: '天', owner: '贷后管理专员', businessMeaning: '评估逾期严重程度', calculationPeriod: 'weekly' }
        ],
        dependencies: ['loan_contract', 'user_info']
      },
      {
        name: 'collection_record',
        description: '催收记录表',
        usage: '用于记录催收活动信息，可分析催收效果和用户响应。',
        type: '事实表',
        owner: '催收专员',
        dataSource: 'collection_database',
        updateFrequency: 'real-time',
        dataVolume: 'medium',
        fields: [
          { name: 'collection_id', type: 'string', description: '催收ID', usage: '催收记录唯一标识', required: true, maxLength: 32, constraints: ['UNIQUE', 'NOT_NULL'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' },
          { name: 'loan_id', type: 'string', description: '借款ID', usage: '借款记录唯一标识', required: true, maxLength: 32, constraints: ['NOT_NULL'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' },
          { name: 'user_id', type: 'string', description: '用户ID', usage: '用户唯一标识', required: true, maxLength: 32, constraints: ['NOT_NULL'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' },
          { name: 'collection_time', type: 'timestamp', description: '催收时间', usage: '记录催收时间', required: true, defaultValue: 'CURRENT_TIMESTAMP', qualityLevel: DataQualityLevel.HIGH, businessImportance: 'important' },
          { name: 'collection_method', type: 'string', description: '催收方式', usage: '记录催收方式', required: true, maxLength: 50, constraints: ['ENUM_VALUE'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'important' },
          { name: 'collection_result', type: 'string', description: '催收结果', usage: '记录催收结果', required: true, maxLength: 50, constraints: ['ENUM_VALUE'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'important' },
          { name: 'promised_amount', type: 'decimal', description: '承诺还款金额', usage: '记录用户承诺还款金额', required: false, constraints: ['POSITIVE'], qualityLevel: DataQualityLevel.MEDIUM, businessImportance: 'normal' },
          { name: 'promised_date', type: 'date', description: '承诺还款日期', usage: '记录用户承诺还款日期', required: false, qualityLevel: DataQualityLevel.MEDIUM, businessImportance: 'normal' }
        ],
        metrics: [
          { name: '催收成功率', description: '催收成功的比例', formula: 'count(successful_collection)/count(total_collection)', type: 'rate', unit: '%', owner: '催收专员', businessMeaning: '评估催收效果', calculationPeriod: 'daily' },
          { name: '平均催收次数', description: '每笔逾期贷款平均催收次数', formula: 'count(collection_records)/count(distinct loan_id)', type: 'avg', unit: '次', owner: '催收专员', businessMeaning: '优化催收策略', calculationPeriod: 'weekly' }
        ],
        dependencies: ['loan_repayment', 'user_contact']
      }
    ],
    prerequisites: ['放款'],
    nextSteps: ['结清'],
    approvalProcess: [
      {
        processId: 'COLLECTION_APPROVAL_001',
        stepName: '催收策略审批',
        approver: '风控总监',
        status: ApprovalStatus.APPROVED,
        authorityLevel: 'L4',
        deadline: '2025-01-28',
        comments: '批准采用温和催收策略，注重用户体验'
      }
    ],
    slaRequirements: {
      maxDuration: 86400, // 24小时
      successRate: 0.90,
      errorThreshold: 0.05
    }
  },
  {
    name: '客户服务',
    description: '提供客户咨询、投诉处理等服务',
    icon: 'icon-customer-service',
    owner: '客服团队',
    order: 8,
    status: 'active',
    businessDomain: '客户服务',
    estimatedDuration: '实时响应',
    riskLevel: 'low',
    tables: [
      {
        name: 'service_ticket',
        description: '客服工单表',
        usage: '用于记录客服工单信息，可分析服务质量和问题分布。',
        type: '事实表',
        owner: '客服主管',
        dataSource: 'service_database',
        updateFrequency: 'real-time',
        dataVolume: 'large',
        fields: [
          { name: 'ticket_id', type: 'string', description: '工单ID', usage: '工单唯一标识', required: true, maxLength: 32, constraints: ['UNIQUE', 'NOT_NULL'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' },
          { name: 'user_id', type: 'string', description: '用户ID', usage: '用户唯一标识', required: true, maxLength: 32, constraints: ['NOT_NULL'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' },
          { name: 'ticket_type', type: 'string', description: '工单类型', usage: '记录工单类型', required: true, maxLength: 50, constraints: ['ENUM_VALUE'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'important' },
          { name: 'priority', type: 'string', description: '优先级', usage: '记录工单优先级', required: true, maxLength: 20, constraints: ['ENUM_VALUE'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'important' },
          { name: 'create_time', type: 'timestamp', description: '创建时间', usage: '记录工单创建时间', required: true, defaultValue: 'CURRENT_TIMESTAMP', qualityLevel: DataQualityLevel.HIGH, businessImportance: 'important' },
          { name: 'assign_time', type: 'timestamp', description: '分配时间', usage: '记录工单分配时间', required: false, qualityLevel: DataQualityLevel.HIGH, businessImportance: 'important' },
          { name: 'resolve_time', type: 'timestamp', description: '解决时间', usage: '记录工单解决时间', required: false, qualityLevel: DataQualityLevel.HIGH, businessImportance: 'important' },
          { name: 'agent_id', type: 'string', description: '客服ID', usage: '处理工单的客服ID', required: false, maxLength: 32, qualityLevel: DataQualityLevel.HIGH, businessImportance: 'important' },
          { name: 'status', type: 'string', description: '工单状态', usage: '记录工单当前状态', required: true, maxLength: 20, constraints: ['ENUM_VALUE'], qualityLevel: DataQualityLevel.HIGH, businessImportance: 'critical' },
          { name: 'satisfaction_score', type: 'integer', description: '满意度评分', usage: '记录用户满意度评分', required: false, range: { min: 1, max: 5 }, qualityLevel: DataQualityLevel.MEDIUM, businessImportance: 'normal' }
        ],
        metrics: [
          { name: '工单解决率', description: '已解决工单占比', formula: 'count(resolved_tickets)/count(total_tickets)', type: 'rate', unit: '%', owner: '客服主管', businessMeaning: '衡量服务效率', calculationPeriod: 'daily' },
          { name: '平均响应时间', description: '工单平均响应时间', formula: 'avg(assign_time - create_time)', type: 'avg', unit: '分钟', owner: '客服主管', businessMeaning: '评估响应速度', calculationPeriod: 'daily' },
          { name: '客户满意度', description: '客户满意度平均分', formula: 'avg(satisfaction_score)', type: 'avg', unit: '分', owner: '客服主管', businessMeaning: '衡量服务质量', calculationPeriod: 'daily' }
        ],
        dependencies: ['user_info', 'agent_info']
      }
    ],
    prerequisites: [],
    nextSteps: [],
    slaRequirements: {
      maxDuration: 1800, // 30分钟
      successRate: 0.95,
      errorThreshold: 0.02
    }
  }
]

// 数据血缘关系配置
export const dataLineageConfig: DataLineage[] = [
  {
    sourceTable: 'user_register',
    targetTable: 'user_auth',
    relationFields: ['user_id'],
    relationType: 'one_to_one',
    dataFlow: 'downstream',
    updateFrequency: 'real-time'
  },
  {
    sourceTable: 'user_auth',
    targetTable: 'credit_apply',
    relationFields: ['user_id'],
    relationType: 'one_to_many',
    dataFlow: 'downstream',
    updateFrequency: 'real-time'
  },
  {
    sourceTable: 'credit_apply',
    targetTable: 'credit_result',
    relationFields: ['apply_id'],
    relationType: 'one_to_one',
    dataFlow: 'downstream',
    updateFrequency: 'batch'
  },
  {
    sourceTable: 'credit_result',
    targetTable: 'loan_contract',
    relationFields: ['apply_id'],
    relationType: 'one_to_one',
    dataFlow: 'downstream',
    updateFrequency: 'manual'
  },
  {
    sourceTable: 'loan_contract',
    targetTable: 'loan_repayment',
    relationFields: ['loan_id'],
    relationType: 'one_to_many',
    dataFlow: 'downstream',
    updateFrequency: 'real-time'
  }
]

// 业务指标计算规则
export const metricCalculationRules: MetricCalculationRule[] = [
  {
    metricId: 'USER_CONVERSION_RATE',
    metricName: '用户转化率',
    formula: '(授信申请用户数 / 注册用户数) * 100',
    dependentFields: ['user_register.user_id', 'credit_apply.user_id'],
    calculationLogic: '统计指定时间段内注册用户中申请授信的比例',
    businessRules: [
      '只统计状态为active的用户',
      '排除测试账号',
      '按注册时间分组计算'
    ],
    exceptionHandling: [
      '分母为0时返回0',
      '数据缺失时使用历史平均值',
      '异常值超过阈值时触发告警'
    ]
  },
  {
    metricId: 'CREDIT_APPROVAL_RATE',
    metricName: '授信通过率',
    formula: '(授信通过数 / 授信申请数) * 100',
    dependentFields: ['credit_apply.apply_id', 'credit_result.approval_status'],
    calculationLogic: '统计授信申请中最终通过审批的比例',
    businessRules: [
      '只统计最终状态的申请',
      '排除撤回的申请',
      '按产品类型分别计算'
    ],
    exceptionHandling: [
      '申请数为0时返回null',
      '状态异常时重新查询',
      '计算结果异常时人工核查'
    ]
  },
  {
    metricId: 'LOAN_DEFAULT_RATE',
    metricName: '贷款违约率',
    formula: '(违约贷款数 / 总贷款数) * 100',
    dependentFields: ['loan_contract.loan_id', 'loan_repayment.repayment_status'],
    calculationLogic: '统计贷款中发生违约的比例',
    businessRules: [
      '逾期超过90天视为违约',
      '只统计已放款的贷款',
      '按风险等级分层计算'
    ],
    exceptionHandling: [
      '贷款数为0时返回0',
      '状态更新延迟时使用最新数据',
      '违约率异常波动时触发风险预警'
    ]
  }
]

export const tableColumns = [
  { title: '表名', dataIndex: 'name' },
  { title: '负责人', dataIndex: 'owner', render: ({ record }: { record: { owner?: string } }) => (
    record.owner || '未指定'
  )},
  { title: '描述', dataIndex: 'description' },
  { title: '使用说明', dataIndex: 'usage', render: ({ record }: { record: { usage?: string } }) => (
    record.usage || '暂无说明'
  )}
]