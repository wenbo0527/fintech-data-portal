<template>
  <!-- @prd: classify.tasks -->
  <div class="classify-tasks-page">
    <PageHeader title="分级分类任务" sub-title="按分级状态管理待办，已分级状态汇总查看" />

    <a-tabs default-active-key="pending" type="rounded" size="large">
      <!-- 待分级 Tab -->
      <a-tab-pane key="pending">
        <template #title>待分级 <a-tag color="orange" size="small">{{ pendingTasks.length }}</a-tag></template>

        <!-- 统计行 -->
        <a-row :gutter="16" class="stats-row">
          <a-col :span="6">
            <a-card>
              <a-statistic title="待分级表数" :value="pendingTasks.length" :value-style="{ color: '#FA8C16' }" />
            </a-card>
          </a-col>
          <a-col :span="6">
            <a-card>
              <a-statistic title="待分级字段数" :value="pendingFieldCount" :value-style="{ color: '#FA8C16' }" />
            </a-card>
          </a-col>
          <a-col :span="6">
            <a-card>
              <a-statistic title="涉及系统" :value="pendingSystems.length" :value-style="{ color: '#165DFF' }" />
            </a-card>
          </a-col>
          <a-col :span="6">
            <a-card>
              <a-statistic title="最高优先级" :value="('L4 待确认' as unknown) as number" :value-style="{ color: '#F53F3F' }" />
            </a-card>
          </a-col>
        </a-row>

        <a-card>
          <a-table
            :data="pendingTasks"
            :pagination="{ pageSize: 10, showTotal: true }"
            row-key="key"
            :bordered="false"
          >
            <template #columns>
              <a-table-column title="系统" :width="160">
                <template #cell="{ record }">
                  <a-tag color="arcoblue">{{ record.system }}</a-tag>
                </template>
              </a-table-column>
              <a-table-column title="Schema" :width="120">
                <template #cell="{ record }">
                  <span class="schema-text">{{ record.schema }}</span>
                </template>
              </a-table-column>
              <a-table-column title="表名" :width="200">
                <template #cell="{ record }">
                  <a-link @click="goToTable(record)">{{ record.table_name }}</a-link>
                </template>
              </a-table-column>
              <a-table-column title="表注释" :width="220">
                <template #cell="{ record }">
                  <a-tooltip :content="record.table_comment">
                    <span class="comment-cell">{{ record.table_comment }}</span>
                  </a-tooltip>
                </template>
              </a-table-column>
              <a-table-column title="字段数" :width="80">
                <template #cell="{ record }">
                  <a-tag>{{ record.totalFields }}</a-tag>
                </template>
              </a-table-column>
              <a-table-column title="待分级" :width="80">
                <template #cell="{ record }">
                  <a-tag color="orange">{{ record.pendingFields }}</a-tag>
                </template>
              </a-table-column>
              <a-table-column title="进度" :width="200">
                <template #cell="{ record }">
                  <a-progress
                    :percent="record.coverage / 100"
                    :stroke-color="record.coverage >= 80 ? '#52C41A' : '#FA8C16'"
                    :format="(p: number) => `${Math.round(p * 100)}%`"
                  />
                </template>
              </a-table-column>
              <a-table-column title="负责人" :width="100">
                <template #cell="{ record }">
                  <a-avatar :size="22" style="background: #165DFF">{{ record.owner?.charAt(0) }}</a-avatar>
                  <span style="margin-left: 6px">{{ record.owner }}</span>
                </template>
              </a-table-column>
              <a-table-column title="操作" :width="140" fixed="right">
                <template #cell="{ record }">
                  <a-button type="text" size="small" @click="goToTable(record)">去分级</a-button>
                </template>
              </a-table-column>
            </template>
          </a-table>
        </a-card>
      </a-tab-pane>

      <!-- 已分级 Tab -->
      <a-tab-pane key="done">
        <template #title>已分级 <a-tag color="green" size="small">{{ doneTasks.length }}</a-tag></template>

        <a-row :gutter="16" class="stats-row">
          <a-col :span="6">
            <a-card>
              <a-statistic title="已分级表数" :value="doneTasks.length" :value-style="{ color: '#52C41A' }" />
            </a-card>
          </a-col>
          <a-col :span="6">
            <a-card>
              <a-statistic title="已分级字段数" :value="doneFieldCount" :value-style="{ color: '#52C41A' }" />
            </a-card>
          </a-col>
          <a-col :span="6">
            <a-card>
              <a-statistic title="整体覆盖率" :value="overallCoverage" :precision="1" :value-style="{ color: '#52C41A' }">
                <template #suffix>%</template>
              </a-statistic>
            </a-card>
          </a-col>
          <a-col :span="6">
            <a-card>
              <a-statistic title="L4 高敏字段" :value="doneL4Count" :value-style="{ color: '#F53F3F' }" />
            </a-card>
          </a-col>
        </a-row>

        <a-card>
          <a-table
            :data="doneTasks"
            :pagination="{ pageSize: 10, showTotal: true }"
            row-key="key"
            :bordered="false"
          >
            <template #columns>
              <a-table-column title="系统" :width="160">
                <template #cell="{ record }">
                  <a-tag color="arcoblue">{{ record.system }}</a-tag>
                </template>
              </a-table-column>
              <a-table-column title="Schema" :width="120">
                <template #cell="{ record }">
                  <span class="schema-text">{{ record.schema }}</span>
                </template>
              </a-table-column>
              <a-table-column title="表名" :width="200">
                <template #cell="{ record }">
                  <a-link @click="goToTable(record)">{{ record.table_name }}</a-link>
                </template>
              </a-table-column>
              <a-table-column title="分级分布" :width="280">
                <template #cell="{ record }">
                  <a-space :size="4" wrap>
                    <a-tag v-for="lv in (['L1', 'L2', 'L3', 'L4'] as const)" :key="lv" :color="SENSITIVITY_COLORS[lv]" size="small">
                      {{ lv }} × {{ record.dist[lv] }}
                    </a-tag>
                  </a-space>
                </template>
              </a-table-column>
              <a-table-column title="覆盖率" :width="120">
                <template #cell="{ record }">
                  <a-tag color="green">{{ record.coverage }}%</a-tag>
                </template>
              </a-table-column>
              <a-table-column title="负责人" :width="100">
                <template #cell="{ record }">
                  <a-avatar :size="22" style="background: #165DFF">{{ record.owner?.charAt(0) }}</a-avatar>
                  <span style="margin-left: 6px">{{ record.owner }}</span>
                </template>
              </a-table-column>
              <a-table-column title="最近更新" :width="120">
                <template #cell="{ record }">
                  <span class="time-text">{{ record.updated_at }}</span>
                </template>
              </a-table-column>
              <a-table-column title="操作" :width="120" fixed="right">
                <template #cell="{ record }">
                  <a-button type="text" size="small" @click="goToTable(record)">查看</a-button>
                </template>
              </a-table-column>
            </template>
          </a-table>
        </a-card>
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components-dca/common/PageHeader.vue'
import { classifySystemsData } from '@/mock-shared/classify-modules'
import { SENSITIVITY_COLORS } from '@/mock-shared/classify-constants'

const router = useRouter()

// 构造所有表的统一结构（带待分级/已分级判定 + 字段分布）
const allTables = computed(() => {
  const arr: any[] = []
  classifySystemsData.forEach(sys => {
    sys.tables.forEach(t => {
      const dist: any = { L1: 0, L2: 0, L3: 0, L4: 0 }
      t.fields.forEach(f => { dist[f.sensitivity_level]++ })
      const total = t.fields.length
      const pending = total - (dist.L1 + dist.L2 + dist.L3 + dist.L4)
      const covered = total - pending
      const coverage = total === 0 ? 0 : Math.round((covered / total) * 100)
      arr.push({
        key: `${sys.id}__${t.table_name}`,
        system: sys.name,
        systemId: sys.id,
        schema: t.schema,
        table_name: t.table_name,
        table_comment: t.table_comment,
        owner: t.owner,
        updated_at: t.updated_at,
        totalFields: total,
        pendingFields: pending,
        coverage,
        dist,
        isDone: coverage === 100
      })
    })
  })
  return arr
})

const pendingTasks = computed(() => allTables.value.filter(t => !t.isDone))
const doneTasks = computed(() => allTables.value.filter(t => t.isDone))

const pendingFieldCount = computed(() => pendingTasks.value.reduce((s, t) => s + t.pendingFields, 0))
const doneFieldCount = computed(() => doneTasks.value.reduce((s, t) => s + t.totalFields, 0))
const doneL4Count = computed(() => doneTasks.value.reduce((s, t) => s + t.dist.L4, 0))
const pendingSystems = computed(() => Array.from(new Set(pendingTasks.value.map(t => t.system))))
const overallCoverage = computed(() => {
  const all = allTables.value
  if (all.length === 0) return 0
  const sum = all.reduce((s, t) => s + t.coverage, 0)
  return Math.round((sum / all.length) * 10) / 10
})

const goToTable = (t: any) => {
  router.push(`/management/metadata/classify/table/${t.systemId}/${t.schema}/${t.table_name}`)
}
</script>

<style scoped>
.classify-tasks-page { padding: 16px 24px 24px; }
.stats-row { margin-bottom: 16px; }
.schema-text { font-family: monospace; font-size: 12px; color: #4e5969; }
.comment-cell { display: inline-block; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: middle; }
.time-text { color: #4e5969; font-size: 12px; }
</style>
