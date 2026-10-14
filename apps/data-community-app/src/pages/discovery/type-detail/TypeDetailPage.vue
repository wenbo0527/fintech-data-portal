<template>
  <div class="tp-page">
    <!-- ① 类型标题区 -->
    <div class="tp-header">
      <a-breadcrumb class="tp-breadcrumb">
        <a-breadcrumb-item><a @click="$router.push('/discovery/overview')">数据发现</a></a-breadcrumb-item>
        <a-breadcrumb-item>{{ config.categoryLabel }}</a-breadcrumb-item>
        <a-breadcrumb-item>{{ config.title }}</a-breadcrumb-item>
      </a-breadcrumb>
      <div class="tp-title-row">
        <h2 class="tp-title">{{ config.title }}</h2>
        <a-tag size="small" :color="categoryColor">{{ config.categoryLabel }}</a-tag>
      </div>
      <p class="tp-desc">{{ config.description }}</p>
      <div class="tp-count">
        <icon-storage class="tp-count-icon" />
        共 <b>{{ filteredTables.length }}</b> 张数据表
      </div>
    </div>

    <!-- ② 存储产品卡片群 -->
    <div class="tp-section">
      <div class="tp-section-title">存储产品</div>
      <div class="tp-storage-cards">
        <div
          v-for="item in storageStats"
          :key="item.storage"
          class="tp-storage-card"
          @click="goToList(item.storage)"
        >
          <div class="tp-storage-icon">
            <icon-storage />
          </div>
          <div class="tp-storage-info">
            <div class="tp-storage-name">{{ item.storage }}</div>
            <div class="tp-storage-count">{{ item.count }} 张表</div>
          </div>
          <icon-right class="tp-storage-arrow" />
        </div>
        <div v-if="storageStats.length === 0" class="tp-storage-empty">
          暂无数据
        </div>
      </div>
    </div>

    <!-- ③ 分布概览面板 -->
    <div class="tp-section">
      <div class="tp-section-title">分布概览</div>
      <div class="tp-dist-panel">
        <div class="tp-dist-col">
          <div class="tp-dist-col-title">业务域分布</div>
          <div class="tp-dist-list">
            <div v-for="item in domainStats" :key="item.domain" class="tp-dist-row">
              <span class="tp-dist-label">{{ item.domain }}</span>
              <div class="tp-dist-bar-wrap">
                <div class="tp-dist-bar" :style="{ width: barWidth(item.count, maxDomainCount) }"></div>
              </div>
              <span class="tp-dist-count">{{ item.count }}</span>
            </div>
            <div v-if="domainStats.length === 0" class="tp-dist-empty">暂无数据</div>
          </div>
        </div>

        <div class="tp-dist-col">
          <div class="tp-dist-col-title">表类型分布</div>
          <div class="tp-dist-list">
            <div v-for="item in layerStats" :key="item.layer" class="tp-dist-row">
              <span class="tp-dist-label">{{ item.layer }}</span>
              <div class="tp-dist-bar-wrap">
                <div class="tp-dist-bar tp-dist-bar-blue" :style="{ width: barWidth(item.count, maxLayerCount) }"></div>
              </div>
              <span class="tp-dist-count">{{ item.count }}</span>
            </div>
            <div v-if="layerStats.length === 0" class="tp-dist-empty">暂无数据</div>
          </div>
        </div>

        <div class="tp-dist-col">
          <div class="tp-dist-col-title">状态分布</div>
          <div class="tp-dist-list">
            <div v-for="item in statusStats" :key="item.status" class="tp-dist-row">
              <span class="tp-dist-label">{{ item.status }}</span>
              <div class="tp-dist-bar-wrap">
                <div class="tp-dist-bar tp-dist-bar-green" :style="{ width: barWidth(item.count, maxStatusCount) }"></div>
              </div>
              <span class="tp-dist-count">{{ item.count }}</span>
            </div>
            <div v-if="statusStats.length === 0" class="tp-dist-empty">暂无数据</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { IconStorage, IconRight } from '@arco-design/web-vue/es/icon'
import { TableCatalogStore, STATUS_LABELS } from '@/mock-dca/shared/table-catalog-store'
import { getTypeConfig, type TypeConfig } from './type-configs'

const props = defineProps<{
  typeKey: string
}>()

const router = useRouter()
const config = computed<TypeConfig>(() => getTypeConfig(props.typeKey) || {
  key: props.typeKey,
  title: '未知类型',
  description: '未找到该类型配置',
  category: 'resource',
  categoryLabel: '数据资源',
  filter: () => []
})

const allTables = computed(() => TableCatalogStore.tables.value)
const filteredTables = computed(() => config.value.filter(allTables.value))

// 存储产品统计
const storageStats = computed(() => {
  const map = new Map<string, number>()
  filteredTables.value.forEach(t => {
    const s = t.storage || '未知'
    map.set(s, (map.get(s) || 0) + 1)
  })
  return Array.from(map.entries())
    .map(([storage, count]) => ({ storage, count }))
    .sort((a, b) => b.count - a.count)
})

// 业务域分布
const domainStats = computed(() => {
  const map = new Map<string, number>()
  filteredTables.value.forEach(t => {
    const d = t.domain || '未分类'
    map.set(d, (map.get(d) || 0) + 1)
  })
  return Array.from(map.entries())
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count)
})
const maxDomainCount = computed(() => Math.max(1, ...domainStats.value.map(d => d.count)))

// 表类型分布
const layerStats = computed(() => {
  const map = new Map<string, number>()
  filteredTables.value.forEach(t => {
    const l = t.layer || '未知'
    map.set(l, (map.get(l) || 0) + 1)
  })
  return Array.from(map.entries())
    .map(([layer, count]) => ({ layer, count }))
    .sort((a, b) => b.count - a.count)
})
const maxLayerCount = computed(() => Math.max(1, ...layerStats.value.map(d => d.count)))

// 状态分布
const statusStats = computed(() => {
  const map = new Map<string, number>()
  filteredTables.value.forEach(t => {
    const s = STATUS_LABELS[t.status as keyof typeof STATUS_LABELS] || t.status
    map.set(s, (map.get(s) || 0) + 1)
  })
  return Array.from(map.entries())
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count)
})
const maxStatusCount = computed(() => Math.max(1, ...statusStats.value.map(d => d.count)))

const categoryColor = computed(() => {
  switch (config.value.category) {
    case 'resource': return 'arcoblue'
    case 'asset': return 'green'
    case 'element': return 'purple'
    default: return 'gray'
  }
})

function barWidth(count: number, max: number): string {
  return `${Math.max(5, Math.round((count / max) * 100))}%`
}

function goToList(storage?: string) {
  router.push({
    name: 'element-list',
    params: { typeKey: props.typeKey },
    query: storage ? { storage } : {}
  })
}
</script>

<style scoped>
.tp-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* ① 标题区 */
.tp-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.tp-breadcrumb {
  margin-bottom: 4px;
}
.tp-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.tp-title {
  font-size: 22px;
  font-weight: 600;
  margin: 0;
}
.tp-desc {
  font-size: 14px;
  color: var(--dca-text-2, #4e5969);
  margin: 0;
}
.tp-count {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: var(--dca-text-2, #4e5969);
}
.tp-count b {
  font-size: 20px;
  color: var(--dca-brand-primary, #165dff);
}
.tp-count-icon {
  font-size: 18px;
  color: var(--dca-brand-primary, #165dff);
}

/* Section 通用 */
.tp-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.tp-section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--dca-text-1, #1d2129);
}

/* ② 存储产品卡片 */
.tp-storage-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}
.tp-storage-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--dca-border-2, #e5e6eb);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}
.tp-storage-card:hover {
  border-color: var(--dca-brand-primary, #165dff);
  box-shadow: 0 2px 8px rgba(22, 93, 255, 0.15);
}
.tp-storage-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: var(--dca-brand-primary-light, #e8f3ff);
  color: var(--dca-brand-primary, #165dff);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}
.tp-storage-info {
  flex: 1;
}
.tp-storage-name {
  font-size: 15px;
  font-weight: 500;
  color: var(--dca-text-1, #1d2129);
}
.tp-storage-count {
  font-size: 13px;
  color: var(--dca-text-3, #86909c);
}
.tp-storage-arrow {
  color: var(--dca-text-3, #86909c);
}
.tp-storage-empty {
  grid-column: 1 / -1;
  text-align: center;
  padding: 32px;
  color: var(--dca-text-3, #86909c);
}

/* ③ 分布概览 */
.tp-dist-panel {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}
.tp-dist-col {
  border: 1px solid var(--dca-border-2, #e5e6eb);
  border-radius: 8px;
  padding: 16px;
}
.tp-dist-col-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--dca-text-1, #1d2129);
  margin-bottom: 12px;
}
.tp-dist-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.tp-dist-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.tp-dist-label {
  width: 60px;
  font-size: 13px;
  color: var(--dca-text-2, #4e5969);
  white-space: nowrap;
}
.tp-dist-bar-wrap {
  flex: 1;
  height: 8px;
  background: var(--dca-fill-2, #f2f3f5);
  border-radius: 4px;
  overflow: hidden;
}
.tp-dist-bar {
  height: 100%;
  border-radius: 4px;
  background: var(--dca-brand-primary, #165dff);
  transition: width 0.3s;
}
.tp-dist-bar-blue {
  background: #0fc6db;
}
.tp-dist-bar-green {
  background: #00b42a;
}
.tp-dist-count {
  width: 28px;
  text-align: right;
  font-size: 13px;
  font-weight: 500;
  color: var(--dca-text-1, #1d2129);
}
.tp-dist-empty {
  text-align: center;
  color: var(--dca-text-3, #86909c);
  padding: 12px;
  font-size: 13px;
}

@media (max-width: 768px) {
  .tp-dist-panel {
    grid-template-columns: 1fr;
  }
}
</style>
