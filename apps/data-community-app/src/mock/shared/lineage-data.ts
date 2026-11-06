/**
 * 血缘数据 - 统一 Mock 数据源
 * 所有血缘关系数据只维护一份，通过 toGraphData() 转换为 x6 图谱格式
 */

// ============ 接口定义 ============

export interface FieldRelation {
  sourceTable: string
  sourceField: string
  targetTable: string
  targetField: string
  relationType: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many'
  relationDescription: string
  isActive: boolean
}

export interface DataLineage {
  id: string
  sourceTable: string
  targetTable: string
  relationFields?: string[]
  relationType?: 'one_to_one' | 'one_to_many' | 'many_to_one' | 'many_to_many' | string
  dataFlow?: 'upstream' | 'downstream' | 'bidirectional' | string
  transformationLogic: string
  dependencies: string[]
  updateFrequency: string
  lastExecuted: string
}

// ============ 血缘数据（静态，只维护这一份） ============

export const dataLineageConfig: DataLineage[] = [
  {
    id: 'lineage-001',
    sourceTable: 'dim_user',
    targetTable: 'fact_loan_apply',
    relationFields: ['user_id'],
    relationType: 'one_to_many',
    dataFlow: 'downstream',
    transformationLogic: '贷款申请加工任务',
    dependencies: ['dim_user.user_id'],
    updateFrequency: '实时',
    lastExecuted: '2025-01-27T10:30:00Z'
  },
  {
    id: 'lineage-002',
    sourceTable: 'dim_user',
    targetTable: 'dws_risk_score',
    relationFields: ['user_id'],
    relationType: 'one_to_one',
    dataFlow: 'downstream',
    transformationLogic: '风险评分计算任务',
    dependencies: ['dim_user.user_id', 'dim_user.age', 'dim_user.education'],
    updateFrequency: '每日',
    lastExecuted: '2025-01-27T08:00:00Z'
  },
  {
    id: 'lineage-003',
    sourceTable: 'dim_user',
    targetTable: 'ads_user_portrait',
    relationFields: ['user_id'],
    relationType: 'one_to_one',
    dataFlow: 'downstream',
    transformationLogic: '用户画像聚合任务',
    dependencies: ['dim_user.*'],
    updateFrequency: '每日',
    lastExecuted: '2025-01-27T09:00:00Z'
  },
  {
    id: 'lineage-004',
    sourceTable: 'ods_user_info',
    targetTable: 'dim_user',
    relationFields: ['user_id', 'mobile', 'id_card'],
    relationType: 'many_to_one',
    dataFlow: 'upstream',
    transformationLogic: '用户基础信息同步任务',
    dependencies: ['ods_user_info.user_id', 'ods_user_info.mobile', 'ods_user_info.id_card'],
    updateFrequency: '每日',
    lastExecuted: '2025-01-27T06:00:00Z'
  },
  {
    id: 'lineage-005',
    sourceTable: 'ods_customer_profile',
    targetTable: 'dim_user',
    relationFields: ['user_id'],
    relationType: 'many_to_one',
    dataFlow: 'upstream',
    transformationLogic: '客户画像集成任务',
    dependencies: ['ods_customer_profile.user_id', 'ods_customer_profile.education', 'ods_customer_profile.occupation'],
    updateFrequency: '每日',
    lastExecuted: '2025-01-27T06:30:00Z'
  },
  {
    id: 'lineage-006',
    sourceTable: 'log_user_behavior',
    targetTable: 'dim_user',
    relationFields: ['user_id'],
    relationType: 'many_to_one',
    dataFlow: 'upstream',
    transformationLogic: '用户行为日志清洗任务',
    dependencies: ['log_user_behavior.user_id', 'log_user_behavior.action_type'],
    updateFrequency: '实时',
    lastExecuted: '2025-01-27T07:00:00Z'
  }
]

export const fieldRelations: FieldRelation[] = [
  {
    sourceTable: 'dim_user',
    sourceField: 'user_id',
    targetTable: 'fact_loan_apply',
    targetField: 'user_id',
    relationType: 'one-to-many',
    relationDescription: '一个用户可以有多个贷款申请',
    isActive: true
  },
  {
    sourceTable: 'dim_user',
    sourceField: 'user_id',
    targetTable: 'dws_risk_score',
    targetField: 'user_id',
    relationType: 'one-to-one',
    relationDescription: '一个用户对应一个风控评分记录',
    isActive: true
  },
  {
    sourceTable: 'dim_user',
    sourceField: 'user_id',
    targetTable: 'dwd_fraud_alert',
    targetField: 'user_id',
    relationType: 'one-to-many',
    relationDescription: '一个用户可能有多个欺诈预警记录',
    isActive: true
  }
]

// ============ 节点类型定义（x6 图谱用） ============

export type GraphNodeType = 'main' | 'upstream' | 'downstream'
export type GraphDataType = 'Table' | 'Metric' | 'API' | 'Variable'

export interface LineageNodeData {
  label: string
  type: GraphNodeType
  dataType: GraphDataType
  dbName: string
  owner: string
  rowCount: number
  dataSize: string
  taskName: string
  taskId: string
  taskStatus: 'success' | 'running' | 'failed'
  lastRunTime: string
  sql: string
  upstreamExpanded: boolean
  downstreamExpanded: boolean
  // 中文名称
  chineseName?: string
  // 资产描述
  description?: string
  // 扩展字段（来自 DataLineage）
  transformationLogic?: string
  dependencies?: string[]
  updateFrequency?: string
}

export interface GraphNode {
  id: string
  shape: 'lineage-node'
  data: LineageNodeData
  ports: {
    groups: {
      left: { position: 'left'; attrs: { circle: { r: number; magnet: boolean; stroke: string; fill: string } } }
      right: { position: 'right'; attrs: { circle: { r: number; magnet: boolean; stroke: string; fill: string } } }
    }
    items: { id: string; group: 'left' | 'right' }[]
  }
}

export interface GraphEdge {
  id: string
  source: string
  target: string
  sourcePort?: string
  targetPort?: string
  data?: {
    relationFields?: string[]
    transformationLogic?: string
    updateFrequency?: string
  }
}

export interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

// ============ 静态节点配置（固定的上下游节点） ============

// 表类型到库名的映射
const dbNameMap: Record<string, string> = {
  dim_user: 'dw',
  ods_user_info: 'ods',
  ods_customer_profile: 'ods',
  log_user_behavior: 'ods',
  fact_loan_apply: 'ads',
  dws_risk_score: 'ads',
  ads_user_portrait: 'ads',
  dwd_fraud_alert: 'dwd'
}

const ownerMap: Record<string, string> = {
  dim_user: '张三',
  ods_user_info: '王五',
  ods_customer_profile: '李四',
  log_user_behavior: '赵六',
  fact_loan_apply: '张三',
  dws_risk_score: '李四',
  ads_user_portrait: '王五',
  dwd_fraud_alert: '赵六'
}

// 表名 → 中文名称映射
const chineseNameMap: Record<string, string> = {
  dim_user: '用户维度表',
  ods_user_info: '用户信息表',
  ods_customer_profile: '客户画像表',
  log_user_behavior: '用户行为日志表',
  fact_loan_apply: '贷款申请事实表',
  dws_risk_score: '风险评分汇总表',
  ads_user_portrait: '用户画像应用表',
  dwd_fraud_alert: '欺诈告警明细表'
}

// 根据表名获取中文名称
export function getChineseName(tableName: string): string {
  return chineseNameMap[tableName] || tableName
}

// 表名 → 资产描述映射
const descriptionMap: Record<string, string> = {
  dim_user: '存储用户基础属性信息，包括用户ID、姓名、手机号、注册时间等字段，是用户画像和风控模型的核心维度表',
  ods_user_info: '从业务系统同步的原始用户信息，未经加工处理，包含全量用户字段',
  ods_customer_profile: '从外部系统接入的客户画像数据，包含客户标签和偏好信息',
  log_user_behavior: '采集自APP和Web端的用户行为埋点日志，记录页面浏览、点击、停留等行为',
  fact_loan_apply: '记录贷款申请的全流程数据，包括申请金额、期限、利率、审批结果等关键信息',
  dws_risk_score: '基于用户多维数据计算的风险评分汇总表，用于风控规则引擎和审批决策',
  ads_user_portrait: '面向应用层的用户画像宽表，整合标签、偏好、行为等多维特征供营销使用',
  dwd_fraud_alert: '欺诈告警明细表，记录告警类型、触发规则、处置结果等信息'
}

// 根据表名获取资产描述
export function getDescription(tableName: string): string {
  return descriptionMap[tableName] || ''
}

// 基于字符串的确定性哈希,确保同一表名每次生成相同数据
function hashStr(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash = hash & hash
  }
  return Math.abs(hash)
}

// 创建节点数据的工厂函数（确定性，不依赖 Math.random）
export function createNodeData(
  id: string,
  label: string,
  type: GraphNodeType,
  dbName: string,
  owner: string,
  dataType: GraphDataType = 'Table',
  extra?: Partial<LineageNodeData>
): LineageNodeData {
  const h = hashStr(label)
  return {
    label,
    type,
    dataType,
    dbName,
    owner,
    chineseName: getChineseName(label),
    description: getDescription(label),
    rowCount: h % 1000000,
    dataSize: (h % 100).toFixed(2) + ' GB',
    taskName: `任务_${label}`,
    taskId: `task-${type}-${h.toString(36).slice(2, 7)}`,
    taskStatus: h % 10 > 8 ? 'failed' : h % 10 > 5 ? 'running' : 'success',
    lastRunTime: new Date(Date.now() - (h % 86400000)).toLocaleString(),
    sql: `SELECT * FROM ${label} \nWHERE dt = '${new Date().toISOString().slice(0, 10)}'`,
    upstreamExpanded: false,
    downstreamExpanded: false,
    ...extra
  }
}

// 根据表名获取库名
export function getDbName(tableName: string): string {
  return dbNameMap[tableName] || 'dw'
}

// 根据表名获取负责人
export function getOwner(tableName: string): string {
  return ownerMap[tableName] || '未知'
}

// ============ 转换函数：DataLineage → x6 GraphData ============

/**
 * 将 DataLineage 数据转换为 x6 图谱格式
 * @param lineages 血缘关系数据
 * @param rootTableName 根节点表名（默认 dim_user）
 * @param expandUpstream 是否展开上游
 * @param expandDownstream 是否展开下游
 */
export function toGraphData(
  lineages: DataLineage[] = dataLineageConfig,
  rootTableName: string = 'dim_user',
  expandUpstream: boolean = true,
  expandDownstream: boolean = true
): GraphData {
  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []

  // 收集所有涉及的表
  const allTables = new Set<string>()
  allTables.add(rootTableName)

  lineages.forEach(lineage => {
    allTables.add(lineage.sourceTable)
    allTables.add(lineage.targetTable)
  })

  // 判断表是上游还是下游（相对于 rootTableName）
  const upstreamTables = new Set<string>()
  const downstreamTables = new Set<string>()

  lineages.forEach(lineage => {
    if (lineage.sourceTable === rootTableName) {
      downstreamTables.add(lineage.targetTable)
    } else if (lineage.targetTable === rootTableName) {
      upstreamTables.add(lineage.sourceTable)
    }
  })

  // 创建根节点
  const rootId = `main-${rootTableName}`
  nodes.push({
    id: rootId,
    shape: 'lineage-node',
    data: createNodeData(
      rootId,
      rootTableName,
      'main',
      getDbName(rootTableName),
      getOwner(rootTableName)
    ),
    ports: {
      groups: {
        left: {
          position: 'left',
          attrs: { circle: { r: 4, magnet: false, stroke: 'transparent', fill: 'transparent' } }
        },
        right: {
          position: 'right',
          attrs: { circle: { r: 4, magnet: false, stroke: 'transparent', fill: 'transparent' } }
        }
      },
      items: [
        { id: 'left', group: 'left' },
        { id: 'right', group: 'right' }
      ]
    }
  })

  // 创建上游节点
  if (expandUpstream) {
    upstreamTables.forEach(tableName => {
      const nodeId = `upstream-${tableName}`
      // 找到对应的 lineage
      const lineage = lineages.find(l => l.targetTable === rootTableName && l.sourceTable === tableName)
      nodes.push({
        id: nodeId,
        shape: 'lineage-node',
        data: createNodeData(
          nodeId,
          tableName,
          'upstream',
          getDbName(tableName),
          getOwner(tableName),
          'Table',
          lineage ? {
            transformationLogic: lineage.transformationLogic,
            dependencies: lineage.dependencies,
            updateFrequency: lineage.updateFrequency
          } : undefined
        ),
        ports: {
          groups: {
            left: {
              position: 'left',
              attrs: { circle: { r: 4, magnet: false, stroke: 'transparent', fill: 'transparent' } }
            },
            right: {
              position: 'right',
              attrs: { circle: { r: 4, magnet: false, stroke: 'transparent', fill: 'transparent' } }
            }
          },
          items: [
            { id: 'left', group: 'left' },
            { id: 'right', group: 'right' }
          ]
        }
      })

      // 创建边（上游 → 根节点）
      edges.push({
        id: `edge-${tableName}-to-${rootTableName}`,
        source: nodeId,
        target: rootId,
        sourcePort: 'right',
        targetPort: 'left',
        data: lineage ? {
          relationFields: lineage.relationFields,
          transformationLogic: lineage.transformationLogic,
          updateFrequency: lineage.updateFrequency
        } : undefined
      })
    })
  }

  // 创建下游节点
  if (expandDownstream) {
    downstreamTables.forEach(tableName => {
      const nodeId = `downstream-${tableName}`
      // 找到对应的 lineage
      const lineage = lineages.find(l => l.sourceTable === rootTableName && l.targetTable === tableName)
      nodes.push({
        id: nodeId,
        shape: 'lineage-node',
        data: createNodeData(
          nodeId,
          tableName,
          'downstream',
          getDbName(tableName),
          getOwner(tableName),
          'Table',
          lineage ? {
            transformationLogic: lineage.transformationLogic,
            dependencies: lineage.dependencies,
            updateFrequency: lineage.updateFrequency
          } : undefined
        ),
        ports: {
          groups: {
            left: {
              position: 'left',
              attrs: { circle: { r: 4, magnet: false, stroke: 'transparent', fill: 'transparent' } }
            },
            right: {
              position: 'right',
              attrs: { circle: { r: 4, magnet: false, stroke: 'transparent', fill: 'transparent' } }
            }
          },
          items: [
            { id: 'left', group: 'left' },
            { id: 'right', group: 'right' }
          ]
        }
      })

      // 创建边（根节点 → 下游）
      edges.push({
        id: `edge-${rootTableName}-to-${tableName}`,
        source: rootId,
        target: nodeId,
        sourcePort: 'right',
        targetPort: 'left',
        data: lineage ? {
          relationFields: lineage.relationFields,
          transformationLogic: lineage.transformationLogic,
          updateFrequency: lineage.updateFrequency
        } : undefined
      })
    })
  }

  return { nodes, edges }
}
