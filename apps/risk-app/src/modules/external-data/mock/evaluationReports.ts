/**
 * 外数评估中心 · Mock 数据源
 * 项目仅用于前端展示，无后端服务；本文件充当「内存数据库」，
 * 供 api/evaluation.ts 在 VITE_USE_MOCK=true 时短路调用。
 *
 * 字段协议来源：
 *   列表  Evaluation.vue      -> id / title / type / status / score / createdAt
 *   详情  EvaluationDetail.vue -> reportName / productName / analysisPeriod /
 *                                status(中文) / progress / editable / modules[7]
 */

export interface EvaluationReportItem {
  id: number
  title: string
  reportName: string
  productName: string
  supplier: string
  type: EvaluationType
  reportType: EvaluationType
  status: EvaluationStatus
  score: number | null
  progress: number
  creator: string
  analysisType: string
  templateType: string
  sampleTimeSpan: string
  sampleCount: number
  generateDate: string
  analysisTime: string | null
  failureReason: string | null
  createdAt: string
  updatedAt: string
}

type EvaluationType = 'quality' | 'performance' | 'cost_effectiveness' | 'comprehensive'
type EvaluationStatus = 'draft' | 'in_progress' | 'completed' | 'archived'

const TYPE_LABEL: Record<EvaluationType, string> = {
  quality: '质量',
  performance: '性能',
  cost_effectiveness: '性价比',
  comprehensive: '综合',
}

/** 列表英文状态 -> 详情页中文状态（详情页按中文文案渲染按钮） */
const STATUS_CN: Record<EvaluationStatus, string> = {
  draft: '草稿',
  in_progress: '分析中',
  completed: '已发布',
  archived: '已归档',
}

/** 详情页中文状态 -> 列表英文状态 */
const STATUS_EN: Record<string, EvaluationStatus> = {
  草稿: 'draft',
  分析中: 'in_progress',
  已发布: 'completed',
  已完成: 'completed',
  已归档: 'archived',
}

const DAY = 86400_000
const BASE_TS = new Date('2026-09-10T09:00:00+08:00').getTime()

/** 可复现伪随机，保证多次刷新列表内容稳定 */
function createRng(seed: number) {
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

// 评估对象取自已注册外数产品（mock/supplierProducts.ts + api/evaluation.ts 产品清单）
const PRODUCTS: Array<{ name: string; supplier: string }> = [
  { name: '学籍身份核验', supplier: '学信网' },
  { name: '学历认证查询', supplier: '学信网' },
  { name: '在学状态核验', supplier: '学信网' },
  { name: '入学信息核验', supplier: '学信网' },
  { name: '百行信用评分', supplier: '百行征信' },
  { name: '身份有效性核验', supplier: '百行征信' },
  { name: '手机号风险评估', supplier: '百行征信' },
  { name: '黑名单查询', supplier: '百行征信' },
  { name: '百行征信查询', supplier: '百行征信' },
  { name: '多维征信查询', supplier: '百行征信' },
  { name: '位置风险评估', supplier: '朴道征信' },
  { name: '设备指纹分析', supplier: '朴道征信' },
  { name: 'IP风险识别', supplier: '朴道征信' },
  { name: '行为风险分析', supplier: '朴道征信' },
  { name: '流量行为分析', supplier: '朴道征信' },
  { name: '设备聚类分析', supplier: '朴道征信' },
  { name: '设备风险识别', supplier: '朴道征信' },
  { name: '学历批量认证', supplier: '学信网' },
  { name: '在学状态批量核验', supplier: '学信网' },
  { name: '特殊教育审核', supplier: '学信网' },
]

const TYPES: EvaluationType[] = ['quality', 'performance', 'cost_effectiveness', 'comprehensive']
const ANALYSIS_TYPES = ['周期性分析', '实时分析', '批量回溯分析']
const CREATORS = ['白曦', '陈拓', '李衡', '周予安', '孙明']
// 状态分布刻意偏「已完成」，贴近真实报告库的观感
const STATUS_PATTERN: EvaluationStatus[] = [
  'completed', 'completed', 'draft', 'in_progress',
  'archived', 'completed', 'in_progress', 'completed',
  'draft', 'completed',
]

const fmtDate = (ts: number) => new Date(ts).toISOString().slice(0, 10)
const fmtDateTime = (ts: number) => `${fmtDate(ts)} ${new Date(ts).toTimeString().slice(0, 8)}`

function buildSeedReports(count = 32): EvaluationReportItem[] {
  const rnd = createRng(20260910)
  const list: EvaluationReportItem[] = []

  for (let i = 0; i < count; i++) {
    const product = PRODUCTS[i % PRODUCTS.length]
    const type = TYPES[Math.floor(i / PRODUCTS.length + rnd() * 0.999) % TYPES.length]
    const status = STATUS_PATTERN[i % STATUS_PATTERN.length]
    const createdAt = BASE_TS - (i * 6 + Math.floor(rnd() * 4) + 1) * DAY
    const finished = status === 'completed' || status === 'archived'
    const sampleCount = 8000 + Math.floor(rnd() * 42000)
    const spanEnd = createdAt - 3 * DAY
    const spanStart = spanEnd - 30 * DAY

    list.push({
      id: 1001 + i,
      title: `${product.name}·${TYPE_LABEL[type]}评估报告_${fmtDate(createdAt).replace(/-/g, '')}`,
      reportName: `${product.name}·${TYPE_LABEL[type]}评估报告_${fmtDate(createdAt).replace(/-/g, '')}`,
      productName: product.name,
      supplier: product.supplier,
      type,
      reportType: type,
      status,
      score: finished ? Math.round(62 + rnd() * 33) : null,
      progress: finished ? 100 : status === 'in_progress' ? Math.round(25 + rnd() * 60) : 0,
      creator: CREATORS[i % CREATORS.length],
      analysisType: ANALYSIS_TYPES[i % ANALYSIS_TYPES.length],
      templateType: i % 3 === 0 ? '自定义模板' : '外数评估-产品级分析报告模板',
      sampleTimeSpan: `${fmtDate(spanStart)} 至 ${fmtDate(spanEnd)}`,
      sampleCount,
      generateDate: fmtDate(createdAt),
      analysisTime: finished ? fmtDateTime(createdAt + 5 * 3600_000) : null,
      failureReason: null,
      createdAt: new Date(createdAt).toISOString(),
      updatedAt: new Date(createdAt + (finished ? 2 * DAY : 0)).toISOString(),
    })
  }

  return list
}

// ————————————————————— 内存数据库 —————————————————————
let REPORT_DB: EvaluationReportItem[] = buildSeedReports()
let DETAIL_OVERRIDES: Record<number, any> = {}
let SEQ = 2000

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v))

function pickReport(id: string | number) {
  return REPORT_DB.find((r) => String(r.id) === String(id))
}

/** 列表查询：支持类型 / 状态 / 关键字 / 时间区间过滤 + 分页 */
export function listEvaluationReports(query: any = {}) {
  const { reportType, type, status, keyword, startDate, endDate, page = 1, pageSize = 10 } = query

  let rows = clone(REPORT_DB).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)) as EvaluationReportItem[]

  const typeVal = type || reportType
  if (typeVal) rows = rows.filter((r) => r.type === typeVal)
  if (status) rows = rows.filter((r) => r.status === status)
  if (keyword) {
    const kw = String(keyword).toLowerCase()
    rows = rows.filter((r) => r.title.toLowerCase().includes(kw) || r.productName.toLowerCase().includes(kw))
  }
  if (startDate) rows = rows.filter((r) => r.generateDate >= startDate)
  if (endDate) rows = rows.filter((r) => r.generateDate <= endDate)

  const total = rows.length
  const size = Number(pageSize) > 0 ? Number(pageSize) : 10
  const start = (Number(page) - 1) * size

  return { list: rows.slice(start, start + size), total }
}

// ————————————————————— 详情：7 大分析模块 —————————————————————
function buildModules(item: EvaluationReportItem) {
  const { productName, supplier, sampleCount, sampleTimeSpan } = item
  const matched = Math.round(sampleCount * 0.94)
  const valued = Math.round(matched * 0.88)
  const expired = Math.round(valued * 0.72)
  const bad = Math.round(expired * 0.062)
  const n = (v: number) => v.toLocaleString('en-US')
  const cover = ((valued / matched) * 100).toFixed(1)

  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(BASE_TS - (5 - i) * 30 * DAY)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const rnd = createRng(item.id * 7919)
  const series = (base: number, spread: number, digits = 1) =>
    months.map((_, i) => Number((base + (rnd() - 0.5) * spread + i * 0.15).toFixed(digits)))

  return [
    {
      id: 1,
      name: '测试背景及目的',
      type: 'text',
      editType: 'text_only',
      status: 'completed',
      editable: true,
      wordLimit: 1000,
      content:
        `为评估「${productName}」在零售信贷风控中的增益能力，本次测试以${supplier}提供的数据源为实验组、` +
        `以存量人行评分为对照组，验证该数据在覆盖度、准确性、稳定性三个层面的可用性，` +
        `并测算其对贷前拒贷、贷中预警模型的 KS / AUC 提升幅度，为是否纳入正式采购清单及后续上下线管理提供决策依据。`,
    },
    {
      id: 2,
      name: '产品介绍',
      type: 'text',
      editType: 'text_only',
      status: 'completed',
      editable: true,
      wordLimit: 1000,
      content:
        `「${productName}」由${supplier}提供，接口形态为实时查询 + 离线批量回溯双通道，` +
        `返回字段包含主评分、分档标签、更新时间戳及数据源标识；计费方式按查询次数计费，` +
        `未命中不计费。产品已具备等保三级与个人信息保护合规审计证明，授权链路完整，可支持贷前、贷中、贷后全流程调用。`,
    },
    {
      id: 3,
      name: '样本组成',
      type: 'text_and_table',
      editType: 'text_and_table',
      status: 'completed',
      editable: true,
      wordLimit: 2000,
      textContent:
        `本次送测样本取自 ${sampleTimeSpan} 期间放款且已到 mob3_30+ 观察点的客户，` +
        `经剔除重复件、授权缺失件后有效送测 ${n(sampleCount)} 条，覆盖自营、助贷、联合贷三类资产渠道。`,
      table: {
        title: '样本统计表',
        headers: ['样本分层', '送测样本量', '匹配成功数', '有值样本数', '有值率', '样本时间跨度'],
        rows: [
          ['贷前申请件', n(Math.round(sampleCount * 0.52)), n(Math.round(matched * 0.53)), n(Math.round(valued * 0.54)), '88.6%', sampleTimeSpan],
          ['贷中存量件', n(Math.round(sampleCount * 0.31)), n(Math.round(matched * 0.3)), n(Math.round(valued * 0.3)), '87.4%', sampleTimeSpan],
          ['历史逾期件', n(Math.round(sampleCount * 0.17)), n(Math.round(matched * 0.17)), n(Math.round(valued * 0.16)), '85.1%', sampleTimeSpan],
          ['合计', n(sampleCount), n(matched), n(valued), `${cover}%`, sampleTimeSpan],
        ],
      },
    },
    {
      id: 4,
      name: '总样本概况',
      type: 'text_and_dual_table',
      editType: 'text_and_dual_table',
      status: 'completed',
      editable: true,
      wordLimit: 2000,
      textContent:
        `有值样本 ${n(valued)} 条，其中 mob3_30+ 到期样本 ${n(expired)} 条、逾期坏账样本 ${n(bad)} 条，坏账率 ${(bad / expired * 100).toFixed(2)}%，` +
        `与大盘基准偏差在 ±0.3pp 以内，样本代表性成立；分月饱和度与特征相关性均通过显著性检验。`,
      tables: [
        {
          title: '样本饱和度分析',
          headers: ['统计指标', '数值', '口径说明'],
          rows: [
            ['有值样本数', n(valued), '返回主评分非空'],
            ['到期样本数', n(expired), 'mob3_30+ 有表现'],
            ['坏账样本数', n(bad), 'mob3_30+'],
            ['均值', ((0.32 + rnd() * 0.1)).toFixed(3), '主评分均值'],
            ['标准差', ((0.11 + rnd() * 0.04)).toFixed(3), '主评分标准差'],
            ['最小值 / 最大值', '312 / 968', '评分区间'],
            ['中位数', (520 + Math.floor(rnd() * 40)).toString(), '评分中位数'],
            ['PSI（跨月）', (0.03 + rnd() * 0.05).toFixed(3), '<0.1 判定稳定'],
          ],
        },
        {
          title: '特征相关性分析',
          headers: ['特征指标', 'IV值', 'KS值', '显著性'],
          rows: [
            ['主评分', (0.28 + rnd() * 0.12).toFixed(3), (0.31 + rnd() * 0.08).toFixed(3), 'p<0.001 显著'],
            ['多头申请次数', (0.12 + rnd() * 0.06).toFixed(3), (0.16 + rnd() * 0.05).toFixed(3), 'p<0.01 显著'],
            ['近30天查询机构数', (0.09 + rnd() * 0.05).toFixed(3), (0.13 + rnd() * 0.04).toFixed(3), 'p<0.01 显著'],
            ['数据更新时间戳距今', (0.02 + rnd() * 0.02).toFixed(3), (0.04 + rnd() * 0.02).toFixed(3), '不显著'],
          ],
        },
      ],
    },
    {
      id: 5,
      name: '效果分析-全平台',
      type: 'text_and_chart_and_table',
      editType: 'text_and_chart_and_table',
      status: 'completed',
      editable: true,
      wordLimit: 2000,
      textContent:
        `全平台口径下，叠加「${productName}」后基准模型 KS 由 0.318 提升至 0.361（+4.3pp），AUC 提升 2.1pp；` +
        `按评分十分位切分，最差组坏账率为最优组的 3.2 倍，排序性单调无明显反转。分月指标趋势平稳，无异常跳变。`,
      charts: [
        {
          title: '分月覆盖度与稳定性趋势',
          type: 'line',
          data: {
            dates: months,
            series: [
              { name: '覆盖率(%)', data: series(87.6, 3.2) },
              { name: '命中率(%)', data: series(93.4, 2.6) },
              { name: 'PSI', data: series(4.2, 1.8, 2) },
            ],
          },
        },
        {
          title: '样本处理漏斗',
          type: 'funnel',
          data: [
            { name: '送测样本', value: sampleCount },
            { name: '匹配成功', value: matched },
            { name: '有值样本', value: valued },
            { name: '到期样本', value: expired },
            { name: '坏账样本', value: bad },
          ],
        },
      ],
      table: {
        title: '全平台效果指标',
        headers: ['模型方案', 'KS', 'AUC', 'Swap-in 率', 'Swap-out 坏账占比'],
        rows: [
          ['基准模型（人行+内部）', '0.318', '0.742', '—', '—'],
          ['基准 + 本产品主评分', (0.352 + rnd() * 0.02).toFixed(3), (0.761 + rnd() * 0.01).toFixed(3), '6.8%', '71.4%'],
          ['基准 + 全量特征', (0.364 + rnd() * 0.02).toFixed(3), (0.768 + rnd() * 0.01).toFixed(3), '9.2%', '76.9%'],
        ],
      },
    },
    {
      id: 6,
      name: '效果分析-分平台',
      type: 'text_and_chart_and_table',
      editType: 'text_and_chart_and_table',
      status: 'completed',
      editable: true,
      wordLimit: 2000,
      textContent:
        `分业务场景看，贷中额度管理场景增益最大（KS +5.1pp），反欺诈场景因数据时效性不足增益有限（KS +1.2pp）；` +
        `各场景质量维度雷达对比显示，本产品优势集中在覆盖率与稳定性，成本项为主要短板。`,
      charts: [
        {
          title: '分场景 KS / AUC 增益对比',
          type: 'bar',
          data: {
            platforms: ['贷前审批', '贷中监控', '额度管理', '反欺诈'],
            metrics: [
              { name: 'KS 提升(pp)', data: [3.6, 4.2, 5.1, 1.2].map((v) => Number((v + rnd() * 0.6).toFixed(1))) },
              { name: 'AUC 提升(pp)', data: [1.8, 2.2, 2.6, 0.7].map((v) => Number((v + rnd() * 0.4).toFixed(1))) },
            ],
          },
        },
        {
          title: '数据质量维度雷达',
          type: 'radar',
          data: {
            indicators: ['覆盖率', '准确率', '时效性', '稳定性', '成本', '合规性'],
            series: [
              { name: productName, value: [88, 84, 72, 90, 55, 96] },
              { name: '同类竞品均值', value: [79, 80, 81, 78, 68, 92] },
            ],
          },
        },
      ],
      table: {
        title: '分场景效果明细',
        headers: ['业务场景', '样本量', '有值率', 'KS 提升', '建议'],
        rows: [
          ['贷前审批', n(Math.round(sampleCount * 0.52)), '88.6%', '+3.6pp', '纳入准入模型'],
          ['贷中监控', n(Math.round(sampleCount * 0.31)), '87.4%', '+4.2pp', '纳入预警因子'],
          ['额度管理', n(Math.round(sampleCount * 0.11)), '86.9%', '+5.1pp', '优先上线'],
          ['反欺诈', n(Math.round(sampleCount * 0.06)), '79.5%', '+1.2pp', '暂缓，等待时效优化'],
        ],
      },
    },
    {
      id: 7,
      name: '数据结论',
      type: 'text',
      editType: 'text_only',
      status: 'completed',
      editable: true,
      wordLimit: 5000,
      content:
        `综合结论：「${productName}」样本代表性、排序性与稳定性均达到引入标准，` +
        `对贷前、贷中模型具备显著增益，建议纳入正式采购并进入上线审批流程。` +
        `需重点关注反欺诈场景的时效性短板与单价成本，建议以阶梯报价方式续签后再评估。`,
      suggestions: [
        '准入与额度管理场景优先接入，贷中预警因子第二批灰度上线',
        '与供应商协商阶梯计费：月调用量 50 万次以上单价下调 15%',
        '反欺诈场景暂缓接入，待数据源更新频率由 T+1 优化至准实时后复测',
        '上线后按月监控 PSI 与有值率，PSI>0.1 或覆盖率下降超 3pp 触发预警工单',
        '将本次评估报告结论同步至外数档案，作为生命周期「评估→审批」流转凭证',
      ],
    },
  ]
}

function buildAnalysisSteps(item: EvaluationReportItem) {
  const names = [
    '文件数据解析与验证', '数据质量检查与清洗', '样本匹配与去重',
    '关键指标计算', '样本饱和度分析', '相关性检验',
    '全平台效果分析', '分平台效果分析', '图表生成与结论填充',
  ]
  const rnd = createRng(item.id * 104729)
  let cursor = new Date(item.createdAt).getTime() + 3600_000
  const doneCount = item.status === 'draft' ? 1 : item.status === 'in_progress' ? Math.max(2, Math.round(item.progress / 100 * names.length)) : names.length

  const steps = names.map((name, i) => {
    const dur = Math.round(6 + rnd() * 40)
    const start = cursor
    const end = cursor + dur * 1000
    cursor = end
    const state = i < doneCount ? 'completed' : i === doneCount && item.status === 'in_progress' ? 'processing' : 'pending'
    return {
      step: i + 1,
      name,
      status: state,
      startTime: state === 'pending' ? null : fmtDateTime(start),
      endTime: state === 'completed' ? fmtDateTime(end) : null,
      duration: state === 'completed' ? `${dur}秒` : null,
      description: '系统自动执行',
    }
  })

  return { steps, doneCount, currentStep: Math.min(doneCount + 1, names.length), estimatedCompletion: fmtDateTime(cursor + 30_000) }
}

/** 详情查询：列表状态会映射为详情页使用的中文状态 */
export function getEvaluationReportDetail(id: string | number) {
  const item = pickReport(id)
  if (!item) return null
  const wf = buildAnalysisSteps(item)
  const cached = DETAIL_OVERRIDES[item.id]

  const detail = {
    id: item.id,
    reportName: item.reportName,
    title: item.title,
    productName: item.productName,
    supplier: item.supplier,
    reportType: TYPE_LABEL[item.type],
    type: item.type,
    analysisType: item.analysisType,
    templateType: item.templateType,
    generateDate: item.generateDate,
    analysisPeriod: item.sampleTimeSpan,
    sampleTimeSpan: item.sampleTimeSpan,
    sampleCount: item.sampleCount,
    status: STATUS_CN[item.status],
    progress: item.progress,
    score: item.score,
    creator: item.creator,
    editable: item.status === 'draft' || item.status === 'in_progress',
    productRegistrationStatus: 'registered',
    estimatedCompletion: item.status === 'in_progress' ? wf.estimatedCompletion : undefined,
    modules: buildModules(item),
    sampleFiles: [
      { id: 1, fileName: `${item.id}_sample_${item.generateDate.replace(/-/g, '')}.csv`, fileSize: `${(item.sampleCount / 5200).toFixed(1)}MB`, uploadTime: fmtDateTime(new Date(item.createdAt).getTime()), status: 'processed', recordCount: item.sampleCount },
      { id: 2, fileName: `${item.id}_control_${item.generateDate.replace(/-/g, '')}.csv`, fileSize: `${(item.sampleCount / 12000).toFixed(1)}MB`, uploadTime: fmtDateTime(new Date(item.createdAt).getTime() + 300_000), status: 'processed', recordCount: Math.round(item.sampleCount * 0.35) },
    ],
    keyMetrics: {
      totalSamples: item.sampleCount,
      matchedSamples: Math.round(item.sampleCount * 0.94),
      valuedSamples: Math.round(item.sampleCount * 0.827),
      coverage: 0.879,
      ks: 0.361,
      auc: 0.766,
      psi: 0.058,
      badRate: 0.062,
    },
    analysisWorkflow: { currentStep: wf.currentStep, steps: wf.steps.map((s) => ({ id: s.step, name: s.name, status: s.status })) },
    analysisSteps: wf.steps,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    failureReason: item.failureReason,
  }

  return cached ? { ...clone(detail), ...clone(cached) } : clone(detail)
}

// ————————————————————— 写操作 —————————————————————
export function createEvaluationReport(payload: any) {
  const now = Date.now()
  const type = (payload?.type || payload?.reportType || 'comprehensive') as EvaluationType
  const product = PRODUCTS[Math.floor(Math.random() * PRODUCTS.length)]
  const item: EvaluationReportItem = {
    id: ++SEQ,
    title: payload?.title || `${product.name}·${TYPE_LABEL[type]}评估报告_${fmtDate(now).replace(/-/g, '')}`,
    reportName: payload?.title || '',
    productName: payload?.productName || product.name,
    supplier: payload?.supplier || product.supplier,
    type,
    reportType: type,
    status: (payload?.status as EvaluationStatus) || 'draft',
    score: payload?.score ?? null,
    progress: 0,
    creator: payload?.creator || '当前用户',
    analysisType: payload?.analysisType || '周期性分析',
    templateType: payload?.templateType || '外数评估-产品级分析报告模板',
    sampleTimeSpan: payload?.sampleTimeSpan || `${fmtDate(now - 33 * DAY)} 至 ${fmtDate(now - 3 * DAY)}`,
    sampleCount: payload?.sampleCount || 12_000,
    generateDate: fmtDate(now),
    analysisTime: null,
    failureReason: null,
    createdAt: new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString(),
  }
  item.reportName = item.title
  REPORT_DB = [item, ...REPORT_DB]
  return clone(item)
}

export function updateEvaluationReport(id: string | number, payload: any) {
  const item = pickReport(id)
  if (!item) return null
  if (payload?.reportName) {
    item.reportName = payload.reportName
    item.title = payload.reportName
  }
  if (payload?.status) item.status = STATUS_EN[payload.status] || (payload.status as EvaluationStatus)
  item.updatedAt = new Date().toISOString()
  if (payload?.modules) DETAIL_OVERRIDES[item.id] = { modules: payload.modules }
  return clone(item)
}

export function publishEvaluationReport(id: string | number) {
  const item = pickReport(id)
  if (!item) return null
  item.status = 'completed'
  item.progress = 100
  if (item.score == null) item.score = 80
  item.analysisTime = fmtDateTime(Date.now())
  item.updatedAt = new Date().toISOString()
  return clone(item)
}

export function archiveEvaluationReport(id: string | number) {
  const item = pickReport(id)
  if (!item) return null
  item.status = 'archived'
  item.updatedAt = new Date().toISOString()
  return clone(item)
}

export function deleteEvaluationReport(id: string | number) {
  const before = REPORT_DB.length
  REPORT_DB = REPORT_DB.filter((r) => String(r.id) !== String(id))
  delete DETAIL_OVERRIDES[Number(id)]
  return REPORT_DB.length < before
}

export { TYPE_LABEL, STATUS_CN }
