<template>
  <a-card class="governance-overview" :bordered="false">
    <template #title>
      <div class="card-title">
        <icon-safe class="title-icon" />
        <span>数据治理全景</span>
        <a-tag size="small" color="arcoblue">打通数据标准 / 分级 / 资源 / 资产 / 要素</a-tag>
      </div>
    </template>
    <template #extra>
      <a-link @click="$emit('drillDown')">查看详情</a-link>
    </template>

    <a-row :gutter="16">
      <a-col :xs="12" :sm="6" :md="6" :lg="6">
        <div class="metric-card">
          <div class="metric-value">{{ stats.fieldLinkCount }}</div>
          <div class="metric-label">字段关联</div>
          <div class="metric-trend">
            <span class="trend-item">标准 {{ stats.standardLinked }}</span>
            <span class="trend-divider">·</span>
            <span class="trend-item">分级 {{ stats.sensitivityLinked }}</span>
          </div>
        </div>
      </a-col>

      <a-col :xs="12" :sm="6" :md="6" :lg="6">
        <div class="metric-card">
          <div class="metric-value">
            <span :class="complianceClass">{{ stats.avgComplianceRate }}%</span>
          </div>
          <div class="metric-label">平均标准合规率</div>
          <div class="metric-trend">
            <span class="trend-item">覆盖 {{ stats.compliantTables }} 张表</span>
          </div>
        </div>
      </a-col>

      <a-col :xs="12" :sm="6" :md="6" :lg="6">
        <div class="metric-card">
          <div class="metric-value">
            <span :class="classifyClass">{{ stats.avgClassifyCoverage }}%</span>
          </div>
          <div class="metric-label">平均分级覆盖率</div>
          <div class="metric-trend">
            <span class="trend-item">L1-L4 全覆盖</span>
          </div>
        </div>
      </a-col>

      <a-col :xs="12" :sm="6" :md="6" :lg="6">
        <div class="metric-card">
          <div class="metric-value">{{ stats.taxonomyNodeCount }}</div>
          <div class="metric-label">分类树节点</div>
          <div class="metric-trend">
            <span class="trend-item">域 {{ stats.domainCount }} · 实体 {{ stats.entityCount }}</span>
          </div>
        </div>
      </a-col>
    </a-row>

    <!-- 分级分布 -->
    <div class="sensitivity-bar">
      <div class="bar-label">敏感级别分布</div>
      <div class="bar-container">
        <div
          v-for="item in sensitivityBar"
          :key="item.level"
          class="bar-segment"
          :style="{ flex: item.count, background: item.color }"
          :title="`${item.label}: ${item.count} 个字段`"
        >
          <span v-if="item.count > 0" class="bar-text">{{ item.level }} {{ item.count }}</span>
        </div>
      </div>
    </div>
  </a-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { IconSafe } from '@arco-design/web-vue/es/icon'
import { FieldLinkStore } from '@/mock-shared/lineage'
import { TaxonomyStore } from '@/mock-shared/classification-taxonomy'
import { MetadataStore } from '@/mock-shared/metadata-store'

defineEmits<{ drillDown: [] }>()

const stats = computed(() => {
  const links = FieldLinkStore.list()
  const tables = MetadataStore.getTables()
  const taxonomy = TaxonomyStore.list()

  // 平均合规率
  let totalCompliance = 0
  let totalClassify = 0
  let tablesWithLinks = 0
  tables.forEach(t => {
    const c = FieldLinkStore.tableComplianceRate(t.name)
    const k = FieldLinkStore.tableClassifyCoverage(t.name)
    if (c > 0 || k > 0) tablesWithLinks++
    totalCompliance += c
    totalClassify += k
  })
  const avgComplianceRate = tables.length ? Math.round(totalCompliance / tables.length) : 0
  const avgClassifyCoverage = tables.length ? Math.round(totalClassify / tables.length) : 0

  return {
    fieldLinkCount: links.length,
    standardLinked: links.filter(l => l.standardCode).length,
    sensitivityLinked: links.filter(l => l.sensitivityLevel).length,
    elementLinked: links.filter(l => l.businessElementId).length,
    assetLinked: links.filter(l => l.assetId).length,
    avgComplianceRate,
    avgClassifyCoverage,
    compliantTables: tablesWithLinks,
    taxonomyNodeCount: taxonomy.length,
    domainCount: TaxonomyStore.byLevel(1).length,
    entityCount: TaxonomyStore.byLevel(2).length
  }
})

const sensitivityBar = computed(() => {
  const stats = FieldLinkStore.stats()
  return [
    { level: 'L1', label: '公开', count: stats.bySensitivity.L1, color: '#c9cdd4' },
    { level: 'L2', label: '内部', count: stats.bySensitivity.L2, color: '#165dff' },
    { level: 'L3', label: '机密', count: stats.bySensitivity.L3, color: '#ff7d00' },
    { level: 'L4', label: '绝密', count: stats.bySensitivity.L4, color: '#f53f3f' }
  ]
})

const complianceClass = computed(() => {
  const v = stats.value.avgComplianceRate
  return v >= 80 ? 'value-good' : v >= 50 ? 'value-mid' : 'value-bad'
})
const classifyClass = computed(() => {
  const v = stats.value.avgClassifyCoverage
  return v >= 80 ? 'value-good' : v >= 50 ? 'value-mid' : 'value-bad'
})
</script>

<style lang="scss" scoped>
.governance-overview {
  .card-title {
    display: flex;
    align-items: center;
    gap: 8px;

    .title-icon {
      color: #722ed1;
      font-size: 18px;
    }
  }

  .metric-card {
    padding: 12px;
    background: #f7f8fa;
    border-radius: 6px;
    text-align: center;

    .metric-value {
      font-size: 28px;
      font-weight: 600;
      color: #1d2129;
      line-height: 1.2;

      &.value-good { color: #00b42a; }
      &.value-mid { color: #ff7d00; }
      &.value-bad { color: #f53f3f; }
    }

    .metric-label {
      font-size: 13px;
      color: #4e5969;
      margin: 4px 0;
    }

    .metric-trend {
      font-size: 12px;
      color: #86909c;

      .trend-divider {
        margin: 0 4px;
      }
    }
  }

  .sensitivity-bar {
    margin-top: 16px;
    padding-top: 12px;
    border-top: 1px solid #f2f3f5;

    .bar-label {
      font-size: 12px;
      color: #86909c;
      margin-bottom: 6px;
    }

    .bar-container {
      display: flex;
      height: 32px;
      border-radius: 4px;
      overflow: hidden;
      background: #f2f3f5;
    }

    .bar-segment {
      display: flex;
      align-items: center;
      justify-content: center;
      transition: flex 0.3s;
      min-width: 0;
    }

    .bar-text {
      color: #fff;
      font-size: 12px;
      font-weight: 500;
      white-space: nowrap;
    }
  }
}
</style>