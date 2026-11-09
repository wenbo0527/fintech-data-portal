// 模型回溯 Mock 持久化

const tasks = []
let idSeq = 1;

// 预置一个示例任务，便于直接查看详情演示
(function seed() {
  const now = new Date().toISOString()
  const seedOutputs = [
    { name: 'score', type: 'number', description: '风险评分' },
    { name: 'label', type: 'number', description: '预测标签' }
  ]
  const sample = (idx) => ({ idx, output: { score: Math.round(Math.random()*100)/100, label: Math.round(Math.random()) } })
  const t = {
    id: 1,
    status: 'completed',
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
    createTime: now,
    updateTime: now,
    config: {
      table: 'user_profile',
      sourceType: 'doris',
      dbName: 'risk_dw',
      tableName: 'user_profile',
      mode: 'single',
      observeDate: '',
      dateRange: [],
      serviceName: 'credit_score_service',
      inputMappings: [
        { input: 'age', target: 'age' },
        { input: 'income', target: 'income' },
        { input: 'credit_history', target: 'credit_history' }
      ],
      outputs: seedOutputs,
      requiredFieldMappings: [
        { field: 'cert_no', target: 'cert_no' },
        { field: 'flow_id', target: 'flow_id' },
        { field: 'report_id', target: 'report_id' }
      ],
      // 周期回溯相关字段
      periodicity: 'daily',
      weekDays: ['1'], // 默认每周一
      monthDays: ['1'], // 默认每月1号
      triggerType: 'schedule', // 定时触发
      scheduleTime: '09:00', // 默认上午9点执行
      kangarooTaskId: 'task-001'
    }
  }
  tasks.unshift(t)
  idSeq = 2
})()

export function createBacktrack(data) {
  const id = idSeq++
  const now = new Date().toISOString()
  // 构造样例结果
  const outputs = Array.isArray(data.outputs) ? data.outputs : []
  const sample = (idx) => ({ idx, output: Object.fromEntries(outputs.map(o => [o.name, o.type === 'number' ? Math.round(Math.random()*100)/100 : 'ok'])) })
  const task = {
    id,
    status: 'running',
    progress: [
      { key: 'init', name: '初始化', status: 'done', time: now },
      { key: 'pull', name: '拉取样本', status: 'running', time: now },
      { key: 'map', name: '参数匹配', status: 'pending', time: '' },
      { key: 'execute', name: '执行模型', status: 'pending', time: '' },
      { key: 'finish', name: '完成', status: 'pending', time: '' }
    ],
    result: {
      total: 3,
      success: 3,
      failed: 0,
      samples: [sample(1), sample(2), sample(3)]
    },
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
  const t = tasks.find(x => x.id === parseInt(id, 10))
  if (!t) {return null}
  return t
}

export function updateBacktrackProgress(id, patch) {
  const t = tasks.find(x => x.id === parseInt(id, 10))
  if (!t) {return null}

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

export default {
  createBacktrack,
  getBacktracks,
  getBacktrackDetail,
  updateBacktrackProgress
}
