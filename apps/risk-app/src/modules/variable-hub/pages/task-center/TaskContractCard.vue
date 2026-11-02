<!--
  任务管理 · 输入输出契约展示（评估抽屉与效果详情页共用）
  - 契约的"事实"只来自 io-contract，校验结果只来自聚合层算好的 TaskContractView，本组件不重算任何数字
  - 详情里要回答三个问题：这个类型必须有什么、当前配置差在哪、上游血缘是谁给的
  - 未登记契约的类型给灰标 + 引导文案，不能渲染成"齐备"误导人
-->
<template>
  <a-card :bordered="false" class="contract-card">
    <template #title>
      <a-space size="mini">
        <span class="contract-title">输入输出契约</span>
        <a-tag size="small" :color="contract.stateColor">{{ contract.stateLabel }}</a-tag>
        <span v-if="contractText" class="contract-ver">{{ contractText }}</span>
      </a-space>
    </template>

    <p class="contract-tip">{{ contract.tip }}</p>

    <!-- 不符项：阻断级红、警告级橙，位置用区域名说清，避免用户去猜改哪儿 -->
    <a-alert v-if="contract.issues.length" :type="hasBlocker ? 'error' : 'warning'" :show-icon="false" class="contract-issues">
      <div v-for="(item, idx) in contract.issues" :key="idx" class="issue-line">
        <a-tag size="small" :color="item.level === 'blocker' ? 'red' : 'orange'">
          {{ item.level === 'blocker' ? '阻断' : '警告' }}
        </a-tag>
        <span class="issue-text">{{ item.message }}</span>
        <span v-if="item.anchor" class="issue-anchor">配置位置：{{ ANCHOR_LABELS[item.anchor] }}</span>
      </div>
    </a-alert>
    <a-alert v-else type="success" :show-icon="false" class="contract-issues">
      已按本类型契约逐项核对，必产字段都有落点，产出可安全回写下游。
    </a-alert>

    <!-- 上游血缘：效果任务引用评估产出时才有，这里是两域打通最直观的证据 -->
    <div v-if="contract.upstream" class="contract-lineage">
      <span class="lineage-label">输入来源</span>
      <a-link @click="goUpstream">{{ contract.upstream.taskName }}</a-link>
      <span class="lineage-sep">产出的</span>
      <a-tag size="small" color="arcoblue">{{ contract.upstream.fieldLabel }}</a-tag>
      <span class="lineage-key">{{ contract.upstream.field }}</span>
      <span class="lineage-note">本任务只扫上游覆盖到的变量，口径与上游同源</span>
    </div>

    <template v-if="contract.declared">
      <a-divider class="contract-divider" />
      <a-row :gutter="16">
        <a-col :span="12">
          <div class="contract-block-title">契约要求的输入（{{ inputItems.length }}）</div>
          <a-space v-if="inputItems.length" wrap size="mini">
            <a-tooltip v-for="item in inputItems" :key="item.key" :content="item.tip">
              <a-tag size="small" :color="item.required ? 'arcoblue' : 'gray'">
                {{ item.label }}<template v-if="item.required"> *</template>
              </a-tag>
            </a-tooltip>
          </a-space>
          <span v-else class="muted">该类型没有声明输入契约</span>
        </a-col>
        <a-col :span="12">
          <div class="contract-block-title">契约要求的产出（{{ outputItems.length }}）</div>
          <a-space v-if="outputItems.length" wrap size="mini">
            <a-tooltip v-for="item in outputItems" :key="item.key" :content="item.tip">
              <a-tag size="small" :color="item.required ? 'green' : 'gray'">
                {{ item.label }}<template v-if="item.required"> *</template>
              </a-tag>
            </a-tooltip>
          </a-space>
          <span v-else class="muted">该类型没有声明产出契约</span>
        </a-col>
      </a-row>
      <p class="contract-foot">带 * 为必产 / 必输入项，缺失会在保存时阻断；字段清单由 io-contract 统一维护，两域共用同一套 key。</p>
    </template>
  </a-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  contractOf,
  expandRefs,
  fieldSourceText,
  type ContractIssue
} from '@/modules/variable-hub/mock/task-center/io-contract'
import type { TaskContractView } from '@/modules/variable-hub/mock/task-center/task-record'

/** 校验问题落在页面哪块配置，文案与新建页保持一致 */
const ANCHOR_LABELS: Record<NonNullable<ContractIssue['anchor']>, string> = {
  scripts: '判定口径（Python 脚本）',
  targets: '基础信息与评估对象',
  input: '输入来源',
  output: '产出契约',
  upstream: '输入来源（上游引用）',
  schedule: '调度方式'
}

const props = defineProps<{
  /** 聚合层算好的契约视图，组件只展示 */
  contract: TaskContractView
  /** 统一 kind（evaluation.routine / effect.monthly_report …），契约字段清单按它索引 */
  kind: string
}>()

const router = useRouter()

const contract = computed(() => props.contract)
const hasBlocker = computed(() => props.contract.issues.some((i) => i.level === 'blocker'))

/** 契约版本一句话：v1 · 输入 N / 产出 M，让人知道格式是有版本的 */
const contractText = computed(() => {
  const c = contractOf(props.kind)
  if (!c) {
    return ''
  }
  return `${c.version} · 输入 ${c.input.length} 项 / 产出 ${c.output.length} 项`
})

/** 契约引用 → 展示项：中文名、是否必产、来源与落点都从字段字典取 */
function toItems(scope: 'input' | 'output') {
  const c = contractOf(props.kind)
  if (!c) {
    return []
  }
  return expandRefs(c[scope]).map(({ ref, field }) => ({
    key: ref.key,
    label: field?.label || ref.key,
    required: !!ref.required,
    tip: `${fieldSourceText(ref.key)}${ref.note ? `｜${ref.note}` : ''}${field?.desc ? `｜${field.desc}` : ''}`
  }))
}

const inputItems = computed(() => toItems('input'))
const outputItems = computed(() => toItems('output'))

/** 上游任务回到统一列表并用 taskId 直接打开它的详情抽屉 */
function goUpstream() {
  const up = props.contract.upstream
  if (!up) {
    return
  }
  router.push({ path: '/tasks', query: { tab: 'tasks', taskId: up.taskId } })
}
</script>

<style scoped>
.contract-card {
  margin-bottom: 16px;
  background: var(--color-fill-1);
}
.contract-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-1);
}
.contract-ver {
  font-size: 12px;
  color: var(--color-text-3);
}
.contract-tip {
  margin: 0 0 10px;
  font-size: 12px;
  color: var(--color-text-3);
}
.contract-issues {
  margin-bottom: 12px;
}
.issue-line {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 12px;
  line-height: 1.9;
}
.issue-text {
  color: var(--color-text-1);
}
.issue-anchor {
  color: var(--color-text-3);
}
.contract-lineage {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  margin-bottom: 4px;
  font-size: 12px;
  background: var(--color-bg-2);
  border: 1px dashed var(--color-border-2);
  border-radius: 6px;
}
.lineage-label {
  color: var(--color-text-3);
}
.lineage-sep {
  color: var(--color-text-3);
}
.lineage-key {
  font-family: 'Monaco', 'Menlo', monospace;
  color: var(--color-text-3);
}
.lineage-note {
  margin-left: auto;
  color: var(--color-text-3);
}
.contract-divider {
  margin: 12px 0;
}
.contract-block-title {
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-1);
}
.contract-foot {
  margin: 10px 0 0;
  font-size: 12px;
  color: var(--color-text-3);
}
.muted {
  font-size: 12px;
  color: var(--color-text-3);
}
</style>
