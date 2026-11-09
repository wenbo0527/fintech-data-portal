<template>
  <div ref="editorContainer" class="monaco-editor-container" :style="containerStyle"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import type * as monacoTypes from 'monaco-editor'
import loader from '@monaco-editor/loader'

interface Props {
  modelValue: string
  language?: string
  theme?: string
  height?: string
  readonly?: boolean
  options?: monacoTypes.editor.IStandaloneEditorConstructionOptions
  autoHeight?: boolean
  minHeight?: number
  maxHeight?: number | undefined
}

interface Emits {
  (e: 'update:modelValue', value: string): void
  (e: 'change', value: string): void
}

const props = withDefaults(defineProps<Props>(), {
  language: 'javascript',
  theme: 'vs-dark',
  height: '300px',
  readonly: false,
  options: () => ({}),
  autoHeight: true,
  minHeight: 120,
})

const emit = defineEmits<Emits>()

const editorContainer = ref<HTMLElement>()
let editor: monacoTypes.editor.IStandaloneCodeEditor | null = null
const containerStyle = ref<Record<string, string>>({ height: props.height, width: '100%' })
let runtimeMonaco: typeof monacoTypes | null = null

// 配置Monaco编辑器
loader.config({
  paths: {
    vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs'
  }
})

// 初始化编辑器
const initEditor = async () => {
  if (!editorContainer.value) {return}

  try {
    const monacoInstance = await loader.init()
    runtimeMonaco = monacoInstance
    
    // 注册Python语言支持
    if (props.language === 'python') {
      runtimeMonaco.languages.register({ id: 'python' })
      runtimeMonaco.languages.setMonarchTokensProvider('python', {
        tokenizer: {
          root: [
            [/[a-zA-Z_]\w*/, {
              cases: {
                '@keywords': 'keyword',
                '@builtins': 'type.identifier',
                '@default': 'identifier'
              }
            }],
            [/".*?"/, 'string'],
            [/'.*?'/, 'string'],
            [/#.*$/, 'comment'],
            [/\d+/, 'number']
          ]
        },
        keywords: [
          'and', 'as', 'assert', 'break', 'class', 'continue', 'def', 'del', 'elif', 'else',
          'except', 'exec', 'finally', 'for', 'from', 'global', 'if', 'import', 'in',
          'is', 'lambda', 'not', 'or', 'pass', 'print', 'raise', 'return', 'try', 'while',
          'with', 'yield', 'True', 'False', 'None'
        ],
        builtins: [
          'abs', 'all', 'any', 'bin', 'bool', 'chr', 'dict', 'dir', 'enumerate',
          'filter', 'float', 'int', 'len', 'list', 'map', 'max', 'min', 'range',
          'set', 'str', 'sum', 'tuple', 'type', 'zip'
        ]
      })
    }

    const defaultOptions: monacoTypes.editor.IStandaloneEditorConstructionOptions = {
      value: props.modelValue,
      language: props.language,
      theme: props.theme,
      readOnly: props.readonly,
      automaticLayout: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      fontSize: 14,
      lineNumbers: 'on',
      roundedSelection: false,
      scrollbar: {
        vertical: 'auto',
        horizontal: 'hidden'
      },
      wordWrap: 'on',
      wordWrapColumn: 0,
      wrappingStrategy: 'advanced',
      scrollBeyondLastColumn: 0,
      ...props.options
    }

    editor = runtimeMonaco.editor.create(editorContainer.value, defaultOptions)

    // 监听内容变化
    editor.onDidChangeModelContent(() => {
      const value = editor?.getValue() || ''
      emit('update:modelValue', value)
      emit('change', value)
    })

    if (props.autoHeight && editor) {
      const updateHeight = () => {
        if (!editor) {return}
        const h = (editor as any).getContentHeight ? (editor as any).getContentHeight() : 0
        const min = Math.max(0, props.minHeight || 0)
        const hasMax = typeof props.maxHeight === 'number' && isFinite(props.maxHeight as number)
        const final = hasMax
          ? Math.min(Math.max(min, props.maxHeight as number), Math.max(min, h || min))
          : Math.max(min, h || min)
        containerStyle.value.height = `${final}px`
        editor.layout()
      }
      editor.onDidContentSizeChange(() => updateHeight())
      updateHeight()
    }

  } catch (error) {

  }
}

// 监听props变化
watch(() => props.modelValue, (newValue: string) => {
  if (editor && editor.getValue() !== newValue) {
    editor.setValue(newValue)
    if (props.autoHeight) {
      const h = (editor as any)?.getContentHeight?.() || 0
      const min = Math.max(0, props.minHeight || 0)
      const hasMax = typeof props.maxHeight === 'number' && isFinite(props.maxHeight as number)
      const final = hasMax
        ? Math.min(Math.max(min, props.maxHeight as number), Math.max(min, h || min))
        : Math.max(min, h || min)
      containerStyle.value.height = `${final}px`
      editor.layout()
    }
  }
})

watch(() => props.language, (newLanguage: string) => {
  if (editor) {
    const model = editor.getModel()
    if (model) {
      runtimeMonaco?.editor.setModelLanguage(model, newLanguage as string)
    }
  }
})

watch(() => props.theme, (newTheme: string) => {
  if (editor) {
    runtimeMonaco?.editor.setTheme(newTheme as string)
  }
})

watch(() => props.readonly, (readonly: boolean) => {
  if (editor) {
    editor.updateOptions({ readOnly: readonly })
  }
})

onMounted(async () => {
  await nextTick()
  await initEditor()
  if (editorContainer.value && editor) {
    const ro = new ResizeObserver(() => editor?.layout())
    ro.observe(editorContainer.value)
  }
})

onUnmounted(() => {
  if (editor) {
    editor.dispose()
    editor = null
  }
})

// 暴露编辑器实例方法
defineExpose({
  getEditor: () => editor,
  focus: () => editor?.focus(),
  setValue: (value: string) => editor?.setValue(value),
  getValue: () => editor?.getValue() || '',
  insertText: (text: string) => {
    if (editor) {
      const selection = editor.getSelection()
      if (selection) {
        editor.executeEdits('', [{
          range: selection,
          text: text
        }])
      }
    }
  }
})
</script>

<style scoped>
.monaco-editor-container {
  width: 100%;
  border: 1px solid var(--color-border-2);
  border-radius: 4px;
  overflow-x: hidden;
  overflow-y: auto;
  /* 确保编辑器内部滚动不与页面滚动冲突 */
  position: relative;
  box-sizing: border-box;
  max-width: 100%;
  contain: strict;
}

:deep(.monaco-editor),
:deep(.monaco-editor .overflow-guard),
:deep(.monaco-scrollable-element),
:deep(.monaco-editor .lines-content),
:deep(.monaco-editor .view-lines) {
  width: 100% !important;
  max-width: 100% !important;
}
</style>
