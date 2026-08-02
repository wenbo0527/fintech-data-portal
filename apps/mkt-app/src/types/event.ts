// 事件中心核心类型定义

export interface EventData {
  id: string;
  eventName: string;
  eventType: '系统事件' | '业务事件' | '用户事件' | '营销事件' | '风控事件';
  eventSource: '核心事件' | 'APP埋点事件';
  acquireMethod: '采样' | '上传';
  triggerCondition: string;
  status: '草稿' | '上线' | '下线';
  createTime: string;
  updateTime: string;
  updatedBy?: string;
  owner: string;
  description: string;
  registryKey: string;
}

export interface VirtualEventData {
  id: string;
  eventName: string;
  eventId: string;
  scenario: string[];
  status: '已上线' | '已下线' | '草稿';
  updater: string;
  updateTime: string;
  createTime: string;
  description: string;
  realEventId: string | null;
  // 是否组合事件（OR/AND of multiple events）
  combineType?: 'OR' | 'AND';
  combineEvents?: Array<{ id: string; name: string }>;
  version: number;
  versions: VirtualEventVersion[];
  expireAt?: string;
  archived?: boolean;
  outputFields?: OutputField[];
  permissions?: string[];
  // rebase 解冲突（auto-merge 语义重复）：此处 main 侧的
  // combineType/combineEvents(string[]) 与上方分支侧同名成员重复，已删除 main 侧这一组。
  // 依据：mock/event.ts 的 createCombineVirtualEvent 实际产出为 combineEvents: params.events
  // （Array<{id,name}>），main 的 string[] 与 main 自身 mock 实现矛盾（既存类型缺陷）；
  // 该字段无页面消费点（virtual-event-combine.vue 的 form.combineEvents 是页面本地表单，
  // 为事件 id 数组，与 VirtualEventData.combineEvents 无关），故改为与 runtime 真值一致。
}

export interface OutputField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date';
  mapping: string;
}

export interface VirtualEventVersion {
  version: number;
  updatedAt: string;
  updater: string;
  description?: string;
}

export interface ConditionGroup {
  id: number;
  conditions: Condition[];
}

export interface Condition {
  field: string;
  operator: string;
  value: string;
  logic: '等于' | '不等于' | '包含';
}

export interface SampleStats {
  eventId: string;
  eventName: string;
  totalMessages: number;
  totalSize: number; // 总消息大小（字节）
  avgMessageSize: number; // 平均消息大小
  messageTypes: MessageTypeStats[]; // 消息类型分布
  hourlyDistribution: HourlyMessageDistribution[];
  dailyDistribution: DailyMessageDistribution[];
  messageDetails: MessageDetail[]; // 消息详情列表
  messageTrends: MessageTrend[]; // 消息趋势
  contentAnalysis: ContentAnalysis; // 内容分析
}

export interface HourlyStat {
  hour: string;
  clicks: number;
  conversions: number;
  errors: number;
}

export interface DailyStat {
  date: string;
  clicks: number;
  conversions: number;
  errors: number;
}

export interface WeeklyStat {
  week: string;
  clicks: number;
  conversions: number;
  errors: number;
}

export interface UserPathNode {
  nodeId: string;
  nodeName: string;
  visits: number;
  conversions: number;
  dropoffs: number;
  nextNodes: string[];
}

export interface Anomaly {
  id: string;
  type: 'spike' | 'drop' | 'pattern';
  severity: 'low' | 'medium' | 'high';
  description: string;
  detectedAt: string;
  value: number;
  threshold: number;
}

// 分时段事件分布统计
export interface HourlyDistribution {
  hour: string; // 格式: "HH:00"
  triggers: number;
  uniqueUsers: number;
  avgResponseTime: number;
  errors: number;
}

export interface DailyDistribution {
  date: string; // 格式: "YYYY-MM-DD"
  triggers: number;
  uniqueUsers: number;
  avgResponseTime: number;
  errors: number;
}

// 用户事件详情
export interface UserEventDetail {
  id: string;
  userId: string;
  eventTime: string;
  eventData: Record<string, any>;
  responseTime: number;
  status: 'success' | 'error' | 'timeout';
  errorMessage?: string;
  userAgent: string;
  ipAddress: string;
  deviceInfo: DeviceInfo;
  location?: LocationInfo;
}

export interface DeviceInfo {
  deviceType: 'mobile' | 'desktop' | 'tablet';
  os: string;
  browser: string;
  screenResolution: string;
}

export interface LocationInfo {
  country: string;
  region: string;
  city: string;
  latitude: number;
  longitude: number;
}

// 事件趋势分析
export interface EventTrend {
  timestamp: string;
  triggerCount: number;
  uniqueUsers: number;
  movingAverage: number;
  trend: 'up' | 'down' | 'stable';
  changeRate: number;
}

// 事件异常检测
export interface EventAnomaly {
  id: string;
  type: 'spike' | 'drop' | 'pattern' | 'response_time';
  severity: 'low' | 'medium' | 'high';
  description: string;
  detectedAt: string;
  value: number;
  threshold: number;
  affectedUsers: number;
}

// 活跃用户排行
export interface TopUser {
  userId: string;
  triggerCount: number;
  lastTriggerTime: string;
  avgResponseTime: number;
  errorCount: number;
}

// 消息类型统计
export interface MessageTypeStats {
  type: string;
  count: number;
  percentage: number;
  avgSize: number;
}

// 分时段消息分布（按小时）
export interface HourlyMessageDistribution {
  hour: string; // 格式: "HH:00"
  messageCount: number;
  totalSize: number;
  avgSize: number;
}

// 分时段消息分布（按天）
export interface DailyMessageDistribution {
  date: string; // 格式: "YYYY-MM-DD"
  messageCount: number;
  totalSize: number;
  avgSize: number;
}

// 消息详情
export interface MessageDetail {
  id: string;
  timestamp: string;
  messageType: string;
  size: number; // 消息大小（字节）
  content: Record<string, any>; // 消息内容
  properties?: MessageProperty[]; // 消息属性（可选）
  format: 'json' | 'xml' | 'text' | 'binary'; // 消息格式
  // 该消息触发的虚拟事件（VIRT***）。真实事件来源的消息也可能由虚拟事件触发
  triggeredVirtualEvent?: {
    id: string;     // VIRT***
    name: string;   // 触发事件名称（用于表格显示）
  } | null;
}

// 消息属性
export interface MessageProperty {
  key: string;
  value: string | number | boolean;
  type: 'string' | 'number' | 'boolean' | 'object';
}

// 消息趋势
export interface MessageTrend {
  timestamp: string;
  messageCount: number;
  totalSize: number;
  avgSize: number;
  trend: 'up' | 'down' | 'stable';
  changeRate: number;
}

// 内容分析
export interface ContentAnalysis {
  topFields: FieldAnalysis[]; // 最常出现的字段
  fieldTypes: Record<string, number>; // 字段类型分布
  contentPatterns: ContentPattern[]; // 内容模式
  sizeDistribution: SizeDistribution[]; // 大小分布
}

// 字段分析
export interface FieldAnalysis {
  fieldName: string;
  occurrence: number; // 出现次数
  coverage: number; // 覆盖率（%）
  valueExamples: (string | number | boolean)[]; // 示例值
}

// 内容模式
export interface ContentPattern {
  pattern: string;
  count: number;
  percentage: number;
  description: string;
}

// 大小分布
export interface SizeDistribution {
  range: string; // 如: "0-1KB", "1-10KB"等
  count: number;
  percentage: number;
}

export interface KafkaTopic {
  name: string;
  partitions: number;
  replicationFactor: number;
  consumerGroups: ConsumerGroup[];
}

export interface ConsumerGroup {
  groupId: string;
  lag: number;
  members: number;
  state: 'Stable' | 'PreparingRebalance' | 'CompletingRebalance' | 'Empty' | 'Dead';
}

export interface KafkaDatasource {
  id: string;
  name: string;
  bootstrapServers: string;
  securityProtocol: 'PLAINTEXT' | 'SSL' | 'SASL_PLAINTEXT' | 'SASL_SSL';
  saslMechanism?: 'PLAIN' | 'SCRAM-SHA-256' | 'SCRAM-SHA-512';
  username?: string;
  password?: string;
  status: 'connected' | 'disconnected' | 'error';
  topics: KafkaTopic[];
  createdAt: string;
  updatedAt: string;
}
