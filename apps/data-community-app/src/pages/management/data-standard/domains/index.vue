<template>
  <!-- @prd: data-standard.domains -->
  <!--
    2026-10-23 按《需求文档:数据管理-数据标准(评审简化版)》重构:
      R08  展示字段 —— 数据域代码 / 数据域名称 / 覆盖范围名称 / 建议主责部门(4 个字段全部平铺)
      R09  搜索范围 —— 按数据域名称、数据域代码模糊匹配
      R10  引用关系 —— 行内展开查看引用该数据域的标准清单(标准编号、标准名称(中文)),
            由数据标准侧「所属数据域」字段自动关联生成,不随数据域上传变动;
            展开区为独立区域,不参与列表排序与筛选;清单每条可跳转标准列表
      R11/R12 全量上传:模板列与展示字段一致,唯一键为数据域代码;E2 数据域代码格式非法 → 拦截
      V1 列表平铺 / V2 默认按最近更新时间倒序 + 代码与名称可排序 + 分页 / V3 只读
  -->
  <div class="domains-page">
    <a-card class="general-card" title="数据域">
      <a-row style="margin-bottom: 12px">
        <a-col :span="12">
          <a-space>
            <a-tag color="arcoblue">共 {{ allDomains.length }} 个数据域</a-tag>
            <a-tag v-if="tableData.length !== allDomains.length" color="orange">
              筛选后 {{ tableData.length }} 个
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
            <a-input-search
              v-model="searchKey"
              placeholder="搜索数据域代码 / 数据域名称"
              style="width: 280px"
              allow-clear
              size="large"
            />
            <a-button size="large" @click="clearSearch">
              <template #icon><icon-refresh /></template>
            </a-button>
          </a-space>
        </a-col>
      </a-row>

      <a-table
        :data="tableData"
        row-key="code"
        :pagination="pagination"
        :expandable="{ width: 44 }"
        :row-class="rowClass"
        :scroll="{ x: 900 }"
        stripe
        size="medium"
        @page-change="handlePageChange"
        @expand="handleExpand"
      >
        <template #columns>
          <a-table-column title="数据域代码" data-index="code" :width="200" sortable>
            <template #cell="{ record }">
              <span class="mono">{{ record.code }}</span>
            </template>
          </a-table-column>
          <a-table-column title="数据域名称" data-index="name" :width="200" sortable />
          <a-table-column title="覆盖范围名称" data-index="coverage" :width="320" ellipsis tooltip />
          <a-table-column title="建议主责部门" data-index="ownerDept" :width="180" />
        </template>

        <!-- 页面状态速查:空结果 —— 空状态插画 + 调整筛选引导 -->
        <template #empty>
          <a-empty description="没有符合条件的数据域">
            <a-button size="small" @click="clearSearch">重置搜索条件</a-button>
          </a-empty>
        </template>

        <!-- R10:引用该数据域的标准清单,由数据标准侧「所属数据域」字段自动派生 -->
        <template #expand-row="{ record }">
          <div class="ref-panel">
            <div class="ref-title">
              引用「{{ record.code }}」的数据标准
              <span class="ref-tip">由数据标准「所属数据域」字段自动关联生成，仅在数据标准中维护</span>
            </div>
            <a-spin :loading="loadingRow === record.code" style="width: 100%">
              <a-table
                v-if="loadingRow !== record.code && refsOf(record.code).length"
                :data="refsOf(record.code)"
                :pagination="false"
                size="mini"
                :border="{ wrapper: true, cell: true }"
                class="ref-table"
              >
                <template #columns>
                  <a-table-column title="标准编号" data-index="standardNo" :width="140" />
                  <a-table-column title="标准名称(中文)" data-index="cnName" :width="200" />
                  <a-table-column title="操作" :width="120">
                    <template #cell="{ record: std }">
                      <a-link @click="openStandard(std.standardNo)">查看标准</a-link>
                    </template>
                  </a-table-column>
                </template>
              </a-table>
              <a-empty
                v-else-if="loadingRow !== record.code"
                description="暂无标准引用"
              />
            </a-spin>
          </div>
        </template>
      </a-table>
    </a-card>

    <!-- 全量上传通道(U1-U4 / U-E1~U-E4 / E2) -->
    <DataStandardImportModal
      v-model:visible="importVisible"
      title="全量导入数据域"
      type="domains"
      description="请下载数据域模板,填写完成后上传;模板列与展示字段一致,以数据域代码为唯一键(R11/R12)。"
      @success="handleImportSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { useRoleStore } from '@/stores-dca/role'
import DataStandardImportModal from '../../../../components/modals/DataStandardImportModal.vue'
import { DomainStore, type StandardDomain } from '@/mock-shared/standard-store'

const route = useRoute()
const router = useRouter()
const roleStore = useRoleStore()

// 关键约束:权限-数据标准管理员(演示口径映射到「数据治理者」)才可下载模板与全量上传
const canMaintain = computed(() => roleStore.currentRole === 'data_admin')

// 支持数据标准页跳转带 ?keyword=AMT_DOMAIN 直接定位(R03/R05 的到达态)
const searchKey = ref(typeof route.query.keyword === 'string' ? route.query.keyword : '')
// 定位高亮的目标数据域代码
const focusCode = ref(typeof route.query.focus === 'string' ? route.query.focus : '')
const importVisible = ref(false)
const allDomains = ref<StandardDomain[]>([])
const currentPage = ref(1)
// 展开区的局部加载态(页面状态速查:点击展开后展示局部加载态)
const loadingRow = ref('')

/** 从 mock store 重新读取数据域清单 */
function refresh() {
  allDomains.value = DomainStore.getDomains()
}

onMounted(refresh)

// R09:数据域名称 / 数据域代码 模糊匹配;V2:默认按最近更新时间倒序
const tableData = computed(() => {
  const k = searchKey.value.trim().toLowerCase()
  const list = !k
    ? allDomains.value
    : allDomains.value.filter(d =>
        [d.code, d.name].some(v => String(v || '').toLowerCase().includes(k))
      )
  return [...list].sort((a, b) => (b.updateTime || '').localeCompare(a.updateTime || ''))
})

// 分页 total 直接跟随过滤结果,筛选变化时回到第 1 页
const pagination = computed(() => ({
  current: currentPage.value,
  pageSize: 10,
  total: tableData.value.length,
  showTotal: true,
  sizeCanChange: false
}))

watch(searchKey, () => {
  currentPage.value = 1
})

/**
 * 行样式:定位目标行高亮(R03 到达态)。
 *
 * @param record 当前行数据
 * @returns 行 class
 */
function rowClass(record: StandardDomain) {
  return focusCode.value && record.code === focusCode.value ? 'focus-row' : ''
}

/**
 * 展开行时触发局部加载态。
 *
 * @param rowKey 展开行 key
 */
function handleExpand(rowKey: string | number) {
  loadingRow.value = String(rowKey)
  window.setTimeout(() => {
    loadingRow.value = ''
  }, 280)
}

/**
 * 分页切换。
 *
 * @param page 目标页码
 */
function handlePageChange(page: number) {
  currentPage.value = page
}

/**
 * 查询引用该数据域的标准清单(R10)。
 *
 * @param code 数据域代码
 * @returns 引用标准清单
 */
function refsOf(code: string) {
  return DomainStore.referencedStandards(code)
}

// ===== R05:跨资产跳转在新标签页打开,保留当前浏览位置 =====
/**
 * 跳转数据标准列表并定位到目标标准。
 *
 * @param standardNo 标准编号
 */
function openStandard(standardNo: string) {
  const { href } = router.resolve({
    name: 'data-standard',
    query: { keyword: standardNo, focus: standardNo }
  })
  window.open(href, '_blank')
}

/** 清空搜索条件 */
function clearSearch() {
  searchKey.value = ''
  focusCode.value = ''
}

/** 上传成功后刷新列表(U2 覆盖写入) */
function handleImportSuccess() {
  refresh()
  Message.success('数据域列表已按上传文件全量覆盖')
}
</script>

<style lang="scss" scoped>
.domains-page {
  padding: 20px;

  .mono {
    font-family: 'Menlo', 'Consolas', monospace;
  }

  .ref-panel {
    padding: 12px 16px;

    .ref-title {
      margin-bottom: 8px;
      font-size: 13px;
      font-weight: 600;
      color: var(--color-text-1);
    }

    .ref-tip {
      margin-left: 8px;
      font-size: 12px;
      font-weight: 400;
      color: var(--color-text-3);
    }

    .ref-table {
      max-width: 640px;
    }
  }

  /* R03:定位目标行高亮 */
  :deep(.focus-row) {
    background-color: rgb(var(--primary-6), 0.08);
  }
}
</style>
