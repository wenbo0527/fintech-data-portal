/**
 * 指标中心 - Mock 数据
 * 对应需求文档：首批20-30个高频核心指标
 */
import type {
  MetricItem, MetricTreeNode, Person, CalculationFrequency,
  MetricValueSeries, DashboardBoardConfig, ReportItem,
  MetricAgentMeta, MetricSourceType, MetricGranularity,
  MetricReportMount, MetricLineageGraph,
} from './types'

/** 计算时效选项 */
export const FREQUENCY_OPTIONS: { label: string; value: CalculationFrequency }[] = [
  { label: '实时', value: 'realtime' },
  { label: 'T+1', value: 'T+1' },
  { label: 'T+2', value: 'T+2' },
  { label: '周更新', value: 'weekly' },
  { label: '月更新', value: 'monthly' },
]

/** 指标域选项 */
export const DOMAIN_OPTIONS = ['业务域', '监管域']

/** 归属场景选项（按指标域分组） */
export const SCENARIO_OPTIONS: Record<string, string[]> = {
  '业务域': ['用户运营', '交易分析', '风控管理', '营销活动', '信贷业务', '渠道运营'],
  '监管域': ['银保监会', '人行报送', '内部审计', '合规报告'],
}

/** 指标类型选项 */
export const TYPE_OPTIONS = [
  { label: '业务核心指标', value: 'business' },
  { label: '监管指标', value: 'regulatory' },
]

/** 状态选项（对齐状态机：草稿→审核中→启用→归档） */
export const STATUS_OPTIONS = [
  { label: '启用', value: 'active' },
  { label: '审核中', value: 'pending' },
  { label: '归档', value: 'archived' },
  { label: '草稿', value: 'draft' },
]

/** 来源类型选项（结构化字段 R12） */
export const SOURCE_TYPE_OPTIONS: { label: string; value: MetricSourceType }[] = [
  { label: '结果表直取', value: 'result_table' },
  { label: '模型加工计算', value: 'model_calc' },
  { label: 'SQL 直查', value: 'sql_fetch' },
  { label: '外部/三方引入', value: 'third_party' },
]

/** 统计粒度选项（AG-05，值域受控） */
export const GRANULARITY_OPTIONS: { label: string; value: MetricGranularity }[] = [
  { label: '客户（自然人）', value: 'customer' },
  { label: '账户', value: 'account' },
  { label: '借据', value: 'loan_order' },
  { label: '渠道', value: 'channel' },
  { label: '产品', value: 'product' },
  { label: '日', value: 'day' },
  { label: '周', value: 'week' },
  { label: '月', value: 'month' },
]

/** 报表类型选项（R22） */
export const REPORT_TYPE_OPTIONS: { label: string; value: ReportItem['type'] }[] = [
  { label: '固定报表', value: 'fixed' },
  { label: '分支看板', value: 'branch_board' },
  { label: '仪表盘', value: 'dashboard' },
]

/** 治理筛选项（R03） */
export const COMPLETENESS_FILTER_OPTIONS = [
  { label: '完整', value: 'complete' },
  { label: '部分缺失', value: 'partial' },
  { label: '严重缺失', value: 'missing' },
]

export const MOUNT_STATUS_FILTER_OPTIONS = [
  { label: '已挂载报表', value: 'mounted' },
  { label: '未挂载报表', value: 'unmounted' },
]

/** 人员列表（系统内有效用户） */
export const PERSONS: Person[] = [
  { id: 'u001', name: '张三', department: '数据平台部' },
  { id: 'u002', name: '李四', department: '风险管理部' },
  { id: 'u003', name: '王五', department: '信贷业务部' },
  { id: 'u004', name: '赵六', department: '金融市场部' },
  { id: 'u005', name: '陈七', department: '运营管理部' },
  { id: 'u006', name: '刘八', department: '数据平台部' },
  { id: 'u007', name: '周九', department: '信息科技部' },
  { id: 'u008', name: '吴十', department: '合规部' },
  { id: 'u009', name: '孙明', department: '审计部' },
  { id: 'u010', name: '钱亮', department: '信贷业务部' },
  { id: 'u011', name: '冯刚', department: '风险管理部' },
  { id: 'u012', name: '蒋伟', department: '运营管理部' },
]

/** 批量注册模板字段（含结构化必填：统计粒度/来源类型；Agent：同义词） */
export const BATCH_TEMPLATE_FIELDS = [
  '指标编码', '指标名称', '指标类型', '指标域', '归属场景',
  '业务负责人', '技术负责人', '业务口径', '使用场景', '计算时效',
  '统计粒度', '来源类型', '同义词',
  '技术口径', '技术口径使用说明', '结果表', '查询代码', '报表路径',
  '版本号', '版本说明', '版本状态',
]

/**
 * 报表库（模块 B 的实体，挂载与反查的数据基础）
 * 报表以「名称 + 跳转路径」标识（无编码/说明字段）；跳转路径人机同源（R27），Agent 调用语义统一在 agentDoc 维护，指标侧只引用 ID
 */
export const REPORTS_DATA: ReportItem[] = [
  {
    id: 'r001', name: '信贷日报', type: 'fixed',
    owner: '王五', updateFrequency: 'T+1', status: 'active',
    accessEntry: '/reports/credit/daily',
    agentDoc: `## 信贷日报 · Agent 说明文档

> 打开入口即报表的「跳转路径」字段；参数、维度、权限等调用要求全部以本文档为准。

### 调用要点
- 必填参数：date（yyyyMMdd）——缺省会落到当日空页，取数前务必补齐日期；
- 可筛维度：产品 / 渠道 / 分支；
- 权限约束：信贷业务域角色可见，明细行按机构过滤（代码级强制）。

### 调用时机
- 数据为 T+1 产出，每日 08:30 前只能取到前日数据——用户问"今天"时先说明时效，再给最近已产出日；
- 看当日授信/放款全景时打开本报表；同比环比对比建议改用信贷月报。

### 回答策略
- 适合回答当日授信笔数 / 通过率 / 放款金额全景，以及**拒绝原因分布**下钻；
- 用户追问环比、同比、趋势时，不要拼接多日数据给结论，引导至信贷月报口径；
- 引用通过率数值时注意与指标侧"授信审批通过率"口径一致（自然人口径），有差异先解释再作答。

### 承诺边界
- 单一客户审批明细不承诺可查，权限体系不同，引导至统一查询服务；
- 分支行用户只应看到本机构数据，机构过滤由报表侧代码级强制，Agent 不要尝试绕过或承诺全行视角。`,
    updatedAt: '2026-09-20 09:00:00',
  },
  {
    id: 'r002', name: '风控月报', type: 'fixed',
    owner: '李四', updateFrequency: 'monthly', status: 'active',
    accessEntry: '/reports/risk/monthly',
    agentDoc: `## 风控月报 · Agent 说明文档

> 打开入口即报表的「跳转路径」字段；参数、维度、权限等调用要求全部以本文档为准。

### 调用要点
- 必填参数：month（yyyyMM）；
- 可筛维度：产品 / 客群 / 地区；
- 权限约束：风险管理部及授权业务方可见，敏感字段一律脱敏。

### 回答策略
- 早期风险、Vintage 类问题优先引用本报表月度口径，不要用日报数据自行折算月值；趋势异动先查本报表总览再下钻；
- 按放款月归组解读逾期表现，用户问"某月发放的资产现在质量如何"时说明是放款月视角而非自然月；
- 趋势异动问题先看月报总览定位异常月份，再决定是否需要用户下钻确认维度。

### 承诺边界
- 月初 5 个工作日内上月数据仍在回补，引用上月数值时必须标注"数据可能微调"；
- 用户追问单户明细时**停止下钻**，引导到统一查询服务（脱敏规则不同）；
- 敏感字段在本报表一律脱敏，不承诺可导出明文。`,
    updatedAt: '2026-09-05 10:00:00',
  },
  {
    id: 'r003', name: '运营日报', type: 'fixed',
    owner: '陈七', updateFrequency: 'T+1', status: 'active',
    accessEntry: '/reports/ops/daily',
    updatedAt: '2026-09-21 08:30:00',
  },
  {
    id: 'r004', name: '产品数据仪表盘', type: 'dashboard',
    owner: '陈七', updateFrequency: 'realtime', status: 'active',
    accessEntry: '/dashboards/product',
    updatedAt: '2026-09-18 15:00:00',
  },
  {
    id: 'r005', name: 'G01 监管报送报表', type: 'fixed',
    owner: '吴十', updateFrequency: 'monthly', status: 'active',
    accessEntry: '/reports/regulatory/G01',
    updatedAt: '2026-09-01 09:00:00',
  },
  {
    id: 'r006', name: '资本充足率月报', type: 'fixed',
    owner: '吴十', updateFrequency: 'monthly', status: 'active',
    accessEntry: '/reports/regulatory/CAR',
    updatedAt: '2026-08-28 09:00:00',
  },
  {
    id: 'r007', name: '营销周报', type: 'fixed',
    owner: '陈七', updateFrequency: 'weekly', status: 'active',
    accessEntry: '/reports/marketing/weekly', updatedAt: '2026-09-15 09:00:00',
  },
  {
    id: 'r008', name: '财务月报', type: 'fixed',
    owner: '赵六', updateFrequency: 'monthly', status: 'active',
    accessEntry: '/reports/finance/monthly', updatedAt: '2026-09-02 09:00:00',
  },
  {
    id: 'r009', name: '信贷分支看板', type: 'branch_board',
    owner: '王五', updateFrequency: 'T+1', status: 'active',
    accessEntry: '/boards/credit', updatedAt: '2026-09-19 09:00:00',
  },
  {
    id: 'r010', name: '流动性日报', type: 'fixed',
    owner: '赵六', updateFrequency: 'T+1', status: 'active',
    accessEntry: '/reports/liquidity/daily', updatedAt: '2026-09-21 07:00:00',
  },
  {
    id: 'r011', name: '资产负债月报', type: 'fixed',
    owner: '赵六', updateFrequency: 'monthly', status: 'active',
    accessEntry: '/reports/asset/monthly', updatedAt: '2026-09-03 09:00:00',
  },
  {
    id: 'r012', name: '监管指标总览仪表盘', type: 'dashboard',
    owner: '吴十', updateFrequency: 'monthly', status: 'offline',
    accessEntry: '/dashboards/regulatory-overview', updatedAt: '2026-08-01 09:00:00',
  },
]

/**
 * 指标 Agent 语义 + 结构化字段 + 报表挂载（按指标 id 配置）
 * 结构化仅保留：来源类型/统计粒度（必填）、同义词（AG-01，检索消费）、报表挂载（人机同源）；
 * AG-02~08（语义类型/枚举映射/必需过滤/维度组/适用禁用对象场景）统一在 agentDoc（Markdown）内维护。
 * 部分指标故意留缺口，用于演示"完整度评分/缺口筛选"（知识底座·可持续变好）
 */
export interface MetricSemanticExtras {
  sourceType: MetricSourceType
  granularity: MetricGranularity
  agentMeta: MetricAgentMeta
  /** Agent 说明文档（Markdown 长文本，承载 AG-02~08 语义内容） */
  agentDoc?: string
  mounts?: MetricReportMount[]
}

export const METRIC_SEMANTICS: Record<string, MetricSemanticExtras> = {
  m001: {
    sourceType: 'result_table',
    granularity: 'customer',
    agentMeta: {
      synonyms: ['通过率', '授信批准率', 'approval rate', '信审通过率'],
    },
    agentDoc: `## 授信审批通过率 · Agent 说明文档

> 本文档承载结构化字段（同义词、统计粒度、报表挂载）之外的全部 Agent 语义：口径约束、枚举映射、维度与场景、回答行为。

### 基本语义
- 语义类型：比率（ratio），百分比呈现，保留 2 位小数；
- 统计口径：**自然人口径**（同一申请人同期只计一次），与"笔数通过率"是不同指标。

### 必需过滤（口径不可省）
- \`exclude_test_user = 1\`（剔除测试账号）；
- \`rn = 1\`（按自然人取最新审批结果）。

### 枚举值映射（防值对不上）
| 字段 | 原始值 → 展示值 |
| --- | --- |
| result | PASS→通过；REJECT→拒绝；PENDING→审批中 |

### 可切维度组
- 常规拆解：产品 / 渠道 / 客群；
- 组织视角：机构 / 分支行。

### 适用与禁用
- 适用对象：信贷业务域、风控策略团队、业务管理层；
- 适用场景：月度经营分析、风控策略效果评估；
- 禁用场景：单笔审批查询（明细请用统一查询）、产品维度之外未授权口径。

### 回答策略
- "通过率"默认取**最近一个已产出统计日**，不要自行跨日平均，除非用户明确要求区间汇总；
- 环比/同比类问题走月报口径（见挂载的信贷月报），不要用日数据拼接后给趋势结论；
- 用户问"笔数通过率"时先解释口径差异再作答。

### 承诺边界
- 不承诺下钻到单笔/具体客户的审批结果，此类诉求引导至统一查询（权限体系不同）；
- 不主动做跨产品口径比较；监管口径通过率是另一个指标，不要混用数值。`,
    mounts: [
      { reportId: 'r001', role: '业务管理层', params: 'date=统计日', scenarioRoutingPrompt: '想看当日授信全景（含件均、拒绝原因分布）时跳信贷日报', visibility: 'all' },
      { reportId: 'r002', role: '风控策略', params: 'month=统计月', scenarioRoutingPrompt: '需要结合首逾、 vintage 做策略复盘时跳风控月报', visibility: 'domain' },
    ],
  },
  m002: {
    sourceType: 'model_calc',
    granularity: 'customer',
    agentMeta: {
      synonyms: ['首逾率', '首逾30', 'FPD30', '首期逾期', 'first payment default'],
    },
    agentDoc: `## FPD30 首逾率 · Agent 说明文档

> 本文档承载结构化字段（同义词、统计粒度、报表挂载）之外的全部 Agent 语义；计算公式见业务口径。

### 基本语义
- 语义类型：比率（ratio），百分比呈现，保留 2 位小数。

### 必需过滤（口径不可省）
- \`overdue_days >= 30\`；
- \`write_off_flag = 0\`（不含核销账户）。

### 枚举值映射（防值对不上）
| 字段 | 原始值 → 展示值 |
| --- | --- |
| region | BJ→北京；SH→上海；GD→广东；ZJ→浙江 |

### 可切维度组
- 放款视角：放款月份 / 产品 / 客群；
- 地区视角：地区 / 机构。

### 适用与禁用
- 适用对象：信贷业务域、风险管理部、资产保全团队；
- 适用场景：早期风险预警、Vintage 分析、风控策略优化；
- 禁用场景：全生命周期逾期分析（应迁 M1+/滚动率指标）、按借据粒度直接平均。

### 易答错场景
- 口语"放款后 30 天逾期"≠ 本指标口径（首期账单到期后 30 天），转述用户问题时不得混用两种说法；
- "首逾率涨了"→ 先澄清对比基准是**放款月（Vintage）**还是自然月，两种归组结论可能相反；
- 最近 1-2 个放款月**账龄未成熟**，数值仍会上修：呈现时必须附"数据仍在爬坡，不宜直接比较"的免责说明。

### 输出建议
- 趋势类回答按月列表格呈现；
- 用户问"这个客户逾期严重吗"→ 单笔账龄不属于本指标，引导至统一查询。`,
    mounts: [
      { reportId: 'r002', role: '风险管理部', params: 'month=放款月', scenarioRoutingPrompt: '问"这个月/某月首逾率怎么样"时，先看趋势卡片；要看地区与产品全景、异常清单时跳风控月报', visibility: 'domain' },
      { reportId: 'r009', role: '分支行行长', params: 'org_id=机构', scenarioRoutingPrompt: '分支行询问本机构早期风险时跳信贷分支看板（行级隔离）', visibility: 'specific' },
    ],
  },
  m003: {
    sourceType: 'sql_fetch',
    granularity: 'day',
    agentMeta: {
      synonyms: ['日活', 'DAU', '活跃用户数（日）'],
    },
    agentDoc: `## 日活跃用户数 · Agent 说明文档

> 本文档承载结构化字段（同义词、统计粒度、报表挂载）之外的全部 Agent 语义。

### 基本语义
- 语义类型：计数（count），统计当日去重活跃自然人数；
- 口径：同一用户当日跨端登录只计一次。

### 必需过滤（口径不可省）
- user_type not_in TEST,BOT（剔除测试账号与机器人）。

### 枚举值映射（防值对不上）
| 字段 | 原始值 → 展示值 |
| --- | --- |
| platform | ios→iOS；android→Android；web→网页端；mini→小程序 |

### 可切维度组
- 流量视角：渠道 / 版本 / 平台。

### 适用与禁用
- 适用对象：产品、运营、增长团队；
- 适用场景：产品健康度日常监控、活动流量复盘；
- 禁用场景：监管报送场景（该口径不被监管采用）。`,
    mounts: [
      { reportId: 'r003', role: '运营', params: 'date=统计日', scenarioRoutingPrompt: '日常巡检看运营日报；需要交互式下钻用产品仪表盘', visibility: 'all' },
      { reportId: 'r004', role: '产品委员会', params: '无', scenarioRoutingPrompt: '多版本/多渠道对比时跳产品仪表盘', visibility: 'all' },
    ],
  },
  m004: {
    sourceType: 'result_table',
    granularity: 'loan_order',
    agentMeta: {
      synonyms: ['在贷余额', '贷款规模', 'outstanding loan balance'],
    },
    agentDoc: `## 贷款余额 · Agent 说明文档

> 本文档承载结构化字段（同义词、统计粒度、报表挂载）之外的全部 Agent 语义。

### 基本语义
- 语义类型：金额（amount），单位万元，保留 2 位小数；
- 口径：统计日时点在贷余额（按借据汇总），不含已结清与核销。

### 必需过滤（口径不可省）
- status in ACTIVE,OVERDUE（不含结清与核销）。

### 枚举值映射（防值对不上）
| 字段 | 原始值 → 展示值 |
| --- | --- |
| product_code | C1→个贷消费；C2→经营贷；C3→车贷 |

### 可切维度组
- 结构视角：产品 / 期限 / 担保方式。

### 适用与禁用
- 适用对象：资产负债管理、计财、信贷业务域；
- 适用场景：规模类分析、结构分析；
- 禁用场景：客户粒度余额分析（未建模，勿按客户聚合回答）。`,
    mounts: [
      { reportId: 'r001', role: '业务管理层', params: 'date=统计日', scenarioRoutingPrompt: '看当日规模跳信贷日报', visibility: 'all' },
      { reportId: 'r011', role: '资产负债管理岗', params: 'report_month=统计月', scenarioRoutingPrompt: '看结构（期限/担保）与历史走势时跳资产负债月报', visibility: 'domain' },
    ],
  },
  m005: {
    sourceType: 'model_calc',
    granularity: 'month',
    agentMeta: {
      synonyms: ['不良率', 'NPL', '不良贷款占比'],
    },
    agentDoc: `## 不良贷款率 · Agent 说明文档

> 本文档承载结构化字段（同义词、统计粒度、报表挂载）之外的全部 Agent 语义。

### 基本语义
- 语义类型：比率（ratio），百分比呈现，保留 2 位小数；
- 口径：月末不良余额 / 月末贷款余额，**监管口径**（五级分类后三类）。

### 必需过滤（口径不可省）
- risk_level in SUBSTANDARD,DOUBTFUL,LOSS（次级、可疑、损失）。

### 枚举值映射（防值对不上）
| 字段 | 原始值 → 展示值 |
| --- | --- |
| risk_level | SUBSTANDARD→次级；DOUBTFUL→可疑；LOSS→损失 |

### 可切维度组
- 监管视角：法人机构 / 五级分类。

### 适用与禁用
- 适用对象：合规部、监管报送、高管层；
- 适用场景：G01 报送、资产质量对外披露；
- 禁用场景：内部业务口径分析（与监管口径存在差异，被追问时须说明差异并引导至业务看板口径）。`,
    mounts: [
      { reportId: 'r005', role: '报送专员', params: 'report_month=报送月', scenarioRoutingPrompt: '报送口径一律以 G01 报表为准，禁止从业务看板取数', visibility: 'specific' },
    ],
  },
  m006: {
    sourceType: 'result_table',
    granularity: 'month',
    agentMeta: {
      synonyms: ['CAR', '资本充足'],
    },
    agentDoc: `## 资本充足率 · Agent 说明文档

- 语义类型：比率（ratio），月末时值，百分比保留 2 位小数；
- 可切维度：法人机构（监管视角）；
- 适用对象：计财部、合规部；适用场景：资本达标推演。`,
    mounts: [
      { reportId: 'r006', role: '计财', params: 'report_month=统计月', scenarioRoutingPrompt: '看资本全景与达标推演跳资本充足率月报', visibility: 'domain' },
    ],
  },
  m007: {
    sourceType: 'sql_fetch',
    granularity: 'channel',
    agentMeta: {
      synonyms: ['获客成本', '单客获取成本'],
    },
    agentDoc: `## 客户获取成本 · Agent 说明文档

- 语义类型：金额（amount），单位元/客，按渠道口径统计；
- 适用对象：营销团队；适用场景：渠道投放复盘；
- 禁用场景：LTV 测算（口径未含回收周期，被问及时须说明）。`,
    mounts: [
      { reportId: 'r007', role: '营销', params: 'week_start=周起日', scenarioRoutingPrompt: '渠道对比与活动明细跳营销周报', visibility: 'all' },
    ],
  },
  m008: {
    sourceType: 'result_table',
    granularity: 'month',
    agentMeta: {
      synonyms: ['息差', '净息差 NIM'],
    },
    agentDoc: `## 净息差 · Agent 说明文档

- 语义类型：比率（ratio），月度年化口径，百分比保留 2 位小数；
- 适用对象：计财、资产负债管理；适用场景：盈利分析。`,
    mounts: [
      { reportId: 'r008', role: '财务分析岗', params: 'report_month=统计月', scenarioRoutingPrompt: '盈利结构全景跳财务月报', visibility: 'domain' },
    ],
  },
  m009: {
    sourceType: 'result_table',
    granularity: 'month',
    agentMeta: {
      synonyms: ['拨备覆盖', 'Coverage Ratio'],
    },
    agentDoc: `## 拨备覆盖率 · Agent 说明文档

- 语义类型：比率（ratio），监管口径（贷款损失准备 / 不良贷款余额）；
- 适用对象：合规部、风险管理部；适用场景：监管报送；
- 禁用场景：业务口径减值分析（与内部分级口径不同，须先澄清再作答）。`,
    mounts: [
      { reportId: 'r005', role: '报送专员', params: 'report_month=报送月', scenarioRoutingPrompt: '与不良率同屏核对时跳 G01 报表', visibility: 'specific' },
      { reportId: 'r012', role: '合规条线', params: 'report_month=报送月', scenarioRoutingPrompt: '监管指标横向对比原用总览仪表盘（已下线，改跳 G01）', visibility: 'domain' },
    ],
  },
  m010: {
    sourceType: 'model_calc',
    granularity: 'customer',
    agentMeta: {
      synonyms: ['复借率', '复贷客户占比'],
    },
    agentDoc: `## 复贷率 · Agent 说明文档

- 语义类型：比率（ratio），结清客户 90 天内再次提款占比，月度口径；
- 适用对象：信贷业务域；常用于客户经营与留存分析。`,
    mounts: [
      { reportId: 'r009', role: '客户经理', params: 'org_id=机构', scenarioRoutingPrompt: '本机构客户经营全景跳信贷分支看板', visibility: 'specific' },
    ],
  },
  m011: {
    sourceType: 'sql_fetch',
    granularity: 'month',
    agentMeta: {
      synonyms: ['月活', 'MAU'],
    },
    agentDoc: `## 月活跃用户数 · Agent 说明文档

- 语义类型：计数（count），自然月去重活跃用户；
- 与日活（DAU）不可直接相除当作"黏性"回答，须先说明口径差异；
- 适用对象：产品、运营；适用场景：月度用户规模复盘。`,
    mounts: [
      { reportId: 'r004', role: '产品委员会', params: '无', scenarioRoutingPrompt: '月活与留存联动分析跳产品仪表盘', visibility: 'all' },
    ],
  },
  m012: {
    sourceType: 'result_table',
    granularity: 'day',
    agentMeta: {
      synonyms: ['LCR', '流动性覆盖'],
    },
    agentDoc: `## 流动性覆盖率 · Agent 说明文档

- 语义类型：比率（ratio），监管口径（合格优质流动性资产 / 未来 30 天现金净流出量）；
- 适用对象：金融市场部；适用场景：流动性风险日报。`,
    mounts: [
      { reportId: 'r010', role: '流动性管理岗', params: 'date=统计日', scenarioRoutingPrompt: '日常跟踪跳流动性日报', visibility: 'specific' },
    ],
  },
  m013: {
    sourceType: 'sql_fetch',
    granularity: 'channel',
    agentMeta: {
      synonyms: [],
    },
    mounts: [],
  },
  m014: {
    sourceType: 'result_table',
    granularity: 'day',
    agentMeta: {
      synonyms: [],
    },
    mounts: [],
  },
  m015: {
    sourceType: 'sql_fetch',
    granularity: 'channel',
    agentMeta: {
      synonyms: ['渠道投产比', 'ROI'],
    },
    agentDoc: `## 渠道 ROI · Agent 说明文档

- 语义类型：比率（ratio），渠道带来的回收金额 / 渠道投入成本，周度口径；
- 适用对象：营销团队、渠道团队；适用场景：渠道预算分配；
- 禁用场景：自然量归因（口径未含归因模型，涉及自然量问题时须说明不做归因结论）。`,
    mounts: [
      { reportId: 'r007', role: '营销', params: 'week_start=周起日', scenarioRoutingPrompt: '周度渠道复盘跳营销周报', visibility: 'all' },
      { reportId: 'r012', role: '管理层', params: 'report_month=统计月', scenarioRoutingPrompt: '原跳监管总览仪表盘（已下线，展示下线提醒）', visibility: 'domain' },
    ],
  },
}

/** 把语义契约数据合并进指标实体 */
export function applySemantics(metrics: MetricItem[]): MetricItem[] {
  return metrics.map(m => {
    const extra = METRIC_SEMANTICS[m.id]
    if (!extra) return m
    const merged: MetricItem = {
      ...m,
      sourceType: extra.sourceType,
      granularity: extra.granularity,
      agentMeta: extra.agentMeta,
      agentDoc: extra.agentDoc,
      reportMounts: extra.mounts || [],
    }
    // 人机同源：reportLocations 由挂载派生，保持旧页面兼容
    merged.reportLocations = (extra.mounts || []).map(mount => {
      const rpt = REPORTS_DATA.find(r => r.id === mount.reportId)
      return rpt ? { name: rpt.name, url: rpt.accessEntry } : { name: mount.reportId, url: '' }
    })
    return merged
  })
}

/**
 * 指标血缘 Mock（R17 复用数据发现二期字段级血缘的演示数据）
 * key = 指标编码；未配置的编码展示"暂未采集血缘"（E9）
 */
export const METRIC_LINEAGE: Record<string, MetricLineageGraph> = {
  FPD30_RATE: {
    nodes: [
      { id: 'metric:FPD30_RATE', label: '首期逾期率 FPD30_RATE', type: 'metric' },
      { id: 'table:adm.ads_risk_core_metrics', label: 'adm.ads_risk_core_metrics（结果表）', type: 'result_table' },
      { id: 'table:dwd.loan_detail', label: 'dwd.loan_detail（放款明细）', type: 'upstream_table' },
      { id: 'table:dwd.repayment_detail', label: 'dwd.repayment_detail（还款明细）', type: 'upstream_table' },
      { id: 'table:dim.customer', label: 'dim.customer（客户维表）', type: 'upstream_table' },
      {
        id: 'field:dwd.repayment_detail.overdue_days', label: 'overdue_days', type: 'field', table: 'dwd.repayment_detail',
        detail: {
          expression: 'DATEDIFF(current_date, due_date) WHERE paid_flag=0',
          businessDefinition: '当前日期距应还款日的未还款天数，口径含宽限期',
          sensitivity: 'L2 内部',
          qualityRules: ['非空率 100%', '值域 [0,365]', '每日 T+1 校验波动 <±15%'],
        },
      },
      {
        id: 'field:dwd.loan_detail.customer_id', label: 'customer_id', type: 'field', table: 'dwd.loan_detail',
        detail: {
          expression: '直接取自 ods.core_loan_apply.customer_id',
          businessDefinition: '自然人客户唯一标识，已按 OneID 归一',
          sensitivity: 'L3 敏感（含个人身份信息，Agent 输出需脱敏）',
          qualityRules: ['唯一非空', 'OneID 映射覆盖率 ≥99.9%'],
        },
      },
      {
        id: 'field:dwd.loan_detail.write_off_flag', label: 'write_off_flag', type: 'field', table: 'dwd.loan_detail',
        detail: {
          expression: 'CASE WHEN status=\'WRITE_OFF\' THEN 1 ELSE 0 END',
          businessDefinition: '核销标记，v2 起从口径中剔除核销账户',
          sensitivity: 'L2 内部',
          qualityRules: ['枚举值仅 0/1'],
        },
      },
      { id: 'table:adm.ads_regulatory_metrics', label: 'adm.ads_regulatory_metrics（下游·G01 报送）', type: 'downstream' },
      { id: 'board:branch-credit', label: '信贷分支看板（下游·消费）', type: 'downstream' },
    ],
    edges: [
      { from: 'table:dwd.loan_detail', to: 'table:adm.ads_risk_core_metrics' },
      { from: 'table:dwd.repayment_detail', to: 'table:adm.ads_risk_core_metrics' },
      { from: 'table:dim.customer', to: 'table:adm.ads_risk_core_metrics' },
      { from: 'table:adm.ads_risk_core_metrics', to: 'metric:FPD30_RATE' },
      { from: 'field:dwd.repayment_detail.overdue_days', to: 'table:dwd.repayment_detail' },
      { from: 'field:dwd.loan_detail.customer_id', to: 'table:dwd.loan_detail' },
      { from: 'field:dwd.loan_detail.write_off_flag', to: 'table:dwd.loan_detail' },
      { from: 'table:adm.ads_risk_core_metrics', to: 'table:adm.ads_regulatory_metrics' },
      { from: 'metric:FPD30_RATE', to: 'board:branch-credit' },
    ],
  },
  CREDIT_PASS_RATE: {
    nodes: [
      { id: 'metric:CREDIT_PASS_RATE', label: '授信通过率 CREDIT_PASS_RATE', type: 'metric' },
      { id: 'table:adm.ads_credit_core_metrics', label: 'adm.ads_credit_core_metrics（结果表）', type: 'result_table' },
      { id: 'table:a_credit_apply_detail', label: 'dwd.a_credit_apply_detail（申请明细）', type: 'upstream_table' },
      {
        id: 'field:a_credit_apply_detail.result', label: 'result', type: 'field', table: 'dwd.a_credit_apply_detail',
        detail: {
          expression: '审批终态枚举（PASS/REJECT/PENDING）',
          businessDefinition: '按自然人取最新一条审批结果，排除测试与内部员工',
          sensitivity: 'L2 内部',
          qualityRules: ['枚举值域校验', '当日 PENDING 占比 <20%'],
        },
      },
    ],
    edges: [
      { from: 'table:a_credit_apply_detail', to: 'table:adm.ads_credit_core_metrics' },
      { from: 'table:adm.ads_credit_core_metrics', to: 'metric:CREDIT_PASS_RATE' },
      { from: 'field:a_credit_apply_detail.result', to: 'table:a_credit_apply_detail' },
    ],
  },
  LOAN_BALANCE: {
    nodes: [
      { id: 'metric:LOAN_BALANCE', label: '贷款余额 LOAN_BALANCE', type: 'metric' },
      { id: 'table:adm.ads_credit_core_metrics', label: 'adm.ads_credit_core_metrics（结果表）', type: 'result_table' },
      { id: 'table:dwd.loan_detail', label: 'dwd.loan_detail（放款明细）', type: 'upstream_table' },
      {
        id: 'field:dwd.loan_detail.remaining_principal', label: 'remaining_principal', type: 'field', table: 'dwd.loan_detail',
        detail: {
          expression: 'SUM(loan_principal - repaid_principal)',
          businessDefinition: '未结清贷款本金余额',
          sensitivity: 'L2 内部',
          qualityRules: ['非负', '与总账对账差异 <0.01%'],
        },
      },
    ],
    edges: [
      { from: 'table:dwd.loan_detail', to: 'table:adm.ads_credit_core_metrics' },
      { from: 'table:adm.ads_credit_core_metrics', to: 'metric:LOAN_BALANCE' },
      { from: 'field:dwd.loan_detail.remaining_principal', to: 'table:dwd.loan_detail' },
    ],
  },
}

/** 生成版本快照的辅助函数 */
function snapshot(m: Partial<MetricItem>) {
  return {
    businessDefinition: m.businessDefinition || '',
    useCase: m.useCase || '',
    calculationFrequency: m.calculationFrequency || ('T+1' as CalculationFrequency),
    technicalDefinition: m.technicalDefinition || '',
    technicalUsageNotes: m.technicalUsageNotes || '',
    reportLocations: m.reportLocations || [],
    resultTable: m.resultTable || '',
    queryCode: m.queryCode || '',
    versionDescription: m.versions?.[0]?.description || '',
  }
}

/** 指标 Mock 原始数据 - 首批核心指标（语义契约在 METRIC_SEMANTICS 中单独维护） */
const RAW_METRICS_DATA: MetricItem[] = [
  {
    id: 'm001',
    name: '授信通过率',
    code: 'CREDIT_PASS_RATE',
    type: 'business',
    domain: '业务域',
    scenario: '信贷业务',
    businessOwner: '张三',
    technicalOwner: '刘八',
    businessDefinition: '<p><strong>授信通过率</strong> = 授信通过笔数 / 授信申请笔数 × 100%</p><p>口径说明：按自然人去重，取最新审批结果，排除测试用户和内部员工。</p>',
    useCase: '用于监控信贷业务整体审批通过情况，是风控策略调整的核心参考指标',
    calculationFrequency: 'T+1',
    technicalDefinition: "WITH base AS (\n  SELECT apply_id, customer_id, result, decision_time,\n    ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY decision_time DESC) AS rn\n  FROM a_credit_apply_detail\n  WHERE data_dt = ${date}\n)\nSELECT\n  COUNT(CASE WHEN result = 'PASS' THEN 1 END) * 100.0 / COUNT(*) AS pass_rate\nFROM base WHERE rn = 1",
    technicalUsageNotes: 'date参数格式为yyyyMMdd，需在T+1日上午8点前完成数据加载',
    reportLocations: [
      { name: '信贷日报', url: '/reports/credit/daily' },
      { name: '风控月报', url: '/reports/risk/monthly' },
    ],
    resultTable: 'adm.ads_credit_core_metrics',
    queryCode: "SELECT pass_rate FROM adm.ads_credit_core_metrics WHERE dt = ${date}",
    status: 'active',
    currentVersion: 3,
    versions: [
      { version: 3, status: 'active', description: '增加去重逻辑，排除内部员工', createdAt: '2026-08-15 10:30:00', createdBy: '张三', snapshot: snapshot({}) },
      { version: 2, status: 'archived', description: '优化统计逻辑，排除测试账号', createdAt: '2026-07-01 14:20:00', createdBy: '张三', snapshot: snapshot({}) },
      { version: 1, status: 'archived', description: '指标创建', createdAt: '2026-06-01 09:00:00', createdBy: '张三', snapshot: snapshot({}) },
    ],
    createdAt: '2026-06-01 09:00:00',
    updatedAt: '2026-08-15 10:30:00',
    createdBy: '张三',
    isFavorite: true,
    isSubscribed: true,
    sortOrder: 1,
  },
  {
    id: 'm002',
    name: '首期逾期率',
    code: 'FPD30_RATE',
    type: 'business',
    domain: '业务域',
    scenario: '风控管理',
    businessOwner: '李四',
    technicalOwner: '刘八',
    businessDefinition: '<p><strong>首期逾期率（FPD30）</strong> = 首期逾期30天以上客户数 / 当期放款客户数 × 100%</p><p>口径说明：按放款月份统计，含M1+逾期，不含核销账户。</p>',
    useCase: '衡量信贷资产早期风险，是Vintage分析和风控策略优化的核心指标',
    calculationFrequency: 'T+2',
    technicalDefinition: "WITH loan AS (\n  SELECT customer_id, loan_date, loan_amount\n  FROM dwd.loan_detail\n  WHERE loan_date BETWEEN ${start} AND ${end}\n),\noverdue AS (\n  SELECT customer_id\n  FROM dwd.repayment_detail\n  WHERE overdue_days >= 30\n  AND loan_date BETWEEN ${start} AND ${end}\n)\nSELECT\n  COUNT(DISTINCT o.customer_id) * 100.0 / COUNT(DISTINCT l.customer_id) AS fpd30_rate\nFROM loan l\nLEFT JOIN overdue o ON l.customer_id = o.customer_id",
    technicalUsageNotes: 'start/end参数为放款月份起止日期，FPD30需在放款30天后统计',
    reportLocations: [
      { name: '风控月报', url: '/reports/risk/monthly' },
    ],
    resultTable: 'adm.ads_risk_core_metrics',
    queryCode: "SELECT fpd30_rate FROM adm.ads_risk_core_metrics WHERE loan_month = ${month}",
    status: 'active',
    currentVersion: 2,
    versions: [
      { version: 2, status: 'active', description: '排除核销账户', createdAt: '2026-08-01 11:00:00', createdBy: '李四', snapshot: snapshot({}) },
      { version: 1, status: 'archived', description: '指标创建', createdAt: '2026-06-15 09:00:00', createdBy: '李四', snapshot: snapshot({}) },
    ],
    createdAt: '2026-06-15 09:00:00',
    updatedAt: '2026-08-01 11:00:00',
    createdBy: '李四',
    isFavorite: false,
    isSubscribed: true,
    sortOrder: 2,
  },
  {
    id: 'm003',
    name: '日活跃用户数',
    code: 'DAU',
    type: 'business',
    domain: '业务域',
    scenario: '用户运营',
    businessOwner: '陈七',
    technicalOwner: '周九',
    businessDefinition: '<p><strong>日活跃用户数（DAU）</strong> = 当日登录或使用核心功能的去重用户数</p><p>口径说明：去除测试账号与机器人，核心功能定义参见功能白名单。</p>',
    useCase: '监控产品日常活跃情况，是产品健康度的重要指标',
    calculationFrequency: 'T+1',
    technicalDefinition: "SELECT dt, COUNT(DISTINCT user_id) AS dau\nFROM dwd.user_login_detail\nWHERE dt = ${date}\n  AND user_id NOT IN (SELECT user_id FROM dim.test_account)\nGROUP BY dt",
    technicalUsageNotes: 'date参数格式为yyyyMMdd',
    reportLocations: [
      { name: '运营日报', url: '/reports/ops/daily' },
      { name: '产品月报', url: '/reports/product/monthly' },
    ],
    resultTable: 'adm.ads_user_core_metrics',
    queryCode: "SELECT dau FROM adm.ads_user_core_metrics WHERE dt = ${date}",
    status: 'active',
    currentVersion: 2,
    versions: [
      { version: 2, status: 'active', description: '优化统计逻辑，排除测试账号', createdAt: '2026-07-15 14:20:00', createdBy: '陈七', snapshot: snapshot({}) },
      { version: 1, status: 'archived', description: '指标创建', createdAt: '2026-06-01 09:00:00', createdBy: '陈七', snapshot: snapshot({}) },
    ],
    createdAt: '2026-06-01 09:00:00',
    updatedAt: '2026-07-15 14:20:00',
    createdBy: '陈七',
    isFavorite: true,
    isSubscribed: false,
    sortOrder: 3,
  },
  {
    id: 'm004',
    name: '贷款余额',
    code: 'LOAN_BALANCE',
    type: 'business',
    domain: '业务域',
    scenario: '信贷业务',
    businessOwner: '王五',
    technicalOwner: '刘八',
    businessDefinition: '<p><strong>贷款余额</strong> = SUM(未结清贷款本金)</p><p>口径说明：含所有在贷产品，不含已结清和核销部分。</p>',
    useCase: '反映信贷资产规模，是资产负债管理的核心指标',
    calculationFrequency: 'T+1',
    technicalDefinition: "SELECT\n  SUM(remaining_principal) AS loan_balance\nFROM dwd.loan_detail\nWHERE status IN ('ACTIVE', 'OVERDUE')\n  AND data_dt = ${date}",
    technicalUsageNotes: '',
    reportLocations: [
      { name: '信贷日报', url: '/reports/credit/daily' },
      { name: '资产负债月报', url: '/reports/asset/monthly' },
    ],
    resultTable: 'adm.ads_credit_core_metrics',
    queryCode: "SELECT loan_balance FROM adm.ads_credit_core_metrics WHERE dt = ${date}",
    status: 'active',
    currentVersion: 1,
    versions: [
      { version: 1, status: 'active', description: '指标创建', createdAt: '2026-06-10 09:00:00', createdBy: '王五', snapshot: snapshot({}) },
    ],
    createdAt: '2026-06-10 09:00:00',
    updatedAt: '2026-06-10 09:00:00',
    createdBy: '王五',
    isFavorite: false,
    isSubscribed: false,
    sortOrder: 4,
  },
  {
    id: 'm005',
    name: '不良贷款率',
    code: 'NPL_RATIO',
    type: 'regulatory',
    domain: '监管域',
    scenario: '银保监会',
    businessOwner: '吴十',
    technicalOwner: '周九',
    businessDefinition: '<p><strong>不良贷款率</strong> = 不良贷款余额 / 各项贷款余额 × 100%</p><p>口径说明：不良贷款包括次级、可疑、损失类贷款。按银保监会G01报表口径统计。</p>',
    useCase: '监管报送G01报表核心指标，反映资产质量',
    calculationFrequency: 'monthly',
    technicalDefinition: "SELECT\n  SUM(CASE WHEN risk_level IN ('SUBSTANDARD','DOUBTFUL','LOSS') THEN remaining_principal ELSE 0 END) * 100.0\n  / SUM(remaining_principal) AS npl_ratio\nFROM dwd.loan_detail\nWHERE status IN ('ACTIVE', 'OVERDUE', 'IMPAIRED')\n  AND data_dt = ${date}",
    technicalUsageNotes: '按月统计，数据截止日为月末，需在次月5日前完成报送',
    reportLocations: [
      { name: 'G01报表', url: '/reports/regulatory/G01' },
      { name: '资产质量季报', url: '/reports/asset/quarterly' },
    ],
    resultTable: 'adm.ads_regulatory_metrics',
    queryCode: "SELECT npl_ratio FROM adm.ads_regulatory_metrics WHERE report_month = ${month}",
    status: 'active',
    currentVersion: 2,
    versions: [
      { version: 2, status: 'active', description: '对齐银保监会最新报表口径', createdAt: '2026-07-20 10:00:00', createdBy: '吴十', snapshot: snapshot({}) },
      { version: 1, status: 'archived', description: '指标创建', createdAt: '2026-06-05 09:00:00', createdBy: '吴十', snapshot: snapshot({}) },
    ],
    createdAt: '2026-06-05 09:00:00',
    updatedAt: '2026-07-20 10:00:00',
    createdBy: '吴十',
    isFavorite: true,
    isSubscribed: true,
    sortOrder: 5,
  },
  {
    id: 'm006',
    name: '资本充足率',
    code: 'CAR',
    type: 'regulatory',
    domain: '监管域',
    scenario: '人行报送',
    businessOwner: '吴十',
    technicalOwner: '周九',
    businessDefinition: '<p><strong>资本充足率</strong> = (资本净额 - 扣减项) / 风险加权资产 × 100%</p><p>口径说明：按照《商业银行资本管理办法》计算，含一级资本和二级资本。</p>',
    useCase: '人行监管报送核心指标，衡量银行抵御风险能力',
    calculationFrequency: 'monthly',
    technicalDefinition: "SELECT\n  (capital_net - deductions) * 100.0 / risk_weighted_assets AS car\nFROM dwd.capital_adequacy\nWHERE report_month = ${month}",
    technicalUsageNotes: '资本净额含核心一级资本、其他一级资本、二级资本',
    reportLocations: [
      { name: '资本充足率月报', url: '/reports/regulatory/CAR' },
    ],
    resultTable: 'adm.ads_regulatory_metrics',
    queryCode: "SELECT car FROM adm.ads_regulatory_metrics WHERE report_month = ${month}",
    status: 'active',
    currentVersion: 1,
    versions: [
      { version: 1, status: 'active', description: '指标创建', createdAt: '2026-06-08 09:00:00', createdBy: '吴十', snapshot: snapshot({}) },
    ],
    createdAt: '2026-06-08 09:00:00',
    updatedAt: '2026-06-08 09:00:00',
    createdBy: '吴十',
    isFavorite: false,
    isSubscribed: true,
    sortOrder: 6,
  },
  {
    id: 'm007',
    name: '客户获取成本',
    code: 'CAC',
    type: 'business',
    domain: '业务域',
    scenario: '营销活动',
    businessOwner: '陈七',
    technicalOwner: '周九',
    businessDefinition: '<p><strong>客户获取成本（CAC）</strong> = 营销总投入 / 新获取客户数</p><p>口径说明：营销投入含广告费、渠道费、活动费，新获取客户指首次完成开户的有效用户。</p>',
    useCase: '衡量营销效率，优化渠道投放策略',
    calculationFrequency: 'weekly',
    technicalDefinition: "WITH cost AS (\n  SELECT SUM(amount) AS total_cost\n  FROM dwd.marketing_cost_detail\n  WHERE cost_date BETWEEN ${start} AND ${end}\n),\nacquired AS (\n  SELECT COUNT(DISTINCT customer_id) AS new_customers\n  FROM dwd.customer_register\n  WHERE register_date BETWEEN ${start} AND ${end}\n    AND status = 'ACTIVE'\n)\nSELECT c.total_cost / NULLIF(a.new_customers, 0) AS cac\nFROM cost c CROSS JOIN acquired a",
    technicalUsageNotes: 'start/end参数为统计周期起止日期',
    reportLocations: [
      { name: '营销周报', url: '/reports/marketing/weekly' },
    ],
    resultTable: 'adm.ads_marketing_metrics',
    queryCode: "SELECT cac FROM adm.ads_marketing_metrics WHERE week_start = ${start}",
    status: 'active',
    currentVersion: 1,
    versions: [
      { version: 1, status: 'active', description: '指标创建', createdAt: '2026-07-01 09:00:00', createdBy: '陈七', snapshot: snapshot({}) },
    ],
    createdAt: '2026-07-01 09:00:00',
    updatedAt: '2026-07-01 09:00:00',
    createdBy: '陈七',
    isFavorite: false,
    isSubscribed: false,
    sortOrder: 7,
  },
  {
    id: 'm008',
    name: '净息差',
    code: 'NIM',
    type: 'business',
    domain: '业务域',
    scenario: '金融市场',
    businessOwner: '赵六',
    technicalOwner: '刘八',
    businessDefinition: '<p><strong>净息差（NIM）</strong> = (利息收入 - 利息支出) / 平均生息资产余额 × 100%</p><p>口径说明：生息资产包括贷款、债券投资、同业资产等。</p>',
    useCase: '衡量银行核心盈利能力',
    calculationFrequency: 'monthly',
    technicalDefinition: "SELECT\n  (interest_income - interest_expense) * 100.0\n  / AVG(interest_earning_assets) AS nim\nFROM dwd.financial_summary\nWHERE report_month = ${month}",
    technicalUsageNotes: '按月统计，平均余额取月内每日余额的算术平均',
    reportLocations: [
      { name: '财务月报', url: '/reports/finance/monthly' },
    ],
    resultTable: 'adm.ads_finance_metrics',
    queryCode: "SELECT nim FROM adm.ads_finance_metrics WHERE report_month = ${month}",
    status: 'active',
    currentVersion: 1,
    versions: [
      { version: 1, status: 'active', description: '指标创建', createdAt: '2026-06-20 09:00:00', createdBy: '赵六', snapshot: snapshot({}) },
    ],
    createdAt: '2026-06-20 09:00:00',
    updatedAt: '2026-06-20 09:00:00',
    createdBy: '赵六',
    isFavorite: true,
    isSubscribed: false,
    sortOrder: 8,
  },
  {
    id: 'm009',
    name: '拨备覆盖率',
    code: 'PROVISION_COVERAGE',
    type: 'regulatory',
    domain: '监管域',
    scenario: '银保监会',
    businessOwner: '吴十',
    technicalOwner: '周九',
    businessDefinition: '<p><strong>拨备覆盖率</strong> = 贷款损失准备余额 / 不良贷款余额 × 100%</p><p>口径说明：按银保监会监管口径，不良贷款含次级、可疑、损失类。</p>',
    useCase: '监管报送核心指标，反映风险缓释能力',
    calculationFrequency: 'monthly',
    technicalDefinition: "SELECT\n  provision_balance * 100.0 / NULLIF(npl_balance, 0) AS coverage\nFROM dwd.provision_detail\nWHERE report_month = ${month}",
    technicalUsageNotes: '拨备余额含一般准备、专项准备、特种准备',
    reportLocations: [
      { name: 'G01报表', url: '/reports/regulatory/G01' },
    ],
    resultTable: 'adm.ads_regulatory_metrics',
    queryCode: "SELECT provision_coverage FROM adm.ads_regulatory_metrics WHERE report_month = ${month}",
    status: 'active',
    currentVersion: 1,
    versions: [
      { version: 1, status: 'active', description: '指标创建', createdAt: '2026-06-12 09:00:00', createdBy: '吴十', snapshot: snapshot({}) },
    ],
    createdAt: '2026-06-12 09:00:00',
    updatedAt: '2026-06-12 09:00:00',
    createdBy: '吴十',
    isFavorite: false,
    isSubscribed: true,
    sortOrder: 9,
  },
  {
    id: 'm010',
    name: '复贷率',
    code: 'REPEAT_LOAN_RATE',
    type: 'business',
    domain: '业务域',
    scenario: '信贷业务',
    businessOwner: '王五',
    technicalOwner: '刘八',
    businessDefinition: '<p><strong>复贷率</strong> = 统计期内复贷客户数 / 总放款客户数 × 100%</p><p>口径说明：复贷指结清后再次申请贷款的客户，不含续贷和展期。</p>',
    useCase: '衡量客户粘性和产品复购能力',
    calculationFrequency: 'T+2',
    technicalDefinition: "WITH total AS (\n  SELECT COUNT(DISTINCT customer_id) AS cnt\n  FROM dwd.loan_detail\n  WHERE loan_date BETWEEN ${start} AND ${end}\n),\nrepeat AS (\n  SELECT COUNT(DISTINCT customer_id) AS cnt\n  FROM dwd.loan_detail\n  WHERE loan_date BETWEEN ${start} AND ${end}\n    AND customer_id IN (\n      SELECT customer_id FROM dwd.loan_detail\n      WHERE status = 'SETTLED'\n    )\n)\nSELECT r.cnt * 100.0 / NULLIF(t.cnt, 0) AS repeat_rate\nFROM total t CROSS JOIN repeat r",
    technicalUsageNotes: '统计周期建议按月',
    reportLocations: [
      { name: '信贷月报', url: '/reports/credit/monthly' },
    ],
    resultTable: 'adm.ads_credit_core_metrics',
    queryCode: "SELECT repeat_loan_rate FROM adm.ads_credit_core_metrics WHERE dt = ${month}",
    status: 'active',
    currentVersion: 1,
    versions: [
      { version: 1, status: 'active', description: '指标创建', createdAt: '2026-07-10 09:00:00', createdBy: '王五', snapshot: snapshot({}) },
    ],
    createdAt: '2026-07-10 09:00:00',
    updatedAt: '2026-07-10 09:00:00',
    createdBy: '王五',
    isFavorite: false,
    isSubscribed: false,
    sortOrder: 10,
  },
  {
    id: 'm011',
    name: '月活跃用户数',
    code: 'MAU',
    type: 'business',
    domain: '业务域',
    scenario: '用户运营',
    businessOwner: '陈七',
    technicalOwner: '周九',
    businessDefinition: '<p><strong>月活跃用户数（MAU）</strong> = 统计月内有活跃行为的去重用户数</p><p>口径说明：活跃行为含登录、交易、查看等，去除测试账号。</p>',
    useCase: '衡量月度用户规模和粘性',
    calculationFrequency: 'monthly',
    technicalDefinition: "SELECT COUNT(DISTINCT user_id) AS mau\nFROM dwd.user_login_detail\nWHERE dt BETWEEN ${month_start} AND ${month_end}\n  AND user_id NOT IN (SELECT user_id FROM dim.test_account)",
    technicalUsageNotes: 'month_start/month_end为月度起止日期',
    reportLocations: [
      { name: '运营月报', url: '/reports/ops/monthly' },
    ],
    resultTable: 'adm.ads_user_core_metrics',
    queryCode: "SELECT mau FROM adm.ads_user_core_metrics WHERE month = ${month}",
    status: 'active',
    currentVersion: 1,
    versions: [
      { version: 1, status: 'active', description: '指标创建', createdAt: '2026-06-25 09:00:00', createdBy: '陈七', snapshot: snapshot({}) },
    ],
    createdAt: '2026-06-25 09:00:00',
    updatedAt: '2026-06-25 09:00:00',
    createdBy: '陈七',
    isFavorite: true,
    isSubscribed: false,
    sortOrder: 11,
  },
  {
    id: 'm012',
    name: '流动性覆盖率',
    code: 'LCR',
    type: 'regulatory',
    domain: '监管域',
    scenario: '人行报送',
    businessOwner: '赵六',
    technicalOwner: '刘八',
    businessDefinition: '<p><strong>流动性覆盖率（LCR）</strong> = 优质流动性资产 / 未来30天净现金流出 × 100%</p><p>口径说明：按银保监会流动性风险管理办法计算。</p>',
    useCase: '人行监管报送，衡量短期流动性风险抵御能力',
    calculationFrequency: 'T+1',
    technicalDefinition: "SELECT\n  hqla * 100.0 / NULLIF(net_cash_outflow_30d, 0) AS lcr\nFROM dwd.liquidity_detail\nWHERE data_dt = ${date}",
    technicalUsageNotes: 'HQLA含一级资产和二级资产，需按折算率计算',
    reportLocations: [
      { name: '流动性日报', url: '/reports/liquidity/daily' },
    ],
    resultTable: 'adm.ads_regulatory_metrics',
    queryCode: "SELECT lcr FROM adm.ads_regulatory_metrics WHERE dt = ${date}",
    status: 'active',
    currentVersion: 1,
    versions: [
      { version: 1, status: 'active', description: '指标创建', createdAt: '2026-07-05 09:00:00', createdBy: '赵六', snapshot: snapshot({}) },
    ],
    createdAt: '2026-07-05 09:00:00',
    updatedAt: '2026-07-05 09:00:00',
    createdBy: '赵六',
    isFavorite: false,
    isSubscribed: true,
    sortOrder: 12,
  },
  {
    id: 'm013',
    name: '新指标草稿',
    code: 'DRAFT_METRIC_01',
    type: 'business',
    domain: '业务域',
    scenario: '渠道运营',
    businessOwner: '陈七',
    technicalOwner: '周九',
    businessDefinition: '<p>渠道转化率草稿定义</p>',
    useCase: '',
    calculationFrequency: 'T+1',
    technicalDefinition: 'SELECT channel, COUNT(DISTINCT user_id) AS conversions FROM dwd.channel_log WHERE dt = ${date} GROUP BY channel',
    technicalUsageNotes: '',
    reportLocations: [],
    resultTable: '',
    queryCode: '',
    status: 'draft',
    currentVersion: 2,
    versions: [
      { version: 2, status: 'draft', description: '新增版本', createdAt: '2026-09-01 10:00:00', createdBy: '陈七', snapshot: snapshot({}) },
      { version: 1, status: 'active', description: '指标创建', createdAt: '2026-08-20 09:00:00', createdBy: '陈七', snapshot: snapshot({}) },
    ],
    createdAt: '2026-08-20 09:00:00',
    updatedAt: '2026-09-01 10:00:00',
    createdBy: '陈七',
    isFavorite: false,
    isSubscribed: false,
    sortOrder: 13,
  },
  {
    id: 'm014',
    name: '已归档指标示例',
    code: 'ARCHIVED_METRIC_01',
    type: 'business',
    domain: '业务域',
    scenario: '交易分析',
    businessOwner: '王五',
    technicalOwner: '刘八',
    businessDefinition: '<p>已归档的交易量指标</p>',
    useCase: '已废弃，不再使用',
    calculationFrequency: 'T+1',
    technicalDefinition: 'SELECT COUNT(*) AS tx_count FROM dwd.transaction_detail WHERE dt = ${date}',
    technicalUsageNotes: '',
    reportLocations: [],
    resultTable: 'adm.ads_transaction_metrics',
    queryCode: 'SELECT tx_count FROM adm.ads_transaction_metrics WHERE dt = ${date}',
    status: 'archived',
    currentVersion: 1,
    versions: [
      { version: 1, status: 'archived', description: '指标创建后归档', createdAt: '2026-05-01 09:00:00', createdBy: '王五', snapshot: snapshot({}) },
    ],
    createdAt: '2026-05-01 09:00:00',
    updatedAt: '2026-05-01 09:00:00',
    createdBy: '王五',
    isFavorite: false,
    isSubscribed: false,
    sortOrder: 14,
  },
  {
    id: 'm015',
    name: '渠道ROI',
    code: 'CHANNEL_ROI',
    type: 'business',
    domain: '业务域',
    scenario: '营销活动',
    businessOwner: '陈七',
    technicalOwner: '周九',
    businessDefinition: '<p><strong>渠道ROI</strong> = 渠道GMV / 渠道投入成本</p><p>口径说明：按渠道维度统计，含自然量和付费渠道。</p>',
    useCase: '评估各渠道投放效率',
    calculationFrequency: 'monthly',
    technicalDefinition: "SELECT\n  channel,\n  SUM(gmv) / NULLIF(SUM(cost), 0) AS roi\nFROM dwd.channel_summary\nWHERE report_month = ${month}\nGROUP BY channel",
    technicalUsageNotes: 'GMV统计含已完成订单',
    reportLocations: [
      { name: '营销月报', url: '/reports/marketing/monthly' },
    ],
    resultTable: 'adm.ads_marketing_metrics',
    queryCode: "SELECT channel, roi FROM adm.ads_marketing_metrics WHERE month = ${month}",
    status: 'active',
    currentVersion: 1,
    versions: [
      { version: 1, status: 'active', description: '指标创建', createdAt: '2026-07-15 09:00:00', createdBy: '陈七', snapshot: snapshot({}) },
    ],
    createdAt: '2026-07-15 09:00:00',
    updatedAt: '2026-07-15 09:00:00',
    createdBy: '陈七',
    isFavorite: true,
    isSubscribed: false,
    sortOrder: 15,
  },
]

/** 合并语义契约后的指标数据：携带 Agent 字段、结构化字段、报表挂载（reportLocations 由挂载派生） */
export const METRICS_DATA: MetricItem[] = applySemantics(RAW_METRICS_DATA)

/** 指标树结构（按指标域→归属场景两级分类） */
export function buildMetricTree(metrics: MetricItem[]): MetricTreeNode[] {
  const tree: MetricTreeNode[] = []
  const domainMap = new Map<string, Map<string, MetricTreeNode>>()

  for (const m of metrics) {
    if (m.status === 'archived') continue

    if (!domainMap.has(m.domain)) {
      domainMap.set(m.domain, new Map())
      tree.push({
        key: `domain-${m.domain}`,
        title: m.domain,
        domain: m.domain,
        children: [],
      })
    }

    const scenarioMap = domainMap.get(m.domain)!
    if (!scenarioMap.has(m.scenario)) {
      const domainNode = tree.find(t => t.domain === m.domain)!
      domainNode.children!.push({
        key: `scenario-${m.domain}-${m.scenario}`,
        title: m.scenario,
        domain: m.domain,
        scenario: m.scenario,
      })
      scenarioMap.set(m.scenario, domainNode.children![domainNode.children!.length - 1])
    }
  }

  return tree
}

/**
 * 指标取值 Mock（key = 指标编码）
 * 模拟从「结果表」按当前启用版本查得的数据，看板与详情页共用同一份取值
 */
export const METRIC_VALUES: Record<string, MetricValueSeries> = {
  CREDIT_PASS_RATE: {
    version: 3,
    unit: '%',
    trend: 1.8,
    mom: 1.8,
    yoy: -2.6,
    points: [
      { period: '2026-03', value: 62.4 },
      { period: '2026-04', value: 63.1 },
      { period: '2026-05', value: 64.8 },
      { period: '2026-06', value: 65.2 },
      { period: '2026-07', value: 66.9 },
      { period: '2026-08', value: 68.1 },
    ],
    breakdown: [
      { name: '自主申请', value: 71.2 },
      { name: '渠道推荐', value: 64.5 },
      { name: '存量复借', value: 78.9 },
    ],
  },
  FPD30_RATE: {
    version: 2,
    unit: '%',
    trend: -0.12,
    mom: -0.12,
    yoy: -0.35,
    points: [
      { period: '2026-03', value: 2.85 },
      { period: '2026-04', value: 2.72 },
      { period: '2026-05', value: 2.6 },
      { period: '2026-06', value: 2.48 },
      { period: '2026-07', value: 2.36 },
      { period: '2026-08', value: 2.24 },
    ],
    breakdown: [
      { name: '北京', value: 1.9 },
      { name: '上海', value: 2.1 },
      { name: '广州', value: 2.6 },
      { name: '成都', value: 3.1 },
    ],
  },
  DAU: {
    version: 1,
    unit: '万人',
    trend: 4.6,
    mom: 4.6,
    yoy: 18.2,
    points: [
      { period: '2026-03', value: 86 },
      { period: '2026-04', value: 90 },
      { period: '2026-05', value: 95 },
      { period: '2026-06', value: 99 },
      { period: '2026-07', value: 104 },
      { period: '2026-08', value: 109 },
    ],
  },
  LOAN_BALANCE: {
    version: 1,
    unit: '亿元',
    trend: 2.3,
    mom: 1.6,
    yoy: 12.8,
    points: [
      { period: '2026-03', value: 1150 },
      { period: '2026-04', value: 1180 },
      { period: '2026-05', value: 1200 },
      { period: '2026-06', value: 1215 },
      { period: '2026-07', value: 1238 },
      { period: '2026-08', value: 1258 },
    ],
  },
  NPL_RATIO: {
    version: 2,
    unit: '%',
    trend: -0.05,
    mom: -2.05,
    yoy: -10.1,
    points: [
      { period: '2026-03', value: 1.58 },
      { period: '2026-04', value: 1.54 },
      { period: '2026-05', value: 1.5 },
      { period: '2026-06', value: 1.47 },
      { period: '2026-07', value: 1.45 },
      { period: '2026-08', value: 1.42 },
    ],
    breakdown: [
      { name: '正常类', value: 96.5 },
      { name: '关注类', value: 2.1 },
      { name: '次级类', value: 0.8 },
      { name: '可疑类', value: 0.4 },
      { name: '损失类', value: 0.2 },
    ],
    threshold: 5,
  },
  CAR: {
    version: 1,
    unit: '%',
    trend: 0.15,
    mom: 1.1,
    yoy: 4.2,
    points: [
      { period: '2026-03', value: 13.2 },
      { period: '2026-04', value: 13.35 },
      { period: '2026-05', value: 13.5 },
      { period: '2026-06', value: 13.6 },
      { period: '2026-07', value: 13.72 },
      { period: '2026-08', value: 13.85 },
    ],
    threshold: 10.5,
  },
  CAC: {
    version: 1,
    unit: '元',
    trend: -5.2,
    mom: -5.2,
    yoy: -12.6,
    points: [
      { period: '2026-03', value: 128 },
      { period: '2026-04', value: 122 },
      { period: '2026-05', value: 118 },
      { period: '2026-06', value: 112 },
      { period: '2026-07', value: 106 },
      { period: '2026-08', value: 101 },
    ],
    breakdown: [
      { name: '信息流投放', value: 138 },
      { name: '应用商店', value: 92 },
      { name: '老带新', value: 46 },
    ],
  },
  NIM: {
    version: 2,
    unit: '%',
    trend: 0.06,
    mom: 0.55,
    yoy: 1.8,
    points: [
      { period: '2026-03', value: 2.42 },
      { period: '2026-04', value: 2.44 },
      { period: '2026-05', value: 2.47 },
      { period: '2026-06', value: 2.49 },
      { period: '2026-07', value: 2.51 },
      { period: '2026-08', value: 2.54 },
    ],
  },
  PROVISION_COVERAGE: {
    version: 1,
    unit: '%',
    trend: 1.5,
    mom: 0.6,
    yoy: 5.8,
    points: [
      { period: '2026-03', value: 178 },
      { period: '2026-04', value: 180 },
      { period: '2026-05', value: 181.5 },
      { period: '2026-06', value: 183 },
      { period: '2026-07', value: 184.2 },
      { period: '2026-08', value: 185.3 },
    ],
    threshold: 150,
  },
  REPEAT_LOAN_RATE: {
    version: 1,
    unit: '%',
    trend: 2.1,
    mom: 2.1,
    yoy: 7.4,
    points: [
      { period: '2026-03', value: 34.2 },
      { period: '2026-04', value: 35.6 },
      { period: '2026-05', value: 36.1 },
      { period: '2026-06', value: 37.4 },
      { period: '2026-07', value: 38.2 },
      { period: '2026-08', value: 39.5 },
    ],
  },
  MAU: {
    version: 1,
    unit: '万人',
    trend: 3.8,
    mom: 3.8,
    yoy: 15.6,
    points: [
      { period: '2026-03', value: 420 },
      { period: '2026-04', value: 435 },
      { period: '2026-05', value: 448 },
      { period: '2026-06', value: 462 },
      { period: '2026-07', value: 479 },
      { period: '2026-08', value: 497 },
    ],
  },
  LCR: {
    version: 1,
    unit: '%',
    trend: 3.2,
    mom: 1.34,
    yoy: 6.9,
    points: [
      { period: '2026-03', value: 121 },
      { period: '2026-04', value: 123 },
      { period: '2026-05', value: 124.5 },
      { period: '2026-06', value: 125 },
      { period: '2026-07', value: 126.8 },
      { period: '2026-08', value: 128.5 },
    ],
    threshold: 100,
  },
  CHANNEL_ROI: {
    version: 1,
    unit: '',
    trend: 0.18,
    mom: 6.4,
    yoy: 11.2,
    points: [
      { period: '2026-03', value: 2.6 },
      { period: '2026-04', value: 2.71 },
      { period: '2026-05', value: 2.8 },
      { period: '2026-06', value: 2.9 },
      { period: '2026-07', value: 2.98 },
      { period: '2026-08', value: 3.06 },
    ],
    breakdown: [
      { name: '老带新', value: 4.2 },
      { name: '应用商店', value: 3.1 },
      { name: '信息流投放', value: 2.2 },
    ],
  },
}

/**
 * 分支看板配置（驾驶舱弱化后的预置看板）
 * 卡片只声明引用哪个指标编码，口径与数值一律由 MetricsCenterStore 解析
 */
export const DASHBOARD_BOARDS: DashboardBoardConfig[] = [
  {
    id: 'board-finance',
    title: '金融市场分支看板',
    subtitle: '面向金融市场部管理层 · 数据来源于指标中心统一定义',
    audience: '金融市场部',
    kpis: [
      { key: 'kpi-loan', title: '贷款余额', chartType: 'kpi', metricCode: 'LOAN_BALANCE', pinnedVersions: { LOAN_BALANCE: 1 } },
      { key: 'kpi-car', title: '资本充足率', chartType: 'kpi', metricCode: 'CAR', pinnedVersions: { CAR: 1 } },
      { key: 'kpi-npl', title: '不良贷款率', chartType: 'kpi', metricCode: 'NPL_RATIO', pinnedVersions: { NPL_RATIO: 1 } },
      { key: 'kpi-lcr', title: '流动性覆盖率', chartType: 'kpi', metricCode: 'LCR', pinnedVersions: { LCR: 1 } },
    ],
    charts: [
      { key: 'chart-loan-trend', title: '贷款余额趋势', chartType: 'line', metricCode: 'LOAN_BALANCE', pinnedVersions: { LOAN_BALANCE: 1 } },
      { key: 'chart-asset-quality', title: '资产质量分布', chartType: 'pie', metricCode: 'NPL_RATIO', pinnedVersions: { NPL_RATIO: 1 } },
      {
        key: 'chart-regulatory',
        title: '监管指标达标情况',
        chartType: 'bar',
        metricCodes: ['CAR', 'NPL_RATIO', 'PROVISION_COVERAGE', 'LCR'],
        pinnedVersions: { CAR: 1, NPL_RATIO: 1, PROVISION_COVERAGE: 1, LCR: 1 },
      },
    ],
  },
]
