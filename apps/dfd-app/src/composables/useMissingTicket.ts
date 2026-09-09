import { ref, computed, type Ref, type ComputedRef } from 'vue'

/**
 * 缺失工单页面上下文，传递给 MissingTicketModal 用于只读展示。
 * 字段定义与 MissingTicketModal.MissingTicketContext 保持一致。
 */
export interface MissingTicketContext {
  /** 资产类型：table/metric/external/concept/variable/feature/other */
  assetType?: string
  /** 具体资产名称（详情页传入） */
  assetName?: string
  /** 页面来源名称（如"指标字典"、"全局搜索"） */
  pageSource?: string
  /** 其他任意附加字段，向下兼容 */
  [key: string]: unknown
}

/**
 * 缺失工单 confirm 事件 payload：表单字段 + 上下文 + 截图附件。
 */
export interface MissingTicketConfirmPayload extends MissingTicketContext {
  missingContent: string
  remark?: string
  expectedTime?: string
  screenshot?: unknown
}

export interface UseMissingTicketReturn {
  /** 控制弹窗显隐，配合 MissingTicketModal 的 v-model:visible */
  showMissingTicketModal: Ref<boolean>
  /** 当前上下文（计算属性） */
  ticketContext: ComputedRef<MissingTicketContext>
  /** 触发打开弹窗，传入上下文 */
  showMissingTicket: (ctx?: MissingTicketContext) => void
  /** Modal confirm 回调：默认只关闭弹窗，调用方可监听 payload 自定义提交 */
  handleMissingTicketConfirm: (payload: MissingTicketConfirmPayload) => void
}

/**
 * 缺失工单弹窗控制 composable。
 *
 * 提供与 apps/dfd-app/src/pages/search/MissingTicketModal.vue 兼容的状态管理：
 * - showMissingTicketModal：弹窗显隐
 * - ticketContext：上下文对象，传入 Modal 的 :context prop
 * - showMissingTicket(ctx)：打开弹窗并设置上下文
 * - handleMissingTicketConfirm(payload)：confirm 事件处理（默认仅 console + 关闭）
 *
 * 当前项目仅前端展示（无后端），所以 confirm 走 console 兜底；
 * 如需对接真实工单系统，可在调用处通过覆盖 onConfirm 行为扩展。
 */
export function useMissingTicket(): UseMissingTicketReturn {
  const showMissingTicketModal = ref(false)
  const _context = ref<MissingTicketContext>({})

  const ticketContext = computed(() => _context.value)

  const showMissingTicket = (ctx: MissingTicketContext = {}) => {
    _context.value = { ...ctx }
    showMissingTicketModal.value = true
  }

  const handleMissingTicketConfirm = (_payload: MissingTicketConfirmPayload) => {
    // 前端展示项目：mock 提交，无后端真实写入
    // 调用方可在调用 useMissingTicket 时覆盖此行为
    showMissingTicketModal.value = false
  }

  return {
    showMissingTicketModal,
    ticketContext,
    showMissingTicket,
    handleMissingTicketConfirm,
  }
}
