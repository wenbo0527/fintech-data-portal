<!--
  任务管理 · 新建任务类型选择器
  - 「任务类型可选清单」唯一来源是 task-kinds 注册表：注册表加一种可新建类型，这里自动出现一张卡
  - 本组件只决定「去哪里建」：每种任务类型的表单由各自域的创建页独立封装（评估 = /tasks/evaluation/create，效果 = /tasks/effect/create）
  - 不可新建的类型（准入 / 复评 / 对比）由别的流程产生，故不出现在这里
-->
<template>
  <a-modal
    :visible="visible"
    title="新建任务"
    :width="760"
    :footer="false"
    unmount-on-close
    @cancel="close"
  >
    <a-alert type="info" class="picker-alert">
      先选任务类型：不同任务类型的口径、字段与执行方式各自独立，评估域按 Python 脚本口径跑，效果域按任务级阈值出名单。
    </a-alert>

    <div v-for="group in groups" :key="group.domain" class="kind-group">
      <div class="kind-group-title">{{ group.domainLabel }}</div>
      <div class="kind-grid">
        <div
          v-for="kind in group.kinds"
          :key="kind.kind"
          class="kind-card"
          role="button"
          tabindex="0"
          @click="choose(kind)"
          @keydown.enter="choose(kind)"
        >
          <div class="kind-card-head">
            <span class="kind-icon" :style="{ background: kind.accent }">{{ kind.iconText }}</span>
            <span class="kind-name">{{ kind.label }}</span>
          </div>
          <div class="kind-desc">{{ kind.desc }}</div>
          <div class="kind-foot">
            <a-tag size="small" :color="kind.tagColor">{{ kind.domainLabel }}</a-tag>
            <a-tag v-if="kind.actions.caliber" size="small" color="orange">可配任务级阈值</a-tag>
          </div>
        </div>
      </div>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { creatableKinds, TASK_DOMAIN_LABELS, type TaskDomain, type TaskKindDescriptor } from '@/modules/variable-hub/mock/task-center/task-kinds'

defineProps<{ visible: boolean }>()
const emit = defineEmits<{ (e: 'update:visible', value: boolean): void }>()

const router = useRouter()

/** 按业务域分组渲染：新域接入时只往注册表加项 */
const groups = computed(() => {
  const list = creatableKinds()
  return (Object.keys(TASK_DOMAIN_LABELS) as TaskDomain[])
    .map((domain) => ({
      domain,
      domainLabel: TASK_DOMAIN_LABELS[domain],
      kinds: list.filter((k) => k.domain === domain)
    }))
    .filter((g) => g.kinds.length > 0)
})

const close = () => {
  emit('update:visible', false)
}

/**
 * 选定类型后交给该类型自己的创建入口
 * @param kind 注册项，createPath 已带 type 查询参数
 */
const choose = (kind: TaskKindDescriptor) => {
  if (!kind.createPath) {
    return
  }
  close()
  router.push(kind.createPath)
}
</script>

<style scoped>
.picker-alert {
  margin-bottom: 16px;
}

.kind-group + .kind-group {
  margin-top: 16px;
}

.kind-group-title {
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-2);
}

.kind-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.kind-card {
  padding: 12px 14px;
  border: 1px solid var(--color-border-2);
  border-radius: 8px;
  background: var(--color-fill-1);
  cursor: pointer;
  transition: all 0.15s ease;
}

.kind-card:hover {
  border-color: rgb(var(--primary-6));
  background: #fff;
  box-shadow: 0 4px 12px rgba(15, 35, 95, 0.08);
}

.kind-card-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.kind-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  color: #fff;
  font-size: 12px;
}

.kind-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-1);
}

.kind-desc {
  font-size: 12px;
  line-height: 1.5;
  color: var(--color-text-3);
  min-height: 36px;
}

.kind-foot {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
}
</style>
