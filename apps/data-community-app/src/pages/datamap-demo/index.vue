<template>
  <PageContainer size="wide">
    <PageHeader
      title="数据地图 · 新版 Demo"
      sub-title="授信支用一条链：实体关系图 → 推荐表 → 字段（只读演示，与现状页并存）"
      show-back
      back-text="返回数据发现"
      @back="goDiscovery"
    />
    <div class="dm-body">
      <a-tabs v-model:active-key="tab" type="rounded" class="dm-tabs">
        <a-tab-pane key="old" title="① 现状对照">
          <OldExperience v-if="tab === 'old'" />
        </a-tab-pane>
        <a-tab-pane key="graph" title="② 关系图下钻">
          <GraphView v-if="tab === 'graph'" />
        </a-tab-pane>
        <a-tab-pane key="compare" title="③ 结果对照">
          <CompareResult v-if="tab === 'compare'" />
        </a-tab-pane>
      </a-tabs>
    </div>
  </PageContainer>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import PageContainer from '@/components-dca/common/PageContainer.vue'
import PageHeader from '@/components-dca/common/PageHeader.vue'
import OldExperience from './components/OldExperience.vue'
import GraphView from './components/GraphView.vue'
import CompareResult from './components/CompareResult.vue'

const router = useRouter()
const tab = ref('graph')

function goDiscovery () {
  router.push({ name: 'discovery' })
}
</script>

<style scoped>
.dm-body {
  padding: 0 16px 24px;
}
.dm-tabs :deep(.arco-tabs-content) {
  padding-top: 12px;
}
</style>
