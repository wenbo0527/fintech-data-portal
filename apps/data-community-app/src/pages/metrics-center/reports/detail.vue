<template>
  <div class="report-detail-page">
    <template v-if="report">
      <!-- 页头 -->
      <div class="page-header">
        <div class="header-left">
          <a-button type="text" size="small" @click="goBack">
            <template #icon><IconLeft /></template>
            返回
          </a-button>
          <h2>{{ report.name }}</h2>
          <a-tag :color="report.status === 'active' ? 'green' : 'red'">
            {{ report.status === 'active' ? '启用中' : '已下线' }}
          </a-tag>
          <a-tag :color="typeColor(report.type)">{{ typeLabel(report.type) }}</a-tag>
        </div>
        <a-space>
          <a-button type="primary" @click="goEdit">
            <template #icon><IconEdit /></template>
            编辑
          </a-button>
          <a-popconfirm
            :content="report.status === 'active' ? '下线后指标挂载将失效，确认下线？' : '确认重新上线该报表？'"
            @ok="handleToggleStatus"
          >
            <a-button :status="report.status === 'active' ? 'danger' : 'normal'">
              {{ report.status === 'active' ? '下线' : '上线' }}
            </a-button>
          </a-popconfirm>
        </a-space>
      </div>

      <!-- E11 提示：被引用报表下线拦截 -->
      <a-alert v-if="referencedMetrics.length" type="info" style="margin-bottom: 16px">
        该报表被 {{ referencedMetrics.length }} 个指标挂载引用，下线前需先在指标侧解除挂载
      </a-alert>

      <a-card title="基本信息" :bordered="false" class="section-card">
          <a-descriptions :column="3" bordered size="medium">
            <a-descriptions-item label="报表类型">{{ typeLabel(report.type) }}</a-descriptions-item>
            <a-descriptions-item label="负责人">{{ report.owner }}</a-descriptions-item>
            <a-descriptions-item label="更新频率">{{ freqLabel(report.updateFrequency) }}</a-descriptions-item>
            <a-descriptions-item label="更新时间">{{ report.updatedAt }}</a-descriptions-item>
            <a-descriptions-item label="状态">
              <a-tag :color="report.status === 'active' ? 'green' : 'red'">
                {{ report.status === 'active' ? '启用中' : '已下线' }}
              </a-tag>
            </a-descriptions-item>
          </a-descriptions>
        </a-card>

        <!-- Agent 访问入口（R27 人机同源，报表侧统一维护） -->
        <a-card title="Agent 访问入口" :bordered="false" class="section-card">
          <a-descriptions :column="1" bordered size="medium">
            <a-descriptions-item label="访问入口（人机共用）">
              <a-link :href="report.accessEntry" target="_blank" hover-behave="underline">{{ report.accessEntry || '—' }}</a-link>
            </a-descriptions-item>
          </a-descriptions>
          <div class="contract-hint">
            人机同源：指标详情页展示的"报表位置 / 访问入口"均由此处统一派生，修改后所有挂载指标同步生效。
          </div>
        </a-card>

        <!-- 被引用指标（R25 反查） -->
        <a-card title="被引用指标" :bordered="false" class="section-card">
          <a-table
            v-if="referencedMetrics.length"
            :data="referencedMetrics"
            :pagination="false"
            row-key="id"
            size="small"
          >
            <template #columns>
              <a-table-column title="指标名称" data-index="name">
                <template #cell="{ record }">
                  <a-link @click="goMetric(record.id)">{{ record.name }}</a-link>
                </template>
              </a-table-column>
              <a-table-column title="指标编码" data-index="code" :width="200" ellipsis tooltip />
            </template>
          </a-table>
          <a-empty v-else description="暂无指标挂载该报表" />
        </a-card>
    </template>

    <a-empty v-else description="报表不存在或已被删除" style="margin-top: 80px">
      <a-button type="primary" @click="goBack">返回报表列表</a-button>
    </a-empty>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { IconLeft, IconEdit } from '@arco-design/web-vue/es/icon'
import { MetricsCenterStore } from '@/mock-dca/metrics-center/store'
import { REPORT_TYPE_OPTIONS, FREQUENCY_OPTIONS } from '@/mock-dca/metrics-center/data'
import type { ReportItem, ReportType, CalculationFrequency } from '@/mock-dca/metrics-center/types'

const props = defineProps<{ id: string }>()
const router = useRouter()

const report = ref<ReportItem | null>(null)

/** 被哪些指标挂载引用（R25） */
const referencedMetrics = computed(() =>
  report.value ? MetricsCenterStore.getReportReferencedMetrics(report.value.id) : []
)

function typeLabel(t: ReportType) {
  return REPORT_TYPE_OPTIONS.find(o => o.value === t)?.label ?? t
}
function typeColor(t: ReportType) {
  return t === 'fixed' ? 'arcoblue' : t === 'branch_board' ? 'orangered' : 'purple'
}
function freqLabel(f: CalculationFrequency) {
  return FREQUENCY_OPTIONS.find(o => o.value === f)?.label ?? f
}

function loadData() {
  report.value = MetricsCenterStore.getReportById(props.id) ?? null
}

/** 编辑：跳转到 TAB 表单页（人读 / Agent 双页签） */
function goEdit() {
  if (report.value) router.push({ name: 'metrics-center-reports-create', query: { id: report.value.id } })
}

/** 上线/下线：被引用报表禁止下线（E11，store 内 throw 拦截） */
function handleToggleStatus() {
  if (!report.value) return
  const next = report.value.status === 'active' ? 'offline' : 'active'
  try {
    MetricsCenterStore.setReportStatus(report.value.id, next)
    Message.success(next === 'active' ? '报表已上线' : '报表已下线')
    loadData()
  } catch (e) {
    Message.error((e as Error).message)
  }
}

function goBack() {
  router.push({ name: 'metrics-center-reports' })
}
function goMetric(id: string) {
  router.push({ name: 'metrics-center-detail', params: { id } })
}

watch(() => props.id, loadData)
onMounted(loadData)
</script>

<style scoped lang="less">
.report-detail-page {
  padding: 16px;

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;

    .header-left {
      display: flex;
      align-items: center;
      gap: 8px;

      h2 { margin: 0; font-size: 20px; }
    }
  }

  .section-card {
    margin-bottom: 16px;
  }

  .contract-hint {
    margin-top: 12px;
    font-size: 12px;
    color: #86909c;
  }
}
</style>
