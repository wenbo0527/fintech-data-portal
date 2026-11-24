/**
 * 外数离线回溯申请 · 可选外部数据目录
 * 口径说明：
 *   1. 一个样本可同时回溯多个外部数据，产品级差异收敛为「必填入参」：
 *      certNo=身份证号、mobile=手机号、name=姓名；
 *   2. 必填入参即接口出参要素的入参侧，参数列绑定取所选全部产品必填入参的并集；
 *   3. 复用线上调用申请与回溯落库场景中的产品名称，命名与本模块档案保持一致。
 */

/** 参数键：与 OfflineBacktrackApplication 的 PARAM_DEFS.key 对齐 */
export type ParamKey = 'name' | 'mobile' | 'certNo'

export interface ExternalDataProduct {
  /** 产品名（作为选择值） */
  name: string
  /** 接口号 */
  interfaceId: string
  /** 出数持牌机构 */
  agency: string
  /** 必填入参 */
  requiredParams: ParamKey[]
}

export const externalDataCatalogMock: ExternalDataProduct[] = [
  { name: '百行-信贷记录多头版', interfaceId: 'IF-0001', agency: '百行征信有限公司', requiredParams: ['mobile', 'certNo'] },
  { name: '百行-信用评分标准版', interfaceId: 'IF-0002', agency: '百行征信有限公司', requiredParams: ['mobile', 'certNo'] },
  { name: '百行-个人基本信息核验', interfaceId: 'IF-0005', agency: '百行征信有限公司', requiredParams: ['name', 'mobile', 'certNo'] },
  { name: '朴道-反欺诈评分', interfaceId: 'IF-0003', agency: '朴道征信有限公司', requiredParams: ['mobile', 'certNo'] },
  { name: '朴道-多头借贷指数', interfaceId: 'IF-0006', agency: '朴道征信有限公司', requiredParams: ['certNo'] },
  { name: '钱塘-企业征信画像', interfaceId: 'IF-0007', agency: '钱塘征信有限公司', requiredParams: ['name', 'certNo'] },
  { name: '人行征信-个人信用报告摘要', interfaceId: 'IF-0008', agency: '中国人民银行征信中心', requiredParams: ['name', 'mobile', 'certNo'] },
]

/** 取所选外部数据的必填入参并集（决定参数列绑定范围） */
export function unionRequiredParams(names: string[]): ParamKey[] {
  const set = new Set<ParamKey>()
  for (const n of names) {
    const p = externalDataCatalogMock.find((x) => x.name === n)
    p?.requiredParams.forEach((k) => set.add(k))
  }
  // 固定展示顺序：姓名 → 手机号 → 身份证号
  return (['name', 'mobile', 'certNo'] as ParamKey[]).filter((k) => set.has(k))
}
