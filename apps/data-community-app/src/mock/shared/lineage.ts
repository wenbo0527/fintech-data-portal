/**
 * FieldLink 关联层 — 打通 #1 / #2 / #3
 *
 * 建立"字段 ←→ 数据标准 ←→ 分级分类 ←→ 业务要素 ←→ 资产"的关联网络,
 * 让 MetadataStore / StandardStore / classify-types / BusinessConceptStore / 资产 五者联动。
 */
import { MetadataStore } from './metadata-store'
import { StandardStore } from './standard-store'
import { BusinessConceptStore } from './business-concept-store'
import type {
  SensitivityLevel,
  Grade,
  BusinessBelonging
} from './classify-types'

// ==================== 打通 #1: 字段 ↔ 标准 ↔ 分级 ====================

export interface FieldLink {
  /** 关联 ID(全局唯一) */
  id: string
  /** 表名(不含 schema) */
  tableName: string
  /** 字段名 */
  fieldName: string
  /** 数据库 schema(可选,默认 'default') */
  schema?: string

  // 关联到 StandardStore
  /** 数据标准号,如 'STD_001' */
  standardCode?: string

  // 关联到 classify-types
  /** 敏感级别 L1/L2/L3/L4 */
  sensitivityLevel?: SensitivityLevel
  /** 业务分级 一般/重要/关键 */
  grade?: Grade
  /** 业务归属 零售/对公/风控/运营/财务 */
  businessBelonging?: BusinessBelonging

  // 关联到 BusinessConceptStore
  /** 业务要素 ID,如 'element_customer_id' */
  businessElementId?: string

  // 关联到资产层
  /** 资产 ID */
  assetId?: string

  // 衍生指标
  /** 关联创建时间 */
  linkTime: string
  /** 关联人 ID */
  linkBy?: string
  /** 是否符合数据标准(automatic 检测) */
  compliance?: 'compliant' | 'deviation' | 'unknown'
}

/**
 * 字段关联仓库
 */
export const FieldLinkStore = (() => {
  // 内存中的关联记录
  const links: FieldLink[] = [
    // === dim_user 字段已打标 ===
    {
      id: 'fl_001', tableName: 'dim_user', fieldName: 'user_id', schema: 'default',
      standardCode: 'STD_001',
      sensitivityLevel: 'L1', grade: '关键', businessBelonging: '零售',
      businessElementId: 'elem_customer_id', assetId: 'asset_dim_user',
      linkTime: '2025-06-15 10:00:00', linkBy: 'user-zhangsan',
      compliance: 'compliant'
    },
    {
      id: 'fl_002', tableName: 'dim_user', fieldName: 'id_card_no', schema: 'default',
      standardCode: 'STD_005',
      sensitivityLevel: 'L3', grade: '关键', businessBelonging: '零售',
      businessElementId: 'elem_id_card', assetId: 'asset_dim_user',
      linkTime: '2025-06-15 10:01:00', linkBy: 'user-zhangsan',
      compliance: 'compliant'
    },
    {
      id: 'fl_003', tableName: 'dim_user', fieldName: 'mobile', schema: 'default',
      standardCode: 'STD_006',
      sensitivityLevel: 'L3', grade: '关键', businessBelonging: '零售',
      businessElementId: 'elem_mobile', assetId: 'asset_dim_user',
      linkTime: '2025-06-15 10:02:00', linkBy: 'user-zhangsan',
      compliance: 'compliant'
    },
    {
      id: 'fl_004', tableName: 'dim_user', fieldName: 'user_name', schema: 'default',
      standardCode: 'STD_004',
      sensitivityLevel: 'L2', grade: '重要', businessBelonging: '零售',
      businessElementId: 'elem_customer_name', assetId: 'asset_dim_user',
      linkTime: '2025-06-15 10:03:00', linkBy: 'user-zhangsan',
      compliance: 'compliant'
    },

    // === fact_loan_apply 字段已打标 ===
    {
      id: 'fl_005', tableName: 'fact_loan_apply', fieldName: 'apply_id', schema: 'default',
      standardCode: 'STD_010', sensitivityLevel: 'L1', grade: '关键',
      businessBelonging: '对公',
      linkTime: '2025-06-20 14:00:00', linkBy: 'user-xindai',
      compliance: 'compliant'
    },
    {
      id: 'fl_006', tableName: 'fact_loan_apply', fieldName: 'apply_amt', schema: 'default',
      standardCode: 'STD_002', sensitivityLevel: 'L2', grade: '关键',
      businessBelonging: '对公',
      linkTime: '2025-06-20 14:01:00', linkBy: 'user-xindai',
      compliance: 'compliant'
    },
    {
      id: 'fl_007', tableName: 'fact_loan_apply', fieldName: 'mobile', schema: 'default',
      standardCode: 'STD_006', sensitivityLevel: 'L3', grade: '关键',
      businessBelonging: '对公',
      linkTime: '2025-06-20 14:02:00', linkBy: 'user-xindai',
      compliance: 'compliant'
    },

    // === fact_user_event 字段 ===
    {
      id: 'fl_008', tableName: 'fact_user_event', fieldName: 'event_id', schema: 'default',
      standardCode: 'STD_020', sensitivityLevel: 'L1', grade: '重要',
      businessBelonging: '运营',
      linkTime: '2025-06-25 11:00:00', linkBy: 'user-zhaosi',
      compliance: 'compliant'
    },
    {
      id: 'fl_009', tableName: 'fact_user_event', fieldName: 'user_id', schema: 'default',
      standardCode: 'STD_001', sensitivityLevel: 'L1', grade: '关键',
      businessBelonging: '运营', businessElementId: 'elem_customer_id',
      linkTime: '2025-06-25 11:01:00', linkBy: 'user-zhaosi',
      compliance: 'compliant'
    },
    {
      id: 'fl_010', tableName: 'fact_user_event', fieldName: 'event_time', schema: 'default',
      standardCode: 'STD_021', sensitivityLevel: 'L1', grade: '一般',
      businessBelonging: '运营',
      linkTime: '2025-06-25 11:02:00', linkBy: 'user-zhaosi',
      compliance: 'compliant'
    }
  ]

  return {
    list(): FieldLink[] {
      return links
    },

    byId(id: string): FieldLink | undefined {
      return links.find(l => l.id === id)
    },

    /** 通过 (table, field) 查关联 */
    byField(tableName: string, fieldName: string): FieldLink | undefined {
      return links.find(l => l.tableName === tableName && l.fieldName === fieldName)
    },

    /** 通过 standardCode 查所有关联字段 */
    byStandard(code: string): FieldLink[] {
      return links.filter(l => l.standardCode === code)
    },

    /** 通过 businessElementId 查所有关联字段 */
    byBusinessElement(elementId: string): FieldLink[] {
      return links.filter(l => l.businessElementId === elementId)
    },

    /** 通过 sensitivityLevel 查所有关联字段 */
    bySensitivity(level: SensitivityLevel): FieldLink[] {
      return links.filter(l => l.sensitivityLevel === level)
    },

    /** 通过 businessBelonging 查所有关联字段 */
    byBusinessBelonging(belonging: BusinessBelonging): FieldLink[] {
      return links.filter(l => l.businessBelonging === belonging)
    },

    /** 通过 assetId 查所有关联字段 */
    byAsset(assetId: string): FieldLink[] {
      return links.filter(l => l.assetId === assetId)
    },

    /** 通过 tableName 查该表所有字段关联 */
    byTable(tableName: string): FieldLink[] {
      return links.filter(l => l.tableName === tableName)
    },

    /** 新增关联(实际生产中对接后端) */
    addLink(link: Omit<FieldLink, 'id' | 'linkTime'>): FieldLink {
      const newLink: FieldLink = {
        ...link,
        id: `fl_${Date.now()}`,
        linkTime: new Date().toISOString()
      }
      links.push(newLink)
      return newLink
    },

    /**
     * 字段合规检测:比对实际字段类型与标准定义
     */
    checkCompliance(tableName: string, fieldName: string): 'compliant' | 'deviation' | 'unknown' {
      const link = this.byField(tableName, fieldName)
      if (!link?.standardCode) return 'unknown'
      const standard = StandardStore.getStandards().find(s => s.code === link.standardCode)
      if (!standard) return 'unknown'
      // 实际字段类型可从 MetadataStore 取
      const table = MetadataStore.getTables().find(t => t.name === tableName)
      const field = table?.fields?.find((f: any) => f.name === fieldName)
      if (!field) return 'unknown'
      const standardType = standard.dataType
      const actualType = field.type
      // 类型匹配规则(简化:同前缀即合规)
      if (standardType.startsWith(actualType) || actualType.startsWith(standardType)) {
        return 'compliant'
      }
      return 'deviation'
    },

    /** 表级别标准合规率 */
    tableComplianceRate(tableName: string): number {
      const tableLinks: FieldLink[] = this.byTable(tableName)
      if (tableLinks.length === 0) return 0
      const compliant = tableLinks.filter(l => l.compliance === 'compliant').length
      return Math.round((compliant / tableLinks.length) * 100)
    },

    /** 表级别分级覆盖率 */
    tableClassifyCoverage(tableName: string): number {
      const table = MetadataStore.getTables().find((t: { name: string }) => t.name === tableName)
      if (!table?.fields || table.fields.length === 0) return 0
      const tableLinks: FieldLink[] = this.byTable(tableName)
      const classifiedFields = new Set(tableLinks.filter(l => l.sensitivityLevel).map(l => l.fieldName))
      return Math.round((classifiedFields.size / table.fields.length) * 100)
    },

    /** 统计 */
    stats() {
      const total = links.length
      return {
        total,
        withStandard: links.filter(l => l.standardCode).length,
        withSensitivity: links.filter(l => l.sensitivityLevel).length,
        withBusinessElement: links.filter(l => l.businessElementId).length,
        withAsset: links.filter(l => l.assetId).length,
        bySensitivity: {
          L1: links.filter(l => l.sensitivityLevel === 'L1').length,
          L2: links.filter(l => l.sensitivityLevel === 'L2').length,
          L3: links.filter(l => l.sensitivityLevel === 'L3').length,
          L4: links.filter(l => l.sensitivityLevel === 'L4').length
        },
        byGrade: {
          一般: links.filter(l => l.grade === '一般').length,
          重要: links.filter(l => l.grade === '重要').length,
          关键: links.filter(l => l.grade === '关键').length
        }
      }
    }
  }
})()

// ==================== 打通 #2: 业务要素 ↔ 字段 ====================

/**
 * 增强的字段关联视图,整合所有打通信息
 */
export interface EnhancedFieldInfo {
  tableName: string
  fieldName: string
  fieldComment: string
  fieldType: string

  // 数据标准
  standard?: {
    code: string
    chineseName: string
    englishName: string
    domain: string
    description: string
  }

  // 分级
  sensitivity?: {
    level: SensitivityLevel
    grade: Grade
    belonging: BusinessBelonging
  }

  // 业务要素
  businessElement?: {
    id: string
    name: string
    chineseName: string
    description: string
  }

  // 资产
  asset?: {
    id: string
    name: string
    status: string
  }

  // 合规
  compliance: 'compliant' | 'deviation' | 'unknown'
  linkId?: string
}

/**
 * 取字段的"全景视图"(一次拿全部打通信息)
 */
export function getEnhancedField(tableName: string, fieldName: string): EnhancedFieldInfo | null {
  const link = FieldLinkStore.byField(tableName, fieldName)
  const table = MetadataStore.getTables().find(t => t.name === tableName)
  const field = table?.fields?.find((f: any) => f.name === fieldName)
  if (!table || !field) return null

  let standard: any = undefined
  if (link?.standardCode) {
    standard = StandardStore.getStandards().find(s => s.code === link.standardCode)
  }

  let businessElement: any = undefined
  if (link?.businessElementId) {
    businessElement = BusinessConceptStore.getElements().find(
      (e: any) => e.id === link.businessElementId
    )
  }

  return {
    tableName,
    fieldName,
    fieldComment: (field as any).description || (field as any).comment || '',
    fieldType: (field as any).type,

    standard: standard ? {
      code: standard.standardNo || standard.code,
      chineseName: standard.cnName || standard.name,
      englishName: standard.enFullName || standard.enAbbr || '',
      domain: standard.domain || '',
      description: standard.bizDefinition || standard.definition || ''
    } : undefined,

    sensitivity: link?.sensitivityLevel ? {
      level: link.sensitivityLevel,
      grade: link.grade!,
      belonging: link.businessBelonging!
    } : undefined,

    businessElement: businessElement ? {
      id: businessElement.id,
      name: businessElement.name,
      chineseName: businessElement.chineseName || businessElement.name,
      description: businessElement.description || ''
    } : undefined,

    asset: link?.assetId ? {
      id: link.assetId,
      name: link.assetId,
      status: 'active'
    } : undefined,

    compliance: FieldLinkStore.checkCompliance(tableName, fieldName),
    linkId: link?.id
  }
}

/**
 * 批量:取一张表所有字段的全景视图
 */
export function getEnhancedTable(tableName: string): EnhancedFieldInfo[] {
  const table = MetadataStore.getTables().find(t => t.name === tableName)
  if (!table?.fields) return []
  return (table.fields as any[])
    .map(f => getEnhancedField(tableName, f.name))
    .filter(Boolean) as EnhancedFieldInfo[]
}