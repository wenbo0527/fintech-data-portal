<template>
  <div class="knowledge-maintain-view">
    <div class="page-header">
      <h2 class="semantic-page-title">业务知识维护</h2>
      <span class="page-subtitle">业务阶段 · 部门语境（市场/风险/运营/公共）· 术语字典维护</span>
    </div>

    <a-tabs default-active-key="stages" class="knowledge-tabs">
      <!-- Tab1: 业务阶段 -->
      <a-tab-pane key="stages" title="业务阶段">
        <a-row :gutter="16">
          <a-col :span="10">
            <div class="semantic-card">
              <BusinessStageTree
                :tree-data="store.stageTree"
                @select="onStageSelect"
                @view-metric="onViewMetric"
              />
            </div>
          </a-col>
          <a-col :span="14">
            <div class="semantic-card stage-detail">
              <!-- 语境节点详情 -->
              <template v-if="selectedContext">
                <div class="detail-header">
                  <icon-user-group class="header-icon" />
                  <span class="header-title">{{ selectedContext.contextName }}</span>
                  <a-tag :color="departmentColorMap[selectedContext.department]" size="small">
                    {{ departmentLabelMap[selectedContext.department] }}部门
                  </a-tag>
                </div>
                <div class="detail-body">
                  <div class="detail-row">
                    <span class="label">所属阶段：</span>
                    <span class="value">{{ contextStageName }}</span>
                  </div>
                  <div class="context-desc">{{ selectedContext.description }}</div>
                  <div class="detail-row">
                    <span class="label">挂载指标：</span>
                    <span class="value">{{ selectedContext.metrics.length }} 个</span>
                  </div>
                  <div class="metric-chips">
                    <a-tag
                      v-for="m in selectedContext.metrics"
                      :key="m.metricId"
                      color="arcoblue"
                      class="metric-chip"
                      @click="selectMetricById(m.metricId)"
                    >
                      {{ m.metricName }}
                    </a-tag>
                  </div>
                </div>
              </template>
              <!-- 阶段节点详情 -->
              <template v-else-if="selectedStage">
                <div class="detail-header">
                  <icon-folder class="header-icon" />
                  <span class="header-title">{{ selectedStage.stageName }}</span>
                  <span class="header-code">{{ selectedStage.stageCode }}</span>
                </div>
                <div class="detail-body">
                  <div class="detail-row">
                    <span class="label">部门语境：</span>
                    <span class="value">{{ selectedStage.contexts.length }} 个</span>
                  </div>
                  <div
                    v-for="ctx in selectedStage.contexts"
                    :key="ctx.contextId"
                    class="context-brief"
                    @click="selectContextById(ctx.contextId)"
                  >
                    <a-tag :color="departmentColorMap[ctx.department]" size="small">
                      {{ departmentLabelMap[ctx.department] }}
                    </a-tag>
                    <span class="brief-name">{{ ctx.contextName }}</span>
                    <span class="brief-count">{{ ctx.metrics.length }} 个指标</span>
                  </div>
                </div>
              </template>
              <!-- 指标节点详情 -->
              <template v-else-if="selectedMetric">
                <div class="detail-header">
                  <icon-bookmark class="header-icon" />
                  <span class="header-title">{{ selectedMetric.name }}</span>
                  <span class="header-code">{{ selectedMetric.code }}</span>
                </div>
                <div class="detail-body">
                  <div class="detail-row contexts-row">
                    <span class="label">所属语境：</span>
                    <span class="value context-tags">
                      <a-tag
                        v-for="c in metricContexts"
                        :key="c.contextId"
                        :color="departmentColorMap[c.department]"
                        size="small"
                      >
                        {{ stageNameOf(c.stageId) }}·{{ departmentLabelMap[c.department] }}
                      </a-tag>
                      <span v-if="!metricContexts.length" class="value">未挂载</span>
                    </span>
                  </div>
                  <div class="detail-row">
                    <span class="label">分类：</span>
                    <span class="value">{{ selectedMetric.category }}</span>
                  </div>
                  <div class="detail-row">
                    <span class="label">维护团队：</span>
                    <span class="value">{{ selectedMetric.maintainedBy }}</span>
                  </div>
                  <div class="detail-row">
                    <span class="label">口径数量：</span>
                    <span class="value">{{ selectedMetric.definitions?.length || 0 }} 套</span>
                  </div>
                  <div class="detail-row">
                    <span class="label">预警阈值：</span>
                    <span class="value">{{ selectedMetric.alertThreshold }}%</span>
                  </div>
                  <a-button type="outline" size="small" style="margin-top: 12px" @click="goToMetricManage">
                    前往指标定义管理
                  </a-button>
                </div>
              </template>
              <div v-else class="empty-state">
                <icon-empty class="empty-icon" />
                <p>点击左侧阶段 / 部门语境 / 指标节点查看详情</p>
              </div>
            </div>
          </a-col>
        </a-row>
      </a-tab-pane>

      <!-- Tab2: 术语字典 -->
      <a-tab-pane key="terms" title="术语字典">
        <div class="semantic-card">
          <TermDictTable
            :terms="store.terms"
            @add="onAddTerm"
            @edit="onEditTerm"
            @delete="onDeleteTerm"
          />
        </div>
      </a-tab-pane>
    </a-tabs>

    <!-- 术语编辑弹窗 -->
    <a-modal
      v-model:visible="termModalVisible"
      :title="editingTerm ? '编辑术语' : '新增术语'"
      @ok="onSubmitTerm"
      @cancel="termModalVisible = false"
    >
      <a-form :model="termForm" layout="vertical">
        <a-form-item label="术语名称" required>
          <a-input v-model="termForm.termName" placeholder="如：M1+" />
        </a-form-item>
        <a-form-item label="定义" required>
          <a-textarea v-model="termForm.definition" placeholder="术语定义描述" :auto-size="{ minRows: 2 }" />
        </a-form-item>
        <a-form-item label="分类" required>
          <a-select v-model="termForm.category">
            <a-option value="逾期分级">逾期分级</a-option>
            <a-option value="风控术语">风控术语</a-option>
            <a-option value="业务术语">业务术语</a-option>
          </a-select>
        </a-form-item>
        <a-form-item label="关联指标编码">
          <a-input v-model="termForm.relatedMetric" placeholder="如：fpd30" allow-clear />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useKnowledgeStore } from '@/stores/knowledge'
import { useMetricStore } from '@/stores/metric'
import BusinessStageTree from '@/components/BusinessStageTree.vue'
import TermDictTable from '@/components/TermDictTable.vue'
import type { StageTreeNode, Term, StageContext, BusinessStage } from '@/types/knowledge'
import { departmentLabelMap, departmentColorMap } from '@/types/knowledge'
import type { Metric } from '@/types/metric'

/** 语境 + 所属阶段 id 的扁平视图 */
type FlatContext = StageContext & { stageId: string }

const store = useKnowledgeStore()
const metricStore = useMetricStore()
const router = useRouter()

const selectedMetric = ref<Metric | null>(null)
const selectedContext = ref<FlatContext | null>(null)
const selectedStage = ref<BusinessStage | null>(null)
const termModalVisible = ref(false)
const editingTerm = ref<Term | null>(null)
const termForm = ref<Partial<Term>>({
  termName: '',
  definition: '',
  category: '业务术语',
  relatedMetric: ''
})

/** 全部语境（含所属阶段 id）的扁平视图 */
const flatContexts = computed<FlatContext[]>(() =>
  store.stages.flatMap(s => s.contexts.map(c => ({ ...c, stageId: s.stageId })))
)

/** 当前指标挂载于哪些语境 */
const metricContexts = computed<FlatContext[]>(() => {
  const id = selectedMetric.value?.id
  if (!id) return []
  return flatContexts.value.filter(c => c.metrics.some(m => m.metricId === id))
})

const contextStageName = computed(() =>
  selectedContext.value ? stageNameOf(selectedContext.value.stageId) : ''
)

function stageNameOf(stageId: string): string {
  return store.stages.find(s => s.stageId === stageId)?.stageName ?? ''
}

onMounted(async () => {
  await Promise.all([
    store.fetchStageTree(),
    store.fetchStages(),
    store.fetchTerms(),
    metricStore.fetchList()
  ])
})

function clearSelection() {
  selectedMetric.value = null
  selectedContext.value = null
  selectedStage.value = null
}

function onStageSelect(node: StageTreeNode) {
  if (node.nodeType === 'metric' && node.metricId) {
    selectMetricById(node.metricId)
  } else if (node.nodeType === 'context' && node.contextId) {
    selectContextById(node.contextId)
  } else if (node.nodeType === 'stage') {
    clearSelection()
    selectedStage.value = store.stages.find(s => s.stageId === node.key.split(':')[1]) ?? null
  }
}

function selectContextById(contextId: string) {
  clearSelection()
  selectedContext.value = flatContexts.value.find(c => c.contextId === contextId) ?? null
}

function selectMetricById(metricId: string) {
  clearSelection()
  selectedMetric.value = metricStore.list.find(m => m.id === metricId) as unknown as Metric || null
}

function onViewMetric(metricId: string | undefined) {
  if (!metricId) return
  selectMetricById(metricId)
}

function goToMetricManage() {
  router.push({ name: 'semantic-metric' })
}

function onAddTerm() {
  editingTerm.value = null
  termForm.value = { termName: '', definition: '', category: '业务术语', relatedMetric: '' }
  termModalVisible.value = true
}

function onEditTerm(term: Term) {
  editingTerm.value = term
  termForm.value = { ...term }
  termModalVisible.value = true
}

async function onDeleteTerm(id: string) {
  await store.removeTerm(id)
}

async function onSubmitTerm() {
  if (!termForm.value.termName || !termForm.value.definition) return
  if (editingTerm.value) {
    await store.saveTerm({ ...termForm.value, termId: editingTerm.value.termId })
  } else {
    await store.saveTerm(termForm.value)
  }
  termModalVisible.value = false
}
</script>

<style scoped lang="scss">
.knowledge-maintain-view {
  padding: 20px;
  height: 100%;
}

.page-header {
  margin-bottom: 16px;

  .page-subtitle {
    font-size: 13px;
    color: var(--color-text-secondary);
  }
}

.stage-detail {
  min-height: 300px;

  .detail-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--color-border);
    margin-bottom: 12px;

    .header-icon {
      font-size: 20px;
      color: var(--color-accent);
    }

    .header-title {
      font-size: 16px;
      font-weight: 600;
    }

    .header-code {
      font-size: 13px;
      color: var(--color-text-secondary);
      font-family: monospace;
    }
  }

  .detail-row {
    display: flex;
    padding: 6px 0;
    font-size: 13px;

    .label {
      width: 80px;
      flex-shrink: 0;
      color: var(--color-text-secondary);
    }

    .value {
      color: var(--color-text);
    }

    .context-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
  }

  .context-desc {
    font-size: 13px;
    line-height: 1.7;
    color: var(--color-text);
    background: #f7f8fa;
    border-left: 3px solid var(--color-accent);
    border-radius: 4px;
    padding: 10px 12px;
    margin: 8px 0 12px;
  }

  .metric-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 4px;

    .metric-chip {
      cursor: pointer;
    }
  }

  .context-brief {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    margin-bottom: 8px;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.15s;

    &:hover {
      border-color: var(--color-accent);
      background: #e8f3ff;
    }

    .brief-name {
      flex: 1;
      color: var(--color-text);
    }

    .brief-count {
      color: var(--color-text-secondary);
      font-size: 12px;
    }
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: var(--color-text-secondary);

  .empty-icon {
    font-size: 36px;
    margin-bottom: 8px;
    opacity: 0.3;
  }
}

:deep(.arco-tabs-tab-active) {
  color: var(--color-accent) !important;
}
</style>
