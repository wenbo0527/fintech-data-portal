import { computed, h, ref, watch, type ComputedRef } from 'vue'
import type { TableColumnData } from '@arco-design/web-vue'

/**
 * 表列「动态拖动」共享逻辑（详情页字段表格统一使用）
 *
 * - 列顺序拖动：表头 title 渲染为可拖拽（draggable）节点，drag/drop 交换列顺序
 * - 列宽拖动：配合 a-table 的 :column-resizable="true"（Arco 原生能力）
 * - 单元格内容：列定义使用 slotName，页面模板中用 <template #slot-名="{ record }"> 保持原有写法
 *
 * 用法：
 *   const fieldColumns = useDraggableColumns(() => [
 *     { title: '字段名', dataIndex: 'name', slotName: 'cell-name', width: 220 },
 *     ...
 *   ])
 *   <a-table :columns="fieldColumns" :column-resizable="true" ... />
 *
 * 表头样式（.dca-drag-th）为全局类：因 title 渲染函数在 Arco 内部执行，
 * 页面 scoped 样式无法命中，统一收敛在 styles-dca/tokens.css。
 */
export function useDraggableColumns(getColumns: () => TableColumnData[]): ComputedRef<TableColumnData[]> {
  const order = ref<string[]>([])
  const draggingKey = ref('')
  const overKey = ref('')

  const keyOf = (col: TableColumnData, i: number) =>
    String(col.slotName ?? col.dataIndex ?? col.title ?? i)

  const defs = computed(() => getColumns())

  // 列结构变化时同步顺序池：保留已有相对顺序，新列追加在末尾
  watch(
    () => defs.value.map(keyOf).join('|'),
    () => {
      const keys = defs.value.map(keyOf)
      const kept = order.value.filter((k) => keys.includes(k))
      const added = keys.filter((k) => !kept.includes(k))
      order.value = [...kept, ...added]
    },
    { immediate: true },
  )

  function move(from: string, to: string) {
    if (!from || !to || from === to) return
    const idx = order.value.slice()
    const fi = idx.indexOf(from)
    if (fi === -1) return
    idx.splice(fi, 1)
    const ti = idx.indexOf(to)
    if (ti === -1) return
    idx.splice(ti, 0, from)
    order.value = idx
  }

  function renderTitle(text: string, key: string) {
    return () =>
      h(
        'span',
        {
          class: ['dca-drag-th', { 'is-dragging': draggingKey.value === key, 'is-over': overKey.value === key }],
          draggable: true,
          title: '按住拖动调整列顺序',
          onDragstart: (e: DragEvent) => {
            draggingKey.value = key
            if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
          },
          onDragover: (e: DragEvent) => {
            if (!draggingKey.value || draggingKey.value === key) return
            e.preventDefault()
            overKey.value = key
          },
          onDrop: (e: DragEvent) => {
            e.preventDefault()
            move(draggingKey.value, key)
            overKey.value = ''
          },
          onDragend: () => {
            draggingKey.value = ''
            overKey.value = ''
          },
        },
        [h('span', { class: 'dca-drag-th-handle' }), h('span', text)],
      )
  }

  return computed<TableColumnData[]>(() => {
    const map = new Map(defs.value.map((c, i) => [keyOf(c, i), c]))
    const wrap = (k: string, c: TableColumnData): TableColumnData =>
      typeof c.title === 'string' ? { ...c, title: renderTitle(c.title, k) } : c
    const result: TableColumnData[] = []
    for (const k of order.value) {
      const c = map.get(k)
      if (!c) continue
      map.delete(k)
      result.push(wrap(k, c))
    }
    // 兜底：未进入顺序池的列按原样追加
    for (const [k, c] of map) result.push(wrap(k, c))
    return result
  })
}
