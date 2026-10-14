<template>
  <!-- @prd: data-standard.domains -->
  <!--
    2026-10-13 按评审结论重构：
      1. 页面即详情(V2/V3 口径由用户裁定改为「列表即详情 + 行内展开」)，
         删除新建/编辑/删除/查看入口 —— 维护统一走「全量导入」(U1-U4)。
      2. 数据源从页内内联 mock 上收为 DomainStore，与数据标准页「域」字段同一编码口径，
         因此 R03/R04 跳转与 R10 引用清单可以自动成立(不再硬编码)。
      3. 搜索改为真实过滤(R09)，支持从数据标准页 ?keyword=AMT_18_2 直达定位。
      4. 分页 total 取真实条数(V1)，补齐 R08 全部展示字段与域描述。
  -->
  <div class="domains-page">
    <a-card class="general-card" title="标准域管理">
      <a-row style="margin-bottom: 16px">
        <a-col :span="12">
          <a-space>
            <a-tag color="arcoblue">共 {{ allDomains.length }} 个标准域</a-tag>
            <a-tag v-if="tableData.length !== allDomains.length" color="orange">
              筛选后 {{ tableData.length }} 个
            </a-tag>
            <a-button size="small" @click="clearSearch">重置筛选</a-button>
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
            <a-input-search
              v-model="searchKey"
              placeholder="搜索域编号 / 域中文名称"
              style="width: 280px"
              allow-clear
            />
          </a-space>
        </a-col>
      </a-row>

      <a-table
        :data="tableData"
        row-key="code"
        :pagination="pagination"
        :expandable="{ width: 44 }"
        :scroll="{ x: 1760 }"
        stripe
        size="medium"
        @page-change="handlePageChange"
      >
        <template #columns>
          <a-table-column title="域" data-index="code" :width="150">
            <template #cell="{ record }">
              <span class="mono">{{ record.code }}</span>
            </template>
          </a-table-column>
          <a-table-column title="域中文名称" data-index="name" :width="160" />
          <a-table-column title="业务数据类型" data-index="businessDataType" :width="130" />
          <a-table-column title="逻辑数据类型" data-index="logicalDataType" :width="130">
            <template #cell="{ record }">
              <a-tag color="cyan">{{ record.logicalDataType }}</a-tag>
            </template>
          </a-table-column>
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
              <a-link
                v-if="record.isCode && record.stdCodeNo && codeExists(record.stdCodeNo)"
                @click="openCode(record.stdCodeNo)"
              >
                {{ record.stdCodeNo }}
              </a-link>
              <a-tooltip
                v-else-if="record.isCode && record.stdCodeNo && record.stdCodeNo !== '-'"
                content="关联标准代码不存在，暂不可跳转（R04）"
              >
                <span class="link-disabled">{{ record.stdCodeNo }}</span>
              </a-tooltip>
              <span v-else>-</span>
            </template>
          </a-table-column>
          <a-table-column title="标准代码中文名称" data-index="stdCodeName" :width="170" ellipsis tooltip />
          <a-table-column title="域描述" data-index="description" :width="260" ellipsis tooltip />
          <a-table-column title="引用标准数" data-index="refCount" :width="110" align="center">
            <template #cell="{ record }">
              <a-tag :color="refsOf(record.code).length ? 'arcoblue' : 'gray'">
                {{ refsOf(record.code).length }}
              </a-tag>
            </template>
          </a-table-column>
          <a-table-column title="更新时间" data-index="updateTime" :width="180" />
        </template>

        <!-- R10:引用该域的标准清单，由数据标准侧「域」字段自动派生，不随标准域上传变动 -->
        <template #expand-row="{ record }">
          <div class="ref-panel">
            <div class="ref-title">引用「{{ record.code }}」的数据标准（{{ refsOf(record.code).length }} 条）</div>
            <a-table
              v-if="refsOf(record.code).length"
              :data="refsOf(record.code)"
              :pagination="false"
              size="mini"
              :border="{ wrapper: true, cell: true }"
              class="ref-table"
            >
              <template #columns>
                <a-table-column title="标准编号" data-index="standardNo" :width="140" />
                <a-table-column title="中文名称" data-index="cnName" :width="200" />
                <a-table-column title="操作" :width="120">
                  <template #cell="{ record: std }">
                    <a-link @click="openStandard(std.standardNo)">查看标准</a-link>
                  </template>
                </a-table-column>
              </template>
            </a-table>
            <a-empty v-else description="暂无数据标准引用该域" />
          </div>
        </template>
      </a-table>
    </a-card>

    <!-- 批量导入弹窗(U1-U4 / E4 / E5) -->
    <DataStandardImportModal
      v-model:visible="importVisible"
      title="全量导入标准域"
      type="domains"
      description="请下载标准域模板，填写完成后上传；模板列与展示字段一致，以「域」编号为唯一键（R11/R12）。"
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
import { DomainStore, StdCodeStore, type StandardDomain } from '@/mock-shared/standard-store'

const route = useRoute()
const router = useRouter()
const roleStore = useRoleStore()

// 三-关键约束:权限-数据标准管理员(演示口径映射到「数据治理者」角色)才可下载模板与全量上传
const canMaintain = computed(() => roleStore.currentRole === 'data_admin')

// 支持数据标准页跳转带 ?keyword=AMT_18_2 直接定位（R03/R05 的到达态）
const searchKey = ref(typeof route.query.keyword === 'string' ? route.query.keyword : '')
const importVisible = ref(false)
const allDomains = ref<StandardDomain[]>([])
const currentPage = ref(1)

function refresh() {
  allDomains.value = DomainStore.getDomains()
}

onMounted(refresh)

const tableData = computed(() => {
  const k = searchKey.value.trim().toLowerCase()
  const list = !k
    ? allDomains.value
    : allDomains.value.filter(d =>
        [d.code, d.name].some(v => String(v || '').toLowerCase().includes(k))
      )
  // V1:默认按最近更新时间倒序
  return [...list].sort((a, b) => (b.updateTime || '').localeCompare(a.updateTime || ''))
})

// 分页 total 直接跟随过滤结果（computed），筛选变化时回到第 1 页
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

function handlePageChange(page: number) {
  currentPage.value = page
}

function refsOf(code: string) {
  return DomainStore.referencedStandards(code)
}
function codeExists(stdCodeNo: string) {
  return StdCodeStore.exists(stdCodeNo)
}

// ===== R05:跨资产跳转在新标签页打开，保留当前浏览位置 =====
function openCode(stdCodeNo: string) {
  const { href } = router.resolve({ name: 'data-standard-codes', query: { keyword: stdCodeNo } })
  window.open(href, '_blank')
}
function openStandard(standardNo: string) {
  const { href } = router.resolve({ name: 'data-standard', query: { keyword: standardNo } })
  window.open(href, '_blank')
}

function clearSearch() {
  searchKey.value = ''
}

function handleImportSuccess() {
  refresh()
  Message.success('标准域列表已按上传文件全量覆盖')
}
</script>

<style lang="scss" scoped>
.domains-page {
  padding: 20px;

  .mono {
    font-family: 'Menlo', 'Consolas', monospace;
  }

  .link-disabled {
    color: var(--color-text-4);
    cursor: not-allowed;
    border-bottom: 1px dashed var(--color-border-2);
  }

  .ref-panel {
    padding: 12px 16px;

    .ref-title {
      margin-bottom: 8px;
      font-size: 13px;
      font-weight: 600;
      color: var(--color-text-1);
    }

    .ref-table {
      max-width: 640px;
    }
  }
}
</style>
