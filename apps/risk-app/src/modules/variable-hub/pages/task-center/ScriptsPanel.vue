<!--
  任务管理 · Python 脚本管理面板
  - 统一维护评估口径脚本：新建、编辑、版本历史、回滚、对比、归档
  - 与常态性评估任务联动：展示脚本被哪些任务引用
-->
<template>
  <div class="script-manage-panel">
    <div class="panel-toolbar">
      <span class="panel-tip">集中维护评估口径的 Python 脚本，支持版本记录、回滚与差异对比。</span>
      <a-button type="primary" @click="openCreate">
        <template #icon><icon-plus /></template>
        新建脚本
      </a-button>
    </div>

    <DmtStatGroup :items="statItems" />

    <a-card :bordered="false" class="filter-card">
      <a-space wrap size="large">
        <a-input v-model="filters.keyword" allow-clear placeholder="搜索脚本名称 / 路径 / 说明" style="width: 280px">
          <template #prefix><icon-search /></template>
        </a-input>
        <a-select v-model="filters.scenario" allow-clear placeholder="脚本类型" :options="scenarioOpts" style="width: 180px" />
        <a-select v-model="filters.tag" allow-clear placeholder="标签" :options="tagOptions" style="width: 160px" />
        <a-select v-model="filters.status" allow-clear placeholder="状态" :options="statusOptions" style="width: 140px" />
        <a-button @click="resetFilters">重置</a-button>
      </a-space>
    </a-card>

    <a-card :bordered="false" class="table-card">
      <a-table :columns="columns" :data="filteredScripts" :pagination="pagination" row-key="id" :scroll="{ x: 1240 }">
        <template #nameCell="{ record }">
          <a-space direction="vertical" size="mini">
            <a-link @click="goDetail(record.id)">
              <icon-code /> {{ record.name }}
            </a-link>
            <span class="script-path">{{ record.path }}</span>
          </a-space>
        </template>
        <template #typeCell="{ record }">
          <a-tag :color="scenarioColor(record.scenario)">{{ scenarioLabel(record.scenario) }}</a-tag>
        </template>
        <template #versionCell="{ record }">
          <a-space size="mini">
            <a-tag color="arcoblue" size="small">v{{ record.currentVersion }}</a-tag>
            <a-link class="version-link" @click="openVersion(record.id)">共 {{ record.versions.length }} 个版本</a-link>
          </a-space>
        </template>
        <template #tagCell="{ record }">
          <a-space wrap size="mini">
            <a-tag v-for="t in record.tags || []" :key="t" size="small">{{ t }}</a-tag>
            <span v-if="!record.tags?.length" class="muted">—</span>
          </a-space>
        </template>
        <template #refCell="{ record }">
          <a-tooltip :content="refTooltip(record.id)">
            <span :class="{ muted: refCount(record.id) === 0 }">{{ refCount(record.id) }} 个任务</span>
          </a-tooltip>
        </template>
        <template #updatedCell="{ record }">
          <a-space direction="vertical" size="mini">
            <span>{{ formatDate(record.updatedAt) }}</span>
            <span class="muted">{{ record.updatedBy }}</span>
          </a-space>
        </template>
        <template #statusCell="{ record }">
          <a-tag :color="record.status === 'archived' ? 'gray' : 'green'">
            {{ record.status === 'archived' ? '已归档' : '启用中' }}
          </a-tag>
        </template>
        <template #actionsCell="{ record }">
          <a-space>
            <a-button type="text" size="small" @click="goDetail(record.id)">查看</a-button>
            <a-button type="text" size="small" @click="openEdit(record)">编辑</a-button>
            <a-button type="text" size="small" @click="openVersion(record.id)">版本</a-button>
            <a-dropdown @select="(v: any) => handleMore(v as string, record)">
              <a-button type="text" size="small">
                更多<icon-down />
              </a-button>
              <template #content>
                <a-doption v-if="record.status !== 'archived'" value="archive">
                  <template #icon><icon-mute /></template>
                  归档
                </a-doption>
                <a-doption v-else value="activate">
                  <template #icon><icon-play-arrow /></template>
                  启用
                </a-doption>
                <a-doption value="copy">
                  <template #icon><icon-copy /></template>
                  复制为新脚本
                </a-doption>
                <a-doption value="delete" :disabled="refCount(record.id) > 0 || isBuiltin(record.id)">
                  <template #icon><icon-delete /></template>
                  删除{{ isBuiltin(record.id) ? '（内置不可删）' : '' }}
                </a-doption>
              </template>
            </a-dropdown>
          </a-space>
        </template>
      </a-table>
    </a-card>

    <!-- 新建 / 编辑脚本 -->
    <ScriptFormDrawer ref="formDrawerRef" :script="currentScript" @success="reload" />

    <!-- 版本历史与对比 -->
    <ScriptVersionDrawer ref="versionDrawerRef" :script-id="versionScriptId" @updated="reload" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Message, Modal } from '@arco-design/web-vue'
import DmtStatGroup from '@/modules/variable-hub/components/StatGroup.vue'
import ScriptFormDrawer from '@/modules/variable-hub/components/evaluation/ScriptFormDrawer.vue'
import ScriptVersionDrawer from '@/modules/variable-hub/components/evaluation/ScriptVersionDrawer.vue'
import {
  EvaluationTaskStore,
  scenarioColor,
  scenarioLabel,
  scenarioOptions,
  type PythonScriptConfig
} from '@/modules/variable-hub/mock/evaluation/evaluation-task-store'

const router = useRouter()

const scripts = ref<PythonScriptConfig[]>([])
const taskCountMap = ref<Record<string, number>>({})

const filters = reactive({ keyword: '', scenario: '', tag: '', status: '' })
const pagination = reactive({ pageSize: 10, showTotal: true, size: 'small' as const })

const formDrawerRef = ref()
const versionDrawerRef = ref()
const currentScript = ref<PythonScriptConfig>()
const versionScriptId = ref('')

/** 脚本类型 = 适用评估场景，字典与文案统一取 store，面板不自行拼 */
const scenarioOpts = scenarioOptions().map((s) => ({ label: s.label, value: s.value }))
const statusOptions = [
  { label: '启用中', value: 'active' },
  { label: '已归档', value: 'archived' }
]

const tagOptions = computed(() => {
  const set = new Set<string>()
  scripts.value.forEach((s) => (s.tags || []).forEach((t) => set.add(t)))
  return [...set].map((label) => ({ label, value: label }))
})

const filteredScripts = computed(() => {
  const kw = filters.keyword.trim().toLowerCase()
  return scripts.value.filter((s) => {
    if (kw) {
      const hay = `${s.id} ${s.name} ${s.path} ${s.description || ''}`.toLowerCase()
      if (!hay.includes(kw)) {
        return false
      }
    }
    if (filters.scenario && (s.scenario || 'general') !== filters.scenario) {
      return false
    }
    if (filters.tag && !(s.tags || []).includes(filters.tag)) {
      return false
    }
    if (filters.status && (s.status || 'active') !== filters.status) {
      return false
    }
    return true
  })
})

const statItems = computed(() => {
  const all = scripts.value
  const versionTotal = all.reduce((sum, s) => sum + s.versions.length, 0)
  return [
    { title: '脚本总数', value: all.length, iconText: 'PY', iconBg: '#e8f3ff', iconColor: '#165dff' },
    { title: '启用中', value: all.filter((s) => s.status !== 'archived').length, iconText: '效', iconBg: '#e8ffea', iconColor: '#00b42a' },
    { title: '版本记录', value: versionTotal, iconText: '版', iconBg: '#fff7e8', iconColor: '#ff7d00' },
    { title: '已归档', value: all.filter((s) => s.status === 'archived').length, iconText: '档', iconBg: '#f2f3f5', iconColor: '#86909c' }
  ]
})

const columns = [
  { title: '脚本编号', dataIndex: 'id', width: 140 },
  { title: '脚本名称', slotName: 'nameCell', width: 240 },
  { title: '脚本类型', slotName: 'typeCell', width: 130 },
  { title: '当前版本', slotName: 'versionCell', width: 150 },
  { title: '标签', slotName: 'tagCell', width: 180 },
  { title: '被引用', slotName: 'refCell', width: 100 },
  { title: '最近更新', slotName: 'updatedCell', width: 140 },
  { title: '状态', slotName: 'statusCell', width: 100 },
  { title: '操作', slotName: 'actionsCell', width: 210, fixed: 'right' }
]

function reload() {
  scripts.value = EvaluationTaskStore.listPythonScripts()
  const map: Record<string, number> = {}
  scripts.value.forEach((s) => {
    map[s.id] = EvaluationTaskStore.listTasksByScript(s.id).length
  })
  taskCountMap.value = map
}

const refCount = (id: string) => taskCountMap.value[id] || 0

const isBuiltin = (id: string) => EvaluationTaskStore.isBuiltinScript(id)

const refTooltip = (id: string) => {
  const tasks = EvaluationTaskStore.listTasksByScript(id)
  if (!tasks.length) {
    return '暂无评估任务引用该脚本'
  }
  return `被引用：${tasks.map((t) => t.name).join('、')}`
}

const formatDate = (val?: string) => (val ? val.slice(0, 16) : '—')

const resetFilters = () => {
  filters.keyword = ''
  filters.scenario = ''
  filters.tag = ''
  filters.status = ''
}

const openCreate = () => {
  currentScript.value = undefined
  formDrawerRef.value?.open()
}

const openEdit = (script: PythonScriptConfig) => {
  currentScript.value = script
  formDrawerRef.value?.open()
}

const openVersion = (id: string) => {
  versionScriptId.value = id
  versionDrawerRef.value?.open()
}

const goDetail = (id: string) => {
  router.push(`/tasks/scripts/${id}`)
}

const handleArchive = (script: PythonScriptConfig) => {
  Modal.confirm({
    title: `归档脚本「${script.name}」？`,
    content: '归档后脚本不会再被新的评估任务选用，已有任务的历史报告不受影响。',
    okText: '确认归档',
    cancelText: '取消',
    onOk: () => {
      EvaluationTaskStore.setScriptStatus(script.id, 'archived')
      Message.success('已归档')
      reload()
    }
  })
}

const handleActivate = (script: PythonScriptConfig) => {
  EvaluationTaskStore.setScriptStatus(script.id, 'active')
  Message.success('已启用')
  reload()
}

const handleCopy = (script: PythonScriptConfig) => {
  currentScript.value = undefined
  // 预填内容但走新建流程，保存后生成独立脚本的 v1
  formDrawerRef.value?.open()
  setTimeout(() => {
    formDrawerRef.value?.prefill?.({
      name: `${script.name} - 副本`,
      path: script.path,
      type: script.type,
      scenario: script.scenario,
      description: script.description || '',
      dependencies: [...(script.dependencies || [])],
      tags: [...(script.tags || [])],
      content: script.content,
      changeLog: `复制自 ${script.name} v${script.currentVersion}`
    })
  }, 0)
}

const handleDelete = (script: PythonScriptConfig) => {
  if (isBuiltin(script.id)) {
    Message.warning('内置脚本不可删除，如需停用请使用「归档」')
    return
  }
  if (refCount(script.id) > 0) {
    Message.warning('该脚本仍被评估任务引用，请先在任务中解除引用')
    return
  }
  Modal.confirm({
    title: `删除脚本「${script.name}」？`,
    content: '将删除该脚本及其全部版本记录，操作不可恢复。',
    okText: '确认删除',
    okButtonProps: { status: 'danger' },
    cancelText: '取消',
    onOk: () => {
      EvaluationTaskStore.deletePythonScript(script.id)
      Message.success('已删除')
      reload()
    }
  })
}

const handleMore = (key: string, record: PythonScriptConfig) => {
  if (key === 'archive') {
    return handleArchive(record)
  }
  if (key === 'activate') {
    return handleActivate(record)
  }
  if (key === 'copy') {
    return handleCopy(record)
  }
  if (key === 'delete') {
    return handleDelete(record)
  }
}

onMounted(reload)
</script>

<style scoped lang="less">
.panel-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.panel-tip {
  font-size: 12px;
  color: var(--color-text-3);
}

.filter-card,
.table-card {
  margin-bottom: 16px;
  border-radius: 8px;
}

.script-path {
  color: var(--color-text-3);
  font-size: 12px;
  font-family: 'Monaco', 'Menlo', monospace;
}

.version-link {
  font-size: 12px;
}

.muted {
  color: var(--color-text-4);
}
</style>
