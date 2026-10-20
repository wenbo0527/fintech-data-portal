<template>
  <PageContainer size="wide" class="sync-home">
    <PageHeader
      title="我的同步任务"
      sub-title="数据任务服务(一期) · Doris ↔ Hive 同步任务的快速入口;主入口已合并到数据任务服务"
    >
      <template #extra>
        <a-space>
          <a-button @click="router.push({ name: 'unified-query-tasks' })">
            <template #icon><icon-thunderbolt /></template>
            数据任务服务
          </a-button>
          <a-button @click="router.push({ name: 'unified-query-tasks-instances' })">
            <template #icon><icon-list /></template>
            统一执行实例
          </a-button>
          <a-button type="primary" @click="router.push({ name: 'service-sync-create' })">
            <template #icon><icon-plus /></template>
            新建同步任务
          </a-button>
        </a-space>
      </template>
    </PageHeader>

    <!-- 一期合并提示(导向统一入口) -->
    <a-alert
      type="info"
      :show-icon="true"
      class="sync-home__merge"
    >
      <template #icon><icon-info-circle /></template>
      数据同步任务已合并到「数据任务服务」统一入口,同步 + 调度的执行实例也合并为同一份视图。
      顶部按钮可跳到新入口查询。
    </a-alert>

    <!-- 顶部能力说明卡(简单公告) -->
    <a-alert type="info" :show-icon="true" class="sync-home__intro">
      <template #icon><icon-info-circle /></template>
      <div class="sync-home__intro-title">本期能力</div>
      <ul class="sync-home__intro-list">
        <li>仅支持 <strong>Doris ↔ Hive</strong> 双向同步,目标表与源表同名,自动建表</li>
        <li>仅允许 <strong>个人账户</strong> 下的 <strong>非分区表</strong> 同步</li>
        <li>单表字段数 <strong>≤ {{ store.fieldLimit }}</strong>(超出需拆表),提交后只跑一次</li>
        <li>所有执行记录 <strong>全员可见</strong>,本模块不实现推送通知</li>
      </ul>
    </a-alert>

    <!-- 统计 -->
    <a-row :gutter="16" class="sync-home__stats">
      <a-col :span="6">
        <a-card :bordered="false">
          <a-statistic title="累计任务" :value="store.stats.total" />
          <div class="sync-home__stat-sub">{{ store.stats.success }} 成功 / {{ store.stats.failed }} 失败</div>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card :bordered="false">
          <a-statistic title="执行中/待执行" :value="store.stats.running" :value-style="{ color: '#165dff' }" />
          <div class="sync-home__stat-sub">含 pending + running</div>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card :bordered="false">
          <div class="sync-home__stat-row">
            <span class="sync-home__stat-row-label">最近一次成功</span>
            <span class="sync-home__stat-row-value">{{ latestSuccessAtText }}</span>
          </div>
          <div class="sync-home__stat-sub">同步方向:{{ latestSuccessDirection }}</div>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card :bordered="false">
          <a-statistic title="允许同步的库" :value="store.allowedDatabases.length" />
          <div class="sync-home__stat-sub">白名单机制,R01</div>
        </a-card>
      </a-col>
    </a-row>

    <!-- 最近记录快查(直接复用 records 页列表) -->
    <a-card
      :bordered="false"
      title="最近记录"
      class="sync-home__recent"
    >
      <template #extra>
        <a-link @click="router.push({ name: 'service-sync-records' })">
          查看全部 {{ store.records.length }} 条 →
        </a-link>
      </template>
      <a-table
        :columns="recentColumns"
        :data="recentList"
        :pagination="false"
        row-key="id"
        size="small"
        :scroll="{ x: 1000 }"
      >
        <template #id="{ record }">
          <a-link @click="router.push({ name: 'service-sync-records' })">{{ record.id }}</a-link>
        </template>
        <template #direction="{ record }">
          <a-tag :color="directionMeta(record.direction).color" size="small">
            {{ directionMeta(record.direction).text }}
          </a-tag>
        </template>
        <template #status="{ record }">
          <a-tag :color="statusMeta(record.status).color" size="small">
            {{ statusMeta(record.status).text }}
          </a-tag>
        </template>
        <template #empty>
          <a-empty description="暂无执行记录">
            <a-button type="primary" @click="goCreate">立即新建</a-button>
          </a-empty>
        </template>
      </a-table>
    </a-card>

    <!-- 操作快捷入口 -->
    <a-row :gutter="16" class="sync-home__entry">
      <a-col :span="8">
        <a-card :bordered="false" class="sync-home__entry-card" hoverable>
          <div class="sync-home__entry-icon sync-home__entry-icon--green">
            <icon-plus />
          </div>
          <div class="sync-home__entry-title">新建同步任务</div>
          <div class="sync-home__entry-desc">选择允许同步的数据库与源表 → 系统推导目标端 → 执行一次</div>
          <a-button type="primary" long @click="goCreate">立即创建</a-button>
        </a-card>
      </a-col>
      <a-col :span="8">
        <a-card :bordered="false" class="sync-home__entry-card" hoverable>
          <div class="sync-home__entry-icon sync-home__entry-icon--blue">
            <icon-list />
          </div>
          <div class="sync-home__entry-title">查看执行记录</div>
          <div class="sync-home__entry-desc">查看全部同步任务的方向、状态、耗时,支持按方向/状态/发起人筛选</div>
          <a-button long @click="router.push({ name: 'service-sync-records' })">进入记录</a-button>
        </a-card>
      </a-col>
      <a-col :span="8">
        <a-card :bordered="false" class="sync-home__entry-card sync-home__entry-card--disabled">
          <div class="sync-home__entry-icon sync-home__entry-icon--gray">
            <icon-notification />
          </div>
          <div class="sync-home__entry-title">通知推送(本期不实现)</div>
          <div class="sync-home__entry-desc">一期不接入公众号/数字社区推送,后续接入调度模块时一并支持</div>
          <a-button long disabled>即将开放</a-button>
        </a-card>
      </a-col>
    </a-row>
  </PageContainer>
</template>

<script setup lang="ts">
/**
 * 数据任务服务(一期) · Doris ↔ Hive 双向自助同步 - 模块首页
 *
 * 入口着陆页,展示本期能力、快查最近记录、给出"新建/记录"两个入口;
 * 通知模块以 disabled 卡片占位,标注"即将开放",便于二期接入。
 */
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import PageContainer from '@/components-dca/common/PageContainer.vue'
import PageHeader from '@/components-dca/common/PageHeader.vue'
import { useSyncTaskStore } from '@/stores-dca/management/sync-task'
import { SYNC_DIRECTION_META, SYNC_STATUS_META } from '@/mock/service/sync-tasks'
import type { SyncDirection, SyncStatus } from '@/mock/service/sync-tasks-types'

const router = useRouter()
const store = useSyncTaskStore()

const goCreate = () => router.push({ name: 'service-sync-create' })

const recentList = computed(() =>
  [...store.records]
    .sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1))
    .slice(0, 5)
)

function directionMeta(d: SyncDirection) {
  return SYNC_DIRECTION_META[d] ?? { text: d, color: 'gray' }
}
function statusMeta(s: SyncStatus) {
  return SYNC_STATUS_META[s] ?? { text: s, color: 'gray' }
}

const recentColumns = [
  { title: '任务编号', dataIndex: 'id', slotName: 'id', width: 200 },
  { title: '同步方向', dataIndex: 'direction', slotName: 'direction', width: 130 },
  { title: '源表', dataIndex: 'sourceTable', width: 220 },
  { title: '目标表', dataIndex: 'targetTable', width: 220 },
  { title: '执行状态', dataIndex: 'status', slotName: 'status', width: 110 },
  { title: '发起人', dataIndex: 'creator', width: 100 },
  { title: '提交时间', dataIndex: 'startedAt', width: 170 }
]

const latestSuccess = computed(() =>
  [...store.records]
    .filter(r => r.status === 'success')
    .sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1))[0]
)

const latestSuccessAtText = computed(() => {
  if (!latestSuccess.value) return '—'
  return latestSuccess.value.startedAt.split(' ')[0]
})

const latestSuccessDirection = computed(() => {
  if (!latestSuccess.value) return '—'
  return directionMeta(latestSuccess.value.direction).text
})
</script>

<style lang="scss" scoped>
.sync-home {
  &__merge {
    margin: 0 24px 16px;
  }
  &__intro {
    margin: 0 24px 16px;
    &-title {
      font-weight: 600;
      margin-bottom: 4px;
    }
    &-list {
      margin: 0 0 0 18px;
      list-style: disc;
      color: var(--color-text-2);
      font-size: 13px;
      li {
        margin: 2px 0;
      }
    }
  }
  &__stats {
    margin: 0 24px 16px;
    :deep(.arco-card-body) {
      padding: 16px;
    }
    .arco-card {
      :deep(.arco-statistic) {
        margin-bottom: 4px;
      }
    }
  }
  &__stat-sub {
    font-size: 12px;
    color: var(--color-text-3);
    margin-top: 4px;
  }
  &__stat-row {
    display: flex;
    align-items: baseline;
    gap: 8px;
    &-label {
      font-size: 14px;
      color: var(--color-text-2);
    }
    &-value {
      font-size: 22px;
      font-weight: 600;
      color: rgb(var(--success-6));
    }
  }
  &__recent {
    margin: 0 24px 16px;
  }
  &__entry {
    margin: 0 24px 24px;
    &-card {
      text-align: center;
      padding: 24px 16px;
      :deep(.arco-card-body) {
        padding: 16px;
      }
    }
    &-icon {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      margin: 0 auto 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      &--green {
        background: rgb(var(--success-1));
        color: rgb(var(--success-6));
      }
      &--blue {
        background: rgb(var(--primary-1));
        color: rgb(var(--primary-6));
      }
      &--gray {
        background: var(--color-fill-2);
        color: var(--color-text-3);
      }
    }
    &-title {
      font-size: 15px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    &-desc {
      font-size: 12px;
      color: var(--color-text-3);
      min-height: 36px;
      margin-bottom: 16px;
    }
    &-card--disabled {
      opacity: 0.7;
    }
  }
}
</style>
