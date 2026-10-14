<template>
  <div v-if="detail" class="metric-card">
    <!-- 指标头部 -->
    <div class="metric-header">
      <div class="metric-name-row">
        <span class="metric-name">{{ detail.name }}</span>
        <a-tag :color="statusColorMap[detail.status]" size="small">{{ statusLabelMap[detail.status] }}</a-tag>
        <a-tag color="arcoblue" size="small">{{ detail.category }}</a-tag>
        <a-tag
          v-if="detail.alertEnabled"
          color="orangered"
          size="small"
        >
          预警已启用
        </a-tag>
      </div>
      <div class="metric-meta">
        <span class="meta-item"><icon-tag /> 编码: {{ detail.code }}</span>
        <span v-if="detail.aliases?.length" class="meta-item">别名: {{ detail.aliases.join('、') }}</span>
        <span class="meta-item"><icon-user-group /> 维护团队: {{ detail.maintainedBy }}</span>
        <span class="meta-item"><icon-history /> 更新于: {{ detail.updatedAt }}</span>
        <span class="meta-item"><icon-version /> 版本: {{ versionSummary }}</span>
      </div>
    </div>

    <!-- 口径定义区域 -->
    <div class="section">
      <div class="section-title">
        <icon-bookmark /> 口径定义 ({{ detail.definitions.length }})
      </div>
      <div class="definition-list">
        <div
          v-for="def in detail.definitions"
          :key="def.id"
          class="definition-card"
        >
          <div class="def-header">
            <span class="def-caliber">{{ def.caliberName }}</span>
            <span class="def-header-right">
              <a-tag size="small">{{ def.version }}</a-tag>
              <a-button size="mini" type="text" @click="toggleSql(def.id)">
                {{ expandedSqlId === def.id ? '收起SQL' : '查看生成SQL' }}
              </a-button>
            </span>
          </div>
          <div class="def-formula">{{ def.formula }}</div>
          <div class="def-source">数据来源: {{ def.sourceSystem }}</div>
          <pre v-if="expandedSqlId === def.id" class="sql-block">{{ sqlFor(def) }}</pre>
        </div>
      </div>
    </div>

    <!-- 涉及数据表区域 -->
    <div class="section">
      <div class="section-title">
        <icon-storage /> 涉及数据表 ({{ tableMappings.length }})
      </div>
      <div class="table-list">
        <div
          v-for="tbl in tableMappings"
          :key="tbl.tableId"
          class="table-card"
        >
          <div class="table-header">
            <span class="table-name">{{ tbl.tableCnName }}</span>
            <code class="table-code">{{ tbl.tableName }}</code>
            <span
              class="semantic-tag"
              :class="`semantic-tag--${tbl.role}`"
            >
              {{ roleLabel(tbl.role) }}
            </span>
          </div>
          <div class="field-list">
            <div
              v-for="field in tbl.fields"
              :key="field.fieldId"
              class="field-item"
            >
              <div class="field-info">
                <span class="field-cn-name">{{ field.fieldCnName }}</span>
                <code class="field-name">{{ field.fieldName }}</code>
                <a-tag size="mini">{{ field.dataType }}</a-tag>
              </div>
              <div class="field-usage">{{ field.usedInFormula }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 跨系统引用：语义底座标准指标 ↔ 其他子应用（数据工厂/数据社区/数据地图）的指标编码映射 -->
    <div class="section">
      <div class="section-title">
        <icon-link /> 跨系统引用 ({{ externalRefs.length }})
      </div>
      <div v-if="externalRefs.length" class="external-ref-list">
        <div
          v-for="ext in externalRefs"
          :key="`${ext.app}-${ext.code}`"
          class="external-ref-item"
        >
          <a-tag :color="externalAppColorMap[ext.app]" size="small">
            {{ externalAppLabelMap[ext.app] }}: {{ ext.code }} {{ ext.name }}
          </a-tag>
          <div v-if="ext.note" class="external-ref-note">{{ ext.note }}</div>
        </div>
      </div>
      <div v-else class="external-ref-empty">暂无跨系统映射</div>
    </div>

    <!-- 预警信息 -->
    <div class="section">
      <div class="section-title">
        <icon-bell /> 预警信息
      </div>
      <div class="alert-info">
        <div class="alert-item">
          <span class="alert-label">预警阈值</span>
          <span class="alert-value">{{ detail.alertThreshold }}%</span>
        </div>
        <div class="alert-item">
          <span class="alert-label">是否启用</span>
          <a-tag :color="detail.alertEnabled ? 'red' : 'gray'" size="small">
            {{ detail.alertEnabled ? '已启用' : '未启用' }}
          </a-tag>
        </div>
      </div>
    </div>

    <!-- 变更历史（口径审计） -->
    <div v-if="changeHistory.length" class="section">
      <div class="section-title">
        <icon-safe /> 变更历史 ({{ changeHistory.length }})
      </div>
      <div class="history-panel">
        <a-timeline>
          <a-timeline-item
            v-for="(h, i) in changeHistory"
            :key="`${h.time}-${i}`"
            :dot-color="i === 0 ? '#165dff' : '#c9cdd4'"
          >
            <div class="hist-head">
              <span class="hist-action">{{ h.action }}</span>
              <span class="hist-time">{{ h.time }}</span>
            </div>
            <div class="hist-desc">{{ h.description }}</div>
            <div class="hist-op">操作人：{{ h.operator }}</div>
          </a-timeline-item>
        </a-timeline>
      </div>
    </div>

    <!-- 底部操作按钮 -->
    <div class="metric-actions">
      <template v-if="detail.status === 'draft'">
        <a-button type="outline" @click="$emit('status-change', detail.id, 'pending')">
          <template #icon><icon-send /></template>
          提交审批
        </a-button>
      </template>
      <template v-else-if="detail.status === 'pending'">
        <a-button type="primary" @click="$emit('status-change', detail.id, 'published')">审批通过并发布</a-button>
        <a-button @click="$emit('status-change', detail.id, 'draft')">回退草稿</a-button>
      </template>
      <template v-else-if="detail.status === 'published'">
        <a-popconfirm content="下线后该指标将停止对外提供口径查询，确定下线？" @ok="$emit('status-change', detail.id, 'offline')">
          <a-button type="outline" status="warning">下线</a-button>
        </a-popconfirm>
      </template>
      <template v-else>
        <a-button type="outline" @click="$emit('status-change', detail.id, 'pending')">重新提交审批</a-button>
      </template>
      <a-button @click="$emit('edit', detail)">
        <template #icon><icon-edit /></template>
        编辑
      </a-button>
      <a-popconfirm content="确定删除该指标？" @ok="$emit('delete', detail.id)">
        <a-button status="danger">
          <template #icon><icon-delete /></template>
          删除
        </a-button>
      </a-popconfirm>
    </div>
  </div>

  <a-empty v-else description="请选择指标查看详情" style="padding: 80px 0" />
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ExternalMetricRef, MetricDetail, MetricDefinition, MetricStatus } from '@/types/metric'
import { externalAppColorMap, externalAppLabelMap } from '@/types/metric'
import { generateMetricSql, statusLabelMap } from '@/mock/metric'

const props = defineProps<{
  detail: MetricDetail | null
}>()

defineEmits<{
  (e: 'edit', detail: MetricDetail): void
  (e: 'delete', id: string): void
  (e: 'status-change', id: string, status: MetricStatus): void
}>()

const statusColorMap: Record<MetricStatus, string> = {
  draft: 'gray',
  pending: 'orange',
  published: 'green',
  offline: 'red'
}

const tableMappings = computed(() => props.detail?.tableMappings ?? [])

const changeHistory = computed(() => props.detail?.changeHistory ?? [])

/** 跨系统指标编码映射（来自语义契约包，未配置时为空） */
const externalRefs = computed<ExternalMetricRef[]>(() => props.detail?.externalRefs ?? [])

// SQL 预览展开状态（切换指标时重置）
const expandedSqlId = ref('')
watch(() => props.detail?.id, () => { expandedSqlId.value = '' })

function toggleSql(defId: string) {
  expandedSqlId.value = expandedSqlId.value === defId ? '' : defId
}

function sqlFor(def: MetricDefinition): string {
  return props.detail ? generateMetricSql(props.detail, def) : ''
}

const versionSummary = computed(() => {
  if (!props.detail?.definitions?.length) return '-'
  const versions = props.detail.definitions.map(d => d.version)
  if (versions.length === 1) return versions[0]
  return versions.join(' / ')
})

function roleLabel(role: string): string {
  const labels: Record<string, string> = {
    numerator: '分子',
    denominator: '分母',
    dimension: '维度'
  }
  return labels[role] || role
}
</script>

<style scoped lang="scss">
.metric-card {
  padding: 20px;
}

/* ---- 指标头部 ---- */
.metric-header {
  padding-bottom: 16px;
  border-bottom: 1px solid var(--color-border);
  margin-bottom: 16px;

  .metric-name-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;

    .metric-name {
      font-size: 20px;
      font-weight: 700;
      color: var(--color-text);
    }
  }

  .metric-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;

    .meta-item {
      font-size: 13px;
      color: var(--color-text-secondary);
      display: flex;
      align-items: center;
      gap: 4px;
    }
  }
}

/* ---- 通用 Section ---- */
.section {
  margin-bottom: 20px;

  .section-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--color-text);
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
}

/* ---- 口径定义 ---- */
.definition-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.definition-card {
  background: #f7f8fa;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 12px 14px;

  .def-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 6px;

    .def-caliber {
      font-size: 14px;
      font-weight: 600;
      color: var(--color-accent);
    }
  }

  .def-header-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .def-formula {
    font-size: 13px;
    color: var(--color-text);
    line-height: 1.6;
    margin-bottom: 4px;
  }

  .def-source {
    font-size: 12px;
    color: var(--color-text-secondary);
  }
}

/* ---- SQL 预览 ---- */
.sql-block {
  margin-top: 10px;
  padding: 12px;
  background: #1d2129;
  color: #e5e6eb;
  border-radius: 6px;
  font-size: 12px;
  line-height: 1.7;
  overflow-x: auto;
  white-space: pre;
}

/* ---- 变更历史 ---- */
.history-panel {
  background: var(--color-bg-light);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 14px 16px 4px;

  .hist-head {
    display: flex;
    align-items: center;
    gap: 10px;

    .hist-action {
      font-size: 13px;
      font-weight: 600;
      color: var(--color-text);
    }

    .hist-time {
      font-size: 12px;
      color: var(--color-text-secondary);
    }
  }

  .hist-desc {
    font-size: 12px;
    color: var(--color-text-secondary);
    margin-top: 2px;
    line-height: 1.6;
  }

  .hist-op {
    font-size: 12px;
    color: var(--color-text-disabled, #a9aeb8);
    margin-top: 2px;
  }
}

/* ---- 数据表 ---- */
.table-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.table-card {
  background: var(--color-bg-light);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 12px 14px;

  .table-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;

    .table-name {
      font-size: 14px;
      font-weight: 600;
      color: var(--color-text);
    }

    .table-code {
      font-size: 12px;
      color: var(--color-text-secondary);
      background: #f2f3f5;
      padding: 1px 6px;
      border-radius: 3px;
    }
  }
}

.field-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 8px;
  border-radius: 4px;
  background: #f7f8fa;

  .field-info {
    display: flex;
    align-items: center;
    gap: 8px;

    .field-cn-name {
      font-size: 13px;
      color: var(--color-text);
    }

    .field-name {
      font-size: 12px;
      color: var(--color-text-secondary);
    }
  }

  .field-usage {
    font-size: 12px;
    color: var(--color-text-secondary);
    text-align: right;
  }
}

/* ---- 跨系统引用 ---- */
.external-ref-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.external-ref-item {
  padding: 10px 12px;
  background: var(--color-bg-light);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.external-ref-note {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--color-text-secondary);
}

.external-ref-empty {
  font-size: 13px;
  color: var(--color-text-secondary);
}

/* ---- 预警信息 ---- */
.alert-info {
  display: flex;
  gap: 24px;
  padding: 12px 14px;
  background: var(--color-bg-light);
  border: 1px solid var(--color-border);
  border-radius: 8px;

  .alert-item {
    display: flex;
    flex-direction: column;
    gap: 4px;

    .alert-label {
      font-size: 12px;
      color: var(--color-text-secondary);
    }

    .alert-value {
      font-size: 18px;
      font-weight: 700;
      color: var(--color-warning);
    }
  }
}

/* ---- 操作按钮 ---- */
.metric-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border);
}
</style>
