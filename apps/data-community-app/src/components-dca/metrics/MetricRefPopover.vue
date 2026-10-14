<template>
  <a-popover trigger="hover" position="bottom" :content-style="{ padding: '0', maxWidth: '380px' }">
    <a-button type="text" size="mini" class="ref-trigger">
      <IconInfoCircle />
    </a-button>
    <template #content>
      <div class="metric-ref-pop">
        <div class="pop-head">
          <span>本卡片引用 {{ card.refs.length }} 个指标（来源：指标中心）</span>
        </div>
        <div v-for="metricRef in card.refs" :key="metricRef.code" class="ref-block" :class="`status-${metricRef.status}`">
          <div class="ref-title">
            <span class="ref-name">{{ metricRef.metric?.name || metricRef.code }}</span>
            <a-tag v-if="metricRef.metric?.type === 'regulatory'" color="red" size="small">监管</a-tag>
            <a-tag v-else-if="metricRef.metric" color="blue" size="small">业务</a-tag>
            <a-tag v-if="metricRef.status === 'ok'" color="green" size="small">v{{ metricRef.metric?.currentVersion }}</a-tag>
            <a-tag v-else-if="metricRef.status === 'missing'" color="orangered" size="small">未注册</a-tag>
            <a-tag v-else-if="metricRef.status === 'draft'" color="orange" size="small">草稿</a-tag>
            <a-tag v-else color="gray" size="small">已归档</a-tag>
          </div>
          <div class="ref-row"><span class="ref-label">指标编码</span>{{ metricRef.code }}</div>
          <template v-if="metricRef.metric">
            <div class="ref-row"><span class="ref-label">归属</span>{{ metricRef.metric.domain }} / {{ metricRef.metric.scenario }}</div>
            <div class="ref-row">
              <span class="ref-label">负责人</span>业务 {{ metricRef.metric.businessOwner }} · 技术 {{ metricRef.metric.technicalOwner }}
            </div>
            <div class="ref-row">
              <span class="ref-label">计算时效</span>{{ frequencyLabel(metricRef.metric.calculationFrequency) }}
            </div>
            <div class="ref-row definition">
              <span class="ref-label">业务口径</span>{{ stripHtml(metricRef.metric.businessDefinition) }}
            </div>
            <div v-if="metricRef.outdated" class="ref-warn">
              看板锁定 v{{ metricRef.pinnedVersion }}，指标已升级至 v{{ metricRef.metric.currentVersion }}
            </div>
            <div class="ref-actions">
              <a-link size="small" @click="emit('detail', metricRef.metric!.id, card)">查看指标详情</a-link>
            </div>
          </template>
          <div v-else class="ref-warn">指标中心查不到该编码，看板无法取数，请先注册指标口径</div>
        </div>
      </div>
    </template>
  </a-popover>
</template>

<script setup lang="ts">
import { IconInfoCircle } from '@arco-design/web-vue/es/icon'
import { FREQUENCY_OPTIONS } from '@mock-dca/metrics-center/data'
import type { ResolvedCard } from '@mock-dca/metrics-center/types'

defineProps<{ card: ResolvedCard }>()
const emit = defineEmits<{ (e: 'detail', id: string, card: ResolvedCard): void }>()

function frequencyLabel(val?: string) {
  return FREQUENCY_OPTIONS.find(f => f.value === val)?.label || val || '-'
}

function stripHtml(html?: string) {
  if (!html) return '-'
  const text = html.replace(/<[^>]+>/g, '').trim()
  return text.length > 80 ? text.slice(0, 80) + '...' : text
}
</script>

<style lang="scss" scoped>
.ref-trigger {
  color: #86909c;
  padding: 0 2px;
}

.metric-ref-pop {
  .pop-head {
    padding: 8px 12px;
    font-size: 12px;
    color: #86909c;
    background: #f7f8fa;
    border-bottom: 1px solid #e5e6eb;
  }

  .ref-block {
    padding: 10px 12px;
    font-size: 13px;

    & + .ref-block { border-top: 1px dashed #e5e6eb; }
    &.status-missing, &.status-archived, &.status-draft { background: #fff7e8; }
    &.status-archived { background: #f7f8fa; }
  }

  .ref-title {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 6px;

    .ref-name { font-weight: 600; color: #1d2129; }
  }

  .ref-row {
    color: #4e5969;
    line-height: 20px;

    &.definition {
      display: flex;
      gap: 4px;
    }
  }

  .ref-label {
    display: inline-block;
    min-width: 60px;
    color: #86909c;
  }

  .ref-warn {
    margin-top: 6px;
    padding: 4px 8px;
    font-size: 12px;
    color: #ff7d00;
    background: #fff7e8;
    border-radius: 4px;
  }

  .ref-actions {
    margin-top: 4px;
    text-align: right;
  }
}
</style>
