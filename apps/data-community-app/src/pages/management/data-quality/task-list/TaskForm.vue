<template>
  <div class="quality-task-form">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <a-button type="text" @click="handleBack">
          <template #icon><IconArrowLeft /></template>
          返回
        </a-button>
        <h2 class="page-title">{{ isEdit ? '编辑校验任务' : '新建校验任务' }}</h2>
      </div>
      <div class="header-right">
        <a-space>
          <a-button @click="handleBack">取消</a-button>
          <a-button type="primary" @click="handleSave" :loading="saving">
            {{ isEdit ? '保存' : '创建任务' }}
          </a-button>
        </a-space>
      </div>
    </div>

    <!-- 表单内容 -->
    <a-form ref="formRef" :model="formData" :rules="formRules" layout="vertical">
      <!-- 基本信息 -->
      <a-card title="基本信息" class="form-section">
        <a-row :gutter="24">
          <a-col :span="12">
            <a-form-item label="任务名称" field="name" required>
              <a-input
                v-model="formData.name"
                placeholder="请输入任务名称（同一创建人下不可重复）"
                :max-length="50"
                show-word-limit
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="超时时间（秒）" field="timeout">
              <a-input-number
                v-model="formData.timeout"
                :min="60"
                :max="3600"
                placeholder="默认300秒"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="任务描述" field="description">
          <a-textarea
            v-model="formData.description"
            placeholder="请输入任务描述"
            :max-length="200"
            show-word-limit
            :auto-size="{ minRows: 2, maxRows: 4 }"
          />
        </a-form-item>
      </a-card>

      <!-- 源端配置 -->
      <a-card title="源端数据源配置" class="form-section">
        <a-row :gutter="24">
          <a-col :span="8">
            <a-form-item label="数据源" field="source.datasourceId" required>
              <a-select
                v-model="formData.source.datasourceId"
                placeholder="请选择数据源"
                @change="onSourceDatasourceChange"
              >
                <a-option v-for="ds in dataSources" :key="ds.id" :value="ds.id">
                  {{ ds.name }} ({{ ds.type }})
                </a-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="数据库" field="source.database" required>
              <a-select
                v-model="formData.source.database"
                placeholder="请选择数据库"
                :disabled="!formData.source.datasourceId"
                allow-search
                @change="onSourceDatabaseChange"
              >
                <a-option v-for="db in sourceDatabases" :key="db" :value="db">{{ db }}</a-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="数据表" field="source.table" required>
              <a-select
                v-model="formData.source.table"
                placeholder="请选择数据表"
                :disabled="!formData.source.database"
                allow-search
                @change="onSourceTableChange"
              >
                <a-option v-for="t in sourceTables" :key="t.name" :value="t.name">{{ t.name }}</a-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="24">
          <a-col :span="12">
            <a-form-item label="分区条件（选填）" field="source.partition">
              <a-input
                v-model="formData.source.partition"
                placeholder="支持特征，如 ${dt}，非分区表留空"
                :disabled="!formData.source.table"
              />
              <template #extra>
                <span class="form-hint">分区表按分区校验，非分区表全表校验</span>
              </template>
            </a-form-item>
          </a-col>
        </a-row>
      </a-card>

      <!-- 目标端配置 -->
      <a-card title="目标端数据源配置" class="form-section">
        <a-alert v-if="sameDatasourceError" type="error" style="margin-bottom: 16px">
          源端和目标端必须来自不同数据源（同库校验走现有DQC）
        </a-alert>
        <a-row :gutter="24">
          <a-col :span="8">
            <a-form-item label="数据源" field="target.datasourceId" required>
              <a-select
                v-model="formData.target.datasourceId"
                placeholder="请选择数据源"
                @change="onTargetDatasourceChange"
              >
                <a-option v-for="ds in dataSources" :key="ds.id" :value="ds.id">
                  {{ ds.name }} ({{ ds.type }})
                </a-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="数据库" field="target.database" required>
              <a-select
                v-model="formData.target.database"
                placeholder="请选择数据库"
                :disabled="!formData.target.datasourceId"
                allow-search
                @change="onTargetDatabaseChange"
              >
                <a-option v-for="db in targetDatabases" :key="db" :value="db">{{ db }}</a-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="数据表" field="target.table" required>
              <a-select
                v-model="formData.target.table"
                placeholder="请选择数据表"
                :disabled="!formData.target.database"
                allow-search
                @change="onTargetTableChange"
              >
                <a-option v-for="t in targetTables" :key="t.name" :value="t.name">{{ t.name }}</a-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="24">
          <a-col :span="12">
            <a-form-item label="分区条件（选填）" field="target.partition">
              <a-input
                v-model="formData.target.partition"
                placeholder="支持特征，如 ${dt}，非分区表留空"
                :disabled="!formData.target.table"
              />
            </a-form-item>
          </a-col>
        </a-row>
      </a-card>

      <!-- 校验规则 -->
      <a-card title="校验规则配置" class="form-section">
        <div class="rules-section">
          <div class="rules-header">
            <span class="rules-tip">
              可添加多条校验规则，每条规则独立配置校验类型、质量维度与字段；校验方式：count（条数）/ sum（金额汇总）
            </span>
            <a-button
              size="small"
              type="primary"
              @click="addRule"
              :disabled="!formData.source.table || !formData.target.table"
            >
              <template #icon><IconPlus /></template>
              添加规则
            </a-button>
          </div>

          <div class="rules-list">
            <div
              v-for="(rule, index) in formData.rules"
              :key="rule._uid"
              class="rule-item"
            >
              <div class="rule-header">
                <span class="rule-index">规则 {{ index + 1 }}</span>
                <a-button
                  size="mini"
                  status="danger"
                  @click="removeRule(index)"
                  v-if="formData.rules.length > 1"
                >
                  <template #icon><IconDelete /></template>
                  删除
                </a-button>
              </div>
              <a-row :gutter="16">
                <a-col :span="8">
                  <a-form-item label="规则名称" :field="`rules[${index}].name`" required>
                    <a-input
                      v-model="rule.name"
                      placeholder="如：用户表条数校验"
                      :max-length="30"
                    />
                  </a-form-item>
                </a-col>
                <a-col :span="6">
                  <a-form-item label="校验类型" :field="`rules[${index}].type`" required>
                    <a-radio-group v-model="rule.type" @change="onRuleTypeChange(rule)">
                      <a-radio value="count">count 条数</a-radio>
                      <a-radio value="sum">sum 汇总</a-radio>
                    </a-radio-group>
                  </a-form-item>
                </a-col>
                <a-col :span="6">
                  <a-form-item label="质量维度" :field="`rules[${index}].dimension`" required>
                    <a-select v-model="rule.dimension" placeholder="选择质量维度">
                      <a-option
                        v-for="dim in QUALITY_DIMENSIONS"
                        :key="dim"
                        :value="dim"
                      >
                        {{ QUALITY_DIM_LABELS[dim] }}
                      </a-option>
                    </a-select>
                    <template #extra>
                      <span class="form-hint">用于五维质量评分回流资产目录</span>
                    </template>
                  </a-form-item>
                </a-col>
              </a-row>
              <a-row :gutter="16">
                <a-col :span="8">
                  <a-form-item label="源端校验字段" :field="`rules[${index}].sourceField`" required>
                    <a-select v-model="rule.sourceField" placeholder="选择源端字段" allow-search>
                      <a-option
                        v-for="f in getAvailableFields(sourceFields, rule.type)"
                        :key="f.name"
                        :value="f.name"
                      >
                        {{ f.name }} ({{ f.type }})
                      </a-option>
                    </a-select>
                  </a-form-item>
                </a-col>
                <a-col :span="8">
                  <a-form-item label="目标端校验字段" :field="`rules[${index}].targetField`" required>
                    <a-select v-model="rule.targetField" placeholder="选择目标端字段" allow-search>
                      <a-option
                        v-for="f in getAvailableFields(targetFields, rule.type)"
                        :key="f.name"
                        :value="f.name"
                      >
                        {{ f.name }} ({{ f.type }})
                      </a-option>
                    </a-select>
                  </a-form-item>
                </a-col>
                <a-col :span="6" v-if="rule.type === 'sum'">
                  <div class="rule-hint-inline">
                    <IconInfoCircle />
                    <span>sum 仅支持数值类型字段</span>
                  </div>
                </a-col>
              </a-row>
            </div>

            <div v-if="formData.rules.length === 0" class="empty-rules">
              <IconInfoCircle />
              <span>暂无校验规则，配置好源端和目标端表后点击"添加规则"</span>
            </div>
          </div>
        </div>
      </a-card>

      <!-- 调度配置 -->
      <a-card title="调度配置" class="form-section">
        <a-row :gutter="24">
          <a-col :span="8">
            <a-form-item label="调度周期" field="scheduleType" required>
              <a-radio-group v-model="formData.scheduleType">
                <a-radio value="daily">按天</a-radio>
                <a-radio value="weekly">按周</a-radio>
              </a-radio-group>
            </a-form-item>
          </a-col>
          <a-col :span="8" v-if="formData.scheduleType === 'weekly'">
            <a-form-item label="调度日期" field="scheduleDay" required>
              <a-select v-model="formData.scheduleDay" placeholder="请选择">
                <a-option value="周一">周一</a-option>
                <a-option value="周二">周二</a-option>
                <a-option value="周三">周三</a-option>
                <a-option value="周四">周四</a-option>
                <a-option value="周五">周五</a-option>
                <a-option value="周六">周六</a-option>
                <a-option value="周日">周日</a-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="运行时间" field="scheduleTime" required>
              <a-time-picker
                v-model="formData.scheduleTime"
                format="HH:mm"
                placeholder="选择运行时间"
                style="width: 100%"
              />
              <template #extra>
                <span class="form-hint">建议非高峰时段（20:00-06:00）</span>
              </template>
            </a-form-item>
          </a-col>
        </a-row>
      </a-card>
    </a-form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import {
  IconArrowLeft,
  IconPlus,
  IconDelete,
  IconInfoCircle
} from '@arco-design/web-vue/es/icon'
import {
  getDataSources,
  getDatabases,
  getTables,
  getTableFields,
  getQualityTaskDetail,
  createQualityTask,
  updateQualityTask,
  QUALITY_DIMENSIONS,
  QUALITY_DIM_LABELS,
  RULE_TYPE_DEFAULT_DIM,
  dimOfRule,
  type QualityDimension
} from '../../../../mock/api/dataQuality'

const router = useRouter()
const route = useRoute()
const formRef = ref<any>()
const saving = ref(false)
const ruleUidCounter = ref(1)

const isEdit = computed(() => !!route.params.id)

const dataSources = ref<any[]>([])
const sourceDatabases = ref<string[]>([])
const sourceTables = ref<any[]>([])
const sourceFields = ref<any[]>([])
const targetDatabases = ref<string[]>([])
const targetTables = ref<any[]>([])
const targetFields = ref<any[]>([])

const formData = reactive({
  name: '',
  description: '',
  rules: [] as Array<{
    _uid: string
    id?: string
    name: string
    type: 'count' | 'sum'
    dimension: QualityDimension
    sourceField: string | null
    targetField: string | null
  }>,
  timeout: 300,
  scheduleType: 'daily' as 'daily' | 'weekly',
  scheduleTime: '22:00',
  scheduleDay: '',
  source: {
    datasourceId: '',
    datasourceName: '',
    database: '',
    table: '',
    partition: ''
  },
  target: {
    datasourceId: '',
    datasourceName: '',
    database: '',
    table: '',
    partition: ''
  }
})

const sameDatasourceError = computed(() => {
  return !!(
    formData.source.datasourceId &&
    formData.target.datasourceId &&
    formData.source.datasourceId === formData.target.datasourceId
  )
})

const formRules = {
  name: [
    { required: true, message: '请输入任务名称' },
    { minLength: 2, message: '任务名称至少2个字符' },
    { maxLength: 50, message: '任务名称不能超过50个字符' }
  ],
  scheduleType: [{ required: true, message: '请选择调度周期' }],
  scheduleTime: [{ required: true, message: '请选择运行时间' }],
  'source.datasourceId': [{ required: true, message: '请选择源端数据源' }],
  'source.database': [{ required: true, message: '请选择源端数据库' }],
  'source.table': [{ required: true, message: '请选择源端数据表' }],
  'target.datasourceId': [{ required: true, message: '请选择目标端数据源' }],
  'target.database': [{ required: true, message: '请选择目标端数据库' }],
  'target.table': [{ required: true, message: '请选择目标端数据表' }]
}

const handleBack = () => {
  router.push('/management/data-quality/tasks')
}

// 源端级联
const onSourceDatasourceChange = async (val: string) => {
  formData.source.database = ''
  formData.source.table = ''
  sourceDatabases.value = []
  sourceTables.value = []
  sourceFields.value = []
  if (!val) return
  try {
    const data = await getDatabases(val)
    sourceDatabases.value = data || []
  } catch (e) {
    /* noop */
  }
}

const onSourceDatabaseChange = async (val: string) => {
  formData.source.table = ''
  sourceTables.value = []
  sourceFields.value = []
  if (!val) return
  try {
    const data = await getTables(formData.source.datasourceId, val)
    sourceTables.value = data || []
  } catch (e) {
    /* noop */
  }
}

const onSourceTableChange = async (val: string) => {
  sourceFields.value = []
  if (!val) return
  try {
    const data = await getTableFields(formData.source.datasourceId, formData.source.database, val)
    sourceFields.value = data || []
  } catch (e) {
    /* noop */
  }
}

// 目标端级联
const onTargetDatasourceChange = async (val: string) => {
  formData.target.database = ''
  formData.target.table = ''
  targetDatabases.value = []
  targetTables.value = []
  targetFields.value = []
  if (!val) return
  try {
    const data = await getDatabases(val)
    targetDatabases.value = data || []
  } catch (e) {
    /* noop */
  }
}

const onTargetDatabaseChange = async (val: string) => {
  formData.target.table = ''
  targetTables.value = []
  targetFields.value = []
  if (!val) return
  try {
    const data = await getTables(formData.target.datasourceId, val)
    targetTables.value = data || []
  } catch (e) {
    /* noop */
  }
}

const onTargetTableChange = async (val: string) => {
  targetFields.value = []
  if (!val) return
  try {
    const data = await getTableFields(formData.target.datasourceId, formData.target.database, val)
    targetFields.value = data || []
  } catch (e) {
    /* noop */
  }
}

const addRule = () => {
  formData.rules.push({
    _uid: `ru_${ruleUidCounter.value++}`,
    name: '',
    type: 'count',
    dimension: 'consistency',
    sourceField: null,
    targetField: null
  })
}

// 切换校验类型时，未选维度按类型给一个默认维度（count→一致性，sum→准确性）
const onRuleTypeChange = (rule: { type: 'count' | 'sum'; dimension: QualityDimension }) => {
  if (!rule.dimension) rule.dimension = RULE_TYPE_DEFAULT_DIM[rule.type]
}

const removeRule = (index: number) => {
  formData.rules.splice(index, 1)
}

// count 可选所有字段，sum 仅限数值类型字段
const getAvailableFields = (fields: any[], type: string) => {
  if (type === 'sum') return fields.filter(f => f.isNumeric)
  return fields
}

const handleSave = async () => {
  // R01: 源端和目标端必须来自不同数据源
  if (sameDatasourceError.value) {
    Message.error('源端和目标端必须来自不同数据源')
    return
  }

  // 校验规则至少一条
  if (formData.rules.length === 0) {
    Message.error('至少需要添加一条校验规则')
    return
  }

  // 校验每条规则
  for (let i = 0; i < formData.rules.length; i++) {
    const r = formData.rules[i]
    if (!r.name?.trim()) {
      Message.error(`规则${i + 1}: 请填写规则名称`)
      return
    }
    if (!r.dimension) {
      Message.error(`规则${i + 1}: 请选择质量维度`)
      return
    }
    if (!r.sourceField || !r.targetField) {
      Message.error(`规则${i + 1}: 请选择源端和目标端校验字段`)
      return
    }
  }

  try {
    const errors = await formRef.value?.validate?.()
    if (errors) return

    saving.value = true
    const dsMap: Record<string, string> = {}
    dataSources.value.forEach((d: any) => { dsMap[d.id] = d.name })
    const payload = {
      ...formData,
      rules: formData.rules.map(r => ({
        id: r.id,
        name: r.name,
        type: r.type,
        dimension: r.dimension,
        sourceField: r.sourceField,
        targetField: r.targetField
      })),
      source: { ...formData.source, datasourceName: dsMap[formData.source.datasourceId] },
      target: { ...formData.target, datasourceName: dsMap[formData.target.datasourceId] }
    }

    if (isEdit.value) {
      await updateQualityTask(route.params.id as string, payload)
      Message.success('任务更新成功')
    } else {
      await createQualityTask(payload)
      Message.success('任务创建成功')
    }
    router.push('/management/data-quality/tasks')
  } catch (e: any) {
    if (e?.length) {
      Message.error('请检查表单填写')
    } else {
      Message.error(e?.message || '保存失败')
    }
  } finally {
    saving.value = false
  }
}

const loadTaskData = async () => {
  if (!isEdit.value) return
  try {
    const data = await getQualityTaskDetail(route.params.id as string)
    Object.assign(formData, {
      name: data.name,
      description: data.description,
      rules: (data.rules || []).map((r: any) => ({
        _uid: `ru_${ruleUidCounter.value++}`,
        id: r.id,
        name: r.name,
        type: r.type,
        dimension: dimOfRule(r),
        sourceField: r.sourceField,
        targetField: r.targetField
      })),
      timeout: data.timeout,
      scheduleType: data.scheduleType,
      scheduleTime: data.scheduleTime,
      scheduleDay: data.scheduleDay || '',
      source: { ...data.source },
      target: { ...data.target }
    })

    // 恢复级联数据
    if (formData.source.datasourceId) {
      const dbs = await getDatabases(formData.source.datasourceId)
      sourceDatabases.value = dbs || []
      if (formData.source.database) {
        const tbs = await getTables(formData.source.datasourceId, formData.source.database)
        sourceTables.value = tbs || []
        if (formData.source.table) {
          const fs = await getTableFields(formData.source.datasourceId, formData.source.database, formData.source.table)
          sourceFields.value = fs || []
        }
      }
    }
    if (formData.target.datasourceId) {
      const dbs = await getDatabases(formData.target.datasourceId)
      targetDatabases.value = dbs || []
      if (formData.target.database) {
        const tbs = await getTables(formData.target.datasourceId, formData.target.database)
        targetTables.value = tbs || []
        if (formData.target.table) {
          const fs = await getTableFields(formData.target.datasourceId, formData.target.database, formData.target.table)
          targetFields.value = fs || []
        }
      }
    }
  } catch (e: any) {
    Message.error(e?.message || '加载任务失败')
    handleBack()
  }
}

onMounted(async () => {
  try {
    const ds = await getDataSources()
    dataSources.value = ds || []
  } catch (e) {
    /* noop */
  }
  await loadTaskData()
})
</script>

<style scoped>
.quality-task-form {
  padding: 20px;
  background-color: #f5f5f5;
  min-height: 100vh;
  overflow-y: auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 16px 20px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1d2129;
}

.form-section {
  margin-bottom: 20px;
}

.form-hint {
  color: #86909c;
  font-size: 12px;
}

.rules-section {
  width: 100%;
}

.rules-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e5e6eb;
}

.rules-tip {
  font-size: 13px;
  color: #86909c;
  max-width: 70%;
}

.rules-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.rule-item {
  padding: 16px 20px;
  background: #f7f8fa;
  border-radius: 8px;
  border: 1px solid #e5e6eb;
}

.rule-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e5e6eb;
}

.rule-index {
  font-size: 14px;
  font-weight: 600;
  color: #1d2129;
}

.rule-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  color: #86909c;
  font-size: 12px;
  background: #e8f3ff;
  border-radius: 4px;
  margin-top: 4px;
}

.rule-hint-inline {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 0;
  color: #86909c;
  font-size: 12px;
}

.empty-rules {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 32px;
  color: #86909c;
  font-size: 14px;
  background: #f7f8fa;
  border-radius: 6px;
  border: 1px dashed #e5e6eb;
}
</style>