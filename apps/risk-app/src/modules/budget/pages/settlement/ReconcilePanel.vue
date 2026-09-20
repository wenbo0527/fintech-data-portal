<template>
  <div class="reconcile-panel">
    <a-form v-if="!embedded" :model="form" layout="inline" style="margin-bottom: 12px">
      <a-form-item field="supplierId" label="合作机构" required>
        <a-select v-model="form.supplierId" allow-clear placeholder="选择合作机构" style="width: 240px">
          <a-option v-for="s in supplierOptions" :key="s.value" :value="s.value">{{ s.label }}</a-option>
        </a-select>
      </a-form-item>
      <a-form-item field="month" label="账期" required>
        <a-input v-model="form.month" placeholder="YYYY-MM" style="width: 140px" />
      </a-form-item>
    </a-form>

    <div class="toolbar">
      <a-space>
        <!-- PRD R30: 对账单模板下载（含外部单价字段） -->
        <a-button @click="downloadReconciliationTemplate">下载对账单模板</a-button>
        <a-upload :auto-upload="false" :show-file-list="false" accept=".csv,.xlsx" @change="onFileChange">
          <a-button type="primary">上传对账单</a-button>
        </a-upload>
        <a-button type="outline" @click="mockUpload">模拟上传数据</a-button>
        <!-- PRD R31: 映射记录下载 -->
        <a-button @click="downloadMappingRecord">下载历史映射记录</a-button>
        <a-button type="outline" @click="mappingVisible = true">匹配映射记录</a-button>
      </a-space>
    </div>

    <!-- PRD R32: 付款账目类型字段（从对账单自动读取，显示在工具栏下方） -->
    <div v-if="callMethod" style="margin-bottom: 12px">
      <a-alert type="info" :message="`付款账目类型：${callMethod}（已从对账单自动读取）`" />
    </div>

    <a-modal v-model:visible="mappingVisible" title="外数匹配映射记录" :width="960" ok-text="保存" cancel-text="关闭" @ok="saveMapping">
      <a-space style="margin-bottom: 8px">
        <a-upload :auto-upload="false" :show-file-list="false" accept=".csv,.xlsx" @change="onMappingUpload">
          <a-button type="primary">上传映射记录</a-button>
        </a-upload>
        <a-button type="outline" @click="addMappingRow">新增一行</a-button>
      </a-space>
      <a-table :data="mappingList" :pagination="false" row-key="__id">
        <template #columns>
          <!-- PRD R33: 映射记录新增接口号字段 -->
          <a-table-column title="接口号" :width="140">
            <template #cell="{ record }">
              <a-input v-model="record.interfaceNo" placeholder="接口号" />
            </template>
          </a-table-column>
          <a-table-column title="外数产品名称" :width="240">
            <template #cell="{ record }">
              <a-select v-model="record.externalProductCode" :options="externalOptions" placeholder="选择外数产品" style="width: 220px" @change="(v:string)=>onExternalSelect(record, v)" />
            </template>
          </a-table-column>
          <a-table-column title="别名1" :width="160">
            <template #cell="{ record }">
              <a-input v-model="record.aliases[0]" placeholder="别名1" />
            </template>
          </a-table-column>
          <a-table-column title="别名2" :width="160">
            <template #cell="{ record }">
              <a-input v-model="record.aliases[1]" placeholder="别名2" />
            </template>
          </a-table-column>
          <a-table-column title="别名3" :width="160">
            <template #cell="{ record }">
              <a-input v-model="record.aliases[2]" placeholder="别名3" />
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-modal>

    <a-table :data="rows" :pagination="false" row-key="recordKey">
      <template #columns>
        <a-table-column title="上传产品名称" :width="220">
          <template #cell="{ record }">{{ record.productName }}</template>
        </a-table-column>
        <!-- PRD R32: 付款账目类型列（外部对账每条记录仅线上/线下） -->
        <a-table-column title="付款账目类型" :width="150">
          <template #cell="{ record }">
            <a-tag :color="record.callMethod === '线上' ? 'green' : record.callMethod === '线下' ? 'orange' : 'arcoblue'">{{ record.callMethod || '—' }}</a-tag>
          </template>
        </a-table-column>
        <a-table-column title="匹配状态" :width="120">
          <template #cell="{ record }">
            <a-tag :status="record.matched ? 'success' : 'warning'">{{ record.matched ? '已匹配' : '未匹配' }}</a-tag>
          </template>
        </a-table-column>
        <a-table-column title="匹配外数产品" :width="240">
          <template #cell="{ record }">
            <a-select v-model="record.productCode" :options="productOptions" placeholder="选择外数产品" style="width: 220px" @change="(v:any)=>onProductSelect(record, v)" />
          </template>
        </a-table-column>
        <a-table-column title="调用量(内部/外部)" :width="200">
          <template #cell="{ record }">{{ record.systemUsage }} / {{ record.externalUsage }}</template>
        </a-table-column>
        <a-table-column title="单价(内部/外部)" :width="200">
          <template #cell="{ record }">{{ formatPrice(record.systemUnitPrice) }} / {{ formatPrice(record.externalUnitPrice) }}</template>
        </a-table-column>
        <a-table-column title="总费用(内部/外部)" :width="220">
          <template #cell="{ record }">{{ formatAmount(record.systemAmount) }} / {{ formatAmount(record.externalAmount) }}</template>
        </a-table-column>
        <a-table-column title="减免量(内部/外部)" :width="180">
          <template #cell="{ record }">{{ (record.systemDiscount ?? 0) }} / {{ (record.externalDiscount ?? 0) }}</template>
        </a-table-column>
        <a-table-column title="最终减免量(可编辑)" :width="180">
          <template #cell="{ record }">
            <a-input-number v-model="record.finalDiscount" :min="0" :precision="0" style="width: 160px" />
          </template>
        </a-table-column>
        <a-table-column title="最终费用(可编辑)" :width="200">
          <template #cell="{ record }">
            <a-input-number v-model="record.finalAmount" :min="0" :precision="2" style="width: 180px" />
          </template>
        </a-table-column>
      </template>
    </a-table>

    <div v-if="!embedded" style="text-align: right; margin-top: 12px">
      <a-space>
        <a-button type="outline" :disabled="!rows.length" @click="saveOnly">保存对账</a-button>
        <a-button type="primary" :disabled="!rows.length" @click="enterWriteoff">进入核销</a-button>
      </a-space>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Message } from '@arco-design/web-vue'
import { useSettlementSupplier } from '../../composables/useSettlementSupplier'
import { useSettlementFlowStore } from '../../stores/settlementFlow'
import { getActivePricingMap } from '../../api/pricingArchive'
import { getSupplierProductsMock } from '../../../external-data/mock/supplierProducts'
import { useExternalDataStore } from '@/modules/external-data/stores'
import { log } from '@/utils/logger'

const flowStore = useSettlementFlowStore()
const externalDataStore = useExternalDataStore()
const { supplierOptions, loadSuppliers } = useSettlementSupplier()

const props = defineProps<{ supplierId?: string; month?: string; embedded?: boolean }>()
const embedded = computed(() => props.embedded === true)
const form = ref({ supplierId: props.supplierId || '', month: props.month || `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}` })
const externalRows = ref<any[]>([])
const rows = ref<any[]>([])
const pricingMap = ref<Record<string, any>>({})
const supplierProducts = ref<any[]>([])
// PRD R32: 付款账目类型（从对账单自动读取）
const callMethod = ref<string>('')
// PRD: 匹配外数产品下拉同时包含供应商产品与外数档案产品（外数档案含全量产品，可匹配未知产品）
const productOptions = computed(() => {
  const seen = new Set<string>()
  const list: { label: string; value: string }[] = []
  for (const p of (externalDataStore.products || []) as any[]) {
    const code = String(p?.code || p?.id || '')
    if (!code || seen.has(code)) continue
    seen.add(code)
    list.push({ label: `${p?.name || code}${p?.supplier ? `（${p.supplier}）` : ''}`, value: code })
  }
  for (const p of supplierProducts.value as any[]) {
    const code = String(p?.productCode || '')
    if (!code || seen.has(code)) continue
    seen.add(code)
    list.push({ label: `${p?.productName || code}${p?.supplierId ? `（${p.supplierId}）` : ''}`, value: code })
  }
  return list
})
const mappingVisible = ref(false)
const mappingList = ref<any[]>([])
const externalOptions = computed(() => productOptions.value)
const nameToCode = computed(() => {
  const m: Record<string, string> = {}
  for (const rec of mappingList.value) {
    const extName = supplierProducts.value.find((p: any) => p.productCode === rec.externalProductCode)?.productName || rec.externalProductName || ''
    if (extName && rec.externalProductCode) m[extName] = rec.externalProductCode
    const aliases: string[] = rec.aliases || []
    for (const a of aliases) { if (a && rec.externalProductCode) m[a] = rec.externalProductCode }
  }
  return m
})
function addMappingRow() { mappingList.value.push({ __id: `M-${Date.now()}-${Math.random()}`, interfaceNo: '', externalProductCode: '', externalProductName: '', aliases: ['', '', ''] }) }
function onExternalSelect(record: any, v: string) {
  record.externalProductCode = v
  const p = supplierProducts.value.find((sp: any) => sp.productCode === v)
  record.externalProductName = p?.productName || ''
  // PRD R33: 自动填充接口号
  if (p?.interfaceNo) record.interfaceNo = p.interfaceNo
}
function onMappingUpload(files: any) {
  try {
    const file = files?.[0] || files?.file
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result || '')
      const recs = csvToJson(text)
      recs.forEach((r: any) => {
        mappingList.value.push({ __id: `M-${Date.now()}-${Math.random()}`, interfaceNo: String(r.interfaceNo || ''), externalProductCode: String(r.externalProductCode || ''), externalProductName: String(r.externalProductName || ''), aliases: [String(r.alias1 || ''), String(r.alias2 || ''), String(r.alias3 || '')] })
      })
      Message.success('映射记录已导入')
    }
    reader.readAsText(file as File)
  } catch { Message.error('导入映射记录失败') }
}
function saveMapping() { mappingVisible.value = false; Message.success('映射记录已保存') }

// PRD R30: 对账单模板下载（含调用方式字段）
const downloadReconciliationTemplate = () => {
  const header = ['产品编码', '产品名称', '付款账目类型', '调用量', '系统金额', '账单金额', '外部单价', '差异原因']
  const csv = [header.join(','), '示例,示例产品,线上,1000,80.00,80.00,0.0800,'].join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = '对账单模板.csv'; a.click(); URL.revokeObjectURL(url)
  Message.success('对账单模板已下载（含外部单价字段）')
}
// PRD R31: 历史映射记录下载（含接口号字段）
const downloadMappingRecord = () => {
  const header = ['接口号', '产品编码', '产品名称', '合作机构', '映射字段', '备注']
  const csv = [header.join(','), 'IF-001,XUEXIN_ID_VERIFY,学籍身份核验,学信网,id_no→身份证号,'].join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = '历史映射记录.csv'; a.click(); URL.revokeObjectURL(url)
  Message.success('历史映射记录已下载（含接口号字段）')
}

const formatAmount = (n?: number) => { if (n === undefined || n === null) return '—'; return Number(n).toLocaleString('zh-CN', { style: 'currency', currency: 'CNY' }) }
const formatPrice = (n?: number) => { if (n === undefined || n === null) return '—'; return `¥${Number(n).toFixed(4)}` }
const unitLabel = (unit?: string) => unit === 'record' ? '查得' : '查询'
function normalizeHeader(h: string): string {
  const map: Record<string, string> = { '账单周期': 'period', '产品编码': 'productCode', '产品名称': 'productName', '朴道产品代码': 'productCode', '计费方式': 'billingType', '调用方式': 'callMethod', '付款账目类型': 'callMethod', '最终计费次数': 'finalCount', '减免次数': 'discountCount', '最终付费次数': 'finalPaidCount', '外部单价': 'externalUnitPrice', '单价': 'unitPrice', '金额': 'amount', '账单金额': 'amount' }
  return map[h] || h
}
function csvToJson(text: string): any[] {
  const lines = text.split(/\r?\n/).filter(Boolean)
  if (lines.length === 0) return []
  const header = (lines[0] || '').split(',').map(h => normalizeHeader(h.trim()))
  const records: any[] = []
  for (let i = 1; i < lines.length; i++) {
    const cells = (lines[i] || '').split(',').map(c => c.trim())
    const obj: any = {}
    header.forEach((h, idx) => { obj[h] = cells[idx] ?? '' })
    records.push(obj)
  }
  return records
}

// PRD R32: 从上传的对账单中自动读取付款账目类型
function normalizePaymentType(value: unknown): string {
  const valueText = String(value || '').trim()
  return valueText === '线上' || valueText === '线下' ? valueText : ''
}
function isValidPaymentType(value: unknown): boolean {
  return Boolean(normalizePaymentType(value))
}
function extractCallMethod(rows: any[]): string {
  const methods = new Set(rows.map(row => normalizePaymentType(row.callMethod)).filter(Boolean))
  if (methods.size === 2) return '线上 + 线下'
  return methods.values().next().value || ''
}

// PRD R34: 跳过费用核算后，系统数据从pricing和产品信息直接生成
function buildSystemDataFromPricing(): Record<string, { usage: number; unitPrice: number; amount: number }> {
  const result: Record<string, { usage: number; unitPrice: number; amount: number }> = {}
  for (const [code, pricing] of Object.entries(pricingMap.value)) {
    const mockUsage = Math.floor(Math.random() * 5000) + 500
    const unitPrice = Number(pricing?.unitPrice || pricing?.basePrice || 0)
    result[code] = {
      usage: mockUsage,
      unitPrice,
      amount: Number((mockUsage * unitPrice).toFixed(2))
    }
  }
  return result
}

const onFileChange = async (files: any) => {
  try {
    const file = files?.[0] || files?.file
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      const text = String(reader.result || '')
      externalRows.value = csvToJson(text)
      callMethod.value = ''
      // 外部对账每条记录必须明确为线上或线下
      if (externalRows.value.some(r => !isValidPaymentType(r.callMethod))) {
        Message.error('外部对账每条记录的付款账目类型仅支持线上或线下，请检查对账单（PRD E8）')
        return
      }
      // PRD R32: 汇总展示付款账目类型
      const cm = extractCallMethod(externalRows.value)
      if (cm) {
        callMethod.value = cm
        Message.success(`对账单解析成功，付款账目类型：${cm}（已自动读取）`)
      } else {
        Message.warning('对账单缺少付款账目类型字段，请补充后重新上传（PRD E7）')
      }
      // 外部对账每条记录的付款账目类型必须明确且唯一
      await buildRows()
    }
    reader.readAsText(file as File)
  } catch (e) { Message.error('解析对账单失败') }
}

const buildRows = async () => {
  if (!form.value.supplierId || !form.value.month) { Message.error('请选择合作机构与账期'); return }
  pricingMap.value = await getActivePricingMap(form.value.supplierId)
  supplierProducts.value = await getSupplierProductsMock(form.value.supplierId)

  // PRD R34: 跳过费用核算后，从pricing直接生成系统数据（不依赖costing快照）
  const costing = flowStore.getCosting(form.value.supplierId, form.value.month)
  let sysByProduct: Record<string, { usage: number; unitPrice: number; amount: number }>
  if (costing && costing.lines) {
    // 有costing快照时走原逻辑
    sysByProduct = {}
    for (const l of costing.lines) {
      if (costing.excluded[l.lineId]) continue
      const key = l.productCode
      const prev = sysByProduct[key] || { usage: 0, unitPrice: l.unitPrice, amount: 0 }
      prev.usage += Number(l.usageQty) || 0
      prev.amount += Number(l.amountInclTax) || 0
      prev.unitPrice = l.unitPrice
      sysByProduct[key] = prev
    }
  } else {
    // 无costing快照（跳过费用核算），从pricing直接生成
    sysByProduct = buildSystemDataFromPricing()
  }

  rows.value = externalRows.value.map((e: any) => {
    let code = String(e.productCode || e.product || e.code || '')
    const name = String(e.productName || '')
    if (!pricingMap.value[code]) {
      const mapped = nameToCode.value[name]
      if (mapped) code = mapped
    }
    const sys = sysByProduct[code] || { usage: 0, unitPrice: 0, amount: 0 }
    const unit = pricingMap.value[code]?.unit
    const billingTypeLabel = unitLabel(unit)
    const extUsage = Number(e.finalPaidCount || e.finalCount || e.usageQty || e.usage || 0)
    const extUnit = Number(e.externalUnitPrice ?? e.unitPrice ?? 0)
    const extAmount = Number(e.amount || e.amountInclTax || (extUnit * extUsage) || 0)
    const sysDiscount = costing ? (costing.lines?.find((l: any) => l.productCode === code)?.freeDeducted || 0) : 0
    const extDiscount = Number(e.discountCount || e.discount || 0)
    return {
      recordKey: `${code}-${externalRows.value.indexOf(e)}`,
      productCode: code,
      productName: name || (supplierProducts.value.find((p: any) => p.productCode === code)?.productName || code),
      callMethod: normalizePaymentType(e.callMethod) || normalizePaymentType(callMethod.value),
      matched: Boolean(pricingMap.value[code]),
      billingTypeLabel,
      originalProductName: name,
      systemUsage: sys.usage,
      systemUnitPrice: sys.unitPrice,
      systemAmount: Number(sys.amount.toFixed(2)),
      systemDiscount: sysDiscount,
      externalDiscount: extDiscount,
      finalDiscount: extDiscount,
      externalUsage: extUsage,
      externalUnitPrice: extUnit,
      externalAmount: Number(extAmount.toFixed(2)),
      finalAmount: Number(extAmount.toFixed(2))
    }
  })
  const firstPeriod = String(externalRows.value?.[0]?.period || '')
  if (firstPeriod && firstPeriod !== form.value.month) { Message.warning(`对账单账期(${firstPeriod})与当前账期(${form.value.month})不一致`) }
  log('reconcile.buildRows', { supplierId: form.value.supplierId, month: form.value.month, count: rows.value.length })
}

const saveSnapshotInternal = () => {
  const items = rows.value.map((r: any) => {
    const matched = isExternalProductCode(String(r.productCode || ''))
    return {
      productCode: r.productCode,
      productName: r.productName,
      originalProductName: r.originalProductName || r.productName,
      matchedProductCode: matched ? String(r.productCode) : '',
      matchedProductName: matched ? (r.productName || '') : '',
      systemAmount: r.systemAmount,
      externalAmount: r.externalAmount,
      externalUnitPrice: r.externalUnitPrice,
      finalAmount: r.finalAmount,
      finalDiscount: r.finalDiscount,
      callMethod: normalizePaymentType(r.callMethod),
      reason: r.reason
    }
  })
  flowStore.setReconcileSnapshot(form.value.supplierId, form.value.month, items)
}
// PRD: 判断 code 是否来自外数档案（外数档案 code 形如 ED-001）
function isExternalProductCode(code: string): boolean {
  if (!code) return false
  return (externalDataStore.products || []).some((p: any) => String(p?.code || p?.id) === code)
}
const saveOnly = (): boolean => { saveSnapshotInternal(); Message.success('对账结果已保存'); return true }
const enterWriteoff = (): boolean => {
  if (!rows.value.length) { Message.error('请先加载并填写对账数据'); return false }
  saveSnapshotInternal()
  flowStore.markReconcileCompleted(form.value.supplierId, form.value.month, true)
  Message.success('已保存并进入核销')
  log('reconcile.enterWriteoff', { supplierId: form.value.supplierId, month: form.value.month })
  return true
}

const mockUpload = async () => {
  const sidLocal = form.value.supplierId || props.supplierId || ''
  const monLocal = form.value.month || props.month || `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}`
  form.value.supplierId = sidLocal
  form.value.month = monLocal
  if (!form.value.supplierId || !form.value.month) { Message.error('请选择合作机构与账期'); return }
  pricingMap.value = await getActivePricingMap(form.value.supplierId)
  supplierProducts.value = await getSupplierProductsMock(form.value.supplierId)
  if (!externalDataStore.products.length) {
    try { await externalDataStore.fetchProducts() } catch {}
  }

  const costing = flowStore.getCosting(form.value.supplierId, form.value.month)
  // PRD R32: 模拟对账单含付款账目类型字段
  const header = ['账单周期','产品名称','朴道产品代码','付款账目类型','计费方式','最终计费次数','减免次数','最终付费次数','外部单价','金额']
  const csvRows: string[] = [header.join(',')]

  let lines: any[] = []
  if (costing && costing.lines) {
    lines = costing.lines.filter((l: any) => !costing.excluded[l.lineId])
  } else {
    // PRD R34: 无costing快照时，从pricing直接生成模拟数据
    lines = Object.entries(pricingMap.value).map(([code, p]: [string, any]) => ({
      productCode: code,
      productName: supplierProducts.value.find((sp: any) => sp.productCode === code)?.productName || code,
      unitPrice: Number(p?.unitPrice || p?.basePrice || 0),
      externalUnitPrice: Number(p?.unitPrice || p?.basePrice || 0),
      usageQty: Math.floor(Math.random() * 5000) + 500
    }))
  }

  // 无生效定价档案（如钱塘征信等尚未配置 mock 定价）时 lines 为空，
  // 此前 Math.max(1, ...) 会让循环多跑一次并读到 undefined，抛 productCode 错误
  if (!lines.length) {
    Message.warning('该合作机构暂无生效定价档案，无法生成模拟对账单，请先在定价档案中维护')
    return
  }

  const includeCount = Math.max(1, Math.floor(lines.length * 0.7))
  for (let i = 0; i < includeCount; i++) {
    const l = lines[i]
    const btype = pricingMap.value[l.productCode]?.billingType
    const billingLabel = btype === 'fixed' ? '固定' : btype === 'tiered' ? '阶梯' : btype === 'special' ? '特殊' : '按量'
    const finalCount = Math.max(0, Math.floor(Number(l.usageQty) || 0))
    const discount = Math.floor(finalCount * 0.05)
    const finalPaid = Math.max(0, finalCount - discount)
    const unit = Number(l.unitPrice || 0)
    const amount = Number((unit * finalPaid).toFixed(2))
    // Mock 外部对账每条记录仅使用一种付款账目类型
    const cm = i % 2 === 0 ? '线上' : '线下'
    const externalUnitPrice = Number(l.externalUnitPrice ?? l.unitPrice ?? 0)
    csvRows.push([ form.value.month, l.productName, l.productCode, cm, billingLabel, String(finalCount), String(discount), String(finalPaid), externalUnitPrice.toFixed(4), amount.toFixed(2) ].join(','))
  }
  const unknowns = [ { productName: '未知产品A', productCode: 'EXT_UNKNOWN_A', externalUnitPrice: 0.055, paid: 1200 }, { productName: '未知产品B', productCode: 'EXT_UNKNOWN_B', externalUnitPrice: 0.045, paid: 800 } ]
  for (const u of unknowns) {
    const amount = Number((u.externalUnitPrice * u.paid).toFixed(2))
    csvRows.push([ form.value.month, u.productName, u.productCode, '线下', '查询', String(u.paid), '0', String(u.paid), u.externalUnitPrice.toFixed(4), amount.toFixed(2) ].join(','))
  }
  const text = csvRows.join('\n')
  externalRows.value = csvToJson(text)
  // PRD R32: 自动读取付款账目类型
  callMethod.value = extractCallMethod(externalRows.value)
  await buildRows()
  Message.success('已生成并载入模拟对账单，付款账目类型已自动读取')
  log('reconcile.mockUpload', { supplierId: form.value.supplierId, month: form.value.month, count: rows.value.length })
}
function onProductSelect(record: any, v: string) {
  record.productCode = v
  const p = supplierProducts.value.find((sp: any) => sp.productCode === v)
  record.productName = p?.productName || v
  const unit = pricingMap.value[v]?.unit
  record.billingTypeLabel = unitLabel(unit)
  const costing = flowStore.getCosting(form.value.supplierId, form.value.month)
  if (costing) {
    const sysLine = costing.lines.find((l: any) => l.productCode === v && !costing.excluded[l.lineId])
    if (sysLine) {
      record.systemUsage = Number(sysLine.usageQty) || 0
      record.systemUnitPrice = Number(sysLine.unitPrice) || 0
      const amount = Number(sysLine.amountInclTax) || 0
      record.systemAmount = Number(amount.toFixed(2))
      record.matched = true
    } else {
      record.systemUsage = 0
      record.systemUnitPrice = 0
      record.systemAmount = 0
      record.matched = Boolean(pricingMap.value[v])
    }
  } else {
    // PRD R34: 无costing快照时，从pricing获取系统数据
    const pricing = pricingMap.value[v]
    if (pricing) {
      const mockUsage = Math.floor(Math.random() * 5000) + 500
      record.systemUsage = mockUsage
      record.systemUnitPrice = Number(pricing.unitPrice || pricing.basePrice || 0)
      record.systemAmount = Number((mockUsage * record.systemUnitPrice).toFixed(2))
      record.matched = true
    }
  }
}
onMounted(async () => {
  try { await loadSuppliers() } catch {}
  // PRD: 加载外数档案产品列表，用于"匹配外数产品"下拉（含未知产品可选）
  if (!externalDataStore.products.length) {
    try { await externalDataStore.fetchProducts() } catch {}
  }
  if (form.value.supplierId) {
    supplierProducts.value = await getSupplierProductsMock(form.value.supplierId)
    pricingMap.value = await getActivePricingMap(form.value.supplierId)
  }
  if (props.supplierId && props.month) { await buildRows() }
})
watch(() => props.supplierId, async (sid?: string) => {
  form.value.supplierId = sid || ''
  if (form.value.supplierId) {
    supplierProducts.value = await getSupplierProductsMock(form.value.supplierId)
    pricingMap.value = await getActivePricingMap(form.value.supplierId)
  }
  if (form.value.supplierId && form.value.month) await buildRows()
})
watch(() => props.month, async (m?: string) => { form.value.month = m || `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}`; if (form.value.supplierId && form.value.month) await buildRows() })

defineExpose({
  save: saveOnly,
  complete: enterWriteoff
})
</script>

<style scoped>
.reconcile-panel { width: 100%; }
.toolbar { margin-bottom: 12px; display: flex; justify-content: flex-end; }
</style>
