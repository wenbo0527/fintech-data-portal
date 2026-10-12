// 模型回溯 Mock 持久化

const tasks = []
let idSeq = 1;
const operationLogs = []
let logIdSeq = 1;

// 回溯任务状态枚举（新增 partial_success：入参落库失败但回溯主体已完成）
export const BACKTRACK_STATUS = {
  DRAFT: 'draft',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  STOPPED: 'stopped',
  PARTIAL_SUCCESS: 'partial_success'
}

// 场景标签枚举（仅展示标记，不参与逻辑校验）
export const SCENE_TAGS = ['授信', '支用', '反欺诈', '贷后', '营销']

// 落表目标-渠道枚举（渠道专属汇总表下拉用）
export const LANDING_CHANNELS = [
  { value: 'alipay', label: '支付宝' },
  { value: 'wechat', label: '微信' },
  { value: 'jd', label: '京东' },
  { value: 'douyin', label: '抖音' }
]

// 必填字段定义：required=true 缺失阻断提交，required=false 缺失仅弱提示
export const REQUIRED_FIELD_DEFS = [
  { field: 'product_id', label: '产品ID', required: true },
  { field: 'flow_id', label: '流水号', required: true },
  { field: 'data_dt', label: '数据日期', required: true },
  { field: 'business_code', label: '业务编码', required: false },
  { field: 'session_number', label: '会话编号', required: false }
]

// 关联方式枚举
export const ASSOCIATION_METHODS = [
  { value: 'flow_id', label: 'flow_id 关联' },
  { value: 'cert_no', label: '身份证号关联' }
]

// 构造结构化日志——嵌套日志（stages 在顶层 + main_model + sub_models）
// 用于详情页日志结构化展示（模块C P0）
function buildNestedLog(now) {
  const stages = [
    `[${now}] 开始前置处理征信宽表 `,
    `[${now}] 前置处理征信宽表完成（耗时 49m41s）`,
    `[${now}] 开始样本表模型回溯 `,
    `[${now}] 结束样本表模型回溯 `
  ]
  const mainSuccess = `[${now}] [session=s001] [子任务=t01][耗时=2m30s]: 执行成功!`
  const sub1Success = `[${now}] [session=s002] [子任务=t02][耗时=5m12s]: 执行成功!`
  const sub2Success = `[${now}] [session=s003] [子任务=t03][耗时=3m00s]: 执行成功!`
  const sub2Error = `[${now}] [session=s003] [子任务=t04]: 执行失败!`
  return {
    stages,
    main_model: {
      model_version: 'V1',
      state: 1,
      progress: '100%',
      result_table: 'dw.model_result_20260817',
      successInfo: [mainSuccess],
      errorInfo: []
    },
    sub_models: [
      {
        model_id: 'sub_001',
        model_version: 'V1',
        state: 1,
        progress: '100%',
        result_table: 'dw.sub_result_001',
        successInfo: [sub1Success],
        errorInfo: []
      },
      {
        model_id: 'sub_002',
        model_version: 'V1',
        state: 0,
        progress: '60%',
        result_table: '',
        successInfo: [sub2Success],
        errorInfo: [sub2Error]
      }
    ]
  }
}

// 构造结构化日志——单模型日志（layers 在顶层 + result.stages + result.main_model）
function buildSingleModelLog(now) {
  const stages = [
    `[${now}] 开始单模型推理 `,
    `[${now}] 单模型推理完成（耗时 12m08s）`
  ]
  const success = `[${now}] [session=s100] [子任务=t10][耗时=12m08s]: 执行成功!`
  return {
    layers: ['input_layer', 'hidden_layer', 'output_layer'],
    result: {
      stages,
      main_model: {
        model_version: 'V1',
        successInfo: [success],
        errorInfo: []
      }
    }
  }
}

// 预置一个示例任务，便于直接查看详情演示
;(function seed() {
  const now = new Date().toISOString()
  const seedOutputs = [
    { name: 'score', type: 'number', description: '风险评分' },
    { name: 'label', type: 'number', description: '预测标签' }
  ]
  const sample = (idx) => ({ idx, output: { score: Math.round(Math.random()*100)/100, label: Math.round(Math.random()) } })
  const t = {
    id: 1,
    status: BACKTRACK_STATUS.COMPLETED,
    progress: [
      { key: 'init', name: '初始化', status: 'done', time: now },
      { key: 'pull', name: '拉取样本', status: 'done', time: now },
      { key: 'map', name: '参数匹配', status: 'done', time: now },
      { key: 'execute', name: '执行模型', status: 'done', time: now },
      { key: 'finish', name: '完成', status: 'done', time: now }
    ],
    result: {
      total: 1000,
      success: 980,
      failed: 20,
      samples: [sample(1), sample(2), sample(3)]
    },
    report: {
      accuracy: 94.5,
      recall: 89.2,
      f1Score: 0.92,
      dataDistribution: [
        { category: '高风险', count: 150, percentage: '15%' },
        { category: '中风险', count: 350, percentage: '35%' },
        { category: '低风险', count: 500, percentage: '50%' }
      ],
      featureImportance: [
        { feature: '信用历史', score: 0.85, rank: 1 },
        { feature: '收入水平', score: 0.72, rank: 2 },
        { feature: '年龄', score: 0.65, rank: 3 },
        { feature: '工作稳定性', score: 0.58, rank: 4 }
      ]
    },
    // 模块A P0：勾选『推理入参入库』时，特征文件追加到推理结果表
    // midloan_feature_id：关联变量中心特征编码（MIDLOAN-FEAT-*），作为元数据唯一入口的统一 id
    featurePersist: [
      { feature_name: 'age', feature_value: '28', feature_source: '当前模型', mapped_feature_id: 'user_age', midloan_feature_id: '', backtrace_id: 'bt_1' },
      { feature_name: 'income', feature_value: '12000', feature_source: '当前模型', mapped_feature_id: 'user_income', midloan_feature_id: 'MIDLOAN-FEAT-0001', backtrace_id: 'bt_1' },
      { feature_name: 'credit_history', feature_value: 'good', feature_source: '当前模型', mapped_feature_id: 'credit_history', midloan_feature_id: '', backtrace_id: 'bt_1' }
    ],
    // 模块C P0：结构化日志（嵌套日志示例，含子模型）
    logType: 'nested',
    log: buildNestedLog(now),
    createTime: now,
    updateTime: now,
    config: {
      table: 'risk_dw.ads_midloan_bigtxn_30d_m',
      sourceType: 'doris',
      dbName: 'risk_dw',
      tableName: 'risk_dw.ads_midloan_bigtxn_30d_m',
      mode: 'single',
      observeDate: '',
      dateRange: ['2026-07-01', '2026-07-31'],
      serviceName: 'credit_score_service',
      version: 'V1',
      taskName: '信用评分服务-单次全量回溯',
      sqlWhere: "dt >= '2026-07-01' AND dt <= '2026-07-31' AND cert_no IS NOT NULL",
      // 模块A：是否勾选『推理入参入库』
      featurePersist: true,
      // 关联变量中心特征编码（元数据唯一入口统一 id）
      midloanFeatureIds: ['MIDLOAN-FEAT-0001'],
      // 底表来源：从变量中心 modelBaseMonthlyTableName 联动
      midloanBaseTable: 'risk_dw.ads_midloan_bigtxn_30d_m',
      inputMappings: [
        { input: 'age', target: 'user_age', from: '当前模型' },
        { input: 'income', target: 'user_income', from: '当前模型' },
        { input: 'credit_history', target: 'credit_history', from: '当前模型' }
      ],
      outputs: seedOutputs,
      requiredFieldMappings: [
        { field: 'product_id', target: 'product_id', isEncrypted: false, required: true },
        { field: 'flow_id', target: 'flow_id', isEncrypted: false, required: true },
        { field: 'data_dt', target: 'data_dt', isEncrypted: false, required: true },
        { field: 'business_code', target: '', isEncrypted: false, required: false },
        { field: 'session_number', target: '', isEncrypted: false, required: false }
      ],
      // 落表目标（单模型独立表-实时）
      landingForm: { summary: false, summaryType: '', channelCode: '', singleModel: true, singleTableType: 'realtime' },
      // 场景标签
      sceneTags: ['授信'],
      // 主模型分指定（outputs 含 score/label 多分值）
      mainScoreField: 'score',
      // 关联方式
      associationMethod: 'flow_id'
    }
  }
  tasks.unshift(t)

  // 预置第二个任务：单模型日志示例（部分成功状态）
  const now2 = new Date(Date.now() - 86400000).toISOString()
  const t2 = {
    id: 2,
    status: BACKTRACK_STATUS.PARTIAL_SUCCESS,
    progress: [
      { key: 'init', name: '初始化', status: 'done', time: now2 },
      { key: 'pull', name: '拉取样本', status: 'done', time: now2 },
      { key: 'map', name: '参数匹配', status: 'done', time: now2 },
      { key: 'execute', name: '执行模型', status: 'done', time: now2 },
      { key: 'finish', name: '完成', status: 'done', time: now2 }
    ],
    result: { total: 200, success: 200, failed: 0, samples: [sample(1), sample(2)] },
    featurePersist: [], // 入参落库失败 -> 部分成功
    logType: 'single',
    log: buildSingleModelLog(now2),
    createTime: now2,
    updateTime: now2,
    config: {
      table: 'dw.user_credit',
      sourceType: 'doris',
      dbName: 'risk_dw',
      tableName: 'dw.user_credit',
      mode: 'periodic',
      observeDate: '',
      dateRange: ['2026-08-01', '2026-08-31'],
      serviceName: 'risk_score_v2',
      version: 'V2',
      taskName: '风险评分V2-每日周期回溯',
      sqlWhere: "dt >= '2026-08-01' AND status = 'active'",
      featurePersist: false,
      inputMappings: [
        { input: 'age', target: 'user_age', from: '当前模型' },
        { input: 'income', target: 'user_income', from: '当前模型' }
      ],
      outputs: seedOutputs,
      requiredFieldMappings: [
        { field: 'product_id', target: 'product_id', isEncrypted: false, required: true },
        { field: 'flow_id', target: 'flow_id', isEncrypted: false, required: true },
        { field: 'data_dt', target: 'data_dt', isEncrypted: false, required: true },
        { field: 'business_code', target: 'risk_biz', isEncrypted: false, required: false },
        { field: 'session_number', target: '', isEncrypted: false, required: false }
      ],
      // 落表目标（多模型通用汇总表 + 单模型离线，并行写入）
      landingForm: { summary: true, summaryType: 'general', channelCode: '', singleModel: true, singleTableType: 'offline' },
      // 场景标签（周期任务首次配置沿用）
      sceneTags: ['支用', '反欺诈'],
      // 主模型分指定
      mainScoreField: 'score',
      // 关联方式（无 flow_id 时走身份证号）
      associationMethod: 'cert_no',
      periodicity: 'daily',
      weekDays: ['1', '2', '3', '4', '5'],
      monthDays: [],
      triggerType: 'schedule',
      scheduleTime: '09:00',
      kangarooTaskId: 'task-002',
      taskStartDate: '2026-08-01',
      taskEndDate: '2026-12-31'
    }
  }
  tasks.unshift(t2)

  // 真实样例1：嵌套日志（含子模型 + 父模型，state=2 表示成功完成）
  const t3 = {
    id: 3,
    status: BACKTRACK_STATUS.COMPLETED,
    progress: [],
    result: { total: 0, success: 0, failed: 0, samples: [] },
    featurePersist: [],
    logType: 'nested',
    log: {
      stages: [
        '[2026-07-20 10:13:40]开始前置处理征信宽表',
        '[2026-07-20 11:32:18]前置处理征信宽表完成,耗时=1h18m38s',
        '[2026-07-20 11:32:20]开始样本表模型回溯‑子模型回溯',
        '[2026-07-20 16:09:56]结束样本表模型回溯‑子模型回溯',
        '[2026-07-20 16:09:56]开始样本表模型回溯‑父模型回溯',
        '[2026-07-20 20:49:12]结束样本表模型回溯‑父模型回溯'
      ],
      sub_models: [
        {
          model_version: 'V2',
          successInfo: [
            '[2026-07-20 11:37:20][session=760][子任务=2025-10-01][耗时=4m51s]:执行成功!',
            '[2026-07-20 11:37:20][session=761][子任务=2025-10-02][耗时=4m40s]:执行成功!',
            '[2026-07-20 11:39:20][session=761][子任务=2025-10-03][耗时=1m40s]:执行成功!'
          ],
          result_table: 'model.u21010220_bdzd_zy_v1_recusive_2_3_mbt428416_1',
          errorInfo: [],
          progress: '100.0000%',
          model_id: '2025011708517133',
          state: 2
        }
      ],
      main_model: {
        model_version: 'V3',
        successInfo: [
          '[2026-07-20 16:15:26][session=767][子任务=2025-10-01][耗时=5m20s]:执行成功!',
          '[2026-07-20 16:16:16][session=768][子任务=2025-10-02][耗时=6m0s]:执行成功!',
          '[2026-07-20 16:17:16][session=767][子任务=2025-10-03][耗时=1m30s]:执行成功!'
        ],
        result_table: 'model.u21010220_bdzd_zy_v1_recusive_2_3_mbt428416',
        errorInfo: []
      }
    },
    createTime: '2026-07-20T20:49:12.000Z',
    updateTime: '2026-07-20T20:49:12.000Z',
    config: {
      table: 'dw.user_profile',
      sourceType: 'doris',
      dbName: 'risk_dw',
      tableName: 'dw.user_profile',
      mode: 'single',
      observeDate: '',
      dateRange: ['2026-07-01', '2026-07-31'],
      serviceName: 'credit_score_v3',
      version: 'V3',
      taskName: '信用评分V3-全量回溯',
      sqlWhere: "dt >= '2026-07-01' AND dt <= '2026-07-31' AND cert_no IS NOT NULL",
      featurePersist: true,
      inputMappings: [
        { input: 'age', target: 'user_age', from: '当前模型' },
        { input: 'income', target: 'user_income', from: '当前模型' },
        { input: 'credit_history', target: 'credit_history', from: '当前模型' }
      ],
      outputs: seedOutputs,
      requiredFieldMappings: [
        { field: 'product_id', target: 'product_id', isEncrypted: false, required: true },
        { field: 'flow_id', target: 'flow_id', isEncrypted: false, required: true },
        { field: 'data_dt', target: 'data_dt', isEncrypted: false, required: true },
        { field: 'business_code', target: '', isEncrypted: false, required: false },
        { field: 'session_number', target: '', isEncrypted: false, required: false }
      ],
      // 落表目标（多模型渠道专属汇总表-支付宝）
      landingForm: { summary: true, summaryType: 'channel', channelCode: 'alipay', singleModel: false, singleTableType: '' },
      // 场景标签
      sceneTags: ['反欺诈'],
      // 主模型分指定
      mainScoreField: 'score',
      // 关联方式
      associationMethod: 'flow_id'
    }
  }
  tasks.unshift(t3)

  // 真实样例2：单模型日志（layers 为数字 0，耗时=49m41s 带等号）
  const t4 = {
    id: 4,
    status: BACKTRACK_STATUS.COMPLETED,
    progress: [],
    result: { total: 0, success: 0, failed: 0, samples: [] },
    featurePersist: [],
    logType: 'single',
    log: {
      layers: 0,
      result: {
        stages: [
          '[2026-08-14 08:39:40]开始前置处理征信宽表',
          '[2026-08-14 09:29:22]前置处理征信宽表完成,耗时=49m41s',
          '[2026-08-14 09:29:24]开始样本表模型回溯',
          '[2026-08-14 12:51:50]结束样本表模型回溯'
        ],
        main_model: {
          model_version: 'V1',
          successInfo: [
            '[2026-08-14 09:33:54][session=2841][子任务=20251002][耗时=4m10s]:执行成功!',
            '[2026-08-14 09:34:14][session=2840][子任务=20251001][耗时=4m41s]:执行成功!',
            '[2026-08-14 09:35:34][session=2841][子任务=20251003][耗时=1m20s]:执行成功!',
            '[2026-08-14 09:36:14][session=2840][子任务=20251007][耗时=1m40s]:执行成功!',
            '[2026-08-14 09:37:14][session=2841][子任务=20251005][耗时=1m20s]:执行成功!'
          ]
        }
      }
    },
    createTime: '2026-08-14T12:51:50.000Z',
    updateTime: '2026-08-14T12:51:50.000Z',
    config: {
      table: 'dw.user_credit_v1',
      sourceType: 'doris',
      dbName: 'risk_dw',
      tableName: 'dw.user_credit_v1',
      mode: 'periodic',
      observeDate: '',
      dateRange: ['2026-08-01', '2026-08-14'],
      serviceName: 'risk_score_v1',
      version: 'V1',
      taskName: '风险评分V1-周期回溯',
      sqlWhere: "dt >= '2026-08-01' AND dt <= '2026-08-14' AND status = 'active'",
      featurePersist: false,
      inputMappings: [
        { input: 'age', target: 'user_age', from: '当前模型' },
        { input: 'income', target: 'user_income', from: '当前模型' }
      ],
      outputs: seedOutputs,
      requiredFieldMappings: [
        { field: 'product_id', target: 'product_id', isEncrypted: false, required: true },
        { field: 'flow_id', target: 'flow_id', isEncrypted: false, required: true },
        { field: 'data_dt', target: 'data_dt', isEncrypted: false, required: true },
        { field: 'business_code', target: '', isEncrypted: false, required: false },
        { field: 'session_number', target: '', isEncrypted: false, required: false }
      ],
      // 落表目标（单模型独立表-离线）
      landingForm: { summary: false, summaryType: '', channelCode: '', singleModel: true, singleTableType: 'offline' },
      // 场景标签（周期任务首次配置沿用）
      sceneTags: ['贷后'],
      // 主模型分指定
      mainScoreField: 'score',
      // 关联方式
      associationMethod: 'flow_id',
      periodicity: 'daily',
      weekDays: ['1', '2', '3', '4', '5'],
      monthDays: [],
      triggerType: 'schedule',
      scheduleTime: '08:30',
      kangarooTaskId: 'task-004',
      taskStartDate: '2026-08-01',
      taskEndDate: '2026-12-31'
    }
  }
  tasks.unshift(t4)
  idSeq = 5
})()

export function createBacktrack(data) {
  const id = idSeq++
  const now = new Date().toISOString()
  const status = data.status || BACKTRACK_STATUS.RUNNING
  // 构造样例结果
  const outputs = Array.isArray(data.outputs) ? data.outputs : []
  const sample = (idx) => ({ idx, output: Object.fromEntries(outputs.map(o => [o.name, o.type === 'number' ? Math.round(Math.random()*100)/100 : 'ok'])) })
  // 模块A P0：勾选 featurePersist 时，构建入参特征文件；未勾选 -> 部分成功状态 + 空数组
  const featurePersistEnabled = !!data.featurePersist
  const persistedStatus = featurePersistEnabled
    ? status
    : (status === BACKTRACK_STATUS.RUNNING ? BACKTRACK_STATUS.PARTIAL_SUCCESS : status)
  const featurePersistRows = featurePersistEnabled
    ? (Array.isArray(data.inputMappings) ? data.inputMappings.filter(m => m.target).map(m => ({
        feature_name: m.input,
        feature_value: '',
        feature_source: '当前模型',
        mapped_feature_id: m.target,
        // 关联变量中心特征编码（如果该入参已映射到变量中心特征）
        midloan_feature_id: m.midloan_feature_id || '',
        backtrace_id: `bt_${id}`
      })) : [])
    : []
  const task = {
    id,
    status: persistedStatus,
    progress: status === BACKTRACK_STATUS.DRAFT ? [] : [
      { key: 'init', name: '初始化', status: 'done', time: now },
      { key: 'pull', name: '拉取样本', status: 'running', time: now },
      { key: 'map', name: '参数匹配', status: 'pending', time: '' },
      { key: 'execute', name: '执行模型', status: 'pending', time: '' },
      { key: 'finish', name: '完成', status: 'pending', time: '' }
    ],
    result: status === BACKTRACK_STATUS.DRAFT ? null : {
      total: 3,
      success: 3,
      failed: 0,
      samples: [sample(1), sample(2), sample(3)]
    },
    featurePersist: featurePersistRows,
    logType: 'single',
    log: buildSingleModelLog(now),
    createTime: now,
    updateTime: now,
    config: {
      ...data,
      periodicity: data.periodicity || 'daily',
      weekDays: data.weekDays || [],
      monthDays: data.monthDays || [],
      triggerType: data.triggerType || 'schedule',
      scheduleTime: data.scheduleTime || null,
      kangarooTaskId: data.kangarooTaskId || ''
    }
  }
  tasks.unshift(task)
  return task
}

export function getBacktracks(params = {}) {
  const { page = 1, pageSize = 10 } = params
  const start = (page - 1) * pageSize
  const end = start + pageSize
  return { data: tasks.slice(start, end), total: tasks.length, page, pageSize }
}

export function getBacktrackDetail(id) {
  const t = tasks.find(x => x.id === parseInt(id))
  if (!t) return null
  return t
}

export function updateBacktrackProgress(id, patch) {
  const t = tasks.find(x => x.id === parseInt(id))
  if (!t) return null

  if (patch.status) {
    t.status = patch.status
  }

  // 更新进度
  if (patch.progress) {
    t.progress = patch.progress
    // 如果进度完成，更新状态
    const allDone = t.progress.every(p => p.status === 'done')
    if (allDone) {
      t.status = 'completed'
      // 为完成的任务生成报告数据
      if (!t.report) {
        t.report = {
          accuracy: Math.round((85 + Math.random() * 10) * 100) / 100,
          recall: Math.round((80 + Math.random() * 15) * 100) / 100,
          f1Score: Math.round((0.8 + Math.random() * 0.15) * 100) / 100,
          dataDistribution: [
            { category: '高风险', count: Math.floor(100 + Math.random() * 100), percentage: '15%' },
            { category: '中风险', count: Math.floor(300 + Math.random() * 100), percentage: '35%' },
            { category: '低风险', count: Math.floor(400 + Math.random() * 200), percentage: '50%' }
          ],
          featureImportance: [
            { feature: '信用历史', score: Math.round((0.8 + Math.random() * 0.1) * 100) / 100, rank: 1 },
            { feature: '收入水平', score: Math.round((0.6 + Math.random() * 0.2) * 100) / 100, rank: 2 },
            { feature: '年龄', score: Math.round((0.5 + Math.random() * 0.2) * 100) / 100, rank: 3 },
            { feature: '工作稳定性', score: Math.round((0.4 + Math.random() * 0.2) * 100) / 100, rank: 4 }
          ]
        }
      }
    }
  }

  // 更新结果
  if (patch.result) {
    t.result = { ...t.result, ...patch.result }
  }

  t.updateTime = new Date().toISOString()
  return t
}

export function logOperation(data) {
  const log = {
    id: logIdSeq++,
    backtrackId: data.backtrackId,
    operation: data.operation,
    operator: data.operator || '当前用户',
    detail: data.detail || '',
    createTime: new Date().toISOString()
  }
  operationLogs.unshift(log)
  return log
}

export function getOperationLogs(backtrackId) {
  return operationLogs.filter(l => String(l.backtrackId) === String(backtrackId))
}

export default {
  createBacktrack,
  getBacktracks,
  getBacktrackDetail,
  updateBacktrackProgress,
  logOperation,
  getOperationLogs,
  BACKTRACK_STATUS,
  SCENE_TAGS,
  LANDING_CHANNELS,
  REQUIRED_FIELD_DEFS,
  ASSOCIATION_METHODS
}
