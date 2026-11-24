<template>
  <div class="classify-sources-page">
    <PageHeader title="数据分级分类" sub-title="按数据源管理字段的分级分类标签">
      <template #extra>
        <a-space>
          <a-tag :color="roleDef?.color">操作身份：{{ roleDef?.label }}</a-tag>
          <a-tag :color="auth.canEdit ? 'arcoblue' : 'gray'">{{ auth.label }} · {{ scopeLabel }}</a-tag>
          <a-button size="small" @click="goApproval">
            <template #icon><icon-common /></template>
            分级变更审批台
          </a-button>
        </a-space>
      </template>
    </PageHeader>

    <!-- 统计卡（均按当前身份可见范围统计，口径与表列表页一致） -->
    <a-row :gutter="16" class="stats-row">
      <a-col :span="6">
        <a-card>
          <a-statistic title="总表数（可见）" :value="stats.total" :value-style="{ color: '#165DFF' }" />
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card>
          <a-statistic title="已分级表数" :value="stats.classified" :value-style="{ color: '#52C41A' }">
            <template #suffix>
              <span style="font-size: 14px; color: #86909c">/ {{ stats.total }}</span>
            </template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card>
          <a-statistic
            v-if="auth.seePendingStats"
            title="待分级表数"
            :value="stats.pending"
            :value-style="{ color: '#FA8C16' }"
          />
          <a-statistic
            v-else
            title="已定级字段数"
            :value="stats.classifiedFieldTotal"
            :value-style="{ color: '#FA8C16' }"
          />
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card>
          <a-statistic title="整体覆盖率" :value="stats.avgCoverage" :precision="1">
            <template #suffix>%</template>
          </a-statistic>
        </a-card>
      </a-col>
    </a-row>

    <!-- 数据源卡片 -->
    <div class="section-title">
      <h3>数据源</h3>
      <span class="section-subtitle">点击进入查看表列表与字段分级 · 表数与覆盖率已按当前身份「{{ auth.label }}」可见范围统计</span>
    </div>
    <a-row :gutter="[16, 16]">
      <a-col v-for="sys in systems" :key="sys.id" :xs="24" :sm="12" :md="8" :lg="8">
        <a-card hoverable class="system-card" @click="goToTables(sys)">
          <template #title>
            <a-space>
              <component :is="getIcon(sys.icon)" />
              <span class="card-title">{{ sys.name }}</span>
              <a-tag v-if="auth.seePendingStats && sys.visible.pending > 0" color="orange" size="small">
                {{ sys.visible.pending }} 张待分级
              </a-tag>
              <a-tag v-else-if="sys.visible.total === 0" color="gray" size="small">无可见表</a-tag>
            </a-space>
          </template>
          <a-descriptions :column="1" size="small">
            <a-descriptions-item label="表数量">
              <a-tag color="arcoblue">{{ sys.visible.total }} 张</a-tag>
              <span v-if="sys.visible.total !== sys.tableCount" class="scope-sub">（全部 {{ sys.tableCount }} 张）</span>
            </a-descriptions-item>
            <a-descriptions-item label="字段总数">
              <a-tag>{{ sys.visibleFieldCount }}</a-tag>
              <span class="scope-sub">已定级 {{ sys.visible.classifiedFieldTotal }} 个</span>
            </a-descriptions-item>
            <a-descriptions-item label="分级分布">
              <a-space :size="4">
                <a-tag v-for="(cnt, lv) in sys.visibleDistribution" :key="lv" :color="SENSITIVITY_COLORS[lv as SensitivityLevel]" size="small">
                  {{ lv }}×{{ cnt }}
                </a-tag>
                <span v-if="sys.visible.pendingFieldTotal" class="scope-sub">待分级×{{ sys.visible.pendingFieldTotal }}</span>
              </a-space>
            </a-descriptions-item>
            <a-descriptions-item label="说明">{{ sys.description }}</a-descriptions-item>
          </a-descriptions>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup lang="ts">
/**
 * 数据分级 · 数据源列表
 *
 * 2026-11：数据源/统计改为读 ClassifyStore（响应式，审批通过落地后这里同步刷新），
 * 并按当前角色的数据权限档位（classify-permission）裁剪可见表，避免与表列表页口径漂移。
 */
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components-dca/common/PageHeader.vue'
import { useRoleStore } from '@/stores-dca/role'
import { ROLE_DEFINITIONS } from '@/types-dca/roles'
import { ClassifyStore, type ClassifySystemView, type ClassifyStats } from '@/mock-shared/classify-store'
import { resolveClassifyAuth, scopeText, PERM_APPROVAL_PATH } from '@/mock-shared/classify-permission'
import { SENSITIVITY_COLORS } from '@/mock-shared/classify-constants'
import type { SensitivityLevel } from '@/mock-shared/classify-types'
import {
  IconStorage, IconRobot, IconNotification, IconCustomerService, IconSafe, IconCommon
} from '@arco-design/web-vue/es/icon'

const router = useRouter()
const roleStore = useRoleStore()
const auth = computed(() => resolveClassifyAuth(roleStore.currentRole))
const roleDef = computed(() => ROLE_DEFINITIONS[roleStore.currentRole])
const scopeLabel = computed(() => scopeText(auth.value))

const systems = computed(() =>
  ClassifyStore.systems().map(sys => {
    const tables = ClassifyStore.filterTables(sys.tables, auth.value.schemas)
    const visible = ClassifyStore.statsFor(tables)
    return {
      ...sys,
      visible,
      visibleFieldCount: tables.reduce((s, t) => s + t.fields.length, 0),
      // 分布也按可见表重算，避免「无可见表」卡片还挂着全量 L1–L4 自相矛盾
      visibleDistribution: ClassifyStore.distributionOf(tables)
    }
  })
)

/** 顶部统计 = 各数据源可见表汇总（与卡片相加一致，不再读写死的 classifyStats） */
const stats = computed<ClassifyStats>(() =>
  ClassifyStore.statsFor(systems.value.flatMap(s => ClassifyStore.filterTables(s.tables, auth.value.schemas)))
)

const iconMap: Record<string, any> = {
  'icon-storage': IconStorage,
  'icon-robot': IconRobot,
  'icon-notification': IconNotification,
  'icon-service': IconCustomerService,
  'icon-safe': IconSafe
}
const getIcon = (name: string) => iconMap[name] || IconStorage

const goToTables = (sys: ClassifySystemView) => {
  router.push(`/management/metadata/classify/tables/${sys.id}`)
}
const goApproval = () => router.push(PERM_APPROVAL_PATH)

onMounted(() => {
  // 本页是分级模块入口，URL 直达时也要恢复演示身份（幂等）
  roleStore.initFromStorage()
})
</script>

<style scoped>
.classify-sources-page { padding: 16px 24px 24px; }
.stats-row { margin-bottom: 24px; }
.section-title { margin: 8px 0 16px; display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; }
.section-title h3 { margin: 0; font-size: 16px; font-weight: 600; }
.section-subtitle { color: #86909c; font-size: 13px; }
.system-card { cursor: pointer; transition: all 0.2s; }
.system-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); }
.card-title { font-size: 15px; font-weight: 600; }
.scope-sub { margin-left: 6px; font-size: 12px; color: #86909c; }
</style>
