import type { MockMethod } from 'vite-plugin-mock';

// 数据地图模拟数据

// 数据质量等级枚举
export enum DataQualityLevel {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

// 业务重要性等级枚举
export enum BusinessImportance {
  CRITICAL = 'critical',
  IMPORTANT = 'important',
  NORMAL = 'normal',
  LOW = 'low'
}

// 数据敏感性等级枚举
export enum DataSensitivity {
  PUBLIC = 'public',
  INTERNAL = 'internal',
  CONFIDENTIAL = 'confidential',
  RESTRICTED = 'restricted'
}

// 字段约束类型
export interface FieldConstraints {
  nullable: boolean;
  unique: boolean;
  primaryKey: boolean;
  foreignKey?: {
    table: string;
    field: string;
  };
  defaultValue?: any;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
}

// 扩展的表字段接口
export interface TableField {
  name: string;
  type: string;
  description: string;
  qualityLevel: DataQualityLevel;
  businessImportance: BusinessImportance;
  sensitivity: DataSensitivity;
  constraints: FieldConstraints;
  tags: string[];
  lastUpdated: string;
}

// 字段关系接口
export interface FieldRelation {
  sourceTable: string;
  sourceField: string;
  targetTable: string;
  targetField: string;
  relationType: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
  relationDescription: string;
  isActive: boolean;
}

// 数据血缘关系
export interface DataLineage {
  id: string;
  sourceTable: string;
  targetTable: string;
  // 关系字段（用于前端展示）
  relationFields?: string[];
  // 关系类型（用于前端展示）
  relationType?: 'one_to_one' | 'one_to_many' | 'many_to_one' | 'many_to_many' | string;
  // 数据流向（用于前端展示：相对当前表的方向）
  dataFlow?: 'upstream' | 'downstream' | 'bidirectional' | string;
  transformationLogic: string;
  dependencies: string[];
  updateFrequency: string;
  lastExecuted: string;
}

// 表项接口
export interface TableItem {
  name: string;
  type: 'dim' | 'fact' | 'dws' | 'dwd' | 'ads' | 'ods';
  assetType: 'Asset' | 'Resource'; // 新增：资产类型打标
  category: 'ODS' | 'DWD' | 'DWS' | 'ADS' | 'DIM';
  sourceType?: 'hive' | 'business'; // 数据来源类型：hive=数据仓库表, business=业务系统源表
  sourceSystem?: string; // 业务系统名称（sourceType=business 时）
  dbType?: string; // 数据库类型（mysql/oracle/pg/doris/clickhouse 等）
  domain: string;
  updateFrequency: string;
  owner: string;
  description: string;
  fields: TableField[];
  recordCount: number;
  storageSize: string;
  partitionKeys: string[];
  indexKeys: string[];
  createdTime: string;
  lastModified: string;
  tags: string[];
  qualityScore: number;
}

// 表集合接口
export interface TableCollection {
  id: string;
  name: string;
  description: string;
  type: string;
  tables: TableItem[];
  owner: string;
  updateTime: string;
  isFavorite: boolean;
  tags: string[];
  accessLevel: DataSensitivity;
}

// 模拟数据
export const mockTables: TableItem[] = [
  {
    name: 'dim_user',
    type: 'dim',
    assetType: 'Asset', // 打标为资产
    category: 'DIM',
    domain: '用户域',
    updateFrequency: '每日',
    owner: '张三',
    description: '用户维度表，存储用户基础信息。来源：核心系统。关联逻辑：作为主表关联fact_loan_apply表(user_id)和dws_risk_score表(user_id)，提供用户基础画像数据。',
    recordCount: 1250000,
    storageSize: '2.5GB',
    partitionKeys: ['create_date'],
    indexKeys: ['user_id', 'mobile'],
    createdTime: '2024-01-01T00:00:00Z',
    lastModified: '2025-01-27T10:30:00Z',
    tags: ['用户', '维度表', '核心数据'],
    qualityScore: 95,
    fields: [
      { 
        name: 'user_id', 
        type: 'string', 
        description: '用户ID',
        qualityLevel: DataQualityLevel.HIGH,
        businessImportance: BusinessImportance.CRITICAL,
        sensitivity: DataSensitivity.INTERNAL,
        constraints: { nullable: false, unique: true, primaryKey: true },
        tags: ['主键', '唯一标识'],
        lastUpdated: '2025-01-27T10:30:00Z'
      },
      { 
        name: 'username', 
        type: 'string', 
        description: '用户名',
        qualityLevel: DataQualityLevel.HIGH,
        businessImportance: BusinessImportance.IMPORTANT,
        sensitivity: DataSensitivity.INTERNAL,
        constraints: { nullable: false, unique: true, primaryKey: false, maxLength: 50 },
        tags: ['用户标识'],
        lastUpdated: '2025-01-27T10:30:00Z'
      },
      { 
        name: 'mobile', 
        type: 'string', 
        description: '手机号',
        qualityLevel: DataQualityLevel.HIGH,
        businessImportance: BusinessImportance.CRITICAL,
        sensitivity: DataSensitivity.CONFIDENTIAL,
        constraints: { nullable: false, unique: true, primaryKey: false, pattern: '^1[3-9]\\d{9}$' },
        tags: ['联系方式', '敏感信息'],
        lastUpdated: '2025-01-27T10:30:00Z'
      },
      { 
        name: 'id_card', 
        type: 'string', 
        description: '身份证号',
        qualityLevel: DataQualityLevel.HIGH,
        businessImportance: BusinessImportance.CRITICAL,
        sensitivity: DataSensitivity.RESTRICTED,
        constraints: { nullable: false, unique: true, primaryKey: false, pattern: '^[1-9]\\d{5}(18|19|20)\\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\\d{3}[0-9Xx]$' },
        tags: ['身份信息', '高敏感'],
        lastUpdated: '2025-01-27T10:30:00Z'
      },
      { 
        name: 'create_time', 
        type: 'timestamp', 
        description: '创建时间',
        qualityLevel: DataQualityLevel.HIGH,
        businessImportance: BusinessImportance.NORMAL,
        sensitivity: DataSensitivity.INTERNAL,
        constraints: { nullable: false, unique: false, primaryKey: false },
        tags: ['时间戳'],
        lastUpdated: '2025-01-27T10:30:00Z'
      },
      { 
        name: 'age', 
        type: 'int', 
        description: '年龄',
        qualityLevel: DataQualityLevel.MEDIUM,
        businessImportance: BusinessImportance.IMPORTANT,
        sensitivity: DataSensitivity.INTERNAL,
        constraints: { nullable: true, unique: false, primaryKey: false },
        tags: ['用户画像'],
        lastUpdated: '2025-01-27T10:30:00Z'
      },
      { 
        name: 'gender', 
        type: 'string', 
        description: '性别',
        qualityLevel: DataQualityLevel.MEDIUM,
        businessImportance: BusinessImportance.NORMAL,
        sensitivity: DataSensitivity.INTERNAL,
        constraints: { nullable: true, unique: false, primaryKey: false },
        tags: ['用户画像'],
        lastUpdated: '2025-01-27T10:30:00Z'
      },
      { 
        name: 'education', 
        type: 'string', 
        description: '学历',
        qualityLevel: DataQualityLevel.MEDIUM,
        businessImportance: BusinessImportance.IMPORTANT,
        sensitivity: DataSensitivity.INTERNAL,
        constraints: { nullable: true, unique: false, primaryKey: false },
        tags: ['用户画像', '风控因子'],
        lastUpdated: '2025-01-27T10:30:00Z'
      },
      { 
        name: 'occupation', 
        type: 'string', 
        description: '职业',
        qualityLevel: DataQualityLevel.MEDIUM,
        businessImportance: BusinessImportance.IMPORTANT,
        sensitivity: DataSensitivity.INTERNAL,
        constraints: { nullable: true, unique: false, primaryKey: false },
        tags: ['用户画像', '风控因子'],
        lastUpdated: '2025-01-27T10:30:00Z'
      },
      { 
        name: 'address', 
        type: 'string', 
        description: '地址',
        qualityLevel: DataQualityLevel.LOW,
        businessImportance: BusinessImportance.NORMAL,
        sensitivity: DataSensitivity.CONFIDENTIAL,
        constraints: { nullable: true, unique: false, primaryKey: false },
        tags: ['地理信息'],
        lastUpdated: '2025-01-27T10:30:00Z'
      },
      { 
        name: 'income_level', 
        type: 'string', 
        description: '收入水平',
        qualityLevel: DataQualityLevel.MEDIUM,
        businessImportance: BusinessImportance.CRITICAL,
        sensitivity: DataSensitivity.CONFIDENTIAL,
        constraints: { nullable: true, unique: false, primaryKey: false },
        tags: ['收入信息', '风控因子'],
        lastUpdated: '2025-01-27T10:30:00Z'
      }
    ]
  },
  {
    name: 'fact_loan_apply',
    type: 'fact',
    assetType: 'Asset',
    category: 'DWD',
    domain: '贷前分析',
    updateFrequency: '实时',
    owner: '李四',
    description: '贷款申请事实表。来源：信贷系统。关联逻辑：通过user_id关联dim_user表获取申请人信息，通过user_id关联dws_risk_score表获取风控评分，用于贷前审批决策。',
    recordCount: 850000,
    storageSize: '1.8GB',
    partitionKeys: ['apply_date'],
    indexKeys: ['apply_id', 'user_id'],
    createdTime: '2024-01-01T00:00:00Z',
    lastModified: '2025-01-27T10:30:00Z',
    tags: ['贷款申请', '事实表', '核心业务'],
    qualityScore: 92,
    fields: [
      { 
        name: 'apply_id', 
        type: 'string', 
        description: '申请ID',
        qualityLevel: DataQualityLevel.HIGH,
        businessImportance: BusinessImportance.CRITICAL,
        sensitivity: DataSensitivity.INTERNAL,
        constraints: { nullable: false, unique: true, primaryKey: true },
        tags: ['主键', '申请标识'],
        lastUpdated: '2025-01-27T10:30:00Z'
      },
      { 
        name: 'user_id', 
        type: 'string', 
        description: '用户ID',
        qualityLevel: DataQualityLevel.HIGH,
        businessImportance: BusinessImportance.CRITICAL,
        sensitivity: DataSensitivity.INTERNAL,
        constraints: { nullable: false, unique: false, primaryKey: false, foreignKey: { table: 'dim_user', field: 'user_id' } },
        tags: ['外键', '用户关联'],
        lastUpdated: '2025-01-27T10:30:00Z'
      },
      { 
        name: 'loan_amount', 
        type: 'decimal', 
        description: '申请金额',
        qualityLevel: DataQualityLevel.HIGH,
        businessImportance: BusinessImportance.CRITICAL,
        sensitivity: DataSensitivity.CONFIDENTIAL,
        constraints: { nullable: false, unique: false, primaryKey: false },
        tags: ['金额信息', '业务核心'],
        lastUpdated: '2025-01-27T10:30:00Z'
      },
      { 
        name: 'loan_term', 
        type: 'int', 
        description: '贷款期限',
        qualityLevel: DataQualityLevel.HIGH,
        businessImportance: BusinessImportance.IMPORTANT,
        sensitivity: DataSensitivity.INTERNAL,
        constraints: { nullable: false, unique: false, primaryKey: false },
        tags: ['期限信息'],
        lastUpdated: '2025-01-27T10:30:00Z'
      },
      { 
        name: 'apply_time', 
        type: 'timestamp', 
        description: '申请时间',
        qualityLevel: DataQualityLevel.HIGH,
        businessImportance: BusinessImportance.IMPORTANT,
        sensitivity: DataSensitivity.INTERNAL,
        constraints: { nullable: false, unique: false, primaryKey: false },
        tags: ['时间戳', '业务时间'],
        lastUpdated: '2025-01-27T10:30:00Z'
      },
      { 
        name: 'loan_purpose', 
        type: 'string', 
        description: '贷款用途',
        qualityLevel: DataQualityLevel.MEDIUM,
        businessImportance: BusinessImportance.IMPORTANT,
        sensitivity: DataSensitivity.INTERNAL,
        constraints: { nullable: true, unique: false, primaryKey: false },
        tags: ['用途分类'],
        lastUpdated: '2025-01-27T10:30:00Z'
      },
      { 
        name: 'monthly_income', 
        type: 'decimal', 
        description: '月收入',
        qualityLevel: DataQualityLevel.MEDIUM,
        businessImportance: BusinessImportance.CRITICAL,
        sensitivity: DataSensitivity.CONFIDENTIAL,
        constraints: { nullable: true, unique: false, primaryKey: false },
        tags: ['收入信息', '风控因子'],
        lastUpdated: '2025-01-27T10:30:00Z'
      },
      { 
        name: 'employment_type', 
        type: 'string', 
        description: '就业类型',
        qualityLevel: DataQualityLevel.MEDIUM,
        businessImportance: BusinessImportance.IMPORTANT,
        sensitivity: DataSensitivity.INTERNAL,
        constraints: { nullable: true, unique: false, primaryKey: false },
        tags: ['就业信息', '风控因子'],
        lastUpdated: '2025-01-27T10:30:00Z'
      },
      { 
        name: 'credit_score', 
        type: 'int', 
        description: '信用评分',
        qualityLevel: DataQualityLevel.HIGH,
        businessImportance: BusinessImportance.CRITICAL,
        sensitivity: DataSensitivity.CONFIDENTIAL,
        constraints: { nullable: true, unique: false, primaryKey: false },
        tags: ['信用评分', '风控核心'],
        lastUpdated: '2025-01-27T10:30:00Z'
      },
      { 
        name: 'product_type', 
        type: 'string', 
        description: '产品类型',
        qualityLevel: DataQualityLevel.HIGH,
        businessImportance: BusinessImportance.IMPORTANT,
        sensitivity: DataSensitivity.INTERNAL,
        constraints: { nullable: false, unique: false, primaryKey: false },
        tags: ['产品分类'],
        lastUpdated: '2025-01-27T10:30:00Z'
      },
      { 
        name: 'approval_status', 
        type: 'string', 
        description: '审批状态',
        qualityLevel: DataQualityLevel.HIGH,
        businessImportance: BusinessImportance.CRITICAL,
        sensitivity: DataSensitivity.INTERNAL,
        constraints: { nullable: false, unique: false, primaryKey: false },
        tags: ['审批状态', '业务状态'],
        lastUpdated: '2025-01-27T10:30:00Z'
      }
    ]
  },
  {
    name: 'dws_risk_score',
    type: 'dws',
    assetType: 'Asset',
    category: 'DWS',
    domain: '风控评估',
    updateFrequency: '每日',
    owner: '王五',
    description: '风险评分汇总表。来源：风控系统。关联逻辑：通过user_id关联dim_user表获取用户基本信息，为fact_loan_apply表提供风控评分支持，同时关联dwd_fraud_alert表获取欺诈信息。',
    recordCount: 1200000,
    storageSize: '800MB',
    partitionKeys: ['update_date'],
    indexKeys: ['user_id'],
    createdTime: '2024-01-01T00:00:00Z',
    lastModified: '2025-01-27T10:30:00Z',
    tags: ['风控评分', '汇总表', '核心指标'],
    qualityScore: 88,
    fields: [
      { 
        name: 'user_id', 
        type: 'string', 
        description: '用户ID',
        qualityLevel: DataQualityLevel.HIGH,
        businessImportance: BusinessImportance.CRITICAL,
        sensitivity: DataSensitivity.INTERNAL,
        constraints: { nullable: false, unique: true, primaryKey: true, foreignKey: { table: 'dim_user', field: 'user_id' } },
        tags: ['主键', '用户关联'],
        lastUpdated: '2025-01-27T10:30:00Z'
      },
      { 
        name: 'credit_score', 
        type: 'int', 
        description: '信用评分',
        qualityLevel: DataQualityLevel.HIGH,
        businessImportance: BusinessImportance.CRITICAL,
        sensitivity: DataSensitivity.CONFIDENTIAL,
        constraints: { nullable: true, unique: false, primaryKey: false },
        tags: ['信用评分', '风控核心'],
        lastUpdated: '2025-01-27T10:30:00Z'
      },
      { 
        name: 'behavior_score', 
        type: 'int', 
        description: '行为评分',
        qualityLevel: DataQualityLevel.MEDIUM,
        businessImportance: BusinessImportance.IMPORTANT,
        sensitivity: DataSensitivity.INTERNAL,
        constraints: { nullable: true, unique: false, primaryKey: false },
        tags: ['行为分析', '风控因子'],
        lastUpdated: '2025-01-27T10:30:00Z'
      },
      { 
        name: 'anti_fraud_score', 
        type: 'int', 
        description: '反欺诈评分',
        qualityLevel: DataQualityLevel.HIGH,
        businessImportance: BusinessImportance.CRITICAL,
        sensitivity: DataSensitivity.CONFIDENTIAL,
        constraints: { nullable: true, unique: false, primaryKey: false },
        tags: ['反欺诈', '风控核心'],
        lastUpdated: '2025-01-27T10:30:00Z'
      },
      { 
        name: 'update_time', 
        type: 'timestamp', 
        description: '更新时间',
        qualityLevel: DataQualityLevel.HIGH,
        businessImportance: BusinessImportance.NORMAL,
        sensitivity: DataSensitivity.INTERNAL,
        constraints: { nullable: false, unique: false, primaryKey: false },
        tags: ['时间戳'],
        lastUpdated: '2025-01-27T10:30:00Z'
      },
      { 
        name: 'overdue_history', 
        type: 'string', 
        description: '逾期历史',
        qualityLevel: DataQualityLevel.MEDIUM,
        businessImportance: BusinessImportance.CRITICAL,
        sensitivity: DataSensitivity.CONFIDENTIAL,
        constraints: { nullable: true, unique: false, primaryKey: false },
        tags: ['逾期信息', '风控核心'],
        lastUpdated: '2025-01-27T10:30:00Z'
      },
      { 
        name: 'credit_history_length', 
        type: 'int', 
        description: '信用历史长度(月)',
        qualityLevel: DataQualityLevel.MEDIUM,
        businessImportance: BusinessImportance.IMPORTANT,
        sensitivity: DataSensitivity.INTERNAL,
        constraints: { nullable: true, unique: false, primaryKey: false },
        tags: ['信用历史', '风控因子'],
        lastUpdated: '2025-01-27T10:30:00Z'
      }
    ]
  },
  {
    name: 'dwd_fraud_alert',
    type: 'dwd',
    assetType: 'Asset',
    category: 'DWD',
    domain: '反欺诈',
    updateFrequency: '实时',
    owner: '赵六',
    description: '欺诈预警明细表。来源：风控系统。关联逻辑：通过user_id关联dim_user表和dws_risk_score表，为风控决策提供欺诈风险信息，是风控评分的重要组成部分。',
    recordCount: 45000,
    storageSize: '120MB',
    partitionKeys: ['alert_date'],
    indexKeys: ['alert_id', 'user_id'],
    createdTime: '2024-01-01T00:00:00Z',
    lastModified: '2025-01-27T10:30:00Z',
    tags: ['欺诈预警', '明细表', '实时监控'],
    qualityScore: 90,
    fields: [
      { 
        name: 'alert_id', 
        type: 'string', 
        description: '预警ID',
        qualityLevel: DataQualityLevel.HIGH,
        businessImportance: BusinessImportance.CRITICAL,
        sensitivity: DataSensitivity.INTERNAL,
        constraints: { nullable: false, unique: true, primaryKey: true },
        tags: ['主键', '预警标识'],
        lastUpdated: '2025-01-27T10:30:00Z'
      },
      { 
        name: 'user_id', 
        type: 'string', 
        description: '用户ID',
        qualityLevel: DataQualityLevel.HIGH,
        businessImportance: BusinessImportance.CRITICAL,
        sensitivity: DataSensitivity.INTERNAL,
        constraints: { nullable: false, unique: false, primaryKey: false, foreignKey: { table: 'dim_user', field: 'user_id' } },
        tags: ['外键', '用户关联'],
        lastUpdated: '2025-01-27T10:30:00Z'
      },
      { 
        name: 'alert_type', 
        type: 'string', 
        description: '预警类型',
        qualityLevel: DataQualityLevel.HIGH,
        businessImportance: BusinessImportance.CRITICAL,
        sensitivity: DataSensitivity.INTERNAL,
        constraints: { nullable: false, unique: false, primaryKey: false },
        tags: ['预警分类', '风控类型'],
        lastUpdated: '2025-01-27T10:30:00Z'
      },
      { 
        name: 'alert_level', 
        type: 'string', 
        description: '预警等级',
        qualityLevel: DataQualityLevel.HIGH,
        businessImportance: BusinessImportance.CRITICAL,
        sensitivity: DataSensitivity.INTERNAL,
        constraints: { nullable: false, unique: false, primaryKey: false },
        tags: ['预警等级', '风险级别'],
        lastUpdated: '2025-01-27T10:30:00Z'
      },
      { 
        name: 'alert_time', 
        type: 'timestamp', 
        description: '预警时间',
        qualityLevel: DataQualityLevel.HIGH,
        businessImportance: BusinessImportance.IMPORTANT,
        sensitivity: DataSensitivity.INTERNAL,
        constraints: { nullable: false, unique: false, primaryKey: false },
        tags: ['时间戳', '预警时间'],
        lastUpdated: '2025-01-27T10:30:00Z'
      },
      { 
        name: 'device_info', 
        type: 'string', 
        description: '设备信息',
        qualityLevel: DataQualityLevel.MEDIUM,
        businessImportance: BusinessImportance.IMPORTANT,
        sensitivity: DataSensitivity.CONFIDENTIAL,
        constraints: { nullable: true, unique: false, primaryKey: false },
        tags: ['设备信息', '风控因子'],
        lastUpdated: '2025-01-27T10:30:00Z'
      },
      { 
        name: 'ip_address', 
        type: 'string', 
        description: 'IP地址',
        qualityLevel: DataQualityLevel.MEDIUM,
        businessImportance: BusinessImportance.IMPORTANT,
        sensitivity: DataSensitivity.CONFIDENTIAL,
        constraints: { nullable: true, unique: false, primaryKey: false },
        tags: ['网络信息', '风控因子'],
        lastUpdated: '2025-01-27T10:30:00Z'
      },
      { 
        name: 'location', 
        type: 'string', 
        description: '地理位置',
        qualityLevel: DataQualityLevel.LOW,
        businessImportance: BusinessImportance.NORMAL,
        sensitivity: DataSensitivity.CONFIDENTIAL,
        constraints: { nullable: true, unique: false, primaryKey: false },
        tags: ['地理信息', '位置数据'],
        lastUpdated: '2025-01-27T10:30:00Z'
      }
    ]
  },
  {
    name: 'fact_self_loan',
    type: 'fact',
    assetType: 'Asset',
    category: 'DWD',
    domain: '自营业务',
    updateFrequency: '实时',
    owner: '钱七',
    description: '自营贷款业务事实表，记录自营贷款业务的交易信息。来源：核心系统。',
    recordCount: 320000,
    storageSize: '650MB',
    partitionKeys: ['transaction_date'],
    indexKeys: ['transaction_id', 'user_id'],
    createdTime: '2024-01-01T00:00:00Z',
    lastModified: '2025-01-27T10:30:00Z',
    tags: ['自营业务', '事实表', '交易数据'],
    qualityScore: 85,
    fields: [
      { 
        name: 'transaction_id', 
        type: 'string', 
        description: '交易ID',
        qualityLevel: DataQualityLevel.HIGH,
        businessImportance: BusinessImportance.CRITICAL,
        sensitivity: DataSensitivity.INTERNAL,
        constraints: { nullable: false, unique: true, primaryKey: true },
        tags: ['主键', '交易标识'],
        lastUpdated: '2025-01-27T10:30:00Z'
      },
      { 
        name: 'user_id', 
        type: 'string', 
        description: '用户ID',
        qualityLevel: DataQualityLevel.HIGH,
        businessImportance: BusinessImportance.CRITICAL,
        sensitivity: DataSensitivity.INTERNAL,
        constraints: { nullable: false, unique: false, primaryKey: false, foreignKey: { table: 'dim_user', field: 'user_id' } },
        tags: ['外键', '用户关联'],
        lastUpdated: '2025-01-27T10:30:00Z'
      },
      { 
        name: 'product_id', 
        type: 'string', 
        description: '产品ID',
        qualityLevel: DataQualityLevel.HIGH,
        businessImportance: BusinessImportance.IMPORTANT,
        sensitivity: DataSensitivity.INTERNAL,
        constraints: { nullable: false, unique: false, primaryKey: false },
        tags: ['产品标识'],
        lastUpdated: '2025-01-27T10:30:00Z'
      },
      { 
        name: 'amount', 
        type: 'decimal', 
        description: '交易金额',
        qualityLevel: DataQualityLevel.HIGH,
        businessImportance: BusinessImportance.CRITICAL,
        sensitivity: DataSensitivity.CONFIDENTIAL,
        constraints: { nullable: false, unique: false, primaryKey: false },
        tags: ['金额信息', '交易核心'],
        lastUpdated: '2025-01-27T10:30:00Z'
      },
      { 
        name: 'transaction_time', 
        type: 'timestamp', 
        description: '交易时间',
        qualityLevel: DataQualityLevel.HIGH,
        businessImportance: BusinessImportance.IMPORTANT,
        sensitivity: DataSensitivity.INTERNAL,
        constraints: { nullable: false, unique: false, primaryKey: false },
        tags: ['时间戳', '交易时间'],
        lastUpdated: '2025-01-27T10:30:00Z'
      },
      { 
        name: 'interest_rate', 
        type: 'decimal', 
        description: '利率',
        qualityLevel: DataQualityLevel.HIGH,
        businessImportance: BusinessImportance.CRITICAL,
        sensitivity: DataSensitivity.CONFIDENTIAL,
        constraints: { nullable: false, unique: false, primaryKey: false },
        tags: ['利率信息', '定价核心'],
        lastUpdated: '2025-01-27T10:30:00Z'
      },
      { 
        name: 'term', 
        type: 'int', 
        description: '期限',
        qualityLevel: DataQualityLevel.HIGH,
        businessImportance: BusinessImportance.IMPORTANT,
        sensitivity: DataSensitivity.INTERNAL,
        constraints: { nullable: false, unique: false, primaryKey: false },
        tags: ['期限信息'],
        lastUpdated: '2025-01-27T10:30:00Z'
      },
      { 
        name: 'status', 
        type: 'string', 
        description: '交易状态',
        qualityLevel: DataQualityLevel.HIGH,
        businessImportance: BusinessImportance.CRITICAL,
        sensitivity: DataSensitivity.INTERNAL,
        constraints: { nullable: false, unique: false, primaryKey: false },
        tags: ['交易状态', '业务状态'],
        lastUpdated: '2025-01-27T10:30:00Z'
      }
    ]
  },
  {
    name: 'dwd_credit_apply',
    type: 'dwd',
    assetType: 'Resource', // 标记为资源
    category: 'DWD',
    domain: '授信域',
    updateFrequency: '实时',
    owner: '李四',
    description: '授信申请明细表，记录客户的每一次授信申请。',
    recordCount: 500000,
    storageSize: '1.2GB',
    partitionKeys: ['apply_date'],
    indexKeys: ['apply_id'],
    createdTime: '2024-01-01T00:00:00Z',
    lastModified: '2025-01-27T10:30:00Z',
    tags: ['授信', '申请', '明细表'],
    qualityScore: 95,
    fields: [
      {
        name: 'apply_id',
        type: 'string',
        description: '申请ID',
        qualityLevel: DataQualityLevel.HIGH,
        businessImportance: BusinessImportance.CRITICAL,
        sensitivity: DataSensitivity.INTERNAL,
        constraints: { nullable: false, unique: true, primaryKey: true },
        tags: ['主键'],
        lastUpdated: '2025-01-27T10:30:00Z'
      },
      {
        name: 'apply_amount',
        type: 'decimal',
        description: '申请金额',
        qualityLevel: DataQualityLevel.HIGH,
        businessImportance: BusinessImportance.IMPORTANT,
        sensitivity: DataSensitivity.CONFIDENTIAL,
        constraints: { nullable: false, unique: false, primaryKey: false },
        tags: ['金额'],
        lastUpdated: '2025-01-27T10:30:00Z'
      }
    ]
  },
  {
    name: 'dwd_credit_contract',
    type: 'dwd',
    assetType: 'Resource',
    category: 'DWD',
    domain: '授信域',
    updateFrequency: '实时',
    owner: '李四',
    description: '授信合同明细表，存储授信审批通过后的合同信息。',
    recordCount: 200000,
    storageSize: '800MB',
    partitionKeys: ['sign_date'],
    indexKeys: ['contract_id'],
    createdTime: '2024-01-01T00:00:00Z',
    lastModified: '2025-01-27T10:30:00Z',
    tags: ['授信', '合同', '核心数据'],
    qualityScore: 98,
    fields: [
      {
        name: 'contract_id',
        type: 'string',
        description: '合同编号',
        qualityLevel: DataQualityLevel.HIGH,
        businessImportance: BusinessImportance.CRITICAL,
        sensitivity: DataSensitivity.INTERNAL,
        constraints: { nullable: false, unique: true, primaryKey: true },
        tags: ['主键'],
        lastUpdated: '2025-01-27T10:30:00Z'
      },
      {
        name: 'credit_amount',
        type: 'decimal',
        description: '授信额度',
        qualityLevel: DataQualityLevel.HIGH,
        businessImportance: BusinessImportance.CRITICAL,
        sensitivity: DataSensitivity.CONFIDENTIAL,
        constraints: { nullable: false, unique: false, primaryKey: false },
        tags: ['金额', '核心指标'],
        lastUpdated: '2025-01-27T10:30:00Z'
      },
      {
        name: 'cycle_credit_flag',
        type: 'boolean',
        description: '是否循环额度',
        qualityLevel: DataQualityLevel.HIGH,
        businessImportance: BusinessImportance.IMPORTANT,
        sensitivity: DataSensitivity.INTERNAL,
        constraints: { nullable: false, unique: false, primaryKey: false },
        tags: ['配置'],
        lastUpdated: '2025-01-27T10:30:00Z'
      }
    ]
  },
  {
    name: 'dws_credit_analysis',
    type: 'dws',
    assetType: 'Asset',
    category: 'DWS',
    domain: '授信域',
    updateFrequency: '每日',
    owner: '赵六',
    description: '授信业务分析汇总表，包含授信通过率、支用率等指标。',
    recordCount: 5000,
    storageSize: '100MB',
    partitionKeys: ['stat_date'],
    indexKeys: ['stat_date', 'product_id'],
    createdTime: '2024-01-01T00:00:00Z',
    lastModified: '2025-01-27T10:30:00Z',
    tags: ['授信', '汇总', '指标'],
    qualityScore: 90,
    fields: [
      {
        name: 'usage_rate',
        type: 'decimal',
        description: '支用率',
        qualityLevel: DataQualityLevel.HIGH,
        businessImportance: BusinessImportance.IMPORTANT,
        sensitivity: DataSensitivity.INTERNAL,
        constraints: { nullable: false, unique: false, primaryKey: false },
        tags: ['指标'],
        lastUpdated: '2025-01-27T10:30:00Z'
      }
    ]
  },
  {
    name: 'dws_repayment_plan',
    type: 'dws',
    assetType: 'Asset',
    category: 'DWS',
    domain: '还款域',
    updateFrequency: '每日',
    owner: '钱七',
    description: '还款计划汇总表，用于监控还款进度和逾期情况。',
    recordCount: 1000000,
    storageSize: '2GB',
    partitionKeys: ['due_date'],
    indexKeys: ['plan_id'],
    createdTime: '2024-01-01T00:00:00Z',
    lastModified: '2025-01-27T10:30:00Z',
    tags: ['还款', '计划', '核心数据'],
    qualityScore: 96,
    fields: [
      {
        name: 'plan_id',
        type: 'string',
        description: '计划ID',
        qualityLevel: DataQualityLevel.HIGH,
        businessImportance: BusinessImportance.CRITICAL,
        sensitivity: DataSensitivity.INTERNAL,
        constraints: { nullable: false, unique: true, primaryKey: true },
        tags: ['主键'],
        lastUpdated: '2025-01-27T10:30:00Z'
      },
      {
        name: 'due_amount',
        type: 'decimal',
        description: '应还金额',
        qualityLevel: DataQualityLevel.HIGH,
        businessImportance: BusinessImportance.CRITICAL,
        sensitivity: DataSensitivity.CONFIDENTIAL,
        constraints: { nullable: false, unique: false, primaryKey: false },
        tags: ['金额'],
        lastUpdated: '2025-01-27T10:30:00Z'
      }
    ]
  },
  {
    name: 'dwd_user_register',
    type: 'dwd',
    assetType: 'Resource',
    category: 'DWD',
    domain: '用户域',
    updateFrequency: '实时',
    owner: '系统',
    description: '用户注册明细表，记录用户注册基础信息。业务过程起点。',
    recordCount: 2000000,
    storageSize: '1.5GB',
    partitionKeys: ['register_date'],
    indexKeys: ['user_id', 'mobile'],
    createdTime: '2024-01-01T00:00:00Z',
    lastModified: '2025-01-27T10:30:00Z',
    tags: ['注册', '用户', '明细'],
    qualityScore: 99,
    fields: [
      { name: 'user_id', type: 'string', description: '用户ID', qualityLevel: DataQualityLevel.HIGH, businessImportance: BusinessImportance.CRITICAL, sensitivity: DataSensitivity.INTERNAL, constraints: { nullable: false, unique: true, primaryKey: true }, tags: ['主键'], lastUpdated: '2025-01-27T10:30:00Z' },
      { name: 'mobile', type: 'string', description: '注册手机号', qualityLevel: DataQualityLevel.HIGH, businessImportance: BusinessImportance.CRITICAL, sensitivity: DataSensitivity.CONFIDENTIAL, constraints: { nullable: false, unique: true, primaryKey: false }, tags: ['敏感'], lastUpdated: '2025-01-27T10:30:00Z' },
      { name: 'register_time', type: 'timestamp', description: '注册时间', qualityLevel: DataQualityLevel.HIGH, businessImportance: BusinessImportance.IMPORTANT, sensitivity: DataSensitivity.INTERNAL, constraints: { nullable: false, unique: false, primaryKey: false }, tags: ['时间'], lastUpdated: '2025-01-27T10:30:00Z' }
    ]
  },
  {
    name: 'dwd_realname_auth',
    type: 'dwd',
    assetType: 'Resource',
    category: 'DWD',
    domain: '用户域',
    updateFrequency: '实时',
    owner: '系统',
    description: '实名认证明细表，记录用户绑卡及身份认证信息。',
    recordCount: 1800000,
    storageSize: '1.8GB',
    partitionKeys: ['auth_date'],
    indexKeys: ['auth_id', 'user_id'],
    createdTime: '2024-01-01T00:00:00Z',
    lastModified: '2025-01-27T10:30:00Z',
    tags: ['实名', '认证', '明细'],
    qualityScore: 98,
    fields: [
      { name: 'auth_id', type: 'string', description: '认证流水ID', qualityLevel: DataQualityLevel.HIGH, businessImportance: BusinessImportance.CRITICAL, sensitivity: DataSensitivity.INTERNAL, constraints: { nullable: false, unique: true, primaryKey: true }, tags: ['主键'], lastUpdated: '2025-01-27T10:30:00Z' },
      { name: 'user_id', type: 'string', description: '用户ID', qualityLevel: DataQualityLevel.HIGH, businessImportance: BusinessImportance.CRITICAL, sensitivity: DataSensitivity.INTERNAL, constraints: { nullable: false, unique: false, primaryKey: false }, tags: ['外键'], lastUpdated: '2025-01-27T10:30:00Z' },
      { name: 'id_card', type: 'string', description: '身份证号', qualityLevel: DataQualityLevel.HIGH, businessImportance: BusinessImportance.CRITICAL, sensitivity: DataSensitivity.RESTRICTED, constraints: { nullable: false, unique: false, primaryKey: false }, tags: ['高敏感'], lastUpdated: '2025-01-27T10:30:00Z' },
      { name: 'auth_status', type: 'string', description: '认证状态', qualityLevel: DataQualityLevel.HIGH, businessImportance: BusinessImportance.IMPORTANT, sensitivity: DataSensitivity.INTERNAL, constraints: { nullable: false, unique: false, primaryKey: false }, tags: ['状态'], lastUpdated: '2025-01-27T10:30:00Z' }
    ]
  },
  {
    name: 'dwd_loan_drawdown',
    type: 'dwd',
    assetType: 'Resource',
    category: 'DWD',
    domain: '支用域',
    updateFrequency: '实时',
    owner: '系统',
    description: '支用明细表，记录授信通过后的实际放款/支用流水。',
    recordCount: 800000,
    storageSize: '1.2GB',
    partitionKeys: ['drawdown_date'],
    indexKeys: ['drawdown_id', 'apply_id'],
    createdTime: '2024-01-01T00:00:00Z',
    lastModified: '2025-01-27T10:30:00Z',
    tags: ['支用', '放款', '明细'],
    qualityScore: 97,
    fields: [
      { name: 'drawdown_id', type: 'string', description: '支用流水ID', qualityLevel: DataQualityLevel.HIGH, businessImportance: BusinessImportance.CRITICAL, sensitivity: DataSensitivity.INTERNAL, constraints: { nullable: false, unique: true, primaryKey: true }, tags: ['主键'], lastUpdated: '2025-01-27T10:30:00Z' },
      { name: 'apply_id', type: 'string', description: '授信申请ID', qualityLevel: DataQualityLevel.HIGH, businessImportance: BusinessImportance.CRITICAL, sensitivity: DataSensitivity.INTERNAL, constraints: { nullable: false, unique: false, primaryKey: false }, tags: ['外键'], lastUpdated: '2025-01-27T10:30:00Z' },
      { name: 'drawdown_amount', type: 'decimal', description: '支用金额', qualityLevel: DataQualityLevel.HIGH, businessImportance: BusinessImportance.CRITICAL, sensitivity: DataSensitivity.CONFIDENTIAL, constraints: { nullable: false, unique: false, primaryKey: false }, tags: ['金额'], lastUpdated: '2025-01-27T10:30:00Z' },
      { name: 'drawdown_time', type: 'timestamp', description: '支用时间', qualityLevel: DataQualityLevel.HIGH, businessImportance: BusinessImportance.IMPORTANT, sensitivity: DataSensitivity.INTERNAL, constraints: { nullable: false, unique: false, primaryKey: false }, tags: ['时间'], lastUpdated: '2025-01-27T10:30:00Z' }
    ]
  },
  {
    name: 'dws_post_loan_monitor',
    type: 'dws',
    assetType: 'Asset',
    category: 'DWS',
    domain: '贷后域',
    updateFrequency: '每日',
    owner: '风控',
    description: '贷后监控汇总表，监控在贷余额、逾期天数、催收状态等。',
    recordCount: 500000,
    storageSize: '800MB',
    partitionKeys: ['monitor_date'],
    indexKeys: ['user_id', 'drawdown_id'],
    createdTime: '2024-01-01T00:00:00Z',
    lastModified: '2025-01-27T10:30:00Z',
    tags: ['贷后', '监控', '汇总'],
    qualityScore: 95,
    fields: [
      { name: 'monitor_id', type: 'string', description: '监控记录ID', qualityLevel: DataQualityLevel.HIGH, businessImportance: BusinessImportance.CRITICAL, sensitivity: DataSensitivity.INTERNAL, constraints: { nullable: false, unique: true, primaryKey: true }, tags: ['主键'], lastUpdated: '2025-01-27T10:30:00Z' },
      { name: 'user_id', type: 'string', description: '用户ID', qualityLevel: DataQualityLevel.HIGH, businessImportance: BusinessImportance.CRITICAL, sensitivity: DataSensitivity.INTERNAL, constraints: { nullable: false, unique: false, primaryKey: false }, tags: ['外键'], lastUpdated: '2025-01-27T10:30:00Z' },
      { name: 'overdue_days', type: 'int', description: '逾期天数', qualityLevel: DataQualityLevel.HIGH, businessImportance: BusinessImportance.CRITICAL, sensitivity: DataSensitivity.INTERNAL, constraints: { nullable: false, unique: false, primaryKey: false }, tags: ['风险指标'], lastUpdated: '2025-01-27T10:30:00Z' },
      { name: 'collection_status', type: 'string', description: '催收状态', qualityLevel: DataQualityLevel.HIGH, businessImportance: BusinessImportance.IMPORTANT, sensitivity: DataSensitivity.INTERNAL, constraints: { nullable: false, unique: false, primaryKey: false }, tags: ['状态'], lastUpdated: '2025-01-27T10:30:00Z' }
    ]
  }
];

// ========== 业务系统源表（ODS 层，直接来自业务系统数据库）==========
const businessSourceTables: TableItem[] = [
  {
    name: 'ods_core_trade_order', type: 'ods', assetType: 'Resource', sourceType: 'business', sourceSystem: '核心交易系统', dbType: 'mysql',
    category: 'ODS', domain: '交易域', updateFrequency: '实时', owner: '李开发',
    description: '核心交易系统交易订单明细表，记录每笔交易的核心信息。来源：核心交易系统(MySQL)。',
    recordCount: 5800000, storageSize: '12GB', partitionKeys: ['create_date'], indexKeys: ['order_id', 'user_id'],
    createdTime: '2024-01-01T00:00:00Z', lastModified: '2025-01-27T10:30:00Z',
    tags: ['交易', '订单', '业务源表', 'MySQL'], qualityScore: 92,
    fields: [
      { name: 'order_id', type: 'string', description: '订单ID', qualityLevel: DataQualityLevel.HIGH, businessImportance: BusinessImportance.CRITICAL, sensitivity: DataSensitivity.INTERNAL, constraints: { nullable: false, unique: true, primaryKey: true }, tags: ['主键'], lastUpdated: '2025-01-27T10:30:00Z' },
      { name: 'user_id', type: 'string', description: '用户ID', qualityLevel: DataQualityLevel.HIGH, businessImportance: BusinessImportance.CRITICAL, sensitivity: DataSensitivity.INTERNAL, constraints: { nullable: false, unique: false, primaryKey: false }, tags: ['用户标识'], lastUpdated: '2025-01-27T10:30:00Z' },
      { name: 'amount', type: 'decimal', description: '交易金额', qualityLevel: DataQualityLevel.HIGH, businessImportance: BusinessImportance.CRITICAL, sensitivity: DataSensitivity.CONFIDENTIAL, constraints: { nullable: false, unique: false, primaryKey: false }, tags: ['金额'], lastUpdated: '2025-01-27T10:30:00Z' },
      { name: 'order_status', type: 'string', description: '订单状态', qualityLevel: DataQualityLevel.HIGH, businessImportance: BusinessImportance.IMPORTANT, sensitivity: DataSensitivity.INTERNAL, constraints: { nullable: false, unique: false, primaryKey: false }, tags: ['状态'], lastUpdated: '2025-01-27T10:30:00Z' },
      { name: 'create_time', type: 'timestamp', description: '创建时间', qualityLevel: DataQualityLevel.HIGH, businessImportance: BusinessImportance.NORMAL, sensitivity: DataSensitivity.INTERNAL, constraints: { nullable: false, unique: false, primaryKey: false }, tags: ['时间戳'], lastUpdated: '2025-01-27T10:30:00Z' }
    ]
  },
  {
    name: 'ods_core_trade_account', type: 'ods', assetType: 'Resource', sourceType: 'business', sourceSystem: '核心交易系统', dbType: 'mysql',
    category: 'ODS', domain: '交易域', updateFrequency: '日更新', owner: '李开发',
    description: '核心交易系统账户信息表，存储用户资金账户基础信息。来源：核心交易系统(MySQL)。',
    recordCount: 320000, storageSize: '2.5GB', partitionKeys: [], indexKeys: ['account_id', 'user_id'],
    createdTime: '2024-01-01T00:00:00Z', lastModified: '2025-01-27T10:30:00Z',
    tags: ['账户', '业务源表', 'MySQL'], qualityScore: 95,
    fields: [
      { name: 'account_id', type: 'string', description: '账户ID', qualityLevel: DataQualityLevel.HIGH, businessImportance: BusinessImportance.CRITICAL, sensitivity: DataSensitivity.INTERNAL, constraints: { nullable: false, unique: true, primaryKey: true }, tags: ['主键'], lastUpdated: '2025-01-27T10:30:00Z' },
      { name: 'user_id', type: 'string', description: '用户ID', qualityLevel: DataQualityLevel.HIGH, businessImportance: BusinessImportance.CRITICAL, sensitivity: DataSensitivity.INTERNAL, constraints: { nullable: false, unique: false, primaryKey: false }, tags: ['用户标识'], lastUpdated: '2025-01-27T10:30:00Z' },
      { name: 'balance', type: 'decimal', description: '账户余额', qualityLevel: DataQualityLevel.HIGH, businessImportance: BusinessImportance.CRITICAL, sensitivity: DataSensitivity.CONFIDENTIAL, constraints: { nullable: false, unique: false, primaryKey: false }, tags: ['金额'], lastUpdated: '2025-01-27T10:30:00Z' },
      { name: 'account_status', type: 'string', description: '账户状态', qualityLevel: DataQualityLevel.HIGH, businessImportance: BusinessImportance.IMPORTANT, sensitivity: DataSensitivity.INTERNAL, constraints: { nullable: false, unique: false, primaryKey: false }, tags: ['状态'], lastUpdated: '2025-01-27T10:30:00Z' }
    ]
  },
  {
    name: 'ods_risk_decision_log', type: 'ods', assetType: 'Resource', sourceType: 'business', sourceSystem: '风控决策引擎', dbType: 'doris',
    category: 'ODS', domain: '风控域', updateFrequency: '实时', owner: '张风控',
    description: '风控决策引擎决策日志表，记录每次风控规则引擎的执行结果。来源：风控决策引擎(Doris)。',
    recordCount: 12000000, storageSize: '25GB', partitionKeys: ['decision_date'], indexKeys: ['decision_id', 'user_id'],
    createdTime: '2024-01-01T00:00:00Z', lastModified: '2025-01-27T09:15:00Z',
    tags: ['风控', '决策', '业务源表', 'Doris'], qualityScore: 88,
    fields: [
      { name: 'decision_id', type: 'string', description: '决策ID', qualityLevel: DataQualityLevel.HIGH, businessImportance: BusinessImportance.CRITICAL, sensitivity: DataSensitivity.INTERNAL, constraints: { nullable: false, unique: true, primaryKey: true }, tags: ['主键'], lastUpdated: '2025-01-27T09:15:00Z' },
      { name: 'user_id', type: 'string', description: '用户ID', qualityLevel: DataQualityLevel.HIGH, businessImportance: BusinessImportance.CRITICAL, sensitivity: DataSensitivity.INTERNAL, constraints: { nullable: false, unique: false, primaryKey: false }, tags: ['用户标识'], lastUpdated: '2025-01-27T09:15:00Z' },
      { name: 'decision_result', type: 'string', description: '决策结果(通过/拒绝/人工)', qualityLevel: DataQualityLevel.HIGH, businessImportance: BusinessImportance.CRITICAL, sensitivity: DataSensitivity.INTERNAL, constraints: { nullable: false, unique: false, primaryKey: false }, tags: ['风控结果'], lastUpdated: '2025-01-27T09:15:00Z' },
      { name: 'rule_hit', type: 'string', description: '命中规则', qualityLevel: DataQualityLevel.MEDIUM, businessImportance: BusinessImportance.IMPORTANT, sensitivity: DataSensitivity.INTERNAL, constraints: { nullable: true, unique: false, primaryKey: false }, tags: ['规则'], lastUpdated: '2025-01-27T09:15:00Z' }
    ]
  },
  {
    name: 'ods_risk_rule_config', type: 'ods', assetType: 'Resource', sourceType: 'business', sourceSystem: '风控决策引擎', dbType: 'doris',
    category: 'ODS', domain: '风控域', updateFrequency: '日更新', owner: '张风控',
    description: '风控规则配置表，存储风控引擎的规则定义和参数。来源：风控决策引擎(Doris)。',
    recordCount: 850, storageSize: '50MB', partitionKeys: [], indexKeys: ['rule_id'],
    createdTime: '2024-01-01T00:00:00Z', lastModified: '2025-01-27T09:15:00Z',
    tags: ['风控', '规则', '配置', '业务源表', 'Doris'], qualityScore: 90,
    fields: [
      { name: 'rule_id', type: 'string', description: '规则ID', qualityLevel: DataQualityLevel.HIGH, businessImportance: BusinessImportance.CRITICAL, sensitivity: DataSensitivity.INTERNAL, constraints: { nullable: false, unique: true, primaryKey: true }, tags: ['主键'], lastUpdated: '2025-01-27T09:15:00Z' },
      { name: 'rule_name', type: 'string', description: '规则名称', qualityLevel: DataQualityLevel.HIGH, businessImportance: BusinessImportance.IMPORTANT, sensitivity: DataSensitivity.INTERNAL, constraints: { nullable: false, unique: false, primaryKey: false }, tags: ['名称'], lastUpdated: '2025-01-27T09:15:00Z' },
      { name: 'rule_status', type: 'string', description: '规则状态(启用/停用)', qualityLevel: DataQualityLevel.HIGH, businessImportance: BusinessImportance.IMPORTANT, sensitivity: DataSensitivity.INTERNAL, constraints: { nullable: false, unique: false, primaryKey: false }, tags: ['状态'], lastUpdated: '2025-01-27T09:15:00Z' }
    ]
  },
  {
    name: 'ods_user_info', type: 'ods', assetType: 'Resource', sourceType: 'business', sourceSystem: '用户中心', dbType: 'pg',
    category: 'ODS', domain: '用户域', updateFrequency: '实时', owner: '王运营',
    description: '用户中心用户信息表，存储用户注册基本信息。来源：用户中心(PostgreSQL)。',
    recordCount: 2100000, storageSize: '3.5GB', partitionKeys: [], indexKeys: ['user_id', 'mobile'],
    createdTime: '2024-01-01T00:00:00Z', lastModified: '2025-01-27T11:20:00Z',
    tags: ['用户', '信息', '业务源表', 'PostgreSQL'], qualityScore: 96,
    fields: [
      { name: 'user_id', type: 'string', description: '用户ID', qualityLevel: DataQualityLevel.HIGH, businessImportance: BusinessImportance.CRITICAL, sensitivity: DataSensitivity.INTERNAL, constraints: { nullable: false, unique: true, primaryKey: true }, tags: ['主键'], lastUpdated: '2025-01-27T11:20:00Z' },
      { name: 'mobile', type: 'string', description: '手机号', qualityLevel: DataQualityLevel.HIGH, businessImportance: BusinessImportance.CRITICAL, sensitivity: DataSensitivity.CONFIDENTIAL, constraints: { nullable: false, unique: true, primaryKey: false }, tags: ['联系方式', '敏感'], lastUpdated: '2025-01-27T11:20:00Z' },
      { name: 'nickname', type: 'string', description: '昵称', qualityLevel: DataQualityLevel.MEDIUM, businessImportance: BusinessImportance.NORMAL, sensitivity: DataSensitivity.INTERNAL, constraints: { nullable: true, unique: false, primaryKey: false }, tags: ['昵称'], lastUpdated: '2025-01-27T11:20:00Z' },
      { name: 'register_time', type: 'timestamp', description: '注册时间', qualityLevel: DataQualityLevel.HIGH, businessImportance: BusinessImportance.IMPORTANT, sensitivity: DataSensitivity.INTERNAL, constraints: { nullable: false, unique: false, primaryKey: false }, tags: ['时间'], lastUpdated: '2025-01-27T11:20:00Z' }
    ]
  },
  {
    name: 'ods_user_login_log', type: 'ods', assetType: 'Resource', sourceType: 'business', sourceSystem: '用户中心', dbType: 'pg',
    category: 'ODS', domain: '用户域', updateFrequency: '实时', owner: '王运营',
    description: '用户中心登录日志表，记录用户每次登录的行为数据。来源：用户中心(PostgreSQL)。',
    recordCount: 45000000, storageSize: '18GB', partitionKeys: ['login_date'], indexKeys: ['log_id', 'user_id'],
    createdTime: '2024-01-01T00:00:00Z', lastModified: '2025-01-27T11:20:00Z',
    tags: ['用户', '登录', '日志', '业务源表', 'PostgreSQL'], qualityScore: 85,
    fields: [
      { name: 'log_id', type: 'string', description: '日志ID', qualityLevel: DataQualityLevel.HIGH, businessImportance: BusinessImportance.CRITICAL, sensitivity: DataSensitivity.INTERNAL, constraints: { nullable: false, unique: true, primaryKey: true }, tags: ['主键'], lastUpdated: '2025-01-27T11:20:00Z' },
      { name: 'user_id', type: 'string', description: '用户ID', qualityLevel: DataQualityLevel.HIGH, businessImportance: BusinessImportance.CRITICAL, sensitivity: DataSensitivity.INTERNAL, constraints: { nullable: false, unique: false, primaryKey: false }, tags: ['用户标识'], lastUpdated: '2025-01-27T11:20:00Z' },
      { name: 'login_time', type: 'timestamp', description: '登录时间', qualityLevel: DataQualityLevel.HIGH, businessImportance: BusinessImportance.IMPORTANT, sensitivity: DataSensitivity.INTERNAL, constraints: { nullable: false, unique: false, primaryKey: false }, tags: ['时间'], lastUpdated: '2025-01-27T11:20:00Z' },
      { name: 'ip_address', type: 'string', description: '登录IP', qualityLevel: DataQualityLevel.MEDIUM, businessImportance: BusinessImportance.IMPORTANT, sensitivity: DataSensitivity.CONFIDENTIAL, constraints: { nullable: true, unique: false, primaryKey: false }, tags: ['IP', '风控因子'], lastUpdated: '2025-01-27T11:20:00Z' }
    ]
  },
  {
    name: 'ods_mkt_campaign', type: 'ods', assetType: 'Resource', sourceType: 'business', sourceSystem: '营销活动平台', dbType: 'hive',
    category: 'ODS', domain: '营销域', updateFrequency: '日更新', owner: '陈营销',
    description: '营销活动平台活动表，记录营销活动的配置和执行信息。来源：营销活动平台(Hive)。',
    recordCount: 8500, storageSize: '500MB', partitionKeys: ['campaign_date'], indexKeys: ['campaign_id'],
    createdTime: '2024-01-01T00:00:00Z', lastModified: '2025-01-27T08:45:00Z',
    tags: ['营销', '活动', '业务源表', 'Hive'], qualityScore: 87,
    fields: [
      { name: 'campaign_id', type: 'string', description: '活动ID', qualityLevel: DataQualityLevel.HIGH, businessImportance: BusinessImportance.CRITICAL, sensitivity: DataSensitivity.INTERNAL, constraints: { nullable: false, unique: true, primaryKey: true }, tags: ['主键'], lastUpdated: '2025-01-27T08:45:00Z' },
      { name: 'campaign_name', type: 'string', description: '活动名称', qualityLevel: DataQualityLevel.HIGH, businessImportance: BusinessImportance.IMPORTANT, sensitivity: DataSensitivity.INTERNAL, constraints: { nullable: false, unique: false, primaryKey: false }, tags: ['名称'], lastUpdated: '2025-01-27T08:45:00Z' },
      { name: 'start_time', type: 'timestamp', description: '开始时间', qualityLevel: DataQualityLevel.HIGH, businessImportance: BusinessImportance.IMPORTANT, sensitivity: DataSensitivity.INTERNAL, constraints: { nullable: false, unique: false, primaryKey: false }, tags: ['时间'], lastUpdated: '2025-01-27T08:45:00Z' },
      { name: 'end_time', type: 'timestamp', description: '结束时间', qualityLevel: DataQualityLevel.HIGH, businessImportance: BusinessImportance.IMPORTANT, sensitivity: DataSensitivity.INTERNAL, constraints: { nullable: false, unique: false, primaryKey: false }, tags: ['时间'], lastUpdated: '2025-01-27T08:45:00Z' }
    ]
  },
  {
    name: 'ods_mkt_coupon', type: 'ods', assetType: 'Resource', sourceType: 'business', sourceSystem: '营销活动平台', dbType: 'hive',
    category: 'ODS', domain: '营销域', updateFrequency: '日更新', owner: '陈营销',
    description: '营销活动平台优惠券表，记录优惠券发放和使用信息。来源：营销活动平台(Hive)。',
    recordCount: 3200000, storageSize: '4GB', partitionKeys: ['issue_date'], indexKeys: ['coupon_id', 'user_id'],
    createdTime: '2024-01-01T00:00:00Z', lastModified: '2025-01-27T08:45:00Z',
    tags: ['营销', '优惠券', '业务源表', 'Hive'], qualityScore: 89,
    fields: [
      { name: 'coupon_id', type: 'string', description: '优惠券ID', qualityLevel: DataQualityLevel.HIGH, businessImportance: BusinessImportance.CRITICAL, sensitivity: DataSensitivity.INTERNAL, constraints: { nullable: false, unique: true, primaryKey: true }, tags: ['主键'], lastUpdated: '2025-01-27T08:45:00Z' },
      { name: 'user_id', type: 'string', description: '用户ID', qualityLevel: DataQualityLevel.HIGH, businessImportance: BusinessImportance.CRITICAL, sensitivity: DataSensitivity.INTERNAL, constraints: { nullable: false, unique: false, primaryKey: false }, tags: ['用户标识'], lastUpdated: '2025-01-27T08:45:00Z' },
      { name: 'coupon_value', type: 'decimal', description: '优惠券面值', qualityLevel: DataQualityLevel.HIGH, businessImportance: BusinessImportance.IMPORTANT, sensitivity: DataSensitivity.INTERNAL, constraints: { nullable: false, unique: false, primaryKey: false }, tags: ['金额'], lastUpdated: '2025-01-27T08:45:00Z' },
      { name: 'use_status', type: 'string', description: '使用状态', qualityLevel: DataQualityLevel.HIGH, businessImportance: BusinessImportance.IMPORTANT, sensitivity: DataSensitivity.INTERNAL, constraints: { nullable: false, unique: false, primaryKey: false }, tags: ['状态'], lastUpdated: '2025-01-27T08:45:00Z' }
    ]
  },
  {
    name: 'ods_fin_voucher', type: 'ods', assetType: 'Resource', sourceType: 'business', sourceSystem: '财务核算系统', dbType: 'oracle',
    category: 'ODS', domain: '财务域', updateFrequency: '日更新', owner: '吴财务',
    description: '财务核算系统凭证表，记录会计凭证信息。来源：财务核算系统(Oracle)。',
    recordCount: 1850000, storageSize: '6GB', partitionKeys: ['voucher_date'], indexKeys: ['voucher_id'],
    createdTime: '2024-01-01T00:00:00Z', lastModified: '2025-01-26T17:30:00Z',
    tags: ['财务', '凭证', '业务源表', 'Oracle'], qualityScore: 94,
    fields: [
      { name: 'voucher_id', type: 'string', description: '凭证ID', qualityLevel: DataQualityLevel.HIGH, businessImportance: BusinessImportance.CRITICAL, sensitivity: DataSensitivity.INTERNAL, constraints: { nullable: false, unique: true, primaryKey: true }, tags: ['主键'], lastUpdated: '2025-01-26T17:30:00Z' },
      { name: 'voucher_no', type: 'string', description: '凭证编号', qualityLevel: DataQualityLevel.HIGH, businessImportance: BusinessImportance.IMPORTANT, sensitivity: DataSensitivity.INTERNAL, constraints: { nullable: false, unique: true, primaryKey: false }, tags: ['编号'], lastUpdated: '2025-01-26T17:30:00Z' },
      { name: 'amount', type: 'decimal', description: '金额', qualityLevel: DataQualityLevel.HIGH, businessImportance: BusinessImportance.CRITICAL, sensitivity: DataSensitivity.CONFIDENTIAL, constraints: { nullable: false, unique: false, primaryKey: false }, tags: ['金额'], lastUpdated: '2025-01-26T17:30:00Z' },
      { name: 'voucher_date', type: 'date', description: '凭证日期', qualityLevel: DataQualityLevel.HIGH, businessImportance: BusinessImportance.IMPORTANT, sensitivity: DataSensitivity.INTERNAL, constraints: { nullable: false, unique: false, primaryKey: false }, tags: ['日期'], lastUpdated: '2025-01-26T17:30:00Z' }
    ]
  },
  {
    name: 'ods_fin_accounting', type: 'ods', assetType: 'Resource', sourceType: 'business', sourceSystem: '财务核算系统', dbType: 'oracle',
    category: 'ODS', domain: '财务域', updateFrequency: '月更新', owner: '吴财务',
    description: '财务核算系统会计科目表，存储科目体系配置。来源：财务核算系统(Oracle)。',
    recordCount: 3200, storageSize: '20MB', partitionKeys: [], indexKeys: ['subject_code'],
    createdTime: '2024-01-01T00:00:00Z', lastModified: '2025-01-26T17:30:00Z',
    tags: ['财务', '会计', '科目', '业务源表', 'Oracle'], qualityScore: 97,
    fields: [
      { name: 'subject_code', type: 'string', description: '科目编码', qualityLevel: DataQualityLevel.HIGH, businessImportance: BusinessImportance.CRITICAL, sensitivity: DataSensitivity.INTERNAL, constraints: { nullable: false, unique: true, primaryKey: true }, tags: ['主键', '编码'], lastUpdated: '2025-01-26T17:30:00Z' },
      { name: 'subject_name', type: 'string', description: '科目名称', qualityLevel: DataQualityLevel.HIGH, businessImportance: BusinessImportance.IMPORTANT, sensitivity: DataSensitivity.INTERNAL, constraints: { nullable: false, unique: false, primaryKey: false }, tags: ['名称'], lastUpdated: '2025-01-26T17:30:00Z' },
      { name: 'parent_code', type: 'string', description: '上级科目编码', qualityLevel: DataQualityLevel.MEDIUM, businessImportance: BusinessImportance.IMPORTANT, sensitivity: DataSensitivity.INTERNAL, constraints: { nullable: true, unique: false, primaryKey: false }, tags: ['层级'], lastUpdated: '2025-01-26T17:30:00Z' }
    ]
  },
  {
    name: 'ods_olap_event_log', type: 'ods', assetType: 'Resource', sourceType: 'business', sourceSystem: '数据分析平台', dbType: 'clickhouse',
    category: 'ODS', domain: '营销域', updateFrequency: '实时', owner: '王运营',
    description: '数据分析平台事件日志表，记录用户行为埋点事件。来源：数据分析平台(ClickHouse)。',
    recordCount: 88000000, storageSize: '45GB', partitionKeys: ['event_date'], indexKeys: ['event_id', 'user_id'],
    createdTime: '2024-01-01T00:00:00Z', lastModified: '2025-01-27T14:15:00Z',
    tags: ['行为', '事件', '日志', '业务源表', 'ClickHouse'], qualityScore: 82,
    fields: [
      { name: 'event_id', type: 'string', description: '事件ID', qualityLevel: DataQualityLevel.HIGH, businessImportance: BusinessImportance.CRITICAL, sensitivity: DataSensitivity.INTERNAL, constraints: { nullable: false, unique: true, primaryKey: true }, tags: ['主键'], lastUpdated: '2025-01-27T14:15:00Z' },
      { name: 'user_id', type: 'string', description: '用户ID', qualityLevel: DataQualityLevel.HIGH, businessImportance: BusinessImportance.CRITICAL, sensitivity: DataSensitivity.INTERNAL, constraints: { nullable: false, unique: false, primaryKey: false }, tags: ['用户标识'], lastUpdated: '2025-01-27T14:15:00Z' },
      { name: 'event_name', type: 'string', description: '事件名称', qualityLevel: DataQualityLevel.HIGH, businessImportance: BusinessImportance.IMPORTANT, sensitivity: DataSensitivity.INTERNAL, constraints: { nullable: false, unique: false, primaryKey: false }, tags: ['事件'], lastUpdated: '2025-01-27T14:15:00Z' },
      { name: 'event_time', type: 'timestamp', description: '事件时间', qualityLevel: DataQualityLevel.HIGH, businessImportance: BusinessImportance.IMPORTANT, sensitivity: DataSensitivity.INTERNAL, constraints: { nullable: false, unique: false, primaryKey: false }, tags: ['时间'], lastUpdated: '2025-01-27T14:15:00Z' }
    ]
  },
  {
    name: 'ods_olap_user_behavior', type: 'ods', assetType: 'Resource', sourceType: 'business', sourceSystem: '数据分析平台', dbType: 'clickhouse',
    category: 'ODS', domain: '用户域', updateFrequency: '日更新', owner: '王运营',
    description: '数据分析平台用户行为汇总表，按用户维度聚合行为数据。来源：数据分析平台(ClickHouse)。',
    recordCount: 2100000, storageSize: '3.2GB', partitionKeys: ['stat_date'], indexKeys: ['user_id'],
    createdTime: '2024-01-01T00:00:00Z', lastModified: '2025-01-27T14:15:00Z',
    tags: ['用户', '行为', '业务源表', 'ClickHouse'], qualityScore: 86,
    fields: [
      { name: 'user_id', type: 'string', description: '用户ID', qualityLevel: DataQualityLevel.HIGH, businessImportance: BusinessImportance.CRITICAL, sensitivity: DataSensitivity.INTERNAL, constraints: { nullable: false, unique: true, primaryKey: true }, tags: ['主键'], lastUpdated: '2025-01-27T14:15:00Z' },
      { name: 'active_days', type: 'int', description: '活跃天数', qualityLevel: DataQualityLevel.MEDIUM, businessImportance: BusinessImportance.IMPORTANT, sensitivity: DataSensitivity.INTERNAL, constraints: { nullable: false, unique: false, primaryKey: false }, tags: ['活跃度'], lastUpdated: '2025-01-27T14:15:00Z' },
      { name: 'page_views', type: 'int', description: '页面浏览数', qualityLevel: DataQualityLevel.MEDIUM, businessImportance: BusinessImportance.NORMAL, sensitivity: DataSensitivity.INTERNAL, constraints: { nullable: false, unique: false, primaryKey: false }, tags: ['浏览'], lastUpdated: '2025-01-27T14:15:00Z' }
    ]
  }
];

// 统一的元数据 Store 供增删改查
export const MetadataStore = {
  getTables() {
    // hive 表补充 sourceType 标记，合并业务系统源表
    const hiveTables = mockTables.map(t => ({ ...t, sourceType: 'hive' as const }));
    return [...hiveTables, ...businessSourceTables];
  },

  getTableByName(name: string) {
    return this.getTables().find(t => t.name === name);
  },

  addTable(table: TableItem) {
    mockTables.push(table);
    return table;
  },

  updateTable(name: string, data: Partial<TableItem>) {
    const index = mockTables.findIndex(t => t.name === name);
    if (index > -1) {
      mockTables[index] = { ...mockTables[index], ...data };
      return mockTables[index];
    }
    return null;
  },

  deleteTable(name: string) {
    const index = mockTables.findIndex(t => t.name === name);
    if (index > -1) {
      mockTables.splice(index, 1);
      return true;
    }
    return false;
  }
};
