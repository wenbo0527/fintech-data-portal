<template>
  <div v-if="content" class="md-body" v-html="rendered" />
  <span v-else class="md-empty">{{ emptyText }}</span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { marked } from 'marked'

/**
 * Markdown 公共展示组件（Agent 说明文档统一渲染样式）
 * 纯前端 mock 项目：内容为本地维护者手写，无 XSS 来源
 */
const props = withDefaults(defineProps<{
  content?: string
  emptyText?: string
}>(), {
  content: '',
  emptyText: '—',
})

marked.setOptions({ breaks: true, gfm: true })

const rendered = computed(() => marked.parse(props.content || '') as string)
</script>

<style scoped lang="less">
.md-empty {
  color: #c9cdd4;
}
</style>

<style lang="less">
/* 公共 Markdown 渲染样式（供指标/报表详情页统一使用） */
.md-body {
  font-size: 14px;
  line-height: 1.7;
  color: #1d2129;
  word-break: break-word;

  h1, h2, h3, h4 {
    margin: 16px 0 8px;
    font-weight: 600;
    color: #1d2129;
  }
  h1 { font-size: 20px; }
  h2 { font-size: 17px; }
  h3 { font-size: 15px; }
  h4 { font-size: 14px; }

  p { margin: 6px 0; }

  ul, ol { margin: 6px 0; padding-left: 22px; }
  li { margin: 2px 0; }

  code {
    padding: 2px 6px;
    background: #f2f3f5;
    border-radius: 2px;
    font-family: Menlo, Consolas, monospace;
    font-size: 12px;
    color: #c44900;
  }

  pre {
    margin: 8px 0;
    padding: 12px;
    background: #f7f8fa;
    border: 1px solid #e5e6eb;
    border-radius: 4px;
    overflow-x: auto;

    code { padding: 0; background: none; color: #1d2129; }
  }

  blockquote {
    margin: 8px 0;
    padding: 4px 12px;
    border-left: 3px solid #c9cdd4;
    background: #f7f8fa;
    color: #4e5969;
  }

  table {
    margin: 8px 0;
    border-collapse: collapse;

    th, td {
      padding: 4px 12px;
      border: 1px solid #e5e6eb;
    }
    th { background: #f2f3f5; font-weight: 600; }
  }

  a { color: #165dff; text-decoration: none; }

  hr { margin: 12px 0; border: none; border-top: 1px solid #e5e6eb; }

  > :first-child { margin-top: 0; }
  > :last-child { margin-bottom: 0; }
}
</style>
