<template>
  <div ref="editorContainer" class="sql-editor-container" :style="containerStyle"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'

interface Props {
  modelValue: string
  height?: string
  readonly?: boolean
  placeholder?: string
}

const props = withDefaults(defineProps<Props>(), {
  height: '240px',
  readonly: false,
  placeholder: ''
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'change', value: string): void
}>()

const editorContainer = ref<HTMLElement>()
let editor: any = null
const containerStyle = ref<Record<string, string>>({ height: props.height, width: '100%' })
let runtimeMonaco: any = null

const MONACO_CDN = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs'

/**
 * 从 CDN 加载 Monaco Editor（避免 @monaco-editor/loader 的 AMD define 全局污染）
 * 原理：手动注入 loader.js → 用 AMD require 加载 editor.main → 完成后禁用 define.amd
 */
const loadMonaco = (): Promise<any> => {
  // 已加载则直接返回
  if ((window as any).monaco) return Promise.resolve((window as any).monaco)

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `${MONACO_CDN}/loader.js`
    script.onload = () => {
      const amdRequire = (window as any).require
      if (!amdRequire) {
        reject(new Error('Monaco AMD loader 未就绪'))
        return
      }
      amdRequire.config({ paths: { vs: MONACO_CDN } })
      amdRequire(['vs/editor/editor.main'], () => {
        const monaco = (window as any).monaco
        // Monaco 加载完成后，禁用 define.amd 标志
        // UMD 模块检测 AMD 的条件是 typeof define === 'function' && define.amd
        // 将 define.amd 置为 undefined 可阻止 Vite 预打包的 ESM 模块误走 AMD 分支
        if (typeof (window as any).define === 'function') {
          try {
            ;(window as any).define.amd = undefined
          } catch {
            // define.amd 不可写时，尝试用 defineProperty 覆盖
            try {
              Object.defineProperty((window as any).define, 'amd', { value: undefined, writable: true })
            } catch {
              console.warn('[SqlEditor] 无法禁用 AMD define.amd')
            }
          }
        }
        resolve(monaco)
      })
    }
    script.onerror = () => reject(new Error('Monaco CDN 加载失败'))
    document.head.appendChild(script)
  })
}

const initEditor = async () => {
  if (!editorContainer.value) return

  try {
    const monacoInstance = await loadMonaco()
    runtimeMonaco = monacoInstance

    const defaultOptions = {
      value: props.modelValue,
      language: 'sql',
      theme: 'vs',
      readOnly: props.readonly,
      automaticLayout: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      fontSize: 13,
      lineHeight: 20,
      lineNumbers: 'on' as const,
      roundedSelection: false,
      scrollbar: {
        vertical: 'auto' as const,
        horizontal: 'hidden' as const,
        verticalScrollbarSize: 6
      },
      wordWrap: 'on' as const,
      wrappingStrategy: 'advanced',
      scrollBeyondLastColumn: 0,
      padding: { top: 8, bottom: 8 },
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
      bracketPairColorization: { enabled: true }
    }

    editor = runtimeMonaco.editor.create(editorContainer.value, defaultOptions)

    editor.onDidChangeModelContent(() => {
      const value = editor?.getValue() || ''
      emit('update:modelValue', value)
      emit('change', value)
    })
  } catch (error) {
    // CDN 加载失败时降级为 textarea
    console.warn('[SqlEditor] Monaco 加载失败，降级为 textarea', error)
    if (editorContainer.value) {
      const ta = document.createElement('textarea')
      ta.value = props.modelValue
      ta.placeholder = props.placeholder || '请输入 SQL 代码'
      ta.style.cssText = 'width:100%;height:100%;border:none;outline:none;padding:12px;font-family:monospace;font-size:13px;line-height:1.5;resize:none;box-sizing:border-box;'
      ta.addEventListener('input', () => {
        emit('update:modelValue', ta.value)
        emit('change', ta.value)
      })
      editorContainer.value.appendChild(ta)
    }
  }
}

watch(() => props.modelValue, (newValue: string) => {
  if (editor && editor.getValue() !== newValue) {
    editor.setValue(newValue)
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

defineExpose({
  focus: () => editor?.focus(),
  setValue: (value: string) => editor?.setValue(value),
  getValue: () => editor?.getValue() || ''
})
</script>

<style scoped>
.sql-editor-container {
  width: 100%;
  border: 1px solid var(--color-border-2);
  border-radius: 4px;
  overflow: hidden;
  position: relative;
  box-sizing: border-box;
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
