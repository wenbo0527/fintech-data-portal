<template>
  <div class="risk-feature-page">
    <PageBanner
      v-model:search="search"
      title="风险特征"
      subtitle="风控特征统一注册与选型管理 · 支持 HBase 在线点查 / Doris 分析取数"
      search-placeholder="搜索特征名称、编码或底层表"
    >
      <template #filters>
        <a-tag class="banner-model-tag" color="arcoblue" size="large">要素模型 v2</a-tag>
      </template>
      <template #actions>
        <a-button type="primary" class="action-btn" size="large" @click="openRegister">
          <template #icon><icon-plus /></template>
          注册特征
        </a-button>
        <a-button class="action-btn" size="large" @click="showMissingTicket({ assetType: 'feature', pageSource: '风险特征' })">
          <template #icon><icon-plus /></template>
          缺失工单
        </a-button>
      </template>
    </PageBanner>

    <div class="main-content">
      <!-- 引擎筛选 + 统计条 -->
      <a-card :bordered="false" class="toolbar-card">
        <div class="toolbar">
          <a-radio-group v-model="engineFilter" type="button">
            <a-radio value="all">全部</a-radio>
            <a-radio value="HBase">HBase</a-radio>
            <a-radio value="Doris">Doris</a-radio>
          </a-radio-group>
          <div class="stats-bar">
            <span class="stat-item">特征总数<b>{{ stats.total }}</b></span>
            <span class="stat-divider" />
            <span class="stat-item">HBase<b class="stat-hbase">{{ stats.hbase }}</b></span>
            <span class="stat-item">Doris<b class="stat-doris">{{ stats.doris }}</b></span>
            <span class="stat-divider" />
            <span class="stat-item">已上架<b class="stat-online">{{ stats.online }}</b></span>
          </div>
        </div>
      </a-card>

      <!-- 特征卡片网格 -->
      <a-row v-if="filteredList.length" :gutter="[16, 16]">
        <a-col v-for="f in filteredList" :key="f.id" :xs="24" :sm="12" :md="8" :lg="6">
          <a-card hoverable :bordered="false" class="feature-card">
            <div class="card-head">
              <span class="feature-name" :title="f.name">{{ f.name }}</span>
              <div class="card-tags">
                <a-tag :color="engineMeta(f.engine).color" size="small">{{ engineMeta(f.engine).label }}</a-tag>
                <a-tag :color="statusMeta(f.status).color" size="small">{{ statusMeta(f.status).label }}</a-tag>
              </div>
            </div>
            <div class="feature-code">{{ f.code }}</div>
            <div class="feature-desc">{{ f.description }}</div>
            <div class="feature-table">
              <icon-storage class="table-icon" />
              <a class="base-table-link" :title="baseTableHint(f.baseTable)" @click="goBaseTable(f.baseTable)">
                {{ f.baseTable }}
              </a>
              <a-tag class="value-type-tag" size="small" color="gray">{{ f.valueType }}</a-tag>
            </div>
            <div class="card-foot">
              <span class="foot-item"><icon-user /> {{ f.owner }}</span>
              <span class="foot-item"><icon-clock-circle /> {{ f.updatedAt }}</span>
              <span class="foot-item"><icon-link /> 引用 {{ f.refCount }}</span>
            </div>
          </a-card>
        </a-col>
      </a-row>

      <!-- 空态：筛选无结果时引导注册 -->
      <a-card v-else :bordered="false" class="empty-card">
        <a-empty description="没有匹配的特征，换个引擎或关键字试试">
          <a-button type="primary" @click="openRegister">
            <template #icon><icon-plus /></template>
            注册特征
          </a-button>
        </a-empty>
      </a-card>
    </div>

    <!-- 注册特征抽屉 -->
    <a-drawer
      v-model:visible="drawerVisible"
      :width="520"
      placement="right"
      title="注册风险特征"
      ok-text="提交注册"
      cancel-text="取消"
      :ok-loading="submitting"
      :mask-closable="false"
      unmount-on-close
      @ok="handleSubmit"
      @cancel="drawerVisible = false"
    >
      <a-alert type="info" class="drawer-alert">
        特征需绑定一张已上线的底层表：HBase 走 rowkey 在线点查，Doris 走 OLAP 聚合分析。
      </a-alert>
      <a-form ref="formRef" :model="form" layout="vertical" :disabled="submitting">
        <a-form-item field="name" label="特征名称" :rules="[{ required: true, message: '请输入特征名称' }]">
          <a-input v-model="form.name" placeholder="如：近90天逾期10天+次数" allow-clear />
        </a-form-item>
        <a-form-item
          field="code"
          label="特征编码"
          :rules="[{ required: true, message: '请输入特征编码' }]"
          extra="建议 feat_ 前缀，注册后不可重复"
        >
          <a-input v-model="form.code" placeholder="如：feat_overdue10_cnt_90d" allow-clear />
        </a-form-item>
        <a-form-item field="description" label="业务描述">
          <a-textarea v-model="form.description" :max-length="200" show-word-limit :auto-size="{ minRows: 2 }" placeholder="口径、加工逻辑与适用模型" />
        </a-form-item>
        <a-form-item field="valueType" label="值类型">
          <a-select v-model="form.valueType" placeholder="请选择值类型">
            <a-option v-for="t in VALUE_TYPES" :key="t" :value="t">{{ t }}</a-option>
          </a-select>
        </a-form-item>
        <a-form-item field="engine" label="存储引擎" :rules="[{ required: true, message: '请选择存储引擎' }]">
          <div class="engine-block">
            <a-radio-group v-model="form.engine" type="button" @change="handleEngineChange">
              <a-radio value="HBase">HBase</a-radio>
              <a-radio value="Doris">Doris</a-radio>
            </a-radio-group>
            <div class="engine-hint">{{ engineHint }}</div>
          </div>
        </a-form-item>
        <a-form-item field="baseTable" label="底层表" :rules="[{ required: true, message: '请选择底层表' }]">
          <div class="table-block">
            <a-select v-model="form.baseTable" placeholder="选择该引擎下已上线的底层表" allow-search>
              <a-option v-for="opt in engineTables" :key="opt.value" :value="opt.value">{{ opt.label }}</a-option>
            </a-select>
            <div class="table-hint">{{ form.engine }} 当前可选已上线底表 {{ engineTables.length }} 张</div>
          </div>
        </a-form-item>
        <a-form-item field="owner" label="负责人">
          <a-input v-model="form.owner" placeholder="如：赵六" allow-clear />
        </a-form-item>
      </a-form>
    </a-drawer>

    <!-- 缺失工单弹窗 -->
    <MissingTicketModal
      v-model:visible="showMissingTicketModal"
      :context="ticketContext"
      @confirm="handleMissingTicketConfirm"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * 风险特征（数据要素 v2 · discovery/risk-feature）
 *
 * 演示角色：风控数据工程师 / 特征平台 Owner
 * 核心卖点：特征注册时可选型存储引擎（HBase 在线点查 / Doris 分析取数），
 *          并绑定该引擎下「已上线」的底层表；底层表来自唯一事实源
 *          @/mock-dca/shared/table-catalog-store，可下钻表详情（data-map-table）。
 * 持久化：localStorage('dca-risk-feature-v1')，种子 + 用户注册项合并保存。
 */
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import type { FormInstance } from '@arco-design/web-vue'
import { IconPlus, IconUser, IconClockCircle, IconStorage, IconLink } from '@arco-design/web-vue/es/icon'
import PageBanner from '@/components-dca/common/PageBanner.vue'
import MissingTicketModal from '@/pages/search/MissingTicketModal.vue'
import { useMissingTicket } from '@/composables/useMissingTicket'
// 注意：dca 自己的 mock 必须走 @/mock-dca（@/mock 与 @/pages 别名指向 dfd 项目）
import { TableCatalogStore } from '@/mock-dca/shared/table-catalog-store'

const { showMissingTicketModal, ticketContext, showMissingTicket, handleMissingTicketConfirm } = useMissingTicket()
const router = useRouter()

/** 特征上架状态：online 已上架 / draft 草稿 / offline 已下架 */
type FeatureStatus = 'online' | 'draft' | 'offline'

interface RiskFeature {
  id: string
  name: string
  code: string
  description: string
  /** 值类型：数值 / 类别 / 布尔 / 向量 */
  valueType: string
  /** 存储引擎：HBase（在线点查）/ Doris（分析取数） */
  engine: string
  /** 底层表：统一表目录中的逻辑表名 */
  baseTable: string
  status: FeatureStatus
  owner: string
  updatedAt: string
  /** 被下游模型/策略引用次数（挡板） */
  refCount: number
}

const VALUE_TYPES: string[] = ['数值', '类别', '布尔', '向量']

// ── 种子特征：底表名取自统一表目录（HBase: ads_feature_user_rt / ads_feature_device_rt；
//    Doris: dws_metric_credit_rt / ads_metric_dashboard）──
const USER_RT = 'ads_feature_user_rt'
const DEVICE_RT = 'ads_feature_device_rt'
const CREDIT_RT = 'dws_metric_credit_rt'
const DASHBOARD = 'ads_metric_dashboard'

const SEED_FEATURES: RiskFeature[] = [
  { id: 'rf001', name: '实时信用评分', code: 'feat_credit_score_rt', description: '客户维度模型实时评分，rowkey=user_id 毫秒级点查供决策引擎取数', valueType: '数值', engine: 'HBase', baseTable: USER_RT, status: 'online', owner: '赵六', updatedAt: '2025-09-14 10:20', refCount: 12 },
  { id: 'rf002', name: '近90天逾期10天+次数', code: 'feat_overdue10_cnt_90d', description: '近90天逾期天数≥10的借据笔数，贷前准入强规则变量', valueType: '数值', engine: 'HBase', baseTable: USER_RT, status: 'online', owner: '赵六', updatedAt: '2025-09-13 09:05', refCount: 8 },
  { id: 'rf003', name: '近30天申请次数', code: 'feat_apply_cnt_30d', description: '近30天授信申请提交次数，多头借贷行为刻画', valueType: '数值', engine: 'HBase', baseTable: USER_RT, status: 'online', owner: '李四', updatedAt: '2025-09-12 16:40', refCount: 6 },
  { id: 'rf004', name: '近7天登录次数', code: 'feat_login_cnt_7d', description: '近7天有效登录次数，活跃度与账户盗用识别输入', valueType: '数值', engine: 'HBase', baseTable: USER_RT, status: 'online', owner: '李四', updatedAt: '2025-09-11 20:15', refCount: 4 },
  { id: 'rf005', name: '设备风险标签', code: 'feat_device_risk_label', description: '设备指纹聚合风险标签：root/群控/秒拨等类别枚举', valueType: '类别', engine: 'HBase', baseTable: DEVICE_RT, status: 'online', owner: '赵六', updatedAt: '2025-09-14 08:30', refCount: 15 },
  { id: 'rf006', name: '是否模拟器', code: 'feat_is_emulator', description: '设备环境模拟器识别结果，反欺诈第一道拦截', valueType: '布尔', engine: 'HBase', baseTable: DEVICE_RT, status: 'online', owner: '刘一', updatedAt: '2025-09-10 14:20', refCount: 9 },
  { id: 'rf007', name: '近1小时交易笔数', code: 'feat_txn_cnt_1h', description: '设备维度近1小时滑动窗口交易笔数，异常高频交易监控', valueType: '数值', engine: 'HBase', baseTable: DEVICE_RT, status: 'online', owner: '刘一', updatedAt: '2025-09-13 21:50', refCount: 7 },
  { id: 'rf008', name: '授信通过率特征', code: 'feat_credit_pass_rate', description: '客户所属机构/产品口径授信通过率，批量分析与模型稳定性监控', valueType: '数值', engine: 'Doris', baseTable: CREDIT_RT, status: 'online', owner: '孙七', updatedAt: '2025-09-12 11:10', refCount: 5 },
  { id: 'rf009', name: '机构维度集中度', code: 'feat_org_concentration', description: '客户在机构维度的业务集中度（HHI），用于组合风险分析', valueType: '数值', engine: 'Doris', baseTable: CREDIT_RT, status: 'draft', owner: '孙七', updatedAt: '2025-09-09 17:25', refCount: 0 },
  { id: 'rf010', name: '渠道活跃度分位', code: 'feat_channel_active_pct', description: '同渠道客户活跃度分位数，老口径已迁至 dws 宽表', valueType: '数值', engine: 'Doris', baseTable: DASHBOARD, status: 'offline', owner: '吴九', updatedAt: '2025-08-28 10:00', refCount: 1 }
]

// ── localStorage 持久化（种子 + 用户注册项合并） ──
const LS_KEY = 'dca-risk-feature-v1'

function loadFeatures(): RiskFeature[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as RiskFeature[]
      if (Array.isArray(parsed) && parsed.length) {
        // 用户注册项保持在前，种子中被本地缓存遮蔽的新增项补齐
        const storedIds = new Set(parsed.map(x => x.id))
        return [...parsed, ...SEED_FEATURES.filter(x => !storedIds.has(x.id))]
      }
    }
  } catch { /* 脏数据 / 隐私模式忽略，回落种子 */ }
  return SEED_FEATURES.map(x => ({ ...x }))
}

const features = ref<RiskFeature[]>(loadFeatures())

watch(features, (list) => {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(list))
  } catch { /* 配额溢出忽略 */ }
}, { deep: true })

// ── 列表筛选 ──
const search = ref('')
const engineFilter = ref<string>('all')

const filteredList = computed<RiskFeature[]>(() => {
  let list = features.value
  if (engineFilter.value !== 'all') list = list.filter(f => f.engine === engineFilter.value)
  const k = search.value.trim().toLowerCase()
  if (k) {
    list = list.filter(f =>
      f.name.toLowerCase().includes(k) ||
      f.code.toLowerCase().includes(k) ||
      f.baseTable.toLowerCase().includes(k))
  }
  return list
})

const stats = computed(() => ({
  total: features.value.length,
  hbase: features.value.filter(f => f.engine === 'HBase').length,
  doris: features.value.filter(f => f.engine === 'Doris').length,
  online: features.value.filter(f => f.status === 'online').length
}))

// ── 窄类型取值助手（规避模板内索引 Record 的 TS7053） ──
function engineMeta(e: string): { label: string; color: string } {
  if (e === 'HBase') return { label: 'HBase', color: 'orange' }
  if (e === 'Doris') return { label: 'Doris', color: 'purple' }
  return { label: e || '未选型', color: 'gray' }
}

function statusMeta(s: string): { label: string; color: string } {
  if (s === 'online') return { label: '已上架', color: 'green' }
  if (s === 'draft') return { label: '草稿', color: 'gray' }
  if (s === 'offline') return { label: '已下架', color: 'red' }
  return { label: s, color: 'gray' }
}

// ── 底层表：与统一表目录联动 ──
function baseTableHint(name: string): string {
  const t = TableCatalogStore.byName(name)
  return t ? `${t.cnName} · ${t.storage} · ${t.updateFrequency}更新 · 点击查看表详情` : '该底表暂未登记到统一表目录'
}

function goBaseTable(name: string): void {
  if (!name) return
  router.push({ name: 'data-map-table', params: { tableName: name } })
}

// ── 注册特征抽屉 ──
interface TableOption { value: string; label: string }

const drawerVisible = ref(false)
const submitting = ref(false)
const formRef = ref<FormInstance>()
const form = reactive({
  name: '',
  code: '',
  description: '',
  valueType: '数值',
  engine: 'HBase',
  baseTable: '',
  owner: '赵六'
})

/** 候选底表 = 选定引擎 + 已上线（表目录唯一事实源） */
const engineTables = computed<TableOption[]>(() =>
  TableCatalogStore.all()
    .filter(t => t.storage === form.engine && t.status === 'online')
    .map(t => ({ value: t.name, label: `${t.cnName}（${t.name}）` }))
)

const engineHint = computed<string>(() =>
  form.engine === 'HBase' ? 'rowkey 在线点查，适合模型实时取数' : 'OLAP 聚合，适合批量分析与监控'
)

/** 切换引擎：清空已选底表，避免跨引擎脏绑定 */
function handleEngineChange(): void {
  form.baseTable = ''
}

function resetForm(): void {
  form.name = ''
  form.code = ''
  form.description = ''
  form.valueType = '数值'
  form.engine = 'HBase'
  form.baseTable = ''
  form.owner = '赵六'
  submitting.value = false
  formRef.value?.clearValidate()
}

function openRegister(): void {
  resetForm()
  drawerVisible.value = true
}

function nowText(): string {
  const d = new Date()
  const p = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

async function handleSubmit(): Promise<void> {
  const instance = formRef.value
  if (!instance) return
  const errors = await instance.validate()
  if (errors) {
    Message.warning('请补齐必填项')
    return
  }
  submitting.value = true
  window.setTimeout(() => {
    const name = form.name.trim()
    const engine = form.engine
    const baseTable = form.baseTable
    features.value.unshift({
      id: `rf_${Date.now().toString(36)}`,
      name,
      code: form.code.trim(),
      description: form.description.trim() || '暂未填写业务描述',
      valueType: form.valueType,
      engine,
      baseTable,
      status: 'draft',
      owner: form.owner.trim() || '赵六',
      updatedAt: nowText(),
      refCount: 0
    })
    submitting.value = false
    drawerVisible.value = false
    Message.success(`特征「${name}」注册成功 · ${engine} 底表 ${baseTable}，当前为草稿态`)
    resetForm()
  }, 600)
}
</script>

<style scoped>
.risk-feature-page { min-height: 100vh; background: var(--dca-bg-page-alt); position: relative; overflow-x: hidden; }
.action-btn { white-space: nowrap; }
.banner-model-tag { margin-right: var(--dca-spacing-sm); }
.main-content { padding: 0 40px var(--dca-spacing-2xl); width: 100%; max-width: var(--dca-page-max-width-wide); margin: -40px auto 0; position: relative; z-index: 3; }
.toolbar-card { border-radius: var(--dca-radius-lg); margin-bottom: var(--dca-spacing-md); }
.toolbar { display: flex; align-items: center; justify-content: space-between; gap: var(--dca-spacing-md); flex-wrap: wrap; }
.stats-bar { display: flex; align-items: center; gap: var(--dca-spacing-md); flex-wrap: wrap; font-size: var(--dca-font-sm); color: var(--dca-text-tertiary); }
.stat-item b { font-size: var(--dca-font-2xl); font-weight: 700; color: var(--dca-text-primary); margin-left: var(--dca-spacing-xs); }
.stat-hbase { color: var(--dca-warning) !important; }
.stat-doris { color: var(--dca-brand-secondary) !important; }
.stat-online { color: var(--dca-success) !important; }
.stat-divider { width: 1px; height: 18px; background: var(--dca-border-default); }
.feature-card { cursor: default; transition: all 0.3s; border-radius: var(--dca-radius-lg); height: 100%; }
.feature-card:hover { transform: translateY(-4px); box-shadow: var(--dca-shadow-lg); }
.card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--dca-spacing-sm); margin-bottom: var(--dca-spacing-sm); }
.feature-name { font-size: var(--dca-font-xl); font-weight: 600; color: var(--dca-text-primary); line-height: 1.4; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.card-tags { display: flex; gap: 6px; flex-shrink: 0; }
.feature-code { font-family: Menlo, Consolas, monospace; font-size: var(--dca-font-sm); color: var(--dca-brand-primary); margin-bottom: var(--dca-spacing-sm); }
.feature-desc { font-size: var(--dca-font-sm); color: var(--dca-text-secondary); line-height: 1.5; min-height: 40px; margin-bottom: var(--dca-spacing-sm); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.feature-table { display: flex; align-items: center; gap: 6px; font-size: var(--dca-font-sm); color: var(--dca-text-tertiary); padding: var(--dca-spacing-sm) 0; border-top: 1px dashed var(--dca-border-default); border-bottom: 1px dashed var(--dca-border-default); margin-bottom: var(--dca-spacing-sm); }
.table-icon { color: var(--dca-text-tertiary); }
.base-table-link { color: var(--dca-brand-primary); cursor: pointer; font-family: Menlo, Consolas, monospace; font-size: var(--dca-font-sm); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.base-table-link:hover { text-decoration: underline; }
.value-type-tag { flex-shrink: 0; }
.card-foot { display: flex; align-items: center; gap: var(--dca-spacing-md); font-size: var(--dca-font-sm); color: var(--dca-text-tertiary); flex-wrap: wrap; }
.foot-item { display: inline-flex; align-items: center; gap: 4px; }
.empty-card { border-radius: var(--dca-radius-lg); padding: var(--dca-spacing-xl) 0; }
.drawer-alert { margin-bottom: var(--dca-spacing-md); }
.engine-block, .table-block { width: 100%; }
.engine-hint, .table-hint { font-size: var(--dca-font-sm); color: var(--dca-text-tertiary); margin-top: var(--dca-spacing-xs); line-height: 1.5; }
</style>
