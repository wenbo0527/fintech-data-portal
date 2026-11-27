<template>
  <div class="dm-old">
    <a-alert type="warning" class="dm-old-alert">
      本页不复制「旧版痛点页」。现状搜索页里 {{ stats.total }} 张在册表都已有口径说明，
      再造一个「说明留空」的页面会失真。这里只做对照说明，并直达真实页面。
    </a-alert>

    <a-row :gutter="16" class="dm-old-stats">
      <a-col :span="6">
        <a-statistic title="在册精编表" :value="stats.total" />
      </a-col>
      <a-col :span="6">
        <a-statistic title="已上线" :value="stats.online" />
      </a-col>
      <a-col :span="6">
        <a-statistic title="文档存量口径" :value="stats.declaredTotal" />
      </a-col>
      <a-col :span="6">
        <a-statistic title="平均质量分" :value="stats.avgQuality" />
      </a-col>
    </a-row>

    <a-card title="现状入口（旧版，零改动）" class="dm-old-links">
      <a-space direction="vertical" fill :size="10">
        <div class="dm-old-row">
          <div>
            <div class="dm-old-name">数据发现门户首页</div>
            <div class="dm-old-desc">banner + 搜索 + 常用表集合 + 数据体系全景，即原 dfd-app/data-map</div>
          </div>
          <router-link :to="{ name: 'discovery' }">
            <a-button type="outline" size="small">打开</a-button>
          </router-link>
        </div>
        <a-divider style="margin: 4px 0" />
        <div class="dm-old-row">
          <div>
            <div class="dm-old-name">全局搜索（7 Tab / 字段搜索）</div>
            <div class="dm-old-desc">按表名或字段搜，结果是平铺列表，需要自己判断用哪张</div>
          </div>
          <router-link :to="{ name: 'search' }">
            <a-button type="outline" size="small">打开</a-button>
          </router-link>
        </div>
        <a-divider style="margin: 4px 0" />
        <div class="dm-old-row">
          <div>
            <div class="dm-old-name">表详情（7 Tab）</div>
            <div class="dm-old-desc">单表口径 / 字段 / 血缘 / 质量 / 服务 / 权限 / 历史</div>
          </div>
          <router-link :to="{ name: 'data-map-table', params: { tableName: 'dwd_credit_apply' } }">
            <a-button type="outline" size="small">打开示例表</a-button>
          </router-link>
        </div>
      </a-space>
    </a-card>

    <a-card title="新版要解决的差异" class="dm-old-links">
      <a-typography-paragraph>
        现状是「搜到一堆表 → 逐张点开详情 → 自己比对分层与口径」。新版把入口换成
        <b>业务实体关系图</b>：先选业务环节（授信申请 / 授信合同 / 支用单 / 还款计划 / 贷后记录），
        再在该环节里按「推荐表 → 明细兜底 → 技术维护」三档直接给表，点表即见字段。
      </a-typography-paragraph>
      <a-typography-paragraph type="secondary">
        数据同源：新版与现状读的都是同一个 TableCatalogStore，不另造一份数据。
      </a-typography-paragraph>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { TableCatalogStore } from '@/mock-dca/shared/table-catalog-store'

const stats = TableCatalogStore.stats()
</script>

<style scoped>
.dm-old {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.dm-old-stats {
  margin-top: 2px;
}
.dm-old-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.dm-old-name {
  font-weight: 500;
  color: var(--dca-text-primary, #1d2129);
}
.dm-old-desc {
  font-size: 12px;
  color: var(--dca-text-tertiary, #86909c);
  margin-top: 2px;
}
</style>
