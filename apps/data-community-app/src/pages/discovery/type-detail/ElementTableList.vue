<template>
  <div class="etl-page">
    <!-- 面包屑 -->
    <a-breadcrumb class="etl-breadcrumb">
      <a-breadcrumb-item><a @click="$router.push('/discovery/overview')">数据发现</a></a-breadcrumb-item>
      <a-breadcrumb-item>
        <a @click="$router.push({ name: 'type-detail', params: { typeKey } })">{{ config?.title || typeKey }}</a>
      </a-breadcrumb-item>
      <a-breadcrumb-item>表列表<template v-if="currentStorage">（{{ currentStorage }}）</template></a-breadcrumb-item>
    </a-breadcrumb>

    <!-- 工具栏 -->
    <div class="etl-toolbar">
      <a-input-search
        v-model="searchKw"
        placeholder="搜索表名/表中文名"
        allow-clear
        style="width: 280px"
      />
      <a-select
        v-model="filterDomain"
        placeholder="业务域"
        allow-clear
        style="width: 140px"
      >
        <a-option v-for="d in domainOptions" :key="d" :value="d">{{ d }}</a-option>
      </a-select>
      <a-select
        v-model="filterLayer"
        placeholder="表类型"
        allow-clear
        style="width: 120px"
      >
        <a-option v-for="l in layerOptions" :key="l" :value="l">{{ l }}</a-option>
      </a-select>
      <a-select
        v-model="filterStatus"
        placeholder="状态"
        allow-clear
        style="width: 120px"
      >
        <a-option v-for="s in statusOptions" :key="s.value" :value="s.value">{{ s.label }}</a-option>
      </a-select>
    </div>

    <!-- 列表 -->
    <a-table
      :data="paginatedData"
      :loading="loading"
      :pagination="false"
      row-key="name"
      :scroll="{ y: '500px' }"
    >
      <template #columns>
        <a-table-column title="表名" data-index="name" :width="240" fixed="left">
          <template #cell="{ record }">
            <a class="etl-table-link" @click="goTableDetail(record.name)">{{ record.name }}</a>
          </template>
        </a-table-column>
        <a-table-column title="表中文名" data-index="cnName" :width="200" />
        <a-table-column title="存储产品" data-index="storage" :width="120" />
        <a-table-column title="业务域" data-index="domain" :width="120" />
        <a-table-column title="表类型" data-index="layer" :width="100" />
        <a-table-column title="状态" :width="100">
          <template #cell="{ record }">
            <a-tag size="small" :color="statusColor(record.status)">{{ statusLabel(record.status) }}</a-tag>
          </template>
        </a-table-column>
        <a-table-column title="操作" :width="100" fixed="right">
          <template #cell="{ record }">
            <a-button type="text" size="small" @click="goTableDetail(record.name)">查看详情</a-button>
          </template>
        </a-table-column>
      </template>

      <!-- 空状态 -->
      <template #empty-text>
        <div class="etl-empty">当前条件下无表</div>
      </template>
    </a-table>

    <!-- 分页 -->
    <div class="etl-pagination" v-if="filteredData.length > 0">
      <a-pagination
        v-model:current="currentPage"
        v-model:page-size="pageSize"
        :total="filteredData.length"
        show-page-size
        show-total
        :page-size-options="[20, 50, 100]"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { TableCatalogStore, STATUS_LABELS, STATUS_COLORS } from '@/mock-dca/shared/table-catalog-store'
import { getTypeConfig } from './type-configs'

const route = useRoute()
const router = useRouter()

const props = defineProps<{
  typeKey: string
}>()

const config = computed(() => getTypeConfig(props.typeKey))

const allTables = computed(() => TableCatalogStore.tables.value)

// 从 URL 读取 storage 锁定
const currentStorage = computed(() => (route.query.storage as string) || '')

// 搜索与筛选
const searchKw = ref('')
const filterDomain = ref<string | undefined>(undefined)
const filterLayer = ref<string | undefined>(undefined)
const filterStatus = ref<string | undefined>(undefined)

// 200ms 防抖
const loading = ref(false)
const debouncedKw = ref('')
let debounceTimer: ReturnType<typeof setTimeout> | null = null

watch(searchKw, (val) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  loading.value = true
  debounceTimer = setTimeout(() => {
    debouncedKw.value = val
    loading.value = false
    currentPage.value = 1
  }, 200)
})

// 按类型 + storage 过滤
const typedTables = computed(() => {
  if (!config.value) return []
  let list = config.value.filter(allTables.value)
  // 锁定 storage
  if (currentStorage.value) {
    list = list.filter(t => t.storage === currentStorage.value)
  }
  return list
})

// 搜索 + 筛选
const filteredData = computed(() => {
  let list = typedTables.value
  const kw = debouncedKw.value.trim().toLowerCase()
  if (kw) {
    list = list.filter(t =>
      t.name.toLowerCase().includes(kw) ||
      (t.cnName || '').toLowerCase().includes(kw)
    )
  }
  if (filterDomain.value) {
    list = list.filter(t => t.domain === filterDomain.value)
  }
  if (filterLayer.value) {
    list = list.filter(t => t.layer === filterLayer.value)
  }
  if (filterStatus.value) {
    list = list.filter(t => t.status === filterStatus.value)
  }
  return list
})

// 分页
const currentPage = ref(1)
const pageSize = ref(20)
const paginatedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredData.value.slice(start, start + pageSize.value)
})

// 筛选选项
const domainOptions = computed(() => {
  const set = new Set<string>()
  typedTables.value.forEach(t => set.add(t.domain))
  return Array.from(set).sort()
})
const layerOptions = computed(() => {
  const set = new Set<string>()
  typedTables.value.forEach(t => set.add(t.layer))
  return Array.from(set).sort()
})
const statusOptions = computed(() => {
  const set = new Set<string>()
  typedTables.value.forEach(t => set.add(t.status))
  return Array.from(set).map(s => ({ value: s, label: STATUS_LABELS[s as keyof typeof STATUS_LABELS] || s }))
})

function statusLabel(status: string): string {
  return STATUS_LABELS[status as keyof typeof STATUS_LABELS] || status
}
function statusColor(status: string): string {
  return STATUS_COLORS[status as keyof typeof STATUS_COLORS] || 'gray'
}

function goTableDetail(tableName: string) {
  router.push({ name: 'data-map-table', params: { tableName } })
}

onMounted(() => {
  // store 在模块加载时已初始化 loadInitial()，无需手动 init
})
</script>

<style scoped>
.etl-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.etl-breadcrumb {
  margin-bottom: 4px;
}
.etl-toolbar {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
}
.etl-table-link {
  color: var(--dca-brand-primary, #165dff);
  cursor: pointer;
}
.etl-table-link:hover {
  text-decoration: underline;
}
.etl-empty {
  padding: 32px;
  color: var(--dca-text-3, #86909c);
  text-align: center;
}
.etl-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}
</style>
