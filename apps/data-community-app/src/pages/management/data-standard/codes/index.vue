<template>
  <!-- @prd: data-standard.codes -->
  <!--
    2026-10-23 按《需求文档:数据管理-数据标准(评审简化版)》重构:
      R13  展示字段 —— 代码集编号 / 代码集名称 / 适用标准编号 / 是否有效 / 备注;
            存储为一码一行,列表按代码集编号合并去重,一个代码集只占一行;
            代码值明细不在列表展示,统一收进代码集详情页
      R14  搜索范围 —— 按代码集编号、代码集名称模糊匹配
      R15  详情页入口 —— 「代码集编号」「代码集名称」为可点击链接,点击进入该代码集详情页
      R16  引用关系 —— 行内展开查看引用该代码集的标准清单(标准编号、标准名称(中文)),
            由数据标准侧「关联代码集编号」字段自动关联生成,不随标准代码上传变动;
            展开区为独立区域,不参与列表排序与筛选
      R21  返回态   —— 列表的搜索条件与页码写入会话快照,从详情页返回后自动恢复
      R23/R24 全量上传:模板列与展示字段一致,唯一键为代码集编号 + 代码值;E3/E4/E5 见上传弹窗
      V1 列表平铺 / V2 默认按最近更新时间倒序 + 编号与名称可排序 + 分页 / V3 只读
  -->
  <div class="codes-page">
    <a-card class="general-card" title="标准代码管理">
      <a-row style="margin-bottom: 12px">
        <a-col :span="12">
          <a-space>
            <a-tag color="arcoblue">共 {{ allCodeSets.length }} 个代码集</a-tag>
            <a-tag v-if="tableData.length !== allCodeSets.length" color="orange">
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
              placeholder="搜索代码集编号 / 代码集名称"
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
        :scroll="{ x: 1000 }"
        stripe
        size="medium"
        @page-change="handlePageChange"
        @expand="handleExpand"
      >
        <template #columns>
          <!-- R15:代码集编号为详情页入口 -->
          <a-table-column title="代码集编号" data-index="code" :width="200" sortable>
            <template #cell="{ record }">
              <a-link @click="openDetail(record.code)">{{ record.code }}</a-link>
            </template>
          </a-table-column>
          <!-- R15:代码集名称同样为详情页入口 -->
          <a-table-column title="代码集名称" data-index="name" :width="200" sortable>
            <template #cell="{ record }">
              <a-link @click="openDetail(record.code)">{{ record.name }}</a-link>
            </template>
          </a-table-column>
          <a-table-column title="适用标准编号" data-index="applicableStandards" :width="180" />
          <a-table-column title="是否有效" data-index="valid" :width="110" align="center">
            <template #cell="{ record }">
              <a-tag :color="record.valid ? 'green' : 'gray'">{{ record.valid ? '是' : '否' }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column title="备注" data-index="remark" :width="280" ellipsis tooltip>
            <template #cell="{ record }">
              <span>{{ record.remark || '-' }}</span>
            </template>
          </a-table-column>
        </template>

        <!-- 页面状态速查:空结果 —— 空状态插画 + 调整筛选引导 -->
        <template #empty>
          <a-empty description="没有符合条件的代码集">
            <a-button size="small" @click="clearSearch">重置搜索条件</a-button>
          </a-empty>
        </template>

        <!-- R16:引用该代码集的标准清单,由数据标准侧「关联代码集编号」字段自动派生 -->
        <template #expand-row="{ record }">
          <div class="ref-panel">
            <div class="ref-title">
              引用「{{ record.code }}」的数据标准
              <span class="ref-tip">由数据标准「关联代码集编号」字段自动关联生成，仅在数据标准中维护</span>
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
              <a-empty v-else-if="loadingRow !== record.code" description="暂无标准引用" />
            </a-spin>
          </div>
        </template>
      </a-table>
    </a-card>

    <!-- 全量上传通道(U1-U4 / U-E1~U-E4 / E3~E5) -->
    <DataStandardImportModal
      v-model:visible="importVisible"
      title="全量导入标准代码"
      type="codes"
      description="请下载标准代码模板,填写完成后上传;一个代码值一行,以代码集编号 + 代码值为联合唯一键(R23/R24)。"
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
import { StdCodeStore, type CodeSetSummary } from '@/mock-shared/standard-store'
import { readCodesListState, writeCodesListState } from './list-state'

const route = useRoute()
const router = useRouter()
const roleStore = useRoleStore()

// 关键约束:权限-数据标准管理员(演示口径映射到「数据治理者」)才可下载模板与全量上传
const canMaintain = computed(() => roleStore.currentRole === 'data_admin')

// R21:进入列表时优先按 URL 关键词定位,否则恢复上次离开时的搜索条件与页码
const initialState = readCodesListState()
const searchKey = ref(
  typeof route.query.keyword === 'string' ? route.query.keyword : initialState.keyword
)
const importVisible = ref(false)
const allCodeSets = ref<CodeSetSummary[]>([])
const currentPage = ref(initialState.page)
// 展开区的局部加载态(页面状态速查:点击展开后展示局部加载态)
const loadingRow = ref('')

/** 从 mock store 重新读取代码集清单 */
function refresh() {
  allCodeSets.value = StdCodeStore.getCodes()
}

onMounted(refresh)

// R14:代码集编号 / 代码集名称 模糊匹配;V2:默认按最近更新时间倒序
const tableData = computed(() => {
  const k = searchKey.value.trim().toLowerCase()
  const list = !k
    ? allCodeSets.value
    : allCodeSets.value.filter(c =>
        [c.code, c.name].some(v => String(v || '').toLowerCase().includes(k))
      )
  return [...list].sort((a, b) => (b.updateTime || '').localeCompare(a.updateTime || ''))
})

// 分页 total 直接跟随过滤结果
const pagination = computed(() => ({
  current: currentPage.value,
  pageSize: 10,
  total: tableData.value.length,
  showTotal: true,
  sizeCanChange: false
}))

// R21:搜索条件与页码写入会话快照,供从详情页返回时恢复
watch([searchKey, currentPage], () => {
  writeCodesListState({ keyword: searchKey.value, page: currentPage.value })
})

/**
 * 分页切换。
 *
 * @param page 目标页码
 */
function handlePageChange(page: number) {
  currentPage.value = page
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
 * 查询引用该代码集的标准清单(R16)。
 *
 * @param code 代码集编号
 * @returns 引用标准清单
 */
function refsOf(code: string) {
  return StdCodeStore.referencedStandards(code)
}

// ===== R15:进入代码集详情页(同标签页,详情页提供返回入口 R21) =====
/**
 * 跳转代码集详情页。
 *
 * @param code 代码集编号
 */
function openDetail(code: string) {
  router.push({ name: 'data-standard-code-detail', params: { codeSetNo: code } })
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
  currentPage.value = 1
}

/** 上传成功后刷新列表(U2 覆盖写入) */
function handleImportSuccess() {
  refresh()
  Message.success('标准代码列表已按上传文件全量覆盖')
}
</script>

<style lang="scss" scoped>
.codes-page {
  padding: 20px;

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
}
</style>
