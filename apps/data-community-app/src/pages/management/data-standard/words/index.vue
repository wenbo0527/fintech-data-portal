<template>
  <!-- @prd: data-standard.words -->
  <!--
    2026-10-13 按评审结论重构：
      1. 只读展示页(V2)：删除新建/编辑/删除，维护统一走「全量导入」(U1-U4)。
      2. 数据源上收为 WordStore（与 standard-store 的 INITIAL_WORDS 同源），不再页内内联 mock。
      3. R20 展示字段补全：中英文名、缩写、同义词、是否分类词、备注（原实现缺「备注」）。
      4. R21 关键词真实过滤中文名/英文名/缩写（原实现只弹 Message），V1 更新时间倒序 + 真实分页。
  -->
  <div class="words-page">
    <a-card class="general-card" title="标准单词管理">
      <a-row style="margin-bottom: 12px">
        <a-col :span="12">
          <a-space>
            <a-tag color="arcoblue">共 {{ allWords.length }} 个标准单词</a-tag>
            <a-tag v-if="tableData.length !== allWords.length" color="orange">
              筛选后 {{ tableData.length }} 个
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
            <a-select
              v-model="filterClass"
              placeholder="是否分类词"
              allow-clear
              style="width: 140px"
            >
              <a-option :value="true">分类词</a-option>
              <a-option :value="false">普通词</a-option>
            </a-select>
            <a-input-search
              v-model="searchKey"
              placeholder="搜索中文名 / 英文名 / 缩写"
              style="width: 280px"
              allow-clear
            />
            <a-button @click="clearSearch">
              <template #icon><icon-refresh /></template>
            </a-button>
          </a-space>
        </a-col>
      </a-row>

      <a-table
        :data="tableData"
        row-key="abbreviation"
        :pagination="pagination"
        :scroll="{ x: 1180 }"
        stripe
        size="medium"
        @page-change="handlePageChange"
      >
        <template #columns>
          <a-table-column title="单词中文名称" data-index="chineseName" :width="150" />
          <a-table-column title="单词英文名称" data-index="englishName" :width="180" />
          <a-table-column title="单词英文缩写" data-index="abbreviation" :width="150">
            <template #cell="{ record }">
              <span class="mono">{{ record.abbreviation }}</span>
            </template>
          </a-table-column>
          <a-table-column title="同义词" data-index="synonyms" :width="220">
            <template #cell="{ record }">
              <span>{{ record.synonyms || '-' }}</span>
            </template>
          </a-table-column>
          <a-table-column title="是否分类词" data-index="isClassWord" :width="120" align="center">
            <template #cell="{ record }">
              <a-tag :color="record.isClassWord ? 'purple' : 'gray'">
                {{ record.isClassWord ? '分类词' : '普通词' }}
              </a-tag>
            </template>
          </a-table-column>
          <a-table-column title="备注" data-index="remark" :width="300" ellipsis tooltip>
            <template #cell="{ record }">
              <span>{{ record.remark || '-' }}</span>
            </template>
          </a-table-column>
          <a-table-column title="更新时间" data-index="updateTime" :width="180" />
        </template>
      </a-table>
    </a-card>

    <!-- 全量上传通道(U1-U4 / E7) -->
    <DataStandardImportModal
      v-model:visible="importVisible"
      title="全量导入标准单词"
      type="words"
      description="请下载标准单词模板，填写完成后上传；以「单词英文缩写」为唯一键（R23/R24）。"
      @success="handleImportSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { useRoleStore } from '@/stores-dca/role'
import DataStandardImportModal from '../../../../components/modals/DataStandardImportModal.vue'
import { WordStore, type StandardWord } from '@/mock-shared/standard-store'

const route = useRoute()
const roleStore = useRoleStore()

// 三-关键约束:权限-数据标准管理员(演示口径映射到「数据治理者」角色)才可下载模板与全量上传
const canMaintain = computed(() => roleStore.currentRole === 'data_admin')

// 支持带 ?keyword=CUST 直达定位（R05 到达态）
const searchKey = ref(typeof route.query.keyword === 'string' ? route.query.keyword : '')
const filterClass = ref<boolean | undefined>(undefined)
const importVisible = ref(false)
const allWords = ref<StandardWord[]>([])
const currentPage = ref(1)

function refresh() {
  allWords.value = WordStore.getWords()
}

onMounted(refresh)

// R21:中文名 / 英文名 / 缩写 三项模糊
const tableData = computed(() => {
  const k = searchKey.value.trim().toLowerCase()
  const list = allWords.value.filter(w => {
    if (
      k &&
      ![w.chineseName, w.englishName, w.abbreviation].some(v =>
        String(v || '').toLowerCase().includes(k)
      )
    ) {
      return false
    }
    if (filterClass.value !== undefined && w.isClassWord !== filterClass.value) return false
    return true
  })
  // V1:默认按最近更新时间倒序
  return [...list].sort((a, b) => (b.updateTime || '').localeCompare(a.updateTime || ''))
})

const pagination = computed(() => ({
  current: currentPage.value,
  pageSize: 10,
  total: tableData.value.length,
  showTotal: true,
  sizeCanChange: false
}))

watch([searchKey, filterClass], () => {
  currentPage.value = 1
})

function handlePageChange(page: number) {
  currentPage.value = page
}

function clearSearch() {
  searchKey.value = ''
  filterClass.value = undefined
}

function handleImportSuccess() {
  refresh()
  Message.success('标准单词列表已按上传文件全量覆盖')
}
</script>

<style lang="scss" scoped>
.words-page {
  padding: 20px;

  .mono {
    font-family: 'Menlo', 'Consolas', monospace;
  }
}
</style>
