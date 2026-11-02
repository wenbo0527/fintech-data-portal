<!--
  Python 脚本版本历史抽屉
  - 时间线展示所有版本
  - 支持预览任意版本内容
  - 支持回滚（基于历史版本创建新版本）
  - 支持任选两个版本进行 diff 对比
-->
<template>
  <a-drawer
    :visible="visible"
    title="脚本版本历史"
    :width="900"
    :footer="false"
    unmount-on-close
    @cancel="handleClose"
  >
    <template v-if="script">
      <!-- 脚本头部信息 -->
      <div class="script-head">
        <div class="script-head-title">
          <span class="name">{{ script.name }}</span>
          <a-tag color="arcoblue" size="small">当前 v{{ script.currentVersion }}</a-tag>
        </div>
        <div class="script-head-path">
          <icon-file /> <code>{{ script.path }}</code>
        </div>
      </div>

      <!-- 对比模式提示 -->
      <a-alert v-if="comparing" type="info" class="compare-tip">
        <template #icon><icon-drag-arrow /></template>
        正在对比 <strong>v{{ compareFrom }}</strong> → <strong>v{{ compareTo }}</strong>
        <a-button type="text" size="mini" @click="exitCompare">退出对比</a-button>
      </a-alert>

      <!-- 对比视图 -->
      <div v-if="comparing" class="diff-view">
        <div class="diff-legend">
          <a-space>
            <a-tag color="red" size="small">删除 {{ diffStat.del }}</a-tag>
            <a-tag color="green" size="small">新增 {{ diffStat.add }}</a-tag>
            <a-tag color="gray" size="small">相同 {{ diffStat.same }}</a-tag>
          </a-space>
        </div>
        <div class="diff-code">
          <div
            v-for="(line, idx) in diffLines"
            :key="idx"
            class="diff-line"
            :class="`diff-line--${line.type}`"
          >
            <span class="diff-no">{{ line.oldNo ?? '' }}</span>
            <span class="diff-no">{{ line.newNo ?? '' }}</span>
            <span class="diff-mark">{{ line.type === 'add' ? '+' : line.type === 'del' ? '-' : ' ' }}</span>
            <span class="diff-text">{{ line.text || ' ' }}</span>
          </div>
        </div>
      </div>

      <!-- 版本时间线 -->
      <template v-else>
        <a-timeline mode="left" class="version-timeline">
          <a-timeline-item
            v-for="ver in versions"
            :key="ver.version"
            :dot-color="ver.version === script.currentVersion ? 'rgb(var(--primary-6))' : 'var(--color-fill-3)'"
          >
            <template #dot>
              <icon-check-circle v-if="ver.version === script.currentVersion" style="color: rgb(var(--primary-6))" />
            </template>
            <div class="version-item">
              <div class="version-item-head">
                <span class="version-no">v{{ ver.version }}</span>
                <a-tag v-if="ver.version === script.currentVersion" color="arcoblue" size="small">当前生效</a-tag>
                <span class="version-changelog">{{ ver.changeLog }}</span>
              </div>
              <div class="version-item-meta">
                <icon-user /> {{ ver.createdBy }}
                <icon-clock-circle /> {{ ver.createdAt }}
                <span v-if="ver.dependencies?.length" class="ver-deps">
                  <icon-link /> {{ ver.dependencies.join(', ') }}
                </span>
              </div>
              <div class="version-item-actions">
                <a-space>
                  <a-button type="text" size="mini" @click="previewVersion(ver)">预览</a-button>
                  <a-button
                    v-if="ver.version !== script.currentVersion"
                    type="text"
                    size="mini"
                    @click="handleRollback(ver.version)"
                  >
                    <template #icon><icon-undo /></template>
                    回滚到此版本
                  </a-button>
                  <a-button
                    type="text"
                    size="mini"
                    :disabled="comparing || ver.version === script.currentVersion"
                    @click="startCompare(ver.version)"
                  >
                    <template #icon><icon-swap /></template>
                    与当前对比
                  </a-button>
                </a-space>
              </div>
            </div>
          </a-timeline-item>
        </a-timeline>
      </template>

      <!-- 预览弹窗 -->
      <a-modal
        v-model:visible="previewVisible"
        :title="`v${previewVersionData?.version} 内容预览`"
        :width="760"
        :footer="false"
        unmount-on-close
      >
        <pre class="preview-code"><code>{{ previewVersionData?.content }}</code></pre>
      </a-modal>
    </template>
  </a-drawer>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Message, Modal } from '@arco-design/web-vue'
import {
  EvaluationTaskStore,
  type PythonScriptConfig,
  type PythonScriptVersion,
  type ScriptDiffLine
} from '@/modules/variable-hub/mock/evaluation/evaluation-task-store'

const props = defineProps<{ scriptId: string }>()
const emit = defineEmits<{ (e: 'updated'): void }>()

const visible = ref(false)
const previewVisible = ref(false)
const previewVersionData = ref<PythonScriptVersion | null>(null)

const comparing = ref(false)
const compareFrom = ref<number>()
const compareTo = ref<number>()
const diffLines = ref<ScriptDiffLine[]>([])

const script = computed<PythonScriptConfig | undefined>(() =>
  EvaluationTaskStore.getPythonScriptById(props.scriptId)
)
const versions = computed(() => script.value?.versions || [])

const diffStat = computed(() =>
  diffLines.value.reduce(
    (acc, l) => {
      if (l.type === 'add') {
        acc.add += 1
      } else if (l.type === 'del') {
        acc.del += 1
      } else {
        acc.same += 1
      }
      return acc
    },
    { add: 0, del: 0, same: 0 }
  )
)

function open() {
  visible.value = true
  exitCompare()
}

function handleClose() {
  visible.value = false
  exitCompare()
}

function previewVersion(ver: PythonScriptVersion) {
  previewVersionData.value = ver
  previewVisible.value = true
}

function startCompare(fromVersion: number) {
  if (!script.value) {
    return
  }
  compareFrom.value = script.value.currentVersion
  compareTo.value = fromVersion
  diffLines.value = EvaluationTaskStore.diffScriptVersions(props.scriptId, fromVersion, script.value.currentVersion)
  comparing.value = true
}

function exitCompare() {
  comparing.value = false
  compareFrom.value = undefined
  compareTo.value = undefined
  diffLines.value = []
}

function handleRollback(version: number) {
  Modal.confirm({
    title: `回滚到 v${version}？`,
    content: '将基于该历史版本内容创建一个新版本，作为当前生效版本。原有版本仍保留在历史中。',
    okText: '确认回滚',
    cancelText: '取消',
    onOk: () => {
      const updated = EvaluationTaskStore.rollbackScriptVersion(props.scriptId, version)
      if (updated) {
        Message.success(`已回滚，生成新版本 v${updated.currentVersion}`)
        emit('updated')
      } else {
        Message.error('回滚失败')
      }
    }
  })
}

defineExpose({ open, close: handleClose })
</script>

<style scoped lang="less">
.script-head {
  padding: 12px 16px;
  background: var(--color-fill-1);
  border-radius: 8px;
  margin-bottom: 16px;
}

.script-head-title {
  display: flex;
  align-items: center;
  gap: 8px;

  .name {
    font-size: 16px;
    font-weight: 600;
    color: var(--color-text-1);
  }
}

.script-head-path {
  margin-top: 6px;
  color: var(--color-text-3);
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 6px;

  code {
    font-family: monospace;
  }
}

.compare-tip {
  margin-bottom: 12px;
}

.version-timeline {
  padding-left: 8px;
}

.version-item {
  padding: 12px;
  border: 1px solid var(--color-border-2);
  border-radius: 8px;
  background: var(--color-bg-2);
}

.version-item-head {
  display: flex;
  align-items: center;
  gap: 8px;

  .version-no {
    font-weight: 600;
    color: var(--color-text-1);
  }

  .version-changelog {
    color: var(--color-text-2);
    font-size: 13px;
  }
}

.version-item-meta {
  margin-top: 6px;
  color: var(--color-text-3);
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.ver-deps {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.version-item-actions {
  margin-top: 8px;
}

.diff-view {
  border: 1px solid var(--color-border-2);
  border-radius: 8px;
  overflow: hidden;
}

.diff-legend {
  padding: 8px 12px;
  background: var(--color-fill-1);
  border-bottom: 1px solid var(--color-border-2);
}

.diff-code {
  max-height: 560px;
  overflow: auto;
  background: #1e1e1e;
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  font-size: 12px;
  line-height: 1.5;
}

.diff-line {
  display: flex;
  white-space: pre;
  color: #d4d4d4;

  &--add {
    background: rgba(0, 180, 42, 0.18);
  }

  &--del {
    background: rgba(245, 63, 63, 0.18);
  }
}

.diff-no {
  width: 36px;
  flex-shrink: 0;
  text-align: right;
  padding-right: 8px;
  color: #6a737d;
  user-select: none;
}

.diff-mark {
  width: 18px;
  flex-shrink: 0;
  text-align: center;
  color: #8b949e;
}

.diff-text {
  flex: 1;
  padding-left: 6px;
}

.preview-code {
  margin: 0;
  max-height: 480px;
  overflow: auto;
  padding: 16px;
  background: #282c34;
  color: #abb2bf;
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre;
  border-radius: 6px;
}
</style>
