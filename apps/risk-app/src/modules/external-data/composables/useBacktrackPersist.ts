import { ref, reactive, computed, watch } from 'vue'
import { Message } from '@arco-design/web-vue'
import type { UploadFile } from '@arco-design/web-vue'
import { fetchEnabledAgencies } from '../api/creditAgency'
import type { CreditAgency, AgencyType } from '../mock/creditAgencies'
import {
  fetchRetroTree,
  decryptArchivePackage,
  fetchArchiveContent,
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
  fetchReviewDateFromFileName,
  fetchNotifyConfig,
  createNotifyContent,
  dispatchNotification,
  createBackid,
  savePersistRecord,
  fetchPersistRecord,
  fetchNotifyRecords,
  createAsyncTask,
  saveAsyncTask,
  saveTaskLog,
  bindTaskBackid as bindAsyncTaskBackid,
  fetchTasksByBackid,
  fetchBatchStage,
} from '../api/backtrack'
import type { RetroFile, RetroTreeNode, PreviewRow, ProcessedFileRecord } from '../mock/retroFiles'
import type { OutboundTask } from '../mock/outboundTasks'
import type { BacktrackProduct } from '../mock/backtrackProducts'
import type { HiveTableItem } from '../mock/hiveTables'
import type { ValidationDetail, ConsistencySummary, TripleRowCheck } from '../mock/validation'
import type { NotifyConfig, NotifyContent, NotifyRecord } from '../mock/notify'
import type { PersistRecord, PersistStatus, AsyncTask, AsyncTaskType, TaskResumeContext, BatchStage } from '../mock/backtrackPersist'
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

/** 必填映射规则项 */
interface RequiredFieldRule {
  /** 标准库字段名 */
  std: string
  /** 标准字段说明 */
  stdLabel: string
  /** 默认选中的文件出参字段 */
  defaultSource: string
  /** 等同判定规则说明 */
  rule: string
  /** 等同判定：出参字段名是否与该标准字段等同 */
  matcher: (f: string) => boolean
  /** 适用机构类型；缺省表示所有机构类型均适用 */
  agencyTypes?: AgencyType[]
}

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

  /** SFTP 目录树（R14：支持文件夹 / CSV / 压缩包三级节点，直接选路径） */
  const retroTree = ref<RetroTreeNode[]>([])

  /** 当前选中的目录树节点 */
  const selectedTreeNode = ref<RetroTreeNode | null>(null)

  /** 已解压的压缩包节点 */
  const extractedArchive = ref<RetroTreeNode | null>(null)

  /* ---------- 压缩包解密与解压（R17/R19） ---------- */
  /** 已解密（密码校验通过）的压缩包节点 key 集合 */
  const decryptedArchives = ref<string[]>([])

  /** 已解压并已挂载包内文件的压缩包节点 key 集合 */
  const extractedArchives = ref<string[]>([])

  /** 压缩包解压中 */
  const extractingArchive = ref(false)

  /** 压缩包解密弹窗可见性 */
  const archiveDecryptVisible = ref(false)

  /** 压缩包解密进行中 */
  const archiveDecrypting = ref(false)

  /** 压缩包密码输入 */
  const archivePassword = ref('')

  /** 压缩包解密失败原因 */
  const archiveDecryptFailed = ref('')

  /** 当前待解密的压缩包节点 */
  let archiveDecryptTarget: RetroTreeNode | null = null

  /** 目录树展开的节点 key */
  const expandedKeys = ref<string[]>([])

  /** 目录树加载后默认展开顶层目录 */
  watch(retroTree, (nodes) => {
    expandedKeys.value = nodes.map((n) => n.key)
  })

  /** 目录树展开 / 收起 */
  const onTreeExpand = (keys: (string | number)[]) => {
    expandedKeys.value = keys.map((k) => String(k))
  }

  /** 完整文件路径预览（R14：目录路径 + 选中节点相对路径） */
  const fullFilePath = computed(() => {
    const a = selectedAgency.value
    if (!a) return ''
    const dir = (sftpDir.value || a.sftp.directory).replace(/\/+$/, '')
    const node = selectedTreeNode.value
    if (!node) return `${dir}/`
    return `${dir}/${node.path}`
  })

  /** SFTP 参数自动带入（R13：只读展示机构配置） */
  const sftpParams = computed(() => selectedAgency.value?.sftp ?? null)

  /** SFTP 目录树加载中 */
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

  /** 切换机构：重置目录树，自动带出 SFTP 配置（R13） */
  const onAgencyChange = async () => {
    sftpDir.value = selectedAgency.value?.sftp.directory ?? ''
    retroTree.value = []
    selectedTreeNode.value = null
    extractedArchive.value = null
    decryptedArchives.value = []
    extractedArchives.value = []
    selectedFile.value = null
    uploadedFile.value = null
    uploadFileList.value = []
    previewRows.value = []
    await loadRetroTree()
    if (dataSourceMode.value === 'sftp') {
      setStatus('待开始')
    }
  }

  /** 加载机构 SFTP 目录树（R14：文件夹 / CSV / 压缩包三级节点） */
  const loadRetroTree = async () => {
    if (!selectedAgency.value) {
      Message.warning('请先选择征信机构')
      return
    }
    querying.value = true
    try {
      retroTree.value = await fetchRetroTree(selectedAgency.value.agencyCode)
    } finally {
      querying.value = false
    }
  }

  /** 目录树节点 → 回溯文件（供预览、解密与落库链路复用） */
  const toRetroFile = (node: RetroTreeNode): RetroFile => ({
    id: node.key,
    agencyCode: selectedAgency.value?.agencyCode ?? '',
    name: node.name,
    size: node.size || 0,
    rows: node.rows || 0,
    updateTime: node.updateTime || '',
    encrypted: !!node.encrypted,
    encoding: node.encoding || 'UTF-8',
    delimiter: node.delimiter || '逗号',
    fieldCount: node.fieldCount || 0,
    header: node.header || [],
  })

  /** 递归查找目录树节点（按 key） */
  const findNodeByKey = (nodes: RetroTreeNode[], key: string): RetroTreeNode | null => {
    for (const n of nodes) {
      if (n.key === key) return n
      if (n.children) {
        const hit = findNodeByKey(n.children, key)
        if (hit) return hit
      }
    }
    return null
  }

  /** 递归查找目录树节点（按文件名） */
  const findNodeByName = (nodes: RetroTreeNode[], name: string): RetroTreeNode | null => {
    for (const n of nodes) {
      if (n.name === name) return n
      if (n.children) {
        const hit = findNodeByName(n.children, name)
        if (hit) return hit
      }
    }
    return null
  }

  /** 判断压缩包是否已完成解密 */
  const isArchiveDecrypted = (node: RetroTreeNode) => decryptedArchives.value.includes(node.key)

  /** 判断压缩包是否已完成解压 */
  const isArchiveExtracted = (node: RetroTreeNode) => extractedArchives.value.includes(node.key)

  /**
   * 解压压缩包（R17：包内仍只接受 CSV）
   * 加密包必须先通过密码解密，否则拒绝解压
   * @param node 压缩包节点
   */
  const extractArchive = async (node: RetroTreeNode) => {
    if (node.encrypted && !isArchiveDecrypted(node)) {
      openArchiveDecrypt(node)
      return
    }
    if (isArchiveExtracted(node)) {
      Message.info(`${node.name} 已解压`)
      return
    }
    extractingArchive.value = true
    try {
      const inner = await fetchArchiveContent(node.key)
      const csvFiles = inner.filter((c) => c.nodeType === 'csv')
      if (!csvFiles.length) {
        Message.warning('压缩包内没有可落库的 CSV 文件')
        return
      }
      // 将包内文件挂回树节点，解压后可展开选择
      node.children = inner
      extractedArchive.value = node
      if (!extractedArchives.value.includes(node.key)) {
        extractedArchives.value = [...extractedArchives.value, node.key]
      }
      // 自动展开压缩包节点，展开后可直接选择包内 CSV 拉取
      if (!expandedKeys.value.includes(node.key)) {
        expandedKeys.value = [...expandedKeys.value, node.key]
      }
      Message.success(`已解压 ${node.name}，内含 ${csvFiles.length} 个 CSV 文件，请选择其一拉取`)
    } finally {
      extractingArchive.value = false
    }
  }

  /** 打开压缩包解密弹窗 */
  const openArchiveDecrypt = (node: RetroTreeNode) => {
    archiveDecryptTarget = node
    archivePassword.value = ''
    archiveDecryptFailed.value = ''
    archiveDecryptVisible.value = true
  }

  /**
   * 确认压缩包解密：密码错误时阻断并保持弹窗打开（R19），成功后自动继续解压
   * @returns 解密成功返回 true（关闭弹窗），失败返回 false（保持弹窗）
   */
  const confirmArchiveDecrypt = async (): Promise<boolean> => {
    if (!archivePassword.value.trim()) {
      Message.warning('请输入压缩包密码')
      return false
    }
    archiveDecrypting.value = true
    archiveDecryptFailed.value = ''
    try {
      const target = archiveDecryptTarget
      if (!target) return false
      const ok = await decryptArchivePackage(target.key, archivePassword.value)
      if (!ok) {
        archiveDecryptFailed.value = '解压失败，请检查压缩包密码是否正确'
        Message.error('解压失败，请检查压缩包密码是否正确')
        return false
      }
      if (!decryptedArchives.value.includes(target.key)) {
        decryptedArchives.value = [...decryptedArchives.value, target.key]
      }
      archiveDecryptVisible.value = false
      Message.success(`压缩包 ${target.name} 解密成功`)
      await extractArchive(target)
      return true
    } finally {
      archiveDecrypting.value = false
    }
  }

  /**
   * 选中目录树节点（key 来自 a-tree 的 select 事件）
   * - CSV：直接拉取并进入预览（R20）
   * - 压缩包：加密包先解密、再解压并展开包内文件
   * - 文件夹：仅作为导航节点
   */
  const onTreeSelect = async (key: string | number) => {
    const node = findNodeByKey(retroTree.value, String(key))
    if (!node) return
    selectedTreeNode.value = node
    if (node.nodeType === 'archive') {
      await extractArchive(node)
      return
    }
    if (node.nodeType === 'folder') return
    setStatus('文件已获取')
    await onFileSelect(toRetroFile(node))
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
    // 回溯日期由文件名自动解析（3.2 关联条件与 3.3 分区值同源）
    await applyAutoReviewDate(file.name)
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
    // 同步目录树节点的加密标记，避免重新选中时重复提示解密
    const treeNode = findNodeByKey(retroTree.value, target.id)
    if (treeNode) treeNode.encrypted = false
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
    // 回溯日期由文件名自动解析（3.2 关联条件与 3.3 分区值同源）
    await applyAutoReviewDate(uploadedFile.value.name)
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

  /** 必填映射（R32：IDMD5、review date、phone_md5 强制绑定） */
  const REQUIRED_FIELD_MATCH: RequiredFieldRule[] = [
    {
      std: 'id_md5',
      stdLabel: '加密MD5字段',
      defaultSource: 'id_md5',
      rule: '主体标识密文字段（字段名含 md5 / hash，且不含手机号）',
      matcher: (f: string) => /md5|hash/i.test(f) && !/phone|mobile|tel/i.test(f),
    },
    {
      std: 'review_date',
      stdLabel: '回溯日期',
      defaultSource: 'review_data',
      rule: '回溯基准日期字段（字段名含 date / time / review_data）',
      matcher: (f: string) => /date|time/i.test(f) || f === 'review_data',
    },
    {
      std: 'phone_md5',
      stdLabel: '加密手机号字段',
      defaultSource: 'phone_md5',
      rule: '手机号密文字段（字段名含 phone / mobile / tel 且带 md5 / hash）',
      matcher: (f: string) => /phone|mobile|tel/i.test(f) && /md5|hash/i.test(f),
      // 三要素（身份证 + 姓名 + 手机号）仅个人征信适用，企业征信无手机号维度
      agencyTypes: ['个人征信'],
    },
  ]

  /** 必填区已选的文件出参字段 */
  const requiredSourceSelection = reactive<Record<string, string>>({
    id_md5: 'id_md5',
    review_date: 'review_data',
    phone_md5: 'phone_md5',
  })

  /** 当前产品的出参字段清单 */
  const productFields = computed(() => currentProduct.value?.fields ?? [])

  /** 出参字段名列表 */
  const catalogSourceFields = computed(() => productFields.value.map((f) => f.name))

  /** 字段说明查询（R30：未收录产品显示「—」） */
  const sourceFieldComment = (f: string) => productFields.value.find((x) => x.name === f)?.comment || '—'

  /**
   * 当前生效的必填映射规则
   * 未收录产品（R31）走自由输入，不参与强制绑定；
   * phone_md5 属三要素维度，仅个人征信机构适用。
   */
  const activeRequiredFieldMatch = computed(() => {
    if (isCustomProduct.value) return []
    const agencyType = selectedAgency.value?.agencyType
    return REQUIRED_FIELD_MATCH.filter((r) => !r.agencyTypes || (!!agencyType && r.agencyTypes.includes(agencyType)))
  })

  /** 必选区已占用的出参字段（仅统计当前生效的必填项） */
  const occupiedSourceFields = computed(() =>
    activeRequiredFieldMatch.value.map((r) => requiredSourceSelection[r.std]).filter(Boolean)
  )

  /** 必填映射校验状态 */
  const requiredMappingStatus = computed(() =>
    activeRequiredFieldMatch.value.map((r) => {
      const sel = requiredSourceSelection[r.std]
      return { ...r, sel, ok: !!sel && catalogSourceFields.value.includes(sel) && r.matcher(sel) }
    })
  )

  /** 必填映射是否全部通过 */
  const requiredAllPassed = computed(() => requiredMappingStatus.value.every((r) => r.ok))

  /** 必填映射已通过数量 */
  const requiredPassedCount = computed(() => requiredMappingStatus.value.filter((r) => r.ok).length)

  /** 切换产品后校正必填区已选字段 */
  const ensureRequiredSelection = () => {
    activeRequiredFieldMatch.value.forEach((r) => {
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
      phone_md5: 'phone_md5',
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

  /** 回溯日期（3.2 一致性校验关联条件 + 3.3 写入 datax 分区，R40/R68）：由回溯文件名自动解析 */
  const reviewDate = ref('')

  /**
   * 按回溯文件名自动解析回溯日期
   * 解析规则（mock 文件命名口径见 mock/retroFiles.ts）：
   *   1. 8 位 yyyyMMdd 直接取用，如 BH_RETRO_20261012_01.csv → 2026-10-12；
   *   2. 4 位 MMdd 补当年，如 PD_BACK_0918_1.csv → 2026-09-18；
   *   3. 解析不到时兜底为批次创建日期（当日）。
   * @param fileName 回溯返回文件名
   */
  const applyAutoReviewDate = async (fileName: string) => {
    const parsed = await fetchReviewDateFromFileName(fileName)
    const d = new Date()
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    reviewDate.value = parsed || today
  }

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
    // R86：落临时库属写操作类执行动作，创建异步任务后再执行
    const task = await createPersistTask('解析落库', '', true, 2)
    persisting.value = true
    persistPercent.value = 0
    const timer = setInterval(() => {
      persistPercent.value = Math.min(persistPercent.value + 20, 100)
      if (persistPercent.value >= 100) {
        clearInterval(timer)
        persisting.value = false
        void finalizePersist(task.taskId)
      }
    }, 250)
  }

  /** 落临时库收尾：生成 backid 并登记批次 */
  const finalizePersist = async (taskId?: string) => {
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
    // 临时库数据已变更，需重新执行一致性校验后才可推进 Hive
    consistencyChecked.value = false
    consistencySkipped.value = false
    consistencySkipReason.value = ''
    consistencySummary.value = null
    consistencyDetails.value = []
    // 任务回填 backid 并置为成功，供任务列表查看明细与续做
    if (taskId) {
      const time = new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
      await saveAsyncTask(taskId, { status: '成功', finishTime: time })
      await saveTaskLog(taskId, {
        time,
        stage: '任务结束',
        message: `已全量落临时库，生成 backid 批次 ${backid}`,
      })
      // backid 在落临时库收尾时才生成，需回写到任务与续做上下文
      await bindTaskBackid(taskId, backid)
    }
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

  /** 一致性校验是否已完成（推进 Hive 标准库的前置门槛：先比对确认，再落正式库） */
  const consistencyChecked = ref(false)

  /** 一致性校验是否已被跳过（未上线产品无线上数据可对比，可跳过校验直接推进落库） */
  const consistencySkipped = ref(false)

  /** 一致性校验跳过原因 */
  const consistencySkipReason = ref('')

  /** 回溯日期变更后需重新执行一致性校验（review date 是 R68 关联条件之一） */
  watch(reviewDate, () => {
    consistencyChecked.value = false
  })

  /** 一致性校验目标表（R67） */
  const consistencyTargetOptions = ref<HiveTableItem[]>([])
  const consistencyTargetTable = ref('')

  /** 校验目标表变更后需重新执行一致性校验（比对对象变化）；已跳过态不受影响 */
  watch(consistencyTargetTable, () => {
    consistencyChecked.value = false
  })

  /** 一致性校验结论是否已就绪（已执行通过 或 已跳过；两者均不阻断落 Hive 标准库） */
  const consistencyReady = computed(() => consistencyChecked.value || consistencySkipped.value)

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
    // R86：行数验证属只读类执行动作，创建异步任务后再执行
    const task = await createPersistTask('行数验证', persistBatches.value[0]?.backid ?? '', false, 2)
    const loaded = persistBatches.value.reduce((s, b) => s + b.rows, 0)
    const source = activeFile.value?.rows ?? 0
    const sample = sampleFile.value?.size ? Math.round((sampleFile.value.size / 900)) : source
    tripleRowCheck.value = await fetchTripleRowCheck(loaded, source, sample)
    const c = tripleRowCheck.value
    // 落库主流程终点为「Hive已落库」，行数验证为后台任务，不再推进主流程状态
    if (c.matched) {
      await finishPersistTask(task.taskId, '成功', '三重行数验证通过：入库行数 = 源文件行数 = 原样本文件行数')
      Message.success('三重行数验证通过：入库行数 = 源文件行数 = 原样本文件行数')
    } else {
      await finishPersistTask(task.taskId, '失败', '三重行数验证未通过，请检查异常行并核对原始样本文件')
      Message.warning('三重行数验证未通过，请检查异常行并核对原始样本文件')
    }
  }

  /**
   * 执行一致性抽样校验（R68/R72）
   * 位于「落临时库」与「落 Hive 标准库」之间：回溯值取自临时库，
   * 线上值取自所选样本表；关联条件中的 review date 由回溯文件名自动解析，无需页面输入。
   */
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
    // R86：一致性校验属只读类执行动作，创建异步任务后再执行
    const task = await createPersistTask('一致性校验', persistBatches.value[0]?.backid ?? '', false, 2)
    try {
      const details = await fetchConsistencyDetails(100, reviewDate.value || '2026-09-30')
      consistencyDetails.value = details
      consistencySummary.value = await fetchConsistencySummary(details, consistencyTargetTable.value)
      consistencyPagination.total = sortedConsistencyDetails.value.length
      consistencyPagination.current = 1
      consistencyChecked.value = true
      consistencySkipped.value = false
      consistencySkipReason.value = ''
      const s = consistencySummary.value
      await finishPersistTask(
        task.taskId,
        '成功',
        `抽样 ${s.sampleTotal} 条：关联成功 ${s.matchedTotal} 条，关联失败 ${s.unmatchedTotal} 条，不一致 ${s.inconsistentTotal} 条`
      )
      Message.info(`抽样 ${s.sampleTotal} 条：关联成功 ${s.matchedTotal} 条，关联失败 ${s.unmatchedTotal} 条，不一致 ${s.inconsistentTotal} 条`)
    } catch (e) {
      await finishPersistTask(task.taskId, '失败', e instanceof Error ? e.message : '一致性校验执行异常')
      throw e
    } finally {
      validating.value = false
    }
  }

  /**
   * 跳过一致性抽样校验
   * 适用场景：未上线产品无线上数据可对比（需求文档「未上线产品跳过校验」），
   * 跳过后不阻断落 Hive 标准库，验证报告中标注「未执行」
   * @param reason 跳过原因
   */
  const skipConsistencyCheck = async (reason: string) => {
    if (!persistBatches.value.length) {
      Message.warning('请先「落临时库」生成 backid 批次')
      return
    }
    // R86：跳过同样登记任务，保证任务列表可追溯
    const task = await createPersistTask('一致性校验', persistBatches.value[0]?.backid ?? '', false, 2)
    consistencyChecked.value = false
    consistencySkipped.value = true
    consistencySkipReason.value = reason
    consistencySummary.value = null
    consistencyDetails.value = []
    consistencyPagination.total = 0
    await finishPersistTask(task.taskId, '成功', `已跳过一致性抽样校验：${reason}（验证报告标注未执行）`)
    await saveAsyncTask(task.taskId, { skipped: true })
    Message.info(`已跳过一致性抽样校验：${reason}`)
  }

  /** 验证报告弹窗（R64） */
  const reportVisible = ref(false)

  /** 打开验证报告 */
  const openReport = () => {
    reportVisible.value = true
  }

  /* ---------- B5 落库文件通知 ---------- */
  const notifyConfig = ref<NotifyConfig>({ channels: [], receivers: [], maskEnabled: true, maxRetry: 3, configDesc: '' })

  /**
   * 加载通知配置（后台默认配置）
   * 通知由后台按默认渠道与接收人自动推送，页面不再提供配置入口
   */
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

  /**
   * 后台自动推送落库通知
   * 通知渠道与接收人取后台默认配置，页面不提供配置入口；
   * 落 Hive 标准库成功后由系统自动触发，失败按 R81 自动重试
   */
  const sendNotify = async () => {
    // 后台默认配置兜底：渠道与接收人均由后台预置，缺失时不阻断落库主流程
    const channels = notifyConfig.value.channels.length ? notifyConfig.value.channels : ['数据服务公众号']
    const receivers = notifyConfig.value.receivers.length ? notifyConfig.value.receivers : ['风险数据团队值班']
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
      consistencySummary: consistencySummary.value?.diffSummary
        ?? (consistencySkipped.value ? `未执行一致性校验（已跳过：${consistencySkipReason.value}）` : '未执行一致性校验'),
    })
    const records = await dispatchNotification(channels, content, receivers, notifyConfig.value.maskEnabled, notifyConfig.value.maxRetry)
    notifyRecords.value = records
    notifySent.value = true
    const failed = records.filter((r) => r.sendStatus === '发送失败')
    if (failed.length) {
      Message.warning(`落库通知已由后台推送，其中 ${failed.length} 条失败（已重试 ${notifyConfig.value.maxRetry} 次），可在通知记录中查看原因`)
    } else {
      Message.success('落库通知已由后台推送')
    }
  }

  /* ---------- 异步任务（R86：执行类操作均创建任务） ---------- */

  /** 本次会话创建的任务列表（供任务明细抽屉展示执行轨迹） */
  const createdTasks = ref<AsyncTask[]>([])

  /**
   * 构造任务续做上下文
   * 记录当前机构、文件、映射与批次信息，任务列表据此回到落库流程继续下一步
   * @param backid 关联批次
   * @param resumeStep 续做应落位的步骤序号（0 基）
   */
  const buildResumeContext = (backid: string, resumeStep: number): TaskResumeContext => {
    const file = activeFile.value
    return {
      agencyId: selectedAgency.value?.id ?? '',
      agencyCode: selectedAgency.value?.agencyCode ?? '',
      agencyName: selectedAgency.value?.agencyName ?? '',
      agencyType: selectedAgency.value?.agencyType ?? '',
      fileName: file?.name ?? '',
      fileFingerprint: file ? `${file.name}@${file.size}` : '',
      backid,
      product: mappingProduct.value,
      interfaceId: currentProduct.value?.interfaceId ?? '',
      hiveTable: hiveTable.value,
      partitionValue: partitionValue.value,
      reviewDate: reviewDate.value,
      consistencyTargetTable: consistencyTargetTable.value,
      outboundTaskIds: [...matchedTaskIds.value],
      resumeStep,
    }
  }

  /**
   * 创建异步任务（R86）
   * 任务写入后立即出现在服务任务列表，可查看任务明细并继续下一步
   * @param taskType 任务类型
   * @param backid 关联 backid
   * @param writeOperation 是否写操作类（写操作按文件指纹判重）
   * @param resumeStep 续做应落位的步骤序号（0 基）
   * @returns 新建的任务
   */
  const createPersistTask = async (
    taskType: AsyncTaskType,
    backid: string,
    writeOperation: boolean,
    resumeStep: number
  ): Promise<AsyncTask> => {
    const file = activeFile.value
    const task = await createAsyncTask({
      taskType,
      backid,
      agencyName: selectedAgency.value?.agencyName ?? '',
      fileName: file?.name ?? '',
      createTime: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
      status: '执行中',
      finishTime: '',
      operator: '当前用户（风控数据组）',
      fileFingerprint: file ? `${file.name}@${file.size}` : '',
      writeOperation,
      stuckThresholdMinutes: writeOperation ? 120 : 30,
      logs: [
        {
          time: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
          stage: '任务创建',
          message: `${taskType}任务已提交，进入执行中`,
        },
      ],
      resumeContext: buildResumeContext(backid, resumeStep),
    })
    createdTasks.value = [task, ...createdTasks.value]
    return task
  }

  /**
   * 结束异步任务（R84 状态维护：成功 / 失败）
   * @param taskId 任务 ID
   * @param status 终态
   * @param message 结果描述
   */
  const finishPersistTask = async (taskId: string, status: '成功' | '失败', message: string) => {
    const time = new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
    await saveTaskLog(taskId, { time, stage: '任务结束', message, error: status === '失败' })
    await saveAsyncTask(taskId, { status, finishTime: time, ...(status === '失败' ? { failReason: message } : {}) })
  }

  /**
   * 回写任务的关联 backid（R51：backid 在落临时库收尾时才生成）
   * @param taskId 任务 ID
   * @param backid 批次标识
   */
  const bindTaskBackid = async (taskId: string, backid: string) => {
    await bindAsyncTaskBackid(taskId, backid)
  }

  /**
   * 按任务续做上下文回填流程状态
   * 供任务列表「继续下一步」跳转后恢复已完成的环节，避免用户重头再来
   * @param ctx 任务续做上下文
   * @returns 回填后应落位的步骤序号（0 基）
   */
  const restoreFromResumeContext = async (ctx: TaskResumeContext): Promise<number> => {
    // 1. 机构：切换机构后需重载该机构的产品与前置外发任务，否则映射区无可选项
    selectedAgencyId.value = ctx.agencyId
    sftpDir.value = selectedAgency.value?.sftp.directory ?? ''
    dataSourceMode.value = 'sftp'
    await loadRetroTree()
    await loadProducts()
    await loadOutboundTasks()
    // 2. 文件：在目录树中定位并选中（节点 key 含月份目录，按文件名递归匹配更稳妥）
    const node = findNodeByKey(retroTree.value, `${ctx.agencyCode}/${ctx.fileName}`)
      ?? findNodeByKey(retroTree.value, ctx.fileName)
      ?? findNodeByName(retroTree.value, ctx.fileName)
    if (node) {
      selectedTreeNode.value = node
      await onFileSelect(toRetroFile(node))
    }
    // 3. 前置外发任务
    if (ctx.outboundTaskIds.length) {
      matchedTaskIds.value = [...ctx.outboundTaskIds]
    }
    // 4. 外数产品与字段映射
    if (ctx.product) {
      mappingProduct.value = ctx.product
      await loadProductFields()
    }
    // 5. 落库目标与分区（分区值由回溯日期推导，只读 computed 不可直接赋值）
    if (ctx.hiveTable) hiveTable.value = ctx.hiveTable
    if (ctx.reviewDate) reviewDate.value = ctx.reviewDate
    if (ctx.consistencyTargetTable) consistencyTargetTable.value = ctx.consistencyTargetTable
    // 6. 批次：已落临时库则恢复批次信息
    if (ctx.backid) {
      persistBatches.value = [
        {
          backid: ctx.backid,
          fileName: ctx.fileName,
          taskIds: [...ctx.outboundTaskIds],
          rows: activeFile.value?.rows ?? 0,
          tempTable: 'tmp_ext_retro_raw',
        },
      ]
      setStatus('临时库已落库')
    }
    return ctx.resumeStep
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

  /**
   * 按 backid 恢复批次上下文并定位到批次所处阶段
   * 用于从服务任务列表点击 backid 跳回落库流程页：按批次标识反查关联任务，
   * 取任一任务上下文回填机构 / 文件 / 映射 / 落库目标，再按批次阶段定位步骤
   * @param backid 批次标识
   * @returns 批次阶段信息；批次不存在时返回 null
   */
  const restoreFromBackid = async (backid: string): Promise<{ stage: BatchStage; tasks: AsyncTask[] } | null> => {
    const tasks = await fetchTasksByBackid(backid)
    if (!tasks.length) return null
    const stage = await fetchBatchStage(tasks)
    if (!stage) return null
    // 取带续做上下文的任务回填流程状态（批次内任务共享同一机构 / 文件 / 映射）
    const ctxTask = tasks.find((t) => t.resumeContext)
    if (ctxTask?.resumeContext) {
      await restoreFromResumeContext(ctxTask.resumeContext)
    }
    // 落库记录与通知记录按 backid 关联，此处一并载入，便于查看批次产出
    const record = await fetchPersistRecord(backid)
    if (record) persistRecord.value = record
    await loadNotifyRecords()
    return { stage, tasks }
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
    retroTree,
    selectedTreeNode,
    extractedArchive,
    decryptedArchives,
    extractedArchives,
    extractingArchive,
    archiveDecryptVisible,
    archiveDecrypting,
    archivePassword,
    archiveDecryptFailed,
    openArchiveDecrypt,
    confirmArchiveDecrypt,
    isArchiveDecrypted,
    isArchiveExtracted,
    extractArchive,
    expandedKeys,
    onTreeExpand,
    fullFilePath,
    sftpParams,
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
    loadRetroTree,
    onTreeSelect,
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
    REQUIRED_FIELD_MATCH, activeRequiredFieldMatch, requiredSourceSelection, catalogSourceFields, sourceFieldComment,
    requiredMappingStatus, requiredAllPassed, requiredPassedCount,
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
    consistencyChecked,
    consistencySkipped,
    consistencySkipReason,
    consistencyReady,
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
    skipConsistencyCheck,
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
    // 异步任务（R86）
    createdTasks,
    createPersistTask,
    finishPersistTask,
    bindTaskBackid,
    restoreFromResumeContext,
    restoreFromBackid,
  }
}
