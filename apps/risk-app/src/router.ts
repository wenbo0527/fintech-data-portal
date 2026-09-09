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
 *  /budget/*                      → 预算管理
 *  /model-offline-analysis/*      → 离线模型分析
 *  /accompany/*                   → 陪跑计划
 */
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
      {
        path: '/evaluation/tasks',
        name: 'EvaluationTasks',
        component: () => import('./modules/variable-hub/pages/evaluation/tasks/index.vue'),
        meta: { title: '评估任务中心' }
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
        path: '/variable-hub/external-data/service',
        name: 'RiskExternalDataService',
        component: () => import('./modules/external-data/pages/Service.vue'),
        meta: { title: '外数数据服务' }
      },
      {
        path: '/variable-hub/external-data/service-create',
        name: 'RiskExternalDataServiceCreate',
        redirect: { path: '/variable-hub/external-data/service', query: { mode: 'create' } }
      },
      {
        path: '/variable-hub/external-data/service-mode/:mode',
        name: 'RiskExternalDataServiceMode',
        redirect: (to: any) => ({ path: '/variable-hub/external-data/service', query: { mode: to.params.mode } })
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
