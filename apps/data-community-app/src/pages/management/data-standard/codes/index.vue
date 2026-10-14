<template>
  <!-- @prd: data-standard.codes -->
  <!--
    2026-10-13 按评审结论重构：
      1. 只读展示页(V2)：删除新建/编辑/删除/查看，维护统一走「全量导入」(U1-U4)。
      2. 数据源上收为 StdCodeStore，编码与数据标准页「标准代码编号」一致，
         R03/R04 跳转置灰与 R17 引用清单自动派生。
      3. R13 展示字段补全：主题/代码名称/标准代码/码值/码意/其他/来源；
         R16 一码多值用行内展开表格呈现，不再用拼串的「码值示例」。
      4. R14 关键词模糊(编号/名称) + 主题筛选；V1 按更新时间倒序 + 真实分页。
  -->
  <div class="codes-page">
    <a-card class="general-card" title="标准代码管理">
      <a-row style="margin-bottom: 12px">
        <a-col :span="12">
          <a-space>
            <a-tag color="arcoblue">共 {{ allCodes.length }} 个标准代码</a-tag>
            <a-tag v-if="tableData.length !== allCodes.length" color="orange">
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
              v-model="filterSubject"
              placeholder="主题"
              allow-clear
              style="width: 140px"
            >
              <a-option v-for="s in subjects" :key="s" :value="s">{{ s }}</a-option>
            </a-select>
            <a-input-search
              v-model="searchKey"
              placeholder="搜索标准代码 / 代码名称"
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
        row-key="code"
        :pagination="pagination"
        :expandable="{ width: 44 }"
        :scroll="{ x: 1280 }"
        stripe
        size="medium"
        @page-change="handlePageChange"
      >
        <template #columns>
          <a-table-column title="标准代码" data-index="code" :width="170">
            <template #cell="{ record }">
              <span class="mono">{{ record.code }}</span>
            </template>
          </a-table-column>
          <a-table-column title="代码名称" data-index="name" :width="180" ellipsis tooltip />
          <a-table-column title="主题" data-index="subject" :width="110" />
          <a-table-column title="来源" data-index="source" :width="110">
            <template #cell="{ record }">
              <a-tag :color="sourceColor(record.source)">{{ record.source }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column title="码值数量" data-index="itemCount" :width="110" align="center">
            <template #cell="{ record }">
              <a-tag :color="record.items.length ? 'arcoblue' : 'gray'">{{ record.items.length }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column title="码值 / 码意（首个）" :width="300">
            <template #cell="{ record }">
              <div v-if="record.items.length" class="first-item">
                <span class="mono">{{ record.items[0].value }}</span>
                <span class="meaning">{{ record.items[0].meaning }}</span>
                <span v-if="record.items.length > 1" class="more">
                  展开查看其余 {{ record.items.length - 1 }} 个码值
                </span>
              </div>
              <span v-else>-</span>
            </template>
          </a-table-column>
          <a-table-column title="更新时间" data-index="updateTime" :width="180" />
        </template>

        <!-- R16:一码多值表格展开 + R17:引用该代码的数据标准清单 -->
        <template #expand-row="{ record }">
          <div class="expand-panel">
            <div class="panel-block">
              <div class="panel-title">码值枚举（{{ record.items.length }} 个）</div>
              <a-table
                v-if="record.items.length"
                :data="record.items"
                :pagination="false"
                size="mini"
                :border="{ wrapper: true, cell: true }"
                class="panel-table"
              >
                <template #columns>
                  <a-table-column title="码值" data-index="value" :width="140">
                    <template #cell="{ record: item }">
                      <span class="mono">{{ item.value }}</span>
                    </template>
                  </a-table-column>
                  <a-table-column title="码意" data-index="meaning" :width="220" />
                  <a-table-column title="其他" data-index="extra" :width="260">
                    <template #cell="{ record: item }">
                      <span>{{ item.extra || '-' }}</span>
                    </template>
                  </a-table-column>
                </template>
              </a-table>
              <a-empty v-else description="该标准代码暂无码值" />
            </div>

            <div class="panel-block">
              <div class="panel-title">引用该标准代码的数据标准（{{ refsOf(record.code).length }} 条）</div>
              <a-table
                v-if="refsOf(record.code).length"
                :data="refsOf(record.code)"
                :pagination="false"
                size="mini"
                :border="{ wrapper: true, cell: true }"
                class="panel-table"
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
              <a-empty v-else description="暂无数据标准引用该代码" />
            </div>
          </div>
        </template>
      </a-table>
    </a-card>

    <!-- 全量上传通道(U1-U4 / E6) -->
    <DataStandardImportModal
      v-model:visible="importVisible"
      title="全量导入标准代码"
      type="codes"
      description="请下载标准代码模板，填写完成后上传；一个码值一行，以「标准代码」为唯一键归组（R18/R19）。"
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
import { StdCodeStore, type StandardCodeEntry } from '@/mock-shared/standard-store'

const route = useRoute()
const router = useRouter()
const roleStore = useRoleStore()

// 三-关键约束:权限-数据标准管理员(演示口径映射到「数据治理者」角色)才可下载模板与全量上传
const canMaintain = computed(() => roleStore.currentRole === 'data_admin')

// 支持数据标准页跳转带 ?keyword=STD_GENDER 直接定位（R03/R05 的到达态）
const searchKey = ref(typeof route.query.keyword === 'string' ? route.query.keyword : '')
const filterSubject = ref<string | undefined>(undefined)
const importVisible = ref(false)
const allCodes = ref<StandardCodeEntry[]>([])
const currentPage = ref(1)

function refresh() {
  allCodes.value = StdCodeStore.getCodes()
}

onMounted(refresh)

const subjects = computed(() =>
  Array.from(new Set(allCodes.value.map(c => c.subject).filter(Boolean) as string[])).sort()
)

// R14:编号/名称模糊 + 主题筛选
const tableData = computed(() => {
  const k = searchKey.value.trim().toLowerCase()
  const list = allCodes.value.filter(c => {
    if (k && ![c.code, c.name].some(v => String(v || '').toLowerCase().includes(k))) return false
    if (filterSubject.value && c.subject !== filterSubject.value) return false
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

watch([searchKey, filterSubject], () => {
  currentPage.value = 1
})

function refsOf(code: string) {
  return StdCodeStore.referencedStandards(code)
}

// R15:来源区分国标 / 行标 / ISO / 行内标准
function sourceColor(source: string) {
  if (source === '国标') return 'red'
  if (source === '行标') return 'orange'
  if (source === 'ISO') return 'purple'
  return 'gray'
}

// R05:跨资产跳转在新标签页打开，保留当前浏览位置
function openStandard(standardNo: string) {
  const { href } = router.resolve({ name: 'data-standard', query: { keyword: standardNo } })
  window.open(href, '_blank')
}

function handlePageChange(page: number) {
  currentPage.value = page
}

function clearSearch() {
  searchKey.value = ''
  filterSubject.value = undefined
}

function handleImportSuccess() {
  refresh()
  Message.success('标准代码列表已按上传文件全量覆盖')
}
</script>

<style lang="scss" scoped>
.codes-page {
  padding: 20px;

  .mono {
    font-family: 'Menlo', 'Consolas', monospace;
  }

  .first-item {
    display: flex;
    gap: 8px;
    align-items: baseline;

    .meaning {
      color: var(--color-text-1);
    }

    .more {
      font-size: 12px;
      color: var(--color-text-3);
    }
  }

  .expand-panel {
    display: flex;
    gap: 32px;
    padding: 12px 16px;

    .panel-block {
      flex: 1;
      min-width: 0;
    }

    .panel-title {
      margin-bottom: 8px;
      font-size: 13px;
      font-weight: 600;
      color: var(--color-text-1);
    }

    .panel-table {
      max-width: 660px;
    }
  }
}
</style>
