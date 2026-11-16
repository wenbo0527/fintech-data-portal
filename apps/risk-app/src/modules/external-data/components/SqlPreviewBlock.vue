<template>
  <div class="sql-preview">
    <div class="sql-preview-head">
      <span class="sql-preview-title">{{ title }}</span>
      <a-space :size="2">
        <a-button size="mini" type="text" @click="copy">
          <template #icon><IconCopy /></template>
          复制
        </a-button>
        <a-button size="mini" type="text" @click="collapsed = !collapsed">
          <template #icon>
            <IconUp v-if="!collapsed" />
            <IconDown v-else />
          </template>
          {{ collapsed ? '展开' : '折叠' }}
        </a-button>
      </a-space>
    </div>
    <pre v-show="!collapsed" class="sql-preview-code" :style="{ maxHeight }">{{ code }}</pre>
    <!-- 折叠态压成一行摘要，避免整块留白看不出这里有什么内容 -->
    <div v-show="collapsed" class="sql-preview-brief" :title="code">{{ brief }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Message } from '@arco-design/web-vue'
import { IconCopy, IconDown, IconUp } from '@arco-design/web-vue/es/icon'

/**
 * SQL 预览块：长 SQL 直接铺开会把页面撑得过高，统一提供折叠与复制。
 * 折叠只影响展示，复制始终取完整 SQL，便于贴到数据平台手工执行。
 */
const props = withDefaults(defineProps<{
  /** 完整 SQL 文本 */
  code: string
  title?: string
  /** 复制提示的主体名，如「一致性校验 SQL」 */
  label?: string
  defaultCollapsed?: boolean
  /** 展开态最大高度，超出内部滚动；默认不限制 */
  maxHeight?: string
}>(), {
  title: 'SQL 预览',
  label: 'SQL',
  defaultCollapsed: false,
  maxHeight: 'none',
})

const collapsed = ref(props.defaultCollapsed)

const lines = computed(() => (props.code || '').split('\n'))
const lineCount = computed(() => lines.value.filter((l) => l.trim()).length)

/** 摘要取首个非空行，超长截断 */
const brief = computed(() => {
  const first = (lines.value.find((l) => l.trim()) || '（无 SQL）').trim()
  return `${lineCount.value} 行 · ${first.length > 110 ? `${first.slice(0, 110)}…` : first}`
})

const copy = async () => {
  if (!props.code) {
    Message.info(`「${props.label}」为空，暂无可复制内容`)
    return
  }
  try {
    await navigator.clipboard.writeText(props.code)
    Message.success(`已复制「${props.label}」（${lineCount.value} 行）`)
  } catch {
    Message.warning(`「${props.label}」复制失败，请手动选中复制`)
  }
}
</script>

<style scoped>
.sql-preview {
  margin-top: 8px;
}

.sql-preview-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.sql-preview-title {
  font-size: 12px;
  color: var(--color-text-3);
}

.sql-preview-code,
.sql-preview-brief {
  font-family: 'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
  font-size: 12px;
  border-radius: 4px;
  background: var(--color-fill-2);
  line-height: 1.6;
}

.sql-preview-code {
  margin: 4px 0 0;
  padding: 8px 10px;
  white-space: pre-wrap;
  word-break: break-all;
  overflow-y: auto;
}

.sql-preview-brief {
  margin-top: 4px;
  padding: 6px 10px;
  color: var(--color-text-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
