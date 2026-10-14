<template>
  <a-modal
    :visible="visible"
    :title="editData ? '编辑指标' : '新增指标'"
    :width="640"
    :mask-closable="false"
    @cancel="handleClose"
    @ok="handleSubmit"
    :ok-loading="submitting"
  >
    <a-form ref="formRef" :model="formData" layout="vertical" auto-label-width>
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item field="name" label="指标名称" :rules="[{ required: true, message: '请输入指标名称' }]">
            <a-input v-model="formData.name" placeholder="如：首逾率" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item field="code" label="指标编码" :rules="[{ required: true, message: '请输入指标编码' }]">
            <a-input v-model="formData.code" placeholder="如：fpd30" />
          </a-form-item>
        </a-col>
      </a-row>
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item field="category" label="分类">
            <a-input v-model="formData.category" placeholder="如：风控指标" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item field="maintainedBy" label="维护团队">
            <a-input v-model="formData.maintainedBy" placeholder="如：风控数据团队" />
          </a-form-item>
        </a-col>
      </a-row>
      <a-form-item field="aliases" label="别名（Agent 问答可通过别名命中该指标）">
        <a-input-tag
          v-model="formData.aliases"
          placeholder="输入别名后回车，如：首逾、FPD、首期逾期率"
          allow-clear
          :token-separators="[',', '，']"
        />
      </a-form-item>
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item field="alertThreshold" label="预警阈值 (%)">
            <a-input-number v-model="formData.alertThreshold" :min="0" :max="100" :step="0.5" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item field="alertEnabled" label="是否启用预警">
            <a-switch v-model="formData.alertEnabled" />
          </a-form-item>
        </a-col>
      </a-row>

      <!-- 口径定义 -->
      <div class="definitions-section">
        <div class="section-header">
          <span class="section-label">口径定义</span>
          <a-button size="mini" type="dashed" @click="addDefinition">
            <template #icon><icon-plus /></template>
            添加口径
          </a-button>
        </div>
        <div
          v-for="(def, idx) in formData.definitions"
          :key="idx"
          class="definition-item"
        >
          <div class="def-item-header">
            <span class="def-item-title">口径 {{ idx + 1 }}</span>
            <a-button
              v-if="formData.definitions.length > 1"
              size="mini"
              type="text"
              status="danger"
              @click="removeDefinition(idx)"
            >
              <icon-delete />
            </a-button>
          </div>
          <a-row :gutter="12">
            <a-col :span="8">
              <a-form-item :field="`definitions[${idx}].caliberName`" label="口径名称">
                <a-input v-model="def.caliberName" placeholder="如：M1+口径" />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item :field="`definitions[${idx}].sourceSystem`" label="来源系统">
                <a-input v-model="def.sourceSystem" placeholder="如：风控系统" />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item :field="`definitions[${idx}].version`" label="版本">
                <a-input v-model="def.version" placeholder="如：v2.1" />
              </a-form-item>
            </a-col>
          </a-row>
          <a-form-item :field="`definitions[${idx}].formula`" label="计算公式">
            <a-textarea v-model="def.formula" placeholder="如：首次逾期发生在放款后30天内的贷款笔数 / 总放款笔数" :auto-size="{ minRows: 2 }" />
          </a-form-item>
        </div>
      </div>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Message } from '@arco-design/web-vue'
import type { MetricDetail, MetricDefinition, Metric } from '@/types/metric'
import { useMetricStore } from '@/stores/metric'

const props = defineProps<{
  visible: boolean
  editData: MetricDetail | null
}>()

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void
  (e: 'saved'): void
}>()

const metricStore = useMetricStore()
const formRef = ref()
const submitting = ref(false)

interface FormData {
  id?: string
  name: string
  code: string
  category: string
  maintainedBy: string
  aliases: string[]
  alertThreshold: number
  alertEnabled: boolean
  definitions: MetricDefinition[]
}

const formData = ref<FormData>({
  name: '',
  code: '',
  category: '',
  maintainedBy: '',
  aliases: [],
  alertThreshold: 5,
  alertEnabled: false,
  definitions: [createEmptyDefinition()]
})

function createEmptyDefinition(): MetricDefinition {
  return {
    id: `def_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    caliberName: '',
    formula: '',
    sourceSystem: '',
    version: 'v1.0'
  }
}

// 监听visible变化，初始化表单数据
watch(
  () => props.visible,
  (val) => {
    if (val) {
      if (props.editData) {
        formData.value = {
          id: props.editData.id,
          name: props.editData.name,
          code: props.editData.code,
          category: props.editData.category,
          maintainedBy: props.editData.maintainedBy,
          aliases: props.editData.aliases ? [...props.editData.aliases] : [],
          alertThreshold: props.editData.alertThreshold,
          alertEnabled: props.editData.alertEnabled,
          definitions: props.editData.definitions.length
            ? props.editData.definitions.map(d => ({ ...d }))
            : [createEmptyDefinition()]
        }
      } else {
        formData.value = {
          name: '',
          code: '',
          category: '',
          maintainedBy: '',
          aliases: [],
          alertThreshold: 5,
          alertEnabled: false,
          definitions: [createEmptyDefinition()]
        }
      }
    }
  }
)

function addDefinition() {
  formData.value.definitions.push(createEmptyDefinition())
}

function removeDefinition(idx: number) {
  formData.value.definitions.splice(idx, 1)
}

function handleClose() {
  emit('update:visible', false)
}

async function handleSubmit() {
  const validateErr = await formRef.value?.validate()
  if (validateErr) return

  submitting.value = true
  try {
    const saveData: Partial<Metric> = {
      ...formData.value,
      id: formData.value.id
    }
    const res = await metricStore.save(saveData)
    if (res.success) {
      Message.success(props.editData ? '指标更新成功' : '指标创建成功，当前为草稿态，提交审批并发布后可被 Agent 引用')
      emit('saved')
      emit('update:visible', false)
    } else {
      Message.error('保存失败')
    }
  } catch {
    Message.error('保存失败')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped lang="scss">
.definitions-section {
  margin-top: 8px;
  padding-top: 12px;
  border-top: 1px dashed var(--color-border);

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;

    .section-label {
      font-size: 15px;
      font-weight: 600;
      color: var(--color-text);
    }
  }
}

.definition-item {
  background: #f7f8fa;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;

  .def-item-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;

    .def-item-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--color-accent);
    }
  }
}

:deep(.arco-form-item) {
  margin-bottom: 16px;
}
</style>
