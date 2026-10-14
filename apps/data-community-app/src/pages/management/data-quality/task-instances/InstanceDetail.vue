<template>
  <div class="instance-detail">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <a-button type="text" @click="goBack">
          <template #icon><IconArrowLeft /></template>
          返回
        </a-button>
        <h2 class="page-title">实例详情</h2>
      </div>
      <div class="header-right">
        <a-button @click="goBack">返回列表</a-button>
      </div>
    </div>

    <a-spin :loading="loading" tip="加载中..." style="width: 100%">
      <template v-if="instance">
        <!-- 基本信息 -->
        <a-card title="基本信息" class="detail-section">
          <a-descriptions :column="3" bordered>
            <a-descriptions-item label="任务名称">
              {{ instance.taskName }}
            </a-descriptions-item>
            <a-descriptions-item label="运行状态">
              <a-badge
                :status="statusMap[instance.status]?.status"
                :text="statusMap[instance.status]?.text"
              />
            </a-descriptions-item>
            <a-descriptions-item label="校验规则数">
              {{ instance.results?.length || 0 }} 条
            </a-descriptions-item>
            <a-descriptions-item label="运行时间">
              {{ instance.runTime }}
            </a-descriptions-item>
            <a-descriptions-item label="完成时间">
              {{ instance.finishTime }}
            </a-descriptions-item>
            <a-descriptions-item label="执行耗时">
              <span class="duration-text">{{ instance.duration }}s</span>
            </a-descriptions-item>
          </a-descriptions>
        </a-card>

        <!-- 校验结果 -->
        <a-card title="校验结果" class="detail-section">
          <a-table
            :data="instance.results || []"
            :pagination="false"
            :bordered="{ wrapper: true, cell: true }"
          >
            <template #columns>
              <a-table-column title="规则名称" data-index="ruleName" />
              <a-table-column title="校验类型" data-index="type" :width="100">
                <template #cell="{ record }">
                  <a-tag :color="record.type === 'count' ? 'arcoblue' : 'orangered'" size="small">
                    {{ record.type === 'count' ? 'count' : 'sum' }}
                  </a-tag>
                </template>
              </a-table-column>
              <a-table-column title="质量维度" data-index="dimension" :width="110">
                <template #cell="{ record }">
                  <a-tag :color="dimColor(record.dimension)" size="small">
                    {{ dimLabel(record.dimension) || record.dimension }}
                  </a-tag>
                </template>
              </a-table-column>
              <a-table-column title="样例指标（预置）" data-index="metrics" :width="300">
                <template #cell="{ record }">
                  <div class="metrics-cell">
                    <span v-for="(m, i) in record.metrics || []" :key="i" class="metric-chip">
                      {{ m.label }}
                      <b :class="{ 'diff-red-text': !record.isConsistent && i === 1 }">{{ m.value }}</b>
                    </span>
                  </div>
                </template>
              </a-table-column>
              <a-table-column title="维度得分" data-index="dimensionScore" :width="100">
                <template #cell="{ record }">
                  <span :class="record.dimensionScore >= record.threshold ? 'score-good' : 'score-bad'">
                    {{ record.dimensionScore }}
                  </span>
                </template>
              </a-table-column>
              <a-table-column title="源端值" data-index="sourceValue" :width="120" />
              <a-table-column title="目标端值" data-index="targetValue" :width="120" />
              <a-table-column title="差异值" data-index="diffValue" :width="100">
                <template #cell="{ record }">
                  <span :class="{ 'diff-red-text': record.diffValue > 0 }">
                    {{ record.diffValue }}
                  </span>
                </template>
              </a-table-column>
              <a-table-column title="结果" data-index="isConsistent" :width="100">
                <template #cell="{ record }">
                  <a-badge
                    :status="record.isConsistent ? 'success' : 'warning'"
                    :text="record.isConsistent ? '一致' : '不一致'"
                  />
                </template>
              </a-table-column>
            </template>
          </a-table>

          <div class="result-summary">
            <a-alert
              :type="instance.status === 'consistent' ? 'success' : instance.status === 'inconsistent' ? 'warning' : 'error'"
            >
              <template #title>
                <span v-if="instance.status === 'consistent'">
                  校验结果：全部一致 — {{ instance.results?.length || 0 }} 条规则校验通过
                </span>
                <span v-else-if="instance.status === 'inconsistent'">
                  校验结果：不一致 — {{ getInconsistentCount(instance) }} 条规则不一致，已推送告警到数字社区
                </span>
                <span v-else>
                  校验结果：执行失败 — 任务执行过程中出现异常，请查看下方日志
                </span>
              </template>
            </a-alert>
          </div>
        </a-card>

        <!-- 五维评分与资产目录回流 -->
        <a-card class="detail-section">
          <template #title>
            <div class="card-title-row">
              <span>五维评分与资产目录回流</span>
              <a-tag color="gray" size="small">演示挡板：按规则维度写死换算</a-tag>
            </div>
          </template>
          <div v-if="dimsPreview" class="quality-backfill">
            <div class="quality-left">
              <div class="target-line">
                目标资产：
                <span class="table-link-name">{{ dimsPreview.tableName }}</span>
                <a-link size="small" @click="goTableQuality">在数据地图查看质量分</a-link>
              </div>
              <div v-for="dim in QUALITY_DIMENSIONS" :key="dim" class="dim-row">
                <span class="dim-label">
                  {{ QUALITY_DIM_LABELS[dim] }}
                  <span class="dim-weight">权重 {{ weightPercent(dim) }}%</span>
                </span>
                <a-progress
                  :percent="(dimsPreview.dims[dim] || 0) / 100"
                  :color="dimProgressColor(dimsPreview.dims[dim])"
                  size="small"
                  :show-text="false"
                  class="dim-progress"
                />
                <span class="dim-score" :style="{ color: dimProgressColor(dimsPreview.dims[dim]) }">
                  {{ dimsPreview.dims[dim] }}
                </span>
              </div>
            </div>
            <div class="quality-right">
              <div class="score-big" :style="{ color: dimProgressColor(dimsPreview.score) }">
                {{ dimsPreview.score }}
              </div>
              <div class="score-caption">加权综合质量评分</div>
              <a-button
                type="primary"
                :loading="backfilling"
                :disabled="instance.status === 'failed'"
                @click="handleBackfill"
              >
                回填表目录
              </a-button>
              <div v-if="instance.status === 'failed'" class="backfill-tip">
                实例执行失败，未产出可信评分，暂不可回填
              </div>
              <div v-else-if="backfilled" class="backfill-tip backfill-ok">
                已回流：{{ backfilled.tableName }} → {{ backfilled.score }} 分（资产目录已更新）
              </div>
              <div v-else class="backfill-tip">
                点击后评分写入资产目录，表详情页「质量」标签页可同步看到
              </div>
            </div>
          </div>
          <a-empty v-else description="暂无五维评分换算结果" />
        </a-card>

        <!-- 执行日志 -->
        <a-card title="执行日志" class="detail-section">
          <div class="log-container">
            <pre class="log-content">{{ instance.log }}</pre>
          </div>
        </a-card>
      </template>

      <a-empty v-else-if="!loading" description="未找到实例数据" />
    </a-spin>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { IconArrowLeft } from '@arco-design/web-vue/es/icon'
import {
  getInstanceDetail,
  getQualityDims,
  backfillCatalogQuality,
  QUALITY_DIMENSIONS,
  QUALITY_DIM_LABELS,
  dimColor,
  dimLabel,
  QUALITY_WEIGHTS,
  type QualityDimension
} from '../../../../mock/api/dataQuality'

const router = useRouter()
const route = useRoute()

const loading = ref(false)
const instance = ref<any>(null)
const dimsPreview = ref<any>(null)
const backfilling = ref(false)
const backfilled = ref<any>(null)

const statusMap: Record<string, { status: any; text: string }> = {
  consistent: { status: 'success', text: '一致' },
  inconsistent: { status: 'warning', text: '不一致' },
  failed: { status: 'danger', text: '执行失败' }
}

const weightPercent = (dim: QualityDimension) => Math.round((QUALITY_WEIGHTS[dim] || 0) * 100)

const dimProgressColor = (score: number) => {
  if (score >= 90) return '#00b42a'
  if (score >= 80) return '#ff7d00'
  return '#f53f3f'
}

const goTableQuality = () => {
  const name = dimsPreview.value?.tableName
  if (!name) return
  const worst = weakestDim(dimsPreview.value?.dims)
  router.push(`/discovery/data-map/table/${encodeURIComponent(name)}?tab=quality&dim=${worst}`)
}

/** 最短板维度：取五维中的最低分 */
const weakestDim = (dims: any): string => {
  if (!dims) return QUALITY_DIMENSIONS[0]
  return QUALITY_DIMENSIONS.reduce((min, d) => ((dims[d] ?? 100) < (dims[min] ?? 100) ? d : min), QUALITY_DIMENSIONS[0])
}

const loadDims = async () => {
  try {
    dimsPreview.value = await getQualityDims(route.params.id as string)
  } catch (e) {
    dimsPreview.value = null
  }
}

const handleBackfill = async () => {
  if (!instance.value) return
  backfilling.value = true
  try {
    const res = await backfillCatalogQuality(instance.value.id)
    backfilled.value = res
    Message.success(`已将 ${res.tableName} 的质量评分（${res.score} 分）回流至资产目录`)
  } catch (e: any) {
    Message.error(e?.message || '回填失败')
  } finally {
    backfilling.value = false
  }
}

const getInconsistentCount = (data: any) => {
  if (!data?.results) return 0
  return data.results.filter((r: any) => !r.isConsistent).length
}

const goBack = () => {
  router.back()
}

const loadData = async () => {
  loading.value = true
  try {
    const data = await getInstanceDetail(route.params.id as string)
    instance.value = data
    await loadDims()
  } catch (e: any) {
    Message.error(e?.message || '加载实例详情失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.instance-detail {
  padding: 20px;
  background-color: #f5f5f5;
  min-height: 100vh;
  overflow-y: auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 16px 20px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1d2129;
}

.detail-section {
  margin-bottom: 20px;
}

.diff-red-text {
  color: #f53f3f;
  font-weight: 600;
}

.result-summary {
  margin-top: 20px;
}

.metrics-cell {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.metric-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  font-size: 12px;
  color: #4e5969;
  background: #f2f3f5;
  border-radius: 10px;
}

.metric-chip b {
  color: #1d2129;
  font-weight: 600;
}

.score-good {
  color: #00b42a;
  font-weight: 600;
}

.score-bad {
  color: #ff7d00;
  font-weight: 600;
}

.card-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.quality-backfill {
  display: flex;
  gap: 40px;
  align-items: flex-start;
}

.quality-left {
  flex: 1;
  min-width: 0;
}

.quality-right {
  width: 220px;
  flex-shrink: 0;
  text-align: center;
  padding-left: 24px;
  border-left: 1px solid #e5e6eb;
}

.target-line {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
  font-size: 13px;
  color: #86909c;
}

.table-link-name {
  font-size: 14px;
  font-weight: 600;
  color: #1d2129;
}

.dim-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.dim-label {
  width: 116px;
  flex-shrink: 0;
  font-size: 13px;
  color: #1d2129;
}

.dim-weight {
  margin-left: 4px;
  font-size: 12px;
  color: #86909c;
}

.dim-progress {
  flex: 1;
}

.dim-score {
  width: 36px;
  text-align: right;
  font-size: 14px;
  font-weight: 600;
}

.score-big {
  font-size: 40px;
  font-weight: 700;
  line-height: 1.1;
}

.score-caption {
  margin: 4px 0 16px;
  font-size: 12px;
  color: #86909c;
}

.backfill-tip {
  margin-top: 12px;
  font-size: 12px;
  line-height: 1.6;
  color: #86909c;
}

.backfill-ok {
  color: #00b42a;
}

.log-container {
  background: #1d2129;
  border-radius: 6px;
  overflow: hidden;
}

.log-content {
  margin: 0;
  padding: 20px;
  font-family: 'SF Mono', 'Monaco', 'Menlo', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.8;
  color: #e5e6eb;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>