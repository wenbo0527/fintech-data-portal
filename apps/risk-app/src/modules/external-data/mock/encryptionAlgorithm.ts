/**
 * 样本加密算法 Mock 模块
 * 依据：《外部数据回溯标准化落库流程》B1 样本校验 R02「主流加密方式为 sm3 和 sha256，不再使用 md5」
 * 说明：项目仅用于前端展示，无后端服务，加密校验结果均为模拟数据，
 *      模拟值统一由 mock/stableHash.ts 的稳定散列派生（同一输入永远同一结果）。
 */
import { hashUnit } from './stableHash'

/** 加密算法标识 */
export type EncryptionAlgorithm = 'SM3' | 'SHA256' | 'MD5'

/**
 * 落库标准列（cert_no / mobile）的存储加密算法
 * 口径：厂商回传的是摘要密文（上表三选一，用于撞库匹配与密文长度校验），
 *      入库时统一重加密为 SM4 写入标准列，因此 SM4 不进入「实际加密方式」下拉选项
 */
export const STD_CIPHER_STORAGE = 'SM4'

/** 加密算法配置项 */
export interface EncryptionAlgorithmOption {
  /** 算法标识 */
  value: EncryptionAlgorithm
  /** 算法名称 */
  label: string
  /** 密文长度（十六进制字符数） */
  digestLength: number
  /** 是否为国密算法 */
  domestic: boolean
  /**
   * 是否推荐
   * R02 明确「不再使用 md5」，MD5 保留仅为存量兼容，故标记为不推荐
   */
  recommended: boolean
  /** 备注说明 */
  remark: string
}

/** 可选加密算法清单 */
export const ENCRYPTION_ALGORITHMS: EncryptionAlgorithmOption[] = [
  {
    value: 'SM3',
    label: 'SM3（国密）',
    digestLength: 64,
    domestic: true,
    recommended: true,
    remark: '国密算法，推荐用于身份证号、手机号等三要素加密',
  },
  {
    value: 'SHA256',
    label: 'SHA256',
    digestLength: 64,
    domestic: false,
    recommended: true,
    remark: '国际通用算法，主流外数厂商回传文件默认使用',
  },
  {
    value: 'MD5',
    label: 'MD5',
    digestLength: 32,
    domestic: false,
    recommended: false,
    remark: 'R02 口径「不再使用 md5」，仅保留存量样本兼容，已不推荐',
  },
]

/** 按算法标识查询配置 */
export function getEncryptionAlgorithm(value: EncryptionAlgorithm): EncryptionAlgorithmOption {
  return ENCRYPTION_ALGORITHMS.find((a) => a.value === value) ?? ENCRYPTION_ALGORITHMS[0]
}

/** 字段加密方式配置 */
export interface FieldEncryptionConfig {
  /** 字段名 */
  fieldName: string
  /** 是否为加密字段 */
  encrypted: boolean
  /** 加密算法（encrypted 为 true 时生效） */
  algorithm: EncryptionAlgorithm
  /** 加密前是否做大小写归一 / 去空格处理 */
  normalized: boolean
}

/** 单个字段的加密校验结果 */
export interface EncryptionCheckResult {
  /** 字段名 */
  fieldName: string
  /** 是否为加密字段 */
  encrypted: boolean
  /** 校验用算法 */
  algorithm: EncryptionAlgorithm
  /** 密文长度是否符合该算法 */
  lengthMatched: boolean
  /** 是否通过加密校验 */
  passed: boolean
  /** 结果描述 */
  message: string
}

/** 样本加密校验汇总结果 */
export interface EncryptionCheckSummary {
  /** 是否整体通过 */
  passed: boolean
  /** 参与校验的加密字段数 */
  encryptedFieldCount: number
  /** 通过字段数 */
  passedFieldCount: number
  /** 失败字段数 */
  failedFieldCount: number
  /** 通过率（0~1） */
  passRate: number
  /** 各字段明细 */
  details: EncryptionCheckResult[]
}

/**
 * 生成某字段在指定算法下的模拟密文
 * 仅用于前端演示长度校验，不代表真实加密实现
 * @param fieldName 字段名
 * @param algorithm 加密算法
 * @param rowIndex 样本行序号（用于生成不同密文）
 */
export function mockDigest(fieldName: string, algorithm: EncryptionAlgorithm, rowIndex: number): string {
  const opt = getEncryptionAlgorithm(algorithm)
  const seed = `${fieldName}${rowIndex}${algorithm}`
  let out = ''
  for (let i = 0; out.length < opt.digestLength; i++) {
    out += ((seed.charCodeAt(i % seed.length) * (i + 7) + rowIndex * 31) % 16).toString(16)
  }
  return out.slice(0, opt.digestLength)
}

/**
 * 执行样本加密校验
 * 按各字段配置的加密算法校验密文长度，输出逐字段结果与通过率
 * 结果由「字段名 + 算法」确定性推导，重复执行结论稳定
 * @param configs 字段加密方式配置
 * @param rowTotal 样本总行数（参与结果种子计算）
 */
export function runEncryptionCheck(configs: FieldEncryptionConfig[], rowTotal = 1000): EncryptionCheckSummary {
  const encryptedConfigs = configs.filter((c) => c.encrypted)
  const details: EncryptionCheckResult[] = encryptedConfigs.map((cfg) => {
    const opt = getEncryptionAlgorithm(cfg.algorithm)
    // 模拟按比例的异常率：MD5 与非推荐算法略高
    const failRatio = cfg.algorithm === 'MD5' ? 0.04 : 0.01
    const lengthMatched = hashUnit(`${cfg.fieldName}|${cfg.algorithm}|${rowTotal}`) >= failRatio
    return {
      fieldName: cfg.fieldName,
      encrypted: true,
      algorithm: cfg.algorithm,
      lengthMatched,
      passed: lengthMatched,
      message: lengthMatched
        ? `密文长度 ${opt.digestLength} 位，符合 ${opt.label} 规范`
        : `密文长度不符合 ${opt.label} 规范（应为 ${opt.digestLength} 位）`,
    }
  })
  const passedFieldCount = details.filter((d) => d.passed).length
  const failedFieldCount = details.length - passedFieldCount
  return {
    passed: failedFieldCount === 0,
    encryptedFieldCount: encryptedConfigs.length,
    passedFieldCount,
    failedFieldCount,
    passRate: details.length ? passedFieldCount / details.length : 1,
    details,
  }
}

/** 样本表默认的字段加密方式配置 */
export const defaultFieldEncryptionConfigs: FieldEncryptionConfig[] = [
  { fieldName: 'id_no', encrypted: true, algorithm: 'SM3', normalized: true },
  { fieldName: 'mobile', encrypted: true, algorithm: 'SM3', normalized: true },
  { fieldName: 'name', encrypted: true, algorithm: 'SM3', normalized: true },
]
