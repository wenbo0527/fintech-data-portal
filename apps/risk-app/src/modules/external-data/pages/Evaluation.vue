<template>
  <div class="external-data-evaluation">
    <a-page-header title="外数评估中心" />
    <a-card :bordered="true" class="toolbar">
      <a-form :model="filters" layout="inline">
        <a-form-item field="type" label="评估类型">
          <a-select v-model="filters.type" allow-clear style="width: 180px" placeholder="选择类型">
            <a-option value="quality">质量</a-option>
            <a-option value="performance">性能</a-option>
            <a-option value="cost_effectiveness">性价比</a-option>
            <a-option value="comprehensive">综合</a-option>
          </a-select>
        </a-form-item>
        <a-form-item field="status" label="状态">
          <a-select v-model="filters.status" allow-clear style="width: 180px" placeholder="选择状态">
            <a-option value="draft">草稿</a-option>
            <a-option value="in_progress">进行中</a-option>
            <a-option value="completed">已完成</a-option>
            <a-option value="archived">已归档</a-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-button type="primary" @click="applyFilter">查询</a-button>
          <a-button style="margin-left: 8px" @click="resetFilter">重置</a-button>
        </a-form-item>
      </a-form>
    </a-card>
    <a-card title="评估报告列表">
      <template #extra>
        <a-space>
          <a-button type="primary" size="small" @click="create">创建评估</a-button>
        </a-space>
      </template>
      <a-table :data="displayedEvaluations" row-key="id" :pagination="pagination" @page-change="onPageChange">
        <template #columns>
          <a-table-column title="标题" :width="240">
            <template #cell="{ record }">
              <a-link @click="goDetail(record)">{{ record.title }}</a-link>
            </template>
          </a-table-column>
          <a-table-column title="类型" :width="140">
            <template #cell="{ record }">{{ typeLabel(record.type) }}</template>
          </a-table-column>
          <a-table-column title="状态" :width="120">
            <template #cell="{ record }"><a-tag :status="statusTag(record.status)">{{ statusLabel(record.status) }}</a-tag></template>
          </a-table-column>
          <a-table-column title="评分" :width="120">
            <template #cell="{ record }">{{ record.score ?? '—' }}</template>
          </a-table-column>
          <a-table-column title="创建时间" :width="180">
            <template #cell="{ record }">{{ formatDate(record.createdAt) }}</template>
          </a-table-column>
          <a-table-column title="操作" :width="220" fixed="right">
            <template #cell="{ record }">
              <a-space>
                <a-button size="small" type="text" @click="publish(record)">发布</a-button>
                <a-button size="small" type="text" status="danger" @click="archive(record)">归档</a-button>
              </a-space>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed, onMounted } from 'vue'
import { Message } from '@arco-design/web-vue'
import { useExternalDataStore } from '@/modules/external-data/stores/external-data'
const store = useExternalDataStore()
import DateUtils from '@/utils/dateUtils'
import { useRouter } from 'vue-router'
const router = useRouter()

type EvaluationType = 'quality'|'performance'|'cost_effectiveness'|'comprehensive'

const filters = reactive<{ type?: EvaluationType; status?: string }>({})
const evaluations = ref<any[]>([])
const pagination = reactive({ total: 0, pageSize: 10, current: 1, showTotal: true })
const displayedEvaluations = computed(() => evaluations.value.filter(e => { if (filters.type && e.type !== filters.type) return false; if (filters.status && e.status !== filters.status) return false; return true }))
const typeLabel = (t?: string) => t === 'quality' ? '质量' : t === 'performance' ? '性能' : t === 'cost_effectiveness' ? '性价比' : t === 'comprehensive' ? '综合' : '—'
const statusLabel = (s?: string) => s === 'draft' ? '草稿' : s === 'in_progress' ? '进行中' : s === 'completed' ? '已完成' : s === 'archived' ? '已归档' : '—'
const statusTag = (s?: string) => s === 'completed' ? 'success' : s === 'in_progress' ? 'warning' : s === 'draft' ? 'default' : 'default'
const formatDate = (d?: string) => { try { return DateUtils.formatDateTime(d || '') } catch { return '—' } }

const applyFilter = () => { pagination.current = 1; Message.success('筛选已更新') }
const resetFilter = () => { filters.type = undefined; filters.status = undefined; pagination.current = 1 }
const onPageChange = (page: number) => { pagination.current = page }
// 一次性拉全量，类型/状态筛选在前端 computed 中完成
const load = async () => { try { await store.fetchEvaluationList({ page: 1, pageSize: 200 }); evaluations.value = store.evaluationList || []; pagination.total = evaluations.value.length } catch { Message.error('加载失败') } }
onMounted(load)

const goDetail = (record: any) => {
  const id = record?.id
  if (!id) { Message.warning('无效的评估ID'); return }
  router.push(`/variable-hub/external-data/evaluation/${encodeURIComponent(String(id))}`)
}
const publish = async (record: any) => {
  const id = record?.id
  if (!id) { Message.warning('无效的评估ID'); return }
  const ok = await store.publishEvaluation(String(id))
  if (ok) { Message.success('已发布评估'); await load() } else { Message.error('发布失败') }
}
const archive = async (record: any) => {
  const id = record?.id
  if (!id) { Message.warning('无效的评估ID'); return }
  const ok = await store.archiveEvaluation(String(id))
  if (ok) { Message.success('已归档评估'); await load() } else { Message.error('归档失败') }
}
const create = async () => {
  const payload = { title: `评估-${Date.now()}`, type: filters.type || 'comprehensive', status: 'draft', score: 0 }
  const ok = await store.createEvaluation(payload)
  if (ok) { 
    Message.success('已创建评估'); 
    await load()
    // 创建成功后跳转到详情页
    const newItem = store.evaluationList[0]
    if (newItem?.id) {
      router.push(`/variable-hub/external-data/evaluation/${encodeURIComponent(String(newItem.id))}`)
    }
  } else { 
    Message.error('创建失败') 
  }
}
</script>

<style scoped>
.toolbar { margin-bottom: 12px; }
</style>
