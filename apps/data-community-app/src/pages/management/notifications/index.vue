<template>
  <div class="notifications-page">
    <a-page-header title="通知中心" sub-title="审批 / 治理 / 系统动态统一跟进，状态变更实时送达">
      <template #extra>
        <a-input-search
          v-model="keyword"
          placeholder="搜索通知标题/内容"
          style="width: 240px"
          allow-clear
          @search="reload"
          @press-enter="reload"
        />
        <a-button @click="onMarkAllRead" :disabled="unreadTotal === 0">
          <template #icon><icon-check /></template>
          全部已读
        </a-button>
      </template>
    </a-page-header>

    <a-row :gutter="16">
      <!-- 左侧：分类导航（口径与 mock CategoryAPI 一致：CAT001~CAT004） -->
      <a-col :span="6">
        <a-card :bordered="false" title="通知分类">
          <div
            v-for="c in categoryNav" :key="c.id"
            class="category-item"
            :class="{ active: selectedCategoryId === c.id }"
            @click="selectCategory(c.id)"
          >
            <a-tag v-if="c.color" :color="c.color" size="small">{{ c.short }}</a-tag>
            <span v-else class="icon">📬</span>
            <strong>{{ c.name }}</strong>
            <a-badge v-if="c.unread > 0" :count="c.unread" :max-count="99" />
          </div>
          <a-divider style="margin: 12px 0" />
          <div class="total-line">
            未读合计：<strong>{{ unreadTotal }}</strong> 条
          </div>
        </a-card>
      </a-col>

      <!-- 右侧：通知列表 -->
      <a-col :span="18">
        <a-card :bordered="false" :title="currentCategoryName">
          <a-tabs v-model:active-key="filterRead" size="small" @change="page = 1">
            <a-tab-pane key="all" title="全部" />
            <a-tab-pane key="unread" title="未读" />
            <a-tab-pane key="read" title="已读" />
          </a-tabs>

          <a-spin :loading="loading" style="width: 100%">
            <a-list v-if="pagedList.length" :bordered="false">
              <a-list-item
                v-for="n in pagedList" :key="n.id"
                :class="{ unread: !n.read }"
                class="notif-item"
              >
                <a-list-item-meta>
                  <template #title>
                    <a-link class="notif-title" @click="openDetail(n)">{{ n.title }}</a-link>
                    <a-tag v-if="!n.read" color="red" size="small" class="ml-8">未读</a-tag>
                    <a-tag :color="priorityMeta(n.priority).color" size="small" class="ml-8">
                      {{ priorityMeta(n.priority).label }}
                    </a-tag>
                    <a-tag v-if="n.isTop" color="arcred" size="small" class="ml-8">置顶</a-tag>
                  </template>
                  <template #description>
                    <div class="notif-content">{{ n.content }}</div>
                    <div class="notif-meta">
                      <span>{{ n.category }}</span>
                      <a-divider direction="vertical" />
                      <span>{{ n.source }}</span>
                      <a-divider direction="vertical" />
                      <span>{{ n.publishTime }}</span>
                    </div>
                  </template>
                </a-list-item-meta>
                <template #actions>
                  <a-link v-if="!n.read" @click="onMarkRead(n)">标为已读</a-link>
                  <a-link
                    v-if="tableNameOf(n)"
                    @click="goToTable(n)"
                  >查看表详情</a-link>
                  <a-link @click="openDetail(n)">查看详情</a-link>
                </template>
              </a-list-item>
            </a-list>
            <a-empty v-else :description="emptyText">
              <a-button type="primary" @click="resetFilters">查看全部通知</a-button>
            </a-empty>
          </a-spin>

          <div v-if="filtered.length > pageSize" class="pager">
            <a-pagination
              v-model:current="page"
              :total="filtered.length"
              :page-size="pageSize"
              size="small"
              show-total
            />
          </div>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup lang="ts">
// 通知中心（2026-09 P4 重构）：
// 数据源统一为 mock/api/notification.ts 的 NotificationAPI（分类口径 CAT001~CAT004），
// 与 table-catalog-store / permission-store 的状态变更 notify() 联动；
// 未读数通过 notificationUnread$ 共享给 MainLayout 铃铛。
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { IconCheck } from '@arco-design/web-vue/es/icon'
import { NotificationAPI, CategoryAPI, notificationUnreadByCategory$ } from '@mock-dca/api/notification'

interface NotifRow {
  id: string
  title: string
  content: string
  category: string
  categoryId?: string
  priority: 'high' | 'medium' | 'low'
  status: string
  publishTime: string
  source: string
  isTop?: boolean
  read: boolean
}

const router = useRouter()

const loading = ref(false)
const keyword = ref('')
const filterRead = ref<'all' | 'unread' | 'read'>('all')
const page = ref(1)
const pageSize = 10

// ── 分类导航：CAT001~CAT004 + "全部" ──────────────
const CATEGORY_SHORT: Record<string, { short: string; color: string }> = {
  CAT001: { short: '系统', color: 'blue' },
  CAT002: { short: '治理', color: 'green' },
  CAT003: { short: '审批', color: 'orange' },
  CAT004: { short: '告警', color: 'red' }
}
function catShort(id?: string) { return CATEGORY_SHORT[id || '']?.short || '通知' }
function catColor(id?: string) { return CATEGORY_SHORT[id || '']?.color || 'gray' }

const categories = ref<Array<{ id: string; name: string }>>([])
const selectedCategoryId = ref('all')

const unreadByCat = notificationUnreadByCategory$
const unreadTotal = computed(() =>
  Object.values(unreadByCat.value).reduce((s, n) => s + n, 0)
)

const categoryNav = computed(() => [
  { id: 'all', name: '全部通知', short: '', color: '', unread: unreadTotal.value },
  ...categories.value.map(c => ({
    id: c.id, name: c.name,
    short: catShort(c.id), color: catColor(c.id),
    unread: unreadByCat.value[c.id] || 0
  }))
])

const currentCategoryName = computed(() => {
  if (selectedCategoryId.value === 'all') return '全部通知'
  return categories.value.find(c => c.id === selectedCategoryId.value)?.name || '通知列表'
})

// ── 列表加载与过滤 ──────────────────────────────
const allRows = ref<NotifRow[]>([])

async function loadCategories() {
  const res = await CategoryAPI.getCategories()
  if (res.success) categories.value = res.data.map((c: any) => ({ id: c.id, name: c.name }))
}

async function reload() {
  loading.value = true
  try {
    const res = await NotificationAPI.getNotifications({
      page: 1, pageSize: 100,
      status: 'published',
      category: selectedCategoryId.value === 'all' ? undefined : selectedCategoryId.value,
      keyword: keyword.value || undefined
    })
    if (res.success) allRows.value = res.data.list
  } finally {
    loading.value = false
  }
}

const filtered = computed(() => {
  if (filterRead.value === 'unread') return allRows.value.filter(n => !n.read)
  if (filterRead.value === 'read') return allRows.value.filter(n => n.read)
  // 已读在前置顶？保持时间序（新→旧），置顶优先
  return [...allRows.value].sort((a, b) => Number(!!b.isTop) - Number(!!a.isTop))
})

const pagedList = computed(() => {
  const start = (page.value - 1) * pageSize
  return filtered.value.slice(start, start + pageSize)
})

const emptyText = computed(() => {
  if (keyword.value) return `没有匹配「${keyword.value}」的通知`
  if (filterRead.value === 'unread') return '当前分类没有未读通知'
  if (filterRead.value === 'read') return '当前分类还没有已读通知'
  return '该分类下暂无通知'
})

function selectCategory(id: string) {
  selectedCategoryId.value = id
  page.value = 1
  reload()
}

function resetFilters() {
  keyword.value = ''
  filterRead.value = 'all'
  selectCategory('all')
}

// ── 已读操作（直接改 store，MainLayout 铃铛即时联动）──
function onMarkRead(n: NotifRow) {
  NotificationAPI.markRead(n.id)
  Message.success('已标记为已读')
}

function onMarkAllRead() {
  NotificationAPI.markAllRead()
  Message.success('全部通知已标记为已读')
  reload()
}

// ── 查看详情 & 直达变更对象 ─────────────────────
function openDetail(n: NotifRow) {
  NotificationAPI.markRead(n.id)
  router.push({ name: 'notification-detail', params: { id: n.id } })
}

/** 从审批类通知文案中提取表英文名：「dim_user」或（ods.x）形式 */
function tableNameOf(n: NotifRow): string {
  const text = `${n.title} ${n.content}`
  const m = text.match(/「([a-z][a-z0-9_]*(?:\.[a-z0-9_]+)?)」/) ||
            text.match(/（([a-z][a-z0-9_]*(?:\.[a-z0-9_]+)?)）/)
  return m ? m[1] : ''
}

function goToTable(n: NotifRow) {
  const name = tableNameOf(n)
  if (!name) return
  NotificationAPI.markRead(n.id)
  router.push({ name: 'data-map-table', params: { tableName: name }, query: { tab: 'fields' } })
}

// ── 窄类型取值助手（规避模板 any 索引的 TS7053）──
function priorityMeta(p: string): { label: string; color: string } {
  if (p === 'high') return { label: '高', color: 'red' }
  if (p === 'medium') return { label: '中', color: 'orange' }
  return { label: '低', color: 'gray' }
}

onMounted(async () => {
  await loadCategories()
  await reload()
})
</script>

<style lang="scss" scoped>
.notifications-page {
  padding: 24px;
  max-width: 1500px;
  margin: 0 auto;

  .category-item {
    padding: 12px;
    border-radius: 4px;
    margin-bottom: 6px;
    cursor: pointer;
    background: #fafbfc;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s;
    &:hover { background: #f2f3f5; }
    &.active { background: #e8f3ff; }
    .icon { font-size: 18px; }
  }

  .total-line {
    color: #86909c;
    font-size: 13px;
    padding: 0 12px;
  }

  .notif-item {
    &.unread {
      background: #f0f7ff;
      border-left: 3px solid #165dff;
    }
    .notif-title { font-weight: 600; font-size: 14px; }
    .ml-8 { margin-left: 8px; }
    .notif-content { color: #4e5969; font-size: 13px; }
    .notif-meta { color: #86909c; font-size: 12px; margin-top: 4px; }
  }

  .pager {
    margin-top: 12px;
    display: flex;
    justify-content: flex-end;
  }
}
</style>
