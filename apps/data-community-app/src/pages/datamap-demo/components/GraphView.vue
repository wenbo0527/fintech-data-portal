<template>
  <div class="dm-graphview">
    <div class="dm-head">
      <a-breadcrumb>
        <a-breadcrumb-item class="dm-crumb-root" @click="backToStages">授信支用链</a-breadcrumb-item>
        <a-breadcrumb-item v-if="activeStageId">
          <span class="dm-crumb-link" @click="backToStageEntities">{{ activeStageName }}</span>
        </a-breadcrumb-item>
        <a-breadcrumb-item v-if="activeEntity">{{ activeEntity.name }}</a-breadcrumb-item>
        <a-breadcrumb-item v-if="activeTable">{{ activeTable.name }}</a-breadcrumb-item>
      </a-breadcrumb>
      <a-space class="dm-legend" :size="10" wrap>
        <a-radio-group v-model="view" type="button" size="mini">
          <a-radio v-for="v in VIEW_OPTIONS" :key="v" :value="v">{{ VIEW_LABELS[v] }}</a-radio>
        </a-radio-group>
        <a-radio-group v-model="levelModel" type="button" size="mini">
          <a-radio value="stage">环节</a-radio>
          <a-radio value="entity">实体</a-radio>
        </a-radio-group>
        <a-radio-group v-model="rankdir" type="button" size="mini">
          <a-radio value="TB">纵向</a-radio>
          <a-radio value="LR">横向</a-radio>
        </a-radio-group>
      </a-space>
    </div>

    <div class="dm-subhead">
      <a-space :size="8" wrap>
        <a-tag :color="level === 'stage' ? 'arcoblue' : 'gray'">
          {{ level === 'stage' ? '环节视图 · 点击环节下钻' : `实体视图${activeStageName ? ' · ' + activeStageName : ''}` }}
        </a-tag>
        <a-tag color="green">推荐表 {{ tierCount.recommended }}</a-tag>
        <a-tag color="arcoblue">明细兜底 {{ tierCount.fallback }}</a-tag>
        <a-tag color="gray">技术维护 {{ tierCount.tech }}</a-tag>
        <a-select
          v-model="tagSel"
          multiple
          size="mini"
          placeholder="标签筛选"
          allow-clear
          :max-tag-count="2"
          class="dm-filter"
        >
          <a-option v-for="t in tagOptions" :key="t.tag" :value="t.tag">{{ t.tag }}（{{ t.count }}）</a-option>
        </a-select>
        <a-tooltip :content="prodOptions.length ? '按产品筛选' : '产品标签未接入：在 derive.ts 的 PRODUCT_MAPPING 填「表→产品」，或给表打「产品:字节」标签后自动出现'">
          <a-select
            v-model="prodSel"
            multiple
            size="mini"
            :placeholder="prodOptions.length ? '产品筛选' : '产品（待接入）'"
            :disabled="!prodOptions.length"
            allow-clear
            :max-tag-count="1"
            class="dm-filter dm-filter--product"
          >
            <a-option v-for="p in prodOptions" :key="p" :value="p">{{ p }}</a-option>
          </a-select>
        </a-tooltip>
        <a-button v-if="filterActive" size="mini" type="text" @click="clearFilter">清除筛选</a-button>
        <span v-if="filterActive" class="dm-muted">
          筛后命中 {{ filteredCount }} / {{ tables.length }} 张（叠加高亮，不隐藏节点）
        </span>
        <span v-else-if="view !== 'all'" class="dm-muted">
          视角「{{ VIEW_LABELS[view] }}」命中 {{ viewHitCount }} 张 / 共 {{ tables.length }} 张（叠加高亮，不隐藏节点）
        </span>
      </a-space>
    </div>

    <div class="dm-canvas" :class="{ 'dm-canvas--drawer': drawerVisible }">
      <div class="dm-graph-host">
      <RelationGraph
        ref="graphRef"
        :nodes="graphNodes"
        :edges="graphEdges"
        :rankdir="rankdir"
        @node-click="onNodeClick"
      />
      </div>
      <div class="dm-hint">
        {{ level === 'stage' ? '点击环节下钻到实体 → 点实体看推荐表' : '点击实体查看推荐表 · 面包屑可返回环节' }} · 拖拽画布平移 · Ctrl/⌘ + 滚轮缩放 · 节点只读不可拖动
      </div>
    </div>

    <a-drawer
      v-model:visible="drawerVisible"
      :width="440"
      :footer="false"
      :mask="false"
      popup-container=".dm-graphview"
      :title="drawerTitle"
      unmount-on-close
    >
      <template v-if="activeTable">
        <a-button size="small" type="text" @click="activeTable = null">
          <template #icon><icon-left /></template>
          返回推荐表
        </a-button>
        <a-descriptions :column="1" size="small" bordered class="dm-desc">
          <a-descriptions-item label="表名">{{ activeTable.name }}</a-descriptions-item>
          <a-descriptions-item label="中文名">{{ activeTable.cnName }}</a-descriptions-item>
          <a-descriptions-item label="档位">
            <a-tag size="small" :color="TIER_COLORS[activeTable.tier]">{{ TIER_LABELS[activeTable.tier] }}</a-tag>
            <span class="dm-muted"> {{ activeTable.layer }} · 热度 {{ activeTable.heat }}</span>
          </a-descriptions-item>
          <a-descriptions-item label="责任人">{{ activeTable.owner }}</a-descriptions-item>
          <a-descriptions-item label="口径">{{ activeTable.reason }}</a-descriptions-item>
        </a-descriptions>
        <a-divider orientation="left">字段（{{ fields.length }}）</a-divider>
        <a-table :data="fields" :pagination="false" size="small" row-key="name">
          <template #columns>
            <a-table-column title="字段" data-index="name" />
            <a-table-column title="中文" data-index="cn" />
            <a-table-column title="类型" data-index="type" :width="90" />
            <a-table-column title="分级" :width="90">
              <template #cell="{ record }">
                <a-tag size="small" :color="record.sensitivity === 'public' ? 'green' : 'orange'">
                  {{ record.sensitivity }}
                </a-tag>
              </template>
            </a-table-column>
          </template>
        </a-table>
        <div class="dm-table-foot">
          <router-link :to="{ name: 'data-map-table', params: { tableName: activeTable.name } }">
            <a-button type="outline" size="small">在现状表详情中打开（旧版 7 Tab）</a-button>
          </router-link>
        </div>
      </template>

      <template v-else-if="activeEntity">
        <a-descriptions :column="1" size="small" class="dm-desc">
          <a-descriptions-item label="实体">{{ activeEntity.name }}（{{ activeEntity.id }}）</a-descriptions-item>
          <a-descriptions-item label="说明">{{ activeEntity.description }}</a-descriptions-item>
          <a-descriptions-item label="在册表">{{ entityTables.length }} 张</a-descriptions-item>
          <a-descriptions-item label="分层">
            <a-space :size="6" wrap>
              <a-tag v-for="d in layerDist" :key="d.layer" size="small" color="gray">{{ d.layer }} {{ d.count }}</a-tag>
            </a-space>
          </a-descriptions-item>
          <a-descriptions-item label="视角分布">
            <a-space :size="6" wrap>
              <a-tag
                v-for="v in VIEW_KEYS"
                :key="v"
                size="small"
                :color="view === v ? 'arcoblue' : 'gray'"
                class="dm-view-chip"
                @click="toggleView(v)"
              >
                {{ VIEW_LABELS[v] }} {{ entityViewCounts?.[v] ?? 0 }}
              </a-tag>
            </a-space>
          </a-descriptions-item>
          <a-descriptions-item label="直连实体">
            <a-space :size="6" wrap>
              <a-tag v-for="n in neighborNames" :key="n.id" size="small" color="arcoblue">{{ n.label }}</a-tag>
              <span v-if="!neighborNames.length" class="dm-muted">无</span>
            </a-space>
          </a-descriptions-item>
        </a-descriptions>
        <a-divider orientation="left">推荐与兜底{{ view === 'all' ? '' : ` · 视角「${VIEW_LABELS[view]}」` }}</a-divider>
        <a-empty
          v-if="!visibleInView.length"
          :description="emptyHint"
        />
        <a-space v-else direction="vertical" fill :size="10">
          <AssetCard
            v-for="t in visibleInView"
            :key="t.name"
            :title="t.name"
            :type="TIER_LABELS[t.tier]"
            :type-color="TIER_COLORS[t.tier]"
            :description="t.reason"
            :meta-lines="[
              `${t.cnName} · ${t.layer} · ${t.fieldCount} 字段 · 热度 ${t.heat}`,
              `命中视角：${matchedViews(t).join(' / ') || '无'} · 责任人 ${t.owner}`,
              tagLine(t)
            ]"
            @click="activeTable = t"
          />
        </a-space>
        <template v-if="techInView.length">
          <a-divider orientation="left">技术维护（默认折叠）</a-divider>
          <a-collapse :default-active-key="[]">
            <a-collapse-item key="tech" :header="`${techInView.length} 张贴源/应用/维表与非上线表`">
              <a-space direction="vertical" fill :size="8">
                <AssetCard
                  v-for="t in techInView"
                  :key="t.name"
                  :title="t.name"
                  :type="t.layer"
                  type-color="gray"
                  :meta="`${t.cnName} · ${t.layer} · ${t.fieldCount} 字段 · ${t.status}`"
                  :description="t.reason"
                  @click="activeTable = t"
                />
              </a-space>
            </a-collapse-item>
          </a-collapse>
        </template>
        <template v-if="outViewTables.length">
          <a-divider orientation="left">未命中当前视角/筛选</a-divider>
          <a-collapse :default-active-key="[]">
            <a-collapse-item key="out" :header="outViewLabel">
              <a-space direction="vertical" fill :size="8">
                <AssetCard
                  v-for="t in outViewTables"
                  :key="t.name"
                  :title="t.name"
                  :type="TIER_LABELS[t.tier]"
                  type-color="gray"
                  :meta="`${t.cnName} · ${t.layer} · 命中：${matchedViews(t).join(' / ') || '无'}`"
                  :description="t.reason"
                  @click="activeTable = t"
                />
              </a-space>
            </a-collapse-item>
          </a-collapse>
        </template>
      </template>
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { IconLeft } from '@arco-design/web-vue/es/icon'
import AssetCard from '@dca-components/common/AssetCard.vue'
import RelationGraph from './RelationGraph.vue'
import { relations as relationState } from '../data/relation-store'
import {
  deriveEntities, deriveTables, deriveStages, entitiesOfStage, stageIdOf, tablesOfEntity, fieldsOfTable, entityName,
  viewHit, viewCountsOf, countByView, VIEW_LABELS, tagCounts, productOptions, productOf, matchesFilter, type TableFilter,
  TIER_LABELS, TIER_COLORS, type DemoEntity, type DemoTable, type DemoView, type DemoRelationType
} from '../data/derive'

const entities = deriveEntities()
const relations = computed(() => relationState.value)
const tables = deriveTables()
const stages = deriveStages()

const VIEW_KEYS: DemoView[] = ['biz', 'risk', 'market', 'tech']
const VIEW_OPTIONS: DemoView[] = ['all', ...VIEW_KEYS]

const graphRef = ref<InstanceType<typeof RelationGraph>>()
const drawerVisible = ref(false)
const activeEntity = ref<DemoEntity | null>(null)
const activeTable = ref<DemoTable | null>(null)
const rankdir = ref<'TB' | 'LR'>('TB')
const view = ref<DemoView>('all')
const level = ref<'stage' | 'entity'>('stage')
const activeStageId = ref<string | null>(null)
const activeStageName = computed(() => stages.find(s => s.id === activeStageId.value)?.name ?? '')
const levelModel = computed({
  get: () => level.value,
  set: (v: string) => {
    level.value = v === 'entity' ? 'entity' : 'stage'
    activeStageId.value = null
    closeDrawer()
  }
})

const tagSel = ref<string[]>([])
const prodSel = ref<string[]>([])
const filter = computed<TableFilter>(() => ({ tags: tagSel.value, products: prodSel.value }))
const filterActive = computed(() => tagSel.value.length > 0 || prodSel.value.length > 0)
const tagOptions = tagCounts(tables)
const prodOptions = productOptions(tables)
const filteredCount = computed(() => tables.filter(t => matchesFilter(t, filter.value)).length)

function passes (t: DemoTable) {
  return matchesFilter(t, filter.value)
}

function clearFilter () {
  tagSel.value = []
  prodSel.value = []
}

/** 节点副标题：优先用筛选口径，其次视角口径，都没有时给全量 */
function scopeLabel (matched: number, total: number) {
  if (filterActive.value) {return `筛后 ${matched}/${total}`}
  if (view.value !== 'all') {return `本视角 ${matched}/${total}`}
  return `${total} 张表`
}

const stageGraph = computed(() => {
  const nodes = stages.map(s => {
    const ents = entitiesOfStage(s.id)
    const all = ents.flatMap(e => tablesOfEntity(e.id, tables))
    const kept = filterActive.value ? all.filter(passes) : all
    const matched = view.value === 'all' ? kept.length : kept.filter(t => viewHit(t, view.value)).length
    return {
      id: `STAGE:${s.id}`,
      title: s.name,
      sub: `${ents.length} 实体 · ${scopeLabel(matched, all.length)}`,
      kind: 'stage' as const,
      inView: matched > 0
    }
  })
  const agg = new Map<string, { source: string, target: string, label: string, type: DemoRelationType, count: number }>()
  relations.value.forEach(r => {
    const a = stageIdOf(r.src)
    const b = stageIdOf(r.dst)
    if (!a || !b || a === b) {return}
    const key = [a, b].sort().join('|')
    const cur = agg.get(key)
    if (cur) {
      cur.count += 1
      cur.label = `${cur.count} 条关系`
      return
    }
    agg.set(key, { source: `STAGE:${a}`, target: `STAGE:${b}`, label: r.label, type: r.type, count: 1 })
  })
  const edges = [...agg.entries()].map(([key, v]) => ({
    id: `SE:${key}`,
    source: v.source,
    target: v.target,
    label: v.label,
    type: v.type
  }))
  return { nodes, edges }
})

const scopeEntities = computed(() => activeStageId.value ? entitiesOfStage(activeStageId.value) : entities)

const entityGraph = computed(() => {
  const inScope = new Set(scopeEntities.value.map(e => e.id))
  const nodes = scopeEntities.value.map(e => {
    const all = tablesOfEntity(e.id, tables)
    const kept = filterActive.value ? all.filter(passes) : all
    const matched = view.value === 'all' ? kept.length : kept.filter(t => viewHit(t, view.value)).length
    return {
      id: e.id,
      title: e.name,
      sub: `${e.kind === 'event' ? '事件' : '实体'} · ${scopeLabel(matched, all.length)}`,
      kind: e.kind,
      inView: matched > 0
    }
  })
  const edges = relations.value
    .filter(r => inScope.has(r.src) && inScope.has(r.dst))
    .map(r => ({ id: r.id, source: r.src, target: r.dst, label: r.label, type: r.type }))
  return { nodes, edges }
})

const graphNodes = computed(() => (level.value === 'stage' ? stageGraph.value.nodes : entityGraph.value.nodes))
const graphEdges = computed(() => (level.value === 'stage' ? stageGraph.value.edges : entityGraph.value.edges))

const entityTables = computed(() => activeEntity.value ? tablesOfEntity(activeEntity.value.id, tables) : [])
const visibleTables = computed(() => entityTables.value.filter(t => t.tier !== 'tech'))
const techTables = computed(() => entityTables.value.filter(t => t.tier === 'tech'))
const inScopeHit = (t: DemoTable) => viewHit(t, view.value) && passes(t)
const visibleInView = computed(() => visibleTables.value.filter(inScopeHit))
const techInView = computed(() => techTables.value.filter(inScopeHit))
const outViewTables = computed(() => (view.value === 'all' && !filterActive.value)
  ? []
  : entityTables.value.filter(t => !inScopeHit(t)))
const outViewLabel = computed(() => filterActive.value
  ? `${outViewTables.value.length} 张未命中当前标签/产品筛选的表`
  : `${outViewTables.value.length} 张未命中「${VIEW_LABELS[view.value]}」视角的表`)
const emptyHint = computed(() => {
  if (activeEntity.value && !entityTables.value.length) {
    return '暂无在册表（仓库权威目录中该实体没有对应物理表）'
  }
  const parts: string[] = []
  if (filterActive.value) {parts.push('标签/产品筛选')}
  if (view.value !== 'all') {parts.push(`视角「${VIEW_LABELS[view.value]}」`)}
  return `当前${parts.join(' + ') || '条件'}下没有推荐/兜底表（可清除筛选或在下方折叠区查看）`
})
const entityViewCounts = computed(() => activeEntity.value ? viewCountsOf(activeEntity.value.id, tables) : null)
const viewHitCount = computed(() => countByView(tables, view.value))
const fields = computed(() => activeTable.value ? fieldsOfTable(activeTable.value.name) : [])
const drawerTitle = computed(() => activeTable.value ? activeTable.value.cnName : (activeEntity.value?.name ?? ''))
const tierCount = computed(() => ({
  recommended: tables.filter(t => t.tier === 'recommended').length,
  fallback: tables.filter(t => t.tier === 'fallback').length,
  tech: tables.filter(t => t.tier === 'tech').length
}))
const layerDist = computed(() => {
  const m = new Map<string, number>()
  entityTables.value.forEach(t => m.set(t.layer, (m.get(t.layer) ?? 0) + 1))
  return [...m.entries()].map(([layer, count]) => ({ layer, count }))
})
const neighborNames = computed(() => {
  if (!activeEntity.value) {return []}
  const id = activeEntity.value.id
  const seen = new Set<string>()
  const out: Array<{ id: string, label: string }> = []
  relations.value.forEach(r => {
    const other = r.src === id ? r.dst : (r.dst === id ? r.src : null)
    if (!other || seen.has(other)) {return}
    seen.add(other)
    out.push({ id: other, label: `${entityName(other)}（${r.label}）` })
  })
  return out
})

function matchedViews (t: DemoTable) {
  return VIEW_KEYS.filter(v => viewHit(t, v)).map(v => VIEW_LABELS[v])
}

function tagLine (t: DemoTable) {
  const products = productOf(t)
  const tags = t.tags.filter(x => !x.startsWith('产品:'))
  const parts: string[] = []
  if (products.length) {parts.push(`产品：${products.join(' / ')}`)}
  if (tags.length) {parts.push(`标签：${tags.join(' / ')}`)}
  return parts.join(' · ') || '无标签'
}

function toggleView (v: DemoView) {
  view.value = view.value === v ? 'all' : v
}

function onNodeClick (id: string) {
  if (!id) {
    closeDrawer()
    return
  }
  if (id.startsWith('STAGE:')) {
    activeStageId.value = id.slice('STAGE:'.length)
    level.value = 'entity'
    closeDrawer()
    return
  }
  activeEntity.value = entities.find(e => e.id === id) ?? null
  activeTable.value = null
  drawerVisible.value = true
}

function closeDrawer () {
  drawerVisible.value = false
  activeEntity.value = null
  activeTable.value = null
}

function backToStages () {
  closeDrawer()
  activeStageId.value = null
  level.value = 'stage'
  graphRef.value?.reset()
}

function backToStageEntities () {
  closeDrawer()
  level.value = 'entity'
  graphRef.value?.reset()
}

watch(drawerVisible, () => nextTick(() => graphRef.value?.fit()))
watch([level, activeStageId, view, tagSel, prodSel], () => nextTick(() => graphRef.value?.fit()))
</script>

<style scoped>
.dm-graphview {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 700px;
}
.dm-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
}
.dm-crumb-root,
.dm-crumb-link {
  cursor: pointer;
  color: var(--dca-brand-primary, #165dff);
}
.dm-subhead {
  padding: 0 12px 8px;
  font-size: 12px;
}
.dm-view-chip {
  cursor: pointer;
}
.dm-filter {
  width: 190px;
}
.dm-filter--product {
  width: 160px;
}
.dm-canvas {
  position: relative;
  height: 620px;
}
.dm-canvas--drawer {
  padding-right: 452px;
}
.dm-graph-host {
  width: 100%;
  height: 100%;
}
.dm-hint {
  position: absolute;
  left: 12px;
  bottom: 10px;
  font-size: 12px;
  color: var(--dca-text-tertiary, #86909c);
  background: rgba(255, 255, 255, 0.86);
  padding: 4px 8px;
  border-radius: 4px;
}
.dm-desc {
  margin-bottom: 8px;
}
.dm-muted {
  color: var(--dca-text-tertiary, #86909c);
}
.dm-table-foot {
  margin-top: 12px;
  text-align: right;
}
/* 抽屉挂在本组件内且无遮罩，容器本身必须放行指针，否则面包屑与画布点不到 */
.dm-graphview :deep(.arco-drawer-container) {
  pointer-events: none;
}
.dm-graphview :deep(.arco-drawer) {
  pointer-events: auto;
}
</style>
