<template>
  <div class="dm-compare">
    <a-alert type="normal" class="dm-compare-note">
      步骤数与耗时是<b>待盲测填入的变量</b>，不是已实测结论。可在下方直接改数，页面即时重算差值。
    </a-alert>

    <a-row :gutter="16">
      <a-col :span="12">
        <a-card title="改造前 · 平铺搜索">
          <a-space direction="vertical" fill :size="14">
            <a-statistic title="步骤数" :value="oldSteps" />
            <a-statistic title="耗时（分钟）" :value="oldMinutes" :precision="1" />
            <a-input-number v-model="oldSteps" :min="1" :max="50" size="small" />
            <a-input-number v-model="oldMinutes" :min="0.5" :max="120" :step="0.5" size="small" />
            <a-typography-paragraph type="secondary" class="dm-flow">
              搜表名 → 翻列表 → 逐张点详情 → 比对分层与口径 → 问责任人 → 选定
            </a-typography-paragraph>
          </a-space>
        </a-card>
      </a-col>
      <a-col :span="12">
        <a-card title="改造后 · 实体图下钻">
          <a-space direction="vertical" fill :size="14">
            <a-statistic title="步骤数" :value="newSteps" />
            <a-statistic title="耗时（分钟）" :value="newMinutes" :precision="1" />
            <a-input-number v-model="newSteps" :min="1" :max="50" size="small" />
            <a-input-number v-model="newMinutes" :min="0.5" :max="120" :step="0.5" size="small" />
            <a-typography-paragraph type="secondary" class="dm-flow">
              点业务实体 → 看推荐表（三档已排好）→ 点表见字段 → 选定
            </a-typography-paragraph>
          </a-space>
        </a-card>
      </a-col>
    </a-row>

    <a-row :gutter="16" class="dm-delta">
      <a-col :span="8">
        <a-statistic title="步骤减少" :value="oldSteps - newSteps" />
      </a-col>
      <a-col :span="8">
        <a-statistic title="耗时减少（分钟）" :value="Math.max(0, oldMinutes - newMinutes)" :precision="1" />
      </a-col>
      <a-col :span="8">
        <a-statistic title="降幅" :value="dropPct" :precision="0" suffix="%" />
      </a-col>
    </a-row>

    <a-card title="结构事实（来自同一份权威目录，非估算）">
      <a-space :size="24" wrap>
        <a-statistic title="业务实体" :value="entities.length" />
        <a-statistic title="实体关系" :value="relations.length" />
        <a-statistic title="在册表" :value="tables.length" />
        <a-statistic title="推荐表" :value="recommended" />
        <a-statistic title="明细兜底" :value="fallback" />
        <a-statistic title="未归类（如实展示）" :value="unclassified" />
      </a-space>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { deriveEntities, deriveRelations, deriveTables, unclassifiedTables } from '../data/derive'

const entities = deriveEntities()
const relations = deriveRelations()
const tables = deriveTables()

const oldSteps = ref(6)
const oldMinutes = ref(12)
const newSteps = ref(3)
const newMinutes = ref(3)

const recommended = tables.filter(t => t.tier === 'recommended').length
const fallback = tables.filter(t => t.tier === 'fallback').length
const unclassified = unclassifiedTables(tables).length
const dropPct = computed(() => oldMinutes.value > 0
  ? Math.round((1 - newMinutes.value / oldMinutes.value) * 100)
  : 0)
</script>

<style scoped>
.dm-compare {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.dm-flow {
  margin-bottom: 0;
  font-size: 12px;
}
.dm-delta {
  margin-top: 2px;
}
</style>
