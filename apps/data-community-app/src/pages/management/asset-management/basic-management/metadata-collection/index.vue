<template>
  <!-- @prd: metadata-collection -->
  <div class="metadata-collection">
    <div class="page-header">
      <h2>元数据采集</h2>
      <a-space>
        <a-button type="primary" @click="submitTask" :loading="submitting">
          <template #icon><IconPlus /></template>
          创建采集任务
        </a-button>
        <a-button @click="resetForm">重置</a-button>
      </a-space>
    </div>
    <a-alert
      type="info"
      :show-icon="false"
      class="collection-tip"
      style="margin: 8px 0 16px"
    >
      <template #title>采集任务 ↔ 数据资产上下架 联动</template>
      点击「创建采集任务」并选择「运行」后，采集结果会自动登记到「数据资产/资源/要素」上下架台账。
      上下架页面的「同步元数据」按钮也会在这里新建一条采集任务，状态实时双向同步。
    </a-alert>

    <a-form ref="formRef" :model="form" :rules="rules" layout="vertical">
      <a-card title="任务与数据源">
        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item label="任务名称" field="taskName" required>
              <a-input v-model="form.taskName" placeholder="请输入任务名称" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="数据源类型" field="dataSourceType" required>
              <a-select v-model="form.dataSourceType" placeholder="选择数据源">
                <a-option value="Doris">Doris</a-option>
                <a-option value="Hive">Hive</a-option>
                <a-option value="Oracle">Oracle</a-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="采集对象类型" field="assetType" required>
              <a-select v-model="form.assetType" placeholder="选择采集对象">
                <a-option value="指标">指标</a-option>
                <a-option value="API">API</a-option>
                <a-option value="特征">特征</a-option>
                <a-option value="表">表</a-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <a-col :span="6">
            <a-form-item label="主机" field="connection.host">
              <a-input v-model="form.connection.host" placeholder="host" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="端口" field="connection.port">
              <a-input-number v-model="form.connection.port" :min="0" :max="65535" placeholder="port" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="用户名" field="connection.username">
              <a-input v-model="form.connection.username" placeholder="username" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="密码" field="connection.password">
              <a-input-password v-model="form.connection.password" placeholder="password" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="数据库/Schema" field="connection.database">
              <a-input v-model="form.connection.database" placeholder="数据库或Schema" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Schema(可选)" field="connection.schema">
              <a-input v-model="form.connection.schema" placeholder="Schema" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-card>

      <a-card title="基础元数据" style="margin-top: 16px">
        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item label="名称" field="basic.name" required>
              <a-input v-model="form.basic.name" placeholder="请输入名称" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="业务域" field="basic.domain">
              <a-select v-model="form.basic.domain" allow-clear placeholder="选择业务域">
                <a-option value="用户">用户</a-option>
                <a-option value="交易">交易</a-option>
                <a-option value="产品">产品</a-option>
                <a-option value="营销">营销</a-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="负责人" field="basic.owner">
              <a-input v-model="form.basic.owner" placeholder="负责人" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="描述" field="basic.description">
          <a-textarea v-model="form.basic.description" :rows="3" placeholder="请输入业务/技术描述" />
        </a-form-item>
        <a-form-item label="标签" field="basic.tags">
          <a-input-tag v-model="form.basic.tags" placeholder="输入并回车添加标签" />
        </a-form-item>
      </a-card>

      <a-card title="关联数据信息" style="margin-top: 16px">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="关联表">
              <a-input-tag v-model="form.association.relatedTables" placeholder="输入表名并回车" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="关联API">
              <a-input-tag v-model="form.association.relatedApis" placeholder="输入API名称并回车" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="关联指标">
              <a-input-tag v-model="form.association.relatedMetrics" placeholder="输入指标名称并回车" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="关联特征">
              <a-input-tag v-model="form.association.relatedVariables" placeholder="输入特征名称并回车" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-card>

      <a-card title="流转数据信息" style="margin-top: 16px">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="上游">
              <a-input-tag v-model="form.lineage.upstream" placeholder="输入上游节点并回车" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="下游">
              <a-input-tag v-model="form.lineage.downstream" placeholder="输入下游节点并回车" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="备注">
          <a-textarea v-model="form.lineage.notes" :rows="2" placeholder="补充说明" />
        </a-form-item>
      </a-card>

      <a-card title="业务元数据信息" style="margin-top: 16px">
        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item label="业务定义">
              <a-input v-model="form.business.businessDefinition" placeholder="业务定义" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="归属场景">
              <a-input v-model="form.business.scenario" placeholder="场景" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="更新频率">
              <a-select v-model="form.business.updateFrequency" allow-clear placeholder="选择频率">
                <a-option value="实时">实时</a-option>
                <a-option value="小时">小时</a-option>
                <a-option value="日">日</a-option>
                <a-option value="周">周</a-option>
                <a-option value="月">月</a-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="保密级别">
          <a-radio-group v-model="form.business.confidentiality">
            <a-radio value="高">高</a-radio>
            <a-radio value="中">中</a-radio>
            <a-radio value="低">低</a-radio>
          </a-radio-group>
        </a-form-item>
      </a-card>
    </a-form>
  </div>
  </template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { Message } from '@arco-design/web-vue'
import { IconPlus } from '@arco-design/web-vue/es/icon'
import type { FormInstance } from '@arco-design/web-vue'
import { createMetadataTask as createMetadataTaskApi, getMetadataTaskDetail } from '@/api-dca/metadata'
import { createMetadataTask, startMetadataTaskAsync } from '@/mock-dca/metadata-bus'
import { useRoute } from 'vue-router'

type DataSourceType = 'Doris' | 'Hive' | 'Oracle'
type AssetType = '指标' | 'API' | '特征' | '表'

const formRef = ref<FormInstance>()
const submitting = ref(false)

const form = reactive({
  taskName: '',
  dataSourceType: '' as DataSourceType,
  assetType: '' as AssetType,
  connection: {
    host: '',
    port: undefined as number | undefined,
    username: '',
    password: '',
    database: '',
    schema: ''
  },
  basic: {
    name: '',
    description: '',
    domain: '',
    tags: [] as string[],
    owner: ''
  },
  association: {
    relatedTables: [] as string[],
    relatedApis: [] as string[],
    relatedMetrics: [] as string[],
    relatedVariables: [] as string[]
  },
  lineage: {
    upstream: [] as string[],
    downstream: [] as string[],
    notes: ''
  },
  business: {
    businessDefinition: '',
    scenario: '',
    updateFrequency: '',
    confidentiality: '中' as '高' | '中' | '低'
  }
})

const rules = {
  taskName: [{ required: true, message: '请输入任务名称' }],
  dataSourceType: [{ required: true, message: '请选择数据源类型' }],
  assetType: [{ required: true, message: '请选择采集对象类型' }],
  'basic.name': [{ required: true, message: '请输入名称' }]
}

const resetForm = () => {
  Object.assign(form, {
    taskName: '',
    dataSourceType: '' as DataSourceType,
    assetType: '' as AssetType,
    connection: {
      host: '',
      port: undefined,
      username: '',
      password: '',
      database: '',
      schema: ''
    },
    basic: {
      name: '',
      description: '',
      domain: '',
      tags: [] as string[],
      owner: ''
    },
    association: {
      relatedTables: [] as string[],
      relatedApis: [] as string[],
      relatedMetrics: [] as string[],
      relatedVariables: [] as string[]
    },
    lineage: {
      upstream: [] as string[],
      downstream: [] as string[],
      notes: ''
    },
    business: {
      businessDefinition: '',
      scenario: '',
      updateFrequency: '',
      confidentiality: '中' as '高' | '中' | '低'
    }
  })
  formRef.value?.resetFields()
}

const submitTask = async () => {
  try {
    const valid = await formRef.value?.validate()
    if (!valid) return
    submitting.value = true
    const payload = {
      taskName: form.taskName,
      dataSourceType: form.dataSourceType,
      assetType: form.assetType,
      connection: { ...form.connection },
      basic: { ...form.basic },
      association: { ...form.association },
      lineage: { ...form.lineage },
      business: { ...form.business }
    }
    await createMetadataTaskApi(payload)
    // 同时注册到 metadata-bus，让它出现在任务列表里，并自动开始运行（联动 listing）
    const task = createMetadataTask({
      taskName: form.taskName,
      dataSourceType: form.dataSourceType,
      assetType: form.assetType
    })
    startMetadataTaskAsync(task.id)
    Message.success(`采集任务 ${task.id} 已创建，正在运行…`)
    resetForm()
  } catch (e: any) {
    Message.error(e?.message || '创建任务失败')
  } finally {
    submitting.value = false
  }
}

const route = useRoute()
onMounted(async () => {
  const id = route.params?.id || route.query?.id
  if (id) {
    try {
      const detail = await getMetadataTaskDetail(id as any)
      const d: any = (detail as any) || {}
      form.taskName = d.taskName || form.taskName
      form.dataSourceType = d.dataSourceType || form.dataSourceType
      form.assetType = d.assetType || form.assetType
      form.connection = { ...form.connection, ...(d.connection || {}) }
      form.basic = { ...form.basic, ...(d.basic || {}) }
      form.association = { ...form.association, ...(d.association || {}) }
      form.lineage = { ...form.lineage, ...(d.lineage || {}) }
      form.business = { ...form.business, ...(d.business || {}) }
    } catch (e: any) {
      Message.warning(e?.message || '加载任务详情失败')
    }
  }
})
</script>

<style scoped>
.metadata-collection {
  padding: 20px;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.page-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}
</style>
