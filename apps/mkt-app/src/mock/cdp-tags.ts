/**
 * CDP（客户数据平台）标签实体 mock 数据
 * 说明：原数据内联在 utils/mockRequest.js 的懒初始化闭包中，此处抽为独立 mock 文件，
 *      供「标签管理 / 标签详情 / 连续型标签分位统计（模块 E）」共用，避免多处重复维护。
 * 关键字段（R47 / R57-1 / R57-2 / E33）：
 *   - continuousType：连续型判定，仅 'continuous' 支持分位统计
 *   - derived：派生标记，派生标签本期不提供分位统计
 *   - unit：数值单位，缺失时展示「—」
 */

import type { ContinuousType } from '@/types/tag'

/** CDP 标签实体（与 TagItem 字段对齐） */
export interface CdpTagEntity {
  id: string
  name: string
  /** 数据类型：number / string / date / boolean */
  dataType: string
  /** 标签分类 */
  category: string
  /** 标签类型：static / rule / derived / dynamic / computed */
  tagType: string
  /** 维度主键 */
  dimensionKey: string
  /** 共享级别 */
  shareLevel: string
  /** 创建人 */
  createUser: string
  createTime: string
  description?: string
  /** IDMapping 状态 */
  mappingStatus?: 'configured' | 'unconfigured' | 'error'
  /** 数值单位（R57-2）：'元' / '次' 等，缺失时为 undefined */
  unit?: string
  /** 是否派生标签（R57-1） */
  derived?: boolean
  /** 连续型判定（R47） */
  continuousType?: ContinuousType
}

/**
 * CDP 标签实体列表
 * 覆盖场景：
 *   - tag_001 连续型 + 有单位（次）→ 分位统计主用例
 *   - tag_002 枚举型 + 派生标签 → R47 与 R57-1 双重排除
 *   - tag_003 连续型 + 有单位（元）→ 分位统计主用例（金额类）
 *   - tag_004 连续型 + 单位元数据缺失 → E33 单位位置展示「—」
 *   - tag_005 连续型 + 派生标签 → R57-1 / E32 分位统计视图隐藏并注明
 */
export const mockCdpTags: CdpTagEntity[] = [
  {
    id: 'tag_001',
    name: '用户活跃度标签',
    dataType: 'number',
    category: 'behavior',
    tagType: 'dynamic',
    dimensionKey: 'user_id',
    shareLevel: 'public',
    createUser: 'admin',
    createTime: '2024-11-01 10:00:00',
    description: '近 30 天活跃次数',
    mappingStatus: 'configured',
    unit: '次',
    derived: false,
    continuousType: 'continuous'
  },
  {
    id: 'tag_002',
    name: '会员资产等级',
    dataType: 'string',
    category: 'business',
    tagType: 'static',
    dimensionKey: 'user_id',
    shareLevel: 'private',
    createUser: 'admin',
    createTime: '2024-10-21 09:00:00',
    description: '按 AUM 划分的会员等级',
    mappingStatus: 'unconfigured',
    unit: '',
    derived: true,
    continuousType: 'categorical'
  },
  {
    id: 'tag_003',
    name: '近 90 天消费金额',
    dataType: 'number',
    category: 'business',
    tagType: 'computed',
    dimensionKey: 'user_id',
    shareLevel: 'public',
    createUser: 'zhangsan',
    createTime: '2024-09-12 14:30:00',
    description: '滚动窗口聚合的 GMV 标签',
    mappingStatus: 'configured',
    unit: '元',
    derived: false,
    continuousType: 'continuous'
  },
  {
    id: 'tag_004',
    name: '客户理财市值',
    dataType: 'number',
    category: 'business',
    tagType: 'dynamic',
    dimensionKey: 'user_id',
    shareLevel: 'public',
    createUser: 'lisi',
    createTime: '2025-02-18 16:20:00',
    description: '客户持仓产品市值合计（单位元数据待补）',
    mappingStatus: 'configured',
    derived: false,
    continuousType: 'continuous'
  },
  {
    id: 'tag_005',
    name: '客户价值分层评分',
    dataType: 'number',
    category: 'business',
    tagType: 'derived',
    dimensionKey: 'user_id',
    shareLevel: 'public',
    createUser: 'admin',
    createTime: '2025-03-06 11:10:00',
    description: '基于多标签加权派生的客户价值评分',
    mappingStatus: 'configured',
    unit: '分',
    derived: true,
    continuousType: 'continuous'
  }
]

/**
 * 按 ID 查找标签实体
 * @param id 标签 ID
 * @returns 命中的标签实体，未命中返回 undefined
 */
export function findCdpTag(id: string): CdpTagEntity | undefined {
  if (!id) return undefined
  return mockCdpTags.find(t => t.id === id)
}
