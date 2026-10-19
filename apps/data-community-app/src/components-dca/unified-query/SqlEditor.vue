<template>
  <div class="uq-sql-editor">
    <MonacoEditor
      ref="editorRef"
      v-model="inner"
      language="sql"
      theme="vs-dark"
      :height="height"
      :auto-height="false"
      :readonly="readonly"
      :options="editorOptions"
      @change="emit('change', $event)"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * SQL 编辑器(F03)
 *
 * 复用 monorepo 内既有的 Monaco 封装(pnpm shamefully-hoist,
 * @monaco-editor/loader 与 monaco-editor 已提升到根 node_modules)。
 * 在此基础上注册 SQL 补全:
 *   FROM / JOIN 后 → 表名;表名. 或 SELECT 后 → 该表字段(Mock 元数据)。
 */
import { computed, onMounted, ref, shallowRef, watch } from 'vue'
import loader from '@monaco-editor/loader'
import MonacoEditor from '@/components/MonacoEditor.vue'
import { collectTableNames, getTableColumns } from '@/mock/unified-query/database'
import { auditSqlSync } from '@/mock/unified-query/copilot'
import type { CopilotMetaContext } from '@/mock/unified-query/metadata-context'
import type { CopilotIssue } from '@/mock/unified-query/types'

const props = withDefaults(
  defineProps<{
    modelValue: string
    height?: string
    readonly?: boolean
    /** 当前数据源,用于在补全项里区分 Doris / Hive 表 */
    datasource?: 'doris' | 'hive'
    /** Copilot 元数据上下文,提供后字段补全将优先使用 context 中的字段元数据 */
    context?: CopilotMetaContext | null
  }>(),
  { height: '260px', readonly: false, datasource: 'doris', context: null }
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  change: [value: string]
  run: []
  /** F05 分段执行:选区变化时回传选中文本,父组件据此启用「运行选中段」 */
  selectionChange: [text: string]
  /** 合规审计结果(SqlEditor 输入变化时触发) */
  audit: [issues: CopilotIssue[]]
}>()

const editorRef = shallowRef<InstanceType<typeof MonacoEditor> | null>(null)
const inner = computed({
  get: () => props.modelValue,
  set: v => emit('update:modelValue', v)
})

const editorOptions = computed(() => ({
  tabSize: 2,
  minimap: { enabled: false },
  lineNumbers: 'on' as const,
  fontSize: 13,
  scrollBeyondLastLine: false,
  wordWrap: 'off' as const,
  quickSuggestions: { other: true, comments: false, strings: true }
}))

const TABLES = collectTableNames()

/** 找到 SQL 中最近一次 FROM / JOIN 后面的表名 */
function tableBefore(text: string): string | null {
  const matches = [...text.matchAll(/\b(?:from|join)\s+([`"']?)(\w+)\1/gi)]
  const last = matches[matches.length - 1]
  return last ? last[2] : null
}

/** 取表字段:context 存在时优先用 context,否则回落到 database.ts */
function tableFields(name: string) {
  if (props.context) {
    const tbl = props.context.tables.find(t => t.name === name)
    if (tbl) return tbl.fields.map(f => ({ name: f.name, type: f.type, comment: f.description }))
  }
  return getTableColumns(name)
}

let registered = false

onMounted(async () => {
  const monaco = await loader.init()

  const editor = editorRef.value?.getEditor()
  editor?.addCommand(
    // KeyMod.CtrlCmd | KeyCode.Enter 的数值等价写法,避免额外引入常量
    2048 | 3,
    () => emit('run')
  )
  editor?.onDidChangeCursorSelection((e: any) => {
    const sel = e.selection
    const text = sel && !sel.isEmpty() ? editor.getModel()?.getValueInRange(sel) ?? '' : ''
    emit('selectionChange', text)
  })

  if (registered) return
  registered = true

  monaco.languages.registerCompletionItemProvider('sql', {
    triggerCharacters: [' ', '.', '`'],
    provideCompletionItems: (model: any, position: any) => {
      const textUntilPosition = model.getValueInRange({
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column
      })
      const range = {
        startLineNumber: position.lineNumber,
        startColumn: Math.max(1, position.column - (model.getWordAtPosition(position)?.startColumn ?? position.column - 1)),
        endLineNumber: position.lineNumber,
        endColumn: position.column
      }

      let suggestions: any[] = []
      const aliasMatch = textUntilPosition.match(/(\w+)\.\s*$/)
      if (aliasMatch && TABLES.includes(aliasMatch[1])) {
        suggestions = tableFields(aliasMatch[1]).map(c => ({
          label: c.name,
          kind: 5,
          detail: `字段 · ${c.type}`,
          documentation: c.comment,
          insertText: c.name,
          range
        }))
      } else if (/\b(from|join)\s+\w*$/i.test(textUntilPosition)) {
        suggestions = TABLES.map(t => ({
          label: t,
          kind: 6,
          detail: `表 · ${tableFields(t).length} 个字段`,
          documentation: tableFields(t).map(c => `${c.name} ${c.comment}`).join('\n'),
          insertText: t,
          range
        }))
      } else {
        const tbl = tableBefore(textUntilPosition)
        const cols = tbl
          ? tableFields(tbl).map(c => ({
              label: c.name,
              kind: 5,
              detail: `字段 · ${c.type}`,
              documentation: c.comment,
              insertText: c.name,
              range
            }))
          : []
        const keywords = ['SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'LIMIT', 'AND', 'OR', 'AS', 'JOIN', 'ON', 'SUM', 'COUNT', 'ROUND', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'DESC', 'ASC'].map(k => ({
          label: k,
          kind: 1,
          detail: '关键字',
          insertText: k,
          range
        }))
        suggestions = [...cols, ...keywords]
      }
      return { suggestions }
    }
  })
})

/* ── 同步审计:editor 内容变化即重算 audit ── */
function runAudit(sql: string) {
  if (!props.context) return emit('audit', [])
  emit('audit', auditSqlSync(sql, props.context))
}

watch(
  () => props.modelValue,
  v => runAudit(v ?? '')
)
watch(
  () => props.context,
  () => runAudit(props.modelValue ?? '')
)

defineExpose({
  focus: () => editorRef.value?.focus(),
  getValue: () => editorRef.value?.getValue() ?? props.modelValue,
  /** F05 分段执行:取当前选中文本,无选中返回空串 */
  getSelectedText: (): string => {
    const editor = editorRef.value?.getEditor()
    if (!editor) return ''
    const sel = editor.getSelection()
    return sel && !sel.isEmpty() ? editor.getModel()?.getValueInRange(sel) ?? '' : ''
  },
  insertText: (text: string) => editorRef.value?.insertText(text),
  /** 主动触发一次合规审计,返回当前 SQL 的 Issue 数组 */
  getIssueAudit: (): CopilotIssue[] => {
    if (!props.context) return []
    return auditSqlSync(editorRef.value?.getValue() ?? props.modelValue, props.context)
  }
})
</script>

<style lang="scss" scoped>
.uq-sql-editor {
  border: 1px solid var(--color-border-2);
  border-radius: 4px;
  overflow: hidden;
}
</style>
