<template>
  <div class="element-shelf-page">
    <!-- 页头 -->
    <div class="page-header">
      <h2>数据要素上下架</h2>
      <a-space>
        <a-button type="outline" @click="refreshAll">
          <template #icon><IconRefresh /></template>
          刷新
        </a-button>
      </a-space>
    </div>

    <!-- 统计卡片 -->
    <a-row :gutter="16" class="stats-section">
      <a-col :span="8">
        <a-card title="要素总数" :bordered="false">
          <a-statistic :value="stats.total" :value-style="{ color: '#165DFF' }">
            <template #suffix><span style="font-size: 14px; color: #86909c">个</span></template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :span="8">
        <a-card title="已上架" :bordered="false">
          <a-statistic :value="stats.onShelf" :value-style="{ color: '#00B42A' }">
            <template #suffix><span style="font-size: 14px; color: #86909c">/ {{ stats.total }}</span></template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :span="8">
        <a-card title="已下架/归档" :bordered="false">
          <a-statistic :value="stats.offShelf" :value-style="{ color: '#FF7D00' }" />
        </a-card>
      </a-col>
    </a-row>

    <!-- 要素分类卡片 -->
    <div class="section-title">
      <h3>要素分类</h3>
      <span class="section-subtitle">点击卡片查看对应要素的上下架详情</span>
    </div>
    <a-row :gutter="[16, 16]">
      <a-col v-for="cat in categories" :key="cat.type" :xs="24" :sm="12" :md="8" :lg="6">
        <a-card
          hoverable
          class="category-card"
          :class="{ active: selectedType === cat.type }"
          @click="selectCategory(cat)"
        >
          <template #title>
            <a-space>
              <component :is="cat.icon" />
              <span>{{ cat.label }}</span>
            </a-space>
          </template>
          <a-descriptions :column="1" size="small">
            <a-descriptions-item label="总数">
              <a-tag color="arcoblue">{{ cat.total }} 个</a-tag>
            </a-descriptions-item>
            <a-descriptions-item label="已上架">
              <a-tag color="green" size="small">{{ cat.onShelf }}</a-tag>
            </a-descriptions-item>
            <a-descriptions-item label="已下架">
              <a-tag color="orange" size="small">{{ cat.offShelf }}</a-tag>
            </a-descriptions-item>
            <a-descriptions-item label="说明">{{ cat.description }}</a-descriptions-item>
          </a-descriptions>
        </a-card>
      </a-col>
    </a-row>

    <!-- 选中类别的要素列表 -->
    <div v-if="selectedType" class="detail-section">
      <div class="detail-header">
        <h3>{{ currentCategoryLabel }} · 上下架列表</h3>
        <a-space>
          <a-input
            v-model="searchKw"
            placeholder="搜索名称 / 编码 / 负责人"
            allow-clear
            style="width: 240px"
            @clear="searchKw = ''"
          >
            <template #prefix><IconSearch /></template>
          </a-input>
          <a-select v-model="filterStatus" placeholder="状态" allow-clear style="width: 120px">
            <a-option value="active">已上架</a-option>
            <a-option value="inactive">已下架</a-option>
            <a-option value="archived">已归档</a-option>
          </a-select>
        </a-space>
      </div>

      <a-table
        :columns="columns"
        :data="filteredItems"
        :pagination="{ showTotal: true, pageSize: 10 }"
        row-key="id"
      >
        <template #name="{ record }">
          <span class="link-name">{{ record.name }}</span>
        </template>
        <template #code="{ record }">
          <span class="mono-code">{{ record.code }}</span>
        </template>
        <template #status="{ record }">
          <a-tag :color="statusColor[record.status as ShelfStatus]">{{ statusLabel[record.status as ShelfStatus] }}</a-tag>
        </template>
        <template #onShelfAt="{ record }">{{ record.onShelfAt || '—' }}</template>
        <template #offShelfAt="{ record }">{{ record.offShelfAt || '—' }}</template>
        <template #tags="{ record }">
          <a-space :size="4">
            <a-tag v-for="t in (record.tags || [])" :key="t" size="small">{{ t }}</a-tag>
          </a-space>
        </template>
        <template #actions="{ record }">
          <a-space>
            <a-button
              v-if="record.status === 'inactive' || record.status === 'archived'"
              type="text"
              size="small"
              status="success"
              @click="onShelf(record)"
            >上架</a-button>
            <a-button
              v-if="record.status === 'active'"
              type="text"
              size="small"
              status="warning"
              @click="offShelf(record)"
            >下架</a-button>
            <a-button
              v-if="record.status === 'active' || record.status === 'inactive'"
              type="text"
              size="small"
              @click="archive(record)"
            >归档</a-button>
          </a-space>
        </template>
      </a-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import {
  IconRefresh, IconSearch, IconStar, IconShareExternal,
  IconCommon, IconCloud, IconBulb
} from '@arco-design/web-vue/es/icon'
import { ShelfStore, type ShelfItem, type ShelfStatus } from '@/mock-shared/shelf-store'

const router = useRouter()

// ── 状态映射 ──
const statusLabel: Record<ShelfStatus, string> = {
  active: '已上架',
  inactive: '已下架',
  archived: '已归档'
}
const statusColor: Record<ShelfStatus, string> = {
  active: 'green',
  inactive: 'orange',
  archived: 'gray'
}

// ── 额外 mock 要素(API / 外数,shelf-store 中未覆盖)──
const extraElements: ShelfItem[] = [
  { id: 'ELM-API-001', kind: 'element', subType: 'API', name: '客户画像查询 API', description: '客户画像聚合查询', code: 'API-001', owner: '王运营', status: 'active', onShelfAt: '2025-03-20', tags: ['画像', '高频'], history: [] },
  { id: 'ELM-API-002', kind: 'element', subType: 'API', name: '风控决策引擎 API', description: '实时风控决策调用', code: 'API-002', owner: '张风控', status: 'active', onShelfAt: '2025-04-10', tags: ['风控', '实时'], history: [] },
  { id: 'ELM-API-003', kind: 'element', subType: 'API', name: '额度计算 API(旧版)', description: '旧版额度计算,已停用', code: 'API-003', owner: '李产品', status: 'inactive', onShelfAt: '2024-06-01', offShelfAt: '2026-07-15', tags: ['额度', '停用'], history: [{ ts: '2026-07-15 10:00', actor: '李产品', action: 'off', from: 'active', to: 'inactive', comment: '迁移至 v2' }] },
  { id: 'ELM-EXT-001', kind: 'element', subType: '外数', name: '银联消费数据', description: '银联消费流水', code: 'EXT-001', owner: '外部接入组', status: 'active', onShelfAt: '2025-05-01', tags: ['外数', '消费'], history: [] },
  { id: 'ELM-EXT-002', kind: 'element', subType: '外数', name: '运营商实名认证', description: '运营商三要素实名', code: 'EXT-002', owner: '外部接入组', status: 'active', onShelfAt: '2025-03-15', tags: ['外数', '实名'], history: [] },
  { id: 'ELM-EXT-003', kind: 'element', subType: '外数', name: '天行数据-工商信息', description: '企业工商信息查询', code: 'EXT-003', owner: '外部接入组', status: 'inactive', onShelfAt: '2024-10-01', offShelfAt: '2026-06-30', tags: ['外数', '工商'], history: [{ ts: '2026-06-30 14:00', actor: '外部接入组', action: 'off', from: 'active', to: 'inactive', comment: '合同到期' }] },
]

// ── 合并 shelf-store 要素 + 额外 mock ──
const allElements = computed<ShelfItem[]>(() => {
  const storeElements = ShelfStore.byKind('element')
  return [...storeElements, ...extraElements]
})

// ── 分类定义 ──
const categoryDefs = [
  { type: '指标', label: '指标', icon: IconStar, description: '业务核心/监管指标管理' },
  { type: '特征', label: '特征', icon: IconBulb, description: '业务特征/风控特征' },
  { type: 'API', label: 'API', icon: IconShareExternal, description: '数据服务 API 接口' },
  { type: '外数', label: '外数', icon: IconCloud, description: '外部数据源接入' },
  { type: '特征', label: '特征', icon: IconCommon, description: '模型特征/画像特征' },
]

const categories = computed(() => {
  return categoryDefs.map(def => {
    const items = allElements.value.filter(e => e.subType === def.type)
    return {
      ...def,
      total: items.length,
      onShelf: items.filter(i => i.status === 'active').length,
      offShelf: items.filter(i => i.status !== 'active').length,
    }
  })
})

// ── 统计 ──
const stats = computed(() => {
  const list = allElements.value
  return {
    total: list.length,
    onShelf: list.filter(i => i.status === 'active').length,
    offShelf: list.filter(i => i.status !== 'active').length,
  }
})

// ── 选中类别 ──
const selectedType = ref('')
const searchKw = ref('')
const filterStatus = ref('')

const currentCategoryLabel = computed(() =>
  categoryDefs.find(c => c.type === selectedType.value)?.label || ''
)

const selectCategory = (cat: typeof categoryDefs[0] & { total: number; onShelf: number; offShelf: number }) => {
  if (cat.type === '指标') {
    // 指标跳转到指标管理页
    router.push('/management/asset-management/listing-management/metric-management')
    return
  }
  selectedType.value = cat.type
  searchKw.value = ''
  filterStatus.value = ''
}

// ── 过滤列表 ──
const filteredItems = computed(() => {
  if (!selectedType.value) return []
  return allElements.value.filter(e => {
    if (e.subType !== selectedType.value) return false
    if (filterStatus.value && e.status !== filterStatus.value) return false
    const kw = searchKw.value.trim().toLowerCase()
    if (kw) {
      const hit = e.name.toLowerCase().includes(kw)
        || e.code.toLowerCase().includes(kw)
        || (e.owner || '').toLowerCase().includes(kw)
      if (!hit) return false
    }
    return true
  })
})

// ── 表格列 ──
const columns = [
  { title: '名称', slotName: 'name', width: 200 },
  { title: '编码', slotName: 'code', width: 140 },
  { title: '负责人', dataIndex: 'owner', width: 100 },
  { title: '状态', slotName: 'status', width: 100 },
  { title: '标签', slotName: 'tags', width: 200 },
  { title: '上架时间', slotName: 'onShelfAt', width: 120 },
  { title: '下架时间', slotName: 'offShelfAt', width: 120 },
  { title: '操作', slotName: 'actions', width: 200 },
]

// ── 操作 ──
const findItem = (id: string) => allElements.value.find(e => e.id === id)

const onShelf = (record: ShelfItem) => {
  if (extraElements.some(e => e.id === record.id)) {
    const item = findItem(record.id)
    if (item) {
      item.status = 'active'
      item.onShelfAt = new Date().toISOString().slice(0, 10)
      item.offShelfAt = undefined
    }
  } else {
    ShelfStore.on(record.id)
  }
  Message.success(`${record.name} 已上架`)
}

const offShelf = (record: ShelfItem) => {
  if (extraElements.some(e => e.id === record.id)) {
    const item = findItem(record.id)
    if (item) {
      item.status = 'inactive'
      item.offShelfAt = new Date().toISOString().slice(0, 10)
    }
  } else {
    ShelfStore.off(record.id)
  }
  Message.success(`${record.name} 已下架`)
}

const archive = (record: ShelfItem) => {
  if (extraElements.some(e => e.id === record.id)) {
    const item = findItem(record.id)
    if (item) {
      item.status = 'archived'
    }
  } else {
    ShelfStore.archive(record.id)
  }
  Message.success(`${record.name} 已归档`)
}

const refreshAll = () => {
  Message.success('已刷新')
}
</script>

<style scoped>
.element-shelf-page {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.stats-section {
  margin-bottom: 20px;
}

.section-title {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 16px;
}

.section-title h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.section-subtitle {
  font-size: 12px;
  color: #86909c;
}

.category-card {
  cursor: pointer;
  transition: all 0.2s;
}

.category-card.active {
  border-color: #165DFF;
  box-shadow: 0 0 0 2px rgba(22, 93, 255, 0.1);
}

.detail-section {
  margin-top: 24px;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.detail-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.link-name {
  color: #165DFF;
  cursor: pointer;
}

.mono-code {
  font-family: 'JetBrains Mono', Consolas, Menlo, monospace;
  font-size: 12px;
  color: #165DFF;
  background: #f0f7ff;
  padding: 2px 6px;
  border-radius: 3px;
}
</style>
