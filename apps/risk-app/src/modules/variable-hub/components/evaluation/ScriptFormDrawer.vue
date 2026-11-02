<!--
  Python 脚本新建 / 编辑抽屉
  - 编辑已有脚本时，若代码内容发生变化，保存会自动生成新版本（版本号递增）
  - 仅修改元信息不会产生新版本
  - 输入输出契约也在这里声明：任务保存时的「脚本能不能产出契约要的字段」就读这里的 provides
-->
<template>
  <a-drawer
    :visible="visible"
    :width="880"
    :ok-loading="submitting"
    :title="isEdit ? '编辑脚本' : '新建脚本'"
    ok-text="保存"
    cancel-text="取消"
    unmount-on-close
    @ok="handleSubmit"
    @cancel="handleClose"
  >
    <a-form ref="formRef" :model="form" :style="{ width: '100%' }" layout="vertical" @submit-success="handleSubmit">
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item field="name" label="脚本名称" :rules="[{ required: true, message: '请输入脚本名称' }]">
            <a-input v-model="form.name" placeholder="如：数据质量分析器" allow-clear />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item field="type" label="脚本类型" :rules="[{ required: true, message: '请选择脚本类型' }]">
            <a-select v-model="form.type" :options="typeOptions" placeholder="请选择" />
          </a-form-item>
        </a-col>
      </a-row>

      <a-form-item field="path" label="脚本路径" :rules="[{ required: true, message: '请输入脚本路径' }]">
        <a-input v-model="form.path" placeholder="python-reports/processors/xxx.py" allow-clear>
          <template #prefix><icon-file /></template>
        </a-input>
      </a-form-item>

      <a-form-item field="description" label="脚本说明">
        <a-textarea v-model="form.description" :max-length="200" show-word-limit :auto-size="{ minRows: 2, maxRows: 4 }" placeholder="描述脚本的算法与适用场景" />
      </a-form-item>

      <a-divider orientation="left" class="contract-divider">输入输出契约</a-divider>
      <a-alert type="info" class="contract-alert">
        字段名取自全局契约字典（io-contract），与评估任务、效果任务的输入输出用同一套 key，
        所以声明完就能直接被两域引用。不声明也能保存，但引用它的任务会提示「未声明契约字段」。
      </a-alert>
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item field="requires" label="需要的输入字段">
            <template #extra><span class="field-hint">脚本跑起来必须读到的字段</span></template>
            <a-select
              v-model="form.requires"
              :options="inputFieldOptions"
              multiple
              allow-clear
              :max-tag-count="3"
              placeholder="如：变量标识 / 样本数据"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item field="provides" label="能产出的字段">
            <template #extra><span class="field-hint">任务契约的必产字段靠它覆盖，回写特征档案也读这里</span></template>
            <a-select
              v-model="form.provides"
              :options="outputFieldOptions"
              multiple
              allow-clear
              :max-tag-count="3"
              placeholder="如：质量得分 / IV / 图表产出"
            />
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item field="dependencies" label="依赖包">
            <a-input-tag v-model="form.dependencies" placeholder="回车添加，如 pandas" allow-clear unique-value />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item field="tags" label="标签">
            <a-input-tag v-model="form.tags" placeholder="回车添加，如 数据质量" allow-clear unique-value />
          </a-form-item>
        </a-col>
      </a-row>

      <a-form-item field="content" label="脚本内容" :rules="[{ required: true, message: '请输入脚本内容' }]">
        <template #extra>
          <div class="content-extra">
            <span>Python 代码；保存后新版本作为当前生效版本。</span>
            <a-button type="text" size="mini" @click="fillTemplate">填充模板</a-button>
          </div>
        </template>
        <textarea
          v-model="form.content"
          class="code-input"
          spellcheck="false"
          placeholder="# 在此编写 Python 脚本"
        ></textarea>
      </a-form-item>

      <a-form-item field="changeLog" label="版本变更说明">
        <a-input
          v-model="form.changeLog"
          :placeholder="isEdit ? '本次修改做了什么（内容变化会生成新版本）' : '初始版本说明'"
          allow-clear
        />
      </a-form-item>

      <a-alert v-if="isEdit" type="info">
        当前脚本为 <strong>v{{ original?.currentVersion }}</strong>；若代码有改动，保存后将生成
        <strong>v{{ (original?.currentVersion || 0) + 1 }}</strong> 并作为生效版本，历史版本可在版本记录中查看与回滚。
      </a-alert>
    </a-form>
  </a-drawer>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { Message } from '@arco-design/web-vue'
import {
  EvaluationTaskStore,
  type PythonScriptConfig
} from '@/modules/variable-hub/mock/evaluation/evaluation-task-store'
import { contractFieldOptions } from '@/modules/variable-hub/mock/task-center/io-contract'

const props = defineProps<{ script?: PythonScriptConfig }>()
const emit = defineEmits<{ (e: 'success', script: PythonScriptConfig): void }>()

const visible = ref(false)
const submitting = ref(false)
const formRef = ref()

const typeOptions = [
  { label: '数据处理（processor）', value: 'processor' },
  { label: '图表生成（visualizer）', value: 'visualizer' },
  { label: '综合（combined）', value: 'combined' }
]

/** 契约字段候选：只改字典不改本文件 */
const inputFieldOptions = contractFieldOptions('input')
const outputFieldOptions = contractFieldOptions('output')

const form = reactive({
  name: '',
  path: '',
  type: 'processor' as PythonScriptConfig['type'],
  description: '',
  dependencies: [] as string[],
  tags: [] as string[],
  requires: [] as string[],
  provides: [] as string[],
  content: '',
  changeLog: ''
})

const isEdit = computed(() => !!props.script?.id)
const original = computed(() => props.script)

function open() {
  if (props.script) {
    Object.assign(form, {
      name: props.script.name,
      path: props.script.path,
      type: props.script.type,
      description: props.script.description || '',
      dependencies: [...(props.script.dependencies || [])],
      tags: [...(props.script.tags || [])],
      requires: [...(props.script.requires || [])],
      provides: [...(props.script.provides || [])],
      content: props.script.content,
      changeLog: ''
    })
  } else {
    Object.assign(form, {
      name: '',
      path: 'python-reports/processors/',
      type: 'processor',
      description: '',
      dependencies: ['pandas', 'numpy'],
      tags: [],
      requires: ['variableId', 'variableName', 'sampleRows'],
      provides: [],
      content: '',
      changeLog: '初始版本'
    })
  }
  visible.value = true
}

function handleClose() {
  visible.value = false
}

const fillTemplate = () => {
  form.content = `"""
${form.name || '评估脚本'}
"""\n\nimport pandas as pd\nimport numpy as np\nfrom typing import Dict, Any\n\n\nclass EvaluationScript:\n    """评估脚本入口"""\n\n    def run(self, df: pd.DataFrame) -> Dict[str, Any]:\n        """执行分析并返回指标结果"""\n        return {\n            'rows': int(len(df)),\n            'columns': list(df.columns),\n        }`
}

const handleSubmit = async () => {
  const errors = await formRef.value?.validate()
  if (errors) {
    return
  }
  submitting.value = true
  try {
    const saved = EvaluationTaskStore.savePythonScript({
      id: props.script?.id,
      name: form.name.trim(),
      path: form.path.trim(),
      content: form.content,
      type: form.type,
      dependencies: form.dependencies,
      description: form.description,
      tags: form.tags,
      requires: form.requires,
      provides: form.provides,
      changeLog: form.changeLog
    })
    Message.success(
      props.script && saved.currentVersion > props.script.currentVersion
        ? `已保存，生成新版本 v${saved.currentVersion}`
        : '已保存'
    )
    visible.value = false
    emit('success', saved)
  } catch (err: any) {
    Message.error(`保存失败：${err?.message || err}`)
  } finally {
    submitting.value = false
  }
}

/** 预填表单（用于“复制为新脚本”等场景，仅在 open 后调用） */
function prefill(payload: Partial<typeof form>) {
  Object.assign(form, payload)
}

defineExpose({ open, close: handleClose, prefill })
</script>

<style scoped lang="less">
.content-extra {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--color-text-3);
  font-size: 12px;
}

.contract-divider {
  margin: 8px 0 12px;
  font-size: 13px;
}

.contract-alert {
  margin-bottom: 12px;
}

.field-hint {
  font-size: 12px;
  color: var(--color-text-3);
}

.code-input {
  width: 100%;
  min-height: 320px;
  padding: 12px 14px;
  border: 1px solid var(--color-border-2);
  border-radius: 6px;
  background: #1e1e1e;
  color: #d4d4d4;
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.6;
  resize: vertical;
  outline: none;
  tab-size: 4;

  &:focus {
    border-color: rgb(var(--primary-6));
  }
}
</style>
