/**
 * 外数档案「机构」字典 · Mock 数据源
 *
 * 档案上只有两个机构轴（2026-11-03 口径调整，用户确认；覆盖需求文档 R09「合作机构用十二家全称」）：
 *   1. 合作机构（cooperationOrg）＝ 这批数据合规流通所依托的持牌征信机构，
 *      闭集四档：百行 / 朴道 / 钱塘 / 其他。不在四档内的出数方（学信网、上数金科、人行征信中心等）
 *      一律记「其他」，其机构本名改由供应商轴承载；
 *   2. 供应商（supplier）＝ 实际供数或做数据接入的厂商，开放枚举（页面允许输入新值）。
 *
 * 变更史：改造前是三轴 —— 合作机构（十二家工商全称）/ 渠道 channel（业务场景方：字节、京东…）/
 * 供应商（恒普、海纳、内部）。渠道与供应商在业务上回答的是同一个问题「这批数从谁来」，
 * 两条并列导致同一事实要在档案上填两格，且列表、导出、调用分析都要多维护一维。
 * 现整体删除 channel 字段，迁移规则（用户逐条确认）：
 *   - 原渠道值非空 → 该值成为供应商，覆盖原供应商值（BH_* 由「海纳」改记「京东」，PD_* 由「内部」改记「字节」）；
 *   - 原合作机构不属于四档 → 合作机构记「其他」，机构本名转为供应商（XUEXIN_* 记「学信网」，SHGJ_* 记「上数金科」）；
 *   - 原供应商里的恒普 / 海纳 / 内部 不删除，留在候选池供后续建档时选用。
 * 征信机构管理页（CreditAgency）的十二家机构主数据保持不动 —— 它还是回溯文件的出数主体清单，
 * 只是不再充当档案「合作机构」下拉的候选池。
 * 另注：variable-hub 效果评估侧的「渠道」（generator.ts 的 PLATFORMS 24 家）是另一套维度，本次不涉及。
 */

/** 合作机构闭集四档 —— 数组项即存值，页面下拉直接用 */
export const COOPERATION_ORG_OPTIONS = ['百行', '朴道', '钱塘', '其他']

/** 工商全称 / 历史值 → 四档简称，用于把存量与人工输入归一到标准枚举 */
const COOPERATION_ORG_ALIAS: Record<string, string> = {
  百行征信有限公司: '百行',
  朴道征信有限公司: '朴道',
  钱塘征信有限公司: '钱塘',
}

/**
 * 归一化合作机构取值：命中四档直接返回，全称查别名表，
 * 其余一律落「其他」—— 四档是闭集，非持牌出数方的归属就是「其他」，
 * 其机构本名不应丢，由调用方转写进供应商字段（迁移规则见文件头）。
 */
export function normalizeCooperationOrg(name?: string): string {
  const raw = String(name || '').trim()
  if (!raw) {return ''}
  if (COOPERATION_ORG_OPTIONS.includes(raw)) {return raw}
  return COOPERATION_ORG_ALIAS[raw] || '其他'
}

/** 是否为四档标准值（页面据此标注「非标准值」；归一化后恒为真，保留导出是为了校验人工输入） */
export const isStandardCooperationOrg = (name?: string): boolean =>
  COOPERATION_ORG_OPTIONS.includes(String(name || '').trim())

/**
 * 产品编码前缀 → 合作机构四档：BH_/PD_/QT_ 是持牌三家，
 * 其余已登记前缀（学信网、上数金科、人行、运营商系等）都是非持牌出数方 → 「其他」。
 * 未登记前缀返回空串，交由档案登记环节填写，不做「其他」兜底 ——
 * 兜底会把「没登记过的编码」伪装成「已确认非持牌」，两类语义不同。
 */
const COOPERATION_ORG_BY_PREFIX: Array<{ re: RegExp; org: string }> = [
  { re: /^BH[_-]/i, org: '百行' },
  { re: /^PD[_-]/i, org: '朴道' },
  { re: /^QT[_-]/i, org: '钱塘' },
  { re: /^XUEXIN[_-]/i, org: '其他' },
  { re: /^SHGJ[_-]/i, org: '其他' },
  { re: /^PBC[_-]/i, org: '其他' },
  { re: /^XMXX[_-]/i, org: '其他' },
  { re: /^ZGBX[_-]/i, org: '其他' },
  { re: /^RQN[_-]/i, org: '其他' },
  { re: /^SHLX[_-]/i, org: '其他' },
  { re: /^BJYD[_-]/i, org: '其他' },
  { re: /^YLJZ[_-]/i, org: '其他' },
]

export function cooperationOrgOfProduct(productCode: string): string {
  const code = String(productCode || '')
  if (!code) {return ''}
  return COOPERATION_ORG_BY_PREFIX.find((x) => x.re.test(code))?.org || ''
}

/**
 * 供应商候选池（开放枚举，页面 allow-create，选不到可输入）
 * 构成：原「渠道」轴的场景方（字节 / 京东）+ 原合作机构里的非持牌出数方（学信网 / 上数金科）
 * + 原接入服务商（恒普 / 海纳 / 内部）+「其他」兜底。
 * 口径上供应商回答「这批数实际从哪家来」，因此既可以是出数方本身，也可以是代理接入服务商。
 */
export const SUPPLIER_OPTIONS = ['学信网', '字节', '京东', '上数金科', '恒普', '海纳', '内部', '其他']
