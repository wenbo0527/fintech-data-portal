<template>
  <div class="lineage-application">
    <div class="page-header">
      <div class="title">血缘分析</div>
      <div class="actions">
        <a-space>
          <a-input v-model="form.tableName" placeholder="请输入表名" style="width: 200px" />
          <a-select v-model="form.dataTypes" placeholder="数据类型" multiple style="width: 200px">
            <a-option value="Table">数据表</a-option>
            <a-option value="Metric">指标</a-option>
            <a-option value="API">API</a-option>
            <a-option value="Variable">特征</a-option>
          </a-select>
          <a-input-number v-model="form.layers" placeholder="层数" :min="1" :max="3" style="width: 100px" />
          <a-checkbox v-model="form.onlyFailed">仅显示异常</a-checkbox>
          <a-button type="primary" @click="handleSearch">
            <template #icon><IconSearch /></template>
            查询
          </a-button>
          <a-button @click="goBack">返回</a-button>
        </a-space>
      </div>
    </div>

    <div class="graph-wrapper">
      <LineageGraph 
        :table-name="currentTableName" 
        :layers="currentLayers" 
        :data-types="currentDataTypes"
        :only-failed="currentOnlyFailed"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { IconSearch } from '@arco-design/web-vue/es/icon'
import LineageGraph from './components/LineageGraph.vue'

const router = useRouter()
const route = useRoute()

// 支持 ?table=xxx 预置查询表名（表详情页血缘 Tab「血缘分析页打开」入口携带）
const form = reactive({
  tableName: String(route.query.table || 'dim_user'),
  layers: 1,
  dataTypes: [],
  onlyFailed: false
})

const currentTableName = ref(form.tableName)
const currentLayers = ref(form.layers)
const currentDataTypes = ref(form.dataTypes)
const currentOnlyFailed = ref(form.onlyFailed)

const goBack = () => {
  router.push('/discovery')
}

const handleSearch = () => {
  currentTableName.value = form.tableName
  currentLayers.value = form.layers
  currentDataTypes.value = form.dataTypes
  currentOnlyFailed.value = form.onlyFailed
}
</script>

<style scoped>
.lineage-application {
  /* 60px header + 32px padding (16px * 2) = 92px */
  height: calc(100vh - 92px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.page-header {
  padding: 16px 24px;
  background: #fff;
  border-bottom: 1px solid var(--subapp-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title {
  font-size: 20px;
  font-weight: 600;
  color: var(--subapp-text-primary);
}

.graph-wrapper {
  flex: 1;
  overflow: hidden;
}
</style>
