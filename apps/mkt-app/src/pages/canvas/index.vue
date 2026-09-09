<template>
  <a-layout>
    <a-layout-content class="content">
      <a-card title="营销画布（独立应用）" class="card-container">
        <!-- 顶部操作栏：mkt-app 作为宿主负责"选/新建任务"，把 id 拼到 URL 后让 iframe 进入画布 -->
        <div class="canvas-toolbar">
          <a-space>
            <a-button type="primary" @click="onCreateTask">
              <template #icon><icon-plus /></template>
              新建任务
            </a-button>
            <a-button @click="onOpenTaskList">
              <template #icon><icon-list /></template>
              选择已有任务
            </a-button>
            <a-tag v-if="currentTaskId" color="arcoblue">当前任务 ID：{{ currentTaskId }}</a-tag>
            <a-tag v-else color="gray">未进入画布（请新建或选择任务）</a-tag>
          </a-space>
        </div>

        <div class="iframe-wrap">
          <iframe
            v-if="iframeSrc"
            :src="iframeSrc"
            frameborder="0"
            class="iframe"
            @load="onIframeLoaded"
          />
          <a-empty v-else description="点击「新建任务」或「选择已有任务」进入画布" />
        </div>
      </a-card>
    </a-layout-content>
  </a-layout>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { Message } from '@arco-design/web-vue'

// horizontal-canvas 独立子应用的端口（与 apps/horizontal-canvas/vite.config.ts 一致）
const HORIZONTAL_CANVAS_PORT = 5175
// horizontal-canvas 内部路径前缀
const HORIZONTAL_CANVAS_BASE = '/marketing/tasks/horizontal'

const iframeSrc = ref('')
const currentTaskId = ref('')
let iframeEl = null

function buildCanvasUrl(taskId) {
  const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
  const qs = new URLSearchParams({ mode: 'edit', id: String(taskId), version: '1' })
  return `http://${host}:${HORIZONTAL_CANVAS_PORT}${HORIZONTAL_CANVAS_BASE}?${qs.toString()}`
}

// 生成 mkt-app 侧的本地任务 ID（与 horizontal-canvas TaskStorage.createTask 保持一致：String(Date.now())）
function genTaskId() {
  return String(Date.now())
}

function onCreateTask() {
  const id = genTaskId()
  currentTaskId.value = id
  iframeSrc.value = buildCanvasUrl(id)
  Message.success(`已新建任务 ${id}，正在进入画布...`)
}

function onOpenTaskList() {
  // 跳到 horizontal-canvas 的任务列表，由用户在独立应用内选择/新建
  const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
  iframeSrc.value = `http://${host}:${HORIZONTAL_CANVAS_PORT}/marketing/tasks`
  currentTaskId.value = ''
  Message.info('已切换到任务列表，请选择或新建任务')
}

function onIframeLoaded() {
  // iframe 加载完成后再不做任何操作（避免跨域 postMessage 干扰独立模式）
  // 这里只用于将来扩展，比如同步主题色 / 鉴权信息
}

// 监听来自 iframe 的 postMessage（horizontal-canvas 的 save / ready / 列表请求）
function handlePostMessage(event) {
  if (!event || !event.data || typeof event.data !== 'object') return
  const { type, taskId } = event.data
  if (type === 'ready') {
    // horizontal-canvas 子应用已加载完毕，可发送初始化数据
    try {
      iframeEl?.contentWindow?.postMessage(
        { type: 'init', source: 'mkt-app', taskId: currentTaskId.value || null },
        '*'
      )
    } catch (e) {
      console.warn('[mkt-canvas] postMessage init 失败:', e)
    }
  } else if (type === 'save' && taskId) {
    // 画布内保存成功，同步本地的 currentTaskId
    currentTaskId.value = String(taskId)
    Message.success('画布已保存')
  }
}

onMounted(() => {
  iframeEl = document.querySelector('.iframe')
  window.addEventListener('message', handlePostMessage)
})
onBeforeUnmount(() => {
  window.removeEventListener('message', handlePostMessage)
})
</script>

<style scoped>
.content { padding: 24px; background: var(--color-bg-2) }
.card-container { border-radius: 8px }
.canvas-toolbar { margin-bottom: 12px; }
.iframe-wrap { height: calc(100vh - 240px); }
.iframe { width: 100%; height: 100%; border: 1px solid var(--color-border-2); border-radius: 8px; background: #fff }
</style>
