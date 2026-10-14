<template>
  <PageContainer>
    <div class="content-wrapper">
      <a-breadcrumb class="breadcrumb">
        <a-breadcrumb-item>数据发现</a-breadcrumb-item>
        <a-breadcrumb-item>
          <a-link @click="goMarket">API 市场</a-link>
        </a-breadcrumb-item>
        <a-breadcrumb-item>API 详情</a-breadcrumb-item>
      </a-breadcrumb>

      <!-- ==================== 兜底：id 不存在（服务被删/链接过期） ==================== -->
      <a-card v-if="!row" :bordered="false">
        <a-empty description="未找到该 API：可能已在表详情页「服务」Tab 删除，或服务 id 已失效">
          <a-button type="primary" @click="goMarket">
            <template #icon><icon-arrow-left /></template>
            返回市场
          </a-button>
        </a-empty>
      </a-card>

      <template v-else>
        <!-- ==================== 头部 ==================== -->
        <a-card :bordered="false" class="head-card">
          <div class="head-row">
            <div class="head-main">
              <div class="title-row">
                <h2 class="api-name">{{ row?.name }}</h2>
                <a-tag size="small" :color="svcStatusColor(row?.status)">{{ svcStatusLabel(row?.status) }}</a-tag>
                <a-tag size="small" color="arcoblue">{{ kindLabel(row?.kind) }}</a-tag>
                <a-tag size="small">{{ row?.domain }}</a-tag>
              </div>
              <div class="url-box">
                <a-tag size="small" :color="methodColor(ops?.method)">{{ ops?.method }}</a-tag>
                <code class="api-url">{{ row?.endpoint }}</code>
                <a-button type="text" size="small" @click="copyText(row?.endpoint || '', 'Endpoint')">
                  <template #icon><icon-copy /></template>
                  复制
                </a-button>
              </div>
              <div class="meta-line">
                来源表：
                <a-link @click="goTable(row?.tableName || '')">
                  {{ row?.tableName }} · {{ row?.tableCnName }}
                </a-link>
                <a-tag size="small" :color="sensitivityColor(row?.tableSensitivity)">
                  {{ sensitivityLabel(row?.tableSensitivity) }}
                </a-tag>
                <span class="meta-text">负责人 {{ row?.tableOwner }} · 更新于 {{ row?.updatedAt }}</span>
              </div>
            </div>
            <a-space>
              <a-button @click="goMarket">
                <template #icon><icon-arrow-left /></template>
                返回市场
              </a-button>
              <a-button type="primary" @click="goApplyTable(row?.tableName || '')">申请权限</a-button>
            </a-space>
          </div>

          <a-alert v-if="row?.status !== 'online'" type="warning" class="offline-alert">
            该服务当前为「{{ svcStatusLabel(row?.status) }}」，运行指标已归零；如需恢复请联系负责人在表详情页「服务」Tab 重新上线。
          </a-alert>
        </a-card>

        <!-- ==================== 4 Tab 调用文档 ==================== -->
        <a-card :bordered="false" class="tab-card">
          <a-tabs v-model:active-key="activeTab" :animation="false">
            <!-- ---------- Tab1 配置详情 ---------- -->
            <a-tab-pane key="config" title="配置详情">
              <a-descriptions
                :column="2"
                bordered
                size="medium"
                title="基础信息"
                :label-style="{ fontWeight: 600 }"
              >
                <a-descriptions-item label="API 名称">{{ row?.name }}</a-descriptions-item>
                <a-descriptions-item label="服务 ID">{{ row?.id }}</a-descriptions-item>
                <a-descriptions-item label="服务形态">{{ kindLabel(row?.kind) }}</a-descriptions-item>
                <a-descriptions-item label="状态">
                  <a-tag size="small" :color="svcStatusColor(row?.status)">
                    {{ svcStatusLabel(row?.status) }}
                  </a-tag>
                </a-descriptions-item>
                <a-descriptions-item label="所属域">{{ row?.domain }}</a-descriptions-item>
                <a-descriptions-item label="负责人">{{ row?.tableOwner }}</a-descriptions-item>
                <a-descriptions-item label="来源表">
                  <a-link @click="goTable(row?.tableName || '')">
                    {{ row?.tableName }} · {{ row?.tableCnName }}
                  </a-link>
                </a-descriptions-item>
                <a-descriptions-item label="表状态">
                  <a-tag size="small" :color="tableStatusColor(row?.tableStatus)">
                    {{ tableStatusLabel(row?.tableStatus) }}
                  </a-tag>
                </a-descriptions-item>
                <a-descriptions-item label="存储 / 来源系统" :span="2">
                  {{ row?.storage }} · {{ row?.sourceSystem }}
                </a-descriptions-item>
                <a-descriptions-item label="表描述" :span="2">
                  {{ tableDesc || '—' }}
                </a-descriptions-item>
              </a-descriptions>

              <div class="block-title mt">请求参数</div>
              <div class="common-params">
                公共参数：<code>pageNum</code>（当前页号，默认 1）、<code>pageSize</code>（页面大小，默认 10）
              </div>
              <a-table
                :columns="requestColumns"
                :data="doc?.requestParams ?? []"
                :pagination="false"
                size="small"
                :bordered="{ cell: true }"
                row-key="name"
              >
                <template #required="{ record }">
                  <a-tag size="small" :color="record.required ? 'red' : 'gray'">
                    {{ record.required ? '必选' : '可选' }}
                  </a-tag>
                </template>
              </a-table>

              <div class="block-title mt">返回参数</div>
              <a-table
                :columns="responseColumns"
                :data="doc?.responseParams ?? []"
                :pagination="false"
                size="small"
                :bordered="{ cell: true }"
                row-key="name"
              />
            </a-tab-pane>

            <!-- ---------- Tab2 SQL 逻辑 ---------- -->
            <a-tab-pane key="sql" title="SQL逻辑">
              <div class="pane-head">
                <span class="pane-hint">
                  该 API 由来源表按查询口径生成，过滤条件与分页由请求参数注入（挡板展示，无真实后端）。
                </span>
                <a-button type="text" size="small" @click="copyText(doc?.sql || '', 'SQL')">
                  <template #icon><icon-copy /></template>
                  复制 SQL
                </a-button>
              </div>
              <div class="code-box">
                <pre><code>{{ doc?.sql }}</code></pre>
              </div>
            </a-tab-pane>

            <!-- ---------- Tab3 调用信息 ---------- -->
            <a-tab-pane key="call" title="调用信息">
              <div class="block-title">接口地址</div>
              <div class="url-box">
                <a-tag size="small" :color="methodColor(ops?.method)">{{ ops?.method }}</a-tag>
                <code class="api-url">{{ row?.endpoint }}</code>
                <a-button type="text" size="small" @click="copyText(row?.endpoint || '', '接口地址')">
                  <template #icon><icon-copy /></template>
                  复制
                </a-button>
              </div>

              <div class="pane-head mt">
                <span class="block-title">请求示例（cURL）</span>
                <a-button type="text" size="small" @click="copyText(curlText, 'cURL 示例')">
                  <template #icon><icon-copy /></template>
                  复制
                </a-button>
              </div>
              <div class="code-box">
                <pre><code>{{ curlText }}</code></pre>
              </div>

              <div class="pane-head mt">
                <span class="block-title">返回结果示例</span>
                <a-button type="text" size="small" @click="copyText(responseText, '返回示例')">
                  <template #icon><icon-copy /></template>
                  复制
                </a-button>
              </div>
              <div class="code-box">
                <pre><code>{{ responseText }}</code></pre>
              </div>
            </a-tab-pane>

            <!-- ---------- Tab4 高级配置 ---------- -->
            <a-tab-pane key="advanced" title="高级配置">
              <a-descriptions :column="2" bordered size="medium">
                <a-descriptions-item label="限流阈值（QPS）">{{ ops?.qpsLimit ?? 0 }}</a-descriptions-item>
                <a-descriptions-item label="实时 QPS">{{ ops?.qps ?? 0 }}</a-descriptions-item>
                <a-descriptions-item label="今日调用量">{{ ops?.dailyCalls ?? '0' }}</a-descriptions-item>
                <a-descriptions-item label="成功率">{{ (ops?.successRate ?? 0).toFixed(2) }}%</a-descriptions-item>
                <a-descriptions-item label="平均延迟">{{ ops?.latency ?? 0 }} ms</a-descriptions-item>
                <a-descriptions-item label="请求方式">{{ ops?.method }}</a-descriptions-item>
                <a-descriptions-item label="分页默认参数" :span="2">
                  <code>pageNum = 1</code> · <code>pageSize = 10</code>
                  （未显式传入时按该默认值分页，SQL 侧换算为 LIMIT / OFFSET）
                </a-descriptions-item>
                <a-descriptions-item label="返回格式" :span="2">JSON（UTF-8）</a-descriptions-item>
              </a-descriptions>
            </a-tab-pane>
          </a-tabs>
        </a-card>
      </template>
    </div>
  </PageContainer>
</template>

<script setup lang="ts">
/**
 * [重构方案 P3 · 消费侧] API 市场 · 调用文档详情（dca 版）
 *
 * 取数：按 route.params.id 在 flattenServices('API') 里找行（与服务暴露 store 同源），
 *   文档正文由 apiDocOf(row) 从来源表字段元数据模板生成，
 *   运行指标由 opsOf(row) 从服务 id 的确定性哈希派生 —— 同 id 刷新恒等，纯前端挡板。
 * 结构：与 dfd 版 ApiDetail.vue 的 4-Tab 对齐（配置详情 / SQL逻辑 / 调用信息 / 高级配置），
 *   但数据全部来自 dca 表目录，不再读 localStorage；找不到 id 时走 a-empty 兜底。
 */
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { copyToClipboard } from '@/utils/copy'
import PageContainer from '@/components-dca/common/PageContainer.vue'
import {
  apiDocOf,
  flattenServices,
  opsOf,
  type ApiParamDoc
} from '@/mock-shared/service-ops'
import {
  TableCatalogStore,
  SERVICE_KIND_LABELS,
  SENSITIVITY_COLORS,
  SENSITIVITY_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
  type Sensitivity,
  type ServiceKind,
  type TableStatus
} from '@/mock-shared/table-catalog-store'

const route = useRoute()
const router = useRouter()

const activeTab = ref('config')

// ---------------- 取数 ----------------

/** 详情页当前 API（打平行）；id 不存在时为 undefined，模板走 a-empty 兜底 */
const row = computed(() => {
  const id = String(route.params.id ?? '')
  return flattenServices('API').find(s => s.id === id)
})

const doc = computed(() => (row.value ? apiDocOf(row.value) : null))
const ops = computed(() => (row.value ? opsOf(row.value) : null))
/** 来源表描述（同 store 取数，表被删除时自然为 undefined） */
const tableDesc = computed(() =>
  row.value ? TableCatalogStore.byName(row.value.tableName)?.description : undefined
)

// 同页跳转（列表 → 详情、详情之间切换）只改 params，组件不重挂载，这里重置 Tab
watch(
  () => route.params.id,
  () => {
    activeTab.value = 'config'
  }
)

// ---------------- 示例报文 ----------------

const API_HOST = 'http://openapi.demo.local'

const curlText = computed(() => {
  const r = row.value
  const d = doc.value
  if (!r || !d) return ''
  const url = `${API_HOST}${r.endpoint}`
  const auth = `  -H "Authorization: Bearer YOUR_TOKEN"`
  if (ops.value?.method === 'GET') {
    const qs = Object.entries(d.curlBody)
      .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
      .join('&')
    return [`curl -X GET "${url}?${qs}" \\`, auth].join('\n')
  }
  return [
    `curl -X POST "${url}" \\`,
    `  -H "Content-Type: application/json" \\`,
    auth,
    `  -d '${JSON.stringify(d.curlBody, null, 2)}'`
  ].join('\n')
})

/** 按参数类型给出可用的示例值（字符串保持原样，数值/布尔转成对应 JSON 类型） */
function sampleValue(p: ApiParamDoc): string | number | boolean {
  const t = p.type.toLowerCase()
  if (t === 'int' || t === 'bigint') return Number(p.example) || 1
  if (t === 'double' || t === 'float' || t === 'decimal') return Number(p.example) || 0
  if (t === 'boolean') return true
  return p.example
}

const responseText = computed(() => {
  const d = doc.value
  if (!d) return ''
  const item: Record<string, string | number | boolean> = {}
  for (const p of d.responseParams) item[p.name] = sampleValue(p)
  return JSON.stringify({ code: 200, message: 'success', data: [item] }, null, 2)
})

// ---------------- 列定义 ----------------

const requestColumns = [
  { title: '参数名', dataIndex: 'name', width: 180 },
  { title: '类型', dataIndex: 'type', width: 110 },
  { title: '操作符', dataIndex: 'operator', width: 110 },
  { title: '是否必选', slotName: 'required', width: 110 },
  { title: '示例值', dataIndex: 'example', width: 180 },
  { title: '描述', dataIndex: 'description', minWidth: 180 }
]

const responseColumns = [
  { title: '参数名', dataIndex: 'name', width: 180 },
  { title: '类型', dataIndex: 'type', width: 120 },
  { title: '示例值', dataIndex: 'example', width: 180 },
  { title: '描述', dataIndex: 'description', minWidth: 180 }
]

// ---------------- 窄类型取值助手 ----------------
// a-table / a-tag 插槽里的值会被推断为 any 或联合类型，直接索引
// Record<联合类型, ...> 常量会命中 noImplicitAny（TS7053）；用具名形参收窄（并允许 undefined）后取值。

type SvcStatus = 'online' | 'offline'
const SVC_STATUS_LABELS: Record<SvcStatus, string> = { online: '在线', offline: '已下线' }
const SVC_STATUS_COLORS: Record<SvcStatus, string> = { online: 'green', offline: 'gray' }
const METHOD_COLORS: Record<string, string> = { GET: 'arcoblue', POST: 'green' }

const svcStatusLabel = (s?: SvcStatus) => (s ? SVC_STATUS_LABELS[s] : '未知')
const svcStatusColor = (s?: SvcStatus) => (s ? SVC_STATUS_COLORS[s] : 'gray')
const sensitivityLabel = (s?: Sensitivity) => (s ? SENSITIVITY_LABELS[s] : '—')
const sensitivityColor = (s?: Sensitivity) => (s ? SENSITIVITY_COLORS[s] : 'gray')
const kindLabel = (k?: string) => (k ? SERVICE_KIND_LABELS[k as ServiceKind] || k : '—')
const tableStatusLabel = (s?: string) => (s ? STATUS_LABELS[s as TableStatus] || s : '—')
const tableStatusColor = (s?: string) => (s ? STATUS_COLORS[s as TableStatus] || 'gray' : 'gray')
const methodColor = (m?: string) => (m ? METHOD_COLORS[m] || 'gray' : 'gray')

// ---------------- 交互 ----------------

async function copyText(text: string, label: string) {
  if (!text) return
  const ok = await copyToClipboard(text)
  if (ok) {
    Message.success(`${label}已复制到剪贴板`)
  } else {
    Message.error('复制失败，请手动选中内容复制')
  }
}

function goMarket() {
  router.push('/discovery/api-market')
}
function goTable(tableName: string) {
  if (!tableName) return
  router.push(`/discovery/data-map/table/${encodeURIComponent(tableName)}`)
}
/** 权限申请页支持 ?table= 预选来源表 */
function goApplyTable(tableName: string) {
  if (!tableName) return
  router.push({
    path: '/management/permission/data-permission/apply',
    query: { table: tableName }
  })
}
</script>

<style scoped>
/* 页面背景/宽度由 PageContainer 提供 */
.content-wrapper {
  padding: 24px;
}
.breadcrumb {
  margin-bottom: 16px;
}
.head-card,
.tab-card {
  border-radius: var(--dca-radius-lg, 8px);
}
.head-card {
  margin-bottom: 12px;
}
.head-row {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  justify-content: space-between;
}
.head-main {
  flex: 1;
  min-width: 0;
}
.title-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.api-name {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--dca-text-primary, #1d2129);
}
.url-box {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  padding: 8px 12px;
  background: var(--dca-bg-page-alt, #f7f8fa);
  border: 1px solid var(--dca-border-default, #e5e6eb);
  border-radius: var(--dca-radius-md, 4px);
}
.api-url {
  flex: 1;
  font-family: 'SFMono-Regular', Consolas, Menlo, monospace;
  font-size: 13px;
  color: var(--dca-text-primary, #1d2129);
  word-break: break-all;
}
.meta-line {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--dca-text-secondary, #4e5969);
}
.meta-text {
  font-size: 12px;
  color: var(--dca-text-tertiary, #86909c);
}
.offline-alert {
  margin-top: 12px;
}
.block-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--dca-text-primary, #1d2129);
}
.mt {
  margin-top: 16px;
}
.pane-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.pane-hint {
  font-size: 12px;
  color: var(--dca-text-tertiary, #86909c);
}
.common-params {
  margin-bottom: 8px;
  padding: 8px 12px;
  font-size: 12px;
  color: var(--dca-text-secondary, #4e5969);
  background: var(--dca-bg-page-alt, #f7f8fa);
  border-radius: var(--dca-radius-md, 4px);
}
.common-params code,
:deep(.arco-descriptions-item-value) code {
  padding: 1px 5px;
  font-family: 'SFMono-Regular', Consolas, Menlo, monospace;
  font-size: 12px;
  background: var(--dca-bg-card, #fff);
  border: 1px solid var(--dca-border-default, #e5e6eb);
  border-radius: var(--dca-radius-sm, 2px);
}
.code-box {
  padding: 16px;
  overflow-x: auto;
  font-family: 'SFMono-Regular', Consolas, Menlo, monospace;
  font-size: 12.5px;
  line-height: 1.7;
  color: #e5e6eb;
  background: #1d2129;
  border-radius: var(--dca-radius-lg, 8px);
}
.code-box pre {
  margin: 0;
}
.code-box code {
  font-family: inherit;
  white-space: pre;
}
</style>
