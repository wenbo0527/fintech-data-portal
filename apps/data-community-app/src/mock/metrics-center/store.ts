/**
 * 指标中心 - Store（CRUD + 查询 + 批量校验）
 * 纯前端 mock，数据持久在内存（页面刷新后重置）
 */
import { ref } from 'vue'
import type {
  MetricItem,
  MetricQueryParams,
  MetricQueryResult,
  SimilarityResult,
  BatchValidationResult,
  BatchValidationRow,
  MetricTreeNode,
  MetricValueSeries,
  DashboardCardConfig,
  ResolvedCard,
  ResolvedRef,
  ResolvedBoard,
  MetricConsumer,
  ReportItem,
  MetricLineageGraph,
  CompletenessScore,
  MetricReportMount,
  MetricVersion,
  MetricVersionSnapshot,
} from './types'
import { METRICS_DATA, PERSONS, buildMetricTree, SCENARIO_OPTIONS, BATCH_TEMPLATE_FIELDS, DASHBOARD_BOARDS, METRIC_VALUES, REPORTS_DATA, METRIC_LINEAGE, SOURCE_TYPE_OPTIONS, GRANULARITY_OPTIONS } from './data'

/** 响应式指标数据（已合并语义契约：agentMeta / reportMounts / 结构化字段） */
const metrics = ref<MetricItem[]>(JSON.parse(JSON.stringify(METRICS_DATA)))

/** 响应式报表库（模块 B：报表实体唯一维护处，指标侧只引用 ID） */
const reports = ref<ReportItem[]>(JSON.parse(JSON.stringify(REPORTS_DATA)))

/** 深拷贝 */
function clone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

/** 从指标创建版本快照（全量快照核心字段） */
function createSnapshot(m: MetricItem): MetricVersionSnapshot {
  return {
    name: m.name,
    code: m.code,
    domain: m.domain,
    scenario: m.scenario,
    businessOwner: m.businessOwner,
    technicalOwner: m.technicalOwner,
    businessDefinition: m.businessDefinition,
    useCase: m.useCase,
    calculationFrequency: m.calculationFrequency,
    technicalDefinition: m.technicalDefinition,
    technicalUsageNotes: m.technicalUsageNotes,
    resultTable: m.resultTable,
    queryCode: m.queryCode,
    sourceType: m.sourceType,
    granularity: m.granularity,
    reportMounts: m.reportMounts ? clone(m.reportMounts) : undefined,
    agentMeta: m.agentMeta ? clone(m.agentMeta) : undefined,
    agentDoc: m.agentDoc,
  }
}

/** 从快照恢复指标核心字段（激活历史版本时使用） */
function restoreFromSnapshot(m: MetricItem, snap: MetricVersionSnapshot): void {
  m.name = snap.name
  m.domain = snap.domain
  m.scenario = snap.scenario
  m.businessOwner = snap.businessOwner
  m.technicalOwner = snap.technicalOwner
  m.businessDefinition = snap.businessDefinition
  m.useCase = snap.useCase
  m.calculationFrequency = snap.calculationFrequency
  m.technicalDefinition = snap.technicalDefinition
  m.technicalUsageNotes = snap.technicalUsageNotes
  m.resultTable = snap.resultTable
  m.queryCode = snap.queryCode
  m.sourceType = snap.sourceType
  m.granularity = snap.granularity
  m.reportMounts = snap.reportMounts ? clone(snap.reportMounts) : undefined
  m.agentMeta = snap.agentMeta ? clone(snap.agentMeta) : undefined
  m.agentDoc = snap.agentDoc
}

/** 生成新ID */
function nextId(): string {
  const max = metrics.value.reduce((mx, m) => {
    const n = parseInt(m.id.replace('m', ''))
    return n > mx ? n : mx
  }, 0)
  return `m${String(max + 1).padStart(3, '0')}`
}

/**
 * 维护完整度评分（R15：系统按字段填充率自动计算，不持久化）
 * 人读信息 = 供人阅读的段落字段；Agent 字段 = 受控结构化字段
 */
export function calcCompleteness(m: MetricItem): CompletenessScore {
  const metaChecks: [string, boolean][] = [
    ['指标名称', !!m.name],
    ['指标编码', !!m.code],
    ['指标类型', !!m.type],
    ['指标域', !!m.domain],
    ['归属场景', !!m.scenario],
    ['业务负责人', !!m.businessOwner],
    ['技术负责人', !!m.technicalOwner],
    ['业务定义', !!m.businessDefinition],
    ['使用场景', !!m.useCase],
    ['计算频率', !!m.calculationFrequency],
    ['技术定义', !!m.technicalDefinition],
    ['结果表', !!m.resultTable],
  ]
  const metaMissing = metaChecks.filter(([, ok]) => !ok).map(([l]) => l)
  const metaScore = Math.round(((metaChecks.length - metaMissing.length) / metaChecks.length) * 100)

  const a = m.agentMeta
  // Agent 侧只结构化检查同义词与说明文档（AG-02~08 语义内容统一在 agentDoc 内维护，不逐项校验）
  const agentChecks: [string, boolean][] = [
    ['同义词（AG-01）', !!a?.synonyms?.length],
    ['Agent 说明文档（AG-02~08）', !!m.agentDoc?.trim()],
    ['统计粒度（AG-05）', !!m.granularity],
    ['来源类型', !!m.sourceType],
    ['报表挂载（AG-09）', !!m.reportMounts?.length],
    ['场景路由提示词（AG-11）', !!m.reportMounts?.some(mo => !!mo.scenarioRoutingPrompt)],
  ]
  const agentMissing = agentChecks.filter(([, ok]) => !ok).map(([l]) => l)
  const agentScore = Math.round(((agentChecks.length - agentMissing.length) / agentChecks.length) * 100)

  return { metaScore, agentScore, metaMissing, agentMissing }
}

/** 完整度档位（用于治理筛选） */
function gradeOf(score: number): 'complete' | 'partial' | 'missing' {
  if (score >= 90) return 'complete'
  if (score >= 40) return 'partial'
  return 'missing'
}

/**
 * 报表挂载 → reportLocations 派生（人机同源：入口只维护挂载，位置列表自动生成）
 */
function deriveReportLocations(mounts: MetricReportMount[] | undefined): { name: string; url: string }[] {
  if (!mounts) return []
  return mounts.map(mount => {
    const rpt = reports.value.find(r => r.id === mount.reportId)
    return rpt ? { name: rpt.name, url: rpt.accessEntry } : { name: mount.reportId, url: '' }
  })
}

/**
 * 挂载可见性判断（AG-10 / 权限代码级强制的前台镜像）
 * roleKey 传当前角色的中文名（RoleSwitcher 的 ROLE_DEFINITIONS[name]）
 */
export function isMountVisible(mount: MetricReportMount, roleKey: string): boolean {
  if (mount.visibility === 'all') return true
  if (mount.visibility === 'domain') return !!mount.role && mount.role.includes(roleKey)
  // specific：按角色/人员白名单（逗号分隔）精确匹配
  return !!mount.role && mount.role.split(/[,，、]/).map(s => s.trim()).includes(roleKey)
}

export const MetricsCenterStore = {
  // ── 查询 ──
  query(params: MetricQueryParams): MetricQueryResult {
    let list = clone(metrics.value)

    // 关键词搜索：名称 / 编码 / 同义词（AG-01，R02 别名可检索）
    if (params.keyword) {
      const kw = params.keyword.toLowerCase()
      list = list.filter(m =>
        m.name.toLowerCase().includes(kw) ||
        m.code.toLowerCase().includes(kw) ||
        (m.agentMeta?.synonyms || []).some(s => s.toLowerCase().includes(kw))
      )
    }

    // 类型筛选
    if (params.type) {
      list = list.filter(m => m.type === params.type)
    }

    // 指标域筛选
    if (params.domain) {
      list = list.filter(m => m.domain === params.domain)
    }

    // 归属场景筛选
    if (params.scenario) {
      list = list.filter(m => m.scenario === params.scenario)
    }

    // 状态筛选
    if (params.status && params.status.length > 0) {
      list = list.filter(m => params.status!.includes(m.status))
    }

    // 报表挂载状态筛选（R14：已挂载 / 未挂载）
    if (params.mountStatus) {
      list = list.filter(m =>
        params.mountStatus === 'mounted'
          ? (m.reportMounts?.length || 0) > 0
          : !m.reportMounts?.length
      )
    }

    // 治理筛选：人读信息 / Agent 字段完整度档位（R15 缺口清单驱动）
    if (params.metaCompleteness) {
      list = list.filter(m => gradeOf(calcCompleteness(m).metaScore) === params.metaCompleteness)
    }
    if (params.agentCompleteness) {
      list = list.filter(m => gradeOf(calcCompleteness(m).agentScore) === params.agentCompleteness)
    }

    // 排序
    if (params.sortField) {
      const field = params.sortField as keyof MetricItem
      const order = params.sortOrder === 'desc' ? -1 : 1
      list.sort((a, b) => {
        const av = a[field] as any
        const bv = b[field] as any
        if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * order
        return String(av).localeCompare(String(bv)) * order
      })
    } else {
      list.sort((a, b) => a.sortOrder - b.sortOrder)
    }

    const total = list.length
    const start = (params.page - 1) * params.pageSize
    const pageList = list.slice(start, start + params.pageSize)

    return { list: pageList, total, page: params.page, pageSize: params.pageSize }
  },

  // ── 单个查询 ──
  getById(id: string): MetricItem | undefined {
    return clone(metrics.value.find(m => m.id === id))
  },

  // ── 获取全部指标（含停用，供地图页筛选树使用） ──
  getAll(): MetricItem[] {
    return clone(metrics.value)
  },

  // ── 获取指标树 ──
  getTree(): MetricTreeNode[] {
    return buildMetricTree(metrics.value)
  },

  /** 获取指标域列表 */
  getDomains(): string[] {
    const all = metrics.value.filter(m => m.status === 'active')
    return [...new Set(all.map(m => m.domain))]
  },

  // ── 模块打通：按编码解析指标 / 看板引用 ──

  /** 按指标编码查找（code 是跨模块唯一业务主键） */
  getByCode(code: string): MetricItem | undefined {
    return metrics.value.find(m => m.code === code)
  },

  /** 取指标最新值序列（模拟从结果表查得，始终跟随当前启用口径） */
  getMetricValues(code: string): MetricValueSeries | undefined {
    const metric = this.getByCode(code)
    const series = METRIC_VALUES[code]
    if (!metric || !series) return series
    return series
  },

  /** 解析单个指标引用：把「编码」翻译成「指标定义 + 取值 + 状态」 */
  resolveRef(code: string): ResolvedRef {
    const metric = this.getByCode(code)
    if (!metric) {
      return { code, status: 'missing' }
    }
    if (metric.status === 'inactive') {
      return { code, metric, status: 'inactive' }
    }
    return {
      code,
      metric,
      values: this.getMetricValues(code),
      status: 'ok',
    }
  },

  /** 解析单张看板卡片 */
  resolveCard(card: DashboardCardConfig): ResolvedCard {
    const codes = card.metricCode ? [card.metricCode] : (card.metricCodes || [])
    const refs = codes.map(code => this.resolveRef(code))
    return { ...card, refs, primary: refs[0] }
  },

  /** 解析全部分支看板（供看板页与详情页反向依赖共用） */
  getBoards(): ResolvedBoard[] {
    return DASHBOARD_BOARDS.map(board => ({
      config: board,
      kpis: board.kpis.map(card => this.resolveCard(card)),
      charts: board.charts.map(card => this.resolveCard(card)),
    }))
  },

  /** 反向依赖：某指标被哪些看板卡片引用 */
  getConsumers(code: string): MetricConsumer[] {
    const consumers: MetricConsumer[] = []
    for (const board of DASHBOARD_BOARDS) {
      for (const card of [...board.kpis, ...board.charts]) {
        const codes = card.metricCode ? [card.metricCode] : (card.metricCodes || [])
        if (!codes.includes(code)) continue
        consumers.push({
          boardId: board.id,
          boardTitle: board.title,
          cardKey: card.key,
          cardTitle: card.title,
        })
      }
    }
    return consumers
  },

  // ── 获取指标地图列表（仅启用，排除停用；搜索命中名称/编码/同义词） ──
  getMapList(keyword?: string, domain?: string, scenario?: string): MetricItem[] {
    let list = clone(metrics.value.filter(m => m.status === 'active'))
    if (keyword) {
      const kw = keyword.toLowerCase()
      list = list.filter(m =>
        m.name.toLowerCase().includes(kw) ||
        m.code.toLowerCase().includes(kw) ||
        (m.agentMeta?.synonyms || []).some(s => s.toLowerCase().includes(kw))
      )
    }
    if (domain) {
      list = list.filter(m => m.domain === domain)
    }
    if (scenario) {
      list = list.filter(m => m.scenario === scenario)
    }
    list.sort((a, b) => a.sortOrder - b.sortOrder)
    return list
  },

  /** 搜索无直接命中时的相近推荐（E13：地图/看板搜索兜底） */
  suggestSimilar(keyword: string, limit = 3): MetricItem[] {
    if (!keyword) return []
    const kw = keyword.toLowerCase()
    const pool = metrics.value.filter(m => m.status === 'active')
    const scored = pool.map(m => {
      const names = [m.name, m.code, ...(m.agentMeta?.synonyms || [])]
      const score = Math.max(...names.map(n => calculateSimilarity(kw, n.toLowerCase())))
      return { m, score }
    })
    return scored
      .filter(s => s.score > 0.3)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(s => clone(s.m))
  },

  // ── 新建指标（v5.4：注册即生效，直接创建为启用状态） ──
  create(data: Partial<MetricItem>): MetricItem {
    const id = nextId()
    const now = new Date().toLocaleString('zh-CN', { hour12: false })

    // 检查名称唯一
    if (data.name && metrics.value.some(m => m.name === data.name)) {
      throw new Error('该指标名称已存在，请修改')
    }
    // 检查编码唯一
    if (data.code && metrics.value.some(m => m.code === data.code)) {
      throw new Error('该指标编码已存在，请修改')
    }

    // 报表挂载为唯一维护入口，reportLocations 由挂载派生（人机同源）
    const mounts = data.reportMounts || []
    const reportLocations = mounts.length
      ? deriveReportLocations(mounts)
      : (data.reportLocations || [])

    const metric: MetricItem = {
      id,
      name: data.name || '',
      code: data.code || '',
      type: data.type || 'business',
      domain: data.domain || '',
      scenario: data.scenario || '',
      businessOwner: data.businessOwner || '',
      technicalOwner: data.technicalOwner || '',
      businessDefinition: data.businessDefinition || '',
      useCase: data.useCase || '',
      calculationFrequency: data.calculationFrequency || 'T+1',
      technicalDefinition: data.technicalDefinition || '',
      technicalUsageNotes: data.technicalUsageNotes || '',
      reportLocations,
      resultTable: data.resultTable || '',
      queryCode: data.queryCode || '',
      sourceType: data.sourceType,
      granularity: data.granularity,
      agentMeta: data.agentMeta || { synonyms: [] },
      agentDoc: data.agentDoc,
      reportMounts: mounts,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      createdBy: data.businessOwner || '',
      isFavorite: false,
      isSubscribed: false,
      sortOrder: metrics.value.length + 1,
    }

    // 监管指标：初始化版本管理（v1 全量快照）
    if (metric.type === 'regulatory') {
      metric.version = 1
      metric.versions = [{
        version: 1,
        changeNote: '初始创建',
        createdAt: now,
        createdBy: metric.createdBy,
        snapshot: createSnapshot(metric),
      }]
    }

    metrics.value.push(metric)
    return clone(metric)
  },

  // ── 更新指标（v5.4：保存即生效；监管指标保存前做全量快照，版本号递增） ──
  update(id: string, data: Partial<MetricItem> & { changeNote?: string }): MetricItem | undefined {
    const idx = metrics.value.findIndex(m => m.id === id)
    if (idx === -1) return undefined

    const now = new Date().toLocaleString('zh-CN', { hour12: false })
    const prev = metrics.value[idx]
    // 报表挂载变更时，展示位置列表由挂载派生（人机同源）
    const reportLocations = data.reportMounts
      ? deriveReportLocations(data.reportMounts)
      : (data.reportLocations ?? prev.reportLocations)

    // 指标名称和编码不支持修改
    const updated: MetricItem = {
      ...prev,
      domain: data.domain ?? prev.domain,
      scenario: data.scenario ?? prev.scenario,
      businessOwner: data.businessOwner ?? prev.businessOwner,
      technicalOwner: data.technicalOwner ?? prev.technicalOwner,
      businessDefinition: data.businessDefinition ?? prev.businessDefinition,
      useCase: data.useCase ?? prev.useCase,
      calculationFrequency: data.calculationFrequency ?? prev.calculationFrequency,
      technicalDefinition: data.technicalDefinition ?? prev.technicalDefinition,
      technicalUsageNotes: data.technicalUsageNotes ?? prev.technicalUsageNotes,
      reportLocations,
      resultTable: data.resultTable ?? prev.resultTable,
      queryCode: data.queryCode ?? prev.queryCode,
      sourceType: data.sourceType ?? prev.sourceType,
      granularity: data.granularity ?? prev.granularity,
      agentMeta: data.agentMeta ?? prev.agentMeta,
      agentDoc: data.agentDoc ?? prev.agentDoc,
      reportMounts: data.reportMounts ?? prev.reportMounts,
      updatedAt: now,
    }

    // 监管指标：保存前将当前状态做全量快照，版本号递增
    if (updated.type === 'regulatory') {
      const newVersion = (prev.version ?? 1) + 1
      const prevVersions = prev.versions ? clone(prev.versions) : []
      // 将更新前的状态保存为上一个版本的快照
      prevVersions.push({
        version: newVersion,
        changeNote: data.changeNote || '更新保存',
        createdAt: now,
        createdBy: prev.businessOwner,
        snapshot: createSnapshot(updated),
      })
      updated.version = newVersion
      updated.versions = prevVersions
    }

    metrics.value[idx] = updated
    return clone(updated)
  },

  // ── 激活监管指标历史版本（用历史快照覆盖当前数据，生成新版本） ──
  activateVersion(id: string, version: number): MetricItem | undefined {
    const idx = metrics.value.findIndex(m => m.id === id)
    if (idx === -1) return undefined
    const m = metrics.value[idx]
    if (m.type !== 'regulatory' || !m.versions) return undefined

    const target = m.versions.find(v => v.version === version)
    if (!target) throw new Error(`版本 v${version} 不存在`)

    const now = new Date().toLocaleString('zh-CN', { hour12: false })
    // 用历史快照恢复核心字段
    restoreFromSnapshot(m, target.snapshot)

    // 生成新版本（激活历史版本 = 基于历史快照创建新版本）
    const newVersion = (m.version ?? 1) + 1
    m.versions.push({
      version: newVersion,
      changeNote: `激活历史版本 v${version}`,
      createdAt: now,
      createdBy: m.businessOwner,
      snapshot: createSnapshot(m),
    })
    m.version = newVersion
    m.updatedAt = now
    return clone(m)
  },

  // ── 停用指标（v5.4：仅启用/停用两态） ──
  archive(id: string): MetricItem | undefined {
    const idx = metrics.value.findIndex(m => m.id === id)
    if (idx === -1) return undefined
    metrics.value[idx].status = 'inactive'
    metrics.value[idx].updatedAt = new Date().toLocaleString('zh-CN', { hour12: false })
    return clone(metrics.value[idx])
  },

  // ── 启用指标 ──
  reactivate(id: string): MetricItem | undefined {
    const idx = metrics.value.findIndex(m => m.id === id)
    if (idx === -1) return undefined
    metrics.value[idx].status = 'active'
    metrics.value[idx].updatedAt = new Date().toLocaleString('zh-CN', { hour12: false })
    return clone(metrics.value[idx])
  },

  // ── 血缘（A4：上溯加工来源 / 下追消费去向） ──

  /** 获取指标血缘图；未采集返回 undefined，页面展示空态（E9） */
  getLineage(code: string): MetricLineageGraph | undefined {
    const graph = METRIC_LINEAGE[code]
    return graph ? clone(graph) : undefined
  },

  /** 指标挂载报表的完整信息（含报表状态，供 E6 下线提醒） */
  getMountedReports(metricId: string): (ReportItem & { mount: MetricReportMount })[] {
    const m = metrics.value.find(x => x.id === metricId)
    if (!m) return []
    return (m.reportMounts || [])
      .map(mount => {
        const rpt = reports.value.find(r => r.id === mount.reportId)
        return rpt ? { ...clone(rpt), mount: clone(mount) } : undefined
      })
      .filter((x): x is ReportItem & { mount: MetricReportMount } => !!x)
  },

  // ── 报表库（模块 B：报表实体唯一维护处，指标侧只读引用） ──

  getReports(params?: { keyword?: string; type?: string; status?: string }): ReportItem[] {
    let list = clone(reports.value)
    if (params?.keyword) {
      const kw = params.keyword.toLowerCase()
      list = list.filter(r => r.name.toLowerCase().includes(kw))
    }
    if (params?.type) list = list.filter(r => r.type === params.type)
    if (params?.status) list = list.filter(r => r.status === params.status)
    return list
  },

  getReportById(id: string): ReportItem | undefined {
    return clone(reports.value.find(r => r.id === id))
  },

  /** 新增报表：以名称+跳转路径标识（无编码），重名拦截，默认启用 */
  createReport(data: Omit<ReportItem, 'id' | 'status' | 'updatedAt'> & { status?: ReportItem['status'] }): ReportItem {
    if (reports.value.some(r => r.name === data.name.trim())) {
      throw new Error(`已存在同名报表「${data.name.trim()}」，请更换名称或编辑既有报表`)
    }
    const maxNum = reports.value.reduce((max, r) => {
      const n = parseInt(r.id.replace(/^r/, ''), 10)
      return Number.isNaN(n) ? max : Math.max(max, n)
    }, 0)
    const id = `r${String(maxNum + 1).padStart(3, '0')}`
    const created: ReportItem = {
      ...clone(data),
      name: data.name.trim(),
      id,
      status: data.status ?? 'active',
      updatedAt: new Date().toLocaleString('zh-CN', { hour12: false }),
    }
    reports.value.unshift(created)
    return clone(created)
  },

  updateReport(id: string, data: Partial<ReportItem>): ReportItem | undefined {
    const idx = reports.value.findIndex(r => r.id === id)
    if (idx === -1) return undefined
    const updated: ReportItem = {
      ...reports.value[idx],
      ...clone(data),
      id: reports.value[idx].id,
      updatedAt: new Date().toLocaleString('zh-CN', { hour12: false }),
    }
    reports.value[idx] = updated
    return clone(updated)
  },

  /** 被哪些指标挂载引用（R25 反查 / E11 下线拦截依据） */
  getReportReferencedMetrics(reportId: string): { id: string; name: string; code: string }[] {
    return metrics.value
      .filter(m => (m.reportMounts || []).some(mo => mo.reportId === reportId))
      .map(m => ({ id: m.id, name: m.name, code: m.code }))
  },

  /** 上线/下线报表：被引用报表禁止下线（E11） */
  setReportStatus(id: string, status: ReportItem['status']): ReportItem {
    const r = reports.value.find(x => x.id === id)
    if (!r) throw new Error('报表不存在')
    if (status === 'offline') {
      const refs = this.getReportReferencedMetrics(id)
      if (refs.length > 0) {
        throw new Error(
          `该报表被 ${refs.length} 个指标挂载引用（${refs.slice(0, 3).map((x: { id: string; name: string; code: string }) => x.name).join('、')}${refs.length > 3 ? ' 等' : ''}），请先解除挂载再下线`
        )
      }
    }
    r.status = status
    r.updatedAt = new Date().toLocaleString('zh-CN', { hour12: false })
    return clone(r)
  },

  // ── 收藏/取消收藏 ──
  toggleFavorite(id: string): boolean {
    const m = metrics.value.find(x => x.id === id)
    if (!m) return false
    m.isFavorite = !m.isFavorite
    return m.isFavorite
  },

  // ── 订阅/取消订阅 ──
  toggleSubscribe(id: string): boolean {
    const m = metrics.value.find(x => x.id === id)
    if (!m) return false
    m.isSubscribed = !m.isSubscribed
    return m.isSubscribed
  },

  // ── 相似性检测 ──
  checkSimilarity(data: { name?: string; code?: string; businessDefinition?: string }): SimilarityResult[] {
    const results: SimilarityResult[] = []
    for (const m of metrics.value) {
      const matched: string[] = []
      let score = 0

      // 名称相似
      if (data.name && m.name) {
        const nameSimilarity = calculateSimilarity(data.name, m.name)
        if (nameSimilarity > 0.3) {
          matched.push('指标名称')
          score = Math.max(score, nameSimilarity)
        }
      }

      // 编码相似
      if (data.code && m.code) {
        const codeSimilarity = calculateSimilarity(data.code.toLowerCase(), m.code.toLowerCase())
        if (codeSimilarity > 0.3) {
          matched.push('指标编码')
          score = Math.max(score, codeSimilarity)
        }
      }

      // 业务口径相似
      if (data.businessDefinition && m.businessDefinition) {
        const text1 = data.businessDefinition.replace(/<[^>]+>/g, '')
        const text2 = m.businessDefinition.replace(/<[^>]+>/g, '')
        const defSimilarity = calculateSimilarity(text1, text2)
        if (defSimilarity > 0.2) {
          matched.push('业务口径')
          score = Math.max(score, defSimilarity)
        }
      }

      if (matched.length > 0) {
        results.push({ metric: clone(m), matchedFields: matched, similarity: score })
      }
    }

    return results.sort((a, b) => b.similarity - a.similarity).slice(0, 10)
  },

  // ── 批量导入校验 ──
  validateBatch(rows: Record<string, string>[]): BatchValidationResult {
    const result: BatchValidationRow[] = []
    const existingCodes = new Set(metrics.value.map(m => `${m.code}`))

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const errors: string[] = []

      // 指标名称
      if (!row['指标名称'] || row['指标名称'].length < 2 || row['指标名称'].length > 50) {
        errors.push('指标名称必填，2-50字符')
      }

      // 指标编码
      if (!row['指标编码'] || !/^[A-Za-z0-9]{2,20}$/.test(row['指标编码'])) {
        errors.push('指标编码必填，字母数字组合，2-20字符')
      }

      // 技术负责人
      if (!row['技术负责人'] || !PERSONS.some(p => p.name === row['技术负责人'])) {
        errors.push('技术负责人必须是系统内有效用户')
      }

      // 指标域
      if (!row['指标域']) {
        errors.push('指标域必填')
      }

      // 归属场景
      if (!row['归属场景']) {
        errors.push('归属场景必填')
      }

      // 业务口径
      if (!row['业务口径']) {
        errors.push('业务口径必填')
      }

      // 技术口径
      if (!row['技术口径']) {
        errors.push('技术口径必填')
      }

      // 统计粒度（R10 必填，值域受控 AG-05）
      if (!row['统计粒度']) {
        errors.push('统计粒度必填')
      } else if (!GRANULARITY_OPTIONS.some(g => g.label === row['统计粒度'])) {
        errors.push(`统计粒度取值无效，须为：${GRANULARITY_OPTIONS.map(g => g.label).join('/')}`)
      }

      // 来源类型（R10 必填，值域受控）
      if (!row['来源类型']) {
        errors.push('来源类型必填')
      } else if (!SOURCE_TYPE_OPTIONS.some(s => s.label === row['来源类型'])) {
        errors.push(`来源类型取值无效，须为：${SOURCE_TYPE_OPTIONS.map(s => s.label).join('/')}`)
      }

      // 编码唯一（v5.4：无版本号，编码全局唯一）
      if (existingCodes.has(row['指标编码'])) {
        errors.push(`指标编码已存在: ${row['指标编码']}`)
      } else {
        existingCodes.add(row['指标编码']) // 防止同批次重复
      }

      result.push({
        rowIndex: i + 2, // Excel行号（从第2行开始，第1行是标题）
        valid: errors.length === 0,
        errors,
        data: row,
      })
    }

    return {
      totalRows: rows.length,
      validRows: result.filter(r => r.valid).length,
      invalidRows: result.filter(r => !r.valid).length,
      rows: result,
    }
  },

  // ── 批量创建 ──
  batchCreate(rows: Record<string, string>[]): { success: number; failed: number } {
    let success = 0
    let failed = 0

    for (const row of rows) {
      try {
        const type = row['指标类型'] === '监管指标' ? 'regulatory' : 'business'
        const freqMap: Record<string, any> = {
          '实时': 'realtime', 'T+1': 'T+1', 'T+2': 'T+2', '周更新': 'weekly', '月更新': 'monthly',
        }
        // 中文标签 → 受控值（值域校验已在 validateBatch 完成）
        const sourceType = SOURCE_TYPE_OPTIONS.find(s => s.label === row['来源类型'])?.value
        const granularity = GRANULARITY_OPTIONS.find(g => g.label === row['统计粒度'])?.value
        const synonyms = (row['同义词'] || '').split(/[,，、]/).map(s => s.trim()).filter(Boolean)

        this.create({
          name: row['指标名称'],
          code: row['指标编码'],
          type,
          domain: row['指标域'],
          scenario: row['归属场景'],
          businessOwner: row['业务负责人'],
          technicalOwner: row['技术负责人'],
          businessDefinition: row['业务口径'],
          useCase: row['使用场景'] || '',
          calculationFrequency: freqMap[row['计算时效']] || 'T+1',
          technicalDefinition: row['技术口径'] || '',
          technicalUsageNotes: row['技术口径使用说明'] || '',
          resultTable: row['结果表'] || '',
          queryCode: row['查询代码'] || '',
          sourceType,
          granularity,
          agentMeta: { synonyms },
        })
        success++
      } catch {
        failed++
      }
    }

    return { success, failed }
  },

  // ── 更新排序 ──
  updateSortOrder(items: { id: string; sortOrder: number }[]): void {
    for (const item of items) {
      const m = metrics.value.find(x => x.id === item.id)
      if (m) m.sortOrder = item.sortOrder
    }
  },

  // ── 获取人员列表 ──
  getPersons() {
    return PERSONS
  },

  // ── 获取归属场景选项 ──
  getScenarios(domain?: string) {
    if (domain) return SCENARIO_OPTIONS[domain] || []
    return SCENARIO_OPTIONS
  },

  // ── 获取批量模板字段 ──
  getBatchTemplateFields() {
    return BATCH_TEMPLATE_FIELDS
  },
}

/** 计算字符串相似度（基于共同子串比例） */
function calculateSimilarity(s1: string, s2: string): number {
  if (!s1 || !s2) return 0
  const len1 = s1.length
  const len2 = s2.length
  if (len1 === 0 || len2 === 0) return 0

  // 简化版：检查包含关系和共同字符比例
  if (s1.includes(s2) || s2.includes(s1)) return 0.9

  // 计算共同字符
  const set1 = new Set(s1.toLowerCase().split(''))
  const set2 = new Set(s2.toLowerCase().split(''))
  let common = 0
  for (const c of set1) {
    if (set2.has(c)) common++
  }
  return common / Math.max(set1.size, set2.size)
}
