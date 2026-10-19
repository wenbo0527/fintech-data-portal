<template>
  <PageContainer size="wide" class="sync-create">
    <PageHeader
      title="新建同步任务"
      sub-title="Doris ↔ Hive 双向自助同步 · 一期手动单次执行"
    >
      <template #extra>
        <a-space>
          <a-button @click="goBack">返回服务首页</a-button>
          <a-button @click="goRecords">查看执行记录</a-button>
        </a-space>
      </template>
    </PageHeader>

    <a-card :bordered="false">
      <!-- ═══ 选库 ═══ -->
      <section class="sync-section">
        <div class="sync-section__head">
          <span class="sync-section__dot" />
          <span class="sync-section__title">1. 选择源库</span>
          <span class="text-gray">仅显示个人账户下的可同步库</span>
        </div>
        <div class="sync-db-grid">
          <a-button
            v-for="db in store.allowedDatabases"
            :key="db.id"
            :type="databaseId === db.id ? 'primary' : 'outline'"
            long
            :disabled="db.type !== 'personal'"
            class="sync-db-grid__btn"
            @click="onPickDatabase(db)"
          >
            <div class="sync-db-grid__head">
              <a-tag :color="db.datasource === 'doris' ? 'arcoblue' : 'orange'" size="small">
                {{ datasourceLabel(db.datasource) }}
              </a-tag>
              <span class="sync-db-grid__name">{{ db.database }}</span>
              <a-tag size="small" :color="db.type === 'personal' ? 'green' : 'gray'">
                {{ db.type === 'personal' ? '个人' : '团队' }}
              </a-tag>
            </div>
            <div class="sync-db-grid__sub">{{ db.cluster }} · {{ db.owner }}</div>
          </a-button>
          <a-empty
            v-if="!store.allowedDatabases.length"
            description="暂无可同步的数据库"
            style="grid-column: 1/-1"
          />
        </div>
      </section>

      <!-- ═══ 选源表 ═══ -->
      <section v-if="databaseId" class="sync-section">
        <div class="sync-section__head">
          <span class="sync-section__dot" />
          <span class="sync-section__title">2. 选择源表</span>
          <a-input-search
            v-model="tableKeyword"
            size="small"
            placeholder="搜索源表名"
            allow-clear
            style="max-width: 220px; margin-left: auto"
          />
        </div>
        <a-table
          :columns="tableColumns"
          :data="filteredTables"
          :pagination="{ pageSize: 8, showTotal: true }"
          row-key="id"
          size="small"
          :row-class-name="rowClassTable"
          @row-click="onPickTable"
          :scroll="{ x: 800 }"
        >
          <template #tableName="{ record }">
            <div class="sync-source-row">
              <icon-table class="sync-source-row__icon" />
              <div>
                <div class="sync-source-row__name">{{ record.tableName }}</div>
                <div class="sync-source-row__comment">{{ record.comment }}</div>
              </div>
            </div>
          </template>
          <template #partitioned="{ record }">
            <a-tag v-if="record.isPartitioned" color="red" size="small">分区表</a-tag>
            <a-tag v-else color="green" size="small">非分区</a-tag>
          </template>
          <template #fields="{ record }">
            <span :class="{ 'is-over': record.fieldCount > store.fieldLimit }">
              {{ record.fieldCount }} / {{ store.fieldLimit }}
            </span>
          </template>
          <template #actions="{ record }">
            <a-button
              type="primary"
              size="mini"
              :disabled="!canPickTable(record)"
              @click.stop="onPickTable(record)"
            >
              {{ sourceId === record.id ? '已选' : '选择' }}
            </a-button>
          </template>
        </a-table>
        <a-alert v-if="tableError" type="warning" show-icon class="sync-create__alert">
          {{ tableError }}
        </a-alert>
      </section>
    </a-card>

    <!-- ═══ 选完源表后,自动弹出确认弹窗 ═══ -->
    <a-modal
      v-if="source"
      v-model:visible="confirmVisible"
      title="确认同步任务"
      :ok-text="submitting ? '执行中…' : '确认执行'"
      :cancel-text="'取消'"
      :ok-button-props="{ disabled: !canSubmit || submitting }"
      :width="540"
      :hide-cancel="!target"
      unmount-on-close
      @ok="handleSubmit"
      @cancel="handleCancel"
    >
      <!-- 目标端未推导成功(同名表缺失)的极端情况兜底 -->
      <a-empty
        v-if="!target"
        description="未找到对端同名表,无法自动推导目标端"
      >
        <a-button @click="confirmVisible = false">关闭</a-button>
      </a-empty>

      <template v-else>
        <a-alert
          :type="isLoopSync ? 'warning' : 'info'"
          show-icon
          class="sync-create__modal-alert"
        >
          {{
            isLoopSync
              ? '源表名 = 目标表名,可能形成循环同步,请确认是否继续。'
              : '系统已自动推导目标端、同步方向与同名表,确认后将建表并搬运一次。'
          }}
        </a-alert>

        <a-descriptions :column="1" bordered size="small">
          <a-descriptions-item label="同步方向">
            <a-tag :color="directionMeta.color" size="small">{{ directionMeta.text }}</a-tag>
            <span class="text-gray sync-dir__hint">系统按源表所在端自动判定</span>
          </a-descriptions-item>
          <a-descriptions-item label="源表">
            <code class="sync-code">{{ source.datasource }}.{{ source.database }}.{{ source.tableName }}</code>
          </a-descriptions-item>
          <a-descriptions-item label="目标表">
            <code class="sync-code">{{ target.datasource }}.{{ defaultTargetDb }}.{{ target.tableName }}</code>
            <a-tag v-if="target.tmp" color="orange" size="small" style="margin-left: 4px">tmp 方式落地</a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="字段数 / 写入方式">
            {{ source.fieldCount }} / {{ store.fieldLimit }} 字段 ·
            <strong>先删后建</strong>(与现有脚本一致)
          </a-descriptions-item>
        </a-descriptions>

        <div class="sync-create__modal-row">
          <span class="sync-create__modal-label">备注</span>
          <a-input
            v-model="note"
            placeholder="选填,如:本批用于风险策略 v3 模型"
            allow-clear
            max-length="80"
          />
        </div>
      </template>
    </a-modal>
  </PageContainer>
</template>

<script setup lang="ts">
/**
 * 数据任务服务(一期) · Doris ↔ Hive 双向自助同步 - 任务创建页(简化版)
 *
 * 实现需求文档模块 A:
 *   A1 数据库与源表选择(R01-R05)
 *   A2 目标端确认(R06-R10):用户端不再选,系统推导后弹窗只读展示
 *   A3 提交与执行(R11-R15):弹窗里直接提交
 *
 * 全部为前端 Mock,提交后由 store 推进 pending → running → success/failed。
 * 不实现通知模块(C1/C2 一期不实现)。
 */
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import PageContainer from '@/components-dca/common/PageContainer.vue'
import PageHeader from '@/components-dca/common/PageHeader.vue'
import { useSyncTaskStore } from '@/stores-dca/management/sync-task'
import { SYNC_DIRECTION_META } from '@/mock/service/sync-tasks'
import type { AllowDb, SyncDirection, SyncTable, SyncTarget } from '@/mock/service/sync-tasks-types'

const router = useRouter()
const store = useSyncTaskStore()

const goBack = () => router.push({ name: 'service' })
const goRecords = () => router.push({ name: 'service-sync-records' })

/* ─────── 表单数据 ─────── */

const databaseId = ref<string>('')
const sourceId = ref<string>('')
const tableKeyword = ref('')
const note = ref('')
const submitting = ref(false)
const confirmVisible = ref(false)

/** 选中的库 */
const pickedDb = computed<AllowDb | null>(
  () => store.allowedDatabases.find(d => d.id === databaseId.value) ?? null
)

/** 当前库下的可同步表(已应用过滤:排除分区表) */
const availableTables = computed(() => (databaseId.value ? store.tablesOf(databaseId.value) : []))

/** 过滤后的表 */
const filteredTables = computed(() => {
  const kw = tableKeyword.value.trim().toLowerCase()
  if (!kw) return availableTables.value
  return availableTables.value.filter(t => t.tableName.toLowerCase().includes(kw))
})

/** 选中的源表 */
const source = computed<SyncTable | null>(
  () => store.allTables.find(t => t.id === sourceId.value) ?? null
)

/** 系统推导的目标端 */
const target = computed<SyncTarget | null>(() => (source.value ? store.autoTarget(source.value) : null))

/** 系统推导的方向 */
const direction = computed<SyncDirection | null>(() =>
  source.value ? store.autoDirection(source.value) : null
)
const directionMeta = computed(() =>
  direction.value ? SYNC_DIRECTION_META[direction.value] : { text: '—', color: 'gray' }
)

/** 默认目标库(R08) */
const defaultTargetDb = computed(() => {
  if (!target.value) return ''
  return target.value.tmp
    ? `tmp.${target.value.tableName}`
    : `${target.value.database}.${target.value.tableName}`
})

/** 循环同步视觉标记(R19) */
const isLoopSync = computed(() => {
  if (!source.value || !target.value) return false
  return source.value.tableName === target.value.tableName
})

/* ─────── 校验 ─────── */

/** 表级行内校验提示 */
const tableError = computed(() => {
  if (!source.value) return ''
  if (source.value.isPartitioned) return '该表为分区表,本期仅支持非分区表同步。'
  if (source.value.fieldCount > store.fieldLimit) {
    return `字段数为 ${source.value.fieldCount},超出本期上限 ${store.fieldLimit},请拆表后同步。`
  }
  return ''
})

/** 是否能提交 */
const canSubmit = computed(() => {
  if (!source.value || !target.value || !pickedDb.value) return false
  if (pickedDb.value.type !== 'personal') return false
  if (source.value.isPartitioned) return false
  if (source.value.fieldCount > store.fieldLimit) return false
  return true
})

/* ─────── 列定义 ─────── */

const tableColumns = [
  {
    title: '源表',
    dataIndex: 'tableName',
    slotName: 'tableName',
    width: 360
  },
  { title: '数据源', dataIndex: 'datasource', width: 90 },
  { title: '库', dataIndex: 'database', width: 100 },
  { title: '类型', dataIndex: 'partitioned', slotName: 'partitioned', width: 100 },
  { title: '字段数', dataIndex: 'fields', slotName: 'fields', width: 110 },
  { title: '操作', dataIndex: 'actions', slotName: 'actions', width: 100, fixed: 'right' }
]

/* ─────── 方法 ─────── */

function datasourceLabel(d: string) {
  return d === 'doris' ? 'Doris' : 'Hive'
}

function rowClassTable(record: SyncTable) {
  const isOver = record.fieldCount > store.fieldLimit
  const isP = record.isPartitioned
  const isSel = record.id === sourceId.value
  return [
    isSel && 'is-selected',
    (isOver || isP) && 'is-disabled',
    !isSel && !isOver && !isP && 'is-clickable'
  ]
  .filter(Boolean)
  .join(' ')
}

function onPickDatabase(db: AllowDb) {
  databaseId.value = db.id
  sourceId.value = ''
}

function onPickTable(record: SyncTable) {
  if (!canPickTable(record)) {
    if (record.isPartitioned) Message.warning('仅支持非分区表同步')
    else if (record.fieldCount > store.fieldLimit) Message.warning(`字段数超出上限 ${store.fieldLimit},请拆表后同步`)
    return
  }
  sourceId.value = record.id
  note.value = ''
  // 选中后立即弹窗确认,用户只需一次确认
  confirmVisible.value = true
}

function canPickTable(t: SyncTable) {
  return !t.isPartitioned && t.fieldCount <= store.fieldLimit
}

function handleSubmit() {
  if (!canSubmit.value || !source.value || !target.value) return
  submitting.value = true
  try {
    const record = store.submit({
      source: source.value,
      target: target.value,
      direction: direction.value!,
      note: note.value,
      creator: '王运营'
    })
    Message.success(`任务「${record.id}」已提交,正在执行`)
    confirmVisible.value = false
    submitting.value = false
    router.push({ name: 'service-sync-records' })
  } catch (e) {
    submitting.value = false
    Message.error('提交失败:' + (e as Error).message)
  }
}

function handleCancel() {
  // 用户取消弹窗 → 保留源表已选项但不再询问,除非他再次点选
  confirmVisible.value = false
}
</script>

<style lang="scss" scoped>
.sync-create {
  &__alert {
    margin-top: 12px;
  }
  &__empty {
    margin: 24px 0 12px;
  }
  &__modal-alert {
    margin-bottom: 16px;
  }
  &__modal-row {
    margin-top: 12px;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  &__modal-label {
    width: 48px;
    flex-shrink: 0;
    color: var(--color-text-2);
    font-size: 13px;
  }
}

/* section 标题区 */
.sync-section {
  & + & {
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px dashed var(--color-border-2);
  }
  &__head {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  }
  &__dot {
    width: 4px;
    height: 14px;
    border-radius: 2px;
    background: rgb(var(--primary-6));
  }
  &__title {
    font-size: 15px;
    font-weight: 600;
  }
}

.sync-db-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;

  &__btn {
    height: auto;
    padding: 8px 12px;
    text-align: left;
    white-space: normal;
  }
  &__head {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 4px;
  }
  &__name {
    font-weight: 600;
    font-size: 14px;
  }
  &__sub {
    font-size: 12px;
    color: var(--color-text-3);
  }
}

.sync-source-row {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  &__icon {
    color: rgb(var(--primary-6));
    margin-top: 2px;
  }
  &__name {
    font-weight: 500;
    font-family: 'Menlo', monospace;
  }
  &__comment {
    font-size: 12px;
    color: var(--color-text-3);
  }
}

/* 表格行选中 / 不可点 */
:deep(.arco-table-tr) {
  cursor: pointer;
  &.is-disabled {
    cursor: not-allowed;
    background: var(--color-fill-1);
    opacity: 0.65;
  }
  &.is-selected > td {
    background: rgb(var(--primary-1));
  }
}

.sync-code {
  font-family: 'Menlo', monospace;
  background: var(--color-fill-2);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  color: #165dff;
}

.sync-dir__hint {
  margin-left: 8px;
  font-size: 12px;
}

.is-over {
  color: rgb(var(--danger-6));
  font-weight: 600;
}
</style>
