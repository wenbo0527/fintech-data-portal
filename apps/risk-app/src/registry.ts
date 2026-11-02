/**
 * risk-app 微应用注册配置
 * 本文件定义 risk-app 的菜单、路由等信息，供主应用 Shell 自动发现并加载
 */
// PM 9:43 G 选项 + 候选 #172 v3.0 A' 扩权 + 候选 #024 P0 chown + chmod ops 派工
// dev 立即修复 + skipLibCheck + P0 跳过 + per-command --author
// G 选项 = G + 9 mock + 7 stores/types = 110 errors

/**
 * 旧「评估任务中心」Tab 键 → 新「任务管理」Tab 键
 * 任务管理只有 tasks / scripts 两 Tab，判定配置已下沉为任务级配置（旧 settings 链接落回任务列表）
 */
const LEGACY_TASK_TABS: Record<string, string> = {
  tasks: 'tasks',
  evaluation: 'tasks',
  effect: 'tasks',
  scripts: 'scripts',
  settings: 'tasks'
}

const registry: any = {
  app: {
    name: 'risk-app',
    version: '1.0.0',
    description: '数字风险子应用（风险要素 / 外数生命周期 / 预算 / 离线模型 / 陪跑计划）'
  },
  basePath: '/risk',
  entry: 'http://localhost:5176',
  menu: [
    {
      key: 'risk-workbench',
      label: '风险数据生命周期',
      icon: 'icon-data-line',
      path: '/risk/variable-hub',
      order: 1,
      children: [
        { key: 'risk-factor-workbench', label: '风险要素工作台', path: '/risk/variable-hub' },
        { key: 'risk-factor-variable-mgmt', label: '特征台账', path: '/risk/variable-management' },
        { key: 'risk-factor-variable-map', label: '特征全景', path: '/risk/explore/map' },
        // 评估任务 / 效果任务 / 脚本管理 / 判定配置 合入一个任务管理入口
        { key: 'risk-factor-task-center', label: '任务管理', path: '/risk/tasks' },
        { key: 'risk-factor-run-record', label: '执行记录', path: '/risk/runs' },
        { key: 'risk-factor-topics', label: '探索课题', path: '/risk/explore/topics' },
        { key: 'risk-factor-taxonomy', label: '探索分类管理', path: '/risk/explore/taxonomy' },
        { key: 'risk-external-data-lifecycle', label: '外数生命周期', path: '/risk/variable-hub/external-data/lifecycle' },
        { key: 'risk-external-data-credit-agency', label: '征信机构管理', path: '/risk/variable-hub/external-data/credit-agency' },
        { key: 'risk-external-data-archive', label: '外数档案', path: '/risk/variable-hub/external-data/archive' },
        { key: 'risk-external-data-evaluation', label: '外数评估', path: '/risk/variable-hub/external-data/evaluation' },
        { key: 'risk-external-data-service-scene', label: '服务场景入口', path: '/risk/variable-hub/external-data/service-scene' },
        { key: 'risk-external-data-backtrack-persist', label: '外数回溯落库申请', path: '/risk/variable-hub/external-data/backtrack-persist' },
        { key: 'risk-external-data-task-list', label: '服务任务列表', path: '/risk/variable-hub/external-data/task-list' },
        { key: 'risk-external-data-sample', label: '样本表准备', path: '/risk/variable-hub/external-data/sample-preparation' },
        { key: 'risk-external-data-validation', label: '服务校验模版', path: '/risk/variable-hub/external-data/validation-template' },
        { key: 'risk-budget-overview', label: '预算总览', path: '/risk/budget/overview' },
        { key: 'risk-budget-list', label: '预算列表', path: '/risk/budget/list' },
        { key: 'risk-budget-monitor', label: '预算监控', path: '/risk/budget/monitor' },
        { key: 'risk-budget-contracts', label: '合同管理', path: '/risk/budget/contracts' },
        { key: 'risk-budget-sign-reports', label: '签报管理', path: '/risk/budget/sign-reports' },
        { key: 'risk-budget-settlement', label: '结算管理', path: '/risk/budget/settlement' },
        { key: 'risk-accompany-list', label: '陪跑列表', path: '/risk/accompany' },
        { key: 'risk-accompany-create', label: '创建陪跑', path: '/risk/accompany/create' },
        { key: 'risk-accompany-result', label: '陪跑结果', path: '/risk/accompany/result' }
      ]
    }
  ],
  routes: [
    {
      path: '/',
      redirect: '/risk'
    },
    {
      path: 'index',
      name: 'RiskIndex',
      component: './pages/index.vue',
      meta: { title: '数字风险' }
    },
    // 风险要素（特征一体化）
    { path: 'variable-hub',                  name: 'VariableHub',            component: './modules/variable-hub/pages/workbench/index.vue', meta: { title: '风险要素工作台' } },
    { path: 'variable-management',           name: 'VariableManagement',     component: './modules/variable-hub/pages/variable-management/index.vue', meta: { title: '特征台账' } },
    { path: 'variable-management/detail/:id/:mode?', name: 'VariableAssetDetail', component: './modules/variable-hub/pages/variable-management/detail.vue', meta: { title: '特征详情' } },
    { path: 'explore/topics',                name: 'ExploreTopics',          component: './modules/variable-hub/pages/explore/topics/index.vue', meta: { title: '探索课题' } },
    { path: 'explore/topics/:id',            name: 'ExploreTopicDetail',     component: './modules/variable-hub/pages/explore/topics/detail.vue', meta: { title: '课题详情' } },
    { path: 'explore/compare',               name: 'ExploreCompare',         component: './modules/variable-hub/pages/explore/compare/index.vue', meta: { title: '实验对比' } },
    { path: 'explore/map',                   name: 'ExploreMap',             component: './modules/variable-hub/pages/explore/map/index.vue', meta: { title: '特征全景' } },
    { path: 'explore/taxonomy',              name: 'ExploreTaxonomy',        component: './modules/variable-hub/pages/explore/taxonomy/index.vue', meta: { title: '探索分类管理' } },
    { path: 'explore/audit',                 name: 'ExploreAudit',           component: './modules/variable-hub/pages/explore/audit/index.vue', meta: { title: '决策审计' } },
    // 任务管理（两 Tab：任务列表 / 脚本管理；判定配置已下沉为任务级配置）
    { path: 'tasks',                        name: 'TaskCenter',             component: './modules/variable-hub/pages/task-center/index.vue', meta: { title: '任务管理' } },
    { path: 'tasks/evaluation/create',      name: 'EvaluationTaskCreate',   component: './modules/variable-hub/pages/evaluation/tasks/create.vue', meta: { title: '新建常态性评估' } },
    { path: 'tasks/evaluation/edit/:id',    name: 'EvaluationTaskEdit',     component: './modules/variable-hub/pages/evaluation/tasks/create.vue', meta: { title: '编辑常态性评估' } },
    { path: 'tasks/scripts/:id',            name: 'EvaluationScriptDetail', component: './modules/variable-hub/pages/evaluation/scripts/detail.vue', meta: { title: '脚本详情' } },
    { path: 'tasks/effect/create',          name: 'EffectTaskCreate',       component: './modules/variable-hub/pages/effect-tasks/create.vue', meta: { title: '新建效果任务' } },
    { path: 'tasks/effect/:id',             name: 'EffectTaskDetail',       component: './modules/variable-hub/pages/effect-tasks/detail.vue', meta: { title: '效果任务详情' } },
    // 执行记录（特征评估 + 效果运营的全域跑批实例）
    { path: 'runs',                         name: 'RunRecordList',          component: './modules/variable-hub/pages/run-record/index.vue', meta: { title: '执行记录' } },
    { path: 'runs/:id',                     name: 'RunRecordDetail',        component: './modules/variable-hub/pages/run-record/detail.vue', meta: { title: '执行实例详情' } },
    // 旧路径兼容：菜单收敛前后的外链与收藏一律重定向，Tab 键同步迁移（runs 已升为一级页面）
    {
      path: 'evaluation/tasks',
      redirect: (to: any) => {
        const query: Record<string, unknown> = { ...(to.query || {}) }
        const legacy = String(query.tab || 'tasks')
        delete query.tab
        if (legacy === 'runs') {
          return { path: '/risk/runs', query }
        }
        const tab = LEGACY_TASK_TABS[legacy] || 'tasks'
        return { path: '/risk/tasks', query: { ...query, tab } }
      }
    },
    { path: 'evaluation/tasks/create',   redirect: '/risk/tasks/evaluation/create' },
    { path: 'evaluation/tasks/edit/:id', redirect: (to: any) => ({ path: `/risk/tasks/evaluation/edit/${to.params.id}`, query: to.query }) },
    { path: 'evaluation/scripts',        redirect: '/risk/tasks?tab=scripts' },
    { path: 'evaluation/scripts/:id',    redirect: (to: any) => ({ path: `/risk/tasks/scripts/${to.params.id}`, query: to.query }) },
    { path: 'evaluation/runs',           redirect: '/risk/runs' },
    { path: 'evaluation/runs/:id',       redirect: (to: any) => ({ path: `/risk/runs/${to.params.id}`, query: to.query }) },
    { path: 'effect-tasks',              redirect: '/risk/tasks?tab=tasks' },
    // 旧「判定配置」独立入口已废弃：落回任务列表，改阈值去各任务详情的「判定配置」Tab
    { path: 'effect-tasks/settings',     redirect: '/risk/tasks?tab=tasks' },
    { path: 'effect-tasks/create',       redirect: (to: any) => ({ path: '/risk/tasks/effect/create', query: to.query }) },
    { path: 'effect-tasks/:id',          redirect: (to: any) => ({ path: `/risk/tasks/effect/${to.params.id}`, query: to.query }) },
    // 外数生命周期
    {
      path: 'variable-hub/external-data',
      name: 'ExternalDataRoot',
      redirect: 'variable-hub/external-data/lifecycle'
    },
    { path: 'variable-hub/external-data/lifecycle',         name: 'RiskExternalDataLifecycle',          component: './modules/external-data/pages/Lifecycle.vue', meta: { title: '外数生命周期' } },
    { path: 'variable-hub/external-data/lifecycle/:id',     name: 'RiskExternalDataLifecycleDetail',    component: './modules/external-data/pages/Lifecycle.vue', meta: { title: '外数生命周期详情' } },
    { path: 'variable-hub/external-data/evaluation',        name: 'RiskExternalDataEvaluation',         component: './modules/external-data/pages/Evaluation.vue', meta: { title: '外数评估' } },
    { path: 'variable-hub/external-data/evaluation/create', name: 'RiskExternalDataEvaluationCreate',   component: './modules/external-data/pages/CreateEvaluation.vue', meta: { title: '创建外数评估' } },
    { path: 'variable-hub/external-data/evaluation/:id',    name: 'RiskExternalDataEvaluationDetail',   component: './modules/external-data/pages/EvaluationDetail.vue', meta: { title: '评估详情' } },
    { path: 'variable-hub/external-data/archive',           name: 'RiskExternalDataArchive',            component: './modules/external-data/pages/Archive.vue', meta: { title: '外数档案' } },
    { path: 'variable-hub/external-data/archive/:id',       name: 'RiskExternalDataArchiveDetail',      component: './modules/external-data/pages/ArchiveDetail.vue', meta: { title: '档案详情' } },
    // 旧「外数服务申请」页面已下线，服务申请入口统一收敛到「服务场景入口」
    { path: 'variable-hub/external-data/service',           redirect: 'variable-hub/external-data/service-scene' },
    { path: 'variable-hub/external-data/service-scene',     name: 'RiskExternalDataServiceScene',       component: './modules/external-data/pages/ServiceScene.vue', meta: { title: '服务场景入口' } },
    { path: 'variable-hub/external-data/sample-preparation',name: 'RiskExternalDataSamplePreparation',  component: './modules/external-data/pages/SamplePreparation.vue', meta: { title: '样本表准备' } },
    { path: 'variable-hub/external-data/sample-preparation/create', name: 'RiskExternalDataSamplePreparationCreate', component: './modules/external-data/pages/SamplePreparationCreate.vue', meta: { title: '新建样本表' } },
    { path: 'variable-hub/external-data/sample-preparation/edit/:id', name: 'RiskExternalDataSamplePreparationEdit', component: './modules/external-data/pages/SamplePreparationCreate.vue', meta: { title: '编辑样本表' } },
    { path: 'variable-hub/external-data/validation-template', name: 'RiskExternalDataValidationTemplate', component: './modules/external-data/pages/ServiceValidationTemplate.vue', meta: { title: '服务校验模版管理' } },
    { path: 'variable-hub/external-data/online-call-application', name: 'RiskExternalDataOnlineCallApplication', component: './modules/external-data/pages/OnlineCallApplication.vue', meta: { title: '外数线上调用服务申请' } },
    { path: 'variable-hub/external-data/backtrack-persist', name: 'RiskExternalDataBacktrackPersist', component: './modules/external-data/pages/BacktrackPersist.vue', meta: { title: '外数回溯落库申请' } },
    { path: 'variable-hub/external-data/task-list',       name: 'RiskExternalDataTaskList',       component: './modules/external-data/pages/TaskList.vue', meta: { title: '服务任务列表' } },
    { path: 'variable-hub/external-data/credit-agency',   name: 'RiskExternalDataCreditAgency',   component: './modules/external-data/pages/CreditAgency.vue', meta: { title: '征信机构管理' } },
    // 预算管理
    { path: 'budget/overview',          name: 'BudgetOverview',          component: './modules/budget/pages/Overview.vue', meta: { title: '预算总览' } },
    { path: 'budget/monitor',           name: 'RiskBudgetMonitorPage',   component: './modules/budget/pages/Monitor.vue', meta: { title: '预算监控' } },
    { path: 'budget/contracts',         name: 'RiskBudgetContracts',     component: './modules/budget/pages/Contracts.vue', meta: { title: '合同管理' } },
    { path: 'budget/contracts/:id',     name: 'RiskBudgetContractDetail', component: './modules/budget/pages/ContractDetail.vue', meta: { title: '合同详情' } },
    { path: 'budget/contracts/create',  name: 'RiskBudgetContractCreate', component: './modules/budget/pages/ContractCreate.vue', meta: { title: '新建合同' } },
    { path: 'budget/sign-reports',        name: 'RiskBudgetSignReports',      component: './modules/budget/pages/SignReports.vue', meta: { title: '签报管理' } },
    { path: 'budget/sign-reports/new',     name: 'RiskBudgetSignReportCreate',  component: './modules/budget/pages/SignReportDetail.vue', meta: { title: '新增签报' } },
    { path: 'budget/sign-reports/:id',    name: 'RiskBudgetSignReportDetail', component: './modules/budget/pages/SignReportDetail.vue', meta: { title: '签报详情' } },
    { path: 'budget/settlement',        name: 'RiskBudgetSettlement',    component: './modules/budget/pages/Settlement.vue', meta: { title: '结算管理' } },
    { path: 'budget/settlement/task/new',  name: 'RiskBudgetSettlementTaskNew', component: './modules/budget/pages/TaskPage.vue', meta: { title: '创建结算任务' } },
    { path: 'budget/settlement/task/:id',  name: 'RiskBudgetSettlementTask',    component: './modules/budget/pages/TaskPage.vue', meta: { title: '结算任务' } },
    { path: 'budget/accounting',        name: 'RiskBudgetAccounting',    component: './modules/budget/pages/Accounting.vue', meta: { title: '核算流程' } },
    { path: 'budget/list',              name: 'RiskBudgetList',          component: './modules/budget/pages/List.vue', meta: { title: '预算列表' } },
    { path: 'budget/create',            name: 'RiskBudgetCreate',        component: './modules/budget/pages/Create.vue', meta: { title: '新建预算' } },
    { path: 'budget/edit/:id',          name: 'RiskBudgetEdit',          component: './modules/budget/pages/Edit.vue', meta: { title: '编辑预算' } },
    { path: 'budget/detail/:id',        name: 'RiskBudgetDetail',        component: './modules/budget/pages/Detail.vue', meta: { title: '预算详情' } },
    // 陪跑计划
    { path: 'accompany',                name: 'RiskAccompany',           component: './modules/accompany/pages/index.vue', meta: { title: '陪跑计划' } },
    { path: 'accompany/create',         name: 'RiskAccompanyCreate',     component: './modules/accompany/pages/create.vue', meta: { title: '创建陪跑' } },
    { path: 'accompany/result',         name: 'RiskAccompanyResult',     component: './modules/accompany/pages/result.vue', meta: { title: '陪跑结果' } }
  ],
  lifecycle: {
    mount: () => {
      console.log('[risk-app] Mounted')
    },
    unmount: () => {
      console.log('[risk-app] Unmounted')
    }
  }
}

export default registry
