<template>
  <div class="manage-view">
    <!-- 标题栏 -->
    <div class="manage-header">
      <span class="page-title">指标定义管理</span>
      <div class="header-actions">
        <a-input
          v-model="searchText"
          placeholder="搜索指标名称/编码/别名"
          allow-clear
          style="width: 240px"
        >
          <template #prefix><icon-search /></template>
        </a-input>
        <a-select
          v-model="statusFilter"
          placeholder="状态筛选"
          allow-clear
          style="width: 120px"
        >
          <a-option value="published">已发布</a-option>
          <a-option value="pending">待审批</a-option>
          <a-option value="draft">草稿</a-option>
          <a-option value="offline">已下线</a-option>
        </a-select>
        <a-button type="primary" @click="handleAdd">
          <template #icon><icon-plus /></template>
          新增指标
        </a-button>
      </div>
    </div>

    <!-- 主体区域 -->
    <div class="manage-body">
      <!-- 左侧指标列表 -->
      <div class="metric-list-panel">
        <a-spin :loading="metricStore.loading" style="width: 100%">
          <div class="metric-list-wrapper">
            <div
              v-for="item in filteredList"
              :key="item.id"
              class="metric-list-item"
              :class="{ active: selectedId === item.id }"
              @click="handleSelect(item.id)"
            >
              <div class="item-name">
                {{ item.name }}
                <span class="item-name-right">
                  <a-tag :color="statusColorMap[item.status]" size="small">{{ statusLabelMap[item.status] }}</a-tag>
                  <span class="item-count">{{ item.definitionCount }}口径</span>
                </span>
              </div>
              <div class="item-code">{{ item.code }} · {{ item.category }}</div>
            </div>
            <a-empty v-if="filteredList.length === 0" description="未找到匹配指标" />
          </div>
        </a-spin>
      </div>

      <!-- 右侧指标详情 -->
      <div class="metric-detail-panel">
        <a-spin :loading="metricStore.loading && !!selectedId" style="width: 100%">
          <MetricCard
            :detail="metricStore.currentDetail"
            @edit="handleEdit"
            @delete="handleDelete"
            @status-change="handleStatusChange"
          />
        </a-spin>
      </div>
    </div>

    <!-- 指标表单弹窗 -->
    <MetricForm
      v-model:visible="formVisible"
      :edit-data="editTarget"
      @saved="handleSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Message } from '@arco-design/web-vue'
import { useMetricStore } from '@/stores/metric'
import type { MetricDetail, MetricStatus } from '@/types/metric'
import { statusLabelMap } from '@/mock/metric'
import MetricCard from '@/components/MetricCard.vue'
import MetricForm from '@/components/MetricForm.vue'

const metricStore = useMetricStore()

const statusColorMap: Record<MetricStatus, string> = {
  draft: 'gray',
  pending: 'orange',
  published: 'green',
  offline: 'red'
}

const searchText = ref('')
const statusFilter = ref<MetricStatus | ''>('')
const selectedId = ref<string>('')
const formVisible = ref(false)
const editTarget = ref<MetricDetail | null>(null)

const filteredList = computed(() => {
  let list = metricStore.list
  if (statusFilter.value) {
    list = list.filter(m => m.status === statusFilter.value)
  }
  const kw = searchText.value.trim().toLowerCase()
  if (!kw) return list
  return list.filter(
    m =>
      m.name.toLowerCase().includes(kw) ||
      m.code.toLowerCase().includes(kw) ||
      m.aliases.some(a => a.toLowerCase().includes(kw))
  )
})

onMounted(() => {
  metricStore.fetchList().then(() => {
    // 默认选中第一个
    if (metricStore.list.length > 0) {
      handleSelect(metricStore.list[0].id)
    }
  })
})

async function handleSelect(id: string) {
  selectedId.value = id
  await metricStore.fetchDetail(id)
}

function handleAdd() {
  editTarget.value = null
  formVisible.value = true
}

function handleEdit(detail: MetricDetail) {
  editTarget.value = detail
  formVisible.value = true
}

const statusActionText: Record<MetricStatus, string> = {
  draft: '已回退至草稿',
  pending: '已提交审批',
  published: '审批通过，指标已发布',
  offline: '指标已下线'
}

async function handleStatusChange(id: string, status: MetricStatus) {
  const res = await metricStore.changeStatus(id, status)
  if (res.success) {
    Message.success(statusActionText[status])
  }
}

async function handleDelete(id: string) {
  const res = await metricStore.remove(id)
  if (res.success) {
    Message.success('删除成功')
    if (selectedId.value === id) {
      selectedId.value = ''
      metricStore.currentDetail = null
      // 自动选中下一个
      if (metricStore.list.length > 0) {
        handleSelect(metricStore.list[0].id)
      }
    }
  }
}

function handleSaved() {
  // 如果当前有选中指标，刷新详情
  if (selectedId.value) {
    metricStore.fetchDetail(selectedId.value)
  }
}
</script>

<style scoped lang="scss">
.manage-view {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.manage-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg-light);

  .page-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--color-text);
  }

  .header-actions {
    display: flex;
    gap: 10px;
    align-items: center;
  }
}

.manage-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* ---- 左侧列表 ---- */
.metric-list-panel {
  width: 320px;
  flex-shrink: 0;
  border-right: 1px solid var(--color-border);
  overflow-y: auto;
  background: var(--color-bg-light);
}

.metric-list-wrapper {
  padding: 8px;
}

.metric-list-item {
  padding: 12px 14px;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 4px;
  transition: background 0.2s;
  border: 1px solid transparent;

  &:hover {
    background: var(--color-bg);
  }

  &.active {
    background: #e8f3ff;
    border-color: rgba(22, 93, 255, 0.3);

    .item-name {
      color: var(--color-accent);
    }
  }

  .item-name {
    font-size: 14px;
    font-weight: 600;
    color: var(--color-text);
    display: flex;
    align-items: center;
    justify-content: space-between;

    .item-name-right {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .item-count {
      font-size: 12px;
      font-weight: normal;
      color: var(--color-text-secondary);
      background: #f2f3f5;
      padding: 1px 6px;
      border-radius: 3px;
    }
  }

  .item-code {
    font-size: 12px;
    color: var(--color-text-secondary);
    margin-top: 4px;
  }
}

/* ---- 右侧详情 ---- */
.metric-detail-panel {
  flex: 1;
  overflow-y: auto;
  background: var(--color-bg);
}
</style>
