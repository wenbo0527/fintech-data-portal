<template>
  <div class="md-editor">
    <div class="md-editor__toolbar">
      <a-space size="mini">
        <a-tooltip content="加粗"><a-button size="mini" type="text" @click="wrap('**', '**')"><strong>B</strong></a-button></a-tooltip>
        <a-tooltip content="斜体"><a-button size="mini" type="text" @click="wrap('*', '*')"><em>I</em></a-button></a-tooltip>
        <a-tooltip content="行内代码"><a-button size="mini" type="text" @click="wrap('`', '`')"><code>&lt;/&gt;</code></a-button></a-tooltip>
        <a-tooltip content="标题"><a-button size="mini" type="text" @click="prefixLine('## ')">H</a-button></a-tooltip>
        <a-tooltip content="无序列表"><a-button size="mini" type="text" @click="prefixLine('- ')">•</a-button></a-tooltip>
        <a-tooltip content="表格片段"><a-button size="mini" type="text" @click="insertTable">▦</a-button></a-tooltip>
      </a-space>
      <a-radio-group v-model="mode" type="button" size="mini">
        <a-radio value="edit">编辑</a-radio>
        <a-radio value="split">分栏</a-radio>
        <a-radio value="preview">预览</a-radio>
      </a-radio-group>
    </div>
    <div class="md-editor__body" :class="`is-${mode}`">
      <textarea
        v-if="mode !== 'preview'"
        ref="taRef"
        class="md-editor__textarea"
        :value="modelValue"
        :placeholder="placeholder"
        spellcheck="false"
        @input="onInput"
      />
      <div v-if="mode !== 'edit'" class="md-editor__preview">
        <MarkdownView :content="modelValue" empty-text="（暂无内容，切换到编辑填写 Markdown）" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import MarkdownView from './MarkdownView.vue'

/**
 * Markdown 公共编辑组件：textarea + 快捷工具栏 + 编辑/分栏/预览三种模式，支持长文本
 */
defineProps<{
  modelValue: string
  placeholder?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: string): void
}>()

const mode = ref<'edit' | 'split' | 'preview'>('edit')
const taRef = ref<HTMLTextAreaElement>()

function onInput(e: Event) {
  emit('update:modelValue', (e.target as HTMLTextAreaElement).value)
}

/** 选中包裹（如 **bold**） */
function wrap(left: string, right: string) {
  const ta = taRef.value
  if (!ta) return
  const { selectionStart: s, selectionEnd: e, value } = ta
  const sel = value.slice(s, e) || '文本'
  const next = value.slice(0, s) + left + sel + right + value.slice(e)
  emit('update:modelValue', next)
  requestAnimationFrame(() => {
    ta.focus()
    ta.setSelectionRange(s + left.length, s + left.length + sel.length)
  })
}

/** 行首加前缀（标题/列表） */
function prefixLine(p: string) {
  const ta = taRef.value
  if (!ta) return
  const { selectionStart: s, value } = ta
  const lineStart = value.lastIndexOf('\n', s - 1) + 1
  const next = value.slice(0, lineStart) + p + value.slice(lineStart)
  emit('update:modelValue', next)
  requestAnimationFrame(() => {
    ta.focus()
    ta.setSelectionRange(s + p.length, s + p.length)
  })
}

function insertTable() {
  const snippet = '\n| 字段 | 说明 |\n| --- | --- |\n|  |  |\n'
  const ta = taRef.value
  const value = ta ? ta.value : ''
  emit('update:modelValue', value + snippet)
}
</script>

<style scoped lang="less">
.md-editor {
  border: 1px solid #e5e6eb;
  border-radius: 4px;
  background: #fff;

  &__toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4px 8px;
    border-bottom: 1px solid #e5e6eb;
    background: #f7f8fa;
  }

  &__body {
    display: flex;

    &.is-split {
      .md-editor__textarea, .md-editor__preview { width: 50%; }
      .md-editor__preview { border-left: 1px solid #e5e6eb; }
    }
    &:not(.is-split) .md-editor__textarea,
    &:not(.is-split) .md-editor__preview { width: 100%; }
  }

  &__textarea {
    display: block;
    min-height: 220px;
    max-height: 480px;
    padding: 10px 12px;
    border: none;
    outline: none;
    resize: vertical;
    font-family: Menlo, Consolas, monospace;
    font-size: 13px;
    line-height: 1.6;
    color: #1d2129;
    box-sizing: border-box;
  }

  &__preview {
    padding: 10px 14px;
    min-height: 220px;
    max-height: 480px;
    overflow-y: auto;
    box-sizing: border-box;
  }
}
</style>
