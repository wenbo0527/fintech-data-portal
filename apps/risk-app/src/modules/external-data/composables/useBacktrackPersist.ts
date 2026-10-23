import { ref, reactive, computed } from 'vue'
import { Message } from '@arco-design/web-vue'
import type { UploadFile } from '@arco-design/web-vue'
import { fetchEnabledAgencies } from '../api/creditAgency'
import type { CreditAgency } from '../mock/creditAgencies'
import {
  fetchRetroFiles,
  fetchRetroDirs,
  fetchPreviewRows,
  fetchProcessedRecords,
  fetchOutboundTasks,
  fetchBacktrackProducts,
  fetchStdFieldNames,
  fetchRetroStdTables,
  fetchOnlineSampleTables,
  fetchConsistencyDetails,
  fetchConsistencySummary,
  fetchTripleRowCheck,
  fetchNotifyConfig,
  createNotifyContent,
  dispatchNotification,
  createBackid,
  savePersistRecord,
  fetchNotifyRecords,
} from '../api/backtrack'
import type { RetroFile, PreviewRow, ProcessedFileRecord } from '../mock/retroFiles'
import type { OutboundTask } from '../mock/outboundTasks'
import type { BacktrackProduct } from '../mock/backtrackProducts'
import type { HiveTableItem } from '../mock/hiveTables'
import type { ValidationDetail, ConsistencySummary, TripleRowCheck } from '../mock/validation'
import type { NotifyConfig, NotifyContent, NotifyRecord } from '../mock/notify'
import type { PersistRecord, PersistStatus } from '../mock/backtrackPersist'
import { PERSIST_STATUS_FLOW } from '../mock/backtrackPersist'

/**
 * 外数回溯落库流程共享状态与业务逻辑
 * 覆盖需求文档《外数文件落库》B1~B5 与 3.1 九态状态机，
 * 供 BacktrackPersist.vue 及其分步子组件共同使用。
 */

/** 单文件上传大小上限（R16：1GB） */
const MAX_UPLOAD_SIZE = 1024 * 1024 * 1024

/** 字段映射记录 */
export interface FieldMapping {
  /** CSV 表头字段名（R33 撞库后保留原始字段名） */
  sourceField: string
  /** 字段说明（R30 未收录产品显示「—」） */
  comment: string
  /** 落库目标字段（标准库字段名 / 非标准化占位符） */
  targetField: string
  /** 匹配类型（R39 映射表独立存储匹配结果） */
  matchedBy: 'auto' | 'file' | 'manual' | 'default'
  /** 匹配类型中文说明 */
  matchedLabel: string
}

/** 非标准化字段占位符（R34/R38） */
const NON_STD_FIELD = '__non_standard__'

/**
 * 创建外数回溯落库的流程状态容器
 * @returns 流程状态与业务方法集合
 */
export function useBacktrackPersist() {
  /* ---------- 9 态状态机（3.1） ---------- */
  const currentStatus = ref<PersistStatus>('待开始')

  /** 设置当前落库状态 */
  const setStatus = (status: PersistStatus) => {
    currentStatus.value = status
  }

  /* ---------- B1 选择机构与文件获取 ---------- */
  const agencies = ref<CreditAgency[]>([])
  const selectedAgencyId = ref('')

  /** 当前选中的征信机构 */
  const selectedAgency = computed(() => agencies.value.find((a) => a.id === selectedAgencyId.value) || null)

  /** 路径清理提醒（R15：钱塘等机构会定期自动清理历史路径文件） */
  const pathCleanupNotice = computed(() => {
    const a = selectedAgency.value
    if (!a || a.pathStrategy !== 'auto_clean') return ''
    return '该机构会定期清理历史文件，请及时处理最新返回文件'
  })

  /** 数据获取方式（R12） */
  const dataSourceMode = ref<'sftp' | 'upload'>('sftp')

  /** SFTP 目录（R14：目录路径 + 文件名 = 完整文件路径，末尾自动补 /） */
  const sftpDir = ref('')
  /** SFTP 子目录 */
  const sftpSubDir = ref('')
  /** SFTP 文件名（R14） */
  const sftpFileName = ref('')

  /** 完整文件路径预览（R14） */
  const fullFilePath = computed(() => {
    const a = selectedAgency.value
    if (!a) return ''
    const dir = (sftpDir.value || a.sftp.directory).replace(/\/+$/, '')
    const sub = sftpSubDir.value ? `/${sftpSubDir.value}` : ''
    return `${dir}${sub}/${sftpFileName.value || '<文件名>'}`
  })

  /** SFTP 参数自动带入（R13：只读展示机构配置） */
  const sftpParams = computed(() => selectedAgency.value?.sftp ?? null)

  /** SFTP 子目录候选 */
  const dirOptions = ref<string[]>([])

  /** SFTP 返回文件列表 */
  const fileList = ref<RetroFile[]>([])
  const querying = ref(false)

  /** 选中的文件 */
  const selectedFile = ref<RetroFile | null>(null)

  /** 上传模式文件（R12/R16/R17） */
  const uploadFileList = ref<UploadFile[]>([])
  const uploadedFile = ref<RetroFile | null>(null)

  /** 上传模式也允许加密文件，需解密后进入下一步 */
  const uploadDecrypted = ref(false)

  /** 文件结构识别结果（R20：编码格式 / 分隔符 / 字段数） */
  const fileStructure = reactive({ encoding: '', delimiter: '', fieldCount: 0 })

  /** 前 5 行原始内容（R20） */
  const previewRows = ref<PreviewRow[]>([])

  /** 预览列（取自表头） */
  const previewColumns = computed(() => {
    const header = selectedFile.value?.header ?? uploadedFile.value?.header ?? []
    return header
  })

  /** 加载启用机构（R11） */
  const loadAgencies = async () => {
    agencies.value = await fetchEnabledAgencies()
    if (!selectedAgencyId.value && agencies.value.length) selectedAgencyId.value = agencies.value[0].id
  }

  /** 切换机构：重置目录与文件列表，自动带出 SFTP 配置（R13） */
  const onAgencyChange = async () => {
    sftpDir.value = selectedAgency.value?.sftp.directory ?? ''
    sftpSubDir.value = ''
    sftpFileName.value = ''
    fileList.value = []
    selectedFile.value = null
    uploadedFile.value = null
    uploadFileList.value = []
    previewRows.value = []
    dirOptions.value = await fetchRetroDirs(selectedAgency.value?.agencyCode ?? '')
    if (dataSourceMode.value === 'sftp') {
      setStatus('待开始')
    }
  }

  /** 拉取机构 SFTP 目录下的返回文件 */
  const queryFiles = async () => {
    if (!selectedAgency.value) {
      Message.warning('请先选择征信机构')
      return
    }
    if (!sftpFileName.value.trim()) {
      Message.warning('请输入要拉取的文件名（R14：目录路径 + 文件名 = 完整文件路径）')
      return
    }
    querying.value = true
    selectedFile.value = null
    try {
      const list = await fetchRetroFiles(selectedAgency.value.agencyCode)
      // 演示：按输入的文件名做包含匹配，命中则返回该文件，未命中则返回机构目录下全部文件
      const matched = list.filter((f) => f.name.includes(sftpFileName.value.trim()))
      fileList.value = matched.length ? matched : list
      setStatus('文件已获取')
      if (!matched.length) Message.info(`目录 ${fullFilePath.value} 下未找到同名文件，已列出该目录全部返回文件`)
    } finally {
      querying.value = false
    }
  }

  /** 选中文件并刷新结构识别与预览（R19/R20） */
  const applyFileStructure = (file: RetroFile) => {
    fileStructure.encoding = file.encoding
    fileStructure.delimiter = file.delimiter
    fileStructure.fieldCount = file.fieldCount
  }

  /** 选中 SFTP 文件 */
  const onFileSelect = async (file: RetroFile) => {
    selectedFile.value = file
    uploadedFile.value = null
    applyFileStructure(file)
    if (!file.encrypted) {
      setStatus('文件就绪')
      await loadPreview(file)
    } else {
      previewRows.value = []
      Message.warning('该文件已加密，请线下获取密钥后在页面输入解密')
    }
  }

  /** 加载前 5 行原始内容（R20） */
  const loadPreview = async (file: RetroFile) => {
    previewRows.value = await fetchPreviewRows(file)
    setStatus('文件就绪')
  }

  /* ---------- 解密（R19 / E11） ---------- */
  const decryptVisible = ref(false)
  const decrypting = ref(false)
  const decryptKey = ref('')
  const decryptFailed = ref('')
  let decryptTarget: RetroFile | null = null

  /** 打开解密弹窗 */
  const openDecrypt = (file: RetroFile) => {
    decryptTarget = file
    decryptKey.value = ''
    decryptFailed.value = ''
    decryptVisible.value = true
  }

  /** 确认解密：密钥错误时阻断流程（E11） */
  const confirmDecrypt = async () => {
    if (!decryptKey.value.trim()) {
      Message.warning('请输入线下获取的密钥')
      return
    }
    decrypting.value = true
    decryptFailed.value = ''
    await new Promise((r) => setTimeout(r, 700))
    decrypting.value = false
    const target = decryptTarget
    if (!target) {
      decryptVisible.value = false
      return
    }
    // mock 规则：密钥长度不足 8 位视为错误密钥，用于演示解密失败阻断
    if (decryptKey.value.trim().length < 8) {
      decryptFailed.value = '解密失败，请检查密钥是否正确'
      Message.error('解密失败，请检查密钥是否正确')
      return
    }
    target.encrypted = false
    const row = fileList.value.find((f) => f.id === target.id)
    if (row) row.encrypted = false
    decryptVisible.value = false
    setStatus('文件就绪')
    await loadPreview(target)
    Message.success(`文件 ${target.name} 解密成功，已展示前 ${previewRows.value.length} 行内容`)
  }

  /* ---------- 上传模式（R12/R16/R17/E6/E7/E9） ---------- */
  /** 处理上传文件：校验大小上限与 CSV 扩展名 */
  const onUploadChange = async (files: UploadFile[]) => {
    uploadFileList.value = files
    const f = files[files.length - 1]
    if (!f || !f.name) return
    // E7：仅允许 CSV 格式
    if (!/\.csv$/i.test(f.name)) {
      Message.error('上传文件格式不支持，仅支持 CSV 格式')
      uploadFileList.value = []
      uploadedFile.value = null
      return
    }
    // E6：单文件上限 1GB
    const bytes = f.size ?? Math.round((18 + Math.random() * 60) * 1024 * 1024)
    if (bytes > MAX_UPLOAD_SIZE) {
      Message.error('文件大小超出限制，当前上限 1GB')
      uploadFileList.value = []
      uploadedFile.value = null
      return
    }
    const header = ['id_md5', 'review_data', 'loan_cnt_12m', 'max_overdue_amt', 'risk_band', 'q_id']
    uploadedFile.value = {
      id: `up_${Date.now()}`,
      agencyCode: selectedAgency.value?.agencyCode ?? '',
      name: f.name,
      size: bytes,
      rows: Math.max(1, Math.round(bytes / 900)),
      updateTime: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
      encrypted: false,
      encoding: 'UTF-8',
      delimiter: '逗号',
      fieldCount: header.length,
      header,
    }
    selectedFile.value = null
    uploadDecrypted.value = true
    applyFileStructure(uploadedFile.value)
    setStatus('文件已获取')
    await loadPreview(uploadedFile.value)
  }

  /** 移除上传文件 */
  const onUploadRemove = () => {
    uploadFileList.value = []
    uploadedFile.value = null
    uploadDecrypted.value = false
    previewRows.value = []
  }

  /** 切换数据来源方式时清空已选内容，避免两种来源串用 */
  const onDataSourceModeChange = () => {
    selectedFile.value = null
    uploadedFile.value = null
    uploadFileList.value = []
    fileList.value = []
    previewRows.value = []
    uploadDecrypted.value = false
    setStatus('待开始')
  }

  /** 当前生效文件（SFTP 选中或上传） */
  const activeFile = computed(() => selectedFile.value ?? uploadedFile.value)

  /* ---------- 文件去重（R26/R27，校验放在生成 backid / 落库前） ---------- */
  const processedModalVisible = ref(false)
  const processedRecords = ref<ProcessedFileRecord[]>([])

  /**
   * 执行文件去重校验（生成 backid / 落库前调用）
   * 命中重复文件时弹窗提示但不阻断（R27），允许重跑
   */
  const checkFileDuplicate = async (): Promise<boolean> => {
    const file = activeFile.value
    if (!file) return false
    const records = await fetchProcessedRecords(file.name, file.size)
    if (!records.length) return false
    processedRecords.value = records
    processedModalVisible.value = true
    return true
  }

  /** 弹窗确认重新写入 */
  const confirmRewrite = () => {
    processedModalVisible.value = false
    Message.warning('该文件已落库，本次操作将重新写入并生成新的 backid 批次')
  }

  /* ---------- B2 产品选择与字段映射 ---------- */
  const productOptions = ref<BacktrackProduct[]>([])
  const mappingProduct = ref('')

  /** 当前产品 */
  const currentProduct = computed(() => productOptions.value.find((p) => p.name === mappingProduct.value) || null)

  /** 未收录产品（R28/R30/R31） */
  const isCustomProduct = computed(() => !currentProduct.value?.registered)

  /** 加载机构对应的外数产品（R29 已收录产品拉底表字段） */
  const loadProducts = async () => {
    productOptions.value = await fetchBacktrackProducts(selectedAgency.value?.agencyCode)
    const preferred = productOptions.value.find((p) => p.registered)
    mappingProduct.value = preferred?.name ?? productOptions.value[0]?.name ?? ''
    await loadProductFields()
  }

  /** 标准库字段下拉（R29 已收录产品从标准库选择） */
  const stdFieldOptions = ref<string[]>([])

  /** 字段映射列表 */
  const fieldMappings = ref<FieldMapping[]>([])

  /** 必填映射（R32：IDMD5 与 review date 强制绑定） */
  const REQUIRED_FIELD_MATCH = [
    {
      std: 'id_md5',
      stdLabel: '加密MD5字段',
      defaultSource: 'id_md5',
      rule: '主体标识密文字段（字段名含 md5 / hash）',
      matcher: (f: string) => /md5|hash/i.test(f),
    },
    {
      std: 'review_date',
      stdLabel: '回溯日期',
      defaultSource: 'review_data',
      rule: '回溯基准日期字段（字段名含 date / time / review_data）',
      matcher: (f: string) => /date|time/i.test(f) || f === 'review_data',
    },
  ]

  /** 必填区已选的文件出参字段 */
  const requiredSourceSelection = reactive<Record<string, string>>({
    id_md5: 'id_md5',
    review_date: 'review_data',
  })

  /** 当前产品的出参字段清单 */
  const productFields = computed(() => currentProduct.value?.fields ?? [])

  /** 出参字段名列表 */
  const catalogSourceFields = computed(() => productFields.value.map((f) => f.name))

  /** 字段说明查询（R30：未收录产品显示「—」） */
  const sourceFieldComment = (f: string) => productFields.value.find((x) => x.name === f)?.comment || '—'

  /** 必选区已占用的出参字段 */
  const occupiedSourceFields = computed(() => Object.values(requiredSourceSelection).filter(Boolean))

  /** 必填映射校验状态 */
  const requiredMappingStatus = computed(() =>
    REQUIRED_FIELD_MATCH.map((r) => {
      const sel = requiredSourceSelection[r.std]
      return { ...r, sel, ok: !!sel && catalogSourceFields.value.includes(sel) && r.matcher(sel) }
    })
  )

  /** 必填映射是否全部通过 */
  const requiredTwoPassed = computed(() => requiredMappingStatus.value.every((r) => r.ok))

  /** 必填映射已通过数量 */
  const requiredPassedCount = computed(() => requiredMappingStatus.value.filter((r) => r.ok).length)

  /** 切换产品后校正必填区已选字段 */
  const ensureRequiredSelection = () => {
    REQUIRED_FIELD_MATCH.forEach((r) => {
      const opts = catalogSourceFields.value
      const cur = requiredSourceSelection[r.std]
      if (!opts.includes(cur)) {
        requiredSourceSelection[r.std] = opts.find((f) => r.matcher(f)) || r.defaultSource
      }
    })
  }

  /** 加载产品的出参字段并生成映射列表 */
  const loadProductFields = async () => {
    ensureRequiredSelection()
    stdFieldOptions.value = await fetchStdFieldNames()
    const base = productFields.value
      .filter((f) => !occupiedSourceFields.value.includes(f.name))
      .map((f) => ({
        sourceField: f.name,
        comment: f.comment,
        targetField: '',
        matchedBy: 'default' as FieldMapping['matchedBy'],
        matchedLabel: '待匹配',
      }))
    fieldMappings.value = base
    applyAutoCollision(false)
    sortMappingsPendingFirst()
    mappingPagination.current = 1
    mappingPagination.total = base.length
  }

  /** 切换产品 */
  const onMappingProductChange = async () => {
    await loadProductFields()
  }

  /** 必填区改选等同字段 */
  const onRequiredSourceChange = async () => {
    await loadProductFields()
  }

  /** 未匹配字段排在最前（R35） */
  const sortMappingsPendingFirst = () => {
    fieldMappings.value.sort((a, b) => Number(!!a.targetField) - Number(!!a.targetField))
  }

  /** 自动字段碰撞（R33：按字段名自动匹配标准字段库） */
  const applyAutoCollision = (notify = true) => {
    let hit = 0
    // R30/R31：未收录外数产品的标准库字段为输入框，由用户手工填写，不做自动碰撞
    if (isCustomProduct.value) {
      fieldMappings.value.forEach((m) => {
        m.targetField = m.sourceField
        m.matchedBy = 'default'
        m.matchedLabel = '默认保留原始字段名'
      })
      sortMappingsPendingFirst()
      mappingPagination.current = 1
      if (notify) Message.info('未收录外数产品不参与自动碰撞，落库字段名默认取 CSV 原始字段名，可手工修改')
      return
    }
    fieldMappings.value.forEach((m) => {
      const target = stdFieldOptions.value.find((s) => s === m.sourceField) || autoMatchStdField(m.sourceField)
      if (target) {
        m.targetField = target
        m.matchedBy = 'auto'
        m.matchedLabel = '自动匹配'
        hit++
      } else {
        // R34：撞不上的保留 CSV 原始字段名，默认标记为「非标准化」
        m.targetField = NON_STD_FIELD
        m.matchedBy = 'default'
        m.matchedLabel = '默认非标准化'
      }
    })
    sortMappingsPendingFirst()
    mappingPagination.current = 1
    if (notify) Message.success(`自动字段碰撞完成：命中标准字段 ${hit} 项，其余保留原始字段名并标记为非标准化`)
  }

  /** 依据标准字段语义命中标准库字段 */
  const autoMatchStdField = (sourceField: string): string => {
    const dict: Record<string, string> = {
      inst_cnt_1m: 'std_apply_inst_cnt_1m',
      loan_cnt_1m: 'std_loan_cnt_1m',
      loan_cnt_3m: 'std_loan_cnt_3m',
      loan_cnt_12m: 'std_loan_cnt_12m',
      max_overdue_amt: 'std_overdue_amt_max',
      overdue_cnt_24m: 'std_overdue_cnt_24m',
      overdue_days_max: 'std_overdue_days_max',
      credit_score: 'std_credit_score',
      risk_band: 'std_risk_level_code',
      credit_query_cnt_6m: 'std_credit_query_cnt_6m',
      card_cnt: 'std_card_cnt',
      account_open_months: 'std_account_open_months',
      limit_amt_total: 'std_limit_amt_total',
    }
    return dict[sourceField] ?? ''
  }

  /** 上传映射表批量匹配（R42：映射关系通过界面配置） */
  const applyMappingFile = () => {
    const fileDict: Record<string, string> = {
      q_id: 'std_credit_query_cnt_6m',
      enterprise_risk_score: 'std_risk_score_v3',
      legal_case_cnt: 'std_overdue_cnt_24m',
      tax_arrear_flag: 'std_risk_level_code',
    }
    let filled = 0
    fieldMappings.value.forEach((m) => {
      if (m.matchedBy !== 'default') return
      const target = fileDict[m.sourceField]
      if (target) {
        m.targetField = target
        m.matchedBy = 'file'
        m.matchedLabel = '映射表批量匹配'
        filled++
      }
    })
    if (filled) {
      sortMappingsPendingFirst()
      mappingPagination.current = 1
      Message.success(`已按映射表批量匹配 ${filled} 个字段`)
    } else {
      Message.info('映射表未命中新的待匹配字段')
    }
  }

  /** 人工修正映射（R34/R36） */
  const setMappingTarget = (record: FieldMapping, value: string) => {
    record.targetField = value || ''
    if (!record.targetField) {
      record.matchedBy = 'default'
      record.matchedLabel = '待匹配'
    } else if (record.matchedBy !== 'auto' && record.matchedBy !== 'file') {
      record.matchedBy = 'manual'
      record.matchedLabel = '人工调整'
    }
  }

  /** 已映射字段数 */
  const mappedCount = computed(() => fieldMappings.value.filter((m) => !!m.targetField).length)

  /** 非标准化字段数 */
  const nonStdCount = computed(() => fieldMappings.value.filter((m) => m.targetField === NON_STD_FIELD).length)

  /** 非标准化字段名列表（R38：序列化写入 extraParam 列） */
  const nonStdFieldNames = computed(() =>
    fieldMappings.value.filter((m) => m.targetField === NON_STD_FIELD).map((m) => m.sourceField)
  )

  /** 字段映射分页（R37：前端分页，总量不超过 2000 条） */
  const mappingPagination = reactive({
    current: 1,
    pageSize: 10,
    total: 0,
    showTotal: true,
    showJumper: true,
    showPageSize: true,
    pageSizeOptions: [10, 20, 50, 100],
  })

  /** 当前页映射数据 */
  const pagedFieldMappings = computed(() => {
    const start = (mappingPagination.current - 1) * mappingPagination.pageSize
    return fieldMappings.value.slice(start, start + mappingPagination.pageSize)
  })

  /** 映射翻页 */
  const onMappingPageChange = (page: number) => {
    mappingPagination.current = page
  }

  /** 映射每页条数变更 */
  const onMappingPageSizeChange = (size: number) => {
    mappingPagination.pageSize = size
    mappingPagination.current = 1
  }

  /** 映射规则版本（R43：落库记录关联使用的映射版本） */
  const mappingVersion = ref('v1.0')

  /** 生成映射规则版本号 */
  const buildMappingVersion = () => {
    const now = new Date()
    const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
    const random = String(Math.floor(Math.random() * 900) + 100)
    mappingVersion.value = `v${stamp}-${random}`
  }

  /* ---------- 前置外发任务匹配（R24/R25） ---------- */
  const outboundTasks = ref<OutboundTask[]>([])
  const matchedTaskIds = ref<string[]>([])

  /** 加载机构的前置外发任务 */
  const loadOutboundTasks = async () => {
    outboundTasks.value = await fetchOutboundTasks(selectedAgency.value?.agencyCode)
  }

  /* ---------- B3 解析落库 ---------- */
  const hiveTableOptions = ref<HiveTableItem[]>([])
  const hiveTable = ref('')

  /** 加载固定外数库中的落库目标表（R41：手动搜索选择，不允许新建） */
  const loadHiveTables = async () => {
    hiveTableOptions.value = await fetchRetroStdTables()
    if (hiveTable.value && !hiveTableOptions.value.some((t) => t.fullName === hiveTable.value)) {
      hiveTable.value = ''
    }
  }

  /** 回溯日期（写入 datax 分区，R40） */
  const reviewDate = ref('')

  /** 分区值预览（R40：分区字段固定 datax，值为 review date 格式转换结果） */
  const partitionValue = computed(() => {
    if (!reviewDate.value) return ''
    const d = reviewDate.value.replace(/\//g, '-')
    const parts = d.split('-')
    if (parts.length !== 3) return d
    return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`
  })

  /** 临时库批次列表（落临时库后填充） */
  const persistBatches = ref<{ backid: string; fileName: string; taskIds: string[]; rows: number; tempTable: string }[]>([])

  /** 落临时库进度 */
  const persisting = ref(false)
  const persistPercent = ref(0)

  /** 落临时库：生成 backid 后写入临时库（R46/R51） */
  const persistToTemp = async () => {
    if (persisting.value) return
    const file = activeFile.value
    if (!file) {
      Message.warning('请先选择回溯返回文件')
      return
    }
    // R26：文件去重校验放在生成 backid / 落库前执行
    const duplicated = await checkFileDuplicate()
    if (duplicated) return
    persisting.value = true
    persistPercent.value = 0
    const timer = setInterval(() => {
      persistPercent.value = Math.min(persistPercent.value + 20, 100)
      if (persistPercent.value >= 100) {
        clearInterval(timer)
        persisting.value = false
        void finalizePersist()
      }
    }, 250)
  }

  /** 落临时库收尾：生成 backid 并登记批次 */
  const finalizePersist = async () => {
    const file = activeFile.value!
    const backid = await createBackid(persistBatches.value.length + 1)
    persistBatches.value = [
      ...persistBatches.value,
      {
        backid,
        fileName: file.name,
        taskIds: [...matchedTaskIds.value],
        rows: file.rows,
        tempTable: 'tmp_ext_retro_raw',
      },
    ]
    setStatus('临时库已落库')
    Message.success(`已全量落临时库，生成 backid 批次 ${backid}`)
  }

  /** 临时库数据查看（R47） */
  const tempPreviewVisible = ref(false)

  /** 打开临时库数据预览 */
  const openTempPreview = () => {
    tempPreviewVisible.value = true
  }

  /** 临时库预览数据（按映射标准字段展示） */
  const tempPreviewRows = computed(() => {
    const file = activeFile.value
    if (!file) return []
    const stdCols = fieldMappings.value.filter((m) => m.targetField && m.targetField !== NON_STD_FIELD).map((m) => m.targetField)
    return Array.from({ length: 10 }, (_, i) => {
      const row: Record<string, string | number> = { _rowNo: i + 1 }
      stdCols.forEach((col, idx) => {
        row[col] = `VAL_${i + 1}_${idx + 1}`
      })
      row.id_md5 = previewRows.value[i % Math.max(previewRows.value.length, 1)]?.id_md5 ?? '—'
      row.review_date = reviewDate.value || '—'
      return row
    })
  })

  /** 临时库预览列 */
  const tempPreviewColumns = computed(() => {
    const stdCols = fieldMappings.value.filter((m) => m.targetField && m.targetField !== NON_STD_FIELD).map((m) => m.targetField)
    return ['id_md5', 'review_date', ...stdCols.filter((c) => c !== 'id_md5' && c !== 'review_date')]
  })

  /* ---------- B4 三重行数验证与一致性校验 ---------- */
  /** 原样本文件（R62：原样本文件行数参与三重行数比对） */
  const sampleFile = ref<UploadFile | null>(null)

  /** 处理原样本文件上传 */
  const onSampleUpload = (files: UploadFile[]) => {
    const f = files[files.length - 1]
    sampleFile.value = f ?? null
  }

  /** 三重行数验证结果 */
  const tripleRowCheck = ref<TripleRowCheck | null>(null)

  /** 一致性校验目标表（R67） */
  const consistencyTargetOptions = ref<HiveTableItem[]>([])
  const consistencyTargetTable = ref('')

  /** 一致性校验明细 */
  const consistencyDetails = ref<ValidationDetail[]>([])

  /** 一致性校验汇总 */
  const consistencySummary = ref<ConsistencySummary | null>(null)

  /** 校验执行中 */
  const validating = ref(false)

  /** 一致性校验分页（R71：结果存临时表后后端分页，不匹配项在前） */
  const consistencyPagination = reactive({ current: 1, pageSize: 10, total: 0 })

  /** 排序后的校验明细（不匹配在前） */
  const sortedConsistencyDetails = computed(() => {
    const list = [...consistencyDetails.value]
    // 仅展示关联成功的（R69）
    const related = list.filter((d) => d.related)
    related.sort((a, b) => Number(a.consistent) - Number(b.consistent))
    return related
  })

  /** 当前页校验明细 */
  const pagedConsistencyDetails = computed(() => {
    const start = (consistencyPagination.current - 1) * consistencyPagination.pageSize
    return sortedConsistencyDetails.value.slice(start, start + consistencyPagination.pageSize)
  })

  /** 校验明细翻页 */
  const onConsistencyPageChange = (page: number) => {
    consistencyPagination.current = page
  }

  /** 加载一致性校验候选表 */
  const loadConsistencyTables = async () => {
    consistencyTargetOptions.value = await fetchOnlineSampleTables()
  }

  /** 执行三重行数验证（R60/R61） */
  const runTripleRowCheck = async () => {
    if (!persistBatches.value.length) {
      Message.warning('请先「落临时库」生成 backid 批次')
      return
    }
    const loaded = persistBatches.value.reduce((s, b) => s + b.rows, 0)
    const source = activeFile.value?.rows ?? 0
    const sample = sampleFile.value?.size ? Math.round((sampleFile.value.size / 900)) : source
    tripleRowCheck.value = await fetchTripleRowCheck(loaded, source, sample)
    const c = tripleRowCheck.value
    // 3.1：Hive已落库 →（行数验证完成）→ 待通知
    setStatus('待通知')
    if (c.matched) {
      Message.success('三重行数验证通过：入库行数 = 源文件行数 = 原样本文件行数')
    } else {
      Message.warning('三重行数验证未通过，请检查异常行并核对原始样本文件')
    }
  }

  /** 执行一致性抽样校验（R68/R72） */
  const runConsistencyCheck = async () => {
    if (!persistBatches.value.length) {
      Message.warning('请先「落临时库」生成 backid 批次')
      return
    }
    if (!consistencyTargetTable.value) {
      Message.warning('请先选择一致性校验的目标表')
      return
    }
    validating.value = true
    try {
      const details = await fetchConsistencyDetails(100, reviewDate.value || '2026-09-30')
      consistencyDetails.value = details
      consistencySummary.value = await fetchConsistencySummary(details, consistencyTargetTable.value)
      consistencyPagination.total = sortedConsistencyDetails.value.length
      consistencyPagination.current = 1
      const s = consistencySummary.value
      // 3.1：一致性校验完成后进入「待通知」，等待通知触发
      setStatus('待通知')
      Message.info(`抽样 ${s.sampleTotal} 条：关联成功 ${s.matchedTotal} 条，关联失败 ${s.unmatchedTotal} 条，不一致 ${s.inconsistentTotal} 条`)
    } finally {
      validating.value = false
    }
  }

  /** 验证报告弹窗（R64） */
  const reportVisible = ref(false)

  /** 打开验证报告 */
  const openReport = () => {
    reportVisible.value = true
  }

  /* ---------- B5 落库文件通知 ---------- */
  const notifyConfig = ref<NotifyConfig>({ channels: [], receivers: [], maskEnabled: true, maxRetry: 3, configDesc: '' })

  /** 加载通知配置（R77/R79/R80/R81） */
  const loadNotifyConfig = async () => {
    notifyConfig.value = await fetchNotifyConfig()
  }

  /** 通知记录列表（R82） */
  const notifyRecords = ref<NotifyRecord[]>([])

  /** 加载通知记录 */
  const loadNotifyRecords = async () => {
    notifyRecords.value = await fetchNotifyRecords(persistBatches.value[0]?.backid)
  }

  /** 通知发送结果 */
  const notifySent = ref(false)

  /** 发送通知（R76 落库完成后自动触发 / R81 失败重试 3 次） */
  const sendNotify = async () => {
    if (!notifyConfig.value.channels.length) {
      Message.warning('请至少选择一个通知渠道')
      return
    }
    if (!notifyConfig.value.receivers.length) {
      Message.warning('请配置通知接收人')
      return
    }
    const backid = persistBatches.value[0]?.backid ?? ''
    const content: NotifyContent = await createNotifyContent({
      agency: selectedAgency.value?.agencyName ?? '—',
      fileName: activeFile.value?.name ?? '—',
      backid,
      loadTime: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
      loadedRows: persistBatches.value.reduce((s, b) => s + b.rows, 0),
      validationResult: tripleRowCheck.value?.matched ? '三重行数验证通过' : '三重行数验证未通过',
      exceptionSummary: tripleRowCheck.value?.matched
        ? '无异常行'
        : `入库 ${tripleRowCheck.value?.loadedRows ?? 0} 行，源文件 ${tripleRowCheck.value?.sourceFileRows ?? 0} 行，差值 ${(tripleRowCheck.value?.loadedRows ?? 0) - (tripleRowCheck.value?.sourceFileRows ?? 0)} 行`,
      consistencySummary: consistencySummary.value?.diffSummary ?? '未执行一致性校验',
    })
    const records = await dispatchNotification(
      notifyConfig.value.channels,
      content,
      notifyConfig.value.receivers,
      notifyConfig.value.maskEnabled,
      notifyConfig.value.maxRetry
    )
    notifyRecords.value = records
    notifySent.value = true
    const failed = records.filter((r) => r.sendStatus === '发送失败')
    if (failed.length) {
      Message.warning(`通知发送完成，其中 ${failed.length} 条失败（已重试 ${notifyConfig.value.maxRetry} 次），可在通知记录中查看原因`)
    } else {
      Message.success('落库通知已发送')
    }
    setStatus('已完成')
  }

  /* ---------- 落库记录（R54） ---------- */
  const persistRecord = ref<PersistRecord | null>(null)
  const recordVisible = ref(false)

  /** 生成并保存落库记录（R54：六组字段 + 计费要素） */
  const buildPersistRecord = async () => {
    const backid = persistBatches.value[0]?.backid ?? ''
    const file = activeFile.value
    const record: PersistRecord = {
      backid,
      baseInfo: {
        operator: '当前用户（风控数据组）',
        operateTime: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
        status: currentStatus.value,
      },
      agencyInfo: {
        agencyId: selectedAgency.value?.id ?? '',
        agencyCode: selectedAgency.value?.agencyCode ?? '',
        agencyName: selectedAgency.value?.agencyName ?? '',
        agencyType: selectedAgency.value?.agencyType ?? '',
        licenseNo: selectedAgency.value?.licenseNo ?? '',
      },
      fileInfo: {
        fileName: file?.name ?? '',
        acquireMode: dataSourceMode.value === 'sftp' ? 'SFTP拉取' : '手动上传',
        fileSize: file?.size ?? 0,
        fileRows: file?.rows ?? 0,
        encoding: fileStructure.encoding,
        delimiter: fileStructure.delimiter,
        encrypted: file?.encrypted ?? false,
        outboundTaskIds: [...matchedTaskIds.value],
      },
      mappingInfo: {
        product: mappingProduct.value,
        interfaceId: currentProduct.value?.interfaceId ?? '',
        mappingVersion: mappingVersion.value,
        stdFieldCount: mappedCount.value - nonStdCount.value + requiredPassedCount.value,
        nonStdFieldCount: nonStdCount.value,
        nonStdFields: nonStdFieldNames.value,
      },
      storageInfo: {
        tempTable: persistBatches.value[0]?.tempTable ?? 'tmp_ext_retro_raw',
        hiveTable: hiveTable.value,
        partitionField: 'datax',
        partitionValue: partitionValue.value,
        loadedRows: persistBatches.value.reduce((s, b) => s + b.rows, 0),
        writeStrategy: '主键（身份证号+review_date）直接覆盖',
        tempTableCleanup: '进入下一步即清理 / 定时 1 小时清理',
        uploadFileCleanup: '落库完成后 24 小时清理',
      },
      billing: {
        billingSubject: '风险数据团队',
        billingType: '按条数',
        billingRows: persistBatches.value.reduce((s, b) => s + b.rows, 0),
        billingFieldCount: mappedCount.value + requiredPassedCount.value,
        unitPrice: 0.35,
        estimatedAmount: Number((persistBatches.value.reduce((s, b) => s + b.rows, 0) * 0.35).toFixed(2)),
        billingStatus: '未计费',
      },
    }
    persistRecord.value = await savePersistRecord(record)
    return record
  }

  /** 打开落库记录抽屉 */
  const openPersistRecord = () => {
    recordVisible.value = true
  }

  return {
    // 状态机
    currentStatus,
    setStatus,
    PERSIST_STATUS_FLOW,
    // B1
    agencies,
    selectedAgencyId,
    selectedAgency,
    pathCleanupNotice,
    dataSourceMode,
    sftpDir,
    sftpSubDir,
    sftpFileName,
    dirOptions,
    fullFilePath,
    sftpParams,
    fileList,
    querying,
    selectedFile,
    uploadFileList,
    uploadedFile,
    fileStructure,
    previewRows,
    previewColumns,
    activeFile,
    loadAgencies,
    onAgencyChange,
    queryFiles,
    onFileSelect,
    onUploadChange,
    onUploadRemove,
    onDataSourceModeChange,
    // 解密
    decryptVisible,
    decrypting,
    decryptKey,
    decryptFailed,
    openDecrypt,
    confirmDecrypt,
    // 去重
    processedModalVisible,
    processedRecords,
    checkFileDuplicate,
    confirmRewrite,
    // B2
    productOptions,
    mappingProduct,
    currentProduct,
    isCustomProduct,
    stdFieldOptions,
    fieldMappings,
    REQUIRED_FIELD_MATCH,
    requiredSourceSelection,
    catalogSourceFields,
    sourceFieldComment,
    requiredMappingStatus,
    requiredTwoPassed,
    requiredPassedCount,
    loadProducts,
    loadProductFields,
    onMappingProductChange,
    onRequiredSourceChange,
    applyAutoCollision,
    applyMappingFile,
    setMappingTarget,
    mappedCount,
    nonStdCount,
    nonStdFieldNames,
    mappingPagination,
    pagedFieldMappings,
    onMappingPageChange,
    onMappingPageSizeChange,
    mappingVersion,
    buildMappingVersion,
    NON_STD_FIELD,
    // 前置任务
    outboundTasks,
    matchedTaskIds,
    loadOutboundTasks,
    // B3
    hiveTableOptions,
    hiveTable,
    loadHiveTables,
    reviewDate,
    partitionValue,
    persistBatches,
    persisting,
    persistPercent,
    persistToTemp,
    tempPreviewVisible,
    openTempPreview,
    tempPreviewRows,
    tempPreviewColumns,
    // B4
    sampleFile,
    onSampleUpload,
    tripleRowCheck,
    consistencyTargetOptions,
    consistencyTargetTable,
    consistencyDetails,
    consistencySummary,
    validating,
    consistencyPagination,
    sortedConsistencyDetails,
    pagedConsistencyDetails,
    onConsistencyPageChange,
    loadConsistencyTables,
    runTripleRowCheck,
    runConsistencyCheck,
    reportVisible,
    openReport,
    // B5
    notifyConfig,
    loadNotifyConfig,
    notifyRecords,
    loadNotifyRecords,
    notifySent,
    sendNotify,
    // 落库记录
    persistRecord,
    recordVisible,
    buildPersistRecord,
    openPersistRecord,
  }
}
