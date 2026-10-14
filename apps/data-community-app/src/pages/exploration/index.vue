<template>
  <div class="exploration-page">
    <a-page-header title="数据探索" sub-title="单客户画像查询、统一 SQL 查询、可视化分析工作流、跨域指标看板">
      <template #extra>
        <a-button @click="goWorkbench">返回工作台</a-button>
      </template>
    </a-page-header>

    <!-- 模块入口:4 个核心入口 + 指标中心,与侧栏菜单完全对齐 -->
    <a-row :gutter="16">
      <a-col :span="6">
        <a-card class="module-card" @click="go('exploration/customer360')">
          <template #title><span><icon-user-circle /> 客户 360</span></template>
          <p>单客户全维度画像:基本信息、信贷、还款、行为、触达记录</p>
          <div class="stats">
            <a-statistic title="已建画像" :value="1280" />
          </div>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card class="module-card" @click="go('exploration/unified-query/sql')">
          <template #title><span><icon-code /> 统一查询</span></template>
          <p>SQL 编辑执行、脚本管理、任务调度,统一入口查 Doris / Hive</p>
          <div class="stats">
            <a-statistic title="我的脚本" :value="4" />
          </div>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card class="module-card" @click="go('exploration/workflows')">
          <template #title><span><icon-flow /> 分析工作流</span></template>
          <p>可视化编排数据采集、清洗、计算、推送全流程</p>
          <div class="stats">
            <a-statistic title="我的工作流" :value="12" />
          </div>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card class="module-card" @click="go('exploration/indicator-dashboard')">
          <template #title><span><icon-dashboard /> 业务指标看板</span></template>
          <p>DAU/GMV/授信通过率 等业务指标可视化</p>
          <div class="stats">
            <a-statistic title="看板数量" :value="8" />
          </div>
        </a-card>
      </a-col>
    </a-row>

    <!-- 指标中心入口 -->
    <a-card class="module-card metrics-center-card" style="margin-top: 16px" @click="go('exploration/metrics-center')">
      <a-row align="center" :gutter="24">
        <a-col :span="6">
          <div style="display: flex; align-items: center; gap: 8px;">
            <icon-bookmark :size="28" style="color: #165dff" />
            <span style="font-size: 16px; font-weight: 600;">指标中心</span>
          </div>
          <p style="color: #86909c; font-size: 13px; margin-top: 8px;">一处定义、全局使用 — 指标注册、地图浏览、详情与版本管理、看板</p>
        </a-col>
        <a-col :span="18">
          <a-row :gutter="16">
            <a-col :span="6">
              <a-statistic title="已注册指标" :value="15" />
            </a-col>
            <a-col :span="6">
              <a-statistic title="启用中" :value="12" :value-style="{ color: '#00b42a' }" />
            </a-col>
            <a-col :span="6">
              <a-statistic title="草稿" :value="1" :value-style="{ color: '#ff7d00' }" />
            </a-col>
            <a-col :span="6">
              <a-statistic title="归档" :value="2" :value-style="{ color: '#86909c' }" />
            </a-col>
          </a-row>
        </a-col>
      </a-row>
    </a-card>

    <!-- 最近活动 -->
    <a-card title="最近探索活动" style="margin-top: 16px">
      <a-list>
        <a-list-item v-for="(a, idx) in recent" :key="idx">
          <a-list-item-meta>
            <template #avatar>
              <a-avatar :style="{ background: a.color }">{{ a.icon }}</a-avatar>
            </template>
            <template #title>{{ a.title }}</template>
            <template #description>{{ a.time }} · {{ a.summary }}</template>
          </a-list-item-meta>
        </a-list-item>
      </a-list>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const recent = ref([
  { icon: '👥', color: '#165dff', title: '查询客户 360「客户 C20260806***」', time: '今天 15:10', summary: '命中基本信息 + 信贷 + 还款 + 触达记录 4 类画像' },
  { icon: '🔀', color: '#722ed1', title: '新建分析工作流「月度资产盘点」', time: '今天 10:25', summary: '采集 + 清洗 + 聚合 + 推送,共 6 个节点' },
  { icon: '📊', color: '#0fc6c2', title: '更新指标看板「DAU 趋势」', time: '昨天 18:40', summary: '新增渠道下钻维度,共 12 个图表' },
])

function go(path: string) {
  router.push(path)
}
const goWorkbench = () => router.push('workbench')
</script>

<style lang="scss" scoped>
.exploration-page {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;

  .module-card {
    cursor: pointer;
    transition: all 0.2s;
    &:hover { transform: translateY(-2px); box-shadow: 0 4px 16px rgba(0,0,0,0.08); }

    p { color: #86909c; font-size: 13px; margin: 8px 0 12px; }
    .stats { padding-top: 12px; border-top: 1px solid #f2f3f5; }
  }

  .metrics-center-card {
    border: 1px solid #e8efff;
    background: linear-gradient(135deg, #f0f7ff 0%, #ffffff 100%);
  }
}
</style>