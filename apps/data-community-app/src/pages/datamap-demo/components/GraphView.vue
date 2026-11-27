<template>
  <div class="dm-graphview">
    <div class="dm-head">
      <a-breadcrumb>
        <a-breadcrumb-item class="dm-crumb-root" @click="backToChain">授信支用链</a-breadcrumb-item>
        <a-breadcrumb-item v-if="activeEntity">{{ activeEntity.name }}</a-breadcrumb-item>
        <a-breadcrumb-item v-if="activeTable">{{ activeTable.name }}</a-breadcrumb-item>
      </a-breadcrumb>
      <a-space class="dm-legend" :size="10" wrap>
        <a-radio-group v-model="view" type="button" size="mini">
          <a-radio v-for="v in VIEW_OPTIONS" :key="v" :value="v">{{ VIEW_LABELS[v] }}</a-radio>
        </a-radio-group>
        <a-radio-group v-model="rankdir" type="button" size="mini">
          <a-radio value="TB">纵向</a-radio>
          <a-radio value="LR">横向</a-radio>
        </a-radio-group>
      </a-space>
    </div>

    <div class="dm-subhead">
      <a-space :size="8" wrap>
        <a-tag color="green">推荐表 {{ tierCount.recommended }}</a-tag>
        <a-tag color="arcoblue">明细兜底 {{ tierCount.fallback }}</a-tag>
        <a-tag color="gray">技术维护 {{ tierCount.tech }}</a-tag>
        <span v-if="view !== 'all'" class="dm-muted">
          视角「{{ VIEW_LABELS[view] }}」命中 {{ viewHitCount }} 张 / 共 {{ tables.length }} 张（叠加高亮，不隐藏节点）
        </span>
      </a-space>
    </div>

    <div class="dm-canvas" :class="{ 'dm-canvas--drawer': drawerVisible }">
      <div class="dm-graph-host">
      <RelationGraph
        ref="graphRef"
        :entities="entities"
        :relations="relations"
        :tables="tables"
        :rankdir="rankdir"
        :view="view"
        @node-click="onNodeClick"
      />
      </div>
      <div class="dm-hint">点击实体查看推荐表 · 拖拽画布平移 · Ctrl/⌘ + 滚轮缩放 · 节点只读不可拖动</div>
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
          :description="view === 'all' ? '暂无在册表（仓库权威目录中该实体没有对应物理表）' : `当前视角「${VIEW_LABELS[view]}」下没有推荐/兜底表（切回「全部」或在下方其他视角查看）`"
        />
        <a-space v-else direction="vertical" fill :size="10">
          <AssetCard
            v-for="t in visibleInView"
            :key="t.name"
            :title="t.name"
            :type="TIER_LABELS[t.tier]"
            :type-color="TIER_COLORS[t.tier]"
            :description="t.reason"
            :meta-lines="[`${t.cnName} · ${t.layer} · ${t.fieldCount} 字段 · 热度 ${t.heat}`, `命中视角：${matchedViews(t).join(' / ') || '无'} · 责任人 ${t.owner}`]"
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
          <a-divider orientation="left">其他视角（当前视角未命中）</a-divider>
          <a-collapse :default-active-key="[]">
            <a-collapse-item key="out" :header="`${outViewTables.length} 张未命中「${VIEW_LABELS[view]}」视角的表`">
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
  deriveEntities, deriveRelations, deriveTables, tablesOfEntity, fieldsOfTable, entityName,
  viewHit, viewCountsOf, countByView, VIEW_LABELS,
  TIER_LABELS, TIER_COLORS, type DemoEntity, type DemoTable, type DemoView
} from '../data/derive'

const entities = deriveEntities()
const relations = computed(() => relationState.value)
const tables = deriveTables()

const VIEW_KEYS: DemoView[] = ['biz', 'risk', 'market', 'tech']
const VIEW_OPTIONS: DemoView[] = ['all', ...VIEW_KEYS]

const graphRef = ref<InstanceType<typeof RelationGraph>>()
const drawerVisible = ref(false)
const activeEntity = ref<DemoEntity | null>(null)
const activeTable = ref<DemoTable | null>(null)
const rankdir = ref<'TB' | 'LR'>('TB')
const view = ref<DemoView>('all')

const entityTables = computed(() => activeEntity.value ? tablesOfEntity(activeEntity.value.id, tables) : [])
const visibleTables = computed(() => entityTables.value.filter(t => t.tier !== 'tech'))
const techTables = computed(() => entityTables.value.filter(t => t.tier === 'tech'))
const visibleInView = computed(() => view.value === 'all'
  ? visibleTables.value
  : visibleTables.value.filter(t => viewHit(t, view.value)))
const techInView = computed(() => view.value === 'all'
  ? techTables.value
  : techTables.value.filter(t => viewHit(t, view.value)))
const outViewTables = computed(() => view.value === 'all'
  ? []
  : entityTables.value.filter(t => !viewHit(t, view.value)))
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

function toggleView (v: DemoView) {
  view.value = view.value === v ? 'all' : v
}

function onNodeClick (entityId: string) {
  if (!entityId) {
    drawerVisible.value = false
    activeEntity.value = null
    activeTable.value = null
    return
  }
  activeEntity.value = entities.find(e => e.id === entityId) ?? null
  activeTable.value = null
  drawerVisible.value = true
}

watch(drawerVisible, () => nextTick(() => graphRef.value?.fit()))

function backToChain () {
  drawerVisible.value = false
  activeEntity.value = null
  activeTable.value = null
  graphRef.value?.reset()
}
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
.dm-crumb-root {
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
