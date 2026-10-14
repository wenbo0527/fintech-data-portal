<template>
  <div class="data-resources-page">
    <div class="banner-section">
      <div class="banner-content">
        <div class="title-row"><h1 class="banner-title">外部数据</h1></div>
        <p class="banner-subtitle">三方征信 / 银联 / 同盾等外部数据源接入与消费分析</p>
        <div class="search-area">
          <a-input-search v-model="search" class="main-search-input" placeholder="输入数据名称、供应商或接口编号搜索" search-button size="large" allow-clear>
            <template #button-icon><icon-search /></template>
          </a-input-search>
          <div class="search-filters-inline">
            <a-select v-model="dataType" placeholder="数源种类" allow-clear size="large" style="width: 160px" class="filter-select">
              <a-option value="核验类">核验类</a-option>
              <a-option value="评分类">评分类</a-option>
              <a-option value="标签类">标签类</a-option>
              <a-option value="名单类">名单类</a-option>
              <a-option value="价格评估类">价格评估类</a-option>
            </a-select>
            <a-button class="action-btn" size="large" @click="showMissingTicket({ assetType: 'external', pageSource: '外部数据' })">
              <template #icon><icon-plus /></template>缺失工单
            </a-button>
          </div>
        </div>
      </div>
      <div class="banner-decoration"><div class="decoration-cube"></div></div>
    </div>
    <div class="main-content">
      <div class="content-section">
        <a-row :gutter="[16, 16]">
          <a-col v-for="item in filteredList" :key="item.interfaceId" :xs="24" :sm="12" :md="8" :lg="6">
            <a-card hoverable :bordered="false" :data-interface-id="item.interfaceId" :class="{ 'external-card-selected': selectedId === item.interfaceId }">
              <template #title>
                <a-space>
                  <a-tag :color="getTagColor(item.dataType)">{{ item.dataType }}</a-tag>
                  <span>{{ item.dataName }}</span>
                </a-space>
              </template>
              <a-descriptions :column="1" size="small">
                <a-descriptions-item label="接口编号">{{ item.interfaceId }}</a-descriptions-item>
                <a-descriptions-item label="供应商">{{ item.supplier }}</a-descriptions-item>
                <a-descriptions-item label="数据管理">{{ item.dataManagement }}</a-descriptions-item>
                <a-descriptions-item label="上线时间">{{ item.onlineTime }}</a-descriptions-item>
                <a-descriptions-item label="子类型" v-if="item.subType">
                  <a-tag :color="getTagColor(item.subType)" size="small">{{ item.subType }}</a-tag>
                </a-descriptions-item>
              </a-descriptions>
              <template #actions>
                <a-button type="text" size="small" @click="viewDetail(item)">详情</a-button>
                <a-button type="text" size="small" @click="toggleFavorite(item)">{{ item.isFavorite ? '取消收藏' : '收藏' }}</a-button>
              </template>
            </a-card>
          </a-col>
        </a-row>
        <a-empty v-if="filteredList.length === 0" description="暂无外部数据" />
      </div>
    </div>

    <!-- 缺失工单弹窗 -->
    <MissingTicketModal
      v-model:visible="showMissingTicketModal"
      :context="ticketContext"
      @confirm="handleMissingTicketConfirm"
    />

    <!-- 外部数据详情抽屉 -->
    <a-drawer
      :visible="detailVisible"
      :width="520"
      :title="detailItem ? detailItem.dataName : '外部数据详情'"
      :footer="false"
      @cancel="detailVisible = false"
    >
      <template v-if="detailItem">
        <a-descriptions :column="1" bordered size="large">
          <a-descriptions-item label="接口编号">{{ detailItem.interfaceId }}</a-descriptions-item>
          <a-descriptions-item label="数据名称">{{ detailItem.dataName }}</a-descriptions-item>
          <a-descriptions-item label="数源种类">
            <a-tag :color="getTagColor(detailItem.dataType)">{{ detailItem.dataType }}</a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="子类型" v-if="detailItem.subType">
            <a-tag :color="getTagColor(detailItem.subType)" size="small">{{ detailItem.subType }}</a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="供应商">{{ detailItem.supplier }}</a-descriptions-item>
          <a-descriptions-item label="数据管理">{{ detailItem.dataManagement }}</a-descriptions-item>
          <a-descriptions-item label="上线时间">{{ detailItem.onlineTime }}</a-descriptions-item>
        </a-descriptions>
        <div style="margin-top: 16px; display: flex; gap: 12px;">
          <a-button type="primary" @click="goToSearch">
            搜索关联数据表
          </a-button>
          <a-button @click="showMissingTicket({ assetType: 'external', pageSource: '外部数据', assetName: detailItem.dataName })">
            提交工单
          </a-button>
        </div>
      </template>
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { IconSearch, IconPlus } from '@arco-design/web-vue/es/icon'
import MissingTicketModal from '@/pages/search/MissingTicketModal.vue'
import { useMissingTicket } from '@/composables/useMissingTicket'
import { externalResources } from '@/mock/external-resources'

const { showMissingTicketModal, ticketContext, showMissingTicket, handleMissingTicketConfirm } = useMissingTicket()

const route = useRoute()
const router = useRouter()
const search = ref('')
const dataType = ref<string | undefined>(undefined)

// 复用共享数据源,与全局搜索保持一致
const allData = ref(externalResources)
// 搜索结果点击跳转进入时高亮定位的项(interfaceId)
const selectedId = ref<string>('')

// 详情抽屉
const detailVisible = ref(false)
const detailItem = ref<any>(null)

onMounted(() => {
  const focus = route.query.focus
  if (focus) {
    selectedId.value = String(focus)
    // 滚动到选中项
    nextTick(() => {
      const el = document.querySelector(`[data-interface-id="${selectedId.value}"]`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }
})

const filteredList = computed(() => {
  let result = allData.value
  if (search.value) {
    const k = search.value.toLowerCase()
    result = result.filter(item => item.dataName.toLowerCase().includes(k) || item.supplier.toLowerCase().includes(k) || item.interfaceId.toLowerCase().includes(k))
  }
  if (dataType.value) result = result.filter(item => item.dataType === dataType.value)
  return result
})

function getTagColor(t: string) { return { '核验类': 'blue', '评分类': 'green', '标签类': 'orange', '名单类': 'red', '价格评估类': 'purple' }[t] || 'gray' }
function viewDetail(item: any) {
  selectedId.value = item.interfaceId
  detailItem.value = item
  detailVisible.value = true
}
function goToSearch() {
  if (!detailItem.value) return
  detailVisible.value = false
  router.push({ path: '/discovery/search', query: { q: detailItem.value.dataName, tab: 'all' } })
}
function toggleFavorite(item: any) {
  item.isFavorite = !item.isFavorite
  Message.success(item.isFavorite ? `已收藏: ${item.dataName}` : `已取消收藏: ${item.dataName}`)
}
</script>

<style scoped>
.data-resources-page { min-height: 100vh; background: #f7f8fa; position: relative; overflow-x: hidden; }
.banner-section { background: linear-gradient(180deg, #E6F0FF 0%, #F7F8FA 100%); padding: 40px 0; position: relative; display: flex; justify-content: center; align-items: center; min-height: 280px; }
.banner-content { width: 100%; max-width: 1800px; z-index: 2; position: relative; display: flex; flex-direction: column; padding: 0 40% 0 40px; box-sizing: border-box; }
.banner-title { font-size: 40px; font-weight: bold; color: #1d2129; margin: 0 0 16px 0; line-height: 1.2; }
.banner-subtitle { font-size: 14px; color: #86909c; margin-bottom: 32px; max-width: 600px; line-height: 1.6; }
.search-area { display: flex; gap: 16px; align-items: center; width: 100%; max-width: 900px; flex-wrap: wrap; }
.main-search-input { flex: 1; min-width: 400px; background: #fff; border-radius: 30px; border: 1px solid #165DFF; box-shadow: 0 4px 10px rgba(22, 93, 255, 0.1); }
.main-search-input :deep(.arco-input-wrapper) { border-radius: 30px; padding-left: 20px; background: #fff; }
.main-search-input :deep(.arco-input-search-btn) { border-radius: 0 30px 30px 0; background: transparent; color: #165DFF; border-left: 1px solid #f2f3f5; }
.search-filters-inline { display: flex; gap: 12px; }
.filter-select { background: #fff; border-radius: 4px; }
.banner-decoration { position: absolute; right: 0; top: 0; width: 40%; height: 100%; overflow: hidden; pointer-events: none; }
.decoration-cube { position: absolute; top: 40px; right: 100px; width: 200px; height: 200px; background: linear-gradient(135deg, #e8f3ff 0%, #cce4ff 100%); transform: rotate(-15deg) skew(-10deg); border-radius: 20px; box-shadow: -20px 20px 40px rgba(22, 93, 255, 0.1); }
.main-content { padding: 0 40px 40px; width: 100%; max-width: 1800px; margin: -40px auto 0; position: relative; z-index: 3; }
.content-section { background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04); }
.external-card-selected { border: 2px solid #165DFF !important; box-shadow: 0 0 0 2px rgba(22, 93, 255, 0.15); }
</style>
