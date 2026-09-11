<!--
  批量导入需求
  - 填写需求名称后上传文件，系统自动解析并展示文档内容
  - 不限定模板：解析 Excel/CSV 中匹配"特征英文名""中文名"的列
  - 仅保留一个文件上传入口：上传的需求文档同时作为附件挂载到本批次所有需求
  - 支持手动添加 / 删除需求行
  - 解析失败或无有效列时回退 mock 示例数据，保证 Demo 可展示解析结果
-->
<template>
  <a-modal
    :visible="visible"
    :width="760"
    :mask-closable="false"
    :footer="false"
    :modal-style="{ padding: 0 }"
    unmount-on-close
    @cancel="onCancel"
  >
    <!-- 头部 -->
    <div class="modal-header">
      <div>
        <div class="title">{{ isDemandMode ? '批量注册特征' : '批量导入需求' }}</div>
        <div class="sub">{{
          isDemandMode
            ? '从选中的需求批量注册特征，统一配置共性元数据后逐行补充差异字段'
            : '填写需求名称后上传文件，系统自动解析并展示文档内容'
        }}</div>
      </div>
      <div class="close-btn" @click="onCancel">✕</div>
    </div>

    <!-- 内容 -->
    <div class="modal-body">
      <!-- ====== demand 模式：批量注册 ====== -->
      <template v-if="isDemandMode">
        <!-- 统一配置区 -->
        <div class="unified-config">
          <div class="uc-title">统一配置区（一次填写，应用到所有行）</div>
          <div class="uc-grid">
            <div class="uc-item">
              <div class="label">字段类型 <span class="req">*</span></div>
              <a-select v-model="unifiedConfig.fieldType" size="small" @change="onUnifiedConfigInput">
                <a-option value="Integer">Integer</a-option>
                <a-option value="Long">Long</a-option>
                <a-option value="Double">Double</a-option>
                <a-option value="String">String</a-option>
                <a-option value="Boolean">Boolean</a-option>
              </a-select>
            </div>
            <div class="uc-item">
              <div class="label">一级分类 <span class="req">*</span></div>
              <a-select v-model="unifiedConfig.l1Category" size="small" placeholder="选择一级分类" allow-clear @change="onUnifiedConfigInput">
                <a-option value="基础信息">基础信息</a-option>
                <a-option value="行为特征">行为特征</a-option>
                <a-option value="关系网络">关系网络</a-option>
                <a-option value="外数特征">外数特征</a-option>
                <a-option value="征信特征">征信特征</a-option>
              </a-select>
            </div>
            <div class="uc-item">
              <div class="label">二级分类 <span class="req">*</span></div>
              <a-select v-model="unifiedConfig.l2Category" size="small" placeholder="选择二级分类" allow-clear @change="onUnifiedConfigInput">
                <a-option value="账户">账户</a-option>
                <a-option value="交易">交易</a-option>
                <a-option value="还款">还款</a-option>
                <a-option value="额度">额度</a-option>
                <a-option value="逾期">逾期</a-option>
                <a-option value="其他">其他</a-option>
              </a-select>
            </div>
            <div class="uc-item">
              <div class="label">数据时效</div>
              <a-select v-model="unifiedConfig.dataFreshness" size="small" @change="onUnifiedConfigInput">
                <a-option value="离线T-1">离线T-1</a-option>
                <a-option value="离线T-2">离线T-2</a-option>
                <a-option value="准实时">准实时</a-option>
                <a-option value="实时">实时</a-option>
              </a-select>
            </div>
            <div class="uc-item">
              <div class="label">开发人员</div>
              <a-input v-model="unifiedConfig.developer" size="small" placeholder="开发人员" />
            </div>
            <div class="uc-item">
              <div class="label">验收人</div>
              <a-input v-model="unifiedConfig.acceptor" size="small" placeholder="验收人" />
            </div>
          </div>
        </div>

        <!-- 需求预填预览表 -->
        <div class="preview-section">
          <div class="preview-header">
            <span class="preview-title">需求预填预览（{{ demandRows.length }} 条）</span>
            <span class="preview-stats">
              <span class="ok">可注册 {{ demandReadyCount }} 条</span>
              <span class="sep">|</span>
              <span class="warn">需补充 {{ demandPendingCount }} 条</span>
            </span>
          </div>
          <div class="preview-table">
            <table class="ptable">
              <thead>
                <tr>
                  <th style="width: 40px">#</th>
                  <th style="width: 180px">需求名称</th>
                  <th>特征中文名</th>
                  <th>特征英文名 <span style="color: #f53f3f">*</span></th>
                  <th>业务逻辑</th>
                  <th>代码逻辑</th>
                  <th>默认值</th>
                  <th style="width: 80px">状态</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, idx) in demandRows" :key="idx">
                  <td>{{ idx + 1 }}</td>
                  <td class="cell-ellipsis" :title="row.derivationName">{{ row.derivationName }}</td>
                  <td>
                    <a-input v-model="row.featureCnName" placeholder="特征中文名" size="mini" style="width: 100%" @input="onDemandRowInput" />
                  </td>
                  <td>
                    <a-input v-model="row.featureEnName" placeholder="特征英文名" size="mini" style="width: 100%" @input="onDemandRowInput" />
                  </td>
                  <td>
                    <a-input v-model="row.businessLogic" placeholder="业务逻辑（选填）" size="mini" style="width: 100%" />
                  </td>
                  <td>
                    <a-input v-model="row.codeLogic" placeholder="代码逻辑（选填）" size="mini" style="width: 100%" />
                  </td>
                  <td>
                    <a-input v-model="row.defaultValue" placeholder="默认值" size="mini" style="width: 80px" />
                  </td>
                  <td>
                    <span :class="row.status === 'ready' ? 'row-ready' : 'row-pending'">
                      {{ row.status === 'ready' ? '可注册' : '需补充' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>

      <!-- ====== standalone 模式：导入需求 ====== -->
      <template v-else>
      <!-- 信息提示 -->
      <div class="info-tip">
        <span>ℹ</span>
        <span>系统自动解析"特征英文名"和"中文名"列，非标准模板会模糊匹配列名</span>
      </div>

      <!-- 需求名称 + 提出人 + 处理人 -->
      <div class="form-row">
        <div class="form-item">
          <div class="label">需求名称 <span class="req">*</span></div>
          <a-input
            v-model="requirementName"
            placeholder="请输入需求名称（作为本次批量导入的批次标识）"
            class="form-input"
          />
        </div>
        <div class="form-item" style="flex: 0 0 180px">
          <div class="label">提出人</div>
          <a-input
            :model-value="proposer + '（当前用户）'"
            readonly
            class="form-input readonly"
          />
        </div>
        <div class="form-item" style="flex: 0 0 180px">
          <div class="label">处理人</div>
          <a-select v-model="handler" :options="HANDLER_OPTIONS" placeholder="请选择处理人" class="form-input" />
        </div>
      </div>

      <!-- 下载模板 / 示例数据 -->
      <div class="template-row">
        <icon-file class="t-icon" />
        <span class="t-text">标准模板：需求导入模板.xlsx（含字段说明+示例数据）</span>
        <a class="t-link" @click="loadMockRows">载入示例数据</a>
        <a class="t-link" @click="downloadTemplate">下载模板 ↓</a>
      </div>

      <!-- 上传区 / 已上传文件（唯一上传入口，文件同时作为需求附件挂载） -->
      <div
        v-if="!uploadedFile"
        class="upload-zone"
        @click="triggerUpload"
      >
        <icon-upload class="upload-icon" />
        <div class="upload-text">
          将文件拖拽到此处，或
          <a class="upload-link">点击上传</a>
        </div>
        <div class="upload-hint">支持 .xlsx / .xls / .csv 格式，单文件 ≤ 10MB；该文档会作为附件挂载到本次导入的所有需求</div>
        <input
          ref="fileInputRef"
          type="file"
          accept=".xlsx,.xls,.csv"
          style="display: none"
          @change="handleFileInputChange"
        />
      </div>
      <div v-else class="file-item">
        <icon-check-circle class="file-icon" />
        <span class="file-name">{{ uploadedFile.name }}</span>
        <span class="file-meta">{{ uploadedFile.rowCount }} 条数据 · {{ formatSize(uploadedFile.size) }} · 已挂载为需求附件</span>
        <span class="file-remove" @click="removeFile">删除</span>
      </div>

      <!-- 解析预览 -->
      <div v-if="rows.length > 0" class="preview-section">
        <div class="preview-header">
          <span class="preview-title">
            解析预览（{{ rows.length }} 条）
            <span v-if="parsedFromMock" class="mock-tag">示例数据</span>
          </span>
          <span class="preview-stats">
            <span class="ok">✓ {{ successCount }} 条解析成功</span>
            <span class="sep">|</span>
            <span class="warn">⚠ {{ warnCount }} 条需确认</span>
          </span>
        </div>
        <div class="preview-table">
          <table class="ptable">
            <thead>
              <tr>
                <th style="width: 40px">#</th>
                <th>特征英文名</th>
                <th>中文名</th>
                <th>业务场景</th>
                <th style="width: 90px">状态</th>
                <th style="width: 56px">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in rows" :key="idx">
                <td>{{ idx + 1 }}</td>
                <td>
                  <a-input v-model="row.variableEnName" placeholder="特征英文名" size="mini" style="width: 100%" @input="refreshRowStatus" />
                </td>
                <td>
                  <a-input v-model="row.variableCnName" placeholder="中文名" size="mini" style="width: 100%" />
                </td>
                <td :class="{ 'cell-warn': row.status === 'warn' }">
                  {{ row.businessScene || '—' }}
                </td>
                <td :class="row.status === 'ok' ? 'cell-ok' : 'cell-warn'">
                  {{ row.status === 'ok' ? '✓ 解析成功' : '⚠ 需确认' }}
                </td>
                <td>
                  <a-button type="text" size="mini" status="danger" @click="removeRow(idx)">删除</a-button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 手动添加行 -->
      <div class="add-row-btn" @click="addRow">
        <icon-plus />
        <span>手动添加一行</span>
      </div>
      </template>
    </div>

    <!-- 底部 -->
    <div class="modal-footer">
      <div class="footer-left" v-if="!isDemandMode">
        解析成功 {{ successCount }} 条 / 需确认 {{ warnCount }} 条（可编辑后导入或跳过需确认行）
      </div>
      <div class="footer-left" v-else>
        可注册 {{ demandReadyCount }} 条 / 需补充 {{ demandPendingCount }} 条
      </div>
      <div class="footer-right">
        <a-button class="btn-default" @click="onCancel">取消</a-button>
        <a-button v-if="!isDemandMode" class="btn-default" :disabled="!uploadedFile" @click="resetFile">重新上传</a-button>
        <a-button
          class="btn-primary"
          type="primary"
          :loading="submitting"
          :disabled="isDemandMode ? demandReadyCount === 0 : rows.length === 0"
          @click="onSubmit"
        >
          {{ isDemandMode ? `确认注册（可注册${demandReadyCount}条）` : `确认导入（${rows.length}条）` }}
        </a-button>
      </div>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { Message } from '@arco-design/web-vue'
import {
  IconUpload,
  IconFile,
  IconCheckCircle,
  IconPlus
} from '@arco-design/web-vue/es/icon'
import * as XLSX from 'xlsx'
import { UserContext } from '@/modules/variable-hub/mock/risk-feature/permissions'

interface Props {
  visible: boolean
  /** 模式：standalone 独立导入需求 / demand 从需求列表批量注册 */
  source?: 'standalone' | 'demand'
  /** source=demand 时，选中的需求记录列表 */
  demandRecords?: any[]
}

const props = withDefaults(defineProps<Props>(), {
  source: 'standalone',
  demandRecords: () => []
})

const emit = defineEmits<{
  (e: 'ok', rows: any[]): void
  (e: 'cancel'): void
}>()

const isDemandMode = computed(() => props.source === 'demand')

// ============ 表单（standalone 模式） ============
const requirementName = ref('')
const proposer = UserContext.get().name || '张三'
/** 处理人候选列表（默认吴培培） */
const HANDLER_OPTIONS = [
  { value: '吴培培', label: '吴培培（风险数据）' },
  { value: '小李', label: '小李（风险数据成员）' },
  { value: '小张', label: '小张（风险数据管理员）' },
  { value: '王数仓', label: '王数仓（数仓团队）' }
]
const DEFAULT_HANDLER = '吴培培'
const handler = ref(DEFAULT_HANDLER)
const submitting = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

// ============ demand 模式：统一配置区 ============
const unifiedConfig = reactive({
  fieldType: 'Integer',
  l1Category: '',
  l2Category: '',
  dataFreshness: '离线T-1',
  developer: '',
  acceptor: ''
})

// demand 模式行数据（从 demandRecords 初始化）
interface DemandRow {
  derivationId: string
  derivationName: string
  featureCnName: string
  featureEnName: string
  businessLogic: string
  codeLogic: string
  defaultValue: string
  status: 'ready' | 'pending'
}
const demandRows = reactive<DemandRow[]>([])

// demand 模式：可注册行数 / 需补充行数
const demandReadyCount = computed(() => demandRows.filter(r => r.status === 'ready').length)
const demandPendingCount = computed(() => demandRows.filter(r => r.status === 'pending').length)

/** demand 模式：行状态 = 统一配置区必填项齐全 + 每行有英文名 */
function updateDemandRowStatus(row: DemandRow) {
  const configReady = !!unifiedConfig.fieldType && !!unifiedConfig.l1Category && !!unifiedConfig.l2Category
  const rowReady = !!row.featureEnName.trim()
  row.status = (configReady && rowReady) ? 'ready' : 'pending'
}
function onDemandRowInput() {
  demandRows.forEach(updateDemandRowStatus)
}
function onUnifiedConfigInput() {
  demandRows.forEach(updateDemandRowStatus)
}

/** demand 模式提交：批量注册特征 */
function submitDemandMode() {
  if (demandRows.length === 0) {
    Message.warning('没有可注册的需求')
    return
  }
  if (!unifiedConfig.l1Category || !unifiedConfig.l2Category) {
    Message.warning('请完成统一配置区：一级分类、二级分类为必填')
    return
  }
  const payloads = demandRows.map(r => ({
    derivationId: r.derivationId,
    name: r.featureEnName.trim(),
    featureCnName: r.featureCnName,
    featureEnName: r.featureEnName,
    fieldType: unifiedConfig.fieldType,
    businessLogic: r.businessLogic || '',
    codeLogic: r.codeLogic || '',
    defaultValue: r.defaultValue || '0',
    l1Category: unifiedConfig.l1Category,
    l2Category: unifiedConfig.l2Category,
    dataFreshness: unifiedConfig.dataFreshness,
    developer: unifiedConfig.developer || proposer,
    acceptor: unifiedConfig.acceptor || '',
    dataTableName: '',
    dwTaskId: '',
    productScope: '',
    listType: 'none',
    batch: '',
    remark: ''
  }))
  emit('ok', payloads)
}

// ============ 上传文件信息（唯一上传入口，文件同时作为需求附件） ============
const uploadedFile = ref<{
  name: string
  size: number
  rowCount: number
  uploadedAt: string
} | null>(null)

/** 当前解析结果是否来自 mock 示例数据 */
const parsedFromMock = ref(false)

const MAX_FILE_SIZE = 10 * 1024 * 1024

function formatSize(bytes: number) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function nowText() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ')
}

// ============ 数据行 ============
interface DataRow {
  variableEnName: string
  variableCnName: string
  fieldType: string
  variableMeaning: string
  processingLogic: string
  dimension: string
  dataFreshness: string
  defaultValue: string
  proposer: string
  backtrackPeriod: string
  expectedLaunchDate: string
  expectedEffect: string
  businessScene: string
  status: 'ok' | 'warn'
}

function createEmptyRow(): DataRow {
  return {
    variableEnName: '',
    variableCnName: '',
    fieldType: 'Integer',
    variableMeaning: '',
    processingLogic: '',
    dimension: '用户维度',
    dataFreshness: '离线T-1',
    defaultValue: '0',
    proposer: '',
    backtrackPeriod: '',
    expectedLaunchDate: '',
    expectedEffect: '',
    businessScene: '贷中行为',
    status: 'warn'
  }
}

const rows = reactive<DataRow[]>([])

const successCount = computed(() => rows.filter(r => r.status === 'ok').length)
const warnCount = computed(() => rows.filter(r => r.status === 'warn').length)

/** 行状态：英文名已填 + 业务场景属于贷中 → 解析成功，否则需确认 */
function computeRowStatus(row: DataRow): 'ok' | 'warn' {
  return row.variableEnName.trim() && row.businessScene.includes('贷中') ? 'ok' : 'warn'
}

function refreshRowStatus() {
  rows.forEach(r => { r.status = computeRowStatus(r) })
  if (uploadedFile.value) uploadedFile.value.rowCount = rows.length
}

function addRow() {
  rows.push(createEmptyRow())
  refreshRowStatus()
}

function removeRow(idx: number) {
  rows.splice(idx, 1)
  refreshRowStatus()
}

// ============ mock 示例数据（Demo 环境用于展示解析结果） ============
const MOCK_PARSED_ROWS: Omit<DataRow, 'status'>[] = [
  {
    variableEnName: 'MIDLOAN_BIGTXN_CNT_30D',
    variableCnName: '近30天大额交易笔数',
    fieldType: 'Integer',
    variableMeaning: '客户近30天内单笔金额≥5万元的交易笔数',
    processingLogic: 'sum(txn_cnt) where amount>=50000 and days<=30',
    dimension: '用户维度',
    dataFreshness: '离线T-1',
    defaultValue: '0',
    proposer: '李四',
    backtrackPeriod: '近1年',
    expectedLaunchDate: '2026-06-15',
    expectedEffect: '提升贷中预警覆盖率',
    businessScene: '贷中行为'
  },
  {
    variableEnName: 'MIDLOAN_REPAY_OVERDAY_CNT_90D',
    variableCnName: '近90天还款逾期次数',
    fieldType: 'Integer',
    variableMeaning: '客户近90天发生还款逾期的次数',
    processingLogic: 'count(overdue_flag=1) where days<=90',
    dimension: '借据维度',
    dataFreshness: '离线T-1',
    defaultValue: '0',
    proposer: '李四',
    backtrackPeriod: '近2年',
    expectedLaunchDate: '2026-06-15',
    expectedEffect: '支撑早期逾期模型',
    businessScene: '贷中行为'
  },
  {
    variableEnName: 'PRELOAN_CREDIT_UTIL_AVG_6M',
    variableCnName: '近6个月额度使用率均值',
    fieldType: 'Double',
    variableMeaning: '近6个月额度使用率的月均值',
    processingLogic: 'avg(used_limit / total_limit) group by month',
    dimension: '客户维度',
    dataFreshness: '离线T-1',
    defaultValue: '0',
    proposer: '王五',
    backtrackPeriod: '近1年',
    expectedLaunchDate: '2026-06-20',
    expectedEffect: '用于额度调降策略',
    businessScene: '贷前准入'
  },
  {
    variableEnName: 'MIDLOAN_DEVICE_CHANGE_CNT_7D',
    variableCnName: '近7天登录设备变更次数',
    fieldType: 'Integer',
    variableMeaning: '客户近7天登录设备指纹发生变化的次数',
    processingLogic: 'count(distinct device_id) - 1 where days<=7',
    dimension: '用户维度',
    dataFreshness: '准实时',
    defaultValue: '0',
    proposer: '赵六',
    backtrackPeriod: '近6个月',
    expectedLaunchDate: '2026-06-25',
    expectedEffect: '反欺诈规则输入',
    businessScene: '贷中行为'
  }
]

/** 将 mock 行载入解析预览 */
function loadMockRows() {
  rows.splice(0, rows.length, ...MOCK_PARSED_ROWS.map(r => ({ ...r, status: 'warn' as const })))
  refreshRowStatus()
  parsedFromMock.value = true
  uploadedFile.value = {
    name: '需求导入示例.xlsx',
    size: 18432,
    rowCount: rows.length,
    uploadedAt: nowText()
  }
  if (!requirementName.value.trim()) {
    requirementName.value = '贷中行为特征批量注册（示例）'
  }
  Message.success(`已载入示例数据 ${rows.length} 条（Demo 环境 mock 解析结果）`)
}

// ============ 模板下载（mock） ============
function downloadTemplate() {
  Message.info('模板下载（Demo 环境，暂不提供实际文件）')
}

// ============ 文件上传 ============
function triggerUpload() {
  fileInputRef.value?.click()
}

function handleFileInputChange(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  target.value = ''
  if (file.size > MAX_FILE_SIZE) {
    Message.error('文件超过 10MB 上限')
    return
  }
  parseFile(file)
}

function resetFile() {
  uploadedFile.value = null
  parsedFromMock.value = false
  rows.splice(0, rows.length)
}

function removeFile() {
  resetFile()
}

/** 解析异常时回退 mock 示例数据，保证 Demo 始终能看到解析结果 */
function fallbackToMock(file: File, reason: string) {
  rows.splice(0, rows.length, ...MOCK_PARSED_ROWS.map(r => ({ ...r, status: 'warn' as const })))
  refreshRowStatus()
  parsedFromMock.value = true
  uploadedFile.value = {
    name: file.name,
    size: file.size,
    rowCount: rows.length,
    uploadedAt: nowText()
  }
  Message.warning(`${reason}，Demo 环境已用示例数据展示解析结果`)
}

function parseFile(file: File) {
  const isCSV = /\.csv$/i.test(file.name)
  const isExcel = /\.(xlsx|xls)$/i.test(file.name)
  if (!isCSV && !isExcel) {
    fallbackToMock(file, '文件类型不支持（仅 .xlsx / .xls / .csv）')
    return
  }
  if (isCSV) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      parseCSVText(text, file)
    }
    reader.onerror = () => { fallbackToMock(file, '文件读取失败') }
    reader.readAsText(file, 'UTF-8')
  } else {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        if (!sheetName) {
          fallbackToMock(file, 'Excel 文件无有效工作表')
          return
        }
        const sheet = workbook.Sheets[sheetName]
        const json = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' })
        parseJsonRows(json, file)
      } catch (err) {
        fallbackToMock(file, 'Excel 解析失败：' + (err as Error).message)
      }
    }
    reader.onerror = () => { fallbackToMock(file, '文件读取失败') }
    reader.readAsArrayBuffer(file)
  }
}

function parseCSVText(text: string, file: File) {
  try {
    const lines = text.split(/\r?\n/).filter(line => line.trim())
    if (lines.length < 2) {
      fallbackToMock(file, '文件至少需要包含表头 + 1 条数据')
      return
    }
    const headers = lines[0].split(',').map(h => h.trim())
    const json: Record<string, any>[] = []
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim())
      const row: Record<string, any> = {}
      headers.forEach((h, idx) => { row[h] = values[idx] || '' })
      json.push(row)
    }
    parseJsonRows(json, file)
  } catch (err) {
    fallbackToMock(file, 'CSV 解析失败：' + (err as Error).message)
  }
}

/** 从 JSON 行数组中提取各字段（不限定模板，按关键词匹配列名） */
function parseJsonRows(json: Record<string, any>[], file: File) {
  if (!json.length) {
    fallbackToMock(file, '未解析到有效数据行')
    return
  }

  const allKeys = Object.keys(json[0])
  const findKey = (patterns: RegExp): string | undefined =>
    allKeys.find(k => patterns.test(k))

  const enNameKey = findKey(/英文名|english.?name|variable.?en.?name|特征名/i)
  const cnNameKey = findKey(/中文名|chinese.?name|cn.?name|特征名/i)
  const fieldTypeKey = findKey(/字段类型|类型|field.?type|data.?type/i)
  const meaningKey = findKey(/含义|特征含义|描述|description|meaning|备注/i)
  const logicKey = findKey(/取数逻辑|加工逻辑|逻辑|processing|logic/i)
  const dimensionKey = findKey(/维度|dimension|粒度/i)
  const freshnessKey = findKey(/时效|时效性|freshness|实时|离线/i)
  const defaultKey = findKey(/默认值|default/i)
  const proposerKey = findKey(/需求人|提出人|proposer|申请人/i)
  const backtrackKey = findKey(/回溯|追溯|backtrack/i)
  const launchKey = findKey(/上线|逾期|launch|deadline|预期时间/i)
  const effectKey = findKey(/效果|预期效果|effect|expected/i)
  const sceneKey = findKey(/业务场景|场景|scene/i)

  if (!enNameKey && !cnNameKey) {
    fallbackToMock(file, `未找到"特征英文名"或"中文名"列（当前列：${allKeys.join('、')}）`)
    return
  }

  const getVal = (r: Record<string, any>, key?: string) => key ? String(r[key] ?? '').trim() : ''

  const parsed: DataRow[] = json.map((r) => {
    const row: DataRow = {
      variableEnName: getVal(r, enNameKey),
      variableCnName: getVal(r, cnNameKey),
      fieldType: getVal(r, fieldTypeKey) || 'Integer',
      variableMeaning: getVal(r, meaningKey),
      processingLogic: getVal(r, logicKey),
      dimension: getVal(r, dimensionKey) || '用户维度',
      dataFreshness: getVal(r, freshnessKey) || '离线T-1',
      defaultValue: getVal(r, defaultKey) || '0',
      proposer: getVal(r, proposerKey),
      backtrackPeriod: getVal(r, backtrackKey),
      expectedLaunchDate: getVal(r, launchKey),
      expectedEffect: getVal(r, effectKey),
      businessScene: getVal(r, sceneKey) || '贷中行为',
      status: 'warn'
    }
    row.status = computeRowStatus(row)
    return row
  }).filter(r => r.variableEnName || r.variableCnName)

  if (!parsed.length) {
    fallbackToMock(file, '解析到的行均为空数据')
    return
  }

  rows.splice(0, rows.length, ...parsed)
  parsedFromMock.value = false
  uploadedFile.value = {
    name: file.name,
    size: file.size,
    rowCount: parsed.length,
    uploadedAt: nowText()
  }
  const okCount = parsed.filter(r => r.status === 'ok').length
  const warnCnt = parsed.filter(r => r.status === 'warn').length
  Message.success(`已解析 ${parsed.length} 条数据（成功 ${okCount}，需确认 ${warnCnt}）`)
}

// ============ 提交 ============
function onSubmit() {
  if (isDemandMode.value) {
    submitDemandMode()
    return
  }
  if (!requirementName.value.trim()) {
    Message.warning('请输入需求名称')
    return
  }
  if (rows.length === 0) {
    Message.warning('请至少添加一条需求')
    return
  }
  const invalid = rows.findIndex(r => !r.variableEnName.trim() && !r.variableCnName.trim())
  if (invalid >= 0) {
    Message.warning(`第 ${invalid + 1} 行：特征英文名和中文名不能同时为空`)
    return
  }

  submitting.value = true
  try {
    const excelSnapshot = rows.map(r => ({
      variableEnName: r.variableEnName,
      variableCnName: r.variableCnName,
      fieldType: r.fieldType,
      variableMeaning: r.variableMeaning,
      processingLogic: r.processingLogic,
      dimension: r.dimension,
      dataFreshness: r.dataFreshness,
      defaultValue: r.defaultValue,
      proposer: r.proposer,
      backtrackPeriod: r.backtrackPeriod,
      expectedLaunchDate: r.expectedLaunchDate,
      expectedEffect: r.expectedEffect
    }))
    const payloads = rows.map(r => ({
      name: requirementName.value.trim(),
      featureEnName: r.variableEnName,
      featureCnName: r.variableCnName,
      fieldType: r.fieldType,
      processingLogic: r.processingLogic,
      defaultValue: r.defaultValue,
      dataFreshness: r.dataFreshness,
      expectedEffect: r.expectedEffect,
      requirementDescription: r.variableMeaning,
      handler: handler.value || DEFAULT_HANDLER,
      proposer: r.proposer || proposer,
      // 上传的需求文档同时作为附件挂载到本批次所有需求
      attachment: uploadedFile.value
        ? {
            name: uploadedFile.value.name,
            size: uploadedFile.value.size,
            uploadedAt: uploadedFile.value.uploadedAt
          }
        : null,
      excelData: excelSnapshot,
      businessScene: r.businessScene,
      category: 'midloan_behavior',
      dataSource: 'Hbase'
    }))
    emit('ok', payloads)
  } finally {
    submitting.value = false
  }
}

function onCancel() {
  emit('cancel')
}

// 打开时重置
watch(
  () => props.visible,
  (v) => {
    if (v) {
      // standalone 模式重置
      rows.splice(0, rows.length)
      requirementName.value = ''
      handler.value = DEFAULT_HANDLER
      parsedFromMock.value = false
      uploadedFile.value = null
      // demand 模式重置：从 demandRecords 初始化行
      demandRows.splice(0, demandRows.length)
      if (isDemandMode.value && props.demandRecords.length > 0) {
        props.demandRecords.forEach((d) => {
          demandRows.push({
            derivationId: d.id,
            derivationName: d.name || '',
            featureCnName: d.featureCnName || d.name || '',
            featureEnName: d.featureEnName || '',
            businessLogic: d.businessLogic || '',
            codeLogic: d.codeLogic || '',
            defaultValue: d.defaultValue || '0',
            status: 'pending'
          })
        })
      }
      // 统一配置区重置
      unifiedConfig.fieldType = 'Integer'
      unifiedConfig.l1Category = ''
      unifiedConfig.l2Category = ''
      unifiedConfig.dataFreshness = '离线T-1'
      unifiedConfig.developer = ''
      unifiedConfig.acceptor = ''
    }
  }
)
</script>

<style scoped>
.modal-header {
  padding: 16px 24px;
  border-bottom: 1px solid #e5e6eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header .title {
  font-size: 16px;
  font-weight: 600;
  color: #1d2129;
}

.modal-header .sub {
  font-size: 13px;
  color: #86909c;
  margin-top: 2px;
}

.close-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #86909c;
  cursor: pointer;
  border-radius: 4px;
  font-size: 18px;
}

.close-btn:hover {
  background: #f2f3f5;
  color: #1d2129;
}

.modal-body {
  padding: 24px;
  max-height: 560px;
  overflow-y: auto;
}

/* 信息提示 */
.info-tip {
  padding: 8px 12px;
  background: #e8f3ff;
  border: 1px solid #bedaff;
  border-radius: 4px;
  font-size: 12px;
  color: #165dff;
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 16px;
}

/* 表单 */
.form-row {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.form-item {
  flex: 1;
}

.form-item .label {
  font-size: 13px;
  color: #4e5969;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.form-item .label .req {
  color: #f53f3f;
  font-size: 12px;
}

.form-item .label .opt {
  color: #c9cdd4;
  font-size: 12px;
}

.form-input {
  width: 100%;
}

:deep(.form-input.readonly) .arco-input-wrapper {
  background: #f7f8fa;
  cursor: not-allowed;
}

:deep(.form-input.readonly .arco-input) {
  color: #86909c;
  cursor: not-allowed;
}

/* 下载模板 */
.template-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #f7f8fa;
  border-radius: 4px;
  margin-bottom: 16px;
}

.template-row .t-icon {
  font-size: 16px;
  color: #165dff;
}

.template-row .t-text {
  font-size: 13px;
  color: #4e5969;
  flex: 1;
}

.template-row .t-link {
  font-size: 13px;
  color: #165dff;
  cursor: pointer;
  text-decoration: none;
}

.template-row .t-link:hover {
  text-decoration: underline;
}

/* 上传区 */
.upload-zone {
  border: 2px dashed #e5e6eb;
  border-radius: 8px;
  padding: 36px 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  background: #f7f8fa;
  margin-bottom: 16px;
}

.upload-zone:hover {
  border-color: #165dff;
  background: #f7faff;
}

.upload-icon {
  font-size: 36px;
  color: #c9cdd4;
  margin-bottom: 10px;
}

.upload-text {
  font-size: 14px;
  color: #4e5969;
  margin-bottom: 4px;
}

.upload-hint {
  font-size: 12px;
  color: #c9cdd4;
}

.upload-link {
  color: #165dff;
  cursor: pointer;
  text-decoration: none;
}

.upload-link:hover {
  text-decoration: underline;
}

/* 已上传文件 */
.file-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #f7f8fa;
  border: 1px solid #e5e6eb;
  border-radius: 4px;
  margin-bottom: 16px;
}

.file-icon {
  font-size: 20px;
  color: #00b42a;
}

.file-name {
  font-size: 13px;
  color: #1d2129;
  flex: 1;
}

.file-meta {
  font-size: 12px;
  color: #86909c;
}

.file-remove {
  color: #f53f3f;
  cursor: pointer;
  font-size: 13px;
  padding: 4px 8px;
  border-radius: 2px;
}

.file-remove:hover {
  background: #ffece8;
}

/* 解析预览 */
.preview-section {
  margin-bottom: 16px;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.preview-title {
  font-size: 13px;
  font-weight: 600;
  color: #1d2129;
}

/* mock 示例数据标记 */
.mock-tag {
  display: inline-block;
  margin-left: 6px;
  padding: 1px 6px;
  border-radius: 2px;
  font-size: 11px;
  font-weight: 400;
  color: #ff7d00;
  background: #fff7e8;
  border: 1px solid #ffcf8b;
}

.preview-stats {
  font-size: 12px;
  color: #86909c;
}

.preview-stats .ok {
  color: #00b42a;
}

.preview-stats .warn {
  color: #ff7d00;
}

.preview-stats .sep {
  margin: 0 4px;
}

/* 预览表格 */
.preview-table {
  border: 1px solid #e5e6eb;
  border-radius: 4px;
  overflow: hidden;
  max-height: 240px;
  overflow-y: auto;
}

table.ptable {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

table.ptable thead th {
  background: #f7f8fa;
  color: #86909c;
  font-weight: 500;
  padding: 8px 10px;
  text-align: left;
  border-bottom: 1px solid #e5e6eb;
  white-space: nowrap;
  position: sticky;
  top: 0;
  z-index: 1;
}

table.ptable tbody td {
  padding: 6px 10px;
  border-bottom: 1px solid #f2f3f5;
  color: #1d2129;
}

table.ptable tbody tr:hover {
  background: #f7faff;
}

.cell-ok {
  color: #00b42a;
}

.cell-warn {
  color: #ff7d00;
}

.cell-empty {
  color: #c9cdd4;
}

/* 手动添加行 */
.add-row-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px;
  border: 1px dashed #c9cdd4;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  color: #86909c;
  margin-bottom: 16px;
  transition: all 0.2s;
}

.add-row-btn:hover {
  border-color: #165dff;
  color: #165dff;
}

/* 底部 */
.modal-footer {
  padding: 12px 24px;
  border-top: 1px solid #e5e6eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fafbfc;
}

.footer-left {
  font-size: 12px;
  color: #86909c;
}

.footer-right {
  display: flex;
  gap: 12px;
}

/* demand 模式：统一配置区 */
.unified-config {
  background: #f7f8fa;
  border: 1px solid #e5e6eb;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 16px;
}

.uc-title {
  font-size: 13px;
  font-weight: 600;
  color: #1d2129;
  margin-bottom: 12px;
}

.uc-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.uc-item .label {
  font-size: 12px;
  color: #4e5969;
  margin-bottom: 4px;
}

.uc-item .label .req {
  color: #f53f3f;
}

/* demand 模式：行状态 */
.row-ready {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 2px;
  font-size: 12px;
  color: #00b42a;
  background: #e8ffea;
}

.row-pending {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 2px;
  font-size: 12px;
  color: #ff7d00;
  background: #fff7e8;
}

.cell-ellipsis {
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
