<template>
  <a-trigger v-model:popup-visible="popupVisible" trigger="click" position="br" :popup-style="{ padding: '12px' }">
    <a-button class="time-filter__trigger" size="small">
      <template #icon><IconCalendar /></template>
      <span class="time-filter__text">{{ range.label }}</span>
      <IconDown class="time-filter__caret" />
    </a-button>
    <template #content>
      <div class="time-filter">
        <div class="time-filter__presets">
          <button
            v-for="p in presets"
            :key="p.key"
            type="button"
            class="preset-item"
            :class="{ 'is-active': preset === p.key }"
            @click="selectPreset(p.key)"
          >
            {{ p.label }}
          </button>
          <button
            type="button"
            class="preset-item"
            :class="{ 'is-active': preset === 'custom' }"
            @click="selectPreset('custom')"
          >
            自定义
          </button>
        </div>

        <div class="time-filter__custom">
          <div class="custom-title">自定义</div>
          <div class="custom-row">
            <a-date-picker
              v-model="localFrom"
              value-format="YYYY-MM-DD"
              size="small"
              style="width: 132px"
              placeholder="开始日期"
              :allow-clear="false"
            />
            <span class="custom-tilde">至</span>
            <a-date-picker
              v-model="localTo"
              value-format="YYYY-MM-DD"
              size="small"
              style="width: 132px"
              placeholder="结束日期"
              :allow-clear="false"
            />
            <a-button size="small" type="primary" @click="applyCustom">应用</a-button>
          </div>
          <div v-if="errorText" class="custom-error">{{ errorText }}</div>
        </div>

        <div v-if="range.clipHint" class="time-filter__clip">{{ range.clipHint }}</div>
      </div>
    </template>
  </a-trigger>
</template>

<script setup>
/*
用途：通用时间筛选器（模块 D）
说明：提供「今日 / 近 7 / 30 / 90 天」预设与自定义闭区间，向上抛出统一区间对象，驱动 KPI、趋势、节点抽屉全局联动。
边界：仅负责区间推导与校验，不查询数据；区间裁剪（超出画布运行周期）由 resolveStatsRange 统一处理。
*/
import { ref, computed, watch } from 'vue'
import { STATS_PRESETS, resolveStatsRange } from '@/utils/statsRange.js'

const props = defineProps({
  /** 当前预设：today / 7d / 30d / 90d / custom */
  preset: { type: String, default: '7d' },
  /** 自定义区间起止（YYYY-MM-DD） */
  from: { type: String, default: '' },
  /** 自定义区间结束（YYYY-MM-DD） */
  to: { type: String, default: '' },
  /** 画布运行周期起（YYYY-MM-DD），用于 R44 自动裁剪 */
  runFrom: { type: String, default: '' },
  /** 画布运行周期止（YYYY-MM-DD），用于 R44 自动裁剪 */
  runTo: { type: String, default: '' }
})
const emit = defineEmits(['change'])

const presets = STATS_PRESETS
const popupVisible = ref(false)
const localFrom = ref('')
const localTo = ref('')
const errorText = ref('')

watch(() => [props.preset, props.from, props.to], () => {
  localFrom.value = props.from || ''
  localTo.value = props.to || ''
}, { immediate: true })

/** 当前生效区间（与父级保持同源） */
const range = computed(() => resolveStatsRange({
  preset: props.preset,
  from: props.from,
  to: props.to,
  runFrom: props.runFrom,
  runTo: props.runTo
}))

/**
 * 选择预设并立即生效
 * 入参：key(string)
 * 返回：void
 */
function selectPreset(key) {
  errorText.value = ''
  if (key === 'custom') {
    // 自定义需先填起止日期，保留当前自定义值以便编辑
    emit('change', { preset: 'custom', from: localFrom.value || props.from, to: localTo.value || props.to })
    return
  }
  popupVisible.value = false
  emit('change', { preset: key, from: '', to: '' })
}

/**
 * 应用自定义区间
 * 返回：void
 * 边界：起止倒置时即时提示且不发起变更（E23）
 */
function applyCustom() {
  const from = localFrom.value || ''
  const to = localTo.value || ''
  if (!from || !to) {
    errorText.value = '请选择开始日期与结束日期'
    return
  }
  if (from > to) {
    errorText.value = '开始日期不能晚于结束日期'
    return
  }
  errorText.value = ''
  popupVisible.value = false
  emit('change', { preset: 'custom', from, to })
}
</script>

<style scoped>
.time-filter { width: 320px; display: flex; flex-direction: column; gap: 12px }
.time-filter__text { margin-right: 4px }
.time-filter__caret { margin-left: 4px; font-size: 12px; opacity: .6 }
.time-filter__presets { display: flex; flex-wrap: wrap; gap: 8px }
.preset-item {
  padding: 5px 12px;
  font-size: 12px;
  border: 1px solid #e5e6eb;
  border-radius: 4px;
  background: #fff;
  color: #1d2129;
  cursor: pointer;
}
.preset-item:hover { border-color: rgb(var(--primary-6)) }
.preset-item.is-active { border-color: rgb(var(--primary-6)); color: rgb(var(--primary-6)); background: rgb(var(--primary-1)) }
.time-filter__custom { border-top: 1px solid #f2f3f5; padding-top: 10px }
.custom-title { font-size: 12px; color: #86909c; margin-bottom: 8px }
.custom-row { display: flex; align-items: center; gap: 8px }
.custom-tilde { color: #86909c; font-size: 12px }
.custom-error { margin-top: 8px; font-size: 12px; color: rgb(var(--danger-6)) }
.time-filter__clip { font-size: 12px; color: #86909c; border-top: 1px solid #f2f3f5; padding-top: 8px }
</style>
