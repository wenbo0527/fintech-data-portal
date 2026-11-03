import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { qiankunWindow } from 'vite-plugin-qiankun/dist/helper'

// Qiankun 环境下使用 qiankun 的 basename
// 独立运行时始终使用 '/risk/' 作为 base，因为静态文件部署在 /risk/ 路径下
const routerBase = qiankunWindow.__POWERED_BY_QIANKUN__ ? (qiankunWindow.ROUTER_BASE || '/risk/') : '/risk/'

console.log('[Risk] routerBase:', routerBase)

/**
 * MainLayout 包裹层 — 为独立运行（iframe 直接加载 risk-app）提供完整导航
 * 所有子路由都作为 MainLayout 的 children，这样它们都在 MainLayout 内渲染，
 * 继承顶部 Tab 栏和左侧菜单。
 *
 * 路由结构：
 *  /                              → /variable-hub（风险要素工作台）
 *  /variable-hub                  → 风险要素（特征一体化）
 *    /variable-hub/external-data  → 外数生命周期管理（子模块）
 *  /tasks                         → 任务管理（两 Tab：任务列表 / 脚本管理）
 *    /tasks/evaluation/create     → 新建常态性评估（独立页）
 *    /tasks/effect/create         → 新建效果任务（独立页，判定配置在新建时就填）
 *    /tasks/effect/:id            → 效果任务详情（含任务级「判定配置」Tab）
 *    /tasks/scripts/:id           → 脚本详情
 *  /runs                          → 执行记录（两域全部跑批实例）
 *    /runs/:id                    → 执行实例详情
 *  /budget/*                      → 预算管理
 *  /model-offline-analysis/*      → 离线模型分析
 *  /accompany/*                   → 陪跑计划
 *  旧路径 /evaluation/*、/effect-tasks/* 全部 redirect 到新结构，外部链接不失效
 */

/** 旧「评估任务中心」Tab 键 → 新「任务管理」Tab 键（runs 已升为一级页面） */
const LEGACY_TASK_TABS: Record<string, string> = {
  tasks: 'tasks',
  evaluation: 'tasks',
  effect: 'tasks',
  scripts: 'scripts',
  /** 判定配置已下沉为任务级配置（在新建 / 效果任务详情里），旧链接落回任务列表 */
  settings: 'tasks'
}
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('./layout/MainLayout.vue'),
    children: [
      // ========== 入口重定向：默认进入风险要素（特征一体化工作台）==========
      { path: '/', redirect: '/variable-hub' },

      // ========== 风险要素（特征一体化）==========
      {
        path: '/variable-hub',
        name: 'VariableHub',
        component: () => import('./modules/variable-hub/pages/workbench/index.vue'),
        meta: { title: '风险要素' }
      },
      {
        path: '/variable-management',
        name: 'VariableManagement',
        component: () => import('./modules/variable-hub/pages/variable-management/index.vue'),
        meta: { title: '特征台账' }
      },
      {
        path: '/variable-management/detail/:id/:mode?',
        name: 'VariableAssetDetail',
        component: () => import('./modules/variable-hub/pages/variable-management/detail.vue'),
        meta: { title: '特征详情' }
      },
      {
        path: '/variable-management/requirement/:id',
        name: 'DerivationDetail',
        component: () => import('./modules/variable-hub/pages/variable-management/requirement-detail.vue'),
        meta: { title: '需求详情' }
      },
      {
        path: '/explore/topics',
        name: 'ExploreTopics',
        component: () => import('./modules/variable-hub/pages/explore/topics/index.vue'),
        meta: { title: '探索课题' }
      },
      {
        path: '/explore/topics/:id',
        name: 'ExploreTopicDetail',
        component: () => import('./modules/variable-hub/pages/explore/topics/detail.vue'),
        meta: { title: '课题详情' }
      },
      {
        path: '/explore/compare',
        name: 'ExploreCompare',
        component: () => import('./modules/variable-hub/pages/explore/compare/index.vue'),
        meta: { title: '实验对比' }
      },
      {
        path: '/explore/map',
        name: 'ExploreMap',
        component: () => import('./modules/variable-hub/pages/explore/map/index.vue'),
        meta: { title: '特征全景' }
      },
      {
        path: '/explore/taxonomy',
        name: 'ExploreTaxonomy',
        component: () => import('./modules/variable-hub/pages/explore/taxonomy/index.vue'),
        meta: { title: '探索分类管理' }
      },
      {
        path: '/explore/audit',
        name: 'ExploreAudit',
        component: () => import('./modules/variable-hub/pages/explore/audit/index.vue'),
        meta: { title: '决策审计' }
      },
      // ========== 任务管理（两 Tab：任务列表 / 脚本管理，判定配置下沉到任务级）==========
      {
        path: '/tasks',
        name: 'TaskCenter',
        component: () => import('./modules/variable-hub/pages/task-center/index.vue'),
        meta: { title: '任务管理' }
      },
      {
        path: '/tasks/evaluation/create',
        name: 'EvaluationTaskCreate',
        component: () => import('./modules/variable-hub/pages/evaluation/tasks/create.vue'),
        meta: { title: '新建常态性评估' }
      },
      {
        path: '/tasks/evaluation/edit/:id',
        name: 'EvaluationTaskEdit',
        component: () => import('./modules/variable-hub/pages/evaluation/tasks/create.vue'),
        meta: { title: '编辑常态性评估' }
      },
      // 注意：静态路径必须声明在动态段之前，否则 create / scripts 会被当成任务 ID
      {
        path: '/tasks/scripts/:id',
        name: 'EvaluationScriptDetail',
        component: () => import('./modules/variable-hub/pages/evaluation/scripts/detail.vue'),
        meta: { title: '脚本详情' }
      },
      {
        path: '/tasks/effect/create',
        name: 'EffectTaskCreate',
        component: () => import('./modules/variable-hub/pages/effect-tasks/create.vue'),
        meta: { title: '新建效果任务' }
      },
      // 注意：create 必须声明在 :id 之前，否则会被当成任务 ID
      {
        path: '/tasks/effect/:id',
        name: 'EffectTaskDetail',
        component: () => import('./modules/variable-hub/pages/effect-tasks/detail.vue'),
        meta: { title: '效果任务详情' }
      },

      // ========== 执行记录（特征评估 + 效果运营的全域跑批实例）==========
      {
        path: '/runs',
        name: 'RunRecordList',
        component: () => import('./modules/variable-hub/pages/run-record/index.vue'),
        meta: { title: '执行记录' }
      },
      {
        path: '/runs/:id',
        name: 'RunRecordDetail',
        component: () => import('./modules/variable-hub/pages/run-record/detail.vue'),
        meta: { title: '执行实例详情' }
      },

      // ========== 旧路径兼容：菜单收敛前后的外链与收藏全部走重定向 ==========
      {
        // 旧「评估任务中心」带 ?tab= 深链，迁到 /tasks 并同步改 Tab 键（runs 已升为一级页面）
        path: '/evaluation/tasks',
        redirect: (to) => {
          const query = { ...to.query }
          const legacy = String(query.tab || 'tasks')
          delete query.tab
          if (legacy === 'runs') {
            return { path: '/runs', query }
          }
          return { path: '/tasks', query: { ...query, tab: LEGACY_TASK_TABS[legacy] || 'tasks' } }
        }
      },
      { path: '/evaluation/tasks/create', redirect: '/tasks/evaluation/create' },
      {
        path: '/evaluation/tasks/edit/:id',
        redirect: (to) => ({ path: `/tasks/evaluation/edit/${to.params.id}`, query: to.query })
      },
      { path: '/evaluation/scripts', redirect: '/tasks?tab=scripts' },
      {
        path: '/evaluation/scripts/:id',
        redirect: (to) => ({ path: `/tasks/scripts/${to.params.id}`, query: to.query })
      },
      { path: '/evaluation/runs', redirect: '/runs' },
      {
        path: '/evaluation/runs/:id',
        redirect: (to) => ({ path: `/runs/${to.params.id}`, query: to.query })
      },
      { path: '/effect-tasks', redirect: '/tasks?tab=tasks' },
      { path: '/effect-tasks/settings', redirect: '/tasks?tab=tasks' },
      {
        // 旧效果任务新建入口：带上原类型参数落回新的类型路由
        path: '/effect-tasks/create',
        redirect: (to) => ({ path: '/tasks/effect/create', query: to.query })
      },
      {
        path: '/effect-tasks/:id',
        redirect: (to) => ({ path: `/tasks/effect/${to.params.id}`, query: to.query })
      },

      // ========== 外数生命周期管理（作为风险要素的子模块）==========
      {
        path: '/variable-hub/external-data',
        name: 'ExternalDataRoot',
        redirect: '/variable-hub/external-data/lifecycle'
      },
      {
        path: '/variable-hub/external-data/lifecycle',
        name: 'RiskExternalDataLifecycle',
        component: () => import('./modules/external-data/pages/Lifecycle.vue'),
        meta: { title: '外数生命周期' }
      },
      {
        path: '/variable-hub/external-data/lifecycle/:id',
        name: 'RiskExternalDataLifecycleDetail',
        component: () => import('./modules/external-data/pages/Lifecycle.vue'),
        meta: { title: '外数生命周期详情' },
        props: true
      },
      {
        path: '/variable-hub/external-data/evaluation',
        name: 'RiskExternalDataEvaluation',
        component: () => import('./modules/external-data/pages/Evaluation.vue'),
        meta: { title: '外数评估' }
      },
      {
        path: '/variable-hub/external-data/evaluation/create',
        name: 'RiskExternalDataEvaluationCreate',
        component: () => import('./modules/external-data/pages/CreateEvaluation.vue'),
        meta: { title: '创建外数评估' }
      },
      {
        path: '/variable-hub/external-data/evaluation/:id',
        name: 'RiskExternalDataEvaluationDetail',
        component: () => import('./modules/external-data/pages/EvaluationDetail.vue'),
        meta: { title: '评估详情' },
        props: true
      },
      {
        path: '/variable-hub/external-data/archive',
        name: 'RiskExternalDataArchive',
        component: () => import('./modules/external-data/pages/Archive.vue'),
        meta: { title: '外数档案' }
      },
      {
        path: '/variable-hub/external-data/archive/:id',
        name: 'RiskExternalDataArchiveDetail',
        component: () => import('./modules/external-data/pages/ArchiveDetail.vue'),
        meta: { title: '档案详情' },
        props: true
      },
      {
        // 旧「外数服务申请」页面已下线，服务申请入口统一收敛到「服务场景入口」
        path: '/variable-hub/external-data/service',
        redirect: '/variable-hub/external-data/service-scene'
      },
      {
        path: '/variable-hub/external-data/service-scene',
        name: 'RiskExternalDataServiceScene',
        component: () => import('./modules/external-data/pages/ServiceScene.vue'),
        meta: { title: '服务场景入口' }
      },
      {
        path: '/variable-hub/external-data/sample-preparation',
        name: 'RiskExternalDataSamplePreparation',
        component: () => import('./modules/external-data/pages/SamplePreparation.vue'),
        meta: { title: '样本表准备' }
      },
      {
        path: '/variable-hub/external-data/sample-preparation/create',
        name: 'RiskExternalDataSamplePreparationCreate',
        component: () => import('./modules/external-data/pages/SamplePreparationCreate.vue'),
        meta: { title: '新建样本表' }
      },
      {
        path: '/variable-hub/external-data/sample-preparation/edit/:id',
        name: 'RiskExternalDataSamplePreparationEdit',
        component: () => import('./modules/external-data/pages/SamplePreparationCreate.vue'),
        meta: { title: '编辑样本表' },
        props: true
      },
      {
        path: '/variable-hub/external-data/validation-template',
        name: 'RiskExternalDataValidationTemplate',
        component: () => import('./modules/external-data/pages/ServiceValidationTemplate.vue'),
        meta: { title: '服务校验模版管理' }
      },
      {
        path: '/variable-hub/external-data/online-call-application',
        name: 'RiskExternalDataOnlineCallApplication',
        component: () => import('./modules/external-data/pages/OnlineCallApplication.vue'),
        meta: { title: '外数线上调用服务申请' }
      },
      {
        path: '/variable-hub/external-data/backtrack-persist',
        name: 'RiskExternalDataBacktrackPersist',
        component: () => import('./modules/external-data/pages/BacktrackPersist.vue'),
        meta: { title: '外数回溯落库申请' }
      },
      {
        path: '/variable-hub/external-data/task-list',
        name: 'RiskExternalDataTaskList',
        component: () => import('./modules/external-data/pages/TaskList.vue'),
        meta: { title: '服务任务列表' }
      },
      {
        path: '/variable-hub/external-data/credit-agency',
        name: 'RiskExternalDataCreditAgency',
        component: () => import('./modules/external-data/pages/CreditAgency.vue'),
        meta: { title: '合作机构管理' }
      },

      // ========== 预算管理 ==========
      {
        path: '/budget',
        name: 'RiskBudgetRoot',
        redirect: '/budget/overview'
      },
      {
        path: '/budget/overview',
        name: 'BudgetOverview',
        component: () => import('./modules/budget/pages/Overview.vue'),
        meta: { title: '预算总览' }
      },
      {
        path: '/budget/monitor',
        name: 'RiskBudgetMonitorPage',
        component: () => import('./modules/budget/pages/Monitor.vue'),
        meta: { title: '预算监控' }
      },
      {
        path: '/budget/contracts',
        name: 'RiskBudgetContracts',
        component: () => import('./modules/budget/pages/Contracts.vue'),
        meta: { title: '合同管理' }
      },
      {
        path: '/budget/contracts/:id',
        name: 'RiskBudgetContractDetail',
        component: () => import('./modules/budget/pages/ContractDetail.vue'),
        meta: { title: '合同详情' },
        props: true
      },
      {
        path: '/budget/contracts/create',
        name: 'RiskBudgetContractCreate',
        component: () => import('./modules/budget/pages/ContractCreate.vue'),
        meta: { title: '新建合同' }
      },
      {
        path: '/budget/sign-reports',
        name: 'RiskBudgetSignReports',
        component: () => import('./modules/budget/pages/SignReports.vue'),
        meta: { title: '签报管理' }
      },
      {
        path: '/budget/sign-reports/new',
        name: 'RiskBudgetSignReportCreate',
        component: () => import('./modules/budget/pages/SignReportDetail.vue'),
        meta: { title: '新增签报' }
      },
      {
        path: '/budget/sign-reports/:id',
        name: 'RiskBudgetSignReportDetail',
        component: () => import('./modules/budget/pages/SignReportDetail.vue'),
        meta: { title: '签报详情' },
        props: true
      },
      {
        path: '/budget/settlement',
        name: 'RiskBudgetSettlement',
        component: () => import('./modules/budget/pages/Settlement.vue'),
        meta: { title: '结算管理' }
      },
      {
        path: '/budget/settlement/task/new',
        name: 'RiskBudgetSettlementTaskNew',
        component: () => import('./modules/budget/pages/TaskPage.vue'),
        meta: { title: '创建结算任务' }
      },
      {
        path: '/budget/settlement/task/:id',
        name: 'RiskBudgetSettlementTask',
        component: () => import('./modules/budget/pages/TaskPage.vue'),
        meta: { title: '结算任务' },
        props: true
      },
      {
        path: '/budget/accounting',
        name: 'RiskBudgetAccounting',
        component: () => import('./modules/budget/pages/Accounting.vue'),
        meta: { title: '核算流程' }
      },
      {
        path: '/budget/list',
        name: 'RiskBudgetList',
        component: () => import('./modules/budget/pages/List.vue'),
        meta: { title: '预算列表' }
      },
      {
        path: '/budget/create',
        name: 'RiskBudgetCreate',
        component: () => import('./modules/budget/pages/Create.vue'),
        meta: { title: '新建预算' }
      },
      {
        path: '/budget/edit/:id',
        name: 'RiskBudgetEdit',
        component: () => import('./modules/budget/pages/Edit.vue'),
        meta: { title: '编辑预算' },
        props: true
      },
      {
        path: '/budget/detail/:id',
        name: 'RiskBudgetDetail',
        component: () => import('./modules/budget/pages/Detail.vue'),
        meta: { title: '预算详情' },
        props: true
      },

      // ========== 离线模型分析（作为 MainLayout 的子路由）==========
      {
        path: '/model-offline-analysis',
        redirect: '/model-offline-analysis/feature-center'
      },
      {
        path: '/model-offline-analysis/demo',
        name: 'RiskOfflineModelDemo',
        component: () => import('./modules/offline-model/pages/demo.vue'),
        meta: { title: '功能演示', icon: 'icon-play-circle' }
      },
      {
        path: '/model-offline-analysis/test',
        name: 'RiskOfflineModelTest',
        component: () => import('./modules/offline-model/pages/test.vue'),
        meta: { title: '测试页面', icon: 'icon-bug' }
      },
      {
        path: '/model-offline-analysis/feature-center',
        name: 'RiskFeatureCenter',
        component: () => import('./modules/offline-model/pages/featureCenter/index.vue'),
        meta: { title: '特征中心', icon: 'icon-apps' }
      },
      {
        path: '/model-offline-analysis/feature-center/detail/:id',
        name: 'RiskFeatureCenterDetail',
        component: () => import('./modules/offline-model/pages/featureCenter/detail.vue'),
        meta: { title: '特征详情' },
        props: true
      },
      {
        path: '/model-offline-analysis/feature-center/edit/:id',
        name: 'RiskFeatureCenterEdit',
        component: () => import('./modules/offline-model/pages/featureCenter/edit.vue'),
        meta: { title: '编辑特征' },
        props: true
      },
      {
        path: '/model-offline-analysis/feature-center/create',
        name: 'RiskFeatureCenterCreate',
        component: () => import('./modules/offline-model/pages/featureCenter/create.vue'),
        meta: { title: '新建特征' }
      },
      {
        path: '/model-offline-analysis/model-register',
        name: 'RiskModelRegister',
        component: () => import('./modules/offline-model/pages/modelRegister/index.vue'),
        meta: { title: '模型注册', icon: 'icon-upload' }
      },
      {
        path: '/model-offline-analysis/model-register/create',
        name: 'RiskModelRegisterCreate',
        component: () => import('./modules/offline-model/pages/modelRegister/create.vue'),
        meta: { title: '新建模型' }
      },
      {
        path: '/model-offline-analysis/model-register/edit/:id',
        name: 'RiskModelRegisterEdit',
        component: () => import('./modules/offline-model/pages/modelRegister/edit.vue'),
        meta: { title: '编辑模型' },
        props: true
      },
      {
        path: '/model-offline-analysis/model-register/detail/:id',
        name: 'RiskModelRegisterDetail',
        component: () => import('./modules/offline-model/pages/modelRegister/detail.vue'),
        meta: { title: '模型详情' },
        props: true
      },
      {
        path: '/model-offline-analysis/model-backtrack',
        name: 'RiskModelBacktrack',
        component: () => import('./modules/offline-model/pages/modelBacktrack/index.vue'),
        meta: { title: '模型回溯', icon: 'icon-history' }
      },
      {
        path: '/model-offline-analysis/model-backtrack/create',
        name: 'RiskModelBacktrackCreate',
        component: () => import('./modules/offline-model/pages/modelBacktrack/create.vue'),
        meta: { title: '新建回溯' }
      },
      {
        path: '/model-offline-analysis/model-backtrack/detail/:id',
        name: 'RiskModelBacktrackDetail',
        component: () => import('./modules/offline-model/pages/modelBacktrack/detail.vue'),
        meta: { title: '回溯详情' },
        props: true
      },
      {
        path: '/model-offline-analysis/task-management',
        name: 'RiskTaskManagement',
        component: () => import('./modules/offline-model/pages/taskManagement/index.vue'),
        meta: { title: '任务管理', icon: 'icon-calendar-clock' }
      },
      {
        path: '/model-offline-analysis/task-management/detail/:id',
        name: 'RiskTaskManagementDetail',
        component: () => import('./modules/offline-model/pages/taskManagement/detail.vue'),
        meta: { title: '任务详情' },
        props: true
      },
      {
        path: '/model-offline-analysis/model-evaluation',
        name: 'RiskModelEvaluation',
        component: () => import('./modules/offline-model/pages/modelEvaluation/index.vue'),
        meta: { title: '模型评估', icon: 'icon-chart-line' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(routerBase),
  routes
})

router.beforeEach((to, _from, next) => {
  if (to.meta?.title) {
    document.title = `${to.meta.title} - 数字风险`
  }
  next()
})

export default router
