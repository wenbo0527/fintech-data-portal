<template>
  <div class="metric-create-page">
    <a-page-header :title="isEdit ? '编辑指标' : '新建指标'" :show-back="true" @back="goBack" />

    <a-form ref="formRef" :model="formData" layout="vertical" class="metric-form">
      <a-tabs v-model:activeKey="activeTab" class="reader-tabs">
        <a-tab-pane key="human" title="人读属性">
      <!-- 基本信息 -->
      <a-card title="基本信息" class="form-card">
        <a-row :gutter="16">
          <a-col :span="6">
            <a-form-item field="name" label="指标名称" :rules="[{ required: true, message: '此项为必填' }, { minLength: 2, maxLength: 50, message: '2-50字符' }]" :validate-status="fieldStatus.name">
              <a-input v-model="formData.name" placeholder="2-50字符" :disabled="isEdit" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item field="code" label="指标编码" :rules="[{ required: true, message: '此项为必填' }, { match: /^[A-Za-z0-9]{2,20}$/, message: '英文数字组合，2-20字符' }]" :validate-status="fieldStatus.code">
              <a-input v-model="formData.code" placeholder="英文数字组合" :disabled="isEdit" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item field="type" label="指标类型" :rules="[{ required: true, message: '此项为必填' }]">
              <a-select v-model="formData.type" placeholder="请选择">
                <a-option v-for="t in typeOptions" :key="t.value" :value="t.value">{{ t.label }}</a-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item field="domain" label="指标域" :rules="[{ required: true, message: '此项为必填' }]">
              <a-select v-model="formData.domain" placeholder="请选择" @change="onDomainChange">
                <a-option v-for="d in domainOptions" :key="d" :value="d">{{ d }}</a-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item field="scenario" label="归属场景" :rules="[{ required: true, message: '此项为必填' }]">
              <a-select v-model="formData.scenario" placeholder="请选择" allow-create>
                <a-option v-for="s in currentScenarios" :key="s" :value="s">{{ s }}</a-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item field="businessOwner" label="业务负责人" :rules="[{ required: true, message: '此项为必填' }]">
              <a-select v-model="formData.businessOwner" placeholder="请选择" :filterable="true" show-header-on-empty>
                <a-option v-for="p in persons" :key="p.id" :value="p.name">{{ p.name }}（{{ p.department }}）</a-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item field="technicalOwner" label="技术负责人" :rules="[{ required: true, message: '此项为必填' }]">
              <a-select v-model="formData.technicalOwner" placeholder="请选择" :filterable="true">
                <a-option v-for="p in persons" :key="p.id" :value="p.name">{{ p.name }}（{{ p.department }}）</a-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item field="calculationFrequency" label="计算时效" :rules="[{ required: true, message: '此项为必填' }]">
              <a-select v-model="formData.calculationFrequency" placeholder="请选择">
                <a-option v-for="f in frequencyOptions" :key="f.value" :value="f.value">{{ f.label }}</a-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item field="sourceType" label="来源类型" :rules="[{ required: true, message: '此项为必填' }]">
              <a-select v-model="formData.sourceType" placeholder="请选择">
                <a-option v-for="s in sourceTypeOptions" :key="s.value" :value="s.value">{{ s.label }}</a-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item field="granularity" label="统计粒度" :rules="[{ required: true, message: '此项为必填' }]">
              <a-select v-model="formData.granularity" placeholder="请选择">
                <a-option v-for="g in granularityOptions" :key="g.value" :value="g.value">{{ g.label }}</a-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
      </a-card>

      <!-- 业务定义 -->
      <a-card title="业务定义" class="form-card">
        <a-form-item field="businessDefinition" label="业务口径" :rules="[{ required: true, message: '此项为必填' }]">
          <RichTextEditor v-model="formData.businessDefinition" />
        </a-form-item>
        <a-form-item field="useCase" label="使用场景">
          <RichTextEditor v-model="formData.useCase" />
        </a-form-item>
      </a-card>

      <!-- 技术逻辑 -->
      <a-card title="技术逻辑" class="form-card">
        <a-form-item field="technicalDefinition" label="技术口径" :rules="[{ required: true, message: '此项为必填' }]">
          <div class="sql-editor-wrap">
            <textarea
              v-model="formData.technicalDefinition"
              class="sql-editor"
              placeholder="输入SQL语句..."
              rows="8"
            />
          </div>
        </a-form-item>
        <a-form-item field="technicalUsageNotes" label="技术口径使用说明" :rules="[{ maxLength: 300, message: '最大300字符' }]">
          <a-textarea v-model="formData.technicalUsageNotes" placeholder="最大300字符" :max-length="300" show-word-limit :auto-size="{ minRows: 2 }" />
        </a-form-item>
      </a-card>

      <!-- 查询逻辑 -->
      <a-card title="查询逻辑（可选）" class="form-card">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item field="resultTable" label="结果表">
              <a-input v-model="formData.resultTable" placeholder="50字符以内" :max-length="50" />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item field="queryCode" label="查询代码">
              <textarea
                v-model="formData.queryCode"
                class="sql-editor"
                placeholder="输入查询SQL..."
                rows="5"
              />
            </a-form-item>
          </a-col>
        </a-row>
      </a-card>

      <!-- 报表挂载（从报表库选择，R14/R21） -->
      <a-card class="form-card">
        <template #title>
          报表挂载（可选）
          <span class="card-subtitle">从报表库选择报表，详情页"报表位置"由挂载自动派生（人机同源）</span>
        </template>
        <div v-for="(mount, idx) in formData.reportMounts" :key="idx" class="mount-item">
          <div class="mount-row">
            <a-select v-model="mount.reportId" placeholder="选择报表（报表库）" show-search :filter-option="filterReportOption" style="width: 360px" @change="onMountChange(mount)">
              <a-option v-for="r in reportOptions" :key="r.id" :value="r.id">{{ r.name }}</a-option>
            </a-select>
            <a-input v-model="mount.scenarioRoutingPrompt" placeholder="场景路由提示词（AG-11：什么场景来这个报表）" style="width: 460px; margin-left: 8px" />
            <a-button type="text" status="danger" @click="removeMount(idx)">
              <template #icon><IconDelete /></template>
            </a-button>
          </div>
          <div v-if="mountedEntry(mount.reportId)" class="mount-entry">访问入口：{{ mountedEntry(mount.reportId) }}</div>
        </div>
        <a-button type="dashed" long @click="addMount" :disabled="formData.reportMounts.length >= 10">
          <template #icon><IconPlus /></template>
          添加报表挂载（最多10个）
        </a-button>
      </a-card>

      <!-- 相似性检测 -->
      <a-card title="相似性检测" class="form-card" v-if="!isEdit">
        <a-button @click="handleSimilarity" :loading="similarityLoading">
          <template #icon><IconSearch /></template>
          相似性检测
        </a-button>
        <div v-if="similarityResults.length > 0" class="similarity-results">
          <a-alert type="info">检测到 {{ similarityResults.length }} 个相似指标：</a-alert>
          <a-list :data="similarityResults" :bordered="false">
            <template #item="{ item }">
              <a-list-item>
                <a-list-item-meta>
                  <template #title>
                    <a-link @click="goDetail(item.metric.id)">{{ item.metric.name }}</a-link>
                    <span style="margin-left: 8px; color: #86909c; font-size: 12px;">{{ item.metric.code }}</span>
                  </template>
                  <template #description>
                    <a-space>
                      <a-tag v-for="f in item.matchedFields" :key="f" color="red" size="small">{{ f }}</a-tag>
                      <span style="color: #ff4d4f; font-size: 12px;">相似度: {{ (item.similarity * 100).toFixed(0) }}%</span>
                    </a-space>
                  </template>
                </a-list-item-meta>
              </a-list-item>
            </template>
          </a-list>
        </div>
        <a-empty v-else-if="similarityChecked" description="未检测到相似指标" />
      </a-card>
        </a-tab-pane>

        <a-tab-pane key="agent">
          <template #title>
            <span>Agent 可读契约</span>
            <a-tag color="green" size="small" style="margin-left: 8px">新建全部选填</a-tag>
          </template>
          <a-alert type="info" class="agent-hint">Agent 侧仅「同义词 / 别名」保留结构化（参与搜索与相似问匹配）；语义类型、枚举映射、适用对象/场景、必需过滤、维度组等语义内容统一写入下方 Agent 说明文档（Markdown），不再逐项结构化。新建时全部选填，可稍后通过"编辑指标"随时补充。</a-alert>

      <!-- Agent 信息（仅同义词结构化） -->
      <a-card class="form-card">
        <template #title>
          Agent 信息（语义契约）
          <a-tag color="orangered" size="small" style="margin-left: 8px">二期智能问数接通地基</a-tag>
        </template>
        <a-form-item label="同义词 / 别名（AG-01）">
          <a-select v-model="formData.agentMeta.synonyms" mode="tags" placeholder="输入后回车，如：首逾率、FPD30" :token-separators="[',', '，', '、']" />
          <template #extra>唯一需结构化的 Agent 字段：让 Agent 听懂口语问法，是检索与相似问匹配的程序化依据</template>
        </a-form-item>
      </a-card>

      <!-- Agent 说明文档（Markdown 长文本，承载 AG-02~08 语义内容） -->
      <a-card title="Agent 说明文档（Markdown · 选填）" class="form-card">
        <div class="md-hint">以 Markdown 统一维护 AG-02~08 语义内容：口径约束、枚举值映射、可切维度组、适用/禁用对象与场景，以及问答示例、回答策略等；详情页以统一样式渲染，Agent 直接阅读整篇文档。</div>
        <MarkdownEditor v-model="formData.agentDoc" placeholder="## 基本语义&#10;- 语义类型与口径：…&#10;&#10;### 必需过滤&#10;- …&#10;&#10;### 枚举值映射&#10;- …&#10;&#10;### 适用与禁用&#10;- …" />
      </a-card>

        </a-tab-pane>
      </a-tabs>

      <!-- 操作按钮 -->
      <div class="form-actions">
        <a-space>
          <a-button @click="goBack">取消</a-button>
          <a-button type="primary" @click="handleSave">保存</a-button>
        </a-space>
      </div>
    </a-form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, h } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { MetricsCenterStore } from '@/mock-dca/metrics-center/store'
import MarkdownEditor from '@/components-dca/common/MarkdownEditor.vue'
import {
  TYPE_OPTIONS, DOMAIN_OPTIONS, SCENARIO_OPTIONS, FREQUENCY_OPTIONS,
  SOURCE_TYPE_OPTIONS, GRANULARITY_OPTIONS,
} from '@/mock-dca/metrics-center/data'
import type {
  MetricItem, SimilarityResult, MetricReportMount,
  MetricSourceType, MetricGranularity,
} from '@/mock-dca/metrics-center/types'

const route = useRoute()
const router = useRouter()
const formRef = ref()
const activeTab = ref('human')
const isEdit = ref(false)
const editId = ref('')

const typeOptions = TYPE_OPTIONS
const domainOptions = DOMAIN_OPTIONS
const frequencyOptions = FREQUENCY_OPTIONS
const sourceTypeOptions = SOURCE_TYPE_OPTIONS
const granularityOptions = GRANULARITY_OPTIONS
const visibilityOptions: { label: string; value: MetricReportMount['visibility'] }[] = [
  { label: '全部可见', value: 'all' },
  { label: '角色/域内可见', value: 'domain' },
  { label: '指定白名单可见', value: 'specific' },
]
const persons = MetricsCenterStore.getPersons()
/** 仅启用中的报表可被挂载（R24） */
const reportOptions = MetricsCenterStore.getReports({ status: 'active' })

const formData = reactive({
  name: '',
  code: '',
  type: '' as '' | 'business' | 'regulatory',
  domain: '',
  scenario: '',
  businessOwner: '',
  technicalOwner: '',
  businessDefinition: '',
  useCase: '',
  calculationFrequency: '' as '' | any,
  technicalDefinition: '',
  technicalUsageNotes: '',
  sourceType: '' as '' | MetricSourceType,
  granularity: '' as '' | MetricGranularity,
  agentDoc: '',
  agentMeta: {
    synonyms: [] as string[],
  },
  reportMounts: [] as MetricReportMount[],
  resultTable: '',
  queryCode: '',
})

const fieldStatus = reactive<Record<string, string>>({})

const currentScenarios = computed(() => {
  if (formData.domain) return SCENARIO_OPTIONS[formData.domain] || []
  return []
})

const similarityLoading = ref(false)
const similarityResults = ref<SimilarityResult[]>([])
const similarityChecked = ref(false)

function onDomainChange() {
  formData.scenario = ''
}

function addMount() {
  if (formData.reportMounts.length >= 10) {
    Message.warning('最多添加10个报表挂载')
    return
  }
  formData.reportMounts.push({ reportId: '', role: '', params: '', scenarioRoutingPrompt: '', visibility: 'all' })
}

function removeMount(idx: number) {
  formData.reportMounts.splice(idx, 1)
}

/** 同一报表禁止重复挂载 */
function onMountChange(mount: MetricReportMount) {
  const dup = formData.reportMounts.filter(m => m.reportId && m.reportId === mount.reportId).length > 1
  if (dup) {
    Message.warning('该报表已挂载，请勿重复选择')
    mount.reportId = ''
  }
}

function mountedEntry(reportId: string): string {
  const r = reportOptions.find(item => item.id === reportId)
  return r ? r.accessEntry : ''
}

function filterReportOption(inputValue: string, option: any) {
  return (option.label || '').toLowerCase().includes(inputValue.toLowerCase())
}

function handleSimilarity() {
  similarityLoading.value = true
  setTimeout(() => {
    similarityResults.value = MetricsCenterStore.checkSimilarity({
      name: formData.name,
      code: formData.code,
      businessDefinition: formData.businessDefinition,
    })
    similarityChecked.value = true
    similarityLoading.value = false
  }, 500)
}

function validateForm(): boolean {
  const required: (keyof typeof formData)[] = ['name', 'code', 'type', 'domain', 'scenario', 'businessOwner', 'technicalOwner', 'calculationFrequency', 'sourceType', 'granularity']
  let valid = true
  for (const field of required) {
    if (!formData[field]) {
      fieldStatus[field] = 'error'
      valid = false
    } else {
      fieldStatus[field] = ''
    }
  }
  if (!formData.businessDefinition) {
    fieldStatus.businessDefinition = 'error'
    valid = false
  }
  if (!formData.technicalDefinition) {
    fieldStatus.technicalDefinition = 'error'
    valid = false
  }
  // 长度校验
  if (formData.name && (formData.name.length < 2 || formData.name.length > 50)) {
    fieldStatus.name = 'error'
    Message.error('指标名称2-50字符')
    valid = false
  }
  if (formData.code && !/^[A-Za-z0-9]{2,20}$/.test(formData.code)) {
    fieldStatus.code = 'error'
    Message.error('指标编码英文数字组合，2-20字符')
    valid = false
  }
  return valid
}

/** 组装 store 入参：空串枚举转 undefined；reportLocations 由 store 按挂载派生 */
function metricPayload(): Partial<MetricItem> {
  const { type, calculationFrequency, sourceType, granularity, reportMounts, agentMeta, ...rest } = { ...formData }
  return {
    ...rest,
    type: type || undefined,
    calculationFrequency: calculationFrequency || undefined,
    sourceType: sourceType || undefined,
    granularity: granularity || undefined,
    agentMeta: { synonyms: agentMeta.synonyms },
    reportMounts: reportMounts.filter(m => m.reportId),
  } as Partial<MetricItem>
}

function handleSave() {
  if (!validateForm()) {
    activeTab.value = 'human'
    Message.error('请填写"人读属性"页签中的必填字段')
    return
  }

  try {
    if (isEdit.value) {
      MetricsCenterStore.update(editId.value, metricPayload())
      Message.success('指标已更新')
    } else {
      MetricsCenterStore.create(metricPayload())
      Message.success('指标已创建')
    }
    router.push({ name: 'metrics-center' })
  } catch (e: any) {
    Message.error(e.message || '操作失败')
  }
}

function goBack() {
  router.push({ name: 'metrics-center' })
}

function goDetail(id: string) {
  router.push({ name: 'metrics-center-detail', params: { id } })
}

function loadEditData() {
  const id = route.query.id as string
  if (id) {
    isEdit.value = true
    editId.value = id
    const m = MetricsCenterStore.getById(id)
    if (m) {
      formData.name = m.name
      formData.code = m.code
      formData.type = m.type
      formData.domain = m.domain
      formData.scenario = m.scenario
      formData.businessOwner = m.businessOwner
      formData.technicalOwner = m.technicalOwner
      formData.businessDefinition = m.businessDefinition
      formData.useCase = m.useCase
      formData.calculationFrequency = m.calculationFrequency
      formData.technicalDefinition = m.technicalDefinition
      formData.technicalUsageNotes = m.technicalUsageNotes
      formData.sourceType = m.sourceType ?? ''
      formData.granularity = m.granularity ?? ''
      formData.agentMeta = { synonyms: m.agentMeta?.synonyms ? [...m.agentMeta.synonyms] : [] }
      formData.agentDoc = m.agentDoc || ''
      formData.reportMounts = JSON.parse(JSON.stringify(m.reportMounts ?? []))
      formData.resultTable = m.resultTable
      formData.queryCode = m.queryCode
    }
  }
}

onMounted(() => {
  loadEditData()
})

// 富文本编辑器组件（简化版，使用 contenteditable）
const RichTextEditor = {
  props: ['modelValue'],
  emits: ['update:modelValue'],
  setup(props: any, { emit }: any) {
    const onInput = (e: any) => emit('update:modelValue', e.target.innerHTML)
    return () => h('div', {
      class: 'rich-text-editor',
      contenteditable: true,
      style: { width: '100%', minHeight: '80px', padding: '8px 12px', border: '1px solid #e5e6eb', borderRadius: '4px', outline: 'none', boxSizing: 'border-box' },
      innerHTML: props.modelValue || '',
      onInput,
    })
  },
}
</script>

<style lang="scss" scoped>
.metric-create-page {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;

  .reader-tabs {
    :deep(.arco-tabs-content) {
      padding-top: 16px;
    }
  }

  .agent-hint {
    margin-bottom: 16px;
  }

  .md-hint {
    margin-bottom: 8px;
    font-size: 12px;
    color: #86909c;
  }

  .form-card {
    margin-bottom: 16px;
  }

  .form-actions {
    display: flex;
    justify-content: center;
    padding: 24px 0;
  }

  .card-subtitle {
    margin-left: 8px;
    color: #86909c;
    font-size: 12px;
    font-weight: normal;
  }

  .dynamic-row {
    display: flex;
    align-items: center;
    margin-bottom: 8px;
  }

  .mount-item {
    padding: 12px;
    margin-bottom: 12px;
    border: 1px solid #e5e6eb;
    border-radius: 4px;
    background: #f7f8fa;
  }

  .mount-row {
    display: flex;
    align-items: center;
  }

  .mount-entry {
    margin-top: 6px;
    color: #86909c;
    font-size: 12px;
  }

  .sql-editor {
    width: 100%;
    font-family: 'Fira Code', 'Monaco', 'Menlo', monospace;
    font-size: 13px;
    padding: 8px 12px;
    border: 1px solid #e5e6eb;
    border-radius: 4px;
    outline: none;
    resize: vertical;
    background: #1e1e1e;
    color: #d4d4d4;
    line-height: 1.6;

    &:focus {
      border-color: #165dff;
    }
  }

  .sql-editor-wrap {
    width: 100%;
  }

  .similarity-results {
    margin-top: 12px;
  }
}

:deep(.rich-text-editor) {
  &:empty::before {
    content: '请输入...';
    color: #c9cdd4;
  }
  &:focus {
    border-color: #165dff !important;
  }
}
</style>
