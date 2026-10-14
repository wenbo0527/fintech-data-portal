<template>
  <!-- @prd: data-standard -->
  <!--
    2026-10-13:与"标准代码管理"(codes)页保持一致 —— 单卡片 + 声明式表格列。
    页面即详情:列表直接展示行内数据标准 20 个口径字段,仅做标准化展示。
    本定位为只读展示页:无审批/弃用/打回/新建/编辑/删除,维护统一走全量上传(V2 + U1-U4)。
    对齐 PRD:R01 展示字段 / R02 搜索+主题+一二级分类筛选 / R03-R05 关联跳转(新标签页、不存在置灰)
              / V1 默认最近更新时间倒序 + 编号/名称可排序 / V2 只读。
  -->
  <div class="standards-page">
    <a-card class="general-card" title="数据标准管理">
      <a-row style="margin-bottom: 12px">
        <a-col :span="12">
          <a-space>
            <a-tag color="arcoblue">共 {{ standards.length }} 条标准</a-tag>
            <a-tag v-if="filteredStandards.length !== standards.length" color="orange">
              筛选后 {{ filteredStandards.length }} 条
            </a-tag>
          </a-space>
        </a-col>
        <a-col :span="12" style="text-align: right">
          <a-space>
            <!-- 权限约束:仅数据标准管理员(数据治理者)可下载模板与执行全量上传,其余角色只读 -->
            <a-tooltip v-if="!canMaintain" content="当前角色无维护权限，仅数据标准管理员可下载模板并执行全量上传（可在右上角切换「数据治理者」角色）">
              <a-button type="primary" disabled>
                <template #icon><icon-import /></template>
                全量导入
              </a-button>
            </a-tooltip>
            <a-button v-else type="primary" @click="importVisible = true">
              <template #icon><icon-import /></template>
              全量导入
            </a-button>
          </a-space>
        </a-col>
      </a-row>

      <!-- R02:关键词 + 主题 + 一级分类 + 二级分类 + 状态 组合筛选 -->
      <a-row :gutter="8" style="margin-bottom: 16px">
        <a-col :span="4">
          <a-select v-model="filterTheme" placeholder="主题" allow-clear size="large">
            <a-option v-for="t in themes" :key="t" :value="t">{{ t }}</a-option>
          </a-select>
        </a-col>
        <a-col :span="4">
          <a-select v-model="filterL1" placeholder="一级分类" allow-clear size="large">
            <a-option v-for="c in categoryL1Options" :key="c" :value="c">{{ c }}</a-option>
          </a-select>
        </a-col>
        <a-col :span="4">
          <a-select v-model="filterL2" placeholder="二级分类" allow-clear size="large">
            <a-option v-for="c in categoryL2Options" :key="c" :value="c">{{ c }}</a-option>
          </a-select>
        </a-col>
        <a-col :span="4">
          <a-select v-model="filterStatus" placeholder="状态" allow-clear size="large">
            <a-option v-for="s in statusOptions" :key="s.value" :value="s.value">{{ s.label }}</a-option>
          </a-select>
        </a-col>
        <a-col :span="7">
          <a-input-search
            v-model="keyword"
            placeholder="搜索标准编号 / 中文名称 / 英文全称 / 英文简称"
            allow-clear
            size="large"
          />
        </a-col>
        <a-col :span="1" style="text-align: right">
          <a-button size="large" @click="resetFilters">
            <template #icon><icon-refresh /></template>
          </a-button>
        </a-col>
      </a-row>

      <a-table
        :data="filteredStandards"
        :pagination="{ pageSize: 10, showTotal: true, sizeCanChange: false }"
        :scroll="{ x: 3200, y: 560 }"
        row-key="code"
        stripe
        size="medium"
      >
        <template #columns>
          <a-table-column title="标准编号" data-index="standardNo" :width="120" sortable>
            <template #cell="{ record }">
              <span class="mono">{{ record.standardNo }}</span>
            </template>
          </a-table-column>
          <a-table-column title="主题" data-index="theme" :width="90">
            <template #cell="{ record }">
              <a-tag>{{ record.theme }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column title="一级分类" data-index="categoryL1" :width="130" />
          <a-table-column title="二级分类" data-index="categoryL2" :width="130" />
          <a-table-column title="归口管理部门" data-index="manageDept" :width="150" />
          <a-table-column title="中文名称" data-index="cnName" :width="160" sortable />
          <a-table-column title="英文全称" data-index="enFullName" :width="220" ellipsis tooltip />
          <a-table-column title="英文简称" data-index="enAbbr" :width="140" ellipsis tooltip />
          <a-table-column title="词素分析" data-index="morpheme" :width="220" ellipsis tooltip />
          <a-table-column title="业务定义" data-index="bizDefinition" :width="260" ellipsis tooltip />
          <!-- R03/R04/R05:域 → 标准域列表(新标签页按关键词定位);目标不存在则置灰 + 悬停说明 -->
          <a-table-column title="域" data-index="domain" :width="150">
            <template #cell="{ record }">
              <a-link v-if="domainState(record.domain) === 'ok'" @click="openDomain(record.domain)">
                {{ record.domain }}
              </a-link>
              <a-tooltip
                v-else-if="domainState(record.domain) === 'missing'"
                content="关联标准域不存在，暂不可跳转（R04）"
              >
                <span class="link-disabled">{{ record.domain }}</span>
              </a-tooltip>
              <span v-else>-</span>
            </template>
          </a-table-column>
          <a-table-column title="数据类型" data-index="dataType" :width="110">
            <template #cell="{ record }">
              <a-tag color="cyan">{{ record.dataType }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column title="业务数据类型" data-index="bizDataType" :width="120" />
          <a-table-column title="长度" data-index="length" :width="80" align="center" />
          <a-table-column title="精度" data-index="precision" :width="80" align="center" />
          <a-table-column title="是否代码" data-index="isCode" :width="100" align="center">
            <template #cell="{ record }">
              <a-tag :color="record.isCode ? 'orangered' : 'gray'">
                {{ record.isCode ? '是' : '否' }}
              </a-tag>
            </template>
          </a-table-column>
          <a-table-column title="标准代码编号" data-index="stdCodeNo" :width="160">
            <template #cell="{ record }">
              <a-link v-if="codeState(record) === 'ok'" @click="openCode(record.stdCodeNo)">
                {{ record.stdCodeNo }}
              </a-link>
              <a-tooltip
                v-else-if="codeState(record) === 'missing'"
                content="关联标准代码不存在，暂不可跳转（R04）"
              >
                <span class="link-disabled">{{ record.stdCodeNo }}</span>
              </a-tooltip>
              <span v-else>-</span>
            </template>
          </a-table-column>
          <a-table-column title="标准代码中文名称" data-index="stdCodeName" :width="170" ellipsis tooltip />
          <a-table-column title="标准来源" data-index="stdSource" :width="110">
            <template #cell="{ record }">
              <a-tag color="arcoblue">{{ record.stdSource }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column title="标准依据" data-index="stdBasis" :width="280" ellipsis tooltip />
          <a-table-column title="状态" data-index="status" :width="100">
            <template #cell="{ record }">
              <a-tag :color="statusColor(record.status)">{{ statusLabel(record.status) }}</a-tag>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>

    <!-- 全量上传通道(U1-U4 / E3) -->
    <DataStandardImportModal
      v-model:visible="importVisible"
      title="全量导入数据标准"
      type="standards"
      description="请下载数据标准模板，填写完成后上传；模板列与展示字段一致，以标准编号为唯一键（R06/R07）。"
      @success="handleImportSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useRoleStore } from '@/stores-dca/role'
import DataStandardImportModal from '../../../components/modals/DataStandardImportModal.vue'
import {
  StandardStore,
  DomainStore,
  StdCodeStore,
  STANDARD_STATUS_LIST,
  STANDARD_STATUS_LABEL,
  STANDARD_STATUS_COLOR,
  type Standard,
  type StandardStatus
} from '@/mock-shared/standard-store'

const route = useRoute()
const router = useRouter()
const roleStore = useRoleStore()

// 三-关键约束:权限-数据标准管理员(演示口径映射到「数据治理者」角色)才可下载模板与全量上传
const canMaintain = computed(() => roleStore.currentRole === 'data_admin')

const standards = ref<Standard[]>([])
// 支持从标准域/标准代码页「查看标准」新标签页带 ?keyword=STD-xxx 直达定位（R05 到达态）
const keyword = ref(typeof route.query.keyword === 'string' ? route.query.keyword : '')
const filterTheme = ref<string | undefined>(undefined)
const filterL1 = ref<string | undefined>(undefined)
const filterL2 = ref<string | undefined>(undefined)
const filterStatus = ref<string | undefined>(undefined)
const importVisible = ref(false)

function refresh() {
  standards.value = StandardStore.getStandards()
}

onMounted(refresh)

// 下拉选项全部由数据派生，避免与 mock 口径脱节
const themes = computed(() =>
  Array.from(new Set(standards.value.map(s => s.theme).filter(Boolean) as string[])).sort()
)
const categoryL1Options = computed(() =>
  Array.from(new Set(standards.value.map(s => s.categoryL1).filter(Boolean) as string[])).sort()
)
const categoryL2Options = computed(() => {
  const pool = filterL1.value
    ? standards.value.filter(s => s.categoryL1 === filterL1.value)
    : standards.value
  return Array.from(new Set(pool.map(s => s.categoryL2).filter(Boolean) as string[])).sort()
})
const statusOptions = STANDARD_STATUS_LIST.map(s => ({ value: s, label: STANDARD_STATUS_LABEL[s] }))

// 一级分类变更后清掉不再适用的二级分类筛选，防止出现空结果集
watch(filterL1, () => {
  if (filterL2.value && !categoryL2Options.value.includes(filterL2.value)) filterL2.value = undefined
})

// V1:默认按最近更新时间倒序;R02:关键词命中标准编号/中文名称/英文全称/英文简称
const filteredStandards = computed(() => {
  const k = keyword.value.trim().toLowerCase()
  return standards.value
    .filter(s => {
      if (k) {
        const hit =
          (s.standardNo || s.code).toLowerCase().includes(k) ||
          (s.cnName || s.name).toLowerCase().includes(k) ||
          (s.enFullName || '').toLowerCase().includes(k) ||
          (s.enAbbr || '').toLowerCase().includes(k)
        if (!hit) return false
      }
      if (filterTheme.value && s.theme !== filterTheme.value) return false
      if (filterL1.value && s.categoryL1 !== filterL1.value) return false
      if (filterL2.value && s.categoryL2 !== filterL2.value) return false
      if (filterStatus.value && s.status !== filterStatus.value) return false
      return true
    })
    .sort((a, b) => (b.updateTime || '').localeCompare(a.updateTime || ''))
})

function statusColor(s: StandardStatus) {
  return STANDARD_STATUS_COLOR[s] || 'gray'
}
function statusLabel(s: StandardStatus) {
  return STANDARD_STATUS_LABEL[s] || s
}
function resetFilters() {
  keyword.value = ''
  filterTheme.value = undefined
  filterL1.value = undefined
  filterL2.value = undefined
  filterStatus.value = undefined
}

// ===== R03/R04/R05:关联跳转(新标签页,保留当前位置;目标不存在 → 置灰不可点) =====
type LinkState = 'ok' | 'missing' | 'none'
function domainState(domain?: string): LinkState {
  if (!domain || domain === '-') return 'none'
  return DomainStore.exists(domain) ? 'ok' : 'missing'
}
function codeState(record: Standard): LinkState {
  if (!record.isCode || !record.stdCodeNo || record.stdCodeNo === '-') return 'none'
  return StdCodeStore.exists(record.stdCodeNo) ? 'ok' : 'missing'
}
function openDomain(domain: string) {
  const { href } = router.resolve({
    name: 'data-standard-domains',
    query: { keyword: domain }
  })
  window.open(href, '_blank')
}
function openCode(stdCodeNo: string) {
  const { href } = router.resolve({
    name: 'data-standard-codes',
    query: { keyword: stdCodeNo }
  })
  window.open(href, '_blank')
}

function handleImportSuccess() {
  refresh()
}
</script>

<style lang="scss" scoped>
.standards-page {
  padding: 20px;

  .mono {
    font-family: 'Menlo', 'Consolas', monospace;
  }

  .link-disabled {
    color: var(--color-text-4);
    cursor: not-allowed;
    border-bottom: 1px dashed var(--color-border-2);
  }
}
</style>
