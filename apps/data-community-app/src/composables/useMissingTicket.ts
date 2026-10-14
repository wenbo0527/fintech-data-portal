/**
 * 缺失工单 composable —— 提供跨页面复用的"上报缺失"能力
 *
 * 支持三种场景：
 * 1. 列表页/搜索页：传入 pageSource（如"指标字典"）和 assetType（如"metric"）
 * 2. 详情页：传入 assetName（如"dim_user"）和 assetType（如"table"）
 * 3. 通用入口：仅传入 pageSource，不关联具体资产
 *
 * 用法：
 * const { showMissingTicketModal, ticketContext, showMissingTicket, handleMissingTicketConfirm } = useMissingTicket()
 *
 * // 列表页调用：
 * showMissingTicket({ assetType: 'metric', pageSource: '指标字典' })
 *
 * // 详情页调用：
 * showMissingTicket({ assetType: 'table', assetName: 'dim_user', pageSource: '数据表详情' })
 *
 * // 模板中：
 * <MissingTicketModal v-model:visible="showMissingTicketModal" :context="ticketContext" @confirm="handleMissingTicketConfirm" />
 */
import { ref } from 'vue'
import { Message } from '@arco-design/web-vue'
import { useRouter } from 'vue-router'

export interface TicketContext {
  /** 资产类型：table/metric/external/concept/variable/feature 等 */
  assetType?: string
  /** 具体资产名称（详情页传入） */
  assetName?: string
  /** 页面来源名称 */
  pageSource?: string
}

const TICKET_KEY = 'dca-missing-tickets'

export function useMissingTicket() {
  const router = useRouter()
  const showMissingTicketModal = ref(false)
  const ticketContext = ref<TicketContext>({})

  /**
   * 打开缺失工单弹窗
   * @param context 页面上下文信息
   */
  const showMissingTicket = (context?: TicketContext | string) => {
    // 兼容旧用法：字符串参数视为 assetName
    if (typeof context === 'string') {
      ticketContext.value = { assetName: context }
    } else {
      ticketContext.value = context || {}
    }
    showMissingTicketModal.value = true
  }

  /** 提交回调 —— 保存到 localStorage 并跳转通知中心查看进度 */
  const handleMissingTicketConfirm = (data: any) => {
    // 保存工单到 localStorage
    let list: any[] = []
    try {
      const raw = localStorage.getItem(TICKET_KEY)
      const parsed = raw ? JSON.parse(raw) : []
      if (Array.isArray(parsed)) list = parsed
    } catch {
      list = []
    }
    list.unshift({ ...data, createdAt: new Date().toISOString() })
    localStorage.setItem(TICKET_KEY, JSON.stringify(list.slice(0, 50)))

    Message.success('工单已提交，即将跳转通知中心查看进度')
    showMissingTicketModal.value = false

    // 延迟跳转，让用户看到提示
    setTimeout(() => {
      router.push({ name: 'notifications' })
    }, 800)
  }

  return {
    showMissingTicketModal,
    ticketContext,
    showMissingTicket,
    handleMissingTicketConfirm
  }
}
