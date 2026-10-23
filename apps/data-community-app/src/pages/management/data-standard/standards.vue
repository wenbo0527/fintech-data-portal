<template>
  <!-- @prd: data-standard.standards -->
  <!--
    2026-10-23 按《需求文档:数据管理-数据标准(评审简化版)》重构:
      R01  展示字段 —— 19 个口径字段全部平铺,字段过多时横向滚动(V1)
      R01-1 标准定义(业务含义)为富文本,单元格内截断 2 行,超出部分「展开」查看完整内容
      R02  搜索范围 —— 关键词命中标准编号/标准名称(中)/标准名称(英),叠加所属数据域、
            数据分类、数据分级、标准状态四个组合筛选
      R03  行内跳转 —— 「所属数据域」跳数据域列表并定位;「关联代码集编号」直达代码集详情页
      R04  跳转到达态 —— 目标不存在则置灰不可点并悬停提示
      R05  打开方式 —— 跨资产跳转在新标签页打开,保留当前浏览位置
      V1   列表平铺 / V2 默认按最近更新时间倒序 + 标识字段与名称可排序 + 分页 / V3 只读
      R06/R07 全量上传:模板列与展示字段一致,唯一键为标准编号;E1 引用不存在仅告警
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
            <!-- 权限约束:仅数据标准管理员(演示口径映射到「数据治理者」)可下载模板与执行全量上传,其余角色只读 -->
            <a-tooltip
              v-if="!canMaintain"
              content="当前角色无维护权限,仅数据标准管理员可下载模板并执行全量上传(可在右上角切换「数据治理者」角色)"
            >
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

      <!-- R02:关键词 + 所属数据域 + 数据分类 + 数据分级 + 标准状态 组合筛选 -->
      <a-row :gutter="8" style="margin-bottom: 16px">
        <a-col :span="6">
          <a-select v-model="filterDomain" placeholder="所属数据域" allow-clear size="large">
            <a-option v-for="d in domainOptions" :key="d.code" :value="d.code">
              {{ d.code }} · {{ d.name }}
            </a-option>
          </a-select>
        </a-col>
        <a-col :span="4">
          <a-select v-model="filterCategory" placeholder="数据分类" allow-clear size="large">
            <a-option v-for="c in categoryOptions" :key="c" :value="c">{{ c }}</a-option>
          </a-select>
        </a-col>
        <a-col :span="4">
          <a-select v-model="filterLevel" placeholder="数据分级" allow-clear size="large">
            <a-option v-for="l in levelOptions" :key="l" :value="l">{{ l }}</a-option>
          </a-select>
        </a-col>
        <a-col :span="4">
          <a-select v-model="filterStatus" placeholder="标准状态" allow-clear size="large">
            <a-option v-for="s in statusOptions" :key="s.value" :value="s.value">{{ s.label }}</a-option>
          </a-select>
        </a-col>
        <a-col :span="5">
          <a-input-search
            v-model="keyword"
            placeholder="搜索标准编号 / 标准名称(中) / 标准名称(英)"
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
        :scroll="{ x: 2950, y: 560 }"
        :row-class="rowClass"
        row-key="standardNo"
        stripe
        size="medium"
      >
        <template #columns>
          <a-table-column title="标准编号" data-index="standardNo" :width="120" sortable>
            <template #cell="{ record }">
              <span class="mono">{{ record.standardNo }}</span>
            </template>
          </a-table-column>

          <!-- R03/R04/R05:所属数据域 → 数据域列表并定位(新标签页) -->
          <a-table-column title="所属数据域" data-index="domain" :width="170">
            <template #cell="{ record }">
              <a-link v-if="domainState(record.domain) === 'ok'" @click="openDomain(record.domain)">
                {{ record.domain }}
              </a-link>
              <a-tooltip v-else-if="domainState(record.domain) === 'missing'" content="关联对象不存在">
                <span class="link-disabled">{{ record.domain }}</span>
              </a-tooltip>
              <span v-else>-</span>
            </template>
          </a-table-column>

          <a-table-column title="标准名称(中文)" data-index="cnName" :width="160" sortable>
            <template #cell="{ record }">
              <span>{{ record.cnName }}</span>
            </template>
          </a-table-column>
          <a-table-column title="标准名称(英文)" data-index="enName" :width="220" sortable ellipsis tooltip />

          <!-- R01-1:富文本定义,单元格内截断 2 行,超出部分「展开」 -->
          <a-table-column title="标准定义(业务含义)" data-index="definition" :width="300">
            <template #cell="{ record }">
              <div class="definition-cell" :class="{ expanded: isDefinitionExpanded(record.standardNo) }">
                <div class="definition-text" v-html="record.definition"></div>
                <a-link class="definition-toggle" @click="toggleDefinition(record.standardNo)">
                  {{ isDefinitionExpanded(record.standardNo) ? '收起' : '展开' }}
                </a-link>
              </div>
            </template>
          </a-table-column>

          <a-table-column title="数据类型" data-index="dataType" :width="110">
            <template #cell="{ record }">
              <a-tag color="cyan">{{ record.dataType }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column title="长度/精度" data-index="lengthPrecision" :width="110" align="center" />
          <a-table-column title="是否必填" data-index="required" :width="100" align="center">
            <template #cell="{ record }">
              <a-tag :color="record.required ? 'orangered' : 'gray'">
                {{ record.required ? '是' : '否' }}
              </a-tag>
            </template>
          </a-table-column>
          <a-table-column title="值域/取值规则" data-index="valueRange" :width="220" ellipsis tooltip />

          <!-- R03/R04/R05:关联代码集编号 → 代码集详情页(新标签页直达) -->
          <a-table-column title="关联代码集编号" data-index="codeSetNo" :width="170">
            <template #cell="{ record }">
              <a-link v-if="codeState(record.codeSetNo) === 'ok'" @click="openCodeSet(record.codeSetNo)">
                {{ record.codeSetNo }}
              </a-link>
              <a-tooltip v-else-if="codeState(record.codeSetNo) === 'missing'" content="关联对象不存在">
                <span class="link-disabled">{{ record.codeSetNo }}</span>
              </a-tooltip>
              <span v-else>-</span>
            </template>
          </a-table-column>

          <a-table-column title="数据分类" data-index="dataCategory" :width="120" />
          <a-table-column title="数据分级" data-index="dataLevel" :width="100">
            <template #cell="{ record }">
              <a-tag :color="levelColor(record.dataLevel)">{{ record.dataLevel }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column title="涉及个人信息" data-index="personalInfo" :width="120" align="center">
            <template #cell="{ record }">
              <a-tag :color="record.personalInfo ? 'red' : 'gray'">
                {{ record.personalInfo ? '是' : '否' }}
              </a-tag>
            </template>
          </a-table-column>
          <a-table-column title="责任部门" data-index="ownerDept" :width="140" />
          <a-table-column title="标准状态" data-index="status" :width="110">
            <template #cell="{ record }">
              <a-tag :color="statusColor(record.status)">{{ statusLabel(record.status) }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column title="版本" data-index="version" :width="90" />
          <a-table-column title="生效日期" data-index="effectiveDate" :width="120" />
          <a-table-column title="依据/引用标准" data-index="basis" :width="240" ellipsis tooltip />
          <a-table-column title="备注" data-index="remark" :width="200" ellipsis tooltip>
            <template #cell="{ record }">
              <span>{{ record.remark || '-' }}</span>
            </template>
          </a-table-column>
        </template>

        <!-- 页面状态速查:空结果 —— 空状态插画 + 调整筛选引导 -->
        <template #empty>
          <a-empty description="没有符合条件的数据标准">
            <a-button size="small" @click="resetFilters">重置筛选条件</a-button>
          </a-empty>
        </template>
      </a-table>
    </a-card>

    <!-- 全量上传通道(U1-U4 / U-E1~U-E4 / E1) -->
    <DataStandardImportModal
      v-model:visible="importVisible"
      title="全量导入数据标准"
      type="standards"
      description="请下载数据标准模板,填写完成后上传;模板列与展示字段一致,以标准编号为唯一键(R06/R07)。"
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

// 关键约束:权限-数据标准管理员(演示口径映射到「数据治理者」)才可下载模板与全量上传
const canMaintain = computed(() => roleStore.currentRole === 'data_admin')

const standards = ref<Standard[]>([])
// 支持从数据域/标准代码页「查看标准」新标签页带 ?keyword=STD-xxx 直达定位(R03/R05 到达态)
const keyword = ref(typeof route.query.keyword === 'string' ? route.query.keyword : '')
// 定位高亮的目标标准编号(R03 到达态)
const focusStandardNo = ref(typeof route.query.focus === 'string' ? route.query.focus : '')
const filterDomain = ref<string | undefined>(undefined)
const filterCategory = ref<string | undefined>(undefined)
const filterLevel = ref<string | undefined>(undefined)
const filterStatus = ref<string | undefined>(undefined)
const importVisible = ref(false)
// R01-1:记录哪些行的标准定义处于展开态
const expandedDefinitions = ref<string[]>([])

/** 从 mock store 重新读取标准清单 */
function refresh() {
  standards.value = StandardStore.getStandards()
}

onMounted(refresh)

// 下拉选项全部由数据派生,避免与 mock 口径脱节
const domainOptions = computed(() => DomainStore.getDomains())
const categoryOptions = computed(() =>
  Array.from(new Set(standards.value.map(s => s.dataCategory).filter(Boolean) as string[])).sort()
)
const levelOptions = computed(() =>
  Array.from(new Set(standards.value.map(s => s.dataLevel).filter(Boolean) as string[])).sort()
)
const statusOptions = STANDARD_STATUS_LIST.map(s => ({ value: s, label: STANDARD_STATUS_LABEL[s] }))

// V2:默认按最近更新时间倒序;R02:关键词命中标准编号/标准名称(中)/标准名称(英)
const filteredStandards = computed(() => {
  const k = keyword.value.trim().toLowerCase()
  return standards.value
    .filter(s => {
      if (k) {
        const hit =
          (s.standardNo || s.code).toLowerCase().includes(k) ||
          (s.cnName || s.name).toLowerCase().includes(k) ||
          (s.enName || '').toLowerCase().includes(k)
        if (!hit) {return false}
      }
      if (filterDomain.value && s.domain !== filterDomain.value) {return false}
      if (filterCategory.value && s.dataCategory !== filterCategory.value) {return false}
      if (filterLevel.value && s.dataLevel !== filterLevel.value) {return false}
      if (filterStatus.value && s.status !== filterStatus.value) {return false}
      return true
    })
    .sort((a, b) => (b.updateTime || '').localeCompare(a.updateTime || ''))
})

/**
 * 行样式:定位目标行高亮(R03 到达态)。
 *
 * @param record 当前行数据
 * @returns 行 class
 */
function rowClass(record: Standard) {
  return focusStandardNo.value && record.standardNo === focusStandardNo.value ? 'focus-row' : ''
}

/**
 * 标准状态标签色。
 *
 * @param status 标准状态
 * @returns 标签色值
 */
function statusColor(status: StandardStatus) {
  return STANDARD_STATUS_COLOR[status] || 'gray'
}

/**
 * 标准状态中文名。
 *
 * @param status 标准状态
 * @returns 状态中文名
 */
function statusLabel(status: StandardStatus) {
  return STANDARD_STATUS_LABEL[status] || status
}

/**
 * 数据分级标签色(分级越高颜色越重)。
 *
 * @param level 数据分级
 * @returns 标签色值
 */
function levelColor(level: string) {
  if (level === '核心') {return 'red'}
  if (level === '重要') {return 'orange'}
  if (level === '一般') {return 'cyan'}
  return 'gray'
}

/** 重置全部筛选条件 */
function resetFilters() {
  keyword.value = ''
  filterDomain.value = undefined
  filterCategory.value = undefined
  filterLevel.value = undefined
  filterStatus.value = undefined
}

// ===== R01-1:标准定义展开/收起 =====
/**
 * 判断某条标准的定义是否处于展开态。
 *
 * @param standardNo 标准编号
 * @returns 是否展开
 */
function isDefinitionExpanded(standardNo: string) {
  return expandedDefinitions.value.includes(standardNo)
}

/**
 * 切换某条标准定义的展开态。
 *
 * @param standardNo 标准编号
 */
function toggleDefinition(standardNo: string) {
  const idx = expandedDefinitions.value.indexOf(standardNo)
  if (idx >= 0) {expandedDefinitions.value.splice(idx, 1)}
  else {expandedDefinitions.value.push(standardNo)}
}

// ===== R03/R04/R05:关联跳转(新标签页,保留当前位置;目标不存在 → 置灰不可点) =====
type LinkState = 'ok' | 'missing' | 'none'

/**
 * 判断所属数据域的跳转可达性。
 *
 * @param domain 所属数据域代码
 * @returns 跳转状态
 */
function domainState(domain?: string): LinkState {
  if (!domain || domain === '-') {return 'none'}
  return DomainStore.exists(domain) ? 'ok' : 'missing'
}

/**
 * 判断关联代码集的跳转可达性。
 *
 * @param codeSetNo 关联代码集编号
 * @returns 跳转状态
 */
function codeState(codeSetNo?: string): LinkState {
  if (!codeSetNo || codeSetNo === '-') {return 'none'}
  return StdCodeStore.exists(codeSetNo) ? 'ok' : 'missing'
}

/**
 * 跳转数据域列表并定位到目标数据域(R03/R05)。
 *
 * @param domain 数据域代码
 */
function openDomain(domain: string) {
  const { href } = router.resolve({
    name: 'data-standard-domains',
    query: { keyword: domain, focus: domain }
  })
  window.open(href, '_blank')
}

/**
 * 跳转代码集详情页(R03/R05)。
 *
 * @param codeSetNo 代码集编号
 */
function openCodeSet(codeSetNo: string) {
  const { href } = router.resolve({
    name: 'data-standard-code-detail',
    params: { codeSetNo }
  })
  window.open(href, '_blank')
}

/** 上传成功后刷新列表(U2 覆盖写入) */
function handleImportSuccess() {
  refresh()
}

// 筛选条件变化时,若从其它页面带来的关键词已失效则保持原样(不做额外重置)
watch(
  () => route.query.keyword,
  val => {
    if (typeof val === 'string') {keyword.value = val}
  }
)

// 到达态:监听定位参数变化,高亮目标标准
watch(
  () => route.query.focus,
  val => {
    if (typeof val === 'string') {focusStandardNo.value = val}
  }
)
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

  /* R03:定位目标行高亮 */
  :deep(.focus-row) {
    background-color: rgb(var(--primary-6), 0.08);
  }

  /* R01-1:标准定义富文本在单元格内截断 2 行,展开后完整展示 */
  .definition-cell {
    position: relative;

    .definition-text {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      line-height: 1.6;

      :deep(p) {
        margin: 0 0 4px;
      }

      :deep(ul) {
        margin: 0;
        padding-left: 18px;
      }
    }

    &.expanded .definition-text {
      display: block;
      -webkit-line-clamp: unset;
      overflow: visible;
    }

    .definition-toggle {
      font-size: 12px;
    }
  }
}
</style>
