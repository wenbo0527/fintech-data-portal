<template>
  <a-drawer v-model:visible="visible" :width="520" unmount-on-close>
    <template #title>
      <div class="drawer-header">
        <span>{{ title }}</span>
        <a-tag>{{ contextLabel }}</a-tag>
      </div>
    </template>

    <a-tabs v-model:active-key="activeKey">
      <a-tab-pane key="online" title="上线申请" v-if="contextType === 'variable'">
        <a-alert type="info" :show-icon="false">
          Demo：上线申请不走真实流程，重点演示“可发起陪跑 / 可运行评估 / 可回写证据链”的统一入口。
        </a-alert>
        <a-divider />
        <a-space direction="vertical" fill>
          <a-descriptions :column="1" bordered size="small">
            <a-descriptions-item label="当前对象">{{ contextName || contextId }}</a-descriptions-item>
            <a-descriptions-item label="申请类型">直接上线 / 探索采纳上线</a-descriptions-item>
            <a-descriptions-item label="准入校验">字段口径、数据源、质量阈值（Demo）</a-descriptions-item>
          </a-descriptions>
          <a-space>
            <a-button type="primary" @click="activeKey = 'accompany'">发起陪跑</a-button>
            <a-button @click="activeKey = 'evaluation'">运行评估</a-button>
          </a-space>
        </a-space>
      </a-tab-pane>

      <a-tab-pane key="accompany" title="陪跑服务">
        <a-space direction="vertical" fill>
          <a-alert type="info" :show-icon="false">
            Demo：统一唤起“陪跑计划”，用于上线联调、灰度发布、回归验证与审计留痕。
          </a-alert>
          <a-descriptions :column="1" bordered size="small">
            <a-descriptions-item label="关联对象">{{ contextName || contextId }}</a-descriptions-item>
            <a-descriptions-item label="建议动作">新建陪跑计划 / 关联已有计划</a-descriptions-item>
          </a-descriptions>
          <a-space>
            <a-button type="primary" @click="router.push('/accompany/create')">新建陪跑计划</a-button>
            <a-button @click="router.push('/accompany')">查看陪跑列表</a-button>
          </a-space>
        </a-space>
      </a-tab-pane>

      <a-tab-pane key="evaluation" title="评估">
        <a-space direction="vertical" fill>
          <a-alert type="info" :show-icon="false">
            Demo：评估结果可用于"实验回写"或"上线准入"，不同入口共享同一套能力（写入评估任务中心并回写特征档案）。
          </a-alert>
          <a-descriptions :column="2" bordered size="small">
            <a-descriptions-item label="KS">0.38</a-descriptions-item>
            <a-descriptions-item label="IV">0.45</a-descriptions-item>
            <a-descriptions-item label="PSI">0.06</a-descriptions-item>
            <a-descriptions-item label="覆盖率">81.2%</a-descriptions-item>
          </a-descriptions>
          <a-space wrap>
            <a-button type="primary" :loading="writeBackLoading" @click="handleWriteBack">写回记录（评估任务）</a-button>
            <a-button @click="handleViewTasks">查看任务中心</a-button>
            <a-button @click="activeKey = contextType === 'variable' ? 'online' : 'accompany'">返回</a-button>
          </a-space>
          <a-alert v-if="lastWriteBackResult" type="success" :show-icon="false">
            评估任务 {{ lastWriteBackResult.id }} 已执行：覆盖 {{ Math.round((lastWriteBackResult.metrics?.coverage || 0) * 100) }}%，通过率 {{ Math.round((lastWriteBackResult.metrics?.passRate || 0) * 100) }}%，已回写特征档案。
          </a-alert>
        </a-space>
      </a-tab-pane>
    </a-tabs>
  </a-drawer>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import EvaluationTaskStore, { type EvaluationTaskMock } from '@/modules/variable-hub/mock/evaluation/evaluation-task-store'
import { ExploreStore } from '@/modules/variable-hub/mock/explore/explore-store'

const props = defineProps<{
  modelValue: boolean
  contextType: 'variable' | 'topic'
  contextId: string
  contextName?: string
  defaultTab?: 'online' | 'accompany' | 'evaluation'
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
}>()

const router = useRouter()
const visible = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit('update:modelValue', val)
})

const activeKey = ref(props.defaultTab || (props.contextType === 'variable' ? 'online' : 'accompany'))

watch(
  () => props.defaultTab,
  (val) => {
    if (val) activeKey.value = val
  }
)

const title = computed(() => {
  if (props.contextType === 'variable') return '特征上线与治理'
  return '课题推进与治理'
})

const contextLabel = computed(() => (props.contextType === 'variable' ? '特征档案' : '探索课题'))

const writeBackLoading = ref(false)
const lastWriteBackResult = ref<EvaluationTaskMock | null>(null)

async function handleWriteBack() {
  writeBackLoading.value = true
  try {
    // 1) 在评估任务中心创建一个任务（pending）
    const targets = props.contextType === 'variable'
      ? [{ id: props.contextId, name: props.contextName || props.contextId, code: '', sourceType: 'external' as const, dataSourceName: '特征中心（Demo）' }]
      : [{ id: props.contextId, name: props.contextName || props.contextId, code: '', sourceType: 'internal' as const, dataSourceName: '特征中心（Demo）' }]
    const task = EvaluationTaskStore.addTask({
      name: `${props.contextName || props.contextId} 治理评估`,
      taskType: 'recheck',
      sourceType: 'variable_batch',
      sourceIds: [props.contextId],
      sourceNames: [props.contextName || props.contextId],
      description: `由治理抽屉发起（${props.contextType}）`,
      targets
    })
    // 2) pending → running → completed（中间态模拟）
    EvaluationTaskStore.startTask(task.id)
    await new Promise((r) => setTimeout(r, 1200))
    // 3) 跑完任务 → 自动回写 quality / missingRate 到特征档案
    const finished = EvaluationTaskStore.runTask(task.id)
    lastWriteBackResult.value = finished
    // 4) 记录审计（如果是特征，路由到该特征所属课题；如果是课题，直接记）
    if (props.contextType === 'topic') {
      ExploreStore.addAuditEvent({
        topicId: props.contextId,
        operator: 'Demo 用户',
        action: '评估',
        field: 'evaluation',
        beforeValue: '',
        afterValue: task.id,
        reason: `由治理抽屉发起评估：${task.name}`
      })
    }
    Message.success(`评估任务 ${task.id} 已完成，结果已回写特征档案`)
  } catch (e) {
    Message.error('写回失败')
  } finally {
    writeBackLoading.value = false
  }
}

function handleViewTasks() {
  router.push('/tasks')
}
</script>

<style scoped>
.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
</style>

