<template>
  <!-- @prd: data-standard.code-detail -->
  <!--
    2026-10-23 按《需求文档:数据管理-数据标准(评审简化版)》新增:
      R17   基本信息区 —— 展示代码集编号、代码集名称、适用标准编号、是否有效、备注,全部只读
      R17-1 是否有效口径 —— 代码集层与代码值层各有一个「是否有效」,两者独立不级联:
            代码集失效不影响其下代码值的展示与搜索,代码值失效不影响其所属代码集的展示与引用关系
      R18   代码值明细表 —— 列为代码值、代码名称、代码说明、是否有效;
            默认按代码值字符序升序(数字型同样按字符串处理,1、10、2 依次排列),分页默认每页 20 条
      R19   双条件搜索 —— 两个独立搜索框:代码名称模糊匹配、代码值前缀匹配;
            均不区分大小写,全角输入先归一为半角;两框可单独使用,同时填写取交集,作用域限定当前代码集内
      R20   搜索态保留 —— 两框各自独立生效,清空其一另一条件仍保留;搜索变化留在详情页内不跳转;
            两框均清空恢复全量代码值列表
      R21   返回态 —— 详情页提供返回入口,返回列表后保留进入前的搜索条件、筛选条件与页码
      R22   代码集不存在态 —— 提示「代码集不存在」与返回列表入口,不渲染基本信息区与明细表
      页面状态速查 —— 空结果(保留搜索框与已填条件,仅明细区空态与清空引导)/ 加载中(基本信息区骨架屏 + 明细表加载态)
  -->
  <div class="code-detail-page">
    <!-- R22:代码集不存在(已被覆盖式上传删除)—— 仅展示提示与返回入口,不渲染基本信息区与明细表 -->
    <a-card v-if="!loading && !codeSet" class="general-card">
      <a-result status="warning" title="代码集不存在">
        <template #subtitle>
          代码集「{{ codeSetNo }}」已不存在，可能已被新一轮全量上传覆盖删除。
        </template>
        <template #extra>
          <a-button type="primary" @click="goBackToList">返回列表</a-button>
        </template>
      </a-result>
    </a-card>

    <template v-else>
      <!-- 页面头部:标题 + 返回列表入口(R21) -->
      <div class="detail-header">
        <a-button type="text" size="small" @click="goBackToList">
          <template #icon><icon-left /></template>
          返回列表
        </a-button>
        <div class="header-title">
          <span class="code-no">{{ codeSetNo }}</span>
          <span class="code-name">{{ codeSet?.name || '' }}</span>
          <!-- R17-1:代码集层「是否有效」与代码值层独立,仅展示不参与过滤 -->
          <a-tag v-if="codeSet" :color="codeSet.valid ? 'green' : 'gray'">
            {{ codeSet.valid ? '有效' : '无效' }}
          </a-tag>
        </div>
      </div>

      <!-- R17:基本信息区(全部只读) -->
      <a-card title="基本信息" class="general-card">
        <!-- 页面状态速查:加载中 —— 基本信息区骨架屏 -->
        <a-skeleton v-if="loading" animation style="padding: 8px 0">
          <a-space direction="vertical" size="large" style="width: 100%">
            <a-space :style="{ width: '100%' }" size="large">
              <a-skeleton-line :rows="2" :widths="['60px', '140px']" />
              <a-skeleton-line :rows="2" :widths="['60px', '140px']" />
              <a-skeleton-line :rows="2" :widths="['60px', '140px']" />
            </a-space>
          </a-space>
        </a-skeleton>

        <a-descriptions v-else :column="3" bordered size="large">
          <a-descriptions-item label="代码集编号">{{ codeSet?.code }}</a-descriptions-item>
          <a-descriptions-item label="代码集名称">{{ codeSet?.name }}</a-descriptions-item>
          <a-descriptions-item label="适用标准编号">{{ codeSet?.applicableStandards || '-' }}</a-descriptions-item>
          <a-descriptions-item label="是否有效">
            <a-tag :color="codeSet?.valid ? 'green' : 'gray'">{{ codeSet?.valid ? '是' : '否' }}</a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="备注">{{ codeSet?.remark || '-' }}</a-descriptions-item>
        </a-descriptions>
      </a-card>

      <!-- R18/R19/R20:代码值明细表 -->
      <a-card title="代码值明细" class="general-card">
        <!-- R19:两个独立搜索框,各自独立生效;同时填写取交集 -->
        <a-row :gutter="8" style="margin-bottom: 16px">
          <a-col :span="7">
            <a-input-search
              v-model="nameKeyword"
              placeholder="按代码名称模糊搜索"
              allow-clear
              size="large"
            />
          </a-col>
          <a-col :span="7">
            <a-input-search
              v-model="valueKeyword"
              placeholder="按代码值前缀搜索"
              allow-clear
              size="large"
            />
          </a-col>
          <a-col :span="6" style="text-align: right">
            <a-space>
              <a-tag color="arcoblue">共 {{ filteredItems.length }} 条代码值</a-tag>
              <a-button size="large" @click="clearSearch">
                <template #icon><icon-refresh /></template>
              </a-button>
            </a-space>
          </a-col>
        </a-row>

        <a-spin :loading="loading" style="width: 100%">
          <a-table
            :data="pagedItems"
            row-key="value"
            :pagination="pagination"
            :scroll="{ x: 900 }"
            stripe
            size="medium"
            @page-change="handlePageChange"
          >
            <template #columns>
              <a-table-column title="代码值" data-index="value" :width="180">
                <template #cell="{ record }">
                  <span class="mono">{{ record.value }}</span>
                </template>
              </a-table-column>
              <a-table-column title="代码名称" data-index="name" :width="220" />
              <a-table-column title="代码说明" data-index="description" :width="320" ellipsis tooltip>
                <template #cell="{ record }">
                  <span>{{ record.description || '-' }}</span>
                </template>
              </a-table-column>
              <!-- R17-1:代码值层「是否有效」与代码集层独立,失效码值仍展示 -->
              <a-table-column title="是否有效" data-index="valid" :width="110" align="center">
                <template #cell="{ record }">
                  <a-tag :color="record.valid ? 'green' : 'gray'">{{ record.valid ? '是' : '否' }}</a-tag>
                </template>
              </a-table-column>
            </template>

            <!-- 页面状态速查:空结果 —— 保留搜索框与已填条件,仅明细区展示空状态与清空引导 -->
            <template #empty>
              <a-empty description="没有符合条件的代码值">
                <a-button size="small" @click="clearSearch">清空搜索条件</a-button>
              </a-empty>
            </template>
          </a-table>
        </a-spin>
      </a-card>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { StdCodeStore, normalizeHalfWidth, type CodeItem, type CodeSetSummary } from '@/mock-shared/standard-store'

const route = useRoute()
const router = useRouter()

/** 当前代码集编号(取自路由参数) */
const codeSetNo = computed(() => String(route.params.codeSetNo ?? ''))

/** 加载中(页面状态速查:进入详情页 → 基本信息区骨架屏 + 明细表加载态) */
const loading = ref(true)
/** 当前代码集(R17 基本信息区口径) */
const codeSet = ref<CodeSetSummary | undefined>(undefined)

/** R19:代码名称模糊匹配关键词 */
const nameKeyword = ref('')
/** R19:代码值前缀匹配关键词 */
const valueKeyword = ref('')
/** R18:代码值明细分页页码 */
const currentPage = ref(1)

/**
 * 从 mock store 读取代码集(模拟异步加载,呈现加载态)。
 */
function load() {
  loading.value = true
  window.setTimeout(() => {
    codeSet.value = StdCodeStore.findByCode(codeSetNo.value)
    loading.value = false
  }, 260)
}

onMounted(load)

// 路由参数变化时重新加载(同一组件内切换代码集)
watch(codeSetNo, load)

/**
 * R19/R20:按双条件过滤代码值。
 * 代码名称模糊匹配、代码值前缀匹配,均不区分大小写,全角输入先归一为半角;
 * 两框可单独使用,同时填写时取交集;作用域限定为当前代码集内。
 *
 * @returns 命中的代码值列表(已按代码值字符序升序)
 */
const filteredItems = computed<CodeItem[]>(() => {
  const nameKey = normalizeHalfWidth(nameKeyword.value.trim()).toLowerCase()
  const valueKey = normalizeHalfWidth(valueKeyword.value.trim()).toLowerCase()
  const items = codeSet.value?.items ?? []
  return items.filter(item => {
    if (nameKey && !normalizeHalfWidth(item.name).toLowerCase().includes(nameKey)) {return false}
    if (valueKey && !normalizeHalfWidth(item.value).toLowerCase().startsWith(valueKey)) {return false}
    return true
  })
})

/** R18:默认每页 20 条 */
const PAGE_SIZE = 20

/** 当前页展示的代码值 */
const pagedItems = computed<CodeItem[]>(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE
  return filteredItems.value.slice(start, start + PAGE_SIZE)
})

/** 分页配置 */
const pagination = computed(() => ({
  current: currentPage.value,
  pageSize: PAGE_SIZE,
  total: filteredItems.value.length,
  showTotal: true,
  sizeCanChange: false
}))

/**
 * 分页切换。
 *
 * @param page 目标页码
 */
function handlePageChange(page: number) {
  currentPage.value = page
}

/**
 * 清空全部搜索条件(R20:两个框均清空时恢复全量代码值列表)。
 */
function clearSearch() {
  nameKeyword.value = ''
  valueKeyword.value = ''
  currentPage.value = 1
}

// 搜索条件变化时重置到第一页,保证命中结果可见
watch([nameKeyword, valueKeyword], () => {
  currentPage.value = 1
})

/**
 * 返回标准代码列表(R21:列表页按会话快照恢复进入前的搜索条件、筛选条件与页码)。
 */
function goBackToList() {
  router.push({ name: 'data-standard-codes' })
}
</script>

<style lang="scss" scoped>
.code-detail-page {
  padding: 20px;

  .detail-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;

    .header-title {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 16px;
      font-weight: 600;
      color: var(--color-text-1);
    }

    .code-no {
      font-family: 'Menlo', 'Consolas', monospace;
    }

    .code-name {
      font-weight: 500;
      color: var(--color-text-2);
    }
  }

  .mono {
    font-family: 'Menlo', 'Consolas', monospace;
  }
}
</style>
