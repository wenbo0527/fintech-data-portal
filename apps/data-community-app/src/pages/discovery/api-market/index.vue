<template>
  <PageContainer>
    <PageHeader
      title="API 市场"
      sub-title="消费侧目录：查看已发布 API 的调用文档，并按来源表申请数据权限"
    >
      <template #extra>
        <a-space>
          <a-input-search
            v-model="keyword"
            placeholder="搜索 API 名称 / Endpoint / 来源表"
            allow-clear
            style="width: 260px"
          />
          <a-button @click="goSearch">
            <template #icon><icon-search /></template>
            去统一搜索找表
          </a-button>
        </a-space>
      </template>
    </PageHeader>

    <div class="content-wrapper">
      <a-row :gutter="12">
        <!-- 左侧：业务域分类（由表目录 domain 去重动态生成） -->
        <a-col :span="5">
          <a-card :bordered="false" class="tree-card">
            <div class="card-title">业务域</div>
            <a-tree
              :data="domainTree"
              block-node
              :selected-keys="selectedKeys"
              @select="onTreeSelect"
            />
            <div class="tree-hint">
              括号内为该域在线 API 数；分类与数量均随表目录（服务暴露）实时变化。
            </div>
          </a-card>
        </a-col>

        <!-- 右侧：API 清单 -->
        <a-col :span="19">
          <a-card :bordered="false">
            <div class="toolbar">
              <a-space wrap>
                <span class="toolbar-title">{{ activeDomainLabel }}</span>
                <span class="toolbar-hint">
                  共 {{ rows.length }} 个 API · 在线 {{ onlineCount }} 个
                </span>
                <a-button
                  v-if="keyword || activeDomain !== 'all'"
                  size="small"
                  @click="resetFilter"
                >
                  清空筛选
                </a-button>
              </a-space>
            </div>

            <a-table
              :columns="columns"
              :data="rows"
              row-key="id"
              size="medium"
              :pagination="{ pageSize: 8, showTotal: true, sizeCanChange: false }"
              :scroll="{ x: 1260 }"
            >
              <template #name="{ record }">
                <a-link @click="goDetail(record.id)">{{ record.name }}</a-link>
              </template>
              <template #endpoint="{ record }">
                <code class="endpoint">{{ record.endpoint }}</code>
              </template>
              <template #table="{ record }">
                <a-link class="table-link" @click="goTable(record.tableName)">
                  {{ record.tableName }} · {{ record.tableCnName }}
                </a-link>
                <div class="cell-sub">
                  <a-tag size="small" :color="sensitivityColor(record.tableSensitivity)">
                    {{ sensitivityLabel(record.tableSensitivity) }}
                  </a-tag>
                  <span class="cell-text">{{ record.storage }}</span>
                </div>
              </template>
              <template #status="{ record }">
                <a-tag size="small" :color="svcStatusColor(record.status)">
                  {{ svcStatusLabel(record.status) }}
                </a-tag>
              </template>
              <template #actions="{ record }">
                <a-space :size="2">
                  <a-button type="text" size="small" @click="goDetail(record.id)">调用文档</a-button>
                  <a-button type="text" size="small" @click="goApplyTable(record.tableName)">
                    申请权限
                  </a-button>
                </a-space>
              </template>

              <template #empty>
                <a-empty :description="emptyText">
                  <a-space>
                    <a-button v-if="keyword || activeDomain !== 'all'" @click="resetFilter">
                      清空筛选条件
                    </a-button>
                    <a-button type="primary" @click="goDataMap">去数据地图找表</a-button>
                  </a-space>
                </a-empty>
              </template>
            </a-table>
          </a-card>
        </a-col>
      </a-row>
    </div>
  </PageContainer>
</template>

<script setup lang="ts">
/**
 * [重构方案 P3 · 消费侧] API 市场（dca 版）
 *
 * 数据源：唯一事实源 table-catalog-store 的 `table.services[]`，
 *   由 `flattenServices('API')` 打平成「服务形态 + 来源表信息」的行，
 *   与管理侧「数据服务」页、表详情「服务」Tab 完全同源——
 *   表上线/下线、服务增删后回到本页即自动同步，页面本身零硬编码 mock。
 *
 * 与 dfd 老版差异（有意为之）：
 *   - 不再读 localStorage('api.management.list')，也没有 10 条硬编码与「维护中」标签；
 *   - 左侧分类从「内部/外部 API」层级改为按业务域（domain 去重动态生成）；
 *   - 「申请权限」直达权限申请页（?table= 预选来源表），「来源表」直达表详情。
 */
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageContainer from '@/components-dca/common/PageContainer.vue'
import PageHeader from '@/components-dca/common/PageHeader.vue'
import { flattenServices } from '@/mock-shared/service-ops'
import {
  SENSITIVITY_LABELS,
  SENSITIVITY_COLORS,
  type Sensitivity
} from '@/mock-shared/table-catalog-store'

const router = useRouter()

// ---------------- 数据 ----------------

const allApis = computed(() => flattenServices('API'))

const keyword = ref('')
const selectedKeys = ref<(string | number)[]>(['all'])
const activeDomain = computed(() => String(selectedKeys.value[0] ?? 'all'))
const activeDomainLabel = computed(() =>
  activeDomain.value === 'all' ? '全部 API' : `${activeDomain.value} API`
)

/** 左侧树：'全部' + 数据中 domain 去重；节点 count 取该域「在线」API 数 */
const domainTree = computed(() => {
  const online = allApis.value.filter(s => s.status === 'online')
  const domains = [...new Set(allApis.value.map(s => s.domain))].sort()
  const nodes: Array<{ key: string; title: string }> = [
    { key: 'all', title: `全部（${online.length}）` }
  ]
  for (const d of domains) {
    nodes.push({ key: d, title: `${d}（${online.filter(s => s.domain === d).length}）` })
  }
  return nodes
})

const rows = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  const domain = activeDomain.value
  return allApis.value.filter(s => {
    if (domain !== 'all' && s.domain !== domain) return false
    if (!kw) return true
    return [s.name, s.endpoint, s.tableName].some(x => x.toLowerCase().includes(kw))
  })
})

const onlineCount = computed(() => rows.value.filter(s => s.status === 'online').length)

const emptyText = computed(() =>
  allApis.value.length
    ? '没有符合当前业务域 / 关键词的 API，换个条件试试'
    : '表目录里还没有暴露任何 API 服务，先在表详情页「服务」Tab 配置入口'
)

// ---------------- 列定义 ----------------

const columns = [
  { title: 'API 名称', dataIndex: 'name', slotName: 'name', width: 200 },
  { title: 'Endpoint', dataIndex: 'endpoint', slotName: 'endpoint', width: 220 },
  { title: '来源表', dataIndex: 'tableName', slotName: 'table', width: 260 },
  { title: '所属域', dataIndex: 'domain', width: 100 },
  { title: '负责人', dataIndex: 'tableOwner', width: 90 },
  { title: '状态', dataIndex: 'status', slotName: 'status', width: 96 },
  { title: '更新时间', dataIndex: 'updatedAt', width: 156 },
  { title: '操作', slotName: 'actions', width: 178, fixed: 'right' as const }
]

// ---------------- 窄类型取值助手 ----------------
// a-table 插槽里的 record 会被推断为 any，直接用它索引 Record<联合类型, ...> 常量
// 会命中 noImplicitAny（TS7053）；用具名形参收窄类型后取值，文案与配色仍来自 store 常量。

type SvcStatus = 'online' | 'offline'
const SVC_STATUS_LABELS: Record<SvcStatus, string> = { online: '在线', offline: '已下线' }
const SVC_STATUS_COLORS: Record<SvcStatus, string> = { online: 'green', offline: 'gray' }

const svcStatusLabel = (s: SvcStatus) => SVC_STATUS_LABELS[s]
const svcStatusColor = (s: SvcStatus) => SVC_STATUS_COLORS[s]
const sensitivityLabel = (s: Sensitivity) => SENSITIVITY_LABELS[s]
const sensitivityColor = (s: Sensitivity) => SENSITIVITY_COLORS[s]

// ---------------- 交互 ----------------

function onTreeSelect(keys: (string | number)[]) {
  // 再次点击已选节点会被取消选中，回落到「全部」
  selectedKeys.value = keys.length ? keys : ['all']
}

function resetFilter() {
  keyword.value = ''
  selectedKeys.value = ['all']
}

function goDetail(id: string) {
  router.push(`/discovery/api-market/detail/${id}`)
}
function goTable(tableName: string) {
  router.push(`/discovery/data-map/table/${encodeURIComponent(tableName)}`)
}
/** 权限申请页支持 ?table= 预选来源表 */
function goApplyTable(tableName: string) {
  router.push({
    path: '/management/permission/data-permission/apply',
    query: { table: tableName }
  })
}
function goSearch() {
  router.push('/discovery/search')
}
/** 空态引导：数据地图（资产目录）是找表主入口 */
function goDataMap() {
  router.push('/discovery/asset-catalog')
}
</script>

<style scoped>
/* 页面背景/宽度由 PageContainer 提供 */
.content-wrapper {
  padding: 0 24px 24px;
}
.card-title {
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--dca-text-primary, #1d2129);
}
.tree-card {
  border-radius: var(--dca-radius-lg, 8px);
}
.tree-hint {
  margin-top: 10px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--dca-text-tertiary, #86909c);
}
.toolbar {
  margin-bottom: 12px;
}
.toolbar-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--dca-text-primary, #1d2129);
}
.toolbar-hint {
  font-size: 12px;
  color: var(--dca-text-tertiary, #86909c);
}
.endpoint {
  padding: 2px 6px;
  font-family: 'SFMono-Regular', Consolas, Menlo, monospace;
  font-size: 12px;
  color: var(--dca-text-secondary, #4e5969);
  background: var(--dca-bg-page-alt, #f7f8fa);
  border-radius: var(--dca-radius-md, 4px);
}
.table-link {
  font-size: 13px;
}
.cell-sub {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
}
.cell-text {
  font-size: 12px;
  color: var(--dca-text-tertiary, #86909c);
}
</style>
