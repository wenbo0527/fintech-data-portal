<template>
  <div class="dm-compare">
    <a-alert type="normal" class="dm-compare-note">
      步骤数与耗时是<b>待盲测填入的变量</b>，不是已实测结论。下方「演示用」两栏可直接改数，差值即时重算。
    </a-alert>

    <a-row :gutter="16">
      <a-col :span="12">
        <a-card class="dm-compare-card dm-compare-card--old">
          <template #title>
            <a-space :size="8">
              <a-tag color="red" size="small">改造前</a-tag>
              <span>平铺搜索</span>
            </a-space>
          </template>
          <div class="dm-kpis">
            <div class="dm-kpi">
              <div class="dm-kpi-label">步骤数</div>
              <div class="dm-kpi-value">{{ oldSteps }}</div>
            </div>
            <div class="dm-kpi">
              <div class="dm-kpi-label">耗时</div>
              <div class="dm-kpi-value">{{ oldMinutes }}<span class="dm-kpi-unit">分钟</span></div>
            </div>
          </div>
          <div class="dm-flow">搜表名 → 翻列表 → 逐张点详情 → 比对分层与口径 → 问责任人 → 选定</div>
          <div class="dm-tuning">
            <span class="dm-muted">演示用：</span>
            步骤
            <a-input-number v-model="oldSteps" :min="1" :max="50" size="mini" class="dm-num" />
            耗时
            <a-input-number v-model="oldMinutes" :min="0.5" :max="120" :step="0.5" size="mini" class="dm-num" />
          </div>
        </a-card>
      </a-col>
      <a-col :span="12">
        <a-card class="dm-compare-card dm-compare-card--new">
          <template #title>
            <a-space :size="8">
              <a-tag color="green" size="small">改造后</a-tag>
              <span>实体图下钻</span>
            </a-space>
          </template>
          <div class="dm-kpis">
            <div class="dm-kpi">
              <div class="dm-kpi-label">步骤数</div>
              <div class="dm-kpi-value">{{ newSteps }}</div>
            </div>
            <div class="dm-kpi">
              <div class="dm-kpi-label">耗时</div>
              <div class="dm-kpi-value">{{ newMinutes }}<span class="dm-kpi-unit">分钟</span></div>
            </div>
          </div>
          <div class="dm-flow">点业务实体 → 看推荐表（三档已排好）→ 点表见字段 → 选定</div>
          <div class="dm-tuning">
            <span class="dm-muted">演示用：</span>
            步骤
            <a-input-number v-model="newSteps" :min="1" :max="50" size="mini" class="dm-num" />
            耗时
            <a-input-number v-model="newMinutes" :min="0.5" :max="120" :step="0.5" size="mini" class="dm-num" />
          </div>
        </a-card>
      </a-col>
    </a-row>

    <div class="dm-delta">
      <div class="dm-delta-item">
        <span class="dm-delta-label">步骤减少</span>
        <span class="dm-delta-value dm-delta-value--green">{{ oldSteps - newSteps }}</span>
      </div>
      <div class="dm-delta-item">
        <span class="dm-delta-label">耗时减少</span>
        <span class="dm-delta-value dm-delta-value--green">{{ Math.max(0, oldMinutes - newMinutes) }}</span>
        <span class="dm-delta-unit">分钟</span>
      </div>
      <div class="dm-delta-item">
        <span class="dm-delta-label">耗时降幅</span>
        <span class="dm-delta-value dm-delta-value--green">{{ dropPct }}</span>
        <span class="dm-delta-unit">%</span>
      </div>
    </div>

    <a-card title="结构事实（来自同一份权威目录，非估算）">
      <a-row :gutter="16">
        <a-col v-for="s in structural" :key="s.label" :span="4">
          <a-statistic :title="s.label" :value="s.value" :value-style="{ fontSize: '22px', fontWeight: 600 }" />
        </a-col>
      </a-row>
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

const structural = [
  { label: '业务实体', value: entities.length },
  { label: '实体关系', value: relations.length },
  { label: '在册表', value: tables.length },
  { label: '推荐表', value: tables.filter(t => t.tier === 'recommended').length },
  { label: '明细兜底', value: tables.filter(t => t.tier === 'fallback').length },
  { label: '未归类（如实展示）', value: unclassifiedTables(tables).length }
]

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
.dm-compare-card--old {
  border-top: 3px solid #f53f3f;
}
.dm-compare-card--new {
  border-top: 3px solid #00b42a;
}
.dm-kpis {
  display: flex;
  gap: 48px;
}
.dm-kpi-label {
  font-size: 12px;
  color: var(--dca-text-tertiary, #86909c);
}
.dm-kpi-value {
  font-size: 34px;
  font-weight: 600;
  line-height: 1.2;
  color: var(--dca-text-primary, #1d2129);
}
.dm-kpi-unit {
  font-size: 13px;
  font-weight: 400;
  color: var(--dca-text-tertiary, #86909c);
  margin-left: 4px;
}
.dm-flow {
  margin-top: 12px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--dca-text-secondary, #4e5969);
}
.dm-tuning {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px dashed var(--dca-border-light, #e5e6eb);
  font-size: 12px;
  color: var(--dca-text-secondary, #4e5969);
  display: flex;
  align-items: center;
  gap: 8px;
}
.dm-num {
  width: 76px;
}
.dm-muted {
  color: var(--dca-text-tertiary, #86909c);
}
.dm-delta {
  display: flex;
  gap: 16px;
  background: var(--dca-bg-card, #fff);
  border-radius: 4px;
  padding: 14px 20px;
}
.dm-delta-item {
  display: flex;
  align-items: baseline;
  gap: 6px;
  flex: 1;
}
.dm-delta-label {
  font-size: 12px;
  color: var(--dca-text-tertiary, #86909c);
}
.dm-delta-value {
  font-size: 24px;
  font-weight: 600;
}
.dm-delta-value--green {
  color: #00b42a;
}
.dm-delta-unit {
  font-size: 12px;
  color: var(--dca-text-tertiary, #86909c);
}
</style>