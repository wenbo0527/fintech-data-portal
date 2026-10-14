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
  VersionStatus,
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

/** 生成新ID */
function nextId(): string {
  const max = metrics.value.reduce((mx, m) => {
    const n = parseInt(m.id.replace('m', ''))
    return n > mx ? n : mx
  }, 0)
  return `m${String(max + 1).padStart(3, '0')}`
}

/** 获取下一个版本号 */
function nextVersion(metricId: string): number {
  const m = metrics.value.find(x => x.id === metricId)
  if (!m) return 1
  return Math.max(...m.versions.map(v => v.version)) + 1
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

  // ── 获取全部指标（含归档/草稿，供地图页筛选树使用） ──
  getAll(): MetricItem[] {
    return clone(metrics.value)
  },

  // ── 获取指标树 ──
  getTree(): MetricTreeNode[] {
    return buildMetricTree(metrics.value)
  },

  /** 获取指标域列表 */
  getDomains(): string[] {
    const all = metrics.value.filter(m => m.status !== 'archived')
    return [...new Set(all.map(m => m.domain))]
  },

  // ── 模块打通：按编码解析指标 / 看板引用 ──

  /** 按指标编码查找（code 是跨模块唯一业务主键） */
  getByCode(code: string): MetricItem | undefined {
    return metrics.value.find(m => m.code === code)
  },

  /** 取指标最新值序列（模拟按当前启用版本从结果表查得） */
  getMetricValues(code: string): MetricValueSeries | undefined {
    const metric = this.getByCode(code)
    const series = METRIC_VALUES[code]
    if (!metric || !series) return series
    // 口径升版后取值版本应跟随当前启用版本
    return metric.currentVersion !== series.version
      ? { ...series, version: metric.currentVersion }
      : series
  },

  /** 解析单个指标引用：把「编码」翻译成「指标定义 + 取值 + 状态」 */
  resolveRef(code: string, pinnedVersion?: number): ResolvedRef {
    const metric = this.getByCode(code)
    if (!metric) {
      return { code, status: 'missing', outdated: false, pinnedVersion }
    }
    if (metric.status === 'draft') {
      return { code, metric, status: 'draft', outdated: false, pinnedVersion }
    }
    if (metric.status === 'archived') {
      return { code, metric, status: 'archived', outdated: false, pinnedVersion }
    }
    return {
      code,
      metric,
      values: this.getMetricValues(code),
      status: 'ok',
      outdated: pinnedVersion !== undefined && pinnedVersion !== metric.currentVersion,
      pinnedVersion,
    }
  },

  /** 解析单张看板卡片 */
  resolveCard(card: DashboardCardConfig): ResolvedCard {
    const codes = card.metricCode ? [card.metricCode] : (card.metricCodes || [])
    const refs = codes.map(code => this.resolveRef(code, card.pinnedVersions?.[code]))
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
        const metric = this.getByCode(code)
        consumers.push({
          boardId: board.id,
          boardTitle: board.title,
          cardKey: card.key,
          cardTitle: card.title,
          pinnedVersion: card.pinnedVersions?.[code] ?? metric?.currentVersion ?? 1,
          currentVersion: metric?.currentVersion ?? 1,
        })
      }
    }
    return consumers
  },

  // ── 获取指标地图列表（仅启用+草稿，排除归档；搜索命中名称/编码/同义词） ──
  getMapList(keyword?: string, domain?: string, scenario?: string): MetricItem[] {
    let list = clone(metrics.value.filter(m => m.status !== 'archived' && m.status !== 'pending'))
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

  // ── 新建指标（保存草稿 / 提交审核 / 直接上线） ──
  create(data: Partial<MetricItem> & { versionDescription?: string }, action: 'draft' | 'submit' | 'publish'): MetricItem {
    const id = nextId()
    const now = new Date().toLocaleString('zh-CN', { hour12: false })

    // 检查名称+版本号唯一
    if (data.name && metrics.value.some(m => m.name === data.name)) {
      throw new Error('该指标名称已存在，请修改')
    }
    // 检查编码+版本号唯一
    if (data.code && metrics.value.some(m => m.code === data.code)) {
      throw new Error('该指标编码已存在，请修改')
    }

    // 状态机：草稿 →（提交审核）→ 审核中 →（审批通过）→ 启用
    const status: MetricItem['status'] =
      action === 'draft' ? 'draft' : action === 'submit' ? 'pending' : 'active'
    const versionStatus: VersionStatus =
      action === 'draft' ? 'draft' : action === 'submit' ? 'pending' : 'active'

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
      status,
      currentVersion: 1,
      versions: [{
        version: 1,
        status: versionStatus,
        description: data.versionDescription || '指标创建',
        createdAt: now,
        createdBy: data.businessOwner || '',
        snapshot: {
          businessDefinition: data.businessDefinition || '',
          useCase: data.useCase || '',
          calculationFrequency: data.calculationFrequency || 'T+1',
          technicalDefinition: data.technicalDefinition || '',
          technicalUsageNotes: data.technicalUsageNotes || '',
          reportLocations,
          resultTable: data.resultTable || '',
          queryCode: data.queryCode || '',
          versionDescription: data.versionDescription || '指标创建',
        },
      }],
      createdAt: now,
      updatedAt: now,
      createdBy: data.businessOwner || '',
      isFavorite: false,
      isSubscribed: false,
      sortOrder: metrics.value.length + 1,
    }

    metrics.value.push(metric)
    return clone(metric)
  },

  // ── 更新指标（不更新版本号；草稿与审核中可改） ──
  update(id: string, data: Partial<MetricItem>): MetricItem | undefined {
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

    // 更新当前版本的快照
    const activeVersion = updated.versions.find(v => v.version === updated.currentVersion)
    if (activeVersion) {
      activeVersion.snapshot = {
        businessDefinition: updated.businessDefinition,
        useCase: updated.useCase,
        calculationFrequency: updated.calculationFrequency,
        technicalDefinition: updated.technicalDefinition,
        technicalUsageNotes: updated.technicalUsageNotes,
        reportLocations: updated.reportLocations,
        resultTable: updated.resultTable,
        queryCode: updated.queryCode,
        versionDescription: activeVersion.snapshot.versionDescription,
      }
    }

    metrics.value[idx] = updated
    return clone(updated)
  },

  // ── 保存草稿（新增草稿版本，当前展示仍为启用版本） ──
  saveDraft(id: string, data: Partial<MetricItem> & { versionDescription?: string }): MetricItem | undefined {
    const idx = metrics.value.findIndex(m => m.id === id)
    if (idx === -1) return undefined

    const now = new Date().toLocaleString('zh-CN', { hour12: false })
    const newVersion = nextVersion(id)

    const metric = metrics.value[idx]
    metric.versions.unshift({
      version: newVersion,
      status: 'draft',
      description: data.versionDescription || '新增版本',
      createdAt: now,
      createdBy: data.businessOwner || '',
      snapshot: {
        businessDefinition: data.businessDefinition || metric.businessDefinition,
        useCase: data.useCase || metric.useCase,
        calculationFrequency: data.calculationFrequency || metric.calculationFrequency,
        technicalDefinition: data.technicalDefinition || metric.technicalDefinition,
        technicalUsageNotes: data.technicalUsageNotes || metric.technicalUsageNotes,
        reportLocations: data.reportLocations || metric.reportLocations,
        resultTable: data.resultTable || metric.resultTable,
        queryCode: data.queryCode || metric.queryCode,
        versionDescription: data.versionDescription || '新增版本',
      },
    })

    metric.updatedAt = now
    return clone(metric)
  },

  // ── 上线新版本（当前版本变启用，原启用变归档） ──
  publishVersion(id: string, data: Partial<MetricItem> & { versionDescription?: string }): MetricItem | undefined {
    const idx = metrics.value.findIndex(m => m.id === id)
    if (idx === -1) return undefined

    const now = new Date().toLocaleString('zh-CN', { hour12: false })
    const newVersion = nextVersion(id)
    const metric = metrics.value[idx]

    // 原启用版本变归档
    metric.versions.forEach(v => {
      if (v.status === 'active') {
        v.status = 'archived'
      }
    })

    // 新版本上线
    metric.versions.unshift({
      version: newVersion,
      status: 'active',
      description: data.versionDescription || `新版本上线 v${newVersion}`,
      createdAt: now,
      createdBy: data.businessOwner || '',
      snapshot: {
        businessDefinition: data.businessDefinition || metric.businessDefinition,
        useCase: data.useCase || metric.useCase,
        calculationFrequency: data.calculationFrequency || metric.calculationFrequency,
        technicalDefinition: data.technicalDefinition || metric.technicalDefinition,
        technicalUsageNotes: data.technicalUsageNotes || metric.technicalUsageNotes,
        reportLocations: data.reportLocations || metric.reportLocations,
        resultTable: data.resultTable || metric.resultTable,
        queryCode: data.queryCode || metric.queryCode,
        versionDescription: data.versionDescription || `新版本上线 v${newVersion}`,
      },
    })

    metric.currentVersion = newVersion
    metric.status = 'active'

    // 更新指标字段
    Object.assign(metric, {
      domain: data.domain ?? metric.domain,
      scenario: data.scenario ?? metric.scenario,
      businessOwner: data.businessOwner ?? metric.businessOwner,
      technicalOwner: data.technicalOwner ?? metric.technicalOwner,
      businessDefinition: data.businessDefinition ?? metric.businessDefinition,
      useCase: data.useCase ?? metric.useCase,
      calculationFrequency: data.calculationFrequency ?? metric.calculationFrequency,
      technicalDefinition: data.technicalDefinition ?? metric.technicalDefinition,
      technicalUsageNotes: data.technicalUsageNotes ?? metric.technicalUsageNotes,
      reportLocations: data.reportLocations ?? metric.reportLocations,
      resultTable: data.resultTable ?? metric.resultTable,
      queryCode: data.queryCode ?? metric.queryCode,
      updatedAt: now,
    })

    return clone(metric)
  },

  // ── 激活版本 ──
  activateVersion(id: string, version: number): MetricItem | undefined {
    const idx = metrics.value.findIndex(m => m.id === id)
    if (idx === -1) return undefined

    const metric = metrics.value[idx]

    // 禁止激活正在启用的版本
    const target = metric.versions.find(v => v.version === version)
    if (!target || target.status === 'active') return clone(metric)

    // 原启用版本变归档
    metric.versions.forEach(v => {
      if (v.status === 'active') v.status = 'archived'
    })

    // 当前版本变启用
    target.status = 'active'
    metric.currentVersion = version

    // 更新指标内容为该版本快照
    const snap = target.snapshot
    Object.assign(metric, {
      businessDefinition: snap.businessDefinition,
      useCase: snap.useCase,
      calculationFrequency: snap.calculationFrequency,
      technicalDefinition: snap.technicalDefinition,
      technicalUsageNotes: snap.technicalUsageNotes,
      reportLocations: snap.reportLocations,
      resultTable: snap.resultTable,
      queryCode: snap.queryCode,
    })

    metric.updatedAt = new Date().toLocaleString('zh-CN', { hour12: false })
    return clone(metric)
  },

  // ── 删除版本 ──
  deleteVersion(id: string, version: number): MetricItem | undefined {
    const idx = metrics.value.findIndex(m => m.id === id)
    if (idx === -1) return undefined

    const metric = metrics.value[idx]
    const target = metric.versions.find(v => v.version === version)
    if (!target) return clone(metric)

    // 禁止删除正在启用的版本
    if (target.status === 'active') {
      throw new Error('不能删除正在启用的版本，请先激活其他版本')
    }

    metric.versions = metric.versions.filter(v => v.version !== version)
    metric.updatedAt = new Date().toLocaleString('zh-CN', { hour12: false })
    return clone(metric)
  },

  // ── 归档指标 ──
  archive(id: string): MetricItem | undefined {
    const idx = metrics.value.findIndex(m => m.id === id)
    if (idx === -1) return undefined
    metrics.value[idx].status = 'archived'
    metrics.value[idx].updatedAt = new Date().toLocaleString('zh-CN', { hour12: false })
    return clone(metrics.value[idx])
  },

  // ── 重新激活指标 ──
  reactivate(id: string): MetricItem | undefined {
    const idx = metrics.value.findIndex(m => m.id === id)
    if (idx === -1) return undefined
    metrics.value[idx].status = 'active'
    metrics.value[idx].updatedAt = new Date().toLocaleString('zh-CN', { hour12: false })
    return clone(metrics.value[idx])
  },

  // ── 状态机动作：草稿 → 审核中 → 启用（R11 上线必经审核） ──

  /** 提交审核 */
  submitReview(id: string): MetricItem | undefined {
    const m = metrics.value.find(x => x.id === id)
    if (!m) return undefined
    if (m.status !== 'draft') throw new Error('仅草稿状态可提交审核')
    m.status = 'pending'
    const v = m.versions.find(ver => ver.status === 'draft')
    if (v) v.status = 'pending'
    m.updatedAt = new Date().toLocaleString('zh-CN', { hour12: false })
    return clone(m)
  },

  /** 审批通过：指标与待审版本转为启用 */
  approve(id: string): MetricItem | undefined {
    const m = metrics.value.find(x => x.id === id)
    if (!m) return undefined
    if (m.status !== 'pending') throw new Error('仅审核中状态可审批通过')
    m.status = 'active'
    const v = m.versions.find(ver => ver.status === 'pending')
    if (v) {
      v.status = 'active'
      m.currentVersion = v.version
    }
    m.reviewNote = ''
    m.updatedAt = new Date().toLocaleString('zh-CN', { hour12: false })
    return clone(m)
  },

  /** 驳回：退回草稿并记录意见 */
  reject(id: string, reason: string): MetricItem | undefined {
    const m = metrics.value.find(x => x.id === id)
    if (!m) return undefined
    if (m.status !== 'pending') throw new Error('仅审核中状态可驳回')
    if (!reason) throw new Error('驳回必须填写意见')
    m.status = 'draft'
    const v = m.versions.find(ver => ver.status === 'pending')
    if (v) v.status = 'draft'
    m.reviewNote = reason
    m.updatedAt = new Date().toLocaleString('zh-CN', { hour12: false })
    return clone(m)
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
          `该报表被 ${refs.length} 个指标挂载引用（${refs.slice(0, 3).map(x => x.name).join('、')}${refs.length > 3 ? ' 等' : ''}），请先解除挂载再下线`
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

      // 版本状态
      const vs = row['版本状态']
      if (vs && !['启用', '归档'].includes(vs)) {
        errors.push('版本状态必须为"启用"或"归档"')
      }

      // 编码+版本号唯一
      const versionStr = row['版本号'] || '1'
      const codeVersion = `${row['指标编码']}_v${versionStr}`
      if (existingCodes.has(`${row['指标编码']}_v${versionStr}`)) {
        errors.push(`指标编码+版本号已存在: ${row['指标编码']}_v${versionStr}`)
      } else {
        existingCodes.add(codeVersion) // 防止同批次重复
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
        }, 'publish')
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
