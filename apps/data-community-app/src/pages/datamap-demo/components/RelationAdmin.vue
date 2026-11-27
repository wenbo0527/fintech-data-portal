<template>
  <div class="dm-admin">
    <a-alert type="warning" class="dm-admin-note">
      这里的增删改只作用于本 Demo（存 localStorage，刷新保留），用于演示「关系可维护」。
      正式系统的维护入口是 <code>管理 / 业务概念 / 关系图</code>，但那个页面目前<b>没接线</b>：
      新增只弹成功提示、删除无 handler、store 也没有 relation 的 CRUD —— 需要时可按本页逻辑补齐。
    </a-alert>

    <a-card :title="`当前关系（${relations.length} 条）`">
      <template #extra>
        <a-space :size="8">
          <a-tag v-if="dirty" color="orange">已修改</a-tag>
          <a-button size="mini" @click="onExport">导出 JSON</a-button>
          <a-popconfirm content="恢复为仓库里的 8 条默认关系？" @ok="onReset">
            <a-button size="mini" status="danger" :disabled="!dirty">重置</a-button>
          </a-popconfirm>
        </a-space>
      </template>
      <a-table :data="relations" :pagination="false" size="small" row-key="id">
        <template #columns>
          <a-table-column title="关系" :width="172">
            <template #cell="{ record }">
              <span class="dm-pair">{{ codeName(record.src) }} → {{ codeName(record.dst) }}</span>
            </template>
          </a-table-column>
          <a-table-column title="名称" data-index="label" :width="90" />
          <a-table-column title="类型" :width="90">
            <template #cell="{ record }">
              <a-tag size="small">{{ TYPE_LABELS[record.type] ?? record.type }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column title="说明" data-index="description" />
          <a-table-column title="来源" :width="110">
            <template #cell="{ record }">
              <a-tag v-if="record.id.startsWith('REL-LOCAL')" size="small" color="arcoblue">本地新增</a-tag>
              <span v-else class="dm-muted">仓库默认</span>
            </template>
          </a-table-column>
          <a-table-column title="操作" :width="70" align="center">
            <template #cell="{ record }">
              <a-popconfirm content="删除这条关系？" @ok="onDelete(record.id)">
                <a-button size="mini" type="text" status="danger">删除</a-button>
              </a-popconfirm>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>

    <a-card title="新增关系">
      <a-space :size="10" wrap>
        <a-select v-model="form.src" placeholder="源实体" :style="{ width: '150px' }" size="small">
          <a-option v-for="e in entities" :key="e.id" :value="e.id">{{ e.name }}</a-option>
        </a-select>
        <a-select v-model="form.type" placeholder="类型" :style="{ width: '110px' }" size="small">
          <a-option v-for="(text, key) in TYPE_LABELS" :key="key" :value="key">{{ text }}</a-option>
        </a-select>
        <a-select v-model="form.dst" placeholder="目标实体" :style="{ width: '150px' }" size="small">
          <a-option v-for="e in entities" :key="e.id" :value="e.id">{{ e.name }}</a-option>
        </a-select>
        <a-input v-model="form.label" placeholder="关系名，如：生成" :style="{ width: '140px' }" size="small" />
        <a-input v-model="form.description" placeholder="说明（可空）" :style="{ width: '240px' }" size="small" />
        <a-button type="primary" size="small" @click="onAdd">新增</a-button>
      </a-space>
      <div class="dm-admin-hint">校验：源/目标必填且不能相同；同一对实体之间只允许一条关系。</div>
    </a-card>

    <a-card :title="`可从 coreRelations 补齐的候选（${candidates.length} 条）`">
      <template #extra>
        <a-button size="mini" type="outline" :disabled="!candidates.length" @click="onAddAll">全部补上</a-button>
      </template>
      <a-empty v-if="!candidates.length" description="实体自带的 coreRelations 已全部建边" />
      <a-table v-else :data="candidates" :pagination="false" size="small" row-key="key">
        <template #columns>
          <a-table-column title="缺失关系" :width="220">
            <template #cell="{ record }">
              <span class="dm-pair">{{ codeName(record.src) }} → {{ codeName(record.dst) }}</span>
            </template>
          </a-table-column>
          <a-table-column title="依据" data-index="sourceText" />
          <a-table-column title="操作" :width="90" align="center">
            <template #cell="{ record }">
              <a-button size="mini" type="text" @click="onAddCandidate(record)">补上</a-button>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'
import { Message } from '@arco-design/web-vue'
import { deriveEntities, type DemoRelationType } from '../data/derive'
import {
  relations, addRelation, removeRelation, resetRelations, isDirty,
  exportedJson, relationCandidates, pairExists, type RelationCandidate
} from '../data/relation-store'

const TYPE_LABELS: Record<DemoRelationType, string> = {
  sequence: '顺序',
  associate: '关联',
  contain: '包含',
  flow: '流向'
}

const entities = deriveEntities()
const nameOf = new Map(entities.map(e => [e.id, e.name]))
const codeName = (id: string) => nameOf.get(id) ?? id

const dirty = computed(() => isDirty())
const candidates = computed(() => relationCandidates().map((c, i) => ({ ...c, key: `${c.src}-${c.dst}-${i}` })))

const form = reactive({
  src: '',
  dst: '',
  type: 'associate' as DemoRelationType,
  label: '关联',
  description: ''
})

function validate (src: string, dst: string) {
  if (!src || !dst) {return '请选择源实体与目标实体'}
  if (src === dst) {return '源与目标不能是同一个实体'}
  if (pairExists(src, dst)) {return '这两个实体之间已有关系'}
  return ''
}

function onAdd () {
  const err = validate(form.src, form.dst)
  if (err) {Message.warning(err); return}
  addRelation({
    src: form.src,
    dst: form.dst,
    type: form.type,
    label: form.label || TYPE_LABELS[form.type],
    description: form.description || `${codeName(form.src)}与${codeName(form.dst)}的${TYPE_LABELS[form.type]}关系（本地新增）`
  })
  Message.success('已新增，切到「关系图下钻」可看到新边')
  form.description = ''
}

function onAddCandidate (c: RelationCandidate) {
  addRelation({
    src: c.src,
    dst: c.dst,
    type: 'associate',
    label: c.label,
    description: `${codeName(c.src)}与${codeName(c.dst)}：依据${c.sourceText}补齐`
  })
  Message.success('已补齐一条候选关系')
}

function onAddAll () {
  const list = relationCandidates()
  list.forEach(c => addRelation({
    src: c.src,
    dst: c.dst,
    type: 'associate',
    label: c.label,
    description: `${codeName(c.src)}与${codeName(c.dst)}：依据${c.sourceText}补齐`
  }))
  Message.success(`已补齐 ${list.length} 条候选关系`)
}

function onDelete (id: string) {
  removeRelation(id)
  Message.success('已删除')
}

function onReset () {
  resetRelations()
  Message.success('已恢复仓库默认的 8 条关系')
}

async function onExport () {
  const text = exportedJson()
  try {
    await navigator.clipboard.writeText(text)
    Message.success('关系 JSON 已复制到剪贴板')
  } catch {
    Message.info(`复制失败，请手动复制：${text.slice(0, 60)}…`)
  }
}
</script>

<style scoped>
.dm-admin {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.dm-pair {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
}
.dm-muted {
  color: var(--dca-text-tertiary, #86909c);
  font-size: 12px;
}
.dm-admin-hint {
  margin-top: 10px;
  font-size: 12px;
  color: var(--dca-text-tertiary, #86909c);
}
.dm-admin-note :deep(code) {
  background: rgba(0, 0, 0, 0.04);
  padding: 0 4px;
  border-radius: 3px;
}
</style>