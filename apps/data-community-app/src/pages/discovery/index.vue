<template>
  <div class="data-map-container">
    <!-- 顶部 Banner -->
    <div class="banner-section">
      <div class="banner-content">
        <div class="title-row">
          <h1 class="banner-title">数据消费新体验</h1>
          <span class="version-tag">2.0</span>
        </div>
        <p class="banner-subtitle">全新版本数据地图,包含查数、找数、用数等场景升级;为用户解决找数难,理解数据难的难点。</p>

        <div class="search-area">
          <a-input-search
            v-model="searchForm.keyword"
            class="main-search-input"
            placeholder="输入关键词进行查询,支持各业务/标签/分组/指标等多个关键字"
            search-button
            size="large"
            @search="handleSearch"
          >
            <template #button-icon><icon-search /></template>
          </a-input-search>
          <a-button class="action-btn" size="large" @click="toggleAdvancedFilter" :type="showAdvancedFilter ? 'primary' : 'secondary'">
            <template #icon><icon-filter /></template>高级
          </a-button>
          <a-button class="action-btn" size="large" @click="handleFollow">
            <template #icon><icon-heart /></template>关注
          </a-button>
          <a-button class="action-btn" size="large" @click="showMissingTicket({ assetType: 'table', pageSource: '数据发现门户' })">
            <template #icon><icon-plus /></template>缺失工单
          </a-button>
        </div>

        <div v-if="showAdvancedFilter" class="advanced-filter-panel">
          <a-row :gutter="16">
            <a-col :span="8">
              <a-form-item label="包含关键词" label-col-flex="80px">
                <a-input v-model="searchForm.include" placeholder="输入包含的关键词" allow-clear />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="排除关键词" label-col-flex="80px">
                <a-input v-model="searchForm.exclude" placeholder="输入排除的关键词" allow-clear />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="业务模块" label-col-flex="80px">
                <a-select v-model="searchForm.module" placeholder="选择业务模块" allow-clear>
                  <a-option v-for="m in moduleOptions" :key="m" :value="m">{{ m }}</a-option>
                </a-select>
              </a-form-item>
            </a-col>
          </a-row>
          <div class="filter-actions">
            <a-button type="primary" size="small" @click="handleSearch">应用筛选</a-button>
            <a-button size="small" @click="resetSearch">重置</a-button>
          </div>
        </div>
      </div>
      <div class="banner-decoration">
        <div class="decoration-cube"></div>
      </div>
    </div>

    <!-- 主体内容 -->
    <div class="main-content">
      <!-- 常用表集合 -->
      <div class="content-section">
        <div class="section-header">
          <h3 class="section-title">常用表集合</h3>
          <a-link class="more-link" @click="onViewAllCollections">查看更多 <icon-right /></a-link>
        </div>
        <a-row :gutter="[16, 16]">
          <a-col v-for="col in collections" :key="col.id" :xs="24" :sm="12" :md="8" :lg="6">
            <a-card class="collection-card" hoverable @click="goItem(col)">
              <div class="card-content">
                <div class="card-icon-box" :style="{ background: col.iconBg }">
                  <component :is="iconMap[col.iconKey]" />
                </div>
                <h4 class="collection-name">{{ col.name }}</h4>
                <p class="collection-desc">{{ col.description }}</p>
                <div class="collection-meta">
                  <a-tag size="small" :color="col.typeColor">{{ col.type }}</a-tag>
                  <span class="table-count">{{ col.count }} 张表</span>
                  <a-avatar-group v-if="col.followers" :size="24" :max-count="3">
                    <a-avatar v-for="(f, i) in col.followers" :key="i" :style="{ background: f.color }">
                      {{ f.name }}
                    </a-avatar>
                  </a-avatar-group>
                </div>
              </div>
            </a-card>
          </a-col>
        </a-row>
      </div>

      <!-- 业务系统接入概览 -->
      <div class="content-section" style="margin-top: 24px;">
        <div class="section-header">
          <h3 class="section-title">业务系统接入概览</h3>
          <a-link class="more-link" @click="safePush('discovery/data-resources')">查看全部 <icon-right /></a-link>
        </div>

        <!-- 统计摘要 -->
        <div class="bs-summary-row">
          <div class="bs-summary-item">
            <span class="bs-summary-value">{{ bsTotalSystems }}</span>
            <span class="bs-summary-label">接入系统</span>
          </div>
          <div class="bs-summary-divider"></div>
          <div class="bs-summary-item">
            <span class="bs-summary-value">{{ bsTotalTables.toLocaleString() }}</span>
            <span class="bs-summary-label">源表总数</span>
          </div>
          <div class="bs-summary-divider"></div>
          <div class="bs-summary-item">
            <span class="bs-summary-value">6</span>
            <span class="bs-summary-label">数据库类型</span>
          </div>
          <div class="bs-summary-divider"></div>
          <div class="bs-summary-item">
            <span class="bs-summary-value" style="color: #00b42a;">6</span>
            <span class="bs-summary-label">同步中</span>
          </div>
        </div>

        <!-- 系统卡片列表 -->
        <a-row :gutter="[16, 16]" style="margin-top: 20px;">
          <a-col v-for="sys in businessSystems" :key="sys.id" :xs="24" :sm="12" :md="8" :lg="8">
            <div class="bs-card" @click="safePush(sys.path)">
              <div class="bs-card-header">
                <a-tag :color="dbTypeColor(sys.dbType)" size="small">{{ sys.dbTypeLabel }}</a-tag>
                <span class="bs-card-name">{{ sys.name }}</span>
                <a-tag size="small" color="green" bordered>
                  <span class="bs-sync-dot"></span>同步中
                </a-tag>
              </div>
              <div class="bs-card-body">
                <div class="bs-card-info">
                  <div class="bs-info-item">
                    <span class="bs-info-label">系统类型</span>
                    <span class="bs-info-value">{{ sys.systemTypeLabel }}</span>
                  </div>
                  <div class="bs-info-item">
                    <span class="bs-info-label">数据库</span>
                    <span class="bs-info-value">{{ sys.database }}</span>
                  </div>
                  <div class="bs-info-item">
                    <span class="bs-info-label">表数量</span>
                    <span class="bs-info-value bs-table-count">{{ sys.tableCount }} 张</span>
                  </div>
                  <div class="bs-info-item">
                    <span class="bs-info-label">负责人</span>
                    <span class="bs-info-value">{{ sys.owner }}</span>
                  </div>
                  <div class="bs-info-item">
                    <span class="bs-info-label">更新时间</span>
                    <span class="bs-info-value">{{ sys.updatedAt }}</span>
                  </div>
                </div>
              </div>
            </div>
          </a-col>
        </a-row>
      </div>

      <!-- 数据体系全景 -->
      <div class="content-section" style="margin-top: 24px;">
        <div class="section-header">
          <h3 class="section-title">数据体系全景</h3>
          <a-link class="more-link" @click="onViewDataSystem">查看全貌 <icon-right /></a-link>
        </div>

        <div class="data-flow-container">
          <!-- 数据资源 -->
          <div class="system-column">
            <div class="relationship-card">
              <div class="card-icon resource-bg"><icon-apps /></div>
              <div class="card-info">
                <h4>数据资源</h4>
                <p>原始数据的汇聚与接入 · 共 {{ totalResources }} 类</p>
              </div>
            </div>
            <div class="column-list">
              <div
                v-for="(item, index) in dataResources"
                :key="item.name"
                class="asset-item clickable-item"
                @click="goItem(item)"
              >
                <div class="asset-content">
                  <component :is="iconMap[item.iconKey]" class="asset-icon" />
                  <div class="asset-text">
                    <span class="asset-name">{{ item.name }}</span>
                    <span class="asset-desc">{{ item.description }}</span>
                  </div>
                </div>
                <span class="asset-count">{{ item.count }}</span>
              </div>
            </div>
          </div>

          <div class="arrow-connector"><icon-right /></div>

          <!-- 数据资产 -->
          <div class="system-column">
            <div class="relationship-card">
              <div class="card-icon asset-bg"><icon-storage /></div>
              <div class="card-info">
                <h4>数据资产</h4>
                <p>经过治理、加工和标准化的数据 · 共 {{ totalAssets }} 张</p>
              </div>
            </div>
            <div class="column-list">
              <div
                v-for="(item, index) in dataAssets"
                :key="item.name"
                class="asset-item clickable-item"
                @click="goItem(item)"
              >
                <div class="asset-content">
                  <icon-user-group class="asset-icon" />
                  <div class="asset-text">
                    <span class="asset-name">{{ item.name }}</span>
                    <span class="asset-desc">{{ item.description }}</span>
                  </div>
                </div>
                <span class="asset-count">{{ item.count }}</span>
              </div>
            </div>
          </div>

          <div class="arrow-connector"><icon-right /></div>

          <!-- 数据要素 -->
          <div class="system-column">
            <div class="relationship-card">
              <div class="card-icon element-bg"><icon-bulb /></div>
              <div class="card-info">
                <h4>数据要素</h4>
                <p>面向业务场景的高价值数据形态 · 共 {{ totalElements }} 个</p>
              </div>
            </div>
            <div class="column-list">
              <div
                v-for="(item, index) in dataElements"
                :key="item.name"
                class="asset-item clickable-item"
                @click="goItem(item)"
              >
                <div class="asset-content">
                  <component :is="iconMap[item.iconKey]" class="asset-icon" />
                  <div class="asset-text">
                    <span class="asset-name">{{ item.name }}</span>
                    <span class="asset-desc">{{ item.description }}</span>
                  </div>
                </div>
                <span class="asset-count">{{ item.count }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 数据治理 -->
        <div class="governance-foundation">
          <div class="foundation-header">
            <div class="card-icon governance-bg"><icon-settings /></div>
            <div class="card-info">
              <h4>数据治理</h4>
              <p>贯穿全生命周期的标准规范与质量保障体系</p>
            </div>
          </div>
          <div class="governance-grid">
            <div
              v-for="(item, index) in dataGovernance"
              :key="item.name"
              class="governance-item clickable-item"
              @click="goItem(item)"
            >
              <div class="asset-content">
                <component :is="iconMap[item.iconKey]" class="asset-icon" />
                <div class="asset-text">
                  <span class="asset-name">{{ item.name }}</span>
                  <span class="asset-desc">{{ item.description }}</span>
                </div>
              </div>
              <span class="asset-count">{{ item.count }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 缺失工单弹窗 -->
    <MissingTicketModal
      v-model:visible="showMissingTicketModal"
      :context="ticketContext"
      @confirm="handleMissingTicketConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import {
  IconSearch, IconRight, IconHeart, IconFilter,
  IconApps, IconCloud, IconStorage, IconUserGroup, IconBulb,
  IconTrophy, IconSettings, IconBook, IconFile, IconDesktop,
  IconBarChart, IconTags, IconCalendar, IconCodeBlock, IconSafe,
  IconBranch, IconLink, IconCommon, IconPlus
} from '@arco-design/web-vue/es/icon'

import { onMounted, markRaw } from 'vue'
import { useRoute } from 'vue-router'
import MissingTicketModal from '@/pages/search/MissingTicketModal.vue'
import { useMissingTicket } from '@/composables/useMissingTicket'

const { showMissingTicketModal, ticketContext, showMissingTicket, handleMissingTicketConfirm } = useMissingTicket()
const router = useRouter()
const route = useRoute()

// 兼容老链接:访问 /dca/discovery(无子路径) 时自动重定向到新总览页
// 注意:本组件现在被 /discovery 与 /discovery/overview 两个入口复用,只对
// 严格路径为 discovery 时才重定向,避免 overview → overview 自循环
onMounted(() => {
  const normalized = (route?.path || '').replace(/^\/dca/, '').replace(/^\//, '')
  // normalized 是 'discovery' 或 'discovery/overview' 或 'discovery/xxx'
  // 严格等于 'discovery' 才触发
  if (normalized === 'discovery' && !route?.query?.from) {
    router.replace('discovery/overview')
  }
})

/**
 * 把任意形式的 path 规范成 vue-router 期望的相对路径:
 * - 去掉前导 '/'(避免被 createWebHistory 当成绝对路径而跳过 BASE)
 * - 去掉子应用 BASE 前缀(比如 '/dca'、'/dca/'),防止路由守卫再次剥前缀
 *   时把 query / 路由名解析错位,从而落到 :pathMatch(.*)* 通配兜底
 *
 * 设计意图:数据源与跳转入口只关心「相对模块路径」,不必关心部署 BASE,
 * 所有跳转都通过这一个口子规范化。
 */
const normalizePath = (raw: string): string => {
  if (!raw) return ''
  let p = raw.trim()
  // 去掉子应用 BASE 前缀(/dca、/dca/)
  p = p.replace(/^\/dca\/?/, '/')
  // 确保以 / 开头（绝对路径，vue-router 需要绝对路径才能正确匹配）
  if (!p.startsWith('/')) p = '/' + p
  return p
}

const safePush = (path: string) => {
  const target = normalizePath(path)
  if (!target) return
  router.push(target)
}

const searchForm = ref({ keyword: '', include: '', exclude: '', module: '' })
const showAdvancedFilter = ref(false)
const moduleOptions = ['贷前分析', '风控评估', '反欺诈', '自营业务', '客户运营', '资产管理', '数据治理', '监管报送']

// ========== 常用表集合(8 个,跨业务/技术/治理)==========
// path 统一为相对路径(不带 /dca 前缀),由 vue-router 自动拼 BASE。
// BASE 不再在此处参与拼接,避免出现前 5 张带前缀、后 3 张不带前缀的不一致。
const collections = ref([
  {
    id: 1, name: '贷前分析', description: '贷前准入、评级、授信相关数据',
    type: '业务流程', typeColor: 'red', count: 156,
    iconKey: 'bar-chart', iconBg: 'linear-gradient(135deg, #f53f3f, #f76560)',
    followers: [{ name: '王', color: '#165dff' }, { name: '张', color: '#f53f3f' }, { name: '李', color: '#00b42a' }],
    path: 'discovery/collection/1'
  },
  {
    id: 2, name: '风控评估', description: '风控模型、欺诈检测、预警数据',
    type: '业务流程', typeColor: 'red', count: 89,
    iconKey: 'safe', iconBg: 'linear-gradient(135deg, #fa541c, #ff7a45)',
    followers: [{ name: '张', color: '#f53f3f' }, { name: '陈', color: '#722ed1' }],
    path: 'discovery/collection/2'
  },
  {
    id: 3, name: '反欺诈策略', description: '欺诈规则、关联图谱、案件数据',
    type: '业务流程', typeColor: 'red', count: 234,
    iconKey: 'branch', iconBg: 'linear-gradient(135deg, #722ed1, #9254de)',
    followers: [{ name: '陈', color: '#722ed1' }, { name: '林', color: '#165dff' }, { name: '黄', color: '#00b42a' }, { name: '赵', color: '#fa8c16' }],
    path: 'discovery/collection/3'
  },
  {
    id: 4, name: '客户主档域', description: '客户基本信息、画像主表(非个人粒度)',
    type: '数据域', typeColor: 'arcoblue', count: 86,
    iconKey: 'user-group', iconBg: 'linear-gradient(135deg, #165dff, #722ed1)',
    followers: [{ name: '王', color: '#165dff' }, { name: '李', color: '#00b42a' }],
    path: 'discovery/collection/4'
  },
  {
    id: 5, name: '用户域核心表', description: '用户主档、画像、标签主表',
    type: '数据域', typeColor: 'arcoblue', count: 128,
    iconKey: 'storage', iconBg: 'linear-gradient(135deg, #00b42a, #00d25c)',
    followers: [{ name: '王', color: '#165dff' }, { name: '钱', color: '#f53f3f' }, { name: '孙', color: '#722ed1' }],
    path: 'discovery/collection/5'
  },
  {
    id: 6, name: '交易域核心表', description: '订单、支付、清结算主表',
    type: '数据域', typeColor: 'arcoblue', count: 256,
    iconKey: 'common', iconBg: 'linear-gradient(135deg, #13c2c2, #36cfc9)',
    followers: [{ name: '李', color: '#00b42a' }, { name: '周', color: '#165dff' }],
    path: 'discovery/asset-catalog?domain=交易域'
  },
  {
    id: 7, name: '指标体系', description: '业务指标、原子指标、衍生指标',
    type: '指标', typeColor: 'purple', count: 312,
    iconKey: 'bar-chart', iconBg: 'linear-gradient(135deg, #722ed1, #b37feb)',
    followers: [{ name: '赵', color: '#fa8c16' }, { name: '吴', color: '#722ed1' }, { name: '郑', color: '#f53f3f' }],
    path: 'discovery/unified-metrics'
  },
  {
    id: 8, name: '监管报送', description: 'EAST、反洗钱、人行报表数据',
    type: '合规', typeColor: 'orange', count: 47,
    iconKey: 'file', iconBg: 'linear-gradient(135deg, #fa8c16, #ffa940)',
    followers: [{ name: '钱', color: '#f53f3f' }, { name: '冯', color: '#165dff' }],
    path: 'discovery/collection/8'
  }
])

// ========== 数据资源(4 类,带子项)==========
// icon 字段用字符串 key(避免组件对象被 ref reactive 化时报警告)
// 渲染时由 iconMap 通过 markRaw 解析成组件
const dataResources = ref([
  { name: '业务系统', count: 6, description: '核心 ERP/CRM/信贷系统', iconKey: 'desktop', path: 'discovery/data-resources' },
  { name: '外部数据', count: 8, description: '三方征信/银联/同盾', iconKey: 'cloud', path: 'discovery/external' },
  { name: '文件导入', count: 5, description: 'Excel/CSV 线下数据', iconKey: 'file', path: 'discovery/asset-catalog?source=file' },
  { name: '日志数据', count: 6, description: '埋点/应用/操作日志', iconKey: 'code-block', path: 'discovery/asset-catalog?source=log' },
  { name: '实时数据', count: 4, description: 'Kafka/CDC 流式接入', iconKey: 'bar-chart', path: 'discovery/asset-catalog?source=realtime' }
])

// ========== 业务系统接入概览(6 个业务系统)==========
const businessSystems = ref([
  { id: 'BS001', name: '核心交易系统', dbType: 'mysql', dbTypeLabel: 'MySQL', systemType: 'core', systemTypeLabel: '核心交易', database: 'core_trade', tableCount: 320, owner: '李开发', updatedAt: '今天 10:30', status: 'syncing', path: 'discovery/data-resources' },
  { id: 'BS002', name: '风控决策引擎', dbType: 'doris', dbTypeLabel: 'Doris', systemType: 'risk', systemTypeLabel: '风控系统', database: 'risk_decision', tableCount: 180, owner: '张风控', updatedAt: '今天 09:15', status: 'syncing', path: 'discovery/data-resources' },
  { id: 'BS003', name: '用户中心', dbType: 'pg', dbTypeLabel: 'PostgreSQL', systemType: 'core', systemTypeLabel: '核心交易', database: 'user_center', tableCount: 95, owner: '王运营', updatedAt: '今天 11:20', status: 'syncing', path: 'discovery/data-resources' },
  { id: 'BS004', name: '营销活动平台', dbType: 'hive', dbTypeLabel: 'Hive', systemType: 'marketing', systemTypeLabel: '营销系统', database: 'mkt_platform', tableCount: 420, owner: '陈营销', updatedAt: '今天 08:45', status: 'syncing', path: 'discovery/data-resources' },
  { id: 'BS005', name: '财务核算系统', dbType: 'oracle', dbTypeLabel: 'Oracle', systemType: 'finance', systemTypeLabel: '财务系统', database: 'fin_acc', tableCount: 220, owner: '吴财务', updatedAt: '昨天 17:30', status: 'syncing', path: 'discovery/data-resources' },
  { id: 'BS006', name: '数据分析平台', dbType: 'clickhouse', dbTypeLabel: 'ClickHouse', systemType: 'core', systemTypeLabel: '核心交易', database: 'olap', tableCount: 180, owner: '王运营', updatedAt: '今天 14:15', status: 'syncing', path: 'discovery/data-resources' }
])

// 业务系统统计
const bsTotalSystems = computed(() => businessSystems.value.length)
const bsTotalTables = computed(() => businessSystems.value.reduce((s, r: any) => s + r.tableCount, 0))
const dbTypeColor = (t: string) => ({ mysql: 'arcoblue', doris: 'green', pg: 'cyan', hive: 'orange', oracle: 'red', clickhouse: 'purple' }[t] || 'gray')

// ========== 数据资产(6 个域)==========
const dataAssets = ref([
  { name: '用户域', count: 128, description: '客户主档/画像/标签', path: 'discovery/asset-catalog?domain=用户域' },
  { name: '交易域', count: 256, description: '订单/支付/清结算', path: 'discovery/asset-catalog?domain=交易域' },
  { name: '风控域', count: 95, description: '模型/规则/策略', path: 'discovery/asset-catalog?domain=风控域' },
  { name: '营销域', count: 132, description: '活动/圈选/触达', path: 'discovery/asset-catalog?domain=营销域' },
  { name: '财务域', count: 78, description: '账务/计费/对账', path: 'discovery/asset-catalog?domain=财务域' },
  { name: '产品域', count: 64, description: '产品/合同/资产', path: 'discovery/asset-catalog?domain=产品域' }
])

// ========== 数据要素(2 类,PRD 要求)==========
const dataElements = ref([
  { name: '风险特征', count: 312, description: '原子/衍生/模型特征', iconKey: 'code-block', path: 'discovery/risk-feature' },
  { name: '核心指标', count: 48, description: '北极星/业务结果指标', iconKey: 'bar-chart', path: 'discovery/unified-metrics' }
])

// ========== 数据治理(6 块,补全 mock)==========
const dataGovernance = ref([
  { name: '元数据管理', count: 1283, description: '表/字段/血缘', iconKey: 'storage', path: 'management/metadata/modeling' },
  { name: '数据标准', count: 256, description: '国标/行标/企标', iconKey: 'book', path: 'management/data-standard/standards' },
  { name: '数据质量', count: 89, description: '完整度/准确度/及时性', iconKey: 'safe', path: 'discovery/asset-catalog' },
  { name: '数据安全', count: 47, description: '分级/脱敏/权限', iconKey: 'safe', path: 'management/permission/data-permission/apply' },
  { name: '业务概念', count: 178, description: '业务术语/口径', iconKey: 'link', path: 'management/business-concept' },
  { name: '资产标签', count: 312, description: '资产分类/标签', iconKey: 'tags', path: 'management/asset-management/asset-tags' }
])

// 图标 key → 组件 映射(用 markRaw 防止被 reactive 包装)
const iconMap = markRaw<Record<string, any>>({
  'desktop': IconDesktop,
  'cloud': IconCloud,
  'file': IconFile,
  'code-block': IconCodeBlock,
  'bar-chart': IconBarChart,
  'tags': IconTags,
  'bulb': IconBulb,
  'branch': IconBranch,
  'storage': IconStorage,
  'book': IconBook,
  'safe': IconSafe,
  'link': IconLink,
  'user-group': IconUserGroup,
  'common': IconCommon
})

// 合计
const totalResources = computed(() => dataResources.value.reduce((s, r: any) => s + r.count, 0))
const totalAssets = computed(() => dataAssets.value.reduce((s, r: any) => s + r.count, 0))
const totalElements = computed(() => dataElements.value.reduce((s, r: any) => s + r.count, 0))

// ========== 操作 ==========
const handleSearch = () => {
  if (!searchForm.value.keyword) {
    Message.warning('请输入搜索关键词')
    return
  }
  // 搜索跳转需要携带 query,走 push 对象形式,目标路径同样经过 normalize
  router.push({ path: normalizePath('discovery/search'), query: { q: searchForm.value.keyword, tab: 'all' } })
}

const toggleAdvancedFilter = () => {
  showAdvancedFilter.value = !showAdvancedFilter.value
}

const resetSearch = () => {
  searchForm.value = { keyword: '', include: '', exclude: '', module: '' }
}

const handleFollow = () => {
  Message.info('关注资产后,您将收到资产变更相关的通知')
}

const onViewAllCollections = () => {
  safePush('discovery/asset-catalog')
}
const onViewDataSystem = () => {
  safePush('discovery/asset-catalog')
}

// 5 个区域共用一个 item 跳转入口,消除「5 个 handle 函数互相重复」的问题
const goItem = (item: { path: string }) => safePush(item.path)
</script>

<style scoped>
.data-map-container { min-height: 100vh; background: #f7f8fa; }

.banner-section {
  background: linear-gradient(180deg, #E6F0FF 0%, #F7F8FA 100%);
  padding: 40px 0; position: relative; display: flex; justify-content: center;
  align-items: center; min-height: 320px;
}
.banner-content {
  width: 100%; max-width: 1800px; z-index: 2; position: relative;
  display: flex; flex-direction: column; padding: 0 40% 0 40px; box-sizing: border-box;
}
.banner-title { font-size: 44px; font-weight: bold; color: #1d2129; margin: 0 0 16px 0; line-height: 1.2; }
.version-tag { font-size: 36px; font-weight: 600; background: linear-gradient(90deg, #165DFF 0%, #00B42A 100%); -webkit-background-clip: text; color: transparent; margin-left: 12px; }
.banner-subtitle { font-size: 14px; color: #86909c; margin-bottom: 32px; max-width: 600px; line-height: 1.6; }

.search-area { display: flex; gap: 16px; align-items: center; width: 100%; max-width: 800px; }
.main-search-input { flex: 1; background: #fff; border-radius: 30px; border: 1px solid #165DFF; box-shadow: 0 4px 10px rgba(22,93,255,0.1); }
.main-search-input :deep(.arco-input-wrapper) { border-radius: 30px; padding-left: 20px; background: #fff; }
.main-search-input :deep(.arco-input-search-btn) { border-radius: 0 30px 30px 0; background: transparent; color: #165DFF; border-left: 1px solid #f2f3f5; }
.action-btn { background: #fff; border: 1px solid #a9c5ff; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); color: #165DFF; }

.advanced-filter-panel { margin-top: 16px; padding: 24px; background: #fff; border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.08); width: 100%; max-width: 800px; border: 1px solid #e5e6eb; }
.filter-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }

.banner-decoration { position: absolute; right: 0; top: 0; width: 40%; height: 100%; overflow: hidden; pointer-events: none; }
.decoration-cube { position: absolute; top: 40px; right: 100px; width: 200px; height: 200px; background: linear-gradient(135deg, #e8f3ff 0%, #cce4ff 100%); transform: rotate(-15deg) skew(-10deg); border-radius: 20px; box-shadow: -20px 20px 40px rgba(22,93,255,0.1); }

.main-content { padding: 0 40px 40px; width: 100%; max-width: 1800px; margin: -40px auto 0; position: relative; z-index: 3; }

.content-section { background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.section-title { font-size: 16px; font-weight: 600; color: #1d2129; margin: 0; }
.more-link { font-size: 13px; }

.collection-card { border-radius: 8px; border: 1px solid #e5e6eb; cursor: pointer; transition: all 0.2s; }
.collection-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); border-color: #165dff; }
.collection-card :deep(.arco-card-body) { padding: 20px; }
.card-content { display: flex; flex-direction: column; }
.card-icon-box { width: 40px; height: 40px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 20px; margin-bottom: 12px; }
.collection-name { font-size: 15px; font-weight: 600; color: #1d2129; margin: 0 0 8px 0; }
.collection-desc { font-size: 13px; color: #86909c; margin: 0 0 12px 0; min-height: 36px; }
.collection-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.table-count { font-size: 13px; color: #86909c; }

.data-flow-container { display: flex; justify-content: space-between; align-items: stretch; gap: 24px; margin-top: 16px; }
.system-column { flex: 1; display: flex; flex-direction: column; background: #f7f8fa; border-radius: 8px; overflow: hidden; border: 1px solid #e5e6eb; min-width: 0; }
.relationship-card { display: flex; align-items: center; background: #fff; padding: 20px; border-bottom: 1px solid #e5e6eb; }
.column-list { padding: 12px 20px; background: #fff; }
.asset-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f2f3f5; cursor: pointer; transition: background-color 0.2s; }
.asset-item:hover { background-color: #f2f3f5; padding: 10px 8px; margin: 0 -8px; border-radius: 4px; }
.asset-item:last-child { border-bottom: none; }
.asset-content { display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1; }
.asset-text { display: flex; flex-direction: column; min-width: 0; }
.asset-icon { color: #165DFF; font-size: 16px; flex-shrink: 0; }
.asset-name { font-size: 14px; color: #4e5969; font-weight: 500; }
.asset-desc { font-size: 11px; color: #86909c; margin-top: 2px; }
.asset-count { font-size: 12px; color: #86909c; font-weight: 600; flex-shrink: 0; margin-left: 8px; }
.arrow-connector { color: #c9cdd4; font-size: 24px; display: flex; align-items: center; }

.card-icon { width: 48px; height: 48px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 24px; margin-right: 16px; color: #fff; flex-shrink: 0; }
.resource-bg { background: linear-gradient(135deg, #165DFF 0%, #722ED1 100%); }
.asset-bg { background: linear-gradient(135deg, #00B42A 0%, #00D25C 100%); }
.element-bg { background: linear-gradient(135deg, #FF7D00 0%, #FF9A2E 100%); }
.governance-bg { background: linear-gradient(135deg, #F53F3F 0%, #F76560 100%); }
.card-info h4 { margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1d2129; }
.card-info p { margin: 0; font-size: 12px; color: #86909c; line-height: 1.5; }

.governance-foundation { display: flex; align-items: center; background: #fff; border: 1px solid #ffccc7; border-left: 4px solid #F53F3F; border-radius: 4px; padding: 20px 24px; margin-top: 16px; }
.foundation-header { display: flex; align-items: center; width: 280px; flex-shrink: 0; border-right: 1px solid #e5e6eb; padding-right: 32px; margin-right: 32px; }
.governance-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; flex: 1; }
.governance-item { display: flex; align-items: center; justify-content: space-between; background: #f9f9f9; padding: 16px; border-radius: 6px; transition: all 0.2s; cursor: pointer; }
.governance-item:hover { background: #fff; border-color: #ffccc7; box-shadow: 0 4px 12px rgba(0,0,0,0.05); transform: translateY(-2px); }

/* 业务系统接入概览 */
.bs-summary-row { display: flex; align-items: center; gap: 0; background: #f7f8fa; border-radius: 8px; padding: 20px 24px; }
.bs-summary-item { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 0 32px; }
.bs-summary-value { font-size: 28px; font-weight: 700; color: #1d2129; line-height: 1.2; }
.bs-summary-label { font-size: 13px; color: #86909c; }
.bs-summary-divider { width: 1px; height: 32px; background: #e5e6eb; }

.bs-card { background: #fff; border: 1px solid #e5e6eb; border-radius: 8px; padding: 16px 20px; cursor: pointer; transition: all 0.2s; height: 100%; box-sizing: border-box; }
.bs-card:hover { border-color: #165dff; box-shadow: 0 4px 12px rgba(22,93,255,0.12); transform: translateY(-2px); }

.bs-card-header { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #f2f3f5; }
.bs-card-name { font-size: 15px; font-weight: 600; color: #1d2129; flex: 1; }
.bs-sync-dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #00b42a; margin-right: 4px; }

.bs-card-body { padding-top: 4px; }
.bs-card-info { display: flex; flex-direction: column; gap: 8px; }
.bs-info-item { display: flex; justify-content: space-between; align-items: center; font-size: 13px; }
.bs-info-label { color: #86909c; }
.bs-info-value { color: #4e5969; font-weight: 500; }
.bs-table-count { color: #165dff; font-weight: 600; }
</style>
