/**
 * 定时任务 Mock(F22 / F23 / F36,数据取自设计文档 §5.4)
 *
 * scriptName 与 scripts.ts 的脚本名对应,体现跨模块数据联动。
 */
import type { TaskExecHistory, TaskRecord } from './types'

/** 默认通知配置(F27) */
const DEFAULT_NOTIFY = {
  notifyOnSuccess: false,
  notifyOnFailed: true,
  successChannel: 'dingtalk' as const,
  failedChannel: 'dingtalk' as const,
  timeoutMinutes: 0,
  maxConsecutiveFailures: 3
}

/** 默认高级设置(F28) */
const DEFAULT_ADVANCED = {
  retryCount: 3,
  retryInterval: 5,
  skipBacklog: false
}

export const SEED_TASKS: TaskRecord[] = [
  {
    id: 'T2001',
    name: '每日放款日报',
    datasource: 'doris',
    status: 'success',
    schedule: '每天 02:00',
    cronExpression: '0 0 2 * * ?',
    lastRun: '2026-09-03 02:00:12',
    nextRun: '2026-09-04 02:00:00',
    scriptName: '每日放款量统计',
    notify: { ...DEFAULT_NOTIFY, notifyOnSuccess: true },
    advanced: { ...DEFAULT_ADVANCED }
  },
  {
    id: 'T2002',
    name: '风控指标汇总',
    datasource: 'doris',
    status: 'success',
    schedule: '每天 03:30',
    cronExpression: '0 30 3 * * ?',
    lastRun: '2026-09-03 03:30:41',
    nextRun: '2026-09-04 03:30:00',
    scriptName: '团队-风控指标汇总',
    notify: { ...DEFAULT_NOTIFY },
    advanced: { ...DEFAULT_ADVANCED, retryCount: 5 }
  },
  {
    id: 'T2003',
    name: '逾期率监控',
    datasource: 'hive',
    status: 'failed',
    schedule: '每小时',
    cronExpression: '0 0 * * * ?',
    lastRun: '2026-09-03 09:00:05',
    nextRun: '2026-09-03 10:00:00',
    scriptName: '逾期率趋势查询',
    notify: { ...DEFAULT_NOTIFY, maxConsecutiveFailures: 5 },
    advanced: { ...DEFAULT_ADVANCED }
  },
  {
    id: 'T2004',
    name: '渠道转化周报',
    datasource: 'doris',
    status: 'running',
    schedule: '每周一 07:00',
    cronExpression: '0 0 7 ? * MON',
    lastRun: '2026-08-26 07:00:18',
    nextRun: '2026-09-03 07:00:00',
    scriptName: '渠道转化漏斗',
    notify: { ...DEFAULT_NOTIFY, notifyOnSuccess: true },
    advanced: { ...DEFAULT_ADVANCED }
  },
  {
    id: 'T2005',
    name: '客户画像标签统计',
    datasource: 'hive',
    status: 'success',
    schedule: '每天 05:00',
    cronExpression: '0 0 5 * * ?',
    lastRun: '2026-09-03 05:00:27',
    nextRun: '2026-09-04 05:00:00',
    scriptName: '团队-客户等级分布周报',
    notify: { ...DEFAULT_NOTIFY },
    advanced: { ...DEFAULT_ADVANCED, skipBacklog: true }
  },
  {
    id: 'T2006',
    name: '还款率日报',
    datasource: 'doris',
    status: 'success',
    schedule: '每天 06:00',
    cronExpression: '0 0 6 * * ?',
    lastRun: '2026-09-03 06:00:09',
    nextRun: '2026-09-04 06:00:00',
    scriptName: '团队-日报模板',
    notify: { ...DEFAULT_NOTIFY },
    advanced: { ...DEFAULT_ADVANCED }
  },
  {
    id: 'T2007',
    name: '营销活动效果周报',
    datasource: 'doris',
    status: 'disabled',
    schedule: '每周五 18:00',
    cronExpression: '0 0 18 ? * FRI',
    lastRun: '2026-08-29 18:00:33',
    nextRun: null,
    scriptName: '渠道转化漏斗',
    notify: { ...DEFAULT_NOTIFY },
    advanced: { ...DEFAULT_ADVANCED }
  },
  {
    id: 'T2008',
    name: '风控规则命中统计',
    datasource: 'hive',
    status: 'failed',
    schedule: '每天 04:00',
    cronExpression: '0 0 4 * * ?',
    lastRun: '2026-09-03 04:00:02',
    nextRun: '2026-09-04 04:00:00',
    scriptName: '风控审批通过率',
    notify: { ...DEFAULT_NOTIFY, maxConsecutiveFailures: 2 },
    advanced: { ...DEFAULT_ADVANCED, retryCount: 5, retryInterval: 10 }
  }
]

/** 任务执行历史 Mock(F34) */
export const SEED_TASK_HISTORY: TaskExecHistory[] = [
  { id: 'H001', taskId: 'T2001', runAt: '2026-09-03 02:00:12', status: 'success', duration: '1.2s', rowCount: 156 },
  { id: 'H002', taskId: 'T2001', runAt: '2026-09-02 02:00:08', status: 'success', duration: '1.1s', rowCount: 148 },
  { id: 'H003', taskId: 'T2001', runAt: '2026-09-01 02:00:15', status: 'success', duration: '1.3s', rowCount: 162 },
  { id: 'H004', taskId: 'T2001', runAt: '2026-08-31 02:00:10', status: 'success', duration: '1.0s', rowCount: 140 },
  { id: 'H005', taskId: 'T2001', runAt: '2026-08-30 02:00:20', status: 'failed', duration: '0.8s', rowCount: 0, errorMsg: '连接超时,Doris BE 不可达' },
  { id: 'H006', taskId: 'T2003', runAt: '2026-09-03 09:00:05', status: 'failed', duration: '0.5s', rowCount: 0, errorMsg: '表 dws_risk_summary 不存在或无权限' },
  { id: 'H007', taskId: 'T2003', runAt: '2026-09-03 08:00:03', status: 'failed', duration: '0.4s', rowCount: 0, errorMsg: '表 dws_risk_summary 不存在或无权限' },
  { id: 'H008', taskId: 'T2003', runAt: '2026-09-03 07:00:12', status: 'failed', duration: '0.6s', rowCount: 0, errorMsg: '表 dws_risk_summary 不存在或无权限' },
  { id: 'H009', taskId: 'T2008', runAt: '2026-09-03 04:00:02', status: 'failed', duration: '0.5s', rowCount: 0, errorMsg: 'Hive 会话超时' },
  { id: 'H010', taskId: 'T2008', runAt: '2026-09-02 04:00:08', status: 'success', duration: '2.1s', rowCount: 85 },
  { id: 'H011', taskId: 'T2008', runAt: '2026-09-01 04:00:15', status: 'success', duration: '2.3s', rowCount: 90 },
  // T2006 还款率日报(每天 06:00)· 近 7 天执行历史
  { id: 'H012', taskId: 'T2006', runAt: '2026-09-03 06:00:09', status: 'success', duration: '1.4s', rowCount: 218 },
  { id: 'H013', taskId: 'T2006', runAt: '2026-09-02 06:00:11', status: 'success', duration: '1.3s', rowCount: 210 },
  { id: 'H014', taskId: 'T2006', runAt: '2026-09-01 06:00:08', status: 'failed', duration: '0.6s', rowCount: 0, errorMsg: 'Doris 副本写入失败,主键冲突' },
  { id: 'H015', taskId: 'T2006', runAt: '2026-08-31 06:00:14', status: 'success', duration: '1.5s', rowCount: 222 },
  { id: 'H016', taskId: 'T2006', runAt: '2026-08-30 06:00:10', status: 'success', duration: '1.4s', rowCount: 215 },
  { id: 'H017', taskId: 'T2006', runAt: '2026-08-29 06:00:12', status: 'success', duration: '1.3s', rowCount: 209 },
  { id: 'H018', taskId: 'T2006', runAt: '2026-08-28 06:00:15', status: 'success', duration: '1.5s', rowCount: 224 }
]

/** 同事列表 Mock(F18 共享弹窗) */
export const COLLEAGUES = [
  { value: '刘芳', label: '刘芳', dept: '数据中台部' },
  { value: '陈明', label: '陈明', dept: '风险管理部' },
  { value: '周涛', label: '周涛', dept: '零售业务部' },
  { value: '李娜', label: '李娜', dept: '数据中台部' },
  { value: '王强', label: '王强', dept: '信息技术部' }
]

/** 概览看板指标卡(F22) */
export const TASK_OVERVIEW_CARDS = [
  { key: 'total', title: '任务总数', value: 8, unit: '个', tone: 'default' },
  { key: 'success', title: '昨日成功', value: 5, unit: '个', tone: 'success' },
  { key: 'failed', title: '昨日失败', value: 2, unit: '个', tone: 'danger' },
  { key: 'running', title: '运行中', value: 1, unit: '个', tone: 'warning' }
]

/** 概览看板:近 7 日执行趋势(F22 迷你柱状) */
export const TASK_TREND_7D = [
  { date: '08-28', success: 6, failed: 1 },
  { date: '08-29', success: 7, failed: 0 },
  { date: '08-30', success: 5, failed: 2 },
  { date: '08-31', success: 7, failed: 1 },
  { date: '09-01', success: 6, failed: 1 },
  { date: '09-02', success: 8, failed: 0 },
  { date: '09-03', success: 5, failed: 2 }
]

/** 常用调度频率预设(F25-F29 P1 用,P0 仅在详情抽屉展示) */
export const SCHEDULE_PRESETS = ['每小时', '每天 02:00', '每天 06:00', '每周一 07:00', '每月 1 日 08:00']
