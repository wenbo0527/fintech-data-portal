/**
 * 落库文件通知 · Mock 数据源
 * 需求文档《外数文件落库》B5（R76-R82 / E24-E26）
 *
 * 数据来源说明：
 *   1. 通知渠道（R77 双渠道）：数据服务公众号、数字社区，两者均可配置；
 *   2. 通知内容 8 要素（R78）：机构名称、文件名、backid、落库时间、入库行数、验证结果、异常摘要、一致性摘要；
 *   3. 接收人配置（R80）：按机构 / 外数类型配置，可临时补充；
 *   4. 失败重试（R81）：最多 3 次，超过后标记发送失败并保留记录。
 */

/** 通知渠道（R77） */
export type NotifyChannel = '数据服务公众号' | '数字社区'

/** 通知渠道选项 */
export const NOTIFY_CHANNELS: NotifyChannel[] = ['数据服务公众号', '数字社区']

/** 通知配置（R80 接收人配置） */
export interface NotifyConfig {
  /** 启用的通知渠道（R77） */
  channels: NotifyChannel[]
  /** 接收人（按机构 / 外数类型配置） */
  receivers: string[]
  /** 是否脱敏（R79） */
  maskEnabled: boolean
  /** 最大重试次数（R81） */
  maxRetry: number
  /** 接收人配置说明 */
  configDesc: string
}

/** 通知配置默认值 */
export const notifyConfigMock: NotifyConfig = {
  channels: ['数据服务公众号'],
  receivers: ['风险数据团队值班'],
  maskEnabled: true,
  maxRetry: 3,
  configDesc: '按机构维度配置接收人；外数类型为「离线回溯」时默认通知风险数据团队值班账号',
}

/** 通知内容 8 要素（R78） */
export interface NotifyContent {
  /** 机构名称 */
  agency: string
  /** 文件名 */
  fileName: string
  /** backid 批次标识 */
  backid: string
  /** 落库时间 */
  loadTime: string
  /** 入库行数 */
  loadedRows: number
  /** 验证结果 */
  validationResult: string
  /** 异常摘要 */
  exceptionSummary: string
  /** 一致性摘要 */
  consistencySummary: string
}

/** 通知记录（R82） */
export interface NotifyRecord {
  /** 通知编号 */
  notifyId: string
  /** 关联 backid */
  backid: string
  /** 通知渠道 */
  channel: NotifyChannel
  /** 接收人 */
  receivers: string[]
  /** 通知内容 */
  content: NotifyContent
  /** 脱敏配置（R79） */
  maskEnabled: boolean
  /** 发送状态 */
  sendStatus: '待发送' | '发送中' | '发送成功' | '发送失败'
  /** 重试次数（R81） */
  retryCount: number
  /** 发送时间 */
  sentAt: string
  /** 失败原因（E24/E25/E26） */
  failReason?: string
}

/** 生成通知内容 8 要素（R78） */
export function buildNotifyContent(params: {
  agency: string
  fileName: string
  backid: string
  loadTime: string
  loadedRows: number
  validationResult: string
  exceptionSummary: string
  consistencySummary: string
}): NotifyContent {
  return { ...params }
}

/**
 * 执行通知发送（mock）
 * @param channels 启用的通知渠道
 * @param content 通知内容
 * @param receivers 接收人
 * @param maskEnabled 是否脱敏
 * @param maxRetry 最大重试次数
 */
export async function sendNotification(
  channels: NotifyChannel[],
  content: NotifyContent,
  receivers: string[],
  maskEnabled: boolean,
  maxRetry = 3
): Promise<NotifyRecord[]> {
  const sentAt = new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
  return channels.map((channel, idx) => {
    // mock 规则：数字社区渠道在接收人为空时发送失败；其余视为成功
    const failed = channel === '数字社区' && receivers.length === 0
    return {
      notifyId: `NOTIFY${content.backid.replace('BACK', '')}${String(idx + 1).padStart(2, '0')}`,
      backid: content.backid,
      channel,
      receivers: [...receivers],
      content,
      maskEnabled,
      sendStatus: failed ? '发送失败' : '发送成功',
      retryCount: failed ? maxRetry : 0,
      sentAt,
      failReason: failed ? '接收人未订阅该批次（已重试 3 次）' : undefined,
    }
  })
}
