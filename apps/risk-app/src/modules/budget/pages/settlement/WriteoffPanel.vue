<template>
  <div class="writeoff-panel">
    <a-form v-if="!embedded" :model="form" layout="inline" style="margin-bottom: 12px">
      <a-form-item field="supplierId" label="合作机构" required>
        <a-select v-model="form.supplierId" allow-clear placeholder="选择合作机构" style="width: 240px">
          <a-option v-for="s in supplierOptions" :key="s.value" :value="s.value">{{ s.label }}</a-option>
        </a-select>
      </a-form-item>
      <!-- 原「对接渠道」筛选项已剔除（2026-11-03）：档案渠道轴下线后它已无上游口径，
           且候选直接复用 supplierOptions（与左边的合作机构一模一样），选中后也没人读 form.channelId -->
      <a-form-item field="month" label="账期" required>
        <a-input v-model="form.month" placeholder="YYYY-MM" style="width: 140px" />
      </a-form-item>
      <a-form-item>
        <a-button type="primary" @click="loadPending">加载待核销</a-button>
      </a-form-item>
    </a-form>
    <div class="toolbar">
      <a-space>
        <a-button type="outline" @click="supplementMockData">补充mock数据</a-button>
        <a-button type="outline" @click="supplementContractMock">补充合同Mock</a-button>
        <a-button type="outline" @click="loadPending">加载待核销</a-button>
      </a-space>
    </div>

    <a-table :data="productRows" :pagination="false" row-key="productCode">
      <template #columns>
        <!-- PRD R35: 已结算过的外数产品名称标红 -->
        <a-table-column title="产品名称" :width="200">
          <template #cell="{ record }">
            <span :style="{ color: record.previouslySettled ? '#f53f3f' : 'inherit', fontWeight: record.previouslySettled ? 'bold' : 'normal' }">
              {{ record.productName }}
            </span>
            <!-- PRD R36: 展示上次结算信息 -->
            <div v-if="record.previouslySettled && record.lastSettlement" style="font-size: 11px; color: #f53f3f; margin-top: 2px;">
              上次：单价{{ formatAmount(record.lastSettlement.unitPrice) }} / 调用量{{ record.lastSettlement.usageQty }} / 减免{{ record.lastSettlement.freeDeducted }} / 费用{{ formatAmount(record.lastSettlement.totalAmount) }}
            </div>
          </template>
        </a-table-column>
        <a-table-column title="待核销总费用 (总额 / 剩余)" :width="240">
          <template #cell="{ record }">
            <span>{{ formatAmount(record.totalAmount) }} / <span :style="{ color: record.pendingAmount > 0 ? 'var(--subapp-warning)' : 'var(--subapp-success)', fontWeight: 'bold' }">{{ formatAmount(record.pendingAmount) }}</span></span>
          </template>
        </a-table-column>
        <a-table-column title="待核销减免量 (总额 / 剩余)" :width="200">
          <template #cell="{ record }">
            <span>{{ record.totalDiscount }} / <span :style="{ color: record.pendingDiscount > 0 ? 'var(--subapp-warning)' : 'var(--subapp-success)', fontWeight: 'bold' }">{{ record.pendingDiscount }}</span></span>
          </template>
        </a-table-column>
        <a-table-column title="选择合同与核销金额" :width="620">
          <template #cell="{ record }">
            <a-space>
              <a-space direction="vertical">
                <a-space v-for="(w, idx) in record.writeoffs" :key="idx" align="start">
                  <div style="display: flex; flex-direction: column">
                    <a-select v-model="w.contractId" placeholder="选择合同" style="width: 220px" @change="(val:string)=>onContractSelect(record, idx, val)">
                      <a-option v-for="c in availableContracts" :key="c.id" :value="c.id">
                        <span :style="{ color: c.contractType === 'framework' ? 'var(--subapp-primary)' : 'var(--subapp-warning)' }">
                          【{{ c.contractType === 'framework' ? '框架' : '补充' }}】
                        </span>
                        {{ c.contractName }}（剩余：{{ formatAmount(contractRemaining(c)) }}，免费：{{ contractRemainingFree(c) }}）
                      </a-option>
                    </a-select>
                    <span v-if="w.contractId" style="font-size: 12px; color: var(--subapp-text-tertiary); margin-top: 2px">
                      剩余金额：{{ formatAmount(selectedContractRemain(w.contractId)) }} | 免费量：{{ selectedContractRemainFree(w.contractId) }}
                    </span>
                  </div>
                  <a-tooltip content="核销金额">
                    <a-input-number v-model="w.amount" :min="0" :max="record.pendingAmount" :precision="2" :disabled="!w.contractId || (record.pendingAmount <= 0 && record.pendingDiscount <= 0)" placeholder="金额" style="width: 100px" />
                  </a-tooltip>
                  <a-tooltip content="核销减免量">
                    <a-input-number v-model="w.discountAmount" :min="0" :max="record.pendingDiscount" :precision="0" :disabled="!w.contractId || (record.pendingAmount <= 0 && record.pendingDiscount <= 0)" placeholder="减免" style="width: 80px" />
                  </a-tooltip>
                  <a-button size="small" type="primary" :disabled="record.pendingAmount <= 0 && record.pendingDiscount <= 0" @click="confirmWriteoff(record, idx)">执行</a-button>
                </a-space>
                
                <!-- 核销记录明细外露 -->
                <div v-if="getProductHistory(record.productCode).length > 0" style="margin-top: 8px; background: #f7f8fa; padding: 8px; border-radius: 4px;">
                  <div style="font-size: 12px; color: var(--subapp-text-tertiary); margin-bottom: 4px;">已核销记录：</div>
                  <a-space direction="vertical" size="mini">
                    <div v-for="h in getProductHistory(record.productCode)" :key="h.id" style="display: flex; align-items: center; gap: 8px; font-size: 12px;">
                      <a-tag size="small" color="arcoblue">{{ selectedContractName(h.contractId) }}</a-tag>
                      <span>{{ formatAmount(h.amount) }}</span>
                      <span v-if="h.discountAmount" style="color: var(--subapp-text-tertiary)"> (减免: {{ h.discountAmount }})</span>
                      <a-popconfirm content="确定撤销此笔核销？" @ok="revokeRecord(h)">
                        <a-button type="text" size="mini" status="danger" style="padding: 0 4px; height: 20px;">
                          <template #icon><icon-close /></template>
                        </a-button>
                      </a-popconfirm>
                    </div>
                  </a-space>
                </div>
              </a-space>
            </a-space>
          </template>
        </a-table-column>
        <a-table-column title="状态" :width="160">
          <template #cell="{ record }">
            <a-tag :status="(record.pendingAmount <= 0 && record.pendingDiscount <= 0) ? 'success' : 'warning'">{{ (record.pendingAmount <= 0 && record.pendingDiscount <= 0) ? '核销完成' : '待核销' }}</a-tag>
          </template>
        </a-table-column>
        <a-table-column title="操作" :width="120">
          <template #cell="{ record }">
            <a-space direction="vertical">
              <a-space v-for="(w, idx) in record.writeoffs" :key="idx" style="height: 32px; display: flex; align-items: center;">
                <a-tooltip content="编辑备注">
                  <a-button size="small" :type="w.remark ? 'primary' : 'outline'" @click="openRemarkModal(record, idx)">
                    <template #icon><icon-edit /></template>
                    备注
                  </a-button>
                </a-tooltip>
              </a-space>
            </a-space>
          </template>
        </a-table-column>
      </template>
    </a-table>

    <div v-if="!embedded" style="text-align: right; margin-top: 12px">
      <a-space>
        <a-button type="primary" :disabled="productRows.every(r => r.pendingAmount > 0 || r.pendingDiscount > 0)" @click="finishTask">完成核销并生成报告</a-button>
      </a-space>
    </div>

    <a-modal v-model:visible="remarkVisible" title="核销备注" @ok="saveRemark">
      <a-textarea v-model="currentRemark" placeholder="请输入备注信息" :auto-size="{ minRows: 3, maxRows: 6 }" />
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Message } from '@arco-design/web-vue'
import { useRouter } from 'vue-router'
import { IconEdit, IconHistory, IconClose } from '@arco-design/web-vue/es/icon'
import { useContractStore } from '../../stores/contract'
import { useSettlementSupplier } from '../../composables/useSettlementSupplier'
import { useSettlementFlowStore, WriteoffRecord } from '../../stores/settlementFlow'
import { generateBillLines } from '../../utils/costing'
import { getSupplierProductsMock } from '../../../external-data/mock/supplierProducts'
import { createSettlementTask } from '../../api/settlement'
import { log } from '@/utils/logger'

const store = useContractStore()
const flowStore = useSettlementFlowStore()
const router = useRouter()
const { supplierOptions, getSupplierName, loadSuppliers } = useSettlementSupplier()

const props = defineProps<{ supplierId?: string; month?: string; embedded?: boolean }>()
const embedded = computed(() => props.embedded === true)
const form = ref({ supplierId: props.supplierId || '', month: props.month || `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}` })
const productRows = ref<any[]>([])
const supplierProducts = ref<any[]>([])

const remarkVisible = ref(false)
const currentRemark = ref('')
const editingTarget = ref<{ row: any, index: number } | null>(null)
  
  const getProductHistory = (productCode: string) => {
  const allRecords = flowStore.getWriteoff(form.value.supplierId, form.value.month)?.records || []
  return allRecords.filter(r => r.productCode === productCode).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

const revokeRecord = (record: WriteoffRecord) => {
  try {
    // 1. 恢复合同余额
    store.restoreBalance(record.contractId, record.amount, record.discountAmount || 0)
    // 2. 删除核销记录
    flowStore.revokeWriteoffRecord(form.value.supplierId, form.value.month, record.id)
    // 3. 刷新列表 (不再需要，因为直接使用 getProductHistory 计算属性)
    // historyRecords.value = historyRecords.value.filter(r => r.id !== record.id)
    
    // 4. 更新页面上的待核销金额
    const row = productRows.value.find(r => r.productCode === record.productCode)
    if (row) {
      row.pendingAmount = Number((row.pendingAmount + record.amount).toFixed(2))
      row.pendingDiscount = Number((row.pendingDiscount + (record.discountAmount || 0)).toFixed(0))
    }
    
    Message.success('撤销成功')
  } catch (error) {
    Message.error('撤销失败')
  }
}

const openRemarkModal = (row: any, index: number) => {
  editingTarget.value = { row, index }
  currentRemark.value = row.writeoffs[index].remark || ''
  remarkVisible.value = true
}

const saveRemark = () => {
  if (editingTarget.value) {
    const { row, index } = editingTarget.value
    if (row.writeoffs[index]) {
      row.writeoffs[index].remark = currentRemark.value
    }
  }
  remarkVisible.value = false
}

const availableContracts = computed(() => {
  const name = getSupplierName(form.value.supplierId)
  return store.list.filter((c: any) => c.status === 'active' && (c.supplier === name || c.supplier === form.value.supplierId))
})

const contractRemaining = (c: any) => {
  const total = Number(c.amount) || 0
  const off = Number(c.writtenOffAmount) || 0
  return Math.max(0, total - off)
}
const contractRemainingFree = (c: any) => {
  const total = Number(c.totalFreeQuota) || 0
  const used = Number(c.usedFreeQuota) || 0
  return Math.max(0, total - used)
}
const selectedContractRemain = (id: string) => {
  const c = store.list.find((i: any) => i.id === id)
  return c ? contractRemaining(c) : 0
}
const selectedContractRemainFree = (id: string) => {
  const c = store.list.find((i: any) => i.id === id)
  return c ? contractRemainingFree(c) : 0
}
const selectedContractName = (id: string) => {
  const c = store.list.find((i: any) => i.id === id)
  return c ? c.contractName : '—'
}
const onContractSelect = (row: any, index: number, contractId: string) => {
  const remain = selectedContractRemain(contractId)
  const auto = Math.min(row.pendingAmount || 0, remain || 0)
  row.writeoffs[index].contractId = contractId
  row.writeoffs[index].amount = Number(auto.toFixed(2))
  row.writeoffs[index].discountAmount = 0
}
const goContractDetail = (id: string) => { if (!id) return; router.push(`/budget/contracts/${encodeURIComponent(id)}`) }
const addWriteoffLineAt = (row: any, index: number) => { const insertIndex = Math.min((index ?? 0) + 1, row.writeoffs.length); row.writeoffs.splice(insertIndex, 0, { contractId: '', amount: 0, discountAmount: 0, remark: '' }) }
const deleteWriteoffLine = (row: any, index: number) => {
  if (!Array.isArray(row.writeoffs)) row.writeoffs = []
  if (row.writeoffs.length <= 1) { row.writeoffs[0] = { contractId: '', amount: 0, discountAmount: 0, remark: '' }; return }
  row.writeoffs.splice(index, 1)
}
const formatAmount = (n?: number) => { if (n === undefined || n === null) return '—'; return Number(n).toLocaleString('zh-CN', { style: 'currency', currency: 'CNY' }) }
const loadPending = () => {
  if (!form.value.supplierId || !form.value.month) { Message.error('请选择合作机构与账期'); return }
  const byProduct = flowStore.pendingAmountByProduct(form.value.supplierId, form.value.month)
  const discountByProduct = flowStore.pendingDiscountByProduct(form.value.supplierId, form.value.month)
  const reconcile = flowStore.getReconcile(form.value.supplierId, form.value.month)
  productRows.value = Object.keys(byProduct).map(code => {
    const name = supplierProducts.value.find((p: any) => p.productCode === code)?.productName || code
    const originalItem = reconcile?.items.find((i: any) => i.productCode === code)
    const totalAmount = originalItem?.finalAmount || 0
    const totalDiscount = originalItem?.finalDiscount || 0
    // PRD R35/R36: 非首次结算时，标记已结算产品并展示上次结算信息
    const writeoffHistory = flowStore.writeoffByKey?.[`${form.value.supplierId}-${form.value.month}`]
    const prevSettledCodes = writeoffHistory?.records?.map((r: any) => r.productCode) || []
    const isPrevSettled = prevSettledCodes.includes(code)
    const lastRecord = writeoffHistory?.records?.filter((r: any) => r.productCode === code).pop()
    const pricing = supplierProducts.value.find((p: any) => p.productCode === code)
    return { 
      productCode: code, 
      productName: name, 
      totalAmount,
      totalDiscount,
      pendingAmount: Number(byProduct[code].toFixed(2)), 
      pendingDiscount: Number((discountByProduct[code] || 0).toFixed(0)), 
      writeoffs: [{ contractId: '', amount: 0, discountAmount: 0, remark: '' }],
      previouslySettled: isPrevSettled,
      lastSettlement: lastRecord ? {
        unitPrice: pricing?.unitPrice || 0,
        usageQty: (originalItem as any)?.usageQty || 0,
        freeDeducted: lastRecord.discountAmount || originalItem?.finalDiscount || 0,
        totalAmount: lastRecord.amount || totalAmount
      } : undefined
    }
  })
  if (!productRows.value.length) Message.info('当前无待核销产品')
  log('writeoff.loadPending', { supplierId: form.value.supplierId, month: form.value.month, count: productRows.value.length })
}
const addWriteoffLine = (row: any) => { row.writeoffs.push({ contractId: '', amount: 0, discountAmount: 0, remark: '' }) }
const supplementMockData = async () => {
  const sid = form.value.supplierId || ''
  const mon = form.value.month || ''
  if (!sid || !mon) { Message.error('请选择合作机构与账期'); return }
  log('writeoff.mock.start', { supplierId: sid, month: mon })
  let costing = flowStore.getCosting(sid, mon)
  if (!costing) {
    const lines = await generateBillLines(sid, mon)
    flowStore.setCostingSnapshot(sid, mon, lines, {}, {})
    costing = flowStore.getCosting(sid, mon)
  }
  if (!costing) { Message.error('生成核算快照失败'); return }
  const lines = costing.lines.filter((l: any) => !costing.excluded[l.lineId])
  const pick = lines.slice(0, Math.min(6, lines.length))
  const items = pick.map((l: any, index: number) => {
    const sysAmt = Number(l.amountInclTax || 0)
    const extAmt = Number((sysAmt * 1.02).toFixed(2))
    const paymentType = l.paymentType === '线上' ? '线上' : l.paymentType === '线下' ? '线下' : (index % 2 === 0 ? '线上' : '线下')
    return { productCode: l.productCode, productName: l.productName, systemAmount: Number(sysAmt.toFixed(2)), externalAmount: extAmt, externalUnitPrice: Number(l.externalUnitPrice ?? l.unitPrice ?? 0), finalAmount: extAmt, finalDiscount: 10, callMethod: paymentType, reason: '' }
  })
  flowStore.setReconcileSnapshot(sid, mon, items)
  const c = availableContracts.value[0]
  if (c && items.length) {
    const it = items[0]
    const amt = Number((it.finalAmount * 0.3).toFixed(2))
    const remainAfter = Number((it.finalAmount - amt).toFixed(2))
    flowStore.addWriteoffRecord(sid, mon, { productCode: it.productCode, contractId: c.id, amount: amt, discountAmount: 5, remainingAfter: remainAfter, createdAt: new Date().toISOString() })
  }
  Message.success('已补充mock数据')
  loadPending()
  log('writeoff.mock.done', { supplierId: sid, month: mon, items: items.length })
}
const supplementContractMock = async () => {
  const sid = form.value.supplierId || ''
  const mon = form.value.month || ''
  if (!sid || !mon) { Message.error('请选择供应商与账期'); return }
  const supplierName = getSupplierName(sid) || sid
  const now = Date.now()
  const makeDate = (offsetDays: number) => new Date(now + offsetDays * 86400000).toISOString()
  await store.createContract({ contractNo: `HT-${Math.floor(now % 100000)}`, contractName: `${supplierName} 核销演示框架合同`, supplier: supplierName, amount: 500000, startDate: makeDate(0), endDate: makeDate(60), status: 'active', writtenOffAmount: 100000, totalFreeQuota: 10000, usedFreeQuota: 2000 } as any)
  await store.createContract({ contractNo: `HT-${Math.floor((now+1) % 100000)}`, contractName: `${supplierName} 核销演示补充协议`, supplier: supplierName, amount: 200000, startDate: makeDate(0), endDate: makeDate(90), status: 'active', writtenOffAmount: 20000, totalFreeQuota: 5000, usedFreeQuota: 100 } as any)
  Message.success('已补充合同Mock数据')
}
const confirmWriteoff = (row: any, idx: number) => {
  const entry = row.writeoffs[idx]
  if (!entry || !entry.contractId) { Message.error('请选择合同'); return }
  const amt = Number(entry.amount || 0)
  const discountAmt = Number(entry.discountAmount || 0)
  if (amt <= 0 && discountAmt <= 0) { Message.error('请输入核销金额或减免量'); return }
  const c = store.list.find((i: any) => i.id === entry.contractId)
  if (!c) { Message.error('合同不存在'); return }
  const remain = contractRemaining(c)
  if (amt > remain) { Message.error('超过合同剩余可核销费用'); return }
  if (amt > row.pendingAmount) { Message.error('超过当前产品待核销总费用'); return }
  if (discountAmt > row.pendingDiscount) { Message.error('超过当前产品待核销减免量'); return }
  
  const next = { ...c, writtenOffAmount: Number(c.writtenOffAmount || 0) + amt, usedFreeQuota: Number(c.usedFreeQuota || 0) + discountAmt }
  const contractIndex = store.list.findIndex((i: any) => i.id === c.id)
  if (contractIndex >= 0) store.list.splice(contractIndex, 1, next)
  // row.pendingAmount = Number((row.pendingAmount - amt).toFixed(2))
  // row.pendingDiscount = Number((row.pendingDiscount - discountAmt).toFixed(0))
  // 使用新的计算方式更新 pendingAmount，不直接修改 row
  flowStore.addWriteoffRecord(form.value.supplierId, form.value.month, { productCode: row.productCode, contractId: c.id, amount: amt, discountAmount: discountAmt, remainingAfter: contractRemaining(next), remark: entry.remark || '', createdAt: new Date().toISOString() })
  
  // 重新计算该行的待核销金额，以保持数据一致性
  const byProduct = flowStore.pendingAmountByProduct(form.value.supplierId, form.value.month)
  const discountByProduct = flowStore.pendingDiscountByProduct(form.value.supplierId, form.value.month)
  row.pendingAmount = Number((byProduct[row.productCode] || 0).toFixed(2))
  row.pendingDiscount = Number((discountByProduct[row.productCode] || 0).toFixed(0))

  // 智能重置输入框：
  // 1. 如果还有待核销金额或减免量，尝试自动填入 min(剩余待核销, 当前合同剩余)
  // 2. 如果当前合同已无余额，清空合同选择，提示切换
  if (row.pendingAmount > 0 || row.pendingDiscount > 0) {
    const currentRemain = contractRemaining(next)
    const currentRemainFree = contractRemainingFree(next)
    
    // 只要合同还有余额或免费量，且能匹配上待核销的需求，就继续使用
    const canCoverAmount = row.pendingAmount > 0 && currentRemain > 0
    const canCoverDiscount = row.pendingDiscount > 0 && currentRemainFree > 0
    
    if (canCoverAmount || canCoverDiscount || (row.pendingAmount === 0 && row.pendingDiscount === 0)) {
       // 合同还有可用额度（金额或免费量），自动填入
       if (row.pendingAmount > 0) {
         entry.amount = Number(Math.min(row.pendingAmount, currentRemain).toFixed(2))
       } else {
         entry.amount = 0
       }
       
       if (row.pendingDiscount > 0) {
         entry.discountAmount = Math.min(row.pendingDiscount, currentRemainFree)
       } else {
         entry.discountAmount = 0
       }
       
       Message.success('核销已执行，已自动填入剩余可用额度')
    } else {
      // 合同虽然可能还有某种余额，但无法覆盖当前剩余的待核销项（例如：只剩免费量但待核销只有金额，或反之），
      // 或者合同彻底空了。这里简化处理：只要当前合同无法继续从待核销中扣除任何一项，就提示切换。
      // 更精细的逻辑是：如果 pendingAmount > 0 但 currentRemain == 0，提示金额不足；
      // 如果 pendingDiscount > 0 但 currentRemainFree == 0，提示免费量不足。
      // 为保持交互简单，统一提示切换。
      
      entry.contractId = ''
      entry.amount = 0
      entry.discountAmount = 0
      Message.success('核销已执行，当前合同剩余额度不足以继续核销，请切换合同')
    }
  } else {
    // 待核销金额和减免量均已清零
    entry.amount = 0
    entry.discountAmount = 0
    Message.success('该产品核销已全部完成')
  }

  log('writeoff.confirm', { productCode: row.productCode, contractId: c.id, amount: amt, discountAmount: discountAmt, remark: entry.remark })
}
const finishTask = async (): Promise<boolean> => {
  const allDone = productRows.value.every(r => r.pendingAmount <= 0 && r.pendingDiscount <= 0)
  if (!allDone) { Message.error('仍有待核销费用或减免量未完成'); return false }
  
  try {
    await createSettlementTask({
      supplierIds: [form.value.supplierId],
      contractIds: [],
      granularity: 'month',
      timeLabel: form.value.month,
      createdBy: '管理员',
      stage: 'pending_reimbursement',
      taskName: `核销-${form.value.supplierId}-${form.value.month}`
    } as any)
  } catch (e) {
    Message.warning('保存任务状态失败，已先行进入下一步')
  }

  Message.success('全部产品核销完成，进入待报销阶段')
  log('writeoff.finish', { supplierId: form.value.supplierId, month: form.value.month })
  flowStore.markWriteoffCompleted(form.value.supplierId, form.value.month, true)
  return true
}
onMounted(async () => {
  try { await loadSuppliers() } catch {}
  supplierProducts.value = await getSupplierProductsMock(form.value.supplierId || props.supplierId || '')
  if (props.supplierId && props.month) { loadPending() }
})
watch(() => props.supplierId, (sid?: string) => { form.value.supplierId = sid || '' })
watch(() => props.month, (m?: string) => { form.value.month = m || `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}` })

defineExpose({
  save: (): boolean => { Message.success('核销进度已保存'); return true },
  complete: finishTask
})
</script>

<style scoped>
.writeoff-panel { width: 100%; }
.toolbar { margin-bottom: 12px; display: flex; justify-content: flex-end; }
</style>
