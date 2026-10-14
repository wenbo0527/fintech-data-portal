/**
 * data-community-app 路由
 * 数据社区子应用 - 数据发现 + 数据管理 + 数据探索
 */
import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('../layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        redirect: { name: 'workbench' }
      },
      // ===== 统一工作台 =====
      {
        path: 'workbench',
        name: 'workbench',
        component: () => import('../pages/workbench/index.vue'),
        meta: { title: '数据社区工作台' }
      },
      // ===== 数据发现 =====
      {
        path: 'discovery',
        name: 'discovery',
        component: () => import('../pages/discovery/index.vue'),
        meta: { title: '数据发现' }
      },
      {
        // 规范化路径:id 必须是数字,杜绝 '/collection/discovery' 这种把模块名当 id 的误用
        path: 'discovery/collection/:id(\\d+)',
        name: 'collection-detail',
        component: () => import('../pages/discovery/collection-detail.vue'),
        meta: { title: '集合详情' }
      },
      {
        // 客户 360 已从「数据发现」移到「数据探索」,旧路径 discovery/customer360
        // 直接 redirect 到 exploration/customer360,避免 404
        path: 'discovery/customer360',
        redirect: { name: 'Customer360' }
      },
      {
        path: 'exploration/customer360',
        name: 'Customer360',
        component: () => import('../pages/customer360/index.vue'),
        meta: { title: '客户 360' }
      },
      {
        path: 'exploration/customer360/detail',
        name: 'Customer360Detail',
        component: () => import('../pages/customer360/detail.vue'),
        meta: { title: '客户 360 详情' }
      },
      {
        path: 'discovery/asset-catalog',
        name: 'asset-catalog',
        component: () => import('@/dfd-pages/asset-catalog/index.vue'),
        // 用真实 dfd 复制版本
        meta: { title: '资产目录' }
      },
      {
        // [重构方案 P1] 两条表详情链路合并为同一入口：资产目录详情 redirect 到 data-map-table
        path: 'discovery/asset-catalog/table/:tableName',
        name: 'AssetCatalogTable',
        redirect: (to: any) => ({ name: 'data-map-table', params: to.params, query: to.query })
      },
      {
        path: 'discovery/data-map/table/:tableName',
        name: 'data-map-table',
        // [重构方案 P1] dca 版表详情（7 Tab + 生命周期操作），读 table-catalog-store 唯一事实源
        // 注意：@/pages 与 @/dfd-pages 都指向 dfd，此处必须用相对路径
        component: () => import('../pages/discovery/table-detail/index.vue'),
        meta: { title: '表详情' }
      },
      {
        path: 'discovery/credit',
        name: 'credit',
        component: () => import('@/dfd-pages/credit/index.vue'),
        meta: { title: '征信查询' }
      },
      {
        path: 'discovery/external',
        name: 'external',
        component: () => import('../pages/discovery/external.vue'),
        meta: { title: '外部数据' }
      },
      {
        path: 'discovery/metrics-map',
        name: 'metrics-map',
        component: () => import('@/dfd-pages/metrics-map/index.vue'),
        meta: { title: '指标地图' }
      },
      {
        path: 'discovery/metrics-map/detail/:id',
        name: 'MetricsMapDetail',
        component: () => import('@/dfd-pages/metrics-map/detail.vue'),
        meta: { title: '指标详情' }
      },
      {
        path: 'discovery/indicator-dict',
        name: 'indicator-dict',
        component: () => import('../pages/discovery/indicator-dict.vue'),
        meta: { title: '指标字典' }
      },
      {
        path: 'discovery/unified-metrics',
        name: 'unified-metrics',
        component: () => import('@/dfd-pages/unified-metrics/index.vue'),
        meta: { title: '统一指标' }
      },
      {
        path: 'discovery/indicator-dashboard',
        name: 'discovery-indicator-dashboard',
        component: () => import('@/dfd-pages/indicator-dashboard/index.vue'),
        meta: { title: '指标看板' }
      },
      {
        path: 'discovery/subway-map',
        name: 'subway-map',
        component: () => import('../pages/discovery/subway-map.vue'),
        meta: { title: '指标地铁图' }
      },
      {
        path: 'discovery/variable-map',
        name: 'variable-map',
        component: () => import('@/dfd-pages/variable-map/index.vue'),
        meta: { title: '特征地图' }
      },
      {
        path: 'discovery/variable-dict',
        name: 'variable-dict',
        component: () => import('../pages/discovery/variable-dict.vue'),
        meta: { title: '变量字典' } // 2026-09 P4：修复与 feature-dict 同名「特征字典」的重复命名
      },
      {
        path: 'discovery/feature-map',
        name: 'feature-map',
        component: () => import('@/dfd-pages/feature-map/index.vue'),
        meta: { title: '特征地图' }
      },
      {
        path: 'discovery/feature-dict',
        name: 'feature-dict',
        component: () => import('../pages/discovery/feature-dict.vue'),
        meta: { title: '特征字典' }
      },
      {
        path: 'discovery/api-market',
        name: 'api-market',
        // [重构方案 P3] fork 回 dca：数据源归一 table-catalog-store（@/pages、@/dfd-pages 均指向 dfd，必须相对路径）
        component: () => import('../pages/discovery/api-market/index.vue'),
        meta: { title: 'API 市场' }
      },
      {
        path: 'discovery/api-market/detail/:id',
        name: 'api-market-detail',
        // [重构方案 P3] 消费侧调用文档（参数/SQL/curl），修复 dfd 版点击名称 404 断链
        component: () => import('../pages/discovery/api-market/detail.vue'),
        meta: { title: 'API 详情' }
      },
      {
        path: 'discovery/lineage',
        name: 'lineage',
        component: () => import('@/dfd-pages/lineage/index.vue'),
        meta: { title: '血缘构建' }
      },
      {
        path: 'discovery/data-resources',
        name: 'data-resources',
        component: () => import('../pages/discovery/data-resources.vue'),
        meta: { title: '数据资源目录' }
      },
      {
        // 数据要素·HBase 形态:贷中行为特征表清单(单卡片 → 表列表,表名可点击进详情)
        path: 'discovery/hbase-tables',
        name: 'hbase-tables',
        component: () => import('../pages/discovery/hbase-tables.vue'),
        meta: { title: '风险特征 HBase 表' }
      },
      // 数据要素 v2 更新版：风险特征（HBase/Doris 引擎选型）/ 营销事件（Kafka 事件流）
      {
        path: 'discovery/risk-feature',
        name: 'risk-feature',
        component: () => import('../pages/discovery/risk-feature.vue'),
        meta: { title: '风险特征' }
      },
      {
        // HBase 表详情（贷中行为特征 HBase 表清单 -> 点击表名进入）
        // 使用 * 而不是 :tableName,以兼容表名编码中可能存在的 '/' 等特殊字符
        path: 'discovery/hbase-table-detail/:tableName',
        name: 'hbase-table-detail',
        component: () => import('../pages/discovery/hbase-table-detail.vue'),
        meta: { title: 'HBase 表详情' }
      },
      {
        path: 'discovery/marketing-event',
        name: 'marketing-event',
        component: () => import('../pages/discovery/marketing-event.vue'),
        meta: { title: '营销事件' }
      },
      {
        // 数据发现门户首页(原 dfd-app/data-map: banner + 搜索 + 常用表集合 + 数据体系全景)
        // 复用 pages/discovery/index.vue(已经是 dfd-app 的中文复制版,带 reactive icon 修复)
        path: 'discovery/overview',
        name: 'discovery-overview',
        component: () => import('../pages/discovery/index.vue'),
        meta: { title: '数据总览' }
      },
      {
        // 我的关注(跨资源/资产/要素)
        path: 'discovery/favorites',
        name: 'discovery-favorites',
        component: () => import('../pages/discovery/favorites/index.vue'),
        meta: { title: '我的关注' }
      },
      // 数据资源子页(类型化入口)
      { path: 'discovery/data-resources/files',    name: 'dr-files',    component: () => import('../pages/discovery/data-resources/files.vue'),    meta: { title: '文件导入' } },
      { path: 'discovery/data-resources/logs',     name: 'dr-logs',     component: () => import('../pages/discovery/data-resources/logs.vue'),     meta: { title: '日志数据' } },
      { path: 'discovery/data-resources/realtime', name: 'dr-realtime', component: () => import('../pages/discovery/data-resources/realtime.vue'), meta: { title: '实时数据' } },
      {
        path: 'discovery/search',
        name: 'search',
        // [重构方案 P1] dca 版统一搜索（7 Tab/字段搜索/审核中置灰/空态工单）
        component: () => import('../pages/discovery/search/index.vue'),
        meta: { title: '全局搜索' }
      },
      // ===== 类型详情页 + 列表页（PRD 模块 C/D，13 个配置共用组件） =====
      {
        path: 'discovery/type-detail/:typeKey',
        name: 'type-detail',
        component: () => import('../pages/discovery/type-detail/TypeDetailPage.vue'),
        props: true,
        meta: { title: '类型详情' }
      },
      {
        path: 'discovery/element-list/:typeKey',
        name: 'element-list',
        component: () => import('../pages/discovery/type-detail/ElementTableList.vue'),
        props: true,
        meta: { title: '表列表' }
      },
      // [重构方案 P1] 上线流程：未上线池 + 管理者审核页
      // 2026-09-17 归属调整：上线流程属治理动作，从数据发现迁至数据管理（表生命周期管理同组）
      {
        path: 'management/lifecycle/pending',
        name: 'lifecycle-pending',
        component: () => import('../pages/management/pending/index.vue'),
        meta: { title: '未上线池' }
      },
      {
        path: 'management/lifecycle/review',
        name: 'lifecycle-review',
        component: () => import('../pages/management/pending/review.vue'),
        // 2026-09 P4 角色管控：审核页限数据管理员/管理员，其余角色由守卫重定向到 unauthorized 页
        meta: { title: '上线审核', allowedRoles: ['admin', 'data_admin'] }
      },
      // ===== 数据管理 =====
      {
        path: 'management',
        name: 'management',
        component: () => import('@/dfd-pages/asset-management/index.vue'),
        meta: { title: '数据管理' }
      },
      // 2026-08-06 清理:management/favorites 已统一到 discovery/favorites(我的关注)
      //   原版定位"收藏的是资产/指标/特征/特征/外数",属于数据发现域
      {
        path: 'management/notifications',
        name: 'notifications',
        component: () => import('../pages/management/notifications/index.vue'),
        meta: { title: '通知中心' }
      },
      {
        path: 'management/notifications/detail/:id',
        name: 'notification-detail',
        component: () => import('../pages/management/notifications/detail.vue'),
        meta: { title: '通知详情' }
      },
      {
        path: 'management/notifications/categories',
        name: 'notification-categories',
        component: () => import('../pages/management/notifications/categories.vue'),
        meta: { title: '通知分类' }
      },
      {
        path: 'management/business-concept',
        name: 'business-concept',
        component: () => import('../pages/management/business-concept/index.vue'),
        meta: { title: '业务概念' }
      },
      {
        path: 'management/business-domain',
        name: 'business-domain',
        component: () => import('../pages/management/business-concept/BusinessDomainList.vue'),
        meta: { title: '业务域管理' }
      },
      {
        path: 'management/business-entity',
        name: 'business-entity',
        component: () => import('../pages/management/business-concept/BusinessEntityList.vue'),
        meta: { title: '业务实体管理' }
      },
      {
        path: 'management/business-graph',
        name: 'business-graph',
        component: () => import('../pages/management/business-concept/BusinessRelationGraph.vue'),
        meta: { title: '业务图谱' }
      },
      {
        path: 'management/data-standard',
        name: 'data-standard-index',
        component: () => import('../pages/management/data-standard/index.vue'),
        meta: { title: '数据标准' }
      },
      {
        path: 'management/data-standard/standards',
        name: 'data-standard',
        component: () => import('../pages/management/data-standard/standards.vue'),
        meta: { title: '数据标准' }
      },
      {
        path: 'management/data-standard/domains',
        name: 'data-standard-domains',
        component: () => import('../pages/management/data-standard/domains/index.vue'),
        meta: { title: '标准域管理' }
      },
      {
        path: 'management/data-standard/codes',
        name: 'data-standard-codes',
        component: () => import('../pages/management/data-standard/codes/index.vue'),
        meta: { title: '标准代码管理' }
      },
      {
        path: 'management/data-standard/words',
        name: 'data-standard-words',
        component: () => import('../pages/management/data-standard/words/index.vue'),
        meta: { title: '标准单词管理' }
      },
      {
        path: 'management/data-standard/audit',
        name: 'data-standard-audit',
        component: () => import('../pages/management/data-standard/audit/index.vue'),
        meta: { title: '标准稽核管理' }
      },
      // ===== 数据质量管理 =====
      {
        path: 'management/data-quality/tasks',
        name: 'quality-task-list',
        component: () => import('../pages/management/data-quality/task-list/index.vue'),
        meta: { title: '校验任务管理' }
      },
      {
        path: 'management/data-quality/tasks/create',
        name: 'quality-task-create',
        component: () => import('../pages/management/data-quality/task-list/TaskForm.vue'),
        meta: { title: '新建校验任务' }
      },
      {
        path: 'management/data-quality/tasks/:id/edit',
        name: 'quality-task-edit',
        component: () => import('../pages/management/data-quality/task-list/TaskForm.vue'),
        meta: { title: '编辑校验任务' },
        props: true
      },
      {
        path: 'management/data-quality/instances',
        name: 'quality-instance-list',
        component: () => import('../pages/management/data-quality/task-instances/index.vue'),
        meta: { title: '任务实例日志' }
      },
      {
        path: 'management/data-quality/instances/:id',
        name: 'quality-instance-detail',
        component: () => import('../pages/management/data-quality/task-instances/InstanceDetail.vue'),
        meta: { title: '实例详情' },
        props: true
      },
      // 2026-09 重构:P2 质量看板(评分分布/低分Top10/业务域均分,评分回流资产目录)
      {
        path: 'management/quality/dashboard',
        name: 'quality-dashboard',
        component: () => import('../pages/management/quality/dashboard.vue'),
        meta: { title: '数据质量看板' }
      },
      {
        path: 'management/data-models',
        name: 'data-models',
        component: () => import('../pages/management/data-models/index.vue'),
        meta: { title: '数据模型' },
        children: [
          {
            path: '',
            name: 'data-models-list',
            component: () => import('../pages/management/data-models/DataModelsList.vue'),
            meta: { title: '数据模型列表' }
          },
          {
            path: 'create',
            name: 'data-models-create',
            component: () => import('../pages/management/data-models/DataModelsForm.vue'),
            meta: { title: '新增数据模型' }
          },
          {
            path: ':id/edit',
            name: 'data-models-edit',
            component: () => import('../pages/management/data-models/DataModelsForm.vue'),
            meta: { title: '编辑数据模型' },
            props: true
          },
          {
            path: ':id',
            name: 'data-models-detail',
            component: () => import('../pages/management/data-models/DataModelsDetail.vue'),
            meta: { title: '数据模型详情' },
            props: true
          }
        ]
      },
      {
        path: 'management/user-groups',
        name: 'user-groups',
        component: () => import('../pages/management/user-groups/index.vue'),
        meta: { title: '用户组管理' }
      },
      {
        path: 'management/metadata',
        name: 'metadata',
        component: () => import('../pages/management/metadata/index.vue'),
        meta: { title: '元数据' }
      },
      {
        path: 'management/metadata/modeling',
        name: 'metadata-modeling',
        component: () => import('../pages/management/metadata/modeling.vue'),
        meta: { title: '元数据建模' }
      },
      {
        path: 'management/metadata/entity',
        name: 'metadata-entity',
        component: () => import('../pages/management/metadata/entity/index.vue'),
        meta: { title: '业务实体' }
      },
      {
        path: 'management/metadata/task',
        name: 'metadata-task',
        component: () => import('../pages/management/metadata/task/index.vue'),
        meta: { title: '采集任务' }
      },
      {
        path: 'management/metadata/classify-api-docs',
        name: 'classify-api-docs',
        component: () => import('../pages/management/metadata/classify-api-docs.vue'),
        meta: { title: '分级分类 API 文档' }
      },
      {
        path: 'management/metadata/classify-matrix',
        name: 'classify-matrix',
        component: () => import('../pages/management/metadata/classify-matrix.vue'),
        meta: { title: '数据安全分级矩阵表' }
      },
      {
        path: 'management/metadata/classify-tasks',
        name: 'classify-tasks',
        component: () => import('../pages/management/metadata/classify-tasks.vue'),
        meta: { title: '分级分类任务' }
      },
      {
        path: 'management/metadata/classify',
        name: 'classify-entry',
        component: () => import('../pages/management/metadata/classify/index.vue'),
        redirect: '/management/metadata/classify/sources',
        meta: { title: '数据分级分类' },
        children: [
          {
            path: 'sources',
            name: 'classify-sources',
            component: () => import('../pages/management/metadata/classify/sources.vue'),
            meta: { title: '数据源' }
          },
          {
            path: 'tables/:systemId',
            name: 'classify-tables',
            component: () => import('../pages/management/metadata/classify/tables.vue'),
            meta: { title: '表列表' }
          },
          {
            path: 'table/:systemId/:schema/:tableName',
            name: 'classify-table-detail',
            component: () => import('../pages/management/metadata/classify/table-detail.vue'),
            meta: { title: '表详情' }
          }
        ]
      },
      {
        path: 'management/service',
        name: 'service',
        component: () => import('../pages/management/service/index.vue'),
        meta: { title: '数据服务' }
      },
      {
        path: 'management/service/api-wizard',
        name: 'api-wizard',
        component: () => import('../pages/management/service/api-wizard.vue'),
        meta: { title: 'API 上架向导' }
      },
      {
        path: 'management/service/backtrack',
        name: 'service-backtrack',
        component: () => import('../pages/management/service/backtrack.vue'),
        meta: { title: '全量特征回溯申请' }
      },
      {
        path: 'management/service/detail-data-query',
        name: 'service-detail-data-query',
        component: () => import('../pages/management/service/detail-data-query.vue'),
        meta: { title: '明细数据查询服务' }
      },
      {
        path: 'management/service/monitor',
        name: 'service-monitor',
        component: () => import('../pages/management/service/ServiceMonitor.vue'),
        meta: { title: '服务监控' }
      },
      {
        path: 'management/service/stats',
        name: 'service-stats',
        component: () => import('../pages/management/service/ServiceStats.vue'),
        meta: { title: '调用统计' }
      },
      {
        path: 'management/service/fund-usage-query',
        name: 'service-fund-usage-query',
        component: () => import('../pages/management/service/fund-usage-query/index.vue'),
        meta: { title: '客户资金用途外数查询' }
      },
      {
        path: 'management/service/api-management',
        name: 'service-api-management',
        component: () => import('../pages/management/service/api-management/index.vue'),
        meta: { title: 'API管理' }
      },
      {
        path: 'management/service/api-management/create',
        name: 'service-api-management-create',
        component: () => import('../pages/management/service/api-management/Wizard.vue'),
        meta: { title: '新建API' }
      },
      {
        path: 'management/service/api-management/:id/edit',
        name: 'service-api-management-edit',
        component: () => import('../pages/management/service/api-management/Wizard.vue'),
        meta: { title: '编辑API' }
      },
      {
        path: 'management/asset-management/asset-tags',
        name: 'asset-tags',
        component: () => import('../pages/management/asset-management/asset-tags/index.vue'),
        meta: { title: '资产标签管理' }
      },
      {
        path: 'management/asset-management/tag-group',
        name: 'tag-group',
        component: () => import('../pages/management/asset-management/tag-group/index.vue'),
        meta: { title: '标签分组管理' }
      },
      // ===== 资产管理 - 基础管理 =====
      {
        path: 'management/asset-management/basic-management/data-source',
        name: 'asset-data-source',
        component: () => import('../pages/management/asset-management/basic-management/data-source/index.vue'),
        meta: { title: '数据源管理' }
      },
      {
        path: 'management/asset-management/basic-management/metadata-collection',
        name: 'metadata-collection',
        component: () => import('../pages/management/asset-management/basic-management/metadata-collection/index.vue'),
        meta: { title: '创建采集任务' }
      },
      {
        path: 'management/asset-management/basic-management/metadata-collection/task-list',
        name: 'metadata-collection-list',
        component: () => import('../pages/management/asset-management/basic-management/metadata-collection/List.vue'),
        meta: { title: '采集任务列表' }
      },
      {
        path: 'management/asset-management/basic-management/tag-management',
        name: 'tag-management',
        component: () => import('../pages/management/asset-management/basic-management/tag-management/index.vue'),
        meta: { title: '标签管理' }
      },
      // ===== 资产管理 - 上下架管理 =====
      {
        path: 'management/asset-management/listing-management/asset-management',
        name: 'asset-listing-overview',
        component: () => import('../pages/management/asset-management/listing-management/asset-management/sources.vue'),
        meta: { title: '数据资产上下架' }
      },
      {
        path: 'management/asset-management/listing-management/asset-management/system/:systemId',
        name: 'asset-listing-system',
        component: () => import('../pages/management/asset-management/listing-management/asset-management/system-tables.vue'),
        meta: { title: '系统资产列表' }
      },
      {
        path: 'management/asset-management/listing-management/asset-management/detail/:name',
        name: 'asset-listing-detail',
        component: () => import('../pages/management/asset-management/listing-management/asset-management/detail.vue'),
        meta: { title: '资产详情' }
      },
      {
        path: 'management/asset-management/listing-management/data-source',
        name: 'data-source-listing-overview',
        component: () => import('../pages/management/asset-management/listing-management/data-source/sources.vue'),
        meta: { title: '数据资源上下架' }
      },
      {
        path: 'management/asset-management/listing-management/data-source/business-system',
        name: 'data-source-business-system',
        component: () => import('../pages/management/asset-management/listing-management/data-source/business-system.vue'),
        meta: { title: '业务系统台账' }
      },
      {
        path: 'management/asset-management/listing-management/data-source/system/:systemId',
        name: 'data-source-listing-system',
        component: () => import('../pages/management/asset-management/listing-management/asset-management/system-tables.vue'),
        meta: { title: '系统资源列表' }
      },
      {
        path: 'management/asset-management/listing-management/metric-management',
        name: 'metric-management',
        component: () => import('../pages/management/asset-management/listing-management/metric-management/index.vue'),
        meta: { title: '指标管理' }
      },
      {
        path: 'management/asset-management/listing-management/metric-management/:id/:mode',
        name: 'MetricDetail',
        component: () => import('../pages/management/asset-management/listing-management/metric-management/MetricDetail.vue'),
        meta: { title: '指标详情' }
      },
      {
        path: 'management/permission/data-permission/apply',
        name: 'permission-apply',
        component: () => import('../pages/management/permission/data-permission/apply.vue'),
        meta: { title: '表权限申请' }
      },
      // 2026-08-06 新增:补齐原版 4 步权限流程(2026-09 重构为表级 + 分级四级流)
      {
        path: 'management/permission/data-permission/approval',
        name: 'permission-approval',
        component: () => import('../pages/management/permission/data-permission/approval.vue'),
        // 2026-09 P4 角色管控：审批台（含 DBA 队列）限数据管理员/管理员
        meta: { title: '表权限·审批台(含DBA队列)', allowedRoles: ['admin', 'data_admin'] }
      },
      {
        path: 'management/permission/data-permission/management',
        name: 'permission-management',
        component: () => import('../pages/management/permission/data-permission/management.vue'),
        meta: { title: '表权限·授权台账' }
      },
      {
        path: 'management/permission/data-permission/progress',
        name: 'permission-progress',
        component: () => import('../pages/management/permission/data-permission/progress.vue'),
        meta: { title: '表权限·我的进度' }
      },
      // 2026-08-06 新增:数据上下架(资源/资产/要素/批量)
      {
        path: 'management/shelf/resource-shelf',
        name: 'shelf-resource',
        component: () => import('../pages/management/shelf/resource-shelf.vue'),
        meta: { title: '资源上下架' }
      },
      {
        path: 'management/shelf/asset-shelf',
        name: 'shelf-asset',
        component: () => import('../pages/management/shelf/asset-shelf.vue'),
        meta: { title: '资产上下架' }
      },
      {
        path: 'management/shelf/element-shelf',
        name: 'shelf-element',
        component: () => import('../pages/management/shelf/element-shelf.vue'),
        meta: { title: '要素上下架' }
      },
      {
        path: 'management/shelf/batch-shelf',
        name: 'shelf-batch',
        component: () => import('../pages/management/shelf/batch-shelf.vue'),
        meta: { title: '批量上下架' }
      },
      // 2026-09 重构:P2 表生命周期管理(上线审核/下线审批/状态总览,共用 table-catalog-store)
      {
        path: 'management/lifecycle',
        name: 'management-lifecycle',
        component: () => import('../pages/management/lifecycle/index.vue'),
        meta: { title: '表生命周期管理' }
      },
      // 数据分级分类已迁移到 metadata/classify 体系（与 dmt-app 一致）
      {
        path: 'management/classification',
        redirect: '/management/metadata/classify/sources'
      },
      // ===== 数据探索 =====
      // 仅保留 DCA 探索域自有的 4 个核心入口(已对齐"客户 360 / 工作流 / 看板"三件套):
      //   - 客户 360(单客户画像查询,真实深度页面)
      //   - 客户 360 详情(独立详情页)
      //   - 分析工作流(可视化流程列表)
      //   - 业务指标看板(跨域指标可视化)
      // 已清理:
      //   - 客群管理 / 标签体系 / 虚拟事件 → 划归 MKT 营销域(端口 5177)
      {
        path: 'exploration',
        name: 'exploration',
        component: () => import('../pages/exploration/index.vue'),
        meta: { title: '数据探索' }
      },
      {
        path: 'exploration/workflows',
        name: 'workflows',
        component: () => import('../pages/exploration/workflows.vue'),
        meta: { title: '分析工作流' }
      },
      {
        // 工作流详情/编辑(2026-08-06 补齐):列表点行进入
        path: 'exploration/workflows/editor/:id',
        name: 'workflow-editor',
        component: () => import('../pages/exploration/workflow-editor.vue'),
        meta: { title: '工作流编辑' }
      },
      {
        path: 'exploration/indicator-dashboard',
        name: 'exploration-indicator-dashboard',
        component: () => import('../pages/exploration/indicator-dashboard.vue'),
        meta: { title: '业务指标看板' }
      },
      // ===== 统一查询平台(数据探索 / 与客户 360 并列的模块)=====
      // 合并页面:左侧脚本树 + 右侧 SQL 编辑器(原 scripts 路由已并入 sql)
      {
        path: 'exploration/unified-query/sql',
        name: 'unified-query-sql',
        component: () => import('../pages/unified-query/sql-editor.vue'),
        meta: { title: '统一查询' }
      },
      {
        path: 'exploration/unified-query/tasks',
        name: 'unified-query-tasks',
        component: () => import('../pages/unified-query/task-scheduler.vue'),
        meta: { title: '任务调度' }
      },
      {
        path: 'exploration/unified-query/task/create',
        name: 'unified-query-task-create',
        component: () => import('../pages/unified-query/task-create.vue'),
        meta: { title: '创建定时任务' }
      },
      {
        path: 'exploration/unified-query/exports',
        name: 'unified-query-exports',
        component: () => import('../pages/unified-query/export-tasks.vue'),
        meta: { title: '导出任务' }
      },
      // ===== 指标中心 =====
      {
        path: 'exploration/metrics-center',
        name: 'metrics-center',
        component: () => import('../pages/metrics-center/index.vue'),
        meta: { title: '指标管理' }
      },
      {
        path: 'exploration/metrics-center/create',
        name: 'metrics-center-create',
        component: () => import('../pages/metrics-center/create.vue'),
        meta: { title: '新建指标' }
      },
      {
        path: 'exploration/metrics-center/batch-import',
        name: 'metrics-center-batch-import',
        component: () => import('../pages/metrics-center/batch-import.vue'),
        meta: { title: '批量注册' }
      },
      {
        path: 'exploration/metrics-center/detail/:id',
        name: 'metrics-center-detail',
        component: () => import('../pages/metrics-center/detail.vue'),
        meta: { title: '指标详情' },
        props: true
      },
      {
        path: 'exploration/metrics-center/map',
        name: 'metrics-center-map',
        component: () => import('../pages/metrics-center/map.vue'),
        meta: { title: '指标地图' }
      },
      {
        path: 'exploration/metrics-center/dashboard',
        name: 'metrics-center-dashboard',
        component: () => import('../pages/metrics-center/dashboard.vue'),
        meta: { title: '指标看板' }
      },
      {
        path: 'exploration/metrics-center/reports',
        name: 'metrics-center-reports',
        component: () => import('../pages/metrics-center/reports/index.vue'),
        meta: { title: '报表管理' }
      },
      {
        path: 'exploration/metrics-center/reports/create',
        name: 'metrics-center-reports-create',
        component: () => import('../pages/metrics-center/reports/create.vue'),
        meta: { title: '新增报表' }
      },
      {
        path: 'exploration/metrics-center/reports/detail/:id',
        name: 'metrics-center-reports-detail',
        component: () => import('../pages/metrics-center/reports/detail.vue'),
        meta: { title: '报表详情' },
        props: true
      },
      // ===== 无访问权限 =====
      {
        path: 'unauthorized',
        name: 'unauthorized',
        component: () => import('../components-dca/common/UnauthorizedPage.vue'),
        meta: { title: '无访问权限' }
      },
      // ===== 404 兜底已迁移到 router.beforeEach / afterEach 中 =====
      //   不在这里设置 catch-all,因为 `path: ':pathMatch(.*)*'` 会让
      //   vue-router 把 pathMatch 注入 to.params,后续重定向时残留
      //   报 "Discarded invalid param(s) 'pathMatch'" 并导致「点击搜索跳到 workbench」现象
      //   真正的兜底逻辑见下方 router.beforeEach 末尾与 afterEach
    ]
  }
]

const router = createRouter({
  // base 唯一来源 = vite build.base('/data-community/',见 vite.config.ts),
  // 不再保留 '/dca/' fallback —— 旧 fallback 会掩盖构建 base 与运行 base 不一致的问题
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

// 路由守卫 - P0 角色机制
import { useRoleStore } from "../stores-dca/role";
import { Message } from '@arco-design/web-vue'
import type { RouteLocationRaw } from 'vue-router'

router.beforeEach((to, from, next) => {
  // ===== ⛳ 断点 A: 路由层入口 =====
  // 上线时可移除;当前用于诊断「URL → 组件」链路
  // eslint-disable-next-line no-console
  console.debug('[guard] to.path =', to.path, 'to.params =', to.params, 'to.fullPath =', to.fullPath)

  // ===== 容错: 归一化旧链接残留的 '/dca' 前缀 =====
  // 当前 base 为 '/data-community/',to.path 正常情况下不带任何 base 前缀;
  // 但历史书签 / 旧跳转代码可能产生 '/dca/xxx' 或双前缀 '/dca/dca/xxx',
  // 这里统一剥掉前导 '/dca' 段(含双前缀),归一到真实路由路径;
  // '/dca'、'/dca/' 本身归一为 '/'(根路径)
  // 注意:next() 需显式清空 params,否则 catch-all 的 pathMatch 残留会抛
  //   "Discarded invalid param(s) 'pathMatch'" 警告并导致下一次跳转异常
  if (to.path === '/dca' || to.path === '/dca/' || to.path.startsWith('/dca/')) {
    const stripped = to.path.replace(/^\/dca(\/dca)?\/?/, '/') || '/'
    const nextRoute: RouteLocationRaw = {
      path: stripped,
      query: to.query,
      hash: to.hash,
      replace: true
    }
    // 显式把 params 清空,避免上一轮 catch-all 的 pathMatch 残留
    ;(nextRoute as any).params = {}
    next(nextRoute)
    return
  }

  // 注:createWebHistory 已处理 base('/data-community/'),to.path 不再带 base 前缀,无需再 strip

  const meta = to.meta as { allowedRoles?: string[]; requireAuth?: boolean }

  if (!meta?.allowedRoles && !meta?.requireAuth) {
    next()
    return
  }

  const roleStore = useRoleStore()
  const currentRole = roleStore.currentRole

  if (!meta.allowedRoles || meta.allowedRoles.length === 0) {
    next()
    return
  }

  if (meta.allowedRoles.includes(currentRole) || meta.allowedRoles.includes('*')) {
    next()
    return
  }

  Message.warning(`当前角色(${roleStore.currentRoleDef.label})无权访问该页面`)
  next({
    path: 'unauthorized',
    query: { from: to.fullPath, requiredRole: meta.allowedRoles.join(',') }
  })
})

/**
 * 404 兜底(替代原 routes 里 path: ':pathMatch(.*)*' 的 catch-all)
 * 不用命名 catch-all 的原因:vue-router 4 会把 pathMatch 注入 to.params,
 *   后续 router.replace / beforeEach 中残留,报 "Discarded invalid param(s) 'pathMatch'"
 *   警告并导致「莫名跳到 workbench」/「侧栏点『数据搜索』跳 workbench」等现象
 *
 * 这里改在 guard 层检测:如果 to.matched 为空(没匹配到任何已声明路由),
 *   就替换成 workbench;同时显式把 to.params 清空,避免 pathMatch 残留
 */
router.beforeEach((to, from, next) => {
  // matched 为空数组 = 当前路径没有任何路由匹配 = 应走 404 兜底
  if (to.matched.length === 0) {
    next({
      name: 'workbench',
      replace: true,
      // 清空 params,即便 catch-all 留下了 pathMatch 也强制丢掉
      params: {}
    } as RouteLocationRaw)
    return
  }
  next()
})

/**
 * afterEach 作为兜底:即使 beforeEach 没拦住,这里再最后检查一次 matched
 *   防止边缘情况下用户拼写错误的路径在应用里露出空白页
 */
router.afterEach((to) => {
  if (to.matched.length === 0) {
    // eslint-disable-next-line no-console
    console.warn('[router] unmatched path:', to.fullPath, '→ 兜底跳 workbench')
  }
  // 兜底:也清掉 params.pathMatch 这一类残留参数,防止后续路由报 warning
  // eslint-disable-next-line no-console
  if (to.params.pathMatch) {
    // eslint-disable-next-line no-console
    console.warn('[router] clearing stale to.params.pathMatch =', to.params.pathMatch)
  }
})

router.isReady().then(() => {
  console.log('[DCA Router] 路由就绪:', router.currentRoute.value.fullPath)
})

export default router