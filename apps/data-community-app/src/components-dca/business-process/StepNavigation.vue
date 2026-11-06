<template>
  <div class="step-navigation">
    <div class="navigation-header">
      <h4 class="nav-title">编辑步骤</h4>
    </div>
    
    <div class="step-list">
      <div
        v-for="(step, index) in steps"
        :key="step.key"
        class="step-item"
        :class="{
          'active': index === currentStep,
          'completed': completedSteps.includes(index),
          'clickable': index <= currentStep || completedSteps.includes(index)
        }"
        @click="handleStepClick(index)"
      >
        <div class="step-indicator">
          <div class="step-number">
            <IconCheck v-if="completedSteps.includes(index)" class="check-icon" />
            <span v-else>{{ index + 1 }}</span>
          </div>
          <div v-if="index < steps.length - 1" class="step-line"></div>
        </div>
        
        <div class="step-content">
          <div class="step-title">{{ step.title }}</div>
          <div class="step-description">{{ step.description }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { IconCheck } from '@arco-design/web-vue/es/icon'

interface Step {
  key: string
  title: string
  description: string
}

interface Props {
  currentStep: number
  steps: Step[]
  completedSteps: number[]
}

interface Emits {
  (e: 'step-change', stepIndex: number): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const handleStepClick = (stepIndex: number) => {
  emit('step-change', stepIndex)
}
</script>

<style scoped>
.step-navigation {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.navigation-header {
  padding: 20px 16px 16px;
  border-bottom: 1px solid var(--color-border-3);
}

.nav-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-1);
}

.step-list {
  flex: 1;
  padding: 16px 0;
  overflow-y: auto;
}

.step-item {
  position: relative;
  display: flex;
  padding: 12px 16px;
  cursor: default;
  transition: all 0.2s ease;
}

.step-item.clickable {
  cursor: pointer;
}

.step-item.clickable:hover {
  background: var(--color-fill-2);
}

.step-item.active {
  background: var(--color-primary-light-1);
  border-right: 3px solid var(--color-primary-6);
}

.step-item.active .step-title {
  color: var(--color-primary-6);
  font-weight: 600;
}

.step-indicator {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-right: 12px;
  flex-shrink: 0;
}

.step-number {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  background: var(--color-fill-3);
  color: var(--color-text-3);
  transition: all 0.2s ease;
}

.step-item.active .step-number {
  background: var(--color-primary-6);
  color: white;
}

.step-item.completed .step-number {
  background: var(--color-success-6);
  color: white;
}

.check-icon {
  font-size: 12px;
}

.step-line {
  width: 1px;
  height: 32px;
  background: var(--color-border-3);
  margin-top: 4px;
}

.step-item.completed .step-line {
  background: var(--color-success-6);
}

.step-content {
  flex: 1;
  min-width: 0;
}

.step-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-1);
  margin-bottom: 4px;
  line-height: 1.4;
}

.step-description {
  font-size: 12px;
  color: var(--color-text-3);
  line-height: 1.3;
  word-break: break-word;
}

.step-item.active .step-description {
  color: var(--color-text-2);
}
</style>