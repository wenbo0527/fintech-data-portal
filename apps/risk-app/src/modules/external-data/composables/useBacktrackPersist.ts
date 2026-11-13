import { ref, reactive, computed, watch } from 'vue'
import { Message } from '@arco-design/web-vue'
import type { UploadFile } from '@arco-design/web-vue'
import { fetchEnabledAgencies } from '../api/creditAgency'
import type { CreditAgency } from '../mock/creditAgencies'
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
import type { NotifyConfig, NotifyContent } from '../mock/notify'
import type { PersistRecord, PersistStatus, AsyncTask, AsyncTaskType, TaskResumeContext, BatchStage, RequiredCipherEntry } from '../mock/backtrackPersist'
import { PERSIST_STATUS_FLOW, resolveStatusFromTasks } from '../mock/backtrackPersist'
// 加密方式字典与密文长度口径沿用样本校验那一份（R02：主流 SM3 / SHA256，MD5 仅存量兼容），向导不再自带算法列表
import { ENCRYPTION_ALGORITHMS, getEncryptionAlgorithm, type EncryptionAlgorithm } from '../mock/encryptionAlgorithm'
// 映射的分层继承与回写统一取自映射模块，向导不再自带碰撞字典、占位符或“先继承后碰撞”的两套写法
import {
  inheritMappingForBatch,
  diffMappingFromProduct,
  commitPersistBatchMapping,
  NON_STD_FIELD,
  type InterfaceFieldMappingRow,
  type InheritedMappingRow,
} from '../api/interfaceFieldMapping'
import { hashInt } from '../mock/stableHash'

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
  /** 匹配类型（R39 映射表独立存储匹配结果，inherit 为继承档案产品级默认映射） */
  matchedBy: 'inherit' | 'auto' | 'manual' | 'default'
  /** 匹配类型中文说明 */
  matchedLabel: string
}

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
  /**
   * 是否为密文字段
   * 为 true 时除绑定等同字段外还必须声明该字段的实际加密方式（SM3 / SHA256 / MD5），
   * 否则加密口径不明会导致与线上存量数据（R68 按密文身份证号关联）对不上
   */
  cipher: boolean
}

/**
 * 创建外数回溯落库的流程状态容器
 * @returns 流程状态与业务方法集合
 */
export function useBacktrackPersist() {
  /* ---------- 状态机（3.1） ---------- */
  /**
   * 手工基准状态：前 5 态（待开始 → 前置任务已匹配）由页面交互推进
   */
  const baseStatus = ref<PersistStatus>('待开始')

  /**
   * 任务推导状态：后 2 态（临时库已落库 / Hive已落库）由批次任务推导，
   * 任务列表为唯一事实源，避免页面状态与任务列表出现两套口径
   */
  const derivedStatus = computed<PersistStatus | null>(() => resolveStatusFromTasks(batchTasks.value))

  /**
   * 当前落库状态：手工基准与任务推导取更靠后者
   * 两者一致时即为真实状态；任务推导优先体现已完成的落库动作
   */
  const currentStatus = computed<PersistStatus>(() => {
    const base = baseStatus.value
    const derived = derivedStatus.value
    if (!derived) return base
    return PERSIST_STATUS_FLOW.indexOf(derived) > PERSIST_STATUS_FLOW.indexOf(base) ? derived : base
  })

  /**
   * 设置当前落库状态（仅作用于手工基准态）
   * @param status 目标状态
   */
  const setStatus = (status: PersistStatus) => {
    baseStatus.value = status
  }

  /* ---------- B1 选择机构与文件获取 ---------- */
  const agencies = ref<CreditAgency[]>([])
  const selectedAgencyId = ref('')

  /** 当前选中的合作机构（字段名 agency*，历史命名） */
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
    // 换机构即换批次，清空任务集合避免旧批次状态污染新流程的状态推导
    batchTasks.value = []
    await loadRetroTree()
    if (dataSourceMode.value === 'sftp') {
      setStatus('待开始')
    }
  }

  /** 加载机构 SFTP 目录树（R14：文件夹 / CSV / 压缩包三级节点） */
  const loadRetroTree = async () => {
    if (!selectedAgency.value) {
      Message.warning('请先选择合作机构')
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
    // 换文件即换批次，清空任务集合避免旧批次状态污染新流程的状态推导
    batchTasks.value = []
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
    const bytes = f.size ?? hashInt(f.name || 'retro-file', 18 * 1024 * 1024, 78 * 1024 * 1024)
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

  /** 必填映射（R32：cert_no、create_time、mobile 强制绑定；密文字段还需声明厂商回传的实际加密方式） */
  const REQUIRED_FIELD_MATCH: RequiredFieldRule[] = [
    {
      std: 'cert_no',
      stdLabel: 'SM4 加密身份证号',
      defaultSource: 'id_md5',
      rule: '主体标识密文字段（字段名含 md5 / hash，且不含手机号）',
      matcher: (f: string) => /md5|hash/i.test(f) && !/phone|mobile|tel/i.test(f),
      cipher: true,
    },
    {
      std: 'create_time',
      stdLabel: '样本回溯时间',
      defaultSource: 'review_data',
      rule: '回溯基准时间字段（字段名含 date / time / review_data）',
      matcher: (f: string) => /date|time/i.test(f) || f === 'review_data',
      cipher: false,
    },
    {
      std: 'mobile',
      stdLabel: 'SM4 加密手机号',
      defaultSource: 'phone_md5',
      rule: '手机号密文字段（字段名含 phone / mobile / tel 且带 md5 / hash）',
      matcher: (f: string) => /phone|mobile|tel/i.test(f) && /md5|hash/i.test(f),
      cipher: true,
    },
  ]

  /** 必填区已选的文件出参字段（键为标准列名，值为厂商出参字段名） */
  const requiredSourceSelection = reactive<Record<string, string>>({
    cert_no: 'id_md5',
    create_time: 'review_data',
    mobile: 'phone_md5',
  })

  /**
   * 密文类必填字段的实际加密方式（标准字段 → 算法标识）
   * 空串 = 尚未确认，此时该行判定不通过并拦截「下一步」
   */
  const requiredCipherAlgo = reactive<Record<string, string>>(
    Object.fromEntries(REQUIRED_FIELD_MATCH.filter((r) => r.cipher).map((r) => [r.std, '']))
  )

  /** 已人工确认过加密方式的标准字段（换等同字段时不再自动覆盖用户的选择） */
  const requiredCipherTouched = reactive<Record<string, boolean>>({})

  /**
   * 按出参字段名与字段说明推断实际加密方式
   * 口径：只认字段名 / 说明里显式写出的算法（如 id_md5、「主体标识（MD5加密）」→ MD5），
   * 没写就留空让用户自己选，不拿“推荐值”冒充厂商实际口径
   * @param field 文件出参字段名
   * @param comment 字段说明
   */
  const inferCipherAlgo = (field: string, comment: string): string => {
    const text = `${field} ${comment}`.toLowerCase()
    if (/sm3/.test(text)) {return 'SM3'}
    if (/sha/.test(text)) {return 'SHA256'}
    if (/md5/.test(text)) {return 'MD5'}
    return ''
  }

  /**
   * 按当前绑定的等同字段同步加密方式（仅处理未被人工确认过的字段）
   * @param rule 必填映射规则
   */
  const syncRequiredCipher = (rule: RequiredFieldRule) => {
    if (!rule.cipher || requiredCipherTouched[rule.std]) {return}
    const sel = requiredSourceSelection[rule.std]
    requiredCipherAlgo[rule.std] = sel ? inferCipherAlgo(sel, sourceFieldComment(sel)) : ''
  }

  /**
   * 人工选定密文字段的实际加密方式
   * @param std 标准字段名
   * @param algo 算法标识，空串表示清空重选
   */
  const setRequiredCipher = (std: string, algo: string) => {
    requiredCipherAlgo[std] = algo
    requiredCipherTouched[std] = !!algo
    const rule = REQUIRED_FIELD_MATCH.find((r) => r.std === std)
    if (rule) {
      syncRequiredCipher(rule)
    }
  }

  /** 当前产品的出参字段清单 */
  const productFields = computed(() => currentProduct.value?.fields ?? [])

  /** 出参字段名列表 */
  const catalogSourceFields = computed(() => productFields.value.map((f) => f.name))

  /** 字段说明查询（R30：未收录产品显示「—」） */
  const sourceFieldComment = (f: string) => productFields.value.find((x) => x.name === f)?.comment || '—'

  /**
   * 当前生效的必填映射规则
   * 未收录产品（R31）走自由输入，不参与强制绑定；
   * 机构不再区分个人 / 企业征信，必填项对所有机构一致。
   */
  const activeRequiredFieldMatch = computed(() => {
    if (isCustomProduct.value) return []
    return REQUIRED_FIELD_MATCH
  })

  /** 必选区已占用的出参字段（仅统计当前生效的必填项） */
  const occupiedSourceFields = computed(() =>
    activeRequiredFieldMatch.value.map((r) => requiredSourceSelection[r.std]).filter(Boolean)
  )

  /** 必填映射校验状态 */
  const requiredMappingStatus = computed(() =>
    activeRequiredFieldMatch.value.map((r) => {
      const sel = requiredSourceSelection[r.std]
      const algo = r.cipher ? (requiredCipherAlgo[r.std] || '') : ''
      const opt = algo ? getEncryptionAlgorithm(algo as EncryptionAlgorithm) : null
      // 等同字段判定与加密方式判定分开返回，页面才能区分「选错字段」和「漏选加密方式」两类问题
      const fieldOk = !!sel && catalogSourceFields.value.includes(sel) && r.matcher(sel)
      const algoOk = !r.cipher || !!algo
      return {
        ...r,
        sel,
        fieldOk,
        algo,
        algoOk,
        algoLabel: opt ? opt.label : '',
        algoRecommended: opt?.recommended ?? true,
        digestLength: opt?.digestLength ?? 0,
        ok: fieldOk && algoOk,
      }
    })
  )

  /** 可选加密方式清单（与样本校验共用一份算法字典） */
  const cipherAlgorithmOptions = ENCRYPTION_ALGORITHMS

  /** 密文字段已确认的加密方式结论（写入落库记录，供事后复核与关联取数口径对齐） */
  const requiredCipherSummary = computed<RequiredCipherEntry[]>(() =>
    requiredMappingStatus.value
      .filter((r) => r.cipher && r.algoOk)
      .map((r) => ({
        std: r.std,
        sourceField: r.sel,
        algorithm: r.algo as EncryptionAlgorithm,
        digestLength: r.digestLength,
      }))
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
      // 等同字段可能已随产品换掉，加密方式跟着重推（人工确认过的不动）
      syncRequiredCipher(r)
    })
  }

  /**
   * 加载产品的出参字段并生成映射列表
   * 列表建成「待匹配」裸行后直接走 rematchFields：与页面上「按档案映射匹配字段」完全同一条链路，
   * 避免装载与手动重算两份逻辑漂移（档案默认映射优先 → 字段名碰撞 → 非标准化透传）。
   */
  const loadProductFields = async () => {
    ensureRequiredSelection()
    stdFieldOptions.value = await fetchStdFieldNames()
    const pendingFields = productFields.value.filter((f) => !occupiedSourceFields.value.includes(f.name))
    fieldMappings.value = pendingFields.map((f) => ({
      sourceField: f.name,
      comment: f.comment,
      targetField: '',
      matchedBy: 'default' as const,
      matchedLabel: '待匹配',
    }))
    rematchFields(false)
    mappingPagination.total = fieldMappings.value.length
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

  /**
   * 字段匹配（档案默认映射优先，字段名碰撞兜底）
   * 原「执行自动字段碰撞」与「继承档案默认映射」两个入口本质是同一件事：给尚无落库结论的行补标准列，
   * 差别只在取数层级，因此合为一个动作：
   *   1. 档案「落库字段映射」保存的产品级默认映射（inherit）；
   *   2. 档案没覆盖的行再按字段名语义碰撞（R33，auto）；
   *   3. 两档都给不出结论的行按 R34 保留原始字段名并标记非标准化透传。
   * R65：人工调整过的行（matchedBy=manual）不参与重算，其余行可反复点击以跟随档案最新口径。
   */
  const rematchFields = (notify = true) => {
    // R30/R31：未收录外数产品的标准库字段为输入框，由用户手工填写，不参与匹配
    if (isCustomProduct.value) {
      fieldMappings.value.forEach((m) => {
        m.targetField = m.sourceField
        m.matchedBy = 'default'
        m.matchedLabel = '默认保留原始字段名'
      })
      sortMappingsPendingFirst()
      mappingPagination.current = 1
      if (notify) {Message.info('未收录外数产品不参与字段匹配，落库字段名默认取 CSV 原始字段名，可手工修改')}
      return
    }
    const code = currentProduct.value?.productCode || ''
    const targets = fieldMappings.value.filter((m) => m.matchedBy !== 'manual')
    // 档案行与碰撞行一次算完：inheritMappingForBatch 内部就是「产品级默认映射 → 字段名碰撞」两级
    const decided = new Map<string, InheritedMappingRow>(
      inheritMappingForBatch(code, targets.map((m) => m.sourceField))
        .filter((r) => r.inheritSource !== 'pending')
        .map((r): [string, InheritedMappingRow] => [r.apiField, r])
    )
    let fromArchive = 0
    let fromCollision = 0
    let nonStd = 0
    targets.forEach((m) => {
      const hit = decided.get(m.sourceField)
      if (hit) {
        m.targetField = hit.stdField || NON_STD_FIELD
        m.matchedBy = hit.inheritSource === 'inherit' ? 'inherit' : 'auto'
        m.matchedLabel = hit.inheritSource === 'inherit' ? '继承档案默认映射' : '自动匹配'
        if (hit.inheritSource === 'inherit') {fromArchive++} else {fromCollision++}
        return
      }
      // R34：档案与碰撞都没有结论，保留原始字段名并标记非标准化
      m.targetField = NON_STD_FIELD
      m.matchedBy = 'default'
      m.matchedLabel = '默认非标准化'
      nonStd++
    })
    sortMappingsPendingFirst()
    mappingPagination.current = 1
    if (!notify) {return}
    const kept = fieldMappings.value.length - targets.length
    const parts = [`继承档案默认映射 ${fromArchive} 项`, `字段名碰撞 ${fromCollision} 项`, `非标准化透传 ${nonStd} 项`]
    if (kept) {parts.push(`人工调整 ${kept} 项保留`)}
    Message.success(`字段匹配完成：${parts.join('、')}${code ? '' : '（该产品未建档，档案侧无默认可继承）'}`)
  }

  /** 本次批次的完整映射结论（必选区 + 列表区），用于差量比对与回写档案 */
  const batchMappingRows = computed<InterfaceFieldMappingRow[]>(() => [
    ...activeRequiredFieldMatch.value
      .map((r) => ({ apiField: requiredSourceSelection[r.std], stdField: r.std }))
      .filter((x) => !!x.apiField),
    ...fieldMappings.value
      .filter((m) => !!m.sourceField && !!m.targetField)
      .map((m) => ({ apiField: m.sourceField, stdField: m.targetField })),
  ])

  /** 继承行数量（UI 上不单独展示，供回写提示与落库记录用） */
  const inheritedCount = computed(() => fieldMappings.value.filter((m) => m.matchedBy === 'inherit').length)

  /** 人工修正映射（R34/R36） */
  const setMappingTarget = (record: FieldMapping, value: string) => {
    record.targetField = value || ''
    if (!record.targetField) {
      record.matchedBy = 'default'
      record.matchedLabel = '待匹配'
    } else if (record.matchedBy !== 'auto') {
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

  /** 生成映射规则版本号（R43：落库记录关联使用的映射版本） */
  const buildMappingVersion = () => {
    const now = new Date()
    const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
    // 尾段按（产品名 + 接口号 + 密文加密口径 + 日期）稳定散列派生，不再用 Math.random：
    // 同一批次重进不会变号，不同产品或改了加密方式不会拿到同一个号
    const cipherSeed = requiredCipherSummary.value.map((c) => `${c.std}=${c.algorithm}`).join(',')
    const seed = `${mappingProduct.value}|${currentProduct.value?.productCode || currentProduct.value?.interfaceId || ''}|${cipherSeed}|${stamp}`
    mappingVersion.value = `v${stamp}-${hashInt(seed, 100, 999)}`
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

  /** 回溯日期（3.3 写入 datax 分区，R40）：由回溯文件名自动解析 */
  const reviewDate = ref('')

  /**
   * 一致性校验关联的两张表（R68）
   *   t1 = 落库临时表（回溯值来源，固定为落临时库环节写入的表）
   *   t2 = 用户选择的一致性校验目标表（线上值来源）
   */
  const CONSISTENCY_TEMP_TABLE = 'tmp_ext_retro_raw'
  const CONSISTENCY_TARGET_ALIAS = 't2'
  /** 关联条件：cert_no 与 create_time 双字段等值关联，固定不变，不随 WHERE 条件变化 */
  const CONSISTENCY_JOIN_CONDITION = `t1.cert_no = ${CONSISTENCY_TARGET_ALIAS}.cert_no AND t1.create_time = ${CONSISTENCY_TARGET_ALIAS}.create_time`

  /**
   * 一致性校验 WHERE 过滤条件（可编辑）
   * 取代原先只读的「样本回溯时间」标签：默认按回溯日期收敛 t2 的样本范围，
   * 用户可改成任意合法 Hive 条件（区间、多字段组合等），变更后需重新执行校验
   */
  const consistencyWhereCondition = ref('')

  /** WHERE 条件是否被用户改写（改写后不再跟随回溯日期自动重置默认值） */
  const consistencyWhereDirty = ref(false)

  /** 按回溯日期生成默认 WHERE 条件（只过滤目标表 t2 的 create_time，避免全表关联） */
  const buildDefaultConsistencyWhere = (date: string) => (date ? `${CONSISTENCY_TARGET_ALIAS}.create_time = '${date}'` : '')

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
    // 换文件视为新的比对范围：WHERE 条件回到默认值（按新的回溯日期过滤 t2）
    consistencyWhereDirty.value = false
    consistencyWhereCondition.value = buildDefaultConsistencyWhere(reviewDate.value)
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
    // 临时库数据已变更，需重新执行一致性校验后才可推进 Hive
    consistencyChecked.value = false
    consistencySkipped.value = false
    consistencySkipReason.value = ''
    consistencySummary.value = null
    consistencyDetails.value = []
    // 任务回填 backid 并置为成功，供任务列表查看明细与续做
    if (taskId) {
      // backid 在落临时库收尾时才生成，需先回写到任务与续做上下文
      await bindTaskBackid(taskId, backid)
      // 任务置为成功后，状态由批次任务推导为「临时库已落库」
      await finishPersistTask(taskId, '成功', `已全量落临时库，生成 backid 批次 ${backid}`)
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
      row.cert_no = previewRows.value[i % Math.max(previewRows.value.length, 1)]?.id_md5 ?? '—'
      row.create_time = reviewDate.value || '—'
      return row
    })
  })

  /** 临时库预览列 */
  const tempPreviewColumns = computed(() => {
    const stdCols = fieldMappings.value.filter((m) => m.targetField && m.targetField !== NON_STD_FIELD).map((m) => m.targetField)
    return ['cert_no', 'create_time', ...stdCols.filter((c) => c !== 'cert_no' && c !== 'create_time')]
  })

  /* ---------- B4 三重行数验证与一致性校验 ---------- */
  /** 三重行数验证结果（由后台任务产出，供落库通知取验证结论） */
  const tripleRowCheck = ref<TripleRowCheck | null>(null)

  /** 一致性校验是否已完成（推进 Hive 标准库的前置门槛：先比对确认，再落正式库） */
  const consistencyChecked = ref(false)

  /** 一致性校验是否已被跳过（未上线产品无线上数据可对比，可跳过校验直接推进落库） */
  const consistencySkipped = ref(false)

  /** 一致性校验跳过原因 */
  const consistencySkipReason = ref('')

  /** 回溯日期变更后需重新执行一致性校验，并同步默认 WHERE 条件（用户已改写时保留手写条件） */
  watch(reviewDate, (date) => {
    consistencyChecked.value = false
    if (!consistencyWhereDirty.value) {
      consistencyWhereCondition.value = buildDefaultConsistencyWhere(date)
    }
  })

  /** 一致性校验目标表（R67，关联 SQL 中的 t2） */
  const consistencyTargetOptions = ref<HiveTableItem[]>([])
  const consistencyTargetTable = ref('')

  /** 校验目标表变更后需重新执行一致性校验（比对对象变化）；已跳过态不受影响 */
  watch(consistencyTargetTable, () => {
    consistencyChecked.value = false
  })

  /** WHERE 条件变更后需重新执行一致性校验（比对范围变化） */
  watch(consistencyWhereCondition, () => {
    consistencyChecked.value = false
  })

  /** 用户编辑 WHERE 条件：标记为已改写，避免被回溯日期解析出的默认值覆盖 */
  const onConsistencyWhereInput = () => {
    consistencyWhereDirty.value = true
  }

  /** 恢复默认 WHERE 条件（按当前回溯日期过滤 t2） */
  const resetConsistencyWhere = () => {
    consistencyWhereDirty.value = false
    consistencyWhereCondition.value = buildDefaultConsistencyWhere(reviewDate.value)
  }

  /** 参与对比的兜底回溯字段（字段映射尚未生成时使用，保证 SQL 预览与明细口径一致） */
  const DEFAULT_COMPARE_FIELDS = [
    'std_loan_cnt_12m',
    'std_overdue_amt_max',
    'std_credit_score',
    'std_risk_level_code',
    'std_loan_cnt_1m',
    'std_loan_cnt_3m',
  ]

  /** 参与一致性对比的回溯字段（来自字段映射的已落表标准字段，排除客户号与 create_time） */
  const consistencyCompareFields = computed(() => {
    const cols = fieldMappings.value
      .filter((m) => m.targetField && m.targetField !== NON_STD_FIELD)
      .map((m) => m.targetField)
    const mapped = Array.from(new Set(cols.filter((c) => c !== 'cert_no' && c !== 'create_time')))
    return mapped.length ? mapped : DEFAULT_COMPARE_FIELDS
  })

  /**
   * 本次一致性校验的关联 SQL 预览
   * 结果列与下方明细表一一对应：cert_no / create_time / field / retro_value / online_value / compare_result
   * 用 Hive stack UDTF 把宽表列转为行，一次 JOIN 即可产出逐字段对比结果，无需多次 UNION ALL 重复扫描
   * 注意：要求目标表 t2 含与临时库同名的标准字段
   */
  const consistencySqlPreview = computed(() => {
    const target = consistencyTargetTable.value || '（请选择目标表）'
    const where = consistencyWhereCondition.value.trim()
    const fields = consistencyCompareFields.value
    // 字段多时只展开前 4 个，避免 stack 参数过长撑爆预览面板
    const shown = fields.slice(0, 4)
    // cast 统一为 string：不同字段类型混合时 stack 要求分支类型一致
    const stackArgs = shown
      .map((f) => `    '${f}', cast(t1.${f} AS string), cast(t2.${f} AS string)`)
      .join(',\n')
    const restNote = fields.length > shown.length
      ? `-- 共 ${fields.length} 个回溯字段，stack 仅展开前 ${shown.length} 个，其余按同样三元组追加\n`
      : ''
    return `${restNote}SELECT t1.cert_no AS cert_no,
       t1.create_time AS create_time,
       f.field AS field,
       f.retro_value AS retro_value,
       f.online_value AS online_value,
       CASE WHEN f.retro_value <=> f.online_value THEN '一致' ELSE '不同' END AS compare_result
  FROM ${CONSISTENCY_TEMP_TABLE} t1
  JOIN ${target} ${CONSISTENCY_TARGET_ALIAS}
    ON ${CONSISTENCY_JOIN_CONDITION}
LATERAL VIEW stack(${shown.length},
${stackArgs}
) f AS field, retro_value, online_value${where ? `\n WHERE ${where}` : ''}
 ORDER BY CASE WHEN f.retro_value <=> f.online_value THEN 1 ELSE 0 END`
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
    // 页面已移除原样本文件上传入口（R62），原样本行数按源文件行数取值
    const sample = source
    tripleRowCheck.value = await fetchTripleRowCheck(loaded, source, sample)
    const c = tripleRowCheck.value
    // 落库主流程终点为「Hive已落库」，行数验证为后台任务，不再推进主流程状态
    if (c.matched) {
      await finishPersistTask(task.taskId, '成功', '三重行数验证通过：入库行数 = 源文件行数 = 原样本文件行数')
      Message.success('三重行数验证通过：入库行数 = 源文件行数 = 原样本文件行数')
    } else {
      await finishPersistTask(task.taskId, '失败', '三重行数验证未通过，差异明细见服务任务列表')
      Message.warning('行数验证未通过，差异明细可在服务任务列表中查看')
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
      Message.warning('请先选择一致性校验的目标表（t2）')
      return
    }
    const where = consistencyWhereCondition.value.trim()
    if (!where) {
      Message.warning('请填写一致性校验的 WHERE 过滤条件')
      return
    }
    validating.value = true
    // R86：一致性校验属只读类执行动作，创建异步任务后再执行
    const task = await createPersistTask('一致性校验', persistBatches.value[0]?.backid ?? '', false, 2)
    try {
      // 明细 create_time 取落库临时表（t1），字段取当前映射后的回溯标准字段
      const details = await fetchConsistencyDetails(100, {
        createTime: reviewDate.value,
        fields: consistencyCompareFields.value,
      })
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
        `抽样 ${s.sampleTotal} 条：关联成功 ${s.matchedTotal} 条，关联失败 ${s.unmatchedTotal} 条，不一致 ${s.inconsistentTotal} 条；t1=${CONSISTENCY_TEMP_TABLE}，t2=${consistencyTargetTable.value}，WHERE ${where}`
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
    await finishPersistTask(task.taskId, '成功', `已跳过一致性抽样校验：${reason}（服务任务列表标注未执行）`)
    await saveAsyncTask(task.taskId, { skipped: true })
    Message.info(`已跳过一致性抽样校验：${reason}`)
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
    notifySent.value = true
    const failed = records.filter((r) => r.sendStatus === '发送失败')
    if (failed.length) {
      Message.warning(`落库通知已由后台推送，其中 ${failed.length} 条失败（已重试 ${notifyConfig.value.maxRetry} 次）`)
    } else {
      Message.success('落库通知已由后台推送')
    }
  }

  /* ---------- 异步任务（R86：执行类操作均创建任务） ---------- */

  /** 本次会话创建的任务列表（供任务明细抽屉展示执行轨迹） */
  const createdTasks = ref<AsyncTask[]>([])

  /**
   * 当前批次关联的任务集合（状态推导的数据源）
   * 新建任务时追加、任务结束时同步终态、按 backid 回填时整体替换
   */
  const batchTasks = ref<AsyncTask[]>([])

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
      fileName: file?.name ?? '',
      fileFingerprint: file ? `${file.name}@${file.size}` : '',
      backid,
      product: mappingProduct.value,
      interfaceId: currentProduct.value?.interfaceId ?? '',
      hiveTable: hiveTable.value,
      partitionValue: partitionValue.value,
      reviewDate: reviewDate.value,
      consistencyTargetTable: consistencyTargetTable.value,
      consistencyWhereCondition: consistencyWhereCondition.value,
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
    // 纳入批次任务集合，作为后两态的状态推导数据源
    batchTasks.value = [...batchTasks.value.filter((t) => t.taskId !== task.taskId), task]
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
    // 同步批次任务集合的终态，状态徽标据此实时推导
    batchTasks.value = batchTasks.value.map((t) =>
      t.taskId === taskId ? { ...t, status, finishTime: time } : t
    )
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
    // 续做时回填用户改写的 WHERE 条件；标记已改写，避免被回溯日期解析出的默认值覆盖
    if (ctx.consistencyWhereCondition) {
      consistencyWhereCondition.value = ctx.consistencyWhereCondition
      consistencyWhereDirty.value = true
    }
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
      // 后两态（临时库已落库 / Hive已落库）不在此硬编码，由批次任务推导
      // 注：上方 onFileSelect 会清空任务集合，此处需按 backid 重新装载
      const tasks = await fetchTasksByBackid(ctx.backid)
      batchTasks.value = [...tasks]
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
        productCode: currentProduct.value?.productCode ?? '',
        mappingVersion: mappingVersion.value,
        stdFieldCount: mappedCount.value - nonStdCount.value + requiredPassedCount.value,
        nonStdFieldCount: nonStdCount.value,
        nonStdFields: nonStdFieldNames.value,
        inheritedFieldCount: inheritedCount.value,
        // 密文类必选字段的实际加密口径随批次留档，事后排查关联不上时有据可查
        requiredCiphers: requiredCipherSummary.value,
      },
      storageInfo: {
        tempTable: persistBatches.value[0]?.tempTable ?? 'tmp_ext_retro_raw',
        hiveTable: hiveTable.value,
        partitionField: 'datax',
        partitionValue: partitionValue.value,
        loadedRows: persistBatches.value.reduce((s, b) => s + b.rows, 0),
        writeStrategy: '主键（cert_no + create_time）直接覆盖',
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
    // 分层继承的闭环：批次落库成功后把本次结论回写为产品级默认映射，下一批直接继承最新口径。
    // 未建档产品（productCode 为空）不回写，避免凭空给档案造一份映射
    const code = currentProduct.value?.productCode || ''
    if (code && backid) {
      const delta = diffMappingFromProduct(code, batchMappingRows.value)
      await commitPersistBatchMapping(code, batchMappingRows.value, backid)
      Message.success(delta.length
        ? `本批次相对档案默认映射改了 ${delta.length} 项，已回写产品 ${code} 的默认映射`
        : '本批次与档案默认映射一致，未产生差异')
    }
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
    // 批次任务集合作为后两态的状态推导数据源（须在回填之后装载，回填过程会清空）
    batchTasks.value = [...tasks]
    // 落库记录按 backid 关联，此处一并载入，便于查看批次产出
    const record = await fetchPersistRecord(backid)
    if (record) persistRecord.value = record
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
    requiredCipherAlgo, cipherAlgorithmOptions, setRequiredCipher, requiredCipherSummary,
    loadProducts,
    loadProductFields,
    onMappingProductChange,
    onRequiredSourceChange,
    rematchFields,
    setMappingTarget,
    mappedCount,
    nonStdCount,
    nonStdFieldNames,
    inheritedCount,
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
    consistencyChecked,
    consistencySkipped,
    consistencySkipReason,
    consistencyReady,
    consistencyTargetOptions,
    consistencyTargetTable,
    consistencyTempTable: CONSISTENCY_TEMP_TABLE,
    consistencyJoinCondition: CONSISTENCY_JOIN_CONDITION,
    consistencyWhereCondition,
    consistencyCompareFields,
    consistencySqlPreview,
    onConsistencyWhereInput,
    resetConsistencyWhere,
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
    // B5
    notifyConfig,
    loadNotifyConfig,
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
