<!--
  Python 脚本编辑器组件
  支持查看和编辑 Python 脚本内容
-->
<template>
  <div class="python-script-editor">
    <div class="editor-header">
      <div class="header-left">
        <icon-code class="header-icon" />
        <span class="header-title">{{ script?.name || 'Python 脚本' }}</span>
        <a-tag v-if="script?.type" :color="typeColor" size="small">{{ typeLabel }}</a-tag>
      </div>
      <div class="header-right">
        <a-space>
          <a-button v-if="!readonly" type="primary" size="small" @click="handleSave" :loading="saving">
            <template #icon><icon-save /></template>
            保存
          </a-button>
          <a-button size="small" @click="handleCopy">
            <template #icon><icon-copy /></template>
            复制
          </a-button>
          <a-button v-if="!readonly && !isEditing" size="small" @click="startEdit">
            <template #icon><icon-edit /></template>
            编辑
          </a-button>
          <a-button v-if="isEditing" size="small" @click="cancelEdit">取消</a-button>
        </a-space>
      </div>
    </div>

    <div class="editor-meta" v-if="script">
      <a-space wrap>
        <a-tag size="small" color="gray">
          <icon-file /> {{ script.path }}
        </a-tag>
        <a-tag v-if="script.dependencies?.length" size="small" color="arcoblue">
          <icon-layers /> 依赖：{{ script.dependencies.join(', ') }}
        </a-tag>
        <span class="meta-text">
          <icon-clock-circle /> 更新于 {{ script.updatedAt }} by {{ script.updatedBy }}
        </span>
      </a-space>
    </div>

    <div class="editor-content" :class="{ 'is-editing': isEditing }">
      <div v-if="isEditing" class="code-editor-wrapper">
        <textarea
          ref="textareaRef"
          v-model="editContent"
          class="code-textarea"
          placeholder="请输入 Python 脚本代码..."
          spellcheck="false"
        ></textarea>
      </div>
      <div v-else class="code-preview">
        <pre class="code-block"><code>{{ displayContent }}</code></pre>
      </div>
    </div>

    <div v-if="script?.content && !isEditing" class="editor-footer">
      <a-alert type="info" :show-icon="false">
        脚本共 {{ script.content.split('\n').length }} 行，{{ script.content.length }} 字符
      </a-alert>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { Message } from '@arco-design/web-vue'
import type { PythonScriptConfig } from '@/modules/variable-hub/mock/evaluation/evaluation-task-store'

interface Props {
  script?: PythonScriptConfig
  readonly?: boolean
  saving?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false,
  saving: false
})

const emit = defineEmits<{
  (e: 'save', content: string): void
  (e: 'update:modelValue', content: string): void
}>()

const isEditing = ref(false)
const editContent = ref('')
const textareaRef = ref<HTMLTextAreaElement | null>(null)

const displayContent = computed(() => {
  if (isEditing.value) {
    return editContent.value
  }
  return props.script?.content || '# 暂无脚本内容\nprint("Hello, World!")'
})

const typeLabel = computed(() => {
  const map: Record<string, string> = {
    processor: '数据处理',
    visualizer: '图表生成',
    combined: '综合脚本'
  }
  return map[props.script?.type || ''] || '未知'
})

const typeColor = computed(() => {
  const map: Record<string, string> = {
    processor: 'arcoblue',
    visualizer: 'green',
    combined: 'purple'
  }
  return map[props.script?.type || ''] || 'gray'
})

function startEdit() {
  editContent.value = props.script?.content || ''
  isEditing.value = true
  nextTick(() => {
    textareaRef.value?.focus()
  })
}

function cancelEdit() {
  isEditing.value = false
  editContent.value = ''
}

function handleSave() {
  if (!editContent.value.trim()) {
    Message.warning('脚本内容不能为空')
    return
  }
  emit('save', editContent.value)
  isEditing.value = false
}

function handleCopy() {
  const content = displayContent.value
  navigator.clipboard.writeText(content).then(() => {
    Message.success('脚本内容已复制到剪贴板')
  }).catch(() => {
    Message.error('复制失败')
  })
}

// 监听 script 变化，重置编辑状态
watch(() => props.script?.id, () => {
  isEditing.value = false
  editContent.value = ''
})
</script>

<style scoped lang="less">
.python-script-editor {
  background: var(--color-bg-2);
  border-radius: 8px;
  border: 1px solid var(--color-border-2);
  overflow: hidden;
}

.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--color-fill-1);
  border-bottom: 1px solid var(--color-border-2);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-icon {
  color: var(--color-text-2);
  font-size: 16px;
}

.header-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-1);
}

.editor-meta {
  padding: 10px 16px;
  background: var(--color-fill-2);
  border-bottom: 1px solid var(--color-border-2);
}

.meta-text {
  color: var(--color-text-3);
  font-size: 12px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.editor-content {
  min-height: 400px;
  max-height: 600px;
  overflow: auto;

  &.is-editing {
    padding: 0;
  }
}

.code-editor-wrapper {
  height: 100%;
  min-height: 400px;
}

.code-textarea {
  width: 100%;
  height: 100%;
  min-height: 400px;
  padding: 16px;
  border: none;
  outline: none;
  resize: vertical;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.6;
  background: #1e1e1e;
  color: #d4d4d4;
  tab-size: 4;
}

.code-preview {
  padding: 0;
}

.code-block {
  margin: 0;
  padding: 16px;
  background: #282c34;
  color: #abb2bf;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.6;
  overflow-x: auto;
  white-space: pre;

  code {
    display: block;
  }
}

.editor-footer {
  padding: 12px 16px;
  border-top: 1px solid var(--color-border-2);
  background: var(--color-fill-1);
}
</style>
