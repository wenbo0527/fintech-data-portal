import type { VariableSourceType } from '@/modules/variable-hub/mock/variable-management/variables'
import { VariableStatusStore } from '@/modules/variable-hub/mock/variable-management/variable-status-store'
import {
  issueSummary,
  validateRunOutput,
  type ContractIssue
} from '@/modules/variable-hub/mock/task-center/io-contract'

export type EvaluationTaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'scheduled'
export type EvaluationTaskType = 'access' | 'recheck' | 'comparison' | 'routine'
export type EvaluationTaskSourceType = 'variable_batch' | 'topic'
export type EvaluationReportKind = 'internal' | 'external' | 'python'
export type ScheduleFrequency = 'daily' | 'weekly' | 'monthly' | 'manual'
/** 执行实例状态 */
export type RunInstanceStatus = 'running' | 'success' | 'partial' | 'failed' | 'skipped'
/** 执行触发方式：调度自动 / 手动立即执行 / 失败重试 */
export type RunTrigger = 'schedule' | 'manual' | 'retry'

export interface PythonScriptVersion {
  /** 版本号，从 1 递增 */
  version: number
  /** 该版本的脚本内容 */
  content: string
  /** 变更说明 */
  changeLog: string
  /** 依赖包快照 */
  dependencies?: string[]
  /** 创建人 */
  createdBy: string
  /** 创建时间 */
  createdAt: string
}

export interface PythonScriptConfig {
  id: string
  name: string
  /** 脚本路径，如 python-reports/processors/data_processor.py */
  path: string
  /** 脚本内容（当前生效版本，与 versions[currentVersion-1] 一致） */
  content: string
  /** 脚本类型：processor（数据处理）/ visualizer（图表生成） */
  type: 'processor' | 'visualizer' | 'combined'
  /** 依赖包列表 */
  dependencies?: string[]
  /** 脚本描述 */
  description?: string
  /**
   * 输入契约：本脚本需要哪些字段才能跑（key 取 io-contract 的字段字典）
   * 与保存时的校验共用，缺省视为未声明，不阻断旧数据
   */
  requires?: string[]
  /** 输出契约：本脚本能产出哪些字段，任务契约的必产字段必须被它覆盖 */
  provides?: string[]
  /** 标签 */
  tags?: string[]
  /** 状态：启用 / 已归档 */
  status?: 'active' | 'archived'
  /** 当前生效版本号 */
  currentVersion: number
  /** 历史版本列表（按版本倒序，最新的在前） */
  versions: PythonScriptVersion[]
  /** 创建时间 */
  createdAt: string
  /** 创建人 */
  createdBy: string
  /** 上次修改时间 */
  updatedAt: string
  /** 修改人 */
  updatedBy: string
}

export interface RoutineScheduleConfig {
  /** 调度频率 */
  frequency: ScheduleFrequency
  /** 调度时间，如 '06:30'、'每周一 08:00' */
  scheduleTime: string
  /** 是否启用 */
  enabled: boolean
  /** 下次执行时间 */
  nextRunAt?: string
  /** 上次执行时间 */
  lastRunAt?: string
  /** 上次执行结果 */
  lastRunResult?: 'success' | 'failed' | 'partial'
}

export interface EvaluationTaskTarget {
  id: string
  name: string
  code?: string
  sourceType?: VariableSourceType
  dataSourceName?: string
}

/**
 * 任务内引用脚本的轻量快照（不存完整 versions/content，通过 id 到脚本库取）
 */
export interface PythonScriptRef {
  id: string
  name: string
  path: string
  type: PythonScriptConfig['type']
  currentVersion?: number
  updatedAt?: string
  updatedBy?: string
  content?: string
  /** 契约声明快照：列表与详情不用回查脚本库就能说清口径覆盖面 */
  requires?: string[]
  provides?: string[]
}

export interface EvaluationTaskReport {
  id: string
  kind: EvaluationReportKind
  name: string
  variableId?: string
  variableName?: string
  sourceType?: VariableSourceType
  generatedAt: string
  /**
   * 报告跳转/查看入口
   * - external 报告：指向外数评估系统 risk-app 的评估报告 URL
   * - internal 报告：指向 dmt-app 内部报告预览（preview key 用于报告抽屉）
   * - python 报告：指向生成该报告的脚本详情页
   */
  url: string
  summary: string
  /** python 报告：产出该报告的脚本 id */
  scriptId?: string
  /** python 报告：产出时使用的脚本版本 */
  scriptVersion?: number
}

export interface EvaluationTaskMock {
  id: string
  name: string
  taskType: EvaluationTaskType
  status: EvaluationTaskStatus
  sourceType: EvaluationTaskSourceType
  sourceIds: string[]
  sourceNames: string[]
  dataSourceId?: string
  dataSourceName?: string
  variableTypeId?: string
  variableTypeName?: string
  owner: string
  description: string
  createdAt: string
  updatedAt: string
  startedAt?: string
  finishedAt?: string
  targets: EvaluationTaskTarget[]
  metrics?: {
    coverage?: number
    iv?: number
    ks?: number
    passRate?: number
    quality?: number
  }
  resultSummary?: string
  reports: EvaluationTaskReport[]
  /** 常态性评估专属配置 */
  routineConfig?: RoutineScheduleConfig
  /** 关联的 Python 脚本（轻量引用） */
  pythonScripts?: PythonScriptRef[]
  /** Python 脚本执行结果（图表路径等） */
  pythonOutputs?: {
    chartPaths?: string[]
    statistics?: any
    qualityMetrics?: any
  }
}

/** 本次执行实际使用的脚本口径快照（版本固定，不随脚本库后续升级而变） */
export interface RunScriptSnapshot {
  id: string
  name: string
  version: number
}

export interface RunLogEntry {
  time: string
  level: 'info' | 'warn' | 'error'
  message: string
}

/** 单个评估对象在本次执行中的结果 */
export interface RunTargetResult {
  targetId: string
  targetName: string
  status: 'success' | 'failed'
  /** 失败原因或质量摘要 */
  message?: string
  /** 产出的报告 id */
  reportId?: string
}

/**
 * 执行实例：任务每一次跑批都会产生一个实例（常态性任务会有多个）
 * 任务本身只代表配置，执行结果/日志/产出全部挂在实例上
 */
export interface EvaluationRunInstance {
  id: string
  taskId: string
  taskName: string
  taskType: EvaluationTaskType
  /** 该任务下的第 N 次执行，从 1 递增 */
  seq: number
  trigger: RunTrigger
  /** 触发人：调度系统 / 具体用户 */
  triggeredBy: string
  status: RunInstanceStatus
  startedAt: string
  finishedAt?: string
  /** 耗时（毫秒） */
  durationMs?: number
  /** 本次执行锁定Python 脚本口径版本 */
  scripts: RunScriptSnapshot[]
  targetTotal: number
  targetSuccess: number
  targetFailed: number
  /** 本次执行产出的报告（属于该实例，不随任务其他轮次混在一起） */
  producedReports: EvaluationTaskReport[]
  metrics?: EvaluationTaskMock['metrics']
  errorMessage?: string
  logs: RunLogEntry[]
  targetResults: RunTargetResult[]
  /**
   * 执行后产出校验的不符项（契约第三段）：非空就表示本次产出与任务类型契约对不上，
   * 原本 success 的会被降级成 partial，下游回写与展示都要先看它
   */
  contractIssues?: ContractIssue[]
}

const STORAGE_KEY = 'evaluation.tasks.extra'
const BINDING_KEY = 'evaluation.external.binding'
const PYTHON_SCRIPTS_KEY = 'evaluation.python.scripts'
const RUNS_KEY = 'evaluation.runs'

/**
 * 评估执行后写回特征的"外数评估报告 ID"映射
 * 形如：{ VAR-0001: 11, VAR-0002: 12, ... }
 * 在 api/variable-management 中会与特征的 sourceRefs.externalEvaluationId 合并展示
 */
type ExternalBindingMap = Record<string, string | number>

function safeParse(raw: string | null): any {
  if (!raw) {
    return null
  }
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function readExtraTasks(): EvaluationTaskMock[] {
  const data = safeParse(localStorage.getItem(STORAGE_KEY))
  return Array.isArray(data) ? data : []
}

function writeExtraTasks(list: EvaluationTaskMock[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

function readBinding(): ExternalBindingMap {
  const data = safeParse(localStorage.getItem(BINDING_KEY))
  if (data && typeof data === 'object') {
    return data as ExternalBindingMap
  }
  return {}
}

function writeBinding(map: ExternalBindingMap) {
  localStorage.setItem(BINDING_KEY, JSON.stringify(map))
}

function nowFmt() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ')
}

function nextTaskId() {
  const prefix = 'EVAL-2026-'
  const all = [...defaultTasks, ...readExtraTasks()]
  const nums = all
    .map((item) => String(item.id))
    .filter((id) => id.startsWith(prefix))
    .map((id) => Number(id.slice(prefix.length)))
    .filter((n) => !Number.isNaN(n))
  const next = (nums.length ? Math.max(...nums) : 0) + 1
  return `${prefix}${String(next).padStart(3, '0')}`
}

function nextExternalReportId(): number {
  const binding = readBinding()
  const used = Object.values(binding).map((v) => Number(v)).filter((n) => !Number.isNaN(n))
  return (used.length ? Math.max(...used) : 100) + 1
}

// ============ Python 脚本管理 ============
/** 脚本种子类型（未包含版本/创建字段，由 normalizeScript 补全） */
type PythonScriptSeed = Omit<
  PythonScriptConfig,
  'currentVersion' | 'versions' | 'createdAt' | 'createdBy'
> &
  Partial<Pick<PythonScriptConfig, 'currentVersion' | 'versions' | 'createdAt' | 'createdBy'>>

/**
 * 规范化脚本：为缺失版本信息的旧数据自动生成 v1（基于当前 content）
 * 兼容 localStorage 中的历史数据结构
 */
function normalizeScript(input: PythonScriptSeed | PythonScriptConfig): PythonScriptConfig {
  const anyInput = input as any
  if (Array.isArray(anyInput.versions) && anyInput.versions.length > 0) {
    const versions = [...anyInput.versions].sort((a, b) => b.version - a.version)
    const currentVersion = anyInput.currentVersion ?? versions[0].version
    return {
      ...(anyInput as PythonScriptConfig),
      versions,
      currentVersion,
      createdAt: anyInput.createdAt || anyInput.updatedAt,
      createdBy: anyInput.createdBy || anyInput.updatedBy,
      status: anyInput.status || 'active'
    }
  }
  // 旧数据：用当前 content 生成 v1
  const v1: PythonScriptVersion = {
    version: 1,
    content: anyInput.content,
    changeLog: '初始版本',
    dependencies: anyInput.dependencies,
    createdBy: anyInput.updatedBy || '系统内置',
    createdAt: anyInput.updatedAt
  }
  return {
    ...(anyInput as PythonScriptConfig),
    currentVersion: 1,
    versions: [v1],
    createdAt: anyInput.createdAt || anyInput.updatedAt,
    createdBy: anyInput.createdBy || anyInput.updatedBy,
    status: anyInput.status || 'active'
  }
}

function readPythonScripts(): PythonScriptConfig[] {
  const data = safeParse(localStorage.getItem(PYTHON_SCRIPTS_KEY))
  return Array.isArray(data) ? data.map(normalizeScript) : []
}

function writePythonScripts(scripts: PythonScriptConfig[]) {
  localStorage.setItem(PYTHON_SCRIPTS_KEY, JSON.stringify(scripts))
}

/** 行级 diff 行类型 */
export interface ScriptDiffLine {
  type: 'add' | 'del' | 'same'
  text: string
  oldNo?: number
  newNo?: number
}

/**
 * 简单的逐行 diff（基于 LCS），用于版本对比展示
 */
function computeLineDiff(oldText: string, newText: string): ScriptDiffLine[] {
  const a = oldText.split('\n')
  const b = newText.split('\n')
  const m = a.length
  const n = b.length
  // LCS 动态规划
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }
  const result: ScriptDiffLine[] = []
  let i = 0
  let j = 0
  let oldNo = 1
  let newNo = 1
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      result.push({ type: 'same', text: a[i], oldNo: oldNo++, newNo: newNo++ })
      i++; j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      result.push({ type: 'del', text: a[i], oldNo: oldNo++ })
      i++
    } else {
      result.push({ type: 'add', text: b[j], newNo: newNo++ })
      j++
    }
  }
  while (i < m) {
    result.push({ type: 'del', text: a[i], oldNo: oldNo++ })
    i++
  }
  while (j < n) {
    result.push({ type: 'add', text: b[j], newNo: newNo++ })
    j++
  }
  return result
}

function nextScriptId(): string {
  const prefix = 'PY-SCRIPT-'
  const all = [...defaultPythonScripts, ...readPythonScripts()]
  const nums = all
    .map((s) => String(s.id))
    .filter((id) => id.startsWith(prefix))
    .map((id) => Number(id.slice(prefix.length)))
    .filter((n) => !Number.isNaN(n))
  const next = (nums.length ? Math.max(...nums) : 0) + 1
  return `${prefix}${String(next).padStart(3, '0')}`
}

/** 默认 Python 脚本（内置） */
const defaultPythonScripts: PythonScriptSeed[] = [
  {
    id: 'PY-SCRIPT-001',
    name: '数据质量分析器',
    path: 'python-reports/processors/data_processor.py',
    content: `"""\n数据处理器模块\n负责处理样本文件、生成统计数据和质量分析\n"""\n\nimport pandas as pd\nimport numpy as np\nfrom typing import Dict, Any, List, Optional\nfrom pathlib import Path\nimport warnings\n\nwarnings.filterwarnings('ignore')\n\n\nclass DataProcessor:\n    """\n    数据处理器类\n    负责样本数据的读取、清洗、统计和质量分析\n    """\n    \n    def __init__(self):\n        """初始化数据处理器"""\n        self.supported_formats = ['.xlsx', '.csv', '.xls']\n    \n    def process_sample_file(self, file_path: str) -> pd.DataFrame:\n        """处理样本文件"""\n        file_path = Path(file_path)\n        \n        if not file_path.exists():\n            raise FileNotFoundError(f"文件不存在: {file_path}")\n        \n        if file_path.suffix.lower() not in self.supported_formats:\n            raise ValueError(f"不支持的文件格式: {file_path.suffix}")\n        \n        # 读取数据\n        if file_path.suffix.lower() == '.csv':\n            df = pd.read_csv(file_path, encoding='utf-8')\n        else:\n            df = pd.read_excel(file_path)\n        \n        # 数据清洗\n        df = self._clean_data(df)\n        \n        # 数据验证\n        self._validate_data(df)\n        \n        return df\n    \n    def _clean_data(self, df: pd.DataFrame) -> pd.DataFrame:\n        """数据清洗"""\n        # 删除空值较多的列\n        threshold = len(df) * 0.7\n        df = df.dropna(thresh=threshold, axis=1)\n        \n        # 填充缺失值\n        for col in df.columns:\n            if df[col].dtype in ['int64', 'float64']:\n                df[col] = df[col].fillna(0)\n            else:\n                df[col] = df[col].fillna('')\n        \n        # 去除重复行\n        df = df.drop_duplicates()\n        \n        return df\n    \n    def _get_quality_metrics(self, df: pd.DataFrame) -> Dict[str, Any]:\n        """获取数据质量指标"""\n        quality = {\n            "completeness": {},\n            "consistency": {},\n            "accuracy": {}\n        }\n        \n        # 完整性\n        for col in df.columns:\n            null_count = df[col].isnull().sum()\n            completeness = 1 - (null_count / len(df))\n            quality["completeness"][col] = {\n                "null_count": int(null_count),\n                "completeness_rate": float(completeness)\n            }\n        \n        return quality\n    \n    def generate_statistics(self, df: pd.DataFrame) -> Dict[str, Any]:\n        """生成统计数据"""\n        stats = {\n            "basic_info": self._get_basic_info(df),\n            "numeric_stats": self._get_numeric_stats(df),\n            "quality_metrics": self._get_quality_metrics(df),\n        }\n        return stats`,
    type: 'processor',
    dependencies: ['pandas', 'numpy'],
    description: '读取样本/回溯数据，完成清洗、缺失值与异常值检测，输出完整性、一致性、准确性等质量指标。',
    requires: ['variableId', 'variableName', 'sampleRows'],
    provides: ['quality', 'coverage', 'passRate', 'totalRows'],
    tags: ['数据质量', '内数', '通用'],
    updatedAt: '2026-08-01 10:00:00',
    updatedBy: '系统内置'
  },
  {
    id: 'PY-SCRIPT-002',
    name: '评估图表生成器',
    path: 'python-reports/visualizers/chart_generator.py',
    content: `"""\n图表生成器模块\n负责生成各种统计图表和可视化\n"""\n\nimport matplotlib.pyplot as plt\nimport seaborn as sns\nimport pandas as pd\nimport numpy as np\nfrom typing import Dict, Any, List, Optional\nfrom pathlib import Path\n\n# 设置中文字体\nplt.rcParams['font.sans-serif'] = ['SimHei', 'Arial Unicode MS', 'DejaVu Sans']\nplt.rcParams['axes.unicode_minus'] = False\n\n# 设置图表样式\nsns.set_style("whitegrid")\nsns.set_palette("husl")\n\n\nclass ChartGenerator:\n    """\n    图表生成器类\n    负责根据数据生成各种统计图表\n    """\n    \n    def __init__(self, output_dir: str = "charts"):\n        """初始化图表生成器"""\n        self.output_dir = Path(output_dir)\n        self.output_dir.mkdir(exist_ok=True)\n        \n        # 设置图表样式\n        self.colors = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2']\n        self.figsize = (12, 8)\n    \n    def generate_charts(self, \n                       df: pd.DataFrame, \n                       report_type: str,\n                       chart_types: Optional[List[str]] = None) -> Dict[str, Any]:\n        """生成图表集合"""\n        if chart_types is None:\n            chart_types = ['sample_distribution', 'quality_score_distribution']\n        \n        charts = {}\n        \n        for chart_type in chart_types:\n            try:\n                chart_path = self._generate_chart(df, chart_type, report_type)\n                charts[chart_type] = chart_path\n            except Exception as e:\n                print(f"生成图表 {chart_type} 失败: {e}")\n                continue\n        \n        return charts\n    \n    def _create_sample_distribution(self, df: pd.DataFrame, report_type: str) -> str:\n        """创建样本分布图"""\n        fig, axes = plt.subplots(2, 2, figsize=(16, 12))\n        fig.suptitle('样本分布分析', fontsize=16, fontweight='bold')\n        \n        numeric_cols = df.select_dtypes(include=[np.number]).columns\n        if len(numeric_cols) > 0:\n            for i, col in enumerate(numeric_cols[:4]):\n                ax = axes[i//2, i%2]\n                df[col].hist(bins=30, ax=ax, alpha=0.7, color=self.colors[i%len(self.colors)])\n                ax.set_title(f'{col} 分布')\n                ax.set_xlabel('值')\n                ax.set_ylabel('频数')\n        \n        plt.tight_layout()\n        \n        chart_path = self.output_dir / f"sample_distribution_{report_type}.png"\n        plt.savefig(chart_path, dpi=300, bbox_inches='tight')\n        plt.close()\n        \n        return str(chart_path)`,
    type: 'visualizer',
    dependencies: ['matplotlib', 'seaborn', 'pandas', 'numpy'],
    description: '基于分析结果生成样本分布、质量得分分布等统计图表，输出 PNG 供报告引用。',
    requires: ['variableId', 'sampleRows'],
    provides: ['chartPath'],
    tags: ['可视化', '图表', '通用'],
    updatedAt: '2026-08-01 10:00:00',
    updatedBy: '系统内置'
  },
  {
    id: 'PY-SCRIPT-003',
    name: '外数特征效果评估器',
    path: 'python-reports/processors/external_evaluator.py',
    content: `"""\n外数特征效果评估器 v3\n计算 IV / KS / PSI / 缺失率，输出可回写的特征效果指标\n"""\n\nimport pandas as pd\nimport numpy as np\nfrom typing import Dict, Any\n\n\nclass ExternalFeatureEvaluator:\n    """外数特征效果评估器"""\n\n    def __init__(self, bins: int = 10):\n        self.bins = bins\n\n    def calc_missing_rate(self, df: pd.DataFrame, col: str) -> float:\n        return float(df[col].isnull().mean())\n\n    def calc_iv(self, df: pd.DataFrame, col: str, target: str) -> float:\n        """等频分箱后计算 IV"""\n        tmp = df[[col, target]].dropna()\n        if tmp.empty:\n            return 0.0\n        try:\n            tmp['bin'] = pd.qcut(tmp[col], q=self.bins, duplicates='drop')\n        except ValueError:\n            tmp['bin'] = tmp[col]\n        grouped = tmp.groupby('bin', observed=True)[target].agg(['count', 'sum'])\n        total_bad, total_good = grouped['sum'].sum(), (grouped['count'] - grouped['sum']).sum()\n        iv = 0.0\n        for cnt, bad in zip(grouped['count'], grouped['sum']):\n            good = cnt - bad\n            b = max(bad / max(total_bad, 1), 1e-6)\n            g = max(good / max(total_good, 1), 1e-6)\n            iv += (b - g) * np.log(b / g)\n        return float(iv)\n\n    def calc_psi(self, base: pd.Series, cur: pd.Series) -> float:\n        """群体稳定性指数，用于常态性巡检"""\n        qs = np.unique(np.nanquantile(base.dropna(), np.linspace(0, 1, self.bins + 1)))\n        if len(qs) < 2:\n            return 0.0\n        b = pd.cut(base, qs, include_lowest=True).value_counts(normalize=True).sort_index()\n        c = pd.cut(cur, qs, include_lowest=True).value_counts(normalize=True).sort_index()\n        eps = 1e-6\n        return float(((c + eps) / (b + eps) * np.log((c + eps) / (b + eps))).sum())\n\n    def evaluate(self, df: pd.DataFrame, col: str, target: str) -> Dict[str, Any]:\n        return {\n            'feature': col,\n            'missing_rate': round(self.calc_missing_rate(df, col), 4),\n            'iv': round(self.calc_iv(df, col, target), 4),\n        }`,
    type: 'processor',
    dependencies: ['pandas', 'numpy', 'scipy'],
    description: '针对外数特征计算 IV / PSI / 缺失率等效果指标，供常态性评估任务回写特征档案。',
    requires: ['variableId', 'variableName', 'sourceType', 'sampleRows'],
    provides: ['iv', 'ks', 'psi', 'missingRate', 'quality'],
    tags: ['外数', '效果评估', 'IV', 'PSI'],
    updatedAt: '2026-10-20 15:30:00',
    updatedBy: '张敏',
    createdAt: '2026-06-11 09:20:00',
    createdBy: '张敏',
    currentVersion: 3,
    versions: [
      {
        version: 1,
        content: `"""外数特征效果评估器 v1"""\n\nimport pandas as pd\n\n\nclass ExternalFeatureEvaluator:\n    def calc_missing_rate(self, df, col):\n        return float(df[col].isnull().mean())`,
        changeLog: '初始版本：仅支持缺失率计算',
        dependencies: ['pandas'],
        createdBy: '张敏',
        createdAt: '2026-06-11 09:20:00'
      },
      {
        version: 2,
        content: `"""\n外数特征效果评估器 v2\n新增 IV 计算\n"""\n\nimport pandas as pd\nimport numpy as np\n\n\nclass ExternalFeatureEvaluator:\n    def __init__(self, bins: int = 10):\n        self.bins = bins\n\n    def calc_missing_rate(self, df, col):\n        return float(df[col].isnull().mean())\n\n    def calc_iv(self, df, col, target):\n        tmp = df[[col, target]].dropna()\n        tmp['bin'] = pd.qcut(tmp[col], q=self.bins, duplicates='drop')\n        grouped = tmp.groupby('bin')[target].agg(['count', 'sum'])\n        return 0.0`,
        changeLog: '新增 IV 计算（等频分箱）',
        dependencies: ['pandas', 'numpy'],
        createdBy: '张敏',
        createdAt: '2026-08-18 14:05:00'
      },
      {
        version: 3,
        content: `"""\n外数特征效果评估器 v3\n新增 PSI 稳定性指标，修复分箱为空时的异常\n"""\n\nimport pandas as pd\nimport numpy as np\n\n\nclass ExternalFeatureEvaluator:\n    def __init__(self, bins: int = 10):\n        self.bins = bins\n\n    def calc_psi(self, base, cur):\n        qs = np.unique(np.nanquantile(base.dropna(), np.linspace(0, 1, self.bins + 1)))\n        if len(qs) < 2:\n            return 0.0\n        b = pd.cut(base, qs, include_lowest=True).value_counts(normalize=True).sort_index()\n        c = pd.cut(cur, qs, include_lowest=True).value_counts(normalize=True).sort_index()\n        eps = 1e-6\n        return float(((c + eps) / (b + eps) * np.log((c + eps) / (b + eps))).sum())`,
        changeLog: '新增 PSI 稳定性指标；修复空分箱导致的除零异常',
        dependencies: ['pandas', 'numpy', 'scipy'],
        createdBy: '李浩',
        createdAt: '2026-10-20 15:30:00'
      }
    ]
  }
]

const defaultTasks: EvaluationTaskMock[] = [
  {
    id: 'EVAL-2026-001',
    name: '外数准入特征复评',
    taskType: 'recheck',
    status: 'completed',
    sourceType: 'variable_batch',
    sourceIds: ['VAR-0001', 'VAR-0002'],
    sourceNames: ['外数-三要素核验一致性', '外数-手机在网时长'],
    dataSourceId: 'external',
    dataSourceName: '外部数据服务',
    variableTypeId: 'external',
    variableTypeName: '外数特征',
    owner: '李四',
    description: '针对外数特征的命中率、成本收益和 SLA 稳定性进行复评。',
    createdAt: '2026-06-22 10:00:00',
    updatedAt: '2026-06-24 18:20:00',
    startedAt: '2026-06-23 09:00:00',
    finishedAt: '2026-06-24 18:20:00',
    targets: [
      { id: 'VAR-0001', name: '外数-三要素核验一致性', code: 'EXT_VERIFY_3E_MATCH', sourceType: 'external', dataSourceName: '外部数据服务' },
      { id: 'VAR-0002', name: '外数-手机在网时长', code: 'EXT_MOBILE_ONLINE_DAYS', sourceType: 'external', dataSourceName: '外部数据服务' }
    ],
    metrics: {
      coverage: 0.89,
      iv: 0.31,
      ks: 0.27,
      passRate: 0.96
    },
    resultSummary: '通过复评，建议继续保留在线服务，并补充供应商降级预案。',
    reports: [
      {
        id: '11',
        kind: 'external',
        name: '外数评估报告 - 三要素核验一致性',
        variableId: 'VAR-0001',
        variableName: '外数-三要素核验一致性',
        sourceType: 'external',
        generatedAt: '2026-06-24 18:20:00',
        url: '/risk/external-data/evaluation/11',
        summary: '外数评估系统输出：命中 0.93，IV 0.32，KS 0.28，建议保留。'
      },
      {
        id: '12',
        kind: 'external',
        name: '外数评估报告 - 手机在网时长',
        variableId: 'VAR-0002',
        variableName: '外数-手机在网时长',
        sourceType: 'external',
        generatedAt: '2026-06-24 18:20:00',
        url: '/risk/external-data/evaluation/12',
        summary: '外数评估系统输出：命中 0.85，IV 0.29，KS 0.26，建议保留并监控成本。'
      },
      {
        id: 'INT-REPORT-001',
        kind: 'internal',
        name: 'DMT 复评总结报告',
        generatedAt: '2026-06-24 18:20:00',
        url: 'preview:recheck-summary-001',
        summary: 'DMT 复评：通过 2 / 需关注 0 / 不通过 0。'
      }
    ]
  },
  {
    id: 'EVAL-2026-002',
    name: '行为特征候选准入评估',
    taskType: 'access',
    status: 'running',
    sourceType: 'topic',
    sourceIds: ['EXP-2026-001'],
    sourceNames: ['风控_逾期前行为特征_202606'],
    dataSourceId: 'internal',
    dataSourceName: '内数底表',
    variableTypeId: 'behavior',
    variableTypeName: '行为特征',
    owner: '张三',
    description: '对探索课题产出的候选特征做准入评估，验证覆盖率和稳定性。',
    createdAt: '2026-06-25 09:30:00',
    updatedAt: '2026-06-26 10:40:00',
    startedAt: '2026-06-26 10:00:00',
    targets: [
      { id: 'VAR-0003', name: '内数-近30日交易次数', code: 'IN_TXN_CNT_30D', sourceType: 'internal', dataSourceName: '交易明细表' }
    ],
    reports: []
  },
  // ============ 常态性评估任务 ============
  {
    id: 'EVAL-2026-003',
    name: '外数特征每日质量巡检',
    taskType: 'routine',
    status: 'scheduled',
    sourceType: 'variable_batch',
    sourceIds: ['VAR-0001', 'VAR-0002'],
    sourceNames: ['外数-三要素核验一致性', '外数-手机在网时长'],
    dataSourceId: 'external',
    dataSourceName: '外部数据服务',
    variableTypeId: 'external',
    variableTypeName: '外数特征',
    owner: '王五',
    description: '每日定时执行外数特征质量分析，监控数据完整性、一致性和准确性指标。',
    createdAt: '2026-09-01 08:00:00',
    updatedAt: '2026-10-28 06:30:00',
    startedAt: '2026-10-28 06:30:00',
    finishedAt: '2026-10-28 06:35:00',
    targets: [
      { id: 'VAR-0001', name: '外数-三要素核验一致性', code: 'EXT_VERIFY_3E_MATCH', sourceType: 'external', dataSourceName: '外部数据服务' },
      { id: 'VAR-0002', name: '外数-手机在网时长', code: 'EXT_MOBILE_ONLINE_DAYS', sourceType: 'external', dataSourceName: '外部数据服务' }
    ],
    metrics: {
      coverage: 0.95,
      quality: 92,
      passRate: 0.98
    },
    resultSummary: 'Python 脚本自动分析完成：2 个特征质量达标，数据完整性 95%，建议继续监控。',
    reports: [
      {
        id: 'PY-RPT-001',
        kind: 'python',
        name: 'Python 质量分析报告 - 三要素核验一致性',
        variableId: 'VAR-0001',
        variableName: '外数-三要素核验一致性',
        sourceType: 'external',
        generatedAt: '2026-10-28 06:35:00',
        url: '/tasks/scripts/PY-SCRIPT-001',
        scriptId: 'PY-SCRIPT-001',
        scriptVersion: 1,
        summary: '【数据质量分析器 v1】数据完整性 96%，一致性检查通过，无异常值检出。'
      },
      {
        id: 'PY-RPT-002',
        kind: 'python',
        name: 'Python 质量分析报告 - 手机在网时长',
        variableId: 'VAR-0002',
        variableName: '外数-手机在网时长',
        sourceType: 'external',
        generatedAt: '2026-10-28 06:35:00',
        url: '/tasks/scripts/PY-SCRIPT-001',
        scriptId: 'PY-SCRIPT-001',
        scriptVersion: 1,
        summary: '【数据质量分析器 v1】数据完整性 94%，缺失率 6%，在可接受范围内。'
      }
    ],
    routineConfig: {
      frequency: 'daily',
      scheduleTime: '06:30',
      enabled: true,
      nextRunAt: '2026-10-29 06:30:00',
      lastRunAt: '2026-10-28 06:30:00',
      lastRunResult: 'success'
    },
    pythonScripts: [
      { id: 'PY-SCRIPT-001', name: '数据质量分析器', path: 'python-reports/processors/data_processor.py', content: '', type: 'processor', currentVersion: 1, updatedAt: '2026-08-01 10:00:00', updatedBy: '系统内置', requires: ['variableId', 'variableName', 'sampleRows'], provides: ['quality', 'coverage', 'passRate', 'totalRows'] }
    ],
    pythonOutputs: {
      chartPaths: ['/charts/sample_distribution_routine_003.png'],
      statistics: { totalRows: 10000, completeness: 0.95 }
    }
  },
  {
    id: 'EVAL-2026-004',
    name: '内数特征周度效果复核',
    taskType: 'routine',
    status: 'scheduled',
    sourceType: 'variable_batch',
    sourceIds: ['VAR-0003'],
    sourceNames: ['内数-近30日交易次数'],
    dataSourceId: 'internal',
    dataSourceName: '内数底表',
    variableTypeId: 'behavior',
    variableTypeName: '行为特征',
    owner: '赵六',
    description: '每周对内数特征进行效果复核，生成趋势分析图表和 IV/KS 指标报告。',
    createdAt: '2026-09-15 10:00:00',
    updatedAt: '2026-10-27 08:00:00',
    startedAt: '2026-10-27 08:00:00',
    finishedAt: '2026-10-27 08:10:00',
    targets: [
      { id: 'VAR-0003', name: '内数-近30日交易次数', code: 'IN_TXN_CNT_30D', sourceType: 'internal', dataSourceName: '交易明细表' }
    ],
    metrics: {
      coverage: 0.88,
      iv: 0.28,
      ks: 0.24,
      passRate: 0.92
    },
    resultSummary: '周度复核完成：IV 值稳定在 0.28，特征区分度良好，建议继续保持。',
    reports: [
      {
        id: 'PY-RPT-003',
        kind: 'python',
        name: 'Python 效果复核报告 - 内数-近30日交易次数',
        variableId: 'VAR-0003',
        variableName: '内数-近30日交易次数',
        sourceType: 'internal',
        generatedAt: '2026-10-27 08:10:00',
        url: '/tasks/scripts/PY-SCRIPT-003',
        scriptId: 'PY-SCRIPT-003',
        scriptVersion: 2,
        summary: '【外数特征效果评估器 v2】IV 0.28 / KS 0.24，区分度良好。'
      }
    ],
    routineConfig: {
      frequency: 'weekly',
      scheduleTime: '每周一 08:00',
      enabled: true,
      nextRunAt: '2026-11-03 08:00:00',
      lastRunAt: '2026-10-27 08:00:00',
      lastRunResult: 'success'
    },
    pythonScripts: [
      { id: 'PY-SCRIPT-001', name: '数据质量分析器', path: 'python-reports/processors/data_processor.py', content: '', type: 'processor', currentVersion: 1, updatedAt: '2026-08-01 10:00:00', updatedBy: '系统内置', requires: ['variableId', 'variableName', 'sampleRows'], provides: ['quality', 'coverage', 'passRate', 'totalRows'] },
      { id: 'PY-SCRIPT-002', name: '评估图表生成器', path: 'python-reports/visualizers/chart_generator.py', content: '', type: 'visualizer', currentVersion: 1, updatedAt: '2026-08-01 10:00:00', updatedBy: '系统内置', requires: ['variableId', 'sampleRows'], provides: ['chartPath'] },
      // 快照为 v2，而脚本库已升级到 v3：用于演示「非最新口径」提示
      { id: 'PY-SCRIPT-003', name: '外数特征效果评估器', path: 'python-reports/processors/external_evaluator.py', content: '', type: 'processor', currentVersion: 2, updatedAt: '2026-08-18 14:05:00', updatedBy: '张敏', requires: ['variableId', 'variableName', 'sourceType', 'sampleRows'], provides: ['iv', 'ks', 'psi'] }
    ]
  }
]

function upsertExtraTask(task: EvaluationTaskMock) {
  const extra = readExtraTasks()
  const next = [task, ...extra.filter((item) => item.id !== task.id)]
  writeExtraTasks(next)
}

// ============ 执行实例（跑批记录） ============
function readRuns(): EvaluationRunInstance[] {
  const data = safeParse(localStorage.getItem(RUNS_KEY))
  return Array.isArray(data) ? data : []
}

function writeRuns(runs: EvaluationRunInstance[]) {
  localStorage.setItem(RUNS_KEY, JSON.stringify(runs))
}

/** 把 'YYYY-MM-DD HH:mm:ss' 解析为 Date（按本地时间理解，避免时区漂移） */
function parseDate(value: string): Date {
  const [d, t = '00:00:00'] = value.split(' ')
  const [Y, M, D] = d.split('-').map(Number)
  const [h, m, s] = t.split(':').map(Number)
  return new Date(Y, (M || 1) - 1, D || 1, h || 0, m || 0, s || 0)
}

function fmtDate(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())} `
    + `${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`
}

/**
 * 由字符串生成稳定的伪随机序列，保证种子数据在多次刷新间保持一致
 */
function seededRandom(seed: string): () => number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return () => {
    h ^= h << 13
    h ^= h >>> 17
    h ^= h << 5
    return ((h >>> 0) % 100000) / 100000
  }
}

const RUN_COUNT_BY_FREQUENCY: Record<ScheduleFrequency, number> = {
  daily: 8,
  weekly: 4,
  monthly: 3,
  manual: 1
}

const STEP_DAYS: Record<ScheduleFrequency, number> = {
  daily: 1,
  weekly: 7,
  monthly: 30,
  manual: 1
}

/** 触发方式中文标签（日志与列表共用） */
export function triggerLabel(value: RunTrigger): string {
  return value === 'schedule' ? '调度自动触发' : value === 'retry' ? '失败重试' : '手动立即执行'
}

/** 执行实例状态中文标签（partial 文案全域统一成「部分成功」，与 task-kinds / 效果域同口径） */
export function runStatusLabel(value: RunInstanceStatus): string {
  return {
    running: '执行中',
    success: '成功',
    partial: '部分成功',
    failed: '失败',
    skipped: '已跳过'
  }[value] || value
}

/** 执行实例状态对应的 Arco 标签颜色 */
export function runStatusColor(value: RunInstanceStatus): string {
  return {
    running: 'arcoblue',
    success: 'green',
    partial: 'orange',
    failed: 'red',
    skipped: 'gray'
  }[value] || 'gray'
}

/** 毫秒耗时格式化为 m 分 s 秒 */
export function formatDuration(ms?: number): string {
  if (!ms || ms < 0) {
    return '—'
  }
  const totalSec = Math.round(ms / 1000)
  if (totalSec < 60) {return `${totalSec} 秒`}
  return `${Math.floor(totalSec / 60)} 分 ${totalSec % 60} 秒`
}

/**
 * 构造一次执行实例（种子与实时跑批复用同一逻辑）
 */
function buildRunInstance(
  task: EvaluationTaskMock,
  opts: {
    seq: number
    startedAt: string
    status: RunInstanceStatus
    trigger: RunTrigger
    triggeredBy: string
    scripts: RunScriptSnapshot[]
    /** 现场执行时传入真实可用时长，避免把“未来时间”写成结束时间 */
    maxDurationMs?: number
  }
): EvaluationRunInstance {
  const rand = seededRandom(`${task.id}-${opts.seq}-${opts.startedAt}`)
  const simulated = 180000 + Math.round(rand() * 900000)
  const durationMs = opts.maxDurationMs
    ? Math.max(1000, Math.min(simulated, Math.floor(opts.maxDurationMs)))
    : simulated
  const finished = new Date(parseDate(opts.startedAt).getTime() + durationMs)
  const finishedAt = fmtDate(finished)
  const runId = `RUN-${task.id}-${opts.startedAt.replace(/[^0-9]/g, '').slice(0, 12)}`

  // 失败面：整批失败（status=failed）或个别特征失败（status=partial）
  const allFailed = opts.status === 'failed'
  const oneFailed = opts.status === 'partial' ? Math.max(1, Math.ceil(task.targets.length * 0.25)) : 0

  const targetResults: RunTargetResult[] = []
  const producedReports: EvaluationTaskReport[] = []
  const logs: RunLogEntry[] = [
    { time: opts.startedAt, level: 'info', message: `触发方式：${triggerLabel(opts.trigger)}，开始拉取评估对象` },
    { time: opts.startedAt, level: 'info', message: `共 ${task.targets.length} 个特征待处理` }
  ]

  if (opts.scripts.length) {
    opts.scripts.forEach((s) => {
      logs.push({ time: opts.startedAt, level: 'info', message: `加载 Python 脚本口径：${s.name} v${s.version}` })
    })
  } else {
    logs.push({ time: opts.startedAt, level: 'warn', message: '未配置 Python 脚本，使用平台内置评估引擎' })
  }

  const errorMessages = [
    '样本表分区未就绪，读取超时',
    'Python 脚本执行异常：KeyError \'apply_time\'',
    '回溯数据为空，无法计算 IV'
  ]

  task.targets.forEach((target, idx) => {
    const script = opts.scripts.length ? opts.scripts[idx % opts.scripts.length] : undefined
    const reportId = `RPT-${task.id}-${opts.seq}-${idx + 1}`
    const isFailed = allFailed || (idx === oneFailed - 1 && oneFailed > 0)
    const stamp = fmtDate(new Date(parseDate(opts.startedAt).getTime() + (idx + 1) * Math.round(durationMs / (task.targets.length + 1))))

    if (isFailed) {
      const err = errorMessages[Math.floor(rand() * errorMessages.length)]
      targetResults.push({ targetId: target.id, targetName: target.name, status: 'failed', message: err })
      logs.push({ time: stamp, level: 'error', message: `${target.name}：${err}` })
      return
    }

    const completeness = 0.88 + rand() * 0.11
    const quality = Math.round(82 + rand() * 16)
    targetResults.push({
      targetId: target.id,
      targetName: target.name,
      status: 'success',
      message: `完整性 ${(completeness * 100).toFixed(1)}%，质量得分 ${quality}`,
      reportId
    })
    producedReports.push({
      id: reportId,
      kind: script ? 'python' : 'internal',
      name: `${script ? 'Python' : '内部'}质量分析报告 - ${target.name}`,
      variableId: target.id,
      variableName: target.name,
      sourceType: target.sourceType,
      generatedAt: stamp,
      url: script ? `/tasks/scripts/${script.id}` : `preview:${reportId}`,
      scriptId: script?.id,
      scriptVersion: script?.version,
      summary: `${script ? `【${script.name} v${script.version}】` : ''}数据完整性 ${(completeness * 100).toFixed(1)}%，质量得分 ${quality}。`
    })
    logs.push({
      time: stamp,
      level: 'info',
      message: `${script ? `${script.name} v${script.version}` : '内置引擎'} 完成 ${target.name}：完整性 ${(completeness * 100).toFixed(1)}%`
    })
  })

  const successCount = targetResults.filter((t) => t.status === 'success').length
  const failedCount = targetResults.length - successCount

  if (allFailed) {
    logs.push({ time: finishedAt, level: 'error', message: `本轮执行失败：${failedCount}/${targetResults.length} 个特征未产出报告` })
  } else if (failedCount > 0) {
    logs.push({ time: finishedAt, level: 'warn', message: `部分完成：成功 ${successCount} 个，失败 ${failedCount} 个` })
  } else {
    logs.push({ time: finishedAt, level: 'info', message: `执行完成：${successCount} 个特征全部成功，共产出 ${producedReports.length} 份报告` })
  }

  const metrics: EvaluationTaskMock['metrics'] | undefined = allFailed
    ? undefined
    : {
        coverage: Number((0.85 + rand() * 0.12).toFixed(2)),
        quality: Math.round(82 + rand() * 16),
        passRate: Number((0.88 + rand() * 0.1).toFixed(2)),
        iv: task.taskType === 'routine' ? undefined : Number((0.2 + rand() * 0.2).toFixed(2)),
        ks: task.taskType === 'routine' ? undefined : Number((0.18 + rand() * 0.15).toFixed(2))
      }

  /**
   * 执行后产出校验（契约第三段）：把本次真实产出比对任务类型契约，
   * 不符项登记到实例，原本 success 的降级成 partial
   */
  const outputCheck = checkRunOutput(task, opts.status, metrics, producedReports)
  const finalStatus = outputCheck.status
  const contractIssues = outputCheck.issues
  if (finalStatus !== opts.status) {
    logs.push({
      time: finishedAt,
      level: 'warn',
      message: `产出校验未齐备：${issueSummary(contractIssues)}，本轮降级为部分成功`
    })
  }

  return {
    id: runId,
    taskId: task.id,
    taskName: task.name,
    taskType: task.taskType,
    seq: opts.seq,
    trigger: opts.trigger,
    triggeredBy: opts.triggeredBy,
    status: finalStatus,
    startedAt: opts.startedAt,
    finishedAt: opts.status === 'running' ? undefined : finishedAt,
    durationMs: opts.status === 'running' ? undefined : durationMs,
    scripts: opts.scripts,
    targetTotal: task.targets.length,
    targetSuccess: successCount,
    targetFailed: failedCount,
    producedReports,
    metrics,
    errorMessage: allFailed ? (targetResults.find((t) => t.status === 'failed')?.message || '执行失败') : undefined,
    logs,
    targetResults,
    contractIssues
  }
}

/**
 * 实例真实产出 → 契约字段映射
 * 只有这里知道 mock 引擎实际吐了什么：metrics 一直没 PSI，所以复评类任务会被判不符
 */
function producedFromRun(
  task: EvaluationTaskMock,
  metrics: EvaluationTaskMock['metrics'],
  reports: EvaluationTaskReport[]
): Record<string, unknown> {
  return {
    quality: metrics?.quality,
    coverage: metrics?.coverage,
    passRate: metrics?.passRate,
    iv: metrics?.iv,
    ks: metrics?.ks,
    psi: (metrics as { psi?: number } | undefined)?.psi,
    report: reports.length ? reports : undefined,
    chartPath: task.pythonOutputs?.chartPaths?.length ? task.pythonOutputs.chartPaths : undefined
  }
}

/**
 * 执行后产出校验：过去脚本改版少吐一个字段照样显示成功、下游回写静默缺项没人知道，就是缺这一步
 * 执行中 / 已失败的实例不比（本来就没产出，报了只是噪声）
 */
function checkRunOutput(
  task: EvaluationTaskMock,
  status: RunInstanceStatus,
  metrics: EvaluationTaskMock['metrics'],
  reports: EvaluationTaskReport[]
): { status: RunInstanceStatus; issues: ContractIssue[] } {
  if (status !== 'success' && status !== 'partial') {
    return { status, issues: [] }
  }
  const check = validateRunOutput(`evaluation.${task.taskType}`, producedFromRun(task, metrics, reports))
  return {
    status: status === 'success' && check.blockers.length ? 'partial' : status,
    issues: check.issues
  }
}

/** 从任务配置中取本次执行应锁定的脚本口径版本 */
function snapshotScripts(task: EvaluationTaskMock): RunScriptSnapshot[] {
  return (task.pythonScripts || []).map((ref) => {
    const live = EvaluationTaskStore.getPythonScriptById(ref.id)
    return {
      id: ref.id,
      name: ref.name,
      // 调度执行按脚本库当前生效版本；无对应脚本时退回任务快照版本
      version: live?.currentVersion ?? ref.currentVersion ?? 1
    }
  })
}

/**
 * 历史轮次的口径快照：脚本升级前的轮次仍按当时生效的旧版本记录，
 * 以此演示“实例固定版本、不随脚本库后续升级而变”
 */
function snapshotScriptsAt(task: EvaluationTaskMock, offsetDays: number): RunScriptSnapshot[] {
  if (offsetDays <= 0) {
    return snapshotScripts(task)
  }
  const back = offsetDays > 30 ? 2 : offsetDays > 7 ? 1 : 0
  if (!back) {
    return snapshotScripts(task)
  }
  return snapshotScripts(task).map((s) => ({ ...s, version: Math.max(1, s.version - back) }))
}

/**
 * 种子执行记录：按任务调度频率回溯生成历史跑批，
 * 插入失败/部分成功轮次以演示重试与影响面
 */
function buildDefaultRuns(): EvaluationRunInstance[] {
  const runs: EvaluationRunInstance[] = []

  defaultTasks.forEach((task) => {
    const isRoutine = task.taskType === 'routine'
    const frequency = task.routineConfig?.frequency || 'manual'
    const total = isRoutine ? RUN_COUNT_BY_FREQUENCY[frequency] : 1
    const stepDays = STEP_DAYS[frequency]
    const baseStr = isRoutine
      ? (task.routineConfig?.lastRunAt || task.finishedAt || task.updatedAt)
      : (task.startedAt || task.updatedAt)
    const baseTime = parseDate(baseStr).getTime()
    const scheduleHour = parseDate(baseStr)

    for (let i = 0; i < total; i++) {
      const offsetDays = (total - 1 - i) * stepDays
      const start = new Date(baseTime - offsetDays * 86400000)
      if (offsetDays > 0) {
        // 历史轮次沿用任务配置的调度时刻
        start.setHours(scheduleHour.getHours(), scheduleHour.getMinutes(), 0, 0)
      }
      const startedAt = fmtDate(start)
      const seq = i + 1

      // 倒数第 3 轮失败、倒数第 5 轮部分成功（仅对多轮次的常态性任务生效）
      let status: RunInstanceStatus = 'success'
      const fromEnd = total - i
      if (isRoutine && total >= 5 && fromEnd === 3) {
        status = 'failed'
      }
      else if (isRoutine && total >= 5 && fromEnd === 5) {
        status = 'partial'
      }
      else if (isRoutine && total >= 3 && fromEnd === 4) {
        status = 'partial'
      }
      if (!isRoutine) {
        status = task.status === 'failed' ? 'failed' : 'success'
      }

      runs.push(buildRunInstance(task, {
        seq,
        startedAt,
        status,
        trigger: isRoutine ? 'schedule' : 'manual',
        triggeredBy: isRoutine ? '调度系统' : task.owner,
        scripts: snapshotScriptsAt(task, offsetDays)
      }))
    }

    // 失败的常态性任务补一轮手动重试成功记录（只有多轮次任务）
    const failedIdx = runs.findIndex((r) => r.taskId === task.id && r.status === 'failed')
    if (failedIdx >= 0 && isRoutine && total >= 5) {
      const failed = runs[failedIdx]
      const retryStart = new Date(parseDate(failed.startedAt).getTime() + 3600000)
      runs.push(buildRunInstance(task, {
        seq: total + 1,
        startedAt: fmtDate(retryStart),
        status: 'success',
        trigger: 'retry',
        triggeredBy: task.owner,
        scripts: failed.scripts
      }))
    }
  })

  return runs.sort((a, b) => b.startedAt.localeCompare(a.startedAt))
}

/** 种子执行记录懒计算：依赖脚本库状态，不能在模块初始化早期执行 */
let cachedDefaultRuns: EvaluationRunInstance[] | null = null
function getDefaultRuns(): EvaluationRunInstance[] {
  if (!cachedDefaultRuns) {
    cachedDefaultRuns = buildDefaultRuns()
  }
  return cachedDefaultRuns
}

/** 执行记录查询条件 */
export interface RunQueryFilter {
  taskId?: string
  status?: RunInstanceStatus | ''
  trigger?: RunTrigger | ''
  keyword?: string
}

/** 根据频率与调度时刻推算下次执行时间 */
function computeNextRunAt(frequency: ScheduleFrequency, scheduleTime: string): string {
  if (frequency === 'manual') {
    return ''
  }
  const next = new Date()
  if (frequency === 'daily') {
    next.setDate(next.getDate() + 1)
  }
  else if (frequency === 'weekly') {
    next.setDate(next.getDate() + 7)
  }
  else {
    next.setMonth(next.getMonth() + 1)
  }
  const matched = scheduleTime.match(/(\d{1,2}):(\d{2})/)
  if (matched) {
    next.setHours(Number(matched[1]), Number(matched[2]), 0, 0)
  }
  return fmtDate(next)
}

/** 执行结果同步回任务：状态、指标、报告、调度信息，并回写特征档案 */
function syncTaskAfterRun(task: EvaluationTaskMock, run: EvaluationRunInstance) {
  const now = nowFmt()
  const failed = run.status === 'failed'
  const nextStatus: EvaluationTaskStatus = failed
    ? 'failed'
    : task.taskType === 'routine'
      ? (task.routineConfig?.enabled === false ? 'pending' : 'scheduled')
      : 'completed'

  const updated: EvaluationTaskMock = {
    ...task,
    status: nextStatus,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt || now,
    updatedAt: now,
    metrics: run.metrics ?? task.metrics,
    resultSummary: buildRunTaskSummary(run),
    // 报告以本次执行实例为准（执行记录才是报告的真正产地）
    reports: run.producedReports.length ? run.producedReports : task.reports,
    pythonScripts: run.scripts.length
      ? run.scripts.map((s) => {
        const live = EvaluationTaskStore.getPythonScriptById(s.id)
        return {
          id: s.id,
          name: s.name,
          path: live?.path || s.name,
          type: live?.type || 'processor',
          currentVersion: s.version,
          updatedAt: live?.updatedAt || now,
          updatedBy: live?.updatedBy || run.triggeredBy
        }
      })
      : task.pythonScripts,
    routineConfig: task.routineConfig
      ? {
          ...task.routineConfig,
          lastRunAt: run.startedAt,
          lastRunResult: run.status === 'failed' ? 'failed' : run.status === 'partial' ? 'partial' : 'success',
          nextRunAt: computeNextRunAt(task.routineConfig.frequency, task.routineConfig.scheduleTime) || task.routineConfig.nextRunAt
        }
      : task.routineConfig,
    pythonOutputs: failed
      ? task.pythonOutputs
      : {
          chartPaths: run.producedReports.map((r) => `/charts/${run.id}_${r.variableId || idxOf(run, r)}.png`),
          statistics: { totalRows: 10000, completeness: run.metrics?.coverage },
          qualityMetrics: { success: run.targetSuccess, failed: run.targetFailed }
        }
  }
  upsertExtraTask(updated)

  // 回写评估指标到特征档案（仅成功的对象）
  if (failed || !run.metrics) {
    return
  }
  const quality = run.metrics.quality || 85
  const coverage = run.metrics.coverage || 0.9
  run.targetResults
    .filter((t) => t.status === 'success')
    .forEach((t) => {
      VariableStatusStore.setEvaluation(t.targetId, {
        quality,
        missingRate: Number((1 - coverage).toFixed(4)),
        passRate: run.metrics?.passRate || 0.9,
        source: 'evaluation_task',
        taskId: task.id
      }, task.taskType === 'routine' ? '常态性评估' : '评估任务')
    })
}

function idxOf(run: EvaluationRunInstance, report: EvaluationTaskReport): number {
  return run.producedReports.indexOf(report) + 1
}

/** 执行完成后给任务的结果摘要文案 */
function buildRunTaskSummary(run: EvaluationRunInstance): string {
  const scriptDesc = run.scripts.length
    ? `口径：${run.scripts.map((s) => `${s.name} v${s.version}`).join('、')}`
    : '口径：平台内置评估引擎'
  if (run.status === 'failed') {
    return `执行失败：${run.targetFailed}/${run.targetTotal} 个特征未产出报告（${run.errorMessage || '未知原因'}）`
  }
  if (run.status === 'partial') {
    return `部分完成：成功 ${run.targetSuccess} 个、失败 ${run.targetFailed} 个；${scriptDesc}`
  }
  return `执行完成：${run.targetSuccess} 个特征全部成功，产出 ${run.producedReports.length} 份报告；质量得分 ${run.metrics?.quality ?? '—'}；${scriptDesc}`
}

function generateReportsForTask(task: EvaluationTaskMock): EvaluationTaskReport[] {
  const now = nowFmt()
  const existing = Array.isArray(task.reports) ? task.reports : []
  const existingByVar = new Map<string, EvaluationTaskReport>()
  existing.forEach((r) => {
    if (r.variableId) {
      existingByVar.set(r.variableId, r)
    }
  })

  const reports: EvaluationTaskReport[] = [...existing]
  const binding = readBinding()
  let externalCounter = 0

  task.targets.forEach((target, idx) => {
    if (target.sourceType !== 'external') {
      // 内数 / 征信：生成内部报告
      const internalName = `DMT 评估报告 - ${target.name}`
      const hasInternal = reports.some((r) => r.kind === 'internal' && r.variableId === target.id)
      if (!hasInternal) {
        reports.push({
          id: `INT-${task.id}-${idx + 1}`,
          kind: 'internal',
          name: internalName,
          variableId: target.id,
          variableName: target.name,
          sourceType: target.sourceType,
          generatedAt: now,
          url: `preview:internal-${task.id}-${idx + 1}`,
          summary: `DMT 内部评估：${target.name}（${target.sourceType || '内部'}）`
        })
      }
      return
    }

    // 外数：调用外数评估能力（mock），生成 external 报告并回写 binding
    const existingReport = existingByVar.get(target.id)
    if (existingReport) {
      // 任务已存在历史报告
      return
    }
    const newId = String(nextExternalReportId() + externalCounter)
    externalCounter += 1
    binding[target.id] = newId
    reports.push({
      id: newId,
      kind: 'external',
      name: `外数评估报告 - ${target.name}`,
      variableId: target.id,
      variableName: target.name,
      sourceType: 'external',
      generatedAt: now,
      url: `/risk/external-data/evaluation/${newId}`,
      summary: `外数评估系统输出：${target.name}（命中/IV/KS 由外数系统给出）。`
    })
  })

  // 内部总结报告
  const hasInternalSummary = reports.some((r) => r.kind === 'internal' && !r.variableId)
  if (!hasInternalSummary && task.targets.length) {
    reports.push({
      id: `INT-${task.id}-SUMMARY`,
      kind: 'internal',
      name: `DMT 评估总结 - ${task.name}`,
      generatedAt: now,
      url: `preview:internal-summary-${task.id}`,
      summary: `DMT 评估总结：${task.targets.length} 个目标特征，详见逐项报告。`
    })
  }

  writeBinding(binding)
  return reports
}

export const EvaluationTaskStore = {
  listTasks(): EvaluationTaskMock[] {
    // localStorage 副本（已执行/已编辑）优先于内置种子，避免同 id 重复
    const extra = readExtraTasks()
    const extraIds = new Set(extra.map((t) => t.id))
    return [...extra, ...defaultTasks.filter((t) => !extraIds.has(t.id))]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  },
  getTaskById(id: string) {
    return EvaluationTaskStore.listTasks().find((item) => item.id === id)
  },
  addTask(payload: {
    name: string
    taskType: EvaluationTaskType
    sourceType: EvaluationTaskSourceType
    sourceIds: string[]
    sourceNames: string[]
    description: string
    dataSourceId?: string
    dataSourceName?: string
    variableTypeId?: string
    variableTypeName?: string
    targets: EvaluationTaskTarget[]
  }) {
    const now = nowFmt()
    const task: EvaluationTaskMock = {
      id: nextTaskId(),
      name: payload.name,
      taskType: payload.taskType,
      status: 'pending',
      sourceType: payload.sourceType,
      sourceIds: payload.sourceIds,
      sourceNames: payload.sourceNames,
      dataSourceId: payload.dataSourceId,
      dataSourceName: payload.dataSourceName,
      variableTypeId: payload.variableTypeId,
      variableTypeName: payload.variableTypeName,
      owner: 'Demo 用户',
      description: payload.description,
      createdAt: now,
      updatedAt: now,
      targets: payload.targets,
      reports: []
    }
    upsertExtraTask(task)
    return task
  },
  runTask(id: string) {
    const current = EvaluationTaskStore.getTaskById(id)
    if (!current) {
      return null
    }
    const now = nowFmt()
    const targetCount = current.targets.length || 1
    const reports = generateReportsForTask(current)
    const metrics = current.metrics || {
      coverage: Number((0.78 + targetCount * 0.03).toFixed(2)),
      iv: Number((0.16 + targetCount * 0.04).toFixed(2)),
      ks: Number((0.12 + targetCount * 0.03).toFixed(2)),
      passRate: Number((0.82 + targetCount * 0.02).toFixed(2))
    }
    // 回写评估指标到特征档案
    current.targets.forEach((target) => {
      if (!target.id) {
        return
      }
      const quality = Math.round((metrics.passRate ?? 0.9) * 100)
      const missingRate = Number((((1 - (metrics.coverage ?? 0.9)) * 0.1) + 0.01).toFixed(4))
      VariableStatusStore.setEvaluation(target.id, {
        quality,
        missingRate,
        passRate: metrics.passRate,
        iv: metrics.iv,
        ks: metrics.ks,
        source: 'evaluation_task',
        taskId: id
      }, '评估任务中心')
    })
    const finished: EvaluationTaskMock = {
      ...current,
      status: 'completed',
      startedAt: current.startedAt || now,
      finishedAt: now,
      updatedAt: now,
      metrics,
      resultSummary:
        current.resultSummary ||
        `已完成 ${targetCount} 个特征的 mock 评估（已生成 ${reports.length} 份评估报告），评估指标已回写到特征档案。`,
      reports
    }
    upsertExtraTask(finished)
    // 一次性任务也登记执行实例，保证执行记录覆盖全部任务类型
    EvaluationTaskStore.registerRunForTask(finished)
    return finished
  },
  /**
   * 启动一个任务：pending → running
   */
  startTask(id: string) {
    const current = EvaluationTaskStore.getTaskById(id)
    if (!current) {
      return null
    }
    const now = nowFmt()
    const running: EvaluationTaskMock = {
      ...current,
      status: 'running',
      startedAt: current.startedAt || now,
      updatedAt: now
    }
    upsertExtraTask(running)
    return running
  },
  /**
   * 读取"评估任务中心 → 外数评估"已生成的 ID 映射，供特征档案侧合并 sourceRefs
   */
  getExternalBinding(): ExternalBindingMap {
    return readBinding()
  },
  listSummary() {
    const tasks = EvaluationTaskStore.listTasks()
    return tasks.reduce(
      (acc, item) => {
        acc.total += 1
        acc[item.status] = (acc[item.status] || 0) + 1
        return acc
      },
      { total: 0, pending: 0, running: 0, completed: 0, failed: 0, scheduled: 0 } as Record<EvaluationTaskStatus | 'total', number>
    )
  },

  // ============ Python 脚本管理 ============
  listPythonScripts(): PythonScriptConfig[] {
    // localStorage 中的副本（已被编辑/回滚/归档）优先于内置种子，避免同 id 重复
    const stored = readPythonScripts()
    const storedIds = new Set(stored.map((s) => s.id))
    return [...stored, ...defaultPythonScripts.map(normalizeScript).filter((s) => !storedIds.has(s.id))]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  },

  getPythonScriptById(id: string): PythonScriptConfig | undefined {
    return EvaluationTaskStore.listPythonScripts().find((s) => s.id === id)
  },

  /**
   * 保存脚本。
   * - 新建：生成 v1
   * - 更新且内容变化：自动创建新版本（currentVersion+1），旧版本保留到历史
   * - 更新但内容未变（仅改元信息）：不产生新版本
   */
  savePythonScript(payload: {
    id?: string
    name: string
    path: string
    content: string
    type: PythonScriptConfig['type']
    dependencies?: string[]
    description?: string
    tags?: string[]
    changeLog?: string
    /** 输入输出契约声明，key 必须是 io-contract 字段字典里的项 */
    requires?: string[]
    provides?: string[]
  }): PythonScriptConfig {
    const now = nowFmt()
    const scripts = readPythonScripts()

    if (payload.id) {
      let idx = scripts.findIndex((s) => s.id === payload.id)
      // 内置种子脚本首次被编辑时，先把规范化后的副本写入 localStorage 再更新
      if (idx < 0) {
        const seed = defaultPythonScripts.map(normalizeScript).find((s) => s.id === payload.id)
        if (seed) {
          scripts.push(seed)
          idx = scripts.length - 1
        }
      }
      if (idx >= 0) {
        const prev = scripts[idx]
        const contentChanged = prev.content !== payload.content
        let currentVersion = prev.currentVersion
        let versions = prev.versions
        let content = prev.content

        if (contentChanged) {
          currentVersion = prev.currentVersion + 1
          const newVersion: PythonScriptVersion = {
            version: currentVersion,
            content: payload.content,
            changeLog: payload.changeLog || '脚本内容更新',
            dependencies: payload.dependencies,
            createdBy: 'Demo 用户',
            createdAt: now
          }
          versions = [newVersion, ...prev.versions]
          content = payload.content
        }

        scripts[idx] = {
          ...prev,
          name: payload.name,
          path: payload.path,
          type: payload.type,
          dependencies: payload.dependencies,
          description: payload.description ?? prev.description,
          tags: payload.tags ?? prev.tags,
          requires: payload.requires ?? prev.requires,
          provides: payload.provides ?? prev.provides,
          content,
          currentVersion,
          versions,
          updatedAt: now,
          updatedBy: 'Demo 用户'
        }
        writePythonScripts(scripts)
        return scripts[idx]
      }
    }

    // 新建脚本
    const v1: PythonScriptVersion = {
      version: 1,
      content: payload.content,
      changeLog: payload.changeLog || '初始版本',
      dependencies: payload.dependencies,
      createdBy: 'Demo 用户',
      createdAt: now
    }
    const newScript: PythonScriptConfig = {
      id: nextScriptId(),
      name: payload.name,
      path: payload.path,
      content: payload.content,
      type: payload.type,
      dependencies: payload.dependencies,
      description: payload.description,
      tags: payload.tags,
      requires: payload.requires,
      provides: payload.provides,
      status: 'active',
      currentVersion: 1,
      versions: [v1],
      createdAt: now,
      createdBy: 'Demo 用户',
      updatedAt: now,
      updatedBy: 'Demo 用户'
    }
    scripts.push(newScript)
    writePythonScripts(scripts)
    return newScript
  },

  /** 获取指定脚本的版本列表（倒序） */
  listScriptVersions(id: string): PythonScriptVersion[] {
    const script = EvaluationTaskStore.getPythonScriptById(id)
    return script ? script.versions : []
  },

  /** 获取指定版本详情 */
  getScriptVersion(id: string, version: number): PythonScriptVersion | undefined {
    const script = EvaluationTaskStore.getPythonScriptById(id)
    return script?.versions.find((v) => v.version === version)
  },

  /**
   * 回滚到指定版本：基于历史版本内容创建一个新版本（版本号递增，保留审计链）
   */
  rollbackScriptVersion(id: string, version: number): PythonScriptConfig | null {
    const scripts = readPythonScripts()
    const idx = scripts.findIndex((s) => s.id === id)
    const all = EvaluationTaskStore.getPythonScriptById(id)
    if (!all) {
      return null
    }
    const target = all.versions.find((v) => v.version === version)
    if (!target) {
      return null
    }

    const now = nowFmt()
    const currentVersion = all.currentVersion + 1
    const newVersion: PythonScriptVersion = {
      version: currentVersion,
      content: target.content,
      changeLog: `回滚自 v${version}`,
      dependencies: target.dependencies,
      createdBy: 'Demo 用户',
      createdAt: now
    }
    const updated: PythonScriptConfig = {
      ...all,
      content: target.content,
      dependencies: target.dependencies ?? all.dependencies,
      currentVersion,
      versions: [newVersion, ...all.versions],
      updatedAt: now,
      updatedBy: 'Demo 用户'
    }
    if (idx >= 0) {
      scripts[idx] = updated
    } else {
      scripts.push(updated)
    }
    writePythonScripts(scripts)
    return updated
  },

  /** 切换当前生效版本（不新建版本，直接指向历史版本） */
  setCurrentScriptVersion(id: string, version: number): PythonScriptConfig | null {
    const all = EvaluationTaskStore.getPythonScriptById(id)
    if (!all) {
      return null
    }
    const target = all.versions.find((v) => v.version === version)
    if (!target) {
      return null
    }
    const scripts = readPythonScripts()
    const idx = scripts.findIndex((s) => s.id === id)
    const updated: PythonScriptConfig = {
      ...all,
      content: target.content,
      currentVersion: version
    }
    if (idx >= 0) {
      scripts[idx] = updated
    } else {
      scripts.push(updated)
    }
    writePythonScripts(scripts)
    return updated
  },

  /** 对比两个版本，返回行级 diff */
  diffScriptVersions(id: string, fromVersion: number, toVersion: number): ScriptDiffLine[] {
    const from = EvaluationTaskStore.getScriptVersion(id, fromVersion)
    const to = EvaluationTaskStore.getScriptVersion(id, toVersion)
    if (!from || !to) {
      return []
    }
    return computeLineDiff(from.content, to.content)
  },

  /** 归档/启用脚本 */
  setScriptStatus(id: string, status: 'active' | 'archived'): PythonScriptConfig | null {
    const all = EvaluationTaskStore.getPythonScriptById(id)
    if (!all) {
      return null
    }
    const scripts = readPythonScripts()
    const idx = scripts.findIndex((s) => s.id === id)
    const updated: PythonScriptConfig = { ...all, status, updatedAt: nowFmt() }
    if (idx >= 0) {
      scripts[idx] = updated
    } else {
      scripts.push(updated)
    }
    writePythonScripts(scripts)
    return updated
  },

  deletePythonScript(id: string): boolean {
    if (EvaluationTaskStore.isBuiltinScript(id)) {
      return false
    }
    const scripts = readPythonScripts()
    const filtered = scripts.filter((s) => s.id !== id)
    if (filtered.length === scripts.length) {
      return false
    }
    writePythonScripts(filtered)
    return true
  },

  /** 内置种子脚本：不可删除，只能归档 */
  isBuiltinScript(id: string): boolean {
    return defaultPythonScripts.some((s) => s.id === id)
  },

  /** 引用了该脚本的评估任务（用于脚本详情页展示影响面与删除校验） */
  listTasksByScript(scriptId: string): EvaluationTaskMock[] {
    return EvaluationTaskStore.listTasks().filter((task) =>
      (task.pythonScripts || []).some((ref) => ref.id === scriptId)
    )
  },

  // ============ 常态性评估任务 ============
  addRoutineTask(payload: {
    name: string
    description: string
    sourceType: EvaluationTaskSourceType
    sourceIds: string[]
    sourceNames: string[]
    dataSourceId?: string
    dataSourceName?: string
    variableTypeId?: string
    variableTypeName?: string
    targets: EvaluationTaskTarget[]
    routineConfig: RoutineScheduleConfig
    pythonScriptIds: string[]
  }): EvaluationTaskMock {
    const now = nowFmt()
    const scripts = payload.pythonScriptIds
      .map((id) => EvaluationTaskStore.getPythonScriptById(id))
      .filter((s): s is PythonScriptConfig => !!s)
    
    const task: EvaluationTaskMock = {
      id: nextTaskId(),
      name: payload.name,
      taskType: 'routine',
      status: 'scheduled',
      sourceType: payload.sourceType,
      sourceIds: payload.sourceIds,
      sourceNames: payload.sourceNames,
      dataSourceId: payload.dataSourceId,
      dataSourceName: payload.dataSourceName,
      variableTypeId: payload.variableTypeId,
      variableTypeName: payload.variableTypeName,
      owner: 'Demo 用户',
      description: payload.description,
      createdAt: now,
      updatedAt: now,
      targets: payload.targets,
      reports: [],
      routineConfig: payload.routineConfig,
      pythonScripts: scripts.map((s) => ({
        id: s.id,
        name: s.name,
        path: s.path,
        type: s.type,
        currentVersion: s.currentVersion,
        updatedAt: s.updatedAt,
        updatedBy: s.updatedBy,
        requires: s.requires,
        provides: s.provides
      })) // 轻量引用，不存 content/versions
    }
    upsertExtraTask(task)
    return task
  },

  updateRoutineSchedule(taskId: string, config: Partial<RoutineScheduleConfig>): EvaluationTaskMock | null {
    const current = EvaluationTaskStore.getTaskById(taskId)
    if (!current || current.taskType !== 'routine') {
      return null
    }
    
    const updated: EvaluationTaskMock = {
      ...current,
      routineConfig: { ...current.routineConfig!, ...config },
      updatedAt: nowFmt()
    }
    upsertExtraTask(updated)
    return updated
  },

  runRoutineTask(taskId: string): EvaluationTaskMock | null {
    const run = EvaluationTaskStore.runTaskNow(taskId, { trigger: 'manual', status: 'success' })
    return run?.task || null
  },

  // ============ 执行实例 / 执行记录 ============
  /** 执行记录列表（可按任务/状态/触发方式/关键词过滤），默认按开始时间倒序 */
  listRuns(filter: RunQueryFilter = {}): EvaluationRunInstance[] {
    // 已落盘的实例（含运行中、手动跑批）优先于种子记录，同 id 去重
    const stored = readRuns()
    const storedIds = new Set(stored.map((r) => r.id))
    const all = [...stored, ...getDefaultRuns().filter((r) => !storedIds.has(r.id))]
    const keyword = (filter.keyword || '').trim().toLowerCase()
    return all
      .filter((r) => {
        if (filter.taskId && r.taskId !== filter.taskId) {
          return false
        }
        if (filter.status && r.status !== filter.status) {
          return false
        }
        if (filter.trigger && r.trigger !== filter.trigger) {
          return false
        }
        if (keyword) {
          const hay = `${r.id} ${r.taskId} ${r.taskName} ${r.triggeredBy}`.toLowerCase()
          if (!hay.includes(keyword)) {
            return false
          }
        }
        return true
      })
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
  },

  getRunById(id: string): EvaluationRunInstance | undefined {
    return EvaluationTaskStore.listRuns().find((r) => r.id === id)
  },

  listRunsByTask(taskId: string): EvaluationRunInstance[] {
    return EvaluationTaskStore.listRuns({ taskId })
  },

  /** 任务最近一次已完成/运行中的执行实例 */
  latestRunOf(taskId: string): EvaluationRunInstance | undefined {
    return EvaluationTaskStore.listRuns({ taskId })[0]
  },

  /** 执行概览统计（执行记录页顶部卡片） */
  listRunSummary() {
    const runs = EvaluationTaskStore.listRuns()
    const today = nowFmt().slice(0, 10)
    const finished = runs.filter((r) => r.status !== 'running')
    const success = finished.filter((r) => r.status === 'success').length
    return {
      total: runs.length,
      running: runs.filter((r) => r.status === 'running').length,
      success,
      partial: finished.filter((r) => r.status === 'partial').length,
      failed: finished.filter((r) => r.status === 'failed').length,
      today: runs.filter((r) => r.startedAt.startsWith(today)).length,
      successRate: finished.length ? Number((success / finished.length).toFixed(4)) : 0
    }
  },

  /** 启动一次执行：先落一条 running 实例，并把任务置为运行中 */
  startRun(taskId: string, opts: { trigger?: RunTrigger; triggeredBy?: string } = {}): EvaluationRunInstance | null {
    const task = EvaluationTaskStore.getTaskById(taskId)
    if (!task) {
      return null
    }
    const existed = EvaluationTaskStore.listRuns({ taskId })
    if (existed.some((r) => r.status === 'running')) {return null} // 同一任务不允许并发跑批

    const startedAt = nowFmt()
    const seq = existed.reduce((max, r) => Math.max(max, r.seq), 0) + 1
    const draft = buildRunInstance(task, {
      seq,
      startedAt,
      status: 'success',
      trigger: opts.trigger || 'manual',
      triggeredBy: opts.triggeredBy || 'Demo 用户',
      scripts: snapshotScripts(task)
    })

    const running: EvaluationRunInstance = {
      ...draft,
      id: existed.some((r) => r.id === draft.id) ? `${draft.id}-${seq}` : draft.id,
      status: 'running',
      finishedAt: undefined,
      durationMs: undefined,
      producedReports: [],
      targetResults: [],
      targetSuccess: 0,
      targetFailed: 0,
      metrics: undefined,
      // 运行中还没产出，契约不符项要留空（draft 是预演的成功批次，带着一整套校验结果会被误读）
      contractIssues: [],
      // 运行中只保留“初始化”阶段日志（均使用 startedAt 时间戳）
      logs: draft.logs.filter((l) => l.time === startedAt)
        .concat([{ time: startedAt, level: 'info', message: '已提交执行，正在调度 Python 运行时…' }])
    }

    const runs = readRuns()
    runs.unshift(running)
    writeRuns(runs)
    upsertExtraTask({ ...task, status: 'running', startedAt, updatedAt: startedAt })
    return running
  },

  /** 结束一次执行：回落实例结果，并同步任务状态与特征档案 */
  finishRun(
    runId: string,
    opts: { status?: Exclude<RunInstanceStatus, 'running' | 'skipped'> } = {}
  ): EvaluationRunInstance | null {
    const run = EvaluationTaskStore.getRunById(runId)
    if (!run) {
      return null
    }
    const task = EvaluationTaskStore.getTaskById(run.taskId)
    if (!task) {
      return null
    }

    const built = buildRunInstance(task, {
      seq: run.seq,
      startedAt: run.startedAt,
      status: opts.status || 'success',
      trigger: run.trigger,
      triggeredBy: run.triggeredBy,
      scripts: run.scripts,
      // 实例已开始于真实时刻，耗时与日志时间戳都收敛到当前时刻以内
      maxDurationMs: Date.now() - parseDate(run.startedAt).getTime()
    })
    const finished: EvaluationRunInstance = { ...built, id: run.id }

    const runs = readRuns()
    const idx = runs.findIndex((r) => r.id === runId)
    if (idx >= 0) {
      runs[idx] = finished
    }
    else {
      runs.unshift(finished)
    }
    writeRuns(runs)

    syncTaskAfterRun(task, finished)
    return finished
  },

  /** 一步完成执行（演示用）：启动 + 立即结束 */
  runTaskNow(
    taskId: string,
    opts: {
      trigger?: RunTrigger
      triggeredBy?: string
      status?: Exclude<RunInstanceStatus, 'running' | 'skipped'>
    } = {}
  ): { run: EvaluationRunInstance | null; task: EvaluationTaskMock | null } | null {
    const started = EvaluationTaskStore.startRun(taskId, opts)
    if (!started) {
      return null
    }
    // 手动触发默认成功；调度触发有小概率失败以演示异常链路
    const rand = Math.random()
    const status = opts.status
      || (opts.trigger === 'schedule' && rand < 0.15
        ? (rand < 0.06 ? 'failed' : 'partial')
        : 'success')
    const run = EvaluationTaskStore.finishRun(started.id, { status })
    return { run, task: EvaluationTaskStore.getTaskById(taskId) || null }
  },

  /** 基于失败实例发起重试 */
  retryRun(runId: string, triggeredBy = 'Demo 用户'): EvaluationRunInstance | null {
    const origin = EvaluationTaskStore.getRunById(runId)
    if (!origin || origin.status === 'running') {
      return null
    }
    return EvaluationTaskStore.startRun(origin.taskId, { trigger: 'retry', triggeredBy })
  },

  /**
   * 为已完成的一次性任务登记执行实例
   * 一次性任务的报告由外数/内部评估链路生成，实例直接引用任务上的真实报告
   */
  registerRunForTask(task: EvaluationTaskMock): EvaluationRunInstance {
    const runs = readRuns()
    const existed = runs.filter((r) => r.taskId === task.id)
    const seq = existed.reduce((max, r) => Math.max(max, r.seq), 0) + 1
    const startedAt = task.startedAt || task.updatedAt
    const finishedAt = task.finishedAt || nowFmt()
    const durationMs =
      Math.max(0, parseDate(finishedAt).getTime() - parseDate(startedAt).getTime()) || 120000
    const failed = task.status === 'failed'
    const scripts = snapshotScripts(task)

    const targetResults: RunTargetResult[] = task.targets.map((target) => {
      const report = task.reports.find((r) => r.variableId === target.id)
      return {
        targetId: target.id,
        targetName: target.name,
        status: failed ? 'failed' : 'success',
        message: failed ? '执行失败，未产出报告' : report?.summary || '已完成评估并回写特征档案',
        reportId: report?.id
      }
    })

    const logs: RunLogEntry[] = [
      { time: startedAt, level: 'info', message: `触发方式：${triggerLabel('manual')}，开始拉取评估对象` },
      { time: startedAt, level: 'info', message: `共 ${targetResults.length} 个特征待处理` },
      ...task.reports.map<RunLogEntry>((r) => ({
        time: r.generatedAt || finishedAt,
        level: 'info',
        message: `${r.name} 已生成${r.scriptId ? `（${r.scriptId} v${r.scriptVersion ?? 1}）` : ''}`
      })),
      {
        time: finishedAt,
        level: failed ? 'error' : 'info',
        message: failed
          ? `执行失败：${targetResults.length} 个特征未产出报告`
          : `执行完成：${targetResults.length} 个特征全部成功，共产出 ${task.reports.length} 份报告`
      }
    ]

    const instance: EvaluationRunInstance = {
      id: `RUN-${task.id}-${finishedAt.replace(/[^0-9]/g, '').slice(0, 12)}-${seq}`,
      taskId: task.id,
      taskName: task.name,
      taskType: task.taskType,
      seq,
      trigger: 'manual',
      triggeredBy: task.owner,
      status: failed ? 'failed' : 'success',
      startedAt,
      finishedAt,
      durationMs,
      scripts,
      targetTotal: targetResults.length,
      targetSuccess: targetResults.filter((t) => t.status === 'success').length,
      targetFailed: targetResults.filter((t) => t.status === 'failed').length,
      producedReports: task.reports,
      metrics: task.metrics,
      errorMessage: failed ? task.resultSummary : undefined,
      logs,
      targetResults
    }

    runs.unshift(instance)
    writeRuns(runs)
    return instance
  }
}

export default EvaluationTaskStore
