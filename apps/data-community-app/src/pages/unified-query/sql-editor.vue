<template>
  <PageContainer size="wide" :with-bg="false" class="uq-page">
    <PageHeader title="统一查询" sub-title="脚本目录 · SQL 编辑执行 · 快速创建任务调度">
      <template #extra>
        <a-button @click="router.push({ name: 'unified-query-tasks' })">
          <template #icon><icon-schedule /></template>
          任务调度
        </a-button>
      </template>
    </PageHeader>

    <div class="uq-body">
      <!-- ═══ 左侧:Tab 切换 脚本目录 / 数据库导航(F01 + F13) ═══ -->
      <div class="uq-sidebar">
        <a-tabs v-model:active-key="sidebarTab" size="mini" type="rounded" class="uq-sidebar__tabs">
          <!-- 脚本目录树(F13 / F14 / F19) -->
          <a-tab-pane key="scripts" title="脚本目录">
            <div class="uq-sidebar__header">
              <a-input-search
                v-model="keyword"
                size="small"
                placeholder="搜索脚本名称 / SQL"
                allow-clear
              />
              <a-button size="small" type="primary" @click="openCreateModal">
                <template #icon><icon-plus /></template>
                新建脚本
              </a-button>
            </div>
            <a-tree
              v-if="treeData.length"
              class="uq-tree"
              block-node
              default-expand-all
              :data="treeData"
              @select="onTreeSelect"
            >
              <template #title="node">
                <span class="uq-tree-node">
                  <icon-folder v-if="!node.raw" class="uq-tree-node__icon" />
                  <icon-file v-else class="uq-tree-node__icon" />
                  <span class="uq-tree-node__text">{{ node.title }}</span>
                  <DataSourceBadge v-if="node.raw" :datasource="node.raw.datasource" />
                </span>
              </template>
            </a-tree>
            <a-empty v-else description="没有匹配的脚本" />
          </a-tab-pane>

          <!-- 数据库导航树(F01) -->
          <a-tab-pane key="database" title="数据库导航">
            <a-tree
              class="uq-tree"
              block-node
              default-expand-all
              :data="dbTreeData"
              @select="onDbTreeSelect"
            >
              <template #title="node">
                <span class="uq-tree-node">
                  <icon-storage v-if="node.kind === 'datasource'" class="uq-tree-node__icon" />
                  <icon-folder v-else-if="node.kind === 'cluster' || node.kind === 'database'" class="uq-tree-node__icon" />
                  <icon-file v-else class="uq-tree-node__icon" />
                  <span class="uq-tree-node__text">{{ node.title }}</span>
                  <a-tag v-if="node.comment" size="mini" color="gray">{{ node.comment }}</a-tag>
                </span>
              </template>
            </a-tree>
          </a-tab-pane>
        </a-tabs>

        <!-- F01:选中表后展示字段元数据 -->
        <div v-if="selectedTable" class="uq-sidebar__meta">
          <div class="uq-sidebar__meta-title">
            <span>{{ selectedTable.tableName }}</span>
            <a-tag size="mini">{{ selectedTable.comment }}</a-tag>
          </div>
          <a-table
            :columns="metaColumns"
            :data="metaRows"
            :pagination="false"
            size="mini"
            :scroll="{ y: 180 }"
          />
          <a-button size="mini" type="text" long @click="insertTableSql">插入 SELECT 模板</a-button>
        </div>
      </div>

      <!-- ═══ 右:SQL 编辑执行(F02-F09 / F11) ═══ -->
      <div class="uq-main">
        <!-- Tab 区(F02) -->
        <a-tabs
          class="uq-tabs"
          type="rounded"
          size="small"
          :active-key="editor.activeKey"
          editable
          auto-switch
          @change="(k: string) => editor.setActive(k)"
          @delete="(k: string) => editor.closeTab(k)"
          @add="onCreateTab('doris')"
        >
          <a-tab-pane v-for="tab in editor.tabs" :key="tab.key">
            <template #title>
              <span class="uq-tab-title">
                <DataSourceBadge :datasource="tab.datasource" />
                {{ tab.title }}
                <span v-if="tab.dirty" class="uq-tab-dirty">•</span>
              </span>
            </template>
          </a-tab-pane>
        </a-tabs>

        <!-- 操作栏(F04 / F05 / F06 / F07 / F11 + 创建任务 + 共享 + 历史) -->
        <div class="uq-toolbar">
          <a-select
            v-model="datasource"
            size="small"
            class="uq-toolbar__ds"
            :disabled="running"
            @change="onDatasourceChange"
          >
            <a-option value="doris">Doris 数据源</a-option>
            <a-option value="hive">Hive 数据源</a-option>
          </a-select>
          <a-button type="primary" size="small" :loading="running" @click="runSql()">
            <template #icon><icon-play-arrow /></template>
            运行
          </a-button>
          <a-button size="small" :disabled="running || !selection" @click="runSql(selection)">
            <template #icon><icon-select-all /></template>
            运行选中段
          </a-button>
          <a-button status="danger" size="small" :disabled="!running" @click="abort">
            <template #icon><icon-pause /></template>
            终止
          </a-button>
          <a-button size="small" @click="openSaveModal">
            <template #icon><icon-save /></template>
            保存脚本
          </a-button>
          <a-button size="small" @click="format">
            <template #icon><icon-brackets /></template>
            格式化
          </a-button>
          <a-button
            v-if="canShare"
            size="small"
            status="warning"
            @click="openShareModal"
          >
            <template #icon><icon-share-internal /></template>
            共享
          </a-button>
          <a-button size="small" @click="historyVisible = true">
            <template #icon><icon-history /></template>
            历史记录
          </a-button>
          <a-button size="small" status="success" @click="openTaskModal">
            <template #icon><icon-schedule /></template>
            创建任务
          </a-button>
          <div class="uq-toolbar__spacer" />
          <StatusTag :status="status" />
          <span v-if="lastTip" class="uq-toolbar__tip">{{ lastTip }}</span>
        </div>

        <SqlEditor
          ref="editorRef"
          v-model="sql"
          :datasource="datasource"
          height="calc(40vh)"
          @change="editor.patch(activeKey, { dirty: true })"
          @run="runSql()"
          @selection-change="(t: string) => (selection = t)"
        />

        <!-- 结果 / 日志 -->
        <a-card class="uq-panel" :body-style="{ padding: '0' }">
          <a-tabs v-model:active-key="panel" size="small" class="uq-panel__tabs">
            <template #extra>
              <span class="uq-panel__meta">
                {{ datasource === 'doris' ? 'Doris · internal.ADM' : 'Hive · Inceptor' }}
              </span>
            </template>
            <a-tab-pane key="result" title="结果">
              <ResultTable :result="result" :loading="running" :status="status" :datasource="datasource" />
            </a-tab-pane>
            <a-tab-pane key="log" title="日志">
              <LogViewer :logs="logs" />
            </a-tab-pane>
          </a-tabs>
        </a-card>
      </div>
    </div>

    <!-- ═══ 保存脚本弹窗(F11) ═══ -->
    <a-modal
      v-model:visible="saveVisible"
      title="保存为脚本"
      ok-text="保存"
      cancel-text="取消"
      :ok-button-loading="saving"
      @ok="doSave"
    >
      <a-form :model="saveForm" layout="vertical">
        <a-form-item field="name" label="脚本名称" required>
          <a-input v-model="saveForm.name" placeholder="如:每日放款量统计" allow-clear />
        </a-form-item>
        <a-form-item field="folderKey" label="存放目录">
          <a-select v-model="saveForm.folderKey" placeholder="我的脚本根目录">
            <a-option :value="''">我的脚本 / 根目录</a-option>
            <a-option v-for="f in mineFolders" :key="f.key" :value="f.key">
              我的脚本 / {{ f.title }}
            </a-option>
          </a-select>
        </a-form-item>
        <a-form-item field="datasource" label="数据源">
          <a-radio-group v-model="saveForm.datasource">
            <a-radio value="doris">Doris (DR)</a-radio>
            <a-radio value="hive">Hive (HC)</a-radio>
          </a-radio-group>
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- ═══ 新建脚本弹窗(F16) ═══ -->
    <a-modal
      v-model:visible="createVisible"
      title="新建脚本"
      ok-text="创建"
      cancel-text="取消"
      @ok="doCreate"
    >
      <a-form :model="createForm" layout="vertical">
        <a-form-item field="name" label="脚本名称" required>
          <a-input v-model="createForm.name" placeholder="如:月度放款汇总" allow-clear />
        </a-form-item>
        <a-form-item field="folderKey" label="保存位置">
          <a-select v-model="createForm.folderKey">
            <a-option :value="''">我的脚本 / 根目录</a-option>
            <a-option v-for="f in mineFolders" :key="f.key" :value="f.key">
              我的脚本 / {{ f.title }}
            </a-option>
          </a-select>
        </a-form-item>
        <a-form-item field="datasource" label="数据源">
          <a-radio-group v-model="createForm.datasource">
            <a-radio value="doris">Doris (DR)</a-radio>
            <a-radio value="hive">Hive (HC)</a-radio>
          </a-radio-group>
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- ═══ 共享脚本弹窗(F18) ═══ -->
    <a-modal
      v-model:visible="shareVisible"
      title="共享脚本"
      ok-text="确认共享"
      cancel-text="取消"
      :ok-button-loading="sharing"
      @ok="doShare"
    >
      <a-form layout="vertical">
        <a-form-item label="脚本名称">
          <a-input :model-value="shareScriptName" disabled />
        </a-form-item>
        <a-form-item label="共享给" required>
          <a-select
            v-model="shareTargets"
            multiple
            placeholder="选择同事"
            :options="colleagues"
            :field-names="{ value: 'value', label: 'label' }"
          >
            <template #label="{ data }">
              <span>{{ data.label }}</span>
              <a-tag size="mini" color="gray">{{ data.dept }}</a-tag>
            </template>
          </a-select>
        </a-form-item>
        <a-form-item label="共享到目录">
          <a-select v-model="shareFolder">
            <a-option v-for="f in sharedFolders" :key="f.key" :value="f.key">
              共享脚本 / {{ f.title }}
            </a-option>
          </a-select>
        </a-form-item>
        <a-typography-text type="secondary" style="font-size: 12px">
          共享后脚本将从「我的脚本」复制到「共享脚本」,被共享人可查看和运行。
        </a-typography-text>
      </a-form>
    </a-modal>

    <!-- ═══ 历史记录弹窗(F21) ═══ -->
    <a-modal
      v-model:visible="historyVisible"
      title="执行历史记录"
      :footer="false"
      width="680px"
    >
      <a-table
        :columns="historyColumns"
        :data="queryHistory"
        :pagination="false"
        size="small"
        row-key="id"
      >
        <template #status="{ record }">
          <StatusTag :status="record.status" />
        </template>
        <template #datasource="{ record }">
          <DataSourceBadge :datasource="record.datasource" />
        </template>
      </a-table>
    </a-modal>

    <!-- ═══ 快速创建任务弹窗 ═══ -->
    <a-modal
      v-model:visible="taskVisible"
      title="创建定时任务"
      ok-text="创建"
      cancel-text="取消"
      :ok-button-loading="taskCreating"
      @ok="doCreateTask"
    >
      <a-form :model="taskForm" layout="vertical">
        <a-form-item field="name" label="任务名称" required>
          <a-input v-model="taskForm.name" placeholder="如:每日放款日报" allow-clear />
        </a-form-item>
        <a-form-item label="关联脚本">
          <a-input :model-value="taskForm.scriptName" disabled />
        </a-form-item>
        <a-form-item field="schedule" label="调度频率" required>
          <a-select v-model="taskForm.schedule" placeholder="选择调度频率">
            <a-option v-for="s in SCHEDULE_PRESETS" :key="s" :value="s">{{ s }}</a-option>
          </a-select>
        </a-form-item>
        <a-form-item label="数据源">
          <DataSourceBadge :datasource="taskForm.datasource" mode="full" />
        </a-form-item>
        <a-typography-text type="secondary" style="font-size: 12px">
          任务创建后默认为「已停用」状态,可在任务调度页启用。
        </a-typography-text>
      </a-form>
    </a-modal>
  </PageContainer>
</template>

<script setup lang="ts">
/**
 * 统一查询 · 合并页面(SQL 编辑执行 + 脚本管理 + 数据库导航 + 快速创建任务)
 *
 * 左侧 Tab 切换:脚本目录树(F13) / 数据库导航树(F01)。
 * 右侧:SQL 编辑器 + 结果/日志 + 工具栏(运行/保存/共享/历史/创建任务)。
 */
import { computed, onMounted, ref, shallowRef, watch } from 'vue'
import { Message } from '@arco-design/web-vue'
import { useRoute, useRouter } from 'vue-router'
import PageContainer from '@/components-dca/common/PageContainer.vue'
import PageHeader from '@/components-dca/common/PageHeader.vue'
import SqlEditor from '@/components-dca/unified-query/SqlEditor.vue'
import ResultTable from '@/components-dca/unified-query/ResultTable.vue'
import LogViewer from '@/components-dca/unified-query/LogViewer.vue'
import StatusTag from '@/components-dca/unified-query/StatusTag.vue'
import DataSourceBadge from '@/components-dca/unified-query/DataSourceBadge.vue'
import { useUqEditorStore } from '@/stores-dca/unified-query/editor'
import { useUqScriptStore } from '@/stores-dca/unified-query/script'
import { useUqTaskStore } from '@/stores-dca/unified-query/task'
import { checkSelectStar, createQueryJob, formatSQL, splitStatements } from '@/mock/unified-query/executor'
import { DATABASE_TREE, getTableColumns } from '@/mock/unified-query/database'
import { COLLEAGUES, SCHEDULE_PRESETS } from '@/mock/unified-query/tasks'
import type { QueryJob } from '@/mock/unified-query/executor'
import type { DataSourceKey, DbTreeNode, ExecStatus, LogEntry, QueryHistory, QueryResult, ScriptRecord, TableColumn } from '@/mock/unified-query/types'

const router = useRouter()
const route = useRoute()
const editor = useUqEditorStore()
const scriptStore = useUqScriptStore()
const taskStore = useUqTaskStore()

/* ── 编辑器执行状态 ────────────────────── */
const editorRef = shallowRef<InstanceType<typeof SqlEditor> | null>(null)
const status = ref<ExecStatus>('idle')
const result = ref<QueryResult | null>(null)
const logs = ref<LogEntry[]>([])
const panel = ref<'result' | 'log'>('result')
const selection = ref('')
const lastTip = ref('')
let job: QueryJob | null = null

const running = computed(() => status.value === 'running')
const activeKey = computed(() => editor.activeKey)
const sql = computed({
  get: () => editor.activeTab?.sql ?? '',
  set: v => editor.patch(activeKey.value, { sql: v })
})
const datasource = computed(() => editor.activeTab?.datasource ?? 'doris')
const mineFolders = computed(() => scriptStore.folders.filter(f => f.key.startsWith('mine/')))
const sharedFolders = computed(() => scriptStore.folders.filter(f => f.key.startsWith('shared/')))

/* ── 左侧 Tab 切换(F01 + F13) ── */
const sidebarTab = ref<'scripts' | 'database'>('scripts')

/* ── 脚本目录树 ────────────────────── */
const keyword = ref('')

onMounted(() => {
  editor.ensureTab()
  const kw = route.query.keyword
  if (typeof kw === 'string' && kw) keyword.value = kw
})

/** F14:关键字过滤树,命中脚本保留其所在目录 */
const treeData = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return scriptStore.tree
  const hit = (s: ScriptRecord) =>
    s.name.toLowerCase().includes(kw) || s.sql.toLowerCase().includes(kw)
  return scriptStore.tree
    .map(root => ({
      ...root,
      children: root.children
        .map(node => {
          if ('raw' in node) return hit(node.raw) ? node : null
          const kept = (node.children ?? []).filter(c => 'raw' in c && hit(c.raw))
          return kept.length ? { ...node, children: kept } : null
        })
        .filter(Boolean)
    }))
    .filter(root => root.children.length)
})

function onTreeSelect(keys: (string | number)[]) {
  if (!keys.length) return
  const key = String(keys[0])
  if (!key.startsWith('script:')) return
  const script = scriptStore.getById(key.slice(7))
  if (script) editor.openScript(script)
}

/* ── 数据库导航树(F01) ────────────────────── */
const dbTreeData = computed(() => DATABASE_TREE as unknown as any[])
const selectedTable = ref<{ tableName: string; comment: string } | null>(null)
const metaColumns = [
  { title: '字段名', dataIndex: 'name', width: 140 },
  { title: '类型', dataIndex: 'type', width: 120 },
  { title: '注释', dataIndex: 'comment' }
]
const metaRows = computed<TableColumn[]>(() =>
  selectedTable.value ? getTableColumns(selectedTable.value.tableName) : []
)

function onDbTreeSelect(keys: (string | number)[]) {
  if (!keys.length) return
  const key = String(keys[0])
  const node = findDbNode(DATABASE_TREE, key)
  if (node?.kind === 'table' && node.tableName) {
    selectedTable.value = { tableName: node.tableName, comment: node.comment ?? '' }
  } else {
    selectedTable.value = null
  }
}

function findDbNode(nodes: DbTreeNode[], key: string): DbTreeNode | null {
  for (const n of nodes) {
    if (n.key === key) return n
    if (n.children) {
      const hit = findDbNode(n.children, key)
      if (hit) return hit
    }
  }
  return null
}

/** F01:点击表后插入 SELECT 模板到编辑器 */
function insertTableSql() {
  if (!selectedTable.value) return
  const tn = selectedTable.value.tableName
  const tpl = `SELECT *\nFROM   ${tn}\nWHERE  dt = '2026-09-01'\nLIMIT  100;`
  editor.patch(activeKey.value, { sql: tpl, dirty: true })
  Message.success(`已插入 ${tn} 查询模板`)
}

/* ── Tab 切换后重置展示区(§7.1 状态一致性) ── */
watch(activeKey, () => {
  status.value = 'idle'
  result.value = null
  logs.value = []
  selection.value = ''
  lastTip.value = ''
})

function onCreateTab(value: string | number | Record<string, any> | undefined) {
  const ds = (value === 'hive' ? 'hive' : 'doris') as DataSourceKey
  const tab = editor.newTab()
  editor.patch(tab.key, { datasource: ds })
  selection.value = ''
}

function onDatasourceChange(v: string | number | Record<string, any> | (string | number | Record<string, any>)[]) {
  editor.patch(activeKey.value, { datasource: v as DataSourceKey })
}

function format() {
  if (!sql.value.trim()) return Message.warning('请先输入 SQL')
  editor.patch(activeKey.value, { sql: formatSQL(sql.value), dirty: true })
  Message.success('已格式化')
}

async function runSql(override?: string) {
  if (running.value) return
  const statements = splitStatements(sql.value)
  if (!statements.length) return Message.warning('请先输入 SQL')

  const target = (override || sql.value).trim()
  const partial = Boolean(override)
  if (!partial && statements.length > 1) {
    lastTip.value = `检测到 ${statements.length} 条语句,本次仅执行第一条`
  } else {
    lastTip.value = ''
  }

  // F12:SELECT * 规则检查(不阻断,仅警告)
  const starWarn = checkSelectStar(target)
  if (starWarn) Message.warning(starWarn)

  status.value = 'running'
  result.value = null
  logs.value = []
  panel.value = 'result'
  job = createQueryJob(target, datasource.value)
  const res = await job.run()
  job = null
  status.value = res.status
  result.value = res
  logs.value = res.logs
  panel.value = res.status === 'success' ? 'result' : 'log'

  // F21:记录执行历史
  queryHistory.value.unshift({
    id: `QH${Date.now()}`,
    scriptName: editor.activeTab?.scriptId
      ? scriptStore.getById(editor.activeTab.scriptId)?.name ?? null
      : null,
    sqlSnippet: target.slice(0, 80),
    datasource: datasource.value,
    status: res.status,
    runAt: new Date().toLocaleString('zh-CN'),
    duration: res.duration,
    rowCount: res.rowCount
  })
  if (queryHistory.value.length > 20) queryHistory.value.pop()

  if (res.status === 'success') {
    Message.success(`执行成功,返回 ${res.rowCount} 行 / 耗时 ${res.duration}`)
  } else if (res.status === 'aborted') {
    Message.warning('查询已终止')
  } else {
    Message.error('查询执行失败,已切换到日志')
  }
}

function abort() {
  job?.cancel()
}

/* ── 保存脚本(F11) ───────────────────── */
const saveVisible = ref(false)
const saving = ref(false)
const saveForm = ref<{ name: string; folderKey: string; datasource: DataSourceKey }>({
  name: '',
  folderKey: '',
  datasource: 'doris'
})

function openSaveModal() {
  if (!sql.value.trim()) return Message.warning('SQL 为空,无法保存')
  saveForm.value = {
    name: editor.activeTab?.scriptId
      ? scriptStore.getById(editor.activeTab.scriptId)?.name ?? ''
      : editor.activeTab?.title ?? '',
    folderKey: '',
    datasource: datasource.value
  }
  saveVisible.value = true
}

function doSave() {
  const name = saveForm.value.name.trim()
  if (!name) return Message.warning('请输入脚本名称')
  saving.value = true
  const { record, created } = scriptStore.saveAs({
    name,
    datasource: saveForm.value.datasource,
    sql: sql.value,
    scope: 'mine',
    folderKey: saveForm.value.folderKey || null
  })
  editor.patch(activeKey.value, { scriptId: record.id, title: name, dirty: false })
  saving.value = false
  saveVisible.value = false
  Message.success(created ? `脚本「${name}」已创建` : `脚本「${name}」已更新`)
}

/* ── 新建脚本(F16) ───────────────────── */
const createVisible = ref(false)
const createForm = ref<{ name: string; folderKey: string; datasource: DataSourceKey }>({
  name: '',
  folderKey: '',
  datasource: 'doris'
})

function openCreateModal() {
  createForm.value = { name: '', folderKey: '', datasource: 'doris' }
  createVisible.value = true
}

function doCreate() {
  const name = createForm.value.name.trim()
  if (!name) return Message.warning('请输入脚本名称')
  const record = scriptStore.add({
    name,
    datasource: createForm.value.datasource,
    sql: `-- ${name}\nSELECT *\nFROM   dwd_loan_daily\nWHERE  dt = '2026-09-01'\nLIMIT  100;`,
    scope: 'mine',
    folderKey: createForm.value.folderKey || null
  })
  createVisible.value = false
  editor.openScript(record)
  Message.success(`脚本「${name}」已创建`)
}

/* ── 共享脚本(F18) ───────────────────── */
const shareVisible = ref(false)
const sharing = ref(false)
const shareTargets = ref<string[]>([])
const shareFolder = ref('shared/daily')
const shareScriptId = ref<string | null>(null)
const colleagues = COLLEAGUES
const canShare = computed(() => {
  const tab = editor.activeTab
  return tab?.scriptId ? scriptStore.getById(tab.scriptId)?.scope === 'mine' : false
})
const shareScriptName = computed(() => {
  if (!shareScriptId.value) return ''
  return scriptStore.getById(shareScriptId.value)?.name ?? ''
})

function openShareModal() {
  const tab = editor.activeTab
  if (!tab?.scriptId) return Message.warning('请先保存脚本,再共享')
  const script = scriptStore.getById(tab.scriptId)
  if (!script) return Message.warning('关联脚本不存在')
  if (script.scope === 'shared') return Message.warning('该脚本已在共享目录中')
  shareScriptId.value = tab.scriptId
  shareTargets.value = []
  shareFolder.value = 'shared/daily'
  shareVisible.value = true
}

function doShare() {
  if (!shareTargets.value.length) return Message.warning('请选择共享对象')
  sharing.value = true
  // 将脚本复制到共享目录
  const script = scriptStore.getById(shareScriptId.value!)
  if (script) {
    scriptStore.add({
      name: script.name,
      datasource: script.datasource,
      sql: script.sql,
      scope: 'shared',
      folderKey: shareFolder.value
    })
  }
  sharing.value = false
  shareVisible.value = false
  Message.success(`脚本「${shareScriptName.value}」已共享给 ${shareTargets.value.join('、')}`)
}

/* ── 历史记录(F21) ───────────────────── */
const historyVisible = ref(false)
const queryHistory = ref<QueryHistory[]>([])
const historyColumns = [
  { title: '脚本', dataIndex: 'scriptName', width: 140, ellipsis: true, tooltip: true },
  { title: '数据源', dataIndex: 'datasource', slotName: 'datasource', width: 70 },
  { title: '状态', dataIndex: 'status', slotName: 'status', width: 80 },
  { title: 'SQL 摘要', dataIndex: 'sqlSnippet', ellipsis: true, tooltip: true },
  { title: '执行时间', dataIndex: 'runAt', width: 160 },
  { title: '耗时', dataIndex: 'duration', width: 70 },
  { title: '行数', dataIndex: 'rowCount', width: 60 }
]

/* ── 快速创建任务调度 ───────────────────── */
const taskVisible = ref(false)
const taskCreating = ref(false)
const taskForm = ref<{ name: string; scriptName: string; schedule: string; datasource: DataSourceKey }>({
  name: '',
  scriptName: '',
  schedule: '每天 02:00',
  datasource: 'doris'
})

function openTaskModal() {
  const tab = editor.activeTab
  if (!tab?.scriptId) {
    return Message.warning('请先保存脚本,再创建任务')
  }
  const script = scriptStore.getById(tab.scriptId)
  if (!script) return Message.warning('关联脚本不存在')
  taskForm.value = {
    name: script.name,
    scriptName: script.name,
    schedule: '每天 02:00',
    datasource: script.datasource
  }
  taskVisible.value = true
}

function doCreateTask() {
  const name = taskForm.value.name.trim()
  if (!name) return Message.warning('请输入任务名称')
  if (!taskForm.value.schedule) return Message.warning('请选择调度频率')
  taskCreating.value = true
  const record = taskStore.add({
    name,
    datasource: taskForm.value.datasource,
    scriptName: taskForm.value.scriptName,
    schedule: taskForm.value.schedule
  })
  taskCreating.value = false
  taskVisible.value = false
  Message.success(`任务「${name}」已创建(默认已停用),可在任务调度页启用`)
}
</script>

<style lang="scss" scoped>
.uq-page {
  padding-bottom: 24px;
}

.uq-body {
  display: flex;
  gap: 12px;
  margin: 0 24px;
}

/* ── 左侧侧边栏 ── */
.uq-sidebar {
  flex: none;
  width: 280px;
  padding: 8px 12px 12px;
  border: 1px solid var(--color-border-2);
  border-radius: 6px;
  background: var(--color-bg-2);
  max-height: calc(100vh - 160px);
  overflow: auto;

  &__tabs {
    margin-bottom: 8px;
  }

  &__header {
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
  }

  &__meta {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid var(--color-border-2);
  }

  &__meta-title {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 8px;
    font-weight: 600;
    font-size: 13px;
  }
}

.uq-tree-node {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: 100%;

  &__icon {
    color: var(--color-text-3);
  }

  &__text {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

/* ── 右侧编辑器区 ── */
.uq-main {
  flex: 1;
  min-width: 0;
  border: 1px solid var(--color-border-2);
  border-radius: 6px;
  background: var(--color-bg-2);
  overflow: hidden;
}

.uq-tabs {
  padding: 8px 12px 0;
  border-bottom: 1px solid var(--color-border-2);

  :deep(.arco-tabs-content) {
    padding-top: 0;
  }
}

.uq-tab-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.uq-tab-dirty {
  color: rgb(var(--warning-6));
  font-size: 16px;
  line-height: 0;
}

.uq-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--color-border-2);
  flex-wrap: wrap;

  &__ds {
    width: 140px;
  }

  &__spacer {
    flex: 1;
  }

  &__tip {
    font-size: 12px;
    color: var(--color-text-3);
  }
}

.uq-panel {
  border: none;
  border-radius: 0;

  &__tabs {
    padding: 0 12px;
  }

  &__meta {
    font-size: 12px;
    color: var(--color-text-3);
  }

  :deep(.arco-tabs-content) {
    padding-bottom: 12px;
  }
}
</style>
