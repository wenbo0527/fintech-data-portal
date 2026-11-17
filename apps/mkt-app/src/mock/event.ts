/**
 * Event Center Mock Service（mockjs 动态生成）
 * 用途：事件中心全部 mock（事件/虚拟事件/示例统计/Kafka/条件/趋势/异常/用户路径）
 * 来源：customer/event-center 7 个页面使用
 * 消费方：@/pages/customer/event-center/* (7 vue)
 * 边界：纯前端 demo；使用 mockjs 实时生成；返回 mockEventAPI 对象
 */
import Mock from 'mockjs';
import type { 
  EventData, 
  VirtualEventData, 
  SampleStats, 
  KafkaDatasource,
  ConditionGroup,
  Condition,
  HourlyStat,
  DailyStat,
  WeeklyStat,
  UserPathNode,
  Anomaly,
  HourlyDistribution,
  DailyDistribution,
  UserEventDetail,
  EventTrend,
  EventAnomaly,
  TopUser,
  MessageDetail,
  MessageProperty,
  MessageTrend,
  MessageTypeStats,
  ContentAnalysis
} from '@/types/event';

// 定义KafkaTopic和ConsumerGroup类型
interface KafkaTopic {
  name: string;
  partitions: number;
  replicationFactor: number;
  consumerGroups: ConsumerGroup[];
}

interface ConsumerGroup {
  groupId: string;
  lag: number;
  members: number;
  state: 'Stable' | 'PreparingRebalance' | 'CompletingRebalance' | 'Empty' | 'Dead';
}

// 生成事件数据
export const generateEventData = (count: number): EventData[] => {
  const eventTypes = ['系统事件', '业务事件', '用户事件', '营销事件', '风控事件'];
  const eventSources = ['核心事件', 'APP埋点事件'];
  const acquireMethods = ['采样', '上传'];
  const statusOptions = ['草稿', '上线', '下线'];
  const owners = ['张三', '李四', '王五', '赵六', '系统管理员'];
  
  return Array.from({ length: count }, (_, i) => ({
    id: `EVT${Mock.Random.string('number', 6)}`,
    eventName: `${Mock.Random.pick(eventTypes)}${Mock.Random.ctitle(3, 8)}`,
    eventType: Mock.Random.pick(eventTypes) as EventData['eventType'],
    eventSource: Mock.Random.pick(eventSources) as EventData['eventSource'],
    acquireMethod: Mock.Random.pick(acquireMethods) as any,
    triggerCondition: Mock.Random.sentence(5, 10),
    status: Mock.Random.pick(statusOptions) as EventData['status'],
    createTime: Mock.Random.datetime('yyyy-MM-dd HH:mm:ss'),
    updateTime: Mock.Random.datetime('yyyy-MM-dd HH:mm:ss'),
    updatedBy: Mock.Random.pick(owners),
    owner: Mock.Random.pick(owners),
    description: Mock.Random.sentence(10, 20),
    registryKey: Mock.Random.pick(['user_id', 'order_id', 'transaction_id', 'event_id', 'session_id'])
  }));
};

// 生成虚拟事件数据
export const generateVirtualEventData = (count: number, realEvents: EventData[]): VirtualEventData[] => {
  const scenarioPool = ['营销通知', '电销出池'];
  const statuses = ['已上线', '已下线'];
  const updaters = ['张三', '李四', '王五', '赵六'];
  
  // 辅助生成输出字段
  const generateOutputFields = () => {
    const fields = ['user_id', 'order_id', 'amount', 'timestamp', 'status'];
    const types = ['string', 'number', 'boolean', 'date'];
    
    return Array.from({ length: Mock.Random.integer(1, 3) }, () => ({
      name: Mock.Random.pick(fields),
      type: Mock.Random.pick(types) as any,
      mapping: Mock.Random.word(5)
    }));
  };

  // 辅助生成权限
  const generatePermissions = () => {
    const perms = ['read', 'write', 'delete', 'export'];
    return Mock.Random.shuffle(perms).slice(0, Mock.Random.integer(1, 4));
  };

  return Array.from({ length: count }, (_, i) => {
    const realEvent = realEvents[Mock.Random.integer(0, realEvents.length - 1)];
    if (!realEvent) {
      return {
        id: `VIRT${Mock.Random.string('number', 6)}`,
        eventName: `虚拟${Mock.Random.ctitle(3, 6)}`,
        eventId: '',
        scenario: Mock.Random.shuffle(scenarioPool).slice(0, Mock.Random.integer(1, scenarioPool.length)),
        status: Mock.Random.pick(statuses) as VirtualEventData['status'],
        updater: Mock.Random.pick(updaters),
        updateTime: Mock.Random.datetime('yyyy-MM-dd HH:mm:ss'),
        createTime: Mock.Random.datetime('yyyy-MM-dd HH:mm:ss'),
        description: Mock.Random.sentence(10, 20),
        realEventId: null,
        version: 1,
        versions: [{ version: 1, updatedAt: Mock.Random.datetime('yyyy-MM-dd HH:mm:ss'), updater: Mock.Random.pick(updaters), description: '初始版本' }],
        expireAt: Mock.Random.datetime('yyyy-MM-dd HH:mm:ss'),
        outputFields: generateOutputFields(),
        permissions: generatePermissions()
      };
    }
    return {
      id: `VIRT${Mock.Random.string('number', 6)}`,
      eventName: `虚拟${Mock.Random.ctitle(3, 6)}`,
      eventId: realEvent.id,
      scenario: Mock.Random.shuffle(scenarioPool).slice(0, Mock.Random.integer(1, scenarioPool.length)),
      status: Mock.Random.pick(statuses) as VirtualEventData['status'],
      updater: Mock.Random.pick(updaters),
      updateTime: Mock.Random.datetime('yyyy-MM-dd HH:mm:ss'),
      createTime: Mock.Random.datetime('yyyy-MM-dd HH:mm:ss'),
      description: Mock.Random.sentence(10, 20),
      realEventId: realEvent.id,
      version: 1,
      versions: [{ version: 1, updatedAt: Mock.Random.datetime('yyyy-MM-dd HH:mm:ss'), updater: Mock.Random.pick(updaters), description: '初始版本' }],
      expireAt: Mock.Random.datetime('yyyy-MM-dd HH:mm:ss'),
      outputFields: generateOutputFields(),
      permissions: generatePermissions()
    };
  });
};

// 生成条件组
const generateConditionGroups = (count: number): ConditionGroup[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    conditions: generateConditions(Mock.Random.integer(1, 4))
  }));
};

// 生成条件
const generateConditions = (count: number): Condition[] => {
  const fields = ['user_id', 'event_type', 'source_ip', 'device_type', 'location'];
  const operators = ['等于', '不等于', '包含'];
  
  return Array.from({ length: count }, (_, i) => ({
    field: Mock.Random.pick(fields),
    operator: Mock.Random.pick(operators) as Condition['logic'],
    value: Mock.Random.word(3, 8),
    logic: Mock.Random.pick(operators) as Condition['logic']
  }));
};

// 生成样本统计数据（事件消息分析）
export const generateSampleStats = (eventId: string): SampleStats => {
  // 生成事件名称
  const eventNames = ['订单创建', '库存更新', '支付通知', '物流状态', '用户行为'];
  const eventName = Mock.Random.pick(eventNames);
  
  // 生成消息详情数据
  const messageDetails = generateMessageDetails(eventId);
  
  // 生成分时段消息分布（按小时）
  const hourlyDistribution = Array.from({ length: 24 }, (_, i) => ({
    hour: `${i.toString().padStart(2, '0')}:00`,
    messageCount: Mock.Random.integer(100, 1000),
    totalSize: Mock.Random.integer(10240, 102400), // 10KB-100KB
    avgSize: Mock.Random.integer(1024, 10240) // 1KB-10KB
  }));
  
  // 生成分时段消息分布（按天）
  const dailyDistribution = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    return {
      date: dateStr || '',
      messageCount: Mock.Random.integer(1000, 10000),
      totalSize: Mock.Random.integer(102400, 1048576), // 100KB-1MB
      avgSize: Mock.Random.integer(1024, 20480) // 1KB-20KB
    };
  }).reverse();
  
  // 生成消息趋势数据
  const messageTrends = generateMessageTrends();
  
  // 生成消息类型统计
  const messageTypes = generateMessageTypes();
  
  // 生成内容分析
  const contentAnalysis = generateContentAnalysis();
  
  // 计算汇总指标
  const totalMessages = messageDetails.length;
  const totalSize = messageDetails.reduce((sum: number, msg: MessageDetail) => sum + (msg.size || 0), 0);
  const avgMessageSize = totalMessages > 0 ? Math.round(totalSize / totalMessages) : 0;
  
  return {
    eventId,
    eventName,
    totalMessages,
    totalSize,
    avgMessageSize,
    messageTypes,
    hourlyDistribution,
    dailyDistribution,
    messageDetails: messageDetails.slice(0, 100), // 只返回前100条用于展示
    messageTrends,
    contentAnalysis
  };
};

// 生成用户路径数据
const generateUserPath = (): UserPathNode[] => {
  const nodeNames = ['首页访问', '商品浏览', '加入购物车', '结算页面', '支付完成'];
  return nodeNames.map((name, i) => ({
    nodeId: `node_${i + 1}`,
    nodeName: name,
    visits: Mock.Random.integer(1000, 10000),
    conversions: Mock.Random.integer(100, 1000),
    dropoffs: Mock.Random.integer(50, 500),
    nextNodes: i < nodeNames.length - 1 ? [`node_${i + 2}`] : []
  }));
};

// 生成异常数据
const generateAnomalies = (): Anomaly[] => {
  const types: ('spike' | 'drop' | 'pattern')[] = ['spike', 'drop', 'pattern'];
  const severities: ('low' | 'medium' | 'high')[] = ['low', 'medium', 'high'];
  
  return Array.from({ length: Mock.Random.integer(1, 5) }, (_, i) => ({
    id: `anomaly_${i + 1}`,
    type: Mock.Random.pick(types),
    severity: Mock.Random.pick(severities),
    description: Mock.Random.sentence(5, 10),
    detectedAt: Mock.Random.datetime('yyyy-MM-dd HH:mm:ss'),
    value: Mock.Random.float(10, 100),
    threshold: Mock.Random.float(5, 50)
  }));
};

// 生成用户事件详情数据
const generateUserEventDetails = (eventId: string): UserEventDetail[] => {
  const deviceTypes: ('mobile' | 'desktop' | 'tablet')[] = ['mobile', 'desktop', 'tablet'];
  const statuses: ('success' | 'error' | 'timeout')[] = ['success', 'error', 'timeout'];
  const eventDataTemplates = [
    { product_id: 'P001', category: 'electronics', price: 999 },
    { page_url: '/product/detail', referrer: 'search', dwell_time: 120 },
    { button_id: 'add_to_cart', position: 'top_right', color: 'blue' },
    { form_id: 'registration', field_count: 8, completion_rate: 0.75 }
  ];
  
  return Array.from({ length: 500 }, (_, i) => {
    const status = Mock.Random.pick(statuses);
    const deviceType = Mock.Random.pick(deviceTypes);
    const eventData = Mock.Random.pick(eventDataTemplates);
    
    return {
      id: `evt_${eventId}_${Date.now()}_${i}`,
      userId: `user_${Mock.Random.integer(1000, 9999)}`,
      eventTime: new Date(Date.now() - Mock.Random.integer(0, 86400000)).toISOString(), // 最近24小时内
      eventData,
      responseTime: Mock.Random.integer(50, 2000),
      status,
      errorMessage: status === 'error' ? Mock.Random.pick(['网络超时', '参数错误', '服务器异常']) : undefined,
      userAgent: Mock.Random.pick([
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      ]),
      ipAddress: Mock.Random.ip(),
      deviceInfo: {
        deviceType,
        os: Mock.Random.pick(['Windows 10', 'iOS 14', 'Android 11', 'macOS 11']),
        browser: Mock.Random.pick(['Chrome', 'Safari', 'Firefox', 'Edge']),
        screenResolution: Mock.Random.pick(['1920x1080', '1366x768', '375x667', '414x896'])
      },
      location: {
        country: '中国',
        region: Mock.Random.pick(['北京', '上海', '广东', '浙江', '江苏']),
        city: Mock.Random.city(),
        latitude: Mock.Random.float(20, 50),
        longitude: Mock.Random.float(100, 140)
      }
    };
  });
};

// 生成事件趋势数据
const generateEventTrends = (): EventTrend[] => {
  const trends: EventTrend[] = [];
  let baseCount = 100;
  
  // 生成最近30天的趋势数据
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    // 模拟趋势变化
    const change = (Math.random() - 0.5) * 40;
    baseCount = Math.max(50, baseCount + change);
    const triggerCount = Math.round(baseCount);
    const uniqueUsers = Math.round(triggerCount * (0.6 + Math.random() * 0.3));
    
    // 计算移动平均
    const movingAverage = trends.length >= 6 
      ? Math.round(trends.slice(-6).reduce((sum: number, t: EventTrend) => sum + t.triggerCount, 0) / 6)
      : triggerCount;
    
    // 判断趋势
    const changeRate = trends.length > 0 
      ? ((triggerCount - trends[trends.length - 1]!.triggerCount) / trends[trends.length - 1]!.triggerCount) * 100
      : 0;
    
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (Math.abs(changeRate) > 10) {
      trend = changeRate > 0 ? 'up' : 'down';
    }
    
    trends.push({
      timestamp: date.toISOString(),
      triggerCount,
      uniqueUsers,
      movingAverage,
      trend,
      changeRate: Math.round(changeRate * 100) / 100
    });
  }
  
  return trends;
};

// 生成事件异常检测数据
const generateEventAnomalies = (): EventAnomaly[] => {
  const types: ('spike' | 'drop' | 'pattern' | 'response_time')[] = ['spike', 'drop', 'pattern', 'response_time'];
  const severities: ('low' | 'medium' | 'high')[] = ['low', 'medium', 'high'];
  
  return Array.from({ length: Mock.Random.integer(1, 5) }, (_, i) => {
    const type = Mock.Random.pick(types);
    const severity = Mock.Random.pick(severities);
    
    let description = '';
    switch (type) {
      case 'spike':
        description = '事件触发量异常激增，超出正常阈值';
        break;
      case 'drop':
        description = '事件触发量异常下降，低于预期值';
        break;
      case 'pattern':
        description = '事件触发模式异常，存在异常波动';
        break;
      case 'response_time':
        description = '事件响应时间异常，超出正常范围';
        break;
    }
    
    return {
      id: `anomaly_${Date.now()}_${i}`,
      type,
      severity,
      description,
      detectedAt: new Date(Date.now() - Mock.Random.integer(0, 86400000)).toISOString(),
      value: Mock.Random.float(100, 1000),
      threshold: Mock.Random.float(50, 500),
      affectedUsers: Mock.Random.integer(10, 100)
    };
  });
};

// 生成活跃用户排行数据
const generateTopUsers = (): TopUser[] => {
  return Array.from({ length: 10 }, (_, i) => ({
    userId: `user_${Mock.Random.string('upper', 6)}`,
    triggerCount: Mock.Random.integer(10, 100),
    lastTriggerTime: new Date(Date.now() - Mock.Random.integer(0, 86400000)).toISOString(),
    avgResponseTime: Mock.Random.integer(200, 800),
    errorCount: Mock.Random.integer(0, 10)
  })).sort((a, b) => b.triggerCount - a.triggerCount);
};

// 生成消息详情数据
const generateMessageDetails = (eventId: string): MessageDetail[] => {
  const messageTypes = ['订单消息', '库存消息', '通知消息', '状态消息', '数据同步'];
  const formats: ('json' | 'xml' | 'text' | 'binary')[] = ['json', 'xml', 'text', 'binary'];

  // 该事件可能由这些虚拟事件触发（mock 数据）
  const virtualEventPool = [
    { id: 'VIRT288188', name: '虚拟原始军' },
    { id: 'VIRT290012', name: '激活未复购' },
    { id: 'VIRT290088', name: '高价值预警' },
    { id: 'VIRT295001', name: '沉默用户唤醒' }
  ];

  return Array.from({ length: 200 }, (_, i) => {
    const messageType = Mock.Random.pick(messageTypes);
    const format = Mock.Random.pick(formats);
    const size = Mock.Random.integer(512, 51200); // 512B-50KB

    // 生成消息内容
    const content = generateMessageContent(messageType, format);

    // 模拟：70% 概率有虚拟事件触发（其中一半带名称）
    const triggeredVirtualEvent = Mock.Random.boolean()
      ? (() => {
          const ev = Mock.Random.pick(virtualEventPool);
          return { id: ev.id, name: Mock.Random.boolean() ? ev.name : '' };
        })()
      : null;

    return {
      id: `msg_${eventId}_${Date.now()}_${i}`,
      timestamp: new Date(Date.now() - Mock.Random.integer(0, 86400000)).toISOString(),
      messageType,
      size,
      content,
      format,
      triggeredVirtualEvent
    };
  });
};

// 生成消息内容
const generateMessageContent = (messageType: string, format: string): Record<string, any> => {
  if (format === 'json') {
    switch (messageType) {
      case '订单消息':
        return {
          orderId: Mock.Random.string('number', 10),
          userId: Mock.Random.string('number', 8),
          amount: Mock.Random.float(10, 1000, 2, 2),
          status: Mock.Random.pick(['pending', 'paid', 'shipped', 'completed']),
          items: Array.from({ length: Mock.Random.integer(1, 5) }, () => ({
            sku: Mock.Random.string('upper', 6),
            quantity: Mock.Random.integer(1, 10),
            price: Mock.Random.float(5, 200, 2, 2)
          }))
        };
      case '库存消息':
        return {
          sku: Mock.Random.string('upper', 6),
          warehouseId: Mock.Random.string('number', 4),
          quantity: Mock.Random.integer(-100, 100),
          currentStock: Mock.Random.integer(0, 1000),
          operation: Mock.Random.pick(['increase', 'decrease', 'set'])
        };
      case '通知消息':
        return {
          type: Mock.Random.pick(['email', 'sms', 'push']),
          recipient: Mock.Random.email(),
          subject: Mock.Random.sentence(5, 10),
          content: Mock.Random.paragraph(2, 5),
          priority: Mock.Random.pick(['low', 'medium', 'high'])
        };
      default:
        return {
          id: Mock.Random.string('number', 8),
          type: messageType,
          data: { field1: Mock.Random.word(), field2: Mock.Random.integer(1, 100), field3: Mock.Random.boolean() },
          timestamp: new Date().toISOString()
        };
    }
  }
  
  return { raw: Mock.Random.string('lower', 100, 500) };
};

// 生成消息属性
const generateMessageProperties = (content: Record<string, any>): MessageProperty[] => {
  const properties: MessageProperty[] = [];
  
  // 从内容中提取属性
  Object.entries(content).forEach(([key, value]) => {
    if (typeof value !== 'object') {
      properties.push({
        key,
        value,
        type: typeof value as 'string' | 'number' | 'boolean'
      });
    }
  });
  
  // 添加通用属性
  properties.push(
    {
      key: 'source',
      value: Mock.Random.pick(['api', 'webhook', 'scheduler', 'user']),
      type: 'string'
    },
    {
      key: 'priority',
      value: Mock.Random.pick([1, 2, 3]),
      type: 'number'
    },
    {
      key: 'encrypted',
      value: Mock.Random.boolean(),
      type: 'boolean'
    }
  );
  
  return properties.slice(0, 8); // 最多8个属性
};

// 生成消息趋势数据
const generateMessageTrends = (): MessageTrend[] => {
  const trends: MessageTrend[] = [];
  let prevCount = Mock.Random.integer(8000, 12000);
  let prevSize = Mock.Random.integer(800000, 1200000);
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    const currentCount = Mock.Random.integer(Math.floor(prevCount * 0.8), Math.floor(prevCount * 1.2));
    const currentSize = Mock.Random.integer(Math.floor(prevSize * 0.8), Math.floor(prevSize * 1.2));
    const avgSize = Math.round(currentSize / currentCount);
    
    const changeRate = prevCount > 0 
      ? ((currentCount - prevCount) / prevCount) * 100
      : 0;
    
    const trend: 'up' | 'down' | 'stable' = changeRate > 5 ? 'up' : changeRate < -5 ? 'down' : 'stable';
    
    trends.push({
      timestamp: date.toISOString(),
      messageCount: currentCount,
      totalSize: currentSize,
      avgSize,
      trend,
      changeRate
    });
    
    prevCount = currentCount;
    prevSize = currentSize;
  }
  
  return trends;
};

// 生成消息类型统计
const generateMessageTypes = (): MessageTypeStats[] => {
  const types = ['订单消息', '库存消息', '通知消息', '状态消息', '数据同步'];
  const totalCount = 50000;
  let remainingCount = totalCount;
  
  return types.map((type, index) => {
    const isLast = index === types.length - 1;
    const count = isLast 
      ? remainingCount 
      : Mock.Random.integer(remainingCount * 0.3, remainingCount * 0.7);
    
    remainingCount -= count;
    const percentage = Math.round((count / totalCount) * 100 * 10) / 10;
    const avgSize = Mock.Random.integer(1024, 10240);
    
    return {
      type,
      count,
      percentage,
      avgSize
    };
  }).sort((a, b) => b.count - a.count);
};

// 生成内容分析数据
const generateContentAnalysis = (): ContentAnalysis => {
  // 生成字段分析
  const topFields = [
    { fieldName: 'orderId', occurrence: 45000, coverage: 90 },
    { fieldName: 'userId', occurrence: 42000, coverage: 84 },
    { fieldName: 'timestamp', occurrence: 48000, coverage: 96 },
    { fieldName: 'status', occurrence: 35000, coverage: 70 },
    { fieldName: 'amount', occurrence: 28000, coverage: 56 }
  ].map(field => ({
    ...field,
    valueExamples: [
      Mock.Random.string('number', 8),
      Mock.Random.string('number', 10),
      Mock.Random.float(10, 1000, 2, 2)
    ]
  }));
  
  // 字段类型分布
  const fieldTypes = {
    string: 45000,
    number: 32000,
    boolean: 18000,
    object: 5000
  };
  
  // 内容模式
  const contentPatterns = [
    {
      pattern: '订单相关',
      count: 25000,
      percentage: 50,
      description: '包含订单ID、金额、状态等字段'
    },
    {
      pattern: '用户相关',
      count: 15000,
      percentage: 30,
      description: '包含用户ID、行为类型等字段'
    },
    {
      pattern: '系统通知',
      count: 10000,
      percentage: 20,
      description: '系统状态变更通知'
    }
  ];
  
  // 大小分布
  const sizeDistribution = [
    { range: '0-1KB', count: 15000, percentage: 30 },
    { range: '1-5KB', count: 20000, percentage: 40 },
    { range: '5-10KB', count: 10000, percentage: 20 },
    { range: '10KB+', count: 5000, percentage: 10 }
  ];
  
  return {
    topFields,
    fieldTypes,
    contentPatterns,
    sizeDistribution
  };
};

// 生成Kafka数据源
export const generateKafkaDatasources = (count: number): KafkaDatasource[] => {
  const protocols: ('PLAINTEXT' | 'SSL' | 'SASL_PLAINTEXT' | 'SASL_SSL')[] = ['PLAINTEXT', 'SSL', 'SASL_PLAINTEXT', 'SASL_SSL'];
  const statuses: ('connected' | 'disconnected' | 'error')[] = ['connected', 'disconnected', 'error'];
  
  return Array.from({ length: count }, (_, i) => ({
    id: `KAFKA${Mock.Random.string('number', 4)}`,
    name: `Kafka集群${i + 1}`,
    bootstrapServers: `kafka-${i + 1}.example.com:9092`,
    securityProtocol: Mock.Random.pick(protocols),
    saslMechanism: Mock.Random.pick(['PLAIN', 'SCRAM-SHA-256', 'SCRAM-SHA-512']),
    username: Mock.Random.word(5, 8),
    password: Mock.Random.word(8, 12),
    status: Mock.Random.pick(statuses) as KafkaDatasource['status'],
    topics: generateKafkaTopics(Mock.Random.integer(2, 5)),
    createdAt: Mock.Random.datetime('yyyy-MM-dd HH:mm:ss'),
    updatedAt: Mock.Random.datetime('yyyy-MM-dd HH:mm:ss')
  }));
};

// 生成Kafka Topic数据
const generateKafkaTopics = (count: number): KafkaTopic[] => {
  const topicNames = ['user-events', 'order-events', 'click-events', 'error-logs', 'metrics'];
  
  return Array.from({ length: count }, (_, i) => ({
    name: Mock.Random.pick(topicNames),
    partitions: Mock.Random.integer(3, 12),
    replicationFactor: Mock.Random.integer(1, 3),
    consumerGroups: generateConsumerGroups(Mock.Random.integer(1, 3))
  }));
};

// 生成消费者组数据
const generateConsumerGroups = (count: number): ConsumerGroup[] => {
  const states: ('Stable' | 'PreparingRebalance' | 'CompletingRebalance' | 'Empty' | 'Dead')[] = ['Stable', 'PreparingRebalance', 'CompletingRebalance', 'Empty', 'Dead'];
  
  return Array.from({ length: count }, (_, i) => ({
    groupId: `consumer-group-${i + 1}`,
    lag: Mock.Random.integer(0, 10000),
    members: Mock.Random.integer(1, 10),
    state: Mock.Random.pick(states)
  }));
};

// 从指定数据源与Topic生成一条样本记录
const generateTopicSampleRecord = (datasourceId: string, topic: string): Record<string, any> => {
  const baseTopic = (topic || '').toLowerCase();
  const eventType = baseTopic.replace(/[^a-z0-9]+/g, '_') || 'event';
  return {
    user_id: `U${Mock.Random.string('number', 8)}`,
    event_type: eventType,
    timestamp: new Date().toISOString(),
    amount: Mock.Random.float(0, 1000, 0, 2),
    success: Mock.Random.boolean(),
    metadata: {
      source: datasourceId,
      ip: Mock.Random.ip(),
      device: Mock.Random.pick(['ios', 'android', 'web']),
      app_version: `${Mock.Random.integer(1, 5)}.${Mock.Random.integer(0, 9)}.${Mock.Random.integer(0, 9)}`
    }
  };
};

// 推断字段类型
const inferFieldType = (v: any): 'string' | 'number' | 'boolean' | 'datetime' | 'json' => {
  if (typeof v === 'string') {
    if (/^\d{4}-\d{2}-\d{2}T/.test(v)) return 'datetime';
    return 'string';
  }
  if (typeof v === 'number') return 'number';
  if (typeof v === 'boolean') return 'boolean';
  if (v && typeof v === 'object') return 'json';
  return 'string';
};

// 从样本记录推断Schema
const inferSchemaFromRecord = (record: Record<string, any>): { fields: Array<{ name: string; type: string; example?: any }> } => {
  const fields = Object.keys(record).map(name => {
    const value = (record as any)[name];
    const type = inferFieldType(value);
    return { name, type, example: value };
  });
  return { fields };
};

// 生成Topic样本与Schema
const generateTopicSampleSchema = (datasourceId: string, topic: string) => {
  const sample = generateTopicSampleRecord(datasourceId, topic);
  const schema = inferSchemaFromRecord(sample);
  return { datasourceId, topic, sample, schema };
};

// Mock API接口
const mockEventAPI = {
  // 获取事件列表
  getEvents: () => {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(generateEventData(50));
      }, 500);
    });
  },

  // 创建事件
  createEvent: (eventData: Partial<EventData>) => {
    return new Promise(resolve => {
      setTimeout(() => {
        const newEvent: EventData = {
          id: `EVT${Mock.Random.string('number', 6)}`,
          eventName: eventData.eventName || '',
          eventType: eventData.eventType || '系统事件',
          eventSource: eventData.eventSource || '核心事件',
          acquireMethod: eventData.acquireMethod || '采样',
          triggerCondition: eventData.triggerCondition || '',
          status: eventData.status || '下线',
          createTime: new Date().toISOString(),
          updateTime: new Date().toISOString(),
          updatedBy: eventData.updatedBy || eventData.owner || '系统管理员',
          owner: eventData.owner || '系统管理员',
          description: eventData.description || '',
          registryKey: eventData.registryKey || 'event_id'
        };
        resolve(newEvent);
      }, 300);
    });
  },

  // 更新事件
  updateEvent: (id: string, eventData: Partial<EventData>) => {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          ...eventData,
          id,
          updateTime: new Date().toISOString()
        });
      }, 300);
    });
  },

  // 删除事件
  deleteEvent: (id: string) => {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({ success: true });
      }, 200);
    });
  },

  // 获取样本统计数据
  getSampleStats: (eventId: string) => {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(generateSampleStats(eventId));
      }, 800);
    });
  },

  // 获取虚拟事件列表
  getVirtualEvents: (realEvents: EventData[]) => {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(generateVirtualEventData(20, realEvents));
      }, 600);
    });
  },

  // 获取Kafka数据源
  getKafkaDatasources: () => {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(generateKafkaDatasources(5));
      }, 400);
    });
  },

  // 采样：获取指定数据源与Topic的一条样本及推断Schema
  getTopicSampleSchema: (datasourceId: string, topic: string) => {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(generateTopicSampleSchema(datasourceId, topic));
      }, 400);
    });
  },

  // 仅获取样本记录
  sampleTopicRecord: (datasourceId: string, topic: string) => {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(generateTopicSampleRecord(datasourceId, topic));
      }, 300);
    });
  },

  // 下线事件（TASK-20260720-482B803B dev 实施补全 · 候选 #141 同根病锁版守）
  offlineEvent: (id: string) => {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({ success: true, id, status: '已下线', updateTime: new Date().toISOString() });
      }, 300);
    });
  },

  // P1#2 虚拟事件组合创建 - 2026-08-02 (从 commit 7cb2cadb cherry-pick)
  // rebase 解冲突：取 main 侧。main 的 mock 实现即已上线版本（7cb2cadb cherry-pick），
  // 分支侧为同一 API 的平行实现，两者功能等价；main 版的字段形状与合并后的 types/event.ts 一致。
  createCombineVirtualEvent: (params: {
    name: string;
    description?: string;
    scenarios: string[];
    combineType: 'OR' | 'AND';
    events: Array<{ id: string; name: string }>;
  }) => {
    return new Promise(resolve => {
      setTimeout(() => {
        // 生成 VIRT*** 风格 ID(6 位随机数)
        const newId = `VIRT${String(Math.floor(Math.random() * 900000) + 100000)}`;
        const now = new Date().toISOString();
        resolve({
          success: true,
          id: newId,
          eventName: params.name,
          eventId: newId,
          description: params.description || '',
          scenario: params.scenarios,
          combineType: params.combineType,
          combineEvents: params.events,
          status: '已上线',
          realEventId: null,
          updater: '当前用户',
          createTime: now,
          updateTime: now,
          version: 1,
          versions: [{
            version: 1,
            creator: '当前用户',
            createdAt: now,
            description: `首次创建(${params.combineType} of ${params.events.length} events)`
          }],
          expireAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString()
        });
      }, 600);
    });
  }
};

export { mockEventAPI };
export default mockEventAPI;
