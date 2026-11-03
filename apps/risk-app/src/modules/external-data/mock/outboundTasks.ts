/**
 * 前置外发任务 · Mock 数据源
 * 需求文档《外数文件落库》B1 R24/R25
 *
 * 数据来源说明：
 *   1. 任务编号 / 产品名沿用 BacktrackPersist.vue 既有 outboundTasks（OUT20260905 / OUT20260912 / OUT20260918）；
 *   2. 机构口径与 mock/creditAgencies.ts 的机构编码（BH / PD / QT）保持一致，
 *      便于按机构过滤出可关联的前置任务；
 *   3. 需求方口径参考 modules/budget/api/contract.ts 的 MOCK_CONTRACTS 中的申请方命名。
 */

export interface OutboundTask {
  /** 外发任务编号 */
  id: string
  /** 外数产品名称（展示名，仅用于界面显示） */
  product: string
  /**
   * 关联外数档案的业务主键（= ArchiveProduct.id / productCode）
   * 改造前外发任务只有展示名，与档案的 productCode / ED-xxx 没有共同主键，
   * 回溯落库 2.2 「匹配前置外发任务」只能靠人工认名字；现补上关联键做硬关联。
   * 空字符串表示尚未建档的任务，界面应提示「未关联档案」而不是静默隐藏。
   */
  productCode: string
  /** 关联机构编码 */
  agencyCode: string
  /** 需求方（发起外发的团队） */
  requester: string
  /** 外发日期 */
  sendDate: string
  /** 外发样本量 */
  sampleCount: number
  /** 外发状态 */
  status: '已返回' | '待返回' | '部分返回'
  /** 备注 */
  remark: string
}

/** 前置外发任务清单 */
export const outboundTasksMock: OutboundTask[] = [
  { id: 'OUT20260905', product: '百行-多头借贷汇总 V4', productCode: 'BH_MULTI_QUERY', agencyCode: 'BH', requester: '风控策略组', sendDate: '2026-09-05', sampleCount: 128000, status: '已返回', remark: '按机构批次拆分返回' },
  { id: 'OUT20260908', product: '百行-授信额度回溯', productCode: 'BH_CREDIT_QUERY', agencyCode: 'BH', requester: '贷中管理团队', sendDate: '2026-09-08', sampleCount: 96000, status: '部分返回', remark: '分两个文件返回' },
  { id: 'OUT20260912', product: '朴道-历史逾期明细', productCode: 'PD_BEHAVIOR_RISK', agencyCode: 'PD', requester: '贷中管理团队', sendDate: '2026-09-12', sampleCount: 45000, status: '已返回', remark: '' },
  { id: 'OUT20260915', product: '朴道-多头申请汇总', productCode: 'PD_IP_RISK', agencyCode: 'PD', requester: '风控策略组', sendDate: '2026-09-15', sampleCount: 68000, status: '待返回', remark: '厂商侧排队中' },
  { id: 'OUT20260918', product: '钱塘-授信评分回溯', productCode: '', agencyCode: 'QT', requester: '模型算法组', sendDate: '2026-09-18', sampleCount: 46000, status: '已返回', remark: '钱塘路径会自动清理，需及时处理；尚无对应档案，需先新建档案' },
  { id: 'OUT20260922', product: '人行征信-公共基础信息回溯', productCode: '', agencyCode: 'PBC', requester: '模型算法组', sendDate: '2026-09-22', sampleCount: 210000, status: '已返回', remark: '尚无对应档案，需先新建档案' },
  { id: 'OUT20260925', product: '上海数据集团-工商司法信息回溯', productCode: 'SHGJ_ENTERPRISE_JUDICIAL', agencyCode: 'SHGJ', requester: '贷中管理团队', sendDate: '2026-09-25', sampleCount: 38000, status: '待返回', remark: '' },
]

/** 按机构编码查询前置外发任务（R24：一文件可关联多个任务） */
export async function listOutboundTasks(agencyCode?: string): Promise<OutboundTask[]> {
  if (!agencyCode) return [...outboundTasksMock]
  return outboundTasksMock.filter((t) => t.agencyCode === agencyCode)
}

/** 按任务编号批量查询 */
export async function getOutboundTasksByIds(ids: string[]): Promise<OutboundTask[]> {
  const set = new Set(ids)
  return outboundTasksMock.filter((t) => set.has(t.id))
}

/** 按档案业务主键反查外发任务（档案详情展示最近回溯批次用） */
export async function getOutboundTasksByProductCode(productCode: string): Promise<OutboundTask[]> {
  if (!productCode) return []
  return outboundTasksMock.filter((t) => t.productCode === productCode)
}
