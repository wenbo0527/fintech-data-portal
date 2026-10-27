<template>
  <div class="tag-detail-container">
    <!-- 导航面包屑 -->
    <a-breadcrumb>
      <a-breadcrumb-item>标签中心</a-breadcrumb-item>
      <a-breadcrumb-item>标签详情</a-breadcrumb-item>
    </a-breadcrumb>

    <!-- 主体内容 -->
    <div class="content-card">
      <!-- 标签基本信息 -->
      <div class="base-info-section">
        <h2>{{ tagDetail.name }}</h2>
        <div class="meta-info">
          <span>创建时间：{{ formatTime(tagDetail.createdAt) }}</span>
          <span>最后更新：{{ formatTime(tagDetail.updatedAt) }}</span>
        </div>
      </div>

      <!-- 血缘图容器 -->
      <a-spin :loading="loading">
  <div class="lineage-section">
    <div v-if="!tagDetail.lineageData" class="empty-tip">
      <icon-exclamation-circle /> 暂无血缘数据
    </div>
    <div ref="lineageChartRef" v-show="tagDetail.lineageData" style="height: 600px;"></div>
  </div>
</a-spin>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, onMounted } from 'vue'
import { Message } from '@arco-design/web-vue'
import { getTagDetail } from '@/api/tag'
import { useRoute } from 'vue-router'
import * as echarts from 'echarts'

const lineageChartRef = ref(null)
const loading = ref(true)
const tagDetail = ref({})
const route = useRoute()

const fetchTagDetail = async (tagId) => {
  try {
    loading.value = true
    const { data } = await getTagDetail(tagId, { withLineage: true })

    tagDetail.value = {
      ...data,
      lineageData: processLineageData(data.lineage)
    }
  } catch (error) {
    console.error('获取标签详情失败:', error)
    Message.error('获取标签详情失败')
  } finally {
    loading.value = false
  }
}

// 将血缘接口数据转换为 echarts 树结构
const processLineageData = (lineage) => {
  if (!lineage) return null
  const relatedAudiences = Array.isArray(lineage.relatedAudiences) ? lineage.relatedAudiences : []
  const relatedTables = Array.isArray(lineage.relatedTables) ? lineage.relatedTables : []
  return {
    name: lineage.tagName,
    category: 'tag',
    children: [
      ...relatedAudiences.map(a => ({
        name: a.audienceName,
        category: 'audience',
        relatedCount: a.memberCount,
        updatedAt: a.lastUpdateTime
      })),
      ...relatedTables.map(t => ({
        name: t.tableName,
        category: 'table',
        syncTime: t.lastSyncTime
      }))
    ]
  }
}

onMounted(() => {
  fetchTagDetail(route.params.id)
})

const formatTime = (date) => {
  return new Date(date).toLocaleString()
}

const initLineageChart = () => {
  if (!lineageChartRef.value) return;
  const chart = echarts.init(lineageChartRef.value);
  
  const option = {
    tooltip: {
      trigger: 'item',
      formatter: ({ data }) => {
        return `<div style='padding:8px;'>
          <div style='font-weight:500;margin-bottom:4px;'>${data.name}</div>
          <div style='color:#666;'>类型：${data.category}</div>
          ${data.category === 'tag' 
            ? `<div style='color:#666;margin-top:4px;'>更新时间：${new Date(data.updatedAt).toLocaleString()}</div>` 
            : ''}
          ${data.category === 'audience' 
            ? `<div style='color:#666;margin-top:4px;'>关联人群：${data.relatedCount}</div>`
            : ''}
          ${data.category === 'table' 
            ? `<div style='color:#666;margin-top:4px;'>同步时间：${new Date(data.syncTime).toLocaleString()}</div>`
            : ''}
        </div>`;
      }
    },
    series: [{
      type: 'tree',
      data: [tagDetail.value.lineageData],
      symbolSize: 12,
      orient: 'LR',
      itemStyle: {
        color: ({ data }) => {
          const colors = { tag: '#52c41a', audience: 'var(--subapp-info)', table: '#f5222d' };
          return colors[data.category] || '#666';
        }
      },
      lineStyle: { color: '#ccc', width: 1.5 }
    }]
  };

  chart.setOption(option);
  window.addEventListener('resize', () => chart.resize());
};

watch(() => tagDetail.value.lineageData, (newVal) => {
  if (newVal) {
    nextTick(initLineageChart)
  }
})
</script>

<style scoped>
.tag-detail-container {
  padding: 24px;
  background: #f5f7fa;
  min-height: 100vh;
}

.content-card {
  margin-top: 16px;
  background: #fff;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
}

.base-info-section h2 {
  margin-bottom: 12px;
  color: var(--subapp-text-primary);
  font-size: 20px;
}

.meta-info {
  display: flex;
  gap: 20px;
  color: #666;
  margin-bottom: 24px;
  font-size: 13px;
}

.lineage-section {
  margin-top: 32px;
  border: 1px solid #eee;
  border-radius: 8px;
  overflow: hidden;
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-tip {
  color: #999;
  font-size: 14px;
  padding: 40px;
  text-align: center;
}

.empty-tip > svg {
  font-size: 24px;
  margin-right: 8px;
}
</style>