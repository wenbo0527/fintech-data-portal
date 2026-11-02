<!--
  Python 脚本详情页
  - 展示脚本元信息、当前生效版本代码（可编辑，保存生成新版本）
  - 版本记录概览 + 完整版本历史/回滚/对比（抽屉）
  - 引用该脚本的评估任务
  - 输入输出契约声明：requires / provides 与「能补齐哪些任务类型的必产字段」
-->
<template>
  <div class="script-detail-page">
    <DmtPageHeader :title="script?.name || '脚本详情'" show-back @back="goBack">
      <template #subtitle>
        <a-space size="mini">
          <a-tag v-if="script" color="arcoblue">当前 v{{ script.currentVersion }}</a-tag>
          <a-tag v-if="script" :color="script.status === 'archived' ? 'gray' : 'green'">
            {{ script.status === 'archived' ? '已归档' : '启用中' }}
          </a-tag>
          <span v-if="script" class="path-text">{{ script.path }}</span>
        </a-space>
      </template>
      <template #extra>
        <a-space v-if="script">
          <a-button @click="openVersionDrawer">
            <template #icon><icon-history /></template>
            版本历史
          </a-button>
          <a-button @click="handleToggleStatus">
            <template #icon><icon-mute v-if="script.status !== 'archived'" /><icon-play-arrow v-else /></template>
            {{ script.status === 'archived' ? '启用' : '归档' }}
          </a-button>
          <a-button type="primary" @click="openEditMeta">
            <template #icon><icon-edit /></template>
            编辑信息
          </a-button>
        </a-space>
      </template>
    </DmtPageHeader>

    <a-empty v-if="!script" description="脚本不存在或已被删除">
      <a-button type="primary" @click="goBack">返回脚本管理</a-button>
    </a-empty>

    <a-row v-else :gutter="16">
      <a-col :xs="24" :lg="16" :xl="17">
        <!-- 基本信息 -->
        <a-card title="基本信息" :bordered="false" class="detail-card">
          <a-descriptions :data="baseInfo" :column="2" size="medium" layout="inline-horizontal" />
        </a-card>

        <!-- 输入输出契约：声明完才能被任务契约校验引用 -->
        <a-card :bordered="false" class="detail-card">
          <template #title>输入输出契约</template>
          <template #extra>
            <a-link @click="openEditMeta">维护声明</a-link>
          </template>

          <a-alert v-if="!requiresItems.length && !providesItems.length" type="warning" class="contract-tip">
            该脚本还没有声明契约字段。引用它的评估任务在保存校验时无法确认必产字段是否被覆盖，
            列表会给出「契约不符」提示；请点右上角维护声明。
          </a-alert>

          <a-row :gutter="16">
            <a-col :span="12">
              <div class="contract-block-title">需要的输入字段（{{ requiresItems.length }}）</div>
              <a-space v-if="requiresItems.length" wrap size="mini">
                <a-tooltip v-for="item in requiresItems" :key="item.key" :content="item.meta">
                  <a-tag :color="item.known ? 'arcoblue' : 'red'">{{ item.label }}</a-tag>
                </a-tooltip>
              </a-space>
              <span v-else class="muted">未声明</span>
            </a-col>
            <a-col :span="12">
              <div class="contract-block-title">能产出的字段（{{ providesItems.length }}）</div>
              <a-space v-if="providesItems.length" wrap size="mini">
                <a-tooltip v-for="item in providesItems" :key="item.key" :content="item.meta">
                  <a-tag :color="item.known ? 'green' : 'red'">{{ item.label }}</a-tag>
                </a-tooltip>
              </a-space>
              <span v-else class="muted">未声明</span>
            </a-col>
          </a-row>

          <template v-if="coveredKinds.length">
            <a-divider style="margin: 12px 0" />
            <div class="contract-block-title">可补齐的任务口径必产字段</div>
            <div class="cover-list">
              <div v-for="cover in coveredKinds" :key="cover.kind" class="cover-item">
                <a-tag size="small" :color="cover.full ? 'green' : 'orange'">{{ cover.kindLabel }}</a-tag>
                <span class="cover-meta">
                  {{ cover.hitLabels.join(' / ') }}
                  <span v-if="!cover.full" class="cover-missing">（还缺 {{ cover.missedLabels.length }} 项：{{ cover.missedLabels.join(' / ') }}）</span>
                </span>
              </div>
            </div>
            <span class="hint cover-hint">
              只统计契约里标注「必产 + 由脚本产出」的字段；报告由平台产出，不归脚本负责。
            </span>
          </template>
        </a-card>

        <!-- 脚本内容 -->
        <a-card :bordered="false" class="detail-card">
          <template #title>
            <a-space>
              <span>脚本内容</span>
              <a-tag size="small" color="arcoblue">v{{ script.currentVersion }}</a-tag>
            </a-space>
          </template>
          <template #extra>
            <span class="hint">修改代码并保存将自动生成新版本</span>
          </template>
          <PythonScriptEditor :script="script" @save="handleContentSave" />
        </a-card>

        <!-- 引用任务 -->
        <a-card :bordered="false" class="detail-card">
          <template #title>引用的评估任务（{{ refTasks.length }}）</template>
          <a-table
            v-if="refTasks.length"
            :columns="taskColumns"
            :data="refTasks"
            :pagination="false"
            row-key="id"
            size="small"
          >
            <template #taskName="{ record }">
              <a-link @click="goTask(record.id)">{{ record.name }}</a-link>
            </template>
            <template #taskType="{ record }">
              <a-tag size="small" :color="record.taskType === 'routine' ? 'orangered' : 'arcoblue'">
                {{ record.taskType === 'routine' ? '常态性评估' : '一次性评估' }}
              </a-tag>
            </template>
            <template #useVersion="{ record }">
              <a-space size="mini">
                <a-tag size="small">{{ refVersion(record) }}</a-tag>
                <a-tag v-if="refVersion(record) !== `v${script?.currentVersion}`" size="small" color="orange">非最新</a-tag>
              </a-space>
            </template>
          </a-table>
          <a-empty v-else description="暂无评估任务引用该脚本" />
        </a-card>
      </a-col>

      <a-col :xs="24" :lg="8" :xl="7">
        <!-- 版本记录概览 -->
        <a-card :bordered="false" class="detail-card">
          <template #title>版本记录</template>
          <template #extra>
            <a-link @click="openVersionDrawer">全部 {{ script.versions.length }} 条</a-link>
          </template>
          <a-timeline class="version-brief">
            <a-timeline-item
              v-for="ver in recentVersions"
              :key="ver.version"
              :dot-color="ver.version === script.currentVersion ? 'rgb(var(--primary-6))' : 'var(--color-fill-3)'"
            >
              <div class="version-brief-item">
                <div class="vb-head">
                  <span class="vb-no">v{{ ver.version }}</span>
                  <a-tag v-if="ver.version === script.currentVersion" color="arcoblue" size="small">生效中</a-tag>
                </div>
                <div class="vb-log">{{ ver.changeLog }}</div>
                <div class="vb-meta">{{ ver.createdBy }} · {{ formatDate(ver.createdAt) }}</div>
              </div>
            </a-timeline-item>
          </a-timeline>
        </a-card>

        <!-- 依赖与环境 -->
        <a-card title="依赖包" :bordered="false" class="detail-card">
          <a-space wrap>
            <a-tag v-for="dep in script.dependencies || []" :key="dep" color="arcoblue">{{ dep }}</a-tag>
            <span v-if="!script.dependencies?.length" class="muted">未声明依赖</span>
          </a-space>
          <a-divider style="margin: 12px 0" />
          <a-space direction="vertical" size="mini" class="env-list">
            <span>运行环境：Python 3.10</span>
            <span>执行方式：评估任务调度触发</span>
            <span>输出：统计指标 + 图表 PNG</span>
          </a-space>
        </a-card>
      </a-col>
    </a-row>

    <!-- 变更说明弹窗（保存代码时） -->
    <a-modal
      v-model:visible="saveModalVisible"
      title="保存为新版本"
      ok-text="确认保存"
      cancel-text="取消"
      @ok="confirmSaveContent"
    >
      <a-form layout="vertical" :model="saveForm">
        <a-form-item label="版本变更说明" required>
          <a-input v-model="saveForm.changeLog" placeholder="本次修改做了什么，如：新增 PSI 稳定性指标" allow-clear />
        </a-form-item>
        <a-alert type="info">
          保存后将生成 <strong>v{{ (script?.currentVersion || 0) + 1 }}</strong> 作为当前生效版本，原版本保留在历史记录中。
        </a-alert>
      </a-form>
    </a-modal>

    <ScriptFormDrawer ref="formDrawerRef" :script="script" @success="reload" />
    <ScriptVersionDrawer ref="versionDrawerRef" :script-id="scriptId" @updated="reload" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Message, Modal } from '@arco-design/web-vue'
import DmtPageHeader from '@/modules/variable-hub/components/PageHeader.vue'
import PythonScriptEditor from '@/modules/variable-hub/components/evaluation/PythonScriptEditor.vue'
import ScriptFormDrawer from '@/modules/variable-hub/components/evaluation/ScriptFormDrawer.vue'
import ScriptVersionDrawer from '@/modules/variable-hub/components/evaluation/ScriptVersionDrawer.vue'
import {
  EvaluationTaskStore,
  type EvaluationTaskMock,
  type PythonScriptConfig
} from '@/modules/variable-hub/mock/evaluation/evaluation-task-store'
import {
  CONTRACT_FIELDS,
  KIND_CONTRACTS,
  fieldLabel,
  fieldSourceText
} from '@/modules/variable-hub/mock/task-center/io-contract'
import { kindOf } from '@/modules/variable-hub/mock/task-center/task-kinds'

const route = useRoute()
const router = useRouter()

const script = ref<PythonScriptConfig>()
const refTasks = ref<EvaluationTaskMock[]>([])

const formDrawerRef = ref()
const versionDrawerRef = ref()

const saveModalVisible = ref(false)
const saveForm = reactive({ content: '', changeLog: '' })

const scriptId = computed(() => (route.params.id as string) || '')

const baseInfo = computed(() => {
  const s = script.value
  if (!s) {
    return []
  }
  return [
    { label: '脚本编号', value: s.id },
    { label: '脚本类型', value: typeLabel(s.type) },
    { label: '脚本说明', value: s.description || '—' },
    { label: '标签', value: s.tags?.length ? s.tags.join('、') : '—' },
    { label: '创建人', value: s.createdBy || '—' },
    { label: '创建时间', value: formatDate(s.createdAt) },
    { label: '最近更新', value: `${formatDate(s.updatedAt)} · ${s.updatedBy}` },
    { label: '版本数', value: `${s.versions.length} 个（当前 v${s.currentVersion}）` }
  ]
})

const recentVersions = computed(() => (script.value?.versions || []).slice(0, 3))

/** 声明字段 → 展示项；字典查不到的 key 标红，避免错字静默失效 */
function declareItems(keys?: string[]) {
  return (keys || []).map((key) => ({
    key,
    label: fieldLabel(key),
    meta: fieldSourceText(key),
    known: !!CONTRACT_FIELDS[key]
  }))
}

const requiresItems = computed(() => declareItems(script.value?.requires))
const providesItems = computed(() => declareItems(script.value?.provides))

/**
 * 该脚本能补齐哪些任务类型的必产字段：
 * 只比对 source=script_output 的 required 项（报告由平台产出，不能拿来要求脚本）
 */
const coveredKinds = computed(() => {
  const provided = new Set(script.value?.provides || [])
  if (!provided.size) {
    return []
  }
  return Object.values(KIND_CONTRACTS)
    .map((contract) => {
      const need = contract.output.filter(
        (ref) => ref.required && CONTRACT_FIELDS[ref.key]?.source === 'script_output'
      )
      const hit = need.filter((ref) => provided.has(ref.key))
      const missed = need.filter((ref) => !provided.has(ref.key))
      return {
        kind: contract.kind,
        kindLabel: kindOf(contract.kind).label,
        full: need.length > 0 && missed.length === 0,
        hitLabels: hit.map((ref) => fieldLabel(ref.key)),
        missedLabels: missed.map((ref) => fieldLabel(ref.key))
      }
    })
    .filter((item) => item.hitLabels.length > 0)
})

const taskColumns = [
  { title: '任务名称', slotName: 'taskName', width: 240 },
  { title: '类型', slotName: 'taskType', width: 130 },
  { title: '引用版本', slotName: 'useVersion', width: 140 },
  { title: '最近更新', dataIndex: 'updatedAt', width: 160 }
]

const typeLabel = (type: string) =>
  type === 'processor' ? '数据处理' : type === 'visualizer' ? '图表生成' : '综合'

const formatDate = (val?: string) => (val ? val.slice(0, 16) : '—')

const refVersion = (task: EvaluationTaskMock) => {
  const ref = (task.pythonScripts || []).find((r) => r.id === scriptId.value)
  return ref?.currentVersion ? `v${ref.currentVersion}` : '未标记'
}

function reload() {
  script.value = EvaluationTaskStore.getPythonScriptById(scriptId.value)
  refTasks.value = EvaluationTaskStore.listTasksByScript(scriptId.value)
}

const goBack = () => router.push('/tasks?tab=scripts')
const goTask = (id: string) => router.push(`/tasks?tab=tasks&taskId=${id}`)

const openEditMeta = () => formDrawerRef.value?.open()
const openVersionDrawer = () => versionDrawerRef.value?.open()

const handleContentSave = (content: string) => {
  if (script.value && content === script.value.content) {
    Message.info('代码未发生变化')
    return
  }
  saveForm.content = content
  saveForm.changeLog = ''
  saveModalVisible.value = true
}

const confirmSaveContent = () => {
  if (!saveForm.changeLog.trim()) {
    Message.warning('请填写版本变更说明')
    return false
  }
  if (!script.value) {
    return false
  }
  const saved = EvaluationTaskStore.savePythonScript({
    id: script.value.id,
    name: script.value.name,
    path: script.value.path,
    content: saveForm.content,
    type: script.value.type,
    dependencies: script.value.dependencies,
    description: script.value.description,
    tags: script.value.tags,
    changeLog: saveForm.changeLog.trim()
  })
  saveModalVisible.value = false
  Message.success(`已保存，生成新版本 v${saved.currentVersion}`)
  reload()
  return true
}

const handleToggleStatus = () => {
  if (!script.value) {
    return
  }
  const target = script.value.status === 'archived' ? 'active' : 'archived'
  const doIt = () => {
    EvaluationTaskStore.setScriptStatus(script.value!.id, target)
    Message.success(target === 'archived' ? '已归档' : '已启用')
    reload()
  }
  if (target === 'archived') {
    Modal.confirm({
      title: `归档脚本「${script.value.name}」？`,
      content: '归档后不会再被新的评估任务选用，已有任务的历史报告不受影响。',
      okText: '确认归档',
      cancelText: '取消',
      onOk: doIt
    })
  } else {
    doIt()
  }
}

onMounted(reload)
</script>

<style scoped lang="less">
.script-detail-page {
  padding: 16px;
}

.detail-card {
  margin-bottom: 16px;
  border-radius: 8px;
}

.path-text {
  color: var(--color-text-3);
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 12px;
}

.hint {
  color: var(--color-text-3);
  font-size: 12px;
}

.contract-tip {
  margin-bottom: 12px;
}

.contract-block-title {
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-2);
}

.cover-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.cover-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  color: var(--color-text-2);
}

.cover-meta {
  flex: 1;
}

.cover-missing {
  color: var(--color-text-3);
}

.cover-hint {
  display: block;
  margin-top: 8px;
}

.muted {
  color: var(--color-text-4);
}

.version-brief {
  padding-left: 4px;
}

.version-brief-item {
  .vb-head {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .vb-no {
    font-weight: 600;
    color: var(--color-text-1);
  }

  .vb-log {
    margin-top: 4px;
    font-size: 13px;
    color: var(--color-text-2);
  }

  .vb-meta {
    margin-top: 4px;
    font-size: 12px;
    color: var(--color-text-3);
  }
}

.env-list {
  font-size: 13px;
  color: var(--color-text-2);
}
</style>
