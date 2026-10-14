<template>
  <div class="collection-detail-page">
    <!-- 错误占位:不满足条件时不再静默跳转,让用户主动选择返回 -->
    <a-card v-if="loadError" :bordered="false" style="margin-bottom: 16px;">
      <a-result
        :status="loadError === 'not-found' ? 'warning' : 'error'"
        :title="errorTitle"
        :subtitle="errorSubtitle"
      >
        <template #extra>
          <a-space>
            <a-button @click="goBack">
              <template #icon><icon-left /></template>
              返回数据发现
            </a-button>
            <a-button type="primary" @click="safePush('discovery/asset-catalog')">
              <template #icon><icon-storage /></template>
              打开数据地图
            </a-button>
          </a-space>
        </template>
      </a-result>
    </a-card>

    <a-page-header v-else :title="collection.name || '集合详情'" :subtitle="collection.description">
      <template #extra>
        <a-space>
          <a-button @click="goBack">
            <template #icon><icon-left /></template>
            返回
          </a-button>
          <a-button type="primary" @click="toggleFavorite">
            <template #icon>
              <icon-star-fill v-if="collection.isFavorite" />
              <icon-star v-else />
            </template>
            {{ collection.isFavorite ? '已收藏' : '收藏' }}
          </a-button>
          <a-button type="outline" status="warning" @click="handleRequestPermission">
            <template #icon><icon-lock /></template>
            权限申请
          </a-button>
        </a-space>
      </template>
    </a-page-header>

    <a-spin :loading="loading" tip="加载中...">
      <a-card :bordered="false" style="margin-bottom: 16px;">
        <a-descriptions :column="4" size="medium">
          <a-descriptions-item label="集合 ID">{{ collection.id }}</a-descriptions-item>
          <a-descriptions-item label="类型">
            <a-tag :color="collection.type === '业务流程' ? 'red' : 'arcoblue'">{{ collection.type }}</a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="负责人">
            <a-avatar :size="20" style="margin-right: 4px;">{{ collection.owner?.charAt(0) || '?' }}</a-avatar>
            {{ collection.owner || '未指定' }}
          </a-descriptions-item>
          <a-descriptions-item label="总表数">
            <a-tag color="arcoblue">{{ collection.tables.length }} 张</a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="标签" :span="2">
            <a-tag v-for="t in collection.tags" :key="t" color="gray" style="margin-right: 4px;">{{ t }}</a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="敏感级别" :span="2">
            <a-tag :color="sensitivityColor(collection.accessLevel)">{{ sensitivityLabel(collection.accessLevel) }}</a-tag>
            <span style="margin-left: 8px; color: #86909c; font-size: 12px;">最近更新: {{ formatTime(collection.updateTime) }}</span>
          </a-descriptions-item>
        </a-descriptions>
      </a-card>

      <a-card :bordered="false" title="集合内的数据表" :subtitle="`共 ${collection.tables.length} 张表 · ${collection.tables.length > 0 ? '可点击查看字段血缘' : ''}`">
        <a-row v-if="collection.tables.length > 0" :gutter="[12, 12]" style="margin-bottom: 16px;">
          <a-col :span="6">
            <a-input-search v-model="tableKeyword" placeholder="搜索表名/描述" allow-clear />
          </a-col>
          <a-col :span="5">
            <a-select v-model="filterType" placeholder="表类型" allow-clear>
              <a-option v-for="t in typeOptions" :key="t" :value="t">{{ t }}</a-option>
            </a-select>
          </a-col>
          <a-col :span="5">
            <a-select v-model="filterDomain" placeholder="业务域" allow-clear>
              <a-option v-for="d in domainOptions" :key="d" :value="d">{{ d }}</a-option>
            </a-select>
          </a-col>
          <a-col :span="8">
            <a-space>
              <span style="color: #86909c; font-size: 12px;">共 {{ filteredTables.length }} 张</span>
              <a-button size="mini" @click="resetFilter" v-if="tableKeyword || filterType || filterDomain">重置筛选</a-button>
            </a-space>
          </a-col>
        </a-row>

        <a-empty v-if="collection.tables.length === 0" description="该集合暂无数据表" />
        <a-row v-else :gutter="[16, 16]">
          <a-col v-for="table in paginatedTables" :key="table.name" :xs="24" :sm="12" :md="8" :lg="8">
            <a-card class="table-card" hoverable @click="showTableDetail(table)">
              <template #title>
                <a-space align="center">
                  <icon-file />
                  <span class="table-name">{{ table.name }}</span>
                </a-space>
              </template>
              <div class="table-meta">
                <a-tag size="small">{{ table.type || '未知' }}</a-tag>
                <a-tag size="small" color="arcoblue">{{ table.domain || '-' }}</a-tag>
                <a-tag size="small" color="gray">{{ table.owner || '未指定' }}</a-tag>
              </div>
              <a-typography-paragraph :ellipsis="{ rows: 2 }" type="secondary" class="table-desc">
                {{ table.description || '暂无描述' }}
              </a-typography-paragraph>
              <div class="table-footer">
                <span>字段数: {{ table.fields?.length || 0 }}</span>
                <span>更新频率: {{ table.updateFrequency || '-' }}</span>
              </div>
            </a-card>
          </a-col>
        </a-row>

        <a-pagination
          v-if="filteredTables.length > pageSize"
          v-model:current="currentPage"
          v-model:page-size="pageSize"
          :total="filteredTables.length"
          show-total
          show-jumper
          style="margin-top: 16px; text-align: right;"
        />
      </a-card>
    </a-spin>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Message, Modal } from '@arco-design/web-vue'
import {
  IconLeft, IconStar, IconStarFill, IconLock, IconFile, IconStorage
} from '@arco-design/web-vue/es/icon'

const route = useRoute()
const router = useRouter()

// 把任意 path 规范为相对路径(去掉前导 '/' 与子应用 BASE 前缀),
// 防止以绝对路径 push 时触发路由守卫二次剥前缀导致的兜底跳转。
const safePush = (path: string) => {
  if (!path) return
  const p = path.replace(/^\/dca\/?/, '').replace(/^\//, '')
  router.push('/' + p)
}

// 集合元数据从公共 mock 派生,丰富字段(tags/tables/accessLevel)由派生补全
import { CollectionStore } from '../../mock/shared/dataset'

const localCollections: any[] = CollectionStore.all().map(c => {
  // 派生:tags、accessLevel、tables,保证前端交互完整
  const typeToTags: Record<string, string[]> = {
    '贷前分析': ['贷前', '核心业务', '申请流程'],
    '风控评估': ['风控', '评分', '信用评估'],
    '反欺诈策略': ['反欺诈', '实时监控', '预警'],
    '客户主档域': ['客户', '主档', '画像'],
    '用户域核心表': ['用户', '主档', '画像', '标签'],
    '交易域核心表': ['交易', '订单', '支付'],
    '指标体系': ['指标', '北极星', '业务度量'],
    '监管报送': ['监管', 'EAST', '反洗钱']
  }
  const typeToAccess: Record<string, number> = {
    '贷前分析': 2,
    '风控评估': 3,
    '反欺诈策略': 3,
    '客户主档域': 1,
    '用户域核心表': 1,
    '交易域核心表': 2,
    '指标体系': 1,
    '监管报送': 3
  }
  const domainForTables: Record<string, string> = {
    '贷前分析': '用户域', '客户主档域': '用户域', '用户域核心表': '用户域',
    '交易域核心表': '交易域', '风控评估': '风控域', '反欺诈策略': '风控域',
    '监管报送': '合规', '指标体系': '指标'
  }
  return {
    ...c,
    description: `${c.description}(${c.tableCount} 张表)`,
    isFavorite: ['1', '3', '5'].includes(c.id),
    tags: typeToTags[c.name] || [],
    accessLevel: typeToAccess[c.name] || 1,
    updateTime: new Date().toISOString(),
    tables: generateTables(
      c.name.replace(/[^\u4e00-\u9fa5a-zA-Z]/g, '') || c.name,
      c.tableCount,
      ['明细表', '维度表', '汇总表', '事实表'],
      domainForTables[c.name] || '用户域'
    )
  }
})

// 生成 mock 表数据(避免 156 张全渲染,只生成前 30 张用于展示)
function generateTables(prefix: string, total: number, types: string[], domain: string) {
  const showCount = Math.min(total, 30)
  return Array.from({ length: showCount }, (_, i) => ({
    name: `dwd_${prefix}_${(i + 1).toString().padStart(4, '0')}`,
    type: types[i % types.length],
    domain,
    owner: ['数据平台组', '王运营', '张风控', '李产品', '陈策略'][i % 5],
    description: `${prefix} 业务第 ${i + 1} 张表,涵盖 ${types[i % types.length]} 数据,用于支撑 ${prefix} 场景的明细查询、汇总分析、画像补全。`,
    updateFrequency: ['每日', '每小时', '实时', '每周', '每月'][i % 5],
    fields: Array.from({ length: 8 + (i % 12) }, (_, j) => ({
      name: `col_${j + 1}`,
      type: ['string', 'int', 'decimal', 'datetime', 'boolean'][j % 5],
      description: `字段 ${j + 1} 描述`
    }))
  }))
}

const loading = ref(false)
const collection = ref<any>({ id: '', name: '', description: '', tables: [] })

// 区分「加载失败 / 非法 id / 未找到」三种情形;不再用 safePush 跳走,
// 否则用户会在进入页面的瞬间被「静默跳转」,goBack 根本没机会触发。
const loadError = ref<'empty' | 'invalid' | 'not-found' | 'unknown' | null>(null)

const tableKeyword = ref('')
const filterType = ref('')
const filterDomain = ref('')
const currentPage = ref(1)
const pageSize = ref(9)

const fetchCollection = async () => {
  loading.value = true
  loadError.value = null
  try {
    const id = (route.params.id as string | undefined)?.trim()

    // ===== ⛳ 断点 B: collection-detail 入口 =====
    // eslint-disable-next-line no-console
    console.debug('[collection-detail.fetch] route.params.id =', route.params.id,
      'after trim =', id,
      'available ids =', localCollections.map(c => c.id))

    if (!id) {
      loadError.value = 'invalid'
      Message.error('无效的集合 ID')
      return
    }
    const found = localCollections.find(c => c.id === id)
    if (found) {
      collection.value = found
    } else {
      // 例如 /collection/discovery 这种把模块名当 id 的误用,直接渲染占位
      loadError.value = 'not-found'

      // ===== ⛳ 断点 C: 错误占位状态切换 =====
      // eslint-disable-next-line no-console
      console.debug('[collection-detail.fetch] loadError set to =', loadError.value)

      Message.error('未找到该集合')
    }
  } catch (e) {
    loadError.value = 'unknown'
    Message.error('获取数据失败')
  } finally {
    loading.value = false
  }
}

const filteredTables = computed(() => {
  let r = collection.value.tables || []
  if (tableKeyword.value) {
    const kw = tableKeyword.value.toLowerCase()
    r = r.filter((t: any) => t.name.toLowerCase().includes(kw) || (t.description || '').toLowerCase().includes(kw))
  }
  if (filterType.value) r = r.filter((t: any) => t.type === filterType.value)
  if (filterDomain.value) r = r.filter((t: any) => t.domain === filterDomain.value)
  return r
})

const paginatedTables = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredTables.value.slice(start, start + pageSize.value)
})

const typeOptions = computed(() => Array.from(new Set((collection.value.tables || []).map((t: any) => t.type).filter(Boolean))) as string[])
const domainOptions = computed(() => Array.from(new Set((collection.value.tables || []).map((t: any) => t.domain).filter(Boolean))) as string[])

// 不同错误原因给到 a-result 的文案
const errorTitle = computed(() => {
  switch (loadError.value) {
    case 'not-found': return '未找到该集合'
    case 'invalid':   return '无效的集合 ID'
    case 'unknown':   return '加载失败'
    default:          return ''
  }
})
const errorSubtitle = computed(() => {
  const id = (route.params.id as string | undefined) || '(空)'
  if (loadError.value === 'not-found') return `当前 URL 中的集合 ID「${id}」不在可用列表中。可返回数据发现重试,或前往数据地图查看全部集合。`
  if (loadError.value === 'invalid')   return `URL 中缺少集合 ID。`
  if (loadError.value === 'unknown')   return `请稍后再试,或联系数据负责人。`
  return ''
})

const resetFilter = () => {
  tableKeyword.value = ''
  filterType.value = ''
  filterDomain.value = ''
  currentPage.value = 1
}

const goBack = () => {
  // ===== ⛳ 断点 D: goBack 链路入口 =====
  // eslint-disable-next-line no-console
  console.debug('[collection-detail.goBack] called, current route =', route.fullPath)
  safePush('discovery')
}

const showTableDetail = (table: any) => {
  // 跳到表详情页,带表名参数
  router.push({
    name: 'data-map-table',
    params: { tableName: table.name }
  })
}

const toggleFavorite = () => {
  collection.value.isFavorite = !collection.value.isFavorite
  if (collection.value.isFavorite) {
    Message.success('已添加到收藏')
    Modal.confirm({
      title: '权限申请',
      content: `已收藏集合 "${collection.value.name}",是否同步申请该集合下所有表的访问权限?`,
      okText: '立即申请',
      cancelText: '稍后处理',
      onOk: () => handleRequestPermission()
    })
  } else {
    Message.success('已取消收藏')
  }
}

const handleRequestPermission = () => {
  Modal.confirm({
    title: '确认申请权限',
    content: `确定要申请集合 "${collection.value.name}" 的访问权限吗?申请将发送至数据负责人 ${collection.value.owner || '管理员'}。`,
    okText: '确定申请',
    cancelText: '取消',
    onOk: async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 800))
        Message.success(`集合 "${collection.value.name}" 的权限申请已提交`)
      } catch {
        Message.error('申请失败,请重试')
      }
    }
  })
}

const sensitivityLabel = (lvl: number) => {
  return ['公开', '内部', '机密', '绝密'][lvl] || '未知'
}
const sensitivityColor = (lvl: number) => {
  return ['gray', 'arcoblue', 'orange', 'red'][lvl] || 'gray'
}
const formatTime = (t: any) => {
  if (!t) return '-'
  try {
    const d = new Date(t)
    return d.toLocaleString('zh-CN')
  } catch { return String(t) }
}

watch(filteredTables, () => { currentPage.value = 1 })

// id 变化时重新拉数据(同一组件复用时也要响应新 id)
watch(() => route.params.id, () => fetchCollection())

onMounted(() => fetchCollection())
</script>

<style scoped>
.collection-detail-page {
  padding: 16px 24px;
  background: #f5f7fa;
  min-height: 100vh;
}

.table-card {
  height: 100%;
  cursor: pointer;
  transition: all 0.3s;
}
.table-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border-color: #165dff;
}
.table-name {
  font-family: 'Monaco', 'Consolas', monospace;
  font-size: 13px;
  color: #1d2129;
  font-weight: 500;
}
.table-meta {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}
.table-desc {
  font-size: 12px;
  margin: 8px 0 !important;
  min-height: 36px;
}
.table-footer {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #86909c;
  border-top: 1px solid #f2f3f5;
  padding-top: 8px;
}
</style>
